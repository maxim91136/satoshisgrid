/**
 * SATOSHIS GRID - Tron Light Cycle
 * GLB Model: "TRON: Uprising - ArgonCity Light Cycle" by TheTinDog
 * Licensed under CC BY 4.0 (https://skfb.ly/pEW9S)
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const BITCOIN_ORANGE = 0xf7931a;

// SHARED GEOMETRIES for monuments and particles (prevents memory leak!)
const SHARED_MONUMENT_GEOMETRIES = {
    block: new THREE.BoxGeometry(4, 4, 4),
    particle: new THREE.SphereGeometry(0.2, 6, 6)
};
// EdgesGeometry for monument outline (computed once)
const SHARED_MONUMENT_EDGES = new THREE.EdgesGeometry(SHARED_MONUMENT_GEOMETRIES.block);

export class LightCycle {
    constructor(sceneManager, effects) {
        this.sceneManager = sceneManager;
        this.effects = effects;

        this.vehiclePosition = new THREE.Vector3(0, 0, -15);
        this.isMining = true;
        this.fillLevel = 0;
        this.transactionCount = 0;
        this.cubeGroup = new THREE.Group();
        this.particles = [];
        this.monuments = [];
        this.maxMonuments = 10;
        this.bike = null;
        this.trail = null;

        // Use shared geometry for particles
        this.particleGeometry = SHARED_MONUMENT_GEOMETRIES.particle;
        this.maxParticles = 15; // Strict limit for stability

        this.loadLightCycle();
        // Trail created after bike loads (see loadLightCycle callback)
        this.sceneManager.add(this.cubeGroup);
    }

    loadLightCycle() {
        const loader = new GLTFLoader();

        loader.load(
            '/models/light-cycle.glb',
            (gltf) => {
                this.bike = gltf.scene;

                // Skalierung
                this.bike.scale.set(5, 5, 5);

                // Materialien verarbeiten
                this.bike.traverse((child) => {
                    if (child.isMesh) {
                        const materials = Array.isArray(child.material)
                            ? child.material
                            : [child.material];

                        materials.forEach((mat) => {
                            if (!mat) return;

                            // Emissive Map aktivieren falls vorhanden
                            if (mat.emissiveMap) {
                                mat.emissive = new THREE.Color(0xffffff);
                                mat.emissiveIntensity = 0.8;
                            }

                            // HSL-basierte Farberkennung
                            if (mat.color) {
                                const hsl = {};
                                mat.color.getHSL(hsl);

                                // Rot/Magenta Bereich (Hue 0-0.1 oder 0.8-1.0)
                                // = leuchtende Teile -> Bitcoin Orange
                                if ((hsl.h < 0.1 || hsl.h > 0.8) && hsl.s > 0.5 && hsl.l > 0.3) {
                                    mat.color.setHex(BITCOIN_ORANGE);
                                    mat.emissive = new THREE.Color(BITCOIN_ORANGE);
                                    mat.emissiveIntensity = 0.8;
                                }
                            }

                            // Namen-basierte Erkennung
                            const name = (mat.name || child.name || '').toLowerCase();
                            if (name.includes('light') ||
                                name.includes('glow') ||
                                name.includes('neon') ||
                                name.includes('emission') ||
                                name.includes('emissive')) {
                                mat.emissive = new THREE.Color(BITCOIN_ORANGE);
                                mat.emissiveIntensity = 0.8;
                            }

                            mat.needsUpdate = true;
                        });
                    }
                });

                // Position und Rotation
                this.bike.position.copy(this.vehiclePosition);
                this.bike.position.y = 1;
                this.bike.rotation.y = Math.PI; // Nach vorne ausrichten

                this.cubeGroup.add(this.bike);

                // Create trail AFTER bike is loaded
                this.createLightTrail();
                console.log('🏍️ Light Cycle loaded!');
            },
            undefined, // Skip progress logging to reduce console spam
            (error) => {
                console.error('Error loading Light Cycle:', error);
                // Fallback: Einfaches Placeholder-Objekt
                this.createFallbackBike();
            }
        );
    }

    createFallbackBike() {
        // Einfacher Fallback falls GLB nicht lädt
        const geometry = new THREE.BoxGeometry(4, 1, 8);
        const material = new THREE.MeshBasicMaterial({
            color: BITCOIN_ORANGE,
            wireframe: true
        });
        this.bike = new THREE.Mesh(geometry, material);
        this.bike.position.copy(this.vehiclePosition);
        this.bike.position.y = 1;
        this.cubeGroup.add(this.bike);
        this.createLightTrail();
    }

    createLightTrail() {
        const trailLength = 50;
        const trailHeight = 8;

        // Plane für horizontalen Trail am Boden (wie klassischer Tron Light Cycle Trail)
        // PlaneGeometry(width, depth) - width entlang X, depth entlang Y
        const geometry = new THREE.PlaneGeometry(2, trailLength);

        this.trailMaterial = new THREE.ShaderMaterial({
            uniforms: {
                color: { value: new THREE.Color(BITCOIN_ORANGE) },
                time: { value: 0 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 color;
                uniform float time;
                varying vec2 vUv;

                void main() {
                    // vUv.y = 0 am Bike (vorne), vUv.y = 1 hinten (fade out)
                    float fade = pow(1.0 - vUv.y, 0.7);

                    // Puls-Effekt
                    float pulse = 0.85 + 0.15 * sin(time * 4.0 + vUv.y * 20.0);

                    // Horizontaler Gradient - heller in der Mitte
                    float horizontal = 1.0 - pow(abs(vUv.x - 0.5) * 2.0, 2.0);

                    float alpha = fade * pulse * horizontal * 0.9;

                    // Hellerer Kern
                    vec3 finalColor = mix(color, vec3(1.0, 0.6, 0.2), horizontal * 0.5);

                    gl_FragColor = vec4(finalColor, alpha);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        this.trail = new THREE.Mesh(geometry, this.trailMaterial);

        // Trail horizontal auf dem Boden, hinter dem Bike
        this.trail.rotation.x = -Math.PI / 2;  // Flach auf den Boden

        // Position: Direkt hinter dem Bike
        this.trail.position.set(
            this.vehiclePosition.x,
            0.15,  // Deutlich über dem Grid (Z-Fighting vermeiden)
            this.vehiclePosition.z + trailLength / 2 + 4
        );

        this.cubeGroup.add(this.trail);

        // Zusätzlich: Vertikale Glow-Wand für mehr Präsenz
        this.createVerticalGlow(trailLength, trailHeight);

        this.trailLength = trailLength;
        this.trailHeight = trailHeight;
    }

    createVerticalGlow(length, height) {
        // Vertikale Lichtwand - dünn, aber sichtbar
        const glowGeo = new THREE.PlaneGeometry(0.5, height);

        const glowMat = new THREE.ShaderMaterial({
            uniforms: {
                color: { value: new THREE.Color(BITCOIN_ORANGE) },
                time: { value: 0 }
            },
            vertexShader: `
                varying vec2 vUv;
                varying float vZ;
                void main() {
                    vUv = uv;
                    vZ = position.z;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 color;
                uniform float time;
                varying vec2 vUv;

                void main() {
                    // Vertikal: heller in der Mitte
                    float vertical = 1.0 - pow(abs(vUv.y - 0.5) * 2.0, 1.5);
                    float pulse = 0.8 + 0.2 * sin(time * 3.0);
                    float alpha = vertical * pulse * 0.6;

                    vec3 finalColor = mix(color, vec3(1.0, 0.8, 0.4), vertical * 0.3);
                    gl_FragColor = vec4(finalColor, alpha);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        // Erstelle mehrere vertikale Glow-Panels entlang der Trail-Länge
        this.verticalGlows = [];
        const panelCount = 8;
        const spacing = length / panelCount;

        for (let i = 0; i < panelCount; i++) {
            const glow = new THREE.Mesh(glowGeo, glowMat.clone());
            glow.position.set(
                this.vehiclePosition.x,
                height / 2,
                this.vehiclePosition.z + 4 + i * spacing
            );
            // Leichte Fade basierend auf Entfernung
            const fadeAmount = 1 - (i / panelCount) * 0.8;
            glow.material.uniforms.color.value = new THREE.Color(BITCOIN_ORANGE).multiplyScalar(fadeAmount);

            this.cubeGroup.add(glow);
            this.verticalGlows.push(glow);
        }

        this.glowMaterial = glowMat;
    }

    addTransaction(txData) {
        this.transactionCount++;
        this.fillLevel = Math.min(this.fillLevel + 0.01, 1);
        // Particles removed for stability
    }

    onBlockFound(blockData) {
        if (!this.isMining) return;
        console.log('🔶 Block found!', blockData);
        this.effects.flash();
        this.createMonument(blockData);
        this.reset();
    }

    createMonument(blockData) {
        const group = new THREE.Group();

        // Use SHARED geometry (prevents memory leak!)
        const material = new THREE.MeshBasicMaterial({
            color: BITCOIN_ORANGE,
            transparent: true,
            opacity: 0.85
        });
        const block = new THREE.Mesh(SHARED_MONUMENT_GEOMETRIES.block, material);
        group.add(block);

        // Use SHARED edges geometry
        const outline = new THREE.LineSegments(SHARED_MONUMENT_EDGES, new THREE.LineBasicMaterial({ color: 0xffffff }));
        group.add(outline);

        group.position.set(this.vehiclePosition.x, 2, this.vehiclePosition.z);
        this.sceneManager.add(group);
        this.monuments.push(group);
        this.animateMonumentFall(group);

        while (this.monuments.length > this.maxMonuments) {
            const oldest = this.monuments.shift();
            oldest.userData.disposed = true; // Cancel any running animation
            this.sceneManager.remove(oldest);
            // DON'T dispose geometries - they are shared!
            // Only dispose materials
            oldest.traverse((child) => {
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
        }
    }

    animateMonumentFall(monument) {
        monument.position.y = 15;
        const duration = 0.5;
        let elapsed = 0;

        const animate = () => {
            // Stop animation if monument was disposed
            if (monument.userData.disposed) return;

            elapsed += 0.016;
            const t = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            monument.position.y = 15 - (15 - 2) * eased;
            monument.position.z = this.vehiclePosition.z - (t * 30);
            if (t < 1) requestAnimationFrame(animate);
            else this.sceneManager.shake(0.3);
        };
        requestAnimationFrame(animate);
    }

    reset() {
        this.fillLevel = 0;
        this.transactionCount = 0;
        this.particles.forEach(p => {
            this.cubeGroup.remove(p);
            // Only dispose material, geometry is shared!
            p.material.dispose();
        });
        this.particles = [];
    }

    update(delta) {
        if (!this.isMining) return;
        const time = Date.now() * 0.001;

        // Bike schweben
        if (this.bike) {
            this.bike.position.y = 1 + Math.sin(time * 2) * 0.2;
        }

        // Trail Animation
        if (this.trailMaterial && this.trailMaterial.uniforms) {
            this.trailMaterial.uniforms.time.value = time;
        }

        // Vertical Glow Animation
        if (this.verticalGlows) {
            this.verticalGlows.forEach((glow, i) => {
                if (glow.material.uniforms) {
                    glow.material.uniforms.time.value = time + i * 0.5;
                }
            });
        }

        // Trail folgt Bike X-Position (falls Bike sich bewegt)
        if (this.trail && this.bike) {
            this.trail.position.x = this.bike.position.x;
        }

        // Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.position.lerp(p.userData.target, delta * 5);
            p.userData.life -= delta * 2;
            p.material.opacity = p.userData.life;
            if (p.userData.life <= 0) {
                this.cubeGroup.remove(p);
                // Only dispose material, geometry is shared!
                p.material.dispose();
                this.particles.splice(i, 1);
            }
        }
    }

    getStats() {
        return { fillLevel: this.fillLevel, transactionCount: this.transactionCount, monumentCount: this.monuments.length };
    }
}
