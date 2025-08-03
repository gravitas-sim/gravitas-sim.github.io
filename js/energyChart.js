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
            if (Math.abs(value) >= 1e42) {
              return `${context.dataset.label}: ${(value / 1e42).toFixed(2)} × 10⁴² J`;
            } else if (Math.abs(value) >= 1e39) {
              return `${context.dataset.label}: ${(value / 1e39).toFixed(2)} × 10³⁹ J`;
            } else if (Math.abs(value) >= 1e36) {
              return `${context.dataset.label}: ${(value / 1e36).toFixed(2)} × 10³⁶ J`;
            } else if (Math.abs(value) >= 1e33) {
              return `${context.dataset.label}: ${(value / 1e33).toFixed(2)} × 10³³ J`;
            } else if (Math.abs(value) >= 1e30) {
              return `${context.dataset.label}: ${(value / 1e30).toFixed(2)} × 10³⁰ J`;
            } else if (Math.abs(value) >= 1e27) {
              return `${context.dataset.label}: ${(value / 1e27).toFixed(2)} × 10²⁷ J`;
            } else if (Math.abs(value) >= 1e24) {
              return `${context.dataset.label}: ${(value / 1e24).toFixed(2)} × 10²⁴ J`;
            } else if (Math.abs(value) >= 1e21) {
              return `${context.dataset.label}: ${(value / 1e21).toFixed(2)} × 10²¹ J`;
            } else if (Math.abs(value) >= 1e18) {
              return `${context.dataset.label}: ${(value / 1e18).toFixed(2)} × 10¹⁸ J`;
            } else if (Math.abs(value) >= 1e15) {
              return `${context.dataset.label}: ${(value / 1e15).toFixed(2)} × 10¹⁵ J`;
            } else if (Math.abs(value) >= 1e12) {
              return `${context.dataset.label}: ${(value / 1e12).toFixed(2)} × 10¹² J`;
            } else if (Math.abs(value) >= 1e9) {
              return `${context.dataset.label}: ${(value / 1e9).toFixed(2)} × 10⁹ J`;
            } else if (Math.abs(value) >= 1e6) {
              return `${context.dataset.label}: ${(value / 1e6).toFixed(2)} × 10⁶ J`;
            } else if (Math.abs(value) >= 1e3) {
              return `${context.dataset.label}: ${(value / 1e3).toFixed(2)} × 10³ J`;
            } else {
              return `${context.dataset.label}: ${value.toFixed(2)} J`;
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
            if (Math.abs(value) >= 1e42) {
              return (value / 1e42).toFixed(1) + '×10⁴²';
            } else if (Math.abs(value) >= 1e39) {
              return (value / 1e39).toFixed(1) + '×10³⁹';
            } else if (Math.abs(value) >= 1e36) {
              return (value / 1e36).toFixed(1) + '×10³⁶';
            } else if (Math.abs(value) >= 1e33) {
              return (value / 1e33).toFixed(1) + '×10³³';
            } else if (Math.abs(value) >= 1e30) {
              return (value / 1e30).toFixed(1) + '×10³⁰';
            } else if (Math.abs(value) >= 1e27) {
              return (value / 1e27).toFixed(1) + '×10²⁷';
            } else if (Math.abs(value) >= 1e24) {
              return (value / 1e24).toFixed(1) + '×10²⁴';
            } else if (Math.abs(value) >= 1e21) {
              return (value / 1e21).toFixed(1) + '×10²¹';
            } else if (Math.abs(value) >= 1e18) {
              return (value / 1e18).toFixed(1) + '×10¹⁸';
            } else if (Math.abs(value) >= 1e15) {
              return (value / 1e15).toFixed(1) + '×10¹⁵';
            } else if (Math.abs(value) >= 1e12) {
              return (value / 1e12).toFixed(1) + '×10¹²';
            } else if (Math.abs(value) >= 1e9) {
              return (value / 1e9).toFixed(1) + '×10⁹';
            } else if (Math.abs(value) >= 1e6) {
              return (value / 1e6).toFixed(1) + '×10⁶';
            } else if (Math.abs(value) >= 1e3) {
              return (value / 1e3).toFixed(1) + '×10³';
            } else {
              return value.toFixed(1);
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