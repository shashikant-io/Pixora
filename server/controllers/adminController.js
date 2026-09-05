const Photo = require("../models/Photo");
const { getStorageUsage } = require("../services/s3Service");

const DEFAULT_STORAGE_LIMIT_GB = parseFloat(process.env.AWS_S3_STORAGE_LIMIT_GB) || 1024; // 1024 GB (1 TB) AWS S3 Tier
const DEFAULT_STORAGE_LIMIT_BYTES = DEFAULT_STORAGE_LIMIT_GB * 1024 * 1024 * 1024;
const DEFAULT_ESTIMATED_PHOTO_LIMIT = Math.round((DEFAULT_STORAGE_LIMIT_GB * 1024) / 4); // ~262,000 photos

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
    const storageLimitTB = parseFloat((storageLimitGB / 1024).toFixed(2));

    const remainingBytes = Math.max(0, storageLimitBytes - storageUsedBytes);
    const remainingMB = parseFloat((remainingBytes / (1024 * 1024)).toFixed(2));
    const remainingGB = parseFloat((remainingBytes / (1024 * 1024 * 1024)).toFixed(3));
    const remainingTB = parseFloat((remainingGB / 1024).toFixed(2));

    let photoLimitEstimated = DEFAULT_ESTIMATED_PHOTO_LIMIT;
    if (photoCount > 5 && storageUsedBytes > 0) {
      const avgPhotoSize = storageUsedBytes / photoCount;
      if (avgPhotoSize > 100 * 1024) {
        photoLimitEstimated = Math.max(photoCount, Math.round(storageLimitBytes / avgPhotoSize));
      }
    }

    const isFull = storageUsedBytes >= storageLimitBytes;
    const isNearFull = storagePercentage >= 90;

    const fallbackPlan =
      storageLimitGB >= 1024
        ? `AWS S3 Private Storage (${(storageLimitGB / 1024).toFixed(0)} TB Plan)`
        : `AWS S3 Private Storage (${storageLimitGB} GB Plan)`;

    res.json({
      success: true,
      storageUsed: storageUsedBytes,
      storageLimit: storageLimitBytes,
      storageUsedMB,
      storageLimitMB,
      storageUsedGB,
      storageLimitGB,
      storageLimitTB,
      storageRemainingBytes: remainingBytes,
      storageRemainingMB: remainingMB,
      storageRemainingGB: remainingGB,
      storageRemainingTB: remainingTB,
      storagePercentage,
      photoCount,
      photoLimitEstimated,
      isFull,
      isNearFull,
      planName: usageData.planName || fallbackPlan,
      upgradeUrl: "https://s3.console.aws.amazon.com/s3/buckets/pixora-images-2026?region=ap-south-1",
      lastUpdated: usageData.fetchedAt || new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error retrieving storage stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve storage statistics from AWS S3.",
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

const Event = require("../models/Event");

async function getDashboardStats(req, res) {
  try {
    const [eventsCount, photosCount, inquiriesCount] = await Promise.all([
      Event.countDocuments(),
      Photo.countDocuments(),
      User.countDocuments({ role: "customer" }),
    ]);

    res.json({
      success: true,
      stats: {
        events: eventsCount,
        photos: photosCount,
        bookings: eventsCount,     // Each event represents a wedding booking
        inquiries: inquiriesCount, // Each customer sign-up represents an inquiry
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({
      success: false,
      message: "Could not fetch dashboard statistics.",
      error: error.message,
    });
  }
}

module.exports = {
  getStorageStats,
  getUsersActivity,
  getDashboardStats,
};

