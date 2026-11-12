import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import App from './App';
import '@testing-library/jest-dom';

function renderApp(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <App />
    </MemoryRouter>
  );
}

vi.mock('./lib/api', () => ({
  api: {
    auth: {
      login: vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
      signup: vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
      logout: vi.fn(),
      getCurrentUser: vi.fn().mockReturnValue(null),
      changePassword: vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
      deleteAccount: vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
      uploadProfileImage: vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
      updateProfile: vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    },
    documents: {
      list: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({}),
      patch: vi.fn().mockResolvedValue({}),
    },
    vaultSections: {
      list: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
      delete: vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    },
    folders: {
      list: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
      patch: vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    },
  },
}));

vi.mock('./lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: { email: 'arabisvi@gmail.com', user_metadata: { user_type: 'teacher' } } },
        error: null,
      }),
      signUp: vi.fn().mockResolvedValue({ data: { user: { email: 'arabisvi@gmail.com' } }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null })
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [], error: null })
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [], error: null })
      })
    })
  }
}));

async function loginTestUser() {
  const loginBtn = screen.getByRole('button', { name: /Log In/i });
  fireEvent.click(loginBtn);
  fireEvent.change(screen.getByPlaceholderText('you@school.edu'), { target: { value: 'arabisvi@gmail.com' } });
  fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Log In' }));
  await waitFor(() => {
    expect(screen.getByRole('button', { name: /Account menu/i })).toBeInTheDocument();
    expect(screen.getByTestId('workspace-context-title')).toBeInTheDocument();
  });
}

describe('EduVault App Rendering & Navigation tests', () => {
  it('should render the app logo and vision description on loading', () => {
    renderApp();
    expect(screen.getAllByText(/Edu/i)[0]).toBeInTheDocument();
    expect(screen.getByText("By PersonAI")).toBeInTheDocument();
    expect(screen.getByText(/Secure Workspace for/i)).toBeInTheDocument();
  });

  it('should toggle to login page when clicking Log In button', () => {
    renderApp();
    
    // Find the Log In button in the navigation header
    const loginBtn = screen.getByRole('button', { name: /Log In/i });
    expect(loginBtn).toBeInTheDocument();
    
    // Click Log In
    fireEvent.click(loginBtn);
    
    // Login form title should be present
    expect(screen.getByRole('heading', { name: /Welcome Back/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('you@school.edu')).toBeInTheDocument();
  });

  it('should sign in and update user context when submitting form', async () => {
    renderApp();
    
    // Navigate to Login Page
    const loginBtn = screen.getByRole('button', { name: /Log In/i });
    fireEvent.click(loginBtn);
    
    // Enter credentials
    const emailInput = screen.getByPlaceholderText('you@school.edu');
    const passwordInput = screen.getByPlaceholderText('••••••••');
    
    fireEvent.change(emailInput, { target: { value: 'arabisvi@gmail.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    // Submit form
    const submitBtn = screen.getByRole('button', { name: 'Log In' });
    fireEvent.click(submitBtn);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Account menu/i })).toBeInTheDocument();
      expect(screen.getByTestId('workspace-context-title')).toBeInTheDocument();
    });
  });

  it('should filter documents when typing in the hero search bar', () => {
    renderApp();

    // Get hero search input
    const searchInput = screen.getByTestId('hero-search-input');
    expect(searchInput).toBeInTheDocument();

    // Type a specific term e.g., 'Optics'
    fireEvent.change(searchInput, { target: { value: 'Optics' } });

    // Verify list updates
    expect(screen.getByText('Optics Formulas & Cheat Sheet')).toBeInTheDocument();
    expect(screen.queryByText('Mid-Term Physics Study Guide')).not.toBeInTheDocument();
  });

  it('should send guests to login when opening workspace without signing in', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /Launch EduVault Workspace/i }));
    expect(screen.getByRole('heading', { name: /Welcome Back/i })).toBeInTheDocument();
  });

  it('should navigate to Google Drive Workspace and display suggested folders & files', async () => {
    renderApp();
    await loginTestUser();

    expect(screen.getByTestId('workspace-context-title')).toHaveTextContent(/St\. Xavier High School/);
    expect(screen.getByTestId('workspace-context-title')).toHaveTextContent(/Physics/);
    expect(screen.getByText('Folders')).toBeInTheDocument();
    expect(screen.getByText('Files')).toBeInTheDocument();
    
    // Check for academic folders
    expect(screen.getByText('Physics Lecture Slides')).toBeInTheDocument();
    expect(screen.getByText('Chemistry Lab Exercises')).toBeInTheDocument();
    expect(screen.getByText('Mathematics Problem Sets')).toBeInTheDocument();
    expect(screen.getByText('Administrative Circulars')).toBeInTheDocument();
    expect(screen.getByText('Term 1 Question Banks')).toBeInTheDocument();

    // Check for academic files
    expect(screen.getAllByText('Mid-Term Physics Study Guide')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Thermodynamics Lab Report Template')[0]).toBeInTheDocument();
    expect(screen.getByText('14.2 GB of 100 GB library used')).toBeInTheDocument();
  });

  it('should toggle view mode between grid and list in Drive workspace', async () => {
    renderApp();
    await loginTestUser();

    // Find List view button
    const listBtn = screen.getByTitle('List view');
    fireEvent.click(listBtn);

    // Verify table headers appear
    expect(screen.getByRole('columnheader', { name: /Last modified/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /File size/i })).toBeInTheDocument();
  });

  it('should navigate into a folder and go back when clicking the Back button', async () => {
    renderApp();
    await loginTestUser();

    // Navigate to Workspace
    // Click on a folder
    const folderCard = screen.getByText('Physics Lecture Slides');
    fireEvent.click(folderCard);

    // Verify we are inside the folder and Back button is shown
    const backBtn = screen.getByTitle('Go back to all folders');
    expect(backBtn).toBeInTheDocument();

    // Click the Back button
    fireEvent.click(backBtn);

    // Verify we are back on root and folders section is visible
    expect(screen.getByText('Folders')).toBeInTheDocument();
  });

  it('should show inline folder card in Folders when clicking New folder', async () => {
    renderApp();
    await loginTestUser();

    // Navigate to Workspace
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

    await waitFor(() => {
      expect(screen.getByText('Biology Field Work')).toBeInTheDocument();
    });
  });

  it('should display file action options matching reference image when clicking 3 dots on a file card', async () => {
    renderApp();
    await loginTestUser();

    // Navigate to Workspace
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

  it('should display folder action options (Download, Rename, Share, Folder information, Move to trash) when clicking 3 dots on a folder card', async () => {
    renderApp();
    await loginTestUser();

    // Navigate to Workspace
    // Click the 3-dots button on a folder card
    const folderMoreBtns = screen.getAllByTitle('Folder options');
    expect(folderMoreBtns.length).toBeGreaterThan(0);
    fireEvent.click(folderMoreBtns[0]);

    // Verify included folder action options
    expect(screen.getByText('Download')).toBeInTheDocument();
    expect(screen.getByText('Rename')).toBeInTheDocument();
    expect(screen.getByText('Share')).toBeInTheDocument();
    expect(screen.getByText('Organize')).toBeInTheDocument();
    expect(screen.getByText('Folder information')).toBeInTheDocument();
    expect(screen.getByText('Move to trash')).toBeInTheDocument();

    // Verify excluded options are not present
    expect(screen.queryByText('Open with')).not.toBeInTheDocument();
    expect(screen.queryByText('Make a copy')).not.toBeInTheDocument();

    // Click Rename to test folder rename modal opening
    fireEvent.click(screen.getByText('Rename'));
    expect(screen.getByText('Rename folder')).toBeInTheDocument();
  });

  it('should allow user to create custom filters and apply them in workspace', async () => {
    renderApp();
    await loginTestUser();

    // Navigate to Workspace
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

    const clearFiltersBtn = screen.getByRole('button', { name: /Clear filters/i });
    fireEvent.click(clearFiltersBtn);
    expect(screen.queryByText(/Class \/ Grade: Grade 10/i)).not.toBeInTheDocument();
  });
});

