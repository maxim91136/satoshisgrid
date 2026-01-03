/**
 * SATOSHIS GRID - Aurora Borealis Effect
 * Cyberpunk-style aurora lights at the horizon
 */

import * as THREE from 'three';

export class Aurora {
    constructor(sceneManager) {
        this.scene = sceneManager.scene;
        this.mesh = null;
        this.material = null;
        this.time = 0;
    }

    init() {
        this.createAurora();
    }

    createAurora() {
        // Vertex Shader - animates the arc shape
        const vertexShader = `
            uniform float uTime;
            varying vec2 vUv;

            void main() {
                vUv = uv;

                // Animate the height based on position and time
                vec3 pos = position;

                // Wave the arc up and down at different points
                float wave1 = sin(uv.x * 6.28 + uTime * 0.3) * 8.0;
                float wave2 = sin(uv.x * 3.14 - uTime * 0.2) * 12.0;
                float wave3 = cos(uv.x * 9.42 + uTime * 0.4) * 5.0;

                // Only affect upper parts of the aurora
                float heightFactor = smoothstep(0.3, 1.0, uv.y);
                pos.y += (wave1 + wave2 + wave3) * heightFactor;

                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        `;

        // Fragment Shader - colors and glow
        const fragmentShader = `
            uniform float uTime;
            uniform vec3 uColorA;
            uniform vec3 uColorB;
            uniform vec3 uColorC;

            varying vec2 vUv;

            float hash(float n) { return fract(sin(n) * 43758.5453); }

            float noise(float x) {
                float i = floor(x);
                float f = fract(x);
                return mix(hash(i), hash(i + 1.0), smoothstep(0.0, 1.0, f));
            }

            void main() {
                vec2 uv = vUv;

                // Vertical curtain rays
                float rays = 0.0;
                for(float i = 1.0; i <= 4.0; i++) {
                    float freq = i * 4.0;
                    float phase = uTime * (0.1 + i * 0.05);
                    float ray = sin(uv.x * freq + phase);
                    ray = pow(abs(ray), 2.0);
                    rays += ray * (0.3 / i);
                }

                // Vertical gradient - fade at top and bottom
                float vertGrad = smoothstep(0.0, 0.4, uv.y) * smoothstep(1.0, 0.6, uv.y);

                // Horizontal fade at edges
                float horzFade = smoothstep(0.0, 0.15, uv.x) * smoothstep(1.0, 0.85, uv.x);

                // Moving brightness zones
                float zone = sin(uv.x * 3.0 + uTime * 0.15) * 0.3 + 0.7;

                // Color mixing
                float colorMix = sin(uv.x * 2.5 + uTime * 0.1) * 0.5 + 0.5;
                vec3 color = mix(uColorA, uColorB, colorMix);
                color = mix(color, uColorC, sin(uv.x * 4.0 - uTime * 0.08) * 0.3 + 0.3);

                // Combine
                float intensity = rays * vertGrad * horzFade * zone;

                // Gentler pulse - always visible
                intensity *= sin(uTime * 0.3) * 0.1 + 0.9;

                // Shimmer
                intensity *= noise(uv.x * 20.0 + uTime * 2.0) * 0.15 + 0.85;

                // Output - brighter base
                intensity *= 0.9;
                gl_FragColor = vec4(color * intensity, intensity * 0.95);
            }
        `;

        this.material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uColorA: { value: new THREE.Color(0x00ffff) },  // Cyan
                uColorB: { value: new THREE.Color(0xff00ff) },  // Magenta
                uColorC: { value: new THREE.Color(0x00ff88) },  // Teal
            },
            vertexShader,
            fragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false,
        });

        // Create curved plane
        const segmentsX = 64;
        const segmentsY = 16;
        const geometry = new THREE.PlaneGeometry(1, 1, segmentsX, segmentsY);

        const positions = geometry.attributes.position;
        const uvs = geometry.attributes.uv;

        const radius = 400;
        const arcAngle = Math.PI * 1.0; // 180 degrees
        const height = 80;

        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i); // -0.5 to 0.5
            const y = positions.getY(i); // -0.5 to 0.5

            // Curve around horizon
            const angle = x * arcAngle;
            const newX = Math.sin(angle) * radius;
            const newZ = -Math.cos(angle) * radius - 150;
            const newY = (y + 0.5) * height + 40; // 40 to 120 units up

            positions.setX(i, newX);
            positions.setY(i, newY);
            positions.setZ(i, newZ);

            // UV: x goes 0-1 across arc, y goes 0-1 up
            uvs.setX(i, x + 0.5);
            uvs.setY(i, y + 0.5);
        }

        geometry.computeVertexNormals();

        this.mesh = new THREE.Mesh(geometry, this.material);
        this.mesh.renderOrder = -10;
        this.scene.add(this.mesh);
    }

    update(delta) {
        this.time += delta;
        if (this.material) {
            this.material.uniforms.uTime.value = this.time;
        }
    }

    dispose() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.material.dispose();
            this.mesh = null;
            this.material = null;
        }
    }
}
