# EduVault Cloudflare D1 Deployment Guide

This project is now fully configured to run on **Cloudflare Pages** backed by **Cloudflare D1** (Serverless SQLite edge database) — 100% free with 0 sleep time and up to 5M reads / 100k writes daily.

---

## 1. Create your Free Cloudflare Account
If you haven't already:
1. Go to [https://dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up)
2. Sign in to your dashboard.

---

## 2. Create the Cloudflare D1 Database
In the Cloudflare dashboard:
1. Go to **Storage & Databases** → **D1 SQL Database** in the left sidebar.
2. Click **Create Database**.
3. Name it `eduvault-db` and choose your preferred primary region.
4. Click **Create**.

---

## 3. Run the Schema in your Database
1. Inside your newly created `eduvault-db`, click on the **Console** tab.
2. Open [schema.sql](./schema.sql) from this repository, copy its contents, paste them into the Console, and click **Execute**:
   ```sql
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
   ```

---

## 4. Deploy EduVault to Cloudflare Pages
1. Go to **Workers & Pages** in your Cloudflare sidebar.
2. Click **Create Application** → select the **Pages** tab → **Connect to Git**.
3. Select your GitHub repository for EduVault (`aravindryali/EduVault`).
4. Configure Build settings:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. Click **Save and Deploy**.

---

## 5. Bind your D1 Database to your Pages Project
Once the initial deployment completes:
1. In your Cloudflare Pages project, go to **Settings** → **Functions**.
2. Scroll down to **D1 Database Bindings**.
3. Click **Add binding**:
   - **Variable name**: `DB`  *(Must be uppercase `DB`)*
   - **D1 database**: Select `eduvault-db`
4. Click **Save**.
5. Trigger a redeploy (or push any commit to `main`).

Your application is now live on the public web with an edge-replicated database and authentication, incurring **$0 in recurring costs**!

