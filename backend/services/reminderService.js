// =====================================================
// REMINDER SERVICE - Automated Interview Reminders
// =====================================================

const { Interview, Application, Candidate } = require('../models');
const emailService = require('./emailService');

/**
 * Get interviews scheduled for the next N hours
 * @param {number} hoursAhead - Hours to look ahead
 * @returns {Array} Upcoming interviews
 */
async function getUpcomingInterviews(hoursAhead = 24) {
  const now = new Date();
  const futureTime = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

  try {
    const interviews = await Interview.find({
      status: 'Scheduled',
      date: {
        $gte: now.toISOString().split('T')[0],
        $lte: futureTime.toISOString().split('T')[0]
      },
      reminderSent: { $ne: true }
    })
    .populate({
      path: 'application_id',
      populate: [
        { path: 'candidate_id' },
        { path: 'job_id' }
      ]
    })
    .lean();

    // Filter by actual time (combining date and time)
    return interviews.filter(interview => {
      if (!interview.date || !interview.time) return false;

      const interviewDateTime = new Date(`${interview.date.split('T')[0]}T${interview.time}`);
      return interviewDateTime >= now && interviewDateTime <= futureTime;
    });
  } catch (error) {
    console.error('Error fetching upcoming interviews:', error);
    return [];
  }
}

/**
 * Send reminder email for an interview
 * @param {Object} interview - Interview object with populated data
 * @returns {Object} Result
 */
async function sendInterviewReminder(interview) {
  try {
    const candidate = interview.application_id?.candidate_id;
    const job = interview.application_id?.job_id;

    if (!candidate?.email) {
      return { success: false, error: 'No candidate email found' };
    }

    const interviewDate = new Date(interview.date);
    const formattedDate = interviewDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const subject = `⏰ Reminder: Your Interview Tomorrow - ${job?.title || 'Position'}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <div style="background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); padding: 40px 32px; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 16px;">⏰</div>
            <h1 style="color: white; font-size: 24px; margin: 0 0 8px; font-weight: 700;">
              Interview Reminder
            </h1>
            <p style="color: rgba(255, 255, 255, 0.9); font-size: 16px; margin: 0;">
              Your interview is coming up!
            </p>
          </div>

          <!-- Content -->
          <div style="padding: 32px;">
            <p style="font-size: 16px; color: #334155; line-height: 1.6; margin: 0 0 24px;">
              Dear <strong>${candidate.name}</strong>,
            </p>

            <p style="font-size: 16px; color: #334155; line-height: 1.6; margin: 0 0 24px;">
              This is a friendly reminder that your interview for <strong>${job?.title || 'the position'}</strong> is scheduled for tomorrow.
            </p>

            <!-- Interview Details Card -->
            <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin: 24px 0;">
              <h3 style="color: #1e293b; font-size: 14px; margin: 0 0 16px; text-transform: uppercase; letter-spacing: 0.5px;">
                📅 Interview Details
              </h3>

              <div style="margin-bottom: 12px;">
                <span style="color: #64748b; font-size: 14px;">Date:</span>
                <span style="color: #1e293b; font-size: 14px; font-weight: 600; margin-left: 8px;">${formattedDate}</span>
              </div>

              <div style="margin-bottom: 12px;">
                <span style="color: #64748b; font-size: 14px;">Time:</span>
                <span style="color: #1e293b; font-size: 14px; font-weight: 600; margin-left: 8px;">${interview.time}</span>
              </div>

              <div style="margin-bottom: 12px;">
                <span style="color: #64748b; font-size: 14px;">Duration:</span>
                <span style="color: #1e293b; font-size: 14px; font-weight: 600; margin-left: 8px;">${interview.duration || 60} minutes</span>
              </div>

              ${interview.interviewer ? `
              <div style="margin-bottom: 12px;">
                <span style="color: #64748b; font-size: 14px;">Interviewer:</span>
                <span style="color: #1e293b; font-size: 14px; font-weight: 600; margin-left: 8px;">${interview.interviewer}</span>
              </div>
              ` : ''}

              <div style="margin-bottom: ${interview.meetingLink ? '12px' : '0'};">
                <span style="color: #64748b; font-size: 14px;">Type:</span>
                <span style="color: #1e293b; font-size: 14px; font-weight: 600; margin-left: 8px;">
                  ${interview.locationType === 'online' ? '🎥 Online' : '🏢 In-Person'}
                </span>
              </div>

              ${interview.locationType === 'online' && interview.meetingLink ? `
              <div>
                <span style="color: #64748b; font-size: 14px;">Meeting Link:</span>
                <a href="${interview.meetingLink}" style="color: #6366f1; font-size: 14px; font-weight: 600; margin-left: 8px; text-decoration: none;">
                  Join Meeting
                </a>
              </div>
              ` : ''}

              ${interview.locationType !== 'online' && interview.address ? `
              <div>
                <span style="color: #64748b; font-size: 14px;">Location:</span>
                <span style="color: #1e293b; font-size: 14px; font-weight: 600; margin-left: 8px;">${interview.address}</span>
              </div>
              ` : ''}
            </div>

            <!-- Tips -->
            <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 12px; padding: 16px; margin: 24px 0;">
              <h4 style="color: #92400e; font-size: 14px; margin: 0 0 12px; font-weight: 600;">
                💡 Quick Tips
              </h4>
              <ul style="margin: 0; padding-left: 20px; color: #a16207; font-size: 14px; line-height: 1.6;">
                <li>Test your audio/video if it's an online interview</li>
                <li>Join a few minutes early</li>
                <li>Keep your resume handy</li>
                <li>Prepare questions about the role and company</li>
              </ul>
            </div>

            <p style="font-size: 16px; color: #334155; line-height: 1.6; margin: 24px 0 0;">
              We look forward to speaking with you!
            </p>

            <p style="font-size: 16px; color: #334155; line-height: 1.6; margin: 24px 0 0;">
              Best regards,<br>
              <strong>AI Planet Recruitment Team</strong>
            </p>
          </div>

          <!-- Footer -->
          <div style="background: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #64748b; font-size: 13px; margin: 0;">
              AI Planet | Building the Future with AI
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    await emailService.sendEmail(candidate.email, subject, html);

    // Mark reminder as sent
    await Interview.findByIdAndUpdate(interview._id, {
      reminderSent: true,
      reminderSentAt: new Date()
    });

    console.log(`✅ Interview reminder sent to ${candidate.email} for interview on ${formattedDate}`);

    return { success: true, email: candidate.email };
  } catch (error) {
    console.error('Error sending interview reminder:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Process all pending interview reminders
 * @param {number} hoursAhead - Hours to look ahead (default 24)
 * @returns {Object} Processing result
 */
async function processInterviewReminders(hoursAhead = 24) {
  console.log(`🔔 Checking for interviews in the next ${hoursAhead} hours...`);

  const upcomingInterviews = await getUpcomingInterviews(hoursAhead);
  console.log(`📋 Found ${upcomingInterviews.length} upcoming interviews needing reminders`);

  const results = {
    total: upcomingInterviews.length,
    sent: 0,
    failed: 0,
    errors: []
  };

  for (const interview of upcomingInterviews) {
    const result = await sendInterviewReminder(interview);
    if (result.success) {
      results.sent++;
    } else {
      results.failed++;
      results.errors.push({
        interviewId: interview._id,
        error: result.error
      });
    }
  }

  console.log(`✅ Reminder processing complete: ${results.sent} sent, ${results.failed} failed`);

  return results;
}

/**
 * Send manual reminder for a specific interview
 * @param {string} interviewId - Interview ID
 * @returns {Object} Result
 */
async function sendManualReminder(interviewId) {
  try {
    const interview = await Interview.findById(interviewId)
      .populate({
        path: 'application_id',
        populate: [
          { path: 'candidate_id' },
          { path: 'job_id' }
        ]
      })
      .lean();

    if (!interview) {
      return { success: false, error: 'Interview not found' };
    }

    return await sendInterviewReminder(interview);
  } catch (error) {
    console.error('Error sending manual reminder:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  getUpcomingInterviews,
  sendInterviewReminder,
  processInterviewReminders,
  sendManualReminder
};
