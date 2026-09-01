const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const sharp = require("sharp");
const path = require("path");

let s3ClientInstance = null;

/**
 * Returns a singleton instance of the AWS S3 client
 */
function getS3Client() {
  if (s3ClientInstance) {
    return s3ClientInstance;
  }

  const region = process.env.AWS_REGION || "ap-south-1";
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const endpoint = process.env.AWS_S3_ENDPOINT;
  const forcePathStyle = process.env.AWS_S3_FORCE_PATH_STYLE === "true";

  if (!accessKeyId || !secretAccessKey) {
    console.warn("[AWS S3] Warning: AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY is not set.");
  }

  const config = {
    region,
  };

  if (accessKeyId && secretAccessKey) {
    config.credentials = {
      accessKeyId: accessKeyId.trim(),
      secretAccessKey: secretAccessKey.trim(),
    };
  }

  if (endpoint) {
    config.endpoint = endpoint;
  }

  if (forcePathStyle) {
    config.forcePathStyle = true;
  }

  s3ClientInstance = new S3Client(config);
  return s3ClientInstance;
}

function getBucketName() {
  return process.env.AWS_S3_BUCKET || "pixora-images-2026";
}

function hasCredentials() {
  return !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
}

/**
 * Generates safe, structured S3 object keys
 * e.g., events/{eventId}/photos/{timestamp}_{random}_{basename}.jpg
 */
function generateObjectKey(eventId, originalName, isThumb = false) {
  const ext = path.extname(originalName || "").toLowerCase() || ".jpg";
  const rawBase = path.basename(originalName || "photo", ext);
  const cleanBase = rawBase.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 60);
  const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const prefix = isThumb ? "thumbnails" : "photos";
  return `events/${eventId}/${prefix}/${uniqueId}_${cleanBase}${ext}`;
}

/**
 * Derives the thumbnail key corresponding to a full-resolution photo key
 */
function getThumbnailKey(photoKey) {
  if (!photoKey) return "";
  if (photoKey.includes("/photos/")) {
    return photoKey.replace("/photos/", "/thumbnails/");
  }
  return `thumbnails/${photoKey}`;
}

/**
 * Generates a presigned GET URL for viewing an S3 object in a private bucket
 * @param {string} key - S3 object key
 * @param {number} [expiresIn=3600] - Expiration in seconds (default: 1 hour)
 * @returns {Promise<string>}
 */
async function getSignedViewUrl(key, expiresIn = 3600) {
  if (!key) return "";
  if (!hasCredentials()) {
    // Fallback to local server proxy endpoint if credentials are not configured
    return `/api/photos/file/${encodeURIComponent(key)}`;
  }

  try {
    const s3 = getS3Client();
    const bucket = getBucketName();
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    return await getSignedUrl(s3, command, { expiresIn });
  } catch (err) {
    console.error(`[AWS S3] Error generating presigned view URL for "${key}":`, err.message);
    return `/api/photos/file/${encodeURIComponent(key)}`;
  }
}

/**
 * Generates a presigned GET URL for downloading an S3 object with Content-Disposition
 * @param {string} key - S3 object key
 * @param {string} [fileName] - File download name
 * @param {number} [expiresIn=3600] - Expiration in seconds
 * @returns {Promise<string>}
 */
async function getSignedDownloadUrl(key, fileName, expiresIn = 3600) {
  if (!key) return "";
  const downloadName = fileName || path.basename(key);

  if (!hasCredentials()) {
    return `/api/photos/download/${encodeURIComponent(key)}`;
  }

  try {
    const s3 = getS3Client();
    const bucket = getBucketName();
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${encodeURIComponent(downloadName)}"`,
    });
    return await getSignedUrl(s3, command, { expiresIn });
  } catch (err) {
    console.error(`[AWS S3] Error generating presigned download URL for "${key}":`, err.message);
    return `/api/photos/download/${encodeURIComponent(key)}`;
  }
}

/**
 * Attaches fresh presigned URLs to a photo document or plain object for frontend consumption
 * @param {Object} photo - Photo database record or object
 * @param {number} [expiresIn=3600] - URL validity in seconds
 */
async function resolvePhotoUrls(photo, expiresIn = 3600) {
  if (!photo) return null;

  const key = photo.fileId || photo.filePath;
  const thumbKey = photo.thumbnailUrl && !photo.thumbnailUrl.startsWith("http")
    ? photo.thumbnailUrl
    : getThumbnailKey(key);

  const [imageUrl, thumbnailUrl, downloadUrl] = await Promise.all([
    getSignedViewUrl(key, expiresIn),
    getSignedViewUrl(thumbKey || key, expiresIn),
    getSignedDownloadUrl(key, path.basename(key), expiresIn),
  ]);

  return {
    imageUrl,
    thumbnailUrl,
    downloadUrl,
  };
}

/**
 * Uploads an image buffer directly to the private AWS S3 bucket with SSE-S3 encryption
 * Also creates and uploads an optimized 350x350 thumbnail using Sharp
 *
 * @param {Buffer} fileBuffer - Image binary buffer
 * @param {string} originalName - Original filename
 * @param {string} eventId - Wedding Event ID
 * @param {string} [mimeType="image/jpeg"] - Image MIME type
 * @returns {Promise<{fileId: string, filePath: string, thumbKey: string, url: string, thumbnailUrl: string, downloadUrl: string, size: number, name: string}>}
 */
async function uploadImage(fileBuffer, originalName, eventId, mimeType = "image/jpeg") {
  const s3 = getS3Client();
  const bucket = getBucketName();

  const photoKey = generateObjectKey(eventId, originalName, false);
  const thumbKey = getThumbnailKey(photoKey);

  // 1. Upload high-res master photo to S3 with SSE-S3 (ServerSideEncryption: "AES256")
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: photoKey,
      Body: fileBuffer,
      ContentType: mimeType,
      ServerSideEncryption: "AES256",
      CacheControl: "private, max-age=31536000",
    })
  );

  // 2. Generate optimized 350x350 thumbnail buffer using Sharp
  let thumbBuffer;
  try {
    thumbBuffer = await sharp(fileBuffer)
      .resize(350, 350, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
  } catch (thumbErr) {
    console.warn(`[AWS S3] Thumbnail generation notice for "${originalName}":`, thumbErr.message);
    thumbBuffer = fileBuffer;
  }

  // 3. Upload thumbnail to S3 with SSE-S3
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: thumbKey,
      Body: thumbBuffer,
      ContentType: "image/jpeg",
      ServerSideEncryption: "AES256",
      CacheControl: "private, max-age=31536000",
    })
  );

  // 4. Generate presigned URLs for the immediate API response
  const [signedViewUrl, signedThumbUrl, signedDownUrl] = await Promise.all([
    getSignedViewUrl(photoKey, 3600),
    getSignedViewUrl(thumbKey, 3600),
    getSignedDownloadUrl(photoKey, originalName, 3600),
  ]);

  return {
    fileId: photoKey, // Permanent S3 Key stored in DB
    filePath: photoKey, // Permanent S3 Key stored in DB
    thumbKey: thumbKey, // Permanent S3 Thumbnail Key stored in DB
    url: signedViewUrl, // Presigned temporary URL for immediate frontend view
    thumbnailUrl: signedThumbUrl, // Presigned temporary URL for immediate frontend view
    downloadUrl: signedDownUrl, // Presigned temporary URL for immediate download
    name: originalName || path.basename(photoKey),
    size: fileBuffer.length,
  };
}

/**
 * Deletes a photo and its associated thumbnail from the private S3 bucket
 * @param {string} fileId - S3 Object Key
 */
async function deleteImage(fileId) {
  if (!fileId) return;
  const s3 = getS3Client();
  const bucket = getBucketName();

  try {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: fileId,
      })
    );

    // Delete matching thumbnail key
    if (fileId.includes("/photos/")) {
      const thumbKey = getThumbnailKey(fileId);
      await s3.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: thumbKey,
        })
      ).catch(() => {});
    }
  } catch (err) {
    if (err.name !== "NoSuchKey" && err.$metadata?.httpStatusCode !== 404) {
      console.warn(`[AWS S3] Delete object warning for "${fileId}":`, err.message);
    }
  }
}

/**
 * Bulk deletes multiple photos and their thumbnails from S3
 * @param {string[]} fileIds - Array of S3 object keys
 */
async function bulkDeleteImages(fileIds) {
  if (!Array.isArray(fileIds) || fileIds.length === 0) return;
  const s3 = getS3Client();
  const bucket = getBucketName();

  const allKeys = new Set();
  fileIds.filter(Boolean).forEach((id) => {
    allKeys.add(id);
    if (id.includes("/photos/")) {
      allKeys.add(getThumbnailKey(id));
    }
  });

  const keysArray = Array.from(allKeys);
  if (keysArray.length === 0) return;

  const CHUNK_SIZE = 1000;
  for (let i = 0; i < keysArray.length; i += CHUNK_SIZE) {
    const chunk = keysArray.slice(i, i + CHUNK_SIZE);
    try {
      await s3.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: {
            Objects: chunk.map((Key) => ({ Key })),
            Quiet: true,
          },
        })
      );
    } catch (err) {
      console.warn("[AWS S3] Bulk delete error:", err.message);
    }
  }
}

/**
 * Deletes all objects under an event folder prefix in S3 (events/${eventId}/)
 * @param {string} eventId - Wedding Event ID
 */
async function deleteFolder(eventId) {
  if (!eventId) return;
  const s3 = getS3Client();
  const bucket = getBucketName();
  const prefix = `events/${eventId}/`;

  try {
    let continuationToken = undefined;
    do {
      const listRes = await s3.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        })
      );

      if (listRes.Contents && listRes.Contents.length > 0) {
        const objectsToDelete = listRes.Contents.map((obj) => ({ Key: obj.Key }));
        await s3.send(
          new DeleteObjectsCommand({
            Bucket: bucket,
            Delete: {
              Objects: objectsToDelete,
              Quiet: true,
            },
          })
        );
      }

      continuationToken = listRes.IsTruncated ? listRes.NextContinuationToken : undefined;
    } while (continuationToken);
  } catch (err) {
    console.warn(`[AWS S3] Delete folder error for event "${eventId}":`, err.message);
  }
}

/**
 * Returns a readable stream from S3 for server proxying or streaming
 * @param {string} fileId - S3 Object Key
 */
async function getObjectStream(fileId) {
  const s3 = getS3Client();
  const bucket = getBucketName();

  const response = await s3.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: fileId,
    })
  );

  return {
    stream: response.Body,
    contentType: response.ContentType || "image/jpeg",
    contentLength: response.ContentLength,
  };
}

let usageCache = { data: null, timestamp: 0 };
const CACHE_TTL = 30 * 1000;

/**
 * Retrieves storage usage statistics from database records
 * @param {boolean} forceRefresh
 */
async function getStorageUsage(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && usageCache.data && now - usageCache.timestamp < CACHE_TTL) {
    return usageCache.data;
  }

  let totalBytes = 0;
  let totalFiles = 0;
  const storageLimitGB = parseFloat(process.env.AWS_S3_STORAGE_LIMIT_GB) || 1024;
  const totalLimitBytes = storageLimitGB * 1024 * 1024 * 1024;

  try {
    const mongoose = require("mongoose");
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      const Photo = require("../models/Photo");
      const stats = await Photo.aggregate([
        {
          $group: {
            _id: null,
            totalBytes: { $sum: "$fileSize" },
            count: { $sum: 1 },
          },
        },
      ]);

      if (stats && stats.length > 0) {
        totalBytes = stats[0].totalBytes || 0;
        totalFiles = stats[0].count || 0;
      }
    }
  } catch (e) {
    // Mongo fallback
  }

  const result = {
    mediaLibraryStorageBytes: totalBytes,
    totalQuotaBytes: totalLimitBytes,
    fileCount: totalFiles,
    storageLimitGB,
    storageLimitTB: parseFloat((storageLimitGB / 1024).toFixed(2)),
    fetchedAt: new Date().toISOString(),
    planName:
      storageLimitGB >= 1024
        ? `AWS S3 Private Storage (${(storageLimitGB / 1024).toFixed(0)} TB Plan)`
        : `AWS S3 Private Storage (${storageLimitGB} GB Plan)`,
    upgradeUrl: "https://s3.console.aws.amazon.com/s3/buckets/pixora-images-2026",
  };

  usageCache = { data: result, timestamp: now };
  return result;
}

function invalidateStorageUsageCache() {
  usageCache.data = null;
  usageCache.timestamp = 0;
}

module.exports = {
  getS3Client,
  getBucketName,
  getSignedViewUrl,
  getSignedDownloadUrl,
  resolvePhotoUrls,
  uploadImage,
  deleteImage,
  bulkDeleteImages,
  deleteFolder,
  getObjectStream,
  getStorageUsage,
  invalidateStorageUsageCache,
};
