-- Explicit file/folder/section ACL (PR5).
CREATE TABLE IF NOT EXISTS resource_acl (
    id TEXT PRIMARY KEY,
    resource_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    principal_type TEXT NOT NULL,
    principal_value TEXT NOT NULL,
    permission TEXT NOT NULL DEFAULT 'read'
);

CREATE INDEX IF NOT EXISTS idx_resource_acl_resource
  ON resource_acl(resource_type, resource_id);