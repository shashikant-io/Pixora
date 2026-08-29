const express = require("express");
const multer = require("multer");
const router = express.Router();
const { searchByFace } = require("../controllers/searchController");

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

const { requireCustomerForEvent } = require("../middleware/auth");

router.post("/", upload.single("selfie"), requireCustomerForEvent, searchByFace);



module.exports = router;
