FROM node:20-bullseye-slim

# Install system dependencies for native modules (sharp, ONNX runtime)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ca-certificates \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy source code and models
COPY . .

ENV PORT=4000
ENV NODE_ENV=production

EXPOSE 4000

CMD ["node", "server.js"]
