-- Vault sections + folders (idempotent — safe to re-run).
-- If you only need documents.vault_section_id on an OLD documents table, run d1-migrate-documents-vault-section-id.sql once.
-- "duplicate column name: vault_section_id" on that file = column already exists; ignore.
-- Local:  npx wrangler d1 execute eduvault-db --local --file=./d1-migrate-vault-structure.sql
-- Remote: npx wrangler d1 execute eduvault-db --remote --file=./d1-migrate-vault-structure.sql

CREATE TABLE IF NOT EXISTS vault_sections (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vault_sections_institution ON vault_sections(institution_id);

CREATE TABLE IF NOT EXISTS folders (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    vault_section_id TEXT,
    parent_folder_id TEXT,
    name TEXT NOT NULL,
    path_label TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_folders_institution ON folders(institution_id);
CREATE INDEX IF NOT EXISTS idx_folders_vault_section ON folders(vault_section_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_folder_id);

-- Default library folders (inst-1) — matches INITIAL_FOLDERS in App.jsx
INSERT OR IGNORE INTO folders (id, institution_id, vault_section_id, parent_folder_id, name, path_label) VALUES
  ('folder-1', 'inst-1', NULL, NULL, 'Physics Lecture Slides', 'Grade 10 · Physics · Term 1'),
  ('folder-2', 'inst-1', NULL, NULL, 'Chemistry Lab Exercises', 'Grade 10 · Chemistry · Term 1'),
  ('folder-3', 'inst-1', NULL, NULL, 'Mathematics Problem Sets', 'Grade 11 · Mathematics · Term 1'),
  ('folder-4', 'inst-1', NULL, NULL, 'Administrative Circulars', 'St. Xavier · Admin · Term 1'),
  ('folder-5', 'inst-1', NULL, NULL, 'Term 1 Question Banks', 'Grade 10 · Physics · Term 1');
