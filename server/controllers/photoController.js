const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const Photo = require("../models/Photo");
const Event = require("../models/Event");
const {
  uploadImage,
  deleteImage,
  invalidateStorageUsageCache,
  getSignedViewUrl,
  getSignedDownloadUrl,
  getSignedUploadUrl,
  resolvePhotoUrls,
  getObjectStream,
  getStorageUsage,
  getS3Client,
  getBucketName,
} = require("../services/s3Service");
const { PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getFileStream: getDriveFileStream } = require("../services/googleDriveService");
const { processPhotoFaces } = require("../services/faceService");

const LOCAL_UPLOADS_ROOT = path.join(__dirname, "../uploads/events");

/**
 * Resolves the underlying photo location across storage providers
 */
async function resolvePhotoSource(fileId) {
  if (!fileId) return null;

  // 1. Search database for photo record
  let photo = null;
  try {
    photo = await Photo.findOne({
      $or: [{ fileId }, { filePath: fileId }],
    }).lean();

    if (!photo && fileId.match(/^[0-9a-fA-F]{24}$/)) {
      photo = await Photo.findById(fileId).lean();
    }
  } catch (dbErr) {
    console.warn(`[Photo Resolver] DB lookup warning for ${fileId}:`, dbErr.message);
  }

  // 2. AWS S3 Storage Provider (Private S3 Bucket)
  if (photo && (photo.storageProvider === "s3" || (photo.filePath && photo.filePath.startsWith("events/")))) {
    const s3Key = photo.filePath || photo.fileId || fileId;
    const thumbKey = photo.thumbnailUrl && !photo.thumbnailUrl.startsWith("http")
      ? photo.thumbnailUrl
      : (s3Key.includes("/photos/") ? s3Key.replace("/photos/", "/thumbnails/") : `thumbnails/${s3Key}`);

    return {
      type: "s3",
      fileId: s3Key,
      thumbKey: thumbKey,
      mimeType: photo.mimeType || "image/jpeg",
      size: photo.fileSize,
      fileName: path.basename(s3Key),
    };
  }

  // 3. Fallback for remote HTTP/HTTPS URLs (if any exist)
  if (photo && photo.imageUrl && (photo.imageUrl.startsWith("http://") || photo.imageUrl.startsWith("https://"))) {
    return {
      type: "remote",
      url: photo.imageUrl,
      thumbnailUrl: photo.thumbnailUrl || photo.imageUrl,
      downloadUrl: photo.downloadUrl || photo.imageUrl,
      fileId: photo.fileId || fileId,
      mimeType: photo.mimeType || "image/jpeg",
      fileName: photo.filePath ? path.basename(photo.filePath) : `photo_${fileId}.jpg`,
    };
  }

  // 4. Search local disk storage in server/uploads/events
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

  // 5. Check explicit photo.filePath on disk
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

  // 6. Try Google Drive Service Stream as fallback
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

/**
 * Generates a presigned S3 PUT URL for direct client-to-S3 upload (supports 25MB+ files)
 * POST /api/photos/get-upload-url
 */
async function getUploadUrl(req, res) {
  try {
    const { eventId, fileName, fileType, fileSize } = req.body;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: "eventId is required.",
      });
    }

    // Validate 25 MB maximum file size limit
    if (fileSize && fileSize > 25 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        code: "FILE_TOO_LARGE",
        message: "This photo is too large. Maximum allowed size is 25 MB.",
      });
    }

    const event = await Event.findOne({ eventId });
    if (!event) {
      return res.status(404).json({
        success: false,
        message: `Event "${eventId}" does not exist.`,
      });
    }

    // Storage quota validation
    const usage = await getStorageUsage(false);
    if (usage && usage.totalQuotaBytes && fileSize && (usage.mediaLibraryStorageBytes + fileSize > usage.totalQuotaBytes)) {
      return res.status(403).json({
        success: false,
        code: "STORAGE_QUOTA_EXCEEDED",
        message: `Storage quota exceeded (${usage.storageLimitTB || 1} TB limit reached). Delete old photos to free up space.`,
      });
    }

    const mime = (fileType || "image/jpeg").toLowerCase();
    const result = await getSignedUploadUrl(eventId, fileName || "photo.jpg", mime, 900);

    return res.json({
      success: true,
      directUpload: result.directUpload,
      uploadUrl: result.uploadUrl,
      s3Key: result.photoKey,
      thumbKey: result.thumbKey,
      eventId,
    });
  } catch (err) {
    console.error("Error generating upload URL:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to generate upload URL.",
    });
  }
}

/**
 * Confirms a direct S3 upload, saves the photo record in MongoDB,
 * and triggers Buffalo AI face indexing.
 * POST /api/photos/confirm-upload
 */
async function confirmUpload(req, res) {
  try {
    const { eventId, s3Key, thumbKey, fileName, fileSize, mimeType } = req.body;

    if (!eventId || !s3Key) {
      return res.status(400).json({
        success: false,
        message: "eventId and s3Key are required.",
      });
    }

    const event = await Event.findOne({ eventId });
    if (!event) {
      return res.status(404).json({
        success: false,
        message: `Event "${eventId}" does not exist.`,
      });
    }

    const actualThumbKey = thumbKey || (s3Key.includes("/photos/") ? s3Key.replace("/photos/", "/thumbnails/") : `thumbnails/${s3Key}`);
    const actualMime = mimeType || "image/jpeg";
    const actualSize = fileSize || 0;

    // 1. Persist photo in MongoDB first (guarantees photo is preserved in storage)
    let photo = await Photo.findOne({ eventId, fileId: s3Key });
    if (!photo) {
      photo = await Photo.create({
        eventId,
        storageProvider: "s3",
        fileId: s3Key,
        imageUrl: s3Key,
        thumbnailUrl: actualThumbKey,
        downloadUrl: s3Key,
        filePath: s3Key,
        fileSize: actualSize,
        mimeType: actualMime,
        faces: [],
      });
    }

    invalidateStorageUsageCache();

    // 2. Generate presigned URLs for response
    const [signedViewUrl, signedThumbUrl, signedDownUrl] = await Promise.all([
      getSignedViewUrl(s3Key, 3600),
      getSignedViewUrl(actualThumbKey || s3Key, 3600),
      getSignedDownloadUrl(s3Key, fileName || path.basename(s3Key), 3600),
    ]);

    // 3. Buffalo AI Indexing & Thumbnail Generation
    let detectedFaces = [];
    try {
      // Stream buffer from S3 to perform indexing and thumbnail generation
      const s3Stream = await getObjectStream(s3Key);
      if (s3Stream && s3Stream.stream) {
        const chunks = [];
        for await (const chunk of s3Stream.stream) {
          chunks.push(chunk);
        }
        const fullBuffer = Buffer.concat(chunks);

        // Generate and upload thumbnail if possible
        try {
          const thumbBuffer = await sharp(fullBuffer)
            .resize(350, 350, { fit: "inside", withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toBuffer();

          const s3 = getS3Client();
          const bucket = getBucketName();
          await s3.send(
            new PutObjectCommand({
              Bucket: bucket,
              Key: actualThumbKey,
              Body: thumbBuffer,
              ContentType: "image/jpeg",
              ServerSideEncryption: "AES256",
              CacheControl: "private, max-age=31536000",
            })
          );
        } catch (thumbErr) {
          console.warn(`[Confirm Upload] Thumbnail generation notice:`, thumbErr.message);
        }

        // Run Buffalo AI Face Indexing
        try {
          const { isLoaded, initModels } = require("../faceRecognition/modelLoader");
          if (!isLoaded()) {
            await initModels();
          }
          const faces = await processPhotoFaces(fullBuffer);
          if (Array.isArray(faces) && faces.length > 0) {
            detectedFaces = faces;
            photo.faces = faces;
            await photo.save();
          }
        } catch (aiErr) {
          console.warn(`[AI Engine] Face extraction warning on confirmed photo:`, aiErr.message);
        }
      }
    } catch (streamErr) {
      console.warn(`[Confirm Upload] Notice retrieving S3 object stream:`, streamErr.message);
    }

    return res.json({
      success: true,
      stage: "completed",
      photo: {
        id: photo._id,
        fileId: photo.fileId,
        imageUrl: signedViewUrl,
        thumbnailUrl: signedThumbUrl,
        downloadUrl: signedDownUrl,
        storageProvider: photo.storageProvider,
        faceCount: detectedFaces.length,
        fileSize: photo.fileSize,
        fileName: fileName || path.basename(s3Key),
      },
    });
  } catch (err) {
    console.error("Error confirming upload:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to confirm upload.",
    });
  }
}

/**
 * Handles multipart photo uploads: saves to S3 first, persists in DB, then indexes faces.
 * POST /api/photos/upload
 */
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

    // Enforce 25 MB max limit
    if (req.file.buffer.length > 25 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        stage: "validation",
        code: "FILE_TOO_LARGE",
        message: "This photo is too large. Maximum allowed size is 25 MB.",
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

    // Storage quota validation (enforcing 1024 GB / 1 TB maximum quota)
    const usage = await getStorageUsage(false);
    if (usage && usage.totalQuotaBytes && (usage.mediaLibraryStorageBytes + req.file.buffer.length > usage.totalQuotaBytes)) {
      return res.status(403).json({
        success: false,
        stage: "validation",
        code: "STORAGE_QUOTA_EXCEEDED",
        message: `Storage quota exceeded (${usage.storageLimitTB || 1} TB limit reached). Delete old photos to free up space.`,
      });
    }

    // Stage 1: Upload to AWS S3 storage first
    stage = "storage";
    const uploaded = await uploadImage(
      req.file.buffer,
      req.file.originalname,
      eventId,
      req.file.mimetype || "image/jpeg"
    );

    // Stage 2: Database Persistence
    stage = "persistence";
    let photo = await Photo.findOne({ eventId, fileId: uploaded.fileId });

    if (!photo) {
      photo = await Photo.create({
        eventId,
        storageProvider: "s3",
        fileId: uploaded.fileId,
        imageUrl: uploaded.filePath,
        thumbnailUrl: uploaded.thumbKey,
        downloadUrl: uploaded.filePath,
        filePath: uploaded.filePath,
        fileSize: uploaded.size,
        mimeType: req.file.mimetype || "image/jpeg",
        faces: [],
      });
    }

    invalidateStorageUsageCache();

    // Stage 3: Buffalo ONNX Face Detection & AI Embedding Extraction (Post-Storage)
    stage = "indexing";
    let faces = [];
    try {
      const { isLoaded, initModels } = require("../faceRecognition/modelLoader");
      if (!isLoaded()) {
        await initModels();
      }
      const buffaloFaces = await processPhotoFaces(req.file.buffer);
      if (Array.isArray(buffaloFaces) && buffaloFaces.length > 0) {
        faces = buffaloFaces;
        photo.faces = faces;
        await photo.save();
      }
    } catch (faceErr) {
      console.warn(`[AI Engine] Face extraction warning for "${req.file.originalname}":`, faceErr.message);
    }

    // Return freshly generated presigned URLs in the response for instant frontend display
    return res.json({
      success: true,
      stage: "completed",
      photo: {
        id: photo._id,
        fileId: photo.fileId,
        imageUrl: uploaded.url,
        thumbnailUrl: uploaded.thumbnailUrl,
        downloadUrl: uploaded.downloadUrl,
        storageProvider: photo.storageProvider,
        faceCount: faces.length,
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

/**
 * Returns all photos for an event with fresh presigned GET URLs for private S3 storage
 */
async function getPhotosByEvent(req, res) {
  try {
    const { eventId } = req.params;
    const photos = await Photo.find({ eventId }).sort({ createdAt: -1 });

    const photoList = await Promise.all(
      photos.map(async (p) => {
        const fileId = p.fileId || p.filePath || p._id.toString();

        // If stored in S3, generate fresh presigned GET URLs
        if (p.storageProvider === "s3" || (p.filePath && p.filePath.startsWith("events/"))) {
          const urls = await resolvePhotoUrls(p);
          return {
            id: p._id,
            fileId: fileId,
            imageUrl: urls.imageUrl,
            thumbnailUrl: urls.thumbnailUrl,
            downloadUrl: urls.downloadUrl,
            storageProvider: "s3",
            faceCount: p.faces ? p.faces.length : 0,
            createdAt: p.createdAt,
          };
        }

        // Fallback for legacy remote or local files
        const isRemote = p.imageUrl && p.imageUrl.startsWith("http");
        return {
          id: p._id,
          fileId: fileId,
          imageUrl: isRemote ? p.imageUrl : `/api/photos/file/${encodeURIComponent(fileId)}`,
          thumbnailUrl: isRemote ? (p.thumbnailUrl || p.imageUrl) : `/api/photos/file/${encodeURIComponent(fileId)}?size=thumbnail`,
          downloadUrl: isRemote ? (p.downloadUrl || p.imageUrl) : `/api/photos/download/${encodeURIComponent(fileId)}`,
          storageProvider: p.storageProvider || "local",
          faceCount: p.faces ? p.faces.length : 0,
          createdAt: p.createdAt,
        };
      })
    );

    res.json({
      success: true,
      count: photoList.length,
      photos: photoList,
    });
  } catch (error) {
    console.error("Fetch photos error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch photos." });
  }
}

/**
 * Universal photo streaming / proxy endpoint
 * Generates a presigned view URL for private S3 or streams local file
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

    // Remote AWS S3 Storage: Redirect to a fresh presigned GET URL
    if (source.type === "s3") {
      const targetKey = isThumbnail ? (source.thumbKey || source.fileId) : source.fileId;
      try {
        const signedUrl = await getSignedViewUrl(targetKey, 3600);
        return res.redirect(302, signedUrl);
      } catch (err) {
        // Fallback to S3 stream proxy
        const s3StreamObj = await getObjectStream(targetKey);
        res.setHeader("Content-Type", s3StreamObj.contentType || "image/jpeg");
        return s3StreamObj.stream.pipe(res);
      }
    }

    // Remote URL
    if (source.type === "remote") {
      const targetUrl = isThumbnail ? (source.thumbnailUrl || source.url) : source.url;
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
 * Redirects to a presigned S3 download URL with Content-Disposition
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

    if (source.type === "s3") {
      try {
        const signedUrl = await getSignedDownloadUrl(source.fileId, source.fileName, 3600);
        return res.redirect(302, signedUrl);
      } catch (err) {
        console.warn(`[AWS S3] Fallback download streaming for "${source.fileId}":`, err.message);
        const s3StreamObj = await getObjectStream(source.fileId);
        res.setHeader("Content-Type", s3StreamObj.contentType || "application/octet-stream");
        res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(source.fileName)}"`);
        return s3StreamObj.stream.pipe(res);
      }
    }

    if (source.type === "remote") {
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
  getUploadUrl,
  confirmUpload,
  getPhotosByEvent,
  streamPhoto,
  downloadPhoto,
};
