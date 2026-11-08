-- Run once on D1 databases created before profile_image / user_type / user_directory.
-- Dashboard: D1 → eduvault-db → Console → paste → Execute
-- CLI (local dev):  npx wrangler d1 execute eduvault-db --local --file=./d1-migrate-existing.sql
-- CLI (remote):     npx wrangler d1 execute eduvault-db --remote --file=./d1-migrate-existing.sql
--
-- If a statement fails with "duplicate column name", that column already exists — skip that line.

ALTER TABLE users ADD COLUMN profile_image TEXT;
ALTER TABLE users ADD COLUMN user_type TEXT DEFAULT 'student';

CREATE TABLE IF NOT EXISTS user_directory (
    email TEXT PRIMARY KEY,
    user_type TEXT NOT NULL,
    institution TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_directory_type ON user_directory(user_type);
