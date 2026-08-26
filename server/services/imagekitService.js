const ImageKit = require("imagekit");

let imagekitInstance = null;

function getImageKitClient() {
  if (imagekitInstance) {
    return imagekitInstance;
  }

  const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;

  if (!publicKey || !privateKey || !urlEndpoint) {
    console.error("ImageKit credentials missing in environment variables.");
  }

  imagekitInstance = new ImageKit({
    publicKey: publicKey || "",
    privateKey: privateKey || "",
    urlEndpoint: urlEndpoint || "",
  });

  return imagekitInstance;
}

/**
 * Uploads an image buffer directly to ImageKit CDN
 * @param {Buffer} fileBuffer - Image binary buffer
 * @param {string} originalName - Original file name
 * @param {string} eventId - Associated wedding event ID
 * @returns {Promise<{fileId: string, url: string, thumbnailUrl: string, downloadUrl: string, filePath: string, size: number}>}
 */
async function uploadImage(fileBuffer, originalName, eventId) {
  const imagekit = getImageKitClient();
  const folder = `/wedding-photo-finder/events/${eventId}/photos`;
  const safeName = originalName || `photo_${Date.now()}.jpg`;

  const response = await imagekit.upload({
    file: fileBuffer.toString("base64"),
    fileName: safeName,
    folder: folder,
    tags: [eventId, "wedding-photo"],
    useUniqueFileName: true,
  });

  const thumbnailUrl = imagekit.url({
    src: response.url,
    transformation: [
      {
        height: "300",
        width: "300",
        quality: "80",
        crop: "maintain_ratio",
      },
    ],
  });

  const downloadUrl = `${response.url}?ik-attachment=true`;

  return {
    fileId: response.fileId,
    url: response.url,
    thumbnailUrl: thumbnailUrl || response.thumbnailUrl || response.url,
    downloadUrl: downloadUrl,
    filePath: response.filePath,
    name: response.name,
    size: response.size || fileBuffer.length,
  };
}

/**
 * Deletes a single image from ImageKit
 * @param {string} fileId - ImageKit file ID
 */
async function deleteImage(fileId) {
  if (!fileId) return;
  const imagekit = getImageKitClient();
  try {
    await imagekit.deleteFile(fileId);
  } catch (err) {
    if (err.statusCode !== 404) {
      console.warn(`Failed to delete ImageKit file "${fileId}":`, err.message);
    }
  }
}

/**
 * Deletes multiple images from ImageKit
 * @param {string[]} fileIds - Array of ImageKit file IDs
 */
async function bulkDeleteImages(fileIds) {
  if (!Array.isArray(fileIds) || fileIds.length === 0) return;
  const imagekit = getImageKitClient();
  const validIds = fileIds.filter(Boolean);

  if (validIds.length === 0) return;

  try {
    if (typeof imagekit.bulkDeleteFiles === "function") {
      await imagekit.bulkDeleteFiles(validIds);
    } else {
      await Promise.allSettled(validIds.map((id) => imagekit.deleteFile(id)));
    }
  } catch (err) {
    console.warn("Bulk delete from ImageKit notice:", err.message);
  }
}

/**
 * Deletes an entire event folder from ImageKit
 * @param {string} eventId - Wedding Event ID
 */
async function deleteFolder(eventId) {
  if (!eventId) return;
  const imagekit = getImageKitClient();
  const folderPath = `/wedding-photo-finder/events/${eventId}`;

  try {
    if (typeof imagekit.deleteFolder === "function") {
      await imagekit.deleteFolder(folderPath);
    }
  } catch (err) {
    if (err.statusCode !== 404) {
      console.warn(`Failed to delete ImageKit folder "${folderPath}":`, err.message);
    }
  }
}

let usageCache = { data: null, timestamp: 0 };
const CACHE_TTL = 30 * 1000;

/**
 * Retrieves storage usage statistics
 */
async function getStorageUsage(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && usageCache.data && now - usageCache.timestamp < CACHE_TTL) {
    return usageCache.data;
  }

  let totalBytes = 0;
  let totalFiles = 0;
  const totalLimitBytes = 20 * 1024 * 1024 * 1024; // 20 GB ImageKit Tier

  try {
    const mongoose = require("mongoose");
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      const Photo = require("../models/Photo");
      const photos = await Photo.find({}, "fileSize");
      totalFiles = photos.length;
      totalBytes = photos.reduce((sum, p) => sum + (p.fileSize || 0), 0);
    }
  } catch (e) {
    // DB fallback
  }

  const result = {
    mediaLibraryStorageBytes: totalBytes,
    totalQuotaBytes: totalLimitBytes,
    fileCount: totalFiles,
    fetchedAt: new Date().toISOString(),
  };

  usageCache = { data: result, timestamp: now };
  return result;
}

function invalidateStorageUsageCache() {
  usageCache.data = null;
  usageCache.timestamp = 0;
}

module.exports = {
  getImageKitClient,
  uploadImage,
  deleteImage,
  bulkDeleteImages,
  deleteFolder,
  getStorageUsage,
  invalidateStorageUsageCache,
};
