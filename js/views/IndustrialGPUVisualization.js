// Industrial GPU Visualization - High-detail mechanical GPU like the reference image
import * as THREE from 'three';

export class IndustrialGPUVisualization {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.composer = null;
        
        // GPU Components
        this.gpuComponents = {
            mainPCB: null,
            gpuDie: null,
            memoryModules: [],
            vrms: [],
            capacitors: [],
            connectors: [],
            coolingFans: [],
            heatSink: null,
            backplate: null,
            shroud: null,
            pipes: [],
            smBlocks: [],
            tensorCores: [],
            rtCores: []
        };
        
        // Materials
        this.materials = {
            pcb: null,
            metal: null,
            plastic: null,
            silicon: null,
            copper: null,
            activeMetal: null,
            glowMaterial: null
        };
        
        // Animation state
        this.animationState = {
            rotation: { x: 0, y: 0 },
            targetRotation: { x: 0, y: 0 },
            cameraPosition: new THREE.Vector3(0, 5, 15),
            targetCameraPosition: new THREE.Vector3(0, 5, 15),
            isolationMode: null,
            componentsVisible: {
                sms: true,
                memory: true,
                tensors: true,
                rtCores: true,
                cooling: true,
                pcb: true
            }
        };
        
        // Performance data
        this.performanceData = {
            smUtilizations: new Array(128).fill(0),
            tensorActivity: new Array(32).fill(0),
            rtActivity: new Array(84).fill(0),
            memoryActivity: new Array(12).fill(0),
            temperature: 0,
            power: 0
        };
    }

    async initialize() {
        await this.setupRenderer();
        this.createMaterials();
        await this.buildIndustrialGPU();
        this.setupLighting();
        this.setupPostProcessing();
        this.setupControls();
        this.startRenderLoop();
        
        console.log('Industrial GPU Visualization initialized');
    }

    async setupRenderer() {
        const container = document.getElementById('gpu-visualization') || 
                         document.getElementById('gpu-visualization-full');
        
        if (!container) {
            console.error('Visualization container not found');
            return;
        }

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a0a);
        this.scene.fog = new THREE.FogExp2(0x0a0a0a, 0.002);

        // Camera - positioned for dramatic angle like reference image
        const aspect = container.clientWidth / container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
        this.camera.position.copy(this.animationState.cameraPosition);
        this.camera.lookAt(0, 0, 0);

        // Renderer with advanced settings
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance'
        });
        
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // Enhanced rendering settings
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.5;
        this.renderer.physicallyCorrectLights = true;

        container.appendChild(this.renderer.domElement);

        // Handle resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    createMaterials() {
        // PCB Material - dark green with subtle patterns
        this.materials.pcb = new THREE.MeshPhysicalMaterial({
            color: 0x1a4a2e,
            roughness: 0.8,
            metalness: 0.1,
            clearcoat: 0.3,
            clearcoatRoughness: 0.4
        });

        // Metal Material - brushed aluminum look
        this.materials.metal = new THREE.MeshPhysicalMaterial({
            color: 0x8a8a8a,
            roughness: 0.3,
            metalness: 0.9,
            envMapIntensity: 1.0
        });

        // Active Metal - for components that light up
        this.materials.activeMetal = new THREE.MeshPhysicalMaterial({
            color: 0x00ff88,
            roughness: 0.2,
            metalness: 0.8,
            emissive: 0x004422,
            emissiveIntensity: 0.3
        });

        // Plastic/Shroud Material
        this.materials.plastic = new THREE.MeshPhysicalMaterial({
            color: 0x2a2a2a,
            roughness: 0.6,
            metalness: 0.0,
            clearcoat: 0.8,
            clearcoatRoughness: 0.2
        });

        // Silicon Material - for GPU die
        this.materials.silicon = new THREE.MeshPhysicalMaterial({
            color: 0x1a1a1a,
            roughness: 0.1,
            metalness: 0.3,
            clearcoat: 1.0,
            clearcoatRoughness: 0.0
        });

        // Copper Material - for heat pipes and traces
        this.materials.copper = new THREE.MeshPhysicalMaterial({
            color: 0xb87333,
            roughness: 0.4,
            metalness: 0.9
        });

        // Glow Material - for active components
        this.materials.glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff88,
            transparent: true,
            opacity: 0.6
        });
    }

    async buildIndustrialGPU() {
        // Create main PCB
        this.createMainPCB();
        
        // Create GPU die and components
        this.createGPUDie();
        this.createMemoryModules();
        this.createVRMs();
        this.createCapacitors();
        this.createConnectors();
        
        // Create cooling system
        this.createHeatSink();
        this.createFans();
        this.createHeatPipes();
        this.createShroud();
        
        // Create detailed SM blocks
        this.createSMBlocks();
        this.createTensorCores();
        this.createRTCores();
    }

    createMainPCB() {
        // Main PCB - large rectangular board
        const pcbGeometry = new THREE.BoxGeometry(12, 0.2, 8);
        this.gpuComponents.mainPCB = new THREE.Mesh(pcbGeometry, this.materials.pcb);
        this.gpuComponents.mainPCB.receiveShadow = true;
        this.scene.add(this.gpuComponents.mainPCB);

        // Add PCB traces and patterns
        this.createPCBTraces();
    }

    createPCBTraces() {
        // Create copper traces on PCB
        const traceGroup = new THREE.Group();
        
        for (let i = 0; i < 20; i++) {
            const traceGeometry = new THREE.BoxGeometry(
                Math.random() * 2 + 0.5, 
                0.01, 
                Math.random() * 0.1 + 0.02
            );
            const trace = new THREE.Mesh(traceGeometry, this.materials.copper);
            
            trace.position.set(
                (Math.random() - 0.5) * 10,
                0.11,
                (Math.random() - 0.5) * 6
            );
            
            traceGroup.add(trace);
        }
        
        this.scene.add(traceGroup);
    }

    createGPUDie() {
        // Main GPU die - large central processor
        const dieGeometry = new THREE.BoxGeometry(2.5, 0.3, 2.5);
        this.gpuComponents.gpuDie = new THREE.Mesh(dieGeometry, this.materials.silicon);
        this.gpuComponents.gpuDie.position.set(0, 0.25, 0);
        this.gpuComponents.gpuDie.castShadow = true;
        this.scene.add(this.gpuComponents.gpuDie);

        // Add detailed surface patterns
        this.createDieDetails();
    }

    createDieDetails() {
        // Create detailed patterns on the GPU die
        const detailGroup = new THREE.Group();
        detailGroup.position.copy(this.gpuComponents.gpuDie.position);
        
        // Grid pattern
        for (let x = -1; x <= 1; x += 0.5) {
            for (let z = -1; z <= 1; z += 0.5) {
                const detailGeometry = new THREE.BoxGeometry(0.3, 0.05, 0.3);
                const detail = new THREE.Mesh(detailGeometry, this.materials.activeMetal);
                detail.position.set(x, 0.2, z);
                detailGroup.add(detail);
            }
        }
        
        this.scene.add(detailGroup);
    }

    createMemoryModules() {
        // Create GDDR6X memory modules around the GPU
        const memoryPositions = [
            [-3.5, 0, 1.5], [-3.5, 0, -1.5],
            [3.5, 0, 1.5], [3.5, 0, -1.5],
            [-1.5, 0, 3], [1.5, 0, 3],
            [-1.5, 0, -3], [1.5, 0, -3],
            [-3.5, 0, 0], [3.5, 0, 0],
            [0, 0, 3.5], [0, 0, -3.5]
        ];

        memoryPositions.forEach((pos, index) => {
            const memGeometry = new THREE.BoxGeometry(0.8, 0.3, 0.6);
            const memModule = new THREE.Mesh(memGeometry, this.materials.silicon);
            memModule.position.set(...pos, 0.25);
            memModule.castShadow = true;
            memModule.userData = { type: 'memory', index: index };
            
            this.gpuComponents.memoryModules.push(memModule);
            this.scene.add(memModule);
        });
    }

    createVRMs() {
        // Voltage regulator modules
        const vrmPositions = [
            [-5, 0, 2], [-5, 0, 0], [-5, 0, -2],
            [5, 0, 2], [5, 0, 0], [5, 0, -2]
        ];

        vrmPositions.forEach((pos, index) => {
            const vrmGeometry = new THREE.BoxGeometry(1.2, 0.6, 0.8);
            const vrm = new THREE.Mesh(vrmGeometry, this.materials.metal);
            vrm.position.set(...pos, 0.4);
            vrm.castShadow = true;
            vrm.userData = { type: 'vrm', index: index };
            
            this.gpuComponents.vrms.push(vrm);
            this.scene.add(vrm);
        });
    }

    createCapacitors() {
        // Small capacitors scattered around
        for (let i = 0; i < 50; i++) {
            const capGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.2, 8);
            const capacitor = new THREE.Mesh(capGeometry, this.materials.metal);
            
            capacitor.position.set(
                (Math.random() - 0.5) * 10,
                0.2,
                (Math.random() - 0.5) * 6
            );
            
            capacitor.castShadow = true;
            this.gpuComponents.capacitors.push(capacitor);
            this.scene.add(capacitor);
        }
    }

    createConnectors() {
        // PCIe connector
        const pcieGeometry = new THREE.BoxGeometry(1, 0.4, 4);
        const pcieConnector = new THREE.Mesh(pcieGeometry, this.materials.plastic);
        pcieConnector.position.set(-5.5, 0.3, 0);
        pcieConnector.castShadow = true;
        this.scene.add(pcieConnector);

        // Power connectors
        const powerGeometry = new THREE.BoxGeometry(0.8, 0.6, 1.5);
        const power1 = new THREE.Mesh(powerGeometry, this.materials.plastic);
        const power2 = new THREE.Mesh(powerGeometry, this.materials.plastic);
        
        power1.position.set(4, 0.4, 3.5);
        power2.position.set(4, 0.4, 1.5);
        
        power1.castShadow = true;
        power2.castShadow = true;
        
        this.scene.add(power1);
        this.scene.add(power2);
    }

    createHeatSink() {
        // Massive heat sink with fins
        const baseGeometry = new THREE.BoxGeometry(6, 1, 4);
        this.gpuComponents.heatSink = new THREE.Mesh(baseGeometry, this.materials.metal);
        this.gpuComponents.heatSink.position.set(0, 1.5, 0);
        this.gpuComponents.heatSink.castShadow = true;
        this.scene.add(this.gpuComponents.heatSink);

        // Heat sink fins
        this.createHeatSinkFins();
    }

    createHeatSinkFins() {
        const finsGroup = new THREE.Group();
        
        for (let i = -2.5; i <= 2.5; i += 0.3) {
            const finGeometry = new THREE.BoxGeometry(0.1, 1.2, 3.5);
            const fin = new THREE.Mesh(finGeometry, this.materials.metal);
            fin.position.set(i, 1.5, 0);
            fin.castShadow = true;
            finsGroup.add(fin);
        }
        
        this.scene.add(finsGroup);
    }

    createFans() {
        // Three large cooling fans
        const fanPositions = [[-2, 3, 0], [0, 3, 0], [2, 3, 0]];
        
        fanPositions.forEach((pos, index) => {
            const fanGroup = new THREE.Group();
            
            // Fan housing
            const housingGeometry = new THREE.CylinderGeometry(1, 1, 0.3, 16);
            const housing = new THREE.Mesh(housingGeometry, this.materials.plastic);
            housing.position.set(...pos);
            
            // Fan blades
            const bladeGroup = new THREE.Group();
            for (let i = 0; i < 9; i++) {
                const bladeGeometry = new THREE.BoxGeometry(0.05, 0.8, 0.1);
                const blade = new THREE.Mesh(bladeGeometry, this.materials.plastic);
                blade.position.set(0.4, 0, 0);
                blade.rotateZ(i * (Math.PI * 2) / 9);
                bladeGroup.add(blade);
            }
            
            bladeGroup.position.copy(housing.position);
            bladeGroup.userData = { type: 'fanBlades', index: index };
            
            fanGroup.add(housing);
            fanGroup.add(bladeGroup);
            
            this.gpuComponents.coolingFans.push(bladeGroup);
            this.scene.add(fanGroup);
        });
    }

    createHeatPipes() {
        // Copper heat pipes
        const pipePositions = [
            [[-2, 0.6, -1.5], [-2, 2.5, -1.5]],
            [[0, 0.6, -1.5], [0, 2.5, -1.5]],
            [[2, 0.6, -1.5], [2, 2.5, -1.5]]
        ];
        
        pipePositions.forEach(([start, end]) => {
            const curve = new THREE.CatmullRomCurve3([
                new THREE.Vector3(...start),
                new THREE.Vector3(start[0], start[1] + 0.5, start[2]),
                new THREE.Vector3(end[0], end[1] - 0.5, end[2]),
                new THREE.Vector3(...end)
            ]);
            
            const tubeGeometry = new THREE.TubeGeometry(curve, 20, 0.1, 8, false);
            const pipe = new THREE.Mesh(tubeGeometry, this.materials.copper);
            pipe.castShadow = true;
            
            this.gpuComponents.pipes.push(pipe);
            this.scene.add(pipe);
        });
    }

    createShroud() {
        // GPU shroud/cover
        const shroudGeometry = new THREE.BoxGeometry(8, 2, 5);
        this.gpuComponents.shroud = new THREE.Mesh(shroudGeometry, this.materials.plastic);
        this.gpuComponents.shroud.position.set(0, 2.5, 0);
        this.gpuComponents.shroud.castShadow = true;
        this.scene.add(this.gpuComponents.shroud);
    }

    createSMBlocks() {
        // 128 SM blocks arranged in groups
        const smGroup = new THREE.Group();
        
        for (let i = 0; i < 128; i++) {
            const smGeometry = new THREE.BoxGeometry(0.15, 0.1, 0.15);
            const smBlock = new THREE.Mesh(smGeometry, this.materials.silicon);
            
            const row = Math.floor(i / 16);
            const col = i % 16;
            
            smBlock.position.set(
                (col - 7.5) * 0.2,
                0.4,
                (row - 3.5) * 0.2
            );
            
            smBlock.userData = { type: 'sm', index: i };
            this.gpuComponents.smBlocks.push(smBlock);
            smGroup.add(smBlock);
        }
        
        this.scene.add(smGroup);
    }

    createTensorCores() {
        // 32 Tensor cores - special highlighted areas
        for (let i = 0; i < 32; i++) {
            const tensorGeometry = new THREE.BoxGeometry(0.12, 0.08, 0.12);
            const tensorCore = new THREE.Mesh(tensorGeometry, this.materials.activeMetal);
            
            const angle = (i / 32) * Math.PI * 2;
            const radius = 0.8;
            
            tensorCore.position.set(
                Math.cos(angle) * radius,
                0.35,
                Math.sin(angle) * radius
            );
            
            tensorCore.userData = { type: 'tensor', index: i };
            this.gpuComponents.tensorCores.push(tensorCore);
            this.scene.add(tensorCore);
        }
    }

    createRTCores() {
        // 84 RT cores arranged around the outer edge
        for (let i = 0; i < 84; i++) {
            const rtGeometry = new THREE.BoxGeometry(0.08, 0.06, 0.08);
            const rtCore = new THREE.Mesh(rtGeometry, this.materials.metal);
            
            const angle = (i / 84) * Math.PI * 2;
            const radius = 1.2;
            
            rtCore.position.set(
                Math.cos(angle) * radius,
                0.32,
                Math.sin(angle) * radius
            );
            
            rtCore.userData = { type: 'rt', index: i };
            this.gpuComponents.rtCores.push(rtCore);
            this.scene.add(rtCore);
        }
    }

    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);

        // Main directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        this.scene.add(directionalLight);

        // Rim lighting
        const rimLight1 = new THREE.DirectionalLight(0x0088ff, 0.5);
        rimLight1.position.set(-10, 5, -10);
        this.scene.add(rimLight1);

        const rimLight2 = new THREE.DirectionalLight(0x00ff88, 0.3);
        rimLight2.position.set(10, -5, 10);
        this.scene.add(rimLight2);

        // Point lights for dramatic effect
        const pointLight = new THREE.PointLight(0x00ff88, 0.8, 20);
        pointLight.position.set(0, 8, 0);
        this.scene.add(pointLight);
    }

    setupPostProcessing() {
        // TODO: Add post-processing effects for bloom and rim lighting
        // This would require importing EffectComposer and related passes
    }

    setupControls() {
        const canvas = this.renderer.domElement;
        let isMouseDown = false;
        let mouseX = 0;
        let mouseY = 0;

        canvas.addEventListener('mousedown', (event) => {
            isMouseDown = true;
            mouseX = event.clientX;
            mouseY = event.clientY;
        });

        canvas.addEventListener('mousemove', (event) => {
            if (!isMouseDown) return;

            const deltaX = event.clientX - mouseX;
            const deltaY = event.clientY - mouseY;

            this.animationState.targetRotation.y += deltaX * 0.01;
            this.animationState.targetRotation.x += deltaY * 0.01;

            mouseX = event.clientX;
            mouseY = event.clientY;
        });

        canvas.addEventListener('mouseup', () => {
            isMouseDown = false;
        });

        canvas.addEventListener('wheel', (event) => {
            const delta = event.deltaY * 0.01;
            this.animationState.targetCameraPosition.multiplyScalar(1 + delta);
            
            // Clamp distance
            const distance = this.animationState.targetCameraPosition.length();
            if (distance < 5) this.animationState.targetCameraPosition.normalize().multiplyScalar(5);
            if (distance > 50) this.animationState.targetCameraPosition.normalize().multiplyScalar(50);
        });
    }

    updatePerformanceData(data) {
        this.performanceData = { ...this.performanceData, ...data };
        this.updateComponentVisuals();
    }

    updateComponentVisuals() {
        // Update SM blocks based on utilization
        this.gpuComponents.smBlocks.forEach((sm, index) => {
            if (index < this.performanceData.smUtilizations.length) {
                const utilization = this.performanceData.smUtilizations[index];
                const intensity = utilization / 100;
                
                sm.material = intensity > 0.5 ? this.materials.activeMetal : this.materials.silicon;
                sm.material.emissiveIntensity = intensity * 0.5;
            }
        });

        // Update tensor cores
        this.gpuComponents.tensorCores.forEach((tensor, index) => {
            if (index < this.performanceData.tensorActivity.length) {
                const activity = this.performanceData.tensorActivity[index];
                tensor.material.emissiveIntensity = (activity || 0) * 0.8;
            }
        });

        // Update RT cores
        this.gpuComponents.rtCores.forEach((rt, index) => {
            if (index < this.performanceData.rtActivity.length) {
                const activity = this.performanceData.rtActivity[index];
                rt.material = activity > 0 ? this.materials.activeMetal : this.materials.metal;
            }
        });

        // Animate cooling fans based on load
        this.gpuComponents.coolingFans.forEach((fan) => {
            const speed = (this.performanceData.temperature || 0) / 100;
            fan.rotation.z += speed * 0.2;
        });
    }

    setCameraMode(mode) {
        switch (mode) {
            case 'overview':
                this.animationState.targetCameraPosition.set(0, 8, 20);
                break;
            case 'sm-focus':
                this.animationState.targetCameraPosition.set(0, 2, 8);
                break;
            case 'memory-focus':
                this.animationState.targetCameraPosition.set(8, 3, 8);
                break;
            case 'tensor-focus':
                this.animationState.targetCameraPosition.set(0, 1, 5);
                break;
            case 'rt-focus':
                this.animationState.targetCameraPosition.set(5, 2, 5);
                break;
            case 'orbit':
                // Auto-orbit mode
                this.animationState.targetRotation.y += 0.01;
                break;
        }
    }

    setComponentVisibility(component, visible) {
        this.animationState.componentsVisible[component] = visible;
        
        // Update visibility based on component type
        switch (component) {
            case 'sms':
                this.gpuComponents.smBlocks.forEach(sm => sm.visible = visible);
                break;
            case 'memory':
                this.gpuComponents.memoryModules.forEach(mem => mem.visible = visible);
                break;
            case 'tensors':
                this.gpuComponents.tensorCores.forEach(tensor => tensor.visible = visible);
                break;
            case 'rtCores':
                this.gpuComponents.rtCores.forEach(rt => rt.visible = visible);
                break;
            case 'cooling':
                this.gpuComponents.coolingFans.forEach(fan => fan.visible = visible);
                if (this.gpuComponents.heatSink) this.gpuComponents.heatSink.visible = visible;
                this.gpuComponents.pipes.forEach(pipe => pipe.visible = visible);
                break;
            case 'pcb':
                if (this.gpuComponents.mainPCB) this.gpuComponents.mainPCB.visible = visible;
                this.gpuComponents.vrms.forEach(vrm => vrm.visible = visible);
                this.gpuComponents.capacitors.forEach(cap => cap.visible = visible);
                break;
        }
    }

    startRenderLoop() {
        const animate = () => {
            requestAnimationFrame(animate);
            
            // Smooth camera movement
            this.camera.position.lerp(this.animationState.targetCameraPosition, 0.05);
            
            // Smooth rotation
            this.animationState.rotation.x = THREE.MathUtils.lerp(
                this.animationState.rotation.x, 
                this.animationState.targetRotation.x, 
                0.05
            );
            this.animationState.rotation.y = THREE.MathUtils.lerp(
                this.animationState.rotation.y, 
                this.animationState.targetRotation.y, 
                0.05
            );
            
            // Apply rotation to scene
            this.scene.rotation.x = this.animationState.rotation.x;
            this.scene.rotation.y = this.animationState.rotation.y;
            
            // Update camera look-at
            this.camera.lookAt(0, 0, 0);
            
            this.renderer.render(this.scene, this.camera);
        };
        
        animate();
    }

    onWindowResize() {
        const container = document.getElementById('gpu-visualization') || 
                         document.getElementById('gpu-visualization-full');
        
        if (container) {
            const width = container.clientWidth;
            const height = container.clientHeight;
            
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(width, height);
        }
    }
}


