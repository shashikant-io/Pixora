const API_BASE_URL = "/api";

let events = [];

document.addEventListener("DOMContentLoaded", () => {
  checkServerStatus();
  loadEvents();
  setupAdminUploadControls();

  document.getElementById("create-event-form").addEventListener("submit", handleCreateEvent);
  document.getElementById("upload-btn").addEventListener("click", handleUploadPhotos);
  document.getElementById("photo-input").addEventListener("change", updateUploadButtonState);
  
  const uploadSelect = document.getElementById("upload-event-select");
  if (uploadSelect) {
    uploadSelect.addEventListener("change", updateUploadButtonState);
  }
});

function setupAdminUploadControls() {
  const dropzone = document.getElementById("admin-upload-dropzone");
  const photoInput = document.getElementById("photo-input");
  const browseBtn = document.getElementById("admin-browse-btn");

  if (browseBtn && photoInput) {
    browseBtn.addEventListener("click", () => {
      photoInput.click();
    });
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
        photoInput.files = dt.files;
        updateUploadButtonState();
      }
    });
  }
}

async function checkServerStatus() {
  const statusEl = document.getElementById("server-status");
  const modelStatusEl = document.getElementById("face-models-status");
  const photoInput = document.getElementById("photo-input");
  const browseBtn = document.getElementById("admin-browse-btn");

  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    const data = await response.json();

    if (data.success) {
      statusEl.textContent = "Server connected ✓";
      statusEl.className = "message message-success";

      if (modelStatusEl) {
        modelStatusEl.textContent = "Buffalo ONNX Face AI Ready ✓";
        modelStatusEl.className = "message message-success";
      }

      if (photoInput) photoInput.disabled = false;
      if (browseBtn) browseBtn.disabled = false;
      updateUploadButtonState();
    } else {
      throw new Error("Server responded with error.");
    }
  } catch (error) {
    console.error("Could not reach backend:", error);
    statusEl.textContent = "Server not reachable ✗";
    statusEl.className = "message message-error";
    if (modelStatusEl) {
      modelStatusEl.textContent = "Server not reachable. Please start server.";
      modelStatusEl.className = "message message-error";
    }
  }
}

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

    messageEl.innerHTML = `<div class="message message-success">Event created: ${data.event.eventId}</div>`;
    document.getElementById("create-event-form").reset();
    await loadEvents();
  } catch (error) {
    console.error("Error creating event:", error);
    messageEl.innerHTML = `<div class="message message-error">${error.message}</div>`;
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
      listEl.innerHTML = "<p>No events yet. Create one above.</p>";
      selectEl.innerHTML = `<option value="">Create an event first</option>`;
      return;
    }

    selectEl.innerHTML = events
      .map((ev) => `<option value="${ev.eventId}">${ev.name} (${ev.eventId})</option>`)
      .join("");
    updateUploadButtonState();

    listEl.innerHTML = "";
    events.forEach((ev) => {
      const guestUrl = `${window.location.origin}/guest.html?event=${ev.eventId}`;

      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <h3 style="margin-bottom: 0.25rem;">${ev.name}</h3>
        <p style="margin-bottom: 0.5rem;">${ev.date ? new Date(ev.date).toLocaleDateString() : ""} ${ev.location ? "· " + ev.location : ""}</p>
        <p style="font-size: 0.85rem;">Event ID: <strong>${ev.eventId}</strong></p>
        <p style="font-size: 0.85rem; word-break: break-all;">
          Guest link: <a href="${guestUrl}" target="_blank">${guestUrl}</a>
        </p>
        <div class="row" style="align-items: center; margin-top: var(--space-xs);">
          <canvas class="qr-canvas" data-url="${guestUrl}" width="140" height="140"></canvas>
          <a class="btn btn-secondary qr-download" href="#" download="${ev.eventId}-qr.png">Download QR</a>
        </div>
      `;
      listEl.appendChild(card);

      const canvas = card.querySelector(".qr-canvas");
      if (window.QRCode && canvas) {
        QRCode.toCanvas(canvas, guestUrl, { width: 140 }, (err) => {
          if (err) {
            console.error("QR generation failed:", err);
            return;
          }
          const downloadLink = card.querySelector(".qr-download");
          if (downloadLink) downloadLink.href = canvas.toDataURL("image/png");
        });
      }
    });
  } catch (error) {
    console.error("Error loading events:", error);
    listEl.innerHTML = `<div class="message message-error">Could not load events.</div>`;
  }
}

function updateUploadButtonState() {
  const fileInput = document.getElementById("photo-input");
  const uploadBtn = document.getElementById("upload-btn");
  const countEl = document.getElementById("selected-files-count");
  const selectEl = document.getElementById("upload-event-select");

  const hasFiles = fileInput && fileInput.files && fileInput.files.length > 0;
  const hasEvent = selectEl && selectEl.value !== "";

  if (countEl) {
    if (hasFiles) {
      const count = fileInput.files.length;
      countEl.textContent = `${count} photo${count === 1 ? "" : "s"} selected for upload`;
      countEl.classList.remove("hidden");
    } else {
      countEl.classList.add("hidden");
    }
  }

  if (uploadBtn) {
    uploadBtn.disabled = !(hasFiles && hasEvent);
  }
}

async function handleUploadPhotos() {
  const fileInput = document.getElementById("photo-input");
  const eventId = document.getElementById("upload-event-select").value;
  const files = Array.from(fileInput.files);

  if (!eventId || files.length === 0) return;

  const uploadBtn = document.getElementById("upload-btn");
  const summaryEl = document.getElementById("upload-summary");
  const summaryTextEl = document.getElementById("upload-summary-text");
  const progressFillEl = document.getElementById("upload-progress-fill");
  const logEl = document.getElementById("upload-log");

  uploadBtn.disabled = true;
  summaryEl.classList.remove("hidden");
  logEl.innerHTML = "";

  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const logLine = document.createElement("p");
    logLine.className = "message message-info";
    logLine.textContent = `${file.name}: uploading & processing with Buffalo Face AI…`;
    logEl.appendChild(logLine);

    try {
      const formData = new FormData();
      formData.append("photo", file);
      formData.append("eventId", eventId);

      const response = await fetch(`${API_BASE_URL}/photos/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!data.success) throw new Error(data.message || "Upload failed.");

      const faceCount = data.photo && data.photo.faceCount !== undefined ? data.photo.faceCount : 0;
      logLine.textContent = `${file.name}: done ✓ (${faceCount} face${faceCount === 1 ? "" : "s"} indexed)`;
      logLine.className = "message message-success";
      succeeded++;
    } catch (error) {
      console.error(`Failed to process ${file.name}:`, error);
      logLine.textContent = `${file.name}: failed — ${error.message}`;
      logLine.className = "message message-error";
      failed++;
    }

    const percent = Math.round(((i + 1) / files.length) * 100);
    progressFillEl.style.width = `${percent}%`;
    summaryTextEl.textContent = `${i + 1} / ${files.length} processed — ${succeeded} succeeded, ${failed} failed`;
  }

  uploadBtn.disabled = false;
  fileInput.value = "";
  updateUploadButtonState();
}
