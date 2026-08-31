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

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});

async function run() {
  console.log("=== STARTING VAULT TESTS ===");

  // Switch to Teacher A
  const { data: authT, error: errT } = await supabase.auth.signInWithPassword({ email: 'teacher_inst1@example.com', password: 'password123' });
  if (errT) { console.error("Could not log in Teacher A", errT); return; }
  const teacherId = authT.user.id;
  const instId = (await supabase.from('users').select('institution_id').eq('id', teacherId).single()).data.institution_id;

  // We need to fetch an assigned subject
  const { data: assignments } = await supabase.from('teacher_assignments').select('subject_id').eq('user_id', teacherId).limit(1);
  if (!assignments || !assignments.length) { console.error("No subjects assigned to Teacher A. Run Task 4 tests first."); return; }
  const subjectId = assignments[0].subject_id;
  
  // Find an UNASSIGNED subject to test failure
  const { data: allSubjects } = await supabase.from('subjects').select('id');
  const unassignedId = allSubjects.find(s => s.id !== subjectId)?.id;

  // TEST 1: Teacher A uploads to assigned Subject A
  const { data: doc1, error: errD1 } = await supabase.from('documents').insert({
    subject_id: subjectId, title: 'Lecture 1.pdf', status: 'DRAFT', created_by: teacherId
  }).select().single();
  
  if (errD1) { console.error("TEST 1 DB FAIL:", errD1); return; }
  
  const { data: ver1, error: errV1 } = await supabase.from('document_versions').insert({
    document_id: doc1.id, version_number: 1, storage_path: 'temp', file_type: 'application/pdf', file_size: 1024, uploaded_by: teacherId
  }).select().single();

  const storagePath1 = `${instId}/${subjectId}/${doc1.id}/${ver1.id}.pdf`;
  const { error: errUp1 } = await supabase.storage.from('eduvault-documents').upload(storagePath1, 'fake file content', { contentType: 'application/pdf' });
  
  if (errUp1) { 
    console.error("TEST 1 STORAGE FAIL:", errUp1.message); 
  } else {
    console.log("TEST 1 PASS: Teacher A uploaded to assigned Subject A.");
    await supabase.from('document_versions').update({ storage_path: storagePath1 }).eq('id', ver1.id);
    await supabase.from('documents').update({ active_version_id: ver1.id }).eq('id', doc1.id);
  }

  // TEST 2: Teacher A attempts upload to Subject B (should fail RLS at DB or Storage)
  if (unassignedId) {
    const { data: doc2, error: errD2 } = await supabase.from('documents').insert({
      subject_id: unassignedId, title: 'Hack.pdf', status: 'DRAFT', created_by: teacherId
    }).select().single();
    if (errD2) {
      console.log("TEST 2 PASS: Teacher A blocked from creating doc for unassigned Subject B.");
    } else {
      // Let's see if storage blocks it
      const storagePath2 = `${instId}/${unassignedId}/${doc2.id}/hack.pdf`;
      const { error: errUp2 } = await supabase.storage.from('eduvault-documents').upload(storagePath2, 'hack content');
      if (errUp2) {
        console.log("TEST 2 PASS: Teacher A blocked from uploading to unassigned Subject B via Storage RLS.");
      } else {
        console.error("TEST 2 FAIL: Teacher A uploaded to Subject B.");
      }
    }
  }

  // Switch to Student A
  await supabase.auth.signInWithPassword({ email: 'student_inst1@example.com', password: 'password123' });

  // TEST 5: Student A cannot see draft Subject A document
  const { data: docsSDraft } = await supabase.from('documents').select('*').eq('id', doc1.id);
  if (docsSDraft && docsSDraft.length > 0) {
    console.error("TEST 5 FAIL: Student sees DRAFT document.");
  } else {
    console.log("TEST 5 PASS: Student A cannot see DRAFT document.");
  }

  // TEST 9: Student A cannot obtain unauthorized signed URL
  const { error: errSUrl } = await supabase.storage.from('eduvault-documents').createSignedUrl(storagePath1, 60);
  if (errSUrl) {
    console.log("TEST 9 PASS: Student A blocked from getting signed URL for DRAFT document.");
  } else {
    console.error("TEST 9 FAIL: Student got signed URL for DRAFT document.");
  }

  // Switch to Teacher A
  await supabase.auth.signInWithPassword({ email: 'teacher_inst1@example.com', password: 'password123' });
  
  // Publish document
  await supabase.from('documents').update({ status: 'PUBLISHED' }).eq('id', doc1.id);
  console.log("Teacher A published document.");

  // Switch to Student A
  await supabase.auth.signInWithPassword({ email: 'student_inst1@example.com', password: 'password123' });

  // TEST 4: Student A sees published Subject A document
  const { data: docsSPub } = await supabase.from('documents').select('*').eq('id', doc1.id);
  if (docsSPub && docsSPub.length > 0) {
    console.log("TEST 4 PASS: Student A sees PUBLISHED document.");
  } else {
    console.error("TEST 4 FAIL: Student A cannot see PUBLISHED document.");
  }

  // Get signed URL
  const { data: sUrl, error: errSUrl2 } = await supabase.storage.from('eduvault-documents').createSignedUrl(storagePath1, 60);
  if (sUrl?.signedUrl) {
    console.log("TEST 6 PASS (Sub-test): Student got signed URL for PUBLISHED document.", sUrl.signedUrl);
  } else {
    console.error("TEST 6 FAIL: Student could not get signed URL for PUBLISHED document.", errSUrl2?.message);
  }

  console.log("\nALL TESTS COMPLETED.");
}

run();
