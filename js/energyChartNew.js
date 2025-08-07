// ===== ENERGY CHART MODULE =====
// Chart.js-based energy visualization system

// Chart instance reference
let chart = null;

// Chart configuration
const chartConfig = {
  type: 'line',
  data: {
    labels: [],
    datasets: [
      {
        label: 'Kinetic Energy',
        data: [],
        borderColor: '#00ff88',
        backgroundColor: 'rgba(0, 255, 136, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
      {
        label: 'Potential Energy',
        data: [],
        borderColor: '#ff8800',
        backgroundColor: 'rgba(255, 136, 0, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
      {
        label: 'Total Energy',
        data: [],
        borderColor: '#0088ff',
        backgroundColor: 'rgba(0, 136, 255, 0.1)',
        borderWidth: 3,
        fill: false,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
    ],
  },
  options: {
    responsive: false,
    maintainAspectRatio: false,
    parsing: false,
    animation: {
      duration: 0,
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#e0e0e0',
          font: {
            size: 12,
          },
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#e0e0e0',
        borderColor: '#333333',
        borderWidth: 1,
        cornerRadius: 6,
        displayColors: true,
        callbacks: {
          label: function (context) {
            const value = context.parsed.y;
            const absValue = Math.abs(value);

            if (absValue === 0) {
              return `${context.dataset.label}: 0 J`;
            }

            // Use scientific notation for very large or very small numbers
            if (absValue >= 1e6 || absValue < 1e-3) {
              return `${context.dataset.label}: ${value.toExponential(2)} J`;
            }

            // For medium-sized numbers, use fixed decimal places
            if (absValue >= 1000) {
              return `${context.dataset.label}: ${value.toFixed(0)} J`;
            } else if (absValue >= 1) {
              return `${context.dataset.label}: ${value.toFixed(1)} J`;
            } else {
              return `${context.dataset.label}: ${value.toFixed(3)} J`;
            }
          },
        },
      },
    },
    scales: {
      x: {
        type: 'linear',
        display: true,
        title: {
          display: true,
          text: 'Time (s)',
          color: '#e0e0e0',
          font: {
            size: 14,
            weight: 'bold',
          },
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          drawBorder: true,
        },
        ticks: {
          color: '#e0e0e0',
          font: {
            size: 12,
          },
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Energy (J)',
          color: '#e0e0e0',
          font: {
            size: 14,
            weight: 'bold',
          },
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          drawBorder: true,
        },
        ticks: {
          color: '#e0e0e0',
          font: {
            size: 12,
          },
          callback: function (value) {
            // Handle extremely large numbers with better formatting
            const absValue = Math.abs(value);

            if (absValue === 0) {
              return '0';
            }

            // Use scientific notation for very large or very small numbers
            if (absValue >= 1e6 || absValue < 1e-3) {
              return value.toExponential(1);
            }

            // For medium-sized numbers, use fixed decimal places
            if (absValue >= 1000) {
              return value.toFixed(0);
            } else if (absValue >= 1) {
              return value.toFixed(1);
            } else {
              return value.toFixed(3);
            }
          },
        },
      },
    },
  },
};

/**
 * Initialize the energy chart
 * @param {HTMLCanvasElement} canvas - The canvas element to use for the chart
 * @returns {boolean} True if initialization was successful
 */
export function initChart(canvas) {
  if (!canvas) {
    console.error('Canvas element is required for chart initialization');
    return false;
  }

  if (!(canvas instanceof HTMLCanvasElement)) {
    console.error(
      'Invalid canvas element provided - expected HTMLCanvasElement'
    );
    return false;
  }

  // Check if Chart.js is available
  if (typeof window !== 'undefined' && typeof window.Chart === 'undefined') {
    console.error(
      'Chart.js is not loaded. Please include Chart.js before using energy charts.'
    );
    return false;
  }

  try {
    // Set canvas dimensions
    const container = canvas.parentElement;
    let containerWidth = container ? container.clientWidth - 30 : 500;
    let containerHeight = container ? container.clientHeight - 30 : 300;

    // Use minimum dimensions if container has no size
    if (containerWidth <= 0) containerWidth = 500;
    if (containerHeight <= 0) containerHeight = 300;

    canvas.width = containerWidth;
    canvas.height = containerHeight;
    canvas.style.width = containerWidth + 'px';
    canvas.style.height = containerHeight + 'px';

    // Create new chart instance
    const ChartCtor = typeof window !== 'undefined' ? window.Chart : undefined;
    if (!ChartCtor) {
      console.error('Chart.js is not available');
      return false;
    }
    chart = new ChartCtor(canvas.getContext('2d'), chartConfig);
    console.log('Energy chart initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize energy chart:', error);
    chart = null; // Ensure chart is null on failure
    return false;
  }
}

/**
 * Update the chart with energy data
 * @param {Array} data - Array of energy objects with { timestamp, ke, pe, total }
 */
export function updateChart(data) {
  // Check if chart instance exists
  if (!chart) {
    console.warn('Chart not initialized - skipping update');
    return;
  }

  // Check if data is valid
  if (!data) {
    console.warn('Data is null or undefined - skipping chart update');
    return;
  }

  if (!Array.isArray(data)) {
    console.warn('Data is not an array - skipping chart update');
    return;
  }

  if (data.length === 0) {
    console.log('No data provided to update chart');
    return;
  }

  try {
    // Validate first data point has required properties
    const firstPoint = data[0];
    if (!firstPoint || typeof firstPoint.timestamp !== 'number') {
      console.warn(
        'Invalid data format: missing or invalid timestamp in first data point'
      );
      return;
    }

    // Convert energy data to Chart.js format
    const startTime = firstPoint.timestamp;
    const chartData = data.map(point => ({
      x: (point.timestamp - startTime) / 1000, // Convert to seconds
      y: point.ke || 0,
    }));

    const potentialData = data.map(point => ({
      x: (point.timestamp - startTime) / 1000,
      y: point.pe || 0,
    }));

    const totalData = data.map(point => ({
      x: (point.timestamp - startTime) / 1000,
      y: point.total || 0,
    }));

    // Update chart datasets
    chart.data.datasets[0].data = chartData;
    chart.data.datasets[1].data = potentialData;
    chart.data.datasets[2].data = totalData;

    // Update the chart
    chart.update('none');
    console.log('Chart updated with', data.length, 'data points');
  } catch (error) {
    console.error('Failed to update chart:', error);
  }
}

/**
 * Clear all chart data
 */
export function clearChart() {
  if (!chart) {
    console.warn('Chart not initialized - cannot clear data');
    return;
  }

  try {
    chart.data.datasets.forEach(dataset => {
      dataset.data = [];
    });
    chart.update('none');
    console.log('Chart data cleared');
  } catch (error) {
    console.error('Failed to clear chart:', error);
  }
}

/**
 * Export the chart as a base64 image
 * @returns {string|null} Base64 image data or null if chart not initialized
 */
export function exportChart() {
  if (!chart) {
    console.warn('Chart not initialized - cannot export');
    return null;
  }

  try {
    const dataUrl = chart.toBase64Image('image/png', 1);
    console.log('Chart exported successfully');
    return dataUrl;
  } catch (error) {
    console.error('Failed to export chart:', error);
    return null;
  }
}
