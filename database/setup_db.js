// database/setup_db.js
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname_this = path.dirname(__filename);
const __dirname_root = path.dirname(__dirname_this);

const dbPath = path.join(__dirname_root, 'community.db');
const db = new Database(dbPath);

// ---- Reset schema
db.exec('PRAGMA foreign_keys = OFF;');
db.exec('DROP TABLE IF EXISTS contacts;');
db.exec('DROP TABLE IF EXISTS events;');
db.exec('DROP TABLE IF EXISTS event_types;');
db.exec('DROP TABLE IF EXISTS areas;');
db.exec('PRAGMA foreign_keys = ON;');

// ---- Tables
db.exec(`
  CREATE TABLE areas (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );
`);

db.exec(`
  CREATE TABLE event_types (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );
`);

db.exec(`
  CREATE TABLE events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    area_id     INTEGER NOT NULL,
    type_id     INTEGER,
    title       TEXT NOT NULL,
    description TEXT NOT NULL,
    date        TEXT NOT NULL,     -- ISO YYYY-MM-DD
    venue       TEXT,
    image_url   TEXT,              -- relative to /public
    FOREIGN KEY (area_id) REFERENCES areas(id)  ON DELETE CASCADE,
    FOREIGN KEY (type_id) REFERENCES event_types(id) ON DELETE SET NULL
  );
`);

db.exec(`
  CREATE TABLE contacts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    subject    TEXT NOT NULL,
    name       TEXT NOT NULL,
    email      TEXT NOT NULL,
    message    TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// ---- Seed data (areas, types, events with images)
const seed = db.transaction(() => {
  const insertArea = db.prepare('INSERT INTO areas (name) VALUES (?)');
  const sportsId    = insertArea.run('Sports').lastInsertRowid;
  const healthId    = insertArea.run('Health').lastInsertRowid;
  const educationId = insertArea.run('Education').lastInsertRowid;
  const artsId      = insertArea.run('Arts').lastInsertRowid;

  const insertType = db.prepare('INSERT INTO event_types (name) VALUES (?)');
  const fairId     = insertType.run('Fair').lastInsertRowid;
  const concertId  = insertType.run('Concert').lastInsertRowid;
  const workshopId = insertType.run('Workshop').lastInsertRowid;
  const matchId    = insertType.run('Sports Match').lastInsertRowid;
  const partyId    = insertType.run('Party').lastInsertRowid;
  const talkId     = insertType.run('Talk').lastInsertRowid;
  const marketId   = insertType.run('Market').lastInsertRowid;
  const galaId     = insertType.run('Gala').lastInsertRowid;
  const lightsId   = insertType.run('Ceremony').lastInsertRowid;

  const insertEvent = db.prepare(`
    INSERT INTO events (area_id, type_id, title, description, date, venue, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // ---- Upcoming 2025
  insertEvent.run(
    sportsId, matchId,
    'Community Football Match',
    'Friendly 7-a-side at Riverside Park.',
    '2025-09-26', 'Riverside Park', '/images/events/football.jpg'
  );

  insertEvent.run(
    artsId, concertId,
    'Autumn Jazz Night',
    'Local bands and open mic.',
    '2025-10-12', 'Town Hall', '/images/events/jazz.jpg'
  );

  insertEvent.run(
    educationId, workshopId,
    'Intro to Coding Workshop',
    'Learn web basics in a day.',
    '2025-11-05', 'Library', '/images/events/coding.jpg'
  );

  insertEvent.run(
    healthId, fairId,
    'Wellbeing Fair',
    'Stalls, talks and free health checks.',
    '2025-10-02', 'Community Centre', '/images/events/wellbeing.jpg'
  );

  // ---- December specials (future)
  insertEvent.run(
    artsId, marketId,
    'Christmas Market',
    'Festive stalls, food, and music in the town square.',
    '2025-12-15', 'Town Square', '/images/events/christmas-market.jpg'
  );

  insertEvent.run(
    artsId, lightsId,
    'Christmas Lights Switch-On',
    'Official ceremony with carols, mulled wine, and children’s choir.',
    '2025-12-05', 'High Street', '/images/events/lights-switch-on.jpg'
  );

  insertEvent.run(
    artsId, partyId,
    'New Year’s Eve Party',
    'Ring in the New Year with fireworks and live music.',
    '2025-12-31', 'Main Plaza', '/images/events/nye.jpg'
  );

  // ---- Past 2024 (for filters/history)
  insertEvent.run(
    artsId, talkId,
    'Local Authors Talk',
    'Meet and Q&A with local writers.',
    '2024-05-15', 'Arts Hub', '/images/events/authors.jpg'
  );

  insertEvent.run(
    sportsId, matchId,
    'Summer Tennis Meetup',
    'Casual doubles and coaching tips.',
    '2024-08-20', 'Sports Club', '/images/events/tennis.jpg'
  );

  insertEvent.run(
    artsId, fairId,
    'Christmas Market 2024',
    'Last year’s festive market.',
    '2024-12-15', 'Town Square', '/images/events/christmas-market-2024.jpg'
  );

  insertEvent.run(
    artsId, galaId,
    'Charity Gala Dinner',
    'Formal dinner to raise funds for the local hospital.',
    '2024-11-22', 'Grand Hotel Ballroom', '/images/events/gala.jpg'
  );
});

seed();

console.log('✅ Database setup complete with per-event images at', dbPath);
