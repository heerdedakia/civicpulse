/**
 * CIVICPULSE — CHART.JS ANALYTICS MODULE
 * Renders status breakdown and category distribution charts
 */

const ChartsManager = {
  statusChart: null,
  categoryChart: null,

  /**
   * Initializes or updates analytics charts
   */
  renderCharts(analyticsData) {
    if (typeof Chart === 'undefined') return;

    this.renderStatusChart(analyticsData.statusCounts);
    this.renderCategoryChart(analyticsData.categoryCounts);
  },

  /**
   * Renders Status Distribution Doughnut Chart
   */
  renderStatusChart(statusCounts = {}) {
    const ctx = document.getElementById('statusChart');
    if (!ctx) return;

    const labels = Object.keys(statusCounts);
    const data = Object.values(statusCounts);

    const colors = {
      'Reported': '#3b82f6',
      'Acknowledged': '#8b5cf6',
      'In Progress': '#f59e0b',
      'Awaiting Verification': '#06b6d4',
      'Resolved': '#10b981',
      'Reopened': '#ef4444'
    };

    const backgroundColors = labels.map(label => colors[label] || '#64748b');

    if (this.statusChart) {
      this.statusChart.destroy();
    }

    this.statusChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: backgroundColors,
          borderColor: '#1e293b',
          borderWidth: 2,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#94a3b8',
              font: { family: 'Inter', size: 12 }
            }
          }
        },
        cutout: '70%'
      }
    });
  },

  /**
   * Renders Complaints by Category Bar Chart
   */
  renderCategoryChart(categoryCounts = {}) {
    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;

    const labels = Object.keys(categoryCounts);
    const data = Object.values(categoryCounts);

    if (this.categoryChart) {
      this.categoryChart.destroy();
    }

    this.categoryChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels.map(l => l.split(' & ')[0]), // Shorten labels for mobile
        datasets: [{
          label: 'Complaints',
          data,
          backgroundColor: 'rgba(14, 165, 233, 0.75)',
          borderColor: '#0ea5e9',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: { color: '#94a3b8', font: { family: 'Inter', size: 11 } },
            grid: { display: false }
          },
          y: {
            beginAtZero: true,
            ticks: { color: '#94a3b8', stepSize: 1 },
            grid: { color: 'rgba(255, 255, 255, 0.05)' }
          }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }
};
