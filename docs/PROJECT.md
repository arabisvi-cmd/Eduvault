# EduVault — Project Overview

**EduVault** (by PersonAI) is a secure digital workspace for academic documents. It centralizes class materials, administrative circulars, and term-based resources so schools can organize and find files by **institution, academic year, class, subject, and timeline**—not only by arbitrary folder names.

This document describes what the product is, its core concepts, and how the repository is built and run.

---

## What the project is about

### Problem

Educational institutions scatter files across email, shared drives, and ad hoc folders. Teachers, students, and staff need one place to publish, browse, and retrieve materials with context (which school, which grade, which term).

### Solution

EduVault provides:

- A **marketing / concept home** that explains the vision, an interactive filter demo, and an R&D roadmap.
- A **workspace** (drive-inspired UI) for browsing, uploading, folder organization, previews, search, and basic sharing flows.
- **Backends** that persist users and document metadata (file binaries and advanced RBAC are roadmap items).

### Current maturity

The UI is rich and includes demo seed data for documents and folders. **Document list/create** and **email/password auth** work against the Cloudflare D1 API when deployed (or via Pages Functions in production). **Supabase** is optional for auth and documents when `VITE_SUPABASE_*` env vars are set. Many workspace actions (move, rename, trash, starred, etc.) are **client-side** until later phases wire them to storage and policy engines.

---

## Core concepts

### Academic metadata (the “vault” model)

Every document is intended to sit in a **structured context**, not just a path string:

| Dimension | Purpose |
|-----------|---------|
| **Institution** | Multi-school / multi-tenant boundary (e.g. `inst-1`, `inst-2`). |
| **Academic year** | e.g. `2026-2027`. |
| **Class / grade** | e.g. `grade-10`, `grade-11`. |
| **Subject** | e.g. physics, mathematics, chemistry. |
| **Timeline** | Terms or phases (e.g. `term-1`, `term-2`). |

Additional fields used in the UI and schema include **file type**, **section**, **role visibility**, and optional **folder** membership.

Users filter the library by these dimensions (plus custom filters and search). Breadcrumbs on the home demo express the same hierarchy: institution → class → subject → term.

### Roles (vision vs. today)

The product vision includes **granular access**: teachers publish, administrators audit, students and parents view designated timelines. Demo content tags documents with roles such as `students`, `teaching_staff`, and `non_teaching_staff`. **Row-level policies and full RBAC are roadmap** (Phase 2); today, API document listing is largely open where implemented.

### Two surfaces

1. **Home** (`currentView === 'home'`) — hero, interactive workspace preview, R&D roadmap.
2. **Workspace** (`currentView === 'workspace'`) — EduVault Drive: sidebar nav (home, classes, my vault, shared, recent, starred, trash, storage), grid/list, folders, modals for upload/move/share/rename.

Auth views: **login** and **signup**.

### Folders vs. metadata

**Folders** (e.g. “Physics Lecture Slides”) group files in the drive UI. **Metadata dimensions** classify files for institution-wide discovery. Both can apply to the same document (`folder_id` in D1 schema).

### R&D roadmap (product direction)

Phases described in the app (home `#roadmap`):

1. **Architecture & multi-tenancy** — isolated tenants, metadata nodes, folder schemas (in progress in planning/UI).
2. **Identity & granular access** — RBAC, SSO, expiring download tokens.
3. **Distributed file store & CDN** — object storage, edge caching, mobile optimization.
4. **AI auto-categorization & search** — OCR, auto-tagging, natural-language query.

---

## How we build it

### Tech stack

| Layer | Choice |
|-------|--------|
| UI | React 19, Vite 8, Lucide icons |
| Styling | Component CSS (`App.css`, `index.css`) |
| Tests | Vitest, Testing Library (`src/App.test.jsx`) |
| Lint | Oxlint |
| Primary API (deployed) | Cloudflare Pages Functions — `functions/api/[[route]].js` |
| Primary DB (deployed) | Cloudflare D1 (SQLite at the edge) — schema in `schema.sql` |
| Optional backend | Supabase (Auth + Postgres + RLS) — schema in `supabase/schema.sql`, client in `src/lib/supabase.js` |

### Repository layout

```
src/
  App.jsx          # Main UI: home, workspace, auth, demo data, integrations
  lib/
    api.js         # REST client for /api (D1 backend)
    supabase.js    # Optional Supabase client
functions/
  api/[[route]].js # D1: GET/POST documents, auth signup/login
schema.sql         # D1 tables: users, documents
supabase/schema.sql# Postgres: profiles, documents + RLS
docs/PROJECT.md    # This file
CLOUDFLARE_D1_SETUP.md  # Step-by-step Cloudflare deploy
```

### Dual backend behavior

The app **does not require both** backends:

- **Cloudflare path (default for production):** `src/lib/api.js` calls `/api/...`. Login stores user JSON in `localStorage` (`eduvault_user`). On load, documents are fetched from D1 when the API succeeds; otherwise demo `INITIAL_DOCUMENTS` remain.
- **Supabase path:** If `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set (and not placeholders), `App.jsx` also uses Supabase Auth and `documents` table for session sync and inserts.

Auth and upload handlers try D1/API first where coded, then Supabase when configured. Design intent: **edge-first hosting on Cloudflare** with **optional Supabase** for teams that prefer managed Postgres/auth.

### API (Cloudflare)

| Method | Path | Behavior |
|--------|------|----------|
| GET | `/api/documents` | List documents (newest first, limit 100) |
| POST | `/api/documents` | Insert metadata row |
| POST | `/api/auth/signup` | Register user (PBKDF2 password hash + salt in D1) |
| POST | `/api/auth/login` | Verify password, return user profile |

CORS is enabled for browser calls. Password hashing uses Web Crypto PBKDF2 in the Worker.

### Local development

```bash
npm install
npm run dev      # Vite dev server (UI only; /api needs Pages + D1 or a proxy)
npm run test     # Vitest
npm run build    # Production bundle → dist/
npm run lint     # Oxlint
```

Without Cloudflare Pages locally, `/api` routes may be unavailable; the UI falls back to seeded documents and local auth simulation where implemented.

### Deployment

- **Build:** `npm run build` → static `dist/` (see `wrangler.toml` assets).
- **Hosting:** Cloudflare Pages with D1 binding `DB` (see `CLOUDFLARE_D1_SETUP.md` for database creation and schema execution).
- **CI:** GitHub Actions (`.github/workflows/ci.yml`) runs `npm ci`, `npm run test`, and `npm run build` on push/PR to `main`.

### Environment variables (Supabase, optional)

```env
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

Run `supabase/schema.sql` in the Supabase SQL editor when using that path.

---

## Design principles (implementation)

1. **Metadata-first discovery** — filters and breadcrumbs reflect school structure, not only folder trees.
2. **Progressive persistence** — ship a credible UI with demo data; persist documents and auth on the chosen backend.
3. **Edge-friendly ops** — D1 + Pages Functions for low-cost, always-on reads/writes within free-tier limits (see Cloudflare guide).
4. **Single-app prototype** — most product logic lives in `App.jsx` for fast iteration; split into modules as the codebase grows.

---

## Related documentation

- [CLOUDFLARE_D1_SETUP.md](../CLOUDFLARE_D1_SETUP.md) — create D1, run `schema.sql`, deploy Pages.
- [supabase/schema.sql](../supabase/schema.sql) — profiles, documents, RLS policies.
- Live copy and roadmap text — home view in `src/App.jsx` (sections `#concept`, `#workspace`, `#roadmap`).

---

*Last updated to match the repository layout as of the EduVault React + Vite application.*
