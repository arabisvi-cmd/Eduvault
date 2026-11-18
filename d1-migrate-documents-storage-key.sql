-- R2 object pointer on documents (PR6).
ALTER TABLE documents ADD COLUMN storage_key TEXT;
ALTER TABLE documents ADD COLUMN content_type TEXT;