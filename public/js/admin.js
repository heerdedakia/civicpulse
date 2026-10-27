/**
 * CIVICPULSE — ADMINISTRATOR OPERATIONS MODULE
 * Manages administrative grievance triage, status changes with resolution evidence, and department assignments
 */

const adminManager = {
  activeAdminIssues: [],

  init() {
    const adminForm = document.getElementById('adminStatusForm');
    const targetStatusSelect = document.getElementById('adminTargetStatus');

    if (targetStatusSelect) {
      targetStatusSelect.addEventListener('change', (e) => {
        const evidenceBox = document.getElementById('evidenceFormGroup');
        if (evidenceBox) {
          if (e.target.value === 'Awaiting Verification') {
            evidenceBox.classList.remove('hidden');
          } else {
            evidenceBox.classList.add('hidden');
          }
        }
      });
    }

    if (adminForm) {
      adminForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.submitStatusUpdate();
      });
    }
  },

  /**
   * Refreshes the administrative issue queue table
   */
  async refreshAdminList() {
    const tbody = document.getElementById('adminTableBody');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="7" class="text-center p-4">Loading queue...</td></tr>`;

    try {
      const res = await API.get('/admin/issues');
      this.activeAdminIssues = res.data || [];

      if (this.activeAdminIssues.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center p-4 text-muted">No grievances in queue.</td></tr>`;
        return;
      }

      tbody.innerHTML = this.activeAdminIssues.map(issue => {
        const statusClass = (issue.status || 'reported').toLowerCase().replace(/\s+/g, '-');
        const tierClass = (issue.priorityTier || 'medium').toLowerCase();

        return `
          <tr>
            <td>
              <span class="priority-badge ${tierClass}">
                ${issue.priorityTier} (${issue.priorityScore})
              </span>
            </td>
            <td>
              <strong style="color:#f8fafc; cursor:pointer;" onclick="detailsManager.openDetails('${issue._id}')">
                ${issue.title}
              </strong>
              <small style="display:block; color:#94a3b8; margin-top:2px;">
                📍 ${issue.location?.address}
              </small>
            </td>
            <td><span style="font-size:0.8rem; color:#06b6d4;">${issue.category}</span></td>
            <td>
              <span style="font-size:0.8rem; color:#e2e8f0;">${issue.assignedDepartment || 'Unassigned'}</span>
              <small style="display:block; color:#64748b;">${issue.assignedOfficer || 'No officer'}</small>
            </td>
            <td>
              <span class="status-badge ${statusClass}">${issue.status}</span>
            </td>
            <td>
              ${issue.duplicateReference?.isPotentialDuplicate ? `
                <span style="color:#f59e0b; font-size:0.75rem; font-weight:700;">⚠️ ${issue.duplicateReference.similarityScore}% Match</span>
              ` : `
                <span style="color:#64748b; font-size:0.75rem;">None</span>
              `}
            </td>
            <td>
              <div style="display:flex; gap:6px;">
                <button class="btn btn-xs btn-outline" onclick="adminManager.openStatusModal('${issue._id}', '${issue.status}')">
                  Update Status
                </button>
                <button class="btn btn-xs btn-cyan" onclick="detailsManager.openDetails('${issue._id}')">
                  View
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-red p-4">Error loading admin records: ${err.message}</td></tr>`;
    }
  },

  /**
   * Opens status update modal
   */
  openStatusModal(issueId, currentStatus) {
    const idInput = document.getElementById('adminUpdateIssueId');
    const select = document.getElementById('adminTargetStatus');
    const notes = document.getElementById('adminResolutionNotes');
    const comment = document.getElementById('adminComment');
    const evidenceBox = document.getElementById('evidenceFormGroup');

    if (idInput) idInput.value = issueId;
    if (notes) notes.value = '';
    if (comment) comment.value = '';

    // Default select based on current status
    if (select) {
      if (currentStatus === 'Reported') select.value = 'Acknowledged';
      else if (currentStatus === 'Acknowledged') select.value = 'In Progress';
      else if (currentStatus === 'In Progress' || currentStatus === 'Reopened') select.value = 'Awaiting Verification';
      else select.value = 'Awaiting Verification';

      if (evidenceBox) {
        if (select.value === 'Awaiting Verification') evidenceBox.classList.remove('hidden');
        else evidenceBox.classList.add('hidden');
      }
    }

    app.openModal('adminStatusModal');
  },

  /**
   * Submits administrative status transition
   */
  async submitStatusUpdate() {
    const issueId = document.getElementById('adminUpdateIssueId')?.value;
    const targetStatus = document.getElementById('adminTargetStatus')?.value;
    const resolutionNotes = document.getElementById('adminResolutionNotes')?.value.trim();
    const comment = document.getElementById('adminComment')?.value.trim();
    const fileInput = document.getElementById('adminEvidenceFile');

    if (targetStatus === 'Awaiting Verification' && (!resolutionNotes || resolutionNotes.length < 5)) {
      app.showToast('Resolution remediation notes (at least 5 characters) are required for verification.', 'error');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('status', targetStatus);
      formData.append('resolutionNotes', resolutionNotes);
      formData.append('comment', comment);
      formData.append('adminName', app.currentUser?.name || 'Chief Engineer Priya Nair');

      if (fileInput && fileInput.files[0]) {
        formData.append('evidenceImage', fileInput.files[0]);
      }

      await API.patch(`/admin/issues/${issueId}/status`, formData, true);

      app.closeModal('adminStatusModal');
      app.showToast(`Status updated to "${targetStatus}". Evidence submitted for citizen verification!`, 'success');

      this.refreshAdminList();
      issuesManager.loadIssues();
      app.loadDashboardMetrics();
    } catch (err) {
      app.showToast(err.message, 'error');
    }
  }
};
