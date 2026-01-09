// =====================================================
// CANDIDATE PORTAL ROUTES - Public Status Tracking
// =====================================================

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { Application, Candidate, JobOpening, Interview, ActivityLog, CandidateAssignment, Offer } = require('../models');
const { sendAssignmentSubmissionNotification } = require('../services/emailService');
const s3Service = require('../services/s3Service');

// Configure S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    // Allow common file types for assignments
    const allowedTypes = [
      'application/pdf',
      'application/zip',
      'application/x-zip-compressed',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/html',
      'text/css',
      'text/javascript',
      'application/javascript',
      'application/json',
      'image/png',
      'image/jpeg',
      'image/gif'
    ];
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(zip|pdf|doc|docx|txt|js|jsx|ts|tsx|py|java|cpp|c|html|css|json|md|png|jpg|jpeg|gif)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Please upload PDF, ZIP, DOC, or code files.'), false);
    }
  }
});

/**
 * Generate a secure tracking token for a candidate
 */
function generateTrackingToken(email, candidateId) {
  const secret = process.env.JWT_SECRET || 'recruitment-portal-secret';
  const data = `${email}:${candidateId}`;
  return crypto.createHmac('sha256', secret).update(data).digest('hex').substring(0, 32);
}

/**
 * Verify tracking token
 */
function verifyToken(token, email, candidateId) {
  const expectedToken = generateTrackingToken(email, candidateId);
  return token === expectedToken;
}

/**
 * Get offer details for portal display
 */
async function getOfferDetails(applicationId) {
  try {
    const offer = await Offer.findOne({ application_id: applicationId }).lean();
    if (!offer) return null;

    // Get signed URL for offer file if exists
    let offerFileUrl = null;
    if (offer.offer_file?.key) {
      try {
        offerFileUrl = await s3Service.getSignedUrl(offer.offer_file.key);
      } catch (e) {
        console.error('Error getting signed URL for offer file:', e);
      }
    }

    return {
      offerType: offer.offer_type || 'text',
      // Only show text content if it's a text-based offer
      offerContent: offer.offer_type === 'text' ? offer.offer_content : null,
      // File details for PDF/Word offers
      offerFile: offer.offer_file?.key ? {
        name: offer.offer_file.name,
        url: offerFileUrl,
        type: offer.offer_file.type
      } : null,
      // Compensation details
      salary: offer.salary,
      salaryCurrency: offer.salary_currency || 'INR',
      bonus: offer.bonus,
      equity: offer.equity,
      benefits: offer.benefits,
      // Dates
      startDate: offer.start_date,
      expiryDate: offer.expiry_date,
      // Status
      status: offer.status,
      sentAt: offer.sent_at
    };
  } catch (error) {
    console.error('Error getting offer details:', error);
    return null;
  }
}

// Middleware to verify candidate access
const verifyCandidateAccess = async (req, res, next) => {
  try {
    const { email, token } = req.query;

    if (!email || !token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const candidate = await Candidate.findOne({ email: email.toLowerCase() }).lean();
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    if (!verifyToken(token, email, candidate._id.toString())) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    req.candidate = candidate;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// POST /api/portal/lookup - Look up application status by email and phone verification
router.post('/lookup', async (req, res) => {
  try {
    const { email, phoneLast5 } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!phoneLast5 || phoneLast5.length !== 5 || !/^\d{5}$/.test(phoneLast5)) {
      return res.status(400).json({ error: 'Please enter the last 5 digits of your registered phone number' });
    }

    const candidate = await Candidate.findOne({ email: email.toLowerCase() }).lean();

    if (!candidate) {
      return res.status(404).json({
        success: false,
        error: 'No applications found for this email'
      });
    }

    // Verify phone number - get last 5 digits of stored phone
    const storedPhone = (candidate.phone || '').replace(/\D/g, ''); // Remove non-digits
    const storedLast5 = storedPhone.slice(-5);

    if (!storedPhone || storedLast5.length < 5) {
      return res.status(400).json({
        success: false,
        error: 'Phone number not registered. Please contact support.'
      });
    }

    if (phoneLast5 !== storedLast5) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials. Please check your email and phone number.'
      });
    }

    const applications = await Application.find({ candidate_id: candidate._id })
      .populate('job_id', 'title department location')
      .sort({ createdAt: -1 })
      .lean();

    if (applications.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No applications found'
      });
    }

    // Get interviews for all applications
    const appIds = applications.map(a => a._id);
    const interviews = await Interview.find({
      application_id: { $in: appIds },
      status: { $in: ['Scheduled', 'scheduled'] }
    }).lean();

    const token = generateTrackingToken(email, candidate._id.toString());

    const publicApplications = applications.map(app => {
      const appInterviews = interviews.filter(i => i.application_id.toString() === app._id.toString());
      return {
        id: app._id,
        jobTitle: app.job_id?.title || 'Position',
        department: app.job_id?.department || '',
        location: app.job_id?.location || '',
        appliedAt: app.applied_at || app.createdAt,
        lastUpdated: app.updatedAt,
        stage: formatStageForPublic(app.stage),
        stageKey: app.stage,
        status: getPublicStatus(app.stage),
        statusDescription: getStatusDescription(app.stage),
        hasUpcomingInterview: appInterviews.length > 0,
        upcomingInterview: appInterviews[0] ? {
          title: appInterviews[0].title,
          date: appInterviews[0].date,
          time: appInterviews[0].time,
          type: appInterviews[0].locationType,
          platform: appInterviews[0].platform,
          meetingLink: appInterviews[0].meetingLink
        } : null
      };
    });

    res.json({
      success: true,
      data: {
        candidateName: candidate.name,
        email: candidate.email,
        phone: candidate.phone,
        applications: publicApplications,
        token
      }
    });
  } catch (error) {
    console.error('Portal lookup error:', error);
    res.status(500).json({ error: 'Failed to look up applications' });
  }
});

// GET /api/portal/application/:id - Get detailed application status with timeline
router.get('/application/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, token } = req.query;

    if (!email) {
      return res.status(400).json({ error: 'Email is required for verification' });
    }

    const application = await Application.findById(id)
      .populate('candidate_id', 'name email phone')
      .populate('job_id', 'title department location description requirements')
      .lean();

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (application.candidate_id?.email?.toLowerCase() !== email.toLowerCase()) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    // Get interviews
    const interviews = await Interview.find({ application_id: id })
      .select('title date time status locationType platform meetingLink interviewerName feedback')
      .sort({ date: 1 })
      .lean();

    // Get activity log for timeline
    const activities = await ActivityLog.find({ application_id: id })
      .select('action description createdAt')
      .sort({ createdAt: 1 })
      .lean();

    // Build timeline
    const timeline = buildPublicTimeline(application, interviews, activities);

    res.json({
      success: true,
      data: {
        applicationId: application._id,
        candidateName: application.candidate_id?.name,
        jobTitle: application.job_id?.title,
        department: application.job_id?.department,
        location: application.job_id?.location,
        jobDescription: application.job_id?.description,
        appliedAt: application.applied_at || application.createdAt,
        lastUpdated: application.updatedAt,
        currentStage: formatStageForPublic(application.stage),
        stageKey: application.stage,
        status: getPublicStatus(application.stage),
        statusDescription: getStatusDescription(application.stage),
        timeline,
        interviews: interviews.map(i => ({
          id: i._id,
          title: i.title,
          date: i.date,
          time: i.time,
          status: i.status,
          type: i.locationType,
          platform: i.platform,
          meetingLink: i.status === 'Scheduled' || i.status === 'scheduled' ? i.meetingLink : null,
          interviewer: i.interviewerName,
          feedback: i.status === 'Completed' || i.status === 'completed' ? (i.feedback ? 'Received' : 'Pending') : null,
          // Show result for completed interviews
          result: ['Completed', 'completed', 'Passed', 'passed'].includes(i.status) ? 'Passed' :
                  ['Failed', 'failed', 'Rejected', 'rejected'].includes(i.status) ? 'Not Selected' : null
        })),
        // Offer details (show when offer is sent, pending, accepted or hired)
        offerDetails: ['offer-sent', 'offer-pending', 'offer-accepted', 'hired'].includes(application.stage) ? await getOfferDetails(application._id) : null,
        canWithdraw: !['hired', 'rejected', 'offer-accepted'].includes(application.stage),
        canAcceptOffer: application.stage === 'offer-sent' || application.stage === 'offer-pending',
        canDeclineOffer: application.stage === 'offer-sent' || application.stage === 'offer-pending'
      }
    });
  } catch (error) {
    console.error('Portal application error:', error);
    res.status(500).json({ error: 'Failed to get application details' });
  }
});

// POST /api/portal/application/:id/withdraw - Withdraw application
router.post('/application/:id/withdraw', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, token, reason } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const application = await Application.findById(id).populate('candidate_id', 'email').lean();

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (application.candidate_id?.email?.toLowerCase() !== email.toLowerCase()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (['hired', 'rejected', 'offer-accepted'].includes(application.stage)) {
      return res.status(400).json({ error: 'Cannot withdraw at this stage' });
    }

    // Update application
    await Application.findByIdAndUpdate(id, {
      stage: 'withdrawn',
      status: 'withdrawn',
      withdrawnAt: new Date(),
      withdrawnReason: reason || 'Candidate withdrew application'
    });

    // Log activity
    await new ActivityLog({
      application_id: id,
      action: 'application_withdrawn',
      description: `Candidate withdrew application. Reason: ${reason || 'Not specified'}`,
      metadata: { reason, withdrawnBy: 'candidate' }
    }).save();

    res.json({
      success: true,
      message: 'Application withdrawn successfully'
    });
  } catch (error) {
    console.error('Withdraw error:', error);
    res.status(500).json({ error: 'Failed to withdraw application' });
  }
});

// POST /api/portal/application/:id/respond-offer - Accept or decline offer
router.post('/application/:id/respond-offer', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, token, response, message, joiningDate, joiningLocation, reason } = req.body;

    if (!email || !response) {
      return res.status(400).json({ error: 'Email and response are required' });
    }

    if (!['accept', 'decline'].includes(response)) {
      return res.status(400).json({ error: 'Response must be accept or decline' });
    }

    // Validate required fields for acceptance
    if (response === 'accept') {
      if (!joiningDate) {
        return res.status(400).json({ error: 'Joining date is required to accept the offer' });
      }
      if (!joiningLocation) {
        return res.status(400).json({ error: 'Joining location is required to accept the offer' });
      }
    }

    // Validate required fields for decline
    if (response === 'decline' && !reason) {
      return res.status(400).json({ error: 'Reason is required to decline the offer' });
    }

    const application = await Application.findById(id).populate('candidate_id', 'email name').lean();

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (application.candidate_id?.email?.toLowerCase() !== email.toLowerCase()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (application.stage !== 'offer-sent' && application.stage !== 'offer-pending') {
      return res.status(400).json({ error: 'No pending offer to respond to' });
    }

    const newStage = response === 'accept' ? 'offer-accepted' : 'offer-declined';

    // Build update object based on response type
    const updateData = {
      stage: newStage,
      offerResponseAt: new Date()
    };

    if (response === 'accept') {
      updateData.candidateJoiningDate = new Date(joiningDate);
      updateData.candidateJoiningLocation = joiningLocation;
      updateData.offerAcceptanceMessage = message || '';
    } else {
      updateData.offerDeclineReason = reason;
    }

    await Application.findByIdAndUpdate(id, updateData);

    // Create activity log with detailed metadata
    const activityMetadata = {
      response,
      respondedBy: 'candidate',
      respondedAt: new Date().toISOString()
    };

    if (response === 'accept') {
      activityMetadata.joiningDate = joiningDate;
      activityMetadata.joiningLocation = joiningLocation;
      activityMetadata.message = message || '';
    } else {
      activityMetadata.declineReason = reason;
    }

    await new ActivityLog({
      application_id: id,
      action: response === 'accept' ? 'offer_accepted' : 'offer_declined',
      description: response === 'accept'
        ? `${application.candidate_id.name} accepted the offer. Joining Date: ${new Date(joiningDate).toLocaleDateString()}, Location: ${joiningLocation}`
        : `${application.candidate_id.name} declined the offer. Reason: ${reason}`,
      metadata: activityMetadata
    }).save();

    // Also update the Offer document if it exists
    const offer = await Offer.findOne({ application_id: id });
    if (offer) {
      if (response === 'accept') {
        offer.status = 'accepted';
        offer.accepted_at = new Date();
        offer.candidate_joining_date = new Date(joiningDate);
        offer.candidate_joining_location = joiningLocation;
        offer.candidate_acceptance_message = message || '';
      } else {
        offer.status = 'declined';
        offer.declined_at = new Date();
        offer.decline_reason = reason;
      }
      await offer.save();
    }

    res.json({
      success: true,
      message: response === 'accept'
        ? 'Congratulations! Offer accepted successfully. Our HR team will be in touch soon.'
        : 'Offer declined. We wish you all the best in your future endeavors.'
    });
  } catch (error) {
    console.error('Offer response error:', error);
    res.status(500).json({ error: 'Failed to respond to offer' });
  }
});

// PUT /api/portal/profile - Update candidate profile
router.put('/profile', async (req, res) => {
  try {
    const { email, token, phone, linkedIn, currentCompany, currentTitle } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const candidate = await Candidate.findOne({ email: email.toLowerCase() });

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    // Update allowed fields
    if (phone) candidate.phone = phone;
    if (linkedIn) candidate.linkedIn = linkedIn;
    if (currentCompany) candidate.current_company = currentCompany;
    if (currentTitle) candidate.current_title = currentTitle;

    await candidate.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone,
        linkedIn: candidate.linkedIn,
        currentCompany: candidate.current_company,
        currentTitle: candidate.current_title
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// POST /api/portal/message - Send message to recruiter
router.post('/message', async (req, res) => {
  try {
    const { email, token, applicationId, subject, message } = req.body;

    if (!email || !applicationId || !message) {
      return res.status(400).json({ error: 'Email, application ID, and message are required' });
    }

    const application = await Application.findById(applicationId)
      .populate('candidate_id', 'email name')
      .populate('job_id', 'title')
      .lean();

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (application.candidate_id?.email?.toLowerCase() !== email.toLowerCase()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Log message as activity
    await new ActivityLog({
      application_id: applicationId,
      action: 'candidate_message',
      description: `Message from candidate: ${subject || 'No subject'}`,
      metadata: {
        subject,
        message,
        from: application.candidate_id.name,
        sentAt: new Date()
      }
    }).save();

    res.json({
      success: true,
      message: 'Message sent successfully. Our team will respond soon.'
    });
  } catch (error) {
    console.error('Message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// GET /api/portal/jobs - Get open job positions
router.get('/jobs', async (req, res) => {
  try {
    const { email } = req.query;

    const jobs = await JobOpening.find({ is_active: true })
      .populate('department_id', 'name')
      .populate('work_setup_id', 'name')
      .select('title department department_id location work_setup work_setup_id role_type about_company requirements createdAt')
      .sort({ createdAt: -1 })
      .lean();

    // If email provided, mark which jobs candidate already applied to
    let appliedJobIds = [];
    if (email) {
      const candidate = await Candidate.findOne({ email: email.toLowerCase() }).lean();
      if (candidate) {
        const applications = await Application.find({ candidate_id: candidate._id }).select('job_id').lean();
        appliedJobIds = applications.map(a => a.job_id.toString());
      }
    }

    const publicJobs = jobs.map(job => ({
      id: job._id,
      title: job.title,
      department: job.department_id?.name || job.department,
      location: job.location,
      workSetup: job.work_setup_id?.name || job.work_setup,
      roleType: job.role_type,
      postedAt: job.createdAt,
      alreadyApplied: appliedJobIds.includes(job._id.toString())
    }));

    res.json({
      success: true,
      data: publicJobs
    });
  } catch (error) {
    console.error('Jobs list error:', error);
    res.status(500).json({ error: 'Failed to get jobs' });
  }
});

// GET /api/portal/file/signed-url - Get signed URL for file download (for candidates)
router.get('/file/signed-url', async (req, res) => {
  try {
    const { key, email } = req.query;

    if (!key) {
      return res.status(400).json({ error: 'File key is required' });
    }

    if (!email) {
      return res.status(400).json({ error: 'Email is required for verification' });
    }

    // Verify the candidate exists
    const candidate = await Candidate.findOne({ email: email.toLowerCase() }).lean();
    if (!candidate) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Check if file exists
    const exists = await s3Service.fileExists(key);
    if (!exists) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Generate signed URL (valid for 1 hour)
    const signedUrl = await s3Service.getSignedDownloadUrl(key, 3600);

    res.json({
      success: true,
      signedUrl,
      expiresIn: 3600
    });
  } catch (error) {
    console.error('Portal signed URL error:', error);
    res.status(500).json({ error: 'Failed to generate signed URL' });
  }
});

// GET /api/portal/interview/:id/calendar - Get calendar invite data
router.get('/interview/:id/calendar', async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.query;

    const interview = await Interview.findById(id)
      .populate({
        path: 'application_id',
        populate: [
          { path: 'candidate_id', select: 'email name' },
          { path: 'job_id', select: 'title' }
        ]
      })
      .lean();

    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    if (interview.application_id?.candidate_id?.email?.toLowerCase() !== email?.toLowerCase()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Build calendar event data
    const startDate = new Date(`${interview.date}T${interview.time || '09:00'}`);
    const endDate = new Date(startDate.getTime() + (interview.duration || 60) * 60000);

    const calendarEvent = {
      title: `Interview: ${interview.application_id?.job_id?.title || 'Position'}`,
      description: `Interview with ${interview.interviewerName || 'Hiring Team'}\n\n${interview.meetingLink ? 'Join: ' + interview.meetingLink : ''}`,
      location: interview.locationType === 'Virtual' ? interview.meetingLink : interview.location,
      start: startDate.toISOString(),
      end: endDate.toISOString()
    };

    // Generate Google Calendar URL
    const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(calendarEvent.title)}&dates=${startDate.toISOString().replace(/[-:]/g, '').replace('.000', '')}/${endDate.toISOString().replace(/[-:]/g, '').replace('.000', '')}&details=${encodeURIComponent(calendarEvent.description)}&location=${encodeURIComponent(calendarEvent.location || '')}`;

    res.json({
      success: true,
      data: {
        event: calendarEvent,
        googleCalendarUrl: googleCalUrl,
        meetingLink: interview.meetingLink
      }
    });
  } catch (error) {
    console.error('Calendar error:', error);
    res.status(500).json({ error: 'Failed to get calendar data' });
  }
});

// GET /api/portal/assignments - Get pending assignments for candidate
router.get('/assignments', async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const candidate = await Candidate.findOne({ email: email.toLowerCase() }).lean();
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    // Find all assignments for this candidate
    const assignments = await CandidateAssignment.find({ candidate_id: candidate._id })
      .populate('application_id', 'job_id')
      .populate({
        path: 'application_id',
        populate: { path: 'job_id', select: 'title' }
      })
      .sort({ sent_at: -1 })
      .lean();

    const publicAssignments = assignments.map(a => ({
      id: a._id,
      applicationId: a.application_id?._id,
      jobTitle: a.application_id?.job_id?.title || 'Position',
      assignmentName: a.assignment_name,
      instructions: a.instructions,
      customInstructions: a.custom_instructions,
      link: a.link,
      files: a.files || [],
      deadline: a.deadline_date,
      sentAt: a.sent_at,
      status: a.status,
      submissionDate: a.submission_date,
      submissionLink: a.submission_link,
      submissionLinks: a.submission_links || (a.submission_link ? [a.submission_link] : []),
      submissionFiles: a.submission_files || [],
      submissionNotes: a.submission_notes,
      canSubmit: ['sent', 'viewed', 'in_progress'].includes(a.status),
      isOverdue: a.deadline_date && new Date(a.deadline_date) < new Date() && !a.submission_date
    }));

    res.json({
      success: true,
      data: publicAssignments
    });
  } catch (error) {
    console.error('Assignments fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// POST /api/portal/assignment/:id/submit - Submit assignment
router.post('/assignment/:id/submit', upload.array('files', 5), async (req, res) => {
  try {
    const { id } = req.params;
    const { email, submissionLink, submissionLinks, notes } = req.body;

    // Support both single link (legacy) and multiple links (new)
    let allLinks = [];
    if (submissionLinks) {
      // Parse if string (from form data)
      const parsedLinks = typeof submissionLinks === 'string' ? JSON.parse(submissionLinks) : submissionLinks;
      allLinks = Array.isArray(parsedLinks) ? parsedLinks.filter(l => l && l.trim()) : [];
    } else if (submissionLink) {
      allLinks = [submissionLink];
    }

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find the assignment
    const assignment = await CandidateAssignment.findById(id)
      .populate('application_id', 'candidate_id job_id')
      .lean();

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Verify candidate owns this assignment
    const candidate = await Candidate.findOne({ email: email.toLowerCase() }).lean();
    if (!candidate || assignment.candidate_id?.toString() !== candidate._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Check if already submitted
    if (['submitted', 'reviewed', 'passed', 'failed'].includes(assignment.status)) {
      return res.status(400).json({ error: 'Assignment already submitted' });
    }

    // Upload files to S3 if provided
    const uploadedFiles = [];
    if (req.files && req.files.length > 0) {
      const bucketName = process.env.AWS_S3_BUCKET || 'aiplanet-recruitment';

      for (const file of req.files) {
        const key = `assignments/submissions/${candidate._id}/${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

        try {
          await s3Client.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype
          }));

          uploadedFiles.push({
            name: file.originalname,
            key: key,
            url: `https://${bucketName}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${key}`,
            type: file.mimetype
          });
        } catch (uploadError) {
          console.error('S3 upload error:', uploadError);
          // Continue with other files even if one fails
        }
      }
    }

    // Validate that we have at least a link or files
    if (allLinks.length === 0 && uploadedFiles.length === 0) {
      return res.status(400).json({ error: 'Please provide a submission link or upload files' });
    }

    // Update the assignment
    await CandidateAssignment.findByIdAndUpdate(id, {
      status: 'submitted',
      submission_date: new Date(),
      submission_link: allLinks[0] || null, // Keep first link for backwards compatibility
      submission_links: allLinks, // Store all links
      submission_files: uploadedFiles,
      submission_notes: notes || null
    });

    // Update application stage to assignment-submitted
    if (assignment.application_id?._id) {
      await Application.findByIdAndUpdate(assignment.application_id._id, {
        stage: 'assignment-submitted'
      });

      // Log activity
      await new ActivityLog({
        application_id: assignment.application_id._id,
        action: 'assignment_submitted',
        description: `Candidate submitted assignment: ${assignment.assignment_name}`,
        metadata: {
          assignmentId: id,
          submissionLinks: allLinks,
          submissionLink: allLinks[0] || null,
          filesCount: uploadedFiles.length,
          submittedBy: 'candidate'
        }
      }).save();

      // Get job details for notification
      const application = await Application.findById(assignment.application_id._id)
        .populate('job_id', 'title')
        .lean();

      // Send notification to recruiter who sent the assignment
      const recruiterEmail = assignment.sent_by || process.env.DEFAULT_RECRUITER_EMAIL || 'hr@aiplanet.com';

      try {
        await sendAssignmentSubmissionNotification({
          recruiterEmail,
          candidateName: candidate.name,
          candidateEmail: candidate.email,
          jobTitle: application?.job_id?.title || assignment.assignment_name,
          assignmentName: assignment.assignment_name,
          submissionLinks: allLinks,
          submissionLink: allLinks[0] || null,
          filesCount: uploadedFiles.length,
          submissionNotes: notes || null,
          applicationId: assignment.application_id._id
        });
      } catch (emailError) {
        console.error('Failed to send recruiter notification:', emailError);
        // Don't fail the submission if email fails
      }
    }

    res.json({
      success: true,
      message: 'Assignment submitted successfully!',
      data: {
        submissionDate: new Date(),
        filesUploaded: uploadedFiles.length
      }
    });
  } catch (error) {
    console.error('Assignment submission error:', error);
    res.status(500).json({ error: 'Failed to submit assignment' });
  }
});

// PUT /api/portal/assignment/:id/view - Mark assignment as viewed
router.put('/assignment/:id/view', async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const assignment = await CandidateAssignment.findById(id).lean();
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Verify candidate
    const candidate = await Candidate.findOne({ email: email.toLowerCase() }).lean();
    if (!candidate || assignment.candidate_id?.toString() !== candidate._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Only update if status is 'sent'
    if (assignment.status === 'sent') {
      await CandidateAssignment.findByIdAndUpdate(id, { status: 'viewed' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Assignment view error:', error);
    res.status(500).json({ error: 'Failed to update assignment' });
  }
});

/**
 * Format stage name for public display
 */
function formatStageForPublic(stage) {
  const stageNames = {
    'shortlisting': 'Application Review',
    'screening': 'Initial Screening',
    'assessment': 'Assessment',
    'assignment-sent': 'Assessment Sent',
    'assignment-submitted': 'Assessment Review',
    'interview': 'Interview Process',
    'offer-sent': 'Offer Extended',
    'offer-pending': 'Offer Extended',
    'offer-accepted': 'Offer Accepted',
    'offer-declined': 'Offer Declined',
    'hired': 'Hired',
    'rejected': 'Not Selected',
    'withdrawn': 'Withdrawn'
  };
  return stageNames[stage] || stage || 'In Review';
}

/**
 * Get public-friendly status
 */
function getPublicStatus(stage) {
  const statuses = {
    'shortlisting': 'in_review',
    'screening': 'in_progress',
    'assessment': 'action_required',
    'assignment-sent': 'action_required',
    'assignment-submitted': 'in_review',
    'interview': 'in_progress',
    'offer-sent': 'action_required',
    'offer-pending': 'action_required',
    'offer-accepted': 'accepted',
    'offer-declined': 'declined',
    'hired': 'completed',
    'rejected': 'closed',
    'withdrawn': 'withdrawn'
  };
  return statuses[stage] || 'in_review';
}

/**
 * Get status description for candidates
 */
function getStatusDescription(stage) {
  const descriptions = {
    'shortlisting': 'Your application is being reviewed by our recruitment team.',
    'screening': 'You have been shortlisted! We will contact you soon.',
    'assessment': 'Please complete the assessment sent to your email.',
    'assignment-sent': 'Please complete the assessment sent to your email.',
    'assignment-submitted': 'Thank you! Our team is reviewing your submission.',
    'interview': 'You are in the interview stage. Check your email for details.',
    'offer-sent': 'Congratulations! We have extended an offer to you. Please review the details below and respond.',
    'offer-pending': 'Great news! We have extended an offer. Please respond.',
    'offer-accepted': 'Welcome aboard! Our HR team will contact you soon.',
    'offer-declined': 'We respect your decision. Best wishes for your future.',
    'hired': 'Congratulations! You are now part of our team.',
    'rejected': 'Thank you for your interest. We encourage you to apply again.',
    'withdrawn': 'Your application has been withdrawn.'
  };
  return descriptions[stage] || 'Your application is being processed.';
}

/**
 * Build public timeline for application
 */
function buildPublicTimeline(application, interviews, activities) {
  const timeline = [];

  // Application submitted
  timeline.push({
    event: 'Application Submitted',
    date: application.applied_at || application.createdAt,
    status: 'completed',
    icon: '📋'
  });

  // Add relevant activities
  activities.forEach(activity => {
    const eventMap = {
      // Stage changes (note: logged as 'stage_changed' with 'd')
      'stage_change': { event: 'Status Updated', icon: '🔄' },
      'stage_changed': { event: 'Status Updated', icon: '🔄' },
      // Interviews
      'interview_scheduled': { event: 'Interview Scheduled', icon: '📅' },
      'screening_scheduled': { event: 'Screening Call Scheduled', icon: '📞' },
      'scorecard_submitted': { event: 'Interview Feedback Received', icon: '📋' },
      // Assignments
      'assignment_sent': { event: 'Assignment Sent', icon: '📝' },
      'assignment_submitted': { event: 'Assignment Submitted', icon: '✅' },
      // Offers
      'offer_sent': { event: 'Offer Extended', icon: '🎁' },
      'offer_accepted': { event: 'Offer Accepted', icon: '🎉' },
      'offer_rejected': { event: 'Offer Declined', icon: '❌' },
      'offer_updated': { event: 'Offer Updated', icon: '📝' },
      // Application status
      'application_submitted': { event: 'Application Received', icon: '📋' },
      'application_withdrawn': { event: 'Application Withdrawn', icon: '📤' },
      'application_rejected': { event: 'Application Not Selected', icon: '📭' },
      'rejected': { event: 'Application Not Selected', icon: '📭' },
      // Other
      'candidate_message': { event: 'Message Sent', icon: '💬' },
      'comment_added': { event: 'Note Added', icon: '📝' },
      'added_to_talent_pool': { event: 'Added to Talent Pool', icon: '⭐' }
    };

    const mapped = eventMap[activity.action];
    if (mapped) {
      timeline.push({
        event: mapped.event,
        description: activity.description,
        date: activity.createdAt,
        status: 'completed',
        icon: mapped.icon
      });
    }
  });

  // Add interviews
  interviews.forEach(interview => {
    const isCompleted = interview.status === 'Completed' || interview.status === 'completed';
    const isPast = new Date(interview.date) < new Date();

    timeline.push({
      event: interview.title || 'Interview',
      date: interview.date,
      time: interview.time,
      status: isCompleted ? 'completed' : (isPast ? 'missed' : 'upcoming'),
      icon: '🎤',
      interviewId: interview._id
    });
  });

  // Sort by date
  return timeline.sort((a, b) => new Date(a.date) - new Date(b.date));
}

module.exports = router;
