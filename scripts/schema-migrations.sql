ALTER TABLE editor_keys ADD COLUMN sort_order INTEGER DEFAULT 0;

UPDATE editor_keys SET sort_order = (
    SELECT COUNT(*) FROM editor_keys AS e2
    WHERE (CASE e2.role
             WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 WHEN 'seniormod' THEN 2
             WHEN 'mod' THEN 3 WHEN 'dev' THEN 4 ELSE 5 END,
           e2.id)
        < (CASE editor_keys.role
             WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 WHEN 'seniormod' THEN 2
             WHEN 'mod' THEN 3 WHEN 'dev' THEN 4 ELSE 5 END,
           editor_keys.id)
);

CREATE TABLE IF NOT EXISTS recent_changes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    change TEXT NOT NULL,
    sort_order INTEGER
);

ALTER TABLE levels ADD COLUMN frameCounter TEXT;

ALTER TABLE levels ADD COLUMN benchmark INTEGER DEFAULT 0;

ALTER TABLE pending ADD COLUMN indefinite INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS auth_throttle (
    ip TEXT PRIMARY KEY,
    fails INTEGER DEFAULT 0,
    window_start INTEGER DEFAULT 0,
    blocked_until INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, value TEXT);

CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    editor_name TEXT,
    action TEXT,
    target TEXT,
    details TEXT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    taken_at TEXT NOT NULL,
    day TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'auto',
    label TEXT DEFAULT '',
    format TEXT NOT NULL DEFAULT 'gzip',
    levels_count INTEGER DEFAULT 0,
    bytes INTEGER DEFAULT 0,
    data TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_snapshots_day ON snapshots(day);

CREATE INDEX IF NOT EXISTS idx_snapshots_taken_at ON snapshots(taken_at);

ALTER TABLE audit_log ADD COLUMN undo_data TEXT;

ALTER TABLE audit_log ADD COLUMN undone_at TEXT;

CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
