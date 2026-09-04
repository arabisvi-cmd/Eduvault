import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import App from './App';
import '@testing-library/jest-dom';

const { mockUser, mockProfile } = vi.hoisted(() => ({
  mockUser: { id: 'test-user-id', email: 'admin@school.edu' },
  mockProfile: { id: 'test-user-id', full_name: 'Dr. Administrator', role: 'ADMIN', institution_id: 'inst-1' }
}));

const mockGetSession = vi.fn();

vi.mock('./lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: (...args) => mockGetSession(...args),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      signUp: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null })
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
          order: vi.fn().mockResolvedValue({ data: [], error: null })
        }),
        order: vi.fn().mockResolvedValue({ data: [], error: null })
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [], error: null })
      })
    })
  }
}));

describe('EduVault App Rendering & Navigation tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.location.hash = '';
    mockGetSession.mockResolvedValue({ data: { session: null } });
  });

  it('should render the app logo and vision description on loading', async () => {
    window.location.hash = '#home';
    render(<App />);
    expect(await screen.findByText(/academic knowledge, organized/i)).toBeInTheDocument();
  });

  it('should display header action buttons in landing page', async () => {
    window.location.hash = '#home';
    render(<App />);
    
    const headerBtn = await screen.findByRole('button', { name: /Log In/i });
    expect(headerBtn).toBeInTheDocument();
  });

  it('should render and accept query input in the workspace search bar', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: mockUser } } });
    window.location.hash = '#workspace';
    render(<App />);

    const searchInput = await screen.findByPlaceholderText('Search EduVault...');
    expect(searchInput).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'Physics' } });
    expect(searchInput.value).toBe('Physics');
  });

  it('should navigate to login page when hash is set to #login', async () => {
    window.location.hash = '#login';
    render(<App />);

    expect(await screen.findByRole('heading', { name: /Welcome Back/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('you@school.edu')).toBeInTheDocument();
    expect(screen.getByText(/First time signing in or forgot password\?/i)).toBeInTheDocument();
  });

  it('should render Workspace Dashboard when authenticated as ADMIN', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: mockUser } } });
    window.location.hash = '#workspace';
    render(<App />);

    const setupBtn = await screen.findByRole('button', { name: /Academic Setup/i });
    expect(setupBtn).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /People/i })).toBeInTheDocument();
  });

  it('should switch between workspace sidebar navigation tabs', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: mockUser } } });
    window.location.hash = '#workspace';
    render(<App />);

    // Click Academic Setup
    const academicSetupBtn = await screen.findByRole('button', { name: /Academic Setup/i });
    fireEvent.click(academicSetupBtn);
    expect(await screen.findByRole('heading', { name: 'Academic Setup' })).toBeInTheDocument();

    // Click People
    const peopleBtn = screen.getByRole('button', { name: /People/i });
    fireEvent.click(peopleBtn);

    expect(await screen.findByText(/People & Academic Assignments/i)).toBeInTheDocument();
  });
});
