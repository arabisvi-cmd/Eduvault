-- One-time: add vault_section_id to an older documents table (from schema before vault structure).
-- Skip if execute fails with "duplicate column name: vault_section_id" (already applied).
-- Run after d1-migrate-vault-structure.sql on DBs that were created without vault_section_id in CREATE TABLE.

ALTER TABLE documents ADD COLUMN vault_section_id TEXT;
CREATE INDEX IF NOT EXISTS idx_documents_vault_section ON documents(vault_section_id);
