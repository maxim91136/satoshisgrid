/**
 * SATOSHIS GRID - Mining Cube
 * Wireframe block being mined with laser effects, solidifies on block found
 */

import * as THREE from 'three';

export class MiningCube {
    constructor(sceneManager, effects) {
        this.sceneManager = sceneManager;
        this.effects = effects;

        // Cube properties
        this.cubeSize = 8;
        this.cubePosition = new THREE.Vector3(0, 5, -40);

        // State
        this.isMining = true;
        this.fillLevel = 0; // 0 to 1
        this.transactionCount = 0;

        // Groups
        this.cubeGroup = new THREE.Group();
        this.lasers = [];
        this.particles = [];

        // Historical blocks (monuments)
        this.monuments = [];
        this.maxMonuments = 10;

        this.createCube();
        this.createLasers();

        this.sceneManager.add(this.cubeGroup);
    }

    createCube() {
        // Wireframe cube
        const geometry = new THREE.BoxGeometry(this.cubeSize, this.cubeSize, this.cubeSize);
        const wireframeMaterial = new THREE.MeshBasicMaterial({
            color: 0xf7931a,
            wireframe: true,
            transparent: true,
            opacity: 0.8
        });

        this.wireframeCube = new THREE.Mesh(geometry, wireframeMaterial);
        this.wireframeCube.position.copy(this.cubePosition);
        this.cubeGroup.add(this.wireframeCube);

        // Inner fill cube (grows as transactions fill the block)
        const fillGeometry = new THREE.BoxGeometry(
            this.cubeSize * 0.95,
            0.1, // Starts flat
            this.cubeSize * 0.95
        );
        const fillMaterial = new THREE.MeshBasicMaterial({
            color: 0xf7931a,
            transparent: true,
            opacity: 0.3
        });

        this.fillCube = new THREE.Mesh(fillGeometry, fillMaterial);
        this.fillCube.position.set(
            this.cubePosition.x,
            this.cubePosition.y - this.cubeSize / 2 + 0.05,
            this.cubePosition.z
        );
        this.cubeGroup.add(this.fillCube);

        // Glow effect around cube
        const glowGeometry = new THREE.BoxGeometry(
            this.cubeSize + 2,
            this.cubeSize + 2,
            this.cubeSize + 2
        );
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xf7931a,
            transparent: true,
            opacity: 0.1,
            side: THREE.BackSide
        });

        this.glowCube = new THREE.Mesh(glowGeometry, glowMaterial);
        this.glowCube.position.copy(this.cubePosition);
        this.cubeGroup.add(this.glowCube);
    }

    createLasers() {
        // Laser beams at each corner "welding" the block
        const corners = [
            [-1, 1, -1], [1, 1, -1], [-1, 1, 1], [1, 1, 1],
            [-1, -1, -1], [1, -1, -1], [-1, -1, 1], [1, -1, 1]
        ];

        const laserMaterial = new THREE.LineBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.8
        });

        corners.forEach((corner, index) => {
            const startPoint = new THREE.Vector3(
                this.cubePosition.x + corner[0] * (this.cubeSize / 2 + 2),
                this.cubePosition.y + corner[1] * (this.cubeSize / 2 + 2),
                this.cubePosition.z + corner[2] * (this.cubeSize / 2 + 2)
            );

            const endPoint = new THREE.Vector3(
                this.cubePosition.x + corner[0] * (this.cubeSize / 2),
                this.cubePosition.y + corner[1] * (this.cubeSize / 2),
                this.cubePosition.z + corner[2] * (this.cubeSize / 2)
            );

            const geometry = new THREE.BufferGeometry().setFromPoints([startPoint, endPoint]);
            const laser = new THREE.Line(geometry, laserMaterial.clone());

            laser.userData = {
                baseOpacity: 0.8,
                phase: index * Math.PI / 4
            };

            this.lasers.push(laser);
            this.cubeGroup.add(laser);
        });
    }

    // Called when a new transaction enters the block
    addTransaction(txData) {
        this.transactionCount++;

        // Increase fill level
        this.fillLevel = Math.min(this.fillLevel + 0.01, 1);

        // Update fill cube height
        const newHeight = this.cubeSize * this.fillLevel * 0.95;
        this.fillCube.scale.y = Math.max(newHeight / 0.1, 1);
        this.fillCube.position.y = this.cubePosition.y - this.cubeSize / 2 + newHeight / 2;

        // Create particle effect at cube
        this.createParticle(txData);
    }

    createParticle(txData) {
        const particleGeometry = new THREE.SphereGeometry(0.2, 8, 8);
        const particleMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 1
        });

        const particle = new THREE.Mesh(particleGeometry, particleMaterial);

        // Start position (random side of cube)
        const side = Math.floor(Math.random() * 4);
        const offset = (Math.random() - 0.5) * this.cubeSize;

        switch (side) {
            case 0:
                particle.position.set(this.cubePosition.x - this.cubeSize, this.cubePosition.y + offset, this.cubePosition.z);
                break;
            case 1:
                particle.position.set(this.cubePosition.x + this.cubeSize, this.cubePosition.y + offset, this.cubePosition.z);
                break;
            case 2:
                particle.position.set(this.cubePosition.x + offset, this.cubePosition.y, this.cubePosition.z - this.cubeSize);
                break;
            case 3:
                particle.position.set(this.cubePosition.x + offset, this.cubePosition.y, this.cubePosition.z + this.cubeSize);
                break;
        }

        particle.userData = {
            target: this.cubePosition.clone(),
            speed: 30,
            life: 1
        };

        this.particles.push(particle);
        this.cubeGroup.add(particle);
    }

    // Called when a block is found
    onBlockFound(blockData) {
        if (!this.isMining) return;

        console.log('🔶 Block found!', blockData);

        // Trigger flash effect
        this.effects.flash();

        // Create solid monument
        this.createMonument(blockData);

        // Reset for next block
        this.reset();
    }

    createMonument(blockData) {
        // Create solid block as monument
        const geometry = new THREE.BoxGeometry(this.cubeSize, this.cubeSize, this.cubeSize);
        const material = new THREE.MeshBasicMaterial({
            color: 0xf7931a,
            transparent: true,
            opacity: 0.9
        });

        const monument = new THREE.Mesh(geometry, material);
        monument.position.copy(this.cubePosition);

        // Edge outline
        const edges = new THREE.EdgesGeometry(geometry);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
        const outline = new THREE.LineSegments(edges, lineMaterial);
        monument.add(outline);

        // Add block height label (as simple plane for now)
        monument.userData = {
            blockHeight: blockData?.height || 'Unknown',
            timestamp: Date.now()
        };

        this.sceneManager.add(monument);
        this.monuments.push(monument);

        // Animate monument falling into place
        this.animateMonumentFall(monument);

        // Remove old monuments if too many
        while (this.monuments.length > this.maxMonuments) {
            const oldest = this.monuments.shift();
            this.sceneManager.remove(oldest);
            oldest.geometry.dispose();
            oldest.material.dispose();
        }
    }

    animateMonumentFall(monument) {
        // Simple drop animation
        monument.position.y = this.cubePosition.y + 20;

        const targetY = this.cubePosition.y - this.cubeSize - 1;
        const duration = 0.5;
        let elapsed = 0;

        const animate = () => {
            elapsed += 0.016;
            const t = Math.min(elapsed / duration, 1);

            // Ease out bounce
            const eased = 1 - Math.pow(1 - t, 3);
            monument.position.y = this.cubePosition.y + 20 - (this.cubePosition.y + 20 - targetY) * eased;

            // Move back in z (into the grid history)
            monument.position.z = this.cubePosition.z - (t * 50);

            if (t < 1) {
                requestAnimationFrame(animate);
            } else {
                // Camera shake on impact
                this.sceneManager.shake(0.3);
            }
        };

        requestAnimationFrame(animate);
    }

    reset() {
        this.fillLevel = 0;
        this.transactionCount = 0;

        // Reset fill cube
        this.fillCube.scale.y = 1;
        this.fillCube.position.y = this.cubePosition.y - this.cubeSize / 2 + 0.05;

        // Clear particles
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

        // Rotate wireframe slowly
        this.wireframeCube.rotation.y += delta * 0.1;
        this.glowCube.rotation.y -= delta * 0.05;

        // Pulse glow
        this.glowCube.material.opacity = 0.1 + Math.sin(time * 2) * 0.05;

        // Animate lasers
        this.lasers.forEach(laser => {
            const phase = laser.userData.phase;
            laser.material.opacity = 0.3 + Math.sin(time * 4 + phase) * 0.5;
        });

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            const target = particle.userData.target;

            // Move toward cube center
            particle.position.lerp(target, delta * 5);

            // Fade out
            particle.userData.life -= delta * 2;
            particle.material.opacity = particle.userData.life;

            // Remove dead particles
            if (particle.userData.life <= 0) {
                this.cubeGroup.remove(particle);
                particle.geometry.dispose();
                particle.material.dispose();
                this.particles.splice(i, 1);
            }
        }
    }

    // Get current block stats
    getStats() {
        return {
            fillLevel: this.fillLevel,
            transactionCount: this.transactionCount,
            monumentCount: this.monuments.length
        };
    }
}
