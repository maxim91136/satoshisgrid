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

// SHARED GEOMETRIES - Prevents memory leak!
// These are created once and reused by all transactions
const SHARED_GEOMETRIES = {
    // Light Cycle
    lightCycleBody: new THREE.BoxGeometry(0.3, 0.3, 3),
    lightCycleGlow: new THREE.BoxGeometry(0.5, 0.5, 4),
    lightCycleTrail: new THREE.PlaneGeometry(0.2, 8),
    lightCycleHitbox: new THREE.BoxGeometry(3, 3, 8), // Larger invisible hitbox

    // Armored Transport
    transportBody: new THREE.BoxGeometry(1.5, 0.8, 4),
    transportPanel: new THREE.BoxGeometry(0.1, 1, 3),
    transportGlow: new THREE.BoxGeometry(2, 1.2, 5),
    transportTrail: new THREE.PlaneGeometry(0.5, 10),
    transportHitbox: new THREE.BoxGeometry(4, 3, 8), // Larger invisible hitbox

    // Recognizer
    recognizerArm: new THREE.BoxGeometry(2, 1, 8),
    recognizerArmLarge: new THREE.BoxGeometry(3, 1.5, 12),
    recognizerBar: new THREE.BoxGeometry(10, 1, 2),
    recognizerBarLarge: new THREE.BoxGeometry(15, 1.5, 3),
    recognizerCore: new THREE.SphereGeometry(1, 16, 16),
    recognizerCoreLarge: new THREE.SphereGeometry(1.5, 16, 16),
    recognizerGlow: new THREE.BoxGeometry(12, 3, 10),
    recognizerGlowLarge: new THREE.BoxGeometry(18, 4.5, 15),
    recognizerShadow: new THREE.PlaneGeometry(12, 10),
    recognizerShadowLarge: new THREE.PlaneGeometry(18, 15),
    recognizerHitbox: new THREE.BoxGeometry(14, 5, 12), // Larger invisible hitbox
    recognizerHitboxLarge: new THREE.BoxGeometry(20, 6, 16) // Larger invisible hitbox
};

// Invisible material for hitboxes
const HITBOX_MATERIAL = new THREE.MeshBasicMaterial({
    visible: false
});

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

        // Invisible hitbox for easier clicking
        const hitbox = new THREE.Mesh(SHARED_GEOMETRIES.lightCycleHitbox, HITBOX_MATERIAL);
        group.add(hitbox);

        // Main body - SHARED geometry
        const bodyMaterial = new THREE.MeshBasicMaterial({
            color: COLORS.CYAN,
            transparent: true,
            opacity: 0.6
        });
        const body = new THREE.Mesh(SHARED_GEOMETRIES.lightCycleBody, bodyMaterial);
        group.add(body);

        // Glow effect - SHARED geometry
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: COLORS.CYAN,
            transparent: true,
            opacity: 0.3
        });
        const glow = new THREE.Mesh(SHARED_GEOMETRIES.lightCycleGlow, glowMaterial);
        group.add(glow);

        // Trail - SHARED geometry
        this.createTrail(group, COLORS.CYAN, 'lightCycle');

        this.mesh = group;
    }

    createArmoredTransport() {
        // Wider, more substantial vehicle
        const group = new THREE.Group();

        // Invisible hitbox for easier clicking
        const hitbox = new THREE.Mesh(SHARED_GEOMETRIES.transportHitbox, HITBOX_MATERIAL);
        group.add(hitbox);

        // Main body - SHARED geometry
        const bodyMaterial = new THREE.MeshBasicMaterial({
            color: COLORS.CYAN,
            transparent: true,
            opacity: 0.6
        });
        const body = new THREE.Mesh(SHARED_GEOMETRIES.transportBody, bodyMaterial);
        group.add(body);

        // Side panels - SHARED geometry
        const panelMaterial = new THREE.MeshBasicMaterial({
            color: COLORS.WHITE,
            transparent: true,
            opacity: 0.5
        });

        const leftPanel = new THREE.Mesh(SHARED_GEOMETRIES.transportPanel, panelMaterial);
        leftPanel.position.set(-0.8, 0, 0);
        group.add(leftPanel);

        const rightPanel = new THREE.Mesh(SHARED_GEOMETRIES.transportPanel, panelMaterial.clone());
        rightPanel.position.set(0.8, 0, 0);
        group.add(rightPanel);

        // Glow - SHARED geometry
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: COLORS.CYAN,
            transparent: true,
            opacity: 0.2
        });
        const glow = new THREE.Mesh(SHARED_GEOMETRIES.transportGlow, glowMaterial);
        group.add(glow);

        // Trail - SHARED geometry
        this.createTrail(group, COLORS.CYAN, 'transport');

        this.mesh = group;
    }

    createRecognizer(isLarge) {
        // U-shaped flying machine hovering over the grid
        const group = new THREE.Group();
        const scale = isLarge ? 1.5 : 1;
        const color = COLORS.ORANGE;

        // Invisible hitbox for easier clicking
        const hitboxGeo = isLarge ? SHARED_GEOMETRIES.recognizerHitboxLarge : SHARED_GEOMETRIES.recognizerHitbox;
        const hitbox = new THREE.Mesh(hitboxGeo, HITBOX_MATERIAL);
        group.add(hitbox);

        // Select appropriate shared geometries
        const armGeo = isLarge ? SHARED_GEOMETRIES.recognizerArmLarge : SHARED_GEOMETRIES.recognizerArm;
        const barGeo = isLarge ? SHARED_GEOMETRIES.recognizerBarLarge : SHARED_GEOMETRIES.recognizerBar;
        const coreGeo = isLarge ? SHARED_GEOMETRIES.recognizerCoreLarge : SHARED_GEOMETRIES.recognizerCore;
        const glowGeo = isLarge ? SHARED_GEOMETRIES.recognizerGlowLarge : SHARED_GEOMETRIES.recognizerGlow;
        const shadowGeo = isLarge ? SHARED_GEOMETRIES.recognizerShadowLarge : SHARED_GEOMETRIES.recognizerShadow;

        // Main U-shape body - SHARED geometry
        const armMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.6
        });

        const leftArm = new THREE.Mesh(armGeo, armMaterial);
        leftArm.position.set(-4 * scale, 0, 0);
        group.add(leftArm);

        const rightArm = new THREE.Mesh(armGeo, armMaterial.clone());
        rightArm.position.set(4 * scale, 0, 0);
        group.add(rightArm);

        // Connecting bar - SHARED geometry
        const bar = new THREE.Mesh(barGeo, armMaterial.clone());
        bar.position.set(0, 0, 3 * scale);
        group.add(bar);

        // Central core - SHARED geometry
        const coreMaterial = new THREE.MeshBasicMaterial({
            color: isLarge ? COLORS.RED : color
        });
        const core = new THREE.Mesh(coreGeo, coreMaterial);
        core.position.set(0, -0.5 * scale, 2 * scale);
        group.add(core);

        // Glow effect - SHARED geometry
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.15
        });
        const glow = new THREE.Mesh(glowGeo, glowMaterial);
        group.add(glow);

        // Shadow on grid - SHARED geometry
        const shadowMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });
        const shadow = new THREE.Mesh(shadowGeo, shadowMaterial);
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.y = -this.getYPosition() + 0.1;
        group.add(shadow);

        this.mesh = group;
        this.speed = this.speed * 0.85; // Recognizers slightly slower but reach camera
    }

    createTrail(group, color, type) {
        // Use shared geometry based on type
        let trailGeo;
        let trailZ;
        switch (type) {
            case 'lightCycle':
                trailGeo = SHARED_GEOMETRIES.lightCycleTrail;
                trailZ = 8 / 2 + 1; // length/2 + 1
                break;
            case 'transport':
                trailGeo = SHARED_GEOMETRIES.transportTrail;
                trailZ = 10 / 2 + 1;
                break;
            default:
                trailGeo = SHARED_GEOMETRIES.lightCycleTrail;
                trailZ = 8 / 2 + 1;
        }

        const trailMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide
        });
        const trail = new THREE.Mesh(trailGeo, trailMaterial);
        trail.rotation.x = -Math.PI / 2;
        trail.position.y = -0.2;
        trail.position.z = trailZ;
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
                // DON'T dispose geometries - they are shared!
                // Only dispose materials
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
            this.mesh = null;
        }
    }
}

export class TransactionManager {
    constructor(sceneManager, lightCycle, effects) {
        this.sceneManager = sceneManager;
        this.lightCycle = lightCycle;
        this.effects = effects;
        this.transactions = [];
        this.maxTransactions = 50; // Reduced for memory stability

        // For click detection
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this._windowClickHandler = null;
        this._closeClickHandler = null;
        this._closeBtn = null;
        this._panel = null;

        this.setupClickHandler();
    }

    setupClickHandler() {
        // Setup close button handler once
        this._closeBtn = document.getElementById('tx-panel-close');
        this._panel = document.getElementById('tx-panel');
        if (this._closeBtn && this._panel) {
            this._closeClickHandler = (event) => {
                event.stopPropagation(); // Prevent raycast interference
                this._panel.classList.add('hidden');
            };
            this._closeBtn.addEventListener('click', this._closeClickHandler);
        }

        // Raycast click handler - ignore UI elements
        this._windowClickHandler = (event) => {
            // Ignore clicks on UI elements
            if (event.target.closest('.tx-panel') ||
                event.target.closest('.hud') ||
                event.target.closest('.side-menu') ||
                event.target.closest('button')) {
                return;
            }

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
        };
        window.addEventListener('click', this._windowClickHandler);
    }

    showTransactionInfo(data) {
        const panel = document.getElementById('tx-panel');
        const btcValue = (data.value / 100000000).toFixed(8);

        const txIdElement = document.getElementById('tx-id');
        const txid = data.txid || 'Unknown';

        // Make TXID a clickable link to mempool.space
        txIdElement.textContent = txid;
        if (txid !== 'Unknown') {
            txIdElement.href = `https://mempool.space/tx/${txid}`;
        } else {
            txIdElement.href = '#';
        }

        document.getElementById('tx-value').textContent = `${btcValue} BTC`;
        document.getElementById('tx-fee').textContent = `${data.feeRate || '--'} sat/vB`;
        document.getElementById('tx-size').textContent = `${data.vsize || '--'} vB`;

        panel.classList.remove('hidden');
        // Close button handler is set up once in setupClickHandler()
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

    dispose() {
        if (this._windowClickHandler) {
            window.removeEventListener('click', this._windowClickHandler);
            this._windowClickHandler = null;
        }

        if (this._closeBtn && this._closeClickHandler) {
            this._closeBtn.removeEventListener('click', this._closeClickHandler);
        }
        this._closeClickHandler = null;
        this._closeBtn = null;
        this._panel = null;

        for (const tx of this.transactions) {
            tx.dispose();
        }
        this.transactions = [];
    }
}
