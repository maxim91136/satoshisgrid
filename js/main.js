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
import { ShareManager } from './share.js';

class SatoshisGrid {
    constructor() {
        this.isInitialized = false;
        this.isDestroyed = false;
        this.sceneManager = null;
        this.grid = null;
        this.transactionManager = null;
        this.lightCycle = null;
        this.wsManager = null;
        this.audioManager = null;
        this.hud = null;
        this.effects = null;
        this.shareManager = null;
        this._rafId = null;

        this._onBeforeUnload = () => this.destroy();
        this._onPageHide = (event) => {
            // Avoid breaking BFCache restores (Safari/iOS) when the page is cached.
            if (event && event.persisted) return;
            this.destroy();
        };
        window.addEventListener('beforeunload', this._onBeforeUnload);
        window.addEventListener('pagehide', this._onPageHide);

        // Check if user has entered before in this session (skip splash on refresh)
        const hasEntered = sessionStorage.getItem('satoshisgrid_entered');
        if (hasEntered) {
            this.skipSplash();
        } else {
            this.setupSplashScreen();
        }
    }

    setupSplashScreen() {
        const splash = document.getElementById('splash');
        const enterBtn = document.getElementById('enter-btn');

        // Ride Mode Selector (prepared for Wild Ride)
        this.selectedRide = 'chilled'; // Default mode
        const rideOptions = document.querySelectorAll('.ride-option:not(.disabled)');
        rideOptions.forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.ride-option').forEach(o => o.classList.remove('active'));
                option.classList.add('active');
                this.selectedRide = option.dataset.ride;
            });
        });

        // Enter Button führt ins Grid (Audio startet erst hier durch User-Klick)
        enterBtn.addEventListener('click', async () => {
            sessionStorage.setItem('satoshisgrid_entered', 'true');
            splash.classList.add('hidden');
            await this.init();
            // Start audio now (user click enables AudioContext)
            await this.audioManager.init();
        });

        // Allow keyboard entry
        document.addEventListener('keydown', async (e) => {
            if (e.code === 'Enter' || e.code === 'Space') {
                if (!this.isInitialized) {
                    sessionStorage.setItem('satoshisgrid_entered', 'true');
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

        // Init audio on first interaction (browser requirement - no user gesture yet)
        const startAudioOnce = async () => {
            if (this.audioManager && !this.audioManager.isInitialized) {
                console.log('🎵 Starting audio on first interaction...');
                await this.audioManager.init();
            }
            document.removeEventListener('click', startAudioOnce);
            document.removeEventListener('touchstart', startAudioOnce);
            document.removeEventListener('keydown', startAudioOnce);
        };
        document.addEventListener('click', startAudioOnce);
        document.addEventListener('touchstart', startAudioOnce);
        document.addEventListener('keydown', startAudioOnce);
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

            // Connect audio manager to HUD for keyboard shortcuts
            this.hud.setAudioManager(this.audioManager);

            // Initialize Share (captures WebGL + HUD metrics)
            this.shareManager = new ShareManager(this.sceneManager);
            this.shareManager.init();

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
        if (this.isDestroyed) return;
        this._rafId = requestAnimationFrame(() => this.animate());

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

    destroy() {
        if (this.isDestroyed) return;
        this.isDestroyed = true;

        if (this._rafId) {
            cancelAnimationFrame(this._rafId);
            this._rafId = null;
        }

        // Network first (stops intervals/reconnects)
        if (this.wsManager) {
            this.wsManager.disconnect();
            this.wsManager = null;
        }

        // Effects (DOM overlays + timeouts)
        if (this.effects && typeof this.effects.dispose === 'function') {
            this.effects.dispose();
        }
        this.effects = null;

        // Share (modal + listeners)
        if (this.shareManager && typeof this.shareManager.dispose === 'function') {
            this.shareManager.dispose();
        }
        this.shareManager = null;

        // UI handlers
        if (this.hud && typeof this.hud.dispose === 'function') {
            this.hud.dispose();
        }
        this.hud = null;

        if (this.transactionManager && typeof this.transactionManager.dispose === 'function') {
            this.transactionManager.dispose();
        }
        this.transactionManager = null;

        if (this.lightCycle && typeof this.lightCycle.dispose === 'function') {
            this.lightCycle.dispose();
        }
        this.lightCycle = null;

        if (this.grid && typeof this.grid.dispose === 'function') {
            this.grid.dispose();
        }
        this.grid = null;

        // Audio
        if (this.audioManager && typeof this.audioManager.dispose === 'function') {
            this.audioManager.dispose();
        }
        this.audioManager = null;

        // Three.js
        if (this.sceneManager && typeof this.sceneManager.dispose === 'function') {
            this.sceneManager.dispose();
        }
        this.sceneManager = null;

        window.removeEventListener('beforeunload', this._onBeforeUnload);
        window.removeEventListener('pagehide', this._onPageHide);
        this._onBeforeUnload = null;
        this._onPageHide = null;
    }
}

// Start application
const app = new SatoshisGrid();

// Export for debugging
window.SatoshisGrid = app;
