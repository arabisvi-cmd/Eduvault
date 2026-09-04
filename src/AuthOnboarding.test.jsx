import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import App from './App';
import '@testing-library/jest-dom';

const mockResetPasswordForEmail = vi.fn().mockResolvedValue({ data: {}, error: null });
const mockUpdateUser = vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id', email: 'teacher@school.edu' } }, error: null });
const mockSignInWithPassword = vi.fn();
const mockGetSession = vi.fn();
const mockFrom = vi.fn();

vi.mock('./lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: (...args) => mockGetSession(...args),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signInWithPassword: (...args) => mockSignInWithPassword(...args),
      resetPasswordForEmail: (...args) => mockResetPasswordForEmail(...args),
      updateUser: (...args) => mockUpdateUser(...args),
      signOut: vi.fn().mockResolvedValue({ error: null })
    },
    from: (...args) => mockFrom(...args)
  }
}));

describe('EduVault Authentication & Onboarding Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.location.hash = '';
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          order: vi.fn().mockResolvedValue({ data: [], error: null })
        }),
        order: vi.fn().mockResolvedValue({ data: [], error: null })
      })
    });
  });

  it('renders login view with "First time signing in or forgot password?" option', async () => {
    window.location.hash = '#login';
    render(<App />);

    expect(screen.getByRole('heading', { name: /Welcome Back/i })).toBeInTheDocument();
    expect(screen.getByText(/First time signing in or forgot password\?/i)).toBeInTheDocument();
  });

  it('navigates to password setup / reset view when clicking the setup trigger', async () => {
    window.location.hash = '#login';
    render(<App />);

    const setupBtn = screen.getByText(/First time signing in or forgot password\?/i);
    fireEvent.click(setupBtn);

    expect(screen.getByRole('heading', { name: /Password Setup \/ Reset/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('you@school.edu')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send Password Setup Link/i })).toBeInTheDocument();
  });

  it('calls resetPasswordForEmail with safe redirect URL when submitting reset form', async () => {
    window.location.hash = '#reset-password';
    render(<App />);

    const emailInput = screen.getByPlaceholderText('you@school.edu');
    fireEvent.change(emailInput, { target: { value: 'invited.teacher@school.edu' } });

    const submitBtn = screen.getByRole('button', { name: /Send Password Setup Link/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
        'invited.teacher@school.edu',
        expect.objectContaining({ redirectTo: expect.stringContaining('#type=recovery') })
      );
      expect(screen.getByText(/Instructions Dispatched/i)).toBeInTheDocument();
    });
  });

  it('renders Set Account Password view when hash contains type=invite or type=recovery', async () => {
    window.location.hash = '#access_token=mock-token&type=invite';
    render(<App />);

    expect(screen.getByRole('heading', { name: /Set Account Password/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/New Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
  });

  it('validates password matching and establishes password via updateUser', async () => {
    window.location.hash = '#type=invite';
    render(<App />);

    const newPassInput = screen.getByLabelText(/New Password/i);
    const confirmPassInput = screen.getByLabelText(/Confirm Password/i);

    fireEvent.change(newPassInput, { target: { value: 'SecureAcademicPass2026!' } });
    fireEvent.change(confirmPassInput, { target: { value: 'SecureAcademicPass2026!' } });

    const saveBtn = screen.getByRole('button', { name: /Save Password & Enter Workspace/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'SecureAcademicPass2026!' });
    });
  });

  it('shows informative onboarding guidance when signInWithPassword fails with invalid credentials', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login credentials' }
    });

    window.location.hash = '#login';
    render(<App />);

    const emailInput = screen.getByPlaceholderText('you@school.edu');
    const passwordInput = screen.getByPlaceholderText('••••••••');
    fireEvent.change(emailInput, { target: { value: 'new.teacher@school.edu' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });

    const submitBtn = screen.getByRole('button', { name: 'Log In' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/If this is your first time or you were recently invited/i)).toBeInTheDocument();
    });
  });

  it('shows Institutional Profile Unavailable state when authenticated session lacks public.users row', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'unprovisioned-uuid', email: 'orphan@school.edu' }
        }
      }
    });

    // Profile query returns null
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Row not found' } })
        }),
        order: vi.fn().mockResolvedValue({ data: [], error: null })
      })
    });

    window.location.hash = '#workspace';
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Institutional Profile Unavailable/i })).toBeInTheDocument();
      expect(screen.getByText(/orphan@school.edu/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Sign Out/i })).toBeInTheDocument();
    });
  });
});
