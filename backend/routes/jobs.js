// =====================================================
// JOB OPENINGS ROUTES - MongoDB
// =====================================================

const express = require('express');
const router = express.Router();
const { JobOpening, Department, RoleType, WorkSetup, PipelineStage } = require('../models');

// GET /api/jobs/pipeline-stages - Get all pipeline stages
router.get('/pipeline-stages', async (req, res) => {
  try {
    const { companyId } = req.query;

    const filter = { is_active: true };
    if (companyId) filter.company_id = companyId;

    const stages = await PipelineStage.find(filter)
      .sort({ order: 1 })
      .lean();

    const data = stages.map(s => ({ ...s, id: s._id }));
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching pipeline stages:', error);
    res.status(500).json({ error: 'Failed to fetch pipeline stages' });
  }
});

// GET /api/jobs - Get all jobs
router.get('/', async (req, res) => {
  try {
    const { companyId, isActive, limit = 50, offset = 0 } = req.query;

    const filter = {};
    if (companyId) filter.company_id = companyId;
    if (isActive !== undefined) filter.is_active = isActive === 'true';

    const jobs = await JobOpening.find(filter)
      .populate('department_id', 'id name')
      .populate('role_type_id', 'id name')
      .populate('work_setup_id', 'id name')
      .sort({ createdAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .lean();

    // Transform to match expected format
    const data = jobs.map(job => ({
      ...job,
      id: job._id,
      department: job.department_id,
      role_type: job.role_type_id,
      work_setup: job.work_setup_id,
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// GET /api/jobs/:id - Get single job
router.get('/:id', async (req, res) => {
  try {
    const job = await JobOpening.findById(req.params.id)
      .populate('department_id', 'id name')
      .populate('role_type_id', 'id name')
      .populate('work_setup_id', 'id name')
      .lean();

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const data = {
      ...job,
      id: job._id,
      department: job.department_id,
      role_type: job.role_type_id,
      work_setup: job.work_setup_id,
    };

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/jobs - Create new job
router.post('/', async (req, res) => {
  try {
    const jobData = { ...req.body };

    // Remove company_id if it's a UUID string (not a valid MongoDB ObjectId)
    // MongoDB ObjectIds are 24 hex characters
    if (jobData.company_id && !/^[0-9a-fA-F]{24}$/.test(jobData.company_id)) {
      delete jobData.company_id;
    }

    if (!jobData.title || !jobData.location) {
      return res.status(400).json({
        error: 'Missing required fields: title, location'
      });
    }

    const job = new JobOpening(jobData);
    await job.save();

    console.log('✅ Job created successfully:', job._id);
    res.status(201).json({ success: true, data: { ...job.toObject(), id: job._id } });
  } catch (error) {
    console.error('❌ Error creating job:', error.message);
    console.error('Full error:', error);
    res.status(500).json({ error: 'Failed to create job: ' + error.message });
  }
});

// PUT /api/jobs/:id - Update job
router.put('/:id', async (req, res) => {
  try {
    const job = await JobOpening.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    ).lean();

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({ success: true, data: { ...job, id: job._id } });
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({ error: 'Failed to update job' });
  }
});

// PATCH /api/jobs/:id - Partial update
router.patch('/:id', async (req, res) => {
  try {
    const job = await JobOpening.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    ).lean();

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({ success: true, data: { ...job, id: job._id } });
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({ error: 'Failed to update job' });
  }
});

// DELETE /api/jobs/:id - Delete job
router.delete('/:id', async (req, res) => {
  try {
    await JobOpening.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

module.exports = router;
