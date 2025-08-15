// Performance Analyzer - Advanced analysis of GPU performance data
export class PerformanceAnalyzer {
    constructor() {
        this.isInitialized = false;
        this.architectureBaseline = null;
        this.analysisCache = new Map();
        this.trendAnalysis = new TrendAnalyzer();
        this.bottleneckDetector = new BottleneckDetector();
        this.efficiencyCalculator = new EfficiencyCalculator();
    }

    async initialize() {
        try {
            console.log('Initializing Performance Analyzer...');
            
            await this.trendAnalysis.initialize();
            await this.bottleneckDetector.initialize();
            await this.efficiencyCalculator.initialize();
            
            this.isInitialized = true;
            console.log('Performance Analyzer initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Performance Analyzer:', error);
            throw error;
        }
    }

    setArchitectureBaseline(architecture) {
        this.architectureBaseline = architecture;
        this.bottleneckDetector.setArchitecture(architecture);
        this.efficiencyCalculator.setArchitecture(architecture);
        
        console.log('Architecture baseline set:', architecture.name);
    }

    // Real-time trend analysis
    analyzeTrends(telemetryHistory) {
        if (!this.isInitialized || telemetryHistory.length < 10) {
            return null;
        }

        const cacheKey = `trends_${telemetryHistory.length}_${telemetryHistory[telemetryHistory.length - 1].timestamp}`;
        
        if (this.analysisCache.has(cacheKey)) {
            return this.analysisCache.get(cacheKey);
        }

        const trends = this.trendAnalysis.analyze(telemetryHistory);
        this.analysisCache.set(cacheKey, trends);
        
        // Clean old cache entries
        if (this.analysisCache.size > 100) {
            const oldestKey = this.analysisCache.keys().next().value;
            this.analysisCache.delete(oldestKey);
        }

        return trends;
    }

    // Session analysis for recorded data
    analyzeSession(sessionData) {
        if (!this.isInitialized || sessionData.length === 0) {
            return null;
        }

        console.log(`Analyzing session with ${sessionData.length} data points`);

        const analysis = {
            sessionMetrics: this.calculateSessionMetrics(sessionData),
            trends: this.trendAnalysis.analyzeSession(sessionData),
            bottlenecks: this.bottleneckDetector.analyzeSession(sessionData),
            efficiency: this.efficiencyCalculator.analyzeSession(sessionData),
            recommendations: this.generateSessionRecommendations(sessionData)
        };

        return analysis;
    }

    calculateSessionMetrics(sessionData) {
        const metrics = {
            duration: 0,
            dataPoints: sessionData.length,
            samplingRate: 0,
            coverage: {},
            stability: {},
            peaks: {},
            averages: {},
            extremes: {}
        };

        if (sessionData.length === 0) return metrics;

        // Calculate duration and sampling rate
        const startTime = sessionData[0].timestamp;
        const endTime = sessionData[sessionData.length - 1].timestamp;
        metrics.duration = endTime - startTime;
        metrics.samplingRate = sessionData.length / (metrics.duration / 1000); // samples per second

        // Extract data series
        const series = {
            utilGPU: sessionData.map(d => d.utilGPU),
            utilMemory: sessionData.map(d => d.utilMemory),
            temperature: sessionData.map(d => d.temperature),
            power: sessionData.map(d => d.power),
            smClock: sessionData.map(d => d.smClock),
            memoryClock: sessionData.map(d => d.memoryClock)
        };

        // Calculate metrics for each series
        Object.keys(series).forEach(key => {
            const data = series[key];
            
            metrics.averages[key] = this.calculateMean(data);
            metrics.extremes[key] = {
                min: Math.min(...data),
                max: Math.max(...data)
            };
            metrics.stability[key] = this.calculateStability(data);
            metrics.peaks[key] = this.detectPeaks(data);
            metrics.coverage[key] = this.calculateCoverage(data);
        });

        return metrics;
    }

    calculateMean(data) {
        return data.reduce((sum, val) => sum + val, 0) / data.length;
    }

    calculateStability(data) {
        const mean = this.calculateMean(data);
        const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
        const stdDev = Math.sqrt(variance);
        
        return {
            variance,
            standardDeviation: stdDev,
            coefficientOfVariation: stdDev / mean,
            stability: 1 - Math.min(1, stdDev / (mean || 1)) // 0-1 scale, 1 = very stable
        };
    }

    detectPeaks(data, threshold = 0.1) {
        const peaks = [];
        const mean = this.calculateMean(data);
        const peakThreshold = mean * (1 + threshold);

        for (let i = 1; i < data.length - 1; i++) {
            if (data[i] > data[i-1] && data[i] > data[i+1] && data[i] > peakThreshold) {
                peaks.push({
                    index: i,
                    value: data[i],
                    prominence: data[i] - Math.min(data[i-1], data[i+1])
                });
            }
        }

        return {
            count: peaks.length,
            peaks: peaks.slice(0, 10), // Top 10 peaks
            frequency: peaks.length / (data.length / 100) // peaks per 100 samples
        };
    }

    calculateCoverage(data) {
        const min = Math.min(...data);
        const max = Math.max(...data);
        const range = max - min;
        
        if (range === 0) return { range: 0, utilization: 0 };

        // Calculate how much of the theoretical range is used
        const theoreticalMax = 100; // Assuming percentage values
        const utilization = range / theoreticalMax;

        return {
            range,
            utilization,
            dynamicRange: max / Math.max(1, min) // Ratio of max to min
        };
    }

    generateSessionRecommendations(sessionData) {
        const recommendations = [];
        const metrics = this.calculateSessionMetrics(sessionData);

        // Utilization recommendations
        if (metrics.averages.utilGPU < 50) {
            recommendations.push({
                type: 'utilization',
                priority: 'high',
                description: 'GPU utilization is low',
                suggestion: 'Consider increasing workload or optimizing kernel launches',
                impact: 'performance'
            });
        }

        // Stability recommendations
        if (metrics.stability.utilGPU.stability < 0.7) {
            recommendations.push({
                type: 'stability',
                priority: 'medium',
                description: 'GPU utilization is highly variable',
                suggestion: 'Check for CPU bottlenecks or optimize workload distribution',
                impact: 'consistency'
            });
        }

        // Thermal recommendations
        if (metrics.averages.temperature > 80) {
            recommendations.push({
                type: 'thermal',
                priority: 'high',
                description: 'Average temperature is high',
                suggestion: 'Improve cooling or reduce power target',
                impact: 'reliability'
            });
        }

        // Memory recommendations
        if (metrics.averages.utilMemory > 90) {
            recommendations.push({
                type: 'memory',
                priority: 'medium',
                description: 'Memory utilization is very high',
                suggestion: 'Optimize memory usage or consider more GPU memory',
                impact: 'performance'
            });
        }

        return recommendations;
    }
}

// Trend Analysis Component
class TrendAnalyzer {
    constructor() {
        this.windowSize = 50;
        this.trendThreshold = 0.1;
    }

    async initialize() {
        console.log('Trend Analyzer initialized');
    }

    analyze(data) {
        if (data.length < this.windowSize) return null;

        const recentData = data.slice(-this.windowSize);
        
        return {
            utilGPU: this.analyzeTrend(recentData.map(d => d.utilGPU)),
            utilMemory: this.analyzeTrend(recentData.map(d => d.utilMemory)),
            temperature: this.analyzeTrend(recentData.map(d => d.temperature)),
            power: this.analyzeTrend(recentData.map(d => d.power)),
            overall: this.analyzeOverallTrend(recentData)
        };
    }

    analyzeTrend(series) {
        const slope = this.calculateSlope(series);
        const correlation = this.calculateCorrelation(series);
        
        return {
            direction: slope > this.trendThreshold ? 'increasing' : 
                      slope < -this.trendThreshold ? 'decreasing' : 'stable',
            strength: Math.abs(correlation),
            slope,
            correlation,
            prediction: this.predictNext(series, 5) // Predict next 5 values
        };
    }

    calculateSlope(series) {
        const n = series.length;
        const xSum = (n * (n - 1)) / 2; // Sum of indices 0 to n-1
        const ySum = series.reduce((sum, val) => sum + val, 0);
        const xySum = series.reduce((sum, val, index) => sum + val * index, 0);
        const xSquareSum = (n * (n - 1) * (2 * n - 1)) / 6; // Sum of squares of indices

        return (n * xySum - xSum * ySum) / (n * xSquareSum - xSum * xSum);
    }

    calculateCorrelation(series) {
        const n = series.length;
        const indices = Array.from({length: n}, (_, i) => i);
        
        const meanX = (n - 1) / 2;
        const meanY = series.reduce((sum, val) => sum + val, 0) / n;
        
        const numerator = series.reduce((sum, y, x) => sum + (x - meanX) * (y - meanY), 0);
        const denomX = Math.sqrt(indices.reduce((sum, x) => sum + Math.pow(x - meanX, 2), 0));
        const denomY = Math.sqrt(series.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0));
        
        return numerator / (denomX * denomY);
    }

    predictNext(series, count) {
        const slope = this.calculateSlope(series);
        const lastValue = series[series.length - 1];
        
        return Array.from({length: count}, (_, i) => lastValue + slope * (i + 1));
    }

    analyzeOverallTrend(data) {
        const utilTrend = this.analyzeTrend(data.map(d => d.utilGPU));
        const tempTrend = this.analyzeTrend(data.map(d => d.temperature));
        const powerTrend = this.analyzeTrend(data.map(d => d.power));

        return {
            performance: this.categorizePerformanceTrend(utilTrend, tempTrend, powerTrend),
            efficiency: this.calculateEfficiencyTrend(data),
            alerts: this.generateTrendAlerts(utilTrend, tempTrend, powerTrend)
        };
    }

    categorizePerformanceTrend(utilTrend, tempTrend, powerTrend) {
        if (utilTrend.direction === 'increasing' && tempTrend.direction !== 'increasing') {
            return 'improving';
        } else if (utilTrend.direction === 'decreasing') {
            return 'degrading';
        } else if (tempTrend.direction === 'increasing' && utilTrend.direction !== 'increasing') {
            return 'thermal_pressure';
        } else {
            return 'stable';
        }
    }

    calculateEfficiencyTrend(data) {
        const efficiency = data.map(d => d.utilGPU / Math.max(1, d.power / 100));
        return this.analyzeTrend(efficiency);
    }

    generateTrendAlerts(utilTrend, tempTrend, powerTrend) {
        const alerts = [];

        if (tempTrend.direction === 'increasing' && tempTrend.strength > 0.7) {
            alerts.push({
                type: 'thermal_warning',
                severity: 'medium',
                message: 'Temperature is trending upward',
                recommendation: 'Monitor thermal performance'
            });
        }

        if (utilTrend.direction === 'decreasing' && utilTrend.strength > 0.8) {
            alerts.push({
                type: 'performance_decline',
                severity: 'high',
                message: 'GPU utilization is declining',
                recommendation: 'Check for workload issues'
            });
        }

        return alerts;
    }

    analyzeSession(sessionData) {
        // Analyze entire session for longer-term trends
        const chunks = this.chunkData(sessionData, 100); // Analyze in 100-sample chunks
        
        return chunks.map((chunk, index) => ({
            chunkIndex: index,
            startTime: chunk[0].timestamp,
            endTime: chunk[chunk.length - 1].timestamp,
            trends: this.analyze(chunk)
        }));
    }

    chunkData(data, chunkSize) {
        const chunks = [];
        for (let i = 0; i < data.length; i += chunkSize) {
            chunks.push(data.slice(i, i + chunkSize));
        }
        return chunks.filter(chunk => chunk.length >= this.windowSize);
    }
}

// Bottleneck Detection Component
class BottleneckDetector {
    constructor() {
        this.architecture = null;
        this.thresholds = {
            highUtilization: 90,
            lowEfficiency: 60,
            thermalLimit: 83,
            powerLimit: 0.95 // 95% of max power
        };
    }

    async initialize() {
        console.log('Bottleneck Detector initialized');
    }

    setArchitecture(architecture) {
        this.architecture = architecture;
    }

    analyzeSession(sessionData) {
        const bottlenecks = [];
        const timeWindows = this.createTimeWindows(sessionData, 10); // 10-second windows

        timeWindows.forEach((window, index) => {
            const windowBottlenecks = this.analyzeWindow(window);
            if (windowBottlenecks.length > 0) {
                bottlenecks.push({
                    windowIndex: index,
                    startTime: window[0].timestamp,
                    endTime: window[window.length - 1].timestamp,
                    bottlenecks: windowBottlenecks
                });
            }
        });

        return this.aggregateBottlenecks(bottlenecks);
    }

    createTimeWindows(data, windowSizeSeconds) {
        if (data.length === 0) return [];

        const windowSize = windowSizeSeconds * 1000; // Convert to milliseconds
        const windows = [];
        let currentWindow = [];
        let windowStart = data[0].timestamp;

        for (const sample of data) {
            if (sample.timestamp - windowStart < windowSize) {
                currentWindow.push(sample);
            } else {
                if (currentWindow.length > 0) {
                    windows.push(currentWindow);
                }
                currentWindow = [sample];
                windowStart = sample.timestamp;
            }
        }

        if (currentWindow.length > 0) {
            windows.push(currentWindow);
        }

        return windows;
    }

    analyzeWindow(window) {
        const bottlenecks = [];
        const averages = this.calculateWindowAverages(window);

        // GPU utilization bottleneck
        if (averages.utilGPU > this.thresholds.highUtilization) {
            bottlenecks.push({
                type: 'gpu_saturated',
                severity: 'high',
                confidence: this.calculateConfidence(window.map(d => d.utilGPU), this.thresholds.highUtilization),
                description: 'GPU compute units are saturated',
                metrics: { averageUtilization: averages.utilGPU }
            });
        }

        // Memory bottleneck
        if (averages.utilMemory > this.thresholds.highUtilization) {
            bottlenecks.push({
                type: 'memory_saturated',
                severity: 'high',
                confidence: this.calculateConfidence(window.map(d => d.utilMemory), this.thresholds.highUtilization),
                description: 'Memory bandwidth is saturated',
                metrics: { averageMemoryUtil: averages.utilMemory }
            });
        }

        // Thermal bottleneck
        if (averages.temperature > this.thresholds.thermalLimit) {
            bottlenecks.push({
                type: 'thermal_throttling',
                severity: this.calculateThermalSeverity(averages.temperature),
                confidence: this.calculateConfidence(window.map(d => d.temperature), this.thresholds.thermalLimit),
                description: 'GPU is thermally throttling',
                metrics: { averageTemperature: averages.temperature }
            });
        }

        // Power bottleneck
        if (this.architecture && averages.power > this.architecture.maxPower * this.thresholds.powerLimit) {
            bottlenecks.push({
                type: 'power_limited',
                severity: 'medium',
                confidence: this.calculateConfidence(window.map(d => d.power), this.architecture.maxPower * this.thresholds.powerLimit),
                description: 'GPU is hitting power limits',
                metrics: { averagePower: averages.power, powerLimit: this.architecture.maxPower }
            });
        }

        // Efficiency bottleneck
        const efficiency = this.calculateEfficiency(averages);
        if (efficiency < this.thresholds.lowEfficiency) {
            bottlenecks.push({
                type: 'low_efficiency',
                severity: 'medium',
                confidence: 0.8,
                description: 'Overall GPU efficiency is low',
                metrics: { efficiency }
            });
        }

        return bottlenecks;
    }

    calculateWindowAverages(window) {
        const averages = {};
        const keys = ['utilGPU', 'utilMemory', 'temperature', 'power', 'smClock', 'memoryClock'];
        
        keys.forEach(key => {
            averages[key] = window.reduce((sum, sample) => sum + (sample[key] || 0), 0) / window.length;
        });

        return averages;
    }

    calculateConfidence(series, threshold) {
        const exceedingCount = series.filter(value => value > threshold).length;
        return exceedingCount / series.length;
    }

    calculateThermalSeverity(temperature) {
        if (temperature > 90) return 'critical';
        if (temperature > 85) return 'high';
        return 'medium';
    }

    calculateEfficiency(averages) {
        // Simple efficiency metric: utilization per watt
        return averages.utilGPU / Math.max(1, averages.power / 100);
    }

    aggregateBottlenecks(bottleneckWindows) {
        const aggregated = new Map();

        bottleneckWindows.forEach(window => {
            window.bottlenecks.forEach(bottleneck => {
                const key = bottleneck.type;
                
                if (!aggregated.has(key)) {
                    aggregated.set(key, {
                        type: bottleneck.type,
                        occurrences: 0,
                        totalConfidence: 0,
                        severities: [],
                        descriptions: new Set(),
                        timeRanges: []
                    });
                }

                const agg = aggregated.get(key);
                agg.occurrences++;
                agg.totalConfidence += bottleneck.confidence;
                agg.severities.push(bottleneck.severity);
                agg.descriptions.add(bottleneck.description);
                agg.timeRanges.push({
                    start: window.startTime,
                    end: window.endTime
                });
            });
        });

        return Array.from(aggregated.values()).map(agg => ({
            ...agg,
            averageConfidence: agg.totalConfidence / agg.occurrences,
            dominantSeverity: this.findDominantSeverity(agg.severities),
            descriptions: Array.from(agg.descriptions),
            duration: agg.timeRanges.reduce((total, range) => total + (range.end - range.start), 0)
        }));
    }

    findDominantSeverity(severities) {
        const counts = severities.reduce((acc, severity) => {
            acc[severity] = (acc[severity] || 0) + 1;
            return acc;
        }, {});

        return Object.keys(counts).reduce((max, severity) => 
            counts[severity] > (counts[max] || 0) ? severity : max
        );
    }
}

// Efficiency Calculator Component
class EfficiencyCalculator {
    constructor() {
        this.architecture = null;
        this.baselineMetrics = null;
    }

    async initialize() {
        console.log('Efficiency Calculator initialized');
    }

    setArchitecture(architecture) {
        this.architecture = architecture;
        this.baselineMetrics = this.calculateBaselineMetrics(architecture);
    }

    calculateBaselineMetrics(architecture) {
        return {
            maxComputeThroughput: architecture.smCount * architecture.coresPerSM * 2.0, // Rough estimate
            maxMemoryBandwidth: 1000, // GB/s, typical for high-end GPUs
            maxPowerEfficiency: 100, // Utilization per 100W
            thermalEfficiencyTarget: 80 // Target temperature for optimal efficiency
        };
    }

    analyzeSession(sessionData) {
        if (!this.baselineMetrics) return null;

        const efficiencyMetrics = sessionData.map(sample => this.calculateInstantaneousEfficiency(sample));
        
        return {
            overall: this.calculateOverallEfficiency(efficiencyMetrics),
            trends: this.analyzeEfficiencyTrends(efficiencyMetrics),
            recommendations: this.generateEfficiencyRecommendations(efficiencyMetrics)
        };
    }

    calculateInstantaneousEfficiency(sample) {
        return {
            timestamp: sample.timestamp,
            computeEfficiency: this.calculateComputeEfficiency(sample),
            memoryEfficiency: this.calculateMemoryEfficiency(sample),
            powerEfficiency: this.calculatePowerEfficiency(sample),
            thermalEfficiency: this.calculateThermalEfficiency(sample),
            overallEfficiency: 0 // Will be calculated
        };
    }

    calculateComputeEfficiency(sample) {
        if (!this.architecture) return 0;
        
        const utilization = sample.utilGPU / 100;
        const clockEfficiency = sample.smClock / (this.architecture.baseClock || 1500);
        
        return utilization * clockEfficiency * 100;
    }

    calculateMemoryEfficiency(sample) {
        const utilization = sample.utilMemory / 100;
        const bandwidth = sample.memoryBandwidth || 500; // Default if not available
        const maxBandwidth = this.baselineMetrics?.maxMemoryBandwidth || 1000;
        
        return (utilization * (bandwidth / maxBandwidth)) * 100;
    }

    calculatePowerEfficiency(sample) {
        const utilization = sample.utilGPU / 100;
        const power = sample.power || 200;
        
        return (utilization / (power / 100)) * 100;
    }

    calculateThermalEfficiency(sample) {
        const utilization = sample.utilGPU / 100;
        const temperature = sample.temperature || 60;
        const optimalTemp = this.baselineMetrics?.thermalEfficiencyTarget || 80;
        
        const thermalPenalty = Math.max(0, (temperature - optimalTemp) / optimalTemp);
        return Math.max(0, utilization * (1 - thermalPenalty)) * 100;
    }

    calculateOverallEfficiency(efficiencyMetrics) {
        if (efficiencyMetrics.length === 0) return null;

        const averages = {
            compute: 0,
            memory: 0,
            power: 0,
            thermal: 0,
            overall: 0
        };

        efficiencyMetrics.forEach(metric => {
            averages.compute += metric.computeEfficiency;
            averages.memory += metric.memoryEfficiency;
            averages.power += metric.powerEfficiency;
            averages.thermal += metric.thermalEfficiency;
        });

        const count = efficiencyMetrics.length;
        Object.keys(averages).forEach(key => {
            if (key !== 'overall') {
                averages[key] /= count;
            }
        });

        // Overall efficiency is weighted average
        averages.overall = (
            averages.compute * 0.3 +
            averages.memory * 0.25 +
            averages.power * 0.25 +
            averages.thermal * 0.2
        );

        return averages;
    }

    analyzeEfficiencyTrends(efficiencyMetrics) {
        // Analyze how efficiency changes over time
        const windowSize = Math.min(50, Math.floor(efficiencyMetrics.length / 5));
        const trends = [];

        for (let i = 0; i <= efficiencyMetrics.length - windowSize; i += windowSize) {
            const window = efficiencyMetrics.slice(i, i + windowSize);
            const windowEfficiency = this.calculateOverallEfficiency(window);
            
            trends.push({
                startIndex: i,
                endIndex: i + windowSize - 1,
                efficiency: windowEfficiency
            });
        }

        return trends;
    }

    generateEfficiencyRecommendations(efficiencyMetrics) {
        const overall = this.calculateOverallEfficiency(efficiencyMetrics);
        const recommendations = [];

        if (overall.compute < 70) {
            recommendations.push({
                type: 'compute_optimization',
                priority: 'high',
                description: 'Compute efficiency is below optimal',
                suggestions: [
                    'Optimize kernel launch parameters',
                    'Improve SM occupancy',
                    'Consider workload balancing'
                ]
            });
        }

        if (overall.memory < 60) {
            recommendations.push({
                type: 'memory_optimization',
                priority: 'high',
                description: 'Memory efficiency is low',
                suggestions: [
                    'Optimize memory access patterns',
                    'Use shared memory effectively',
                    'Minimize memory transfers'
                ]
            });
        }

        if (overall.power < 50) {
            recommendations.push({
                type: 'power_optimization',
                priority: 'medium',
                description: 'Power efficiency could be improved',
                suggestions: [
                    'Consider dynamic voltage scaling',
                    'Optimize for target power envelope',
                    'Balance performance vs power'
                ]
            });
        }

        if (overall.thermal < 60) {
            recommendations.push({
                type: 'thermal_optimization',
                priority: 'medium',
                description: 'Thermal efficiency is suboptimal',
                suggestions: [
                    'Improve cooling solution',
                    'Reduce power spikes',
                    'Implement thermal-aware scheduling'
                ]
            });
        }

        return recommendations;
    }
}
