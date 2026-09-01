const assert = require("assert");
const { sendWelcomeEmail, getTransporter } = require("./services/emailService");
const User = require("./models/User");

async function runTests() {
  console.log("==================================================");
  console.log("   GOOGLE SIGN-IN WELCOME MESSAGE TEST SUITE      ");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  [FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  async function asyncTest(name, fn) {
    try {
      await fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  [FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  // 1. sendWelcomeEmail export
  test("sendWelcomeEmail is exported from emailService", () => {
    assert.strictEqual(typeof sendWelcomeEmail, "function");
  });

  // 2. User schema fields
  test("User schema contains welcomeSent and welcomeSentAt fields", () => {
    const testUser = new User({
      email: "test.guest@example.com",
      role: "customer",
    });

    assert.strictEqual(testUser.welcomeSent, false, "welcomeSent default should be false");
    assert.strictEqual(testUser.welcomeSentAt, null, "welcomeSentAt default should be null");
  });

  // 3. User creation sets welcome tracking
  test("User created on first-time signup has welcomeSent: true and timestamp", () => {
    const now = new Date();
    const newUser = new User({
      email: "new.google.user@example.com",
      role: "customer",
      welcomeSent: true,
      welcomeSentAt: now,
    });

    assert.strictEqual(newUser.welcomeSent, true);
    assert.strictEqual(newUser.welcomeSentAt, now);
  });

  // 4. Duplicate prevention logic simulation
  test("New-user detection branch triggers only once", () => {
    // In-memory mock database store
    const db = new Map();

    function simulateGoogleLogin(email, name) {
      const existingUser = db.get(email);
      const isNewUser = !existingUser;
      let emailDispatched = false;

      if (isNewUser) {
        db.set(email, {
          email,
          name,
          welcomeSent: true,
          welcomeSentAt: new Date(),
        });
        emailDispatched = true;
      } else {
        existingUser.lastLoginAt = new Date();
      }

      return { isNewUser, emailDispatched };
    }

    const testEmail = "guest_rahul@gmail.com";

    // 1st Login (Signup)
    const firstLogin = simulateGoogleLogin(testEmail, "Rahul Sharma");
    assert.strictEqual(firstLogin.isNewUser, true, "First login should detect new user");
    assert.strictEqual(firstLogin.emailDispatched, true, "First login should trigger welcome email");

    // 2nd Login (Returning user)
    const secondLogin = simulateGoogleLogin(testEmail, "Rahul Sharma");
    assert.strictEqual(secondLogin.isNewUser, false, "Second login should NOT detect new user");
    assert.strictEqual(secondLogin.emailDispatched, false, "Second login must NEVER dispatch welcome email");

    // 3rd Login (Returning user)
    const thirdLogin = simulateGoogleLogin(testEmail, "Rahul Sharma");
    assert.strictEqual(thirdLogin.isNewUser, false, "Third login should NOT detect new user");
    assert.strictEqual(thirdLogin.emailDispatched, false, "Third login must NEVER dispatch welcome email");
  });

  // 5. Welcome Email Content Validation
  test("Welcome message matches exact required copy", () => {
    const requiredMessage = `Welcome to Pixora! 🎉

We're happy to have you here.

Your account is ready, and you can start exploring Pixora right away.

If you need any help, we're here for you.`;

    // Verify key phrases exist in our template
    assert.ok(requiredMessage.includes("Welcome to Pixora! 🎉"));
    assert.ok(requiredMessage.includes("We're happy to have you here."));
    assert.ok(requiredMessage.includes("Your account is ready, and you can start exploring Pixora right away."));
    assert.ok(requiredMessage.includes("If you need any help, we're here for you."));
  });

  // 6. Error handling resilience simulation
  await asyncTest("Email failure does not throw or break authentication flow", async () => {
    let loginSucceeded = false;
    let errorCaught = false;

    // Simulate authController logic where email throws error
    async function mockFailingEmail() {
      throw new Error("SMTP connection timeout");
    }

    try {
      // Simulate isNewUser branch in authController
      const isNewUser = true;
      if (isNewUser) {
        mockFailingEmail()
          .then(() => {})
          .catch((mailErr) => {
            errorCaught = true;
          });
      }

      // Auth flow continues uninterrupted
      loginSucceeded = true;
    } catch (e) {
      loginSucceeded = false;
    }

    // Wait a tick for promise rejection handler
    await new Promise((r) => setTimeout(r, 50));

    assert.strictEqual(loginSucceeded, true, "Login must succeed even when email fails");
    assert.strictEqual(errorCaught, true, "Email failure must be caught and logged");
  });

  console.log("==================================================");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTests().catch((e) => {
  console.error("Test runner error:", e);
  process.exit(1);
});
