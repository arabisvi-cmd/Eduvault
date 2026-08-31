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

const SUPABASE_URL = env.VITE_SUPABASE_URL || "http://127.0.0.1:54321";
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing SUPABASE env vars");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

async function runTests() {
  console.log("=== STARTING ADMIN CRUD TESTS ===");

  // Log in as Admin 1
  console.log("Logging in as admin_inst1@example.com...");
  const { data: authData1, error: err1 } = await supabase.auth.signInWithPassword({
    email: 'admin_inst1@example.com',
    password: 'password123'
  });
  if (err1) throw err1;
  console.log("Logged in:", authData1.user.id);
  
  // Get Inst ID
  const { data: admin1Prof } = await supabase.from('users').select('institution_id').eq('id', authData1.user.id).single();
  const inst1Id = admin1Prof.institution_id;

  // 1. Create Academic Year
  console.log("\n1. Admin 1 creating Academic Year...");
  const { data: newYear, error: errYear } = await supabase.from('academic_years').insert({
    institution_id: inst1Id,
    name: "Test Year " + Date.now(),
    is_active: true,
    start_date: "2026-08-01",
    end_date: "2027-05-31"
  }).select().single();
  if (errYear) throw errYear;
  console.log("Success:", newYear.id);

  // 3. Create Program
  console.log("3. Admin 1 creating Program...");
  const { data: newProg, error: errProg } = await supabase.from('programs').insert({
    academic_year_id: newYear.id,
    name: "Test Program " + Date.now()
  }).select().single();
  if (errProg) throw errProg;
  console.log("Success:", newProg.id);

  // 4. Create Term
  console.log("4. Admin 1 creating Term...");
  const { data: newTerm, error: errTerm } = await supabase.from('terms').insert({
    program_id: newProg.id,
    name: "Test Term " + Date.now()
  }).select().single();
  if (errTerm) throw errTerm;
  console.log("Success:", newTerm.id);

  // 5. Create Subject
  console.log("5. Admin 1 creating Subject...");
  const { data: newSubj, error: errSubj } = await supabase.from('subjects').insert({
    term_id: newTerm.id,
    name: "Test Subject " + Date.now(),
    code: "TST101"
  }).select().single();
  if (errSubj) throw errSubj;
  console.log("Success:", newSubj.id);

  // Teacher Test
  console.log("\nLogging in as teacher_inst1@example.com to test writes...");
  const { data: authDataT, error: errT } = await supabase.auth.signInWithPassword({
    email: 'teacher_inst1@example.com',
    password: 'password123'
  });
  if (errT) throw errT;
  
  const { error: errTeacherWrite } = await supabase.from('academic_years').insert({
    institution_id: inst1Id,
    name: "Teacher Hack Year"
  });
  if (errTeacherWrite) {
    console.log("Teacher write correctly blocked:", errTeacherWrite.message);
  } else {
    console.error("FAIL: Teacher was able to write academic_years!");
  }

  // Admin 2 Cross-Institution test
  console.log("\nLogging in as admin_inst2@example.com to test cross-institution writes...");
  const { data: authData2, error: err2 } = await supabase.auth.signInWithPassword({
    email: 'admin_inst2@example.com',
    password: 'password123'
  });
  if (err2) throw err2;

  const { error: errCrossInst } = await supabase.from('academic_years').insert({
    institution_id: inst1Id, // trying to write to inst 1
    name: "Admin 2 Hack Year"
  });
  if (errCrossInst) {
    console.log("Admin 2 cross-institution write correctly blocked:", errCrossInst.message);
  } else {
    console.error("FAIL: Admin 2 wrote to Institution 1!");
  }
}

runTests().then(() => console.log("\nDONE.")).catch(console.error);
