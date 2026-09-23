# Pixora 📸

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/backend-Express.js-blue.svg)](https://expressjs.com/)
[![ONNX Runtime](https://img.shields.io/badge/AI-ONNX%20Runtime%20Node-orange.svg)](https://onnxruntime.ai/)
[![MongoDB](https://img.shields.io/badge/database-MongoDB-green.svg)](https://www.mongodb.com/)
[![AWS S3](https://img.shields.io/badge/storage-AWS%20S3%20Private%20Bucket-orange.svg)](https://aws.amazon.com/s3/)
[![Security](https://img.shields.io/badge/encryption-SSE--S3%20AES256-blue.svg)](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingServerSideEncryption.html)

**Pixora** is an AI-powered event and wedding photo distribution platform. Photographers upload high-resolution albums in bulk directly to **Amazon Web Services (AWS) S3 Private Storage**, and guests instantly find every photo they appear in by snapping a selfie or uploading a picture — eliminating the tedious task of manually browsing through thousands of pictures.

---

## Table of Contents

- [1. Key Features](#1-key-features)
- [2. System Architecture](#2-system-architecture)
- [3. Tech Stack](#3-tech-stack)
- [4. Installation Guide](#4-installation-guide)
- [5. Environment Variables](#5-environment-variables)
- [6. AWS S3 Configuration & IAM Policy](#6-aws-s3-configuration--iam-policy)
- [7. Google Sign-In & Welcome Email System](#7-google-sign-in--welcome-email-system)
- [8. Buffalo ONNX Face Recognition](#8-buffalo-onnx-face-recognition)
- [9. How to Run](#9-how-to-run)
- [10. API Endpoints](#10-api-endpoints)
- [11. Testing & Verification](#11-testing--verification)
- [12. Project Structure](#12-project-structure)
- [13. License](#13-license)

---

## 1. Key Features

- 🔒 **Private AWS S3 Cloud Storage**:
  - Secure uploads to S3 bucket (`pixora-images-2026`) in region `ap-south-1`.
  - Block Public Access enabled & ACLs disabled.
  - Server-Side Encryption at rest with **SSE-S3 (`AES256`)**.
  - Dynamic 1-hour **presigned GET URLs** for frontend image viewing.
  - One-click presigned attachment downloads with forced `Content-Disposition`.
  - Automatic Sharp 350x350 thumbnail generation.
  - **1 TB (`1024 GB`)** application storage quota with real-time usage tracking.
- ⚡ **Local AI Face Recognition**:
  - InsightFace Buffalo ONNX models running entirely locally on Node.js via ONNX Runtime.
  - High-precision SCRFD face detection and 512-dimensional ArcFace embedding extraction.
  - Real-time cosine similarity matching with configurable threshold (`0.50`).
- 🔐 **Authentication & Security**:
  - **Continue with Google** via Firebase Auth for seamless guest sign-in.
  - **Welcome Email Notification**: Sent automatically upon first-time Google signup (duplicate-suppressed for returning logins).
  - Admin & Customer passwordless OTP authentication via Gmail SMTP.
  - JWT session management with scoped access tokens.
- 📸 **Luxury Guest Portal & Admin Dashboard**:
  - In-browser live webcam selfie capture with circular alignment overlay.
  - Real-time upload queue with progress metrics.
  - Instant dynamic QR code generation for each wedding/event.
  - Dark-mode luxury aesthetics with frosted glassmorphism.

---

## 2. System Architecture

```
                                 ┌───────────────────────────────┐
                                 │       Photographer Client     │
                                 └───────────────┬───────────────┘
                                                 │ Bulk Upload (Multipart)
                                                 ▼
┌───────────────────────┐            ┌───────────────────────────────┐
│     Guest Client      │            │       Pixora Express Server   │
└───────────┬───────────┘            └───────┬───────────────┬───────┘
            │ Selfie Capture                 │               │
            ▼                                │ Face Embed    │ S3 Upload + Sharp
┌───────────────────────┐                    ▼               ▼
│  Buffalo ONNX Engine  │◄────────────► [InsightFace]  [AWS S3 Private Bucket]
│ (SCRFD + ArcFace 512) │                (det + w600k)   (pixora-images-2026)
└───────────────────────┘                                    │
            │ Cosine Similarity Search                       │ Presigned GET URLs
            ▼                                                ▼
┌───────────────────────┐                    ┌───────────────────────────────┐
│     MongoDB Atlas     │◄───────────────────┤      Secure Photo Viewing     │
│ (Photos, Events, User)│                    │   & Attachment Downloads      │
└───────────────────────┘                    └───────────────────────────────┘
```

---

## 3. Tech Stack

- **Runtime**: Node.js (>= 18.0.0)
- **Backend Framework**: Express.js
- **Database**: MongoDB & Mongoose
- **Cloud Media Storage**: AWS SDK v3 (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`)
- **Image Processing**: Sharp (Thumbnail resizing, rotation, optimization)
- **AI & Face Recognition**: ONNX Runtime Node (`onnxruntime-node`) with InsightFace Buffalo models
- **Email Delivery**: Nodemailer via Gmail SMTP
- **Authentication**: Firebase Admin SDK & JSON Web Tokens (JWT)
- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+)

---

## 4. Installation Guide

### Prerequisites
- **Node.js** (v18.0.0)
- **npm** (v9.0.0)
- **MongoDB Atlas** database connection string
- **AWS Account** with an S3 bucket

### Installation Steps

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd wedding-photo-finder
   ```

2. **Install root and server dependencies:**
   ```bash
   npm install
   cd server
   npm install
   cd ..
   ```

---

## 5. Environment Variables

Create or edit `server/.env`:

```env
PORT=4000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?appName=Cluster0

# AWS S3 Private Cloud Storage
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_S3_BUCKET=pixora-images-2026
AWS_S3_STORAGE_LIMIT_GB=1024

# Face Recognition Matching Threshold (Cosine Similarity: 0.0 - 1.0)
FACE_MATCH_THRESHOLD=0.50

# Email Configuration (Gmail SMTP)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
ADMIN_EMAILS=admin@gmail.com
ADMIN_NAME=Photographer Admin

# JWT Secret & Session Security
JWT_SECRET=your_jwt_secret_key_here
PUBLIC_BASE_URL=http://localhost:4000

# Firebase Web Client Configuration (For Customer Google Sign-In)
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_firebase_project_id.firebaseapp.com
FIREBASE_STORAGE_BUCKET=your_firebase_project_id.appspot.com
FIREBASE_APP_ID=your_firebase_app_id
FIREBASE_MESSAGING_SENDER_ID=your_firebase_sender_id
FIREBASE_MEASUREMENT_ID=your_firebase_measurement_id
```

---

## 6. AWS S3 Configuration & IAM Policy

### Bucket Settings
- **Bucket Name**: `pixora-images-2026`
- **Region**: `ap-south-1` (Asia Pacific - Mumbai)
- **Block Public Access**: Enabled (All 4 settings ON)
- **Object Ownership**: ACLs disabled (Bucket owner enforced)
- **Default Encryption**: Server-side encryption with Amazon S3 managed keys (SSE-S3 / AES256)

### IAM Least-Privilege Policy
Attach this policy to the IAM user or role running the backend application:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PixoraBucketListAccess",
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::pixora-images-2026"
    },
    {
      "Sid": "PixoraObjectAccess",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::pixora-images-2026/*"
    }
  ]
}
```

---

## 7. Google Sign-In & Welcome Email System

When guests access a wedding gallery via **"Continue with Google"**:
1. The client retrieves a Firebase Google ID token.
2. The server verifies the token and checks if the user exists in MongoDB:
   - **First-Time Sign-Up**: The user document is created with `welcomeSent: true`, and an automated welcome email is dispatched asynchronously via Gmail SMTP.
   - **Returning Logins**: The system detects the existing record (`isNewUser: false`) and skips the welcome email.
3. Login never blocks on email delivery — transient SMTP errors are logged without interrupting user authentication.

### Welcome Email Copy:
```text
Welcome to Pixora! 🎉

We're happy to have you here.

Your account is ready, and you can start exploring Pixora right away.

If you need any help, we're here for you.
```

---

## 8. Buffalo ONNX Face Recognition

The platform embeds local **InsightFace Buffalo ONNX models** in `server/models/buffalo_m/`:

| Model File | Purpose | Architecture |
| :--- | :--- | :--- |
| `det_2.5g.onnx` | Face detection & 5-point facial landmark regression | SCRFD 2.5G |
| `w600k_r50.onnx` | 512-dimensional facial feature embedding extractor | ArcFace ResNet-50 |
| `2d106det.onnx` | 106-point dense landmark alignment | 2D Dense |
| `genderage.onnx` | Attribute classification | ResNet-34 |

---

## 9. How to Run

### Start the Application
From the root directory:
```bash
npm start
```
*(Or navigate to `server` and run `node server.js`)*

### Access Endpoints
- **Landing Page**: [http://localhost:4000/index.html](http://localhost:4000/index.html)
- **Photographer Dashboard**: [http://localhost:4000/admin.html](http://localhost:4000/admin.html)
- **Guest Portal / Selfie Finder**: [http://localhost:4000/guest.html](http://localhost:4000/guest.html)
- **Health Check**: [http://localhost:4000/api/health](http://localhost:4000/api/health)

---

## 10. API Endpoints

### Authentication (`/api/auth`)
- `POST /api/auth/customer/google-login` - Authenticate guest with Firebase Google ID token & send welcome email on first sign-up.
- `POST /api/auth/admin/send-otp` - Send 6-digit OTP to authorized admin email.
- `POST /api/auth/admin/verify-otp` - Verify admin OTP and issue JWT session.
- `GET /api/auth/firebase-config` - Public Firebase Web SDK configuration.
- `GET /api/auth/me` - Retrieve current authenticated session profile.
- `POST /api/auth/logout` - Invalidate session.

### Photos (`/api/photos`)
- `POST /api/photos/upload` - Upload photo to AWS S3 with SSE-S3 encryption, generate thumbnail, extract ArcFace embeddings, and validate 1 TB storage quota.
- `GET /api/photos/:eventId` - Retrieve all photos for an event with fresh presigned S3 URLs.
- `GET /api/photos/file/:fileId` - 302 Redirect to presigned view URL for private S3 images.
- `GET /api/photos/download/:fileId` - 302 Redirect to presigned download URL with forced attachment headers.

### Face Search (`/api/search`)
- `POST /api/search` - Search event photos by guest selfie embedding using cosine similarity and return matched photos with presigned URLs.

### Events & Admin (`/api/events`, `/api/admin`)
- `GET /api/events` - List all active events.
- `POST /api/events` - Create a new event with auto-generated code and QR token.
- `DELETE /api/events/:eventId` - Delete event, MongoDB records, and all S3 photos/thumbnails.
- `GET /api/admin/storage` - Get live AWS S3 storage quota usage (out of 1 TB) and capacity stats.

---

## 11. Testing & Verification

Run the built-in automated test suites:

```bash
cd server

# 1. Verify AWS S3 integration, presigned URLs, and 1 TB storage quota
node test_s3_suite.js

# 2. Verify Google sign-up welcome email system & duplicate prevention
node test_welcome_system.js

# 3. Live AWS S3 connectivity test (requires AWS credentials in server/.env)
node test_live_s3.js
```

---

## 12. Project Structure

```
wedding-photo-finder/
├── client/                     # Frontend client application
│   ├── admin.html              # Photographer management dashboard
│   ├── admin.js                # Dashboard logic & S3 storage metrics widget
│   ├── guest.html              # Guest selfie search & gallery page
│   ├── guest-login.html        # Guest authentication portal ("Continue with Google")
│   ├── guest-login.js          # Google Firebase Auth client handler
│   ├── index.html              # Landing page
│   └── style.css               # Dark-mode luxury design system
├── server/                     # Backend API server
│   ├── controllers/
│   │   ├── adminController.js  # Storage stats & admin metrics
│   │   ├── authController.js   # Google login & welcome email dispatch
│   │   ├── eventController.js  # Event creation & S3 prefix deletion
│   │   ├── photoController.js  # Photo upload, quota checks & presigned URLs
│   │   └── searchController.js # Face matching & presigned match results
│   ├── faceRecognition/       # Buffalo ONNX inference engine
│   ├── models/
│   │   ├── buffalo_m/          # ONNX model files (det_2.5g, w600k_r50, etc.)
│   │   ├── Event.js            # Event schema
│   │   ├── Photo.js            # Photo schema with permanent S3 keys
│   │   └── User.js             # User schema with welcomeSent tracking
│   ├── routes/                 # Express API routes
│   ├── services/
│   │   ├── emailService.js     # Nodemailer Gmail SMTP & welcome email
│   │   ├── faceService.js      # Face search & embedding matching
│   │   └── s3Service.js        # AWS S3 v3 client, presigning & chunked delete
│   ├── .env.example            # Environment template
│   ├── server.js               # Express application entry point
│   ├── test_s3_suite.js        # S3 & 1 TB quota test suite
│   ├── test_welcome_system.js  # Google welcome email test suite
│   └── test_live_s3.js         # Live S3 bucket test
├── package.json
└── README.md
```

---

## 13. License

This project is licensed under the MIT License.
