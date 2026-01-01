/**
 * SATOSHIS GRID - Main Entry Point
 * Initializes the application after splash screen interaction
 */

import { SceneManager } from './scene.js';
import { Grid } from './grid.js';
import { TransactionManager } from './transactions.js';
import { MiningCube } from './mining-cube.js';
import { WebSocketManager } from './websocket.js';
import { AudioManager } from './audio.js';
import { HUD } from './hud.js';
import { Effects } from './effects.js';

class SatoshisGrid {
    constructor() {
        this.isInitialized = false;
        this.sceneManager = null;
        this.grid = null;
        this.transactionManager = null;
        this.miningCube = null;
        this.wsManager = null;
        this.audioManager = null;
        this.hud = null;
        this.effects = null;

        this.setupSplashScreen();
    }

    setupSplashScreen() {
        const splash = document.getElementById('splash');
        const enterBtn = document.getElementById('enter-btn');

        enterBtn.addEventListener('click', () => {
            this.init();
            splash.classList.add('hidden');
        });

        // Allow keyboard entry
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Enter' || e.code === 'Space') {
                if (!this.isInitialized) {
                    this.init();
                    splash.classList.add('hidden');
                }
            }
        });
    }

    async init() {
        if (this.isInitialized) return;
        this.isInitialized = true;

        console.log('🔶 SATOSHIS GRID initializing...');

        try {
            // Initialize Scene (Three.js)
            this.sceneManager = new SceneManager();
            await this.sceneManager.init();

            // Initialize Effects
            this.effects = new Effects(this.sceneManager);

            // Initialize Grid
            this.grid = new Grid(this.sceneManager);

            // Initialize Mining Cube
            this.miningCube = new MiningCube(this.sceneManager, this.effects);

            // Initialize Transaction Manager
            this.transactionManager = new TransactionManager(
                this.sceneManager,
                this.miningCube,
                this.effects
            );

            // Initialize Audio
            this.audioManager = new AudioManager();
            await this.audioManager.init();

            // Initialize HUD
            this.hud = new HUD();

            // Initialize WebSocket Connection
            this.wsManager = new WebSocketManager(
                this.transactionManager,
                this.miningCube,
                this.hud,
                this.audioManager,
                this.effects
            );

            // Connect to mempool.space
            this.wsManager.connect();

            // Show HUD
            document.getElementById('hud').classList.remove('hidden');

            // Start animation loop
            this.animate();

            console.log('✅ SATOSHIS GRID ready');

        } catch (error) {
            console.error('❌ Initialization failed:', error);
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const delta = this.sceneManager.clock.getDelta();

        // Update components
        this.grid.update(delta);
        this.transactionManager.update(delta);
        this.miningCube.update(delta);
        this.effects.update(delta);

        // Render scene
        this.sceneManager.render();
    }
}

// Start application
const app = new SatoshisGrid();

// Export for debugging
window.SatoshisGrid = app;
