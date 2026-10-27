const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');

// Predefined demo accounts
const DEMO_ACCOUNTS = {
  citizen: {
    name: 'Arjun Sharma',
    email: 'arjun.citizen@civicpulse.org',
    role: 'citizen',
    department: 'General Citizen'
  },
  admin: {
    name: 'Chief Engineer Priya Nair',
    email: 'priya.nair@municipal.gov.in',
    role: 'admin',
    department: 'Urban Infrastructure & Public Works'
  }
};

// In-memory user storage fallback for environments without an active MongoDB daemon
const inMemoryUsers = [
  {
    _id: 'user-demo-1',
    name: 'Arjun Sharma',
    email: 'arjun.citizen@civicpulse.org',
    password: User.hashPassword('citizen123'),
    role: 'citizen',
    department: 'General Citizen'
  },
  {
    _id: 'user-demo-2',
    name: 'Chief Engineer Priya Nair',
    email: 'priya.nair@municipal.gov.in',
    password: User.hashPassword('admin123'),
    role: 'admin',
    department: 'Urban Infrastructure & Public Works'
  }
];

function isMongoConnected() {
  return mongoose.connection.readyState === 1;
}

/**
 * POST /api/auth/register
 * Register a new user (supports both citizen and municipal admin roles)
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role = 'citizen', department } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Name, email, and password are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanRole = role === 'admin' ? 'admin' : 'citizen';
    const dept = department || (cleanRole === 'admin' ? 'Public Works Department' : 'General Citizen');

    if (isMongoConnected()) {
      const existing = await User.findOne({ email: cleanEmail });
      if (existing) {
        return res.status(400).json({ success: false, error: 'An account with this email already exists.' });
      }

      const hashedPassword = User.hashPassword(password);
      const user = new User({
        name: name.trim(),
        email: cleanEmail,
        password: hashedPassword,
        role: cleanRole,
        department: dept
      });

      await user.save();
      return res.status(201).json({ success: true, user: user.toSafeObject() });
    }

    // In-memory fallback
    const existing = inMemoryUsers.find(u => u.email === cleanEmail);
    if (existing) {
      return res.status(400).json({ success: false, error: 'An account with this email already exists.' });
    }

    const newUser = {
      _id: `user-${Date.now()}`,
      name: name.trim(),
      email: cleanEmail,
      password: User.hashPassword(password),
      role: cleanRole,
      department: dept
    };
    inMemoryUsers.push(newUser);

    const safeUser = { ...newUser };
    delete safeUser.password;
    res.status(201).json({ success: true, user: safeUser });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, error: 'Failed to create user account.' });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user credentials
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    if (isMongoConnected()) {
      const user = await User.findOne({ email: cleanEmail });
      if (!user || !user.verifyPassword(password)) {
        return res.status(401).json({ success: false, error: 'Invalid email or password.' });
      }
      return res.json({ success: true, user: user.toSafeObject() });
    }

    // In-memory fallback
    const user = inMemoryUsers.find(u => u.email === cleanEmail);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    // Verify password hash
    const [salt, key] = user.password.split(':');
    const crypto = require('crypto');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    const isValid = crypto.timingSafeEqual(Buffer.from(key, 'hex'), derivedKey);

    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const safeUser = { ...user };
    delete safeUser.password;
    res.json({ success: true, user: safeUser });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Failed to process login.' });
  }
});

/**
 * POST /api/auth/demo-switch
 * Instant role switcher designed specifically for live viva demonstrations
 */
router.post('/demo-switch', (req, res) => {
  const { role } = req.body;
  const targetRole = role === 'admin' ? 'admin' : 'citizen';
  const profile = DEMO_ACCOUNTS[targetRole];

  res.json({
    success: true,
    message: `Switched active session to ${targetRole.toUpperCase()} mode (${profile.name}).`,
    user: profile
  });
});

module.exports = router;
