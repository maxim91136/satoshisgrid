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

        // Soundtrack playback (buffer source or media element fallback)
        this.soundtrackBuffer = null;
        this.soundtrackSource = null;
        this.soundtrackGain = null;
        this.soundtrackElement = null;
        this.soundtrackElementSource = null;

        // Crossfade loop system
        this.crossfadeDuration = 4; // seconds
        this.soundtrackSourceA = null;
        this.soundtrackSourceB = null;
        this.soundtrackGainA = null;
        this.soundtrackGainB = null;
        this.currentSource = 'A';
        this.loopScheduled = false;
        this.loopTimeout = null;

        this._muteBtn = null;
        this._muteClickHandler = null;

        this.setupMuteButton();
    }

    async init() {
        try {
            // Create audio context (requires user interaction)
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // iOS Safari can create contexts in suspended state
            if (this.audioContext.state === 'suspended') {
                try {
                    await this.audioContext.resume();
                } catch (_) {
                    // Will try again on next user gesture
                }
            }

            // Master gain
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = 0.5;
            this.masterGain.connect(this.audioContext.destination);

            // Start ambient drone
            this.startDrone();

            // Try to load external soundtrack (falls back to procedural drone)
            this.loadSoundtrack();

            this.isInitialized = true;
            console.log('🔊 Audio initialized');

        } catch (error) {
            console.error('❌ Audio initialization failed:', error);
        }
    }

    setupMuteButton() {
        this._muteBtn = document.getElementById('audio-toggle');
        if (this._muteBtn) {
            this._muteClickHandler = () => {
                this.toggleMute();
            };
            this._muteBtn.addEventListener('click', this._muteClickHandler);
        }
    }

    // Alias for keyboard shortcut
    toggle() {
        this.toggleMute();
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

    // Tron-Style Ambient Drone - Deep cinematic synth pad
    startDrone() {
        if (!this.audioContext) return;

        // Drone Gain mit Fade-in
        this.droneGain = this.audioContext.createGain();
        this.droneGain.gain.setValueAtTime(0, this.audioContext.currentTime);
        this.droneGain.gain.linearRampToValueAtTime(0.12, this.audioContext.currentTime + 3);
        this.droneGain.connect(this.masterGain);

        // Stereo Panner für Bewegung
        const panner = this.audioContext.createStereoPanner();
        panner.connect(this.droneGain);

        // Haupt-Filter mit Sweep
        this.droneFilter = this.audioContext.createBiquadFilter();
        this.droneFilter.type = 'lowpass';
        this.droneFilter.frequency.value = 300;
        this.droneFilter.Q.value = 2;
        this.droneFilter.connect(panner);

        // Delay für Tiefe
        const delay = this.audioContext.createDelay(1);
        delay.delayTime.value = 0.3;
        const delayGain = this.audioContext.createGain();
        delayGain.gain.value = 0.15;
        delay.connect(delayGain);
        delayGain.connect(this.droneFilter);

        // Sub-Bass Layer (30Hz) - der tiefe Druck
        const subOsc = this.audioContext.createOscillator();
        subOsc.type = 'sine';
        subOsc.frequency.value = 30;
        const subGain = this.audioContext.createGain();
        subGain.gain.value = 0.35;
        subOsc.connect(subGain);
        subGain.connect(this.droneFilter);
        subOsc.start();

        // Tron-Style Pad Frequencies (Moll-Akkord für düstere Atmosphäre)
        const frequencies = [55, 82.4, 110, 164.8]; // A1, E2, A2, E3

        this.droneOscillators = frequencies.map((freq, i) => {
            const osc = this.audioContext.createOscillator();
            osc.type = i < 2 ? 'sawtooth' : 'triangle';
            osc.frequency.value = freq;
            // Leichtes Detune für Fuller Sound
            osc.detune.value = (Math.random() - 0.5) * 8;

            const oscGain = this.audioContext.createGain();
            oscGain.gain.value = 0.12 / (i + 1);

            osc.connect(oscGain);
            oscGain.connect(this.droneFilter);
            oscGain.connect(delay); // Auch zum Delay
            osc.start();

            return osc;
        });

        // Füge Sub-Oszillator zur Liste hinzu
        this.droneOscillators.push(subOsc);

        // LFO für Filter-Sweep (atmosphärische Bewegung)
        this.lfo = this.audioContext.createOscillator();
        this.lfo.type = 'sine';
        this.lfo.frequency.value = 0.05; // Sehr langsam
        const lfoFilterGain = this.audioContext.createGain();
        lfoFilterGain.gain.value = 120;
        this.lfo.connect(lfoFilterGain);
        lfoFilterGain.connect(this.droneFilter.frequency);
        this.lfo.start();

        // LFO für Stereo-Panning (Raumbewegung)
        this.panLfo = this.audioContext.createOscillator();
        this.panLfo.type = 'sine';
        this.panLfo.frequency.value = 0.07;
        const panLfoGain = this.audioContext.createGain();
        panLfoGain.gain.value = 0.25;
        this.panLfo.connect(panLfoGain);
        panLfoGain.connect(panner.pan);
        this.panLfo.start();

        console.log('🎵 Tron-Style Drone started');
    }

    // Versuche Soundtrack zu laden (falls vorhanden)
    async loadSoundtrack() {
        try {
            const response = await fetch('/audio/chilled.mp3');
            if (!response.ok) return false;

            const arrayBuffer = await response.arrayBuffer();
            try {
                this.soundtrackBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                console.log('🎵 Soundtrack loaded');
                this.playSoundtrack();
                return true;
            } catch (decodeError) {
                // Some iOS versions/devices can fail decoding certain MP3 encodings
                console.warn('⚠️ Soundtrack decode failed, falling back to HTMLAudioElement:', decodeError);
                return await this.playSoundtrackViaElement();
            }
        } catch (e) {
            console.log('ℹ️ No soundtrack found, using procedural drone');
            return false;
        }
    }

    // Soundtrack abspielen mit Crossfade-Loop
    playSoundtrack() {
        if (!this.soundtrackBuffer || !this.audioContext) return;

        // Stop any previous soundtrack
        this.stopSoundtrack();

        // Start first source with fade-in
        this.playSoundtrackSource('A', true);

        // Schedule crossfade loop
        this.scheduleNextLoop();

        console.log('🎵 Soundtrack playing with crossfade loop');
    }

    // Play a soundtrack source (A or B)
    playSoundtrackSource(which, fadeIn = false) {
        if (!this.soundtrackBuffer || !this.audioContext) return;

        const source = this.audioContext.createBufferSource();
        source.buffer = this.soundtrackBuffer;

        const gain = this.audioContext.createGain();
        const now = this.audioContext.currentTime;

        if (fadeIn) {
            // Initial fade-in
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.4, now + 3);
        } else {
            // Crossfade in
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.4, now + this.crossfadeDuration);
        }

        source.connect(gain);
        gain.connect(this.masterGain);
        source.start();

        if (which === 'A') {
            this.soundtrackSourceA = source;
            this.soundtrackGainA = gain;
        } else {
            this.soundtrackSourceB = source;
            this.soundtrackGainB = gain;
        }

        this.currentSource = which;
    }

    // Schedule the next crossfade loop
    scheduleNextLoop() {
        if (!this.soundtrackBuffer) return;

        const trackDuration = this.soundtrackBuffer.duration;
        const crossfadeStart = (trackDuration - this.crossfadeDuration) * 1000; // ms

        // Clear any existing timeout
        if (this.loopTimeout) {
            clearTimeout(this.loopTimeout);
        }

        // Schedule crossfade before track ends
        this.loopTimeout = setTimeout(() => {
            this.performCrossfade();
        }, crossfadeStart);
    }

    // Perform the crossfade between sources
    performCrossfade() {
        if (!this.audioContext || !this.soundtrackBuffer) return;

        const now = this.audioContext.currentTime;
        const nextSource = this.currentSource === 'A' ? 'B' : 'A';

        // Fade out current source
        const currentGain = this.currentSource === 'A' ? this.soundtrackGainA : this.soundtrackGainB;
        if (currentGain) {
            currentGain.gain.setValueAtTime(currentGain.gain.value, now);
            currentGain.gain.linearRampToValueAtTime(0, now + this.crossfadeDuration);
        }

        // Stop old source after fade completes
        const oldSource = this.currentSource === 'A' ? this.soundtrackSourceA : this.soundtrackSourceB;
        setTimeout(() => {
            if (oldSource) {
                try { oldSource.stop(); } catch (_) { /* ignore */ }
            }
        }, this.crossfadeDuration * 1000 + 100);

        // Start new source with crossfade in
        this.playSoundtrackSource(nextSource, false);

        // Schedule next loop
        this.scheduleNextLoop();
    }

    // Stop all soundtrack playback
    stopSoundtrack() {
        if (this.loopTimeout) {
            clearTimeout(this.loopTimeout);
            this.loopTimeout = null;
        }
        if (this.soundtrackSourceA) {
            try { this.soundtrackSourceA.stop(); } catch (_) { /* ignore */ }
            this.soundtrackSourceA = null;
        }
        if (this.soundtrackSourceB) {
            try { this.soundtrackSourceB.stop(); } catch (_) { /* ignore */ }
            this.soundtrackSourceB = null;
        }
        if (this.soundtrackSource) {
            try { this.soundtrackSource.stop(); } catch (_) { /* ignore */ }
            this.soundtrackSource = null;
        }
        if (this.soundtrackElement) {
            try { this.soundtrackElement.pause(); } catch (_) { /* ignore */ }
            this.soundtrackElement = null;
            this.soundtrackElementSource = null;
        }
    }

    // Fallback soundtrack playback via <audio> element (more compatible on some iOS setups)
    async playSoundtrackViaElement() {
        try {
            if (!this.audioContext || !this.masterGain) return false;

            // Stop any previous soundtrack
            if (this.soundtrackSource) {
                try { this.soundtrackSource.stop(); } catch (_) { /* ignore */ }
                this.soundtrackSource = null;
            }
            if (this.soundtrackElement) {
                try { this.soundtrackElement.pause(); } catch (_) { /* ignore */ }
                this.soundtrackElement = null;
                this.soundtrackElementSource = null;
            }

            const el = new Audio('/audio/chilled.mp3');
            el.loop = true;
            el.preload = 'auto';
            el.crossOrigin = 'anonymous';
            this.soundtrackElement = el;

            // Route through WebAudio so mute/master gain still works
            try {
                this.soundtrackElementSource = this.audioContext.createMediaElementSource(el);
                this.soundtrackGain = this.audioContext.createGain();
                this.soundtrackGain.gain.setValueAtTime(0, this.audioContext.currentTime);
                this.soundtrackGain.gain.linearRampToValueAtTime(0.4, this.audioContext.currentTime + 3);
                this.soundtrackElementSource.connect(this.soundtrackGain);
                this.soundtrackGain.connect(this.masterGain);
            } catch (routingError) {
                // If routing fails, still attempt direct element playback
                console.warn('⚠️ Could not route soundtrack element through AudioContext:', routingError);
            }

            // Ensure context is running (must be from a user gesture on iOS)
            if (this.audioContext.state === 'suspended') {
                try { await this.audioContext.resume(); } catch (_) { /* ignore */ }
            }

            await el.play();
            console.log('🎵 Soundtrack playing (HTMLAudioElement fallback)');
            return true;
        } catch (playError) {
            console.warn('❌ Soundtrack element playback failed:', playError);
            return false;
        }
    }

    // Transaction pass sound - digital whoosh with stereo movement
    playTransactionSound() {
        if (!this.audioContext || this.isMuted) return;

        const now = this.audioContext.currentTime;

        // Stereo panner for movement (left to right)
        const panner = this.audioContext.createStereoPanner();
        panner.pan.setValueAtTime(-0.5, now);
        panner.pan.linearRampToValueAtTime(0.5, now + 0.12);
        panner.connect(this.masterGain);

        // High-pitched digital sweep
        const osc = this.audioContext.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(3000, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.08);

        // Second oscillator for thickness
        const osc2 = this.audioContext.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(2500, now);
        osc2.frequency.exponentialRampToValueAtTime(600, now + 0.1);

        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        // High-pass for clarity
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 800;
        filter.Q.value = 1;

        osc.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(panner);

        osc.start(now);
        osc2.start(now);
        osc.stop(now + 0.15);
        osc2.stop(now + 0.15);
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

    // Block mined - cinematic impact with reverb
    playBlockSound() {
        if (!this.audioContext || this.isMuted) return;

        const now = this.audioContext.currentTime;

        // Create delay for reverb-like effect
        const delay = this.audioContext.createDelay(1);
        delay.delayTime.value = 0.15;
        const delayGain = this.audioContext.createGain();
        delayGain.gain.value = 0.3;
        delay.connect(delayGain);
        delayGain.connect(this.masterGain);

        // Second delay tap
        const delay2 = this.audioContext.createDelay(1);
        delay2.delayTime.value = 0.35;
        const delay2Gain = this.audioContext.createGain();
        delay2Gain.gain.value = 0.15;
        delay2.connect(delay2Gain);
        delay2Gain.connect(this.masterGain);

        // Deep sub impact (cinema style)
        const subOsc = this.audioContext.createOscillator();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(60, now);
        subOsc.frequency.exponentialRampToValueAtTime(30, now + 0.5);

        const subGain = this.audioContext.createGain();
        subGain.gain.setValueAtTime(0.4, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 1);

        subOsc.connect(subGain);
        subGain.connect(this.masterGain);
        subOsc.start(now);
        subOsc.stop(now + 1.2);

        // Metallic impact (gong-like)
        const frequencies = [220, 277, 330, 440, 554];

        frequencies.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;

            // Slight detune for richness
            osc.detune.value = (Math.random() - 0.5) * 10;

            const gain = this.audioContext.createGain();
            gain.gain.setValueAtTime(0.25 / (i + 1), now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);

            osc.connect(gain);
            gain.connect(this.masterGain);
            gain.connect(delay);
            gain.connect(delay2);

            osc.start(now);
            osc.stop(now + 3);
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
        noiseGain.gain.setValueAtTime(0.25, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        const noiseFilter = this.audioContext.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.value = 400;

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
        if (this._muteBtn && this._muteClickHandler) {
            this._muteBtn.removeEventListener('click', this._muteClickHandler);
        }
        this._muteBtn = null;
        this._muteClickHandler = null;

        if (this.droneOscillators) {
            this.droneOscillators.forEach(osc => {
                try { osc.stop(); } catch (_) { /* ignore */ }
            });
        }
        if (this.lfo) {
            try { this.lfo.stop(); } catch (_) { /* ignore */ }
        }
        if (this.panLfo) {
            try { this.panLfo.stop(); } catch (_) { /* ignore */ }
        }
        if (this.soundtrackSource) {
            try { this.soundtrackSource.stop(); } catch (_) { /* ignore */ }
        }

        // Stop crossfade loop
        this.stopSoundtrack();

        if (this.soundtrackGain) {
            try { this.soundtrackGain.disconnect(); } catch (_) { /* ignore */ }
            this.soundtrackGain = null;
        }
        if (this.soundtrackGainA) {
            try { this.soundtrackGainA.disconnect(); } catch (_) { /* ignore */ }
            this.soundtrackGainA = null;
        }
        if (this.soundtrackGainB) {
            try { this.soundtrackGainB.disconnect(); } catch (_) { /* ignore */ }
            this.soundtrackGainB = null;
        }

        if (this.audioContext) {
            try { this.audioContext.close(); } catch (_) { /* ignore */ }
        }
    }
}
