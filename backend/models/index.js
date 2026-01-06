// =====================================================
// MONGODB MODELS - INDEX
// =====================================================

const mongoose = require('mongoose');
const { Schema } = mongoose;

// =====================================================
// COMPANY SCHEMA
// =====================================================
const companySchema = new Schema({
  name: { type: String, required: true },
  logo_url: String,
  website: String,
  industry: String,
  size: String,
  about: String,
  is_active: { type: Boolean, default: true },
}, { timestamps: true });

// =====================================================
// DEPARTMENT SCHEMA
// =====================================================
const departmentSchema = new Schema({
  name: { type: String, required: true },
  company_id: { type: Schema.Types.ObjectId, ref: 'Company' },
  is_active: { type: Boolean, default: true },
}, { timestamps: true });

// =====================================================
// ROLE TYPE SCHEMA
// =====================================================
const roleTypeSchema = new Schema({
  name: { type: String, required: true },
  company_id: { type: Schema.Types.ObjectId, ref: 'Company' },
  is_active: { type: Boolean, default: true },
}, { timestamps: true });

// =====================================================
// WORK SETUP SCHEMA
// =====================================================
const workSetupSchema = new Schema({
  name: { type: String, required: true },
  company_id: { type: Schema.Types.ObjectId, ref: 'Company' },
  is_active: { type: Boolean, default: true },
}, { timestamps: true });

// =====================================================
// PIPELINE STAGE SCHEMA
// =====================================================
const pipelineStageSchema = new Schema({
  name: { type: String, required: true },
  order: { type: Number, default: 0 },
  color: { type: String, default: '#6366f1' },
  company_id: { type: Schema.Types.ObjectId, ref: 'Company' },
  is_active: { type: Boolean, default: true },
}, { timestamps: true });

// =====================================================
// JOB OPENING SCHEMA
// =====================================================
const jobOpeningSchema = new Schema({
  company_id: { type: Schema.Types.ObjectId, ref: 'Company' },
  title: { type: String, required: true },
  department_id: { type: Schema.Types.ObjectId, ref: 'Department' },
  role_type_id: { type: Schema.Types.ObjectId, ref: 'RoleType' },
  work_setup_id: { type: Schema.Types.ObjectId, ref: 'WorkSetup' },
  location: { type: String, required: true },
  about_company: String,
  job_overview: String,
  key_responsibilities: String,
  qualifications: String,
  preferred_qualifications: String,
  skills: String,
  benefits: String,
  salary_min: Number,
  salary_max: Number,
  experience_min: Number,
  experience_max: Number,
  application_deadline: Date,
  is_active: { type: Boolean, default: true },
}, { timestamps: true });

// Virtual for department
jobOpeningSchema.virtual('department', {
  ref: 'Department',
  localField: 'department_id',
  foreignField: '_id',
  justOne: true
});

// Virtual for role_type
jobOpeningSchema.virtual('role_type', {
  ref: 'RoleType',
  localField: 'role_type_id',
  foreignField: '_id',
  justOne: true
});

// Virtual for work_setup
jobOpeningSchema.virtual('work_setup', {
  ref: 'WorkSetup',
  localField: 'work_setup_id',
  foreignField: '_id',
  justOne: true
});

jobOpeningSchema.set('toJSON', { virtuals: true });
jobOpeningSchema.set('toObject', { virtuals: true });

// =====================================================
// CANDIDATE SCHEMA
// =====================================================
const candidateSchema = new Schema({
  company_id: { type: Schema.Types.ObjectId, ref: 'Company' },
  name: { type: String, required: true },
  email: { type: String, required: true, lowercase: true },
  phone: String,
  location: String,
  linkedin_url: String,
  portfolio_url: String,
  resume_url: String,
  resume_text: String,
}, { timestamps: true });

candidateSchema.index({ email: 1 }, { unique: true });

// =====================================================
// APPLICATION SCHEMA
// =====================================================
const applicationSchema = new Schema({
  company_id: { type: Schema.Types.ObjectId, ref: 'Company' },
  job_id: { type: Schema.Types.ObjectId, ref: 'JobOpening', required: true },
  candidate_id: { type: Schema.Types.ObjectId, ref: 'Candidate', required: true },
  stage_id: { type: Schema.Types.ObjectId, ref: 'PipelineStage' },
  stage: { type: String, default: 'shortlisting', enum: ['shortlisting', 'screening', 'assignment-sent', 'assignment-submitted', 'interview', 'offer-sent', 'offer-accepted', 'hired', 'rejected'] },
  status: { type: String, default: 'under_review', enum: ['new', 'under_review', 'shortlisted', 'interviewed', 'offered', 'hired', 'rejected', 'withdrawn'] },
  reference_number: { type: String, unique: true, sparse: true },
  referral_source: String,
  // Application form fields
  graduation_year: String,
  availability: { type: String, default: 'immediately' },
  notice_period: String,
  motivation: String,
  // AI scoring
  ai_score: Number,
  ai_analysis: Schema.Types.Mixed,
  profile_strength: String,
  is_hot_applicant: { type: Boolean, default: false },
  needs_attention: { type: Boolean, default: false },
  days_in_stage: { type: Number, default: 0 },
  applied_at: { type: Date, default: Date.now },
  last_activity_at: Date,
  // Rejection fields
  rejection_reason: String,
  rejection_date: Date,
  // Screening call fields
  has_screening_call: { type: Boolean, default: false },
  screening_call_date: String,
  screening_notes: String,
  screening_interviewer: String,
  screening_platform: String,
  screening_meeting_link: String,
  screening_duration: String,
  // Comments array
  comments: [{
    text: String,
    author: String,
    timestamp: Date,
    stage: String
  }],
  // Stage history for journey tracking
  stage_history: [{
    stage: String,
    entered_at: { type: Date, default: Date.now },
    exited_at: Date,
    duration_days: Number,
    moved_by: String,
    notes: String,
    action: String // e.g., 'stage_change', 'rejected', 'hired', 'assignment_sent', 'interview_scheduled'
  }],
  // Task assignments
  assigned_to: String,
}, { timestamps: true });

applicationSchema.index({ job_id: 1, candidate_id: 1 }, { unique: true });

// =====================================================
// ACTIVITY LOG SCHEMA
// =====================================================
const activityLogSchema = new Schema({
  application_id: { type: Schema.Types.ObjectId, ref: 'Application' },
  company_id: { type: Schema.Types.ObjectId, ref: 'Company' },
  user_id: { type: Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true },
  description: String,
  metadata: Schema.Types.Mixed,
}, { timestamps: true });

// =====================================================
// INTERVIEW SCHEMA
// =====================================================
const interviewSchema = new Schema({
  application_id: { type: Schema.Types.ObjectId, ref: 'Application', required: true },
  candidate_id: { type: Schema.Types.ObjectId, ref: 'Candidate' },
  company_id: { type: Schema.Types.ObjectId, ref: 'Company' },
  job_id: { type: Schema.Types.ObjectId, ref: 'JobOpening' },
  // Interview details
  title: String,
  type: { type: String, enum: ['phone', 'video', 'in-person', 'technical', 'panel', 'online', 'offline'], default: 'online' },
  // Scheduling
  scheduled_date: Date,
  scheduled_time: String,
  duration_minutes: { type: Number, default: 60 },
  // Location details
  location_type: { type: String, enum: ['online', 'offline', 'in-person'], default: 'online' },
  platform: String, // Google Meet, Zoom, Teams, etc.
  meeting_link: String,
  address: String, // For in-person interviews
  // Interviewers
  interviewer_name: String,
  interviewer_ids: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  // Status and notes
  status: { type: String, default: 'scheduled', enum: ['scheduled', 'confirmed', 'completed', 'cancelled', 'rescheduled', 'no_show'] },
  notes: String,
  // Feedback after interview
  feedback: Schema.Types.Mixed,
  feedback_submitted: { type: Boolean, default: false },
  rating: Number,
  // Who scheduled it
  scheduled_by: String,
  scheduled_by_id: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// =====================================================
// USER SCHEMA (for recruiters/admins)
// =====================================================
const userSchema = new Schema({
  company_id: { type: Schema.Types.ObjectId, ref: 'Company' },
  name: { type: String, required: true },
  email: { type: String, required: true, lowercase: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'Recruiter', enum: ['Super Admin', 'Admin', 'HR Manager', 'HR', 'Recruiter', 'Hiring Manager', 'Viewer', 'admin', 'recruiter', 'hiring_manager', 'viewer'] },
  is_active: { type: Boolean, default: true },
}, { timestamps: true });

// =====================================================
// TASK ASSIGNMENT SCHEMA
// =====================================================
const taskAssignmentSchema = new Schema({
  application_id: { type: Schema.Types.ObjectId, ref: 'Application' },
  company_id: { type: Schema.Types.ObjectId, ref: 'Company' },
  candidate_id: { type: Schema.Types.ObjectId, ref: 'Candidate' },
  candidate_name: String,
  candidate_role: String,
  stage: String,
  assigned_to: String,
  assigned_to_id: { type: Schema.Types.ObjectId, ref: 'User' },
  assigned_by: String,
  assigned_by_id: { type: Schema.Types.ObjectId, ref: 'User' },
  assigned_date: { type: Date, default: Date.now },
  status: { type: String, default: 'pending', enum: ['pending', 'in_progress', 'completed', 'cancelled'] },
  notes: String,
  completed_date: Date,
  completed_by: String,
  due_date: Date,
  priority: { type: String, default: 'normal', enum: ['low', 'normal', 'high', 'urgent'] },
}, { timestamps: true });

// =====================================================
// FILE ATTACHMENT SCHEMA (sub-document for files)
// =====================================================
const fileAttachmentSchema = new Schema({
  name: { type: String, default: '' },
  url: { type: String, default: null },
  key: { type: String, default: null }, // S3 key for refreshing signed URLs
  type: { type: String, default: null }
}, { _id: false });

// =====================================================
// ASSIGNMENT TEMPLATE SCHEMA (for test assignments sent to candidates)
// =====================================================
const assignmentTemplateSchema = new Schema({
  company_id: { type: Schema.Types.ObjectId, ref: 'Company' },
  name: { type: String, required: true },
  job_types: [{ type: String }], // Array of job type names this assignment applies to
  instructions: { type: String, required: true },
  link: String, // External link for the assignment
  files: { type: [fileAttachmentSchema], default: [] },
  deadline: { type: String, default: '3 days' }, // e.g., "3 days", "1 week"
  created_by: String,
  is_active: { type: Boolean, default: true },
}, { timestamps: true });

// =====================================================
// CANDIDATE ASSIGNMENT SCHEMA (tracks assignments sent to specific candidates)
// =====================================================
const candidateAssignmentSchema = new Schema({
  application_id: { type: Schema.Types.ObjectId, ref: 'Application', required: true },
  assignment_template_id: { type: Schema.Types.ObjectId, ref: 'AssignmentTemplate' },
  company_id: { type: Schema.Types.ObjectId, ref: 'Company' },
  candidate_id: { type: Schema.Types.ObjectId, ref: 'Candidate' },
  candidate_name: String,
  candidate_email: String,
  assignment_name: String,
  instructions: String,
  custom_instructions: String, // Additional instructions for this specific candidate
  link: String,
  files: { type: [fileAttachmentSchema], default: [] },
  deadline_date: Date,
  sent_at: { type: Date, default: Date.now },
  sent_by: String,
  status: {
    type: String,
    default: 'sent',
    enum: ['sent', 'viewed', 'in_progress', 'submitted', 'reviewed', 'passed', 'failed']
  },
  submission_date: Date,
  submission_link: String,
  submission_notes: String,
  review_notes: String,
  reviewed_by: String,
  reviewed_at: Date,
  score: Number, // Optional score for the assignment
}, { timestamps: true });

// =====================================================
// USER ROLE SCHEMA (RBAC)
// =====================================================
const userRoleSchema = new Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  permissions: [{ type: String }], // Array of permission keys
  is_system: { type: Boolean, default: false }, // System roles cannot be deleted
  is_active: { type: Boolean, default: true },
  color: { type: String, default: '#6366f1' }, // For UI display
  order: { type: Number, default: 0 }, // For sorting
}, { timestamps: true });

// =====================================================
// OFFER SCHEMA (Job offers sent to candidates)
// =====================================================
const offerSchema = new Schema({
  application_id: { type: Schema.Types.ObjectId, ref: 'Application', required: true },
  candidate_id: { type: Schema.Types.ObjectId, ref: 'Candidate' },
  job_id: { type: Schema.Types.ObjectId, ref: 'JobOpening' },
  company_id: { type: Schema.Types.ObjectId, ref: 'Company' },
  // Candidate info (denormalized for quick access)
  candidate_name: String,
  candidate_email: String,
  // Job info
  job_title: String,
  department: String,
  location: String,
  // Offer details
  offer_type: { type: String, enum: ['text', 'pdf', 'word'], default: 'text' },
  offer_content: String, // For text-based offers
  offer_file: {
    name: { type: String, default: '' },
    url: { type: String, default: null },
    key: { type: String, default: null },
    type: { type: String, default: null }
  },
  // Compensation details
  salary: String,
  salary_currency: { type: String, default: 'INR' },
  bonus: String,
  equity: String,
  benefits: String,
  // Dates
  start_date: Date,
  expiry_date: Date, // Offer expiration date
  // Status tracking
  status: {
    type: String,
    default: 'draft',
    enum: ['draft', 'sent', 'viewed', 'accepted', 'rejected', 'negotiating', 'expired', 'withdrawn']
  },
  sent_at: Date,
  sent_by: String,
  sent_by_id: { type: Schema.Types.ObjectId, ref: 'User' },
  // Response tracking
  response_date: Date,
  response_notes: String,
  // Negotiation history
  negotiation_history: [{
    date: { type: Date, default: Date.now },
    action: String, // 'counter_offer', 'revised', 'accepted', 'rejected'
    details: String,
    by: String
  }],
  // Notes
  internal_notes: String,
  terms_and_conditions: String,
}, { timestamps: true });

// =====================================================
// CREATE MODELS
// =====================================================
const Company = mongoose.model('Company', companySchema);
const Department = mongoose.model('Department', departmentSchema);
const RoleType = mongoose.model('RoleType', roleTypeSchema);
const WorkSetup = mongoose.model('WorkSetup', workSetupSchema);
const PipelineStage = mongoose.model('PipelineStage', pipelineStageSchema);
const JobOpening = mongoose.model('JobOpening', jobOpeningSchema);
const Candidate = mongoose.model('Candidate', candidateSchema);
const Application = mongoose.model('Application', applicationSchema);
const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
const Interview = mongoose.model('Interview', interviewSchema);
const User = mongoose.model('User', userSchema);
const TaskAssignment = mongoose.model('TaskAssignment', taskAssignmentSchema);
const AssignmentTemplate = mongoose.model('AssignmentTemplate', assignmentTemplateSchema);
const CandidateAssignment = mongoose.model('CandidateAssignment', candidateAssignmentSchema);
const UserRole = mongoose.model('UserRole', userRoleSchema);
const Offer = mongoose.model('Offer', offerSchema);

module.exports = {
  Company,
  Department,
  RoleType,
  WorkSetup,
  PipelineStage,
  JobOpening,
  Candidate,
  Application,
  ActivityLog,
  Interview,
  User,
  TaskAssignment,
  AssignmentTemplate,
  CandidateAssignment,
  UserRole,
  Offer,
};
