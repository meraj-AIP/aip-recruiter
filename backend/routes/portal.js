// =====================================================
// CANDIDATE PORTAL ROUTES - Public Status Tracking
// =====================================================

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { Application, Candidate, JobOpening, Interview, Offer } = require('../models');

/**
 * Generate a secure tracking token for a candidate
 * @param {string} email - Candidate email
 * @param {string} applicationId - Application ID
 * @returns {string} Tracking token
 */
function generateTrackingToken(email, applicationId) {
  const secret = process.env.JWT_SECRET || 'recruitment-portal-secret';
  const data = `${email}:${applicationId}:${Date.now()}`;
  return crypto.createHmac('sha256', secret).update(data).digest('hex').substring(0, 32);
}

/**
 * Verify tracking token
 * @param {string} token - Token to verify
 * @param {string} email - Candidate email
 * @returns {boolean} Whether token is valid
 */
function verifyToken(token, email) {
  // For simplicity, we're using email-based lookup
  // In production, you'd want to store and validate tokens
  return token && token.length === 32;
}

// POST /api/portal/lookup - Look up application status by email
router.post('/lookup', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find candidate by email
    const candidate = await Candidate.findOne({ email: email.toLowerCase() }).lean();

    if (!candidate) {
      return res.status(404).json({
        success: false,
        error: 'No applications found for this email'
      });
    }

    // Find all applications for this candidate
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

    // Generate tracking token
    const token = generateTrackingToken(email, applications[0]._id);

    // Return summarized application data (no sensitive info)
    const publicApplications = applications.map(app => ({
      id: app._id,
      jobTitle: app.job_id?.title || 'Position',
      department: app.job_id?.department || '',
      location: app.job_id?.location || '',
      appliedAt: app.applied_at || app.createdAt,
      stage: formatStageForPublic(app.stage),
      status: getPublicStatus(app.stage)
    }));

    res.json({
      success: true,
      data: {
        candidateName: candidate.name,
        email: candidate.email,
        applications: publicApplications,
        token
      }
    });
  } catch (error) {
    console.error('Portal lookup error:', error);
    res.status(500).json({ error: 'Failed to look up applications' });
  }
});

// GET /api/portal/application/:id - Get detailed application status
router.get('/application/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, token } = req.query;

    if (!email) {
      return res.status(400).json({ error: 'Email is required for verification' });
    }

    // Find application
    const application = await Application.findById(id)
      .populate('candidate_id', 'name email')
      .populate('job_id', 'title department location description')
      .lean();

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Verify email matches
    if (application.candidate_id?.email?.toLowerCase() !== email.toLowerCase()) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    // Get interviews for this application (public info only)
    const interviews = await Interview.find({ application_id: id })
      .select('title date time status locationType platform')
      .sort({ date: 1 })
      .lean();

    // Get offer status if any
    const offer = await Offer.findOne({ application_id: id })
      .select('status sent_at expires_at')
      .lean();

    // Build timeline
    const timeline = buildPublicTimeline(application, interviews, offer);

    res.json({
      success: true,
      data: {
        applicationId: application._id,
        candidateName: application.candidate_id?.name,
        jobTitle: application.job_id?.title,
        department: application.job_id?.department,
        location: application.job_id?.location,
        appliedAt: application.applied_at || application.createdAt,
        currentStage: formatStageForPublic(application.stage),
        status: getPublicStatus(application.stage),
        statusDescription: getStatusDescription(application.stage),
        timeline,
        upcomingInterviews: interviews.filter(i => i.status === 'Scheduled' || i.status === 'scheduled').map(i => ({
          title: i.title,
          date: i.date,
          time: i.time,
          type: i.locationType,
          platform: i.platform
        })),
        hasOffer: !!offer,
        offerStatus: offer?.status
      }
    });
  } catch (error) {
    console.error('Portal application error:', error);
    res.status(500).json({ error: 'Failed to get application details' });
  }
});

// GET /api/portal/status/:applicationId - Quick status check
router.get('/status/:applicationId', async (req, res) => {
  try {
    const { applicationId } = req.params;

    const application = await Application.findById(applicationId)
      .select('stage status updatedAt')
      .lean();

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json({
      success: true,
      data: {
        stage: formatStageForPublic(application.stage),
        status: getPublicStatus(application.stage),
        lastUpdated: application.updatedAt
      }
    });
  } catch (error) {
    console.error('Quick status error:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

/**
 * Format stage name for public display
 */
function formatStageForPublic(stage) {
  const stageNames = {
    'shortlisting': 'Application Review',
    'screening': 'Initial Screening',
    'assignment-sent': 'Assessment',
    'assignment-submitted': 'Assessment Review',
    'interview': 'Interview Process',
    'offer-sent': 'Offer Extended',
    'offer-accepted': 'Offer Accepted',
    'hired': 'Hired',
    'rejected': 'Not Selected'
  };
  return stageNames[stage] || 'In Review';
}

/**
 * Get public-friendly status
 */
function getPublicStatus(stage) {
  const statuses = {
    'shortlisting': 'in_review',
    'screening': 'in_progress',
    'assignment-sent': 'action_required',
    'assignment-submitted': 'in_review',
    'interview': 'in_progress',
    'offer-sent': 'action_required',
    'offer-accepted': 'accepted',
    'hired': 'completed',
    'rejected': 'closed'
  };
  return statuses[stage] || 'in_review';
}

/**
 * Get status description for candidates
 */
function getStatusDescription(stage) {
  const descriptions = {
    'shortlisting': 'Your application is being reviewed by our recruitment team.',
    'screening': 'You have been shortlisted! We will contact you soon for an initial conversation.',
    'assignment-sent': 'Please complete the assessment that was sent to your email.',
    'assignment-submitted': 'Thank you for completing the assessment. Our team is reviewing your submission.',
    'interview': 'Congratulations on moving to the interview stage! Check your email for interview details.',
    'offer-sent': 'Great news! We have extended an offer. Please review and respond.',
    'offer-accepted': 'Welcome aboard! Our HR team will contact you with next steps.',
    'hired': 'Congratulations! You are now part of our team.',
    'rejected': 'Thank you for your interest. We encourage you to apply for future opportunities.'
  };
  return descriptions[stage] || 'Your application is being processed.';
}

/**
 * Build public timeline for application
 */
function buildPublicTimeline(application, interviews, offer) {
  const timeline = [];

  // Application submitted
  timeline.push({
    event: 'Application Submitted',
    date: application.applied_at || application.createdAt,
    status: 'completed'
  });

  // Stage progression
  const stages = ['shortlisting', 'screening', 'assignment-sent', 'assignment-submitted', 'interview', 'offer-sent', 'offer-accepted', 'hired'];
  const currentIndex = stages.indexOf(application.stage);

  if (currentIndex > 0) {
    timeline.push({
      event: 'Application Reviewed',
      date: application.updatedAt,
      status: 'completed'
    });
  }

  if (currentIndex >= 1) {
    timeline.push({
      event: 'Shortlisted',
      date: application.updatedAt,
      status: 'completed'
    });
  }

  // Add interview events
  interviews.forEach(interview => {
    timeline.push({
      event: `Interview: ${interview.title}`,
      date: interview.date,
      status: interview.status === 'completed' || interview.status === 'Completed' ? 'completed' : 'pending'
    });
  });

  // Add offer event
  if (offer) {
    timeline.push({
      event: 'Offer Extended',
      date: offer.sent_at,
      status: offer.status === 'accepted' ? 'completed' : 'pending'
    });
  }

  return timeline.sort((a, b) => new Date(a.date) - new Date(b.date));
}

module.exports = router;
