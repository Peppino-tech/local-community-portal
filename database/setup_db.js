// database/setup_db.js
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

// __dirname_root = /.../local-community-portal   (one level above /database)
const __filename = fileURLToPath(import.meta.url);
const __dirname_this = path.dirname(__filename);
const __dirname_root = path.dirname(__dirname_this);

const dbPath = path.join(__dirname_root, 'community.db');
const db = new Database(dbPath);

db.exec('PRAGMA foreign_keys = OFF;');
db.exec('DROP TABLE IF EXISTS contacts;');
db.exec('DROP TABLE IF EXISTS events;');
db.exec('DROP TABLE IF EXISTS event_types;');
db.exec('DROP TABLE IF EXISTS areas;');
db.exec('PRAGMA foreign_keys = ON;');

// Base tables
db.exec(`
  CREATE TABLE areas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );
`);

db.exec(`
  CREATE TABLE event_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );
`);

db.exec(`
  CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    area_id INTEGER NOT NULL,
    type_id INTEGER,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    date TEXT NOT NULL,           -- ISO YYYY-MM-DD
    venue TEXT,
    image_url TEXT,
    FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE CASCADE,
    FOREIGN KEY (type_id) REFERENCES event_types(id) ON DELETE SET NULL
  );
`);

db.exec(`
  CREATE TABLE contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Seed data
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
  const talkId     = insertType.run('Talk').lastInsertRowid;

  const insertEvent = db.prepare(
    'INSERT INTO events (area_id, type_id, title, description, date, venue) VALUES (?, ?, ?, ?, ?, ?)'
  );

  // Upcoming (2025)
  insertEvent.run(sportsId,    matchId,   'Community Football Match', 'Friendly 7-a-side at Riverside Park.', '2025-09-26', 'Riverside Park');
  insertEvent.run(artsId,      concertId, 'Autumn Jazz Night',        'Local bands and open mic.',            '2025-10-12', 'Town Hall');
  insertEvent.run(educationId, workshopId,'Intro to Coding Workshop', 'Learn web basics in a day.',          '2025-11-05', 'Library');
  insertEvent.run(healthId,    fairId,    'Wellbeing Fair',           'Stalls, talks and free health checks.','2025-10-02', 'Community Centre');

  // Past (2024) for filters
  insertEvent.run(artsId,      talkId,    'Local Authors Talk',       'Meet and Q&A with local writers.',     '2024-05-15', 'Arts Hub');
  insertEvent.run(sportsId,    matchId,   'Summer Tennis Meetup',     'Casual doubles and coaching tips.',    '2024-08-20', 'Sports Club');
});

seed();

console.l
