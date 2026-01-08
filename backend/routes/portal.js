// =====================================================
// CANDIDATE PORTAL ROUTES - Public Status Tracking
// =====================================================

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { Application, Candidate, JobOpening, Interview, ActivityLog } = require('../models');

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
          feedback: i.status === 'Completed' || i.status === 'completed' ? (i.feedback ? 'Received' : 'Pending') : null
        })),
        canWithdraw: !['hired', 'rejected', 'offer-accepted'].includes(application.stage),
        canAcceptOffer: application.stage === 'offer-pending',
        canDeclineOffer: application.stage === 'offer-pending'
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
    const { email, token, response, message } = req.body;

    if (!email || !response) {
      return res.status(400).json({ error: 'Email and response are required' });
    }

    if (!['accept', 'decline'].includes(response)) {
      return res.status(400).json({ error: 'Response must be accept or decline' });
    }

    const application = await Application.findById(id).populate('candidate_id', 'email name').lean();

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (application.candidate_id?.email?.toLowerCase() !== email.toLowerCase()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (application.stage !== 'offer-pending') {
      return res.status(400).json({ error: 'No pending offer to respond to' });
    }

    const newStage = response === 'accept' ? 'offer-accepted' : 'offer-declined';

    await Application.findByIdAndUpdate(id, {
      stage: newStage,
      offerResponseAt: new Date(),
      offerResponseMessage: message
    });

    await new ActivityLog({
      application_id: id,
      action: response === 'accept' ? 'offer_accepted' : 'offer_declined',
      description: `${application.candidate_id.name} ${response === 'accept' ? 'accepted' : 'declined'} the offer`,
      metadata: { response, message, respondedBy: 'candidate' }
    }).save();

    res.json({
      success: true,
      message: response === 'accept' ? 'Congratulations! Offer accepted.' : 'Offer declined.'
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

    const jobs = await JobOpening.find({ on: true })
      .select('title department location work_setup role_type about_company requirements createdAt')
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
      department: job.department,
      location: job.location,
      workSetup: job.work_setup,
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
      'stage_change': { event: 'Status Updated', icon: '🔄' },
      'interview_scheduled': { event: 'Interview Scheduled', icon: '📅' },
      'offer_sent': { event: 'Offer Sent', icon: '📝' },
      'offer_accepted': { event: 'Offer Accepted', icon: '🎉' },
      'application_withdrawn': { event: 'Application Withdrawn', icon: '📤' }
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
