const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const sendEmail = async (to, subject, html) => {
  try {
    console.log(`Attempting to send email to: ${to} with subject: ${subject}`);
    await transporter.sendMail({
      from: `"Aptinova" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`Email sent successfully to: ${to}`);
    return true;
  } catch (error) {
    console.error(`Error sending email to ${to}:`, error);
    return false;
  }
};

const sendOnboardingEmail = async (to, name, orgname, onboardingLink) => {
  const subject = `Welcome to Your New Journey with ${orgname}! 🎉`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
        }
        .header {
          background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%);
          color: white;
          padding: 30px;
          text-align: center;
          border-radius: 10px 10px 0 0;
        }
        .content {
          padding: 30px;
          background: #fff;
          border: 1px solid #e1e1e1;
          border-radius: 0 0 10px 10px;
        }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background: #4F46E5;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          margin: 20px 0;
          font-weight: bold;
        }
        .section {
          margin: 20px 0;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 5px;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>Welcome to ${orgname}! 🎉</h1>
          <p>We're excited to have you on board, ${name}!</p>
        </div>
        <div class="content">
          <p>Congratulations on joining our HR team! We're thrilled to have you as part of our organization.</p>

          <div class="section">
            <h3>🚀 Getting Started</h3>
            <ul>
              <li>Click the button below to set up your account</li>
              <li>Create a strong password</li>
              <li>Complete your profile information</li>
              <li>Explore the HR dashboard</li>
            </ul>
          </div>

          <div class="section">
            <h3>💡 What to Expect</h3>
            <ul>
              <li>Access to our HR management system</li>
              <li>Tools for employee assessment and management</li>
              <li>Analytics and reporting capabilities</li>
              <li>Collaboration features with your HR team</li>
            </ul>
          </div>

          <center>
            <a href="${onboardingLink}" class="button">Complete Your Onboarding</a>
          </center>

          <p><strong>Note:</strong> This link will expire in 24 hours for security purposes.</p>

          <div style="margin-top: 30px; border-top: 1px solid #e1e1e1; padding-top: 20px;">
            <p>Need help? Contact our support team at <a href="mailto:support@aptinova.com">support@aptinova.com</a></p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(to, subject, html);
};

const sendInterviewEmail = async (
  to,
  candidateName,
  summary,
  description,
  startTime,
  endTime,
  meetingLink,
  feedbackUrl,
  interviewers
) => {
  const subject = `Interview Invitation: ${summary}`;

  // Format dates for display
  const formatDate = (date) => {
    return new Date(date).toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formattedStartTime = formatDate(startTime);
  const formattedEndTime = new Date(endTime).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
        }
        .header {
          background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%);
          color: white;
          padding: 30px;
          text-align: center;
          border-radius: 10px 10px 0 0;
        }
        .content {
          padding: 30px;
          background: #fff;
          border: 1px solid #e1e1e1;
          border-radius: 0 0 10px 10px;
        }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background: #4F46E5;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          margin: 20px 0;
          font-weight: bold;
        }
        .section {
          margin: 20px 0;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 5px;
        }
        .interview-details {
          border-left: 4px solid #4F46E5;
          padding-left: 15px;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>Interview Invitation</h1>
          <p>Hello ${candidateName}!</p>
        </div>
        <div class="content">
          <p>You have been invited to an interview for <strong>${summary}</strong>.</p>

          <div class="interview-details">
            <h3>📅 Interview Details</h3>
            <p><strong>Date & Time:</strong> ${formattedStartTime} - ${formattedEndTime}</p>
            <p><strong>Description:</strong> ${
              description || "No additional details provided."
            }</p>
            <p><strong>Interviewers:</strong> ${interviewers.join(", ")}</p>
          </div>

          <div class="section">
            <h3>🔗 How to Join</h3>
            <p>Please click the button below to join the interview at the scheduled time:</p>
            <center>
              <a href="${meetingLink}" class="button">Join Interview</a>
            </center>
            <p>Or copy this link: ${meetingLink}</p>
          </div>

          <div class="section">
            <h3>📝 Preparation Tips</h3>
            <ul>
              <li>Review the job description and your qualifications</li>
              <li>Prepare examples of your relevant experience</li>
              <li>Test your audio/video setup before the interview</li>
              <li>Join 5 minutes early to ensure everything works correctly</li>
            </ul>
          </div>

          <p>If you have any questions or need to reschedule, please contact us as soon as possible.</p>

          <div style="margin-top: 30px; border-top: 1px solid #e1e1e1; padding-top: 20px;">
            <p>Best regards,<br>The Recruitment Team</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(to, subject, html);
};

/**
 * Send interview invitation email to interviewers
 */
const sendInterviewerEmail = async (
  to,
  interviewerName,
  candidateName,
  summary,
  description,
  startTime,
  endTime,
  meetingLink,
  resumelink,
  feedbackUrl,
  jobTitle
) => {
  const subject = `Interview Assignment: ${summary} with ${candidateName}`;

  // Format dates for display
  const formatDate = (date) => {
    return new Date(date).toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formattedStartTime = formatDate(startTime);
  const formattedEndTime = new Date(endTime).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
        }
        .header {
          background: linear-gradient(135deg, #2E3B55 0%, #1A2238 100%);
          color: white;
          padding: 30px;
          text-align: center;
          border-radius: 10px 10px 0 0;
        }
        .content {
          padding: 30px;
          background: #fff;
          border: 1px solid #e1e1e1;
          border-radius: 0 0 10px 10px;
        }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background: #2E3B55;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          margin: 20px 0;
          font-weight: bold;
        }
        .section {
          margin: 20px 0;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 5px;
        }
        .interview-details {
          border-left: 4px solid #2E3B55;
          padding-left: 15px;
          margin: 20px 0;
        }
        .feedback-link {
          margin-top: 15px;
          padding: 20px;
          background-color: #FFF9C4;
          border-radius: 5px;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>Interview Assignment</h1>
          <p>Hello ${interviewerName}!</p>
        </div>
        <div class="content">
          <p>You have been assigned to conduct an interview for the position of <strong>${jobTitle}</strong>.</p>

          <div class="interview-details">
            <h3>📋 Interview Information</h3>
            <p><strong>Candidate:</strong> ${candidateName}</p>
            <p><strong>Interview Type:</strong> ${summary}</p>
            <p><strong>Date & Time:</strong> ${formattedStartTime} - ${formattedEndTime}</p>
            <p><strong>Notes:</strong> ${
              description || "No additional notes provided."
            }</p>
          </div>
          
          <div class="section">
            <h3>📄 Candidate Resume</h3>
            <p>Please review the candidate's resume before the interview:</p>
            <center>
              <a href="${resumelink}" class="button" style="background-color: #4CAF50;">View Resume</a>
            </center>
          </div>

          <div class="section">
            <h3>🔗 Meeting Access</h3>
            <p>Please click the button below to join the interview at the scheduled time:</p>
            <center>
              <a href="${meetingLink}" class="button">Join Meeting</a>
            </center>
            <p>Or copy this link: ${meetingLink}</p>
          </div>

          <div class="feedback-link">
            <h3>⭐ Provide Feedback After Interview</h3>
            <p>Please submit your assessment within 30 minutes after the interview completes:</p>
            <center>
              <a href="${feedbackUrl}" class="button" style="background-color: #FF9800;">Submit Feedback</a>
            </center>
          </div>

          <div class="section">
            <h3>🔍 Interviewer Guidelines</h3>
            <ul>
              <li>Review the candidate's resume and application before the interview</li>
              <li>Prepare relevant technical and behavioral questions</li>
              <li>Allocate time for the candidate's questions</li>
              <li>Be punctual and maintain professional conduct</li>
              <li>Complete your assessment promptly after the interview</li>
            </ul>
          </div>

          <p>If you have scheduling conflicts or need to discuss this assignment, please inform the HR team immediately.</p>

          <div style="margin-top: 30px; border-top: 1px solid #e1e1e1; padding-top: 20px;">
            <p>Thank you for your contribution to our hiring process,<br>HR Department</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(to, subject, html);
};

module.exports = {
  sendEmail,
  sendOnboardingEmail,
  sendInterviewEmail,
  sendInterviewerEmail,
};
