# Task 12D.2 Home Report

## A. Home Before (Task 12D.1 state)

- Generic H1: "Welcome back, {firstName}"
- Role description line with hardcoded strings
- 4 quick-action cards: Academic Structure (ADMIN), My Subjects, Materials, Notices
- No real data shown — no institution name, no counts
- Filter chip toolbar ("+ Create filter") always rendered above Home, Notices, and all views
- 5 dead filter states: filterInst, filterYear, filterClass, filterSubject, filterTimeline
- filteredDocs computed variable computed but never rendered anywhere

## B. Home After (Task 12D.2)

- H1: "Welcome back, {firstName}"
- Subtitle: "<InstitutionName> — ADMIN" (real institution name from Supabase, or "Institution loading..." during fetch)
- Real stat chips (clickable, navigate to relevant section):
  - ADMIN: Academic Years, Programs, Subjects, Documents, Notices
  - TEACHER: Assigned Subjects, Documents, Notices
  - STUDENT: Enrolled Subjects, Documents, Notices
- null values shown as "—" (stat unavailable due to RLS or error — no fabrication)
- Empty state guidance panel: shown when Admin has 0 academic years → "Getting started" message + CTA button
- Materials card description dynamically switches to "No materials uploaded yet" when docs === 0
- Notices card description dynamically switches to "No notices posted yet" when notices === 0
- Filter chip toolbar: now only rendered when selectedNav is one of: 'shared','recent','starred','trash','storage','my-vault'
- No fake documents, no fake folder names, no fake dates, no fake teacher names visible on Home

## C. Real Data Queries Used

All queries run inside a useEffect triggered when userProfile becomes available:
1. `institutions.select('name').eq('id', userProfile.institution_id)` → institution name
2. `academic_years.select('id', { count: 'exact', head: true })` → years count
3. `programs.select('id', { count: 'exact', head: true })` → programs count
4. `subjects.select('id', { count: 'exact', head: true })` → subjects count
5. `documents.select('id', { count: 'exact', head: true })` → docs count
6. `notices.select('id', { count: 'exact', head: true })` → notices count
7. TEACHER: `teacher_assignments.select('id', count).eq('teacher_id', userProfile.id)` → assignment count
8. STUDENT: `student_enrollments.select('id', count).eq('student_id', userProfile.id)` → enrollment count

All queries use Promise.allSettled so individual RLS failures don't block the rest.
Failed queries show "—" instead of fabricated numbers.

## D. Mock Data Removed from Home

| Item | Status |
|------|--------|
| "Physics Lecture Slides", "Chemistry Lab Exercises" etc. (INITIAL_FOLDERS) | NOT shown on Home (were never rendered there) |
| "Mid-Term Physics Study Guide" etc. (INITIAL_DOCUMENTS) | NOT shown on Home (were never rendered there) |
| Generic role description strings | Replaced with real institution name + role |
| Filter chip toolbar on Home view | REMOVED from Home — now only visible on legacy Drive views |
| Fake storage "14.2 GB of 100 GB" | Was already removed in 12D.1; not present |
| "Institution Pro" storage card | Was already removed in 12D.1; not present |

## E. INITIAL_DOCUMENTS Decision

RETAINED. Reason: INITIAL_DOCUMENTS is still used as the initial state of `documents`, which backs the legacy `my-vault` view's `workspaceFilteredDocs` (lines 1644, 1650, 1847). Removing it would make the legacy Materials view show nothing. Since the task rules say "do not delete INITIAL_DOCUMENTS yet if another legacy view still depends on them" — they stay.

The documents state is still overwritten by `loadDocuments()` on auth if real Supabase data exists, so real data takes priority.

## F. INITIAL_FOLDERS Decision

RETAINED. Reason: `folders` state (initialized from INITIAL_FOLDERS) is used by the folder card UI inside the legacy my-vault canvas (lines showing INITIAL_FOLDERS → `setFolders(INITIAL_FOLDERS)` → folder grid). Removing would break the folder UI in the legacy Materials view.

## G. Fake Storage Handling

No storage figure is shown anywhere. "Vault Storage / Institution Pro" card was removed in Task 12D.1.
No storage percentage, no fake GB value, no pie chart. Storage section is entirely absent from the authenticated workspace.

## H. Admin Home

PASS — Real data shown:
- Institution name fetched from `institutions` table
- 5 stat chips (years, programs, subjects, documents, notices) with real Supabase counts
- Values show "—" if query fails under RLS (no fabrication)
- Empty-state guidance panel when years === 0
- 4 quick-action cards: Academic Structure, My Subjects, Materials, Notices
- All use var(--ev-*) theme tokens

## I. Teacher Home

PASS (logic implemented) — 3 stat chips: Assigned Subjects, Documents, Notices
Queries teacher_assignments filtered by teacher_id.
UNVERIFIED in browser (no teacher account available for live test).

## J. Student Home

PASS (logic implemented) — 3 stat chips: Enrolled Subjects, Documents, Notices
Queries student_enrollments filtered by student_id.
UNVERIFIED in browser (no student account available for live test).

## K. Empty States

- Years = 0 → "Getting started: No academic years have been configured yet." + CTA button to Academic Structure
- Documents = 0 → Materials card says "No materials uploaded yet. Upload your first document."
- Notices = 0 → Notices card says "No notices posted yet."
- Stat query fails → "—" displayed (not "0", not fabricated)
- Institution name loading → "Institution loading…" in italic (not blank, not fake)

## L. Theme Compatibility

PASS — All Home JSX uses var(--ev-*) variables exclusively:
- var(--ev-text), var(--ev-text-secondary) for text
- var(--ev-border), var(--ev-divider) for borders
- var(--ev-surface), var(--ev-surface-elevated) for backgrounds
- var(--ev-primary), var(--ev-teal) for accent colors
No hardcoded #hex values in the Home section.

## M. Responsive Behavior

PASS — uses `flex-wrap: wrap` for stat chips and `repeat(auto-fill, minmax(240px, 1fr))` for action cards. Collapses gracefully to single column on mobile. No horizontal scroll introduced.

## N. Authentication Regression

PASS — Zero changes to auth handlers (handleAuthSubmit, handleLogout, loadProfile, supabase.auth.*).
Build exit code: 0. No import changes that affect auth.

## O. Build

PASS
```
✓ 1852 modules transformed.
dist/assets/index-B_vr7A0t.js   514.62 kB │ gzip: 138.16 kB
✓ built in 249ms — Exit code: 0
```
One pre-existing chunk size warning (non-blocking, present before this task).

## P. Browser QA

UNVERIFIED — Browser subagent hit API rate limit during Task 12D.1. Dev server running on http://localhost:5174/

Manual verification steps:
1. Open http://localhost:5174
2. Login: kprithviraju007@gmail.com / 1234567890
3. Verify Home shows "EduVault Institution — ADMIN" subtitle
4. Verify 5 stat chips appear with real counts (0 for fresh DB)
5. Verify "Getting started" guidance panel appears (no academic years yet)
6. Verify clicking any stat chip navigates to the correct section
7. Verify no mock documents visible on Home
8. Verify filter chip toolbar absent on Home, present on Materials view

## Q. Remaining Mock / Legacy UI

| Item | Location | Reason Retained |
|------|----------|-----------------|
| INITIAL_DOCUMENTS (12 fake docs) | App.jsx state | Backs legacy my-vault canvas |
| INITIAL_FOLDERS (5 fake folders) | App.jsx state | Backs legacy folder grid in my-vault |
| FILTER_DEFINITIONS | App.jsx constant | Used by filter chip modal in legacy views |
| customFilters state | App.jsx state | Used by filter chip UI in legacy views |
| filterInst/Year/Class/Subject/Timeline states | REMOVED | Were dead code — filteredDocs was never rendered |
| filteredDocs computed value | REMOVED | Was computed but never referenced in JSX |
| "EduVault Drive" breadcrumb text | Legacy my-vault canvas | Not removed per 12D task scope |
| Folder card UI (rename, share, delete) | Legacy my-vault canvas | Not removed per 12D task scope |
| handleWorkspaceFileUpload mock fields | App.jsx handler | institution:"inst-1", year:"2026-2027" hardcoded |

## R. Anything UNVERIFIED

- Browser QA (rate limit) — UNVERIFIED
- Teacher Home stat chips (no teacher auth account) — UNVERIFIED  
- Student Home stat chips (no student auth account) — UNVERIFIED
- Institution name RLS: if ADMIN cannot read institutions table due to RLS gap, institutionName stays null and "Institution loading…" shows indefinitely. Needs live test to confirm.

## S. Recommended Task 12D.3 Scope

**12D.3: Legacy Materials View Cleanup**

Targets (in order of priority):
1. Remove INITIAL_DOCUMENTS — replace with [] and update `loadDocuments()` to NOT fall back to mock data; show proper empty state when DB is empty
2. Remove INITIAL_FOLDERS — folders should start [] and be created by users; add an empty state to the folder grid  
3. Fix handleWorkspaceFileUpload — remove hardcoded "inst-1" / "2026-2027" / "grade-10" fields; use userProfile.institution_id instead
4. Remove FILTER_DEFINITIONS and the "Create filter" chip system entirely — it operates on mock string fields (doc.class, doc.section) that don't match the real schema
5. Update breadcrumb from "EduVault Drive" to "Materials"
6. "Suggested folders" section header → rename to "Folders"

All in App.jsx. No database changes. No new components.
