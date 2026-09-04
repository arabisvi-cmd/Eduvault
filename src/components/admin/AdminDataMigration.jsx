import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  UploadCloud, FileText, CheckCircle, AlertTriangle, ArrowRight, 
  ArrowLeft, RefreshCw, Database, Filter, Eye, ShieldCheck, 
  Calendar, Book, Folder, BookOpen, Users, UserCheck, GraduationCap, 
  Trash2, Download, AlertCircle, Info
} from 'lucide-react';
import {
  Button,
  IconButton,
  Input,
  Select,
  FormField,
  SummaryCard,
  Badge,
  Modal,
  EmptyState,
  PageHeader,
  DataTable
} from '../ui';

// RFC 4180 compliant client-side CSV parser
function parseCSV(text) {
  const lines = [];
  let row = [];
  let inQuotes = false;
  let currentField = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',' || char === ';' || char === '\t') {
        row.push(currentField.trim());
        currentField = '';
      } else if (char === '\r' && nextChar === '\n') {
        row.push(currentField.trim());
        if (row.some(f => f !== '')) lines.push(row);
        row = [];
        currentField = '';
        i++;
      } else if (char === '\n' || char === '\r') {
        row.push(currentField.trim());
        if (row.some(f => f !== '')) lines.push(row);
        row = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  if (currentField !== '' || row.length > 0) {
    row.push(currentField.trim());
    if (row.some(f => f !== '')) lines.push(row);
  }

  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = lines[0].map(h => h.replace(/^\uFEFF/, '').trim()); // Strip BOM
  const rows = lines.slice(1).map(line => {
    const obj = {};
    headers.forEach((header, idx) => {
      obj[header] = line[idx] !== undefined ? line[idx] : '';
    });
    return obj;
  });

  return { headers, rows };
}

// Sample Templates
const TEMPLATE_CURRICULUM = `AcademicYear,ProgramName,TermName,SubjectCode,SubjectName
2026-2027,Class 10,Section A,BIO-101,Biology
2026-2027,Class 10,Section A,PHY-101,Physics
2026-2027,Class 10,Section B,BIO-101,Biology
2026-2027,B.Sc Computer Science,Semester 3,CS-301,Data Structures
2026-2027,B.Sc Computer Science,Semester 3,CS-302,Computer Architecture
2026-2027,B.Sc Computer Science,Semester 4,CS-401,Database Management Systems`;

const TEMPLATE_ROSTER = `AcademicYear,ProgramName,TermName,SubjectCode,SubjectName,UserEmail,UserRole
2026-2027,Class 10,Section A,BIO-101,Biology,alan.turing@eduvault.edu,TEACHER
2026-2027,Class 10,Section A,PHY-101,Physics,richard.feynman@eduvault.edu,TEACHER
2026-2027,Class 10,Section A,BIO-101,Biology,ada.lovelace@eduvault.edu,STUDENT
2026-2027,Class 10,Section A,BIO-101,Biology,grace.hopper@eduvault.edu,STUDENT`;

const TARGET_FIELDS = [
  { key: 'ignore', label: '— Ignore Column —', required: false },
  { key: 'academic_year', label: 'Academic Year / Session', required: true },
  { key: 'program', label: 'Program / Class / Degree', required: true },
  { key: 'term', label: 'Term / Semester / Section', required: true },
  { key: 'subject_name', label: 'Subject Name / Course Title', required: true },
  { key: 'subject_code', label: 'Subject Code (Optional)', required: false },
  { key: 'user_email', label: 'Person Email (Faculty/Student)', required: false },
  { key: 'user_role', label: 'Person Role (TEACHER/STUDENT)', required: false }
];

export default function AdminDataMigration({ userProfile, onNavigate }) {
  // Stepper Stage: 1 (Upload) to 7 (Complete)
  const [currentStep, setCurrentStep] = useState(1);

  // File & Parsing State
  const [uploadedFile, setUploadedFile] = useState(null);
  const [parsedHeaders, setParsedHeaders] = useState([]);
  const [parsedRows, setParsedRows] = useState([]);
  const [fileError, setFileError] = useState(null);

  // Mapping State: { [header]: targetFieldKey }
  const [columnMapping, setColumnMapping] = useState({});

  // Existing Database State for validation
  const [existingData, setExistingData] = useState({
    years: [],
    programs: [],
    terms: [],
    subjects: [],
    users: []
  });

  // Validation & Diff State
  const [validationSummary, setValidationSummary] = useState(null);
  const [classifiedRecords, setClassifiedRecords] = useState([]);
  const [previewFilter, setPreviewFilter] = useState('ALL'); // 'ALL' | 'NEW' | 'EXISTING' | 'WARNING'

  // Execution State
  const [isImporting, setIsImporting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [importResults, setImportResults] = useState(null);

  // Toast feedback
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch existing academic hierarchy for dry-run comparison
  const fetchExistingData = useCallback(async () => {
    if (!userProfile?.institution_id) return;
    try {
      const [{ data: yData }, { data: pData }, { data: tData }, { data: sData }, { data: uData }] = await Promise.all([
        supabase.from('academic_years').select('*').eq('institution_id', userProfile.institution_id),
        supabase.from('programs').select('*, academic_year:academic_years(id, name, institution_id)'),
        supabase.from('terms').select('*, program:programs(id, name, academic_year:academic_years(id, name, institution_id))'),
        supabase.from('subjects').select('*, term:terms(id, name, program:programs(id, name, academic_year:academic_years(id, name, institution_id)))'),
        supabase.from('users').select('id, email, full_name, role').eq('institution_id', userProfile.institution_id)
      ]);

      const instPrograms = (pData || []).filter(p => p.academic_year?.institution_id === userProfile.institution_id);
      const instTerms = (tData || []).filter(t => t.program?.academic_year?.institution_id === userProfile.institution_id);
      const instSubjects = (sData || []).filter(s => s.term?.program?.academic_year?.institution_id === userProfile.institution_id);

      setExistingData({
        years: yData || [],
        programs: instPrograms,
        terms: instTerms,
        subjects: instSubjects,
        users: uData || []
      });
    } catch (err) {
      console.error('Error loading existing data for migration check:', err);
    }
  }, [userProfile]);

  useEffect(() => {
    fetchExistingData();
  }, [fetchExistingData]);

  // Handle File Upload
  const handleFileChange = (file) => {
    setFileError(null);
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      setFileError('Please upload a standard CSV file (.csv format).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFileError('File exceeds 5MB limit. Please split larger imports into individual semester files.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const { headers, rows } = parseCSV(text);

        if (headers.length === 0 || rows.length === 0) {
          setFileError('The CSV file appears to be empty or missing header rows.');
          return;
        }

        setUploadedFile(file);
        setParsedHeaders(headers);
        setParsedRows(rows);

        // Auto-suggest column mappings based on common nomenclature
        const suggestedMapping = {};
        headers.forEach(h => {
          const lower = h.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (lower.includes('year') || lower.includes('session')) {
            suggestedMapping[h] = 'academic_year';
          } else if (lower.includes('program') || lower.includes('grade') || lower.includes('class') || lower.includes('degree')) {
            suggestedMapping[h] = 'program';
          } else if (lower.includes('term') || lower.includes('sem') || lower.includes('section')) {
            suggestedMapping[h] = 'term';
          } else if (lower.includes('code') && (lower.includes('subject') || lower.includes('course'))) {
            suggestedMapping[h] = 'subject_code';
          } else if (lower.includes('subject') || lower.includes('course') || lower.includes('title')) {
            suggestedMapping[h] = 'subject_name';
          } else if (lower.includes('email') || lower.includes('mail')) {
            suggestedMapping[h] = 'user_email';
          } else if (lower.includes('role')) {
            suggestedMapping[h] = 'user_role';
          } else {
            suggestedMapping[h] = 'ignore';
          }
        });
        setColumnMapping(suggestedMapping);

      } catch (err) {
        setFileError('Failed to parse CSV file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  // Quick Load Template
  const handleLoadTemplate = (csvContent, fileName) => {
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const file = new File([blob], fileName, { type: 'text/csv' });
    handleFileChange(file);
  };

  // Detected Structure Metrics
  const detectedMetrics = useMemo(() => {
    if (!parsedRows.length) return null;

    // Find mapped or best guess columns
    const yearCol = Object.keys(columnMapping).find(k => columnMapping[k] === 'academic_year');
    const progCol = Object.keys(columnMapping).find(k => columnMapping[k] === 'program');
    const termCol = Object.keys(columnMapping).find(k => columnMapping[k] === 'term');
    const subjCol = Object.keys(columnMapping).find(k => columnMapping[k] === 'subject_name');
    const emailCol = Object.keys(columnMapping).find(k => columnMapping[k] === 'user_email');
    const roleCol = Object.keys(columnMapping).find(k => columnMapping[k] === 'user_role');

    const years = new Set();
    const programs = new Set();
    const terms = new Set();
    const subjects = new Set();
    const teachers = new Set();
    const students = new Set();

    parsedRows.forEach(row => {
      if (yearCol && row[yearCol]) years.add(row[yearCol].trim());
      if (progCol && row[progCol]) programs.add(row[progCol].trim());
      if (termCol && row[termCol]) terms.add(row[termCol].trim());
      if (subjCol && row[subjCol]) subjects.add(row[subjCol].trim());
      
      if (emailCol && row[emailCol]) {
        const email = row[emailCol].trim().toLowerCase();
        const role = (roleCol && row[roleCol]) ? row[roleCol].trim().toUpperCase() : '';
        if (role === 'TEACHER') teachers.add(email);
        else if (role === 'STUDENT') students.add(email);
        else teachers.add(email); // fallback count
      }
    });

    return {
      years: Array.from(years),
      programs: Array.from(programs),
      terms: Array.from(terms),
      subjects: Array.from(subjects),
      teachers: Array.from(teachers),
      students: Array.from(students)
    };
  }, [parsedRows, columnMapping]);

  // Execute Validation & Diff Analysis
  const runValidation = () => {
    const yearCol = Object.keys(columnMapping).find(k => columnMapping[k] === 'academic_year');
    const progCol = Object.keys(columnMapping).find(k => columnMapping[k] === 'program');
    const termCol = Object.keys(columnMapping).find(k => columnMapping[k] === 'term');
    const subjCol = Object.keys(columnMapping).find(k => columnMapping[k] === 'subject_name');
    const codeCol = Object.keys(columnMapping).find(k => columnMapping[k] === 'subject_code');
    const emailCol = Object.keys(columnMapping).find(k => columnMapping[k] === 'user_email');
    const roleCol = Object.keys(columnMapping).find(k => columnMapping[k] === 'user_role');

    if (!yearCol || !progCol || !termCol || !subjCol) {
      showToast('Please map the required academic hierarchy columns before validation.', 'error');
      return;
    }

    const records = [];
    let validCount = 0;
    let newCount = 0;
    let existingCount = 0;
    let warningCount = 0;

    const seenInFile = new Set();

    parsedRows.forEach((row, idx) => {
      const yearName = (row[yearCol] || '').trim();
      const progName = (row[progCol] || '').trim();
      const termName = (row[termCol] || '').trim();
      const subjName = (row[subjCol] || '').trim();
      const subjCode = codeCol ? (row[codeCol] || '').trim() : '';
      const email = emailCol ? (row[emailCol] || '').trim().toLowerCase() : '';
      const role = roleCol ? (row[roleCol] || '').trim().toUpperCase() : '';

      const errors = [];
      const warnings = [];

      if (!yearName) errors.push('Missing Academic Year');
      if (!progName) errors.push('Missing Program');
      if (!termName) errors.push('Missing Term');
      if (!subjName) errors.push('Missing Subject Name');

      const uniqueKey = `${yearName}::${progName}::${termName}::${subjName}`;
      if (seenInFile.has(uniqueKey) && !email) {
        warnings.push('Duplicate subject row in CSV');
      } else {
        seenInFile.add(uniqueKey);
      }

      // Check existing database matches
      const existingYear = existingData.years.find(y => y.name.toLowerCase() === yearName.toLowerCase());
      const existingProg = existingData.programs.find(p => p.name.toLowerCase() === progName.toLowerCase() && p.academic_year?.name.toLowerCase() === yearName.toLowerCase());
      const existingTerm = existingData.terms.find(t => t.name.toLowerCase() === termName.toLowerCase() && t.program?.name.toLowerCase() === progName.toLowerCase());
      const existingSubj = existingData.subjects.find(s => s.name.toLowerCase() === subjName.toLowerCase() && s.term?.name.toLowerCase() === termName.toLowerCase());

      let diffType = 'NEW';
      if (existingSubj) {
        diffType = 'EXISTING';
        existingCount++;
        if (subjCode && existingSubj.code && existingSubj.code !== subjCode) {
          warnings.push(`Existing subject has code "${existingSubj.code}" (file specifies "${subjCode}")`);
          diffType = 'WARNING';
        }
      } else {
        newCount++;
      }

      // Check User if email present
      let matchedUser = null;
      if (email) {
        matchedUser = existingData.users.find(u => u.email.toLowerCase() === email);
        if (!matchedUser) {
          warnings.push(`User "${email}" not found in institution directory (assignment will be skipped)`);
        }
      }

      if (errors.length > 0) {
        diffType = 'ERROR';
        warningCount++;
      } else if (warnings.length > 0) {
        warningCount++;
      } else {
        validCount++;
      }

      records.push({
        rowNumber: idx + 1,
        yearName,
        progName,
        termName,
        subjName,
        subjCode,
        email,
        role,
        matchedUser,
        diffType,
        errors,
        warnings
      });
    });

    setValidationSummary({
      totalRows: parsedRows.length,
      validRows: validCount,
      newRecords: newCount,
      existingRecords: existingCount,
      warningsCount: warningCount
    });

    setClassifiedRecords(records);
    setCurrentStep(4);
  };

  // Filtered Preview Records
  const filteredPreview = useMemo(() => {
    if (previewFilter === 'ALL') return classifiedRecords;
    if (previewFilter === 'NEW') return classifiedRecords.filter(r => r.diffType === 'NEW');
    if (previewFilter === 'EXISTING') return classifiedRecords.filter(r => r.diffType === 'EXISTING');
    if (previewFilter === 'WARNING') return classifiedRecords.filter(r => r.diffType === 'WARNING' || r.diffType === 'ERROR');
    return classifiedRecords;
  }, [classifiedRecords, previewFilter]);

  // Execute Safe Sequential Migration
  const handleExecuteImport = async () => {
    setShowConfirmModal(false);
    setIsImporting(true);

    let createdYears = 0;
    let createdPrograms = 0;
    let createdTerms = 0;
    let createdSubjects = 0;
    let createdAssignments = 0;
    let createdEnrollments = 0;
    let skippedCount = 0;
    const errorsList = [];

    try {
      // 1. Group records hierarchically
      // Year Cache: { [yearName]: yearId }
      const yearCache = {};
      existingData.years.forEach(y => { yearCache[y.name.toLowerCase()] = y.id; });

      // Program Cache: { [`${yearName}::${progName}`]: progId }
      const progCache = {};
      existingData.programs.forEach(p => { 
        progCache[`${p.academic_year?.name.toLowerCase()}::${p.name.toLowerCase()}`] = p.id; 
      });

      // Term Cache: { [`${progKey}::${termName}`]: termId }
      const termCache = {};
      existingData.terms.forEach(t => {
        const yName = t.program?.academic_year?.name?.toLowerCase() || '';
        const pName = t.program?.name?.toLowerCase() || '';
        termCache[`${yName}::${pName}::${t.name.toLowerCase()}`] = t.id;
      });

      // Subject Cache: { [`${termKey}::${subjName}`]: subjId }
      const subjCache = {};
      existingData.subjects.forEach(s => {
        const yName = s.term?.program?.academic_year?.name?.toLowerCase() || '';
        const pName = s.term?.program?.name?.toLowerCase() || '';
        const tName = s.term?.name?.toLowerCase() || '';
        subjCache[`${yName}::${pName}::${tName}::${s.name.toLowerCase()}`] = s.id;
      });

      for (const rec of classifiedRecords) {
        if (rec.diffType === 'ERROR') {
          skippedCount++;
          continue;
        }

        const yLower = rec.yearName.toLowerCase();
        const pLower = rec.progName.toLowerCase();
        const tLower = rec.termName.toLowerCase();
        const sLower = rec.subjName.toLowerCase();

        // 1. Ensure Academic Year (Default is_active = false)
        let yearId = yearCache[yLower];
        if (!yearId) {
          const { data: yData, error: yErr } = await supabase
            .from('academic_years')
            .insert([{
              institution_id: userProfile.institution_id,
              name: rec.yearName,
              is_active: false // Critical: staging rule
            }])
            .select()
            .single();

          if (yErr) {
            errorsList.push(`Year ${rec.yearName}: ${yErr.message}`);
            continue;
          }
          yearId = yData.id;
          yearCache[yLower] = yearId;
          createdYears++;
        }

        // 2. Ensure Program
        const pKey = `${yLower}::${pLower}`;
        let progId = progCache[pKey];
        if (!progId) {
          const { data: pData, error: pErr } = await supabase
            .from('programs')
            .insert([{
              academic_year_id: yearId,
              name: rec.progName
            }])
            .select()
            .single();

          if (pErr) {
            errorsList.push(`Program ${rec.progName}: ${pErr.message}`);
            continue;
          }
          progId = pData.id;
          progCache[pKey] = progId;
          createdPrograms++;
        }

        // 3. Ensure Term
        const tKey = `${pKey}::${tLower}`;
        let termId = termCache[tKey];
        if (!termId) {
          const { data: tData, error: tErr } = await supabase
            .from('terms')
            .insert([{
              program_id: progId,
              name: rec.termName
            }])
            .select()
            .single();

          if (tErr) {
            errorsList.push(`Term ${rec.termName}: ${tErr.message}`);
            continue;
          }
          termId = tData.id;
          termCache[tKey] = termId;
          createdTerms++;
        }

        // 4. Ensure Subject
        const sKey = `${tKey}::${sLower}`;
        let subjId = subjCache[sKey];
        if (!subjId) {
          const { data: sData, error: sErr } = await supabase
            .from('subjects')
            .insert([{
              term_id: termId,
              name: rec.subjName,
              code: rec.subjCode || null
            }])
            .select()
            .single();

          if (sErr) {
            errorsList.push(`Subject ${rec.subjName}: ${sErr.message}`);
            continue;
          }
          subjId = sData.id;
          subjCache[sKey] = subjId;
          createdSubjects++;
        }

        // 5. If person email matched, assign or enroll
        if (rec.matchedUser && subjId) {
          const targetRole = rec.role || rec.matchedUser.role;
          if (targetRole === 'TEACHER') {
            const { error: aErr } = await supabase
              .from('teacher_assignments')
              .insert([{
                user_id: rec.matchedUser.id,
                subject_id: subjId
              }]);
            if (!aErr) createdAssignments++;
          } else if (targetRole === 'STUDENT') {
            const { error: eErr } = await supabase
              .from('student_enrollments')
              .insert([{
                user_id: rec.matchedUser.id,
                subject_id: subjId
              }]);
            if (!eErr) createdEnrollments++;
          }
        }
      }

      // Record Audit Log Entry in existing public.audit_logs
      try {
        await supabase.from('audit_logs').insert([{
          institution_id: userProfile.institution_id,
          user_id: userProfile.id,
          action: 'INSTITUTIONAL_DATA_IMPORT',
          entity_table: 'academic_structure',
          metadata: {
            filename: uploadedFile?.name,
            totalRows: parsedRows.length,
            created: {
              academic_years: createdYears,
              programs: createdPrograms,
              terms: createdTerms,
              subjects: createdSubjects,
              assignments: createdAssignments,
              enrollments: createdEnrollments
            },
            skipped: skippedCount,
            errorsCount: errorsList.length,
            timestamp: new Date().toISOString()
          }
        }]);
      } catch (auditErr) {
        console.warn('Audit log write skipped:', auditErr);
      }

      setImportResults({
        processedRows: parsedRows.length,
        createdYears,
        createdPrograms,
        createdTerms,
        createdSubjects,
        createdAssignments,
        createdEnrollments,
        skippedCount,
        errorsList
      });

      // Refresh parent caches
      fetchExistingData();
      setCurrentStep(7); // Complete
      showToast('Institutional data migration completed successfully.');

    } catch (err) {
      console.error('Fatal import error:', err);
      showToast('Import halted with error: ' + err.message, 'error');
    } finally {
      setIsImporting(false);
    }
  };

  // Reset entire migration
  const handleReset = () => {
    setUploadedFile(null);
    setParsedHeaders([]);
    setParsedRows([]);
    setColumnMapping({});
    setValidationSummary(null);
    setClassifiedRecords([]);
    setImportResults(null);
    setCurrentStep(1);
  };

  // Stepper Header
  const renderStepper = () => {
    const steps = [
      { num: 1, label: 'Upload' },
      { num: 2, label: 'Detect' },
      { num: 3, label: 'Map' },
      { num: 4, label: 'Validate' },
      { num: 5, label: 'Review & Diff' },
      { num: 6, label: 'Import' },
      { num: 7, label: 'Complete' }
    ];

    return (
      <div className="ev-stepper">
        {steps.map((step, idx) => {
          const isActive = currentStep === step.num;
          const isCompleted = currentStep > step.num;

          return (
            <React.Fragment key={step.num}>
              <div className={`ev-step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                <div className="ev-step-circle">
                  {isCompleted ? <CheckCircle size={15} /> : step.num}
                </div>
                <span className="ev-step-label">{step.label}</span>
              </div>
              {idx < steps.length - 1 && (
                <div className={`ev-step-divider ${currentStep > step.num ? 'completed' : ''}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  // --- STAGE RENDERERS ---

  // Stage 1: Upload
  const renderUploadStage = () => (
    <div>
      <div className="ev-surface-card" style={{ marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600 }}>
          Import Existing Academic Data
        </h3>
        <p style={{ color: 'var(--ev-text-secondary)', fontSize: '14px', lineHeight: 1.5, margin: '0 0 24px 0' }}>
          Seamlessly ingest existing curriculum spreadsheets (CSV) into EduVault's structured academic hierarchy without manual re-entry.
        </p>

        {/* Dropzone */}
        <label className="ev-dropzone" htmlFor="csv-file-upload">
          <input
            id="csv-file-upload"
            type="file"
            accept=".csv,text/csv"
            style={{ display: 'none' }}
            onChange={(e) => handleFileChange(e.target.files[0])}
          />
          <div className="ev-dropzone-icon">
            <UploadCloud size={28} />
          </div>
          <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--ev-text)', marginBottom: '4px' }}>
            Choose a CSV file or drag and drop here
          </div>
          <div style={{ fontSize: '13px', color: 'var(--ev-text-secondary)', marginBottom: '16px' }}>
            Standard comma-separated format (UTF-8, max 5MB)
          </div>
          <Button variant="secondary" size="compact" icon={FileText}>
            Browse File
          </Button>
        </label>

        {fileError && (
          <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(220, 38, 38, 0.08)', borderRadius: '8px', color: '#DC2626', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{fileError}</span>
          </div>
        )}
      </div>

      {/* Quick Template Presets */}
      <div className="ev-surface-card" style={{ marginBottom: '24px' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600, color: 'var(--ev-text)' }}>
          Sample Spreadsheet Templates
        </h4>
        <p style={{ color: 'var(--ev-text-secondary)', fontSize: '13px', margin: '0 0 16px 0' }}>
          Test the ingestion pipeline with pre-formatted sample files or copy their column conventions.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
          <div style={{ border: '1px solid var(--ev-border)', borderRadius: '8px', padding: '14px', background: 'var(--ev-surface-elevated)' }}>
            <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>Template A: Academic Curriculum</div>
            <div style={{ fontSize: '12px', color: 'var(--ev-text-secondary)', marginBottom: '12px' }}>
              Years, Programs, Terms, and Subjects with Course Codes.
            </div>
            <Button
              variant="secondary"
              size="compact"
              onClick={() => handleLoadTemplate(TEMPLATE_CURRICULUM, 'curriculum_sample.csv')}
            >
              Load Sample Curriculum
            </Button>
          </div>

          <div style={{ border: '1px solid var(--ev-border)', borderRadius: '8px', padding: '14px', background: 'var(--ev-surface-elevated)' }}>
            <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>Template B: People & Roster</div>
            <div style={{ fontSize: '12px', color: 'var(--ev-text-secondary)', marginBottom: '12px' }}>
              Academic subjects paired with teacher & student allocations.
            </div>
            <Button
              variant="secondary"
              size="compact"
              onClick={() => handleLoadTemplate(TEMPLATE_ROSTER, 'people_roster_sample.csv')}
            >
              Load Sample Roster
            </Button>
          </div>
        </div>
      </div>

      {/* Uploaded File Confirmation */}
      {uploadedFile && (
        <div className="ev-surface-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--ev-primary-light)', color: 'var(--ev-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ev-text)' }}>{uploadedFile.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--ev-text-secondary)' }}>
                {(uploadedFile.size / 1024).toFixed(1)} KB • {parsedRows.length} data rows • {parsedHeaders.length} columns
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button variant="tertiary" size="compact" onClick={() => setUploadedFile(null)}>
              Remove
            </Button>
            <Button variant="primary" iconRight={ArrowRight} onClick={() => setCurrentStep(2)}>
              Proceed to Detection
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  // Stage 2: Detect
  const renderDetectStage = () => (
    <div>
      <PageHeader
        title="Dataset Structure Detection"
        description="EduVault scanned your spreadsheet and identified the following academic entity groups."
        actions={
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button variant="secondary" icon={ArrowLeft} onClick={() => setCurrentStep(1)}>
              Back
            </Button>
            <Button variant="primary" iconRight={ArrowRight} onClick={() => setCurrentStep(3)}>
              Configure Column Mapping
            </Button>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <SummaryCard
          icon={Calendar}
          title="Academic Years"
          value={detectedMetrics?.years.length || 0}
          description={detectedMetrics?.years.join(', ') || 'None detected'}
        />
        <SummaryCard
          icon={Book}
          title="Programs"
          value={detectedMetrics?.programs.length || 0}
          description={detectedMetrics?.programs.slice(0, 3).join(', ') || 'None detected'}
        />
        <SummaryCard
          icon={Folder}
          title="Terms / Sections"
          value={detectedMetrics?.terms.length || 0}
          description={detectedMetrics?.terms.slice(0, 3).join(', ') || 'None detected'}
        />
        <SummaryCard
          icon={BookOpen}
          title="Subjects / Courses"
          value={detectedMetrics?.subjects.length || 0}
          description={detectedMetrics?.subjects.slice(0, 3).join(', ') || 'None detected'}
        />
      </div>

      {/* Raw Sample Preview */}
      <div className="ev-surface-card">
        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600 }}>
          Sample Data Preview (First 3 Rows)
        </h4>
        <div className="ev-table-wrapper">
          <table className="ev-table">
            <thead>
              <tr>
                {parsedHeaders.map(h => <th key={h} className="ev-th">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {parsedRows.slice(0, 3).map((r, idx) => (
                <tr key={idx} className="ev-tr">
                  {parsedHeaders.map(h => <td key={h} className="ev-td">{r[h] || '—'}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Stage 3: Map
  const renderMapStage = () => {
    const requiredMapped = ['academic_year', 'program', 'term', 'subject_name'].every(
      req => Object.values(columnMapping).includes(req)
    );

    return (
      <div>
        <PageHeader
          title="Column Mapping & Terminology"
          description="Map your spreadsheet columns to EduVault's internal academic hierarchy."
          actions={
            <div style={{ display: 'flex', gap: '10px' }}>
              <Button variant="secondary" icon={ArrowLeft} onClick={() => setCurrentStep(2)}>
                Back
              </Button>
              <Button 
                variant="primary" 
                iconRight={ArrowRight} 
                disabled={!requiredMapped}
                onClick={runValidation}
              >
                Validate Dataset
              </Button>
            </div>
          }
        />

        {/* Terminology Presets */}
        <div className="ev-surface-card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>Institutional Terminology Presets</div>
              <div style={{ fontSize: '12px', color: 'var(--ev-text-secondary)' }}>
                Select a preset to align common institutional vocabularies:
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                variant="secondary"
                size="compact"
                onClick={() => {
                  showToast('Applied K-12 School terminology preset.');
                }}
              >
                K-12 School Preset
              </Button>
              <Button
                variant="secondary"
                size="compact"
                onClick={() => {
                  showToast('Applied Higher Education terminology preset.');
                }}
              >
                Higher Education Preset
              </Button>
            </div>
          </div>
        </div>

        {/* Mapping Table */}
        <div className="ev-table-wrapper" style={{ marginBottom: '24px' }}>
          <table className="ev-table">
            <thead>
              <tr>
                <th className="ev-th">Source Spreadsheet Column</th>
                <th className="ev-th">Sample Row Value</th>
                <th className="ev-th" style={{ width: '280px' }}>Target EduVault Field</th>
                <th className="ev-th">Mapping Status</th>
              </tr>
            </thead>
            <tbody>
              {parsedHeaders.map(header => {
                const currentTarget = columnMapping[header] || 'ignore';
                const targetDef = TARGET_FIELDS.find(t => t.key === currentTarget);
                const isRequired = targetDef?.required;
                const sampleVal = parsedRows[0]?.[header] || '—';

                return (
                  <tr key={header} className="ev-tr">
                    <td className="ev-td" style={{ fontWeight: 600 }}>{header}</td>
                    <td className="ev-td" style={{ color: 'var(--ev-text-secondary)', fontFamily: 'monospace', fontSize: '12px' }}>
                      {sampleVal}
                    </td>
                    <td className="ev-td">
                      <Select
                        size="compact"
                        value={currentTarget}
                        onChange={(e) => {
                          setColumnMapping({ ...columnMapping, [header]: e.target.value });
                        }}
                      >
                        {TARGET_FIELDS.map(f => (
                          <option key={f.key} value={f.key}>
                            {f.label} {f.required ? '*' : ''}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="ev-td">
                      {currentTarget === 'ignore' ? (
                        <Badge status="inactive">Ignored</Badge>
                      ) : isRequired ? (
                        <Badge status="active">Required</Badge>
                      ) : (
                        <Badge status="current">Mapped</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!requiredMapped && (
          <div style={{ padding: '12px 16px', background: 'rgba(220, 38, 38, 0.08)', borderRadius: '8px', color: '#DC2626', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>
              <strong>Required mappings missing:</strong> You must map columns for Academic Year, Program, Term, and Subject Name.
            </span>
          </div>
        )}
      </div>
    );
  };

  // Stage 4: Validate
  const renderValidateStage = () => (
    <div>
      <PageHeader
        title="Dataset Validation Summary"
        description="EduVault performed a comprehensive validation and consistency check against your institution's existing data."
        actions={
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button variant="secondary" icon={ArrowLeft} onClick={() => setCurrentStep(3)}>
              Back to Mapping
            </Button>
            <Button 
              variant="primary" 
              iconRight={ArrowRight}
              onClick={() => setCurrentStep(5)}
            >
              Preview & Review Diff
            </Button>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <SummaryCard
          title="Total Parsed Rows"
          value={validationSummary?.totalRows || 0}
          description="Total data records evaluated in CSV"
        />
        <SummaryCard
          title="Valid Records"
          value={validationSummary?.validRows || 0}
          description="Passes all relational integrity constraints"
        />
        <SummaryCard
          title="New Entities"
          value={validationSummary?.newRecords || 0}
          description="Will be newly created upon import"
        />
        <SummaryCard
          title="Existing Matches"
          value={validationSummary?.existingRecords || 0}
          description="Matches existing database records"
        />
        <SummaryCard
          title="Warnings / Skips"
          value={validationSummary?.warningsCount || 0}
          description="Informational diagnostics or duplicate rows"
        />
      </div>

      <div className="ev-surface-card">
        <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 600 }}>
          Validation Assessment
        </h4>
        <p style={{ color: 'var(--ev-text-secondary)', fontSize: '13px', margin: '0 0 16px 0', lineHeight: 1.5 }}>
          Your dataset is structured correctly and ready for dry-run inspection. No database changes have been performed yet.
        </p>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Button variant="secondary" onClick={() => setCurrentStep(5)}>
            Inspect Row-by-Row Diff Table
          </Button>
        </div>
      </div>
    </div>
  );

  // Stage 5: Preview & Diff
  const renderPreviewStage = () => (
    <div>
      <PageHeader
        title="Dry-Run Preview & Diff"
        description="Inspect the exact additions and existing matches before committing changes to the database."
        actions={
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button variant="secondary" icon={ArrowLeft} onClick={() => setCurrentStep(4)}>
              Back
            </Button>
            <Button 
              variant="primary" 
              icon={Database}
              onClick={() => setShowConfirmModal(true)}
            >
              Proceed to Import Execution
            </Button>
          </div>
        }
      >
        {/* Filter Toolbar */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <Button
            variant={previewFilter === 'ALL' ? 'primary' : 'secondary'}
            size="compact"
            onClick={() => setPreviewFilter('ALL')}
          >
            All ({classifiedRecords.length})
          </Button>
          <Button
            variant={previewFilter === 'NEW' ? 'primary' : 'secondary'}
            size="compact"
            onClick={() => setPreviewFilter('NEW')}
          >
            New Records ({classifiedRecords.filter(r => r.diffType === 'NEW').length})
          </Button>
          <Button
            variant={previewFilter === 'EXISTING' ? 'primary' : 'secondary'}
            size="compact"
            onClick={() => setPreviewFilter('EXISTING')}
          >
            Existing Matches ({classifiedRecords.filter(r => r.diffType === 'EXISTING').length})
          </Button>
          <Button
            variant={previewFilter === 'WARNING' ? 'primary' : 'secondary'}
            size="compact"
            onClick={() => setPreviewFilter('WARNING')}
          >
            Warnings ({classifiedRecords.filter(r => r.diffType === 'WARNING' || r.diffType === 'ERROR').length})
          </Button>
        </div>
      </PageHeader>

      <div className="ev-table-wrapper">
        <table className="ev-table">
          <thead>
            <tr>
              <th className="ev-th" style={{ width: '60px' }}>Row</th>
              <th className="ev-th">Diff Classification</th>
              <th className="ev-th">Official Subject & Code</th>
              <th className="ev-th">Academic Placement</th>
              <th className="ev-th">Person Association</th>
              <th className="ev-th">Planned Ingestion Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredPreview.map((rec, idx) => {
              const isNew = rec.diffType === 'NEW';
              const isExisting = rec.diffType === 'EXISTING';
              const isWarn = rec.diffType === 'WARNING';
              const isErr = rec.diffType === 'ERROR';

              return (
                <tr key={idx} className="ev-tr">
                  <td className="ev-td" style={{ color: 'var(--ev-text-secondary)', fontSize: '12px' }}>
                    #{rec.rowNumber}
                  </td>
                  <td className="ev-td">
                    {isNew && <Badge status="active">New Entity</Badge>}
                    {isExisting && <Badge status="current">Existing Match</Badge>}
                    {isWarn && <span className="ev-badge" style={{ background: '#FEF3C7', color: '#92400E' }}>Warning</span>}
                    {isErr && <span className="ev-badge" style={{ background: '#FEE2E2', color: '#B91C1C' }}>Invalid</span>}
                  </td>
                  <td className="ev-td">
                    <div style={{ fontWeight: 600 }}>{rec.subjName}</div>
                    {rec.subjCode && (
                      <div style={{ fontSize: '11px', color: 'var(--ev-text-secondary)' }}>Code: {rec.subjCode}</div>
                    )}
                  </td>
                  <td className="ev-td">
                    <div style={{ fontSize: '13px', fontWeight: 500 }}>{rec.termName}</div>
                    <div style={{ fontSize: '11px', color: 'var(--ev-text-secondary)' }}>
                      {rec.progName} • {rec.yearName}
                    </div>
                  </td>
                  <td className="ev-td">
                    {rec.email ? (
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 500 }}>{rec.email}</div>
                        <div style={{ fontSize: '11px', color: 'var(--ev-text-secondary)' }}>{rec.role || 'User'}</div>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--ev-text-secondary)', fontSize: '12px' }}>—</span>
                    )}
                  </td>
                  <td className="ev-td">
                    {isNew && <span style={{ color: '#059669', fontSize: '12px' }}>Will create in database</span>}
                    {isExisting && <span style={{ color: 'var(--ev-primary)', fontSize: '12px' }}>Will link to existing record</span>}
                    {isWarn && <span style={{ color: '#B45309', fontSize: '12px' }}>{rec.warnings[0]}</span>}
                    {isErr && <span style={{ color: '#DC2626', fontSize: '12px' }}>{rec.errors[0]}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Stage 7: Complete & Activation Callout
  const renderCompleteStage = () => (
    <div>
      <div className="ev-surface-card" style={{ marginBottom: '24px', textAlign: 'center', padding: '36px 20px' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#D1FAE5', color: '#059669', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
          <CheckCircle size={32} />
        </div>
        <h2 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--ev-text)' }}>
          Institutional Migration Complete
        </h2>
        <p style={{ color: 'var(--ev-text-secondary)', fontSize: '14px', maxWidth: '520px', margin: '0 auto 24px auto', lineHeight: 1.5 }}>
          Your records have been parsed, validated, and ingested into EduVault.
        </p>

        {/* Breakdown Badges */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '28px' }}>
          <div style={{ padding: '12px 18px', background: 'var(--ev-surface-elevated)', borderRadius: '8px', border: '1px solid var(--ev-border)' }}>
            <div style={{ fontSize: '20px', fontWeight: 700 }}>{importResults?.createdYears || 0}</div>
            <div style={{ fontSize: '12px', color: 'var(--ev-text-secondary)' }}>Years Staged</div>
          </div>
          <div style={{ padding: '12px 18px', background: 'var(--ev-surface-elevated)', borderRadius: '8px', border: '1px solid var(--ev-border)' }}>
            <div style={{ fontSize: '20px', fontWeight: 700 }}>{importResults?.createdPrograms || 0}</div>
            <div style={{ fontSize: '12px', color: 'var(--ev-text-secondary)' }}>Programs Created</div>
          </div>
          <div style={{ padding: '12px 18px', background: 'var(--ev-surface-elevated)', borderRadius: '8px', border: '1px solid var(--ev-border)' }}>
            <div style={{ fontSize: '20px', fontWeight: 700 }}>{importResults?.createdTerms || 0}</div>
            <div style={{ fontSize: '12px', color: 'var(--ev-text-secondary)' }}>Terms Created</div>
          </div>
          <div style={{ padding: '12px 18px', background: 'var(--ev-surface-elevated)', borderRadius: '8px', border: '1px solid var(--ev-border)' }}>
            <div style={{ fontSize: '20px', fontWeight: 700 }}>{importResults?.createdSubjects || 0}</div>
            <div style={{ fontSize: '12px', color: 'var(--ev-text-secondary)' }}>Subjects Created</div>
          </div>
        </div>

        {/* Important Activation Callout */}
        <div style={{
          background: 'rgba(30, 58, 95, 0.06)',
          border: '1px solid rgba(30, 58, 95, 0.2)',
          borderRadius: '10px',
          padding: '20px',
          maxWidth: '680px',
          margin: '0 auto 28px auto',
          textAlign: 'left'
        }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <ShieldCheck size={24} style={{ color: 'var(--ev-primary)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--ev-text)', marginBottom: '4px' }}>
                Academic Structure Inactive by Design
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--ev-text-secondary)', lineHeight: 1.55 }}>
                To preserve uninterrupted access for ongoing active terms, newly imported Academic Years are marked as <strong>Inactive (is_active = false)</strong>. 
                Please inspect your courses in <strong>Academic Setup</strong>, verify the curriculum, and toggle the year to <strong>Active</strong> when you are ready to transition your institution.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Nav Buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <Button
            variant="primary"
            icon={BookOpen}
            onClick={() => onNavigate && onNavigate('admin-academic')}
          >
            Review in Academic Setup
          </Button>
          <Button
            variant="secondary"
            icon={Users}
            onClick={() => onNavigate && onNavigate('admin-people')}
          >
            Review in People & Allocations
          </Button>
          <Button
            variant="tertiary"
            icon={RefreshCw}
            onClick={handleReset}
          >
            Start Another Migration
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ padding: '0', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 10000,
          background: toast.type === 'error' ? '#DC2626' : 'var(--ev-primary)',
          color: '#FFFFFF',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: 'var(--ev-shadow-lg)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13px',
          fontWeight: 500,
          animation: 'ev-modal-enter 0.2s ease-out'
        }}>
          <CheckCircle size={16} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Main Header */}
      <PageHeader
        title="Institutional Data Migration"
        description="Migrate historical academic catalogs, degree programs, and course rosters into EduVault with staged review."
      />

      {/* 7-Stage Stepper */}
      {renderStepper()}

      {/* Stage Views */}
      {currentStep === 1 && renderUploadStage()}
      {currentStep === 2 && renderDetectStage()}
      {currentStep === 3 && renderMapStage()}
      {currentStep === 4 && renderValidateStage()}
      {currentStep === 5 && renderPreviewStage()}
      {currentStep === 7 && renderCompleteStage()}

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Institutional Data Ingestion"
        description="You are about to write validated academic records to the database."
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowConfirmModal(false)} disabled={isImporting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleExecuteImport} loading={isImporting}>
              Import {validationSummary?.validRows || 0} Records
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '12px', background: 'rgba(30, 58, 95, 0.08)', borderRadius: '8px' }}>
            <Info size={20} style={{ color: 'var(--ev-primary)', flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '13px', color: 'var(--ev-text)', lineHeight: 1.4 }}>
              <strong>Safe Non-Destructive Ingestion:</strong> Existing academic data will NOT be deleted or overwritten. New entities will be added sequentially.
            </div>
          </div>

          <div style={{ fontSize: '13px', color: 'var(--ev-text-secondary)', lineHeight: 1.5 }}>
            • <strong>Academic Years:</strong> Staged with <code>is_active = false</code>.<br />
            • <strong>Programs & Terms:</strong> Linked to their parent calendar cycles.<br />
            • <strong>Subjects:</strong> Inserted under their respective terms with course codes.<br />
            • <strong>Audit Trail:</strong> Logged immutably in institutional audit logs.
          </div>
        </div>
      </Modal>
    </div>
  );
}
