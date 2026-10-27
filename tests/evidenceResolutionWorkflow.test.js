const test = require('node:test');
const assert = require('node:assert');
const { app } = require('../server');

function testRequest(options) {
  return new Promise((resolve) => {
    const { EventEmitter } = require('events');
    const req = new EventEmitter();
    req.method = options.method || 'GET';
    req.url = options.url || '/';
    req.headers = options.headers || { 'content-type': 'application/json' };
    req.body = options.body || {};

    const res = new EventEmitter();
    res.statusCode = 200;
    res.headers = {};
    res.setHeader = (k, v) => { res.headers[k.toLowerCase()] = v; };
    res.getHeader = (k) => res.headers[k.toLowerCase()];
    res.status = (code) => { res.statusCode = code; return res; };
    
    let responseBody = '';
    res.json = (data) => {
      res.setHeader('content-type', 'application/json');
      resolve({ status: res.statusCode, data });
    };
    res.send = (body) => {
      responseBody = body;
      resolve({ status: res.statusCode, body: responseBody });
    };
    res.end = (chunk) => {
      if (chunk) responseBody += chunk;
      resolve({ status: res.statusCode, body: responseBody });
    };

    app.handle(req, res);
  });
}

test('Evidence-Based Workflow: Full lifecycle from creation to verification & rejection', async () => {
  // 1. Citizen reports issue
  const createRes = await testRequest({
    method: 'POST',
    url: '/api/issues',
    body: {
      title: 'Water pipe leakage test issue',
      description: 'Major leak observed on sidewalk flooding pedestrian path.',
      category: 'Water & Leakage',
      address: '7th Avenue test',
      latitude: 12.9715,
      longitude: 77.5945,
      severity: 'High'
    }
  });

  assert.strictEqual(createRes.status, 201);
  const createdIssue = createRes.data.data;
  assert.strictEqual(createdIssue.status, 'Reported');
  assert.strictEqual(createdIssue.statusHistory.length, 1);
  const issueId = createdIssue._id;

  // 2. Admin cannot jump directly from Reported to Resolved!
  const illegalResolved = await testRequest({
    method: 'PATCH',
    url: `/api/admin/issues/${issueId}/status`,
    body: {
      status: 'Resolved'
    }
  });
  assert.strictEqual(illegalResolved.status, 400);
  assert.ok(illegalResolved.data.error.includes('Administrators cannot directly mark issues as "Resolved"'));

  // 3. Admin acknowledges
  const ackRes = await testRequest({
    method: 'PATCH',
    url: `/api/admin/issues/${issueId}/status`,
    body: { status: 'Acknowledged' }
  });
  assert.strictEqual(ackRes.status, 200);
  assert.strictEqual(ackRes.data.data.status, 'Acknowledged');

  // 4. Admin moves to In Progress
  const progRes = await testRequest({
    method: 'PATCH',
    url: `/api/admin/issues/${issueId}/status`,
    body: { status: 'In Progress' }
  });
  assert.strictEqual(progRes.status, 200);
  assert.strictEqual(progRes.data.data.status, 'In Progress');

  // 5. Admin moves to Awaiting Verification without notes -> fails
  const noNotesRes = await testRequest({
    method: 'PATCH',
    url: `/api/admin/issues/${issueId}/status`,
    body: { status: 'Awaiting Verification', resolutionNotes: '' }
  });
  assert.strictEqual(noNotesRes.status, 400);

  // 6. Admin moves to Awaiting Verification WITH resolution notes -> succeeds
  const verifySubRes = await testRequest({
    method: 'PATCH',
    url: `/api/admin/issues/${issueId}/status`,
    body: {
      status: 'Awaiting Verification',
      resolutionNotes: 'Fixed fractured valve with ductile iron sleeve.'
    }
  });
  assert.strictEqual(verifySubRes.status, 200);
  assert.strictEqual(verifySubRes.data.data.status, 'Awaiting Verification');
  assert.strictEqual(verifySubRes.data.data.resolutionEvidence.resolutionNotes, 'Fixed fractured valve with ductile iron sleeve.');

  // 7. Citizen rejects without mandatory reason -> fails
  const rejectNoReason = await testRequest({
    method: 'POST',
    url: `/api/issues/${issueId}/verify`,
    body: { action: 'reject', rejectionReason: '' }
  });
  assert.strictEqual(rejectNoReason.status, 400);

  // 8. Citizen rejects WITH mandatory reason -> issue becomes Reopened!
  const rejectRes = await testRequest({
    method: 'POST',
    url: `/api/issues/${issueId}/verify`,
    body: {
      action: 'reject',
      rejectionReason: 'Valve still leaking water into the adjacent flowerbed.'
    }
  });
  assert.strictEqual(rejectRes.status, 200);
  assert.strictEqual(rejectRes.data.data.status, 'Reopened');
  assert.ok(rejectRes.data.data.priorityExplanation.includes('Reopened escalation'));

  // 9. Admin resumes work, then submits again for verification
  await testRequest({
    method: 'PATCH',
    url: `/api/admin/issues/${issueId}/status`,
    body: { status: 'In Progress' }
  });

  await testRequest({
    method: 'PATCH',
    url: `/api/admin/issues/${issueId}/status`,
    body: {
      status: 'Awaiting Verification',
      resolutionNotes: 'Replaced secondary sealing gasket and pressure tested.'
    }
  });

  // 10. Citizen approves resolution -> issue becomes Resolved!
  const approveRes = await testRequest({
    method: 'POST',
    url: `/api/issues/${issueId}/verify`,
    body: {
      action: 'approve',
      verifierName: 'Arjun Sharma',
      comment: 'Inspected water pressure, sidewalk is completely dry now.'
    }
  });
  assert.strictEqual(approveRes.status, 200);
  assert.strictEqual(approveRes.data.data.status, 'Resolved');
  assert.strictEqual(approveRes.data.data.resolutionEvidence.verifiedBy, 'Arjun Sharma');
});
