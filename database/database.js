// database/database.js
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SQLite file in project root
const dbPath = path.join(__dirname, '..', 'community.db');
const db = new Database(dbPath);

console.log('🔌 SQLite connected at:', dbPath);

export default db;
