const nodemailer = require("nodemailer");
const crypto = require("crypto");

const sendVerificationCode = async (email) => {
  // Generate a random 6-digit number
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const htmlTemplate = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f5f7fa;
                }
                .container {
                    background-color: #ffffff;
                    border-radius: 12px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.08);
                    padding: 35px;
                    text-align: center;
                }
                .logo {
                    margin-bottom: 25px;
                    display: inline-block;
                }
                .logo-circle {
                    height: 80px;
                    width: 80px;
                    border-radius: 16px;
                    background-color: #4a6cf7;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto;
                    position: relative;
                    overflow: hidden;
                }
                .logo-letter {
                    color: white;
                    font-size: 48px;
                    font-weight: bold;
                    position: relative;
                    z-index: 10;
                }
                .logo-gradient {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(135deg, #4a6cf7, #4a6cf7, #6e48aa);
                    opacity: 0;
                    transition: opacity 0.5s;
                }
                .logo-circle:hover .logo-gradient {
                    opacity: 1;
                }
                .title {
                    color: #222;
                    font-size: 24px;
                    font-weight: 600;
                    margin: 25px 0 15px;
                }
                .subtitle {
                    color: #555;
                    font-size: 16px;
                    margin-bottom: 25px;
                }
                .code-container {
                    margin: 30px 0;
                    padding: 5px;
                    background-color: #f8faff;
                    border-radius: 8px;
                    border: 1px dashed #d0d9f2;
                }
                .code {
                    font-size: 42px;
                    font-weight: bold;
                    color: #4a6cf7;
                    letter-spacing: 8px;
                    padding: 15px;
                    background-color: #f8faff;
                    border-radius: 5px;
                    margin: 0;
                    font-family: monospace;
                }
                .instructions {
                    margin: 20px 0;
                    padding: 15px;
                    background-color: #f0f7ff;
                    border-radius: 8px;
                    color: #444;
                    font-size: 14px;
                    text-align: left;
                }
                .note {
                    color: #666;
                    font-size: 14px;
                    margin-top: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .note:before {
                    content: "⏱️";
                    margin-right: 8px;
                }
                .footer {
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #eee;
                    font-size: 12px;
                    color: #999;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="logo">
                    <div class="logo-circle">
                        <span class="logo-letter">A</span>
                        <div class="logo-gradient"></div>
                    </div>
                </div>
                <h1 class="title">Verify Your Email Address</h1>
                <p class="subtitle">To continue your account setup, please enter the verification code below</p>
                
                <div class="code-container">
                    <div class="code">${code}</div>
                </div>
                
                <div class="instructions">
                    <strong>How to use this code:</strong>
                    <ol style="padding-left: 20px; margin-top: 10px;">
                        <li>Copy the 6-digit code shown above</li>
                        <li>Return to the Aptinova app or website</li>
                        <li>Paste or enter the code in the verification field</li>
                    </ol>
                </div>
                
                <p class="note">This code will expire in 5 minutes for security reasons.</p>
                
                <div class="footer">
                    If you didn't request this code, please ignore this email.
                   Aptinova. All rights reserved.
                </div>
            </div>
        </body>
        </html>
    `;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your Verification Code",
    html: htmlTemplate,
    text: `Your verification code is: ${code}`, // Fallback plain text
  };

  await transporter.sendMail(mailOptions);
  return code;
};

module.exports = sendVerificationCode;
