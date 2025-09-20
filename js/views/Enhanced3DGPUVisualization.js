/**
 * Enhanced 3D GPU Visualization with Component Lighting and Interaction
 * 
 * This class provides an advanced 3D visualization of GPU components with
 * real-time lighting effects based on utilization data, interactive component
 * isolation, and detailed performance visualization.
 */
class Enhanced3DGPUVisualization {
    /**
     * Initialize the enhanced 3D GPU visualization
     * @param {HTMLCanvasElement} canvas - The canvas element to render to
     * @param {Object} options - Configuration options
     */
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.options = {
            enableShadows: true,
            enableBloom: true,
            animationSpeed: 1.0,
            autoRotate: true,
            ...options
        };

        // Three.js core components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.composer = null;

        // GPU component meshes
        this.components = {
            die: null,
            sms: [],
            memoryControllers: [],
            tensorCores: [],
            rtCores: [],
            l2Cache: null,
            pcieConnector: null
        };

        // Animation and interaction
        this.clock = new THREE.Clock();
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.selectedComponent = null;
        this.isolatedComponents = new Set();

        // Telemetry data
        this.telemetryData = null;
        this.componentActivity = new Map();

        // Performance tracking
        this.frameCount = 0;
        this.lastFPSUpdate = 0;
        this.fps = 0;

        this.init();
    }

    /**
     * Initialize the 3D scene and components
     */
    init() {
        this.setupScene();
        this.setupLighting();
        this.setupCamera();
        this.setupRenderer();
        this.createGPUComponents();
        this.setupEventListeners();
        this.animate();

        console.log('Enhanced 3D GPU visualization initialized');
    }

    /**
     * Setup the Three.js scene
     */
    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a0a);
        this.scene.fog = new THREE.Fog(0x0a0a0a, 10, 50);
    }

    /**
     * Setup advanced lighting system
     */
    setupLighting() {
        // Ambient light for base illumination
        const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
        this.scene.add(ambientLight);

        // Main directional light
        const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
        mainLight.position.set(10, 10, 5);
        mainLight.castShadow = this.options.enableShadows;
        this.scene.add(mainLight);

        // Rim lighting for dramatic effect
        const rimLight = new THREE.DirectionalLight(0x4ecdc4, 0.5);
        rimLight.position.set(-10, 5, -5);
        this.scene.add(rimLight);

        // Point light for component highlighting
        this.highlightLight = new THREE.PointLight(0xff6b6b, 1, 10);
        this.highlightLight.position.set(0, 5, 0);
        this.scene.add(this.highlightLight);
    }

    /**
     * Setup camera with smooth controls
     */
    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(
            75,
            this.canvas.clientWidth / this.canvas.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(8, 6, 12);
        this.camera.lookAt(0, 0, 0);
    }

    /**
     * Setup WebGL renderer with advanced features
     */
    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true
        });
        
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = this.options.enableShadows;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    /**
     * Create detailed GPU components with proper materials
     */
    createGPUComponents() {
        this.createMainDie();
        this.createStreamingMultiprocessors();
        this.createMemoryControllers();
        this.createL2Cache();

        console.log('GPU components created:', {
            sms: this.components.sms.length,
            memory: this.components.memoryControllers.length,
        });
    }

    /**
     * Create the main GPU die
     */
    createMainDie() {
        const geometry = new THREE.BoxGeometry(6, 0.3, 6);
        const material = new THREE.MeshPhongMaterial({
            color: 0x2c2c2c,
            shininess: 30,
            transparent: true,
            opacity: 0.9
        });

        this.components.die = new THREE.Mesh(geometry, material);
        this.components.die.castShadow = true;
        this.components.die.receiveShadow = true;
        this.components.die.userData = {
            type: 'die',
            name: 'GPU Die',
            description: 'Main silicon die containing all GPU components'
        };

        this.scene.add(this.components.die);
    }

    /**
     * Create streaming multiprocessors (SMs) with individual lighting
     */
    createStreamingMultiprocessors() {
        const smGeometry = new THREE.BoxGeometry(0.35, 0.2, 0.35);
        
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                const smMaterial = new THREE.MeshPhongMaterial({
                    color: 0x4ecdc4,
                    shininess: 50,
                    transparent: true,
                    opacity: 0.8
                });

                const sm = new THREE.Mesh(smGeometry, smMaterial);
                
                const x = (i - 3.5) * 0.6;
                const z = (j - 3.5) * 0.6;
                sm.position.set(x, 0.25, z);
                
                sm.castShadow = true;
                sm.userData = {
                    type: 'sm',
                    index: i * 8 + j,
                    name: `SM ${i * 8 + j}`,
                    description: `Streaming Multiprocessor ${i * 8 + j}`,
                    utilization: 0,
                    baseColor: 0x4ecdc4
                };

                this.components.sms.push(sm);
                this.scene.add(sm);
            }
        }
    }

    /**
     * Create memory controllers
     */
    createMemoryControllers() {
        const memGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1.0);
        
        for (let i = 0; i < 6; i++) {
            const memMaterial = new THREE.MeshPhongMaterial({
                color: 0x00d4ff,
                shininess: 60,
                transparent: true,
                opacity: 0.9
            });

            const mem = new THREE.Mesh(memGeometry, memMaterial);
            
            const angle = (i / 6) * Math.PI * 2;
            const radius = 4;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            mem.position.set(x, 0.6, z);
            
            mem.castShadow = true;
            mem.userData = {
                type: 'memory',
                index: i,
                name: `Memory Controller ${i}`,
                description: `GDDR6X Memory Controller ${i}`,
                utilization: 0,
                baseColor: 0x00d4ff
            };

            this.components.memoryControllers.push(mem);
            this.scene.add(mem);
        }
    }

    /**
     * Create L2 cache as a ring around the die
     */
    createL2Cache() {
        const l2Geometry = new THREE.TorusGeometry(3.2, 0.4, 8, 24);
        const l2Material = new THREE.MeshPhongMaterial({
            color: 0x6bcf7f,
            shininess: 40,
            transparent: true,
            opacity: 0.6
        });

        this.components.l2Cache = new THREE.Mesh(l2Geometry, l2Material);
        this.components.l2Cache.position.set(0, -0.3, 0);
        this.components.l2Cache.castShadow = true;
        this.components.l2Cache.userData = {
            type: 'cache',
            name: 'L2 Cache',
            description: '72MB L2 Cache Ring',
            utilization: 0,
            baseColor: 0x6bcf7f
        };

        this.scene.add(this.components.l2Cache);
    }

    /**
     * Setup event listeners for interaction
     */
    setupEventListeners() {
        this.canvas.addEventListener('mousemove', (event) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        });

        this.canvas.addEventListener('click', (event) => {
            this.handleClick(event);
        });

        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    /**
     * Handle mouse click for component selection
     */
    handleClick(event) {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        const allObjects = [
            ...this.components.sms,
            ...this.components.memoryControllers,
            this.components.die,
            this.components.l2Cache,
        ].filter(obj => obj);

        const intersects = this.raycaster.intersectObjects(allObjects);
        
        if (intersects.length > 0) {
            const selected = intersects[0].object;
            this.selectComponent(selected);
        } else {
            this.deselectComponent();
        }
    }

    /**
     * Select a component and show its details
     */
    selectComponent(component) {
        // Deselect previous component
        if (this.selectedComponent) {
            this.resetComponentMaterial(this.selectedComponent);
        }

        this.selectedComponent = component;
        
        // Highlight selected component
        component.material.emissive = new THREE.Color(0x444444);
        component.material.emissiveIntensity = 0.3;

        // Update info panel
        this.updateComponentInfo(component.userData);

        // Dispatch selection event
        this.canvas.dispatchEvent(new CustomEvent('componentSelected', {
            detail: component.userData
        }));
    }

    /**
     * Deselect the current component
     */
    deselectComponent() {
        if (this.selectedComponent) {
            this.resetComponentMaterial(this.selectedComponent);
            this.selectedComponent = null;
        }

        // Clear info panel
        this.updateComponentInfo(null);

        this.canvas.dispatchEvent(new CustomEvent('componentDeselected'));
    }

    /**
     * Reset component material to original state
     */
    resetComponentMaterial(component) {
        component.material.emissive = new THREE.Color(0x000000);
        component.material.emissiveIntensity = 0;
    }

    /**
     * Update component info display
     */
    updateComponentInfo(componentData) {
        const infoCard = document.getElementById('component-info');
        if (!infoCard) return;

        const detailsDiv = infoCard.querySelector('.component-details');
        if (!detailsDiv) return;

        if (componentData) {
            detailsDiv.innerHTML = `
                <h4>${componentData.name}</h4>
                <p>${componentData.description}</p>
                <div class="component-stats">
                    <div class="stat-item">
                        <span class="stat-label">Utilization:</span>
                        <span class="stat-value">${componentData.utilization.toFixed(1)}%</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Type:</span>
                        <span class="stat-value">${componentData.type.toUpperCase()}</span>
                    </div>
                </div>
            `;
        } else {
            detailsDiv.innerHTML = '<p>Select a component to view details</p>';
        }
    }

    /**
     * Update visualization with telemetry data
     */
    updateTelemetry(telemetryData) {
        if (!telemetryData) return;

        this.telemetryData = telemetryData;

        // Update SM utilization and lighting
        if (telemetryData.sm_utilizations && Array.isArray(telemetryData.sm_utilizations)) {
            this.components.sms.forEach((sm, index) => {
                if (index < telemetryData.sm_utilizations.length) {
                    const utilization = telemetryData.sm_utilizations[index];
                    sm.userData.utilization = utilization * 100;
                    this.updateComponentActivity(sm, utilization);
                }
            });
        }

        // Update memory controller activity
        const memoryUtil = (telemetryData.util_memory || 0) / 100;
        this.components.memoryControllers.forEach(mem => {
            mem.userData.utilization = telemetryData.util_memory || 0;
            this.updateComponentActivity(mem, memoryUtil);
        });

        // Update cache activity
        if (this.components.l2Cache) {
            const cacheUtil = Math.min((telemetryData.util_gpu || 0) / 100, 1);
            this.components.l2Cache.userData.utilization = telemetryData.util_gpu || 0;
            this.updateComponentActivity(this.components.l2Cache, cacheUtil);
        }
    }

    /**
     * Update component activity visualization
     */
    updateComponentActivity(component, utilization) {
        const baseColor = new THREE.Color(component.userData.baseColor);
        const activeColor = new THREE.Color(0xffff00); // Bright yellow for activity
        
        // Interpolate between base color and active color based on utilization
        const color = baseColor.clone().lerp(activeColor, utilization * 0.7);
        component.material.color = color;
        
        // Add emissive glow for high activity
        const emissiveIntensity = Math.max(utilization - 0.5, 0) * 0.8;
        component.material.emissive = color.clone().multiplyScalar(0.3);
        component.material.emissiveIntensity = emissiveIntensity;
        
        // Scale based on activity
        const scale = 1 + (utilization * 0.2);
        component.scale.setScalar(scale);
    }

    /**
     * Isolate specific component types
     */
    isolateComponents(componentType) {
        // Reset all components to visible
        this.showAllComponents();
        
        if (componentType === 'all') {
            return;
        }

        // Hide non-matching components
        const hideComponents = (components) => {
            components.forEach(comp => {
                if (comp && comp.userData.type !== componentType) {
                    comp.visible = false;
                }
            });
        };

        // Always keep the die visible as reference
        if (componentType !== 'die') {
            hideComponents([this.components.die]);
        }

        // Hide other component types
        if (componentType !== 'sm') hideComponents(this.components.sms);
        if (componentType !== 'memory') hideComponents(this.components.memoryControllers);
        if (componentType !== 'cache') hideComponents([this.components.l2Cache]);

        console.log(`Isolated component type: ${componentType}`);
    }

    /**
     * Show all components
     */
    showAllComponents() {
        const showComponents = (components) => {
            components.forEach(comp => {
                if (comp) comp.visible = true;
            });
        };

        showComponents([this.components.die]);
        showComponents(this.components.sms);
        showComponents(this.components.memoryControllers);
        showComponents([this.components.l2Cache]);
    }

    /**
     * Handle window resize
     */
    handleResize() {
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
    }

    /**
     * Main animation loop
     */
    animate() {
        requestAnimationFrame(() => this.animate());

        const deltaTime = this.clock.getDelta();
        
        // Animate components
        this.animateComponents(deltaTime);

        // Update FPS counter
        this.updateFPS();

        // Render scene
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Animate GPU components
     */
    animateComponents(deltaTime) {
        const time = this.clock.elapsedTime * this.options.animationSpeed;

        // Gentle floating animation for SMs
        this.components.sms.forEach((sm, index) => {
            const offset = (index * 0.1) + time * 0.5;
            sm.position.y = 0.25 + Math.sin(offset) * 0.05;
            sm.rotation.y += deltaTime * 0.2;
        });

        // Rotate memory controllers
        this.components.memoryControllers.forEach(mem => {
            mem.rotation.y += deltaTime * 0.3;
        });

        // Rotate L2 cache
        if (this.components.l2Cache) {
            this.components.l2Cache.rotation.y += deltaTime * 0.1;
        }

        // Auto rotate camera
        if (this.options.autoRotate) {
            this.camera.position.x = Math.cos(time * 0.1) * 8;
            this.camera.position.z = Math.sin(time * 0.1) * 8;
            this.camera.lookAt(0, 0, 0);
        }
    }

    /**
     * Update FPS counter
     */
    updateFPS() {
        this.frameCount++;
        const now = performance.now();
        
        if (now >= this.lastFPSUpdate + 1000) {
            this.fps = Math.round((this.frameCount * 1000) / (now - this.lastFPSUpdate));
            this.frameCount = 0;
            this.lastFPSUpdate = now;
        }
    }

    /**
     * Get current FPS
     */
    getFPS() {
        return this.fps;
    }

    /**
     * Dispose of resources
     */
    dispose() {
        // Dispose geometries and materials
        this.scene.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(material => material.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });

        // Dispose renderer
        if (this.renderer) {
            this.renderer.dispose();
        }

        console.log('Enhanced 3D GPU visualization disposed');
    }
}

export default Enhanced3DGPUVisualization;
