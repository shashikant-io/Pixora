/**
 * Compute cosine similarity between two normalized embedding vectors.
 * Range: [-1, 1], with 1.0 being an exact match.
 * @param {Array<number>} embA - First embedding vector
 * @param {Array<number>} embB - Second embedding vector
 * @returns {number} Cosine similarity score
 */
function cosineSimilarity(embA, embB) {
  if (!embA || !embB || embA.length !== embB.length) {
    return 0;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < embA.length; i++) {
    dot += embA[i] * embB[i];
    normA += embA[i] * embA[i];
    normB += embB[i] * embB[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom < 1e-10) return 0;

  return dot / denom;
}

/**
 * Compute Euclidean distance between two embeddings.
 * @param {Array<number>} embA
 * @param {Array<number>} embB
 * @returns {number} Euclidean distance
 */
function euclideanDistance(embA, embB) {
  if (!embA || !embB || embA.length !== embB.length) {
    return Infinity;
  }

  let sum = 0;
  for (let i = 0; i < embA.length; i++) {
    const diff = embA[i] - embB[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Find matching photos in an event using cosine similarity.
 * @param {Array<number>} guestEmbedding - Guest face embedding
 * @param {Array<Object>} photos - List of Photo objects with .faces array
 * @param {number} threshold - Minimum cosine similarity threshold (default 0.40 - 0.50)
 * @returns {Array<{photo: Object, similarity: number, distance: number}>}
 */
function findMatchingPhotos(guestEmbedding, photos, threshold = 0.45) {
  const matches = [];

  for (const photo of photos) {
    if (!photo.faces || photo.faces.length === 0) continue;

    let bestSimilarity = -1;

    for (const face of photo.faces) {
      if (!face.embedding || face.embedding.length === 0) continue;

      const sim = cosineSimilarity(guestEmbedding, face.embedding);
      if (sim > bestSimilarity) {
        bestSimilarity = sim;
      }
    }

    if (bestSimilarity >= threshold) {
      matches.push({
        photo,
        similarity: Number(bestSimilarity.toFixed(4)),
        distance: Number((1 - bestSimilarity).toFixed(4))
      });
    }
  }

  // Sort descending by highest similarity
  matches.sort((a, b) => b.similarity - a.similarity);
  return matches;
}

module.exports = {
  cosineSimilarity,
  euclideanDistance,
  findMatchingPhotos
};
