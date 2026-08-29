/**
 * Photo Finder — Customer Google Sign-In & Event Authorization Controller
 * Modern Firebase Web SDK (v10 Modular)
 */

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const API_BASE_URL = "/api";


document.addEventListener("DOMContentLoaded", async () => {
  const alertBox = document.getElementById("guest-alert");
  const eventDisplayName = document.getElementById("event-display-name");
  const eventBadgePill = document.getElementById("event-badge-pill");
  const btnGoogleLogin = document.getElementById("btn-google-login");
  const btnContinueFaceScan = document.getElementById("btn-continue-face-scan");
  const panelPreLogin = document.getElementById("panel-pre-login");
  const panelPostLogin = document.getElementById("panel-post-login");

  const userAvatarImg = document.getElementById("user-avatar-img");
  const userAvatarInitials = document.getElementById("user-avatar-initials");
  const userSignedInName = document.getElementById("user-signed-in-name");
  const userSignedInEmail = document.getElementById("user-signed-in-email");

  // Read event access token or event ID from URL query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const eventToken = (urlParams.get("token") || urlParams.get("event") || "").trim();

  let targetEventData = null;
  let firebaseApp = null;
  let firebaseAuth = null;
  let firebaseProvider = null;
  let cachedFirebaseConfig = null;

  // Validate event token on load
  if (!eventToken) {
    showAlert("error", "Missing event access token. Please scan a valid event QR code.");
    if (btnGoogleLogin) btnGoogleLogin.disabled = true;
    if (eventBadgePill) eventBadgePill.style.display = "none";
    return;
  }

  await loadEventDetails(eventToken);
  await initFirebaseClient();
  checkExistingSession();

  async function loadEventDetails(token) {
    try {
      const res = await fetch(`${API_BASE_URL}/events/${encodeURIComponent(token)}`);
      const data = await res.json();

      if (!res.ok || !data.success || !data.event) {
        throw new Error(data.message || "This event link is invalid or expired.");
      }

      targetEventData = data.event;
      if (eventDisplayName) {
        eventDisplayName.textContent = `💍 ${data.event.name}`;
      }
      if (eventBadgePill) {
        eventBadgePill.style.display = "inline-flex";
      }
    } catch (err) {
      console.warn("Event token lookup notice:", err.message);
      showAlert("error", "This event link is invalid or expired. Please scan a valid QR code.");
      if (btnGoogleLogin) btnGoogleLogin.disabled = true;
      if (eventBadgePill) eventBadgePill.style.display = "none";
    }
  }

  async function initFirebaseClient() {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/firebase-config`);
      const data = await res.json();

      const config = (data && data.config) || {};
      cachedFirebaseConfig = {
        apiKey: config.apiKey || "",
        authDomain: config.authDomain || "photo-finder-42151.firebaseapp.com",
        projectId: config.projectId || "photo-finder-42151",
        storageBucket: config.storageBucket || "photo-finder-42151.appspot.com",
        messagingSenderId: config.messagingSenderId || "",
        appId: config.appId || "",
      };

      if (cachedFirebaseConfig.apiKey) {
        firebaseApp = getApps().length > 0 ? getApps()[0] : initializeApp(cachedFirebaseConfig);
        firebaseAuth = getAuth(firebaseApp);
        firebaseProvider = new GoogleAuthProvider();
        firebaseProvider.addScope("profile");
        firebaseProvider.addScope("email");
        firebaseProvider.setCustomParameters({ prompt: "select_account" });
      }
    } catch (err) {
      console.warn("Firebase client init notice:", err.message);
    }
  }

  function checkExistingSession() {
    if (!targetEventData) return;

    const token = sessionStorage.getItem("photo_finder_customer_token") || localStorage.getItem("photo_finder_customer_token");
    const authedEvent = sessionStorage.getItem("photo_finder_customer_event") || localStorage.getItem("photo_finder_customer_event");
    const userRaw = sessionStorage.getItem("photo_finder_customer_user") || localStorage.getItem("photo_finder_customer_user");

    if (token && (authedEvent === targetEventData.eventId || authedEvent === targetEventData.accessToken)) {
      try {
        const user = userRaw ? JSON.parse(userRaw) : null;
        if (user) {
          showSignedInState(user, targetEventData.eventId);
        }
      } catch (e) {}
    }
  }

  function showAlert(type, message) {
    if (!alertBox) return;
    alertBox.className = `login-alert alert-${type}`;

    let iconSvg = "";
    if (type === "error") {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
    } else if (type === "success") {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
    } else {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    }

    alertBox.innerHTML = `<span class="alert-icon">${iconSvg}</span><span class="alert-text">${message}</span>`;
    alertBox.style.display = "flex";
  }

  function hideAlert() {
    if (alertBox) alertBox.style.display = "none";
  }

  // Handle "Continue with Google"
  if (btnGoogleLogin) {
    btnGoogleLogin.addEventListener("click", async () => {
      hideAlert();

      if (!targetEventData) {
        showAlert("error", "This event link is invalid or expired.");
        return;
      }

      setGoogleButtonLoading(true);

      try {
        if (!firebaseAuth || !firebaseProvider) {
          await initFirebaseClient();
        }

        if (!cachedFirebaseConfig || !cachedFirebaseConfig.apiKey) {
          throw new Error("Firebase Web App API Key is not set in server/.env (FIREBASE_API_KEY). Please add your Web API Key from Firebase Console.");
        }

        if (!firebaseAuth || !firebaseProvider) {
          firebaseApp = getApps().length > 0 ? getApps()[0] : initializeApp(cachedFirebaseConfig);
          firebaseAuth = getAuth(firebaseApp);
          firebaseProvider = new GoogleAuthProvider();
          firebaseProvider.addScope("profile");
          firebaseProvider.addScope("email");
          firebaseProvider.setCustomParameters({ prompt: "select_account" });
        }

        const authResult = await signInWithPopup(firebaseAuth, firebaseProvider);
        const firebaseUser = authResult.user;
        const idToken = await firebaseUser.getIdToken();

        // Verify ID token with backend & validate event access
        const response = await fetch(`${API_BASE_URL}/auth/customer/google-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idToken,
            token: eventToken,
          }),
        });


        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Google sign-in failed. Please try again.");
        }

        // Store authenticated customer session
        sessionStorage.setItem("photo_finder_customer_token", result.token);
        sessionStorage.setItem("photo_finder_customer_event", result.event.eventId);
        sessionStorage.setItem("photo_finder_customer_user", JSON.stringify(result.user));

        localStorage.setItem("photo_finder_customer_token", result.token);
        localStorage.setItem("photo_finder_customer_event", result.event.eventId);
        localStorage.setItem("photo_finder_customer_user", JSON.stringify(result.user));

        showSignedInState(result.user, result.event.eventId);
      } catch (err) {
        console.error("Google Auth error:", err);
        if (err.code === "auth/configuration-not-found" || (err.message && err.message.includes("configuration-not-found"))) {
          showAlert("error", "<strong>Google Sign-In is not enabled yet in your Firebase Console.</strong><br/><br/>👉 Go to <strong>Firebase Console &rarr; Authentication &rarr; Sign-in method &rarr; Google &rarr; Click Enable &rarr; Save</strong>.");
        } else if (err.code === "auth/popup-closed-by-user") {
          showAlert("info", "Sign-in was closed. Click 'Continue with Google' to try again.");
        } else if (err.code === "auth/unauthorized-domain") {
          showAlert("error", "This domain is not authorized in Firebase Console. Please add <code>" + window.location.hostname + "</code> to Firebase Console &rarr; Authentication &rarr; Settings &rarr; Authorized domains.");
        } else if (err.code === "auth/operation-not-allowed") {
          showAlert("error", "Google provider is disabled. Please enable Google in Firebase Console &rarr; Authentication &rarr; Sign-in method.");
        } else {
          showAlert("error", err.message || "Google sign-in failed. Please try again.");
        }
      } finally {
        setGoogleButtonLoading(false);
      }
    });
  }


  function showSignedInState(user, eventId) {
    if (panelPreLogin) panelPreLogin.style.display = "none";
    if (panelPostLogin) panelPostLogin.style.display = "block";

    if (userSignedInName) userSignedInName.textContent = user.name || "Guest User";
    if (userSignedInEmail) userSignedInEmail.textContent = user.email || "";

    if (user.picture && userAvatarImg) {
      userAvatarImg.src = user.picture;
      userAvatarImg.style.display = "block";
      if (userAvatarInitials) userAvatarInitials.style.display = "none";
    } else if (userAvatarInitials && user.name) {
      userAvatarInitials.textContent = user.name.charAt(0).toUpperCase();
      userAvatarInitials.style.display = "block";
      if (userAvatarImg) userAvatarImg.style.display = "none";
    }

    if (btnContinueFaceScan) {
      btnContinueFaceScan.onclick = () => {
        window.location.href = `guest.html?event=${encodeURIComponent(eventId)}`;
      };
    }
  }

  function setGoogleButtonLoading(isLoading) {
    if (!btnGoogleLogin) return;
    const textEl = btnGoogleLogin.querySelector(".btn-text");
    const spinnerEl = btnGoogleLogin.querySelector(".btn-spinner");

    btnGoogleLogin.disabled = isLoading;
    if (textEl) textEl.style.display = isLoading ? "none" : "inline";
    if (spinnerEl) spinnerEl.style.display = isLoading ? "inline-flex" : "none";
  }
});
