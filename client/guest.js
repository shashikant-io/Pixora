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
      helpModal.classList.remove("hidden");
    });
  }

  if (howItWorksBtn) {
    howItWorksBtn.addEventListener("click", () => {
      helpModal.classList.remove("hidden");
    });
  }

  if (closeHelpBtn) {
    closeHelpBtn.addEventListener("click", () => {
      helpModal.classList.add("hidden");
    });
  }

  if (gotItHelpBtn) {
    gotItHelpBtn.addEventListener("click", () => {
      helpModal.classList.add("hidden");
    });
  }

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
  const headingEl = document.getElementById("results-heading");

  searchBtn.disabled = true;
  headingEl.classList.add("hidden");
  galleryEl.innerHTML = "";
  setStatus("Matching your face using Buffalo ONNX Face AI…", "info");

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
      return;
    }

    const count = data.matches.length;
    setStatus(`✓ Found ${count} photo${count === 1 ? "" : "s"} of you! 🎉`, "success");
    renderResults(data.matches);
  } catch (error) {
    console.error("Error searching:", error);
    setStatus(error.message || "Something went wrong while searching. Please try again.", "error");
  } finally {
    updateSearchButtonState();
  }
}

function renderResults(matches) {
  const galleryEl = document.getElementById("results-gallery");
  const headingEl = document.getElementById("results-heading");

  headingEl.classList.remove("hidden");
  galleryEl.innerHTML = matches
    .map(
      (match) => `
      <div class="gallery-item" style="border: 1px solid rgba(212, 175, 55, 0.3); background: rgba(18, 22, 28, 0.88);">
        <img src="${match.imageUrl}" alt="Matching wedding photo" loading="lazy" />
        <div class="gallery-item-actions">
          <a class="btn btn-secondary" style="color: #fff; border-color: rgba(255,255,255,0.2);" href="${match.imageUrl}" target="_blank" rel="noopener">View</a>
          <a class="btn btn-primary" href="${match.imageUrl}?ik-attachment=true" download>Download</a>
        </div>
      </div>
    `
    )
    .join("");

  headingEl.scrollIntoView({ behavior: "smooth", block: "start" });
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
    modal.classList.remove("hidden");
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
  modal.classList.add("hidden");
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
    banner.className = type === "success" 
      ? "status-success-banner" 
      : type === "error" 
      ? "status-error-banner" 
      : "status-info-banner";
  }
}
