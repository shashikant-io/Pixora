const express = require("express");
const router = express.Router();
const { getStorageStats, getUsersActivity, getDashboardStats } = require("../controllers/adminController");
const { requireAdmin } = require("../middleware/auth");

router.get("/storage", requireAdmin, getStorageStats);
router.get("/users", requireAdmin, getUsersActivity);
router.get("/dashboard-stats", requireAdmin, getDashboardStats);


module.exports = router;
