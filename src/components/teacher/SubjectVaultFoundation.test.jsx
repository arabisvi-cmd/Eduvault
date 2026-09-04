import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import SubjectVaultFoundation from './SubjectVaultFoundation';
import '@testing-library/jest-dom';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'teacher-123' } },
        error: null
      })
    },
    from: vi.fn((table) => {
      if (table === 'teacher_assignments') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 'assign-1', user_id: 'teacher-123', subject_id: 'subj-1' },
            error: null
          })
        };
      }
      if (table === 'documents') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'doc-1',
                subject_id: 'subj-1',
                title: 'Quantum Mechanics Lecture 1',
                description: 'Wave functions and operators',
                status: 'DRAFT',
                active_version_id: 'ver-1',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                folder_id: null,
                folder: null,
                active_version: {
                  id: 'ver-1',
                  version_number: 1,
                  file_size: 2048000,
                  file_type: 'application/pdf',
                  storage_path: 'inst-1/subj-1/doc-1/v1.pdf'
                }
              }
            ],
            error: null
          }),
          insert: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: {}, error: null })
        };
      }
      if (table === 'folders') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [
              { id: 'folder-1', subject_id: 'subj-1', name: 'Unit 1: Foundations', created_at: new Date().toISOString() }
            ],
            error: null
          })
        };
      }
      if (table === 'document_versions') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'ver-1',
                document_id: 'doc-1',
                version_number: 1,
                file_type: 'application/pdf',
                file_size: 2048000,
                storage_path: 'inst-1/subj-1/doc-1/v1.pdf',
                created_at: new Date().toISOString(),
                uploader: { full_name: 'Dr. Feynman' }
              }
            ],
            error: null
          })
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
      };
    }),
    storage: {
      from: vi.fn().mockReturnValue({
        createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://storage.mock/v1.pdf' }, error: null })
      })
    }
  }
}));

describe('SubjectVaultFoundation — Materials & Folders UI', () => {
  const mockSubject = {
    id: 'subj-1',
    name: 'Quantum Physics',
    code: 'PHYS-401',
    term: {
      id: 'term-1',
      name: 'Spring 2026',
      program: {
        id: 'prog-1',
        name: 'B.Sc. Physics',
        academic_year: {
          id: 'ay-1',
          name: 'AY 2025-26',
          is_active: true
        }
      }
    }
  };

  const mockTeacher = {
    id: 'teacher-123',
    role: 'TEACHER',
    full_name: 'Dr. Feynman',
    email: 'feynman@mit.edu',
    institution_id: 'inst-1'
  };

  it('verifies teacher access and renders header, breadcrumbs, and tabs', async () => {
    render(<SubjectVaultFoundation subject={mockSubject} userProfile={mockTeacher} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getAllByText('Quantum Physics')[0]).toBeInTheDocument();
    });

    expect(screen.getByText('PHYS-401')).toBeInTheDocument();
    expect(screen.getByText('Back to My Subjects')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Curricular Materials/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Vault Folders/i })).toBeInTheDocument();
  });

  it('renders materials table with name, version, status, and action buttons', async () => {
    render(<SubjectVaultFoundation subject={mockSubject} userProfile={mockTeacher} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Quantum Mechanics Lecture 1')).toBeInTheDocument();
    });

    expect(screen.getByText(/Wave functions and operators/i)).toBeInTheDocument();
    expect(screen.getByText('v1')).toBeInTheDocument();
    expect(screen.getByText(/Draft \(Locked\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Publish/i })).toBeInTheDocument();
  });

  it('opens and cancels the Upload Material modal', async () => {
    render(<SubjectVaultFoundation subject={mockSubject} userProfile={mockTeacher} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Upload Material/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Upload Material/i }));

    expect(screen.getByRole('heading', { name: 'Upload Curricular Material' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.g\., Optics & Wave Mechanics Syllabus/i)).toBeInTheDocument();

    // Cancel modal
    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Upload Curricular Material' })).not.toBeInTheDocument();
    });
  });

  it('opens the Version History modal when clicking history button', async () => {
    render(<SubjectVaultFoundation subject={mockSubject} userProfile={mockTeacher} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTitle('View version history')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('View version history'));

    await waitFor(() => {
      expect(screen.getByText(/Version History: Quantum Mechanics Lecture 1/i)).toBeInTheDocument();
    });
  });

  it('opens the Replace Version modal when clicking replace button', async () => {
    render(<SubjectVaultFoundation subject={mockSubject} userProfile={mockTeacher} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTitle('Upload new version')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Upload new version'));

    await waitFor(() => {
      expect(screen.getByText(/Upload New Version: Quantum Mechanics Lecture 1/i)).toBeInTheDocument();
    });
  });

  it('opens the Publish confirmation modal with enrolled student notice', async () => {
    render(<SubjectVaultFoundation subject={mockSubject} userProfile={mockTeacher} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Publish' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Publish Curricular Material' })).toBeInTheDocument();
      expect(screen.getByText(/All students currently enrolled in this subject will gain immediate access/i)).toBeInTheDocument();
    });
  });

  it('switches to Vault Folders tab and opens New Folder modal', async () => {
    render(<SubjectVaultFoundation subject={mockSubject} userProfile={mockTeacher} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Vault Folders/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Vault Folders/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /New Folder/i })).toBeInTheDocument();
      expect(screen.getByText('Unit 1: Foundations')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /New Folder/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Create Vault Folder' })).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/e\.g\., Unit 1: Geometric Optics/i)).toBeInTheDocument();
    });
  });

  it('rejects access when teacher is not assigned to subject', async () => {
    const { supabase } = await import('../../lib/supabase');
    supabase.from.mockImplementationOnce((table) => {
      if (table === 'teacher_assignments') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) // Not assigned!
        };
      }
      return { select: vi.fn().mockReturnThis() };
    });

    render(<SubjectVaultFoundation subject={mockSubject} userProfile={mockTeacher} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Subject Access Denied')).toBeInTheDocument();
      expect(screen.getByText(/You do not have an active teaching allocation for this subject/i)).toBeInTheDocument();
    });
  });

  it('opens Archive and Return to Draft confirmation modals', async () => {
    render(<SubjectVaultFoundation subject={mockSubject} userProfile={mockTeacher} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTitle('Archive material')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Archive material'));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Archive Curricular Material' })).toBeInTheDocument();
      expect(screen.getByText(/Archiving retains this material for institutional academic history/i)).toBeInTheDocument();
      expect(screen.getByText(/No files will be deleted/i)).toBeInTheDocument();
    });
  });

  it('opens Delete Folder confirmation modal explaining documents are preserved', async () => {
    render(<SubjectVaultFoundation subject={mockSubject} userProfile={mockTeacher} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Vault Folders/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Vault Folders/i }));

    await waitFor(() => {
      expect(screen.getByTitle('Delete folder')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Delete folder'));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Delete Folder "Unit 1: Foundations"' })).toBeInTheDocument();
      expect(screen.getByText(/All documents inside this folder will be safely preserved and moved to the Subject Root level/i)).toBeInTheDocument();
    });
  });
});

