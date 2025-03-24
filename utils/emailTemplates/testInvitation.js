const createTestInvitationEmail = (candidateName, jobTitle, testLink) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        .email-container {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          max-width: 600px;
          margin: 0 auto;
          padding: 0;
          background-color: #ffffff;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
          color: white;
          padding: 40px 20px;
          text-align: center;
          border-radius: 12px 12px 0 0;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
          letter-spacing: -0.5px;
        }
        .content {
          padding: 40px 30px;
          line-height: 1.7;
          color: #374151;
        }
        .button-container {
          text-align: center;
          padding: 30px 0;
        }
        .button {
          display: inline-block;
          padding: 14px 32px;
          background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
          color: white;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          transition: transform 0.2s;
          box-shadow: 0 4px 6px rgba(79, 70, 229, 0.3);
        }
        .button:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 8px rgba(79, 70, 229, 0.4);
        }
        .info-box {
          background-color: #F3F4F6;
          border-radius: 8px;
          padding: 20px 25px;
          margin: 30px 0;
        }
        .info-box h3 {
          margin: 0 0 15px 0;
          color: #4F46E5;
          font-size: 18px;
        }
        .info-list {
          margin: 0;
          padding-left: 20px;
        }
        .info-list li {
          margin-bottom: 10px;
          color: #4B5563;
        }
        .info-list li:last-child {
          margin-bottom: 0;
        }
        .highlight {
          color: #4F46E5;
          font-weight: 600;
        }
        .footer {
          text-align: center;
          color: #6B7280;
          font-size: 13px;
          padding: 20px;
          border-top: 1px solid #E5E7EB;
          margin-top: 20px;
        }
        .logo {
          margin-bottom: 20px;
        }
        .company-name {
          font-size: 14px;
          color: #D1D5DB;
          margin-top: 5px;
        }
      </style>
    </head>
    <body style="background-color: #F3F4F6; padding: 20px;">
      <div class="email-container">
        <div class="header">
          <div class="logo">
            <!-- You can add your company logo here -->
            🎯
          </div>
          <h1>Your Assessment Invitation</h1>
          <div class="company-name">Aptinova Recruitment</div>
        </div>
        <div class="content">
          <p>Hello ${candidateName},</p>
          <p>Great news! Your application for the position of <span class="highlight">${jobTitle}</span> has progressed to the next stage.</p>
          
          <p>We're excited to invite you to complete our online assessment, which is a crucial step in our selection process.</p>

          <div class="button-container">
            <a href="${testLink}" class="button">
              Start Your Assessment →
            </a>
          </div>

          <div class="info-box">
            <h3>📝 Important Information</h3>
            <ul class="info-list">
              <li><strong>Time:</strong> Set aside approximately 45-60 minutes</li>
              <li><strong>Environment:</strong> Find a quiet, distraction-free space</li>
              <li><strong>Requirements:</strong> Stable internet connection</li>
              <li><strong>Browser:</strong> Use Chrome or Firefox for best experience</li>
            </ul>
          </div>

          <p>Best of luck with your assessment! We're looking forward to seeing your results.</p>
          
          <p>Best regards,<br>The Recruitment Team</p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>© ${new Date().getFullYear()} Aptinova. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

module.exports = createTestInvitationEmail;
