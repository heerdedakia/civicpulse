# CivicPulse — Comprehensive CSE Viva Voce Guide

> Prepared for Undergraduate Computer Science & Engineering Final Project Viva Examination (50% Assessment Component).

---

## Part 1: Core Web Development Syllabus Breakdown

### 1. HTML5 & Semantic Elements
- **What was used**: Semantic container tags such as `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<form>`, `<input>`, and `<canvas>`.
- **Why it matters**: Semantic tags provide accessibility (screen readers), improve SEO ranking, and clearly separate page structure from styling, unlike generic nested `<div>` tags.

### 2. CSS3 & Responsive Design
- **CSS Variables (`:root`)**: Centralized design tokens for colors (`--bg-primary: #0b1120`, `--accent-cyan: #06b6d4`), spacing, and border radii. Changing one variable updates the entire application theme.
- **CSS Grid & Flexbox**:
  - `CSS Grid` (`grid-template-columns: repeat(auto-fill, minmax(340px, 1fr))`) was used for responsive 2D layouts like the Issue Cards Grid and Metrics Dashboard.
  - `Flexbox` was used for 1D alignment, navigation bars, button groups, and modal footers.
- **Media Queries (`@media (max-width: 768px)`)**: Ensures seamless reflow on smartphones and tablets by collapsing side-by-side grids into single columns and activating a mobile hamburger drawer navigation.

### 3. Vanilla JavaScript & DOM Manipulation
- **No React / Angular / Vue**: Syllabus mandates native JavaScript.
- **Key Methods Used**:
  - `document.getElementById()`, `document.querySelector()`, `document.querySelectorAll()`: Element selection.
  - `element.addEventListener('click' / 'input' / 'submit')`: Event handling.
  - `element.innerHTML = ...`: Dynamic templating for issue cards and timelines.
  - `classList.add()`, `classList.remove()`, `classList.toggle()`: Modal visibility and tab switching.
  - `event.stopPropagation()`: Prevents card click navigation when clicking the upvote button inside a card.

### 4. JSON (JavaScript Object Notation)
- Lightweight data-interchange format.
- Used across the network boundary between Express backend and the client browser:
  - `JSON.stringify(object)`: Serializes JavaScript objects into a JSON string payload.
  - `JSON.parse(string)` / `response.json()`: Deserializes JSON strings back into native JavaScript objects.

### 5. Fetch API & Asynchronous JavaScript
- Uses native modern `fetch()` with ES6 `async / await` and `try / catch` blocks.
- **Advantage over old `XMLHttpRequest`**: Native Promise support, cleaner syntax, avoids "callback hell", and provides native handling for `FormData` multipart uploads.

### 6. Node.js & Express.js
- **Node.js**: Asynchronous, single-threaded, event-driven JavaScript runtime built on Chrome's V8 engine.
- **Express.js**: Fast, unopinionated minimalist web framework for Node.js.
  - `express.json()` and `express.urlencoded()` parse request bodies.
  - `express.static('public')` serves frontend files.
  - Modular routers (`express.Router()`) partition code into `issues.js`, `admin.js`, `analytics.js`, and `auth.js`.

### 7. REST API (Representational State Transfer)
- Stateless client-server architecture communicating over HTTP methods:
  - `GET`: Safe, idempotent retrieval of complaints and analytics.
  - `POST`: Creation of complaints, checks, and endorsements.
  - `PATCH`: Partial state modification (status transition, department assignment).
  - `DELETE`: Administrative removal.
- Uses standard HTTP response status codes: `200 OK`, `201 Created`, `400 Bad Request`, `404 Not Found`, `500 Internal Server Error`.

### 8. MongoDB & Mongoose ODM
- **MongoDB**: NoSQL document database storing data as flexible, JSON-like BSON documents.
- **Mongoose**: Object Data Modeling (ODM) library providing schema enforcement, type validation, default values, pre-save hooks, and model methods.
- **Indexes**: Created composite indexes on `location.latitude` and `location.longitude` for fast spatial lookups, and on `priorityScore: -1` for sorting high-urgency complaints instantly.

### 9. Leaflet & OpenStreetMap (GIS Integration)
- **Leaflet.js**: Lightweight open-source mobile-friendly interactive mapping library (only ~42KB).
- **OpenStreetMap (OSM)**: Free, open, community-maintained geographic tile layer.
- **Implementation**:
  - `L.map()` initializes map instances.
  - `L.tileLayer()` streams map imagery tiles.
  - `L.divIcon()` creates custom HTML/SVG status-colored circular markers.
  - Drag-and-drop pin picker allows citizens to select coordinates visually.

### 10. Chart.js (Data Analytics)
- HTML5 `<canvas>`-based interactive charting engine.
- Renders responsive Doughnut Charts (Status Breakdown) and Bar Charts (Category Distribution).
- Dynamically repainted whenever complaints are resolved, verified, or updated.

---

## Part 2: Worked Examples of Core Algorithms

### Worked Example 1: Haversine Distance Calculation

**Problem**: A citizen reports a new pothole at Point B $(12.9721^\circ\text{N}, 77.5951^\circ\text{E})$. An existing report exists at Point A $(12.9718^\circ\text{N}, 77.5948^\circ\text{E})$. Calculate the ground distance.

**Step 1: Convert latitude & longitude differences to radians**
$$\Delta\text{lat} = 12.9721 - 12.9718 = 0.0003^\circ = 0.0003 \times \frac{\pi}{180} \approx 5.236 \times 10^{-6}\text{ rad}$$
$$\Delta\text{lon} = 77.5951 - 77.5948 = 0.0003^\circ = 0.0003 \times \frac{\pi}{180} \approx 5.236 \times 10^{-6}\text{ rad}$$
$$\text{lat}_1 = 12.9718 \times \frac{\pi}{180} \approx 0.22640\text{ rad}, \quad \text{lat}_2 = 12.9721 \times \frac{\pi}{180} \approx 0.22641\text{ rad}$$

**Step 2: Calculate Haversine intermediate $a$**
$$a = \sin^2\left(\frac{\Delta\text{lat}}{2}\right) + \cos(\text{lat}_1)\cos(\text{lat}_2)\sin^2\left(\frac{\Delta\text{lon}}{2}\right)$$
$$\sin\left(\frac{\Delta\text{lat}}{2}\right) \approx 2.618 \times 10^{-6} \implies \sin^2 \approx 6.85 \times 10^{-12}$$
$$\cos(0.2264) \approx 0.9745$$
$$a \approx 6.85 \times 10^{-12} + (0.9745 \times 0.9745 \times 6.85 \times 10^{-12}) \approx 1.335 \times 10^{-11}$$

**Step 3: Calculate angular distance $c$ and distance $d$**
$$c = 2 \cdot \text{atan2}(\sqrt{a}, \sqrt{1-a}) \approx 2 \cdot \sqrt{1.335 \times 10^{-11}} \approx 7.308 \times 10^{-6}\text{ rad}$$
$$d = R \cdot c = 6,371,000\text{ m} \times 7.308 \times 10^{-6} \approx \mathbf{46.5\text{ meters}}$$

**Conclusion**: The reports are only **$46.5\text{ meters}$** apart! Under our $400\text{m}$ threshold, this scores $\approx 40/45$ points for proximity!

---

### Worked Example 2: Normalized Keyword Overlap (Jaccard Index)

**Text 1 (Existing)**: *"Hazardous deep pothole on 100ft ring road near metro pillar"*  
**Text 2 (Incoming)**: *"Severe deep pothole on ring road near pillar"*

**Step 1: Extract keywords (lower, strip stopwords like 'the', 'on', 'near')**:
- $A = \{\text{hazardous}, \text{deep}, \text{pothole}, \text{100ft}, \text{ring}, \text{road}, \text{metro}, \text{pillar}\}$ ($|A| = 8$)
- $B = \{\text{severe}, \text{deep}, \text{pothole}, \text{ring}, \text{road}, \text{pillar}\}$ ($|B| = 6$)

**Step 2: Find Intersection and Union**:
- $A \cap B = \{\text{deep}, \text{pothole}, \text{ring}, \text{road}, \text{pillar}\}$ $\implies |A \cap B| = 5$
- $A \cup B = \{\text{hazardous}, \text{deep}, \text{pothole}, \text{100ft}, \text{ring}, \text{road}, \text{metro}, \text{pillar}, \text{severe}\}$ $\implies |A \cup B| = 9$

**Step 3: Calculate Jaccard Similarity**:
$$J(A, B) = \frac{5}{9} \approx \mathbf{0.555\text{ (55.5\% text overlap)}}$$

**Step 4: Composite Duplicate Score**:
- Distance factor: $40 / 45$ points
- Text similarity factor: $0.555 \times 40 = 22.2 / 40$ points
- Same category (`Roads & Potholes`): $15 / 15$ points
- **Total Match Score**: $40 + 22.2 + 15 = \mathbf{77.2\% \ge 50\%}$ $\implies$ **Duplicate Alert Modal Triggered!**

---

### Worked Example 3: Deterministic Priority Scoring Formula

**Scenario**: A water leakage complaint filed 6 days ago.
- User Severity: `High`
- Category: `Water & Leakage`
- Endorsements (Upvotes): 4 citizens clicked "I have this issue too"
- Status: `Reopened` (citizen rejected preliminary repair)

**Calculation**:
1. Base Severity Points (`High`): **$+50$ pts**
2. Category Hazard Weight (`Water & Leakage`): **$+10$ pts**
3. Community Endorsements: $4 \times 5 = 20$, capped at: **$+15$ pts**
4. Unresolved Age: $6\text{ days} \times 2 = 12$, capped at 15: **$+12$ pts**
5. Reopened Penalty (Citizen rejected previous patch): **$+10$ pts**

$$\text{Total Priority Score} = 50 + 10 + 15 + 12 + 10 = \mathbf{97 / 100}$$
**Priority Tier**: **`Urgent`** (Score $\ge 85$). This issue bubbles up directly to the top of the administrative queue!

---

## Part 3: High-Yield Viva Questions & Answers

### Q1: Why did you not use React, Angular, or Vue?
> **Answer**: Our university curriculum explicitly requires demonstrating proficiency in core JavaScript, DOM manipulation, and native browser APIs. Modern frameworks hide these fundamental mechanics beneath abstractions like JSX and Virtual DOM. Using pure Vanilla JS showcases our direct understanding of event bubbling, DOM queries, and state rendering without build-tool dependencies.

### Q2: What is the main differentiator of CivicPulse compared to existing grievance portals?
> **Answer**: Evidence-Based Resolution. In standard municipal portals, an administrator can arbitrarily close a ticket by clicking "Resolved". In CivicPulse, the state machine strictly prohibits direct resolution. The administrator must provide resolution notes and photographic proof, moving the status to `Awaiting Verification`. Only the citizen reporter can verify and approve the resolution or reject and reopen the issue with a mandatory reason.

### Q3: How do you prevent invalid status transitions on the server?
> **Answer**: We implemented a server-side state machine in `services/statusStateMachine.js`. Allowed transitions are defined in a directed graph lookup table. For instance, `Reported -> Resolved` is rejected with HTTP 400. Furthermore, transitional business rules (e.g., requiring resolution notes for `Awaiting Verification` and a rejection reason for `Reopened`) are enforced before updating database records.

### Q4: Why use the Haversine formula instead of simple Pythagorean distance?
> **Answer**: The Earth is an oblate spheroid, not a flat 2D plane. Pythagorean distance ($\sqrt{\Delta x^2 + \Delta y^2}$) causes massive distortion over spherical surfaces and does not account for longitude convergence at non-equatorial latitudes. The Haversine formula calculates the great-circle distance on a sphere using spherical trigonometry, providing accuracy within meters.

### Q5: What is the Jaccard Similarity coefficient and why is it preferred here over machine learning?
> **Answer**: Jaccard similarity is the size of the intersection of token sets divided by the size of the union ($|A \cap B| / |A \cup B|$). It is deterministic, lightweight, fast, requires no training dataset or GPU overhead, and is completely explainable to an auditor or citizen without black-box ambiguity.

### Q6: How does the application handle offline database conditions during demonstration?
> **Answer**: CivicPulse features an `IssueRepository` design pattern. If MongoDB is active, it runs full Mongoose ODM queries with database indexes. If MongoDB is offline or inaccessible, it gracefully switches to an in-memory replica pre-populated with realistic demonstration issues, ensuring zero crashes or downtime during viva evaluation.

### Q7: How are uploaded photos handled securely?
> **Answer**: We use `multer` configured with:
> 1. Strict MIME-type filtering allowing only `image/jpeg`, `image/png`, and `image/webp`.
> 2. A hard file size ceiling of 5MB.
> 3. Randomized cryptographic file names (`Date.now() + crypto.randomBytes`) preventing directory traversal, file overwrites, and arbitrary script execution.

### Q8: What indexes did you create in MongoDB and why?
> **Answer**: We created geospatial indexes on `location.latitude` and `location.longitude` for fast spatial coordinate queries, a compound index on `category` and `status` for rapid filtered browsing, and a descending index on `priorityScore: -1` so the highest urgency issues are retrieved instantly in $O(\log N)$ time.
