require("dotenv").config();
const path = require("path");
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

const PORT = process.env.PORT;

console.log("PORT TESTING:",PORT);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
