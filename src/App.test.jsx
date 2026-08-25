import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import App from './App';
import '@testing-library/jest-dom';

vi.mock('./lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signInWithPassword: vi.fn().mockImplementation(({ email }) => {
        const isTeacher = (email || '').includes('vance');
        const isAdmin = (email || '').includes('principal') || (email || '').includes('admin');
        return Promise.resolve({
          data: {
            user: {
              email: email,
              user_metadata: {
                full_name: isTeacher ? 'Dr. Robert Vance' : isAdmin ? 'Principal Arthur Davies' : 'Alice Chen',
                role: isTeacher ? 'teacher' : isAdmin ? 'admin' : 'student',
                must_change_password: false
              }
            }
          },
          error: null
        });
      }),
      signUp: vi.fn().mockResolvedValue({ data: { user: { email: 'test@school.edu' } }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      updateUser: vi.fn().mockResolvedValue({ data: { user: { email: 'test@school.edu' } }, error: null })
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
        ilike: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
        }),
        or: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
        })
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [], error: null })
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null })
      })
    })
  }
}));

describe('EduVault App Rendering & Navigation tests', () => {
  it('should render the app logo and vision description on loading', () => {
    render(<App />);
    expect(screen.getAllByText(/Edu/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/Secure Workspace for/i)).toBeInTheDocument();
  });

  it('should toggle to login page and display user login by default', () => {
    render(<App />);
    
    // Find the Log In button in the navigation header
    const loginBtn = screen.getByRole('button', { name: /Log In/i });
    expect(loginBtn).toBeInTheDocument();
    
    // Click Log In
    fireEvent.click(loginBtn);
    
    // Login form title should be present
    expect(screen.getByRole('heading', { name: /Welcome to EduVault/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e.g. TCH-1002 or you@school.edu/i)).toBeInTheDocument();
  });

  it('should sign in using Teacher ID and display Teacher role badge', async () => {
    render(<App />);
    
    // Navigate to Login Page
    const loginBtn = screen.getByRole('button', { name: /Log In/i });
    fireEvent.click(loginBtn);
    
    // Enter credentials
    const idInput = screen.getByPlaceholderText(/e.g. TCH-1002 or you@school.edu/i);
    const passwordInput = screen.getByPlaceholderText('••••••••');
    
    fireEvent.change(idInput, { target: { value: 'TCH-1002' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    // Submit form
    const submitBtn = screen.getByRole('button', { name: /Log In to Workspace/i });
    fireEvent.click(submitBtn);
    
    // Should display Teacher role badge and user full name
    await waitFor(() => {
      expect(screen.getByText('Teacher')).toBeInTheDocument();
      expect(screen.getByText(/Prof. Sarah Jenkins \(Logout\)/i)).toBeInTheDocument();
    });
  });

  it('should allow Principal / Admin login and display Principal badge', async () => {
    render(<App />);

    // Click Admin in header
    const adminBtn = screen.getByRole('button', { name: /Admin/i });
    fireEvent.click(adminBtn);

    // Verify Admin Portal view
    expect(screen.getByRole('heading', { name: /Principal Portal/i })).toBeInTheDocument();

    // Submit Admin credentials
    const submitBtn = screen.getByRole('button', { name: /Log In as Principal/i });
    fireEvent.click(submitBtn);

    // Verify Principal badge
    await waitFor(() => {
      expect(screen.getByText('Principal')).toBeInTheDocument();
      expect(screen.getByText(/Principal Arthur Davies \(Logout\)/i)).toBeInTheDocument();
    });
  });

  it('should verify unregistered teacher ID and allow creating password directly', async () => {
    render(<App />);

    // Click Register in header
    const regBtn = screen.getByRole('button', { name: /Register/i });
    fireEvent.click(regBtn);

    // Heading should indicate Register Account
    expect(screen.getByRole('heading', { name: /Register Account/i })).toBeInTheDocument();

    // Type unregistered Teacher ID
    const idInput = screen.getByPlaceholderText(/e.g. TCH-1001/i);
    fireEvent.change(idInput, { target: { value: 'TCH-1001' } });

    // Click Verify button
    const verifyBtn = screen.getByRole('button', { name: /Verify Identification Number/i });
    fireEvent.click(verifyBtn);

    // Verify matching teacher name and department appear
    await waitFor(() => {
      expect(screen.getByText('Dr. Robert Vance')).toBeInTheDocument();
      expect(screen.getByText(/Physics • HOD Physics/i)).toBeInTheDocument();
      expect(screen.getByText(/robert.vance@school.edu/i)).toBeInTheDocument();
    });

    // Password creation inputs appear
    const newPassInput = screen.getByPlaceholderText(/Create a secure password/i);
    const confirmPassInput = screen.getByPlaceholderText(/Confirm your password/i);
    fireEvent.change(newPassInput, { target: { value: 'mysecretpass' } });
    fireEvent.change(confirmPassInput, { target: { value: 'mysecretpass' } });

    // Click Complete Registration button
    const completeBtn = screen.getByRole('button', { name: /Complete Registration & Enter Workspace/i });
    fireEvent.click(completeBtn);

    // User is logged in and in workspace
    await waitFor(() => {
      expect(screen.getByText(/Dr. Robert Vance \(Logout\)/i)).toBeInTheDocument();
    });
  });

  it('should show Account Already Exists alert when registering an ID that already has a password', async () => {
    render(<App />);

    // Click Register in header
    const regBtn = screen.getByRole('button', { name: /Register/i });
    fireEvent.click(regBtn);

    // Type already registered Teacher ID (TCH-1002)
    const idInput = screen.getByPlaceholderText(/e.g. TCH-1001/i);
    fireEvent.change(idInput, { target: { value: 'TCH-1002' } });

    // Click Verify button
    const verifyBtn = screen.getByRole('button', { name: /Verify Identification Number/i });
    fireEvent.click(verifyBtn);

    // Verify Account Already Exists warning card
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Account Already Exists!/i })).toBeInTheDocument();
      expect(screen.getByText(/An active account is already registered for/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Proceed to Log In/i })).toBeInTheDocument();
    });

    // Click Proceed to Log In
    const proceedBtn = screen.getByRole('button', { name: /Proceed to Log In/i });
    fireEvent.click(proceedBtn);

    // Should navigate to login with ID pre-filled
    expect(screen.getByRole('heading', { name: /Welcome to EduVault/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue('TCH-1002')).toBeInTheDocument();
  });

  it('should show error when verifying non-existent identification number', async () => {
    render(<App />);

    // Click Register
    const regBtn = screen.getByRole('button', { name: /Register/i });
    fireEvent.click(regBtn);

    // Type invalid ID
    const idInput = screen.getByPlaceholderText(/e.g. TCH-1001/i);
    fireEvent.change(idInput, { target: { value: 'INVALID-999' } });

    // Click Verify button
    const verifyBtn = screen.getByRole('button', { name: /Verify Identification Number/i });
    fireEvent.click(verifyBtn);

    // Verify error banner
    await waitFor(() => {
      expect(screen.getByText(/No record found for Teacher ID "INVALID-999"/i)).toBeInTheDocument();
    });
  });

  it('should filter documents when typing in the hero search bar', () => {
    render(<App />);

    // Get hero search input
    const searchInput = screen.getByTestId('hero-search-input');
    expect(searchInput).toBeInTheDocument();

    // Type a specific term e.g., 'Optics'
    fireEvent.change(searchInput, { target: { value: 'Optics' } });

    // Verify list updates
    expect(screen.getByText('Optics Formulas & Cheat Sheet')).toBeInTheDocument();
    expect(screen.queryByText('Mid-Term Physics Study Guide')).not.toBeInTheDocument();
  });

  it('should navigate to Google Drive Workspace and display suggested folders & files', () => {
    render(<App />);

    // Click Workspace navigation link
    const workspaceLink = screen.getByRole('link', { name: /Workspace/i });
    fireEvent.click(workspaceLink);

    // Verify Google Drive UI elements
    expect(screen.getByRole('heading', { name: /Welcome to EduVault Drive/i })).toBeInTheDocument();
    expect(screen.getByText('Suggested folders')).toBeInTheDocument();
    expect(screen.getByText('Suggested files')).toBeInTheDocument();
    
    // Check for academic folders
    expect(screen.getByText('Physics Lecture Slides')).toBeInTheDocument();
    expect(screen.getByText('Chemistry Lab Exercises')).toBeInTheDocument();
    expect(screen.getByText('Mathematics Problem Sets')).toBeInTheDocument();
    expect(screen.getByText('Administrative Circulars')).toBeInTheDocument();
    expect(screen.getByText('Term 1 Question Banks')).toBeInTheDocument();

    // Check for academic files
    expect(screen.getAllByText('Mid-Term Physics Study Guide')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Thermodynamics Lab Report Template')[0]).toBeInTheDocument();
    expect(screen.getByText('14.2 GB of 100 GB used')).toBeInTheDocument();
  });

  it('should toggle view mode between grid and list in Drive workspace', () => {
    render(<App />);

    // Navigate to Workspace
    const workspaceLink = screen.getByRole('link', { name: /Workspace/i });
    fireEvent.click(workspaceLink);

    // Find List view button
    const listBtn = screen.getByTitle('List view');
    fireEvent.click(listBtn);

    // Verify table headers appear
    expect(screen.getByRole('columnheader', { name: /Last modified/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /File size/i })).toBeInTheDocument();
  });

  it('should navigate into a folder and go back when clicking the Back button', () => {
    render(<App />);

    // Navigate to Workspace
    const workspaceLink = screen.getByRole('link', { name: /Workspace/i });
    fireEvent.click(workspaceLink);

    // Click on a folder
    const folderCard = screen.getByText('Physics Lecture Slides');
    fireEvent.click(folderCard);

    // Verify we are inside the folder and Back button is shown
    const backBtn = screen.getByRole('button', { name: /Back/i });
    expect(backBtn).toBeInTheDocument();

    // Click the Back button
    fireEvent.click(backBtn);

    // Verify we are back on root and suggested folders are visible
    expect(screen.getByText('Suggested folders')).toBeInTheDocument();
  });

  it('should show inline folder card in Suggested folders when clicking New folder', () => {
    render(<App />);

    // Navigate to Workspace
    const workspaceLink = screen.getByRole('link', { name: /Workspace/i });
    fireEvent.click(workspaceLink);

    // Open New dropdown
    const newBtn = screen.getByRole('button', { name: /New/i });
    fireEvent.click(newBtn);

    // Click New folder
    const newFolderDropdownItem = screen.getByText('New folder');
    fireEvent.click(newFolderDropdownItem);

    // Verify inline input is displayed inside the suggested folders area
    const inlineInput = screen.getByPlaceholderText('Folder name');
    expect(inlineInput).toBeInTheDocument();

    // Type a new name and submit
    fireEvent.change(inlineInput, { target: { value: 'Biology Field Work' } });
    const checkBtn = screen.getByTitle(/Create folder/i);
    fireEvent.click(checkBtn);

    // Verify new folder appears in the folders list
    expect(screen.getByText('Biology Field Work')).toBeInTheDocument();
  });

  it('should display file action options matching reference image when clicking 3 dots on a file card', () => {
    render(<App />);

    // Navigate to Workspace
    const workspaceLink = screen.getByRole('link', { name: /Workspace/i });
    fireEvent.click(workspaceLink);

    // Click the 3-dots button on the first file card
    const moreBtns = screen.getAllByTitle('More actions');
    expect(moreBtns.length).toBeGreaterThan(0);
    fireEvent.click(moreBtns[0]);

    // Verify remaining action menu items
    expect(screen.getByText('Open with')).toBeInTheDocument();
    expect(screen.getByText('Download')).toBeInTheDocument();
    expect(screen.getByText('Rename')).toBeInTheDocument();
    expect(screen.getByText('Make a copy')).toBeInTheDocument();
    expect(screen.getByText('Share')).toBeInTheDocument();
    expect(screen.getByText('Organize')).toBeInTheDocument();
    expect(screen.getByText('File information')).toBeInTheDocument();
    expect(screen.getByText('Move to trash')).toBeInTheDocument();

    // Verify removed items are not present
    expect(screen.queryByText('Ask Gemini')).not.toBeInTheDocument();
    expect(screen.queryByText('Not a helpful suggestion')).not.toBeInTheDocument();

    // Click Share to test modal opening
    fireEvent.click(screen.getByText('Share'));
    expect(screen.getByRole('button', { name: /Copy Link/i })).toBeInTheDocument();
  });

  it('should display folder action options (Download, Rename, Share, Folder information, Move to trash) when clicking 3 dots on a folder card', () => {
    render(<App />);

    // Navigate to Workspace
    const workspaceLink = screen.getByRole('link', { name: /Workspace/i });
    fireEvent.click(workspaceLink);

    // Click the 3-dots button on a folder card
    const folderMoreBtns = screen.getAllByTitle('Folder options');
    expect(folderMoreBtns.length).toBeGreaterThan(0);
    fireEvent.click(folderMoreBtns[0]);

    // Verify included folder action options
    expect(screen.getByText('Download')).toBeInTheDocument();
    expect(screen.getByText('Rename')).toBeInTheDocument();
    expect(screen.getByText('Share')).toBeInTheDocument();
    expect(screen.getByText('Folder information')).toBeInTheDocument();
    expect(screen.getByText('Move to trash')).toBeInTheDocument();

    // Verify excluded options are not present
    expect(screen.queryByText('Organize')).not.toBeInTheDocument();
    expect(screen.queryByText('Open with')).not.toBeInTheDocument();
    expect(screen.queryByText('Make a copy')).not.toBeInTheDocument();

    // Click Rename to test folder rename modal opening
    fireEvent.click(screen.getByText('Rename'));
    expect(screen.getByText('Rename folder')).toBeInTheDocument();
  });

  it('should allow user to create custom filters and apply them in workspace', () => {
    render(<App />);

    // Navigate to Workspace
    const workspaceLink = screen.getByRole('link', { name: /Workspace/i });
    fireEvent.click(workspaceLink);

    // Verify "+ Create filter" button exists
    const createFilterBtn = screen.getByRole('button', { name: /\+ Create filter/i });
    expect(createFilterBtn).toBeInTheDocument();

    // Click "+ Create filter" to open modal
    fireEvent.click(createFilterBtn);
    expect(screen.getByText('Create Custom Filter')).toBeInTheDocument();

    // Verify dimension options exist
    expect(screen.getByText('Class / Grade')).toBeInTheDocument();
    expect(screen.getByText('Section')).toBeInTheDocument();
    expect(screen.getByText('Teaching Staff')).toBeInTheDocument();
    expect(screen.getByText('Non-Teaching Staff')).toBeInTheDocument();
    expect(screen.getByText('Circulars & Notices')).toBeInTheDocument();
    expect(screen.getByText('Report Cards & Grades')).toBeInTheDocument();
    expect(screen.getByText('Question Papers & Banks')).toBeInTheDocument();

    // Apply the filter (default Class / Grade: Grade 10)
    const applyBtn = screen.getByRole('button', { name: /Apply Filter/i });
    fireEvent.click(applyBtn);

    // Verify active custom chip appears
    expect(screen.getAllByText(/Class \/ Grade: Grade 10/i)[0]).toBeInTheDocument();

    // Verify Clear all button appears and resets filters
    const clearAllBtn = screen.getByRole('button', { name: /Clear all/i });
    fireEvent.click(clearAllBtn);
    expect(screen.queryByText(/Class \/ Grade: Grade 10/i)).not.toBeInTheDocument();
  });
});

