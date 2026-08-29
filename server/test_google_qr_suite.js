const dns = require("dns");
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {}

const http = require("http");
const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");

dotenv.config({ path: path.join(__dirname, ".env") });

const Event = require("./models/Event");
const User = require("./models/User");

function makeRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let d = "";
      res.on("data", (chunk) => (d += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(d) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: d });
        }
      });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runVerification() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB for Google & QR Flow Tests.");

  let passedCount = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log("✅ PASS:", message);
      passedCount++;
    } else {
      console.error("❌ FAIL:", message);
    }
  }

  try {
    const jwtSecret = process.env.JWT_SECRET || "photo_finder_jwt_secret_key_2026_luxury_secure";
    const adminToken = jwt.sign(
      { email: "shashikantchilga03@gmail.com", role: "admin" },
      jwtSecret,
      { expiresIn: "1h" }
    );

    // 1. Create Event with accessToken
    const createEventRes = await makeRequest(
      {
        hostname: "localhost",
        port: 4000,
        path: "/api/events",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + adminToken,
        },
      },
      {
        name: "Priya & Rahul Luxury Wedding",
        date: new Date(),
        location: "The Grand Palace, Mumbai",
      }
    );

    assert(
      createEventRes.status === 201 &&
        createEventRes.data.event &&
        createEventRes.data.event.accessToken &&
        createEventRes.data.event.guestUrl.includes("token="),
      "Admin creates event with unguessable accessToken and computed guestUrl"
    );

    const eventId = createEventRes.data.event.eventId;
    const accessToken = createEventRes.data.event.accessToken;
    console.log(` Created Event: ${eventId}, Token: ${accessToken}`);

    // 2. Resolve Event via Token
    const resolveTokenRes = await makeRequest({
      hostname: "localhost",
      port: 4000,
      path: `/api/events/${accessToken}`,
      method: "GET",
    });

    assert(
      resolveTokenRes.status === 200 &&
        resolveTokenRes.data.event.eventId === eventId &&
        resolveTokenRes.data.event.name === "Priya & Rahul Luxury Wedding",
      "Public endpoint resolves event details by unguessable accessToken"
    );

    // 3. Public Firebase Config
    const fbConfigRes = await makeRequest({
      hostname: "localhost",
      port: 4000,
      path: "/api/auth/firebase-config",
      method: "GET",
    });

    assert(
      fbConfigRes.status === 200 &&
        fbConfigRes.data.config &&
        fbConfigRes.data.config.projectId,
      "Public Firebase config endpoint provides Web SDK credentials"
    );

    // 4. Google Customer Login with Valid Event Token
    // Mock a valid Google user ID token for verification
    const mockGooglePayload = {
      uid: "google_guest_12345",
      email: "wedding_guest_priya@gmail.com",
      name: "Priya Sharma",
      picture: "https://lh3.googleusercontent.com/a/default-user",
    };
    const mockGoogleIdToken = jwt.sign(mockGooglePayload, "mock_google_secret", {
      expiresIn: "1h",
    });

    const googleLoginRes = await makeRequest(
      {
        hostname: "localhost",
        port: 4000,
        path: "/api/auth/customer/google-login",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      {
        idToken: mockGoogleIdToken,
        token: accessToken,
      }
    );

    assert(
      googleLoginRes.status === 200 &&
        googleLoginRes.data.token &&
        googleLoginRes.data.user.role === "customer" &&
        googleLoginRes.data.user.eventId === eventId,
      "Customer Google Sign-In succeeds and scopes session strictly to eventId"
    );

    const customerSessionToken = googleLoginRes.data.token;

    // 5. Google Customer Login with Invalid/Expired Event Token
    const invalidGoogleLoginRes = await makeRequest(
      {
        hostname: "localhost",
        port: 4000,
        path: "/api/auth/customer/google-login",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      {
        idToken: mockGoogleIdToken,
        token: "tok_invalid_fake_event_9999",
      }
    );

    assert(
      invalidGoogleLoginRes.status === 404 &&
        invalidGoogleLoginRes.data.message.includes("invalid or no longer available"),
      "Google Sign-In rejected for invalid/fake event access token (404)"
    );

    // 6. Cross-Event Access Isolation
    const crossEventRes = await makeRequest({
      hostname: "localhost",
      port: 4000,
      path: "/api/photos/EVT_UNAUTHORIZED_DIFFERENT_999",
      method: "GET",
      headers: {
        Authorization: "Bearer " + customerSessionToken,
      },
    });

    assert(
      crossEventRes.status === 403 &&
        crossEventRes.data.message.includes("authorized"),
      "Customer authenticated for Event A is strictly blocked from Event B photos (403)"
    );

    // 7. Verify Customer User in Database
    const dbUser = await User.findOne({ email: "wedding_guest_priya@gmail.com" });
    assert(
      dbUser && dbUser.role === "customer" && dbUser.name === "Priya Sharma",
      "Customer user profile correctly persisted in MongoDB User collection"
    );

    // Clean up test event
    await Event.deleteOne({ eventId });
    await User.deleteOne({ email: "wedding_guest_priya@gmail.com" });

    console.log(`\n🎉 Verification Complete: ${passedCount}/${totalTests} tests passed!`);
  } catch (err) {
    console.error("Test execution error:", err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runVerification();
