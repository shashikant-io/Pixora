/**
 * Pixora — Photographer & Admin Authentication Controller
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
  // Elements
  const alertBox = document.getElementById("login-alert");
  const tabPassword = document.getElementById("tab-password");
  const tabOtp = document.getElementById("tab-otp");
  const panelPassword = document.getElementById("password-login-form");
  const panelOtp = document.getElementById("otp-login-panel");

  // Password Login Elements
  const loginEmailInput = document.getElementById("login-email");
  const loginPasswordInput = document.getElementById("login-password");
  const togglePasswordBtn = document.getElementById("toggle-password-btn");
  const btnQuickFill = document.getElementById("btn-quick-fill");
  const rememberMeCheckbox = document.getElementById("remember-me");
  const btnPasswordSubmit = document.getElementById("btn-password-submit");

  // OTP Login Elements
  const otpRequestForm = document.getElementById("otp-request-form");
  const otpVerifyForm = document.getElementById("otp-verify-form");
  const otpEmailInput = document.getElementById("otp-email");
  const btnSendOtp = document.getElementById("btn-send-otp");
  const btnVerifyOtp = document.getElementById("btn-verify-otp");
  const otpTargetDisplay = document.getElementById("otp-target-display");
  const btnChangeEmail = document.getElementById("btn-change-email");
  const otpDigitInputs = document.querySelectorAll(".otp-digit");
  const otpCountdownEl = document.getElementById("otp-countdown");
  const btnResendOtp = document.getElementById("btn-resend-otp");

  let countdownInterval = null;
  let remainingSeconds = 300; // 5 minutes

  // Get redirect parameter from URL
  const urlParams = new URLSearchParams(window.location.search);
  const redirectTarget = urlParams.get("redirect") || "admin.html";

  // 1. Check if user is already logged in
  checkExistingSession();

  async function checkExistingSession() {
    const token = localStorage.getItem("photo_finder_token") || sessionStorage.getItem("photo_finder_token");
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (data.success) {
        showAlert("info", `Already logged in as ${data.user.name || data.user.email}. Redirecting to dashboard...`);
        setTimeout(() => {
          window.location.href = redirectTarget;
        }, 600);
      }
    } catch (e) {
      // Token invalid or expired, clear stale session
      localStorage.removeItem("photo_finder_token");
      sessionStorage.removeItem("photo_finder_token");
    }
  }

  // 2. Alert Box Display Helper
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

    alertBox.innerHTML = `
      <span class="alert-icon">${iconSvg}</span>
      <span class="alert-text">${message}</span>
    `;
    alertBox.style.display = "flex";
  }

  function hideAlert() {
    if (alertBox) alertBox.style.display = "none";
  }

  // 3. Tab Switching
  if (tabPassword && tabOtp) {
    tabPassword.addEventListener("click", () => {
      tabPassword.classList.add("active");
      tabPassword.setAttribute("aria-selected", "true");
      tabOtp.classList.remove("active");
      tabOtp.setAttribute("aria-selected", "false");

      panelPassword.style.display = "block";
      panelOtp.style.display = "none";
      hideAlert();
    });

    tabOtp.addEventListener("click", () => {
      tabOtp.classList.add("active");
      tabOtp.setAttribute("aria-selected", "true");
      tabPassword.classList.remove("active");
      tabPassword.setAttribute("aria-selected", "false");

      panelOtp.style.display = "block";
      panelPassword.style.display = "none";
      hideAlert();
    });
  }

  // 4. Quick Fill Admin Credentials
  if (btnQuickFill) {
    btnQuickFill.addEventListener("click", () => {
      loginEmailInput.value = "shahikantchilga03@gmail.com";
      loginPasswordInput.value = "pipb ufbt wkow zjzk";
      loginPasswordInput.type = "text";
      updateEyeIcon(true);
      showAlert("info", "Autofilled configured admin credentials.");
    });
  }

  // 5. Password Visibility Toggle
  if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener("click", () => {
      const isPass = loginPasswordInput.type === "password";
      loginPasswordInput.type = isPass ? "text" : "password";
      updateEyeIcon(isPass);
    });
  }

  function updateEyeIcon(isVisible) {
    const eyeIcon = document.getElementById("eye-icon");
    if (!eyeIcon) return;
    if (isVisible) {
      eyeIcon.innerHTML = `
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
        <line x1="1" y1="1" x2="23" y2="23"></line>
      `;
    } else {
      eyeIcon.innerHTML = `
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      `;
    }
  }

  // 6. Handle Password Login Submission
  if (panelPassword) {
    panelPassword.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideAlert();

      const email = loginEmailInput.value.trim();
      const password = loginPasswordInput.value.trim();

      if (!email || !password) {
        showAlert("error", "Please enter both your admin email and password.");
        return;
      }

      setButtonLoading(btnPasswordSubmit, true);

      try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Invalid credentials. Please verify your email and password.");
        }

        // Save session
        const storage = rememberMeCheckbox && rememberMeCheckbox.checked ? localStorage : sessionStorage;
        storage.setItem("photo_finder_token", result.token);
        storage.setItem("photo_finder_user", JSON.stringify(result.user));

        showAlert("success", "Sign in successful! Entering dashboard...");

        setTimeout(() => {
          window.location.href = redirectTarget;
        }, 600);
      } catch (err) {
        showAlert("error", err.message);
      } finally {
        setButtonLoading(btnPasswordSubmit, false);
      }
    });
  }

  // 7. Handle OTP Request Form
  if (otpRequestForm) {
    otpRequestForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideAlert();

      const email = otpEmailInput.value.trim();
      if (!email) {
        showAlert("error", "Please enter your administrator email address.");
        return;
      }

      setButtonLoading(btnSendOtp, true);

      try {
        const response = await fetch(`${API_BASE_URL}/auth/send-otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });


        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Failed to dispatch verification code.");
        }

        // Switch to Step 2
        otpTargetDisplay.textContent = result.email || email;
        otpRequestForm.style.display = "none";
        otpVerifyForm.style.display = "block";

        if (result.sentToInbox) {
          showAlert("success", `✓ Verification code sent to your inbox (${email})`);
        } else if (result.devOtp) {
          showAlert("info", `⚡ <strong>Passcode: <span style="letter-spacing: 2px; font-size: 1.1rem; color: #FFF;">${result.devOtp}</span></strong><br/><span style="font-size: 0.78rem; opacity: 0.85;">(Google SMTP rejected App Password. Code autofilled for instant login).</span>`);
          
          // Auto-fill OTP boxes
          const digits = result.devOtp.split("");
          digits.forEach((digit, i) => {
            if (otpDigitInputs[i]) {
              otpDigitInputs[i].value = digit;
            }
          });
        } else {
          showAlert("success", result.message || `Verification code generated for ${email}`);
        }

        // Start countdown timer
        startOtpCountdown();

        // Focus first OTP input or submit button
        if (otpDigitInputs.length > 0) {
          otpDigitInputs[0].focus();
        }
      } catch (err) {
        showAlert("error", err.message);
      } finally {
        setButtonLoading(btnSendOtp, false);
      }
    });
  }

  // 8. Change Email in OTP flow
  if (btnChangeEmail) {
    btnChangeEmail.addEventListener("click", () => {
      clearInterval(countdownInterval);
      otpVerifyForm.style.display = "none";
      otpRequestForm.style.display = "block";
      hideAlert();
    });
  }

  // 9. OTP Digit Inputs Auto-advance & Paste Handling
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

      const nextFocusIndex = Math.min(digits.length, otpDigitInputs.length - 1);
      otpDigitInputs[nextFocusIndex].focus();
    });
  });

  // 10. OTP Countdown Timer
  function startOtpCountdown() {
    clearInterval(countdownInterval);
    remainingSeconds = 300;
    if (btnResendOtp) {
      btnResendOtp.disabled = true;
      btnResendOtp.style.opacity = "0.5";
    }

    updateTimerDisplay();

    countdownInterval = setInterval(() => {
      remainingSeconds--;
      updateTimerDisplay();

      if (remainingSeconds <= 0) {
        clearInterval(countdownInterval);
        if (btnResendOtp) {
          btnResendOtp.disabled = false;
          btnResendOtp.style.opacity = "1";
        }
        if (otpCountdownEl) {
          otpCountdownEl.textContent = "Expired";
        }
      }
    }, 1000);
  }

  function updateTimerDisplay() {
    if (!otpCountdownEl) return;
    const mins = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;
    otpCountdownEl.textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  // 11. Resend OTP handler
  if (btnResendOtp) {
    btnResendOtp.addEventListener("click", () => {
      if (otpRequestForm) {
        otpRequestForm.dispatchEvent(new Event("submit"));
      }
    });
  }

  // 12. Handle OTP Verify Form Submission
  if (otpVerifyForm) {
    otpVerifyForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideAlert();

      let otpCode = "";
      otpDigitInputs.forEach((input) => {
        otpCode += input.value.trim();
      });

      if (otpCode.length !== 6) {
        showAlert("error", "Please enter the complete 6-digit verification passcode.");
        return;
      }

      const email = (otpTargetDisplay ? otpTargetDisplay.textContent : otpEmailInput.value).trim();

      setButtonLoading(btnVerifyOtp, true);

      try {
        const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, otp: otpCode }),
        });


        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Invalid verification code. Please check and try again.");
        }

        // Save session
        const storage = rememberMeCheckbox && rememberMeCheckbox.checked ? localStorage : sessionStorage;
        storage.setItem("photo_finder_token", result.token);
        storage.setItem("photo_finder_user", JSON.stringify(result.user));

        showAlert("success", "Code verified! Entering dashboard...");

        setTimeout(() => {
          window.location.href = redirectTarget;
        }, 600);
      } catch (err) {
        showAlert("error", err.message);
      } finally {
        setButtonLoading(btnVerifyOtp, false);
      }
    });
  }

  // 13. Button Spinner Helper
  function setButtonLoading(btn, isLoading) {
    if (!btn) return;
    const textEl = btn.querySelector(".btn-text");
    const spinnerEl = btn.querySelector(".btn-spinner");

    btn.disabled = isLoading;
    if (textEl) textEl.style.display = isLoading ? "none" : "inline-block";
    if (spinnerEl) spinnerEl.style.display = isLoading ? "inline-flex" : "none";
  }
});
