const nodemailer = require("nodemailer");
const path = require("path");
const dotenv = require("dotenv");

function getTransporter() {
  // Reload .env to pick up any changes immediately
  dotenv.config({ path: path.join(__dirname, "../.env"), override: true });

  const user = (process.env.EMAIL_USER || "").trim();
  const pass = (process.env.EMAIL_PASS || "").replace(/\s+/g, "").trim();

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user,
      pass,
    },
  });
}

/**
 * Safely tests the Gmail SMTP connection without printing or exposing credentials
 */
async function verifySmtpConnection() {
  try {
    const transporter = getTransporter();
    await transporter.verify();
    return { success: true, message: "Gmail SMTP connection verified successfully." };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Sends a 6-digit OTP passcode to the recipient (Admin or Customer)
 */
async function sendOtpEmail(toEmail, otpCode, options = {}) {
  const mailer = getTransporter();
  const fromUser = process.env.EMAIL_USER || "noreply@pixora.ai";
  const role = options.role || "customer";
  const eventName = options.eventName || "Wedding Event";

  const isAdmin = role === "admin";
  const emailTitle = isAdmin ? "Photographer Admin Sign In" : `Find Your Photos — ${eventName}`;
  const subject = isAdmin
    ? ` Pixora Admin Code: ${otpCode}`
    : ` Your Pixora Event Code: ${otpCode}`;

  const messageText = isAdmin
    ? "You requested access to your Pixora Photographer Dashboard. Enter the one-time passcode below to verify your session:"
    : `You requested access to view and find your photos from <strong>${eventName}</strong>. Enter the one-time passcode below to start finding yourself in the photos:`;

  const mailOptions = {
    from: `"Pixora" <${fromUser}>`,
    to: toEmail,
    subject,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { margin: 0; padding: 0; background-color: #09090B; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #FAFAFA; }
          .container { max-width: 500px; margin: 40px auto; background: #18181B; border: 1px solid #27272A; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
          .header { background: linear-gradient(135deg, #18181B 0%, #27272A 100%); padding: 32px 24px; text-align: center; border-bottom: 1px solid #3F3F46; }
          .brand-title { font-size: 20px; font-weight: 700; color: #FFFFFF; letter-spacing: 0.5px; margin-top: 8px; }
          .content { padding: 32px 28px; text-align: center; }
          .title { font-size: 18px; font-weight: 600; color: #E4E4E7; margin-bottom: 12px; }
          .desc { font-size: 14px; color: #A1A1AA; line-height: 1.5; margin-bottom: 24px; }
          .otp-badge { display: inline-block; background: #27272A; border: 2px solid #52525B; border-radius: 12px; padding: 14px 28px; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #FFFFFF; text-shadow: 0 0 12px rgba(255,255,255,0.2); }
          .expiry { font-size: 13px; color: #F59E0B; margin-top: 20px; font-weight: 500; }
          .footer { background: #121215; padding: 20px; text-align: center; font-size: 12px; color: #71717A; border-top: 1px solid #27272A; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div style="font-size: 28px;">📸</div>
            <div class="brand-title">Pixora</div>
          </div>
          <div class="content">
            <div class="title">${emailTitle}</div>
            <p class="desc">${messageText}</p>
            <div class="otp-badge">${otpCode}</div>
            <p class="expiry">⏱ Valid for 5 minutes • Single-use only</p>
            <p style="font-size: 12px; color: #71717A; margin-top: 24px;">If you did not request this login code, you can safely ignore this email.</p>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} Pixora Platform. Buffalo AI Face Recognition.
          </div>
        </div>
      </body>
      </html>
    `,
  };

  return mailer.sendMail(mailOptions);
}

module.exports = {
  sendOtpEmail,
  getTransporter,
  verifySmtpConnection,
};

