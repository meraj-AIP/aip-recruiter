// =====================================================
// ANALYTICS SERVICE - Dynamic Recruitment Metrics
// =====================================================

const { Application, Candidate, JobOpening, Interview, Offer, ActivityLog } = require('../models');
const mongoose = require('mongoose');

/**
 * Get overview statistics
 * @param {Object} filters - Date range and other filters
 * @returns {Object} Overview stats
 */
async function getOverviewStats(filters = {}) {
  const { startDate, endDate, jobId } = filters;

  const dateFilter = {};
  if (startDate) dateFilter.$gte = new Date(startDate);
  if (endDate) dateFilter.$lte = new Date(endDate);

  const matchStage = {};
  if (Object.keys(dateFilter).length > 0) {
    matchStage.createdAt = dateFilter;
  }
  if (jobId) {
    matchStage.job_id = new mongoose.Types.ObjectId(jobId);
  }

  const [
    totalApplications,
    totalCandidates,
    activeJobs,
    totalOffers,
    acceptedOffers,
    hiredCount,
    rejectedCount
  ] = await Promise.all([
    Application.countDocuments(matchStage),
    Candidate.countDocuments(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
    JobOpening.countDocuments({ status: 'open' }),
    Offer.countDocuments(matchStage),
    Offer.countDocuments({ ...matchStage, status: 'accepted' }),
    Application.countDocuments({ ...matchStage, stage: 'hired' }),
    Application.countDocuments({ ...matchStage, stage: 'rejected' })
  ]);

  return {
    totalApplications,
    totalCandidates,
    activeJobs,
    totalOffers,
    acceptedOffers,
    offerAcceptanceRate: totalOffers > 0 ? Math.round((acceptedOffers / totalOffers) * 100) : 0,
    hiredCount,
    rejectedCount,
    conversionRate: totalApplications > 0 ? Math.round((hiredCount / totalApplications) * 100) : 0
  };
}

/**
 * Get pipeline funnel analytics
 * @param {Object} filters - Filters
 * @returns {Object} Funnel data
 */
async function getPipelineFunnel(filters = {}) {
  const { startDate, endDate, jobId } = filters;

  const matchStage = {};
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }
  if (jobId) {
    matchStage.job_id = new mongoose.Types.ObjectId(jobId);
  }

  const stages = [
    'shortlisting',
    'screening',
    'assignment-sent',
    'assignment-submitted',
    'interview',
    'offer-sent',
    'offer-accepted',
    'hired'
  ];

  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: '$stage',
        count: { $sum: 1 }
      }
    }
  ];

  const results = await Application.aggregate(pipeline);

  const funnel = stages.map(stage => {
    const result = results.find(r => r._id === stage);
    return {
      stage,
      name: formatStageName(stage),
      count: result?.count || 0
    };
  });

  // Calculate drop-off rates
  for (let i = 1; i < funnel.length; i++) {
    const prev = funnel[i - 1].count;
    const curr = funnel[i].count;
    funnel[i].dropOff = prev > 0 ? Math.round(((prev - curr) / prev) * 100) : 0;
    funnel[i].passThrough = prev > 0 ? Math.round((curr / prev) * 100) : 0;
  }

  return funnel;
}

/**
 * Get time-to-hire metrics
 * @param {Object} filters - Filters
 * @returns {Object} Time metrics
 */
async function getTimeToHire(filters = {}) {
  const { startDate, endDate, jobId } = filters;

  const matchStage = { stage: 'hired' };
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }
  if (jobId) {
    matchStage.job_id = new mongoose.Types.ObjectId(jobId);
  }

  const hiredApplications = await Application.find(matchStage).lean();

  if (hiredApplications.length === 0) {
    return {
      averageTimeToHire: 0,
      minTimeToHire: 0,
      maxTimeToHire: 0,
      totalHired: 0,
      breakdown: []
    };
  }

  const timesToHire = hiredApplications.map(app => {
    const start = new Date(app.applied_at || app.createdAt);
    const end = new Date(app.updatedAt);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24)); // Days
  }).filter(days => days >= 0);

  const avg = timesToHire.reduce((a, b) => a + b, 0) / timesToHire.length;

  return {
    averageTimeToHire: Math.round(avg),
    minTimeToHire: Math.min(...timesToHire),
    maxTimeToHire: Math.max(...timesToHire),
    totalHired: hiredApplications.length,
    breakdown: timesToHire
  };
}

/**
 * Get source analytics
 * @param {Object} filters - Filters
 * @returns {Array} Source breakdown
 */
async function getSourceAnalytics(filters = {}) {
  const { startDate, endDate } = filters;

  const matchStage = {};
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }

  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: { $ifNull: ['$source', 'Direct'] },
        total: { $sum: 1 }
      }
    },
    { $sort: { total: -1 } }
  ];

  const results = await Application.aggregate(pipeline);

  // Calculate hired per source
  const sourcesWithHired = await Promise.all(
    results.map(async (source) => {
      const hired = await Application.countDocuments({
        ...matchStage,
        source: source._id,
        stage: 'hired'
      });

      return {
        source: source._id || 'Direct',
        total: source.total,
        hired,
        conversionRate: source.total > 0 ? Math.round((hired / source.total) * 100) : 0
      };
    })
  );

  return sourcesWithHired;
}

/**
 * Get job-wise analytics
 * @param {Object} filters - Filters
 * @returns {Array} Job analytics
 */
async function getJobAnalytics(filters = {}) {
  const { startDate, endDate, limit = 10 } = filters;

  const matchStage = {};
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }

  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: '$job_id',
        totalApplications: { $sum: 1 },
        hired: {
          $sum: { $cond: [{ $eq: ['$stage', 'hired'] }, 1, 0] }
        },
        rejected: {
          $sum: { $cond: [{ $eq: ['$stage', 'rejected'] }, 1, 0] }
        },
        inProgress: {
          $sum: {
            $cond: [
              { $and: [{ $ne: ['$stage', 'hired'] }, { $ne: ['$stage', 'rejected'] }] },
              1,
              0
            ]
          }
        }
      }
    },
    { $sort: { totalApplications: -1 } },
    { $limit: parseInt(limit) },
    {
      $lookup: {
        from: 'jobopenings',
        localField: '_id',
        foreignField: '_id',
        as: 'job'
      }
    },
    { $unwind: { path: '$job', preserveNullAndEmptyArrays: true } }
  ];

  const results = await Application.aggregate(pipeline);

  return results.map(r => ({
    jobId: r._id,
    jobTitle: r.job?.title || 'Unknown',
    department: r.job?.department || 'N/A',
    totalApplications: r.totalApplications,
    hired: r.hired,
    rejected: r.rejected,
    inProgress: r.inProgress,
    conversionRate: r.totalApplications > 0 ? Math.round((r.hired / r.totalApplications) * 100) : 0
  }));
}

/**
 * Get activity timeline
 * @param {Object} filters - Filters
 * @returns {Array} Activity data
 */
async function getActivityTimeline(filters = {}) {
  const { startDate, endDate, groupBy = 'day', limit = 30 } = filters;

  const matchStage = {};
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }

  let dateGroup;
  switch (groupBy) {
    case 'week':
      dateGroup = { $week: '$createdAt' };
      break;
    case 'month':
      dateGroup = { $month: '$createdAt' };
      break;
    default:
      dateGroup = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
  }

  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: dateGroup,
        applications: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } },
    { $limit: parseInt(limit) }
  ];

  const results = await Application.aggregate(pipeline);

  return results.map(r => ({
    date: r._id,
    applications: r.applications
  }));
}

/**
 * Get recruiter performance metrics
 * @param {Object} filters - Filters
 * @returns {Array} Recruiter stats
 */
async function getRecruiterPerformance(filters = {}) {
  const { startDate, endDate } = filters;

  const matchStage = {};
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }

  // Get activity by user
  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: '$user_id',
        totalActions: { $sum: 1 },
        actions: { $push: '$action' }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } }
  ];

  const results = await ActivityLog.aggregate(pipeline);

  return results.map(r => ({
    userId: r._id,
    userName: r.user?.name || 'System',
    totalActions: r.totalActions,
    actionBreakdown: r.actions.reduce((acc, action) => {
      acc[action] = (acc[action] || 0) + 1;
      return acc;
    }, {})
  })).sort((a, b) => b.totalActions - a.totalActions);
}

/**
 * Get interview analytics
 * @param {Object} filters - Filters
 * @returns {Object} Interview stats
 */
async function getInterviewAnalytics(filters = {}) {
  const { startDate, endDate } = filters;

  const matchStage = {};
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }

  const [total, scheduled, completed, cancelled] = await Promise.all([
    Interview.countDocuments(matchStage),
    Interview.countDocuments({ ...matchStage, status: 'Scheduled' }),
    Interview.countDocuments({ ...matchStage, status: 'Completed' }),
    Interview.countDocuments({ ...matchStage, status: 'Cancelled' })
  ]);

  // Get interviews by type
  const byType = await Interview.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$locationType',
        count: { $sum: 1 }
      }
    }
  ]);

  return {
    total,
    scheduled,
    completed,
    cancelled,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    byType: byType.map(t => ({
      type: t._id || 'Unknown',
      count: t.count
    }))
  };
}

/**
 * Format stage name for display
 * @param {string} stage - Stage key
 * @returns {string} Formatted name
 */
function formatStageName(stage) {
  const names = {
    'shortlisting': 'Shortlisting',
    'screening': 'Screening',
    'assignment-sent': 'Assignment Sent',
    'assignment-submitted': 'Assignment Submitted',
    'interview': 'Interview',
    'offer-sent': 'Offer Sent',
    'offer-accepted': 'Offer Accepted',
    'hired': 'Hired',
    'rejected': 'Rejected'
  };
  return names[stage] || stage;
}

/**
 * Get comprehensive dashboard data
 * @param {Object} filters - Filters
 * @returns {Object} All dashboard data
 */
async function getDashboardData(filters = {}) {
  const [
    overview,
    funnel,
    timeToHire,
    sources,
    jobAnalytics,
    activityTimeline,
    interviewStats
  ] = await Promise.all([
    getOverviewStats(filters),
    getPipelineFunnel(filters),
    getTimeToHire(filters),
    getSourceAnalytics(filters),
    getJobAnalytics({ ...filters, limit: 5 }),
    getActivityTimeline({ ...filters, limit: 14 }),
    getInterviewAnalytics(filters)
  ]);

  return {
    overview,
    funnel,
    timeToHire,
    sources,
    topJobs: jobAnalytics,
    activityTimeline,
    interviewStats,
    generatedAt: new Date()
  };
}

module.exports = {
  getOverviewStats,
  getPipelineFunnel,
  getTimeToHire,
  getSourceAnalytics,
  getJobAnalytics,
  getActivityTimeline,
  getRecruiterPerformance,
  getInterviewAnalytics,
  getDashboardData
};
