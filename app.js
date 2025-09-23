// app.js (ESM)
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './database/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5000;

/* ------------------------ App setup ------------------------ */
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

/* -------------------- Security headers --------------------- */
// Minimal, assessment-friendly defaults (no inline <script> in views)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self' data:",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'self'",
    ].join('; ')
  );
  next();
});

/* --------------------- Helper utilities -------------------- */
const AREA_SLUGS = new Map([
  ['sports', 'Sports'],
  ['health', 'Health'],
  ['education', 'Education'],
  ['arts', 'Arts & Culture'],
]);

function toBoolInt(x) {
  return x ? 1 : 0;
}

/* ------------------------- Pages --------------------------- */

// Home: show featured (next upcoming) event + areas
app.get('/', (req, res, next) => {
  try {
    const featured =
      db
        .prepare(
          `SELECT e.id, e.title, e.date, e.summary, a.name AS area, t.name AS type
           FROM events e
           LEFT JOIN areas a ON a.id = e.area_id
           LEFT JOIN types t ON t.id = e.type_id
           WHERE date(e.date) >= date('now')
           ORDER BY e.date ASC
           LIMIT 1`
        )
        .get() || null;

    const areas = db.prepare(`SELECT id, name FROM areas ORDER BY name`).all();

    res.render('index', {
      active: 'home',
      featured,
      areas,
      title: 'Local Community Portal',
    });
  } catch (err) {
    next(err);
  }
});

// FAQ
app.get('/faq', (req, res) => {
  res.render('faq', { active: 'faq', title: 'FAQ • Local Community Portal' });
});

// Contact (GET)
app.get('/contact', (req, res) => {
  const sent = req.query.sent === '1';
  res.render('contact', {
    active: 'contact',
    sent,
    title: 'Contact • Local Community Portal',
  });
});

// Contact (non-AJAX POST fallback -> render success)
app.post('/contact', (req, res, next) => {
  try {
    let { subject, name, email, message } = req.body || {};
    subject = String(subject || '').trim();
    name = String(name || '').trim();
    email = String(email || '').trim();
    message = String(message || '').trim();

    if (
      !subject ||
      !name ||
      !email ||
      !message ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      message.length < 10
    ) {
      // Simple fallback validation error -> re-render page
      return res.render('contact', {
        active: 'contact',
        sent: false,
        title: 'Contact • Local Community Portal',
      });
    }

    db.prepare(
      `INSERT INTO contacts (subject, name, email, message, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`
    ).run(subject, name, email, message);

    // render success branch in view
    res.render('contact', {
      active: 'contact',
      sent: true,
      title: 'Contact • Local Community Portal',
    });
  } catch (err) {
    next(err);
  }
});

// Areas (Sports/Health/Education/Arts)
app.get('/areas/:slug', (req, res, next) => {
  try {
    const slug = (req.params.slug || '').toLowerCase();
    if (!AREA_SLUGS.has(slug)) return res.status(404).send('Page not found');

    const areaName = AREA_SLUGS.get(slug);
    const area = db.prepare(`SELECT id, name FROM areas WHERE name = ?`).get(areaName);
    if (!area) return res.status(404).send('Page not found');

    // You may fetch some listings here or load via AJAX on the client
    const listings = db
      .prepare(
        `SELECT e.id, e.title, e.date, e.summary
         FROM events e
         WHERE e.area_id = ?
         ORDER BY e.date DESC
         LIMIT 12`
      )
      .all(area.id);

    res.render('community', {
      active: slug,
      area,
      listings,
      title: `${areaName} • Local Community Portal`,
    });
  } catch (err) {
    next(err);
  }
});

// Events index (filters are AJAX; view just needs metadata)
app.get('/events', (req, res, next) => {
  try {
    const years = db
      .prepare(`SELECT DISTINCT strftime('%Y', date) AS y FROM events ORDER BY y DESC`)
      .all()
      .map((r) => r.y);

    const areas = db.prepare(`SELECT id, name FROM areas ORDER BY name`).all();
    const types = db.prepare(`SELECT id, name FROM types ORDER BY name`).all();

    res.render('events', {
      active: 'events',
      years,
      currentYear: new Date().getFullYear(),
      areas,
      types,
      title: 'Events • Local Community Portal',
    });
  } catch (err) {
    next(err);
  }
});

// Event detail
app.get('/events/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(404).send('Not found');

    const ev = db
      .prepare(
        `SELECT e.*, a.name AS area, t.name AS type
         FROM events e
         LEFT JOIN areas a ON a.id = e.area_id
         LEFT JOIN types t ON t.id = e.type_id
         WHERE e.id = ?`
      )
      .get(id);

    if (!ev) return res.status(404).send('Not found');

    const isPast =
      db
        .prepare(`SELECT date(?) < date('now') AS past`).get(ev.date)?.past === 1;

    res.render('event-detail', {
      active: 'events',
      ev: { ...ev, isPast },
      title: `${ev.title} • Local Community Portal`,
    });
  } catch (err) {
    next(err);
  }
});

/* ------------------------- APIs ---------------------------- */

// Contact (AJAX)
app.post('/api/contact', (req, res) => {
  try {
    let { subject, name, email, message } = req.body || {};
    subject = String(subject || '').trim();
    name = String(name || '').trim();
    email = String(email || '').trim();
    message = String(message || '').trim();

    if (!subject || !name || !email || !message) {
      return res.status(400).json({ ok: false, error: 'Please fill in all fields.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ ok: false, error: 'Please provide a valid email address.' });
    }
    if (message.length < 10) {
      return res.status(400).json({ ok: false, error: 'Message should be at least 10 characters.' });
    }
    if (subject.length > 150 || name.length > 100 || email.length > 200 || message.length > 3000) {
      return res.status(400).json({ ok: false, error: 'Input too long.' });
    }

    db.prepare(
      `INSERT INTO contacts (subject, name, email, message, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`
    ).run(subject, name, email, message);

    return res.json({ ok: true });
  } catch (err) {
    console.error('Contact error:', err);
    return res.status(500).json({ ok: false, error: 'Server error. Please try again later.' });
  }
});

// Events (AJAX) — filters + pagination
app.get('/api/events', (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const year = String(req.query.year || '').trim();
    const areaId = Number(req.query.area_id) || null;
    const typeId = Number(req.query.type_id) || null;
    const past = req.query.past === '1';
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '12', 10)));
    const offset = (page - 1) * limit;

    const where = [];
    const params = [];

    if (areaId) {
      where.push('e.area_id = ?');
      params.push(areaId);
    }
    if (typeId) {
      where.push('e.type_id = ?');
      params.push(typeId);
    }
    if (q) {
      where.push('(e.title LIKE ? OR e.description LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }
    if (year) {
      // prefer range to help indexes (YYYY-01-01 .. YYYY-12-31)
      where.push(`date(e.date) BETWEEN date(? || '-01-01') AND date(? || '-12-31')`);
      params.push(year, year);
    }
    if (past) {
      where.push(`date(e.date) < date('now')`);
    }

    const base =
      `FROM events e
       LEFT JOIN areas a ON a.id = e.area_id
       LEFT JOIN types t ON t.id = e.type_id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}`;

    const total =
      db.prepare(`SELECT COUNT(*) AS c ${base}`).get(...params).c;

    const rows =
      db.prepare(
        `SELECT e.id, e.title, e.date, e.summary, a.name AS area, t.name AS type
         ${base}
         ORDER BY e.date DESC
         LIMIT ? OFFSET ?`
      ).all(...params, limit, offset);

    // add isPast flag for convenience
    const items = rows.map((r) => ({
      ...r,
      isPast: db.prepare(`SELECT date(?) < date('now') AS p`).get(r.date).p === 1,
    }));

    res.json({ items, total, page, limit });
  } catch (err) {
    console.error('Events API error:', err);
    res.status(500).json({ error: 'Failed to load events.' });
  }
});

// (Optional) Area-specific events (used by area page if needed)
app.get('/api/area-events', (req, res) => {
  try {
    const areaSlug = String(req.query.slug || '').toLowerCase();
    const areaName = AREA_SLUGS.get(areaSlug) || null;

    let area = null;
    if (areaName) {
      area = db.prepare(`SELECT id, name FROM areas WHERE name = ?`).get(areaName);
    }

    if (!area) {
      return res.json({ items: [], total: 0 });
    }

    const rows = db
      .prepare(
        `SELECT e.id, e.title, e.date, e.summary
         FROM events e
         WHERE e.area_id = ?
         ORDER BY e.date DESC
         LIMIT 24`
      )
      .all(area.id);

    const items = rows.map((r) => ({
      ...r,
      isPast: db.prepare(`SELECT date(?) < date('now') AS p`).get(r.date).p === 1,
    }));

    res.json({ items, total: items.length });
  } catch (err) {
    console.error('Area events API error:', err);
    res.status(500).json({ error: 'Failed to load area events.' });
  }
});

/* -------------------- Errors & 404s ------------------------ */

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).send('Something went wrong. Please try again later.');
});

app.use((req, res) => {
  res.status(404).send('Page not found');
});

/* ----------------------- Start server ---------------------- */
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
