const express = require("express");
const multer = require("multer");
const router = express.Router();
const {
  uploadPhoto,
  getUploadUrl,
  confirmUpload,
  getPhotosByEvent,
  streamPhoto,
  downloadPhoto,
} = require("../controllers/photoController");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB limit for high-res DSLR photos
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files (JPG, PNG, WEBP) are allowed."));
    }
    cb(null, true);
  },
});

const { requireAdmin, requireCustomerForEvent } = require("../middleware/auth");

// Direct S3 Presigned Upload Pipeline (Bypasses serverless body limits for 25MB+ files)
router.post("/get-upload-url", requireAdmin, getUploadUrl);
router.post("/confirm-upload", requireAdmin, confirmUpload);

// Standard Multipart Upload
router.post("/upload", requireAdmin, upload.single("photo"), uploadPhoto);
router.get("/file/:fileId", streamPhoto);
router.get("/download/:fileId", downloadPhoto);
router.get("/:fileId/image", streamPhoto);
router.get("/:eventId", requireCustomerForEvent, getPhotosByEvent);

module.exports = router;
