const Photo = require("../models/Photo");
const { getStorageUsage } = require("../services/imagekitService");

// Default 3 GB limit in bytes
const DEFAULT_STORAGE_LIMIT_BYTES = 3 * 1024 * 1024 * 1024; // 3,221,225,472 bytes
const DEFAULT_ESTIMATED_PHOTO_LIMIT = 1200; // ~2.5 MB per photo on 3 GB

async function getStorageStats(req, res) {
  try {
    const forceRefresh = req.query.force === "true" || req.query.refresh === "1";
    const usageData = await getStorageUsage(forceRefresh);

    // Get count of photos saved in DB
    const dbPhotoCount = await Photo.countDocuments();
    const photoCount = Math.max(dbPhotoCount, usageData.ikFileCount || 0);

    const storageLimitBytes = process.env.IMAGEKIT_STORAGE_LIMIT_BYTES
      ? parseInt(process.env.IMAGEKIT_STORAGE_LIMIT_BYTES, 10)
      : process.env.IMAGEKIT_STORAGE_LIMIT_GB
      ? parseFloat(process.env.IMAGEKIT_STORAGE_LIMIT_GB) * 1024 * 1024 * 1024
      : DEFAULT_STORAGE_LIMIT_BYTES;

    const storageUsedBytes = usageData.mediaLibraryStorageBytes || 0;
    const bandwidthBytes = usageData.bandwidthBytes || 0;

    const storagePercentage = Math.min(
      100,
      parseFloat(((storageUsedBytes / storageLimitBytes) * 100).toFixed(1))
    );

    const storageUsedMB = parseFloat((storageUsedBytes / (1024 * 1024)).toFixed(2));
    const storageLimitMB = Math.round(storageLimitBytes / (1024 * 1024));
    const storageUsedGB = parseFloat((storageUsedBytes / (1024 * 1024 * 1024)).toFixed(3));
    const storageLimitGB = parseFloat((storageLimitBytes / (1024 * 1024 * 1024)).toFixed(1));

    const remainingBytes = Math.max(0, storageLimitBytes - storageUsedBytes);
    const remainingMB = parseFloat((remainingBytes / (1024 * 1024)).toFixed(2));
    const remainingGB = parseFloat((remainingBytes / (1024 * 1024 * 1024)).toFixed(3));

    // Dynamic or baseline photo capacity estimate
    let photoLimitEstimated = DEFAULT_ESTIMATED_PHOTO_LIMIT;
    if (photoCount > 5 && storageUsedBytes > 0) {
      const avgPhotoSize = storageUsedBytes / photoCount;
      if (avgPhotoSize > 100 * 1024) {
        photoLimitEstimated = Math.max(photoCount, Math.round(storageLimitBytes / avgPhotoSize));
      }
    }

    const isFull = storageUsedBytes >= storageLimitBytes;
    const isNearFull = storagePercentage >= 90;

    res.json({
      success: true,
      storageUsed: storageUsedBytes,
      storageLimit: storageLimitBytes,
      storageUsedMB,
      storageLimitMB,
      storageUsedGB,
      storageLimitGB,
      storageRemainingBytes: remainingBytes,
      storageRemainingMB: remainingMB,
      storageRemainingGB: remainingGB,
      storagePercentage,
      photoCount,
      photoLimitEstimated,
      bandwidthUsedBytes: bandwidthBytes,
      bandwidthUsedMB: parseFloat((bandwidthBytes / (1024 * 1024)).toFixed(2)),
      bandwidthUsedGB: parseFloat((bandwidthBytes / (1024 * 1024 * 1024)).toFixed(3)),
      bandwidthLimitGB: 20,
      isFull,
      isNearFull,
      planName: "ImageKit Free Plan (3 GB)",
      upgradeUrl: process.env.IMAGEKIT_UPGRADE_URL || "https://imagekit.io/plans",
      lastUpdated: usageData.fetchedAt || new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error retrieving storage stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve storage statistics from ImageKit.",
      error: error.message,
    });
  }
}

module.exports = {
  getStorageStats,
};
