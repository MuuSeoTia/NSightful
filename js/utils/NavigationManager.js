/**
 * Navigation Manager for Multi-Page Application
 * 
 * Manages page transitions, route handling, and component lifecycle
 * for the multi-page GPU visualization interface.
 */
export class NavigationManager {
    /**
     * Initialize navigation manager
     * Sets up page registry and default page state
     */
    constructor() {
        this.currentPage = 'dashboard';
        this.pages = new Map();
        this.initialized = false;
    }

    /**
     * Initialize navigation system
     * 
     * Sets up navigation event handlers, registers pages,
     * and displays the default page.
     */
    initialize() {
        this.setupNavigation();
        this.registerPages();
        this.showPage(this.currentPage);
        this.initialized = true;
        
        console.log('Navigation Manager initialized');
    }

    setupNavigation() {
        const navTabs = document.querySelectorAll('.nav-tab');
        
        navTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                const pageId = tab.getAttribute('data-page');
                this.showPage(pageId);
            });
        });
    }

    registerPages() {
        // Register all available pages
        const pageElements = document.querySelectorAll('.page-container');
        
        pageElements.forEach(pageElement => {
            const pageId = pageElement.id.replace('-page', '');
            this.pages.set(pageId, {
                element: pageElement,
                initialized: false,
                controller: null
            });
        });
    }

    /**
     * Show specified page and handle transitions
     * 
     * Manages page visibility, active states, and component initialization.
     * 
     * @param {string} pageId - ID of the page to display
     */
    showPage(pageId) {
        if (!this.pages.has(pageId)) {
            console.error(`Page "${pageId}" not found`);
            return;
        }

        // Hide current page
        const currentPageData = this.pages.get(this.currentPage);
        if (currentPageData) {
            currentPageData.element.classList.remove('active');
        }

        // Show new page
        const newPageData = this.pages.get(pageId);
        newPageData.element.classList.add('active');

        // Update navigation tabs
        this.updateNavTabs(pageId);

        // Initialize page if needed
        if (!newPageData.initialized) {
            this.initializePage(pageId);
            newPageData.initialized = true;
        }

        // Update current page
        this.currentPage = pageId;

        // Emit page change event
        this.emitPageChangeEvent(pageId);
    }

    updateNavTabs(activePageId) {
        const navTabs = document.querySelectorAll('.nav-tab');
        
        navTabs.forEach(tab => {
            const pageId = tab.getAttribute('data-page');
            
            if (pageId === activePageId) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
    }

    initializePage(pageId) {
        console.log(`Initializing page: ${pageId}`);
        
        switch (pageId) {
            case 'dashboard':
                this.initializeDashboard();
                break;
            case 'visualization':
                this.initializeVisualization();
                break;
            case 'analysis':
                this.initializeAnalysis();
                break;
            case 'performance':
                this.initializePerformance();
                break;
            case 'settings':
                this.initializeSettings();
                break;
        }
    }

    initializeDashboard() {
        // Initialize dashboard-specific functionality
        const loadTestDataBtn = document.getElementById('loadTestData');
        const startMonitoringBtn = document.getElementById('startMonitoring');
        const resetViewBtn = document.getElementById('resetView');
        const scenarioSelect = document.getElementById('scenarioSelect');
        const loadScenarioBtn = document.getElementById('loadScenario');

        if (loadTestDataBtn) {
            loadTestDataBtn.addEventListener('click', () => {
                this.emitEvent('loadTestData');
            });
        }

        if (startMonitoringBtn) {
            startMonitoringBtn.addEventListener('click', () => {
                this.emitEvent('startMonitoring');
            });
        }

        if (resetViewBtn) {
            resetViewBtn.addEventListener('click', () => {
                this.emitEvent('resetView');
            });
        }

        if (loadScenarioBtn) {
            loadScenarioBtn.addEventListener('click', () => {
                const scenario = scenarioSelect?.value;
                if (scenario) {
                    this.emitEvent('loadScenario', { scenario });
                }
            });
        }
    }

    initializeVisualization() {
        // Initialize 3D visualization page
        const controls = {
            showSMs: document.getElementById('showSMs'),
            showMemory: document.getElementById('showMemory'),
            showTensors: document.getElementById('showTensors'),
            showRTCores: document.getElementById('showRTCores'),
            showCooling: document.getElementById('showCooling'),
            showPCB: document.getElementById('showPCB'),
            cameraMode: document.getElementById('cameraMode'),
            animationSpeed: document.getElementById('animationSpeed'),
            isolateCompute: document.getElementById('isolateCompute'),
            isolateMemory: document.getElementById('isolateMemory'),
            isolateTensors: document.getElementById('isolateTensors'),
            isolateRT: document.getElementById('isolateRT'),
            resetIsolation: document.getElementById('resetIsolation'),
            rimLighting: document.getElementById('rimLighting'),
            celShading: document.getElementById('celShading'),
            bloomEffect: document.getElementById('bloomEffect'),
            particleEffects: document.getElementById('particleEffects'),
            heatMap: document.getElementById('heatMap')
        };

        // Setup event listeners for visualization controls
        Object.entries(controls).forEach(([key, element]) => {
            if (!element) return;

            if (element.type === 'checkbox') {
                element.addEventListener('change', () => {
                    this.emitEvent('visualizationControl', {
                        control: key,
                        value: element.checked
                    });
                });
            } else if (element.type === 'range') {
                element.addEventListener('input', () => {
                    this.emitEvent('visualizationControl', {
                        control: key,
                        value: parseFloat(element.value)
                    });
                    
                    // Update display
                    const display = document.getElementById('speedValue');
                    if (display && key === 'animationSpeed') {
                        display.textContent = `${element.value}x`;
                    }
                });
            } else if (element.tagName === 'SELECT') {
                element.addEventListener('change', () => {
                    this.emitEvent('visualizationControl', {
                        control: key,
                        value: element.value
                    });
                });
            } else if (element.tagName === 'BUTTON') {
                element.addEventListener('click', () => {
                    this.emitEvent('visualizationControl', {
                        control: key,
                        value: true
                    });
                });
            }
        });

        // Emit event to initialize 3D visualization
        this.emitEvent('initializeFullVisualization');
    }

    initializeAnalysis() {
        // Initialize analysis page
        const uploadBtn = document.getElementById('uploadBtn');
        const fileInput = document.getElementById('fileInput');

        if (uploadBtn && fileInput) {
            uploadBtn.addEventListener('click', () => {
                fileInput.click();
            });

            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.emitEvent('uploadReport', { file });
                }
            });
        }

        // Setup drag and drop
        const uploadArea = document.querySelector('.report-upload');
        if (uploadArea) {
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.style.borderColor = 'var(--accent-primary)';
            });

            uploadArea.addEventListener('dragleave', () => {
                uploadArea.style.borderColor = 'var(--glass-border)';
            });

            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.style.borderColor = 'var(--glass-border)';
                
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.emitEvent('uploadReport', { file: files[0] });
                }
            });
        }
    }

    initializePerformance() {
        // Initialize performance monitoring page
        const controls = {
            startProfiling: document.getElementById('startProfiling'),
            stopProfiling: document.getElementById('stopProfiling'),
            exportData: document.getElementById('exportData'),
            trackGPU: document.getElementById('trackGPU'),
            trackMemory: document.getElementById('trackMemory'),
            trackPower: document.getElementById('trackPower'),
            trackThermal: document.getElementById('trackThermal'),
            trackClocks: document.getElementById('trackClocks')
        };

        Object.entries(controls).forEach(([key, element]) => {
            if (!element) return;

            if (element.type === 'checkbox') {
                element.addEventListener('change', () => {
                    this.emitEvent('performanceControl', {
                        control: key,
                        value: element.checked
                    });
                });
            } else if (element.tagName === 'BUTTON') {
                element.addEventListener('click', () => {
                    this.emitEvent('performanceControl', {
                        control: key,
                        value: true
                    });
                });
            }
        });
    }

    initializeSettings() {
        // Initialize settings page
        const saveBtn = document.getElementById('saveSettings');
        const resetBtn = document.getElementById('resetSettings');

        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveSettings();
            });
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetSettings();
            });
        }

        // Load current settings
        this.loadSettings();
    }

    saveSettings() {
        const settings = {
            renderQuality: document.getElementById('renderQuality')?.value,
            enableShadows: document.getElementById('enableShadows')?.checked,
            enableReflections: document.getElementById('enableReflections')?.checked,
            enableSSAO: document.getElementById('enableSSAO')?.checked,
            defaultAnimSpeed: document.getElementById('defaultAnimSpeed')?.value,
            autoRotate: document.getElementById('autoRotate')?.checked,
            smoothTransitions: document.getElementById('smoothTransitions')?.checked,
            telemetryRate: document.getElementById('telemetryRate')?.value,
            chartRate: document.getElementById('chartRate')?.value,
            historyLength: document.getElementById('historyLength')?.value,
            autoExport: document.getElementById('autoExport')?.checked,
            persistSettings: document.getElementById('persistSettings')?.checked
        };

        localStorage.setItem('nsightful-settings', JSON.stringify(settings));
        this.emitEvent('settingsChanged', settings);
        
        // Show success message
        this.showNotification('Settings saved successfully', 'success');
    }

    loadSettings() {
        const savedSettings = localStorage.getItem('nsightful-settings');
        if (!savedSettings) return;

        try {
            const settings = JSON.parse(savedSettings);
            
            Object.entries(settings).forEach(([key, value]) => {
                const element = document.getElementById(key);
                if (!element) return;

                if (element.type === 'checkbox') {
                    element.checked = value;
                } else {
                    element.value = value;
                }
            });
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }

    resetSettings() {
        localStorage.removeItem('nsightful-settings');
        
        // Reset all form elements to defaults
        const settingsPage = document.getElementById('settings-page');
        if (settingsPage) {
            const inputs = settingsPage.querySelectorAll('input, select');
            inputs.forEach(input => {
                if (input.type === 'checkbox') {
                    input.checked = input.defaultChecked;
                } else {
                    input.value = input.defaultValue;
                }
            });
        }

        this.showNotification('Settings reset to defaults', 'info');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: var(--glass-bg);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: var(--border-radius);
            padding: var(--spacing-md);
            color: var(--text-primary);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    emitEvent(eventName, data = {}) {
        const event = new CustomEvent(`nsightful:${eventName}`, {
            detail: data
        });
        document.dispatchEvent(event);
    }

    emitPageChangeEvent(pageId) {
        this.emitEvent('pageChanged', { pageId });
    }

    getCurrentPage() {
        return this.currentPage;
    }

    isPageInitialized(pageId) {
        return this.pages.get(pageId)?.initialized || false;
    }
}


