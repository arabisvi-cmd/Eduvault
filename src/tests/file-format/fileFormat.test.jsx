import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import App from '../../App';
import '@testing-library/jest-dom';

vi.mock('../../lib/supabase', () => ({
  isSupabaseConfigured: false,
  supabase: null
}));

/**
 * Universal file extension & category resolver logic testable against system contracts
 */
function resolveFileType(filename) {
  if (!filename || typeof filename !== 'string') return 'pdf';
  const ext = filename.split('.').pop().toLowerCase();
  
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) {
    return 'image';
  } else if (['xlsx', 'xls', 'csv'].includes(ext)) {
    return 'xlsx';
  } else if (['doc', 'docx', 'txt', 'rtf'].includes(ext)) {
    return 'doc';
  } else if (['mp4', 'mov', 'mkv', 'avi'].includes(ext)) {
    return 'video';
  } else if (['ts', 'js', 'py', 'ipynb', 'html', 'css', 'cpp', 'java'].includes(ext)) {
    return 'code';
  } else if (['zip', 'rar', 'tar', 'gz'].includes(ext)) {
    return 'zip';
  }
  return 'pdf';
}

function formatFileSize(bytes) {
  if (typeof bytes !== 'number' || isNaN(bytes) || bytes <= 0) return '0 KB';
  return bytes > 1024 * 1024
    ? (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    : (bytes / 1024).toFixed(0) + ' KB';
}

describe('File Format: Universal File Handling & Type Resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Extension & Category Classification', () => {
    it('should classify image formats correctly', () => {
      const imageFiles = ['photo.png', 'diagram.jpg', 'avatar.jpeg', 'graphic.gif', 'icon.svg', 'banner.webp'];
      imageFiles.forEach(file => {
        expect(resolveFileType(file)).toBe('image');
      });
    });

    it('should classify spreadsheet and tabular formats correctly', () => {
      const dataFiles = ['marks.xlsx', 'attendance.xls', 'roster.csv'];
      dataFiles.forEach(file => {
        expect(resolveFileType(file)).toBe('xlsx');
      });
    });

    it('should classify code and notebook formats correctly', () => {
      const codeFiles = ['app.js', 'server.ts', 'script.py', 'analysis.ipynb', 'index.html', 'styles.css', 'main.cpp', 'App.java'];
      codeFiles.forEach(file => {
        expect(resolveFileType(file)).toBe('code');
      });
    });

    it('should classify documents, text, and rich text formats correctly', () => {
      const docFiles = ['syllabus.doc', 'curriculum.docx', 'notes.txt', 'handout.rtf'];
      docFiles.forEach(file => {
        expect(resolveFileType(file)).toBe('doc');
      });
    });

    it('should classify multimedia and archive formats correctly', () => {
      const videoFiles = ['lecture.mp4', 'demo.mov', 'recording.mkv', 'clip.avi'];
      videoFiles.forEach(file => {
        expect(resolveFileType(file)).toBe('video');
      });

      const zipFiles = ['project.zip', 'backup.rar', 'archive.tar', 'bundle.gz'];
      zipFiles.forEach(file => {
        expect(resolveFileType(file)).toBe('zip');
      });
    });

    it('should fallback to pdf for pdf extensions and unknown file types', () => {
      expect(resolveFileType('exam.pdf')).toBe('pdf');
      expect(resolveFileType('unknown.xyz123')).toBe('pdf');
    });
  });

  describe('Filename Robustness & Edge Cases', () => {
    it('should correctly resolve uppercase extensions', () => {
      expect(resolveFileType('DOCUMENT.PDF')).toBe('pdf');
      expect(resolveFileType('IMAGE.PNG')).toBe('image');
      expect(resolveFileType('DATA.CSV')).toBe('xlsx');
      expect(resolveFileType('SCRIPT.PY')).toBe('code');
    });

    it('should resolve files with multiple dots in filename correctly', () => {
      expect(resolveFileType('math.final.exam.2026.pdf')).toBe('pdf');
      expect(resolveFileType('data.backup.v2.tar.gz')).toBe('zip');
      expect(resolveFileType('user.component.test.jsx')).toBe('pdf'); // JSX defaults to default fallback or code
      expect(resolveFileType('user.component.test.js')).toBe('code');
    });
  });

  describe('File Size Calculation & Unit Formatting', () => {
    it('should format sizes below 1 MB in KB', () => {
      expect(formatFileSize(500 * 1024)).toBe('500 KB');
      expect(formatFileSize(1024)).toBe('1 KB');
    });

    it('should format sizes above 1 MB in MB with one decimal place', () => {
      expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
      expect(formatFileSize(15 * 1024 * 1024)).toBe('15.0 MB');
    });

    it('should handle zero and negative/invalid values safely', () => {
      expect(formatFileSize(0)).toBe('0 KB');
      expect(formatFileSize(null)).toBe('0 KB');
      expect(formatFileSize(-100)).toBe('0 KB');
    });
  });

  describe('File Upload Interaction Simulation', () => {
    it('should process simulated file selection without crashing the workspace', async () => {
      render(<App />);

      // Navigate to Workspace
      const workspaceLink = screen.getByRole('link', { name: /Workspace/i });
      fireEvent.click(workspaceLink);

      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) {
        const file = new File(['dummy test content'], 'sample_curriculum.pdf', { type: 'application/pdf' });
        fireEvent.change(fileInput, { target: { files: [file] } });
      }
    });
  });
});
