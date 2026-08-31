import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase';
import { ArrowLeft, UploadCloud, FileText, Download, CheckCircle, Clock, Trash2, Globe, Archive } from 'lucide-react';
import Notices from './Notices';

export default function SubjectVault({ subject, userProfile, onBack }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const fileInputRef = useRef(null);
  const replaceInputRef = useRef(null);
  const [replacingDocId, setReplacingDocId] = useState(null);

  useEffect(() => {
    fetchDocuments();
  }, [subject, searchQuery]);

  async function fetchDocuments() {
    setLoading(true);
    let query = supabase.from('documents')
      .select('*, active_version:document_versions(*)')
      .eq('subject_id', subject.id)
      .order('created_at', { ascending: false });

    // Students only see PUBLISHED
    if (userProfile.role === 'STUDENT') {
      query = query.eq('status', 'PUBLISHED');
    }

    if (searchQuery.trim()) {
      query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
    }

    const { data, error } = await query;
    if (error) console.error("Error fetching docs:", error);
    else setDocuments(data || []);
    setLoading(false);
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (e.g. 50MB)
    if (file.size > 50 * 1024 * 1024) {
      alert("File exceeds 50MB limit.");
      return;
    }

    setUploading(true);
    try {
      // 1. Create Document metadata
      const { data: docData, error: docError } = await supabase.from('documents').insert({
        subject_id: subject.id,
        title: file.name,
        status: 'DRAFT',
        created_by: userProfile.id
      }).select().single();

      if (docError) throw docError;

      // 2. Create Document Version metadata
      const ext = file.name.split('.').pop();
      const tempPath = `temp`; // will update after we get ID
      
      const { data: verData, error: verError } = await supabase.from('document_versions').insert({
        document_id: docData.id,
        version_number: 1,
        storage_path: tempPath,
        file_type: file.type || 'application/octet-stream',
        file_size: file.size,
        uploaded_by: userProfile.id
      }).select().single();

      if (verError) throw verError;

      // 3. Upload to Storage
      const storagePath = `${userProfile.institution_id}/${subject.id}/${docData.id}/${verData.id}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('eduvault-documents')
        .upload(storagePath, file);

      if (uploadError) {
        // Rollback
        await supabase.from('documents').delete().eq('id', docData.id);
        throw uploadError;
      }

      // 4. Update paths & active version
      await supabase.from('document_versions').update({ storage_path: storagePath }).eq('id', verData.id);
      await supabase.from('documents').update({ active_version_id: verData.id }).eq('id', docData.id);

      fetchDocuments();
    } catch (err) {
      console.error(err);
      alert("Upload failed: " + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUpdateStatus = async (docId, status) => {
    if (status === 'PUBLISHED') {
      if (!window.confirm("Publish this material for enrolled students?")) return;
    }
    const { error } = await supabase.from('documents').update({ status }).eq('id', docId);
    if (error) alert(error.message);
    else fetchDocuments();
  };

  const handleDelete = async (docId) => {
    if (!window.confirm("Delete this document forever? This will remove all files and cannot be undone.")) return;
    
    const { data: versions } = await supabase.from('document_versions').select('storage_path').eq('document_id', docId);
    const { error } = await supabase.from('documents').delete().eq('id', docId);
    
    if (error) {
      alert(error.message);
      return;
    }

    if (versions && versions.length > 0) {
      const paths = versions.map(v => v.storage_path).filter(Boolean);
      if (paths.length > 0) {
        await supabase.storage.from('eduvault-documents').remove(paths);
      }
    }
    fetchDocuments();
  };

  const handleEdit = async (doc) => {
    const newTitle = window.prompt("Enter new title:", doc.title);
    if (!newTitle) return;
    const newDesc = window.prompt("Enter new description (optional):", doc.description || "");
    if (newDesc === null) return; // cancelled
    
    const { error } = await supabase.from('documents').update({ title: newTitle, description: newDesc }).eq('id', doc.id);
    if (error) alert(error.message);
    else fetchDocuments();
  };

  const handleReplaceFile = async (e) => {
    const file = e.target.files?.[0];
    const docId = replacingDocId;
    if (!file || !docId) return;

    if (file.size > 50 * 1024 * 1024) {
      alert("File exceeds 50MB limit.");
      return;
    }

    setUploading(true);
    try {
      const { data: latestVer } = await supabase.from('document_versions')
        .select('version_number')
        .eq('document_id', docId)
        .order('version_number', { ascending: false })
        .limit(1)
        .single();
        
      const nextVersion = (latestVer?.version_number || 0) + 1;
      const ext = file.name.split('.').pop();
      
      const { data: verData, error: verError } = await supabase.from('document_versions').insert({
        document_id: docId,
        version_number: nextVersion,
        storage_path: 'temp',
        file_type: file.type || 'application/octet-stream',
        file_size: file.size,
        uploaded_by: userProfile.id
      }).select().single();

      if (verError) throw verError;

      const storagePath = `${userProfile.institution_id}/${subject.id}/${docId}/${verData.id}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('eduvault-documents').upload(storagePath, file);

      if (uploadError) {
        await supabase.from('document_versions').delete().eq('id', verData.id);
        throw uploadError;
      }

      await supabase.from('document_versions').update({ storage_path: storagePath }).eq('id', verData.id);
      await supabase.from('documents').update({ active_version_id: verData.id }).eq('id', docId);

      fetchDocuments();
    } catch (err) {
      console.error(err);
      alert("Replace failed: " + err.message);
    } finally {
      setUploading(false);
      setReplacingDocId(null);
      if (replaceInputRef.current) replaceInputRef.current.value = '';
    }
  };

  const handleDownload = async (doc) => {
    if (!doc.active_version || !doc.active_version.length) {
      // In supabase relation fetch, active_version might be an array of 1 or an object depending on setup.
      // Since it's a one-to-many relationship in PostgREST but we know it's 1 via the active_version_id FK.
      // Wait, PostgREST returns an array for reverse relationships, but for a direct FK it's an object.
      // The select is `active_version:document_versions(*)`. Since `active_version_id` points TO `document_versions`, it's an object.
    }
    const version = Array.isArray(doc.active_version) ? doc.active_version[0] : doc.active_version;
    if (!version || !version.storage_path) {
      alert("No file available."); return;
    }

    const { data, error } = await supabase.storage
      .from('eduvault-documents')
      .createSignedUrl(version.storage_path, 60);

    if (error) {
      alert("Failed to get download URL: " + error.message);
    } else {
      window.open(data.signedUrl, '_blank');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--ev-surface)', color: 'var(--ev-text)' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--ev-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', borderRadius: '50%', color: 'var(--ev-text-secondary)', transition: 'background 0.2s' }} onMouseOver={e=>e.currentTarget.style.backgroundColor='var(--ev-background)'} onMouseOut={e=>e.currentTarget.style.backgroundColor='transparent'}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>{subject.name}</h2>
            {subject.code && <div style={{ fontSize: '13px', color: 'var(--ev-text-secondary)', marginTop: '4px' }}>{subject.code}</div>}
          </div>
        </div>
        
        {userProfile.role === 'TEACHER' && (
          <div>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} accept=".pdf,.doc,.docx,.ppt,.pptx,.txt" />
            <input type="file" ref={replaceInputRef} onChange={handleReplaceFile} style={{ display: 'none' }} accept=".pdf,.doc,.docx,.ppt,.pptx,.txt" />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'var(--ev-primary)', color: '#fff', border: 'none', borderRadius: '6px', cursor: uploading ? 'not-allowed' : 'pointer', fontWeight: 500, transition: 'background 0.2s' }}
              onMouseOver={e=>e.currentTarget.style.backgroundColor='var(--ev-primary-dark)'}
              onMouseOut={e=>e.currentTarget.style.backgroundColor='var(--ev-primary)'}
            >
              <UploadCloud size={18} />
              {uploading ? 'Processing...' : 'Upload Material'}
            </button>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div style={{ padding: '16px 24px', backgroundColor: 'var(--ev-background)', borderBottom: '1px solid var(--ev-border)', display: 'flex', gap: '16px', alignItems: 'center' }}>
        <input 
          type="text" 
          placeholder="Search materials by title or description..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: 1, maxWidth: '400px', padding: '10px 16px', borderRadius: '6px', border: '1px solid var(--ev-border)', outline: 'none', color: 'var(--ev-text)' }}
        />
        {userProfile.role === 'TEACHER' && (
          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
            style={{ padding: '10px 16px', borderRadius: '6px', border: '1px solid var(--ev-border)', outline: 'none', backgroundColor: 'var(--ev-surface)', color: 'var(--ev-text)' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Locked (Drafts)</option>
            <option value="PUBLISHED">Unlocked (Published)</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        )}
      </div>

      <div style={{ padding: '24px 24px 0 24px', backgroundColor: 'var(--ev-background)' }}>
        <Notices userProfile={userProfile} subjectId={subject.id} />
      </div>

      {/* Document List */}
      <div style={{ flex: 1, padding: '24px', overflowY: 'auto', backgroundColor: 'var(--ev-background)' }}>
        {loading ? (
          <div style={{ color: 'var(--ev-text-secondary)' }}>Loading vault...</div>
        ) : documents.filter(d => statusFilter === 'ALL' || d.status === statusFilter).length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--ev-text-secondary)', marginTop: '40px' }}>
            {searchQuery || statusFilter !== 'ALL' ? "No materials found." : (userProfile.role === 'TEACHER' ? "No documents uploaded yet. Click Upload Material to add materials." : "No unlocked materials yet.")}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {documents.filter(d => statusFilter === 'ALL' || d.status === statusFilter).map(doc => {
              const version = Array.isArray(doc.active_version) ? doc.active_version[0] : doc.active_version;
              return (
                <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--ev-surface)', padding: '16px 20px', borderRadius: '8px', border: '1px solid var(--ev-border)', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                    <div style={{ color: 'var(--ev-primary)' }}><FileText size={24} /></div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ fontWeight: 600, fontSize: '16px', color: 'var(--ev-text)' }}>{doc.title}</div>
                        {version && <div style={{ fontSize: '12px', color: 'var(--ev-text-secondary)', backgroundColor: 'var(--ev-background)', border: '1px solid var(--ev-divider)', padding: '2px 6px', borderRadius: '4px' }}>v{version.version_number}</div>}
                      </div>
                      {doc.description && <div style={{ fontSize: '14px', color: 'var(--ev-text-secondary)', marginTop: '4px', marginBottom: '8px' }}>{doc.description}</div>}
                      <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--ev-text-secondary)', marginTop: '6px', alignItems: 'center' }}>
                        {version && <span>{(version.file_size / 1024 / 1024).toFixed(2)} MB</span>}
                        <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                        
                        {/* Status Badge */}
                        {doc.status === 'DRAFT' && <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--ev-locked)', backgroundColor: '#F8EDEA', padding: '2px 8px', borderRadius: '4px', fontWeight: 500 }}><Clock size={14}/> Locked (Students cannot see this)</span>}
                        {doc.status === 'PUBLISHED' && <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--ev-teal)', backgroundColor: 'var(--ev-teal-light)', padding: '2px 8px', borderRadius: '4px', fontWeight: 500 }}><CheckCircle size={14}/> Unlocked</span>}
                        {doc.status === 'ARCHIVED' && <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--ev-text-secondary)', backgroundColor: 'var(--ev-background)', padding: '2px 8px', borderRadius: '4px', fontWeight: 500 }}><Archive size={14}/> Archived</span>}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button onClick={() => handleDownload(doc)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--ev-border)', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--ev-primary)', fontWeight: 500, transition: 'background 0.2s' }} onMouseOver={e=>e.currentTarget.style.backgroundColor='var(--ev-background)'} onMouseOut={e=>e.currentTarget.style.backgroundColor='transparent'}>
                      <Download size={16} /> Download
                    </button>
                    
                    {userProfile.role === 'TEACHER' && (
                      <>
                        <button onClick={() => handleEdit(doc)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--ev-border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--ev-text-secondary)', fontWeight: 500 }}>Edit</button>
                        <button onClick={() => { setReplacingDocId(doc.id); replaceInputRef.current?.click(); }} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--ev-border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--ev-text-secondary)', fontWeight: 500 }}>Replace File</button>

                        {doc.status === 'DRAFT' && (
                          <button onClick={() => handleUpdateStatus(doc.id, 'PUBLISHED')} style={{ padding: '8px 16px', background: 'var(--ev-teal-light)', border: '1px solid var(--ev-teal)', borderRadius: '6px', cursor: 'pointer', color: 'var(--ev-teal)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }} onMouseOver={e=>e.currentTarget.style.backgroundColor='#d3ebe7'} onMouseOut={e=>e.currentTarget.style.backgroundColor='var(--ev-teal-light)'}>
                            <Globe size={16} /> Unlock for Students
                          </button>
                        )}
                        {doc.status === 'PUBLISHED' && (
                          <button onClick={() => handleUpdateStatus(doc.id, 'ARCHIVED')} style={{ padding: '8px 16px', background: 'var(--ev-background)', border: '1px solid var(--ev-border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--ev-text-secondary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Archive size={16} /> Archive
                          </button>
                        )}
                        <button onClick={() => handleDelete(doc.id)} style={{ padding: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ev-error)' }} title="Delete">
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
