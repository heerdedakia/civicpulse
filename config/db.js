const mongoose = require('mongoose');

/**
 * Connect to MongoDB using Mongoose
 * Transparently handles connection retry and logs status
 */
async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/civicpulse';
  
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000 // Timeout after 5s if MongoDB daemon is not running
    });
    console.log(`[MongoDB Connected] Host: ${conn.connection.host}, DB: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[MongoDB Connection Error] ${error.message}`);
    console.warn(`[MongoDB Warning] Could not connect to MongoDB at ${uri}.`);
    console.warn(`[MongoDB Tip] Ensure MongoDB service is running (e.g. run 'mongod' or start MongoDB Windows Service).`);
    // Do not crash the entire process so that informational endpoints / help can still be served
    return null;
  }
}

module.exports = connectDB;
