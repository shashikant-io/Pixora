const Photo = require("../models/Photo");
const Event = require("../models/Event");
const { findMatchingPhotos, processSelfieFace } = require("../services/faceService");
const { isLoaded, initModels } = require("../faceRecognition/modelLoader");
const { resolvePhotoUrls } = require("../services/s3Service");

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

    // Ensure Buffalo ONNX inference sessions are ready
    if (!isLoaded()) {
      try {
        await initModels();
      } catch (mErr) {
        console.warn("[Face Engine] Initialization warning:", mErr.message);
      }
    }

    // Process guest selfie with local Buffalo ONNX
    let guestEmbedding = null;
    try {
      const selfieResult = await processSelfieFace(req.file.buffer);
      if (selfieResult && selfieResult.embedding) {
        guestEmbedding = selfieResult.embedding;
      }
    } catch (selfieErr) {
      console.error("[Face Engine] Selfie extraction error:", selfieErr.message);
      return res.status(422).json({
        success: false,
        code: "NO_FACE_DETECTED",
        message: "No face could be detected in the provided selfie. Ensure your face is well-lit and facing the camera directly.",
      });
    }

    if (!guestEmbedding || !Array.isArray(guestEmbedding) || guestEmbedding.length !== 512) {
      return res.status(422).json({
        success: false,
        code: "NO_FACE_DETECTED",
        message: "Could not detect a clear face in the uploaded selfie. Please try again with good lighting.",
      });
    }

    const event = await Event.findOne({ eventId });
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found." });
    }

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

    const formattedMatches = await Promise.all(
      matches.map(async (m) => {
        const photo = m.photo;
        const fileId = photo.fileId || photo.filePath || photo._id.toString();

        if (photo.storageProvider === "s3" || (photo.filePath && photo.filePath.startsWith("events/"))) {
          const urls = await resolvePhotoUrls(photo);
          return {
            id: photo._id,
            fileId,
            imageUrl: urls.imageUrl,
            thumbnailUrl: urls.thumbnailUrl,
            downloadUrl: urls.downloadUrl,
            similarity: m.similarity !== undefined ? m.similarity : Number((1 - m.distance).toFixed(4)),
            distance: m.distance,
          };
        }

        const isRemote = photo.imageUrl && (photo.imageUrl.startsWith("http://") || photo.imageUrl.startsWith("https://"));
        const imageUrl = isRemote ? photo.imageUrl : `/api/photos/file/${encodeURIComponent(fileId)}`;
        const thumbnailUrl = isRemote
          ? (photo.thumbnailUrl || photo.imageUrl)
          : `/api/photos/file/${encodeURIComponent(fileId)}?size=thumbnail`;
        const downloadUrl = isRemote
          ? (photo.downloadUrl || photo.imageUrl)
          : `/api/photos/download/${encodeURIComponent(fileId)}`;

        return {
          id: photo._id,
          fileId,
          imageUrl,
          thumbnailUrl,
          downloadUrl,
          similarity: m.similarity !== undefined ? m.similarity : Number((1 - m.distance).toFixed(4)),
          distance: m.distance,
        };
      })
    );

    res.json({
      success: true,
      matches: formattedMatches,
    });
  } catch (error) {
    console.error("Search by face error:", error);
    res.status(500).json({ success: false, message: "Search failed. Please try again." });
  }
}

module.exports = { searchByFace };
