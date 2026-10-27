const mongoose = require('mongoose');

/**
 * Connect to MongoDB using Mongoose
 * Transparently handles connection retry and logs status
 */
async function connectDB() {
  // If running on Vercel without a remote MongoDB Atlas URI, use in-memory store
  if (process.env.VERCEL && (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes('127.0.0.1') || process.env.MONGODB_URI.includes('localhost'))) {
    console.log('[MongoDB Vercel Note] No remote cloud MongoDB URI provided. Running with in-memory persistence.');
    return null;
  }

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/civicpulse';
  
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2000 // Quick timeout so serverless doesn't hang
    });
    console.log(`[MongoDB Connected] Host: ${conn.connection.host}, DB: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.warn(`[MongoDB Warning] Could not connect to MongoDB at ${uri}. Running in-memory mode.`);
    return null;
  }
}

module.exports = connectDB;
