# EduVault — Registration, Onboarding & Login Guide

A non-technical, step-by-step guide for Institutional Administrators, Teachers, and Students.

---

## The Core Concept: Account Access vs. Academic Access

Before using EduVault, it is essential to understand one golden rule:

> **Account Access** (authentication) and **Academic Access** (subject assignment/enrollment) are two completely separate steps.

1. **Account Access**: Being able to log into EduVault with your verified email and password.
2. **Academic Access**: Having actual subjects, classes, and materials visible on your dashboard once you log in.

**What this means in practice:**
* A teacher can log in successfully, but will see **"No subjects assigned yet"** until an administrator assigns them to specific subjects in the Academic Setup.
* A student can log in successfully, but will see **"No enrolled subjects found"** until an administrator enrolls them into classes.
* Seeing an empty subjects screen is **not** a login failure or an account error — it simply means academic scheduling has not yet taken place.

---

## 1. Administrator Guide

As an Institutional Administrator, you control account creation and academic assignments. Institutional users (Teachers and Students) cannot self-register public accounts; they must be provisioned by you.

### How to Log In
1. Open EduVault in your browser.
2. Click **Enter EduVault** or click **Log In** in the top navigation header.
3. Enter your administrator email address and password.
4. Click **Log In**. You will enter the Administrator Workspace.

### What Information You Need Before Inviting Users
To provision staff or students, you only need:
* **Full Name** (e.g., `Dr. Jane Doe` or `Alex Smith`)
* **Institutional Email Address** (e.g., `jane.doe@school.edu`)
* **Role**: Select either **Teacher** or **Student**.

*(Note: You never need to supply an institution ID; EduVault automatically assigns your institution to all users you create.)*

### How to Invite a Teacher or Student
1. In the left navigation sidebar of the workspace, click **People**.
2. To invite a teacher, stay on the **Teachers** tab and click **Invite Teacher**.
3. To invite a student, switch to the **Students** tab and click **Invite Student**.
4. A secure modal dialog will open. Enter the person's **Full Name** and **Email Address**.
5. Click **Send Invitation**.
6. EduVault immediately creates their authenticated institutional identity and registers their user profile.

### What the Invited Person Receives
* The invited person receives an official onboarding email from Supabase/EduVault containing an **Accept Invitation / Set Password** link.
* When they click the link, EduVault opens directly into the **Set Account Password** screen, allowing them to establish their password.

### What Admin Must Do After Onboarding
Creating an account gives the person access to log in. You must now grant them **Academic Access**:

#### To Assign Subjects to a Teacher:
1. In the **People** hub, locate the teacher in the roster.
2. Click **Assign Subjects** next to their name.
3. In the assignment modal, select the **Academic Year**, **Program**, **Term**, and **Subject**.
4. Click **Save Assignment**. The teacher can now view and manage curricular materials for that subject.

#### To Enroll a Student into a Subject:
1. In the **People** hub, navigate to the **Students** tab.
2. Locate the student and click **Enroll in Subject**.
3. Select the target **Academic Year**, **Program**, **Term**, and **Subject**.
4. Click **Save Enrollment**. The student can now access published materials for that subject.

### How to Verify a User is Ready
* In **People & Academic Assignments**, check the user's row:
  * **Status**: Displays **Active**.
  * **Assignments / Enrollments**: Displays the count of active subjects (e.g., "3 subjects assigned").
  * If the count is 0, the user can log in but will see an empty workspace until assigned.

---

## 2. Teacher Guide

Welcome to EduVault. As a faculty member, your account is provisioned directly by your institution's administrator.

### Step 1: How to Receive Your Invitation
1. Check your institutional email inbox for an email with the subject: **"You have been invited to EduVault"**.
2. Open the email and click the **Accept Invitation** link.
3. If you do not see the email, check your spam/junk folder. If it is still missing, ask your institution administrator to verify your email spelling or re-issue the invitation.

### Step 2: How to Complete Account Setup (Set Your Password)
1. Clicking the link in the email opens EduVault directly to the **Set Account Password** screen.
2. Enter a secure password (minimum 8 characters) and confirm it.
3. Click **Save Password & Enter EduVault**.
4. You will immediately enter your personal EduVault workspace.

### Step 3: Logging In in the Future
1. Open the EduVault website.
2. Click **Log In** in the top navigation bar.
3. Enter your institutional email address and your password.
4. Click **Log In**.

### Troubleshooting & FAQ

#### What if login says "Invalid login credentials"?
* **First Time Signing In?**: If your administrator recently invited you, you must establish a password before logging in. On the login screen, click **"First time signing in or forgot password?"**, enter your email, and click **Send Setup / Reset Link**. Follow the link sent to your inbox to establish your password.
* **Typo in Password**: Check caps lock and re-enter your password.
* **Email Mismatch**: Ensure you are using your institutional email address rather than a personal email.

#### What if login works, but no subjects appear?
* This means your **Account Access** is working, but your administrator has not yet assigned any subjects to you.
* You will see the message: **"No subjects assigned yet. Once an administrator assigns subjects to you, they will appear here."**
* Contact your administrator or department chair to request your subject assignments in **People & Academic Assignments**.

#### How to access My Subjects
1. In the left navigation sidebar, click **My Subjects**.
2. A grid of your assigned subjects will appear (grouped by Academic Year and Term).
3. Click any subject card (or click **Open Vault**) to enter the **Subject Vault**.

#### How to access the Subject Vault & Upload Materials
1. Inside the Subject Vault, you will see your academic breadcrumb (e.g., *2026-2027 > High School > Term 1 > Physics*).
2. Click the **Curricular Materials** tab to view existing documents, syllabi, and study guides.
3. Click **Upload Material** to upload a document (PDF, Word, Excel, Images up to 50 MB).
4. Enter the document title, description, and initial version notes.
5. Click **Save Document**. The document is now securely stored and version-tracked.
6. Click the **Vault Folders** tab to create folders to organize materials by topic or module.

---

## 3. Student Guide

Welcome to EduVault. Your student account is created by your school or university administration.

### Step 1: Receiving Your Invitation
1. Check your student email account for an onboarding email from EduVault.
2. Click the **Accept Invitation** link inside the email.

### Step 2: Completing Account Setup
1. When EduVault opens, enter your chosen password (at least 8 characters).
2. Retype the password to confirm it.
3. Click **Save Password & Enter EduVault**.

### Step 3: Logging In
1. Visit the EduVault portal.
2. Click **Log In**.
3. Enter your student email address and your password.
4. Click **Log In**.

### Troubleshooting & FAQ

#### What if login fails?
* If you have never set a password, click **"First time signing in or forgot password?"** on the login page.
* Type your student email address and click **Send Setup / Reset Link**.
* Check your email, click the link, set your password, and try logging in again.

#### What if no subjects appear?
* Your account is active, but your enrollment in specific classes has not yet been processed by the registrar or administrator.
* Contact your teacher or school administrator to confirm your enrollment in the system.

#### How to open My Subjects & Access Materials
1. Click **My Subjects** in the left sidebar.
2. Click on any enrolled subject to view course notices and educational materials.
3. You will have access to all **Published** curricular materials, assignments, study guides, and lecture slides provided by your teachers.
4. Click any document card to preview or read the document directly in the browser, or click download to save a local copy for study.

---

## Summary Reference Table

| Role | How Account is Created | How Password is Created | Academic Visibility |
| :--- | :--- | :--- | :--- |
| **Admin** | System / Master setup | Initial setup or password reset | Full institution overview; manages Academic Setup and People |
| **Teacher** | Provisioned by Admin in People Hub | Via Invite Link or "First time signing in?" flow | Assigned subjects only (via `teacher_assignments`) |
| **Student** | Provisioned by Admin in People Hub | Via Invite Link or "First time signing in?" flow | Enrolled subjects only (via `student_enrollments`), published materials only |
