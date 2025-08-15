// Application Controller - Orchestrates Model and View interactions
import { GPUDataModel } from '../models/GPUDataModel.js';
import { GPUVisualizationView } from '../views/GPUVisualizationView.js';
import { NSightReportParser } from '../parsers/NSightReportParser.js';
import { PerformanceAnalyzer } from '../analyzers/PerformanceAnalyzer.js';

export class AppController {
    constructor() {
        this.model = null;
        this.view = null;
        
        // Specialized components
        this.nsightParser = new NSightReportParser();
        this.performanceAnalyzer = new PerformanceAnalyzer();
        
        // Application state
        this.appState = {
            isInitialized: false,
            isRecording: false,
            recordingData: [],
            analysisMode: 'realtime',
            currentReport: null,
            autoAnalysis: true
        };

        // Performance monitoring
        this.performanceMonitor = {
            frameCount: 0,
            lastFrameTime: 0,
            updateInterval: 100,
            lastUpdateTime: 0
        };

        // Command pattern for undo/redo functionality
        this.commandHistory = [];
        this.commandIndex = -1;
        
        // Event bindings
        this.boundMethods = this.bindMethods();
    }

    bindMethods() {
        return {
            onTelemetryUpdated: this.onTelemetryUpdated.bind(this),
            onConnectionStateChanged: this.onConnectionStateChanged.bind(this),
            onArchitectureLoaded: this.onArchitectureLoaded.bind(this),
            onStreamingStateChanged: this.onStreamingStateChanged.bind(this),
            onVisualizationInteraction: this.onVisualizationInteraction.bind(this)
        };
    }

    // Initialization
    async initialize() {
        try {
            console.log('Initializing Application Controller...');
            
            // Initialize Model
            this.model = new GPUDataModel();
            this.setupModelEventListeners();
            
            // Initialize View
            this.view = new GPUVisualizationView();
            await this.view.initialize();
            this.setupViewEventListeners();
            
            // Setup UI event listeners
            this.setupUIEventListeners();
            
            // Initialize specialized components
            await this.initializeAnalyzers();
            
            this.appState.isInitialized = true;
            this.startUpdateLoop();
            
            console.log('Application Controller initialized successfully');
            
            // Show welcome notification
            this.showNotification('NSightful GPU Visualizer ready', 'success');
            
        } catch (error) {
            console.error('Failed to initialize Application Controller:', error);
            this.showNotification('Failed to initialize application', 'error');
            throw error;
        }
    }

    setupModelEventListeners() {
        this.model.addEventListener('telemetryUpdated', this.boundMethods.onTelemetryUpdated);
        this.model.addEventListener('connectionStateChanged', this.boundMethods.onConnectionStateChanged);
        this.model.addEventListener('architectureLoaded', this.boundMethods.onArchitectureLoaded);
        this.model.addEventListener('streamingStateChanged', this.boundMethods.onStreamingStateChanged);
    }

    setupViewEventListeners() {
        this.view.addEventListener('visualizationInteraction', this.boundMethods.onVisualizationInteraction);
    }

    setupUIEventListeners() {
        // GPU connection controls
        const connectBtn = document.getElementById('connectBtn');
        if (connectBtn) {
            connectBtn.addEventListener('click', () => this.handleGPUConnection());
        }

        // Recording controls
        const recordBtn = document.getElementById('recordBtn');
        if (recordBtn) {
            recordBtn.addEventListener('click', () => this.handleRecordingToggle());
        }

        // Nsight report loading
        const loadReportBtn = document.getElementById('loadReportBtn');
        if (loadReportBtn) {
            loadReportBtn.addEventListener('click', () => this.handleLoadNsightReport());
        }

        // Visualization controls
        this.setupVisualizationControls();
    }

    setupVisualizationControls() {
        const controls = ['showSMs', 'showMemory', 'showTensors', 'realTimeMode'];
        
        controls.forEach(controlId => {
            const element = document.getElementById(controlId);
            if (element) {
                element.addEventListener('change', (e) => {
                    this.handleVisualizationSetting(controlId, e.target.checked);
                });
            }
        });
    }

    async initializeAnalyzers() {
        try {
            await this.performanceAnalyzer.initialize();
            console.log('Performance analyzer initialized');
        } catch (error) {
            console.warn('Failed to initialize performance analyzer:', error);
        }
    }

    // Event Handlers
    onTelemetryUpdated(event) {
        const { current, history } = event;
        
        // Update visualization
        this.view.updateVisualization(current);
        this.view.updatePerformanceCharts(current, history);
        
        // Record data if recording is active
        if (this.appState.isRecording) {
            this.recordTelemetryData(current);
        }
        
        // Perform real-time analysis
        if (this.appState.autoAnalysis) {
            this.performRealtimeAnalysis(current, history);
        }
    }

    onConnectionStateChanged(event) {
        const { connected, connecting, error, devices } = event;
        
        // Update UI state
        this.updateConnectionUI(connected, connecting, error);
        
        // Update status bar
        const statusElement = document.getElementById('connection-status');
        if (statusElement) {
            if (connecting) {
                statusElement.textContent = 'Connecting...';
                statusElement.className = 'connecting';
            } else if (connected) {
                statusElement.textContent = 'Connected';
                statusElement.className = 'connected';
            } else {
                statusElement.textContent = error || 'Disconnected';
                statusElement.className = 'disconnected';
            }
        }

        // Show notification
        if (connected) {
            const deviceCount = devices ? devices.length : 0;
            this.showNotification(`Connected to ${deviceCount} GPU(s)`, 'success');
        } else if (error) {
            this.showNotification(`Connection failed: ${error}`, 'error');
        }
    }

    onArchitectureLoaded(architecture) {
        console.log('GPU Architecture loaded:', architecture);
        
        // Update UI with architecture information
        this.updateArchitectureDisplay(architecture);
        
        // Configure visualization based on architecture
        this.view.configureForArchitecture(architecture);
        
        // Initialize performance baselines
        this.performanceAnalyzer.setArchitectureBaseline(architecture);
    }

    onStreamingStateChanged(event) {
        const { enabled, periodMs } = event;
        
        console.log(`Telemetry streaming ${enabled ? 'started' : 'stopped'}`, 
                   enabled ? `(${periodMs}ms interval)` : '');
        
        if (enabled) {
            this.showNotification('Real-time telemetry started', 'info');
        } else {
            this.showNotification('Real-time telemetry stopped', 'info');
        }
    }

    onVisualizationInteraction(event) {
        const { type, target, data } = event;
        
        switch (type) {
            case 'sm_clicked':
                this.handleSMInteraction(target, data);
                break;
            case 'memory_clicked':
                this.handleMemoryInteraction(target, data);
                break;
            case 'tensor_clicked':
                this.handleTensorInteraction(target, data);
                break;
        }
    }

    // GPU Connection Management
    async handleGPUConnection() {
        const connectBtn = document.getElementById('connectBtn');
        const isConnected = this.model.getConnectionState().connected;
        
        if (isConnected) {
            await this.disconnectGPU();
        } else {
            await this.connectToGPU();
        }
    }

    async connectToGPU() {
        try {
            const connectBtn = document.getElementById('connectBtn');
            connectBtn.disabled = true;
            connectBtn.textContent = 'Connecting...';
            
            const success = await this.model.connectToGPU();
            
            if (success) {
                connectBtn.textContent = 'Disconnect GPU';
                connectBtn.classList.remove('primary');
                connectBtn.classList.add('secondary');
                
                // Start telemetry streaming
                await this.model.startTelemetryStream(100);
            } else {
                throw new Error('Failed to connect to GPU');
            }
            
        } catch (error) {
            console.error('GPU connection failed:', error);
            this.showNotification(`Connection failed: ${error.message}`, 'error');
            
            const connectBtn = document.getElementById('connectBtn');
            connectBtn.textContent = 'Connect GPU';
            connectBtn.classList.add('primary');
            connectBtn.classList.remove('secondary');
        } finally {
            const connectBtn = document.getElementById('connectBtn');
            connectBtn.disabled = false;
        }
    }

    async disconnectGPU() {
        try {
            this.model.stopTelemetryStream();
            
            const connectBtn = document.getElementById('connectBtn');
            connectBtn.textContent = 'Connect GPU';
            connectBtn.classList.add('primary');
            connectBtn.classList.remove('secondary');
            
            this.showNotification('Disconnected from GPU', 'info');
        } catch (error) {
            console.error('Disconnection error:', error);
            this.showNotification(`Disconnection error: ${error.message}`, 'error');
        }
    }

    // Recording Management
    handleRecordingToggle() {
        if (this.appState.isRecording) {
            this.stopRecording();
        } else {
            this.startRecording();
        }
    }

    startRecording() {
        this.appState.isRecording = true;
        this.appState.recordingData = [];
        
        const recordBtn = document.getElementById('recordBtn');
        recordBtn.textContent = 'Stop Recording';
        recordBtn.classList.add('recording');
        
        this.showNotification('Recording session started', 'info');
        
        // Add visual indicator to the interface
        this.addRecordingIndicator();
    }

    stopRecording() {
        this.appState.isRecording = false;
        
        const recordBtn = document.getElementById('recordBtn');
        recordBtn.textContent = 'Record Session';
        recordBtn.classList.remove('recording');
        
        this.showNotification(
            `Recording stopped. Captured ${this.appState.recordingData.length} samples`, 
            'success'
        );
        
        // Remove visual indicator
        this.removeRecordingIndicator();
        
        // Offer to save or analyze the recorded data
        this.promptRecordingActions();
    }

    recordTelemetryData(telemetryData) {
        this.appState.recordingData.push({
            timestamp: Date.now(),
            ...telemetryData
        });
        
        // Limit recorded data to prevent memory issues
        if (this.appState.recordingData.length > 10000) {
            this.appState.recordingData.shift();
        }
    }

    addRecordingIndicator() {
        // Add a red recording dot to the interface
        const indicator = document.createElement('div');
        indicator.id = 'recording-indicator';
        indicator.className = 'recording-indicator pulse';
        indicator.innerHTML = '● REC';
        
        const header = document.querySelector('.header');
        if (header) {
            header.appendChild(indicator);
        }
    }

    removeRecordingIndicator() {
        const indicator = document.getElementById('recording-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    promptRecordingActions() {
        // In a real application, this would show a dialog with options
        console.log('Recording saved. Analysis options available.');
        
        // Auto-analyze if enabled
        if (this.appState.autoAnalysis && this.appState.recordingData.length > 0) {
            this.analyzeRecordedSession();
        }
    }

    // Nsight Report Management
    async handleLoadNsightReport() {
        try {
            // In a real implementation, this would open a file dialog
            // For now, simulate loading a report
            this.showNotification('Loading Nsight report...', 'info');
            
            // Simulate file loading delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Parse simulated report data
            const mockReportData = this.generateMockNsightReport();
            const parsedReport = await this.nsightParser.parseReport(mockReportData);
            
            this.appState.currentReport = parsedReport;
            
            // Update UI with report analysis
            this.displayNsightAnalysis(parsedReport);
            
            this.showNotification('Nsight report loaded successfully', 'success');
            
        } catch (error) {
            console.error('Failed to load Nsight report:', error);
            this.showNotification(`Failed to load report: ${error.message}`, 'error');
        }
    }

    generateMockNsightReport() {
        // Generate mock Nsight Compute report data for demonstration
        return {
            metadata: {
                gpuName: 'NVIDIA RTX 4090',
                driverVersion: '537.13',
                cudaVersion: '12.3',
                applicationName: 'sample_app',
                timestamp: new Date().toISOString()
            },
            kernels: [
                {
                    name: 'vectorAdd',
                    gridSize: [1024, 1, 1],
                    blockSize: [256, 1, 1],
                    metrics: {
                        achievedOccupancy: 0.85,
                        smEfficiency: 78.5,
                        memoryEfficiency: 92.3,
                        computeThroughput: 65.2,
                        memoryThroughput: 88.7,
                        l1CacheHitRate: 95.2,
                        l2CacheHitRate: 87.4
                    },
                    bottlenecks: [
                        {
                            type: 'compute',
                            severity: 'medium',
                            description: 'SM utilization could be improved',
                            recommendation: 'Consider increasing grid size or optimizing kernel launch parameters'
                        }
                    ]
                },
                {
                    name: 'matrixMultiply',
                    gridSize: [512, 512, 1],
                    blockSize: [16, 16, 1],
                    metrics: {
                        achievedOccupancy: 0.92,
                        smEfficiency: 95.8,
                        memoryEfficiency: 45.6,
                        computeThroughput: 87.3,
                        memoryThroughput: 34.5,
                        l1CacheHitRate: 23.7,
                        l2CacheHitRate: 78.9
                    },
                    bottlenecks: [
                        {
                            type: 'memory',
                            severity: 'high',
                            description: 'Memory bandwidth is the primary bottleneck',
                            recommendation: 'Optimize memory access patterns or use shared memory'
                        }
                    ]
                }
            ],
            recommendations: [
                'Consider using tensor cores for mixed-precision operations',
                'Optimize memory coalescing for better bandwidth utilization',
                'Increase occupancy by adjusting block size configuration'
            ]
        };
    }

    async displayNsightAnalysis(report) {
        const analysisContainer = document.querySelector('.analysis-results');
        if (!analysisContainer) return;

        // Clear previous content
        analysisContainer.innerHTML = '';

        // Create analysis summary
        const summary = document.createElement('div');
        summary.className = 'analysis-summary';
        summary.innerHTML = `
            <h4>Report Summary</h4>
            <p><strong>GPU:</strong> ${report.metadata.gpuName}</p>
            <p><strong>Kernels analyzed:</strong> ${report.kernels.length}</p>
            <p><strong>Analysis date:</strong> ${new Date(report.metadata.timestamp).toLocaleString()}</p>
        `;
        analysisContainer.appendChild(summary);

        // Create kernel analysis sections
        report.kernels.forEach((kernel, index) => {
            const kernelSection = this.createKernelAnalysisSection(kernel, index);
            analysisContainer.appendChild(kernelSection);
        });

        // Update bottleneck detection
        this.updateBottleneckDisplay(report);
    }

    createKernelAnalysisSection(kernel, index) {
        const section = document.createElement('div');
        section.className = 'kernel-analysis';
        section.innerHTML = `
            <h5>${kernel.name}</h5>
            <div class="metrics-grid">
                <div class="metric">
                    <span class="metric-label">SM Efficiency:</span>
                    <span class="metric-value">${kernel.metrics.smEfficiency.toFixed(1)}%</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Memory Efficiency:</span>
                    <span class="metric-value">${kernel.metrics.memoryEfficiency.toFixed(1)}%</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Occupancy:</span>
                    <span class="metric-value">${(kernel.metrics.achievedOccupancy * 100).toFixed(1)}%</span>
                </div>
            </div>
        `;

        // Add bottlenecks for this kernel
        if (kernel.bottlenecks && kernel.bottlenecks.length > 0) {
            const bottlenecksDiv = document.createElement('div');
            bottlenecksDiv.className = 'kernel-bottlenecks';
            bottlenecksDiv.innerHTML = '<h6>Bottlenecks:</h6>';
            
            kernel.bottlenecks.forEach(bottleneck => {
                const bottleneckItem = document.createElement('div');
                bottleneckItem.className = `bottleneck-item ${bottleneck.severity}`;
                bottleneckItem.innerHTML = `
                    <span class="severity ${bottleneck.severity}">${bottleneck.severity.toUpperCase()}</span>
                    <span class="description">${bottleneck.description}</span>
                `;
                bottlenecksDiv.appendChild(bottleneckItem);
            });
            
            section.appendChild(bottlenecksDiv);
        }

        return section;
    }

    updateBottleneckDisplay(report) {
        const bottleneckContainer = document.getElementById('bottlenecks');
        if (!bottleneckContainer) return;

        // Clear existing bottlenecks
        bottleneckContainer.innerHTML = '';

        // Collect all bottlenecks from all kernels
        const allBottlenecks = [];
        report.kernels.forEach(kernel => {
            if (kernel.bottlenecks) {
                allBottlenecks.push(...kernel.bottlenecks.map(b => ({
                    ...b,
                    kernel: kernel.name
                })));
            }
        });

        // Display bottlenecks
        if (allBottlenecks.length === 0) {
            const noBottlenecks = document.createElement('div');
            noBottlenecks.className = 'bottleneck-item';
            noBottlenecks.innerHTML = `
                <span class="severity low">INFO</span>
                <span class="message">No significant bottlenecks detected</span>
            `;
            bottleneckContainer.appendChild(noBottlenecks);
        } else {
            allBottlenecks.forEach(bottleneck => {
                const item = document.createElement('div');
                item.className = 'bottleneck-item';
                item.innerHTML = `
                    <span class="severity ${bottleneck.severity}">${bottleneck.severity.toUpperCase()}</span>
                    <span class="message">${bottleneck.description} (${bottleneck.kernel})</span>
                `;
                bottleneckContainer.appendChild(item);
            });
        }
    }

    // Visualization Control Handlers
    handleVisualizationSetting(setting, value) {
        this.view.updateVisualizationSettings(setting, value);
        console.log(`Visualization setting '${setting}' set to:`, value);
    }

    handleSMInteraction(smMesh, data) {
        console.log('SM interaction:', smMesh.userData, data);
        
        // Show detailed SM information
        this.showSMDetails(smMesh);
    }

    handleMemoryInteraction(memoryMesh, data) {
        console.log('Memory interaction:', memoryMesh.userData, data);
        
        // Show memory block details
        this.showMemoryDetails(memoryMesh);
    }

    handleTensorInteraction(tensorMesh, data) {
        console.log('Tensor core interaction:', tensorMesh.userData, data);
        
        // Show tensor core details
        this.showTensorDetails(tensorMesh);
    }

    showSMDetails(smMesh) {
        const details = {
            id: smMesh.userData.id,
            utilization: (smMesh.userData.utilization * 100).toFixed(1),
            active: smMesh.userData.active,
            position: `${smMesh.userData.row}, ${smMesh.userData.col}`
        };

        // In a real implementation, this would show a popup or panel
        console.log('SM Details:', details);
        
        this.showNotification(
            `SM ${details.id}: ${details.utilization}% utilization`, 
            'info'
        );
    }

    showMemoryDetails(memoryMesh) {
        const details = {
            id: memoryMesh.userData.id,
            usage: (memoryMesh.userData.usage * 100).toFixed(1),
            bandwidth: memoryMesh.userData.bandwidth.toFixed(1),
            active: memoryMesh.userData.active
        };

        console.log('Memory Details:', details);
        
        this.showNotification(
            `Memory ${details.id}: ${details.usage}% usage, ${details.bandwidth} GB/s`, 
            'info'
        );
    }

    showTensorDetails(tensorMesh) {
        const details = {
            id: tensorMesh.userData.id,
            active: tensorMesh.userData.active,
            workload: (tensorMesh.userData.workload * 100).toFixed(1),
            smId: tensorMesh.userData.smId
        };

        console.log('Tensor Core Details:', details);
        
        this.showNotification(
            `Tensor ${details.id}: ${details.active ? 'Active' : 'Idle'} (${details.workload}%)`, 
            'info'
        );
    }

    // Performance Analysis
    performRealtimeAnalysis(currentTelemetry, history) {
        if (history.length < 10) return; // Need enough data for analysis
        
        // Perform bottleneck detection
        const bottlenecks = this.model.detectBottlenecks();
        
        if (bottlenecks.length > 0) {
            this.updateRealtimeBottlenecks(bottlenecks);
        }
        
        // Analyze performance trends
        const trends = this.performanceAnalyzer.analyzeTrends(history);
        this.updatePerformanceTrends(trends);
    }

    updateRealtimeBottlenecks(bottlenecks) {
        const bottleneckContainer = document.getElementById('bottlenecks');
        if (!bottleneckContainer) return;

        // Only update if bottlenecks have changed significantly
        const currentBottleneckTypes = bottlenecks.map(b => b.type);
        if (JSON.stringify(currentBottleneckTypes) === JSON.stringify(this.lastBottleneckTypes)) {
            return;
        }
        this.lastBottleneckTypes = currentBottleneckTypes;

        bottleneckContainer.innerHTML = '';
        
        if (bottlenecks.length === 0) {
            const noneItem = document.createElement('div');
            noneItem.className = 'bottleneck-item';
            noneItem.innerHTML = `
                <span class="severity low">INFO</span>
                <span class="message">No bottlenecks detected</span>
            `;
            bottleneckContainer.appendChild(noneItem);
        } else {
            bottlenecks.forEach(bottleneck => {
                const item = document.createElement('div');
                item.className = 'bottleneck-item';
                item.innerHTML = `
                    <span class="severity ${bottleneck.severity}">${bottleneck.severity.toUpperCase()}</span>
                    <span class="message">${bottleneck.description}</span>
                `;
                bottleneckContainer.appendChild(item);
            });
        }
    }

    updatePerformanceTrends(trends) {
        // Update timeline visualization or other trend displays
        console.log('Performance trends:', trends);
    }

    analyzeRecordedSession() {
        if (this.appState.recordingData.length === 0) return;
        
        console.log('Analyzing recorded session...');
        
        const analysis = this.performanceAnalyzer.analyzeSession(this.appState.recordingData);
        this.displaySessionAnalysis(analysis);
    }

    displaySessionAnalysis(analysis) {
        // Display session analysis results
        console.log('Session analysis results:', analysis);
        
        this.showNotification('Session analysis complete', 'success');
    }

    // UI Helper Methods
    updateConnectionUI(connected, connecting, error) {
        const connectBtn = document.getElementById('connectBtn');
        if (!connectBtn) return;

        if (connecting) {
            connectBtn.disabled = true;
            connectBtn.textContent = 'Connecting...';
        } else if (connected) {
            connectBtn.disabled = false;
            connectBtn.textContent = 'Disconnect GPU';
            connectBtn.classList.remove('primary');
            connectBtn.classList.add('secondary');
        } else {
            connectBtn.disabled = false;
            connectBtn.textContent = 'Connect GPU';
            connectBtn.classList.add('primary');
            connectBtn.classList.remove('secondary');
        }
    }

    updateArchitectureDisplay(architecture) {
        // Update UI elements with architecture information
        const gpuNameElement = document.getElementById('gpu-name');
        if (gpuNameElement) {
            gpuNameElement.textContent = architecture.name || 'Unknown GPU';
        }
    }

    // Main Update Loop
    startUpdateLoop() {
        const update = (timestamp) => {
            if (this.appState.isInitialized) {
                this.updatePerformanceMetrics(timestamp);
            }
            requestAnimationFrame(update);
        };
        requestAnimationFrame(update);
    }

    updatePerformanceMetrics(timestamp) {
        // Update frame time calculation
        if (this.performanceMonitor.lastUpdateTime === 0) {
            this.performanceMonitor.lastUpdateTime = timestamp;
        }

        const deltaTime = timestamp - this.performanceMonitor.lastUpdateTime;
        
        if (deltaTime >= this.performanceMonitor.updateInterval) {
            const frameTime = deltaTime / Math.max(1, this.performanceMonitor.frameCount);
            
            // Update frame time display
            const frameTimeElement = document.getElementById('frame-time');
            if (frameTimeElement) {
                frameTimeElement.textContent = `Frame Time: ${frameTime.toFixed(2)} ms`;
            }
            
            this.performanceMonitor.frameCount = 0;
            this.performanceMonitor.lastUpdateTime = timestamp;
        }
        
        this.performanceMonitor.frameCount++;
    }

    // Notification System
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '1rem 1.5rem',
            borderRadius: '6px',
            zIndex: '1000',
            opacity: '0',
            transform: 'translateX(100%)',
            transition: 'all 0.3s ease',
            fontSize: '0.9rem',
            fontWeight: '500'
        });

        // Set type-specific styles
        switch (type) {
            case 'success':
                notification.style.background = 'rgba(0, 255, 136, 0.2)';
                notification.style.border = '1px solid var(--accent-primary)';
                notification.style.color = 'var(--accent-primary)';
                break;
            case 'error':
                notification.style.background = 'rgba(255, 107, 107, 0.2)';
                notification.style.border = '1px solid var(--accent-tertiary)';
                notification.style.color = 'var(--accent-tertiary)';
                break;
            case 'warning':
                notification.style.background = 'rgba(255, 193, 7, 0.2)';
                notification.style.border = '1px solid #ffc107';
                notification.style.color = '#ffc107';
                break;
            default:
                notification.style.background = 'rgba(0, 136, 255, 0.2)';
                notification.style.border = '1px solid var(--accent-secondary)';
                notification.style.color = 'var(--accent-secondary)';
        }

        document.body.appendChild(notification);

        // Animate in
        requestAnimationFrame(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        });

        // Auto remove after 4 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }

    // Cleanup
    destroy() {
        if (this.model) {
            this.model.stopTelemetryStream();
        }
        
        // Remove event listeners
        // Clean up resources
        console.log('Application Controller destroyed');
    }
}
