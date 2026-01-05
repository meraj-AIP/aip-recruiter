// =====================================================
// CANDIDATES ROUTES - MongoDB
// =====================================================

const express = require('express');
const router = express.Router();
const { Candidate, Application } = require('../models');

// GET /api/candidates - Get all candidates
router.get('/', async (req, res) => {
  try {
    const { companyId, search, limit = 50, offset = 0 } = req.query;

    const filter = {};
    if (companyId) filter.company_id = companyId;

    let candidates = await Candidate.find(filter)
      .sort({ createdAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .lean();

    if (search) {
      const searchLower = search.toLowerCase();
      candidates = candidates.filter(c =>
        c.name?.toLowerCase().includes(searchLower) ||
        c.email?.toLowerCase().includes(searchLower)
      );
    }

    const data = candidates.map(c => ({ ...c, id: c._id }));
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching candidates:', error);
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
});

// GET /api/candidates/:id - Get single candidate
router.get('/:id', async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id).lean();

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    const applications = await Application.find({ candidate_id: candidate._id })
      .populate('job_id', 'title')
      .populate('stage_id', 'name color')
      .lean();

    const data = {
      ...candidate,
      id: candidate._id,
      applications: applications.map(a => ({
        ...a,
        id: a._id,
        job: a.job_id,
        stage: a.stage_id,
      })),
    };

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/candidates - Create new candidate
router.post('/', async (req, res) => {
  try {
    const candidateData = req.body;

    if (!candidateData.company_id || !candidateData.name || !candidateData.email) {
      return res.status(400).json({
        error: 'Missing required fields: company_id, name, email'
      });
    }

    const candidate = new Candidate(candidateData);
    await candidate.save();

    res.status(201).json({ success: true, data: { ...candidate.toObject(), id: candidate._id } });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Candidate with this email already exists' });
    }
    console.error('Error creating candidate:', error);
    res.status(500).json({ error: 'Failed to create candidate' });
  }
});

// PATCH /api/candidates/:id - Update candidate
router.patch('/:id', async (req, res) => {
  try {
    const candidate = await Candidate.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    ).lean();

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    res.json({ success: true, data: { ...candidate, id: candidate._id } });
  } catch (error) {
    console.error('Error updating candidate:', error);
    res.status(500).json({ error: 'Failed to update candidate' });
  }
});

// DELETE /api/candidates/:id - Delete candidate
router.delete('/:id', async (req, res) => {
  try {
    await Candidate.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Candidate deleted successfully' });
  } catch (error) {
    console.error('Error deleting candidate:', error);
    res.status(500).json({ error: 'Failed to delete candidate' });
  }
});

module.exports = router;

