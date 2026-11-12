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

## 3b. Upgrade an existing `eduvault-db` (missing `user_type` / roster)

If signup fails with **`table users has no column named user_type`**, the database was created from an older schema. Run [d1-migrate-existing.sql](./d1-migrate-existing.sql) once:

**D1 Console:** Storage & Databases → **eduvault-db** → **Console** → paste the file → **Execute**.

**Wrangler CLI (local D1 while `wrangler dev`):**

```bash
npx wrangler d1 execute eduvault-db --local --file=./d1-migrate-existing.sql
```

**Wrangler CLI (production D1):**

```bash
npx wrangler d1 execute eduvault-db --remote --file=./d1-migrate-existing.sql
```

Then add your email to the roster before sign-up:

```sql
INSERT OR IGNORE INTO user_directory (email, user_type, institution)
VALUES ('you@school.edu', 'teacher', 'inst-1');
```

---

## 3c. Vault sections & folders (workspace structure)

After the base schema, run [d1-migrate-vault-structure.sql](./d1-migrate-vault-structure.sql) once (local and remote), same wrangler `d1 execute` commands as in §3b.

This adds `vault_sections`, `folders`, and default **inst-1** library folders (safe to re-run).

On an **older** `documents` table without `vault_section_id`, also run once:

```bash
npx wrangler d1 execute eduvault-db --local --file=./d1-migrate-documents-vault-section-id.sql
```

If that fails with **duplicate column name: vault_section_id**, the column is already there — you are done.

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

## 5. D1 binding (Workers Git deploy — `npx wrangler deploy`)

This repo uses a **Worker + static assets** deploy (`wrangler.toml`), not Pages-only static.

D1 is declared in `wrangler.toml` as binding **`DB`** → `eduvault-db`. After you connect Git:

1. Open **Workers & Pages** → **eduvault** → **Settings** → **Bindings** (or **Variables and secrets**).
2. Confirm **D1** binding **`DB`** points at **`eduvault-db`** (same database id as in `wrangler.toml` if you use dashboard overrides).
3. **Build command:** `npm run build`  
   **Deploy command:** `npx wrangler deploy`  
4. Redeploy. The Worker (`worker/index.js`) serves **`/api/*`** (auth + documents); everything else is the Vite SPA from `dist/`.

**Verify signup:** Add the email to the school roster first, then sign up:

```sql
INSERT OR IGNORE INTO user_directory (email, user_type, institution)
VALUES ('test@school.edu', 'teacher', 'inst-1');
```

```bash
curl -s -X POST 'https://<your-worker-url>/api/auth/signup' \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@school.edu","password":"pass123","full_name":"Test","institution":"inst-1"}'
```

Expect `success: true` and `user.user_type` of `teacher`. Check `SELECT * FROM users;`.

Emails **not** in `user_directory` get **403** at signup — users never pick their own type; the roster assigns `admin`, `teacher`, `student`, or `non_teaching_staff`.

### Optional: Cloudflare Pages (instead of Worker deploy)

If you use **Pages** with the `functions/` folder only (no custom `wrangler deploy`), bind D1 under **Settings → Functions → D1 database bindings** with variable name **`DB`**, then redeploy.

