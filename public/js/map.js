/**
 * CIVICPULSE — LEAFLET MAP MODULE
 * Manages full interactive map and location picker mini-map using Leaflet & OpenStreetMap
 */

const MapManager = {
  mainMap: null,
  pickerMap: null,
  pickerMarker: null,
  markersLayer: null,
  defaultCenter: [12.9716, 77.5946], // Central Municipal Zone
  defaultZoom: 14,

  /**
   * Initializes the full interactive map
   */
  initMainMap() {
    if (this.mainMap) {
      setTimeout(() => this.mainMap.invalidateSize(), 200);
      return;
    }

    const mapElement = document.getElementById('fullMap');
    if (!mapElement || typeof L === 'undefined') return;

    this.mainMap = L.map('fullMap').setView(this.defaultCenter, this.defaultZoom);

    // OpenStreetMap Tile Layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.mainMap);

    this.markersLayer = L.layerGroup().addTo(this.mainMap);
  },

  /**
   * Initializes the location picker mini-map inside the report form
   */
  initPickerMap() {
    if (this.pickerMap) {
      setTimeout(() => this.pickerMap.invalidateSize(), 200);
      return;
    }

    const pickerElement = document.getElementById('pickerMap');
    if (!pickerElement || typeof L === 'undefined') return;

    this.pickerMap = L.map('pickerMap').setView(this.defaultCenter, 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(this.pickerMap);

    // Initial marker at default coordinates
    this.pickerMarker = L.marker(this.defaultCenter, {
      draggable: true
    }).addTo(this.pickerMap);

    // Sync input coordinates when marker is dragged
    this.pickerMarker.on('dragend', (e) => {
      const { lat, lng } = e.target.getLatLng();
      this.updatePickerInputs(lat, lng);
    });

    // Move marker and update coords on map click
    this.pickerMap.on('click', (e) => {
      const { lat, lng } = e.latlng;
      this.pickerMarker.setLatLng([lat, lng]);
      this.updatePickerInputs(lat, lng);
    });
  },

  /**
   * Updates form inputs when coordinates change
   */
  updatePickerInputs(lat, lng) {
    const roundedLat = parseFloat(lat.toFixed(6));
    const roundedLng = parseFloat(lng.toFixed(6));

    const latInput = document.getElementById('reportLat');
    const lonInput = document.getElementById('reportLon');
    const label = document.getElementById('pickerCoordsLabel');

    if (latInput) latInput.value = roundedLat;
    if (lonInput) lonInput.value = roundedLng;
    if (label) label.textContent = `Pinned: Lat ${roundedLat}, Lon ${roundedLng}`;

    // Optional reverse geocoding fallback text if address is empty
    const addressInput = document.getElementById('reportAddress');
    if (addressInput && !addressInput.value.trim()) {
      addressInput.value = `Near Coordinate Point (${roundedLat}, ${roundedLng}), Municipal Sector`;
    }
  },

  /**
   * Renders issues onto the main interactive map
   */
  renderMarkers(issues) {
    if (!this.mainMap || !this.markersLayer) {
      this.initMainMap();
    }
    if (!this.markersLayer) return;

    this.markersLayer.clearLayers();

    const bounds = [];

    issues.forEach(issue => {
      if (!issue.location || !issue.location.latitude || !issue.location.longitude) return;

      const lat = Number(issue.location.latitude);
      const lon = Number(issue.location.longitude);
      if (isNaN(lat) || isNaN(lon)) return;

      bounds.push([lat, lon]);

      // Color coding according to status
      let markerColor = '#3b82f6';
      if (issue.status === 'In Progress') markerColor = '#f59e0b';
      else if (issue.status === 'Awaiting Verification') markerColor = '#06b6d4';
      else if (issue.status === 'Resolved') markerColor = '#10b981';
      else if (issue.status === 'Reopened') markerColor = '#ef4444';
      else if (issue.status === 'Acknowledged') markerColor = '#8b5cf6';

      // Custom SVG Circle Marker
      const customIcon = L.divIcon({
        className: 'custom-leaflet-icon',
        html: `
          <div style="
            background-color: ${markerColor};
            width: 18px;
            height: 18px;
            border-radius: 50%;
            border: 3px solid #0f172a;
            box-shadow: 0 0 10px ${markerColor};
            cursor: pointer;
          "></div>
        `,
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      });

      const marker = L.marker([lat, lon], { icon: customIcon });

      // Rich popup content
      const popupHtml = `
        <div class="map-popup-card">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <span style="font-size:0.65rem; color:#06b6d4; font-weight:700; text-transform:uppercase;">${issue.category}</span>
            <span style="font-size:0.7rem; font-weight:700; color:${markerColor};">${issue.status}</span>
          </div>
          <h4 class="map-popup-title">${issue.title}</h4>
          <p class="map-popup-address">📍 ${issue.location.address || 'Address unlisted'}</p>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
            <span style="font-size:0.75rem; font-weight:600; color:#f8fafc;">Priority: ${issue.priorityScore}/100</span>
            <button class="btn btn-xs btn-primary" onclick="detailsManager.openDetails('${issue._id}')">Details</button>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      this.markersLayer.addLayer(marker);
    });

    if (bounds.length > 0 && this.mainMap) {
      this.mainMap.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }
};
