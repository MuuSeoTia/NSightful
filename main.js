// NSightful GPU Visualizer - Professional Multi-Page Application
import { NavigationManager } from './js/utils/NavigationManager.js';
import { TestDataLoader } from './js/utils/TestDataLoader.js';
import { GPUDataModel } from './js/models/GPUDataModel.js';
import { IndustrialGPUVisualization } from './js/views/IndustrialGPUVisualization.js';

class NSightfulApp {
    constructor() {
        this.navigationManager = null;
        this.dataModel = null;
        this.testDataLoader = null;
        this.visualization = null;
        this.fullVisualization = null;
        this.isInitialized = false;
        this.updateInterval = null;
    }

    async init() {
        try {
            console.log('🚀 Initializing NSightful GPU Visualizer...');
            
            // Initialize core components
            await this.initializeComponents();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize navigation system
            this.initializeNavigation();
            
            // Start the application
            await this.startApplication();
            
            this.isInitialized = true;
            console.log('✅ NSightful GPU Visualizer initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize NSightful GPU Visualizer:', error);
            this.showErrorMessage('Failed to initialize application. Please refresh and try again.');
        }
    }

    async initializeComponents() {
        // Initialize data model
        this.dataModel = new GPUDataModel();
        console.log('📊 Data model initialized');

        // Initialize test data loader
        this.testDataLoader = new TestDataLoader();
        console.log('🧪 Test data loader initialized');

        // Initialize navigation manager
        this.navigationManager = new NavigationManager();
        console.log('🧭 Navigation manager initialized');
    }

    setupEventListeners() {
        // Navigation events
        document.addEventListener('nsightful:pageChanged', (e) => {
            this.handlePageChange(e.detail.pageId);
        });

        // Data events
        document.addEventListener('nsightful:loadTestData', () => {
            this.loadTestData();
        });

        document.addEventListener('nsightful:loadScenario', (e) => {
            this.loadScenario(e.detail.scenario);
        });

        document.addEventListener('nsightful:startMonitoring', () => {
            this.startMonitoring();
        });

        document.addEventListener('nsightful:resetView', () => {
            this.resetView();
        });
        
        // Add telemetry update listener
        if (this.dataModel) {
            this.dataModel.addEventListener('telemetryUpdate', (data) => {
                this.updateDashboard(data);
            });
        }

        // Visualization events
        document.addEventListener('nsightful:initializeFullVisualization', () => {
            this.initializeFullVisualization();
        });

        document.addEventListener('nsightful:visualizationControl', (e) => {
            this.handleVisualizationControl(e.detail.control, e.detail.value);
        });

        // Performance events
        document.addEventListener('nsightful:performanceControl', (e) => {
            this.handlePerformanceControl(e.detail.control, e.detail.value);
        });

        // Settings events
        document.addEventListener('nsightful:settingsChanged', (e) => {
            this.handleSettingsChange(e.detail);
        });

        // Connection button
        const connectBtn = document.getElementById('connectBtn');
        if (connectBtn) {
            connectBtn.addEventListener('click', () => {
                this.toggleConnection();
            });
        }
    }

    initializeNavigation() {
        this.navigationManager.initialize();
    }

    async startApplication() {
        // Initialize dashboard visualization
        await this.initializeDashboardVisualization();
        
        // Load test data (with error handling)
        try {
            console.log('✅ Loading test data...');
            // Simply call the method - it should exist
            await this.dataModel.loadTestData();
            console.log('✅ Test data loaded successfully');
        } catch (error) {
            console.warn('⚠️ Failed to load test data, continuing without it:', error);
            // Initialize a basic fallback
            if (!this.testDataLoader) {
                this.testDataLoader = new TestDataLoader();
            }
        }
        
        // Start UI updates
        this.startUIUpdates();
        
        // Update connection status
        this.updateConnectionStatus(false);
    }

    async initializeDashboardVisualization() {
        try {
            this.visualization = new IndustrialGPUVisualization();
            await this.visualization.initialize();
            console.log('🎨 Dashboard visualization initialized');
        } catch (error) {
            console.error('Failed to initialize dashboard visualization:', error);
            // Continue without 3D visualization for now
            this.visualization = null;
        }
    }

    async initializeFullVisualization() {
        if (this.fullVisualization) return;

        try {
            this.fullVisualization = new IndustrialGPUVisualization();
            
            // Temporarily change the container ID for full visualization
            const originalContainer = document.getElementById('gpu-visualization');
            const fullContainer = document.getElementById('gpu-visualization-full');
            
            if (fullContainer) {
                // Temporarily change ID
                fullContainer.id = 'gpu-visualization';
                await this.fullVisualization.initialize();
                fullContainer.id = 'gpu-visualization-full';
                
                // Restore original container ID
                if (originalContainer) {
                    originalContainer.id = 'gpu-visualization';
                }
                
                console.log('🎨 Full-screen visualization initialized');
            }
        } catch (error) {
            console.error('Failed to initialize full visualization:', error);
        }
    }

    async loadTestData() {
        try {
            this.showNotification('Loading test data...', 'info');
            await this.dataModel.loadTestData();
            this.showNotification('Test data loaded successfully', 'success');
        } catch (error) {
            console.error('Failed to load test data:', error);
            this.showNotification('Failed to load test data', 'error');
        }
    }

    async loadScenario(scenarioName) {
        try {
            if (!this.dataModel) {
                console.error('Data model not initialized');
                this.showNotification('Application not ready. Please wait...', 'warning');
                return;
            }
            
            if (!this.dataModel.loadTestScenario) {
                console.error('loadTestScenario method not available');
                this.showNotification('Test scenario loading not available', 'error');
                return;
            }
            
            this.showNotification(`Loading ${scenarioName} scenario...`, 'info');
            const success = await this.dataModel.loadTestScenario(scenarioName);
            
            if (success) {
                this.updateConnectionStatus(true);
                this.showNotification(`${scenarioName} scenario loaded successfully`, 'success');
            } else {
                this.showNotification('Failed to load scenario', 'error');
            }
        } catch (error) {
            console.error('Failed to load scenario:', error);
            this.showNotification('Failed to load scenario: ' + error.message, 'error');
        }
    }

    startMonitoring() {
        if (!this.dataModel.state.connected) {
            this.showNotification('Please connect to GPU first', 'warning');
            return;
        }
        
        this.showNotification('Monitoring started', 'success');
    }

    updateDashboard(telemetryData) {
        // Update dashboard stats with real-time data
        if (telemetryData) {
            const updateElement = (id, value, unit = '') => {
                const element = document.getElementById(id);
                if (element) element.textContent = value + unit;
            };
            
            updateElement('gpu-util-stat', telemetryData.util_gpu, '%');
            updateElement('memory-util-stat', telemetryData.util_memory, '%');
            updateElement('temp-stat', telemetryData.temperature_c, '°C');
            updateElement('power-stat', Math.round(telemetryData.power_w), 'W');
            updateElement('clock-stat', telemetryData.sm_clock_mhz, 'MHz');
            
            // Update overlay stats too
            updateElement('overlay-gpu', telemetryData.util_gpu + '%');
            updateElement('overlay-mem', telemetryData.util_memory + '%');
            updateElement('overlay-temp', telemetryData.temperature_c + '°C');
            updateElement('overlay-pwr', Math.round(telemetryData.power_w) + 'W');
            
            // Update active SMs count (simplified)
            const activeSMs = Math.round((telemetryData.util_gpu / 100) * 128);
            updateElement('sm-stat', activeSMs, '/128');
        }
    }
    
    resetView() {
        if (this.visualization) {
            this.visualization.setCameraMode('overview');
        }
        if (this.fullVisualization) {
            this.fullVisualization.setCameraMode('overview');
        }
        this.showNotification('View reset to overview', 'info');
    }

    handlePageChange(pageId) {
        console.log(`📄 Switched to page: ${pageId}`);
        
        // Page-specific initialization
        if (pageId === 'visualization' && !this.fullVisualization) {
            setTimeout(() => {
                this.initializeFullVisualization();
            }, 100);
        }
    }

    handleVisualizationControl(control, value) {
        const activeVisualization = this.navigationManager.getCurrentPage() === 'visualization' 
            ? this.fullVisualization 
            : this.visualization;
            
        if (!activeVisualization) return;

        switch (control) {
            case 'cameraMode':
                activeVisualization.setCameraMode(value);
                break;
            case 'showSMs':
            case 'showMemory':
            case 'showTensors':
            case 'showRTCores':
            case 'showCooling':
            case 'showPCB':
                const component = control.replace('show', '').toLowerCase();
                activeVisualization.setComponentVisibility(component, value);
                break;
            case 'isolateCompute':
                this.isolateComponent('compute');
                break;
            case 'isolateMemory':
                this.isolateComponent('memory');
                break;
            case 'isolateTensors':
                this.isolateComponent('tensors');
                break;
            case 'isolateRT':
                this.isolateComponent('rt');
                break;
            case 'resetIsolation':
                this.resetIsolation();
                break;
        }
    }

    isolateComponent(component) {
        const activeVisualization = this.navigationManager.getCurrentPage() === 'visualization' 
            ? this.fullVisualization 
            : this.visualization;
            
        if (!activeVisualization) return;

        // Hide all components first
        ['sms', 'memory', 'tensors', 'rtcores', 'cooling', 'pcb'].forEach(comp => {
            activeVisualization.setComponentVisibility(comp, false);
        });

        // Show only the isolated component
        switch (component) {
            case 'compute':
                activeVisualization.setComponentVisibility('sms', true);
                activeVisualization.setCameraMode('sm-focus');
                break;
            case 'memory':
                activeVisualization.setComponentVisibility('memory', true);
                activeVisualization.setCameraMode('memory-focus');
                break;
            case 'tensors':
                activeVisualization.setComponentVisibility('tensors', true);
                activeVisualization.setCameraMode('tensor-focus');
                break;
            case 'rt':
                activeVisualization.setComponentVisibility('rtcores', true);
                activeVisualization.setCameraMode('rt-focus');
                break;
        }
    }

    resetIsolation() {
        const activeVisualization = this.navigationManager.getCurrentPage() === 'visualization' 
            ? this.fullVisualization 
            : this.visualization;
            
        if (!activeVisualization) return;

        // Show all components
        ['sms', 'memory', 'tensors', 'rtcores', 'cooling', 'pcb'].forEach(comp => {
            activeVisualization.setComponentVisibility(comp, true);
        });
        
        activeVisualization.setCameraMode('overview');
    }

    handlePerformanceControl(control, value) {
        console.log(`Performance control: ${control} = ${value}`);
        // Implement performance monitoring controls
    }

    handleSettingsChange(settings) {
        console.log('Settings changed:', settings);
        // Apply settings to visualizations and other components
    }

    async toggleConnection() {
        if (this.dataModel.state.connected) {
            this.dataModel.stopTestScenario();
            this.updateConnectionStatus(false);
            this.showNotification('Disconnected from GPU', 'info');
        } else {
            await this.dataModel.connectToGPU();
            this.updateConnectionStatus(true);
            this.showNotification('Connected to GPU', 'success');
        }
    }

    updateConnectionStatus(connected) {
        const indicator = document.getElementById('connectionIndicator');
        const text = document.getElementById('connectionText');
        const btn = document.getElementById('connectBtn');

        if (indicator) {
            indicator.className = `status-indicator ${connected ? 'connected' : ''}`;
        }

        if (text) {
            text.textContent = connected ? 'Connected' : 'Disconnected';
        }

        if (btn) {
            btn.textContent = connected ? 'Disconnect' : 'Connect';
        }
    }

    startUIUpdates() {
        // Update UI every 100ms
        this.updateInterval = setInterval(() => {
            this.updateUI();
        }, 100);
    }

    updateUI() {
        if (!this.dataModel.state.connected) return;

        const telemetry = this.dataModel.getCurrentTelemetry();
        
        // Update stat cards
        this.updateStatCard('gpu-util-stat', Math.round(telemetry.utilGPU));
        this.updateStatCard('memory-util-stat', Math.round(telemetry.utilMemory));
        this.updateStatCard('temp-stat', Math.round(telemetry.temperature));
        this.updateStatCard('power-stat', Math.round(telemetry.power));
        this.updateStatCard('clock-stat', Math.round(telemetry.smClock));
        this.updateStatCard('sm-stat', telemetry.smUtilizations?.filter(u => u > 10).length || 0);

        // Update overlay stats
        this.updateOverlayStats(telemetry);

        // Update visualizations
        if (this.visualization) {
            this.visualization.updatePerformanceData(telemetry);
        }
        if (this.fullVisualization) {
            this.fullVisualization.updatePerformanceData(telemetry);
        }
    }

    updateStatCard(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            const valueElement = element.querySelector('.stat-value');
            if (valueElement) {
                const currentText = valueElement.textContent;
                const unitMatch = currentText.match(/[a-zA-Z°%/]+/);
                const unit = unitMatch ? unitMatch[0] : '';
                valueElement.innerHTML = `${value}<span class="stat-unit">${unit}</span>`;
            }
        }
    }

    updateOverlayStats(telemetry) {
        const updates = {
            'overlay-gpu': `${Math.round(telemetry.utilGPU)}%`,
            'overlay-mem': `${Math.round(telemetry.utilMemory)}%`,
            'overlay-temp': `${Math.round(telemetry.temperature)}°C`,
            'overlay-pwr': `${Math.round(telemetry.power)}W`
        };

        Object.entries(updates).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: var(--glass-bg);
            backdrop-filter: blur(20px);
            border: 1px solid var(--accent-primary);
            border-radius: var(--border-radius);
            padding: var(--spacing-md);
            color: var(--text-primary);
            z-index: 10000;
            animation: slideIn 0.3s ease;
            box-shadow: var(--shadow-lg);
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    showErrorMessage(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--glass-bg);
            backdrop-filter: blur(20px);
            border: 2px solid var(--accent-danger);
            color: var(--text-primary);
            padding: var(--spacing-xl);
            border-radius: var(--border-radius-lg);
            text-align: center;
            z-index: 10000;
            font-size: 1.1rem;
            max-width: 400px;
        `;
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Add loading animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);

    new NSightfulApp().init();
});

export { NSightfulApp };