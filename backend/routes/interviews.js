// =====================================================
// INTERVIEWS ROUTES - MongoDB
// =====================================================

const express = require('express');
const router = express.Router();
const { Interview, Application, ActivityLog } = require('../models');

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
      notes,
      scheduledBy
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

    res.status(201).json({
      success: true,
      data: {
        id: interview._id,
        title: interview.title,
        scheduledDate: interview.scheduled_date,
        scheduledTime: interview.scheduled_time,
        status: interview.status,
      },
      message: 'Interview scheduled successfully'
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

module.exports = router;
