/**
 * SATOSHIS GRID - Main Entry Point
 * Initializes the application after splash screen interaction
 */

import { SceneManager } from './scene.js';
import { Grid } from './grid.js';
import { TransactionManager } from './transactions.js';
import { LightCycle } from './light-cycle.js';
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
        this.lightCycle = null;
        this.wsManager = null;
        this.audioManager = null;
        this.hud = null;
        this.effects = null;

        // Check if user has entered before (skip splash on refresh)
        const hasEntered = localStorage.getItem('satoshisgrid_entered');
        if (hasEntered) {
            this.skipSplash();
        } else {
            this.setupSplashScreen();
        }
    }

    setupSplashScreen() {
        const splash = document.getElementById('splash');
        const enterBtn = document.getElementById('enter-btn');

        // Enter Button führt ins Grid (Audio startet erst hier durch User-Klick)
        enterBtn.addEventListener('click', async () => {
            localStorage.setItem('satoshisgrid_entered', 'true');
            splash.classList.add('hidden');
            await this.init();
            // Start audio now (user click enables AudioContext)
            await this.audioManager.init();
        });

        // Allow keyboard entry
        document.addEventListener('keydown', async (e) => {
            if (e.code === 'Enter' || e.code === 'Space') {
                if (!this.isInitialized) {
                    localStorage.setItem('satoshisgrid_entered', 'true');
                    splash.classList.add('hidden');
                    await this.init();
                    await this.audioManager.init();
                }
            }
        });
    }

    // Skip splash for returning users (refresh)
    async skipSplash() {
        const splash = document.getElementById('splash');
        splash.classList.add('hidden');

        // Start grid immediately
        await this.init();

        // Init audio on first click (browser requirement - no user gesture yet)
        const startAudioOnce = async () => {
            if (this.audioManager && !this.audioManager.isInitialized) {
                await this.audioManager.init();
            }
            document.removeEventListener('click', startAudioOnce);
        };
        document.addEventListener('click', startAudioOnce);
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

            // Initialize Light Cycle
            this.lightCycle = new LightCycle(this.sceneManager, this.effects);

            // Initialize Transaction Manager
            this.transactionManager = new TransactionManager(
                this.sceneManager,
                this.lightCycle,
                this.effects
            );

            // Create Audio Manager (init happens after user gesture)
            if (!this.audioManager) {
                this.audioManager = new AudioManager();
            }

            // Initialize HUD
            this.hud = new HUD();

            // Initialize WebSocket Connection
            this.wsManager = new WebSocketManager(
                this.transactionManager,
                this.lightCycle,
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
        this.lightCycle.update(delta);
        this.effects.update(delta);

        // Render scene
        this.sceneManager.render();

        // Periodic memory check (every 30 seconds for debugging)
        this.frameCount = (this.frameCount || 0) + 1;
        if (this.frameCount % 1800 === 0) { // ~30 seconds at 60fps
            const info = this.sceneManager.renderer.info;
            console.log(`📊 Memory: ${info.memory.geometries} geo, ${info.memory.textures} tex | Scene: ${this.sceneManager.scene.children.length} | TX: ${this.transactionManager.transactions.length}`);
        }
    }
}

// Start application
const app = new SatoshisGrid();

// Export for debugging
window.SatoshisGrid = app;
