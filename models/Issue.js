const mongoose = require('mongoose');

/**
 * Status History Sub-schema
 * Records an immutable audit trail of every status transition
 */
const statusHistorySchema = new mongoose.Schema({
  fromStatus: {
    type: String,
    required: true
  },
  toStatus: {
    type: String,
    required: true
  },
  changedBy: {
    type: String,
    default: 'System'
  },
  userRole: {
    type: String,
    enum: ['citizen', 'admin', 'system'],
    default: 'citizen'
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  comment: {
    type: String,
    default: ''
  },
  evidenceAttached: {
    type: Boolean,
    default: false
  }
}, { _id: true });

/**
 * Resolution Evidence Sub-schema
 * Core differentiator: records resolution proof and citizen verification
 */
const resolutionEvidenceSchema = new mongoose.Schema({
  submittedBy: { type: String, default: '' },
  submittedAt: { type: Date, default: null },
  resolutionNotes: { type: String, default: '' },
  evidenceImageUrl: { type: String, default: null },
  verifiedBy: { type: String, default: '' },
  verifiedAt: { type: Date, default: null },
  verificationComment: { type: String, default: '' },
  rejectionReason: { type: String, default: '' },
  reopenedAt: { type: Date, default: null }
}, { _id: false });

/**
 * Main Issue Schema
 */
const issueSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Issue title is required'],
    trim: true,
    minlength: 5,
    maxlength: 120
  },
  description: {
    type: String,
    required: [true, 'Issue description is required'],
    trim: true,
    minlength: 10,
    maxlength: 2000
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'Roads & Potholes',
      'Garbage & Sanitation',
      'Street Lighting',
      'Water & Leakage',
      'Public Infrastructure',
      'Drainage & Sewage'
    ]
  },
  location: {
    address: {
      type: String,
      required: [true, 'Location address is required'],
      trim: true
    },
    latitude: {
      type: Number,
      required: [true, 'Latitude is required'],
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      required: [true, 'Longitude is required'],
      min: -180,
      max: 180
    }
  },
  severity: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  status: {
    type: String,
    enum: [
      'Reported',
      'Acknowledged',
      'In Progress',
      'Awaiting Verification',
      'Resolved',
      'Reopened'
    ],
    default: 'Reported'
  },
  priorityScore: {
    type: Number,
    default: 30,
    min: 0,
    max: 100
  },
  priorityTier: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Urgent'],
    default: 'Medium'
  },
  priorityExplanation: {
    type: String,
    default: 'Default baseline priority score.'
  },
  imageUrl: {
    type: String,
    default: null
  },
  reporter: {
    name: { type: String, default: 'Concerned Citizen' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    userId: { type: String, default: null }
  },
  assignedDepartment: {
    type: String,
    default: 'Unassigned'
  },
  assignedOfficer: {
    type: String,
    default: 'Unassigned'
  },
  adminNotes: {
    type: String,
    default: ''
  },
  resolutionEvidence: {
    type: resolutionEvidenceSchema,
    default: () => ({})
  },
  statusHistory: [statusHistorySchema],
  duplicateReference: {
    isPotentialDuplicate: { type: Boolean, default: false },
    matchedIssueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue', default: null },
    similarityScore: { type: Number, default: 0 },
    matchReason: { type: String, default: '' }
  },
  upvotes: {
    type: Number,
    default: 0
  },
  isDemo: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for fast geospatial queries, category filtering, and status checks
issueSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });
issueSchema.index({ category: 1, status: 1 });
issueSchema.index({ priorityScore: -1 });

module.exports = mongoose.model('Issue', issueSchema);
