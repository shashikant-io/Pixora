const express = require("express");
const router = express.Router();
const {
  createEvent,
  getEvent,
  listEvents,
  deleteEvent,
  getEventQrCode,
} = require("../controllers/eventController");
const { requireAdmin } = require("../middleware/auth");

router.get("/", listEvents);
router.post("/", requireAdmin, createEvent);
router.get("/:eventId", getEvent); // Public to allow QR landing validation
router.get("/:eventId/qr", getEventQrCode); // Public high-res QR generation
router.delete("/:eventId", requireAdmin, deleteEvent);


module.exports = router;
