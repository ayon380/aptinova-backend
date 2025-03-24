const nodemailer = require("nodemailer");

const sendPasswordResetEmail = async (email, resetLink) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const mailOptions = {
    from: `"Aptinova" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Reset Your Password - Aptinova",
    html: `
      <h1>Reset Your Password</h1>
      <p>You have requested to reset your password. Click the link below to set a new password:</p>
      <a href="${resetLink}">Reset Password</a>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `,
  };

  return transporter.sendMail(mailOptions);
};

module.exports = sendPasswordResetEmail;
