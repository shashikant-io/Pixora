const express = require("express");
const router = express.Router();
const { getStorageStats, getUsersActivity } = require("../controllers/adminController");
const { requireAdmin } = require("../middleware/auth");

router.get("/storage", requireAdmin, getStorageStats);
router.get("/users", requireAdmin, getUsersActivity);


module.exports = router;
