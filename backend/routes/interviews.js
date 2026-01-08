// =====================================================
// INTERVIEWS ROUTES - MongoDB
// =====================================================

const express = require('express');
const router = express.Router();
const { Interview, Application, ActivityLog } = require('../models');
const emailService = require('../services/emailService');

// GET /api/interviews - Get all interviews
router.get('/', async (req, res) => {
  try {
    const { applicationId, candidateId, status, companyId } = req.query;

    const filter = {};
    if (applicationId) filter.application_id = applicationId;
    if (candidateId) filter.candidate_id = candidateId;
    if (status) filter.status = status;
    if (companyId) filter.company_id = companyId;

    const interviews = await Interview.find(filter)
      .populate('application_id')
      .populate('candidate_id')
      .populate('job_id')
      .sort({ scheduled_date: -1, scheduled_time: -1 })
      .lean();

    const data = interviews.map(interview => ({
      id: interview._id,
      applicationId: interview.application_id?._id,
      candidateId: interview.candidate_id?._id,
      jobId: interview.job_id?._id,
      title: interview.title,
      type: interview.type,
      scheduledDate: interview.scheduled_date,
      scheduledTime: interview.scheduled_time,
      durationMinutes: interview.duration_minutes,
      locationType: interview.location_type,
      platform: interview.platform,
      meetingLink: interview.meeting_link,
      address: interview.address,
      interviewerName: interview.interviewer_name,
      status: interview.status,
      notes: interview.notes,
      feedback: interview.feedback,
      feedbackSubmitted: interview.feedback_submitted,
      rating: interview.rating,
      scheduledBy: interview.scheduled_by,
      createdAt: interview.createdAt,
      updatedAt: interview.updatedAt,
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching interviews:', error);
    res.status(500).json({ error: 'Failed to fetch interviews' });
  }
});

// GET /api/interviews/:id - Get single interview
router.get('/:id', async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id)
      .populate('application_id')
      .populate('candidate_id')
      .populate('job_id')
      .lean();

    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    res.json({
      success: true,
      data: {
        id: interview._id,
        applicationId: interview.application_id?._id,
        candidateId: interview.candidate_id?._id,
        jobId: interview.job_id?._id,
        title: interview.title,
        type: interview.type,
        scheduledDate: interview.scheduled_date,
        scheduledTime: interview.scheduled_time,
        durationMinutes: interview.duration_minutes,
        locationType: interview.location_type,
        platform: interview.platform,
        meetingLink: interview.meeting_link,
        address: interview.address,
        interviewerName: interview.interviewer_name,
        status: interview.status,
        notes: interview.notes,
        feedback: interview.feedback,
        feedbackSubmitted: interview.feedback_submitted,
        rating: interview.rating,
        scheduledBy: interview.scheduled_by,
        createdAt: interview.createdAt,
      }
    });
  } catch (error) {
    console.error('Error fetching interview:', error);
    res.status(500).json({ error: 'Failed to fetch interview' });
  }
});

// GET /api/interviews/by-application/:applicationId - Get interviews for specific application
router.get('/by-application/:applicationId', async (req, res) => {
  try {
    const interviews = await Interview.find({
      application_id: req.params.applicationId
    })
      .sort({ scheduled_date: -1, scheduled_time: -1 })
      .lean();

    const data = interviews.map(interview => ({
      id: interview._id,
      title: interview.title,
      type: interview.type,
      scheduledDate: interview.scheduled_date,
      scheduledTime: interview.scheduled_time,
      durationMinutes: interview.duration_minutes,
      locationType: interview.location_type,
      platform: interview.platform,
      meetingLink: interview.meeting_link,
      address: interview.address,
      interviewerName: interview.interviewer_name,
      status: interview.status,
      notes: interview.notes,
      scheduledBy: interview.scheduled_by,
      createdAt: interview.createdAt,
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching interviews for application:', error);
    res.status(500).json({ error: 'Failed to fetch interviews' });
  }
});

// POST /api/interviews - Create new interview
router.post('/', async (req, res) => {
  try {
    const {
      applicationId,
      candidateId,
      companyId,
      jobId,
      title,
      type,
      scheduledDate,
      scheduledTime,
      durationMinutes,
      locationType,
      platform,
      meetingLink,
      address,
      interviewerName,
      interviewerEmail,
      notes,
      scheduledBy,
      sendEmail,
      candidateName,
      candidateEmail,
      jobTitle
    } = req.body;

    if (!applicationId) {
      return res.status(400).json({ error: 'Application ID is required' });
    }

    const interview = new Interview({
      application_id: applicationId,
      candidate_id: candidateId || null,
      company_id: companyId || null,
      job_id: jobId || null,
      title,
      type: type || 'online',
      scheduled_date: scheduledDate ? new Date(scheduledDate) : null,
      scheduled_time: scheduledTime,
      duration_minutes: parseInt(durationMinutes) || 60,
      location_type: locationType || 'online',
      platform,
      meeting_link: meetingLink,
      address,
      interviewer_name: interviewerName,
      notes,
      scheduled_by: scheduledBy || 'Admin',
      status: 'scheduled',
    });

    await interview.save();

    // Update application stage to interview if not already
    await Application.findByIdAndUpdate(applicationId, {
      stage: 'interview',
      last_activity_at: new Date(),
      updatedAt: new Date()
    });

    // Log activity
    await new ActivityLog({
      application_id: applicationId,
      company_id: companyId,
      action: 'interview_scheduled',
      description: `Interview scheduled for ${scheduledDate} at ${scheduledTime}`,
      metadata: { interviewId: interview._id, interviewer: interviewerName }
    }).save();

    console.log('✅ Interview scheduled:', interview._id);

    // Send email if requested
    let emailSent = false;
    if (sendEmail && candidateEmail) {
      try {
        // Get candidate and job info if not provided
        const application = await Application.findById(applicationId)
          .populate('candidate_id', 'name email resume_url')
          .populate('job_id', 'title')
          .lean();

        await emailService.sendInterviewEmails({
          candidateName: candidateName || application?.candidate_id?.name || 'Candidate',
          candidateEmail: candidateEmail || application?.candidate_id?.email,
          jobTitle: jobTitle || application?.job_id?.title || 'the position',
          interviewTitle: title,
          scheduledDate,
          scheduledTime,
          durationMinutes: parseInt(durationMinutes) || 60,
          locationType: locationType || 'online',
          platform,
          meetingLink,
          address,
          interviewerName,
          interviewerEmail,
          notes,
          resumeUrl: application?.candidate_id?.resume_url
        });
        emailSent = true;
        console.log('📧 Interview invitation emails sent');
      } catch (emailError) {
        console.error('Failed to send interview email:', emailError);
      }
    }

    res.status(201).json({
      success: true,
      data: {
        id: interview._id,
        title: interview.title,
        scheduledDate: interview.scheduled_date,
        scheduledTime: interview.scheduled_time,
        status: interview.status,
        emailSent
      },
      message: emailSent ? 'Interview scheduled and invitations sent' : 'Interview scheduled successfully'
    });
  } catch (error) {
    console.error('Error creating interview:', error);
    res.status(500).json({ error: 'Failed to schedule interview' });
  }
});

// PUT /api/interviews/:id - Update interview
router.put('/:id', async (req, res) => {
  try {
    const {
      title,
      type,
      scheduledDate,
      scheduledTime,
      durationMinutes,
      locationType,
      platform,
      meetingLink,
      address,
      interviewerName,
      notes,
      status
    } = req.body;

    const updateData = { updatedAt: new Date() };
    if (title !== undefined) updateData.title = title;
    if (type !== undefined) updateData.type = type;
    if (scheduledDate !== undefined) updateData.scheduled_date = new Date(scheduledDate);
    if (scheduledTime !== undefined) updateData.scheduled_time = scheduledTime;
    if (durationMinutes !== undefined) updateData.duration_minutes = parseInt(durationMinutes);
    if (locationType !== undefined) updateData.location_type = locationType;
    if (platform !== undefined) updateData.platform = platform;
    if (meetingLink !== undefined) updateData.meeting_link = meetingLink;
    if (address !== undefined) updateData.address = address;
    if (interviewerName !== undefined) updateData.interviewer_name = interviewerName;
    if (notes !== undefined) updateData.notes = notes;
    if (status !== undefined) updateData.status = status;

    const interview = await Interview.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).lean();

    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    res.json({
      success: true,
      data: {
        id: interview._id,
        title: interview.title,
        scheduledDate: interview.scheduled_date,
        scheduledTime: interview.scheduled_time,
        status: interview.status,
      }
    });
  } catch (error) {
    console.error('Error updating interview:', error);
    res.status(500).json({ error: 'Failed to update interview' });
  }
});

// PATCH /api/interviews/:id/status - Update interview status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, feedback, rating } = req.body;

    const updateData = { status, updatedAt: new Date() };

    if (status === 'completed') {
      if (feedback) updateData.feedback = feedback;
      if (rating !== undefined) updateData.rating = rating;
      updateData.feedback_submitted = !!feedback;
    }

    const interview = await Interview.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).lean();

    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    res.json({
      success: true,
      data: {
        id: interview._id,
        status: interview.status,
      }
    });
  } catch (error) {
    console.error('Error updating interview status:', error);
    res.status(500).json({ error: 'Failed to update interview status' });
  }
});

// DELETE /api/interviews/:id - Delete interview
router.delete('/:id', async (req, res) => {
  try {
    await Interview.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Interview deleted successfully' });
  } catch (error) {
    console.error('Error deleting interview:', error);
    res.status(500).json({ error: 'Failed to delete interview' });
  }
});

// =====================================================
// REMINDER ENDPOINTS
// =====================================================

const reminderService = require('../services/reminderService');

// GET /api/interviews/reminders/upcoming - Get upcoming interviews needing reminders
router.get('/reminders/upcoming', async (req, res) => {
  try {
    const { hours = 24 } = req.query;

    const interviews = await reminderService.getUpcomingInterviews(parseInt(hours));

    res.json({
      success: true,
      data: interviews,
      count: interviews.length
    });
  } catch (error) {
    console.error('Error getting upcoming interviews:', error);
    res.status(500).json({ error: 'Failed to get upcoming interviews' });
  }
});

// POST /api/interviews/reminders/process - Process all pending reminders
router.post('/reminders/process', async (req, res) => {
  try {
    const { hours = 24 } = req.body;

    const result = await reminderService.processInterviewReminders(parseInt(hours));

    res.json({
      success: true,
      message: `Processed ${result.total} reminders: ${result.sent} sent, ${result.failed} failed`,
      data: result
    });
  } catch (error) {
    console.error('Error processing reminders:', error);
    res.status(500).json({ error: 'Failed to process reminders' });
  }
});

// POST /api/interviews/:id/reminder - Send reminder for specific interview
router.post('/:id/reminder', async (req, res) => {
  try {
    const result = await reminderService.sendManualReminder(req.params.id);

    if (result.success) {
      res.json({
        success: true,
        message: `Reminder sent to ${result.email}`
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error sending reminder:', error);
    res.status(500).json({ error: 'Failed to send reminder' });
  }
});

// =====================================================
// SCORECARD ENDPOINTS
// =====================================================

// GET /api/interviews/:id/scorecard - Get interview scorecard
router.get('/:id/scorecard', async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id).lean();

    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    res.json({
      success: true,
      data: interview.scorecard || null
    });
  } catch (error) {
    console.error('Error getting scorecard:', error);
    res.status(500).json({ error: 'Failed to get scorecard' });
  }
});

// POST /api/interviews/:id/scorecard - Submit interview scorecard
router.post('/:id/scorecard', async (req, res) => {
  try {
    const {
      technicalSkills,
      communication,
      problemSolving,
      cultureFit,
      leadership,
      recommendation,
      strengths,
      weaknesses,
      additionalNotes,
      submittedBy
    } = req.body;

    // Calculate overall score
    const scores = [
      technicalSkills?.score,
      communication?.score,
      problemSolving?.score,
      cultureFit?.score,
      leadership?.score
    ].filter(s => s !== undefined && s !== null);

    const overallScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10
      : null;

    const scorecard = {
      technicalSkills,
      communication,
      problemSolving,
      cultureFit,
      leadership,
      overallScore,
      recommendation,
      strengths: strengths || [],
      weaknesses: weaknesses || [],
      additionalNotes,
      submittedBy,
      submittedAt: new Date()
    };

    const interview = await Interview.findByIdAndUpdate(
      req.params.id,
      {
        scorecard,
        feedback_submitted: true,
        rating: overallScore
      },
      { new: true }
    ).lean();

    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    // Log activity
    await new ActivityLog({
      application_id: interview.application_id,
      action: 'scorecard_submitted',
      description: `Interview scorecard submitted by ${submittedBy}`,
      metadata: { interviewId: interview._id, overallScore, recommendation }
    }).save();

    res.json({
      success: true,
      message: 'Scorecard submitted successfully',
      data: interview.scorecard
    });
  } catch (error) {
    console.error('Error submitting scorecard:', error);
    res.status(500).json({ error: 'Failed to submit scorecard' });
  }
});

// GET /api/interviews/scorecards/pending - Get interviews pending scorecard
router.get('/scorecards/pending', async (req, res) => {
  try {
    const interviews = await Interview.find({
      status: { $in: ['completed', 'Completed'] },
      feedback_submitted: { $ne: true }
    })
    .populate({
      path: 'application_id',
      populate: [
        { path: 'candidate_id', select: 'name email' },
        { path: 'job_id', select: 'title' }
      ]
    })
    .sort({ scheduled_date: -1 })
    .lean();

    res.json({
      success: true,
      data: interviews,
      count: interviews.length
    });
  } catch (error) {
    console.error('Error getting pending scorecards:', error);
    res.status(500).json({ error: 'Failed to get pending scorecards' });
  }
});

module.exports = router;
