const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Predefined demo accounts for easy viva demonstrations
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

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role = 'citizen', department } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Name, email, and password are required.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, error: 'An account with this email already exists.' });
    }

    const hashedPassword = User.hashPassword(password);
    const user = new User({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      department: department || (role === 'admin' ? 'Public Works Department' : 'General Citizen')
    });

    await user.save();
    res.status(201).json({ success: true, user: user.toSafeObject() });
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

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.verifyPassword(password)) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    res.json({ success: true, user: user.toSafeObject() });
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
