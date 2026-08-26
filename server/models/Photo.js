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
    default: "imagekit",
  },
  fileId: {
    type: String,
    index: true,
  },
  // Backward compatibility alias for existing records
  imageKitFileId: {
    type: String,
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

// Getter fallback: if fileId is requested, return fileId or legacy imageKitFileId
photoSchema.virtual("effectiveFileId").get(function () {
  return this.fileId || this.imageKitFileId;
});

// Pre-save hook to ensure fileId is populated if legacy imageKitFileId was provided
photoSchema.pre("save", function (next) {
  if (!this.fileId && this.imageKitFileId) {
    this.fileId = this.imageKitFileId;
  }
  next();
});

module.exports = mongoose.model("Photo", photoSchema);
