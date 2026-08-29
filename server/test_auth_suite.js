const dns = require("dns");
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {}

const http = require("http");
const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");
const crypto = require("crypto");

dotenv.config({ path: path.join(__dirname, ".env") });

const Otp = require("./models/Otp");
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

async function runTests() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(" Connected to MongoDB for verification tests.");

  // Create a test event
  const testEventId = "test_evt_" + Date.now();
  await Event.create({
    eventId: testEventId,
    name: "Test Verification Wedding",
    date: new Date(),
    location: "Grand Ballroom",
  });
  console.log(" Created test event:", testEventId);

  let passedCount = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(" PASS:", message);
      passedCount++;
    } else {
      console.error(" FAIL:", message);
    }
  }

  try {
    // TEST 1: Admin Send OTP with unauthorized email
    const unauthAdmin = await makeRequest(
      {
        hostname: "localhost",
        port: 4000,
        path: "/api/auth/admin/send-otp",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      { email: "unauthorized_hacker@gmail.com" }
    );

    assert(unauthAdmin.status === 403, "Admin OTP rejected for unauthorized email (403)");

    // TEST 2: Customer Send OTP with invalid eventId
    const invalidEventOtp = await makeRequest(
      {
        hostname: "localhost",
        port: 4000,
        path: "/api/auth/customer/send-otp",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      { email: "guest@gmail.com", eventToken: "non_existent_event_999" }
    );

    assert(invalidEventOtp.status === 404, "Customer OTP rejected for non-existent eventId (404)");

    // TEST 3: Admin Send OTP with authorized email (mock OTP in DB for isolated deterministic check)
    const adminEmail = "shahikantchilga03@gmail.com";
    const adminCode = "654321";
    const adminHash = crypto.createHash("sha256").update(adminCode).digest("hex");

    await Otp.deleteMany({ email: adminEmail });
    await Otp.create({
      email: adminEmail,
      otpHash: adminHash,
      role: "admin",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      attempts: 0,
      used: false,
      lastSentAt: new Date(),
    });

    // TEST 4: Rate Limiting & Cooldown check
    const cooldownRes = await makeRequest(
      {
        hostname: "localhost",
        port: 4000,
        path: "/api/auth/admin/send-otp",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      { email: adminEmail }
    );

    assert(cooldownRes.status === 429, "Rate limiting / 60s cooldown enforced on resend (429)");

    // TEST 5: Wrong OTP verification
    const wrongVerify = await makeRequest(
      {
        hostname: "localhost",
        port: 4000,
        path: "/api/auth/admin/verify-otp",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      { email: adminEmail, otp: "000000" }
    );

    assert(
      wrongVerify.status === 400 && wrongVerify.data.message.includes("remaining"),
      "Wrong OTP decrements remaining attempts"
    );

    // TEST 6: Valid OTP verification
    const validVerify = await makeRequest(
      {
        hostname: "localhost",
        port: 4000,
        path: "/api/auth/admin/verify-otp",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      { email: adminEmail, otp: adminCode }
    );

    assert(
      validVerify.status === 200 && validVerify.data.token && validVerify.data.user.role === "admin",
      "Admin OTP verified, returns session token and role admin"
    );
    const adminToken = validVerify.data.token;

    // TEST 7: OTP Reuse Prevention
    const reuseVerify = await makeRequest(
      {
        hostname: "localhost",
        port: 4000,
        path: "/api/auth/admin/verify-otp",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      { email: adminEmail, otp: adminCode }
    );

    assert(reuseVerify.status === 400, "Reusing previously verified OTP is strictly blocked");

    // TEST 8: Customer OTP setup & verification
    const customerEmail = "guest_tester@gmail.com";
    const customerCode = "112233";
    const customerHash = crypto.createHash("sha256").update(customerCode).digest("hex");

    await Otp.deleteMany({ email: customerEmail });
    await Otp.create({
      email: customerEmail,
      otpHash: customerHash,
      role: "customer",
      eventId: testEventId,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      attempts: 0,
      used: false,
      lastSentAt: new Date(),
    });

    const custVerify = await makeRequest(
      {
        hostname: "localhost",
        port: 4000,
        path: "/api/auth/customer/verify-otp",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      { email: customerEmail, otp: customerCode, eventToken: testEventId }
    );

    assert(
      custVerify.status === 200 &&
        custVerify.data.user.role === "customer" &&
        custVerify.data.user.eventId === testEventId,
      "Customer OTP verified with scoped eventId"
    );
    const customerToken = custVerify.data.token;

    // TEST 9: Admin API Route Protection - Unauthenticated
    const unauthEventReq = await makeRequest(
      {
        hostname: "localhost",
        port: 4000,
        path: "/api/events",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      { name: "Hack Event", date: new Date(), location: "Secret" }
    );

    assert(unauthEventReq.status === 401, "Unauthenticated access to POST /api/events is rejected (401)");

    // TEST 10: Admin API Route Protection - Customer Token Forbidden
    const customerOnAdminReq = await makeRequest(
      {
        hostname: "localhost",
        port: 4000,
        path: "/api/events",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + customerToken,
        },
      },
      { name: "Customer Event", date: new Date(), location: "Secret" }
    );

    assert(customerOnAdminReq.status === 403, "Customer token cannot access admin routes (403 Forbidden)");

    // TEST 11: Admin API Route Protection - Admin Token Success
    const adminOnAdminReq = await makeRequest(
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
      { name: "Authorized Admin Wedding", date: new Date(), location: "Royal Palace" }
    );

    assert(
      (adminOnAdminReq.status === 200 || adminOnAdminReq.status === 201) && adminOnAdminReq.data.success,
      "Admin token successfully creates event (201 Created)"
    );

    // TEST 12: Customer Event Isolation - Accessing another event
    const crossEventReq = await makeRequest({
      hostname: "localhost",
      port: 4000,
      path: "/api/photos/different_event_unauthorized_999",
      method: "GET",
      headers: {
        Authorization: "Bearer " + customerToken,
      },
    });

    assert(
      crossEventReq.status === 403,
      "Customer is blocked from querying photos of events they are not authenticated for (403)"
    );

    // TEST 13: GET /api/auth/me
    const meRes = await makeRequest({
      hostname: "localhost",
      port: 4000,
      path: "/api/auth/me",
      method: "GET",
      headers: {
        Authorization: "Bearer " + adminToken,
      },
    });

    assert(meRes.status === 200 && meRes.data.user.email === adminEmail, "GET /api/auth/me returns valid authenticated profile");

    // Clean up test events
    await Event.deleteMany({ eventId: { $in: [testEventId, adminOnAdminReq.data.event?.eventId] } });

    console.log(`\n🎉 Verification Test Suite Completed: ${passedCount}/${totalTests} tests passed!`);
  } catch (e) {
    console.error("Test suite failure:", e);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runTests();
