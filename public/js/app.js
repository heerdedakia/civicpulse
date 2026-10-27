/**
 * CIVICPULSE — CORE APPLICATION CONTROLLER
 * Single-Page Application router, session coordinator, authentication and metrics manager
 */

const app = {
  activeTab: 'dashboard',
  currentUser: {
    name: 'Arjun Sharma',
    email: 'arjun.citizen@civicpulse.org',
    role: 'citizen',
    department: 'General Citizen'
  },

  /**
   * Application bootstrap
   */
  async init() {
    console.log('[CivicPulse] Initializing client application...');

    // Load persisted session if exists
    try {
      const stored = localStorage.getItem('civicpulse_current_user');
      if (stored) {
        this.currentUser = JSON.parse(stored);
      }
    } catch (e) {}

    // Initialize sub-modules
    this.setupNavigation();
    this.setupRoleControls();
    this.setupAuthHandlers();
    this.setupMobileMenu();
    this.updateRoleUI();

    if (typeof issuesManager !== 'undefined') issuesManager.init();
    if (typeof reportManager !== 'undefined') reportManager.init();
    if (typeof detailsManager !== 'undefined') detailsManager.init();
    if (typeof adminManager !== 'undefined') adminManager.init();

    // Load initial data
    await this.loadDashboardMetrics();
    await issuesManager.loadIssues();

    console.log('[CivicPulse] Client ready.');
  },

  /**
   * Navigation tabs routing
   */
  setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const targetTab = item.getAttribute('data-tab');
        if (targetTab) {
          this.navigateTo(targetTab);
        }
      });
    });
  },

  /**
   * Switches active viewport tab
   */
  navigateTo(tabId) {
    this.activeTab = tabId;

    // Update nav buttons
    document.querySelectorAll('.nav-item').forEach(item => {
      if (item.getAttribute('data-tab') === tabId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Update tab panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.remove('active');
    });

    const targetPane = document.getElementById(`pane-${tabId}`);
    if (targetPane) {
      targetPane.classList.add('active');
    }

    // Tab-specific lifecycle actions
    if (tabId === 'map-view') {
      setTimeout(() => MapManager.initMainMap(), 150);
      MapManager.renderMarkers(issuesManager.currentIssues);
    } else if (tabId === 'report') {
      setTimeout(() => MapManager.initPickerMap(), 150);
    } else if (tabId === 'hotspots') {
      this.loadDashboardMetrics();
    } else if (tabId === 'admin') {
      adminManager.refreshAdminList();
    }

    // Close mobile menu if open
    const navMenu = document.getElementById('navMenu');
    if (navMenu) navMenu.classList.remove('open');
  },

  /**
   * Role Switcher & Demonstration Controls
   */
  setupRoleControls() {
    const roleToggleBtn = document.getElementById('roleToggleBtn');
    const resetDemoBtn = document.getElementById('resetDemoDataBtn');

    if (roleToggleBtn) {
      roleToggleBtn.addEventListener('click', async () => {
        const nextRole = this.currentUser.role === 'citizen' ? 'admin' : 'citizen';
        try {
          const res = await API.post('/auth/demo-switch', { role: nextRole });
          this.currentUser = res.user;
          this.persistUser(this.currentUser);
          this.updateRoleUI();
          this.showToast(`Switched to ${this.currentUser.role.toUpperCase()} mode (${this.currentUser.name})`, 'info');
        } catch (err) {
          this.showToast('Could not switch role: ' + err.message, 'error');
        }
      });
    }

    if (resetDemoBtn) {
      resetDemoBtn.addEventListener('click', async () => {
        if (!confirm('Reset database to clean initial demonstration dataset?')) return;
        try {
          this.showToast('Resetting and seeding demo records...', 'info');
          const res = await API.post('/seed/reset');
          this.showToast(res.message, 'success');
          await this.loadDashboardMetrics();
          await issuesManager.loadIssues();
          if (this.activeTab === 'admin') adminManager.refreshAdminList();
        } catch (err) {
          this.showToast('Reset error: ' + err.message, 'error');
        }
      });
    }
  },

  /**
   * Authentication & Account Handlers
   */
  setupAuthHandlers() {
    const authOpenBtn = document.getElementById('authOpenBtn');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (authOpenBtn) {
      authOpenBtn.addEventListener('click', () => {
        this.openModal('authModal');
      });
    }

    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail')?.value.trim();
        const password = document.getElementById('loginPassword')?.value;

        try {
          const res = await API.post('/auth/login', { email, password });
          this.currentUser = res.user;
          this.persistUser(this.currentUser);
          this.closeModal('authModal');
          this.updateRoleUI();
          this.showToast(`Welcome back, ${this.currentUser.name}! (${this.currentUser.role.toUpperCase()})`, 'success');

          if (this.currentUser.role === 'admin') {
            this.navigateTo('admin');
          }
        } catch (err) {
          this.showToast(err.message, 'error');
        }
      });
    }

    if (registerForm) {
      registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('regName')?.value.trim();
        const email = document.getElementById('regEmail')?.value.trim();
        const password = document.getElementById('regPassword')?.value;
        const role = document.getElementById('regRole')?.value;
        const department = document.getElementById('regDept')?.value;

        try {
          const res = await API.post('/auth/register', { name, email, password, role, department });
          this.currentUser = res.user;
          this.persistUser(this.currentUser);
          this.closeModal('authModal');
          this.updateRoleUI();
          this.showToast(`Account created! Logged in as ${this.currentUser.name} (${this.currentUser.role.toUpperCase()})`, 'success');

          if (this.currentUser.role === 'admin') {
            this.navigateTo('admin');
          }
        } catch (err) {
          this.showToast(err.message, 'error');
        }
      });
    }
  },

  switchAuthTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const tabLoginBtn = document.getElementById('tabLoginBtn');
    const tabRegisterBtn = document.getElementById('tabRegisterBtn');
    const title = document.getElementById('authModalTitle');

    if (tab === 'login') {
      loginForm.classList.remove('hidden');
      registerForm.classList.add('hidden');
      tabLoginBtn.classList.add('active');
      tabRegisterBtn.classList.remove('active');
      if (title) title.textContent = 'Sign In to CivicPulse';
    } else {
      loginForm.classList.add('hidden');
      registerForm.classList.remove('hidden');
      tabLoginBtn.classList.remove('active');
      tabRegisterBtn.classList.add('active');
      if (title) title.textContent = 'Create a New Account';
    }
  },

  quickFillLogin(email, password) {
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    if (emailInput) emailInput.value = email;
    if (passwordInput) passwordInput.value = password;
    this.showToast('Demo credentials filled. Click "Sign In"!', 'info');
  },

  handleRegRoleChange(role) {
    const deptGroup = document.getElementById('regDeptGroup');
    if (deptGroup) {
      deptGroup.style.display = role === 'admin' ? 'flex' : 'none';
    }
  },

  persistUser(user) {
    try {
      localStorage.setItem('civicpulse_current_user', JSON.stringify(user));
    } catch (e) {}
  },

  /**
   * Synchronizes user interface with active session role
   */
  updateRoleUI() {
    const roleLabel = document.getElementById('roleLabel');
    const userNameLabel = document.getElementById('userNameLabel');
    const roleIndicator = document.querySelector('.role-indicator');
    const roleToggleBtn = document.getElementById('roleToggleBtn');
    const adminNavTab = document.getElementById('navAdminTab');
    const authBtnText = document.getElementById('authBtnText');

    if (this.currentUser.role === 'admin') {
      if (roleLabel) roleLabel.textContent = 'Admin';
      if (userNameLabel) userNameLabel.textContent = this.currentUser.name;
      if (roleIndicator) {
        roleIndicator.className = 'role-indicator admin';
      }
      if (roleToggleBtn) roleToggleBtn.textContent = 'Switch to Citizen';
      if (adminNavTab) adminNavTab.style.display = 'flex';
    } else {
      if (roleLabel) roleLabel.textContent = 'Citizen';
      if (userNameLabel) userNameLabel.textContent = this.currentUser.name;
      if (roleIndicator) {
        roleIndicator.className = 'role-indicator citizen';
      }
      if (roleToggleBtn) roleToggleBtn.textContent = 'Switch to Admin';
      if (adminNavTab) adminNavTab.style.display = 'none';

      if (this.activeTab === 'admin') {
        this.navigateTo('dashboard');
      }
    }

    if (authBtnText) {
      authBtnText.textContent = `Account (${this.currentUser.role})`;
    }
  },

  /**
   * Mobile menu toggle
   */
  setupMobileMenu() {
    const btn = document.getElementById('mobileMenuBtn');
    const menu = document.getElementById('navMenu');
    if (btn && menu) {
      btn.addEventListener('click', () => {
        menu.classList.toggle('open');
      });
    }
  },

  /**
   * Loads high-level statistics & recurring hotspots
   */
  async loadDashboardMetrics() {
    try {
      const res = await API.get('/analytics');
      const data = res.data;
      const summary = data.summary;

      // Update counters
      const statTotal = document.getElementById('statTotalIssues');
      const statActive = document.getElementById('statActiveIssues');
      const statAwaiting = document.getElementById('statAwaitingVerification');
      const statResolved = document.getElementById('statResolvedIssues');
      const statReopened = document.getElementById('statReopenedIssues');
      const statHotspots = document.getElementById('statHotspotCount');

      if (statTotal) statTotal.textContent = summary.totalComplaints;
      if (statActive) statActive.textContent = summary.activeComplaints;
      if (statAwaiting) statAwaiting.textContent = summary.awaitingVerification;
      if (statResolved) statResolved.textContent = summary.verifiedResolutions;
      if (statReopened) statReopened.textContent = summary.reopenedComplaints;
      if (statHotspots) statHotspots.textContent = summary.hotspotsCount;

      // Render Charts
      if (typeof ChartsManager !== 'undefined') {
        ChartsManager.renderCharts(data);
      }

      // Render Hotspots list
      this.renderHotspots(data.hotspots);

      // Render priority queue on overview
      if (typeof issuesManager !== 'undefined') {
        issuesManager.renderPriorityQueue(issuesManager.currentIssues);
      }
    } catch (err) {
      console.warn('Could not load dashboard metrics:', err);
    }
  },

  /**
   * Renders detected recurring hotspots
   */
  renderHotspots(hotspots) {
    const container = document.getElementById('hotspotsContainer');
    if (!container) return;

    if (!hotspots || hotspots.length === 0) {
      container.innerHTML = `
        <div class="loading-state">
          <p>No recurring failure hotspots detected. Complaints are spatially dispersed.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = hotspots.map(h => {
      const isCritical = h.riskLevel === 'Critical';

      return `
        <div class="hotspot-card ${isCritical ? 'critical' : ''}">
          <div class="hotspot-header">
            <div>
              <span style="font-size:0.75rem; color:#06b6d4; font-weight:700; text-transform:uppercase;">${h.category}</span>
              <h3 class="hotspot-location">📍 ${h.primaryAddress}</h3>
            </div>
            <span class="hotspot-badge ${isCritical ? 'critical' : 'high'}">${h.riskLevel} Hotspot</span>
          </div>

          <div class="hotspot-stats">
            <div class="stat-item">
              <span>Total Reports</span>
              <span>${h.totalReports} Incidents</span>
            </div>
            <div class="stat-item">
              <span>Repeat Recurrence</span>
              <span>${h.repeatIncidents} repeats</span>
            </div>
            <div class="stat-item">
              <span>Unresolved Now</span>
              <span style="color:${h.unresolvedCount > 0 ? '#ef4444' : '#10b981'};">${h.unresolvedCount} Active</span>
            </div>
            <div class="stat-item">
              <span>Avg Resolution</span>
              <span>${h.avgResolutionDays ? `${h.avgResolutionDays} days` : 'Pending'}</span>
            </div>
          </div>

          <p style="font-size:0.75rem; color:#94a3b8;">
            Clustered centroid: (${h.coordinates.latitude}, ${h.coordinates.longitude}) • Radius: 350m
          </p>
        </div>
      `;
    }).join('');
  },

  /**
   * Modal Management
   */
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('hidden');
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hidden');
  },

  /**
   * Toast Notifications
   */
  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
      success: '✓',
      error: '✗',
      warning: '⚠',
      info: 'ℹ'
    };

    toast.innerHTML = `
      <span style="font-weight:700; font-size:1rem;">${icons[type] || 'ℹ'}</span>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
};

// Auto-run bootstrap when DOM loads
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
