-- EduVault Cloudflare D1 Database Schema
-- Run this schema to initialize your D1 database

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    full_name TEXT,
    institution TEXT,
    profile_image TEXT,
    user_type TEXT DEFAULT 'student',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Existing databases:
-- ALTER TABLE users ADD COLUMN profile_image TEXT;
-- ALTER TABLE users ADD COLUMN user_type TEXT DEFAULT 'student';

CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    institution TEXT,
    academic_year TEXT,
    class_grade TEXT,
    subject TEXT,
    timeline TEXT,
    file_type TEXT,
    file_size TEXT,
    owner TEXT,
    section TEXT,
    role TEXT,
    folder_id TEXT,
    vault_section_id TEXT,
    deleted_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_deleted_at ON documents(deleted_at);
CREATE INDEX IF NOT EXISTS idx_documents_vault_section ON documents(vault_section_id);

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
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- School roster: only emails listed here may register; user_type is assigned at signup (never self-selected).
CREATE TABLE IF NOT EXISTS user_directory (
    email TEXT PRIMARY KEY,
    user_type TEXT NOT NULL,
    institution TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_directory_type ON user_directory(user_type);

-- Example roster rows (adjust for your school):
-- INSERT OR IGNORE INTO user_directory (email, user_type, institution) VALUES
--   ('admin@school.edu', 'admin', 'inst-1'),
--   ('teacher@school.edu', 'teacher', 'inst-1'),
--   ('student@school.edu', 'student', 'inst-1'),
--   ('registrar@school.edu', 'non_teaching_staff', 'inst-1');

