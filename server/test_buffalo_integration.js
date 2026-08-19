const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const {
  initFaceRecognition,
  detectFaces,
  generateEmbedding,
  getLandmarks2D,
  cosineSimilarity,
  findMatchingPhotos,
  processPhotoFaces,
  processSelfieFace
} = require("./faceRecognition");

async function runIntegrationTest() {
  console.log("==================================================");
  console.log("  BUFFALO ONNX FACE RECOGNITION INTEGRATION TEST  ");
  console.log("==================================================\n");

  const modelsDir = path.join(__dirname, "models", "buffalo_m");

  // 1. Model Loading Check
  const sessions = await initFaceRecognition(modelsDir);

  if (sessions.det) console.log("✓ det_2.5g.onnx loaded");
  else throw new Error("det_2.5g.onnx failed to load");

  if (sessions.embed) console.log("✓ w600k_r50.onnx loaded");
  else throw new Error("w600k_r50.onnx failed to load");

  if (sessions.landmark2d) console.log("✓ 2d106det.onnx loaded");
  else console.log("⚠ 2d106det.onnx optional");

  if (sessions.landmark3d) console.log("✓ 1k3d68.onnx loaded");
  else console.log("⚠ 1k3d68.onnx optional");

  if (sessions.genderage) console.log("✓ genderage.onnx loaded (available)");
  else console.log("⚠ genderage.onnx optional");

  // 2. Test Face Detection
  // Create a synthetic image buffer with an oval face-like pattern or test image
  const testCanvas = await sharp({
    create: {
      width: 400,
      height: 400,
      channels: 3,
      background: { r: 230, g: 200, b: 180 }
    }
  }).jpeg().toBuffer();

  const faces = await detectFaces(testCanvas, { confThreshold: 0.1 });
  console.log(`✓ Face detection pipeline operational (evaluated test canvas)`);

  // 3. Test Face Embedding Generation
  // 5 dummy landmarks for testing embedding extraction
  const sampleLandmarks = [
    [150, 150], // left eye
    [250, 150], // right eye
    [200, 200], // nose
    [160, 260], // left mouth
    [240, 260]  // right mouth
  ];

  const embedding1 = await generateEmbedding(testCanvas, sampleLandmarks);
  console.log(`✓ Face embedding generated (Vector dimensions: ${embedding1.length})`);

  // Verify embedding vector length is 512
  if (embedding1.length !== 512) {
    throw new Error(`Expected 512-dim embedding from w600k_r50, got ${embedding1.length}`);
  }

  // 4. Test Embedding Comparison (Cosine Similarity)
  const embedding2 = await generateEmbedding(testCanvas, sampleLandmarks);
  const selfSimilarity = cosineSimilarity(embedding1, embedding2);
  console.log(`✓ Embedding comparison working (Self-similarity: ${selfSimilarity.toFixed(4)})`);

  if (selfSimilarity < 0.99) {
    throw new Error("Cosine similarity of identical embeddings should be ~1.0");
  }

  // 5. Test Matching Photos
  const mockPhotos = [
    {
      _id: "photo_1",
      imageUrl: "https://example.com/photo1.jpg",
      faces: [{ embedding: embedding1 }]
    },
    {
      _id: "photo_2",
      imageUrl: "https://example.com/photo2.jpg",
      faces: [{ embedding: new Array(512).fill(0.01) }]
    }
  ];

  const matches = findMatchingPhotos(embedding1, mockPhotos, 0.5);
  console.log(`✓ Matching photos test: Found ${matches.length} matching photo(s) (Top match score: ${matches[0].similarity})`);

  console.log("\n==================================================");
  console.log("  ALL BUFFALO ONNX INTEGRATION CHECKS PASSED ✓   ");
  console.log("==================================================");
}

runIntegrationTest().catch((err) => {
  console.error("\n❌ Integration test failed:", err);
  process.exit(1);
});
