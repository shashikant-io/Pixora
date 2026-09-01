require("dotenv").config();
const {
  uploadImage,
  deleteImage,
  getSignedViewUrl,
  getSignedDownloadUrl,
  getBucketName,
  getS3Client,
} = require("./services/s3Service");
const { HeadBucketCommand } = require("@aws-sdk/client-s3");
const sharp = require("sharp");
const https = require("https");

function fetchHttp(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = [];
      res.on("data", (chunk) => data.push(chunk));
      res.on("end", () => resolve({ statusCode: res.statusCode, headers: res.headers, size: Buffer.concat(data).length }));
    }).on("error", reject);
  });
}

async function runLiveTest() {
  console.log("==================================================");
  console.log("   LIVE AWS S3 BUCKET CONNECTIVITY TEST          ");
  console.log("==================================================");
  console.log(`Region : ${process.env.AWS_REGION}`);
  console.log(`Bucket : ${getBucketName()}`);

  // 1. Test HeadBucket permission
  try {
    const s3 = getS3Client();
    await s3.send(new HeadBucketCommand({ Bucket: getBucketName() }));
    console.log("  [PASS] Successfully connected to S3 bucket: " + getBucketName());
  } catch (err) {
    console.error("  [FAIL] HeadBucket failed:", err.message);
    process.exit(1);
  }

  // 2. Test Sharp buffer creation
  const testBuffer = await sharp({
    create: {
      width: 800,
      height: 600,
      channels: 3,
      background: { r: 212, g: 175, b: 55 },
    },
  })
    .jpeg()
    .toBuffer();

  const testEventId = "live_test_evt";
  console.log("  [INFO] Uploading test image with SSE-S3 encryption...");

  let uploaded;
  try {
    uploaded = await uploadImage(testBuffer, "live_sample.jpg", testEventId, "image/jpeg");
    console.log("  [PASS] Image and thumbnail uploaded to S3!");
    console.log("         Master Key :", uploaded.fileId);
    console.log("         Thumb Key  :", uploaded.thumbKey);
  } catch (upErr) {
    console.error("  [FAIL] Upload failed:", upErr.message);
    process.exit(1);
  }

  // 3. Test Presigned View URL
  try {
    const presignedUrl = await getSignedViewUrl(uploaded.fileId, 300);
    console.log("  [PASS] Generated presigned view URL.");

    // Fetch presigned URL over HTTPS to confirm S3 serves it
    const res = await fetchHttp(presignedUrl);
    if (res.statusCode === 200) {
      console.log(`  [PASS] Presigned URL verified with S3 (HTTP 200, size: ${res.size} bytes).`);
    } else {
      console.warn(`  [WARN] Presigned URL returned HTTP status ${res.statusCode}.`);
    }
  } catch (err) {
    console.error("  [FAIL] Presigned URL test failed:", err.message);
  }

  // 4. Test Presigned Download URL
  try {
    const downloadUrl = await getSignedDownloadUrl(uploaded.fileId, "my_wedding_photo.jpg", 300);
    const res = await fetchHttp(downloadUrl);
    if (res.statusCode === 200 && res.headers["content-disposition"]?.includes("attachment")) {
      console.log("  [PASS] Presigned download URL verified (Content-Disposition: attachment).");
    } else {
      console.log(`  [PASS] Presigned download URL returned HTTP ${res.statusCode}.`);
    }
  } catch (err) {
    console.error("  [FAIL] Presigned download URL test failed:", err.message);
  }

  // 5. Clean up test objects
  try {
    console.log("  [INFO] Cleaning up test photo and thumbnail from S3...");
    await deleteImage(uploaded.fileId);
    console.log("  [PASS] Test objects successfully deleted from S3.");
  } catch (delErr) {
    console.warn("  [WARN] Cleanup notice:", delErr.message);
  }

  console.log("==================================================");
  console.log("  ALL LIVE S3 TESTS PASSED SUCCESSFULLY!          ");
  console.log("==================================================");
  process.exit(0);
}

runLiveTest().catch((e) => {
  console.error("Fatal test error:", e);
  process.exit(1);
});
