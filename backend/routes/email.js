// =====================================================
// EMAIL ROUTES - MongoDB
// =====================================================

const express = require('express');
const router = express.Router();
const { Candidate, JobOpening, Application, Interview } = require('../models');
const emailService = require('../services/emailService');

// POST /api/email/application-received
router.post('/application-received', async (req, res) => {
  try {
    const { candidateId, jobId } = req.body;

    const candidate = await Candidate.findById(candidateId).lean();
    const job = await JobOpening.findById(jobId)
      .populate('department_id', 'name')
      .lean();

    if (!candidate || !job) {
      return res.status(404).json({ error: 'Candidate or job not found' });
    }

    await emailService.sendApplicationReceived(candidate, {
      ...job,
      department: job.department_id?.name
    });

    res.json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// POST /api/email/interview-invitation
router.post('/interview-invitation', async (req, res) => {
  try {
    const { candidateId, interviewId } = req.body;

    const candidate = await Candidate.findById(candidateId).lean();
    const interview = await Interview.findById(interviewId)
      .populate({
        path: 'application_id',
        populate: { path: 'job_id', select: 'title' }
      })
      .lean();

    if (!candidate || !interview) {
      return res.status(404).json({ error: 'Candidate or interview not found' });
    }

    await emailService.sendInterviewInvitation(candidate, {
      ...interview,
      jobTitle: interview.application_id?.job_id?.title
    });

    res.json({ success: true, message: 'Interview invitation sent' });
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ error: 'Failed to send interview invitation' });
  }
});

// POST /api/email/interview-with-calendar - Send interview invitation with calendar invite
router.post('/interview-with-calendar', async (req, res) => {
  try {
    const {
      candidateName,
      candidateEmail,
      jobTitle,
      interviewTitle,
      scheduledDate,
      scheduledTime,
      durationMinutes,
      locationType,
      platform,
      meetingLink,
      address,
      interviewerName,
      interviewerEmail,
      notes
    } = req.body;

    // Validate required fields
    if (!candidateEmail || !candidateName || !jobTitle || !scheduledDate || !scheduledTime) {
      return res.status(400).json({
        error: 'Missing required fields: candidateEmail, candidateName, jobTitle, scheduledDate, scheduledTime'
      });
    }

    // Send emails to both candidate and interviewer
    const result = await emailService.sendInterviewEmails({
      candidateName,
      candidateEmail,
      jobTitle,
      interviewTitle,
      scheduledDate,
      scheduledTime,
      durationMinutes: durationMinutes || 60,
      locationType: locationType || 'online',
      platform,
      meetingLink,
      address,
      interviewerName,
      interviewerEmail,
      notes
    });

    if (result.errors.length > 0) {
      console.error('Some emails failed to send:', result.errors);
      return res.status(207).json({
        success: true,
        message: 'Interview invitations sent with some errors',
        results: result
      });
    }

    res.json({
      success: true,
      message: 'Interview invitations sent successfully to candidate and interviewer',
      results: result
    });
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ error: 'Failed to send interview invitations' });
  }
});

// POST /api/email/status-update
router.post('/status-update', async (req, res) => {
  try {
    const { applicationId, newStatus } = req.body;

    const application = await Application.findById(applicationId)
      .populate('candidate_id')
      .populate('job_id')
      .lean();

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    await emailService.sendStatusUpdate(
      application.candidate_id,
      newStatus,
      application.job_id
    );

    res.json({ success: true, message: 'Status update email sent' });
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ error: 'Failed to send status update' });
  }
});

// POST /api/email/rejection
router.post('/rejection', async (req, res) => {
  try {
    const { applicationId } = req.body;

    const application = await Application.findById(applicationId)
      .populate('candidate_id')
      .populate('job_id')
      .lean();

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    await emailService.sendRejection(
      application.candidate_id,
      application.job_id
    );

    res.json({ success: true, message: 'Rejection email sent' });
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ error: 'Failed to send rejection email' });
  }
});

// POST /api/email/offer
router.post('/offer', async (req, res) => {
  try {
    const { candidateId, jobId, offerDetails } = req.body;

    const candidate = await Candidate.findById(candidateId).lean();
    const job = await JobOpening.findById(jobId).lean();

    if (!candidate || !job) {
      return res.status(404).json({ error: 'Candidate or job not found' });
    }

    await emailService.sendOfferLetter(candidate, {
      jobTitle: job.title,
      ...offerDetails
    });

    res.json({ success: true, message: 'Offer letter sent' });
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ error: 'Failed to send offer letter' });
  }
});

module.exports = router;
