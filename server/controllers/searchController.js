const Photo = require("../models/Photo");
const Event = require("../models/Event");
const { findMatchingPhotos, processSelfieFace } = require("../services/faceService");
const { isLoaded, initModels } = require("../faceRecognition/modelLoader");

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
        console.error("[FaceSearch] Model initialization notice:", mErr.message);
      }
    }

    console.log("[SearchByFace] Received search request:", {
      eventId,
      fileSize: req.file ? `${(req.file.size / 1024).toFixed(1)} KB` : "none",
      mimeType: req.file?.mimetype,
      originalName: req.file?.originalname,
      modelsLoaded: isLoaded(),
    });

    // Buffalo ONNX face extraction directly from image buffer in memory
    try {
      const selfieResult = await processSelfieFace(req.file.buffer);
      if (selfieResult && selfieResult.embedding) {
        guestEmbedding = selfieResult.embedding;
        console.log("[SearchByFace] Face detected successfully. Confidence:", selfieResult.score, "Face count:", selfieResult.faceCount);
      }
    } catch (faceErr) {
      console.warn("[SearchByFace] Buffalo ONNX face detection notice:", faceErr.message);
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
      matches: matches.map((m) => {
        const photo = m.photo;
        const fileId = photo.fileId || photo.imageKitFileId || photo._id.toString();
        const isRemote = photo.imageUrl && (photo.imageUrl.startsWith("http://") || photo.imageUrl.startsWith("https://"));

        const imageUrl = isRemote ? photo.imageUrl : `/api/photos/file/${fileId}`;
        const thumbnailUrl = isRemote
          ? (photo.thumbnailUrl || `${photo.imageUrl}?tr=h-350,w-350,q-80,c-maintain_ratio`)
          : `/api/photos/file/${fileId}?size=thumbnail`;
        const downloadUrl = isRemote
          ? (photo.downloadUrl || `${photo.imageUrl}?ik-attachment=true`)
          : `/api/photos/download/${fileId}`;

        return {
          id: photo._id,
          fileId,
          imageUrl,
          thumbnailUrl,
          downloadUrl,
          similarity: m.similarity !== undefined ? m.similarity : Number((1 - m.distance).toFixed(4)),
          distance: m.distance,
        };
      }),
    });
  } catch (error) {
    console.error("Search by face error:", error);
    res.status(500).json({ success: false, message: "Search failed. Please try again." });
  }
}

module.exports = { searchByFace };
