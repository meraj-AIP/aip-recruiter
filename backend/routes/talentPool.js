// =====================================================
// TALENT POOL ROUTES - Save Candidates for Future Roles
// =====================================================

const express = require('express');
const router = express.Router();
const { Candidate, Application, JobOpening, ActivityLog } = require('../models');
const mongoose = require('mongoose');

// =====================================================
// SPECIFIC ROUTES MUST COME BEFORE PARAMETERIZED ROUTES
// =====================================================

// GET /api/talent-pool/stats - Get talent pool statistics
router.get('/stats', async (req, res) => {
  try {
    const [
      totalCount,
      bySource,
      byTags,
      recentlyAdded
    ] = await Promise.all([
      Candidate.countDocuments({ inTalentPool: true }),

      Candidate.aggregate([
        { $match: { inTalentPool: true } },
        { $group: { _id: '$source', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),

      Candidate.aggregate([
        { $match: { inTalentPool: true, talentPoolTags: { $exists: true, $ne: [] } } },
        { $unwind: '$talentPoolTags' },
        { $group: { _id: '$talentPoolTags', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),

      Candidate.countDocuments({
        inTalentPool: true,
        talentPoolAddedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      })
    ]);

    res.json({
      success: true,
      data: {
        totalCount,
        recentlyAdded,
        bySource: bySource.map(s => ({ source: s._id || 'Unknown', count: s.count })),
        topTags: byTags.map(t => ({ tag: t._id, count: t.count }))
      }
    });
  } catch (error) {
    console.error('Error getting talent pool stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// GET /api/talent-pool/search - Advanced search in talent pool
router.get('/search', async (req, res) => {
  try {
    const { q, skills, experience, location } = req.query;

    const searchQuery = { inTalentPool: true };

    if (q) {
      searchQuery.$text = { $search: q };
    }

    if (skills) {
      const skillList = skills.split(',').map(s => new RegExp(s.trim(), 'i'));
      searchQuery.skills = { $in: skillList };
    }

    if (location) {
      searchQuery.location = { $regex: location, $options: 'i' };
    }

    const candidates = await Candidate.find(searchQuery)
      .limit(20)
      .lean();

    res.json({
      success: true,
      data: candidates.map(c => ({ ...c, id: c._id })),
      count: candidates.length
    });
  } catch (error) {
    console.error('Talent pool search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// GET /api/talent-pool - Get all candidates in talent pool
router.get('/', async (req, res) => {
  try {
    const {
      search,
      skills,
      minExperience,
      maxExperience,
      location,
      source,
      tags,
      limit = 50,
      offset = 0
    } = req.query;

    // Build filter
    const filter = { inTalentPool: true };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { current_title: { $regex: search, $options: 'i' } },
        { current_company: { $regex: search, $options: 'i' } }
      ];
    }

    if (skills) {
      const skillArray = skills.split(',').map(s => s.trim());
      filter.skills = { $in: skillArray.map(s => new RegExp(s, 'i')) };
    }

    if (location) {
      filter.location = { $regex: location, $options: 'i' };
    }

    if (source) {
      filter.source = source;
    }

    if (tags) {
      const tagArray = tags.split(',').map(t => t.trim());
      filter.talentPoolTags = { $in: tagArray };
    }

    const candidates = await Candidate.find(filter)
      .sort({ talentPoolAddedAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .lean();

    const total = await Candidate.countDocuments(filter);

    // Get application history for each candidate
    const candidatesWithHistory = await Promise.all(
      candidates.map(async (candidate) => {
        const applications = await Application.find({ candidate_id: candidate._id })
          .populate('job_id', 'title')
          .select('job_id stage createdAt')
          .sort({ createdAt: -1 })
          .limit(3)
          .lean();

        return {
          ...candidate,
          id: candidate._id,
          applicationHistory: applications.map(a => ({
            jobTitle: a.job_id?.title,
            stage: a.stage,
            appliedAt: a.createdAt
          }))
        };
      })
    );

    res.json({
      success: true,
      data: candidatesWithHistory,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error getting talent pool:', error);
    res.status(500).json({ error: 'Failed to get talent pool' });
  }
});

// POST /api/talent-pool/add - Add candidate to talent pool
router.post('/add', async (req, res) => {
  try {
    const { candidateId, reason, tags, notes, addedBy } = req.body;

    if (!candidateId) {
      return res.status(400).json({ error: 'Candidate ID is required' });
    }

    const candidate = await Candidate.findByIdAndUpdate(
      candidateId,
      {
        inTalentPool: true,
        talentPoolReason: reason,
        talentPoolTags: tags || [],
        talentPoolNotes: notes,
        talentPoolAddedBy: addedBy,
        talentPoolAddedAt: new Date()
      },
      { new: true }
    ).lean();

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    // Log activity
    const applications = await Application.find({ candidate_id: candidateId }).select('_id').lean();
    if (applications.length > 0) {
      await new ActivityLog({
        application_id: applications[0]._id,
        action: 'added_to_talent_pool',
        description: `${candidate.name} added to talent pool: ${reason || 'No reason specified'}`,
        metadata: { reason, tags, addedBy }
      }).save();
    }

    res.json({
      success: true,
      message: 'Candidate added to talent pool',
      data: { ...candidate, id: candidate._id }
    });
  } catch (error) {
    console.error('Error adding to talent pool:', error);
    res.status(500).json({ error: 'Failed to add to talent pool' });
  }
});

// POST /api/talent-pool/add-from-rejection - Add rejected candidate to talent pool
router.post('/add-from-rejection', async (req, res) => {
  try {
    const { applicationId, reason, tags, notes, addedBy } = req.body;

    if (!applicationId) {
      return res.status(400).json({ error: 'Application ID is required' });
    }

    const application = await Application.findById(applicationId)
      .populate('candidate_id')
      .lean();

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const candidate = await Candidate.findByIdAndUpdate(
      application.candidate_id._id,
      {
        inTalentPool: true,
        talentPoolReason: reason || 'Potential fit for future roles',
        talentPoolTags: tags || [],
        talentPoolNotes: notes,
        talentPoolAddedBy: addedBy,
        talentPoolAddedAt: new Date(),
        previousApplications: [{
          jobId: application.job_id,
          stage: application.stage,
          appliedAt: application.createdAt
        }]
      },
      { new: true }
    ).lean();

    res.json({
      success: true,
      message: 'Candidate added to talent pool for future opportunities',
      data: { ...candidate, id: candidate._id }
    });
  } catch (error) {
    console.error('Error adding rejected candidate to talent pool:', error);
    res.status(500).json({ error: 'Failed to add to talent pool' });
  }
});

// =====================================================
// PARAMETERIZED ROUTES - Must come after specific routes
// =====================================================

// DELETE /api/talent-pool/:candidateId - Remove from talent pool
router.delete('/:candidateId', async (req, res) => {
  try {
    const candidate = await Candidate.findByIdAndUpdate(
      req.params.candidateId,
      {
        inTalentPool: false,
        talentPoolReason: null,
        talentPoolTags: [],
        talentPoolNotes: null,
        talentPoolAddedBy: null,
        talentPoolAddedAt: null
      },
      { new: true }
    ).lean();

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    res.json({
      success: true,
      message: 'Candidate removed from talent pool'
    });
  } catch (error) {
    console.error('Error removing from talent pool:', error);
    res.status(500).json({ error: 'Failed to remove from talent pool' });
  }
});

// PATCH /api/talent-pool/:candidateId - Update talent pool entry
router.patch('/:candidateId', async (req, res) => {
  try {
    const { tags, notes, reason } = req.body;

    const updateData = {};
    if (tags !== undefined) updateData.talentPoolTags = tags;
    if (notes !== undefined) updateData.talentPoolNotes = notes;
    if (reason !== undefined) updateData.talentPoolReason = reason;

    const candidate = await Candidate.findByIdAndUpdate(
      req.params.candidateId,
      updateData,
      { new: true }
    ).lean();

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    res.json({
      success: true,
      data: { ...candidate, id: candidate._id }
    });
  } catch (error) {
    console.error('Error updating talent pool entry:', error);
    res.status(500).json({ error: 'Failed to update' });
  }
});

// POST /api/talent-pool/:candidateId/apply - Create application for talent pool candidate
router.post('/:candidateId/apply', async (req, res) => {
  try {
    const { jobId, appliedBy, notes } = req.body;

    if (!jobId) {
      return res.status(400).json({ error: 'Job ID is required' });
    }

    const candidate = await Candidate.findById(req.params.candidateId).lean();
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    const job = await JobOpening.findById(jobId).lean();
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Check for existing application
    const existingApp = await Application.findOne({
      candidate_id: candidate._id,
      job_id: jobId
    }).lean();

    if (existingApp) {
      return res.status(400).json({
        error: 'Candidate already has an application for this job',
        existingApplicationId: existingApp._id
      });
    }

    // Create new application
    const application = new Application({
      candidate_id: candidate._id,
      job_id: jobId,
      stage: 'shortlisting',
      status: 'active',
      source: 'Talent Pool',
      notes: notes || `Applied from talent pool by ${appliedBy}`,
      applied_at: new Date(),
      last_activity_at: new Date()
    });

    await application.save();

    // Log activity
    await new ActivityLog({
      application_id: application._id,
      action: 'created_from_talent_pool',
      description: `Application created from talent pool for ${job.title}`,
      metadata: { appliedBy, candidateName: candidate.name }
    }).save();

    res.json({
      success: true,
      message: `Application created for ${candidate.name} - ${job.title}`,
      data: { applicationId: application._id }
    });
  } catch (error) {
    console.error('Error creating application from talent pool:', error);
    res.status(500).json({ error: 'Failed to create application' });
  }
});

module.exports = router;
