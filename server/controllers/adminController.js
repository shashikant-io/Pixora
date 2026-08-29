const Photo = require("../models/Photo");
const { getStorageUsage } = require("../services/imagekitService");

const DEFAULT_STORAGE_LIMIT_GB = 20; // 20 GB ImageKit Tier
const DEFAULT_STORAGE_LIMIT_BYTES = DEFAULT_STORAGE_LIMIT_GB * 1024 * 1024 * 1024;
const DEFAULT_ESTIMATED_PHOTO_LIMIT = Math.round((DEFAULT_STORAGE_LIMIT_GB * 1024) / 4); // ~5,000 photos

async function getStorageStats(req, res) {
  try {
    const forceRefresh = req.query.force === "true" || req.query.refresh === "1";
    const usageData = await getStorageUsage(forceRefresh);

    const dbPhotoCount = await Photo.countDocuments();
    const photoCount = Math.max(dbPhotoCount, usageData.fileCount || 0);

    const storageLimitBytes = usageData.totalQuotaBytes || DEFAULT_STORAGE_LIMIT_BYTES;
    const storageUsedBytes = usageData.mediaLibraryStorageBytes || 0;

    const storagePercentage = Math.min(
      100,
      parseFloat(((storageUsedBytes / storageLimitBytes) * 100).toFixed(2))
    );

    const storageUsedMB = parseFloat((storageUsedBytes / (1024 * 1024)).toFixed(2));
    const storageLimitMB = Math.round(storageLimitBytes / (1024 * 1024));
    const storageUsedGB = parseFloat((storageUsedBytes / (1024 * 1024 * 1024)).toFixed(3));
    const storageLimitGB = parseFloat((storageLimitBytes / (1024 * 1024 * 1024)).toFixed(1));

    const remainingBytes = Math.max(0, storageLimitBytes - storageUsedBytes);
    const remainingMB = parseFloat((remainingBytes / (1024 * 1024)).toFixed(2));
    const remainingGB = parseFloat((remainingBytes / (1024 * 1024 * 1024)).toFixed(3));

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
      isFull,
      isNearFull,
      planName: `ImageKit.io CDN (${storageLimitGB} GB Free Plan)`,
      upgradeUrl: "https://imagekit.io/dashboard/developer",
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

const User = require("../models/User");

async function getUsersActivity(req, res) {
  try {
    const users = await User.find().sort({ lastLoginAt: -1, createdAt: -1 }).lean();

    const totalUsers = users.length;
    const totalCustomers = users.filter((u) => u.role === "customer").length;
    const totalAdmins = users.filter((u) => u.role === "admin").length;

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeLast24h = users.filter(
      (u) => (u.lastLoginAt && new Date(u.lastLoginAt) >= oneDayAgo) || (u.createdAt && new Date(u.createdAt) >= oneDayAgo)
    ).length;

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalCustomers,
        totalAdmins,
        activeLast24h,
      },
      users: users.map((u) => ({
        id: u._id,
        email: u.email,
        name: u.name || (u.role === "admin" ? "Photographer Admin" : "Guest User"),
        role: u.role,
        picture: u.picture || null,
        lastLoginAt: u.lastLoginAt || u.createdAt,
        createdAt: u.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching user activity:", error);
    res.status(500).json({
      success: false,
      message: "Could not fetch user activity.",
      error: error.message,
    });
  }
}

module.exports = {
  getStorageStats,
  getUsersActivity,
};

