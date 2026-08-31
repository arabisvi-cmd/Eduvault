import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { Plus, Edit2, Trash2, Calendar, Book, Folder, CheckCircle, XCircle, ChevronRight, School, BookOpen, Users, UserPlus } from 'lucide-react';
import Notices from './Notices';

export default function AdminAcademicManager({ userProfile }) {
  const [institution, setInstitution] = useState(null);
  
  const [academicYears, setAcademicYears] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [terms, setTerms] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [enrollments, setEnrollments] = useState([]);

  // Available users for dropdowns
  const [availableTeachers, setAvailableTeachers] = useState([]);
  const [availableStudents, setAvailableStudents] = useState([]);

  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit states
  const [editingId, setEditingId] = useState(null);
  const [editVal, setEditVal] = useState("");
  const [editValCode, setEditValCode] = useState("");

  const isSchool = institution?.type === 'school';
  const labels = {
    program: isSchool ? 'Class' : 'Program',
    term: isSchool ? 'Section' : 'Semester',
    subject: isSchool ? 'Subject' : 'Course'
  };

  useEffect(() => {
    if (userProfile?.institution_id) {
      fetchInstitution();
      fetchAcademicYears();
      fetchInstitutionUsers();
    }
  }, [userProfile]);

  useEffect(() => {
    if (selectedYear) fetchPrograms();
    else { setPrograms([]); setSelectedProgram(null); }
  }, [selectedYear]);

  useEffect(() => {
    if (selectedProgram) fetchTerms();
    else { setTerms([]); setSelectedTerm(null); }
  }, [selectedProgram]);

  useEffect(() => {
    if (selectedTerm) fetchSubjects();
    else { setSubjects([]); setSelectedSubject(null); }
  }, [selectedTerm]);

  useEffect(() => {
    if (selectedSubject) {
      fetchAssignments();
      fetchEnrollments();
    } else {
      setAssignments([]);
      setEnrollments([]);
    }
  }, [selectedSubject]);

  async function fetchInstitution() {
    const { data } = await supabase.from('institutions').select('*').eq('id', userProfile.institution_id).single();
    if (data) setInstitution(data);
  }

  async function fetchInstitutionUsers() {
    const { data, error } = await supabase.from('users').select('*').eq('institution_id', userProfile.institution_id);
    if (!error && data) {
      setAvailableTeachers(data.filter(u => u.role === 'TEACHER'));
      setAvailableStudents(data.filter(u => u.role === 'STUDENT'));
    }
  }

  async function fetchAcademicYears() {
    setLoading(true);
    const { data, error } = await supabase.from('academic_years').select('*').eq('institution_id', userProfile.institution_id).order('start_date', { ascending: false });
    if (error) setError(error.message);
    else setAcademicYears(data || []);
    setLoading(false);
  }

  async function fetchPrograms() {
    const { data } = await supabase.from('programs').select('*').eq('academic_year_id', selectedYear.id).order('created_at');
    setPrograms(data || []);
  }

  async function fetchTerms() {
    const { data } = await supabase.from('terms').select('*').eq('program_id', selectedProgram.id).order('created_at');
    setTerms(data || []);
  }

  async function fetchSubjects() {
    const { data } = await supabase.from('subjects').select('*').eq('term_id', selectedTerm.id).order('name');
    setSubjects(data || []);
  }

  async function fetchAssignments() {
    const { data } = await supabase.from('teacher_assignments')
      .select('*, user:users(id, full_name, email)')
      .eq('subject_id', selectedSubject.id);
    setAssignments(data || []);
  }

  async function fetchEnrollments() {
    const { data } = await supabase.from('student_enrollments')
      .select('*, user:users(id, full_name, email)')
      .eq('subject_id', selectedSubject.id);
    setEnrollments(data || []);
  }

  const handleCreate = async (e, table, foreignKeyCol, foreignKeyId, hasCode = false, fetchFn) => {
    e.preventDefault();
    const name = e.target.name.value;
    const payload = { name, [foreignKeyCol]: foreignKeyId };
    if (hasCode) payload.code = e.target.code.value;

    const { error } = await supabase.from(table).insert([payload]);
    if (error) alert(error.message);
    else { e.target.reset(); fetchFn(); }
  };

  const handleAssignTeacher = async (e) => {
    e.preventDefault();
    const userId = e.target.user_id.value;
    if (!userId) return;
    const { error } = await supabase.from('teacher_assignments').insert([{ user_id: userId, subject_id: selectedSubject.id }]);
    if (error) alert(error.message);
    else fetchAssignments();
  };

  const handleEnrollStudent = async (e) => {
    e.preventDefault();
    const userId = e.target.user_id.value;
    if (!userId) return;
    const { error } = await supabase.from('student_enrollments').insert([{ user_id: userId, subject_id: selectedSubject.id }]);
    if (error) alert(error.message);
    else fetchEnrollments();
  };

  const handleUpdate = async (table, id, fetchFn, hasCode = false) => {
    const payload = { name: editVal };
    if (hasCode) payload.code = editValCode;

    const { error } = await supabase.from(table).update(payload).eq('id', id);
    if (error) alert(error.message);
    else { setEditingId(null); fetchFn(); }
  };

  const handleDelete = async (table, id, refreshFn, setSelectionNull) => {
    if (!window.confirm("Are you sure? This will delete all connected records.")) return;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) alert(error.message);
    else {
      refreshFn();
      if (setSelectionNull) setSelectionNull(null);
    }
  };

  if (userProfile?.role !== 'ADMIN') {
    return <div style={{ padding: '20px', color: '#fff' }}>Access Denied: Admin Only</div>;
  }

  const renderListItem = (item, table, fetchFn, setSelectedFn, isSelected, hasCode = false) => {
    const isEditing = editingId === item.id;
    return (
      <li key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid #3c4043', background: isSelected ? '#3c4043' : 'transparent', cursor: 'pointer' }} onClick={() => { if (!isEditing && setSelectedFn) setSelectedFn(item); }}>
        {isEditing ? (
          <div style={{ display: 'flex', gap: '5px', flex: 1, marginRight: '10px' }} onClick={e => e.stopPropagation()}>
            <input value={editVal} onChange={e => setEditVal(e.target.value)} style={{ flex: 1, padding: '4px', background: '#303134', color: '#fff', border: '1px solid #8ab4f8' }} />
            {hasCode && <input value={editValCode} onChange={e => setEditValCode(e.target.value)} placeholder="Code" style={{ width: '60px', padding: '4px', background: '#303134', color: '#fff', border: '1px solid #8ab4f8' }} />}
            <CheckCircle size={18} style={{ color: '#8ab4f8', cursor: 'pointer' }} onClick={() => handleUpdate(table, item.id, fetchFn, hasCode)} />
            <XCircle size={18} style={{ color: '#9aa0a6', cursor: 'pointer' }} onClick={() => setEditingId(null)} />
          </div>
        ) : (
          <div style={{ flex: 1 }}>
            <div>{item.name}</div>
            {hasCode && item.code && <div style={{ fontSize: '0.8rem', color: '#9aa0a6' }}>{item.code}</div>}
          </div>
        )}
        
        {!isEditing && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <Edit2 size={16} style={{ color: '#8ab4f8', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setEditingId(item.id); setEditVal(item.name); if(hasCode) setEditValCode(item.code || ""); }} />
            <Trash2 size={16} style={{ color: '#f28b82', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); handleDelete(table, item.id, fetchFn, setSelectedFn); }} />
          </div>
        )}
      </li>
    );
  };

  return (
    <div style={{ padding: '20px', color: '#e8eaed', height: '100%', overflowY: 'auto' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <School size={24} /> Academic Structure Management
      </h2>

      <div style={{ marginBottom: '30px', color: '#202124' }}>
        <Notices userProfile={userProfile} />
      </div>
      
      {/* Breadcrumb Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '20px', fontSize: '0.9rem', color: '#9aa0a6' }}>
        <span style={{ cursor: 'pointer', color: !selectedYear ? '#fff' : '#8ab4f8' }} onClick={() => { setSelectedYear(null); setSelectedProgram(null); setSelectedTerm(null); setSelectedSubject(null); }}>
          {institution?.name || 'Institution'}
        </span>
        {selectedYear && (
          <>
            <ChevronRight size={14} />
            <span style={{ cursor: 'pointer', color: !selectedProgram ? '#fff' : '#8ab4f8' }} onClick={() => { setSelectedProgram(null); setSelectedTerm(null); setSelectedSubject(null); }}>
              {selectedYear.name}
            </span>
          </>
        )}
        {selectedProgram && (
          <>
            <ChevronRight size={14} />
            <span style={{ cursor: 'pointer', color: !selectedTerm ? '#fff' : '#8ab4f8' }} onClick={() => { setSelectedTerm(null); setSelectedSubject(null); }}>
              {selectedProgram.name}
            </span>
          </>
        )}
        {selectedTerm && (
          <>
            <ChevronRight size={14} />
            <span style={{ cursor: 'pointer', color: !selectedSubject ? '#fff' : '#8ab4f8' }} onClick={() => setSelectedSubject(null)}>
              {selectedTerm.name}
            </span>
          </>
        )}
        {selectedSubject && (
          <>
            <ChevronRight size={14} />
            <span style={{ color: '#fff' }}>
              {selectedSubject.name}
            </span>
          </>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        
        {/* Academic Years Column */}
        <div style={{ backgroundColor: '#202124', border: '1px solid #3c4043', borderRadius: '8px', padding: '15px' }}>
          <h3><Calendar size={16} style={{ display: 'inline', marginRight: '8px' }}/> Academic Years</h3>
          <form onSubmit={e => handleCreate(e, 'academic_years', 'institution_id', userProfile.institution_id, false, fetchAcademicYears)} style={{ display: 'flex', gap: '5px', marginBottom: '15px' }}>
            <input name="name" placeholder="e.g. 2026-27" required style={{ flex: 1, padding: '5px', background: '#303134', color: '#fff', border: '1px solid #5f6368', borderRadius: '4px' }} />
            <button type="submit" style={{ padding: '5px 10px', background: '#8ab4f8', color: '#202124', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Add</button>
          </form>
          {academicYears.length === 0 ? <div style={{ color: '#9aa0a6', fontSize: '0.9rem' }}>No academic years yet. Create your first one.</div> : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {academicYears.map(ay => renderListItem(ay, 'academic_years', fetchAcademicYears, setSelectedYear, selectedYear?.id === ay.id))}
            </ul>
          )}
        </div>

        {/* Programs / Classes Column */}
        {selectedYear && (
          <div style={{ backgroundColor: '#202124', border: '1px solid #3c4043', borderRadius: '8px', padding: '15px' }}>
            <h3><Book size={16} style={{ display: 'inline', marginRight: '8px' }}/> {labels.program}s</h3>
            <form onSubmit={e => handleCreate(e, 'programs', 'academic_year_id', selectedYear.id, false, fetchPrograms)} style={{ display: 'flex', gap: '5px', marginBottom: '15px' }}>
              <input name="name" placeholder={`e.g. ${isSchool ? 'Class 10' : 'B.Sc CS'}`} required style={{ flex: 1, padding: '5px', background: '#303134', color: '#fff', border: '1px solid #5f6368', borderRadius: '4px' }} />
              <button type="submit" style={{ padding: '5px 10px', background: '#8ab4f8', color: '#202124', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Add</button>
            </form>
            {programs.length === 0 ? <div style={{ color: '#9aa0a6', fontSize: '0.9rem' }}>No {labels.program.toLowerCase()}s yet.</div> : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {programs.map(prog => renderListItem(prog, 'programs', fetchPrograms, setSelectedProgram, selectedProgram?.id === prog.id))}
              </ul>
            )}
          </div>
        )}

        {/* Terms / Sections Column */}
        {selectedProgram && (
          <div style={{ backgroundColor: '#202124', border: '1px solid #3c4043', borderRadius: '8px', padding: '15px' }}>
            <h3><Folder size={16} style={{ display: 'inline', marginRight: '8px' }}/> {labels.term}s</h3>
            <form onSubmit={e => handleCreate(e, 'terms', 'program_id', selectedProgram.id, false, fetchTerms)} style={{ display: 'flex', gap: '5px', marginBottom: '15px' }}>
              <input name="name" placeholder={`e.g. ${isSchool ? 'Section A' : 'Semester 1'}`} required style={{ flex: 1, padding: '5px', background: '#303134', color: '#fff', border: '1px solid #5f6368', borderRadius: '4px' }} />
              <button type="submit" style={{ padding: '5px 10px', background: '#8ab4f8', color: '#202124', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Add</button>
            </form>
            {terms.length === 0 ? <div style={{ color: '#9aa0a6', fontSize: '0.9rem' }}>No {labels.term.toLowerCase()}s yet.</div> : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {terms.map(t => renderListItem(t, 'terms', fetchTerms, setSelectedTerm, selectedTerm?.id === t.id))}
              </ul>
            )}
          </div>
        )}

        {/* Subjects / Courses Column */}
        {selectedTerm && (
          <div style={{ backgroundColor: '#202124', border: '1px solid #3c4043', borderRadius: '8px', padding: '15px' }}>
            <h3><BookOpen size={16} style={{ display: 'inline', marginRight: '8px' }}/> {labels.subject}s</h3>
            <form onSubmit={e => handleCreate(e, 'subjects', 'term_id', selectedTerm.id, true, fetchSubjects)} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '15px' }}>
              <input name="name" placeholder={`Name (e.g. Physics)`} required style={{ width: '100%', padding: '5px', background: '#303134', color: '#fff', border: '1px solid #5f6368', borderRadius: '4px', boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', gap: '5px' }}>
                <input name="code" placeholder={`Code (Optional)`} style={{ flex: 1, padding: '5px', background: '#303134', color: '#fff', border: '1px solid #5f6368', borderRadius: '4px' }} />
                <button type="submit" style={{ padding: '5px 15px', background: '#8ab4f8', color: '#202124', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Add</button>
              </div>
            </form>
            {subjects.length === 0 ? <div style={{ color: '#9aa0a6', fontSize: '0.9rem' }}>No {labels.subject.toLowerCase()}s yet.</div> : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {subjects.map(sub => renderListItem(sub, 'subjects', fetchSubjects, setSelectedSubject, selectedSubject?.id === sub.id, true))}
              </ul>
            )}
          </div>
        )}

        {/* Assignments & Enrollments Column */}
        {selectedSubject && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Teacher Assignments */}
            <div style={{ backgroundColor: '#202124', border: '1px solid #3c4043', borderRadius: '8px', padding: '15px' }}>
              <h3><Users size={16} style={{ display: 'inline', marginRight: '8px' }}/> Assigned Teachers</h3>
              <form onSubmit={handleAssignTeacher} style={{ display: 'flex', gap: '5px', marginBottom: '15px' }}>
                <select name="user_id" required disabled={availableTeachers.length === 0} style={{ flex: 1, padding: '5px', background: '#303134', color: '#fff', border: '1px solid #5f6368', borderRadius: '4px' }}>
                  {availableTeachers.length === 0 ? (
                    <option value="">No teachers available.</option>
                  ) : (
                    <option value="">-- Select Teacher --</option>
                  )}
                  {availableTeachers.map(t => (
                    <option key={t.id} value={t.id}>{t.full_name} ({t.email})</option>
                  ))}
                </select>
                <button type="submit" style={{ padding: '5px 10px', background: '#8ab4f8', color: '#202124', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Assign</button>
              </form>
              {assignments.length === 0 ? <div style={{ color: '#9aa0a6', fontSize: '0.9rem' }}>No teachers assigned.</div> : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {assignments.map(a => (
                    <li key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid #3c4043' }}>
                      <div style={{ flex: 1 }}>{a.user?.full_name || 'Unknown'} <span style={{ fontSize: '0.8rem', color: '#9aa0a6' }}>({a.user?.email})</span></div>
                      <Trash2 size={16} style={{ color: '#f28b82', cursor: 'pointer' }} onClick={() => handleDelete('teacher_assignments', a.id, fetchAssignments, null)} />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Student Enrollments */}
            <div style={{ backgroundColor: '#202124', border: '1px solid #3c4043', borderRadius: '8px', padding: '15px' }}>
              <h3><UserPlus size={16} style={{ display: 'inline', marginRight: '8px' }}/> Enrolled Students</h3>
              <form onSubmit={handleEnrollStudent} style={{ display: 'flex', gap: '5px', marginBottom: '15px' }}>
                <select name="user_id" required disabled={availableStudents.length === 0} style={{ flex: 1, padding: '5px', background: '#303134', color: '#fff', border: '1px solid #5f6368', borderRadius: '4px' }}>
                  {availableStudents.length === 0 ? (
                    <option value="">No students available.</option>
                  ) : (
                    <option value="">-- Select Student --</option>
                  )}
                  {availableStudents.map(s => (
                    <option key={s.id} value={s.id}>{s.full_name} ({s.email})</option>
                  ))}
                </select>
                <button type="submit" style={{ padding: '5px 10px', background: '#8ab4f8', color: '#202124', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Enroll</button>
              </form>
              {enrollments.length === 0 ? <div style={{ color: '#9aa0a6', fontSize: '0.9rem' }}>No students enrolled.</div> : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {enrollments.map(e => (
                    <li key={e.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid #3c4043' }}>
                      <div style={{ flex: 1 }}>{e.user?.full_name || 'Unknown'} <span style={{ fontSize: '0.8rem', color: '#9aa0a6' }}>({e.user?.email})</span></div>
                      <Trash2 size={16} style={{ color: '#f28b82', cursor: 'pointer' }} onClick={() => handleDelete('student_enrollments', e.id, fetchEnrollments, null)} />
                    </li>
                  ))}
                </ul>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
