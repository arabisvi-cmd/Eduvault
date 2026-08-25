import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import App from '../../App';
import { verifyInstitutionalId, authenticateUser } from '../../lib/authService';
import '@testing-library/jest-dom';

vi.mock('../../lib/supabase', () => ({
  isSupabaseConfigured: false,
  supabase: null
}));

describe('Regression: Boundary Conditions & Edge Case Defenses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Search & Query Sanitization Regression', () => {
    it('should handle regex special characters in search input without throwing uncaught exceptions', () => {
      render(<App />);

      const searchInputs = screen.getAllByRole('textbox');
      const searchBox = searchInputs.find(input => 
        input.getAttribute('placeholder')?.toLowerCase().includes('search')
      );

      if (searchBox) {
        // Special characters that could break naive RegExp: (.*+?^${}()|[]\)
        const specialQueries = ['[Physics]', '.*', '(Exam)', '\\d+', '++'];
        specialQueries.forEach(query => {
          expect(() => {
            fireEvent.change(searchBox, { target: { value: query } });
          }).not.toThrow();
        });
      }
    });

    it('should handle whitespace-only search queries gracefully without crashing document lists', () => {
      render(<App />);
      const searchInputs = screen.getAllByRole('textbox');
      const searchBox = searchInputs.find(input => 
        input.getAttribute('placeholder')?.toLowerCase().includes('search')
      );

      if (searchBox) {
        fireEvent.change(searchBox, { target: { value: '    ' } });
        expect(searchBox.value).toBe('    ');
      }
    });
  });

  describe('Identifier & Case Normalization Regression', () => {
    it('should authenticate user regardless of mixed casing in email or institutional ID', async () => {
      const lowerRes = await authenticateUser({
        identifier: 'tch-1002',
        password: 'password123',
        loginType: 'user'
      });
      expect(lowerRes.success).toBe(true);

      const upperRes = await authenticateUser({
        identifier: 'TCH-1002',
        password: 'password123',
        loginType: 'user'
      });
      expect(upperRes.success).toBe(true);

      const mixedEmailRes = await authenticateUser({
        identifier: 'SaRaH.JeNkInS@ScHoOl.EdU',
        password: 'password123',
        loginType: 'user'
      });
      expect(mixedEmailRes.success).toBe(true);
    });

    it('should handle leading and trailing whitespace around identification inputs', async () => {
      const res = await verifyInstitutionalId('teacher', '   TCH-1002   ');
      expect(res.success).toBe(true);
      expect(res.exists).toBe(true);
    });
  });

  describe('State Navigation & Unmount Safety', () => {
    it('should mount and unmount App cleanly without memory leak warnings', () => {
      const { unmount } = render(<App />);
      expect(() => unmount()).not.toThrow();
    });

    it('should handle rapid tab and filter switching without crash', () => {
      render(<App />);
      
      const buttons = screen.getAllByRole('button');
      // Rapidly click visible navigation/toggle buttons
      buttons.slice(0, 5).forEach(btn => {
        expect(() => fireEvent.click(btn)).not.toThrow();
      });
    });
  });
});
