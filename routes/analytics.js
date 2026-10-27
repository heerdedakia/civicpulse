const express = require('express');
const router = express.Router();
const IssueRepository = require('../services/issueRepository');
const { detectHotspots } = require('../services/hotspotAnalyzer');

/**
 * GET /api/analytics
 * Comprehensive civic intelligence analytics for Chart.js dashboard
 */
router.get('/', async (req, res) => {
  try {
    const issues = await IssueRepository.find({});

    const total = issues.length;
    let active = 0;
    let awaitingVerification = 0;
    let resolved = 0;
    let reopened = 0;

    const categoryCounts = {
      'Roads & Potholes': 0,
      'Garbage & Sanitation': 0,
      'Street Lighting': 0,
      'Water & Leakage': 0,
      'Public Infrastructure': 0,
      'Drainage & Sewage': 0
    };

    const statusCounts = {
      Reported: 0,
      Acknowledged: 0,
      'In Progress': 0,
      'Awaiting Verification': 0,
      Resolved: 0,
      Reopened: 0
    };

    const priorityCounts = {
      Low: 0,
      Medium: 0,
      High: 0,
      Urgent: 0
    };

    const resolutionTimesDays = [];

    issues.forEach(issue => {
      if (categoryCounts[issue.category] !== undefined) {
        categoryCounts[issue.category]++;
      }

      if (statusCounts[issue.status] !== undefined) {
        statusCounts[issue.status]++;
      }

      if (priorityCounts[issue.priorityTier] !== undefined) {
        priorityCounts[issue.priorityTier]++;
      }

      if (issue.status === 'Resolved') {
        resolved++;
        if (issue.resolutionEvidence?.verifiedAt && issue.createdAt) {
          const ms = new Date(issue.resolutionEvidence.verifiedAt) - new Date(issue.createdAt);
          if (ms > 0) {
            resolutionTimesDays.push(ms / (1000 * 60 * 60 * 24));
          }
        }
      } else if (issue.status === 'Awaiting Verification') {
        awaitingVerification++;
        active++;
      } else if (issue.status === 'Reopened') {
        reopened++;
        active++;
      } else {
        active++;
      }
    });

    let avgResolutionDays = 0;
    if (resolutionTimesDays.length > 0) {
      const sum = resolutionTimesDays.reduce((a, b) => a + b, 0);
      avgResolutionDays = Number((sum / resolutionTimesDays.length).toFixed(1));
    }

    const hotspots = detectHotspots(issues);

    res.json({
      success: true,
      data: {
        summary: {
          totalComplaints: total,
          activeComplaints: active,
          awaitingVerification,
          verifiedResolutions: resolved,
          reopenedComplaints: reopened,
          hotspotsCount: hotspots.length,
          avgResolutionDays
        },
        categoryCounts,
        statusCounts,
        priorityCounts,
        hotspots
      }
    });
  } catch (error) {
    console.error('Error computing analytics:', error);
    res.status(500).json({ success: false, error: 'Failed to compute civic analytics.' });
  }
});

/**
 * GET /api/hotspots
 * Dedicated endpoint returning recurring hotspots
 */
router.get('/hotspots', async (req, res) => {
  try {
    const issues = await IssueRepository.find({});
    const hotspots = detectHotspots(issues);
    res.json({ success: true, count: hotspots.length, data: hotspots });
  } catch (error) {
    console.error('Error retrieving hotspots:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve recurring hotspots.' });
  }
});

module.exports = router;
