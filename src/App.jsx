import React, { useState, useRef, useEffect } from 'react';
import { 
  ShieldCheck, Mail, ArrowRight, Filter, School, Calendar, 
  Users, BookOpen, Clock, Search, UploadCloud, FileText, 
  FileSpreadsheet, FileCheck, CheckCircle, Circle, Info, FolderOpen,
  Lock, ArrowLeft, LogIn, UserPlus, ChevronRight, Plus,
  Trash2, Folder, Image, Download, Home, HardDrive,
  Star, Cloud, MoreVertical, LayoutGrid, List, ChevronDown,
  Film, FileCode, Archive, X, Check, Sun, Moon,
  Share2, FolderInput, Copy, Pencil, ExternalLink, RotateCcw,
  User, Settings, LogOut, PanelLeft, PanelLeftClose, Eye
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { api } from './lib/api';

const INITIAL_FOLDERS = [
  { id: "folder-1", name: "Physics Lecture Slides", path: "Grade 10 · Physics · Term 1" },
  { id: "folder-2", name: "Chemistry Lab Exercises", path: "Grade 10 · Chemistry · Term 1" },
  { id: "folder-3", name: "Mathematics Problem Sets", path: "Grade 11 · Mathematics · Term 1" },
  { id: "folder-4", name: "Administrative Circulars", path: "St. Xavier · Admin · Term 1" },
  { id: "folder-5", name: "Term 1 Question Banks", path: "Grade 10 · Physics · Term 1" }
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
    subject: "biology",
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
    subject: "chemistry",
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

const USER_TYPE_LABELS = {
  admin: 'Admin',
  teacher: 'Teacher',
  student: 'Student',
  non_teaching_staff: 'Non teaching staff',
};

const VIEW_AS_USER_TYPES = ['admin', 'teacher', 'non_teaching_staff', 'student'];

const VAULT_SECTION_SUGGESTIONS = [
  'Textbooks',
  'Notebooks',
  'Question papers',
  'Circulars',
  'Other staff',
];

function getSelectedVaultSectionId(selectedNav) {
  if (!selectedNav?.startsWith('section:')) return null;
  return selectedNav.slice('section:'.length);
}

function matchesVaultSectionFilter(selectedNav, vaultSectionId) {
  const activeSection = getSelectedVaultSectionId(selectedNav);
  if (!activeSection) return true;
  return vaultSectionId === activeSection;
}

const ORGANIZE_LIBRARY_SECTION = '__library__';

function folderInOrganizeSection(folder, sectionKey) {
  if (sectionKey === ORGANIZE_LIBRARY_SECTION) return !folder.vaultSectionId;
  return folder.vaultSectionId === sectionKey;
}

function isFolderDescendantOf(folders, ancestorId, folderId) {
  let current = folders.find((f) => f.id === folderId);
  const seen = new Set();
  while (current?.parentFolderId) {
    if (current.parentFolderId === ancestorId) return true;
    if (seen.has(current.parentFolderId)) break;
    seen.add(current.parentFolderId);
    current = folders.find((f) => f.id === current.parentFolderId);
  }
  return false;
}

function mapFolderFromApi(row) {
  return {
    id: row.id,
    name: row.name,
    path: row.path_label || row.path || '',
    vaultSectionId: row.vault_section_id || undefined,
    parentFolderId: row.parent_folder_id || undefined,
  };
}

function mapSectionFromApi(row) {
  return { id: row.id, name: row.name };
}

function mapDocumentFromApi(doc) {
  const fileType = doc.file_type || doc.type || 'pdf';
  const created = doc.created_at ? new Date(doc.created_at) : null;
  const dateStr = created
    ? created.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
    : 'Recently';
  const activityShort = created
    ? created.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'Recently';
  return {
    id: doc.id,
    title: doc.title,
    institution: doc.institution,
    year: doc.academic_year || doc.year || '2026-2027',
    class: doc.class_grade || doc.class || 'grade-10',
    subject: doc.subject || 'physics',
    timeline: doc.timeline || 'term-1',
    type: fileType,
    size: doc.file_size || doc.size || '1.0 MB',
    date: dateStr,
    activity: `Uploaded • ${activityShort}`,
    owner: doc.owner || 'me',
    section: doc.section || 'Section A',
    role: doc.role || 'students',
    folderId: doc.folder_id || doc.folderId || null,
    vaultSectionId: doc.vault_section_id || undefined,
    isTrash: Boolean(doc.deleted_at),
    previewType: fileType === 'image' ? 'diagram-preview' : fileType === 'xlsx' ? 'sheet-preview' : fileType === 'code' ? 'code-preview' : 'pdf-text',
  };
}

function normalizeUserTypeKey(userType) {
  return String(userType || 'student').trim().toLowerCase().replace(/\s+/g, '_');
}

function isAdminUser(user) {
  return normalizeUserTypeKey(user?.user_type) === 'admin';
}

function getEffectiveUserType(user, viewAsType) {
  if (!user) return 'student';
  const actual = normalizeUserTypeKey(user.user_type);
  if (isAdminUser(user) && viewAsType) {
    return normalizeUserTypeKey(viewAsType);
  }
  return actual;
}

function canWriteWorkspace(user, viewAsType) {
  const role = getEffectiveUserType(user, viewAsType);
  return role === 'admin' || role === 'teacher';
}

function formatUserTypeLabel(userType) {
  if (!userType) return USER_TYPE_LABELS.student;
  const key = String(userType).trim().toLowerCase().replace(/\s+/g, '_');
  if (USER_TYPE_LABELS[key]) return USER_TYPE_LABELS[key];
  return String(userType).trim();
}

function sessionFromApiUser(user, fallbackEmail = '', fallbackName = '') {
  const email = (user?.email || fallbackEmail || '').trim();
  if (!email) return null;
  const full_name = (user?.full_name || fallbackName || '').trim();
  const profile_image = user?.profile_image || '';
  const user_type = user?.user_type || 'student';
  return { email, full_name, profile_image, user_type };
}

function UserAvatar({ user, className = '', size = 16 }) {
  if (user?.profile_image) {
    return (
      <img
        src={user.profile_image}
        alt=""
        className={`user-avatar-img ${className}`.trim()}
        width={size}
        height={size}
      />
    );
  }
  return <User size={size} className={className} aria-hidden={className ? undefined : true} />;
}

function userDisplayName(user) {
  if (!user?.email) return 'Account';
  if (user.full_name) return user.full_name;
  return user.email.split('@')[0];
}

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

function App() {
  const [documents, setDocuments] = useState([]);
  const [filterInst, setFilterInst] = useState("inst-1");
  const [filterYear, setFilterYear] = useState("2026-2027");
  const [filterClass, setFilterClass] = useState("grade-10");
  const [filterSubject, setFilterSubject] = useState("physics");
  const [filterTimeline, setFilterTimeline] = useState("term-1");
  const [searchQuery, setSearchQuery] = useState("");
  
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isWorkspace = location.pathname === '/workspace';
  const isLogin = location.pathname === '/login';
  const isSignup = location.pathname === '/signup';
  const isAccount = location.pathname === '/account';

  const [currentUser, setCurrentUser] = useState(null); // { email, full_name, user_type }
  const [viewAsUserType, setViewAsUserType] = useState(null); // admin preview: null => own admin view
  const [viewAsMenuOpen, setViewAsMenuOpen] = useState(false);
  const [accountMenuDismissed, setAccountMenuDismissed] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [pwdCurrent, setPwdCurrent] = useState("");
  const [pwdNew, setPwdNew] = useState("");
  const [pwdConfirm, setPwdConfirm] = useState("");
  const [accountNotice, setAccountNotice] = useState("");
  const [accountError, setAccountError] = useState("");
  const [accountBusy, setAccountBusy] = useState(false);
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);
  const [deleteAccountPassword, setDeleteAccountPassword] = useState("");
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [pwdModalError, setPwdModalError] = useState("");
  const [accountNameInput, setAccountNameInput] = useState("");
  const [isEditingAccountName, setIsEditingAccountName] = useState(false);
  
  // Form states
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [institutionInput, setInstitutionInput] = useState("inst-1");
  const [authError, setAuthError] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);

  const [colorTheme, setColorTheme] = useState(() => {
    if (typeof document !== 'undefined') {
      const attr = document.documentElement.getAttribute('data-theme')
      if (attr === 'light' || attr === 'dark') return attr
    }
    return 'dark'
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', colorTheme)
    try {
      localStorage.setItem('eduvault-theme', colorTheme)
    } catch { /* ignored */ }
  }, [colorTheme])

  const toggleColorTheme = () => {
    setColorTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }

  // Workspace specific states
  const [selectedNav, setSelectedNav] = useState("home"); // 'home', 'shared', 'recent', 'starred', 'trash', section:*
  const [workspaceViewMode, setWorkspaceViewMode] = useState("grid"); // 'grid' | 'list'
  const [showNewDropdown, setShowNewDropdown] = useState(false);
  const [suggestedFoldersOpen, setSuggestedFoldersOpen] = useState(true);
  const [suggestedFilesOpen, setSuggestedFilesOpen] = useState(true);
  const [workspaceSearchQuery, setWorkspaceSearchQuery] = useState("");
  const [workspaceSidebarOpen, setWorkspaceSidebarOpen] = useState(true);
  const [vaultSections, setVaultSections] = useState([]);
  const [showNewSectionModal, setShowNewSectionModal] = useState(false);
  const [newSectionNameInput, setNewSectionNameInput] = useState('');
  const [sectionToDelete, setSectionToDelete] = useState(null);
  const [deleteSectionPassword, setDeleteSectionPassword] = useState('');
  const [deleteSectionError, setDeleteSectionError] = useState('');
  const [sectionDeleteBusy, setSectionDeleteBusy] = useState(false);
  
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
  const [movingFolder, setMovingFolder] = useState(null);
  const [organizeModalSection, setOrganizeModalSection] = useState(null);
  const [sharingDoc, setSharingDoc] = useState(null);
  const [renamingDoc, setRenamingDoc] = useState(null);
  const [renameInputVal, setRenameInputVal] = useState("");
  const [activeMenuFolderId, setActiveMenuFolderId] = useState(null);
  const [renamingFolder, setRenamingFolder] = useState(null);
  const [renameFolderInputVal, setRenameFolderInputVal] = useState("");
  const [sharingFolder, setSharingFolder] = useState(null);
  
  const workspaceFileInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const newDropdownRef = useRef(null);
  const inlineFolderInputRef = useRef(null);
  const avatarInputRef = useRef(null);

  const showToast = () => {};

  const redirectToLogin = () => {
    setEmailInput("arabisvi@gmail.com");
    navigate('/login', { state: { from: location } });
  };

  const requireAuth = () => {
    if (currentUser) return true;
    redirectToLogin();
    return false;
  };

  const openWorkspace = () => {
    if (!requireAuth()) return;
    navigate('/workspace');
  };

  const scrollHomeSection = (sectionId) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  };

  const goToHomeSection = (sectionId) => {
    if (!requireAuth()) return;
    if (isHome) scrollHomeSection(sectionId);
    else navigate('/', { state: { scrollTo: sectionId } });
  };

  const scrollToRoadmap = () => goToHomeSection('roadmap');

  useEffect(() => {
    const allowed = new Set(['/', '/login', '/signup', '/workspace', '/account']);
    if (!allowed.has(location.pathname)) {
      navigate('/', { replace: true });
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    if ((isWorkspace || isAccount) && !currentUser) {
      setEmailInput("arabisvi@gmail.com");
      navigate('/login', { replace: true, state: { from: location } });
    }
  }, [isWorkspace, isAccount, currentUser, navigate, location]);

  useEffect(() => {
    if (currentUser && isHome) {
      navigate('/workspace', { replace: true });
    }
  }, [currentUser, isHome, navigate]);

  useEffect(() => {
    if (isAccount && currentUser) {
      setAccountNameInput(currentUser.full_name || userDisplayName(currentUser));
      setIsEditingAccountName(false);
    }
  }, [isAccount, currentUser?.email, currentUser?.full_name]);

  useEffect(() => {
    if (getEffectiveUserType(currentUser, viewAsUserType) !== 'admin') {
      setShowDeleteAccountConfirm(false);
    }
  }, [currentUser, viewAsUserType]);

  useEffect(() => {
    if (canWriteWorkspace(currentUser, viewAsUserType)) return;
    setIsCreatingFolder(false);
    setShowNewDropdown(false);
    setRenamingDoc(null);
    setRenamingFolder(null);
    setMovingDoc(null);
    setMovingFolder(null);
    setOrganizeModalSection(null);
    setSharingDoc(null);
    setSharingFolder(null);
    if (selectedNav === 'trash') setSelectedNav('home');
  }, [currentUser, viewAsUserType, selectedNav]);

  const workspaceInstitutionId = filterInst !== 'all' ? filterInst : (currentUser?.institution || 'inst-1');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [sections, folderRows] = await Promise.all([
          api.vaultSections.list(workspaceInstitutionId),
          api.folders.list(workspaceInstitutionId),
        ]);
        if (cancelled) return;
        setVaultSections(sections.map(mapSectionFromApi));
        if (folderRows.length > 0) {
          setFolders(folderRows.map(mapFolderFromApi));
        }
      } catch {
        // API offline: keep in-memory seed folders / sections
      }
    })();
    return () => { cancelled = true; };
  }, [workspaceInstitutionId]);

  useEffect(() => {
    const activeId = getSelectedVaultSectionId(selectedNav);
    if (activeId && !vaultSections.some((s) => s.id === activeId)) {
      setSelectedNav('home');
    }
  }, [vaultSections, selectedNav]);

  const trashNavActive = selectedNav === 'trash';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d1Docs = await api.documents.list(workspaceInstitutionId, { trash: trashNavActive });
        if (cancelled) return;
        setDocuments(d1Docs.map(mapDocumentFromApi));
        return;
      } catch {
        // API offline
      }
      if (cancelled) return;
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from('documents')
            .select('*')
            .order('created_at', { ascending: false });
          if (!error && data?.length) {
            setDocuments(data.map((row) => mapDocumentFromApi({ ...row, folder_id: row.folderId })));
            return;
          }
        } catch (err) {
          console.warn('Could not load documents from Supabase', err);
        }
      }
      if (!cancelled) {
        setDocuments(trashNavActive ? [] : INITIAL_DOCUMENTS);
      }
    })();
    return () => { cancelled = true; };
  }, [workspaceInstitutionId, trashNavActive]);

  useEffect(() => {
    const target = location.state?.scrollTo;
    if (!isHome || !target) return;
    requestAnimationFrame(() => scrollHomeSection(target));
    navigate('/', { replace: true, state: {} });
  }, [isHome, location.state, navigate]);

  useEffect(() => {
    if (!currentUser || !(isLogin || isSignup)) return;
    goAfterAuth();
  }, [currentUser, isLogin, isSignup, location.state, navigate]);

  useEffect(() => {
    if (isCreatingFolder && inlineFolderInputRef.current) {
      inlineFolderInputRef.current.focus();
      inlineFolderInputRef.current.select();
    }
  }, [isCreatingFolder]);

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
      if (!event.target.closest('.user-account-submenu-wrap')) {
        setViewAsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auth (Cloudflare D1 localStorage + optional Supabase session)
  useEffect(() => {
    const savedUser = api.auth.getCurrentUser();
    if (savedUser?.email) {
      setCurrentUser(sessionFromApiUser(savedUser));
    }

    // Check Supabase session if configured
    let subscription;
    if (isSupabaseConfigured && supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setCurrentUser(sessionFromApiUser(
            { email: session.user.email, full_name: session.user.user_metadata?.full_name }
          ));
        }
      });
      const sub = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setCurrentUser(sessionFromApiUser(
            { email: session.user.email, full_name: session.user.user_metadata?.full_name }
          ));
        }
      });
      subscription = sub?.data?.subscription;
    }

    return () => {
      subscription?.unsubscribe?.();
    };
  }, []);
  const filteredDocs = documents.filter(doc => {
    if (filterInst !== 'all' && doc.institution !== filterInst) return false;
    if (filterYear !== 'all' && doc.year !== filterYear) return false;
    if (filterClass !== 'all' && doc.class !== filterClass) return false;
    if (filterSubject !== 'all' && doc.subject !== filterSubject) return false;
    if (filterTimeline !== 'all' && doc.timeline !== filterTimeline) return false;
    if (searchQuery && !doc.title.toLowerCase().includes(searchQuery.toLowerCase().trim())) return false;
    return true;
  });

  const matchesAcademicFilters = (doc) => {
    if (filterInst !== 'all' && doc.institution !== filterInst) return false;
    if (filterYear !== 'all' && doc.year !== filterYear) return false;
    if (filterClass !== 'all' && doc.class !== filterClass) return false;
    if (filterSubject !== 'all' && doc.subject !== filterSubject) return false;
    if (filterTimeline !== 'all' && doc.timeline !== filterTimeline) return false;
    return true;
  };

  // Workspace Filtered Documents
  const workspaceFilteredDocs = documents.filter(doc => {
    if (!matchesAcademicFilters(doc)) return false;

    // Active folder filter
    if (activeFolderId !== null) {
      if (doc.folderId !== activeFolderId) return false;
    }

    if (!matchesVaultSectionFilter(selectedNav, doc.vaultSectionId)) return false;

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

  const activeVaultSectionId = getSelectedVaultSectionId(selectedNav);

  const workspaceFolders = folders.filter((folder) =>
    matchesVaultSectionFilter(selectedNav, folder.vaultSectionId) && !folder.parentFolderId
  );

  const workspaceChildFolders = activeFolderId
    ? folders.filter(
        (folder) => folder.parentFolderId === activeFolderId
          && matchesVaultSectionFilter(selectedNav, folder.vaultSectionId)
      )
    : [];

  const foldersForGrid = activeFolderId === null ? workspaceFolders : workspaceChildFolders;

  const handleWorkspaceFileUpload = async (e) => {
    if (!requireAuth()) {
      e.target.value = null;
      return;
    }
    if (!canWriteWorkspace(currentUser, viewAsUserType)) {
      e.target.value = null;
      showToast('You have read-only access in the workspace', 'info');
      return;
    }
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
      owner: currentUser?.email ? currentUser.email.split('@')[0] : "me",
      section: "Section A",
      role: "students",
      folderId: activeFolderId,
      vaultSectionId: activeVaultSectionId || undefined,
      previewType: type === 'image' ? 'diagram-preview' : type === 'xlsx' ? 'sheet-preview' : type === 'code' ? 'code-preview' : 'pdf-text'
    };

    // Attempt to persist to Cloudflare D1 API first
    try {
      const savedDoc = await api.documents.create({
        title: newDoc.title,
        institution: newDoc.institution,
        academic_year: newDoc.year,
        class_grade: newDoc.class,
        subject: newDoc.subject,
        timeline: newDoc.timeline,
        file_type: newDoc.type,
        file_size: newDoc.size,
        owner: newDoc.owner,
        section: newDoc.section,
        role: newDoc.role,
        folder_id: newDoc.folderId,
        vault_section_id: newDoc.vaultSectionId || null,
      });
      if (savedDoc?.id) {
        newDoc.id = savedDoc.id;
      }
    } catch {
      // If Cloudflare D1 API is unavailable, fallback to Supabase if configured
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
    }

    setDocuments([newDoc, ...documents]);
    showToast(`Uploaded "${newDoc.title}" to Workspace`, "check-circle");
    setShowNewDropdown(false);
    e.target.value = null;
  };

  const handleCreateVaultSection = async (e) => {
    if (e) e.preventDefault();
    if (!canWriteWorkspace(currentUser, viewAsUserType)) return;
    const name = newSectionNameInput.trim();
    if (!name || !currentUser?.email) return;
    const applySection = (section) => {
      setVaultSections((prev) => [...prev, section]);
      setNewSectionNameInput('');
      setShowNewSectionModal(false);
      setShowNewDropdown(false);
      setSelectedNav(`section:${section.id}`);
      setActiveFolderId(null);
      showToast(`Created section "${name}"`, 'check-circle');
    };
    try {
      const created = await api.vaultSections.create({
        institution_id: workspaceInstitutionId,
        name,
      });
      applySection(mapSectionFromApi(created));
    } catch (err) {
      if (!shouldFallbackFromApi(err)) {
        showToast(err.message || 'Could not create section', 'info');
        return;
      }
      applySection({ id: `section-${Date.now()}`, name });
    }
  };

  const openDeleteVaultSectionModal = (section) => {
    if (!canWriteWorkspace(currentUser, viewAsUserType)) return;
    setDeleteSectionPassword('');
    setDeleteSectionError('');
    setSectionToDelete(section);
  };

  const closeDeleteVaultSectionModal = () => {
    if (sectionDeleteBusy) return;
    setSectionToDelete(null);
    setDeleteSectionPassword('');
    setDeleteSectionError('');
  };

  const handleDeleteVaultSection = async (e) => {
    e.preventDefault();
    if (!sectionToDelete || !currentUser?.email) return;
    if (!canWriteWorkspace(currentUser, viewAsUserType)) return;
    if (!deleteSectionPassword.trim()) {
      setDeleteSectionError('Enter your password to confirm.');
      return;
    }
    setSectionDeleteBusy(true);
    setDeleteSectionError('');
    try {
      const sectionId = sectionToDelete.id;
      try {
        await api.vaultSections.delete({
          password: deleteSectionPassword,
          id: sectionId,
          institution_id: workspaceInstitutionId,
        });
      } catch (err) {
        if (shouldFallbackFromApi(err)) {
          try {
            await api.auth.login(currentUser.email, deleteSectionPassword);
          } catch (loginErr) {
            if (!shouldFallbackFromApi(loginErr)) {
              setDeleteSectionError(loginErr.message || 'Password is incorrect.');
              return;
            }
          }
        } else {
          setDeleteSectionError(err.message || 'Password is incorrect.');
          return;
        }
      }
      setVaultSections((prev) => prev.filter((s) => s.id !== sectionId));
      setDocuments((prev) => prev.filter((d) => d.vaultSectionId !== sectionId));
      setFolders((prev) => prev.filter((f) => f.vaultSectionId !== sectionId));
      if (selectedNav === `section:${sectionId}`) {
        setSelectedNav('home');
        setActiveFolderId(null);
      }
      showToast(`Deleted section "${sectionToDelete.name}"`, 'info');
      setSectionToDelete(null);
      setDeleteSectionPassword('');
      setDeleteSectionError('');
    } finally {
      setSectionDeleteBusy(false);
    }
  };

  const handleCreateFolder = async (e) => {
    if (e) e.preventDefault();
    if (!canWriteWorkspace(currentUser, viewAsUserType)) return;
    if (!newFolderName.trim()) {
      setIsCreatingFolder(false);
      return;
    }

    const folderName = newFolderName.trim();
    const pathLabel = getFolderContextPath();
    const applyFolder = (folder) => {
      setFolders((prev) => [folder, ...prev]);
      setNewFolderName('');
      setIsCreatingFolder(false);
      setShowNewDropdown(false);
      showToast(`Created folder "${folder.name}"`, 'check-circle');
    };

    if (!currentUser?.email) {
      applyFolder({
        id: `folder-${Date.now()}`,
        name: folderName,
        path: pathLabel,
        vaultSectionId: activeVaultSectionId || undefined,
        parentFolderId: activeFolderId || undefined,
      });
      return;
    }

    try {
      const created = await api.folders.create({
        institution_id: workspaceInstitutionId,
        name: folderName,
        path_label: pathLabel,
        vault_section_id: activeVaultSectionId || null,
        parent_folder_id: activeFolderId || null,
      });
      applyFolder(mapFolderFromApi(created));
    } catch (err) {
      if (!shouldFallbackFromApi(err)) {
        showToast(err.message || 'Could not create folder', 'info');
        return;
      }
      applyFolder({
        id: `folder-${Date.now()}`,
        name: folderName,
        path: pathLabel,
        vaultSectionId: activeVaultSectionId || undefined,
        parentFolderId: activeFolderId || undefined,
      });
    }
  };

  const handleMoveDocumentToTrash = async (id, title, e) => {
    if (e) e.stopPropagation();
    if (!canWriteWorkspace(currentUser, viewAsUserType)) return;
    const removeFromView = () => {
      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
      showToast(`Moved "${title}" to trash`, 'info');
    };
    if (!currentUser?.email) {
      setDocuments((prev) => prev.map((d) => (d.id === id ? { ...d, isTrash: true } : d)));
      showToast(`Moved "${title}" to trash`, 'info');
      return;
    }
    try {
      await api.documents.patch(id, { trash: true });
      removeFromView();
    } catch (err) {
      if (shouldFallbackFromApi(err)) {
        setDocuments((prev) => prev.map((d) => (d.id === id ? { ...d, isTrash: true } : d)));
        showToast(`Moved "${title}" to trash`, 'info');
      } else {
        showToast(err.message || 'Could not move to trash', 'info');
      }
    }
  };

  const handleRestoreDocumentFromTrash = async (id, title, e) => {
    if (e) e.stopPropagation();
    if (!canWriteWorkspace(currentUser, viewAsUserType)) return;
    const removeFromView = () => {
      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
      showToast(`Restored "${title}"`, 'check-circle');
    };
    if (!currentUser?.email) {
      removeFromView();
      return;
    }
    try {
      await api.documents.patch(id, { restore: true });
      removeFromView();
    } catch (err) {
      if (shouldFallbackFromApi(err)) removeFromView();
      else showToast(err.message || 'Could not restore', 'info');
    }
  };

  const handleToggleStar = (docId) => {
    if (!canWriteWorkspace(currentUser, viewAsUserType)) return;
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
    if (!canWriteWorkspace(currentUser, viewAsUserType)) return;
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

  const documentFiltersAreActive =
    filterInst !== 'all' ||
    filterClass !== 'all' ||
    filterSubject !== 'all' ||
    filterTimeline !== 'all' ||
    customFilters.length > 0 ||
    workspaceSearchQuery.trim() !== '' ||
    searchQuery.trim() !== '';

  const clearDocumentFilters = () => {
    setFilterInst('all');
    setFilterClass('all');
    setFilterSubject('all');
    setFilterTimeline('all');
    setCustomFilters([]);
    setWorkspaceSearchQuery('');
    setSearchQuery('');
    showToast('Filters cleared', 'info');
  };

  const handleDeleteFolder = (folderId, folderName, e) => {
    if (e) e.stopPropagation();
    if (!canWriteWorkspace(currentUser, viewAsUserType)) return;
    setFolders(folders.filter(f => f.id !== folderId));
    showToast(`Removed folder "${folderName}"`, "info");
    setActiveMenuFolderId(null);
  };

  const handleRenameSubmit = async (e) => {
    e.preventDefault();
    if (!canWriteWorkspace(currentUser, viewAsUserType)) return;
    if (!renamingDoc || !renameInputVal.trim()) return;
    const nextTitle = renameInputVal.trim();
    const apply = () => {
      setDocuments((prev) => prev.map((d) => (
        d.id === renamingDoc.id ? { ...d, title: nextTitle } : d
      )));
      showToast(`Renamed to "${nextTitle}"`, 'check-circle');
      setRenamingDoc(null);
      setRenameInputVal('');
    };
    if (!currentUser?.email || typeof renamingDoc.id === 'number') {
      apply();
      return;
    }
    try {
      await api.documents.patch(renamingDoc.id, { title: nextTitle });
      apply();
    } catch (err) {
      if (shouldFallbackFromApi(err)) apply();
      else showToast(err.message || 'Could not rename file', 'info');
    }
  };

  const handleRenameFolderSubmit = async (e) => {
    e.preventDefault();
    if (!canWriteWorkspace(currentUser, viewAsUserType)) return;
    if (!renamingFolder || !renameFolderInputVal.trim()) return;
    const nextName = renameFolderInputVal.trim();
    const apply = () => {
      setFolders((prev) => prev.map((f) => (
        f.id === renamingFolder.id ? { ...f, name: nextName } : f
      )));
      showToast(`Renamed folder to "${nextName}"`, 'check-circle');
      setRenamingFolder(null);
      setRenameFolderInputVal('');
    };
    if (!currentUser?.email) {
      apply();
      return;
    }
    try {
      await api.folders.patch(renamingFolder.id, { name: nextName });
      apply();
    } catch (err) {
      if (shouldFallbackFromApi(err)) apply();
      else showToast(err.message || 'Could not rename folder', 'info');
    }
  };

  const closeOrganizeModal = () => {
    setMovingDoc(null);
    setMovingFolder(null);
    setOrganizeModalSection(null);
  };

  const openOrganizeForDoc = (doc) => {
    setMovingFolder(null);
    setMovingDoc(doc);
    setOrganizeModalSection(null);
    setActiveMenuDocId(null);
  };

  const openOrganizeForFolder = (folder) => {
    setMovingDoc(null);
    setMovingFolder(folder);
    setOrganizeModalSection(null);
    setActiveMenuFolderId(null);
  };

  const vaultSectionIdFromOrganizeKey = (sectionKey) => (
    sectionKey === ORGANIZE_LIBRARY_SECTION ? undefined : sectionKey
  );

  const handleOrganizeDocument = async (folderId, sectionKey) => {
    if (!movingDoc || !canWriteWorkspace(currentUser, viewAsUserType)) return;
    const targetFolder = folderId ? folders.find((f) => f.id === folderId) : null;
    const vaultSectionId = targetFolder
      ? targetFolder.vaultSectionId
      : vaultSectionIdFromOrganizeKey(sectionKey);
    const destLabel = targetFolder ? targetFolder.name : 'section root';
    const apply = () => {
      setDocuments((prev) => prev.map((d) => (
        d.id === movingDoc.id ? { ...d, folderId: folderId || null, vaultSectionId } : d
      )));
      showToast(`Moved "${movingDoc.title}" to ${destLabel}`, 'check-circle');
      closeOrganizeModal();
    };
    if (!currentUser?.email || typeof movingDoc.id === 'number') {
      apply();
      return;
    }
    try {
      await api.documents.patch(movingDoc.id, {
        folder_id: folderId || null,
        vault_section_id: vaultSectionId || null,
      });
      apply();
    } catch (err) {
      if (shouldFallbackFromApi(err)) apply();
      else showToast(err.message || 'Could not move file', 'info');
    }
  };

  const handleOrganizeFolder = async (parentFolderId, sectionKey) => {
    if (!movingFolder || !canWriteWorkspace(currentUser, viewAsUserType)) return;
    if (parentFolderId === movingFolder.id) return;
    if (parentFolderId && isFolderDescendantOf(folders, movingFolder.id, parentFolderId)) {
      showToast('Cannot move a folder into its own subfolder', 'info');
      return;
    }
    const targetParent = parentFolderId ? folders.find((f) => f.id === parentFolderId) : null;
    const vaultSectionId = targetParent
      ? targetParent.vaultSectionId
      : vaultSectionIdFromOrganizeKey(sectionKey);
    const destLabel = targetParent ? targetParent.name : 'section root';
    const apply = () => {
      setFolders((prev) => prev.map((f) => (
        f.id === movingFolder.id
          ? { ...f, parentFolderId: parentFolderId || undefined, vaultSectionId }
          : f
      )));
      showToast(`Moved folder "${movingFolder.name}" to ${destLabel}`, 'check-circle');
      closeOrganizeModal();
    };
    if (!currentUser?.email) {
      apply();
      return;
    }
    try {
      await api.folders.patch(movingFolder.id, {
        parent_folder_id: parentFolderId || null,
        vault_section_id: vaultSectionId || null,
      });
      apply();
    } catch (err) {
      if (shouldFallbackFromApi(err)) apply();
      else showToast(err.message || 'Could not move folder', 'info');
    }
  };

  const organizeSectionChoices = [
    {
      key: ORGANIZE_LIBRARY_SECTION,
      name: 'Library',
      folderCount: folders.filter((f) => folderInOrganizeSection(f, ORGANIZE_LIBRARY_SECTION)).length,
    },
    ...vaultSections.map((s) => ({
      key: s.id,
      name: s.name,
      folderCount: folders.filter((f) => folderInOrganizeSection(f, s.id)).length,
    })),
  ];

  const organizeFoldersInSection = (sectionKey) => {
    let list = folders.filter((f) => folderInOrganizeSection(f, sectionKey));
    if (movingFolder) {
      list = list.filter(
        (f) => f.id !== movingFolder.id && !isFolderDescendantOf(folders, movingFolder.id, f.id)
      );
    }
    return list;
  };

  const organizeSectionLabel = (sectionKey) => (
    sectionKey === ORGANIZE_LIBRARY_SECTION
      ? 'Library'
      : vaultSections.find((s) => s.id === sectionKey)?.name || 'Section'
  );

  const isDocAtOrganizeLocation = (folderId, sectionKey) => {
    if (!movingDoc) return false;
    const docSectionKey = movingDoc.vaultSectionId || ORGANIZE_LIBRARY_SECTION;
    const atRoot = movingDoc.folderId == null && folderId == null;
    const atFolder = movingDoc.folderId === folderId && folderId != null;
    return docSectionKey === sectionKey && (atRoot || atFolder);
  };

  const isFolderAtOrganizeLocation = (parentFolderId, sectionKey) => {
    if (!movingFolder) return false;
    const folderSectionKey = movingFolder.vaultSectionId || ORGANIZE_LIBRARY_SECTION;
    const atRoot = !movingFolder.parentFolderId && !parentFolderId;
    const atParent = !!parentFolderId && movingFolder.parentFolderId === parentFolderId;
    return folderSectionKey === sectionKey && (atRoot || atParent);
  };

  const goAfterAuth = () => {
    const from = location.state?.from?.pathname;
    if (from && from !== '/login' && from !== '/signup' && from !== '/') {
      navigate(from, { replace: true });
    } else {
      navigate('/workspace', { replace: true });
    }
  };

  const shouldFallbackFromApi = (err) => {
    if (err?.name === 'TypeError' || err?.name === 'SyntaxError') return true;
    const msg = err?.message || '';
    return /failed to fetch|API unavailable|not configured/i.test(msg);
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");
    if (!emailInput || !passwordInput) {
      setAuthError("Please fill in email and password.");
      return;
    }
    if (isSignup && !nameInput.trim()) {
      setAuthError("Please enter your full name.");
      return;
    }

    setAuthSubmitting(true);
    try {
      // 1. Try Cloudflare D1 Auth API first
      try {
        if (isLogin) {
          const res = await api.auth.login(emailInput, passwordInput);
          setCurrentUser(sessionFromApiUser(res.user, emailInput));
        } else if (isSignup) {
          const res = await api.auth.signup({
            email: emailInput,
            password: passwordInput,
            full_name: nameInput,
            institution: institutionInput
          });
          setCurrentUser(sessionFromApiUser(res.user, emailInput, nameInput));
        }
        setEmailInput("");
        setPasswordInput("");
        setNameInput("");
        goAfterAuth();
        return;
      } catch (d1Err) {
        if (!shouldFallbackFromApi(d1Err)) {
          setAuthError(d1Err.message || "Sign-up failed. Please try again.");
          return;
        }
      }

      if (isSupabaseConfigured && supabase) {
        if (isLogin) {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: emailInput,
            password: passwordInput
          });
          if (error) {
            setAuthError(error.message);
            return;
          }
          setCurrentUser(sessionFromApiUser(
            {
              email: data.user?.email,
              full_name: data.user?.user_metadata?.full_name,
              user_type: data.user?.user_metadata?.user_type,
            },
            emailInput
          ));
        } else if (isSignup) {
          const { data, error } = await supabase.auth.signUp({
            email: emailInput,
            password: passwordInput,
            options: {
              data: {
                full_name: nameInput,
                institution: institutionInput
              }
            }
          });
          if (error) {
            setAuthError(error.message);
            return;
          }
          setCurrentUser(sessionFromApiUser(
            { email: data.user?.email, full_name: nameInput },
            emailInput,
            nameInput
          ));
        }
      } else {
        // Local / demo when /api is not available
        setCurrentUser(sessionFromApiUser(
          null,
          emailInput,
          isSignup ? nameInput : ''
        ));
      }

      setEmailInput("");
      setPasswordInput("");
      setNameInput("");
      goAfterAuth();
    } catch (err) {
      setAuthError(err.message || "Something went wrong. Please try again.");
    } finally {
      setAuthSubmitting(false);
    }
  };

  const openAccount = () => {
    if (!requireAuth()) return;
    setAccountNotice("");
    setAccountError("");
    navigate('/account');
  };

  const persistUserLocal = (user) => {
    if (!user?.email) return;
    try {
      localStorage.setItem('eduvault_user', JSON.stringify({
        email: user.email,
        full_name: user.full_name || '',
        profile_image: user.profile_image || '',
        user_type: user.user_type || 'student',
      }));
    } catch { /* ignored */ }
  };

  const handleAvatarPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser?.email) return;
    setAccountNotice("");
    setAccountError("");
    if (!file.type.startsWith('image/')) {
      setAccountError("Please choose an image file.");
      e.target.value = "";
      return;
    }
    if (file.size > 400 * 1024) {
      setAccountError("Image must be 400KB or smaller.");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const imageData = reader.result;
      if (typeof imageData !== 'string') return;
      setAccountBusy(true);
      try {
        const res = await api.auth.uploadProfileImage(imageData);
        const next = sessionFromApiUser(res.user, currentUser.email, currentUser.full_name);
        setCurrentUser(next);
        setAccountNotice("Profile photo updated.");
      } catch (err) {
        if (shouldFallbackFromApi(err)) {
          const next = { ...currentUser, profile_image: imageData };
          setCurrentUser(next);
          persistUserLocal(next);
          setAccountNotice("Photo saved on this device (API unavailable).");
        } else {
          setAccountError(err.message || "Could not upload photo.");
        }
      } finally {
        setAccountBusy(false);
        e.target.value = "";
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveName = async (e) => {
    e.preventDefault();
    setAccountNotice("");
    setAccountError("");
    if (!currentUser?.email) return;
    const trimmed = accountNameInput.trim();
    if (!trimmed) {
      setAccountError("Name cannot be empty.");
      return;
    }
    setAccountBusy(true);
    try {
      const res = await api.auth.updateProfile(trimmed);
      const next = sessionFromApiUser(res.user, currentUser.email, trimmed);
      setCurrentUser({ ...next, profile_image: currentUser.profile_image || next.profile_image });
      setAccountNameInput(trimmed);
      setIsEditingAccountName(false);
      setAccountNotice("Name updated.");
    } catch (err) {
      if (shouldFallbackFromApi(err)) {
        const next = { ...currentUser, full_name: trimmed };
        setCurrentUser(next);
        persistUserLocal(next);
        setIsEditingAccountName(false);
        setAccountNotice("Name saved on this device (API unavailable).");
      } else {
        setAccountError(err.message || "Could not update name.");
      }
    } finally {
      setAccountBusy(false);
    }
  };

  const openChangePasswordModal = () => {
    setPwdModalError("");
    setPwdCurrent("");
    setPwdNew("");
    setPwdConfirm("");
    setShowChangePasswordModal(true);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdModalError("");
    if (!currentUser?.email) return;
    if (pwdNew !== pwdConfirm) {
      setPwdModalError("New passwords do not match.");
      return;
    }
    if (pwdNew.length < 8) {
      setPwdModalError("New password must be at least 8 characters.");
      return;
    }
    setAccountBusy(true);
    try {
      await api.auth.changePassword(pwdCurrent, pwdNew);
      setPwdCurrent("");
      setPwdNew("");
      setPwdConfirm("");
      setShowChangePasswordModal(false);
      setAccountNotice("Password updated successfully.");
    } catch (err) {
      if (shouldFallbackFromApi(err)) {
        setPwdModalError("Password changes are only available when connected to the EduVault API.");
      } else {
        setPwdModalError(err.message || "Could not update password.");
      }
    } finally {
      setAccountBusy(false);
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    setAccountError("");
    if (!currentUser?.email || !deleteAccountPassword) {
      setAccountError("Enter your password to confirm deletion.");
      return;
    }
    setAccountBusy(true);
    try {
      await api.auth.deleteAccount(deleteAccountPassword);
      setShowDeleteAccountConfirm(false);
      setDeleteAccountPassword("");
      setCurrentUser(null);
      setViewAsUserType(null);
      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.auth.signOut();
        } catch { /* ignored */ }
      }
      navigate('/');
    } catch (err) {
      if (shouldFallbackFromApi(err)) {
        setAccountError("Account deletion is only available when connected to the EduVault API.");
      } else {
        setAccountError(err.message || "Could not delete account.");
      }
    } finally {
      setAccountBusy(false);
    }
  };

  const handleLogout = async () => {
    api.auth.logout();
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn("Logout error:", err);
      }
    }
    setCurrentUser(null);
    setViewAsUserType(null);
    showToast("Logged out successfully", "info");
    navigate('/');
  };

  const handleViewAsSelect = (typeKey) => {
    if (typeKey === 'admin') {
      setViewAsUserType(null);
    } else {
      setViewAsUserType(typeKey);
    }
    setViewAsMenuOpen(false);
    setAccountMenuDismissed(true);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    showToast(`Viewing as ${formatUserTypeLabel(typeKey)}`, 'info');
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
    const subjectCaps = doc.subject.charAt(0).toUpperCase() + doc.subject.slice(1);
    switch (doc.previewType) {
      case 'diagram-preview':
        return (
          <div className="thumb-preview diagram-thumb">
            <div className="diagram-header"><span>{subjectCaps}</span></div>
            <div className="thumb-doc-caption" title={doc.title}>{doc.title}</div>
            <div className="diagram-body">
              <div className="cell-circle"><div className="nucleus"></div></div>
              <div className="diagram-labels"><div className="diag-line"></div><div className="diag-line short"></div></div>
            </div>
          </div>
        );
      case 'code-preview':
        return (
          <div className="thumb-preview ipynb-thumb">
            <div className="code-header"><div className="jupyter-dot"></div><span>{subjectCaps}</span></div>
            <div className="thumb-doc-caption" title={doc.title}>{doc.title}</div>
            <div className="code-box"><code>function binarySearch(arr, t) {'{ ... }'}</code></div>
          </div>
        );
      case 'agreement-preview':
        return (
          <div className="thumb-preview agreement-thumb">
            <div className="doc-page">
              <div className="doc-h1">{doc.title}</div>
              <div className="thumb-meta-tag">{subjectCaps}</div>
              <div className="doc-p"></div><div className="doc-p short"></div><div className="doc-sign-line"></div>
            </div>
          </div>
        );
      case 'sheet-preview':
        return (
          <div className="thumb-preview sheet-thumb">
            <div className="thumb-doc-caption sheet-caption" title={doc.title}>{doc.title}</div>
            <div className="thumb-meta-tag">{subjectCaps}</div>
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
              <div className="thumb-meta-tag">{subjectCaps}</div>
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
    const subName = filterSubject === 'all' ? 'All Subjects' : filterSubject.charAt(0).toUpperCase() + filterSubject.slice(1);
    const termName = filterTimeline === 'term-1' ? 'Term 1' : filterTimeline === 'term-2' ? 'Term 2' : 'All Terms';
    return `${instName} / ${className} / ${subName} / ${termName}`;
  };

  const getFolderContextPath = () => {
    const classLabel = filterClass === 'grade-10' ? 'Grade 10' : filterClass === 'grade-11' ? 'Grade 11' : filterClass === 'grade-12' ? 'Grade 12' : 'All classes';
    const subLabel = filterSubject === 'all' ? 'General' : filterSubject.charAt(0).toUpperCase() + filterSubject.slice(1);
    const termLabel = filterTimeline === 'term-1' ? 'Term 1' : filterTimeline === 'term-2' ? 'Term 2' : 'All terms';
    return `${classLabel} · ${subLabel} · ${termLabel}`;
  };

  const formatDocMetaLine = (doc) => {
    const sub = doc.subject.charAt(0).toUpperCase() + doc.subject.slice(1);
    const term = doc.timeline === 'term-1' ? 'Term 1' : doc.timeline === 'term-2' ? 'Term 2' : doc.timeline;
    return `${sub} · ${term}`;
  };

  const renderAcademicFilterSelects = (className = '') => (
    <div className={`academic-filter-row ${className}`.trim()}>
      <select value={filterInst} onChange={(e) => setFilterInst(e.target.value)} aria-label="Institution">
        <option value="all">All Institutions</option>
        <option value="inst-1">St. Xavier High School</option>
        <option value="inst-2">Cambridge Global Academy</option>
      </select>
      <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} aria-label="Academic Year">
        <option value="2026-2027">2026 - 2027</option>
        <option value="2025-2026">2025 - 2026</option>
      </select>
      <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} aria-label="Class">
        <option value="all">All Classes</option>
        <option value="grade-10">Grade 10 - A</option>
        <option value="grade-11">Grade 11 - Science</option>
        <option value="grade-12">Grade 12 - Commerce</option>
      </select>
      <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} aria-label="Subject">
        <option value="all">All Subjects</option>
        <option value="physics">Physics</option>
        <option value="mathematics">Mathematics</option>
        <option value="chemistry">Chemistry</option>
        <option value="biology">Biology</option>
        <option value="english">English</option>
      </select>
      <select value={filterTimeline} onChange={(e) => setFilterTimeline(e.target.value)} aria-label="Term">
        <option value="all">All Terms</option>
        <option value="term-1">Term 1</option>
        <option value="term-2">Term 2</option>
      </select>
    </div>
  );

  const effectiveUserType = getEffectiveUserType(currentUser, viewAsUserType);
  const workspaceCanWrite = canWriteWorkspace(currentUser, viewAsUserType);
  const isViewAsPreview = Boolean(currentUser && isAdminUser(currentUser) && viewAsUserType);

  return (
    <div
      className={`app-root ${isWorkspace ? 'gdrive-theme' : ''}${isViewAsPreview ? ' view-as-active' : ''}`}
      data-effective-user-type={currentUser ? effectiveUserType : undefined}
      data-workspace-can-write={currentUser ? String(workspaceCanWrite) : undefined}
    >
      {/* Background glow for all pages */}
      <div className="glow-bg">
        <div className="glow-sphere sphere-1"></div>
        <div className="glow-sphere sphere-2"></div>
        <div className="glow-sphere sphere-3"></div>
      </div>

      {/* Global Header Navigation */}
      <header className={`main-header ${isWorkspace ? 'gdrive-header' : ''}`}>
        <div className="header-container">
          <div
            className="logo-wrapper"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate(currentUser ? '/workspace' : '/')}
          >
            <div className="logo">
              <ShieldCheck className="logo-icon" />
              <span className="logo-text">Edu<span>Vault</span></span>
            </div>
            <span className="logo-caption">By PersonAI</span>
          </div>

          {isHome && (
            <nav className="nav-links">
              <a href="#concept" className="active">Home</a>
              <a
                href="#workspace"
                onClick={(e) => {
                  e.preventDefault();
                  if (!requireAuth()) return;
                  document.getElementById("workspace")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Interactive Demo
              </a>
              <a
                href="#roadmap"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToRoadmap();
                }}
              >
                Features
              </a>
              <a
                href="/workspace"
                onClick={(e) => {
                  e.preventDefault();
                  openWorkspace();
                }}
              >
                Workspace
              </a>
            </nav>
          )}
          <div className="header-actions">
            {currentUser ? (
              <div className="user-profile-header">
                <div
                  className={`user-account-menu${accountMenuDismissed ? ' is-dismissed' : ''}`}
                  onMouseLeave={() => setAccountMenuDismissed(false)}
                >
                  <button
                    type="button"
                    className="btn btn-secondary user-account-trigger"
                    aria-haspopup="menu"
                    aria-label="Account menu"
                    onFocus={() => setAccountMenuDismissed(false)}
                  >
                    <UserAvatar user={currentUser} size={16} />
                    <span>{userDisplayName(currentUser)}</span>
                    <ChevronDown size={16} className="user-account-chevron" aria-hidden="true" />
                  </button>
                  <div className="user-account-dropdown" role="menu">
                    <button type="button" className="dropdown-item" role="menuitem" onClick={openAccount}>
                      <User size={16} />
                      <span>Account</span>
                    </button>
                    {isAdminUser(currentUser) && (
                      <div className={`user-account-submenu-wrap${viewAsMenuOpen ? ' is-open' : ''}`}>
                        <button
                          type="button"
                          className="dropdown-item user-view-as-trigger"
                          role="menuitem"
                          aria-haspopup="menu"
                          aria-expanded={viewAsMenuOpen}
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewAsMenuOpen((open) => !open);
                          }}
                        >
                          <Eye size={16} />
                          <span>View as</span>
                          <ChevronDown size={14} className="user-view-as-chevron" aria-hidden="true" />
                        </button>
                        <div className="user-account-submenu" role="menu" aria-label="View as role">
                          {VIEW_AS_USER_TYPES.map((typeKey) => {
                            const isActive = effectiveUserType === typeKey;
                            return (
                              <button
                                key={typeKey}
                                type="button"
                                className={`dropdown-item user-view-as-option${isActive ? ' active' : ''}`}
                                role="menuitem"
                                onClick={() => handleViewAsSelect(typeKey)}
                              >
                                {isActive ? <Check size={16} /> : <span className="user-view-as-option-spacer" aria-hidden="true" />}
                                <span>{formatUserTypeLabel(typeKey)}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <button type="button" className="dropdown-item" role="menuitem">
                      <Settings size={16} />
                      <span>Settings</span>
                    </button>
                    <div className="dropdown-divider" role="separator" />
                    <button
                      type="button"
                      className="dropdown-item user-account-signout"
                      role="menuitem"
                      onClick={() => setShowLogoutConfirm(true)}
                    >
                      <LogOut size={16} />
                      <span>Sign out</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {(isHome || isWorkspace) ? (
                  <>
                    <button className="btn btn-secondary" onClick={() => { setEmailInput("arabisvi@gmail.com"); navigate('/login'); }}>
                      <LogIn size={16} />
                      <span>Log In</span>
                    </button>
                    <button className="btn btn-primary" onClick={() => navigate('/signup')}>
                      <UserPlus size={16} />
                      <span>Sign Up</span>
                    </button>
                  </>
                ) : (
                  <button className="btn btn-secondary" onClick={() => navigate('/')}>
                    <ArrowLeft size={16} />
                    <span>Back to Home</span>
                  </button>
                )}
              </>
            )}
            <button
              type="button"
              className="btn btn-secondary theme-toggle-btn"
              onClick={toggleColorTheme}
              aria-label={colorTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={colorTheme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {colorTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>
      </header>

      {isViewAsPreview && (
        <div className="view-as-banner" role="status">
          <span>
            Previewing as <strong>{formatUserTypeLabel(effectiveUserType)}</strong> (admin view-as mode)
          </span>
          <button type="button" className="view-as-banner-exit" onClick={() => setViewAsUserType(null)}>
            Exit preview
          </button>
        </div>
      )}

      <main className="main-content">
        {isHome && (
          <>
            {/* Hero Section */}
            <section id="concept" className="hero-section">
              <div className="container">
                <h1 className="hero-title">Secure Workspace for <span className="gradient-text">Academic Documents</span></h1>
                <p className="hero-subtitle">
                  One school library for classwork, lab sheets, and administrative circulars—organized by institution, academic year, class, subject, and term.
                </p>
                
                <div className="hero-search-wrapper">
                  <div className="search-box hero-search-box">
                    <Search />
                    <input 
                      type="text" 
                      data-testid="hero-search-input"
                      placeholder="Quickly search files (e.g. Physics, Lab Report)..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => { if (requireAuth()) document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth' }); }}
                    />
                  </div>
                </div>

                <div className="hero-buttons">
                  <button className="btn btn-primary btn-lg" onClick={openWorkspace}>
                    <span>Launch EduVault Workspace</span>
                    <ArrowRight size={18} />
                  </button>
                  <button className="btn btn-secondary btn-lg" onClick={scrollToRoadmap}>
                    <span>View R&D Roadmap</span>
                  </button>
                </div>
              </div>
            </section>

            {/* Interactive Workspace Showcase Section */}
            <section id="workspace" className="workspace-section">
              <div className="container">
                <div className="section-header">
                  <h2>Interactive Workspace Preview</h2>
                  <p>Experience how EduVault structures files organically by institution, year, class, subject, and timeline.</p>
                  <p className="demo-context-line" data-testid="home-demo-context">{getBreadcrumb()}</p>
                </div>

                <div className="workspace-card">
                  {/* Sidebar Filters */}
                  <aside className="workspace-sidebar">
                    <div className="sidebar-header">
                      <Filter />
                      <span>Filter Documents</span>
                    </div>
                    <div className="filter-group">
                      <label><School /> Institution</label>
                      <select value={filterInst} onChange={(e) => setFilterInst(e.target.value)}>
                        <option value="all">All Institutions</option>
                        <option value="inst-1">St. Xavier High School</option>
                        <option value="inst-2">Cambridge Global Academy</option>
                      </select>
                    </div>
                    <div className="filter-group">
                      <label><Calendar /> Academic Year</label>
                      <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
                        <option value="2026-2027">2026 - 2027 (Current)</option>
                        <option value="2025-2026">2025 - 2026</option>
                      </select>
                    </div>
                    <div className="filter-group">
                      <label><Users /> Class / Grade</label>
                      <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)}>
                        <option value="all">All Classes</option>
                        <option value="grade-10">Grade 10 - Section A</option>
                        <option value="grade-11">Grade 11 - Science</option>
                        <option value="grade-12">Grade 12 - Commerce</option>
                      </select>
                    </div>
                    <div className="filter-group">
                      <label><BookOpen /> Subject</label>
                      <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}>
                        <option value="all">All Subjects</option>
                        <option value="physics">Physics</option>
                        <option value="mathematics">Mathematics</option>
                        <option value="chemistry">Chemistry</option>
                        <option value="biology">Biology</option>
                        <option value="english">English Literature</option>
                      </select>
                    </div>
                    <div className="filter-group">
                      <label><Clock /> Timeline / Term</label>
                      <select value={filterTimeline} onChange={(e) => setFilterTimeline(e.target.value)}>
                        <option value="all">All Terms</option>
                        <option value="term-1">Term 1 (Mid-Term)</option>
                        <option value="term-2">Term 2 (Finals)</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm clear-filters-btn"
                      onClick={clearDocumentFilters}
                      disabled={!documentFiltersAreActive}
                    >
                      Clear filters
                    </button>
                  </aside>

                  {/* Main Workspace Area */}
                  <div className="workspace-main">
                    <div className="workspace-top-bar">
                      <div className="search-box">
                        <Search />
                        <input 
                          type="text" 
                          placeholder="Search resources, assignments, exams..." 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                      <div className="upload-zone-wrapper">
                        <button type="button" className="btn btn-primary" onClick={() => { if (requireAuth()) fileInputRef.current?.click(); }}>
                          <UploadCloud />
                          <span>Upload Document</span>
                        </button>
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          style={{ display: 'none' }} 
                          onChange={(e) => {
                            if (!requireAuth()) {
                              e.target.value = null;
                              return;
                            }
                            const file = e.target.files[0];
                            if (!file) return;
                            const newDoc = {
                              id: documents.length + 1,
                              title: file.name.replace(/\.[^/.]+$/, ""),
                              institution: filterInst === 'all' ? 'inst-1' : filterInst,
                              year: filterYear === 'all' ? '2026-2027' : filterYear,
                              class: filterClass === 'all' ? 'grade-10' : filterClass,
                              subject: filterSubject === 'all' ? 'physics' : filterSubject,
                              timeline: filterTimeline === 'all' ? 'term-1' : filterTimeline,
                              type: 'pdf',
                              size: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
                              date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
                            };
                            setDocuments([newDoc, ...documents]);
                            showToast(`Uploaded "${newDoc.title}"`, "check-circle");
                          }} 
                        />
                      </div>
                    </div>

                    {/* Breadcrumb & Stats */}
                    <div className="workspace-breadcrumb">
                      <span className="breadcrumb-text">{getBreadcrumb()}</span>
                      <span className="items-count">{filteredDocs.length} item{filteredDocs.length === 1 ? '' : 's'} found</span>
                    </div>

                    {/* Documents Grid */}
                    <div className="documents-grid">
                      {filteredDocs.length === 0 ? (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>
                          <FolderOpen style={{ width: 48, height: 48, marginBottom: '1rem', opacity: 0.5 }} />
                          <p>No documents match the selected filters or search query.</p>
                        </div>
                      ) : (
                        filteredDocs.map(doc => (
                          <div key={doc.id} className="doc-card" onClick={() => { if (requireAuth()) showToast(`Opening: ${doc.title}`); }}>
                            <div className="doc-title" title={doc.title}>{doc.title}</div>
                            <div className="doc-details">
                              <span className="doc-tag">{formatDocMetaLine(doc)}</span>
                              <span className="doc-tag">{doc.type.toUpperCase()}</span>
                              <span>{doc.size}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* R&D Roadmap Section */}
            <section id="roadmap" className="roadmap-section">
              <div className="container">
                <div className="section-header">
                  <h2>Features</h2>
                </div>

                <div className="roadmap-timeline">
                  <div className="roadmap-item active">
                    <div className="roadmap-card">
                      <h3>Architecture & Multi-Tenancy</h3>
                      <p>Isolate each school’s data and tie every file to year, class, and institution metadata.</p>
                      <ul className="phase-bullets">
                        <li><CheckCircle className="check" size={16} /> <span>Multi-tenant data partition layouts</span></li>
                        <li><CheckCircle className="check" size={16} /> <span>Structured folder mapping schemas</span></li>
                        <li><Circle className="pending" size={16} /> <span>Real-time access policy engines</span></li>
                      </ul>
                    </div>
                  </div>

                  <div className="roadmap-item">
                    <div className="roadmap-card">
                      <h3>Identity & Granular Access</h3>
                      <p>Teachers publish, admins audit, and families see only the terms they are allowed to view.</p>
                      <ul className="phase-bullets">
                        <li><Circle className="pending" size={16} /> <span>Granular role-based access control (RBAC)</span></li>
                        <li><Circle className="pending" size={16} /> <span>Single-sign-on (SSO) for schools</span></li>
                        <li><Circle className="pending" size={16} /> <span>Expiring download token generator</span></li>
                      </ul>
                    </div>
                  </div>

                  <div className="roadmap-item">
                    <div className="roadmap-card">
                      <h3>Distributed File Store & CDN</h3>
                      <p>Store scans, exam papers, and video lessons with fast downloads from the edge.</p>
                      <ul className="phase-bullets">
                        <li><Circle className="pending" size={16} /> <span>High-performance object storage bindings</span></li>
                        <li><Circle className="pending" size={16} /> <span>Edge caching for resource downloads</span></li>
                        <li><Circle className="pending" size={16} /> <span>Automatic mobile file optimization</span></li>
                      </ul>
                    </div>
                  </div>

                  <div className="roadmap-item">
                    <div className="roadmap-card">
                      <h3>AI Auto-Categorization & Search</h3>
                      <p>OCR and semantic search auto-tag uploads into the right class and term.</p>
                      <ul className="phase-bullets">
                        <li><Circle className="pending" size={16} /> <span>Intelligent PDF OCR extraction</span></li>
                        <li><Circle className="pending" size={16} /> <span>Auto-tagging suggestions based on contents</span></li>
                        <li><Circle className="pending" size={16} /> <span>Natural Language query interface</span></li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
        {isWorkspace && (
          <div className="gdrive-layout">
            {/* Left Sidebar */}
            <aside className={`gdrive-sidebar${workspaceSidebarOpen ? '' : ' is-collapsed'}`}>
              {/* + New Button with Dropdown */}
              {workspaceCanWrite && (
              <div className="gdrive-new-wrapper" ref={newDropdownRef}>
                <div className="gdrive-sidebar-new-row">
                  <button 
                    className="gdrive-new-btn" 
                    onClick={() => setShowNewDropdown(!showNewDropdown)}
                  >
                    <Plus size={22} className="gdrive-plus-icon" />
                    <span>New</span>
                  </button>
                  <button
                    type="button"
                    className="gdrive-sidebar-toggle"
                    onClick={() => setWorkspaceSidebarOpen(false)}
                    aria-expanded={workspaceSidebarOpen}
                    aria-label="Hide sidebar"
                    title="Hide sidebar"
                  >
                    <PanelLeftClose size={20} />
                  </button>
                </div>

                {showNewDropdown && (
                  <div className="gdrive-new-dropdown">
                    <button 
                      className="dropdown-item" 
                      onClick={() => {
                        setIsCreatingFolder(true);
                        setNewFolderName("Untitled folder");
                        setShowNewDropdown(false);
                        setSuggestedFoldersOpen(true);
                      }}
                    >
                      <Folder size={18} />
                      <span>New folder</span>
                    </button>
                    <div className="dropdown-divider"></div>
                    <button 
                      className="dropdown-item" 
                      onClick={() => {
                        workspaceFileInputRef.current.click();
                      }}
                    >
                      <UploadCloud size={18} />
                      <span>File upload</span>
                    </button>
                    <div className="dropdown-divider"></div>
                    <button
                      type="button"
                      className="dropdown-item"
                      onClick={() => {
                        setNewSectionNameInput('');
                        setShowNewDropdown(false);
                        setShowNewSectionModal(true);
                      }}
                    >
                      <LayoutGrid size={18} />
                      <span>New section</span>
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
              )}

              {/* Sidebar Navigation Links */}
              <nav className="gdrive-nav-list">
                <button 
                  className={`gdrive-nav-item ${selectedNav === 'home' && activeFolderId === null ? 'active' : ''}`}
                  onClick={() => { setSelectedNav('home'); setActiveFolderId(null); }}
                >
                  <Home size={18} />
                  <span>Home</span>
                </button>

                {vaultSections.map((section) => (
                  <div key={section.id} className="gdrive-nav-section-row">
                    <button
                      type="button"
                      className={`gdrive-nav-item gdrive-nav-item-section${selectedNav === `section:${section.id}` ? ' active' : ''}`}
                      onClick={() => {
                        setSelectedNav(`section:${section.id}`);
                        setActiveFolderId(null);
                      }}
                    >
                      <ChevronRight size={14} className="nav-chevron" />
                      <LayoutGrid size={18} />
                      <span>{section.name}</span>
                    </button>
                    {workspaceCanWrite && (
                      <button
                        type="button"
                        className="vault-section-delete-btn"
                        title={`Delete ${section.name}`}
                        aria-label={`Delete section ${section.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          openDeleteVaultSectionModal(section);
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}

                <button 
                  className={`gdrive-nav-item ${selectedNav === 'shared' ? 'active' : ''}`}
                  onClick={() => { setSelectedNav('shared'); setActiveFolderId(null); }}
                >
                  <Users size={18} />
                  <span>Shared with me</span>
                </button>

                <div className="gdrive-nav-divider"></div>

                <button 
                  className={`gdrive-nav-item ${selectedNav === 'recent' ? 'active' : ''}`}
                  onClick={() => { setSelectedNav('recent'); setActiveFolderId(null); }}
                >
                  <Clock size={18} />
                  <span>Recent</span>
                </button>

                <button 
                  className={`gdrive-nav-item ${selectedNav === 'starred' ? 'active' : ''}`}
                  onClick={() => { setSelectedNav('starred'); setActiveFolderId(null); }}
                >
                  <Star size={18} />
                  <span>Starred</span>
                </button>

                {workspaceCanWrite && (
                  <>
                    <div className="gdrive-nav-divider"></div>
                    <button 
                      className={`gdrive-nav-item ${selectedNav === 'trash' ? 'active' : ''}`}
                      onClick={() => { setSelectedNav('trash'); setActiveFolderId(null); }}
                    >
                      <Trash2 size={18} />
                      <span>Trash</span>
                    </button>
                  </>
                )}
              </nav>

              {/* Custom EduVault Storage Card */}
              <div className="eduvault-storage-card">
                <div className="storage-card-header">
                  <div className="storage-card-icon-wrap">
                    <Cloud size={16} />
                  </div>
                  <div className="storage-card-title-group">
                    <span className="storage-card-label">School library</span>
                    <span className="storage-card-plan">Institution quota</span>
                  </div>
                  <span className="storage-card-percent">14%</span>
                </div>

                <div className="storage-card-meter-container">
                  <div className="storage-meter-track">
                    <div className="storage-meter-gradient-fill" style={{ width: '14.2%' }}></div>
                  </div>
                </div>

                <div className="storage-stats-row">
                  <span className="storage-stat-main">14.2 GB of 100 GB library used</span>
                  <span className="storage-stat-sub">85.8 GB free</span>
                </div>

              </div>
            </aside>

            {/* Main Content Area */}
            <main className="gdrive-main-pane">
              {!workspaceCanWrite && (
                <p className="workspace-readonly-notice" role="status">
                  Read-only access — you can browse, open, and download. Editing and sharing are disabled.
                </p>
              )}
              {/* Workspace Top Search & Filter Bar */}
              <div className="gdrive-top-bar">
                <div className="gdrive-top-bar-search-row">
                  {!workspaceSidebarOpen && (
                    <button
                      type="button"
                      className="gdrive-sidebar-toggle gdrive-sidebar-reopen-btn"
                      onClick={() => setWorkspaceSidebarOpen(true)}
                      aria-label="Show sidebar"
                      title="Show sidebar"
                    >
                      <PanelLeft size={20} />
                    </button>
                  )}
                  <div className="gdrive-search-input-wrapper">
                    <Search size={18} className="gdrive-search-icon" />
                    <input 
                      type="text" 
                      placeholder="Search documents, lectures, lab reports..."
                      value={workspaceSearchQuery}
                      onChange={(e) => setWorkspaceSearchQuery(e.target.value)}
                    />
                    {workspaceSearchQuery && (
                      <button className="clear-search-btn" onClick={() => setWorkspaceSearchQuery("")}>
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  {!currentUser && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm workspace-back-btn"
                      onClick={() => navigate('/')}
                    >
                      <ArrowLeft size={16} />
                      <span>Back to overview</span>
                    </button>
                  )}
                </div>

                <div className="workspace-academic-filters-bar">
                  {renderAcademicFilterSelects('workspace-academic-filters')}
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm clear-filters-btn"
                    onClick={clearDocumentFilters}
                    disabled={!documentFiltersAreActive}
                  >
                    Clear filters
                  </button>
                </div>

                {/* Custom Filter Toolbar */}
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

                </div>
              </div>

              {/* Main Content White Board / Canvas */}
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
                          <span className="crumb-link" onClick={() => setActiveFolderId(null)}>{getBreadcrumb()}</span>
                          <ChevronRight size={16} className="crumb-sep" />
                          <span className="crumb-active">{folders.find(f => f.id === activeFolderId)?.name || 'Folder'}</span>
                        </div>
                      </div>
                    ) : (
                      <h1 className="gdrive-title" data-testid="workspace-context-title">{getBreadcrumb()}</h1>
                    )}
                  </div>
                </div>

                {/* Section 1: Folders */}
                {(activeFolderId === null || workspaceChildFolders.length > 0) && (
                  <div className="gdrive-section">
                    <div 
                      className="gdrive-section-title"
                      onClick={() => setSuggestedFoldersOpen(!suggestedFoldersOpen)}
                    >
                      {suggestedFoldersOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      <span>{activeFolderId ? 'Subfolders' : 'Folders'}</span>
                    </div>

                    {suggestedFoldersOpen && (
                      <div className="gdrive-folders-grid">
                        {workspaceCanWrite && isCreatingFolder && activeFolderId === null && (
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

                        {foldersForGrid.map(folder => (
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
                              <div className="folder-sub-path">{folder.path || getFolderContextPath()}</div>
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

                                  {workspaceCanWrite && (
                                    <>
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

                                      <button
                                        className="context-menu-item"
                                        onClick={() => openOrganizeForFolder(folder)}
                                      >
                                        <div className="item-icon-box">
                                          <Folder size={16} />
                                        </div>
                                        <span className="item-label">Organize</span>
                                        <ChevronRight size={14} className="item-chevron-right" />
                                      </button>
                                    </>
                                  )}

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

                                  {workspaceCanWrite && (
                                    <>
                                      <div className="context-menu-divider"></div>
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
                                    </>
                                  )}
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
                      <span>Files</span>
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

                                        {workspaceCanWrite && (
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
                                        )}

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

                                        {workspaceCanWrite && (
                                          <>
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

                                            <button 
                                              className="context-menu-item"
                                              onClick={() => openOrganizeForDoc(doc)}
                                            >
                                              <div className="item-icon-box">
                                                <Folder size={16} />
                                              </div>
                                              <span className="item-label">Organize</span>
                                              <ChevronRight size={14} className="item-chevron-right" />
                                            </button>
                                          </>
                                        )}

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

                                        {workspaceCanWrite && trashNavActive && (
                                          <button
                                            className="context-menu-item"
                                            onClick={(e) => {
                                              handleRestoreDocumentFromTrash(doc.id, doc.title, e);
                                              setActiveMenuDocId(null);
                                            }}
                                          >
                                            <div className="item-icon-box">
                                              <RotateCcw size={16} />
                                            </div>
                                            <span className="item-label">Restore</span>
                                          </button>
                                        )}

                                        {workspaceCanWrite && !trashNavActive && (
                                          <>
                                            <div className="context-menu-divider"></div>
                                            <button 
                                              className="context-menu-item"
                                              onClick={(e) => {
                                                handleMoveDocumentToTrash(doc.id, doc.title, e);
                                                setActiveMenuDocId(null);
                                              }}
                                            >
                                              <div className="item-icon-box">
                                                <Trash2 size={16} />
                                              </div>
                                              <span className="item-label">Move to trash</span>
                                              <span className="item-shortcut-tag">Delete</span>
                                            </button>
                                          </>
                                        )}
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
                                {workspaceCanWrite && <th style={{ textAlign: 'right' }}>Actions</th>}
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
                                  {workspaceCanWrite && (
                                    <td style={{ textAlign: 'right' }}>
                                      {trashNavActive ? (
                                        <button
                                          className="table-action-icon"
                                          onClick={(e) => handleRestoreDocumentFromTrash(doc.id, doc.title, e)}
                                          title="Restore"
                                        >
                                          <RotateCcw size={16} />
                                        </button>
                                      ) : (
                                        <button 
                                          className="table-action-icon"
                                          onClick={(e) => handleMoveDocumentToTrash(doc.id, doc.title, e)}
                                          title="Move to trash"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      )}
                                    </td>
                                  )}
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
            </main>
          </div>
        )}
        {isAccount && currentUser && (
          <section className="account-section">
            <div className="container account-page">
              <div className="account-page-header">
                <div className="account-page-title-row">
                  <h1 className="account-page-title">Your account</h1>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm account-back-btn"
                    onClick={() => navigate('/workspace')}
                  >
                    <ArrowLeft size={16} />
                    <span>Back to workspace</span>
                  </button>
                </div>
                <p className="account-page-subtitle">Manage your profile and sign-in details.</p>
              </div>

              {accountNotice ? <p className="account-notice" role="status">{accountNotice}</p> : null}
              {accountError && !showDeleteAccountConfirm && !showChangePasswordModal ? (
                <p className="auth-error account-page-alert" role="alert">{accountError}</p>
              ) : null}

              <div className="account-card">
                <h2>Profile</h2>
                <div className="account-avatar-block">
                  <div className="account-avatar-preview" aria-hidden="true">
                    <UserAvatar user={currentUser} size={40} className="account-avatar-lg" />
                  </div>
                  <div className="account-avatar-actions">
                    <p className="account-avatar-hint">Upload a profile photo (JPEG, PNG, WebP, or GIF, max 400KB).</p>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="account-avatar-input"
                      onChange={handleAvatarPick}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={accountBusy}
                      onClick={() => avatarInputRef.current?.click()}
                    >
                      <UploadCloud size={16} />
                      <span>{accountBusy ? "Uploading…" : "Upload photo"}</span>
                    </button>
                  </div>
                </div>
                <dl className="account-details">
                  <div className="account-detail-row account-detail-row-name">
                    <dt>Name</dt>
                    <dd>
                      {!isEditingAccountName ? (
                        <div className="account-name-display">
                          <span>{currentUser.full_name || userDisplayName(currentUser)}</span>
                          <button
                            type="button"
                            className="account-name-edit-btn"
                            aria-label="Edit name"
                            onClick={() => {
                              setAccountNameInput(currentUser.full_name || userDisplayName(currentUser));
                              setAccountError("");
                              setIsEditingAccountName(true);
                            }}
                          >
                            <Pencil size={16} />
                          </button>
                        </div>
                      ) : (
                        <form className="account-name-edit-form" onSubmit={handleSaveName}>
                          <div className="input-wrapper account-name-input-wrap">
                            <Users size={16} />
                            <input
                              id="account-name"
                              type="text"
                              value={accountNameInput}
                              onChange={(e) => setAccountNameInput(e.target.value)}
                              placeholder="Your full name"
                              required
                              autoFocus
                            />
                          </div>
                          <div className="account-name-edit-actions">
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              disabled={accountBusy}
                              onClick={() => {
                                setAccountNameInput(currentUser.full_name || userDisplayName(currentUser));
                                setIsEditingAccountName(false);
                              }}
                            >
                              Cancel
                            </button>
                            <button type="submit" className="btn btn-primary btn-sm" disabled={accountBusy}>
                              {accountBusy ? "Saving…" : "Save"}
                            </button>
                          </div>
                        </form>
                      )}
                    </dd>
                  </div>
                  <div className="account-detail-row">
                    <dt>Email</dt>
                    <dd>{currentUser.email}</dd>
                  </div>
                  <div className="account-detail-row">
                    <dt>User type</dt>
                    <dd>{formatUserTypeLabel(currentUser.user_type)}</dd>
                  </div>
                </dl>
              </div>

              <div className="account-card">
                <h2>Security</h2>
                <p className="account-security-text">Update the password you use to sign in.</p>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={openChangePasswordModal}
                >
                  <Lock size={16} />
                  <span>Change password</span>
                </button>
              </div>

              {effectiveUserType === 'admin' && (
                <div className="account-card account-card-danger">
                  <h2>Delete account</h2>
                  <p className="account-danger-text">
                    Permanently remove your account and sign-in from EduVault. This cannot be undone.
                  </p>
                  <button
                    type="button"
                    className="btn btn-secondary account-delete-btn"
                    onClick={() => {
                      setAccountError("");
                      setDeleteAccountPassword("");
                      setShowDeleteAccountConfirm(true);
                    }}
                  >
                    <Trash2 size={16} />
                    <span>Delete account</span>
                  </button>
                </div>
              )}
            </div>
          </section>
        )}
        {(isLogin || isSignup) && (
          <section className="auth-section">
            <div className="auth-card">
              <div className="auth-card-header">
                <h2>{isLogin ? "Welcome Back" : "Create Account"}</h2>
                <p>
                  {isLogin
                    ? "Access your secure academic vault workspace" 
                    : "Register your institution with EduVault"}
                </p>
              </div>

              <form onSubmit={handleAuthSubmit} className="auth-form">
                {authError ? (
                  <p className="auth-error" role="alert">{authError}</p>
                ) : null}
                {isSignup && (
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

                <button type="submit" className="btn btn-primary btn-block" disabled={authSubmitting}>
                  {authSubmitting
                    ? (isLogin ? "Logging in…" : "Creating account…")
                    : (isLogin ? "Log In" : "Sign Up")}
                </button>
              </form>

              <div className="auth-card-footer">
                {isLogin ? (
                  <p>
                    New to EduVault?{' '}
                    <span onClick={() => { setEmailInput(""); navigate('/signup'); }}>Create an account</span>
                  </p>
                ) : (
                  <p>
                    Already have an account?{' '}
                    <span onClick={() => { setEmailInput("arabisvi@gmail.com"); navigate('/login'); }}>Log in instead</span>
                  </p>
                )}
              </div>
            </div>
          </section>
        )}
      </main>

      {showChangePasswordModal && (
        <div
          className="logout-confirm-overlay"
          onClick={() => setShowChangePasswordModal(false)}
          role="presentation"
        >
          <div
            className="logout-confirm-dialog account-password-dialog"
            role="dialog"
            aria-labelledby="change-password-title"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="logout-confirm-close"
              onClick={() => setShowChangePasswordModal(false)}
              aria-label="Close"
            >
              <X size={18} />
            </button>
            <h2 id="change-password-title">Change password</h2>
            <form className="account-password-form auth-form" onSubmit={handleChangePassword}>
              {pwdModalError ? <p className="auth-error" role="alert">{pwdModalError}</p> : null}
              <div className="form-group">
                <label htmlFor="pwd-modal-current">Current password</label>
                <div className="input-wrapper">
                  <Lock size={16} />
                  <input
                    id="pwd-modal-current"
                    type="password"
                    autoComplete="current-password"
                    value={pwdCurrent}
                    onChange={(e) => setPwdCurrent(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="pwd-modal-new">New password</label>
                <div className="input-wrapper">
                  <Lock size={16} />
                  <input
                    id="pwd-modal-new"
                    type="password"
                    autoComplete="new-password"
                    value={pwdNew}
                    onChange={(e) => setPwdNew(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="pwd-modal-confirm">Re-enter new password</label>
                <div className="input-wrapper">
                  <Lock size={16} />
                  <input
                    id="pwd-modal-confirm"
                    type="password"
                    autoComplete="new-password"
                    value={pwdConfirm}
                    onChange={(e) => setPwdConfirm(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>
              </div>
              <div className="logout-confirm-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowChangePasswordModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={accountBusy}>
                  {accountBusy ? "Saving…" : "Continue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteAccountConfirm && (
        <div
          className="logout-confirm-overlay"
          onClick={() => setShowDeleteAccountConfirm(false)}
          role="presentation"
        >
          <div
            className="logout-confirm-dialog account-delete-dialog"
            role="dialog"
            aria-labelledby="delete-account-title"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="logout-confirm-close"
              onClick={() => setShowDeleteAccountConfirm(false)}
              aria-label="Close"
            >
              <X size={18} />
            </button>
            <h2 id="delete-account-title">Delete your account?</h2>
            <p className="account-delete-dialog-copy">
              This permanently deletes your account. Enter your password to continue.
            </p>
            {accountError ? <p className="auth-error" role="alert">{accountError}</p> : null}
            <form onSubmit={handleDeleteAccount} className="account-delete-form auth-form">
              <div className="form-group">
                <label htmlFor="delete-account-password">Password</label>
                <div className="input-wrapper">
                  <Lock size={16} />
                  <input
                    id="delete-account-password"
                    type="password"
                    autoComplete="current-password"
                    value={deleteAccountPassword}
                    onChange={(e) => setDeleteAccountPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="logout-confirm-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowDeleteAccountConfirm(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary account-delete-btn" disabled={accountBusy}>
                  {accountBusy ? "Deleting…" : "Delete permanently"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showLogoutConfirm && (
        <div
          className="logout-confirm-overlay"
          onClick={() => setShowLogoutConfirm(false)}
          role="presentation"
        >
          <div
            className="logout-confirm-dialog"
            role="dialog"
            aria-labelledby="logout-confirm-title"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="logout-confirm-close"
              onClick={() => setShowLogoutConfirm(false)}
              aria-label="Close"
            >
              <X size={18} />
            </button>
            <h2 id="logout-confirm-title">Do you really want to sign out?</h2>
            <div className="logout-confirm-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  handleLogout();
                }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Organize file / folder modal */}
      {(movingDoc || movingFolder) && (
        <Modal
          title={`Organize "${movingDoc?.title || movingFolder?.name}"`}
          icon={FolderInput}
          onClose={closeOrganizeModal}
        >
          <div className="move-modal-body">
            {organizeModalSection == null ? (
              <>
                <p className="move-prompt-text">Choose a section:</p>
                <div className="move-folders-list">
                  {organizeSectionChoices.map((section) => (
                    <button
                      key={section.key}
                      type="button"
                      className="move-folder-option move-section-option"
                      onClick={() => setOrganizeModalSection(section.key)}
                    >
                      <LayoutGrid size={18} />
                      <span>{section.name}</span>
                      <span className="organize-section-count">
                        {section.folderCount} folder{section.folderCount === 1 ? '' : 's'}
                      </span>
                      <ChevronRight size={16} className="organize-section-chevron" />
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="organize-modal-back"
                  onClick={() => setOrganizeModalSection(null)}
                >
                  <ArrowLeft size={16} />
                  <span>{organizeSectionLabel(organizeModalSection)}</span>
                </button>
                <p className="move-prompt-text">Choose a folder:</p>
                <div className="move-folders-list">
                  <button
                    type="button"
                    className={`move-folder-option ${
                      movingDoc
                        ? isDocAtOrganizeLocation(null, organizeModalSection) ? 'current-location' : ''
                        : isFolderAtOrganizeLocation(null, organizeModalSection) ? 'current-location' : ''
                    }`}
                    onClick={() => (
                      movingDoc
                        ? handleOrganizeDocument(null, organizeModalSection)
                        : handleOrganizeFolder(null, organizeModalSection)
                    )}
                  >
                    <HardDrive size={18} />
                    <span>Section root</span>
                    {(movingDoc
                      ? isDocAtOrganizeLocation(null, organizeModalSection)
                      : isFolderAtOrganizeLocation(null, organizeModalSection)) && (
                      <span className="current-badge">Current</span>
                    )}
                  </button>
                  {organizeFoldersInSection(organizeModalSection).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      className={`move-folder-option ${
                        movingDoc
                          ? isDocAtOrganizeLocation(f.id, organizeModalSection) ? 'current-location' : ''
                          : isFolderAtOrganizeLocation(f.id, organizeModalSection) ? 'current-location' : ''
                      }`}
                      onClick={() => (
                        movingDoc
                          ? handleOrganizeDocument(f.id, organizeModalSection)
                          : handleOrganizeFolder(f.id, organizeModalSection)
                      )}
                    >
                      <Folder size={18} />
                      <span>{f.name}</span>
                      {(movingDoc
                        ? isDocAtOrganizeLocation(f.id, organizeModalSection)
                        : isFolderAtOrganizeLocation(f.id, organizeModalSection)) && (
                        <span className="current-badge">Current</span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="modal-actions-footer">
            <button type="button" className="btn btn-secondary btn-sm" onClick={closeOrganizeModal}>
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

      {sectionToDelete && (
        <div
          className="logout-confirm-overlay"
          onClick={closeDeleteVaultSectionModal}
          role="presentation"
        >
          <div
            className="logout-confirm-dialog account-delete-dialog"
            role="dialog"
            aria-labelledby="delete-section-title"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="logout-confirm-close"
              onClick={closeDeleteVaultSectionModal}
              aria-label="Close"
              disabled={sectionDeleteBusy}
            >
              <X size={18} />
            </button>
            <h2 id="delete-section-title">Delete &quot;{sectionToDelete.name}&quot;?</h2>
            <p className="account-delete-dialog-copy">
              All folders and files in this section will be permanently removed. This cannot be undone.
            </p>
            {deleteSectionError ? <p className="auth-error" role="alert">{deleteSectionError}</p> : null}
            <form onSubmit={handleDeleteVaultSection} className="account-delete-form auth-form">
              <div className="form-group">
                <label htmlFor="delete-section-password">Password</label>
                <div className="input-wrapper">
                  <Lock size={16} />
                  <input
                    id="delete-section-password"
                    type="password"
                    autoComplete="current-password"
                    value={deleteSectionPassword}
                    onChange={(e) => setDeleteSectionPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="logout-confirm-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeDeleteVaultSectionModal}
                  disabled={sectionDeleteBusy}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary account-delete-btn" disabled={sectionDeleteBusy}>
                  {sectionDeleteBusy ? 'Deleting…' : 'Delete section'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showNewSectionModal && (
        <Modal title="Create vault section" icon={LayoutGrid} onClose={() => setShowNewSectionModal(false)}>
          <form onSubmit={handleCreateVaultSection} className="vault-section-form">
            <div className="move-modal-body">
              <label className="vault-section-label" htmlFor="vault-section-name">Section name</label>
              <input
                id="vault-section-name"
                type="text"
                className="share-select"
                placeholder="e.g. Textbooks"
                value={newSectionNameInput}
                onChange={(e) => setNewSectionNameInput(e.target.value)}
                required
                autoFocus
              />
              <p className="vault-section-hint">Quick ideas (admin & teacher only):</p>
              <div className="vault-section-suggestions">
                {VAULT_SECTION_SUGGESTIONS.map((name) => (
                  <button
                    key={name}
                    type="button"
                    className="vault-section-suggestion-chip"
                    onClick={() => setNewSectionNameInput(name)}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
            <div className="modal-actions-footer">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowNewSectionModal(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm">
                Create section
              </button>
            </div>
          </form>
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

      {/* Global Footer (only for non-workspace view) */}
      {!isWorkspace && (
        <footer className="main-footer">
          <div className="container">
            <p>&copy; 2026 EduVault. All rights reserved.</p>
          </div>
        </footer>
      )}

    </div>
  );
}

export default App;
