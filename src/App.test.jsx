import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import App from './App';
import '@testing-library/jest-dom';

describe('EduVault App Rendering & Navigation tests', () => {
  it('should render the app logo and vision description on loading', () => {
    render(<App />);
    expect(screen.getAllByText(/Edu/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/Secure Workspace for/i)).toBeInTheDocument();
  });

  it('should toggle to login page when clicking Log In button', () => {
    render(<App />);
    
    // Find the Log In button in the navigation header
    const loginBtn = screen.getByRole('button', { name: /Log In/i });
    expect(loginBtn).toBeInTheDocument();
    
    // Click Log In
    fireEvent.click(loginBtn);
    
    // Login form title should be present
    expect(screen.getByRole('heading', { name: /Welcome Back/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('you@school.edu')).toBeInTheDocument();
  });

  it('should sign in and update user context when submitting form', () => {
    render(<App />);
    
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
    
    // Should be returned to Home page and showing user profile button in header
    expect(screen.getByText('arabisvi@gmail.com (Logout)')).toBeInTheDocument();
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
});
