/**
 * CIVICPULSE — ISSUES BROWSER MODULE
 * Handles searching, category/status filtering, sorting, upvoting, and dynamic card rendering
 */

const issuesManager = {
  currentIssues: [],

  // Category fallback images for complaints submitted without custom photos
  fallbackImages: {
    'Roads & Potholes': 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80',
    'Garbage & Sanitation': 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=600&q=80',
    'Street Lighting': 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80',
    'Water & Leakage': 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=600&q=80',
    'Drainage & Sewage': 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=600&q=80',
    'Public Infrastructure': 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=600&q=80'
  },

  /**
   * Initializes event listeners for search and filters
   */
  init() {
    const searchInput = document.getElementById('searchInput');
    const filterCategory = document.getElementById('filterCategory');
    const filterStatus = document.getElementById('filterStatus');
    const filterSeverity = document.getElementById('filterSeverity');
    const sortOrder = document.getElementById('sortOrder');

    if (searchInput) {
      let debounceTimeout;
      searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => this.loadIssues(), 300);
      });
    }

    [filterCategory, filterStatus, filterSeverity, sortOrder].forEach(el => {
      if (el) {
        el.addEventListener('change', () => this.loadIssues());
      }
    });
  },

  /**
   * Fetches issues matching current filter state and renders them
   */
  async loadIssues() {
    const container = document.getElementById('issuesGrid');
    if (!container) return;

    try {
      const category = document.getElementById('filterCategory')?.value || 'All';
      const status = document.getElementById('filterStatus')?.value || 'All';
      const severity = document.getElementById('filterSeverity')?.value || 'All';
      const sort = document.getElementById('sortOrder')?.value || 'priority';
      const search = document.getElementById('searchInput')?.value || '';

      const res = await API.get('/issues', { category, status, severity, sort, search });
      this.currentIssues = res.data || [];
      this.renderIssues(this.currentIssues, container);

      // Also refresh markers on the full map
      if (typeof MapManager !== 'undefined') {
        MapManager.renderMarkers(this.currentIssues);
      }
    } catch (err) {
      container.innerHTML = `
        <div class="loading-state">
          <p class="text-red">Failed to load grievances: ${err.message}</p>
        </div>
      `;
    }
  },

  /**
   * Quick filter by status from external triggers (e.g. Dashboard banner)
   */
  filterByStatus(status) {
    const filterStatus = document.getElementById('filterStatus');
    if (filterStatus) {
      filterStatus.value = status;
      app.navigateTo('issues');
      this.loadIssues();
    }
  },

  /**
   * Renders issues into the specified container
   */
  renderIssues(issues, container) {
    if (!issues || issues.length === 0) {
      container.innerHTML = `
        <div class="loading-state">
          <p>No complaints found matching current filters.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = issues.map(issue => {
      const imageSrc = issue.imageUrl || this.fallbackImages[issue.category] || this.fallbackImages['Public Infrastructure'];
      const statusClass = (issue.status || 'reported').toLowerCase().replace(/\s+/g, '-');
      const tierClass = (issue.priorityTier || 'medium').toLowerCase();

      return `
        <div class="issue-card" onclick="detailsManager.openDetails('${issue._id}')">
          <div class="card-image-wrap">
            <img src="${imageSrc}" alt="${issue.title}" loading="lazy">
            <div class="card-badges">
              <span class="status-badge ${statusClass}">${issue.status}</span>
              <span class="priority-badge ${tierClass}" title="${issue.priorityExplanation || ''}">
                ${issue.priorityTier} • ${issue.priorityScore}
              </span>
            </div>
          </div>

          <div class="card-body">
            <span class="card-category">${issue.category}</span>
            <h3 class="card-title">${issue.title}</h3>
            <p class="card-desc">${issue.description}</p>

            ${issue.duplicateReference?.isPotentialDuplicate ? `
              <div style="font-size:0.7rem; color:#f59e0b; margin-bottom:8px; display:flex; align-items:center; gap:4px;">
                <span>⚠️ ${issue.duplicateReference.matchReason || 'Potential duplicate'}</span>
              </div>
            ` : ''}

            <div class="card-meta">
              <span class="card-location" title="${issue.location?.address}">
                📍 ${issue.location?.address || 'Municipal Ward'}
              </span>
              <div class="card-actions" onclick="event.stopPropagation()">
                <button class="upvote-btn" onclick="issuesManager.upvoteIssue('${issue._id}')" title="Endorse this grievance">
                  ▲ <span>${issue.upvotes || 0}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  /**
   * Upvote / Citizen Endorsement
   */
  async upvoteIssue(issueId) {
    try {
      const res = await API.post(`/issues/${issueId}/upvote`);
      app.showToast(`Endorsement recorded! Priority updated (+${res.priorityScore} pts)`, 'success');
      this.loadIssues();
      app.loadDashboardMetrics();
    } catch (err) {
      app.showToast(err.message, 'error');
    }
  },

  /**
   * Renders the top priority issues onto the overview dashboard
   */
  renderPriorityQueue(issues) {
    const container = document.getElementById('dashboardPriorityIssues');
    if (!container) return;

    const topIssues = (issues || [])
      .filter(i => i.status !== 'Resolved')
      .slice(0, 4);

    if (topIssues.length === 0) {
      container.innerHTML = `<p class="text-secondary p-3">No active unresolved issues. Municipal ward is clear!</p>`;
      return;
    }

    container.innerHTML = topIssues.map(issue => {
      const statusClass = (issue.status || 'reported').toLowerCase().replace(/\s+/g, '-');
      const tierClass = (issue.priorityTier || 'medium').toLowerCase();

      return `
        <div class="arch-item" style="cursor:pointer;" onclick="detailsManager.openDetails('${issue._id}')">
          <span class="priority-badge ${tierClass}" style="align-self:flex-start;">
            ${issue.priorityScore}
          </span>
          <div style="flex:1;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <strong style="font-size:0.95rem;">${issue.title}</strong>
              <span class="status-badge ${statusClass}" style="font-size:0.65rem;">${issue.status}</span>
            </div>
            <p style="font-size:0.8rem; color:#94a3b8; margin-top:3px;">
              📍 ${issue.location?.address || 'Central Ward'} • <span>${issue.category}</span>
            </p>
          </div>
        </div>
      `;
    }).join('');
  }
};
