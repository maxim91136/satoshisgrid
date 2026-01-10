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
import { Aurora } from './aurora.js';
import { Stars } from './stars.js';

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
        this.aurora = null;
        this.stars = null;
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

        // Custom Radio Stream Setup
        this.setupRadioStream();

        // Enter Button führt ins Grid (Audio startet erst hier durch User-Klick)
        enterBtn.addEventListener('click', async () => {
            // Read audio preferences from checkboxes
            const musicEnabled = document.getElementById('music-enabled')?.checked ?? true;
            const sfxEnabled = document.getElementById('sfx-enabled')?.checked ?? true;
            const radioEnabled = this.isRadioEnabled();

            sessionStorage.setItem('satoshisgrid_entered', 'true');
            sessionStorage.setItem('satoshisgrid_music', musicEnabled ? 'on' : 'off');
            sessionStorage.setItem('satoshisgrid_sfx', sfxEnabled ? 'on' : 'off');

            splash.classList.add('hidden');
            await this.init();

            // Start audio now (user click enables AudioContext)
            await this.audioManager.init(this.selectedRide);

            // If radio is enabled, use radio instead of built-in music
            if (radioEnabled) {
                this.audioManager.setMusicEnabled(false); // Disable built-in music
                this.audioManager.setRadioAudio(this.radioAudio); // Pass radio to audio manager
                this.startRadioStream();
            } else {
                this.audioManager.setMusicEnabled(musicEnabled);
            }
            this.audioManager.setSfxEnabled(sfxEnabled);
        });

        // Allow keyboard entry
        document.addEventListener('keydown', async (e) => {
            if (e.code === 'Enter' || e.code === 'Space') {
                if (!this.isInitialized) {
                    const musicEnabled = document.getElementById('music-enabled')?.checked ?? true;
                    const sfxEnabled = document.getElementById('sfx-enabled')?.checked ?? true;
                    const radioEnabled = this.isRadioEnabled();

                    sessionStorage.setItem('satoshisgrid_entered', 'true');
                    sessionStorage.setItem('satoshisgrid_music', musicEnabled ? 'on' : 'off');
                    sessionStorage.setItem('satoshisgrid_sfx', sfxEnabled ? 'on' : 'off');

                    splash.classList.add('hidden');
                    await this.init();
                    await this.audioManager.init(this.selectedRide);

                    if (radioEnabled) {
                        this.audioManager.setMusicEnabled(false);
                        this.audioManager.setRadioAudio(this.radioAudio);
                        this.startRadioStream();
                    } else {
                        this.audioManager.setMusicEnabled(musicEnabled);
                    }
                    this.audioManager.setSfxEnabled(sfxEnabled);
                }
            }
        });
    }

    // Skip splash for returning users (refresh)
    async skipSplash() {
        const splash = document.getElementById('splash');
        splash.classList.add('hidden');

        // Restore saved audio preferences
        const musicEnabled = sessionStorage.getItem('satoshisgrid_music') !== 'off';
        const sfxEnabled = sessionStorage.getItem('satoshisgrid_sfx') !== 'off';
        const radioEnabled = this.isRadioEnabled();

        // Create radio audio element if radio was enabled
        if (radioEnabled) {
            this.radioAudio = new Audio();
            this.radioAudio.crossOrigin = 'anonymous';
        }

        // Start grid immediately
        await this.init();

        // Init audio on first interaction (browser requirement - no user gesture yet)
        const startAudioOnce = async () => {
            if (this.audioManager && !this.audioManager.isInitialized) {
                console.log('🎵 Starting audio on first interaction...');
                await this.audioManager.init();

                // Handle radio mode
                if (radioEnabled) {
                    this.audioManager.setMusicEnabled(false);
                    this.audioManager.setRadioAudio(this.radioAudio);
                    this.startRadioStream();
                } else {
                    this.audioManager.setMusicEnabled(musicEnabled);
                }
                this.audioManager.setSfxEnabled(sfxEnabled);
            }
            document.removeEventListener('click', startAudioOnce);
            document.removeEventListener('touchstart', startAudioOnce);
            document.removeEventListener('keydown', startAudioOnce);
        };
        document.addEventListener('click', startAudioOnce);
        document.addEventListener('touchstart', startAudioOnce);
        document.addEventListener('keydown', startAudioOnce);
    }

    // Custom Radio Stream Setup
    setupRadioStream() {
        const radioCheckbox = document.getElementById('radio-enabled');
        const radioInputContainer = document.getElementById('radio-input-container');
        const radioUrlInput = document.getElementById('radio-url');
        const radioTestBtn = document.getElementById('radio-test');
        const radioStatus = document.getElementById('radio-status');
        const radioHint = document.getElementById('radio-hint');
        const radioStreamBox = document.querySelector('.radio-stream');
        const musicCheckbox = document.getElementById('music-enabled');

        if (!radioCheckbox || !radioInputContainer || !radioUrlInput) return;

        // Create audio element for radio stream
        this.radioAudio = new Audio();
        this.radioAudio.crossOrigin = 'anonymous';
        this.isRadioPlaying = false;

        // Load saved URL from localStorage
        const savedUrl = localStorage.getItem('satoshisgrid_radio_url');
        if (savedUrl) {
            radioUrlInput.value = savedUrl;
        }

        // Load saved radio enabled state
        const radioWasEnabled = localStorage.getItem('satoshisgrid_radio_enabled') === 'true';
        if (radioWasEnabled && savedUrl) {
            radioCheckbox.checked = true;
            radioInputContainer.classList.remove('hidden');
            radioHint?.classList.remove('hidden');
            radioStreamBox?.classList.add('active');
            // Uncheck built-in music when radio is enabled
            if (musicCheckbox) {
                musicCheckbox.checked = false;
            }
        }

        // Toggle radio input visibility
        radioCheckbox.addEventListener('change', () => {
            if (radioCheckbox.checked) {
                radioInputContainer.classList.remove('hidden');
                radioHint?.classList.remove('hidden');
                radioStreamBox?.classList.add('active');
                // Uncheck built-in music
                if (musicCheckbox) {
                    musicCheckbox.checked = false;
                }
                localStorage.setItem('satoshisgrid_radio_enabled', 'true');
            } else {
                radioInputContainer.classList.add('hidden');
                radioHint?.classList.add('hidden');
                radioStreamBox?.classList.remove('active');
                this.stopRadio();
                localStorage.setItem('satoshisgrid_radio_enabled', 'false');
            }
        });

        // Music checkbox: when enabled, disable radio
        if (musicCheckbox) {
            musicCheckbox.addEventListener('change', () => {
                if (musicCheckbox.checked && radioCheckbox.checked) {
                    // Disable radio when music is enabled
                    radioCheckbox.checked = false;
                    radioInputContainer.classList.add('hidden');
                    radioHint?.classList.add('hidden');
                    radioStreamBox?.classList.remove('active');
                    this.stopRadio();
                    localStorage.setItem('satoshisgrid_radio_enabled', 'false');
                }
            });
        }

        // Save URL on input change
        radioUrlInput.addEventListener('input', () => {
            localStorage.setItem('satoshisgrid_radio_url', radioUrlInput.value);
        });

        // Test stream button
        radioTestBtn.addEventListener('click', () => {
            if (this.isRadioPlaying) {
                this.stopRadio();
                radioTestBtn.textContent = '▶';
                radioTestBtn.classList.remove('playing');
                radioStatus.classList.add('hidden');
            } else {
                this.testRadioStream(radioUrlInput.value, radioStatus);
            }
        });

        // Handle audio events
        this.radioAudio.addEventListener('playing', () => {
            this.isRadioPlaying = true;
            radioTestBtn.textContent = '⏹';
            radioTestBtn.classList.add('playing');
            radioStatus.textContent = 'STREAM ACTIVE';
            radioStatus.className = 'radio-stream-status success';
            radioStatus.classList.remove('hidden');
        });

        this.radioAudio.addEventListener('error', () => {
            this.isRadioPlaying = false;
            radioTestBtn.textContent = '▶';
            radioTestBtn.classList.remove('playing');
            radioStatus.textContent = 'STREAM ERROR';
            radioStatus.className = 'radio-stream-status error';
            radioStatus.classList.remove('hidden');
        });

        // Example URL click to copy
        const radioExample = document.getElementById('radio-example');
        if (radioExample) {
            radioExample.addEventListener('click', () => {
                const exampleUrl = 'https://ice1.somafm.com/defcon-128-mp3';
                radioUrlInput.value = exampleUrl;
                localStorage.setItem('satoshisgrid_radio_url', exampleUrl);
                radioExample.textContent = 'Copied!';
                setTimeout(() => {
                    radioExample.textContent = 'ice1.somafm.com/defcon-128-mp3';
                }, 1500);
            });
        }
    }

    testRadioStream(url, statusEl) {
        if (!url || url.trim() === '') {
            statusEl.textContent = 'ENTER URL';
            statusEl.className = 'radio-stream-status error';
            statusEl.classList.remove('hidden');
            return;
        }

        statusEl.textContent = 'CONNECTING...';
        statusEl.className = 'radio-stream-status loading';
        statusEl.classList.remove('hidden');

        this.radioAudio.src = url.trim();
        this.radioAudio.load();
        this.radioAudio.play().catch(() => {
            statusEl.textContent = 'PLAYBACK FAILED';
            statusEl.className = 'radio-stream-status error';
        });
    }

    stopRadio() {
        if (this.radioAudio) {
            this.radioAudio.pause();
            this.radioAudio.src = '';
            this.isRadioPlaying = false;
        }
    }

    // Check if radio should play instead of built-in music
    isRadioEnabled() {
        return localStorage.getItem('satoshisgrid_radio_enabled') === 'true' &&
               localStorage.getItem('satoshisgrid_radio_url');
    }

    // Start radio stream (called after entering the grid)
    startRadioStream() {
        const url = localStorage.getItem('satoshisgrid_radio_url');
        if (url && this.isRadioEnabled()) {
            this.radioAudio.src = url;
            this.radioAudio.load();
            this.radioAudio.play().catch(e => console.warn('Radio autoplay blocked:', e));
        }
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

            // Initialize Stars (background)
            this.stars = new Stars(this.sceneManager);
            this.stars.init();

            // Initialize Aurora (horizon lights)
            this.aurora = new Aurora(this.sceneManager);
            this.aurora.init();

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
        this.stars.update(delta);
        this.aurora.update(delta);
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

        if (this.aurora && typeof this.aurora.dispose === 'function') {
            this.aurora.dispose();
        }
        this.aurora = null;

        if (this.stars && typeof this.stars.dispose === 'function') {
            this.stars.dispose();
        }
        this.stars = null;

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

// Load version from VERSION file
fetch('/VERSION')
    .then(r => r.text())
    .then(v => {
        const el = document.getElementById('menu-version');
        if (el) el.textContent = 'v' + v.trim();
    })
    .catch(() => {});
