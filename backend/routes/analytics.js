// =====================================================
// ANALYTICS ROUTES - Dynamic Recruitment Metrics
// =====================================================

const express = require('express');
const router = express.Router();
const analyticsService = require('../services/analyticsService');

// GET /api/analytics/dashboard - Get comprehensive dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    const { startDate, endDate, jobId } = req.query;

    const data = await analyticsService.getDashboardData({
      startDate,
      endDate,
      jobId
    });

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
});

// GET /api/analytics/overview - Get overview statistics
router.get('/overview', async (req, res) => {
  try {
    const { startDate, endDate, jobId } = req.query;

    const data = await analyticsService.getOverviewStats({
      startDate,
      endDate,
      jobId
    });

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Overview analytics error:', error);
    res.status(500).json({ error: 'Failed to get overview stats' });
  }
});

// GET /api/analytics/funnel - Get pipeline funnel data
router.get('/funnel', async (req, res) => {
  try {
    const { startDate, endDate, jobId } = req.query;

    const data = await analyticsService.getPipelineFunnel({
      startDate,
      endDate,
      jobId
    });

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Funnel analytics error:', error);
    res.status(500).json({ error: 'Failed to get funnel data' });
  }
});

// GET /api/analytics/time-to-hire - Get time to hire metrics
router.get('/time-to-hire', async (req, res) => {
  try {
    const { startDate, endDate, jobId } = req.query;

    const data = await analyticsService.getTimeToHire({
      startDate,
      endDate,
      jobId
    });

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Time to hire analytics error:', error);
    res.status(500).json({ error: 'Failed to get time to hire data' });
  }
});

// GET /api/analytics/sources - Get source analytics
router.get('/sources', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const data = await analyticsService.getSourceAnalytics({
      startDate,
      endDate
    });

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Source analytics error:', error);
    res.status(500).json({ error: 'Failed to get source data' });
  }
});

// GET /api/analytics/jobs - Get job-wise analytics
router.get('/jobs', async (req, res) => {
  try {
    const { startDate, endDate, limit = 10 } = req.query;

    const data = await analyticsService.getJobAnalytics({
      startDate,
      endDate,
      limit
    });

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Job analytics error:', error);
    res.status(500).json({ error: 'Failed to get job analytics' });
  }
});

// GET /api/analytics/activity - Get activity timeline
router.get('/activity', async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day', limit = 30 } = req.query;

    const data = await analyticsService.getActivityTimeline({
      startDate,
      endDate,
      groupBy,
      limit
    });

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Activity analytics error:', error);
    res.status(500).json({ error: 'Failed to get activity data' });
  }
});

// GET /api/analytics/recruiters - Get recruiter performance
router.get('/recruiters', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const data = await analyticsService.getRecruiterPerformance({
      startDate,
      endDate
    });

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Recruiter analytics error:', error);
    res.status(500).json({ error: 'Failed to get recruiter performance' });
  }
});

// GET /api/analytics/interviews - Get interview analytics
router.get('/interviews', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const data = await analyticsService.getInterviewAnalytics({
      startDate,
      endDate
    });

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Interview analytics error:', error);
    res.status(500).json({ error: 'Failed to get interview analytics' });
  }
});

module.exports = router;
