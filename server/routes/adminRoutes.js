const express = require("express");
const router = express.Router();
const { getStorageStats } = require("../controllers/adminController");

router.get("/storage", getStorageStats);

module.exports = router;
