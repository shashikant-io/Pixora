const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
  eventId: {
    type: String,
    required: true,
    unique: true,
  },
  accessToken: {
    type: String,
    unique: true,
    sparse: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  date: {
    type: Date,
    required: true,
  },
  location: {
    type: String,
    required: true,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Event", eventSchema);
