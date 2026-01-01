/**
 * SATOSHIS GRID - Mining Vehicle (Tron-Style)
 * Sleek futuristic vehicle collecting transactions
 */

import * as THREE from 'three';

export class MiningCube {
    constructor(sceneManager, effects) {
        this.sceneManager = sceneManager;
        this.effects = effects;

        // Vehicle properties
        this.vehiclePosition = new THREE.Vector3(0, 1.5, -30);

        // State
        this.isMining = true;
        this.fillLevel = 0;
        this.transactionCount = 0;

        // Groups
        this.cubeGroup = new THREE.Group();
        this.particles = [];

        // Historical blocks (monuments)
        this.monuments = [];
        this.maxMonuments = 10;

        this.createTronVehicle();
        this.createEngineGlow();

        this.sceneManager.add(this.cubeGroup);
    }

    createTronVehicle() {
        const group = new THREE.Group();

        // Main body - sleek elongated shape
        const bodyShape = new THREE.Shape();
        bodyShape.moveTo(0, 0);
        bodyShape.lineTo(6, 0);
        bodyShape.lineTo(7, 0.5);
        bodyShape.lineTo(7, 1.5);
        bodyShape.lineTo(5, 2);
        bodyShape.lineTo(1, 2);
        bodyShape.lineTo(0, 1.5);
        bodyShape.lineTo(0, 0);

        const extrudeSettings = {
            steps: 1,
            depth: 3,
            bevelEnabled: true,
            bevelThickness: 0.2,
            bevelSize: 0.2,
            bevelSegments: 2
        };

        const bodyGeometry = new THREE.ExtrudeGeometry(bodyShape, extrudeSettings);
        const bodyMaterial = new THREE.MeshBasicMaterial({
            color: 0x001a1a,
            transparent: true,
            opacity: 0.9
        });

        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.rotation.y = Math.PI / 2;
        body.position.set(1.5, 0, 3.5);
        group.add(body);

        // Glowing edge lines (Tron style)
        const edgeMaterial = new THREE.LineBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 1
        });

        // Top edge line
        const topLinePoints = [
            new THREE.Vector3(-3.5, 2, -1.5),
            new THREE.Vector3(-3.5, 2, 1.5),
            new THREE.Vector3(3.5, 2, 1.5),
            new THREE.Vector3(3.5, 2, -1.5),
            new THREE.Vector3(-3.5, 2, -1.5)
        ];
        const topLineGeometry = new THREE.BufferGeometry().setFromPoints(topLinePoints);
        const topLine = new THREE.Line(topLineGeometry, edgeMaterial);
        group.add(topLine);

        // Bottom edge lines
        const bottomLinePoints = [
            new THREE.Vector3(-3.5, 0.2, -1.5),
            new THREE.Vector3(-3.5, 0.2, 1.5),
            new THREE.Vector3(3.5, 0.2, 1.5),
            new THREE.Vector3(3.5, 0.2, -1.5),
            new THREE.Vector3(-3.5, 0.2, -1.5)
        ];
        const bottomLineGeometry = new THREE.BufferGeometry().setFromPoints(bottomLinePoints);
        const bottomLine = new THREE.Line(bottomLineGeometry, edgeMaterial);
        group.add(bottomLine);

        // Side accent lines
        const sideLines = [
            [new THREE.Vector3(-3.5, 0.2, -1.5), new THREE.Vector3(-3.5, 2, -1.5)],
            [new THREE.Vector3(-3.5, 0.2, 1.5), new THREE.Vector3(-3.5, 2, 1.5)],
            [new THREE.Vector3(3.5, 0.2, -1.5), new THREE.Vector3(3.5, 2, -1.5)],
            [new THREE.Vector3(3.5, 0.2, 1.5), new THREE.Vector3(3.5, 2, 1.5)]
        ];

        sideLines.forEach(points => {
            const geo = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geo, edgeMaterial.clone());
            group.add(line);
        });

        // Center stripe (glowing)
        const stripeGeometry = new THREE.PlaneGeometry(7, 0.3);
        const stripeMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set(0, 2.01, 0);
        group.add(stripe);
        this.stripe = stripe;

        // Front light bar
        const frontLightGeometry = new THREE.BoxGeometry(0.3, 0.5, 3);
        const frontLightMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.9
        });
        const frontLight = new THREE.Mesh(frontLightGeometry, frontLightMaterial);
        frontLight.position.set(3.6, 1, 0);
        group.add(frontLight);
        this.frontLight = frontLight;

        // Rear thruster
        const thrusterGeometry = new THREE.BoxGeometry(0.2, 1, 2);
        const thrusterMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.7
        });
        const thruster = new THREE.Mesh(thrusterGeometry, thrusterMaterial);
        thruster.position.set(-3.6, 1, 0);
        group.add(thruster);
        this.thruster = thruster;

        // Cockpit (dark tinted)
        const cockpitGeometry = new THREE.BoxGeometry(3, 0.8, 2);
        const cockpitMaterial = new THREE.MeshBasicMaterial({
            color: 0x003333,
            transparent: true,
            opacity: 0.7
        });
        const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
        cockpit.position.set(1, 1.8, 0);
        group.add(cockpit);

        // Wheels (light discs)
        const wheelGeometry = new THREE.CylinderGeometry(0.6, 0.6, 0.2, 16);
        const wheelMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.6
        });

        const wheelPositions = [
            [-2, 0.3, 1.7],
            [-2, 0.3, -1.7],
            [2, 0.3, 1.7],
            [2, 0.3, -1.7]
        ];

        this.wheels = [];
        wheelPositions.forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial.clone());
            wheel.rotation.x = Math.PI / 2;
            wheel.position.set(...pos);
            group.add(wheel);
            this.wheels.push(wheel);
        });

        // Glow effect
        const glowGeometry = new THREE.BoxGeometry(8, 3, 4);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.08,
            side: THREE.BackSide
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.set(0, 1, 0);
        group.add(glow);
        this.glowMesh = glow;

        group.position.copy(this.vehiclePosition);
        this.cubeGroup.add(group);
        this.vehicle = group;
    }

    createEngineGlow() {
        // Thruster trail
        const trailGeometry = new THREE.PlaneGeometry(0.5, 8);
        const trailMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });

        const trail = new THREE.Mesh(trailGeometry, trailMaterial);
        trail.rotation.x = -Math.PI / 2;
        trail.position.set(
            this.vehiclePosition.x - 7.5,
            0.5,
            this.vehiclePosition.z
        );
        this.cubeGroup.add(trail);
        this.trail = trail;
    }

    addTransaction(txData) {
        this.transactionCount++;
        this.fillLevel = Math.min(this.fillLevel + 0.01, 1);

        // Create particle flying into vehicle
        this.createParticle(txData);

        // Pulse the glow
        if (this.glowMesh) {
            this.glowMesh.material.opacity = 0.2;
        }
    }

    createParticle(txData) {
        const particleGeometry = new THREE.SphereGeometry(0.15, 6, 6);
        const particleMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 1
        });

        const particle = new THREE.Mesh(particleGeometry, particleMaterial);

        // Start from ahead of vehicle
        particle.position.set(
            this.vehiclePosition.x + 15 + Math.random() * 10,
            this.vehiclePosition.y + (Math.random() - 0.5) * 2,
            this.vehiclePosition.z + (Math.random() - 0.5) * 4
        );

        particle.userData = {
            target: this.vehiclePosition.clone(),
            speed: 40,
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
        // Create Tron-style block monument
        const group = new THREE.Group();

        // Main block shape
        const geometry = new THREE.BoxGeometry(4, 4, 4);
        const material = new THREE.MeshBasicMaterial({
            color: 0x001a1a,
            transparent: true,
            opacity: 0.9
        });

        const block = new THREE.Mesh(geometry, material);
        group.add(block);

        // Edge glow
        const edges = new THREE.EdgesGeometry(geometry);
        const lineMaterial = new THREE.LineBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.8
        });
        const outline = new THREE.LineSegments(edges, lineMaterial);
        group.add(outline);

        group.position.copy(this.vehiclePosition);
        group.userData = {
            blockHeight: blockData?.height || 'Unknown',
            timestamp: Date.now()
        };

        this.sceneManager.add(group);
        this.monuments.push(group);

        this.animateMonumentFall(group);

        while (this.monuments.length > this.maxMonuments) {
            const oldest = this.monuments.shift();
            this.sceneManager.remove(oldest);
        }
    }

    animateMonumentFall(monument) {
        monument.position.y = this.vehiclePosition.y + 15;

        const targetY = 2;
        const duration = 0.5;
        let elapsed = 0;

        const animate = () => {
            elapsed += 0.016;
            const t = Math.min(elapsed / duration, 1);

            const eased = 1 - Math.pow(1 - t, 3);
            monument.position.y = this.vehiclePosition.y + 15 - (this.vehiclePosition.y + 15 - targetY) * eased;
            monument.position.z = this.vehiclePosition.z - (t * 40);

            if (t < 1) {
                requestAnimationFrame(animate);
            } else {
                this.sceneManager.shake(0.3);
            }
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

        // Subtle hover animation
        if (this.vehicle) {
            this.vehicle.position.y = this.vehiclePosition.y + Math.sin(time * 2) * 0.15;
        }

        // Pulse effects
        if (this.glowMesh) {
            this.glowMesh.material.opacity = 0.05 + Math.sin(time * 3) * 0.03;
        }

        if (this.frontLight) {
            this.frontLight.material.opacity = 0.7 + Math.sin(time * 5) * 0.3;
        }

        if (this.thruster) {
            this.thruster.material.opacity = 0.5 + Math.sin(time * 8) * 0.3;
        }

        if (this.trail) {
            this.trail.material.opacity = 0.2 + Math.sin(time * 4) * 0.1;
        }

        // Rotate wheels
        this.wheels?.forEach(wheel => {
            wheel.rotation.z += delta * 5;
        });

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            const target = particle.userData.target;

            particle.position.lerp(target, delta * 3);
            particle.userData.life -= delta * 1.5;
            particle.material.opacity = particle.userData.life;

            if (particle.userData.life <= 0) {
                this.cubeGroup.remove(particle);
                particle.geometry.dispose();
                particle.material.dispose();
                this.particles.splice(i, 1);
            }
        }
    }

    getStats() {
        return {
            fillLevel: this.fillLevel,
            transactionCount: this.transactionCount,
            monumentCount: this.monuments.length
        };
    }
}
