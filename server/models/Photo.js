const mongoose = require("mongoose");

const faceSchema = new mongoose.Schema(
  {
    embedding: {
      type: [Number],
      required: true,
    },
    boundingBox: {
      x: Number,
      y: Number,
      width: Number,
      height: Number,
    },
  },
  { _id: false }
);

const photoSchema = new mongoose.Schema({
  eventId: {
    type: String,
    required: true,
    index: true,
  },
  imageKitFileId: {
    type: String,
    required: true,
  },
  imageUrl: {
    type: String,
    required: true,
  },
  filePath: {
    type: String,
    required: true,
  },
  faces: {
    type: [faceSchema],
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Photo", photoSchema);
