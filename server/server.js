const dns = require("dns");
try {
  dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
} catch (err) {}

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const connectDB = require("./utils/db");
const { initFaceRecognition } = require("./faceRecognition");

const app = express();

connectDB();
initFaceRecognition().catch((err) => console.error("Buffalo model init error:", err.message));

app.use(cors());
app.use(express.json());

// Ensure MongoDB is connected for serverless invocations
app.use(async (req, res, next) => {
  try {
    await connectDB();
  } catch (e) {
    console.error("[Database Connection Error]", e.message);
  }
  next();
});


const eventRoutes = require("./routes/eventRoutes");
const photoRoutes = require("./routes/photoRoutes");
const searchRoutes = require("./routes/searchRoutes");
const adminRoutes = require("./routes/adminRoutes");
const authRoutes = require("./routes/authRoutes");

app.get(["/api/health", "/health"], (req, res) => {
  res.json({
    success: true,
    message: "Pixora server is running.",
    version: "1.0.5",
    timestamp: "2026-08-30T04:35:00.000Z",
  });
});

// Mount routes on both /api/* and root /* for Vercel serverless and local Express compatibility
app.use(["/api/events", "/events"], eventRoutes);
app.use(["/api/photos", "/photos"], photoRoutes);
app.use(["/api/search", "/search"], searchRoutes);
app.use(["/api/admin", "/admin"], adminRoutes);
app.use(["/api/auth", "/auth"], authRoutes);

// API catch-all 404 — must come BEFORE static files so unmatched /api/* routes always return JSON
app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found.",
  });
});

// Serve client static files AFTER API routes to prevent HTML responses on API endpoints
const clientPath = path.join(__dirname, "..", "client");
app.use(express.static(clientPath));



app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    success: false,
    message: "Something went wrong on the server.",
  });
});

if (require.main === module) {
  const PORT = process.env.PORT || 4000;

  const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`[Server Notice] Port ${PORT} is already in use by another instance.`);
    } else {
      console.error("[Server Error]", err);
    }
  });
}

module.exports = app;

