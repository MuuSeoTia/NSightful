// NSightful GPU Visualizer - Simplified Modern Application
import GPUDataModel from './js/models/GPUDataModel.js';
import TestDataLoader from './js/utils/TestDataLoader.js';
import Enhanced3DGPUVisualization from './js/views/Enhanced3DGPUVisualization.js';
import ChartManager from './js/utils/ChartManager.js';

// Utility function to safely get Tauri invoke function
const isTauriAvailable = () => {
    return typeof window !== 'undefined' && window.__TAURI__ !== undefined;
};

const mockInvoke = async (command, payload = {}) => {
    console.log(`🔧 Mock Tauri command: ${command}`, payload);
    
    // Mock responses for development
    switch (command) {
        case 'get_gpu_telemetry':
            return JSON.stringify({
                status: 'connected',
                timestamp: Date.now(),
                gpus: [{
                    name: 'RTX 4090',
                    utilization: Math.random() * 100,
                    memory_used: Math.random() * 24576,
                    memory_total: 24576,
                    temperature: 45 + Math.random() * 30,
                    power_draw: 200 + Math.random() * 250,
                    sm_clock: 2000 + Math.random() * 500,
                    memory_clock: 10000 + Math.random() * 1000
                }]
            });
        case 'start_gpu_recording':
            return 'mock-session-' + Date.now();
        case 'stop_gpu_recording':
            return './recordings/gpu_data_' + Date.now() + '.json';
        case 'get_recording_status':
            return JSON.stringify({
                is_recording: false,
                session_id: null,
                duration_seconds: null,
                elapsed_seconds: null,
                sample_rate_hz: null,
                metrics: [],
                samples_collected: 0,
                output_file: null
            });
        case 'process_nsight_report':
            return JSON.stringify({
                report_type: 'NSight Compute',
                gpu_name: 'RTX 4090',
                kernels: [],
                bottlenecks: ['Memory Bandwidth', 'SM Utilization'],
                recommendations: ['Increase memory coalescing', 'Optimize thread block size'],
                performance_summary: {
                    average_sm_utilization: 75.5,
                    memory_throughput_gbps: 850.2,
                    bottleneck_analysis: 'Memory Bandwidth Limited'
                }
            });
        default:
            throw new Error(`Unknown command: ${command}`);
    }
};

const getSafeInvoke = async () => {
    if (isTauriAvailable()) {
        try {
            const { invoke } = await import('@tauri-apps/api/tauri');
            return invoke;
        } catch (error) {
            console.log('Failed to import Tauri API, using mock');
            return mockInvoke;
        }
    }
    return mockInvoke;
};

class NSightfulApp {
    constructor() {
        this.dataModel = null;
        this.testDataLoader = null;
        this.gpu3dVisualization = null;
        this.chartManager = null;
        this.isInitialized = false;
        this.isRecording = false;
        
        this.init();
    }

    async init() {
        console.log('🚀 Initializing NSightful GPU Visualizer...');
        
        try {
            // Initialize core components
            this.dataModel = new GPUDataModel();
            this.testDataLoader = new TestDataLoader();
            this.chartManager = new ChartManager();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize visualizations
            this.initializeVisualizations();
            
            // Initialize charts
            this.chartManager.initializeCharts();
            
            this.isInitialized = true;
            console.log('✅ NSightful initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize NSightful:', error);
            this.showError('Initialization failed: ' + error.message);
        }
    }

    initializeVisualizations() {
        // Initialize enhanced 3D GPU visualization
        const gpu3dCanvas = document.getElementById('gpu3d');
        if (gpu3dCanvas) {
            this.gpu3dVisualization = new Enhanced3DGPUVisualization(gpu3dCanvas, {
                enableShadows: true,
                enableBloom: true,
                autoRotate: true,
                animationSpeed: 1.0
            });
            console.log('🎨 Enhanced 3D GPU visualization initialized');
        } else {
            console.warn('⚠️ GPU 3D canvas not found');
        }
    }

    setupEventListeners() {
        // Upload button
        const uploadBtn = document.getElementById('uploadBtn');
        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => {
                this.showUploadModal();
            });
        }
        
        // Record button
        const recordBtn = document.getElementById('recordBtn');
        if (recordBtn) {
            recordBtn.addEventListener('click', () => {
                this.showRecordModal();
            });
        }
        
        // Component control buttons
        const componentBtns = document.querySelectorAll('.component-btn');
        componentBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Update active state
                componentBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                // Isolate components
                const componentType = e.target.dataset.component;
                if (this.gpu3dVisualization) {
                    this.gpu3dVisualization.isolateComponents(componentType);
                }
            });
        });
        
        // Modal events
        this.setupModalEvents();
        
        // Data model events
        if (this.dataModel) {
            this.dataModel.addEventListener('telemetryUpdate', (data) => {
                this.updateVisualizations(data);
            });
        }
        
        // 3D visualization events
        const gpu3dCanvas = document.getElementById('gpu3d');
        if (gpu3dCanvas) {
            gpu3dCanvas.addEventListener('componentSelected', (event) => {
                console.log('Component selected:', event.detail);
            });
        }
        
        // Window resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    setupModalEvents() {
        // Upload modal
        const uploadModal = document.getElementById('uploadModal');
        const closeUploadModal = document.getElementById('closeUploadModal');
        const browseFiles = document.getElementById('browseFiles');
        const fileInput = document.getElementById('fileInput');
        const uploadArea = document.getElementById('uploadArea');
        
        if (closeUploadModal) {
            closeUploadModal.addEventListener('click', () => {
                this.hideUploadModal();
            });
        }
        
        if (browseFiles && fileInput) {
            browseFiles.addEventListener('click', () => {
                fileInput.click();
            });
            
            fileInput.addEventListener('change', (event) => {
                this.handleFileUpload(event);
            });
        }
        
        // Drag and drop for upload
        if (uploadArea) {
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('dragover');
            });
            
            uploadArea.addEventListener('dragleave', () => {
                uploadArea.classList.remove('dragover');
            });
            
            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                this.handleFileDrop(e);
            });
        }
        
        // Record modal
        const recordModal = document.getElementById('recordModal');
        const closeRecordModal = document.getElementById('closeRecordModal');
        const startRecording = document.getElementById('startRecording');
        
        if (closeRecordModal) {
            closeRecordModal.addEventListener('click', () => {
                this.hideRecordModal();
            });
        }
        
        if (startRecording) {
            startRecording.addEventListener('click', () => {
                this.startRecording();
            });
        }
        
        // Close modals on outside click
        [uploadModal, recordModal].forEach(modal => {
            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        modal.classList.remove('show');
                        modal.style.display = 'none';
                    }
                });
            }
        });
    }

    updateVisualizations(telemetryData) {
        if (!telemetryData) return;
        
        // Update 3D visualization
        if (this.gpu3dVisualization) {
            this.gpu3dVisualization.updateTelemetry(telemetryData);
        }
        
        // Update charts
        if (this.chartManager) {
            this.chartManager.updateCharts(telemetryData);
        }
        
        // Update recording status if recording
        if (this.isRecording) {
            this.updateRecordingStatus(telemetryData);
        }
    }

    showUploadModal() {
        const modal = document.getElementById('uploadModal');
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('show');
        }
    }
    
    hideUploadModal() {
        const modal = document.getElementById('uploadModal');
        if (modal) {
            modal.classList.remove('show');
            modal.style.display = 'none';
        }
    }
    
    showRecordModal() {
        const modal = document.getElementById('recordModal');
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('show');
        }
    }
    
    hideRecordModal() {
        const modal = document.getElementById('recordModal');
        if (modal) {
            modal.classList.remove('show');
            modal.style.display = 'none';
        }
    }

    handleFileUpload(event) {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        
        const file = files[0];
        this.processUploadedFile(file);
    }
    
    handleFileDrop(event) {
        const files = event.dataTransfer.files;
        if (!files || files.length === 0) return;
        
        const file = files[0];
        this.processUploadedFile(file);
    }
    
    processUploadedFile(file) {
        console.log('📁 Processing file:', file.name, file.type, file.size);
        
        // Check file type
        const validExtensions = ['.nsight-cuprof', '.ncu-rep', '.qdrep'];
        const isValidFile = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
        
        if (!isValidFile) {
            this.showError('Invalid file type. Please select an NSight report file.');
            return;
        }
        
        // Show upload progress
        this.showUploadProgress();
        
        // Process the file
        this.processNSightReport(file);
    }
    
    showUploadProgress() {
        const uploadArea = document.getElementById('uploadArea');
        const uploadProgress = document.getElementById('uploadProgress');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        if (uploadArea) uploadArea.style.display = 'none';
        if (uploadProgress) uploadProgress.style.display = 'block';
        
        // Simulate progress
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 20;
            if (progress > 100) {
                progress = 100;
                clearInterval(interval);
                setTimeout(() => {
                    this.hideUploadModal();
                    this.showSuccess('NSight report processed successfully!');
                }, 500);
            }
            
            if (progressFill) progressFill.style.width = progress + '%';
            if (progressText) progressText.textContent = `Processing report... ${Math.round(progress)}%`;
        }, 200);
    }

    async processNSightReport(file) {
        try {
            console.log('⚙️ Processing NSight report:', file.name);
            
            // Get Tauri invoke function
            const safeInvoke = await getSafeInvoke();
            
            // For file upload, we need to save the file first (in a real implementation)
            // For now, just use the file name as a placeholder path
            const filePath = file.name;
            
            const result = await safeInvoke('process_nsight_report', { filePath });
            const analysis = JSON.parse(result);
            
            console.log('✅ NSight report processed successfully:', analysis);
            
            // Display analysis results (could be shown in a dedicated UI)
            this.displayNSightAnalysis(analysis);
            
        } catch (error) {
            console.error('❌ Failed to process NSight report:', error);
            this.showError('Failed to process NSight report: ' + error.message);
        }
    }
    
    displayNSightAnalysis(analysis) {
        // Create a simple display of the analysis results
        const summary = `
NSight Analysis Results:
• GPU: ${analysis.gpu_name}
• Report Type: ${analysis.report_type}
• Kernels Analyzed: ${analysis.kernels.length}
• Average SM Utilization: ${analysis.performance_summary.average_sm_utilization.toFixed(1)}%
• Memory Throughput: ${analysis.performance_summary.memory_throughput_gbps.toFixed(1)} GB/s
• Main Bottleneck: ${analysis.performance_summary.bottleneck_analysis}

Top Recommendations:
${analysis.recommendations.slice(0, 3).map(rec => `• ${rec}`).join('\n')}
        `;
        
        console.log(summary);
        this.showInfo('NSight analysis completed. Check console for detailed results.');
    }
    
    async startRecording() {
        const duration = document.getElementById('recordDuration')?.value || 30;
        const sampleRate = document.getElementById('sampleRate')?.value || 50;
        
        // Get selected metrics
        const metricsCheckboxes = document.querySelectorAll('#recordModal .checkbox-group input[type="checkbox"]:checked');
        const metrics = Array.from(metricsCheckboxes).map(cb => cb.parentNode.textContent.trim());
        
        console.log(`⏺️ Starting GPU recording: ${duration}s at ${sampleRate}Hz`, metrics);
        
        try {
            this.hideRecordModal();
            
            // Get Tauri invoke function
            const safeInvoke = await getSafeInvoke();
            
            // Start actual GPU recording via Rust backend
            const sessionId = await safeInvoke('start_gpu_recording', {
                durationSeconds: parseInt(duration),
                sampleRateHz: parseInt(sampleRate),
                metrics: metrics
            });
            
            this.isRecording = true;
            this.recordingSessionId = sessionId;
            
            // Update UI to show recording state
            this.updateRecordingUI(true);
            
            // Start monitoring recording status
            this.startRecordingMonitor();
            
            this.showSuccess(`Recording started! Session ID: ${sessionId}`);
            
        } catch (error) {
            console.error('❌ Failed to start recording:', error);
            this.showError('Failed to start recording: ' + error.message);
            this.isRecording = false;
        }
    }
    
    async stopRecording() {
        if (!this.isRecording) return;
        
        console.log('⏹️ Stopping GPU recording');
        
        try {
            const safeInvoke = await getSafeInvoke();
            const outputFile = await safeInvoke('stop_gpu_recording');
            
            this.isRecording = false;
            this.recordingSessionId = null;
            this.updateRecordingUI(false);
            
            // Stop monitoring
            if (this.recordingMonitorInterval) {
                clearInterval(this.recordingMonitorInterval);
                this.recordingMonitorInterval = null;
            }
            
            this.showSuccess(`GPU recording completed! Data saved to: ${outputFile}`);
            
        } catch (error) {
            console.error('❌ Failed to stop recording:', error);
            this.showError('Failed to stop recording: ' + error.message);
        }
    }
    
    startRecordingMonitor() {
        // Monitor recording status every second
        this.recordingMonitorInterval = setInterval(async () => {
            try {
                const safeInvoke = await getSafeInvoke();
                const statusJson = await safeInvoke('get_recording_status');
                const status = JSON.parse(statusJson);
                
                if (!status.is_recording && this.isRecording) {
                    // Recording finished automatically
                    this.stopRecording();
                } else if (status.is_recording) {
                    // Update progress
                    this.updateRecordingProgress(status);
                }
                
            } catch (error) {
                console.error('Failed to get recording status:', error);
            }
        }, 1000);
    }
    
    updateRecordingProgress(status) {
        const recordingStatus = document.getElementById('recordingStatus');
        const statusText = recordingStatus?.querySelector('.status-text');
        
        if (statusText && status.elapsed_seconds !== undefined && status.duration_seconds) {
            const progress = Math.round((status.elapsed_seconds / status.duration_seconds) * 100);
            statusText.textContent = `Recording... ${status.elapsed_seconds}/${status.duration_seconds}s (${progress}%)`;
        }
    }
    
    updateRecordingUI(isRecording) {
        const recordingStatus = document.getElementById('recordingStatus');
        const statusDot = recordingStatus?.querySelector('.status-dot');
        const statusText = recordingStatus?.querySelector('.status-text');
        
        if (statusDot && statusText) {
            if (isRecording) {
                statusDot.style.backgroundColor = '#ff6b6b';
                statusText.textContent = 'Recording...';
            } else {
                statusDot.style.backgroundColor = '#4ecdc4';
                statusText.textContent = 'Ready';
            }
        }
    }
    
    updateRecordingStatus(telemetryData) {
        // Update any recording-specific UI elements
        // This could show real-time recording progress, data points collected, etc.
    }

    handleResize() {
        // Resize 3D visualization
        if (this.gpu3dVisualization) {
            this.gpu3dVisualization.handleResize();
        }
        
        // Resize charts
        if (this.chartManager) {
            this.chartManager.resizeCharts();
        }
    }

    showError(message) {
        console.error('❌ Error:', message);
        this.showToast(message, 'error');
    }
    
    showSuccess(message) {
        console.log('✅ Success:', message);
        this.showToast(message, 'success');
    }
    
    showInfo(message) {
        console.info('ℹ️ Info:', message);
        this.showToast(message, 'info');
    }
    
    showToast(message, type = 'info') {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        // Style the toast
        Object.assign(toast.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '15px 20px',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '500',
            zIndex: '10000',
            maxWidth: '300px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease'
        });
        
        // Set background color based on type
        const colors = {
            error: '#ff6b6b',
            success: '#4ecdc4',
            info: '#00d4ff'
        };
        toast.style.background = colors[type] || colors.info;
        
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 100);
        
        // Auto remove
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 4000);
    }
}

// Wait for all dependencies to load
const waitForDependencies = () => {
    return new Promise((resolve) => {
        const checkDependencies = () => {
            if (typeof THREE !== 'undefined' && typeof Chart !== 'undefined') {
                resolve();
            } else {
                setTimeout(checkDependencies, 100);
            }
        };
        checkDependencies();
    });
};

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔄 Waiting for dependencies to load...');
    
    // Wait for THREE.js and Chart.js to be available
    await waitForDependencies();
    
    console.log('✅ Dependencies loaded, initializing application...');
    window.nsightfulApp = new NSightfulApp();
    
    // Auto-connect to GPU and start mock data
    setTimeout(() => {
        if (window.nsightfulApp.dataModel) {
            window.nsightfulApp.dataModel.connectToGPU();
        }
    }, 1000);
});

export default NSightfulApp;