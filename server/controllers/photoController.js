const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const Photo = require("../models/Photo");
const Event = require("../models/Event");
const {
  uploadImage,
  deleteImage,
  invalidateStorageUsageCache,
} = require("../services/imagekitService");
const { getFileStream: getDriveFileStream } = require("../services/googleDriveService");
const { processPhotoFaces } = require("../services/faceService");

const LOCAL_UPLOADS_ROOT = path.join(__dirname, "../uploads/events");

/**
 * Resolves the underlying photo location across all storage providers
 */
async function resolvePhotoSource(fileId) {
  if (!fileId) return null;

  // 1. Search database for photo record
  let photo = null;
  try {
    photo = await Photo.findOne({
      $or: [{ fileId }, { imageKitFileId: fileId }],
    }).lean();

    if (!photo && fileId.match(/^[0-9a-fA-F]{24}$/)) {
      photo = await Photo.findById(fileId).lean();
    }
  } catch (dbErr) {
    console.warn(`[Photo Resolver] DB lookup warning for ${fileId}:`, dbErr.message);
  }

  // 2. If photo is ImageKit / remote CDN URL
  if (photo && photo.imageUrl && (photo.imageUrl.startsWith("http://") || photo.imageUrl.startsWith("https://"))) {
    return {
      type: "imagekit",
      url: photo.imageUrl,
      thumbnailUrl: photo.thumbnailUrl || `${photo.imageUrl}?tr=h-350,w-350,q-80,c-maintain_ratio`,
      downloadUrl: photo.downloadUrl || `${photo.imageUrl}?ik-attachment=true`,
      mimeType: photo.mimeType || "image/jpeg",
      fileName: photo.filePath ? path.basename(photo.filePath) : `photo_${fileId}.jpg`,
    };
  }

  // 3. Search local disk storage in server/uploads/events
  if (fs.existsSync(LOCAL_UPLOADS_ROOT)) {
    const eventDirs = fs.readdirSync(LOCAL_UPLOADS_ROOT);
    for (const ed of eventDirs) {
      const fullDir = path.join(LOCAL_UPLOADS_ROOT, ed);
      if (fs.statSync(fullDir).isDirectory()) {
        const files = fs.readdirSync(fullDir);
        const match = files.find((f) => f.startsWith(fileId) || f.includes(fileId));
        if (match) {
          const filePath = path.join(fullDir, match);
          const stat = fs.statSync(filePath);
          return {
            type: "local",
            diskPath: filePath,
            mimeType: match.endsWith(".png") ? "image/png" : match.endsWith(".webp") ? "image/webp" : "image/jpeg",
            size: stat.size,
            fileName: match,
          };
        }
      }
    }
  }

  // 4. Check explicit photo.filePath on disk
  if (photo && photo.filePath && fs.existsSync(photo.filePath)) {
    const stat = fs.statSync(photo.filePath);
    return {
      type: "local",
      diskPath: photo.filePath,
      mimeType: photo.mimeType || "image/jpeg",
      size: stat.size,
      fileName: path.basename(photo.filePath),
    };
  }

  // 5. Try Google Drive Service Stream as fallback
  try {
    const driveResult = await getDriveFileStream(fileId);
    if (driveResult && driveResult.stream) {
      return {
        type: "stream",
        stream: driveResult.stream,
        metadata: driveResult.metadata || {},
        mimeType: (driveResult.metadata && driveResult.metadata.mimeType) || "image/jpeg",
        size: driveResult.metadata && driveResult.metadata.size,
        fileName: (driveResult.metadata && driveResult.metadata.name) || `photo_${fileId}.jpg`,
      };
    }
  } catch (driveErr) {
    // Drive file not found or inaccessible
  }

  return null;
}

async function uploadPhoto(req, res) {
  let stage = "validation";
  try {
    const { eventId } = req.body;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        stage: "validation",
        code: "MISSING_EVENT_ID",
        message: "eventId is required.",
      });
    }

    if (!req.file || !req.file.buffer || req.file.buffer.length === 0) {
      return res.status(400).json({
        success: false,
        stage: "validation",
        code: "NO_FILE",
        message: "No image file was received.",
      });
    }

    const event = await Event.findOne({ eventId });
    if (!event) {
      return res.status(404).json({
        success: false,
        stage: "validation",
        code: "EVENT_NOT_FOUND",
        message: `Event "${eventId}" does not exist.`,
      });
    }

    // Stage 1: Face Detection & AI Embedding Extraction (Buffalo ONNX)
    stage = "indexing";
    let faces = [];

    try {
      const buffaloFaces = await processPhotoFaces(req.file.buffer);
      if (Array.isArray(buffaloFaces)) {
        faces = buffaloFaces;
      }
    } catch (faceErr) {
      console.warn(`[AI Engine] Face extraction warning for "${req.file.originalname}":`, faceErr.message);
    }

    // Stage 2: Direct Upload to ImageKit CDN
    stage = "storage";
    const uploaded = await uploadImage(
      req.file.buffer,
      req.file.originalname,
      eventId
    );

    // Stage 3: Database Persistence
    stage = "persistence";
    let photo = await Photo.findOne({ eventId, fileId: uploaded.fileId });

    if (!photo) {
      photo = await Photo.create({
        eventId,
        storageProvider: "imagekit",
        fileId: uploaded.fileId,
        imageKitFileId: uploaded.fileId,
        imageUrl: uploaded.url,
        thumbnailUrl: uploaded.thumbnailUrl,
        downloadUrl: uploaded.downloadUrl,
        filePath: uploaded.filePath,
        fileSize: uploaded.size,
        mimeType: req.file.mimetype || "image/jpeg",
        faces,
      });
    } else if (faces.length > 0 && (!photo.faces || photo.faces.length === 0)) {
      photo.faces = faces;
      await photo.save();
    }

    invalidateStorageUsageCache();

    res.json({
      success: true,
      stage: "completed",
      photo: {
        id: photo._id,
        fileId: photo.fileId,
        imageUrl: photo.imageUrl,
        thumbnailUrl: photo.thumbnailUrl,
        downloadUrl: photo.downloadUrl,
        storageProvider: photo.storageProvider,
        faceCount: photo.faces ? photo.faces.length : 0,
        fileSize: photo.fileSize,
        fileName: req.file.originalname,
      },
    });
  } catch (error) {
    console.error(`Photo upload error [Stage: ${stage}]:`, error.message);
    res.status(500).json({
      success: false,
      stage: stage,
      code: "UPLOAD_ERROR",
      message: error.message || "Failed to process photo.",
    });
  }
}

async function getPhotosByEvent(req, res) {
  try {
    const { eventId } = req.params;
    const photos = await Photo.find({ eventId }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: photos.length,
      photos: photos.map((p) => {
        const fileId = p.fileId || p.imageKitFileId;
        const isRemote = p.imageUrl && p.imageUrl.startsWith("http");
        return {
          id: p._id,
          fileId: fileId,
          imageUrl: isRemote ? p.imageUrl : `/api/photos/file/${fileId}`,
          thumbnailUrl: isRemote ? (p.thumbnailUrl || p.imageUrl) : `/api/photos/file/${fileId}?size=thumbnail`,
          downloadUrl: isRemote ? (p.downloadUrl || `${p.imageUrl}?ik-attachment=true`) : `/api/photos/download/${fileId}`,
          faceCount: p.faces ? p.faces.length : 0,
          createdAt: p.createdAt,
        };
      }),
    });
  } catch (error) {
    console.error("Fetch photos error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch photos." });
  }
}

/**
 * Universal photo streaming / proxy endpoint
 * Supports full resolution & on-the-fly thumbnail resizing
 */
async function streamPhoto(req, res) {
  try {
    const { fileId } = req.params;
    if (!fileId) {
      return res.status(400).json({ success: false, code: "MISSING_FILE_ID", message: "File ID is required." });
    }

    const isThumbnail = req.query.size === "thumbnail" || req.query.size === "small";
    const source = await resolvePhotoSource(fileId);

    if (!source) {
      return res.status(404).json({
        success: false,
        code: "PHOTO_NOT_FOUND",
        message: `Photo "${fileId}" not found or no longer available.`,
      });
    }

    // Remote ImageKit CDN
    if (source.type === "imagekit") {
      const targetUrl = isThumbnail ? source.thumbnailUrl : source.url;
      return res.redirect(302, targetUrl);
    }

    // Local Disk Storage
    if (source.type === "local") {
      res.setHeader("Cache-Control", "public, max-age=86400, immutable");

      if (isThumbnail) {
        res.setHeader("Content-Type", "image/jpeg");
        const resizer = sharp()
          .resize(350, 350, { fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: 80 });

        return fs.createReadStream(source.diskPath).pipe(resizer).pipe(res);
      }

      res.setHeader("Content-Type", source.mimeType || "image/jpeg");
      if (source.size) {
        res.setHeader("Content-Length", source.size);
      }
      return fs.createReadStream(source.diskPath).pipe(res);
    }

    // Google Drive Stream
    if (source.type === "stream") {
      res.setHeader("Cache-Control", "public, max-age=86400, immutable");

      if (isThumbnail) {
        res.setHeader("Content-Type", "image/jpeg");
        const resizer = sharp()
          .resize(350, 350, { fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: 80 });

        return source.stream.pipe(resizer).pipe(res);
      }

      res.setHeader("Content-Type", source.mimeType || "image/jpeg");
      if (source.size) {
        res.setHeader("Content-Length", source.size);
      }
      return source.stream.pipe(res);
    }

    res.status(404).json({ success: false, code: "PHOTO_NOT_FOUND", message: "Photo file not found." });
  } catch (error) {
    console.error(`Error streaming photo "${req.params.fileId}":`, error.message);
    res.status(500).json({ success: false, code: "STREAM_ERROR", message: "Failed to stream photo." });
  }
}

/**
 * Universal photo attachment download endpoint
 */
async function downloadPhoto(req, res) {
  try {
    const { fileId } = req.params;
    if (!fileId) {
      return res.status(400).json({ success: false, code: "MISSING_FILE_ID", message: "File ID is required." });
    }

    const source = await resolvePhotoSource(fileId);

    if (!source) {
      return res.status(404).json({
        success: false,
        code: "PHOTO_NOT_FOUND",
        message: `Photo "${fileId}" not found for download.`,
      });
    }

    if (source.type === "imagekit") {
      return res.redirect(302, source.downloadUrl);
    }

    const fileName = source.fileName || `photo_${fileId}.jpg`;

    if (source.type === "local") {
      res.setHeader("Content-Type", source.mimeType || "application/octet-stream");
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(fileName)}"`);
      if (source.size) {
        res.setHeader("Content-Length", source.size);
      }
      return fs.createReadStream(source.diskPath).pipe(res);
    }

    if (source.type === "stream") {
      res.setHeader("Content-Type", source.mimeType || "application/octet-stream");
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(fileName)}"`);
      if (source.size) {
        res.setHeader("Content-Length", source.size);
      }
      return source.stream.pipe(res);
    }

    res.status(404).json({ success: false, code: "PHOTO_NOT_FOUND", message: "Photo not found for download." });
  } catch (error) {
    console.error(`Error downloading photo "${req.params.fileId}":`, error.message);
    res.status(500).json({ success: false, code: "DOWNLOAD_ERROR", message: "Failed to download photo." });
  }
}

module.exports = {
  uploadPhoto,
  getPhotosByEvent,
  streamPhoto,
  downloadPhoto,
};
