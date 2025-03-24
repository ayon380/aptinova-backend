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
    await transporter.sendMail({
      from: `"Aptinova" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log("Assessment invitation email sent successfully");
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
};

const sendOnboardingEmail = async (to, name, orgname , onboardingLink) => {
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

module.exports = { sendEmail, sendOnboardingEmail };
