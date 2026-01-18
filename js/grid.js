/**
 * SATOSHIS GRID - Infinite Grid
 * Static line-based grid - movement suggested by other elements
 */

import * as THREE from 'three';

export class Grid {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.gridGroup = new THREE.Group();

        this.createLineGrid();
        this.createCenterHighway();
        this.createHorizonGlow();

        this.sceneManager.add(this.gridGroup);
    }

    createLineGrid() {
        const gridSize = 600;
        const divisions = 60;
        const step = gridSize / divisions;
        const halfSize = gridSize / 2;
        const highwayWidth = 6;

        const points = [];

        // Horizontal lines (along X axis) - skip center highway area
        for (let i = 0; i <= divisions; i++) {
            const z = -halfSize + i * step;
            // Left side
            points.push(-halfSize, 0, z);
            points.push(-highwayWidth, 0, z);
            // Right side
            points.push(highwayWidth, 0, z);
            points.push(halfSize, 0, z);
        }

        // Vertical lines (along Z axis) - skip center highway area
        for (let i = 0; i <= divisions; i++) {
            const x = -halfSize + i * step;
            if (Math.abs(x) > highwayWidth) {
                points.push(x, 0, -halfSize);
                points.push(x, 0, halfSize);
            }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));

        const material = new THREE.LineBasicMaterial({
            color: 0x004444,
            transparent: false
        });

        const grid = new THREE.LineSegments(geometry, material);
        grid.position.y = -0.01; // Slightly below highway to prevent z-fighting
        grid.position.z = -200;
        this.gridGroup.add(grid);
    }

    createCenterHighway() {
        // Highway from behind camera (z=+100) to horizon line (z=-450)
        const geometry = new THREE.PlaneGeometry(12, 550);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.12,
            side: THREE.DoubleSide,
            depthWrite: false,
            fog: false
        });

        const highway = new THREE.Mesh(geometry, material);
        highway.rotation.x = -Math.PI / 2;
        highway.position.y = 0.15;
        highway.position.z = -175; // Center: from z=+100 to z=-450
        highway.renderOrder = -1;

        this.gridGroup.add(highway);
    }

    createHorizonGlow() {
        const glowGeometry = new THREE.PlaneGeometry(600, 80);
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
                    alpha *= 0.25;
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
        horizonGlow.position.y = 0.1;
        horizonGlow.position.z = -450;
        horizonGlow.renderOrder = 999;

        this.gridGroup.add(horizonGlow);
    }

    update(delta) {
        // Static grid - no update needed
        // Movement is suggested by bike trail and transactions
    }

    setScrollSpeed(speed) {
        // No-op for static grid
    }

    dispose() {
        if (this.gridGroup) {
            this.sceneManager.remove(this.gridGroup);

            this.gridGroup.traverse((obj) => {
                if (obj.geometry) {
                    try { obj.geometry.dispose(); } catch (_) { /* ignore */ }
                }
                if (obj.material) {
                    if (Array.isArray(obj.material)) {
                        obj.material.forEach((m) => {
                            try { m.dispose(); } catch (_) { /* ignore */ }
                        });
                    } else {
                        try { obj.material.dispose(); } catch (_) { /* ignore */ }
                    }
                }
            });

            this.gridGroup.clear();
            this.gridGroup = null;
        }
    }
}
