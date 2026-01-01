/**
 * SATOSHIS GRID - Visual Effects
 * Camera shake, screen flash, bloom adjustments
 */

export class Effects {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;

        // Flash overlay element
        this.flashOverlay = document.getElementById('flash-overlay');

        // Screen shake state
        this.isShaking = false;
        this.shakeIntensity = 0;
        this.shakeDuration = 0;

        // Bloom pulse state
        this.bloomPulse = 0;
        this.baseBloomStrength = 0.8;
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

    // Combined effect for whale transactions
    onWhaleTransaction(isLarge = false) {
        const intensity = isLarge ? 1 : 0.5;

        // Camera shake
        this.shake(intensity, 0.5);

        // Bloom pulse
        this.pulseBloom(isLarge ? 2 : 1.5, 0.5);

        // Subtle screen darken
        this.darkenScreen(0.3, 0.3);

        // Show whale indicator
        this.showWhaleIndicator(isLarge);
    }

    // Pulse bloom effect
    pulseBloom(targetStrength, duration) {
        if (!this.sceneManager.bloomPass) return;

        const startStrength = this.sceneManager.bloomPass.strength;
        const startTime = performance.now();

        const animate = () => {
            const elapsed = (performance.now() - startTime) / 1000;
            const t = Math.min(elapsed / duration, 1);

            // Ease out
            const eased = 1 - Math.pow(1 - t, 3);

            if (t < 0.5) {
                // Ramp up
                this.sceneManager.bloomPass.strength = startStrength +
                    (targetStrength - startStrength) * (eased * 2);
            } else {
                // Ramp down
                this.sceneManager.bloomPass.strength = targetStrength -
                    (targetStrength - this.baseBloomStrength) * ((eased - 0.5) * 2);
            }

            if (t < 1) {
                requestAnimationFrame(animate);
            } else {
                this.sceneManager.bloomPass.strength = this.baseBloomStrength;
            }
        };

        requestAnimationFrame(animate);
    }

    // Darken screen briefly
    darkenScreen(intensity, duration) {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: black;
            opacity: 0;
            pointer-events: none;
            z-index: 50;
            transition: opacity ${duration}s ease;
        `;

        document.body.appendChild(overlay);

        // Fade in
        requestAnimationFrame(() => {
            overlay.style.opacity = intensity;
        });

        // Fade out and remove
        setTimeout(() => {
            overlay.style.opacity = 0;
            setTimeout(() => {
                overlay.remove();
            }, duration * 1000);
        }, duration * 500);
    }

    // Show whale indicator
    showWhaleIndicator(isLarge) {
        const indicator = document.createElement('div');
        indicator.className = 'whale-alert';
        indicator.innerHTML = isLarge ?
            '🐋 MEGA WHALE DETECTED 🐋' :
            '🐋 WHALE ALERT 🐋';

        indicator.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: ${isLarge ? '18px' : '14px'};
            letter-spacing: 4px;
            color: ${isLarge ? '#ff0000' : '#f7931a'};
            text-shadow: 0 0 20px ${isLarge ? 'rgba(255,0,0,0.5)' : 'rgba(247,147,26,0.5)'};
            z-index: 150;
            animation: whale-pulse 2s ease-out forwards;
            font-family: 'JetBrains Mono', monospace;
            white-space: nowrap;
        `;

        document.body.appendChild(indicator);

        setTimeout(() => {
            indicator.remove();
        }, 2000);
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
