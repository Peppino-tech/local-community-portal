// database/database.js
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

// __dirname = /.../local-community-portal/database
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use the DB file in the PROJECT ROOT: /.../local-community-portal/community.db
const dbPath = path.join(__dirname, '..', 'community.db');

const db = new Database(dbPath);
console.log('🔌 SQLite connected at:', dbPath);

export default db;
