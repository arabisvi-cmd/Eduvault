-- EduVault Cloudflare D1 Database Schema
-- Run this schema to initialize your D1 database

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    full_name TEXT,
    institution TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

