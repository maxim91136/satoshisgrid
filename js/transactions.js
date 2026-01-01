/**
 * SATOSHIS GRID - Transaction Visualization
 * Light Cycles (small TX), Armored Transports (medium), Recognizers (whales)
 */

import * as THREE from 'three';

// Transaction size thresholds (in BTC)
const THRESHOLDS = {
    SMALL: 0.1,      // < 0.1 BTC = Light Cycle
    MEDIUM: 10,      // 0.1 - 10 BTC = Armored Transport
    LARGE: 100,      // 10 - 100 BTC = Small Recognizer
    WHALE: 100       // > 100 BTC = Large Recognizer + Effects
};

// Colors
const COLORS = {
    CYAN: 0x00ffff,
    ORANGE: 0xf7931a,
    RED: 0xff0000,
    WHITE: 0xffffff
};

class Transaction {
    constructor(data, sceneManager) {
        this.data = data;
        this.sceneManager = sceneManager;
        this.mesh = null;
        this.trail = null;
        this.speed = this.calculateSpeed();
        this.active = true;
        this.type = this.determineType();

        this.createMesh();
    }

    determineType() {
        const btcValue = this.data.value / 100000000; // Satoshis to BTC

        if (btcValue < THRESHOLDS.SMALL) return 'lightCycle';
        if (btcValue < THRESHOLDS.MEDIUM) return 'armoredTransport';
        if (btcValue < THRESHOLDS.LARGE) return 'recognizerSmall';
        return 'recognizerLarge';
    }

    calculateSpeed() {
        // Higher fee rate = faster speed
        const baseFee = this.data.feeRate || 10;
        const baseSpeed = 20;
        const feeMultiplier = Math.min(baseFee / 10, 5); // Cap at 5x speed
        return baseSpeed + (feeMultiplier * 10);
    }

    createMesh() {
        const btcValue = this.data.value / 100000000;

        switch (this.type) {
            case 'lightCycle':
                this.createLightCycle();
                break;
            case 'armoredTransport':
                this.createArmoredTransport();
                break;
            case 'recognizerSmall':
            case 'recognizerLarge':
                this.createRecognizer(this.type === 'recognizerLarge');
                break;
        }

        // Position at horizon
        const xOffset = (Math.random() - 0.5) * 80;
        this.mesh.position.set(xOffset, this.getYPosition(), -150);
        this.mesh.userData.txData = this.data;

        this.sceneManager.add(this.mesh);
    }

    getYPosition() {
        switch (this.type) {
            case 'lightCycle': return 0.5;
            case 'armoredTransport': return 1;
            case 'recognizerSmall': return 8;
            case 'recognizerLarge': return 15;
            default: return 1;
        }
    }

    createLightCycle() {
        // Sleek, thin light trail - like a motorcycle
        const group = new THREE.Group();

        // Main body - elongated box
        const bodyGeometry = new THREE.BoxGeometry(0.3, 0.3, 3);
        const bodyMaterial = new THREE.MeshBasicMaterial({
            color: COLORS.CYAN,
            transparent: true,
            opacity: 0.9
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        group.add(body);

        // Glow effect
        const glowGeometry = new THREE.BoxGeometry(0.5, 0.5, 4);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: COLORS.CYAN,
            transparent: true,
            opacity: 0.3
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        group.add(glow);

        // Trail
        this.createTrail(group, COLORS.CYAN, 0.2, 8);

        this.mesh = group;
    }

    createArmoredTransport() {
        // Wider, more substantial vehicle
        const group = new THREE.Group();

        // Main body - wider box
        const bodyGeometry = new THREE.BoxGeometry(1.5, 0.8, 4);
        const bodyMaterial = new THREE.MeshBasicMaterial({
            color: COLORS.CYAN,
            transparent: true,
            opacity: 0.9
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        group.add(body);

        // Side panels
        const panelGeometry = new THREE.BoxGeometry(0.1, 1, 3);
        const panelMaterial = new THREE.MeshBasicMaterial({
            color: COLORS.WHITE,
            transparent: true,
            opacity: 0.7
        });

        const leftPanel = new THREE.Mesh(panelGeometry, panelMaterial);
        leftPanel.position.set(-0.8, 0, 0);
        group.add(leftPanel);

        const rightPanel = new THREE.Mesh(panelGeometry, panelMaterial);
        rightPanel.position.set(0.8, 0, 0);
        group.add(rightPanel);

        // Glow
        const glowGeometry = new THREE.BoxGeometry(2, 1.2, 5);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: COLORS.CYAN,
            transparent: true,
            opacity: 0.2
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        group.add(glow);

        // Trail
        this.createTrail(group, COLORS.CYAN, 0.5, 10);

        this.mesh = group;
    }

    createRecognizer(isLarge) {
        // U-shaped flying machine hovering over the grid
        const group = new THREE.Group();
        const scale = isLarge ? 1.5 : 1;
        const color = COLORS.ORANGE;

        // Main U-shape body
        // Left arm
        const armGeometry = new THREE.BoxGeometry(2 * scale, 1 * scale, 8 * scale);
        const armMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.9
        });

        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(-4 * scale, 0, 0);
        group.add(leftArm);

        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        rightArm.position.set(4 * scale, 0, 0);
        group.add(rightArm);

        // Connecting bar
        const barGeometry = new THREE.BoxGeometry(10 * scale, 1 * scale, 2 * scale);
        const bar = new THREE.Mesh(barGeometry, armMaterial);
        bar.position.set(0, 0, 3 * scale);
        group.add(bar);

        // Central core (glowing)
        const coreGeometry = new THREE.SphereGeometry(1 * scale, 16, 16);
        const coreMaterial = new THREE.MeshBasicMaterial({
            color: isLarge ? COLORS.RED : color
        });
        const core = new THREE.Mesh(coreGeometry, coreMaterial);
        core.position.set(0, -0.5 * scale, 2 * scale);
        group.add(core);

        // Glow effect
        const glowGeometry = new THREE.BoxGeometry(12 * scale, 3 * scale, 10 * scale);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.15
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        group.add(glow);

        // Shadow on grid (dark plane below)
        const shadowGeometry = new THREE.PlaneGeometry(12 * scale, 10 * scale);
        const shadowMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });
        const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.y = -this.getYPosition() + 0.1;
        group.add(shadow);

        this.mesh = group;
        this.speed = this.speed * 0.6; // Recognizers move slower, more ominous
    }

    createTrail(group, color, width, length) {
        const trailGeometry = new THREE.PlaneGeometry(width, length);
        const trailMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide
        });
        const trail = new THREE.Mesh(trailGeometry, trailMaterial);
        trail.rotation.x = -Math.PI / 2;
        trail.position.y = -0.2;
        trail.position.z = length / 2 + 1;
        group.add(trail);
        this.trail = trail;
    }

    update(delta) {
        if (!this.active || !this.mesh) return;

        // Move toward camera
        this.mesh.position.z += this.speed * delta;

        // Subtle hover motion for recognizers
        if (this.type.includes('recognizer')) {
            this.mesh.position.y = this.getYPosition() + Math.sin(Date.now() * 0.002) * 0.5;
        }

        // Deactivate when past camera
        if (this.mesh.position.z > 50) {
            this.active = false;
        }
    }

    dispose() {
        if (this.mesh) {
            this.sceneManager.remove(this.mesh);
            this.mesh.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
            this.mesh = null;
        }
    }
}

export class TransactionManager {
    constructor(sceneManager, miningCube, effects) {
        this.sceneManager = sceneManager;
        this.miningCube = miningCube;
        this.effects = effects;
        this.transactions = [];
        this.maxTransactions = 200;

        // For click detection
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.setupClickHandler();
    }

    setupClickHandler() {
        window.addEventListener('click', (event) => {
            this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);

            const meshes = this.transactions
                .filter(tx => tx.mesh)
                .map(tx => tx.mesh);

            const intersects = this.raycaster.intersectObjects(meshes, true);

            if (intersects.length > 0) {
                let obj = intersects[0].object;
                while (obj.parent && !obj.userData.txData) {
                    obj = obj.parent;
                }
                if (obj.userData.txData) {
                    this.showTransactionInfo(obj.userData.txData);
                }
            }
        });
    }

    showTransactionInfo(data) {
        const panel = document.getElementById('tx-panel');
        const btcValue = (data.value / 100000000).toFixed(8);

        document.getElementById('tx-id').textContent = data.txid || 'Unknown';
        document.getElementById('tx-value').textContent = `${btcValue} BTC`;
        document.getElementById('tx-fee').textContent = `${data.feeRate || '--'} sat/vB`;
        document.getElementById('tx-size').textContent = `${data.vsize || '--'} vB`;

        panel.classList.remove('hidden');

        // Close button
        document.getElementById('tx-panel-close').onclick = () => {
            panel.classList.add('hidden');
        };
    }

    addTransaction(txData) {
        // Limit active transactions
        if (this.transactions.length >= this.maxTransactions) {
            this.cleanupOldest();
        }

        const tx = new Transaction(txData, this.sceneManager);
        this.transactions.push(tx);

        // Trigger effects for large transactions
        const btcValue = txData.value / 100000000;
        if (btcValue >= THRESHOLDS.LARGE) {
            this.effects.onWhaleTransaction(btcValue >= THRESHOLDS.WHALE);
        }

        return tx;
    }

    cleanupOldest() {
        const oldest = this.transactions.shift();
        if (oldest) {
            oldest.dispose();
        }
    }

    update(delta) {
        // Update all transactions
        for (let i = this.transactions.length - 1; i >= 0; i--) {
            const tx = this.transactions[i];
            tx.update(delta);

            // Remove inactive transactions
            if (!tx.active) {
                tx.dispose();
                this.transactions.splice(i, 1);
            }
        }
    }

    // Get count by type for stats
    getStats() {
        const stats = {
            lightCycles: 0,
            armoredTransports: 0,
            recognizers: 0,
            total: this.transactions.length
        };

        this.transactions.forEach(tx => {
            if (tx.type === 'lightCycle') stats.lightCycles++;
            else if (tx.type === 'armoredTransport') stats.armoredTransports++;
            else stats.recognizers++;
        });

        return stats;
    }
}
