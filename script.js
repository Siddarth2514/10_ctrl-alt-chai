class CarShowroom {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.currentCar = null;
        this.carModels = {};
        this.lights = {};
        this.environment = null;
        this.isLoading = true;
        
        this.carData = {
            ferrari: {
                name: "Ferrari 488 GTB",
                power: "661 HP",
                acceleration: "3.0s",
                topSpeed: "330 km/h",
                price: "$280,000",
                color: "#FF0000"
            },
            lamborghini: {
                name: "Lamborghini Huracán",
                power: "630 HP",
                acceleration: "2.9s",
                topSpeed: "325 km/h",
                price: "$248,000",
                color: "#FFD700"
            },
            porsche: {
                name: "Porsche 911 Turbo S",
                power: "640 HP",
                acceleration: "2.7s",
                topSpeed: "330 km/h",
                price: "$207,000",
                color: "#000000"
            },
            mclaren: {
                name: "McLaren 720S",
                power: "710 HP",
                acceleration: "2.8s",
                topSpeed: "341 km/h",
                price: "$299,000",
                color: "#FF6600"
            }
        };
        
        this.init();
    }
    
    async init() {
        this.setupScene();
        this.setupLights();
        this.setupEnvironment();
        await this.loadCars();
        this.setupControls();
        this.setupEventListeners();
        this.animate();
        this.hideLoadingScreen();
    }
    
    setupScene() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a1a);
        
        // Camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(5, 2, 5);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true 
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.5;
        
        const viewport = document.getElementById('viewport');
        viewport.appendChild(this.renderer.domElement);
        
        // Handle resize
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    setupLights() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);
        this.lights.ambient = ambientLight;
        
        // Main directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -10;
        directionalLight.shadow.camera.right = 10;
        directionalLight.shadow.camera.top = 10;
        directionalLight.shadow.camera.bottom = -10;
        this.scene.add(directionalLight);
        this.lights.directional = directionalLight;
        
        // Fill lights
        const fillLight1 = new THREE.DirectionalLight(0x4080ff, 0.3);
        fillLight1.position.set(-5, 5, -5);
        this.scene.add(fillLight1);
        
        const fillLight2 = new THREE.DirectionalLight(0xff8040, 0.2);
        fillLight2.position.set(5, 2, -5);
        this.scene.add(fillLight2);
        
        // Rim light
        const rimLight = new THREE.DirectionalLight(0xffffff, 0.5);
        rimLight.position.set(0, 5, -10);
        this.scene.add(rimLight);
        this.lights.rim = rimLight;
    }
    
    setupEnvironment() {
        // Ground
        const groundGeometry = new THREE.PlaneGeometry(50, 50);
        const groundMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x333333,
            transparent: true,
            opacity: 0.8
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
        
        // Environment sphere for reflections
        const envGeometry = new THREE.SphereGeometry(100, 32, 32);
        const envMaterial = new THREE.MeshBasicMaterial({
            color: 0x1a1a1a,
            side: THREE.BackSide
        });
        const envSphere = new THREE.Mesh(envGeometry, envMaterial);
        this.scene.add(envSphere);
        this.environment = envSphere;
    }
    
    async loadCars() {
        const loader = new THREE.GLTFLoader();
        const loadingProgress = document.getElementById('loadingProgress');
        let loadedCount = 0;
        const totalCars = Object.keys(this.carData).length;
        
        // Create procedural car models since we don't have actual GLTF files
        for (const [carType, data] of Object.entries(this.carData)) {
            const carModel = this.createProceduralCar(carType, data.color);
            this.carModels[carType] = carModel;
            this.scene.add(carModel);
            
            if (carType !== 'ferrari') {
                carModel.visible = false;
            } else {
                this.currentCar = carModel;
            }
            
            loadedCount++;
            const progress = (loadedCount / totalCars) * 100;
            loadingProgress.style.width = `${progress}%`;
            
            // Simulate loading delay
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
    
    createProceduralCar(type, color) {
        const carGroup = new THREE.Group();
        
        // Car body
        const bodyGeometry = new THREE.BoxGeometry(4, 1, 2);
        const bodyMaterial = new THREE.MeshPhysicalMaterial({
            color: color,
            metalness: 0.8,
            roughness: 0.2,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.5;
        body.castShadow = true;
        body.receiveShadow = true;
        carGroup.add(body);
        
        // Car roof (lower profile for sports cars)
        const roofGeometry = new THREE.BoxGeometry(3, 0.8, 1.8);
        const roofMaterial = bodyMaterial.clone();
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.set(0, 1.4, 0);
        roof.castShadow = true;
        carGroup.add(roof);
        
        // Hood
        const hoodGeometry = new THREE.BoxGeometry(1.5, 0.2, 1.8);
        const hood = new THREE.Mesh(hoodGeometry, bodyMaterial.clone());
        hood.position.set(1.5, 1, 0);
        hood.castShadow = true;
        carGroup.add(hood);
        
        // Wheels
        const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16);
        const wheelMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x222222,
            metalness: 0.9,
            roughness: 0.1
        });
        
        const wheelPositions = [
            [-1.3, 0, -1.2],  // Front left
            [-1.3, 0, 1.2],   // Front right
            [1.3, 0, -1.2],   // Rear left
            [1.3, 0, 1.2]     // Rear right
        ];
        
        wheelPositions.forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.position.set(pos[0], pos[1], pos[2]);
            wheel.rotation.z = Math.PI / 2;
            wheel.castShadow = true;
            carGroup.add(wheel);
            
            // Rim details
            const rimGeometry = new THREE.CylinderGeometry(0.35, 0.35, 0.1, 8);
            const rimMaterial = new THREE.MeshPhysicalMaterial({
                color: 0x888888,
                metalness: 1.0,
                roughness: 0.1
            });
            const rim = new THREE.Mesh(rimGeometry, rimMaterial);
            rim.position.set(pos[0], pos[1], pos[2]);
            rim.rotation.z = Math.PI / 2;
            carGroup.add(rim);
        });
        
        // Windows
        const windowMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x87CEEB,
            metalness: 0,
            roughness: 0,
            transmission: 0.9,
            transparent: true,
            opacity: 0.3
        });
        
        // Front windshield
        const frontWindowGeometry = new THREE.PlaneGeometry(1.8, 0.8);
        const frontWindow = new THREE.Mesh(frontWindowGeometry, windowMaterial);
        frontWindow.position.set(0.5, 1.4, 0);
        frontWindow.rotation.x = -0.3;
        carGroup.add(frontWindow);
        
        // Side windows
        const sideWindowGeometry = new THREE.PlaneGeometry(1.5, 0.6);
        const leftWindow = new THREE.Mesh(sideWindowGeometry, windowMaterial);
        leftWindow.position.set(0, 1.4, -0.9);
        leftWindow.rotation.y = Math.PI / 2;
        carGroup.add(leftWindow);
        
        const rightWindow = new THREE.Mesh(sideWindowGeometry, windowMaterial);
        rightWindow.position.set(0, 1.4, 0.9);
        rightWindow.rotation.y = -Math.PI / 2;
        carGroup.add(rightWindow);
        
        // Headlights
        const headlightGeometry = new THREE.SphereGeometry(0.2, 8, 8);
        const headlightMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            emissive: 0x444444,
            metalness: 0,
            roughness: 0,
            transmission: 0.8,
            transparent: true
        });
        
        const leftHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
        leftHeadlight.position.set(2, 0.7, -0.6);
        carGroup.add(leftHeadlight);
        
        const rightHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
        rightHeadlight.position.set(2, 0.7, 0.6);
        carGroup.add(rightHeadlight);
        
        // Store references for customization
        carGroup.userData = {
            body: body,
            roof: roof,
            hood: hood,
            wheels: carGroup.children.filter(child => 
                child.geometry instanceof THREE.CylinderGeometry && 
                child.material.color.getHex() === 0x222222
            ),
            rims: carGroup.children.filter(child => 
                child.geometry instanceof THREE.CylinderGeometry && 
                child.material.color.getHex() === 0x888888
            ),
            windows: [frontWindow, leftWindow, rightWindow],
            headlights: [leftHeadlight, rightHeadlight]
        };
        
        return carGroup;
    }
    
    setupControls() {
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 3;
        this.controls.maxDistance = 15;
        this.controls.maxPolarAngle = Math.PI / 2;
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = 1;
    }
    
    setupEventListeners() {
        // Car selection
        document.querySelectorAll('.car-thumb').forEach(thumb => {
            thumb.addEventListener('click', (e) => {
                const carType = e.currentTarget.dataset.car;
                this.selectCar(carType);
                
                // Update active state
                document.querySelectorAll('.car-thumb').forEach(t => t.classList.remove('active'));
                e.currentTarget.classList.add('active');
            });
        });
        
        // Color selection
        document.querySelectorAll('.color-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const color = e.currentTarget.dataset.color;
                this.changeCarColor(color);
                
                // Update active state
                document.querySelectorAll('.color-option').forEach(o => o.classList.remove('active'));
                e.currentTarget.classList.add('active');
            });
        });
        
        // Custom color picker
        document.getElementById('customColor').addEventListener('input', (e) => {
            this.changeCarColor(e.target.value);
        });
        
        // Material controls
        document.getElementById('metallicSlider').addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.updateCarMaterial('metalness', value);
            e.target.nextElementSibling.textContent = `${Math.round(value * 100)}%`;
        });
        
        document.getElementById('roughnessSlider').addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.updateCarMaterial('roughness', value);
            e.target.nextElementSibling.textContent = `${Math.round(value * 100)}%`;
        });
        
        // Camera controls
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                this.setCameraView(view);
                
                // Update active state
                document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
            });
        });
        
        // Auto rotate toggle
        document.getElementById('autoRotate').addEventListener('change', (e) => {
            this.controls.autoRotate = e.target.checked;
        });
        
        // Zoom control
        document.getElementById('zoomSlider').addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.camera.position.setLength(value);
            e.target.nextElementSibling.textContent = `${value}x`;
        });
        
        // Environment controls
        document.getElementById('environmentSelect').addEventListener('change', (e) => {
            this.changeEnvironment(e.target.value);
        });
        
        document.getElementById('lightingSlider').addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.updateLighting(value);
            e.target.nextElementSibling.textContent = `${Math.round(value * 100)}%`;
        });
        
        document.getElementById('shadowsToggle').addEventListener('change', (e) => {
            this.toggleShadows(e.target.checked);
        });
        
        // Action buttons
        document.getElementById('screenshotBtn').addEventListener('click', () => {
            this.takeScreenshot();
        });
        
        document.getElementById('shareBtn').addEventListener('click', () => {
            this.shareConfiguration();
        });
        
        document.getElementById('fullscreenBtn').addEventListener('click', () => {
            this.toggleFullscreen();
        });
    }
    
    selectCar(carType) {
        // Hide current car
        if (this.currentCar) {
            this.currentCar.visible = false;
        }
        
        // Show selected car
        this.currentCar = this.carModels[carType];
        this.currentCar.visible = true;
        
        // Update car info
        const data = this.carData[carType];
        document.getElementById('carName').textContent = data.name;
        document.getElementById('carPower').textContent = data.power;
        document.getElementById('carAcceleration').textContent = data.acceleration;
        document.getElementById('carTopSpeed').textContent = data.topSpeed;
        document.getElementById('carPrice').textContent = data.price;
    }
    
    changeCarColor(color) {
        if (!this.currentCar) return;
        
        const bodyParts = [
            this.currentCar.userData.body,
            this.currentCar.userData.roof,
            this.currentCar.userData.hood
        ];
        
        bodyParts.forEach(part => {
            if (part && part.material) {
                part.material.color.setStyle(color);
            }
        });
    }
    
    updateCarMaterial(property, value) {
        if (!this.currentCar) return;
        
        const bodyParts = [
            this.currentCar.userData.body,
            this.currentCar.userData.roof,
            this.currentCar.userData.hood
        ];
        
        bodyParts.forEach(part => {
            if (part && part.material) {
                part.material[property] = value;
            }
        });
    }
    
    setCameraView(view) {
        const distance = this.camera.position.length();
        
        switch (view) {
            case 'front':
                this.camera.position.set(distance, 2, 0);
                break;
            case 'side':
                this.camera.position.set(0, 2, distance);
                break;
            case 'rear':
                this.camera.position.set(-distance, 2, 0);
                break;
            case 'top':
                this.camera.position.set(0, distance, 0);
                break;
        }
        
        this.camera.lookAt(0, 0, 0);
        this.controls.update();
    }
    
    changeEnvironment(environment) {
        const colors = {
            showroom: 0x1a1a1a,
            garage: 0x2a2a2a,
            city: 0x4a4a6a,
            sunset: 0x6a4a2a,
            studio: 0xffffff
        };
        
        this.scene.background.setHex(colors[environment] || colors.showroom);
        this.environment.material.color.setHex(colors[environment] || colors.showroom);
    }
    
    updateLighting(intensity) {
        this.lights.directional.intensity = intensity;
        this.lights.rim.intensity = intensity * 0.5;
        this.renderer.toneMappingExposure = intensity;
    }
    
    toggleShadows(enabled) {
        this.renderer.shadowMap.enabled = enabled;
        
        // Update all objects
        this.scene.traverse(child => {
            if (child.isMesh) {
                child.castShadow = enabled;
                child.receiveShadow = enabled;
            }
        });
    }
    
    takeScreenshot() {
        const link = document.createElement('a');
        link.download = 'car-showroom-screenshot.png';
        link.href = this.renderer.domElement.toDataURL();
        link.click();
    }
    
    shareConfiguration() {
        const config = {
            car: Object.keys(this.carModels).find(key => this.carModels[key] === this.currentCar),
            color: this.currentCar?.userData.body.material.color.getHexString(),
            metalness: this.currentCar?.userData.body.material.metalness,
            roughness: this.currentCar?.userData.body.material.roughness
        };
        
        const url = `${window.location.origin}${window.location.pathname}?config=${btoa(JSON.stringify(config))}`;
        
        if (navigator.share) {
            navigator.share({
                title: 'Check out my car configuration!',
                url: url
            });
        } else {
            navigator.clipboard.writeText(url).then(() => {
                alert('Configuration URL copied to clipboard!');
            });
        }
    }
    
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }
    
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        const showroom = document.getElementById('showroom');
        
        setTimeout(() => {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
                showroom.classList.remove('hidden');
            }, 500);
        }, 1000);
    }
    
    onWindowResize() {
        const viewport = document.getElementById('viewport');
        const rect = viewport.getBoundingClientRect();
        
        this.camera.aspect = rect.width / rect.height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(rect.width, rect.height);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (this.controls) {
            this.controls.update();
        }
        
        // Animate car rotation when auto-rotate is enabled
        if (this.currentCar && this.controls.autoRotate) {
            this.currentCar.rotation.y += 0.005;
        }
        
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize the showroom when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new CarShowroom();
});

// Load configuration from URL if present
window.addEventListener('load', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const configParam = urlParams.get('config');
    
    if (configParam) {
        try {
            const config = JSON.parse(atob(configParam));
            // Apply configuration after a short delay to ensure everything is loaded
            setTimeout(() => {
                if (window.showroom) {
                    window.showroom.selectCar(config.car);
                    window.showroom.changeCarColor(`#${config.color}`);
                    window.showroom.updateCarMaterial('metalness', config.metalness);
                    window.showroom.updateCarMaterial('roughness', config.roughness);
                }
            }, 2000);
        } catch (e) {
            console.warn('Invalid configuration in URL');
        }
    }
});