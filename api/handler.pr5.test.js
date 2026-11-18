import { describe, expect, it } from 'vitest';
import { actorMatchesPrincipal } from './handler.js';

describe('resource_acl principal matching', () => {
  const actor = {
    id: 'usr_1',
    email: 'student@school.edu',
    user_type: 'student',
    class_grade: 'grade-10',
  };

  it('matches user_type and class_grade principals', () => {
    expect(actorMatchesPrincipal(actor, 'user_type', 'student')).toBe(true);
    expect(actorMatchesPrincipal(actor, 'user_type', 'teacher')).toBe(false);
    expect(actorMatchesPrincipal(actor, 'class_grade', 'grade-10')).toBe(true);
    expect(actorMatchesPrincipal(actor, 'class_grade', 'grade-8')).toBe(false);
  });

  it('matches user id or email', () => {
    expect(actorMatchesPrincipal(actor, 'user', 'usr_1')).toBe(true);
    expect(actorMatchesPrincipal(actor, 'user', 'student@school.edu')).toBe(true);
    expect(actorMatchesPrincipal(actor, 'user', 'other@school.edu')).toBe(false);
  });
});