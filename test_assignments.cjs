const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');
global.WebSocket = WebSocket;
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  if (line && line.includes('=')) {
    const [key, ...val] = line.split('=');
    acc[key.trim()] = val.join('=').trim().replace(/^"|"$/g, '');
  }
  return acc;
}, {});

const supabaseUrl = env.VITE_SUPABASE_URL || "http://127.0.0.1:54321";
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});

async function run() {
  // Login as admin 1
  const { data: authA, error: errA } = await supabase.auth.signInWithPassword({
    email: 'admin_inst1@example.com', password: 'password123'
  });
  if (errA) {
    console.error("Please ensure admin_inst1@example.com exists.", errA);
    return;
  }
  const adminId = authA.user.id;
  const { data: adminProf } = await supabase.from('users').select('institution_id').eq('id', adminId).single();
  const instId = adminProf.institution_id;

  // Login as Teacher A
  const { data: authT, error: errT } = await supabase.auth.signInWithPassword({
    email: 'teacher_inst1@example.com', password: 'password123'
  });
  const teacherId = authT.user.id;

  // Login as Student A
  const { data: authS, error: errS } = await supabase.auth.signInWithPassword({
    email: 'student_inst1@example.com', password: 'password123'
  });
  const studentId = authS.user.id;

  // We need to fetch an existing subject for this institution, or create one.
  const { data: subj } = await supabase.from('subjects').select('id').limit(1);
  if (!subj || subj.length === 0) {
    console.log("No subjects exist. Run UI CRUD first.");
    return;
  }
  const subjectId = subj[0].id;

  console.log("Subject ID:", subjectId);

  // Switch back to Admin
  await supabase.auth.signInWithPassword({ email: 'admin_inst1@example.com', password: 'password123' });

  // 1. Admin assigns Teacher A to Subject A.
  const { error: e1 } = await supabase.from('teacher_assignments').insert({ user_id: teacherId, subject_id: subjectId });
  console.log("TEST 1 (Admin assigns teacher):", e1 ? "FAIL" : "PASS", e1?.message || "");

  // 6. Admin enrolls Student A in Subject A.
  const { error: e6 } = await supabase.from('student_enrollments').insert({ user_id: studentId, subject_id: subjectId });
  console.log("TEST 6 (Admin enrolls student):", e6 ? "FAIL" : "PASS", e6?.message || "");

  // 15. Duplicate assignment rejected
  const { error: e15 } = await supabase.from('teacher_assignments').insert({ user_id: teacherId, subject_id: subjectId });
  console.log("TEST 15 (Duplicate assignment rejected):", e15?.code === '23505' ? "PASS" : "FAIL", e15?.message || "");

  // 16. Duplicate enrollment rejected
  const { error: e16 } = await supabase.from('student_enrollments').insert({ user_id: studentId, subject_id: subjectId });
  console.log("TEST 16 (Duplicate enrollment rejected):", e16?.code === '23505' ? "PASS" : "FAIL", e16?.message || "");

  // Switch to Teacher A
  await supabase.auth.signInWithPassword({ email: 'teacher_inst1@example.com', password: 'password123' });

  // 2. Teacher A can see Subject A
  const { data: td2 } = await supabase.from('teacher_assignments').select('*').eq('subject_id', subjectId);
  console.log("TEST 2 (Teacher A sees Subject A):", td2?.length > 0 ? "PASS" : "FAIL");

  // 13. Teacher cannot modify assignments
  const { error: e13 } = await supabase.from('teacher_assignments').insert({ user_id: teacherId, subject_id: subjectId });
  console.log("TEST 13 (Teacher blocked from modifying):", e13 ? "PASS" : "FAIL", e13?.message || "");

  // Switch to Student A
  await supabase.auth.signInWithPassword({ email: 'student_inst1@example.com', password: 'password123' });

  // 7. Student A can see Subject A
  const { data: sd7 } = await supabase.from('student_enrollments').select('*').eq('subject_id', subjectId);
  console.log("TEST 7 (Student A sees Subject A):", sd7?.length > 0 ? "PASS" : "FAIL");

  // 14. Student cannot modify enrollments
  const { error: e14 } = await supabase.from('student_enrollments').insert({ user_id: studentId, subject_id: subjectId });
  console.log("TEST 14 (Student blocked from modifying):", e14 ? "PASS" : "FAIL", e14?.message || "");

  // Switch to Admin
  await supabase.auth.signInWithPassword({ email: 'admin_inst1@example.com', password: 'password123' });

  // 4. Admin removes Teacher A
  const { error: e4 } = await supabase.from('teacher_assignments').delete().match({ user_id: teacherId, subject_id: subjectId });
  console.log("TEST 4 (Admin removes teacher):", e4 ? "FAIL" : "PASS", e4?.message || "");

  // 9. Admin removes Student A
  const { error: e9 } = await supabase.from('student_enrollments').delete().match({ user_id: studentId, subject_id: subjectId });
  console.log("TEST 9 (Admin removes student):", e9 ? "FAIL" : "PASS", e9?.message || "");

  // Switch to Teacher A
  await supabase.auth.signInWithPassword({ email: 'teacher_inst1@example.com', password: 'password123' });
  const { data: td5 } = await supabase.from('teacher_assignments').select('*').eq('subject_id', subjectId);
  console.log("TEST 5 (Teacher A no longer sees Subject A):", td5?.length === 0 ? "PASS" : "FAIL");

  // Switch to Student A
  await supabase.auth.signInWithPassword({ email: 'student_inst1@example.com', password: 'password123' });
  const { data: sd10 } = await supabase.from('student_enrollments').select('*').eq('subject_id', subjectId);
  console.log("TEST 10 (Student A no longer sees Subject A):", sd10?.length === 0 ? "PASS" : "FAIL");

  console.log("\nALL TESTS COMPLETED.");
}

run();
