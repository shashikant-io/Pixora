const express = require("express");
const multer = require("multer");
const router = express.Router();
const { uploadPhoto, getPhotosByEvent } = require("../controllers/photoController");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed."));
    }
    cb(null, true);
  },
});

router.post("/upload", upload.single("photo"), uploadPhoto);
router.get("/:eventId", getPhotosByEvent);

module.exports = router;
