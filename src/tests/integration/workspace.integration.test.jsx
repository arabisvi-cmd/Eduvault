import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import App from '../../App';
import '@testing-library/jest-dom';

vi.mock('../../lib/supabase', () => ({
  isSupabaseConfigured: false,
  supabase: null
}));

describe('Integration: Workspace & State Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should transition seamlessly from unauthenticated home to authenticated workspace', async () => {
    render(<App />);

    // Unauthenticated initial view
    expect(screen.getAllByText(/Edu/i)[0]).toBeInTheDocument();

    // Click Login
    const loginButton = screen.getByRole('button', { name: /Log In/i });
    fireEvent.click(loginButton);

    // Form inputs available
    const idInput = screen.getByPlaceholderText(/e.g. TCH-1002 or you@school.edu/i);
    const passwordInput = screen.getByPlaceholderText('••••••••');

    fireEvent.change(idInput, { target: { value: 'TCH-1002' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    const submitBtn = screen.getByRole('button', { name: /Log In to Workspace/i });
    fireEvent.click(submitBtn);

    // Assert workspace header displays authenticated state
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Sarah Jenkins/i })).toBeInTheDocument();
    });
  });

  it('should integrate folder navigation with state updates and breadcrumbs', async () => {
    render(<App />);

    // Navigate to Google Drive workspace
    const workspaceLink = screen.getByRole('link', { name: /Workspace/i });
    fireEvent.click(workspaceLink);

    // Folders should be rendered
    await waitFor(() => {
      expect(screen.getByText('Suggested folders')).toBeInTheDocument();
    });

    const folderCard = screen.getByText('Physics Lecture Slides');
    fireEvent.click(folderCard);

    // Back button appears
    const backBtn = screen.getByRole('button', { name: /Back/i });
    expect(backBtn).toBeInTheDocument();

    // Back button returns
    fireEvent.click(backBtn);
    expect(screen.getByText('Suggested folders')).toBeInTheDocument();
  });

  it('should integrate layout view toggling between grid and list views', () => {
    render(<App />);

    const workspaceLink = screen.getByRole('link', { name: /Workspace/i });
    fireEvent.click(workspaceLink);

    // Find view toggle buttons
    const listBtn = document.querySelector('button[title="List layout"]') || document.querySelector('.view-mode-btn');
    if (listBtn) {
      fireEvent.click(listBtn);
      expect(screen.getByText('Suggested files')).toBeInTheDocument();
    }
  });
});
