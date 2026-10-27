const express = require('express');
const router = express.Router();
const IssueRepository = require('../services/issueRepository');
const upload = require('../utils/uploader');
const { findPotentialDuplicates } = require('../services/duplicateDetector');
const { calculatePriority } = require('../services/priorityCalculator');
const { validateTransitionRules } = require('../services/statusStateMachine');

/**
 * GET /api/issues
 * List issues with search, filtering, and sorting
 */
router.get('/', async (req, res) => {
  try {
    const { category, status, severity, search, sort = 'priority' } = req.query;

    const query = {};

    if (category && category !== 'All') {
      query.category = category;
    }

    if (status && status !== 'All') {
      query.status = status;
    }

    if (severity && severity !== 'All') {
      query.severity = severity;
    }

    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { 'location.address': searchRegex }
      ];
    }

    let issues = await IssueRepository.find(query);

    // Apply sorting
    if (sort === 'priority') {
      issues.sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
    } else if (sort === 'newest') {
      issues.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sort === 'oldest') {
      issues.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (sort === 'upvotes') {
      issues.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
    }

    res.json({ success: true, count: issues.length, data: issues });
  } catch (error) {
    console.error('Error fetching issues:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve complaints.' });
  }
});

/**
 * POST /api/issues/check-duplicate
 * Pre-submission check that alerts the user about potential duplicates BEFORE saving
 */
router.post('/check-duplicate', async (req, res) => {
  try {
    const { title, description, category, latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.json({ success: true, hasDuplicates: false, matches: [] });
    }

    // Retrieve active and recent issues for comparison
    const recentIssues = await IssueRepository.find({
      status: { $in: ['Reported', 'Acknowledged', 'In Progress', 'Awaiting Verification', 'Reopened'] }
    });

    const draft = {
      title,
      description,
      category,
      location: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      }
    };

    const matches = findPotentialDuplicates(draft, recentIssues);

    res.json({
      success: true,
      hasDuplicates: matches.length > 0,
      matches
    });
  } catch (error) {
    console.error('Error checking duplicate:', error);
    res.status(500).json({ success: false, error: 'Failed to perform duplicate check.' });
  }
});

/**
 * GET /api/issues/:id
 * Retrieve single issue details with full audit history
 */
router.get('/:id', async (req, res) => {
  try {
    const issue = await IssueRepository.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({ success: false, error: 'Issue not found.' });
    }
    res.json({ success: true, data: issue });
  } catch (error) {
    console.error('Error fetching issue:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve issue details.' });
  }
});

/**
 * POST /api/issues
 * Create a new complaint report
 */
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      address,
      latitude,
      longitude,
      severity = 'Medium',
      reporterName = 'Concerned Citizen',
      reporterEmail = '',
      duplicateReferenceId,
      customImageUrl
    } = req.body;

    // Basic validation
    if (!title || !description || !category || !address || !latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Please provide title, description, category, address, latitude, and longitude.'
      });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return res.status(400).json({
        success: false,
        error: 'Invalid latitude or longitude coordinates provided.'
      });
    }

    // Handle image file or pre-set image URL
    let imageUrl = null;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    } else if (customImageUrl && customImageUrl.startsWith('/')) {
      imageUrl = customImageUrl;
    }

    // Check duplicate references
    const recentIssues = await IssueRepository.find({
      status: { $in: ['Reported', 'Acknowledged', 'In Progress', 'Awaiting Verification'] }
    });

    const matches = findPotentialDuplicates({
      title,
      description,
      category,
      location: { latitude: lat, longitude: lon }
    }, recentIssues);

    let duplicateRef = {
      isPotentialDuplicate: false,
      matchedIssueId: null,
      similarityScore: 0,
      matchReason: ''
    };

    if (duplicateReferenceId) {
      const matched = matches.find(m => m.issueId.toString() === duplicateReferenceId) || matches[0];
      if (matched) {
        duplicateRef = {
          isPotentialDuplicate: true,
          matchedIssueId: matched.issueId,
          similarityScore: matched.similarityScore,
          matchReason: matched.matchReason
        };
      }
    } else if (matches.length > 0) {
      duplicateRef = {
        isPotentialDuplicate: true,
        matchedIssueId: matches[0].issueId,
        similarityScore: matches[0].similarityScore,
        matchReason: matches[0].matchReason
      };
    }

    // Calculate initial deterministic priority score
    const priorityResult = calculatePriority({
      severity,
      category,
      upvotes: 0,
      status: 'Reported',
      createdAt: new Date()
    }, matches.length);

    // Initial status history log entry
    const initialHistory = [{
      fromStatus: 'None',
      toStatus: 'Reported',
      changedBy: reporterName || 'Citizen',
      userRole: 'citizen',
      timestamp: new Date(),
      comment: 'Initial issue complaint registered in CivicPulse.',
      evidenceAttached: !!imageUrl
    }];

    const issueData = {
      title: title.trim(),
      description: description.trim(),
      category,
      location: {
        address: address.trim(),
        latitude: lat,
        longitude: lon
      },
      severity,
      status: 'Reported',
      priorityScore: priorityResult.score,
      priorityTier: priorityResult.tier,
      priorityExplanation: priorityResult.explanation,
      imageUrl,
      reporter: {
        name: reporterName.trim() || 'Concerned Citizen',
        email: (reporterEmail || '').trim()
      },
      duplicateReference: duplicateRef,
      statusHistory: initialHistory,
      upvotes: 0,
      isDemo: false
    };

    const savedIssue = await IssueRepository.create(issueData);
    res.status(201).json({ success: true, data: savedIssue });
  } catch (error) {
    console.error('Error creating issue:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to submit complaint.' });
  }
});

/**
 * POST /api/issues/:id/upvote
 * Citizen endorsement ("I have this issue too!")
 * Increases upvotes and updates priority score
 */
router.post('/:id/upvote', async (req, res) => {
  try {
    const issue = await IssueRepository.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({ success: false, error: 'Issue not found.' });
    }

    issue.upvotes = (issue.upvotes || 0) + 1;

    // Recalculate priority with new endorsement
    const priorityResult = calculatePriority(issue);
    issue.priorityScore = priorityResult.score;
    issue.priorityTier = priorityResult.tier;
    issue.priorityExplanation = priorityResult.explanation;

    await IssueRepository.save(issue);
    res.json({ success: true, upvotes: issue.upvotes, priorityScore: issue.priorityScore });
  } catch (error) {
    console.error('Error upvoting issue:', error);
    res.status(500).json({ success: false, error: 'Failed to record upvote.' });
  }
});

/**
 * POST /api/issues/:id/verify
 * EVIDENCE-BASED RESOLUTION: Citizen / Verifier Approval or Rejection
 */
router.post('/:id/verify', async (req, res) => {
  try {
    const { action, verifierName = 'Citizen Reporter', comment = '', rejectionReason = '' } = req.body;

    const issue = await IssueRepository.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({ success: false, error: 'Issue not found.' });
    }

    if (issue.status !== 'Awaiting Verification') {
      return res.status(400).json({
        success: false,
        error: `Cannot verify this issue. Current status is "${issue.status}". Only issues in "Awaiting Verification" can be approved or rejected.`
      });
    }

    const previousStatus = issue.status;

    if (action === 'approve') {
      const check = validateTransitionRules(previousStatus, 'Resolved');
      if (!check.isValid) {
        return res.status(400).json({ success: false, error: check.error });
      }

      issue.status = 'Resolved';
      if (!issue.resolutionEvidence) issue.resolutionEvidence = {};
      issue.resolutionEvidence.verifiedBy = verifierName;
      issue.resolutionEvidence.verifiedAt = new Date();
      issue.resolutionEvidence.verificationComment = comment || 'Citizen verified the resolution evidence successfully.';

      issue.statusHistory.push({
        fromStatus: previousStatus,
        toStatus: 'Resolved',
        changedBy: verifierName,
        userRole: 'citizen',
        timestamp: new Date(),
        comment: comment || 'Resolution approved by reporter. Issue closed.'
      });

      const priorityResult = calculatePriority(issue);
      issue.priorityScore = priorityResult.score;
      issue.priorityTier = priorityResult.tier;

      await IssueRepository.save(issue);
      return res.json({ success: true, message: 'Resolution approved and issue marked Resolved!', data: issue });
    } else if (action === 'reject') {
      const check = validateTransitionRules(previousStatus, 'Reopened', { rejectionReason });
      if (!check.isValid) {
        return res.status(400).json({ success: false, error: check.error });
      }

      issue.status = 'Reopened';
      if (!issue.resolutionEvidence) issue.resolutionEvidence = {};
      issue.resolutionEvidence.reopenedAt = new Date();
      issue.resolutionEvidence.rejectionReason = rejectionReason;

      issue.statusHistory.push({
        fromStatus: previousStatus,
        toStatus: 'Reopened',
        changedBy: verifierName,
        userRole: 'citizen',
        timestamp: new Date(),
        comment: `Citizen rejected resolution: "${rejectionReason}". Issue reopened for corrective work.`
      });

      const priorityResult = calculatePriority(issue);
      issue.priorityScore = priorityResult.score;
      issue.priorityTier = priorityResult.tier;
      issue.priorityExplanation = priorityResult.explanation;

      await IssueRepository.save(issue);
      return res.json({ success: true, message: 'Resolution rejected. Issue has been Reopened for corrective action.', data: issue });
    } else {
      return res.status(400).json({ success: false, error: 'Invalid verification action. Must be "approve" or "reject".' });
    }
  } catch (error) {
    console.error('Error verifying issue:', error);
    res.status(500).json({ success: false, error: 'Failed to process resolution verification.' });
  }
});

/**
 * GET /api/issues/:id/history
 * Retrieve full status history timeline
 */
router.get('/:id/history', async (req, res) => {
  try {
    const issue = await IssueRepository.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({ success: false, error: 'Issue not found.' });
    }
    res.json({ success: true, data: issue.statusHistory || [] });
  } catch (error) {
    console.error('Error fetching issue history:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve status history.' });
  }
});

module.exports = router;
