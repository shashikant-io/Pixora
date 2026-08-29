const express = require("express");
const multer = require("multer");
const router = express.Router();
const {
  uploadPhoto,
  getPhotosByEvent,
  streamPhoto,
  downloadPhoto,
} = require("../controllers/photoController");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB limit for high-res DSLR photos
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files (JPG, PNG, WEBP) are allowed."));
    }
    cb(null, true);
  },
});

const { requireAdmin, requireCustomerForEvent } = require("../middleware/auth");

router.post("/upload", requireAdmin, upload.single("photo"), uploadPhoto);
router.get("/file/:fileId", streamPhoto);
router.get("/download/:fileId", downloadPhoto);
router.get("/:fileId/image", streamPhoto);
router.get("/:eventId", requireCustomerForEvent, getPhotosByEvent);

module.exports = router;
