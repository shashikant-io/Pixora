const dns = require("dns");
const mongoose = require("mongoose");

try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (err) {}

let cachedPromise = null;

async function connectDB() {
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("[Database] MONGODB_URI is missing in environment variables.");
    return null;
  }

  if (!cachedPromise) {
    cachedPromise = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
    }).then((conn) => {
      console.log("MongoDB connected");
      return conn;
    }).catch((error) => {
      cachedPromise = null;
      console.error("MongoDB connection error:", error.message);
      throw error;
    });
  }

  return cachedPromise;
}

module.exports = connectDB;

