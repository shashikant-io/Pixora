/**
 * Pixora — Dedicated Admin 6-Digit Email OTP Authentication Controller
 */

function getApiBaseUrl() {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const port = window.location.port;
    if ((host === "localhost" || host === "127.0.0.1") && port && port !== "4000") {
      return "http://localhost:4000/api";
    }
    if (window.location.protocol === "file:") {
      return "http://localhost:4000/api";
    }
  }
  return "/api";
}
const API_BASE_URL = getApiBaseUrl();


document.addEventListener("DOMContentLoaded", () => {
  const alertBox = document.getElementById("admin-alert");
  const sendOtpForm = document.getElementById("admin-send-otp-form");
  const verifyOtpForm = document.getElementById("admin-verify-otp-form");
  const emailInput = document.getElementById("admin-email-input");
  const btnSend = document.getElementById("btn-admin-send");
  const btnVerify = document.getElementById("btn-admin-verify");
  const targetEmailDisplay = document.getElementById("admin-target-email-display");
  const btnChangeEmail = document.getElementById("btn-admin-change-email");
  const btnResend = document.getElementById("btn-admin-resend");
  const resendCountdownEl = document.getElementById("admin-resend-countdown");
  const expiryTimerEl = document.getElementById("admin-otp-expiry-timer");
  const otpDigitInputs = document.querySelectorAll("#admin-otp-grid .otp-digit");

  let resendInterval = null;
  let expiryInterval = null;
  let resendSecondsRemaining = 60;
  let expirySecondsRemaining = 300; // 5 minutes


  // Get redirect target if specified
  const urlParams = new URLSearchParams(window.location.search);
  const redirectTarget = urlParams.get("redirect") || "admin.html";

  // Check if admin is already logged in
  checkExistingAdminSession();

  async function checkExistingAdminSession() {
    const token = localStorage.getItem("photo_finder_admin_token") || localStorage.getItem("photo_finder_token");
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (data.success && data.user && data.user.role === "admin") {
        showAlert("info", `Already authenticated as Admin (${data.user.email}). Redirecting...`);
        setTimeout(() => {
          window.location.href = redirectTarget;
        }, 500);
      }
    } catch (e) {
      // Offline or network error
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

    // Bind retry / URL change link if present
    const linkBtn = alertBox.querySelector("#btn-troubleshoot-api");
    if (linkBtn) {
      linkBtn.onclick = (ev) => {
        ev.preventDefault();
        promptChangeApiUrl();
      };
    }
  }

  function hideAlert() {
    if (alertBox) alertBox.style.display = "none";
  }

  // Handle Step 1: Send Admin OTP
  if (sendOtpForm) {
    sendOtpForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideAlert();

      const email = emailInput.value.trim();
      if (!email) {
        showAlert("error", "Please enter your administrator Gmail address.");
        return;
      }

      setButtonLoading(btnSend, true);

      try {
        const response = await fetch(`${API_BASE_URL}/auth/admin/send-otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Failed to send verification code.");
        }

        // Switch to Step 2
        targetEmailDisplay.textContent = email;
        sendOtpForm.style.display = "none";
        verifyOtpForm.style.display = "block";

        showAlert("success", `✓ Verification code sent to ${email}`);

        // Start Timers
        startResendCooldown();
        startExpiryTimer();

        // Focus first OTP input
        clearOtpInputs();
        if (otpDigitInputs.length > 0) {
          otpDigitInputs[0].focus();
        }
      } catch (err) {
        console.error("Admin OTP Send Error:", err);
        if (err.message && (err.message.includes("Failed to fetch") || err.message.includes("NetworkError"))) {
          showAlert("error", `Could not connect to backend server at <code>${API_BASE_URL}</code>.<br/><br/>👉 Make sure your backend server is running on port 4000 and port visibility is <strong>Public</strong>.<br/><br/><a href="#" id="btn-troubleshoot-api" style="color:#FFF;text-decoration:underline;font-weight:600;">⚙ Click here to update backend URL</a>`);
        } else {
          showAlert("error", err.message || "Could not send verification code.");
        }
      } finally {
        setButtonLoading(btnSend, false);
      }
    });
  }


  // Handle Change Email
  if (btnChangeEmail) {
    btnChangeEmail.addEventListener("click", () => {
      clearInterval(resendInterval);
      clearInterval(expiryInterval);
      verifyOtpForm.style.display = "none";
      sendOtpForm.style.display = "block";
      hideAlert();
      emailInput.focus();
    });
  }

  // Handle OTP Inputs
  otpDigitInputs.forEach((input, index) => {
    input.addEventListener("input", (e) => {
      const val = e.target.value.replace(/[^0-9]/g, "");
      e.target.value = val;

      if (val.length === 1 && index < otpDigitInputs.length - 1) {
        otpDigitInputs[index + 1].focus();
      }
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !e.target.value && index > 0) {
        otpDigitInputs[index - 1].focus();
      }
    });

    input.addEventListener("paste", (e) => {
      e.preventDefault();
      const pasteData = (e.clipboardData || window.clipboardData).getData("text").trim();
      const digits = pasteData.replace(/[^0-9]/g, "").slice(0, 6).split("");

      digits.forEach((digit, i) => {
        if (otpDigitInputs[i]) {
          otpDigitInputs[i].value = digit;
        }
      });

      const nextFocus = Math.min(digits.length, otpDigitInputs.length - 1);
      otpDigitInputs[nextFocus].focus();
    });
  });

  function clearOtpInputs() {
    otpDigitInputs.forEach((input) => {
      input.value = "";
    });
  }

  // Resend Cooldown (60s)
  function startResendCooldown() {
    clearInterval(resendInterval);
    resendSecondsRemaining = 60;
    btnResend.disabled = true;
    btnResend.style.opacity = "0.5";
    resendCountdownEl.textContent = "60";

    resendInterval = setInterval(() => {
      resendSecondsRemaining--;
      if (resendCountdownEl) resendCountdownEl.textContent = resendSecondsRemaining;

      if (resendSecondsRemaining <= 0) {
        clearInterval(resendInterval);
        btnResend.disabled = false;
        btnResend.style.opacity = "1";
        btnResend.innerHTML = "Resend Code";
      }
    }, 1000);
  }

  // Expiry Timer (5 min)
  function startExpiryTimer() {
    clearInterval(expiryInterval);
    expirySecondsRemaining = 300;

    const updateDisplay = () => {
      const mins = Math.floor(expirySecondsRemaining / 60);
      const secs = expirySecondsRemaining % 60;
      if (expiryTimerEl) {
        expiryTimerEl.textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
      }
    };

    updateDisplay();

    expiryInterval = setInterval(() => {
      expirySecondsRemaining--;
      updateDisplay();

      if (expirySecondsRemaining <= 0) {
        clearInterval(expiryInterval);
        if (expiryTimerEl) expiryTimerEl.textContent = "Expired";
        showAlert("error", "Your verification code has expired. Please request a new code.");
      }
    }, 1000);
  }

  // Resend Button Click
  if (btnResend) {
    btnResend.addEventListener("click", () => {
      if (sendOtpForm) {
        sendOtpForm.dispatchEvent(new Event("submit"));
      }
    });
  }

  // Handle Step 2: Verify Admin OTP
  if (verifyOtpForm) {
    verifyOtpForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideAlert();

      let otpCode = "";
      otpDigitInputs.forEach((input) => {
        otpCode += input.value.trim();
      });

      if (otpCode.length !== 6) {
        showAlert("error", "Please enter the complete 6-digit verification code.");
        return;
      }

      const email = (targetEmailDisplay ? targetEmailDisplay.textContent : emailInput.value).trim();

      setButtonLoading(btnVerify, true);

      try {
        const response = await fetch(`${API_BASE_URL}/auth/admin/verify-otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, otp: otpCode }),
        });


        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Invalid verification code.");
        }

        // Save Admin Token in storage
        localStorage.setItem("photo_finder_admin_token", result.token);
        localStorage.setItem("photo_finder_token", result.token);
        localStorage.setItem("photo_finder_user", JSON.stringify(result.user));

        showAlert("success", "✓ Verification successful! Redirecting to Dashboard...");

        setTimeout(() => {
          window.location.href = redirectTarget;
        }, 500);
      } catch (err) {

        console.error("Admin OTP Verify Error:", err);
        if (err.message && (err.message.includes("Failed to fetch") || err.message.includes("NetworkError"))) {
          showAlert("error", `Could not connect to backend server at <code>${API_BASE_URL}</code>.<br/><br/>👉 Make sure your backend server is running on port 4000 and port visibility is <strong>Public</strong>.<br/><br/><a href="#" id="btn-troubleshoot-api" style="color:#FFF;text-decoration:underline;font-weight:600;">⚙ Click here to update backend URL</a>`);
        } else {
          showAlert("error", err.message || "Invalid verification code.");
        }
      } finally {
        setButtonLoading(btnVerify, false);
      }

    });
  }

  function setButtonLoading(btn, isLoading) {
    if (!btn) return;
    const textEl = btn.querySelector(".btn-text");
    const spinnerEl = btn.querySelector(".btn-spinner");

    btn.disabled = isLoading;
    if (textEl) textEl.style.display = isLoading ? "none" : "inline-block";
    if (spinnerEl) spinnerEl.style.display = isLoading ? "inline-flex" : "none";
  }
});
