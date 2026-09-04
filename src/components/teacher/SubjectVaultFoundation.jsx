import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  ArrowLeft, FileText, Folder, BookOpen, Download, 
  Clock, CheckCircle, Archive, ShieldAlert, Info, Bell,
  Calendar, Layers, Hash, UserCheck, Search, Filter
} from 'lucide-react';
import {
  Button,
  IconButton,
  Input,
  Select,
  SummaryCard,
  Badge,
  EmptyState,
  PageHeader
} from '../ui';
import Notices from '../../Notices';

export default function SubjectVaultFoundation({ subject, userProfile, onBack }) {
  const [activeTab, setActiveTab] = useState('materials'); // 'materials' | 'folders' | 'info' | 'notices'
  const [isVerifying, setIsVerifying] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authErrorMsg, setAuthErrorMsg] = useState('');

  // Vault data
  const [documents, setDocuments] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // 1. Rigorous Teacher Assignment Verification
  const verifyAccess = useCallback(async () => {
    if (!subject?.id || !userProfile?.id) {
      setIsAuthorized(false);
      setIsVerifying(false);
      return;
    }

    // Admins have oversight; Teachers MUST have explicit assignment in teacher_assignments
    if (userProfile.role === 'ADMIN') {
      setIsAuthorized(true);
      setIsVerifying(false);
      return;
    }

    try {
      const { data: assignment, error } = await supabase
        .from('teacher_assignments')
        .select('id, user_id, subject_id')
        .eq('user_id', userProfile.id)
        .eq('subject_id', subject.id)
        .maybeSingle();

      if (error) {
        console.error('Security verification error:', error);
        setAuthErrorMsg(error.message);
        setIsAuthorized(false);
      } else if (assignment) {
        setIsAuthorized(true);
      } else {
        setAuthErrorMsg('You do not have an active teaching allocation for this subject.');
        setIsAuthorized(false);
      }
    } catch (err) {
      console.error('Verification failed:', err);
      setAuthErrorMsg(err.message);
      setIsAuthorized(false);
    } finally {
      setIsVerifying(false);
    }
  }, [subject, userProfile]);

  useEffect(() => {
    verifyAccess();
  }, [verifyAccess]);

  // 2. Fetch Existing Documents and Folders for Subject
  const fetchVaultContent = useCallback(async () => {
    if (!subject?.id || !isAuthorized) return;
    setLoadingData(true);

    try {
      const [{ data: docsData, error: docsErr }, { data: foldersData, error: foldersErr }] = await Promise.all([
        supabase
          .from('documents')
          .select('*, active_version:document_versions(*)')
          .eq('subject_id', subject.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('folders')
          .select('*')
          .eq('subject_id', subject.id)
          .order('name', { ascending: true })
      ]);

      if (docsErr) console.warn('Documents fetch error:', docsErr);
      if (foldersErr) console.warn('Folders fetch error:', foldersErr);

      setDocuments(docsData || []);
      setFolders(foldersData || []);
    } catch (err) {
      console.error('Vault data fetch error:', err);
    } finally {
      setLoadingData(false);
    }
  }, [subject, isAuthorized]);

  useEffect(() => {
    if (isAuthorized) {
      fetchVaultContent();
    }
  }, [isAuthorized, fetchVaultContent]);

  // Document Download Handler (if storage file available)
  const handleDownload = async (doc) => {
    const version = Array.isArray(doc.active_version) ? doc.active_version[0] : doc.active_version;
    if (!version || !version.storage_path) {
      alert('No binary payload attached to this document version.');
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from('eduvault-documents')
        .createSignedUrl(version.storage_path, 60);

      if (error) {
        alert('Failed to retrieve secure URL: ' + error.message);
      } else if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (err) {
      alert('Download error: ' + err.message);
    }
  };

  // Breadcrumb Hierarchy Resolution
  const yearName = subject?.term?.program?.academic_year?.name || 'Academic Year';
  const isYearActive = subject?.term?.program?.academic_year?.is_active;
  const programName = subject?.term?.program?.name || 'Program';
  const termName = subject?.term?.name || 'Term';

  // Filtered Documents
  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      const matchesSearch = !searchQuery.trim() || 
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.description && doc.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === 'ALL' || doc.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [documents, searchQuery, statusFilter]);

  // Loading State
  if (isVerifying) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--ev-text-secondary)' }}>
        <div style={{ marginBottom: '12px', fontSize: '15px', fontWeight: 500 }}>
          Verifying security and instructional allocations...
        </div>
      </div>
    );
  }

  // Access Denied State (Teacher Boundary Enforcement)
  if (!isAuthorized) {
    return (
      <div style={{ padding: '40px 20px', maxWidth: '640px', margin: '0 auto' }}>
        <EmptyState
          icon={ShieldAlert}
          title="Subject Access Denied"
          description={authErrorMsg || "You are not assigned as an instructor for this subject. In accordance with academic security policies, subject vaults are strictly limited to assigned faculty members."}
          action={
            <Button variant="primary" icon={ArrowLeft} onClick={onBack}>
              Return to My Subjects
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', color: 'var(--ev-text)' }}>
      {/* Vault Header */}
      <div style={{ 
        padding: '20px 28px', 
        borderBottom: '1px solid var(--ev-border)',
        background: 'var(--ev-surface)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {/* Navigation Back & Context Breadcrumbs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <Button variant="tertiary" size="compact" icon={ArrowLeft} onClick={onBack}>
            Back to My Subjects
          </Button>
          <span style={{ color: 'var(--ev-border)' }}>|</span>
          <div style={{ fontSize: '12px', color: 'var(--ev-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>{yearName}</span>
            {isYearActive && (
              <span style={{ fontSize: '10px', background: '#D1FAE5', color: '#065F46', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                Active Cycle
              </span>
            )}
            <span>›</span>
            <span>{programName}</span>
            <span>›</span>
            <span>{termName}</span>
            <span>›</span>
            <span style={{ color: 'var(--ev-text)', fontWeight: 600 }}>{subject.name}</span>
          </div>
        </div>

        {/* Title, Code & Action Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
                {subject.name}
              </h1>
              {subject.code && (
                <span className="ev-badge" style={{ background: 'var(--ev-surface-elevated)', border: '1px solid var(--ev-border)', color: 'var(--ev-text)', fontFamily: 'monospace', fontSize: '12px' }}>
                  {subject.code}
                </span>
              )}
              <Badge status="active">Assigned Faculty</Badge>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--ev-text-secondary)', marginTop: '4px' }}>
              Official Subject Vault · {termName} · {programName}
            </div>
          </div>
        </div>

        {/* Vault Tabs */}
        <div className="ev-tabs-header" style={{ marginTop: '8px', borderBottom: 'none' }}>
          <button 
            className={`ev-tab-btn ${activeTab === 'materials' ? 'active' : ''}`}
            onClick={() => setActiveTab('materials')}
          >
            <FileText size={15} style={{ marginRight: '6px' }} />
            Curricular Materials ({documents.length})
          </button>
          <button 
            className={`ev-tab-btn ${activeTab === 'folders' ? 'active' : ''}`}
            onClick={() => setActiveTab('folders')}
          >
            <Folder size={15} style={{ marginRight: '6px' }} />
            Vault Folders ({folders.length})
          </button>
          <button 
            className={`ev-tab-btn ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            <Info size={15} style={{ marginRight: '6px' }} />
            Subject Details
          </button>
          <button 
            className={`ev-tab-btn ${activeTab === 'notices' ? 'active' : ''}`}
            onClick={() => setActiveTab('notices')}
          >
            <Bell size={15} style={{ marginRight: '6px' }} />
            Course Notices
          </button>
        </div>
      </div>

      {/* Vault Body Content */}
      <div style={{ flex: 1, padding: '24px 28px', overflowY: 'auto' }}>
        {/* Tab 1: Curricular Materials */}
        {activeTab === 'materials' && (
          <div>
            {/* Search & Filter Toolbar */}
            <div style={{ display: 'flex', gap: '14px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: '240px', maxWidth: '400px' }}>
                <Input
                  placeholder="Search materials in vault..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  icon={Search}
                  size="compact"
                />
              </div>
              <div style={{ width: '180px' }}>
                <Select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  size="compact"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="DRAFT">Drafts (Locked)</option>
                  <option value="PUBLISHED">Published (Unlocked)</option>
                  <option value="ARCHIVED">Archived</option>
                </Select>
              </div>
            </div>

            {loadingData ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--ev-text-secondary)' }}>
                Loading subject documents...
              </div>
            ) : filteredDocs.length === 0 ? (
              <EmptyState
                icon={FileText}
                title={searchQuery || statusFilter !== 'ALL' ? "No matching materials" : "Curricular Materials Vault"}
                description={
                  searchQuery || statusFilter !== 'ALL' 
                    ? "No documents matched your query. Try resetting your search filters."
                    : "No instructional materials are currently in this vault. Full document authoring, file uploading, and publication lifecycles will be enabled in the upcoming Materials Governance phase."
                }
                action={
                  searchQuery || statusFilter !== 'ALL' ? (
                    <Button variant="secondary" size="compact" onClick={() => { setSearchQuery(''); setStatusFilter('ALL'); }}>
                      Reset Filters
                    </Button>
                  ) : null
                }
              />
            ) : (
              <div className="ev-table-wrapper">
                <table className="ev-table">
                  <thead>
                    <tr>
                      <th className="ev-th">Document Title</th>
                      <th className="ev-th">Lifecycle Status</th>
                      <th className="ev-th">Active Version</th>
                      <th className="ev-th">Created Date</th>
                      <th className="ev-th" style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocs.map(doc => {
                      const version = Array.isArray(doc.active_version) ? doc.active_version[0] : doc.active_version;
                      const isDraft = doc.status === 'DRAFT';
                      const isPublished = doc.status === 'PUBLISHED';
                      const isArchived = doc.status === 'ARCHIVED';

                      return (
                        <tr key={doc.id} className="ev-tr">
                          <td className="ev-td">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <FileText size={18} style={{ color: 'var(--ev-primary)', flexShrink: 0 }} />
                              <div>
                                <div style={{ fontWeight: 600 }}>{doc.title}</div>
                                {doc.description && (
                                  <div style={{ fontSize: '12px', color: 'var(--ev-text-secondary)', marginTop: '2px' }}>
                                    {doc.description}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="ev-td">
                            {isDraft && <Badge status="inactive">Locked (Draft)</Badge>}
                            {isPublished && <Badge status="active">Published</Badge>}
                            {isArchived && <Badge status="inactive">Archived</Badge>}
                          </td>
                          <td className="ev-td" style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                            {version ? `v${version.version_number} (${(version.file_size / (1024 * 1024)).toFixed(2)} MB)` : '—'}
                          </td>
                          <td className="ev-td" style={{ fontSize: '12px', color: 'var(--ev-text-secondary)' }}>
                            {new Date(doc.created_at).toLocaleDateString()}
                          </td>
                          <td className="ev-td" style={{ textAlign: 'right' }}>
                            {version && (
                              <Button
                                variant="secondary"
                                size="compact"
                                icon={Download}
                                onClick={() => handleDownload(doc)}
                              >
                                Download
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Vault Folders */}
        {activeTab === 'folders' && (
          <div>
            {folders.length === 0 ? (
              <EmptyState
                icon={Folder}
                title="No Vault Folders Created"
                description="Folders provide secondary structural groupings for curriculum modules and unit topics inside this subject vault."
              />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                {folders.map(folder => (
                  <div key={folder.id} className="ev-surface-card" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--ev-primary-light)', color: 'var(--ev-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Folder size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>{folder.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--ev-text-secondary)' }}>Curriculum Unit Folder</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Subject Information & Placement */}
        {activeTab === 'info' && (
          <div style={{ maxWidth: '800px' }}>
            <div className="ev-surface-card" style={{ marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600 }}>
                Academic Placement & Hierarchy
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--ev-text-secondary)' }}>Official Subject Name</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, marginTop: '2px' }}>{subject.name}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--ev-text-secondary)' }}>Institutional Course Code</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, marginTop: '2px', fontFamily: 'monospace' }}>
                    {subject.code || 'Unassigned'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--ev-text-secondary)' }}>Academic Term / Section</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, marginTop: '2px' }}>{termName}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--ev-text-secondary)' }}>Academic Program / Degree</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, marginTop: '2px' }}>{programName}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--ev-text-secondary)' }}>Academic Calendar Year</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, marginTop: '2px' }}>
                    {yearName} {isYearActive ? '(Active Cycle)' : '(Inactive Cycle)'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--ev-text-secondary)' }}>Allocated Instructor</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, marginTop: '2px' }}>
                    {userProfile.full_name} ({userProfile.email})
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Course Notices */}
        {activeTab === 'notices' && (
          <div>
            <Notices userProfile={userProfile} subjectId={subject.id} />
          </div>
        )}
      </div>
    </div>
  );
}
