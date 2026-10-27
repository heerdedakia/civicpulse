require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('./config/db');

// Import route modules
const issuesRouter = require('./routes/issues');
const adminRouter = require('./routes/admin');
const analyticsRouter = require('./routes/analytics');
const authRouter = require('./routes/auth');
const { seedDatabase } = require('./seeds/seedData');
const Issue = require('./models/Issue');

const app = express();
const PORT = process.env.PORT || 3000;

// HTTP middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static assets from public directory
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Health Check API
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    status: 'online',
    appName: 'CivicPulse — Community Issue Intelligence',
    version: '1.0.0',
    database: dbStatus,
    uptime: Math.round(process.uptime()) + ' seconds',
    timestamp: new Date().toISOString()
  });
});

// REST API Routers
app.use('/api/issues', issuesRouter);
app.use('/api/admin', adminRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/auth', authRouter);

const IssueRepository = require('./services/issueRepository');

// Convenient endpoint to re-seed demo data from UI
app.post('/api/seed/reset', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      await seedDatabase();
    } else {
      IssueRepository.resetInMemory();
    }
    res.json({ success: true, message: 'Demonstration records reset and re-seeded successfully.' });
  } catch (error) {
    console.error('Error re-seeding:', error);
    res.status(500).json({ success: false, error: 'Failed to reset seed data.' });
  }
});

// Fallback to index.html for Single-Page Application client routing
app.use((req, res, next) => {
  // If request is for an API route that was not found, return 404 JSON
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, error: 'API route not found' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global Centralized Error Handler
app.use((err, req, res, next) => {
  console.error('[CivicPulse Error Handler]', err);
  if (err.name === 'MulterError') {
    return res.status(400).json({ success: false, error: `Upload error: ${err.message}` });
  }
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'An unexpected server error occurred.'
  });
});

// Start Express Server
async function startServer() {
  await connectDB();

  // If MongoDB is connected and issue collection is empty, automatically seed initial demo data
  try {
    if (mongoose.connection.readyState === 1) {
      const count = await Issue.countDocuments();
      if (count === 0) {
        console.log('[Auto-Seed] Initial database is empty. Seeding realistic demo records...');
        await seedDatabase();
      }
    }
  } catch (seedErr) {
    console.warn('[Auto-Seed Note]', seedErr.message);
  }

  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`  CIVICPULSE — Community Issue Intelligence`);
    console.log(`  Server listening on: http://localhost:${PORT}`);
    console.log(`  API Health check:   http://localhost:${PORT}/api/health`);
    console.log(`=======================================================`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
