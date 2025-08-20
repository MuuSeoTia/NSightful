// GPU Visualization View - Handles 3D rendering and UI updates
import * as THREE from 'three';
import anime from 'animejs';
import { DetailedGPUVisualization } from './DetailedGPUVisualization.js';

export class GPUVisualizationView {
    constructor() {
        // 3D Scene Components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        
        // GPU 3D Model Components
        this.gpuGroup = new THREE.Group();
        this.smUnits = [];
        this.memoryBlocks = [];
        this.tensorCores = [];
        this.interconnects = [];
        this.chipPackage = null;
        
        // Visual Effects
        this.particleSystems = [];
        this.glowEffects = [];
        this.dataFlows = [];
        
        // Animation State
        this.animationQueue = [];
        this.activeAnimations = new Set();
        
        // Visualization Settings
        this.settings = {
            showSMs: true,
            showMemory: true,
            showTensors: true,
            showInterconnects: true,
            showParticles: true,
            realTimeMode: true,
            animationSpeed: 1.0,
            qualityLevel: 'high',
            colorScheme: 'default'
        };

        // Performance monitoring
        this.performanceMetrics = {
            frameCount: 0,
            lastFrameTime: 0,
            averageFPS: 60,
            renderTime: 0
        };

        // Event callbacks for MVC communication
        this.eventCallbacks = new Map();

        // UI Components
        this.uiComponents = {
            performanceCharts: new Map(),
            statusIndicators: new Map(),
            controlPanels: new Map()
        };

        // Advanced detailed visualization
        this.detailedVisualization = null;
        this.isDetailedMode = true; // Enable detailed mode by default
    }

    // Initialization
    async initialize() {
        if (this.isDetailedMode) {
            // Initialize the extremely detailed visualization
            this.detailedVisualization = new DetailedGPUVisualization();
            await this.detailedVisualization.initialize();
            
            // Use the detailed visualization's components
            const vizData = this.detailedVisualization.getVisualizationData();
            this.scene = vizData.scene;
            this.camera = vizData.camera;
            this.renderer = vizData.renderer;
            this.gpuGroup = vizData.gpuGroup;
            this.gpuModel = vizData.gpuGroup;
            
            console.log('Detailed GPU Visualization initialized with anime.js');
        } else {
            // Fallback to basic visualization
            await this.setupThreeJS();
            await this.createGPUModel();
            this.setupLighting();
            this.setupParticleEffects();
            this.startRenderLoop();
        }
        
        this.setupPerformanceCharts();
        this.setupEventListeners();
        this.setupUI();
        
        console.log('GPU Visualization View initialized');
    }

    setupThreeJS() {
        const container = document.getElementById('gpu-canvas');
        if (!container) {
            throw new Error('Canvas container not found');
        }

        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a0a);
        this.scene.fog = new THREE.Fog(0x0a0a0a, 10, 50);

        // Camera setup
        this.camera = new THREE.PerspectiveCamera(
            75, 
            container.clientWidth / container.clientHeight, 
            0.1, 
            1000
        );
        this.camera.position.set(5, 3, 5);
        this.camera.lookAt(0, 0, 0);

        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: document.getElementById('gpu-canvas'),
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance'
        });
        
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;

        // Add the main GPU group to the scene
        this.scene.add(this.gpuGroup);

        this.setupCameraControls();
    }

    setupCameraControls() {
        let isMouseDown = false;
        let mouseX = 0;
        let mouseY = 0;
        let targetRotationX = 0;
        let targetRotationY = 0;
        let currentRotationX = 0;
        let currentRotationY = 0;
        let targetDistance = 8;
        let currentDistance = 8;

        const canvas = this.renderer.domElement;

        canvas.addEventListener('mousedown', (e) => {
            isMouseDown = true;
            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        canvas.addEventListener('mouseup', () => {
            isMouseDown = false;
        });

        canvas.addEventListener('mouseleave', () => {
            isMouseDown = false;
        });

        canvas.addEventListener('mousemove', (e) => {
            if (!isMouseDown) return;

            const deltaX = e.clientX - mouseX;
            const deltaY = e.clientY - mouseY;

            targetRotationY += deltaX * 0.01;
            targetRotationX += deltaY * 0.01;
            
            // Clamp vertical rotation
            targetRotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, targetRotationX));

            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            targetDistance += e.deltaY * 0.01;
            targetDistance = Math.max(3, Math.min(15, targetDistance));
        });

        // Smooth camera animation
        const updateCamera = () => {
            currentRotationX += (targetRotationX - currentRotationX) * 0.1;
            currentRotationY += (targetRotationY - currentRotationY) * 0.1;
            currentDistance += (targetDistance - currentDistance) * 0.1;

            this.camera.position.x = Math.sin(currentRotationY) * Math.cos(currentRotationX) * currentDistance;
            this.camera.position.y = Math.sin(currentRotationX) * currentDistance;
            this.camera.position.z = Math.cos(currentRotationY) * Math.cos(currentRotationX) * currentDistance;
            
            this.camera.lookAt(0, 0, 0);
            
            requestAnimationFrame(updateCamera);
        };
        updateCamera();
    }

    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);

        // Main directional light
        const mainLight = new THREE.DirectionalLight(0x00ff88, 1.2);
        mainLight.position.set(10, 10, 5);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        mainLight.shadow.camera.near = 0.5;
        mainLight.shadow.camera.far = 50;
        mainLight.shadow.camera.left = -10;
        mainLight.shadow.camera.right = 10;
        mainLight.shadow.camera.top = 10;
        mainLight.shadow.camera.bottom = -10;
        this.scene.add(mainLight);

        // Secondary lights for better illumination
        const secondaryLight = new THREE.DirectionalLight(0x0088ff, 0.6);
        secondaryLight.position.set(-5, 5, -5);
        this.scene.add(secondaryLight);

        const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
        fillLight.position.set(0, -5, 0);
        this.scene.add(fillLight);

        // Point lights for accent lighting
        const accentLight1 = new THREE.PointLight(0xff6b6b, 0.8, 10);
        accentLight1.position.set(3, 2, 3);
        this.scene.add(accentLight1);

        const accentLight2 = new THREE.PointLight(0x6b6bff, 0.8, 10);
        accentLight2.position.set(-3, 2, -3);
        this.scene.add(accentLight2);
    }

    async createGPUModel() {
        await this.createChipPackage();
        await this.createSMUnits();
        await this.createMemoryBlocks();
        await this.createTensorCores();
        await this.createInterconnects();
        await this.createCoolingSystem();
        
        console.log('GPU 3D model created with', {
            smUnits: this.smUnits.length,
            memoryBlocks: this.memoryBlocks.length,
            tensorCores: this.tensorCores.length
        });
    }

    async createChipPackage() {
        // Main GPU die
        const dieGeometry = new THREE.BoxGeometry(4, 0.1, 3);
        const dieMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x1a1a1a,
            metalness: 0.8,
            roughness: 0.2,
            clearcoat: 1.0,
            transparent: true,
            opacity: 0.95
        });
        
        this.chipPackage = new THREE.Mesh(dieGeometry, dieMaterial);
        this.chipPackage.receiveShadow = true;
        this.chipPackage.castShadow = true;
        this.gpuGroup.add(this.chipPackage);

        // Package substrate
        const substrateGeometry = new THREE.BoxGeometry(4.5, 0.05, 3.5);
        const substrateMaterial = new THREE.MeshLambertMaterial({
            color: 0x2a2a2a
        });
        
        const substrate = new THREE.Mesh(substrateGeometry, substrateMaterial);
        substrate.position.y = -0.075;
        substrate.receiveShadow = true;
        this.gpuGroup.add(substrate);

        // Add package details
        this.addPackageDetails();
    }

    addPackageDetails() {
        // Capacitors and resistors on the package
        for (let i = 0; i < 20; i++) {
            const componentGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.05);
            const componentMat = new THREE.MeshLambertMaterial({
                color: Math.random() > 0.5 ? 0x8B4513 : 0x2F4F4F
            });
            
            const component = new THREE.Mesh(componentGeo, componentMat);
            component.position.set(
                (Math.random() - 0.5) * 4,
                0.075,
                (Math.random() - 0.5) * 3
            );
            component.rotation.z = Math.PI / 2;
            this.gpuGroup.add(component);
        }
    }

    async createSMUnits() {
        const smGeometry = new THREE.BoxGeometry(0.18, 0.08, 0.18);
        
        // Create SM units in a realistic layout (e.g., 12x8 grid for high-end GPU)
        const smCols = 12;
        const smRows = 8;
        const spacing = 0.25;
        
        for (let row = 0; row < smRows; row++) {
            for (let col = 0; col < smCols; col++) {
                const smMaterial = new THREE.MeshPhysicalMaterial({
                    color: 0x00ff88,
                    transparent: true,
                    opacity: 0.8,
                    metalness: 0.3,
                    roughness: 0.4,
                    emissive: 0x002200,
                    emissiveIntensity: 0.1
                });

                const sm = new THREE.Mesh(smGeometry, smMaterial);
                
                sm.position.set(
                    (col - (smCols - 1) / 2) * spacing,
                    0.09,
                    (row - (smRows - 1) / 2) * spacing
                );
                
                sm.userData = {
                    type: 'sm',
                    id: row * smCols + col,
                    row,
                    col,
                    utilization: 0,
                    temperature: 0,
                    active: false
                };

                sm.castShadow = true;
                this.smUnits.push(sm);
                this.gpuGroup.add(sm);

                // Add cores within each SM
                await this.createCoresInSM(sm, 128); // 128 cores per SM for modern GPUs
            }
        }
    }

    async createCoresInSM(smMesh, coreCount) {
        const coreGeometry = new THREE.SphereGeometry(0.008, 6, 4);
        const coresPerRow = Math.ceil(Math.sqrt(coreCount));
        const coreSpacing = 0.02;
        
        for (let i = 0; i < coreCount; i++) {
            const row = Math.floor(i / coresPerRow);
            const col = i % coresPerRow;
            
            const coreMaterial = new THREE.MeshLambertMaterial({
                color: 0x004400,
                transparent: true,
                opacity: 0.6
            });
            
            const core = new THREE.Mesh(coreGeometry, coreMaterial);
            core.position.set(
                (col - (coresPerRow - 1) / 2) * coreSpacing,
                0.05,
                (row - (coresPerRow - 1) / 2) * coreSpacing
            );
            
            core.userData = {
                type: 'core',
                smId: smMesh.userData.id,
                coreId: i,
                active: false
            };
            
            smMesh.add(core);
        }
    }

    async createMemoryBlocks() {
        const memoryGeometry = new THREE.BoxGeometry(0.6, 0.1, 0.15);
        
        // Create memory blocks around the GPU die
        const memoryPositions = [
            { x: 2.5, z: 0, rotation: 0 },
            { x: -2.5, z: 0, rotation: 0 },
            { x: 0, z: 1.8, rotation: Math.PI / 2 },
            { x: 0, z: -1.8, rotation: Math.PI / 2 },
            { x: 1.8, z: 1.3, rotation: Math.PI / 4 },
            { x: -1.8, z: 1.3, rotation: -Math.PI / 4 },
            { x: 1.8, z: -1.3, rotation: -Math.PI / 4 },
            { x: -1.8, z: -1.3, rotation: Math.PI / 4 }
        ];

        for (let i = 0; i < memoryPositions.length; i++) {
            const pos = memoryPositions[i];
            
            const memoryMaterial = new THREE.MeshPhysicalMaterial({
                color: 0x0088ff,
                transparent: true,
                opacity: 0.7,
                metalness: 0.6,
                roughness: 0.3,
                emissive: 0x000022,
                emissiveIntensity: 0.1
            });

            const memory = new THREE.Mesh(memoryGeometry, memoryMaterial);
            memory.position.set(pos.x, 0.15, pos.z);
            memory.rotation.y = pos.rotation;
            
            memory.userData = {
                type: 'memory',
                id: i,
                usage: 0,
                bandwidth: 0,
                active: false
            };

            memory.castShadow = true;
            this.memoryBlocks.push(memory);
            this.gpuGroup.add(memory);

            // Add memory chips detail
            await this.addMemoryChipDetails(memory);
        }
    }

    async addMemoryChipDetails(memoryBlock) {
        const chipGeometry = new THREE.BoxGeometry(0.08, 0.02, 0.12);
        const chipMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        
        for (let i = 0; i < 6; i++) {
            const chip = new THREE.Mesh(chipGeometry, chipMaterial);
            chip.position.set(
                (i - 2.5) * 0.1,
                0.06,
                0
            );
            memoryBlock.add(chip);
        }
    }

    async createTensorCores() {
        const tensorGeometry = new THREE.OctahedronGeometry(0.04);
        
        // Distribute tensor cores throughout the SM array
        const tensorCoreCount = 64; // Modern GPUs have many tensor cores
        
        for (let i = 0; i < tensorCoreCount; i++) {
            const tensorMaterial = new THREE.MeshPhysicalMaterial({
                color: 0xff6b6b,
                transparent: true,
                opacity: 0.8,
                metalness: 0.7,
                roughness: 0.2,
                emissive: 0x220000,
                emissiveIntensity: 0.2
            });

            const tensor = new THREE.Mesh(tensorGeometry, tensorMaterial);
            
            // Position tensor cores near SM units
            const smIndex = Math.floor(i / (tensorCoreCount / this.smUnits.length));
            const targetSM = this.smUnits[smIndex];
            
            if (targetSM) {
                tensor.position.set(
                    targetSM.position.x + (Math.random() - 0.5) * 0.3,
                    0.2,
                    targetSM.position.z + (Math.random() - 0.5) * 0.3
                );
            }
            
            tensor.userData = {
                type: 'tensor',
                id: i,
                smId: smIndex,
                active: false,
                workload: 0
            };

            tensor.castShadow = true;
            this.tensorCores.push(tensor);
            this.gpuGroup.add(tensor);
        }
    }

    async createInterconnects() {
        // Create interconnect network visualization
        const interconnectMaterial = new THREE.LineBasicMaterial({
            color: 0x666666,
            transparent: true,
            opacity: 0.3
        });

        // Connect SMs to each other (simplified mesh network)
        for (let i = 0; i < this.smUnits.length; i++) {
            const sm1 = this.smUnits[i];
            
            // Connect to nearby SMs
            for (let j = i + 1; j < this.smUnits.length; j++) {
                const sm2 = this.smUnits[j];
                const distance = sm1.position.distanceTo(sm2.position);
                
                if (distance < 0.5) { // Only connect nearby SMs
                    const geometry = new THREE.BufferGeometry().setFromPoints([
                        sm1.position.clone().add(new THREE.Vector3(0, 0.1, 0)),
                        sm2.position.clone().add(new THREE.Vector3(0, 0.1, 0))
                    ]);
                    
                    const line = new THREE.Line(geometry, interconnectMaterial);
                    line.userData = {
                        type: 'interconnect',
                        sm1: i,
                        sm2: j,
                        traffic: 0
                    };
                    
                    this.interconnects.push(line);
                    this.gpuGroup.add(line);
                }
            }
        }

        // Connect SMs to memory blocks
        for (let i = 0; i < this.smUnits.length; i++) {
            const sm = this.smUnits[i];
            const nearestMemory = this.findNearestMemoryBlock(sm.position);
            
            if (nearestMemory) {
                const geometry = new THREE.BufferGeometry().setFromPoints([
                    sm.position.clone().add(new THREE.Vector3(0, 0.08, 0)),
                    nearestMemory.position.clone()
                ]);
                
                const line = new THREE.Line(geometry, interconnectMaterial);
                line.userData = {
                    type: 'memory_interconnect',
                    smId: i,
                    memoryId: nearestMemory.userData.id,
                    traffic: 0
                };
                
                this.interconnects.push(line);
                this.gpuGroup.add(line);
            }
        }
    }

    findNearestMemoryBlock(position) {
        let nearest = null;
        let minDistance = Infinity;
        
        for (const memory of this.memoryBlocks) {
            const distance = position.distanceTo(memory.position);
            if (distance < minDistance) {
                minDistance = distance;
                nearest = memory;
            }
        }
        
        return nearest;
    }

    async createCoolingSystem() {
        // Create a simplified cooling solution visualization
        const heatSinkGeometry = new THREE.BoxGeometry(5, 0.3, 4);
        const heatSinkMaterial = new THREE.MeshLambertMaterial({
            color: 0x888888,
            transparent: true,
            opacity: 0.3
        });
        
        const heatSink = new THREE.Mesh(heatSinkGeometry, heatSinkMaterial);
        heatSink.position.y = 0.5;
        this.gpuGroup.add(heatSink);

        // Add heat pipes
        for (let i = 0; i < 6; i++) {
            const pipeGeometry = new THREE.CylinderGeometry(0.02, 0.02, 4);
            const pipeMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 });
            
            const pipe = new THREE.Mesh(pipeGeometry, pipeMaterial);
            pipe.position.set(
                (i - 2.5) * 0.3,
                0.4,
                0
            );
            pipe.rotation.z = Math.PI / 2;
            this.gpuGroup.add(pipe);
        }
    }

    setupParticleEffects() {
        // Data flow particles
        this.createDataFlowParticles();
        
        // Heat visualization particles
        this.createHeatParticles();
        
        // Electromagnetic field visualization
        this.createEMFieldParticles();
    }

    createDataFlowParticles() {
        const particleCount = 1000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            
            positions[i3] = (Math.random() - 0.5) * 10;
            positions[i3 + 1] = Math.random() * 2;
            positions[i3 + 2] = (Math.random() - 0.5) * 8;
            
            colors[i3] = 0.0;     // R
            colors[i3 + 1] = 1.0; // G
            colors[i3 + 2] = 0.5; // B
            
            velocities[i3] = (Math.random() - 0.5) * 0.02;
            velocities[i3 + 1] = (Math.random() - 0.5) * 0.02;
            velocities[i3 + 2] = (Math.random() - 0.5) * 0.02;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

        const material = new THREE.PointsMaterial({
            size: 0.02,
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });

        const particles = new THREE.Points(geometry, material);
        particles.userData = { type: 'dataflow' };
        this.particleSystems.push(particles);
        this.scene.add(particles);
    }

    createHeatParticles() {
        const particleCount = 500;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            
            positions[i3] = (Math.random() - 0.5) * 4;
            positions[i3 + 1] = Math.random() * 3;
            positions[i3 + 2] = (Math.random() - 0.5) * 3;
            
            colors[i3] = 1.0;     // R
            colors[i3 + 1] = 0.3; // G
            colors[i3 + 2] = 0.0; // B
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.015,
            vertexColors: true,
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending
        });

        const heatParticles = new THREE.Points(geometry, material);
        heatParticles.userData = { type: 'heat' };
        this.particleSystems.push(heatParticles);
        this.scene.add(heatParticles);
    }

    createEMFieldParticles() {
        const particleCount = 300;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            
            positions[i3] = (Math.random() - 0.5) * 8;
            positions[i3 + 1] = (Math.random() - 0.5) * 4;
            positions[i3 + 2] = (Math.random() - 0.5) * 6;
            
            colors[i3] = 0.0;     // R
            colors[i3 + 1] = 0.5; // G
            colors[i3 + 2] = 1.0; // B
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.01,
            vertexColors: true,
            transparent: true,
            opacity: 0.3,
            blending: THREE.AdditiveBlending
        });

        const emParticles = new THREE.Points(geometry, material);
        emParticles.userData = { type: 'electromagnetic' };
        this.particleSystems.push(emParticles);
        this.scene.add(emParticles);
    }

    // Telemetry Data Visualization Updates
    updateVisualization(telemetryData) {
        if (!this.settings.realTimeMode) return;

        if (this.isDetailedMode && this.detailedVisualization) {
            // Use the detailed visualization's update method
            this.detailedVisualization.updateVisualizationWithTelemetry(telemetryData);
        } else {
            // Fallback to basic visualization updates
            this.updateSMUnits(telemetryData);
            this.updateMemoryBlocks(telemetryData);
            this.updateTensorCores(telemetryData);
            this.updateParticleEffects(telemetryData);
            this.updateInterconnects(telemetryData);
        }
        
        this.updatePerformanceOverlay(telemetryData);
    }

    updateSMUnits(telemetryData) {
        const baseUtilization = telemetryData.utilGPU / 100;
        
        this.smUnits.forEach((sm, index) => {
            const smUtil = telemetryData.smUtilizations?.[index] || 
                          (baseUtilization + (Math.random() - 0.5) * 0.3);
            
            sm.userData.utilization = Math.max(0, Math.min(1, smUtil / 100));
            sm.userData.active = sm.userData.utilization > 0.1;

            // Update color based on utilization
            const intensity = sm.userData.utilization;
            const color = new THREE.Color();
            color.setHSL(0.33 * (1 - intensity), 1, 0.5); // Green to red gradient
            
            // Animate color change
            anime({
                targets: sm.material.color,
                r: color.r,
                g: color.g,
                b: color.b,
                duration: 200,
                easing: 'easeOutQuad'
            });

            // Update emissive intensity
            sm.material.emissiveIntensity = 0.1 + intensity * 0.3;

            // Scale animation for high utilization
            if (intensity > 0.8) {
                anime({
                    targets: sm.scale,
                    x: 1.1,
                    y: 1.1,
                    z: 1.1,
                    duration: 300,
                    direction: 'alternate',
                    easing: 'easeInOutQuad'
                });
            } else {
                anime({
                    targets: sm.scale,
                    x: 1,
                    y: 1,
                    z: 1,
                    duration: 200,
                    easing: 'easeOutQuad'
                });
            }

            // Update cores within SM
            this.updateSMCores(sm, intensity);
        });
    }

    updateSMCores(smMesh, utilization) {
        const cores = smMesh.children.filter(child => child.userData.type === 'core');
        const activeCoreCount = Math.floor(cores.length * utilization);
        
        cores.forEach((core, index) => {
            const isActive = index < activeCoreCount;
            core.userData.active = isActive;
            
            if (isActive) {
                core.material.color.setHex(0x00ff00);
                core.material.opacity = 0.8;
            } else {
                core.material.color.setHex(0x004400);
                core.material.opacity = 0.3;
            }
        });
    }

    updateMemoryBlocks(telemetryData) {
        const memoryUtilization = telemetryData.utilMemory / 100;
        const bandwidth = telemetryData.memoryBandwidth || 0;
        
        this.memoryBlocks.forEach((memory, index) => {
            const blockUsage = memoryUtilization + (Math.random() - 0.5) * 0.2;
            memory.userData.usage = Math.max(0, Math.min(1, blockUsage));
            memory.userData.bandwidth = bandwidth * (0.8 + Math.random() * 0.4);
            memory.userData.active = memory.userData.usage > 0.1;

            // Update visual appearance
            const intensity = memory.userData.usage;
            memory.material.opacity = 0.4 + intensity * 0.6;
            memory.material.emissiveIntensity = 0.1 + intensity * 0.4;

            // Animate based on bandwidth usage
            if (memory.userData.bandwidth > 700) { // High bandwidth usage
                anime({
                    targets: memory.position,
                    y: 0.15 + Math.sin(Date.now() * 0.01) * 0.02,
                    duration: 100,
                    easing: 'easeInOutSine'
                });
            }
        });
    }

    updateTensorCores(telemetryData) {
        // Tensor cores are typically used for AI/ML workloads
        const aiWorkloadIntensity = this.calculateAIWorkloadIntensity(telemetryData);
        
        this.tensorCores.forEach((tensor, index) => {
            const isActive = Math.random() < aiWorkloadIntensity;
            tensor.userData.active = isActive;
            tensor.userData.workload = isActive ? Math.random() : 0;

            if (isActive) {
                // Bright and active
                tensor.material.color.setHex(0xff4444);
                tensor.material.emissiveIntensity = 0.5;
                
                // Rotation animation
                anime({
                    targets: tensor.rotation,
                    x: tensor.rotation.x + Math.PI * 2,
                    y: tensor.rotation.y + Math.PI * 2,
                    duration: 2000,
                    easing: 'linear'
                });
            } else {
                // Dim and inactive
                tensor.material.color.setHex(0x661111);
                tensor.material.emissiveIntensity = 0.1;
            }
        });
    }

    calculateAIWorkloadIntensity(telemetryData) {
        // Heuristic to detect AI/ML workloads based on telemetry patterns
        const highGPUUtil = telemetryData.utilGPU > 80;
        const moderateMemUtil = telemetryData.utilMemory > 60 && telemetryData.utilMemory < 90;
        const consistentLoad = true; // Would check for consistent utilization patterns
        
        if (highGPUUtil && moderateMemUtil && consistentLoad) {
            return 0.8; // High probability of AI workload
        } else if (highGPUUtil) {
            return 0.3; // Some AI activity
        } else {
            return 0.1; // Minimal AI activity
        }
    }

    updateParticleEffects(telemetryData) {
        const time = Date.now() * 0.001;
        
        this.particleSystems.forEach(system => {
            const positions = system.geometry.attributes.position.array;
            const colors = system.geometry.attributes.color.array;
            
            switch (system.userData.type) {
                case 'dataflow':
                    this.updateDataFlowParticles(positions, colors, telemetryData, time);
                    break;
                case 'heat':
                    this.updateHeatParticles(positions, colors, telemetryData, time);
                    break;
                case 'electromagnetic':
                    this.updateEMFieldParticles(positions, colors, telemetryData, time);
                    break;
            }
            
            system.geometry.attributes.position.needsUpdate = true;
            system.geometry.attributes.color.needsUpdate = true;
        });
    }

    updateDataFlowParticles(positions, colors, telemetryData, time) {
        const flowIntensity = telemetryData.utilGPU / 100;
        
        for (let i = 0; i < positions.length; i += 3) {
            // Move particles along data paths
            positions[i] += Math.sin(time + i) * 0.01 * flowIntensity;
            positions[i + 1] += Math.cos(time + i) * 0.005 * flowIntensity;
            positions[i + 2] += Math.sin(time * 0.7 + i) * 0.008 * flowIntensity;
            
            // Wrap around bounds
            if (positions[i] > 5) positions[i] = -5;
            if (positions[i] < -5) positions[i] = 5;
            if (positions[i + 2] > 4) positions[i + 2] = -4;
            if (positions[i + 2] < -4) positions[i + 2] = 4;
            
            // Update colors based on flow intensity
            colors[i + 1] = flowIntensity; // Green channel
        }
    }

    updateHeatParticles(positions, colors, telemetryData, time) {
        const temperature = telemetryData.temperature || 50;
        const heatIntensity = Math.max(0, (temperature - 40) / 60); // Normalize to 0-1
        
        for (let i = 0; i < positions.length; i += 3) {
            // Heat rises
            positions[i + 1] += 0.01 * heatIntensity;
            
            // Add some turbulence
            positions[i] += Math.sin(time * 2 + i) * 0.005 * heatIntensity;
            positions[i + 2] += Math.cos(time * 2 + i) * 0.005 * heatIntensity;
            
            // Reset when particles go too high
            if (positions[i + 1] > 3) {
                positions[i + 1] = 0;
                positions[i] = (Math.random() - 0.5) * 4;
                positions[i + 2] = (Math.random() - 0.5) * 3;
            }
            
            // Update heat colors
            colors[i] = Math.min(1, heatIntensity + 0.5); // Red
            colors[i + 1] = heatIntensity * 0.5; // Green
        }
    }

    updateEMFieldParticles(positions, colors, telemetryData, time) {
        const clockSpeed = telemetryData.smClock / 2000; // Normalize
        
        for (let i = 0; i < positions.length; i += 3) {
            // Create electromagnetic field visualization
            const radius = 3;
            const angle = time * clockSpeed + i * 0.01;
            
            positions[i] = Math.cos(angle) * radius * (0.5 + Math.random() * 0.5);
            positions[i + 1] = Math.sin(angle * 0.5) * 2;
            positions[i + 2] = Math.sin(angle) * radius * (0.5 + Math.random() * 0.5);
            
            // Pulsing blue color based on clock speed
            colors[i + 2] = 0.5 + Math.sin(time * 10) * 0.5 * clockSpeed; // Blue
        }
    }

    updateInterconnects(telemetryData) {
        // Update interconnect traffic visualization
        const dataTraffic = telemetryData.memoryBandwidth / 1000; // Normalize
        
        this.interconnects.forEach(interconnect => {
            const traffic = dataTraffic * (0.5 + Math.random() * 0.5);
            interconnect.userData.traffic = traffic;
            
            // Update line opacity based on traffic
            interconnect.material.opacity = 0.1 + traffic * 0.4;
            
            // Color coding based on traffic type
            if (interconnect.userData.type === 'memory_interconnect') {
                interconnect.material.color.setHSL(0.6, 1, 0.5 + traffic * 0.3); // Blue spectrum
            } else {
                interconnect.material.color.setHSL(0.33, 1, 0.3 + traffic * 0.4); // Green spectrum
            }
        });
    }

    updatePerformanceOverlay(telemetryData) {
        // Update the overlay statistics
        document.getElementById('util-gpu').textContent = `${telemetryData.utilGPU.toFixed(1)}%`;
        document.getElementById('util-mem').textContent = `${telemetryData.utilMemory.toFixed(1)}%`;
        document.getElementById('sm-clock').textContent = `${telemetryData.smClock.toFixed(0)} MHz`;
        
        // Update side panel information
        document.getElementById('gpu-temp').textContent = `${telemetryData.temperature.toFixed(1)}°C`;
        document.getElementById('gpu-power').textContent = `${telemetryData.power.toFixed(1)}W`;
        
        const memUsedGB = (telemetryData.memoryUsed / (1024 * 1024 * 1024)).toFixed(1);
        const memTotalGB = (telemetryData.memoryTotal / (1024 * 1024 * 1024)).toFixed(1);
        document.getElementById('gpu-memory').textContent = `${memUsedGB} / ${memTotalGB} GB`;
    }

    // Performance chart management
    setupPerformanceCharts() {
        this.uiComponents.performanceCharts.set('utilization', this.createChart('utilChart', 'GPU Utilization', '#00ff88'));
        this.uiComponents.performanceCharts.set('memory', this.createChart('memChart', 'Memory Usage', '#0088ff'));
        this.uiComponents.performanceCharts.set('temperature', this.createChart('tempChart', 'Temperature', '#ff6b6b'));
    }

    createChart(canvasId, title, color) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;
        
        const ctx = canvas.getContext('2d');
        
        return {
            canvas,
            ctx,
            data: [],
            color,
            title,
            maxPoints: 60,
            min: 0,
            max: 100
        };
    }

    updatePerformanceCharts(telemetryData, history) {
        const utilizationChart = this.uiComponents.performanceCharts.get('utilization');
        const memoryChart = this.uiComponents.performanceCharts.get('memory');
        const temperatureChart = this.uiComponents.performanceCharts.get('temperature');
        
        if (utilizationChart) {
            this.updateChart(utilizationChart, telemetryData.utilGPU, 0, 100);
        }
        
        if (memoryChart) {
            const memoryPercent = (telemetryData.memoryUsed / telemetryData.memoryTotal) * 100;
            this.updateChart(memoryChart, memoryPercent, 0, 100);
        }
        
        if (temperatureChart) {
            this.updateChart(temperatureChart, telemetryData.temperature, 30, 100);
        }
    }

    updateChart(chart, value, min, max) {
        if (!chart || !chart.ctx) return;
        
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
        ctx.globalAlpha = 0.3;
        for (let i = 0; i <= 4; i++) {
            const y = (i / 4) * canvas.height;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;

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

    // Settings and controls
    updateVisualizationSettings(setting, value) {
        this.settings[setting] = value;

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
            case 'showInterconnects':
                this.interconnects.forEach(interconnect => interconnect.visible = value);
                break;
            case 'showParticles':
                this.particleSystems.forEach(system => system.visible = value);
                break;
        }
    }

    // Event handling
    setupEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize());
    }

    onWindowResize() {
        const container = document.getElementById('gpu-canvas-container');
        if (!container) return;
        
        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
    }

    // Render loop
    startRenderLoop() {
        const render = (timestamp) => {
            this.updatePerformanceMetrics(timestamp);
            this.animateScene();
            this.renderer.render(this.scene, this.camera);
            requestAnimationFrame(render);
        };
        requestAnimationFrame(render);
    }

    updatePerformanceMetrics(timestamp) {
        this.performanceMetrics.frameCount++;
        
        if (timestamp >= this.performanceMetrics.lastFrameTime + 1000) {
            this.performanceMetrics.averageFPS = Math.round(
                (this.performanceMetrics.frameCount * 1000) / 
                (timestamp - this.performanceMetrics.lastFrameTime)
            );
            
            // Update FPS display
            const fpsElement = document.getElementById('fps-counter');
            if (fpsElement) {
                fpsElement.textContent = `FPS: ${this.performanceMetrics.averageFPS}`;
            }
            
            this.performanceMetrics.frameCount = 0;
            this.performanceMetrics.lastFrameTime = timestamp;
        }
    }

    animateScene() {
        const time = Date.now() * 0.001;
        
        // Subtle GPU rotation
        this.gpuGroup.rotation.y = Math.sin(time * 0.1) * 0.05;
        
        // Animate particle systems
        this.animateParticleSystems(time);
    }

    animateParticleSystems(time) {
        this.particleSystems.forEach(system => {
            if (system.userData.type === 'dataflow') {
                system.rotation.y += 0.001;
            } else if (system.userData.type === 'electromagnetic') {
                system.rotation.x = Math.sin(time * 0.5) * 0.1;
                system.rotation.z = Math.cos(time * 0.3) * 0.1;
            }
        });
    }

    // Public interface for controller
    addEventListener(event, callback) {
        if (!this.eventCallbacks.has(event)) {
            this.eventCallbacks.set(event, []);
        }
        this.eventCallbacks.get(event).push(callback);
    }

    emit(event, data) {
        if (this.eventCallbacks.has(event)) {
            this.eventCallbacks.get(event).forEach(callback => callback(data));
        }
    }

    // Setup UI components and interactions
    setupUI() {
        console.log('Setting up UI components...');
        
        // Initialize UI state
        this.setupUIEventListeners();
        this.initializeControlValues();
        
        console.log('UI setup complete');
    }

    setupUIEventListeners() {
        // Animation speed control
        const speedSlider = document.getElementById('animationSpeed');
        const speedValue = document.getElementById('speedValue');
        
        if (speedSlider && speedValue) {
            speedSlider.addEventListener('input', (e) => {
                const speed = parseFloat(e.target.value);
                speedValue.textContent = `${speed}x`;
                this.settings.animationSpeed = speed;
            });
        }

        // Camera mode selector
        const cameraMode = document.getElementById('cameraMode');
        if (cameraMode) {
            cameraMode.addEventListener('change', (e) => {
                this.settings.cameraMode = e.target.value;
                console.log('Camera mode changed to:', e.target.value);
            });
        }

        // Boot sequence button
        const bootBtn = document.getElementById('triggerBootSequence');
        if (bootBtn) {
            bootBtn.addEventListener('click', () => {
                this.triggerBootSequence();
            });
        }

        // Stress test button
        const stressBtn = document.getElementById('triggerStressTest');
        if (stressBtn) {
            stressBtn.addEventListener('click', () => {
                this.triggerStressTest();
            });
        }
    }

    initializeControlValues() {
        // Set initial values for UI controls
        const speedValue = document.getElementById('speedValue');
        if (speedValue) {
            speedValue.textContent = `${this.settings.animationSpeed}x`;
        }
    }

    triggerBootSequence() {
        console.log('Triggering boot sequence animation...');
        if (this.detailedVisualization && this.detailedVisualization.animationTimelines.bootSequence) {
            this.detailedVisualization.animationTimelines.bootSequence.restart();
        }
        
        // Add visual feedback
        const bootBtn = document.getElementById('triggerBootSequence');
        if (bootBtn) {
            bootBtn.classList.add('boot-sequence-active');
            setTimeout(() => {
                bootBtn.classList.remove('boot-sequence-active');
            }, 3000);
        }
    }

    triggerStressTest() {
        console.log('Triggering stress test simulation...');
        if (this.detailedVisualization) {
            // Simulate high utilization for demo
            const mockHighUtilData = {
                util_gpu: 95,
                util_memory: 88,
                temperature_c: 85,
                sm_utilizations: new Array(128).fill(0.9)
            };
            
            this.detailedVisualization.updateVisualizationWithTelemetry(mockHighUtilData);
            
            // Reset after 5 seconds
            setTimeout(() => {
                const mockNormalData = {
                    util_gpu: 25,
                    util_memory: 30,
                    temperature_c: 55,
                    sm_utilizations: new Array(128).fill(0.2)
                };
                this.detailedVisualization.updateVisualizationWithTelemetry(mockNormalData);
            }, 5000);
        }
    }
}

