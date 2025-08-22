import * as THREE from './build/three.module.js';
import Stats from './build/stats.module.js';
import { GLTFLoader } from './build/GLTFLoader.js';
import { PMREMGenerator } from './build/PMREMGenerator.js';
import { DRACOLoader } from './build/DRACOLoader.js';
import { CarControls } from './build/CarControls.js';
import { PMREMCubeUVPacker } from './build/PMREMCubeUVPacker.js';

var camera, scene, renderer, stats, carModel, materialsLib, envMap;
var bodyMatSelect = document.getElementById('body-mat');
var rimMatSelect = document.getElementById('rim-mat');
var glassMatSelect = document.getElementById('glass-mat');
var followCamera = document.getElementById('camera-toggle');
var partSelect = document.getElementById('part-select');
var colorPicker = document.getElementById('color-picker');
var clock = new THREE.Clock();
var carControls = new CarControls();
carControls.turningRadius = 75;

var carParts = { body: [], rims: [], wheels: [], glass: [], all: {} };
var carBodyMeshes = []; // ✅ strictly car body meshes only
var damping = 5.0;
var distance = 5;
var cameraTarget = new THREE.Vector3();

function init() {
    var container = document.getElementById('container');

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(3.25, 2.0, -5);
    camera.lookAt(0, 0.5, 0);

    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xd7cbb1, 1, 80);

    var urls = ['px.jpg', 'nx.jpg', 'py.jpg', 'ny.jpg', 'pz.jpg', 'nz.jpg'];
    var loader = new THREE.CubeTextureLoader().setPath('textures/cube/skyboxsun25deg/');
    loader.load(urls, function (texture) {
        scene.background = texture;

        var pmremGenerator = new PMREMGenerator(texture);
        pmremGenerator.update(renderer);

        var pmremCubeUVPacker = new PMREMCubeUVPacker(pmremGenerator.cubeLods);
        pmremCubeUVPacker.update(renderer);

        envMap = pmremCubeUVPacker.CubeUVRenderTarget.texture;

        pmremGenerator.dispose();
        pmremCubeUVPacker.dispose();

        initCar();
        initMaterials();
        initMaterialSelectionMenus();
    });

    var ground = new THREE.Mesh(
        new THREE.PlaneBufferGeometry(2400, 2400),
        new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.15, depthWrite: false })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.renderOrder = 1;
    scene.add(ground);

    var grid = new THREE.GridHelper(400, 40, 0x000000, 0x000000);
    grid.material.opacity = 0.2;
    grid.material.depthWrite = false;
    grid.material.transparent = true;
    scene.add(grid);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.gammaOutput = true;
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    stats = new Stats();
    container.appendChild(stats.dom);

    window.addEventListener('resize', onWindowResize, false);

    renderer.setAnimationLoop(function () {
        update();
        renderer.render(scene, camera);
    });
}

function initCar() {
    const loader = new GLTFLoader();
    
    // Get the model parameter from URL
    const urlParams = new URLSearchParams(window.location.search);
    const modelParam = urlParams.get('model');
    
    // Choose model based on URL parameter
    let modelPath = "models/kia_optima_k5.glb"; // Default to KIA
    
    if (modelParam === 'hyundai') {
        modelPath = "models/2023_hyundai_creta.glb";
    } else if (modelParam === 'audi') {
        modelPath = "models/2018_audi_rs3_sportback.glb";
    }
    
    loader.load(modelPath, function (gltf) {
        carModel = gltf.scene;
        carModel.scale.set(1, 1, 1);
        carModel.position.set(0, 0, 0);
        scene.add(carModel);

        // Reset arrays
        carParts = { body: [], rims: [], wheels: [], glass: [], all: {} };
        carBodyMeshes = [];

        const partGroups = {
            "Car Body": [],
            "Wheels": [],
            "Rims": [],
            "Glass / Windows": [],
            "Headlights": [],
            "Other": []
        };

        carModel.traverse(c => {
            if (c.isMesh) {
                let name = c.name.toLowerCase();
                c.material.envMap = envMap;
                carParts.all[c.name] = c;

                // ✅ collect only painted body panels
                if ((name.includes("body") || name.includes("paint") || name.includes("chassis")) &&
                    !name.includes("glass") && !name.includes("window") && !name.includes("windshield") &&
                    !name.includes("headlight") && !name.includes("lamp") &&
                    !name.includes("rim") && !name.includes("tire") && !name.includes("wheel") &&
                    !name.includes("interior")) {

                    carBodyMeshes.push(c);
                    partGroups["Car Body"].push(c);
                    carParts.body.push(c);

                } else if (name.includes("wheel") && !name.includes("rim")) {
                    partGroups["Wheels"].push(c);
                    carParts.wheels.push(c);

                } else if (name.includes("rim")) {
                    partGroups["Rims"].push(c);
                    carParts.rims.push(c);

                } else if (name.includes("glass") || name.includes("window") || name.includes("windshield")) {
                    partGroups["Glass / Windows"].push(c);
                    carParts.glass.push(c);

                } else if (name.includes("headlight") || name.includes("lamp")) {
                    partGroups["Headlights"].push(c);

                } else {
                    partGroups["Other"].push(c);
                }
            }
        });

        console.log("Categorized parts:", partGroups);

        // Dropdown
        partSelect.innerHTML = "";
        for (let group in partGroups) {
            if (partGroups[group].length > 0) {
                let opt = document.createElement("option");
                opt.value = group;
                opt.innerHTML = group;
                partSelect.appendChild(opt);
            }
        }

        // ✅ Color picker event
        colorPicker.addEventListener("input", (e) => {
            let selected = partSelect.value;
            if (!selected) return;

            if (selected === "Car Body") {
                changeCarColor(e.target.value);
            }
            if (selected === "Rims") {
                carParts.rims.forEach(mesh => {
                    mesh.material = mesh.material.clone();
                    mesh.material.color.set(e.target.value);
                });
            }
            if (selected === "Wheels") {
                carParts.wheels.forEach(mesh => {
                    mesh.material = mesh.material.clone();
                    mesh.material.color.set(e.target.value);
                });
            }
        });

        carControls.setModel(carModel);
        updateMaterials();

    }, undefined, function (error) {
        console.error("Error loading car:", error);
    });
}

// ✅ Recolor ONLY car body
function changeCarColor(colorHex) {
    carBodyMeshes.forEach(mesh => {
        mesh.material = mesh.material.clone();
        mesh.material.color.set(colorHex);
    });
}

function initMaterials() {
    materialsLib = {
        main: [
            new THREE.MeshStandardMaterial({ color: 0xff4400, envMap: envMap, metalness: 0.9, roughness: 0.2, name: 'orange' }),
            new THREE.MeshStandardMaterial({ color: 0x001166, envMap: envMap, metalness: 0.9, roughness: 0.2, name: 'blue' }),
            new THREE.MeshStandardMaterial({ color: 0x990000, envMap: envMap, metalness: 0.9, roughness: 0.2, name: 'red' }),
            new THREE.MeshStandardMaterial({ color: 0x000000, envMap: envMap, metalness: 0.9, roughness: 0.5, name: 'black' }),
            new THREE.MeshStandardMaterial({ color: 0xffffff, envMap: envMap, metalness: 0.9, roughness: 0.5, name: 'white' }),
            new THREE.MeshStandardMaterial({ color: 0x555555, envMap: envMap, envMapIntensity: 2.0, metalness: 1.0, roughness: 0.2, name: 'metallic' }),
        ],
        glass: [
            new THREE.MeshStandardMaterial({ color: 0xffffff, envMap: envMap, metalness: 1, roughness: 0, opacity: 0.2, transparent: true, premultipliedAlpha: true, name: 'clear' }),
            new THREE.MeshStandardMaterial({ color: 0x000000, envMap: envMap, metalness: 1, roughness: 0, opacity: 0.2, transparent: true, premultipliedAlpha: true, name: 'smoked' }),
            new THREE.MeshStandardMaterial({ color: 0x001133, envMap: envMap, metalness: 1, roughness: 0, opacity: 0.2, transparent: true, premultipliedAlpha: true, name: 'blue' }),
        ],
    };
}

function initMaterialSelectionMenus() {
    function addOption(name, menu) {
        var option = document.createElement('option');
        option.text = name;
        option.value = name;
        menu.add(option);
    }

    materialsLib.main.forEach(material => {
        addOption(material.name, bodyMatSelect);
        addOption(material.name, rimMatSelect);
    });

    materialsLib.glass.forEach(material => addOption(material.name, glassMatSelect));

    bodyMatSelect.selectedIndex = 3;
    rimMatSelect.selectedIndex = 5;
    glassMatSelect.selectedIndex = 0;

    bodyMatSelect.addEventListener('change', updateMaterials);
    rimMatSelect.addEventListener('change', updateMaterials);
    glassMatSelect.addEventListener('change', updateMaterials);
}

function updateMaterials() {
    var bodyMat = materialsLib.main[bodyMatSelect.selectedIndex];
    var rimMat = materialsLib.main[rimMatSelect.selectedIndex];
    var glassMat = materialsLib.glass[glassMatSelect.selectedIndex];

    carParts.body.forEach(part => part.material = bodyMat);
    carParts.rims.forEach(part => part.material = rimMat);
    carParts.glass.forEach(part => part.material = glassMat);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function update() {
    var delta = clock.getDelta();

    if (carModel) {
        // ✅ Rotate car 360 degrees
        carModel.rotation.y += delta * 0.5; // Adjust speed here

        carControls.update(delta / 3);

        if (carModel.position.length() > 200) {
            carModel.position.set(0, 0, 0);
            carControls.speed = 0;
        }

        if (followCamera.checked) {
            carModel.getWorldPosition(cameraTarget);
            cameraTarget.y = 2.5;
            cameraTarget.z += distance;
            camera.position.lerp(cameraTarget, delta * damping);
        } else {
            carModel.getWorldPosition(cameraTarget);
            cameraTarget.y += 0.5;
            camera.position.set(3.25, 2.0, -5);
        }

        camera.lookAt(carModel.position);
    }

    stats.update();
}

init();
