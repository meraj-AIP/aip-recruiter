// API Service for connecting to the backend
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

// Helper function for API calls
async function fetchAPI(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'API request failed');
    }

    return data;
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
}

// Jobs API
export const jobsAPI = {
  // Get all jobs
  getAll: async () => {
    const response = await fetchAPI('/jobs');
    return response.data || [];
  },

  // Get single job by ID
  getById: async (id) => {
    const response = await fetchAPI(`/jobs/${id}`);
    return response.data;
  },

  // Create new job
  create: async (jobData) => {
    const response = await fetchAPI('/jobs', {
      method: 'POST',
      body: JSON.stringify(jobData),
    });
    return response.data;
  },

  // Update job
  update: async (id, jobData) => {
    const response = await fetchAPI(`/jobs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(jobData),
    });
    return response.data;
  },

  // Delete job
  delete: async (id) => {
    const response = await fetchAPI(`/jobs/${id}`, {
      method: 'DELETE',
    });
    return response;
  },

  // Toggle job active status
  toggleActive: async (id, isActive) => {
    const response = await fetchAPI(`/jobs/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ is_active: isActive }),
    });
    return response.data;
  },
};

// Candidates API
export const candidatesAPI = {
  // Get all candidates
  getAll: async () => {
    const response = await fetchAPI('/candidates');
    return response.data || [];
  },

  // Get single candidate by ID
  getById: async (id) => {
    const response = await fetchAPI(`/candidates/${id}`);
    return response.data;
  },

  // Create new candidate
  create: async (candidateData) => {
    const response = await fetchAPI('/candidates', {
      method: 'POST',
      body: JSON.stringify(candidateData),
    });
    return response.data;
  },

  // Update candidate
  update: async (id, candidateData) => {
    const response = await fetchAPI(`/candidates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(candidateData),
    });
    return response.data;
  },
};

// Applications API
export const applicationsAPI = {
  // Get all applications
  getAll: async () => {
    const response = await fetchAPI('/applications');
    return response.data || [];
  },

  // Get applications by job
  getByJob: async (jobId) => {
    const response = await fetchAPI(`/applications?job_id=${jobId}`);
    return response.data || [];
  },

  // Get single application
  getById: async (id) => {
    const response = await fetchAPI(`/applications/${id}`);
    return response.data;
  },

  // Create application
  create: async (applicationData) => {
    const response = await fetchAPI('/applications', {
      method: 'POST',
      body: JSON.stringify(applicationData),
    });
    return response.data;
  },

  // Update application stage
  updateStage: async (id, stageId) => {
    const response = await fetchAPI(`/applications/${id}/stage`, {
      method: 'PUT',
      body: JSON.stringify({ stage_id: stageId }),
    });
    return response.data;
  },

  // Update application status
  updateStatus: async (id, status) => {
    const response = await fetchAPI(`/applications/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    return response.data;
  },

  // Update application (generic PATCH)
  update: async (id, data) => {
    const response = await fetchAPI(`/applications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  // Toggle hot applicant status
  toggleHotApplicant: async (id, isHot) => {
    const response = await fetchAPI(`/applications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_hot_applicant: isHot }),
    });
    return response.data;
  },

  // Add comment to application
  addComment: async (id, comment) => {
    const response = await fetchAPI(`/applications/${id}/comment`, {
      method: 'POST',
      body: JSON.stringify(comment),
    });
    return response.data;
  },

  // Reject application (with proper stage history tracking)
  reject: async (id, reason, rejectedBy = 'Admin') => {
    const response = await fetchAPI(`/applications/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({
        reason,
        rejectedBy
      }),
    });
    return response.data;
  },

  // Move to stage (with history tracking)
  moveToStage: async (id, stage, movedBy = 'Admin', notes = null, action = 'stage_change') => {
    const response = await fetchAPI(`/applications/${id}/move-to-stage`, {
      method: 'POST',
      body: JSON.stringify({
        stage,
        movedBy,
        notes,
        action
      }),
    });
    return response.data;
  },

  // Get application journey/timeline
  getJourney: async (id) => {
    const response = await fetchAPI(`/applications/${id}/journey`);
    return response.data;
  },

  // Schedule screening call with email
  scheduleScreening: async (id, screeningData) => {
    const response = await fetchAPI(`/applications/${id}/schedule-screening`, {
      method: 'POST',
      body: JSON.stringify(screeningData),
    });
    return response.data;
  },

  // Public application submission (no auth required)
  publicApply: async (applicationData) => {
    const response = await fetchAPI('/applications/public-apply', {
      method: 'POST',
      body: JSON.stringify(applicationData),
    });
    return response;
  },
};

// AI Scoring API
export const aiAPI = {
  // Score a single resume
  scoreResume: async (resumeText, jobId, applicationId = null) => {
    const response = await fetchAPI('/ai/score', {
      method: 'POST',
      body: JSON.stringify({
        resumeText,
        jobId,
        applicationId,
      }),
    });
    return response;
  },

  // Batch score multiple applications
  batchScore: async (applicationIds) => {
    const response = await fetchAPI('/ai/batch-score', {
      method: 'POST',
      body: JSON.stringify({ applicationIds }),
    });
    return response;
  },

  // Generate job description using AI
  generateJobDescription: async (params) => {
    const response = await fetchAPI('/ai/generate-job-description', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return response;
  },

  // Get AI-powered recommendations and insights for tasks page
  getRecommendations: async (userId = null) => {
    const queryParams = userId ? `?userId=${userId}` : '';
    const response = await fetchAPI(`/ai/recommendations${queryParams}`);
    return response.data;
  },
};

// Upload API
export const uploadAPI = {
  // Upload resume and extract text
  uploadResume: async (file, companyId, candidateId = null) => {
    const formData = new FormData();
    formData.append('resume', file);
    formData.append('companyId', companyId);
    if (candidateId) {
      formData.append('candidateId', candidateId);
    }

    const response = await fetch(`${API_BASE_URL}/upload/resume`, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header - browser will set it with boundary for FormData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to upload resume');
    }

    return data;
  },

  // Upload a general file (for assignments, etc.)
  uploadFile: async (file, companyId = '695a077b7406a1a3c8dd3751') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('companyId', companyId);

    const response = await fetch(`${API_BASE_URL}/upload/file`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to upload file');
    }

    return data;
  },

  // Get a signed URL for an S3 file key
  getSignedUrl: async (key) => {
    // Don't encode the key - the backend uses /* to capture the full path with slashes
    const response = await fetch(`${API_BASE_URL}/upload/signed-url/${key}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to get signed URL');
    }

    return data.signedUrl;
  },
};

// Lookups API (departments, role types, work setups)
export const lookupsAPI = {
  getAll: async () => {
    const response = await fetchAPI('/lookups');
    return response.data || { departments: [], roleTypes: [], workSetups: [] };
  },
};

// Departments API
export const departmentsAPI = {
  create: async (name) => {
    const response = await fetchAPI('/departments', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    return response.data;
  },
  update: async (id, data) => {
    const response = await fetchAPI(`/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },
  delete: async (id) => {
    const response = await fetchAPI(`/departments/${id}`, {
      method: 'DELETE',
    });
    return response;
  },
};

// Role Types API
export const roleTypesAPI = {
  create: async (name) => {
    const response = await fetchAPI('/role-types', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    return response.data;
  },
  update: async (id, data) => {
    const response = await fetchAPI(`/role-types/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },
  delete: async (id) => {
    const response = await fetchAPI(`/role-types/${id}`, {
      method: 'DELETE',
    });
    return response;
  },
};

// Work Setups API
export const workSetupsAPI = {
  create: async (name) => {
    const response = await fetchAPI('/work-setups', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    return response.data;
  },
  update: async (id, data) => {
    const response = await fetchAPI(`/work-setups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },
  delete: async (id) => {
    const response = await fetchAPI(`/work-setups/${id}`, {
      method: 'DELETE',
    });
    return response;
  },
};

// Users/Admins API
export const usersAPI = {
  // Get all users
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.companyId) params.append('companyId', filters.companyId);
    if (filters.role) params.append('role', filters.role);
    if (filters.status) params.append('status', filters.status);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    const response = await fetchAPI(`/users${queryString}`);
    return response.data || [];
  },

  // Get single user by ID
  getById: async (id) => {
    const response = await fetchAPI(`/users/${id}`);
    return response.data;
  },

  // Create new user
  create: async (userData) => {
    const response = await fetchAPI('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    return response.data;
  },

  // Update user
  update: async (id, userData) => {
    const response = await fetchAPI(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
    return response.data;
  },

  // Toggle user status
  toggleStatus: async (id, status) => {
    const response = await fetchAPI(`/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    return response.data;
  },

  // Delete user
  delete: async (id) => {
    const response = await fetchAPI(`/users/${id}`, {
      method: 'DELETE',
    });
    return response;
  },

  // Login user
  login: async (email, password) => {
    const response = await fetchAPI('/users/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    return response.data;
  },

  // Seed default super admin
  seedAdmin: async () => {
    const response = await fetchAPI('/users/seed', {
      method: 'POST',
    });
    return response;
  },
};

// Tasks/Assignments API
export const tasksAPI = {
  // Get all tasks
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.companyId) params.append('companyId', filters.companyId);
    if (filters.assignedTo) params.append('assignedTo', filters.assignedTo);
    if (filters.status) params.append('status', filters.status);
    if (filters.priority) params.append('priority', filters.priority);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    const response = await fetchAPI(`/tasks${queryString}`);
    return response.data || [];
  },

  // Get single task by ID
  getById: async (id) => {
    const response = await fetchAPI(`/tasks/${id}`);
    return response.data;
  },

  // Get tasks for a specific application
  getByApplication: async (applicationId) => {
    const response = await fetchAPI(`/tasks/by-application/${applicationId}`);
    return response.data || [];
  },

  // Get tasks assigned to a specific user
  getByUser: async (userName) => {
    const response = await fetchAPI(`/tasks/by-user/${userName}`);
    return response.data || [];
  },

  // Create new task
  create: async (taskData) => {
    const response = await fetchAPI('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
    return response.data;
  },

  // Update task
  update: async (id, taskData) => {
    const response = await fetchAPI(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(taskData),
    });
    return response.data;
  },

  // Update task status
  updateStatus: async (id, status, completedBy = null) => {
    const response = await fetchAPI(`/tasks/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, completed_by: completedBy }),
    });
    return response.data;
  },

  // Delete task
  delete: async (id) => {
    const response = await fetchAPI(`/tasks/${id}`, {
      method: 'DELETE',
    });
    return response;
  },
};

// Assignments API (templates and candidate assignments)
export const assignmentsAPI = {
  // ========== ASSIGNMENT TEMPLATES ==========

  // Get all assignment templates
  getTemplates: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.companyId) params.append('companyId', filters.companyId);
    if (filters.jobType) params.append('jobType', filters.jobType);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    const response = await fetchAPI(`/assignments/templates${queryString}`);
    return response.data || [];
  },

  // Get single template
  getTemplateById: async (id) => {
    const response = await fetchAPI(`/assignments/templates/${id}`);
    return response.data;
  },

  // Create new template
  createTemplate: async (templateData) => {
    const response = await fetchAPI('/assignments/templates', {
      method: 'POST',
      body: JSON.stringify(templateData),
    });
    return response.data;
  },

  // Update template
  updateTemplate: async (id, templateData) => {
    const response = await fetchAPI(`/assignments/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(templateData),
    });
    return response.data;
  },

  // Delete template
  deleteTemplate: async (id) => {
    const response = await fetchAPI(`/assignments/templates/${id}`, {
      method: 'DELETE',
    });
    return response;
  },

  // ========== CANDIDATE ASSIGNMENTS ==========

  // Get all candidate assignments
  getCandidateAssignments: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.applicationId) params.append('applicationId', filters.applicationId);
    if (filters.candidateId) params.append('candidateId', filters.candidateId);
    if (filters.status) params.append('status', filters.status);
    if (filters.companyId) params.append('companyId', filters.companyId);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    const response = await fetchAPI(`/assignments/candidates${queryString}`);
    return response.data || [];
  },

  // Get single candidate assignment
  getCandidateAssignmentById: async (id) => {
    const response = await fetchAPI(`/assignments/candidates/${id}`);
    return response.data;
  },

  // Send assignment to candidate
  sendToCandidate: async (assignmentData) => {
    const response = await fetchAPI('/assignments/candidates', {
      method: 'POST',
      body: JSON.stringify(assignmentData),
    });
    return response.data;
  },

  // Update candidate assignment status
  updateCandidateStatus: async (id, statusData) => {
    const response = await fetchAPI(`/assignments/candidates/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(statusData),
    });
    return response.data;
  },

  // Get assignments for specific application
  getByApplication: async (applicationId) => {
    const response = await fetchAPI(`/assignments/by-application/${applicationId}`);
    return response.data || [];
  },

  // ========== AI ANALYSIS ==========

  // Trigger AI analysis for a candidate assignment
  analyzeSubmission: async (candidateAssignmentId) => {
    const response = await fetchAPI(`/assignments/candidate/${candidateAssignmentId}/analyze`, {
      method: 'POST',
    });
    return response;
  },

  // Get AI analysis results for a candidate assignment
  getAnalysis: async (candidateAssignmentId) => {
    const response = await fetchAPI(`/assignments/candidate/${candidateAssignmentId}/analysis`);
    return response;
  },
};

// Interviews API
export const interviewsAPI = {
  // Get all interviews
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.applicationId) params.append('applicationId', filters.applicationId);
    if (filters.candidateId) params.append('candidateId', filters.candidateId);
    if (filters.status) params.append('status', filters.status);
    if (filters.companyId) params.append('companyId', filters.companyId);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    const response = await fetchAPI(`/interviews${queryString}`);
    return response.data || [];
  },

  // Get single interview
  getById: async (id) => {
    const response = await fetchAPI(`/interviews/${id}`);
    return response.data;
  },

  // Get interviews for specific application
  getByApplication: async (applicationId) => {
    const response = await fetchAPI(`/interviews/by-application/${applicationId}`);
    // Return full response so caller can check success and access data
    return { success: response.success !== false, data: response.data || [] };
  },

  // Create interview
  create: async (interviewData) => {
    const response = await fetchAPI('/interviews', {
      method: 'POST',
      body: JSON.stringify(interviewData),
    });
    return response.data;
  },

  // Update interview
  update: async (id, interviewData) => {
    const response = await fetchAPI(`/interviews/${id}`, {
      method: 'PUT',
      body: JSON.stringify(interviewData),
    });
    return response.data;
  },

  // Update interview status
  updateStatus: async (id, status, feedback = null, rating = null) => {
    const response = await fetchAPI(`/interviews/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, feedback, rating }),
    });
    return response.data;
  },

  // Delete interview
  delete: async (id) => {
    const response = await fetchAPI(`/interviews/${id}`, {
      method: 'DELETE',
    });
    return response;
  },
};

// Email API
export const emailAPI = {
  // Send interview invitation with calendar invite
  sendInterviewWithCalendar: async (params) => {
    const response = await fetchAPI('/email/interview-with-calendar', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return response;
  },
};

// User Roles API (RBAC)
export const rolesAPI = {
  // Get all roles
  getAll: async () => {
    const response = await fetchAPI('/roles');
    return response.data || [];
  },

  // Get single role
  getById: async (id) => {
    const response = await fetchAPI(`/roles/${id}`);
    return response.data;
  },

  // Get available permissions
  getPermissions: async () => {
    const response = await fetchAPI('/roles/permissions');
    return response.data || [];
  },

  // Create new role
  create: async (roleData) => {
    const response = await fetchAPI('/roles', {
      method: 'POST',
      body: JSON.stringify(roleData),
    });
    return response.data;
  },

  // Update role
  update: async (id, roleData) => {
    const response = await fetchAPI(`/roles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(roleData),
    });
    return response.data;
  },

  // Delete role
  delete: async (id) => {
    const response = await fetchAPI(`/roles/${id}`, {
      method: 'DELETE',
    });
    return response;
  },

  // Seed default roles
  seed: async () => {
    const response = await fetchAPI('/roles/seed', {
      method: 'POST',
    });
    return response;
  },
};

// Dashboard/Stats API
export const statsAPI = {
  // Get dashboard stats
  getDashboardStats: async () => {
    try {
      const [jobs, candidates, applications] = await Promise.all([
        jobsAPI.getAll(),
        candidatesAPI.getAll(),
        applicationsAPI.getAll(),
      ]);

      const activeJobs = jobs.filter(j => j.is_active).length;
      const totalCandidates = candidates.length;
      const totalApplications = applications.length;
      const hotApplicants = applications.filter(a => a.is_hot_applicant).length;

      // Calculate average AI score
      const scoresWithValues = applications.filter(a => a.ai_score != null);
      const avgScore = scoresWithValues.length > 0
        ? Math.round(scoresWithValues.reduce((sum, a) => sum + a.ai_score, 0) / scoresWithValues.length)
        : 0;

      return {
        activeJobs,
        totalCandidates,
        totalApplications,
        hotApplicants,
        avgAIScore: avgScore,
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return {
        activeJobs: 0,
        totalCandidates: 0,
        totalApplications: 0,
        hotApplicants: 0,
        avgAIScore: 0,
      };
    }
  },
};

// Utility function to transform backend job data to frontend format
export function transformJobToFrontend(job) {
  return {
    id: job.id,
    name: job.title,
    team: job.department?.name || 'Unknown',
    place: job.location,
    count: 0, // Will be populated from applications
    good: 0, // Will be populated from applications
    on: job.is_active,
    aboutCompany: job.about_company || '',
    jobOverview: job.job_overview || '',
    keyResponsibilities: job.key_responsibilities || '',
    qualifications: job.qualifications || '',
    preferredQualifications: job.preferred_qualifications || '',
    roleType: job.role_type?.name || 'Full-time',
    workSetup: job.work_setup?.name || 'Remote',
    salaryMin: job.salary_min?.toString() || '',
    salaryMax: job.salary_max?.toString() || '',
    experienceMin: job.experience_min?.toString() || '',
    experienceMax: job.experience_max?.toString() || '',
    skills: job.skills || '',
    benefits: job.benefits || '',
    applicationDeadline: job.application_deadline || '',
    // Keep original data for API calls
    _original: job,
  };
}

// Utility function to transform backend candidate/application data to frontend format
export function transformCandidateToFrontend(application) {
  const candidate = application.candidate || {};
  const job = application.job || {};

  return {
    id: application.id,
    candidateId: candidate.id,
    jobId: job.id || application.job_id || null,
    name: candidate.name || 'Unknown',
    role: job.title || 'Unknown Position',
    email: candidate.email || '',
    phone: candidate.phone || '',
    location: candidate.location || '',
    experience: '', // Not stored in current schema
    appliedDate: application.applied_at?.split('T')[0] || '',
    aiScore: application.ai_score || 0,
    aiReason: application.ai_analysis?.summary || 'AI analysis pending',
    status: application.status || 'new',
    stage: application.stage || 'shortlisting',
    profileStrength: application.profile_strength || 'Good',
    isHotApplicant: application.is_hot_applicant || false,
    needsAttention: application.needs_attention || false,
    linkedIn: candidate.linkedin_url || '',
    portfolio: candidate.portfolio_url || '',
    resumeUrl: candidate.resume_url || '',
    referralSource: application.referral_source || '',
    referenceNumber: application.reference_number || '',
    graduationYear: application.graduation_year || '',
    availability: application.availability || 'immediately',
    noticePeriod: application.notice_period || '',
    motivation: application.motivation || '',
    // Rejection fields
    rejectionReason: application.rejection_reason || '',
    rejectionDate: application.rejection_date ? new Date(application.rejection_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '',
    // Screening fields
    hasScreeningCall: application.has_screening_call || false,
    screeningCallDate: application.screening_call_date || '',
    screeningNotes: application.screening_notes || '',
    screeningInterviewer: application.screening_interviewer || '',
    screeningPlatform: application.screening_platform || '',
    screeningMeetingLink: application.screening_meeting_link || '',
    screeningDuration: application.screening_duration || '',
    // Comments
    comments: (application.comments || []).map(c => ({
      id: c._id || Date.now(),
      text: c.text,
      author: c.author,
      timestamp: c.timestamp ? new Date(c.timestamp).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '',
      stage: c.stage
    })),
    // Assignment
    assignedTo: application.assigned_to || '',
    // Interview rounds (loaded separately but initialize as empty)
    interviewRounds: [],
    // Keep original data
    _original: application,
  };
}

export default {
  jobs: jobsAPI,
  candidates: candidatesAPI,
  applications: applicationsAPI,
  ai: aiAPI,
  upload: uploadAPI,
  lookups: lookupsAPI,
  stats: statsAPI,
  users: usersAPI,
  tasks: tasksAPI,
  assignments: assignmentsAPI,
  transformJobToFrontend,
  transformCandidateToFrontend,
};
