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
  storageProvider: {
    type: String,
    default: "s3",
  },
  fileId: {
    type: String,
    required: true,
    index: true,
  },
  imageUrl: {
    type: String,
    required: true,
  },
  thumbnailUrl: {
    type: String,
  },
  downloadUrl: {
    type: String,
  },
  filePath: {
    type: String,
    required: true,
  },
  fileSize: {
    type: Number,
    default: 0,
  },
  mimeType: {
    type: String,
    default: "image/jpeg",
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
