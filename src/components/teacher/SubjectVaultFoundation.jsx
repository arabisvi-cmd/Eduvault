import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  ArrowLeft, FileText, Folder, BookOpen, Download, 
  Clock, CheckCircle, Archive, ShieldAlert, Info, Bell,
  Calendar, Layers, Hash, UserCheck, Search, Filter,
  Upload, History, RefreshCw, FolderPlus, Edit2, Trash2,
  AlertCircle, X, FileUp, ExternalLink, Lock, Unlock,
  ChevronRight, Eye
} from 'lucide-react';
import {
  Button,
  IconButton,
  Input,
  Select,
  Badge,
  EmptyState,
  Modal,
  FormField
} from '../ui';
import Notices from '../../Notices';
import {
  createDocumentWithInitialVersion,
  replaceDocumentVersion,
  updateDocumentStatus,
  createFolder,
  renameFolder,
  deleteFolder,
  downloadDocumentVersion,
  validateDocumentFile,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE
} from '../../lib/documents';

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
  const [folderFilter, setFolderFilter] = useState('ALL');

  // In-app Toast Feedback
  const [toast, setToast] = useState(null); // { message: string, type: 'success' | 'error' }
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  // Modals & Action States
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({ file: null, title: '', description: '', folderId: '' });
  const [uploadFileError, setUploadFileError] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Version History Modal
  const [historyModalDoc, setHistoryModalDoc] = useState(null);
  const [docVersions, setDocVersions] = useState([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  // Replace Version Modal
  const [replaceModalDoc, setReplaceModalDoc] = useState(null);
  const [replaceFile, setReplaceFile] = useState(null);
  const [replaceFileError, setReplaceFileError] = useState(null);
  const [replaceChangeNotes, setReplaceChangeNotes] = useState('');
  const [isReplacing, setIsReplacing] = useState(false);
  const replaceFileInputRef = useRef(null);

  // Lifecycle Confirmation Modal
  const [lifecycleModal, setLifecycleModal] = useState(null); // { doc, targetStatus }
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Document Details Modal
  const [detailsModalDoc, setDetailsModalDoc] = useState(null);

  // Folder Modals
  const [createFolderModalOpen, setCreateFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderParentId, setNewFolderParentId] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  const [renameFolderModal, setRenameFolderModal] = useState(null); // folder object
  const [renameFolderName, setRenameFolderName] = useState('');
  const [isRenamingFolder, setIsRenamingFolder] = useState(false);

  const [deleteFolderModal, setDeleteFolderModal] = useState(null); // folder object
  const [isDeletingFolder, setIsDeletingFolder] = useState(false);

  // 1. Rigorous Teacher Assignment Verification
  const verifyAccess = useCallback(async () => {
    if (!subject?.id || !userProfile?.id) {
      setIsAuthorized(false);
      setIsVerifying(false);
      return;
    }

    // Admins have institutional oversight; Teachers MUST have explicit assignment in teacher_assignments
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
          .select(`
            *,
            active_version:document_versions!documents_active_version_id_fkey(*),
            folder:folders(id, name)
          `)
          .eq('subject_id', subject.id)
          .order('updated_at', { ascending: false }),
        supabase
          .from('folders')
          .select('*')
          .eq('subject_id', subject.id)
          .order('name', { ascending: true })
      ]);

      if (docsErr) {
        console.error('Documents fetch error:', docsErr);
        showToast('Failed to load curricular documents: ' + docsErr.message, 'error');
      }
      if (foldersErr) {
        console.error('Folders fetch error:', foldersErr);
      }

      setDocuments(docsData || []);
      setFolders(foldersData || []);
    } catch (err) {
      console.error('Vault data fetch error:', err);
      showToast('Error loading subject vault content: ' + err.message, 'error');
    } finally {
      setLoadingData(false);
    }
  }, [subject, isAuthorized]);

  useEffect(() => {
    if (isAuthorized) {
      fetchVaultContent();
    }
  }, [isAuthorized, fetchVaultContent]);

  // Secure Document Download Handler
  const handleDownload = async (doc) => {
    const version = Array.isArray(doc.active_version) ? doc.active_version[0] : doc.active_version;
    if (!version || !version.storage_path) {
      showToast('No physical file binary attached to this document version.', 'error');
      return;
    }

    try {
      const res = await downloadDocumentVersion(version.storage_path, { expiresIn: 60 });
      if (!res.success) {
        showToast(res.error || 'Failed to generate secure download link.', 'error');
        return;
      }
      window.open(res.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      showToast('Download error: ' + err.message, 'error');
    }
  };

  const handleDownloadStoragePath = async (storagePath) => {
    if (!storagePath) {
      showToast('Missing storage path for this version.', 'error');
      return;
    }
    try {
      const res = await downloadDocumentVersion(storagePath, { expiresIn: 60 });
      if (!res.success) {
        showToast(res.error || 'Failed to generate secure download link.', 'error');
        return;
      }
      window.open(res.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      showToast('Download error: ' + err.message, 'error');
    }
  };

  // 3. Upload New Material Handler
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setUploadForm(prev => ({ ...prev, file: null }));
      setUploadFileError(null);
      return;
    }

    const validation = validateDocumentFile(file);
    if (!validation.valid) {
      setUploadFileError(validation.error);
      setUploadForm(prev => ({ ...prev, file: null }));
      return;
    }

    setUploadFileError(null);
    setUploadForm(prev => ({
      ...prev,
      file,
      // Auto-populate title if empty
      title: prev.title.trim() ? prev.title : file.name.replace(/\.[^/.]+$/, '')
    }));
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadForm.file || !uploadForm.title.trim() || isUploading) return;

    setIsUploading(true);
    try {
      const res = await createDocumentWithInitialVersion({
        file: uploadForm.file,
        subjectId: subject.id,
        folderId: uploadForm.folderId || null,
        title: uploadForm.title.trim(),
        description: uploadForm.description.trim() || null
      });

      if (!res.success) {
        showToast(res.error || 'Failed to upload document.', 'error');
        return;
      }

      showToast(`Document "${res.document.title}" uploaded successfully in Draft status.`, 'success');
      setUploadModalOpen(false);
      setUploadForm({ file: null, title: '', description: '', folderId: '' });
      setUploadFileError(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await fetchVaultContent();
    } catch (err) {
      showToast('Upload failed: ' + err.message, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // 4. Version History Handler
  const handleOpenHistory = async (doc) => {
    setHistoryModalDoc(doc);
    setDocVersions([]);
    setLoadingVersions(true);
    try {
      const { data, error } = await supabase
        .from('document_versions')
        .select('*, uploader:users(full_name)')
        .eq('document_id', doc.id)
        .order('version_number', { ascending: false });

      if (error) {
        showToast('Failed to load version history: ' + error.message, 'error');
      } else {
        setDocVersions(data || []);
      }
    } catch (err) {
      showToast('Error loading version history: ' + err.message, 'error');
    } finally {
      setLoadingVersions(false);
    }
  };

  // 5. Replace Version Handler
  const handleReplaceFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setReplaceFile(null);
      setReplaceFileError(null);
      return;
    }

    const validation = validateDocumentFile(file);
    if (!validation.valid) {
      setReplaceFileError(validation.error);
      setReplaceFile(null);
      return;
    }

    setReplaceFileError(null);
    setReplaceFile(file);
  };

  const handleReplaceSubmit = async (e) => {
    e.preventDefault();
    if (!replaceModalDoc || !replaceFile || isReplacing) return;

    setIsReplacing(true);
    try {
      const res = await replaceDocumentVersion(
        replaceModalDoc.id,
        replaceFile,
        replaceChangeNotes.trim()
      );

      if (!res.success) {
        showToast(res.error || 'Failed to update document version.', 'error');
        return;
      }

      showToast(`Version v${res.version.version_number} uploaded and activated successfully.`, 'success');
      setReplaceModalDoc(null);
      setReplaceFile(null);
      setReplaceFileError(null);
      setReplaceChangeNotes('');
      if (replaceFileInputRef.current) replaceFileInputRef.current.value = '';
      await fetchVaultContent();
    } catch (err) {
      showToast('Version replacement failed: ' + err.message, 'error');
    } finally {
      setIsReplacing(false);
    }
  };

  // 6. Lifecycle Transition Handler
  const handleConfirmLifecycle = async () => {
    if (!lifecycleModal || isUpdatingStatus) return;

    const { doc, targetStatus } = lifecycleModal;
    setIsUpdatingStatus(true);
    try {
      const res = await updateDocumentStatus(doc.id, targetStatus);
      if (!res.success) {
        showToast(res.error || `Failed to transition document to ${targetStatus}.`, 'error');
        return;
      }

      const statusLabels = {
        PUBLISHED: 'published to enrolled students',
        DRAFT: 'returned to locked draft',
        ARCHIVED: 'archived for historical record'
      };

      showToast(`Document "${doc.title}" has been ${statusLabels[targetStatus] || targetStatus}.`, 'success');
      setLifecycleModal(null);
      await fetchVaultContent();
    } catch (err) {
      showToast('Status update failed: ' + err.message, 'error');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // 7. Folder Operation Handlers
  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim() || isCreatingFolder) return;

    setIsCreatingFolder(true);
    try {
      const res = await createFolder({
        subjectId: subject.id,
        name: newFolderName.trim(),
        parentFolderId: newFolderParentId || null
      });

      if (!res.success) {
        showToast(res.error || 'Failed to create folder.', 'error');
        return;
      }

      showToast(`Folder "${res.folder.name}" created successfully.`, 'success');
      setCreateFolderModalOpen(false);
      setNewFolderName('');
      setNewFolderParentId('');
      await fetchVaultContent();
    } catch (err) {
      showToast('Folder creation failed: ' + err.message, 'error');
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleRenameFolder = async (e) => {
    e.preventDefault();
    if (!renameFolderModal || !renameFolderName.trim() || isRenamingFolder) return;

    setIsRenamingFolder(true);
    try {
      const res = await renameFolder(renameFolderModal.id, renameFolderName.trim());
      if (!res.success) {
        showToast(res.error || 'Failed to rename folder.', 'error');
        return;
      }

      showToast(`Folder renamed to "${res.folder.name}".`, 'success');
      setRenameFolderModal(null);
      setRenameFolderName('');
      await fetchVaultContent();
    } catch (err) {
      showToast('Rename failed: ' + err.message, 'error');
    } finally {
      setIsRenamingFolder(false);
    }
  };

  const handleDeleteFolder = async () => {
    if (!deleteFolderModal || isDeletingFolder) return;

    setIsDeletingFolder(true);
    try {
      const res = await deleteFolder(deleteFolderModal.id);
      if (!res.success) {
        showToast(res.error || 'Failed to delete folder.', 'error');
        return;
      }

      showToast(`Folder "${deleteFolderModal.name}" deleted. Contained documents preserved at subject root.`, 'success');
      setDeleteFolderModal(null);
      await fetchVaultContent();
    } catch (err) {
      showToast('Delete folder failed: ' + err.message, 'error');
    } finally {
      setIsDeletingFolder(false);
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
      
      let matchesFolder = true;
      if (folderFilter === 'ROOT') {
        matchesFolder = !doc.folder_id;
      } else if (folderFilter !== 'ALL') {
        matchesFolder = doc.folder_id === folderFilter;
      }

      return matchesSearch && matchesStatus && matchesFolder;
    });
  }, [documents, searchQuery, statusFilter, folderFilter]);

  // Helper to format file size
  const formatFileSize = (bytes) => {
    if (!bytes || isNaN(bytes)) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Loading State
  if (isVerifying) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--ev-text-secondary)' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 500 }}>
          <span className="ev-btn-spinner" aria-hidden="true" style={{ width: '18px', height: '18px' }} />
          <span>Verifying academic authority and institutional allocations...</span>
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
      {/* Toast Notification Banner */}
      {toast && (
        <div className={`ev-toast-banner ${toast.type === 'error' ? 'error' : 'success'}`}>
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

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
            {/* Header & Action Area */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Materials</h2>
                <div style={{ fontSize: '13px', color: 'var(--ev-text-secondary)', marginTop: '2px' }}>
                  Upload, version, and manage course documents and instructional assets for enrolled students.
                </div>
              </div>
              <Button
                variant="primary"
                icon={Upload}
                onClick={() => {
                  setUploadForm({ file: null, title: '', description: '', folderId: '' });
                  setUploadFileError(null);
                  setUploadModalOpen(true);
                }}
              >
                Upload Material
              </Button>
            </div>

            {/* Search & Filter Toolbar */}
            <div style={{ display: 'flex', gap: '14px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: '220px', maxWidth: '380px' }}>
                <Input
                  placeholder="Search materials by title or description..."
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
              <div style={{ width: '200px' }}>
                <Select
                  value={folderFilter}
                  onChange={e => setFolderFilter(e.target.value)}
                  size="compact"
                >
                  <option value="ALL">All Folders</option>
                  <option value="ROOT">Subject Root (No Folder)</option>
                  {folders.map(f => (
                    <option key={f.id} value={f.id}>Folder: {f.name}</option>
                  ))}
                </Select>
              </div>
            </div>

            {loadingData ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--ev-text-secondary)' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                  <span className="ev-btn-spinner" aria-hidden="true" style={{ width: '16px', height: '16px' }} />
                  <span>Loading subject documents...</span>
                </div>
              </div>
            ) : filteredDocs.length === 0 ? (
              <EmptyState
                icon={FileText}
                title={searchQuery || statusFilter !== 'ALL' || folderFilter !== 'ALL' ? "No matching materials" : "Curricular Materials Vault"}
                description={
                  searchQuery || statusFilter !== 'ALL' || folderFilter !== 'ALL'
                    ? "No documents matched your search or selected filters. Try clearing your filters."
                    : "No instructional materials have been uploaded to this subject vault yet. Upload syllabi, lecture slides, or lab manuals to get started."
                }
                action={
                  searchQuery || statusFilter !== 'ALL' || folderFilter !== 'ALL' ? (
                    <Button variant="secondary" size="compact" onClick={() => { setSearchQuery(''); setStatusFilter('ALL'); setFolderFilter('ALL'); }}>
                      Reset Filters
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      icon={Upload}
                      onClick={() => {
                        setUploadForm({ file: null, title: '', description: '', folderId: '' });
                        setUploadFileError(null);
                        setUploadModalOpen(true);
                      }}
                    >
                      Upload First Material
                    </Button>
                  )
                }
              />
            ) : (
              <div className="ev-table-wrapper" style={{ overflowX: 'auto' }}>
                <table className="ev-table">
                  <thead>
                    <tr>
                      <th className="ev-th" style={{ width: '32%' }}>Name</th>
                      <th className="ev-th" style={{ width: '15%' }}>Folder</th>
                      <th className="ev-th" style={{ width: '14%' }}>Version</th>
                      <th className="ev-th" style={{ width: '14%' }}>Status</th>
                      <th className="ev-th" style={{ width: '11%' }}>Updated</th>
                      <th className="ev-th" style={{ textAlign: 'right', width: '14%' }}>Actions</th>
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
                          {/* Name & Snippet */}
                          <td className="ev-td">
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                              <div style={{ marginTop: '2px', color: 'var(--ev-primary)', flexShrink: 0 }}>
                                <FileText size={18} />
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: '13px' }}>{doc.title}</div>
                                {doc.description && (
                                  <div style={{ fontSize: '12px', color: 'var(--ev-text-secondary)', marginTop: '2px', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {doc.description}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Folder */}
                          <td className="ev-td">
                            {doc.folder ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--ev-text)' }}>
                                <Folder size={14} style={{ color: 'var(--ev-text-secondary)' }} />
                                {doc.folder.name}
                              </span>
                            ) : (
                              <span style={{ fontSize: '12px', color: 'var(--ev-text-secondary)' }}>
                                Root
                              </span>
                            )}
                          </td>

                          {/* Version & Size */}
                          <td className="ev-td">
                            {version ? (
                              <div>
                                <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '12px', background: 'var(--ev-surface-elevated)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--ev-border)' }}>
                                  v{version.version_number}
                                </span>
                                <span style={{ fontSize: '11px', color: 'var(--ev-text-secondary)', marginLeft: '6px' }}>
                                  {formatFileSize(version.file_size)}
                                </span>
                              </div>
                            ) : (
                              <span style={{ color: 'var(--ev-text-secondary)', fontSize: '12px' }}>—</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="ev-td">
                            {isDraft && (
                              <span className="ev-badge" style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' }}>
                                <Lock size={11} style={{ marginRight: '4px' }} />
                                Draft (Locked)
                              </span>
                            )}
                            {isPublished && (
                              <Badge status="active">
                                <Unlock size={11} style={{ marginRight: '4px' }} />
                                Published
                              </Badge>
                            )}
                            {isArchived && (
                              <Badge status="inactive">
                                <Archive size={11} style={{ marginRight: '4px' }} />
                                Archived
                              </Badge>
                            )}
                          </td>

                          {/* Updated Date */}
                          <td className="ev-td" style={{ fontSize: '12px', color: 'var(--ev-text-secondary)' }}>
                            {new Date(doc.updated_at || doc.created_at).toLocaleDateString()}
                          </td>

                          {/* Actions */}
                          <td className="ev-td" style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                              {/* Download Active Version */}
                              {version && (
                                <IconButton
                                  icon={Download}
                                  variant="tertiary"
                                  size="compact"
                                  title="Download active file"
                                  ariaLabel="Download active file"
                                  onClick={() => handleDownload(doc)}
                                />
                              )}

                              {/* Version History */}
                              <IconButton
                                icon={History}
                                variant="tertiary"
                                size="compact"
                                title="View version history"
                                ariaLabel="View version history"
                                onClick={() => handleOpenHistory(doc)}
                              />

                              {/* Replace Version */}
                              <IconButton
                                icon={FileUp}
                                variant="tertiary"
                                size="compact"
                                title="Upload new version"
                                ariaLabel="Upload new version"
                                onClick={() => {
                                  setReplaceModalDoc(doc);
                                  setReplaceFile(null);
                                  setReplaceFileError(null);
                                  setReplaceChangeNotes('');
                                }}
                              />

                              {/* Lifecycle Actions */}
                              {isDraft && (
                                <Button
                                  variant="primary"
                                  size="compact"
                                  onClick={() => setLifecycleModal({ doc, targetStatus: 'PUBLISHED' })}
                                >
                                  Publish
                                </Button>
                              )}

                              {isPublished && (
                                <Button
                                  variant="secondary"
                                  size="compact"
                                  onClick={() => setLifecycleModal({ doc, targetStatus: 'DRAFT' })}
                                >
                                  Draft
                                </Button>
                              )}

                              {(isDraft || isPublished) && (
                                <IconButton
                                  icon={Archive}
                                  variant="tertiary"
                                  size="compact"
                                  title="Archive material"
                                  ariaLabel="Archive material"
                                  onClick={() => setLifecycleModal({ doc, targetStatus: 'ARCHIVED' })}
                                />
                              )}

                              {isArchived && (
                                <Button
                                  variant="secondary"
                                  size="compact"
                                  onClick={() => setLifecycleModal({ doc, targetStatus: 'DRAFT' })}
                                >
                                  Restore
                                </Button>
                              )}
                            </div>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Vault Folders</h2>
                <div style={{ fontSize: '13px', color: 'var(--ev-text-secondary)', marginTop: '2px' }}>
                  Create and organize curriculum modules and unit groupings within this subject.
                </div>
              </div>
              <Button
                variant="primary"
                icon={FolderPlus}
                onClick={() => {
                  setNewFolderName('');
                  setNewFolderParentId('');
                  setCreateFolderModalOpen(true);
                }}
              >
                New Folder
              </Button>
            </div>

            {folders.length === 0 ? (
              <EmptyState
                icon={Folder}
                title="No Vault Folders Created"
                description="Folders provide secondary structural groupings for curriculum modules and unit topics inside this subject vault."
                action={
                  <Button
                    variant="primary"
                    icon={FolderPlus}
                    onClick={() => {
                      setNewFolderName('');
                      setNewFolderParentId('');
                      setCreateFolderModalOpen(true);
                    }}
                  >
                    Create First Folder
                  </Button>
                }
              />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {folders.map(folder => {
                  const docCount = documents.filter(d => d.folder_id === folder.id).length;
                  return (
                    <div 
                      key={folder.id} 
                      className="ev-surface-card" 
                      style={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '14px',
                        padding: '16px',
                        borderRadius: '8px',
                        border: '1px solid var(--ev-border)',
                        background: 'var(--ev-surface)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <div style={{ 
                          width: '40px', 
                          height: '40px', 
                          borderRadius: '8px', 
                          background: 'var(--ev-primary-light)', 
                          color: 'var(--ev-primary)', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <Folder size={20} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {folder.name}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--ev-text-secondary)', marginTop: '2px' }}>
                            {docCount} {docCount === 1 ? 'document' : 'documents'} attached
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--ev-border)', paddingTop: '10px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--ev-text-secondary)' }}>
                          Created {new Date(folder.created_at).toLocaleDateString()}
                        </span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <IconButton
                            icon={Edit2}
                            variant="tertiary"
                            size="compact"
                            title="Rename folder"
                            ariaLabel="Rename folder"
                            onClick={() => {
                              setRenameFolderModal(folder);
                              setRenameFolderName(folder.name);
                            }}
                          />
                          <IconButton
                            icon={Trash2}
                            variant="danger-outline"
                            size="compact"
                            title="Delete folder"
                            ariaLabel="Delete folder"
                            onClick={() => setDeleteFolderModal(folder)}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Subject Details */}
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

      {/* ========================================================================= */}
      {/* MODAL 1: Upload Curricular Material */}
      {/* ========================================================================= */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={() => !isUploading && setUploadModalOpen(false)}
        title="Upload Curricular Material"
        description="Upload an instructional document to this subject vault. The asset will initially be created as a Draft."
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <Button
              variant="tertiary"
              onClick={() => setUploadModalOpen(false)}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              icon={Upload}
              loading={isUploading}
              disabled={!uploadForm.file || !uploadForm.title.trim() || !!uploadFileError}
              onClick={handleUploadSubmit}
            >
              {isUploading ? 'Uploading Material...' : 'Upload & Save Draft'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* File Selector */}
          <FormField
            label="File Document"
            required
            helperText="Supported formats: PDF, DOC, DOCX, XLS, XLSX, PNG, JPEG. Max file size: 50 MB."
            error={uploadFileError}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
              onChange={handleFileChange}
              disabled={isUploading}
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1px dashed var(--ev-border)',
                borderRadius: '6px',
                background: 'var(--ev-surface)',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            />
            {uploadForm.file && !uploadFileError && (
              <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--ev-text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={14} style={{ color: '#059669' }} />
                <span>Selected: <strong>{uploadForm.file.name}</strong> ({formatFileSize(uploadForm.file.size)})</span>
              </div>
            )}
          </FormField>

          {/* Document Title */}
          <FormField
            label="Document Title"
            required
            helperText="Clear, descriptive title identifying the material (max 255 characters)."
          >
            <Input
              value={uploadForm.title}
              onChange={e => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Optics & Wave Mechanics Syllabus"
              maxLength={255}
              disabled={isUploading}
            />
          </FormField>

          {/* Description */}
          <FormField
            label="Description (Optional)"
            helperText="Brief summary of topics or objectives covered."
          >
            <textarea
              className="ev-input"
              rows={3}
              value={uploadForm.description}
              onChange={e => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="e.g., Covers geometric optics, ray diagrams, thin lens equations, and diffraction..."
              maxLength={2000}
              disabled={isUploading}
              style={{ resize: 'vertical', width: '100%' }}
            />
          </FormField>

          {/* Target Folder */}
          <FormField
            label="Vault Folder (Optional)"
            helperText="Group into an existing subject folder, or leave at Subject Root."
          >
            <Select
              value={uploadForm.folderId}
              onChange={e => setUploadForm(prev => ({ ...prev, folderId: e.target.value }))}
              disabled={isUploading}
            >
              <option value="">Subject Root (No Folder)</option>
              {folders.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </Select>
          </FormField>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: Version History */}
      {/* ========================================================================= */}
      <Modal
        isOpen={Boolean(historyModalDoc)}
        onClose={() => setHistoryModalDoc(null)}
        title={`Version History: ${historyModalDoc?.title || 'Document'}`}
        description="Complete immutable revision audit for this curricular asset. Previous versions are retained."
        size="lg"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setHistoryModalDoc(null)}>
              Close
            </Button>
          </div>
        }
      >
        {loadingVersions ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--ev-text-secondary)' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
              <span className="ev-btn-spinner" aria-hidden="true" style={{ width: '16px', height: '16px' }} />
              <span>Loading version history...</span>
            </div>
          </div>
        ) : docVersions.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--ev-text-secondary)', fontSize: '13px' }}>
            No versions recorded for this document.
          </div>
        ) : (
          <div className="ev-table-wrapper" style={{ maxHeight: '380px', overflowY: 'auto' }}>
            <table className="ev-table">
              <thead>
                <tr>
                  <th className="ev-th">Version</th>
                  <th className="ev-th">Type / Size</th>
                  <th className="ev-th">Uploaded By</th>
                  <th className="ev-th">Date Uploaded</th>
                  <th className="ev-th" style={{ textAlign: 'right' }}>Download</th>
                </tr>
              </thead>
              <tbody>
                {docVersions.map(v => {
                  const isActive = historyModalDoc?.active_version_id === v.id;
                  return (
                    <tr key={v.id} className="ev-tr">
                      <td className="ev-td">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '13px' }}>
                            v{v.version_number}
                          </span>
                          {isActive && (
                            <Badge status="active">Active Version</Badge>
                          )}
                        </div>
                      </td>
                      <td className="ev-td" style={{ fontSize: '12px' }}>
                        <div>{v.file_type}</div>
                        <div style={{ color: 'var(--ev-text-secondary)' }}>{formatFileSize(v.file_size)}</div>
                      </td>
                      <td className="ev-td" style={{ fontSize: '12px' }}>
                        {v.uploader?.full_name || 'Assigned Instructor'}
                      </td>
                      <td className="ev-td" style={{ fontSize: '12px', color: 'var(--ev-text-secondary)' }}>
                        {new Date(v.created_at).toLocaleString()}
                      </td>
                      <td className="ev-td" style={{ textAlign: 'right' }}>
                        <Button
                          variant="secondary"
                          size="compact"
                          icon={Download}
                          onClick={() => handleDownloadStoragePath(v.storage_path)}
                        >
                          Download
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: Replace Version */}
      {/* ========================================================================= */}
      <Modal
        isOpen={Boolean(replaceModalDoc)}
        onClose={() => !isReplacing && setReplaceModalDoc(null)}
        title={`Upload New Version: ${replaceModalDoc?.title || ''}`}
        description="Upload a revised file to increment the version number. Previous versions remain preserved in history."
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <Button
              variant="tertiary"
              onClick={() => setReplaceModalDoc(null)}
              disabled={isReplacing}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              icon={FileUp}
              loading={isReplacing}
              disabled={!replaceFile || !!replaceFileError}
              onClick={handleReplaceSubmit}
            >
              {isReplacing ? 'Uploading Version...' : 'Confirm Version Update'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleReplaceSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <FormField
            label="Revised File"
            required
            helperText="Select the updated document file. Maximum 50 MB."
            error={replaceFileError}
          >
            <input
              ref={replaceFileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
              onChange={handleReplaceFileChange}
              disabled={isReplacing}
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1px dashed var(--ev-border)',
                borderRadius: '6px',
                background: 'var(--ev-surface)',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            />
            {replaceFile && !replaceFileError && (
              <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--ev-text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={14} style={{ color: '#059669' }} />
                <span>Selected: <strong>{replaceFile.name}</strong> ({formatFileSize(replaceFile.size)})</span>
              </div>
            )}
          </FormField>

          <FormField
            label="Revision Notes (Optional)"
            helperText="Record what changed in this revision for academic tracking."
          >
            <textarea
              className="ev-input"
              rows={2}
              value={replaceChangeNotes}
              onChange={e => setReplaceChangeNotes(e.target.value)}
              placeholder="e.g., Added Unit 4 practice problems, updated grading rubric..."
              maxLength={500}
              disabled={isReplacing}
              style={{ resize: 'vertical', width: '100%' }}
            />
          </FormField>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 4: Lifecycle Confirmation (Publish / Draft / Archive) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={Boolean(lifecycleModal)}
        onClose={() => !isUpdatingStatus && setLifecycleModal(null)}
        title={
          lifecycleModal?.targetStatus === 'PUBLISHED' 
            ? 'Publish Curricular Material' 
            : lifecycleModal?.targetStatus === 'ARCHIVED'
              ? 'Archive Curricular Material'
              : 'Return Document to Draft'
        }
        description={`Confirm lifecycle change for "${lifecycleModal?.doc?.title}".`}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <Button
              variant="tertiary"
              onClick={() => setLifecycleModal(null)}
              disabled={isUpdatingStatus}
            >
              Cancel
            </Button>
            <Button
              variant={
                lifecycleModal?.targetStatus === 'PUBLISHED' 
                  ? 'primary' 
                  : lifecycleModal?.targetStatus === 'ARCHIVED'
                    ? 'danger'
                    : 'secondary'
              }
              loading={isUpdatingStatus}
              onClick={handleConfirmLifecycle}
            >
              {lifecycleModal?.targetStatus === 'PUBLISHED' && 'Publish Document'}
              {lifecycleModal?.targetStatus === 'DRAFT' && 'Return to Draft'}
              {lifecycleModal?.targetStatus === 'ARCHIVED' && 'Archive Document'}
            </Button>
          </div>
        }
      >
        <div style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--ev-text)' }}>
          {lifecycleModal?.targetStatus === 'PUBLISHED' && (
            <div>
              <p style={{ margin: '0 0 10px 0' }}>
                Publishing will unlock this curricular material. <strong>All students currently enrolled in this subject will gain immediate access</strong> to view and download the active version.
              </p>
              <div style={{ padding: '10px 14px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '6px', color: '#065F46', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={16} />
                <span>Enrolled students can immediately access the active file.</span>
              </div>
            </div>
          )}

          {lifecycleModal?.targetStatus === 'DRAFT' && (
            <div>
              <p style={{ margin: '0 0 10px 0' }}>
                Returning this document to Draft will lock the material. <strong>Enrolled students will immediately lose access</strong> to this document until you choose to re-publish it.
              </p>
              <div style={{ padding: '10px 14px', background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: '6px', color: '#92400E', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={16} />
                <span>Access restricted to instructors and administrators only.</span>
              </div>
            </div>
          )}

          {lifecycleModal?.targetStatus === 'ARCHIVED' && (
            <div>
              <p style={{ margin: '0 0 10px 0' }}>
                Archiving retains this material for institutional academic history and syllabus records, but removes it from active student views.
              </p>
              <div style={{ padding: '10px 14px', background: 'var(--ev-surface-elevated)', border: '1px solid var(--ev-border)', borderRadius: '6px', color: 'var(--ev-text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Archive size={16} />
                <span>No files will be deleted. Full historical records remain intact.</span>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 5: Create Vault Folder */}
      {/* ========================================================================= */}
      <Modal
        isOpen={createFolderModalOpen}
        onClose={() => !isCreatingFolder && setCreateFolderModalOpen(false)}
        title="Create Vault Folder"
        description="Organize subject materials into module or unit topic folders."
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <Button
              variant="tertiary"
              onClick={() => setCreateFolderModalOpen(false)}
              disabled={isCreatingFolder}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              icon={FolderPlus}
              loading={isCreatingFolder}
              disabled={!newFolderName.trim()}
              onClick={handleCreateFolder}
            >
              {isCreatingFolder ? 'Creating Folder...' : 'Create Folder'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateFolder} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <FormField
            label="Folder Name"
            required
            helperText="Name of the curriculum unit, topic, or module (max 100 characters)."
          >
            <Input
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              placeholder="e.g., Unit 1: Geometric Optics"
              maxLength={100}
              disabled={isCreatingFolder}
              autoFocus
            />
          </FormField>

          {folders.length > 0 && (
            <FormField
              label="Parent Folder (Optional)"
              helperText="Optionally nest inside an existing folder in this subject."
            >
              <Select
                value={newFolderParentId}
                onChange={e => setNewFolderParentId(e.target.value)}
                disabled={isCreatingFolder}
              >
                <option value="">Subject Root (Top Level)</option>
                {folders.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </Select>
            </FormField>
          )}
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 6: Rename Folder */}
      {/* ========================================================================= */}
      <Modal
        isOpen={Boolean(renameFolderModal)}
        onClose={() => !isRenamingFolder && setRenameFolderModal(null)}
        title="Rename Folder"
        description={`Update the title for folder "${renameFolderModal?.name}".`}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <Button
              variant="tertiary"
              onClick={() => setRenameFolderModal(null)}
              disabled={isRenamingFolder}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={isRenamingFolder}
              disabled={!renameFolderName.trim()}
              onClick={handleRenameFolder}
            >
              Save Name
            </Button>
          </div>
        }
      >
        <form onSubmit={handleRenameFolder}>
          <FormField label="New Folder Name" required>
            <Input
              value={renameFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              placeholder="e.g., Unit 1: Wave Optics"
              maxLength={100}
              disabled={isRenamingFolder}
              autoFocus
            />
          </FormField>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 7: Delete Folder Confirmation */}
      {/* ========================================================================= */}
      <Modal
        isOpen={Boolean(deleteFolderModal)}
        onClose={() => !isDeletingFolder && setDeleteFolderModal(null)}
        title={`Delete Folder "${deleteFolderModal?.name}"`}
        description="Confirm folder removal."
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <Button
              variant="tertiary"
              onClick={() => setDeleteFolderModal(null)}
              disabled={isDeletingFolder}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={isDeletingFolder}
              onClick={handleDeleteFolder}
            >
              Delete Folder
            </Button>
          </div>
        }
      >
        <div style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--ev-text)' }}>
          <p style={{ margin: '0 0 10px 0' }}>
            Are you sure you want to delete folder <strong>"{deleteFolderModal?.name}"</strong>?
          </p>
          <div style={{ padding: '10px 14px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '6px', color: '#065F46', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={16} />
            <span>All documents inside this folder will be safely preserved and moved to the Subject Root level.</span>
          </div>
        </div>
      </Modal>
    </div>
  );
}
