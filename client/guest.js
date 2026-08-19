const API_BASE_URL = "/api";

let currentEventId = null;
let currentSelfieFile = null;
let availableEvents = [];
let mediaStream = null;

document.addEventListener("DOMContentLoaded", async () => {
  setupEventListeners();
  await loadAvailableEvents();
  setStatus("Choose your wedding event and upload a selfie to start.", "info");
});

function getEventIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("event");
}

function setupEventListeners() {
  const selfieInput = document.getElementById("selfie-input");
  const browseBtn = document.getElementById("browse-btn");
  const dropzone = document.getElementById("upload-dropzone");
  const removeSelfieBtn = document.getElementById("remove-selfie-btn");
  const searchBtn = document.getElementById("search-btn");
  const eventSelect = document.getElementById("event-select");
  const applyManualBtn = document.getElementById("apply-manual-event-btn");
  const manualInput = document.getElementById("manual-event-id");
  const openCameraBtn = document.getElementById("open-camera-btn");
  const closeCameraBtn = document.getElementById("close-camera-btn");
  const capturePhotoBtn = document.getElementById("capture-photo-btn");

  // Help modal handlers
  const headerHelpBtn = document.getElementById("header-help-btn");
  const howItWorksBtn = document.getElementById("how-it-works-btn");
  const helpModal = document.getElementById("help-modal");
  const closeHelpBtn = document.getElementById("close-help-btn");
  const gotItHelpBtn = document.getElementById("got-it-help-btn");

  if (headerHelpBtn) {
    headerHelpBtn.addEventListener("click", (e) => {
      e.preventDefault();
      helpModal.classList.add("active");
    });
  }

  if (howItWorksBtn) {
    howItWorksBtn.addEventListener("click", () => {
      helpModal.classList.add("active");
    });
  }

  if (closeHelpBtn) {
    closeHelpBtn.addEventListener("click", () => {
      helpModal.classList.remove("active");
    });
  }

  if (gotItHelpBtn) {
    gotItHelpBtn.addEventListener("click", () => {
      helpModal.classList.remove("active");
    });
  }

  // Back button handler
  const backBtn = document.getElementById("guest-back-btn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = "index.html";
      }
    });
  }

  // Photo viewer lightbox modal handlers
  const closeViewerBtn = document.getElementById("close-viewer-btn");
  const photoViewerModal = document.getElementById("photo-viewer-modal");
  if (closeViewerBtn) {
    closeViewerBtn.addEventListener("click", closePhotoViewer);
  }
  if (photoViewerModal) {
    photoViewerModal.addEventListener("click", (e) => {
      if (e.target === photoViewerModal) {
        closePhotoViewer();
      }
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closePhotoViewer();
      closeCameraModal();
      if (helpModal) helpModal.classList.remove("active");
    }
  });

  // File input change
  if (selfieInput) {
    selfieInput.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) handleSelfieSelected(file);
    });
  }

  // Browse button triggers file input
  if (browseBtn && selfieInput) {
    browseBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      selfieInput.click();
    });
  }

  // Drag and drop handlers
  if (dropzone) {
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
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        handleSelfieSelected(files[0]);
      }
    });
  }

  // Remove selfie
  if (removeSelfieBtn) {
    removeSelfieBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      clearSelfie();
    });
  }

  // Event dropdown change
  if (eventSelect) {
    eventSelect.addEventListener("change", (e) => {
      selectEventById(e.target.value);
    });
  }

  // Apply manual event code
  if (applyManualBtn && manualInput) {
    applyManualBtn.addEventListener("click", async () => {
      const code = manualInput.value.trim().toUpperCase();
      if (!code) return;
      await selectEventById(code);
    });
  }

  if (manualInput) {
    manualInput.addEventListener("keydown", async (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const code = manualInput.value.trim().toUpperCase();
        if (code) await selectEventById(code);
      }
    });
  }

  // Camera modal controls
  if (openCameraBtn) {
    openCameraBtn.addEventListener("click", openCameraModal);
  }
  if (closeCameraBtn) {
    closeCameraBtn.addEventListener("click", closeCameraModal);
  }
  if (capturePhotoBtn) {
    capturePhotoBtn.addEventListener("click", captureCameraPhoto);
  }

  // Search button
  if (searchBtn) {
    searchBtn.addEventListener("click", handleSearch);
  }
}

async function loadAvailableEvents() {
  const urlEventId = getEventIdFromUrl();
  const selectEl = document.getElementById("event-select");

  try {
    const response = await fetch(`${API_BASE_URL}/events`);
    const data = await response.json();

    if (data.success && Array.isArray(data.events) && data.events.length > 0) {
      availableEvents = data.events;
      selectEl.innerHTML = `
        <option value="">-- Select Your Wedding Event --</option>
        ${availableEvents
          .map(
            (ev) =>
              `<option value="${ev.eventId}">${ev.name} (${ev.eventId})${
                ev.location ? " · " + ev.location : ""
              }</option>`
          )
          .join("")}
      `;

      if (urlEventId) {
        const found = availableEvents.find(
          (e) => e.eventId.toUpperCase() === urlEventId.toUpperCase()
        );
        if (found) {
          selectEl.value = found.eventId;
          selectEventById(found.eventId);
        } else {
          await selectEventById(urlEventId);
        }
      } else if (availableEvents.length > 0) {
        selectEl.value = availableEvents[0].eventId;
        selectEventById(availableEvents[0].eventId);
      }
    } else {
      selectEl.innerHTML = `<option value="">No events available</option>`;
      if (urlEventId) {
        await selectEventById(urlEventId);
      }
    }
  } catch (error) {
    console.error("Error loading events:", error);
    selectEl.innerHTML = `<option value="">Could not load events</option>`;
    if (urlEventId) {
      await selectEventById(urlEventId);
    }
  }
}

async function selectEventById(eventId) {
  const idEl = document.getElementById("active-event-id");

  if (!eventId) {
    currentEventId = null;
    if (idEl) idEl.textContent = "None Selected";
    updateSearchButtonState();
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}`);
    const data = await response.json();

    if (data.success && data.event) {
      currentEventId = data.event.eventId;
      if (idEl) idEl.textContent = data.event.eventId;
      updateSearchButtonState();
    } else {
      currentEventId = null;
      if (idEl) idEl.textContent = "Invalid Code";
      setStatus(`Wedding event "${eventId}" was not found. Please check code.`, "error");
      updateSearchButtonState();
    }
  } catch (error) {
    console.error("Error verifying event:", error);
    setStatus("Could not connect to server.", "error");
  }
}

function handleSelfieSelected(file) {
  if (!file) return;

  const previewEl = document.getElementById("selfie-preview");
  const defaultContent = document.getElementById("dropzone-default-content");
  const previewContent = document.getElementById("dropzone-preview-content");

  currentSelfieFile = file;

  // Instant image preview
  previewEl.src = URL.createObjectURL(file);
  defaultContent.classList.add("hidden");
  previewContent.classList.remove("hidden");

  if (currentEventId) {
    setStatus("Selfie ready ✓ Click 'Find My Photos' to search!", "info");
  } else {
    setStatus("Selfie uploaded ✓ Please choose your wedding event to proceed.", "info");
  }

  updateSearchButtonState();
}

function clearSelfie() {
  currentSelfieFile = null;
  const selfieInput = document.getElementById("selfie-input");
  const defaultContent = document.getElementById("dropzone-default-content");
  const previewContent = document.getElementById("dropzone-preview-content");

  if (selfieInput) selfieInput.value = "";
  if (defaultContent) defaultContent.classList.remove("hidden");
  if (previewContent) previewContent.classList.add("hidden");

  setStatus("Choose your wedding event and upload a selfie to start.", "info");
  updateSearchButtonState();
}

function updateSearchButtonState() {
  const searchBtn = document.getElementById("search-btn");
  const isReady = Boolean(currentSelfieFile && currentEventId);

  if (searchBtn) {
    searchBtn.disabled = !isReady;
  }
}

async function handleSearch() {
  if (!currentSelfieFile || !currentEventId) {
    if (!currentEventId) {
      setStatus("Please select a wedding event before searching.", "error");
    } else if (!currentSelfieFile) {
      setStatus("Please upload or take a selfie first.", "error");
    }
    return;
  }

  const searchBtn = document.getElementById("search-btn");
  const galleryEl = document.getElementById("results-gallery");
  const resultsSection = document.getElementById("results-section");
  const countBadge = document.getElementById("results-count-badge");

  searchBtn.disabled = true;
  setStatus("Matching your face using Buffalo ONNX Face AI…", "info");

  // Show loading skeleton cards
  if (resultsSection) resultsSection.classList.remove("hidden");
  if (countBadge) countBadge.innerHTML = `<span>Matching faces…</span>`;
  if (galleryEl) {
    galleryEl.innerHTML = Array(3).fill(0).map(() => `
      <div class="matched-photo-skeleton">
        <div class="matched-photo-skeleton-img shimmer"></div>
        <div class="matched-photo-skeleton-actions">
          <div class="matched-photo-skeleton-btn shimmer"></div>
          <div class="matched-photo-skeleton-btn shimmer"></div>
        </div>
      </div>
    `).join("");
  }

  try {
    const formData = new FormData();
    formData.append("selfie", currentSelfieFile);
    formData.append("eventId", currentEventId);

    const response = await fetch(`${API_BASE_URL}/search`, {
      method: "POST",
      body: formData,
    });
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || "Search failed.");
    }

    if (!data.matches || data.matches.length === 0) {
      setStatus("No matching photos found. Try uploading another clear selfie.", "info");
      if (countBadge) countBadge.innerHTML = `<span>0 photos found</span>`;
      if (galleryEl) {
        galleryEl.innerHTML = `
          <div class="matched-empty-state">
            <div class="matched-empty-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <h3 style="font-size: 1.2rem; margin-bottom: 0.4rem; color: #fff;">No Matching Photos Found</h3>
            <p style="font-size: 0.88rem; color: var(--text-secondary); margin: 0; line-height: 1.55;">
              Try uploading another clear selfie or check again after more event photos have been uploaded.
            </p>
          </div>
        `;
      }
      return;
    }

    const count = data.matches.length;
    setStatus(`✓ Found ${count} photo${count === 1 ? "" : "s"} of you! 🎉`, "success");
    renderResults(data.matches);
  } catch (error) {
    console.error("Error searching:", error);
    setStatus(error.message || "Something went wrong while searching. Please try again.", "error");
    if (galleryEl) galleryEl.innerHTML = "";
    if (resultsSection) resultsSection.classList.add("hidden");
  } finally {
    updateSearchButtonState();
  }
}

function renderResults(matches) {
  const galleryEl = document.getElementById("results-gallery");
  const resultsSection = document.getElementById("results-section");
  const countBadge = document.getElementById("results-count-badge");

  if (resultsSection) resultsSection.classList.remove("hidden");
  if (countBadge) {
    const count = matches.length;
    countBadge.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      <span>${count} photo${count === 1 ? "" : "s"} found</span>
    `;
  }

  galleryEl.innerHTML = matches
    .map((match, idx) => {
      const safeUrl = match.imageUrl ? match.imageUrl.replace(/"/g, "&quot;") : "";
      const fileName = `Matched Photo #${idx + 1}`;
      return `
      <div class="matched-photo-card">
        <div class="matched-photo-img-wrapper">
          <img src="${safeUrl}" alt="${fileName}" class="matched-photo-img" loading="lazy" />
        </div>
        <div class="matched-photo-actions">
          <button type="button" class="btn btn-secondary view-photo-btn" data-url="${safeUrl}" data-title="${fileName}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
            <span>View</span>
          </button>
          <a class="btn btn-primary" href="${safeUrl}?ik-attachment=true" download="${fileName}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span>Download</span>
          </a>
        </div>
      </div>
    `;
    })
    .join("");

  // Attach Lightbox click handlers to View buttons
  galleryEl.querySelectorAll(".view-photo-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const url = btn.getAttribute("data-url");
      const title = btn.getAttribute("data-title");
      openPhotoViewer(url, title);
    });
  });

  resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* Lightbox Modal Handlers */
function openPhotoViewer(url, title) {
  const modal = document.getElementById("photo-viewer-modal");
  const img = document.getElementById("viewer-photo-img");
  const titleEl = document.getElementById("viewer-photo-title");
  const dlBtn = document.getElementById("viewer-download-btn");

  if (img) img.src = url;
  if (titleEl) titleEl.textContent = title || "Photo Preview";
  if (dlBtn) dlBtn.href = `${url}?ik-attachment=true`;
  if (modal) modal.classList.add("active");
}

function closePhotoViewer() {
  const modal = document.getElementById("photo-viewer-modal");
  if (modal) modal.classList.remove("active");
}

/* Camera capture handling */
async function openCameraModal() {
  const modal = document.getElementById("camera-modal");
  const video = document.getElementById("camera-video");

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false,
    });
    video.srcObject = mediaStream;
    modal.classList.add("active");
  } catch (err) {
    console.error("Camera access error:", err);
    setStatus("Camera access denied or unavailable. Please choose a photo from files.", "error");
  }
}

function closeCameraModal() {
  const modal = document.getElementById("camera-modal");
  const video = document.getElementById("camera-video");

  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop());
    mediaStream = null;
  }
  if (video) {
    video.srcObject = null;
  }
  modal.classList.remove("active");
}

function captureCameraPhoto() {
  const video = document.getElementById("camera-video");
  const canvas = document.getElementById("camera-canvas");

  if (!video || !mediaStream) return;

  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  const ctx = canvas.getContext("2d");

  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  canvas.toBlob(
    (blob) => {
      if (blob) {
        const selfieFile = new File([blob], `selfie-${Date.now()}.jpg`, { type: "image/jpeg" });
        closeCameraModal();
        handleSelfieSelected(selfieFile);
      }
    },
    "image/jpeg",
    0.92
  );
}

function setStatus(text, type) {
  const banner = document.getElementById("guest-status-banner");
  if (banner) {
    banner.textContent = text;
    banner.className = `message message-${type || "info"}`;
    banner.style.width = "100%";
    banner.style.justifyContent = "center";
    banner.style.marginTop = "1rem";
  }
}
