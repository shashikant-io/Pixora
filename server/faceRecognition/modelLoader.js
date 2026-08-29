const path = require("path");
const fs = require("fs");
const ort = require("onnxruntime-node");

const https = require("https");
const { execSync } = require("child_process");

const DEFAULT_MODELS_DIR = path.join(__dirname, "..", "models", "buffalo_m");

let sessions = {
  det: null,        // det_2.5g.onnx
  embed: null,      // w600k_r50.onnx
  landmark2d: null, // 2d106det.onnx
  landmark3d: null, // 1k3d68.onnx
  genderage: null   // genderage.onnx
};

let isInitialized = false;
let initPromise = null;

async function ensureModelsExist(modelsDir) {
  const detPath = path.join(modelsDir, "det_2.5g.onnx");
  const embedPath = path.join(modelsDir, "w600k_r50.onnx");

  if (fs.existsSync(detPath) && fs.existsSync(embedPath)) {
    return;
  }

  console.log("[FaceRecognition] Models not found locally. Auto-downloading buffalo_m package for cloud deployment...");
  fs.mkdirSync(modelsDir, { recursive: true });

  const zipUrl = "https://huggingface.co/public-data/insightface/resolve/main/models/buffalo_m.zip";
  const zipPath = path.join(modelsDir, "buffalo_m.zip");

  await new Promise((resolve, reject) => {
    const file = fs.createWriteStream(zipPath);
    function fetchDownload(url) {
      https.get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchDownload(res.headers.location);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`Failed to download models: HTTP ${res.statusCode}`));
        }
        res.pipe(file);
        file.on("finish", () => {
          file.close(resolve);
        });
      }).on("error", (err) => {
        fs.unlink(zipPath, () => {});
        reject(err);
      });
    }
    fetchDownload(zipUrl);
  });

  console.log("[FaceRecognition] Extracting Buffalo ONNX models...");
  try {
    if (process.platform === "win32") {
      execSync(`powershell -command "Expand-Archive -Path '${zipPath}' -DestinationPath '${modelsDir}' -Force"`);
    } else {
      execSync(`unzip -o "${zipPath}" -d "${modelsDir}"`);
    }
  } catch (e) {
    console.warn("[FaceRecognition] Extraction notice:", e.message);
  }

  if (fs.existsSync(zipPath)) {
    try { fs.unlinkSync(zipPath); } catch(e) {}
  }
}

async function initModels(modelsDir = process.env.BUFFALO_MODELS_PATH || DEFAULT_MODELS_DIR) {
  if (isInitialized) return sessions;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    await ensureModelsExist(modelsDir);
    console.log(`[FaceRecognition] Loading Buffalo ONNX models from: ${modelsDir}`);

    const detPath = path.join(modelsDir, "det_2.5g.onnx");
    const embedPath = path.join(modelsDir, "w600k_r50.onnx");
    const lm2dPath = path.join(modelsDir, "2d106det.onnx");
    const lm3dPath = path.join(modelsDir, "1k3d68.onnx");
    const genderagePath = path.join(modelsDir, "genderage.onnx");


    if (!fs.existsSync(detPath) || !fs.existsSync(embedPath)) {
      throw new Error(`Required Buffalo ONNX model files not found in ${modelsDir}`);
    }

    const sessionOptions = {
      executionProviders: ["cpu"],
      graphOptimizationLevel: "all"
    };

    const [det, embed, lm2d, lm3d, genderage] = await Promise.all([
      ort.InferenceSession.create(detPath, sessionOptions),
      ort.InferenceSession.create(embedPath, sessionOptions),
      fs.existsSync(lm2dPath) ? ort.InferenceSession.create(lm2dPath, sessionOptions) : null,
      fs.existsSync(lm3dPath) ? ort.InferenceSession.create(lm3dPath, sessionOptions) : null,
      fs.existsSync(genderagePath) ? ort.InferenceSession.create(genderagePath, sessionOptions) : null
    ]);

    sessions = {
      det,
      embed,
      landmark2d: lm2d,
      landmark3d: lm3d,
      genderage
    };

    isInitialized = true;
    console.log("[FaceRecognition] All Buffalo ONNX models loaded successfully ✓");
    return sessions;
  })();

  return initPromise;
}

function getSessions() {
  if (!isInitialized) {
    throw new Error("[FaceRecognition] Models are not initialized yet. Call initModels() first.");
  }
  return sessions;
}

function isLoaded() {
  return isInitialized;
}

module.exports = {
  initModels,
  getSessions,
  isLoaded
};
