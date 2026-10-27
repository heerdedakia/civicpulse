# CivicPulse — Community Issue Intelligence

> **Undergraduate Computer Science & Engineering Capstone Project**  
> An evidence-based civic grievance resolution platform featuring duplicate complaint detection, dynamic priority scoring, and recurring hotspot analytics.

---

## 1. Problem Statement

In conventional municipal grievance management portals, citizen complaints often face two chronic systemic failures:
1. **False Resolutions Without Accountability**: Grievances are frequently marked "Resolved" simply because a government official clicked a status button, without physical verification or citizen confirmation.
2. **Resource Fragmentation & Blind Spots**: Hundreds of citizens report identical local defects (such as the same pothole or burst pipe), flooding municipal dispatch queues with duplicate tickets while chronic recurrence hotspots go unnoticed.

---

## 2. Project Objectives

- **Citizen-Centric Evidence Verification**: Mandate that an issue cannot transition to "Resolved" merely through administrative action. An administrator must submit photographic and written resolution proof, transitioning the issue to `Awaiting Verification`, leaving final approval or reopening in the hands of the citizen.
- **Explainable Duplicate Complaint Detection**: Prevent complaint fragmentation by cross-referencing incoming reports against active local complaints using geospatial distance (Haversine formula), category matching, and normalized keyword overlap (Jaccard Index).
- **Transparent Multi-Factor Priority Scoring**: Calculate deterministic priority scores (0–100) based on severity, hazard weight, community endorsements (upvotes), age of grievance, and previous rejection history.
- **Geospatial Hotspot Intelligence**: Spatially cluster complaints (350m radius) sharing categories to detect chronic municipal infrastructure failures and calculate department resolution metrics.
- **Strict Adherence to Curriculum**: Built using Vanilla HTML5, CSS3, native JavaScript DOM manipulation, Node.js, Express.js, MongoDB/Mongoose, Leaflet/OSM, and Chart.js, avoiding heavy frontend frameworks to demonstrate core web engineering principles.

---

## 3. System Architecture

```
                       +---------------------------------------+
                       |   CivicPulse Web Client (Browser)     |
                       |  HTML5 / CSS3 / Vanilla JS / DOM API  |
                       +-------------------+-------------------+
                                           |
                              HTTP / REST JSON & Fetch API
                                           |
                       +-------------------v-------------------+
                       |      Node.js & Express.js Server      |
                       |  - Central Router & Error Handlers    |
                       |  - Multer File Upload Filter          |
                       +-------------------+-------------------+
                                           |
          +--------------------------------+--------------------------------+
          |                                |                                |
+---------v----------+           +---------v----------+           +---------v----------+
| Duplicate Detector |           | Priority Engine    |           | Hotspot Clustering |
| - Haversine (dist) |           | - Severity Weight  |           | - Spatial Centroid |
| - Jaccard Overlap  |           | - Age & Upvotes    |           | - Recurrence Count |
+--------------------+           +--------------------+           +--------------------+
          |                                |                                |
          +--------------------------------+--------------------------------+
                                           |
                               Mongoose ODM Models
                                           |
                       +-------------------v-------------------+
                       |      MongoDB Database Engine          |
                       |  - Issues Collection & Indexes        |
                       |  - Immutable Status History Array     |
                       |  - Resolution Evidence Subdocuments   |
                       |  - Users Collection (Citizen & Admin) |
                       +---------------------------------------+
```

---

## 4. Technology Stack

| Layer | Technologies Used | Purpose |
|---|---|---|
| **Frontend UI** | HTML5, CSS3 (Modern Charcoal & Teal Design) | Responsive semantic structure and accessible styling |
| **Frontend Logic** | Vanilla JavaScript (ES6+), DOM API | Dynamic UI updates, modal management, form handling |
| **Maps & GIS** | Leaflet.js, OpenStreetMap Tiles | Interactive map pins, location picker, geospatial visualization |
| **Visual Analytics** | Chart.js | Status doughnut charts and category bar distribution |
| **Backend Runtime** | Node.js (v18+) | Non-blocking asynchronous JavaScript server environment |
| **Web Framework** | Express.js | REST API routing, static asset serving, middleware |
| **Database & ODM** | MongoDB, Mongoose ODM | Document storage, geospatial/composite indexes, schemas |
| **File Uploads** | Multer | Strict MIME type and 5MB size validation for photo evidence |
| **Testing** | Node.js Native Test Runner (`node:test`, `node:assert`) | Zero-dependency unit and API integration test suite |
| **Environment** | `dotenv` | Secure environment variable configuration |

---

## 5. Core Business Logic & Algorithms

### A. Duplicate Complaint Detection

When a citizen drafts a complaint, the algorithm evaluates existing active complaints in the same or nearby radius (up to 400 meters):

1. **Geographic Proximity (Haversine Formula)**:
   $$\Delta\text{lat} = \text{lat}_2 - \text{lat}_1, \quad \Delta\text{lon} = \text{lon}_2 - \text{lon}_1$$
   $$a = \sin^2\left(\frac{\Delta\text{lat}}{2}\right) + \cos(\text{lat}_1)\cos(\text{lat}_2)\sin^2\left(\frac{\Delta\text{lon}}{2}\right)$$
   $$c = 2 \cdot \text{atan2}\left(\sqrt{a}, \sqrt{1-a}\right), \quad d = R \cdot c \quad (R = 6,371,000\text{ m})$$
   Distance score contributes up to **45 points**.

2. **Text Keyword Similarity (Jaccard Index)**:
   Normalized tokenization: strips punctuation, eliminates common English stopwords, extracts keywords $\ge 3$ characters:
   $$J(A, B) = \frac{|A \cap B|}{|A \cup B|}$$
   Text similarity contributes up to **40 points**.

3. **Category Match**:
   Exact category match awards **15 points**.

**Duplicate Alert Threshold**: If composite match score $\ge 50\%$, CivicPulse halts automatic submission and displays the matching complaint, allowing the user to view the existing ticket, endorse it (+upvote), or submit anyway.

---

### B. Transparent Priority & Risk Scoring

Calculates a deterministic score from $0$ to $100$:

$$\text{Priority Score} = \min\Big(100, \text{Base Severity} + \text{Category Weight} + \text{Community Factor} + \text{Age Factor} + \text{Reopen Penalty}\Big)$$

- **Base Severity**: Low = $+15$, Medium = $+30$, High = $+50$, Critical = $+70$.
- **Category Hazard Weight**: Drainage & Sewage = $+12$, Water & Leakage = $+10$, Roads & Potholes = $+10$, Street Lighting = $+8$, Public Infrastructure = $+6$, Garbage & Sanitation = $+5$.
- **Community Factor**: $+5$ points per endorsement / upvote (capped at $+15$).
- **Age Factor**: $+2$ points per 24 hours elapsed while unresolved (capped at $+15$).
- **Reopened Escalation Penalty**: $+10$ points if the citizen rejected a previous administrative resolution.

**Tiers**:
- $0 - 39$: **Low**
- $40 - 64$: **Medium**
- $65 - 84$: **High**
- $85 - 100$: **Urgent**

---

### C. Evidence-Based Resolution Workflow (Main Differentiator)

```
[ Citizen: Reported ]
         │
         ▼
[ Admin: Acknowledged ]
         │
         ▼
[ Admin: In Progress ]
         │
         ▼ (Admin submits resolution notes & photo proof)
[ Awaiting Verification ] ◀──────────────────────┐
         │                                       │
         ├───────────────────────┐               │
         ▼ (Citizen Approves)    ▼ (Citizen Rejects + Reason)
   [ Resolved ]            [ Reopened ] ─────────┘
```

1. An administrator **CANNOT** jump directly from `In Progress` or `Reported` to `Resolved`. Server-side middleware returns `HTTP 400` with an explicit violation error.
2. The administrator must submit remediation notes and optional photo proof, transitioning the status to `Awaiting Verification`.
3. The citizen reporter inspects the before and after photos.
4. If satisfied, the citizen clicks **"Verify & Approve Resolution"** $\rightarrow$ `Resolved`.
5. If unsatisfied, the citizen clicks **"Reject & Reopen"**, enters a mandatory rejection reason $\rightarrow$ `Reopened` with automatic priority score escalation.

---

### D. Recurring-Hotspot Detection

Groups active and historical complaints using:
- **Spatial Radius**: Euclidean/Haversine clustering within $\le 350\text{ meters}$.
- **Category Match**: Exact category grouping.
- **Minimum Threshold**: $\ge 2$ complaints.

Computes cluster centroid, repeat incident counts, active unresolved complaints, and average resolution time in days.

---

## 6. Database Schemas (MongoDB / Mongoose)

### `Issue` Schema
- `title`: String (5–120 chars, trimmed, required)
- `description`: String (10–2000 chars, trimmed, required)
- `category`: Enum (`['Roads & Potholes', 'Garbage & Sanitation', 'Street Lighting', 'Water & Leakage', 'Public Infrastructure', 'Drainage & Sewage']`)
- `location`:
  - `address`: String (required)
  - `latitude`: Number (-90 to +90, required)
  - `longitude`: Number (-180 to +180, required)
- `severity`: Enum (`['Low', 'Medium', 'High', 'Critical']`, default: `'Medium'`)
- `status`: Enum (`['Reported', 'Acknowledged', 'In Progress', 'Awaiting Verification', 'Resolved', 'Reopened']`, default: `'Reported'`)
- `priorityScore`: Number (0–100, indexed)
- `priorityTier`: Enum (`['Low', 'Medium', 'High', 'Urgent']`)
- `priorityExplanation`: String (transparent breakdown)
- `imageUrl`: String (before photo)
- `upvotes`: Number (default: 0)
- `resolutionEvidence`:
  - `submittedBy`: String
  - `submittedAt`: Date
  - `resolutionNotes`: String
  - `evidenceImageUrl`: String (after photo)
  - `verifiedBy`: String
  - `verifiedAt`: Date
  - `verificationComment`: String
  - `rejectionReason`: String
  - `reopenedAt`: Date
- `statusHistory`: Array of `{ fromStatus, toStatus, changedBy, userRole, timestamp, comment, evidenceAttached }`
- `duplicateReference`: `{ isPotentialDuplicate, matchedIssueId, similarityScore, matchReason }`
- `isDemo`: Boolean

---

## 7. REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check endpoint returning uptime and DB status |
| `GET` | `/api/issues` | Retrieve grievances with category, status, severity, and search filters |
| `POST` | `/api/issues` | Create new grievance (accepts multipart image upload) |
| `GET` | `/api/issues/:id` | Fetch single issue details with full audit history |
| `POST` | `/api/issues/check-duplicate` | Pre-submission duplicate check returning matches and similarity score |
| `POST` | `/api/issues/:id/upvote` | Citizen endorsement incrementing upvotes and updating priority |
| `POST` | `/api/issues/:id/verify` | Citizen resolution verification (`approve` or `reject` with reason) |
| `GET` | `/api/issues/:id/history` | Retrieve full immutable status history timeline |
| `GET` | `/api/admin/issues` | Administrative complaint queue sorted by priority score |
| `PATCH` | `/api/admin/issues/:id/status` | Update issue status (submits resolution evidence & notes) |
| `PATCH` | `/api/admin/issues/:id/assign` | Assign department, officer, and internal notes |
| `DELETE`| `/api/admin/issues/:id` | Administrative deletion |
| `GET` | `/api/analytics` | High-level summary metrics, category distribution, and status breakdown |
| `GET` | `/api/hotspots` | Detected recurring infrastructure failure clusters |
| `POST` | `/api/auth/demo-switch` | Instant role switcher between Citizen and Admin mode for live viva |
| `POST` | `/api/seed/reset` | Reset and re-seed realistic demonstration dataset |

---

## 8. Installation & Setup Instructions

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- [MongoDB](https://www.mongodb.com/try/download/community) (Local daemon or MongoDB Atlas URI)

### Quick Start
```bash
# 1. Navigate to the project directory
cd civicpulse

# 2. Install dependencies
npm install

# 3. Configure environment variables
# Copy .env.example to .env (already pre-configured for local development)
cp .env.example .env

# 4. Seed the database with realistic demo issues
npm run seed

# 5. Run the automated test suite (19 test cases)
npm test

# 6. Start the server
npm start
```

Access the application in your browser at: **`http://localhost:3000`**

---

## 9. Git & Team Collaboration Guide

For a 4-person engineering team:

```bash
# Branch allocation:
# - main: Production-ready codebase
# - feature/frontend: HTML5, CSS3, DOM controllers
# - feature/api-database: Express routes, Mongoose models, upload handlers
# - feature/duplicate-priority: Haversine distance, Jaccard overlap, scoring
# - feature/map-analytics: Leaflet integration, Chart.js analytics, hotspots

# Step 1: Create and switch to your feature branch
git checkout -b feature/duplicate-priority

# Step 2: Stage and commit your changes
git add services/duplicateDetector.js tests/duplicateDetector.test.js
git commit -m "feat: implement Haversine distance and Jaccard keyword overlap"

# Step 3: Push branch to remote GitHub repository
git push origin feature/duplicate-priority

# Step 4: Open Pull Request (PR) on GitHub against 'main' branch
# Step 5: Peer code review and merge via Pull Request
```

---

## 10. Limitations & Future Scope

1. **Automated Computer Vision Verification**: Currently, citizen reporters verify remediation photos manually. Future iterations could integrate computer-vision image comparison models to detect road patch quality automatically.
2. **Push Notifications**: Integrate Web Push API or SMS gateways to alert reporters when an issue is moved to `Awaiting Verification`.
3. **Multi-lingual Support**: Add regional language support for wider accessibility among non-English speaking citizens.
