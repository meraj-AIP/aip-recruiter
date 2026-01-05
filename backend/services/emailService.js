// =====================================================
// EMAIL SERVICE
// =====================================================
// Handles all email notifications

const nodemailer = require('nodemailer');

// Create email transporter
let transporter;

// Initialize transporter - use configured SMTP or fallback to Ethereal for testing
async function initTransporter() {
  if (transporter) return transporter;

  // Check if we have valid SMTP config
  if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    // Test the connection
    try {
      await transporter.verify();
      console.log('✅ Email transporter ready (configured SMTP)');
      return transporter;
    } catch (error) {
      console.log('⚠️ Configured SMTP failed, falling back to Ethereal for testing');
      console.log('   Error:', error.message);
    }
  }

  // Fallback to Ethereal test account
  try {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    console.log('✅ Email transporter ready (Ethereal test mode)');
    console.log('📧 Test emails viewable at: https://ethereal.email');
    console.log('   Login:', testAccount.user);
    return transporter;
  } catch (error) {
    console.error('❌ Failed to create email transporter:', error.message);
    // Create a dummy transporter that logs instead of sending
    transporter = {
      sendMail: async (options) => {
        console.log('📧 [EMAIL SIMULATION] Would send email:');
        console.log('   To:', options.to);
        console.log('   Subject:', options.subject);
        return { messageId: 'simulated-' + Date.now() };
      }
    };
    return transporter;
  }
}

// Initialize on module load
initTransporter();

/**
 * Send application received confirmation
 * @param {Object} candidate - Candidate details
 * @param {Object} job - Job details
 */
async function sendApplicationReceived(candidate, job) {
  const subject = `Application Received - ${job.title}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #44924c;">Thank You for Your Application!</h2>
      <p>Dear ${candidate.name},</p>
      <p>We have received your application for the position of <strong>${job.title}</strong>.</p>
      <p>Our team will review your application and get back to you soon.</p>
      <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Position Details:</h3>
        <p><strong>Title:</strong> ${job.title}</p>
        <p><strong>Department:</strong> ${job.department || 'N/A'}</p>
        <p><strong>Location:</strong> ${job.location}</p>
      </div>
      <p>Best regards,<br>The Recruitment Team</p>
    </div>
  `;
  
  return sendEmail(candidate.email, subject, html);
}

/**
 * Send interview invitation
 * @param {Object} candidate - Candidate details
 * @param {Object} interview - Interview details
 */
async function sendInterviewInvitation(candidate, interview) {
  const subject = `Interview Invitation - ${interview.jobTitle}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #44924c;">You're Invited for an Interview!</h2>
      <p>Dear ${candidate.name},</p>
      <p>Congratulations! We would like to invite you for an interview for the position of <strong>${interview.jobTitle}</strong>.</p>
      <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #44924c;">
        <h3 style="margin-top: 0;">Interview Details:</h3>
        <p><strong>Type:</strong> ${interview.type}</p>
        <p><strong>Date & Time:</strong> ${new Date(interview.scheduledAt).toLocaleString()}</p>
        <p><strong>Duration:</strong> ${interview.durationMinutes} minutes</p>
        ${interview.location ? `<p><strong>Location:</strong> ${interview.location}</p>` : ''}
      </div>
      <p>Please confirm your availability by replying to this email.</p>
      <p>Best regards,<br>The Recruitment Team</p>
    </div>
  `;
  
  return sendEmail(candidate.email, subject, html);
}

/**
 * Generate ICS calendar invite content
 * @param {Object} params - Calendar event parameters
 * @returns {string} ICS file content
 */
function generateICSContent(params) {
  const {
    title,
    description,
    startDate,
    startTime,
    durationMinutes,
    location,
    meetingLink,
    organizerEmail,
    organizerName,
    attendees = []
  } = params;

  // Parse date and time
  const [year, month, day] = startDate.split('-').map(Number);
  const [hours, minutes] = startTime.split(':').map(Number);

  // Create start date in UTC format
  const startDateTime = new Date(year, month - 1, day, hours, minutes);
  const endDateTime = new Date(startDateTime.getTime() + (durationMinutes * 60 * 1000));

  // Format dates for ICS (YYYYMMDDTHHMMSS)
  const formatDate = (date) => {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };

  const uid = `interview-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@aiplanet.com`;
  const now = formatDate(new Date());
  const dtStart = formatDate(startDateTime);
  const dtEnd = formatDate(endDateTime);

  // Build location string
  let locationStr = location || '';
  if (meetingLink) {
    locationStr = meetingLink;
  }

  // Build attendees list
  const attendeeLines = attendees.map(att =>
    `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN=${att.name}:mailto:${att.email}`
  ).join('\r\n');

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AI Planet//Recruitment Platform//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
    locationStr ? `LOCATION:${locationStr}` : '',
    `ORGANIZER;CN=${organizerName}:mailto:${organizerEmail}`,
    attendeeLines,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Interview Reminder',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(line => line).join('\r\n');

  return icsContent;
}

/**
 * Send interview invitation with calendar invite to candidate
 * @param {Object} params - Interview parameters
 */
async function sendInterviewInvitationWithCalendar(params) {
  const {
    candidateName,
    candidateEmail,
    jobTitle,
    interviewTitle,
    scheduledDate,
    scheduledTime,
    durationMinutes,
    locationType,
    platform,
    meetingLink,
    address,
    interviewerName,
    interviewerEmail,
    notes
  } = params;

  // Format date for display
  const displayDate = new Date(scheduledDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Format time for display
  const [hours, mins] = scheduledTime.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  const displayTime = `${displayHour}:${mins} ${ampm}`;

  const isOnline = locationType === 'online';

  // Generate ICS content
  const icsContent = generateICSContent({
    title: interviewTitle || `Interview for ${jobTitle} - AI Planet`,
    description: `Interview for ${jobTitle} position at AI Planet.\\n\\nInterviewer: ${interviewerName}\\n${isOnline ? `Meeting Link: ${meetingLink}` : `Location: ${address}`}${notes ? `\\n\\nNotes: ${notes}` : ''}`,
    startDate: scheduledDate,
    startTime: scheduledTime,
    durationMinutes: parseInt(durationMinutes) || 60,
    location: isOnline ? meetingLink : address,
    meetingLink: isOnline ? meetingLink : null,
    organizerEmail: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    organizerName: 'AI Planet Recruitment',
    attendees: [
      { name: candidateName, email: candidateEmail },
      { name: interviewerName, email: interviewerEmail || process.env.EMAIL_FROM }
    ]
  });

  const subject = `Interview Invitation - ${jobTitle} at AI Planet`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #44924c, #2d6a33); padding: 32px; text-align: center; border-radius: 12px 12px 0 0;">
        <div style="font-size: 32px; margin-bottom: 8px;">🌍</div>
        <h1 style="color: white; font-size: 24px; font-weight: 600; margin: 0;">AI Planet</h1>
        <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 8px 0 0;">Interview Invitation</p>
      </div>

      <!-- Body -->
      <div style="padding: 32px; background: white;">
        <p style="font-size: 15px; color: #1e293b; margin-bottom: 16px;">Dear ${candidateName},</p>
        <p style="font-size: 15px; color: #1e293b; margin-bottom: 16px; line-height: 1.6;">
          We are pleased to invite you for an interview for the <strong>${jobTitle}</strong> position at AI Planet.
        </p>

        <!-- Interview Details Card -->
        <div style="background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 24px 0;">
          <h3 style="font-size: 16px; font-weight: 600; color: #1e293b; margin: 0 0 16px;">📅 Interview Details</h3>

          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px; width: 120px;">Date:</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 500;">${displayDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Time:</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 500;">${displayTime}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Duration:</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 500;">${durationMinutes} minutes</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Type:</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 500;">${isOnline ? '💻 Online' : '🏢 In-Person'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Interviewer:</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 500;">${interviewerName}</td>
            </tr>
          </table>

          ${isOnline ? `
            <div style="margin-top: 16px; padding: 16px; background: #f0fdf4; border-radius: 8px; border-left: 4px solid #44924c;">
              <p style="margin: 0 0 8px; font-size: 13px; color: #64748b;">Platform: ${platform}</p>
              <a href="${meetingLink}" style="color: #44924c; font-weight: 500; font-size: 14px; text-decoration: none;">${meetingLink}</a>
            </div>
          ` : `
            <div style="margin-top: 16px; padding: 16px; background: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
              <p style="margin: 0; font-size: 14px; color: #92400e;"><strong>📍 Address:</strong> ${address}</p>
            </div>
          `}
        </div>

        ${notes ? `
          <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 13px; color: #64748b;"><strong>Additional Notes:</strong></p>
            <p style="margin: 8px 0 0; font-size: 14px; color: #1e293b;">${notes}</p>
          </div>
        ` : ''}

        <p style="font-size: 14px; color: #64748b; margin-bottom: 16px;">
          📎 A calendar invite has been attached to this email. Please add it to your calendar.
        </p>

        <p style="font-size: 15px; color: #1e293b; margin-top: 24px;">
          We look forward to speaking with you!
        </p>
        <p style="font-size: 15px; color: #1e293b;">Best regards,<br><strong>AI Planet Recruitment Team</strong></p>
      </div>

      <!-- Footer -->
      <div style="background: #f8fafc; padding: 20px; text-align: center; border-radius: 0 0 12px 12px; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0; font-size: 12px; color: #94a3b8;">© ${new Date().getFullYear()} AI Planet. All rights reserved.</p>
      </div>
    </div>
  `;

  try {
    // Ensure transporter is initialized
    await initTransporter();

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@aiplanet.com',
      to: candidateEmail,
      subject,
      html,
      icalEvent: {
        filename: 'interview-invite.ics',
        method: 'REQUEST',
        content: icsContent
      }
    });

    // Log preview URL for Ethereal emails
    if (info.messageId && transporter.options?.host === 'smtp.ethereal.email') {
      console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
    }

    console.log('✅ Interview invitation email sent to candidate:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending interview invitation to candidate:', error);
    throw new Error('Failed to send interview invitation email');
  }
}

/**
 * Send interview notification with calendar invite to interviewer
 * @param {Object} params - Interview parameters
 */
async function sendInterviewerNotification(params) {
  const {
    candidateName,
    candidateEmail,
    jobTitle,
    interviewTitle,
    scheduledDate,
    scheduledTime,
    durationMinutes,
    locationType,
    platform,
    meetingLink,
    address,
    interviewerName,
    interviewerEmail,
    notes
  } = params;

  // Format date for display
  const displayDate = new Date(scheduledDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Format time for display
  const [hours, mins] = scheduledTime.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  const displayTime = `${displayHour}:${mins} ${ampm}`;

  const isOnline = locationType === 'online';

  // Generate ICS content
  const icsContent = generateICSContent({
    title: interviewTitle || `Interview: ${candidateName} for ${jobTitle}`,
    description: `Candidate Interview\\n\\nCandidate: ${candidateName}\\nPosition: ${jobTitle}\\n${isOnline ? `Meeting Link: ${meetingLink}` : `Location: ${address}`}${notes ? `\\n\\nNotes: ${notes}` : ''}`,
    startDate: scheduledDate,
    startTime: scheduledTime,
    durationMinutes: parseInt(durationMinutes) || 60,
    location: isOnline ? meetingLink : address,
    meetingLink: isOnline ? meetingLink : null,
    organizerEmail: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    organizerName: 'AI Planet Recruitment',
    attendees: [
      { name: interviewerName, email: interviewerEmail },
      { name: candidateName, email: candidateEmail }
    ]
  });

  const subject = `Interview Scheduled: ${candidateName} for ${jobTitle}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); padding: 32px; text-align: center; border-radius: 12px 12px 0 0;">
        <div style="font-size: 32px; margin-bottom: 8px;">📋</div>
        <h1 style="color: white; font-size: 24px; font-weight: 600; margin: 0;">Interview Scheduled</h1>
        <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 8px 0 0;">AI Planet Recruitment</p>
      </div>

      <!-- Body -->
      <div style="padding: 32px; background: white;">
        <p style="font-size: 15px; color: #1e293b; margin-bottom: 16px;">Hi ${interviewerName},</p>
        <p style="font-size: 15px; color: #1e293b; margin-bottom: 16px; line-height: 1.6;">
          An interview has been scheduled for you with a candidate for the <strong>${jobTitle}</strong> position.
        </p>

        <!-- Candidate Info Card -->
        <div style="background: #eff6ff; border: 2px solid #bfdbfe; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <h3 style="font-size: 14px; font-weight: 600; color: #1e40af; margin: 0 0 12px;">👤 Candidate Information</h3>
          <p style="margin: 0; font-size: 16px; font-weight: 600; color: #1e293b;">${candidateName}</p>
          <p style="margin: 4px 0 0; font-size: 14px; color: #64748b;">${candidateEmail}</p>
        </div>

        <!-- Interview Details Card -->
        <div style="background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 24px 0;">
          <h3 style="font-size: 16px; font-weight: 600; color: #1e293b; margin: 0 0 16px;">📅 Interview Details</h3>

          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px; width: 120px;">Date:</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 500;">${displayDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Time:</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 500;">${displayTime}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Duration:</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 500;">${durationMinutes} minutes</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Type:</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 500;">${isOnline ? '💻 Online' : '🏢 In-Person'}</td>
            </tr>
          </table>

          ${isOnline ? `
            <div style="margin-top: 16px; padding: 16px; background: #f0fdf4; border-radius: 8px; border-left: 4px solid #44924c;">
              <p style="margin: 0 0 8px; font-size: 13px; color: #64748b;">Platform: ${platform}</p>
              <a href="${meetingLink}" style="color: #44924c; font-weight: 500; font-size: 14px; text-decoration: none;">${meetingLink}</a>
            </div>
          ` : `
            <div style="margin-top: 16px; padding: 16px; background: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
              <p style="margin: 0; font-size: 14px; color: #92400e;"><strong>📍 Location:</strong> ${address}</p>
            </div>
          `}
        </div>

        ${notes ? `
          <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 13px; color: #64748b;"><strong>Notes:</strong></p>
            <p style="margin: 8px 0 0; font-size: 14px; color: #1e293b;">${notes}</p>
          </div>
        ` : ''}

        <p style="font-size: 14px; color: #64748b; margin-bottom: 16px;">
          📎 A calendar invite has been attached to this email.
        </p>

        <p style="font-size: 15px; color: #1e293b;">Best regards,<br><strong>AI Planet Recruitment System</strong></p>
      </div>

      <!-- Footer -->
      <div style="background: #f8fafc; padding: 20px; text-align: center; border-radius: 0 0 12px 12px; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0; font-size: 12px; color: #94a3b8;">© ${new Date().getFullYear()} AI Planet. All rights reserved.</p>
      </div>
    </div>
  `;

  try {
    // Ensure transporter is initialized
    await initTransporter();

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@aiplanet.com',
      to: interviewerEmail,
      subject,
      html,
      icalEvent: {
        filename: 'interview-invite.ics',
        method: 'REQUEST',
        content: icsContent
      }
    });

    // Log preview URL for Ethereal emails
    if (info.messageId && transporter.options?.host === 'smtp.ethereal.email') {
      console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
    }

    console.log('✅ Interview notification email sent to interviewer:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending interview notification to interviewer:', error);
    throw new Error('Failed to send interviewer notification email');
  }
}

/**
 * Send interview invitations to both candidate and interviewer
 * @param {Object} params - Interview parameters
 */
async function sendInterviewEmails(params) {
  const results = {
    candidate: null,
    interviewer: null,
    errors: []
  };

  // Send to candidate
  try {
    results.candidate = await sendInterviewInvitationWithCalendar(params);
  } catch (error) {
    console.error('Failed to send email to candidate:', error);
    results.errors.push({ recipient: 'candidate', error: error.message });
  }

  // Send to interviewer (if email provided)
  if (params.interviewerEmail) {
    try {
      results.interviewer = await sendInterviewerNotification(params);
    } catch (error) {
      console.error('Failed to send email to interviewer:', error);
      results.errors.push({ recipient: 'interviewer', error: error.message });
    }
  }

  return results;
}

/**
 * Send status update notification
 * @param {Object} candidate - Candidate details
 * @param {string} newStatus - New application status
 * @param {Object} job - Job details
 */
async function sendStatusUpdate(candidate, newStatus, job) {
  const subject = `Application Status Update - ${job.title}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #44924c;">Application Status Update</h2>
      <p>Dear ${candidate.name},</p>
      <p>We wanted to update you on the status of your application for <strong>${job.title}</strong>.</p>
      <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Current Status:</strong> ${formatStatus(newStatus)}</p>
      </div>
      <p>We appreciate your patience and interest in joining our team.</p>
      <p>Best regards,<br>The Recruitment Team</p>
    </div>
  `;
  
  return sendEmail(candidate.email, subject, html);
}

/**
 * Send rejection email
 * @param {Object} candidate - Candidate details
 * @param {Object} job - Job details
 */
async function sendRejection(candidate, job) {
  const subject = `Application Update - ${job.title}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #475569;">Application Update</h2>
      <p>Dear ${candidate.name},</p>
      <p>Thank you for your interest in the <strong>${job.title}</strong> position and for taking the time to apply.</p>
      <p>After careful consideration, we have decided to move forward with other candidates whose qualifications more closely match our current needs.</p>
      <p>We appreciate your interest in our company and encourage you to apply for future opportunities that match your skills and experience.</p>
      <p>Best wishes in your job search.</p>
      <p>Best regards,<br>The Recruitment Team</p>
    </div>
  `;
  
  return sendEmail(candidate.email, subject, html);
}

/**
 * Send offer letter
 * @param {Object} candidate - Candidate details
 * @param {Object} offer - Offer details
 */
async function sendOfferLetter(candidate, offer) {
  const subject = `Job Offer - ${offer.jobTitle}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #44924c;">Congratulations! 🎉</h2>
      <p>Dear ${candidate.name},</p>
      <p>We are pleased to offer you the position of <strong>${offer.jobTitle}</strong>!</p>
      <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #44924c;">
        <h3 style="margin-top: 0;">Offer Details:</h3>
        <p><strong>Position:</strong> ${offer.jobTitle}</p>
        <p><strong>Start Date:</strong> ${offer.startDate || 'To be discussed'}</p>
        ${offer.salary ? `<p><strong>Salary:</strong> ${offer.salary}</p>` : ''}
      </div>
      <p>Please review the attached offer letter and let us know if you have any questions.</p>
      <p>We look forward to having you on our team!</p>
      <p>Best regards,<br>The Recruitment Team</p>
    </div>
  `;
  
  return sendEmail(candidate.email, subject, html);
}

/**
 * Core email sending function
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - Email HTML content
 */
async function sendEmail(to, subject, html) {
  try {
    // Ensure transporter is initialized
    await initTransporter();

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@aiplanet.com',
      to,
      subject,
      html
    });

    // Log preview URL for Ethereal emails
    if (info.messageId && transporter.options?.host === 'smtp.ethereal.email') {
      console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
    }

    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send email');
  }
}

/**
 * Format status for display
 * @param {string} status - Status code
 * @returns {string} Formatted status
 */
function formatStatus(status) {
  const statusMap = {
    'new': 'Application Received',
    'screening': 'Under Review',
    'interview': 'Interview Scheduled',
    'offer': 'Offer Extended',
    'hired': 'Hired',
    'rejected': 'Not Selected'
  };
  return statusMap[status] || status;
}

/**
 * Send screening call invitation to candidate and interviewer
 * @param {Object} params - Screening call parameters
 */
async function sendScreeningInvitation(params) {
  const {
    candidateName,
    candidateEmail,
    jobTitle,
    scheduledDate,
    scheduledTime,
    duration,
    platform,
    meetingLink,
    interviewer,
    interviewerEmail,
    agenda
  } = params;

  // Format date for display
  const displayDate = new Date(scheduledDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Format time for display
  const [hours, mins] = scheduledTime.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  const displayTime = `${displayHour}:${mins} ${ampm}`;

  // Generate ICS content for calendar invite
  const icsContent = generateICSContent({
    title: `Screening Call - ${jobTitle} at AI Planet`,
    description: `Screening call for ${jobTitle} position at AI Planet.\\n\\nInterviewer: ${interviewer}\\n${meetingLink ? `Meeting Link: ${meetingLink}` : ''}${agenda ? `\\n\\nAgenda:\\n${agenda}` : ''}`,
    startDate: scheduledDate,
    startTime: scheduledTime,
    durationMinutes: parseInt(duration) || 30,
    location: meetingLink || '',
    meetingLink: meetingLink,
    organizerEmail: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    organizerName: 'AI Planet Recruitment',
    attendees: [
      { name: candidateName, email: candidateEmail },
      { name: interviewer, email: interviewerEmail || process.env.EMAIL_FROM }
    ]
  });

  // Email to candidate
  const candidateSubject = `Screening Call Scheduled - ${jobTitle} at AI Planet`;
  const candidateHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 32px; text-align: center; border-radius: 12px 12px 0 0;">
        <div style="font-size: 40px; margin-bottom: 12px;">📞</div>
        <h1 style="color: white; font-size: 24px; font-weight: 600; margin: 0;">Screening Call Scheduled</h1>
        <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 8px 0 0;">${jobTitle} Position at AI Planet</p>
      </div>

      <!-- Body -->
      <div style="padding: 32px; background: white;">
        <p style="font-size: 16px; color: #1e293b; margin-bottom: 20px;">Dear ${candidateName},</p>
        <p style="font-size: 15px; color: #475569; line-height: 1.7; margin-bottom: 24px;">
          Thank you for your interest in the <strong>${jobTitle}</strong> position at AI Planet.
          We are pleased to invite you for a screening call to discuss your application further.
        </p>

        <!-- Call Details Card -->
        <div style="background: linear-gradient(135deg, #f0f9ff, #ecfdf5); border-radius: 16px; padding: 24px; margin-bottom: 24px; border: 1px solid #e2e8f0;">
          <h3 style="font-size: 16px; font-weight: 700; color: #1e293b; margin: 0 0 16px; display: flex; align-items: center;">
            📅 Call Details
          </h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px; width: 100px;">Date:</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 15px; font-weight: 600;">${displayDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Time:</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 15px; font-weight: 600;">${displayTime} IST</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Duration:</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 15px; font-weight: 600;">${duration} minutes</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Platform:</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 15px; font-weight: 600;">${platform}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Interviewer:</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 15px; font-weight: 600;">${interviewer}</td>
            </tr>
            ${meetingLink ? `
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Meeting Link:</td>
              <td style="padding: 8px 0;"><a href="${meetingLink}" style="color: #3b82f6; font-size: 14px; word-break: break-all;">${meetingLink}</a></td>
            </tr>
            ` : ''}
          </table>
        </div>

        ${agenda ? `
        <!-- Agenda -->
        <div style="background: #fff7ed; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #fed7aa;">
          <h4 style="font-size: 14px; font-weight: 700; color: #9a3412; margin: 0 0 12px;">📋 Discussion Agenda</h4>
          <p style="font-size: 14px; color: #7c2d12; line-height: 1.7; margin: 0; white-space: pre-wrap;">${agenda}</p>
        </div>
        ` : ''}

        ${meetingLink ? `
        <!-- Join Button -->
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${meetingLink}" style="display: inline-block; padding: 14px 40px; background: linear-gradient(135deg, #10b981, #059669); color: white; text-decoration: none; border-radius: 10px; font-size: 16px; font-weight: 600;">
            Join Meeting
          </a>
        </div>
        ` : ''}

        <p style="font-size: 14px; color: #64748b; line-height: 1.7; margin-bottom: 16px;">
          Please ensure you join the call on time. If you need to reschedule, please reply to this email
          at least 24 hours before the scheduled time.
        </p>

        <p style="font-size: 14px; color: #64748b; margin: 20px 0 8px;">
          📎 A calendar invite has been attached to this email for easy scheduling.
        </p>

        <p style="font-size: 14px; color: #64748b; margin: 24px 0 8px;">Best regards,</p>
        <p style="font-size: 14px; color: #1e293b; font-weight: 600; margin: 0;">The AI Planet Recruitment Team</p>
      </div>

      <!-- Footer -->
      <div style="background: #f8fafc; padding: 20px; text-align: center; border-radius: 0 0 12px 12px; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0; font-size: 12px; color: #94a3b8;">AI Planet | Building the Future with AI | aiplanet.com</p>
      </div>
    </div>
  `;

  const results = { candidate: null, interviewer: null, errors: [] };

  // Send to candidate
  try {
    await initTransporter();
    const candidateInfo = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@aiplanet.com',
      to: candidateEmail,
      subject: candidateSubject,
      html: candidateHtml,
      icalEvent: {
        filename: 'screening-call.ics',
        method: 'REQUEST',
        content: icsContent
      }
    });

    if (candidateInfo.messageId && transporter.options?.host === 'smtp.ethereal.email') {
      console.log('📧 Candidate Preview URL:', nodemailer.getTestMessageUrl(candidateInfo));
    }
    results.candidate = { success: true, messageId: candidateInfo.messageId };
    console.log('✅ Screening invitation sent to candidate:', candidateEmail);
  } catch (error) {
    console.error('Failed to send screening email to candidate:', error);
    results.errors.push({ recipient: 'candidate', error: error.message });
  }

  // Send notification to interviewer if email provided
  if (interviewerEmail) {
    const interviewerSubject = `Screening Call Scheduled: ${candidateName} for ${jobTitle}`;
    const interviewerHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #7c3aed, #8b5cf6); padding: 32px; text-align: center; border-radius: 12px 12px 0 0;">
          <div style="font-size: 40px; margin-bottom: 12px;">📋</div>
          <h1 style="color: white; font-size: 24px; font-weight: 600; margin: 0;">Screening Call Scheduled</h1>
          <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 8px 0 0;">AI Planet Recruitment</p>
        </div>

        <!-- Body -->
        <div style="padding: 32px; background: white;">
          <p style="font-size: 16px; color: #1e293b; margin-bottom: 20px;">Hi ${interviewer},</p>
          <p style="font-size: 15px; color: #475569; line-height: 1.7; margin-bottom: 24px;">
            A screening call has been scheduled for you with a candidate for the <strong>${jobTitle}</strong> position.
          </p>

          <!-- Candidate Info -->
          <div style="background: #eff6ff; border: 2px solid #bfdbfe; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
            <h3 style="font-size: 14px; font-weight: 600; color: #1e40af; margin: 0 0 12px;">👤 Candidate</h3>
            <p style="margin: 0; font-size: 16px; font-weight: 600; color: #1e293b;">${candidateName}</p>
            <p style="margin: 4px 0 0; font-size: 14px; color: #64748b;">${candidateEmail}</p>
          </div>

          <!-- Call Details -->
          <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #e2e8f0;">
            <h3 style="font-size: 16px; font-weight: 700; color: #1e293b; margin: 0 0 16px;">📅 Call Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px; width: 100px;">Date:</td>
                <td style="padding: 8px 0; color: #1e293b; font-size: 15px; font-weight: 500;">${displayDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Time:</td>
                <td style="padding: 8px 0; color: #1e293b; font-size: 15px; font-weight: 500;">${displayTime} IST</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Duration:</td>
                <td style="padding: 8px 0; color: #1e293b; font-size: 15px; font-weight: 500;">${duration} minutes</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Platform:</td>
                <td style="padding: 8px 0; color: #1e293b; font-size: 15px; font-weight: 500;">${platform}</td>
              </tr>
            </table>
            ${meetingLink ? `
            <div style="margin-top: 16px; padding: 12px; background: #f0fdf4; border-radius: 8px;">
              <a href="${meetingLink}" style="color: #059669; font-weight: 500; font-size: 14px;">${meetingLink}</a>
            </div>
            ` : ''}
          </div>

          <p style="font-size: 14px; color: #64748b; margin: 20px 0 8px;">📎 A calendar invite has been attached.</p>
          <p style="font-size: 14px; color: #1e293b; margin-top: 24px;">Best regards,<br><strong>AI Planet Recruitment System</strong></p>
        </div>

        <!-- Footer -->
        <div style="background: #f8fafc; padding: 20px; text-align: center; border-radius: 0 0 12px 12px; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; font-size: 12px; color: #94a3b8;">AI Planet | Internal Recruitment System</p>
        </div>
      </div>
    `;

    try {
      const interviewerInfo = await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@aiplanet.com',
        to: interviewerEmail,
        subject: interviewerSubject,
        html: interviewerHtml,
        icalEvent: {
          filename: 'screening-call.ics',
          method: 'REQUEST',
          content: icsContent
        }
      });

      if (interviewerInfo.messageId && transporter.options?.host === 'smtp.ethereal.email') {
        console.log('📧 Interviewer Preview URL:', nodemailer.getTestMessageUrl(interviewerInfo));
      }
      results.interviewer = { success: true, messageId: interviewerInfo.messageId };
      console.log('✅ Screening notification sent to interviewer:', interviewerEmail);
    } catch (error) {
      console.error('Failed to send screening email to interviewer:', error);
      results.errors.push({ recipient: 'interviewer', error: error.message });
    }
  }

  return results;
}

module.exports = {
  sendApplicationReceived,
  sendInterviewInvitation,
  sendInterviewInvitationWithCalendar,
  sendInterviewerNotification,
  sendInterviewEmails,
  sendScreeningInvitation,
  sendStatusUpdate,
  sendRejection,
  sendOfferLetter,
  sendEmail
};

