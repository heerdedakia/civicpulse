const test = require('node:test');
const assert = require('node:assert');
const { app } = require('../server');

/**
 * In-memory test helper that dispatches requests through Express pipeline
 * without requiring TCP loopback sockets (which are sandboxed on Windows)
 */
function testRequest(options) {
  return new Promise((resolve) => {
    const { EventEmitter } = require('events');
    const req = new EventEmitter();
    req.method = options.method || 'GET';
    req.url = options.url || '/';
    req.headers = options.headers || {};
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

test('API Integration: Health endpoint returns system status', async () => {
  const res = await testRequest({ method: 'GET', url: '/api/health' });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.appName, 'CivicPulse — Community Issue Intelligence');
  assert.strictEqual(res.data.status, 'online');
});

test('API Integration: Duplicate check without coordinates returns empty matches safely', async () => {
  const res = await testRequest({
    method: 'POST',
    url: '/api/issues/check-duplicate',
    body: { title: 'Pothole check', description: 'Testing without coords' }
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.hasDuplicates, false);
  assert.deepStrictEqual(res.data.matches, []);
});

test('API Integration: Role switcher successfully switches to Admin and Citizen', async () => {
  const adminSwitch = await testRequest({
    method: 'POST',
    url: '/api/auth/demo-switch',
    body: { role: 'admin' }
  });
  assert.strictEqual(adminSwitch.status, 200);
  assert.strictEqual(adminSwitch.data.user.role, 'admin');
  assert.strictEqual(adminSwitch.data.user.name, 'Chief Engineer Priya Nair');

  const citizenSwitch = await testRequest({
    method: 'POST',
    url: '/api/auth/demo-switch',
    body: { role: 'citizen' }
  });
  assert.strictEqual(citizenSwitch.status, 200);
  assert.strictEqual(citizenSwitch.data.user.role, 'citizen');
  assert.strictEqual(citizenSwitch.data.user.name, 'Arjun Sharma');
});
