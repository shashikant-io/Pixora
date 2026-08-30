# pixora

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/backend-Express.js-blue.svg)](https://expressjs.com/)
[![ONNX Runtime](https://img.shields.io/badge/AI-ONNX%20Runtime%20Node-orange.svg)](https://onnxruntime.ai/)
[![MongoDB](https://img.shields.io/badge/database-MongoDB-green.svg)](https://www.mongodb.com/)
[![ImageKit](https://img.shields.io/badge/storage-ImageKit.io%20CDN-informational.svg)](https://imagekit.io/)

**Photo Finder** is an AI-powered event and wedding photo distribution platform. Photographers upload high-resolution albums in bulk directly to **ImageKit.io CDN**, and guests instantly find every photo they appear in simply by uploading or capturing a selfie — eliminating the tedious task of manually browsing through thousands of pictures.

---

## Table of Contents

- [1. Installation Guide](#1-installation-guide)
- [2. Project Overview](#2-project-overview)
- [3. Tech Stack](#3-tech-stack)
- [4. Buffalo ONNX Face Recognition](#4-buffalo-onnx-face-recognition)
- [5. System Architecture](#5-system-architecture)
- [6. How the System Works](#6-how-the-system-works)
- [7. Environment Variables](#7-environment-variables)
- [8. Face Recognition Model Setup](#8-face-recognition-model-setup)
- [9. How to Run](#9-how-to-run)
- [10. Project Structure](#10-project-structure)
- [11. API Endpoints](#11-api-endpoints)
- [12. Database Schema](#12-database-schema)
- [13. Features](#13-features)
- [14. License](#14-license)

---

## 1. Installation Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18.0.0 or higher)
- [npm](https://www.npmjs.com/) (version 9.0.0 or higher)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account (or local MongoDB instance)
- [ImageKit.io](https://imagekit.io/) account

### Step-by-Step Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd wedding-photo-finder
   ```

2. **Install backend dependencies:**
   ```bash
   cd server
   npm install
   ```

---

## 2. Environment Variables

Create a `.env` file in `server/`:

```env
PORT=4000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?appName=Cluster0

IMAGEKIT_PUBLIC_KEY=public_FoavlWZq/AeXD9rdp7iOXOqI894=
IMAGEKIT_PRIVATE_KEY=private_D3L+6TUzbOD2a1IkDILwmSUfu4g=
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/09cqtgxxz

FACE_MATCH_THRESHOLD=0.50
```

---

## 3. Buffalo ONNX Face Recognition

The platform uses local **InsightFace Buffalo ONNX models** located in `server/models/buffalo_m/`:

- `det_2.5g.onnx` (SCRFD Face Detection)
- `w600k_r50.onnx` (ArcFace 512-d Embedding Extractor)
- `2d106det.onnx`
- `1k3d68.onnx`
- `genderage.onnx`

---

## 4. How to Run

Start the application:
```bash
npm start
```
*(Or `cd server; npm run dev`)*

Open your browser:
- **Landing Page:** [http://localhost:4000/index.html](http://localhost:4000/index.html)
- **Photographer Dashboard:** [http://localhost:4000/admin.html](http://localhost:4000/admin.html)
- **Guest Photo Finder:** [http://localhost:4000/guest.html](http://localhost:4000/guest.html)

---

## 5. API Endpoints

- `POST /api/photos/upload`: Uploads photo to ImageKit CDN, extracts 512-d Buffalo face embeddings, and saves MongoDB record.
- `GET /api/photos/:eventId`: Lists all photos for an event.
- `POST /api/search`: Matches guest selfie against event photos using cosine similarity.
- `GET /api/events`: Lists all events.
- `POST /api/events`: Creates a new event code.
- `DELETE /api/events/:eventId`: Deletes event, photos, and ImageKit CDN files.
- `GET /api/admin/storage`: Returns live ImageKit storage usage stats.

---

## 6. Features

- [x] **ImageKit.io CDN Media Storage**: High-speed global media delivery with automatic image optimization.
- [x] **Controlled Upload Queue (3 Workers)**: Fast, parallelized bulk photo upload with automatic transient retry.
- [x] **AI Face Indexing**: Server-side SCRFD detection and ArcFace embedding extraction.
- [x] **Webcam Selfie Capture**: Live in-browser front camera selfie capture with circular framing.
- [x] **Dynamic QR Code**: Auto-generated QR codes linking guests to their event photo search page.
- [x] **Luxury UI**: Frosted glassmorphism design system.
