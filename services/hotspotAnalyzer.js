const { haversineDistance } = require('./duplicateDetector');

/**
 * RECURRING-HOTSPOT DETECTION SERVICE
 * 
 * Clusters issues deterministically using spatial proximity (within 350 meters)
 * and category matching to surface chronic infrastructure failure zones.
 * 
 * @param {Array<Object>} issues Full list of issues from the database
 * @param {Object} options Clustering settings { radiusMeters: 350, minComplaints: 2 }
 * @returns {Array<Object>} List of recurring hotspots sorted by severity and recurrence count
 */
function detectHotspots(issues, options = {}) {
  const radiusMeters = options.radiusMeters || 350;
  const minComplaints = options.minComplaints || 2;

  // Filter valid complaints with valid coordinates
  const validIssues = issues.filter(issue =>
    issue.location &&
    typeof issue.location.latitude === 'number' &&
    typeof issue.location.longitude === 'number' &&
    !isNaN(issue.location.latitude) &&
    !isNaN(issue.location.longitude)
  );

  const visited = new Set();
  const clusters = [];

  for (let i = 0; i < validIssues.length; i++) {
    const current = validIssues[i];
    const currentId = current._id ? current._id.toString() : `idx-${i}`;

    if (visited.has(currentId)) continue;

    // Start a new potential cluster with current issue
    const clusterMembers = [current];
    visited.add(currentId);

    // Look for proximate issues in the same category
    for (let j = i + 1; j < validIssues.length; j++) {
      const candidate = validIssues[j];
      const candidateId = candidate._id ? candidate._id.toString() : `idx-${j}`;

      if (visited.has(candidateId)) continue;

      // Must belong to the exact same category
      if (candidate.category !== current.category) continue;

      // Calculate distance between candidate and the seed of this cluster
      const distance = haversineDistance(
        current.location.latitude,
        current.location.longitude,
        candidate.location.latitude,
        candidate.location.longitude
      );

      if (distance <= radiusMeters) {
        clusterMembers.push(candidate);
        visited.add(candidateId);
      }
    }

    // Only qualify as a recurring hotspot if it meets minimum complaint threshold
    if (clusterMembers.length >= minComplaints) {
      // Calculate cluster centroid coordinates
      const totalLat = clusterMembers.reduce((sum, item) => sum + item.location.latitude, 0);
      const totalLon = clusterMembers.reduce((sum, item) => sum + item.location.longitude, 0);
      const avgLat = Number((totalLat / clusterMembers.length).toFixed(6));
      const avgLon = Number((totalLon / clusterMembers.length).toFixed(6));

      // Calculate statistics
      let unresolvedCount = 0;
      let reopenedCount = 0;
      const resolutionTimesMs = [];

      clusterMembers.forEach(item => {
        if (item.status !== 'Resolved') {
          unresolvedCount++;
        }
        if (item.status === 'Reopened' || (item.statusHistory && item.statusHistory.some(h => h.toStatus === 'Reopened'))) {
          reopenedCount++;
        }

        // Check if resolved and calculate resolution time
        if (item.status === 'Resolved' && item.resolutionEvidence && item.resolutionEvidence.verifiedAt) {
          const resolvedTime = new Date(item.resolutionEvidence.verifiedAt).getTime();
          const createdTime = new Date(item.createdAt).getTime();
          if (resolvedTime > createdTime) {
            resolutionTimesMs.push(resolvedTime - createdTime);
          }
        }
      });

      // Average resolution duration in days (if resolved complaints exist)
      let avgResolutionDays = null;
      if (resolutionTimesMs.length > 0) {
        const totalMs = resolutionTimesMs.reduce((a, b) => a + b, 0);
        avgResolutionDays = Number((totalMs / (resolutionTimesMs.length * 1000 * 60 * 60 * 24)).toFixed(1));
      }

      // Hotspot risk level
      let riskLevel = 'Moderate';
      if (clusterMembers.length >= 4 || unresolvedCount >= 3 || reopenedCount >= 2) {
        riskLevel = 'Critical';
      } else if (clusterMembers.length >= 3 || unresolvedCount >= 2) {
        riskLevel = 'High';
      }

      // Representative address (pick the longest or most specific address string)
      const primaryAddress = clusterMembers
        .map(m => m.location.address)
        .sort((a, b) => (b ? b.length : 0) - (a ? a.length : 0))[0] || 'Unknown Location';

      clusters.push({
        id: `hotspot-${clusters.length + 1}`,
        category: current.category,
        primaryAddress,
        coordinates: {
          latitude: avgLat,
          longitude: avgLon
        },
        totalReports: clusterMembers.length,
        repeatIncidents: clusterMembers.length - 1,
        unresolvedCount,
        reopenedCount,
        avgResolutionDays,
        riskLevel,
        issues: clusterMembers.map(m => ({
          id: m._id,
          title: m.title,
          status: m.status,
          severity: m.severity,
          createdAt: m.createdAt,
          address: m.location?.address
        }))
      });
    }
  }

  // Sort hotspots by risk level and total report count
  const riskOrder = { Critical: 3, High: 2, Moderate: 1 };
  return clusters.sort((a, b) => {
    const riskDiff = (riskOrder[b.riskLevel] || 0) - (riskOrder[a.riskLevel] || 0);
    if (riskDiff !== 0) return riskDiff;
    return b.totalReports - a.totalReports;
  });
}

module.exports = {
  detectHotspots
};
