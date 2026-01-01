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

        this.setupSplashScreen();
    }

    setupSplashScreen() {
        const splash = document.getElementById('splash');
        const enterBtn = document.getElementById('enter-btn');

        // Audio bei ERSTEM Klick irgendwo auf Splash starten
        const startAudioOnce = async () => {
            if (!this.audioManager) {
                console.log('🎵 Starting audio on first interaction...');
                this.audioManager = new AudioManager();
                await this.audioManager.init();
            }
            // Event Listener entfernen nach erstem Klick
            splash.removeEventListener('click', startAudioOnce);
            splash.removeEventListener('touchstart', startAudioOnce);
        };

        // Auf Klick oder Touch irgendwo auf Splash
        splash.addEventListener('click', startAudioOnce);
        splash.addEventListener('touchstart', startAudioOnce);

        // Enter Button führt ins Grid
        enterBtn.addEventListener('click', async () => {
            await startAudioOnce(); // Falls noch nicht gestartet
            this.init();
            splash.classList.add('hidden');
        });

        // Allow keyboard entry
        document.addEventListener('keydown', async (e) => {
            if (e.code === 'Enter' || e.code === 'Space') {
                if (!this.isInitialized) {
                    await startAudioOnce();
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

            // Initialize Light Cycle
            this.lightCycle = new LightCycle(this.sceneManager, this.effects);

            // Initialize Transaction Manager
            this.transactionManager = new TransactionManager(
                this.sceneManager,
                this.lightCycle,
                this.effects
            );

            // Initialize Audio (falls nicht schon auf Splash gestartet)
            if (!this.audioManager) {
                this.audioManager = new AudioManager();
                await this.audioManager.init();
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
    }
}

// Start application
const app = new SatoshisGrid();

// Export for debugging
window.SatoshisGrid = app;
