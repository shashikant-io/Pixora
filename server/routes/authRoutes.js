const express = require("express");
const router = express.Router();
const {
  login,
  sendAdminOtp,
  verifyAdminOtp,
  sendCustomerOtp,
  verifyCustomerOtp,
  googleCustomerLogin,
  getFirebaseConfig,
  getMe,
  logout,
} = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");

// Public Firebase config
router.get("/firebase-config", getFirebaseConfig);

// Password / master key login
router.post("/login", login);

// Admin OTP endpoints
router.post("/admin/send-otp", sendAdminOtp);
router.post("/admin/verify-otp", verifyAdminOtp);

// Customer Google Sign-In endpoint
router.post("/customer/google-login", googleCustomerLogin);

// Customer OTP endpoints (legacy support)
router.post("/customer/send-otp", sendCustomerOtp);
router.post("/customer/verify-otp", verifyCustomerOtp);

// Session endpoints
router.get("/me", authenticate, getMe);
router.post("/logout", logout);

module.exports = router;
