// Simplified NSightful GPU Visualizer - For debugging
import { NavigationManager } from './js/utils/NavigationManager.js';
import { GPUDataModel } from './js/models/GPUDataModel.js';

class NSightfulApp {
    constructor() {
        this.navigationManager = null;
        this.dataModel = null;
        this.isInitialized = false;
    }

    async init() {
        try {
            console.log('🚀 Initializing Simplified NSightful GPU Visualizer...');
            
            // Initialize navigation first
            this.navigationManager = new NavigationManager();
            this.navigationManager.initialize();
            console.log('✅ Navigation initialized');
            
            // Initialize data model
            this.dataModel = new GPUDataModel();
            console.log('✅ Data model initialized');
            console.log('Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(this.dataModel)));
            
            // Setup basic event listeners
            this.setupBasicEventListeners();
            
            // Start basic UI updates
            this.startBasicUI();
            
            this.isInitialized = true;
            console.log('✅ Simplified NSightful GPU Visualizer initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize:', error);
            this.showErrorMessage(error.message);
        }
    }

    setupBasicEventListeners() {
        const connectBtn = document.getElementById('connectBtn');
        if (connectBtn) {
            connectBtn.addEventListener('click', async () => {
                try {
                    await this.dataModel.connectToGPU();
                    this.updateConnectionStatus(true);
                    this.showNotification('Connected to GPU', 'success');
                } catch (error) {
                    console.error('Connection error:', error);
                    this.showNotification('Connection failed', 'error');
                }
            });
        }

        // Load scenario button
        const loadScenarioBtn = document.getElementById('loadScenario');
        const scenarioSelect = document.getElementById('scenarioSelect');
        
        if (loadScenarioBtn && scenarioSelect) {
            loadScenarioBtn.addEventListener('click', async () => {
                const scenario = scenarioSelect.value;
                if (scenario) {
                    try {
                        if (this.dataModel.loadTestScenario) {
                            await this.dataModel.loadTestScenario(scenario);
                            this.updateConnectionStatus(true);
                            this.showNotification(`${scenario} scenario loaded`, 'success');
                        } else {
                            this.showNotification('Test scenarios not available', 'warning');
                        }
                    } catch (error) {
                        console.error('Scenario loading error:', error);
                        this.showNotification('Failed to load scenario', 'error');
                    }
                }
            });
        }
    }

    startBasicUI() {
        // Simple UI update loop
        setInterval(() => {
            if (this.dataModel && this.dataModel.state.connected) {
                const telemetry = this.dataModel.getCurrentTelemetry();
                this.updateBasicStats(telemetry);
            }
        }, 500);
    }

    updateBasicStats(telemetry) {
        // Update basic stats
        const updates = {
            'gpu-util-stat': Math.round(telemetry.utilGPU || 0),
            'memory-util-stat': Math.round(telemetry.utilMemory || 0),
            'temp-stat': Math.round(telemetry.temperature || 0),
            'power-stat': Math.round(telemetry.power || 0),
            'clock-stat': Math.round(telemetry.smClock || 0),
            'overlay-gpu': `${Math.round(telemetry.utilGPU || 0)}%`,
            'overlay-mem': `${Math.round(telemetry.utilMemory || 0)}%`,
            'overlay-temp': `${Math.round(telemetry.temperature || 0)}°C`,
            'overlay-pwr': `${Math.round(telemetry.power || 0)}W`
        };

        Object.entries(updates).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                if (element.querySelector('.stat-value')) {
                    const valueElement = element.querySelector('.stat-value');
                    const currentText = valueElement.textContent;
                    const unitMatch = currentText.match(/[a-zA-Z°%/]+/);
                    const unit = unitMatch ? unitMatch[0] : '';
                    valueElement.innerHTML = `${value}<span class="stat-unit">${unit}</span>`;
                } else {
                    element.textContent = value;
                }
            }
        });
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

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
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
            box-shadow: var(--shadow-lg);
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => notification.remove(), 3000);
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
            border: 2px solid var(--accent-danger, red);
            color: var(--text-primary);
            padding: 2rem;
            border-radius: 12px;
            text-align: center;
            z-index: 10000;
            font-size: 1.1rem;
            max-width: 400px;
        `;
        errorDiv.innerHTML = `
            <h3>Initialization Error</h3>
            <p>${message}</p>
            <button onclick="location.reload()" style="
                margin-top: 1rem;
                padding: 0.5rem 1rem;
                background: var(--accent-primary, #00ff88);
                border: none;
                border-radius: 6px;
                color: black;
                cursor: pointer;
            ">Reload</button>
        `;
        document.body.appendChild(errorDiv);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌟 Starting Simplified NSightful...');
    new NSightfulApp().init();
});

export { NSightfulApp };




