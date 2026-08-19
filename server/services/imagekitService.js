const ImageKit = require("imagekit");

if (
  !process.env.IMAGEKIT_PUBLIC_KEY ||
  !process.env.IMAGEKIT_PRIVATE_KEY ||
  !process.env.IMAGEKIT_URL_ENDPOINT
) {
  console.error("Missing ImageKit credentials in .env");
  process.exit(1);
}

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

async function uploadImage(fileBuffer, fileName, folder) {
  const result = await imagekit.upload({
    file: fileBuffer,
    fileName,
    folder,
    useUniqueFileName: true,
  });

  return {
    fileId: result.fileId,
    url: result.url,
    filePath: result.filePath,
  };
}

async function deleteImage(fileId) {
  await imagekit.deleteFile(fileId);
}

async function bulkDeleteImages(fileIds) {
  if (!fileIds || fileIds.length === 0) return;
  try {
    if (typeof imagekit.bulkDeleteFiles === "function") {
      await imagekit.bulkDeleteFiles(fileIds);
    } else {
      for (const id of fileIds) {
        await imagekit.deleteFile(id).catch(() => { });
      }
    }
  } catch (err) {
    console.warn("Bulk delete error, falling back to individual deletes:", err.message);
    for (const id of fileIds) {
      await imagekit.deleteFile(id).catch(() => { });
    }
  }
}

async function deleteFolder(folderPath) {
  if (!folderPath) return;
  try {
    if (typeof imagekit.deleteFolder === "function") {
      await imagekit.deleteFolder(folderPath);
    }
  } catch (err) {
    console.warn(`Failed to delete ImageKit folder "${folderPath}":`, err.message);
  }
}

// In-memory cache for storage usage to reduce unnecessary API requests
let usageCache = {
  data: null,
  timestamp: 0,
};
const CACHE_TTL_MS = 30 * 1000; // 30 seconds TTL

async function getStorageUsage(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && usageCache.data && now - usageCache.timestamp < CACHE_TTL_MS) {
    return usageCache.data;
  }

  let mediaLibraryStorageBytes = 0;
  let bandwidthBytes = 0;
  let rawUsage = null;
  let ikFileCount = 0;
  let ikTotalFileBytes = 0;

  // 1. Fetch from ImageKit accounts usage API
  try {
    const today = new Date();
    const prior = new Date();
    prior.setDate(prior.getDate() - 30);
    const startDate = prior.toISOString().split("T")[0];
    const endDate = today.toISOString().split("T")[0];

    const auth = Buffer.from(process.env.IMAGEKIT_PRIVATE_KEY + ":").toString("base64");
    const url = `https://api.imagekit.io/v1/accounts/usage?startDate=${startDate}&endDate=${endDate}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    if (response.ok) {
      rawUsage = await response.json();
      if (rawUsage && typeof rawUsage.mediaLibraryStorageBytes === "number") {
        mediaLibraryStorageBytes = rawUsage.mediaLibraryStorageBytes;
      }
      if (rawUsage && typeof rawUsage.bandwidthBytes === "number") {
        bandwidthBytes = rawUsage.bandwidthBytes;
      }
    } else {
      console.warn(`ImageKit /accounts/usage returned status ${response.status}`);
    }
  } catch (usageErr) {
    console.warn("Failed to fetch ImageKit usage endpoint:", usageErr.message);
  }

  // 2. Query ImageKit files list as verification / fallback
  try {
    const files = await imagekit.listFiles({ limit: 1000 });
    if (Array.isArray(files)) {
      ikFileCount = files.length;
      ikTotalFileBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);

      // If accounts/usage is cached by ImageKit or returned 0, use exact file sizes sum if higher
      if (mediaLibraryStorageBytes === 0 && ikTotalFileBytes > 0) {
        mediaLibraryStorageBytes = ikTotalFileBytes;
      }
    }
  } catch (listErr) {
    console.warn("Failed to list files from ImageKit:", listErr.message);
  }

  const result = {
    mediaLibraryStorageBytes,
    bandwidthBytes,
    ikFileCount,
    ikTotalFileBytes,
    rawUsage,
    fetchedAt: new Date().toISOString(),
  };

  usageCache = {
    data: result,
    timestamp: now,
  };

  return result;
}

function invalidateStorageUsageCache() {
  usageCache.data = null;
  usageCache.timestamp = 0;
}

module.exports = {
  imagekit,
  uploadImage,
  deleteImage,
  bulkDeleteImages,
  deleteFolder,
  getStorageUsage,
  invalidateStorageUsageCache,
};

