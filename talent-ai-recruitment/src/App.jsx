import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { jobsAPI, applicationsAPI, transformJobToFrontend, transformCandidateToFrontend, statsAPI, aiAPI, lookupsAPI, uploadAPI, departmentsAPI, roleTypesAPI, workSetupsAPI, usersAPI, tasksAPI, assignmentsAPI, interviewsAPI, emailAPI, rolesAPI } from './services/api';

// API Base URL for direct fetch calls
const API_BASE = 'http://localhost:5001/api';

// ============================================
// AI Planet - AI-Powered Recruitment Platform
// Redesigned Applications Section
// ============================================

// Custom styles for Tiptap editor
const tiptapStyles = `
  .tiptap-editor {
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    overflow: hidden;
  }
  .tiptap-toolbar {
    display: flex;
    gap: 4px;
    padding: 8px 12px;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    flex-wrap: wrap;
  }
  .tiptap-toolbar button {
    padding: 6px 10px;
    border: none;
    background: transparent;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    color: #64748b;
    transition: all 0.15s;
  }
  .tiptap-toolbar button:hover {
    background: #e2e8f0;
    color: #334155;
  }
  .tiptap-toolbar button.is-active {
    background: #6366f1;
    color: white;
  }
  .tiptap-content {
    padding: 12px 16px;
    min-height: 120px;
    font-family: 'Work Sans', system-ui, -apple-system, sans-serif;
    font-size: 14px;
    line-height: 1.6;
  }
  .tiptap-content:focus {
    outline: none;
  }
  .tiptap-content p {
    margin-bottom: 0.75em;
  }
  .tiptap-content ul, .tiptap-content ol {
    padding-left: 1.5em;
    margin: 0.5em 0;
  }
  .tiptap-content ul {
    list-style-type: disc;
  }
  .tiptap-content ol {
    list-style-type: decimal;
  }
  .tiptap-content li {
    margin-bottom: 4px;
  }
  .tiptap-content a {
    color: #6366f1;
    text-decoration: underline;
  }
  .tiptap-content p.is-editor-empty:first-child::before {
    color: #94a3b8;
    content: attr(data-placeholder);
    float: left;
    height: 0;
    pointer-events: none;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Styles for rendered HTML content in job details */
  .html-content ul, .html-content ol {
    padding-left: 1.5em;
    margin: 0.5em 0;
  }
  .html-content ul {
    list-style-type: disc;
  }
  .html-content ol {
    list-style-type: decimal;
  }
  .html-content li {
    margin-bottom: 8px;
  }
  .html-content p {
    margin-bottom: 0.75em;
  }
  .html-content p:last-child {
    margin-bottom: 0;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleTag = document.getElementById('tiptap-custom-styles') || document.createElement('style');
  styleTag.id = 'tiptap-custom-styles';
  styleTag.textContent = tiptapStyles;
  if (!document.getElementById('tiptap-custom-styles')) {
    document.head.appendChild(styleTag);
  }
}

// Tiptap Rich Text Editor Component
const RichTextEditor = ({ value, onChange, placeholder, minHeight = 120 }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      Underline,
      Link.configure({ openOnClick: false }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'tiptap-content',
        style: `min-height: ${minHeight}px`,
      },
    },
  });

  // Update content when value prop changes externally
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '');
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className="tiptap-editor">
      <div className="tiptap-toolbar">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'is-active' : ''}
        >
          <b>B</b>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'is-active' : ''}
        >
          <i>I</i>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={editor.isActive('underline') ? 'is-active' : ''}
        >
          <u>U</u>
        </button>
        <span style={{ width: 1, background: '#e2e8f0', margin: '0 4px' }} />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'is-active' : ''}
        >
          &bull; List
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'is-active' : ''}
        >
          1. List
        </button>
        <span style={{ width: 1, background: '#e2e8f0', margin: '0 4px' }} />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}
        >
          H3
        </button>
        <span style={{ width: 1, background: '#e2e8f0', margin: '0 4px' }} />
        <button
          type="button"
          onClick={() => {
            const url = window.prompt('Enter URL:');
            if (url) {
              editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
            }
          }}
          className={editor.isActive('link') ? 'is-active' : ''}
        >
          🔗 Link
        </button>
        {editor.isActive('link') && (
          <button
            type="button"
            onClick={() => editor.chain().focus().unsetLink().run()}
          >
            ❌ Unlink
          </button>
        )}
        <button
          type="button"
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          style={{ marginLeft: 'auto' }}
        >
          Clear
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
};

// Journey Tab Component - Fetches and displays application journey from database
const JourneyTab = ({ applicationId, candidateName }) => {
  const [journey, setJourney] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchJourney = async () => {
      if (!applicationId) return;
      setLoading(true);
      setError(null);
      try {
        const data = await applicationsAPI.getJourney(applicationId);
        setJourney(data);
      } catch (err) {
        console.error('Failed to fetch journey:', err);
        setError('Failed to load journey data');
      } finally {
        setLoading(false);
      }
    };
    fetchJourney();
  }, [applicationId]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
        <div style={{ fontSize: 24, marginBottom: 12, animation: 'spin 1s linear infinite' }}>⏳</div>
        <div>Loading journey...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: '#ef4444', background: '#fef2f2', borderRadius: 12 }}>
        <div style={{ fontSize: 24, marginBottom: 12 }}>❌</div>
        <div>{error}</div>
      </div>
    );
  }

  if (!journey || !journey.journey || journey.journey.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: '#64748b', background: '#f8fafc', borderRadius: 12, border: '2px dashed #e2e8f0' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🛤️</div>
        <div style={{ fontWeight: 500 }}>No journey data yet</div>
        <div style={{ fontSize: 13, marginTop: 4 }}>Journey milestones will appear here as the candidate progresses</div>
      </div>
    );
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div style={{ maxWidth: 700 }}>
      {/* Summary Header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 12,
        marginBottom: 24,
        padding: 16,
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        borderRadius: 12,
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#1e293b' }}>{journey.totalDays || 0}</div>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500, textTransform: 'uppercase' }}>Days in Pipeline</div>
        </div>
        <div style={{ textAlign: 'center', borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: journey.currentStage?.stage === 'rejected' ? '#ef4444' : journey.currentStage?.stage === 'hired' ? '#10b981' : '#6366f1' }}>
            {journey.currentStage?.stageName || 'Unknown'}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500, textTransform: 'uppercase' }}>Current Stage</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#1e293b' }}>{journey.journey?.length || 0}</div>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500, textTransform: 'uppercase' }}>Milestones</div>
        </div>
      </div>

      {/* Rejection Banner if rejected */}
      {journey.currentStage?.stage === 'rejected' && journey.rejectionReason && (
        <div style={{
          padding: 16,
          background: '#fef2f2',
          border: '2px solid #fecaca',
          borderRadius: 12,
          marginBottom: 20
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 20 }}>❌</span>
            <span style={{ fontWeight: 600, color: '#991b1b', fontSize: 14 }}>Application Rejected</span>
            <span style={{ fontSize: 12, color: '#b91c1c', marginLeft: 'auto' }}>{formatDate(journey.rejectionDate)}</span>
          </div>
          <div style={{ fontSize: 13, color: '#7f1d1d', lineHeight: 1.5, padding: '8px 12px', background: '#fee2e2', borderRadius: 8 }}>
            <strong>Reason:</strong> {journey.rejectionReason}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div style={{ position: 'relative', paddingLeft: 32 }}>
        {/* Timeline line */}
        <div style={{
          position: 'absolute',
          left: 11,
          top: 24,
          bottom: 24,
          width: 2,
          background: 'linear-gradient(to bottom, #e2e8f0, #cbd5e1)'
        }} />

        {journey.journey.map((event, idx) => (
          <div key={idx} style={{ position: 'relative', marginBottom: 16 }}>
            {/* Timeline dot */}
            <div style={{
              position: 'absolute',
              left: -32,
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: event.color || '#6366f1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 12,
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              border: '2px solid white'
            }}>
              {event.icon || '📋'}
            </div>

            {/* Event Card */}
            <div style={{
              background: event.type === 'rejected' || event.type === 'rejection_comment'
                ? '#fef2f2'
                : event.type === 'hired'
                ? '#f0fdf4'
                : '#ffffff',
              padding: 14,
              borderRadius: 10,
              border: `1px solid ${
                event.type === 'rejected' || event.type === 'rejection_comment'
                  ? '#fecaca'
                  : event.type === 'hired'
                  ? '#bbf7d0'
                  : '#e2e8f0'
              }`,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>{event.title}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{formatDate(event.timestamp)}</div>
                </div>
                <span style={{
                  padding: '3px 8px',
                  background: (event.color || '#6366f1') + '15',
                  color: event.color || '#6366f1',
                  borderRadius: 6,
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: 'uppercase'
                }}>
                  {event.stageName}
                </span>
              </div>

              {/* Description */}
              {event.description && (
                <div style={{
                  fontSize: 13,
                  color: '#475569',
                  lineHeight: 1.5,
                  marginTop: 8,
                  padding: '8px 10px',
                  background: '#f8fafc',
                  borderRadius: 6,
                  borderLeft: `3px solid ${event.color || '#6366f1'}`
                }}>
                  {event.description}
                </div>
              )}

              {/* Additional Details */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 10 }}>
                {event.movedBy && (
                  <div style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>👤</span> {event.movedBy}
                  </div>
                )}
                {event.author && (
                  <div style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>👤</span> {event.author}
                  </div>
                )}
                {event.durationDays > 0 && (
                  <div style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>⏱️</span> {event.durationDays} day{event.durationDays !== 1 ? 's' : ''} in stage
                  </div>
                )}
                {event.interviewer && (
                  <div style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>🎤</span> {event.interviewer}
                  </div>
                )}
                {event.platform && (
                  <div style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>💻</span> {event.platform}
                  </div>
                )}
                {event.duration && (
                  <div style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>⏰</span> {event.duration} min
                  </div>
                )}
                {event.status && event.type === 'interview' && (
                  <span style={{
                    padding: '2px 6px',
                    background: event.status === 'completed' ? '#dcfce7' : event.status === 'cancelled' ? '#fee2e2' : '#fef3c7',
                    color: event.status === 'completed' ? '#166534' : event.status === 'cancelled' ? '#991b1b' : '#92400e',
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 600
                  }}>
                    {event.status}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Route to view mapping
const routeToView = {
  '/': 'login',
  '/login': 'login',
  '/dashboard': 'dash',
  '/jobs': 'jobs',
  '/applications': 'pipeline',
  '/tasks': 'tasks',
  '/assignments': 'assignments',
  '/import': 'import',
  '/settings': 'settings',
  '/admin': 'admin',
};

// Helper to determine view based on URL path
const getViewFromPath = (pathname) => {
  if (pathname.match(/^\/apply\/[^/]+\/submit$/)) return 'apply';
  if (pathname.startsWith('/apply/')) return 'publicJobDetails';
  if (pathname.startsWith('/applications/candidate/')) return 'profile';
  if (pathname.startsWith('/jobs/')) return 'jobs';
  return routeToView[pathname] || 'login';
};

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  // ==================
  // State Management
  // ==================

  // Derive view from URL path
  const view = useMemo(() => getViewFromPath(location.pathname), [location.pathname]);
  const [isLoadingPublicJob, setIsLoadingPublicJob] = useState(() => window.location.pathname.startsWith('/apply/'));

  const [candidate, setCandidate] = useState(null);
  const [modal, setModal] = useState(null);
  const [candidateDetailTab, setCandidateDetailTab] = useState('overview');
  const [toast, setToast] = useState('');
  const [tab, setTab] = useState('All');
  const [done, setDone] = useState([]);
  const [url, setUrl] = useState('');
  const [msg, setMsg] = useState('');
  const [currentUser, setCurrentUser] = useState(() => {
    // Restore user from localStorage on page load
    const savedUser = localStorage.getItem('currentUser');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');

  // Registered users (loaded from database)
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Track if lookups have been fetched (to avoid overwriting local changes)
  const lookupsFetchedRef = useRef(false);
  const usersFetchedRef = useRef(false);
  const rolesFetchedRef = useRef(false);

  // Handle login - uses API to validate credentials
  const handleLogin = async () => {
    if (!loginForm.email || !loginForm.password) {
      setLoginError('Please enter email and password');
      return;
    }

    try {
      // Try API login first
      const user = await usersAPI.login(loginForm.email, loginForm.password);
      const userData = { id: user.id, name: user.name, email: user.email, role: user.role };
      setCurrentUser(userData);
      localStorage.setItem('currentUser', JSON.stringify(userData)); // Persist to localStorage
      setLoginError('');
      setLoginForm({ email: '', password: '' });
      navigate('/dashboard');
      pop(`Welcome back, ${user.name}!`);
    } catch (error) {
      console.error('Login error:', error);
      // Check specific error messages
      if (error.message?.includes('inactive')) {
        setLoginError('Your account is inactive. Please contact administrator.');
      } else if (error.message?.includes('Invalid')) {
        setLoginError('Invalid email or password');
      } else {
        // Fallback to local check for offline/error scenarios
        const localUser = registeredUsers.find(
          u => u.email.toLowerCase() === loginForm.email.toLowerCase() && u.password === loginForm.password
        );
        if (localUser && localUser.status === 'Active') {
          const userData = { id: localUser.id, name: localUser.name, email: localUser.email, role: localUser.role };
          setCurrentUser(userData);
          localStorage.setItem('currentUser', JSON.stringify(userData));
          setLoginError('');
          setLoginForm({ email: '', password: '' });
          navigate('/dashboard');
          pop(`Welcome back, ${localUser.name}!`);
        } else if (localUser && localUser.status === 'Inactive') {
          setLoginError('Your account is inactive. Please contact administrator.');
        } else {
          setLoginError('Invalid email or password');
        }
      }
    }
  };

  // Handle logout
  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser'); // Clear from localStorage
    navigate('/login');
    lookupsFetchedRef.current = false; // Reset so lookups are fetched fresh on next login
    usersFetchedRef.current = false; // Reset users ref
    rolesFetchedRef.current = false; // Reset roles ref
    pop('Logged out successfully');
  };
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);

  // Dashboard filters
  const [dateFilter, setDateFilter] = useState('This Month');
  const [deptFilter, setDeptFilter] = useState('All Departments');
  const [statusFilter, setStatusFilter] = useState('All Status');

  // Applications view state
  const [applicationsView, setApplicationsView] = useState('list'); // 'list' or 'pipeline'
  const [selectedStage, setSelectedStage] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [jobFilter, setJobFilter] = useState('all');
  const [scoreFilter, setScoreFilter] = useState('all');
  const [attentionFilter, setAttentionFilter] = useState(false);
  const [hotApplicantFilter, setHotApplicantFilter] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [adminCurrentPage, setAdminCurrentPage] = useState(1);
  const [adminItemsPerPage, setAdminItemsPerPage] = useState(10);
  const [jobCurrentPage, setJobCurrentPage] = useState(1);
  const [jobItemsPerPage, setJobItemsPerPage] = useState(10);

  // Comments and rejection
  const [commentText, setCommentText] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);

  // Stage transition warning and reversion
  const [showStageWarning, setShowStageWarning] = useState(false);
  const [pendingStageMove, setPendingStageMove] = useState(null);
  const [showRevertStageModal, setShowRevertStageModal] = useState(false);
  const [revertReason, setRevertReason] = useState('');
  const [revertTargetStage, setRevertTargetStage] = useState('');

  // Task assignment
  const [assignedTo, setAssignedTo] = useState(null);
  const [taskAssignments, setTaskAssignments] = useState([]);

  // Task completion modal
  const [showTaskCompleteModal, setShowTaskCompleteModal] = useState(false);
  const [completingTask, setCompletingTask] = useState(null);
  const [taskCompleteAction, setTaskCompleteAction] = useState('complete_only'); // 'complete_only' | 'move_and_assign'
  const [nextStageSelection, setNextStageSelection] = useState('');
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState(null);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  // Interview scheduling
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [interviewCandidate, setInterviewCandidate] = useState(null);
  const [interviewForm, setInterviewForm] = useState({
    title: '',
    date: '',
    time: '',
    interviewer: '',
    duration: '60',
    locationType: 'online',
    platform: 'Google Meet',
    meetingLink: '',
    address: '',
    notes: ''
  });

  // Screening call scheduling
  const [showScreeningModal, setShowScreeningModal] = useState(false);
  const [showScreeningPreview, setShowScreeningPreview] = useState(false);
  const [screeningForm, setScreeningForm] = useState({
    date: '',
    time: '',
    interviewer: '',
    interviewerEmail: '',
    duration: '30',
    platform: 'Google Meet',
    meetingLink: '',
    notes: '',
    agenda: ''
  });
  const [draggedCandidate, setDraggedCandidate] = useState(null);
  const [kanbanEnabled, setKanbanEnabled] = useState(true);
  const [showInterviewEmailPreview, setShowInterviewEmailPreview] = useState(false);
  const [candidateInterviews, setCandidateInterviews] = useState([]); // Interviews from database
  const [candidateAssignments, setCandidateAssignments] = useState([]); // Assignments from database
  const [showAssignmentReviewModal, setShowAssignmentReviewModal] = useState(false);
  const [assignmentToReview, setAssignmentToReview] = useState(null);
  const [showDeleteAssignmentModal, setShowDeleteAssignmentModal] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState(null);
  const [showAssignmentDetailsModal, setShowAssignmentDetailsModal] = useState(false);
  const [assignmentToView, setAssignmentToView] = useState(null);
  const [assignmentReviewForm, setAssignmentReviewForm] = useState({
    rating: 0,
    feedback: '',
    status: 'passed' // 'passed' or 'failed'
  });

  // Offer modal
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerCandidate, setOfferCandidate] = useState(null);
  const [offerForm, setOfferForm] = useState({
    offerType: 'text', // 'text' | 'pdf' | 'word'
    salary: '',
    salaryCurrency: 'INR',
    bonus: '',
    equity: '',
    benefits: '',
    startDate: '',
    expiryDate: '',
    offerContent: '',
    termsAndConditions: '',
    internalNotes: ''
  });
  const [offerFile, setOfferFile] = useState(null);
  const [sendingOffer, setSendingOffer] = useState(false);
  const [candidateOffer, setCandidateOffer] = useState(null); // Current offer for selected candidate

  // Interview Pass/Fail confirmation modals
  const [showInterviewPassConfirm, setShowInterviewPassConfirm] = useState(false);
  const [showInterviewFailConfirm, setShowInterviewFailConfirm] = useState(false);
  const [confirmInterviewData, setConfirmInterviewData] = useState(null); // { interview, candidate }

  // Pipeline view layout
  const [activeStage, setActiveStage] = useState('shortlisting');
  const [pipelineLayout, setPipelineLayout] = useState('tabs'); // 'tabs' | 'kanban'

  // Admin-managed options - fetched from API via fetchLookups()
  const [departments, setDepartments] = useState([]);
  const [roleTypes, setRoleTypes] = useState([]);
  const [workSetups, setWorkSetups] = useState([]);
  const [graduationYearRange, setGraduationYearRange] = useState({
    fromYear: new Date().getFullYear() - 5,
    toYear: new Date().getFullYear() + 3
  });
  const [referralSources, setReferralSources] = useState([
    'LinkedIn',
    'Naukri',
    'Masai School',
    'Internshala',
    'Company Website',
    'Referral',
    'Others'
  ]);

  // Default About Company text for AI Planet
  const defaultAboutCompany = `<p>AI Planet was started in 2020 with a vision of making AI accessible to everyone. Thriving on a 300K+ Global AI community, we've launched an AI marketplace and a Generative AI stack, ensuring secure and private AI integration for all. In the process, we've empowered large enterprises/SMEs in adopting AI into their products while also offering free AI training that has benefited our vast community.</p>
<p>In endeavor to give back to the community, AI Planet has recently open sourced its GenAI Stack and cutting edge LLMs - effi-7b and effi-13b, which outperform llama7b, falcon7b and other prominent LLMs.</p>
<p>At its core, AI Planet's mission is to shape the future and solve key challenges of humanity with its thriving community of AI experts and enthusiasts. It currently has strategic partnerships with government innovation agencies, including Luxembourg Government's Fit4Start & Belgium Government's VLAIO & Start-up Chile, as well as key acquisitions such as Learn.MachineLearning with its commitment to giving back to the community and bringing innovative solutions to the world.</p>`;

  // Form states for modals
  const [jobForm, setJobForm] = useState({
    title: '',
    dept: 'Engineering',
    location: '',
    aboutCompany: defaultAboutCompany,
    jobOverview: '',
    keyResponsibilities: '',
    qualifications: '',
    preferredQualifications: '',
    roleType: 'Full-time',
    workSetup: 'Remote',
    salaryMin: '',
    salaryMax: '',
    experienceMin: '',
    experienceMax: '',
    skills: '',
    benefits: '',
    applicationDeadline: ''
  });
  const [candidateForm, setCandidateForm] = useState({
    name: '',
    email: '',
    phone: '',
    job: '',
    graduationYear: '',
    resume: null,
    additionalDocs: [],
    availability: 'immediately',
    noticePeriod: '',
    referralSource: '',
    motivation: '',
    linkedIn: '',
    github: ''
  });
  const [adminForm, setAdminForm] = useState({ name: '', email: '', role: 'HR', password: '' });
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [newDepartment, setNewDepartment] = useState('');
  const [newRoleType, setNewRoleType] = useState('');
  const [newWorkSetup, setNewWorkSetup] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [selectedJobForEdit, setSelectedJobForEdit] = useState(null);

  // Public application form state
  const [applicationForm, setApplicationForm] = useState({
    name: '',
    email: '',
    phone: '',
    resume: null,
    additionalDocs: [],
    availability: 'immediately',
    noticePeriod: '',
    graduationYear: '',
    referralSource: '',
    motivation: '',
    linkedIn: '',
    github: '',
    jobId: null
  });

  // Application preview state
  const [showApplicationPreview, setShowApplicationPreview] = useState(false);
  const [showApplicationSuccess, setShowApplicationSuccess] = useState(false);
  const [submittedApplicationData, setSubmittedApplicationData] = useState(null);
  const [isSubmittingApplication, setIsSubmittingApplication] = useState(false);

  // User roles for RBAC - fetched from database
  const [userRoles, setUserRoles] = useState([]);
  const [availablePermissions, setAvailablePermissions] = useState([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [newRolePermissions, setNewRolePermissions] = useState([]);
  const [newRoleColor, setNewRoleColor] = useState('#6366f1');
  const [newReferralSource, setNewReferralSource] = useState('');

  // Loading states for API data
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [isRunningAIScore, setIsRunningAIScore] = useState(false);
  const [isGeneratingJD, setIsGeneratingJD] = useState(false);
  const useRealData = true; // Always use real data from API
  const [dashboardStats, setDashboardStats] = useState({
    activeJobs: 0,
    totalCandidates: 0,
    totalApplications: 0,
    hotApplicants: 0,
    avgAIScore: 0,
  });

  // ==================
  // Data Fetching
  // ==================

  // Fetch jobs from API (with application counts for admin view)
  const fetchJobs = async (includeApplicationCounts = true) => {
    if (!useRealData) return;
    setIsLoadingJobs(true);
    try {
      const jobs = await jobsAPI.getAll();
      if (jobs && jobs.length > 0) {
        const transformedJobs = jobs.map(transformJobToFrontend);

        // For admin view, get application counts
        if (includeApplicationCounts) {
          const applications = await applicationsAPI.getAll();
          const jobsWithCounts = transformedJobs.map(job => {
            const jobApplications = applications.filter(app => app.job?.id === job._original?.id);
            const goodApplications = jobApplications.filter(app => app.ai_score >= 70);
            return {
              ...job,
              count: jobApplications.length,
              good: goodApplications.length,
            };
          });
          setOpenings(jobsWithCounts);
          console.log('✅ Loaded', jobsWithCounts.length, 'jobs from database');
        } else {
          // For public view, just set jobs without counts
          setOpenings(transformedJobs);
          console.log('✅ Loaded', transformedJobs.length, 'jobs for public view');
        }
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
      // Keep existing mock data on error
    } finally {
      setIsLoadingJobs(false);
    }
  };

  // Fetch candidates/applications from API
  const fetchCandidates = async () => {
    if (!useRealData) return;
    setIsLoadingCandidates(true);
    try {
      const applications = await applicationsAPI.getAll();
      if (applications && applications.length > 0) {
        const transformedCandidates = applications.map(transformCandidateToFrontend);
        setPeople(transformedCandidates);
        console.log('✅ Loaded', transformedCandidates.length, 'candidates from database');
      }
    } catch (error) {
      console.error('Error fetching candidates:', error);
      // Keep existing mock data on error
    } finally {
      setIsLoadingCandidates(false);
    }
  };

  // Fetch dashboard stats
  const fetchDashboardStats = async () => {
    if (!useRealData) return;
    try {
      const stats = await statsAPI.getDashboardStats();
      setDashboardStats(stats);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  // Fetch lookup data (departments, role types, work setups)
  const fetchLookups = async () => {
    try {
      const lookups = await lookupsAPI.getAll();
      if (lookups.departments?.length > 0) {
        setDepartments(lookups.departments.map(d => ({ ...d, active: d.is_active !== false })));
      }
      if (lookups.roleTypes?.length > 0) {
        setRoleTypes(lookups.roleTypes.map(r => ({ ...r, active: r.is_active !== false })));
      }
      if (lookups.workSetups?.length > 0) {
        setWorkSetups(lookups.workSetups.map(w => ({ ...w, active: w.is_active !== false })));
      }
      if (lookups.referralSources?.length > 0) {
        setReferralSources(lookups.referralSources);
      }
    } catch (error) {
      console.error('Error fetching lookups:', error);
    }
  };

  // Fetch users from database
  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const users = await usersAPI.getAll();
      setRegisteredUsers(users);
      console.log('✅ Loaded', users.length, 'users from database');
    } catch (error) {
      console.error('Error fetching users:', error);
      // If no users exist, seed the default admin
      try {
        console.log('🌱 Seeding default super admin...');
        await usersAPI.seedAdmin();
        const users = await usersAPI.getAll();
        setRegisteredUsers(users);
      } catch (seedError) {
        console.error('Error seeding admin:', seedError);
      }
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Fetch user roles from database
  const fetchRoles = async () => {
    setIsLoadingRoles(true);
    try {
      const [roles, permissions] = await Promise.all([
        rolesAPI.getAll(),
        rolesAPI.getPermissions()
      ]);
      setUserRoles(roles);
      setAvailablePermissions(permissions);
      console.log('✅ Loaded', roles.length, 'roles from database');
    } catch (error) {
      console.error('Error fetching roles:', error);
      // If no roles exist, seed the default roles
      try {
        console.log('🌱 Seeding default roles...');
        await rolesAPI.seed();
        const [roles, permissions] = await Promise.all([
          rolesAPI.getAll(),
          rolesAPI.getPermissions()
        ]);
        setUserRoles(roles);
        setAvailablePermissions(permissions);
      } catch (seedError) {
        console.error('Error seeding roles:', seedError);
      }
    } finally {
      setIsLoadingRoles(false);
    }
  };

  // Fetch task assignments from database
  const fetchTasks = async () => {
    try {
      const tasks = await tasksAPI.getAll();
      // Transform to match the existing taskAssignments format
      const transformedTasks = tasks.map(task => ({
        id: task.id,
        candidateName: task.candidate_name,
        candidateRole: task.candidate_role,
        stage: task.stage,
        assignedTo: task.assigned_to,
        assignedBy: task.assigned_by,
        assignedDate: task.assigned_date,
        status: task.status,
        notes: task.notes,
        applicationId: task.application_id,
        candidateId: task.candidate_id,
        completedDate: task.completed_date,
        completedBy: task.completed_by,
      }));
      setTaskAssignments(transformedTasks);
      console.log('✅ Loaded', tasks.length, 'tasks from database');
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  // Fetch AI recommendations for Tasks page
  const fetchAIRecommendations = async () => {
    setLoadingRecommendations(true);
    try {
      const data = await aiAPI.getRecommendations(currentUser?.name);
      setAiRecommendations(data);
      console.log('✅ Loaded AI recommendations');
    } catch (error) {
      console.error('Error fetching AI recommendations:', error);
      // Set empty recommendations on error
      setAiRecommendations({ recommendations: [], insights: [], stats: {} });
    } finally {
      setLoadingRecommendations(false);
    }
  };

  // Fetch assignment templates from database
  const fetchAssignments = async () => {
    try {
      const templates = await assignmentsAPI.getTemplates();
      setAssignments(templates);
      console.log('✅ Loaded', templates.length, 'assignment templates from database');
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  // Refresh data after actions - updates candidates list and selected candidate
  const refreshData = async (selectedCandidateId = null) => {
    if (!useRealData) return;
    try {
      const applications = await applicationsAPI.getAll();
      if (applications && applications.length > 0) {
        const transformedCandidates = applications.map(transformCandidateToFrontend);
        setPeople(transformedCandidates);

        // Update selected candidate if one is selected
        const candidateIdToUpdate = selectedCandidateId || selectedCandidate?.id;
        if (candidateIdToUpdate) {
          const updatedCandidate = transformedCandidates.find(c => c.id === candidateIdToUpdate);
          if (updatedCandidate) {
            setSelectedCandidate(updatedCandidate);
          }
        }
        console.log('🔄 Data refreshed');
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  // Load data when app loads (after login or for public routes)
  useEffect(() => {
    const isPublicRoute = window.location.pathname.startsWith('/apply/');
    const isLoggedIn = view !== 'login' && view !== 'publicJobDetails';

    if (useRealData) {
      // For public routes, just fetch jobs (without application counts)
      if (isPublicRoute || view === 'publicJobDetails') {
        fetchJobs(false); // Skip application counts for public view
      }
      // For logged-in users, fetch everything
      if (isLoggedIn) {
        fetchJobs(true); // Include application counts for admin
        fetchCandidates();
        fetchDashboardStats();
        fetchTasks(); // Load task assignments
        fetchAssignments(); // Load assignment templates
        fetchAIRecommendations(); // Load AI recommendations for tasks
        // Only fetch lookups and users once to avoid overwriting local changes
        if (!lookupsFetchedRef.current) {
          lookupsFetchedRef.current = true;
          fetchLookups();
        }
        if (!usersFetchedRef.current) {
          usersFetchedRef.current = true;
          fetchUsers();
        }
        if (!rolesFetchedRef.current) {
          rolesFetchedRef.current = true;
          fetchRoles();
        }
      }
    }
  }, [view, useRealData]);

  // Run AI Score for a candidate
  const runAIScore = async (candidate) => {
    if (!candidate) return;

    setIsRunningAIScore(true);
    try {
      // Get the resume text - in real scenario this would come from the candidate's resume
      const resumeText = candidate.resumeText || `
        Candidate: ${candidate.name}
        Email: ${candidate.email}
        Location: ${candidate.location}
        Experience: ${candidate.experience || '3+ years'}
        Skills: React, JavaScript, TypeScript, Node.js, Python
        LinkedIn: ${candidate.linkedIn || 'N/A'}
        Portfolio: ${candidate.portfolio || 'N/A'}
      `;

      // Get job ID from real data or find matching job from openings
      let jobId = candidate._original?.job_id || candidate._original?.job?.id;

      // If no real job ID, try to find a matching job from openings
      if (!jobId) {
        const matchingJob = openings.find(j => j.name === candidate.role);
        jobId = matchingJob?._original?.id || matchingJob?.id;
      }

      if (!jobId) {
        pop('Cannot score: No job ID found for this candidate');
        setIsRunningAIScore(false);
        return;
      }

      const applicationId = candidate._original?.id || candidate.id;

      const result = await aiAPI.scoreResume(resumeText, jobId, applicationId);

      if (result.success) {
        // API returns 'analysis' not 'data'
        const aiData = result.analysis;

        // Build a comprehensive AI reason from the analysis
        const aiReason = aiData.summary ||
          (aiData.recommendations?.length > 0 ? aiData.recommendations.join(' ') : null) ||
          `Profile Strength: ${aiData.profileStrength}. ` +
          `Strengths: ${aiData.strengths?.slice(0, 2).join(', ') || 'N/A'}. ` +
          `Areas to improve: ${aiData.weaknesses?.slice(0, 2).join(', ') || 'N/A'}.`;

        // Update the selected candidate with new AI score
        setSelectedCandidate(prev => ({
          ...prev,
          aiScore: aiData.score,
          aiReason: aiReason,
          profileStrength: aiData.profileStrength,
          aiAnalysis: aiData
        }));

        // Update in the people array as well
        setPeople(prev => prev.map(p =>
          p.id === candidate.id
            ? {
                ...p,
                aiScore: aiData.score,
                aiReason: aiReason,
                profileStrength: aiData.profileStrength
              }
            : p
        ));

        const message = result.fallback
          ? `Quick Score: ${aiData.score}/100 (AI unavailable)`
          : `AI Score: ${aiData.score}/100`;
        pop(message);
      } else {
        pop('Failed to get AI score. Please try again.');
      }
    } catch (error) {
      console.error('AI Scoring error:', error);
      // Check for specific error types
      if (error.message?.includes('402') || error.message?.includes('Payment')) {
        pop('OpenAI API error: Check API key credits/billing');
      } else if (error.message?.includes('429')) {
        pop('Rate limited. Please wait a moment and try again.');
      } else {
        pop('Error running AI score. Check console for details.');
      }
    } finally {
      setIsRunningAIScore(false);
    }
  };

  // ==================
  // Data
  // ==================
  const [notes, setNotes] = useState([]);

  // Assignments Management
  const [assignments, setAssignments] = useState([]);

  const [assignmentForm, setAssignmentForm] = useState({
    name: '',
    jobTypes: [],
    instructions: '',
    link: '',
    files: [],
    deadline: '3 days'
  });

  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [selectedAssignmentToSend, setSelectedAssignmentToSend] = useState(null);
  const [customAssignmentInstructions, setCustomAssignmentInstructions] = useState('');
  const [emailPreview, setEmailPreview] = useState(null);

  // Initialize with empty array - real data will be fetched from API
  const [openings, setOpenings] = useState([]);

  // Initialize with empty array - real data will be fetched from API
  const [people, setPeople] = useState([]);

  // Application stages based on the hiring journey
  const stages = [
    { id: 'shortlisting', name: 'Shortlisting', color: '#94a3b8', icon: '📋' },
    { id: 'screening', name: 'Screening Call', color: '#0ea5e9', icon: '📞' },
    { id: 'assignment-sent', name: 'Assignment Sent', color: '#8b5cf6', icon: '📝' },
    { id: 'assignment-submitted', name: 'Assignment Submitted', color: '#a855f7', icon: '✅' },
    { id: 'interview', name: 'Interviews', color: '#f59e0b', icon: '💼' },
    { id: 'offer-sent', name: 'Offer Sent', color: '#06b6d4', icon: '📧' },
    { id: 'offer-accepted', name: 'Offer Accepted', color: '#14b8a6', icon: '🤝' },
    { id: 'hired', name: 'Hired', color: '#10b981', icon: '✅' },
    { id: 'rejected', name: 'Rejected', color: '#ef4444', icon: '❌' }
  ];

  const [todos, setTodos] = useState([]);

  // Derive admins from registeredUsers - they should always be in sync
  const admins = registeredUsers.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.status,
    created: u.created
  }));

  // ==================
  // URL Routing Effect - Find and set the job for public routes
  // ==================
  useEffect(() => {
    // IMPORTANT: Don't run this effect if success modal is showing
    // This prevents resetting selectedJob after successful submission
    if (showApplicationSuccess) {
      return;
    }

    const path = window.location.pathname;
    const applyMatch = path.match(/\/apply\/(.+)/);

    // Only run for /apply/ routes
    if (!applyMatch) return;

    // Check if we have real data from database
    const hasRealData = openings.some(job => job._original?.id);
    if (!hasRealData) {
      // Still waiting for real data
      return;
    }

    const slugFromUrl = applyMatch[1];

    // Helper to generate job slug for matching
    const generateSlug = (job) => {
      const createdAt = job._original?.created_at || job.createdAt || new Date().toISOString();
      const date = createdAt.split('T')[0];
      const titleSlug = (job.name || job.title || 'job')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      return `${date}-${titleSlug}`;
    };

    // Try to find the job by various matching methods
    const job = openings.find(j => {
      // Match by generated slug (date-title format)
      if (generateSlug(j) === slugFromUrl) return true;
      // Match by exact ID (UUID or numeric)
      if (j.id === slugFromUrl || String(j.id) === slugFromUrl) return true;
      if (j._original?.id === slugFromUrl) return true;
      // Match by numeric ID
      if (!isNaN(slugFromUrl) && j.id === parseInt(slugFromUrl)) return true;
      // Match by title slug only (for flexibility)
      const titleSlug = (j.name || j.title || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      if (slugFromUrl.endsWith(titleSlug) && titleSlug.length > 3) return true;
      return false;
    });

    if (job) {
      console.log('✅ Found job for slug:', slugFromUrl, job.name);
      setSelectedJob(job);
      setApplicationForm(prev => ({ ...prev, jobId: job.id }));
      setIsLoadingPublicJob(false);
    } else {
      console.error('❌ Job not found with slug:', slugFromUrl);
      console.log('Available jobs:', openings.map(j => ({
        id: j.id,
        name: j.name,
        slug: (() => {
          const createdAt = j._original?.created_at || j.createdAt || new Date().toISOString();
          const date = createdAt.split('T')[0];
          const titleSlug = (j.name || j.title || 'job').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
          return `${date}-${titleSlug}`;
        })()
      })));
      setSelectedJob(null);
      setIsLoadingPublicJob(false);
    }
  }, [openings, showApplicationSuccess]);

  // Handle /job/ routes for job detail view
  useEffect(() => {
    const path = window.location.pathname;
    const jobDetailMatch = path.match(/\/job\/(.+)/);

    if (!jobDetailMatch) return;

    const hasRealData = openings.some(job => job._original?.id);
    if (!hasRealData) return;

    const slugFromUrl = jobDetailMatch[1];

    const job = openings.find(j => {
      if (j.id === slugFromUrl || String(j.id) === slugFromUrl) return true;
      if (j._original?.id === slugFromUrl) return true;
      const titleSlug = (j.name || j.title || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      if (slugFromUrl.endsWith(titleSlug) && titleSlug.length > 3) return true;
      return false;
    });

    if (job) {
      setSelectedJob(job);
      setModal('jobDetails');
      navigate('/jobs');
    }
  }, [openings]);

  // Fetch interviews for selected candidate
  useEffect(() => {
    const fetchCandidateInterviews = async () => {
      if (!selectedCandidate) {
        setCandidateInterviews([]);
        return;
      }

      try {
        const applicationId = selectedCandidate._original?.id || selectedCandidate.id;
        console.log('📅 Fetching interviews for application:', applicationId);
        const response = await interviewsAPI.getByApplication(applicationId);
        console.log('📅 Interview API response:', response);
        if (response.success) {
          const interviews = response.data.map((interview, idx) => ({
            id: interview.id,
            round: idx + 1,
            date: interview.scheduledDate,
            time: interview.scheduledTime,
            interviewer: interview.interviewerName,
            title: interview.title,
            duration: interview.durationMinutes?.toString() || '60',
            locationType: interview.locationType,
            platform: interview.platform,
            meetingLink: interview.meetingLink,
            address: interview.address,
            notes: interview.notes,
            feedback: interview.feedback,
            rating: interview.rating,
            status: interview.status === 'scheduled' ? 'Scheduled' :
                   interview.status === 'completed' ? 'Passed' :
                   interview.status === 'cancelled' ? 'Cancelled' : 'Scheduled'
          }));
          console.log('📅 Processed interviews:', interviews);
          setCandidateInterviews(interviews);

          // Update the selectedCandidate's interviewRounds
          setSelectedCandidate(prev => prev ? { ...prev, interviewRounds: interviews } : prev);

          // Also update the people array so it persists when panel is reopened
          setPeople(prevPeople => prevPeople.map(p =>
            p.id === selectedCandidate.id
              ? { ...p, interviewRounds: interviews }
              : p
          ));
        }
      } catch (error) {
        console.error('Error fetching interviews:', error);
        setCandidateInterviews([]);
      }
    };

    fetchCandidateInterviews();
  }, [selectedCandidate?.id]);

  // Helper function to fetch assignments for a candidate
  const fetchAssignmentsForCandidate = async (candidate) => {
    if (!candidate) {
      setCandidateAssignments([]);
      return;
    }

    try {
      const applicationId = candidate._original?.id || candidate.id;
      console.log('📝 Fetching assignments for application:', applicationId);
      const assignments = await assignmentsAPI.getByApplication(applicationId);
      console.log('📝 Fetched assignments:', assignments, 'count:', assignments?.length || 0);
      setCandidateAssignments(assignments || []);

      // Update selectedCandidate with assignment info
      if (assignments && assignments.length > 0) {
        const latestAssignment = assignments[0]; // Most recent
        setSelectedCandidate(prev => prev ? {
          ...prev,
          assignmentSent: true,
          assignmentName: latestAssignment.assignmentName,
          assignmentDeadline: latestAssignment.deadlineDate,
          assignmentStatus: latestAssignment.status,
          assignmentSentAt: latestAssignment.sentAt
        } : prev);

        // Also update the people array
        setPeople(prevPeople => prevPeople.map(p =>
          p.id === candidate.id
            ? {
                ...p,
                assignmentSent: true,
                assignmentName: latestAssignment.assignmentName,
                assignmentDeadline: latestAssignment.deadlineDate,
                assignmentStatus: latestAssignment.status,
                assignmentSentAt: latestAssignment.sentAt
              }
            : p
        ));
      } else {
        console.log('📝 No assignments found for this candidate');
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
      setCandidateAssignments([]);
    }
  };

  // Fetch assignments for selected candidate - fetch whenever candidate changes or candidateDetails modal opens
  useEffect(() => {
    // Fetch when candidate changes, or when candidateDetails/selectAssignment modal opens
    if (selectedCandidate?.id && (modal === 'candidateDetails' || modal === 'selectAssignment' || !modal)) {
      fetchAssignmentsForCandidate(selectedCandidate);
    }
  }, [selectedCandidate?.id, modal]); // Refetch when candidate or modal changes

  // Fetch offer details for selected candidate (for offer-sent and offer-accepted stages)
  useEffect(() => {
    const fetchCandidateOffer = async () => {
      if (!selectedCandidate) {
        setCandidateOffer(null);
        return;
      }

      // Only fetch offer for candidates in offer-sent or offer-accepted stages
      if (selectedCandidate.stage !== 'offer-sent' && selectedCandidate.stage !== 'offer-accepted') {
        setCandidateOffer(null);
        return;
      }

      try {
        const applicationId = selectedCandidate.applicationId || selectedCandidate._original?.id || selectedCandidate.id;
        console.log('📧 Fetching offer for application:', applicationId);
        const response = await fetch(`${API_BASE}/offers/by-application/${applicationId}`);
        const data = await response.json();

        if (data.success && data.data.length > 0) {
          const offer = data.data[0]; // Get the most recent offer
          console.log('📧 Fetched offer:', offer);
          setCandidateOffer(offer);
        } else {
          console.log('📧 No offer found for this candidate');
          setCandidateOffer(null);
        }
      } catch (error) {
        console.error('Error fetching offer:', error);
        setCandidateOffer(null);
      }
    };

    fetchCandidateOffer();
  }, [selectedCandidate?.id, selectedCandidate?.stage]);

  // ==================
  // Helper Functions
  // ==================
  const pop = (m) => {
    setToast(m);
    setTimeout(() => setToast(''), 2500);
  };

  // Helper to extract S3 key from URL
  const extractS3KeyFromUrl = (url) => {
    if (!url) return null;
    try {
      const urlObj = new URL(url);
      // S3 URL format: https://bucket.s3.region.amazonaws.com/key
      // or signed URL with query params
      const pathname = urlObj.pathname;
      // Remove leading slash
      return pathname.startsWith('/') ? pathname.substring(1) : pathname;
    } catch {
      return null;
    }
  };

  // Helper to open S3 files with fresh signed URLs
  const openFileWithSignedUrl = async (file) => {
    let fileKey = typeof file === 'object' ? file.key : null;
    const fileUrl = typeof file === 'object' ? file.url : file;

    console.log('📁 Opening file:', { file, fileKey, fileUrl });

    // If no key but we have a URL, try to extract key from URL
    if (!fileKey && fileUrl) {
      fileKey = extractS3KeyFromUrl(fileUrl);
      console.log('📁 Extracted key from URL:', fileKey);
    }

    // If we have a key, get a fresh signed URL
    if (fileKey) {
      try {
        pop('Loading file...');
        console.log('📁 Fetching signed URL for key:', fileKey);
        const signedUrl = await uploadAPI.getSignedUrl(fileKey);
        console.log('📁 Got signed URL:', signedUrl?.substring(0, 100) + '...');
        window.open(signedUrl, '_blank');
      } catch (error) {
        console.error('Error getting signed URL:', error);
        pop('Failed to open file. The file may have been deleted.');
      }
    } else if (fileUrl) {
      // Try using the stored URL directly (legacy files)
      console.log('📁 No key available, opening URL directly:', fileUrl?.substring(0, 100));
      window.open(fileUrl, '_blank');
    } else {
      pop('No file URL available');
    }
  };

  const color = (p) => p >= 90 ? '#10b981' : p >= 80 ? '#0ea5e9' : p >= 70 ? '#f59e0b' : '#94a3b8';

  const init = (n) => n.split(' ').map(x => x[0]).join('');

  // Generate SEO-friendly job URL slug using date and title
  // Format: /apply/2026-01-03-senior-ai-engineer
  const getJobSlug = (job) => {
    // Get creation date from _original or use current date
    const createdAt = job._original?.created_at || job.createdAt || new Date().toISOString();
    const date = createdAt.split('T')[0]; // YYYY-MM-DD

    const titleSlug = (job.name || job.title || 'job')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return `${date}-${titleSlug}`;
  };

  // Get job URL for sharing
  const getJobUrl = (job) => `${window.location.origin}/apply/${getJobSlug(job)}`;

  const drop = (id) => {
    setPeople(p => p.filter(c => c.id !== id));
    pop('Candidate rejected');
    if (candidate?.id === id) { 
      setCandidate(null); 
      navigate('/applications'); 
    }
  };

  const flip = async (id) => {
    const job = openings.find(j => j.id === id);
    if (!job) return;

    const newStatus = !job.on;

    // Update local state immediately for responsiveness
    setOpenings(o => o.map(j => j.id === id ? { ...j, on: newStatus } : j));

    // Update in database
    try {
      const jobId = job._original?.id || job.id;
      await jobsAPI.toggleActive(jobId, newStatus);
      pop(newStatus ? 'Job activated!' : 'Job deactivated!');
    } catch (error) {
      // Revert on error
      setOpenings(o => o.map(j => j.id === id ? { ...j, on: !newStatus } : j));
      pop('Failed to update job status');
      console.error('Error toggling job status:', error);
    }
  };

  const send = () => {
    if (!msg.trim()) return;
    setNotes([{ id: Date.now(), by: 'Maria L.', text: msg, at: 'Just now' }, ...notes]);
    setMsg('');
    pop('Comment added!');
  };

  const bring = () => {
    if (!url.trim()) return;
    const newCandidate = { 
      id: Date.now(), 
      name: 'LinkedIn Import', 
      role: openings[0]?.name || 'General', 
      pct: 78, 
      level: 'Good', 
      step: 'applied', 
      age: 0,
      email: 'imported@email.com'
    };
    setPeople([...people, newCandidate]);
    setUrl('');
    pop('Candidate imported successfully!');
  };

  // Generate Job Description using AI
  const generateJobDescriptionAI = async () => {
    if (!jobForm.title.trim()) {
      pop('Please enter a job title first');
      return;
    }

    setIsGeneratingJD(true);
    try {
      const result = await aiAPI.generateJobDescription({
        title: jobForm.title,
        department: jobForm.dept,
        roleType: jobForm.roleType,
        workSetup: jobForm.workSetup,
        location: jobForm.location,
        experienceMin: jobForm.experienceMin,
        experienceMax: jobForm.experienceMax
      });

      if (result.success && result.jobDescription) {
        const jd = result.jobDescription;

        // Update all form fields with AI-generated content
        setJobForm(prev => ({
          ...prev,
          jobOverview: jd.jobOverview || prev.jobOverview,
          keyResponsibilities: jd.keyResponsibilities || prev.keyResponsibilities,
          qualifications: jd.qualifications || prev.qualifications,
          preferredQualifications: jd.preferredQualifications || prev.preferredQualifications,
          skills: jd.skills || prev.skills,
          benefits: jd.benefits || prev.benefits
        }));

        pop('Job description generated! Scroll down to review all sections.');
      } else {
        pop('Failed to generate job description. Please try again.');
      }
    } catch (error) {
      console.error('Error generating job description:', error);
      pop('Error generating job description. Please try again.');
    } finally {
      setIsGeneratingJD(false);
    }
  };

  const createJob = async () => {
    if (!jobForm.title.trim()) {
      pop('Please enter a job title');
      return;
    }
    if (!jobForm.jobOverview.trim()) {
      pop('Please enter a job overview');
      return;
    }

    // Find department, role type, and work setup IDs from the loaded data
    const dept = departments.find(d => d.name === jobForm.dept);
    const roleType = roleTypes.find(r => r.name === jobForm.roleType);
    const workSetup = workSetups.find(w => w.name === jobForm.workSetup);

    try {
      // Create job via API
      const jobData = {
        company_id: '00000000-0000-0000-0000-000000000001', // Default company ID
        title: jobForm.title,
        location: jobForm.location || 'Remote',
        department_id: dept?.id || null,
        role_type_id: roleType?.id || null,
        work_setup_id: workSetup?.id || null,
        about_company: jobForm.aboutCompany,
        job_overview: jobForm.jobOverview,
        key_responsibilities: jobForm.keyResponsibilities,
        qualifications: jobForm.qualifications,
        preferred_qualifications: jobForm.preferredQualifications,
        skills: jobForm.skills,
        benefits: jobForm.benefits,
        salary_min: jobForm.salaryMin ? parseInt(jobForm.salaryMin) : null,
        salary_max: jobForm.salaryMax ? parseInt(jobForm.salaryMax) : null,
        experience_min: jobForm.experienceMin ? parseInt(jobForm.experienceMin) : null,
        experience_max: jobForm.experienceMax ? parseInt(jobForm.experienceMax) : null,
        application_deadline: jobForm.applicationDeadline || null,
        is_active: true
      };

      const createdJob = await jobsAPI.create(jobData);

      // Transform to frontend format and add to openings
      const newJob = {
        id: createdJob?.id || Date.now(),
        name: jobForm.title,
        team: jobForm.dept,
        place: jobForm.location || 'Remote',
        count: 0,
        good: 0,
        on: true,
        aboutCompany: jobForm.aboutCompany,
        jobOverview: jobForm.jobOverview,
        keyResponsibilities: jobForm.keyResponsibilities,
        qualifications: jobForm.qualifications,
        preferredQualifications: jobForm.preferredQualifications,
        roleType: jobForm.roleType,
        workSetup: jobForm.workSetup,
        salaryMin: jobForm.salaryMin,
        salaryMax: jobForm.salaryMax,
        experienceMin: jobForm.experienceMin,
        experienceMax: jobForm.experienceMax,
        skills: jobForm.skills,
        benefits: jobForm.benefits,
        applicationDeadline: jobForm.applicationDeadline,
        _original: createdJob
      };

      setOpenings([...openings, newJob]);
      setJobForm({
        title: '',
        dept: 'Engineering',
        location: '',
        aboutCompany: defaultAboutCompany,
        jobOverview: '',
        keyResponsibilities: '',
        qualifications: '',
        preferredQualifications: '',
        roleType: 'Full-time',
        workSetup: 'Remote',
        salaryMin: '',
        salaryMax: '',
        experienceMin: '',
        experienceMax: '',
        skills: '',
        benefits: '',
        applicationDeadline: ''
      });
      setModal(null);
      pop('Job created successfully!');
    } catch (error) {
      console.error('Error creating job:', error);
      pop('Error creating job. Please try again.');
    }
  };

  const editJob = async () => {
    if (!jobForm.title.trim()) {
      pop('Please enter a job title');
      return;
    }
    if (!jobForm.jobOverview.trim()) {
      pop('Please enter a job overview');
      return;
    }

    // Find department, role type, and work setup IDs
    const dept = departments.find(d => d.name === jobForm.dept);
    const roleType = roleTypes.find(r => r.name === jobForm.roleType);
    const workSetup = workSetups.find(w => w.name === jobForm.workSetup);

    try {
      // Update in database
      const jobId = selectedJobForEdit._original?.id || selectedJobForEdit.id;
      const updateData = {
        title: jobForm.title,
        location: jobForm.location || 'Remote',
        department_id: dept?.id || null,
        role_type_id: roleType?.id || null,
        work_setup_id: workSetup?.id || null,
        about_company: jobForm.aboutCompany,
        job_overview: jobForm.jobOverview,
        key_responsibilities: jobForm.keyResponsibilities,
        qualifications: jobForm.qualifications,
        preferred_qualifications: jobForm.preferredQualifications,
        skills: jobForm.skills,
        benefits: jobForm.benefits,
        salary_min: jobForm.salaryMin ? parseInt(jobForm.salaryMin) : null,
        salary_max: jobForm.salaryMax ? parseInt(jobForm.salaryMax) : null,
        experience_min: jobForm.experienceMin ? parseInt(jobForm.experienceMin) : null,
        experience_max: jobForm.experienceMax ? parseInt(jobForm.experienceMax) : null,
        application_deadline: jobForm.applicationDeadline || null
      };

      const updatedJob = await jobsAPI.update(jobId, updateData);

      // Update local state
      setOpenings(openings.map(job =>
        job.id === selectedJobForEdit.id ? {
          ...job,
          name: jobForm.title,
          team: jobForm.dept,
          place: jobForm.location || 'Remote',
          aboutCompany: jobForm.aboutCompany,
          jobOverview: jobForm.jobOverview,
          keyResponsibilities: jobForm.keyResponsibilities,
          qualifications: jobForm.qualifications,
          preferredQualifications: jobForm.preferredQualifications,
          roleType: jobForm.roleType,
          workSetup: jobForm.workSetup,
          salaryMin: jobForm.salaryMin,
          salaryMax: jobForm.salaryMax,
          experienceMin: jobForm.experienceMin,
          experienceMax: jobForm.experienceMax,
          skills: jobForm.skills,
          benefits: jobForm.benefits,
          applicationDeadline: jobForm.applicationDeadline,
          _original: updatedJob || job._original
        } : job
      ));

      setJobForm({
        title: '',
        dept: 'Engineering',
        location: '',
        aboutCompany: defaultAboutCompany,
        jobOverview: '',
        keyResponsibilities: '',
        qualifications: '',
        preferredQualifications: '',
        roleType: 'Full-time',
        workSetup: 'Remote',
        salaryMin: '',
        salaryMax: '',
        experienceMin: '',
        experienceMax: '',
        skills: '',
        benefits: '',
        applicationDeadline: ''
      });
      setSelectedJobForEdit(null);
      setModal(null);
      pop('Job updated successfully!');
    } catch (error) {
      console.error('Error updating job:', error);
      pop('Error updating job. Please try again.');
    }
  };

  const addCandidate = () => {
    // Validation
    if (!candidateForm.name.trim()) {
      pop('Please enter candidate name');
      return;
    }
    if (!candidateForm.email.trim()) {
      pop('Please enter candidate email');
      return;
    }
    if (!candidateForm.job) {
      pop('Please select a job opening');
      return;
    }
    if (!candidateForm.graduationYear) {
      pop('Please select graduation year');
      return;
    }
    if (!candidateForm.resume) {
      pop('Please upload candidate resume');
      return;
    }
    if (!candidateForm.referralSource) {
      pop('Please select how they heard about us');
      return;
    }
    if (!candidateForm.motivation.trim()) {
      pop('Please enter candidate motivation');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const newCandidate = {
      id: Date.now(),
      name: candidateForm.name,
      role: candidateForm.job,
      email: candidateForm.email,
      phone: candidateForm.phone || 'Not provided',
      location: 'Not specified',
      experience: '',
      appliedDate: today,
      aiScore: 0,
      aiReason: 'AI analysis pending - click "Run AI Score" to analyze',
      status: 'New Application',
      stage: 'shortlisting',
      profileStrength: 'Pending',
      hasScreeningCall: false,
      assignmentShared: false,
      assignmentSubmitted: false,
      isHotApplicant: false,
      comments: [],
      daysInStage: 0,
      totalDays: 0,
      tags: [],
      resume: candidateForm.resume?.name || 'resume.pdf',
      linkedIn: candidateForm.linkedIn || '',
      portfolio: candidateForm.github || '',
      needsAttention: true,
      lastActivity: 'Just now',
      graduationYear: candidateForm.graduationYear,
      availability: candidateForm.availability,
      noticePeriod: candidateForm.noticePeriod,
      referralSource: candidateForm.referralSource,
      motivation: candidateForm.motivation
    };
    setPeople([...people, newCandidate]);
    setCandidateForm({
      name: '',
      email: '',
      phone: '',
      job: '',
      graduationYear: '',
      resume: null,
      additionalDocs: [],
      availability: 'immediately',
      noticePeriod: '',
      referralSource: '',
      motivation: '',
      linkedIn: '',
      github: ''
    });
    setModal(null);
    pop('Candidate added successfully!');
  };

  // Public Application Submission
  const submitApplication = async () => {
    // Validation
    if (!applicationForm.name.trim()) {
      pop('Please enter your name');
      return;
    }
    if (!applicationForm.email.trim()) {
      pop('Please enter your email');
      return;
    }
    if (!applicationForm.resume) {
      pop('Please upload your resume');
      return;
    }
    if (!applicationForm.graduationYear) {
      pop('Please select your graduation year');
      return;
    }
    if (!applicationForm.referralSource) {
      pop('Please select how you heard about us');
      return;
    }
    if (!applicationForm.motivation.trim()) {
      pop('Please tell us why you want to work with us');
      return;
    }

    // Get job from openings or use selectedJob (for public apply view)
    const job = openings.find(j => j.id === applicationForm.jobId) || selectedJob;

    // Get the real job ID from _original if available
    const realJobId = job?._original?.id || applicationForm.jobId || selectedJob?._original?.id;

    if (!realJobId) {
      pop('Error: Could not find job information. Please try again.');
      return;
    }

    // Store job info before any async operations that might clear selectedJob
    const jobInfoForSuccess = {
      name: job?.name || selectedJob?.name,
      team: job?.team || selectedJob?.team,
      place: job?.place || selectedJob?.place
    };

    setIsSubmittingApplication(true);

    try {
      // First, upload the resume and extract text - MANDATORY
      let resumeUrl = null;
      let resumeText = null;

      pop('Uploading and processing resume...');
      const companyId = job?._original?.company_id || '00000000-0000-0000-0000-000000000001';

      try {
        const uploadResult = await uploadAPI.uploadResume(applicationForm.resume, companyId);

        if (uploadResult.success) {
          resumeUrl = uploadResult.file.url;
          resumeText = uploadResult.extractedText || null;
          console.log('✅ Resume processed:', { url: resumeUrl, textLength: resumeText?.length });

          // Warn if text extraction failed but continue (file is still stored)
          if (!resumeText || resumeText.length < 50) {
            console.warn('⚠️ Resume text extraction may have failed, but continuing with submission');
          }
        } else {
          throw new Error('Resume upload failed');
        }
      } catch (uploadError) {
        console.error('Resume upload error:', uploadError);
        pop('Failed to upload resume. Please try again.');
        setIsSubmittingApplication(false);
        return;
      }

      // Prepare application data for API
      const applicationPayload = {
        // Candidate data
        name: applicationForm.name,
        email: applicationForm.email,
        phone: applicationForm.phone || null,
        linkedin_url: applicationForm.linkedIn || null,
        portfolio_url: applicationForm.github || null,
        // Application data
        job_id: realJobId,
        resume_url: resumeUrl,
        resume_text: resumeText,
        referral_source: applicationForm.referralSource || null,
        graduation_year: applicationForm.graduationYear || null,
        availability: applicationForm.availability || 'immediately',
        notice_period: applicationForm.noticePeriod || null,
        motivation: applicationForm.motivation || null
      };

      console.log('📤 Submitting application to API:', applicationPayload);

      const response = await applicationsAPI.publicApply(applicationPayload);

      if (response.success) {
        console.log('✅ Application submitted successfully:', response.data);

        // Store submission data for success modal (use saved job info)
        setSubmittedApplicationData({
          name: applicationForm.name,
          email: applicationForm.email,
          jobName: jobInfoForSuccess.name,
          jobTeam: jobInfoForSuccess.team,
          jobPlace: jobInfoForSuccess.place,
          submittedDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
          referenceNumber: response.data?.reference_number || null
        });

        // Reset form
        setApplicationForm({
          name: '',
          email: '',
          phone: '',
          resume: null,
          additionalDocs: [],
          availability: 'immediately',
          noticePeriod: '',
          graduationYear: '',
          referralSource: '',
          motivation: '',
          linkedIn: '',
          github: '',
          jobId: null
        });

        // Show success modal
        setShowApplicationSuccess(true);
      } else {
        throw new Error(response.error || 'Failed to submit application');
      }
    } catch (error) {
      console.error('❌ Error submitting application:', error);

      // Handle specific errors
      if (error.message?.includes('already applied')) {
        pop('You have already applied for this position. Our team will review your application shortly.');
      } else {
        pop('Failed to submit application. Please try again later.');
      }
    } finally {
      setIsSubmittingApplication(false);
    }
  };

  // Admin Management Functions - with API calls
  const createAdmin = async () => {
    if (!adminForm.name.trim() || !adminForm.email.trim() || !adminForm.password.trim()) {
      pop('Please fill all required fields');
      return;
    }
    if (adminForm.password.length < 6) {
      pop('Password must be at least 6 characters');
      return;
    }
    // Check if email already exists locally (will also be checked on server)
    if (registeredUsers.find(u => u.email.toLowerCase() === adminForm.email.toLowerCase())) {
      pop('A user with this email already exists');
      return;
    }

    try {
      const newUser = await usersAPI.create({
        name: adminForm.name,
        email: adminForm.email,
        password: adminForm.password,
        role: adminForm.role,
      });

      // Add to local state
      setRegisteredUsers([...registeredUsers, newUser]);
      setAdminForm({ name: '', email: '', role: 'HR', password: '' });
      setModal(null);
      pop('User created successfully!');
    } catch (error) {
      console.error('Error creating user:', error);
      if (error.message?.includes('already exists')) {
        pop('A user with this email already exists');
      } else {
        pop('Failed to create user. Please try again.');
      }
    }
  };

  const updateAdminStatus = async (id, status) => {
    try {
      await usersAPI.toggleStatus(id, status);
      // Update local state
      setRegisteredUsers(registeredUsers.map(u => u.id === id ? { ...u, status } : u));
      pop(`User ${status === 'Active' ? 'activated' : 'deactivated'} successfully!`);
    } catch (error) {
      console.error('Error updating user status:', error);
      pop('Failed to update user status');
    }
  };

  const updateAdmin = async (id, updates) => {
    try {
      await usersAPI.update(id, updates);
      // Update local state
      setRegisteredUsers(registeredUsers.map(u => u.id === id ? { ...u, ...updates } : u));
      pop('User updated successfully!');
      setModal(null);
    } catch (error) {
      console.error('Error updating user:', error);
      pop('Failed to update user');
    }
  };

  const updatePassword = () => {
    if (!passwordForm.current || !passwordForm.new || !passwordForm.confirm) {
      pop('Please fill all password fields');
      return;
    }
    if (passwordForm.new !== passwordForm.confirm) {
      pop('New passwords do not match!');
      return;
    }
    if (passwordForm.new.length < 6) {
      pop('Password must be at least 6 characters');
      return;
    }
    setPasswordForm({ current: '', new: '', confirm: '' });
    setModal(null);
    pop('Password updated successfully!');
  };

  const resetAdminPassword = (adminId) => {
    const admin = admins.find(a => a.id === adminId);
    if (admin) {
      pop(`Password reset email sent to ${admin.email}`);
      setModal(null);
    }
  };

  // Job Settings Functions - with API calls
  const addDepartment = async () => {
    if (!newDepartment.trim()) {
      pop('Please enter a department name');
      return;
    }
    if (departments.some(d => d.name.toLowerCase() === newDepartment.trim().toLowerCase())) {
      pop('Department already exists');
      return;
    }
    try {
      const newDept = await departmentsAPI.create(newDepartment.trim());
      setDepartments(prev => [...prev, { id: newDept.id, name: newDept.name, active: true }]);
      setNewDepartment('');
      pop('Department added successfully!');
    } catch (error) {
      console.error('Error adding department:', error);
      pop('Failed to add department');
    }
  };

  const updateDepartment = async (id, newName) => {
    if (!newName.trim()) {
      pop('Department name cannot be empty');
      return;
    }
    if (departments.some(d => d.id !== id && d.name.toLowerCase() === newName.trim().toLowerCase())) {
      pop('Department name already exists');
      return;
    }
    try {
      await departmentsAPI.update(id, { name: newName.trim() });
      setDepartments(prev => prev.map(d => d.id === id ? { ...d, name: newName.trim() } : d));
      setEditingItem(null);
      setEditingValue('');
      pop('Department updated successfully!');
    } catch (error) {
      console.error('Error updating department:', error);
      pop('Failed to update department');
    }
  };

  const toggleDepartmentStatus = async (id) => {
    const dept = departments.find(d => d.id === id);
    if (!dept) return;

    const newStatus = !(dept.active !== false);
    try {
      await departmentsAPI.update(id, { is_active: newStatus });
      setDepartments(prev => prev.map(d => d.id === id ? { ...d, active: newStatus } : d));
      pop(newStatus ? 'Department activated!' : 'Department deactivated!');
    } catch (error) {
      console.error('Error toggling department status:', error);
      pop('Failed to update department status');
    }
  };

  const addRoleType = async () => {
    if (!newRoleType.trim()) {
      pop('Please enter a role type');
      return;
    }
    if (roleTypes.some(r => r.name.toLowerCase() === newRoleType.trim().toLowerCase())) {
      pop('Role type already exists');
      return;
    }
    try {
      const newType = await roleTypesAPI.create(newRoleType.trim());
      setRoleTypes(prev => [...prev, { id: newType.id, name: newType.name, active: true }]);
      setNewRoleType('');
      pop('Role type added successfully!');
    } catch (error) {
      console.error('Error adding role type:', error);
      pop('Failed to add role type');
    }
  };

  const updateRoleType = async (id, newName) => {
    if (!newName.trim()) {
      pop('Role type name cannot be empty');
      return;
    }
    if (roleTypes.some(r => r.id !== id && r.name.toLowerCase() === newName.trim().toLowerCase())) {
      pop('Role type already exists');
      return;
    }
    try {
      await roleTypesAPI.update(id, { name: newName.trim() });
      setRoleTypes(prev => prev.map(r => r.id === id ? { ...r, name: newName.trim() } : r));
      setEditingItem(null);
      setEditingValue('');
      pop('Role type updated successfully!');
    } catch (error) {
      console.error('Error updating role type:', error);
      pop('Failed to update role type');
    }
  };

  const toggleRoleTypeStatus = async (id) => {
    const roleType = roleTypes.find(r => r.id === id);
    if (!roleType) return;

    const newStatus = !(roleType.active !== false);
    try {
      await roleTypesAPI.update(id, { is_active: newStatus });
      setRoleTypes(prev => prev.map(r => r.id === id ? { ...r, active: newStatus } : r));
      pop(newStatus ? 'Role type activated!' : 'Role type deactivated!');
    } catch (error) {
      console.error('Error toggling role type status:', error);
      pop('Failed to update role type status');
    }
  };

  const addWorkSetup = async () => {
    if (!newWorkSetup.trim()) {
      pop('Please enter a work setup');
      return;
    }
    if (workSetups.some(w => w.name.toLowerCase() === newWorkSetup.trim().toLowerCase())) {
      pop('Work setup already exists');
      return;
    }
    try {
      const newSetup = await workSetupsAPI.create(newWorkSetup.trim());
      setWorkSetups(prev => [...prev, { id: newSetup.id, name: newSetup.name, active: true }]);
      setNewWorkSetup('');
      pop('Work setup added successfully!');
    } catch (error) {
      console.error('Error adding work setup:', error);
      pop('Failed to add work setup');
    }
  };

  const updateWorkSetup = async (id, newName) => {
    if (!newName.trim()) {
      pop('Work setup name cannot be empty');
      return;
    }
    if (workSetups.some(w => w.id !== id && w.name.toLowerCase() === newName.trim().toLowerCase())) {
      pop('Work setup already exists');
      return;
    }
    try {
      await workSetupsAPI.update(id, { name: newName.trim() });
      setWorkSetups(prev => prev.map(w => w.id === id ? { ...w, name: newName.trim() } : w));
      setEditingItem(null);
      setEditingValue('');
      pop('Work setup updated successfully!');
    } catch (error) {
      console.error('Error updating work setup:', error);
      pop('Failed to update work setup');
    }
  };

  const toggleWorkSetupStatus = async (id) => {
    const workSetup = workSetups.find(w => w.id === id);
    if (!workSetup) return;

    const newStatus = !(workSetup.active !== false);
    try {
      await workSetupsAPI.update(id, { is_active: newStatus });
      setWorkSetups(prev => prev.map(w => w.id === id ? { ...w, active: newStatus } : w));
      pop(newStatus ? 'Work setup activated!' : 'Work setup deactivated!');
    } catch (error) {
      console.error('Error toggling work setup status:', error);
      pop('Failed to update work setup status');
    }
  };

  // Assignment Management Functions - with API calls
  const createAssignment = async () => {
    if (!assignmentForm.name.trim()) {
      pop('Please enter assignment name');
      return;
    }
    if (assignmentForm.jobTypes.length === 0) {
      pop('Please select at least one job type');
      return;
    }
    if (!assignmentForm.instructions.trim()) {
      pop('Please enter instructions');
      return;
    }

    try {
      // Upload files to S3 if any
      let uploadedFiles = [];
      if (assignmentForm.files.length > 0) {
        pop('Uploading files...');
        for (const file of assignmentForm.files) {
          if (file instanceof File) {
            try {
              const result = await uploadAPI.uploadFile(file);
              uploadedFiles.push({
                name: file.name,
                url: result.fileUrl,
                key: result.key, // Store S3 key for refreshing signed URL
                type: file.type
              });
            } catch (uploadError) {
              console.error('File upload error:', uploadError);
              pop(`Failed to upload ${file.name}`);
            }
          } else if (typeof file === 'object' && (file.url || file.key)) {
            // Already uploaded file
            uploadedFiles.push(file);
          }
        }
      }

      const newAssignment = await assignmentsAPI.createTemplate({
        name: assignmentForm.name.trim(),
        jobTypes: assignmentForm.jobTypes,
        instructions: assignmentForm.instructions.trim(),
        link: assignmentForm.link.trim(),
        files: uploadedFiles,
        deadline: assignmentForm.deadline,
        createdBy: currentUser?.name || 'Admin'
      });

      setAssignments([...assignments, newAssignment]);
      setAssignmentForm({
        name: '',
        jobTypes: [],
        instructions: '',
        link: '',
        files: [],
        deadline: '3 days'
      });
      setModal(null);
      pop('Assignment created successfully!');
    } catch (error) {
      console.error('Error creating assignment:', error);
      pop('Failed to create assignment');
    }
  };

  const updateAssignment = async () => {
    if (!assignmentForm.name.trim()) {
      pop('Please enter assignment name');
      return;
    }
    if (assignmentForm.jobTypes.length === 0) {
      pop('Please select at least one job type');
      return;
    }
    if (!assignmentForm.instructions.trim()) {
      pop('Please enter instructions');
      return;
    }

    try {
      // Upload any new files to S3
      let uploadedFiles = [];
      if (assignmentForm.files.length > 0) {
        for (const file of assignmentForm.files) {
          if (file instanceof File) {
            try {
              pop('Uploading files...');
              const result = await uploadAPI.uploadFile(file);
              uploadedFiles.push({
                name: file.name,
                url: result.fileUrl,
                key: result.key, // Store S3 key for refreshing signed URL
                type: file.type
              });
            } catch (uploadError) {
              console.error('File upload error:', uploadError);
              pop(`Failed to upload ${file.name}`);
            }
          } else if (typeof file === 'object' && (file.url || file.key)) {
            // Already uploaded file
            uploadedFiles.push(file);
          } else if (typeof file === 'string') {
            // Legacy file name without URL
            uploadedFiles.push({ name: file, url: null, type: null });
          }
        }
      }

      const updated = await assignmentsAPI.updateTemplate(selectedAssignment.id, {
        name: assignmentForm.name.trim(),
        jobTypes: assignmentForm.jobTypes,
        instructions: assignmentForm.instructions.trim(),
        link: assignmentForm.link.trim(),
        files: uploadedFiles,
        deadline: assignmentForm.deadline
      });

      setAssignments(assignments.map(a =>
        a.id === selectedAssignment.id ? updated : a
      ));
      setSelectedAssignment(null);
      setAssignmentForm({
        name: '',
        jobTypes: [],
        instructions: '',
        link: '',
        files: [],
        deadline: '3 days'
      });
      setModal(null);
      pop('Assignment updated successfully!');
    } catch (error) {
      console.error('Error updating assignment:', error);
      pop('Failed to update assignment');
    }
  };

  const deleteAssignment = async (id) => {
    const assignment = assignments.find(a => a.id === id);
    setAssignmentToDelete(assignment);
    setShowDeleteAssignmentModal(true);
  };

  const confirmDeleteAssignment = async () => {
    if (!assignmentToDelete) return;
    try {
      await assignmentsAPI.deleteTemplate(assignmentToDelete.id);
      setAssignments(assignments.filter(a => a.id !== assignmentToDelete.id));
      pop('Assignment deleted successfully!');
    } catch (error) {
      console.error('Error deleting assignment:', error);
      pop('Failed to delete assignment');
    } finally {
      setShowDeleteAssignmentModal(false);
      setAssignmentToDelete(null);
    }
  };

  const previewAssignmentEmail = () => {
    if (!selectedAssignmentToSend || !selectedCandidate) {
      pop('Please select an assignment');
      return;
    }

    const assignment = assignments.find(a => a.id === selectedAssignmentToSend);
    if (!assignment) {
      pop('Error: Assignment not found');
      return;
    }

    // Prepare email preview
    setEmailPreview({
      to: selectedCandidate.email,
      subject: `Assignment: ${assignment.name} - ${selectedCandidate.role} Position`,
      candidateName: selectedCandidate.name,
      assignment: assignment,
      customInstructions: customAssignmentInstructions,
      deadline: assignment.deadline
    });

    setModal('emailPreview');
  };

  const confirmSendEmail = async () => {
    if (!emailPreview || !selectedCandidate) return;

    try {
      // Calculate deadline days from the assignment deadline string
      const deadlineDays = parseInt(emailPreview.assignment.deadline) || 3;

      // Send assignment to candidate via API
      await assignmentsAPI.sendToCandidate({
        applicationId: selectedCandidate._original?.id || selectedCandidate.id,
        candidateId: selectedCandidate.candidateId || selectedCandidate._original?.candidate_id,
        candidateName: selectedCandidate.name,
        candidateEmail: selectedCandidate.email,
        templateId: emailPreview.assignment.id,
        assignmentName: emailPreview.assignment.name,
        instructions: emailPreview.assignment.instructions,
        customInstructions: emailPreview.customInstructions,
        link: emailPreview.assignment.link,
        files: emailPreview.assignment.files || [],
        deadlineDays: deadlineDays,
        sentBy: currentUser?.name || 'Admin'
      });

      // Update candidate stage to assignment-sent in local state
      const deadlineDate = new Date(Date.now() + deadlineDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setPeople(people.map(p =>
        p.id === selectedCandidate.id
          ? {
              ...p,
              stage: 'assignment-sent',
              assignmentShared: true,
              assignmentSent: true,
              assignmentName: emailPreview.assignment.name,
              assignmentDeadline: deadlineDate,
              assignmentStatus: 'sent',
              assignmentSentAt: new Date().toISOString()
            }
          : p
      ));

      // Update candidateAssignments so Mark Completed button shows immediately
      setCandidateAssignments(prev => [{
        id: Date.now().toString(), // Temporary ID until refresh
        assignmentName: emailPreview.assignment.name,
        instructions: emailPreview.assignment.instructions,
        customInstructions: emailPreview.customInstructions,
        link: emailPreview.assignment.link,
        files: emailPreview.assignment.files || [],
        deadlineDate: deadlineDate,
        sentAt: new Date().toISOString(),
        sentBy: currentUser?.name || 'Admin',
        status: 'sent'
      }, ...prev]);

      // Reset states and close modal
      const candidateIdToRefresh = selectedCandidate.id;
      setModal(null);
      setEmailPreview(null);
      setSelectedAssignmentToSend(null);
      setCustomAssignmentInstructions('');
      pop('✅ Assignment sent successfully to ' + selectedCandidate.name + '!');
      // Refresh data to get latest state
      await refreshData(candidateIdToRefresh);
    } catch (error) {
      console.error('Error sending assignment:', error);
      pop('Failed to send assignment. Please try again.');
    }
  };

  // Hot Applicant Functions
  const toggleHotApplicant = async (personId) => {
    const person = people.find(p => p.id === personId);
    const newHotStatus = !person?.isHotApplicant;

    // Optimistically update UI
    setPeople(people.map(p =>
      p.id === personId ? { ...p, isHotApplicant: newHotStatus } : p
    ));

    // Persist to database
    try {
      await applicationsAPI.toggleHotApplicant(personId, newHotStatus);
      pop(newHotStatus ? '🔥 Marked as hot applicant!' : '❄️ Removed from hot applicants');
    } catch (error) {
      console.error('Failed to update hot applicant status:', error);
      // Revert on failure
      setPeople(people.map(p =>
        p.id === personId ? { ...p, isHotApplicant: !newHotStatus } : p
      ));
      pop('Failed to update hot applicant status');
    }
  };

  // Comments Functions
  const addComment = (personId, commentText, stage) => {
    if (!commentText.trim()) {
      pop('Please enter a comment');
      return;
    }
    const newComment = {
      id: Date.now(),
      text: commentText,
      author: currentUser?.name || 'Admin',
      timestamp: new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }),
      stage: stage
    };
    setPeople(people.map(p =>
      p.id === personId ? { ...p, comments: [...(p.comments || []), newComment] } : p
    ));
    setCommentText('');
    pop('💬 Comment added successfully!');
  };

  // Rejection Functions
  const confirmRejectCandidate = async () => {
    if (!rejectionReason.trim()) {
      pop('Please enter a rejection reason');
      return;
    }
    if (selectedCandidate) {
      const rejectionDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      const previousStage = selectedCandidate.stage;

      // Create rejection comment for timeline
      const rejectionComment = {
        id: Date.now(),
        text: `❌ Application rejected from ${previousStage} stage. Reason: ${rejectionReason}`,
        author: currentUser?.name || 'Admin',
        timestamp: new Date().toLocaleString(),
        stage: 'rejected',
        type: 'rejection'
      };

      // Persist to database FIRST
      try {
        await applicationsAPI.reject(selectedCandidate.id, rejectionReason, currentUser?.name || 'Admin');

        // Update UI after successful database update
        setPeople(people.map(p =>
          p.id === selectedCandidate.id ? {
            ...p,
            stage: 'rejected',
            status: 'Rejected',
            rejectionReason: rejectionReason,
            rejectionDate: rejectionDate,
            comments: [...(p.comments || []), rejectionComment]
          } : p
        ));
        setShowRejectConfirm(false);
        setRejectionReason('');
        pop('❌ Candidate rejected successfully');
        // Refresh data to get latest state
        await refreshData(selectedCandidate.id);
      } catch (error) {
        console.error('Failed to reject candidate:', error);
        pop('Failed to reject candidate. Please try again.');
      }
    }
  };

  // Stage Reversion Function
  const handleRevertStage = async () => {
    if (!revertReason.trim()) {
      pop('Please enter a reason for reverting');
      return;
    }
    if (!revertTargetStage) {
      pop('Please select a stage to revert to');
      return;
    }

    const currentCandidate = selectedCandidate;
    if (!currentCandidate) return;

    const stageMap = {
      'shortlisting': 'Shortlisting',
      'screening': 'Screening Call',
      'assignment-sent': 'Assignment Sent',
      'assignment-submitted': 'Assignment Submitted',
      'interview': 'Interview',
      'offer-sent': 'Offer Sent',
      'offer-accepted': 'Offer Accepted',
      'hired': 'Hired',
      'rejected': 'Rejected'
    };

    const previousStage = currentCandidate.stage;
    const revertComment = {
      id: Date.now(),
      text: `⏪ Stage reverted from ${stageMap[previousStage] || previousStage} to ${stageMap[revertTargetStage] || revertTargetStage}. Reason: ${revertReason}`,
      author: currentUser?.name || 'Admin',
      timestamp: new Date().toLocaleString(),
      stage: revertTargetStage,
      type: 'stage_revert'
    };

    // Update UI
    setPeople(people.map(p =>
      p.id === currentCandidate.id ? {
        ...p,
        stage: revertTargetStage,
        comments: [...(p.comments || []), revertComment]
      } : p
    ));
    setSelectedCandidate({
      ...currentCandidate,
      stage: revertTargetStage,
      comments: [...(currentCandidate.comments || []), revertComment]
    });

    setShowRevertStageModal(false);
    setRevertReason('');
    setRevertTargetStage('');

    // Persist to database
    try {
      await applicationsAPI.update(currentCandidate.id, {
        stage: revertTargetStage,
        last_activity_at: new Date().toISOString()
      });
      await applicationsAPI.addComment(currentCandidate.id, {
        text: `⏪ Stage reverted from ${stageMap[previousStage] || previousStage} to ${stageMap[revertTargetStage] || revertTargetStage}. Reason: ${revertReason}`,
        author: currentUser?.name || 'Admin',
        stage: revertTargetStage
      });
      pop(`✅ Stage reverted to ${stageMap[revertTargetStage] || revertTargetStage}`);
      // Refresh data to get latest state
      await refreshData(currentCandidate.id);
    } catch (error) {
      console.error('Failed to revert stage:', error);
      pop('Stage reverted locally but failed to sync to database');
    }
  };

  // ==================
  // Styles
  // ==================
  const styles = {
    box: {
      background: 'white',
      borderRadius: 20,
      padding: 28,
      border: '1px solid #e2e8f0',
      marginBottom: 20,
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
      transition: 'all 0.3s ease'
    },
    card: {
      background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
      borderRadius: 20,
      padding: 28,
      border: '1px solid #e2e8f0',
      marginBottom: 20,
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.06)',
      transition: 'all 0.3s ease',
      position: 'relative',
      overflow: 'hidden'
    },
    btn1: {
      padding: '12px 24px',
      background: 'linear-gradient(135deg, #44924c, #2d6a33)',
      color: 'white',
      border: 'none',
      borderRadius: 12,
      fontWeight: 600,
      cursor: 'pointer',
      fontSize: 14,
      transition: 'all 0.2s ease',
      boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)'
    },
    btn2: {
      padding: '12px 24px',
      background: 'white',
      color: '#475569',
      border: '2px solid #e2e8f0',
      borderRadius: 12,
      fontWeight: 500,
      cursor: 'pointer',
      fontSize: 14,
      transition: 'all 0.2s ease',
    },
    input: {
      width: '100%',
      padding: 14,
      borderRadius: 12,
      border: '2px solid #e2e8f0',
      fontSize: 15,
      boxSizing: 'border-box',
      outline: 'none',
      transition: 'border-color 0.2s ease',
      background: 'white',
      color: '#1e293b',
      minHeight: 48
    },
    label: {
      display: 'block',
      marginBottom: 8,
      fontWeight: 600,
      color: '#475569',
      fontSize: 14,
    }
  };

  // ==================
  // PUBLIC JOB DETAILS PAGE
  // ==================
  if (view === 'publicJobDetails') {
    // Show loading while fetching job data
    if (isLoadingPublicJob) {
      return (
        <div style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #f0fdf4 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Work Sans', system-ui, -apple-system, sans-serif"
        }}>
          <div style={{ textAlign: 'center' }}>
            <img
              src="https://framerusercontent.com/images/pFpeWgK03UT38AQl5d988Epcsc.svg?scale-down-to=512"
              alt="AI Planet Logo"
              style={{ width: 200, marginBottom: 24 }}
            />
            <div style={{ fontSize: 18, color: '#64748b' }}>Loading job details...</div>
          </div>
        </div>
      );
    }

    const job = selectedJob;

    // If job not found and not showing success screen, show error message
    if (!job && !showApplicationSuccess) {
      return (
        <div style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #f0fdf4 100%)',
          padding: '40px 20px',
          fontFamily: "'Work Sans', system-ui, -apple-system, sans-serif",
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            background: 'white',
            borderRadius: 20,
            padding: 60,
            boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
            textAlign: 'center',
            maxWidth: 500
          }}>
            <img
              src="https://framerusercontent.com/images/pFpeWgK03UT38AQl5d988Epcsc.svg?scale-down-to=512"
              alt="AI Planet Logo"
              style={{
                width: 200,
                marginBottom: 24,
                objectFit: 'contain'
              }}
            />
            <div style={{ fontSize: 64, marginBottom: 20 }}>😕</div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>
              Job Not Found
            </h1>
            <p style={{ fontSize: 16, color: '#64748b', marginBottom: 24, lineHeight: 1.6 }}>
              Sorry, we couldn't find the job opening you're looking for. It may have been closed or the link might be incorrect.
            </p>
            <button
              onClick={() => window.location.href = '/'}
              style={{
                padding: '14px 28px',
                background: 'linear-gradient(135deg, #44924c, #2d6a33)',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Go to Homepage
            </button>
          </div>
        </div>
      );
    }

    // Show success modal standalone if job is null but success modal should be shown
    if (!job && showApplicationSuccess && submittedApplicationData) {
      return (
        <div style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #f0fdf4 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          fontFamily: "'Work Sans', system-ui, -apple-system, sans-serif"
        }}>
          <div style={{
            background: 'white',
            borderRadius: 20,
            maxWidth: 600,
            width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            overflow: 'hidden'
          }}>
            {/* Success Header */}
            <div style={{
              padding: '40px 32px',
              background: 'linear-gradient(135deg, #44924c, #2d6a33)',
              textAlign: 'center',
              color: 'white'
            }}>
              <div style={{
                width: 80,
                height: 80,
                background: 'white',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                fontSize: 40
              }}>
                ✅
              </div>
              <h2 style={{
                fontSize: 28,
                fontWeight: 700,
                margin: '0 0 12px'
              }}>
                Application Submitted Successfully!
              </h2>
              <p style={{
                fontSize: 16,
                margin: 0,
                opacity: 0.95
              }}>
                Thank you for applying to AI Planet
              </p>
            </div>

            {/* Success Content */}
            <div style={{ padding: 32 }}>
              <div style={{
                padding: 20,
                background: '#f0fdf4',
                border: '2px solid #bbf7d0',
                borderRadius: 12,
                marginBottom: 24
              }}>
                <h3 style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#166534',
                  margin: '0 0 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <span>📧</span> Confirmation Email Sent
                </h3>
                <p style={{
                  fontSize: 15,
                  color: '#166534',
                  margin: 0,
                  lineHeight: 1.6
                }}>
                  We've sent a confirmation email to <strong>{submittedApplicationData.email}</strong> with all the details of your application.
                </p>
              </div>

              <div style={{
                display: 'grid',
                gap: 16,
                marginBottom: 24
              }}>
                <div>
                  <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4, fontWeight: 600 }}>
                    Position Applied For:
                  </div>
                  <div style={{ fontSize: 16, color: '#1e293b', fontWeight: 600 }}>
                    {submittedApplicationData.jobName}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4, fontWeight: 600 }}>
                    Application Date:
                  </div>
                  <div style={{ fontSize: 16, color: '#1e293b', fontWeight: 600 }}>
                    {submittedApplicationData.submittedDate}
                  </div>
                </div>
              </div>

              <div style={{
                textAlign: 'center',
                paddingTop: 16
              }}>
                <button
                  onClick={() => {
                    setShowApplicationSuccess(false);
                    setSubmittedApplicationData(null);
                    window.location.href = '/';
                  }}
                  style={{
                    padding: '14px 32px',
                    background: 'linear-gradient(135deg, #44924c, #2d6a33)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    fontSize: 16,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Return to Homepage
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #f0fdf4 100%)',
        padding: '40px 20px',
        fontFamily: "'Work Sans', system-ui, -apple-system, sans-serif"
      }}>
        <div style={{
          maxWidth: 1000,
          margin: '0 auto'
        }}>
          {/* Header with Logo */}
          <div style={{
            textAlign: 'center',
            marginBottom: 40
          }}>
            <img
              src="https://framerusercontent.com/images/pFpeWgK03UT38AQl5d988Epcsc.svg?scale-down-to=512"
              alt="AI Planet Logo"
              style={{
                width: 250,
                marginBottom: 16,
                objectFit: 'contain'
              }}
            />
          </div>

          {/* Main Content */}
          <div style={{
            background: 'white',
            borderRadius: 20,
            boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            {/* Job Header */}
            <div style={{
              background: 'linear-gradient(135deg, #44924c, #2d6a33)',
              padding: '40px 48px',
              color: 'white'
            }}>
              <h1 style={{
                fontSize: 36,
                fontWeight: 700,
                margin: '0 0 16px 0',
                lineHeight: 1.2
              }}>
                {job.name}
              </h1>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 16,
                fontSize: 16,
                opacity: 0.95
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>🏢</span>
                  <span>{job.team}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>📍</span>
                  <span>{job.place}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>💼</span>
                  <span>{job.roleType}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>🏠</span>
                  <span>{job.workSetup}</span>
                </div>
              </div>
            </div>

            {/* Job Details */}
            <div style={{ padding: '48px' }}>
              {/* About Company */}
              {job.aboutCompany && (
                <div style={{ marginBottom: 40 }}>
                  <h2 style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: '#1e293b',
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10
                  }}>
                    <span>🏢</span> About the Company
                  </h2>
                  <div
                    className="html-content"
                    style={{
                      fontSize: 16,
                      color: '#475569',
                      lineHeight: 1.8
                    }}
                    dangerouslySetInnerHTML={{ __html: job.aboutCompany }}
                  />
                </div>
              )}

              {/* Job Overview */}
              {job.jobOverview && (
                <div style={{ marginBottom: 40 }}>
                  <h2 style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: '#1e293b',
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10
                  }}>
                    <span>📝</span> Job Overview
                  </h2>
                  <div
                    className="html-content"
                    style={{
                      fontSize: 16,
                      color: '#475569',
                      lineHeight: 1.8
                    }}
                    dangerouslySetInnerHTML={{ __html: job.jobOverview }}
                  />
                </div>
              )}

              {/* Key Responsibilities */}
              {job.keyResponsibilities && (
                <div style={{ marginBottom: 40 }}>
                  <h2 style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: '#1e293b',
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10
                  }}>
                    <span>✅</span> Key Responsibilities
                  </h2>
                  <div
                    className="html-content"
                    style={{
                      fontSize: 16,
                      color: '#475569',
                      lineHeight: 1.8
                    }}
                    dangerouslySetInnerHTML={{ __html: job.keyResponsibilities }}
                  />
                </div>
              )}

              {/* Qualifications */}
              {job.qualifications && (
                <div style={{ marginBottom: 40 }}>
                  <h2 style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: '#1e293b',
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10
                  }}>
                    <span>🎓</span> Required Qualifications
                  </h2>
                  <div
                    className="html-content"
                    style={{
                      fontSize: 16,
                      color: '#475569',
                      lineHeight: 1.8
                    }}
                    dangerouslySetInnerHTML={{ __html: job.qualifications }}
                  />
                </div>
              )}

              {/* Preferred Qualifications */}
              {job.preferredQualifications && (
                <div style={{ marginBottom: 40 }}>
                  <h2 style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: '#1e293b',
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10
                  }}>
                    <span>⭐</span> Preferred Qualifications
                  </h2>
                  <div
                    className="html-content"
                    style={{
                      fontSize: 16,
                      color: '#475569',
                      lineHeight: 1.8
                    }}
                    dangerouslySetInnerHTML={{ __html: job.preferredQualifications }}
                  />
                </div>
              )}

              {/* Skills */}
              {job.skills && (
                <div style={{ marginBottom: 40 }}>
                  <h2 style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: '#1e293b',
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10
                  }}>
                    <span>🛠️</span> Required Skills
                  </h2>
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 10
                  }}>
                    {job.skills.split(',').map((skill, idx) => (
                      <span key={idx} style={{
                        padding: '8px 16px',
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: 8,
                        fontSize: 14,
                        color: '#166534',
                        fontWeight: 500
                      }}>
                        {skill.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Salary & Experience */}
              <div style={{
                marginBottom: 40,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: 20
              }}>
                {/* Salary Range */}
                {job.salaryMin && job.salaryMax && (
                  <div style={{
                    padding: 24,
                    background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
                    borderRadius: 12,
                    border: '2px solid #bbf7d0'
                  }}>
                    <h3 style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: '#166534',
                      marginBottom: 8,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}>
                      <span>💰</span> Salary Range
                    </h3>
                    <p style={{
                      fontSize: 20,
                      fontWeight: 600,
                      color: '#15803d',
                      margin: 0
                    }}>
                      ₹{parseInt(job.salaryMin).toLocaleString('en-IN')} - ₹{parseInt(job.salaryMax).toLocaleString('en-IN')} LPA
                    </p>
                  </div>
                )}

                {/* Experience Required */}
                {job.experienceMin && job.experienceMax && (
                  <div style={{
                    padding: 24,
                    background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
                    borderRadius: 12,
                    border: '2px solid #bfdbfe'
                  }}>
                    <h3 style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: '#1e40af',
                      marginBottom: 8,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}>
                      <span>📊</span> Experience Required
                    </h3>
                    <p style={{
                      fontSize: 20,
                      fontWeight: 600,
                      color: '#1e40af',
                      margin: 0
                    }}>
                      {job.experienceMin} - {job.experienceMax} years
                    </p>
                  </div>
                )}
              </div>

              {/* Benefits */}
              {job.benefits && (
                <div style={{ marginBottom: 40 }}>
                  <h2 style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: '#1e293b',
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10
                  }}>
                    <span>🎁</span> Benefits
                  </h2>
                  <div
                    className="html-content"
                    style={{
                      fontSize: 16,
                      color: '#475569',
                      lineHeight: 1.8
                    }}
                    dangerouslySetInnerHTML={{ __html: job.benefits }}
                  />
                </div>
              )}

              {/* Application Deadline */}
              {job.applicationDeadline && (
                <div style={{
                  marginBottom: 40,
                  padding: 20,
                  background: '#fef3c7',
                  border: '2px solid #fbbf24',
                  borderRadius: 12
                }}>
                  <p style={{
                    margin: 0,
                    fontSize: 16,
                    color: '#92400e',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}>
                    <span>⏰</span> Application Deadline: {new Date(job.applicationDeadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              )}

              {/* Share Link */}
              <div style={{
                marginBottom: 32,
                padding: 20,
                background: '#f8fafc',
                borderRadius: 12,
                border: '1px solid #e2e8f0'
              }}>
                <div style={{
                  fontSize: 14,
                  color: '#64748b',
                  fontWeight: 600,
                  marginBottom: 12
                }}>
                  📎 Share this job opening:
                </div>
                <div style={{
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center',
                  flexWrap: 'wrap'
                }}>
                  <input
                    readOnly
                    value={getJobUrl(job)}
                    style={{
                      flex: 1,
                      minWidth: 300,
                      padding: '12px 16px',
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      fontSize: 14,
                      background: 'white',
                      color: '#475569',
                      fontFamily: 'monospace'
                    }}
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(getJobUrl(job));
                      pop('📋 Link copied to clipboard!');
                    }}
                    style={{
                      padding: '12px 24px',
                      background: '#44924c',
                      color: 'white',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    📋 Copy Link
                  </button>
                </div>
              </div>

              {/* Apply Button */}
              <div style={{
                display: 'flex',
                gap: 16,
                paddingTop: 24,
                borderTop: '2px solid #f1f5f9'
              }}>
                <button
                  onClick={() => {
                    setApplicationForm(prev => ({ ...prev, jobId: job.id }));
                    navigate(`/apply/${job.id}/submit`);
                  }}
                  style={{
                    flex: 1,
                    padding: '18px 32px',
                    background: 'linear-gradient(135deg, #44924c, #2d6a33)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 12,
                    fontSize: 18,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                    boxShadow: '0 4px 12px rgba(68, 146, 76, 0.3)'
                  }}
                  onMouseOver={e => e.target.style.transform = 'scale(1.02)'}
                  onMouseOut={e => e.target.style.transform = 'scale(1)'}
                >
                  🚀 Apply for this Position
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            textAlign: 'center',
            marginTop: 32,
            padding: 20,
            color: '#64748b',
            fontSize: 14
          }}>
            <p style={{ margin: 0 }}>
              © 2026 AI Planet. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ==================
  // PUBLIC APPLICATION FORM
  // ==================
  if (view === 'apply') {
    const job = openings.find(j => j.id === applicationForm.jobId);

    // Show success screen if application was submitted
    if (showApplicationSuccess && submittedApplicationData) {
      return (
        <div style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #f0fdf4 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          fontFamily: "'Work Sans', system-ui, -apple-system, sans-serif"
        }}>
          <div style={{
            background: 'white',
            borderRadius: 20,
            maxWidth: 600,
            width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            overflow: 'hidden'
          }}>
            {/* Success Header */}
            <div style={{
              padding: '40px 32px',
              background: 'linear-gradient(135deg, #44924c, #2d6a33)',
              textAlign: 'center',
              color: 'white'
            }}>
              <div style={{
                width: 80,
                height: 80,
                background: 'white',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                fontSize: 40
              }}>
                ✅
              </div>
              <h2 style={{
                fontSize: 28,
                fontWeight: 700,
                margin: '0 0 12px'
              }}>
                Application Submitted Successfully!
              </h2>
              <p style={{
                fontSize: 16,
                margin: 0,
                opacity: 0.95
              }}>
                Thank you for applying to AI Planet
              </p>
            </div>

            {/* Success Content */}
            <div style={{ padding: 32 }}>
              {/* Application Reference Number */}
              {submittedApplicationData.referenceNumber && (
                <div style={{
                  padding: 20,
                  background: 'linear-gradient(135deg, #eff6ff, #f0f9ff)',
                  border: '2px solid #93c5fd',
                  borderRadius: 12,
                  marginBottom: 24,
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: 14, color: '#64748b', marginBottom: 8 }}>
                    Your Application Reference Number
                  </div>
                  <div style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: '#1e40af',
                    fontFamily: 'monospace',
                    letterSpacing: 2
                  }}>
                    {submittedApplicationData.referenceNumber}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
                    Please save this for future reference
                  </div>
                </div>
              )}

              <div style={{
                padding: 20,
                background: '#f0fdf4',
                border: '2px solid #bbf7d0',
                borderRadius: 12,
                marginBottom: 24
              }}>
                <h3 style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#166534',
                  margin: '0 0 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <span>📧</span> Confirmation Email Sent
                </h3>
                <p style={{ color: '#166534', margin: 0, fontSize: 15, lineHeight: 1.6 }}>
                  We've sent a confirmation email to <strong>{submittedApplicationData.email}</strong> with all the details of your application.
                </p>
              </div>

              {/* Application Summary */}
              <div style={{
                padding: 20,
                background: '#f8fafc',
                borderRadius: 12,
                marginBottom: 24
              }}>
                <h4 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', margin: '0 0 16px' }}>
                  Application Summary
                </h4>
                <div style={{ display: 'grid', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Position:</span>
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{submittedApplicationData.jobName}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Department:</span>
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{submittedApplicationData.jobTeam}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Location:</span>
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{submittedApplicationData.jobPlace}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Submitted:</span>
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{submittedApplicationData.submittedDate}</span>
                  </div>
                </div>
              </div>

              {/* What's Next */}
              <div style={{ marginBottom: 24 }}>
                <h4 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', margin: '0 0 12px' }}>
                  What happens next?
                </h4>
                <ul style={{ margin: 0, paddingLeft: 20, color: '#475569', lineHeight: 1.8 }}>
                  <li>Our team will review your application</li>
                  <li>If shortlisted, we'll contact you for the next steps</li>
                  <li>Typical response time is 5-7 business days</li>
                </ul>
              </div>

{/* Button removed - internal application */}
            </div>
          </div>
        </div>
      );
    }

    // If job not found, show error message
    if (!job) {
      return (
        <div style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #f0fdf4 100%)',
          padding: '40px 20px',
          fontFamily: "'Work Sans', system-ui, -apple-system, sans-serif",
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            background: 'white',
            borderRadius: 20,
            padding: 60,
            boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
            textAlign: 'center',
            maxWidth: 500
          }}>
            <img
              src="https://framerusercontent.com/images/pFpeWgK03UT38AQl5d988Epcsc.svg?scale-down-to=512"
              alt="AI Planet Logo"
              style={{
                width: 200,
                marginBottom: 24,
                objectFit: 'contain'
              }}
            />
            <div style={{ fontSize: 64, marginBottom: 20 }}>😕</div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>
              Job Not Found
            </h1>
            <p style={{ fontSize: 16, color: '#64748b', marginBottom: 24, lineHeight: 1.6 }}>
              Sorry, we couldn't find the job opening you're looking for. It may have been closed or the link might be incorrect.
            </p>
            <button
              onClick={() => navigate('/login')}
              style={{
                padding: '14px 28px',
                background: 'linear-gradient(135deg, #44924c, #2d6a33)',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Go to Homepage
            </button>
          </div>
        </div>
      );
    }

    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #f0fdf4 100%)',
        padding: '40px 20px',
        fontFamily: "'Work Sans', system-ui, -apple-system, sans-serif"
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          {/* Back Button */}
          <button
            onClick={() => {
              setSelectedJob(job);
              navigate(`/apply/${job.id}`);
            }}
            style={{
              marginBottom: 24,
              padding: '10px 20px',
              background: 'white',
              color: '#64748b',
              border: '2px solid #e2e8f0',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            ← Back to Job Details
          </button>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <img
              src="https://framerusercontent.com/images/pFpeWgK03UT38AQl5d988Epcsc.svg?scale-down-to=512"
              alt="AI Planet Logo"
              style={{
                width: 250,
                marginBottom: 16,
                objectFit: 'contain'
              }}
            />
            <h1 style={{ fontSize: 32, fontWeight: 700, color: '#1e293b', margin: '0 0 8px' }}>
              Job Application
            </h1>
            <p style={{ fontSize: 18, color: '#64748b', margin: 0 }}>
              Applying for: <strong style={{ color: '#44924c' }}>{job.name}</strong>
            </p>
          </div>

          {/* Job Details Preview */}
          <div style={{
            background: 'white',
            borderRadius: 20,
            padding: 32,
            marginBottom: 24,
            boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', marginBottom: 16 }}>
              {job.name}
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 20, color: '#64748b', fontSize: 14 }}>
              <span>🏢 {job.team}</span>
              <span>📍 {job.place}</span>
              {job.roleType && <span>💼 {job.roleType}</span>}
              {job.workSetup && <span>🏠 {job.workSetup}</span>}
            </div>

            {job.jobOverview && (
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>Job Overview</h3>
                <p style={{ color: '#475569', lineHeight: 1.6, margin: 0 }}>{job.jobOverview}</p>
              </div>
            )}

            {job.salaryMin && job.salaryMax && (
              <div style={{
                padding: 16,
                background: '#f0fdf4',
                borderRadius: 12,
                marginTop: 16,
                border: '1px solid #bbf7d0'
              }}>
                <div style={{ fontSize: 14, color: '#166534', fontWeight: 600 }}>
                  💰 Salary Range: ₹{parseInt(job.salaryMin).toLocaleString('en-IN')} - ₹{parseInt(job.salaryMax).toLocaleString('en-IN')} LPA
                </div>
              </div>
            )}
          </div>

          {/* Application Form */}
          <div style={{
            background: 'white',
            borderRadius: 20,
            padding: 40,
            boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              {/* Name */}
              <div>
                <label style={styles.label}>Full Name *</label>
                <input
                  value={applicationForm.name}
                  onChange={e => setApplicationForm({...applicationForm, name: e.target.value})}
                  placeholder="Enter your full name"
                  style={styles.input}
                />
              </div>

              {/* Email */}
              <div>
                <label style={styles.label}>Email Address *</label>
                <input
                  type="email"
                  value={applicationForm.email}
                  onChange={e => setApplicationForm({...applicationForm, email: e.target.value})}
                  placeholder="your.email@example.com"
                  style={styles.input}
                />
              </div>

              {/* Phone */}
              <div>
                <label style={styles.label}>Phone Number</label>
                <input
                  type="tel"
                  value={applicationForm.phone}
                  onChange={e => setApplicationForm({...applicationForm, phone: e.target.value})}
                  placeholder="+1 (555) 123-4567"
                  style={styles.input}
                />
              </div>

              {/* Graduation Year */}
              <div>
                <label style={styles.label}>Graduation Year *</label>
                <select
                  value={applicationForm.graduationYear}
                  onChange={e => setApplicationForm({...applicationForm, graduationYear: e.target.value})}
                  style={styles.input}
                >
                  <option value="">Select graduation year</option>
                  <option value={`before-${graduationYearRange.fromYear}`}>Before {graduationYearRange.fromYear}</option>
                  {Array.from(
                    { length: graduationYearRange.toYear - graduationYearRange.fromYear + 1 },
                    (_, i) => graduationYearRange.fromYear + i
                  ).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                  <option value={`after-${graduationYearRange.toYear}`}>After {graduationYearRange.toYear}</option>
                </select>
              </div>

              {/* Resume Upload */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={styles.label}>Resume * (PDF or Word format, max 5MB)</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={e => {
                    const file = e.target.files[0];
                    if (file) {
                      // Check file size (5MB = 5 * 1024 * 1024 bytes)
                      if (file.size > 5 * 1024 * 1024) {
                        pop('❌ Resume file size must be less than 5MB');
                        e.target.value = '';
                        return;
                      }
                      setApplicationForm({...applicationForm, resume: file});
                    }
                  }}
                  style={{
                    ...styles.input,
                    padding: 12,
                    cursor: 'pointer'
                  }}
                />
                {applicationForm.resume && (
                  <div style={{ marginTop: 8, fontSize: 14, color: '#059669', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>✓ {applicationForm.resume.name}</span>
                    <span style={{ color: '#64748b', fontSize: 12 }}>
                      ({(applicationForm.resume.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                )}
              </div>

              {/* Additional Documents */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={styles.label}>Additional Documents (Optional - up to 3 files, max 5MB each)</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  multiple
                  onChange={e => {
                    const files = Array.from(e.target.files);

                    // Check number of files
                    if (files.length > 3) {
                      pop('❌ You can upload maximum 3 additional documents');
                      e.target.value = '';
                      return;
                    }

                    // Check each file size
                    const oversizedFiles = files.filter(f => f.size > 5 * 1024 * 1024);
                    if (oversizedFiles.length > 0) {
                      pop('❌ Each file must be less than 5MB');
                      e.target.value = '';
                      return;
                    }

                    setApplicationForm({...applicationForm, additionalDocs: files});
                  }}
                  style={{
                    ...styles.input,
                    padding: 12,
                    cursor: 'pointer'
                  }}
                />
                <div style={{ marginTop: 6, fontSize: 12, color: '#64748b' }}>
                  💡 You can upload cover letter, portfolio, certificates, etc.
                </div>
                {applicationForm.additionalDocs.length > 0 && (
                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {applicationForm.additionalDocs.map((file, idx) => (
                      <div key={idx} style={{ fontSize: 14, color: '#059669', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>✓ {file.name}</span>
                        <span style={{ color: '#64748b', fontSize: 12 }}>
                          ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Availability */}
              <div>
                <label style={styles.label}>Availability *</label>
                <select
                  value={applicationForm.availability}
                  onChange={e => setApplicationForm({...applicationForm, availability: e.target.value})}
                  style={styles.input}
                >
                  <option value="immediately">Immediately Available</option>
                  <option value="notice">Currently Serving Notice Period</option>
                </select>
              </div>

              {/* Notice Period */}
              {applicationForm.availability === 'notice' && (
                <div>
                  <label style={styles.label}>Notice Period</label>
                  <input
                    value={applicationForm.noticePeriod}
                    onChange={e => setApplicationForm({...applicationForm, noticePeriod: e.target.value})}
                    placeholder="e.g., 30 days, 2 months"
                    style={styles.input}
                  />
                </div>
              )}

              {/* Referral Source */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={styles.label}>Where did you hear about us? *</label>
                <select
                  value={applicationForm.referralSource}
                  onChange={e => setApplicationForm({...applicationForm, referralSource: e.target.value})}
                  style={styles.input}
                >
                  <option value="">Select an option</option>
                  {referralSources.map(source => (
                    <option key={source} value={source}>{source}</option>
                  ))}
                </select>
              </div>

              {/* Motivation */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={styles.label}>Why do you want to work with us? *</label>
                <textarea
                  value={applicationForm.motivation}
                  onChange={e => setApplicationForm({...applicationForm, motivation: e.target.value})}
                  placeholder="Tell us what excites you about this opportunity..."
                  rows={5}
                  style={{
                    ...styles.input,
                    resize: 'vertical',
                    fontFamily: "'Work Sans', system-ui, sans-serif"
                  }}
                />
              </div>

              {/* LinkedIn */}
              <div>
                <label style={styles.label}>LinkedIn Profile</label>
                <input
                  value={applicationForm.linkedIn}
                  onChange={e => setApplicationForm({...applicationForm, linkedIn: e.target.value})}
                  placeholder="linkedin.com/in/yourprofile"
                  style={styles.input}
                />
              </div>

              {/* GitHub */}
              <div>
                <label style={styles.label}>GitHub / Portfolio</label>
                <input
                  value={applicationForm.github}
                  onChange={e => setApplicationForm({...applicationForm, github: e.target.value})}
                  placeholder="github.com/yourprofile or portfolio URL"
                  style={styles.input}
                />
              </div>
            </div>

            {/* Submit Button */}
            <div style={{ marginTop: 32, display: 'flex', gap: 12 }}>
              <button
                onClick={() => {
                  // Validation before showing preview
                  if (!applicationForm.name.trim()) {
                    pop('Please enter your name');
                    return;
                  }
                  if (!applicationForm.email.trim()) {
                    pop('Please enter your email');
                    return;
                  }
                  if (!applicationForm.resume) {
                    pop('Please upload your resume');
                    return;
                  }
                  if (!applicationForm.graduationYear) {
                    pop('Please select your graduation year');
                    return;
                  }
                  if (!applicationForm.referralSource) {
                    pop('Please select how you heard about us');
                    return;
                  }
                  if (!applicationForm.motivation.trim()) {
                    pop('Please tell us why you want to work with us');
                    return;
                  }

                  // Show preview
                  setShowApplicationPreview(true);
                }}
                style={{
                  flex: 1,
                  padding: '16px 32px',
                  background: 'linear-gradient(135deg, #44924c, #2d6a33)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'transform 0.2s'
                }}
                onMouseOver={e => e.target.style.transform = 'scale(1.02)'}
                onMouseOut={e => e.target.style.transform = 'scale(1)'}
              >
                Review & Submit Application
              </button>
              <button
                onClick={() => {
                  setSelectedJob(job);
                  navigate(`/apply/${job.id}`);
                }}
                style={{
                  padding: '16px 32px',
                  background: 'white',
                  color: '#64748b',
                  border: '2px solid #e2e8f0',
                  borderRadius: 12,
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>

            <p style={{ marginTop: 24, fontSize: 13, color: '#64748b', textAlign: 'center' }}>
              * Required fields
            </p>
          </div>
        </div>

        {/* Application Preview Modal */}
        {showApplicationPreview && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20
          }}>
            <div style={{
              background: 'white',
              borderRadius: 20,
              maxWidth: 700,
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }}>
              {/* Header */}
              <div style={{
                padding: '24px 32px',
                borderBottom: '2px solid #f1f5f9',
                background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)'
              }}>
                <h2 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>
                  📋 Review Your Application
                </h2>
                <p style={{ fontSize: 14, color: '#64748b', margin: '8px 0 0' }}>
                  Please review your information before submitting
                </p>
              </div>

              {/* Content */}
              <div style={{ padding: 32 }}>
                {/* Personal Information */}
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: '#44924c', marginBottom: 16 }}>
                    👤 Personal Information
                  </h3>
                  <div style={{ display: 'grid', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: 8 }}>
                      <span style={{ color: '#64748b', fontSize: 14 }}>Name:</span>
                      <span style={{ color: '#1e293b', fontSize: 14, fontWeight: 600 }}>{applicationForm.name}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: 8 }}>
                      <span style={{ color: '#64748b', fontSize: 14 }}>Email:</span>
                      <span style={{ color: '#1e293b', fontSize: 14, fontWeight: 600 }}>{applicationForm.email}</span>
                    </div>
                    {applicationForm.phone && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: 8 }}>
                        <span style={{ color: '#64748b', fontSize: 14 }}>Phone:</span>
                        <span style={{ color: '#1e293b', fontSize: 14, fontWeight: 600 }}>{applicationForm.phone}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: 8 }}>
                      <span style={{ color: '#64748b', fontSize: 14 }}>Graduation Year:</span>
                      <span style={{ color: '#1e293b', fontSize: 14, fontWeight: 600 }}>{applicationForm.graduationYear}</span>
                    </div>
                  </div>
                </div>

                {/* Documents */}
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: '#44924c', marginBottom: 16 }}>
                    📄 Documents
                  </h3>
                  <div style={{ display: 'grid', gap: 8 }}>
                    <div style={{ padding: '12px 16px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                      <div style={{ fontSize: 14, color: '#166534', fontWeight: 600 }}>
                        ✓ Resume: {applicationForm.resume.name}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                        {(applicationForm.resume.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                    {applicationForm.additionalDocs.length > 0 && applicationForm.additionalDocs.map((doc, idx) => (
                      <div key={idx} style={{ padding: '12px 16px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                        <div style={{ fontSize: 14, color: '#166534', fontWeight: 600 }}>
                          ✓ {doc.name}
                        </div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                          {(doc.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Additional Information */}
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: '#44924c', marginBottom: 16 }}>
                    ℹ️ Additional Information
                  </h3>
                  <div style={{ display: 'grid', gap: 12 }}>
                    <div style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: 8 }}>
                      <div style={{ color: '#64748b', fontSize: 13, marginBottom: 4 }}>Availability:</div>
                      <div style={{ color: '#1e293b', fontSize: 14, fontWeight: 600 }}>
                        {applicationForm.availability === 'immediately' ? 'Immediately Available' : 'Currently Serving Notice Period'}
                      </div>
                      {applicationForm.noticePeriod && (
                        <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
                          Notice Period: {applicationForm.noticePeriod}
                        </div>
                      )}
                    </div>
                    <div style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: 8 }}>
                      <div style={{ color: '#64748b', fontSize: 13, marginBottom: 4 }}>How did you hear about us:</div>
                      <div style={{ color: '#1e293b', fontSize: 14, fontWeight: 600 }}>{applicationForm.referralSource}</div>
                    </div>
                    <div style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: 8 }}>
                      <div style={{ color: '#64748b', fontSize: 13, marginBottom: 4 }}>Why do you want to work with us:</div>
                      <div style={{ color: '#1e293b', fontSize: 14, lineHeight: 1.6, marginTop: 8 }}>
                        {applicationForm.motivation}
                      </div>
                    </div>
                    {applicationForm.linkedIn && (
                      <div style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: 8 }}>
                        <div style={{ color: '#64748b', fontSize: 13, marginBottom: 4 }}>LinkedIn:</div>
                        <div style={{ color: '#1e293b', fontSize: 14 }}>{applicationForm.linkedIn}</div>
                      </div>
                    )}
                    {applicationForm.github && (
                      <div style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: 8 }}>
                        <div style={{ color: '#64748b', fontSize: 13, marginBottom: 4 }}>GitHub/Portfolio:</div>
                        <div style={{ color: '#1e293b', fontSize: 14 }}>{applicationForm.github}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div style={{
                padding: '20px 32px',
                borderTop: '2px solid #f1f5f9',
                display: 'flex',
                gap: 12,
                background: '#f8fafc'
              }}>
                <button
                  onClick={() => setShowApplicationPreview(false)}
                  style={{
                    flex: 1,
                    padding: '14px 24px',
                    background: 'white',
                    color: '#64748b',
                    border: '2px solid #e2e8f0',
                    borderRadius: 10,
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  ← Go Back & Edit
                </button>
                <button
                  onClick={() => {
                    setShowApplicationPreview(false);
                    submitApplication();
                  }}
                  disabled={isSubmittingApplication}
                  style={{
                    flex: 1,
                    padding: '14px 24px',
                    background: isSubmittingApplication
                      ? '#94a3b8'
                      : 'linear-gradient(135deg, #44924c, #2d6a33)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: isSubmittingApplication ? 'not-allowed' : 'pointer',
                    opacity: isSubmittingApplication ? 0.7 : 1
                  }}
                >
                  {isSubmittingApplication ? '⏳ Submitting...' : '✓ Confirm & Submit'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Application Success Modal */}
        {showApplicationSuccess && submittedApplicationData && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1001,
            padding: 20
          }}>
            <div style={{
              background: 'white',
              borderRadius: 20,
              maxWidth: 600,
              width: '100%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              overflow: 'hidden'
            }}>
              {/* Success Header */}
              <div style={{
                padding: '40px 32px',
                background: 'linear-gradient(135deg, #44924c, #2d6a33)',
                textAlign: 'center',
                color: 'white'
              }}>
                <div style={{
                  width: 80,
                  height: 80,
                  background: 'white',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                  fontSize: 40
                }}>
                  ✅
                </div>
                <h2 style={{
                  fontSize: 28,
                  fontWeight: 700,
                  margin: '0 0 12px'
                }}>
                  Application Submitted Successfully!
                </h2>
                <p style={{
                  fontSize: 16,
                  margin: 0,
                  opacity: 0.95
                }}>
                  Thank you for applying to AI Planet
                </p>
              </div>

              {/* Success Content */}
              <div style={{ padding: 32 }}>
                <div style={{
                  padding: 20,
                  background: '#f0fdf4',
                  border: '2px solid #bbf7d0',
                  borderRadius: 12,
                  marginBottom: 24
                }}>
                  <h3 style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: '#166534',
                    margin: '0 0 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}>
                    <span>📧</span> Confirmation Email Sent
                  </h3>
                  <p style={{
                    fontSize: 15,
                    color: '#166534',
                    margin: 0,
                    lineHeight: 1.6
                  }}>
                    We've sent a confirmation email to <strong>{submittedApplicationData.email}</strong> with all the details of your application.
                  </p>
                </div>

                <div style={{
                  display: 'grid',
                  gap: 16,
                  marginBottom: 24
                }}>
                  <div>
                    <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4, fontWeight: 600 }}>
                      Position Applied For:
                    </div>
                    <div style={{ fontSize: 16, color: '#1e293b', fontWeight: 600 }}>
                      {submittedApplicationData.jobName}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4, fontWeight: 600 }}>
                      Department:
                    </div>
                    <div style={{ fontSize: 16, color: '#1e293b' }}>
                      {submittedApplicationData.jobTeam}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4, fontWeight: 600 }}>
                      Location:
                    </div>
                    <div style={{ fontSize: 16, color: '#1e293b' }}>
                      {submittedApplicationData.jobPlace}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4, fontWeight: 600 }}>
                      Submitted On:
                    </div>
                    <div style={{ fontSize: 16, color: '#1e293b' }}>
                      {submittedApplicationData.submittedDate}
                    </div>
                  </div>
                </div>

                <div style={{
                  padding: 20,
                  background: '#fef3c7',
                  border: '2px solid #fbbf24',
                  borderRadius: 12,
                  marginBottom: 24
                }}>
                  <h3 style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: '#92400e',
                    margin: '0 0 8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}>
                    <span>⏰</span> What's Next?
                  </h3>
                  <p style={{
                    fontSize: 14,
                    color: '#92400e',
                    margin: 0,
                    lineHeight: 1.6
                  }}>
                    Our recruitment team will carefully review your application. You can expect to hear back from us <strong>within 2 working days</strong>.
                  </p>
                </div>

                <div style={{
                  padding: 16,
                  background: '#f8fafc',
                  borderRadius: 10,
                  marginBottom: 24
                }}>
                  <p style={{
                    fontSize: 14,
                    color: '#475569',
                    margin: 0,
                    lineHeight: 1.6
                  }}>
                    💡 <strong>Tip:</strong> Keep an eye on your email inbox (and spam folder) for updates from our team.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setShowApplicationSuccess(false);
                    setSubmittedApplicationData(null);
                    navigate(`/apply/${job?.id || ''}`);
                  }}
                  style={{
                    width: '100%',
                    padding: '16px 24px',
                    background: 'linear-gradient(135deg, #44924c, #2d6a33)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    fontSize: 16,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Back to Job Details
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==================
  // FORCE LOGIN - Redirect to login if not authenticated and trying to access protected views
  // ==================
  const protectedViews = ['dash', 'jobs', 'pipeline', 'tasks', 'import', 'settings', 'admin', 'profile'];
  useEffect(() => {
    if (!currentUser && protectedViews.includes(view)) {
      navigate('/login');
    }
  }, [currentUser, view]);

  // ==================
  // LOGIN SCREEN - Enterprise Design
  // ==================

  if (view === 'login') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
        display: 'flex',
        fontFamily: "'Work Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Animated Background Elements */}
        <div style={{
          position: 'absolute',
          top: -150,
          right: -150,
          width: 500,
          height: 500,
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
          borderRadius: '50%',
          animation: 'pulse 4s ease-in-out infinite'
        }} />
        <div style={{
          position: 'absolute',
          top: '40%',
          left: -100,
          width: 400,
          height: 400,
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, transparent 70%)',
          borderRadius: '50%',
          animation: 'pulse 5s ease-in-out infinite'
        }} />
        <div style={{
          position: 'absolute',
          bottom: -100,
          right: '30%',
          width: 350,
          height: 350,
          background: 'radial-gradient(circle, rgba(14, 165, 233, 0.1) 0%, transparent 70%)',
          borderRadius: '50%',
          animation: 'pulse 6s ease-in-out infinite'
        }} />
        <div style={{
          position: 'absolute',
          bottom: -200,
          left: '20%',
          width: 600,
          height: 600,
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.08) 0%, transparent 70%)',
          borderRadius: '50%'
        }} />

        {/* Keyframe for pulse animation */}
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(1.05); }
          }
          @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
        `}</style>

        {/* Left Side - Enterprise Branding */}
        <div style={{
          width: '55%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '60px',
          position: 'relative',
          zIndex: 1
        }}>
          <div style={{ maxWidth: 550 }}>
            {/* Logo */}
            <div style={{ marginBottom: 48, display: 'flex', alignItems: 'center', gap: 16 }}>
              <img
                src="https://cdn.brandfetch.io/idZWCLNWW6/w/48/h/48/theme/dark/logo.png?c=1bxid64Mup7aczewSAYMX&t=1764560488706"
                alt="AI Planet"
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 18,
                  boxShadow: '0 8px 32px rgba(68, 146, 76, 0.4)'
                }}
              />
              <div>
                <h3 style={{ color: 'white', fontSize: 24, fontWeight: 700, margin: 0 }}>AI Planet</h3>
                <p style={{ color: '#94a3b8', fontSize: 14, margin: 0 }}>Recruitment Hub</p>
              </div>
            </div>

            <h1 style={{
              fontSize: 52,
              fontWeight: 800,
              color: 'white',
              margin: '0 0 24px',
              lineHeight: 1.15,
              letterSpacing: '-0.02em'
            }}>
              Build the
              <br />
              <span style={{
                background: 'linear-gradient(135deg, #10b981 0%, #0ea5e9 50%, #8b5cf6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                Future Team
              </span>
            </h1>
            <p style={{
              fontSize: 18,
              color: '#94a3b8',
              lineHeight: 1.7,
              margin: '0 0 48px'
            }}>
              AI Planet's internal recruitment platform. Streamline hiring workflows,
              leverage AI-powered candidate screening, and build world-class teams.
            </p>

            {/* Feature Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 16
            }}>
              {[
                { icon: '&#127919;', title: 'AI Screening', desc: 'Smart resume analysis', color: '#10b981' },
                { icon: '&#9889;', title: 'Fast Hiring', desc: 'Streamlined pipeline', color: '#0ea5e9' },
                { icon: '&#128200;', title: 'Team Insights', desc: 'Hiring analytics', color: '#8b5cf6' },
                { icon: '&#128101;', title: 'Talent Pool', desc: 'Centralized candidates', color: '#f59e0b' }
              ].map((feature, idx) => (
                <div key={idx} style={{
                  background: 'rgba(255,255,255,0.05)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: 16,
                  padding: 20,
                  border: '1px solid rgba(255,255,255,0.1)',
                  transition: 'all 0.3s',
                  cursor: 'default'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = `0 12px 40px ${feature.color}20`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                >
                  <div style={{
                    width: 44,
                    height: 44,
                    background: `linear-gradient(135deg, ${feature.color}25 0%, ${feature.color}15 100%)`,
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 22,
                    marginBottom: 12
                  }} dangerouslySetInnerHTML={{ __html: feature.icon }} />
                  <div style={{ color: 'white', fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
                    {feature.title}
                  </div>
                  <div style={{ color: '#64748b', fontSize: 13 }}>
                    {feature.desc}
                  </div>
                </div>
              ))}
            </div>

            {/* Internal Tool Notice */}
            <div style={{
              marginTop: 48,
              padding: '16px 20px',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}>
              <span style={{ fontSize: 20 }}>&#128274;</span>
              <div>
                <div style={{ color: 'white', fontSize: 14, fontWeight: 600 }}>Internal Use Only</div>
                <div style={{ color: '#64748b', fontSize: 13 }}>Authorized AI Planet team members</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div style={{
          width: '45%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '60px',
          position: 'relative',
          zIndex: 2
        }}>
          <div style={{
            background: 'white',
            borderRadius: 28,
            padding: 48,
            width: '100%',
            maxWidth: 440,
            boxShadow: '0 32px 80px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.1)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Decorative top gradient */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 5,
              background: 'linear-gradient(90deg, #10b981 0%, #0ea5e9 50%, #8b5cf6 100%)'
            }} />

            {/* Header */}
            <div style={{ marginBottom: 36, textAlign: 'center' }}>
              <div style={{
                width: 64,
                height: 64,
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                borderRadius: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
              }}>
                <span style={{ fontSize: 28 }}>&#128274;</span>
              </div>
              <h2 style={{
                fontSize: 28,
                fontWeight: 700,
                color: '#0f172a',
                margin: '0 0 8px'
              }}>
                Welcome back
              </h2>
              <p style={{
                fontSize: 15,
                color: '#64748b',
                margin: 0
              }}>
                Sign in to AI Planet Recruitment Hub
              </p>
            </div>

            {/* Login Error */}
            {loginError && (
              <div style={{
                padding: '14px 18px',
                background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                border: '1px solid #fecaca',
                borderRadius: 12,
                color: '#dc2626',
                fontSize: 14,
                marginBottom: 24,
                display: 'flex',
                alignItems: 'center',
                gap: 10
              }}>
                <span>&#9888;</span>
                {loginError}
              </div>
            )}

            {/* Login Form */}
            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 600,
                color: '#334155',
                marginBottom: 8,
                letterSpacing: '0.02em'
              }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                  placeholder="you@aiplanet.com"
                  style={{
                    width: '100%',
                    padding: '16px 20px 16px 48px',
                    border: '2px solid #e2e8f0',
                    borderRadius: 14,
                    fontSize: 15,
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box',
                    background: '#f8fafc'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#0ea5e9';
                    e.target.style.background = 'white';
                    e.target.style.boxShadow = '0 0 0 4px rgba(14, 165, 233, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.background = '#f8fafc';
                    e.target.style.boxShadow = 'none';
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                />
                <span style={{
                  position: 'absolute',
                  left: 18,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: 18,
                  opacity: 0.4
                }}>&#128231;</span>
              </div>
            </div>

            <div style={{ marginBottom: 28 }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8
              }}>
                <label style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#334155',
                  letterSpacing: '0.02em'
                }}>
                  Password
                </label>
                <a href="#" style={{
                  fontSize: 13,
                  color: '#0ea5e9',
                  textDecoration: 'none',
                  fontWeight: 600,
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.color = '#0284c7'}
                onMouseLeave={(e) => e.target.style.color = '#0ea5e9'}
                >
                  Forgot password?
                </a>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                  placeholder="Enter your password"
                  style={{
                    width: '100%',
                    padding: '16px 20px 16px 48px',
                    border: '2px solid #e2e8f0',
                    borderRadius: 14,
                    fontSize: 15,
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box',
                    background: '#f8fafc'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#0ea5e9';
                    e.target.style.background = 'white';
                    e.target.style.boxShadow = '0 0 0 4px rgba(14, 165, 233, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.background = '#f8fafc';
                    e.target.style.boxShadow = 'none';
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                />
                <span style={{
                  position: 'absolute',
                  left: 18,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: 18,
                  opacity: 0.4
                }}>&#128274;</span>
              </div>
            </div>

            {/* Remember me checkbox */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 28
            }}>
              <input
                type="checkbox"
                id="remember"
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 5,
                  cursor: 'pointer',
                  accentColor: '#0ea5e9'
                }}
              />
              <label htmlFor="remember" style={{
                fontSize: 14,
                color: '#475569',
                cursor: 'pointer'
              }}>
                Keep me signed in for 30 days
              </label>
            </div>

            <button
              onClick={handleLogin}
              style={{
                width: '100%',
                padding: '18px 24px',
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                color: 'white',
                border: 'none',
                borderRadius: 14,
                fontSize: 16,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.3s',
                boxShadow: '0 8px 24px rgba(15, 23, 42, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 12px 32px rgba(15, 23, 42, 0.35)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 8px 24px rgba(15, 23, 42, 0.25)';
              }}
            >
              Sign In
              <span>&#8594;</span>
            </button>

            {/* Security Note */}
            <div style={{
              marginTop: 28,
              padding: 16,
              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}>
              <div style={{
                width: 36,
                height: 36,
                background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <span style={{ fontSize: 16, color: 'white' }}>&#128737;</span>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0369a1', marginBottom: 2 }}>
                  Enterprise-grade security
                </div>
                <div style={{ fontSize: 12, color: '#0284c7' }}>
                  Your data is protected with 256-bit encryption
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            marginTop: 32,
            textAlign: 'center',
            color: '#64748b',
            fontSize: 13
          }}>
            <p style={{ margin: '0 0 8px' }}>
              By signing in, you agree to our{' '}
              <a href="#" style={{ color: '#94a3b8', textDecoration: 'underline' }}>Terms of Service</a>
              {' '}and{' '}
              <a href="#" style={{ color: '#94a3b8', textDecoration: 'underline' }}>Privacy Policy</a>
            </p>
            <p style={{ margin: 0, color: '#475569' }}>
              &#169; 2025 AI Planet. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ==================
  // MAIN APP LAYOUT
  // ==================
  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#f8fafc',
      fontFamily: "'Work Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    }}>
      {/* Keyframe Animations */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>

      {/* ==================
          SIDEBAR - Enterprise Design
          ================== */}
      <div style={{
        width: 280,
        background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
        position: 'fixed',
        height: '100vh',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '4px 0 25px rgba(0,0,0,0.15)'
      }}>
        {/* Logo Section */}
        <div style={{
          padding: '24px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: 14
        }}>
          <img
            src="https://cdn.brandfetch.io/idZWCLNWW6/w/48/h/48/theme/dark/logo.png?c=1bxid64Mup7aczewSAYMX&t=1764560488706"
            alt="AI Planet"
            style={{
              width: 75,
              height: 75,
              borderRadius: 16,
              boxShadow: '0 6px 20px rgba(68, 146, 76, 0.5)'
            }}
          />
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 20, letterSpacing: '-0.3px' }}>AI Planet</div>
            <div style={{ color: '#64748b', fontSize: 11, fontWeight: 500, letterSpacing: '0.5px' }}>RECRUITMENT HUB</div>
          </div>
        </div>

        {/* Navigation - Main Section */}
        <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
          {/* Main Navigation */}
          <div style={{ marginBottom: 24 }}>
            <div style={{
              color: '#64748b',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '1.5px',
              padding: '0 12px',
              marginBottom: 10
            }}>
              MAIN MENU
            </div>
            {[
              { k: 'dash', t: 'Dashboard', i: '📊', route: '/dashboard', desc: 'Overview & Analytics' },
              { k: 'jobs', t: 'Job Openings', i: '💼', route: '/jobs', desc: 'Manage Positions' },
              { k: 'pipeline', t: 'Applications', i: '📋', route: '/applications', desc: 'Track Candidates' },
              { k: 'tasks', t: 'Tasks', i: '✓', route: '/tasks', desc: 'Your To-dos' },
            ].map(item => {
              const isActive = view === item.k;
              return (
                <button
                  key={item.k}
                  onClick={() => { navigate(item.route); setCandidate(null); }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    marginBottom: 4,
                    borderRadius: 12,
                    border: 'none',
                    background: isActive
                      ? 'linear-gradient(135deg, rgba(14, 165, 233, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)'
                      : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                >
                  {isActive && (
                    <div style={{
                      position: 'absolute',
                      left: 0,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 3,
                      height: 24,
                      background: 'linear-gradient(180deg, #0ea5e9 0%, #8b5cf6 100%)',
                      borderRadius: '0 4px 4px 0'
                    }} />
                  )}
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: isActive
                      ? 'linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 100%)'
                      : 'rgba(255,255,255,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    boxShadow: isActive ? '0 4px 15px rgba(14, 165, 233, 0.3)' : 'none',
                    transition: 'all 0.2s'
                  }}>
                    {item.i}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      color: isActive ? 'white' : '#94a3b8',
                      fontSize: 14,
                      fontWeight: isActive ? 600 : 500
                    }}>{item.t}</div>
                    <div style={{
                      color: '#64748b',
                      fontSize: 11,
                      marginTop: 1
                    }}>{item.desc}</div>
                  </div>
                  {isActive && (
                    <div style={{ color: '#0ea5e9' }}>
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Recruitment Tools Section */}
          <div style={{ marginBottom: 24 }}>
            <div style={{
              color: '#64748b',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '1.5px',
              padding: '0 12px',
              marginBottom: 10
            }}>
              RECRUITMENT
            </div>
            {[
              { k: 'import', t: 'Import Candidates', i: '📥', route: '/import', desc: 'Add New Talent', comingSoon: true },
              { k: 'assignments', t: 'Assignments', i: '📝', route: '/assignments', desc: 'Manage Assignments' },
            ].map(item => {
              const isActive = view === item.k;
              return (
                <button
                  key={item.k}
                  onClick={() => {
                    if (item.comingSoon) {
                      // Don't navigate for coming soon items
                      return;
                    }
                    navigate(item.route);
                    setCandidate(null);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    marginBottom: 4,
                    borderRadius: 12,
                    border: 'none',
                    background: isActive
                      ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 182, 212, 0.15) 100%)'
                      : 'transparent',
                    cursor: item.comingSoon ? 'not-allowed' : 'pointer',
                    opacity: item.comingSoon ? 0.7 : 1,
                    textAlign: 'left',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                >
                  {isActive && (
                    <div style={{
                      position: 'absolute',
                      left: 0,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 3,
                      height: 24,
                      background: 'linear-gradient(180deg, #10b981 0%, #06b6d4 100%)',
                      borderRadius: '0 4px 4px 0'
                    }} />
                  )}
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: isActive
                      ? 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)'
                      : 'rgba(255,255,255,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    boxShadow: isActive ? '0 4px 15px rgba(16, 185, 129, 0.3)' : 'none',
                    transition: 'all 0.2s'
                  }}>
                    {item.i}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      color: isActive ? 'white' : '#94a3b8',
                      fontSize: 14,
                      fontWeight: isActive ? 600 : 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}>
                      {item.t}
                      {item.comingSoon && (
                        <span style={{
                          fontSize: 9,
                          padding: '2px 6px',
                          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                          color: 'white',
                          borderRadius: 4,
                          fontWeight: 700,
                          letterSpacing: '0.5px',
                          textTransform: 'uppercase'
                        }}>Soon</span>
                      )}
                    </div>
                    <div style={{
                      color: '#64748b',
                      fontSize: 11,
                      marginTop: 1
                    }}>{item.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Administration Section */}
          {(currentUser?.role === 'Super Admin' || currentUser?.role === 'Admin') && (
            <div>
              <div style={{
                color: '#64748b',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '1.5px',
                padding: '0 12px',
                marginBottom: 10
              }}>
                ADMINISTRATION
              </div>
              {[
                ...(currentUser?.role === 'Super Admin' || currentUser?.role === 'Admin' ? [{ k: 'settings', t: 'Settings', i: '⚙️', route: '/settings', desc: 'System Config' }] : []),
                ...(currentUser?.role === 'Super Admin' ? [{ k: 'admin', t: 'User Management', i: '👥', route: '/admin', desc: 'Team & Roles' }] : []),
              ].map(item => {
                const isActive = view === item.k;
                return (
                  <button
                    key={item.k}
                    onClick={() => { navigate(item.route); setCandidate(null); }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 14px',
                      marginBottom: 4,
                      borderRadius: 12,
                      border: 'none',
                      background: isActive
                        ? 'linear-gradient(135deg, rgba(249, 115, 22, 0.15) 0%, rgba(234, 88, 12, 0.15) 100%)'
                        : 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s',
                      position: 'relative'
                    }}
                  >
                    {isActive && (
                      <div style={{
                        position: 'absolute',
                        left: 0,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 3,
                        height: 24,
                        background: 'linear-gradient(180deg, #f97316 0%, #ea580c 100%)',
                        borderRadius: '0 4px 4px 0'
                      }} />
                    )}
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: isActive
                        ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
                        : 'rgba(255,255,255,0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                      boxShadow: isActive ? '0 4px 15px rgba(249, 115, 22, 0.3)' : 'none',
                      transition: 'all 0.2s'
                    }}>
                      {item.i}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        color: isActive ? 'white' : '#94a3b8',
                        fontSize: 14,
                        fontWeight: isActive ? 600 : 500
                      }}>{item.t}</div>
                      <div style={{
                        color: '#64748b',
                        fontSize: 11,
                        marginTop: 1
                      }}>{item.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </nav>

        {/* Quick Stats Card */}
        <div style={{
          margin: '0 12px 12px',
          padding: 16,
          background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
          borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, letterSpacing: '0.5px' }}>TODAY'S ACTIVITY</span>
            <span style={{
              color: '#10b981',
              fontSize: 11,
              fontWeight: 600,
              background: 'rgba(16, 185, 129, 0.15)',
              padding: '2px 8px',
              borderRadius: 6
            }}>+12%</span>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ color: 'white', fontSize: 20, fontWeight: 700 }}>{people.filter(p => {
                const appliedDate = new Date(p.appliedAt || p.createdAt || Date.now());
                const today = new Date();
                return appliedDate.toDateString() === today.toDateString();
              }).length || 0}</div>
              <div style={{ color: '#64748b', fontSize: 10, marginTop: 2 }}>New</div>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ color: 'white', fontSize: 20, fontWeight: 700 }}>{people.filter(p => p.stage !== 'shortlisting' && p.stage !== 'rejected').length || 0}</div>
              <div style={{ color: '#64748b', fontSize: 10, marginTop: 2 }}>Active</div>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ color: 'white', fontSize: 20, fontWeight: 700 }}>{people.filter(p => p.stage === 'hired').length || 0}</div>
              <div style={{ color: '#64748b', fontSize: 10, marginTop: 2 }}>Hired</div>
            </div>
          </div>
        </div>

        {/* User Profile */}
        <div style={{
          padding: '16px 12px',
          borderTop: '1px solid rgba(255,255,255,0.08)'
        }}>
          <div
            onClick={() => navigate('/profile')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: 12,
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 12,
              marginBottom: 12,
              cursor: 'pointer',
              transition: 'all 0.2s',
              border: '1px solid rgba(255,255,255,0.06)'
            }}
          >
            <div style={{
              width: 42,
              height: 42,
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 700,
              fontSize: 14,
              boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
            }}>{currentUser?.name ? currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: 'white', fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentUser?.name || 'User'}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, background: '#10b981', borderRadius: '50%' }} />
                <span style={{ color: '#64748b', fontSize: 12 }}>{currentUser?.role || 'Guest'}</span>
              </div>
            </div>
            <svg width="16" height="16" fill="none" stroke="#64748b" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '12px 16px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: 12,
              color: '#f87171',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </div>

      {/* ==================
          MAIN CONTENT
          ================== */}
      <div style={{ flex: 1, marginLeft: 280, padding: 32, overflow: 'hidden' }}>
        
        {/* ==================
            DASHBOARD
            ================== */}
        {view === 'dash' && (
          <>
            {/* Header with gradient background */}
            <div style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)',
              borderRadius: 20,
              padding: '32px 40px',
              marginBottom: 28,
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Decorative elements */}
              <div style={{
                position: 'absolute',
                top: -50,
                right: -50,
                width: 200,
                height: 200,
                background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)',
                borderRadius: '50%'
              }} />
              <div style={{
                position: 'absolute',
                bottom: -30,
                left: '30%',
                width: 150,
                height: 150,
                background: 'radial-gradient(circle, rgba(14, 165, 233, 0.1) 0%, transparent 70%)',
                borderRadius: '50%'
              }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <span style={{ fontSize: 28 }}>👋</span>
                    <h1 style={{ fontSize: 32, fontWeight: 700, color: 'white', margin: 0 }}>
                      Welcome back{currentUser?.name ? `, ${currentUser.name.split(' ')[0]}` : ''}!
                    </h1>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.7)', margin: 0, fontSize: 15 }}>
                    Here's what's happening with your recruitment pipeline today.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={() => setModal('job')}
                    style={{
                      ...styles.btn1,
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      border: 'none',
                      boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
                    }}
                  >
                    + Create Job
                  </button>
                  <button
                    onClick={() => setModal('person')}
                    style={{
                      ...styles.btn2,
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: 'white',
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    + Add Candidate
                  </button>
                </div>
              </div>
            </div>

            {/* Main Stats Cards - Beautiful gradient cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 28 }}>
              {(() => {
                const today = new Date().toISOString().split('T')[0];
                const thisWeekStart = new Date();
                thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
                const thisWeekStartStr = thisWeekStart.toISOString().split('T')[0];

                const totalApplications = people.length;
                const activeJobs = openings.filter(j => j.on).length;
                const newThisWeek = people.filter(p => p.appliedDate >= thisWeekStartStr).length;
                const avgScore = people.length > 0
                  ? Math.round(people.reduce((sum, p) => sum + (p.aiScore || p.pct || 0), 0) / people.length)
                  : 0;
                const hotApplicants = people.filter(p => (p.aiScore || p.pct || 0) >= 80).length;
                const inInterview = people.filter(p => p.stage === 'interview').length;

                return [
                  {
                    t: 'Total Applications',
                    v: totalApplications,
                    sub: `${newThisWeek} new this week`,
                    icon: '📋',
                    gradient: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                    lightBg: '#ecfeff',
                    route: '/applications',
                    trend: newThisWeek > 0 ? `+${newThisWeek}` : '0'
                  },
                  {
                    t: 'Active Jobs',
                    v: activeJobs,
                    sub: `${openings.length} total positions`,
                    icon: '💼',
                    gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                    lightBg: '#f5f3ff',
                    route: '/jobs',
                    trend: activeJobs > 0 ? 'Hiring' : 'None'
                  },
                  {
                    t: 'Hot Applicants',
                    v: hotApplicants,
                    sub: `Score 80%+ match`,
                    icon: '🔥',
                    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    lightBg: '#fffbeb',
                    route: '/applications',
                    trend: hotApplicants > 0 ? 'Review now' : '-'
                  },
                  {
                    t: 'In Interview',
                    v: inInterview,
                    sub: `Active candidates`,
                    icon: '🎯',
                    gradient: 'linear-gradient(135deg, #10b981, #059669)',
                    lightBg: '#ecfdf5',
                    route: '/applications',
                    trend: inInterview > 0 ? 'In progress' : '-'
                  },
                ];
              })().map((stat, i) => (
                <div
                  key={i}
                  onClick={() => navigate(stat.route)}
                  style={{
                    background: 'white',
                    borderRadius: 16,
                    padding: 0,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-6px)';
                    e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.08)';
                  }}
                >
                  {/* Gradient header */}
                  <div style={{
                    background: stat.gradient,
                    padding: '16px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ fontSize: 28 }}>{stat.icon}</span>
                    <span style={{
                      background: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      padding: '4px 10px',
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 600,
                      backdropFilter: 'blur(10px)'
                    }}>{stat.trend}</span>
                  </div>
                  {/* Content */}
                  <div style={{ padding: '20px' }}>
                    <div style={{ fontSize: 36, fontWeight: 800, color: '#1e293b', marginBottom: 4, letterSpacing: '-1px' }}>
                      {stat.v.toLocaleString()}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#334155', marginBottom: 4 }}>{stat.t}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>{stat.sub}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Actions Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 28 }}>
              {[
                { icon: '📝', label: 'Post Job', desc: 'Create new position', action: () => setModal('job'), color: '#0ea5e9' },
                { icon: '👤', label: 'Add Candidate', desc: 'Manual entry', action: () => setModal('person'), color: '#8b5cf6' },
                { icon: '📊', label: 'View Pipeline', desc: 'Kanban board', action: () => { setView('applications'); setPipelineMode('kanban'); }, color: '#10b981' },
                { icon: '⚙️', label: 'Settings', desc: 'Job configuration', action: () => setView('admin'), color: '#f59e0b' },
                { icon: '👥', label: 'All Candidates', desc: 'Browse database', action: () => setView('applications'), color: '#ec4899' },
              ].map((action, i) => (
                <button
                  key={i}
                  onClick={action.action}
                  style={{
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: 14,
                    padding: '20px 16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.1)';
                    e.currentTarget.style.borderColor = action.color;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                >
                  <div style={{
                    width: 48,
                    height: 48,
                    background: `${action.color}15`,
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24
                  }}>{action.icon}</div>
                  <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>{action.label}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{action.desc}</div>
                </button>
              ))}
            </div>

            {/* Three Column Layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gap: 20 }}>

              {/* Hiring Pipeline Overview */}
              <div style={{
                background: 'white',
                borderRadius: 16,
                padding: 24,
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                      borderRadius: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <span style={{ fontSize: 18 }}>📊</span>
                    </div>
                    <span style={{ fontWeight: 700, color: '#1e293b', fontSize: 16 }}>Pipeline</span>
                  </div>
                  <button
                    onClick={() => { setView('applications'); setPipelineMode('kanban'); }}
                    style={{ background: 'none', border: 'none', color: '#8b5cf6', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}
                  >
                    View All →
                  </button>
                </div>

                {(() => {
                  const stageData = [
                    { name: 'Shortlisting', key: 'shortlisting', color: '#0ea5e9', icon: '📋' },
                    { name: 'Screening', key: 'screening', color: '#8b5cf6', icon: '🔍' },
                    { name: 'Interview', key: 'interview', color: '#f59e0b', icon: '🎤' },
                    { name: 'Hired', key: 'hired', color: '#10b981', icon: '✅' },
                  ];
                  const total = people.length || 1;

                  return stageData.map((stage, i) => {
                    const count = people.filter(p => p.stage === stage.key).length;
                    const pct = Math.round((count / total) * 100);
                    return (
                      <div
                        key={i}
                        onClick={() => { setView('applications'); setPipelineMode('kanban'); }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '12px 14px',
                          background: '#f8fafc',
                          borderRadius: 10,
                          marginBottom: 10,
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#f8fafc'}
                      >
                        <span style={{ fontSize: 18 }}>{stage.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: 500, color: '#334155' }}>{stage.name}</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: stage.color }}>{count}</span>
                          </div>
                          <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{
                              width: `${pct}%`,
                              height: '100%',
                              background: stage.color,
                              borderRadius: 3,
                              transition: 'width 0.5s ease'
                            }} />
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Recent Applications - Larger middle column */}
              <div style={{
                background: 'white',
                borderRadius: 16,
                padding: 24,
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      borderRadius: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <span style={{ fontSize: 18 }}>👥</span>
                    </div>
                    <span style={{ fontWeight: 700, color: '#1e293b', fontSize: 16 }}>Recent Applications</span>
                  </div>
                  <button
                    onClick={() => navigate('/applications')}
                    style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}
                  >
                    View All →
                  </button>
                </div>

                {people.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                    <span style={{ fontSize: 48, display: 'block', marginBottom: 12 }}>📭</span>
                    <div style={{ fontWeight: 500, marginBottom: 4 }}>No applications yet</div>
                    <div style={{ fontSize: 13 }}>Applications will appear here</div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {people.slice(0, 5).map(c => (
                      <div
                        key={c.id}
                        onClick={() => { setCandidate(c); navigate(`/applications/candidate/${c.id}`); }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 14,
                          padding: '14px 16px',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: 12,
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'white';
                          e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.08)';
                          e.currentTarget.style.transform = 'translateX(4px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#f8fafc';
                          e.currentTarget.style.boxShadow = 'none';
                          e.currentTarget.style.transform = 'translateX(0)';
                        }}
                      >
                        <div style={{
                          width: 44,
                          height: 44,
                          background: 'linear-gradient(135deg, #44924c, #2d6a33)',
                          borderRadius: 12,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 700,
                          fontSize: 15,
                          flexShrink: 0
                        }}>{init(c.name)}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                            <span style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>{c.name}</span>
                            {(c.aiScore || c.pct || 0) >= 80 && <span style={{ fontSize: 14 }}>🔥</span>}
                          </div>
                          <div style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {c.role}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '4px 10px',
                            background: color(c.aiScore || c.pct || 0) + '15',
                            color: color(c.aiScore || c.pct || 0),
                            borderRadius: 20,
                            fontWeight: 700,
                            fontSize: 13
                          }}>
                            {c.aiScore || c.pct || 0}%
                          </div>
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, textTransform: 'capitalize' }}>{c.stage}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* AI Insights & Active Jobs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* AI Insights */}
                <div style={{
                  background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
                  borderRadius: 16,
                  padding: 24,
                  color: 'white'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                    <span style={{ fontSize: 24 }}>✨</span>
                    <span style={{ fontWeight: 700, fontSize: 16 }}>AI Insights</span>
                  </div>

                  {(() => {
                    const highMatch = people.filter(p => (p.aiScore || p.pct || 0) >= 80).length;
                    const pendingReview = people.filter(p => p.stage === 'shortlisting').length;
                    const inProgress = people.filter(p => ['screening', 'interview'].includes(p.stage)).length;

                    const insights = [];
                    if (highMatch > 0) insights.push({ t: `${highMatch} high-match candidates`, c: '#10b981', icon: '🎯' });
                    if (pendingReview > 0) insights.push({ t: `${pendingReview} awaiting review`, c: '#f59e0b', icon: '⏳' });
                    if (inProgress > 0) insights.push({ t: `${inProgress} in active pipeline`, c: '#0ea5e9', icon: '🔄' });
                    if (insights.length === 0) insights.push({ t: 'No pending actions', c: '#10b981', icon: '✅' });

                    return insights.slice(0, 3).map((item, i) => (
                      <div
                        key={i}
                        onClick={() => navigate('/applications')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '12px 14px',
                          background: 'rgba(255,255,255,0.08)',
                          borderRadius: 10,
                          marginBottom: 10,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          backdropFilter: 'blur(10px)'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                      >
                        <span style={{ fontSize: 18 }}>{item.icon}</span>
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{item.t}</span>
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16 }}>→</span>
                      </div>
                    ));
                  })()}
                </div>

                {/* Active Jobs Quick View */}
                <div style={{
                  background: 'white',
                  borderRadius: 16,
                  padding: 24,
                  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                  flex: 1
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 20 }}>💼</span>
                      <span style={{ fontWeight: 700, color: '#1e293b', fontSize: 15 }}>Active Jobs</span>
                    </div>
                    <button
                      onClick={() => setView('jobs')}
                      style={{ background: 'none', border: 'none', color: '#8b5cf6', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}
                    >
                      All →
                    </button>
                  </div>

                  {openings.filter(j => j.on).length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                      <div style={{ fontSize: 13 }}>No active jobs</div>
                    </div>
                  ) : (
                    openings.filter(j => j.on).slice(0, 3).map((job, i) => {
                      const applicants = people.filter(p => p.role === job.name).length;
                      return (
                        <div
                          key={job.id}
                          onClick={() => { setSelectedJob(job); setModal('jobDetails'); }}
                          style={{
                            padding: '12px 14px',
                            background: '#f8fafc',
                            borderRadius: 10,
                            marginBottom: 8,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#f8fafc'}
                        >
                          <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 13, marginBottom: 4 }}>{job.name}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b' }}>
                            <span>{job.team}</span>
                            <span style={{ color: '#8b5cf6', fontWeight: 600 }}>{applicants} applicants</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ==================
            JOBS SCREEN - Enterprise Redesign
            ================== */}
        {view === 'jobs' && (
          <>
            {/* Hero Header */}
            <div style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
              borderRadius: 20,
              padding: 32,
              marginBottom: 28,
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Background decorations */}
              <div style={{
                position: 'absolute',
                top: -50,
                right: -50,
                width: 200,
                height: 200,
                background: 'radial-gradient(circle, rgba(16, 185, 129, 0.3) 0%, transparent 70%)',
                borderRadius: '50%'
              }} />
              <div style={{
                position: 'absolute',
                bottom: -30,
                left: '30%',
                width: 150,
                height: 150,
                background: 'radial-gradient(circle, rgba(14, 165, 233, 0.2) 0%, transparent 70%)',
                borderRadius: '50%'
              }} />

              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                  <div>
                    <h2 style={{ color: 'white', fontSize: 28, fontWeight: 700, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{
                        width: 48,
                        height: 48,
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        borderRadius: 14,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 22
                      }}>&#128188;</span>
                      Job Openings
                    </h2>
                    <p style={{ color: '#94a3b8', margin: 0, fontSize: 15 }}>
                      Manage your open positions and track candidate applications
                    </p>
                  </div>
                  <button
                    onClick={() => setModal('job')}
                    style={{
                      padding: '14px 28px',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 12,
                      fontSize: 15,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <span style={{ fontSize: 18 }}>+</span> Create Job
                  </button>
                </div>

                {/* Stats Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                  {[
                    { label: 'Total Jobs', value: openings.length, icon: '&#128188;', color: '#6366f1' },
                    { label: 'Active', value: openings.filter(j => j.on).length, icon: '&#9989;', color: '#10b981' },
                    { label: 'Paused', value: openings.filter(j => !j.on).length, icon: '&#9208;', color: '#f59e0b' },
                    { label: 'Total Applications', value: openings.reduce((sum, j) => sum + (j.count || 0), 0), icon: '&#128203;', color: '#0ea5e9' }
                  ].map((stat, i) => (
                    <div key={i} style={{
                      background: 'rgba(255,255,255,0.08)',
                      backdropFilter: 'blur(10px)',
                      borderRadius: 14,
                      padding: 16,
                      border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <span style={{
                          width: 32,
                          height: 32,
                          background: `${stat.color}25`,
                          borderRadius: 8,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 16
                        }} dangerouslySetInnerHTML={{ __html: stat.icon }} />
                        <span style={{ color: '#94a3b8', fontSize: 12, fontWeight: 500 }}>{stat.label}</span>
                      </div>
                      <div style={{ color: 'white', fontSize: 28, fontWeight: 700 }}>{stat.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Filter Tabs */}
            <div style={{
              display: 'flex',
              gap: 8,
              marginBottom: 24,
              background: '#f1f5f9',
              padding: 6,
              borderRadius: 14,
              width: 'fit-content'
            }}>
              {[
                { key: 'All', icon: '&#128203;', count: openings.length },
                { key: 'Active', icon: '&#9989;', count: openings.filter(j => j.on).length },
                { key: 'Paused', icon: '&#9208;', count: openings.filter(j => !j.on).length }
              ].map(filter => (
                <button
                  key={filter.key}
                  onClick={() => setTab(filter.key)}
                  style={{
                    padding: '12px 24px',
                    borderRadius: 10,
                    border: 'none',
                    background: tab === filter.key ? 'white' : 'transparent',
                    color: tab === filter.key ? '#1e293b' : '#64748b',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: 14,
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: tab === filter.key ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'
                  }}
                >
                  <span dangerouslySetInnerHTML={{ __html: filter.icon }} />
                  {filter.key}
                  <span style={{
                    background: tab === filter.key ? '#10b981' : '#cbd5e1',
                    color: tab === filter.key ? 'white' : '#64748b',
                    padding: '2px 8px',
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 700
                  }}>{filter.count}</span>
                </button>
              ))}
            </div>

            {/* Job Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
              {(() => {
                const filteredJobs = openings.filter(j => tab === 'All' || (tab === 'Active' ? j.on : !j.on));
                const startIndex = (jobCurrentPage - 1) * jobItemsPerPage;
                const endIndex = startIndex + jobItemsPerPage;
                const paginatedJobs = filteredJobs.slice(startIndex, endIndex);

                if (paginatedJobs.length === 0) {
                  return (
                    <div style={{
                      gridColumn: '1 / -1',
                      padding: 80,
                      textAlign: 'center',
                      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                      borderRadius: 20,
                      border: '2px dashed #cbd5e1'
                    }}>
                      <div style={{
                        width: 80,
                        height: 80,
                        background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
                        borderRadius: 20,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 36,
                        margin: '0 auto 20px'
                      }}>&#128188;</div>
                      <div style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>No jobs found</div>
                      <div style={{ fontSize: 14, color: '#64748b', marginBottom: 24 }}>
                        {tab === 'All' ? 'Create your first job opening to start recruiting' : `No ${tab.toLowerCase()} jobs at the moment`}
                      </div>
                      {tab === 'All' && (
                        <button
                          onClick={() => setModal('job')}
                          style={{
                            padding: '14px 28px',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 12,
                            fontSize: 15,
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)'
                          }}
                        >
                          + Create Your First Job
                        </button>
                      )}
                    </div>
                  );
                }

                return paginatedJobs.map((job, idx) => (
                <div
                  key={job.id}
                  style={{
                    position: 'relative',
                    background: 'white',
                    borderRadius: 16,
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
                    overflow: 'hidden'
                  }}
                  onClick={() => {
                    setSelectedJob(job);
                    setModal('jobDetails');
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.04)';
                  }}
                >
                  {/* Top Gradient Bar */}
                  <div style={{
                    height: 4,
                    background: job.on
                      ? `linear-gradient(90deg, ${['#10b981', '#0ea5e9', '#6366f1', '#8b5cf6', '#ec4899'][idx % 5]} 0%, ${['#34d399', '#38bdf8', '#8b5cf6', '#a78bfa', '#f472b6'][idx % 5]} 100%)`
                      : 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)'
                  }} />

                  <div style={{ padding: 24 }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                          <div style={{
                            width: 48,
                            height: 48,
                            background: job.on
                              ? `linear-gradient(135deg, ${['#10b981', '#0ea5e9', '#6366f1', '#8b5cf6', '#ec4899'][idx % 5]}15 0%, ${['#10b981', '#0ea5e9', '#6366f1', '#8b5cf6', '#ec4899'][idx % 5]}25 100%)`
                              : 'linear-gradient(135deg, #f59e0b15 0%, #f59e0b25 100%)',
                            borderRadius: 12,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 22
                          }}>&#128188;</div>
                          <div>
                            <h3 style={{
                              fontSize: 17,
                              fontWeight: 700,
                              color: '#1e293b',
                              margin: 0
                            }}>{job.name}</h3>
                            <div style={{ display: 'flex', gap: 8, color: '#64748b', fontSize: 13, marginTop: 4 }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span>&#127970;</span> {job.team}
                              </span>
                              <span>&#8226;</span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span>&#128205;</span> {job.place}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Tags */}
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: 11,
                            color: '#6366f1',
                            background: 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)',
                            padding: '5px 12px',
                            borderRadius: 8,
                            fontWeight: 600,
                            border: '1px solid #c7d2fe'
                          }}>
                            {job.roleType}
                          </span>
                          <span style={{
                            fontSize: 11,
                            color: '#0891b2',
                            background: 'linear-gradient(135deg, #ecfeff 0%, #cffafe 100%)',
                            padding: '5px 12px',
                            borderRadius: 8,
                            fontWeight: 600,
                            border: '1px solid #a5f3fc'
                          }}>
                            {job.workSetup}
                          </span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <button
                        onClick={(e) => { e.stopPropagation(); flip(job.id); }}
                        style={{
                          padding: '8px 16px',
                          borderRadius: 20,
                          border: 'none',
                          background: job.on
                            ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)'
                            : 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                          color: job.on ? '#059669' : '#d97706',
                          fontWeight: 700,
                          fontSize: 12,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          boxShadow: job.on ? '0 2px 8px rgba(16, 185, 129, 0.2)' : '0 2px 8px rgba(245, 158, 11, 0.2)',
                          transition: 'all 0.2s'
                        }}
                      >
                        <span style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: job.on ? '#10b981' : '#f59e0b'
                        }} />
                        {job.on ? 'Active' : 'Paused'}
                      </button>
                    </div>

                    {/* Statistics Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                      <div style={{
                        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                        borderRadius: 12,
                        padding: 14,
                        border: '1px solid #e2e8f0',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: '#1e293b' }}>{job.count}</div>
                        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginTop: 4 }}>Applications</div>
                      </div>
                      <div style={{
                        background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                        borderRadius: 12,
                        padding: 14,
                        border: '1px solid #bbf7d0',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: '#10b981' }}>{job.good}</div>
                        <div style={{ fontSize: 11, color: '#059669', fontWeight: 600, marginTop: 4 }}>High Match</div>
                      </div>
                      <div style={{
                        background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                        borderRadius: 12,
                        padding: 14,
                        border: '1px solid #bfdbfe',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: '#3b82f6' }}>{job.count > 0 ? Math.round((job.good / job.count) * 100) : 0}%</div>
                        <div style={{ fontSize: 11, color: '#2563eb', fontWeight: 600, marginTop: 4 }}>Match Rate</div>
                      </div>
                    </div>

                    {/* Application Link */}
                    <div style={{
                      padding: 14,
                      background: 'linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)',
                      borderRadius: 12,
                      marginBottom: 16,
                      border: '1px solid #fde047'
                    }}>
                      <div style={{
                        fontSize: 11,
                        color: '#854d0e',
                        marginBottom: 8,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}>
                        <span>&#128279;</span> Application Link
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                          readOnly
                          value={getJobUrl(job)}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            flex: 1,
                            padding: '10px 14px',
                            border: '2px solid #fde047',
                            borderRadius: 10,
                            fontSize: 12,
                            background: 'white',
                            color: '#475569',
                            fontFamily: 'monospace',
                            fontWeight: 500
                          }}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(getJobUrl(job));
                            pop('Application link copied to clipboard!');
                          }}
                          style={{
                            padding: '10px 18px',
                            background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 10,
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 2px 8px rgba(234, 179, 8, 0.3)',
                            transition: 'all 0.2s'
                          }}
                        >
                          Copy
                        </button>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: 10, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedJobForEdit(job);
                          setJobForm({
                            title: job.name,
                            dept: job.team,
                            location: job.place,
                            aboutCompany: job.aboutCompany || '',
                            jobOverview: job.jobOverview || '',
                            keyResponsibilities: job.keyResponsibilities || '',
                            qualifications: job.qualifications || '',
                            preferredQualifications: job.preferredQualifications || '',
                            roleType: job.roleType || 'Full-time',
                            workSetup: job.workSetup || 'Remote',
                            salaryMin: job.salaryMin || '',
                            salaryMax: job.salaryMax || '',
                            experienceMin: job.experienceMin || '',
                            experienceMax: job.experienceMax || '',
                            skills: job.skills || '',
                            benefits: job.benefits || '',
                            applicationDeadline: job.applicationDeadline || ''
                          });
                          setModal('job');
                        }}
                        style={{
                          flex: 1,
                          padding: '12px 16px',
                          background: 'white',
                          border: '2px solid #e2e8f0',
                          borderRadius: 10,
                          fontSize: 13,
                          fontWeight: 600,
                          color: '#475569',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6
                        }}
                      >
                        <span>&#9998;</span> Edit
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedJob(job); setModal('jobDetails'); }}
                        style={{
                          flex: 1,
                          padding: '12px 16px',
                          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                          border: 'none',
                          borderRadius: 10,
                          fontSize: 13,
                          fontWeight: 600,
                          color: 'white',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)'
                        }}
                      >
                        <span>&#128196;</span> Details
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setJobFilter(String(job.id));
                          navigate('/applications');
                        }}
                        style={{
                          flex: 1,
                          padding: '12px 16px',
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          border: 'none',
                          borderRadius: 10,
                          fontSize: 13,
                          fontWeight: 600,
                          color: 'white',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                        }}
                      >
                        <span>&#128203;</span> Applications
                      </button>
                    </div>
                  </div>
                </div>
              ));
            })()}
            </div>

            {/* Pagination Controls */}
            {(() => {
              const filteredJobs = openings.filter(j => tab === 'All' || (tab === 'Active' ? j.on : !j.on));
              const totalPages = Math.ceil(filteredJobs.length / jobItemsPerPage);
              const startIndex = (jobCurrentPage - 1) * jobItemsPerPage;

              return filteredJobs.length > 0 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 20,
                  background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                  borderRadius: 16,
                  border: '1px solid #e2e8f0',
                  marginTop: 24
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{
                      fontSize: 14,
                      color: '#1e293b',
                      fontWeight: 600,
                      background: 'white',
                      padding: '8px 16px',
                      borderRadius: 10,
                      border: '1px solid #e2e8f0'
                    }}>
                      Showing {startIndex + 1}-{Math.min(startIndex + jobItemsPerPage, filteredJobs.length)} of {filteredJobs.length}
                    </span>
                    <select
                      value={jobItemsPerPage}
                      onChange={(e) => {
                        setJobItemsPerPage(Number(e.target.value));
                        setJobCurrentPage(1);
                      }}
                      style={{
                        padding: '10px 16px',
                        borderRadius: 10,
                        border: '2px solid #e2e8f0',
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: 'pointer',
                        background: 'white',
                        color: '#1e293b'
                      }}
                    >
                      <option value={10}>10 per page</option>
                      <option value={20}>20 per page</option>
                      <option value={50}>50 per page</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => setJobCurrentPage(1)}
                      disabled={jobCurrentPage === 1}
                      style={{
                        padding: '10px 16px',
                        background: jobCurrentPage === 1 ? '#f1f5f9' : 'white',
                        border: '2px solid #e2e8f0',
                        borderRadius: 10,
                        fontSize: 13,
                        fontWeight: 600,
                        color: jobCurrentPage === 1 ? '#94a3b8' : '#475569',
                        cursor: jobCurrentPage === 1 ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      &#9198; First
                    </button>
                    <button
                      onClick={() => setJobCurrentPage(jobCurrentPage - 1)}
                      disabled={jobCurrentPage === 1}
                      style={{
                        padding: '10px 16px',
                        background: jobCurrentPage === 1 ? '#f1f5f9' : 'white',
                        border: '2px solid #e2e8f0',
                        borderRadius: 10,
                        fontSize: 13,
                        fontWeight: 600,
                        color: jobCurrentPage === 1 ? '#94a3b8' : '#475569',
                        cursor: jobCurrentPage === 1 ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      &#9664; Prev
                    </button>
                    <div style={{
                      padding: '10px 20px',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: 'white',
                      borderRadius: 10,
                      fontWeight: 700,
                      fontSize: 14,
                      boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                    }}>
                      Page {jobCurrentPage} of {totalPages || 1}
                    </div>
                    <button
                      onClick={() => setJobCurrentPage(jobCurrentPage + 1)}
                      disabled={jobCurrentPage >= totalPages}
                      style={{
                        padding: '10px 16px',
                        background: jobCurrentPage >= totalPages ? '#f1f5f9' : 'white',
                        border: '2px solid #e2e8f0',
                        borderRadius: 10,
                        fontSize: 13,
                        fontWeight: 600,
                        color: jobCurrentPage >= totalPages ? '#94a3b8' : '#475569',
                        cursor: jobCurrentPage >= totalPages ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      Next &#9654;
                    </button>
                    <button
                      onClick={() => setJobCurrentPage(totalPages)}
                      disabled={jobCurrentPage >= totalPages}
                      style={{
                        padding: '10px 16px',
                        background: jobCurrentPage >= totalPages ? '#f1f5f9' : 'white',
                        border: '2px solid #e2e8f0',
                        borderRadius: 10,
                        fontSize: 13,
                        fontWeight: 600,
                        color: jobCurrentPage >= totalPages ? '#94a3b8' : '#475569',
                        cursor: jobCurrentPage >= totalPages ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      Last &#9197;
                    </button>
                  </div>
                </div>
              );
            })()}
          </>
        )}

        {/* ==================
            APPLICATIONS SCREEN
            ================== */}
        {view === 'pipeline' && (
          <>
            {/* Hero Header - Enterprise Design */}
            <div style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
              borderRadius: 20,
              padding: 32,
              marginBottom: 28,
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Background decorations */}
              <div style={{
                position: 'absolute',
                top: -50,
                right: -50,
                width: 200,
                height: 200,
                background: 'radial-gradient(circle, rgba(14, 165, 233, 0.3) 0%, transparent 70%)',
                borderRadius: '50%'
              }} />
              <div style={{
                position: 'absolute',
                bottom: -30,
                left: '30%',
                width: 150,
                height: 150,
                background: 'radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, transparent 70%)',
                borderRadius: '50%'
              }} />
              <div style={{
                position: 'absolute',
                top: '20%',
                left: '10%',
                width: 100,
                height: 100,
                background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)',
                borderRadius: '50%'
              }} />

              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                  <div>
                    <h2 style={{ color: 'white', fontSize: 28, fontWeight: 700, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{
                        width: 48,
                        height: 48,
                        background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
                        borderRadius: 14,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 22
                      }}>&#128203;</span>
                      Applications Pipeline
                    </h2>
                    <p style={{ color: '#94a3b8', margin: 0, fontSize: 15 }}>
                      Track, review, and manage all candidate applications through your hiring pipeline
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={() => setApplicationsView('list')}
                      style={{
                        padding: '10px 18px',
                        background: applicationsView === 'list' ? 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)' : 'rgba(255,255,255,0.1)',
                        border: applicationsView === 'list' ? 'none' : '1px solid rgba(255,255,255,0.2)',
                        borderRadius: 10,
                        color: 'white',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        backdropFilter: 'blur(10px)',
                        boxShadow: applicationsView === 'list' ? '0 4px 15px rgba(14, 165, 233, 0.3)' : 'none'
                      }}
                    >
                      &#128203; List View
                    </button>
                    <button
                      onClick={() => setApplicationsView('pipeline')}
                      style={{
                        padding: '10px 18px',
                        background: applicationsView === 'pipeline' ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' : 'rgba(255,255,255,0.1)',
                        border: applicationsView === 'pipeline' ? 'none' : '1px solid rgba(255,255,255,0.2)',
                        borderRadius: 10,
                        color: 'white',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        backdropFilter: 'blur(10px)',
                        boxShadow: applicationsView === 'pipeline' ? '0 4px 15px rgba(139, 92, 246, 0.3)' : 'none'
                      }}
                    >
                      &#128260; Pipeline
                    </button>
                    {applicationsView === 'pipeline' && (
                      <button
                        onClick={() => setKanbanEnabled(!kanbanEnabled)}
                        style={{
                          padding: '10px 18px',
                          background: kanbanEnabled ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'rgba(255,255,255,0.1)',
                          border: kanbanEnabled ? 'none' : '1px solid rgba(255,255,255,0.2)',
                          borderRadius: 10,
                          color: 'white',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          backdropFilter: 'blur(10px)',
                          boxShadow: kanbanEnabled ? '0 4px 15px rgba(16, 185, 129, 0.3)' : 'none'
                        }}
                        title={kanbanEnabled ? 'Drag & Drop Enabled' : 'Enable Drag & Drop'}
                      >
                        {kanbanEnabled ? '&#127919; Kanban Mode' : '&#128274; View Only'}
                      </button>
                    )}
                    <button
                      onClick={() => setModal('person')}
                      style={{
                        padding: '10px 20px',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        border: 'none',
                        borderRadius: 10,
                        color: 'white',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
                      }}
                    >
                      + Add Candidate
                    </button>
                  </div>
                </div>

                {/* Stats Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
                  {[
                    { label: 'Total Applications', value: people.length, icon: '&#128203;', color: '#0ea5e9' },
                    { label: 'In Screening', value: people.filter(p => p.stage === 'screening').length, icon: '&#128269;', color: '#8b5cf6' },
                    { label: 'Interviewing', value: people.filter(p => p.stage === 'interview').length, icon: '&#127908;', color: '#f59e0b' },
                    { label: 'High Match (80%+)', value: people.filter(p => (p.aiScore || 0) >= 80).length, icon: '&#128293;', color: '#ef4444' },
                    { label: 'Hired', value: people.filter(p => p.stage === 'hired').length, icon: '&#9989;', color: '#10b981' }
                  ].map((stat, i) => (
                    <div key={i} style={{
                      background: 'rgba(255,255,255,0.08)',
                      backdropFilter: 'blur(10px)',
                      borderRadius: 14,
                      padding: 16,
                      border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <span style={{
                          width: 32,
                          height: 32,
                          background: `${stat.color}25`,
                          borderRadius: 8,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 16
                        }} dangerouslySetInnerHTML={{ __html: stat.icon }} />
                        <span style={{ color: '#94a3b8', fontSize: 12, fontWeight: 500 }}>{stat.label}</span>
                      </div>
                      <div style={{ color: 'white', fontSize: 28, fontWeight: 700 }}>{stat.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Stats Cards - Compact Design with Progress */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 8, marginBottom: 20 }}>
              {stages.map((stage) => {
                const count = people.filter(p => p.stage === stage.id).length;
                const isSelected = selectedStage === stage.id;
                const totalPeople = people.length || 1;
                const percentage = Math.round((count / totalPeople) * 100);

                return (
                  <div
                    key={stage.id}
                    onClick={() => setSelectedStage(selectedStage === stage.id ? 'all' : stage.id)}
                    style={{
                      padding: '10px 8px',
                      cursor: 'pointer',
                      background: 'white',
                      borderRadius: 10,
                      transition: 'all 0.2s ease',
                      boxShadow: isSelected
                        ? `0 4px 12px ${stage.color}35, 0 0 0 2px ${stage.color}`
                        : '0 2px 6px rgba(0,0,0,0.06)',
                      border: `1px solid ${isSelected ? stage.color : '#e2e8f0'}`,
                      minWidth: 0
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = stage.color;
                        e.currentTarget.style.boxShadow = `0 3px 10px ${stage.color}20`;
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = '#e2e8f0';
                        e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.06)';
                      }
                    }}
                  >
                    {/* Icon + Count Row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 12 }}>{stage.icon}</span>
                      <span style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: stage.color
                      }}>
                        {count}
                      </span>
                    </div>

                    {/* Stage Name */}
                    <div style={{
                      fontSize: 9,
                      color: isSelected ? stage.color : '#64748b',
                      fontWeight: 600,
                      textAlign: 'center',
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      marginBottom: 6
                    }}>
                      {stage.name}
                    </div>

                    {/* Progress Bar */}
                    <div style={{
                      height: 3,
                      background: '#e2e8f0',
                      borderRadius: 2,
                      overflow: 'hidden',
                      marginBottom: 4
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${percentage}%`,
                        background: stage.color,
                        borderRadius: 2,
                        transition: 'width 0.3s ease'
                      }} />
                    </div>

                    {/* Percentage */}
                    <div style={{
                      fontSize: 9,
                      color: '#94a3b8',
                      textAlign: 'center',
                      fontWeight: 500
                    }}>
                      {percentage}%
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Filters Bar - Compact */}
            <div style={{
              background: '#f8fafc',
              borderRadius: 10,
              padding: 16,
              marginBottom: 20,
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ marginBottom: 12 }}>
                <h3 style={{ fontSize: 12, fontWeight: 600, color: '#475569', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Filter & Search
                </h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr auto', gap: 12, alignItems: 'center' }}>
                {/* Search */}
                <div style={{ position: 'relative' }}>
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by name, email, or skills..."
                    style={{
                      ...styles.input,
                      margin: 0,
                      paddingLeft: 40,
                      background: 'white',
                      border: '2px solid #e2e8f0',
                      fontSize: 14
                    }}
                  />
                  <span style={{
                    position: 'absolute',
                    left: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: 16
                  }}>
                    🔍
                  </span>
                </div>

                {/* Job Filter */}
                <select
                  value={jobFilter}
                  onChange={e => setJobFilter(e.target.value)}
                  style={{
                    ...styles.input,
                    margin: 0,
                    background: 'white',
                    border: '2px solid #e2e8f0',
                    fontSize: 14,
                    fontWeight: 500
                  }}
                >
                  <option value="all">💼 All Jobs</option>
                  {openings.map(job => (
                    <option key={job.id} value={job.id}>{job.name}</option>
                  ))}
                </select>

                {/* Stage Filter */}
                <select
                  value={selectedStage}
                  onChange={e => setSelectedStage(e.target.value)}
                  style={{
                    ...styles.input,
                    margin: 0,
                    background: 'white',
                    border: '2px solid #e2e8f0',
                    fontSize: 14,
                    fontWeight: 500
                  }}
                >
                  <option value="all">📊 All Stages</option>
                  <option value="shortlisting">📋 Shortlisting</option>
                  <option value="screening">📞 Screening Call</option>
                  <option value="assignment-sent">📝 Assignment Sent</option>
                  <option value="assignment-submitted">✅ Assignment Submitted</option>
                  <option value="interview">💼 Interviews</option>
                  <option value="offer-sent">📧 Offer Sent</option>
                  <option value="offer-accepted">🤝 Offer Accepted</option>
                  <option value="hired">✅ Hired</option>
                  <option value="rejected">❌ Rejected</option>
                </select>

                {/* Score Filter */}
                <select
                  value={scoreFilter}
                  onChange={e => setScoreFilter(e.target.value)}
                  style={{
                    ...styles.input,
                    margin: 0,
                    background: 'white',
                    border: '2px solid #e2e8f0',
                    fontSize: 14,
                    fontWeight: 500
                  }}
                >
                  <option value="all">🤖 All Scores</option>
                  <option value="exceptional">⭐ Exceptional (90+)</option>
                  <option value="strong">💪 Strong (80-89)</option>
                  <option value="good">👍 Good (70-79)</option>
                  <option value="below">📉 Below 70</option>
                </select>

                {/* Sort */}
                <select style={{
                  ...styles.input,
                  margin: 0,
                  background: 'white',
                  border: '2px solid #e2e8f0',
                  fontSize: 14,
                  fontWeight: 500
                }}>
                  <option>🔽 Newest First</option>
                  <option>🔼 Oldest First</option>
                  <option>📈 Highest Score</option>
                  <option>📉 Lowest Score</option>
                  <option>⚡ Most Urgent</option>
                </select>

                {/* Hot Applicant Filter */}
                <button
                  onClick={() => setHotApplicantFilter(!hotApplicantFilter)}
                  style={{
                    ...styles.btn2,
                    background: hotApplicantFilter ? 'linear-gradient(135deg, #fef3c7, #fde68a)' : 'white',
                    color: hotApplicantFilter ? '#d97706' : '#64748b',
                    border: hotApplicantFilter ? '2px solid #f59e0b' : '2px solid #e2e8f0',
                    whiteSpace: 'nowrap',
                    fontWeight: 600,
                    boxShadow: hotApplicantFilter ? '0 4px 12px rgba(245, 158, 11, 0.3)' : 'none'
                  }}
                >
                  🔥 Hot
                </button>

                {/* Attention Filter */}
                <button
                  onClick={() => setAttentionFilter(!attentionFilter)}
                  style={{
                    ...styles.btn2,
                    background: attentionFilter ? 'linear-gradient(135deg, #fee2e2, #fecaca)' : 'white',
                    color: attentionFilter ? '#dc2626' : '#64748b',
                    border: attentionFilter ? '2px solid #dc2626' : '2px solid #e2e8f0',
                    whiteSpace: 'nowrap',
                    fontWeight: 600,
                    boxShadow: attentionFilter ? '0 4px 12px rgba(220, 38, 38, 0.2)' : 'none'
                  }}
                >
                  ⚠️ Urgent
                </button>

                {/* Reset Button */}
                {(searchQuery || jobFilter !== 'all' || selectedStage !== 'all' || scoreFilter !== 'all' || attentionFilter || hotApplicantFilter) && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setJobFilter('all');
                      setSelectedStage('all');
                      setScoreFilter('all');
                      setAttentionFilter(false);
                      setHotApplicantFilter(false);
                    }}
                    style={{
                      ...styles.btn2,
                      background: '#f1f5f9',
                      color: '#64748b',
                      border: '2px solid #cbd5e1',
                      whiteSpace: 'nowrap',
                      fontWeight: 600
                    }}
                  >
                    🔄 Reset
                  </button>
                )}
              </div>
            </div>

            {/* LIST VIEW */}
            {applicationsView === 'list' && (
              <div style={styles.box}>
                {/* Table Header */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '2.5fr 1.5fr 1fr 1.2fr 1.2fr 1fr 100px',
                  gap: 16,
                  padding: '16px 20px',
                  borderBottom: '2px solid #e2e8f0',
                  fontWeight: 600,
                  fontSize: 12,
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  background: 'linear-gradient(to bottom, #f8fafc, #f1f5f9)'
                }}>
                  <div>Candidate</div>
                  <div>Job Role</div>
                  <div>Score</div>
                  <div>Stage</div>
                  <div>Status</div>
                  <div>Time</div>
                  <div></div>
                </div>

                {/* Table Rows */}
                {(() => {
                  const filteredPeople = people.filter(p => {
                    if (selectedStage !== 'all' && p.stage !== selectedStage) return false;
                    if (attentionFilter && !p.needsAttention) return false;
                    if (hotApplicantFilter && !p.isHotApplicant) return false;
                    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
                        !p.email.toLowerCase().includes(searchQuery.toLowerCase())) return false;
                    if (jobFilter !== 'all' && p.role !== openings.find(j => String(j.id) === jobFilter || j._original?.id === jobFilter)?.name) return false;
                    if (scoreFilter === 'exceptional' && p.aiScore < 90) return false;
                    if (scoreFilter === 'strong' && (p.aiScore < 80 || p.aiScore >= 90)) return false;
                    if (scoreFilter === 'good' && (p.aiScore < 70 || p.aiScore >= 80)) return false;
                    if (scoreFilter === 'below' && p.aiScore >= 70) return false;
                    return true;
                  });

                  const totalPages = Math.ceil(filteredPeople.length / itemsPerPage);
                  const startIndex = (currentPage - 1) * itemsPerPage;
                  const endIndex = startIndex + itemsPerPage;
                  const paginatedPeople = filteredPeople.slice(startIndex, endIndex);

                  return (
                    <>
                      {paginatedPeople.map(person => {
                    const stage = stages.find(s => s.id === person.stage);
                    return (
                      <div
                        key={person.id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '2.5fr 1.5fr 1fr 1.2fr 1.2fr 1fr 100px',
                          gap: 16,
                          padding: '16px 20px',
                          borderBottom: '1px solid #f1f5f9',
                          alignItems: 'center',
                          background: person.needsAttention
                            ? 'linear-gradient(to right, #fffbeb, #fef3c7)'
                            : person.isHotApplicant
                            ? 'linear-gradient(to right, #fef2f2, #fee2e2)'
                            : 'white',
                          transition: 'all 0.15s',
                          cursor: 'pointer',
                          borderLeft: person.isHotApplicant
                            ? '3px solid #f59e0b'
                            : person.needsAttention
                            ? '3px solid #fbbf24'
                            : '3px solid transparent'
                        }}
                        onClick={() => { setSelectedCandidate(person); setCandidateDetailTab('overview'); setModal('candidateDetails'); }}
                        onMouseEnter={e => e.currentTarget.style.background = person.needsAttention
                          ? 'linear-gradient(to right, #fef3c7, #fde68a)'
                          : person.isHotApplicant
                          ? 'linear-gradient(to right, #fee2e2, #fecaca)'
                          : '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = person.needsAttention
                          ? 'linear-gradient(to right, #fffbeb, #fef3c7)'
                          : person.isHotApplicant
                          ? 'linear-gradient(to right, #fef2f2, #fee2e2)'
                          : 'white'}
                      >
                        {/* Candidate */}
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center', overflow: 'hidden' }}>
                          {person.isHotApplicant && (
                            <div style={{
                              fontSize: 18,
                              animation: 'pulse 2s infinite',
                              filter: 'drop-shadow(0 0 4px rgba(245, 158, 11, 0.6))',
                              flexShrink: 0
                            }}>🔥</div>
                          )}
                          {person.needsAttention && !person.isHotApplicant && (
                            <div style={{ fontSize: 16, flexShrink: 0 }}>⚠️</div>
                          )}
                          <div style={{
                            width: 40,
                            height: 40,
                            background: person.isHotApplicant
                              ? 'linear-gradient(135deg, #f59e0b, #ef4444)'
                              : 'linear-gradient(135deg, #44924c, #2d6a33)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 600,
                            fontSize: 14,
                            boxShadow: person.isHotApplicant ? '0 2px 6px rgba(245, 158, 11, 0.3)' : '0 1px 3px rgba(0,0,0,0.1)',
                            flexShrink: 0
                          }}>{init(person.name)}</div>
                          <div style={{ overflow: 'hidden', minWidth: 0 }}>
                            <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {person.name}
                            </div>
                            <div style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{person.email}</div>
                          </div>
                        </div>

                        {/* Job Role */}
                        <div style={{ overflow: 'hidden', minWidth: 0 }}>
                          <div style={{ fontWeight: 500, color: '#475569', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{person.role}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{person.appliedDate}</div>
                        </div>

                        {/* AI Score */}
                        <div>
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 10px',
                            background: person.aiScore >= 90 ? '#f0fdf4' : person.aiScore >= 80 ? '#eff6ff' : person.aiScore >= 70 ? '#fffbeb' : '#f8fafc',
                            borderRadius: 6,
                            border: `1.5px solid ${person.aiScore >= 90 ? '#bbf7d0' : person.aiScore >= 80 ? '#bfdbfe' : person.aiScore >= 70 ? '#fde68a' : '#e2e8f0'}`
                          }}>
                            <div style={{
                              fontSize: 16,
                              fontWeight: 700,
                              color: person.aiScore >= 90 ? '#10b981' : person.aiScore >= 80 ? '#0ea5e9' : person.aiScore >= 70 ? '#f59e0b' : '#94a3b8'
                            }}>
                              {person.aiScore}
                            </div>
                          </div>
                        </div>

                        {/* Stage */}
                        <div>
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '6px 12px',
                            borderRadius: 6,
                            background: `${stage.color}15`,
                            border: `1.5px solid ${stage.color}40`
                          }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: stage.color }}>{stage.name}</span>
                          </div>
                        </div>

                        {/* Status */}
                        <div style={{ overflow: 'hidden', minWidth: 0 }}>
                          <span style={{ fontSize: 12, color: '#475569', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {person.status}
                          </span>
                        </div>

                        {/* Time in Stage */}
                        <div>
                          <div style={{
                            display: 'inline-flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            padding: '6px 10px',
                            background: '#f8fafc',
                            borderRadius: 6,
                            border: '1px solid #e2e8f0'
                          }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', lineHeight: 1 }}>
                              {person.daysInStage}
                            </div>
                            <div style={{ fontSize: 10, color: '#94a3b8', lineHeight: 1.3, marginTop: 2 }}>
                              /{person.totalDays}d
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => { setSelectedCandidate(person); setCandidateDetailTab('overview'); setModal('candidateDetails'); }}
                            style={{
                              ...styles.btn1,
                              padding: '8px 16px',
                              fontSize: 12,
                              width: '100%',
                              fontWeight: 600
                            }}
                          >
                            View
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Pagination Controls */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    borderTop: '2px solid #e2e8f0',
                    background: 'linear-gradient(to bottom, #f8fafc, #f1f5f9)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>
                        Showing {startIndex + 1}-{Math.min(endIndex, filteredPeople.length)} of {filteredPeople.length}
                      </span>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        style={{
                          padding: '6px 10px',
                          borderRadius: 6,
                          border: '1.5px solid #e2e8f0',
                          fontSize: 12,
                          fontWeight: 500,
                          cursor: 'pointer',
                          background: 'white'
                        }}
                      >
                        <option value={10}>10 per page</option>
                        <option value={25}>25 per page</option>
                        <option value={50}>50 per page</option>
                        <option value={100}>100 per page</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        style={{
                          ...styles.btn2,
                          padding: '6px 10px',
                          fontSize: 12,
                          opacity: currentPage === 1 ? 0.5 : 1,
                          cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                        }}
                      >
                        ⏮️
                      </button>
                      <button
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        style={{
                          ...styles.btn2,
                          padding: '6px 10px',
                          fontSize: 12,
                          opacity: currentPage === 1 ? 0.5 : 1,
                          cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                        }}
                      >
                        ◀️
                      </button>
                      <div style={{
                        padding: '6px 14px',
                        background: 'linear-gradient(135deg, #44924c, #2d6a33)',
                        color: 'white',
                        borderRadius: 6,
                        fontWeight: 600,
                        fontSize: 12
                      }}>
                        {currentPage} / {totalPages || 1}
                      </div>
                      <button
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                        style={{
                          ...styles.btn2,
                          padding: '6px 10px',
                          fontSize: 12,
                          opacity: currentPage >= totalPages ? 0.5 : 1,
                          cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer'
                        }}
                      >
                        ▶️
                      </button>
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage >= totalPages}
                        style={{
                          ...styles.btn2,
                          padding: '6px 10px',
                          fontSize: 12,
                          opacity: currentPage >= totalPages ? 0.5 : 1,
                          cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer'
                        }}
                      >
                        ⏭️
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
              </div>
            )}

            {/* PIPELINE VIEW - REDESIGNED WITH TAB AND COMPACT KANBAN OPTIONS */}
            {applicationsView === 'pipeline' && (
              <div style={{
                overflow: 'hidden',
                position: 'relative',
                width: '100%'
              }}>
                {/* View Toggle & Controls */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 20,
                  flexWrap: 'wrap',
                  gap: 12
                }}>
                  {/* Layout Toggle */}
                  <div style={{
                    display: 'flex',
                    background: '#f1f5f9',
                    borderRadius: 10,
                    padding: 4
                  }}>
                    <button
                      onClick={() => setPipelineLayout('tabs')}
                      style={{
                        padding: '10px 20px',
                        background: pipelineLayout === 'tabs' ? 'white' : 'transparent',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: 14,
                        fontWeight: 600,
                        color: pipelineLayout === 'tabs' ? '#44924c' : '#64748b',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: pipelineLayout === 'tabs' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
                      }}
                    >
                      📋 Tab View
                    </button>
                    <button
                      onClick={() => setPipelineLayout('kanban')}
                      style={{
                        padding: '10px 20px',
                        background: pipelineLayout === 'kanban' ? 'white' : 'transparent',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: 14,
                        fontWeight: 600,
                        color: pipelineLayout === 'kanban' ? '#44924c' : '#64748b',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: pipelineLayout === 'kanban' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
                      }}
                    >
                      📊 Kanban View
                    </button>
                  </div>

                  {/* Drag Mode Toggle */}
                  <button
                    onClick={() => setKanbanEnabled(!kanbanEnabled)}
                    style={{
                      padding: '10px 20px',
                      background: kanbanEnabled ? 'linear-gradient(135deg, #10b981, #059669)' : '#f1f5f9',
                      border: kanbanEnabled ? 'none' : '2px solid #e2e8f0',
                      borderRadius: 10,
                      fontSize: 14,
                      fontWeight: 600,
                      color: kanbanEnabled ? 'white' : '#64748b',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}
                  >
                    {kanbanEnabled ? '🎯 Drag Mode ON' : '🔒 Drag Mode OFF'}
                  </button>
                </div>

                {/* Drag Mode Info Banner */}
                {kanbanEnabled && (
                  <div style={{
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    padding: '12px 20px',
                    borderRadius: 10,
                    marginBottom: 20,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12
                  }}>
                    <span style={{ fontSize: 20 }}>💡</span>
                    <div style={{ color: 'white', fontSize: 13, fontWeight: 500 }}>
                      {pipelineLayout === 'tabs'
                        ? 'Drag candidates onto stage tabs above to move them between stages'
                        : 'Drag and drop candidates between columns to update their status'}
                    </div>
                  </div>
                )}

                {/* Stage Tabs Bar */}
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                  marginBottom: 24,
                  padding: 8,
                  background: '#f8fafc',
                  borderRadius: 14,
                  border: '2px solid #e2e8f0',
                  overflow: 'visible',
                  position: 'relative',
                  zIndex: 10
                }}>
                  {stages.filter(s => s.id !== 'rejected').map(stage => {
                    const count = people.filter(p => {
                      if (p.stage !== stage.id) return false;
                      if (attentionFilter && !p.needsAttention) return false;
                      if (hotApplicantFilter && !p.isHotApplicant) return false;
                      if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
                      if (jobFilter !== 'all' && p.role !== openings.find(j => String(j.id) === jobFilter || j._original?.id === jobFilter)?.name) return false;
                      return true;
                    }).length;
                    const hasAttention = people.some(p => p.stage === stage.id && p.needsAttention);

                    return (
                      <button
                        key={stage.id}
                        onClick={() => setActiveStage(stage.id)}
                        onDragOver={(e) => {
                          if (!kanbanEnabled) return;
                          e.preventDefault();
                          e.currentTarget.style.transform = 'scale(1.05)';
                          e.currentTarget.style.boxShadow = `0 4px 16px ${stage.color}40`;
                        }}
                        onDragLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = activeStage === stage.id ? '0 2px 8px rgba(0,0,0,0.1)' : 'none';
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = activeStage === stage.id ? '0 2px 8px rgba(0,0,0,0.1)' : 'none';

                          const candidateId = e.dataTransfer.getData('candidateId');
                          const droppedCandidate = people.find(p => String(p.id) === candidateId);

                          if (droppedCandidate && droppedCandidate.stage !== stage.id) {
                            setPeople(people.map(p =>
                              String(p.id) === candidateId
                                ? {
                                    ...p,
                                    stage: stage.id,
                                    comments: [...(p.comments || []), {
                                      id: Date.now(),
                                      text: `Moved to ${stage.name} stage`,
                                      author: currentUser?.name || 'Admin',
                                      timestamp: new Date().toLocaleString(),
                                      stage: stage.id
                                    }]
                                  }
                                : p
                            ));
                            pop(`✅ ${droppedCandidate.name} moved to ${stage.name}`);
                            setActiveStage(stage.id);
                          }
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '10px 16px',
                          background: activeStage === stage.id ? 'white' : 'transparent',
                          border: activeStage === stage.id ? `2px solid ${stage.color}` : '2px solid transparent',
                          borderRadius: 10,
                          fontSize: 13,
                          fontWeight: 600,
                          color: activeStage === stage.id ? stage.color : '#64748b',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          position: 'relative',
                          boxShadow: activeStage === stage.id ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
                        }}
                      >
                        <span style={{ fontSize: 16 }}>{stage.icon}</span>
                        <span style={{
                          maxWidth: 100,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {stage.name}
                        </span>
                        <span style={{
                          background: activeStage === stage.id ? stage.color : '#e2e8f0',
                          color: activeStage === stage.id ? 'white' : '#64748b',
                          padding: '2px 8px',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 700,
                          minWidth: 24,
                          textAlign: 'center'
                        }}>
                          {count}
                        </span>
                        {hasAttention && (
                          <div style={{
                            position: 'absolute',
                            top: -4,
                            right: -4,
                            width: 10,
                            height: 10,
                            background: '#ef4444',
                            borderRadius: '50%',
                            border: '2px solid white'
                          }} />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* TAB VIEW - Responsive Grid */}
                {pipelineLayout === 'tabs' && (() => {
                  const currentStage = stages.find(s => s.id === activeStage);
                  const filteredCandidates = people.filter(p => {
                    if (p.stage !== activeStage) return false;
                    if (attentionFilter && !p.needsAttention) return false;
                    if (hotApplicantFilter && !p.isHotApplicant) return false;
                    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
                    if (jobFilter !== 'all' && p.role !== openings.find(j => String(j.id) === jobFilter || j._original?.id === jobFilter)?.name) return false;
                    return true;
                  });

                  return (
                    <div>
                      {/* Stage Header */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16,
                        marginBottom: 20,
                        padding: '16px 24px',
                        background: `linear-gradient(135deg, ${currentStage?.color}15, ${currentStage?.color}05)`,
                        borderRadius: 14,
                        border: `2px solid ${currentStage?.color}30`
                      }}>
                        <span style={{ fontSize: 32 }}>{currentStage?.icon}</span>
                        <div style={{ flex: 1 }}>
                          <h3 style={{
                            fontSize: 22,
                            fontWeight: 700,
                            color: currentStage?.color,
                            margin: 0
                          }}>
                            {currentStage?.name}
                          </h3>
                          <p style={{
                            fontSize: 14,
                            color: '#64748b',
                            margin: '4px 0 0'
                          }}>
                            {filteredCandidates.length} candidate{filteredCandidates.length !== 1 ? 's' : ''} in this stage
                          </p>
                        </div>
                      </div>

                      {/* Candidates Grid */}
                      {filteredCandidates.length === 0 ? (
                        <div style={{
                          textAlign: 'center',
                          padding: '80px 40px',
                          color: '#94a3b8',
                          background: '#f8fafc',
                          borderRadius: 16,
                          border: '2px dashed #e2e8f0'
                        }}>
                          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>
                            {currentStage?.icon}
                          </div>
                          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
                            No candidates in {currentStage?.name}
                          </div>
                          <div style={{ fontSize: 14 }}>
                            Candidates will appear here when moved to this stage
                          </div>
                        </div>
                      ) : (
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                          gap: 20
                        }}>
                          {filteredCandidates.map(person => (
                            <div
                              key={person.id}
                              draggable={kanbanEnabled}
                              onDragStart={(e) => {
                                if (!kanbanEnabled) {
                                  e.preventDefault();
                                  return;
                                }
                                e.dataTransfer.setData('candidateId', person.id.toString());
                                e.dataTransfer.effectAllowed = 'move';
                                setDraggedCandidate(person);
                                e.currentTarget.style.opacity = '0.5';
                              }}
                              onDragEnd={(e) => {
                                setDraggedCandidate(null);
                                e.currentTarget.style.opacity = '1';
                              }}
                              style={{
                                ...styles.box,
                                padding: 20,
                                background: person.needsAttention ? '#fffbeb' : person.isHotApplicant ? '#fef3c7' : 'white',
                                border: person.needsAttention ? '2px solid #f59e0b' : person.isHotApplicant ? '2px solid #fbbf24' : '2px solid #e2e8f0',
                                cursor: kanbanEnabled ? 'grab' : 'pointer',
                                transition: 'all 0.2s',
                                position: 'relative'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-4px)';
                                e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.12)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                              }}
                            >
                              {/* Badges */}
                              <div style={{
                                position: 'absolute',
                                top: 12,
                                right: 12,
                                display: 'flex',
                                gap: 6
                              }}>
                                {person.isHotApplicant && (
                                  <span style={{ fontSize: 18 }} title="Hot Applicant">🔥</span>
                                )}
                                {person.needsAttention && (
                                  <div style={{
                                    background: '#dc2626',
                                    color: 'white',
                                    width: 22,
                                    height: 22,
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 12,
                                    fontWeight: 700
                                  }} title={person.attentionReason}>!</div>
                                )}
                              </div>

                              {/* Candidate Header */}
                              <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
                                <div style={{
                                  width: 56,
                                  height: 56,
                                  background: 'linear-gradient(135deg, #44924c, #2d6a33)',
                                  borderRadius: 14,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'white',
                                  fontWeight: 700,
                                  fontSize: 20,
                                  flexShrink: 0,
                                  boxShadow: '0 4px 12px rgba(68, 146, 76, 0.3)'
                                }}>{init(person.name)}</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{
                                    fontWeight: 700,
                                    color: '#1e293b',
                                    fontSize: 16,
                                    marginBottom: 4,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {person.name}
                                  </div>
                                  <div style={{
                                    fontSize: 13,
                                    color: '#64748b',
                                    fontWeight: 500,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {person.role}
                                  </div>
                                </div>
                              </div>

                              {/* AI Score & Stats Row */}
                              <div style={{
                                display: 'flex',
                                gap: 10,
                                marginBottom: 14
                              }}>
                                <div style={{
                                  flex: 1,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  padding: '8px 12px',
                                  background: person.aiScore >= 90 ? '#d1fae5' : person.aiScore >= 80 ? '#dbeafe' : '#fef3c7',
                                  borderRadius: 8
                                }}>
                                  <span style={{ fontSize: 12, color: '#64748b' }}>AI</span>
                                  <span style={{
                                    fontSize: 18,
                                    fontWeight: 800,
                                    color: person.aiScore >= 90 ? '#059669' : person.aiScore >= 80 ? '#0284c7' : '#d97706'
                                  }}>
                                    {person.aiScore}%
                                  </span>
                                </div>
                                <div style={{
                                  padding: '8px 12px',
                                  background: '#f1f5f9',
                                  borderRadius: 8,
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: '#64748b'
                                }}>
                                  ⏱️ {person.daysInStage}d
                                </div>
                                <div style={{
                                  padding: '8px 12px',
                                  background: '#f1f5f9',
                                  borderRadius: 8,
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: '#64748b'
                                }}>
                                  📅 {person.totalDays}d
                                </div>
                              </div>

                              {/* Tags */}
                              {person.tags && person.tags.length > 0 && (
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                                  {person.tags.slice(0, 3).map(tag => (
                                    <span
                                      key={tag}
                                      style={{
                                        padding: '4px 10px',
                                        background: '#eff6ff',
                                        color: '#2563eb',
                                        borderRadius: 6,
                                        fontSize: 11,
                                        fontWeight: 600
                                      }}
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                  {person.tags.length > 3 && (
                                    <span style={{
                                      padding: '4px 10px',
                                      background: '#f1f5f9',
                                      color: '#64748b',
                                      borderRadius: 6,
                                      fontSize: 11,
                                      fontWeight: 600
                                    }}>
                                      +{person.tags.length - 3}
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Actions */}
                              <div style={{ display: 'flex', gap: 10 }}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedCandidate(person);
                                    setModal('candidateDetails');
                                  }}
                                  style={{
                                    flex: 1,
                                    padding: '12px',
                                    background: 'linear-gradient(135deg, #44924c, #2d6a33)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 10,
                                    fontSize: 14,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  👁️ View Profile
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCandidate(person);
                                    setSelectedCandidate(person);
                                    setModal('assignTask');
                                  }}
                                  style={{
                                    padding: '12px 16px',
                                    background: '#f1f5f9',
                                    color: '#475569',
                                    border: '2px solid #e2e8f0',
                                    borderRadius: 10,
                                    fontSize: 14,
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                  }}
                                  title="Move to next stage"
                                >
                                  ➡️
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* COMPACT KANBAN VIEW */}
                {pipelineLayout === 'kanban' && (
                  <div style={{
                    display: 'flex',
                    gap: 12,
                    overflowX: 'auto',
                    overflowY: 'hidden',
                    paddingBottom: 20,
                    paddingTop: 4,
                    marginLeft: 0,
                    marginRight: 0,
                    position: 'relative',
                    contain: 'paint'
                  }}>
                    {stages.filter(s => s.id !== 'rejected').map(stage => {
                      const list = people.filter(p => {
                        if (p.stage !== stage.id) return false;
                        if (attentionFilter && !p.needsAttention) return false;
                        if (hotApplicantFilter && !p.isHotApplicant) return false;
                        if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
                        if (jobFilter !== 'all' && p.role !== openings.find(j => String(j.id) === jobFilter || j._original?.id === jobFilter)?.name) return false;
                        return true;
                      });

                      return (
                        <div
                          key={stage.id}
                          style={{
                            minWidth: 200,
                            maxWidth: 200,
                            flexShrink: 0,
                            display: 'flex',
                            flexDirection: 'column'
                          }}
                        >
                          {/* Compact Column Header */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            marginBottom: 12,
                            padding: '10px 12px',
                            background: `${stage.color}15`,
                            borderRadius: 10,
                            border: `2px solid ${stage.color}30`
                          }}>
                            <span style={{ fontSize: 16 }}>{stage.icon}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontWeight: 700,
                                color: stage.color,
                                fontSize: 12,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {stage.name}
                              </div>
                            </div>
                            <div style={{
                              background: stage.color,
                              color: 'white',
                              padding: '3px 8px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 700
                            }}>
                              {list.length}
                            </div>
                          </div>

                          {/* Compact Drop Zone */}
                          <div
                            onDragOver={(e) => {
                              if (!kanbanEnabled) return;
                              e.preventDefault();
                              e.currentTarget.style.background = `${stage.color}10`;
                              e.currentTarget.style.borderColor = stage.color;
                            }}
                            onDragLeave={(e) => {
                              e.currentTarget.style.background = '#f8fafc';
                              e.currentTarget.style.borderColor = '#e2e8f0';
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.currentTarget.style.background = '#f8fafc';
                              e.currentTarget.style.borderColor = '#e2e8f0';

                              const candidateId = e.dataTransfer.getData('candidateId');
                              const droppedCandidate = people.find(p => String(p.id) === candidateId);

                              if (droppedCandidate && droppedCandidate.stage !== stage.id) {
                                setPeople(people.map(p =>
                                  String(p.id) === candidateId
                                    ? {
                                        ...p,
                                        stage: stage.id,
                                        comments: [...(p.comments || []), {
                                          id: Date.now(),
                                          text: `Moved to ${stage.name} stage`,
                                          author: currentUser?.name || 'Admin',
                                          timestamp: new Date().toLocaleString(),
                                          stage: stage.id
                                        }]
                                      }
                                    : p
                                ));
                                pop(`✅ ${droppedCandidate.name} moved to ${stage.name}`);
                              }
                            }}
                            style={{
                              background: '#f8fafc',
                              borderRadius: 10,
                              padding: 8,
                              flex: 1,
                              border: '2px dashed #e2e8f0',
                              transition: 'all 0.2s',
                              overflowY: 'auto',
                              maxHeight: 'calc(100vh - 380px)'
                            }}
                          >
                            {list.length === 0 ? (
                              <div style={{
                                textAlign: 'center',
                                padding: '30px 10px',
                                color: '#94a3b8',
                                fontSize: 12
                              }}>
                                <div style={{ fontSize: 20, marginBottom: 8, opacity: 0.5 }}>
                                  {stage.icon}
                                </div>
                                <div style={{ fontWeight: 500 }}>Empty</div>
                              </div>
                            ) : (
                              list.map(person => (
                                <div
                                  key={person.id}
                                  draggable={kanbanEnabled}
                                  onDragStart={(e) => {
                                    if (!kanbanEnabled) {
                                      e.preventDefault();
                                      return;
                                    }
                                    e.dataTransfer.setData('candidateId', person.id.toString());
                                    e.dataTransfer.effectAllowed = 'move';
                                    setDraggedCandidate(person);
                                    e.currentTarget.style.opacity = '0.4';
                                  }}
                                  onDragEnd={(e) => {
                                    setDraggedCandidate(null);
                                    e.currentTarget.style.opacity = '1';
                                  }}
                                  onClick={() => {
                                    setSelectedCandidate(person);
                                    setModal('candidateDetails');
                                  }}
                                  style={{
                                    marginBottom: 8,
                                    padding: 10,
                                    background: person.needsAttention ? '#fffbeb' : 'white',
                                    border: person.needsAttention ? '2px solid #f59e0b' : '1px solid #e2e8f0',
                                    borderRadius: 8,
                                    cursor: kanbanEnabled ? 'grab' : 'pointer',
                                    transition: 'all 0.2s',
                                    position: 'relative'
                                  }}
                                >
                                  {/* Mini badges */}
                                  {(person.isHotApplicant || person.needsAttention) && (
                                    <div style={{
                                      position: 'absolute',
                                      top: -6,
                                      right: -6,
                                      display: 'flex',
                                      gap: 2
                                    }}>
                                      {person.isHotApplicant && <span style={{ fontSize: 12 }}>🔥</span>}
                                      {person.needsAttention && (
                                        <div style={{
                                          background: '#dc2626',
                                          color: 'white',
                                          width: 14,
                                          height: 14,
                                          borderRadius: '50%',
                                          fontSize: 9,
                                          fontWeight: 700,
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center'
                                        }}>!</div>
                                      )}
                                    </div>
                                  )}

                                  {/* Compact card content */}
                                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                                    <div style={{
                                      width: 28,
                                      height: 28,
                                      background: 'linear-gradient(135deg, #44924c, #2d6a33)',
                                      borderRadius: 6,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: 'white',
                                      fontWeight: 700,
                                      fontSize: 10,
                                      flexShrink: 0
                                    }}>{init(person.name)}</div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{
                                        fontWeight: 600,
                                        color: '#1e293b',
                                        fontSize: 12,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                      }}>
                                        {person.name}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Score and time */}
                                  <div style={{ display: 'flex', gap: 4, fontSize: 10 }}>
                                    <span style={{
                                      padding: '2px 6px',
                                      background: person.aiScore >= 90 ? '#d1fae5' : person.aiScore >= 80 ? '#dbeafe' : '#fef3c7',
                                      borderRadius: 4,
                                      fontWeight: 700,
                                      color: person.aiScore >= 90 ? '#059669' : person.aiScore >= 80 ? '#0284c7' : '#d97706'
                                    }}>
                                      {person.aiScore}%
                                    </span>
                                    <span style={{
                                      padding: '2px 6px',
                                      background: '#f1f5f9',
                                      borderRadius: 4,
                                      color: '#64748b',
                                      fontWeight: 500
                                    }}>
                                      {person.daysInStage}d
                                    </span>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ==================
            CANDIDATE PROFILE
            ================== */}
        {view === 'profile' && candidate && (
          <>
            <button 
              onClick={() => navigate('/applications')} 
              style={{ ...styles.btn2, marginBottom: 24 }}
            >
              ← Back to Pipeline
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
              {/* Left Column */}
              <div>
                {/* Header Card */}
                <div style={styles.box}>
                  <div style={{ display: 'flex', gap: 20, marginBottom: 24 }}>
                    <div style={{
                      width: 80,
                      height: 80,
                      background: 'linear-gradient(135deg, #44924c, #2d6a33)',
                      borderRadius: 16,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: 28,
                      fontWeight: 700
                    }}>{init(candidate.name)}</div>
                    <div style={{ flex: 1 }}>
                      <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>{candidate.name}</h1>
                      <p style={{ color: '#64748b', margin: '0 0 12px', fontSize: 16 }}>{candidate.role}</p>
                      <div style={{ display: 'flex', gap: 16 }}>
                        <button onClick={() => pop('Email copied!')} style={{ background: 'none', border: 'none', color: '#0ea5e9', cursor: 'pointer', fontSize: 14 }}>📧 {candidate.email}</button>
                        <button onClick={() => pop('Opening LinkedIn...')} style={{ background: 'none', border: 'none', color: '#0ea5e9', cursor: 'pointer', fontSize: 14 }}>🔗 LinkedIn</button>
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 48, fontWeight: 700, color: color(candidate.pct) }}>{candidate.pct}%</div>
                      <div style={{ color: '#64748b', fontSize: 14 }}>Match Score</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      onClick={() => {
                        setInterviewCandidate(candidate);
                        setShowInterviewModal(true);
                        setInterviewForm({
                          title: `Interview - ${candidate.role}`,
                          date: '',
                          time: '',
                          interviewer: '',
                          duration: '60',
                          locationType: 'online',
                          platform: 'Google Meet',
                          meetingLink: '',
                          address: '',
                          notes: ''
                        });
                      }}
                      style={{ ...styles.btn1, flex: 1, justifyContent: 'center' }}
                    >
                      📅 Schedule Interview
                    </button>
                    <button onClick={() => pop('Assignment sent!')} style={{ ...styles.btn2, flex: 1, justifyContent: 'center' }}>📝 Send Assignment</button>
                  </div>
                </div>

                {/* AI Summary */}
                <div style={{ ...styles.box, background: 'linear-gradient(135deg, #fff, #f8fafc)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <span style={{ fontSize: 22 }}>⚡</span>
                    <span style={{ fontWeight: 600, color: '#1e293b', fontSize: 16 }}>AI Summary</span>
                  </div>
                  <p style={{ color: '#475569', lineHeight: 1.7, marginBottom: 16 }}>
                    {candidate.name} demonstrates strong qualifications with excellent technical expertise relevant to this role. 
                    Their background shows consistent growth and alignment with the position requirements.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div style={{ padding: 16, background: '#ecfdf5', borderRadius: 12 }}>
                      <div style={{ fontWeight: 600, color: '#059669', marginBottom: 8 }}>✓ Strengths</div>
                      <ul style={{ margin: 0, paddingLeft: 20, color: '#475569', fontSize: 14 }}>
                        <li>Strong technical skills</li>
                        <li>Great communication</li>
                        <li>Relevant experience</li>
                      </ul>
                    </div>
                    <div style={{ padding: 16, background: '#fffbeb', borderRadius: 12 }}>
                      <div style={{ fontWeight: 600, color: '#d97706', marginBottom: 8 }}>⚠ Considerations</div>
                      <ul style={{ margin: 0, paddingLeft: 20, color: '#475569', fontSize: 14 }}>
                        <li>Salary expectations</li>
                        <li>Notice period</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Comments */}
                <div style={styles.box}>
                  <h3 style={{ fontWeight: 600, color: '#1e293b', margin: '0 0 16px', fontSize: 16 }}>Comments & Notes</h3>
                  {notes.map(n => (
                    <div key={n.id} style={{ padding: 16, background: '#f8fafc', borderRadius: 12, marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontWeight: 500, color: '#1e293b' }}>{n.by}</span>
                        <span style={{ color: '#94a3b8', fontSize: 13 }}>{n.at}</span>
                      </div>
                      <p style={{ color: '#475569', margin: 0, fontSize: 14 }}>{n.text}</p>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                    <input 
                      value={msg} 
                      onChange={e => setMsg(e.target.value)} 
                      placeholder="Add a comment..." 
                      style={{ ...styles.input, flex: 1 }}
                      onKeyDown={e => e.key === 'Enter' && send()} 
                    />
                    <button onClick={send} style={{ ...styles.btn1, padding: '12px 20px' }}>Send</button>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div>
                {/* Quick Actions */}
                <div style={styles.box}>
                  <h3 style={{ fontWeight: 600, color: '#1e293b', margin: '0 0 16px', fontSize: 16 }}>Quick Actions</h3>
                  <button
                    onClick={() => {
                      setModal('assignTask');
                    }}
                    style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: '#ecfdf5', color: '#059669', fontWeight: 600, cursor: 'pointer', marginBottom: 8, fontSize: 14 }}
                  >
                    Move to Next Stage & Assign →
                  </button>
                  <button 
                    onClick={() => drop(candidate.id)} 
                    style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: '#fef2f2', color: '#ef4444', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
                  >
                    Reject Candidate
                  </button>
                </div>

                {/* Timeline */}
                <div style={styles.box}>
                  <h3 style={{ fontWeight: 600, color: '#1e293b', margin: '0 0 16px', fontSize: 16 }}>Timeline</h3>
                  {['Applied', 'AI Screening', 'HR Review', 'Assignment', 'Interview', 'Offer Sent', 'Offer Accepted', 'Hired'].map((step, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ 
                          width: 12, 
                          height: 12, 
                          borderRadius: '50%', 
                          background: i < 3 ? '#10b981' : i === 3 ? '#0ea5e9' : '#e2e8f0' 
                        }} />
                        {i < 5 && <div style={{ width: 2, height: 28, background: i < 3 ? '#a7f3d0' : '#e2e8f0' }} />}
                      </div>
                      <div>
                        <div style={{ fontWeight: 500, color: i <= 3 ? '#1e293b' : '#94a3b8', fontSize: 14 }}>{step}</div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>{i < 3 ? 'Completed' : i === 3 ? 'Current' : 'Pending'}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Resume */}
                <div style={styles.box}>
                  <h3 style={{ fontWeight: 600, color: '#1e293b', margin: '0 0 16px', fontSize: 16 }}>Documents</h3>
                  <button 
                    onClick={() => pop('Opening resume...')}
                    style={{ 
                      width: '100%', 
                      padding: 16, 
                      background: '#f8fafc', 
                      border: '1px dashed #e2e8f0', 
                      borderRadius: 12, 
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ fontSize: 24, marginBottom: 8 }}>📄</div>
                    <div style={{ fontWeight: 500, color: '#475569' }}>View Resume</div>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ==================
            TASKS SCREEN
            ================== */}
        {view === 'tasks' && (
          <>
            {/* Hero Header - Enterprise Design */}
            <div style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
              borderRadius: 20,
              padding: 32,
              marginBottom: 28,
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Background decorations */}
              <div style={{
                position: 'absolute',
                top: -50,
                right: -50,
                width: 200,
                height: 200,
                background: 'radial-gradient(circle, rgba(245, 158, 11, 0.3) 0%, transparent 70%)',
                borderRadius: '50%'
              }} />
              <div style={{
                position: 'absolute',
                bottom: -30,
                left: '40%',
                width: 150,
                height: 150,
                background: 'radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, transparent 70%)',
                borderRadius: '50%'
              }} />

              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                  <div>
                    <h2 style={{ color: 'white', fontSize: 28, fontWeight: 700, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{
                        width: 48,
                        height: 48,
                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                        borderRadius: 14,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 22
                      }}>&#9989;</span>
                      Tasks & Actions
                    </h2>
                    <p style={{ color: '#94a3b8', margin: 0, fontSize: 15 }}>
                      Your pending recruitment actions and AI-powered recommendations
                    </p>
                  </div>
                </div>

                {/* Stats Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                  {[
                    { label: 'Assigned to You', value: taskAssignments.filter(t => t.assignedTo === currentUser?.name && t.status === 'pending').length, icon: '&#128203;', color: '#f59e0b' },
                    { label: 'General Tasks', value: todos.filter(t => !done.includes(t.id)).length, icon: '&#128221;', color: '#0ea5e9' },
                    { label: 'Completed', value: taskAssignments.filter(t => t.status === 'completed').length, icon: '&#9989;', color: '#10b981' },
                    { label: 'High Priority', value: todos.filter(t => t.lvl === 'high' && !done.includes(t.id)).length, icon: '&#128308;', color: '#ef4444' }
                  ].map((stat, i) => (
                    <div key={i} style={{
                      background: 'rgba(255,255,255,0.08)',
                      backdropFilter: 'blur(10px)',
                      borderRadius: 14,
                      padding: 16,
                      border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <span style={{
                          width: 32,
                          height: 32,
                          background: `${stat.color}25`,
                          borderRadius: 8,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 16
                        }} dangerouslySetInnerHTML={{ __html: stat.icon }} />
                        <span style={{ color: '#94a3b8', fontSize: 12, fontWeight: 500 }}>{stat.label}</span>
                      </div>
                      <div style={{ color: 'white', fontSize: 28, fontWeight: 700 }}>{stat.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
              {/* Task List */}
              <div>
                {/* Assigned Tasks Section */}
                {taskAssignments.filter(t => t.assignedTo === currentUser?.name && t.status === 'pending').length > 0 && (
                  <>
                    <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', marginBottom: 16 }}>
                      📋 Assigned to You ({taskAssignments.filter(t => t.assignedTo === currentUser?.name && t.status === 'pending').length})
                    </h3>
                    {taskAssignments.filter(t => t.assignedTo === currentUser?.name && t.status === 'pending').map(task => (
                      <div
                        key={task.id}
                        style={{
                          ...styles.box,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 16,
                          marginBottom: 16,
                          border: '2px solid #44924c30',
                          background: 'linear-gradient(135deg, #44924c08 0%, #44924c15 100%)',
                          cursor: 'pointer',
                          transition: 'transform 0.15s, box-shadow 0.15s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(68, 146, 76, 0.15)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                        onClick={(e) => {
                          // Don't navigate if clicking on buttons
                          if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
                          const c = people.find(p =>
                            p.id === task.applicationId ||
                            p._original?.id === task.applicationId ||
                            p.id === task.candidateId
                          );
                          if (c) {
                            setCandidate(c);
                            navigate(`/applications/candidate/${c.id}`);
                          }
                        }}
                      >
                        <button
                          onClick={() => {
                            // Open the task completion modal
                            setCompletingTask(task);
                            setTaskCompleteAction('complete_only');
                            setNextStageSelection('');
                            setAssignedTo(null);
                            setCommentText('');
                            setShowTaskCompleteModal(true);
                          }}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            border: '2px solid #44924c',
                            background: 'white',
                            color: '#44924c',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 14,
                            flexShrink: 0
                          }}
                          title="Complete Task"
                        >
                          ✓
                        </button>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 500,
                              background: '#44924c20',
                              color: '#44924c'
                            }}>{task.stage}</span>
                            <span style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500, background: '#f3e8ff', color: '#7c3aed' }}>
                              {task.candidateRole}
                            </span>
                          </div>
                          <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>{task.candidateName}</div>
                          {task.notes && (
                            <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                              📝 {task.notes}
                            </div>
                          )}
                          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                            Assigned by {task.assignedBy} on {new Date(task.assignedDate).toLocaleDateString()}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {(task.stage === 'Assignment' || task.stage === 'Interviews') && (
                            <button
                              onClick={() => {
                                const c = people.find(p => p.id === task.candidateId);
                                if (c) {
                                  setInterviewCandidate(c);
                                  setShowInterviewModal(true);
                                  setInterviewForm({
                                    title: `Interview - ${c.role}`,
                                    date: '',
                                    time: '',
                                    interviewer: '',
                                    duration: '60',
                                    locationType: 'online',
                                    platform: 'Google Meet',
                                    meetingLink: '',
                                    address: '',
                                    notes: ''
                                  });
                                }
                              }}
                              style={{ ...styles.btn2, padding: '8px 16px' }}
                            >
                              📅 Schedule Interview
                            </button>
                          )}
                          <button
                            onClick={() => {
                              // Try to find by applicationId first (most common), then candidateId
                              const c = people.find(p =>
                                p.id === task.applicationId ||
                                p._original?.id === task.applicationId ||
                                p.id === task.candidateId ||
                                p.candidateId === task.candidateId
                              );
                              if (c) {
                                setCandidate(c);
                                navigate(`/applications/candidate/${c.id}`);
                              } else {
                                pop('Candidate not found. They may have been removed.');
                              }
                            }}
                            style={{ ...styles.btn1, padding: '8px 16px' }}
                          >
                            View Candidate →
                          </button>
                        </div>
                      </div>
                    ))}
                    <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', marginTop: 32, marginBottom: 16 }}>
                      ✅ General Tasks
                    </h3>
                  </>
                )}

                {todos.map(task => (
                  <div 
                    key={task.id} 
                    style={{ 
                      ...styles.box, 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 16, 
                      opacity: done.includes(task.id) ? 0.5 : 1 
                    }}
                  >
                    <button 
                      onClick={() => setDone(d => d.includes(task.id) ? d.filter(x => x !== task.id) : [...d, task.id])} 
                      style={{ 
                        width: 28, 
                        height: 28, 
                        borderRadius: 8, 
                        border: done.includes(task.id) ? 'none' : '2px solid #cbd5e1', 
                        background: done.includes(task.id) ? '#10b981' : 'white', 
                        color: 'white', 
                        cursor: 'pointer', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontSize: 14,
                        flexShrink: 0
                      }}
                    >
                      {done.includes(task.id) ? '✓' : ''}
                    </button>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                        <span style={{ 
                          padding: '4px 10px', 
                          borderRadius: 6, 
                          fontSize: 12, 
                          fontWeight: 500, 
                          background: task.lvl === 'high' ? '#fef2f2' : task.lvl === 'medium' ? '#fffbeb' : '#f1f5f9', 
                          color: task.lvl === 'high' ? '#ef4444' : task.lvl === 'medium' ? '#d97706' : '#64748b' 
                        }}>{task.lvl}</span>
                        <span style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500, background: '#f3e8ff', color: '#7c3aed' }}>{task.kind}</span>
                      </div>
                      <div style={{ fontWeight: 500, color: '#1e293b', textDecoration: done.includes(task.id) ? 'line-through' : 'none' }}>{task.who}</div>
                    </div>
                    <div style={{ color: task.when === 'Today' ? '#ef4444' : '#64748b', fontWeight: task.when === 'Today' ? 600 : 400, fontSize: 14 }}>Due: {task.when}</div>
                    <button
                      onClick={() => {
                        const c = people.find(p => p.name === task.who);
                        if (c) { setCandidate(c); navigate(`/applications/candidate/${c.id}`); }
                      }}
                      style={{ ...styles.btn2, padding: '8px 16px' }}
                    >→</button>
                  </div>
                ))}

                {/* Completed Tasks History */}
                <div style={{ marginTop: 32 }}>
                  <div
                    onClick={() => setShowCompletedTasks(!showCompletedTasks)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      padding: '12px 16px',
                      background: '#f8fafc',
                      borderRadius: 12,
                      marginBottom: showCompletedTasks ? 16 : 0
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 18 }}>✅</span>
                      <span style={{ fontWeight: 600, color: '#1e293b' }}>
                        Completed Tasks ({taskAssignments.filter(t => t.status === 'completed').length})
                      </span>
                    </div>
                    <span style={{ color: '#64748b', fontSize: 18 }}>
                      {showCompletedTasks ? '▼' : '▶'}
                    </span>
                  </div>

                  {showCompletedTasks && taskAssignments.filter(t => t.status === 'completed').length > 0 && (
                    <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                      {taskAssignments
                        .filter(t => t.status === 'completed')
                        .sort((a, b) => new Date(b.completedDate || 0) - new Date(a.completedDate || 0))
                        .map(task => (
                          <div
                            key={task.id}
                            style={{
                              ...styles.box,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 16,
                              marginBottom: 12,
                              opacity: 0.7,
                              background: '#f8fafc'
                            }}
                          >
                            <div style={{
                              width: 28,
                              height: 28,
                              borderRadius: 8,
                              background: '#10b981',
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 14,
                              flexShrink: 0
                            }}>
                              ✓
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                                <span style={{
                                  padding: '4px 10px',
                                  borderRadius: 6,
                                  fontSize: 12,
                                  fontWeight: 500,
                                  background: '#e2e8f0',
                                  color: '#64748b'
                                }}>{task.stage}</span>
                                <span style={{
                                  padding: '4px 10px',
                                  borderRadius: 6,
                                  fontSize: 12,
                                  fontWeight: 500,
                                  background: '#f3e8ff',
                                  color: '#7c3aed'
                                }}>
                                  {task.candidateRole}
                                </span>
                              </div>
                              <div style={{
                                fontWeight: 600,
                                color: '#64748b',
                                marginBottom: 4,
                                textDecoration: 'line-through'
                              }}>
                                {task.candidateName}
                              </div>
                              <div style={{ fontSize: 12, color: '#94a3b8' }}>
                                Completed by {task.completedBy || 'Admin'} on {task.completedDate ? new Date(task.completedDate).toLocaleDateString() : 'N/A'}
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                const c = people.find(p => p.id === task.candidateId);
                                if (c) { setCandidate(c); navigate(`/applications/candidate/${c.id}`); }
                              }}
                              style={{ ...styles.btn2, padding: '8px 16px' }}
                            >
                              View →
                            </button>
                          </div>
                        ))}
                    </div>
                  )}

                  {showCompletedTasks && taskAssignments.filter(t => t.status === 'completed').length === 0 && (
                    <div style={{
                      padding: 24,
                      textAlign: 'center',
                      color: '#94a3b8',
                      fontSize: 14
                    }}>
                      No completed tasks yet
                    </div>
                  )}
                </div>
              </div>

              {/* AI Insights Panel */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* AI Recommendations Header */}
                <div style={{
                  ...styles.box,
                  background: 'linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 100%)',
                  color: 'white',
                  padding: 20
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 24 }}>🤖</span>
                      <span style={{ fontWeight: 700, fontSize: 18 }}>AI Assistant</span>
                    </div>
                    <button
                      onClick={fetchAIRecommendations}
                      disabled={loadingRecommendations}
                      style={{
                        background: 'rgba(255,255,255,0.2)',
                        border: 'none',
                        borderRadius: 8,
                        padding: '6px 12px',
                        color: 'white',
                        cursor: loadingRecommendations ? 'not-allowed' : 'pointer',
                        fontSize: 13,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      {loadingRecommendations ? '...' : '↻'} Refresh
                    </button>
                  </div>
                  <p style={{ margin: 0, opacity: 0.9, fontSize: 14 }}>
                    Smart recommendations based on your pipeline
                  </p>
                </div>

                {/* Quick Stats */}
                {aiRecommendations?.stats && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 12
                  }}>
                    {aiRecommendations.stats.pendingReviews > 0 && (
                      <div style={{
                        ...styles.box,
                        padding: 16,
                        textAlign: 'center',
                        background: '#fef3c7',
                        border: '1px solid #fcd34d'
                      }}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: '#d97706' }}>
                          {aiRecommendations.stats.pendingReviews}
                        </div>
                        <div style={{ fontSize: 12, color: '#92400e', marginTop: 4 }}>
                          Pending Reviews
                        </div>
                      </div>
                    )}
                    {aiRecommendations.stats.highScorers > 0 && (
                      <div style={{
                        ...styles.box,
                        padding: 16,
                        textAlign: 'center',
                        background: '#dcfce7',
                        border: '1px solid #86efac'
                      }}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: '#16a34a' }}>
                          {aiRecommendations.stats.highScorers}
                        </div>
                        <div style={{ fontSize: 12, color: '#166534', marginTop: 4 }}>
                          Top Candidates
                        </div>
                      </div>
                    )}
                    {aiRecommendations.stats.upcomingInterviews > 0 && (
                      <div style={{
                        ...styles.box,
                        padding: 16,
                        textAlign: 'center',
                        background: '#dbeafe',
                        border: '1px solid #93c5fd'
                      }}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: '#2563eb' }}>
                          {aiRecommendations.stats.upcomingInterviews}
                        </div>
                        <div style={{ fontSize: 12, color: '#1e40af', marginTop: 4 }}>
                          Interviews Soon
                        </div>
                      </div>
                    )}
                    {aiRecommendations.stats.overdueCount > 0 && (
                      <div style={{
                        ...styles.box,
                        padding: 16,
                        textAlign: 'center',
                        background: '#fee2e2',
                        border: '1px solid #fca5a5'
                      }}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: '#dc2626' }}>
                          {aiRecommendations.stats.overdueCount}
                        </div>
                        <div style={{ fontSize: 12, color: '#991b1b', marginTop: 4 }}>
                          Overdue Items
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Priority Recommendations */}
                {aiRecommendations?.recommendations?.length > 0 && (
                  <div style={{ ...styles.box, padding: 0, overflow: 'hidden' }}>
                    <div style={{
                      padding: '14px 20px',
                      background: '#f8fafc',
                      borderBottom: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}>
                      <span style={{ fontSize: 16 }}>⚡</span>
                      <span style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>Priority Actions</span>
                    </div>
                    {aiRecommendations.recommendations.map((rec, idx) => (
                      <div
                        key={rec.id}
                        style={{
                          padding: '16px 20px',
                          borderBottom: idx < aiRecommendations.recommendations.length - 1 ? '1px solid #f1f5f9' : 'none',
                          cursor: 'pointer',
                          transition: 'background 0.15s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = 'white'}
                        onClick={() => {
                          if (rec.applicationId) {
                            const c = people.find(p => p.id === rec.applicationId || p._original?.id === rec.applicationId);
                            if (c) {
                              setCandidate(c);
                              navigate(`/applications/candidate/${c.id}`);
                            }
                          }
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                          <span style={{
                            fontSize: 20,
                            flexShrink: 0,
                            marginTop: 2
                          }}>{rec.icon}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              marginBottom: 4
                            }}>
                              <span style={{
                                fontWeight: 600,
                                color: '#1e293b',
                                fontSize: 14
                              }}>{rec.title}</span>
                              {rec.type === 'high_priority' && (
                                <span style={{
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                  fontSize: 10,
                                  fontWeight: 600,
                                  background: '#fef2f2',
                                  color: '#ef4444'
                                }}>HIGH</span>
                              )}
                              {rec.type === 'overdue' && (
                                <span style={{
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                  fontSize: 10,
                                  fontWeight: 600,
                                  background: '#fef2f2',
                                  color: '#dc2626'
                                }}>OVERDUE</span>
                              )}
                              {rec.type === 'today' && (
                                <span style={{
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                  fontSize: 10,
                                  fontWeight: 600,
                                  background: '#fef3c7',
                                  color: '#d97706'
                                }}>TODAY</span>
                              )}
                            </div>
                            <p style={{
                              margin: 0,
                              fontSize: 13,
                              color: '#64748b',
                              lineHeight: 1.5
                            }}>{rec.description}</p>
                            {rec.score && (
                              <div style={{
                                marginTop: 8,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '4px 10px',
                                background: '#dcfce7',
                                borderRadius: 6
                              }}>
                                <span style={{ fontSize: 12, fontWeight: 600, color: '#16a34a' }}>
                                  {rec.score}% Match
                                </span>
                              </div>
                            )}
                          </div>
                          <span style={{
                            color: '#94a3b8',
                            fontSize: 18
                          }}>→</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* AI Insights */}
                {aiRecommendations?.insights?.length > 0 && aiRecommendations.insights.map(insight => (
                  <div
                    key={insight.id}
                    style={{
                      ...styles.box,
                      background: insight.type === 'warning' ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' :
                                  insight.type === 'positive' ? 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)' :
                                  'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                      border: insight.type === 'warning' ? '1px solid #fcd34d' :
                              insight.type === 'positive' ? '1px solid #86efac' :
                              '1px solid #93c5fd'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <span style={{ fontSize: 24 }}>{insight.icon}</span>
                      <div>
                        <div style={{
                          fontWeight: 600,
                          color: insight.type === 'warning' ? '#92400e' :
                                insight.type === 'positive' ? '#166534' : '#1e40af',
                          marginBottom: 6
                        }}>{insight.title}</div>
                        <p style={{
                          margin: 0,
                          fontSize: 14,
                          color: insight.type === 'warning' ? '#a16207' :
                                insight.type === 'positive' ? '#15803d' : '#1d4ed8',
                          lineHeight: 1.5
                        }}>{insight.description}</p>
                        {insight.suggestion && (
                          <p style={{
                            margin: '10px 0 0',
                            fontSize: 13,
                            color: '#64748b',
                            fontStyle: 'italic'
                          }}>💡 {insight.suggestion}</p>
                        )}
                        {insight.applications?.length > 0 && (
                          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {insight.applications.map(app => (
                              <div
                                key={app.id}
                                onClick={() => {
                                  const c = people.find(p => p.id === app.id || p._original?.id === app.id);
                                  if (c) {
                                    setCandidate(c);
                                    navigate(`/applications/candidate/${c.id}`);
                                  }
                                }}
                                style={{
                                  padding: '8px 12px',
                                  background: 'rgba(255,255,255,0.5)',
                                  borderRadius: 8,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center'
                                }}
                              >
                                <span style={{ fontWeight: 500, color: '#1e293b', fontSize: 13 }}>{app.name}</span>
                                <span style={{ fontSize: 12, color: '#64748b' }}>{app.daysSince} days inactive</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Empty State */}
                {(!aiRecommendations?.recommendations?.length && !aiRecommendations?.insights?.length && !loadingRecommendations) && (
                  <div style={{
                    ...styles.box,
                    textAlign: 'center',
                    padding: 32,
                    background: '#f8fafc'
                  }}>
                    <span style={{ fontSize: 40, marginBottom: 16, display: 'block' }}>✨</span>
                    <p style={{ color: '#64748b', margin: 0 }}>
                      All caught up! No priority actions right now.
                    </p>
                  </div>
                )}

                {/* Loading State */}
                {loadingRecommendations && !aiRecommendations && (
                  <div style={{
                    ...styles.box,
                    textAlign: 'center',
                    padding: 32,
                    background: '#f8fafc'
                  }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      border: '3px solid #e2e8f0',
                      borderTopColor: '#0ea5e9',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      margin: '0 auto 16px'
                    }} />
                    <p style={{ color: '#64748b', margin: 0 }}>
                      Analyzing your pipeline...
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ==================
            ASSIGNMENTS SCREEN
            ================== */}
        {view === 'assignments' && (
          <>
            {/* Hero Header with Stats */}
            <div style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
              borderRadius: 20,
              padding: 32,
              marginBottom: 28,
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Background decoration */}
              <div style={{
                position: 'absolute',
                top: -50,
                right: -50,
                width: 200,
                height: 200,
                background: 'radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, transparent 70%)',
                borderRadius: '50%'
              }} />
              <div style={{
                position: 'absolute',
                bottom: -30,
                left: '30%',
                width: 150,
                height: 150,
                background: 'radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, transparent 70%)',
                borderRadius: '50%'
              }} />

              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                  <div>
                    <h2 style={{ color: 'white', fontSize: 28, fontWeight: 700, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{
                        width: 48,
                        height: 48,
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        borderRadius: 14,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 22
                      }}>📝</span>
                      Assignments
                    </h2>
                    <p style={{ color: '#94a3b8', margin: 0, fontSize: 15 }}>
                      Create and manage assignments for different job roles
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedAssignment(null);
                      setAssignmentForm({
                        name: '',
                        jobTypes: [],
                        instructions: '',
                        link: '',
                        files: [],
                        deadline: '3 days'
                      });
                      setModal('createAssignment');
                    }}
                    style={{
                      padding: '14px 28px',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 12,
                      fontSize: 15,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <span style={{ fontSize: 18 }}>+</span> Create Template
                  </button>
                </div>

                {/* Stats Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                  {[
                    { label: 'Total Templates', value: assignments.length, icon: '📋', color: '#6366f1' },
                    { label: 'Job Types Covered', value: [...new Set(assignments.flatMap(a => a.jobTypes))].length, icon: '💼', color: '#0ea5e9' },
                    { label: 'With Attachments', value: assignments.filter(a => a.files?.length > 0).length, icon: '📎', color: '#f59e0b' },
                    { label: 'Active This Month', value: assignments.length, icon: '✅', color: '#10b981' }
                  ].map((stat, i) => (
                    <div key={i} style={{
                      background: 'rgba(255,255,255,0.08)',
                      backdropFilter: 'blur(10px)',
                      borderRadius: 14,
                      padding: 16,
                      border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <span style={{
                          width: 32,
                          height: 32,
                          background: `${stat.color}25`,
                          borderRadius: 8,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 16
                        }}>{stat.icon}</span>
                        <span style={{ color: '#94a3b8', fontSize: 12, fontWeight: 500 }}>{stat.label}</span>
                      </div>
                      <div style={{ color: 'white', fontSize: 28, fontWeight: 700 }}>{stat.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Assignments Grid */}
            {assignments.length === 0 ? (
              <div style={{
                padding: 80,
                textAlign: 'center',
                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                borderRadius: 20,
                border: '2px dashed #cbd5e1'
              }}>
                <div style={{
                  width: 80,
                  height: 80,
                  background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
                  borderRadius: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 36,
                  margin: '0 auto 20px'
                }}>📝</div>
                <div style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>No templates yet</div>
                <div style={{ fontSize: 14, color: '#64748b', marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
                  Create your first assignment template to streamline your hiring process and ensure consistent candidate evaluation.
                </div>
                <button
                  onClick={() => {
                    setSelectedAssignment(null);
                    setAssignmentForm({ name: '', jobTypes: [], instructions: '', link: '', files: [], deadline: '3 days' });
                    setModal('createAssignment');
                  }}
                  style={{
                    padding: '14px 28px',
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 12,
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)'
                  }}
                >
                  + Create Your First Template
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
                {assignments.map((assignment, idx) => (
                  <div
                    key={assignment.id}
                    onClick={() => {
                      setAssignmentToView(assignment);
                      setShowAssignmentDetailsModal(true);
                    }}
                    style={{
                    background: 'white',
                    borderRadius: 16,
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    cursor: 'pointer'
                  }}>
                    {/* Top colored bar */}
                    <div style={{
                      height: 4,
                      background: `linear-gradient(90deg, ${['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899'][idx % 5]} 0%, ${['#8b5cf6', '#38bdf8', '#34d399', '#fbbf24', '#f472b6'][idx % 5]} 100%)`
                    }} />

                    <div style={{ padding: 24 }}>
                      {/* Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                            <div style={{
                              width: 44,
                              height: 44,
                              background: `linear-gradient(135deg, ${['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899'][idx % 5]}15 0%, ${['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899'][idx % 5]}25 100%)`,
                              borderRadius: 12,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 20
                            }}>📝</div>
                            <div>
                              <h3 style={{ fontSize: 17, fontWeight: 700, color: '#1e293b', margin: 0 }}>
                                {assignment.name}
                              </h3>
                              <span style={{ fontSize: 12, color: '#64748b' }}>
                                Created {assignment.createdAt}
                              </span>
                            </div>
                          </div>

                          {/* Job Type Tags */}
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {assignment.jobTypes.slice(0, 3).map((jobType, jIdx) => (
                              <span key={jIdx} style={{
                                padding: '5px 12px',
                                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                                color: '#1e40af',
                                borderRadius: 8,
                                fontSize: 11,
                                fontWeight: 600,
                                border: '1px solid #bfdbfe'
                              }}>
                                {jobType}
                              </span>
                            ))}
                            {assignment.jobTypes.length > 3 && (
                              <span style={{
                                padding: '5px 12px',
                                background: '#f1f5f9',
                                color: '#64748b',
                                borderRadius: 8,
                                fontSize: 11,
                                fontWeight: 600
                              }}>
                                +{assignment.jobTypes.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions Menu */}
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAssignment(assignment);
                              setAssignmentForm({
                                name: assignment.name,
                                jobTypes: assignment.jobTypes,
                                instructions: assignment.instructions,
                                link: assignment.link,
                                files: assignment.files,
                                deadline: assignment.deadline
                              });
                              setModal('createAssignment');
                            }}
                            style={{
                              width: 36,
                              height: 36,
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: 10,
                              color: '#64748b',
                              cursor: 'pointer',
                              fontSize: 14,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s'
                            }}
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteAssignment(assignment.id); }}
                            style={{
                              width: 36,
                              height: 36,
                              background: '#fef2f2',
                              border: '1px solid #fecaca',
                              borderRadius: 10,
                              color: '#dc2626',
                              cursor: 'pointer',
                              fontSize: 14,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s'
                            }}
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      {/* Instructions Preview */}
                      <div style={{
                        background: '#f8fafc',
                        borderRadius: 12,
                        padding: 16,
                        marginBottom: 16,
                        border: '1px solid #f1f5f9'
                      }}>
                        <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Instructions
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            color: '#475569',
                            lineHeight: 1.6,
                            maxHeight: 60,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical'
                          }}
                          dangerouslySetInnerHTML={{ __html: assignment.instructions || '<em>No instructions provided</em>' }}
                        />
                      </div>

                      {/* Footer Info */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingTop: 16,
                        borderTop: '1px solid #f1f5f9'
                      }}>
                        <div style={{ display: 'flex', gap: 16 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{
                              width: 28,
                              height: 28,
                              background: '#fef3c7',
                              borderRadius: 8,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 12
                            }}>⏱️</span>
                            <span style={{ fontSize: 12, color: '#64748b' }}>{assignment.deadline}</span>
                          </div>
                          {assignment.files?.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{
                                width: 28,
                                height: 28,
                                background: '#eff6ff',
                                borderRadius: 8,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 12
                              }}>📎</span>
                              <span style={{ fontSize: 12, color: '#64748b' }}>{assignment.files.length} file{assignment.files.length > 1 ? 's' : ''}</span>
                            </div>
                          )}
                          {assignment.link && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{
                                width: 28,
                                height: 28,
                                background: '#f0fdf4',
                                borderRadius: 8,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 12
                              }}>🔗</span>
                              <span style={{ fontSize: 12, color: '#64748b' }}>Link</span>
                            </div>
                          )}
                        </div>
                        <span style={{
                          fontSize: 11,
                          color: '#94a3b8',
                          background: '#f8fafc',
                          padding: '4px 10px',
                          borderRadius: 6
                        }}>
                          by {assignment.createdBy}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ==================
            IMPORT SCREEN - Enterprise Redesign
            ================== */}
        {view === 'import' && (
          <>
            {/* Hero Header - Enterprise Design */}
            <div style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
              borderRadius: 20,
              padding: 32,
              marginBottom: 28,
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Background decorations */}
              <div style={{
                position: 'absolute',
                top: -50,
                right: -50,
                width: 200,
                height: 200,
                background: 'radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%)',
                borderRadius: '50%'
              }} />
              <div style={{
                position: 'absolute',
                bottom: -30,
                left: '30%',
                width: 150,
                height: 150,
                background: 'radial-gradient(circle, rgba(168, 85, 247, 0.2) 0%, transparent 70%)',
                borderRadius: '50%'
              }} />

              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h2 style={{ color: 'white', fontSize: 28, fontWeight: 700, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{
                        width: 48,
                        height: 48,
                        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                        borderRadius: 14,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 22
                      }}>&#128229;</span>
                      Import Candidates
                    </h2>
                    <p style={{ color: '#94a3b8', margin: 0, fontSize: 15 }}>
                      Add candidates from LinkedIn profiles or upload resumes in bulk
                    </p>
                  </div>
                  <div style={{
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    color: 'white',
                    padding: '10px 20px',
                    borderRadius: 12,
                    fontSize: 13,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)'
                  }}>
                    &#128679; Coming Soon - Full Integration
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              {/* LinkedIn Import */}
              <div style={{
                background: 'white',
                borderRadius: 16,
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
                position: 'relative'
              }}>
                <div style={{ height: 4, background: 'linear-gradient(90deg, #3b82f6 0%, #0ea5e9 100%)' }} />
                <div style={{ padding: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                    <div style={{
                      width: 52,
                      height: 52,
                      background: 'linear-gradient(135deg, #3b82f615 0%, #3b82f625 100%)',
                      borderRadius: 14,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 26
                    }}>&#128279;</div>
                    <div>
                      <h3 style={{ fontWeight: 700, color: '#1e293b', margin: 0, fontSize: 18 }}>LinkedIn Import</h3>
                      <p style={{ color: '#64748b', margin: 0, fontSize: 14 }}>Paste a profile URL to import</p>
                    </div>
                  </div>
                  <input
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/username"
                    style={{
                      ...styles.input,
                      marginBottom: 12,
                      padding: '14px 16px',
                      borderRadius: 12,
                      border: '2px solid #e2e8f0',
                      fontSize: 14
                    }}
                  />
                  <select
                    style={{
                      ...styles.input,
                      marginBottom: 20,
                      color: '#64748b',
                      padding: '14px 16px',
                      borderRadius: 12,
                      border: '2px solid #e2e8f0',
                      fontSize: 14
                    }}
                  >
                    <option>Select Job Opening</option>
                    {openings.map(j => <option key={j.id}>{j.name}</option>)}
                  </select>
                  <button
                    onClick={bring}
                    style={{
                      width: '100%',
                      padding: '14px 24px',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 12,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8
                    }}
                  >
                    &#128279; Import from LinkedIn
                  </button>
                </div>
              </div>

              {/* Bulk Upload */}
              <div style={{
                background: 'white',
                borderRadius: 16,
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(0,0,0,0.04)'
              }}>
                <div style={{ height: 4, background: 'linear-gradient(90deg, #8b5cf6 0%, #a855f7 100%)' }} />
                <div style={{ padding: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                    <div style={{
                      width: 52,
                      height: 52,
                      background: 'linear-gradient(135deg, #8b5cf615 0%, #8b5cf625 100%)',
                      borderRadius: 14,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 26
                    }}>&#128196;</div>
                    <div>
                      <h3 style={{ fontWeight: 700, color: '#1e293b', margin: 0, fontSize: 18 }}>Bulk Upload</h3>
                      <p style={{ color: '#64748b', margin: 0, fontSize: 14 }}>Upload multiple resumes at once</p>
                    </div>
                  </div>
                  <div
                    onClick={() => pop('File picker would open here')}
                    style={{
                      border: '2px dashed #8b5cf640',
                      borderRadius: 16,
                      padding: 40,
                      textAlign: 'center',
                      cursor: 'pointer',
                      marginBottom: 20,
                      transition: 'all 0.2s',
                      background: 'linear-gradient(135deg, #8b5cf608 0%, #8b5cf612 100%)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#8b5cf6';
                      e.currentTarget.style.background = 'linear-gradient(135deg, #8b5cf612 0%, #8b5cf620 100%)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#8b5cf640';
                      e.currentTarget.style.background = 'linear-gradient(135deg, #8b5cf608 0%, #8b5cf612 100%)';
                    }}
                  >
                    <div style={{
                      width: 64,
                      height: 64,
                      background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
                      borderRadius: 16,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 16px',
                      boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)'
                    }}>
                      <span style={{ fontSize: 28, color: 'white' }}>&#128228;</span>
                    </div>
                    <div style={{ color: '#1e293b', fontWeight: 600, marginBottom: 4, fontSize: 15 }}>Drop files or click to browse</div>
                    <div style={{ color: '#94a3b8', fontSize: 13 }}>PDF, DOC, DOCX up to 10MB each</div>
                  </div>
                  <button
                    onClick={() => pop('Upload started!')}
                    style={{
                      width: '100%',
                      padding: '14px 24px',
                      background: 'white',
                      color: '#8b5cf6',
                      border: '2px solid #8b5cf6',
                      borderRadius: 12,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)';
                      e.currentTarget.style.color = 'white';
                      e.currentTarget.style.boxShadow = '0 4px 15px rgba(139, 92, 246, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'white';
                      e.currentTarget.style.color = '#8b5cf6';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    &#128228; Upload Files
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ==================
            SETTINGS - Enterprise Redesign
            ================== */}
        {view === 'settings' && (currentUser?.role === 'Super Admin' || currentUser?.role === 'Admin') && (
          <>
            {/* Hero Header */}
            <div style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
              borderRadius: 20,
              padding: 32,
              marginBottom: 28,
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Background decorations */}
              <div style={{
                position: 'absolute',
                top: -50,
                right: -50,
                width: 200,
                height: 200,
                background: 'radial-gradient(circle, rgba(168, 85, 247, 0.3) 0%, transparent 70%)',
                borderRadius: '50%'
              }} />
              <div style={{
                position: 'absolute',
                bottom: -30,
                left: '40%',
                width: 150,
                height: 150,
                background: 'radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%)',
                borderRadius: '50%'
              }} />

              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                  <div>
                    <h2 style={{ color: 'white', fontSize: 28, fontWeight: 700, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{
                        width: 48,
                        height: 48,
                        background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
                        borderRadius: 14,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 22
                      }}>&#9881;</span>
                      System Settings
                    </h2>
                    <p style={{ color: '#94a3b8', margin: 0, fontSize: 15 }}>
                      Manage system configurations, job settings, and recruitment parameters
                    </p>
                  </div>
                </div>

                {/* Stats Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                  {[
                    { label: 'Departments', value: departments.filter(d => d.active !== false).length, icon: '&#128196;', color: '#6366f1' },
                    { label: 'Role Types', value: roleTypes.filter(r => r.active !== false).length, icon: '&#128188;', color: '#0ea5e9' },
                    { label: 'Work Setups', value: workSetups.filter(w => w.active !== false).length, icon: '&#127968;', color: '#10b981' },
                    { label: 'Referral Sources', value: referralSources.length, icon: '&#128279;', color: '#f59e0b' }
                  ].map((stat, i) => (
                    <div key={i} style={{
                      background: 'rgba(255,255,255,0.08)',
                      backdropFilter: 'blur(10px)',
                      borderRadius: 14,
                      padding: 16,
                      border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <span style={{
                          width: 32,
                          height: 32,
                          background: `${stat.color}25`,
                          borderRadius: 8,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 16
                        }} dangerouslySetInnerHTML={{ __html: stat.icon }} />
                        <span style={{ color: '#94a3b8', fontSize: 12, fontWeight: 500 }}>{stat.label}</span>
                      </div>
                      <div style={{ color: 'white', fontSize: 28, fontWeight: 700 }}>{stat.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Settings Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>

              {/* Departments Section */}
              <div style={{
                background: 'white',
                borderRadius: 16,
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(0,0,0,0.04)'
              }}>
                <div style={{ height: 4, background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)' }} />
                <div style={{ padding: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <div style={{
                      width: 44,
                      height: 44,
                      background: 'linear-gradient(135deg, #6366f115 0%, #6366f125 100%)',
                      borderRadius: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20
                    }}>&#128196;</div>
                    <div>
                      <h3 style={{ fontSize: 17, fontWeight: 700, color: '#1e293b', margin: 0 }}>Departments</h3>
                      <span style={{ fontSize: 12, color: '#64748b' }}>Organizational units</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                    <input
                      value={newDepartment}
                      onChange={e => setNewDepartment(e.target.value)}
                      placeholder="Add new department..."
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        border: '2px solid #e2e8f0',
                        borderRadius: 10,
                        fontSize: 14,
                        transition: 'border-color 0.2s',
                        outline: 'none'
                      }}
                      onFocus={e => e.target.style.borderColor = '#6366f1'}
                      onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                      onKeyPress={e => e.key === 'Enter' && addDepartment()}
                    />
                    <button
                      type="button"
                      onClick={() => addDepartment()}
                      style={{
                        padding: '12px 20px',
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 10,
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: 14,
                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                      }}
                    >
                      + Add
                    </button>
                  </div>

                  <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                    {departments.map(dept => (
                      <div key={dept.id} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '14px 16px',
                        background: dept.active !== false ? '#f8fafc' : '#fef2f2',
                        borderRadius: 10,
                        marginBottom: 8,
                        border: `1px solid ${dept.active !== false ? '#e2e8f0' : '#fecaca'}`,
                        transition: 'all 0.2s'
                      }}>
                        {editingItem === `dept-${dept.id}` ? (
                          <div style={{ display: 'flex', gap: 8, flex: 1 }}>
                            <input
                              value={editingValue}
                              onChange={e => setEditingValue(e.target.value)}
                              style={{ flex: 1, padding: '8px 12px', border: '2px solid #6366f1', borderRadius: 8, fontSize: 14, outline: 'none' }}
                              autoFocus
                              onKeyPress={e => e.key === 'Enter' && updateDepartment(dept.id, editingValue)}
                            />
                            <button
                              type="button"
                              onClick={() => updateDepartment(dept.id, editingValue)}
                              style={{ padding: '8px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 12 }}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => { setEditingItem(null); setEditingValue(''); }}
                              style={{ padding: '8px 16px', background: '#64748b', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 12 }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                background: dept.active !== false ? '#10b981' : '#ef4444'
                              }} />
                              <span style={{ fontWeight: 500, color: dept.active !== false ? '#1e293b' : '#94a3b8' }}>{dept.name}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button
                                type="button"
                                onClick={() => { setEditingItem(`dept-${dept.id}`); setEditingValue(dept.name); }}
                                style={{ width: 32, height: 32, background: '#eff6ff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}
                                title="Edit"
                              >
                                &#9998;
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleDepartmentStatus(dept.id)}
                                style={{
                                  width: 32,
                                  height: 32,
                                  background: dept.active !== false ? '#fef2f2' : '#f0fdf4',
                                  border: 'none',
                                  borderRadius: 8,
                                  cursor: 'pointer',
                                  fontSize: 14
                                }}
                                title={dept.active !== false ? 'Deactivate' : 'Activate'}
                              >
                                {dept.active !== false ? '&#128308;' : '&#128994;'}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                  {departments.length === 0 && (
                    <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>&#128196;</div>
                      <div>No departments configured</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Role Types Section */}
              <div style={{
                background: 'white',
                borderRadius: 16,
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(0,0,0,0.04)'
              }}>
                <div style={{ height: 4, background: 'linear-gradient(90deg, #0ea5e9 0%, #38bdf8 100%)' }} />
                <div style={{ padding: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <div style={{
                      width: 44,
                      height: 44,
                      background: 'linear-gradient(135deg, #0ea5e915 0%, #0ea5e925 100%)',
                      borderRadius: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20
                    }}>&#128188;</div>
                    <div>
                      <h3 style={{ fontSize: 17, fontWeight: 700, color: '#1e293b', margin: 0 }}>Role Types</h3>
                      <span style={{ fontSize: 12, color: '#64748b' }}>Employment categories</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                    <input
                      value={newRoleType}
                      onChange={e => setNewRoleType(e.target.value)}
                      placeholder="Add new role type..."
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        border: '2px solid #e2e8f0',
                        borderRadius: 10,
                        fontSize: 14,
                        transition: 'border-color 0.2s',
                        outline: 'none'
                      }}
                      onFocus={e => e.target.style.borderColor = '#0ea5e9'}
                      onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                      onKeyPress={e => e.key === 'Enter' && addRoleType()}
                    />
                    <button
                      type="button"
                      onClick={() => addRoleType()}
                      style={{
                        padding: '12px 20px',
                        background: 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 10,
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: 14,
                        boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)'
                      }}
                    >
                      + Add
                    </button>
                  </div>

                  <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                    {roleTypes.map(type => (
                      <div key={type.id} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '14px 16px',
                        background: type.active !== false ? '#f8fafc' : '#fef2f2',
                        borderRadius: 10,
                        marginBottom: 8,
                        border: `1px solid ${type.active !== false ? '#e2e8f0' : '#fecaca'}`,
                        transition: 'all 0.2s'
                      }}>
                        {editingItem === `role-${type.id}` ? (
                          <div style={{ display: 'flex', gap: 8, flex: 1 }}>
                            <input
                              value={editingValue}
                              onChange={e => setEditingValue(e.target.value)}
                              style={{ flex: 1, padding: '8px 12px', border: '2px solid #0ea5e9', borderRadius: 8, fontSize: 14, outline: 'none' }}
                              autoFocus
                              onKeyPress={e => e.key === 'Enter' && updateRoleType(type.id, editingValue)}
                            />
                            <button
                              type="button"
                              onClick={() => updateRoleType(type.id, editingValue)}
                              style={{ padding: '8px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 12 }}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => { setEditingItem(null); setEditingValue(''); }}
                              style={{ padding: '8px 16px', background: '#64748b', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 12 }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                background: type.active !== false ? '#10b981' : '#ef4444'
                              }} />
                              <span style={{ fontWeight: 500, color: type.active !== false ? '#1e293b' : '#94a3b8' }}>{type.name}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button
                                type="button"
                                onClick={() => { setEditingItem(`role-${type.id}`); setEditingValue(type.name); }}
                                style={{ width: 32, height: 32, background: '#eff6ff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}
                                title="Edit"
                              >
                                &#9998;
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleRoleTypeStatus(type.id)}
                                style={{
                                  width: 32,
                                  height: 32,
                                  background: type.active !== false ? '#fef2f2' : '#f0fdf4',
                                  border: 'none',
                                  borderRadius: 8,
                                  cursor: 'pointer',
                                  fontSize: 14
                                }}
                                title={type.active !== false ? 'Deactivate' : 'Activate'}
                              >
                                {type.active !== false ? '&#128308;' : '&#128994;'}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                  {roleTypes.length === 0 && (
                    <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>&#128188;</div>
                      <div>No role types configured</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Work Setup Section */}
              <div style={{
                background: 'white',
                borderRadius: 16,
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(0,0,0,0.04)'
              }}>
                <div style={{ height: 4, background: 'linear-gradient(90deg, #10b981 0%, #34d399 100%)' }} />
                <div style={{ padding: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <div style={{
                      width: 44,
                      height: 44,
                      background: 'linear-gradient(135deg, #10b98115 0%, #10b98125 100%)',
                      borderRadius: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20
                    }}>&#127968;</div>
                    <div>
                      <h3 style={{ fontSize: 17, fontWeight: 700, color: '#1e293b', margin: 0 }}>Work Setup</h3>
                      <span style={{ fontSize: 12, color: '#64748b' }}>Remote, hybrid, onsite</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                    <input
                      value={newWorkSetup}
                      onChange={e => setNewWorkSetup(e.target.value)}
                      placeholder="Add new work setup..."
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        border: '2px solid #e2e8f0',
                        borderRadius: 10,
                        fontSize: 14,
                        transition: 'border-color 0.2s',
                        outline: 'none'
                      }}
                      onFocus={e => e.target.style.borderColor = '#10b981'}
                      onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                      onKeyPress={e => e.key === 'Enter' && addWorkSetup()}
                    />
                    <button
                      type="button"
                      onClick={() => addWorkSetup()}
                      style={{
                        padding: '12px 20px',
                        background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 10,
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: 14,
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                      }}
                    >
                      + Add
                    </button>
                  </div>

                  <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                    {workSetups.map(setup => (
                      <div key={setup.id} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '14px 16px',
                        background: setup.active !== false ? '#f8fafc' : '#fef2f2',
                        borderRadius: 10,
                        marginBottom: 8,
                        border: `1px solid ${setup.active !== false ? '#e2e8f0' : '#fecaca'}`,
                        transition: 'all 0.2s'
                      }}>
                        {editingItem === `work-${setup.id}` ? (
                          <div style={{ display: 'flex', gap: 8, flex: 1 }}>
                            <input
                              value={editingValue}
                              onChange={e => setEditingValue(e.target.value)}
                              style={{ flex: 1, padding: '8px 12px', border: '2px solid #10b981', borderRadius: 8, fontSize: 14, outline: 'none' }}
                              autoFocus
                              onKeyPress={e => e.key === 'Enter' && updateWorkSetup(setup.id, editingValue)}
                            />
                            <button
                              type="button"
                              onClick={() => updateWorkSetup(setup.id, editingValue)}
                              style={{ padding: '8px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 12 }}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => { setEditingItem(null); setEditingValue(''); }}
                              style={{ padding: '8px 16px', background: '#64748b', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 12 }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                background: setup.active !== false ? '#10b981' : '#ef4444'
                              }} />
                              <span style={{ fontWeight: 500, color: setup.active !== false ? '#1e293b' : '#94a3b8' }}>{setup.name}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button
                                type="button"
                                onClick={() => { setEditingItem(`work-${setup.id}`); setEditingValue(setup.name); }}
                                style={{ width: 32, height: 32, background: '#f0fdf4', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}
                                title="Edit"
                              >
                                &#9998;
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleWorkSetupStatus(setup.id)}
                                style={{
                                  width: 32,
                                  height: 32,
                                  background: setup.active !== false ? '#fef2f2' : '#f0fdf4',
                                  border: 'none',
                                  borderRadius: 8,
                                  cursor: 'pointer',
                                  fontSize: 14
                                }}
                                title={setup.active !== false ? 'Deactivate' : 'Activate'}
                              >
                                {setup.active !== false ? '&#128308;' : '&#128994;'}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                  {workSetups.length === 0 && (
                    <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>&#127968;</div>
                      <div>No work setups configured</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Referral Sources Section */}
              <div style={{
                background: 'white',
                borderRadius: 16,
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(0,0,0,0.04)'
              }}>
                <div style={{ height: 4, background: 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)' }} />
                <div style={{ padding: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <div style={{
                      width: 44,
                      height: 44,
                      background: 'linear-gradient(135deg, #f59e0b15 0%, #f59e0b25 100%)',
                      borderRadius: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20
                    }}>&#128279;</div>
                    <div>
                      <h3 style={{ fontSize: 17, fontWeight: 700, color: '#1e293b', margin: 0 }}>Referral Sources</h3>
                      <span style={{ fontSize: 12, color: '#64748b' }}>Track candidate origins</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                    <input
                      value={newReferralSource}
                      onChange={e => setNewReferralSource(e.target.value)}
                      placeholder="Add referral source..."
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        border: '2px solid #e2e8f0',
                        borderRadius: 10,
                        fontSize: 14,
                        transition: 'border-color 0.2s',
                        outline: 'none'
                      }}
                      onFocus={e => e.target.style.borderColor = '#f59e0b'}
                      onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                      onKeyPress={e => {
                        if (e.key === 'Enter' && newReferralSource.trim()) {
                          setReferralSources(prev => [...prev, newReferralSource.trim()]);
                          setNewReferralSource('');
                          pop('Referral source added!');
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newReferralSource.trim()) {
                          setReferralSources(prev => [...prev, newReferralSource.trim()]);
                          setNewReferralSource('');
                          pop('Referral source added!');
                        }
                      }}
                      style={{
                        padding: '12px 20px',
                        background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 10,
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: 14,
                        boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
                      }}
                    >
                      + Add
                    </button>
                  </div>

                  <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                    {referralSources.map((source, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '14px 16px',
                        background: '#f8fafc',
                        borderRadius: 10,
                        marginBottom: 8,
                        border: '1px solid #e2e8f0',
                        transition: 'all 0.2s'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: '#f59e0b'
                          }} />
                          <span style={{ fontWeight: 500, color: '#1e293b' }}>{source}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setReferralSources(prev => prev.filter((_, i) => i !== idx));
                            pop('Referral source removed');
                          }}
                          style={{
                            width: 32,
                            height: 32,
                            background: '#fef2f2',
                            border: 'none',
                            borderRadius: 8,
                            cursor: 'pointer',
                            fontSize: 14,
                            color: '#dc2626'
                          }}
                          title="Remove"
                        >
                          &#128465;
                        </button>
                      </div>
                    ))}
                  </div>
                  {referralSources.length === 0 && (
                    <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>&#128279;</div>
                      <div>No referral sources configured</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Graduation Year Range */}
              <div style={{
                background: 'white',
                borderRadius: 16,
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(0,0,0,0.04)'
              }}>
                <div style={{ height: 4, background: 'linear-gradient(90deg, #ec4899 0%, #f472b6 100%)' }} />
                <div style={{ padding: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <div style={{
                      width: 44,
                      height: 44,
                      background: 'linear-gradient(135deg, #ec489915 0%, #ec489925 100%)',
                      borderRadius: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20
                    }}>&#127891;</div>
                    <div>
                      <h3 style={{ fontSize: 17, fontWeight: 700, color: '#1e293b', margin: 0 }}>Graduation Year Range</h3>
                      <span style={{ fontSize: 12, color: '#64748b' }}>Filter candidates by graduation</span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 8 }}>From Year</label>
                      <input
                        type="number"
                        value={graduationYearRange.fromYear}
                        onChange={e => setGraduationYearRange(prev => ({...prev, fromYear: parseInt(e.target.value) || 2020}))}
                        min="2000"
                        max="2030"
                        style={{
                          width: '100%',
                          padding: '14px 16px',
                          border: '2px solid #e2e8f0',
                          borderRadius: 10,
                          fontSize: 15,
                          fontWeight: 600,
                          color: '#1e293b',
                          outline: 'none',
                          transition: 'border-color 0.2s'
                        }}
                        onFocus={e => e.target.style.borderColor = '#ec4899'}
                        onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 8 }}>To Year</label>
                      <input
                        type="number"
                        value={graduationYearRange.toYear}
                        onChange={e => setGraduationYearRange(prev => ({...prev, toYear: parseInt(e.target.value) || 2027}))}
                        min="2000"
                        max="2030"
                        style={{
                          width: '100%',
                          padding: '14px 16px',
                          border: '2px solid #e2e8f0',
                          borderRadius: 10,
                          fontSize: 15,
                          fontWeight: 600,
                          color: '#1e293b',
                          outline: 'none',
                          transition: 'border-color 0.2s'
                        }}
                        onFocus={e => e.target.style.borderColor = '#ec4899'}
                        onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                      />
                    </div>
                  </div>
                  <div style={{
                    background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)',
                    borderRadius: 10,
                    padding: 16,
                    border: '1px solid #fbcfe8'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16 }}>&#128197;</span>
                      <span style={{ color: '#be185d', fontWeight: 600, fontSize: 14 }}>
                        Active Range: {graduationYearRange.fromYear} - {graduationYearRange.toYear}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* User Roles Section - Only for Super Admin */}
              {currentUser?.role === 'Super Admin' && (
                <div style={{
                  background: 'white',
                  borderRadius: 16,
                  border: '1px solid #e2e8f0',
                  overflow: 'hidden',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.04)'
                }}>
                  <div style={{ height: 4, background: 'linear-gradient(90deg, #8b5cf6 0%, #a78bfa 100%)' }} />
                  <div style={{ padding: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                      <div style={{
                        width: 44,
                        height: 44,
                        background: 'linear-gradient(135deg, #8b5cf615 0%, #8b5cf625 100%)',
                        borderRadius: 12,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 20
                      }}>&#128274;</div>
                      <div>
                        <h3 style={{ fontSize: 17, fontWeight: 700, color: '#1e293b', margin: 0 }}>User Roles (RBAC)</h3>
                        <span style={{ fontSize: 12, color: '#64748b' }}>Define roles and permissions</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                      <input
                        value={newRoleName}
                        onChange={e => setNewRoleName(e.target.value)}
                        placeholder="Role name..."
                        style={{
                          flex: 1,
                          padding: '12px 16px',
                          border: '2px solid #e2e8f0',
                          borderRadius: 10,
                          fontSize: 14,
                          transition: 'border-color 0.2s',
                          outline: 'none'
                        }}
                        onFocus={e => e.target.style.borderColor = '#8b5cf6'}
                        onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                      />
                      <input
                        value={newRoleDescription}
                        onChange={e => setNewRoleDescription(e.target.value)}
                        placeholder="Description..."
                        style={{
                          flex: 1,
                          padding: '12px 16px',
                          border: '2px solid #e2e8f0',
                          borderRadius: 10,
                          fontSize: 14,
                          transition: 'border-color 0.2s',
                          outline: 'none'
                        }}
                        onFocus={e => e.target.style.borderColor = '#8b5cf6'}
                        onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                      />
                      <button onClick={async () => {
                        if (newRoleName.trim()) {
                          try {
                            const newRole = await rolesAPI.create({
                              name: newRoleName.trim(),
                              description: newRoleDescription.trim() || 'Custom role',
                              permissions: ['dashboard', 'jobs.view', 'candidates.view', 'applications.view'],
                              color: newRoleColor
                            });
                            setUserRoles([...userRoles, newRole]);
                            setNewRoleName('');
                            setNewRoleDescription('');
                            setNewRoleColor('#6366f1');
                            pop('Role created!');
                          } catch (error) {
                            console.error('Error creating role:', error);
                            pop('Failed to create role');
                          }
                        }
                      }} style={{
                        padding: '12px 20px',
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 10,
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: 14,
                        boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
                      }}>+ Add</button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 240, overflowY: 'auto' }}>
                      {userRoles.map(role => (
                        <div key={role.id} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '14px 16px',
                          background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
                          borderRadius: 10,
                          border: '1px solid #ddd6fe'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                              width: 36,
                              height: 36,
                              background: role.color || '#8b5cf6',
                              borderRadius: 8,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontSize: 14,
                              fontWeight: 700
                            }}>
                              {role.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>
                                {role.name}
                                {role.is_system && <span style={{ marginLeft: 8, fontSize: 10, padding: '2px 6px', background: '#e0e7ff', color: '#4f46e5', borderRadius: 4 }}>System</span>}
                              </div>
                              <div style={{ fontSize: 12, color: '#64748b' }}>{role.description}</div>
                            </div>
                          </div>
                          {role.canDelete && (
                            <button onClick={async () => {
                              try {
                                await rolesAPI.delete(role.id);
                                setUserRoles(userRoles.filter(r => r.id !== role.id));
                                pop('Role deleted');
                              } catch (error) {
                                console.error('Error deleting role:', error);
                                pop('Failed to delete role');
                              }
                            }} style={{
                              width: 32,
                              height: 32,
                              background: '#fef2f2',
                              color: '#dc2626',
                              border: 'none',
                              borderRadius: 8,
                              cursor: 'pointer',
                              fontSize: 14
                            }}>&#128465;</button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ==================
            USER MANAGEMENT (Admin)
            ================== */}
        {view === 'admin' && currentUser?.role === 'Super Admin' && (
          <>
            {/* Hero Header - Enterprise Design */}
            <div style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
              borderRadius: 20,
              padding: 32,
              marginBottom: 28,
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Background decorations */}
              <div style={{
                position: 'absolute',
                top: -50,
                right: -50,
                width: 200,
                height: 200,
                background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)',
                borderRadius: '50%'
              }} />
              <div style={{
                position: 'absolute',
                bottom: -30,
                left: '30%',
                width: 150,
                height: 150,
                background: 'radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, transparent 70%)',
                borderRadius: '50%'
              }} />
              <div style={{
                position: 'absolute',
                top: '40%',
                left: '60%',
                width: 100,
                height: 100,
                background: 'radial-gradient(circle, rgba(14, 165, 233, 0.15) 0%, transparent 70%)',
                borderRadius: '50%'
              }} />

              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                  <div>
                    <h2 style={{ color: 'white', fontSize: 28, fontWeight: 700, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{
                        width: 48,
                        height: 48,
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                        borderRadius: 14,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 22
                      }}>&#9881;</span>
                      Admin Management
                    </h2>
                    <p style={{ color: '#94a3b8', margin: 0, fontSize: 15 }}>
                      Manage admin users, roles, and system permissions
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={() => setModal('changePassword')}
                      style={{
                        padding: '10px 18px',
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: 10,
                        color: 'white',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        backdropFilter: 'blur(10px)'
                      }}
                    >
                      &#128274; Change Password
                    </button>
                    <button
                      onClick={() => setModal('createAdmin')}
                      style={{
                        padding: '10px 20px',
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                        border: 'none',
                        borderRadius: 10,
                        color: 'white',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)'
                      }}
                    >
                      + Create Admin
                    </button>
                  </div>
                </div>

                {/* Stats Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                  {[
                    { label: 'Total Admins', value: admins.length, icon: '&#128101;', color: '#0ea5e9' },
                    { label: 'Active', value: admins.filter(a => a.status === 'Active').length, icon: '&#9989;', color: '#10b981' },
                    { label: 'Inactive', value: admins.filter(a => a.status === 'Inactive').length, icon: '&#9208;', color: '#f59e0b' },
                    { label: 'Super Admins', value: admins.filter(a => a.role === 'Super Admin').length, icon: '&#11088;', color: '#8b5cf6' }
                  ].map((stat, i) => (
                    <div key={i} style={{
                      background: 'rgba(255,255,255,0.08)',
                      backdropFilter: 'blur(10px)',
                      borderRadius: 14,
                      padding: 16,
                      border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <span style={{
                          width: 32,
                          height: 32,
                          background: `${stat.color}25`,
                          borderRadius: 8,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 16
                        }} dangerouslySetInnerHTML={{ __html: stat.icon }} />
                        <span style={{ color: '#94a3b8', fontSize: 12, fontWeight: 500 }}>{stat.label}</span>
                      </div>
                      <div style={{ color: 'white', fontSize: 28, fontWeight: 700 }}>{stat.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Admins Table - Enterprise Card */}
            <div style={{
              background: 'white',
              borderRadius: 16,
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(0,0,0,0.04)'
            }}>
              <div style={{ height: 4, background: 'linear-gradient(90deg, #8b5cf6 0%, #6366f1 100%)' }} />
              <div style={{ padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 44,
                      height: 44,
                      background: 'linear-gradient(135deg, #8b5cf615 0%, #8b5cf625 100%)',
                      borderRadius: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20
                    }}>&#128101;</div>
                    <div>
                      <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: 0 }}>All Administrators</h3>
                      <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>{admins.length} total users</p>
                    </div>
                  </div>
                </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ textAlign: 'left', padding: '12px 8px', color: '#64748b', fontWeight: 600, fontSize: 13 }}>NAME</th>
                      <th style={{ textAlign: 'left', padding: '12px 8px', color: '#64748b', fontWeight: 600, fontSize: 13 }}>EMAIL</th>
                      <th style={{ textAlign: 'left', padding: '12px 8px', color: '#64748b', fontWeight: 600, fontSize: 13 }}>ROLE</th>
                      <th style={{ textAlign: 'left', padding: '12px 8px', color: '#64748b', fontWeight: 600, fontSize: 13 }}>STATUS</th>
                      <th style={{ textAlign: 'left', padding: '12px 8px', color: '#64748b', fontWeight: 600, fontSize: 13 }}>CREATED</th>
                      <th style={{ textAlign: 'right', padding: '12px 8px', color: '#64748b', fontWeight: 600, fontSize: 13 }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const startIndex = (adminCurrentPage - 1) * adminItemsPerPage;
                      const endIndex = startIndex + adminItemsPerPage;
                      const paginatedAdmins = admins.slice(startIndex, endIndex);
                      return paginatedAdmins.map(admin => (
                      <tr key={admin.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '16px 8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                              width: 36,
                              height: 36,
                              background: 'linear-gradient(135deg, #44924c, #2d6a33)',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontWeight: 600,
                              fontSize: 13
                            }}>{init(admin.name)}</div>
                            <span style={{ fontWeight: 500, color: '#1e293b' }}>{admin.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '16px 8px', color: '#64748b' }}>{admin.email}</td>
                        <td style={{ padding: '16px 8px' }}>
                          <span style={{
                            padding: '4px 12px',
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 600,
                            background: admin.role === 'Super Admin' ? '#f3e8ff' : admin.role === 'Admin' ? '#dbeafe' : '#fef3c7',
                            color: admin.role === 'Super Admin' ? '#7c3aed' : admin.role === 'Admin' ? '#2563eb' : '#d97706'
                          }}>
                            {admin.role}
                          </span>
                        </td>
                        <td style={{ padding: '16px 8px' }}>
                          <span style={{
                            padding: '4px 12px',
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 600,
                            background: admin.status === 'Active' ? '#ecfdf5' : '#fef2f2',
                            color: admin.status === 'Active' ? '#059669' : '#dc2626'
                          }}>
                            {admin.status}
                          </span>
                        </td>
                        <td style={{ padding: '16px 8px', color: '#64748b', fontSize: 14 }}>{admin.created}</td>
                        <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => { setSelectedAdmin(admin); setModal('editAdmin'); }}
                              style={{ ...styles.btn2, padding: '6px 12px', fontSize: 13 }}
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => { setSelectedAdmin(admin); setModal('resetPassword'); }}
                              style={{ ...styles.btn2, padding: '6px 12px', fontSize: 13 }}
                            >
                              🔑 Reset
                            </button>
                            {admin.id !== 1 && (
                              <button
                                onClick={() => updateAdminStatus(admin.id, admin.status === 'Active' ? 'Inactive' : 'Active')}
                                style={{
                                  ...styles.btn2,
                                  padding: '6px 12px',
                                  fontSize: 13,
                                  background: admin.status === 'Active' ? '#fef2f2' : '#ecfdf5',
                                  color: admin.status === 'Active' ? '#dc2626' : '#059669'
                                }}
                              >
                                {admin.status === 'Active' ? '⏸️' : '▶️'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ));
                  })()}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls for Admin Table */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '20px',
                background: '#f8fafc',
                borderRadius: '0 0 16px 16px',
                border: '1px solid #e2e8f0',
                borderTop: 'none'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 14, color: '#64748b', fontWeight: 500 }}>
                    Showing {((adminCurrentPage - 1) * adminItemsPerPage) + 1}-{Math.min(adminCurrentPage * adminItemsPerPage, admins.length)} of {admins.length}
                  </span>
                  <select
                    value={adminItemsPerPage}
                    onChange={(e) => {
                      setAdminItemsPerPage(Number(e.target.value));
                      setAdminCurrentPage(1);
                    }}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '2px solid #e2e8f0',
                      fontSize: 14,
                      fontWeight: 500,
                      cursor: 'pointer',
                      background: 'white'
                    }}
                  >
                    <option value={10}>10 per page</option>
                    <option value={25}>25 per page</option>
                    <option value={50}>50 per page</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  {(() => {
                    const totalPages = Math.ceil(admins.length / adminItemsPerPage);
                    return (
                      <>
                        <button
                          onClick={() => setAdminCurrentPage(1)}
                          disabled={adminCurrentPage === 1}
                          style={{
                            ...styles.btn2,
                            padding: '8px 12px',
                            opacity: adminCurrentPage === 1 ? 0.5 : 1,
                            cursor: adminCurrentPage === 1 ? 'not-allowed' : 'pointer'
                          }}
                        >
                          ⏮️ First
                        </button>
                        <button
                          onClick={() => setAdminCurrentPage(adminCurrentPage - 1)}
                          disabled={adminCurrentPage === 1}
                          style={{
                            ...styles.btn2,
                            padding: '8px 12px',
                            opacity: adminCurrentPage === 1 ? 0.5 : 1,
                            cursor: adminCurrentPage === 1 ? 'not-allowed' : 'pointer'
                          }}
                        >
                          ◀️ Prev
                        </button>
                        <div style={{
                          padding: '8px 16px',
                          background: 'linear-gradient(135deg, #44924c, #2d6a33)',
                          color: 'white',
                          borderRadius: 8,
                          fontWeight: 600,
                          fontSize: 14
                        }}>
                          Page {adminCurrentPage} of {totalPages || 1}
                        </div>
                        <button
                          onClick={() => setAdminCurrentPage(adminCurrentPage + 1)}
                          disabled={adminCurrentPage >= totalPages}
                          style={{
                            ...styles.btn2,
                            padding: '8px 12px',
                            opacity: adminCurrentPage >= totalPages ? 0.5 : 1,
                            cursor: adminCurrentPage >= totalPages ? 'not-allowed' : 'pointer'
                          }}
                        >
                          Next ▶️
                        </button>
                        <button
                          onClick={() => setAdminCurrentPage(totalPages)}
                          disabled={adminCurrentPage >= totalPages}
                          style={{
                            ...styles.btn2,
                            padding: '8px 12px',
                            opacity: adminCurrentPage >= totalPages ? 0.5 : 1,
                            cursor: adminCurrentPage >= totalPages ? 'not-allowed' : 'pointer'
                          }}
                        >
                          Last ⏭️
                        </button>
                      </>
                    );
                  })()}
                </div>
              </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ==================
          MODALS - Enterprise Design
          ================== */}
      {modal && (
        <div
          onClick={() => setModal(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: 24,
              width: modal === 'job' || modal === 'jobDetails' || modal === 'candidateDetails' || modal === 'person' ? '900px' :
                     modal === 'createAssignment' || modal === 'emailPreview' || modal === 'selectAssignment' || modal === 'assignTask' ? '700px' : 520,
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 80px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.1)',
              border: '1px solid rgba(226, 232, 240, 0.5)'
            }}
          >
            {/* Modal Header with Gradient */}
            <div style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              padding: '24px 32px',
              borderRadius: '24px 24px 0 0',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Decorative elements */}
              <div style={{
                position: 'absolute',
                top: -30,
                right: -30,
                width: 100,
                height: 100,
                background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)',
                borderRadius: '50%'
              }} />
              <div style={{
                position: 'absolute',
                bottom: -20,
                left: '30%',
                width: 80,
                height: 80,
                background: 'radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, transparent 70%)',
                borderRadius: '50%'
              }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    background: modal === 'job' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' :
                               modal === 'person' ? 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)' :
                               modal === 'createAdmin' || modal === 'editAdmin' ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' :
                               modal === 'changePassword' || modal === 'resetPassword' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' :
                               modal === 'candidateDetails' ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' :
                               'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                  }}>
                    {modal === 'job' ? '💼' :
                     modal === 'person' ? '👤' :
                     modal === 'jobDetails' ? '📋' :
                     modal === 'candidateDetails' ? '👁️' :
                     modal === 'createAdmin' || modal === 'editAdmin' ? '👥' :
                     modal === 'changePassword' || modal === 'resetPassword' ? '🔐' :
                     modal === 'createAssignment' ? '📝' :
                     modal === 'emailPreview' ? '📧' :
                     modal === 'selectAssignment' ? '📑' :
                     modal === 'assignTask' ? '✓' : '⚙️'}
                  </div>
                  <div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: 'white', margin: 0 }}>
                      {modal === 'job' ? (selectedJobForEdit ? 'Edit Job Opening' : 'Create New Job Opening') :
                       modal === 'jobDetails' ? 'Job Details' :
                       modal === 'candidateDetails' ? 'Candidate Profile' :
                       modal === 'person' ? 'Add New Candidate' :
                       modal === 'createAdmin' ? 'Create Administrator' :
                       modal === 'editAdmin' ? 'Edit Administrator' :
                       modal === 'changePassword' ? 'Change Password' :
                       modal === 'resetPassword' ? 'Reset Password' :
                       modal === 'createAssignment' ? (selectedAssignment ? 'Edit Assignment' : 'Create Assignment') :
                       modal === 'emailPreview' ? 'Email Preview' :
                       modal === 'selectAssignment' ? 'Select Assignment' :
                       modal === 'assignTask' ? 'Assign Task' : 'Modal'}
                    </h2>
                    <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0' }}>
                      {modal === 'job' ? 'Fill in the details to create a job posting' :
                       modal === 'person' ? 'Add candidate information manually' :
                       modal === 'candidateDetails' ? 'View and manage candidate information' :
                       modal === 'createAdmin' ? 'Set up a new admin account' :
                       modal === 'changePassword' ? 'Update your account security' :
                       ''}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setModal(null); setSelectedJob(null); setSelectedJobForEdit(null); setSelectedCandidate(null); }}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    cursor: 'pointer',
                    fontSize: 18,
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  }}
                >✕</button>
              </div>
            </div>

            {/* Modal Content */}
            <div style={{ padding: 32 }}>

            {modal === 'job' && (
              <div>
                {/* AI Generate Banner */}
                <div style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: 16,
                  padding: '20px 24px',
                  marginBottom: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                      width: 48,
                      height: 48,
                      background: 'rgba(255,255,255,0.2)',
                      borderRadius: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 24
                    }}>
                      🤖
                    </div>
                    <div>
                      <h4 style={{ color: 'white', margin: 0, fontSize: 16, fontWeight: 600 }}>AI-Powered Job Description</h4>
                      <p style={{ color: 'rgba(255,255,255,0.8)', margin: '4px 0 0', fontSize: 13 }}>
                        Enter a job title and let AI generate the complete job description for you
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={generateJobDescriptionAI}
                    disabled={isGeneratingJD || !jobForm.title.trim()}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '12px 24px',
                      background: 'white',
                      color: '#667eea',
                      border: 'none',
                      borderRadius: 12,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: isGeneratingJD || !jobForm.title.trim() ? 'not-allowed' : 'pointer',
                      opacity: !jobForm.title.trim() ? 0.6 : 1,
                      transition: 'all 0.2s',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                    }}
                  >
                    {isGeneratingJD ? (
                      <>
                        <span style={{
                          display: 'inline-block',
                          width: 16,
                          height: 16,
                          border: '2px solid rgba(102,126,234,0.3)',
                          borderTopColor: '#667eea',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }} />
                        Generating...
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: 18 }}>✨</span>
                        Generate with AI
                      </>
                    )}
                  </button>
                </div>

                {/* Section 1: Basic Information */}
                <div style={{
                  background: '#f8fafc',
                  borderRadius: 16,
                  padding: 24,
                  marginBottom: 24
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: 14,
                      fontWeight: 700
                    }}>1</div>
                    <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', margin: 0 }}>Basic Information</h3>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ ...styles.label, fontSize: 13, fontWeight: 600, color: '#475569' }}>Job Title *</label>
                      <input
                        value={jobForm.title}
                        onChange={e => setJobForm({...jobForm, title: e.target.value})}
                        placeholder="e.g. Senior Machine Learning Engineer"
                        style={{
                          ...styles.input,
                          padding: '14px 16px',
                          fontSize: 15,
                          borderRadius: 12,
                          border: '2px solid #e2e8f0',
                          transition: 'border-color 0.2s'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ ...styles.label, fontSize: 13, fontWeight: 600, color: '#475569' }}>Department *</label>
                      <select
                        value={jobForm.dept}
                        onChange={e => setJobForm({...jobForm, dept: e.target.value})}
                        style={{
                          ...styles.input,
                          padding: '14px 16px',
                          fontSize: 14,
                          borderRadius: 12,
                          border: '2px solid #e2e8f0'
                        }}
                      >
                        {departments.filter(d => d.active).map(dept => (
                          <option key={dept.id} value={dept.name}>{dept.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ ...styles.label, fontSize: 13, fontWeight: 600, color: '#475569' }}>Location *</label>
                      <input
                        value={jobForm.location}
                        onChange={e => setJobForm({...jobForm, location: e.target.value})}
                        placeholder="e.g. Bangalore, India"
                        style={{
                          ...styles.input,
                          padding: '14px 16px',
                          fontSize: 14,
                          borderRadius: 12,
                          border: '2px solid #e2e8f0'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ ...styles.label, fontSize: 13, fontWeight: 600, color: '#475569' }}>Role Type *</label>
                      <select
                        value={jobForm.roleType}
                        onChange={e => setJobForm({...jobForm, roleType: e.target.value})}
                        style={{
                          ...styles.input,
                          padding: '14px 16px',
                          fontSize: 14,
                          borderRadius: 12,
                          border: '2px solid #e2e8f0'
                        }}
                      >
                        {roleTypes.filter(r => r.active).map(type => (
                          <option key={type.id} value={type.name}>{type.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ ...styles.label, fontSize: 13, fontWeight: 600, color: '#475569' }}>Work Setup *</label>
                      <select
                        value={jobForm.workSetup}
                        onChange={e => setJobForm({...jobForm, workSetup: e.target.value})}
                        style={{
                          ...styles.input,
                          padding: '14px 16px',
                          fontSize: 14,
                          borderRadius: 12,
                          border: '2px solid #e2e8f0'
                        }}
                      >
                        {workSetups.filter(w => w.active).map(setup => (
                          <option key={setup.id} value={setup.name}>{setup.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ ...styles.label, fontSize: 13, fontWeight: 600, color: '#475569' }}>Salary Range (INR/LPA)</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <input
                          type="number"
                          value={jobForm.salaryMin}
                          onChange={e => setJobForm({...jobForm, salaryMin: e.target.value})}
                          placeholder="Min"
                          style={{
                            ...styles.input,
                            padding: '14px 16px',
                            fontSize: 14,
                            borderRadius: 12,
                            border: '2px solid #e2e8f0'
                          }}
                        />
                        <input
                          type="number"
                          value={jobForm.salaryMax}
                          onChange={e => setJobForm({...jobForm, salaryMax: e.target.value})}
                          placeholder="Max"
                          style={{
                            ...styles.input,
                            padding: '14px 16px',
                            fontSize: 14,
                            borderRadius: 12,
                            border: '2px solid #e2e8f0'
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ ...styles.label, fontSize: 13, fontWeight: 600, color: '#475569' }}>Experience (Years)</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <input
                          type="number"
                          value={jobForm.experienceMin}
                          onChange={e => setJobForm({...jobForm, experienceMin: e.target.value})}
                          placeholder="Min"
                          style={{
                            ...styles.input,
                            padding: '14px 16px',
                            fontSize: 14,
                            borderRadius: 12,
                            border: '2px solid #e2e8f0'
                          }}
                        />
                        <input
                          type="number"
                          value={jobForm.experienceMax}
                          onChange={e => setJobForm({...jobForm, experienceMax: e.target.value})}
                          placeholder="Max"
                          style={{
                            ...styles.input,
                            padding: '14px 16px',
                            fontSize: 14,
                            borderRadius: 12,
                            border: '2px solid #e2e8f0'
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ ...styles.label, fontSize: 13, fontWeight: 600, color: '#475569' }}>Application Deadline</label>
                      <input
                        type="date"
                        value={jobForm.applicationDeadline}
                        onChange={e => setJobForm({...jobForm, applicationDeadline: e.target.value})}
                        style={{
                          ...styles.input,
                          padding: '14px 16px',
                          fontSize: 14,
                          borderRadius: 12,
                          border: '2px solid #e2e8f0'
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Company & Role Overview */}
                <div style={{
                  background: '#f8fafc',
                  borderRadius: 16,
                  padding: 24,
                  marginBottom: 24
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: 14,
                      fontWeight: 700
                    }}>2</div>
                    <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', margin: 0 }}>Company & Role Overview</h3>
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <label style={{ ...styles.label, fontSize: 13, fontWeight: 600, color: '#475569' }}>About AI Planet</label>
                    <RichTextEditor
                      value={jobForm.aboutCompany || ''}
                      onChange={value => setJobForm({...jobForm, aboutCompany: value})}
                      placeholder="Brief description about your company..."
                    />
                  </div>

                  <div>
                    <label style={{ ...styles.label, fontSize: 13, fontWeight: 600, color: '#475569' }}>Job Overview *</label>
                    <RichTextEditor
                      value={jobForm.jobOverview || ''}
                      onChange={value => setJobForm({...jobForm, jobOverview: value})}
                      placeholder="Brief overview of the role and its impact..."
                    />
                  </div>
                </div>

                {/* Section 3: Responsibilities & Requirements */}
                <div style={{
                  background: '#f8fafc',
                  borderRadius: 16,
                  padding: 24,
                  marginBottom: 24
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: 14,
                      fontWeight: 700
                    }}>3</div>
                    <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', margin: 0 }}>Responsibilities & Requirements</h3>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <div>
                      <label style={{ ...styles.label, fontSize: 13, fontWeight: 600, color: '#475569' }}>Key Responsibilities *</label>
                      <RichTextEditor
                        value={jobForm.keyResponsibilities || ''}
                        onChange={value => setJobForm({...jobForm, keyResponsibilities: value})}
                        placeholder="List the key responsibilities..."
                      />
                    </div>

                    <div>
                      <label style={{ ...styles.label, fontSize: 13, fontWeight: 600, color: '#475569' }}>Required Qualifications *</label>
                      <RichTextEditor
                        value={jobForm.qualifications || ''}
                        onChange={value => setJobForm({...jobForm, qualifications: value})}
                        placeholder="B.Tech/M.Tech, experience requirements..."
                      />
                    </div>

                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ ...styles.label, fontSize: 13, fontWeight: 600, color: '#475569' }}>Preferred Qualifications</label>
                      <RichTextEditor
                        value={jobForm.preferredQualifications || ''}
                        onChange={value => setJobForm({...jobForm, preferredQualifications: value})}
                        placeholder="Nice-to-have qualifications..."
                      />
                    </div>
                  </div>
                </div>

                {/* Section 4: Skills & Benefits */}
                <div style={{
                  background: '#f8fafc',
                  borderRadius: 16,
                  padding: 24,
                  marginBottom: 24
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: 14,
                      fontWeight: 700
                    }}>4</div>
                    <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', margin: 0 }}>Skills & Benefits</h3>
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <label style={{ ...styles.label, fontSize: 13, fontWeight: 600, color: '#475569' }}>Required Skills</label>
                    <input
                      value={jobForm.skills}
                      onChange={e => setJobForm({...jobForm, skills: e.target.value})}
                      placeholder="e.g. Python, TensorFlow, PyTorch, LLMs, RAG, AWS"
                      style={{
                        ...styles.input,
                        padding: '14px 16px',
                        fontSize: 14,
                        borderRadius: 12,
                        border: '2px solid #e2e8f0'
                      }}
                    />
                    <p style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>Separate skills with commas</p>
                  </div>

                  <div>
                    <label style={{ ...styles.label, fontSize: 13, fontWeight: 600, color: '#475569' }}>Benefits & Perks</label>
                    <RichTextEditor
                      value={jobForm.benefits || ''}
                      onChange={value => setJobForm({...jobForm, benefits: value})}
                      placeholder="Health insurance, ESOPs, flexible hours..."
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  onClick={selectedJobForEdit ? editJob : createJob}
                  style={{
                    width: '100%',
                    padding: '16px 24px',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 12,
                    fontSize: 16,
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
                    transition: 'all 0.2s'
                  }}
                >
                  {selectedJobForEdit ? '✓ Update Job Opening' : '+ Create Job Opening'}
                </button>
              </div>
            )}

            {modal === 'person' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {/* Full Name */}
                  <div>
                    <label style={styles.label}>Full Name *</label>
                    <input
                      value={candidateForm.name}
                      onChange={e => setCandidateForm({...candidateForm, name: e.target.value})}
                      placeholder="Enter full name"
                      style={styles.input}
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label style={styles.label}>Email Address *</label>
                    <input
                      type="email"
                      value={candidateForm.email}
                      onChange={e => setCandidateForm({...candidateForm, email: e.target.value})}
                      placeholder="email@example.com"
                      style={styles.input}
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label style={styles.label}>Phone Number</label>
                    <input
                      type="tel"
                      value={candidateForm.phone}
                      onChange={e => setCandidateForm({...candidateForm, phone: e.target.value})}
                      placeholder="+1 (555) 123-4567"
                      style={styles.input}
                    />
                  </div>

                  {/* Graduation Year */}
                  <div>
                    <label style={styles.label}>Graduation Year *</label>
                    <select
                      value={candidateForm.graduationYear}
                      onChange={e => setCandidateForm({...candidateForm, graduationYear: e.target.value})}
                      style={styles.input}
                    >
                      <option value="">Select graduation year</option>
                      <option value={`before-${graduationYearRange.fromYear}`}>Before {graduationYearRange.fromYear}</option>
                      {Array.from(
                        { length: graduationYearRange.toYear - graduationYearRange.fromYear + 1 },
                        (_, i) => graduationYearRange.fromYear + i
                      ).map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                      <option value={`after-${graduationYearRange.toYear}`}>After {graduationYearRange.toYear}</option>
                    </select>
                  </div>

                  {/* Job Opening */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={styles.label}>Job Opening *</label>
                    <select
                      value={candidateForm.job}
                      onChange={e => setCandidateForm({...candidateForm, job: e.target.value})}
                      style={styles.input}
                    >
                      <option value="">Select a job</option>
                      {openings.filter(j => j.on).map(j => <option key={j.id} value={j.name}>{j.name}</option>)}
                    </select>
                  </div>

                  {/* Resume Upload */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={styles.label}>Resume * (PDF or Word, max 5MB)</label>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={e => {
                        const file = e.target.files[0];
                        if (file) {
                          if (file.size > 5 * 1024 * 1024) {
                            pop('Resume file size must be less than 5MB');
                            e.target.value = '';
                            return;
                          }
                          setCandidateForm({...candidateForm, resume: file});
                        }
                      }}
                      style={{ ...styles.input, padding: 12, cursor: 'pointer' }}
                    />
                    {candidateForm.resume && (
                      <div style={{ marginTop: 8, fontSize: 14, color: '#059669', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>Resume uploaded: {candidateForm.resume.name}</span>
                      </div>
                    )}
                  </div>

                  {/* Availability */}
                  <div>
                    <label style={styles.label}>Availability *</label>
                    <select
                      value={candidateForm.availability}
                      onChange={e => setCandidateForm({...candidateForm, availability: e.target.value})}
                      style={styles.input}
                    >
                      <option value="immediately">Immediately Available</option>
                      <option value="notice">Currently Serving Notice Period</option>
                    </select>
                  </div>

                  {/* Notice Period */}
                  {candidateForm.availability === 'notice' && (
                    <div>
                      <label style={styles.label}>Notice Period</label>
                      <input
                        value={candidateForm.noticePeriod}
                        onChange={e => setCandidateForm({...candidateForm, noticePeriod: e.target.value})}
                        placeholder="e.g., 30 days, 2 months"
                        style={styles.input}
                      />
                    </div>
                  )}

                  {/* Referral Source */}
                  <div style={{ gridColumn: candidateForm.availability === 'notice' ? '1' : '1 / -1' }}>
                    <label style={styles.label}>How did they hear about us? *</label>
                    <select
                      value={candidateForm.referralSource}
                      onChange={e => setCandidateForm({...candidateForm, referralSource: e.target.value})}
                      style={styles.input}
                    >
                      <option value="">Select an option</option>
                      {referralSources.map(source => (
                        <option key={source} value={source}>{source}</option>
                      ))}
                    </select>
                  </div>

                  {/* Motivation */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={styles.label}>Why do they want to work with us? *</label>
                    <textarea
                      value={candidateForm.motivation}
                      onChange={e => setCandidateForm({...candidateForm, motivation: e.target.value})}
                      placeholder="Candidate's motivation for applying..."
                      rows={3}
                      style={{ ...styles.input, resize: 'vertical', fontFamily: 'inherit' }}
                    />
                  </div>

                  {/* LinkedIn */}
                  <div>
                    <label style={styles.label}>LinkedIn Profile</label>
                    <input
                      value={candidateForm.linkedIn}
                      onChange={e => setCandidateForm({...candidateForm, linkedIn: e.target.value})}
                      placeholder="linkedin.com/in/profile"
                      style={styles.input}
                    />
                  </div>

                  {/* GitHub / Portfolio */}
                  <div>
                    <label style={styles.label}>GitHub / Portfolio</label>
                    <input
                      value={candidateForm.github}
                      onChange={e => setCandidateForm({...candidateForm, github: e.target.value})}
                      placeholder="github.com/profile or portfolio URL"
                      style={styles.input}
                    />
                  </div>
                </div>

                <button
                  onClick={addCandidate}
                  style={{ ...styles.btn1, width: '100%', marginTop: 24 }}
                >
                  Add Candidate
                </button>
              </>
            )}

            {modal === 'createAdmin' && (
              <>
                <div style={{ marginBottom: 20 }}>
                  <label style={styles.label}>Full Name *</label>
                  <input
                    value={adminForm.name}
                    onChange={e => setAdminForm({...adminForm, name: e.target.value})}
                    placeholder="John Doe"
                    style={styles.input}
                  />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={styles.label}>Email *</label>
                  <input
                    type="email"
                    value={adminForm.email}
                    onChange={e => setAdminForm({...adminForm, email: e.target.value})}
                    placeholder="john@company.com"
                    style={styles.input}
                  />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={styles.label}>Role *</label>
                  <select
                    value={adminForm.role}
                    onChange={e => setAdminForm({...adminForm, role: e.target.value})}
                    style={styles.input}
                  >
                    {userRoles.map(role => (
                      <option key={role.id} value={role.name}>{role.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ marginBottom: 28 }}>
                  <label style={styles.label}>Temporary Password *</label>
                  <input
                    type="password"
                    value={adminForm.password}
                    onChange={e => setAdminForm({...adminForm, password: e.target.value})}
                    placeholder="Min 6 characters"
                    style={styles.input}
                  />
                </div>
                <button onClick={createAdmin} style={{ ...styles.btn1, width: '100%' }}>Create Admin</button>
              </>
            )}

            {modal === 'editAdmin' && selectedAdmin && (
              <>
                <div style={{ marginBottom: 20 }}>
                  <label style={styles.label}>Full Name</label>
                  <input
                    value={selectedAdmin.name}
                    onChange={e => setSelectedAdmin({...selectedAdmin, name: e.target.value})}
                    style={styles.input}
                  />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={styles.label}>Email</label>
                  <input
                    type="email"
                    value={selectedAdmin.email}
                    disabled
                    style={{
                      ...styles.input,
                      background: '#f1f5f9',
                      color: '#64748b',
                      cursor: 'not-allowed'
                    }}
                  />
                  <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Email cannot be changed</p>
                </div>
                <div style={{ marginBottom: 28 }}>
                  <label style={styles.label}>Role</label>
                  <select
                    value={selectedAdmin.role}
                    onChange={e => setSelectedAdmin({...selectedAdmin, role: e.target.value})}
                    style={styles.input}
                    disabled={selectedAdmin.id === 1}
                  >
                    {userRoles.map(role => (
                      <option key={role.id} value={role.name}>{role.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={() => {
                      updateAdmin(selectedAdmin.id, { name: selectedAdmin.name, role: selectedAdmin.role });
                    }}
                    style={{ ...styles.btn1, flex: 1 }}
                  >
                    Save Changes
                  </button>
                  {selectedAdmin.id !== 1 && (
                    <button
                      onClick={() => updateAdminStatus(selectedAdmin.id, selectedAdmin.status === 'Active' ? 'Inactive' : 'Active')}
                      style={{
                        ...styles.btn2,
                        background: selectedAdmin.status === 'Active' ? '#fef2f2' : '#ecfdf5',
                        color: selectedAdmin.status === 'Active' ? '#ef4444' : '#059669',
                        border: 'none'
                      }}
                    >
                      {selectedAdmin.status === 'Active' ? '⏸️ Deactivate' : '▶️ Activate'}
                    </button>
                  )}
                </div>
              </>
            )}

            {modal === 'changePassword' && (
              <>
                <div style={{ marginBottom: 20 }}>
                  <label style={styles.label}>Current Password *</label>
                  <input
                    type="password"
                    value={passwordForm.current}
                    onChange={e => setPasswordForm({...passwordForm, current: e.target.value})}
                    placeholder="Enter current password"
                    style={styles.input}
                  />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={styles.label}>New Password *</label>
                  <input
                    type="password"
                    value={passwordForm.new}
                    onChange={e => setPasswordForm({...passwordForm, new: e.target.value})}
                    placeholder="Min 6 characters"
                    style={styles.input}
                  />
                </div>
                <div style={{ marginBottom: 28 }}>
                  <label style={styles.label}>Confirm New Password *</label>
                  <input
                    type="password"
                    value={passwordForm.confirm}
                    onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})}
                    placeholder="Re-enter new password"
                    style={styles.input}
                  />
                </div>
                <button onClick={updatePassword} style={{ ...styles.btn1, width: '100%' }}>Update Password</button>
              </>
            )}

            {modal === 'resetPassword' && selectedAdmin && (
              <>
                <p style={{ color: '#64748b', marginBottom: 24 }}>
                  Are you sure you want to reset the password for <strong>{selectedAdmin.name}</strong>?
                  A password reset link will be sent to <strong>{selectedAdmin.email}</strong>.
                </p>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={() => resetAdminPassword(selectedAdmin.id)}
                    style={{ ...styles.btn1, flex: 1 }}
                  >
                    Send Reset Link
                  </button>
                  <button
                    onClick={() => setModal(null)}
                    style={{ ...styles.btn2, flex: 1 }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}

            {modal === 'jobDetails' && selectedJob && (
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
                {/* Main Content */}
                <div>
                  <div style={{ marginBottom: 24 }}>
                    <h3 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>{selectedJob.name}</h3>
                    <div style={{ display: 'flex', gap: 16, color: '#64748b', fontSize: 14, marginBottom: 16 }}>
                      <span>🏢 {selectedJob.team}</span>
                      <span>📍 {selectedJob.place}</span>
                      <span>💼 {selectedJob.roleType}</span>
                      <span>🏠 {selectedJob.workSetup}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span style={{
                        padding: '6px 14px',
                        borderRadius: 20,
                        background: selectedJob.on ? '#ecfdf5' : '#fef2f2',
                        color: selectedJob.on ? '#059669' : '#dc2626',
                        fontSize: 13,
                        fontWeight: 600
                      }}>
                        {selectedJob.on ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  {selectedJob.aboutCompany && (
                    <div style={{ marginBottom: 24 }}>
                      <h4 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', marginBottom: 12 }}>About the Company</h4>
                      <div
                        className="html-content"
                        style={{ color: '#475569', lineHeight: 1.6 }}
                        dangerouslySetInnerHTML={{ __html: selectedJob.aboutCompany }}
                      />
                    </div>
                  )}

                  {selectedJob.jobOverview && (
                    <div style={{ marginBottom: 24 }}>
                      <h4 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', marginBottom: 12 }}>Job Overview</h4>
                      <div
                        className="html-content"
                        style={{ color: '#475569', lineHeight: 1.6 }}
                        dangerouslySetInnerHTML={{ __html: selectedJob.jobOverview }}
                      />
                    </div>
                  )}

                  {selectedJob.keyResponsibilities && (
                    <div style={{ marginBottom: 24 }}>
                      <h4 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', marginBottom: 12 }}>Key Responsibilities</h4>
                      <div
                        className="html-content"
                        style={{ color: '#475569', lineHeight: 1.6 }}
                        dangerouslySetInnerHTML={{ __html: selectedJob.keyResponsibilities }}
                      />
                    </div>
                  )}

                  {selectedJob.qualifications && (
                    <div style={{ marginBottom: 24 }}>
                      <h4 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', marginBottom: 12 }}>Required Qualifications</h4>
                      <div
                        className="html-content"
                        style={{ color: '#475569', lineHeight: 1.6 }}
                        dangerouslySetInnerHTML={{ __html: selectedJob.qualifications }}
                      />
                    </div>
                  )}

                  {selectedJob.preferredQualifications && (
                    <div style={{ marginBottom: 24 }}>
                      <h4 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', marginBottom: 12 }}>Preferred Qualifications</h4>
                      <div
                        className="html-content"
                        style={{ color: '#475569', lineHeight: 1.6 }}
                        dangerouslySetInnerHTML={{ __html: selectedJob.preferredQualifications }}
                      />
                    </div>
                  )}

                  {selectedJob.skills && (
                    <div style={{ marginBottom: 24 }}>
                      <h4 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', marginBottom: 12 }}>Required Skills</h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {selectedJob.skills.split(',').map((skill, idx) => (
                          <span
                            key={idx}
                            style={{
                              padding: '6px 12px',
                              background: '#f1f5f9',
                              color: '#475569',
                              borderRadius: 8,
                              fontSize: 13,
                              fontWeight: 500
                            }}
                          >
                            {skill.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedJob.benefits && (
                    <div style={{ marginBottom: 24 }}>
                      <h4 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', marginBottom: 12 }}>Benefits</h4>
                      <div
                        className="html-content"
                        style={{ color: '#475569', lineHeight: 1.6 }}
                        dangerouslySetInnerHTML={{ __html: selectedJob.benefits }}
                      />
                    </div>
                  )}
                </div>

                {/* Sidebar */}
                <div>
                  <div style={{ ...styles.box, padding: 20 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 600, color: '#64748b', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.5 }}>Job Details</h4>

                    {selectedJob.salaryMin && selectedJob.salaryMax && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Salary Range</div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>
                          ₹{parseInt(selectedJob.salaryMin).toLocaleString('en-IN')} - ₹{parseInt(selectedJob.salaryMax).toLocaleString('en-IN')} LPA
                        </div>
                      </div>
                    )}

                    {selectedJob.experienceMin && selectedJob.experienceMax && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Experience</div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>
                          {selectedJob.experienceMin} - {selectedJob.experienceMax} years
                        </div>
                      </div>
                    )}

                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Applications</div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>{selectedJob.count}</div>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Good Matches</div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#10b981' }}>{selectedJob.good}</div>
                    </div>

                    {selectedJob.applicationDeadline && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Application Deadline</div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>
                          {new Date(selectedJob.applicationDeadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Apply for Job Button & Share Link */}
                  <div style={{ ...styles.box, padding: 20, marginTop: 16 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 600, color: '#64748b', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.5 }}>Share Job</h4>

                    {/* Application Link */}
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ fontSize: 12, color: '#64748b', marginBottom: 6, display: 'block' }}>Application Link</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          readOnly
                          value={getJobUrl(selectedJob)}
                          style={{
                            flex: 1,
                            padding: '10px 12px',
                            border: '1px solid #e2e8f0',
                            borderRadius: 8,
                            fontSize: 13,
                            background: '#f8fafc',
                            color: '#475569',
                            fontFamily: 'monospace'
                          }}
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(getJobUrl(selectedJob));
                            pop('📋 Application link copied to clipboard!');
                          }}
                          style={{
                            padding: '10px 16px',
                            background: '#0891b2',
                            color: 'white',
                            border: 'none',
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          📋 Copy
                        </button>
                      </div>
                    </div>

                    {/* Apply Button */}
                    <button
                      onClick={() => {
                        // Open application form in new tab
                        window.open(getJobUrl(selectedJob), '_blank');
                      }}
                      style={{
                        width: '100%',
                        padding: '14px 20px',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 10,
                        fontSize: 15,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                      onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      📝 Apply for this Job
                    </button>
                  </div>
                </div>
              </div>
            )}

            {modal === 'candidateDetails' && selectedCandidate && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '75vh', overflow: 'hidden' }}>
                {/* Compact Header with Key Info */}
                <div style={{
                  display: 'flex',
                  gap: 16,
                  paddingBottom: 16,
                  borderBottom: '2px solid #f1f5f9',
                  flexShrink: 0
                }}>
                  {/* Left: Avatar + Basic Info */}
                  <div style={{ display: 'flex', gap: 14, flex: 1 }}>
                    <div style={{
                      width: 56,
                      height: 56,
                      background: selectedCandidate.isHotApplicant
                        ? 'linear-gradient(135deg, #f59e0b, #ef4444)'
                        : 'linear-gradient(135deg, #44924c, #2d6a33)',
                      borderRadius: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: 20,
                      fontWeight: 700,
                      flexShrink: 0
                    }}>
                      {selectedCandidate.isHotApplicant && <span style={{ position: 'absolute', top: -4, right: -4, fontSize: 14 }}>🔥</span>}
                      {init(selectedCandidate.name)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {selectedCandidate.name}
                        </h2>
                        {selectedCandidate.referenceNumber && (
                          <span style={{ padding: '2px 6px', background: '#f0fdf4', color: '#16a34a', borderRadius: 4, fontSize: 10, fontFamily: 'monospace', fontWeight: 600 }}>
                            {selectedCandidate.referenceNumber}
                          </span>
                        )}
                      </div>
                      <p style={{ color: '#64748b', margin: '0 0 6px', fontSize: 13 }}>{selectedCandidate.role}</p>
                      <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#64748b', flexWrap: 'wrap' }}>
                        <span>📧 {selectedCandidate.email}</span>
                        {selectedCandidate.phone && <span>📞 {selectedCandidate.phone}</span>}
                        {selectedCandidate.location && <span>📍 {selectedCandidate.location}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Right: Key Stats & Score */}
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexShrink: 0 }}>
                    {/* AI Score */}
                    <div style={{
                      textAlign: 'center',
                      padding: '8px 16px',
                      background: 'linear-gradient(135deg, #f0f9ff, #faf5ff)',
                      borderRadius: 10,
                      border: '1px solid #e0e7ff'
                    }}>
                      <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>AI Score</div>
                      <div style={{
                        fontSize: 24,
                        fontWeight: 700,
                        color: selectedCandidate.aiScore >= 90 ? '#10b981' : selectedCandidate.aiScore >= 80 ? '#0ea5e9' : '#f59e0b'
                      }}>
                        {selectedCandidate.aiScore || '—'}
                      </div>
                    </div>
                    {/* Stage */}
                    <div style={{
                      textAlign: 'center',
                      padding: '8px 16px',
                      background: (stages.find(s => s.id === selectedCandidate.stage)?.color || '#64748b') + '15',
                      borderRadius: 10,
                      border: `1px solid ${(stages.find(s => s.id === selectedCandidate.stage)?.color || '#64748b')}40`
                    }}>
                      <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>Stage</div>
                      <div style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: stages.find(s => s.id === selectedCandidate.stage)?.color || '#64748b'
                      }}>
                        {stages.find(s => s.id === selectedCandidate.stage)?.icon} {stages.find(s => s.id === selectedCandidate.stage)?.name}
                      </div>
                    </div>
                    {/* Days */}
                    <div style={{
                      textAlign: 'center',
                      padding: '8px 16px',
                      background: '#f8fafc',
                      borderRadius: 10,
                      border: '1px solid #e2e8f0'
                    }}>
                      <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>In Stage</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>
                        {selectedCandidate.daysInStage || 0}d
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tab Navigation */}
                <div style={{
                  display: 'flex',
                  gap: 4,
                  padding: '12px 0',
                  borderBottom: '1px solid #e2e8f0',
                  flexShrink: 0
                }}>
                  {[
                    { id: 'overview', label: 'Overview', icon: '📋' },
                    { id: 'journey', label: 'Journey', icon: '🛤️' },
                    { id: 'comments', label: `Comments ${selectedCandidate.comments?.length ? `(${selectedCandidate.comments.length})` : ''}`, icon: '💬' },
                    { id: 'actions', label: 'Actions', icon: '⚡' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setCandidateDetailTab(tab.id)}
                      style={{
                        padding: '8px 16px',
                        background: candidateDetailTab === tab.id ? '#44924c' : 'transparent',
                        color: candidateDetailTab === tab.id ? 'white' : '#64748b',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        transition: 'all 0.2s'
                      }}
                    >
                      {tab.icon} {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab Content - Scrollable */}
                <div style={{ flex: 1, overflow: 'auto', paddingTop: 16 }}>
                  {/* Overview Tab */}
                  {candidateDetailTab === 'overview' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      {/* Left Column */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* AI Analysis */}
                        <div style={{
                          background: 'linear-gradient(135deg, #f0f9ff, #faf5ff)',
                          padding: 16,
                          borderRadius: 12,
                          border: '1px solid #e0e7ff'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                            <span style={{ fontSize: 18 }}>🤖</span>
                            <span style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>AI Analysis</span>
                            <button
                              onClick={() => runAIScore(selectedCandidate)}
                              disabled={isRunningAIScore}
                              style={{
                                marginLeft: 'auto',
                                padding: '6px 12px',
                                background: isRunningAIScore ? '#94a3b8' : 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                                color: 'white',
                                border: 'none',
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: isRunningAIScore ? 'wait' : 'pointer'
                              }}
                            >
                              {isRunningAIScore ? '⏳ Analyzing...' : '✨ Re-score'}
                            </button>
                          </div>
                          <p style={{ color: '#475569', lineHeight: 1.5, margin: 0, fontSize: 13 }}>
                            {selectedCandidate.aiReason || 'No AI analysis available. Click Re-score to analyze.'}
                          </p>
                        </div>

                        {/* Application Details */}
                        <div style={{ ...styles.box, padding: 16 }}>
                          <h4 style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Application Details
                          </h4>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div>
                              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>Applied</div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{selectedCandidate.appliedDate}</div>
                            </div>
                            {selectedCandidate.graduationYear && (
                              <div>
                                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>Graduation</div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{selectedCandidate.graduationYear}</div>
                              </div>
                            )}
                            <div>
                              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>Availability</div>
                              <span style={{
                                padding: '3px 8px',
                                background: selectedCandidate.availability === 'immediately' ? '#f0fdf4' : '#fef3c7',
                                color: selectedCandidate.availability === 'immediately' ? '#16a34a' : '#d97706',
                                borderRadius: 4,
                                fontSize: 11,
                                fontWeight: 600
                              }}>
                                {selectedCandidate.availability === 'immediately' ? 'Immediate' : selectedCandidate.noticePeriod || 'Notice Period'}
                              </span>
                            </div>
                            {selectedCandidate.referralSource && (
                              <div>
                                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>Source</div>
                                <span style={{ padding: '3px 8px', background: '#eff6ff', color: '#2563eb', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                                  {selectedCandidate.referralSource}
                                </span>
                              </div>
                            )}
                            <div>
                              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>Profile</div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{selectedCandidate.profileStrength || 'Good'}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>Total Days</div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{selectedCandidate.totalDays || 0} days</div>
                            </div>
                          </div>
                        </div>

                        {/* Motivation */}
                        {selectedCandidate.motivation && (
                          <div style={{ ...styles.box, padding: 16 }}>
                            <h4 style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                              Why They Want to Join
                            </h4>
                            <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, margin: 0 }}>
                              {selectedCandidate.motivation}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Right Column */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Documents & Links */}
                        <div style={{ ...styles.box, padding: 16 }}>
                          <h4 style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Documents & Links
                          </h4>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {(selectedCandidate.resumeUrl || selectedCandidate.resume) && (
                              <button
                                onClick={async (e) => {
                                  e.preventDefault();
                                  if (!selectedCandidate.resumeUrl) {
                                    pop(`Resume: ${selectedCandidate.resume}`);
                                    return;
                                  }
                                  try {
                                    pop('Loading resume...');
                                    const signedUrl = await uploadAPI.getSignedUrl(selectedCandidate.resumeUrl);
                                    window.open(signedUrl, '_blank');
                                  } catch (error) {
                                    console.error('Error getting resume URL:', error);
                                    pop('Failed to load resume.');
                                  }
                                }}
                                style={{
                                  padding: '8px 14px',
                                  background: '#f0fdf4',
                                  color: '#16a34a',
                                  border: '1px solid #bbf7d0',
                                  borderRadius: 8,
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6
                                }}
                              >
                                📄 Resume
                              </button>
                            )}
                            {selectedCandidate.linkedIn && (
                              <a
                                href={selectedCandidate.linkedIn.startsWith('http') ? selectedCandidate.linkedIn : `https://${selectedCandidate.linkedIn}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  padding: '8px 14px',
                                  background: '#eff6ff',
                                  color: '#2563eb',
                                  border: '1px solid #bfdbfe',
                                  borderRadius: 8,
                                  fontSize: 12,
                                  fontWeight: 600,
                                  textDecoration: 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6
                                }}
                              >
                                🔗 LinkedIn
                              </a>
                            )}
                            {selectedCandidate.portfolio && (
                              <a
                                href={selectedCandidate.portfolio.startsWith('http') ? selectedCandidate.portfolio : `https://${selectedCandidate.portfolio}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  padding: '8px 14px',
                                  background: '#faf5ff',
                                  color: '#7c3aed',
                                  border: '1px solid #e9d5ff',
                                  borderRadius: 8,
                                  fontSize: 12,
                                  fontWeight: 600,
                                  textDecoration: 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6
                                }}
                              >
                                🌐 Portfolio
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Skills */}
                        {selectedCandidate.tags && selectedCandidate.tags.length > 0 && (
                          <div style={{ ...styles.box, padding: 16 }}>
                            <h4 style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                              Skills
                            </h4>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {selectedCandidate.tags.map(tag => (
                                <span key={tag} style={{ padding: '4px 10px', background: '#eff6ff', color: '#2563eb', borderRadius: 6, fontSize: 11, fontWeight: 500 }}>
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Quick Actions */}
                        <div style={{ ...styles.box, padding: 16 }}>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleHotApplicant(selectedCandidate.id);
                                setSelectedCandidate({...selectedCandidate, isHotApplicant: !selectedCandidate.isHotApplicant});
                              }}
                              style={{
                                flex: 1,
                                padding: '10px',
                                background: selectedCandidate.isHotApplicant ? '#fef2f2' : '#fef3c7',
                                color: selectedCandidate.isHotApplicant ? '#dc2626' : '#d97706',
                                border: 'none',
                                borderRadius: 8,
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              {selectedCandidate.isHotApplicant ? '❄️ Remove Hot' : '🔥 Mark Hot'}
                            </button>
                            {selectedCandidate.stage !== 'rejected' && selectedCandidate.stage !== 'hired' && (
                              <button
                                onClick={() => setShowRejectConfirm(true)}
                                style={{
                                  padding: '10px 16px',
                                  background: '#fef2f2',
                                  color: '#ef4444',
                                  border: 'none',
                                  borderRadius: 8,
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                              >
                                ❌ Reject
                              </button>
                            )}
                            {selectedCandidate.stage === 'hired' && (
                              <div style={{
                                padding: '10px 16px',
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                color: 'white',
                                border: 'none',
                                borderRadius: 8,
                                fontSize: 12,
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6
                              }}>
                                ✅ Hired
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Hired Success Banner */}
                        {selectedCandidate.stage === 'hired' && (
                          <div style={{
                            ...styles.box,
                            padding: 20,
                            background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                            border: '2px solid #10b981',
                            textAlign: 'center'
                          }}>
                            <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
                            <h4 style={{ fontSize: 16, fontWeight: 700, color: '#059669', marginBottom: 8 }}>
                              Journey Complete!
                            </h4>
                            <p style={{ fontSize: 13, color: '#047857', margin: 0, lineHeight: 1.5 }}>
                              {selectedCandidate.name} has been successfully hired. Congratulations on finding the right talent!
                            </p>
                          </div>
                        )}

                        {/* Rejection Details */}
                        {selectedCandidate.stage === 'rejected' && selectedCandidate.rejectionReason && (
                          <div style={{
                            ...styles.box,
                            padding: 16,
                            background: '#fef2f2',
                            border: '2px solid #fecaca'
                          }}>
                            <h4 style={{ fontSize: 12, fontWeight: 600, color: '#dc2626', marginBottom: 8, textTransform: 'uppercase' }}>
                              ❌ Rejected
                            </h4>
                            <div style={{ fontSize: 12, color: '#991b1b', marginBottom: 4 }}>{selectedCandidate.rejectionDate}</div>
                            <div style={{ fontSize: 13, color: '#7f1d1d', lineHeight: 1.4 }}>{selectedCandidate.rejectionReason}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Journey Tab */}
                  {candidateDetailTab === 'journey' && (
                    <JourneyTab applicationId={selectedCandidate.id} candidateName={selectedCandidate.name} />
                  )}

                  {/* Comments Tab */}
                  {candidateDetailTab === 'comments' && (
                    <div>
                      {/* Add Comment */}
                      <div style={{ marginBottom: 16, background: '#f8fafc', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                        <textarea
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder="Add a comment or feedback..."
                          style={{ ...styles.input, minHeight: 60, resize: 'vertical', fontFamily: 'inherit', width: '100%', fontSize: 13 }}
                        />
                        <button
                          onClick={async () => {
                            if (!commentText.trim()) { pop('Please enter a comment'); return; }
                            const newComment = {
                              id: Date.now(),
                              text: commentText,
                              author: currentUser?.name || 'Admin',
                              timestamp: new Date().toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
                              stage: selectedCandidate.stage
                            };
                            // Optimistically update UI
                            setPeople(p => p.map(c => c.id === selectedCandidate.id ? { ...c, comments: [...(c.comments || []), newComment] } : c));
                            setSelectedCandidate({
                              ...selectedCandidate,
                              comments: [...(selectedCandidate.comments || []), newComment]
                            });
                            const savedCommentText = commentText;
                            setCommentText('');

                            // Persist to database
                            try {
                              await applicationsAPI.addComment(selectedCandidate.id, {
                                text: savedCommentText,
                                author: currentUser?.name || 'Admin',
                                stage: selectedCandidate.stage
                              });
                              pop('💬 Comment added successfully!');
                            } catch (error) {
                              console.error('Failed to save comment:', error);
                              pop('Comment saved locally but failed to sync to database');
                            }
                          }}
                          style={{ ...styles.btn1, marginTop: 8, width: '100%', justifyContent: 'center', padding: '10px' }}
                        >
                          💬 Add Comment
                        </button>
                      </div>

                      {/* Comments List */}
                      <div style={{ display: 'grid', gap: 10 }}>
                        {selectedCandidate.comments && selectedCandidate.comments.length > 0 ? (
                          selectedCandidate.comments.map(comment => (
                            <div key={comment.id} style={{ padding: 14, background: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #44924c, #2d6a33)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 10, fontWeight: 600 }}>
                                    {comment.author.split(' ').map(n => n[0]).join('')}
                                  </div>
                                  <div>
                                    <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 13 }}>{comment.author}</div>
                                    <div style={{ fontSize: 10, color: '#94a3b8' }}>{comment.timestamp}</div>
                                  </div>
                                </div>
                                <span style={{ padding: '2px 8px', background: (stages.find(s => s.id === comment.stage)?.color || '#64748b') + '20', borderRadius: 4, fontSize: 10, fontWeight: 600, color: stages.find(s => s.id === comment.stage)?.color || '#64748b' }}>
                                  {stages.find(s => s.id === comment.stage)?.name}
                                </span>
                              </div>
                              <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.5 }}>{comment.text}</div>
                            </div>
                          ))
                        ) : (
                          <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8', fontSize: 13, background: '#f8fafc', borderRadius: 10, border: '2px dashed #e2e8f0' }}>
                            No comments yet. Be the first to add feedback!
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions Tab */}
                  {candidateDetailTab === 'actions' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      {/* Show message for rejected/hired candidates */}
                      {(selectedCandidate.stage === 'rejected' || selectedCandidate.stage === 'hired') ? (
                        <div style={{
                          gridColumn: '1 / -1',
                          background: selectedCandidate.stage === 'rejected'
                            ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)'
                            : 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                          border: `2px solid ${selectedCandidate.stage === 'rejected' ? '#fca5a5' : '#86efac'}`,
                          borderRadius: 16,
                          padding: 32,
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: 48, marginBottom: 16 }}>
                            {selectedCandidate.stage === 'rejected' ? '❌' : '🎉'}
                          </div>
                          <h3 style={{
                            fontSize: 20,
                            fontWeight: 700,
                            color: selectedCandidate.stage === 'rejected' ? '#dc2626' : '#16a34a',
                            marginBottom: 8
                          }}>
                            {selectedCandidate.stage === 'rejected' ? 'Application Closed' : 'Journey Complete!'}
                          </h3>
                          <p style={{
                            color: selectedCandidate.stage === 'rejected' ? '#991b1b' : '#166534',
                            fontSize: 14,
                            maxWidth: 400,
                            margin: '0 auto 16px',
                            lineHeight: 1.6
                          }}>
                            {selectedCandidate.stage === 'rejected'
                              ? 'This application has been rejected and is no longer active. No further actions can be taken.'
                              : 'This candidate has been successfully hired! The recruitment journey is complete.'}
                          </p>
                          {selectedCandidate.stage === 'rejected' && selectedCandidate.rejectionReason && (
                            <div style={{
                              background: 'rgba(255,255,255,0.7)',
                              padding: 16,
                              borderRadius: 12,
                              maxWidth: 400,
                              margin: '0 auto'
                            }}>
                              <div style={{ fontSize: 12, color: '#991b1b', fontWeight: 600, marginBottom: 4 }}>
                                Rejection Reason:
                              </div>
                              <div style={{ fontSize: 13, color: '#7f1d1d' }}>
                                {selectedCandidate.rejectionReason}
                              </div>
                            </div>
                          )}
                          <div style={{
                            marginTop: 20,
                            padding: '12px 20px',
                            background: 'rgba(255,255,255,0.5)',
                            borderRadius: 10,
                            display: 'inline-block'
                          }}>
                            <span style={{ color: '#64748b', fontSize: 12 }}>
                              Status: <strong style={{ color: selectedCandidate.stage === 'rejected' ? '#dc2626' : '#16a34a' }}>
                                {selectedCandidate.stage === 'rejected' ? 'Rejected' : 'Hired'}
                              </strong>
                            </span>
                          </div>
                        </div>
                      ) : (
                      <>
                      {/* Stage-specific Actions */}
                      <div style={{ ...styles.box, padding: 16 }}>
                        <h4 style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Stage Actions
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {selectedCandidate.stage === 'shortlisting' && (
                            <>
                              <button
                                onClick={() => { setModal('assignTask'); setAssignedTo(null); setCommentText(''); }}
                                style={{ ...styles.btn1, justifyContent: 'center', padding: '10px' }}
                              >
                                ✅ Shortlist Candidate
                              </button>
                              <button
                                onClick={() => {
                                  setShowScreeningModal(true);
                                  setShowScreeningPreview(false);
                                  setScreeningForm({ date: '', time: '', interviewer: '', interviewerEmail: '', duration: '30', platform: 'Google Meet', meetingLink: '', notes: '', agenda: '' });
                                }}
                                style={{ ...styles.btn2, justifyContent: 'center', padding: '10px' }}
                              >
                                📞 Schedule Screening
                              </button>
                            </>
                          )}
                          {selectedCandidate.stage === 'screening' && (
                            <>
                              <button onClick={() => { setModal('selectAssignment'); fetchAssignmentsForCandidate(selectedCandidate); }} style={{ ...styles.btn1, justifyContent: 'center', padding: '10px' }}>📝 Send Assignment</button>
                              <button
                                onClick={() => {
                                  setShowScreeningModal(true);
                                  setShowScreeningPreview(false);
                                  setScreeningForm({
                                    date: selectedCandidate.screeningCallDate?.split(' ')[0] || '',
                                    time: selectedCandidate.screeningCallDate?.split(' at ')[1] || '',
                                    interviewer: selectedCandidate.screeningInterviewer || '',
                                    interviewerEmail: '',
                                    duration: selectedCandidate.screeningDuration || '30',
                                    platform: selectedCandidate.screeningPlatform || 'Google Meet',
                                    meetingLink: selectedCandidate.screeningMeetingLink || '',
                                    notes: selectedCandidate.screeningNotes || '',
                                    agenda: ''
                                  });
                                }}
                                style={{ ...styles.btn2, justifyContent: 'center', padding: '10px' }}
                              >
                                📞 Reschedule Call
                              </button>
                            </>
                          )}
                          {(selectedCandidate.stage === 'assignment-sent') && (
                            <button
                              onClick={() => pop('📧 Reminder email sent to ' + selectedCandidate.name)}
                              style={{ ...styles.btn2, justifyContent: 'center', padding: '10px' }}
                            >
                              📧 Send Reminder
                            </button>
                          )}
                          {selectedCandidate.stage === 'assignment' && selectedCandidate.assignmentSubmitted && (
                            <button
                              onClick={() => {
                                setInterviewCandidate(selectedCandidate);
                                setShowInterviewModal(true);
                                setInterviewForm({ title: `Interview - ${selectedCandidate.role}`, date: '', time: '', interviewer: '', duration: '60', locationType: 'online', platform: 'Google Meet', meetingLink: '', address: '', notes: '' });
                              }}
                              style={{ ...styles.btn1, justifyContent: 'center', padding: '10px' }}
                            >
                              📅 Schedule Interview
                            </button>
                          )}
                          {selectedCandidate.stage === 'interview' && (() => {
                            const hasScheduledInterview = selectedCandidate.interviewRounds?.some(i => i.status === 'Scheduled');
                            const scheduledInterview = selectedCandidate.interviewRounds?.find(i => i.status === 'Scheduled');
                            const hasCompletedInterviews = selectedCandidate.interviewRounds?.some(i => i.status === 'Completed' || i.status === 'Passed');
                            if (hasScheduledInterview) {
                              return (
                                <div style={{ background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 8, padding: 12 }}>
                                  <div style={{ fontSize: 12, color: '#92400e', fontWeight: 600, marginBottom: 4 }}>⏰ Interview Scheduled</div>
                                  <div style={{ fontSize: 11, color: '#78350f', marginBottom: 8 }}>{scheduledInterview.title} on {new Date(scheduledInterview.date).toLocaleDateString()} at {scheduledInterview.time}</div>
                                  <button onClick={() => { setInterviewCandidate(selectedCandidate); setShowInterviewModal(true); setInterviewForm({ title: scheduledInterview.title, date: scheduledInterview.date, time: scheduledInterview.time, interviewer: scheduledInterview.interviewer, duration: scheduledInterview.duration || '60', locationType: scheduledInterview.locationType || 'online', platform: scheduledInterview.platform || 'Google Meet', meetingLink: scheduledInterview.meetingLink || '', address: scheduledInterview.address || '', notes: scheduledInterview.notes || '', isEditing: true, editingRound: scheduledInterview.round, editingInterviewId: scheduledInterview.id }); }} style={{ ...styles.btn1, padding: '6px 12px', fontSize: 11, background: '#f59e0b', justifyContent: 'center', width: '100%', marginBottom: 8 }}>✏️ Edit Interview</button>
                                  {/* Pass/Fail Interview Buttons */}
                                  <div style={{ display: 'flex', gap: 6 }}>
                                    <button
                                      onClick={() => {
                                        setConfirmInterviewData({ interview: scheduledInterview, candidate: selectedCandidate });
                                        setShowInterviewPassConfirm(true);
                                      }}
                                      style={{ flex: 1, background: '#10b981', color: 'white', border: 'none', padding: '8px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                                    >
                                      ✅ Passed
                                    </button>
                                    <button
                                      onClick={() => {
                                        setConfirmInterviewData({ interview: scheduledInterview, candidate: selectedCandidate });
                                        setShowInterviewFailConfirm(true);
                                      }}
                                      style={{ flex: 1, background: '#ef4444', color: 'white', border: 'none', padding: '8px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                                    >
                                      ❌ Failed
                                    </button>
                                  </div>
                                </div>
                              );
                            }
                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <button onClick={() => { setInterviewCandidate(selectedCandidate); setShowInterviewModal(true); setInterviewForm({ title: `Interview Round ${(selectedCandidate.interviewRounds?.length || 0) + 1} - ${selectedCandidate.role}`, date: '', time: '', interviewer: '', duration: '60', locationType: 'online', platform: 'Google Meet', meetingLink: '', address: '', notes: '', isEditing: false }); }} style={{ ...styles.btn1, justifyContent: 'center', padding: '10px' }}>📅 Schedule Next Round</button>
                                {hasCompletedInterviews && (
                                  <button
                                    onClick={() => {
                                      setOfferCandidate(selectedCandidate);
                                      setOfferForm({
                                        offerType: 'text',
                                        salary: '',
                                        salaryCurrency: 'INR',
                                        bonus: '',
                                        equity: '',
                                        benefits: '',
                                        startDate: '',
                                        expiryDate: '',
                                        offerContent: '',
                                        termsAndConditions: '',
                                        internalNotes: ''
                                      });
                                      setOfferFile(null);
                                      setShowOfferModal(true);
                                    }}
                                    style={{
                                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                      color: 'white',
                                      border: 'none',
                                      padding: '12px 16px',
                                      borderRadius: 10,
                                      fontSize: 14,
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: 8,
                                      boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                                    }}
                                  >
                                    <span>🎉</span> Send Offer
                                  </button>
                                )}
                              </div>
                            );
                          })()}
                          {(selectedCandidate.stage === 'offer-sent' || selectedCandidate.stage === 'offer-accepted') && candidateOffer && (
                            <div style={{
                              background: selectedCandidate.stage === 'offer-accepted'
                                ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'
                                : 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                              border: `2px solid ${selectedCandidate.stage === 'offer-accepted' ? '#22c55e' : '#3b82f6'}`,
                              borderRadius: 16,
                              padding: 0,
                              marginBottom: 16,
                              overflow: 'hidden',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                            }}>
                              {/* Offer Header Banner */}
                              <div style={{
                                background: selectedCandidate.stage === 'offer-accepted'
                                  ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                                  : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                                padding: '16px 20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                  <div style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 12,
                                    background: 'rgba(255,255,255,0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 22
                                  }}>
                                    {selectedCandidate.stage === 'offer-accepted' ? '🎉' : '📋'}
                                  </div>
                                  <div>
                                    <div style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>
                                      {selectedCandidate.stage === 'offer-accepted' ? 'Offer Accepted!' : 'Job Offer'}
                                    </div>
                                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>
                                      {candidateOffer.jobTitle}
                                    </div>
                                  </div>
                                </div>
                                <span style={{
                                  fontSize: 11,
                                  padding: '6px 12px',
                                  borderRadius: 20,
                                  background: 'rgba(255,255,255,0.2)',
                                  color: 'white',
                                  fontWeight: 600,
                                  textTransform: 'uppercase',
                                  letterSpacing: 0.5
                                }}>
                                  {candidateOffer.status}
                                </span>
                              </div>

                              {/* Salary Highlight */}
                              <div style={{
                                padding: '20px',
                                borderBottom: '1px solid rgba(0,0,0,0.06)',
                                textAlign: 'center',
                                background: 'rgba(255,255,255,0.5)'
                              }}>
                                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
                                  Annual Package
                                </div>
                                <div style={{
                                  fontSize: 28,
                                  fontWeight: 800,
                                  color: selectedCandidate.stage === 'offer-accepted' ? '#16a34a' : '#1d4ed8',
                                  letterSpacing: -0.5
                                }}>
                                  {candidateOffer.salaryCurrency === 'USD' ? '$' : candidateOffer.salaryCurrency === 'EUR' ? '€' : candidateOffer.salaryCurrency === 'GBP' ? '£' : '₹'}
                                  {candidateOffer.salary}
                                </div>
                                {candidateOffer.bonus && (
                                  <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                                    + {candidateOffer.bonus} bonus
                                  </div>
                                )}
                              </div>

                              {/* Offer Details Grid */}
                              <div style={{ padding: '16px 20px' }}>
                                <div style={{
                                  display: 'grid',
                                  gridTemplateColumns: '1fr 1fr',
                                  gap: 12,
                                  marginBottom: 16
                                }}>
                                  {candidateOffer.startDate && (
                                    <div style={{
                                      background: 'white',
                                      borderRadius: 10,
                                      padding: 12,
                                      border: '1px solid rgba(0,0,0,0.06)'
                                    }}>
                                      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>Start Date</div>
                                      <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
                                        {new Date(candidateOffer.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                      </div>
                                    </div>
                                  )}
                                  <div style={{
                                    background: 'white',
                                    borderRadius: 10,
                                    padding: 12,
                                    border: '1px solid rgba(0,0,0,0.06)'
                                  }}>
                                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>Sent On</div>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
                                      {candidateOffer.sentAt ? new Date(candidateOffer.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}
                                    </div>
                                  </div>
                                  {candidateOffer.responseDate && (
                                    <div style={{
                                      background: 'white',
                                      borderRadius: 10,
                                      padding: 12,
                                      border: '1px solid rgba(0,0,0,0.06)',
                                      gridColumn: 'span 2'
                                    }}>
                                      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>
                                        {candidateOffer.status === 'accepted' ? 'Accepted On' : 'Response Date'}
                                      </div>
                                      <div style={{ fontSize: 14, fontWeight: 600, color: candidateOffer.status === 'accepted' ? '#16a34a' : '#1e293b' }}>
                                        {new Date(candidateOffer.responseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Benefits Section */}
                                {candidateOffer.benefits && (
                                  <div style={{
                                    background: 'white',
                                    borderRadius: 10,
                                    padding: 12,
                                    border: '1px solid rgba(0,0,0,0.06)',
                                    marginBottom: 12
                                  }}>
                                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>Benefits Package</div>
                                    <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
                                      {candidateOffer.benefits}
                                    </div>
                                  </div>
                                )}

                                {/* Offer Letter File */}
                                {candidateOffer.offerFile?.url && (
                                  <a
                                    href={candidateOffer.offerFile.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 10,
                                      background: 'white',
                                      borderRadius: 10,
                                      padding: 12,
                                      border: '1px solid rgba(0,0,0,0.06)',
                                      marginBottom: 12,
                                      textDecoration: 'none',
                                      transition: 'all 0.2s'
                                    }}
                                  >
                                    <div style={{
                                      width: 40,
                                      height: 40,
                                      borderRadius: 8,
                                      background: '#fef3c7',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: 18
                                    }}>
                                      📄
                                    </div>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                                        {candidateOffer.offerFile.name || 'Offer Letter'}
                                      </div>
                                      <div style={{ fontSize: 11, color: '#64748b' }}>
                                        Click to view or download
                                      </div>
                                    </div>
                                    <div style={{ color: '#3b82f6', fontSize: 18 }}>↗</div>
                                  </a>
                                )}
                              </div>

                              {/* Edit & Resend Buttons - only for offer-sent stage */}
                              {selectedCandidate.stage === 'offer-sent' && (
                                <div style={{
                                  display: 'flex',
                                  gap: 8,
                                  padding: '0 20px 20px',
                                }}>
                                  <button
                                    onClick={() => {
                                      // Pre-populate offer form with existing offer data
                                      setOfferCandidate(selectedCandidate);
                                      setOfferForm({
                                        offerType: candidateOffer.offerType || 'text',
                                        salary: candidateOffer.salary || '',
                                        salaryCurrency: candidateOffer.salaryCurrency || 'INR',
                                        bonus: candidateOffer.bonus || '',
                                        equity: candidateOffer.equity || '',
                                        benefits: candidateOffer.benefits || '',
                                        startDate: candidateOffer.startDate ? new Date(candidateOffer.startDate).toISOString().split('T')[0] : '',
                                        expiryDate: candidateOffer.expiryDate ? new Date(candidateOffer.expiryDate).toISOString().split('T')[0] : '',
                                        offerContent: candidateOffer.offerContent || '',
                                        termsAndConditions: candidateOffer.termsAndConditions || '',
                                        internalNotes: candidateOffer.internalNotes || '',
                                        editingOfferId: candidateOffer.id, // Mark as editing
                                        existingFile: candidateOffer.offerFile || null // Keep track of existing file
                                      });
                                      setOfferFile(null);
                                      setShowOfferModal(true);
                                    }}
                                    style={{
                                      flex: 1,
                                      padding: '12px 16px',
                                      background: 'white',
                                      color: '#f59e0b',
                                      border: '2px solid #f59e0b',
                                      borderRadius: 10,
                                      fontSize: 13,
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: 6,
                                      transition: 'all 0.2s'
                                    }}
                                  >
                                    <span>✏️</span> Edit
                                  </button>
                                  <button
                                    onClick={async () => {
                                      try {
                                        const resendRes = await fetch(`${API_BASE}/offers/${candidateOffer.id}/resend`, { method: 'POST' });
                                        const resendData = await resendRes.json();
                                        if (resendData.success) {
                                          pop('Offer resent to ' + selectedCandidate.name);
                                        } else {
                                          pop(resendData.error || 'Failed to resend offer');
                                        }
                                      } catch (error) {
                                        console.error('Error resending offer:', error);
                                        pop('Failed to resend offer');
                                      }
                                    }}
                                    style={{
                                      flex: 1,
                                      padding: '12px 16px',
                                      background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: 10,
                                      fontSize: 13,
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: 6
                                    }}
                                  >
                                    <span>📧</span> Resend
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                          {selectedCandidate.stage === 'offer-accepted' && (
                            <button
                              onClick={async () => {
                                pop('🎉 Onboarding started for ' + selectedCandidate.name);
                                // Refresh data to get latest state
                                await refreshData(selectedCandidate.id);
                              }}
                              style={{ ...styles.btn1, justifyContent: 'center', padding: '10px' }}
                            >
                              📋 Prepare Onboarding
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Assignment Actions - Show when assignment has been sent, hide when interview is scheduled or offer is sent */}
                      {candidateAssignments.length > 0 && selectedCandidate?.stage !== 'interview' && selectedCandidate?.stage !== 'offer-sent' && selectedCandidate?.stage !== 'offer-accepted' && selectedCandidate?.stage !== 'hired' && (
                        (() => {
                          const assignment = candidateAssignments[0];
                          const isReviewed = assignment.status === 'reviewed' || assignment.status === 'passed';
                          const isFailed = assignment.status === 'failed';

                          // Compact card for reviewed/passed assignments
                          if (isReviewed) {
                            return (
                              <div style={{
                                background: '#f0fdf4',
                                border: '1px solid #86efac',
                                borderRadius: 10,
                                padding: 12,
                                marginBottom: 16
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: 16 }}>✅</span>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: '#166534' }}>Assignment Passed</span>
                                  </div>
                                  {assignment.score && (
                                    <span style={{ fontSize: 12, color: '#f59e0b' }}>{'⭐'.repeat(assignment.score)}</span>
                                  )}
                                </div>
                                <div style={{ fontSize: 12, color: '#475569' }}>
                                  {assignment.assignmentName}
                                  {assignment.reviewedBy && (
                                    <span style={{ color: '#94a3b8' }}> • Reviewed by {assignment.reviewedBy}</span>
                                  )}
                                </div>
                                {/* Schedule Interview Button */}
                                <button
                                  onClick={() => {
                                    setInterviewCandidate(selectedCandidate);
                                    setInterviewForm({
                                      title: `Interview Round ${(selectedCandidate.interviewRounds?.length || 0) + 1}`,
                                      date: '',
                                      time: '',
                                      interviewer: '',
                                      duration: '60',
                                      locationType: 'online',
                                      platform: 'Google Meet',
                                      meetingLink: '',
                                      address: '',
                                      notes: '',
                                      isEditing: false
                                    });
                                    setShowInterviewModal(true);
                                  }}
                                  style={{
                                    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                                    color: 'white',
                                    border: 'none',
                                    padding: '10px 16px',
                                    borderRadius: 8,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    width: '100%',
                                    marginTop: 10,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 6
                                  }}
                                >
                                  📅 Schedule Interview
                                </button>
                              </div>
                            );
                          }

                          // Regular card for pending/failed assignments
                          return (
                            <div style={{
                              ...styles.box,
                              padding: 16,
                              background: isFailed ? '#fef2f2' : '#f0fdf4',
                              border: `2px solid ${isFailed ? '#ef4444' : '#22c55e'}`
                            }}>
                              <h4 style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: isFailed ? '#dc2626' : '#166534',
                                marginBottom: 12,
                                textTransform: 'uppercase',
                                letterSpacing: 0.5
                              }}>
                                {isFailed ? '❌ Assignment Failed' : '📝 Assignment Sent'}
                              </h4>
                              <div style={{ marginBottom: 12 }}>
                                <div style={{ fontSize: 13, color: '#1e293b', marginBottom: 4 }}>
                                  <strong>{assignment.assignmentName}</strong>
                                </div>
                                <div style={{ fontSize: 12, color: '#64748b', display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                                  <span>Status: <strong style={{ textTransform: 'capitalize', color: isFailed ? '#ef4444' : '#f59e0b' }}>{assignment.status}</strong></span>
                                  <span>Sent: {new Date(assignment.sentAt).toLocaleDateString()}</span>
                                </div>
                                {assignment.reviewNotes && (
                                  <div style={{
                                    fontSize: 12,
                                    color: '#475569',
                                    marginTop: 8,
                                    padding: 8,
                                    background: 'rgba(255,255,255,0.5)',
                                    borderRadius: 6,
                                    fontStyle: 'italic'
                                  }}>
                                    "{assignment.reviewNotes}"
                                  </div>
                                )}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {/* Show Mark Completed button only if not already reviewed/passed/failed */}
                                {!['reviewed', 'passed', 'failed'].includes(assignment.status) && (
                                  <button
                                    onClick={() => {
                                      setAssignmentToReview(assignment);
                                      setAssignmentReviewForm({
                                        rating: 0,
                                        feedback: '',
                                        status: 'passed'
                                      });
                                      setShowAssignmentReviewModal(true);
                                    }}
                                    style={{
                                      background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                                      color: 'white',
                                      border: 'none',
                                      padding: '12px 16px',
                                      borderRadius: 10,
                                      fontSize: 14,
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: 8,
                                      boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)'
                                    }}
                                  >
                                    <span>✓</span> Mark Assignment Completed
                                  </button>
                                )}
                                <button
                                  onClick={() => { setModal('selectAssignment'); fetchAssignmentsForCandidate(selectedCandidate); }}
                                  style={{ ...styles.btn2, justifyContent: 'center', padding: '10px' }}
                                >
                                  📝 View / Send Another Assignment
                                </button>
                              </div>
                            </div>
                          );
                        })()
                      )}

                      {/* Move & Final Actions */}
                      <div style={{ ...styles.box, padding: 16 }}>
                        <h4 style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Pipeline Actions
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {selectedCandidate.stage !== 'hired' && selectedCandidate.stage !== 'rejected' && (
                            <button
                              onClick={() => { setModal('assignTask'); setAssignedTo(null); setCommentText(''); }}
                              style={{ ...styles.btn1, justifyContent: 'center', padding: '12px', background: 'linear-gradient(135deg, #44924c, #2d6a33)' }}
                            >
                              ➡️ Move to Next Stage
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleHotApplicant(selectedCandidate.id); setSelectedCandidate({...selectedCandidate, isHotApplicant: !selectedCandidate.isHotApplicant}); }}
                            style={{ ...styles.btn2, justifyContent: 'center', padding: '10px', background: selectedCandidate.isHotApplicant ? '#fef2f2' : '#fef3c7', color: selectedCandidate.isHotApplicant ? '#dc2626' : '#d97706', border: 'none' }}
                          >
                            {selectedCandidate.isHotApplicant ? '❄️ Remove from Hot' : '🔥 Mark as Hot Applicant'}
                          </button>
                          {selectedCandidate.stage !== 'rejected' && selectedCandidate.stage !== 'hired' && (
                            <button onClick={() => setShowRejectConfirm(true)} style={{ ...styles.btn2, justifyContent: 'center', padding: '10px', background: '#fef2f2', color: '#ef4444', border: 'none' }}>
                              ❌ Reject Candidate
                            </button>
                          )}
                          {selectedCandidate.stage === 'hired' && (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 8,
                              padding: '12px 16px',
                              background: 'linear-gradient(135deg, #10b981, #059669)',
                              color: 'white',
                              borderRadius: 10,
                              fontSize: 14,
                              fontWeight: 600
                            }}>
                              ✅ Successfully Hired
                            </div>
                          )}
                          {/* Revert Stage Button - Only show if not in first stage and not hired */}
                          {selectedCandidate.stage !== 'shortlisting' && selectedCandidate.stage !== 'hired' && (
                            <button
                              onClick={() => {
                                setShowRevertStageModal(true);
                                setRevertReason('');
                                setRevertTargetStage('');
                              }}
                              style={{ ...styles.btn2, justifyContent: 'center', padding: '10px', background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd' }}
                            >
                              ⏪ Revert to Previous Stage
                            </button>
                          )}
                        </div>
                      </div>
                      </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Revert Stage Modal */}
            {showRevertStageModal && selectedCandidate && (() => {
              const stageMap = {
                'shortlisting': 'Shortlisting',
                'screening': 'Screening Call',
                'assignment-sent': 'Assignment Sent',
                'assignment-submitted': 'Assignment Submitted',
                'interview': 'Interview',
                'offer-sent': 'Offer Sent',
                'offer-accepted': 'Offer Accepted',
                'hired': 'Hired',
                'rejected': 'Rejected'
              };
              const allStages = ['shortlisting', 'screening', 'assignment-sent', 'assignment-submitted', 'interview', 'offer-sent', 'offer-accepted', 'hired'];
              const currentStageIndex = allStages.indexOf(selectedCandidate.stage);
              // Get previous stages (before current stage)
              const previousStages = currentStageIndex > 0 ? allStages.slice(0, currentStageIndex) : [];

              return (
                <div
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10000
                  }}
                  onClick={() => {
                    setShowRevertStageModal(false);
                    setRevertReason('');
                    setRevertTargetStage('');
                  }}
                >
                  <div
                    onClick={e => e.stopPropagation()}
                    style={{
                      background: 'white',
                      borderRadius: 20,
                      width: 500,
                      padding: 32,
                      boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
                    }}
                  >
                    <div style={{ textAlign: 'center', marginBottom: 24 }}>
                      <div style={{ fontSize: 48, marginBottom: 16 }}>⏪</div>
                      <h3 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
                        Revert to Previous Stage
                      </h3>
                      <p style={{ color: '#64748b', fontSize: 15 }}>
                        Move <strong>{selectedCandidate.name}</strong> back to a previous stage
                      </p>
                      <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>
                        Current Stage: <span style={{ color: '#0ea5e9', fontWeight: 500 }}>{stageMap[selectedCandidate.stage] || selectedCandidate.stage}</span>
                      </p>
                    </div>

                    <div style={{ marginBottom: 20 }}>
                      <label style={styles.label}>Select Stage to Revert To *</label>
                      <select
                        value={revertTargetStage}
                        onChange={(e) => setRevertTargetStage(e.target.value)}
                        style={styles.input}
                      >
                        <option value="">Select a stage...</option>
                        {previousStages.map(stage => (
                          <option key={stage} value={stage}>
                            {stageMap[stage]}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ marginBottom: 24 }}>
                      <label style={styles.label}>Reason for Reversion *</label>
                      <textarea
                        value={revertReason}
                        onChange={(e) => setRevertReason(e.target.value)}
                        placeholder="Please explain why this candidate is being moved back..."
                        style={{
                          ...styles.input,
                          minHeight: 100,
                          resize: 'vertical',
                          fontFamily: 'inherit'
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: 12 }}>
                      <button
                        onClick={() => {
                          setShowRevertStageModal(false);
                          setRevertReason('');
                          setRevertTargetStage('');
                        }}
                        style={{
                          ...styles.btn2,
                          flex: 1,
                          padding: '14px 24px',
                          fontSize: 16
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleRevertStage}
                        style={{
                          ...styles.btn1,
                          flex: 1,
                          padding: '14px 24px',
                          fontSize: 16,
                          background: 'linear-gradient(135deg, #0284c7, #0369a1)'
                        }}
                      >
                        ⏪ Confirm Revert
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Reject Confirmation Modal */}
            {showRejectConfirm && selectedCandidate && (
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0,0,0,0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10000
                }}
                onClick={() => {
                  setShowRejectConfirm(false);
                  setRejectionReason('');
                }}
              >
                <div
                  onClick={e => e.stopPropagation()}
                  style={{
                    background: 'white',
                    borderRadius: 20,
                    width: 500,
                    padding: 32,
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
                  }}
                >
                  <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
                    <h3 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
                      Reject Candidate?
                    </h3>
                    <p style={{ color: '#64748b', fontSize: 15 }}>
                      Are you sure you want to reject <strong>{selectedCandidate.name}</strong>?
                    </p>
                  </div>

                  <div style={{ marginBottom: 24 }}>
                    <label style={styles.label}>Rejection Reason *</label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Please provide a reason for rejection..."
                      style={{
                        ...styles.input,
                        minHeight: 100,
                        resize: 'vertical',
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      onClick={() => {
                        setShowRejectConfirm(false);
                        setRejectionReason('');
                      }}
                      style={{
                        ...styles.btn2,
                        flex: 1,
                        justifyContent: 'center'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmRejectCandidate}
                      style={{
                        ...styles.btn1,
                        flex: 1,
                        justifyContent: 'center',
                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)'
                      }}
                    >
                      ❌ Confirm Reject
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Interview Passed Confirmation Modal */}
            {showInterviewPassConfirm && confirmInterviewData && (
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0,0,0,0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10000
                }}
                onClick={() => {
                  setShowInterviewPassConfirm(false);
                  setConfirmInterviewData(null);
                }}
              >
                <div
                  onClick={e => e.stopPropagation()}
                  style={{
                    background: 'white',
                    borderRadius: 20,
                    width: 480,
                    padding: 32,
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
                  }}
                >
                  <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                    <h3 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
                      Mark Interview as Passed?
                    </h3>
                    <p style={{ color: '#64748b', fontSize: 15, lineHeight: 1.6 }}>
                      Are you sure you want to mark <strong>{confirmInterviewData.candidate?.name}</strong>'s interview as <strong style={{ color: '#10b981' }}>passed</strong>?
                    </p>
                  </div>

                  <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 12, padding: 16, marginBottom: 24 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#065f46', marginBottom: 8 }}>📋 Interview Details</div>
                    <div style={{ fontSize: 13, color: '#047857' }}>
                      <div><strong>Title:</strong> {confirmInterviewData.interview?.title}</div>
                      <div><strong>Date:</strong> {confirmInterviewData.interview?.date ? new Date(confirmInterviewData.interview.date).toLocaleDateString() : 'N/A'}</div>
                      <div><strong>Time:</strong> {confirmInterviewData.interview?.time || 'N/A'}</div>
                    </div>
                  </div>

                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 16, marginBottom: 24 }}>
                    <div style={{ fontSize: 13, color: '#166534', lineHeight: 1.5 }}>
                      <strong>What happens next:</strong>
                      <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
                        <li>The interview will be marked as completed</li>
                        <li>You will be able to send an offer to the candidate</li>
                        <li>This action can be undone by scheduling another interview round</li>
                      </ul>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      onClick={() => {
                        setShowInterviewPassConfirm(false);
                        setConfirmInterviewData(null);
                      }}
                      style={{
                        ...styles.btn2,
                        flex: 1,
                        justifyContent: 'center'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch(`${API_BASE}/interviews/${confirmInterviewData.interview.id}/status`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: 'completed' })
                          });
                          const data = await res.json();
                          if (data.success) {
                            pop('✅ Interview marked as passed! You can now send an offer.');
                            await refreshData(confirmInterviewData.candidate.id);
                          }
                        } catch (error) {
                          console.error('Error updating interview:', error);
                          pop('Failed to update interview');
                        }
                        setShowInterviewPassConfirm(false);
                        setConfirmInterviewData(null);
                      }}
                      style={{
                        ...styles.btn1,
                        flex: 1,
                        justifyContent: 'center',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)'
                      }}
                    >
                      ✅ Yes, Mark as Passed
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Interview Failed Confirmation Modal */}
            {showInterviewFailConfirm && confirmInterviewData && (
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0,0,0,0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10000
                }}
                onClick={() => {
                  setShowInterviewFailConfirm(false);
                  setConfirmInterviewData(null);
                }}
              >
                <div
                  onClick={e => e.stopPropagation()}
                  style={{
                    background: 'white',
                    borderRadius: 20,
                    width: 480,
                    padding: 32,
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
                  }}
                >
                  <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
                    <h3 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
                      Mark Interview as Failed?
                    </h3>
                    <p style={{ color: '#64748b', fontSize: 15, lineHeight: 1.6 }}>
                      Are you sure you want to mark <strong>{confirmInterviewData.candidate?.name}</strong>'s interview as <strong style={{ color: '#ef4444' }}>failed</strong>?
                    </p>
                  </div>

                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 16, marginBottom: 24 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#991b1b', marginBottom: 8 }}>📋 Interview Details</div>
                    <div style={{ fontSize: 13, color: '#b91c1c' }}>
                      <div><strong>Title:</strong> {confirmInterviewData.interview?.title}</div>
                      <div><strong>Date:</strong> {confirmInterviewData.interview?.date ? new Date(confirmInterviewData.interview.date).toLocaleDateString() : 'N/A'}</div>
                      <div><strong>Time:</strong> {confirmInterviewData.interview?.time || 'N/A'}</div>
                    </div>
                  </div>

                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 16, marginBottom: 24 }}>
                    <div style={{ fontSize: 13, color: '#991b1b', lineHeight: 1.5 }}>
                      <strong>Warning:</strong> This will reject the candidate from the pipeline. A rejection reason will be required in the next step.
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      onClick={() => {
                        setShowInterviewFailConfirm(false);
                        setConfirmInterviewData(null);
                      }}
                      style={{
                        ...styles.btn2,
                        flex: 1,
                        justifyContent: 'center'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        // Close this modal and open rejection modal
                        setShowInterviewFailConfirm(false);
                        setRejectCandidate(confirmInterviewData.candidate);
                        setShowRejectModal(true);
                        setConfirmInterviewData(null);
                      }}
                      style={{
                        ...styles.btn1,
                        flex: 1,
                        justifyContent: 'center',
                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)'
                      }}
                    >
                      ❌ Yes, Mark as Failed
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Screening Call Modal - Form View */}
            {showScreeningModal && selectedCandidate && !showScreeningPreview && (
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0,0,0,0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10000
                }}
                onClick={() => setShowScreeningModal(false)}
              >
                <div
                  onClick={e => e.stopPropagation()}
                  style={{
                    background: 'white',
                    borderRadius: 20,
                    width: 550,
                    maxHeight: '90vh',
                    overflow: 'auto',
                    padding: 32,
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
                  }}
                >
                  <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>📞</div>
                    <h3 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
                      Schedule Screening Call
                    </h3>
                    <p style={{ color: '#64748b', fontSize: 15 }}>
                      Schedule a screening call with <strong>{selectedCandidate.name}</strong> for <strong>{selectedCandidate.role}</strong>
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    <div>
                      <label style={styles.label}>Date *</label>
                      <input
                        type="date"
                        value={screeningForm.date}
                        onChange={(e) => setScreeningForm({ ...screeningForm, date: e.target.value })}
                        style={{
                          width: '100%',
                          padding: 14,
                          borderRadius: 12,
                          border: '2px solid #e2e8f0',
                          fontSize: 15,
                          boxSizing: 'border-box',
                          outline: 'none',
                          background: 'white',
                          color: '#1e293b',
                          minHeight: 48,
                          cursor: 'pointer'
                        }}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div>
                      <label style={styles.label}>Time *</label>
                      <select
                        value={screeningForm.time}
                        onChange={(e) => setScreeningForm({ ...screeningForm, time: e.target.value })}
                        style={{
                          width: '100%',
                          padding: 14,
                          borderRadius: 12,
                          border: '2px solid #e2e8f0',
                          fontSize: 15,
                          boxSizing: 'border-box',
                          outline: 'none',
                          background: 'white',
                          color: '#1e293b',
                          minHeight: 48,
                          cursor: 'pointer'
                        }}
                      >
                        <option value="">Select Time</option>
                        <option value="09:00">09:00 AM</option>
                        <option value="09:30">09:30 AM</option>
                        <option value="10:00">10:00 AM</option>
                        <option value="10:30">10:30 AM</option>
                        <option value="11:00">11:00 AM</option>
                        <option value="11:30">11:30 AM</option>
                        <option value="12:00">12:00 PM</option>
                        <option value="12:30">12:30 PM</option>
                        <option value="13:00">01:00 PM</option>
                        <option value="13:30">01:30 PM</option>
                        <option value="14:00">02:00 PM</option>
                        <option value="14:30">02:30 PM</option>
                        <option value="15:00">03:00 PM</option>
                        <option value="15:30">03:30 PM</option>
                        <option value="16:00">04:00 PM</option>
                        <option value="16:30">04:30 PM</option>
                        <option value="17:00">05:00 PM</option>
                        <option value="17:30">05:30 PM</option>
                        <option value="18:00">06:00 PM</option>
                        <option value="18:30">06:30 PM</option>
                        <option value="19:00">07:00 PM</option>
                        <option value="19:30">07:30 PM</option>
                        <option value="20:00">08:00 PM</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    <div>
                      <label style={styles.label}>Duration</label>
                      <select
                        value={screeningForm.duration}
                        onChange={(e) => setScreeningForm({ ...screeningForm, duration: e.target.value })}
                        style={styles.input}
                      >
                        <option value="15">15 minutes</option>
                        <option value="30">30 minutes</option>
                        <option value="45">45 minutes</option>
                        <option value="60">60 minutes</option>
                      </select>
                    </div>
                    <div>
                      <label style={styles.label}>Platform</label>
                      <select
                        value={screeningForm.platform}
                        onChange={(e) => setScreeningForm({ ...screeningForm, platform: e.target.value })}
                        style={styles.input}
                      >
                        <option value="Google Meet">Google Meet</option>
                        <option value="Zoom">Zoom</option>
                        <option value="Microsoft Teams">Microsoft Teams</option>
                        <option value="Phone Call">Phone Call</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={styles.label}>Interviewer *</label>
                    <select
                      value={screeningForm.interviewer}
                      onChange={(e) => {
                        const selectedAdmin = admins.find(a => a.name === e.target.value);
                        setScreeningForm({
                          ...screeningForm,
                          interviewer: e.target.value,
                          interviewerEmail: selectedAdmin?.email || ''
                        });
                      }}
                      style={styles.input}
                    >
                      <option value="">Select interviewer...</option>
                      {admins.filter(a => a.status.toLowerCase() === 'active').map(admin => (
                        <option key={admin.id} value={admin.name}>{admin.name} - {admin.role}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={styles.label}>Meeting Link</label>
                    <input
                      type="url"
                      value={screeningForm.meetingLink}
                      onChange={(e) => setScreeningForm({ ...screeningForm, meetingLink: e.target.value })}
                      placeholder="https://meet.google.com/..."
                      style={styles.input}
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={styles.label}>Call Agenda</label>
                    <textarea
                      value={screeningForm.agenda}
                      onChange={(e) => setScreeningForm({ ...screeningForm, agenda: e.target.value })}
                      placeholder="Topics to discuss during the call...&#10;• Introduction and role overview&#10;• Experience discussion&#10;• Salary expectations"
                      style={{ ...styles.input, minHeight: 100, resize: 'vertical' }}
                    />
                  </div>

                  <div style={{ marginBottom: 24 }}>
                    <label style={styles.label}>Internal Notes (not shared with candidate)</label>
                    <textarea
                      value={screeningForm.notes}
                      onChange={(e) => setScreeningForm({ ...screeningForm, notes: e.target.value })}
                      placeholder="Internal notes for the team..."
                      style={{ ...styles.input, minHeight: 60, resize: 'vertical' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      onClick={() => setShowScreeningModal(false)}
                      style={{ ...styles.btn2, flex: 1, justifyContent: 'center' }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (!screeningForm.date || !screeningForm.time || !screeningForm.interviewer) {
                          pop('Please fill in all required fields');
                          return;
                        }
                        setShowScreeningPreview(true);
                      }}
                      style={{ ...styles.btn1, flex: 1, justifyContent: 'center' }}
                    >
                      Preview & Send
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Screening Call Modal - Preview View */}
            {showScreeningModal && selectedCandidate && showScreeningPreview && (
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0,0,0,0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10000
                }}
                onClick={() => { setShowScreeningModal(false); setShowScreeningPreview(false); }}
              >
                <div
                  onClick={e => e.stopPropagation()}
                  style={{
                    background: 'white',
                    borderRadius: 20,
                    width: 700,
                    maxHeight: '95vh',
                    overflow: 'auto',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
                  }}
                >
                  {/* Header */}
                  <div style={{ padding: '24px 32px', borderBottom: '1px solid #e2e8f0', background: 'linear-gradient(135deg, #f0f9ff, #ecfdf5)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: 0 }}>
                          Review & Send Screening Invite
                        </h3>
                        <p style={{ color: '#64748b', fontSize: 14, margin: '8px 0 0' }}>
                          Review the email before sending to {selectedCandidate.name}
                        </p>
                      </div>
                      <button
                        onClick={() => setShowScreeningPreview(false)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#3b82f6' }}
                      >
                        Edit Details
                      </button>
                    </div>
                  </div>

                  {/* Email Preview */}
                  <div style={{ padding: 32 }}>
                    {/* Recipients */}
                    <div style={{ marginBottom: 20, padding: 16, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', gap: 24 }}>
                        <div>
                          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>TO (Candidate)</span>
                          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#1e293b' }}>{selectedCandidate.email}</p>
                        </div>
                        <div>
                          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>CC (Interviewer)</span>
                          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#1e293b' }}>{screeningForm.interviewerEmail || screeningForm.interviewer}</p>
                        </div>
                      </div>
                    </div>

                    {/* Email Template Preview */}
                    <div style={{ border: '2px solid #e2e8f0', borderRadius: 16, overflow: 'hidden' }}>
                      {/* Email Header */}
                      <div style={{ background: 'linear-gradient(135deg, #1e40af, #3b82f6)', padding: '32px 40px', textAlign: 'center' }}>
                        <div style={{ fontSize: 40, marginBottom: 12 }}>📞</div>
                        <h2 style={{ color: 'white', fontSize: 24, fontWeight: 700, margin: 0 }}>
                          Screening Call Scheduled
                        </h2>
                        <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14, margin: '8px 0 0' }}>
                          {selectedCandidate.role} Position at AI Planet
                        </p>
                      </div>

                      {/* Email Body */}
                      <div style={{ padding: '32px 40px' }}>
                        <p style={{ fontSize: 16, color: '#1e293b', margin: '0 0 24px' }}>
                          Dear <strong>{selectedCandidate.name}</strong>,
                        </p>
                        <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.7, margin: '0 0 24px' }}>
                          Thank you for your interest in the <strong>{selectedCandidate.role}</strong> position at AI Planet.
                          We are pleased to invite you for a screening call to discuss your application further.
                        </p>

                        {/* Call Details Card */}
                        <div style={{ background: 'linear-gradient(135deg, #f0f9ff, #ecfdf5)', borderRadius: 16, padding: 24, marginBottom: 24 }}>
                          <h4 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span>📅</span> Call Details
                          </h4>
                          <div style={{ display: 'grid', gap: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <span style={{ width: 100, fontSize: 13, color: '#64748b' }}>Date:</span>
                              <span style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>
                                {new Date(screeningForm.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <span style={{ width: 100, fontSize: 13, color: '#64748b' }}>Time:</span>
                              <span style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>
                                {new Date(`2000-01-01T${screeningForm.time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} IST
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <span style={{ width: 100, fontSize: 13, color: '#64748b' }}>Duration:</span>
                              <span style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>{screeningForm.duration} minutes</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <span style={{ width: 100, fontSize: 13, color: '#64748b' }}>Platform:</span>
                              <span style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>{screeningForm.platform}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <span style={{ width: 100, fontSize: 13, color: '#64748b' }}>Interviewer:</span>
                              <span style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>{screeningForm.interviewer}</span>
                            </div>
                            {screeningForm.meetingLink && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <span style={{ width: 100, fontSize: 13, color: '#64748b' }}>Meeting Link:</span>
                                <a href={screeningForm.meetingLink} style={{ fontSize: 14, color: '#3b82f6', wordBreak: 'break-all' }}>
                                  {screeningForm.meetingLink}
                                </a>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Agenda */}
                        {screeningForm.agenda && (
                          <div style={{ background: '#fff7ed', borderRadius: 12, padding: 20, marginBottom: 24, border: '1px solid #fed7aa' }}>
                            <h4 style={{ fontSize: 14, fontWeight: 700, color: '#9a3412', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span>📋</span> Discussion Agenda
                            </h4>
                            <p style={{ fontSize: 14, color: '#7c2d12', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>
                              {screeningForm.agenda}
                            </p>
                          </div>
                        )}

                        {/* Join Button */}
                        {screeningForm.meetingLink && (
                          <div style={{ textAlign: 'center', marginBottom: 24 }}>
                            <a href={screeningForm.meetingLink} style={{
                              display: 'inline-block',
                              padding: '14px 40px',
                              background: 'linear-gradient(135deg, #10b981, #059669)',
                              color: 'white',
                              textDecoration: 'none',
                              borderRadius: 10,
                              fontSize: 16,
                              fontWeight: 600
                            }}>
                              Join Meeting
                            </a>
                          </div>
                        )}

                        <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7, margin: '0 0 16px' }}>
                          Please ensure you join the call on time. If you need to reschedule, please reply to this email
                          at least 24 hours before the scheduled time.
                        </p>

                        <p style={{ fontSize: 14, color: '#64748b', margin: '24px 0 8px' }}>
                          Best regards,
                        </p>
                        <p style={{ fontSize: 14, color: '#1e293b', fontWeight: 600, margin: 0 }}>
                          The AI Planet Recruitment Team
                        </p>
                      </div>

                      {/* Email Footer */}
                      <div style={{ background: '#f8fafc', padding: '20px 40px', borderTop: '1px solid #e2e8f0' }}>
                        <p style={{ fontSize: 12, color: '#64748b', textAlign: 'center', margin: 0 }}>
                          AI Planet | Building the Future with AI | aiplanet.com
                        </p>
                      </div>
                    </div>

                    {/* Calendar Invite Notice */}
                    <div style={{ marginTop: 20, padding: 16, background: '#f0fdf4', borderRadius: 12, border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 24 }}>📆</span>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#166534', margin: 0 }}>Calendar Invite Included</p>
                        <p style={{ fontSize: 13, color: '#15803d', margin: '4px 0 0' }}>
                          A calendar invite (.ics file) will be attached to this email for easy scheduling.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ padding: '20px 32px 32px', display: 'flex', gap: 12 }}>
                    <button
                      onClick={() => setShowScreeningPreview(false)}
                      style={{ ...styles.btn2, flex: 1, justifyContent: 'center' }}
                    >
                      Back to Edit
                    </button>
                    <button
                      onClick={async () => {
                        const screeningDate = new Date(screeningForm.date + 'T' + screeningForm.time);
                        const formattedDate = screeningDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' at ' + screeningDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

                        // Close modals immediately
                        setShowScreeningPreview(false);
                        setShowScreeningModal(false);
                        pop('Sending screening invite...');

                        // Optimistically update UI
                        setPeople(p => p.map(c => c.id === selectedCandidate.id ? {
                          ...c,
                          stage: 'screening',
                          hasScreeningCall: true,
                          screeningCallDate: formattedDate,
                          screeningNotes: screeningForm.notes,
                          screeningInterviewer: screeningForm.interviewer,
                          screeningPlatform: screeningForm.platform,
                          screeningMeetingLink: screeningForm.meetingLink,
                          screeningDuration: screeningForm.duration
                        } : c));
                        setSelectedCandidate({
                          ...selectedCandidate,
                          stage: 'screening',
                          hasScreeningCall: true,
                          screeningCallDate: formattedDate,
                          screeningNotes: screeningForm.notes,
                          screeningInterviewer: screeningForm.interviewer,
                          screeningPlatform: screeningForm.platform,
                          screeningMeetingLink: screeningForm.meetingLink,
                          screeningDuration: screeningForm.duration
                        });

                        // Persist to database and send email
                        try {
                          await applicationsAPI.scheduleScreening(selectedCandidate.id, {
                            date: formattedDate,
                            scheduledDate: screeningForm.date,
                            scheduledTime: screeningForm.time,
                            notes: screeningForm.notes,
                            agenda: screeningForm.agenda,
                            interviewer: screeningForm.interviewer,
                            interviewerEmail: screeningForm.interviewerEmail,
                            platform: screeningForm.platform,
                            meetingLink: screeningForm.meetingLink,
                            duration: screeningForm.duration,
                            candidateEmail: selectedCandidate.email,
                            candidateName: selectedCandidate.name,
                            jobTitle: selectedCandidate.role,
                            sendEmail: true
                          });
                          pop('Screening call scheduled! Email sent to ' + selectedCandidate.email);
                          // Refresh data to get latest state
                          await refreshData(selectedCandidate.id);
                        } catch (error) {
                          console.error('Failed to save screening:', error);
                          pop('Screening scheduled but email may have failed');
                        }
                      }}
                      style={{
                        ...styles.btn1,
                        flex: 2,
                        justifyContent: 'center',
                        background: 'linear-gradient(135deg, #10b981, #059669)'
                      }}
                    >
                      Send Screening Invite
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Create/Edit Assignment Modal */}
            {modal === 'createAssignment' && (
              <div>
                <div style={{ marginBottom: 20 }}>
                  <label style={styles.label}>Assignment Name *</label>
                  <input
                    value={assignmentForm.name}
                    onChange={e => setAssignmentForm({...assignmentForm, name: e.target.value})}
                    placeholder="e.g., Frontend Coding Challenge"
                    style={styles.input}
                  />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={styles.label}>Job Types * (Select all that apply)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                    {openings.map(job => (
                      <label key={job.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: 12,
                        background: assignmentForm.jobTypes.includes(job.name) ? '#dbeafe' : '#f8fafc',
                        border: `2px solid ${assignmentForm.jobTypes.includes(job.name) ? '#3b82f6' : '#e2e8f0'}`,
                        borderRadius: 10,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}>
                        <input
                          type="checkbox"
                          checked={assignmentForm.jobTypes.includes(job.name)}
                          onChange={e => {
                            if (e.target.checked) {
                              setAssignmentForm({
                                ...assignmentForm,
                                jobTypes: [...assignmentForm.jobTypes, job.name]
                              });
                            } else {
                              setAssignmentForm({
                                ...assignmentForm,
                                jobTypes: assignmentForm.jobTypes.filter(jt => jt !== job.name)
                              });
                            }
                          }}
                          style={{ cursor: 'pointer' }}
                        />
                        <span style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: assignmentForm.jobTypes.includes(job.name) ? '#1e40af' : '#64748b'
                        }}>
                          {job.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={styles.label}>Instructions *</label>
                  <RichTextEditor
                    value={assignmentForm.instructions}
                    onChange={(value) => setAssignmentForm({...assignmentForm, instructions: value})}
                    placeholder="Provide detailed instructions for the assignment..."
                    minHeight={200}
                  />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={styles.label}>Link (Optional)</label>
                  <input
                    value={assignmentForm.link}
                    onChange={e => setAssignmentForm({...assignmentForm, link: e.target.value})}
                    placeholder="e.g., https://github.com/company/assignment"
                    style={styles.input}
                  />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={styles.label}>Deadline</label>
                  <select
                    value={assignmentForm.deadline}
                    onChange={e => setAssignmentForm({...assignmentForm, deadline: e.target.value})}
                    style={styles.input}
                  >
                    <option value="1 day">1 day</option>
                    <option value="2 days">2 days</option>
                    <option value="3 days">3 days</option>
                    <option value="5 days">5 days</option>
                    <option value="1 week">1 week</option>
                    <option value="2 weeks">2 weeks</option>
                  </select>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={styles.label}>Attach Files (Optional)</label>
                  <input
                    type="file"
                    multiple
                    onChange={e => {
                      const fileObjects = Array.from(e.target.files);
                      setAssignmentForm({...assignmentForm, files: fileObjects});
                    }}
                    style={{
                      ...styles.input,
                      padding: 12,
                      cursor: 'pointer'
                    }}
                  />
                  {assignmentForm.files.length > 0 && (
                    <div style={{ marginTop: 8, fontSize: 14, color: '#059669' }}>
                      ✓ {assignmentForm.files.length} file(s) selected: {assignmentForm.files.map(f => f.name || f).join(', ')}
                    </div>
                  )}
                </div>

                <button
                  onClick={selectedAssignment ? updateAssignment : createAssignment}
                  style={{
                    ...styles.btn1,
                    width: '100%',
                    padding: '14px'
                  }}
                >
                  {selectedAssignment ? 'Update Assignment' : 'Create Assignment'}
                </button>
              </div>
            )}

            {/* Email Preview Modal */}
            {modal === 'emailPreview' && emailPreview && (
              <div>
                {/* Assignment Already Sent Status Banner */}
                {candidateAssignments.length > 0 && (
                  <div style={{
                    padding: 16,
                    background: '#fef3c7',
                    borderRadius: 12,
                    marginBottom: 16,
                    border: '1px solid #fde047'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 40,
                        height: 40,
                        background: '#f59e0b',
                        borderRadius: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 20
                      }}>
                        {candidateAssignments[0].status === 'submitted' ? '✅' : '📤'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#92400e' }}>
                          Assignment Already Sent
                        </div>
                        <div style={{ fontSize: 13, color: '#b45309', marginTop: 2 }}>
                          "{candidateAssignments[0].assignmentName}" was sent on {new Date(candidateAssignments[0].sentAt).toLocaleDateString()}
                        </div>
                        <div style={{ fontSize: 12, color: '#d97706', marginTop: 4, display: 'flex', gap: 12 }}>
                          <span>Status: <strong style={{ textTransform: 'capitalize' }}>{candidateAssignments[0].status}</strong></span>
                          <span>Deadline: {new Date(candidateAssignments[0].deadlineDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Email Header Info */}
                <div style={{
                  padding: 20,
                  background: 'linear-gradient(135deg, #44924c 0%, #2d6a33 100%)',
                  borderRadius: 12,
                  marginBottom: 24,
                  color: 'white'
                }}>
                  <div style={{ fontSize: 13, marginBottom: 8, opacity: 0.9 }}>
                    {candidateAssignments.length > 0 ? 'Follow-up Email Preview' : 'Email Preview'}
                  </div>
                  <div style={{ fontSize: 15, marginBottom: 6 }}>
                    <strong>To:</strong> {emailPreview.to}
                  </div>
                  <div style={{ fontSize: 15 }}>
                    <strong>Subject:</strong> {emailPreview.subject}
                  </div>
                </div>

                {/* Email Body Preview - Simulating actual email */}
                <div style={{
                  background: '#f8fafc',
                  padding: 24,
                  borderRadius: 12,
                  marginBottom: 24
                }}>
                  <div style={{
                    background: 'white',
                    borderRadius: 12,
                    overflow: 'hidden',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    maxHeight: '500px',
                    overflowY: 'auto'
                  }}>
                    {/* Email Content - No header, starts directly with content */}
                    <div style={{ padding: '32px 40px' }}>
                      {/* Greeting */}
                      <p style={{
                        fontSize: 16,
                        color: '#475569',
                        lineHeight: 1.7,
                        marginBottom: 16,
                        marginTop: 0
                      }}>
                        Hi <strong>{emailPreview.candidateName}</strong>,
                      </p>

                      <p style={{
                        fontSize: 16,
                        color: '#475569',
                        lineHeight: 1.7,
                        marginBottom: 28
                      }}>
                        Congratulations on progressing to the next stage! We're impressed with your profile and excited to see your skills in action. We've prepared an assignment that will help us better understand your capabilities.
                      </p>

                      {/* Assignment Card */}
                      <div style={{
                        background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                        borderRadius: 16,
                        padding: 28,
                        marginBottom: 28,
                        border: '2px solid #86efac'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          marginBottom: 20
                        }}>
                          <div style={{
                            width: 48,
                            height: 48,
                            background: 'linear-gradient(135deg, #44924c, #2d6a33)',
                            borderRadius: 12,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 24,
                            color: 'white'
                          }}>
                            📝
                          </div>
                          <div>
                            <h3 style={{
                              fontSize: 18,
                              fontWeight: 700,
                              color: '#166534',
                              margin: 0
                            }}>
                              {emailPreview.assignment.name}
                            </h3>
                            <div style={{ fontSize: 13, color: '#15803d', marginTop: 2 }}>Assignment Details</div>
                          </div>
                        </div>

                        <div style={{
                          background: 'white',
                          borderRadius: 12,
                          padding: 20,
                          marginBottom: 16
                        }}>
                          <div
                            className="html-content"
                            style={{
                              fontSize: 15,
                              color: '#334155',
                              lineHeight: 1.8,
                              margin: 0
                            }}
                            dangerouslySetInnerHTML={{ __html: emailPreview.assignment.instructions }}
                          />
                        </div>

                        {/* Custom Instructions */}
                        {emailPreview.customInstructions && (
                          <div style={{
                            background: '#fefce8',
                            borderRadius: 12,
                            padding: 16,
                            marginBottom: 16,
                            border: '1px solid #fde047'
                          }}>
                            <div style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: '#854d0e',
                              marginBottom: 8
                            }}>
                              Additional Notes
                            </div>
                            <p style={{
                              fontSize: 14,
                              color: '#713f12',
                              lineHeight: 1.6,
                              margin: 0,
                              whiteSpace: 'pre-wrap'
                            }}>
                              {emailPreview.customInstructions}
                            </p>
                          </div>
                        )}

                        {/* Assignment Link */}
                        {emailPreview.assignment.link && (
                          <div style={{ marginBottom: 16 }}>
                            <div style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: '#166534',
                              marginBottom: 8
                            }}>
                              Assignment Link
                            </div>
                            <a
                              href={emailPreview.assignment.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'inline-block',
                                padding: '10px 16px',
                                background: 'white',
                                color: '#15803d',
                                borderRadius: 8,
                                textDecoration: 'none',
                                fontSize: 14,
                                fontWeight: 500,
                                border: '1px solid #86efac'
                              }}
                            >
                              {emailPreview.assignment.link}
                            </a>
                          </div>
                        )}

                        {/* Assignment Files */}
                        {emailPreview.assignment.files && emailPreview.assignment.files.length > 0 && (
                          <div style={{ marginBottom: 16 }}>
                            <div style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: '#166534',
                              marginBottom: 8
                            }}>
                              Attached Files
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              {emailPreview.assignment.files.map((file, idx) => {
                                const fileName = typeof file === 'string' ? file : file.name;
                                const hasUrl = typeof file === 'object' && (file.url || file.key);

                                return hasUrl ? (
                                  <button
                                    key={idx}
                                    onClick={() => openFileWithSignedUrl(file)}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 6,
                                      padding: '10px 16px',
                                      background: 'white',
                                      color: '#166534',
                                      borderRadius: 8,
                                      textDecoration: 'none',
                                      fontSize: 14,
                                      fontWeight: 500,
                                      border: '1px solid #86efac',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    {fileName}
                                  </button>
                                ) : (
                                  <span
                                    key={idx}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 6,
                                      padding: '10px 16px',
                                      background: 'white',
                                      color: '#64748b',
                                      borderRadius: 8,
                                      fontSize: 14,
                                      fontWeight: 500,
                                      border: '1px solid #e2e8f0'
                                    }}
                                  >
                                    {fileName}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Deadline Badge */}
                        <div style={{
                          background: 'linear-gradient(135deg, #44924c, #2d6a33)',
                          borderRadius: 12,
                          padding: 20,
                          textAlign: 'center'
                        }}>
                          <div style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: 'rgba(255,255,255,0.9)',
                            marginBottom: 6,
                            textTransform: 'uppercase',
                            letterSpacing: '1px'
                          }}>
                            Submission Deadline
                          </div>
                          <div style={{
                            fontSize: 24,
                            fontWeight: 800,
                            color: 'white'
                          }}>
                            {emailPreview.deadline}
                          </div>
                        </div>
                      </div>

                      {/* Next Steps */}
                      <div style={{
                        background: '#f0fdf4',
                        borderRadius: 12,
                        padding: 20,
                        marginBottom: 28,
                        borderLeft: '4px solid #44924c'
                      }}>
                        <p style={{
                          fontSize: 15,
                          color: '#166534',
                          lineHeight: 1.7,
                          margin: 0
                        }}>
                          <strong>Next Steps:</strong><br/>
                          Please complete the assignment and submit it through our recruitment portal. If you have any questions or need clarification, don't hesitate to reach out to us.
                        </p>
                      </div>

                      {/* Closing */}
                      <p style={{
                        fontSize: 16,
                        color: '#475569',
                        lineHeight: 1.7,
                        marginBottom: 8
                      }}>
                        We're looking forward to reviewing your work!
                      </p>

                      <p style={{
                        fontSize: 16,
                        color: '#475569',
                        lineHeight: 1.7,
                        marginBottom: 0
                      }}>
                        Best regards,<br/>
                        <strong style={{ color: '#1e293b' }}>The AI Planet Recruitment Team</strong>
                      </p>
                    </div>

                    {/* Email Footer */}
                    <div style={{
                      background: '#f0fdf4',
                      padding: '20px 40px',
                      borderTop: '1px solid #dcfce7',
                      textAlign: 'center'
                    }}>
                      <div style={{
                        fontSize: 12,
                        color: '#166534'
                      }}>
                        AI Planet
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <button
                    onClick={confirmSendEmail}
                    style={{
                      ...styles.btn1,
                      flex: 1,
                      minWidth: 200,
                      padding: '16px',
                      fontSize: 16,
                      fontWeight: 600
                    }}
                  >
                    {candidateAssignments.length > 0 ? '📤 Send Follow-up' : '✉️ Confirm & Send'}
                  </button>
                  <button
                    onClick={() => {
                      setModal('selectAssignment');
                      setEmailPreview(null);
                      fetchAssignmentsForCandidate(selectedCandidate);
                    }}
                    style={{
                      ...styles.btn2,
                      padding: '16px 24px',
                      fontSize: 16
                    }}
                  >
                    ← Back
                  </button>
                  <button
                    onClick={() => {
                      setModal(null);
                      setEmailPreview(null);
                      setSelectedAssignmentToSend(null);
                      setCustomAssignmentInstructions('');
                    }}
                    style={{
                      ...styles.btn2,
                      padding: '16px 24px',
                      fontSize: 16,
                      background: '#fef2f2',
                      color: '#dc2626',
                      border: 'none'
                    }}
                  >
                    Cancel
                  </button>
                </div>

                {/* Follow-up Options - Show if assignment was already sent */}
                {candidateAssignments.length > 0 && (
                  <div style={{
                    marginTop: 20,
                    padding: 16,
                    background: '#f8fafc',
                    borderRadius: 12,
                    border: '1px solid #e2e8f0'
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 12 }}>
                      Follow-up Options
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <button
                        onClick={() => {
                          // Reminder email - update subject
                          setEmailPreview(prev => ({
                            ...prev,
                            subject: `Reminder: ${prev.subject}`
                          }));
                          pop('Subject updated to reminder');
                        }}
                        style={{
                          ...styles.btn2,
                          padding: '10px 16px',
                          fontSize: 13,
                          background: '#fef3c7',
                          color: '#92400e',
                          border: '1px solid #fde047'
                        }}
                      >
                        Add "Reminder" to Subject
                      </button>
                      <button
                        onClick={() => {
                          const deadline = new Date(candidateAssignments[0].deadlineDate);
                          const now = new Date();
                          const daysLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
                          const deadlineText = daysLeft > 0
                            ? `You have ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left to submit.`
                            : daysLeft === 0
                            ? 'Today is the deadline!'
                            : `The deadline was ${Math.abs(daysLeft)} day${Math.abs(daysLeft) !== 1 ? 's' : ''} ago.`;
                          setCustomAssignmentInstructions(prev =>
                            prev ? `${prev}\n\n${deadlineText}` : deadlineText
                          );
                          pop('Deadline reminder added');
                        }}
                        style={{
                          ...styles.btn2,
                          padding: '10px 16px',
                          fontSize: 13,
                          background: '#fef2f2',
                          color: '#dc2626',
                          border: '1px solid #fecaca'
                        }}
                      >
                        Add Deadline Reminder
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Select Assignment Modal */}
            {modal === 'selectAssignment' && selectedCandidate && (
              <div>
                {/* Previously Sent Assignment Status */}
                {candidateAssignments.length > 0 && (
                  <div style={{
                    padding: 16,
                    background: candidateAssignments[0].status === 'submitted' ? '#f0fdf4' : '#fef3c7',
                    borderRadius: 12,
                    border: `1px solid ${candidateAssignments[0].status === 'submitted' ? '#86efac' : '#fde047'}`,
                    marginBottom: 16
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 36,
                        height: 36,
                        background: candidateAssignments[0].status === 'submitted' ? '#22c55e' : '#f59e0b',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 18
                      }}>
                        {candidateAssignments[0].status === 'submitted' ? '✅' : '📤'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: candidateAssignments[0].status === 'submitted' ? '#166534' : '#92400e'
                        }}>
                          {candidateAssignments[0].status === 'submitted'
                            ? 'Assignment Submitted'
                            : 'Assignment Already Sent'}
                        </div>
                        <div style={{
                          fontSize: 13,
                          color: candidateAssignments[0].status === 'submitted' ? '#15803d' : '#b45309',
                          marginTop: 2
                        }}>
                          "{candidateAssignments[0].assignmentName}" - Sent {new Date(candidateAssignments[0].sentAt).toLocaleDateString()}
                        </div>
                        <div style={{
                          fontSize: 12,
                          color: candidateAssignments[0].status === 'submitted' ? '#16a34a' : '#d97706',
                          marginTop: 4,
                          display: 'flex',
                          gap: 12
                        }}>
                          <span>Status: <strong style={{ textTransform: 'capitalize' }}>{candidateAssignments[0].status}</strong></span>
                          <span>Deadline: {new Date(candidateAssignments[0].deadlineDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Mark Assignment Completed Button - Only show if assignment was sent */}
                {candidateAssignments.length > 0 && (
                  <div style={{
                    padding: 16,
                    background: '#f0fdf4',
                    borderRadius: 12,
                    border: '2px solid #22c55e',
                    marginBottom: 16
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#166534', marginBottom: 4 }}>
                          Review & Complete Assignment
                        </div>
                        <div style={{ fontSize: 13, color: '#15803d' }}>
                          Mark as completed to schedule next interview round
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setAssignmentToReview(candidateAssignments[0]);
                          setAssignmentReviewForm({
                            rating: 0,
                            feedback: '',
                            status: 'passed'
                          });
                          setShowAssignmentReviewModal(true);
                        }}
                        style={{
                          background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                          color: 'white',
                          border: 'none',
                          padding: '12px 24px',
                          borderRadius: 10,
                          fontSize: 14,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          whiteSpace: 'nowrap',
                          boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)'
                        }}
                      >
                        <span>✓</span> Mark Completed
                      </button>
                    </div>
                  </div>
                )}

                <div style={{
                  padding: 16,
                  background: '#f0f9ff',
                  borderRadius: 12,
                  border: '1px solid #bae6fd',
                  marginBottom: 24
                }}>
                  <div style={{ fontSize: 14, color: '#0369a1' }}>
                    <strong>Sending to:</strong> {selectedCandidate.name} ({selectedCandidate.email})
                  </div>
                  <div style={{ fontSize: 14, color: '#0369a1', marginTop: 4 }}>
                    <strong>Role:</strong> {selectedCandidate.role}
                  </div>
                </div>

                {/* Filter assignments by candidate's role */}
                {(() => {
                  const relevantAssignments = assignments.filter(a =>
                    a.jobTypes.includes(selectedCandidate.role)
                  );

                  if (relevantAssignments.length === 0) {
                    return (
                      <div style={{
                        padding: 60,
                        textAlign: 'center',
                        color: '#94a3b8',
                        background: '#f8fafc',
                        borderRadius: 12,
                        border: '2px dashed #e2e8f0'
                      }}>
                        <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
                        <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>
                          No assignments available for {selectedCandidate.role}
                        </div>
                        <div style={{ fontSize: 14 }}>
                          Create an assignment for this role in Admin Management
                        </div>
                        <button
                          onClick={() => {
                            setModal(null);
                            navigate('/assignments');
                          }}
                          style={{
                            ...styles.btn1,
                            marginTop: 20
                          }}
                        >
                          Go to Assignments
                        </button>
                      </div>
                    );
                  }

                  return (
                    <>
                      {/* Assignment Selection */}
                      <div style={{ marginBottom: 24 }}>
                        <label style={styles.label}>Select Assignment *</label>
                        <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
                          {relevantAssignments.map(assignment => (
                            <div
                              key={assignment.id}
                              onClick={() => setSelectedAssignmentToSend(assignment.id)}
                              style={{
                                padding: 16,
                                background: selectedAssignmentToSend === assignment.id ? '#eff6ff' : '#f8fafc',
                                borderRadius: 12,
                                border: `2px solid ${selectedAssignmentToSend === assignment.id ? '#3b82f6' : '#e2e8f0'}`,
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'start', gap: 12 }}>
                                <div style={{
                                  width: 20,
                                  height: 20,
                                  borderRadius: '50%',
                                  border: `2px solid ${selectedAssignmentToSend === assignment.id ? '#3b82f6' : '#cbd5e1'}`,
                                  background: selectedAssignmentToSend === assignment.id ? '#3b82f6' : 'white',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                  marginTop: 2
                                }}>
                                  {selectedAssignmentToSend === assignment.id && (
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'white' }} />
                                  )}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                                    <h4 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', margin: 0 }}>
                                      {assignment.name}
                                    </h4>
                                    <span style={{
                                      padding: '4px 10px',
                                      background: selectedAssignmentToSend === assignment.id ? '#dbeafe' : '#f1f5f9',
                                      color: selectedAssignmentToSend === assignment.id ? '#1e40af' : '#64748b',
                                      borderRadius: 6,
                                      fontSize: 12,
                                      fontWeight: 500,
                                      whiteSpace: 'nowrap'
                                    }}>
                                      ⏱️ {assignment.deadline}
                                    </span>
                                  </div>
                                  <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5, margin: 0, marginBottom: 8 }}>
                                    {(() => {
                                      const plainText = assignment.instructions.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
                                      return plainText.substring(0, 120) + (plainText.length > 120 ? '...' : '');
                                    })()}
                                  </p>
                                  {/* Show link and files count */}
                                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                    {assignment.link && (
                                      <span style={{ fontSize: 12, color: '#0ea5e9', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        🔗 Link attached
                                      </span>
                                    )}
                                    {assignment.files && assignment.files.length > 0 && (
                                      <span style={{ fontSize: 12, color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        📎 {assignment.files.length} file(s)
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Custom Instructions (Optional) */}
                      <div style={{ marginBottom: 24 }}>
                        <label style={styles.label}>Additional Instructions (Optional)</label>
                        <textarea
                          value={customAssignmentInstructions}
                          onChange={e => setCustomAssignmentInstructions(e.target.value)}
                          placeholder="Add any custom instructions or notes for this candidate..."
                          rows={4}
                          style={{
                            ...styles.input,
                            resize: 'vertical',
                            fontFamily: "'Work Sans', system-ui, sans-serif",
                            marginTop: 8
                          }}
                        />
                        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>
                          These instructions will be included in the email along with the assignment details
                        </div>
                      </div>

                      {/* Send Button */}
                      <div style={{ display: 'flex', gap: 12 }}>
                        <button
                          onClick={previewAssignmentEmail}
                          disabled={!selectedAssignmentToSend}
                          style={{
                            ...styles.btn1,
                            flex: 1,
                            padding: '14px',
                            fontSize: 16,
                            opacity: selectedAssignmentToSend ? 1 : 0.5,
                            cursor: selectedAssignmentToSend ? 'pointer' : 'not-allowed'
                          }}
                        >
                          📧 Preview & Send
                        </button>
                        <button
                          onClick={() => {
                            setModal(null);
                            setSelectedAssignmentToSend(null);
                            setCustomAssignmentInstructions('');
                          }}
                          style={{
                            ...styles.btn2,
                            padding: '14px 24px',
                            fontSize: 16
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Assign Task Modal */}
            {modal === 'assignTask' && (candidate || selectedCandidate) && (() => {
              const currentCandidate = selectedCandidate || candidate;
              const stageMap = {
                'shortlisting': 'Shortlisting',
                'screening': 'Screening Call',
                'assignment-sent': 'Assignment Sent',
                'assignment-submitted': 'Assignment Submitted',
                'interview': 'Interview',
                'offer-sent': 'Offer Sent',
                'offer-accepted': 'Offer Accepted',
                'hired': 'Hired',
                'rejected': 'Rejected'
              };
              // Main pipeline stages (assignment stages are separate workflow)
              const stagesList = ['shortlisting', 'screening', 'interview', 'offer-sent', 'offer-accepted', 'hired'];
              // Normalize assignment stages to their parent stage
              const normalizedCurrentStage = currentCandidate.stage?.startsWith('assignment') ? 'screening' : currentCandidate.stage;
              const currentStageIndex = stagesList.indexOf(normalizedCurrentStage);
              const nextStage = stagesList[Math.min(currentStageIndex + 1, stagesList.length - 1)];
              const nextStageName = stageMap[nextStage];

              // Check if moving from screening to interview without assignment completion
              const isScreeningStage = normalizedCurrentStage === 'screening' || currentCandidate.stage?.startsWith('assignment');
              const hasCompletedAssignment = currentCandidate.stage === 'assignment-submitted';
              const movingToInterview = nextStage === 'interview';
              const showAssignmentWarning = isScreeningStage && movingToInterview && !hasCompletedAssignment;

              return (
                <div>
                  <div style={{
                    padding: 16,
                    background: '#f0fdf4',
                    borderRadius: 12,
                    border: '1px solid #bbf7d0',
                    marginBottom: 24
                  }}>
                    <div style={{ fontSize: 14, color: '#15803d' }}>
                      <strong>Candidate:</strong> {currentCandidate.name}
                    </div>
                    <div style={{ fontSize: 14, color: '#15803d', marginTop: 4 }}>
                      <strong>Current Stage:</strong> {stageMap[currentCandidate.stage] || currentCandidate.stage}
                    </div>
                    <div style={{ fontSize: 14, color: '#15803d', marginTop: 4 }}>
                      <strong>Next Stage:</strong> {nextStageName}
                    </div>
                  </div>

                  {/* Warning when moving to Interview without Assignment completion */}
                  {showAssignmentWarning && (
                    <div style={{
                      padding: 16,
                      background: '#fef3c7',
                      borderRadius: 12,
                      border: '2px solid #f59e0b',
                      marginBottom: 24
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 20 }}>⚠️</span>
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#92400e' }}>Assignment Not Completed</span>
                      </div>
                      <div style={{ fontSize: 13, color: '#78350f', lineHeight: 1.5 }}>
                        This candidate has not completed an assignment yet. Are you sure you want to move them directly to the Interview stage without assignment evaluation?
                      </div>
                      <div style={{ fontSize: 12, color: '#92400e', marginTop: 8, fontStyle: 'italic' }}>
                        {currentCandidate.stage === 'assignment-sent'
                          ? '📝 Assignment was sent but not yet submitted by the candidate.'
                          : '📋 No assignment has been sent to this candidate.'}
                      </div>
                    </div>
                  )}

                  <div style={{ marginBottom: 24 }}>
                    <label style={styles.label}>Assign to Admin/HR *</label>
                    <select
                      value={assignedTo || ''}
                      onChange={e => setAssignedTo(e.target.value)}
                      style={styles.input}
                    >
                      <option value="">Select an admin...</option>
                      {admins.filter(a => a.status.toLowerCase() === 'active').map(admin => (
                        <option key={admin.id} value={admin.name}>
                          {admin.name} - {admin.role}
                        </option>
                      ))}
                    </select>
                  </div>

                <div style={{ marginBottom: 24 }}>
                  <label style={styles.label}>Task Notes (Optional)</label>
                  <textarea
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    placeholder="Add any notes or instructions for the assigned person..."
                    style={{
                      ...styles.input,
                      minHeight: 100,
                      resize: 'vertical'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={async () => {
                      if (!assignedTo) {
                        pop('Please select an admin to assign the task');
                        return;
                      }

                      // Optimistically update UI
                      setPeople(p => p.map(c => c.id === currentCandidate.id ? {
                        ...c,
                        stage: nextStage,
                        assignedTo: assignedTo,
                        lastUpdated: new Date().toISOString()
                      } : c));

                      // Create task assignment in database and locally
                      const newTaskData = {
                        application_id: currentCandidate._original?.id || currentCandidate.id,
                        candidate_id: currentCandidate.candidateId || currentCandidate._original?.candidate_id,
                        candidate_name: currentCandidate.name,
                        candidate_role: currentCandidate.role,
                        stage: nextStageName,
                        assigned_to: assignedTo,
                        assigned_by: currentUser?.name || 'Admin',
                        notes: commentText,
                        priority: 'normal'
                      };

                      try {
                        const createdTask = await tasksAPI.create(newTaskData);
                        // Add to local state with transformed format
                        const localTask = {
                          id: createdTask.id,
                          candidateId: currentCandidate.id,
                          candidateName: currentCandidate.name,
                          candidateRole: currentCandidate.role,
                          stage: nextStageName,
                          assignedTo: assignedTo,
                          assignedBy: currentUser?.name || 'Admin',
                          assignedDate: createdTask.assigned_date,
                          status: 'pending',
                          notes: commentText,
                          applicationId: currentCandidate._original?.id || currentCandidate.id
                        };
                        setTaskAssignments(prev => [...prev, localTask]);
                      } catch (taskError) {
                        console.error('Failed to create task in database:', taskError);
                        // Still add locally for optimistic UI
                        const fallbackTask = {
                          id: Date.now(),
                          candidateId: currentCandidate.id,
                          candidateName: currentCandidate.name,
                          candidateRole: currentCandidate.role,
                          stage: nextStageName,
                          assignedTo: assignedTo,
                          assignedBy: currentUser?.name || 'Admin',
                          assignedDate: new Date().toISOString(),
                          status: 'pending',
                          notes: commentText
                        };
                        setTaskAssignments(prev => [...prev, fallbackTask]);
                      }

                      // Add comment if provided
                      const savedCommentText = commentText;
                      if (savedCommentText) {
                        setPeople(p => p.map(c => c.id === currentCandidate.id ? {
                          ...c,
                          comments: [
                            ...(c.comments || []),
                            {
                              id: Date.now(),
                              text: `Task assigned to ${assignedTo}: ${savedCommentText}`,
                              author: currentUser?.name || 'Admin',
                              timestamp: new Date().toLocaleString(),
                              stage: nextStage
                            }
                          ]
                        } : c));
                      }

                      if (selectedCandidate) {
                        setSelectedCandidate({ ...currentCandidate, stage: nextStage, assignedTo: assignedTo });
                      }
                      if (candidate) {
                        setCandidate({ ...currentCandidate, stage: nextStage, assignedTo: assignedTo });
                      }

                      setModal(null);
                      setAssignedTo(null);
                      setCommentText('');

                      // Persist to database
                      try {
                        await applicationsAPI.update(currentCandidate.id, {
                          stage: nextStage,
                          assigned_to: assignedTo,
                          last_activity_at: new Date().toISOString()
                        });
                        // Add comment to database if provided
                        if (savedCommentText) {
                          await applicationsAPI.addComment(currentCandidate.id, {
                            text: `Task assigned to ${assignedTo}: ${savedCommentText}`,
                            author: currentUser?.name || 'Admin',
                            stage: nextStage
                          });
                        }
                        pop(`✅ Candidate moved to ${nextStageName} and assigned to ${assignedTo}!`);
                      } catch (error) {
                        console.error('Failed to update stage:', error);
                        pop('Stage updated locally but failed to sync to database');
                      }
                    }}
                    style={{
                      ...styles.btn1,
                      flex: 1,
                      padding: '14px 24px',
                      fontSize: 16
                    }}
                  >
                    Assign & Move to Next Stage
                  </button>
                  <button
                    onClick={() => {
                      setModal(null);
                      setAssignedTo(null);
                      setCommentText('');
                    }}
                    style={{
                      ...styles.btn2,
                      padding: '14px 24px',
                      fontSize: 16
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
              );
            })()}
            </div>
          </div>
        </div>
      )}

      {/* ==================
          TOAST NOTIFICATION
          ================== */}

      {/* Task Completion Modal */}
      {showTaskCompleteModal && completingTask && (() => {
        const stageMap = {
          'shortlisting': 'Shortlisting',
          'screening': 'Screening Call',
          'interview': 'Interview',
          'offer-sent': 'Offer Sent',
          'offer-accepted': 'Offer Accepted',
          'hired': 'Hired',
          'rejected': 'Rejected'
        };
        // Main pipeline stages (assignment stages are separate workflow)
        const stagesList = ['shortlisting', 'screening', 'interview', 'offer-sent', 'offer-accepted', 'hired'];

        // Find current candidate to get their stage
        const taskCandidate = people.find(p =>
          p.id === completingTask.applicationId ||
          p._original?.id === completingTask.applicationId ||
          p.id === completingTask.candidateId
        );
        const currentStage = taskCandidate?.stage || 'shortlisting';
        // Normalize assignment stages to their parent stage for index calculation
        const normalizedStage = currentStage.startsWith('assignment') ? 'screening' : currentStage;
        const currentStageIndex = stagesList.indexOf(normalizedStage);

        // Get available next stages (Super Admin can go backwards too)
        const isSuperAdmin = currentUser?.role === 'Super Admin';
        const availableStages = isSuperAdmin
          ? stagesList
          : stagesList.slice(Math.max(0, currentStageIndex + 1));

        return (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20
          }}>
            <div style={{
              background: 'white',
              borderRadius: 16,
              maxWidth: 550,
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
            }}>
              {/* Header */}
              <div style={{
                padding: '20px 24px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#1e293b' }}>
                  Complete Task
                </h2>
                <button
                  onClick={() => {
                    setShowTaskCompleteModal(false);
                    setCompletingTask(null);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: 24,
                    cursor: 'pointer',
                    color: '#64748b'
                  }}
                >
                  ×
                </button>
              </div>

              {/* Content */}
              <div style={{ padding: 24 }}>
                {/* Candidate Info */}
                <div style={{
                  padding: 16,
                  background: '#f8fafc',
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                  marginBottom: 24
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 48,
                      height: 48,
                      background: 'linear-gradient(135deg, #44924c, #2d6a33)',
                      borderRadius: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 600
                    }}>
                      {completingTask.candidateName?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{completingTask.candidateName}</div>
                      <div style={{ fontSize: 13, color: '#64748b' }}>{completingTask.candidateRole}</div>
                    </div>
                    <div style={{ marginLeft: 'auto' }}>
                      <span style={{
                        padding: '6px 12px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 500,
                        background: '#44924c20',
                        color: '#44924c'
                      }}>{completingTask.stage}</span>
                    </div>
                  </div>
                </div>

                {/* Warning */}
                <div style={{
                  padding: 16,
                  background: '#fffbeb',
                  borderRadius: 12,
                  border: '1px solid #fcd34d',
                  marginBottom: 24,
                  display: 'flex',
                  gap: 12
                }}>
                  <span style={{ fontSize: 20 }}>⚠️</span>
                  <div>
                    <div style={{ fontWeight: 600, color: '#b45309', marginBottom: 4 }}>Are you sure?</div>
                    <div style={{ fontSize: 13, color: '#92400e' }}>
                      You are about to mark this task as complete. What should happen next with this candidate?
                    </div>
                  </div>
                </div>

                {/* Action Options */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontWeight: 500, color: '#1e293b', marginBottom: 12 }}>
                    What's next for this candidate?
                  </label>

                  <div
                    onClick={() => setTaskCompleteAction('complete_only')}
                    style={{
                      padding: 16,
                      border: `2px solid ${taskCompleteAction === 'complete_only' ? '#44924c' : '#e2e8f0'}`,
                      borderRadius: 12,
                      marginBottom: 12,
                      cursor: 'pointer',
                      background: taskCompleteAction === 'complete_only' ? '#f0fdf4' : 'white'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        border: `2px solid ${taskCompleteAction === 'complete_only' ? '#44924c' : '#cbd5e1'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: taskCompleteAction === 'complete_only' ? '#44924c' : 'white'
                      }}>
                        {taskCompleteAction === 'complete_only' && (
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'white' }} />
                        )}
                      </div>
                      <div>
                        <div style={{ fontWeight: 500, color: '#1e293b' }}>Just complete the task</div>
                        <div style={{ fontSize: 13, color: '#64748b' }}>No stage change or reassignment</div>
                      </div>
                    </div>
                  </div>

                  <div
                    onClick={() => setTaskCompleteAction('move_and_assign')}
                    style={{
                      padding: 16,
                      border: `2px solid ${taskCompleteAction === 'move_and_assign' ? '#44924c' : '#e2e8f0'}`,
                      borderRadius: 12,
                      cursor: 'pointer',
                      background: taskCompleteAction === 'move_and_assign' ? '#f0fdf4' : 'white'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        border: `2px solid ${taskCompleteAction === 'move_and_assign' ? '#44924c' : '#cbd5e1'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: taskCompleteAction === 'move_and_assign' ? '#44924c' : 'white'
                      }}>
                        {taskCompleteAction === 'move_and_assign' && (
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'white' }} />
                        )}
                      </div>
                      <div>
                        <div style={{ fontWeight: 500, color: '#1e293b' }}>Move to next stage & assign</div>
                        <div style={{ fontSize: 13, color: '#64748b' }}>Select a stage and assign to someone</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stage and Assignment Options (shown when move_and_assign selected) */}
                {taskCompleteAction === 'move_and_assign' && (
                  <>
                    <div style={{ marginBottom: 20 }}>
                      <label style={{ display: 'block', fontWeight: 500, color: '#1e293b', marginBottom: 8 }}>
                        Move to Stage {isSuperAdmin && <span style={{ fontSize: 12, color: '#64748b' }}>(Super Admin: can move backwards)</span>}
                      </label>
                      <select
                        value={nextStageSelection}
                        onChange={e => setNextStageSelection(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          border: '1px solid #e2e8f0',
                          borderRadius: 10,
                          fontSize: 14,
                          background: 'white'
                        }}
                      >
                        <option value="">Select a stage...</option>
                        {availableStages.map(stage => (
                          <option key={stage} value={stage}>
                            {stageMap[stage]} {stage === currentStage ? '(Current)' : ''}
                            {stagesList.indexOf(stage) < currentStageIndex ? '← (Previous)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ marginBottom: 20 }}>
                      <label style={{ display: 'block', fontWeight: 500, color: '#1e293b', marginBottom: 8 }}>
                        Assign to *
                      </label>
                      <select
                        value={assignedTo || ''}
                        onChange={e => setAssignedTo(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          border: '1px solid #e2e8f0',
                          borderRadius: 10,
                          fontSize: 14,
                          background: 'white'
                        }}
                      >
                        <option value="">Select an admin...</option>
                        <option value={currentUser?.name}>Myself ({currentUser?.name})</option>
                        {admins.filter(a => a.status.toLowerCase() === 'active' && a.name !== currentUser?.name).map(admin => (
                          <option key={admin.id} value={admin.name}>
                            {admin.name} - {admin.role}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ marginBottom: 20 }}>
                      <label style={{ display: 'block', fontWeight: 500, color: '#1e293b', marginBottom: 8 }}>
                        Task Notes (Optional)
                      </label>
                      <textarea
                        value={commentText}
                        onChange={e => setCommentText(e.target.value)}
                        placeholder="Add any notes for the next person..."
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          border: '1px solid #e2e8f0',
                          borderRadius: 10,
                          fontSize: 14,
                          minHeight: 80,
                          resize: 'vertical'
                        }}
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div style={{
                padding: '16px 24px',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                gap: 12,
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={() => {
                    setShowTaskCompleteModal(false);
                    setCompletingTask(null);
                  }}
                  style={{
                    padding: '12px 24px',
                    borderRadius: 10,
                    border: '1px solid #e2e8f0',
                    background: 'white',
                    color: '#64748b',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (taskCompleteAction === 'move_and_assign') {
                      if (!nextStageSelection) {
                        pop('Please select a stage');
                        return;
                      }
                      if (!assignedTo) {
                        pop('Please select someone to assign the task');
                        return;
                      }
                    }

                    // Mark current task as completed
                    setTaskAssignments(prev => prev.map(t =>
                      t.id === completingTask.id ? {
                        ...t,
                        status: 'completed',
                        completedDate: new Date().toISOString(),
                        completedBy: currentUser?.name || 'Admin'
                      } : t
                    ));

                    // Persist to database
                    try {
                      await tasksAPI.updateStatus(completingTask.id, 'completed', currentUser?.name || 'Admin');
                    } catch (error) {
                      console.error('Failed to update task status in database:', error);
                    }

                    // If moving to next stage and assigning
                    if (taskCompleteAction === 'move_and_assign' && nextStageSelection && assignedTo) {
                      // Update candidate stage
                      setPeople(p => p.map(c => c.id === completingTask.candidateId ? {
                        ...c,
                        stage: nextStageSelection,
                        assignedTo: assignedTo,
                        lastUpdated: new Date().toISOString()
                      } : c));

                      // Create new task assignment
                      const newTaskData = {
                        application_id: completingTask.applicationId || completingTask.candidateId,
                        candidate_id: completingTask.candidateId,
                        candidate_name: completingTask.candidateName,
                        candidate_role: completingTask.candidateRole,
                        stage: stageMap[nextStageSelection],
                        assigned_to: assignedTo,
                        assigned_by: currentUser?.name || 'Admin',
                        notes: commentText,
                        priority: 'normal'
                      };

                      try {
                        const createdTask = await tasksAPI.create(newTaskData);
                        const localTask = {
                          id: createdTask.id,
                          candidateId: completingTask.candidateId,
                          candidateName: completingTask.candidateName,
                          candidateRole: completingTask.candidateRole,
                          stage: stageMap[nextStageSelection],
                          assignedTo: assignedTo,
                          assignedBy: currentUser?.name || 'Admin',
                          assignedDate: createdTask.assigned_date,
                          status: 'pending',
                          notes: commentText,
                          applicationId: completingTask.applicationId
                        };
                        setTaskAssignments(prev => [...prev, localTask]);
                      } catch (taskError) {
                        console.error('Failed to create task in database:', taskError);
                        const fallbackTask = {
                          id: Date.now(),
                          candidateId: completingTask.candidateId,
                          candidateName: completingTask.candidateName,
                          candidateRole: completingTask.candidateRole,
                          stage: stageMap[nextStageSelection],
                          assignedTo: assignedTo,
                          assignedBy: currentUser?.name || 'Admin',
                          assignedDate: new Date().toISOString(),
                          status: 'pending',
                          notes: commentText
                        };
                        setTaskAssignments(prev => [...prev, fallbackTask]);
                      }

                      // Update application in database
                      try {
                        await applicationsAPI.update(completingTask.candidateId, {
                          stage: nextStageSelection,
                          assigned_to: assignedTo,
                          last_activity_at: new Date().toISOString()
                        });
                      } catch (error) {
                        console.error('Failed to update application stage:', error);
                      }

                      pop(`✅ Task completed! Candidate moved to ${stageMap[nextStageSelection]} and assigned to ${assignedTo}`);
                    } else {
                      pop('✅ Task marked as completed!');
                    }

                    // Close modal and reset
                    const candidateIdToRefresh = completingTask.candidateId;
                    setShowTaskCompleteModal(false);
                    setCompletingTask(null);
                    setTaskCompleteAction('complete_only');
                    setNextStageSelection('');
                    setAssignedTo(null);
                    setCommentText('');
                    // Refresh data to get latest state
                    await refreshData(candidateIdToRefresh);
                  }}
                  style={{
                    padding: '12px 24px',
                    borderRadius: 10,
                    border: 'none',
                    background: '#44924c',
                    color: 'white',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {taskCompleteAction === 'move_and_assign' ? 'Complete & Assign' : 'Complete Task'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Interview Scheduling Modal */}
      {showInterviewModal && interviewCandidate && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20
        }}>
          <div style={{
            background: 'white',
            borderRadius: 16,
            maxWidth: 700,
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '24px 32px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', margin: 0 }}>
                  {interviewForm.isEditing ? '✏️ Edit Interview' : '📅 Schedule Interview'}
                </h2>
                <p style={{ fontSize: 14, color: '#64748b', margin: '4px 0 0' }}>
                  {interviewCandidate.name} - {interviewCandidate.role}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowInterviewModal(false);
                  setInterviewCandidate(null);
                  setShowInterviewEmailPreview(false);
                }}
                style={{
                  background: '#f8fafc',
                  border: 'none',
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontSize: 18,
                  color: '#64748b'
                }}
              >
                ×
              </button>
            </div>

            {!showInterviewEmailPreview ? (
              <>
                {/* Modal Body */}
                <div style={{ padding: '32px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#64748b', marginBottom: 8 }}>
                        Interview Title *
                      </label>
                      <input
                        type="text"
                        value={interviewForm.title}
                        onChange={e => setInterviewForm({ ...interviewForm, title: e.target.value })}
                        placeholder="e.g. Technical Interview Round 1"
                        style={{ ...styles.input, width: '100%' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#64748b', marginBottom: 8 }}>
                        Interviewer *
                      </label>
                      <select
                        value={interviewForm.interviewer}
                        onChange={e => setInterviewForm({ ...interviewForm, interviewer: e.target.value })}
                        style={{ ...styles.input, width: '100%' }}
                      >
                        <option value="">Select Interviewer</option>
                        {admins.filter(a => a.status.toLowerCase() === 'active').map(admin => (
                          <option key={admin.id} value={admin.name}>{admin.name} - {admin.role}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#64748b', marginBottom: 8 }}>
                        Date *
                      </label>
                      <input
                        type="date"
                        value={interviewForm.date}
                        onChange={e => setInterviewForm({ ...interviewForm, date: e.target.value })}
                        min={new Date().toISOString().split('T')[0]}
                        style={{
                          width: '100%',
                          padding: 14,
                          borderRadius: 12,
                          border: '2px solid #e2e8f0',
                          fontSize: 15,
                          boxSizing: 'border-box',
                          outline: 'none',
                          background: 'white',
                          color: '#1e293b',
                          minHeight: 48,
                          cursor: 'pointer'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#64748b', marginBottom: 8 }}>
                        Time *
                      </label>
                      <select
                        value={interviewForm.time}
                        onChange={e => setInterviewForm({ ...interviewForm, time: e.target.value })}
                        style={{
                          width: '100%',
                          padding: 14,
                          borderRadius: 12,
                          border: '2px solid #e2e8f0',
                          fontSize: 15,
                          boxSizing: 'border-box',
                          outline: 'none',
                          background: 'white',
                          color: '#1e293b',
                          minHeight: 48,
                          cursor: 'pointer'
                        }}
                      >
                        <option value="">Select Time</option>
                        <option value="09:00">09:00 AM</option>
                        <option value="09:30">09:30 AM</option>
                        <option value="10:00">10:00 AM</option>
                        <option value="10:30">10:30 AM</option>
                        <option value="11:00">11:00 AM</option>
                        <option value="11:30">11:30 AM</option>
                        <option value="12:00">12:00 PM</option>
                        <option value="12:30">12:30 PM</option>
                        <option value="13:00">01:00 PM</option>
                        <option value="13:30">01:30 PM</option>
                        <option value="14:00">02:00 PM</option>
                        <option value="14:30">02:30 PM</option>
                        <option value="15:00">03:00 PM</option>
                        <option value="15:30">03:30 PM</option>
                        <option value="16:00">04:00 PM</option>
                        <option value="16:30">04:30 PM</option>
                        <option value="17:00">05:00 PM</option>
                        <option value="17:30">05:30 PM</option>
                        <option value="18:00">06:00 PM</option>
                        <option value="18:30">06:30 PM</option>
                        <option value="19:00">07:00 PM</option>
                        <option value="19:30">07:30 PM</option>
                        <option value="20:00">08:00 PM</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#64748b', marginBottom: 8 }}>
                        Duration (minutes)
                      </label>
                      <select
                        value={interviewForm.duration}
                        onChange={e => setInterviewForm({ ...interviewForm, duration: e.target.value })}
                        style={{ ...styles.input, width: '100%' }}
                      >
                        <option value="30">30 minutes</option>
                        <option value="45">45 minutes</option>
                        <option value="60">60 minutes</option>
                        <option value="90">90 minutes</option>
                        <option value="120">120 minutes</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#64748b', marginBottom: 8 }}>
                        Interview Type *
                      </label>
                      <select
                        value={interviewForm.locationType}
                        onChange={e => setInterviewForm({ ...interviewForm, locationType: e.target.value })}
                        style={{ ...styles.input, width: '100%' }}
                      >
                        <option value="online">Online</option>
                        <option value="offline">Offline (In-Person)</option>
                      </select>
                    </div>
                  </div>

                  {/* Online Platform Selection */}
                  {interviewForm.locationType === 'online' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#64748b', marginBottom: 8 }}>
                          Platform *
                        </label>
                        <select
                          value={interviewForm.platform}
                          onChange={e => setInterviewForm({ ...interviewForm, platform: e.target.value })}
                          style={{ ...styles.input, width: '100%' }}
                        >
                          <option value="Google Meet">Google Meet</option>
                          <option value="Zoom">Zoom</option>
                          <option value="Microsoft Teams">Microsoft Teams</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#64748b', marginBottom: 8 }}>
                          Meeting Link *
                        </label>
                        <input
                          type="url"
                          value={interviewForm.meetingLink}
                          onChange={e => setInterviewForm({ ...interviewForm, meetingLink: e.target.value })}
                          placeholder="https://meet.google.com/xxx-xxxx-xxx"
                          style={{ ...styles.input, width: '100%' }}
                          required
                        />
                      </div>
                    </div>
                  )}

                  {/* Offline Address */}
                  {interviewForm.locationType === 'offline' && (
                    <div style={{ marginBottom: 20 }}>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#64748b', marginBottom: 8 }}>
                        Office Address *
                      </label>
                      <input
                        type="text"
                        value={interviewForm.address}
                        onChange={e => setInterviewForm({ ...interviewForm, address: e.target.value })}
                        placeholder="Enter office address"
                        style={{ ...styles.input, width: '100%' }}
                      />
                    </div>
                  )}

                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#64748b', marginBottom: 8 }}>
                      Additional Notes
                    </label>
                    <textarea
                      value={interviewForm.notes}
                      onChange={e => setInterviewForm({ ...interviewForm, notes: e.target.value })}
                      placeholder="Any additional information for the candidate or interviewer..."
                      rows={4}
                      style={{ ...styles.input, width: '100%', resize: 'vertical' }}
                    />
                  </div>
                </div>

                {/* Modal Footer */}
                <div style={{
                  padding: '20px 32px',
                  borderTop: '1px solid #e2e8f0',
                  display: 'flex',
                  gap: 12,
                  justifyContent: 'flex-end'
                }}>
                  <button
                    onClick={() => {
                      setShowInterviewModal(false);
                      setInterviewCandidate(null);
                    }}
                    style={{
                      ...styles.btn2,
                      padding: '12px 24px'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (!interviewForm.title || !interviewForm.date || !interviewForm.time || !interviewForm.interviewer) {
                        pop('Please fill in all required fields');
                        return;
                      }
                      // Validate meeting link for online interviews
                      if (interviewForm.locationType === 'online' && !interviewForm.meetingLink) {
                        pop('Meeting link is required for online interviews');
                        return;
                      }
                      // Validate address for offline interviews
                      if (interviewForm.locationType === 'offline' && !interviewForm.address) {
                        pop('Office address is required for in-person interviews');
                        return;
                      }
                      setShowInterviewEmailPreview(true);
                    }}
                    style={{
                      ...styles.btn1,
                      padding: '12px 24px'
                    }}
                  >
                    Preview & Send →
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Email Preview - Part 1 */}
                <div style={{ padding: '32px' }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', marginBottom: 16 }}>
                    📧 Email Preview
                  </h3>

                  {/* Email Template */}
                  <div style={{
                    border: '2px solid #e2e8f0',
                    borderRadius: 12,
                    overflow: 'hidden',
                    marginBottom: 24
                  }}>
                    {/* Email Header */}
                    <div style={{
                      background: 'linear-gradient(135deg, #44924c, #2d6a33)',
                      padding: '32px',
                      textAlign: 'center'
                    }}>
                      <div style={{
                        fontSize: 32,
                        marginBottom: 8
                      }}>🌍</div>
                      <h2 style={{
                        color: 'white',
                        fontSize: 24,
                        fontWeight: 600,
                        margin: 0
                      }}>AI Planet</h2>
                      <p style={{
                        color: 'rgba(255,255,255,0.9)',
                        fontSize: 14,
                        margin: '8px 0 0'
                      }}>Interview Invitation</p>
                    </div>

                    {/* Email Body */}
                    <div style={{ padding: '32px', background: 'white' }}>
                      <p style={{ fontSize: 15, color: '#1e293b', marginBottom: 16 }}>
                        Dear {interviewCandidate.name},
                      </p>
                      <p style={{ fontSize: 15, color: '#1e293b', marginBottom: 16, lineHeight: 1.6 }}>
                        We are pleased to invite you for an interview for the <strong>{interviewCandidate.role}</strong> position at AI Planet.
                      </p>

                      {/* Interview Details Card */}
                      <div style={{
                        background: '#f8fafc',
                        border: '2px solid #e2e8f0',
                        borderRadius: 12,
                        padding: 24,
                        marginBottom: 24
                      }}>
                        <h4 style={{
                          fontSize: 16,
                          fontWeight: 600,
                          color: '#1e293b',
                          marginBottom: 16
                        }}>📅 Interview Details</h4>

                        <div style={{ display: 'grid', gap: 12 }}>
                          <div style={{ display: 'flex', gap: 12 }}>
                            <span style={{ fontSize: 14, color: '#64748b', minWidth: 100 }}>Title:</span>
                            <span style={{ fontSize: 14, color: '#1e293b', fontWeight: 500 }}>{interviewForm.title}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 12 }}>
                            <span style={{ fontSize: 14, color: '#64748b', minWidth: 100 }}>Date:</span>
                            <span style={{ fontSize: 14, color: '#1e293b', fontWeight: 500 }}>
                              {new Date(interviewForm.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: 12 }}>
                            <span style={{ fontSize: 14, color: '#64748b', minWidth: 100 }}>Time:</span>
                            <span style={{ fontSize: 14, color: '#1e293b', fontWeight: 500 }}>{interviewForm.time}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 12 }}>
                            <span style={{ fontSize: 14, color: '#64748b', minWidth: 100 }}>Duration:</span>
                            <span style={{ fontSize: 14, color: '#1e293b', fontWeight: 500 }}>{interviewForm.duration} minutes</span>
                          </div>
                          <div style={{ display: 'flex', gap: 12 }}>
                            <span style={{ fontSize: 14, color: '#64748b', minWidth: 100 }}>Interviewer:</span>
                            <span style={{ fontSize: 14, color: '#1e293b', fontWeight: 500 }}>{interviewForm.interviewer}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 12 }}>
                            <span style={{ fontSize: 14, color: '#64748b', minWidth: 100 }}>Type:</span>
                            <span style={{ fontSize: 14, color: '#1e293b', fontWeight: 500 }}>
                              {interviewForm.locationType === 'online' ? '💻 Online' : '🏢 In-Person'}
                            </span>
                          </div>
                          {interviewForm.locationType === 'online' ? (
                            <>
                              <div style={{ display: 'flex', gap: 12 }}>
                                <span style={{ fontSize: 14, color: '#64748b', minWidth: 100 }}>Platform:</span>
                                <span style={{ fontSize: 14, color: '#1e293b', fontWeight: 500 }}>{interviewForm.platform}</span>
                              </div>
                              {interviewForm.meetingLink && (
                                <div style={{ display: 'flex', gap: 12 }}>
                                  <span style={{ fontSize: 14, color: '#64748b', minWidth: 100 }}>Meeting Link:</span>
                                  <a href={interviewForm.meetingLink} style={{ fontSize: 14, color: '#44924c', fontWeight: 500, textDecoration: 'none' }}>
                                    Join Meeting →
                                  </a>
                                </div>
                              )}
                            </>
                          ) : (
                            <div style={{ display: 'flex', gap: 12 }}>
                              <span style={{ fontSize: 14, color: '#64748b', minWidth: 100 }}>Address:</span>
                              <span style={{ fontSize: 14, color: '#1e293b', fontWeight: 500 }}>{interviewForm.address}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {interviewForm.notes && (
                        <div style={{
                          background: '#fef3c7',
                          border: '2px solid #fde047',
                          borderRadius: 12,
                          padding: 16,
                          marginBottom: 24
                        }}>
                          <p style={{ fontSize: 14, color: '#92400e', margin: 0, lineHeight: 1.6 }}>
                            <strong>Note:</strong> {interviewForm.notes}
                          </p>
                        </div>
                      )}

                      <p style={{ fontSize: 15, color: '#1e293b', marginBottom: 16, lineHeight: 1.6 }}>
                        A calendar invitation has been sent to your email. Please confirm your attendance at your earliest convenience.
                      </p>

                      <p style={{ fontSize: 15, color: '#1e293b', marginBottom: 16, lineHeight: 1.6 }}>
                        If you have any questions or need to reschedule, please don't hesitate to reach out.
                      </p>

                      <p style={{ fontSize: 15, color: '#1e293b', marginBottom: 8, lineHeight: 1.6 }}>
                        Best regards,<br />
                        <strong>AI Planet Recruitment Team</strong>
                      </p>
                    </div>

                    {/* Email Footer */}
                    <div style={{
                      background: '#f8fafc',
                      padding: '24px',
                      borderTop: '1px solid #e2e8f0',
                      textAlign: 'center'
                    }}>
                      <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
                        © 2026 AI Planet. All rights reserved.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div style={{
                  padding: '20px 32px',
                  borderTop: '1px solid #e2e8f0',
                  display: 'flex',
                  gap: 12,
                  justifyContent: 'space-between'
                }}>
                  <button
                    onClick={() => setShowInterviewEmailPreview(false)}
                    style={{
                      ...styles.btn2,
                      padding: '12px 24px'
                    }}
                  >
                    ← Back to Edit
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        if (interviewForm.isEditing && interviewForm.editingInterviewId) {
                          // Update existing interview in database
                          await interviewsAPI.update(interviewForm.editingInterviewId, {
                            title: interviewForm.title,
                            scheduledDate: interviewForm.date,
                            scheduledTime: interviewForm.time,
                            durationMinutes: parseInt(interviewForm.duration),
                            locationType: interviewForm.locationType,
                            platform: interviewForm.platform,
                            meetingLink: interviewForm.meetingLink,
                            address: interviewForm.address,
                            interviewerName: interviewForm.interviewer,
                            notes: interviewForm.notes
                          });

                          // Send updated email invitations with calendar invites
                          const selectedInterviewer = admins.find(a => a.name === interviewForm.interviewer);
                          try {
                            await emailAPI.sendInterviewWithCalendar({
                              candidateName: interviewCandidate.name,
                              candidateEmail: interviewCandidate.email,
                              jobTitle: interviewCandidate.role,
                              interviewTitle: interviewForm.title,
                              scheduledDate: interviewForm.date,
                              scheduledTime: interviewForm.time,
                              durationMinutes: parseInt(interviewForm.duration),
                              locationType: interviewForm.locationType,
                              platform: interviewForm.platform,
                              meetingLink: interviewForm.meetingLink,
                              address: interviewForm.address,
                              interviewerName: interviewForm.interviewer,
                              interviewerEmail: selectedInterviewer?.email || null,
                              notes: interviewForm.notes
                            });
                            console.log('✅ Updated interview emails sent successfully');
                          } catch (emailError) {
                            console.error('Failed to send updated interview emails:', emailError);
                          }

                          const updatedInterview = {
                            id: interviewForm.editingInterviewId,
                            round: interviewForm.editingRound,
                            date: interviewForm.date,
                            time: interviewForm.time,
                            interviewer: interviewForm.interviewer,
                            title: interviewForm.title,
                            duration: interviewForm.duration,
                            locationType: interviewForm.locationType,
                            platform: interviewForm.platform,
                            meetingLink: interviewForm.meetingLink,
                            address: interviewForm.address,
                            notes: interviewForm.notes,
                            feedback: null,
                            rating: null,
                            status: 'Scheduled'
                          };

                          // Update candidate with edited interview and comment
                          setPeople(p => p.map(c => c.id === interviewCandidate.id ? {
                            ...c,
                            interviewRounds: (c.interviewRounds || []).map(ir =>
                              ir.round === interviewForm.editingRound ? updatedInterview : ir
                            ),
                            comments: [...(c.comments || []), {
                              id: Date.now(),
                              text: `Interview updated: ${interviewForm.title} rescheduled to ${new Date(interviewForm.date).toLocaleDateString()} at ${interviewForm.time} with ${interviewForm.interviewer}`,
                              author: currentUser?.name || 'Admin',
                              timestamp: new Date().toLocaleString(),
                              stage: c.stage
                            }]
                          } : c));

                          // Update selectedCandidate if it's the same person
                          if (selectedCandidate?.id === interviewCandidate.id) {
                            setSelectedCandidate(prev => ({
                              ...prev,
                              interviewRounds: (prev.interviewRounds || []).map(ir =>
                                ir.round === interviewForm.editingRound ? updatedInterview : ir
                              )
                            }));
                          }

                          pop(`✅ Interview updated! New invitation sent to ${interviewCandidate.name} and ${interviewForm.interviewer}`);
                        } else {
                          // Create new interview in database
                          const applicationId = interviewCandidate._original?.id || interviewCandidate.id;
                          const candidateId = interviewCandidate.candidateId || null;
                          const jobId = interviewCandidate.jobId || null;

                          const response = await interviewsAPI.create({
                            applicationId,
                            candidateId,
                            jobId,
                            title: interviewForm.title,
                            type: interviewForm.locationType,
                            scheduledDate: interviewForm.date,
                            scheduledTime: interviewForm.time,
                            durationMinutes: parseInt(interviewForm.duration),
                            locationType: interviewForm.locationType,
                            platform: interviewForm.platform,
                            meetingLink: interviewForm.meetingLink,
                            address: interviewForm.address,
                            interviewerName: interviewForm.interviewer,
                            notes: interviewForm.notes,
                            scheduledBy: currentUser?.name || 'Admin'
                          });

                          // Send email invitations with calendar invites
                          const selectedInterviewer = admins.find(a => a.name === interviewForm.interviewer);
                          try {
                            await emailAPI.sendInterviewWithCalendar({
                              candidateName: interviewCandidate.name,
                              candidateEmail: interviewCandidate.email,
                              jobTitle: interviewCandidate.role,
                              interviewTitle: interviewForm.title,
                              scheduledDate: interviewForm.date,
                              scheduledTime: interviewForm.time,
                              durationMinutes: parseInt(interviewForm.duration),
                              locationType: interviewForm.locationType,
                              platform: interviewForm.platform,
                              meetingLink: interviewForm.meetingLink,
                              address: interviewForm.address,
                              interviewerName: interviewForm.interviewer,
                              interviewerEmail: selectedInterviewer?.email || null,
                              notes: interviewForm.notes
                            });
                            console.log('✅ Interview emails sent successfully');
                          } catch (emailError) {
                            console.error('Failed to send interview emails:', emailError);
                            // Don't fail the whole operation if email fails
                          }

                          const savedInterview = response;
                          const newInterview = {
                            id: savedInterview?.id,
                            round: (interviewCandidate.interviewRounds?.length || 0) + 1,
                            date: interviewForm.date,
                            time: interviewForm.time,
                            interviewer: interviewForm.interviewer,
                            title: interviewForm.title,
                            duration: interviewForm.duration,
                            locationType: interviewForm.locationType,
                            platform: interviewForm.platform,
                            meetingLink: interviewForm.meetingLink,
                            address: interviewForm.address,
                            notes: interviewForm.notes,
                            feedback: null,
                            rating: null,
                            status: 'Scheduled'
                          };

                          // Update candidate with new interview and comment
                          setPeople(p => p.map(c => c.id === interviewCandidate.id ? {
                            ...c,
                            interviewRounds: [...(c.interviewRounds || []), newInterview],
                            comments: [...(c.comments || []), {
                              id: Date.now(),
                              text: `Interview scheduled: ${interviewForm.title} on ${new Date(interviewForm.date).toLocaleDateString()} at ${interviewForm.time} with ${interviewForm.interviewer}`,
                              author: currentUser?.name || 'Admin',
                              timestamp: new Date().toLocaleString(),
                              stage: c.stage
                            }]
                          } : c));

                          pop(`✅ Interview scheduled! Email invitation sent to ${interviewCandidate.name} and ${interviewForm.interviewer}`);
                        }
                      } catch (error) {
                        console.error('Error saving interview:', error);
                        pop('❌ Failed to save interview. Please try again.');
                        return;
                      }

                      // Close modal and reset form
                      const candidateIdToRefresh = interviewCandidate.id;
                      setShowInterviewModal(false);
                      setInterviewCandidate(null);
                      setShowInterviewEmailPreview(false);
                      setInterviewForm({
                        title: '',
                        date: '',
                        time: '',
                        interviewer: '',
                        duration: '60',
                        locationType: 'online',
                        platform: 'Google Meet',
                        meetingLink: '',
                        address: '',
                        notes: '',
                        isEditing: false
                      });
                      // Refresh data to get latest state
                      await refreshData(candidateIdToRefresh);
                    }}
                    style={{
                      ...styles.btn1,
                      padding: '12px 24px'
                    }}
                  >
                    {interviewForm.isEditing ? '📧 Update & Resend Invites' : '📧 Confirm & Send Invites'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Assignment Review Modal */}
      {showAssignmentReviewModal && assignmentToReview && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100
        }}>
          <div style={{
            background: 'white',
            borderRadius: 16,
            maxWidth: 600,
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '24px 32px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', margin: 0 }}>
                  Review Assignment
                </h2>
                <p style={{ fontSize: 14, color: '#64748b', margin: '4px 0 0' }}>
                  {selectedCandidate?.name} - {assignmentToReview.assignmentName}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAssignmentReviewModal(false);
                  setAssignmentToReview(null);
                }}
                style={{
                  background: '#f8fafc',
                  border: 'none',
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontSize: 18,
                  color: '#64748b'
                }}
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '32px' }}>
              {/* Assignment Details */}
              <div style={{
                padding: 16,
                background: '#f8fafc',
                borderRadius: 12,
                marginBottom: 24
              }}>
                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>Assignment Details</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>Sent Date</div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#1e293b' }}>
                      {new Date(assignmentToReview.sentAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>Deadline</div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#1e293b' }}>
                      {new Date(assignmentToReview.deadlineDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>Current Status</div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#1e293b', textTransform: 'capitalize' }}>
                      {assignmentToReview.status}
                    </div>
                  </div>
                </div>
              </div>

              {/* Rating */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#64748b', marginBottom: 12 }}>
                  Assignment Rating
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => setAssignmentReviewForm(prev => ({ ...prev, rating: star }))}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: 32,
                        cursor: 'pointer',
                        padding: 4,
                        opacity: star <= assignmentReviewForm.rating ? 1 : 0.3,
                        transition: 'all 0.15s'
                      }}
                    >
                      ⭐
                    </button>
                  ))}
                  <span style={{
                    marginLeft: 12,
                    fontSize: 16,
                    fontWeight: 600,
                    color: '#1e293b',
                    alignSelf: 'center'
                  }}>
                    {assignmentReviewForm.rating > 0 ? `${assignmentReviewForm.rating}/5` : 'Not rated'}
                  </span>
                </div>
              </div>

              {/* Review Decision */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#64748b', marginBottom: 12 }}>
                  Review Decision *
                </label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={() => setAssignmentReviewForm(prev => ({ ...prev, status: 'passed' }))}
                    style={{
                      flex: 1,
                      padding: '16px',
                      background: assignmentReviewForm.status === 'passed' ? '#dcfce7' : '#f8fafc',
                      border: `2px solid ${assignmentReviewForm.status === 'passed' ? '#22c55e' : '#e2e8f0'}`,
                      borderRadius: 12,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      transition: 'all 0.2s'
                    }}
                  >
                    <span style={{ fontSize: 24 }}>✅</span>
                    <span style={{ fontSize: 16, fontWeight: 600, color: '#166534' }}>Pass & Proceed</span>
                  </button>
                  <button
                    onClick={() => setAssignmentReviewForm(prev => ({ ...prev, status: 'failed' }))}
                    style={{
                      flex: 1,
                      padding: '16px',
                      background: assignmentReviewForm.status === 'failed' ? '#fef2f2' : '#f8fafc',
                      border: `2px solid ${assignmentReviewForm.status === 'failed' ? '#ef4444' : '#e2e8f0'}`,
                      borderRadius: 12,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      transition: 'all 0.2s'
                    }}
                  >
                    <span style={{ fontSize: 24 }}>❌</span>
                    <span style={{ fontSize: 16, fontWeight: 600, color: '#dc2626' }}>Reject</span>
                  </button>
                </div>
              </div>

              {/* Feedback */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#64748b', marginBottom: 8 }}>
                  Feedback / Notes
                </label>
                <textarea
                  value={assignmentReviewForm.feedback}
                  onChange={e => setAssignmentReviewForm(prev => ({ ...prev, feedback: e.target.value }))}
                  placeholder="Add your feedback about the assignment submission..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: 12,
                    borderRadius: 10,
                    border: '1px solid #e2e8f0',
                    fontSize: 14,
                    fontFamily: "'Work Sans', system-ui, sans-serif",
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Info Box for Pass */}
              {assignmentReviewForm.status === 'passed' && (
                <div style={{
                  padding: 16,
                  background: '#f0fdf4',
                  borderRadius: 12,
                  border: '1px solid #86efac',
                  marginBottom: 24
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 18 }}>📅</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#166534' }}>Next Step: Schedule Interview</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#15803d' }}>
                    After confirming, you'll be prompted to schedule the next interview round with {selectedCandidate?.name}.
                  </div>
                </div>
              )}

              {/* Info Box for Reject */}
              {assignmentReviewForm.status === 'failed' && (
                <div style={{
                  padding: 16,
                  background: '#fef2f2',
                  borderRadius: 12,
                  border: '1px solid #fecaca',
                  marginBottom: 24
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 18 }}>⚠️</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#dc2626' }}>Candidate will be rejected</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#b91c1c' }}>
                    The candidate will be moved to the Rejected stage. This action can be reversed later if needed.
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '20px 32px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              gap: 12,
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setShowAssignmentReviewModal(false);
                  setAssignmentToReview(null);
                }}
                style={{
                  padding: '12px 24px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#64748b',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    // Update assignment status in database (only if we have a valid MongoDB ID)
                    const assignmentId = assignmentToReview.id;
                    if (assignmentId && assignmentId.length === 24) { // MongoDB ObjectId length
                      await assignmentsAPI.updateCandidateStatus(assignmentId, {
                        status: assignmentReviewForm.status === 'passed' ? 'reviewed' : 'failed',
                        score: assignmentReviewForm.rating,
                        reviewNotes: assignmentReviewForm.feedback,
                        reviewedBy: currentUser?.name || 'Admin'
                      });
                    } else {
                      console.log('⚠️ Assignment ID not valid for DB update:', assignmentId);
                    }

                    // Update candidate stage
                    const newStage = assignmentReviewForm.status === 'passed' ? 'interview' : 'rejected';
                    await applicationsAPI.update(selectedCandidate._original?.id || selectedCandidate.id, {
                      stage: newStage,
                      last_activity_at: new Date().toISOString()
                    });

                    // Update local state
                    setPeople(p => p.map(c => c.id === selectedCandidate.id ? {
                      ...c,
                      stage: newStage,
                      comments: [...(c.comments || []), {
                        id: Date.now(),
                        text: `Assignment reviewed: ${assignmentReviewForm.status === 'passed' ? 'Passed' : 'Rejected'} (Rating: ${assignmentReviewForm.rating}/5)${assignmentReviewForm.feedback ? ` - ${assignmentReviewForm.feedback}` : ''}`,
                        author: currentUser?.name || 'Admin',
                        timestamp: new Date().toLocaleString(),
                        stage: newStage
                      }]
                    } : c));

                    // Update selectedCandidate
                    setSelectedCandidate(prev => prev ? {
                      ...prev,
                      stage: newStage
                    } : null);

                    // Update candidateAssignments state with the new status
                    setCandidateAssignments(prev => prev.map((a, idx) =>
                      idx === 0 ? {
                        ...a,
                        status: assignmentReviewForm.status === 'passed' ? 'reviewed' : 'failed',
                        score: assignmentReviewForm.rating,
                        reviewNotes: assignmentReviewForm.feedback,
                        reviewedBy: currentUser?.name || 'Admin',
                        reviewedAt: new Date().toISOString()
                      } : a
                    ));

                    // Close review modal and select assignment modal
                    const candidateIdToRefresh = selectedCandidate.id;
                    setShowAssignmentReviewModal(false);
                    setAssignmentToReview(null);
                    setModal(null);

                    if (assignmentReviewForm.status === 'passed') {
                      // Refresh data and open interview scheduling modal
                      pop('✅ Assignment marked as passed! Now schedule the interview.');
                      await refreshData(candidateIdToRefresh);
                      setInterviewCandidate(selectedCandidate);
                      setInterviewForm({
                        title: `Interview Round ${(selectedCandidate.interviewRounds?.length || 0) + 1}`,
                        date: '',
                        time: '',
                        interviewer: '',
                        duration: '60',
                        locationType: 'online',
                        platform: 'Google Meet',
                        meetingLink: '',
                        address: '',
                        notes: '',
                        isEditing: false
                      });
                      setShowInterviewModal(true);
                    } else {
                      pop('❌ Assignment rejected. Candidate moved to Rejected stage.');
                      // Refresh data to get latest state
                      await refreshData(candidateIdToRefresh);
                    }
                  } catch (error) {
                    console.error('Error updating assignment:', error);
                    pop('❌ Failed to update assignment. Please try again.');
                  }
                }}
                style={{
                  padding: '12px 24px',
                  background: assignmentReviewForm.status === 'passed'
                    ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                    : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                {assignmentReviewForm.status === 'passed' ? (
                  <>✅ Confirm & Schedule Interview</>
                ) : (
                  <>❌ Confirm Rejection</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Assignment Confirmation Modal */}
      {showDeleteAssignmentModal && assignmentToDelete && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100
        }}>
          <div style={{
            background: 'white',
            borderRadius: 16,
            maxWidth: 450,
            width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '24px 28px',
              background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
              borderBottom: '1px solid #fecaca',
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: '#fecaca',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24
              }}>
                ⚠️
              </div>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 600, color: '#dc2626', margin: 0 }}>
                  Delete Assignment
                </h2>
                <p style={{ fontSize: 14, color: '#b91c1c', margin: '4px 0 0' }}>
                  This action cannot be undone
                </p>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px 28px' }}>
              <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.6, margin: 0 }}>
                Are you sure you want to delete the assignment <strong style={{ color: '#1e293b' }}>"{assignmentToDelete.name}"</strong>?
              </p>
              <div style={{
                marginTop: 16,
                padding: 12,
                background: '#fef2f2',
                borderRadius: 10,
                border: '1px solid #fecaca'
              }}>
                <div style={{ fontSize: 13, color: '#b91c1c', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ fontSize: 14, marginTop: 1 }}>💡</span>
                  <span>This will permanently remove this assignment. Any assignments already sent to candidates will not be affected.</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 28px 24px',
              display: 'flex',
              gap: 12,
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setShowDeleteAssignmentModal(false);
                  setAssignmentToDelete(null);
                }}
                style={{
                  padding: '12px 24px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#64748b',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteAssignment}
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 0.2s'
                }}
              >
                🗑️ Delete Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Details Modal */}
      {showAssignmentDetailsModal && assignmentToView && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20
        }} onClick={() => { setShowAssignmentDetailsModal(false); setAssignmentToView(null); }}>
          <div style={{
            background: 'white',
            borderRadius: 20,
            width: '100%',
            maxWidth: 700,
            maxHeight: '90vh',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            animation: 'slideUp 0.3s ease'
          }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              padding: '24px 28px',
              color: 'white'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{
                    width: 56,
                    height: 56,
                    background: 'rgba(255,255,255,0.2)',
                    borderRadius: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 28
                  }}>📝</div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{assignmentToView.name}</h2>
                    <p style={{ margin: '6px 0 0', opacity: 0.85, fontSize: 14 }}>
                      Created {assignmentToView.createdAt} by {assignmentToView.createdBy}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setShowAssignmentDetailsModal(false); setAssignmentToView(null); }}
                  style={{
                    width: 36,
                    height: 36,
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    borderRadius: 10,
                    color: 'white',
                    fontSize: 18,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >×</button>
              </div>
            </div>

            {/* Content */}
            <div style={{ padding: 28, maxHeight: 'calc(90vh - 180px)', overflowY: 'auto' }}>
              {/* Job Types */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Applicable Job Types
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {assignmentToView.jobTypes.map((jobType, idx) => (
                    <span key={idx} style={{
                      padding: '8px 16px',
                      background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                      color: '#1e40af',
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 600,
                      border: '1px solid #bfdbfe'
                    }}>
                      {jobType}
                    </span>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Instructions
                </div>
                <div style={{
                  background: '#f8fafc',
                  borderRadius: 12,
                  padding: 20,
                  border: '1px solid #e2e8f0'
                }}>
                  <div
                    style={{ fontSize: 14, color: '#334155', lineHeight: 1.7 }}
                    dangerouslySetInnerHTML={{ __html: assignmentToView.instructions || '<em>No instructions provided</em>' }}
                  />
                </div>
              </div>

              {/* Deadline */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Deadline
                </div>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  background: '#fef3c7',
                  padding: '10px 16px',
                  borderRadius: 10,
                  border: '1px solid #fde68a'
                }}>
                  <span style={{ fontSize: 18 }}>⏱️</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#92400e' }}>{assignmentToView.deadline}</span>
                </div>
              </div>

              {/* Link */}
              {assignmentToView.link && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Assignment Link
                  </div>
                  <a
                    href={assignmentToView.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 10,
                      background: '#f0fdf4',
                      padding: '12px 18px',
                      borderRadius: 10,
                      border: '1px solid #86efac',
                      color: '#166534',
                      textDecoration: 'none',
                      fontSize: 14,
                      fontWeight: 500,
                      transition: 'all 0.2s'
                    }}
                  >
                    <span>🔗</span>
                    <span style={{ maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {assignmentToView.link}
                    </span>
                    <span style={{ marginLeft: 4 }}>↗</span>
                  </a>
                </div>
              )}

              {/* Files */}
              {assignmentToView.files && assignmentToView.files.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Attached Files ({assignmentToView.files.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {assignmentToView.files.map((file, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        background: '#f8fafc',
                        padding: '12px 16px',
                        borderRadius: 10,
                        border: '1px solid #e2e8f0'
                      }}>
                        <span style={{
                          width: 40,
                          height: 40,
                          background: '#eff6ff',
                          borderRadius: 10,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 18
                        }}>📎</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{file.name || file}</div>
                          {file.type && <div style={{ fontSize: 12, color: '#64748b' }}>{file.type}</div>}
                        </div>
                        {file.url && (
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              padding: '8px 14px',
                              background: '#6366f1',
                              color: 'white',
                              borderRadius: 8,
                              fontSize: 12,
                              fontWeight: 600,
                              textDecoration: 'none'
                            }}
                          >
                            Download
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '16px 28px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 12,
              background: '#f8fafc'
            }}>
              <button
                onClick={() => { setShowAssignmentDetailsModal(false); setAssignmentToView(null); }}
                style={{
                  padding: '12px 24px',
                  background: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#64748b',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowAssignmentDetailsModal(false);
                  setSelectedAssignment(assignmentToView);
                  setAssignmentForm({
                    name: assignmentToView.name,
                    jobTypes: assignmentToView.jobTypes,
                    instructions: assignmentToView.instructions,
                    link: assignmentToView.link,
                    files: assignmentToView.files,
                    deadline: assignmentToView.deadline
                  });
                  setModal('createAssignment');
                  setAssignmentToView(null);
                }}
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                ✏️ Edit Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Offer Modal */}
      {showOfferModal && offerCandidate && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20
        }}>
          <div style={{
            background: 'white',
            borderRadius: 16,
            maxWidth: 800,
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '24px 32px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'
            }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 600, color: '#166534', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>{offerForm.editingOfferId ? '✏️' : '🎉'}</span> {offerForm.editingOfferId ? 'Edit & Resend Offer' : 'Send Job Offer'}
                </h2>
                <p style={{ fontSize: 14, color: '#15803d', margin: '4px 0 0' }}>
                  {offerCandidate.name} - {offerCandidate.role}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowOfferModal(false);
                  setOfferCandidate(null);
                  setOfferFile(null);
                }}
                style={{
                  background: 'white',
                  border: 'none',
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontSize: 18,
                  color: '#64748b'
                }}
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '32px' }}>
              {/* Offer Type Selection */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 12 }}>
                  Offer Type
                </label>
                <div style={{ display: 'flex', gap: 12 }}>
                  {[
                    { value: 'text', label: '📝 Text', desc: 'Type offer details directly' },
                    { value: 'pdf', label: '📄 PDF', desc: 'Upload PDF offer letter' },
                    { value: 'word', label: '📃 Word', desc: 'Upload Word document' }
                  ].map(type => (
                    <button
                      key={type.value}
                      onClick={() => setOfferForm({ ...offerForm, offerType: type.value })}
                      style={{
                        flex: 1,
                        padding: '16px',
                        border: offerForm.offerType === type.value ? '2px solid #10b981' : '2px solid #e5e7eb',
                        borderRadius: 12,
                        background: offerForm.offerType === type.value ? '#f0fdf4' : 'white',
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{ fontSize: 20, marginBottom: 4 }}>{type.label.split(' ')[0]}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: offerForm.offerType === type.value ? '#166534' : '#374151' }}>{type.label.split(' ')[1]}</div>
                      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>{type.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Compensation Section */}
              <div style={{ background: '#f8fafc', borderRadius: 12, padding: 20, marginBottom: 24 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>💰</span> Compensation Package
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#64748b', marginBottom: 6 }}>
                      Annual Salary (CTC) *
                    </label>
                    <input
                      type="text"
                      value={offerForm.salary}
                      onChange={e => setOfferForm({ ...offerForm, salary: e.target.value })}
                      placeholder="e.g. 12,00,000"
                      style={{ ...styles.input, width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#64748b', marginBottom: 6 }}>
                      Currency
                    </label>
                    <select
                      value={offerForm.salaryCurrency}
                      onChange={e => setOfferForm({ ...offerForm, salaryCurrency: e.target.value })}
                      style={{ ...styles.input, width: '100%' }}
                    >
                      <option value="INR">INR (₹)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#64748b', marginBottom: 6 }}>
                      Bonus
                    </label>
                    <input
                      type="text"
                      value={offerForm.bonus}
                      onChange={e => setOfferForm({ ...offerForm, bonus: e.target.value })}
                      placeholder="e.g. Performance bonus up to 15%"
                      style={{ ...styles.input, width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#64748b', marginBottom: 6 }}>
                      Equity/ESOP
                    </label>
                    <input
                      type="text"
                      value={offerForm.equity}
                      onChange={e => setOfferForm({ ...offerForm, equity: e.target.value })}
                      placeholder="e.g. 0.05% vesting over 4 years"
                      style={{ ...styles.input, width: '100%' }}
                    />
                  </div>
                </div>
              </div>

              {/* Benefits & Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#64748b', marginBottom: 8 }}>
                    Benefits
                  </label>
                  <textarea
                    value={offerForm.benefits}
                    onChange={e => setOfferForm({ ...offerForm, benefits: e.target.value })}
                    placeholder="Health insurance, meal allowance, learning budget..."
                    rows={3}
                    style={{ ...styles.input, width: '100%', resize: 'vertical' }}
                  />
                </div>
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#64748b', marginBottom: 8 }}>
                      Proposed Start Date *
                    </label>
                    <input
                      type="date"
                      value={offerForm.startDate}
                      onChange={e => setOfferForm({ ...offerForm, startDate: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      style={{ ...styles.input, width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#64748b', marginBottom: 8 }}>
                      Response Deadline
                    </label>
                    <input
                      type="date"
                      value={offerForm.expiryDate}
                      onChange={e => setOfferForm({ ...offerForm, expiryDate: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      style={{ ...styles.input, width: '100%' }}
                    />
                  </div>
                </div>
              </div>

              {/* Text Offer Content */}
              {offerForm.offerType === 'text' && (
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#64748b', marginBottom: 8 }}>
                    Offer Letter Content
                  </label>
                  <textarea
                    value={offerForm.offerContent}
                    onChange={e => setOfferForm({ ...offerForm, offerContent: e.target.value })}
                    placeholder="Enter the full offer letter content here. You can include details about the role, responsibilities, and any other terms..."
                    rows={8}
                    style={{ ...styles.input, width: '100%', resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </div>
              )}

              {/* File Upload for PDF/Word */}
              {(offerForm.offerType === 'pdf' || offerForm.offerType === 'word') && (
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#64748b', marginBottom: 8 }}>
                    Upload Offer Letter ({offerForm.offerType.toUpperCase()})
                  </label>
                  <div style={{
                    border: '2px dashed #d1d5db',
                    borderRadius: 12,
                    padding: 32,
                    textAlign: 'center',
                    background: '#f9fafb',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="file"
                      accept={offerForm.offerType === 'pdf' ? '.pdf' : '.doc,.docx'}
                      onChange={e => {
                        if (e.target.files[0]) {
                          setOfferFile(e.target.files[0]);
                        }
                      }}
                      style={{ display: 'none' }}
                      id="offer-file-upload"
                    />
                    <label htmlFor="offer-file-upload" style={{ cursor: 'pointer' }}>
                      {offerFile ? (
                        <div>
                          <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#10b981' }}>{offerFile.name}</div>
                          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Click to change file</div>
                        </div>
                      ) : offerForm.existingFile?.url ? (
                        <div>
                          <div style={{ fontSize: 32, marginBottom: 8 }}>📎</div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#3b82f6' }}>{offerForm.existingFile.name || 'Existing offer letter'}</div>
                          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Click to upload a new file (optional)</div>
                          <a
                            href={offerForm.existingFile.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            style={{ fontSize: 12, color: '#3b82f6', marginTop: 8, display: 'inline-block' }}
                          >
                            View current file
                          </a>
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontSize: 32, marginBottom: 8 }}>📤</div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Click to upload {offerForm.offerType.toUpperCase()} file</div>
                          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>or drag and drop</div>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              )}

              {/* Terms & Conditions */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#64748b', marginBottom: 8 }}>
                  Terms & Conditions (Optional)
                </label>
                <textarea
                  value={offerForm.termsAndConditions}
                  onChange={e => setOfferForm({ ...offerForm, termsAndConditions: e.target.value })}
                  placeholder="Any specific terms and conditions for this offer..."
                  rows={3}
                  style={{ ...styles.input, width: '100%', resize: 'vertical' }}
                />
              </div>

              {/* Internal Notes */}
              <div style={{ background: '#fef3c7', borderRadius: 12, padding: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#92400e', marginBottom: 8 }}>
                  🔒 Internal Notes (Not sent to candidate)
                </label>
                <textarea
                  value={offerForm.internalNotes}
                  onChange={e => setOfferForm({ ...offerForm, internalNotes: e.target.value })}
                  placeholder="Any internal notes about this offer, negotiation history, etc..."
                  rows={2}
                  style={{ ...styles.input, width: '100%', resize: 'vertical', background: 'white' }}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '20px 32px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              gap: 12,
              justifyContent: 'flex-end',
              background: '#f8fafc'
            }}>
              <button
                onClick={() => {
                  setShowOfferModal(false);
                  setOfferCandidate(null);
                  setOfferFile(null);
                }}
                style={{
                  ...styles.btn2,
                  padding: '12px 24px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  // Validation
                  if (!offerForm.salary) {
                    pop('Please enter the salary');
                    return;
                  }
                  if (!offerForm.startDate) {
                    pop('Please select a start date');
                    return;
                  }
                  // For PDF/Word offers, require file upload unless editing and existing file exists
                  const hasExistingFile = offerForm.existingFile?.url;
                  if (offerForm.offerType !== 'text' && !offerFile && !hasExistingFile) {
                    pop(`Please upload the ${offerForm.offerType.toUpperCase()} offer letter`);
                    return;
                  }

                  setSendingOffer(true);
                  try {
                    const isEditing = !!offerForm.editingOfferId;

                    // Handle file upload if PDF/Word offer type
                    let uploadedFile = null;
                    if (offerForm.offerType !== 'text' && offerFile) {
                      try {
                        pop('Uploading offer letter...');
                        console.log('Starting file upload:', offerFile.name, offerFile.type, offerFile.size);
                        const uploadResult = await uploadAPI.uploadFile(offerFile);
                        console.log('Upload result:', uploadResult);
                        // API returns: { success, fileUrl, key, size, mimeType, originalName }
                        if (uploadResult.success && uploadResult.fileUrl) {
                          uploadedFile = {
                            name: offerFile.name,
                            url: uploadResult.fileUrl,
                            key: uploadResult.key,
                            type: offerFile.type
                          };
                          console.log('File uploaded successfully:', uploadedFile);
                        } else {
                          console.error('Upload response missing fileUrl:', uploadResult);
                          throw new Error('Upload failed - no file URL returned');
                        }
                      } catch (uploadError) {
                        console.error('File upload error:', uploadError);
                        pop('Failed to upload offer letter file: ' + (uploadError.message || 'Please try again.'));
                        setSendingOffer(false);
                        return;
                      }
                    }

                    // Determine which file to use: new upload > existing file > none
                    const fileToUse = uploadedFile || (offerForm.existingFile?.url ? offerForm.existingFile : null);

                    // Prepare offer data
                    const offerData = {
                      applicationId: offerCandidate.applicationId || offerCandidate.id,
                      candidateId: offerCandidate.candidateId,
                      candidateName: offerCandidate.name,
                      candidateEmail: offerCandidate.email,
                      jobId: offerCandidate.jobId,
                      jobTitle: offerCandidate.role,
                      department: offerCandidate.department,
                      location: offerCandidate.location || 'Hyderabad',
                      offerType: offerForm.offerType,
                      salary: offerForm.salary,
                      salaryCurrency: offerForm.salaryCurrency,
                      bonus: offerForm.bonus,
                      equity: offerForm.equity,
                      benefits: offerForm.benefits,
                      startDate: offerForm.startDate,
                      expiryDate: offerForm.expiryDate,
                      offerContent: offerForm.offerContent,
                      termsAndConditions: offerForm.termsAndConditions,
                      internalNotes: offerForm.internalNotes,
                      sendEmail: true,
                      // Include file info if available (new upload or existing)
                      ...(fileToUse && { offerFile: fileToUse })
                    };

                    let response;
                    if (isEditing) {
                      // Update existing offer
                      response = await fetch(`${API_BASE}/offers/${offerForm.editingOfferId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(offerData)
                      });
                    } else {
                      // Create new offer
                      response = await fetch(`${API_BASE}/offers`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(offerData)
                      });
                    }

                    const result = await response.json();

                    if (result.success) {
                      setShowOfferModal(false);
                      setOfferCandidate(null);
                      setOfferFile(null);
                      pop(isEditing
                        ? `✅ Offer updated and resent to ${offerCandidate.name}!`
                        : `🎉 Offer sent successfully to ${offerCandidate.name}!`
                      );
                      // Refresh data to get latest state
                      await refreshData(offerCandidate.id);
                    } else {
                      console.error('Offer API error:', result);
                      pop(result.error || `Failed to ${isEditing ? 'update' : 'send'} offer`);
                    }
                  } catch (error) {
                    console.error('Error sending offer:', error);
                    pop('Failed to send offer: ' + (error.message || 'Please try again.'));
                  } finally {
                    setSendingOffer(false);
                  }
                }}
                disabled={sendingOffer}
                style={{
                  background: sendingOffer ? '#9ca3af' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 32px',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: sendingOffer ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: sendingOffer ? 'none' : '0 4px 12px rgba(16, 185, 129, 0.3)'
                }}
              >
                {sendingOffer ? (
                  <>
                    <span style={{ animation: 'spin 1s linear infinite' }}>⏳</span> {offerForm.editingOfferId ? 'Updating...' : 'Sending...'}
                  </>
                ) : (
                  <>
                    <span>📧</span> {offerForm.editingOfferId ? 'Update & Resend' : 'Send Offer'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          background: '#1e293b',
          color: 'white',
          padding: '16px 24px',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          zIndex: 200,
          animation: 'slideIn 0.3s ease'
        }}>
          <span style={{ color: '#10b981', fontSize: 18 }}>✓</span>
          <span style={{ fontSize: 14, fontWeight: 500 }}>{toast}</span>
        </div>
      )}
    </div>
  );
}
