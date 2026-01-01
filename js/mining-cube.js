/**
 * SATOSHIS GRID - Tron Light Cycle
 * Based on Tron Legacy design - black body with orange neon glow
 */

import * as THREE from 'three';

export class MiningCube {
    constructor(sceneManager, effects) {
        this.sceneManager = sceneManager;
        this.effects = effects;

        this.vehiclePosition = new THREE.Vector3(0, 0, -25);
        this.isMining = true;
        this.fillLevel = 0;
        this.transactionCount = 0;
        this.cubeGroup = new THREE.Group();
        this.particles = [];
        this.monuments = [];
        this.maxMonuments = 10;

        this.createLightCycle();
        this.sceneManager.add(this.cubeGroup);
    }

    createLightCycle() {
        const group = new THREE.Group();
        const orange = 0xf7931a;

        // === MATERIALIEN ===
        const blackMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
        const glowMat = new THREE.MeshBasicMaterial({ color: orange });

        // === RÄDER (das Wichtigste!) ===
        // Hinterrad - groß und dominant
        const wheelRadius = 1.2;
        const rearWheel = new THREE.Mesh(
            new THREE.TorusGeometry(wheelRadius, 0.15, 8, 32),
            glowMat
        );
        rearWheel.rotation.y = Math.PI / 2;
        rearWheel.position.set(0, wheelRadius, -1);
        group.add(rearWheel);
        this.rearWheel = rearWheel;

        // Rad-Speichen (innerer Ring)
        const innerRing = new THREE.Mesh(
            new THREE.TorusGeometry(wheelRadius * 0.6, 0.05, 8, 32),
            glowMat.clone()
        );
        innerRing.rotation.y = Math.PI / 2;
        innerRing.position.copy(rearWheel.position);
        group.add(innerRing);
        this.innerRing = innerRing;

        // Hinterrad Disc (schwarze Füllung)
        const rearDisc = new THREE.Mesh(
            new THREE.CircleGeometry(wheelRadius * 0.55, 32),
            new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide })
        );
        rearDisc.rotation.y = Math.PI / 2;
        rearDisc.position.copy(rearWheel.position);
        group.add(rearDisc);

        // Vorderrad - etwas kleiner
        const frontWheel = new THREE.Mesh(
            new THREE.TorusGeometry(0.7, 0.1, 8, 32),
            glowMat.clone()
        );
        frontWheel.rotation.y = Math.PI / 2;
        frontWheel.position.set(0, 0.7, 2.5);
        group.add(frontWheel);
        this.frontWheel = frontWheel;

        // Vorderrad innerer Ring
        const frontInnerRing = new THREE.Mesh(
            new THREE.TorusGeometry(0.4, 0.03, 8, 32),
            glowMat.clone()
        );
        frontInnerRing.rotation.y = Math.PI / 2;
        frontInnerRing.position.copy(frontWheel.position);
        group.add(frontInnerRing);
        this.frontInnerRing = frontInnerRing;

        // === BODY ===
        // Hauptchassis - flache Box
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.3, 4),
            blackMat
        );
        body.position.set(0, 1, 0.5);
        group.add(body);

        // Neon-Linie auf dem Body (oben)
        const bodyLine = new THREE.Mesh(
            new THREE.BoxGeometry(0.52, 0.05, 4),
            glowMat.clone()
        );
        bodyLine.position.set(0, 1.16, 0.5);
        group.add(bodyLine);

        // Seitenlinien
        [-1, 1].forEach(side => {
            const sideLine = new THREE.Mesh(
                new THREE.BoxGeometry(0.02, 0.1, 3.5),
                glowMat.clone()
            );
            sideLine.position.set(side * 0.26, 1, 0.5);
            group.add(sideLine);
        });

        // Untere Neon-Linie
        const bottomLine = new THREE.Mesh(
            new THREE.BoxGeometry(0.52, 0.03, 4),
            glowMat.clone()
        );
        bottomLine.position.set(0, 0.84, 0.5);
        group.add(bottomLine);

        // === FAHRER (Satoshi-Silhouette) ===
        // Torso - flach liegend
        const torso = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, 0.25, 1.2),
            blackMat.clone()
        );
        torso.position.set(0, 1.35, 0.8);
        torso.rotation.x = -0.2;
        group.add(torso);

        // Torso Neon-Linie
        const torsoLine = new THREE.Mesh(
            new THREE.BoxGeometry(0.42, 0.02, 1.2),
            glowMat.clone()
        );
        torsoLine.position.set(0, 1.48, 0.8);
        torsoLine.rotation.x = -0.2;
        group.add(torsoLine);

        // Kopf (Helm)
        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 8, 8),
            blackMat.clone()
        );
        head.position.set(0, 1.45, 1.6);
        group.add(head);

        // Helm-Linie (Visier-Glow)
        const visor = new THREE.Mesh(
            new THREE.BoxGeometry(0.42, 0.05, 0.02),
            glowMat.clone()
        );
        visor.position.set(0, 1.45, 1.8);
        group.add(visor);

        // ₿ Symbol auf dem Helm
        const btcGroup = new THREE.Group();
        const btcMat = glowMat.clone();

        // Vertikale Linie (Hauptstrich)
        const vLine = new THREE.Mesh(
            new THREE.BoxGeometry(0.02, 0.15, 0.02),
            btcMat
        );
        btcGroup.add(vLine);

        // Obere horizontale Linie
        const hLine1 = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.02, 0.02),
            btcMat.clone()
        );
        hLine1.position.set(0.02, 0.05, 0);
        btcGroup.add(hLine1);

        // Mittlere horizontale Linie
        const hLine2 = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.02, 0.02),
            btcMat.clone()
        );
        hLine2.position.set(0.02, 0, 0);
        btcGroup.add(hLine2);

        // Untere horizontale Linie
        const hLine3 = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.02, 0.02),
            btcMat.clone()
        );
        hLine3.position.set(0.02, -0.05, 0);
        btcGroup.add(hLine3);

        // Oberer Überstrich
        const topStroke = new THREE.Mesh(
            new THREE.BoxGeometry(0.02, 0.04, 0.02),
            btcMat.clone()
        );
        topStroke.position.set(0, 0.09, 0);
        btcGroup.add(topStroke);

        // Unterer Überstrich
        const bottomStroke = new THREE.Mesh(
            new THREE.BoxGeometry(0.02, 0.04, 0.02),
            btcMat.clone()
        );
        bottomStroke.position.set(0, -0.09, 0);
        btcGroup.add(bottomStroke);

        btcGroup.position.set(0, 1.65, 1.55);
        btcGroup.rotation.x = -0.3;
        group.add(btcGroup);

        // Arme (angedeutet)
        [-1, 1].forEach(side => {
            const arm = new THREE.Mesh(
                new THREE.BoxGeometry(0.08, 0.08, 0.6),
                blackMat.clone()
            );
            arm.position.set(side * 0.25, 1.3, 1.4);
            arm.rotation.x = -0.4;
            group.add(arm);
        });

        // === LIGHT TRAIL ===
        const trailMaterial = new THREE.ShaderMaterial({
            uniforms: {
                color: { value: new THREE.Color(orange) }
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
                varying vec2 vUv;
                void main() {
                    float alpha = 1.0 - vUv.y;
                    gl_FragColor = vec4(color, alpha * 0.7);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide
        });

        const trail = new THREE.Mesh(
            new THREE.PlaneGeometry(0.1, 25),
            trailMaterial
        );
        trail.rotation.x = -Math.PI / 2;
        trail.rotation.z = Math.PI / 2;
        trail.position.set(0, 1, -13.5);
        group.add(trail);
        this.trail = trail;

        // === GLOW AURA ===
        const aura = new THREE.Mesh(
            new THREE.BoxGeometry(2, 3, 6),
            new THREE.MeshBasicMaterial({
                color: orange,
                transparent: true,
                opacity: 0.08,
                side: THREE.BackSide
            })
        );
        aura.position.set(0, 1.2, 0.5);
        group.add(aura);
        this.aura = aura;

        group.position.copy(this.vehiclePosition);
        this.cubeGroup.add(group);
        this.vehicle = group;
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
                color: 0xf7931a,
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
            target: new THREE.Vector3(this.vehiclePosition.x, 1.2, this.vehiclePosition.z),
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
            color: 0xf7931a,
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

        // Hover
        if (this.vehicle) {
            this.vehicle.position.y = this.vehiclePosition.y + Math.sin(time * 3) * 0.05;
        }

        // Pulse aura
        if (this.aura) {
            this.aura.material.opacity = 0.06 + Math.sin(time * 2) * 0.03;
        }

        // Spin wheels
        if (this.rearWheel) this.rearWheel.rotation.x += delta * 8;
        if (this.innerRing) this.innerRing.rotation.x += delta * 8;
        if (this.frontWheel) this.frontWheel.rotation.x += delta * 12;
        if (this.frontInnerRing) this.frontInnerRing.rotation.x += delta * 12;

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
