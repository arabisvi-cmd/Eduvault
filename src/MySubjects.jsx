import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { BookOpen } from 'lucide-react';
import SubjectVault from './SubjectVault';
import Notices from './Notices';
import TeacherMySubjects from './components/teacher/TeacherMySubjects';

export default function MySubjects({ userProfile }) {
  if (userProfile?.role === 'TEACHER') {
    return <TeacherMySubjects userProfile={userProfile} />;
  }

  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSubject, setActiveSubject] = useState(null);

  useEffect(() => {
    if (userProfile?.id && userProfile?.role) {
      fetchMySubjects();
    }
  }, [userProfile]);

  async function fetchMySubjects() {
    setLoading(true);
    let data = [];
    if (userProfile.role === 'TEACHER') {
      const { data: assignments } = await supabase
        .from('teacher_assignments')
        .select(`
          subject:subjects(
            id, name, code,
            term:terms(name, program:programs(name, academic_year:academic_years(name))),
            documents(id, status)
          )
        `)
        .eq('user_id', userProfile.id);
      if (assignments) data = assignments.map(a => a.subject).filter(Boolean);
    } else if (userProfile.role === 'STUDENT') {
      const { data: enrollments } = await supabase
        .from('student_enrollments')
        .select(`
          subject:subjects(
            id, name, code,
            term:terms(name, program:programs(name, academic_year:academic_years(name))),
            documents(id)
          )
        `)
        .eq('user_id', userProfile.id);
      if (enrollments) data = enrollments.map(e => e.subject).filter(Boolean);
    }
    setSubjects(data);
    setLoading(false);
  }

  if (loading) {
    return <div style={{ padding: '20px', color: '#5f6368' }}>Loading subjects...</div>;
  }

  if (activeSubject) {
    return <SubjectVault subject={activeSubject} userProfile={userProfile} onBack={() => setActiveSubject(null)} />;
  }

  const renderStudentOverview = () => {
    if (userProfile.role !== 'STUDENT' || subjects.length === 0) return null;
    const firstSubj = subjects[0];
    if (!firstSubj?.term) return null;
    
    return (
      <div style={{ marginBottom: '24px', padding: '16px 20px', backgroundColor: 'var(--ev-primary-light)', borderRadius: '10px', color: 'var(--ev-primary)', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ fontWeight: 600 }}>Institution: <span style={{ fontWeight: 400 }}>{userProfile.institution_id}</span></div>
        <span style={{ color: 'var(--ev-text-secondary)' }}>•</span>
        <div style={{ fontWeight: 600 }}>Academic Year: <span style={{ fontWeight: 400 }}>{firstSubj.term?.program?.academic_year?.name || 'N/A'}</span></div>
        <span style={{ color: 'var(--ev-text-secondary)' }}>•</span>
        <div style={{ fontWeight: 600 }}>Program: <span style={{ fontWeight: 400 }}>{firstSubj.term?.program?.name || 'N/A'}</span></div>
        <span style={{ color: 'var(--ev-text-secondary)' }}>•</span>
        <div style={{ fontWeight: 600 }}>Term/Semester: <span style={{ fontWeight: 400 }}>{firstSubj.term?.name || 'N/A'}</span></div>
      </div>
    );
  };

  return (
    <div style={{ padding: '0', color: 'var(--ev-text)', height: '100%', overflowY: 'auto' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', fontSize: '24px', fontWeight: 600, color: 'var(--ev-primary)' }}>
        <BookOpen size={24} style={{ color: 'var(--ev-primary)' }} /> {userProfile.role === 'STUDENT' ? 'Student Workspace' : 'My Subjects'}
      </h2>

      {renderStudentOverview()}

      <Notices userProfile={userProfile} />
      
      {subjects.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', backgroundColor: 'var(--ev-background)', border: '1px dashed var(--ev-border)', borderRadius: '12px', color: 'var(--ev-text-secondary)' }}>
          {userProfile.role === 'TEACHER' ? "You are not assigned to any subjects yet." : "You are not enrolled in any subjects yet."}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px', marginTop: '24px' }}>
          {subjects.map(subject => (
            <div key={subject.id} style={{ 
              backgroundColor: 'var(--ev-surface)', 
              border: '1px solid var(--ev-border)', 
              borderRadius: '10px', 
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
            onClick={() => setActiveSubject(subject)}
            onMouseOver={e => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
              e.currentTarget.style.borderColor = 'var(--ev-primary-light)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
              e.currentTarget.style.borderColor = 'var(--ev-border)';
              e.currentTarget.style.transform = 'none';
            }}
            >
              <div style={{ fontWeight: 600, fontSize: '18px', color: 'var(--ev-text)', lineHeight: '1.3' }}>{subject.name}</div>
              {subject.code && <div style={{ fontSize: '13px', color: 'var(--ev-text-secondary)', padding: '2px 8px', backgroundColor: 'var(--ev-background)', borderRadius: '6px', alignSelf: 'flex-start', border: '1px solid var(--ev-divider)' }}>{subject.code}</div>}
              
              <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--ev-divider)', fontSize: '13px', color: 'var(--ev-text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {userProfile.role === 'TEACHER' ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Total Documents:</span>
                      <span style={{ fontWeight: 600, color: 'var(--ev-text)' }}>{subject.documents?.length || 0}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Unlocked:</span>
                      <span style={{ fontWeight: 600, color: 'var(--ev-teal)' }}>{subject.documents?.filter(d => d.status === 'PUBLISHED').length || 0}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Locked:</span>
                      <span style={{ fontWeight: 600, color: 'var(--ev-locked)' }}>{subject.documents?.filter(d => d.status === 'DRAFT').length || 0}</span>
                    </div>
                  </>
                ) : (
                  <div>{subject.documents ? subject.documents.length : 0} published material{subject.documents?.length === 1 ? '' : 's'}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
