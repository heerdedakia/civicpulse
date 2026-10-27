/**
 * PRIORITY AND RISK SCORING SERVICE
 * 
 * Computes a transparent, deterministic score (0-100) and tier (Low, Medium, High, Urgent).
 * Designed for clarity and easy viva explanation.
 * 
 * Factors:
 * 1. User-reported severity (15 to 70 pts)
 * 2. Category public hazard weighting (5 to 12 pts)
 * 3. Community impact / endorsements / duplicates (up to 15 pts)
 * 4. Age of unresolved grievance (up to 15 pts)
 * 5. Reopened penalty escalation (+10 pts)
 */

// Base severity points
const SEVERITY_SCORES = {
  Low: 15,
  Medium: 30,
  High: 50,
  Critical: 70
};

// Category hazard weights
const CATEGORY_WEIGHTS = {
  'Drainage & Sewage': 12,
  'Water & Leakage': 10,
  'Roads & Potholes': 10,
  'Street Lighting': 8,
  'Public Infrastructure': 6,
  'Garbage & Sanitation': 5
};

/**
 * Calculates priority score and explanation
 * 
 * @param {Object} issue The complaint object
 * @param {number} similarCount Number of confirmed duplicate reports or citizen endorsements
 * @returns {Object} { score, tier, explanation, breakdown }
 */
function calculatePriority(issue, similarCount = 0) {
  const breakdown = [];

  // 1. Base Severity Score
  const severity = issue.severity || 'Medium';
  const baseScore = SEVERITY_SCORES[severity] !== undefined ? SEVERITY_SCORES[severity] : 30;
  breakdown.push(`Base severity (${severity}): +${baseScore} pts`);

  // 2. Category Hazard Weight
  const category = issue.category || 'Public Infrastructure';
  const categoryWeight = CATEGORY_WEIGHTS[category] !== undefined ? CATEGORY_WEIGHTS[category] : 6;
  breakdown.push(`Category factor (${category}): +${categoryWeight} pts`);

  // 3. Community Impact (Similar complaints or upvotes)
  const totalEndorsements = (issue.upvotes || 0) + (similarCount || 0);
  const communityPoints = Math.min(15, totalEndorsements * 5);
  if (communityPoints > 0) {
    breakdown.push(`Community impact (${totalEndorsements} endorsement/reports): +${communityPoints} pts`);
  }

  // 4. Age Escalation for Unresolved Complaints
  let agePoints = 0;
  if (issue.status !== 'Resolved' && issue.status !== 'Awaiting Verification') {
    const createdAt = issue.createdAt ? new Date(issue.createdAt) : new Date();
    const daysUnresolved = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    agePoints = Math.min(15, Math.max(0, daysUnresolved * 2));
    if (agePoints > 0) {
      breakdown.push(`Unresolved duration (${daysUnresolved} days): +${agePoints} pts`);
    }
  }

  // 5. Reopened Issue Escalation
  let reopenedPoints = 0;
  if (issue.status === 'Reopened' || (issue.statusHistory && issue.statusHistory.some(h => h.toStatus === 'Reopened'))) {
    reopenedPoints = 10;
    breakdown.push(`Reopened escalation (citizen rejected previous fix): +${reopenedPoints} pts`);
  }

  // Calculate total and clamp between 0 and 100
  const rawScore = baseScore + categoryWeight + communityPoints + agePoints + reopenedPoints;
  const score = Math.min(100, Math.max(0, rawScore));

  // Determine Priority Tier
  let tier = 'Low';
  if (score >= 85) {
    tier = 'Urgent';
  } else if (score >= 65) {
    tier = 'High';
  } else if (score >= 40) {
    tier = 'Medium';
  } else {
    tier = 'Low';
  }

  const explanation = `${tier} Priority (${score}/100) — ${breakdown.join('; ')}`;

  return {
    score,
    tier,
    explanation,
    breakdown
  };
}

module.exports = {
  calculatePriority,
  SEVERITY_SCORES,
  CATEGORY_WEIGHTS
};
