import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  verifyInstitutionalId,
  registerWithInstitutionalId,
  authenticateUser,
  ADMIN_CREDENTIALS
} from '../../lib/authService';

vi.mock('../../lib/supabase', () => ({
  isSupabaseConfigured: false,
  supabase: null
}));

describe('Unit: Institutional Authentication Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Institutional ID Verification', () => {
    it('should reject empty or whitespace-only identification input with appropriate error', async () => {
      const emptyRes = await verifyInstitutionalId('teacher', '');
      expect(emptyRes.success).toBe(false);
      expect(emptyRes.exists).toBe(false);
      expect(emptyRes.error).toBeDefined();

      const wsRes = await verifyInstitutionalId('student', '   ');
      expect(wsRes.success).toBe(false);
      expect(wsRes.exists).toBe(false);
    });

    it('should be case-insensitive when verifying valid teacher and student IDs', async () => {
      const teacherRes = await verifyInstitutionalId('teacher', 'tch-1002');
      expect(teacherRes.success).toBe(true);
      expect(teacherRes.exists).toBe(true);
      expect(teacherRes.record).toBeDefined();
      expect(teacherRes.record.teacher_id).toBe('TCH-1002');

      const studentRes = await verifyInstitutionalId('student', 'stu-2026-001');
      expect(studentRes.success).toBe(true);
      expect(studentRes.exists).toBe(true);
      expect(studentRes.record.student_id).toBe('STU-2026-001');
    });

    it('should correctly determine registration state for accounts with and without passwords', async () => {
      // TCH-1002 has password in mock data -> registered
      const regRes = await verifyInstitutionalId('teacher', 'TCH-1002');
      expect(regRes.isRegistered).toBe(true);

      // TCH-1001 has no password -> unregistered
      const unregRes = await verifyInstitutionalId('teacher', 'TCH-1001');
      expect(unregRes.isRegistered).toBe(false);
    });

    it('should return safe error response for unknown institutional IDs', async () => {
      const unknownRes = await verifyInstitutionalId('teacher', 'UNKNOWN-999');
      expect(unknownRes.success).toBe(false);
      expect(unknownRes.exists).toBe(false);
      expect(unknownRes.error).toContain('UNKNOWN-999');
    });
  });

  describe('Institutional ID Registration', () => {
    it('should reject passwords that do not meet minimum length requirement', async () => {
      const shortPassRes = await registerWithInstitutionalId({
        role: 'teacher',
        institutionalId: 'TCH-1001',
        password: '123'
      });
      expect(shortPassRes.success).toBe(false);
      expect(shortPassRes.error).toMatch(/at least 6 characters/i);
    });

    it('should prevent re-registration for already registered accounts', async () => {
      const alreadyRegRes = await registerWithInstitutionalId({
        role: 'teacher',
        institutionalId: 'TCH-1002',
        password: 'newpassword123'
      });
      expect(alreadyRegRes.success).toBe(false);
      expect(alreadyRegRes.isRegistered).toBe(true);
      expect(alreadyRegRes.error).toMatch(/already exists/i);
    });

    it('should successfully register an unregistered record and return user details', async () => {
      const regRes = await registerWithInstitutionalId({
        role: 'student',
        institutionalId: 'STU-2026-042',
        password: 'securePass2026'
      });
      expect(regRes.success).toBe(true);
      expect(regRes.user).toBeDefined();
      expect(regRes.user.id).toBe('STU-2026-042');
      expect(regRes.user.role).toBe('student');
    });
  });

  describe('User Authentication Contracts', () => {
    it('should require non-empty identifier and password', async () => {
      const missingId = await authenticateUser({ identifier: '', password: 'pwd' });
      expect(missingId.success).toBe(false);

      const missingPwd = await authenticateUser({ identifier: 'TCH-1002', password: '' });
      expect(missingPwd.success).toBe(false);
    });

    it('should authenticate registered teacher with valid password', async () => {
      const res = await authenticateUser({
        identifier: 'TCH-1002',
        password: 'password123',
        loginType: 'user'
      });
      expect(res.success).toBe(true);
      expect(res.user.role).toBe('teacher');
      expect(res.user.id).toBe('TCH-1002');
    });

    it('should authenticate registered student using email identifier', async () => {
      const res = await authenticateUser({
        identifier: 'liam.miller@student.edu',
        password: 'password123',
        loginType: 'user'
      });
      expect(res.success).toBe(true);
      expect(res.user.role).toBe('student');
    });

    it('should reject authentication with incorrect password', async () => {
      const res = await authenticateUser({
        identifier: 'TCH-1002',
        password: 'WRONG_PASSWORD_XYZ',
        loginType: 'user'
      });
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/invalid password/i);
    });

    it('should identify unregistered users and guide them to register', async () => {
      const res = await authenticateUser({
        identifier: 'TCH-1003',
        password: 'password123',
        loginType: 'user'
      });
      expect(res.success).toBe(false);
      expect(res.isUnregistered).toBe(true);
    });
  });

  describe('Administrator Authentication Contracts', () => {
    it('should authenticate admin using admin email', async () => {
      const res = await authenticateUser({
        identifier: ADMIN_CREDENTIALS.email,
        password: ADMIN_CREDENTIALS.password,
        loginType: 'admin'
      });
      expect(res.success).toBe(true);
      expect(res.user.role).toBe('admin');
    });

    it('should authenticate admin using admin ID', async () => {
      const res = await authenticateUser({
        identifier: ADMIN_CREDENTIALS.admin_id,
        password: ADMIN_CREDENTIALS.password,
        loginType: 'admin'
      });
      expect(res.success).toBe(true);
      expect(res.user.role).toBe('admin');
    });

    it('should reject invalid admin credentials', async () => {
      const res = await authenticateUser({
        identifier: ADMIN_CREDENTIALS.email,
        password: 'wrongAdminPassword',
        loginType: 'admin'
      });
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/invalid.*password/i);
    });
  });
});
