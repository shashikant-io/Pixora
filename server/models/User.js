const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  role: {
    type: String,
    enum: ["admin", "customer"],
    required: true,
  },
  firebaseUid: {
    type: String,
    default: null,
  },
  name: {
    type: String,
    default: null,
  },
  picture: {
    type: String,
    default: null,
  },
  lastLoginAt: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("User", userSchema);
