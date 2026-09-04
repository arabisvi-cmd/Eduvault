import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  School, BookOpen, Search, ArrowRight, FileText, 
  Folder, Calendar, AlertCircle, Layers, Filter, CheckCircle
} from 'lucide-react';
import {
  Button,
  Input,
  Select,
  Badge,
  EmptyState,
  PageHeader
} from '../ui';
import SubjectVaultFoundation from './SubjectVaultFoundation';

export default function TeacherMySubjects({ userProfile }) {
  const [assignments, setAssignments] = useState([]);
  const [docCounts, setDocCounts] = useState({});
  const [folderCounts, setFolderCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  // Selected Subject for Vault Context
  const [activeSubject, setActiveSubject] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [cycleFilter, setCycleFilter] = useState('CURRENT'); // 'CURRENT' | 'ALL'

  // Fetch Teacher Assignments with Full Academic Hierarchy
  const fetchTeacherAssignments = useCallback(async () => {
    if (!userProfile?.id) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      // Strictly query official assignments for this authenticated teacher
      const { data, error } = await supabase
        .from('teacher_assignments')
        .select(`
          id,
          created_at,
          subject:subjects(
            id,
            name,
            code,
            term:terms(
              id,
              name,
              program:programs(
                id,
                name,
                academic_year:academic_years(
                  id,
                  name,
                  is_active
                )
              )
            )
          )
        `)
        .eq('user_id', userProfile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const validAssignments = (data || []).filter(a => a.subject);
      setAssignments(validAssignments);

      // Extract subject IDs to fetch REAL document & folder counts
      const subjectIds = validAssignments.map(a => a.subject.id);
      if (subjectIds.length > 0) {
        const [{ data: docs }, { data: folders }] = await Promise.all([
          supabase.from('documents').select('id, subject_id').in('subject_id', subjectIds),
          supabase.from('folders').select('id, subject_id').in('subject_id', subjectIds)
        ]);

        const dCounts = {};
        (docs || []).forEach(d => {
          dCounts[d.subject_id] = (dCounts[d.subject_id] || 0) + 1;
        });
        setDocCounts(dCounts);

        const fCounts = {};
        (folders || []).forEach(f => {
          fCounts[f.subject_id] = (fCounts[f.subject_id] || 0) + 1;
        });
        setFolderCounts(fCounts);
      }
    } catch (err) {
      console.error('Error loading teacher assignments:', err);
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }, [userProfile]);

  useEffect(() => {
    fetchTeacherAssignments();
  }, [fetchTeacherAssignments]);

  // Check if any assigned subject belongs to an active academic year
  const hasActiveYearAssignments = useMemo(() => {
    return assignments.some(a => a.subject?.term?.program?.academic_year?.is_active);
  }, [assignments]);

  // Filtered Subject List
  const filteredSubjects = useMemo(() => {
    return assignments.filter(item => {
      const subj = item.subject;
      if (!subj) return false;

      // Cycle Filter: 'CURRENT' checks for active year
      if (cycleFilter === 'CURRENT' && hasActiveYearAssignments) {
        const isYearActive = subj.term?.program?.academic_year?.is_active;
        if (!isYearActive) return false;
      }

      // Search Query Filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = subj.name.toLowerCase().includes(query);
        const matchesCode = subj.code ? subj.code.toLowerCase().includes(query) : false;
        const matchesTerm = subj.term?.name.toLowerCase().includes(query);
        const matchesProgram = subj.term?.program?.name.toLowerCase().includes(query);
        return matchesName || matchesCode || matchesTerm || matchesProgram;
      }

      return true;
    });
  }, [assignments, cycleFilter, hasActiveYearAssignments, searchQuery]);

  // If a Subject is selected, render Subject Vault Foundation
  if (activeSubject) {
    return (
      <SubjectVaultFoundation
        subject={activeSubject}
        userProfile={userProfile}
        onBack={() => setActiveSubject(null)}
      />
    );
  }

  return (
    <div style={{ padding: '0', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <PageHeader
        title="My Assigned Subjects"
        description="Official academic courses assigned to you by your institution's administrator."
      />

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', gap: '14px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search Input */}
        <div style={{ flex: 1, minWidth: '240px', maxWidth: '420px' }}>
          <Input
            placeholder="Search by subject name, code, or term..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            icon={Search}
            size="compact"
          />
        </div>

        {/* Active vs Historical Pills */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            variant={cycleFilter === 'CURRENT' ? 'primary' : 'secondary'}
            size="compact"
            onClick={() => setCycleFilter('CURRENT')}
          >
            Current Academic Year
          </Button>
          <Button
            variant={cycleFilter === 'ALL' ? 'primary' : 'secondary'}
            size="compact"
            onClick={() => setCycleFilter('ALL')}
          >
            All / Previous Years ({assignments.length})
          </Button>
        </div>
      </div>

      {/* Notice if no active academic year exists */}
      {!hasActiveYearAssignments && assignments.length > 0 && (
        <div style={{
          marginBottom: '20px',
          padding: '12px 16px',
          background: 'rgba(30, 58, 95, 0.06)',
          border: '1px solid var(--ev-border)',
          borderRadius: '8px',
          fontSize: '13px',
          color: 'var(--ev-text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertCircle size={16} style={{ color: 'var(--ev-primary)', flexShrink: 0 }} />
          <span>
            No active academic year is currently flagged by your administrator. Showing all historical allocations.
          </span>
        </div>
      )}

      {/* Main Content */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--ev-text-secondary)' }}>
          Loading your assigned courses...
        </div>
      ) : errorMsg ? (
        <EmptyState
          icon={AlertCircle}
          title="Failed to Load Subjects"
          description={errorMsg}
          action={
            <Button variant="secondary" onClick={fetchTeacherAssignments}>
              Retry Query
            </Button>
          }
        />
      ) : assignments.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No Subjects Assigned"
          description="You are not currently assigned to any subjects. Your institutional administrator manages faculty allocations through Academic Setup."
        />
      ) : filteredSubjects.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No Matching Subjects Found"
          description="Try adjusting your search terms or view historical academic years."
          action={
            <Button variant="secondary" size="compact" onClick={() => { setSearchQuery(''); setCycleFilter('ALL'); }}>
              Reset Filters
            </Button>
          }
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {filteredSubjects.map(item => {
            const subj = item.subject;
            const year = subj.term?.program?.academic_year;
            const isYearActive = year?.is_active;
            const docCount = docCounts[subj.id] || 0;
            const folderCount = folderCounts[subj.id] || 0;

            return (
              <div
                key={item.id}
                className="ev-surface-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  cursor: 'pointer',
                  transition: 'var(--transition-smooth)'
                }}
                onClick={() => setActiveSubject(subj)}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--ev-primary)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--ev-border)';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                {/* Header: Name, Code & Status */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                    <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: 'var(--ev-text)' }}>
                      {subj.name}
                    </h3>
                    <Badge status="active">Assigned</Badge>
                  </div>
                  {subj.code && (
                    <span style={{ 
                      display: 'inline-block', 
                      fontSize: '11px', 
                      fontFamily: 'monospace', 
                      padding: '2px 6px', 
                      background: 'var(--ev-surface-elevated)', 
                      border: '1px solid var(--ev-border)', 
                      borderRadius: '4px',
                      color: 'var(--ev-text-secondary)'
                    }}>
                      {subj.code}
                    </span>
                  )}
                </div>

                {/* Academic Placement Breadcrumbs */}
                <div style={{ fontSize: '13px', color: 'var(--ev-text-secondary)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{ fontWeight: 500, color: 'var(--ev-text)' }}>
                    {subj.term?.name || 'Term'} · {subj.term?.program?.name || 'Program'}
                  </div>
                  <div style={{ fontSize: '12px' }}>
                    {year?.name || 'Academic Year'} {isYearActive && <span style={{ color: '#059669', fontWeight: 600 }}>• Active</span>}
                  </div>
                </div>

                {/* Real Counts and Enter CTA */}
                <div style={{ 
                  marginTop: 'auto', 
                  paddingTop: '12px', 
                  borderTop: '1px solid var(--ev-border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ fontSize: '12px', color: 'var(--ev-text-secondary)', display: 'flex', gap: '12px' }}>
                    <span>{docCount} document{docCount === 1 ? '' : 's'}</span>
                    {folderCount > 0 && <span>{folderCount} folder{folderCount === 1 ? '' : 's'}</span>}
                  </div>
                  <Button
                    variant="primary"
                    size="compact"
                    iconRight={ArrowRight}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveSubject(subj);
                    }}
                  >
                    Enter Vault
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
