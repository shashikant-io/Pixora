const API_BASE_URL = "/api";

let events = [];
let selectedUploadFiles = [];
let storageAutoRefreshTimer = null;

// ==========================================================================
// Lucide SVG Icons Library (Inline Helper)
// ==========================================================================
const ICONS = {
  camera: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>`,
  upload: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>`,
  copy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  checkCircle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  externalLink: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>`,
  calendar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>`,
  mapPin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
  images: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`,
  folder: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>`,
  sparkles: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" /></svg>`,
  refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>`,
  download: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>`,
  x: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
  alertCircle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>`,
  spinner: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="spin-icon"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`,
};

function getIcon(name) {
  return ICONS[name] || "";
}

// ==========================================================================
// Initialization
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  checkServerStatus();
  initStoragePlanCard();
  loadEvents();
  setupAdminUploadControls();
  setupModalHandlers();

  document.getElementById("create-event-form").addEventListener("submit", handleCreateEvent);
  document.getElementById("upload-btn").addEventListener("click", handleUploadPhotos);
  document.getElementById("photo-input").addEventListener("change", handleFileInputChange);
  document.getElementById("clear-selected-files-btn").addEventListener("click", clearSelectedFiles);

  const uploadSelect = document.getElementById("upload-event-select");
  if (uploadSelect) {
    uploadSelect.addEventListener("change", updateUploadButtonState);
  }

  document.getElementById("admin-back-btn")?.addEventListener("click", () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "index.html";
    }
  });
});

// ==========================================================================
// Server Status Check
// ==========================================================================
async function checkServerStatus() {
  const statusEl = document.getElementById("server-status");
  const modelStatusEl = document.getElementById("face-models-status");
  const photoInput = document.getElementById("photo-input");
  const browseBtn = document.getElementById("admin-browse-btn");

  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    const data = await response.json();

    if (data.success) {
      statusEl.innerHTML = `${getIcon("checkCircle")} <span>Server Online</span>`;
      statusEl.className = "message message-success header-status-badge";

      if (modelStatusEl) {
        modelStatusEl.innerHTML = `${getIcon("checkCircle")} <span>Buffalo ONNX AI Ready</span>`;
        modelStatusEl.className = "message message-success";
      }

      if (photoInput) photoInput.disabled = false;
      if (browseBtn) browseBtn.disabled = false;
      updateUploadButtonState();
    } else {
      throw new Error("Server error");
    }
  } catch (error) {
    console.error("Could not reach backend:", error);
    statusEl.innerHTML = `${getIcon("alertCircle")} <span>Server Offline</span>`;
    statusEl.className = "message message-error header-status-badge";
    if (modelStatusEl) {
      modelStatusEl.innerHTML = `${getIcon("alertCircle")} <span>AI Service Offline</span>`;
      modelStatusEl.className = "message message-error";
    }
  }
}

// ==========================================================================
// Toast Notifications
// ==========================================================================
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast-pill ${type}`;
  const icon = type === "success" ? getIcon("checkCircle") : getIcon("alertCircle");
  toast.innerHTML = `${icon} <span>${message}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    toast.style.transition = "all 0.2s ease";
    setTimeout(() => toast.remove(), 200);
  }, 3200);
}

// ==========================================================================
// Storage Plan Component Controller (Live ImageKit.io CDN)
// ==========================================================================
let currentStorageData = null;

function initStoragePlanCard() {
  loadStoragePlan();

  if (storageAutoRefreshTimer) {
    clearInterval(storageAutoRefreshTimer);
  }

  // Refresh every 60 seconds when page is visible
  storageAutoRefreshTimer = setInterval(() => {
    if (document.visibilityState === "visible") {
      loadStoragePlan(false);
    }
  }, 60000);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      loadStoragePlan(false);
    }
  });
}

function renderStorageSkeleton() {
  const container = document.getElementById("storage-plan-card");
  if (!container) return;

  container.innerHTML = `
    <div class="storage-card-skeleton">
      <div class="storage-sk-header">
        <div class="storage-sk-left">
          <div class="storage-sk-icon shimmer"></div>
          <div class="storage-sk-title shimmer"></div>
        </div>
        <div class="storage-sk-btn shimmer"></div>
      </div>
      <div class="storage-sk-middle">
        <div class="storage-sk-percent shimmer"></div>
        <div class="storage-sk-text shimmer"></div>
      </div>
      <div class="storage-sk-bar shimmer"></div>
    </div>
  `;
}

async function loadStoragePlan(force = false) {
  const container = document.getElementById("storage-plan-card");
  if (!container) return;

  const syncBtn = document.getElementById("storage-sync-btn");
  if (syncBtn) {
    syncBtn.classList.add("spinning");
  } else if (!currentStorageData) {
    renderStorageSkeleton();
  }

  try {
    const url = `${API_BASE_URL}/admin/storage${force ? "?force=true" : ""}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || "Failed to load Google Drive storage information.");
    }

    currentStorageData = data;
    renderStoragePlan(data);
  } catch (error) {
    console.error("Storage Plan load error:", error);
    if (!currentStorageData) {
      renderStorageError(error.message);
    }
  } finally {
    const activeSyncBtn = document.getElementById("storage-sync-btn");
    if (activeSyncBtn) {
      activeSyncBtn.classList.remove("spinning");
    }
  }
}

function renderStoragePlan(data) {
  const container = document.getElementById("storage-plan-card");
  if (!container) return;

  const percentage = data.storagePercentage !== undefined ? data.storagePercentage : 0;
  const displayPercentage = percentage < 0.1 && percentage > 0 ? "< 0.1" : percentage.toFixed(1);
  const photoCount = data.photoCount !== undefined ? data.photoCount : 0;
  const photoLimit = data.photoLimitEstimated || 1300000;

  const storageUsedDisplay =
    data.storageUsedGB >= 1
      ? `${data.storageUsedGB} GB`
      : `${data.storageUsedMB || 0} MB`;

  const storageLimitDisplay =
    data.storageLimitGB !== undefined
      ? `${data.storageLimitGB} GB`
      : data.storageLimitTB !== undefined
      ? `${data.storageLimitTB} TB`
      : "20 GB";

  let barClass = "";
  if (data.isFull || percentage >= 100) {
    barClass = "full";
  } else if (data.isNearFull || percentage >= 90) {
    barClass = "warning";
  }

  let progressWidth = Math.min(100, Math.max(0, percentage));
  if (photoCount > 0 && progressWidth < 1.5) {
    progressWidth = 1.5;
  }

  container.innerHTML = `
    <div class="storage-card-header">
      <div class="storage-header-left">
        <div class="storage-icon-badge" title="ImageKit.io Media CDN">
          ${getIcon("camera")}
        </div>
        <h2 class="storage-card-title">${data.planName || "ImageKit.io (20 GB Free Plan)"}</h2>
      </div>
      <button type="button" class="storage-upgrade-btn" id="storage-upgrade-action" title="Open ImageKit Developer Dashboard">
        ${getIcon("sparkles")}
        <span>ImageKit CDN</span>
      </button>
    </div>

    <div class="storage-stat-row">
      <div class="storage-percentage-val">${displayPercentage}%</div>
      <div class="storage-photos-desc">
        <strong>${photoCount.toLocaleString()}</strong> photos uploaded (${data.storageRemainingGB ? data.storageRemainingGB + ' GB remaining' : '20 GB capacity'})
      </div>
      ${
        data.isFull
          ? `<span class="message message-error" style="padding: 0.2rem 0.6rem; font-size: 0.75rem;">Storage Full (${storageUsedDisplay})</span>`
          : ""
      }
    </div>

    <div class="storage-progress-container">
      <div class="storage-progress-track" title="${storageUsedDisplay} of ${storageLimitDisplay} used (${percentage}%)">
        <div class="storage-progress-fill ${barClass}" style="width: ${progressWidth}%;"></div>
      </div>
    </div>

    <div class="storage-footer-meta">
      <div class="storage-meta-badges">
        <span class="storage-live-pill">
          <span class="storage-live-dot"></span>
          Live ImageKit CDN Sync
        </span>
        <span class="storage-meta-item">
          Storage: <strong>${storageUsedDisplay}</strong> / ${storageLimitDisplay}
        </span>
      </div>
      <button type="button" class="storage-sync-btn" id="storage-sync-btn" title="Fetch live usage from ImageKit">
        ${getIcon("refresh")}
        <span>Sync</span>
      </button>
    </div>
  `;

  document.getElementById("storage-upgrade-action")?.addEventListener("click", () => {
    window.open(data.upgradeUrl || "https://imagekit.io/dashboard/developer", "_blank", "noopener,noreferrer");
  });

  document.getElementById("storage-sync-btn")?.addEventListener("click", () => {
    loadStoragePlan(true);
  });
}

function renderStorageError(errorMessage) {
  const container = document.getElementById("storage-plan-card");
  if (!container) return;

  container.innerHTML = `
    <div style="text-align: center; padding: 1.5rem 1rem;">
      <p style="color: var(--accent-danger); font-weight: 600; margin-bottom: 0.25rem;">Unable to load Google Drive storage metrics</p>
      <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem;">${errorMessage || "Check network connection."}</p>
      <button type="button" class="btn btn-secondary btn-sm" id="storage-retry-btn">
        ${getIcon("refresh")}
        <span>Retry</span>
      </button>
    </div>
  `;

  document.getElementById("storage-retry-btn")?.addEventListener("click", () => {
    loadStoragePlan(true);
  });
}

// ==========================================================================
// Upload Workspace Controls
// ==========================================================================
function setupAdminUploadControls() {
  const dropzone = document.getElementById("admin-upload-dropzone");
  const photoInput = document.getElementById("photo-input");
  const browseBtn = document.getElementById("admin-browse-btn");

  if (browseBtn && photoInput) {
    browseBtn.addEventListener("click", () => photoInput.click());
  }

  if (dropzone && photoInput) {
    ["dragenter", "dragover"].forEach((eventName) => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add("dragover");
      });
    });

    ["dragleave", "dragend", "drop"].forEach((eventName) => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove("dragover");
      });
    });

    dropzone.addEventListener("drop", (e) => {
      const dt = e.dataTransfer;
      if (dt && dt.files && dt.files.length > 0) {
        addFilesToQueue(Array.from(dt.files));
      }
    });
  }
}

function handleFileInputChange(e) {
  if (e.target.files && e.target.files.length > 0) {
    addFilesToQueue(Array.from(e.target.files));
  }
}

function addFilesToQueue(newFiles) {
  // Filter for valid images
  const imageFiles = newFiles.filter((f) => f.type.startsWith("image/"));
  if (imageFiles.length === 0) {
    showToast("Please select valid image files (JPG, PNG, WEBP).", "error");
    return;
  }

  // Prevent duplicate additions by filename + size
  imageFiles.forEach((newFile) => {
    const exists = selectedUploadFiles.some(
      (f) => f.name === newFile.name && f.size === newFile.size
    );
    if (!exists) {
      // Create thumbnail object URL for Aceternity preview
      newFile._previewUrl = URL.createObjectURL(newFile);
      selectedUploadFiles.push(newFile);
    }
  });

  renderSelectedFilesPreview();
  updateUploadButtonState();
}

function removeFileFromQueue(index) {
  if (selectedUploadFiles[index] && selectedUploadFiles[index]._previewUrl) {
    URL.revokeObjectURL(selectedUploadFiles[index]._previewUrl);
  }
  selectedUploadFiles.splice(index, 1);
  renderSelectedFilesPreview();
  updateUploadButtonState();
}

function clearSelectedFiles() {
  selectedUploadFiles.forEach((f) => {
    if (f._previewUrl) URL.revokeObjectURL(f._previewUrl);
  });
  selectedUploadFiles = [];
  const fileInput = document.getElementById("photo-input");
  if (fileInput) fileInput.value = "";
  renderSelectedFilesPreview();
  updateUploadButtonState();
}

function formatFileSize(bytes) {
  if (!bytes) return "0 KB";
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.round(bytes / 1024)} KB`;
}

function renderSelectedFilesPreview() {
  const cardEl = document.getElementById("selected-files-card");
  const countEl = document.getElementById("selected-files-count");
  const listEl = document.getElementById("selected-files-list");

  if (!cardEl || !countEl || !listEl) return;

  if (selectedUploadFiles.length === 0) {
    cardEl.classList.add("hidden");
    return;
  }

  cardEl.classList.remove("hidden");
  countEl.textContent = `${selectedUploadFiles.length} photo${selectedUploadFiles.length === 1 ? "" : "s"}`;

  listEl.innerHTML = "";
  selectedUploadFiles.forEach((file, index) => {
    const item = document.createElement("div");
    item.className = "aceternity-file-item";
    
    const fileType = file.type ? file.type.replace("image/", "").toUpperCase() : "IMAGE";
    const previewSrc = file._previewUrl || "";

    item.innerHTML = `
      <div class="aceternity-file-item-left">
        <img src="${previewSrc}" alt="${file.name}" class="aceternity-file-thumbnail" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'24\\' height=\\'24\\' fill=\\'none\\' stroke=\\'%237C5CFF\\' stroke-width=\\'2\\'%3E%3Crect width=\\'18\\' height=\\'18\\' x=\\'3\\' y=\\'3\\' rx=\\'2\\'/%3E%3C/svg%3E'" />
        <div class="aceternity-file-meta">
          <span class="aceternity-file-name" title="${file.name}">${file.name}</span>
          <div class="aceternity-file-details">
            <span>${formatFileSize(file.size)}</span>
            <span>&bull;</span>
            <span style="text-transform: uppercase;">${fileType}</span>
          </div>
        </div>
      </div>
      <button type="button" class="aceternity-file-remove-btn" data-index="${index}" title="Remove photo">
        ${getIcon("x")}
      </button>
    `;

    item.querySelector(".aceternity-file-remove-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      removeFileFromQueue(index);
    });

    listEl.appendChild(item);
  });
}

function updateUploadButtonState() {
  const uploadBtn = document.getElementById("upload-btn");
  const selectEl = document.getElementById("upload-event-select");

  const hasFiles = selectedUploadFiles.length > 0;
  const hasEvent = selectEl && selectEl.value !== "";

  if (uploadBtn) {
    uploadBtn.disabled = !(hasFiles && hasEvent);
  }
}

// ==========================================================================
// Photo Upload Execution (Controlled Concurrency Queue & Retry Engine)
// ==========================================================================
const UPLOAD_CONCURRENCY_LIMIT = 3;
const MAX_UPLOAD_RETRIES = 2;

async function uploadSinglePhotoWithRetry(file, eventId, statusEl, onStageChange) {
  let attempt = 0;
  let lastError = null;

  while (attempt <= MAX_UPLOAD_RETRIES) {
    attempt++;
    try {
      if (attempt > 1) {
        statusEl.className = "upload-item-status retrying";
        statusEl.innerHTML = `${getIcon("spinner")} <span>Retrying (${attempt - 1}/${MAX_UPLOAD_RETRIES})&hellip;</span>`;
        // Exponential backoff: 1s, 2s
        await new Promise((resolve) => setTimeout(resolve, (attempt - 1) * 1000));
      }

      statusEl.className = "upload-item-status running";
      statusEl.innerHTML = `${getIcon("spinner")} <span>Uploading&hellip;</span>`;

      const formData = new FormData();
      formData.append("photo", file);
      formData.append("eventId", eventId);

      // Transition to AI indexing indicator
      const indexingTimer = setTimeout(() => {
        statusEl.innerHTML = `${getIcon("spinner")} <span>Buffalo AI indexing&hellip;</span>`;
      }, 600);

      const response = await fetch(`${API_BASE_URL}/photos/upload`, {
        method: "POST",
        body: formData,
      });

      clearTimeout(indexingTimer);

      let data = null;
      try {
        data = await response.json();
      } catch (parseErr) {
        throw new Error(`Server returned invalid response (HTTP ${response.status})`);
      }

      if (!response.ok || !data.success) {
        const errorMsg = (data && data.message) || `Upload failed (HTTP ${response.status})`;
        // Do not retry 4xx client validation errors
        if (response.status >= 400 && response.status < 500 && response.status !== 408) {
          const nonRetryErr = new Error(errorMsg);
          nonRetryErr.isNonRetryable = true;
          throw nonRetryErr;
        }
        throw new Error(errorMsg);
      }

      const faceCount = data.photo && data.photo.faceCount !== undefined ? data.photo.faceCount : 0;
      statusEl.className = "upload-item-status success";
      if (faceCount > 0) {
        statusEl.innerHTML = `${getIcon("checkCircle")} <span>Indexed (${faceCount} face${faceCount === 1 ? "" : "s"})</span>`;
      } else {
        statusEl.innerHTML = `${getIcon("checkCircle")} <span>Indexed (0 faces detected)</span>`;
      }

      return { success: true, file, data };
    } catch (err) {
      lastError = err;
      console.warn(`Upload attempt ${attempt} for "${file.name}" failed:`, err.message);

      if (err.isNonRetryable || attempt > MAX_UPLOAD_RETRIES) {
        break;
      }
    }
  }

  // Format clean, human-readable error message
  let displayErrMsg = lastError ? lastError.message : "Upload failed";
  if (displayErrMsg === "Failed to fetch") {
    displayErrMsg = "Connection timeout / Server unreachable";
  }

  statusEl.className = "upload-item-status error";
  statusEl.innerHTML = `${getIcon("alertCircle")} <span title="${displayErrMsg}">${displayErrMsg}</span>`;

  return { success: false, file, error: lastError };
}

async function handleUploadPhotos() {
  const eventId = document.getElementById("upload-event-select").value;
  const filesToUpload = [...selectedUploadFiles];

  if (!eventId || filesToUpload.length === 0) return;

  const uploadBtn = document.getElementById("upload-btn");
  const queueContainer = document.getElementById("upload-queue-container");
  const summaryTextEl = document.getElementById("upload-summary-text");
  const summaryPercentEl = document.getElementById("upload-summary-percent");
  const progressFillEl = document.getElementById("upload-progress-fill");
  const logEl = document.getElementById("upload-log");

  uploadBtn.disabled = true;
  uploadBtn.innerHTML = `${getIcon("spinner")} <span>Processing queue...</span>`;
  queueContainer.classList.remove("hidden");
  logEl.innerHTML = "";

  let succeeded = 0;
  let failed = 0;
  let processedCount = 0;
  const totalCount = filesToUpload.length;

  const updateProgress = () => {
    const percent = Math.round((processedCount / totalCount) * 100);
    progressFillEl.style.width = `${percent}%`;
    summaryPercentEl.textContent = `${percent}%`;
    summaryTextEl.textContent = `Processed ${processedCount} of ${totalCount} photos (${succeeded} succeeded, ${failed} failed)`;
  };

  // Build queue items with real preview thumbnails
  const itemElements = filesToUpload.map((file) => {
    const itemCard = document.createElement("div");
    itemCard.className = "upload-item-card";
    const previewSrc = file._previewUrl || "";
    itemCard.innerHTML = `
      <div class="upload-item-info">
        <img src="${previewSrc}" alt="${file.name}" style="width: 28px; height: 28px; border-radius: 4px; object-fit: cover; flex-shrink: 0;" onerror="this.style.display='none'" />
        <span class="upload-item-name" title="${file.name}">${file.name}</span>
        <span class="upload-item-size">${formatFileSize(file.size)}</span>
      </div>
      <div class="upload-item-status running">
        ${getIcon("spinner")}
        <span>Waiting…</span>
      </div>
    `;
    logEl.appendChild(itemCard);
    return itemCard;
  });

  updateProgress();

  // Controlled Concurrency Worker Pool
  let nextQueueIndex = 0;

  async function worker() {
    while (nextQueueIndex < totalCount) {
      const currentIndex = nextQueueIndex++;
      const file = filesToUpload[currentIndex];
      const itemEl = itemElements[currentIndex];
      const statusEl = itemEl.querySelector(".upload-item-status");

      const result = await uploadSinglePhotoWithRetry(file, eventId, statusEl);

      if (result.success) {
        succeeded++;
      } else {
        failed++;
      }
      processedCount++;
      updateProgress();
    }
  }

  // Spawn concurrency worker pool
  const workerCount = Math.min(UPLOAD_CONCURRENCY_LIMIT, totalCount);
  const workerPromises = [];
  for (let w = 0; w < workerCount; w++) {
    workerPromises.push(worker());
  }

  await Promise.all(workerPromises);

  uploadBtn.disabled = false;
  uploadBtn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" x2="12" y1="3" y2="15"/>
    </svg>
    <span>Upload Photos</span>
  `;
  clearSelectedFiles();

  if (succeeded > 0) {
    showToast(`Upload complete: ${succeeded} photos indexed successfully${failed > 0 ? ` (${failed} failed)` : ""}!`);
    loadStoragePlan(true);
    loadEvents();
  } else if (failed > 0) {
    showToast(`Upload failed for all ${failed} photos. Check the error log above.`, "error");
  }
}

// ==========================================================================
// Event Management (Create, List, Delete)
// ==========================================================================
async function handleCreateEvent(e) {
  e.preventDefault();

  const name = document.getElementById("event-name").value.trim();
  const date = document.getElementById("event-date").value;
  const location = document.getElementById("event-location").value.trim();
  const messageEl = document.getElementById("create-event-message");
  const btn = document.getElementById("create-event-btn");

  btn.disabled = true;
  messageEl.innerHTML = "";

  try {
    const response = await fetch(`${API_BASE_URL}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, date, location }),
    });
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || "Could not create event.");
    }

    showToast(`Event "${data.event.name}" created!`);
    document.getElementById("create-event-form").reset();
    await loadEvents();
  } catch (error) {
    console.error("Error creating event:", error);
    messageEl.innerHTML = `<div class="message message-error">${getIcon("alertCircle")} ${error.message}</div>`;
  } finally {
    btn.disabled = false;
  }
}

async function loadEvents() {
  const listEl = document.getElementById("events-list");
  const selectEl = document.getElementById("upload-event-select");

  try {
    const response = await fetch(`${API_BASE_URL}/events`);
    const data = await response.json();

    if (!data.success) throw new Error(data.message || "Could not load events.");

    events = data.events;

    if (events.length === 0) {
      listEl.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 2.5rem 1rem; background: rgba(0,0,0,0.2); border: 1px dashed var(--border-subtle); border-radius: var(--radius-md);">
          <div style="color: var(--text-muted); margin-bottom: 0.5rem;">${getIcon("folder")}</div>
          <h3 style="font-size: 1.1rem; margin-bottom: 0.25rem;">No Events Created Yet</h3>
          <p style="font-size: 0.85rem; color: var(--text-muted);">Create your first wedding event above to begin uploading photos.</p>
        </div>
      `;
      selectEl.innerHTML = `<option value="">Create an event first</option>`;
      return;
    }

    selectEl.innerHTML = events
      .map(
        (ev) =>
          `<option value="${ev.eventId}">${ev.name} (${ev.eventId}) • ${ev.photoCount || 0} photos</option>`
      )
      .join("");
    updateUploadButtonState();

    listEl.innerHTML = "";
    events.forEach((ev) => {
      const guestUrl = `${window.location.origin}/guest.html?event=${ev.eventId}`;
      const photoCount = ev.photoCount || 0;
      const formattedDate = ev.date
        ? new Date(ev.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
        : "";

      const card = document.createElement("div");
      card.className = "event-card";
      card.innerHTML = `
        <div>
          <div class="event-card-top">
            <div>
              <h3 class="event-card-name">${ev.name}</h3>
              <div class="event-metadata-list">
                ${
                  formattedDate
                    ? `<div class="event-metadata-item">${getIcon("calendar")} <span>${formattedDate}</span></div>`
                    : ""
                }
                ${
                  ev.location
                    ? `<div class="event-metadata-item">${getIcon("mapPin")} <span>${ev.location}</span></div>`
                    : ""
                }
              </div>
            </div>
            <span class="event-id-badge">${ev.eventId}</span>
          </div>

          <div style="margin-top: 0.85rem; margin-bottom: 0.85rem;">
            <div class="event-photo-count-pill">
              ${getIcon("images")}
              <span>${photoCount.toLocaleString()} Photo${photoCount === 1 ? "" : "s"}</span>
            </div>
          </div>

          <!-- Guest Access Link Box -->
          <div class="guest-access-box">
            <div>
              <div class="guest-access-label">Guest Access</div>
              <div style="font-size: 0.815rem; color: var(--text-secondary); font-family: var(--font-mono);">${ev.eventId}</div>
            </div>
            <div class="guest-access-actions">
              <button type="button" class="btn btn-secondary btn-sm btn-copy-link" data-url="${guestUrl}" title="Copy Guest URL">
                ${getIcon("copy")}
                <span>Copy Link</span>
              </button>
              <a href="${guestUrl}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm btn-icon" title="Open Guest Page">
                ${getIcon("externalLink")}
              </a>
            </div>
          </div>
        </div>

        <div>
          <div class="event-card-actions">
            <button type="button" class="btn btn-secondary btn-sm btn-download-qr" data-url="${guestUrl}" data-id="${ev.eventId}">
              ${getIcon("download")}
              <span>QR Code</span>
            </button>
            <button type="button" class="btn btn-danger btn-sm btn-delete-event" data-id="${ev.eventId}" data-name="${encodeURIComponent(ev.name)}">
              ${getIcon("trash")}
              <span>Delete</span>
            </button>
          </div>
        </div>
      `;

      // Copy Link Button Action
      const copyBtn = card.querySelector(".btn-copy-link");
      copyBtn?.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(guestUrl);
          copyBtn.innerHTML = `${getIcon("check")} <span>Copied!</span>`;
          showToast(`Guest link copied for "${ev.name}"`);
          setTimeout(() => {
            copyBtn.innerHTML = `${getIcon("copy")} <span>Copy Link</span>`;
          }, 2000);
        } catch (err) {
          showToast("Failed to copy link.", "error");
        }
      });

      // QR Code Download Button Action
      const qrBtn = card.querySelector(".btn-download-qr");
      qrBtn?.addEventListener("click", () => {
        const tempCanvas = document.createElement("canvas");
        if (window.QRCode) {
          QRCode.toCanvas(tempCanvas, guestUrl, { width: 300, margin: 2 }, (err) => {
            if (err) {
              showToast("QR generation failed.", "error");
              return;
            }
            const a = document.createElement("a");
            a.href = tempCanvas.toDataURL("image/png");
            a.download = `${ev.eventId}-guest-qr.png`;
            a.click();
            showToast("QR Code downloaded!");
          });
        }
      });

      // Delete Event Button Action (Modal Trigger)
      const deleteBtn = card.querySelector(".btn-delete-event");
      deleteBtn?.addEventListener("click", () => {
        const eventId = deleteBtn.getAttribute("data-id");
        const eventName = decodeURIComponent(deleteBtn.getAttribute("data-name") || "");
        openDeleteModal(eventId, eventName);
      });

      listEl.appendChild(card);
    });
  } catch (error) {
    console.error("Error loading events:", error);
    listEl.innerHTML = `<div class="message message-error" style="grid-column: 1 / -1;">${getIcon("alertCircle")} Could not load events.</div>`;
  }
}

// ==========================================================================
// Custom Delete Confirmation Modal
// ==========================================================================
let pendingDeleteEventId = null;

function setupModalHandlers() {
  const modal = document.getElementById("delete-confirm-modal");
  const cancelBtn = document.getElementById("modal-cancel-btn");
  const confirmBtn = document.getElementById("modal-confirm-btn");

  cancelBtn?.addEventListener("click", closeDeleteModal);

  modal?.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeDeleteModal();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal?.classList.contains("active")) {
      closeDeleteModal();
    }
  });

  confirmBtn?.addEventListener("click", executeEventDeletion);
}

function openDeleteModal(eventId, eventName) {
  pendingDeleteEventId = eventId;
  const modal = document.getElementById("delete-confirm-modal");
  const messageEl = document.getElementById("modal-message");
  const confirmBtn = document.getElementById("modal-confirm-btn");

  if (!modal || !messageEl || !confirmBtn) return;

  messageEl.innerHTML = `Are you sure you want to permanently delete event <strong>"${eventName}"</strong> (<code>${eventId}</code>)?<br/><br/>All uploaded photos will be removed from Google Drive cloud storage and freed from your storage quota.`;

  confirmBtn.disabled = false;
  confirmBtn.innerHTML = `${getIcon("trash")} <span>Delete Event</span>`;

  modal.classList.add("active");
  document.getElementById("modal-cancel-btn")?.focus();
}

function closeDeleteModal() {
  const modal = document.getElementById("delete-confirm-modal");
  if (modal) modal.classList.remove("active");
  pendingDeleteEventId = null;
}

async function executeEventDeletion() {
  if (!pendingDeleteEventId) return;

  const confirmBtn = document.getElementById("modal-confirm-btn");
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = `${getIcon("spinner")} <span>Deleting…</span>`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/events/${pendingDeleteEventId}`, {
      method: "DELETE",
    });
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || "Failed to delete event.");
    }

    closeDeleteModal();
    showToast(data.message || "Event deleted successfully.");

    await loadEvents();
    loadStoragePlan(true);
  } catch (error) {
    console.error("Error deleting event:", error);
    showToast(error.message || "Could not delete event.", "error");
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = `${getIcon("trash")} <span>Delete Event</span>`;
    }
  }
}
