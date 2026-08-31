import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase';
import { Search, FileText, BookOpen, Bell, X, ArrowRight, Loader } from 'lucide-react';

export default function GlobalSearch({ userProfile, onNavigate }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ documents: [], subjects: [], notices: [] });
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query.trim().length >= 2) {
        performSearch(query.trim());
      } else {
        setResults({ documents: [], subjects: [], notices: [] });
        setIsOpen(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const performSearch = async (searchQuery) => {
    setLoading(true);
    setIsOpen(true);
    const likeQuery = `%${searchQuery}%`;

    try {
      // Run queries in parallel. RLS enforces security.
      const [docRes, subRes, notRes] = await Promise.all([
        supabase.from('documents')
          .select('id, title, description, subject_id')
          .or(`title.ilike.${likeQuery},description.ilike.${likeQuery}`)
          .limit(10),
          
        supabase.from('subjects')
          .select('id, name, code')
          .or(`name.ilike.${likeQuery},code.ilike.${likeQuery}`)
          .limit(5),
          
        supabase.from('notices')
          .select('id, title, content, subject_id, institution_id')
          .or(`title.ilike.${likeQuery},content.ilike.${likeQuery}`)
          .limit(5)
      ]);

      setResults({
        documents: docRes.data || [],
        subjects: subRes.data || [],
        notices: notRes.data || []
      });
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleResultClick = (type, item) => {
    setIsOpen(false);
    setQuery('');
    onNavigate(type, item);
  };

  const hasResults = results.documents.length > 0 || results.subjects.length > 0 || results.notices.length > 0;

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%', maxWidth: '600px' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <Search size={18} style={{ position: 'absolute', left: '12px', color: 'var(--ev-text-secondary)' }} />
        <input 
          type="text" 
          placeholder="Search EduVault..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (query.trim().length >= 2) setIsOpen(true); }}
          style={{ 
            width: '100%', 
            padding: '12px 35px 12px 40px', 
            borderRadius: '24px', 
            border: '1px solid var(--ev-border)', 
            backgroundColor: 'var(--ev-surface-elevated)', 
            color: 'var(--ev-text)',
            fontSize: '1rem',
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />
        {query && (
          <button 
            onClick={() => { setQuery(''); setIsOpen(false); }}
            style={{ position: 'absolute', right: '12px', background: 'transparent', border: 'none', color: 'var(--ev-text-secondary)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {isOpen && (
        <div style={{ 
          position: 'absolute', 
          top: '100%', 
          left: 0, 
          right: 0, 
          marginTop: '8px', 
          backgroundColor: 'var(--ev-surface-elevated)', 
          borderRadius: '8px', 
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', 
          zIndex: 1000,
          maxHeight: '400px',
          overflowY: 'auto',
          border: '1px solid var(--ev-border)'
        }}>
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--ev-text-secondary)' }}>
              <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : !hasResults ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--ev-text-secondary)' }}>
              No results found.
            </div>
          ) : (
            <div style={{ padding: '10px 0' }}>
              
              {results.subjects.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ padding: '4px 16px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--ev-text-secondary)', textTransform: 'uppercase' }}>Subjects</div>
                  {results.subjects.map(sub => (
                    <div 
                      key={sub.id}
                      onClick={() => handleResultClick('SUBJECT', sub)}
                      style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--ev-primary-light)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <BookOpen size={16} style={{ color: 'var(--ev-primary)' }} />
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ color: 'var(--ev-text)', fontSize: '0.9rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{sub.name}</div>
                        {sub.code && <div style={{ color: 'var(--ev-text-secondary)', fontSize: '0.8rem' }}>{sub.code}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {results.documents.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ padding: '4px 16px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--ev-text-secondary)', textTransform: 'uppercase' }}>Documents</div>
                  {results.documents.map(doc => (
                    <div 
                      key={doc.id}
                      onClick={() => handleResultClick('DOCUMENT', doc)}
                      style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--ev-primary-light)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <FileText size={16} style={{ color: 'var(--ev-teal)' }} />
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ color: 'var(--ev-text)', fontSize: '0.9rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{doc.title}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {results.notices.length > 0 && (
                <div style={{ marginBottom: '0' }}>
                  <div style={{ padding: '4px 16px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--ev-text-secondary)', textTransform: 'uppercase' }}>Notices</div>
                  {results.notices.map(not => (
                    <div 
                      key={not.id}
                      onClick={() => handleResultClick('NOTICE', not)}
                      style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--ev-primary-light)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <Bell size={16} style={{ color: 'var(--ev-warning, #f59e0b)' }} />
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ color: 'var(--ev-text)', fontSize: '0.9rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{not.title}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}
        </div>
      )}
    </div>
  );
}
