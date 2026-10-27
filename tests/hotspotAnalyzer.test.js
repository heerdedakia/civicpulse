const test = require('node:test');
const assert = require('node:assert');
const { detectHotspots } = require('../services/hotspotAnalyzer');

test('Hotspot Analyzer: Clusters proximate issues in the same category', () => {
  const issues = [
    {
      _id: 'i1',
      title: 'Water pipe leak 1',
      category: 'Water & Leakage',
      status: 'In Progress',
      severity: 'High',
      location: { latitude: 12.9810, longitude: 77.5960, address: '5th Main Road' },
      createdAt: new Date()
    },
    {
      _id: 'i2',
      title: 'Water pipe leak 2',
      category: 'Water & Leakage',
      status: 'Reported',
      severity: 'Medium',
      location: { latitude: 12.9813, longitude: 77.5962, address: '5th Main Road corner' }, // ~40m away
      createdAt: new Date()
    },
    {
      _id: 'i3',
      title: 'Garbage dump on street',
      category: 'Garbage & Sanitation',
      status: 'Reported',
      severity: 'Low',
      location: { latitude: 12.9811, longitude: 77.5961, address: '5th Main Road' }, // close coords but DIFFERENT category
      createdAt: new Date()
    }
  ];

  const hotspots = detectHotspots(issues, { radiusMeters: 300, minComplaints: 2 });
  assert.strictEqual(hotspots.length, 1);
  assert.strictEqual(hotspots[0].category, 'Water & Leakage');
  assert.strictEqual(hotspots[0].totalReports, 2);
  assert.strictEqual(hotspots[0].repeatIncidents, 1);
});

test('Hotspot Analyzer: Disregards isolated issues that do not meet min threshold', () => {
  const isolatedIssues = [
    {
      _id: 'i1',
      title: 'Pothole on West road',
      category: 'Roads & Potholes',
      status: 'Reported',
      location: { latitude: 12.9100, longitude: 77.5100, address: 'West Road' },
      createdAt: new Date()
    },
    {
      _id: 'i2',
      title: 'Pothole on East highway',
      category: 'Roads & Potholes',
      status: 'Reported',
      location: { latitude: 12.9900, longitude: 77.6900, address: 'East Highway' }, // >10km away
      createdAt: new Date()
    }
  ];

  const hotspots = detectHotspots(isolatedIssues, { radiusMeters: 350, minComplaints: 2 });
  assert.strictEqual(hotspots.length, 0);
});
