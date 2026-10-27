/**
 * DUPLICATE COMPLAINT DETECTION SERVICE
 * 
 * Provides transparent, explainable duplicate identification using:
 * 1. Geographic distance via the Haversine formula
 * 2. Text similarity via normalized keyword overlap (Jaccard Index)
 * 3. Category matching and time-window evaluation
 */

// Earth radius in meters (standard mean spherical radius)
const EARTH_RADIUS_METERS = 6371000;

// Common English stopwords to ignore during keyword extraction
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
  'with', 'by', 'from', 'up', 'about', 'into', 'over', 'after', 'is', 'are',
  'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
  'did', 'this', 'that', 'these', 'those', 'there', 'here', 'near', 'very',
  'please', 'help', 'urgent', 'problem', 'issue', 'reported'
]);

/**
 * Calculates geographic distance in meters between two coordinates using the Haversine formula
 * Formula:
 * a = sin²(Δlat/2) + cos(lat1) * cos(lat2) * sin²(Δlon/2)
 * c = 2 * atan2(√a, √(1−a))
 * d = R * c
 *
 * @param {number} lat1 Latitude of point 1 (in degrees)
 * @param {number} lon1 Longitude of point 1 (in degrees)
 * @param {number} lat2 Latitude of point 2 (in degrees)
 * @param {number} lon2 Longitude of point 2 (in degrees)
 * @returns {number} Distance in meters
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRadians = (deg) => (deg * Math.PI) / 180;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const radLat1 = toRadians(lat1);
  const radLat2 = toRadians(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(EARTH_RADIUS_METERS * c);
}

/**
 * Normalizes text and extracts significant keywords
 * Lowercases, strips punctuation, removes stopwords, and keeps words >= 3 chars
 *
 * @param {string} text Input text
 * @returns {Set<string>} Set of unique normalized keywords
 */
function extractKeywords(text) {
  if (!text || typeof text !== 'string') return new Set();

  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Replace punctuation with space
    .split(/\s+/)
    .filter(word => word.length >= 3 && !STOP_WORDS.has(word));

  return new Set(words);
}

/**
 * Calculates normalized text similarity between two strings using Jaccard Similarity Coefficient
 * Jaccard Index = |Intersection of Keywords| / |Union of Keywords|
 * Returns a value between 0.0 (no overlap) and 1.0 (identical keywords)
 *
 * @param {string} text1 First text string
 * @param {string} text2 Second text string
 * @returns {number} Similarity score between 0.0 and 1.0
 */
function calculateTextSimilarity(text1, text2) {
  const words1 = extractKeywords(text1);
  const words2 = extractKeywords(text2);

  if (words1.size === 0 || words2.size === 0) return 0;

  let intersectionCount = 0;
  for (const word of words1) {
    if (words2.has(word)) {
      intersectionCount++;
    }
  }

  const unionCount = words1.size + words2.size - intersectionCount;
  if (unionCount === 0) return 0;

  return intersectionCount / unionCount;
}

/**
 * Checks a new complaint against existing active or recent complaints for potential duplicates
 *
 * Scored out of 100 points:
 * - Distance factor (up to 45 points): based on physical proximity
 * - Text overlap factor (up to 40 points): based on title + description similarity
 * - Category factor (up to 15 points): 15 for exact category match
 *
 * @param {Object} newIssue The issue being submitted { title, description, category, location }
 * @param {Array<Object>} existingIssues List of existing issues from database
 * @param {Object} options Configuration options (thresholds)
 * @returns {Array<Object>} Array of matches meeting the duplicate threshold, sorted by score descending
 */
function findPotentialDuplicates(newIssue, existingIssues, options = {}) {
  const maxDistanceMeters = options.maxDistanceMeters || 400; // Look within 400 meters
  const minScoreThreshold = options.minScoreThreshold || 50;  // 50% threshold for duplicate alert

  const matches = [];

  const newLat = Number(newIssue.location?.latitude);
  const newLon = Number(newIssue.location?.longitude);
  const newFullText = `${newIssue.title || ''} ${newIssue.description || ''}`;

  if (isNaN(newLat) || isNaN(newLon)) {
    return [];
  }

  for (const existing of existingIssues) {
    // Skip if comparing against itself
    if (newIssue._id && existing._id && existing._id.toString() === newIssue._id.toString()) {
      continue;
    }

    // Coordinates of existing issue
    const existLat = Number(existing.location?.latitude);
    const existLon = Number(existing.location?.longitude);
    if (isNaN(existLat) || isNaN(existLon)) continue;

    // 1. Calculate physical distance
    const distanceMeters = haversineDistance(newLat, newLon, existLat, existLon);
    if (distanceMeters > maxDistanceMeters) {
      continue; // Too far away to be the same local physical defect
    }

    // Distance score: 45 pts at 0m down to 10 pts at 400m
    const distanceRatio = Math.max(0, 1 - distanceMeters / maxDistanceMeters);
    const distanceScore = Math.round(distanceRatio * 45);

    // 2. Calculate category similarity
    const sameCategory = existing.category === newIssue.category;
    const categoryScore = sameCategory ? 15 : 0;

    // 3. Calculate text similarity
    const existFullText = `${existing.title || ''} ${existing.description || ''}`;
    const textSimilarity = calculateTextSimilarity(newFullText, existFullText);
    const textScore = Math.round(textSimilarity * 40);

    // Composite similarity percentage (0 - 100)
    const totalScore = Math.min(100, distanceScore + categoryScore + textScore);

    if (totalScore >= minScoreThreshold) {
      // Build human-friendly explanation for viva and UI
      const reasons = [];
      reasons.push(`${distanceMeters}m away`);
      if (sameCategory) {
        reasons.push(`same category (${existing.category})`);
      }
      if (textSimilarity > 0.2) {
        reasons.push(`${Math.round(textSimilarity * 100)}% keyword overlap`);
      }

      matches.push({
        issueId: existing._id,
        title: existing.title,
        status: existing.status,
        category: existing.category,
        address: existing.location?.address,
        distanceMeters,
        textSimilarity: Math.round(textSimilarity * 100),
        similarityScore: totalScore,
        matchReason: `Possible duplicate: ${reasons.join(', ')}`,
        createdAt: existing.createdAt
      });
    }
  }

  // Sort by highest similarity score first
  return matches.sort((a, b) => b.similarityScore - a.similarityScore);
}

module.exports = {
  haversineDistance,
  extractKeywords,
  calculateTextSimilarity,
  findPotentialDuplicates
};
