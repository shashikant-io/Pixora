const functions = require("firebase-functions");
const app = require("./server");

// Export Express app as Firebase HTTPS Cloud Function 'api'
exports.api = functions
  .runWith({
    memory: "1GB",
    timeoutSeconds: 300,
  })
  .https.onRequest(app);
