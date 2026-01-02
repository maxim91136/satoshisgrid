/**
 * SATOSHIS GRID - Infinite Grid
 * Scrolling neon grid floor with Tron aesthetic
 */

import * as THREE from 'three';

export class Grid {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.gridGroup = new THREE.Group();
        this.scrollSpeed = 15; // Units per second
        this.gridSize = 200;
        this.gridDivisions = 40;
        this.gridOffset = 0;

        this.createGrid();
        this.createHorizonGlow();

        this.sceneManager.add(this.gridGroup);
    }

    createGrid() {
        // Create two grids for seamless scrolling
        this.grids = [];

        for (let i = 0; i < 2; i++) {
            const grid = this.createSingleGrid();
            grid.position.z = -i * this.gridSize;
            this.gridGroup.add(grid);
            this.grids.push(grid);
        }
    }

    createSingleGrid() {
        const group = new THREE.Group();

        // Main grid lines
        const gridHelper = new THREE.GridHelper(
            this.gridSize,
            this.gridDivisions,
            0x00ffff,  // Center line color
            0x004444   // Grid line color
        );
        gridHelper.rotation.x = 0;
        gridHelper.position.y = 0;
        group.add(gridHelper);

        // Add glowing center line (the "highway") - wider for more presence
        const centerLineGeometry = new THREE.PlaneGeometry(8, this.gridSize);
        const centerLineMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.2,
            side: THREE.DoubleSide
        });
        const centerLine = new THREE.Mesh(centerLineGeometry, centerLineMaterial);
        centerLine.rotation.x = -Math.PI / 2;
        centerLine.position.y = 0.03;
        group.add(centerLine);

        // Side boundary lines
        const boundaryMaterial = new THREE.LineBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.5
        });

        const leftBoundary = this.createBoundaryLine(-this.gridSize / 2, this.gridSize, boundaryMaterial);
        const rightBoundary = this.createBoundaryLine(this.gridSize / 2, this.gridSize, boundaryMaterial);

        group.add(leftBoundary);
        group.add(rightBoundary);

        return group;
    }

    createBoundaryLine(xPos, length, material) {
        const points = [
            new THREE.Vector3(xPos, 0.1, length / 2),
            new THREE.Vector3(xPos, 0.1, -length / 2)
        ];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        return new THREE.Line(geometry, material);
    }

    createHorizonGlow() {
        // Create a subtle glow at the horizon
        const glowGeometry = new THREE.PlaneGeometry(this.gridSize * 2, 50);
        const glowMaterial = new THREE.ShaderMaterial({
            uniforms: {
                color: { value: new THREE.Color(0x00ffff) }
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
                    float alpha = smoothstep(0.0, 0.5, vUv.y) * (1.0 - smoothstep(0.5, 1.0, vUv.y));
                    alpha *= 0.15;
                    gl_FragColor = vec4(color, alpha);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide,
            depthTest: false,
            depthWrite: false
        });

        const horizonGlow = new THREE.Mesh(glowGeometry, glowMaterial);
        horizonGlow.rotation.x = -Math.PI / 2;
        horizonGlow.position.y = 0.5;  // Raised higher to prevent z-fighting
        horizonGlow.position.z = -this.gridSize;
        horizonGlow.renderOrder = 999;  // Render last

        this.gridGroup.add(horizonGlow);
    }

    update(delta) {
        // Scroll the grids toward the camera
        this.gridOffset += this.scrollSpeed * delta;

        this.grids.forEach((grid, index) => {
            grid.position.z = -index * this.gridSize + (this.gridOffset % this.gridSize);

            // Reset grid position when it passes the camera
            if (grid.position.z > this.gridSize / 2) {
                grid.position.z -= this.gridSize * 2;
            }
        });
    }

    // Adjust scroll speed (e.g., based on mempool activity)
    setScrollSpeed(speed) {
        this.scrollSpeed = speed;
    }
}
