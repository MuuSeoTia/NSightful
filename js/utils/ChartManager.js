/**
 * Chart Manager for GPU Performance Visualization
 * 
 * This class manages Chart.js instances for displaying real-time GPU
 * performance metrics with proper data handling and visual styling.
 */
class ChartManager {
    /**
     * Initialize the chart manager
     */
    constructor() {
        this.charts = new Map();
        this.maxDataPoints = 50;
        this.updateInterval = 500; // ms
        
        // Chart color scheme
        this.colors = {
            primary: '#4ecdc4',
            secondary: '#ff6b6b',
            accent: '#ffd93d',
            success: '#6bcf7f',
            info: '#00d4ff',
            gradient: {
                primary: 'rgba(78, 205, 196, 0.8)',
                primaryLight: 'rgba(78, 205, 196, 0.2)',
                secondary: 'rgba(255, 107, 107, 0.8)',
                secondaryLight: 'rgba(255, 107, 107, 0.2)',
            }
        };

        this.defaultOptions = {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: '#ffffff',
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#4ecdc4',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    display: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#ffffff',
                        maxTicksLimit: 8
                    }
                },
                y: {
                    display: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#ffffff'
                    }
                }
            }
        };

        console.log('Chart manager initialized');
    }

    /**
     * Initialize all performance charts
     */
    initializeCharts() {
        this.createGPUUtilizationChart();
        this.createMemoryBandwidthChart();
        this.createThermalChart();
        this.createComponentActivityChart();

        console.log('Performance charts initialized:', this.charts.size);
    }

    /**
     * Create GPU utilization chart
     */
    createGPUUtilizationChart() {
        const canvas = document.getElementById('gpuChart');
        if (!canvas) {
            console.warn('GPU chart canvas not found');
            return;
        }

        // Check if Chart.js is available
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js not loaded, creating placeholder');
            this.createPlaceholderChart(canvas, 'GPU Utilization');
            return;
        }

        const ctx = canvas.getContext('2d');
        
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'GPU Utilization (%)',
                    data: [],
                    borderColor: this.colors.primary,
                    backgroundColor: this.colors.gradient.primaryLight,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4
                }]
            },
            options: {
                ...this.defaultOptions,
                scales: {
                    ...this.defaultOptions.scales,
                    y: {
                        ...this.defaultOptions.scales.y,
                        min: 0,
                        max: 100,
                        ticks: {
                            ...this.defaultOptions.scales.y.ticks,
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });

        this.charts.set('gpu', chart);
    }

    /**
     * Create memory bandwidth chart
     */
    createMemoryBandwidthChart() {
        const canvas = document.getElementById('memoryChart');
        if (!canvas) {
            console.warn('Memory chart canvas not found');
            return;
        }

        if (typeof Chart === 'undefined') {
            console.warn('Chart.js not loaded, creating placeholder');
            this.createPlaceholderChart(canvas, 'Memory Usage');
            return;
        }

        const ctx = canvas.getContext('2d');
        
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Memory Utilization (%)',
                    data: [],
                    borderColor: this.colors.info,
                    backgroundColor: 'rgba(0, 212, 255, 0.2)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4
                }]
            },
            options: {
                ...this.defaultOptions,
                scales: {
                    ...this.defaultOptions.scales,
                    y: {
                        ...this.defaultOptions.scales.y,
                        min: 0,
                        max: 100,
                        ticks: {
                            ...this.defaultOptions.scales.y.ticks,
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });

        this.charts.set('memory', chart);
    }

    /**
     * Create thermal and power chart
     */
    createThermalChart() {
        const canvas = document.getElementById('thermalChart');
        if (!canvas) {
            console.warn('Thermal chart canvas not found');
            return;
        }

        if (typeof Chart === 'undefined') {
            console.warn('Chart.js not loaded, creating placeholder');
            this.createPlaceholderChart(canvas, 'Temperature & Power');
            return;
        }

        const ctx = canvas.getContext('2d');
        
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Temperature (°C)',
                    data: [],
                    borderColor: this.colors.secondary,
                    backgroundColor: this.colors.gradient.secondaryLight,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4
                }]
            },
            options: {
                ...this.defaultOptions,
                scales: {
                    ...this.defaultOptions.scales,
                    y: {
                        ...this.defaultOptions.scales.y,
                        min: 30,
                        max: 90,
                        ticks: {
                            ...this.defaultOptions.scales.y.ticks,
                            callback: function(value) {
                                return value + '°C';
                            }
                        }
                    }
                }
            }
        });

        this.charts.set('thermal', chart);
    }

    /**
     * Create component activity chart
     */
    createComponentActivityChart() {
        const canvas = document.getElementById('componentChart');
        if (!canvas) {
            console.warn('Component chart canvas not found');
            return;
        }

        if (typeof Chart === 'undefined') {
            console.warn('Chart.js not loaded, creating placeholder');
            this.createPlaceholderChart(canvas, 'Component Activity');
            return;
        }

        const ctx = canvas.getContext('2d');
        
        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['SMs', 'Memory', 'Cache'],
                datasets: [{
                    label: 'Activity Level (%)',
                    data: [0, 0, 0],
                    backgroundColor: [
                        this.colors.gradient.primary,
                        'rgba(0, 212, 255, 0.8)',
                        'rgba(107, 207, 127, 0.8)'
                    ],
                    borderColor: [
                        this.colors.primary,
                        this.colors.info,
                        this.colors.success
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                ...this.defaultOptions,
                plugins: {
                    ...this.defaultOptions.plugins,
                    legend: {
                        display: false
                    }
                },
                scales: {
                    ...this.defaultOptions.scales,
                    y: {
                        ...this.defaultOptions.scales.y,
                        min: 0,
                        max: 100,
                        ticks: {
                            ...this.defaultOptions.scales.y.ticks,
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });

        this.charts.set('component', chart);
    }

    /**
     * Create placeholder chart when Chart.js is not available
     */
    createPlaceholderChart(canvas, title) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Draw background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.fillRect(0, 0, width, height);
        
        // Draw title
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(title, width / 2, 30);
        
        // Draw placeholder message
        ctx.font = '14px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fillText('Chart will appear here', width / 2, height / 2);
        ctx.fillText('when data is available', width / 2, height / 2 + 20);
    }

    /**
     * Update charts with new telemetry data
     */
    updateCharts(telemetryData) {
        if (!telemetryData) return;

        const timestamp = new Date(telemetryData.timestamp).toLocaleTimeString();

        this.updateGPUChart(telemetryData, timestamp);
        this.updateMemoryChart(telemetryData, timestamp);
        this.updateThermalChart(telemetryData, timestamp);
        this.updateComponentChart(telemetryData);
    }

    /**
     * Update GPU utilization chart
     */
    updateGPUChart(data, timestamp) {
        const chart = this.charts.get('gpu');
        if (!chart) return;

        // Add new data point
        chart.data.labels.push(timestamp);
        chart.data.datasets[0].data.push(data.util_gpu || 0);

        // Limit data points
        this.limitDataPoints(chart);
        chart.update('none');
    }

    /**
     * Update memory bandwidth chart
     */
    updateMemoryChart(data, timestamp) {
        const chart = this.charts.get('memory');
        if (!chart) return;

        chart.data.labels.push(timestamp);
        chart.data.datasets[0].data.push(data.util_memory || 0);

        this.limitDataPoints(chart);
        chart.update('none');
    }

    /**
     * Update thermal and power chart
     */
    updateThermalChart(data, timestamp) {
        const chart = this.charts.get('thermal');
        if (!chart) return;

        chart.data.labels.push(timestamp);
        chart.data.datasets[0].data.push(data.temperature_c || 0);

        this.limitDataPoints(chart);
        chart.update('none');
    }

    /**
     * Update component activity chart
     */
    updateComponentChart(data) {
        const chart = this.charts.get('component');
        if (!chart) return;

        // Calculate component activity levels
        const smActivity = data.util_gpu || 0;
        const memoryActivity = data.util_memory || 0;
        const cacheActivity = Math.min(smActivity * 0.8, 100); // Approximate cache activity

        chart.data.datasets[0].data = [
            smActivity,
            memoryActivity,
            cacheActivity
        ];

        chart.update('none');
    }

    /**
     * Limit the number of data points in a chart
     */
    limitDataPoints(chart) {
        if (chart.data.labels.length > this.maxDataPoints) {
            chart.data.labels.shift();
            chart.data.datasets.forEach(dataset => {
                dataset.data.shift();
            });
        }
    }

    /**
     * Clear all chart data
     */
    clearCharts() {
        this.charts.forEach(chart => {
            chart.data.labels = [];
            chart.data.datasets.forEach(dataset => {
                dataset.data = [];
            });
            chart.update();
        });
    }

    /**
     * Resize all charts
     */
    resizeCharts() {
        this.charts.forEach(chart => {
            chart.resize();
        });
    }

    /**
     * Destroy all charts
     */
    destroy() {
        this.charts.forEach(chart => {
            chart.destroy();
        });
        this.charts.clear();
        console.log('Chart manager destroyed');
    }
}

export default ChartManager;
