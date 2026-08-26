const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Readable } = require("stream");
const { google } = require("googleapis");

const DEFAULT_PARENT_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || "1PY8F-rEV6IIuV6HRzMW8uFxVF5xigDL2";
const DEFAULT_STORAGE_LIMIT_TB = parseFloat(process.env.GOOGLE_DRIVE_STORAGE_LIMIT_TB || "5");
const DEFAULT_STORAGE_LIMIT_BYTES = DEFAULT_STORAGE_LIMIT_TB * 1024 * 1024 * 1024 * 1024; // 5 TB

const LOCAL_UPLOADS_ROOT = path.join(__dirname, "../uploads/events");
if (!fs.existsSync(LOCAL_UPLOADS_ROOT)) {
  fs.mkdirSync(LOCAL_UPLOADS_ROOT, { recursive: true });
}

let driveClientInstance = null;
let eventFolderCache = {};
let verifiedParentFolderId = null;

// Registry to map local fileIds to their actual disk paths
const localFileRegistryPath = path.join(__dirname, "../uploads/file_registry.json");
let localFileRegistry = {};
try {
  if (fs.existsSync(localFileRegistryPath)) {
    localFileRegistry = JSON.parse(fs.readFileSync(localFileRegistryPath, "utf-8"));
  }
} catch (e) {
  localFileRegistry = {};
}

function saveLocalRegistry() {
  try {
    fs.writeFileSync(localFileRegistryPath, JSON.stringify(localFileRegistry, null, 2), "utf-8");
  } catch (e) {
    console.warn("Could not write file_registry.json:", e.message);
  }
}

/**
 * Resolves the parent folder ID or auto-discovers Wedding_Photos folder
 */
async function resolveParentFolderId(drive) {
  if (verifiedParentFolderId) {
    return verifiedParentFolderId;
  }

  const configuredId = process.env.GOOGLE_DRIVE_FOLDER_ID || DEFAULT_PARENT_FOLDER_ID;

  // 1. Try configured folder ID
  try {
    const res = await drive.files.get({
      fileId: configuredId,
      fields: "id, name",
      supportsAllDrives: true,
    });
    if (res.data && res.data.id) {
      verifiedParentFolderId = res.data.id;
      return verifiedParentFolderId;
    }
  } catch (err) {
    console.warn(`Configured parent folder ID "${configuredId}" not directly accessible (${err.message}), searching for Wedding_Photos folder...`);
  }

  // 2. Search for any folder named 'Wedding_Photos' shared with this account
  try {
    const searchRes = await drive.files.list({
      q: `name = 'Wedding_Photos' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: "files(id, name)",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    if (searchRes.data.files && searchRes.data.files.length > 0) {
      verifiedParentFolderId = searchRes.data.files[0].id;
      console.log(` Automatically discovered "Wedding_Photos" folder ID: ${verifiedParentFolderId}`);
      return verifiedParentFolderId;
    }
  } catch (searchErr) {
    console.warn("Folder search error:", searchErr.message);
  }

  verifiedParentFolderId = configuredId;
  return verifiedParentFolderId;
}

/**
 * Initializes and returns authenticated Google Drive API v3 client
 */
function getDriveClient() {
  if (driveClientInstance) {
    return driveClientInstance;
  }

  let authClient = null;

  // 1. Priority: If OAuth2 credentials with refresh token are present, use OAuth2 (operates with user's 5TB quota)
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN) {
    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI || "http://localhost:4000/api/admin/auth/google/callback"
      );
      oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
      authClient = oauth2Client;
    } catch (oauthErr) {
      console.warn("Failed to initialize Google OAuth2 client:", oauthErr.message);
    }
  }

  // 2. Try credentials JSON file (configured path or default location)
  if (!authClient) {
    const configuredCredPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const possibleCredPaths = [
      configuredCredPath ? path.resolve(configuredCredPath) : null,
      path.join(__dirname, "../google-credentials.json"),
      path.join(__dirname, "../../google-credentials.json"),
      path.join(process.cwd(), "google-credentials.json"),
      path.join(process.cwd(), "server/google-credentials.json"),
    ].filter(Boolean);

    for (const credPath of possibleCredPaths) {
      if (fs.existsSync(credPath)) {
        try {
          authClient = new google.auth.GoogleAuth({
            keyFile: credPath,
            scopes: ["https://www.googleapis.com/auth/drive"],
          });
          break;
        } catch (err) {
          console.warn(`Failed to load Google credentials from ${credPath}:`, err.message);
        }
      }
    }
  }

  // 3. Fallback to environment variable Service Account credentials
  if (!authClient && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    try {
      const formattedKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n");
      authClient = new google.auth.JWT(
        process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        null,
        formattedKey,
        ["https://www.googleapis.com/auth/drive"]
      );
    } catch (jwtErr) {
      console.warn("Failed to initialize Google JWT credentials:", jwtErr.message);
    }
  }

  driveClientInstance = google.drive({
    version: "v3",
    auth: authClient,
  });

  return driveClientInstance;
}

/**
 * Generates OAuth2 Authorization URL
 */
function getOAuth2AuthUrl() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured in .env");
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || "http://localhost:4000/api/admin/auth/google/callback"
  );

  const scopes = [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/drive.file",
  ];

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: scopes,
  });
}

/**
 * Exchanges authorization code for OAuth2 tokens and saves refresh token
 */
async function handleOAuth2Callback(code) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || "http://localhost:4000/api/admin/auth/google/callback"
  );

  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  if (tokens.refresh_token) {
    process.env.GOOGLE_REFRESH_TOKEN = tokens.refresh_token;

    // Persist refresh token to server/.env
    const envPath = path.join(__dirname, "../.env");
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, "utf-8");
      if (envContent.includes("GOOGLE_REFRESH_TOKEN=")) {
        envContent = envContent.replace(/GOOGLE_REFRESH_TOKEN=.*/g, `GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
      } else {
        envContent += `\nGOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`;
      }
      fs.writeFileSync(envPath, envContent, "utf-8");
    }
  }

  // Reset drive client instance to use the newly authenticated OAuth client
  driveClientInstance = google.drive({
    version: "v3",
    auth: oauth2Client,
  });

  return tokens;
}

/**
 * Finds or creates an event subfolder inside the parent Google Drive folder
 */
async function getOrCreateEventFolder(eventId) {
  if (eventFolderCache[eventId]) {
    return eventFolderCache[eventId];
  }

  const drive = getDriveClient();
  const parentFolderId = await resolveParentFolderId(drive);

  try {
    // Check if event folder already exists inside parent folder
    const listRes = await drive.files.list({
      q: `'${parentFolderId}' in parents and name = '${eventId}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: "files(id, name)",
      spaces: "drive",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    if (listRes.data.files && listRes.data.files.length > 0) {
      const folderId = listRes.data.files[0].id;
      eventFolderCache[eventId] = folderId;
      return folderId;
    }

    // Create the event folder if not found
    const createRes = await drive.files.create({
      requestBody: {
        name: eventId,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentFolderId],
      },
      fields: "id, name",
      supportsAllDrives: true,
    });

    const newFolderId = createRes.data.id;
    eventFolderCache[eventId] = newFolderId;
    return newFolderId;
  } catch (err) {
    console.error(`Error resolving Google Drive event folder for "${eventId}":`, err.message);
    return parentFolderId;
  }
}

let serviceAccountQuotaBlocked = false;

/**
 * Uploads an image with automatic multi-tier failover (Google Drive → High-Performance Server Storage)
 */
async function uploadImage(fileBuffer, originalName, eventId, mimeType = "image/jpeg") {
  const safeFileName = path.basename(originalName || `photo_${Date.now()}.jpg`);
  const contentHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
  let uploadedToDrive = false;
  let fileId = null;
  let fileSize = fileBuffer.length;

  // Check if this exact file (by hash/name/event) already exists in local registry (Idempotency)
  const existingLocalEntry = Object.entries(localFileRegistry).find(
    ([id, meta]) => meta.eventId === eventId && meta.hash === contentHash
  );

  if (existingLocalEntry) {
    const [existingId, meta] = existingLocalEntry;
    if (fs.existsSync(meta.diskPath)) {
      return {
        fileId: existingId,
        url: `/api/photos/file/${existingId}`,
        thumbnailUrl: `/api/photos/file/${existingId}?size=thumbnail`,
        downloadUrl: `/api/photos/download/${existingId}`,
        filePath: `Wedding_Photos/${eventId}/${meta.name}`,
        fileSize: meta.size,
        mimeType: meta.mimeType || mimeType,
      };
    }
  }

  // 1. Try uploading to Google Drive if OAuth is configured or Service Account has not been quota-blocked
  const hasOAuth = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN);
  const shouldAttemptDrive = hasOAuth || !serviceAccountQuotaBlocked;

  if (shouldAttemptDrive) {
    try {
      const drive = getDriveClient();
      const targetFolderId = await getOrCreateEventFolder(eventId);
      const stream = Readable.from(fileBuffer);

      const fileMetadata = {
        name: safeFileName,
        parents: [targetFolderId],
      };

      const media = {
        mimeType: mimeType || "image/jpeg",
        body: stream,
      };

      const uploadRes = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: "id, name, mimeType, size, webViewLink, webContentLink",
        supportsAllDrives: true,
      });

      if (uploadRes.data && uploadRes.data.id) {
        fileId = uploadRes.data.id;
        fileSize = parseInt(uploadRes.data.size || fileBuffer.length, 10);
        uploadedToDrive = true;

        // Set public permission asynchronously
        drive.permissions.create({
          fileId: fileId,
          requestBody: { role: "reader", type: "anyone" },
          supportsAllDrives: true,
        }).catch(() => {});
      }
    } catch (driveErr) {
      if (driveErr.message && driveErr.message.includes("quota")) {
        serviceAccountQuotaBlocked = true;
      }
      console.warn(`[Storage Engine] Google Drive upload notice for "${safeFileName}" (${driveErr.message}). Storing securely in high-performance storage.`);
    }
  }

  // 2. If Google Drive upload was prevented by quota or failed, save seamlessly to local event storage
  if (!uploadedToDrive || !fileId) {
    const eventDir = path.join(LOCAL_UPLOADS_ROOT, eventId);
    if (!fs.existsSync(eventDir)) {
      fs.mkdirSync(eventDir, { recursive: true });
    }

    const uniqueId = `loc_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const ext = path.extname(safeFileName) || ".jpg";
    const diskFileName = `${uniqueId}${ext}`;
    const diskFilePath = path.join(eventDir, diskFileName);

    fs.writeFileSync(diskFilePath, fileBuffer);

    fileId = uniqueId;
    localFileRegistry[fileId] = {
      diskPath: diskFilePath,
      name: safeFileName,
      hash: contentHash,
      mimeType: mimeType || "image/jpeg",
      size: fileBuffer.length,
      eventId: eventId,
      createdAt: new Date().toISOString(),
    };
    saveLocalRegistry();
  }

  const url = `/api/photos/file/${fileId}`;
  const thumbnailUrl = `/api/photos/file/${fileId}?size=thumbnail`;
  const downloadUrl = `/api/photos/download/${fileId}`;
  const filePath = `Wedding_Photos/${eventId}/${safeFileName}`;

  return {
    fileId,
    url,
    thumbnailUrl,
    downloadUrl,
    filePath,
    fileSize,
    mimeType: mimeType || "image/jpeg",
  };
}

/**
 * Retrieves a readable stream for streaming/proxying to clients
 */
async function getFileStream(fileId) {
  // 1. Check local file registry first
  if (localFileRegistry[fileId] && fs.existsSync(localFileRegistry[fileId].diskPath)) {
    const info = localFileRegistry[fileId];
    return {
      stream: fs.createReadStream(info.diskPath),
      metadata: {
        id: fileId,
        name: info.name,
        mimeType: info.mimeType,
        size: info.size,
      },
    };
  }

  // 2. Search local directories as fallback
  if (fileId.startsWith("loc_")) {
    const eventDirs = fs.existsSync(LOCAL_UPLOADS_ROOT) ? fs.readdirSync(LOCAL_UPLOADS_ROOT) : [];
    for (const ed of eventDirs) {
      const fullDir = path.join(LOCAL_UPLOADS_ROOT, ed);
      if (fs.statSync(fullDir).isDirectory()) {
        const files = fs.readdirSync(fullDir);
        const match = files.find((f) => f.startsWith(fileId));
        if (match) {
          const filePath = path.join(fullDir, match);
          const stat = fs.statSync(filePath);
          return {
            stream: fs.createReadStream(filePath),
            metadata: {
              id: fileId,
              name: match,
              mimeType: "image/jpeg",
              size: stat.size,
            },
          };
        }
      }
    }
  }

  // 3. Retrieve from Google Drive API
  const drive = getDriveClient();
  const metadataRes = await drive.files.get({
    fileId,
    fields: "id, name, mimeType, size",
    supportsAllDrives: true,
  });

  const streamRes = await drive.files.get(
    {
      fileId,
      alt: "media",
      supportsAllDrives: true,
    },
    { responseType: "stream" }
  );

  return {
    stream: streamRes.data,
    metadata: metadataRes.data,
  };
}

/**
 * Gets file metadata
 */
async function getFileMetadata(fileId) {
  if (localFileRegistry[fileId]) {
    return localFileRegistry[fileId];
  }
  const drive = getDriveClient();
  const res = await drive.files.get({
    fileId,
    fields: "id, name, mimeType, size, webViewLink, webContentLink, createdTime",
    supportsAllDrives: true,
  });
  return res.data;
}

/**
 * Deletes a file by File ID
 */
async function deleteImage(fileId) {
  if (!fileId) return;

  // 1. Delete from local registry & disk if present
  if (localFileRegistry[fileId]) {
    try {
      if (fs.existsSync(localFileRegistry[fileId].diskPath)) {
        fs.unlinkSync(localFileRegistry[fileId].diskPath);
      }
      delete localFileRegistry[fileId];
      saveLocalRegistry();
    } catch (e) {
      console.warn(`Could not delete local file ${fileId}:`, e.message);
    }
  }

  // 2. Delete from Google Drive if present
  try {
    const drive = getDriveClient();
    await drive.files.delete({
      fileId,
      supportsAllDrives: true,
    });
  } catch (err) {
    if (err.code !== 404 && err.status !== 404) {
      // Suppress normal 404
    }
  }
}

/**
 * Deletes multiple files
 */
async function bulkDeleteImages(fileIds) {
  if (!Array.isArray(fileIds) || fileIds.length === 0) return;
  await Promise.allSettled(fileIds.filter(Boolean).map((id) => deleteImage(id)));
}

/**
 * Deletes an event folder
 */
async function deleteFolder(eventId) {
  if (!eventId) return;

  // 1. Remove local event directory
  try {
    const localDir = path.join(LOCAL_UPLOADS_ROOT, eventId);
    if (fs.existsSync(localDir)) {
      fs.rmSync(localDir, { recursive: true, force: true });
    }
    // Clean up registry items for this event
    Object.keys(localFileRegistry).forEach((key) => {
      if (localFileRegistry[key].eventId === eventId) {
        delete localFileRegistry[key];
      }
    });
    saveLocalRegistry();
  } catch (e) {
    console.warn(`Error deleting local folder for "${eventId}":`, e.message);
  }

  // 2. Remove Google Drive event folder
  try {
    const drive = getDriveClient();
    const parentFolderId = await resolveParentFolderId(drive);

    if (eventFolderCache[eventId]) {
      const folderId = eventFolderCache[eventId];
      delete eventFolderCache[eventId];
      await drive.files.delete({ fileId: folderId, supportsAllDrives: true }).catch(() => {});
      return;
    }

    const listRes = await drive.files.list({
      q: `'${parentFolderId}' in parents and name = '${eventId}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: "files(id, name)",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    if (listRes.data.files && listRes.data.files.length > 0) {
      for (const folder of listRes.data.files) {
        await drive.files.delete({ fileId: folder.id, supportsAllDrives: true }).catch(() => {});
      }
    }
  } catch (err) {
    console.warn(`Failed to delete Google Drive folder for "${eventId}":`, err.message);
  }
}

// In-memory cache for storage usage to reduce API calls
let usageCache = {
  data: null,
  timestamp: 0,
};
const CACHE_TTL_MS = 30 * 1000; // 30 seconds TTL

/**
 * Calculates storage usage statistics
 */
async function getStorageUsage(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && usageCache.data && now - usageCache.timestamp < CACHE_TTL_MS) {
    return usageCache.data;
  }

  let storageUsedBytes = 0;
  let totalQuotaBytes = DEFAULT_STORAGE_LIMIT_BYTES;
  let totalFileCount = 0;

  // 1. Calculate local storage size
  try {
    if (fs.existsSync(LOCAL_UPLOADS_ROOT)) {
      const getDirSize = (dir) => {
        let size = 0;
        let count = 0;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            const sub = getDirSize(full);
            size += sub.size;
            count += sub.count;
          } else if (entry.isFile()) {
            size += fs.statSync(full).size;
            count++;
          }
        }
        return { size, count };
      };

      const localMetrics = getDirSize(LOCAL_UPLOADS_ROOT);
      storageUsedBytes += localMetrics.size;
      totalFileCount += localMetrics.count;
    }
  } catch (localErr) {
    console.warn("Could not calculate local storage size:", localErr.message);
  }

  // 2. Query Google Drive size if connected
  try {
    const drive = getDriveClient();
    const aboutRes = await drive.about.get({ fields: "storageQuota" }).catch(() => null);
    if (aboutRes && aboutRes.data && aboutRes.data.storageQuota) {
      const q = aboutRes.data.storageQuota;
      if (q.usageInDrive) storageUsedBytes = Math.max(storageUsedBytes, parseInt(q.usageInDrive, 10));
      if (q.limit) totalQuotaBytes = parseInt(q.limit, 10);
    }
  } catch (e) {}

  const result = {
    mediaLibraryStorageBytes: storageUsedBytes,
    totalQuotaBytes,
    driveFileCount: totalFileCount,
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
  eventFolderCache = {};
  verifiedParentFolderId = null;
}

module.exports = {
  getDriveClient,
  uploadImage,
  deleteImage,
  bulkDeleteImages,
  deleteFolder,
  getFileStream,
  getFileMetadata,
  getOrCreateEventFolder,
  getStorageUsage,
  invalidateStorageUsageCache,
  getOAuth2AuthUrl,
  handleOAuth2Callback,
};
