/**
 * SATOSHIS GRID - Audio Manager
 * Web Audio API sound system with procedural audio generation
 */

export class AudioManager {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.isInitialized = false;
        this.isMuted = false;

        // Drone oscillator (ambient)
        this.droneOscillator = null;
        this.droneGain = null;

        // Sound buffers (for loaded audio files)
        this.buffers = {};

        this.setupMuteButton();
    }

    async init() {
        try {
            // Create audio context (requires user interaction)
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // Master gain
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = 0.5;
            this.masterGain.connect(this.audioContext.destination);

            // Start ambient drone
            this.startDrone();

            this.isInitialized = true;
            console.log('🔊 Audio initialized');

        } catch (error) {
            console.error('❌ Audio initialization failed:', error);
        }
    }

    setupMuteButton() {
        const muteBtn = document.getElementById('audio-toggle');
        if (muteBtn) {
            muteBtn.addEventListener('click', () => {
                this.toggleMute();
            });
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;

        if (this.masterGain) {
            this.masterGain.gain.setTargetAtTime(
                this.isMuted ? 0 : 0.5,
                this.audioContext.currentTime,
                0.1
            );
        }

        // Update button
        const muteBtn = document.getElementById('audio-toggle');
        if (muteBtn) {
            muteBtn.classList.toggle('muted', this.isMuted);
            muteBtn.querySelector('.audio-icon').textContent = this.isMuted ? '🔇' : '🔊';
        }
    }

    // Ambient drone - low synth pad
    startDrone() {
        if (!this.audioContext) return;

        // Create multiple oscillators for rich drone sound
        const frequencies = [55, 110, 165]; // A1, A2, E3 (power chord)

        this.droneGain = this.audioContext.createGain();
        this.droneGain.gain.value = 0.1;
        this.droneGain.connect(this.masterGain);

        // Low-pass filter for warmth
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;
        filter.Q.value = 1;
        filter.connect(this.droneGain);

        this.droneOscillators = frequencies.map((freq, i) => {
            const osc = this.audioContext.createOscillator();
            osc.type = i === 0 ? 'sawtooth' : 'sine';
            osc.frequency.value = freq;

            const oscGain = this.audioContext.createGain();
            oscGain.gain.value = i === 0 ? 0.3 : 0.2;

            osc.connect(oscGain);
            oscGain.connect(filter);
            osc.start();

            return osc;
        });

        // Subtle LFO for movement
        this.lfo = this.audioContext.createOscillator();
        this.lfo.type = 'sine';
        this.lfo.frequency.value = 0.1;

        const lfoGain = this.audioContext.createGain();
        lfoGain.gain.value = 50;

        this.lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        this.lfo.start();
    }

    // Transaction pass sound - high-frequency whoosh
    playTransactionSound() {
        if (!this.audioContext || this.isMuted) return;

        const now = this.audioContext.currentTime;

        // High-pitched sweep
        const osc = this.audioContext.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(2000, now);
        osc.frequency.exponentialRampToValueAtTime(500, now + 0.1);

        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        // High-pass for clarity
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 1000;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.2);
    }

    // Whale alert - deep sub-bass "BWAAAH" (Inception horn)
    playWhaleSound(isLarge = false) {
        if (!this.audioContext || this.isMuted) return;

        const now = this.audioContext.currentTime;
        const duration = isLarge ? 2 : 1.5;
        const intensity = isLarge ? 1 : 0.7;

        // Multiple harmonics for brass-like sound
        const fundamentalFreq = isLarge ? 40 : 55;
        const harmonics = [1, 2, 3, 4, 5];

        const masterGain = this.audioContext.createGain();
        masterGain.gain.setValueAtTime(0, now);
        masterGain.gain.linearRampToValueAtTime(0.4 * intensity, now + 0.1);
        masterGain.gain.setValueAtTime(0.4 * intensity, now + duration - 0.5);
        masterGain.gain.linearRampToValueAtTime(0, now + duration);
        masterGain.connect(this.masterGain);

        // Low-pass filter sweep
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(200, now);
        filter.frequency.linearRampToValueAtTime(800, now + 0.3);
        filter.frequency.linearRampToValueAtTime(300, now + duration);
        filter.Q.value = 2;
        filter.connect(masterGain);

        harmonics.forEach((harmonic, i) => {
            const osc = this.audioContext.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.value = fundamentalFreq * harmonic;

            const oscGain = this.audioContext.createGain();
            oscGain.gain.value = 0.3 / (i + 1); // Decrease volume for higher harmonics

            osc.connect(oscGain);
            oscGain.connect(filter);

            osc.start(now);
            osc.stop(now + duration + 0.1);
        });

        // Add sub-bass layer
        const subOsc = this.audioContext.createOscillator();
        subOsc.type = 'sine';
        subOsc.frequency.value = fundamentalFreq / 2;

        const subGain = this.audioContext.createGain();
        subGain.gain.setValueAtTime(0, now);
        subGain.gain.linearRampToValueAtTime(0.5 * intensity, now + 0.2);
        subGain.gain.linearRampToValueAtTime(0, now + duration);

        subOsc.connect(subGain);
        subGain.connect(this.masterGain);

        subOsc.start(now);
        subOsc.stop(now + duration + 0.1);

        console.log('🐋 WHALE ALERT!');
    }

    // Block mined - mechanical clunk + gong
    playBlockSound() {
        if (!this.audioContext || this.isMuted) return;

        const now = this.audioContext.currentTime;

        // Metallic impact (gong-like)
        const frequencies = [220, 277, 330, 440, 554];

        frequencies.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;

            // Slight detune for richness
            osc.detune.value = (Math.random() - 0.5) * 10;

            const gain = this.audioContext.createGain();
            gain.gain.setValueAtTime(0.3 / (i + 1), now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 2);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(now);
            osc.stop(now + 2.5);
        });

        // Impact noise burst
        const bufferSize = this.audioContext.sampleRate * 0.1;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.1));
        }

        const noise = this.audioContext.createBufferSource();
        noise.buffer = buffer;

        const noiseGain = this.audioContext.createGain();
        noiseGain.gain.setValueAtTime(0.3, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        const noiseFilter = this.audioContext.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.value = 500;

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterGain);

        noise.start(now);

        console.log('🔶 BLOCK MINED! Sound played.');
    }

    // Screen shake sound (subtle rumble)
    playShakeSound() {
        if (!this.audioContext || this.isMuted) return;

        const now = this.audioContext.currentTime;

        // Low rumble
        const osc = this.audioContext.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(30, now);
        osc.frequency.exponentialRampToValueAtTime(20, now + 0.5);

        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 100;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.6);
    }

    // Set master volume (0 to 1)
    setVolume(volume) {
        if (this.masterGain) {
            this.masterGain.gain.setTargetAtTime(
                Math.max(0, Math.min(1, volume)),
                this.audioContext.currentTime,
                0.1
            );
        }
    }

    // Cleanup
    dispose() {
        if (this.droneOscillators) {
            this.droneOscillators.forEach(osc => osc.stop());
        }
        if (this.lfo) {
            this.lfo.stop();
        }
        if (this.audioContext) {
            this.audioContext.close();
        }
    }
}
