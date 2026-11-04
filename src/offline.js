// Talks to the API and keeps the app usable offline: the last data from the server is saved on
// the device, and project changes wait in a device queue until the server confirms them.
const DATA_KEY = "wheel.data";
const QUEUE_KEY = "wheel.queue";
const REQUEST_TIMEOUT_MS = 8000;

export class OfflineError extends Error {}
export class LoginError extends Error {}
export class RejectedError extends Error {}

function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full or blocked */ }
}

export async function api(method, path, body) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      redirect: "manual", // an expired Cloudflare Access session answers with a redirect to its login
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new OfflineError("no connection");
  }
  if (res.type === "opaqueredirect" || res.status === 401 || res.status === 403) throw new LoginError("login expired");
  // With the laptop or tunnel down, Cloudflare answers with its own 5xx page, so 5xx counts as offline
  if (res.status >= 500) throw new OfflineError(`server unavailable (${res.status})`);
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({}));
    throw new RejectedError(error || `request failed (${res.status})`);
  }
  return res.status === 204 ? null : res.json();
}

// ── Device queue ────────────────────────────────────────────────────────────
export const queuedCount = () => read(QUEUE_KEY, []).length;

export function enqueue(op) {
  write(QUEUE_KEY, [...read(QUEUE_KEY, []), { ...op, queueId: crypto.randomUUID() }]);
}

function removeFromQueue(queueId) {
  write(QUEUE_KEY, read(QUEUE_KEY, []).filter((op) => op.queueId !== queueId));
}

// Sends changes oldest first. A change leaves the queue only once the server confirms it, or
// rejects it for good (4xx); a connection problem stops the run and keeps the rest for later.
let flushing = Promise.resolve();

function runFlush() {
  flushing = flushing.then(async () => {
    const failed = [];
    for (const op of read(QUEUE_KEY, [])) {
      try {
        await api(op.method, op.path, op.body);
        removeFromQueue(op.queueId);
      } catch (err) {
        if (err instanceof LoginError) return { connection: "login", failed };
        if (err instanceof OfflineError) return { connection: "offline", failed };
        removeFromQueue(op.queueId);
        failed.push({ label: op.label, reason: err.message });
      }
    }
    return { connection: "online", failed };
  });
  return flushing;
}

export const flushQueue = () => runFlush();

// ── Data ────────────────────────────────────────────────────────────────────
function byName(a, b) {
  return a.name.localeCompare(b.name);
}

// The server's last answer with queued changes laid on top, so edits show up straight away.
function withQueuedChanges(data) {
  let projects = data.projects;
  for (const { method, path, body } of read(QUEUE_KEY, [])) {
    const id = path.split("/")[2];
    if (method === "POST") projects = [...projects, { categoryIds: [], ...body, pending: true }];
    if (method === "PATCH") projects = projects.map((p) => (p.id === id ? { ...p, ...body, pending: true } : p));
    if (method === "DELETE") projects = projects.filter((p) => p.id !== id);
  }
  return { ...data, projects: [...projects].sort(byName) };
}

export function localData() {
  const saved = read(DATA_KEY, null);
  return saved ? withQueuedChanges(saved) : null;
}

export async function fetchData(connectionAfterFlush) {
  if (connectionAfterFlush !== "online") return { data: localData(), connection: connectionAfterFlush };
  try {
    write(DATA_KEY, await api("GET", "/data"));
    return { data: localData(), connection: "online" };
  } catch (err) {
    return { data: localData(), connection: err instanceof LoginError ? "login" : "offline" };
  }
}
