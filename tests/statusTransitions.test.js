const test = require('node:test');
const assert = require('node:assert');
const {
  isValidTransition,
  validateTransitionRules,
  VALID_TRANSITIONS
} = require('../services/statusStateMachine');

test('State Machine: Allows legal sequential status transitions', () => {
  assert.strictEqual(isValidTransition('Reported', 'Acknowledged'), true);
  assert.strictEqual(isValidTransition('Acknowledged', 'In Progress'), true);
  assert.strictEqual(isValidTransition('In Progress', 'Awaiting Verification'), true);
  assert.strictEqual(isValidTransition('Awaiting Verification', 'Resolved'), true);
  assert.strictEqual(isValidTransition('Awaiting Verification', 'Reopened'), true);
  assert.strictEqual(isValidTransition('Reopened', 'In Progress'), true);
});

test('State Machine: Strictly blocks illegal jumps (Cannot resolve without verification)', () => {
  // Directly jumping from Reported to Resolved is strictly disallowed
  assert.strictEqual(isValidTransition('Reported', 'Resolved'), false);
  // Directly jumping from In Progress to Resolved is strictly disallowed
  assert.strictEqual(isValidTransition('In Progress', 'Resolved'), false);
  // Terminal resolved issues cannot transition back without verification dispute
  assert.strictEqual(isValidTransition('Resolved', 'In Progress'), false);
});

test('Transition Rules: Enforces resolution notes for Awaiting Verification', () => {
  // Without resolution notes
  const failCheck = validateTransitionRules('In Progress', 'Awaiting Verification', { resolutionNotes: '' });
  assert.strictEqual(failCheck.isValid, false);
  assert.ok(failCheck.error.includes('Resolution description/notes'));

  // With valid resolution notes
  const passCheck = validateTransitionRules('In Progress', 'Awaiting Verification', {
    resolutionNotes: 'Repaired fractured conduit and verified water flow.'
  });
  assert.strictEqual(passCheck.isValid, true);
});

test('Transition Rules: Enforces mandatory rejection reason when Reopening', () => {
  // Without reason
  const failCheck = validateTransitionRules('Awaiting Verification', 'Reopened', { rejectionReason: '' });
  assert.strictEqual(failCheck.isValid, false);
  assert.ok(failCheck.error.includes('mandatory reason'));

  // With valid reason
  const passCheck = validateTransitionRules('Awaiting Verification', 'Reopened', {
    rejectionReason: 'Pothole patch broke immediately under heavy truck traffic.'
  });
  assert.strictEqual(passCheck.isValid, true);
});
