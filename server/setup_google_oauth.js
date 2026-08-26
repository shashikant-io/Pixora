const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const { google } = require("googleapis");
const http = require("http");
const url = require("url");
const fs = require("fs");
const readline = require("readline");

async function main() {
  console.log("==================================================");
  console.log("   Google Drive 5TB OAuth 2.0 Authorization Setup ");
  console.log("==================================================");

  let clientId = process.env.GOOGLE_CLIENT_ID;
  let clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (query) => new Promise((resolve) => rl.question(query, resolve));

  if (!clientId) {
    console.log("\nTo connect your Personal 5TB Google One Drive:");
    console.log("1. Go to Google Cloud Console: https://console.cloud.google.com/apis/credentials?project=wedding-photo-finder-506416");
    console.log("2. Click '+ CREATE CREDENTIALS' > 'OAuth client ID'");
    console.log("3. Application type: 'Web application'");
    console.log("4. Authorized redirect URIs: http://localhost:4000/api/admin/auth/google/callback (or http://localhost:4001/oauth2callback)");
    console.log("5. Copy your Client ID and Client Secret.\n");

    clientId = await question("Enter your Google OAuth Client ID: ");
    clientSecret = await question("Enter your Google OAuth Client Secret: ");
  }

  if (!clientId || !clientSecret) {
    console.error("❌ Client ID and Client Secret are required.");
    rl.close();
    process.exit(1);
  }

  const redirectUri = "http://localhost:4001/oauth2callback";
  const oauth2Client = new google.auth.OAuth2(clientId.trim(), clientSecret.trim(), redirectUri);

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/drive.file",
    ],
  });

  console.log("\n👉 Please open this URL in your browser to authorize your 5TB Google Account:");
  console.log("\n" + authUrl + "\n");

  // Spin up temporary local HTTP server to receive the callback
  const server = http.createServer(async (req, res) => {
    try {
      const parsedUrl = url.parse(req.url, true);
      if (parsedUrl.pathname === "/oauth2callback") {
        const code = parsedUrl.query.code;
        if (code) {
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end("<h2>✓ Authorization Successful! You can close this window now.</h2>");

          console.log(" Exchanging code for tokens...");
          const { tokens } = await oauth2Client.getToken(code);

          // Update server/.env
          const envPath = path.join(__dirname, ".env");
          let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";

          const updateEnvVar = (key, val) => {
            if (envContent.includes(`${key}=`)) {
              const regex = new RegExp(`${key}=.*`, "g");
              envContent = envContent.replace(regex, `${key}=${val}`);
            } else {
              envContent += `\n${key}=${val}\n`;
            }
          };

          updateEnvVar("GOOGLE_CLIENT_ID", clientId.trim());
          updateEnvVar("GOOGLE_CLIENT_SECRET", clientSecret.trim());
          if (tokens.refresh_token) {
            updateEnvVar("GOOGLE_REFRESH_TOKEN", tokens.refresh_token);
          }

          fs.writeFileSync(envPath, envContent, "utf-8");

          console.log(" Tokens successfully saved to server/.env!");
          console.log(" Your 5TB Google One Drive is now connected.");
          server.close();
          rl.close();
          process.exit(0);
        }
      }
    } catch (e) {
      res.writeHead(500, { "Content-Type": "text/html" });
      res.end(`<h2>Error during authorization: ${e.message}</h2>`);
      console.error("Callback error:", e.message);
    }
  });

  server.listen(4001, () => {
    console.log("Waiting for authorization on http://localhost:4001/oauth2callback ...");
  });
}

if (require.main === module) {
  main().catch(console.error);
}
