import React, { useState, useRef, useEffect } from 'react';
import { 
  ShieldCheck, Mail, ArrowRight, Filter, School, Calendar, 
  Users, BookOpen, Clock, Search, UploadCloud, FileText, 
  FileSpreadsheet, FileCheck, CheckCircle, Circle, Shield, Info, FolderOpen,
  Lock, ArrowLeft, LogIn, UserPlus, ChevronRight, Plus,
  Trash2, Folder, Image, Download, Home, HardDrive,
  Star, Cloud, MoreVertical, LayoutGrid, List, ChevronDown,
  Film, FileCode, Archive, Sparkles, X, Check,
  Share2, FolderInput, Copy, Pencil, ExternalLink, Settings, Bell, LogOut,
  Sun, Moon, CircleDot
} from 'lucide-react';
import AdminAcademicManager from './AdminAcademicManager';
import AdminPeopleHub from './components/admin/AdminPeopleHub';
import AdminDataMigration from './components/admin/AdminDataMigration';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import MySubjects from './MySubjects';
import GlobalSearch from './GlobalSearch';
import Notices from './Notices';

const INITIAL_FOLDERS = [
  { id: "folder-1", name: "Physics Lecture Slides", path: "in EduVault Drive" },
  { id: "folder-2", name: "Chemistry Lab Exercises", path: "in EduVault Drive" },
  { id: "folder-3", name: "Mathematics Problem Sets", path: "in EduVault Drive" },
  { id: "folder-4", name: "Administrative Circulars", path: "in EduVault Drive" },
  { id: "folder-5", name: "Term 1 Question Banks", path: "in EduVault Drive" }
];

const INITIAL_DOCUMENTS = [
  {
    id: 1,
    title: "Mid-Term Physics Study Guide",
    institution: "inst-1",
    year: "2026-2027",
    class: "grade-10",
    subject: "physics",
    timeline: "term-1",
    type: "pdf",
    size: "2.4 MB",
    date: "Aug 15, 2026",
    activity: "Teacher posted • Aug 15",
    owner: "teacher@school.edu",
    section: "Section A",
    role: "students",
    folderId: "folder-1",
    previewType: "pdf-text"
  },
  {
    id: 2,
    title: "Thermodynamics Lab Report Template",
    institution: "inst-1",
    year: "2026-2027",
    class: "grade-10",
    subject: "physics",
    timeline: "term-1",
    type: "doc",
    size: "1.2 MB",
    date: "Aug 12, 2026",
    activity: "You edited • Aug 12",
    owner: "teacher@school.edu",
    section: "Section A",
    role: "students",
    folderId: null,
    previewType: "doc-text"
  },
  {
    id: 3,
    title: "Optics Formulas & Cheat Sheet",
    institution: "inst-1",
    year: "2026-2027",
    class: "grade-10",
    subject: "physics",
    timeline: "term-1",
    type: "pdf",
    size: "850 KB",
    date: "Aug 10, 2026",
    activity: "You opened • Aug 10",
    owner: "admin@school.edu",
    section: "Section A",
    role: "teaching_staff",
    folderId: "folder-1",
    previewType: "pdf-text"
  },
  {
    id: 4,
    title: "Grade 10 Physics Syllabus 2026",
    institution: "inst-1",
    year: "2026-2027",
    class: "grade-10",
    subject: "physics",
    timeline: "term-1",
    type: "pdf",
    size: "4.1 MB",
    date: "Aug 01, 2026",
    activity: "Admin uploaded • Aug 01",
    owner: "admin@school.edu",
    section: "Section A",
    role: "students",
    folderId: null,
    previewType: "pdf-text"
  },
  {
    id: 5,
    title: "Calculus Limits & Continuity Exercises",
    institution: "inst-1",
    year: "2026-2027",
    class: "grade-11",
    subject: "mathematics",
    timeline: "term-1",
    type: "pdf",
    size: "1.8 MB",
    date: "Aug 18, 2026",
    activity: "You opened • Aug 18",
    owner: "instructor@school.edu",
    section: "Science",
    role: "students",
    folderId: "folder-3",
    previewType: "pdf-text"
  },
  {
    id: 6,
    title: "Organic Chemistry Nomenclature Sheet",
    institution: "inst-2",
    year: "2026-2027",
    class: "grade-12",
    subject: "chemistry",
    timeline: "term-2",
    type: "xlsx",
    size: "620 KB",
    date: "Jul 29, 2026",
    activity: "Registrar modified • Jul 29",
    owner: "registrar@school.edu",
    section: "Commerce",
    role: "non_teaching_staff",
    folderId: "folder-2",
    previewType: "sheet-preview"
  },
  {
    id: 7,
    title: "Biology Cell Structure Diagrams",
    institution: "inst-1",
    year: "2026-2027",
    class: "grade-10",
    subject: "physics",
    timeline: "term-1",
    type: "image",
    size: "3.4 MB",
    date: "Aug 14, 2026",
    activity: "You uploaded • Aug 14",
    owner: "teacher@school.edu",
    section: "Section A",
    role: "students",
    folderId: null,
    previewType: "diagram-preview"
  },
  {
    id: 8,
    title: "Computer Science Algorithms & Notes",
    institution: "inst-1",
    year: "2026-2027",
    class: "grade-11",
    subject: "mathematics",
    timeline: "term-1",
    type: "code",
    size: "24 KB",
    date: "Aug 20, 2026",
    activity: "You modified • Aug 20",
    owner: "me",
    section: "Science",
    role: "students",
    folderId: null,
    previewType: "code-preview"
  },
  {
    id: 9,
    title: "Final Exam Grading Rubric",
    institution: "inst-1",
    year: "2026-2027",
    class: "grade-10",
    subject: "physics",
    timeline: "term-1",
    type: "xlsx",
    size: "115 KB",
    date: "Aug 05, 2026",
    activity: "Admin posted • Aug 05",
    owner: "admin@school.edu",
    section: "Section A",
    role: "teaching_staff",
    folderId: "folder-4",
    previewType: "sheet-preview"
  },
  {
    id: 10,
    title: "Laboratory Safety Regulations 2026",
    institution: "inst-1",
    year: "2026-2027",
    class: "grade-10",
    subject: "physics",
    timeline: "term-1",
    type: "pdf",
    size: "1.5 MB",
    date: "Aug 11, 2026",
    activity: "You opened • Aug 11",
    owner: "admin@school.edu",
    section: "Section A",
    role: "students",
    folderId: "folder-2",
    previewType: "agreement-preview"
  },
  {
    id: 11,
    title: "School Academic Circular & Timetable",
    institution: "inst-2",
    year: "2026-2027",
    class: "grade-12",
    subject: "chemistry",
    timeline: "term-2",
    type: "doc",
    size: "95 KB",
    date: "Aug 02, 2026",
    activity: "Registrar published • Aug 02",
    owner: "registrar@school.edu",
    section: "Commerce",
    role: "non_teaching_staff",
    folderId: "folder-4",
    previewType: "doc-text"
  },
  {
    id: 12,
    title: "Quantum Physics Introduction Slides",
    institution: "inst-1",
    year: "2026-2027",
    class: "grade-10",
    subject: "physics",
    timeline: "term-1",
    type: "pdf",
    size: "5.2 MB",
    date: "Aug 19, 2026",
    activity: "You opened • Aug 19",
    owner: "teacher@school.edu",
    section: "Section A",
    role: "students",
    folderId: "folder-1",
    previewType: "pdf-text"
  }
];

const FILTER_DEFINITIONS = {
  class: {
    label: "Class / Grade",
    options: [
      { value: "grade-9", label: "Grade 9" },
      { value: "grade-10", label: "Grade 10" },
      { value: "grade-11", label: "Grade 11" },
      { value: "grade-12", label: "Grade 12" }
    ]
  },
  section: {
    label: "Section",
    options: [
      { value: "Section A", label: "Section A" },
      { value: "Section B", label: "Section B" },
      { value: "Science", label: "Science" },
      { value: "Commerce", label: "Commerce" },
      { value: "General", label: "General" }
    ]
  },
  teaching_staff: {
    label: "Teaching Staff",
    options: [
      { value: "all_teaching", label: "All Teaching Staff" },
      { value: "teacher@school.edu", label: "Faculty Instructors" },
      { value: "Prof. Sharma", label: "Prof. Sharma (Physics)" },
      { value: "Dr. Jane Doe", label: "Dr. Jane Doe (Chemistry)" }
    ]
  },
  non_teaching_staff: {
    label: "Non-Teaching Staff",
    options: [
      { value: "all_non_teaching", label: "All Non-Teaching Staff" },
      { value: "registrar@school.edu", label: "Registrar Office" },
      { value: "admin@school.edu", label: "Administrative Office" }
    ]
  },
  circulars: {
    label: "Circulars & Notices",
    options: [
      { value: "all_circulars", label: "All Academic Circulars" },
      { value: "timetable", label: "Timetable Circulars" },
      { value: "safety", label: "Safety Regulations" }
    ]
  },
  report_cards: {
    label: "Report Cards & Grades",
    options: [
      { value: "all_reports", label: "All Report Cards" },
      { value: "rubric", label: "Grading Rubrics & Sheets" }
    ]
  },
  question_papers: {
    label: "Question Papers & Banks",
    options: [
      { value: "all_papers", label: "All Question Papers" },
      { value: "physics", label: "Physics Question Banks" },
      { value: "math", label: "Mathematics Problem Sets" }
    ]
  },
  type: {
    label: "File Type",
    options: [
      { value: "pdf", label: "PDF Documents" },
      { value: "doc", label: "Word Documents" },
      { value: "xlsx", label: "Spreadsheets" },
      { value: "image", label: "Images" },
      { value: "code", label: "Code Files" },
      { value: "video", label: "Videos" }
    ]
  }
};

function Modal({ title, icon: Icon, onClose, children }) {
  return (
    <div className="gdrive-modal-overlay" onClick={onClose}>
      <div className="gdrive-move-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-standard">
          <div className="modal-title-row">
            {Icon && <Icon size={20} className="modal-title-icon" />}
            <h3>{title}</h3>
          </div>
          <button className="modal-close-icon-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const getInitials = (nameOrEmail) => {
  if (!nameOrEmail) return 'EV';
  const clean = nameOrEmail.trim();
  if (clean.includes(' ')) {
    const parts = clean.split(' ').filter(Boolean);
    return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
};

function App() {
  const [searchQuery, setSearchQuery] = useState("");
  
  const getInitialView = () => {
    const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
    if (['login', 'signup', 'workspace'].includes(hash)) {
      return hash;
    }
    return 'home';
  };

  // Navigation & Authentication states
  const [currentView, setCurrentView] = useState(getInitialView);
  const [currentUser, setCurrentUser] = useState(null); // Supabase session user object
  const [userProfile, setUserProfile] = useState(null); // Database public.users profile
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Professional Account Menu & Logout Modal states
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showLogoutConfirmModal, setShowLogoutConfirmModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const accountMenuRef = useRef(null);

  // Synchronize URL hash with currentView (preserving in-page anchors like #how-it-works)
  useEffect(() => {
    if (currentView === 'home') {
      const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
      if (['login', 'signup', 'workspace'].includes(hash)) {
        history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    } else {
      window.location.hash = currentView;
    }
  }, [currentView]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
      if (['home', 'login', 'signup', 'workspace'].includes(hash)) {
        setCurrentView(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Close account menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target)) {
        setShowAccountMenu(false);
      }
    };
    if (showAccountMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showAccountMenu]);

  // Handle Escape key for account menu and logout modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (showLogoutConfirmModal && !isLoggingOut) {
          setShowLogoutConfirmModal(false);
        }
        if (showAccountMenu) {
          setShowAccountMenu(false);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showLogoutConfirmModal, isLoggingOut, showAccountMenu]);

  // Home dashboard: real counts from Supabase (null = loading, -1 = error/unavailable)
  const [homeStats, setHomeStats] = useState(null);
  const [institutionName, setInstitutionName] = useState(null);
  
  // Form states
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [institutionInput, setInstitutionInput] = useState("inst-1");

  // Toast System
  const [toast, setToast] = useState({ show: false, message: "", icon: "info" });
  
  // Workspace specific states
  const [selectedNav, setSelectedNav] = useState("home"); // 'home', 'admin-academic', 'classes', 'my-vault', 'notices' | legacy: 'shared', 'recent', 'starred', 'trash', 'storage'
  const [showLegacyNav, setShowLegacyNav] = useState(false);
  const [workspaceViewMode, setWorkspaceViewMode] = useState("grid"); // 'grid' | 'list'
  const [showNewDropdown, setShowNewDropdown] = useState(false);
  const [suggestedFoldersOpen, setSuggestedFoldersOpen] = useState(true);
  const [suggestedFilesOpen, setSuggestedFilesOpen] = useState(true);
  const [workspaceSearchQuery, setWorkspaceSearchQuery] = useState("");
  const [activeSubject, setActiveSubject] = useState(null);
  
  // Custom User Filters
  const [customFilters, setCustomFilters] = useState([]);
  const [showCreateFilterModal, setShowCreateFilterModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState("class");
  const [filterVal, setFilterVal] = useState("grade-10");
  
  // Folders & Modal states
  const [folders, setFolders] = useState(INITIAL_FOLDERS);
  const [activeFolderId, setActiveFolderId] = useState(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedFileForPreview, setSelectedFileForPreview] = useState(null);
  const [activeMenuDocId, setActiveMenuDocId] = useState(null);
  const [movingDoc, setMovingDoc] = useState(null);
  const [sharingDoc, setSharingDoc] = useState(null);
  const [renamingDoc, setRenamingDoc] = useState(null);
  const [renameInputVal, setRenameInputVal] = useState("");
  const [activeMenuFolderId, setActiveMenuFolderId] = useState(null);
  const [renamingFolder, setRenamingFolder] = useState(null);
  const [renameFolderInputVal, setRenameFolderInputVal] = useState("");
  const [sharingFolder, setSharingFolder] = useState(null);

  // 3-Mode Theme System (Light, Dark, AMOLED)
  const getInitialAppearance = () => {
    const saved = localStorage.getItem('eduvault-appearance');
    if (saved && ['light', 'dark', 'amoled'].includes(saved)) {
      return saved;
    }
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  };
  const [appearance, setAppearance] = useState(getInitialAppearance);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', appearance);
    localStorage.setItem('eduvault-appearance', appearance);
  }, [appearance]);
  
  const workspaceFileInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const newDropdownRef = useRef(null);
  const inlineFolderInputRef = useRef(null);

  const showToast = (message, icon = "info") => {
    setToast({ show: true, message, icon });
  };


  useEffect(() => {
    if (isCreatingFolder && inlineFolderInputRef.current) {
      inlineFolderInputRef.current.focus();
      inlineFolderInputRef.current.select();
    }
  }, [isCreatingFolder]);

  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast(prev => ({ ...prev, show: false }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  // Close new dropdown and context menus on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (newDropdownRef.current && !newDropdownRef.current.contains(event.target)) {
        setShowNewDropdown(false);
      }
      if (!event.target.closest('.card-menu-wrapper')) {
        setActiveMenuDocId(null);
      }
      if (!event.target.closest('.folder-menu-wrapper')) {
        setActiveMenuFolderId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Supabase Auth & Document Fetching
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const loadProfile = async (userId) => {
      try {
        const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();
        if (error) {
          console.error("Profile error:", error);
          setUserProfile(null);
        } else {
          setUserProfile(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsAuthLoading(false);
      }
    };

    // Check existing auth session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setCurrentUser(session.user);
        loadProfile(session.user.id);
        const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
        if (hash === 'home') {
          setCurrentView('home');
        } else {
          setCurrentView('workspace');
        }
      } else {
        setCurrentUser(null);
        setUserProfile(null);
        setIsAuthLoading(false);
        // NO SESSION: Workspace is NOT allowed. If currentView is workspace, redirect to login.
        // If currentView is home, login, or signup, keep it!
        setCurrentView(prev => (prev === 'workspace' ? 'login' : prev));
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setCurrentUser(session.user);
        loadProfile(session.user.id);
        if (_event === 'SIGNED_IN') {
          setCurrentView('workspace');
        } else if (_event === 'INITIAL_SESSION') {
          const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
          if (hash !== 'home') {
            setCurrentView('workspace');
          }
        }
      } else {
        setCurrentUser(null);
        setUserProfile(null);
        setIsAuthLoading(false);
        if (_event === 'SIGNED_OUT') {
          setCurrentView('login');
        } else {
          setCurrentView(prev => (prev === 'workspace' ? 'login' : prev));
        }
      }
    });

    // Fetch documents from Supabase
    async function loadDocuments() {
      try {
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          const mappedDocs = data.map(doc => ({
            id: doc.id,
            title: doc.title,
            institution: doc.institution,
            year: doc.academic_year || doc.year || '2026-2027',
            class: doc.class_grade || doc.class || 'grade-10',
            subject: doc.subject || 'physics',
            timeline: doc.timeline || 'term-1',
            type: doc.file_type || doc.type || 'pdf',
            size: doc.file_size || doc.size || '1.0 MB',
            date: doc.created_at ? new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'Recently',
            activity: `Uploaded • ${doc.created_at ? new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recently'}`,
            owner: doc.owner || "me",
            section: doc.section || "Section A",
            role: doc.role || "students",
            folderId: doc.folderId || null,
            previewType: doc.file_type === 'image' ? 'diagram-preview' : doc.file_type === 'xlsx' ? 'sheet-preview' : doc.file_type === 'code' ? 'code-preview' : 'pdf-text'
          }));
          setDocuments(mappedDocs);
        }
      } catch (err) {
        console.warn('Could not load documents from Supabase, using defaults', err);
      }
    }

    loadDocuments();

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Load home dashboard stats when the user profile is available
  useEffect(() => {
    if (!userProfile || !isSupabaseConfigured || !supabase) return;
    let cancelled = false;
    async function loadStats() {
      try {
        // Institution name
        if (userProfile.institution_id) {
          const { data: inst } = await supabase
            .from('institutions')
            .select('name')
            .eq('id', userProfile.institution_id)
            .single();
          if (!cancelled && inst) setInstitutionName(inst.name);
        }

        // Counts — only query tables the user can read under current RLS
        const counts = {};
        const [years, programs, subjects, docs, notices] = await Promise.allSettled([
          supabase.from('academic_years').select('id', { count: 'exact', head: true }),
          supabase.from('programs').select('id', { count: 'exact', head: true }),
          supabase.from('subjects').select('id', { count: 'exact', head: true }),
          supabase.from('documents').select('id', { count: 'exact', head: true }),
          supabase.from('notices').select('id', { count: 'exact', head: true }),
        ]);
        counts.years    = years.status    === 'fulfilled' && !years.value.error    ? (years.value.count    ?? 0) : null;
        counts.programs = programs.status === 'fulfilled' && !programs.value.error ? (programs.value.count ?? 0) : null;
        counts.subjects = subjects.status === 'fulfilled' && !subjects.value.error ? (subjects.value.count ?? 0) : null;
        counts.docs     = docs.status     === 'fulfilled' && !docs.value.error     ? (docs.value.count     ?? 0) : null;
        counts.notices  = notices.status  === 'fulfilled' && !notices.value.error  ? (notices.value.count  ?? 0) : null;

        // Teacher-specific
        if (userProfile.role === 'TEACHER') {
          const { count, error } = await supabase
            .from('teacher_assignments')
            .select('id', { count: 'exact', head: true })
            .eq('teacher_id', userProfile.id);
          counts.assignments = !error ? (count ?? 0) : null;
        }
        // Student-specific
        if (userProfile.role === 'STUDENT') {
          const { count, error } = await supabase
            .from('student_enrollments')
            .select('id', { count: 'exact', head: true })
            .eq('student_id', userProfile.id);
          counts.enrollments = !error ? (count ?? 0) : null;
        }

        if (!cancelled) setHomeStats(counts);
      } catch (err) {
        console.warn('Could not load home stats', err);
        if (!cancelled) setHomeStats({});
      }
    }
    loadStats();
    return () => { cancelled = true; };
  }, [userProfile]);

  const [documents, setDocuments] = useState(INITIAL_DOCUMENTS);

  // Workspace Filtered Documents
  const workspaceFilteredDocs = documents.filter(doc => {
    // Active folder filter
    if (activeFolderId !== null) {
      if (doc.folderId !== activeFolderId) return false;
    }

    // Sidebar Category Filter
    if (selectedNav === 'starred') {
      if (!doc.starred) return false;
    } else if (selectedNav === 'trash') {
      if (!doc.isTrash) return false;
    } else {
      if (doc.isTrash) return false;
    }

    // Custom User Filters
    for (const cf of customFilters) {
      if (cf.category === 'class' && doc.class !== cf.value) return false;
      if (cf.category === 'section' && doc.section !== cf.value) return false;
      if (cf.category === 'type' && doc.type !== cf.value) return false;
      
      if (cf.category === 'teaching_staff') {
        if (doc.role !== 'teaching_staff' && !doc.owner.toLowerCase().includes('teacher') && !doc.owner.toLowerCase().includes('prof') && !doc.owner.toLowerCase().includes('instructor')) return false;
        if (cf.value !== 'all_teaching' && !doc.owner.toLowerCase().includes(cf.value.toLowerCase())) return false;
      }
      
      if (cf.category === 'non_teaching_staff') {
        if (doc.role !== 'non_teaching_staff' && !doc.owner.toLowerCase().includes('admin') && !doc.owner.toLowerCase().includes('registrar')) return false;
        if (cf.value !== 'all_non_teaching' && !doc.owner.toLowerCase().includes(cf.value.toLowerCase())) return false;
      }
      
      if (cf.category === 'circulars') {
        const isCirc = doc.title.toLowerCase().includes('circular') || doc.title.toLowerCase().includes('regulation') || doc.title.toLowerCase().includes('syllabus') || doc.folderId === 'folder-4';
        if (!isCirc) return false;
      }
      
      if (cf.category === 'report_cards') {
        const isRep = doc.title.toLowerCase().includes('report') || doc.title.toLowerCase().includes('rubric') || doc.title.toLowerCase().includes('nomenclature');
        if (!isRep) return false;
      }
      
      if (cf.category === 'question_papers') {
        const isQP = doc.title.toLowerCase().includes('exam') || doc.title.toLowerCase().includes('question') || doc.title.toLowerCase().includes('exercise') || doc.title.toLowerCase().includes('guide') || doc.folderId === 'folder-3' || doc.folderId === 'folder-5';
        if (!isQP) return false;
      }
    }

    // Search Query
    if (workspaceSearchQuery && !doc.title.toLowerCase().includes(workspaceSearchQuery.toLowerCase().trim())) {
      return false;
    }
    return true;
  });

  const handleWorkspaceFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    let type = 'pdf';
    if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) {
      type = 'image';
    } else if (['xlsx', 'xls', 'csv'].includes(ext)) {
      type = 'xlsx';
    } else if (['doc', 'docx', 'txt', 'rtf'].includes(ext)) {
      type = 'doc';
    } else if (['mp4', 'mov', 'mkv', 'avi'].includes(ext)) {
      type = 'video';
    } else if (['ts', 'js', 'py', 'ipynb', 'html', 'css', 'cpp', 'java'].includes(ext)) {
      type = 'code';
    } else if (['zip', 'rar', 'tar', 'gz'].includes(ext)) {
      type = 'zip';
    }

    const newDoc = {
      id: Date.now(),
      title: file.name,
      institution: "inst-1",
      year: "2026-2027",
      class: "grade-10",
      subject: "general",
      timeline: "term-1",
      type: type,
      size: file.size > 1024 * 1024 
        ? (file.size / (1024 * 1024)).toFixed(1) + ' MB'
        : (file.size / 1024).toFixed(0) + ' KB',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      activity: `You uploaded • ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      owner: currentUser ? (currentUser.email ? currentUser.email.split('@')[0] : "user") : "me",
      section: "Section A",
      role: "students",
      folderId: activeFolderId,
      previewType: type === 'image' ? 'diagram-preview' : type === 'xlsx' ? 'sheet-preview' : type === 'code' ? 'code-preview' : 'pdf-text'
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('documents').insert([{
          title: newDoc.title,
          institution: newDoc.institution,
          academic_year: newDoc.year,
          class_grade: newDoc.class,
          subject: newDoc.subject,
          timeline: newDoc.timeline,
          file_type: newDoc.type,
          file_size: newDoc.size
        }]).select();

        if (error) {
          console.error("Supabase insert error:", error);
        } else if (data && data[0]) {
          newDoc.id = data[0].id;
        }
      } catch (err) {
        console.warn("Could not insert document to Supabase:", err);
      }
    }

    setDocuments([newDoc, ...documents]);
    showToast(`Uploaded "${newDoc.title}" to Workspace`, "check-circle");
    setShowNewDropdown(false);
    e.target.value = null;
  };

  const handleCreateFolder = (e) => {
    if (e) e.preventDefault();
    if (!newFolderName.trim()) {
      setIsCreatingFolder(false);
      return;
    }

    const newFolder = {
      id: `folder-${Date.now()}`,
      name: newFolderName.trim(),
      path: "in EduVault Drive"
    };

    setFolders([newFolder, ...folders]);
    setNewFolderName("");
    setIsCreatingFolder(false);
    setShowNewDropdown(false);
    showToast(`Created folder "${newFolder.name}"`, "check-circle");
  };

  const handleDeleteDocument = (id, title, e) => {
    if (e) e.stopPropagation();
    setDocuments(documents.filter(doc => doc.id !== id));
    showToast(`Removed "${title}"`, "info");
  };

  const handleRenameSubmit = (e) => {
    e.preventDefault();
    if (renamingDoc && renameInputVal.trim()) {
      setDocuments(documents.map(doc => {
        if (doc.id === renamingDoc.id) {
          return { ...doc, title: renameInputVal.trim() };
        }
        return doc;
      }));
      showToast(`Renamed to "${renameInputVal.trim()}"`, "check-circle");
      setRenamingDoc(null);
    }
  };

  const handleToggleStar = (docId) => {
    setDocuments(documents.map(doc => {
      if (doc.id === docId) {
        const nextStarred = !doc.starred;
        showToast(nextStarred ? `Added "${doc.title}" to Starred` : `Removed "${doc.title}" from Starred`, "check-circle");
        return { ...doc, starred: nextStarred };
      }
      return doc;
    }));
  };

  const handleMakeCopy = (doc) => {
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const copyDoc = {
      ...doc,
      id: Date.now(),
      title: `Copy of ${doc.title}`,
      date: today,
      activity: `You created • ${today.split(',')[0]}`
    };
    setDocuments([copyDoc, ...documents]);
    showToast(`Created "Copy of ${doc.title}"`, "check-circle");
    setActiveMenuDocId(null);
  };

  const handleAddCustomFilter = (e) => {
    if (e) e.preventDefault();
    const def = FILTER_DEFINITIONS[filterCategory];
    const opt = def.options.find(o => o.value === filterVal) || { label: filterVal };
    const newFilter = {
      id: `filter-${Date.now()}`,
      category: filterCategory,
      value: filterVal,
      label: `${def.label}: ${opt.label}`
    };
    setCustomFilters([...customFilters.filter(f => f.category !== filterCategory), newFilter]);
    setShowCreateFilterModal(false);
    showToast(`Applied filter "${newFilter.label}"`, "check-circle");
  };

  const handleRemoveCustomFilter = (id) => {
    setCustomFilters(customFilters.filter(f => f.id !== id));
  };

  const handleDeleteFolder = (folderId, folderName, e) => {
    if (e) e.stopPropagation();
    setFolders(folders.filter(f => f.id !== folderId));
    showToast(`Removed folder "${folderName}"`, "info");
    setActiveMenuFolderId(null);
  };

  const handleRenameFolderSubmit = (e) => {
    e.preventDefault();
    if (!renamingFolder || !renameFolderInputVal.trim()) return;
    setFolders(folders.map(f => f.id === renamingFolder.id ? { ...f, name: renameFolderInputVal.trim() } : f));
    showToast(`Renamed folder to "${renameFolderInputVal.trim()}"`, "check-circle");
    setRenamingFolder(null);
    setRenameFolderInputVal("");
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (!emailInput || !passwordInput) {
      showToast("Please fill in all required fields", "info");
      return;
    }

    if (isSupabaseConfigured && supabase) {
      try {
        if (currentView === "login") {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: emailInput,
            password: passwordInput
          });
          if (error) {
            showToast(error.message, "info");
            return;
          }
          showToast(`Welcome back!`, "check-circle");
        } else {
          showToast("Public registration is disabled. Contact your administrator.", "info");
          return;
        }
      } catch (err) {
        showToast(err.message || "Authentication error", "info");
        return;
      }
    } else {
      showToast("Supabase is not configured.", "info");
      return;
    }
    
    setEmailInput("");
    setPasswordInput("");
    setNameInput("");
    setCurrentView("workspace");
  };

  const handleLogout = () => {
    setShowAccountMenu(false);
    setShowLogoutConfirmModal(true);
  };

  const handleConfirmLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      }
      setCurrentUser(null);
      setUserProfile(null);
      setShowAccountMenu(false);
      setShowLogoutConfirmModal(false);
      setCurrentView("login");
      showToast("Signed out successfully", "info");
    } catch (err) {
      console.error("Sign out error:", err);
      showToast("Unable to sign out cleanly. Please try again.", "error");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const getDocTypeIcon = (type) => {
    switch (type) {
      case 'image':
        return (
          <div className="gdrive-doc-icon-badge img-badge">
            <Image size={15} />
          </div>
        );
      case 'video':
        return (
          <div className="gdrive-doc-icon-badge video-badge">
            <Film size={15} />
          </div>
        );
      case 'zip':
        return (
          <div className="gdrive-doc-icon-badge zip-badge">
            <Archive size={15} />
          </div>
        );
      case 'xlsx':
        return (
          <div className="gdrive-doc-icon-badge sheet-badge">
            <FileSpreadsheet size={15} />
          </div>
        );
      case 'doc':
        return (
          <div className="gdrive-doc-icon-badge doc-badge">
            <FileText size={15} />
          </div>
        );
      case 'code':
        return (
          <div className="gdrive-doc-icon-badge code-badge">
            <FileCode size={15} />
          </div>
        );
      default:
        return (
          <div className="gdrive-doc-icon-badge pdf-badge">
            <FileText size={15} />
          </div>
        );
    }
  };

  const renderCardThumbnail = (doc) => {
    switch (doc.previewType) {
      case 'diagram-preview':
        return (
          <div className="thumb-preview diagram-thumb">
            <div className="diagram-header"><span>BIOLOGY DIAGRAM</span></div>
            <div className="diagram-body">
              <div className="cell-circle"><div className="nucleus"></div></div>
              <div className="diagram-labels"><div className="diag-line"></div><div className="diag-line short"></div></div>
            </div>
          </div>
        );
      case 'code-preview':
        return (
          <div className="thumb-preview ipynb-thumb">
            <div className="code-header"><div className="jupyter-dot"></div><span>Algorithms & Data</span></div>
            <div className="code-box"><code>function binarySearch(arr, t) {'{ ... }'}</code></div>
          </div>
        );
      case 'agreement-preview':
        return (
          <div className="thumb-preview agreement-thumb">
            <div className="doc-page">
              <div className="doc-h1">Safety & Compliance Protocol</div>
              <div className="doc-p"></div><div className="doc-p short"></div><div className="doc-sign-line"></div>
            </div>
          </div>
        );
      case 'sheet-preview':
        return (
          <div className="thumb-preview sheet-thumb">
            <table className="mini-sheet">
              <thead><tr><th>ID</th><th>Student</th><th>Score</th><th>Grade</th></tr></thead>
              <tbody><tr><td>101</td><td>Alice M.</td><td>94%</td><td>A</td></tr><tr><td>102</td><td>Bob K.</td><td>88%</td><td>B+</td></tr></tbody>
            </table>
          </div>
        );
      case 'doc-text':
      case 'pdf-text':
      default:
        return (
          <div className="thumb-preview pdf-doc-thumb">
            <div className="doc-page">
              <div className="doc-h1">{doc.title}</div>
              <div className="doc-p"></div><div className="doc-p short"></div>
              <div className="doc-p"></div><div className="doc-p mini"></div>
            </div>
          </div>
        );
    }
  };

  const getBreadcrumb = () => {
    const instName = filterInst === 'inst-1' ? 'St. Xavier High School' : filterInst === 'inst-2' ? 'Cambridge Global Academy' : 'All Institutions';
    const className = filterClass === 'grade-10' ? 'Grade 10 - A' : filterClass === 'grade-11' ? 'Grade 11 - Science' : filterClass === 'grade-12' ? 'Grade 12 - Commerce' : 'All Classes';
    const subName = filterSubject.charAt(0).toUpperCase() + filterSubject.slice(1);
    const termName = filterTimeline === 'term-1' ? 'Term 1' : filterTimeline === 'term-2' ? 'Term 2' : 'All Terms';
    return `${instName} / ${className} / ${subName} / ${termName}`;
  };

  const getDocIcon = (type) => {
    switch (type) {
      case 'xlsx': return <FileSpreadsheet className="doc-icon" />;
      case 'doc': return <FileCheck className="doc-icon" />;
      default: return <FileText className="doc-icon" />;
    }
  };

  const getToastIcon = (iconName) => {
    switch (iconName) {
      case 'check-circle': return <CheckCircle />;
      case 'shield': return <Shield />;
      default: return <Info />;
    }
  };

  return (
    <div className={`app-root ${currentView === 'workspace' ? 'gdrive-theme' : ''}`}>
      {/* Background glow for all pages */}
      <div className="glow-bg">
        <div className="glow-sphere sphere-1"></div>
        <div className="glow-sphere sphere-2"></div>
        <div className="glow-sphere sphere-3"></div>
      </div>

      {/* Global Header Navigation */}
      <header className={`main-header ${currentView === 'workspace' ? 'gdrive-header' : ''}`}>
        <div className="header-container">
          <div className="logo" style={{ cursor: 'pointer' }} onClick={() => {
            if (currentUser) {
              setCurrentView("workspace");
              setSelectedNav("home");
            } else {
              setCurrentView("home");
            }
          }}>
            <ShieldCheck className="logo-icon" />
            <span className="logo-text">Edu<span>Vault</span></span>
          </div>

          {currentView === "home" && (
            <nav className="nav-links">
              <a href="#how-it-works">How it works</a>
              <a href="#who-we-serve">Who uses it</a>
              <a href="#portals">Institutional Portals</a>
            </nav>
          )}

          <div className="header-actions">
            {/* 3-Mode Icon Theme Switcher */}
            <div className="theme-switcher" role="group" aria-label="Color theme switcher">
              <button
                type="button"
                className={`theme-btn ${appearance === 'light' ? 'active' : ''}`}
                onClick={() => setAppearance('light')}
                aria-label="Switch to Light mode"
                aria-pressed={appearance === 'light'}
                title="Switch to Light mode"
              >
                <Sun size={15} />
              </button>
              <button
                type="button"
                className={`theme-btn ${appearance === 'dark' ? 'active' : ''}`}
                onClick={() => setAppearance('dark')}
                aria-label="Switch to Dark mode"
                aria-pressed={appearance === 'dark'}
                title="Switch to Dark mode"
              >
                <Moon size={15} />
              </button>
              <button
                type="button"
                className={`theme-btn ${appearance === 'amoled' ? 'active' : ''}`}
                onClick={() => setAppearance('amoled')}
                aria-label="Switch to AMOLED mode"
                aria-pressed={appearance === 'amoled'}
                title="Switch to AMOLED mode"
              >
                <CircleDot size={15} />
              </button>
            </div>

            {currentUser ? (
              <div className="user-profile-header" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {currentView === "home" ? (
                  <button className="btn btn-primary btn-sm" onClick={() => setCurrentView("workspace")}>
                    <ArrowRight size={14} />
                    <span>Workspace</span>
                  </button>
                ) : (
                  <button className="btn btn-secondary btn-sm" onClick={() => setCurrentView("home")} title="Public Home Page">
                    <Home size={14} />
                    <span>Public Home</span>
                  </button>
                )}

                {/* Professional Account Control Menu */}
                <div className="account-menu-container" ref={accountMenuRef}>
                  <button 
                    className={`account-menu-trigger ${showAccountMenu ? 'active' : ''}`}
                    onClick={() => setShowAccountMenu(prev => !prev)}
                    aria-expanded={showAccountMenu}
                    aria-haspopup="true"
                    aria-label="Account options"
                  >
                    <div className="account-avatar">
                      {getInitials(userProfile?.full_name || currentUser?.email)}
                    </div>
                    <div className="account-meta">
                      <span className="account-name">
                        {userProfile?.full_name || currentUser?.email?.split('@')[0]}
                      </span>
                      <span className="account-role-badge">
                        {userProfile?.role || 'MEMBER'}
                      </span>
                    </div>
                    <ChevronDown size={14} className={`account-chevron ${showAccountMenu ? 'open' : ''}`} />
                  </button>

                  {showAccountMenu && (
                    <div className="account-dropdown-menu" role="menu">
                      <div className="account-dropdown-header">
                        <div className="account-avatar-lg">
                          {getInitials(userProfile?.full_name || currentUser?.email)}
                        </div>
                        <div className="account-dropdown-user-details">
                          <div className="account-dropdown-fullname">
                            {userProfile?.full_name || 'Academic User'}
                          </div>
                          <div className="account-dropdown-email">
                            {currentUser?.email}
                          </div>
                          <div className="account-dropdown-tags">
                            <span className="role-tag">{userProfile?.role || 'MEMBER'}</span>
                            {institutionName && (
                              <span className="inst-tag" title={institutionName}>{institutionName}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="account-dropdown-divider" />

                      <div className="account-dropdown-section">
                        <div className="account-dropdown-item info-only">
                          <Shield size={15} />
                          <div className="item-text-group">
                            <span className="item-label">Account Scope</span>
                            <span className="item-value">
                              {userProfile?.role === 'ADMIN' ? 'Institutional Administrator' : userProfile?.role === 'TEACHER' ? 'Faculty Staff' : 'Enrolled Student'}
                            </span>
                          </div>
                        </div>
                        <div className="account-dropdown-item info-only">
                          <School size={15} />
                          <div className="item-text-group">
                            <span className="item-label">Institution Scope</span>
                            <span className="item-value">
                              {institutionName || userProfile?.institution_id || 'EduVault Primary'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="account-dropdown-divider" />

                      <div className="account-dropdown-footer">
                        <button 
                          className="account-signout-btn" 
                          onClick={() => {
                            setShowAccountMenu(false);
                            setShowLogoutConfirmModal(true);
                          }}
                          role="menuitem"
                        >
                          <LogOut size={15} />
                          <span>Sign out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                {(currentView === "home" || currentView === "workspace") ? (
                  <>
                    <button className="btn btn-secondary" onClick={() => { setCurrentView("login"); setEmailInput(""); }}>
                      <LogIn size={16} />
                      <span>Log In</span>
                    </button>
                    <button className="btn btn-primary" onClick={() => setCurrentView("signup")}>
                      <UserPlus size={16} />
                      <span>Sign Up</span>
                    </button>
                  </>
                ) : (
                  <button className="btn btn-secondary" onClick={() => setCurrentView("home")}>
                    <ArrowLeft size={16} />
                    <span>Back to Home</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      <main className="main-content">
        {currentView === "home" ? (
          <div className="ev-landing-page">
            {/* Hero Section */}
            <section className="ev-hero-section">
              <div className="container ev-hero-container">
                <div className="ev-hero-badge">The Standard for Academic Security</div>
                <h1 className="ev-hero-title">Your institution's academic knowledge, organized.</h1>
                <p className="ev-hero-subtitle">
                  A secure academic workspace for schools and universities to organize learning materials, manage access, and make knowledge available to the right people at the right time.
                </p>
                
                <div className="ev-hero-buttons">
                  <button className="btn btn-primary btn-lg" onClick={() => { 
                    if (currentUser) {
                      setCurrentView("workspace");
                    } else {
                      setCurrentView("login"); 
                      setEmailInput(""); 
                    }
                  }}>
                    <span>Enter EduVault</span>
                    <ArrowRight size={18} />
                  </button>
                  <a href="#how-it-works" className="btn btn-secondary btn-lg" style={{textDecoration: 'none'}}>
                    <span>Learn how it works</span>
                  </a>
                </div>
              </div>
            </section>

            {/* How It Works Section */}
            <section id="how-it-works" className="ev-concept-section">
              <div className="container">
                <div className="ev-section-header">
                  <h2>The EduVault Workflow</h2>
                  <p>A secure lifecycle from institutional creation to student access.</p>
                </div>
                
                <div className="ev-workflow-steps">
                  <div className="ev-step">
                    <div className="ev-step-icon"><School size={32} /></div>
                    <h4>Institution</h4>
                    <p>Defines academic structure</p>
                  </div>
                  <div className="ev-step-arrow"><ArrowRight size={24} /></div>
                  <div className="ev-step">
                    <div className="ev-step-icon"><FileText size={32} /></div>
                    <h4>Teachers</h4>
                    <p>Prepare material (Locked)</p>
                  </div>
                  <div className="ev-step-arrow"><ArrowRight size={24} /></div>
                  <div className="ev-step">
                    <div className="ev-step-icon" style={{color: 'var(--ev-locked)'}}><Lock size={32} /></div>
                    <h4>Unlock</h4>
                    <p>Teacher releases material</p>
                  </div>
                  <div className="ev-step-arrow"><ArrowRight size={24} /></div>
                  <div className="ev-step">
                    <div className="ev-step-icon"><Users size={32} /></div>
                    <h4>Students</h4>
                    <p>Access published material</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Users Section */}
            <section id="who-we-serve" className="ev-users-section">
              <div className="container">
                <div className="ev-section-header">
                  <h2>Built for the Academic Community</h2>
                </div>
                <div className="ev-users-grid">
                  <div className="ev-user-card">
                    <div className="ev-user-icon-wrap"><Users size={32} /></div>
                    <h3>Students</h3>
                    <p>Find the academic materials relevant to your enrolled subjects seamlessly, all in one central location.</p>
                  </div>
                  <div className="ev-user-card">
                    <div className="ev-user-icon-wrap"><BookOpen size={32} /></div>
                    <h3>Teachers</h3>
                    <p>Prepare, organize, and tightly control exactly when materials become available to your classes.</p>
                  </div>
                  <div className="ev-user-card">
                    <div className="ev-user-icon-wrap"><Shield size={32} /></div>
                    <h3>Institutions</h3>
                    <p>Manage academic structure, people, documents, and institutional communication securely.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Institution Portal Concept */}
            <section id="portals" className="ev-portal-section">
              <div className="container">
                <div className="ev-portal-content">
                  <h2>Your Academic Portal</h2>
                  <p>
                    Participating institutions receive their own dedicated, secure EduVault portal (e.g. <strong>schoolname.eduvault.in</strong>) to unify all digital academic operations.
                  </p>
                  <button className="btn btn-secondary btn-lg ev-portal-btn" onClick={() => setCurrentView("signup")}>
                    <School size={18} />
                    <span>Register your Institution</span>
                  </button>
                </div>
              </div>
            </section>
          </div>
        ) : currentView === "workspace" ? (
          isAuthLoading ? (
            <div className="auth-loading-state" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--ev-text)' }}>
              <h2>Loading Workspace...</h2>
            </div>
          ) : (!currentUser || !userProfile) ? (
            <div className="auth-error-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh', color: 'var(--ev-text)' }}>
              <h2>Access Denied</h2>
              <p>You must log in to access the workspace.</p>
              <br/>
              <button className="btn btn-primary" onClick={() => setCurrentView('login')}>Go to Login</button>
            </div>
          ) : (
          /* ==========================================================================
             EDUVAULT ACADEMIC WORKSPACE
             ========================================================================== */
          <div className="gdrive-layout">
            {/* Left Sidebar */}
            <aside className="gdrive-sidebar">
              {/* User Identity Block */}
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--ev-divider)', marginBottom: '8px' }}>
                <div style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--ev-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {userProfile?.full_name || currentUser?.email?.split('@')[0] || 'User'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--ev-text-secondary)', marginTop: '2px' }}>
                  {userProfile?.role}
                  {userProfile?.institution_id && (
                    <span style={{ marginLeft: '6px', opacity: 0.7 }}>· {userProfile.institution_id.slice(0, 8)}…</span>
                  )}
                </div>
              </div>

              {/* + New Button with Dropdown */}
              <div className="gdrive-new-wrapper" ref={newDropdownRef}>
                <button 
                  className="gdrive-new-btn" 
                  onClick={() => setShowNewDropdown(!showNewDropdown)}
                >
                  <Plus size={22} className="gdrive-plus-icon" />
                  <span>New</span>
                </button>

                {showNewDropdown && (
                  <div className="gdrive-new-dropdown">
                    <button 
                      className="dropdown-item" 
                      onClick={() => {
                        setIsCreatingFolder(true);
                        setNewFolderName("Untitled folder");
                        setShowNewDropdown(false);
                        setSuggestedFoldersOpen(true);
                        setSelectedNav('my-vault');
                      }}
                    >
                      <Folder size={18} />
                      <span>New folder</span>
                    </button>
                    <div className="dropdown-divider"></div>
                    <button 
                      className="dropdown-item" 
                      onClick={() => workspaceFileInputRef.current.click()}
                    >
                      <UploadCloud size={18} />
                      <span>Upload material</span>
                    </button>
                  </div>
                )}

                <input 
                  type="file" 
                  ref={workspaceFileInputRef} 
                  style={{ display: 'none' }} 
                  onChange={handleWorkspaceFileUpload}
                />
              </div>

              {/* Primary Academic Navigation */}
              <nav className="gdrive-nav-list">
                <button 
                  className={`gdrive-nav-item ${selectedNav === 'home' && activeFolderId === null ? 'active' : ''}`}
                  onClick={() => { setSelectedNav('home'); setActiveFolderId(null); }}
                >
                  <Home size={18} />
                  <span>Home</span>
                </button>

                {userProfile?.role === 'ADMIN' && (
                  <>
                    <button 
                      className={`gdrive-nav-item ${selectedNav === 'admin-academic' ? 'active' : ''}`}
                      onClick={() => { setSelectedNav('admin-academic'); setActiveFolderId(null); }}
                    >
                      <Settings size={18} />
                      <span>Academic Setup</span>
                    </button>

                    <button 
                      className={`gdrive-nav-item ${selectedNav === 'admin-people' ? 'active' : ''}`}
                      onClick={() => { setSelectedNav('admin-people'); setActiveFolderId(null); }}
                    >
                      <Users size={18} />
                      <span>People</span>
                    </button>

                    <button 
                      className={`gdrive-nav-item ${selectedNav === 'admin-import' ? 'active' : ''}`}
                      onClick={() => { setSelectedNav('admin-import'); setActiveFolderId(null); }}
                    >
                      <UploadCloud size={18} />
                      <span>Data Import</span>
                    </button>
                  </>
                )}

                <button 
                  className={`gdrive-nav-item ${selectedNav === 'classes' ? 'active' : ''}`}
                  onClick={() => { setSelectedNav('classes'); setActiveFolderId(null); }}
                >
                  <School size={18} />
                  <span>My Subjects</span>
                </button>

                <button 
                  className={`gdrive-nav-item ${selectedNav === 'my-vault' ? 'active' : ''}`}
                  onClick={() => { setSelectedNav('my-vault'); setActiveFolderId(null); }}
                >
                  <HardDrive size={18} />
                  <span>Materials</span>
                </button>

                <button 
                  className={`gdrive-nav-item ${selectedNav === 'notices' ? 'active' : ''}`}
                  onClick={() => { setSelectedNav('notices'); setActiveFolderId(null); }}
                >
                  <Bell size={18} />
                  <span>Notices</span>
                </button>

                {/* Legacy Drive items — collapsed, not primary */}
                <div className="gdrive-nav-divider" style={{ margin: '12px 0 8px' }}></div>
                <button
                  className="gdrive-nav-item"
                  style={{ opacity: 0.5, fontSize: '0.8rem' }}
                  onClick={() => setShowLegacyNav(v => !v)}
                  title="Legacy prototype features (not academic)"
                >
                  <Archive size={16} />
                  <span>{showLegacyNav ? 'Hide legacy' : 'Legacy features'}</span>
                  <ChevronDown size={14} style={{ marginLeft: 'auto', transform: showLegacyNav ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>

                {showLegacyNav && (
                  <div style={{ opacity: 0.55 }}>
                    <button 
                      className={`gdrive-nav-item ${selectedNav === 'shared' ? 'active' : ''}`}
                      onClick={() => { setSelectedNav('shared'); setActiveFolderId(null); }}
                    >
                      <Users size={16} />
                      <span>Shared with me</span>
                    </button>
                    <button 
                      className={`gdrive-nav-item ${selectedNav === 'recent' ? 'active' : ''}`}
                      onClick={() => { setSelectedNav('recent'); setActiveFolderId(null); }}
                    >
                      <Clock size={16} />
                      <span>Recent</span>
                    </button>
                    <button 
                      className={`gdrive-nav-item ${selectedNav === 'starred' ? 'active' : ''}`}
                      onClick={() => { setSelectedNav('starred'); setActiveFolderId(null); }}
                    >
                      <Star size={16} />
                      <span>Starred</span>
                    </button>
                    <button 
                      className={`gdrive-nav-item ${selectedNav === 'trash' ? 'active' : ''}`}
                      onClick={() => { setSelectedNav('trash'); setActiveFolderId(null); }}
                    >
                      <Trash2 size={16} />
                      <span>Trash</span>
                    </button>
                    <button 
                      className={`gdrive-nav-item ${selectedNav === 'storage' ? 'active' : ''}`}
                      onClick={() => { setSelectedNav('storage'); setActiveFolderId(null); }}
                    >
                      <Cloud size={16} />
                      <span>Storage</span>
                    </button>
                  </div>
                )}
              </nav>
            </aside>

            {/* Main Content Area */}
          <main className="gdrive-main-pane">
              {/* Workspace Top Search & Filter Bar */}
              <div className="gdrive-top-bar" style={{ padding: '12px 24px', backgroundColor: 'transparent', borderBottom: '1px solid var(--ev-divider)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ flex: 1, maxWidth: '720px' }}>
                  <GlobalSearch userProfile={userProfile} onNavigate={() => {}} />
                </div>
              </div>

              {/* Custom Filter Toolbar — only shown on legacy Drive views */}
              {['shared','recent','starred','trash','storage','my-vault'].includes(selectedNav) && (
                <div className="gdrive-filter-chips">
                  <button 
                    className="create-filter-btn"
                    onClick={() => {
                      setFilterCategory("class");
                      setFilterVal("grade-10");
                      setShowCreateFilterModal(true);
                    }}
                  >
                    <Filter size={14} />
                    <span>+ Create filter</span>
                  </button>

                  {customFilters.map(cf => (
                    <div key={cf.id} className="active-custom-chip">
                      <span>{cf.label}</span>
                      <button 
                        className="chip-remove-btn"
                        onClick={() => handleRemoveCustomFilter(cf.id)}
                        title="Remove filter"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}

                  {customFilters.length > 0 && (
                    <button 
                      className="clear-all-chips"
                      onClick={() => {
                        setCustomFilters([]);
                        showToast("Cleared all custom filters", "info");
                      }}
                    >
                      Clear all
                    </button>
                  )}
                </div>
              )}

              {/* Main Content White Board / Canvas */}
              {selectedNav === 'admin-academic' ? (
                <div className="gdrive-content-canvas" style={{ padding: 0, overflow: 'hidden' }}>
                  <AdminAcademicManager userProfile={userProfile} />
                </div>
              ) : selectedNav === 'admin-people' ? (
                <div className="gdrive-content-canvas" style={{ padding: '32px 40px', overflowY: 'auto' }}>
                  <AdminPeopleHub userProfile={userProfile} />
                </div>
              ) : selectedNav === 'admin-import' ? (
                <div className="gdrive-content-canvas" style={{ padding: '32px 40px', overflowY: 'auto' }}>
                  <AdminDataMigration userProfile={userProfile} onNavigate={setSelectedNav} />
                </div>
              ) : selectedNav === 'classes' && (userProfile?.role === 'TEACHER' || userProfile?.role === 'STUDENT') ? (
                <div className="gdrive-content-canvas" style={{ padding: 0, overflow: 'hidden' }}>
                  <MySubjects userProfile={userProfile} activeSubject={activeSubject} setActiveSubject={setActiveSubject} />
                </div>
              ) : selectedNav === 'classes' && userProfile?.role === 'ADMIN' ? (
                <div className="gdrive-content-canvas" style={{ padding: '40px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', textAlign: 'center', gap: '16px' }}>
                    <School size={48} style={{ color: 'var(--ev-text-secondary)', opacity: 0.4 }} />
                    <h2 style={{ color: 'var(--ev-text)', fontSize: '1.3rem', fontWeight: 600 }}>My Subjects</h2>
                    <p style={{ color: 'var(--ev-text-secondary)', maxWidth: '400px', lineHeight: 1.6 }}>
                      As an administrator, you manage subjects through <strong>Academic Setup</strong>. Teachers and students see their assigned subjects here.
                    </p>
                    <button className="btn btn-secondary" onClick={() => setSelectedNav('admin-academic')}>
                      <Settings size={16} /> <span>Go to Academic Setup</span>
                    </button>
                  </div>
                </div>
              ) : selectedNav === 'notices' ? (
                <div className="gdrive-content-canvas" style={{ padding: 0, overflow: 'hidden' }}>
                  <Notices userProfile={userProfile} />
                </div>
              ) : selectedNav === 'home' ? (
                <div className="gdrive-content-canvas" style={{ padding: '40px', overflowY: 'auto' }}>
                  {/* Role-aware greeting */}
                  <h1 style={{ marginBottom: '4px', fontSize: '1.75rem', fontWeight: 700, color: 'var(--ev-text)' }}>
                    Welcome back, {userProfile?.full_name?.split(' ')[0] || 'there'}
                  </h1>
                  <p style={{ color: 'var(--ev-text-secondary)', marginBottom: '8px', fontSize: '0.95rem' }}>
                    {institutionName
                      ? <><strong style={{ color: 'var(--ev-text)' }}>{institutionName}</strong> &mdash; {userProfile?.role}</>
                      : <span style={{ fontStyle: 'italic' }}>Institution loading&hellip;</span>}
                  </p>

                  {/* Real summary stats — ADMIN only; only rendered when data is available */}
                  {userProfile?.role === 'ADMIN' && homeStats && (
                    <div style={{
                      display: 'flex', flexWrap: 'wrap', gap: '12px',
                      marginBottom: '36px', marginTop: '20px'
                    }}>
                      {[
                        { label: 'Academic Years', value: homeStats.years,    nav: 'admin-academic' },
                        { label: 'Programs',        value: homeStats.programs, nav: 'admin-academic' },
                        { label: 'Subjects',         value: homeStats.subjects, nav: 'admin-academic' },
                        { label: 'Documents',        value: homeStats.docs,    nav: 'my-vault' },
                        { label: 'Notices',          value: homeStats.notices, nav: 'notices' },
                      ].map(({ label, value, nav }) => (
                        <div
                          key={label}
                          onClick={() => setSelectedNav(nav)}
                          style={{
                            cursor: 'pointer',
                            padding: '14px 20px',
                            borderRadius: '10px',
                            border: '1px solid var(--ev-border)',
                            background: 'var(--ev-surface-elevated)',
                            minWidth: '110px',
                            transition: 'border-color 0.2s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--ev-primary)'}
                          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--ev-border)'}
                        >
                          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--ev-text)', lineHeight: 1 }}>
                            {value === null ? '—' : value}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--ev-text-secondary)', marginTop: '4px' }}>
                            {label}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Teacher stats */}
                  {userProfile?.role === 'TEACHER' && homeStats && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '36px', marginTop: '20px' }}>
                      {[
                        { label: 'Assigned Subjects', value: homeStats.assignments, nav: 'classes' },
                        { label: 'Documents',          value: homeStats.docs,        nav: 'my-vault' },
                        { label: 'Notices',            value: homeStats.notices,     nav: 'notices' },
                      ].map(({ label, value, nav }) => (
                        <div key={label} onClick={() => setSelectedNav(nav)}
                          style={{ cursor: 'pointer', padding: '14px 20px', borderRadius: '10px', border: '1px solid var(--ev-border)', background: 'var(--ev-surface-elevated)', minWidth: '110px', transition: 'border-color 0.2s' }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--ev-primary)'}
                          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--ev-border)'}
                        >
                          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--ev-text)', lineHeight: 1 }}>{value === null ? '—' : value}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--ev-text-secondary)', marginTop: '4px' }}>{label}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Student stats */}
                  {userProfile?.role === 'STUDENT' && homeStats && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '36px', marginTop: '20px' }}>
                      {[
                        { label: 'Enrolled Subjects', value: homeStats.enrollments, nav: 'classes' },
                        { label: 'Documents',          value: homeStats.docs,        nav: 'my-vault' },
                        { label: 'Notices',            value: homeStats.notices,     nav: 'notices' },
                      ].map(({ label, value, nav }) => (
                        <div key={label} onClick={() => setSelectedNav(nav)}
                          style={{ cursor: 'pointer', padding: '14px 20px', borderRadius: '10px', border: '1px solid var(--ev-border)', background: 'var(--ev-surface-elevated)', minWidth: '110px', transition: 'border-color 0.2s' }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--ev-primary)'}
                          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--ev-border)'}
                        >
                          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--ev-text)', lineHeight: 1 }}>{value === null ? '—' : value}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--ev-text-secondary)', marginTop: '4px' }}>{label}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Empty-state guidance for fresh Admin installation */}
                  {userProfile?.role === 'ADMIN' && homeStats && homeStats.years === 0 && (
                    <div style={{
                      padding: '20px 24px',
                      borderRadius: '10px',
                      border: '1px dashed var(--ev-border)',
                      background: 'var(--ev-surface)',
                      marginBottom: '32px',
                      maxWidth: '560px'
                    }}>
                      <p style={{ margin: 0, color: 'var(--ev-text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                        <strong style={{ color: 'var(--ev-text)' }}>Getting started:</strong> No academic years have been configured yet.
                        Begin by setting up your Academic Setup &mdash; add an academic year, programs, terms, and subjects.
                      </p>
                      <button
                        className="btn btn-primary"
                        style={{ marginTop: '14px', fontSize: '0.875rem' }}
                        onClick={() => setSelectedNav('admin-academic')}
                      >
                        <Settings size={15} /> <span>Set up Academic Setup</span>
                      </button>
                    </div>
                  )}

                  {/* Quick-action nav cards */}
                  <div style={{
                    display: 'grid',
                    gap: '16px',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                    maxWidth: '900px'
                  }}>
                    {userProfile?.role === 'ADMIN' && (
                      <>
                        <div
                          onClick={() => setSelectedNav('admin-academic')}
                          style={{ cursor: 'pointer', padding: '22px', border: '1px solid var(--ev-border)', borderRadius: '12px', background: 'var(--ev-surface-elevated)', transition: 'border-color 0.2s' }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--ev-primary)'}
                          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--ev-border)'}
                        >
                          <Settings size={22} style={{ color: 'var(--ev-primary)', marginBottom: '12px' }} />
                          <h3 style={{ fontSize: '1rem', marginBottom: '6px', color: 'var(--ev-text)', fontWeight: 600 }}>Academic Setup</h3>
                          <p style={{ color: 'var(--ev-text-secondary)', fontSize: '0.85rem', lineHeight: 1.55, margin: 0 }}>
                            Manage years, programs, terms, and subjects.
                          </p>
                        </div>

                        <div
                          onClick={() => setSelectedNav('admin-people')}
                          style={{ cursor: 'pointer', padding: '22px', border: '1px solid var(--ev-border)', borderRadius: '12px', background: 'var(--ev-surface-elevated)', transition: 'border-color 0.2s' }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--ev-primary)'}
                          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--ev-border)'}
                        >
                          <Users size={22} style={{ color: 'var(--ev-primary)', marginBottom: '12px' }} />
                          <h3 style={{ fontSize: '1rem', marginBottom: '6px', color: 'var(--ev-text)', fontWeight: 600 }}>People & Allocations</h3>
                          <p style={{ color: 'var(--ev-text-secondary)', fontSize: '0.85rem', lineHeight: 1.55, margin: 0 }}>
                            Manage teachers, students, assignments, and enrollments.
                          </p>
                        </div>

                        <div
                          onClick={() => setSelectedNav('admin-import')}
                          style={{ cursor: 'pointer', padding: '22px', border: '1px solid var(--ev-border)', borderRadius: '12px', background: 'var(--ev-surface-elevated)', transition: 'border-color 0.2s' }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--ev-primary)'}
                          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--ev-border)'}
                        >
                          <UploadCloud size={22} style={{ color: 'var(--ev-primary)', marginBottom: '12px' }} />
                          <h3 style={{ fontSize: '1rem', marginBottom: '6px', color: 'var(--ev-text)', fontWeight: 600 }}>Data Import</h3>
                          <p style={{ color: 'var(--ev-text-secondary)', fontSize: '0.85rem', lineHeight: 1.55, margin: 0 }}>
                            Ingest curriculum spreadsheets, departments, and course rosters.
                          </p>
                        </div>
                      </>
                    )}

                    <div
                      onClick={() => setSelectedNav('classes')}
                      style={{ cursor: 'pointer', padding: '22px', border: '1px solid var(--ev-border)', borderRadius: '12px', background: 'var(--ev-surface-elevated)', transition: 'border-color 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--ev-primary)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--ev-border)'}
                    >
                      <School size={22} style={{ color: 'var(--ev-primary)', marginBottom: '12px' }} />
                      <h3 style={{ fontSize: '1rem', marginBottom: '6px', color: 'var(--ev-text)', fontWeight: 600 }}>My Subjects</h3>
                      <p style={{ color: 'var(--ev-text-secondary)', fontSize: '0.85rem', lineHeight: 1.55, margin: 0 }}>
                        {userProfile?.role === 'ADMIN'
                          ? 'Overview of subjects in your institution.'
                          : userProfile?.role === 'TEACHER'
                          ? 'Your assigned subjects and their materials.'
                          : 'Your enrolled subjects and available materials.'}
                      </p>
                    </div>

                    <div
                      onClick={() => setSelectedNav('my-vault')}
                      style={{ cursor: 'pointer', padding: '22px', border: '1px solid var(--ev-border)', borderRadius: '12px', background: 'var(--ev-surface-elevated)', transition: 'border-color 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--ev-teal)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--ev-border)'}
                    >
                      <HardDrive size={22} style={{ color: 'var(--ev-teal)', marginBottom: '12px' }} />
                      <h3 style={{ fontSize: '1rem', marginBottom: '6px', color: 'var(--ev-text)', fontWeight: 600 }}>Materials</h3>
                      <p style={{ color: 'var(--ev-text-secondary)', fontSize: '0.85rem', lineHeight: 1.55, margin: 0 }}>
                        {homeStats?.docs === 0
                          ? 'No materials uploaded yet. Upload your first document.'
                          : 'Browse, upload, and manage academic documents.'}
                      </p>
                    </div>

                    <div
                      onClick={() => setSelectedNav('notices')}
                      style={{ cursor: 'pointer', padding: '22px', border: '1px solid var(--ev-border)', borderRadius: '12px', background: 'var(--ev-surface-elevated)', transition: 'border-color 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--ev-primary)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--ev-border)'}
                    >
                      <Bell size={22} style={{ color: 'var(--ev-primary)', marginBottom: '12px' }} />
                      <h3 style={{ fontSize: '1rem', marginBottom: '6px', color: 'var(--ev-text)', fontWeight: 600 }}>Notices</h3>
                      <p style={{ color: 'var(--ev-text-secondary)', fontSize: '0.85rem', lineHeight: 1.55, margin: 0 }}>
                        {homeStats?.notices === 0
                          ? 'No notices posted yet.'
                          : 'View and manage institutional notices.'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
              <div className="gdrive-content-canvas">
                {/* Canvas Header */}
                <div className="gdrive-canvas-header">
                  <div className="canvas-title-wrapper">
                    {activeFolderId ? (
                      <div className="folder-navigation-header">
                        <button 
                          className="folder-back-btn" 
                          onClick={() => setActiveFolderId(null)}
                          title="Go back to all folders"
                        >
                          <ArrowLeft size={18} />
                          <span>Back</span>
                        </button>
                        <div className="folder-breadcrumbs">
                          <span className="crumb-link" onClick={() => setActiveFolderId(null)}>EduVault Drive</span>
                          <ChevronRight size={16} className="crumb-sep" />
                          <span className="crumb-active">{folders.find(f => f.id === activeFolderId)?.name || 'Folder'}</span>
                        </div>
                      </div>
                    ) : (
                      <h1 className="gdrive-title">Welcome to EduVault Drive</h1>
                    )}
                  </div>
                  <button className="gdrive-info-btn" title="View details" onClick={() => showToast("EduVault Academic Workspace v2.4", "info")}>
                    <Info size={18} />
                  </button>
                </div>

                {/* Section 1: Suggested Folders */}
                {activeFolderId === null && (
                  <div className="gdrive-section">
                    <div 
                      className="gdrive-section-title"
                      onClick={() => setSuggestedFoldersOpen(!suggestedFoldersOpen)}
                    >
                      {suggestedFoldersOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      <span>Suggested folders</span>
                    </div>

                    {suggestedFoldersOpen && (
                      <div className="gdrive-folders-grid">
                        {isCreatingFolder && (
                          <div className="gdrive-folder-card inline-create-folder-card" onClick={(e) => e.stopPropagation()}>
                            <div className="folder-icon-circle creating-icon">
                              <Folder size={18} />
                            </div>
                            <form className="inline-folder-form" onSubmit={handleCreateFolder}>
                              <input 
                                ref={inlineFolderInputRef}
                                type="text" 
                                className="inline-folder-input"
                                placeholder="Folder name"
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Escape') {
                                    setIsCreatingFolder(false);
                                    setNewFolderName("");
                                  }
                                }}
                              />
                              <div className="inline-folder-actions">
                                <button type="submit" className="inline-action-btn check-btn" title="Create folder">
                                  <Check size={14} />
                                </button>
                                <button 
                                  type="button" 
                                  className="inline-action-btn cancel-btn" 
                                  title="Cancel"
                                  onClick={() => {
                                    setIsCreatingFolder(false);
                                    setNewFolderName("");
                                  }}
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            </form>
                          </div>
                        )}

                        {folders.map(folder => (
                          <div 
                            key={folder.id} 
                            className="gdrive-folder-card"
                            onClick={() => setActiveFolderId(folder.id)}
                          >
                            <div className="folder-icon-circle">
                              <Folder size={18} />
                            </div>
                            <div className="folder-text-meta">
                              <div className="folder-main-title" title={folder.name}>{folder.name}</div>
                              <div className="folder-sub-path">{folder.path || 'in EduVault Drive'}</div>
                            </div>
                            
                            {/* Folder 3-dots Menu */}
                            <div className="folder-menu-wrapper" onClick={(e) => e.stopPropagation()}>
                              <button 
                                className="folder-more-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuFolderId(activeMenuFolderId === folder.id ? null : folder.id);
                                }}
                                title="Folder options"
                              >
                                <MoreVertical size={16} />
                              </button>

                              {activeMenuFolderId === folder.id && (
                                <div className="card-context-menu gdrive-ref-menu">
                                  {/* Row 1: Download */}
                                  <button 
                                    className="context-menu-item"
                                    onClick={() => {
                                      showToast(`Downloading folder "${folder.name}.zip"`, "check-circle");
                                      setActiveMenuFolderId(null);
                                    }}
                                  >
                                    <div className="item-icon-box">
                                      <Download size={16} />
                                    </div>
                                    <span className="item-label">Download</span>
                                  </button>

                                  {/* Row 2: Rename */}
                                  <button 
                                    className="context-menu-item"
                                    onClick={() => {
                                      setRenamingFolder(folder);
                                      setRenameFolderInputVal(folder.name);
                                      setActiveMenuFolderId(null);
                                    }}
                                  >
                                    <div className="item-icon-box">
                                      <Pencil size={16} />
                                    </div>
                                    <span className="item-label">Rename</span>
                                    <span className="item-shortcut-tag">⌥⌘E</span>
                                  </button>

                                  <div className="context-menu-divider"></div>

                                  {/* Row 3: Share */}
                                  <button 
                                    className="context-menu-item"
                                    onClick={() => {
                                      setSharingFolder(folder);
                                      setActiveMenuFolderId(null);
                                    }}
                                  >
                                    <div className="item-icon-box">
                                      <UserPlus size={16} />
                                    </div>
                                    <span className="item-label">Share</span>
                                    <ChevronRight size={14} className="item-chevron-right" />
                                  </button>

                                  {/* Row 4: Folder information */}
                                  <button 
                                    className="context-menu-item"
                                    onClick={() => {
                                      const count = documents.filter(d => d.folderId === folder.id).length;
                                      showToast(`Folder "${folder.name}" contains ${count} document${count === 1 ? '' : 's'}`, "info");
                                      setActiveMenuFolderId(null);
                                    }}
                                  >
                                    <div className="item-icon-box">
                                      <Info size={16} />
                                    </div>
                                    <span className="item-label">Folder information</span>
                                    <ChevronRight size={14} className="item-chevron-right" />
                                  </button>

                                  <div className="context-menu-divider"></div>

                                  {/* Row 5: Move to trash */}
                                  <button 
                                    className="context-menu-item"
                                    onClick={(e) => {
                                      handleDeleteFolder(folder.id, folder.name, e);
                                    }}
                                  >
                                    <div className="item-icon-box">
                                      <Trash2 size={16} />
                                    </div>
                                    <span className="item-label">Move to trash</span>
                                    <span className="item-shortcut-tag">Delete</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Section 2: Suggested Files */}
                <div className="gdrive-section">
                  <div className="gdrive-files-section-header">
                    <div 
                      className="gdrive-section-title"
                      onClick={() => setSuggestedFilesOpen(!suggestedFilesOpen)}
                    >
                      {suggestedFilesOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      <span>Suggested files</span>
                    </div>

                    {/* View Switcher (List vs Grid) */}
                    <div className="gdrive-view-toggle-pill">
                      <button 
                        className={`toggle-btn ${workspaceViewMode === 'list' ? 'active' : ''}`}
                        onClick={() => setWorkspaceViewMode('list')}
                        title="List view"
                      >
                        <List size={16} />
                      </button>
                      <button 
                        className={`toggle-btn ${workspaceViewMode === 'grid' ? 'active' : ''}`}
                        onClick={() => setWorkspaceViewMode('grid')}
                        title="Grid view"
                      >
                        <LayoutGrid size={16} />
                      </button>
                    </div>
                  </div>

                  {suggestedFilesOpen && (
                    <>
                      {workspaceViewMode === 'grid' ? (
                        <div className="gdrive-files-card-grid">
                          {workspaceFilteredDocs.length === 0 ? (
                            <div className="empty-files-box">
                              <FolderOpen size={48} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
                              <p>No documents match your search or filter criteria.</p>
                            </div>
                          ) : (
                            workspaceFilteredDocs.map(doc => (
                              <div 
                                key={doc.id} 
                                className="gdrive-file-card"
                                onClick={() => setSelectedFileForPreview(doc)}
                              >
                                {/* Card Header */}
                                <div className="card-top-bar">
                                  <div className="card-title-group">
                                    {getDocTypeIcon(doc.type)}
                                    <span className="card-file-title" title={doc.title}>{doc.title}</span>
                                  </div>
                                  
                                  {/* 3-dots Menu with Dropdown Options */}
                                  <div className="card-menu-wrapper" onClick={(e) => e.stopPropagation()}>
                                    <button 
                                      className="card-more-btn"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveMenuDocId(activeMenuDocId === doc.id ? null : doc.id);
                                      }}
                                      title="More actions"
                                    >
                                      <MoreVertical size={16} />
                                    </button>

                                    {activeMenuDocId === doc.id && (
                                      <div className="card-context-menu gdrive-ref-menu">
                                        {/* Row 1: Open with */}
                                        <button 
                                          className="context-menu-item top-open-item"
                                          onClick={() => {
                                            setSelectedFileForPreview(doc);
                                            setActiveMenuDocId(null);
                                          }}
                                        >
                                          <div className="item-icon-box">
                                            <ExternalLink size={16} />
                                          </div>
                                          <span className="item-label">Open with</span>
                                          <ChevronRight size={14} className="item-chevron-right" />
                                        </button>

                                        <div className="context-menu-divider"></div>

                                        {/* Star / Unstar */}
                                        <button 
                                          className="context-menu-item"
                                          onClick={() => {
                                            handleToggleStar(doc.id);
                                            setActiveMenuDocId(null);
                                          }}
                                        >
                                          <div className="item-icon-box">
                                            <Star size={16} fill={doc.starred ? "currentColor" : "none"} />
                                          </div>
                                          <span className="item-label">{doc.starred ? "Remove from Starred" : "Add to Starred"}</span>
                                        </button>

                                        {/* Row 2: Download */}
                                        <button 
                                          className="context-menu-item"
                                          onClick={() => {
                                            showToast(`Downloading "${doc.title}"`, "check-circle");
                                            setActiveMenuDocId(null);
                                          }}
                                        >
                                          <div className="item-icon-box">
                                            <Download size={16} />
                                          </div>
                                          <span className="item-label">Download</span>
                                        </button>

                                        {/* Row 3: Rename */}
                                        <button 
                                          className="context-menu-item"
                                          onClick={() => {
                                            setRenamingDoc(doc);
                                            setRenameInputVal(doc.title);
                                            setActiveMenuDocId(null);
                                          }}
                                        >
                                          <div className="item-icon-box">
                                            <Pencil size={16} />
                                          </div>
                                          <span className="item-label">Rename</span>
                                          <span className="item-shortcut-tag">⌥⌘E</span>
                                        </button>

                                        {/* Row 4: Make a copy */}
                                        <button 
                                          className="context-menu-item"
                                          onClick={() => handleMakeCopy(doc)}
                                        >
                                          <div className="item-icon-box">
                                            <Copy size={16} />
                                          </div>
                                          <span className="item-label">Make a copy</span>
                                          <span className="item-shortcut-tag">⌘C ⌘V</span>
                                        </button>

                                        <div className="context-menu-divider"></div>

                                        {/* Row 5: Share */}
                                        <button 
                                          className="context-menu-item"
                                          onClick={() => {
                                            setSharingDoc(doc);
                                            setActiveMenuDocId(null);
                                          }}
                                        >
                                          <div className="item-icon-box">
                                            <UserPlus size={16} />
                                          </div>
                                          <span className="item-label">Share</span>
                                          <ChevronRight size={14} className="item-chevron-right" />
                                        </button>

                                        {/* Row 6: Organize */}
                                        <button 
                                          className="context-menu-item"
                                          onClick={() => {
                                            setMovingDoc(doc);
                                            setActiveMenuDocId(null);
                                          }}
                                        >
                                          <div className="item-icon-box">
                                            <Folder size={16} />
                                          </div>
                                          <span className="item-label">Organize</span>
                                          <ChevronRight size={14} className="item-chevron-right" />
                                        </button>

                                        {/* Row 7: File information */}
                                        <button 
                                          className="context-menu-item"
                                          onClick={() => {
                                            setSelectedFileForPreview(doc);
                                            setActiveMenuDocId(null);
                                          }}
                                        >
                                          <div className="item-icon-box">
                                            <Info size={16} />
                                          </div>
                                          <span className="item-label">File information</span>
                                          <ChevronRight size={14} className="item-chevron-right" />
                                        </button>

                                        <div className="context-menu-divider"></div>

                                        {/* Row 8: Move to trash */}
                                        <button 
                                          className="context-menu-item"
                                          onClick={(e) => {
                                            handleDeleteDocument(doc.id, doc.title, e);
                                            setActiveMenuDocId(null);
                                          }}
                                        >
                                          <div className="item-icon-box">
                                            <Trash2 size={16} />
                                          </div>
                                          <span className="item-label">Move to trash</span>
                                          <span className="item-shortcut-tag">Delete</span>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Card Body Preview */}
                                <div className="card-preview-container">
                                  {renderCardThumbnail(doc)}
                                </div>

                                {/* Card Footer with Avatar & Activity */}
                                <div className="card-footer-bar">
                                  <div className="user-avatar-badge">{doc.owner.charAt(0).toUpperCase()}</div>
                                  <span className="activity-text">{doc.activity || `Modified • ${doc.date}`}</span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      ) : (
                        /* List View */
                        <div className="gdrive-files-table-wrapper">
                          <table className="gdrive-table">
                            <thead>
                              <tr>
                                <th>Name</th>
                                <th>Owner</th>
                                <th>Last modified</th>
                                <th>File size</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {workspaceFilteredDocs.map(doc => (
                                <tr key={doc.id} onClick={() => setSelectedFileForPreview(doc)}>
                                  <td className="table-name-cell">
                                    {getDocTypeIcon(doc.type)}
                                    <span>{doc.title}</span>
                                  </td>
                                  <td>{doc.owner}</td>
                                  <td>{doc.date}</td>
                                  <td>{doc.size}</td>
                                  <td style={{ textAlign: 'right' }}>
                                    <button 
                                      className="table-action-icon"
                                      onClick={(e) => handleDeleteDocument(doc.id, doc.title, e)}
                                      title="Delete"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* View More Link at bottom */}
                      <div className="view-more-container">
                        <button className="view-more-link" onClick={() => showToast("All academic vault documents loaded", "info")}>
                          View more
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
              )}
            </main>
          </div>
          )
        ) : (
          /* Authentication Screen */
          <section className="auth-section">
            <div className="auth-card">
              <div className="auth-card-header">
                <h2>{currentView === "login" ? "Welcome Back" : "Create Account"}</h2>
                <p>
                  {currentView === "login" 
                    ? "Access your secure academic vault workspace" 
                    : "Register your institution with EduVault"}
                </p>
              </div>

              <form onSubmit={handleAuthSubmit} className="auth-form">
                {currentView === "signup" && (
                  <>
                    <div className="form-group">
                      <label htmlFor="fullname">Full Name</label>
                      <div className="input-wrapper">
                        <Users size={16} />
                        <input 
                          type="text" 
                          id="fullname" 
                          placeholder="John Doe" 
                          value={nameInput} 
                          onChange={(e) => setNameInput(e.target.value)} 
                          required
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label htmlFor="auth-institution">Institution</label>
                      <div className="input-wrapper">
                        <School size={16} />
                        <select 
                          id="auth-institution"
                          value={institutionInput}
                          onChange={(e) => setInstitutionInput(e.target.value)}
                        >
                          <option value="inst-1">St. Xavier High School</option>
                          <option value="inst-2">Cambridge Global Academy</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  <div className="input-wrapper">
                    <Mail size={16} />
                    <input 
                      type="email" 
                      id="email" 
                      placeholder="you@school.edu" 
                      value={emailInput} 
                      onChange={(e) => setEmailInput(e.target.value)} 
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <div className="input-wrapper">
                    <Lock size={16} />
                    <input 
                      type="password" 
                      id="password" 
                      placeholder="••••••••" 
                      value={passwordInput} 
                      onChange={(e) => setPasswordInput(e.target.value)} 
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary btn-block">
                  {currentView === "login" ? "Log In" : "Sign Up"}
                </button>
              </form>

              <div className="auth-card-footer">
                {currentView === "login" ? (
                  <p>
                    New to EduVault?{' '}
                    <span onClick={() => { setCurrentView("signup"); setEmailInput(""); }}>Create an account</span>
                  </p>
                ) : (
                  <p>
                    Already have an account?{' '}
                    <span onClick={() => { setCurrentView("login"); setEmailInput("arabisvi@gmail.com"); }}>Log in instead</span>
                  </p>
                )}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* File Preview Modal */}
      {selectedFileForPreview && (
        <div className="gdrive-modal-overlay" onClick={() => setSelectedFileForPreview(null)}>
          <div className="gdrive-preview-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="preview-modal-header">
              <div className="modal-title-row">
                {getDocTypeIcon(selectedFileForPreview.type)}
                <h3>{selectedFileForPreview.title}</h3>
              </div>
              <div className="modal-header-actions">
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={() => showToast(`Simulated download: ${selectedFileForPreview.title}`, "check-circle")}
                >
                  <Download size={16} />
                  <span>Download</span>
                </button>
                <button className="modal-close-icon-btn" onClick={() => setSelectedFileForPreview(null)}>
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="preview-modal-body">
              {renderCardThumbnail(selectedFileForPreview)}
            </div>
            <div className="preview-modal-meta">
              <div className="meta-pill"><span>Size:</span> {selectedFileForPreview.size}</div>
              <div className="meta-pill"><span>Owner:</span> {selectedFileForPreview.owner}</div>
              <div className="meta-pill"><span>Date:</span> {selectedFileForPreview.date}</div>
            </div>
          </div>
        </div>
      )}

      {/* Move File Modal */}
      {movingDoc && (
        <Modal title={`Move "${movingDoc.title}"`} icon={FolderInput} onClose={() => setMovingDoc(null)}>
          <div className="move-modal-body">
            <p className="move-prompt-text">Choose a destination folder in your EduVault:</p>
            <div className="move-folders-list">
              <button 
                className={`move-folder-option ${movingDoc.folderId === null ? 'current-location' : ''}`}
                onClick={() => handleMoveDocument(null)}
              >
                <HardDrive size={18} />
                <span>My Vault (Root)</span>
                {movingDoc.folderId === null && <span className="current-badge">Current</span>}
              </button>
              
              {folders.map(f => (
                <button 
                  key={f.id}
                  className={`move-folder-option ${movingDoc.folderId === f.id ? 'current-location' : ''}`}
                  onClick={() => handleMoveDocument(f.id)}
                >
                  <Folder size={18} />
                  <span>{f.name}</span>
                  {movingDoc.folderId === f.id && <span className="current-badge">Current</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="modal-actions-footer">
            <button className="btn btn-secondary btn-sm" onClick={() => setMovingDoc(null)}>
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {/* Share File Modal */}
      {sharingDoc && (
        <Modal title={`Share "${sharingDoc.title}"`} icon={Share2} onClose={() => setSharingDoc(null)}>
          <div className="share-modal-body">
            <div className="share-link-section">
              <label>Shareable Link</label>
              <div className="copy-link-box">
                <input 
                  type="text" 
                  readOnly 
                  value={`https://eduvault.school.edu/share/doc-${sharingDoc.id}`}
                />
                <button 
                  className="btn btn-primary btn-sm copy-btn"
                  onClick={() => {
                    navigator.clipboard?.writeText(`https://eduvault.school.edu/share/doc-${sharingDoc.id}`);
                    showToast("Link copied to clipboard!", "check-circle");
                  }}
                >
                  <Copy size={14} />
                  <span>Copy Link</span>
                </button>
              </div>
            </div>

            <div className="share-permissions-section">
              <label>Access Level</label>
              <select defaultValue="view" className="share-select">
                <option value="view">Anyone with link can view (Read-only)</option>
                <option value="comment">Class students can comment</option>
                <option value="edit">Teaching staff can edit</option>
              </select>
            </div>
          </div>

          <div className="modal-actions-footer">
            <button className="btn btn-primary btn-sm" onClick={() => {
              showToast(`Share settings saved for "${sharingDoc.title}"`, "check-circle");
              setSharingDoc(null);
            }}>
              Done
            </button>
          </div>
        </Modal>
      )}

      {/* Rename File Modal */}
      {renamingDoc && (
        <Modal title="Rename" icon={Pencil} onClose={() => setRenamingDoc(null)}>
          <form onSubmit={handleRenameSubmit}>
            <div className="move-modal-body">
              <input 
                type="text" 
                className="share-select" 
                value={renameInputVal} 
                onChange={(e) => setRenameInputVal(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="modal-actions-footer">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setRenamingDoc(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm">
                OK
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Rename Folder Modal */}
      {renamingFolder && (
        <Modal title="Rename folder" icon={Pencil} onClose={() => setRenamingFolder(null)}>
          <form onSubmit={handleRenameFolderSubmit}>
            <div className="move-modal-body">
              <input 
                type="text" 
                className="share-select" 
                value={renameFolderInputVal} 
                onChange={(e) => setRenameFolderInputVal(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="modal-actions-footer">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setRenamingFolder(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm">
                OK
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Share Folder Modal */}
      {sharingFolder && (
        <Modal title={`Share folder "${sharingFolder.name}"`} icon={Share2} onClose={() => setSharingFolder(null)}>
          <div className="share-modal-body">
            <div className="share-link-section">
              <label>Folder Shareable Link</label>
              <div className="copy-link-box">
                <input 
                  type="text" 
                  readOnly 
                  value={`https://eduvault.school.edu/share/folder-${sharingFolder.id}`}
                />
                <button 
                  className="btn btn-primary btn-sm copy-btn"
                  onClick={() => {
                    navigator.clipboard?.writeText(`https://eduvault.school.edu/share/folder-${sharingFolder.id}`);
                    showToast("Folder link copied to clipboard!", "check-circle");
                  }}
                >
                  <Copy size={14} />
                  <span>Copy Link</span>
                </button>
              </div>
            </div>

            <div className="share-permissions-section">
              <label>Access Level</label>
              <select defaultValue="view" className="share-select">
                <option value="view">Anyone in institution can view (Read-only)</option>
                <option value="edit">Organizers & Teaching staff can add/edit</option>
              </select>
            </div>
          </div>

          <div className="modal-actions-footer">
            <button className="btn btn-primary btn-sm" onClick={() => {
              showToast(`Share settings saved for folder "${sharingFolder.name}"`, "check-circle");
              setSharingFolder(null);
            }}>
              Done
            </button>
          </div>
        </Modal>
      )}

      {/* Create Custom Filter Modal */}
      {showCreateFilterModal && (
        <Modal title="Create Custom Filter" icon={Filter} onClose={() => setShowCreateFilterModal(false)}>
          <form onSubmit={handleAddCustomFilter}>
            <div className="move-modal-body">
              <div className="share-link-section">
                <label>Filter Dimension</label>
                <select 
                  className="share-select"
                  value={filterCategory}
                  onChange={(e) => {
                    const newCat = e.target.value;
                    setFilterCategory(newCat);
                    setFilterVal(FILTER_DEFINITIONS[newCat].options[0].value);
                  }}
                >
                  {Object.entries(FILTER_DEFINITIONS).map(([catKey, catDef]) => (
                    <option key={catKey} value={catKey}>{catDef.label}</option>
                  ))}
                </select>
              </div>

              <div className="share-permissions-section">
                <label>Filter Value</label>
                <select 
                  className="share-select"
                  value={filterVal}
                  onChange={(e) => setFilterVal(e.target.value)}
                >
                  {FILTER_DEFINITIONS[filterCategory].options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="modal-actions-footer">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowCreateFilterModal(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm">
                Apply Filter
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Deliberate Logout Confirmation Modal */}
      {showLogoutConfirmModal && (
        <div className="gdrive-modal-overlay" onClick={() => !isLoggingOut && setShowLogoutConfirmModal(false)}>
          <div 
            className="logout-confirm-card" 
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-dialog-title"
          >
            <div className="logout-dialog-icon">
              <LogOut size={22} />
            </div>
            <h3 id="logout-dialog-title">Sign out of EduVault?</h3>
            <p className="logout-dialog-description">
              You will need to sign in again to access your academic workspace and materials.
            </p>

            <div className="logout-dialog-actions">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setShowLogoutConfirmModal(false)}
                disabled={isLoggingOut}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-danger-signout" 
                onClick={handleConfirmLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? (
                  <>
                    <span className="btn-spinner" />
                    <span>Signing out...</span>
                  </>
                ) : (
                  <span>Sign out</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Footer (only for non-workspace view) */}
      {currentView !== "workspace" && (
        <footer className="main-footer">
          <div className="container">
            <p>&copy; 2026 EduVault. All rights reserved. Secure Digital Workspace Visionary.</p>
          </div>
        </footer>
      )}

      {/* Notification Toast */}
      <div className={`toast ${toast.show ? 'show' : ''}`}>
        {getToastIcon(toast.icon)}
        <span>{toast.message}</span>
      </div>
    </div>
  );
}

export default App;
