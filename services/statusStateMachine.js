/**
 * CIVICPULSE STATUS TRANSITION STATE MACHINE
 * 
 * Enforces the core evidence-based resolution workflow.
 * An administrator CANNOT simply mark an issue "Resolved".
 * An issue MUST pass through "Awaiting Verification" with submitted evidence,
 * and be verified or reopened by the reporter/citizen.
 */

const VALID_TRANSITIONS = {
  Reported: ['Acknowledged', 'In Progress'],
  Acknowledged: ['In Progress'],
  'In Progress': ['Awaiting Verification'],
  'Awaiting Verification': ['Resolved', 'Reopened'],
  Reopened: ['In Progress'],
  Resolved: [] // Terminal state unless reopened via dispute workflow
};

/**
 * Validates whether a proposed status transition is permissible
 * 
 * @param {string} currentStatus Current status of the complaint
 * @param {string} proposedStatus Desired new status
 * @returns {boolean} True if transition is legally valid
 */
function isValidTransition(currentStatus, proposedStatus) {
  if (!currentStatus || !proposedStatus) return false;
  if (currentStatus === proposedStatus) return true; // No-op allowed
  const allowed = VALID_TRANSITIONS[currentStatus];
  return Array.isArray(allowed) && allowed.includes(proposedStatus);
}

/**
 * Validates business prerequisites for specific transitions
 * 
 * @param {string} currentStatus 
 * @param {string} proposedStatus 
 * @param {Object} payload Additional transition data { resolutionNotes, rejectionReason, etc. }
 * @returns {Object} { isValid: boolean, error?: string }
 */
function validateTransitionRules(currentStatus, proposedStatus, payload = {}) {
  // 1. Check state machine graph validity
  if (!isValidTransition(currentStatus, proposedStatus)) {
    return {
      isValid: false,
      error: `Invalid status transition from "${currentStatus}" to "${proposedStatus}". Allowed transitions: [${(VALID_TRANSITIONS[currentStatus] || []).join(', ')}]`
    };
  }

  // 2. Submitting for Verification requires resolution explanation
  if (proposedStatus === 'Awaiting Verification') {
    if (!payload.resolutionNotes || payload.resolutionNotes.trim().length < 5) {
      return {
        isValid: false,
        error: 'Resolution description/notes (at least 5 characters) are required before moving to "Awaiting Verification".'
      };
    }
  }

  // 3. Reopening an issue requires a rejection reason
  if (proposedStatus === 'Reopened') {
    if (!payload.rejectionReason || payload.rejectionReason.trim().length < 5) {
      return {
        isValid: false,
        error: 'A mandatory reason (at least 5 characters) explaining why resolution was rejected is required to reopen this issue.'
      };
    }
  }

  return { isValid: true };
}

module.exports = {
  VALID_TRANSITIONS,
  isValidTransition,
  validateTransitionRules
};
