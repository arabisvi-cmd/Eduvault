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
    password: null, // Unregistered by default (ready for testing registration)
    status: 'unregistered'
  },
  {
    teacher_id: 'TCH-1002',
    full_name: 'Prof. Sarah Jenkins',
    email: 'sarah.jenkins@school.edu',
    institution: 'inst-1',
    department: 'Mathematics',
    designation: 'Senior Lecturer',
    password: 'password123', // Already registered demo account
    status: 'active'
  },
  {
    teacher_id: 'TCH-1003',
    full_name: 'Dr. Marcus Reynolds',
    email: 'marcus.reynolds@school.edu',
    institution: 'inst-1',
    department: 'Chemistry',
    designation: 'Lab Director',
    password: null,
    status: 'unregistered'
  },
  {
    teacher_id: 'TCH-2001',
    full_name: 'Elena Rostova',
    email: 'elena.rostova@cambridge.edu',
    institution: 'inst-2',
    department: 'Computer Science',
    designation: 'Lead Faculty',
    password: null,
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
    password: null, // Unregistered by default
    status: 'unregistered'
  },
  {
    student_id: 'STU-2026-002',
    full_name: 'Liam Miller',
    email: 'liam.miller@student.edu',
    institution: 'inst-1',
    grade: 'grade-10',
    section: 'Section A',
    password: 'password123', // Already registered demo account
    status: 'active'
  },
  {
    student_id: 'STU-2026-042',
    full_name: 'Sophia Rodriguez',
    email: 'sophia.rodriguez@student.edu',
    institution: 'inst-1',
    grade: 'grade-11',
    section: 'Science',
    password: null,
    status: 'unregistered'
  },
  {
    student_id: 'STU-2026-099',
    full_name: 'David Kim',
    email: 'david.kim@student.edu',
    institution: 'inst-1',
    grade: 'grade-12',
    section: 'Commerce',
    password: null,
    status: 'unregistered'
  }
];

export const ADMIN_CREDENTIALS = {
  email: 'principal@school.edu',
  admin_id: 'ADMIN-001',
  role: 'admin',
  full_name: 'Principal Arthur Davies',
  institution: 'inst-1',
  password: 'admin123'
};

/**
 * Verifies an institutional ID against the database (or mock fallback).
 * Returns whether the ID exists and if a password is already set.
 */
export async function verifyInstitutionalId(role, idInput) {
  const cleanId = (idInput || '').trim().toUpperCase();
  if (!cleanId) {
    return { success: false, exists: false, isRegistered: false, error: 'Please enter an identification number.' };
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
        const isRegistered = Boolean(data.password && data.password.trim() !== '');
        return {
          success: true,
          exists: true,
          isRegistered: isRegistered,
          record: data
        };
      }
    } catch (err) {
      console.warn('Database lookup failed, falling back to local list', err);
    }
  }

  // Fallback to local roster
  const list = role === 'teacher' ? MOCK_TEACHERS : MOCK_STUDENTS;
  const match = list.find(item => item[idField].toUpperCase() === cleanId);

  if (match) {
    const isRegistered = Boolean(match.password && match.password.trim() !== '');
    return {
      success: true,
      exists: true,
      isRegistered: isRegistered,
      record: match
    };
  }

  return { 
    success: false, 
    exists: false,
    isRegistered: false,
    error: `No record found for ${role === 'teacher' ? 'Teacher ID' : 'Student ID'} "${cleanId}". Please check with your school administration.` 
  };
}

/**
 * Register account with Institutional ID:
 * 1. Checks if ID exists and password is empty.
 * 2. If password already exists, returns error and prompts to log in.
 * 3. If empty, saves password to database row and activates account.
 */
export async function registerWithInstitutionalId({ role, institutionalId, password }) {
  if (!password || password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }

  const verifyRes = await verifyInstitutionalId(role, institutionalId);
  if (!verifyRes.success || !verifyRes.record) {
    return { 
      success: false, 
      error: verifyRes.error || 'Institutional ID verification failed.' 
    };
  }

  // Check if account already has a password set
  if (verifyRes.isRegistered) {
    return {
      success: false,
      isRegistered: true,
      error: `Account already exists for this ${role === 'teacher' ? 'Teacher ID' : 'Student ID'}! Please log in.`,
      record: verifyRes.record
    };
  }

  const record = verifyRes.record;
  const idField = role === 'teacher' ? 'teacher_id' : 'student_id';
  const table = role === 'teacher' ? 'teachers' : 'students';
  const actualId = record[idField];

  // 1. Update database table
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from(table)
        .update({ 
          password: password, 
          status: 'active', 
          registered_at: new Date().toISOString() 
        })
        .eq(idField, actualId);

      // Also create user in Supabase Auth if needed
      await supabase.auth.signUp({
        email: record.email,
        password: password,
        options: {
          data: {
            full_name: record.full_name,
            role: role,
            institutional_id: actualId,
            institution: record.institution || 'inst-1'
          }
        }
      });
    } catch (err) {
      console.warn('Database registration update notice:', err);
    }
  }

  // 2. Update local mock data
  const list = role === 'teacher' ? MOCK_TEACHERS : MOCK_STUDENTS;
  const localItem = list.find(item => item[idField].toUpperCase() === actualId.toUpperCase());
  if (localItem) {
    localItem.password = password;
    localItem.status = 'active';
    localItem.registered_at = new Date().toISOString();
  }

  return {
    success: true,
    record: { ...record, password, status: 'active' },
    user: {
      id: actualId,
      email: record.email,
      full_name: record.full_name,
      role: role,
      institution: record.institution || 'inst-1'
    }
  };
}

/**
 * Authenticates user using ID (Teacher ID / Student ID / Admin ID) OR Email + Password.
 */
export async function authenticateUser({ identifier, password, loginType = 'user' }) {
  const cleanInput = (identifier || '').trim();
  if (!cleanInput || !password) {
    return { success: false, error: 'Please enter your ID/Email and password.' };
  }

  // Admin login handling
  if (loginType === 'admin') {
    const isEmailMatch = cleanInput.toLowerCase() === ADMIN_CREDENTIALS.email.toLowerCase();
    const isIdMatch = cleanInput.toUpperCase() === ADMIN_CREDENTIALS.admin_id;
    if ((isEmailMatch || isIdMatch) && password === ADMIN_CREDENTIALS.password) {
      return {
        success: true,
        user: {
          id: ADMIN_CREDENTIALS.admin_id,
          email: ADMIN_CREDENTIALS.email,
          full_name: ADMIN_CREDENTIALS.full_name,
          role: 'admin',
          institution: ADMIN_CREDENTIALS.institution
        }
      };
    } else if (isEmailMatch || isIdMatch) {
      return { success: false, error: 'Invalid administrator password.' };
    }
    return { success: false, error: 'No administrator account found with this ID or Email.' };
  }

  // 1. Try Supabase Query
  if (isSupabaseConfigured && supabase) {
    try {
      // Check teachers table
      const { data: teacherData } = await supabase
        .from('teachers')
        .select('*')
        .or(`teacher_id.ilike.${cleanInput},email.ilike.${cleanInput}`)
        .maybeSingle();

      if (teacherData) {
        if (!teacherData.password) {
          return {
            success: false,
            isUnregistered: true,
            error: `Teacher ID "${teacherData.teacher_id}" has not been registered yet. Please click Register to create your password.`
          };
        }
        if (teacherData.password === password) {
          return {
            success: true,
            user: {
              id: teacherData.teacher_id,
              email: teacherData.email,
              full_name: teacherData.full_name,
              role: 'teacher',
              institution: teacherData.institution || 'inst-1'
            }
          };
        }
        return { success: false, error: 'Invalid password. Please check your credentials.' };
      }

      // Check students table
      const { data: studentData } = await supabase
        .from('students')
        .select('*')
        .or(`student_id.ilike.${cleanInput},email.ilike.${cleanInput}`)
        .maybeSingle();

      if (studentData) {
        if (!studentData.password) {
          return {
            success: false,
            isUnregistered: true,
            error: `Student ID "${studentData.student_id}" has not been registered yet. Please click Register to create your password.`
          };
        }
        if (studentData.password === password) {
          return {
            success: true,
            user: {
              id: studentData.student_id,
              email: studentData.email,
              full_name: studentData.full_name,
              role: 'student',
              institution: studentData.institution || 'inst-1'
            }
          };
        }
        return { success: false, error: 'Invalid password. Please check your credentials.' };
      }
    } catch (err) {
      console.warn('Database login lookup failed, checking local store', err);
    }
  }

  // 2. Check local mock lists
  const teacherMatch = MOCK_TEACHERS.find(t => 
    t.teacher_id.toUpperCase() === cleanInput.toUpperCase() || 
    t.email.toLowerCase() === cleanInput.toLowerCase()
  );

  if (teacherMatch) {
    if (!teacherMatch.password) {
      return {
        success: false,
        isUnregistered: true,
        error: `Teacher ID "${teacherMatch.teacher_id}" has not been registered yet. Please click Register to create your password.`
      };
    }
    if (teacherMatch.password === password) {
      return {
        success: true,
        user: {
          id: teacherMatch.teacher_id,
          email: teacherMatch.email,
          full_name: teacherMatch.full_name,
          role: 'teacher',
          institution: teacherMatch.institution || 'inst-1'
        }
      };
    }
    return { success: false, error: 'Invalid password. Please check your credentials.' };
  }

  const studentMatch = MOCK_STUDENTS.find(s => 
    s.student_id.toUpperCase() === cleanInput.toUpperCase() || 
    s.email.toLowerCase() === cleanInput.toLowerCase()
  );

  if (studentMatch) {
    if (!studentMatch.password) {
      return {
        success: false,
        isUnregistered: true,
        error: `Student ID "${studentMatch.student_id}" has not been registered yet. Please click Register to create your password.`
      };
    }
    if (studentMatch.password === password) {
      return {
        success: true,
        user: {
          id: studentMatch.student_id,
          email: studentMatch.email,
          full_name: studentMatch.full_name,
          role: 'student',
          institution: studentMatch.institution || 'inst-1'
        }
      };
    }
    return { success: false, error: 'Invalid password. Please check your credentials.' };
  }

  return { 
    success: false, 
    error: `No account found for "${cleanInput}". Please click Register to create an account.` 
  };
}
