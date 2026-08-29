const crypto = require("crypto");
const path = require("path");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const Otp = require("../models/Otp");
const User = require("../models/User");
const Event = require("../models/Event");
const { sendOtpEmail } = require("../services/emailService");
const {
  createOrGetFirebaseSession,
  verifyFirebaseIdToken,
} = require("../services/firebaseService");

function getAdminAllowlist() {
  dotenv.config({ path: path.join(__dirname, "../.env"), override: true });
  const rawList = `${process.env.ADMIN_EMAILS || ""},${process.env.EMAIL_USER || ""}`;
  return Array.from(
    new Set(
      rawList
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

function hashOtp(code) {
  return crypto.createHash("sha256").update(code.toString().trim()).digest("hex");
}

/**
 * POST /api/auth/admin/send-otp
 */
async function sendAdminOtp(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Admin email address is required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const allowlist = getAdminAllowlist();

    // Enforce Admin Email Security
    const isAuthorized = allowlist.includes(normalizedEmail);
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized. This email address is not registered in the administrator allowlist.",
      });
    }

    // Check 60-second cooldown
    const recentOtp = await Otp.findOne({
      email: normalizedEmail,
      role: "admin",
      used: false,
      lastSentAt: { $gt: new Date(Date.now() - 60 * 1000) },
    });

    if (recentOtp) {
      const remainingSecs = Math.ceil((recentOtp.lastSentAt.getTime() + 60000 - Date.now()) / 1000);
      return res.status(429).json({
        success: false,
        message: `Please wait ${remainingSecs} seconds before requesting a new verification code.`,
        cooldownRemainingSeconds: remainingSecs,
      });
    }

    // Invalidate previous OTPs
    await Otp.updateMany({ email: normalizedEmail, role: "admin", used: false }, { used: true });

    // Generate secure 6-digit OTP
    const rawOtp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = hashOtp(rawOtp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await Otp.create({
      email: normalizedEmail,
      otpHash,
      role: "admin",
      expiresAt,
      attempts: 0,
      used: false,
      lastSentAt: new Date(),
    });

    // Send email via Gmail SMTP
    try {
      await sendOtpEmail(normalizedEmail, rawOtp, { role: "admin" });
      return res.json({
        success: true,
        message: "Verification code sent to your email.",
      });
    } catch (mailErr) {
      console.error("[Admin Auth] SMTP Error sending OTP:", mailErr.message);
      return res.status(500).json({
        success: false,
        message: `Failed to deliver verification email via Gmail SMTP (${mailErr.message}). Please ensure your Gmail App Password is configured.`,
      });
    }
  } catch (err) {
    console.error("[Admin Auth] sendAdminOtp error:", err);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while sending verification code.",
    });
  }
}

/**
 * POST /api/auth/admin/verify-otp
 */
async function verifyAdminOtp(req, res) {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and 6-digit verification code are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const inputOtp = otp.toString().trim();

    const otpDoc = await Otp.findOne({
      email: normalizedEmail,
      role: "admin",
      used: false,
    }).sort({ createdAt: -1 });

    if (!otpDoc || otpDoc.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Verification code has expired or was not requested. Please request a new code.",
      });
    }

    // Check maximum 5 verification attempts
    otpDoc.attempts += 1;

    if (otpDoc.attempts > 5) {
      otpDoc.used = true;
      await otpDoc.save();
      return res.status(400).json({
        success: false,
        message: "Maximum verification attempts exceeded (5/5). This code has been invalidated. Please request a new code.",
      });
    }

    const inputHash = hashOtp(inputOtp);
    if (inputHash !== otpDoc.otpHash) {
      await otpDoc.save();
      const remainingAttempts = 5 - otpDoc.attempts;
      return res.status(400).json({
        success: false,
        message: `Invalid verification code. ${remainingAttempts} attempts remaining.`,
      });
    }

    // Mark as used
    otpDoc.used = true;
    await otpDoc.save();

    // Sync persistent User record
    await User.findOneAndUpdate(
      { email: normalizedEmail },
      { role: "admin", lastLoginAt: new Date() },
      { upsert: true, new: true }
    );

    // Create Firebase & Server session
    const session = await createOrGetFirebaseSession(normalizedEmail, "admin");

    return res.json({
      success: true,
      message: "Authentication successful.",
      token: session.sessionToken,
      customToken: session.customToken,
      user: {
        email: normalizedEmail,
        role: "admin",
        name: process.env.ADMIN_NAME || "Photographer Admin",
      },
    });
  } catch (err) {
    console.error("[Admin Auth] verifyAdminOtp error:", err);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred during verification.",
    });
  }
}

/**
 * POST /api/auth/customer/send-otp
 */
async function sendCustomerOtp(req, res) {
  try {
    const { email, eventToken, eventId } = req.body;
    const targetEventId = (eventToken || eventId || "").trim();

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email address is required.",
      });
    }

    if (!targetEventId) {
      return res.status(400).json({
        success: false,
        message: "Valid event QR / event code is required for guest verification.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Verify event exists
    const event = await Event.findOne({ eventId: targetEventId });
    if (!event) {
      return res.status(404).json({
        success: false,
        message: `Event "${targetEventId}" not found. Please scan a valid wedding QR code.`,
      });
    }

    // Check 60-second cooldown
    const recentOtp = await Otp.findOne({
      email: normalizedEmail,
      role: "customer",
      used: false,
      lastSentAt: { $gt: new Date(Date.now() - 60 * 1000) },
    });

    if (recentOtp) {
      const remainingSecs = Math.ceil((recentOtp.lastSentAt.getTime() + 60000 - Date.now()) / 1000);
      return res.status(429).json({
        success: false,
        message: `Please wait ${remainingSecs} seconds before requesting a new verification code.`,
        cooldownRemainingSeconds: remainingSecs,
      });
    }

    // Invalidate previous customer OTPs for this email
    await Otp.updateMany({ email: normalizedEmail, role: "customer", used: false }, { used: true });

    // Generate secure 6-digit OTP
    const rawOtp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = hashOtp(rawOtp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await Otp.create({
      email: normalizedEmail,
      otpHash,
      role: "customer",
      eventId: targetEventId,
      expiresAt,
      attempts: 0,
      used: false,
      lastSentAt: new Date(),
    });

    // Send email via Gmail SMTP
    try {
      await sendOtpEmail(normalizedEmail, rawOtp, {
        role: "customer",
        eventName: event.name,
      });
      return res.json({
        success: true,
        message: "Verification code sent to your email.",
      });
    } catch (mailErr) {
      console.error("[Customer Auth] SMTP Error sending OTP:", mailErr.message);
      return res.status(500).json({
        success: false,
        message: `Failed to deliver verification email via Gmail SMTP (${mailErr.message}).`,
      });
    }
  } catch (err) {
    console.error("[Customer Auth] sendCustomerOtp error:", err);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while sending verification code.",
    });
  }
}

/**
 * POST /api/auth/customer/verify-otp
 */
async function verifyCustomerOtp(req, res) {
  try {
    const { email, otp, eventToken, eventId } = req.body;
    const targetEventId = (eventToken || eventId || "").trim();

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and 6-digit verification code are required.",
      });
    }

    if (!targetEventId) {
      return res.status(400).json({
        success: false,
        message: "Event code is required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const inputOtp = otp.toString().trim();

    const otpDoc = await Otp.findOne({
      email: normalizedEmail,
      role: "customer",
      eventId: targetEventId,
      used: false,
    }).sort({ createdAt: -1 });

    if (!otpDoc || otpDoc.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Verification code has expired or was not requested for this event. Please request a new code.",
      });
    }

    // Check maximum 5 attempts
    otpDoc.attempts += 1;

    if (otpDoc.attempts > 5) {
      otpDoc.used = true;
      await otpDoc.save();
      return res.status(400).json({
        success: false,
        message: "Maximum verification attempts exceeded (5/5). This code has been invalidated. Please request a new code.",
      });
    }

    const inputHash = hashOtp(inputOtp);
    if (inputHash !== otpDoc.otpHash) {
      await otpDoc.save();
      const remainingAttempts = 5 - otpDoc.attempts;
      return res.status(400).json({
        success: false,
        message: `Invalid verification code. ${remainingAttempts} attempts remaining.`,
      });
    }

    // Mark as used
    otpDoc.used = true;
    await otpDoc.save();

    // Sync persistent User record
    await User.findOneAndUpdate(
      { email: normalizedEmail },
      { role: "customer", lastLoginAt: new Date() },
      { upsert: true, new: true }
    );

    // Create Firebase & Server session scoped exclusively to this eventId
    const session = await createOrGetFirebaseSession(normalizedEmail, "customer", {
      eventId: targetEventId,
    });

    return res.json({
      success: true,
      message: "Verification successful.",
      token: session.sessionToken,
      customToken: session.customToken,
      user: {
        email: normalizedEmail,
        role: "customer",
        eventId: targetEventId,
      },
    });
  } catch (err) {
    console.error("[Customer Auth] verifyCustomerOtp error:", err);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred during customer verification.",
    });
  }
}

/**
 * POST /api/auth/customer/google-login
 * Verifies Firebase Google ID token and validates event access token
 */
async function googleCustomerLogin(req, res) {
  try {
    const { idToken, token, eventToken, eventId } = req.body;
    const targetToken = (token || eventToken || eventId || "").trim();

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: "Google sign-in token is required.",
      });
    }

    if (!targetToken) {
      return res.status(400).json({
        success: false,
        message: "Event access token or code is required.",
      });
    }

    // 1. Verify Google ID token via Firebase Admin SDK
    const fbResult = await verifyFirebaseIdToken(idToken);
    if (!fbResult.success || !fbResult.email) {
      return res.status(401).json({
        success: false,
        message: "Google sign-in failed. Please try again.",
      });
    }

    // 2. Validate Event Token in database
    const event = await Event.findOne({
      $or: [{ accessToken: targetToken }, { eventId: targetToken }],
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "This event link is invalid or no longer available.",
      });
    }

    const email = fbResult.email.toLowerCase().trim();
    const name = fbResult.name || email.split("@")[0];
    const picture = fbResult.picture || null;
    const firebaseUid = fbResult.uid || `google_${Buffer.from(email).toString("hex").slice(0, 16)}`;

    // 3. Upsert User record in MongoDB
    await User.findOneAndUpdate(
      { email },
      {
        email,
        role: "customer",
        firebaseUid,
        name,
        picture,
        lastLoginAt: new Date(),
      },
      { upsert: true, new: true }
    );

    // 4. Mint scoped session token
    const jwtSecret = process.env.JWT_SECRET || "photo_finder_jwt_secret_key_2026_luxury_secure";
    const sessionPayload = {
      uid: firebaseUid,
      email,
      name,
      picture,
      role: "customer",
      eventId: event.eventId,
      token: event.accessToken || event.eventId,
    };

    const sessionToken = jwt.sign(sessionPayload, jwtSecret, { expiresIn: "7d" });

    return res.json({
      success: true,
      message: "Signed in with Google successfully.",
      token: sessionToken,
      user: {
        email,
        name,
        picture,
        role: "customer",
        eventId: event.eventId,
        eventName: event.name,
      },
      event: {
        eventId: event.eventId,
        name: event.name,
        date: event.date,
        location: event.location,
      },
    });
  } catch (err) {
    console.error("[Customer Google Auth] error:", err);
    return res.status(500).json({
      success: false,
      message: "An error occurred during Google sign-in. Please try again.",
    });
  }
}

/**
 * GET /api/auth/firebase-config
 * Public Firebase Web App client configuration for frontend SDK
 */
async function getFirebaseConfig(req, res) {
  dotenv.config({ path: path.join(__dirname, "../.env"), override: true });
  const projectId = process.env.FIREBASE_PROJECT_ID || "photo-finder-42151";
  const apiKey = process.env.FIREBASE_API_KEY || "";
  const authDomain = process.env.FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`;
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`;
  const appId = process.env.FIREBASE_APP_ID || "";
  const messagingSenderId = process.env.FIREBASE_MESSAGING_SENDER_ID || "";
  const measurementId = process.env.FIREBASE_MEASUREMENT_ID || "";

  return res.json({
    success: true,
    config: {
      apiKey,
      authDomain,
      projectId,
      storageBucket,
      messagingSenderId,
      appId,
      measurementId,
    },
  });
}



/**
 * GET /api/auth/me
 */
async function getMe(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated.",
      });
    }

    return res.json({
      success: true,
      user: req.user,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve user profile.",
    });
  }
}

/**
 * POST /api/auth/logout
 */
async function logout(req, res) {
  return res.json({
    success: true,
    message: "Logged out successfully.",
  });
}

module.exports = {
  sendAdminOtp,
  verifyAdminOtp,
  sendCustomerOtp,
  verifyCustomerOtp,
  googleCustomerLogin,
  getFirebaseConfig,
  getMe,
  logout,
};

