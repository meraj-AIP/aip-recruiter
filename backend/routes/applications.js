// =====================================================
// APPLICATIONS ROUTES - MongoDB
// =====================================================

const express = require('express');
const router = express.Router();
const { Application, Candidate, JobOpening, PipelineStage, ActivityLog, Interview } = require('../models');
const emailService = require('../services/emailService');

// GET /api/applications - Get all applications
router.get('/', async (req, res) => {
  try {
    const { companyId, jobId, stageId, status, minScore, search, limit = 50, offset = 0 } = req.query;

    const filter = {};
    if (companyId) filter.company_id = companyId;
    if (jobId) filter.job_id = jobId;
    if (stageId) filter.stage_id = stageId;
    if (status) filter.status = status;
    if (minScore) filter.ai_score = { $gte: parseInt(minScore) };

    let applications = await Application.find(filter)
      .populate('candidate_id')
      .populate({
        path: 'job_id',
        populate: [
          { path: 'department_id', select: 'name' },
          { path: 'role_type_id', select: 'name' },
          { path: 'work_setup_id', select: 'name' }
        ]
      })
      .populate('stage_id')
      .sort({ createdAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .lean();

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      applications = applications.filter(app =>
        app.candidate_id?.name?.toLowerCase().includes(searchLower) ||
        app.candidate_id?.email?.toLowerCase().includes(searchLower) ||
        app.job_id?.title?.toLowerCase().includes(searchLower)
      );
    }

    const data = applications.map(app => ({
      ...app,
      id: app._id,
      candidate: app.candidate_id ? { ...app.candidate_id, id: app.candidate_id._id } : null,
      job: app.job_id ? {
        ...app.job_id,
        id: app.job_id._id,
        department: app.job_id.department_id,
        role_type: app.job_id.role_type_id,
        work_setup: app.job_id.work_setup_id,
      } : null,
      // Keep the string stage field from the document, don't overwrite with stage_id
      stage: app.stage || 'shortlisting',
      pipelineStage: app.stage_id ? { ...app.stage_id, id: app.stage_id._id } : null,
    }));

    res.json({ success: true, data, count: data.length });
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// GET /api/applications/:id - Get single application
router.get('/:id', async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('candidate_id')
      .populate({
        path: 'job_id',
        populate: [
          { path: 'department_id', select: 'name' },
          { path: 'role_type_id', select: 'name' },
          { path: 'work_setup_id', select: 'name' }
        ]
      })
      .populate('stage_id')
      .lean();

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const interviews = await Interview.find({ application_id: application._id }).lean();

    const data = {
      ...application,
      id: application._id,
      candidate: application.candidate_id,
      job: application.job_id ? {
        ...application.job_id,
        department: application.job_id.department_id,
        role_type: application.job_id.role_type_id,
        work_setup: application.job_id.work_setup_id,
      } : null,
      // Keep the string stage field from the document
      stage: application.stage || 'shortlisting',
      pipelineStage: application.stage_id,
      interviews: interviews.map(i => ({ ...i, id: i._id })),
    };

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/applications - Create new application
router.post('/', async (req, res) => {
  try {
    const applicationData = req.body;

    if (!applicationData.company_id || !applicationData.job_id || !applicationData.candidate_id) {
      return res.status(400).json({
        error: 'Missing required fields: company_id, job_id, candidate_id'
      });
    }

    const application = new Application({
      ...applicationData,
      applied_at: new Date(),
    });
    await application.save();

    // Auto-run AI scoring in background
    (async () => {
      try {
        // Get candidate resume text
        const candidate = await Candidate.findById(applicationData.candidate_id).lean();
        const resumeText = candidate?.resume_text;

        if (resumeText) {
          const jobDetails = await JobOpening.findById(applicationData.job_id)
            .populate('department_id', 'name')
            .populate('role_type_id', 'name')
            .lean();

          if (jobDetails) {
            const { analyzeResume, quickScore } = require('../services/aiScoring');
            console.log('🤖 Starting auto AI scoring for application:', application._id);

            try {
              const analysis = await analyzeResume(resumeText, {
                title: jobDetails.title,
                department: jobDetails.department_id?.name,
                skills: jobDetails.skills,
                experienceMin: jobDetails.experience_min,
                experienceMax: jobDetails.experience_max,
                qualifications: jobDetails.qualifications,
                keyResponsibilities: jobDetails.key_responsibilities
              });

              await Application.findByIdAndUpdate(application._id, {
                ai_score: analysis.score,
                ai_analysis: analysis.detailedAnalysis,
                profile_strength: analysis.profileStrength,
              });

              console.log('✅ AI scoring completed:', application._id, 'Score:', analysis.score);
            } catch (aiError) {
              console.error('❌ AI scoring failed, trying quick score:', aiError.message);
              const score = quickScore(resumeText, jobDetails);
              await Application.findByIdAndUpdate(application._id, {
                ai_score: score,
                profile_strength: score >= 70 ? 'Good' : 'Fair',
              });
              console.log('✅ Quick score applied:', application._id, 'Score:', score);
            }
          }
        }
      } catch (scoringError) {
        console.error('❌ Auto AI scoring error:', scoringError);
      }
    })();

    res.status(201).json({ success: true, data: { ...application.toObject(), id: application._id } });
  } catch (error) {
    console.error('Error creating application:', error);
    res.status(500).json({ error: 'Failed to create application' });
  }
});

// PATCH /api/applications/:id - Update application
router.patch('/:id', async (req, res) => {
  try {
    const application = await Application.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    ).lean();

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json({ success: true, data: { ...application, id: application._id } });
  } catch (error) {
    console.error('Error updating application:', error);
    res.status(500).json({ error: 'Failed to update application' });
  }
});

// DELETE /api/applications/:id - Delete application
router.delete('/:id', async (req, res) => {
  try {
    await Application.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Application deleted successfully' });
  } catch (error) {
    console.error('Error deleting application:', error);
    res.status(500).json({ error: 'Failed to delete application' });
  }
});

// POST /api/applications/:id/move-stage - Move to different stage
router.post('/:id/move-stage', async (req, res) => {
  try {
    const { stageId } = req.body;

    if (!stageId) {
      return res.status(400).json({ error: 'Stage ID is required' });
    }

    const application = await Application.findByIdAndUpdate(
      req.params.id,
      {
        stage_id: stageId,
        days_in_stage: 0,
        last_activity_at: new Date(),
        updatedAt: new Date()
      },
      { new: true }
    ).lean();

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Log activity
    await new ActivityLog({
      application_id: application._id,
      company_id: application.company_id,
      action: 'stage_changed',
      description: 'Application moved to new stage',
      metadata: { new_stage_id: stageId },
    }).save();

    res.json({ success: true, data: { ...application, id: application._id } });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/applications/:id/activity - Get activity log
router.get('/:id/activity', async (req, res) => {
  try {
    const activities = await ActivityLog.find({ application_id: req.params.id })
      .populate('user_id', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    const data = activities.map(a => ({ ...a, id: a._id, user: a.user_id }));
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// POST /api/applications/:id/comment - Add comment to application
router.post('/:id/comment', async (req, res) => {
  try {
    const { text, author, stage } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    const comment = {
      text,
      author: author || 'Admin',
      timestamp: new Date(),
      stage: stage || 'unknown'
    };

    const application = await Application.findByIdAndUpdate(
      req.params.id,
      {
        $push: { comments: comment },
        last_activity_at: new Date(),
        updatedAt: new Date()
      },
      { new: true }
    ).lean();

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Log activity
    await new ActivityLog({
      application_id: application._id,
      company_id: application.company_id,
      action: 'comment_added',
      description: `Comment added: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`,
      metadata: { comment }
    }).save();

    res.json({ success: true, data: { ...application, id: application._id } });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// POST /api/applications/public-apply - Public job application
router.post('/public-apply', async (req, res) => {
  try {
    const {
      name, email, phone, linkedin_url, portfolio_url,
      job_id, company_id, resume_url, resume_text,
      referral_source, graduation_year, availability, notice_period, motivation
    } = req.body;

    if (!name || !email || !job_id) {
      return res.status(400).json({ error: 'Missing required fields: name, email, job_id' });
    }

    // Get company_id from job if not provided
    let resolvedCompanyId = company_id;
    if (!resolvedCompanyId) {
      const job = await JobOpening.findById(job_id).lean();
      if (job) resolvedCompanyId = job.company_id;
    }

    // Check if candidate exists
    let candidate = await Candidate.findOne({ email: email.toLowerCase() });

    if (candidate) {
      // Update existing candidate
      const updateData = { name };
      if (phone) updateData.phone = phone;
      if (linkedin_url) updateData.linkedin_url = linkedin_url;
      if (portfolio_url) updateData.portfolio_url = portfolio_url;
      if (resume_url) updateData.resume_url = resume_url;
      if (resume_text) updateData.resume_text = resume_text;

      await Candidate.findByIdAndUpdate(candidate._id, updateData);
    } else {
      // Create new candidate
      candidate = new Candidate({
        company_id: resolvedCompanyId,
        name,
        email: email.toLowerCase(),
        phone,
        linkedin_url,
        portfolio_url,
        resume_url,
        resume_text,
      });
      await candidate.save();
    }

    // Check if already applied
    const existingApp = await Application.findOne({ candidate_id: candidate._id, job_id });
    if (existingApp) {
      return res.status(409).json({
        error: 'You have already applied for this position',
        application_id: existingApp._id
      });
    }

    // Get initial stage
    let initialStage = await PipelineStage.findOne({ name: 'Shortlisting' });

    // Generate unique reference number (AIP-YYYYMMDD-XXXX format)
    const generateReferenceNumber = () => {
      const date = new Date();
      const dateStr = date.getFullYear().toString() +
        (date.getMonth() + 1).toString().padStart(2, '0') +
        date.getDate().toString().padStart(2, '0');
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      return `AIP-${dateStr}-${random}`;
    };

    const referenceNumber = generateReferenceNumber();

    // Create application
    const application = new Application({
      company_id: resolvedCompanyId,
      job_id,
      candidate_id: candidate._id,
      stage_id: initialStage?._id || null,
      stage: 'shortlisting',
      status: 'under_review',
      reference_number: referenceNumber,
      referral_source: referral_source || null,
      graduation_year: graduation_year || null,
      availability: availability || 'immediately',
      notice_period: notice_period || null,
      motivation: motivation || null,
      applied_at: new Date(),
    });
    await application.save();

    // Populate for response
    await application.populate('candidate_id');
    await application.populate('job_id');

    // Log activity
    await new ActivityLog({
      application_id: application._id,
      company_id: resolvedCompanyId,
      action: 'application_submitted',
      description: `New application received from ${name}`,
    }).save();

    console.log('✅ Public application created:', {
      applicationId: application._id,
      candidateId: candidate._id,
      jobId: job_id,
      candidateName: name
    });

    // Auto-run AI scoring in background
    if (resume_text) {
      const jobDetails = await JobOpening.findById(job_id)
        .populate('department_id', 'name')
        .populate('role_type_id', 'name')
        .lean();

      if (jobDetails) {
        (async () => {
          try {
            const { analyzeResume, quickScore } = require('../services/aiScoring');
            console.log('🤖 Starting auto AI scoring for application:', application._id);

            const analysis = await analyzeResume(resume_text, {
              title: jobDetails.title,
              department: jobDetails.department_id?.name,
              skills: jobDetails.skills,
              experienceMin: jobDetails.experience_min,
              experienceMax: jobDetails.experience_max,
              qualifications: jobDetails.qualifications,
              keyResponsibilities: jobDetails.key_responsibilities
            });

            await Application.findByIdAndUpdate(application._id, {
              ai_score: analysis.score,
              ai_analysis: analysis.detailedAnalysis,
              profile_strength: analysis.profileStrength,
            });

            console.log('✅ AI scoring completed:', application._id, 'Score:', analysis.score);
          } catch (aiError) {
            console.error('❌ AI scoring failed:', aiError);
            try {
              const { quickScore } = require('../services/aiScoring');
              const score = quickScore(resume_text, jobDetails);
              await Application.findByIdAndUpdate(application._id, {
                ai_score: score,
                profile_strength: score >= 70 ? 'Good' : 'Fair',
              });
              console.log('✅ Quick score applied:', application._id, 'Score:', score);
            } catch (e) {
              console.error('❌ Quick score also failed:', e);
            }
          }
        })();
      }
    }

    res.status(201).json({
      success: true,
      data: {
        ...application.toObject(),
        id: application._id,
        candidate: candidate,
        job: application.job_id,
      },
      message: 'Application submitted successfully'
    });
  } catch (error) {
    console.error('Error in public apply:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/applications/:id/reject - Reject application with reason
router.post('/:id/reject', async (req, res) => {
  try {
    const { reason, rejectedBy, sendEmail } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const application = await Application.findById(req.params.id)
      .populate('candidate_id', 'name email')
      .populate('job_id', 'title location');
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const previousStage = application.stage;
    const now = new Date();

    // Update the last stage history entry with exit time
    if (application.stage_history && application.stage_history.length > 0) {
      const lastEntry = application.stage_history[application.stage_history.length - 1];
      if (!lastEntry.exited_at) {
        lastEntry.exited_at = now;
        const enteredAt = new Date(lastEntry.entered_at);
        lastEntry.duration_days = Math.ceil((now - enteredAt) / (1000 * 60 * 60 * 24));
      }
    }

    // Add rejection to stage history
    const rejectionEntry = {
      stage: 'rejected',
      entered_at: now,
      moved_by: rejectedBy || 'Admin',
      notes: reason,
      action: 'rejected'
    };

    // Update application
    application.stage = 'rejected';
    application.status = 'rejected';
    application.rejection_reason = reason;
    application.rejection_date = now;
    application.last_activity_at = now;
    application.stage_history = [...(application.stage_history || []), rejectionEntry];

    // Add rejection comment
    application.comments = [...(application.comments || []), {
      text: `❌ Application rejected from ${previousStage} stage. Reason: ${reason}`,
      author: rejectedBy || 'Admin',
      timestamp: now,
      stage: 'rejected'
    }];

    await application.save();

    // Log activity
    await new ActivityLog({
      application_id: application._id,
      company_id: application.company_id,
      action: 'application_rejected',
      description: `Application rejected from ${previousStage} stage`,
      metadata: {
        previous_stage: previousStage,
        rejection_reason: reason,
        rejected_by: rejectedBy || 'Admin'
      }
    }).save();

    console.log('❌ Application rejected:', application._id, 'Reason:', reason);

    // Send rejection email if requested
    let emailSent = false;
    if (sendEmail && application.candidate_id?.email) {
      try {
        await emailService.sendRejection(
          {
            name: application.candidate_id.name,
            email: application.candidate_id.email
          },
          {
            title: application.job_id?.title || 'the position',
            location: application.job_id?.location || 'Remote'
          },
          reason
        );
        emailSent = true;
        console.log('📧 Rejection email sent to:', application.candidate_id.email);
      } catch (emailError) {
        console.error('Failed to send rejection email:', emailError);
      }
    }

    res.json({
      success: true,
      data: { ...application.toObject(), id: application._id },
      message: emailSent ? 'Application rejected and notification sent' : 'Application rejected successfully'
    });
  } catch (error) {
    console.error('Error rejecting application:', error);
    res.status(500).json({ error: 'Failed to reject application' });
  }
});

// POST /api/applications/:id/move-to-stage - Move application to new stage with history tracking
router.post('/:id/move-to-stage', async (req, res) => {
  try {
    const { stage, movedBy, notes, action } = req.body;

    if (!stage) {
      return res.status(400).json({ error: 'Stage is required' });
    }

    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const previousStage = application.stage;
    const now = new Date();

    // Update the last stage history entry with exit time
    if (application.stage_history && application.stage_history.length > 0) {
      const lastEntry = application.stage_history[application.stage_history.length - 1];
      if (!lastEntry.exited_at) {
        lastEntry.exited_at = now;
        const enteredAt = new Date(lastEntry.entered_at);
        lastEntry.duration_days = Math.ceil((now - enteredAt) / (1000 * 60 * 60 * 24));
      }
    }

    // Add new stage to history
    const stageEntry = {
      stage: stage,
      entered_at: now,
      moved_by: movedBy || 'Admin',
      notes: notes || null,
      action: action || 'stage_change'
    };

    // Update application
    application.stage = stage;
    application.days_in_stage = 0;
    application.last_activity_at = now;
    application.stage_history = [...(application.stage_history || []), stageEntry];

    // Update status based on stage
    if (stage === 'hired') {
      application.status = 'hired';
    } else if (stage === 'rejected') {
      application.status = 'rejected';
    } else if (stage === 'offer-sent' || stage === 'offer-accepted') {
      application.status = 'offered';
    } else if (stage === 'interview') {
      application.status = 'interviewed';
    } else {
      application.status = 'under_review';
    }

    await application.save();

    // Log activity
    await new ActivityLog({
      application_id: application._id,
      company_id: application.company_id,
      action: 'stage_changed',
      description: `Stage changed from ${previousStage} to ${stage}`,
      metadata: {
        previous_stage: previousStage,
        new_stage: stage,
        moved_by: movedBy || 'Admin',
        notes: notes
      }
    }).save();

    console.log('📋 Stage changed:', application._id, previousStage, '->', stage);

    res.json({
      success: true,
      data: { ...application.toObject(), id: application._id }
    });
  } catch (error) {
    console.error('Error moving application stage:', error);
    res.status(500).json({ error: 'Failed to move application to new stage' });
  }
});

// GET /api/applications/:id/journey - Get application journey/timeline
router.get('/:id/journey', async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('candidate_id', 'name email')
      .populate('job_id', 'title')
      .lean();

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Get all activity logs for this application
    const activities = await ActivityLog.find({ application_id: req.params.id })
      .sort({ createdAt: 1 })
      .lean();

    // Get all interviews for this application
    const interviews = await Interview.find({ application_id: req.params.id })
      .sort({ scheduled_date: 1 })
      .lean();

    // Build comprehensive journey
    const stageNames = {
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

    // Combine stage history with activities and comments
    const journey = [];

    // Add application submission as first event
    journey.push({
      type: 'application_submitted',
      stage: 'shortlisting',
      stageName: 'Shortlisting',
      timestamp: application.applied_at || application.createdAt,
      title: 'Application Submitted',
      description: `${application.candidate_id?.name || 'Candidate'} applied for ${application.job_id?.title || 'position'}`,
      icon: '📝',
      color: '#3b82f6'
    });

    // Add stage history entries
    if (application.stage_history && application.stage_history.length > 0) {
      application.stage_history.forEach(entry => {
        const actionMap = {
          'stage_change': { icon: '➡️', title: `Moved to ${stageNames[entry.stage] || entry.stage}` },
          'rejected': { icon: '❌', title: 'Application Rejected' },
          'hired': { icon: '✅', title: 'Candidate Hired' },
          'assignment_sent': { icon: '📝', title: 'Assignment Sent' },
          'interview_scheduled': { icon: '📅', title: 'Interview Scheduled' }
        };
        const actionInfo = actionMap[entry.action] || { icon: '📋', title: `Stage: ${stageNames[entry.stage] || entry.stage}` };

        journey.push({
          type: entry.action || 'stage_change',
          stage: entry.stage,
          stageName: stageNames[entry.stage] || entry.stage,
          timestamp: entry.entered_at,
          title: actionInfo.title,
          description: entry.notes || null,
          movedBy: entry.moved_by,
          durationDays: entry.duration_days,
          icon: actionInfo.icon,
          color: entry.stage === 'rejected' ? '#ef4444' : entry.stage === 'hired' ? '#10b981' : '#6366f1'
        });
      });
    }

    // Add comments as timeline entries
    if (application.comments && application.comments.length > 0) {
      application.comments.forEach(comment => {
        const isRejection = comment.text?.includes('rejected');
        journey.push({
          type: isRejection ? 'rejection_comment' : 'comment',
          stage: comment.stage || 'unknown',
          stageName: stageNames[comment.stage] || comment.stage || 'Unknown',
          timestamp: comment.timestamp,
          title: isRejection ? 'Rejection Note' : 'Comment Added',
          description: comment.text,
          author: comment.author,
          icon: isRejection ? '❌' : '💬',
          color: isRejection ? '#ef4444' : '#64748b'
        });
      });
    }

    // Add interviews
    interviews.forEach(interview => {
      journey.push({
        type: 'interview',
        stage: 'interview',
        stageName: 'Interview',
        timestamp: interview.scheduled_date,
        title: interview.title || 'Interview Scheduled',
        description: `${interview.type} interview with ${interview.interviewer_name || 'interviewer'}`,
        interviewer: interview.interviewer_name,
        status: interview.status,
        platform: interview.platform,
        duration: interview.duration_minutes,
        icon: interview.status === 'completed' ? '✅' : interview.status === 'cancelled' ? '❌' : '📅',
        color: interview.status === 'completed' ? '#10b981' : interview.status === 'cancelled' ? '#ef4444' : '#f59e0b'
      });
    });

    // Add activity log entries that aren't already covered
    activities.forEach(activity => {
      // Skip if already covered by stage_history
      if (['stage_changed', 'application_rejected'].includes(activity.action) &&
          application.stage_history?.length > 0) {
        return;
      }

      const actionMap = {
        'application_submitted': { icon: '📝', title: 'Application Submitted' },
        'comment_added': { icon: '💬', title: 'Comment Added' },
        'assignment_sent': { icon: '📝', title: 'Assignment Sent' },
        'ai_scored': { icon: '🤖', title: 'AI Analysis Complete' },
        'email_sent': { icon: '📧', title: 'Email Sent' }
      };
      const actionInfo = actionMap[activity.action] || { icon: '📋', title: activity.action };

      journey.push({
        type: activity.action,
        stage: activity.metadata?.new_stage || 'unknown',
        stageName: stageNames[activity.metadata?.new_stage] || 'Activity',
        timestamp: activity.createdAt,
        title: actionInfo.title,
        description: activity.description,
        icon: actionInfo.icon,
        color: '#94a3b8',
        metadata: activity.metadata
      });
    });

    // Sort by timestamp
    journey.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Add current stage info
    const currentStage = {
      stage: application.stage,
      stageName: stageNames[application.stage] || application.stage,
      daysInStage: application.days_in_stage || 0,
      status: application.status
    };

    res.json({
      success: true,
      data: {
        applicationId: application._id,
        candidateName: application.candidate_id?.name,
        candidateEmail: application.candidate_id?.email,
        jobTitle: application.job_id?.title,
        currentStage,
        rejectionReason: application.rejection_reason,
        rejectionDate: application.rejection_date,
        journey,
        totalDays: Math.ceil((new Date() - new Date(application.applied_at || application.createdAt)) / (1000 * 60 * 60 * 24))
      }
    });
  } catch (error) {
    console.error('Error fetching application journey:', error);
    res.status(500).json({ error: 'Failed to fetch application journey' });
  }
});

// POST /api/applications/:id/schedule-screening - Schedule screening call with email
router.post('/:id/schedule-screening', async (req, res) => {
  try {
    const {
      date,
      scheduledDate,
      scheduledTime,
      notes,
      agenda,
      interviewer,
      interviewerEmail,
      platform,
      meetingLink,
      duration,
      candidateEmail,
      candidateName,
      jobTitle,
      sendEmail
    } = req.body;

    const application = await Application.findById(req.params.id)
      .populate('candidate_id')
      .populate('job_id');

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const previousStage = application.stage;
    const now = new Date();

    // Update the last stage history entry with exit time
    if (application.stage_history && application.stage_history.length > 0) {
      const lastEntry = application.stage_history[application.stage_history.length - 1];
      if (!lastEntry.exited_at) {
        lastEntry.exited_at = now;
        const enteredAt = new Date(lastEntry.entered_at);
        lastEntry.duration_days = Math.ceil((now - enteredAt) / (1000 * 60 * 60 * 24));
      }
    }

    // Add screening stage to history
    const stageEntry = {
      stage: 'screening',
      entered_at: now,
      moved_by: 'Admin',
      notes: `Screening call scheduled for ${date}`,
      action: 'screening_scheduled'
    };

    // Update application with screening details
    application.stage = 'screening';
    application.has_screening_call = true;
    application.screening_call_date = date;
    application.screening_notes = notes;
    application.screening_interviewer = interviewer;
    application.screening_platform = platform;
    application.screening_meeting_link = meetingLink;
    application.screening_duration = duration;
    application.days_in_stage = 0;
    application.last_activity_at = now;
    application.stage_history = [...(application.stage_history || []), stageEntry];

    await application.save();

    // Log activity
    await new ActivityLog({
      application_id: application._id,
      company_id: application.company_id,
      action: 'screening_scheduled',
      description: `Screening call scheduled with ${interviewer} for ${date}`,
      metadata: {
        previous_stage: previousStage,
        new_stage: 'screening',
        interviewer,
        platform,
        duration,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime
      }
    }).save();

    // Send email if requested
    if (sendEmail) {
      try {
        // Send screening invitation email
        await emailService.sendScreeningInvitation({
          candidateName: candidateName || application.candidate_id?.name,
          candidateEmail: candidateEmail || application.candidate_id?.email,
          jobTitle: jobTitle || application.job_id?.title,
          scheduledDate,
          scheduledTime,
          duration,
          platform,
          meetingLink,
          interviewer,
          interviewerEmail,
          agenda
        });

        console.log('📧 Screening invitation email sent to', candidateEmail || application.candidate_id?.email);
      } catch (emailError) {
        console.error('Failed to send screening email:', emailError);
        // Don't fail the whole request if email fails
      }
    }

    console.log('📞 Screening call scheduled:', application._id, 'with', interviewer, 'on', date);

    res.json({
      success: true,
      data: { ...application.toObject(), id: application._id },
      message: 'Screening call scheduled successfully'
    });
  } catch (error) {
    console.error('Error scheduling screening call:', error);
    res.status(500).json({ error: 'Failed to schedule screening call' });
  }
});

// POST /api/applications/migrate-stages - One-time migration to add stage field to existing applications
router.post('/migrate-stages', async (req, res) => {
  try {
    // Update all applications that don't have a stage field to have 'shortlisting' as default
    const result = await Application.updateMany(
      { stage: { $exists: false } },
      { $set: { stage: 'shortlisting' } }
    );

    // Also update applications with null stage
    const result2 = await Application.updateMany(
      { stage: null },
      { $set: { stage: 'shortlisting' } }
    );

    console.log(`✅ Stage migration completed: ${result.modifiedCount + result2.modifiedCount} applications updated`);

    res.json({
      success: true,
      message: `Migration completed: ${result.modifiedCount + result2.modifiedCount} applications updated with default stage`,
      details: {
        noStageField: result.modifiedCount,
        nullStage: result2.modifiedCount
      }
    });
  } catch (error) {
    console.error('Error in stage migration:', error);
    res.status(500).json({ error: 'Migration failed' });
  }
});

module.exports = router;
