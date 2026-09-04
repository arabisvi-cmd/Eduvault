import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { provisionInstitutionUser } from '../../lib/provisioning';
import { 
  Users, UserCheck, GraduationCap, BookOpen, Plus, Search, 
  Trash2, Calendar, AlertTriangle, CheckCircle, ArrowRight,
  Book, Folder, UserPlus, Link, ShieldCheck
} from 'lucide-react';
import {
  Button,
  IconButton,
  Input,
  Select,
  FormField,
  SummaryCard,
  Badge,
  Modal,
  EmptyState,
  PageHeader,
  DataTable
} from '../ui';

function getInitials(nameOrEmail) {
  if (!nameOrEmail) return 'U';
  const clean = nameOrEmail.trim();
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

export default function AdminPeopleHub({ userProfile }) {
  // Tabs: 'overview' | 'teachers' | 'students' | 'assignments'
  const [activeTab, setActiveTab] = useState('overview');

  // Core Data
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [enrollments, setEnrollments] = useState([]);

  // Filter & Search states
  const [teacherSearch, setTeacherSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [assignmentsSubTab, setAssignmentsSubTab] = useState('teachers'); // 'teachers' | 'students'

  // Loading & Feedback
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message: string }

  // Modal States
  const [activeModal, setActiveModal] = useState(null); // 'assign-teacher' | 'enroll-student' | 'delete-confirm' | 'user-detail'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Forms State
  const [assignmentForm, setAssignmentForm] = useState({ teacherId: '', subjectId: '' });
  const [enrollmentForm, setEnrollmentForm] = useState({ studentId: '', subjectId: '' });
  const [inviteForm, setInviteForm] = useState({ fullName: '', email: '', role: 'TEACHER' });

  // Delete Confirmation State
  const [deleteContext, setDeleteContext] = useState(null); // { type: 'assignment'|'enrollment', id, title, personName, subjectName }

  // Detail Modal State
  const [detailUser, setDetailUser] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch all institution people & academic data
  const fetchData = useCallback(async () => {
    if (!userProfile?.institution_id) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch Users in Institution
      const { data: usersData, error: usersErr } = await supabase
        .from('users')
        .select('*')
        .eq('institution_id', userProfile.institution_id)
        .order('full_name', { ascending: true });
      if (usersErr) throw usersErr;

      const instTeachers = (usersData || []).filter(u => u.role === 'TEACHER');
      const instStudents = (usersData || []).filter(u => u.role === 'STUDENT');
      setTeachers(instTeachers);
      setStudents(instStudents);

      // 2. Fetch Subjects with complete academic hierarchy
      const { data: subjData, error: subjErr } = await supabase
        .from('subjects')
        .select(`
          id, name, code, created_at,
          term:terms(
            id, name,
            program:programs(
              id, name,
              academic_year:academic_years(id, name, institution_id, is_active)
            )
          )
        `)
        .order('name', { ascending: true });
      if (subjErr) throw subjErr;

      // Ensure subjects belong to this institution
      const instSubjects = (subjData || []).filter(
        s => s.term?.program?.academic_year?.institution_id === userProfile.institution_id
      );
      setSubjects(instSubjects);

      // 3. Fetch Teacher Assignments
      const { data: assignData, error: assignErr } = await supabase
        .from('teacher_assignments')
        .select(`
          id, created_at, user_id, subject_id,
          user:users(id, full_name, email, role, institution_id),
          subject:subjects(
            id, name, code,
            term:terms(
              id, name,
              program:programs(
                id, name,
                academic_year:academic_years(id, name, institution_id)
              )
            )
          )
        `)
        .order('created_at', { ascending: false });
      if (assignErr) throw assignErr;

      const instAssignments = (assignData || []).filter(
        a => a.user?.institution_id === userProfile.institution_id
      );
      setAssignments(instAssignments);

      // 4. Fetch Student Enrollments
      const { data: enrollData, error: enrollErr } = await supabase
        .from('student_enrollments')
        .select(`
          id, created_at, user_id, subject_id,
          user:users(id, full_name, email, role, institution_id),
          subject:subjects(
            id, name, code,
            term:terms(
              id, name,
              program:programs(
                id, name,
                academic_year:academic_years(id, name, institution_id)
              )
            )
          )
        `)
        .order('created_at', { ascending: false });
      if (enrollErr) throw enrollErr;

      const instEnrollments = (enrollData || []).filter(
        e => e.user?.institution_id === userProfile.institution_id
      );
      setEnrollments(instEnrollments);

    } catch (err) {
      console.error('Error fetching People & Assignment data:', err);
      setError('Unable to load institutional people and academic assignments. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [userProfile]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Create Teacher Assignment
  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    setFormErrors({});
    const errors = {};

    if (!assignmentForm.teacherId) errors.teacherId = 'Please select a faculty member.';
    if (!assignmentForm.subjectId) errors.subjectId = 'Please select a subject.';

    // Check duplicate locally
    const alreadyAssigned = assignments.some(
      a => a.user_id === assignmentForm.teacherId && a.subject_id === assignmentForm.subjectId
    );
    if (alreadyAssigned) {
      errors.subjectId = 'This faculty member is already assigned to this subject.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error: insErr } = await supabase
        .from('teacher_assignments')
        .insert([{
          user_id: assignmentForm.teacherId,
          subject_id: assignmentForm.subjectId
        }])
        .select()
        .single();

      if (insErr) {
        if (insErr.code === '23505') {
          throw new Error('This faculty member is already assigned to this subject.');
        }
        throw insErr;
      }

      showToast('Teacher assigned to subject successfully.');
      setActiveModal(null);
      setAssignmentForm({ teacherId: '', subjectId: '' });
      fetchData();
    } catch (err) {
      setFormErrors({ form: err.message || 'Failed to assign teacher.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Create Student Enrollment
  const handleCreateEnrollment = async (e) => {
    e.preventDefault();
    setFormErrors({});
    const errors = {};

    if (!enrollmentForm.studentId) errors.studentId = 'Please select a student.';
    if (!enrollmentForm.subjectId) errors.subjectId = 'Please select a subject.';

    // Check duplicate locally
    const alreadyEnrolled = enrollments.some(
      e => e.user_id === enrollmentForm.studentId && e.subject_id === enrollmentForm.subjectId
    );
    if (alreadyEnrolled) {
      errors.subjectId = 'This student is already enrolled in this subject.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error: insErr } = await supabase
        .from('student_enrollments')
        .insert([{
          user_id: enrollmentForm.studentId,
          subject_id: enrollmentForm.subjectId
        }])
        .select()
        .single();

      if (insErr) {
        if (insErr.code === '23505') {
          throw new Error('This student is already enrolled in this subject.');
        }
        throw insErr;
      }

      showToast('Student enrolled in subject successfully.');
      setActiveModal(null);
      setEnrollmentForm({ studentId: '', subjectId: '' });
      fetchData();
    } catch (err) {
      setFormErrors({ form: err.message || 'Failed to enroll student.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Secure Provisioning of Teacher or Student
  const handleInviteUser = async (e) => {
    if (e) e.preventDefault();
    setFormErrors({});
    const errors = {};

    const cleanFullName = (inviteForm.fullName || '').trim();
    const cleanEmail = (inviteForm.email || '').trim().toLowerCase();

    if (!cleanFullName) {
      errors.fullName = 'Please enter a full name.';
    } else if (cleanFullName.length < 2) {
      errors.fullName = 'Full name must be at least 2 characters.';
    }

    if (!cleanEmail) {
      errors.email = 'Please enter an institutional email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      errors.email = 'Please enter a valid email address.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await provisionInstitutionUser({
        email: cleanEmail,
        fullName: cleanFullName,
        role: inviteForm.role
      });

      if (!result.success) {
        if (result.code === 'INVALID_EMAIL') {
          setFormErrors({ email: result.error });
        } else if (result.code === 'INVALID_NAME') {
          setFormErrors({ fullName: result.error });
        } else {
          setFormErrors({ form: result.error || 'Failed to provision user.' });
        }
        return;
      }

      showToast(result.message || `${inviteForm.role === 'TEACHER' ? 'Teacher' : 'Student'} provisioned successfully.`);
      setActiveModal(null);
      setInviteForm({ fullName: '', email: '', role: 'TEACHER' });
      await fetchData();
    } catch (err) {
      setFormErrors({ form: err.message || 'Unexpected error occurred while provisioning user.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Relationship
  const confirmDeleteRelationship = async () => {
    if (!deleteContext) return;
    setIsSubmitting(true);

    try {
      const table = deleteContext.type === 'assignment' ? 'teacher_assignments' : 'student_enrollments';
      const { error: delErr } = await supabase
        .from(table)
        .delete()
        .eq('id', deleteContext.id);

      if (delErr) throw delErr;

      showToast(`${deleteContext.title} removed successfully.`);
      setActiveModal(null);
      setDeleteContext(null);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to remove academic relationship.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered Teachers
  const filteredTeachers = useMemo(() => {
    const q = teacherSearch.toLowerCase().trim();
    if (!q) return teachers;
    return teachers.filter(t => 
      (t.full_name || '').toLowerCase().includes(q) || 
      (t.email || '').toLowerCase().includes(q)
    );
  }, [teachers, teacherSearch]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    const q = studentSearch.toLowerCase().trim();
    if (!q) return students;
    return students.filter(s => 
      (s.full_name || '').toLowerCase().includes(q) || 
      (s.email || '').toLowerCase().includes(q)
    );
  }, [students, studentSearch]);

  // Check Role Access
  if (userProfile?.role !== 'ADMIN') {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Administrative Access Required"
        description="The People and Academic Assignment Hub is restricted to institutional administrators."
      />
    );
  }

  // --- RENDER TABS ---

  // 1. Overview Tab
  const renderOverview = () => (
    <div>
      {/* 4 Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <SummaryCard
          icon={UserCheck}
          title="Faculty Instructors"
          value={teachers.length}
          description="Verified teachers authorized to author curriculum and manage subject vaults."
          action={
            <Button 
              variant="secondary" 
              size="compact" 
              iconRight={ArrowRight}
              onClick={() => setActiveTab('teachers')}
            >
              View Teachers
            </Button>
          }
        />

        <SummaryCard
          icon={GraduationCap}
          title="Enrolled Students"
          value={students.length}
          description="Registered scholars with access to published learning materials."
          action={
            <Button 
              variant="secondary" 
              size="compact" 
              iconRight={ArrowRight}
              onClick={() => setActiveTab('students')}
            >
              View Students
            </Button>
          }
        />

        <SummaryCard
          icon={Link}
          title="Teacher Assignments"
          value={assignments.length}
          description="Active instructional links between faculty and official subjects."
          action={
            <Button 
              variant="secondary" 
              size="compact" 
              iconRight={ArrowRight}
              onClick={() => { setActiveTab('assignments'); setAssignmentsSubTab('teachers'); }}
            >
              Manage Assignments
            </Button>
          }
        />

        <SummaryCard
          icon={BookOpen}
          title="Course Enrollments"
          value={enrollments.length}
          description="Active student registrations across official academic courses."
          action={
            <Button 
              variant="secondary" 
              size="compact" 
              iconRight={ArrowRight}
              onClick={() => { setActiveTab('assignments'); setAssignmentsSubTab('students'); }}
            >
              Manage Enrollments
            </Button>
          }
        />
      </div>

      {/* Two Column Summary: Faculty Quick-Roster vs Student Enrollments */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px' }}>
        {/* Recent Teacher Assignments Card */}
        <div className="ev-surface-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserCheck size={18} style={{ color: 'var(--ev-primary)' }} />
              Active Faculty Assignments
            </h3>
            <Button 
              variant="primary" 
              size="compact" 
              icon={Plus}
              disabled={teachers.length === 0 || subjects.length === 0}
              onClick={() => {
                setFormErrors({});
                setAssignmentForm({ teacherId: teachers[0]?.id || '', subjectId: subjects[0]?.id || '' });
                setActiveModal('assign-teacher');
              }}
            >
              Assign Faculty
            </Button>
          </div>

          {assignments.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--ev-text-secondary)', fontSize: '13px' }}>
              No faculty members have been assigned to subjects yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {assignments.slice(0, 6).map(a => (
                <div 
                  key={a.id} 
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    background: 'var(--ev-surface-elevated)',
                    border: '1px solid var(--ev-border)',
                    borderRadius: '8px'
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ev-text)' }}>
                      {a.user?.full_name || 'Faculty Member'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--ev-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: 'var(--ev-primary)', fontWeight: 500 }}>{a.subject?.name}</span>
                      {a.subject?.code && <span>({a.subject.code})</span>}
                      <span>•</span>
                      <span>{a.subject?.term?.name}</span>
                    </div>
                  </div>
                  <IconButton
                    icon={Trash2}
                    variant="danger-outline"
                    size="compact"
                    title="Remove assignment"
                    onClick={() => {
                      setDeleteContext({
                        type: 'assignment',
                        id: a.id,
                        title: 'Teacher Assignment',
                        personName: a.user?.full_name || 'Faculty',
                        subjectName: a.subject?.name || 'Subject'
                      });
                      setActiveModal('delete-confirm');
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Student Enrollments Card */}
        <div className="ev-surface-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <GraduationCap size={18} style={{ color: 'var(--ev-primary)' }} />
              Active Course Enrollments
            </h3>
            <Button 
              variant="primary" 
              size="compact" 
              icon={Plus}
              disabled={students.length === 0 || subjects.length === 0}
              onClick={() => {
                setFormErrors({});
                setEnrollmentForm({ studentId: students[0]?.id || '', subjectId: subjects[0]?.id || '' });
                setActiveModal('enroll-student');
              }}
            >
              Enroll Student
            </Button>
          </div>

          {enrollments.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--ev-text-secondary)', fontSize: '13px' }}>
              No students have been enrolled in courses yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {enrollments.slice(0, 6).map(e => (
                <div 
                  key={e.id} 
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    background: 'var(--ev-surface-elevated)',
                    border: '1px solid var(--ev-border)',
                    borderRadius: '8px'
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ev-text)' }}>
                      {e.user?.full_name || 'Student'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--ev-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: 'var(--ev-primary)', fontWeight: 500 }}>{e.subject?.name}</span>
                      {e.subject?.code && <span>({e.subject.code})</span>}
                      <span>•</span>
                      <span>{e.subject?.term?.name}</span>
                    </div>
                  </div>
                  <IconButton
                    icon={Trash2}
                    variant="danger-outline"
                    size="compact"
                    title="Remove enrollment"
                    onClick={() => {
                      setDeleteContext({
                        type: 'enrollment',
                        id: e.id,
                        title: 'Student Enrollment',
                        personName: e.user?.full_name || 'Student',
                        subjectName: e.subject?.name || 'Subject'
                      });
                      setActiveModal('delete-confirm');
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // 2. Teachers Directory Tab
  const renderTeachers = () => (
    <div>
      <PageHeader
        title="Teachers Directory"
        description="Verified institutional faculty instructors with teaching assignments and curriculum authoring permissions."
        actions={
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button 
              variant="primary" 
              icon={UserPlus}
              onClick={() => {
                setFormErrors({});
                setInviteForm({ fullName: '', email: '', role: 'TEACHER' });
                setActiveModal('invite-teacher');
              }}
            >
              Invite Teacher
            </Button>
            <Button 
              variant="secondary" 
              icon={Plus}
              disabled={teachers.length === 0 || subjects.length === 0}
              onClick={() => {
                setFormErrors({});
                setAssignmentForm({ teacherId: teachers[0]?.id || '', subjectId: subjects[0]?.id || '' });
                setActiveModal('assign-teacher');
              }}
            >
              Assign Faculty to Subject
            </Button>
          </div>
        }
      >
        {/* Search Toolbar */}
        <div style={{ maxWidth: '340px', marginBottom: '20px' }}>
          <Input
            placeholder="Search faculty by name or email..."
            value={teacherSearch}
            onChange={(e) => setTeacherSearch(e.target.value)}
          />
        </div>
      </PageHeader>

      <DataTable
        loading={loading}
        data={filteredTeachers}
        emptyTitle="No teachers found"
        emptyDescription={
          teachers.length === 0 
            ? "No users with the TEACHER role currently exist in your institution. Invite faculty instructors to get started."
            : "No teachers match your search query."
        }
        emptyActionLabel={teachers.length === 0 ? "Invite Teacher" : undefined}
        emptyActionIcon={teachers.length === 0 ? UserPlus : undefined}
        onEmptyAction={teachers.length === 0 ? () => {
          setFormErrors({});
          setInviteForm({ fullName: '', email: '', role: 'TEACHER' });
          setActiveModal('invite-teacher');
        } : undefined}
        columns={[
          {
            key: 'name',
            header: 'Faculty Member',
            render: (row) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: 'var(--ev-primary-light)',
                  color: 'var(--ev-primary)',
                  fontWeight: 700,
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid var(--ev-border)'
                }}>
                  {getInitials(row.full_name || row.email)}
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--ev-text)' }}>{row.full_name || 'Faculty Member'}</div>
                  <div style={{ fontSize: '12px', color: 'var(--ev-text-secondary)' }}>{row.email}</div>
                </div>
              </div>
            )
          },
          {
            key: 'status',
            header: 'Status',
            render: () => <Badge status="active">Active</Badge>
          },
          {
            key: 'assignments',
            header: 'Assigned Subjects',
            render: (row) => {
              const myAssignments = assignments.filter(a => a.user_id === row.id);
              if (myAssignments.length === 0) {
                return <span style={{ color: 'var(--ev-text-secondary)', fontSize: '12px' }}>None assigned</span>;
              }
              return (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {myAssignments.map(a => (
                    <span 
                      key={a.id} 
                      style={{
                        background: 'var(--ev-primary-light)',
                        color: 'var(--ev-primary)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600
                      }}
                      title={`${a.subject?.name} (${a.subject?.code || ''}) • ${a.subject?.term?.name || ''}`}
                    >
                      {a.subject?.name} {a.subject?.code ? `[${a.subject.code}]` : ''}
                    </span>
                  ))}
                </div>
              );
            }
          },
          {
            key: 'actions',
            header: 'Actions',
            align: 'right',
            render: (row) => (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                <Button
                  variant="secondary"
                  size="compact"
                  icon={Plus}
                  disabled={subjects.length === 0}
                  onClick={() => {
                    setFormErrors({});
                    setAssignmentForm({ teacherId: row.id, subjectId: subjects[0]?.id || '' });
                    setActiveModal('assign-teacher');
                  }}
                >
                  Assign
                </Button>
                <Button
                  variant="tertiary"
                  size="compact"
                  onClick={() => {
                    setDetailUser({ user: row, role: 'TEACHER', items: assignments.filter(a => a.user_id === row.id) });
                    setActiveModal('user-detail');
                  }}
                >
                  View Details
                </Button>
              </div>
            )
          }
        ]}
      />
    </div>
  );

  // 3. Students Directory Tab
  const renderStudents = () => (
    <div>
      <PageHeader
        title="Students Directory"
        description="Enrolled institutional scholars with access to course materials and announcements."
        actions={
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button 
              variant="primary" 
              icon={UserPlus}
              onClick={() => {
                setFormErrors({});
                setInviteForm({ fullName: '', email: '', role: 'STUDENT' });
                setActiveModal('invite-student');
              }}
            >
              Invite Student
            </Button>
            <Button 
              variant="secondary" 
              icon={Plus}
              disabled={students.length === 0 || subjects.length === 0}
              onClick={() => {
                setFormErrors({});
                setEnrollmentForm({ studentId: students[0]?.id || '', subjectId: subjects[0]?.id || '' });
                setActiveModal('enroll-student');
              }}
            >
              Enroll Student in Subject
            </Button>
          </div>
        }
      >
        {/* Search Toolbar */}
        <div style={{ maxWidth: '340px', marginBottom: '20px' }}>
          <Input
            placeholder="Search students by name or email..."
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
          />
        </div>
      </PageHeader>

      <DataTable
        loading={loading}
        data={filteredStudents}
        emptyTitle="No students found"
        emptyDescription={
          students.length === 0 
            ? "No users with the STUDENT role currently exist in your institution. Invite scholars to get started."
            : "No students match your search query."
        }
        emptyActionLabel={students.length === 0 ? "Invite Student" : undefined}
        emptyActionIcon={students.length === 0 ? UserPlus : undefined}
        onEmptyAction={students.length === 0 ? () => {
          setFormErrors({});
          setInviteForm({ fullName: '', email: '', role: 'STUDENT' });
          setActiveModal('invite-student');
        } : undefined}
        columns={[
          {
            key: 'name',
            header: 'Scholar / Student',
            render: (row) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: 'var(--ev-primary-light)',
                  color: 'var(--ev-primary)',
                  fontWeight: 700,
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid var(--ev-border)'
                }}>
                  {getInitials(row.full_name || row.email)}
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--ev-text)' }}>{row.full_name || 'Student'}</div>
                  <div style={{ fontSize: '12px', color: 'var(--ev-text-secondary)' }}>{row.email}</div>
                </div>
              </div>
            )
          },
          {
            key: 'status',
            header: 'Status',
            render: () => <Badge status="active">Active</Badge>
          },
          {
            key: 'enrollments',
            header: 'Enrolled Courses',
            render: (row) => {
              const myEnrollments = enrollments.filter(e => e.user_id === row.id);
              if (myEnrollments.length === 0) {
                return <span style={{ color: 'var(--ev-text-secondary)', fontSize: '12px' }}>None enrolled</span>;
              }
              return (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {myEnrollments.map(e => (
                    <span 
                      key={e.id} 
                      style={{
                        background: 'var(--ev-surface-elevated)',
                        color: 'var(--ev-text)',
                        border: '1px solid var(--ev-border)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 500
                      }}
                      title={`${e.subject?.name} (${e.subject?.code || ''}) • ${e.subject?.term?.name || ''}`}
                    >
                      {e.subject?.name} {e.subject?.code ? `[${e.subject.code}]` : ''}
                    </span>
                  ))}
                </div>
              );
            }
          },
          {
            key: 'actions',
            header: 'Actions',
            align: 'right',
            render: (row) => (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                <Button
                  variant="secondary"
                  size="compact"
                  icon={Plus}
                  disabled={subjects.length === 0}
                  onClick={() => {
                    setFormErrors({});
                    setEnrollmentForm({ studentId: row.id, subjectId: subjects[0]?.id || '' });
                    setActiveModal('enroll-student');
                  }}
                >
                  Enroll
                </Button>
                <Button
                  variant="tertiary"
                  size="compact"
                  onClick={() => {
                    setDetailUser({ user: row, role: 'STUDENT', items: enrollments.filter(e => e.user_id === row.id) });
                    setActiveModal('user-detail');
                  }}
                >
                  View Details
                </Button>
              </div>
            )
          }
        ]}
      />
    </div>
  );

  // 4. Assignments & Enrollments Master Tab
  const renderAssignments = () => (
    <div>
      <PageHeader
        title="Academic Assignments & Enrollments"
        description="Comprehensive matrix of faculty teaching allocations and student course enrollments."
        actions={
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button 
              variant="secondary" 
              icon={UserCheck}
              disabled={teachers.length === 0 || subjects.length === 0}
              onClick={() => {
                setFormErrors({});
                setAssignmentForm({ teacherId: teachers[0]?.id || '', subjectId: subjects[0]?.id || '' });
                setActiveModal('assign-teacher');
              }}
            >
              Add Faculty Assignment
            </Button>
            <Button 
              variant="primary" 
              icon={GraduationCap}
              disabled={students.length === 0 || subjects.length === 0}
              onClick={() => {
                setFormErrors({});
                setEnrollmentForm({ studentId: students[0]?.id || '', subjectId: subjects[0]?.id || '' });
                setActiveModal('enroll-student');
              }}
            >
              Add Student Enrollment
            </Button>
          </div>
        }
      >
        {/* Sub-tab switcher */}
        <div className="ev-tabs-bar" style={{ marginBottom: '20px' }}>
          <button
            type="button"
            className={`ev-tab-btn ${assignmentsSubTab === 'teachers' ? 'active' : ''}`}
            onClick={() => setAssignmentsSubTab('teachers')}
          >
            <UserCheck size={14} />
            Teacher Assignments ({assignments.length})
          </button>
          <button
            type="button"
            className={`ev-tab-btn ${assignmentsSubTab === 'students' ? 'active' : ''}`}
            onClick={() => setAssignmentsSubTab('students')}
          >
            <GraduationCap size={14} />
            Student Enrollments ({enrollments.length})
          </button>
        </div>
      </PageHeader>

      {assignmentsSubTab === 'teachers' ? (
        <DataTable
          loading={loading}
          data={assignments}
          emptyTitle="No teacher assignments"
          emptyDescription="Assign a faculty instructor to an official subject to give them course vault management access."
          emptyActionLabel="Assign Faculty"
          emptyActionIcon={Plus}
          onEmptyAction={() => {
            setFormErrors({});
            setAssignmentForm({ teacherId: teachers[0]?.id || '', subjectId: subjects[0]?.id || '' });
            setActiveModal('assign-teacher');
          }}
          columns={[
            {
              key: 'faculty',
              header: 'Faculty Member',
              render: (row) => (
                <div>
                  <div style={{ fontWeight: 600 }}>{row.user?.full_name || 'Faculty'}</div>
                  <div style={{ fontSize: '12px', color: 'var(--ev-text-secondary)' }}>{row.user?.email}</div>
                </div>
              )
            },
            {
              key: 'subject',
              header: 'Official Subject',
              render: (row) => (
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--ev-primary)' }}>{row.subject?.name}</div>
                  {row.subject?.code && (
                    <div style={{ fontSize: '11px', color: 'var(--ev-text-secondary)' }}>
                      Code: {row.subject.code}
                    </div>
                  )}
                </div>
              )
            },
            {
              key: 'context',
              header: 'Academic Placement',
              render: (row) => (
                <div>
                  <div style={{ fontWeight: 500 }}>{row.subject?.term?.name || '—'}</div>
                  <div style={{ fontSize: '11px', color: 'var(--ev-text-secondary)' }}>
                    {row.subject?.term?.program?.name} • {row.subject?.term?.program?.academic_year?.name}
                  </div>
                </div>
              )
            },
            {
              key: 'date',
              header: 'Assigned Date',
              render: (row) => (
                <span style={{ color: 'var(--ev-text-secondary)' }}>
                  {row.created_at ? new Date(row.created_at).toLocaleDateString() : '—'}
                </span>
              )
            },
            {
              key: 'actions',
              header: 'Actions',
              align: 'right',
              render: (row) => (
                <IconButton
                  icon={Trash2}
                  variant="danger-outline"
                  size="compact"
                  title="Remove assignment"
                  onClick={() => {
                    setDeleteContext({
                      type: 'assignment',
                      id: row.id,
                      title: 'Teacher Assignment',
                      personName: row.user?.full_name || 'Faculty',
                      subjectName: row.subject?.name || 'Subject'
                    });
                    setActiveModal('delete-confirm');
                  }}
                />
              )
            }
          ]}
        />
      ) : (
        <DataTable
          loading={loading}
          data={enrollments}
          emptyTitle="No student enrollments"
          emptyDescription="Enroll students in official subjects to give them access to published course documents."
          emptyActionLabel="Enroll Student"
          emptyActionIcon={Plus}
          onEmptyAction={() => {
            setFormErrors({});
            setEnrollmentForm({ studentId: students[0]?.id || '', subjectId: subjects[0]?.id || '' });
            setActiveModal('enroll-student');
          }}
          columns={[
            {
              key: 'student',
              header: 'Scholar / Student',
              render: (row) => (
                <div>
                  <div style={{ fontWeight: 600 }}>{row.user?.full_name || 'Student'}</div>
                  <div style={{ fontSize: '12px', color: 'var(--ev-text-secondary)' }}>{row.user?.email}</div>
                </div>
              )
            },
            {
              key: 'subject',
              header: 'Official Subject',
              render: (row) => (
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--ev-primary)' }}>{row.subject?.name}</div>
                  {row.subject?.code && (
                    <div style={{ fontSize: '11px', color: 'var(--ev-text-secondary)' }}>
                      Code: {row.subject.code}
                    </div>
                  )}
                </div>
              )
            },
            {
              key: 'context',
              header: 'Academic Placement',
              render: (row) => (
                <div>
                  <div style={{ fontWeight: 500 }}>{row.subject?.term?.name || '—'}</div>
                  <div style={{ fontSize: '11px', color: 'var(--ev-text-secondary)' }}>
                    {row.subject?.term?.program?.name} • {row.subject?.term?.program?.academic_year?.name}
                  </div>
                </div>
              )
            },
            {
              key: 'date',
              header: 'Enrollment Date',
              render: (row) => (
                <span style={{ color: 'var(--ev-text-secondary)' }}>
                  {row.created_at ? new Date(row.created_at).toLocaleDateString() : '—'}
                </span>
              )
            },
            {
              key: 'actions',
              header: 'Actions',
              align: 'right',
              render: (row) => (
                <IconButton
                  icon={Trash2}
                  variant="danger-outline"
                  size="compact"
                  title="Remove enrollment"
                  onClick={() => {
                    setDeleteContext({
                      type: 'enrollment',
                      id: row.id,
                      title: 'Student Enrollment',
                      personName: row.user?.full_name || 'Student',
                      subjectName: row.subject?.name || 'Subject'
                    });
                    setActiveModal('delete-confirm');
                  }}
                />
              )
            }
          ]}
        />
      )}
    </div>
  );

  return (
    <div style={{ padding: '0', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 10000,
          background: toast.type === 'error' ? '#DC2626' : 'var(--ev-primary)',
          color: '#FFFFFF',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: 'var(--ev-shadow-lg)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13px',
          fontWeight: 500,
          animation: 'ev-modal-enter 0.2s ease-out'
        }}>
          <CheckCircle size={16} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Main Header */}
      <PageHeader
        title="People & Academic Assignments"
        description="Manage institutional teachers, students, and course allocations across the official academic structure."
      >
        {/* Navigation Tabs */}
        <div className="ev-tabs-bar">
          <button 
            type="button" 
            className={`ev-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            type="button" 
            className={`ev-tab-btn ${activeTab === 'teachers' ? 'active' : ''}`}
            onClick={() => setActiveTab('teachers')}
          >
            <UserCheck size={14} />
            Teachers ({teachers.length})
          </button>
          <button 
            type="button" 
            className={`ev-tab-btn ${activeTab === 'students' ? 'active' : ''}`}
            onClick={() => setActiveTab('students')}
          >
            <GraduationCap size={14} />
            Students ({students.length})
          </button>
          <button 
            type="button" 
            className={`ev-tab-btn ${activeTab === 'assignments' ? 'active' : ''}`}
            onClick={() => setActiveTab('assignments')}
          >
            <Link size={14} />
            Assignments & Enrollments ({assignments.length + enrollments.length})
          </button>
        </div>
      </PageHeader>

      {/* Global Error Banner */}
      {error && (
        <div style={{
          background: 'rgba(220, 38, 38, 0.1)',
          border: '1px solid rgba(220, 38, 38, 0.3)',
          color: '#DC2626',
          padding: '14px 18px',
          borderRadius: '8px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13px'
        }}>
          <AlertTriangle size={18} />
          <div style={{ flex: 1 }}>{error}</div>
          <Button variant="secondary" size="compact" onClick={fetchData}>Retry</Button>
        </div>
      )}

      {/* Active Tab Content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'teachers' && renderTeachers()}
      {activeTab === 'students' && renderStudents()}
      {activeTab === 'assignments' && renderAssignments()}

      {/* MODAL: Invite Teacher */}
      <Modal
        isOpen={activeModal === 'invite-teacher'}
        onClose={() => !isSubmitting && setActiveModal(null)}
        title="Invite Teacher"
        description="Provision an institutional faculty account with curriculum authoring permissions."
        footer={
          <>
            <Button variant="secondary" onClick={() => setActiveModal(null)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleInviteUser} loading={isSubmitting} icon={UserPlus}>
              Send Invitation
            </Button>
          </>
        }
      >
        <form onSubmit={handleInviteUser}>
          {formErrors.form && (
            <div style={{ color: '#DC2626', fontSize: '13px', marginBottom: '14px', padding: '10px', background: 'rgba(220, 38, 38, 0.08)', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <div>{formErrors.form}</div>
            </div>
          )}

          <FormField
            label="Full Name"
            required
            helperText="Faculty instructor's official academic name (e.g., Dr. Jane Smith)."
            error={formErrors.fullName}
          >
            <Input
              placeholder="e.g. Dr. Jane Smith"
              value={inviteForm.fullName}
              onChange={(e) => setInviteForm({ ...inviteForm, fullName: e.target.value })}
              error={!!formErrors.fullName}
              disabled={isSubmitting}
            />
          </FormField>

          <FormField
            label="Institutional Email"
            required
            helperText="Official university or school email address used for portal login."
            error={formErrors.email}
          >
            <Input
              type="email"
              placeholder="teacher@institution.edu"
              value={inviteForm.email}
              onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              error={!!formErrors.email}
              disabled={isSubmitting}
            />
          </FormField>

          <FormField
            label="Institutional Role"
            helperText="Security role is fixed for this invitation workflow."
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'var(--ev-surface-elevated)', border: '1px solid var(--ev-border)', borderRadius: '6px' }}>
              <Badge status="current">TEACHER</Badge>
              <span style={{ fontSize: '12px', color: 'var(--ev-text-secondary)' }}>
                Faculty Instructor & Course Vault Author
              </span>
            </div>
          </FormField>
        </form>
      </Modal>

      {/* MODAL: Invite Student */}
      <Modal
        isOpen={activeModal === 'invite-student'}
        onClose={() => !isSubmitting && setActiveModal(null)}
        title="Invite Student"
        description="Register an institutional scholar to receive course enrollment and study materials access."
        footer={
          <>
            <Button variant="secondary" onClick={() => setActiveModal(null)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleInviteUser} loading={isSubmitting} icon={UserPlus}>
              Send Invitation
            </Button>
          </>
        }
      >
        <form onSubmit={handleInviteUser}>
          {formErrors.form && (
            <div style={{ color: '#DC2626', fontSize: '13px', marginBottom: '14px', padding: '10px', background: 'rgba(220, 38, 38, 0.08)', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <div>{formErrors.form}</div>
            </div>
          )}

          <FormField
            label="Full Name"
            required
            helperText="Student's official academic name (e.g., Alex Johnson)."
            error={formErrors.fullName}
          >
            <Input
              placeholder="e.g. Alex Johnson"
              value={inviteForm.fullName}
              onChange={(e) => setInviteForm({ ...inviteForm, fullName: e.target.value })}
              error={!!formErrors.fullName}
              disabled={isSubmitting}
            />
          </FormField>

          <FormField
            label="Institutional Email"
            required
            helperText="Student email address for portal authentication and notices."
            error={formErrors.email}
          >
            <Input
              type="email"
              placeholder="student@institution.edu"
              value={inviteForm.email}
              onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              error={!!formErrors.email}
              disabled={isSubmitting}
            />
          </FormField>

          <FormField
            label="Institutional Role"
            helperText="Security role is fixed for this invitation workflow."
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'var(--ev-surface-elevated)', border: '1px solid var(--ev-border)', borderRadius: '6px' }}>
              <Badge status="current">STUDENT</Badge>
              <span style={{ fontSize: '12px', color: 'var(--ev-text-secondary)' }}>
                Enrolled Scholar & Course Learner
              </span>
            </div>
          </FormField>
        </form>
      </Modal>

      {/* MODAL 1: Assign Faculty to Subject */}
      <Modal
        isOpen={activeModal === 'assign-teacher'}
        onClose={() => setActiveModal(null)}
        title="Assign Faculty to Subject"
        description="Allocate an instructional role to a faculty member for an official subject."
        footer={
          <>
            <Button variant="secondary" onClick={() => setActiveModal(null)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateAssignment} loading={isSubmitting}>
              Add Assignment
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateAssignment}>
          {formErrors.form && (
            <div style={{ color: '#DC2626', fontSize: '13px', marginBottom: '14px', padding: '10px', background: 'rgba(220, 38, 38, 0.08)', borderRadius: '6px' }}>
              {formErrors.form}
            </div>
          )}

          <FormField
            label="Faculty Member"
            required
            helperText="The verified teacher receiving instructional vault permissions."
            error={formErrors.teacherId}
          >
            <Select
              value={assignmentForm.teacherId}
              onChange={(e) => setAssignmentForm({ ...assignmentForm, teacherId: e.target.value })}
              error={!!formErrors.teacherId}
            >
              <option value="">-- Select Faculty Member --</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.full_name} ({t.email})</option>
              ))}
            </Select>
          </FormField>

          <FormField
            label="Official Subject"
            required
            helperText="Academic placement: Year → Program → Term → Subject."
            error={formErrors.subjectId}
          >
            <Select
              value={assignmentForm.subjectId}
              onChange={(e) => setAssignmentForm({ ...assignmentForm, subjectId: e.target.value })}
              error={!!formErrors.subjectId}
            >
              <option value="">-- Select Subject Course --</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.code ? `[${s.code}]` : ''} ({s.term?.name} • {s.term?.program?.name} • {s.term?.program?.academic_year?.name})
                </option>
              ))}
            </Select>
          </FormField>
        </form>
      </Modal>

      {/* MODAL 2: Enroll Student in Subject */}
      <Modal
        isOpen={activeModal === 'enroll-student'}
        onClose={() => setActiveModal(null)}
        title="Enroll Student in Subject"
        description="Register a student to receive access to published curriculum materials."
        footer={
          <>
            <Button variant="secondary" onClick={() => setActiveModal(null)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateEnrollment} loading={isSubmitting}>
              Enroll Student
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateEnrollment}>
          {formErrors.form && (
            <div style={{ color: '#DC2626', fontSize: '13px', marginBottom: '14px', padding: '10px', background: 'rgba(220, 38, 38, 0.08)', borderRadius: '6px' }}>
              {formErrors.form}
            </div>
          )}

          <FormField
            label="Scholar / Student"
            required
            helperText="The registered student being admitted to this course."
            error={formErrors.studentId}
          >
            <Select
              value={enrollmentForm.studentId}
              onChange={(e) => setEnrollmentForm({ ...enrollmentForm, studentId: e.target.value })}
              error={!!formErrors.studentId}
            >
              <option value="">-- Select Student --</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.full_name} ({s.email})</option>
              ))}
            </Select>
          </FormField>

          <FormField
            label="Official Subject"
            required
            helperText="Academic placement: Year → Program → Term → Subject."
            error={formErrors.subjectId}
          >
            <Select
              value={enrollmentForm.subjectId}
              onChange={(e) => setEnrollmentForm({ ...enrollmentForm, subjectId: e.target.value })}
              error={!!formErrors.subjectId}
            >
              <option value="">-- Select Subject Course --</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.code ? `[${s.code}]` : ''} ({s.term?.name} • {s.term?.program?.name} • {s.term?.program?.academic_year?.name})
                </option>
              ))}
            </Select>
          </FormField>
        </form>
      </Modal>

      {/* MODAL 3: Delete Relationship Confirmation */}
      <Modal
        isOpen={activeModal === 'delete-confirm'}
        onClose={() => setActiveModal(null)}
        title={`Remove ${deleteContext?.title || 'Academic Allocation'}?`}
        description={`Are you sure you want to remove the relationship between ${deleteContext?.personName} and "${deleteContext?.subjectName}"?`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setActiveModal(null)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDeleteRelationship} loading={isSubmitting}>
              Remove Allocation
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '12px', background: 'rgba(220, 38, 38, 0.08)', borderRadius: '8px' }}>
          <AlertTriangle size={20} style={{ color: '#DC2626', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '13px', color: 'var(--ev-text)', lineHeight: 1.4 }}>
            <strong>Access Revocation:</strong> Removing this relationship will immediately revoke the user's access to the subject vault and its course materials. Historical activity logs will be preserved.
          </div>
        </div>
      </Modal>

      {/* MODAL 4: User Profile Detail */}
      <Modal
        isOpen={activeModal === 'user-detail'}
        onClose={() => setActiveModal(null)}
        title={detailUser?.user?.full_name || 'Academic User'}
        description={`Institutional Profile & Course Schedule (${detailUser?.role || 'User'})`}
        footer={
          <Button variant="secondary" onClick={() => setActiveModal(null)}>
            Close
          </Button>
        }
      >
        {detailUser && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px', padding: '14px', background: 'var(--ev-surface-elevated)', borderRadius: '8px', border: '1px solid var(--ev-border)' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'var(--ev-primary)',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '15px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {getInitials(detailUser.user.full_name || detailUser.user.email)}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--ev-text)' }}>{detailUser.user.full_name}</div>
                <div style={{ fontSize: '12px', color: 'var(--ev-text-secondary)' }}>{detailUser.user.email}</div>
                <div style={{ marginTop: '4px' }}>
                  <Badge status="current">{detailUser.role}</Badge>
                </div>
              </div>
            </div>

            <h4 style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ev-text-secondary)', marginBottom: '10px' }}>
              {detailUser.role === 'TEACHER' ? 'Teaching Allocations' : 'Enrolled Course Units'} ({detailUser.items.length})
            </h4>

            {detailUser.items.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--ev-text-secondary)', fontSize: '13px', border: '1px dashed var(--ev-border)', borderRadius: '6px' }}>
                No active courses assigned or enrolled.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
                {detailUser.items.map(item => (
                  <div 
                    key={item.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      background: 'var(--ev-surface)',
                      border: '1px solid var(--ev-border)',
                      borderRadius: '6px'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13px' }}>{item.subject?.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--ev-text-secondary)' }}>
                        {item.subject?.term?.name} • {item.subject?.term?.program?.name}
                      </div>
                    </div>
                    {item.subject?.code && (
                      <span style={{ fontSize: '11px', background: 'var(--ev-primary-light)', color: 'var(--ev-primary)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                        {item.subject.code}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
