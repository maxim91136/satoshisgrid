/**
 * SATOSHIS GRID - Visual Effects
 * Camera shake, screen flash, bloom adjustments
 */

export class Effects {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;

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
    }

    // Screen flash effect (for block found)
    flash(duration = 500, intensity = 1) {
        if (!this.flashOverlay) return;

        this.flashOverlay.style.opacity = intensity;
        this.flashOverlay.classList.add('active');

        setTimeout(() => {
            this.flashOverlay.classList.remove('active');
        }, duration);
    }

    // Camera shake effect (for whale alerts)
    shake(intensity = 0.5, duration = 0.5) {
        this.sceneManager.shake(intensity);

        // Also shake the HTML body for extra effect
        document.body.classList.add('shake');
        setTimeout(() => {
            document.body.classList.remove('shake');
        }, duration * 1000);
    }

    // Combined effect for whale transactions (throttled)
    onWhaleTransaction(isLarge = false) {
        // Throttle to prevent spam
        const now = Date.now();
        if (now - this.lastWhaleTime < this.whaleThrottle) return;
        this.lastWhaleTime = now;

        const intensity = isLarge ? 0.8 : 0.4;  // Reduced intensity

        // Camera shake
        this.shake(intensity, 0.3);

        // Bloom pulse (only if not already animating)
        if (!this.isBloomAnimating) {
            this.pulseBloom(isLarge ? 1.2 : 0.9, 0.4);
        }

        // Subtle screen darken
        this.darkenScreen(0.2, 0.2);

        // Show whale indicator
        this.showWhaleIndicator(isLarge);
    }

    // Pulse bloom effect (with animation lock)
    pulseBloom(targetStrength, duration) {
        if (!this.sceneManager.bloomPass || this.isBloomAnimating) return;

        this.isBloomAnimating = true;
        const startStrength = this.sceneManager.bloomPass.strength;
        const startTime = performance.now();

        const animate = () => {
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
                requestAnimationFrame(animate);
            } else {
                this.sceneManager.bloomPass.strength = this.baseBloomStrength;
                this.isBloomAnimating = false;
            }
        };

        requestAnimationFrame(animate);
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
    showWhaleIndicator(isLarge) {
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

        // Update content and style
        this.whaleIndicator.innerHTML = isLarge ? 'MEGA WHALE DETECTED' : 'WHALE ALERT';
        this.whaleIndicator.style.fontSize = isLarge ? '18px' : '14px';
        this.whaleIndicator.style.color = isLarge ? '#ff0000' : '#f7931a';
        this.whaleIndicator.style.textShadow = `0 0 20px ${isLarge ? 'rgba(255,0,0,0.5)' : 'rgba(247,147,26,0.5)'}`;

        // Show
        this.whaleIndicator.style.opacity = '1';

        // Hide after delay
        this.whaleTimeout = setTimeout(() => {
            this.whaleIndicator.style.opacity = '0';
        }, 1500);
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

    // Create particle burst (optional enhancement)
    createParticleBurst(position, color = 0x00ffff, count = 20) {
        // This could be expanded with a proper particle system
        // For now, using simple meshes

        const particles = [];

        for (let i = 0; i < count; i++) {
            const geometry = new THREE.SphereGeometry(0.1, 4, 4);
            const material = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 1
            });

            const particle = new THREE.Mesh(geometry, material);
            particle.position.copy(position);

            // Random velocity
            particle.userData.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 10,
                Math.random() * 10,
                (Math.random() - 0.5) * 10
            );
            particle.userData.life = 1;

            this.sceneManager.add(particle);
            particles.push(particle);
        }

        // Animate particles
        const animateParticles = () => {
            let allDead = true;

            particles.forEach(p => {
                if (p.userData.life > 0) {
                    allDead = false;

                    p.position.add(p.userData.velocity.clone().multiplyScalar(0.016));
                    p.userData.velocity.y -= 0.3; // Gravity
                    p.userData.life -= 0.02;
                    p.material.opacity = p.userData.life;
                }
            });

            if (!allDead) {
                requestAnimationFrame(animateParticles);
            } else {
                // Cleanup
                particles.forEach(p => {
                    this.sceneManager.remove(p);
                    p.geometry.dispose();
                    p.material.dispose();
                });
            }
        };

        requestAnimationFrame(animateParticles);
    }
}

// Import THREE for particle effects
import * as THREE from 'three';
