/**
 * SATOSHIS GRID - Tron Light Cycle
 * GLB Model: "TRON: Uprising - ArgonCity Light Cycle" by TheTinDog
 * Licensed under CC BY 4.0 (https://skfb.ly/pEW9S)
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const BITCOIN_ORANGE = 0xf7931a;

export class LightCycle {
    constructor(sceneManager, effects) {
        this.sceneManager = sceneManager;
        this.effects = effects;

        this.vehiclePosition = new THREE.Vector3(0, 0, -30);
        this.isMining = true;
        this.fillLevel = 0;
        this.transactionCount = 0;
        this.cubeGroup = new THREE.Group();
        this.particles = [];
        this.monuments = [];
        this.maxMonuments = 10;
        this.bike = null;
        this.trail = null;

        this.loadLightCycle();
        this.createLightTrail();
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
                console.log('🏍️ Light Cycle loaded!');
            },
            (progress) => {
                console.log('Loading:', Math.round(progress.loaded / progress.total * 100) + '%');
            },
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
    }

    createLightTrail() {
        const trailLength = 60;
        const trailHeight = 10;

        // Vertikale Wand - Länge auf X, Höhe auf Y
        const geometry = new THREE.PlaneGeometry(trailLength, trailHeight);

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
                    // UV ist nach Rotation invertiert: vUv.x=0 ist am Bike, vUv.x=1 ist hinten
                    // Invertieren: Am Bike (vUv.x=0) volle Opacity, hinten (vUv.x=1) fade out
                    float fade = pow(1.0 - vUv.x, 0.5);

                    // Subtiler Puls-Effekt
                    float pulse = 0.9 + 0.1 * sin(time * 3.0 + vUv.x * 15.0);

                    // Vertikaler Gradient - heller in der Mitte
                    float vertical = 1.0 - pow(abs(vUv.y - 0.5) * 2.0, 2.0);

                    // Scharfe Kante am Boden
                    float groundFade = smoothstep(0.0, 0.1, vUv.y);

                    float alpha = fade * pulse * vertical * groundFade * 0.8;

                    // Hellerer Kern mit Orange-Glow
                    vec3 finalColor = mix(color, vec3(1.0, 0.7, 0.3), vertical * 0.4);

                    gl_FragColor = vec4(finalColor, alpha);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        this.trail = new THREE.Mesh(geometry, this.trailMaterial);

        // Trail als vertikale Wand hinter dem Bike
        // Rotation: Plane von XY-Ebene in YZ-Ebene drehen
        this.trail.rotation.y = Math.PI / 2;

        // Position: Trail startet direkt am Bike und geht nach HINTEN (Richtung Kamera)
        // Bike ist bei z=-30, fährt in -Z Richtung, Trail geht nach +Z
        this.trail.position.set(
            this.vehiclePosition.x,
            trailHeight / 2,  // Halb-Höhe (Boden bei y=0)
            this.vehiclePosition.z + trailLength / 2 + 2  // Trail hinter Bike (Richtung Kamera)
        );

        this.cubeGroup.add(this.trail);

        // Trail-Länge für Update speichern
        this.trailLength = trailLength;
        this.trailHeight = trailHeight;
    }

    addTransaction(txData) {
        this.transactionCount++;
        this.fillLevel = Math.min(this.fillLevel + 0.01, 1);
        this.createParticle(txData);
    }

    createParticle(txData) {
        const particle = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 6, 6),
            new THREE.MeshBasicMaterial({
                color: BITCOIN_ORANGE,
                transparent: true,
                opacity: 1
            })
        );

        particle.position.set(
            this.vehiclePosition.x + 20 + Math.random() * 15,
            1 + (Math.random() - 0.5) * 2,
            this.vehiclePosition.z + (Math.random() - 0.5) * 8
        );

        particle.userData = {
            target: new THREE.Vector3(this.vehiclePosition.x, 1.5, this.vehiclePosition.z),
            life: 1
        };

        this.particles.push(particle);
        this.cubeGroup.add(particle);
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

        const geometry = new THREE.BoxGeometry(4, 4, 4);
        const material = new THREE.MeshBasicMaterial({
            color: BITCOIN_ORANGE,
            transparent: true,
            opacity: 0.85
        });
        const block = new THREE.Mesh(geometry, material);
        group.add(block);

        const edges = new THREE.EdgesGeometry(geometry);
        const outline = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff }));
        group.add(outline);

        group.position.set(this.vehiclePosition.x, 2, this.vehiclePosition.z);
        this.sceneManager.add(group);
        this.monuments.push(group);
        this.animateMonumentFall(group);

        while (this.monuments.length > this.maxMonuments) {
            const oldest = this.monuments.shift();
            this.sceneManager.remove(oldest);
            // Dispose geometry and materials to prevent memory leak
            oldest.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
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
            p.geometry.dispose();
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
                p.geometry.dispose();
                p.material.dispose();
                this.particles.splice(i, 1);
            }
        }
    }

    getStats() {
        return { fillLevel: this.fillLevel, transactionCount: this.transactionCount, monumentCount: this.monuments.length };
    }
}
