CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, data TEXT NOT NULL CHECK(json_valid(data)), version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, archived_at TEXT);
CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL, revision INTEGER NOT NULL, updated_at TEXT NOT NULL);
INSERT OR IGNORE INTO settings VALUES (1, '{"mostrar_precios_web":false,"featured":[]}', 1, strftime('%Y-%m-%dT%H:%M:%fZ','now'));
CREATE TABLE IF NOT EXISTS media (id TEXT PRIMARY KEY, owner TEXT NOT NULL, upload_key TEXT NOT NULL, hash TEXT NOT NULL, status TEXT NOT NULL, metadata TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, UNIQUE(owner,upload_key));
CREATE TABLE IF NOT EXISTS media_versions (id INTEGER PRIMARY KEY, product_id TEXT NOT NULL REFERENCES products(id), media_id TEXT NOT NULL REFERENCES media(id), created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS admins (id TEXT PRIMARY KEY, usuario TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS sessions (sid TEXT PRIMARY KEY, data TEXT NOT NULL, expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS leases (id TEXT PRIMARY KEY, media_id TEXT, expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
