import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
export function openDb(dataDir) {
  fs.mkdirSync(dataDir, {recursive:true});
  const db = new Database(path.join(dataDir, 'catalog.sqlite'));
  db.pragma('journal_mode = WAL'); db.pragma('foreign_keys = ON'); db.pragma('busy_timeout = 5000');
  db.exec(fs.readFileSync(new URL('./migrations/001_initial.sql', import.meta.url), 'utf8'));
  return db;
}
