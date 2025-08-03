// Energy Chart functionality using Chart.js
// This module handles the creation and management of energy charts for objects

// Energy Chart functionality using Chart.js
// This module handles the creation and management of energy charts for objects

// Chart.js instance for the energy chart
let energyChart = null;
let chartCanvas = null;
let chartContext = null;

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
                backgroundColor: 'rgba(0, 255, 136, 0.2)',
                borderWidth: 2,
                fill: false
            },
            {
                label: 'Potential Energy',
                data: [],
                borderColor: '#ff8800',
                backgroundColor: 'rgba(255, 136, 0, 0.2)',
                borderWidth: 2,
                fill: false
            },
            {
                label: 'Total Energy',
                data: [],
                borderColor: '#0088ff',
                backgroundColor: 'rgba(0, 136, 255, 0.2)',
                borderWidth: 2,
                fill: false
            }
        ]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            duration: 0 // Disable animations for better performance
        },
        scales: {
            x: {
                type: 'linear',
                display: true,
                title: {
                    display: true,
                    text: 'Time (s)',
                    color: '#e0e0e0'
                },
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)'
                },
                ticks: {
                    color: '#e0e0e0'
                }
            },
            y: {
                display: true,
                title: {
                    display: true,
                    text: 'Energy (J)',
                    color: '#e0e0e0'
                },
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)'
                },
                ticks: {
                    color: '#e0e0e0',
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
        },
        plugins: {
            legend: {
                display: true,
                labels: {
                    color: '#e0e0e0',
                    usePointStyle: true,
                    padding: 20
                }
            },
            tooltip: {
                mode: 'index',
                intersect: false,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: '#e0e0e0',
                bodyColor: '#e0e0e0',
                borderColor: '#00aaff',
                borderWidth: 1,
                callbacks: {
                    label: function(context) {
                        const value = context.parsed.y;
                        let formattedValue;
                        if (Math.abs(value) >= 1e42) {
                            formattedValue = (value / 1e42).toFixed(3) + ' × 10⁴²';
                        } else if (Math.abs(value) >= 1e39) {
                            formattedValue = (value / 1e39).toFixed(3) + ' × 10³⁹';
                        } else if (Math.abs(value) >= 1e36) {
                            formattedValue = (value / 1e36).toFixed(3) + ' × 10³⁶';
                        } else if (Math.abs(value) >= 1e33) {
                            formattedValue = (value / 1e33).toFixed(3) + ' × 10³³';
                        } else if (Math.abs(value) >= 1e30) {
                            formattedValue = (value / 1e30).toFixed(3) + ' × 10³⁰';
                        } else if (Math.abs(value) >= 1e27) {
                            formattedValue = (value / 1e27).toFixed(3) + ' × 10²⁷';
                        } else if (Math.abs(value) >= 1e24) {
                            formattedValue = (value / 1e24).toFixed(3) + ' × 10²⁴';
                        } else if (Math.abs(value) >= 1e21) {
                            formattedValue = (value / 1e21).toFixed(3) + ' × 10²¹';
                        } else if (Math.abs(value) >= 1e18) {
                            formattedValue = (value / 1e18).toFixed(3) + ' × 10¹⁸';
                        } else if (Math.abs(value) >= 1e15) {
                            formattedValue = (value / 1e15).toFixed(3) + ' × 10¹⁵';
                        } else if (Math.abs(value) >= 1e12) {
                            formattedValue = (value / 1e12).toFixed(3) + ' × 10¹²';
                        } else if (Math.abs(value) >= 1e9) {
                            formattedValue = (value / 1e9).toFixed(3) + ' × 10⁹';
                        } else if (Math.abs(value) >= 1e6) {
                            formattedValue = (value / 1e6).toFixed(3) + ' × 10⁶';
                        } else if (Math.abs(value) >= 1e3) {
                            formattedValue = (value / 1e3).toFixed(3) + ' × 10³';
                        } else {
                            formattedValue = value.toFixed(3);
                        }
                        return context.dataset.label + ': ' + formattedValue + ' J';
                    }
                }
            }
        },
        interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
        }
    }
};

/**
 * Initialize the energy chart
 * @param {HTMLCanvasElement} canvas - The canvas element to use for the chart
 * @returns {boolean} True if initialization was successful
 */
export function initializeEnergyChart(canvas) {
    if (!canvas) {
        console.error('Canvas element is required for energy chart initialization');
        return false;
    }
    
    console.log('Initializing energy chart with canvas:', canvas);
    console.log('Canvas element:', canvas);
    console.log('Canvas parent:', canvas.parentElement);
    
    // Ensure canvas has proper dimensions
    const container = canvas.parentElement;
    let containerWidth = container ? container.clientWidth - 30 : 500; // Account for padding
    let containerHeight = container ? container.clientHeight - 30 : 300;
    
    // If container has no dimensions, use default values
    if (containerWidth <= 0) containerWidth = 500;
    if (containerHeight <= 0) containerHeight = 300;
    
    // Set both canvas properties and CSS styles
    canvas.width = containerWidth;
    canvas.height = containerHeight;
    canvas.style.width = containerWidth + 'px';
    canvas.style.height = containerHeight + 'px';
    
    console.log('Canvas dimensions set to:', canvas.width, 'x', canvas.height);
    console.log('Canvas style dimensions:', canvas.style.width, 'x', canvas.style.height);
    
    chartCanvas = canvas;
    chartContext = canvas.getContext('2d');
    
    console.log('Chart context:', chartContext);
    
    // Check if Chart.js is available
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded. Please include Chart.js before using energy charts.');
        return false;
    }
    
    console.log('Chart.js is available, creating chart with config:', chartConfig);
    
    try {
        // Create new chart instance
        energyChart = new Chart(chartContext, chartConfig);
        console.log('Energy chart initialized successfully:', energyChart);
        console.log('Chart instance:', energyChart);
        console.log('Chart canvas:', energyChart.canvas);
        console.log('Chart context:', energyChart.ctx);
        
        // Add some test data to verify the chart works
        const testLabels = ['0', '1', '2', '3', '4'];
        const testData1 = [1e36, 2e36, 1.5e36, 3e36, 2.5e36];
        const testData2 = [-8e35, -1.6e36, -1.2e36, -2.4e36, -2e36];
        const testData3 = [2e35, 4e35, 3e35, 6e35, 5e35];
        
        energyChart.data.labels = testLabels;
        energyChart.data.datasets[0].data = testData1;
        energyChart.data.datasets[1].data = testData2;
        energyChart.data.datasets[2].data = testData3;
        energyChart.update('none');
        console.log('Test data added to chart');
        console.log('Chart datasets after test data:', energyChart.data.datasets);
        
        // Verify chart dimensions after initialization
        console.log('Final chart canvas dimensions:', energyChart.canvas.width, 'x', energyChart.canvas.height);
        console.log('Final chart canvas style:', energyChart.canvas.style.width, 'x', energyChart.canvas.style.height);
        
        return true;
    } catch (error) {
        console.error('Failed to initialize energy chart:', error);
        console.error('Error stack:', error.stack);
        return false;
    }
}

/**
 * Update the energy chart with new data
 * @param {Array} energyData - Array of energy data points
 * @param {number} startTime - Start time for the chart (optional)
 */
export function updateEnergyChart(energyData, startTime = 0) {
    if (!energyChart) {
        console.log('Energy chart not initialized');
        return;
    }
    
    console.log('Updating energy chart with data:', energyData);
    
    try {
        // If no data, add some dummy data for testing
        if (!energyData || energyData.length === 0) {
            console.log('No energy data, adding dummy data for testing');
            const dummyLabels = [];
            const dummyData1 = [];
            const dummyData2 = [];
            const dummyData3 = [];
            
            for (let i = 0; i < 20; i++) {
                const time = i * 0.5; // Time in seconds
                const energy = Math.sin(i * 0.5) * 1e36 + 1e36; // Oscillating energy
                
                dummyLabels.push(time.toFixed(1));
                dummyData1.push(energy);
                dummyData2.push(-energy * 0.8);
                dummyData3.push(energy * 0.2);
            }
            
            energyChart.data.labels = dummyLabels;
            energyChart.data.datasets[0].data = dummyData1;
            energyChart.data.datasets[1].data = dummyData2;
            energyChart.data.datasets[2].data = dummyData3;
            energyChart.update('none');
            console.log('Dummy data added to chart with', dummyLabels.length, 'points');
            return;
        }
        
        // Prepare data for Chart.js with labels and values
        const labels = [];
        const kineticData = [];
        const potentialData = [];
        const totalData = [];
        
        energyData.forEach((point, index) => {
            const time = (point.timestamp - startTime) / 1000; // Convert to seconds
            const ke = point.ke || point.kinetic || 0;
            const pe = point.pe || point.potential || 0;
            const total = point.total || 0;
            
            labels.push(time.toFixed(1));
            kineticData.push(ke);
            potentialData.push(pe);
            totalData.push(total);
        });
        
        console.log('Processed chart data:', { 
            kineticData: kineticData.slice(0, 3), 
            potentialData: potentialData.slice(0, 3), 
            totalData: totalData.slice(0, 3),
            totalPoints: kineticData.length
        });
        
        // Debug: Check if data values are valid
        console.log('Sample data values:', {
            kinetic: kineticData.slice(0, 2).map(d => ({ x: d.x, y: d.y })),
            potential: potentialData.slice(0, 2).map(d => ({ x: d.x, y: d.y })),
            total: totalData.slice(0, 2).map(d => ({ x: d.x, y: d.y }))
        });
        
        // Update chart data
        energyChart.data.labels = labels;
        energyChart.data.datasets[0].data = kineticData;
        energyChart.data.datasets[1].data = potentialData;
        energyChart.data.datasets[2].data = totalData;
        
        console.log('Chart datasets after update:', {
            kineticPoints: energyChart.data.datasets[0].data.length,
            potentialPoints: energyChart.data.datasets[1].data.length,
            totalPoints: energyChart.data.datasets[2].data.length,
            sampleData: {
                kinetic: kineticData.slice(0, 2),
                potential: potentialData.slice(0, 2),
                total: totalData.slice(0, 2)
            }
        });
        
        // Update the chart
        energyChart.update('none'); // 'none' mode for better performance
        console.log('Chart updated successfully with', kineticData.length, 'data points');
        
    } catch (error) {
        console.error('Failed to update energy chart:', error);
    }
}

/**
 * Clear the energy chart data
 */
export function clearEnergyChart() {
    if (!energyChart) return;
    
    try {
        energyChart.data.datasets.forEach(dataset => {
            dataset.data = [];
        });
        energyChart.update('none');
    } catch (error) {
        console.error('Failed to clear energy chart:', error);
    }
}

/**
 * Destroy the energy chart instance
 */
export function destroyEnergyChart() {
    if (energyChart) {
        energyChart.destroy();
        energyChart = null;
        chartCanvas = null;
        chartContext = null;
    }
}

/**
 * Get the current energy chart instance
 * @returns {Chart|null} The chart instance or null if not initialized
 */
export function getEnergyChart() {
    return energyChart;
}

/**
 * Export the current energy chart as a PNG data URL.
 * Returns null if the chart has not been initialized.
 * @returns {string|null} Data URL of the PNG image
 */
export function exportEnergyChartAsImage() {
    if (!energyChart) return null;
    // Chart.js provides a toBase64Image method on the chart instance
    return energyChart.toBase64Image('image/png', 1);
} 