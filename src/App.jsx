import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Config ────────────────────────────────────────────────────────────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DIFFICULTIES = ["Easy", "Medium", "Hard", "Expert"];
const DEV_TYPES = ["Manual", "Assisted"];
const STATUSES = ["idea", "doing", "completed"];

const DIFF_COLOR = {
  Easy: "#4ade80",
  Medium: "#f0b429",
  Hard: "#fb923c",
  Expert: "#f87171",
};

const STATUS_COLOR = {
  idea: "#6b7280",
  doing: "#7c5cfc",
  completed: "#4ade80",
};

// ── Supabase helpers ──────────────────────────────────────────────────────────
async function fetchAll() {
  const [{ data: projects }, { data: categories }, { data: pc }] =
    await Promise.all([
      supabase.from("projects").select("*").order("name"),
      supabase.from("categories").select("*").order("name"),
      supabase.from("project_categories").select("*"),
    ]);
  const catMap = {};
  (pc || []).forEach(({ project_id, category_id }) => {
    if (!catMap[project_id]) catMap[project_id] = [];
    catMap[project_id].push(category_id);
  });
  return {
    projects: (projects || []).map((p) => ({
      ...p,
      categoryIds: catMap[p.id] || [],
    })),
    categories: categories || [],
  };
}

// ── Auth Screen ───────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function handleLogin() {
    setLoading(true);
    setErr("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.href },
    });
    if (error) setErr(error.message);
    else setSent(true);
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: "100vh", background: "#0f1117", display: "flex",
      alignItems: "center", justifyContent: "center", fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{
        background: "#161b27", border: "1px solid #1e2535", borderRadius: 16,
        padding: "48px 40px", width: 380, textAlign: "center"
      }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>🎡</div>
        <h1 style={{ color: "#fff", fontSize: 22, fontFamily: "'Space Grotesk', sans-serif", margin: "0 0 6px" }}>
          Project Wheel
        </h1>
        <p style={{ color: "#6b7280", fontSize: 14, margin: "0 0 32px" }}>
          Your project ideas, one spin away.
        </p>
        {sent ? (
          <p style={{ color: "#7c5cfc", fontSize: 15 }}>
            Check your email for the magic link ✨
          </p>
        ) : (
          <>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              style={{
                width: "100%", boxSizing: "border-box", padding: "12px 14px",
                background: "#0f1117", border: "1px solid #1e2535", borderRadius: 8,
                color: "#fff", fontSize: 14, outline: "none", marginBottom: 12
              }}
            />
            {err && <p style={{ color: "#f87171", fontSize: 13, marginBottom: 10 }}>{err}</p>}
            <button
              onClick={handleLogin}
              disabled={loading || !email}
              style={{
                width: "100%", padding: "12px", background: "#7c5cfc", border: "none",
                borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 600,
                cursor: "pointer", opacity: loading || !email ? 0.6 : 1
              }}
            >
              {loading ? "Sending…" : "Send magic link"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Wheel Canvas ──────────────────────────────────────────────────────────────
const PALETTE = [
  "#7c5cfc","#5b4cdc","#6d4fc9","#4a3ab8",
  "#8b6ffd","#9c7fff","#6040e0","#7755ee",
];

function SpinWheel({ projects, onResult }) {
  const canvasRef   = useRef(null);
  const spinRef     = useRef({ angle: 0, spinning: false });
  const rafRef      = useRef(null);
  const projectsRef = useRef(projects);
  // pre-rendered static wheel (slices + labels, no angle)
  const staticRef   = useRef(null);

  // Rebuild the static offscreen canvas whenever the project list changes
  useEffect(() => {
    projectsRef.current = projects;
    const size = canvasRef.current?.width || 560;
    buildStatic(projects, size);
    drawFrame(spinRef.current.angle, size);
  }, [projects]);

  function buildStatic(ps, size) {
    const off = new OffscreenCanvas(size, size);
    const ctx = off.getContext("2d");
    const cx  = size / 2, cy = size / 2, r = cx - 12;

    if (!ps.length) {
      ctx.fillStyle = "#1e2535";
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fill();
      staticRef.current = off;
      return;
    }

    const slice = (Math.PI * 2) / ps.length;
    ps.forEach((p, i) => {
      const start = i * slice, end = start + slice;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, end);
      ctx.closePath();
      ctx.fillStyle = PALETTE[i % PALETTE.length];
      ctx.fill();
      ctx.strokeStyle = "#0f1117";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // label
      const mid    = start + slice / 2;
      const maxLen = Math.max(4, Math.min(20, Math.floor((r * 0.72 * slice) / 7)));
      const label  = p.name.length > maxLen ? p.name.slice(0, maxLen - 1) + "…" : p.name;
      const fs     = ps.length > 40 ? 8 : ps.length > 20 ? 10 : ps.length > 10 ? 12 : 14;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(mid);
      ctx.textAlign    = "right";
      ctx.fillStyle    = "rgba(255,255,255,0.9)";
      ctx.font         = `${fs}px Inter, sans-serif`;
      ctx.fillText(label, r - 14, fs * 0.38);
      ctx.restore();
    });

    staticRef.current = off;
  }

  function drawFrame(angle, size) {
    const canvas = canvasRef.current;
    if (!canvas || !staticRef.current) return;
    const ctx = canvas.getContext("2d");
    const cx  = size / 2, cy = size / 2, r = cx - 12;

    ctx.clearRect(0, 0, size, size);

    // rotate the static wheel to current angle
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.translate(-cx, -cy);
    ctx.drawImage(staticRef.current, 0, 0);
    ctx.restore();

    // empty-state label (drawn after rotation so it stays upright)
    if (!projectsRef.current.length) {
      ctx.fillStyle    = "#6b7280";
      ctx.font         = "15px Inter, sans-serif";
      ctx.textAlign    = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("No projects match filters", cx, cy);
    }

    // center knob
    ctx.beginPath(); ctx.arc(cx, cy, 22, 0, Math.PI*2);
    ctx.fillStyle = "#0f1117"; ctx.fill();
    ctx.strokeStyle = "#7c5cfc"; ctx.lineWidth = 2.5; ctx.stroke();

    // pointer
    ctx.beginPath();
    ctx.moveTo(cx, cy - r - 4);
    ctx.lineTo(cx - 13, cy - r + 20);
    ctx.lineTo(cx + 13, cy - r + 20);
    ctx.closePath();
    ctx.fillStyle = "#f0b429"; ctx.fill();
  }

  // Easing spin: fixed 3–5 s duration, easeOut cubic
  function spin() {
    if (spinRef.current.spinning || !projectsRef.current.length) return;
    const size      = canvasRef.current?.width || 560;
    const duration  = 3000 + Math.random() * 2000;           // 3–5 s
    const extraRots = 5 + Math.floor(Math.random() * 4);     // 5–8 full rotations
    const startAngle = spinRef.current.angle;
    const delta      = extraRots * Math.PI * 2 + Math.random() * Math.PI * 2;
    const startTime  = performance.now();

    spinRef.current.spinning = true;

    function easeOut(t) { return 1 - Math.pow(1 - t, 3); }   // cubic ease-out

    function tick(now) {
      const t       = Math.min((now - startTime) / duration, 1);
      const eased   = easeOut(t);
      spinRef.current.angle = startAngle + delta * eased;
      drawFrame(spinRef.current.angle, size);

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        spinRef.current.spinning = false;
        const ps    = projectsRef.current;
        const slice = (Math.PI * 2) / ps.length;
        // pointer sits at -π/2 in canvas coords; map wheel angle to slice index
        const norm  = (((-(spinRef.current.angle) % (Math.PI*2)) + Math.PI*2) % (Math.PI*2));
        const idx   = Math.floor(norm / slice) % ps.length;
        onResult(ps[idx]);
      }
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  // Resize canvas to fill container, rebuild static on mount
  const wrapRef = useRef(null);
  useEffect(() => {
    function resize() {
      if (!wrapRef.current || !canvasRef.current) return;
      const s = Math.min(wrapRef.current.clientWidth, wrapRef.current.clientHeight, 640);
      canvasRef.current.width  = s;
      canvasRef.current.height = s;
      buildStatic(projectsRef.current, s);
      drawFrame(spinRef.current.angle, s);
    }
    resize();
    const ro = new ResizeObserver(resize);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={wrapRef} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, width: "100%", flex: 1 }}>
      <canvas
        ref={canvasRef}
        style={{ borderRadius: "50%", cursor: "pointer", filter: "drop-shadow(0 0 32px rgba(124,92,252,0.35))", maxWidth: "100%", maxHeight: "100%" }}
        onClick={spin}
      />
      <button
        onClick={spin}
        style={{
          padding: "16px 56px", background: "linear-gradient(135deg, #7c5cfc, #5b4cdc)",
          border: "none", borderRadius: 12, color: "#fff", fontSize: 18,
          fontWeight: 700, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif",
          letterSpacing: 0.5, boxShadow: "0 4px 24px rgba(124,92,252,0.45)"
        }}
      >
        Spin
      </button>
    </div>
  );
}

// ── Result Modal ──────────────────────────────────────────────────────────────
function ResultModal({ project, categories, onAccept, onReroll, onClose }) {
  const [expanded, setExpanded] = useState(false);
  const catNames = (project.categoryIds || [])
    .map((id) => categories.find((c) => c.id === id)?.name)
    .filter(Boolean);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100
    }} onClick={onClose}>
      <div style={{
        background: "#161b27", border: "1px solid #7c5cfc", borderRadius: 16,
        padding: 32, width: 440, boxShadow: "0 0 60px rgba(124,92,252,0.25)"
      }} onClick={(e) => e.stopPropagation()}>
        <p style={{ color: "#7c5cfc", fontSize: 12, fontWeight: 600, margin: "0 0 8px", letterSpacing: 1 }}>
          THE WHEEL HAS SPOKEN
        </p>
        <h2
          style={{
            color: "#fff", fontSize: 22, fontFamily: "'Space Grotesk', sans-serif",
            margin: "0 0 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8
          }}
          onClick={() => setExpanded(!expanded)}
        >
          {project.name}
          <span style={{ color: "#6b7280", fontSize: 16 }}>{expanded ? "▲" : "▼"}</span>
        </h2>

        {expanded && (
          <p style={{ color: "#9ca3af", fontSize: 14, lineHeight: 1.6, margin: "0 0 16px" }}>
            {project.description || "No description yet."}
          </p>
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
          <span style={{
            padding: "3px 10px", borderRadius: 99, fontSize: 12,
            background: `${DIFF_COLOR[project.difficulty]}22`,
            color: DIFF_COLOR[project.difficulty], fontWeight: 600
          }}>{project.difficulty}</span>
          <span style={{
            padding: "3px 10px", borderRadius: 99, fontSize: 12,
            background: "#1e2535", color: "#9ca3af"
          }}>{project.dev_type}</span>
          {catNames.map((c) => (
            <span key={c} style={{
              padding: "3px 10px", borderRadius: 99, fontSize: 12,
              background: "#1e2535", color: "#9ca3af"
            }}>{c}</span>
          ))}
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={onAccept}
            style={{
              flex: 1, padding: "12px", background: "#7c5cfc", border: "none",
              borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer"
            }}
          >
            Accept — start this
          </button>
          <button
            onClick={onReroll}
            style={{
              flex: 1, padding: "12px", background: "#1e2535", border: "1px solid #2d3748",
              borderRadius: 8, color: "#9ca3af", fontSize: 14, cursor: "pointer"
            }}
          >
            Reroll
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Project Card ──────────────────────────────────────────────────────────────
function ProjectCard({ project, categories, onEdit, onDelete }) {
  const catNames = (project.categoryIds || [])
    .map((id) => categories.find((c) => c.id === id)?.name)
    .filter(Boolean);

  return (
    <div style={{
      background: "#161b27", borderLeft: `4px solid ${DIFF_COLOR[project.difficulty]}`,
      borderRadius: "0 10px 10px 0", padding: "20px 22px",
      display: "flex", flexDirection: "column", gap: 12
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <h3 style={{ color: "#fff", fontSize: 17, fontWeight: 600, margin: 0, lineHeight: 1.3 }}>
          {project.name}
        </h3>
        <div style={{ display: "flex", gap: 6, flexShrink: 0, marginLeft: 8 }}>
          <button onClick={() => onEdit(project)} style={iconBtn}>✏️</button>
          <button onClick={() => onDelete(project.id)} style={iconBtn}>🗑️</button>
        </div>
      </div>

      {project.description && (
        <p style={{ color: "#6b7280", fontSize: 14, margin: 0, lineHeight: 1.6,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden"
        }}>
          {project.description}
        </p>
      )}

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{
          padding: "4px 11px", borderRadius: 99, fontSize: 13,
          background: `${STATUS_COLOR[project.status]}22`, color: STATUS_COLOR[project.status], fontWeight: 600
        }}>{project.status}</span>
        <span style={{
          padding: "4px 11px", borderRadius: 99, fontSize: 13,
          background: `${DIFF_COLOR[project.difficulty]}18`, color: DIFF_COLOR[project.difficulty]
        }}>{project.difficulty}</span>
        <span style={{ padding: "4px 11px", borderRadius: 99, fontSize: 13, background: "#1e2535", color: "#9ca3af" }}>
          {project.dev_type}
        </span>
        {catNames.map((c) => (
          <span key={c} style={{ padding: "4px 11px", borderRadius: 99, fontSize: 13, background: "#1e2535", color: "#6b7280" }}>
            {c}
          </span>
        ))}
      </div>

      {project.status === "completed" && project.link && (
        <a href={project.link} target="_blank" rel="noreferrer" style={{ color: "#7c5cfc", fontSize: 14 }}>
          View project →
        </a>
      )}
    </div>
  );
}

const iconBtn = {
  background: "none", border: "none", cursor: "pointer", fontSize: 14,
  padding: "2px 4px", borderRadius: 4, opacity: 0.6
};

// ── Project Form Modal ────────────────────────────────────────────────────────
function ProjectFormModal({ project, categories, onSave, onClose }) {
  const [form, setForm] = useState(project || {
    name: "", description: "", difficulty: "Medium",
    dev_type: "Assisted", status: "idea", link: "", categoryIds: []
  });
  const [loading, setLoading] = useState(false);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  function toggleCat(id) {
    setForm((f) => ({
      ...f,
      categoryIds: f.categoryIds.includes(id)
        ? f.categoryIds.filter((c) => c !== id)
        : [...f.categoryIds, id]
    }));
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setLoading(true);
    await onSave(form);
    setLoading(false);
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20
    }} onClick={onClose}>
      <div style={{
        background: "#161b27", border: "1px solid #1e2535", borderRadius: 16,
        padding: 32, width: 500, maxHeight: "90vh", overflowY: "auto"
      }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ color: "#fff", fontSize: 18, fontFamily: "'Space Grotesk', sans-serif", margin: "0 0 24px" }}>
          {project?.id ? "Edit project" : "Add project"}
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Field label="Name">
            <input value={form.name} onChange={(e) => set("name", e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Description">
            <textarea
              value={form.description} onChange={(e) => set("description", e.target.value)}
              rows={3} style={{ ...inputStyle, resize: "vertical" }}
            />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Field label="Difficulty">
              <select value={form.difficulty} onChange={(e) => set("difficulty", e.target.value)} style={inputStyle}>
                {DIFFICULTIES.map((d) => <option key={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Dev type">
              <select value={form.dev_type} onChange={(e) => set("dev_type", e.target.value)} style={inputStyle}>
                {DEV_TYPES.map((d) => <option key={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={(e) => set("status", e.target.value)} style={inputStyle}>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
          </div>

          {form.status === "completed" && (
            <Field label="Project link">
              <input value={form.link || ""} onChange={(e) => set("link", e.target.value)} style={inputStyle} placeholder="https://…" />
            </Field>
          )}

          <Field label="Categories">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => toggleCat(c.id)}
                  style={{
                    padding: "5px 12px", borderRadius: 99, fontSize: 12, cursor: "pointer",
                    border: form.categoryIds.includes(c.id) ? "1px solid #7c5cfc" : "1px solid #2d3748",
                    background: form.categoryIds.includes(c.id) ? "rgba(124,92,252,0.2)" : "#1e2535",
                    color: form.categoryIds.includes(c.id) ? "#7c5cfc" : "#9ca3af",
                  }}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </Field>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <button
            onClick={handleSave}
            disabled={loading || !form.name.trim()}
            style={{
              flex: 1, padding: "12px", background: "#7c5cfc", border: "none",
              borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 600,
              cursor: "pointer", opacity: loading || !form.name.trim() ? 0.6 : 1
            }}
          >
            {loading ? "Saving…" : "Save"}
          </button>
          <button onClick={onClose} style={{
            padding: "12px 20px", background: "#1e2535", border: "none",
            borderRadius: 8, color: "#9ca3af", fontSize: 14, cursor: "pointer"
          }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ color: "#6b7280", fontSize: 12, display: "block", marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%", boxSizing: "border-box", padding: "10px 12px",
  background: "#0f1117", border: "1px solid #1e2535", borderRadius: 8,
  color: "#fff", fontSize: 14, outline: "none", fontFamily: "Inter, sans-serif"
};

// ── Category Manager ──────────────────────────────────────────────────────────
function CategoryManager({ categories, projects, onAdd, onRename, onDelete, onClose }) {
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState(null);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100
    }} onClick={onClose}>
      <div style={{
        background: "#161b27", border: "1px solid #1e2535", borderRadius: 16,
        padding: 32, width: 440
      }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ color: "#fff", fontSize: 18, fontFamily: "'Space Grotesk', sans-serif", margin: "0 0 20px" }}>
          Manage categories
        </h2>

        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <input
            value={newName} onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && newName.trim()) { onAdd(newName.trim()); setNewName(""); }}}
            placeholder="New category name"
            style={{ ...inputStyle, flex: 1 }}
          />
          <button
            onClick={() => { if (newName.trim()) { onAdd(newName.trim()); setNewName(""); }}}
            style={{
              padding: "10px 16px", background: "#7c5cfc", border: "none",
              borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 14
            }}
          >Add</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 360, overflowY: "auto" }}>
          {categories.map((c) => {
            const count = projects.filter((p) => p.categoryIds.includes(c.id)).length;
            return (
              <div key={c.id} style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "#0f1117", borderRadius: 8, padding: "10px 12px"
              }}>
                {editing === c.id ? (
                  <input
                    autoFocus
                    defaultValue={c.name}
                    onBlur={(e) => { onRename(c.id, e.target.value); setEditing(null); }}
                    onKeyDown={(e) => { if (e.key === "Enter") { onRename(c.id, e.target.value); setEditing(null); }}}
                    style={{ ...inputStyle, flex: 1, padding: "4px 8px", fontSize: 13 }}
                  />
                ) : (
                  <span style={{ flex: 1, color: "#fff", fontSize: 14 }}>
                    {c.name}
                    <span style={{ color: "#6b7280", fontSize: 12, marginLeft: 8 }}>{count} projects</span>
                  </span>
                )}
                <button onClick={() => setEditing(c.id)} style={iconBtn}>✏️</button>
                <button onClick={() => onDelete(c.id)} style={iconBtn}>🗑️</button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Sidebar Multiselect Filter ────────────────────────────────────────────────
function MultiFilter({ label, options, selected, onChange, colorMap }) {
  const all = selected.length === 0;
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ color: "#6b7280", fontSize: 12, fontWeight: 600, margin: "0 0 8px", letterSpacing: 0.5 }}>
        {label}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <button
          onClick={() => onChange([])}
          style={{
            background: all ? "rgba(124,92,252,0.15)" : "none", border: "none",
            color: all ? "#7c5cfc" : "#9ca3af", textAlign: "left", padding: "6px 10px",
            borderRadius: 6, cursor: "pointer", fontSize: 14
          }}
        >
          All
        </button>
        {options.map((o) => {
          const active = selected.includes(o);
          const color = colorMap ? colorMap[o] : "#7c5cfc";
          return (
            <button
              key={o}
              onClick={() => onChange(active ? selected.filter((x) => x !== o) : [...selected, o])}
              style={{
                background: active ? `${color}18` : "none", border: "none",
                color: active ? color : "#9ca3af", textAlign: "left", padding: "6px 10px",
                borderRadius: 6, cursor: "pointer", fontSize: 14, display: "flex",
                alignItems: "center", gap: 6
              }}
            >
              {active && <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, display: "inline-block" }} />}
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [projects, setProjects] = useState([]);
  const [categories, setCategories] = useState([]);
  const [view, setView] = useState("wheel"); // "wheel" | "projects"
  const [search, setSearch] = useState("");

  // Filters
  const [filterCats, setFilterCats] = useState([]);
  const [filterDiffs, setFilterDiffs] = useState([]);
  const [filterDevTypes, setFilterDevTypes] = useState([]);
  const [filterStatuses, setFilterStatuses] = useState([]);

  // Modals
  const [result, setResult] = useState(null);
  const [editProject, setEditProject] = useState(null);
  const [showCatManager, setShowCatManager] = useState(false);
  const [showAddProject, setShowAddProject] = useState(false);

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthChecked(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load data
  const load = useCallback(async () => {
    const data = await fetchAll();
    setProjects(data.projects);
    setCategories(data.categories);
  }, []);

  useEffect(() => { if (session) load(); }, [session]);

  // Filtered projects
  const filtered = projects.filter((p) => {
    if (filterCats.length) {
      const catIds = categories.filter((c) => filterCats.includes(c.name)).map((c) => c.id);
      if (!catIds.some((id) => p.categoryIds.includes(id))) return false;
    }
    if (filterDiffs.length && !filterDiffs.includes(p.difficulty)) return false;
    if (filterDevTypes.length && !filterDevTypes.includes(p.dev_type)) return false;
    if (filterStatuses.length && !filterStatuses.includes(p.status)) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) &&
      !(p.description || "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // CRUD
  async function saveProject(form) {
    const { categoryIds, ...fields } = form;
    if (!fields.link || fields.status !== "completed") fields.link = null;

    if (fields.id) {
      await supabase.from("projects").update(fields).eq("id", fields.id);
      await supabase.from("project_categories").delete().eq("project_id", fields.id);
    } else {
      const { data } = await supabase.from("projects").insert(fields).select().single();
      fields.id = data.id;
    }
    if (categoryIds?.length) {
      await supabase.from("project_categories").insert(
        categoryIds.map((cid) => ({ project_id: fields.id, category_id: cid }))
      );
    }
    setEditProject(null);
    setShowAddProject(false);
    load();
  }

  async function deleteProject(id) {
    if (!confirm("Delete this project?")) return;
    await supabase.from("projects").delete().eq("id", id);
    load();
  }

  async function acceptResult(project) {
    await supabase.from("projects").update({ status: "doing" }).eq("id", project.id);
    setResult(null);
    load();
  }

  async function addCategory(name) {
    await supabase.from("categories").insert({ name });
    load();
  }

  async function renameCategory(id, name) {
    await supabase.from("categories").update({ name }).eq("id", id);
    load();
  }

  async function deleteCategory(id) {
    if (!confirm("Remove this category? Projects won't be deleted.")) return;
    await supabase.from("project_categories").delete().eq("category_id", id);
    await supabase.from("categories").delete().eq("id", id);
    load();
  }

  if (!authChecked) return null;
  if (!session) return <AuthScreen />;

  const sidebarW = 260;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;700&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; background: #0f1117; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e2535; border-radius: 3px; }
        select option { background: #161b27; }
      `}</style>

      <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>

        {/* ── Sidebar ── */}
        <aside style={{
          width: sidebarW, background: "#161b27", borderRight: "1px solid #1e2535",
          padding: "24px 16px", display: "flex", flexDirection: "column",
          position: "fixed", top: 0, left: 0, bottom: 0, overflowY: "auto"
        }}>
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 26 }}>🎡</span>
              <span style={{ color: "#fff", fontWeight: 700, fontSize: 20, fontFamily: "'Space Grotesk', sans-serif" }}>
                Project Wheel
              </span>
            </div>
            <p style={{ color: "#4b5563", fontSize: 13, margin: 0 }}>
              {projects.length} projects
            </p>
          </div>

          {/* Nav */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 28 }}>
            {[["wheel", "🎡", "Spin the wheel"], ["projects", "📋", "Browse projects"]].map(([v, icon, label]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                  borderRadius: 8, border: "none", cursor: "pointer", fontSize: 15,
                  background: view === v ? "rgba(124,92,252,0.15)" : "none",
                  color: view === v ? "#7c5cfc" : "#9ca3af", fontWeight: view === v ? 600 : 400,
                  textAlign: "left"
                }}
              >
                {icon} {label}
              </button>
            ))}
          </div>

          <div style={{ borderTop: "1px solid #1e2535", paddingTop: 20 }}>
            <MultiFilter
              label="CATEGORY"
              options={categories.map((c) => c.name)}
              selected={filterCats}
              onChange={setFilterCats}
            />
            <MultiFilter
              label="DIFFICULTY"
              options={DIFFICULTIES}
              selected={filterDiffs}
              onChange={setFilterDiffs}
              colorMap={DIFF_COLOR}
            />
            <MultiFilter
              label="DEV TYPE"
              options={DEV_TYPES}
              selected={filterDevTypes}
              onChange={setFilterDevTypes}
            />
            <MultiFilter
              label="STATUS"
              options={STATUSES}
              selected={filterStatuses}
              onChange={setFilterStatuses}
              colorMap={STATUS_COLOR}
            />
          </div>

          <div style={{ marginTop: "auto", paddingTop: 20, borderTop: "1px solid #1e2535", display: "flex", flexDirection: "column", gap: 8 }}>
            <button onClick={() => setShowAddProject(true)} style={sidebarActionBtn("#7c5cfc")}>
              + Add project
            </button>
            <button onClick={() => setShowCatManager(true)} style={sidebarActionBtn("#1e2535")}>
              Manage categories
            </button>
            <button onClick={() => supabase.auth.signOut()} style={{ ...sidebarActionBtn("#1e2535"), color: "#6b7280" }}>
              Sign out
            </button>
          </div>
        </aside>

        {/* ── Main ── */}
        <main style={{ marginLeft: sidebarW, flex: 1, padding: "32px 48px", minHeight: "100vh" }}>

          {view === "wheel" && (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              gap: 24, height: "calc(100vh - 64px)", paddingTop: 8
            }}>
              <div style={{ textAlign: "center", flexShrink: 0 }}>
                <h1 style={{
                  color: "#fff", fontSize: 32, fontFamily: "'Space Grotesk', sans-serif",
                  margin: "0 0 6px", fontWeight: 700
                }}>
                  What should you build next?
                </h1>
                <p style={{ color: "#6b7280", fontSize: 15, margin: 0 }}>
                  {filtered.length} projects in the pool · click the wheel or hit Spin
                </p>
              </div>

              <SpinWheel
                projects={filtered}
                onResult={(p) => setResult(p)}
              />

              {filtered.length === 0 && (
                <p style={{ color: "#6b7280", fontSize: 15 }}>
                  No projects match your current filters.
                </p>
              )}
            </div>
          )}

          {view === "projects" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                <div>
                  <h1 style={{ color: "#fff", fontSize: 28, fontFamily: "'Space Grotesk', sans-serif", margin: "0 0 4px" }}>
                    Projects
                  </h1>
                  <p style={{ color: "#6b7280", fontSize: 15, margin: 0 }}>
                    Showing {filtered.length} of {projects.length}
                  </p>
                </div>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search…"
                  style={{ ...inputStyle, width: 260, fontSize: 15 }}
                />
              </div>

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
                gap: 12
              }}>
                {filtered.map((p) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    categories={categories}
                    onEdit={setEditProject}
                    onDelete={deleteProject}
                  />
                ))}
                {filtered.length === 0 && (
                  <p style={{ color: "#6b7280", gridColumn: "1/-1" }}>
                    No projects match. Try adjusting your filters.
                  </p>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      {result && (
        <ResultModal
          project={result}
          categories={categories}
          onAccept={() => acceptResult(result)}
          onReroll={() => { setResult(null); }}
          onClose={() => setResult(null)}
        />
      )}

      {(editProject || showAddProject) && (
        <ProjectFormModal
          project={editProject}
          categories={categories}
          onSave={saveProject}
          onClose={() => { setEditProject(null); setShowAddProject(false); }}
        />
      )}

      {showCatManager && (
        <CategoryManager
          categories={categories}
          projects={projects}
          onAdd={addCategory}
          onRename={renameCategory}
          onDelete={deleteCategory}
          onClose={() => setShowCatManager(false)}
        />
      )}
    </>
  );
}

function sidebarActionBtn(bg) {
  return {
    padding: "12px 14px", background: bg, border: "none", borderRadius: 8,
    color: "#fff", fontSize: 15, cursor: "pointer", textAlign: "left", width: "100%", fontWeight: 500
  };
}