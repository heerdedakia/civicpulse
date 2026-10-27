const express = require('express');
const router = express.Router();
const IssueRepository = require('../services/issueRepository');
const upload = require('../utils/uploader');
const { validateTransitionRules } = require('../services/statusStateMachine');
const { calculatePriority } = require('../services/priorityCalculator');

/**
 * GET /api/admin/issues
 * Administrative view of all issues with duplicate references and priority rankings
 */
router.get('/issues', async (req, res) => {
  try {
    const { department, status, priorityTier } = req.query;
    const query = {};

    if (department && department !== 'All') {
      query.assignedDepartment = department;
    }

    if (status && status !== 'All') {
      query.status = status;
    }

    if (priorityTier && priorityTier !== 'All') {
      query.priorityTier = priorityTier;
    }

    const issues = await IssueRepository.find(query);
    issues.sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));

    res.json({ success: true, count: issues.length, data: issues });
  } catch (error) {
    console.error('Error fetching admin issues:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve administrative records.' });
  }
});

/**
 * PATCH /api/admin/issues/:id/status
 * Updates issue status enforcing the evidence-based state machine
 */
router.patch('/issues/:id/status', upload.single('evidenceImage'), async (req, res) => {
  try {
    const {
      status: proposedStatus,
      resolutionNotes = '',
      adminName = 'Chief Engineer Priya Nair',
      comment = '',
      customEvidenceUrl
    } = req.body;

    const issue = await IssueRepository.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({ success: false, error: 'Issue not found.' });
    }

    const currentStatus = issue.status;

    // Disallow administrator from silently jumping directly to "Resolved"!
    if (proposedStatus === 'Resolved') {
      return res.status(400).json({
        success: false,
        error: 'Administrators cannot directly mark issues as "Resolved". You must submit resolution evidence for citizen verification by setting status to "Awaiting Verification".'
      });
    }

    // Validate using the state machine rules
    const check = validateTransitionRules(currentStatus, proposedStatus, {
      resolutionNotes
    });

    if (!check.isValid) {
      return res.status(400).json({ success: false, error: check.error });
    }

    // Handle evidence image if transitioning to Awaiting Verification
    let evidenceImageUrl = issue.resolutionEvidence?.evidenceImageUrl || null;
    if (req.file) {
      evidenceImageUrl = `/uploads/${req.file.filename}`;
    } else if (customEvidenceUrl && customEvidenceUrl.startsWith('/')) {
      evidenceImageUrl = customEvidenceUrl;
    }

    // Apply status update
    issue.status = proposedStatus;

    if (proposedStatus === 'Awaiting Verification') {
      issue.resolutionEvidence = {
        submittedBy: adminName,
        submittedAt: new Date(),
        resolutionNotes: resolutionNotes.trim(),
        evidenceImageUrl,
        verifiedBy: '',
        verifiedAt: null,
        verificationComment: '',
        rejectionReason: '',
        reopenedAt: null
      };
    }

    if (!issue.statusHistory) issue.statusHistory = [];

    // Record immutable audit entry
    issue.statusHistory.push({
      fromStatus: currentStatus,
      toStatus: proposedStatus,
      changedBy: adminName,
      userRole: 'admin',
      timestamp: new Date(),
      comment: comment || (proposedStatus === 'Awaiting Verification' ? resolutionNotes : `Status updated to ${proposedStatus}`),
      evidenceAttached: !!evidenceImageUrl
    });

    // Recalculate priority
    const priorityResult = calculatePriority(issue);
    issue.priorityScore = priorityResult.score;
    issue.priorityTier = priorityResult.tier;
    issue.priorityExplanation = priorityResult.explanation;

    await IssueRepository.save(issue);

    res.json({
      success: true,
      message: `Issue status updated to ${proposedStatus}.`,
      data: issue
    });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to update issue status.' });
  }
});

/**
 * PATCH /api/admin/issues/:id/assign
 * Assign department, officer, and internal municipal notes
 */
router.patch('/issues/:id/assign', async (req, res) => {
  try {
    const { assignedDepartment, assignedOfficer, adminNotes } = req.body;

    const issue = await IssueRepository.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({ success: false, error: 'Issue not found.' });
    }

    if (assignedDepartment) issue.assignedDepartment = assignedDepartment;
    if (assignedOfficer) issue.assignedOfficer = assignedOfficer;
    if (typeof adminNotes === 'string') issue.adminNotes = adminNotes;

    await IssueRepository.save(issue);
    res.json({ success: true, message: 'Assignment details updated successfully.', data: issue });
  } catch (error) {
    console.error('Error assigning issue:', error);
    res.status(500).json({ success: false, error: 'Failed to update assignment details.' });
  }
});

/**
 * DELETE /api/admin/issues/:id
 * Delete issue (authorized administrative removal)
 */
router.delete('/issues/:id', async (req, res) => {
  try {
    const deleted = await IssueRepository.deleteById(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Issue not found.' });
    }
    res.json({ success: true, message: 'Issue removed from registry.' });
  } catch (error) {
    console.error('Error deleting issue:', error);
    res.status(500).json({ success: false, error: 'Failed to delete issue.' });
  }
});

module.exports = router;
