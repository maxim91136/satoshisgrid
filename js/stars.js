/**
 * SATOSHIS GRID - Stars
 * Background stars at the horizon
 */

import * as THREE from 'three';

export class Stars {
    constructor(sceneManager) {
        this.scene = sceneManager.scene;
        this.points = null;
    }

    init() {
        const starCount = 60;
        const positions = new Float32Array(starCount * 3);
        const sizes = new Float32Array(starCount);

        for (let i = 0; i < starCount; i++) {
            // Spread stars across the visible sky
            const angle = (Math.random() - 0.5) * Math.PI * 1.2;
            const height = 60 + Math.random() * 80;
            const distance = 200 + Math.random() * 150;

            positions[i * 3] = Math.sin(angle) * distance;
            positions[i * 3 + 1] = height;
            positions[i * 3 + 2] = -Math.cos(angle) * distance - 80;

            // Vary star sizes - some bright, most dim
            sizes[i] = Math.random() < 0.15 ? 4.0 : 1.5 + Math.random() * 1.5;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        // Custom shader for twinkling stars
        const material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
            },
            vertexShader: `
                attribute float size;
                uniform float uTime;
                varying float vBrightness;

                void main() {
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

                    // Twinkle based on position and time
                    float twinkle = sin(uTime * 2.0 + position.x * 0.1) * 0.3 + 0.7;
                    vBrightness = twinkle;

                    gl_PointSize = size * twinkle;
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying float vBrightness;

                void main() {
                    // Circular star with soft edges
                    float dist = length(gl_PointCoord - vec2(0.5));
                    if (dist > 0.5) discard;

                    float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
                    gl_FragColor = vec4(1.0, 1.0, 1.0, alpha * vBrightness);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            fog: false,
        });

        this.points = new THREE.Points(geometry, material);
        this.material = material;
        this.points.renderOrder = -20;
        this.scene.add(this.points);
    }

    update(delta) {
        if (this.material) {
            this.material.uniforms.uTime.value += delta;
        }
    }

    dispose() {
        if (this.points) {
            this.scene.remove(this.points);
            this.points.geometry.dispose();
            this.points.material.dispose();
            this.points = null;
        }
    }
}
