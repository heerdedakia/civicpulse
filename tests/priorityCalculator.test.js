const test = require('node:test');
const assert = require('node:assert');
const { calculatePriority } = require('../services/priorityCalculator');

test('Priority Calculator: Calculates base severity and category weights', () => {
  const issue = {
    severity: 'Critical', // 70 pts
    category: 'Drainage & Sewage', // +12 pts
    upvotes: 0,
    status: 'Reported',
    createdAt: new Date()
  };

  const res = calculatePriority(issue);
  // 70 + 12 = 82 pts
  assert.strictEqual(res.score, 82);
  assert.strictEqual(res.tier, 'High');
});

test('Priority Calculator: Accurately caps community impact and age escalation', () => {
  // Issue created 20 days ago with 10 upvotes
  const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
  const issue = {
    severity: 'Medium', // 30 pts
    category: 'Roads & Potholes', // +10 pts
    upvotes: 10, // 10 * 5 = 50, but capped at +15 pts
    status: 'In Progress',
    createdAt: twentyDaysAgo // 20 days * 2 = 40, but capped at +15 pts
  };

  const res = calculatePriority(issue);
  // 30 + 10 + 15 + 15 = 70 pts
  assert.strictEqual(res.score, 70);
  assert.strictEqual(res.tier, 'High');
});

test('Priority Calculator: Reopened status adds escalation penalty', () => {
  const issue = {
    severity: 'High', // 50 pts
    category: 'Water & Leakage', // +10 pts
    upvotes: 0,
    status: 'Reopened', // +10 pts
    createdAt: new Date()
  };

  const res = calculatePriority(issue);
  // 50 + 10 + 10 = 70 pts
  assert.strictEqual(res.score, 70);
  assert.ok(res.breakdown.some(b => b.includes('Reopened escalation')));
});

test('Priority Calculator: Boundary clamping strictly keeps score between 0 and 100', () => {
  const superUrgentIssue = {
    severity: 'Critical', // 70
    category: 'Drainage & Sewage', // 12
    upvotes: 20, // capped at 15
    status: 'Reopened', // 10
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // capped at 15
  };

  const res = calculatePriority(superUrgentIssue);
  // 70 + 12 + 15 + 10 + 15 = 122 -> clamped to 100
  assert.strictEqual(res.score, 100);
  assert.strictEqual(res.tier, 'Urgent');
});
