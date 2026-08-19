const Photo = require("../models/Photo");
const Event = require("../models/Event");
const { uploadImage } = require("../services/imagekitService");
const { findMatchingPhotos, processSelfieFace } = require("../services/faceService");

async function searchByFace(req, res) {
  try {
    const { eventId, embedding } = req.body;

    if (!eventId) {
      return res.status(400).json({ success: false, message: "eventId is required." });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No selfie was received. Please upload a clear selfie showing your face.",
      });
    }

    let guestEmbedding = null;

    // Try Buffalo ONNX face extraction directly from image buffer
    try {
      const selfieResult = await processSelfieFace(req.file.buffer);
      if (selfieResult && selfieResult.embedding) {
        guestEmbedding = selfieResult.embedding;
      }
    } catch (faceErr) {
      // If server detection couldn't find face, check client provided embedding
      if (embedding) {
        try {
          guestEmbedding = JSON.parse(embedding);
        } catch (e) {
          guestEmbedding = null;
        }
      }
    }

    if (!Array.isArray(guestEmbedding) || guestEmbedding.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No face detected in selfie. Please upload a clear photo showing your face.",
      });
    }

    const event = await Event.findOne({ eventId });
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found." });
    }

    const folder = `wedding-photo-finder/events/${eventId}/guest-selfies`;
    await uploadImage(req.file.buffer, req.file.originalname, folder);

    const threshold = parseFloat(process.env.FACE_MATCH_THRESHOLD) || 0.40;
    const allPhotos = await Photo.find({ eventId });

    const matches = findMatchingPhotos(guestEmbedding, allPhotos, threshold);

    if (matches.length === 0) {
      return res.json({
        success: true,
        matches: [],
        message: "No matching photos found. Try another clear selfie.",
      });
    }

    res.json({
      success: true,
      matches: matches.map((m) => ({
        imageUrl: m.photo.imageUrl,
        similarity: m.similarity !== undefined ? m.similarity : Number((1 - m.distance).toFixed(4)),
        distance: m.distance,
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Search failed. Please try again." });
  }
}

module.exports = { searchByFace };
