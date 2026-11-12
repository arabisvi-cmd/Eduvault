-- Soft-delete support for workspace trash (PR2).
ALTER TABLE documents ADD COLUMN deleted_at DATETIME;

CREATE INDEX IF NOT EXISTS idx_documents_deleted_at ON documents(deleted_at);
