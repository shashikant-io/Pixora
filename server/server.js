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

const clientPath = path.join(__dirname, "..", "client");
app.use(express.static(clientPath));

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Wedding Photo Finder server is running.",
  });
});

app.use("/api/events", require("./routes/eventRoutes"));
app.use("/api/photos", require("./routes/photoRoutes"));
app.use("/api/search", require("./routes/searchRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/auth", require("./routes/authRoutes"));

app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found.",
  });
});

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

