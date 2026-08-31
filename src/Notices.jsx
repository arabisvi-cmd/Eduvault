import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { Bell, Trash2, Edit2, Plus, MessageSquare } from 'lucide-react';

export default function Notices({ userProfile, subjectId = null }) {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  
  useEffect(() => {
    fetchNotices();
  }, [subjectId, userProfile]);

  async function fetchNotices() {
    setLoading(true);
    let query = supabase.from('notices').select('*, author:users(full_name)').order('created_at', { ascending: false });
    
    if (subjectId) {
      query = query.eq('subject_id', subjectId);
    }
    
    const { data, error } = await query;
    if (!error && data) {
      setNotices(data);
    }
    setLoading(false);
  }

  const handleCreateNotice = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    try {
      const { data, error } = await supabase.from('notices').insert([{
        title: title.trim(),
        content: content.trim(),
        subject_id: subjectId,
        institution_id: userProfile.institution_id,
        created_by: userProfile.id
      }]).select('*, author:users(full_name)').single();

      if (!error && data) {
        setNotices([data, ...notices]);
        setIsCreating(false);
        setTitle('');
        setContent('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this notice?")) return;
    try {
      const { error } = await supabase.from('notices').delete().eq('id', id);
      if (!error) {
        setNotices(notices.filter(n => n.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const canCreate = (userProfile.role === 'ADMIN' && !subjectId) || (userProfile.role === 'TEACHER' && subjectId);

  return (
    <div style={{ backgroundColor: 'var(--ev-surface)', border: '1px solid var(--ev-border)', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, color: 'var(--ev-primary)', fontSize: '18px', fontWeight: 600 }}>
          <Bell size={20} style={{ color: 'var(--ev-gold)' }} />
          {subjectId ? 'Subject Notices' : 'Institution Notices'}
        </h3>
        
        {canCreate && !isCreating && (
          <button 
            onClick={() => setIsCreating(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: 'var(--ev-primary)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 500, transition: 'background 0.2s' }}
            onMouseOver={e=>e.currentTarget.style.backgroundColor='var(--ev-primary-dark)'}
            onMouseOut={e=>e.currentTarget.style.backgroundColor='var(--ev-primary)'}
          >
            <Plus size={16} /> New Notice
          </button>
        )}
      </div>

      {isCreating && (
        <form onSubmit={handleCreateNotice} style={{ backgroundColor: 'var(--ev-background)', padding: '20px', borderRadius: '8px', marginBottom: '24px', border: '1px solid var(--ev-border)' }}>
          <input 
            type="text" 
            placeholder="Notice Title" 
            value={title} 
            onChange={e => setTitle(e.target.value)}
            style={{ width: '100%', padding: '12px 16px', marginBottom: '12px', borderRadius: '6px', border: '1px solid var(--ev-border)', boxSizing: 'border-box', color: 'var(--ev-text)' }}
            required
            maxLength={100}
          />
          <textarea 
            placeholder="Notice Content..." 
            value={content} 
            onChange={e => setContent(e.target.value)}
            style={{ width: '100%', padding: '12px 16px', marginBottom: '16px', borderRadius: '6px', border: '1px solid var(--ev-border)', minHeight: '100px', boxSizing: 'border-box', fontFamily: 'inherit', color: 'var(--ev-text)' }}
            required
            maxLength={1000}
          />
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setIsCreating(false)} style={{ padding: '8px 16px', backgroundColor: 'transparent', border: 'none', color: 'var(--ev-text-secondary)', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
            <button type="submit" style={{ padding: '8px 16px', backgroundColor: 'var(--ev-primary)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>Post Notice</button>
          </div>
        </form>
      )}

      {loading ? (
        <div style={{ color: 'var(--ev-text-secondary)', padding: '24px 0' }}>Loading notices...</div>
      ) : notices.length === 0 ? (
        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--ev-text-secondary)', backgroundColor: 'var(--ev-background)', border: '1px dashed var(--ev-border)', borderRadius: '8px' }}>
          <MessageSquare size={24} style={{ opacity: 0.5, marginBottom: '12px' }} />
          <div>No notices found.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {notices.map(notice => (
            <div key={notice.id} style={{ padding: '20px', backgroundColor: 'var(--ev-background)', borderRadius: '8px', borderLeft: '4px solid var(--ev-gold)', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--ev-text)', fontSize: '16px', paddingRight: '32px', fontWeight: 600 }}>{notice.title}</h4>
                {((userProfile.role === 'ADMIN' && !notice.subject_id) || (userProfile.role === 'TEACHER' && notice.subject_id)) && (
                  <button 
                    onClick={() => handleDelete(notice.id)}
                    style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: 'var(--ev-error)', cursor: 'pointer', padding: '4px' }}
                    title="Delete Notice"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <p style={{ margin: '0 0 12px 0', color: 'var(--ev-text)', fontSize: '14px', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{notice.content}</p>
              <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--ev-text-secondary)' }}>
                <span>By: {notice.author?.full_name || 'System'}</span>
                <span>•</span>
                <span>{new Date(notice.created_at).toLocaleString()}</span>
                {!subjectId && notice.subject_id && (
                  <>
                    <span>•</span>
                    <span style={{ backgroundColor: 'var(--ev-divider)', padding: '2px 8px', borderRadius: '4px' }}>Subject Notice</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
