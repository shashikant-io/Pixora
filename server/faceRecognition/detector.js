const ort = require("onnxruntime-node");
const sharp = require("sharp");
const { getSessions, initModels } = require("./modelLoader");

// Config for SCRFD detection
const DET_WIDTH = 640;
const DET_HEIGHT = 640;
const STRIDE_CONFIGS = [
  { stride: 8, scoreKey: "446", bboxKey: "449", kpsKey: "452" },
  { stride: 16, scoreKey: "466", bboxKey: "469", kpsKey: "472" },
  { stride: 32, scoreKey: "486", bboxKey: "489", kpsKey: "492" }
];

/**
 * Detect faces in an image buffer using det_2.5g.onnx (SCRFD).
 * @param {Buffer} imageBuffer - Raw image buffer
 * @param {Object} options - Detection options
 * @param {number} options.confThreshold - Confidence threshold (default 0.5)
 * @param {number} options.iouThreshold - NMS IoU threshold (default 0.4)
 * @returns {Promise<Array<{boundingBox: {x: number, y: number, width: number, height: number}, score: number, landmarks: Array<[number, number]>}>>}
 */
async function detectFaces(imageBuffer, options = {}) {
  await initModels();
  const { det } = getSessions();

  const confThreshold = options.confThreshold !== undefined ? options.confThreshold : 0.5;
  const iouThreshold = options.iouThreshold !== undefined ? options.iouThreshold : 0.4;

  const metadata = await sharp(imageBuffer).metadata();
  const origW = metadata.width;
  const origH = metadata.height;

  if (!origW || !origH) {
    throw new Error("Invalid image: unable to read dimensions.");
  }

  // Calculate scaling factor for 640x640 with aspect ratio preserved
  const scale = Math.min(DET_WIDTH / origW, DET_HEIGHT / origH);
  const resizedW = Math.round(origW * scale);
  const resizedH = Math.round(origH * scale);

  const resizedRaw = await sharp(imageBuffer)
    .resize(resizedW, resizedH)
    .ensureAlpha()
    .raw()
    .toBuffer();

  // Create planar float32 NCHW tensor: (pixel - 127.5) / 128.0
  const inputData = new Float32Array(3 * DET_HEIGHT * DET_WIDTH);

  for (let y = 0; y < resizedH; y++) {
    for (let x = 0; x < resizedW; x++) {
      const srcIdx = (y * resizedW + x) * 4;
      const r = (resizedRaw[srcIdx] - 127.5) / 128.0;
      const g = (resizedRaw[srcIdx + 1] - 127.5) / 128.0;
      const b = (resizedRaw[srcIdx + 2] - 127.5) / 128.0;

      inputData[0 * DET_HEIGHT * DET_WIDTH + y * DET_WIDTH + x] = r;
      inputData[1 * DET_HEIGHT * DET_WIDTH + y * DET_WIDTH + x] = g;
      inputData[2 * DET_HEIGHT * DET_WIDTH + y * DET_WIDTH + x] = b;
    }
  }

  const tensor = new ort.Tensor("float32", inputData, [1, 3, DET_HEIGHT, DET_WIDTH]);
  const outputs = await det.run({ "input.1": tensor });

  const candidateBoxes = [];

  for (const { stride, scoreKey, bboxKey, kpsKey } of STRIDE_CONFIGS) {
    const scores = outputs[scoreKey].data;
    const bboxes = outputs[bboxKey].data;
    const kpsData = outputs[kpsKey].data;

    const cols = Math.floor(DET_WIDTH / stride);
    const rows = Math.floor(DET_HEIGHT / stride);
    const numAnchors = 2;

    let idx = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const anchorX = c * stride;
        const anchorY = r * stride;

        for (let a = 0; a < numAnchors; a++) {
          const score = scores[idx];
          if (score >= confThreshold) {
            const bboxOffset = idx * 4;
            const dx1 = bboxes[bboxOffset] * stride;
            const dy1 = bboxes[bboxOffset + 1] * stride;
            const dx2 = bboxes[bboxOffset + 2] * stride;
            const dy2 = bboxes[bboxOffset + 3] * stride;

            const x1_s = anchorX - dx1;
            const y1_s = anchorY - dy1;
            const x2_s = anchorX + dx2;
            const y2_s = anchorY + dy2;

            const kpsOffset = idx * 10;
            const kps = [];
            for (let k = 0; k < 5; k++) {
              const kx_s = anchorX + kpsData[kpsOffset + k * 2] * stride;
              const ky_s = anchorY + kpsData[kpsOffset + k * 2 + 1] * stride;
              kps.push([kx_s / scale, ky_s / scale]);
            }

            candidateBoxes.push({
              x1: Math.max(0, x1_s / scale),
              y1: Math.max(0, y1_s / scale),
              x2: Math.min(origW, x2_s / scale),
              y2: Math.min(origH, y2_s / scale),
              score,
              kps
            });
          }
          idx++;
        }
      }
    }
  }

  // Non-Maximum Suppression
  candidateBoxes.sort((a, b) => b.score - a.score);
  const finalBoxes = [];

  for (const box of candidateBoxes) {
    let keep = true;
    for (const kept of finalBoxes) {
      const xA = Math.max(box.x1, kept.x1);
      const yA = Math.max(box.y1, kept.y1);
      const xB = Math.min(box.x2, kept.x2);
      const yB = Math.min(box.y2, kept.y2);
      const inter = Math.max(0, xB - xA) * Math.max(0, yB - yA);
      const area1 = (box.x2 - box.x1) * (box.y2 - box.y1);
      const area2 = (kept.x2 - kept.x1) * (kept.y2 - kept.y1);
      const iou = inter / (area1 + area2 - inter + 1e-6);

      if (iou > iouThreshold) {
        keep = false;
        break;
      }
    }
    if (keep) finalBoxes.push(box);
  }

  return finalBoxes.map((b) => ({
    boundingBox: {
      x: Math.round(b.x1),
      y: Math.round(b.y1),
      width: Math.round(b.x2 - b.x1),
      height: Math.round(b.y2 - b.y1)
    },
    score: Number(b.score.toFixed(4)),
    landmarks: b.kps
  }));
}

module.exports = {
  detectFaces
};
