// =====================================================
// ASSIGNMENTS ROUTES - MongoDB
// Assignment templates and candidate assignments
// =====================================================

const express = require('express');
const router = express.Router();
const { AssignmentTemplate, CandidateAssignment, Application, ActivityLog, JobOpening } = require('../models');
const emailService = require('../services/emailService');

// =====================================================
// ASSIGNMENT TEMPLATES CRUD
// =====================================================

// GET /api/assignments/templates - Get all assignment templates
router.get('/templates', async (req, res) => {
  try {
    const { companyId, jobType } = req.query;

    const filter = { is_active: true };
    if (companyId) filter.company_id = companyId;
    if (jobType) filter.job_types = jobType;

    const templates = await AssignmentTemplate.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    const data = templates.map(t => ({
      id: t._id,
      name: t.name,
      jobTypes: t.job_types,
      instructions: t.instructions,
      link: t.link,
      files: t.files || [],
      deadline: t.deadline,
      createdBy: t.created_by,
      createdAt: t.createdAt ? new Date(t.createdAt).toISOString().split('T')[0] : '',
      isActive: t.is_active,
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching assignment templates:', error);
    res.status(500).json({ error: 'Failed to fetch assignment templates' });
  }
});

// GET /api/assignments/templates/:id - Get single template
router.get('/templates/:id', async (req, res) => {
  try {
    const template = await AssignmentTemplate.findById(req.params.id).lean();

    if (!template) {
      return res.status(404).json({ error: 'Assignment template not found' });
    }

    const data = {
      id: template._id,
      name: template.name,
      jobTypes: template.job_types,
      instructions: template.instructions,
      link: template.link,
      files: template.files || [],
      deadline: template.deadline,
      createdBy: template.created_by,
      createdAt: template.createdAt ? new Date(template.createdAt).toISOString().split('T')[0] : '',
      isActive: template.is_active,
    };

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching assignment template:', error);
    res.status(500).json({ error: 'Failed to fetch assignment template' });
  }
});

// POST /api/assignments/templates - Create new template
router.post('/templates', async (req, res) => {
  try {
    const { name, jobTypes, instructions, link, files, deadline, createdBy, companyId } = req.body;

    console.log('📝 Creating template, req.body:', JSON.stringify(req.body, null, 2));
    console.log('📝 Files type:', typeof files);
    console.log('📝 Is Array:', Array.isArray(files));

    if (!name || !instructions) {
      return res.status(400).json({ error: 'Name and instructions are required' });
    }

    // Ensure files is an array of objects with proper structure
    let parsedFiles = [];
    let filesArray = files;

    // Handle case where files is sent as a JSON string
    if (typeof files === 'string') {
      try {
        filesArray = JSON.parse(files);
      } catch (e) {
        console.log('📝 Could not parse files string:', e.message);
        filesArray = [];
      }
    }

    if (filesArray && Array.isArray(filesArray) && filesArray.length > 0) {
      parsedFiles = filesArray.map(f => {
        // Handle different file formats
        if (typeof f === 'string') {
          return { name: f, url: null, key: null, type: null };
        }
        if (typeof f === 'object' && f !== null) {
          return {
            name: String(f.name || ''),
            url: f.url ? String(f.url) : null,
            key: f.key ? String(f.key) : null,
            type: f.type ? String(f.type) : null
          };
        }
        return { name: '', url: null, key: null, type: null };
      }).filter(f => f.name); // Remove entries without names
    }

    console.log('📝 Final parsedFiles:', JSON.stringify(parsedFiles, null, 2));

    const template = new AssignmentTemplate({
      company_id: companyId || null,
      name,
      job_types: jobTypes || [],
      instructions,
      link: link || '',
      files: parsedFiles,
      deadline: deadline || '3 days',
      created_by: createdBy || 'Admin',
      is_active: true,
    });

    await template.save();

    console.log('✅ Assignment template created:', template._id, template.name);

    res.status(201).json({
      success: true,
      data: {
        id: template._id,
        name: template.name,
        jobTypes: template.job_types,
        instructions: template.instructions,
        link: template.link,
        files: template.files,
        deadline: template.deadline,
        createdBy: template.created_by,
        createdAt: new Date().toISOString().split('T')[0],
        isActive: true,
      }
    });
  } catch (error) {
    console.error('Error creating assignment template:', error);
    res.status(500).json({ error: 'Failed to create assignment template' });
  }
});

// PUT /api/assignments/templates/:id - Update template
router.put('/templates/:id', async (req, res) => {
  try {
    const { name, jobTypes, instructions, link, files, deadline } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (jobTypes !== undefined) updateData.job_types = jobTypes;
    if (instructions !== undefined) updateData.instructions = instructions;
    if (link !== undefined) updateData.link = link;
    if (files !== undefined) {
      // Ensure files is an array of objects
      let parsedFiles = [];
      if (typeof files === 'string') {
        try {
          parsedFiles = JSON.parse(files);
        } catch (e) {
          parsedFiles = [];
        }
      } else if (Array.isArray(files)) {
        parsedFiles = files.map(f => {
          if (typeof f === 'string') {
            return { name: f, url: null, key: null, type: null };
          }
          return { name: f.name, url: f.url, key: f.key || null, type: f.type };
        });
      }
      updateData.files = parsedFiles;
    }
    if (deadline !== undefined) updateData.deadline = deadline;
    updateData.updatedAt = new Date();

    const template = await AssignmentTemplate.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).lean();

    if (!template) {
      return res.status(404).json({ error: 'Assignment template not found' });
    }

    res.json({
      success: true,
      data: {
        id: template._id,
        name: template.name,
        jobTypes: template.job_types,
        instructions: template.instructions,
        link: template.link,
        files: template.files,
        deadline: template.deadline,
        createdBy: template.created_by,
        createdAt: template.createdAt ? new Date(template.createdAt).toISOString().split('T')[0] : '',
        isActive: template.is_active,
      }
    });
  } catch (error) {
    console.error('Error updating assignment template:', error);
    res.status(500).json({ error: 'Failed to update assignment template' });
  }
});

// DELETE /api/assignments/templates/:id - Delete template (soft delete)
router.delete('/templates/:id', async (req, res) => {
  try {
    await AssignmentTemplate.findByIdAndUpdate(req.params.id, {
      is_active: false,
      updatedAt: new Date()
    });

    res.json({ success: true, message: 'Assignment template deleted successfully' });
  } catch (error) {
    console.error('Error deleting assignment template:', error);
    res.status(500).json({ error: 'Failed to delete assignment template' });
  }
});

// =====================================================
// CANDIDATE ASSIGNMENTS (sent to specific candidates)
// =====================================================

// GET /api/assignments/candidates - Get all candidate assignments
router.get('/candidates', async (req, res) => {
  try {
    const { applicationId, candidateId, status, companyId } = req.query;

    const filter = {};
    if (applicationId) filter.application_id = applicationId;
    if (candidateId) filter.candidate_id = candidateId;
    if (status) filter.status = status;
    if (companyId) filter.company_id = companyId;

    const assignments = await CandidateAssignment.find(filter)
      .populate('application_id')
      .populate('candidate_id')
      .populate('assignment_template_id')
      .sort({ sent_at: -1 })
      .lean();

    const data = assignments.map(a => ({
      id: a._id,
      applicationId: a.application_id?._id,
      candidateId: a.candidate_id?._id,
      candidateName: a.candidate_name,
      candidateEmail: a.candidate_email,
      templateId: a.assignment_template_id?._id,
      assignmentName: a.assignment_name,
      instructions: a.instructions,
      customInstructions: a.custom_instructions,
      link: a.link,
      files: a.files || [],
      deadlineDate: a.deadline_date,
      sentAt: a.sent_at,
      sentBy: a.sent_by,
      status: a.status,
      submissionDate: a.submission_date,
      submissionLink: a.submission_link,
      submissionNotes: a.submission_notes,
      reviewNotes: a.review_notes,
      reviewedBy: a.reviewed_by,
      reviewedAt: a.reviewed_at,
      score: a.score,
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching candidate assignments:', error);
    res.status(500).json({ error: 'Failed to fetch candidate assignments' });
  }
});

// GET /api/assignments/candidates/:id - Get single candidate assignment
router.get('/candidates/:id', async (req, res) => {
  try {
    const assignment = await CandidateAssignment.findById(req.params.id)
      .populate('application_id')
      .populate('candidate_id')
      .populate('assignment_template_id')
      .lean();

    if (!assignment) {
      return res.status(404).json({ error: 'Candidate assignment not found' });
    }

    res.json({
      success: true,
      data: {
        id: assignment._id,
        applicationId: assignment.application_id?._id,
        candidateId: assignment.candidate_id?._id,
        candidateName: assignment.candidate_name,
        candidateEmail: assignment.candidate_email,
        templateId: assignment.assignment_template_id?._id,
        assignmentName: assignment.assignment_name,
        instructions: assignment.instructions,
        customInstructions: assignment.custom_instructions,
        link: assignment.link,
        files: assignment.files || [],
        deadlineDate: assignment.deadline_date,
        sentAt: assignment.sent_at,
        sentBy: assignment.sent_by,
        status: assignment.status,
        submissionDate: assignment.submission_date,
        submissionLink: assignment.submission_link,
        submissionNotes: assignment.submission_notes,
        reviewNotes: assignment.review_notes,
        reviewedBy: assignment.reviewed_by,
        reviewedAt: assignment.reviewed_at,
        score: assignment.score,
      }
    });
  } catch (error) {
    console.error('Error fetching candidate assignment:', error);
    res.status(500).json({ error: 'Failed to fetch candidate assignment' });
  }
});

// POST /api/assignments/candidates - Send assignment to candidate
router.post('/candidates', async (req, res) => {
  try {
    const {
      applicationId,
      candidateId,
      candidateName,
      candidateEmail,
      templateId,
      assignmentName,
      instructions,
      customInstructions,
      link,
      files,
      deadlineDays,
      sentBy,
      companyId
    } = req.body;

    if (!applicationId || !assignmentName) {
      return res.status(400).json({ error: 'Application ID and assignment name are required' });
    }

    // Calculate deadline date
    const deadlineDate = new Date();
    const days = parseInt(deadlineDays) || 3;
    deadlineDate.setDate(deadlineDate.getDate() + days);

    const assignment = new CandidateAssignment({
      application_id: applicationId,
      assignment_template_id: templateId || null,
      company_id: companyId || null,
      candidate_id: candidateId || null,
      candidate_name: candidateName,
      candidate_email: candidateEmail,
      assignment_name: assignmentName,
      instructions,
      custom_instructions: customInstructions || '',
      link: link || '',
      files: files || [],
      deadline_date: deadlineDate,
      sent_at: new Date(),
      sent_by: sentBy || 'Admin',
      status: 'sent',
    });

    await assignment.save();

    // Update application stage to assignment-sent
    await Application.findByIdAndUpdate(applicationId, {
      stage: 'assignment-sent',
      last_activity_at: new Date(),
      updatedAt: new Date()
    });

    // Log activity
    await new ActivityLog({
      application_id: applicationId,
      company_id: companyId,
      action: 'assignment_sent',
      description: `Assignment "${assignmentName}" sent to candidate`,
      metadata: { assignmentId: assignment._id, deadline: deadlineDate }
    }).save();

    console.log('✅ Assignment sent to candidate:', assignment._id);

    // Send email to candidate if email is provided
    let emailSent = false;
    if (candidateEmail) {
      try {
        // Get job title from application
        const application = await Application.findById(applicationId).populate('job_id', 'title').lean();
        const jobTitle = application?.job_id?.title || 'the position';

        await emailService.sendAssignmentEmail({
          candidateName: candidateName || 'Candidate',
          candidateEmail,
          jobTitle,
          assignmentName,
          instructions: instructions || '',
          customInstructions: customInstructions || '',
          link: link || '',
          files: files || [],
          deadlineDate
        });
        emailSent = true;
        console.log('✅ Assignment email sent to:', candidateEmail);
      } catch (emailError) {
        console.error('Failed to send assignment email:', emailError);
      }
    }

    res.status(201).json({
      success: true,
      data: {
        id: assignment._id,
        applicationId: assignment.application_id,
        candidateName: assignment.candidate_name,
        assignmentName: assignment.assignment_name,
        deadlineDate: assignment.deadline_date,
        status: 'sent',
        emailSent
      },
      message: emailSent ? 'Assignment sent successfully with email notification' : 'Assignment sent successfully'
    });
  } catch (error) {
    console.error('Error sending assignment to candidate:', error);
    res.status(500).json({ error: 'Failed to send assignment' });
  }
});

// PATCH /api/assignments/candidates/:id/status - Update assignment status
router.patch('/candidates/:id/status', async (req, res) => {
  try {
    const { status, submissionLink, submissionNotes, reviewNotes, reviewedBy, score } = req.body;

    const updateData = { status, updatedAt: new Date() };

    if (status === 'submitted') {
      updateData.submission_date = new Date();
      if (submissionLink) updateData.submission_link = submissionLink;
      if (submissionNotes) updateData.submission_notes = submissionNotes;
    }

    if (status === 'reviewed' || status === 'passed' || status === 'failed') {
      updateData.reviewed_at = new Date();
      if (reviewedBy) updateData.reviewed_by = reviewedBy;
      if (reviewNotes) updateData.review_notes = reviewNotes;
      if (score !== undefined) updateData.score = score;
    }

    const assignment = await CandidateAssignment.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).lean();

    if (!assignment) {
      return res.status(404).json({ error: 'Candidate assignment not found' });
    }

    // Update application stage if assignment is submitted
    if (status === 'submitted' && assignment.application_id) {
      await Application.findByIdAndUpdate(assignment.application_id, {
        stage: 'assignment-submitted',
        last_activity_at: new Date(),
        updatedAt: new Date()
      });
    }

    res.json({
      success: true,
      data: {
        id: assignment._id,
        status: assignment.status,
      }
    });
  } catch (error) {
    console.error('Error updating candidate assignment status:', error);
    res.status(500).json({ error: 'Failed to update assignment status' });
  }
});

// GET /api/assignments/by-application/:applicationId - Get assignments for specific application
router.get('/by-application/:applicationId', async (req, res) => {
  try {
    const assignments = await CandidateAssignment.find({
      application_id: req.params.applicationId
    })
      .populate('assignment_template_id')
      .sort({ sent_at: -1 })
      .lean();

    const data = assignments.map(a => ({
      id: a._id,
      templateId: a.assignment_template_id?._id,
      assignmentName: a.assignment_name,
      instructions: a.instructions,
      customInstructions: a.custom_instructions,
      link: a.link,
      files: a.files || [],
      deadlineDate: a.deadline_date,
      sentAt: a.sent_at,
      sentBy: a.sent_by,
      status: a.status,
      submissionDate: a.submission_date,
      submissionLink: a.submission_link,
      submissionNotes: a.submission_notes,
      reviewNotes: a.review_notes,
      reviewedBy: a.reviewed_by,
      reviewedAt: a.reviewed_at,
      score: a.score,
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching assignments for application:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

module.exports = router;
