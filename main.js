// NSightful GPU Visualizer - Main Application
import { invoke } from '@tauri-apps/api/tauri';
import * as THREE from 'three';
import anime from 'animejs';

// MVC Architecture Implementation
class NSightfulApp {
    constructor() {
        this.model = new DataModel();
        this.view = new VisualizationView();
        this.controller = new AppController(this.model, this.view);
        
        this.init();
    }

    async init() {
        await this.view.init();
        await this.controller.init();
        this.setupEventListeners();
        this.startUpdateLoop();
    }

    setupEventListeners() {
        document.getElementById('connectBtn').addEventListener('click', () => {
            this.controller.connectGPU();
        });

        document.getElementById('recordBtn').addEventListener('click', () => {
            this.controller.toggleRecording();
        });

        document.getElementById('loadReportBtn').addEventListener('click', () => {
            this.controller.loadNsightReport();
        });

        // Visualization controls
        ['showSMs', 'showMemory', 'showTensors', 'realTimeMode'].forEach(id => {
            document.getElementById(id).addEventListener('change', (e) => {
                this.view.updateVisualizationSettings(id, e.target.checked);
            });
        });
    }

    startUpdateLoop() {
        const update = () => {
            this.controller.update();
            this.view.render();
            requestAnimationFrame(update);
        };
        requestAnimationFrame(update);
    }
}

// MODEL: Data Management and GPU Communication
class DataModel {
    constructor() {
        this.gpuData = {
            connected: false,
            devices: [],
            currentDevice: null,
            telemetry: {
                utilGPU: 0,
                utilMemory: 0,
                temperature: 0,
                power: 0,
                smClock: 0,
                memoryClock: 0,
                memoryUsed: 0,
                memoryTotal: 0
            }
        };
        
        this.nsightData = null;
        this.performanceHistory = [];
        this.isStreaming = false;
    }

    async connectGPU() {
        try {
            const result = await invoke('get_gpu_telemetry');
            const data = JSON.parse(result);
            this.gpuData.connected = data.status === 'connected';
            this.gpuData.devices = data.gpus || [];
            
            if (this.gpuData.devices.length > 0) {
                this.gpuData.currentDevice = this.gpuData.devices[0];
            }
            
            return this.gpuData.connected;
        } catch (error) {
            console.error('Failed to connect to GPU:', error);
            return false;
        }
    }

    async startTelemetryStream(periodMs = 100) {
        if (this.isStreaming) return;
        
        try {
            await invoke('start_nvml_stream', { periodMs });
            this.isStreaming = true;
            this.simulateTelemetryData(); // For now, simulate data
        } catch (error) {
            console.error('Failed to start telemetry stream:', error);
        }
    }

    // Simulate real-time GPU data for development
    simulateTelemetryData() {
        const updateTelemetry = () => {
            if (!this.isStreaming) return;

            // Simulate realistic GPU usage patterns
            const time = Date.now() / 1000;
            this.gpuData.telemetry = {
                utilGPU: Math.max(0, Math.sin(time * 0.5) * 30 + 50 + Math.random() * 20),
                utilMemory: Math.max(0, Math.cos(time * 0.3) * 25 + 40 + Math.random() * 15),
                temperature: 65 + Math.sin(time * 0.2) * 10 + Math.random() * 5,
                power: 180 + Math.sin(time * 0.4) * 50 + Math.random() * 20,
                smClock: 1400 + Math.sin(time * 0.6) * 200 + Math.random() * 100,
                memoryClock: 7000 + Math.cos(time * 0.7) * 500 + Math.random() * 200,
                memoryUsed: 6000 + Math.sin(time * 0.1) * 2000,
                memoryTotal: 12000
            };

            // Store performance history
            this.performanceHistory.push({
                timestamp: Date.now(),
                ...this.gpuData.telemetry
            });

            // Keep only last 100 samples
            if (this.performanceHistory.length > 100) {
                this.performanceHistory.shift();
            }

            setTimeout(updateTelemetry, 100);
        };

        updateTelemetry();
    }

    stopTelemetryStream() {
        this.isStreaming = false;
    }

    loadNsightReport(reportData) {
        this.nsightData = reportData;
        // Parse and process Nsight data here
    }

    getTelemetryData() {
        return this.gpuData.telemetry;
    }

    getPerformanceHistory() {
        return this.performanceHistory;
    }

    isConnected() {
        return this.gpuData.connected;
    }
}

// VIEW: 3D Visualization and UI Management
class VisualizationView {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.gpuModel = null;
        this.smUnits = [];
        this.memoryBlocks = [];
        this.tensorCores = [];
        
        this.visualizationSettings = {
            showSMs: true,
            showMemory: true,
            showTensors: true,
            realTimeMode: true
        };

        this.performanceCharts = {};
    }

    async init() {
        this.setupThreeJS();
        this.createGPUModel();
        this.setupPerformanceCharts();
        this.setupUI();
    }

    setupThreeJS() {
        const container = document.getElementById('gpu-canvas');
        
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a0a);

        // Camera setup
        this.camera = new THREE.PerspectiveCamera(
            75, 
            container.clientWidth / container.clientHeight, 
            0.1, 
            1000
        );
        this.camera.position.set(0, 0, 5);

        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: document.getElementById('gpu-canvas'),
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0x00ff88, 0.8);
        directionalLight.position.set(5, 5, 5);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);

        // Controls (mouse interaction)
        this.setupCameraControls();

        // Handle resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    setupCameraControls() {
        let isMouseDown = false;
        let mouseX = 0;
        let mouseY = 0;

        const canvas = this.renderer.domElement;

        canvas.addEventListener('mousedown', (e) => {
            isMouseDown = true;
            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        canvas.addEventListener('mouseup', () => {
            isMouseDown = false;
        });

        canvas.addEventListener('mousemove', (e) => {
            if (!isMouseDown) return;

            const deltaX = e.clientX - mouseX;
            const deltaY = e.clientY - mouseY;

            this.camera.position.x += deltaX * 0.01;
            this.camera.position.y -= deltaY * 0.01;

            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        canvas.addEventListener('wheel', (e) => {
            this.camera.position.z += e.deltaY * 0.01;
            this.camera.position.z = Math.max(2, Math.min(10, this.camera.position.z));
        });
    }

    createGPUModel() {
        // Create main GPU chip
        const chipGeometry = new THREE.BoxGeometry(3, 0.2, 2);
        const chipMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x2a2a2a,
            transparent: true,
            opacity: 0.9
        });
        this.gpuModel = new THREE.Mesh(chipGeometry, chipMaterial);
        this.scene.add(this.gpuModel);

        // Create SM (Streaming Multiprocessor) units
        this.createSMUnits();
        
        // Create memory blocks
        this.createMemoryBlocks();
        
        // Create tensor cores
        this.createTensorCores();

        // Add some particle effects for visual appeal
        this.createParticleEffects();
    }

    createSMUnits() {
        const smGeometry = new THREE.BoxGeometry(0.15, 0.1, 0.15);
        const smMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x00ff88,
            transparent: true,
            opacity: 0.7
        });

        // Create a grid of SM units (8x8 for demonstration)
        for (let x = 0; x < 8; x++) {
            for (let z = 0; z < 8; z++) {
                const sm = new THREE.Mesh(smGeometry, smMaterial.clone());
                sm.position.set(
                    (x - 3.5) * 0.3,
                    0.15,
                    (z - 3.5) * 0.3
                );
                sm.userData = { 
                    type: 'sm', 
                    id: x * 8 + z,
                    utilization: 0
                };
                this.smUnits.push(sm);
                this.scene.add(sm);
            }
        }
    }

    createMemoryBlocks() {
        const memGeometry = new THREE.BoxGeometry(0.8, 0.05, 0.1);
        const memMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x0088ff,
            transparent: true,
            opacity: 0.6
        });

        // Create memory blocks around the edges
        for (let i = 0; i < 4; i++) {
            const memory = new THREE.Mesh(memGeometry, memMaterial.clone());
            const angle = (i / 4) * Math.PI * 2;
            memory.position.set(
                Math.cos(angle) * 1.8,
                0.05,
                Math.sin(angle) * 1.2
            );
            memory.rotation.y = angle;
            memory.userData = { 
                type: 'memory', 
                id: i,
                usage: 0
            };
            this.memoryBlocks.push(memory);
            this.scene.add(memory);
        }
    }

    createTensorCores() {
        const tensorGeometry = new THREE.SphereGeometry(0.05, 8, 6);
        const tensorMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xff6b6b,
            transparent: true,
            opacity: 0.8
        });

        // Create tensor cores scattered within SM units
        for (let i = 0; i < 16; i++) {
            const tensor = new THREE.Mesh(tensorGeometry, tensorMaterial.clone());
            tensor.position.set(
                (Math.random() - 0.5) * 2,
                0.25,
                (Math.random() - 0.5) * 1.5
            );
            tensor.userData = { 
                type: 'tensor', 
                id: i,
                active: false
            };
            this.tensorCores.push(tensor);
            this.scene.add(tensor);
        }
    }

    createParticleEffects() {
        const particlesGeometry = new THREE.BufferGeometry();
        const particlesCount = 1000;
        const posArray = new Float32Array(particlesCount * 3);

        for (let i = 0; i < particlesCount * 3; i++) {
            posArray[i] = (Math.random() - 0.5) * 10;
        }

        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

        const particlesMaterial = new THREE.PointsMaterial({
            size: 0.005,
            color: 0x00ff88,
            transparent: true,
            opacity: 0.3
        });

        const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
        this.scene.add(particlesMesh);
    }

    updateVisualizationSettings(setting, value) {
        this.visualizationSettings[setting] = value;

        switch (setting) {
            case 'showSMs':
                this.smUnits.forEach(sm => sm.visible = value);
                break;
            case 'showMemory':
                this.memoryBlocks.forEach(mem => mem.visible = value);
                break;
            case 'showTensors':
                this.tensorCores.forEach(tensor => tensor.visible = value);
                break;
        }
    }

    updateGPUVisualization(telemetryData) {
        if (!this.visualizationSettings.realTimeMode) return;

        // Update SM utilization with smooth color transitions
        this.smUnits.forEach((sm, index) => {
            const utilization = telemetryData.utilGPU / 100;
            const intensity = Math.random() * utilization;
            
            // Animate color based on utilization
            anime({
                targets: sm.material.color,
                r: intensity,
                g: 1,
                b: 0.5,
                duration: 200,
                easing: 'easeOutQuad'
            });

            // Animate scale for visual feedback
            if (intensity > 0.7) {
                anime({
                    targets: sm.scale,
                    x: 1.2,
                    y: 1.2,
                    z: 1.2,
                    duration: 300,
                    direction: 'alternate',
                    easing: 'easeInOutQuad'
                });
            }
        });

        // Update memory blocks
        this.memoryBlocks.forEach((mem, index) => {
            const usage = telemetryData.utilMemory / 100;
            mem.material.opacity = 0.3 + usage * 0.7;
            
            // Animate memory blocks
            anime({
                targets: mem.material.color,
                r: 0,
                g: usage,
                b: 1,
                duration: 500,
                easing: 'easeOutQuad'
            });
        });

        // Update tensor cores based on compute intensity
        this.tensorCores.forEach((tensor, index) => {
            const isActive = Math.random() < (telemetryData.utilGPU / 150);
            tensor.userData.active = isActive;
            
            if (isActive) {
                anime({
                    targets: tensor.material.color,
                    r: 1,
                    g: 0.4,
                    b: 0.4,
                    duration: 200
                });
                
                anime({
                    targets: tensor.scale,
                    x: 1.5,
                    y: 1.5,
                    z: 1.5,
                    duration: 300,
                    direction: 'alternate',
                    easing: 'easeInOutElastic'
                });
            }
        });

        // Rotate the entire GPU model slowly
        this.gpuModel.rotation.y += 0.005;
    }

    setupPerformanceCharts() {
        // Initialize canvas-based performance charts
        this.performanceCharts.util = this.createChart('utilChart', 'GPU Utilization', '#00ff88');
        this.performanceCharts.memory = this.createChart('memChart', 'Memory Usage', '#0088ff');
        this.performanceCharts.temp = this.createChart('tempChart', 'Temperature', '#ff6b6b');
    }

    createChart(canvasId, title, color) {
        const canvas = document.getElementById(canvasId);
        const ctx = canvas.getContext('2d');
        
        return {
            canvas,
            ctx,
            data: [],
            color,
            title,
            maxPoints: 50
        };
    }

    updatePerformanceCharts(telemetryData, history) {
        // Update utilization chart
        this.updateChart(this.performanceCharts.util, telemetryData.utilGPU, 0, 100);
        
        // Update memory chart
        const memoryPercent = (telemetryData.memoryUsed / telemetryData.memoryTotal) * 100;
        this.updateChart(this.performanceCharts.memory, memoryPercent, 0, 100);
        
        // Update temperature chart
        this.updateChart(this.performanceCharts.temp, telemetryData.temperature, 30, 90);
    }

    updateChart(chart, value, min, max) {
        chart.data.push(value);
        if (chart.data.length > chart.maxPoints) {
            chart.data.shift();
        }

        const ctx = chart.ctx;
        const canvas = chart.canvas;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw grid
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = (i / 4) * canvas.height;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }

        // Draw data line
        if (chart.data.length > 1) {
            ctx.strokeStyle = chart.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            chart.data.forEach((dataPoint, index) => {
                const x = (index / (chart.maxPoints - 1)) * canvas.width;
                const y = canvas.height - ((dataPoint - min) / (max - min)) * canvas.height;
                
                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            
            ctx.stroke();
        }

        // Draw current value
        ctx.fillStyle = chart.color;
        ctx.font = '12px monospace';
        ctx.fillText(`${value.toFixed(1)}`, 10, 20);
    }

    updateUI(telemetryData, isConnected) {
        // Update overlay stats
        document.getElementById('util-gpu').textContent = `${telemetryData.utilGPU.toFixed(1)}%`;
        document.getElementById('util-mem').textContent = `${telemetryData.utilMemory.toFixed(1)}%`;
        document.getElementById('sm-clock').textContent = `${telemetryData.smClock.toFixed(0)} MHz`;

        // Update side panel info
        document.getElementById('gpu-temp').textContent = `${telemetryData.temperature.toFixed(1)}°C`;
        document.getElementById('gpu-power').textContent = `${telemetryData.power.toFixed(1)}W`;
        document.getElementById('gpu-memory').textContent = 
            `${(telemetryData.memoryUsed / 1024).toFixed(1)} / ${(telemetryData.memoryTotal / 1024).toFixed(1)} GB`;

        // Update status bar
        document.getElementById('connection-status').textContent = isConnected ? 'Connected' : 'Disconnected';
        document.getElementById('connection-status').className = isConnected ? 'connected' : 'disconnected';
    }

    setupUI() {
        // Add some initial UI animations
        anime({
            targets: '.panel-section',
            opacity: [0, 1],
            translateY: [20, 0],
            delay: anime.stagger(100),
            duration: 800,
            easing: 'easeOutQuad'
        });
    }

    onWindowResize() {
        const container = document.getElementById('gpu-canvas-container');
        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }
}

// CONTROLLER: Business Logic and Coordination
class AppController {
    constructor(model, view) {
        this.model = model;
        this.view = view;
        this.isRecording = false;
        this.frameCount = 0;
        this.lastFrameTime = performance.now();
    }

    async init() {
        // Initialize any controller-specific setup
        this.updateFPS();
    }

    async connectGPU() {
        const connected = await this.model.connectGPU();
        
        if (connected) {
            await this.model.startTelemetryStream();
            this.showNotification('GPU Connected Successfully', 'success');
            
            // Update connect button
            const btn = document.getElementById('connectBtn');
            btn.textContent = 'Disconnect GPU';
            btn.classList.remove('primary');
            btn.classList.add('secondary');
        } else {
            this.showNotification('Failed to Connect to GPU', 'error');
        }
    }

    toggleRecording() {
        this.isRecording = !this.isRecording;
        const btn = document.getElementById('recordBtn');
        
        if (this.isRecording) {
            btn.textContent = 'Stop Recording';
            btn.classList.add('recording');
            this.showNotification('Recording Started', 'info');
        } else {
            btn.textContent = 'Record Session';
            btn.classList.remove('recording');
            this.showNotification('Recording Stopped', 'info');
        }
    }

    async loadNsightReport() {
        // In a real implementation, this would open a file dialog
        this.showNotification('Nsight Report Loading...', 'info');
        
        // Simulate loading
        setTimeout(() => {
            this.showNotification('Nsight Report Loaded', 'success');
            document.querySelector('.analysis-results .placeholder').textContent = 
                'Nsight analysis loaded successfully. Performance bottlenecks and optimization suggestions available.';
        }, 2000);
    }

    update() {
        if (!this.model.isConnected()) return;

        const telemetryData = this.model.getTelemetryData();
        const history = this.model.getPerformanceHistory();

        // Update visualization
        this.view.updateGPUVisualization(telemetryData);
        this.view.updatePerformanceCharts(telemetryData, history);
        this.view.updateUI(telemetryData, this.model.isConnected());

        // Update frame counter
        this.frameCount++;
        const currentTime = performance.now();
        if (currentTime >= this.lastFrameTime + 1000) {
            const fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFrameTime));
            document.getElementById('fps-counter').textContent = `FPS: ${fps}`;
            
            const frameTime = ((currentTime - this.lastFrameTime) / this.frameCount).toFixed(2);
            document.getElementById('frame-time').textContent = `Frame Time: ${frameTime} ms`;
            
            this.frameCount = 0;
            this.lastFrameTime = currentTime;
        }
    }

    updateFPS() {
        // FPS counter implementation is handled in the update loop
    }

    showNotification(message, type = 'info') {
        // Create a simple notification system
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
            transition: 'all 0.3s ease'
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

        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new NSightfulApp();
});

// Export for potential external use
export { NSightfulApp, DataModel, VisualizationView, AppController };
