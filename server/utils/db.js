const dns = require("dns");
const mongoose = require("mongoose");

try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (err) {}

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  console.log("CONNECTING TO DBM URI:",uri);
  if (!uri) {
    console.error("MONGODB_URI is missing in .env");
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

module.exports = connectDB;
