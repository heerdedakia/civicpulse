const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * User Schema: supports Citizens and Municipal Administrators
 */
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/\S+@\S+\.\S+/, 'Please provide a valid email address']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6
  },
  role: {
    type: String,
    enum: ['citizen', 'admin'],
    default: 'citizen'
  },
  department: {
    type: String,
    default: 'General Administration'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

/**
 * Secure password hashing using Node.js built-in crypto module
 * Eliminates need for external native binaries like bcrypt
 */
userSchema.statics.hashPassword = function (plainPassword) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(plainPassword, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
};

/**
 * Method to verify provided password against stored hash
 */
userSchema.methods.verifyPassword = function (candidatePassword) {
  if (!this.password || !this.password.includes(':')) return false;
  const [salt, key] = this.password.split(':');
  const derivedKey = crypto.scryptSync(candidatePassword, salt, 64);
  return crypto.timingSafeEqual(Buffer.from(key, 'hex'), derivedKey);
};

/**
 * Strips password before returning user object to client
 */
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
