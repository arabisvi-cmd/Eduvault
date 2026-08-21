import React, { useState, useRef, useEffect } from 'react';
import { 
  ShieldCheck, Mail, ArrowRight, Filter, School, Calendar, 
  Users, BookOpen, Clock, Search, UploadCloud, FileText, 
  FileSpreadsheet, FileCheck, CheckCircle, Circle, Shield, Info, FolderOpen,
  Lock, ArrowLeft, LogIn, UserPlus
} from 'lucide-react';

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
    date: "Aug 15, 2026"
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
    date: "Aug 12, 2026"
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
    date: "Aug 10, 2026"
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
    date: "Aug 01, 2026"
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
    date: "Aug 18, 2026"
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
    date: "Jul 29, 2026"
  }
];

function App() {
  const [documents, setDocuments] = useState(INITIAL_DOCUMENTS);
  const [filterInst, setFilterInst] = useState("inst-1");
  const [filterYear, setFilterYear] = useState("2026-2027");
  const [filterClass, setFilterClass] = useState("grade-10");
  const [filterSubject, setFilterSubject] = useState("physics");
  const [filterTimeline, setFilterTimeline] = useState("term-1");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Navigation & Authentication states
  const [currentView, setCurrentView] = useState("home"); // 'home', 'login', 'signup'
  const [currentUser, setCurrentUser] = useState(null); // Simulated logged in user email
  
  // Form states
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [institutionInput, setInstitutionInput] = useState("inst-1");

  // Toast System
  const [toast, setToast] = useState({ show: false, message: "", icon: "info" });
  const fileInputRef = useRef(null);

  const showToast = (message, icon = "info") => {
    setToast({ show: true, message, icon });
  };

  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast(prev => ({ ...prev, show: false }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  // Document Filtering
  const filteredDocs = documents.filter(doc => {
    if (filterInst !== 'all' && doc.institution !== filterInst) return false;
    if (filterYear !== 'all' && doc.year !== filterYear) return false;
    if (filterClass !== 'all' && doc.class !== filterClass) return false;
    if (filterSubject !== 'all' && doc.subject !== filterSubject) return false;
    if (filterTimeline !== 'all' && doc.timeline !== filterTimeline) return false;
    if (searchQuery && !doc.title.toLowerCase().includes(searchQuery.toLowerCase().trim())) return false;
    return true;
  });

  const getBreadcrumb = () => {
    const instName = filterInst === 'inst-1' ? 'St. Xavier High School' : filterInst === 'inst-2' ? 'Cambridge Global Academy' : 'All Institutions';
    const className = filterClass === 'grade-10' ? 'Grade 10 - A' : filterClass === 'grade-11' ? 'Grade 11 - Science' : filterClass === 'grade-12' ? 'Grade 12 - Commerce' : 'All Classes';
    const subName = filterSubject.charAt(0).toUpperCase() + filterSubject.slice(1);
    const termName = filterTimeline === 'term-1' ? 'Term 1' : filterTimeline === 'term-2' ? 'Term 2' : 'All Terms';
    return `${instName} / ${className} / ${subName} / ${termName}`;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    const type = ['pdf', 'xlsx', 'xls', 'doc', 'docx'].includes(ext) ? (ext.startsWith('xls') ? 'xlsx' : ext.startsWith('doc') ? 'doc' : 'pdf') : 'pdf';

    const newDoc = {
      id: documents.length + 1,
      title: file.name.replace(/\.[^/.]+$/, ""),
      institution: filterInst === 'all' ? 'inst-1' : filterInst,
      year: filterYear === 'all' ? '2026-2027' : filterYear,
      class: filterClass === 'all' ? 'grade-10' : filterClass,
      subject: filterSubject === 'all' ? 'physics' : filterSubject,
      timeline: filterTimeline === 'all' ? 'term-1' : filterTimeline,
      type: type,
      size: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
    };

    setDocuments([newDoc, ...documents]);
    showToast(`Uploaded "${newDoc.title}" to ${newDoc.class.toUpperCase()} ${newDoc.subject.toUpperCase()}`, "check-circle");
    e.target.value = null; // Reset input
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    if (!emailInput || !passwordInput) {
      showToast("Please fill in all required fields", "info");
      return;
    }

    if (currentView === "login") {
      setCurrentUser(emailInput);
      showToast(`Welcome back, ${emailInput}!`, "check-circle");
    } else {
      setCurrentUser(emailInput);
      showToast(`Account created successfully for ${emailInput}!`, "check-circle");
    }
    
    // Clear forms and redirect
    setEmailInput("");
    setPasswordInput("");
    setNameInput("");
    setCurrentView("home");
  };

  const handleLogout = () => {
    setCurrentUser(null);
    showToast("Logged out successfully", "info");
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
    <div>
      {/* Background glow elements */}
      <div className="glow-bg">
        <div className="glow-sphere sphere-1"></div>
        <div className="glow-sphere sphere-2"></div>
        <div className="glow-sphere sphere-3"></div>
      </div>

      {/* Header Navigation */}
      <header className="main-header">
        <div className="header-container">
          <div className="logo" style={{ cursor: 'pointer' }} onClick={() => setCurrentView("home")}>
            <ShieldCheck className="logo-icon" />
            <span className="logo-text">Edu<span>Vault</span></span>
          </div>
          {currentView === "home" && (
            <nav className="nav-links">
              <a href="#concept" className="active">Concept</a>
              <a href="#workspace">Interactive Demo</a>
              <a href="#roadmap">R&D Roadmap</a>
            </nav>
          )}
          <div className="header-actions">
            {currentUser ? (
              <div className="user-profile-header">
                <button className="btn btn-secondary" onClick={handleLogout}>
                  <Mail size={16} />
                  <span>{currentUser} (Logout)</span>
                </button>
              </div>
            ) : (
              <>
                {currentView === "home" ? (
                  <>
                    <button className="btn btn-secondary" onClick={() => { setCurrentView("login"); setEmailInput("arabisvi@gmail.com"); }}>
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
          <>
            {/* Hero Section */}
            <section id="concept" className="hero-section">
              <div className="container">
                <div className="badge">
                  <span className="badge-dot"></span>
                  <span>Project Vision & Roadmap</span>
                </div>
                <h1 className="hero-title">Secure Workspace for <span class="gradient-text">Academic Documents</span></h1>
                <p className="hero-subtitle">
                  Centralizing scattered classwork, administrative resources, and timelines. React components built to support the high scale load of educational institutions.
                </p>
                <div className="hero-buttons">
                  <button className="btn btn-primary btn-lg" onClick={() => document.getElementById('workspace').scrollIntoView({ behavior: 'smooth' })}>
                    <span>Explore Workspace Demo</span>
                    <ArrowRight size={18} />
                  </button>
                  <button className="btn btn-secondary btn-lg" onClick={() => document.getElementById('roadmap').scrollIntoView({ behavior: 'smooth' })}>
                    <span>View R&D Roadmap</span>
                  </button>
                </div>
              </div>
            </section>

            {/* Interactive Workspace Section */}
            <section id="workspace" className="workspace-section">
              <div className="container">
                <div className="section-header">
                  <h2>Interactive Workspace Preview</h2>
                  <p>Experience how EduVault structures files organically by institution, year, class, subject, and timeline.</p>
                </div>

                <div class="workspace-card">
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
                        <button className="btn btn-primary" onClick={triggerFileInput}>
                          <UploadCloud />
                          <span>Upload Document</span>
                        </button>
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          style={{ display: 'none' }} 
                          onChange={handleFileUpload} 
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
                          <div key={doc.id} className="doc-card" onClick={() => showToast(`Simulated download for: ${doc.title}`)}>
                            <div className={`doc-icon-wrapper ${doc.type}`}>
                              {getDocIcon(doc.type)}
                            </div>
                            <div className="doc-title" title={doc.title}>{doc.title}</div>
                            <div className="doc-details">
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
                  <h2>Research & Development Roadmap</h2>
                  <p>Our phased journey to designing and deploying the next generation of secure educational file systems.</p>
                </div>

                {/* Timeline Roadmap Grid */}
                <div className="roadmap-timeline">
                  {/* Phase 1 */}
                  <div className="roadmap-item active">
                    <div className="phase-number">Phase 1</div>
                    <div className="roadmap-card">
                      <div className="card-header">
                        <h3>Architecture & Multi-Tenancy</h3>
                        <span className="phase-status status-active">In Progress</span>
                      </div>
                      <p>Designing the database schema for highly isolated multi-tenancy. Setting up dynamic metadata nodes linking documents to academic years, institutions, and classes.</p>
                      <ul className="phase-bullets">
                        <li><CheckCircle className="check" size={16} /> <span>Multi-tenant data partition layouts</span></li>
                        <li><CheckCircle className="check" size={16} /> <span>Structured folder mapping schemas</span></li>
                        <li><Circle className="pending" size={16} /> <span>Real-time access policy engines</span></li>
                      </ul>
                    </div>
                  </div>

                  {/* Phase 2 */}
                  <div className="roadmap-item">
                    <div className="phase-number">Phase 2</div>
                    <div className="roadmap-card">
                      <div className="card-header">
                        <h3>Identity & Granular Access</h3>
                        <span className="phase-status">Q4 2026</span>
                      </div>
                      <p>Implementing security policies where teachers can publish, administrators can audit, and parents/students can only view designated timelines.</p>
                      <ul className="phase-bullets">
                        <li><Circle className="pending" size={16} /> <span>Granular role-based access control (RBAC)</span></li>
                        <li><Circle className="pending" size={16} /> <span>Single-sign-on (SSO) for schools</span></li>
                        <li><Circle className="pending" size={16} /> <span>Expiring download token generator</span></li>
                      </ul>
                    </div>
                  </div>

                  {/* Phase 3 */}
                  <div className="roadmap-item">
                    <div className="phase-number">Phase 3</div>
                    <div className="roadmap-card">
                      <div className="card-header">
                        <h3>Distributed File Store & CDN</h3>
                        <span className="phase-status">Q1 2027</span>
                      </div>
                      <p>Integrating distributed storage services to handle large volumes of scanned assignments, exam papers, and educational videos with rapid local delivery.</p>
                      <ul className="phase-bullets">
                        <li><Circle className="pending" size={16} /> <span>High-performance object storage bindings</span></li>
                        <li><Circle className="pending" size={16} /> <span>Edge caching for resource downloads</span></li>
                        <li><Circle className="pending" size={16} /> <span>Automatic mobile file optimization</span></li>
                      </ul>
                    </div>
                  </div>

                  {/* Phase 4 */}
                  <div className="roadmap-item">
                    <div className="phase-number">Phase 4</div>
                    <div className="roadmap-card">
                      <div className="card-header">
                        <h3>AI Auto-Categorization & Search</h3>
                        <span className="phase-status">Q2 2027</span>
                      </div>
                      <p>Utilizing semantic search and OCR models to automatically scan uploaded worksheets, extract text, and index files into their respective classes/timeline nodes.</p>
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
        ) : (
          /* Authentication Screen (Login & Signup) */
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

      {/* Footer */}
      <footer className="main-footer">
        <div className="container">
          <p>&copy; 2026 EduVault. All rights reserved. Secure Digital Workspace Visionary.</p>
        </div>
      </footer>

      {/* Notification Toast */}
      <div className={`toast ${toast.show ? 'show' : ''}`}>
        {getToastIcon(toast.icon)}
        <span>{toast.message}</span>
      </div>
    </div>
  );
}

export default App;
