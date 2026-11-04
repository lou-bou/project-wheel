// Project Wheel API + static file server.
// Auth is handled in front of this by Cloudflare Access, so it binds to localhost only.
import express from "express";
import pg from "pg";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "127.0.0.1";
const DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const app = express();
app.use(express.json());
app.use("/api", (_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

const PROJECT_FIELDS = ["name", "description", "difficulty", "dev_type", "status", "link", "has_content"];

function pickFields(body, allowed = PROJECT_FIELDS) {
  return allowed.filter((k) => k in body).map((k) => [k, body[k]]);
}

async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

async function setProjectCategories(client, projectId, categoryIds) {
  await client.query("delete from project_categories where project_id = $1", [projectId]);
  if (categoryIds.length) {
    await client.query(
      "insert into project_categories (project_id, category_id) select $1, unnest($2::uuid[])",
      [projectId, categoryIds],
    );
  }
}

// ── Read everything in one go ───────────────────────────────────────────────
app.get("/api/data", async (_req, res) => {
  const [projects, categories] = await Promise.all([
    pool.query(`
      select p.*, coalesce(array_agg(pc.category_id) filter (where pc.category_id is not null), '{}') as "categoryIds"
      from projects p left join project_categories pc on pc.project_id = p.id
      group by p.id order by p.name`),
    pool.query("select * from categories order by name"),
  ]);
  res.json({ projects: projects.rows, categories: categories.rows });
});

// ── Projects ────────────────────────────────────────────────────────────────
app.post("/api/projects", async (req, res) => {
  // The app picks the id, so replaying a queued create can't make a duplicate
  const fields = pickFields(req.body, ["id", ...PROJECT_FIELDS]);
  const project = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `insert into projects (${fields.map(([k]) => k).join(", ")})
       values (${fields.map((_, i) => `$${i + 1}`).join(", ")})
       on conflict (id) do nothing returning *`,
      fields.map(([, v]) => v),
    );
    if (rows[0]) await setProjectCategories(client, rows[0].id, req.body.categoryIds || []);
    return rows[0];
  });
  res.status(project ? 201 : 200).json(project ?? { id: req.body.id });
});

app.patch("/api/projects/:id", async (req, res) => {
  const fields = pickFields(req.body);
  const found = await withTransaction(async (client) => {
    const { rowCount } = await client.query("select 1 from projects where id = $1", [req.params.id]);
    if (!rowCount) return false;
    if (fields.length) {
      await client.query(
        `update projects set ${fields.map(([k], i) => `${k} = $${i + 2}`).join(", ")} where id = $1`,
        [req.params.id, ...fields.map(([, v]) => v)],
      );
    }
    if (req.body.categoryIds) await setProjectCategories(client, req.params.id, req.body.categoryIds);
    return true;
  });
  if (!found) return res.status(404).json({ error: "this project no longer exists" });
  res.status(204).end();
});

app.delete("/api/projects/:id", async (req, res) => {
  await pool.query("delete from projects where id = $1", [req.params.id]);
  res.status(204).end();
});

// ── Categories ──────────────────────────────────────────────────────────────
app.post("/api/categories", async (req, res) => {
  const { rows } = await pool.query("insert into categories (name) values ($1) returning *", [req.body.name]);
  res.status(201).json(rows[0]);
});

app.patch("/api/categories/:id", async (req, res) => {
  await pool.query("update categories set name = $2 where id = $1", [req.params.id, req.body.name]);
  res.status(204).end();
});

app.delete("/api/categories/:id", async (req, res) => {
  await pool.query("delete from categories where id = $1", [req.params.id]);
  res.status(204).end();
});

app.use("/api", (_req, res) => res.status(404).json({ error: "not found" }));

// Permanent failures get a 4xx so the app's device queue doesn't keep retrying them
const REJECTED = {
  23505: [409, "that name is already taken"],
  23503: [409, "a category it uses no longer exists"],
  23502: [400, "a required field is missing"],
  23514: [400, "a field has an invalid value"],
  "22P02": [400, "a field has an invalid value"],
};

// Express needs all four args to treat this as an error handler
// eslint-disable-next-line no-unused-vars
app.use("/api", (err, _req, res, _next) => {
  const rejected = REJECTED[err.code];
  if (rejected) return res.status(rejected[0]).json({ error: rejected[1] });
  console.error(err);
  res.status(500).json({ error: err.message });
});

// ── Frontend (built by `npm run build`) ─────────────────────────────────────
app.use(express.static(DIST));
// Only page routes get the app; a missing file must 404, or the service worker saves index.html as that file
app.get("/{*path}", (req, res) => {
  if (path.extname(req.path)) return res.status(404).end();
  res.sendFile(path.join(DIST, "index.html"));
});

app.listen(PORT, HOST, () => console.log(`Project Wheel on http://${HOST}:${PORT}`));
