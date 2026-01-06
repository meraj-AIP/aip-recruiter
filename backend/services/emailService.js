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
 * Generate simple email footer
 */
function generateEmailFooter() {
  return `
    <div style="padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0; background: #f8fafc;">
      <p style="margin: 0 0 8px; font-size: 13px; color: #64748b;">AI Planet | Building the Future with AI</p>
      <p style="margin: 0; font-size: 12px; color: #94a3b8;">&copy; ${new Date().getFullYear()} AI Planet. All rights reserved.</p>
    </div>`;
}

/**
 * Send application received confirmation
 * @param {Object} candidate - Candidate details
 * @param {Object} job - Job details
 */
async function sendApplicationReceived(candidate, job) {
  const subject = `Application Received - ${job.title} at AI Planet`;
  const referenceNumber = `AIP-${Date.now().toString(36).toUpperCase()}`;
  const appliedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <!-- Simple Header -->
      <div style="padding: 32px; border-bottom: 1px solid #e2e8f0;">
        <div style="margin-bottom: 16px;">
          <span style="font-size: 24px; font-weight: 700; color: #1e293b;">AI</span>
          <span style="font-size: 24px; font-weight: 700; color: #10b981;">Planet</span>
        </div>
        <h1 style="font-size: 20px; font-weight: 600; color: #1e293b; margin: 0;">Application Received</h1>
      </div>

      <!-- Body -->
      <div style="padding: 32px;">
        <p style="font-size: 15px; color: #1e293b; margin-bottom: 20px;">Dear ${candidate.name},</p>
        <p style="font-size: 14px; color: #475569; line-height: 1.7; margin-bottom: 24px;">
          Thank you for your interest in joining <strong>AI Planet</strong>! We have successfully received your application for the position below.
        </p>

        <!-- Position Details -->
        <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <h3 style="font-size: 13px; font-weight: 600; color: #64748b; margin: 0 0 12px; text-transform: uppercase;">Position Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px; width: 120px;">Position:</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600;">${job.title}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Department:</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${job.department || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Location:</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${job.location}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Applied On:</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${appliedDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Reference #:</td>
              <td style="padding: 8px 0; color: #10b981; font-size: 14px; font-weight: 600;">${referenceNumber}</td>
            </tr>
          </table>
        </div>

        <!-- What's Next -->
        <div style="margin-bottom: 24px;">
          <h3 style="font-size: 14px; font-weight: 600; color: #1e293b; margin: 0 0 12px;">What Happens Next?</h3>
          <ul style="margin: 0; padding-left: 20px; color: #475569; font-size: 14px; line-height: 1.8;">
            <li>Our recruitment team will review your application</li>
            <li>If your profile matches, we'll schedule a screening call</li>
            <li>You'll receive email updates on your application status</li>
          </ul>
        </div>

        <p style="font-size: 14px; color: #64748b; line-height: 1.7; margin-bottom: 24px;">
          We appreciate your patience. Feel free to explore more at <a href="https://aiplanet.com" style="color: #10b981; text-decoration: none;">aiplanet.com</a>.
        </p>

        <p style="font-size: 14px; color: #1e293b; margin-bottom: 4px;">Best regards,</p>
        <p style="font-size: 14px; color: #1e293b; font-weight: 600; margin: 0;">The AI Planet Recruitment Team</p>
      </div>

      ${generateEmailFooter()}
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
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <!-- Simple Header -->
      <div style="padding: 32px; border-bottom: 1px solid #e2e8f0;">
        <div style="margin-bottom: 16px;">
          <span style="font-size: 24px; font-weight: 700; color: #1e293b;">AI</span>
          <span style="font-size: 24px; font-weight: 700; color: #10b981;">Planet</span>
        </div>
        <h1 style="font-size: 20px; font-weight: 600; color: #1e293b; margin: 0;">Interview Invitation</h1>
      </div>

      <!-- Body -->
      <div style="padding: 32px;">
        <p style="font-size: 15px; color: #1e293b; margin-bottom: 20px;">Dear ${candidate.name},</p>
        <p style="font-size: 14px; color: #475569; line-height: 1.7; margin-bottom: 24px;">
          Congratulations! We would like to invite you for an interview for the <strong>${interview.jobTitle}</strong> position.
        </p>

        <!-- Interview Details -->
        <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <h3 style="font-size: 13px; font-weight: 600; color: #64748b; margin: 0 0 12px; text-transform: uppercase;">Interview Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px; width: 120px;">Type:</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600;">${interview.type}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Date & Time:</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${new Date(interview.scheduledAt).toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Duration:</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${interview.durationMinutes} minutes</td>
            </tr>
            ${interview.location ? `
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Location:</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${interview.location}</td>
            </tr>
            ` : ''}
          </table>
        </div>

        <p style="font-size: 14px; color: #64748b; line-height: 1.7; margin-bottom: 24px;">
          Please confirm your availability by replying to this email.
        </p>

        <p style="font-size: 14px; color: #1e293b; margin-bottom: 4px;">Best regards,</p>
        <p style="font-size: 14px; color: #1e293b; font-weight: 600; margin: 0;">The AI Planet Recruitment Team</p>
      </div>

      ${generateEmailFooter()}
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
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <!-- Simple Header -->
      <div style="padding: 32px; border-bottom: 1px solid #e2e8f0;">
        <div style="margin-bottom: 16px;">
          <span style="font-size: 24px; font-weight: 700; color: #1e293b;">AI</span>
          <span style="font-size: 24px; font-weight: 700; color: #10b981;">Planet</span>
        </div>
        <h1 style="font-size: 20px; font-weight: 600; color: #1e293b; margin: 0;">Interview Scheduled</h1>
      </div>

      <!-- Body -->
      <div style="padding: 32px;">
        <p style="font-size: 15px; color: #1e293b; margin-bottom: 20px;">Dear ${candidateName},</p>
        <p style="font-size: 14px; color: #475569; line-height: 1.7; margin-bottom: 24px;">
          We are pleased to invite you for an interview for the <strong>${jobTitle}</strong> position at AI Planet.
        </p>

        <!-- Interview Details -->
        <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <h3 style="font-size: 13px; font-weight: 600; color: #64748b; margin: 0 0 12px; text-transform: uppercase;">Interview Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px; width: 100px;">Date:</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600;">${displayDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Time:</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${displayTime}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Duration:</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${durationMinutes} minutes</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Type:</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${isOnline ? 'Online' : 'In-Person'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Interviewer:</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${interviewerName}</td>
            </tr>
          </table>

          ${isOnline ? `
          <div style="margin-top: 16px; padding: 12px; background: #eff6ff; border-radius: 6px;">
            <p style="margin: 0 0 4px; font-size: 13px; color: #64748b;">Platform: ${platform}</p>
            <a href="${meetingLink}" style="color: #3b82f6; font-size: 14px; text-decoration: none;">${meetingLink}</a>
          </div>
          ` : `
          <div style="margin-top: 16px; padding: 12px; background: #fef3c7; border-radius: 6px;">
            <p style="margin: 0; font-size: 14px; color: #92400e;"><strong>Address:</strong> ${address}</p>
          </div>
          `}
        </div>

        ${notes ? `
        <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
          <p style="margin: 0 0 8px; font-size: 13px; color: #64748b; font-weight: 600;">Notes:</p>
          <p style="margin: 0; font-size: 14px; color: #1e293b; line-height: 1.6;">${notes}</p>
        </div>
        ` : ''}

        <p style="font-size: 14px; color: #64748b; margin-bottom: 24px;">
          A calendar invite has been attached to this email.
        </p>

        <p style="font-size: 14px; color: #475569; line-height: 1.7; margin-bottom: 24px;">
          We look forward to speaking with you!
        </p>

        <p style="font-size: 14px; color: #1e293b; margin-bottom: 4px;">Best regards,</p>
        <p style="font-size: 14px; color: #1e293b; font-weight: 600; margin: 0;">The AI Planet Recruitment Team</p>
      </div>

      ${generateEmailFooter()}
    </div>
  `;

  try {
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
    notes,
    resumeUrl
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
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <!-- Simple Header -->
      <div style="padding: 32px; border-bottom: 1px solid #e2e8f0;">
        <div style="margin-bottom: 16px;">
          <span style="font-size: 24px; font-weight: 700; color: #1e293b;">AI</span>
          <span style="font-size: 24px; font-weight: 700; color: #10b981;">Planet</span>
        </div>
        <h1 style="font-size: 20px; font-weight: 600; color: #1e293b; margin: 0;">Interview Scheduled</h1>
      </div>

      <!-- Body -->
      <div style="padding: 32px;">
        <p style="font-size: 15px; color: #1e293b; margin-bottom: 20px;">Hi ${interviewerName},</p>
        <p style="font-size: 14px; color: #475569; line-height: 1.7; margin-bottom: 24px;">
          An interview has been scheduled for you with a candidate for the <strong>${jobTitle}</strong> position.
        </p>

        <!-- Candidate Info -->
        <div style="background: #eff6ff; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <h3 style="font-size: 13px; font-weight: 600; color: #64748b; margin: 0 0 8px; text-transform: uppercase;">Candidate</h3>
          <p style="margin: 0; font-size: 15px; font-weight: 600; color: #1e293b;">${candidateName}</p>
          <p style="margin: 4px 0 0; font-size: 14px; color: #64748b;">${candidateEmail}</p>
          ${resumeUrl ? `
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #dbeafe;">
            <a href="${resumeUrl}" style="display: inline-block; padding: 8px 16px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 600;">
              📄 View Resume
            </a>
          </div>
          ` : ''}
        </div>

        <!-- Interview Details -->
        <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <h3 style="font-size: 13px; font-weight: 600; color: #64748b; margin: 0 0 12px; text-transform: uppercase;">Interview Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px; width: 100px;">Date:</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600;">${displayDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Time:</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${displayTime}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Duration:</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${durationMinutes} minutes</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Type:</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${isOnline ? 'Online' : 'In-Person'}</td>
            </tr>
          </table>

          ${isOnline ? `
          <div style="margin-top: 16px; padding: 12px; background: #eff6ff; border-radius: 6px;">
            <p style="margin: 0 0 4px; font-size: 13px; color: #64748b;">Platform: ${platform}</p>
            <a href="${meetingLink}" style="color: #3b82f6; font-size: 14px; text-decoration: none;">${meetingLink}</a>
          </div>
          ` : `
          <div style="margin-top: 16px; padding: 12px; background: #fef3c7; border-radius: 6px;">
            <p style="margin: 0; font-size: 14px; color: #92400e;"><strong>Address:</strong> ${address}</p>
          </div>
          `}
        </div>

        ${notes ? `
        <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
          <p style="margin: 0 0 8px; font-size: 13px; color: #64748b; font-weight: 600;">Notes:</p>
          <p style="margin: 0; font-size: 14px; color: #1e293b; line-height: 1.6;">${notes}</p>
        </div>
        ` : ''}

        <p style="font-size: 14px; color: #64748b; margin-bottom: 24px;">
          A calendar invite has been attached to this email.
        </p>

        <p style="font-size: 14px; color: #1e293b; margin-bottom: 4px;">Best regards,</p>
        <p style="font-size: 14px; color: #1e293b; font-weight: 600; margin: 0;">AI Planet Recruitment System</p>
      </div>

      ${generateEmailFooter()}
    </div>
  `;

  try {
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
  const subject = `Application Update - ${job.title} at AI Planet`;
  const formattedStatus = formatStatus(newStatus);

  const statusMessages = {
    'screening': 'Your application is being reviewed by our recruitment team.',
    'interview': 'Great news! You have been selected for an interview.',
    'offer': 'Congratulations! We would like to extend an offer to you.',
    'hired': 'Welcome to AI Planet! We are excited to have you join our team.',
    'default': 'There has been an update to your application.'
  };

  const message = statusMessages[newStatus] || statusMessages['default'];

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <!-- Simple Header -->
      <div style="padding: 32px; border-bottom: 1px solid #e2e8f0;">
        <div style="margin-bottom: 16px;">
          <span style="font-size: 24px; font-weight: 700; color: #1e293b;">AI</span>
          <span style="font-size: 24px; font-weight: 700; color: #10b981;">Planet</span>
        </div>
        <h1 style="font-size: 20px; font-weight: 600; color: #1e293b; margin: 0;">Application Status Update</h1>
      </div>

      <!-- Body -->
      <div style="padding: 32px;">
        <p style="font-size: 15px; color: #1e293b; margin-bottom: 20px;">Dear ${candidate.name},</p>
        <p style="font-size: 14px; color: #475569; line-height: 1.7; margin-bottom: 24px;">
          ${message}
        </p>

        <!-- Status -->
        <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin-bottom: 24px; text-align: center;">
          <p style="font-size: 12px; color: #64748b; margin: 0 0 8px; text-transform: uppercase;">Current Status</p>
          <p style="font-size: 18px; font-weight: 700; color: #10b981; margin: 0;">${formattedStatus}</p>
        </div>

        <!-- Position Details -->
        <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px; width: 100px;">Position:</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600;">${job.title}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Location:</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${job.location || 'Remote'}</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 14px; color: #64748b; line-height: 1.7; margin-bottom: 24px;">
          If you have any questions, please don't hesitate to reach out.
        </p>

        <p style="font-size: 14px; color: #1e293b; margin-bottom: 4px;">Best regards,</p>
        <p style="font-size: 14px; color: #1e293b; font-weight: 600; margin: 0;">The AI Planet Recruitment Team</p>
      </div>

      ${generateEmailFooter()}
    </div>
  `;

  return sendEmail(candidate.email, subject, html);
}

/**
 * Send rejection email
 * @param {Object} candidate - Candidate details
 * @param {Object} job - Job details
 * @param {string} reason - Optional rejection reason/feedback
 */
async function sendRejection(candidate, job, reason = null) {
  const subject = `Application Update - ${job.title} at AI Planet`;

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <!-- Simple Header -->
      <div style="padding: 32px; border-bottom: 1px solid #e2e8f0;">
        <div style="margin-bottom: 16px;">
          <span style="font-size: 24px; font-weight: 700; color: #1e293b;">AI</span>
          <span style="font-size: 24px; font-weight: 700; color: #10b981;">Planet</span>
        </div>
        <h1 style="font-size: 20px; font-weight: 600; color: #1e293b; margin: 0;">Application Update</h1>
      </div>

      <!-- Body -->
      <div style="padding: 32px;">
        <p style="font-size: 15px; color: #1e293b; margin-bottom: 20px;">Dear ${candidate.name},</p>

        <p style="font-size: 14px; color: #475569; line-height: 1.7; margin-bottom: 16px;">
          Thank you for taking the time to apply for the <strong>${job.title}</strong> position at AI Planet and for your interest in joining our team.
        </p>

        <p style="font-size: 14px; color: #475569; line-height: 1.7; margin-bottom: 24px;">
          After careful consideration of all applications received, we regret to inform you that we have decided to move forward with other candidates whose qualifications more closely align with our current requirements.
        </p>

        <!-- Position Details -->
        <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px; width: 100px;">Position:</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600;">${job.title}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Location:</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${job.location || 'Remote'}</td>
            </tr>
          </table>
        </div>

        ${reason ? `
        <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
          <p style="margin: 0 0 8px; font-size: 13px; color: #92400e; font-weight: 600;">Feedback:</p>
          <p style="margin: 0; font-size: 14px; color: #78350f; line-height: 1.6;">${reason}</p>
        </div>
        ` : ''}

        <p style="font-size: 14px; color: #475569; line-height: 1.7; margin-bottom: 16px;">
          This decision does not reflect on your abilities or potential. We encourage you to keep an eye on our careers page for future opportunities that may be a better fit.
        </p>

        <p style="font-size: 14px; color: #475569; line-height: 1.7; margin-bottom: 24px;">
          We sincerely appreciate the time and effort you invested in your application. We wish you all the best in your career journey.
        </p>

        <p style="font-size: 14px; color: #1e293b; margin-bottom: 4px;">Warm regards,</p>
        <p style="font-size: 14px; color: #1e293b; font-weight: 600; margin: 0;">The AI Planet Recruitment Team</p>
      </div>

      <!-- Footer with careers link -->
      <div style="padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0; background: #f8fafc;">
        <p style="margin: 0 0 12px; font-size: 13px;">
          <a href="https://aiplanet.com/careers" style="color: #10b981; text-decoration: none;">View Current Openings</a>
        </p>
        <p style="margin: 0 0 8px; font-size: 13px; color: #64748b;">AI Planet | Building the Future with AI</p>
        <p style="margin: 0; font-size: 12px; color: #94a3b8;">&copy; ${new Date().getFullYear()} AI Planet. All rights reserved.</p>
      </div>
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
  const subject = `Congratulations! Job Offer - ${offer.jobTitle} at AI Planet`;

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <!-- Simple Header -->
      <div style="padding: 32px; border-bottom: 1px solid #e2e8f0;">
        <div style="margin-bottom: 16px;">
          <span style="font-size: 24px; font-weight: 700; color: #1e293b;">AI</span>
          <span style="font-size: 24px; font-weight: 700; color: #10b981;">Planet</span>
        </div>
        <h1 style="font-size: 20px; font-weight: 600; color: #10b981; margin: 0;">Congratulations!</h1>
      </div>

      <!-- Body -->
      <div style="padding: 32px;">
        <p style="font-size: 15px; color: #1e293b; margin-bottom: 20px;">Dear ${candidate.name},</p>

        <p style="font-size: 14px; color: #475569; line-height: 1.7; margin-bottom: 16px;">
          We are thrilled to inform you that after a thorough evaluation process, you have been selected for the position of <strong>${offer.jobTitle}</strong> at AI Planet!
        </p>

        <p style="font-size: 14px; color: #475569; line-height: 1.7; margin-bottom: 24px;">
          Your skills, experience, and passion for innovation impressed us, and we are confident that you will be a valuable addition to our team.
        </p>

        <!-- Offer Details -->
        <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <h3 style="font-size: 13px; font-weight: 600; color: #166534; margin: 0 0 12px; text-transform: uppercase;">Offer Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px; width: 120px;">Position:</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600;">${offer.jobTitle}</td>
            </tr>
            ${offer.department ? `
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Department:</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${offer.department}</td>
            </tr>
            ` : ''}
            ${offer.location ? `
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Location:</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${offer.location}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Start Date:</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${offer.startDate || 'To be discussed'}</td>
            </tr>
            ${offer.salary ? `
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Compensation:</td>
              <td style="padding: 8px 0; color: #10b981; font-size: 14px; font-weight: 600;">${offer.salary}</td>
            </tr>
            ` : ''}
          </table>
        </div>

        <!-- Next Steps -->
        <div style="margin-bottom: 24px;">
          <h3 style="font-size: 14px; font-weight: 600; color: #1e293b; margin: 0 0 12px;">Next Steps</h3>
          <ol style="margin: 0; padding-left: 20px; color: #475569; font-size: 14px; line-height: 1.8;">
            <li>Review the offer details carefully</li>
            <li>If you have any questions, feel free to reach out</li>
            <li>Confirm your acceptance by replying to this email</li>
            <li>Complete onboarding documentation after acceptance</li>
          </ol>
        </div>

        ${offer.deadline ? `
        <div style="background: #fef3c7; padding: 12px 16px; border-radius: 8px; margin-bottom: 24px;">
          <p style="margin: 0; font-size: 14px; color: #92400e;">
            <strong>Response Deadline:</strong> Please respond by ${offer.deadline}
          </p>
        </div>
        ` : ''}

        <p style="font-size: 14px; color: #475569; line-height: 1.7; margin-bottom: 24px;">
          We are excited about the possibility of you joining our team. If you have any questions, please don't hesitate to reach out.
        </p>

        <p style="font-size: 14px; color: #1e293b; margin-bottom: 4px;">Welcome aboard!</p>
        <p style="font-size: 14px; color: #1e293b; font-weight: 600; margin: 0;">The AI Planet Recruitment Team</p>
      </div>

      ${generateEmailFooter()}
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
    await initTransporter();

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@aiplanet.com',
      to,
      subject,
      html
    });

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
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <!-- Simple Header -->
      <div style="padding: 32px; border-bottom: 1px solid #e2e8f0;">
        <div style="margin-bottom: 16px;">
          <span style="font-size: 24px; font-weight: 700; color: #1e293b;">AI</span>
          <span style="font-size: 24px; font-weight: 700; color: #10b981;">Planet</span>
        </div>
        <h1 style="font-size: 20px; font-weight: 600; color: #1e293b; margin: 0;">Screening Call Scheduled</h1>
      </div>

      <!-- Body -->
      <div style="padding: 32px;">
        <p style="font-size: 15px; color: #1e293b; margin-bottom: 20px;">Dear ${candidateName},</p>
        <p style="font-size: 14px; color: #475569; line-height: 1.7; margin-bottom: 24px;">
          Thank you for your interest in the <strong>${jobTitle}</strong> position at AI Planet.
          We are pleased to invite you for a screening call to discuss your application further.
        </p>

        <!-- Call Details -->
        <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <h3 style="font-size: 13px; font-weight: 600; color: #64748b; margin: 0 0 12px; text-transform: uppercase;">Call Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px; width: 100px;">Date:</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600;">${displayDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Time:</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${displayTime} IST</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Duration:</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${duration} minutes</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Platform:</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${platform}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Interviewer:</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${interviewer}</td>
            </tr>
          </table>
          ${meetingLink ? `
          <div style="margin-top: 16px; padding: 12px; background: #eff6ff; border-radius: 6px;">
            <p style="margin: 0 0 4px; font-size: 13px; color: #64748b;">Meeting Link:</p>
            <a href="${meetingLink}" style="color: #3b82f6; font-size: 14px; text-decoration: none;">${meetingLink}</a>
          </div>
          ` : ''}
        </div>

        ${agenda ? `
        <div style="background: #fff7ed; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
          <p style="margin: 0 0 8px; font-size: 13px; color: #9a3412; font-weight: 600;">Discussion Agenda:</p>
          <p style="margin: 0; font-size: 14px; color: #7c2d12; line-height: 1.6; white-space: pre-wrap;">${agenda}</p>
        </div>
        ` : ''}

        ${meetingLink ? `
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${meetingLink}" style="display: inline-block; padding: 12px 32px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">
            Join Meeting
          </a>
        </div>
        ` : ''}

        <p style="font-size: 14px; color: #64748b; line-height: 1.7; margin-bottom: 16px;">
          Please join the call on time. If you need to reschedule, please reply at least 24 hours before.
        </p>

        <p style="font-size: 14px; color: #64748b; margin-bottom: 24px;">
          A calendar invite has been attached to this email.
        </p>

        <p style="font-size: 14px; color: #1e293b; margin-bottom: 4px;">Best regards,</p>
        <p style="font-size: 14px; color: #1e293b; font-weight: 600; margin: 0;">The AI Planet Recruitment Team</p>
      </div>

      ${generateEmailFooter()}
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
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <!-- Simple Header -->
        <div style="padding: 32px; border-bottom: 1px solid #e2e8f0;">
          <div style="margin-bottom: 16px;">
            <span style="font-size: 24px; font-weight: 700; color: #1e293b;">AI</span>
            <span style="font-size: 24px; font-weight: 700; color: #10b981;">Planet</span>
          </div>
          <h1 style="font-size: 20px; font-weight: 600; color: #1e293b; margin: 0;">Screening Call Scheduled</h1>
        </div>

        <!-- Body -->
        <div style="padding: 32px;">
          <p style="font-size: 15px; color: #1e293b; margin-bottom: 20px;">Hi ${interviewer},</p>
          <p style="font-size: 14px; color: #475569; line-height: 1.7; margin-bottom: 24px;">
            A screening call has been scheduled for you with a candidate for the <strong>${jobTitle}</strong> position.
          </p>

          <!-- Candidate Info -->
          <div style="background: #eff6ff; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <h3 style="font-size: 13px; font-weight: 600; color: #64748b; margin: 0 0 8px; text-transform: uppercase;">Candidate</h3>
            <p style="margin: 0; font-size: 15px; font-weight: 600; color: #1e293b;">${candidateName}</p>
            <p style="margin: 4px 0 0; font-size: 14px; color: #64748b;">${candidateEmail}</p>
          </div>

          <!-- Call Details -->
          <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <h3 style="font-size: 13px; font-weight: 600; color: #64748b; margin: 0 0 12px; text-transform: uppercase;">Call Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px; width: 100px;">Date:</td>
                <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600;">${displayDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Time:</td>
                <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${displayTime} IST</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Duration:</td>
                <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${duration} minutes</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Platform:</td>
                <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${platform}</td>
              </tr>
            </table>
            ${meetingLink ? `
            <div style="margin-top: 16px; padding: 12px; background: #eff6ff; border-radius: 6px;">
              <p style="margin: 0 0 4px; font-size: 13px; color: #64748b;">Meeting Link:</p>
              <a href="${meetingLink}" style="color: #3b82f6; font-size: 14px; text-decoration: none;">${meetingLink}</a>
            </div>
            ` : ''}
          </div>

          <p style="font-size: 14px; color: #64748b; margin-bottom: 24px;">
            A calendar invite has been attached to this email.
          </p>

          <p style="font-size: 14px; color: #1e293b; margin-bottom: 4px;">Best regards,</p>
          <p style="font-size: 14px; color: #1e293b; font-weight: 600; margin: 0;">AI Planet Recruitment System</p>
        </div>

        ${generateEmailFooter()}
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

/**
 * Send assignment email to candidate
 * @param {Object} params - Assignment parameters
 */
async function sendAssignmentEmail(params) {
  const {
    candidateName,
    candidateEmail,
    jobTitle,
    assignmentName,
    instructions,
    customInstructions,
    link,
    files,
    deadlineDate
  } = params;

  // Format deadline for display
  const displayDeadline = new Date(deadlineDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const subject = `Assignment: ${assignmentName} - ${jobTitle} at AI Planet`;
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <!-- Simple Header -->
      <div style="padding: 32px; border-bottom: 1px solid #e2e8f0;">
        <div style="margin-bottom: 16px;">
          <span style="font-size: 24px; font-weight: 700; color: #1e293b;">AI</span>
          <span style="font-size: 24px; font-weight: 700; color: #10b981;">Planet</span>
        </div>
        <h1 style="font-size: 20px; font-weight: 600; color: #1e293b; margin: 0;">Assignment for You</h1>
      </div>

      <!-- Body -->
      <div style="padding: 32px;">
        <p style="font-size: 15px; color: #1e293b; margin-bottom: 20px;">Dear ${candidateName},</p>
        <p style="font-size: 14px; color: #475569; line-height: 1.7; margin-bottom: 24px;">
          As part of the selection process for the <strong>${jobTitle}</strong> position, we would like you to complete the following assignment.
        </p>

        <!-- Assignment Details -->
        <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <h3 style="font-size: 13px; font-weight: 600; color: #64748b; margin: 0 0 12px; text-transform: uppercase;">Assignment Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px; width: 100px;">Name:</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600;">${assignmentName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Deadline:</td>
              <td style="padding: 8px 0; color: #dc2626; font-size: 14px; font-weight: 600;">${displayDeadline}</td>
            </tr>
          </table>
        </div>

        <!-- Instructions -->
        <div style="background: #eff6ff; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <h3 style="font-size: 13px; font-weight: 600; color: #1e40af; margin: 0 0 12px; text-transform: uppercase;">Instructions</h3>
          <div style="font-size: 14px; color: #1e293b; line-height: 1.7; white-space: pre-wrap;">${instructions}</div>
        </div>

        ${customInstructions ? `
        <div style="background: #fff7ed; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <h3 style="font-size: 13px; font-weight: 600; color: #9a3412; margin: 0 0 12px; text-transform: uppercase;">Additional Notes</h3>
          <div style="font-size: 14px; color: #1e293b; line-height: 1.7; white-space: pre-wrap;">${customInstructions}</div>
        </div>
        ` : ''}

        ${link ? `
        <div style="margin-bottom: 24px;">
          <h3 style="font-size: 13px; font-weight: 600; color: #64748b; margin: 0 0 8px; text-transform: uppercase;">Assignment Link</h3>
          <a href="${link}" style="color: #3b82f6; font-size: 14px; text-decoration: none; word-break: break-all;">${link}</a>
        </div>
        ` : ''}

        ${files && files.length > 0 ? `
        <div style="margin-bottom: 24px;">
          <h3 style="font-size: 13px; font-weight: 600; color: #64748b; margin: 0 0 12px; text-transform: uppercase;">Attached Files</h3>
          <ul style="margin: 0; padding-left: 20px; color: #475569; font-size: 14px; line-height: 1.8;">
            ${files.map(f => `<li>${f.url ? `<a href="${f.url}" style="color: #3b82f6; text-decoration: none;">${f.name}</a>` : f.name}</li>`).join('')}
          </ul>
        </div>
        ` : ''}

        <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
          <p style="margin: 0; font-size: 14px; color: #92400e;">
            <strong>Important:</strong> Please submit your completed assignment before the deadline. Late submissions may not be considered.
          </p>
        </div>

        <p style="font-size: 14px; color: #475569; line-height: 1.7; margin-bottom: 24px;">
          If you have any questions, feel free to reply to this email.
        </p>

        <p style="font-size: 14px; color: #1e293b; margin-bottom: 4px;">Best regards,</p>
        <p style="font-size: 14px; color: #1e293b; font-weight: 600; margin: 0;">The AI Planet Recruitment Team</p>
      </div>

      ${generateEmailFooter()}
    </div>
  `;

  return sendEmail(candidateEmail, subject, html);
}

/**
 * Send offer email to candidate with optional PDF/Word attachment
 * @param {Object} params - Offer parameters
 */
async function sendOfferEmail(params) {
  const {
    offerId,
    candidateName,
    candidateEmail,
    jobTitle,
    department,
    location,
    offerType,
    offerContent,
    offerFile,
    salary,
    salaryCurrency,
    bonus,
    equity,
    benefits,
    startDate,
    expiryDate,
    termsAndConditions
  } = params;

  // Base URL for offer response page
  const baseUrl = process.env.BACKEND_URL || 'http://localhost:5001';
  const responseUrl = offerId ? `${baseUrl}/api/offers/respond/${offerId}` : null;

  // Format dates for display
  const displayStartDate = startDate ? new Date(startDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : 'To be discussed';

  const displayExpiryDate = expiryDate ? new Date(expiryDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : null;

  const subject = `Job Offer - ${jobTitle} at AI Planet`;

  // Build offer details section based on offer type
  let offerDetailsHtml = '';

  if (offerType === 'text' && offerContent) {
    // Text-based offer content
    offerDetailsHtml = `
      <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <h3 style="font-size: 13px; font-weight: 600; color: #64748b; margin: 0 0 12px; text-transform: uppercase;">Offer Details</h3>
        <div style="font-size: 14px; color: #1e293b; line-height: 1.7; white-space: pre-wrap;">${offerContent}</div>
      </div>
    `;
  } else {
    // For PDF/Word offers, show summary info
    offerDetailsHtml = `
      <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <h3 style="font-size: 13px; font-weight: 600; color: #64748b; margin: 0 0 12px; text-transform: uppercase;">Position Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px; width: 120px;">Position:</td>
            <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600;">${jobTitle}</td>
          </tr>
          ${department ? `
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Department:</td>
            <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${department}</td>
          </tr>
          ` : ''}
          ${location ? `
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Location:</td>
            <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${location}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Start Date:</td>
            <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${displayStartDate}</td>
          </tr>
        </table>
      </div>
    `;
  }

  // Compensation section
  let compensationHtml = '';
  if (salary || bonus || equity || benefits) {
    compensationHtml = `
      <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <h3 style="font-size: 13px; font-weight: 600; color: #166534; margin: 0 0 12px; text-transform: uppercase;">Compensation Package</h3>
        <table style="width: 100%; border-collapse: collapse;">
          ${salary ? `
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px; width: 120px;">Base Salary:</td>
            <td style="padding: 8px 0; color: #10b981; font-size: 16px; font-weight: 700;">${salary} ${salaryCurrency || 'INR'}</td>
          </tr>
          ` : ''}
          ${bonus ? `
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Bonus:</td>
            <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${bonus}</td>
          </tr>
          ` : ''}
          ${equity ? `
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Equity:</td>
            <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${equity}</td>
          </tr>
          ` : ''}
          ${benefits ? `
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px; vertical-align: top;">Benefits:</td>
            <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${benefits}</td>
          </tr>
          ` : ''}
        </table>
      </div>
    `;
  }

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <!-- Simple Header -->
      <div style="padding: 32px; border-bottom: 1px solid #e2e8f0;">
        <div style="margin-bottom: 16px;">
          <span style="font-size: 24px; font-weight: 700; color: #1e293b;">AI</span>
          <span style="font-size: 24px; font-weight: 700; color: #10b981;">Planet</span>
        </div>
        <h1 style="font-size: 20px; font-weight: 600; color: #10b981; margin: 0;">Congratulations! Job Offer</h1>
      </div>

      <!-- Body -->
      <div style="padding: 32px;">
        <p style="font-size: 15px; color: #1e293b; margin-bottom: 20px;">Dear ${candidateName},</p>

        <p style="font-size: 14px; color: #475569; line-height: 1.7; margin-bottom: 16px;">
          We are thrilled to inform you that after a thorough evaluation process, you have been selected for the position of <strong>${jobTitle}</strong> at AI Planet!
        </p>

        <p style="font-size: 14px; color: #475569; line-height: 1.7; margin-bottom: 24px;">
          Your skills, experience, and passion for innovation impressed us, and we are confident that you will be a valuable addition to our team.
        </p>

        ${offerDetailsHtml}

        ${compensationHtml}

        ${(offerType === 'pdf' || offerType === 'word') && offerFile?.url ? `
        <div style="background: #eff6ff; border-radius: 8px; padding: 20px; margin-bottom: 24px; text-align: center;">
          <p style="margin: 0 0 12px; font-size: 14px; color: #1e40af;">
            Please find the detailed offer letter attached to this email or download it below:
          </p>
          <a href="${offerFile.url}" style="display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">
            Download Offer Letter
          </a>
        </div>
        ` : ''}

        ${termsAndConditions ? `
        <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
          <p style="margin: 0 0 8px; font-size: 13px; color: #64748b; font-weight: 600;">Terms & Conditions:</p>
          <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.6;">${termsAndConditions}</p>
        </div>
        ` : ''}

        ${displayExpiryDate ? `
        <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
          <p style="margin: 0; font-size: 14px; color: #92400e;">
            <strong>Response Deadline:</strong> Please respond by ${displayExpiryDate}
          </p>
        </div>
        ` : ''}

        ${responseUrl ? `
        <!-- Response Buttons -->
        <div style="background: #f0fdf4; border: 2px solid #10b981; border-radius: 12px; padding: 24px; margin-bottom: 24px; text-align: center;">
          <p style="margin: 0 0 16px; font-size: 15px; color: #065f46; font-weight: 600;">Ready to respond?</p>
          <p style="margin: 0 0 20px; font-size: 14px; color: #047857;">Click the button below to accept or decline this offer</p>
          <a href="${responseUrl}" style="display: inline-block; padding: 14px 32px; background: #10b981; color: white; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
            Respond to Offer
          </a>
        </div>
        ` : ''}

        <!-- Next Steps -->
        <div style="margin-bottom: 24px;">
          <h3 style="font-size: 14px; font-weight: 600; color: #1e293b; margin: 0 0 12px;">Next Steps</h3>
          <ol style="margin: 0; padding-left: 20px; color: #475569; font-size: 14px; line-height: 1.8;">
            <li>Review the offer details carefully</li>
            <li>If you have any questions, feel free to reach out</li>
            <li>Click the button above to accept or decline</li>
            <li>Complete onboarding documentation after acceptance</li>
          </ol>
        </div>

        <p style="font-size: 14px; color: #475569; line-height: 1.7; margin-bottom: 24px;">
          We are excited about the possibility of you joining our team. If you have any questions, please don't hesitate to reach out.
        </p>

        <p style="font-size: 14px; color: #1e293b; margin-bottom: 4px;">Welcome aboard!</p>
        <p style="font-size: 14px; color: #1e293b; font-weight: 600; margin: 0;">The AI Planet Recruitment Team</p>
      </div>

      ${generateEmailFooter()}
    </div>
  `;

  try {
    await initTransporter();

    // Prepare email options
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@aiplanet.com',
      to: candidateEmail,
      subject,
      html
    };

    // Add attachment for PDF/Word offers if file URL is provided
    if ((offerType === 'pdf' || offerType === 'word') && offerFile?.url) {
      // For remote URLs, we'll include a link in the email
      // For actual file attachments, you would need to download the file first
      // Here we'll use the URL directly if it's accessible
      mailOptions.attachments = [{
        filename: offerFile.name || `Offer_Letter_${candidateName.replace(/\s+/g, '_')}.${offerType === 'pdf' ? 'pdf' : 'docx'}`,
        path: offerFile.url // nodemailer can fetch from URL
      }];
    }

    const info = await transporter.sendMail(mailOptions);

    if (info.messageId && transporter.options?.host === 'smtp.ethereal.email') {
      console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
    }

    console.log('✅ Offer email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending offer email:', error);
    throw new Error('Failed to send offer email');
  }
}

/**
 * Send offer acceptance confirmation email to candidate
 * @param {Object} params - Confirmation parameters
 */
async function sendOfferAcceptanceConfirmation(params) {
  const {
    candidateName,
    candidateEmail,
    jobTitle,
    startDate
  } = params;

  const displayStartDate = startDate ? new Date(startDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : 'to be confirmed';

  const subject = `Welcome to AI Planet! - Offer Acceptance Confirmed`;

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <!-- Header -->
      <div style="padding: 32px; border-bottom: 1px solid #e2e8f0;">
        <div style="margin-bottom: 16px;">
          <span style="font-size: 24px; font-weight: 700; color: #1e293b;">AI</span>
          <span style="font-size: 24px; font-weight: 700; color: #10b981;">Planet</span>
        </div>
        <h1 style="font-size: 20px; font-weight: 600; color: #10b981; margin: 0;">Welcome to the Team!</h1>
      </div>

      <!-- Body -->
      <div style="padding: 32px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="font-size: 64px; margin-bottom: 16px;">🎉</div>
          <h2 style="color: #1e293b; font-size: 24px; margin: 0 0 8px;">Congratulations, ${candidateName}!</h2>
          <p style="color: #64748b; font-size: 16px; margin: 0;">Your offer acceptance has been confirmed</p>
        </div>

        <p style="font-size: 14px; color: #475569; line-height: 1.7; margin-bottom: 24px;">
          We are thrilled to confirm that you have officially accepted our offer for the position of <strong>${jobTitle}</strong> at AI Planet. We are very excited to have you join our team!
        </p>

        <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <h3 style="font-size: 14px; color: #166534; margin: 0 0 12px;">Your Start Date</h3>
          <p style="font-size: 18px; color: #065f46; font-weight: 600; margin: 0;">${displayStartDate}</p>
        </div>

        <div style="margin-bottom: 24px;">
          <h3 style="font-size: 14px; font-weight: 600; color: #1e293b; margin: 0 0 12px;">What happens next?</h3>
          <ol style="margin: 0; padding-left: 20px; color: #475569; font-size: 14px; line-height: 1.8;">
            <li>Our HR team will reach out within 24-48 hours with onboarding details</li>
            <li>You will receive documentation to complete before your start date</li>
            <li>We'll send you information about your first day and what to expect</li>
            <li>Your IT setup and workspace will be prepared for your arrival</li>
          </ol>
        </div>

        <p style="font-size: 14px; color: #475569; line-height: 1.7; margin-bottom: 24px;">
          If you have any questions in the meantime, please don't hesitate to reach out to us. We're here to help make your transition as smooth as possible.
        </p>

        <p style="font-size: 14px; color: #1e293b; margin-bottom: 4px;">See you soon!</p>
        <p style="font-size: 14px; color: #1e293b; font-weight: 600; margin: 0;">The AI Planet Team</p>
      </div>

      ${generateEmailFooter()}
    </div>
  `;

  return sendEmail(candidateEmail, subject, html);
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
  sendAssignmentEmail,
  sendOfferEmail,
  sendOfferAcceptanceConfirmation,
  sendEmail
};
