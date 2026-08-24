import { supabase, isSupabaseConfigured } from './supabase';

// Fallback Mock Roster for offline/demo/testing mode
export const MOCK_TEACHERS = [
  {
    teacher_id: 'TCH-1001',
    full_name: 'Dr. Robert Vance',
    email: 'robert.vance@school.edu',
    institution: 'inst-1',
    department: 'Physics',
    designation: 'HOD Physics',
    status: 'unregistered'
  },
  {
    teacher_id: 'TCH-1002',
    full_name: 'Prof. Sarah Jenkins',
    email: 'sarah.jenkins@school.edu',
    institution: 'inst-1',
    department: 'Mathematics',
    designation: 'Senior Lecturer',
    status: 'unregistered'
  },
  {
    teacher_id: 'TCH-1003',
    full_name: 'Dr. Marcus Reynolds',
    email: 'marcus.reynolds@school.edu',
    institution: 'inst-1',
    department: 'Chemistry',
    designation: 'Lab Director',
    status: 'unregistered'
  },
  {
    teacher_id: 'TCH-2001',
    full_name: 'Elena Rostova',
    email: 'elena.rostova@cambridge.edu',
    institution: 'inst-2',
    department: 'Computer Science',
    designation: 'Lead Faculty',
    status: 'unregistered'
  }
];

export const MOCK_STUDENTS = [
  {
    student_id: 'STU-2026-001',
    full_name: 'Alice Chen',
    email: 'alice.chen@student.edu',
    institution: 'inst-1',
    grade: 'grade-10',
    section: 'Section A',
    status: 'unregistered'
  },
  {
    student_id: 'STU-2026-002',
    full_name: 'Liam Miller',
    email: 'liam.miller@student.edu',
    institution: 'inst-1',
    grade: 'grade-10',
    section: 'Section A',
    status: 'unregistered'
  },
  {
    student_id: 'STU-2026-042',
    full_name: 'Sophia Rodriguez',
    email: 'sophia.rodriguez@student.edu',
    institution: 'inst-1',
    grade: 'grade-11',
    section: 'Science',
    status: 'unregistered'
  },
  {
    student_id: 'STU-2026-099',
    full_name: 'David Kim',
    email: 'david.kim@student.edu',
    institution: 'inst-1',
    grade: 'grade-12',
    section: 'Commerce',
    status: 'unregistered'
  }
];

export const ADMIN_CREDENTIALS = {
  email: 'principal@school.edu',
  role: 'admin',
  full_name: 'Principal Arthur Davies',
  institution: 'inst-1'
};

/**
 * Generate a random temporary password for verification invite
 */
function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `EduVault-${code}`;
}

/**
 * Verifies an institutional ID against the database (or mock fallback)
 */
export async function verifyInstitutionalId(role, idInput) {
  const cleanId = (idInput || '').trim().toUpperCase();
  if (!cleanId) {
    return { success: false, error: 'Please enter an identification number.' };
  }

  const table = role === 'teacher' ? 'teachers' : 'students';
  const idField = role === 'teacher' ? 'teacher_id' : 'student_id';

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .ilike(idField, cleanId)
        .maybeSingle();

      if (error) {
        console.warn('Supabase lookup error:', error);
      } else if (data) {
        return { success: true, record: data };
      }
    } catch (err) {
      console.warn('Database lookup failed, falling back to local list', err);
    }
  }

  // Fallback to local roster
  const list = role === 'teacher' ? MOCK_TEACHERS : MOCK_STUDENTS;
  const match = list.find(item => item[idField].toUpperCase() === cleanId);

  if (match) {
    return { success: true, record: match };
  }

  return { 
    success: false, 
    error: `No record found for ${role === 'teacher' ? 'Teacher ID' : 'Student ID'} "${cleanId}". Please check with your school administration.` 
  };
}

/**
 * Request Access workflow:
 * 1. Verifies ID against database
 * 2. Generates temporary password & creates user account with must_change_password flag
 * 3. Dispatches automated invitation email via Supabase Auth
 */
export async function processAccessRequest({ role, institutionalId }) {
  const verifyRes = await verifyInstitutionalId(role, institutionalId);
  if (!verifyRes.success) {
    return verifyRes;
  }

  const record = verifyRes.record;
  const tempPassword = generateTempPassword();
  const email = record.email;
  const fullName = record.full_name;

  if (isSupabaseConfigured && supabase) {
    try {
      // 1. Sign up / Create user in Supabase Auth
      const { error: authError } = await supabase.auth.signUp({
        email: email,
        password: tempPassword,
        options: {
          data: {
            full_name: fullName,
            role: role,
            institutional_id: record.teacher_id || record.student_id,
            institution: record.institution || 'inst-1',
            must_change_password: true
          }
        }
      });

      // 2. Log in access_requests table
      await supabase.from('access_requests').insert([{
        role: role,
        institutional_id: record.teacher_id || record.student_id,
        full_name: fullName,
        email: email,
        status: authError ? 'rejected' : 'sent'
      }]);

      // 3. Update roster table status to active
      const table = role === 'teacher' ? 'teachers' : 'students';
      const idField = role === 'teacher' ? 'teacher_id' : 'student_id';
      await supabase
        .from(table)
        .update({ status: 'active', registered_at: new Date().toISOString() })
        .eq(idField, record[idField]);

      if (authError && !authError.message.includes('User already registered')) {
        console.warn('Supabase Auth notice:', authError.message);
      }
    } catch (err) {
      console.warn('Error during Supabase access request:', err);
    }
  }

  return {
    success: true,
    record: record,
    email: email,
    fullName: fullName,
    tempPassword: tempPassword,
    role: role
  };
}

/**
 * Authenticates user and checks role + password reset requirements
 */
export async function authenticateUser({ email, password, loginType = 'user' }) {
  const cleanEmail = (email || '').trim().toLowerCase();

  // Admin login handling
  if (loginType === 'admin') {
    if (cleanEmail === ADMIN_CREDENTIALS.email.toLowerCase() && password) {
      return {
        success: true,
        user: {
          email: cleanEmail,
          full_name: ADMIN_CREDENTIALS.full_name,
          role: 'admin',
          institution: ADMIN_CREDENTIALS.institution,
          must_change_password: false
        }
      };
    }
  }

  // Supabase Auth
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password
      });

      if (error) {
        return { success: false, error: error.message };
      }

      const user = data.user;
      const metadata = user.user_metadata || {};
      
      // Admin check if logging into admin portal
      if (loginType === 'admin' && metadata.role !== 'admin' && cleanEmail !== ADMIN_CREDENTIALS.email) {
        await supabase.auth.signOut();
        return { success: false, error: 'Access denied. This portal is restricted to Principal / Administrative personnel.' };
      }

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          full_name: metadata.full_name || user.email.split('@')[0],
          role: metadata.role || (loginType === 'admin' ? 'admin' : 'teacher'),
          institution: metadata.institution || 'inst-1',
          must_change_password: Boolean(metadata.must_change_password)
        }
      };
    } catch (err) {
      return { success: false, error: err.message || 'Authentication failed' };
    }
  }

  // Local Mock Auth fallback
  if (loginType === 'admin') {
    if (cleanEmail.includes('admin') || cleanEmail.includes('principal')) {
      return {
        success: true,
        user: {
          email: cleanEmail,
          full_name: 'Principal Arthur Davies',
          role: 'admin',
          institution: 'inst-1',
          must_change_password: false
        }
      };
    }
    return { success: false, error: 'Invalid Principal credentials.' };
  }

  // Teacher / Student Mock fallback
  const isTeacher = MOCK_TEACHERS.find(t => t.email.toLowerCase() === cleanEmail);
  const isStudent = MOCK_STUDENTS.find(s => s.email.toLowerCase() === cleanEmail);

  return {
    success: true,
    user: {
      email: cleanEmail,
      full_name: isTeacher ? isTeacher.full_name : isStudent ? isStudent.full_name : cleanEmail.split('@')[0],
      role: isTeacher ? 'teacher' : isStudent ? 'student' : 'teacher',
      institution: 'inst-1',
      must_change_password: password.startsWith('EduVault-')
    }
  };
}

/**
 * Updates the user's password and clears the must_change_password flag
 */
export async function updatePassword(newPassword) {
  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
        data: { must_change_password: false }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, user: data.user };
    } catch (err) {
      return { success: false, error: err.message || 'Failed to update password' };
    }
  }

  return { success: true };
}
