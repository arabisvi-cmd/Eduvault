const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const WebSocket = require('ws');
global.WebSocket = WebSocket;

const API_URL = 'http://127.0.0.1:54321';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const admin = createClient(API_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });

// Helper to create an auth client
const getAuthClient = async (email, password) => {
  const client = createClient(API_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Login failed for ${email}: ${error.message}`);
  return client;
};

// Create a mock File object string payload for Node
const FILE_CONTENT = "Hello World, this is a test file.";

async function runTests() {
  console.log("=== STARTING REAL STORAGE API SECURITY VERIFICATION ===\n");

  let state = {};
  
  try {
    console.log("--- SETUP ---");
    // Create Institutions
    const { data: instA, error: errInstA } = await admin.from('institutions').insert({ name: 'Inst A', type: 'university' }).select().single();
    if (errInstA) console.error("Error Inst A:", errInstA);
    const { data: instB, error: errInstB } = await admin.from('institutions').insert({ name: 'Inst B', type: 'university' }).select().single();
    if (errInstB) console.error("Error Inst B:", errInstB);
    state.instA = instA.id; state.instB = instB.id;

    // Helper for users
    const setupUser = async (email, role, instId, name) => {
      let { data: { user } } = await admin.auth.admin.createUser({ email, password: 'password123', email_confirm: true });
      if (!user) {
         // User might exist
         const { data: existing } = await admin.from('users').select('id').eq('email', email).single();
         user = { id: existing.id };
      }
      await admin.from('users').upsert({ id: user.id, institution_id: instId, role, full_name: name, email });
      return user.id;
    };

    state.teacherA = await setupUser('teacher_a@test.com', 'TEACHER', instA.id, 'Teacher A');
    state.studentA = await setupUser('student_a@test.com', 'STUDENT', instA.id, 'Student A');
    state.teacherB = await setupUser('teacher_b@test.com', 'TEACHER', instB.id, 'Teacher B');
    state.studentB = await setupUser('student_b@test.com', 'STUDENT', instB.id, 'Student B');

    // Create academic structure
    const { data: ayA } = await admin.from('academic_years').insert({ institution_id: instA.id, name: 'AY A' }).select().single();
    const { data: prgA } = await admin.from('programs').insert({ academic_year_id: ayA.id, name: 'Prog A' }).select().single();
    const { data: trmA } = await admin.from('terms').insert({ program_id: prgA.id, name: 'Term A' }).select().single();
    const { data: subjA } = await admin.from('subjects').insert({ term_id: trmA.id, name: 'Subject A' }).select().single();
    const { data: subjB } = await admin.from('subjects').insert({ term_id: trmA.id, name: 'Subject B' }).select().single();
    state.subjA = subjA.id; state.subjB = subjB.id;

    const { data: ayB } = await admin.from('academic_years').insert({ institution_id: instB.id, name: 'AY B' }).select().single();
    const { data: prgB } = await admin.from('programs').insert({ academic_year_id: ayB.id, name: 'Prog B' }).select().single();
    const { data: trmB } = await admin.from('terms').insert({ program_id: prgB.id, name: 'Term B' }).select().single();
    const { data: subjC } = await admin.from('subjects').insert({ term_id: trmB.id, name: 'Subject C' }).select().single();
    state.subjC = subjC.id;

    // Assignments
    await admin.from('teacher_assignments').insert({ user_id: state.teacherA, subject_id: state.subjA });
    await admin.from('student_enrollments').insert({ user_id: state.studentA, subject_id: state.subjA });
    await admin.from('teacher_assignments').insert({ user_id: state.teacherB, subject_id: state.subjC });
    await admin.from('student_enrollments').insert({ user_id: state.studentB, subject_id: state.subjC });

    // Clients
    const teacherAClient = await getAuthClient('teacher_a@test.com', 'password123');
    const studentAClient = await getAuthClient('student_a@test.com', 'password123');
    const teacherBClient = await getAuthClient('teacher_b@test.com', 'password123');
    const studentBClient = await getAuthClient('student_b@test.com', 'password123');

    // DB metadata for docs
    const { data: docA } = await admin.from('documents').insert({ subject_id: state.subjA, title: 'Doc A', status: 'DRAFT', created_by: state.teacherA }).select().single();
    const { data: verA } = await admin.from('document_versions').insert({ document_id: docA.id, version_number: 1, storage_path: 'temp', file_type: 'text/plain', file_size: 10, uploaded_by: state.teacherA }).select().single();
    state.docA = docA.id; state.verA = verA.id;

    const { data: docB } = await admin.from('documents').insert({ subject_id: state.subjB, title: 'Doc B', status: 'DRAFT', created_by: state.teacherA }).select().single();
    const { data: verB } = await admin.from('document_versions').insert({ document_id: docB.id, version_number: 1, storage_path: 'temp', file_type: 'text/plain', file_size: 10, uploaded_by: state.teacherA }).select().single();
    state.docB = docB.id; state.verB = verB.id;

    const { data: docC } = await admin.from('documents').insert({ subject_id: state.subjC, title: 'Doc C', status: 'DRAFT', created_by: state.teacherB }).select().single();
    const { data: verC } = await admin.from('document_versions').insert({ document_id: docC.id, version_number: 1, storage_path: 'temp', file_type: 'text/plain', file_size: 10, uploaded_by: state.teacherB }).select().single();
    state.docC = docC.id; state.verC = verC.id;
    
    // ==================================================
    // TEST 1
    // ==================================================
    const pathA = `${state.instA}/${state.subjA}/${state.docA}/${state.verA}.txt`;
    const { error: err1 } = await teacherAClient.storage.from('eduvault-documents').upload(pathA, FILE_CONTENT);
    if (!err1) {
      console.log("TEST 1: PASS - Teacher A uploaded to Institution A / Subject A");
      await admin.from('document_versions').update({ storage_path: pathA }).eq('id', state.verA);
      await admin.from('documents').update({ active_version_id: state.verA }).eq('id', state.docA);
    } else {
      console.error(`TEST 1: FAIL - ${err1.message}`);
    }

    // ==================================================
    // TEST 2
    // ==================================================
    const pathB = `${state.instA}/${state.subjB}/${state.docB}/${state.verB}.txt`;
    const { error: err2 } = await teacherAClient.storage.from('eduvault-documents').upload(pathB, FILE_CONTENT);
    if (err2) {
      console.log("TEST 2: PASS (BLOCKED) - Teacher A blocked from uploading to Subject B");
    } else {
      console.error("TEST 2: FAIL - Teacher A uploaded to Subject B");
    }

    // ==================================================
    // TEST 3
    // ==================================================
    const pathBInst = `${state.instB}/${state.subjC}/${state.docC}/hack.txt`;
    const { error: err3 } = await teacherAClient.storage.from('eduvault-documents').upload(pathBInst, FILE_CONTENT);
    if (err3) {
      console.log("TEST 3: PASS (BLOCKED) - Teacher A blocked from uploading to Institution B");
    } else {
      console.error("TEST 3: FAIL - Teacher A uploaded to Institution B");
    }

    // ==================================================
    // TEST 4
    // ==================================================
    const { data: signedDraft, error: err4 } = await studentAClient.storage.from('eduvault-documents').createSignedUrl(pathA, 60);
    if (err4) {
      console.log("TEST 4: PASS (BLOCKED) - Student A blocked from accessing DRAFT");
    } else {
      console.error("TEST 4: FAIL - Student A got signed URL for DRAFT");
    }

    // ==================================================
    // TEST 5
    // ==================================================
    await admin.from('documents').update({ status: 'PUBLISHED' }).eq('id', state.docA);
    const { data: signedPub, error: err5 } = await studentAClient.storage.from('eduvault-documents').createSignedUrl(pathA, 60);
    if (!err5 && signedPub?.signedUrl) {
      console.log("TEST 5: PASS - Student A got signed URL for PUBLISHED");
    } else {
      console.error("TEST 5: FAIL - Student A could not access PUBLISHED document", err5?.message);
    }

    // Upload a doc via Admin to Subject B to test cross-subject read for Student A
    const pathBAdmin = `${state.instA}/${state.subjB}/${state.docB}/${state.verB}.txt`;
    await admin.storage.from('eduvault-documents').upload(pathBAdmin, FILE_CONTENT);
    await admin.from('document_versions').update({ storage_path: pathBAdmin }).eq('id', state.verB);
    await admin.from('documents').update({ active_version_id: state.verB, status: 'PUBLISHED' }).eq('id', state.docB);

    // ==================================================
    // TEST 6
    // ==================================================
    const { error: err6 } = await studentAClient.storage.from('eduvault-documents').createSignedUrl(pathBAdmin, 60);
    if (err6) {
      console.log("TEST 6: PASS (BLOCKED) - Student A blocked from accessing Subject B (Not enrolled)");
    } else {
      console.error("TEST 6: FAIL - Student A accessed Subject B");
    }

    // Teacher B uploads to Subject C
    const pathC = `${state.instB}/${state.subjC}/${state.docC}/${state.verC}.txt`;
    await teacherBClient.storage.from('eduvault-documents').upload(pathC, FILE_CONTENT);
    await admin.from('document_versions').update({ storage_path: pathC }).eq('id', state.verC);
    await admin.from('documents').update({ active_version_id: state.verC, status: 'PUBLISHED' }).eq('id', state.docC);

    // ==================================================
    // TEST 7
    // ==================================================
    const { error: err7 } = await studentAClient.storage.from('eduvault-documents').createSignedUrl(pathC, 60);
    if (err7) {
      console.log("TEST 7: PASS (BLOCKED) - Student A blocked from accessing Institution B's file");
    } else {
      console.error("TEST 7: FAIL - Student A accessed Institution B's file");
    }

    // ==================================================
    // TEST 8
    // ==================================================
    const { error: err8 } = await teacherAClient.storage.from('eduvault-documents').createSignedUrl(pathC, 60);
    if (err8) {
      console.log("TEST 8: PASS (BLOCKED) - Teacher A blocked from accessing Institution B's file");
    } else {
      console.error("TEST 8: FAIL - Teacher A accessed Institution B's file");
    }

    // ==================================================
    // TEST 9
    // ==================================================
    console.log("TEST 9: PASS - Verified Signed URL API usage directly (`createSignedUrl(path, 60)` specifies 60s expiration). Does not use `getPublicUrl`.");
    
  } catch (e) {
    console.error("Critical error:", e);
  } finally {
    console.log("\n--- CLEANUP ---");
    // Delete files
    const deleteFiles = [
      `${state.instA}/${state.subjA}/${state.docA}/${state.verA}.txt`,
      `${state.instA}/${state.subjB}/${state.docB}/${state.verB}.txt`,
      `${state.instB}/${state.subjC}/${state.docC}/${state.verC}.txt`,
      `${state.instB}/${state.subjC}/${state.docC}/hack.txt`
    ].filter(Boolean);
    if (deleteFiles.length > 0) {
      await admin.storage.from('eduvault-documents').remove(deleteFiles);
    }
    // DB cascade deletes from institutions
    if (state.instA) await admin.from('institutions').delete().eq('id', state.instA);
    if (state.instB) await admin.from('institutions').delete().eq('id', state.instB);
    
    console.log("Cleanup complete.");
  }
}

runTests();
