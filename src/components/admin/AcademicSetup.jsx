import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Calendar, Book, Folder, BookOpen, Plus, Edit2, Trash2, 
  CheckCircle, ArrowRight, School, Users, UserPlus, AlertTriangle
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

export default function AcademicSetup({ userProfile }) {
  // Navigation tabs: 'overview' | 'years' | 'programs' | 'terms' | 'subjects'
  const [activeTab, setActiveTab] = useState('overview');

  // Institution profile
  const [institution, setInstitution] = useState(null);

  // Entities state
  const [academicYears, setAcademicYears] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [terms, setTerms] = useState([]);
  const [subjects, setSubjects] = useState([]);

  // Faculty and students
  const [availableTeachers, setAvailableTeachers] = useState([]);
  const [availableStudents, setAvailableStudents] = useState([]);

  // Loading & Error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null); // { type: 'success'|'error', message: string }

  // Modals state
  const [activeModal, setActiveModal] = useState(null); // 'create-year' | 'create-program' | 'create-term' | 'create-subject' | 'delete-confirm' | 'edit-entity' | 'assign-people'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Entity being edited or deleted
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [deleteContext, setDeleteContext] = useState(null); // { table, id, name, type }

  // Form input states
  const [yearForm, setYearForm] = useState({ name: '', startDate: '', endDate: '', isActive: false });
  const [programForm, setProgramForm] = useState({ name: '', academicYearId: '' });
  const [termForm, setTermForm] = useState({ name: '', programId: '' });
  const [subjectForm, setSubjectForm] = useState({ name: '', code: '', termId: '' });

  // People Assignment Modal State for a Subject
  const [managingSubject, setManagingSubject] = useState(null);
  const [subjectAssignments, setSubjectAssignments] = useState([]);
  const [subjectEnrollments, setSubjectEnrollments] = useState([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Initial Data Fetch
  const fetchData = useCallback(async () => {
    if (!userProfile?.institution_id) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch institution
      const { data: instData } = await supabase
        .from('institutions')
        .select('*')
        .eq('id', userProfile.institution_id)
        .single();
      if (instData) setInstitution(instData);

      // 2. Fetch Academic Years
      const { data: yearsData, error: yearsErr } = await supabase
        .from('academic_years')
        .select('*')
        .eq('institution_id', userProfile.institution_id)
        .order('start_date', { ascending: false });
      if (yearsErr) throw yearsErr;
      setAcademicYears(yearsData || []);

      // 3. Fetch Programs with parent academic_year
      const { data: progData, error: progErr } = await supabase
        .from('programs')
        .select('*, academic_year:academic_years(id, name, institution_id)')
        .order('created_at', { ascending: true });
      if (progErr) throw progErr;
      // Filter to institution
      const instPrograms = (progData || []).filter(p => p.academic_year?.institution_id === userProfile.institution_id);
      setPrograms(instPrograms);

      // 4. Fetch Terms with parent program & academic_year
      const { data: termsData, error: termsErr } = await supabase
        .from('terms')
        .select('*, program:programs(id, name, academic_year:academic_years(id, name, institution_id))')
        .order('created_at', { ascending: true });
      if (termsErr) throw termsErr;
      const instTerms = (termsData || []).filter(t => t.program?.academic_year?.institution_id === userProfile.institution_id);
      setTerms(instTerms);

      // 5. Fetch Subjects with parent term, program & academic_year
      const { data: subjData, error: subjErr } = await supabase
        .from('subjects')
        .select('*, term:terms(id, name, program:programs(id, name, academic_year:academic_years(id, name, institution_id)))')
        .order('name', { ascending: true });
      if (subjErr) throw subjErr;
      const instSubjects = (subjData || []).filter(s => s.term?.program?.academic_year?.institution_id === userProfile.institution_id);
      setSubjects(instSubjects);

      // 6. Fetch Faculty & Students
      const { data: usersData } = await supabase
        .from('users')
        .select('*')
        .eq('institution_id', userProfile.institution_id);
      if (usersData) {
        setAvailableTeachers(usersData.filter(u => u.role === 'TEACHER'));
        setAvailableStudents(usersData.filter(u => u.role === 'STUDENT'));
      }
    } catch (err) {
      console.error('Error fetching academic setup data:', err);
      setError('Unable to load institutional academic structure. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [userProfile]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Create Academic Year
  const handleCreateAcademicYear = async (e) => {
    e.preventDefault();
    setFormErrors({});
    const errors = {};

    if (!yearForm.name.trim()) errors.name = 'Academic year name is required (e.g. 2026-2027).';
    if (yearForm.startDate && yearForm.endDate && new Date(yearForm.endDate) <= new Date(yearForm.startDate)) {
      errors.endDate = 'End date must be after start date.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        institution_id: userProfile.institution_id,
        name: yearForm.name.trim(),
        start_date: yearForm.startDate || null,
        end_date: yearForm.endDate || null,
        is_active: yearForm.isActive
      };

      const { data, error: insertError } = await supabase
        .from('academic_years')
        .insert([payload])
        .select()
        .single();

      if (insertError) {
        if (insertError.code === '23505') {
          throw new Error(`An academic year named "${yearForm.name}" already exists.`);
        }
        throw insertError;
      }

      showToast(`Academic Year "${data.name}" created successfully.`);
      setActiveModal(null);
      setYearForm({ name: '', startDate: '', endDate: '', isActive: false });
      fetchData();
    } catch (err) {
      setFormErrors({ form: err.message || 'Failed to create academic year.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Create Program
  const handleCreateProgram = async (e) => {
    e.preventDefault();
    setFormErrors({});
    const errors = {};

    if (!programForm.name.trim()) errors.name = 'Program name is required.';
    if (!programForm.academicYearId) errors.academicYearId = 'Please select a parent Academic Year.';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        academic_year_id: programForm.academicYearId,
        name: programForm.name.trim()
      };

      const { data, error: insertError } = await supabase
        .from('programs')
        .insert([payload])
        .select()
        .single();

      if (insertError) {
        if (insertError.code === '23505') {
          throw new Error(`A program named "${programForm.name}" already exists in the selected academic year.`);
        }
        throw insertError;
      }

      showToast(`Program "${data.name}" created successfully.`);
      setActiveModal(null);
      setProgramForm({ name: '', academicYearId: '' });
      fetchData();
    } catch (err) {
      setFormErrors({ form: err.message || 'Failed to create program.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Create Term
  const handleCreateTerm = async (e) => {
    e.preventDefault();
    setFormErrors({});
    const errors = {};

    if (!termForm.name.trim()) errors.name = 'Term name is required.';
    if (!termForm.programId) errors.programId = 'Please select a parent Program.';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        program_id: termForm.programId,
        name: termForm.name.trim()
      };

      const { data, error: insertError } = await supabase
        .from('terms')
        .insert([payload])
        .select()
        .single();

      if (insertError) {
        if (insertError.code === '23505') {
          throw new Error(`A term named "${termForm.name}" already exists in the selected program.`);
        }
        throw insertError;
      }

      showToast(`Term "${data.name}" created successfully.`);
      setActiveModal(null);
      setTermForm({ name: '', programId: '' });
      fetchData();
    } catch (err) {
      setFormErrors({ form: err.message || 'Failed to create term.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Create Subject
  const handleCreateSubject = async (e) => {
    e.preventDefault();
    setFormErrors({});
    const errors = {};

    if (!subjectForm.name.trim()) errors.name = 'Subject name is required.';
    if (!subjectForm.termId) errors.termId = 'Please select a parent Term.';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        term_id: subjectForm.termId,
        name: subjectForm.name.trim(),
        code: subjectForm.code.trim() || null
      };

      const { data, error: insertError } = await supabase
        .from('subjects')
        .insert([payload])
        .select()
        .single();

      if (insertError) {
        if (insertError.code === '23505') {
          throw new Error(`A subject named "${subjectForm.name}" already exists in the selected term.`);
        }
        throw insertError;
      }

      showToast(`Subject "${data.name}" created successfully.`);
      setActiveModal(null);
      setSubjectForm({ name: '', code: '', termId: '' });
      fetchData();
    } catch (err) {
      setFormErrors({ form: err.message || 'Failed to create subject.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Confirmation
  const confirmDelete = async () => {
    if (!deleteContext) return;
    setIsSubmitting(true);

    try {
      const { error: delError } = await supabase
        .from(deleteContext.table)
        .delete()
        .eq('id', deleteContext.id);

      if (delError) throw delError;

      showToast(`${deleteContext.type} "${deleteContext.name}" deleted.`);
      setActiveModal(null);
      setDeleteContext(null);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to delete record.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manage Subject People (Assignments & Enrollments)
  const openPeopleManager = async (subject) => {
    setManagingSubject(subject);
    setActiveModal('assign-people');
    setSelectedTeacherId('');
    setSelectedStudentId('');

    // Fetch existing
    const [{ data: assignData }, { data: enrollData }] = await Promise.all([
      supabase.from('teacher_assignments').select('*, user:users(id, full_name, email)').eq('subject_id', subject.id),
      supabase.from('student_enrollments').select('*, user:users(id, full_name, email)').eq('subject_id', subject.id)
    ]);

    setSubjectAssignments(assignData || []);
    setSubjectEnrollments(enrollData || []);
  };

  const handleAssignTeacherToSubject = async (e) => {
    e.preventDefault();
    if (!selectedTeacherId || !managingSubject) return;

    try {
      const { error: insErr } = await supabase
        .from('teacher_assignments')
        .insert([{ user_id: selectedTeacherId, subject_id: managingSubject.id }]);
      if (insErr) throw insErr;

      showToast('Teacher assigned successfully.');
      const { data } = await supabase.from('teacher_assignments').select('*, user:users(id, full_name, email)').eq('subject_id', managingSubject.id);
      setSubjectAssignments(data || []);
      setSelectedTeacherId('');
    } catch (err) {
      showToast(err.message || 'Failed to assign teacher.', 'error');
    }
  };

  const handleEnrollStudentToSubject = async (e) => {
    e.preventDefault();
    if (!selectedStudentId || !managingSubject) return;

    try {
      const { error: insErr } = await supabase
        .from('student_enrollments')
        .insert([{ user_id: selectedStudentId, subject_id: managingSubject.id }]);
      if (insErr) throw insErr;

      showToast('Student enrolled successfully.');
      const { data } = await supabase.from('student_enrollments').select('*, user:users(id, full_name, email)').eq('subject_id', managingSubject.id);
      setSubjectEnrollments(data || []);
      setSelectedStudentId('');
    } catch (err) {
      showToast(err.message || 'Failed to enroll student.', 'error');
    }
  };

  const handleRemoveAssignment = async (id) => {
    try {
      await supabase.from('teacher_assignments').delete().eq('id', id);
      setSubjectAssignments(prev => prev.filter(a => a.id !== id));
      showToast('Assignment removed.');
    } catch (err) {
      showToast('Failed to remove assignment.', 'error');
    }
  };

  const handleRemoveEnrollment = async (id) => {
    try {
      await supabase.from('student_enrollments').delete().eq('id', id);
      setSubjectEnrollments(prev => prev.filter(e => e.id !== id));
      showToast('Enrollment removed.');
    } catch (err) {
      showToast('Failed to remove enrollment.', 'error');
    }
  };

  // Check Role Access
  if (userProfile?.role !== 'ADMIN') {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Administrative Access Required"
        description="This section is restricted to institutional administrators."
      />
    );
  }

  // --- RENDER SECTIONS ---

  // 1. Overview Landing Tab
  const renderOverview = () => (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <SummaryCard
          icon={Calendar}
          title="Academic Years"
          value={academicYears.length}
          description="Operational calendar cycles and active academic periods."
          action={
            <Button 
              variant="secondary" 
              size="compact" 
              iconRight={ArrowRight}
              onClick={() => setActiveTab('years')}
            >
              Manage Years
            </Button>
          }
        />

        <SummaryCard
          icon={Book}
          title="Programs"
          value={programs.length}
          description="Curricular tracks, degree streams, and grade level groupings."
          action={
            <Button 
              variant="secondary" 
              size="compact" 
              iconRight={ArrowRight}
              onClick={() => setActiveTab('programs')}
            >
              Manage Programs
            </Button>
          }
        />

        <SummaryCard
          icon={Folder}
          title="Terms"
          value={terms.length}
          description="Academic subdivisions including semesters, trimesters, and sections."
          action={
            <Button 
              variant="secondary" 
              size="compact" 
              iconRight={ArrowRight}
              onClick={() => setActiveTab('terms')}
            >
              Manage Terms
            </Button>
          }
        />

        <SummaryCard
          icon={BookOpen}
          title="Subjects"
          value={subjects.length}
          description="Curricular courses with document vaults, faculty, and student enrollments."
          action={
            <Button 
              variant="secondary" 
              size="compact" 
              iconRight={ArrowRight}
              onClick={() => setActiveTab('subjects')}
            >
              Manage Subjects
            </Button>
          }
        />
      </div>

      {/* Quick Setup Checklist */}
      <div className="ev-surface-card" style={{ marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: 'var(--ev-text)' }}>
          Academic Structure Hierarchy
        </h3>
        <p style={{ color: 'var(--ev-text-secondary)', fontSize: '13px', lineHeight: 1.5, margin: '0 0 20px 0' }}>
          EduVault structures institutional curriculum through a strict 4-level hierarchy. Data must be established sequentially from top to bottom.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--ev-primary-light)', borderRadius: '8px' }}>
            <span style={{ fontWeight: 700, color: 'var(--ev-primary)', width: '24px' }}>1.</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ev-text)' }}>Academic Years</div>
              <div style={{ fontSize: '12px', color: 'var(--ev-text-secondary)' }}>Defines the current active academic session.</div>
            </div>
            <Button variant="tertiary" size="compact" onClick={() => { setActiveModal('create-year'); setFormErrors({}); }}>
              + Add Year
            </Button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--ev-surface-elevated)', borderRadius: '8px', border: '1px solid var(--ev-border)' }}>
            <span style={{ fontWeight: 700, color: 'var(--ev-text-secondary)', width: '24px' }}>2.</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ev-text)' }}>Programs</div>
              <div style={{ fontSize: '12px', color: 'var(--ev-text-secondary)' }}>Belongs to an Academic Year (e.g. Class 10, B.Sc Computer Science).</div>
            </div>
            <Button variant="tertiary" size="compact" disabled={academicYears.length === 0} onClick={() => { setActiveModal('create-program'); setFormErrors({}); }}>
              + Add Program
            </Button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--ev-surface-elevated)', borderRadius: '8px', border: '1px solid var(--ev-border)' }}>
            <span style={{ fontWeight: 700, color: 'var(--ev-text-secondary)', width: '24px' }}>3.</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ev-text)' }}>Terms</div>
              <div style={{ fontSize: '12px', color: 'var(--ev-text-secondary)' }}>Belongs to a Program (e.g. Section A, Semester 3).</div>
            </div>
            <Button variant="tertiary" size="compact" disabled={programs.length === 0} onClick={() => { setActiveModal('create-term'); setFormErrors({}); }}>
              + Add Term
            </Button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--ev-surface-elevated)', borderRadius: '8px', border: '1px solid var(--ev-border)' }}>
            <span style={{ fontWeight: 700, color: 'var(--ev-text-secondary)', width: '24px' }}>4.</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ev-text)' }}>Subjects</div>
              <div style={{ fontSize: '12px', color: 'var(--ev-text-secondary)' }}>Belongs to a Term. Contains documents, teachers, and enrolled students.</div>
            </div>
            <Button variant="tertiary" size="compact" disabled={terms.length === 0} onClick={() => { setActiveModal('create-subject'); setFormErrors({}); }}>
              + Add Subject
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  // 2. Academic Years Tab
  const renderYears = () => (
    <div>
      <PageHeader
        title="Academic Years"
        description="Configure operational academic sessions and designate the active calendar cycle."
        actions={
          <Button 
            variant="primary" 
            icon={Plus} 
            onClick={() => { setFormErrors({}); setActiveModal('create-year'); }}
          >
            Create Academic Year
          </Button>
        }
      />

      <DataTable
        loading={loading}
        data={academicYears}
        emptyTitle="No academic years yet"
        emptyDescription="Create the institution's first academic session to begin structuring programs and subjects."
        emptyActionLabel="Create Academic Year"
        emptyActionIcon={Plus}
        onEmptyAction={() => { setFormErrors({}); setActiveModal('create-year'); }}
        columns={[
          {
            key: 'name',
            header: 'Academic Year',
            render: (row) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={16} style={{ color: 'var(--ev-primary)' }} />
                <span style={{ fontWeight: 600 }}>{row.name}</span>
              </div>
            )
          },
          {
            key: 'dates',
            header: 'Calendar Range',
            render: (row) => (
              <span style={{ color: 'var(--ev-text-secondary)' }}>
                {row.start_date || row.end_date ? (
                  `${row.start_date || '—'} to ${row.end_date || '—'}`
                ) : (
                  'Not specified'
                )}
              </span>
            )
          },
          {
            key: 'is_active',
            header: 'Status',
            render: (row) => (
              <Badge status={row.is_active ? 'active' : 'inactive'}>
                {row.is_active ? 'Current / Active' : 'Inactive'}
              </Badge>
            )
          },
          {
            key: 'actions',
            header: 'Actions',
            align: 'right',
            render: (row) => (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                <IconButton
                  icon={Trash2}
                  variant="danger-outline"
                  size="compact"
                  title="Delete Academic Year"
                  onClick={() => {
                    setDeleteContext({ table: 'academic_years', id: row.id, name: row.name, type: 'Academic Year' });
                    setActiveModal('delete-confirm');
                  }}
                />
              </div>
            )
          }
        ]}
      />
    </div>
  );

  // 3. Programs Tab
  const renderPrograms = () => (
    <div>
      <PageHeader
        title="Programs"
        description="Curricular streams, grade levels, and degrees tied to specific academic years."
        actions={
          <Button 
            variant="primary" 
            icon={Plus} 
            disabled={academicYears.length === 0}
            onClick={() => { 
              setFormErrors({}); 
              setProgramForm({ name: '', academicYearId: academicYears[0]?.id || '' }); 
              setActiveModal('create-program'); 
            }}
          >
            Create Program
          </Button>
        }
      />

      {academicYears.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="Academic Year Required"
          description="You must establish at least one Academic Year before configuring programs."
          actionLabel="Go to Academic Years"
          actionIcon={ArrowRight}
          onAction={() => setActiveTab('years')}
        />
      ) : (
        <DataTable
          loading={loading}
          data={programs}
          emptyTitle="No programs configured"
          emptyDescription="Create your first academic program or grade level under an existing academic year."
          emptyActionLabel="Create Program"
          emptyActionIcon={Plus}
          onEmptyAction={() => { 
            setFormErrors({}); 
            setProgramForm({ name: '', academicYearId: academicYears[0]?.id || '' }); 
            setActiveModal('create-program'); 
          }}
          columns={[
            {
              key: 'name',
              header: 'Program Name',
              render: (row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Book size={16} style={{ color: 'var(--ev-primary)' }} />
                  <span style={{ fontWeight: 600 }}>{row.name}</span>
                </div>
              )
            },
            {
              key: 'academic_year',
              header: 'Academic Year',
              render: (row) => (
                <span style={{ color: 'var(--ev-text)' }}>
                  {row.academic_year?.name || '—'}
                </span>
              )
            },
            {
              key: 'terms_count',
              header: 'Terms / Sections',
              render: (row) => {
                const count = terms.filter(t => t.program_id === row.id).length;
                return (
                  <span style={{ color: 'var(--ev-text-secondary)' }}>
                    {count} {count === 1 ? 'term' : 'terms'}
                  </span>
                );
              }
            },
            {
              key: 'actions',
              header: 'Actions',
              align: 'right',
              render: (row) => (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                  <IconButton
                    icon={Trash2}
                    variant="danger-outline"
                    size="compact"
                    title="Delete Program"
                    onClick={() => {
                      setDeleteContext({ table: 'programs', id: row.id, name: row.name, type: 'Program' });
                      setActiveModal('delete-confirm');
                    }}
                  />
                </div>
              )
            }
          ]}
        />
      )}
    </div>
  );

  // 4. Terms Tab
  const renderTerms = () => (
    <div>
      <PageHeader
        title="Terms & Sections"
        description="Semesters, trimesters, and class sections belonging to specific academic programs."
        actions={
          <Button 
            variant="primary" 
            icon={Plus} 
            disabled={programs.length === 0}
            onClick={() => { 
              setFormErrors({}); 
              setTermForm({ name: '', programId: programs[0]?.id || '' }); 
              setActiveModal('create-term'); 
            }}
          >
            Create Term
          </Button>
        }
      />

      {programs.length === 0 ? (
        <EmptyState
          icon={Book}
          title="Program Required"
          description="You must establish at least one Program before creating terms or sections."
          actionLabel="Go to Programs"
          actionIcon={ArrowRight}
          onAction={() => setActiveTab('programs')}
        />
      ) : (
        <DataTable
          loading={loading}
          data={terms}
          emptyTitle="No terms configured"
          emptyDescription="Create your first term, semester, or class section."
          emptyActionLabel="Create Term"
          emptyActionIcon={Plus}
          onEmptyAction={() => { 
            setFormErrors({}); 
            setTermForm({ name: '', programId: programs[0]?.id || '' }); 
            setActiveModal('create-term'); 
          }}
          columns={[
            {
              key: 'name',
              header: 'Term / Section',
              render: (row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Folder size={16} style={{ color: 'var(--ev-primary)' }} />
                  <span style={{ fontWeight: 600 }}>{row.name}</span>
                </div>
              )
            },
            {
              key: 'program',
              header: 'Program Context',
              render: (row) => (
                <div>
                  <div style={{ fontWeight: 500 }}>{row.program?.name || '—'}</div>
                  <div style={{ fontSize: '11px', color: 'var(--ev-text-secondary)' }}>
                    {row.program?.academic_year?.name || ''}
                  </div>
                </div>
              )
            },
            {
              key: 'subjects_count',
              header: 'Subjects',
              render: (row) => {
                const count = subjects.filter(s => s.term_id === row.id).length;
                return (
                  <span style={{ color: 'var(--ev-text-secondary)' }}>
                    {count} {count === 1 ? 'subject' : 'subjects'}
                  </span>
                );
              }
            },
            {
              key: 'actions',
              header: 'Actions',
              align: 'right',
              render: (row) => (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                  <IconButton
                    icon={Trash2}
                    variant="danger-outline"
                    size="compact"
                    title="Delete Term"
                    onClick={() => {
                      setDeleteContext({ table: 'terms', id: row.id, name: row.name, type: 'Term' });
                      setActiveModal('delete-confirm');
                    }}
                  />
                </div>
              )
            }
          ]}
        />
      )}
    </div>
  );

  // 5. Subjects Tab
  const renderSubjects = () => (
    <div>
      <PageHeader
        title="Subjects"
        description="Curricular courses with document vaults, assigned teachers, and enrolled students."
        actions={
          <Button 
            variant="primary" 
            icon={Plus} 
            disabled={terms.length === 0}
            onClick={() => { 
              setFormErrors({}); 
              setSubjectForm({ name: '', code: '', termId: terms[0]?.id || '' }); 
              setActiveModal('create-subject'); 
            }}
          >
            Create Subject
          </Button>
        }
      />

      {terms.length === 0 ? (
        <EmptyState
          icon={Folder}
          title="Term Required"
          description="You must establish at least one Term before creating subjects."
          actionLabel="Go to Terms"
          actionIcon={ArrowRight}
          onAction={() => setActiveTab('terms')}
        />
      ) : (
        <DataTable
          loading={loading}
          data={subjects}
          emptyTitle="No subjects created yet"
          emptyDescription="Create your first subject course under a term to begin uploading materials and assigning faculty."
          emptyActionLabel="Create Subject"
          emptyActionIcon={Plus}
          onEmptyAction={() => { 
            setFormErrors({}); 
            setSubjectForm({ name: '', code: '', termId: terms[0]?.id || '' }); 
            setActiveModal('create-subject'); 
          }}
          columns={[
            {
              key: 'name',
              header: 'Subject & Code',
              render: (row) => (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BookOpen size={16} style={{ color: 'var(--ev-primary)' }} />
                    <span style={{ fontWeight: 600 }}>{row.name}</span>
                  </div>
                  {row.code && (
                    <div style={{ fontSize: '11px', color: 'var(--ev-text-secondary)', marginLeft: '24px' }}>
                      Code: <code style={{ background: 'var(--ev-primary-light)', padding: '1px 4px', borderRadius: '4px' }}>{row.code}</code>
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
                  <div style={{ fontWeight: 500 }}>{row.term?.name || '—'}</div>
                  <div style={{ fontSize: '11px', color: 'var(--ev-text-secondary)' }}>
                    {row.term?.program?.name} • {row.term?.program?.academic_year?.name}
                  </div>
                </div>
              )
            },
            {
              key: 'people',
              header: 'People',
              render: (row) => (
                <Button
                  variant="secondary"
                  size="compact"
                  icon={Users}
                  onClick={() => openPeopleManager(row)}
                >
                  Manage Roster
                </Button>
              )
            },
            {
              key: 'actions',
              header: 'Actions',
              align: 'right',
              render: (row) => (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                  <IconButton
                    icon={Trash2}
                    variant="danger-outline"
                    size="compact"
                    title="Delete Subject"
                    onClick={() => {
                      setDeleteContext({ table: 'subjects', id: row.id, name: row.name, type: 'Subject' });
                      setActiveModal('delete-confirm');
                    }}
                  />
                </div>
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

      {/* Main Page Header */}
      <PageHeader
        title="Academic Setup"
        description="Manage the institution's academic structure used by subjects, teacher assignments, student enrollments, and curriculum materials."
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
            className={`ev-tab-btn ${activeTab === 'years' ? 'active' : ''}`}
            onClick={() => setActiveTab('years')}
          >
            <Calendar size={14} />
            Academic Years ({academicYears.length})
          </button>
          <button 
            type="button" 
            className={`ev-tab-btn ${activeTab === 'programs' ? 'active' : ''}`}
            onClick={() => setActiveTab('programs')}
          >
            <Book size={14} />
            Programs ({programs.length})
          </button>
          <button 
            type="button" 
            className={`ev-tab-btn ${activeTab === 'terms' ? 'active' : ''}`}
            onClick={() => setActiveTab('terms')}
          >
            <Folder size={14} />
            Terms ({terms.length})
          </button>
          <button 
            type="button" 
            className={`ev-tab-btn ${activeTab === 'subjects' ? 'active' : ''}`}
            onClick={() => setActiveTab('subjects')}
          >
            <BookOpen size={14} />
            Subjects ({subjects.length})
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
      {activeTab === 'years' && renderYears()}
      {activeTab === 'programs' && renderPrograms()}
      {activeTab === 'terms' && renderTerms()}
      {activeTab === 'subjects' && renderSubjects()}

      {/* MODAL 1: Create Academic Year */}
      <Modal
        isOpen={activeModal === 'create-year'}
        onClose={() => setActiveModal(null)}
        title="Create Academic Year"
        description="Define an operational calendar session for your institution."
        footer={
          <>
            <Button variant="secondary" onClick={() => setActiveModal(null)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateAcademicYear} loading={isSubmitting}>
              Create Academic Year
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateAcademicYear}>
          {formErrors.form && (
            <div style={{ color: '#DC2626', fontSize: '13px', marginBottom: '14px', padding: '10px', background: 'rgba(220, 38, 38, 0.08)', borderRadius: '6px' }}>
              {formErrors.form}
            </div>
          )}

          <FormField
            label="Academic Year Name"
            required
            helperText="Standard format: e.g. 2026-2027 or Session 2026."
            error={formErrors.name}
          >
            <Input
              value={yearForm.name}
              onChange={(e) => setYearForm({ ...yearForm, name: e.target.value })}
              placeholder="e.g. 2026-2027"
              autoFocus
              error={!!formErrors.name}
            />
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <FormField label="Start Date" helperText="First day of session">
              <Input
                type="date"
                value={yearForm.startDate}
                onChange={(e) => setYearForm({ ...yearForm, startDate: e.target.value })}
              />
            </FormField>

            <FormField label="End Date" helperText="Last day of session" error={formErrors.endDate}>
              <Input
                type="date"
                value={yearForm.endDate}
                onChange={(e) => setYearForm({ ...yearForm, endDate: e.target.value })}
                error={!!formErrors.endDate}
              />
            </FormField>
          </div>

          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="checkbox"
              id="year-is-active"
              checked={yearForm.isActive}
              onChange={(e) => setYearForm({ ...yearForm, isActive: e.target.checked })}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="year-is-active" style={{ fontSize: '13px', color: 'var(--ev-text)', cursor: 'pointer' }}>
              Set as current operational academic year
            </label>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Create Program */}
      <Modal
        isOpen={activeModal === 'create-program'}
        onClose={() => setActiveModal(null)}
        title="Create Program"
        description="Establish a degree program, curriculum stream, or grade level."
        footer={
          <>
            <Button variant="secondary" onClick={() => setActiveModal(null)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateProgram} loading={isSubmitting}>
              Create Program
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateProgram}>
          {formErrors.form && (
            <div style={{ color: '#DC2626', fontSize: '13px', marginBottom: '14px', padding: '10px', background: 'rgba(220, 38, 38, 0.08)', borderRadius: '6px' }}>
              {formErrors.form}
            </div>
          )}

          <FormField
            label="Parent Academic Year"
            required
            helperText="The academic year this curriculum belongs to."
            error={formErrors.academicYearId}
          >
            <Select
              value={programForm.academicYearId}
              onChange={(e) => setProgramForm({ ...programForm, academicYearId: e.target.value })}
              error={!!formErrors.academicYearId}
            >
              <option value="">-- Select Academic Year --</option>
              {academicYears.map(ay => (
                <option key={ay.id} value={ay.id}>
                  {ay.name} {ay.is_active ? '(Active)' : ''}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField
            label="Program Name"
            required
            helperText="e.g. Class 10, Grade 12, B.Sc Computer Science, MBA."
            error={formErrors.name}
          >
            <Input
              value={programForm.name}
              onChange={(e) => setProgramForm({ ...programForm, name: e.target.value })}
              placeholder="e.g. B.Sc Computer Science"
              error={!!formErrors.name}
            />
          </FormField>
        </form>
      </Modal>

      {/* MODAL 3: Create Term */}
      <Modal
        isOpen={activeModal === 'create-term'}
        onClose={() => setActiveModal(null)}
        title="Create Term or Section"
        description="Create an academic period or section under a program."
        footer={
          <>
            <Button variant="secondary" onClick={() => setActiveModal(null)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateTerm} loading={isSubmitting}>
              Create Term
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateTerm}>
          {formErrors.form && (
            <div style={{ color: '#DC2626', fontSize: '13px', marginBottom: '14px', padding: '10px', background: 'rgba(220, 38, 38, 0.08)', borderRadius: '6px' }}>
              {formErrors.form}
            </div>
          )}

          <FormField
            label="Parent Program"
            required
            helperText="The degree program or grade level this term belongs to."
            error={formErrors.programId}
          >
            <Select
              value={termForm.programId}
              onChange={(e) => setTermForm({ ...termForm, programId: e.target.value })}
              error={!!formErrors.programId}
            >
              <option value="">-- Select Program --</option>
              {programs.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.academic_year?.name || 'Year'})
                </option>
              ))}
            </Select>
          </FormField>

          <FormField
            label="Term or Section Name"
            required
            helperText="e.g. Section A, Semester 3, Fall 2026, Term 1."
            error={formErrors.name}
          >
            <Input
              value={termForm.name}
              onChange={(e) => setTermForm({ ...termForm, name: e.target.value })}
              placeholder="e.g. Semester 3 or Section A"
              error={!!formErrors.name}
            />
          </FormField>
        </form>
      </Modal>

      {/* MODAL 4: Create Subject */}
      <Modal
        isOpen={activeModal === 'create-subject'}
        onClose={() => setActiveModal(null)}
        title="Create Subject"
        description="Create a curricular subject unit for teaching and material management."
        footer={
          <>
            <Button variant="secondary" onClick={() => setActiveModal(null)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateSubject} loading={isSubmitting}>
              Create Subject
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateSubject}>
          {formErrors.form && (
            <div style={{ color: '#DC2626', fontSize: '13px', marginBottom: '14px', padding: '10px', background: 'rgba(220, 38, 38, 0.08)', borderRadius: '6px' }}>
              {formErrors.form}
            </div>
          )}

          <FormField
            label="Academic Context (Term)"
            required
            helperText="The term or section offering this subject."
            error={formErrors.termId}
          >
            <Select
              value={subjectForm.termId}
              onChange={(e) => setSubjectForm({ ...subjectForm, termId: e.target.value })}
              error={!!formErrors.termId}
            >
              <option value="">-- Select Term --</option>
              {terms.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.program?.name} • {t.program?.academic_year?.name})
                </option>
              ))}
            </Select>
          </FormField>

          <FormField
            label="Subject Name"
            required
            helperText="e.g. Physics, Advanced Algorithms, World History."
            error={formErrors.name}
          >
            <Input
              value={subjectForm.name}
              onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
              placeholder="e.g. Physics"
              error={!!formErrors.name}
            />
          </FormField>

          <FormField
            label="Subject Code"
            helperText="Optional institutional course code (e.g. PHY-101, CS-301)."
          >
            <Input
              value={subjectForm.code}
              onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
              placeholder="e.g. CS-301"
            />
          </FormField>
        </form>
      </Modal>

      {/* MODAL 5: Delete Confirmation */}
      <Modal
        isOpen={activeModal === 'delete-confirm'}
        onClose={() => setActiveModal(null)}
        title={`Delete ${deleteContext?.type || 'Record'}?`}
        description={`Are you sure you want to delete "${deleteContext?.name}"? All nested child records will be cascade deleted from the database.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setActiveModal(null)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete} loading={isSubmitting}>
              Delete Permanently
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '12px', background: 'rgba(220, 38, 38, 0.08)', borderRadius: '8px' }}>
          <AlertTriangle size={20} style={{ color: '#DC2626', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '13px', color: 'var(--ev-text)', lineHeight: 1.4 }}>
            <strong>Warning:</strong> This action cannot be undone. Any connected terms, subjects, teacher assignments, student enrollments, and material documents will be permanently removed.
          </div>
        </div>
      </Modal>

      {/* MODAL 6: Subject People & Roster Manager */}
      <Modal
        isOpen={activeModal === 'assign-people'}
        onClose={() => setActiveModal(null)}
        title={`Roster: ${managingSubject?.name || 'Subject'}`}
        description="Manage assigned faculty instructors and enrolled students for this course."
        size="lg"
        footer={
          <Button variant="secondary" onClick={() => setActiveModal(null)}>
            Close
          </Button>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Teacher Assignments Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={16} style={{ color: 'var(--ev-primary)' }} />
              Assigned Faculty ({subjectAssignments.length})
            </h4>

            <form onSubmit={handleAssignTeacherToSubject} style={{ display: 'flex', gap: '6px' }}>
              <Select
                size="compact"
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                disabled={availableTeachers.length === 0}
              >
                <option value="">-- Select Faculty --</option>
                {availableTeachers.map(t => (
                  <option key={t.id} value={t.id}>{t.full_name} ({t.email})</option>
                ))}
              </Select>
              <Button type="submit" variant="primary" size="compact" disabled={!selectedTeacherId}>
                Assign
              </Button>
            </form>

            <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--ev-border)', borderRadius: '6px', padding: '6px' }}>
              {subjectAssignments.length === 0 ? (
                <div style={{ fontSize: '12px', color: 'var(--ev-text-secondary)', padding: '10px', textAlign: 'center' }}>
                  No teachers assigned yet.
                </div>
              ) : (
                subjectAssignments.map(a => (
                  <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', borderBottom: '1px solid var(--ev-divider)' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 500 }}>{a.user?.full_name || 'Faculty Member'}</div>
                      <div style={{ fontSize: '11px', color: 'var(--ev-text-secondary)' }}>{a.user?.email}</div>
                    </div>
                    <IconButton
                      icon={Trash2}
                      variant="danger-outline"
                      size="compact"
                      title="Remove teacher"
                      onClick={() => handleRemoveAssignment(a.id)}
                    />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Student Enrollments Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <UserPlus size={16} style={{ color: 'var(--ev-primary)' }} />
              Enrolled Students ({subjectEnrollments.length})
            </h4>

            <form onSubmit={handleEnrollStudentToSubject} style={{ display: 'flex', gap: '6px' }}>
              <Select
                size="compact"
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                disabled={availableStudents.length === 0}
              >
                <option value="">-- Select Student --</option>
                {availableStudents.map(s => (
                  <option key={s.id} value={s.id}>{s.full_name} ({s.email})</option>
                ))}
              </Select>
              <Button type="submit" variant="primary" size="compact" disabled={!selectedStudentId}>
                Enroll
              </Button>
            </form>

            <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--ev-border)', borderRadius: '6px', padding: '6px' }}>
              {subjectEnrollments.length === 0 ? (
                <div style={{ fontSize: '12px', color: 'var(--ev-text-secondary)', padding: '10px', textAlign: 'center' }}>
                  No students enrolled yet.
                </div>
              ) : (
                subjectEnrollments.map(e => (
                  <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', borderBottom: '1px solid var(--ev-divider)' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 500 }}>{e.user?.full_name || 'Student'}</div>
                      <div style={{ fontSize: '11px', color: 'var(--ev-text-secondary)' }}>{e.user?.email}</div>
                    </div>
                    <IconButton
                      icon={Trash2}
                      variant="danger-outline"
                      size="compact"
                      title="Remove student"
                      onClick={() => handleRemoveEnrollment(e.id)}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
