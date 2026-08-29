const ort = require("onnxruntime-node");
const sharp = require("sharp");
const { getSessions, initModels } = require("./modelLoader");

// Standard ArcFace 112x112 alignment reference landmarks
const ARCFACE_REF_PTS = [
  [38.2946, 51.6963], // Left Eye
  [73.5318, 51.5014], // Right Eye
  [56.0252, 71.7366], // Nose
  [41.5493, 92.3655], // Left Mouth Corner
  [70.7299, 92.2041]  // Right Mouth Corner
];

/**
 * Computes 2D similarity transform matrix parameters mapping srcPts to dstPts.
 */
function estimateSimilarityTransform(srcPts, dstPts = ARCFACE_REF_PTS) {
  let srcMeanX = 0, srcMeanY = 0, dstMeanX = 0, dstMeanY = 0;
  const n = srcPts.length;

  for (let i = 0; i < n; i++) {
    srcMeanX += srcPts[i][0];
    srcMeanY += srcPts[i][1];
    dstMeanX += dstPts[i][0];
    dstMeanY += dstPts[i][1];
  }
  srcMeanX /= n;
  srcMeanY /= n;
  dstMeanX /= n;
  dstMeanY /= n;

  let srcVar = 0, numA = 0, numB = 0;
  for (let i = 0; i < n; i++) {
    const srcX = srcPts[i][0] - srcMeanX;
    const srcY = srcPts[i][1] - srcMeanY;
    const dstX = dstPts[i][0] - dstMeanX;
    const dstY = dstPts[i][1] - dstMeanY;

    srcVar += srcX * srcX + srcY * srcY;
    numA += srcX * dstX + srcY * dstY;
    numB += srcX * dstY - srcY * dstX;
  }

  const a = numA / (srcVar + 1e-8);
  const b = numB / (srcVar + 1e-8);
  const tx = dstMeanX - (a * srcMeanX - b * srcMeanY);
  const ty = dstMeanY - (b * srcMeanX + a * srcMeanY);

  return { a, b, tx, ty };
}

/**
 * Inverts similarity transformation matrix for backward mapping in bilinear interpolation.
 */
function invertSimilarityMatrix(mat) {
  const scaleSq = mat.a * mat.a + mat.b * mat.b;
  const invA = mat.a / scaleSq;
  const invB = -mat.b / scaleSq;
  const invTx = -(invA * mat.tx - invB * mat.ty);
  const invTy = -(invB * mat.tx + invA * mat.ty);
  return { a: invA, b: invB, tx: invTx, ty: invTy };
}

/**
 * Aligns and crops face to 112x112 standard buffer using bilinear interpolation.
 */
async function alignFaceCrop(imageBuffer, landmarks, targetW = 112, targetH = 112, preDecoded = null) {
  let rawImage, imgW, imgH, channels;

  if (preDecoded) {
    rawImage = preDecoded.rawImage;
    imgW = preDecoded.imgW;
    imgH = preDecoded.imgH;
    channels = preDecoded.channels;
  } else {
    const normalizedBuffer = await sharp(imageBuffer).rotate().toBuffer();
    const metadata = await sharp(normalizedBuffer).metadata();
    rawImage = await sharp(normalizedBuffer).raw().toBuffer();
    imgW = metadata.width;
    imgH = metadata.height;
    channels = metadata.channels || 3;
  }


  const mat = estimateSimilarityTransform(landmarks, ARCFACE_REF_PTS);
  const invMat = invertSimilarityMatrix(mat);

  const outBuf = Buffer.alloc(targetW * targetH * 3);

  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      const srcX = invMat.a * x - invMat.b * y + invMat.tx;
      const srcY = invMat.b * x + invMat.a * y + invMat.ty;

      const x0 = Math.floor(srcX);
      const y0 = Math.floor(srcY);
      const x1 = x0 + 1;
      const y1 = y0 + 1;

      const wx1 = srcX - x0;
      const wx0 = 1 - wx1;
      const wy1 = srcY - y0;
      const wy0 = 1 - wy1;

      const outIdx = (y * targetW + x) * 3;

      for (let c = 0; c < 3; c++) {
        let val = 0;
        if (x0 >= 0 && x0 < imgW && y0 >= 0 && y0 < imgH) {
          val += rawImage[(y0 * imgW + x0) * channels + c] * wx0 * wy0;
        }
        if (x1 >= 0 && x1 < imgW && y0 >= 0 && y0 < imgH) {
          val += rawImage[(y0 * imgW + x1) * channels + c] * wx1 * wy0;
        }
        if (x0 >= 0 && x0 < imgW && y1 >= 0 && y1 < imgH) {
          val += rawImage[(y1 * imgW + x0) * channels + c] * wx0 * wy1;
        }
        if (x1 >= 0 && x1 < imgW && y1 >= 0 && y1 < imgH) {
          val += rawImage[(y1 * imgW + x1) * channels + c] * wx1 * wy1;
        }
        outBuf[outIdx + c] = Math.min(255, Math.max(0, Math.round(val)));
      }
    }
  }

  return outBuf;
}

/**
 * Generates normalized 512-dim ArcFace embedding using w600k_r50.onnx.
 * @param {Buffer} imageBuffer - Source image buffer
 * @param {Array<[number, number]>} landmarks - 5 facial landmarks
 * @param {Object} [preDecoded=null] - Optional pre-decoded raw image buffer
 * @returns {Promise<Array<number>>} 512-dimensional normalized embedding
 */
async function generateEmbedding(imageBuffer, landmarks, preDecoded = null) {
  await initModels();
  const { embed } = getSessions();

  const alignedBuf = await alignFaceCrop(imageBuffer, landmarks, 112, 112, preDecoded);

  // Planar NCHW float32: (pixel - 127.5) / 127.5
  const planar = new Float32Array(3 * 112 * 112);
  for (let y = 0; y < 112; y++) {
    for (let x = 0; x < 112; x++) {
      const idx = (y * 112 + x) * 3;
      planar[0 * 112 * 112 + y * 112 + x] = (alignedBuf[idx] - 127.5) / 127.5;
      planar[1 * 112 * 112 + y * 112 + x] = (alignedBuf[idx + 1] - 127.5) / 127.5;
      planar[2 * 112 * 112 + y * 112 + x] = (alignedBuf[idx + 2] - 127.5) / 127.5;
    }
  }

  const tensor = new ort.Tensor("float32", planar, [1, 3, 112, 112]);
  const results = await embed.run({ "input.1": tensor });
  const rawEmb = results["683"].data;

  // L2 Normalization
  let norm = 0;
  for (let i = 0; i < rawEmb.length; i++) {
    norm += rawEmb[i] * rawEmb[i];
  }
  norm = Math.sqrt(norm) + 1e-10;

  const normalized = new Float32Array(rawEmb.length);
  for (let i = 0; i < rawEmb.length; i++) {
    normalized[i] = rawEmb[i] / norm;
  }

  return Array.from(normalized);
}

/**
 * Optional 2D 106-point landmark detection using 2d106det.onnx
 */
async function getLandmarks2D(imageBuffer, bbox) {
  await initModels();
  const { landmark2d } = getSessions();
  if (!landmark2d) return null;

  // Crop face and resize to 192x192
  const cropped = await sharp(imageBuffer)
    .extract({
      left: Math.max(0, bbox.x),
      top: Math.max(0, bbox.y),
      width: Math.min(bbox.width, 1920),
      height: Math.min(bbox.height, 1920)
    })
    .resize(192, 192)
    .raw()
    .toBuffer();

  const planar = new Float32Array(3 * 192 * 192);
  for (let i = 0; i < 192 * 192; i++) {
    planar[0 * 192 * 192 + i] = (cropped[i * 3] - 127.5) / 127.5;
    planar[1 * 192 * 192 + i] = (cropped[i * 3 + 1] - 127.5) / 127.5;
    planar[2 * 192 * 192 + i] = (cropped[i * 3 + 2] - 127.5) / 127.5;
  }

  const tensor = new ort.Tensor("float32", planar, [1, 3, 192, 192]);
  const results = await landmark2d.run({ "data": tensor });
  return Array.from(results["fc1"].data);
}

module.exports = {
  generateEmbedding,
  alignFaceCrop,
  getLandmarks2D
};
