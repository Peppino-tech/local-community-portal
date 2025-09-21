// app.js
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './database/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5000;

// View engine + static + body parsing
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // for JSON AJAX bodies

// Security headers (simple, allowed)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=()');
  // CSP: only load from this server (adjust if you use external CDNs)
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data:; object-src 'none'"
  );
  next();
});


// Home — featured + upcoming
app.get('/', (req, res) => {
  const nextEvent = db.prepare(`
    SELECT ev.id, ev.title, ev.description, ev.date, ar.name AS area
    FROM events ev
    JOIN areas ar ON ar.id = ev.area_id
    WHERE date(ev.date) >= date('now')
    ORDER BY date(ev.date) ASC
    LIMIT 1
  `).get();

  const upcomingEvents = db.prepare(`
    SELECT ev.id, ev.title, ev.description, ev.date, ar.name AS area
    FROM events ev
    JOIN areas ar ON ar.id = ev.area_id
    WHERE date(ev.date) >= date('now')
    ORDER BY date(ev.date) ASC
    LIMIT 3
  `).all();

  res.render('index', { nextEvent, upcomingEvents, active: 'home' });
});

// Area pages
app.get('/areas/:area(sports|health|education|arts)', (req, res) => {
  const areaParam = req.params.area;
  const areaName = areaParam.charAt(0).toUpperCase() + areaParam.slice(1);
  const sql = `
    SELECT ev.title, ev.date, ev.description
    FROM events ev
    JOIN areas ar ON ar.id = ev.area_id
    WHERE LOWER(ar.name) = @area
    ORDER BY date(ev.date) ASC
  `;
  const events = db.prepare(sql).all({ area: areaName.toLowerCase() });
  res.render('community', { areaName, events, active: areaParam });
});

// FAQ
app.get('/faq', (req, res) => {
  res.render('faq', { active: 'faq' });
});

// Contact (page)
app.get('/contact', (req, res) => {
  res.render('contact', { sent: false, active: 'contact' });
});

// Contact fallback (non-AJAX)
app.post('/contact', (req, res) => {
  const { subject, name, email, message } = req.body;
  if (!subject || !name || !email || !message) {
    return res.status(400).send('Please fill in all fields.');
  }
  const sql = `INSERT INTO contacts (subject, name, email, message) VALUES (?, ?, ?, ?)`;
  db.prepare(sql).run(subject, name, email, message);
  res.render('contact', { sent: true, active: 'contact' });
});

// Contact AJAX API
app.post('/api/contact', (req, res) => {
  const { subject, name, email, message } = req.body;
  if (!subject || !name || !email || !message) {
    return res.status(400).json({ ok: false, error: 'Please fill in all fields.' });
  }
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
  if (!emailOk) {
    return res.status(400).json({ ok: false, error: 'Please provide a valid email address.' });
  }
  const sql = `INSERT INTO contacts (subject, name, email, message) VALUES (?, ?, ?, ?)`;
  db.prepare(sql).run(subject, name, email, message);
  return res.json({ ok: true });
});

// Events explorer (page)
app.get('/events', (req, res) => {
  const years = db.prepare(`SELECT DISTINCT strftime('%Y', date) AS y FROM events ORDER BY y DESC`).all().map(r => r.y);
  const areas = db.prepare(`SELECT id, name FROM areas ORDER BY name`).all();
  const types = db.prepare(`SELECT id, name FROM event_types ORDER BY name`).all();
  const currentYear = new Date().getFullYear().toString();
  res.render('events', { years, areas, types, currentYear, active: 'events' });
});

// API: list/filter events
app.get('/api/events', (req, res) => {
  const { year, area_id, type_id, q, past, page = 1, limit = 12 } = req.query;
  const where = [];
  const params = {};

  if (year) { where.push("strftime('%Y', ev.date) = @year"); params.year = year; }
  if (area_id) { where.push("ev.area_id = @area_id"); params.area_id = area_id; }
  if (type_id) { where.push("ev.type_id = @type_id"); params.type_id = type_id; }
  if (q) { where.push("(ev.title LIKE @q OR ev.description LIKE @q)"); params.q = `%${q}%`; }
  if (past === 'true') { where.push("date(ev.date) < date('now')"); }
  if (past === 'false') { where.push("date(ev.date) >= date('now')"); }

  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const offset = (Number(page) - 1) * Number(limit);

  const baseSql = `
    FROM events ev
    JOIN areas ar ON ar.id = ev.area_id
    LEFT JOIN event_types et ON et.id = ev.type_id
    ${whereSql}
  `;

  const items = db.prepare(`
    SELECT ev.id, ev.title, ev.description, ev.date,
           ar.name AS area, et.name AS type,
           (date(ev.date) < date('now')) AS isPast
    ${baseSql}
    ORDER BY date(ev.date) DESC
    LIMIT @limit OFFSET @offset
  `).all({ ...params, limit, offset });

  const total = db.prepare(`SELECT COUNT(*) AS c ${baseSql}`).get(params).c;

  res.json({ items, total, page: Number(page), limit: Number(limit) });
});

// API: single event
app.get('/api/events/:id', (req, res) => {
  const ev = db.prepare(`
    SELECT ev.*, ar.name AS area, et.name AS type,
           (date(ev.date) < date('now')) AS isPast
    FROM events ev
    JOIN areas ar ON ar.id = ev.area_id
    LEFT JOIN event_types et ON et.id = ev.type_id
    WHERE ev.id = @id
  `).get({ id: req.params.id });

  if (!ev) return res.status(404).json({ error: 'Not found' });
  res.json(ev);
});

// Event detail page
app.get('/events/:id', (req, res) => {
  const ev = db.prepare(`
    SELECT ev.*, ar.name AS area, et.name AS type,
           (date(ev.date) < date('now')) AS isPast
    FROM events ev
    JOIN areas ar ON ar.id = ev.area_id
    LEFT JOIN event_types et ON et.id = ev.type_id
    WHERE ev.id = @id
  `).get({ id: req.params.id });

  if (!ev) return res.status(404).send('Event not found');
  res.render('event-detail', { ev, active: 'events' });
});

// === NEW: Interactive Activity page ===
app.get('/activity', (req, res) => {
  res.render('activity', { active: 'activity' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).send('Something went wrong. Please try again later.');
});


// 404
app.use((req, res) => {
  res.status(404).send('Page not found');
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
