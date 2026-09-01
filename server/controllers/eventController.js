const crypto = require("crypto");
const Event = require("../models/Event");
const Photo = require("../models/Photo");
const generateEventId = require("../utils/generateId");
const {
  bulkDeleteImages,
  deleteFolder,
  invalidateStorageUsageCache,
} = require("../services/imagekitService");

function generateAccessToken() {
  return "tok_" + crypto.randomBytes(12).toString("hex");
}

function computeGuestUrl(event, req = null) {
  let baseUrl = (process.env.PUBLIC_BASE_URL || "").trim().replace(/\/+$/, "");

  // Auto-detect production domain if running on Vercel or in production mode
  const isProd = process.env.NODE_ENV === "production" || !!process.env.VERCEL || !!process.env.VERCEL_URL;

  if (!baseUrl || (isProd && (baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1")))) {
    if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
      baseUrl = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/\/+$/, "")}`;
    } else if (process.env.VERCEL_URL) {
      baseUrl = `https://${process.env.VERCEL_URL.replace(/\/+$/, "")}`;
    } else if (req) {
      const proto = req.headers["x-forwarded-proto"] || req.protocol || "http";
      const host = req.headers["x-forwarded-host"] || req.get("host");
      if (host && !host.includes("localhost") && !host.includes("127.0.0.1")) {
        baseUrl = `${proto}://${host}`;
      }
    }
  }

  // Fallback to request host if baseUrl still unset
  if (!baseUrl && req) {
    const proto = req.headers["x-forwarded-proto"] || req.protocol || "http";
    const host = req.headers["x-forwarded-host"] || req.get("host");
    if (host) {
      baseUrl = `${proto}://${host}`;
    }
  }

  const token = event.accessToken || event.eventId;
  if (baseUrl) {
    return `${baseUrl}/guest-login.html?token=${token}`;
  }
  return `/guest-login.html?token=${token}`;
}

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
    const accessToken = generateAccessToken();

    const newEvent = await Event.create({
      eventId,
      accessToken,
      name,
      date,
      location,
    });

    res.status(201).json({
      success: true,
      event: {
        ...newEvent.toObject(),
        guestUrl: computeGuestUrl(newEvent, req),
      },
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
    if (!eventId) {
      return res.status(400).json({ success: false, message: "Event ID is required." });
    }

    const cleanId = eventId.trim();
    let event = await Event.findOne({
      $or: [
        { eventId: new RegExp(`^${cleanId}$`, "i") },
        { accessToken: cleanId },
      ],
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found or invalid token.",
      });
    }

    // Auto-backfill accessToken if event doesn't have one yet
    if (!event.accessToken) {
      event.accessToken = generateAccessToken();
      await event.save().catch(() => {});
    }

    let photoCount = 0;
    try {
      photoCount = await Photo.countDocuments({ eventId: event.eventId });
    } catch (e) {
      console.warn("Photo count warning:", e.message);
    }

    res.json({
      success: true,
      event: {
        ...event.toObject(),
        photoCount,
        guestUrl: computeGuestUrl(event, req),
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
    const events = await Event.find().sort({ createdAt: -1 });

    const countMap = {};
    try {
      const photoCounts = await Photo.aggregate([
        {
          $group: {
            _id: "$eventId",
            count: { $sum: 1 },
          },
        },
      ]);

      if (Array.isArray(photoCounts)) {
        photoCounts.forEach((item) => {
          if (item && item._id) {
            countMap[item._id] = item.count;
          }
        });
      }
    } catch (aggErr) {
      console.warn("Photo aggregation count notice:", aggErr.message);
    }

    const enrichedEvents = await Promise.all(
      events.map(async (ev) => {
        if (!ev.accessToken) {
          ev.accessToken = generateAccessToken();
          await ev.save().catch(() => {});
        }
        return {
          ...ev.toObject(),
          photoCount: countMap[ev.eventId] || 0,
          guestUrl: computeGuestUrl(ev, req),
        };
      })
    );

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

/**
 * GET /api/events/:eventId/qr
 * Generates and returns high-resolution QR code data URL or PNG image
 */
async function getEventQrCode(req, res) {
  try {
    const { eventId } = req.params;
    let event = await Event.findOne({
      $or: [{ eventId }, { accessToken: eventId }],
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found.",
      });
    }

    if (!event.accessToken) {
      event.accessToken = generateAccessToken();
      await event.save();
    }

    const guestUrl = req.query.guestUrl || computeGuestUrl(event, req);
    const QRCode = require("qrcode");

    if (req.query.format === "png" || req.query.download === "true") {
      const buffer = await QRCode.toBuffer(guestUrl, { width: 400, margin: 2 });
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Content-Disposition", `attachment; filename="${event.eventId}-guest-qr.png"`);
      return res.send(buffer);
    }


    const qrDataUrl = await QRCode.toDataURL(guestUrl, { width: 300, margin: 2 });

    res.json({
      success: true,
      eventId: event.eventId,
      accessToken: event.accessToken,
      guestUrl,
      qrDataUrl,
    });
  } catch (error) {
    console.error("Get Event QR Error:", error);
    res.status(500).json({
      success: false,
      message: "Could not generate QR code.",
    });
  }
}

module.exports = {
  createEvent,
  getEvent,
  listEvents,
  deleteEvent,
  getEventQrCode,
};

