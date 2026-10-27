const test = require('node:test');
const assert = require('node:assert');
const {
  haversineDistance,
  extractKeywords,
  calculateTextSimilarity,
  findPotentialDuplicates
} = require('../services/duplicateDetector');

test('Haversine Distance: Returns 0 for identical points', () => {
  const d = haversineDistance(12.9716, 77.5946, 12.9716, 77.5946);
  assert.strictEqual(d, 0);
});

test('Haversine Distance: Accurately calculates known ground distance', () => {
  // Distance between two points ~ 50 meters apart
  const p1 = { lat: 12.971600, lon: 77.594600 };
  const p2 = { lat: 12.971900, lon: 77.594900 };
  const d = haversineDistance(p1.lat, p1.lon, p2.lat, p2.lon);
  assert.ok(d >= 40 && d <= 60, `Expected ~45-55m, got ${d}`);
});

test('Keyword Extraction: Normalizes and filters stopwords', () => {
  const text = 'The broken streetlight at the junction is very dark and urgent!';
  const words = extractKeywords(text);
  // 'the', 'at', 'is', 'very', 'and', 'urgent' should be removed as stopwords
  assert.ok(words.has('broken'));
  assert.ok(words.has('streetlight'));
  assert.ok(words.has('junction'));
  assert.ok(words.has('dark'));
  assert.ok(!words.has('the'));
});

test('Text Similarity: Returns 1.0 for identical sentences and 0.0 for disjoint', () => {
  const simIdentical = calculateTextSimilarity('Severe road pothole damage', 'Severe road pothole damage');
  assert.strictEqual(simIdentical, 1);

  const simDisjoint = calculateTextSimilarity('Water pipeline burst flooding', 'Streetlight bulb fuse blown');
  assert.strictEqual(simDisjoint, 0);
});

test('Duplicate Detection: Flags high-similarity nearby issues in same category', () => {
  const existing = [
    {
      _id: 'issue-101',
      title: 'Hazardous deep pothole on 100ft ring road',
      description: 'Big pothole in middle lane causing bikes to swerve',
      category: 'Roads & Potholes',
      status: 'Reported',
      location: { latitude: 12.9718, longitude: 77.5948, address: '100ft Road' },
      createdAt: new Date()
    },
    {
      _id: 'issue-102',
      title: 'Garbage dump near metro',
      description: 'Rotting food waste',
      category: 'Garbage & Sanitation',
      status: 'Reported',
      location: { latitude: 12.9718, longitude: 77.5948, address: '100ft Road' },
      createdAt: new Date()
    }
  ];

  const draft = {
    title: 'Severe deep pothole on 100ft ring road',
    description: 'Deep road pothole near pillar',
    category: 'Roads & Potholes',
    location: { latitude: 12.9720, longitude: 77.5950 } // ~30 meters away
  };

  const matches = findPotentialDuplicates(draft, existing);
  assert.strictEqual(matches.length, 1);
  assert.strictEqual(matches[0].issueId, 'issue-101');
  assert.ok(matches[0].similarityScore >= 60, `Score should be >=60, got ${matches[0].similarityScore}`);
  assert.ok(matches[0].distanceMeters <= 50);
});
