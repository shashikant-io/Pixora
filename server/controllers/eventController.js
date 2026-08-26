const Event = require("../models/Event");
const Photo = require("../models/Photo");
const generateEventId = require("../utils/generateId");
const {
  bulkDeleteImages,
  deleteFolder,
  invalidateStorageUsageCache,
} = require("../services/imagekitService");

async function createEvent(req, res) {
  try {
    const { name, date, location } = req.body;

    if (!name || !date || !location) {
      return res.status(400).json({
        success: false,
        message: "name, date, and location are all required.",
      });
    }

    const eventId = generateEventId();

    const newEvent = await Event.create({
      eventId,
      name,
      date,
      location,
    });

    res.status(201).json({
      success: true,
      event: newEvent,
    });
  } catch (error) {
    console.error("Create event error:", error);
    res.status(500).json({
      success: false,
      message: "Could not create event.",
    });
  }
}

async function getEvent(req, res) {
  try {
    const { eventId } = req.params;
    const event = await Event.findOne({ eventId }).lean();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found.",
      });
    }

    const photoCount = await Photo.countDocuments({ eventId });

    res.json({
      success: true,
      event: {
        ...event,
        photoCount,
      },
    });
  } catch (error) {
    console.error("Get event error:", error);
    res.status(500).json({
      success: false,
      message: "Could not fetch event.",
    });
  }
}

async function listEvents(req, res) {
  try {
    const events = await Event.find().sort({ createdAt: -1 }).lean();

    // Aggregate photo counts for each event
    const photoCounts = await Photo.aggregate([
      {
        $group: {
          _id: "$eventId",
          count: { $sum: 1 },
        },
      },
    ]);

    const countMap = {};
    photoCounts.forEach((item) => {
      countMap[item._id] = item.count;
    });

    const enrichedEvents = events.map((ev) => ({
      ...ev,
      photoCount: countMap[ev.eventId] || 0,
    }));

    res.json({
      success: true,
      events: enrichedEvents,
    });
  } catch (error) {
    console.error("List events error:", error);
    res.status(500).json({
      success: false,
      message: "Could not fetch events.",
    });
  }
}

async function deleteEvent(req, res) {
  try {
    const { eventId } = req.params;

    const event = await Event.findOne({ eventId });
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found.",
      });
    }

    // 1. Find all photos belonging to this event
    const photos = await Photo.find({ eventId });
    const fileIds = photos
      .map((p) => p.fileId || p.imageKitFileId)
      .filter(Boolean);

    // 2. Delete all photos from Google Drive
    if (fileIds.length > 0) {
      await bulkDeleteImages(fileIds);
    }

    // 3. Delete the event folder from Google Drive
    await deleteFolder(eventId);

    // 4. Delete photo records from MongoDB
    await Photo.deleteMany({ eventId });

    // 5. Delete the event itself from MongoDB
    await Event.deleteOne({ eventId });

    // 6. Invalidate storage cache for live recalculation
    invalidateStorageUsageCache();

    res.json({
      success: true,
      message: `Event "${event.name}" and ${photos.length} photo(s) deleted successfully.`,
      deletedEventId: eventId,
      deletedPhotoCount: photos.length,
    });
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).json({
      success: false,
      message: "Could not delete event.",
      error: error.message,
    });
  }
}

module.exports = { createEvent, getEvent, listEvents, deleteEvent };
