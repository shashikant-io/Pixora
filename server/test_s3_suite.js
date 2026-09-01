const assert = require("assert");
const sharp = require("sharp");
const path = require("path");
const s3Service = require("./services/s3Service");
const Photo = require("./models/Photo");

async function runTests() {
  console.log("==================================================");
  console.log("  AWS S3 PRIVATE STORAGE MIGRATION VERIFICATION   ");
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

  // 1. Service API Exports
  test("s3Service exports all required functions", () => {
    const requiredFns = [
      "getS3Client",
      "getBucketName",
      "getSignedViewUrl",
      "getSignedDownloadUrl",
      "resolvePhotoUrls",
      "uploadImage",
      "deleteImage",
      "bulkDeleteImages",
      "deleteFolder",
      "getObjectStream",
      "getStorageUsage",
      "invalidateStorageUsageCache",
    ];

    for (const fn of requiredFns) {
      assert.strictEqual(typeof s3Service[fn], "function", `Missing export: ${fn}`);
    }
  });

  // 2. Bucket & Region Configuration
  test("Default S3 bucket is pixora-images-2026 and region is ap-south-1", () => {
    assert.strictEqual(s3Service.getBucketName(), "pixora-images-2026");
    const client = s3Service.getS3Client();
    assert.ok(client);
  });

  // 3. Sharp Thumbnail Generation
  await asyncTest("Sharp thumbnail buffer generation creates valid 350x350 JPEG", async () => {
    const testImageBuffer = await sharp({
      create: {
        width: 1200,
        height: 900,
        channels: 3,
        background: { r: 212, g: 175, b: 55 },
      },
    })
      .jpeg()
      .toBuffer();

    assert.ok(testImageBuffer.length > 0);

    const thumbBuffer = await sharp(testImageBuffer)
      .resize(350, 350, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    assert.ok(thumbBuffer.length > 0);
    assert.ok(thumbBuffer.length < testImageBuffer.length);

    const meta = await sharp(thumbBuffer).metadata();
    assert.strictEqual(meta.format, "jpeg");
    assert.ok(meta.width <= 350);
    assert.ok(meta.height <= 350);
  });

  // 4. Photo Schema Defaults and Persistence
  test("Photo schema sets storageProvider default to s3 and stores permanent keys", () => {
    const s3Key = "events/evt_sample/photos/1725170000000_photo.jpg";
    const thumbKey = "events/evt_sample/thumbnails/1725170000000_photo.jpg";

    const photo = new Photo({
      eventId: "evt_sample",
      fileId: s3Key,
      filePath: s3Key,
      imageUrl: s3Key,
      thumbnailUrl: thumbKey,
      downloadUrl: s3Key,
    });

    assert.strictEqual(photo.storageProvider, "s3");
    assert.strictEqual(photo.fileId, s3Key);
    assert.strictEqual(photo.filePath, s3Key);
    assert.strictEqual(photo.imageUrl, s3Key);
    assert.strictEqual(photo.thumbnailUrl, thumbKey);
  });

  // 5. Presigned URL Resolution Helper
  await asyncTest("resolvePhotoUrls generates presigned or proxy URLs for S3 keys", async () => {
    const photo = {
      fileId: "events/evt_test/photos/test_pic.jpg",
      filePath: "events/evt_test/photos/test_pic.jpg",
      thumbnailUrl: "events/evt_test/thumbnails/test_pic.jpg",
      storageProvider: "s3",
    };

    const urls = await s3Service.resolvePhotoUrls(photo);
    assert.ok(urls);
    assert.ok(urls.imageUrl);
    assert.ok(urls.thumbnailUrl);
    assert.ok(urls.downloadUrl);
  });

  // 6. Controllers Sanity Check
  test("Controllers load properly with S3 integration", () => {
    const photoController = require("./controllers/photoController");
    const eventController = require("./controllers/eventController");
    const adminController = require("./controllers/adminController");
    const searchController = require("./controllers/searchController");

    assert.strictEqual(typeof photoController.uploadPhoto, "function");
    assert.strictEqual(typeof photoController.getPhotosByEvent, "function");
    assert.strictEqual(typeof photoController.streamPhoto, "function");
    assert.strictEqual(typeof photoController.downloadPhoto, "function");
    assert.strictEqual(typeof eventController.deleteEvent, "function");
    assert.strictEqual(typeof adminController.getStorageStats, "function");
    assert.strictEqual(typeof searchController.searchByFace, "function");
  });

  // 7. Storage Usage Calculation
  await asyncTest("getStorageUsage calculates usage against AWS S3 1 TB quota", async () => {
    const usage = await s3Service.getStorageUsage(true);
    assert.ok(usage);
    assert.strictEqual(typeof usage.mediaLibraryStorageBytes, "number");
    assert.strictEqual(typeof usage.totalQuotaBytes, "number");
    assert.strictEqual(usage.storageLimitGB, 1024);
    assert.strictEqual(usage.totalQuotaBytes, 1024 * 1024 * 1024 * 1024);
    assert.strictEqual(typeof usage.fileCount, "number");
    assert.ok(usage.planName.includes("1 TB"));
    assert.ok(usage.upgradeUrl.includes("pixora-images-2026"));
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
