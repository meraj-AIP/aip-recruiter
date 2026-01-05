// =====================================================
// AI ROUTES - MongoDB
// =====================================================

const express = require('express');
const router = express.Router();
const { Application, JobOpening, CandidateAssignment, Interview, TaskAssignment } = require('../models');
const { analyzeResume, quickScore, generateJobDescription } = require('../services/aiScoring');

// POST /api/ai/score - Score a resume
router.post('/score', async (req, res) => {
  try {
    const { resumeText, jobId, applicationId } = req.body;

    if (!resumeText) {
      return res.status(400).json({ error: 'Resume text is required' });
    }

    if (!jobId) {
      return res.status(400).json({ error: 'Job ID is required' });
    }

    const job = await JobOpening.findById(jobId)
      .populate('department_id', 'name')
      .populate('role_type_id', 'name')
      .populate('work_setup_id', 'name')
      .lean();

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const jobDetails = {
      title: job.title,
      department: job.department_id?.name,
      skills: job.skills,
      experienceMin: job.experience_min,
      experienceMax: job.experience_max,
      qualifications: job.qualifications,
      keyResponsibilities: job.key_responsibilities
    };

    const analysis = await analyzeResume(resumeText, jobDetails);

    if (applicationId) {
      await Application.findByIdAndUpdate(applicationId, {
        ai_score: analysis.score,
        ai_analysis: analysis.detailedAnalysis,
        profile_strength: analysis.profileStrength,
      });
    }

    res.json({ success: true, analysis });
  } catch (error) {
    console.error('AI scoring error:', error);

    try {
      const { resumeText, jobId } = req.body;
      const job = await JobOpening.findById(jobId).lean();
      const score = quickScore(resumeText, job);

      res.json({
        success: true,
        analysis: {
          score,
          profileStrength: score >= 70 ? 'Good' : 'Fair',
          summary: 'Quick score generated (AI unavailable)',
          strengths: [],
          weaknesses: [],
          skillsMatch: [],
          recommendations: []
        },
        fallback: true
      });
    } catch (fallbackError) {
      res.status(500).json({ error: 'Failed to score resume' });
    }
  }
});

// POST /api/ai/batch-score - Score multiple applications
router.post('/batch-score', async (req, res) => {
  try {
    const { applicationIds } = req.body;

    if (!applicationIds || !Array.isArray(applicationIds)) {
      return res.status(400).json({ error: 'Application IDs array is required' });
    }

    const results = [];

    for (const appId of applicationIds) {
      try {
        const app = await Application.findById(appId)
          .populate('candidate_id')
          .populate('job_id')
          .lean();

        if (!app || !app.candidate_id?.resume_text) {
          results.push({ applicationId: appId, success: false, error: 'Application or resume not found' });
          continue;
        }

        const analysis = await analyzeResume(app.candidate_id.resume_text, {
          title: app.job_id.title,
          skills: app.job_id.skills,
          experienceMin: app.job_id.experience_min,
          experienceMax: app.job_id.experience_max,
          qualifications: app.job_id.qualifications,
          keyResponsibilities: app.job_id.key_responsibilities
        });

        await Application.findByIdAndUpdate(appId, {
          ai_score: analysis.score,
          ai_analysis: analysis.detailedAnalysis,
          profile_strength: analysis.profileStrength,
        });

        results.push({ applicationId: appId, success: true, score: analysis.score });
      } catch (error) {
        console.error(`Error scoring application ${appId}:`, error);
        results.push({ applicationId: appId, success: false, error: error.message });
      }
    }

    res.json({
      success: true,
      results,
      total: applicationIds.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    });
  } catch (error) {
    console.error('Batch scoring error:', error);
    res.status(500).json({ error: 'Failed to batch score applications' });
  }
});

// POST /api/ai/generate-job-description - Generate job description using AI
router.post('/generate-job-description', async (req, res) => {
  try {
    const { title, department, roleType, workSetup, location, experienceMin, experienceMax } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Job title is required' });
    }

    console.log('🤖 Generating job description for:', title);

    const result = await generateJobDescription({
      title,
      department,
      roleType,
      workSetup,
      location,
      experienceMin,
      experienceMax
    });

    console.log('✅ Job description generated successfully');

    res.json(result);
  } catch (error) {
    console.error('Job description generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate job description'
    });
  }
});

// GET /api/ai/recommendations - Get AI-powered task recommendations and insights
router.get('/recommendations', async (req, res) => {
  try {
    const { userId } = req.query;

    // Fetch relevant data for recommendations
    const [
      pendingApplications,
      overdueAssignments,
      upcomingInterviews,
      pendingTasks,
      recentHighScorers,
      staleApplications
    ] = await Promise.all([
      // Applications awaiting review (in screening stage)
      Application.find({ stage: 'screening' })
        .populate('candidate_id', 'name email')
        .populate('job_id', 'title')
        .sort({ ai_score: -1 })
        .limit(10)
        .lean(),

      // Assignments that are overdue or due soon
      CandidateAssignment.find({
        status: 'sent',
        deadline_date: { $lte: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) } // Due within 2 days
      })
        .populate('application_id')
        .sort({ deadline_date: 1 })
        .limit(5)
        .lean(),

      // Upcoming interviews in next 3 days
      Interview.find({
        scheduled_date: {
          $gte: new Date(),
          $lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        },
        status: { $in: ['scheduled', 'confirmed'] }
      })
        .populate('application_id')
        .sort({ scheduled_date: 1 })
        .limit(5)
        .lean(),

      // Pending tasks assigned to user
      TaskAssignment.find({
        status: 'pending',
        ...(userId ? { assigned_to: userId } : {})
      })
        .populate('application_id')
        .sort({ due_date: 1 })
        .limit(10)
        .lean(),

      // High-scoring candidates that haven't been actioned
      Application.find({
        ai_score: { $gte: 85 },
        stage: { $in: ['screening', 'shortlisted'] }
      })
        .populate('candidate_id', 'name email')
        .populate('job_id', 'title')
        .sort({ ai_score: -1 })
        .limit(5)
        .lean(),

      // Applications with no activity for 7+ days
      Application.find({
        stage: { $nin: ['hired', 'rejected'] },
        last_activity_at: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      })
        .populate('candidate_id', 'name email')
        .populate('job_id', 'title')
        .sort({ last_activity_at: 1 })
        .limit(5)
        .lean()
    ]);

    // Generate prioritized recommendations
    const recommendations = [];
    const insights = [];

    // Priority 1: High-scoring candidates need immediate attention
    if (recentHighScorers.length > 0) {
      const top = recentHighScorers[0];
      recommendations.push({
        id: 'high-scorer-1',
        type: 'high_priority',
        icon: '🌟',
        title: 'Top Candidate Needs Review',
        description: `${top.candidate_id?.name || 'A candidate'} has a ${top.ai_score}% match score for ${top.job_id?.title || 'the role'}. High-potential candidates should be contacted quickly to maintain engagement.`,
        action: 'Review Now',
        actionType: 'view_candidate',
        applicationId: top._id,
        candidateName: top.candidate_id?.name,
        score: top.ai_score,
        priority: 1
      });
    }

    // Priority 2: Overdue assignments
    overdueAssignments.forEach((assignment, idx) => {
      const isOverdue = new Date(assignment.deadline_date) < new Date();
      recommendations.push({
        id: `assignment-${idx}`,
        type: isOverdue ? 'overdue' : 'urgent',
        icon: isOverdue ? '⚠️' : '📝',
        title: isOverdue ? 'Overdue Assignment' : 'Assignment Due Soon',
        description: `${assignment.candidate_name || 'Candidate'}'s assignment "${assignment.assignment_name}" ${isOverdue ? 'was due' : 'is due'} ${formatRelativeDate(assignment.deadline_date)}. ${isOverdue ? 'Follow up to check on progress.' : 'Prepare for review.'}`,
        action: 'View Assignment',
        actionType: 'view_assignment',
        applicationId: assignment.application_id?._id,
        assignmentId: assignment._id,
        priority: isOverdue ? 1 : 2
      });
    });

    // Priority 3: Upcoming interviews
    upcomingInterviews.forEach((interview, idx) => {
      const interviewDate = new Date(interview.scheduled_date);
      const isToday = interviewDate.toDateString() === new Date().toDateString();
      recommendations.push({
        id: `interview-${idx}`,
        type: isToday ? 'today' : 'upcoming',
        icon: isToday ? '🔴' : '📅',
        title: isToday ? 'Interview Today!' : 'Upcoming Interview',
        description: `${interview.title || 'Interview'} ${isToday ? 'today at' : 'scheduled for'} ${interviewDate.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`,
        action: 'View Details',
        actionType: 'view_interview',
        applicationId: interview.application_id?._id,
        interviewId: interview._id,
        priority: isToday ? 1 : 3
      });
    });

    // Priority 4: Pending tasks
    pendingTasks.slice(0, 3).forEach((task, idx) => {
      recommendations.push({
        id: `task-${idx}`,
        type: 'task',
        icon: '✓',
        title: task.title || 'Pending Task',
        description: task.notes || `Task for ${task.candidate_name || 'candidate'}`,
        action: 'Complete',
        actionType: 'complete_task',
        taskId: task._id,
        applicationId: task.application_id?._id,
        priority: 4
      });
    });

    // Priority 5: Stale applications
    if (staleApplications.length > 0) {
      insights.push({
        id: 'stale-warning',
        type: 'warning',
        icon: '⏰',
        title: `${staleApplications.length} Application${staleApplications.length > 1 ? 's' : ''} Need Attention`,
        description: `Some applications haven't been updated in over a week. Candidates may lose interest if not contacted soon.`,
        count: staleApplications.length,
        applications: staleApplications.slice(0, 3).map(a => ({
          id: a._id,
          name: a.candidate_id?.name,
          role: a.job_id?.title,
          daysSince: Math.floor((Date.now() - new Date(a.last_activity_at)) / (1000 * 60 * 60 * 24))
        }))
      });
    }

    // Generate summary stats for insights
    const stats = {
      pendingReviews: pendingApplications.length,
      highScorers: recentHighScorers.length,
      overdueCount: overdueAssignments.filter(a => new Date(a.deadline_date) < new Date()).length,
      upcomingInterviews: upcomingInterviews.length,
      pendingTasks: pendingTasks.length,
      staleApplications: staleApplications.length
    };

    // Add productivity insights
    if (stats.pendingReviews > 5) {
      insights.push({
        id: 'review-backlog',
        type: 'info',
        icon: '📊',
        title: 'Review Backlog',
        description: `You have ${stats.pendingReviews} applications in the screening queue. Consider batch-reviewing to clear the backlog.`,
        suggestion: 'Try reviewing 3-5 candidates per session for best efficiency.'
      });
    }

    if (stats.highScorers >= 3) {
      insights.push({
        id: 'talent-pool',
        type: 'positive',
        icon: '💎',
        title: 'Strong Talent Pipeline',
        description: `You have ${stats.highScorers} high-scoring candidates (85%+). These are your best prospects - prioritize reaching out!`
      });
    }

    // Sort recommendations by priority
    recommendations.sort((a, b) => a.priority - b.priority);

    res.json({
      success: true,
      data: {
        recommendations: recommendations.slice(0, 6), // Top 6 recommendations
        insights,
        stats,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error generating AI recommendations:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

// Helper function for relative date formatting
function formatRelativeDate(date) {
  const now = new Date();
  const target = new Date(date);
  const diffMs = target - now;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < -1) return `${Math.abs(diffDays)} days ago`;
  if (diffDays === -1) return 'yesterday';
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'tomorrow';
  return `in ${diffDays} days`;
}

module.exports = router;
