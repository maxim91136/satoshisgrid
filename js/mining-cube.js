/**
 * SATOSHIS GRID - Tron Light Cycle
 * Classic Tron motorcycle design
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

        this.createTronLightCycle();
        this.sceneManager.add(this.cubeGroup);
    }

    createTronLightCycle() {
        const group = new THREE.Group();
        const orange = 0xf7931a;
        const black = 0x0a0a0a;

        // === BIG FRONT WHEEL ===
        const frontWheelOuter = new THREE.TorusGeometry(1.2, 0.2, 16, 32);
        const wheelMaterial = new THREE.MeshBasicMaterial({ color: orange });
        const frontWheel = new THREE.Mesh(frontWheelOuter, wheelMaterial);
        frontWheel.rotation.y = Math.PI / 2;
        frontWheel.position.set(3, 1.2, 0);
        group.add(frontWheel);

        // Front wheel disc
        const frontDisc = new THREE.CircleGeometry(1.1, 32);
        const discMaterial = new THREE.MeshBasicMaterial({
            color: black,
            side: THREE.DoubleSide
        });
        const frontDiscMesh = new THREE.Mesh(frontDisc, discMaterial);
        frontDiscMesh.rotation.y = Math.PI / 2;
        frontDiscMesh.position.set(3, 1.2, 0);
        group.add(frontDiscMesh);

        // Front wheel glow ring
        const frontGlow = new THREE.RingGeometry(0.9, 1.0, 32);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: orange,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8
        });
        const frontGlowMesh = new THREE.Mesh(frontGlow, glowMaterial);
        frontGlowMesh.rotation.y = Math.PI / 2;
        frontGlowMesh.position.set(3.01, 1.2, 0);
        group.add(frontGlowMesh);

        this.frontWheel = frontWheel;

        // === BIG REAR WHEEL ===
        const rearWheel = new THREE.Mesh(frontWheelOuter.clone(), wheelMaterial.clone());
        rearWheel.rotation.y = Math.PI / 2;
        rearWheel.position.set(-3, 1.2, 0);
        group.add(rearWheel);

        const rearDiscMesh = new THREE.Mesh(frontDisc.clone(), discMaterial.clone());
        rearDiscMesh.rotation.y = Math.PI / 2;
        rearDiscMesh.position.set(-3, 1.2, 0);
        group.add(rearDiscMesh);

        const rearGlowMesh = new THREE.Mesh(frontGlow.clone(), glowMaterial.clone());
        rearGlowMesh.rotation.y = Math.PI / 2;
        rearGlowMesh.position.set(-3.01, 1.2, 0);
        group.add(rearGlowMesh);

        this.rearWheel = rearWheel;

        // === MAIN BODY FRAME ===
        // Lower body connecting wheels
        const bodyGeometry = new THREE.BoxGeometry(5, 0.6, 0.8);
        const bodyMaterial = new THREE.MeshBasicMaterial({ color: black });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.set(0, 1, 0);
        group.add(body);

        // Body edge glow
        const bodyEdges = new THREE.EdgesGeometry(bodyGeometry);
        const edgeMaterial = new THREE.LineBasicMaterial({ color: orange });
        const bodyOutline = new THREE.LineSegments(bodyEdges, edgeMaterial);
        bodyOutline.position.set(0, 1, 0);
        group.add(bodyOutline);

        // === SEAT / DRIVER AREA ===
        const seatGeometry = new THREE.BoxGeometry(2.5, 0.4, 0.6);
        const seat = new THREE.Mesh(seatGeometry, bodyMaterial.clone());
        seat.position.set(-0.5, 1.5, 0);
        group.add(seat);

        const seatEdges = new THREE.EdgesGeometry(seatGeometry);
        const seatOutline = new THREE.LineSegments(seatEdges, edgeMaterial.clone());
        seatOutline.position.set(-0.5, 1.5, 0);
        group.add(seatOutline);

        // === FRONT FAIRING ===
        const fairingGeometry = new THREE.BoxGeometry(1.5, 1.2, 0.5);
        const fairing = new THREE.Mesh(fairingGeometry, bodyMaterial.clone());
        fairing.position.set(2, 1.8, 0);
        fairing.rotation.z = -0.3;
        group.add(fairing);

        const fairingEdges = new THREE.EdgesGeometry(fairingGeometry);
        const fairingOutline = new THREE.LineSegments(fairingEdges, edgeMaterial.clone());
        fairingOutline.position.set(2, 1.8, 0);
        fairingOutline.rotation.z = -0.3;
        group.add(fairingOutline);

        // === HANDLEBARS ===
        const handleGeometry = new THREE.BoxGeometry(0.15, 0.15, 1.8);
        const handle = new THREE.Mesh(handleGeometry, new THREE.MeshBasicMaterial({ color: orange }));
        handle.position.set(2.3, 2.2, 0);
        group.add(handle);

        // === RIDER (simple silhouette) ===
        // Torso
        const torsoGeometry = new THREE.BoxGeometry(1, 1.2, 0.5);
        const riderMaterial = new THREE.MeshBasicMaterial({ color: black });
        const torso = new THREE.Mesh(torsoGeometry, riderMaterial);
        torso.position.set(0.5, 2.3, 0);
        torso.rotation.z = -0.4;
        group.add(torso);

        // Helmet
        const helmetGeometry = new THREE.SphereGeometry(0.35, 16, 16);
        const helmet = new THREE.Mesh(helmetGeometry, riderMaterial.clone());
        helmet.position.set(1.3, 2.9, 0);
        group.add(helmet);

        // Helmet visor glow
        const visorGeometry = new THREE.PlaneGeometry(0.5, 0.15);
        const visorMaterial = new THREE.MeshBasicMaterial({
            color: orange,
            transparent: true,
            opacity: 0.9
        });
        const visor = new THREE.Mesh(visorGeometry, visorMaterial);
        visor.position.set(1.6, 2.9, 0);
        group.add(visor);

        // === LIGHT TRAIL ===
        const trailGeometry = new THREE.PlaneGeometry(25, 2.2);
        const trailMaterial = new THREE.MeshBasicMaterial({
            color: orange,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });
        const trail = new THREE.Mesh(trailGeometry, trailMaterial);
        trail.rotation.y = Math.PI / 2;
        trail.position.set(-16, 1.1, 0);
        group.add(trail);
        this.trail = trail;

        // === GLOW AURA ===
        const auraGeometry = new THREE.BoxGeometry(8, 4, 3);
        const auraMaterial = new THREE.MeshBasicMaterial({
            color: orange,
            transparent: true,
            opacity: 0.1,
            side: THREE.BackSide
        });
        const aura = new THREE.Mesh(auraGeometry, auraMaterial);
        aura.position.y = 1.5;
        group.add(aura);
        this.aura = aura;

        // === HEADLIGHT ===
        const headlightGeometry = new THREE.CircleGeometry(0.25, 16);
        const headlightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const headlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
        headlight.position.set(3.5, 1.8, 0);
        headlight.rotation.y = Math.PI / 2;
        group.add(headlight);

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
        const particleGeometry = new THREE.SphereGeometry(0.25, 6, 6);
        const particleMaterial = new THREE.MeshBasicMaterial({
            color: 0xf7931a,
            transparent: true,
            opacity: 1
        });

        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        particle.position.set(
            this.vehiclePosition.x + 25 + Math.random() * 15,
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
            this.vehicle.position.y = this.vehiclePosition.y + Math.sin(time * 3) * 0.08;
        }

        // Pulse aura
        if (this.aura) {
            this.aura.material.opacity = 0.08 + Math.sin(time * 2) * 0.04;
        }

        // Pulse trail
        if (this.trail) {
            this.trail.material.opacity = 0.4 + Math.sin(time * 4) * 0.2;
        }

        // Spin wheels
        if (this.frontWheel) this.frontWheel.rotation.x += delta * 10;
        if (this.rearWheel) this.rearWheel.rotation.x += delta * 10;

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
