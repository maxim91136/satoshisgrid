/**
 * SATOSHIS GRID - Visual Effects
 * Camera shake, screen flash, bloom adjustments
 */

export class Effects {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;

        this.isDisposed = false;

        // Flash overlay element
        this.flashOverlay = document.getElementById('flash-overlay');

        // Reusable darken overlay (prevent DOM accumulation)
        this.darkenOverlay = null;
        this.darkenTimeout = null;

        // Screen shake state
        this.isShaking = false;
        this.shakeIntensity = 0;
        this.shakeDuration = 0;

        // Bloom pulse state
        this.bloomPulse = 0;
        this.baseBloomStrength = 0.5;  // Reduced for stability
        this.isBloomAnimating = false;

        // Whale indicator (reusable)
        this.whaleIndicator = null;
        this.whaleTimeout = null;

        // Throttle whale effects
        this.lastWhaleTime = 0;
        this.whaleThrottle = 500; // Min 500ms between whale effects

        // Flash timeout (to prevent stuck white screen)
        this.flashTimeout = null;

        this.shakeTimeout = null;
        this.bloomRafId = null;
    }

    // Screen flash effect (for block found)
    flash(duration = 500, intensity = 1) {
        if (!this.flashOverlay) return;

        // Clear any pending flash timeout
        if (this.flashTimeout) {
            clearTimeout(this.flashTimeout);
        }

        this.flashOverlay.style.opacity = intensity;
        this.flashOverlay.classList.add('active');

        this.flashTimeout = setTimeout(() => {
            this.flashOverlay.classList.remove('active');
            this.flashOverlay.style.opacity = ''; // Reset inline style!
        }, duration);
    }

    // Camera shake effect (for whale alerts)
    shake(intensity = 0.5, duration = 0.5) {
        this.sceneManager.shake(intensity);

        // Also shake the HTML body for extra effect
        document.body.classList.add('shake');

        if (this.shakeTimeout) {
            clearTimeout(this.shakeTimeout);
        }
        this.shakeTimeout = setTimeout(() => {
            document.body.classList.remove('shake');
        }, duration * 1000);
    }

    // Combined effect for whale transactions (throttled)
    // tier: 0 = whale (10 BTC), 1 = mega whale (50 BTC), 2 = leviathan (500 BTC)
    onWhaleTransaction(tier = 0) {
        // Throttle to prevent spam
        const now = Date.now();
        if (now - this.lastWhaleTime < this.whaleThrottle) return;
        this.lastWhaleTime = now;

        // Intensity scales with tier
        const intensities = [0.4, 0.7, 1.0];
        const intensity = intensities[tier] || intensities[0];

        // Camera shake - duration scales with tier
        const shakeDurations = [0.3, 0.4, 0.6];
        this.shake(intensity, shakeDurations[tier] || 0.3);

        // Bloom pulse (only if not already animating)
        if (!this.isBloomAnimating) {
            const bloomStrengths = [0.9, 1.2, 1.5];
            const bloomDurations = [0.4, 0.5, 0.8];
            this.pulseBloom(bloomStrengths[tier] || 0.9, bloomDurations[tier] || 0.4);
        }

        // Screen darken - more intense for higher tiers
        const darkenIntensities = [0.2, 0.3, 0.4];
        this.darkenScreen(darkenIntensities[tier] || 0.2, 0.2);

        // Show whale indicator
        this.showWhaleIndicator(tier);
    }

    // Pulse bloom effect (with animation lock)
    pulseBloom(targetStrength, duration) {
        if (!this.sceneManager.bloomPass || this.isBloomAnimating) return;

        this.isBloomAnimating = true;
        const startStrength = this.sceneManager.bloomPass.strength;
        const startTime = performance.now();

        const animate = () => {
            if (this.isDisposed) {
                this.isBloomAnimating = false;
                return;
            }
            const elapsed = (performance.now() - startTime) / 1000;
            const t = Math.min(elapsed / duration, 1);

            // Ease out
            const eased = 1 - Math.pow(1 - t, 3);

            if (t < 0.5) {
                // Ramp up (capped)
                const newStrength = startStrength + (targetStrength - startStrength) * (eased * 2);
                this.sceneManager.bloomPass.strength = Math.min(newStrength, 1.5);
            } else {
                // Ramp down
                this.sceneManager.bloomPass.strength = targetStrength -
                    (targetStrength - this.baseBloomStrength) * ((eased - 0.5) * 2);
            }

            if (t < 1) {
                this.bloomRafId = requestAnimationFrame(animate);
            } else {
                this.sceneManager.bloomPass.strength = this.baseBloomStrength;
                this.isBloomAnimating = false;
                this.bloomRafId = null;
            }
        };

        this.bloomRafId = requestAnimationFrame(animate);
    }

    // Darken screen briefly (reuses single overlay to prevent DOM accumulation)
    darkenScreen(intensity, duration) {
        // Clear any pending timeout
        if (this.darkenTimeout) {
            clearTimeout(this.darkenTimeout);
        }

        // Create overlay once, reuse it
        if (!this.darkenOverlay) {
            this.darkenOverlay = document.createElement('div');
            this.darkenOverlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: black;
                opacity: 0;
                pointer-events: none;
                z-index: 50;
            `;
            document.body.appendChild(this.darkenOverlay);
        }

        // Update transition duration and fade in
        this.darkenOverlay.style.transition = `opacity ${duration}s ease`;
        requestAnimationFrame(() => {
            this.darkenOverlay.style.opacity = intensity;
        });

        // Fade out
        this.darkenTimeout = setTimeout(() => {
            this.darkenOverlay.style.opacity = 0;
        }, duration * 500);
    }

    // Show whale indicator (reuses single element)
    // tier: 0 = whale, 1 = mega whale, 2 = leviathan
    showWhaleIndicator(tier = 0) {
        // Clear previous timeout
        if (this.whaleTimeout) {
            clearTimeout(this.whaleTimeout);
        }

        // Create indicator once, reuse it
        if (!this.whaleIndicator) {
            this.whaleIndicator = document.createElement('div');
            this.whaleIndicator.className = 'whale-alert';
            this.whaleIndicator.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                letter-spacing: 4px;
                z-index: 150;
                font-family: 'JetBrains Mono', monospace;
                white-space: nowrap;
                opacity: 0;
                transition: opacity 0.3s ease;
            `;
            document.body.appendChild(this.whaleIndicator);
        }

        // 3-tier configuration
        const labels = ['🐋 WHALE ALERT', '🐋🐋 MEGA WHALE DETECTED', '🐋🐋🐋 LEVIATHAN'];
        const fontSizes = ['14px', '18px', '24px'];
        const colors = ['#f7931a', '#ff8800', '#ff0000'];
        const glows = [
            'rgba(247,147,26,0.5)',
            'rgba(255,136,0,0.6)',
            'rgba(255,0,0,0.8)'
        ];
        const displayDurations = [1500, 2000, 3000];

        // Update content and style based on tier
        this.whaleIndicator.innerHTML = labels[tier] || labels[0];
        this.whaleIndicator.style.fontSize = fontSizes[tier] || fontSizes[0];
        this.whaleIndicator.style.color = colors[tier] || colors[0];
        this.whaleIndicator.style.textShadow = `0 0 20px ${glows[tier] || glows[0]}, 0 0 40px ${glows[tier] || glows[0]}`;

        // Add pulsing animation for leviathan
        if (tier === 2) {
            this.whaleIndicator.style.animation = 'pulse 0.5s ease-in-out infinite';
        } else {
            this.whaleIndicator.style.animation = '';
        }

        // Show
        this.whaleIndicator.style.opacity = '1';

        // Hide after delay (longer for higher tiers)
        this.whaleTimeout = setTimeout(() => {
            this.whaleIndicator.style.opacity = '0';
            this.whaleIndicator.style.animation = '';
        }, displayDurations[tier] || 1500);
    }

    // Update method called each frame
    update(delta) {
        // Could add continuous effects here
        // e.g., subtle bloom pulsing with mempool activity
    }

    // Trigger effect for new block
    onNewBlock() {
        // Big flash
        this.flash(500, 1);

        // Strong shake
        this.shake(0.8, 0.3);

        // Bloom surge
        this.pulseBloom(2, 0.8);
    }

    dispose() {
        this.isDisposed = true;

        if (this.flashTimeout) {
            clearTimeout(this.flashTimeout);
            this.flashTimeout = null;
        }
        if (this.darkenTimeout) {
            clearTimeout(this.darkenTimeout);
            this.darkenTimeout = null;
        }
        if (this.whaleTimeout) {
            clearTimeout(this.whaleTimeout);
            this.whaleTimeout = null;
        }
        if (this.shakeTimeout) {
            clearTimeout(this.shakeTimeout);
            this.shakeTimeout = null;
        }
        if (this.bloomRafId) {
            cancelAnimationFrame(this.bloomRafId);
            this.bloomRafId = null;
        }

        document.body.classList.remove('shake');

        if (this.darkenOverlay && this.darkenOverlay.parentNode) {
            this.darkenOverlay.parentNode.removeChild(this.darkenOverlay);
        }
        this.darkenOverlay = null;

        if (this.whaleIndicator && this.whaleIndicator.parentNode) {
            this.whaleIndicator.parentNode.removeChild(this.whaleIndicator);
        }
        this.whaleIndicator = null;

        this.flashOverlay = null;
        this.sceneManager = null;
    }

}
