CREATE TABLE IF NOT EXISTS quotes (
 id TEXT PRIMARY KEY, token_hash TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL,
 status TEXT NOT NULL DEFAULT 'ready', quote_json TEXT NOT NULL,
 order_id TEXT UNIQUE, capture_id TEXT UNIQUE, checkout_url TEXT,
 checkout_lock INTEGER NOT NULL DEFAULT 0, delivered_at INTEGER,
 failure_code TEXT
);
CREATE INDEX IF NOT EXISTS quotes_expiry ON quotes(expires_at);
CREATE TABLE IF NOT EXISTS quote_events (
 event_key TEXT PRIMARY KEY, quote_id TEXT NOT NULL, event TEXT NOT NULL, created_at INTEGER NOT NULL
);
