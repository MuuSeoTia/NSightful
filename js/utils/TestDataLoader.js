// Test Data Loader for NSight Reports and GPU Scenarios
export class TestDataLoader {
    constructor() {
        this.testData = null;
        this.currentScenario = null;
    }

    async loadTestData() {
        try {
            const response = await fetch('./test-data/nsight-reports.json');
            this.testData = await response.json();
            console.log('Test data loaded successfully:', this.testData);
            return this.testData;
        } catch (error) {
            console.error('Failed to load test data:', error);
            // Fallback to embedded test data
            return this.getFallbackTestData();
        }
    }

    getFallbackTestData() {
        // Embedded fallback test data for when file loading fails
        return {
            reports: [
                {
                    id: "fallback_001",
                    name: "Gaming Workload Demo",
                    gpu_info: {
                        name: "NVIDIA GeForce RTX 4090",
                        sm_count: 128
                    },
                    kernels: [{
                        name: "render_kernel",
                        sm_utilization: {
                            active_sms: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
                            utilization_percentages: [85, 87, 84, 86, 85, 87, 84, 86, 85, 87, 84, 86, 85, 87, 84, 86]
                        }
                    }],
                    tensor_cores: {
                        utilization_percent: 45.7,
                        active_units: [0, 1, 2, 3]
                    },
                    rt_cores: {
                        utilization_percent: 82.1,
                        active_units: [0, 1, 2, 3, 4, 5, 6, 7]
                    }
                }
            ],
            test_scenarios: [
                {
                    name: "Gaming Workload",
                    active_components: {
                        sms: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
                        tensor_cores: [0, 1, 2, 3],
                        rt_cores: [0, 1, 2, 3, 4, 5, 6, 7]
                    },
                    intensity: {
                        sm_utilization: 75.3,
                        tensor_utilization: 45.7,
                        rt_utilization: 82.1
                    }
                }
            ]
        };
    }

    getScenarioByName(scenarioName) {
        if (!this.testData) return null;
        
        const scenarioMap = {
            'gaming': 'Gaming Workload',
            'ml': 'ML Training',
            'crypto': 'Crypto Mining',
            'raytracing': 'Ray Tracing Benchmark'
        };

        const fullName = scenarioMap[scenarioName] || scenarioName;
        return this.testData.test_scenarios?.find(s => s.name === fullName) || 
               this.testData.reports?.find(r => r.name.includes(fullName));
    }

    getReportByName(reportName) {
        if (!this.testData) return null;
        return this.testData.reports?.find(r => r.name === reportName || r.id === reportName);
    }

    simulateComponentActivity(scenarioName) {
        const scenario = this.getScenarioByName(scenarioName);
        if (!scenario) return null;

        // Generate real-time component activity based on scenario
        const activityData = {
            timestamp: Date.now(),
            scenario: scenarioName,
            components: {
                sms: this.generateSMActivity(scenario),
                tensorCores: this.generateTensorActivity(scenario),
                rtCores: this.generateRTActivity(scenario),
                memoryControllers: this.generateMemoryActivity(scenario)
            },
            metrics: {
                gpuUtilization: scenario.intensity?.sm_utilization || 0,
                tensorUtilization: scenario.intensity?.tensor_utilization || 0,
                rtUtilization: scenario.intensity?.rt_utilization || 0,
                memoryUtilization: scenario.intensity?.memory_utilization || 0
            }
        };

        return activityData;
    }

    generateSMActivity(scenario) {
        const smActivity = [];
        const activeSMs = scenario.active_components?.sms || [];
        const baseUtilization = scenario.intensity?.sm_utilization || 50;

        for (let i = 0; i < 128; i++) {
            const isActive = activeSMs.includes(i);
            const utilization = isActive ? 
                baseUtilization + (Math.random() - 0.5) * 20 : 
                Math.random() * 10;
            
            smActivity.push({
                id: i,
                active: isActive,
                utilization: Math.max(0, Math.min(100, utilization)),
                temperature: 45 + utilization * 0.3 + Math.random() * 5,
                powerDraw: utilization * 2.5 + Math.random() * 10
            });
        }

        return smActivity;
    }

    generateTensorActivity(scenario) {
        const tensorActivity = [];
        const activeTensors = scenario.active_components?.tensor_cores || [];
        const baseUtilization = scenario.intensity?.tensor_utilization || 0;

        for (let i = 0; i < 32; i++) {
            const isActive = activeTensors.includes(i);
            const utilization = isActive ? 
                baseUtilization + (Math.random() - 0.5) * 15 : 0;
            
            tensorActivity.push({
                id: i,
                active: isActive,
                utilization: Math.max(0, Math.min(100, utilization)),
                operationsPerSecond: utilization * 1000000000, // TOPS simulation
                efficiency: isActive ? 85 + Math.random() * 10 : 0
            });
        }

        return tensorActivity;
    }

    generateRTActivity(scenario) {
        const rtActivity = [];
        const activeRTCores = scenario.active_components?.rt_cores || [];
        const baseUtilization = scenario.intensity?.rt_utilization || 0;

        for (let i = 0; i < 84; i++) {
            const isActive = activeRTCores.includes(i);
            const utilization = isActive ? 
                baseUtilization + (Math.random() - 0.5) * 20 : 0;
            
            rtActivity.push({
                id: i,
                active: isActive,
                utilization: Math.max(0, Math.min(100, utilization)),
                raysPerSecond: utilization * 1000000, // Rays/sec simulation
                intersectionRate: isActive ? 70 + Math.random() * 20 : 0
            });
        }

        return rtActivity;
    }

    generateMemoryActivity(scenario) {
        const memoryActivity = [];
        const baseUtilization = scenario.intensity?.memory_utilization || 50;

        for (let i = 0; i < 12; i++) {
            const utilization = baseUtilization + (Math.random() - 0.5) * 30;
            
            memoryActivity.push({
                id: i,
                utilization: Math.max(0, Math.min(100, utilization)),
                bandwidth: utilization * 8, // GB/s per controller
                temperature: 40 + utilization * 0.4 + Math.random() * 3
            });
        }

        return memoryActivity;
    }

    startRealtimeSimulation(scenarioName, callback, intervalMs = 100) {
        this.currentScenario = scenarioName;
        
        const simulationLoop = () => {
            const activityData = this.simulateComponentActivity(scenarioName);
            if (activityData && callback) {
                callback(activityData);
            }
        };

        // Start immediately
        simulationLoop();
        
        // Continue at intervals
        return setInterval(simulationLoop, intervalMs);
    }

    stopRealtimeSimulation(intervalId) {
        if (intervalId) {
            clearInterval(intervalId);
        }
        this.currentScenario = null;
    }

    // Performance analysis helpers
    analyzePerformanceBottlenecks(activityData) {
        const bottlenecks = [];
        
        if (activityData.metrics.gpuUtilization > 95) {
            bottlenecks.push({
                type: 'compute_saturated',
                severity: 'high',
                description: 'GPU compute units are fully saturated',
                recommendation: 'Consider workload optimization or load balancing'
            });
        }

        if (activityData.metrics.memoryUtilization > 90) {
            bottlenecks.push({
                type: 'memory_bandwidth',
                severity: 'high',
                description: 'Memory bandwidth is saturated',
                recommendation: 'Optimize memory access patterns'
            });
        }

        if (activityData.metrics.tensorUtilization < 20 && activityData.scenario === 'ml') {
            bottlenecks.push({
                type: 'underutilized_tensors',
                severity: 'medium',
                description: 'Tensor cores are underutilized for ML workload',
                recommendation: 'Optimize for mixed precision or tensor operations'
            });
        }

        return bottlenecks;
    }

    // Export data for analysis
    exportActivityLog(activityHistory) {
        const exportData = {
            metadata: {
                exportTime: new Date().toISOString(),
                scenario: this.currentScenario,
                sampleCount: activityHistory.length
            },
            activityLog: activityHistory
        };

        return JSON.stringify(exportData, null, 2);
    }
}

export default TestDataLoader;
