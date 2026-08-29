const os = require("os");
const path = require("path");
const fs = require("fs");
const https = require("https");
const ort = require("onnxruntime-node");

const LOCAL_MODELS_DIR = path.join(__dirname, "..", "models", "buffalo_m");
const TMP_MODELS_DIR = path.join(os.tmpdir(), "buffalo_m");

const MODEL_FILES = [
  { name: "det_2.5g.onnx", url: "https://huggingface.co/WePrompt/buffalo_m/resolve/main/det_2.5g.onnx", required: true },
  { name: "w600k_r50.onnx", url: "https://huggingface.co/WePrompt/buffalo_m/resolve/main/w600k_r50.onnx", required: true },
  { name: "2d106det.onnx", url: "https://huggingface.co/WePrompt/buffalo_m/resolve/main/2d106det.onnx", required: false },
  { name: "genderage.onnx", url: "https://huggingface.co/WePrompt/buffalo_m/resolve/main/genderage.onnx", required: false }
];

let sessions = {
  det: null,
  embed: null,
  landmark2d: null,
  landmark3d: null,
  genderage: null
};

let isInitialized = false;
let initPromise = null;

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    function get(u, redirectCount = 0) {
      if (redirectCount > 6) return reject(new Error("Too many redirects"));
      const req = https.get(u, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return get(res.headers.location, redirectCount + 1);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`Download failed with HTTP ${res.statusCode} for ${url}`));
        }
        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on("finish", () => file.close(resolve));
        file.on("error", (err) => {
          fs.unlink(dest, () => {});
          reject(err);
        });
      });
      req.on("error", reject);
    }
    get(url);
  });
}

function resolveModelsDirectory() {
  // 1. If explicit environment path is set and has files, use it
  if (process.env.BUFFALO_MODELS_PATH && fs.existsSync(path.join(process.env.BUFFALO_MODELS_PATH, "det_2.5g.onnx"))) {
    return process.env.BUFFALO_MODELS_PATH;
  }
  // 2. If local project directory has the model files, use it
  if (fs.existsSync(path.join(LOCAL_MODELS_DIR, "det_2.5g.onnx")) && fs.existsSync(path.join(LOCAL_MODELS_DIR, "w600k_r50.onnx"))) {
    return LOCAL_MODELS_DIR;
  }
  // 3. Otherwise use the writable temporary directory (ideal for Vercel / AWS Lambda / Read-Only environments)
  return TMP_MODELS_DIR;
}

async function ensureModelsExist(targetDir) {
  try {
    fs.mkdirSync(targetDir, { recursive: true });
  } catch (err) {
    console.warn(`[FaceRecognition] mkdir warning for ${targetDir}:`, err.message);
  }

  for (const model of MODEL_FILES) {
    const filePath = path.join(targetDir, model.name);
    const exists = fs.existsSync(filePath) && fs.statSync(filePath).size > 10000;
    if (!exists) {
      console.log(`[FaceRecognition] Fetching ${model.name} for cloud inference...`);
      try {
        await downloadFile(model.url, filePath);
        const sizeMb = (fs.statSync(filePath).size / (1024 * 1024)).toFixed(2);
        console.log(`[FaceRecognition] Successfully loaded ${model.name} (${sizeMb} MB)`);
      } catch (err) {
        if (model.required) {
          throw new Error(`Required model ${model.name} failed to load: ${err.message}`);
        } else {
          console.warn(`[FaceRecognition] Optional model ${model.name} notice: ${err.message}`);
        }
      }
    }
  }
}

async function initModels(customDir = null) {
  if (isInitialized && sessions.det && sessions.embed) return sessions;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const modelsDir = customDir || resolveModelsDirectory();
    console.log(`[FaceRecognition] Initializing Buffalo ONNX models from: ${modelsDir}`);
    await ensureModelsExist(modelsDir);

    const detPath = path.join(modelsDir, "det_2.5g.onnx");
    const embedPath = path.join(modelsDir, "w600k_r50.onnx");
    const lm2dPath = path.join(modelsDir, "2d106det.onnx");
    const genderagePath = path.join(modelsDir, "genderage.onnx");

    if (!fs.existsSync(detPath) || !fs.existsSync(embedPath)) {
      throw new Error(`Required Buffalo ONNX model files not found in ${modelsDir}`);
    }

    const sessionOptions = {
      executionProviders: ["cpu"],
      graphOptimizationLevel: "all"
    };

    const [det, embed, lm2d, genderage] = await Promise.all([
      ort.InferenceSession.create(detPath, sessionOptions),
      ort.InferenceSession.create(embedPath, sessionOptions),
      fs.existsSync(lm2dPath) ? ort.InferenceSession.create(lm2dPath, sessionOptions) : null,
      fs.existsSync(genderagePath) ? ort.InferenceSession.create(genderagePath, sessionOptions) : null
    ]);

    sessions = {
      det,
      embed,
      landmark2d: lm2d,
      landmark3d: null,
      genderage
    };

    isInitialized = true;
    console.log("[FaceRecognition] All Buffalo ONNX models loaded successfully ✓");
    return sessions;
  })().catch((err) => {
    initPromise = null;
    isInitialized = false;
    throw err;
  });

  return initPromise;
}

function getSessions() {
  if (!isInitialized || !sessions.det) {
    throw new Error("[FaceRecognition] Models are not initialized yet. Call initModels() first.");
  }
  return sessions;
}

function isLoaded() {
  return isInitialized && Boolean(sessions.det && sessions.embed);
}

module.exports = {
  initModels,
  getSessions,
  isLoaded
};
