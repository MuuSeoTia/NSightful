// GPU Data Model - Handles all data operations and state management
import { invoke } from '@tauri-apps/api/tauri';

export class GPUDataModel {
    constructor() {
        this.state = {
            // Connection State
            connected: false,
            connecting: false,
            lastError: null,
            
            // Device Information
            devices: [],
            currentDevice: null,
            
            // Real-time Telemetry
            telemetry: {
                timestamp: 0,
                utilGPU: 0,
                utilMemory: 0,
                temperature: 0,
                power: 0,
                smClock: 0,
                memoryClock: 0,
                memoryUsed: 0,
                memoryTotal: 0,
                smUtilizations: [], // Per-SM utilization data
                memoryBandwidth: 0,
                pcieUtilization: 0,
                fanSpeed: 0
            },
            
            // Performance History
            performanceHistory: [],
            maxHistoryLength: 1000,
            
            // Streaming Configuration
            streamingConfig: {
                enabled: false,
                periodMs: 100,
                bufferSize: 1000
            },
            
            // GPU Architecture Information
            architecture: {
                name: '',
                computeCapability: '',
                smCount: 0,
                coresPerSM: 0,
                memoryBusWidth: 0,
                l2CacheSize: 0,
                maxThreadsPerSM: 0,
                warpSize: 32
            }
        };
        
        // Event listeners for data changes
        this.listeners = new Map();
        
        // Data validation and processing utilities
        this.dataValidator = new GPUDataValidator();
        this.dataProcessor = new GPUDataProcessor();
    }

    // Event system for MVC communication
    addEventListener(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    removeEventListener(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => callback(data));
        }
    }

    // GPU Connection and Device Management
    async connectToGPU() {
        this.state.connecting = true;
        this.emit('connectionStateChanged', { connecting: true });

        try {
            const result = await invoke('get_gpu_telemetry');
            const data = JSON.parse(result);
            
            this.state.devices = data.gpus || [];
            this.state.connected = data.status === 'connected';
            
            if (this.state.devices.length > 0) {
                this.state.currentDevice = this.state.devices[0];
                await this.loadGPUArchitecture();
            }

            this.state.connecting = false;
            this.state.lastError = null;
            
            this.emit('connectionStateChanged', { 
                connected: this.state.connected,
                connecting: false,
                devices: this.state.devices
            });

            return this.state.connected;
        } catch (error) {
            this.state.connecting = false;
            this.state.connected = false;
            this.state.lastError = error.message;
            
            this.emit('connectionStateChanged', { 
                connected: false,
                connecting: false,
                error: error.message
            });
            
            throw error;
        }
    }

    async loadGPUArchitecture() {
        if (!this.state.currentDevice) return;

        try {
            // In a real implementation, this would query the GPU for detailed architecture info
            // For now, we'll use common GPU architectures as examples
            this.state.architecture = {
                name: 'NVIDIA RTX 4090',
                computeCapability: '8.9',
                smCount: 128,
                coresPerSM: 128,
                memoryBusWidth: 384,
                l2CacheSize: 72 * 1024 * 1024, // 72MB
                maxThreadsPerSM: 1536,
                warpSize: 32
            };

            this.emit('architectureLoaded', this.state.architecture);
        } catch (error) {
            console.error('Failed to load GPU architecture:', error);
        }
    }

    // Telemetry Data Management
    async startTelemetryStream(periodMs = 100) {
        if (this.state.streamingConfig.enabled) return;

        try {
            this.state.streamingConfig.periodMs = Math.max(50, periodMs);
            this.state.streamingConfig.enabled = true;

            // Start the backend streaming
            await invoke('start_nvml_stream', { periodMs: this.state.streamingConfig.periodMs });
            
            // Start the frontend data simulation/collection loop
            this.startDataCollectionLoop();
            
            this.emit('streamingStateChanged', { enabled: true, periodMs });
        } catch (error) {
            this.state.streamingConfig.enabled = false;
            throw error;
        }
    }

    stopTelemetryStream() {
        this.state.streamingConfig.enabled = false;
        this.emit('streamingStateChanged', { enabled: false });
    }

    startDataCollectionLoop() {
        const collectData = () => {
            if (!this.state.streamingConfig.enabled) return;

            // Generate realistic telemetry data with proper GPU behavior patterns
            const newTelemetry = this.generateRealisticTelemetry();
            
            // Validate the data
            if (this.dataValidator.validateTelemetry(newTelemetry)) {
                this.updateTelemetryData(newTelemetry);
            }

            setTimeout(collectData, this.state.streamingConfig.periodMs);
        };

        collectData();
    }

    generateRealisticTelemetry() {
        const time = Date.now() / 1000;
        const baseTime = time * 0.1;

        // Create realistic GPU workload patterns
        const workloadIntensity = Math.max(0, Math.sin(baseTime * 0.5) * 0.6 + 0.4);
        const memoryPressure = Math.max(0, Math.cos(baseTime * 0.3) * 0.4 + 0.5);
        const thermalCycling = Math.sin(baseTime * 0.1) * 0.2 + 0.8;

        // Generate per-SM utilization data
        const smUtilizations = [];
        for (let i = 0; i < this.state.architecture.smCount; i++) {
            const smBaseUtil = workloadIntensity * 100;
            const smVariation = (Math.random() - 0.5) * 20;
            const smUtil = Math.max(0, Math.min(100, smBaseUtil + smVariation));
            smUtilizations.push(smUtil);
        }

        return {
            timestamp: Date.now(),
            utilGPU: workloadIntensity * 100 + (Math.random() - 0.5) * 10,
            utilMemory: memoryPressure * 100 + (Math.random() - 0.5) * 8,
            temperature: 40 + thermalCycling * 35 + workloadIntensity * 20 + Math.random() * 3,
            power: 100 + workloadIntensity * 350 + Math.random() * 30,
            smClock: 1200 + workloadIntensity * 800 + Math.random() * 100,
            memoryClock: 6000 + memoryPressure * 3000 + Math.random() * 200,
            memoryUsed: (6000 + memoryPressure * 6000) * 1024 * 1024, // Convert to bytes
            memoryTotal: 24 * 1024 * 1024 * 1024, // 24GB
            smUtilizations,
            memoryBandwidth: memoryPressure * 900 + Math.random() * 50, // GB/s
            pcieUtilization: Math.min(100, workloadIntensity * 80 + Math.random() * 15),
            fanSpeed: Math.max(30, thermalCycling * 100 + workloadIntensity * 50)
        };
    }

    updateTelemetryData(newTelemetry) {
        const processedData = this.dataProcessor.processTelemetry(newTelemetry, this.state.telemetry);
        
        this.state.telemetry = processedData;
        
        // Add to performance history
        this.state.performanceHistory.push({
            ...processedData,
            timestamp: Date.now()
        });

        // Maintain history size
        if (this.state.performanceHistory.length > this.state.maxHistoryLength) {
            this.state.performanceHistory.shift();
        }

        // Emit data update event
        this.emit('telemetryUpdated', {
            current: this.state.telemetry,
            history: this.state.performanceHistory.slice(-100) // Last 100 samples
        });
    }

    // Data Access Methods
    getCurrentTelemetry() {
        return { ...this.state.telemetry };
    }

    getPerformanceHistory(samples = 100) {
        return this.state.performanceHistory.slice(-samples);
    }

    getGPUArchitecture() {
        return { ...this.state.architecture };
    }

    getConnectionState() {
        return {
            connected: this.state.connected,
            connecting: this.state.connecting,
            error: this.state.lastError,
            devices: [...this.state.devices],
            currentDevice: this.state.currentDevice
        };
    }

    // Performance Analysis Methods
    getPerformanceMetrics(timeWindow = 60000) { // 1 minute default
        const cutoffTime = Date.now() - timeWindow;
        const recentData = this.state.performanceHistory.filter(
            sample => sample.timestamp >= cutoffTime
        );

        if (recentData.length === 0) return null;

        return this.dataProcessor.calculatePerformanceMetrics(recentData);
    }

    detectBottlenecks() {
        const metrics = this.getPerformanceMetrics();
        if (!metrics) return [];

        return this.dataProcessor.analyzeBottlenecks(metrics, this.state.architecture);
    }
}

// Data Validation Utility
class GPUDataValidator {
    validateTelemetry(data) {
        if (!data || typeof data !== 'object') return false;
        
        const required = ['utilGPU', 'utilMemory', 'temperature', 'power'];
        for (const field of required) {
            if (typeof data[field] !== 'number' || isNaN(data[field])) {
                return false;
            }
        }

        // Range validation
        if (data.utilGPU < 0 || data.utilGPU > 100) return false;
        if (data.utilMemory < 0 || data.utilMemory > 100) return false;
        if (data.temperature < 0 || data.temperature > 120) return false;
        if (data.power < 0 || data.power > 1000) return false;

        return true;
    }
}

// Data Processing Utility
class GPUDataProcessor {
    processTelemetry(newData, previousData) {
        // Apply smoothing for noisy metrics
        const smoothingFactor = 0.1;
        
        const processed = { ...newData };
        
        if (previousData) {
            // Smooth temperature readings
            processed.temperature = this.exponentialSmoothing(
                newData.temperature, 
                previousData.temperature, 
                smoothingFactor
            );
            
            // Smooth power readings
            processed.power = this.exponentialSmoothing(
                newData.power,
                previousData.power,
                smoothingFactor * 2 // Power can change faster
            );
        }

        return processed;
    }

    exponentialSmoothing(newValue, oldValue, factor) {
        return oldValue + factor * (newValue - oldValue);
    }

    calculatePerformanceMetrics(dataPoints) {
        const metrics = {
            avgGPUUtil: 0,
            maxGPUUtil: 0,
            avgMemUtil: 0,
            maxMemUtil: 0,
            avgTemperature: 0,
            maxTemperature: 0,
            avgPower: 0,
            maxPower: 0,
            utilVariance: 0,
            thermalEfficiency: 0
        };

        if (dataPoints.length === 0) return metrics;

        // Calculate averages and maximums
        let sumGPU = 0, sumMem = 0, sumTemp = 0, sumPower = 0;
        
        for (const point of dataPoints) {
            sumGPU += point.utilGPU;
            sumMem += point.utilMemory;
            sumTemp += point.temperature;
            sumPower += point.power;
            
            metrics.maxGPUUtil = Math.max(metrics.maxGPUUtil, point.utilGPU);
            metrics.maxMemUtil = Math.max(metrics.maxMemUtil, point.utilMemory);
            metrics.maxTemperature = Math.max(metrics.maxTemperature, point.temperature);
            metrics.maxPower = Math.max(metrics.maxPower, point.power);
        }

        const count = dataPoints.length;
        metrics.avgGPUUtil = sumGPU / count;
        metrics.avgMemUtil = sumMem / count;
        metrics.avgTemperature = sumTemp / count;
        metrics.avgPower = sumPower / count;

        // Calculate variance in utilization
        let varianceSum = 0;
        for (const point of dataPoints) {
            varianceSum += Math.pow(point.utilGPU - metrics.avgGPUUtil, 2);
        }
        metrics.utilVariance = varianceSum / count;

        // Calculate thermal efficiency (performance per degree)
        metrics.thermalEfficiency = metrics.avgGPUUtil / Math.max(1, metrics.avgTemperature - 20);

        return metrics;
    }

    analyzeBottlenecks(metrics, architecture) {
        const bottlenecks = [];

        // GPU utilization bottleneck
        if (metrics.avgGPUUtil > 95) {
            bottlenecks.push({
                type: 'gpu_saturated',
                severity: 'high',
                description: 'GPU compute units are fully saturated',
                recommendation: 'Consider reducing compute workload or optimizing algorithms'
            });
        }

        // Memory bottleneck
        if (metrics.avgMemUtil > 90) {
            bottlenecks.push({
                type: 'memory_saturated',
                severity: 'high',
                description: 'GPU memory bandwidth is saturated',
                recommendation: 'Optimize memory access patterns or reduce data movement'
            });
        }

        // Thermal throttling
        if (metrics.maxTemperature > 83) {
            bottlenecks.push({
                type: 'thermal_throttling',
                severity: 'medium',
                description: 'GPU may be thermally throttling',
                recommendation: 'Improve cooling or reduce power target'
            });
        }

        // Power limitation
        if (metrics.avgPower > architecture.maxPower * 0.95) {
            bottlenecks.push({
                type: 'power_limited',
                severity: 'medium',
                description: 'GPU is hitting power limits',
                recommendation: 'Increase power target or optimize for efficiency'
            });
        }

        // Utilization inconsistency
        if (metrics.utilVariance > 1000) {
            bottlenecks.push({
                type: 'inconsistent_load',
                severity: 'low',
                description: 'GPU utilization is highly variable',
                recommendation: 'Check for CPU bottlenecks or optimize workload distribution'
            });
        }

        return bottlenecks;
    }
}
