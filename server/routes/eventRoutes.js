const express = require("express");
const router = express.Router();
const { createEvent, getEvent, listEvents, deleteEvent } = require("../controllers/eventController");

router.get("/", listEvents);
router.post("/", createEvent);
router.get("/:eventId", getEvent);
router.delete("/:eventId", deleteEvent);

module.exports = router;
