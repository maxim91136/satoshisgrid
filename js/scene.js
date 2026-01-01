/**
 * SATOSHIS GRID - Scene Manager
 * Three.js scene setup with camera, renderer, and post-processing
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

export class SceneManager {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.composer = null;
        this.clock = new THREE.Clock();

        // Camera settings
        this.cameraBasePosition = new THREE.Vector3(0, 15, 30);
        this.cameraLookAt = new THREE.Vector3(0, 0, -50);
        this.cameraShakeIntensity = 0;
        this.cameraShakeDecay = 0.95;
    }

    async init() {
        this.createScene();
        this.createCamera();
        this.createRenderer();
        this.createLights();
        this.createPostProcessing();
        this.setupEventListeners();

        return this;
    }

    createScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);

        // Fog for depth
        this.scene.fog = new THREE.FogExp2(0x000000, 0.008);
    }

    createCamera() {
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 2000);
        this.camera.position.copy(this.cameraBasePosition);
        this.camera.lookAt(this.cameraLookAt);
    }

    createRenderer() {
        const container = document.getElementById('canvas-container');

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance'
        });

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1;

        container.appendChild(this.renderer.domElement);
    }

    createLights() {
        // Ambient light - very subtle
        const ambient = new THREE.AmbientLight(0x001122, 0.3);
        this.scene.add(ambient);

        // Directional light from above
        const directional = new THREE.DirectionalLight(0x00ffff, 0.5);
        directional.position.set(0, 50, 0);
        this.scene.add(directional);

        // Point light for mining cube area
        const miningLight = new THREE.PointLight(0xf7931a, 1, 100);
        miningLight.position.set(0, 10, -30);
        this.scene.add(miningLight);
        this.miningLight = miningLight;
    }

    createPostProcessing() {
        this.composer = new EffectComposer(this.renderer);

        // Render pass
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        // Bloom pass for glow effects
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.8,   // strength
            0.4,   // radius
            0.85   // threshold
        );
        this.composer.addPass(bloomPass);
        this.bloomPass = bloomPass;
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize());
    }

    onWindowResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
        this.composer.setSize(width, height);
    }

    // Camera shake effect
    shake(intensity = 0.5) {
        this.cameraShakeIntensity = intensity;
    }

    updateCameraShake() {
        if (this.cameraShakeIntensity > 0.01) {
            const shakeX = (Math.random() - 0.5) * this.cameraShakeIntensity;
            const shakeY = (Math.random() - 0.5) * this.cameraShakeIntensity;

            this.camera.position.x = this.cameraBasePosition.x + shakeX;
            this.camera.position.y = this.cameraBasePosition.y + shakeY;

            this.cameraShakeIntensity *= this.cameraShakeDecay;
        } else {
            this.camera.position.x = this.cameraBasePosition.x;
            this.camera.position.y = this.cameraBasePosition.y;
        }
    }

    // Render with post-processing
    render() {
        this.updateCameraShake();
        this.composer.render();
    }

    // Get scene for adding objects
    add(object) {
        this.scene.add(object);
    }

    remove(object) {
        this.scene.remove(object);
    }
}
