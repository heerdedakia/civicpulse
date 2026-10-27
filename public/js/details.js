/**
 * CIVICPULSE — ISSUE DETAILS & EVIDENCE RESOLUTION MODULE
 * Renders full status history timeline, before/after evidence photos, and citizen verification controls
 */

const detailsManager = {
  activeIssueId: null,

  init() {
    const reopenForm = document.getElementById('reopenDisputeForm');
    if (reopenForm) {
      reopenForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.submitRejection();
      });
    }
  },

  /**
   * Loads issue details and opens modal
   */
  async openDetails(issueId) {
    this.activeIssueId = issueId;
    const modal = document.getElementById('issueDetailsModal');
    const body = document.getElementById('modalIssueBody');
    const title = document.getElementById('modalIssueTitle');
    const tag = document.getElementById('modalCategoryTag');

    if (!modal || !body) return;

    body.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <span>Retrieving audit trail...</span>
      </div>
    `;
    app.openModal('issueDetailsModal');

    try {
      const res = await API.get(`/issues/${issueId}`);
      const issue = res.data;

      title.textContent = issue.title;
      tag.textContent = `${issue.category} • Ward Location`;

      const statusClass = (issue.status || 'reported').toLowerCase().replace(/\s+/g, '-');
      const tierClass = (issue.priorityTier || 'medium').toLowerCase();

      // Before & After image handling
      const beforeImg = issue.imageUrl || issuesManager.fallbackImages[issue.category] || issuesManager.fallbackImages['Public Infrastructure'];
      const afterImg = issue.resolutionEvidence?.evidenceImageUrl;

      body.innerHTML = `
        <!-- Status & Priority Banner -->
        <div style="display:flex; justify-content:space-between; align-items:center; background-color:#0f172a; padding:12px 16px; border-radius:8px; margin-bottom:16px;">
          <div>
            <span style="font-size:0.75rem; color:#94a3b8; display:block;">Current Status</span>
            <span class="status-badge ${statusClass}" style="display:inline-block; margin-top:4px;">${issue.status}</span>
          </div>
          <div style="text-align:right;">
            <span style="font-size:0.75rem; color:#94a3b8; display:block;">Calculated Priority</span>
            <span class="priority-badge ${tierClass}" style="display:inline-block; margin-top:4px;">
              ${issue.priorityTier} (${issue.priorityScore}/100)
            </span>
          </div>
        </div>

        <!-- Priority Breakdown Formula Box -->
        <div style="background-color:rgba(14, 165, 233, 0.08); border:1px solid rgba(14, 165, 233, 0.25); border-radius:8px; padding:12px; margin-bottom:16px; font-size:0.8rem;">
          <strong style="color:#38bdf8; display:block; margin-bottom:4px;">Transparent Priority Formula:</strong>
          <span style="color:#cbd5e1;">${issue.priorityExplanation || 'Calculated via deterministic multi-factor civic algorithm.'}</span>
        </div>

        <!-- Complaint Info Grid -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; font-size:0.85rem; margin-bottom:16px;">
          <div>
            <span style="color:#94a3b8; font-size:0.75rem; display:block;">Location</span>
            <strong style="color:#f8fafc;">📍 ${issue.location?.address}</strong>
            <small style="color:#64748b; display:block;">(${issue.location?.latitude}, ${issue.location?.longitude})</small>
          </div>
          <div>
            <span style="color:#94a3b8; font-size:0.75rem; display:block;">Department In-Charge</span>
            <strong style="color:#f8fafc;">🏢 ${issue.assignedDepartment || 'Unassigned'}</strong>
            <small style="color:#64748b; display:block;">Officer: ${issue.assignedOfficer || 'Not assigned'}</small>
          </div>
        </div>

        <!-- Issue Description -->
        <div style="margin-bottom:16px;">
          <span style="color:#94a3b8; font-size:0.75rem; display:block; margin-bottom:4px;">Citizen Problem Description</span>
          <p style="font-size:0.875rem; color:#e2e8f0; line-height:1.5; background-color:#0f172a; padding:12px; border-radius:8px;">
            ${issue.description}
          </p>
        </div>

        <!-- Evidence-Based Resolution Comparison (Before & After Photos) -->
        <div class="evidence-comparison">
          <div class="evidence-photo-box">
            <span>📷 Reported Problem (Before)</span>
            <img src="${beforeImg}" alt="Before repair photo">
          </div>
          <div class="evidence-photo-box">
            <span>🛠️ Resolution Evidence (After)</span>
            ${afterImg ? `
              <img src="${afterImg}" alt="After resolution evidence photo">
            ` : `
              <div style="height:160px; background-color:#0f172a; border:1px dashed #334155; border-radius:6px; display:flex; align-items:center; justify-content:center; color:#64748b; font-size:0.8rem; text-align:center; padding:12px;">
                No resolution evidence photo submitted yet.
              </div>
            `}
          </div>
        </div>

        <!-- Resolution Notes if submitted -->
        ${issue.resolutionEvidence?.resolutionNotes ? `
          <div style="background-color:rgba(6, 182, 212, 0.1); border:1px solid rgba(6, 182, 212, 0.3); border-radius:8px; padding:12px; margin-bottom:16px;">
            <strong style="color:#06b6d4; font-size:0.85rem; display:block; margin-bottom:4px;">Municipal Remediation Work Conducted:</strong>
            <p style="font-size:0.85rem; color:#f1f5f9;">${issue.resolutionEvidence.resolutionNotes}</p>
            <small style="color:#94a3b8; display:block; margin-top:6px;">Submitted by: ${issue.resolutionEvidence.submittedBy || 'Municipal Engineer'} on ${new Date(issue.resolutionEvidence.submittedAt).toLocaleDateString()}</small>
          </div>
        ` : ''}

        <!-- Reopened Rejection Note if existing -->
        ${issue.resolutionEvidence?.rejectionReason ? `
          <div style="background-color:rgba(239, 68, 68, 0.1); border:1px solid rgba(239, 68, 68, 0.3); border-radius:8px; padding:12px; margin-bottom:16px;">
            <strong style="color:#ef4444; font-size:0.85rem; display:block; margin-bottom:4px;">Previous Fix Rejected by Citizen:</strong>
            <p style="font-size:0.85rem; color:#fecaca;">"${issue.resolutionEvidence.rejectionReason}"</p>
          </div>
        ` : ''}

        <!-- CITIZEN VERIFICATION ACTION PANEL (Core Differentiator) -->
        ${issue.status === 'Awaiting Verification' ? `
          <div style="background:linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(14, 165, 233, 0.1)); border:2px solid #06b6d4; border-radius:10px; padding:16px; margin:20px 0;">
            <h4 style="color:#06b6d4; font-size:1rem; margin-bottom:6px;">Citizen Verification Required</h4>
            <p style="font-size:0.85rem; color:#cbd5e1; margin-bottom:12px;">
              The administration claims this issue has been resolved. Please review the submitted notes and photo above. As a citizen, you decide whether to approve this fix or reject and reopen the complaint.
            </p>
            <div style="display:flex; gap:12px; flex-wrap:wrap;">
              <button class="btn btn-success" onclick="detailsManager.approveResolution('${issue._id}')">
                ✓ Verify & Approve Resolution
              </button>
              <button class="btn btn-danger" onclick="detailsManager.promptRejection('${issue._id}')">
                ✗ Reject & Reopen Complaint
              </button>
            </div>
          </div>
        ` : ''}

        <!-- Status History Audit Timeline -->
        <div style="margin-top:24px;">
          <h4 style="font-size:0.95rem; font-weight:700; color:#fff; margin-bottom:12px;">
            Immutable Status History Audit Log (${issue.statusHistory?.length || 0} transitions)
          </h4>
          <div class="timeline-list">
            ${(issue.statusHistory || []).map(item => `
              <div class="timeline-item">
                <div class="timeline-title">${item.fromStatus} → <span style="color:#06b6d4;">${item.toStatus}</span></div>
                <div class="timeline-meta">
                  By <strong>${item.changedBy}</strong> (${item.userRole}) • ${new Date(item.timestamp).toLocaleString()}
                  ${item.evidenceAttached ? ' • 📎 Evidence Attached' : ''}
                </div>
                ${item.comment ? `<div class="timeline-comment">${item.comment}</div>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } catch (err) {
      body.innerHTML = `<p class="text-red">Error fetching issue: ${err.message}</p>`;
    }
  },

  /**
   * Citizen verifies and approves resolution
   */
  async approveResolution(issueId) {
    if (!confirm('Are you satisfied that this issue is genuinely resolved?')) return;

    try {
      const res = await API.post(`/issues/${issueId}/verify`, {
        action: 'approve',
        verifierName: app.currentUser?.name || 'Citizen Reporter',
        comment: 'Citizen inspected the site and verified the resolution.'
      });

      app.showToast('Resolution approved! Issue marked as Resolved.', 'success');
      this.openDetails(issueId);
      issuesManager.loadIssues();
      app.loadDashboardMetrics();
    } catch (err) {
      app.showToast(err.message, 'error');
    }
  },

  /**
   * Opens modal to prompt citizen for mandatory rejection reason
   */
  promptRejection(issueId) {
    const input = document.getElementById('reopenIssueId');
    if (input) input.value = issueId;
    app.openModal('reopenDisputeModal');
  },

  /**
   * Submits rejection and reopens complaint
   */
  async submitRejection() {
    const issueId = document.getElementById('reopenIssueId')?.value;
    const reason = document.getElementById('reopenReasonInput')?.value.trim();

    if (!reason || reason.length < 5) {
      app.showToast('Please provide a descriptive reason (at least 5 characters) for reopening.', 'error');
      return;
    }

    try {
      await API.post(`/issues/${issueId}/verify`, {
        action: 'reject',
        verifierName: app.currentUser?.name || 'Citizen Reporter',
        rejectionReason: reason
      });

      app.closeModal('reopenDisputeModal');
      document.getElementById('reopenReasonInput').value = '';

      app.showToast('Resolution rejected. Complaint has been Reopened for corrective work!', 'warning');
      this.openDetails(issueId);
      issuesManager.loadIssues();
      app.loadDashboardMetrics();
    } catch (err) {
      app.showToast(err.message, 'error');
    }
  }
};
