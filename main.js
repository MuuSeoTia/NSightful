// NSightful GPU Visualizer - Simplified Modern Application
import GPUDataModel from './js/models/GPUDataModel.js';
import TestDataLoader from './js/utils/TestDataLoader.js';
import Enhanced3DGPUVisualization from './js/views/Enhanced3DGPUVisualization.js';
import ChartManager from './js/utils/ChartManager.js';

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
            // This will be handled by the Rust backend
            console.log('⚙️ Processing NSight report:', file.name);
            
            // TODO: Send file to Rust backend for processing
            // const result = await invoke('process_nsight_report', { file });
            
            // For now, simulate processing
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            console.log('✅ NSight report processed successfully');
        } catch (error) {
            console.error('❌ Failed to process NSight report:', error);
            this.showError('Failed to process NSight report: ' + error.message);
        }
    }
    
    async startRecording() {
        const duration = document.getElementById('recordDuration')?.value || 30;
        const sampleRate = document.getElementById('sampleRate')?.value || 50;
        
        console.log(`⏺️ Starting GPU recording: ${duration}s at ${sampleRate}Hz`);
        
        try {
            this.isRecording = true;
            this.hideRecordModal();
            
            // Update UI to show recording state
            this.updateRecordingUI(true);
            
            // TODO: Start actual GPU recording via Rust backend
            // await invoke('start_gpu_recording', { duration, sampleRate });
            
            // For now, simulate recording
            setTimeout(() => {
                this.stopRecording();
            }, duration * 1000);
            
        } catch (error) {
            console.error('❌ Failed to start recording:', error);
            this.showError('Failed to start recording: ' + error.message);
            this.isRecording = false;
        }
    }
    
    stopRecording() {
        console.log('⏹️ Stopping GPU recording');
        this.isRecording = false;
        this.updateRecordingUI(false);
        this.showSuccess('GPU recording completed successfully!');
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

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    window.nsightfulApp = new NSightfulApp();
    
    // Auto-connect to GPU and start mock data
    setTimeout(() => {
        if (window.nsightfulApp.dataModel) {
            window.nsightfulApp.dataModel.connectToGPU();
        }
    }, 1000);
});

export default NSightfulApp;