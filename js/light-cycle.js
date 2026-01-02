/**
 * SATOSHIS GRID - Tron Light Cycle
 * GLB Model: "TRON: Uprising - ArgonCity Light Cycle" by TheTinDog
 * Licensed under CC BY 4.0 (https://skfb.ly/pEW9S)
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const BITCOIN_ORANGE = 0xf7931a;
const ROAD_CYAN = 0x00ffff;

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

        this.isDisposed = false;

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

        // Trick animation system
        this.trickState = 'cruise';  // cruise, curve, barrelRoll, loop
        this.trickTime = 0;
        this.trickDuration = 0;
        this.nextTrickIn = 5 + Math.random() * 10; // 5-15s before first trick
        this.baseRotation = { x: 0, y: Math.PI, z: 0 };
        this.curveDirection = 1;

        // Road loop (visual + bike follows it) - every few minutes
        this.roadLoop = {
            enabled: true,
            active: false,
            phase: 'idle', // idle | pre | loop | post
            time: 0,
            duration: 4.5, // seconds
            preDuration: 2.0,
            postDuration: 2.0,
            radius: 10, // world units
            nextIn: 150 + Math.random() * 120, // 2.5-4.5 minutes
            startPos: null, // THREE.Vector3
            startYaw: Math.PI,
            center: null // THREE.Vector3
        };

        this.roadLoopMesh = null;
        this.roadLoopMaterial = null;
        this.roadLoopCurve = null;

        // Reusable math objects (avoid per-frame allocations)
        this._tmpPos = new THREE.Vector3();
        this._tmpPos2 = new THREE.Vector3();
        this._tmpTan = new THREE.Vector3();
        this._tmpUp = new THREE.Vector3(0, 1, 0);
        this._tmpMatrix = new THREE.Matrix4();
        this._tmpQuat = new THREE.Quaternion();
        this._modelForwardFixQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);

        // Use shared geometry for particles
        this.particleGeometry = SHARED_MONUMENT_GEOMETRIES.particle;
        this.maxParticles = 15; // Strict limit for stability

        // Pushing block (temporary, after block found)
        this.pushingBlock = null;
        this.pushingBlockTimeout = null;

        this.loadLightCycle();
        // Trail created after bike loads (see loadLightCycle callback)
        this.sceneManager.add(this.cubeGroup);

        // Console command for testing
        window.doLoop = () => this.startRoadLoop();
    }

    ensureRoadLoopMesh(radius) {
        if (this.roadLoopMesh) return;

        // Build a loop "road" ribbon using Frenet frames for proper orientation
        const segments = 100;
        const roadWidth = 8;

        // Curve in YZ plane, entry tangent points toward -Z
        const points = [];
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const theta = (-Math.PI / 2) - (t * Math.PI * 2);
            points.push(new THREE.Vector3(
                0,
                Math.sin(theta) * radius,
                Math.cos(theta) * radius
            ));
        }

        this.roadLoopCurve = new THREE.CatmullRomCurve3(points, true, 'centripetal');

        // Compute Frenet frames for proper ribbon orientation
        const frames = this.roadLoopCurve.computeFrenetFrames(segments, true);

        // Build ribbon geometry manually
        const vertices = [];
        const indices = [];
        const uvs = [];

        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const pos = this.roadLoopCurve.getPointAt(t);
            const binormal = frames.binormals[i];

            // Road extends in binormal direction (perpendicular to path)
            const halfWidth = roadWidth / 2;
            const left = pos.clone().add(binormal.clone().multiplyScalar(-halfWidth));
            const right = pos.clone().add(binormal.clone().multiplyScalar(halfWidth));

            vertices.push(left.x, left.y, left.z);
            vertices.push(right.x, right.y, right.z);

            uvs.push(0, t);
            uvs.push(1, t);
        }

        // Build triangle indices
        for (let i = 0; i < segments; i++) {
            const a = i * 2;
            const b = i * 2 + 1;
            const c = (i + 1) * 2;
            const d = (i + 1) * 2 + 1;

            indices.push(a, b, c);
            indices.push(b, d, c);
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geo.setIndex(indices);
        geo.computeVertexNormals();

        const mat = new THREE.MeshBasicMaterial({
            color: ROAD_CYAN,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide,
            depthWrite: false
        });

        const mesh = new THREE.Mesh(geo, mat);
        mesh.renderOrder = 5;
        mesh.visible = false;

        this.roadLoopMesh = mesh;
        this.roadLoopMaterial = mat;
        this.cubeGroup.add(mesh);
    }

    startRoadLoop() {
        if (!this.bike) return;
        if (!this.roadLoop.enabled || this.roadLoop.phase !== 'idle') return;

        // Don’t overlap with other tricks for simplicity
        if (this.trickState !== 'cruise') return;

        this.roadLoop.active = true;
        this.roadLoop.phase = 'pre';
        this.roadLoop.time = 0;
        this.roadLoop.startPos = this.bike.position.clone();
        this.roadLoop.startYaw = Math.PI;
        this.roadLoop.center = new THREE.Vector3(
            this.roadLoop.startPos.x,
            0.15 + this.roadLoop.radius,
            this.roadLoop.startPos.z
        );

        this.ensureRoadLoopMesh(this.roadLoop.radius);
        if (this.roadLoopMesh) {
            this.roadLoopMesh.position.copy(this.roadLoop.center);
            this.roadLoopMesh.rotation.set(0, 0, 0);
            this.roadLoopMesh.visible = true;
            if (this.roadLoopMaterial) this.roadLoopMaterial.opacity = 0;
        }
    }

    updateRoadLoop(delta, time) {
        if (!this.roadLoop.active || !this.bike) return false;

        // PRE: fade in the road loop mesh for a couple seconds
        if (this.roadLoop.phase === 'pre') {
            this.roadLoop.time += delta;
            const p = Math.min(this.roadLoop.time / this.roadLoop.preDuration, 1);

            if (this.roadLoopMaterial) {
                this.roadLoopMaterial.opacity = 0.85 * p;
            }

            // Keep bike in a stable cruise pose during pre-roll
            const hover = Math.sin(time * 2) * 0.15;
            this.bike.position.y = 1 + hover;
            this.bike.rotation.x = 0;
            this.bike.rotation.y = Math.PI;
            this.bike.rotation.z = 0;

            if (p >= 1) {
                this.roadLoop.phase = 'loop';
                this.roadLoop.time = 0;
            }
            return true;
        }

        // POST: fade out after loop
        if (this.roadLoop.phase === 'post') {
            this.roadLoop.time += delta;
            const p = Math.min(this.roadLoop.time / this.roadLoop.postDuration, 1);

            if (this.roadLoopMaterial) {
                this.roadLoopMaterial.opacity = 0.85 * (1 - p);
            }

            // Back to normal cruise pose while fading out
            const hover = Math.sin(time * 2) * 0.15;
            this.bike.position.y = 1 + hover;
            this.bike.rotation.x = 0;
            this.bike.rotation.y = Math.PI;
            this.bike.rotation.z = 0;

            if (p >= 1) {
                if (this.roadLoopMesh) this.roadLoopMesh.visible = false;
                if (this.roadLoopMaterial) this.roadLoopMaterial.opacity = 0;

                this.roadLoop.active = false;
                this.roadLoop.phase = 'idle';
                this.roadLoop.time = 0;

                // Schedule next loop
                this.roadLoop.nextIn = 150 + Math.random() * 120;
            }
            return true;
        }

        // LOOP: bike follows the visible loop
        this.roadLoop.time += delta;
        const p = Math.min(this.roadLoop.time / this.roadLoop.duration, 1);

        // Keep loop fully visible during the maneuver
        if (this.roadLoopMaterial) this.roadLoopMaterial.opacity = 0.85;

        // Sample the road loop curve for both road + bike
        if (!this.roadLoopMesh || !this.roadLoopCurve) return false;

        // Ensure world matrix is up-to-date before transforming points
        this.roadLoopMesh.updateMatrixWorld(true);

        // Local point/tangent from curve
        this.roadLoopCurve.getPointAt(p, this._tmpPos);
        this.roadLoopCurve.getTangentAt(p, this._tmpTan);

        // Transform to world space
        this._tmpPos.applyMatrix4(this.roadLoopMesh.matrixWorld);
        this._tmpTan.transformDirection(this.roadLoopMesh.matrixWorld).normalize();

        // Bike rides on the road: road y is ~0.15, bike baseline is ~1.0
        const bikeYOffset = 1 - 0.15;
        this.bike.position.copy(this._tmpPos);
        this.bike.position.y += bikeYOffset;

        // Orientation from tangent (fixes inverted direction)
        // Matrix lookAt makes -Z point to target, so we apply model-forward fix (Y=PI)
        this._tmpMatrix.lookAt(new THREE.Vector3(0, 0, 0), this._tmpTan, this._tmpUp);
        this._tmpQuat.setFromRotationMatrix(this._tmpMatrix);
        this.bike.quaternion.copy(this._tmpQuat).multiply(this._modelForwardFixQuat);

        // Keep trail/vertical glows following X during loop
        if (this.trail) this.trail.position.x = this.bike.position.x;
        if (this.verticalGlows) {
            this.verticalGlows.forEach((glow) => {
                glow.position.x = this.bike.position.x;
            });
        }

        if (p >= 1) {
            // Transition to post-fade
            this.roadLoop.phase = 'post';
            this.roadLoop.time = 0;
            this.roadLoop.startPos = null;
            this.roadLoop.center = null;
        }

        return true;
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

        // Create pushing block in front of bike
        this.createPushingBlock(blockData);
        this.reset();
    }

    createPushingBlock(blockData) {
        // Remove existing pushing block if any
        if (this.pushingBlock) {
            this.releasePushingBlock();
        }

        // Clear any pending timeout
        if (this.pushingBlockTimeout) {
            clearTimeout(this.pushingBlockTimeout);
        }

        const group = new THREE.Group();

        // Use SHARED geometry
        const material = new THREE.MeshBasicMaterial({
            color: BITCOIN_ORANGE,
            transparent: true,
            opacity: 0.9
        });
        const block = new THREE.Mesh(SHARED_MONUMENT_GEOMETRIES.block, material);
        group.add(block);

        // Outline
        const outline = new THREE.LineSegments(
            SHARED_MONUMENT_EDGES,
            new THREE.LineBasicMaterial({ color: 0xffffff })
        );
        group.add(outline);

        // Position in front of bike (negative Z is forward direction)
        group.position.set(
            this.vehiclePosition.x,
            2,
            this.vehiclePosition.z - 12  // 12 units in front
        );

        group.userData.blockData = blockData;
        this.cubeGroup.add(group);
        this.pushingBlock = group;

        // After 30 seconds, release the block
        this.pushingBlockTimeout = setTimeout(() => {
            this.releasePushingBlock();
        }, 30000);

        console.log('📦 Pushing block created (30s)');
    }

    releasePushingBlock() {
        if (!this.pushingBlock) return;

        // Simply remove the block (disappears after 30s)
        this.cubeGroup.remove(this.pushingBlock);

        // Dispose materials
        this.pushingBlock.traverse((child) => {
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });

        this.pushingBlock = null;
        if (this.pushingBlockTimeout) {
            clearTimeout(this.pushingBlockTimeout);
            this.pushingBlockTimeout = null;
        }

        console.log('📦 Block disappeared after 30s');
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
        const startY = monument.position.y;
        const startZ = monument.position.z;
        const duration = 0.5;
        let elapsed = 0;

        // Lift up first, then fall
        monument.position.y = 15;

        const animate = () => {
            // Stop animation if monument was disposed
            if (monument.userData.disposed) return;

            elapsed += 0.016;
            const t = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            monument.position.y = 15 - (15 - 2) * eased;
            monument.position.z = startZ + (t * 30);  // Move backward from current position
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

    startRandomTrick() {
        const tricks = ['curve', 'barrelRoll', 'wiggle'];
        const trick = tricks[Math.floor(Math.random() * tricks.length)];

        this.trickState = trick;
        this.trickTime = 0;
        this.curveDirection = Math.random() > 0.5 ? 1 : -1;

        switch (trick) {
            case 'curve':
                this.trickDuration = 3; // 3s S-curve
                break;
            case 'barrelRoll':
                this.trickDuration = 2; // 2s gentle roll
                break;
            case 'wiggle':
                this.trickDuration = 2; // 2s wiggle
                break;
        }

        // Next trick in 8-20s
        this.nextTrickIn = 8 + Math.random() * 12;
    }

    updateTrick(delta, time) {
        if (!this.bike) return;

        const t = this.trickTime / this.trickDuration;
        const hover = Math.sin(time * 2) * 0.15;

        if (t >= 1) {
            // Trick complete - return to cruise
            this.trickState = 'cruise';
            return;
        }

        // Smooth ease in/out
        const ease = Math.sin(t * Math.PI);

        switch (this.trickState) {
            case 'curve':
                // Gentle S-curve: move X, bank Z
                const curveX = Math.sin(t * Math.PI * 2) * 3 * this.curveDirection;
                const banking = Math.cos(t * Math.PI * 2) * 0.15 * this.curveDirection;

                this.bike.position.x = this.vehiclePosition.x + curveX;
                this.bike.position.y = 1 + hover;
                this.bike.rotation.x = 0;
                this.bike.rotation.y = Math.PI;
                this.bike.rotation.z = banking;
                break;

            case 'barrelRoll':
                // Gentle 360° roll around Z axis
                const rollAngle = t * Math.PI * 2 * this.curveDirection;

                this.bike.position.x = this.vehiclePosition.x;
                this.bike.position.y = 1 + hover + ease * 0.5; // Slight lift during roll
                this.bike.rotation.x = 0;
                this.bike.rotation.y = Math.PI;
                this.bike.rotation.z = rollAngle;
                break;

            case 'wiggle':
                // Quick side-to-side wiggle
                const wiggleX = Math.sin(t * Math.PI * 6) * 1.5 * ease;
                const wiggleZ = Math.cos(t * Math.PI * 6) * 0.1;

                this.bike.position.x = this.vehiclePosition.x + wiggleX;
                this.bike.position.y = 1 + hover;
                this.bike.rotation.x = 0;
                this.bike.rotation.y = Math.PI;
                this.bike.rotation.z = wiggleZ;
                break;
        }
    }

    update(delta) {
        if (this.isDisposed) return;
        if (!this.isMining) return;
        const time = Date.now() * 0.001;

        // Road loop has priority (bike follows visible road loop)
        if (this.updateRoadLoop(delta, time)) {
            return;
        }

        // Trigger road loop every few minutes (simple)
        if (this.roadLoop.enabled && this.trickState === 'cruise') {
            this.roadLoop.nextIn -= delta;
            if (this.roadLoop.nextIn <= 0) {
                this.startRoadLoop();
            }
        }

        // Trick timing
        this.nextTrickIn -= delta;
        if (this.trickState === 'cruise' && this.nextTrickIn <= 0) {
            this.startRandomTrick();
        }

        // Update trick animation
        if (this.trickState !== 'cruise') {
            this.trickTime += delta;
            this.updateTrick(delta, time);
        }

        // Bike schweben + trick position
        if (this.bike) {
            const hover = Math.sin(time * 2) * 0.15;

            if (this.trickState === 'cruise') {
                // Gentle idle sway
                this.bike.position.x = this.vehiclePosition.x + Math.sin(time * 0.3) * 0.5;
                this.bike.position.y = 1 + hover;
                this.bike.rotation.x = 0;
                this.bike.rotation.y = Math.PI;
                this.bike.rotation.z = Math.sin(time * 0.3) * 0.02; // Tiny banking
            }
        }

        // Trail Animation
        if (this.trailMaterial && this.trailMaterial.uniforms) {
            this.trailMaterial.uniforms.time.value = time;
        }

        // Vertical Glow Animation + follow bike X
        if (this.verticalGlows && this.bike) {
            this.verticalGlows.forEach((glow, i) => {
                if (glow.material.uniforms) {
                    glow.material.uniforms.time.value = time + i * 0.5;
                }
                glow.position.x = this.bike.position.x;
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

    dispose() {
        this.isDisposed = true;

        // Stop road loop
        if (this.roadLoop) {
            this.roadLoop.active = false;
            this.roadLoop.startPos = null;
            this.roadLoop.center = null;
        }

        if (this.roadLoopMesh) {
            try { this.cubeGroup.remove(this.roadLoopMesh); } catch (_) { /* ignore */ }
            if (this.roadLoopMesh.geometry) {
                try { this.roadLoopMesh.geometry.dispose(); } catch (_) { /* ignore */ }
            }
            if (this.roadLoopMesh.material) {
                try { this.roadLoopMesh.material.dispose(); } catch (_) { /* ignore */ }
            }
            this.roadLoopMesh = null;
        }
        this.roadLoopMaterial = null;

        if (this.pushingBlockTimeout) {
            clearTimeout(this.pushingBlockTimeout);
            this.pushingBlockTimeout = null;
        }

        if (this.pushingBlock) {
            this.releasePushingBlock();
        }

        // Remove any particles (materials only, geometry is shared)
        this.particles.forEach((p) => {
            try { this.cubeGroup.remove(p); } catch (_) { /* ignore */ }
            if (p.material) {
                try { p.material.dispose(); } catch (_) { /* ignore */ }
            }
        });
        this.particles = [];

        // Dispose vertical glows (materials are cloned; geometry is shared)
        if (this.verticalGlows) {
            this.verticalGlows.forEach((glow) => {
                try { this.cubeGroup.remove(glow); } catch (_) { /* ignore */ }
                if (glow.material) {
                    try { glow.material.dispose(); } catch (_) { /* ignore */ }
                }
            });
            this.verticalGlows = null;
        }
        this.glowMaterial = null;

        // Dispose trail (geometry/material are owned)
        if (this.trail) {
            try { this.cubeGroup.remove(this.trail); } catch (_) { /* ignore */ }
            if (this.trail.geometry) {
                try { this.trail.geometry.dispose(); } catch (_) { /* ignore */ }
            }
            if (this.trail.material) {
                try { this.trail.material.dispose(); } catch (_) { /* ignore */ }
            }
            this.trail = null;
        }
        if (this.trailMaterial) {
            try { this.trailMaterial.dispose(); } catch (_) { /* ignore */ }
            this.trailMaterial = null;
        }

        // Dispose bike materials; if fallback bike, also dispose its geometry
        if (this.bike) {
            try { this.cubeGroup.remove(this.bike); } catch (_) { /* ignore */ }
            const isFallbackBike = this.bike.isMesh === true;

            this.bike.traverse?.((child) => {
                if (!child) return;
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach((m) => {
                            try { m.dispose(); } catch (_) { /* ignore */ }
                        });
                    } else {
                        try { child.material.dispose(); } catch (_) { /* ignore */ }
                    }
                }
            });

            if (isFallbackBike && this.bike.geometry) {
                try { this.bike.geometry.dispose(); } catch (_) { /* ignore */ }
            }
            this.bike = null;
        }

        // Remove monuments (materials only; geometries are shared)
        this.monuments.forEach((mon) => {
            mon.userData.disposed = true;
            try { this.sceneManager.remove(mon); } catch (_) { /* ignore */ }
            mon.traverse((child) => {
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach((m) => {
                            try { m.dispose(); } catch (_) { /* ignore */ }
                        });
                    } else {
                        try { child.material.dispose(); } catch (_) { /* ignore */ }
                    }
                }
            });
        });
        this.monuments = [];

        // Remove from scene
        if (this.cubeGroup) {
            try { this.sceneManager.remove(this.cubeGroup); } catch (_) { /* ignore */ }
            this.cubeGroup.clear();
            this.cubeGroup = null;
        }

        this.sceneManager = null;
        this.effects = null;
    }
}
