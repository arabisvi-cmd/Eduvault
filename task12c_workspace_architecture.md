# EduVault Task 12C: Workspace Architecture Mapping & Strategy
## Analysis Report (NO CODE CHANGES)

### A. Executive Summary
The EduVault frontend currently sits in a transitional state. The backend (Tasks 1–11) features a robust, multi-tenant academic domain model (Institutions, Academic Years, Programs, Terms, Subjects, Document Versions). However, the authenticated workspace (Task 12B) is still fundamentally a monolithic Google Drive clone (`App.jsx`), heavily reliant on generic file/folder concepts (`INITIAL_DOCUMENTS`, `.gdrive-*` classes). While visual enhancements and the real Supabase Auth have been wired up, the core navigation, state management, and user mental model remain misaligned with a true academic workspace. 

### B. Current Frontend Architecture
- **Monolithic Component:** The workspace is entirely driven by `App.jsx` (~2200 lines). It handles routing (`currentView`, `selectedNav`), mock state initialization, and component rendering.
- **Styling:** CSS variables (`index.css`) govern theming (Light/Dark/AMOLED), but many structural CSS classes carry the `gdrive-` prefix, reflecting their origin.
- **Real Integration:** Supabase Auth is correctly integrated. `loadDocuments()` fetches real documents from the DB but forcefully maps them to a generic file format (e.g. `doc.year || '2026-2027'`).
- **Academic Components:** `AdminAcademicManager.jsx`, `SubjectVault.jsx`, and `MySubjects.jsx` exist but are often constrained by the generic file-explorer paradigm dictating the surrounding UI.

### C. Google Drive Legacy Inventory
The frontend is saturated with Drive concepts that conflict with a structured academic environment:
- **`gdrive-*` classes:** Pervasive across the layout (`gdrive-layout`, `gdrive-sidebar`, `gdrive-content-canvas`, `gdrive-top-bar`).
- **`INITIAL_DOCUMENTS` & `INITIAL_FOLDERS`:** Hardcoded fallback datasets for files and folders.
- **Left Sidebar Navigation:** "Shared with me", "Recent", "Starred", "Trash", "Storage". These are generic cloud storage concepts, not academic concepts.
- **Fake Storage Metrics:** The "Vault Storage" card displays arbitrary UI logic (e.g., "Institution Pro").
- **Generic Folders:** The UI renders "Suggested folders" (e.g., "Physics Lecture Slides"), which bypass the database's strict Institution → Program → Term → Subject hierarchy.

*Verdict: These concepts must be entirely phased out in favor of structural academic boundaries.*

### D. Real EduVault Architecture Inventory (Tasks 1–11)
The Supabase schema enforces a strict hierarchy:
1. `institutions`: The root tenant.
2. `academic_years`: E.g., 2026-2027.
3. `programs`: E.g., High School Diploma, B.Sc. Computer Science.
4. `terms`: E.g., Fall Semester, Term 1.
5. `subjects`: The core academic unit (e.g., Physics 101).
6. `users` / Roles: `ADMIN`, `TEACHER`, `STUDENT`.
7. `teacher_assignments` / `student_enrollments`: Connects users to subjects.
8. `folders` / `documents` / `document_versions`: Content belonging to a specific `subject` and `term`.

### E. Current Role Model
- **ADMIN:** Can view and manage the "Academic Structure" (Institutions, Years, Programs).
- **TEACHER:** Assigned to specific subjects. Can upload and manage materials.
- **STUDENT:** Enrolled in subjects. Can view released materials.

**Institutional Leadership Extension:**
Roles like "Principal" or "Dean" should *not* be hardcoded as database ENUMs. Instead, EduVault should adopt:
`Database Role (e.g., ADMIN)` + `Organizational Title (e.g., "Dean of Science")` + `Scope (e.g., specific Program UUID)`. This allows granular, extensible permissions without cluttering the RLS constraints.

### F. Institutional Hierarchy Analysis
The current model (`Institution` → `Program` → `Term` → `Subject`) is sufficient for small to medium schools. 
However, for universities or complex school districts, a missing layer exists: **Departments / Faculties / Campuses**. 
Currently, scaling requires treating "Programs" as the primary grouping mechanism. Future extensions will require a `departments` table bridging `institutions` and `programs`, allowing Department Heads to scope their administrative oversight.

### G. Class/Subject Complexity Analysis
The current schema links students and teachers directly to `subjects` via enrollments/assignments. 
- **Works Now:** Basic subject enrollment (e.g., 30 students in "Math 101").
- **Future Complexity:** It lacks the concept of a "Class Group" or "Section" (e.g., "Year 10 Section A"). Currently, to have two different physics classes, you must create two separate `subjects`. A future `classes` or `sections` table will be required to group enrollments under a single shared `subject` curriculum.

### H. Document/Vault Architecture
**Legacy Drive Model:** Drive → Folder → File (Ad-hoc, unstructured).
**Real EduVault Model:** Program → Term → Subject → Material (Structured, curriculum-bound).

Documents must be inherently tied to their academic context. A "Folder" should merely be an organizational unit *inside* a Subject's Vault, not a top-level entity. The UI must pivot to enforce this: users navigate to a Subject first, then view its materials.

### I. Current Navigation Mapping

| CURRENT NAVIGATION | IMPLEMENTATION | REAL / MOCK | DECISION | FUTURE CONCEPT | ROLE |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Home | Hardcoded Cards | Real Logic | Keep (Redesign) | Dashboard | ALL |
| Academic Structure | `AdminAcademicManager` | Real DB | Keep | Admin Hub | ADMIN |
| Classes & Subjects | `MySubjects` / UI | Real DB | Keep | My Classes | TEACHER/STUDENT |
| My Vault | Generic file list | Mixed | Replace | Subject Materials | ALL |
| Shared with me | Legacy Prototype | Mock | Remove | N/A | ALL |
| Recent | Legacy Prototype | Mock | Remove | Activity Feed | ALL |
| Starred | Legacy Prototype | Mock | Remove | Bookmarks | ALL |
| Trash | Legacy Prototype | Mock | Remove | Archive | ADMIN/TEACHER |
| Storage | Legacy Prototype | Mock | Remove | Admin Settings | ADMIN |

### J. Proposed EduVault Navigation
1. **Dashboard (Home):** Personalized feed, upcoming deadlines, recent subject activity.
2. **Academic Hub (Admin):** Institution, Programs, Terms, Users.
3. **My Subjects (Teacher/Student):** Grid of assigned/enrolled subjects.
4. **Subject Workspace:** (Clicked from My Subjects) Contains Syllabus, Materials (Vault), Notices, and Participants.

### K. Admin Information Architecture
- **Current:** Basic CRUD for Academic Structure.
- **Proposed:** A dedicated "Institution Settings" interface separated from academic curriculum management. Comprehensive view of User Management (Teachers/Students).

### L. Teacher Information Architecture
- **Current:** Views all generic documents. 
- **Proposed:** Navigation flows from `Teacher` → `Assigned Subjects` → `Subject Vault`. The teacher prepares content, sets release dates (Task 11), and publishes.

### M. Student Information Architecture
- **Current:** Views all generic documents.
- **Proposed:** `Student` → `Enrolled Subjects` → `Available Materials`. UI rigidly enforces RLS release dates so upcoming materials remain invisible.

### N. Home/Dashboard Concept
- **ADMIN:** System health, active terms, total enrollments, pending teacher assignments.
- **TEACHER:** Quick-links to active subjects, pending material releases, recent notices.
- **STUDENT:** Today's schedule (if applicable), newly unlocked materials, active subject quick-links.

### O. Mock Data Inventory
1. `INITIAL_FOLDERS` (App.jsx) - Mock array. **Remove.**
2. `INITIAL_DOCUMENTS` (App.jsx) - Mock array. **Remove.** (Wait for full Supabase hydration).
3. "Vault Storage" usage stats - Hardcoded JSX. **Remove.**
4. "Shared with me", "Starred", etc. - Hardcoded sidebar buttons. **Remove.**

### P. Component Responsibility Map
- `App.jsx`: Currently handles *everything*. **Must be split** into `AppRouter`, `AuthProvider`, `AdminLayout`, `StudentLayout`, `TeacherLayout`.
- `GlobalSearch.jsx`: Good standalone component. Keep and refine DB queries.
- `AdminAcademicManager.jsx`: Keep, but break into sub-components (`TermManager`, `ProgramManager`).

### Q. Architecture Risks
1. **App.jsx Monolith (CRITICAL):** State and routing are tangled. Prevents clean role-based architecture.
2. **Mock Data Coupling (HIGH):** The UI falls back to `INITIAL_DOCUMENTS` if Supabase fails, risking data leakage or UX confusion.
3. **Drive Terminology (MEDIUM):** Confuses the user's mental model (e.g., "My Vault" vs "My Subjects").
4. **Future Class/Subject Complexity (MEDIUM):** The lack of a `sections` table will bottleneck large deployments soon.

### R. Recommended Migration Strategy
- **Phase 1 (De-clutter):** Delete all legacy Google Drive sidebar links ("Shared", "Recent", "Storage"). Strip mock arrays (`INITIAL_DOCUMENTS`).
- **Phase 2 (Router Refactor):** Break `App.jsx` into a standard React Router setup. Implement dedicated layouts per role (`AdminLayout`, `AcademicLayout`).
- **Phase 3 (Navigation Overhaul):** Replace generic "My Vault" with a strict "My Subjects" flow. Users click a Subject to see its specific documents.
- **Phase 4 (Subject Workspace):** Refine `SubjectVault.jsx` to handle the actual document rendering, respecting the `document_versions` and release controls.
- **Phase 5 (Dashboard):** Implement customized Home dashboards for Admin, Teacher, and Student querying real metrics.

### S. What Must NOT Change
- Task 1–11 Database Schema.
- Supabase Authentication flow.
- RLS Policies.
- The core CSS variables (Light/Dark mode tokens).

### T. What Should Eventually Be Replaced
- The entirety of the `.gdrive-*` layout wrappers.
- The concept of a global "File Explorer" (files must belong to subjects).

### U. Proposed Task 12D Scope
**Task 12D: The Great De-clutter.**
Target `App.jsx` and strip out all mock data, legacy Google Drive sidebar buttons, and fake storage metrics. Implement a strict React Router setup to replace the `currentView` manual state management, laying the concrete foundation for the true Academic Workspace.
