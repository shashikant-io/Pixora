const { initModels, getSessions, isLoaded } = require("./modelLoader");
const { detectFaces } = require("./detector");
const { generateEmbedding, getLandmarks2D } = require("./embedder");
const { cosineSimilarity, euclideanDistance, findMatchingPhotos } = require("./matcher");

/**
 * Initialize all Buffalo ONNX inference sessions.
 */
async function initFaceRecognition(modelsDir) {
  return await initModels(modelsDir);
}

/**
 * Process a wedding photo: detects all faces and extracts ArcFace embeddings.
 * @param {Buffer} imageBuffer - Raw image buffer
 * @returns {Promise<Array<{embedding: Array<number>, boundingBox: Object, score: number, landmarks: Array}>>}
 */
async function processPhotoFaces(imageBuffer) {
  const detections = await detectFaces(imageBuffer);
  const faces = [];

  for (const det of detections) {
    try {
      const embedding = await generateEmbedding(imageBuffer, det.landmarks);
      faces.push({
        embedding,
        boundingBox: det.boundingBox,
        score: det.score,
        landmarks: det.landmarks
      });
    } catch (err) {
      console.warn("Failed to generate embedding for detected face:", err.message);
    }
  }

  return faces;
}

/**
 * Process a guest selfie: detects the main face and extracts its ArcFace embedding.
 * @param {Buffer} imageBuffer - Selfie image buffer
 * @returns {Promise<{embedding: Array<number>, boundingBox: Object, score: number, faceCount: number}>}
 */
async function processSelfieFace(imageBuffer) {
  const detections = await detectFaces(imageBuffer);

  if (detections.length === 0) {
    throw new Error("No face detected. Please upload a clear selfie showing your face.");
  }

  // Sort by largest face area or highest confidence
  detections.sort((a, b) => (b.boundingBox.width * b.boundingBox.height) - (a.boundingBox.width * a.boundingBox.height));
  const primaryFace = detections[0];

  const embedding = await generateEmbedding(imageBuffer, primaryFace.landmarks);

  return {
    embedding,
    boundingBox: primaryFace.boundingBox,
    score: primaryFace.score,
    faceCount: detections.length
  };
}

module.exports = {
  initFaceRecognition,
  detectFaces,
  generateEmbedding,
  getLandmarks2D,
  processPhotoFaces,
  processSelfieFace,
  cosineSimilarity,
  euclideanDistance,
  findMatchingPhotos,
  isLoaded
};
