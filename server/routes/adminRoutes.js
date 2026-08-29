const express = require("express");
const router = express.Router();
const { getStorageStats } = require("../controllers/adminController");
const { requireAdmin } = require("../middleware/auth");

router.get("/storage", requireAdmin, getStorageStats);

module.exports = router;
