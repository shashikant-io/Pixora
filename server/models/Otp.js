const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  otpHash: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["admin", "customer"],
    required: true,
  },
  eventId: {
    type: String,
    default: null,
    trim: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }, // MongoDB automatic TTL deletion upon expiry
  },
  attempts: {
    type: Number,
    default: 0,
  },
  used: {
    type: Boolean,
    default: false,
  },
  lastSentAt: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Otp", otpSchema);
