const assert = require('assert');

// Test suite for Provisioning validation and role security rules
function validateProvisioningInput({ email, fullName, role, callerProfile, requestedInstitutionId }) {
  // 1. Authentication & Authorization Check
  if (!callerProfile) {
    return { status: 401, error: 'Unauthorized: Session required' };
  }
  if (callerProfile.role !== 'ADMIN') {
    return { status: 403, error: 'Forbidden: Only institutional Administrators can provision users' };
  }
  if (!callerProfile.institution_id) {
    return { status: 403, error: 'Forbidden: Administrator does not belong to an institution' };
  }

  // 2. Input Validation
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanName = (fullName || '').trim();
  const targetRole = (role || '').trim().toUpperCase();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!cleanEmail || !emailRegex.test(cleanEmail)) {
    return { status: 400, error: 'Please provide a valid email address' };
  }

  if (!cleanName || cleanName.length < 2) {
    return { status: 400, error: 'Please provide a full name (minimum 2 characters)' };
  }

  // 3. Role Integrity Check
  if (targetRole !== 'TEACHER' && targetRole !== 'STUDENT') {
    return { status: 400, error: "Role must be either 'TEACHER' or 'STUDENT'" };
  }

  // 4. Institution Derivation (Security boundary: ignore requestedInstitutionId, use callerProfile.institution_id)
  const effectiveInstitutionId = callerProfile.institution_id;

  return {
    status: 200,
    cleanEmail,
    cleanName,
    targetRole,
    institutionId: effectiveInstitutionId
  };
}

async function runProvisioningSecurityTests() {
  console.log('--- STARTING PROVISIONING SECURITY & VALIDATION TESTS ---');

  const adminProfile = {
    id: 'f7cd40ff-dbf2-425c-aefb-6a81a47ce395',
    email: 'kprithviraju007@gmail.com',
    role: 'ADMIN',
    institution_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  };

  const teacherProfile = {
    id: '1a8da864-665a-4d0c-a206-5c3309624e1e',
    email: 'ramanabhaskar99@gmail.com',
    role: 'TEACHER',
    institution_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  };

  const studentProfile = {
    id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    email: 'student@example.edu',
    role: 'STUDENT',
    institution_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  };

  // Test 1: Unauthenticated request -> rejected 401
  const t1 = validateProvisioningInput({ email: 't@ex.com', fullName: 'Test', role: 'TEACHER', callerProfile: null });
  assert.strictEqual(t1.status, 401, 'Unauthenticated request must return 401');
  console.log('✓ Test 1 Passed: Unauthenticated request rejected (401)');

  // Test 2: TEACHER request -> rejected 403
  const t2 = validateProvisioningInput({ email: 't@ex.com', fullName: 'Test', role: 'TEACHER', callerProfile: teacherProfile });
  assert.strictEqual(t2.status, 403, 'Teacher caller must return 403');
  console.log('✓ Test 2 Passed: TEACHER caller rejected (403)');

  // Test 3: STUDENT request -> rejected 403
  const t3 = validateProvisioningInput({ email: 't@ex.com', fullName: 'Test', role: 'TEACHER', callerProfile: studentProfile });
  assert.strictEqual(t3.status, 403, 'Student caller must return 403');
  console.log('✓ Test 3 Passed: STUDENT caller rejected (403)');

  // Test 4: ADMIN request -> permitted 200
  const t4 = validateProvisioningInput({ email: 'newteacher@example.edu', fullName: 'Dr. Jane Smith', role: 'TEACHER', callerProfile: adminProfile });
  assert.strictEqual(t4.status, 200, 'Admin caller must be permitted');
  assert.strictEqual(t4.institutionId, adminProfile.institution_id);
  console.log('✓ Test 4 Passed: ADMIN caller permitted (200) with derived institution_id');

  // Test 5: Invalid email -> rejected 400
  const t5 = validateProvisioningInput({ email: 'not-an-email', fullName: 'Dr. Jane Smith', role: 'TEACHER', callerProfile: adminProfile });
  assert.strictEqual(t5.status, 400);
  console.log('✓ Test 5 Passed: Invalid email rejected (400)');

  // Test 6: Missing full name -> rejected 400
  const t6 = validateProvisioningInput({ email: 'jane@example.edu', fullName: '', role: 'TEACHER', callerProfile: adminProfile });
  assert.strictEqual(t6.status, 400);
  console.log('✓ Test 6 Passed: Missing full name rejected (400)');

  // Test 7: Unsupported role ADMIN -> rejected 400
  const t7 = validateProvisioningInput({ email: 'admin2@example.edu', fullName: 'Second Admin', role: 'ADMIN', callerProfile: adminProfile });
  assert.strictEqual(t7.status, 400);
  console.log('✓ Test 7 Passed: Provisioning role ADMIN rejected (400)');

  // Test 8: Unsupported role SUPERADMIN -> rejected 400
  const t8 = validateProvisioningInput({ email: 'super@example.edu', fullName: 'Super User', role: 'SUPERADMIN', callerProfile: adminProfile });
  assert.strictEqual(t8.status, 400);
  console.log('✓ Test 8 Passed: Arbitrary role SUPERADMIN rejected (400)');

  // Test 9: Valid STUDENT role -> permitted 200
  const t9 = validateProvisioningInput({ email: 'scholar@example.edu', fullName: 'Alex Johnson', role: 'STUDENT', callerProfile: adminProfile });
  assert.strictEqual(t9.status, 200);
  assert.strictEqual(t9.targetRole, 'STUDENT');
  console.log('✓ Test 9 Passed: STUDENT role permitted (200)');

  // Test 10: Institution Boundary: Frontend cannot override institution_id
  const t10 = validateProvisioningInput({ 
    email: 'test@example.edu', 
    fullName: 'Test User', 
    role: 'TEACHER', 
    callerProfile: adminProfile, 
    requestedInstitutionId: 'malicious-institution-uuid' 
  });
  assert.strictEqual(t10.institutionId, adminProfile.institution_id);
  assert.notStrictEqual(t10.institutionId, 'malicious-institution-uuid');
  console.log('✓ Test 10 Passed: Institution boundary enforced; frontend-supplied institution is ignored');

  console.log('--- ALL 10 PROVISIONING SECURITY TESTS PASSED ---');
}

runProvisioningSecurityTests();
