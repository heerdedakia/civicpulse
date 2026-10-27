const mongoose = require('mongoose');
const Issue = require('../models/Issue');
const User = require('../models/User');
const { calculatePriority } = require('../services/priorityCalculator');
const { findPotentialDuplicates } = require('../services/duplicateDetector');

// Sample coordinates centered around Central Ward Municipal Area (lat: 12.9716, lon: 77.5946)
const SAMPLE_ISSUES = [
  {
    title: 'Hazardous Pothole on 100ft Ring Road',
    description: 'Deep circular pothole approximately 2 feet wide right in the middle lane. Two two-wheelers skidded during evening hours.',
    category: 'Roads & Potholes',
    location: {
      address: '100ft Ring Road, Near Metro Pillar 142, Central Ward',
      latitude: 12.9718,
      longitude: 77.5948
    },
    severity: 'High',
    status: 'In Progress',
    imageUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80',
    reporter: {
      name: 'Rohan Mehra',
      email: 'rohan.m@gmail.com'
    },
    assignedDepartment: 'Roads & Highways Department',
    assignedOfficer: 'Asst. Engineer Kumar',
    adminNotes: 'Inspection team dispatched. Asphalt patch crew scheduled for overnight road repair.',
    upvotes: 4,
    isDemo: true,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    statusHistory: [
      {
        fromStatus: 'None',
        toStatus: 'Reported',
        changedBy: 'Rohan Mehra',
        userRole: 'citizen',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        comment: 'Initial issue complaint registered in CivicPulse.',
        evidenceAttached: true
      },
      {
        fromStatus: 'Reported',
        toStatus: 'Acknowledged',
        changedBy: 'Chief Engineer Priya Nair',
        userRole: 'admin',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        comment: 'Complaint reviewed and forwarded to Ward 4 road maintenance squad.',
        evidenceAttached: false
      },
      {
        fromStatus: 'Acknowledged',
        toStatus: 'In Progress',
        changedBy: 'Chief Engineer Priya Nair',
        userRole: 'admin',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        comment: 'Field crew assigned. Material procurement approved.',
        evidenceAttached: false
      }
    ]
  },
  {
    title: 'Severe Deep Pothole Near Metro Pillar 144',
    description: 'Big pothole on the ring road close to pillar 144. Water filled inside, vehicles braking abruptly.',
    category: 'Roads & Potholes',
    location: {
      address: '100ft Ring Road, Near Pillar 144, Central Ward',
      latitude: 12.9721,
      longitude: 77.5951
    },
    severity: 'High',
    status: 'Reported',
    imageUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80',
    reporter: {
      name: 'Sneha Patel',
      email: 'sneha.patel@outlook.com'
    },
    assignedDepartment: 'Roads & Highways Department',
    assignedOfficer: 'Unassigned',
    adminNotes: '',
    upvotes: 2,
    isDemo: true,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    statusHistory: [
      {
        fromStatus: 'None',
        toStatus: 'Reported',
        changedBy: 'Sneha Patel',
        userRole: 'citizen',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        comment: 'Complaint registered. Flagged as potential duplicate of Metro Pillar 142 report.',
        evidenceAttached: true
      }
    ]
  },
  {
    title: 'Commercial Garbage Accumulation near Market Gate 3',
    description: 'Rotting vegetable waste and single-use plastic dumped openly on the curb. Stray animals scattering rubbish into the main lane.',
    category: 'Garbage & Sanitation',
    location: {
      address: 'Main Market Road, Gate 3, South Ward',
      latitude: 12.9685,
      longitude: 77.5912
    },
    severity: 'Medium',
    status: 'Reported',
    imageUrl: 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=600&q=80',
    reporter: {
      name: 'Vikas Gupta',
      email: 'vikas.g@yahoo.com'
    },
    assignedDepartment: 'Sanitation & Solid Waste Dept',
    assignedOfficer: 'Unassigned',
    adminNotes: '',
    upvotes: 3,
    isDemo: true,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    statusHistory: [
      {
        fromStatus: 'None',
        toStatus: 'Reported',
        changedBy: 'Vikas Gupta',
        userRole: 'citizen',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        comment: 'Initial issue complaint registered in CivicPulse.',
        evidenceAttached: true
      }
    ]
  },
  {
    title: 'Broken Streetlight Poles causing Dark Zone at 12th Cross',
    description: 'Three consecutive streetlight bulbs are blown out since last weekend. Road is pitch dark after 7:30 PM, posing serious safety hazard for pedestrians.',
    category: 'Street Lighting',
    location: {
      address: '12th Cross, 4th Block, West Ward',
      latitude: 12.9752,
      longitude: 77.5880
    },
    severity: 'Medium',
    status: 'Acknowledged',
    imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80',
    reporter: {
      name: 'Sunita Rao',
      email: 'sunita.rao@gmail.com'
    },
    assignedDepartment: 'Electricity Board',
    assignedOfficer: 'Inspector Ramesh',
    adminNotes: 'Work order #EB-409 created for LED replacement.',
    upvotes: 5,
    isDemo: true,
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    statusHistory: [
      {
        fromStatus: 'None',
        toStatus: 'Reported',
        changedBy: 'Sunita Rao',
        userRole: 'citizen',
        timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        comment: 'Initial issue complaint registered in CivicPulse.',
        evidenceAttached: true
      },
      {
        fromStatus: 'Reported',
        toStatus: 'Acknowledged',
        changedBy: 'Chief Engineer Priya Nair',
        userRole: 'admin',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        comment: 'Forwarded to Municipal Electrical Wing.',
        evidenceAttached: false
      }
    ]
  },
  {
    title: 'Underground Main Pipeline Burst & Water Gushing',
    description: 'Major drinking water supply line burst under asphalt. Clean water flooding 200 meters of residential road with noticeable drop in household pressure.',
    category: 'Water & Leakage',
    location: {
      address: '5th Main Road, Near Water Tank, North Ward',
      latitude: 12.9810,
      longitude: 77.5960
    },
    severity: 'Critical',
    status: 'In Progress',
    imageUrl: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=600&q=80',
    reporter: {
      name: 'Deepak Verma',
      email: 'deepak.v@gmail.com'
    },
    assignedDepartment: 'Water Supply & Sewerage Board',
    assignedOfficer: 'Superintendent Rajesh',
    adminNotes: 'Emergency shut-off valve activated. Excavator on site to expose fractured pipe section.',
    upvotes: 9,
    isDemo: true,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    statusHistory: [
      {
        fromStatus: 'None',
        toStatus: 'Reported',
        changedBy: 'Deepak Verma',
        userRole: 'citizen',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        comment: 'Emergency pipeline rupture reported.',
        evidenceAttached: true
      },
      {
        fromStatus: 'Reported',
        toStatus: 'In Progress',
        changedBy: 'Chief Engineer Priya Nair',
        userRole: 'admin',
        timestamp: new Date(Date.now() - 20 * 60 * 60 * 1000),
        comment: 'Emergency response team dispatched.',
        evidenceAttached: false
      }
    ]
  },
  {
    title: 'Recurring Water Leakage at 5th Main & 3rd Cross',
    description: 'Second water seepage incident this month along the same underground distribution duct. Soil is becoming waterlogged.',
    category: 'Water & Leakage',
    location: {
      address: '5th Main Road, Corner of 3rd Cross, North Ward',
      latitude: 12.9815,
      longitude: 77.5964
    },
    severity: 'High',
    status: 'In Progress',
    imageUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=600&q=80',
    reporter: {
      name: 'Kavita Menon',
      email: 'kavita.m@gmail.com'
    },
    assignedDepartment: 'Water Supply & Sewerage Board',
    assignedOfficer: 'Superintendent Rajesh',
    adminNotes: 'Joint failure detected on 4-inch valve flange.',
    upvotes: 6,
    isDemo: true,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    statusHistory: [
      {
        fromStatus: 'None',
        toStatus: 'Reported',
        changedBy: 'Kavita Menon',
        userRole: 'citizen',
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        comment: 'Issue reported.',
        evidenceAttached: true
      },
      {
        fromStatus: 'Reported',
        toStatus: 'In Progress',
        changedBy: 'Chief Engineer Priya Nair',
        userRole: 'admin',
        timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        comment: 'Assigned to water board crew.',
        evidenceAttached: false
      }
    ]
  },
  {
    title: 'Severe Storm Drain Blockage & Foul Water Overflow',
    description: 'Stormwater conduit clogged with plastic debris and silt. Drain overflowed onto walkway during yesterday evening showers.',
    category: 'Drainage & Sewage',
    location: {
      address: '8th Avenue, Near City Hospital, Central Ward',
      latitude: 12.9735,
      longitude: 77.5925
    },
    severity: 'High',
    status: 'Awaiting Verification',
    imageUrl: 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=600&q=80',
    reporter: {
      name: 'Dr. Anand Joshi',
      email: 'anand.joshi@hospital.org'
    },
    assignedDepartment: 'Water Supply & Sewerage Board',
    assignedOfficer: 'Officer Santosh',
    adminNotes: 'Suction jetting tanker deployed to clear blockage.',
    upvotes: 7,
    isDemo: true,
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    resolutionEvidence: {
      submittedBy: 'Chief Engineer Priya Nair',
      submittedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
      resolutionNotes: 'Conduit dredged using high-power suction jetting unit. Over 1.5 tons of plastic and silt removed. Heavy-duty cast iron grating fitted to prevent future blockages.',
      evidenceImageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80'
    },
    statusHistory: [
      {
        fromStatus: 'None',
        toStatus: 'Reported',
        changedBy: 'Dr. Anand Joshi',
        userRole: 'citizen',
        timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        comment: 'Complaint logged.',
        evidenceAttached: true
      },
      {
        fromStatus: 'Reported',
        toStatus: 'In Progress',
        changedBy: 'Chief Engineer Priya Nair',
        userRole: 'admin',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        comment: 'Sanitation squad dispatched.',
        evidenceAttached: false
      },
      {
        fromStatus: 'In Progress',
        toStatus: 'Awaiting Verification',
        changedBy: 'Chief Engineer Priya Nair',
        userRole: 'admin',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
        comment: 'Dredging completed and photo evidence uploaded. Awaiting citizen confirmation.',
        evidenceAttached: true
      }
    ]
  },
  {
    title: 'Broken Walkway Slabs and Exposed Telecom Trench',
    description: 'Utility trench dug up on footpath and left open with broken granite slabs. Trip hazard for senior citizens.',
    category: 'Public Infrastructure',
    location: {
      address: 'Gandhi Boulevard, Opposite Public Library, Central Ward',
      latitude: 12.9705,
      longitude: 77.5930
    },
    severity: 'Medium',
    status: 'Reopened',
    imageUrl: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=600&q=80',
    reporter: {
      name: 'Arjun Sharma',
      email: 'arjun.citizen@civicpulse.org'
    },
    assignedDepartment: 'Public Works Department',
    assignedOfficer: 'Engineer Manjunath',
    adminNotes: 'Contractor warned. Must re-lay proper pavers immediately.',
    upvotes: 8,
    isDemo: true,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    resolutionEvidence: {
      submittedBy: 'Chief Engineer Priya Nair',
      submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      resolutionNotes: 'Contractor filled trench and swept the sidewalk.',
      evidenceImageUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=600&q=80',
      reopenedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      rejectionReason: 'Contractor only dumped loose gravel over the trench without cement pavers. Wires are still popping out, and the gravel is scattering onto the road.'
    },
    statusHistory: [
      {
        fromStatus: 'None',
        toStatus: 'Reported',
        changedBy: 'Arjun Sharma',
        userRole: 'citizen',
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        comment: 'Initial complaint filed.',
        evidenceAttached: true
      },
      {
        fromStatus: 'Reported',
        toStatus: 'In Progress',
        changedBy: 'Chief Engineer Priya Nair',
        userRole: 'admin',
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        comment: 'Work assigned to civil maintenance crew.',
        evidenceAttached: false
      },
      {
        fromStatus: 'In Progress',
        toStatus: 'Awaiting Verification',
        changedBy: 'Chief Engineer Priya Nair',
        userRole: 'admin',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        comment: 'Trench filled. Submitted for reporter sign-off.',
        evidenceAttached: true
      },
      {
        fromStatus: 'Awaiting Verification',
        toStatus: 'Reopened',
        changedBy: 'Arjun Sharma',
        userRole: 'citizen',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        comment: 'Citizen rejected resolution: "Contractor only dumped loose gravel over the trench without cement pavers. Wires are still popping out, and the gravel is scattering onto the road." Issue reopened for corrective work.',
        evidenceAttached: false
      }
    ]
  },
  {
    title: 'Manhole Cover Replaced & Road Restored',
    description: 'Damaged storm drain manhole frame caused severe thumps when bus wheels ran over it.',
    category: 'Drainage & Sewage',
    location: {
      address: 'Station Approach Road, Central Ward',
      latitude: 12.9698,
      longitude: 77.5975
    },
    severity: 'Medium',
    status: 'Resolved',
    imageUrl: 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=600&q=80',
    reporter: {
      name: 'Kiran Rao',
      email: 'kiran.r@gmail.com'
    },
    assignedDepartment: 'Roads & Highways Department',
    assignedOfficer: 'Asst. Engineer Kumar',
    adminNotes: 'Work completed and verified.',
    upvotes: 3,
    isDemo: true,
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    resolutionEvidence: {
      submittedBy: 'Chief Engineer Priya Nair',
      submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      resolutionNotes: 'Old cracked manhole frame excavated. Reinforced ductile iron cover installed flush with road grade.',
      evidenceImageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
      verifiedBy: 'Kiran Rao',
      verifiedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      verificationComment: 'Inspected on my morning walk. The cover is flush and completely smooth now. Thank you!'
    },
    statusHistory: [
      {
        fromStatus: 'None',
        toStatus: 'Reported',
        changedBy: 'Kiran Rao',
        userRole: 'citizen',
        timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        comment: 'Reported.',
        evidenceAttached: true
      },
      {
        fromStatus: 'Reported',
        toStatus: 'In Progress',
        changedBy: 'Chief Engineer Priya Nair',
        userRole: 'admin',
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        comment: 'Work underway.',
        evidenceAttached: false
      },
      {
        fromStatus: 'In Progress',
        toStatus: 'Awaiting Verification',
        changedBy: 'Chief Engineer Priya Nair',
        userRole: 'admin',
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        comment: 'Ductile iron cover installed. Evidence submitted.',
        evidenceAttached: true
      },
      {
        fromStatus: 'Awaiting Verification',
        toStatus: 'Resolved',
        changedBy: 'Kiran Rao',
        userRole: 'citizen',
        timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        comment: 'Resolution approved by reporter. Issue closed.',
        evidenceAttached: false
      }
    ]
  }
];

/**
 * Seed database with demo users and realistic complaints
 */
async function seedDatabase() {
  console.log('[Seeder] Starting CivicPulse database population...');

  // 1. Create or update demo users
  const demoUsers = [
    {
      name: 'Arjun Sharma',
      email: 'arjun.citizen@civicpulse.org',
      password: User.hashPassword('citizen123'),
      role: 'citizen',
      department: 'General Citizen'
    },
    {
      name: 'Chief Engineer Priya Nair',
      email: 'priya.nair@municipal.gov.in',
      password: User.hashPassword('admin123'),
      role: 'admin',
      department: 'Urban Infrastructure & Public Works'
    }
  ];

  for (const u of demoUsers) {
    await User.findOneAndUpdate({ email: u.email }, u, { upsert: true, new: true });
  }
  console.log('[Seeder] Demo accounts verified (citizen & admin).');

  // 2. Clear existing demo issues
  const deleteResult = await Issue.deleteMany({ isDemo: true });
  console.log(`[Seeder] Removed ${deleteResult.deletedCount} existing demo issues.`);

  // 3. Populate sample issues with calculated priority scores
  for (const item of SAMPLE_ISSUES) {
    const priority = calculatePriority(item);
    item.priorityScore = priority.score;
    item.priorityTier = priority.tier;
    item.priorityExplanation = priority.explanation;

    const issueDoc = new Issue(item);
    await issueDoc.save();
  }

  console.log(`[Seeder] Successfully seeded ${SAMPLE_ISSUES.length} realistic demonstration issues!`);
}

// Support direct CLI invocation: node seeds/seedData.js
if (require.main === module) {
  require('dotenv').config();
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/civicpulse';

  mongoose.connect(uri)
    .then(async () => {
      await seedDatabase();
      await mongoose.disconnect();
      console.log('[Seeder] Finished. Database connection closed.');
      process.exit(0);
    })
    .catch(err => {
      console.error('[Seeder Failed]', err);
      process.exit(1);
    });
}

module.exports = { seedDatabase, SAMPLE_ISSUES };
