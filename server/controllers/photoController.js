const Photo = require("../models/Photo");
const Event = require("../models/Event");
const { uploadImage, invalidateStorageUsageCache } = require("../services/imagekitService");
const { processPhotoFaces } = require("../services/faceService");

async function uploadPhoto(req, res) {
  try {
    const { eventId } = req.body;

    if (!eventId) {
      return res.status(400).json({ success: false, message: "eventId is required." });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image file was received." });
    }

    const event = await Event.findOne({ eventId });
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found." });
    }

    let faces = [];
    if (req.body.faces) {
      try {
        faces = JSON.parse(req.body.faces);
      } catch (parseError) {
        // Fall back to server detection
      }
    }

    // Extract high-accuracy Buffalo ONNX embeddings on the server
    try {
      const buffaloFaces = await processPhotoFaces(req.file.buffer);
      if (buffaloFaces && buffaloFaces.length > 0) {
        faces = buffaloFaces;
      }
    } catch (faceErr) {
      console.warn("Buffalo face processing warning:", faceErr.message);
    }

    const folder = `wedding-photo-finder/events/${eventId}/photos`;
    const uploaded = await uploadImage(req.file.buffer, req.file.originalname, folder);

    const photo = await Photo.create({
      eventId,
      imageKitFileId: uploaded.fileId,
      imageUrl: uploaded.url,
      filePath: uploaded.filePath,
      faces,
    });

    invalidateStorageUsageCache();

    res.json({
      success: true,
      photo: {
        id: photo._id,
        imageUrl: photo.imageUrl,
        faceCount: photo.faces.length,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to upload photo." });
  }
}

async function getPhotosByEvent(req, res) {
  try {
    const { eventId } = req.params;
    const photos = await Photo.find({ eventId }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: photos.length,
      photos: photos.map((p) => ({
        id: p._id,
        imageUrl: p.imageUrl,
        faceCount: p.faces.length,
        createdAt: p.createdAt,
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch photos." });
  }
}

module.exports = { uploadPhoto, getPhotosByEvent };
