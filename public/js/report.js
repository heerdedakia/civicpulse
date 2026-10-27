/**
 * CIVICPULSE — REPORT ISSUE MODULE
 * Handles form validation, image preview, duplicate checking pre-flight, and complaint submission
 */

const reportManager = {
  selectedFile: null,
  bypassDuplicateCheck: false,

  init() {
    const form = document.getElementById('issueReportForm');
    const imageInput = document.getElementById('reportImage');
    const removeBtn = document.getElementById('removeImageBtn');
    const checkDupBtn = document.getElementById('checkDuplicateBtn');
    const useLocBtn = document.getElementById('useCurrentLocationBtn');
    const confirmSubmitAnywayBtn = document.getElementById('confirmSubmitAnywayBtn');

    if (imageInput) {
      imageInput.addEventListener('change', (e) => this.handleImageSelect(e));
    }

    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.clearImage();
      });
    }

    if (checkDupBtn) {
      checkDupBtn.addEventListener('click', () => this.performDuplicateCheck(true));
    }

    if (useLocBtn) {
      useLocBtn.addEventListener('click', () => this.detectUserLocation());
    }

    if (confirmSubmitAnywayBtn) {
      confirmSubmitAnywayBtn.addEventListener('click', () => {
        app.closeModal('duplicateWarningModal');
        this.bypassDuplicateCheck = true;
        this.submitForm();
      });
    }

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSubmit();
      });
    }
  },

  /**
   * File selection and preview handling
   */
  handleImageSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      app.showToast('File is too large. Maximum size is 5MB.', 'error');
      this.clearImage();
      return;
    }

    this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = (event) => {
      const previewImg = document.getElementById('previewImageElement');
      const previewBox = document.getElementById('uploadPreview');
      const placeholder = document.querySelector('.upload-placeholder');

      if (previewImg && previewBox) {
        previewImg.src = event.target.result;
        previewBox.classList.remove('hidden');
        if (placeholder) placeholder.classList.add('hidden');
      }
    };
    reader.readAsDataURL(file);
  },

  clearImage() {
    this.selectedFile = null;
    const imageInput = document.getElementById('reportImage');
    const previewBox = document.getElementById('uploadPreview');
    const placeholder = document.querySelector('.upload-placeholder');

    if (imageInput) imageInput.value = '';
    if (previewBox) previewBox.classList.add('hidden');
    if (placeholder) placeholder.classList.remove('hidden');
  },

  /**
   * Geolocation API support
   */
  detectUserLocation() {
    if (!navigator.geolocation) {
      app.showToast('Geolocation is not supported by your browser.', 'warning');
      return;
    }

    app.showToast('Detecting GPS location...', 'info');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (MapManager.pickerMarker && MapManager.pickerMap) {
          MapManager.pickerMarker.setLatLng([lat, lng]);
          MapManager.pickerMap.setView([lat, lng], 15);
        }
        MapManager.updatePickerInputs(lat, lng);
        app.showToast('Location coordinates detected!', 'success');
      },
      (err) => {
        app.showToast('Could not fetch GPS coordinates: ' + err.message, 'warning');
      },
      { timeout: 7000 }
    );
  },

  /**
   * Performs explainable duplicate detection pre-check
   */
  async performDuplicateCheck(manualTrigger = false) {
    const title = document.getElementById('reportTitle')?.value.trim();
    const description = document.getElementById('reportDescription')?.value.trim();
    const category = document.getElementById('reportCategory')?.value;
    const latitude = document.getElementById('reportLat')?.value;
    const longitude = document.getElementById('reportLon')?.value;

    if (!latitude || !longitude) {
      if (manualTrigger) {
        app.showToast('Please set latitude and longitude on the map before checking.', 'warning');
      }
      return false;
    }

    try {
      const res = await API.post('/issues/check-duplicate', {
        title,
        description,
        category,
        latitude,
        longitude
      });

      if (res.hasDuplicates && res.matches.length > 0) {
        this.renderDuplicateWarningModal(res.matches);
        return true;
      } else {
        if (manualTrigger) {
          app.showToast('No duplicate complaints found nearby. Clear to submit!', 'success');
        }
        return false;
      }
    } catch (err) {
      console.warn('Duplicate pre-check warning:', err);
      return false;
    }
  },

  /**
   * Renders the duplicate warning modal
   */
  renderDuplicateWarningModal(matches) {
    const container = document.getElementById('duplicateMatchesList');
    if (!container) return;

    container.innerHTML = matches.map(match => `
      <div class="dup-match-card">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h4 class="dup-match-title">${match.title}</h4>
          <span style="font-size:0.75rem; font-weight:700; color:#fbbf24;">${match.similarityScore}% Match</span>
        </div>
        <p style="font-size:0.75rem; color:#94a3b8;">📍 ${match.address || 'Nearby'} (${match.distanceMeters}m away) • Status: <strong>${match.status}</strong></p>
        <p class="dup-match-reason">${match.matchReason}</p>
        <div style="display:flex; gap:0.5rem; margin-top:6px;">
          <button type="button" class="btn btn-xs btn-outline" onclick="detailsManager.openDetails('${match.issueId}')">
            View Existing Complaint
          </button>
          <button type="button" class="btn btn-xs btn-cyan" onclick="issuesManager.upvoteIssue('${match.issueId}'); app.closeModal('duplicateWarningModal');">
            ▲ Endorse Existing (+Upvote)
          </button>
        </div>
      </div>
    `).join('');

    app.openModal('duplicateWarningModal');
  },

  /**
   * Form submission interceptor
   */
  async handleSubmit() {
    const title = document.getElementById('reportTitle')?.value.trim();
    const description = document.getElementById('reportDescription')?.value.trim();
    const category = document.getElementById('reportCategory')?.value;
    const address = document.getElementById('reportAddress')?.value.trim();
    const latitude = document.getElementById('reportLat')?.value;
    const longitude = document.getElementById('reportLon')?.value;

    if (!title || !description || !category || !address || !latitude || !longitude) {
      app.showToast('Please fill out all required fields marked with *', 'error');
      return;
    }

    // Run duplicate check if not already bypassed
    if (!this.bypassDuplicateCheck) {
      const hasDuplicates = await this.performDuplicateCheck(false);
      if (hasDuplicates) {
        return; // Modal opened; user must choose
      }
    }

    await this.submitForm();
  },

  /**
   * Actual API submission
   */
  async submitForm() {
    const submitBtn = document.getElementById('submitReportBtn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';
    }

    try {
      const form = document.getElementById('issueReportForm');
      const formData = new FormData(form);

      // Append active reporter info from session
      formData.append('reporterName', app.currentUser?.name || 'Concerned Citizen');
      formData.append('reporterEmail', app.currentUser?.email || '');

      const res = await API.postFormData('/issues', formData);

      app.showToast(`Complaint submitted! Initial Priority: ${res.data.priorityTier} (${res.data.priorityScore}/100)`, 'success');

      // Reset form
      form.reset();
      this.clearImage();
      this.bypassDuplicateCheck = false;

      // Refresh data and navigate to issues view
      await issuesManager.loadIssues();
      await app.loadDashboardMetrics();
      app.navigateTo('issues');
    } catch (err) {
      app.showToast(err.message, 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Civic Complaint';
      }
    }
  }
};
