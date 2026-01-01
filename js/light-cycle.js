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

                // Farbe auf Bitcoin Orange ändern
                this.bike.traverse((child) => {
                    if (child.isMesh && child.material) {
                        const mat = child.material;

                        // Emissive Teile (die leuchtenden Linien)
                        if (mat.emissive) {
                            mat.emissive.setHex(BITCOIN_ORANGE);
                            mat.emissiveIntensity = 2.5;
                        }

                        // Falls das Material rot/neon ist, auf Orange ändern
                        if (mat.color) {
                            const r = mat.color.r;
                            const g = mat.color.g;
                            if (r > 0.5 && g < 0.3) {
                                mat.color.setHex(BITCOIN_ORANGE);
                                mat.emissive = new THREE.Color(BITCOIN_ORANGE);
                                mat.emissiveIntensity = 2;
                            }
                        }
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
        const trailHeight = 8;
        const trailLength = 50;

        const geometry = new THREE.PlaneGeometry(trailLength, trailHeight);

        const material = new THREE.ShaderMaterial({
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
                    float fade = pow(vUv.x, 0.3);
                    float pulse = 0.85 + 0.15 * sin(time * 4.0 + vUv.x * 20.0);
                    float vertical = 0.7 + 0.3 * (1.0 - abs(vUv.y - 0.5) * 2.0);
                    float alpha = fade * pulse * vertical * 0.7;
                    gl_FragColor = vec4(color * 1.5, alpha);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        this.trail = new THREE.Mesh(geometry, material);
        this.trail.rotation.y = Math.PI / 2;
        this.trail.position.set(
            this.vehiclePosition.x,
            trailHeight / 2 + 0.5,
            this.vehiclePosition.z - trailLength / 2 - 5
        );

        this.cubeGroup.add(this.trail);
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

        // Trail pulsieren
        if (this.trail && this.trail.material.uniforms) {
            this.trail.material.uniforms.time.value += delta;
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
