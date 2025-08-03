// ===== ENERGY CHART SYSTEM =====
// Comprehensive Chart.js-based energy visualization system
// TODO: REMOVE - Energy chart system to be replaced

// Chart instance and canvas references
let energyChart = null;
let chartCanvas = null;
let chartContext = null;

// Chart configuration with improved settings
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
        pointHoverRadius: 4
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
        pointHoverRadius: 4
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
        pointHoverRadius: 4
      }
    ]
  },
  options: {
    responsive: false,
    maintainAspectRatio: false,
    parsing: false,
    animation: {
      duration: 0
    },
    interaction: {
      intersect: false,
      mode: 'index'
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#e0e0e0',
          font: {
            size: 12
          },
          usePointStyle: true
        }
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
          label: function(context) {
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
          }
        }
      }
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
            weight: 'bold'
          }
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          drawBorder: true
        },
        ticks: {
          color: '#e0e0e0',
          font: {
            size: 12
          }
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Energy (J)',
          color: '#e0e0e0',
          font: {
            size: 14,
            weight: 'bold'
          }
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          drawBorder: true
        },
        ticks: {
          color: '#e0e0e0',
          font: {
            size: 12
          },
          callback: function(value) {
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
          }
        }
      }
    }
  }
};

// REMOVED: initializeEnergyChart function
// REMOVED: updateEnergyChart function  
// REMOVED: clearEnergyChart function
// REMOVED: destroyEnergyChart function
// REMOVED: getEnergyChart function
// REMOVED: exportEnergyChartAsImage function
// REMOVED: resizeEnergyChart function 