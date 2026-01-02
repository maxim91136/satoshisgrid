/**
 * SATOSHIS GRID - Scene Manager
 * Three.js scene setup with camera, renderer, and post-processing
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

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

        // WebGL context state
        this.contextLost = false;

        this._onResize = null;
        this._onContextLost = null;
        this._onContextRestored = null;
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
        const isSmallScreen = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
        const pixelRatioCap = isSmallScreen ? 1.25 : 2;
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatioCap));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.7; // Dunkler, augenfreundlicher

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
        // Dispose old composer if it exists (prevent memory leak)
        if (this.composer) {
            this.composer.dispose();
            this.composer = null;
        }

        // Wichtig für korrektes Rendering
        this.renderer.autoClear = true;
        this.renderer.setClearColor(0x000000, 1);

        this.composer = new EffectComposer(this.renderer);

        // Render pass
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        // Bloom pass - gedimmt für Augenfreundlichkeit
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.5,   // strength - reduziert
            0.3,   // radius
            0.3    // threshold - höher = weniger glow
        );
        this.composer.addPass(bloomPass);
        this.bloomPass = bloomPass;

        // OutputPass für korrektes Tone Mapping
        const outputPass = new OutputPass();
        this.composer.addPass(outputPass);
    }

    setupEventListeners() {
        this._onResize = () => this.onWindowResize();
        window.addEventListener('resize', this._onResize);

        // WebGL context lost/restored handlers
        this._onContextLost = (event) => {
            event.preventDefault();
            console.error('⚠️ WebGL context lost! Pausing render...');
            this.contextLost = true;
        };

        this._onContextRestored = () => {
            console.log('✅ WebGL context restored!');
            this.contextLost = false;
            // Recreate post-processing pipeline
            this.createPostProcessing();
        };

        this.renderer.domElement.addEventListener('webglcontextlost', this._onContextLost);
        this.renderer.domElement.addEventListener('webglcontextrestored', this._onContextRestored);
    }

    onWindowResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        const isSmallScreen = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
        const pixelRatioCap = isSmallScreen ? 1.25 : 2;
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatioCap));

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
        // Skip rendering if WebGL context is lost
        if (this.contextLost) return;

        try {
            this.updateCameraShake();
            this.composer.render();
        } catch (error) {
            console.error('Render error:', error);
            // Try to recover by recreating post-processing
            if (!this.contextLost) {
                this.createPostProcessing();
            }
        }
    }

    // Get scene for adding objects
    add(object) {
        this.scene.add(object);
    }

    remove(object) {
        this.scene.remove(object);
    }

    dispose() {
        if (this._onResize) {
            window.removeEventListener('resize', this._onResize);
            this._onResize = null;
        }

        if (this.renderer && this.renderer.domElement) {
            if (this._onContextLost) {
                this.renderer.domElement.removeEventListener('webglcontextlost', this._onContextLost);
                this._onContextLost = null;
            }
            if (this._onContextRestored) {
                this.renderer.domElement.removeEventListener('webglcontextrestored', this._onContextRestored);
                this._onContextRestored = null;
            }
        }

        if (this.composer) {
            this.composer.dispose();
            this.composer = null;
        }

        if (this.renderer) {
            try { this.renderer.dispose(); } catch (_) { /* ignore */ }
            if (this.renderer.domElement && this.renderer.domElement.parentNode) {
                this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
            }
            this.renderer = null;
        }

        this.scene = null;
        this.camera = null;
    }
}
