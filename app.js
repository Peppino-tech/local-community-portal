// app.js (final version with robust area slug handling)
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import db from "./database/database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5000;

/* ------------------------ Setup ------------------------ */
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

/* ---------------- Security headers --------------------- */
app.use((_, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self' data:",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'self'",
    ].join("; ")
  );
  next();
});

/* ---------------- Helper: normalise keys --------------- */
function normKey(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/%20/gi, " ")
    .replace(/&/g, "and")        // treat & and "and" as same
    .replace(/[^a-z0-9]+/g, " ") // collapse punctuation/spaces
    .trim();
}

/* =========================== PAGES ========================= */

// Home
app.get("/", (req, res, next) => {
  try {
    const featured =
      db.prepare(
        `SELECT e.id, e.title, e.date,
                substr(e.description, 1, 200) AS summary,
                a.name AS area
         FROM events e
         LEFT JOIN areas a ON a.id = e.area_id
         WHERE date(e.date) >= date('now')
         ORDER BY e.date ASC
         LIMIT 1`
      ).get() || null;

    const upcoming = db.prepare(
      `SELECT e.id, e.title, e.date,
              substr(e.description, 1, 200) AS summary,
              a.name AS area
       FROM events e
       LEFT JOIN areas a ON a.id = e.area_id
       WHERE date(e.date) >= date('now') ${featured ? "AND e.id <> ?" : ""}
       ORDER BY e.date ASC
       LIMIT 3`
    ).all(...(featured ? [featured.id] : []));

    let areas = [];
    try {
      areas = db.prepare(`SELECT id, name FROM areas ORDER BY name`).all();
    } catch { areas = []; }

    res.render("index", {
      active: "home",
      title: "Local Community Portal",
      featured,
      upcoming,
      areas,
    });
  } catch (err) { next(err); }
});

// FAQ
app.get("/faq", (_req, res) =>
  res.render("faq", { active: "faq", title: "FAQ • Local Community Portal" })
);

// Activity
app.get("/activity", (_req, res) =>
  res.render("activity", { active: "activity", title: "Activity • Local Community Portal" })
);

// Contact (GET)
app.get("/contact", (req, res) => {
  const sent = req.query.sent === "1";
  res.render("contact", { active: "contact", sent, title: "Contact • Local Community Portal" });
});

// Contact (POST fallback)
app.post("/contact", (req, res) => {
  try {
    let { subject, name, email, message } = req.body || {};
    subject = String(subject || "").trim();
    name    = String(name || "").trim();
    email   = String(email || "").trim();
    message = String(message || "").trim();

    if (!subject || !name || !email || !message ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        message.length < 10) {
      return res.render("contact", { active: "contact", sent: false, title: "Contact • Local Community Portal" });
    }

    db.prepare(
      `INSERT INTO contacts (subject, name, email, message, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`
    ).run(subject, name, email, message);

    res.render("contact", { active: "contact", sent: true, title: "Contact • Local Community Portal" });
  } catch {
    res.render("contact", { active: "contact", sent: false, title: "Contact • Local Community Portal" });
  }
});

// Areas — tolerant slug matching
app.get("/areas/:slug", (req, res) => {
  const raw = String(req.params.slug || "");
  const key = normKey(raw);

  let all = [];
  try {
    all = db.prepare(`SELECT id, name FROM areas`).all();
  } catch { all = []; }

  let area =
    all.find(a => normKey(a.name) === key) ||
    all.find(a => normKey(a.name).startsWith(key)) ||
    null;

  if (!area) return res.status(404).send("Page not found");

  const listings = db.prepare(
    `SELECT e.id, e.title, e.date,
            substr(e.description, 1, 200) AS summary
     FROM events e
     WHERE e.area_id = ?
     ORDER BY e.date DESC
     LIMIT 12`
  ).all(area.id);

  res.render("community", {
    active: raw.toLowerCase(),
    area,
    listings,
    title: `${area.name} • Local Community Portal`,
  });
});

// Events (index)
app.get("/events", (_req, res, next) => {
  try {
    const years = db.prepare(`SELECT DISTINCT strftime('%Y', date) AS y FROM events ORDER BY y DESC`)
      .all().map(r => r.y);

    let areas = [];
    try {
      areas = db.prepare(`SELECT id, name FROM areas ORDER BY name`).all();
    } catch { areas = []; }

    res.render("events", {
      active: "events",
      years,
      currentYear: new Date().getFullYear(),
      areas,
      types: [],
      title: "Events • Local Community Portal",
    });
  } catch (err) { next(err); }
});

// Event detail
app.get("/events/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(404).send("Not found");

  const ev = db.prepare(
    `SELECT e.*, a.name AS area
     FROM events e
     LEFT JOIN areas a ON a.id = e.area_id
     WHERE e.id = ?`
  ).get(id);

  if (!ev) return res.status(404).send("Not found");

  const isPast = db.prepare(`SELECT date(?) < date('now') AS past`).get(ev.date)?.past === 1;

  res.render("event-detail", {
    active: "events",
    ev: { ...ev, isPast },
    title: `${ev.title} • Local Community Portal`,
  });
});

/* ============================ APIs ========================= */

// Contact (AJAX)
app.post("/api/contact", (req, res) => {
  try {
    let { subject, name, email, message } = req.body || {};
    subject = String(subject || "").trim();
    name    = String(name || "").trim();
    email   = String(email || "").trim();
    message = String(message || "").trim();

    if (!subject || !name || !email || !message) {
      return res.status(400).json({ ok: false, error: "Please fill in all fields." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ ok: false, error: "Please provide a valid email address." });
    }
    if (message.length < 10) {
      return res.status(400).json({ ok: false, error: "Message should be at least 10 characters." });
    }

    db.prepare(
      `INSERT INTO contacts (subject, name, email, message, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`
    ).run(subject, name, email, message);

    return res.json({ ok: true });
  } catch (err) {
    console.error("Contact error:", err);
    return res.status(500).json({ ok: false, error: "Server error. Please try again later." });
  }
});

// Events (AJAX)
app.get("/api/events", (req, res) => {
  try {
    const q      = String(req.query.q || "").trim();
    const year   = String(req.query.year || "").trim();
    const areaId = Number(req.query.area_id) || null;
    const past   = req.query.past === "1";
    const page   = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit  = Math.min(50, Math.max(1, parseInt(req.query.limit || "12", 10)));
    const offset = (page - 1) * limit;

    const where = [];
    const params = [];

    if (areaId) where.push("e.area_id = ?"), params.push(areaId);
    if (q) { where.push("(e.title LIKE ? OR e.description LIKE ?)"); params.push(`%${q}%`, `%${q}%`); }
    if (year) { where.push(`date(e.date) BETWEEN date(? || '-01-01') AND date(? || '-12-31')`); params.push(year, year); }
    if (past) where.push(`date(e.date) < date('now')`);

    const base =
      `FROM events e
       LEFT JOIN areas a ON a.id = e.area_id
       ${where.length ? "WHERE " + where.join(" AND ") : ""}`;

    const total = db.prepare(`SELECT COUNT(*) AS c ${base}`).get(...params).c;

    const rows = db.prepare(
      `SELECT e.id, e.title, e.date,
              substr(e.description, 1, 200) AS summary,
              a.name AS area
       ${base}
       ORDER BY e.date DESC
       LIMIT ? OFFSET ?`
    ).all(...params, limit, offset);

    const items = rows.map(r => ({
      ...r,
      isPast: db.prepare(`SELECT date(?) < date('now') AS p`).get(r.date).p === 1,
    }));

    res.json({ items, total, page, limit });
  } catch (err) {
    console.error("Events API error:", err);
    res.status(500).json({ error: "Failed to load events." });
  }
});

/* ====================== Errors & 404 ====================== */
app.use((err, _req, res, _next) => {
  console.error("Server error:", err);
  res.status(500).send("Something went wrong. Please try again later.");
});
app.use((req, res) => res.status(404).send("Page not found"));

/* ======================= Start server ===================== */
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
