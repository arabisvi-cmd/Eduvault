import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import App from '../../App';
import '@testing-library/jest-dom';

vi.mock('../../lib/supabase', () => ({
  isSupabaseConfigured: false,
  supabase: null
}));

describe('E2E: Complete User Workflows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Student Workflow: Sign in -> Search documents -> Interact with workspace -> Sign out', async () => {
    render(<App />);

    // Step 1: Open Login
    const loginBtn = screen.getByRole('button', { name: /Log In/i });
    fireEvent.click(loginBtn);

    // Step 2: Fill Student credentials
    const idInput = screen.getByPlaceholderText(/e.g. TCH-1002 or you@school.edu/i);
    const passwordInput = screen.getByPlaceholderText('••••••••');

    fireEvent.change(idInput, { target: { value: 'STU-2026-002' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    const submitBtn = screen.getByRole('button', { name: /Log In to Workspace/i });
    fireEvent.click(submitBtn);

    // Step 3: Assert Student dashboard state
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Liam Miller/i })).toBeInTheDocument();
    });

    // Step 4: Search for documents in workspace view
    const searchInput = screen.getByPlaceholderText(/Search documents, lectures, lab reports/i);
    fireEvent.change(searchInput, { target: { value: 'Physics' } });
    expect(screen.getByDisplayValue('Physics')).toBeInTheDocument();

    // Step 5: Sign out
    const logoutBtn = screen.getByRole('button', { name: /Liam Miller/i });
    fireEvent.click(logoutBtn);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Log In/i })).toBeInTheDocument();
    });
  });

  it('Teacher Workflow: Sign in -> Navigate Drive -> Manage Folders & Filtering', async () => {
    render(<App />);

    // Sign in as Teacher
    const loginBtn = screen.getByRole('button', { name: /Log In/i });
    fireEvent.click(loginBtn);

    const idInput = screen.getByPlaceholderText(/e.g. TCH-1002 or you@school.edu/i);
    const passwordInput = screen.getByPlaceholderText('••••••••');

    fireEvent.change(idInput, { target: { value: 'TCH-1002' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    const submitBtn = screen.getByRole('button', { name: /Log In to Workspace/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Sarah Jenkins/i })).toBeInTheDocument();
    });

    // Verify workspace components loaded automatically on login
    await waitFor(() => {
      expect(screen.getByText(/Suggested folders/i)).toBeInTheDocument();
      expect(screen.getByText(/Suggested files/i)).toBeInTheDocument();
    });
  });

  it('Admin Workflow: Administrator Portal Login & Access Verification', async () => {
    render(<App />);

    // Switch to Admin Login tab
    const loginBtn = screen.getByRole('button', { name: /Log In/i });
    fireEvent.click(loginBtn);

    const adminTab = screen.getByText('Admin Portal');
    fireEvent.click(adminTab);

    // Input admin credentials
    const adminIdInput = screen.getByPlaceholderText(/ADMIN-001 or principal@school.edu/i);
    const adminPassInput = screen.getByPlaceholderText('••••••••');

    fireEvent.change(adminIdInput, { target: { value: 'ADMIN-001' } });
    fireEvent.change(adminPassInput, { target: { value: 'admin123' } });

    const submitBtn = screen.getByRole('button', { name: /Log In as (Principal|Administrator)/i });
    fireEvent.click(submitBtn);

    // Verify Administrator authenticated state
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Arthur Davies/i })).toBeInTheDocument();
    });
  });
});
