const nodemailer = require('nodemailer');
const crypto = require('crypto');

const sendVerificationCode = async (email) => {
    // Generate a random 6-digit number
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
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
                }
                .container {
                    background-color: #ffffff;
                    border-radius: 10px;
                    box-shadow: 0 0 20px rgba(0,0,0,0.1);
                    padding: 30px;
                    text-align: center;
                }
                .logo {
                    margin-bottom: 20px;
                }
                .code {
                    font-size: 36px;
                    font-weight: bold;
                    color: #4a90e2;
                    letter-spacing: 8px;
                    padding: 20px;
                    background-color: #f5f8ff;
                    border-radius: 5px;
                    margin: 20px 0;
                    font-family: monospace;
                }
                .note {
                    color: #666;
                    font-size: 14px;
                    margin-top: 20px;
                }
                .footer {
                    margin-top: 30px;
                    font-size: 12px;
                    color: #999;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="logo">
                    <img src="${process.env.COMPANY_LOGO_URL || 'https://your-logo-url.com'}" alt="Company Logo" height="50">
                </div>
                <h2>Verify Your Email Address</h2>
                <p>Please use the verification code below to complete your verification:</p>
                <div class="code">${code}</div>
                <p class="note">This code will expire in 5 minutes for security reasons.</p>
                <div class="footer">
                    If you didn't request this code, please ignore this email.
                    <br>© ${new Date().getFullYear()} Your Company Name. All rights reserved.
                </div>
            </div>
        </body>
        </html>
    `;

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Your Verification Code',
        html: htmlTemplate,
        text: `Your verification code is: ${code}` // Fallback plain text
    };

    await transporter.sendMail(mailOptions);
    return code;
};

module.exports = sendVerificationCode;
