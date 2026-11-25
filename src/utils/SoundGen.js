/**
 * موتور صوتی و موزیک پس‌زمینه پویا (Web Audio API)
 * شامل: سنتز آکوستیکی طبیعی گوسفند، سگ، گرگ و عقاب با PeriodicWave و فیلترهای فرمانت
 */

const VOL_STORAGE_KEY = 'island_shepherd_vol_v1';

class SoundManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.sfxGain = null;
        this.musicGain = null;
        this.noiseBuffer = null;

        this.sheepWave = null;
        this.dogWave = null;
        this.wolfWave = null;
        this.barkDriveCurve = null;

        this.sfxMuted = false;
        this.musicMuted = false;
        this.sfxLevel = 4;   // 0..5
        this.musicLevel = 3; // 0..5
        this.loadLevels();

        this.musicMode = 'calm';
        this.musicTimer = null;
        this.musicStep = 0;
        this.nextNoteTime = 0;
    }

    loadLevels() {
        try {
            const raw = localStorage.getItem(VOL_STORAGE_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (typeof parsed.sfxLevel === 'number') this.sfxLevel = Math.max(0, Math.min(5, parsed.sfxLevel));
            if (typeof parsed.musicLevel === 'number') this.musicLevel = Math.max(0, Math.min(5, parsed.musicLevel));
        } catch {
            // ignore
        }
    }

    saveLevels() {
        try {
            localStorage.setItem(
                VOL_STORAGE_KEY,
                JSON.stringify({ sfxLevel: this.sfxLevel, musicLevel: this.musicLevel })
            );
        } catch {
            // ignore
        }
    }

    get muted() {
        return this.sfxMuted && this.musicMuted;
    }

    set muted(val) {
        this.sfxMuted = Boolean(val);
        this.musicMuted = Boolean(val);
        this.applyVolumes();
    }

    getSfxLevel() {
        return this.sfxMuted ? 0 : this.sfxLevel;
    }

    getMusicLevel() {
        return this.musicMuted ? 0 : this.musicLevel;
    }

    setSfxLevel(lvl) {
        const clamped = Math.max(0, Math.min(5, Math.round(lvl)));
        if (clamped > 0) this.sfxLevel = clamped;
        this.sfxMuted = clamped === 0;
        this.saveLevels();
        this.applyVolumes();
    }

    setMusicLevel(lvl) {
        const clamped = Math.max(0, Math.min(5, Math.round(lvl)));
        if (clamped > 0) this.musicLevel = clamped;
        this.musicMuted = clamped === 0;
        this.saveLevels();
        this.applyVolumes();
        if (!this.musicMuted) {
            this.startMusic(this.musicMode);
        }
    }

    setSfxMuted(val) {
        this.sfxMuted = Boolean(val);
        if (!this.sfxMuted && this.sfxLevel === 0) this.sfxLevel = 4;
        this.applyVolumes();
    }

    setMusicMuted(val) {
        this.musicMuted = Boolean(val);
        if (!this.musicMuted && this.musicLevel === 0) this.musicLevel = 3;
        this.applyVolumes();
        if (!this.musicMuted) {
            this.startMusic(this.musicMode);
        }
    }

    ensureContext() {
        try {
            if (!this.ctx) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (!AudioCtx) return null;
                this.ctx = new AudioCtx();

                const compressor = this.ctx.createDynamicsCompressor();
                compressor.threshold.setValueAtTime(-16, this.ctx.currentTime);
                compressor.ratio.setValueAtTime(4, this.ctx.currentTime);

                this.masterGain = this.ctx.createGain();
                this.masterGain.gain.setValueAtTime(0.95, this.ctx.currentTime);

                this.sfxGain = this.ctx.createGain();
                this.musicGain = this.ctx.createGain();

                this.sfxGain.connect(compressor);
                this.musicGain.connect(compressor);
                compressor.connect(this.masterGain);
                this.masterGain.connect(this.ctx.destination);

                this.createNoiseBuffer();
                this.initVocalWaves();
                this.applyVolumes();
            }

            if (this.ctx.state === 'suspended') {
                this.ctx.resume().catch(() => {});
            }
            return this.ctx;
        } catch {
            return null;
        }
    }

    initVocalWaves() {
        try {
            const sReal = new Float32Array(14);
            const sImag = new Float32Array([
                0, 1.0, 0.82, 0.64, 0.52, 0.42, 0.34, 0.25, 0.18, 0.12, 0.08, 0.05, 0.03, 0.015,
            ]);
            this.sheepWave = this.ctx.createPeriodicWave(sReal, sImag);

            const dReal = new Float32Array(12);
            const dImag = new Float32Array([
                0, 1.0, 0.68, 0.72, 0.45, 0.5, 0.28, 0.22, 0.14, 0.09, 0.05, 0.02,
            ]);
            this.dogWave = this.ctx.createPeriodicWave(dReal, dImag);

            const wReal = new Float32Array(8);
            const wImag = new Float32Array([0, 1.0, 0.32, 0.16, 0.06, 0.025, 0.01, 0.005]);
            this.wolfWave = this.ctx.createPeriodicWave(wReal, wImag);

            const n = 512;
            const curve = new Float32Array(n);
            for (let i = 0; i < n; i++) {
                const x = (i * 2) / n - 1;
                curve[i] = Math.tanh(x * 2.4);
            }
            this.barkDriveCurve = curve;
        } catch {
            // fallback
        }
    }

    applyVolumes() {
        if (!this.ctx || !this.sfxGain || !this.musicGain) return;
        const now = this.ctx.currentTime;
        const sfxVol = this.sfxMuted ? 0 : (this.sfxLevel / 5) * 0.95;
        const musVol = this.musicMuted ? 0 : (this.musicLevel / 5) * 0.42;
        this.sfxGain.gain.setTargetAtTime(sfxVol, now, 0.03);
        this.musicGain.gain.setTargetAtTime(musVol, now, 0.08);
    }

    createNoiseBuffer() {
        const sr = this.ctx.sampleRate;
        const buffer = this.ctx.createBuffer(1, sr * 1.5, sr);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        this.noiseBuffer = buffer;
    }

    playPluck(freq, time, duration, volume, targetBus, detune = 0) {
        const ctx = this.ctx;
        if (!ctx) return;

        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'triangle';
        osc1.frequency.setValueAtTime(freq, time);
        osc2.frequency.setValueAtTime(freq * 2, time);
        osc2.detune.setValueAtTime(detune, time);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(freq * 4.2, time);
        filter.frequency.exponentialRampToValueAtTime(Math.max(400, freq * 1.4), time + duration);

        const osc2Gain = ctx.createGain();
        osc2Gain.gain.setValueAtTime(0.22, time);

        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.linearRampToValueAtTime(volume, time + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

        osc1.connect(filter);
        osc2.connect(osc2Gain);
        osc2Gain.connect(filter);
        filter.connect(gain);
        gain.connect(targetBus);

        osc1.start(time);
        osc2.start(time);
        osc1.stop(time + duration + 0.02);
        osc2.stop(time + duration + 0.02);
    }

    playSoftPerc(time, isAccent = false) {
        const ctx = this.ctx;
        if (!ctx || !this.noiseBuffer) return;

        const src = ctx.createBufferSource();
        src.buffer = this.noiseBuffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(isAccent ? 3200 : 4800, time);
        filter.Q.setValueAtTime(2.5, time);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.linearRampToValueAtTime(isAccent ? 0.09 : 0.045, time + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.055);

        src.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);
        src.start(time);
        src.stop(time + 0.065);
    }

    playChordStrum(notes, time, duration, volume) {
        const ctx = this.ctx;
        if (!ctx) return;
        notes.forEach((freq, idx) => {
            const t = time + idx * 0.014;
            const osc = ctx.createOscillator();
            const filter = ctx.createBiquadFilter();
            const g = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, t);
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1650, t);
            filter.frequency.exponentialRampToValueAtTime(520, t + duration);
            g.gain.setValueAtTime(0.0001, t);
            g.gain.linearRampToValueAtTime(volume, t + 0.01);
            g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
            osc.connect(filter);
            filter.connect(g);
            g.connect(this.musicGain);
            osc.start(t);
            osc.stop(t + duration + 0.02);
        });
    }

    playSoftKick(time, volume = 0.22) {
        const ctx = this.ctx;
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(135, time);
        osc.frequency.exponentialRampToValueAtTime(48, time + 0.09);
        g.gain.setValueAtTime(volume, time);
        g.gain.exponentialRampToValueAtTime(0.0001, time + 0.11);
        osc.connect(g);
        g.connect(this.musicGain);
        osc.start(time);
        osc.stop(time + 0.12);
    }

    startMusic(mode = 'calm') {
        this.musicMode = mode;
        const ctx = this.ensureContext();
        if (!ctx) return;
        if (this.musicTimer) return;

        this.nextNoteTime = ctx.currentTime + 0.08;
        this.musicStep = 0;

        this.musicTimer = setInterval(() => {
            if (!this.ctx || this.ctx.state !== 'running') return;
            if (this.nextNoteTime < this.ctx.currentTime - 0.1) {
                this.nextNoteTime = this.ctx.currentTime + 0.05;
            }
            const lookAhead = 0.22;
            while (this.nextNoteTime < this.ctx.currentTime + lookAhead) {
                this.scheduleMusicStep(this.musicStep, this.nextNoteTime);
                const stepDur =
                    this.musicMode === 'intense'
                        ? 0.165
                        : this.musicMode === 'menu'
                            ? 0.23
                            : 0.195;
                this.nextNoteTime += stepDur;
                this.musicStep = (this.musicStep + 1) % 64;
            }
        }, 65);
    }

    setMusicMode(mode) {
        this.musicMode = mode;
        if (!this.musicTimer && !this.musicMuted) {
            this.startMusic(mode);
        }
    }

    stopMusic() {
        if (this.musicTimer) {
            clearInterval(this.musicTimer);
            this.musicTimer = null;
        }
    }

    scheduleMusicStep(step, time) {
        if (this.musicMuted || !this.ctx) return;
        const ctx = this.ctx;

        const calmMelody = [
            523.25, 0, 659.25, 783.99, 880.0, 0, 783.99, 659.25,
            587.33, 0, 659.25, 783.99, 659.25, 0, 523.25, 0,
            659.25, 0, 783.99, 880.0, 1046.5, 0, 880.0, 783.99,
            783.99, 659.25, 587.33, 0, 523.25, 0, 392.0, 0,
            880.0, 0, 783.99, 659.25, 783.99, 0, 1046.5, 0,
            880.0, 783.99, 659.25, 587.33, 659.25, 0, 783.99, 0,
            1046.5, 0, 880.0, 783.99, 880.0, 659.25, 783.99, 0,
            659.25, 587.33, 523.25, 587.33, 523.25, 0, 0, 0,
        ];
        const calmChords = [
            [261.63, 329.63, 392.0],
            [196.0, 246.94, 293.66],
            [220.0, 261.63, 329.63],
            [174.61, 220.0, 261.63],
        ];
        const calmBassRoots = [130.81, 98.0, 110.0, 87.31];

        const intenseMelody = [
            587.33, 0, 698.46, 880.0, 880.0, 0, 783.99, 698.46,
            659.25, 0, 587.33, 523.25, 587.33, 659.25, 698.46, 0,
            880.0, 0, 1046.5, 987.77, 880.0, 0, 783.99, 698.46,
            698.46, 659.25, 587.33, 523.25, 587.33, 0, 440.0, 0,
            1174.66, 0, 1046.5, 880.0, 1046.5, 0, 880.0, 698.46,
            783.99, 0, 880.0, 783.99, 659.25, 0, 587.33, 0,
            880.0, 783.99, 698.46, 659.25, 698.46, 783.99, 880.0, 0,
            698.46, 659.25, 587.33, 523.25, 587.33, 0, 0, 0,
        ];
        const intenseChords = [
            [293.66, 349.23, 440.0],
            [233.08, 293.66, 349.23],
            [261.63, 329.63, 392.0],
            [220.0, 277.18, 329.63],
        ];
        const intenseBassRoots = [146.83, 116.54, 130.81, 110.0];

        const isIntense = this.musicMode === 'intense';
        const isMenu = this.musicMode === 'menu';
        const melody = isIntense ? intenseMelody : calmMelody;
        const barIdx = Math.floor((step % 32) / 8);
        const chord = (isIntense ? intenseChords : calmChords)[barIdx];
        const root = (isIntense ? intenseBassRoots : calmBassRoots)[barIdx];

        const mFreq = melody[step];
        if (mFreq > 0) {
            const vol = isMenu ? 0.14 : isIntense ? 0.2 : 0.18;
            this.playPluck(mFreq, time, isIntense ? 0.28 : 0.38, vol, this.musicGain, 5);
        }

        const beatInBar = step % 8;
        if (beatInBar === 2 || beatInBar === 6) {
            this.playChordStrum(chord, time, 0.22, isMenu ? 0.065 : isIntense ? 0.085 : 0.075);
        }

        if (beatInBar === 0 || beatInBar === 4 || (isIntense && beatInBar === 6)) {
            const bFreq = beatInBar === 4 ? root * 1.5 : root;
            const osc = ctx.createOscillator();
            const f = ctx.createBiquadFilter();
            const g = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(bFreq, time);
            f.type = 'lowpass';
            f.frequency.setValueAtTime(isIntense ? 420 : 320, time);
            g.gain.setValueAtTime(0.0001, time);
            g.gain.linearRampToValueAtTime(isIntense ? 0.24 : 0.19, time + 0.015);
            g.gain.exponentialRampToValueAtTime(0.0001, time + 0.34);
            osc.connect(f);
            f.connect(g);
            g.connect(this.musicGain);
            osc.start(time);
            osc.stop(time + 0.38);
        }

        if (!isMenu) {
            if (beatInBar === 0 || (isIntense && beatInBar === 4)) {
                this.playSoftKick(time, isIntense ? 0.24 : 0.16);
            }
            if (beatInBar === 2 || beatInBar === 6) {
                this.playSoftPerc(time, isIntense);
            } else if (isIntense && beatInBar % 2 === 1) {
                this.playSoftPerc(time, false);
            }
        }
    }

    synthesizeSingleBleat(startTime, opts) {
        const ctx = this.ctx;
        if (!ctx) return;

        const { baseFreq, duration, volume, flutterRate, formantScale, rising = false } = opts;

        const v1 = ctx.createOscillator();
        const v2 = ctx.createOscillator();
        if (this.sheepWave) {
            v1.setPeriodicWave(this.sheepWave);
            v2.setPeriodicWave(this.sheepWave);
        } else {
            v1.type = 'sawtooth';
            v2.type = 'triangle';
        }

        const startPitch = baseFreq * 0.84;
        const peakPitch = baseFreq * (rising ? 1.12 : 1.05);
        const endPitch = baseFreq * (rising ? 0.96 : 0.82);

        [v1, v2].forEach((osc, i) => {
            osc.frequency.setValueAtTime(startPitch, startTime);
            osc.frequency.exponentialRampToValueAtTime(peakPitch, startTime + 0.06);
            osc.frequency.setValueAtTime(peakPitch * 0.98, startTime + duration * 0.55);
            osc.frequency.exponentialRampToValueAtTime(endPitch, startTime + duration);
            if (i === 1) osc.detune.setValueAtTime(9, startTime);
        });

        const flutter = ctx.createOscillator();
        flutter.type = 'sine';
        flutter.frequency.setValueAtTime(flutterRate, startTime);
        flutter.frequency.linearRampToValueAtTime(flutterRate * 0.86, startTime + duration);

        const pitchDepth = ctx.createGain();
        pitchDepth.gain.setValueAtTime(0.0001, startTime);
        pitchDepth.gain.linearRampToValueAtTime(baseFreq * 0.055, startTime + 0.075);
        pitchDepth.gain.linearRampToValueAtTime(baseFreq * 0.03, startTime + duration);
        flutter.connect(pitchDepth);
        pitchDepth.connect(v1.frequency);
        pitchDepth.connect(v2.frequency);

        const mouth = ctx.createBiquadFilter();
        mouth.type = 'lowpass';
        mouth.frequency.setValueAtTime(230, startTime);
        mouth.frequency.exponentialRampToValueAtTime(2800, startTime + 0.052);
        mouth.frequency.setValueAtTime(2400, startTime + duration * 0.65);
        mouth.frequency.exponentialRampToValueAtTime(980, startTime + duration);
        mouth.Q.setValueAtTime(0.75, startTime);

        const v2Mix = ctx.createGain();
        v2Mix.gain.setValueAtTime(0.45, startTime);

        v1.connect(mouth);
        v2.connect(v2Mix);
        v2Mix.connect(mouth);

        if (this.noiseBuffer) {
            const pop = ctx.createBufferSource();
            pop.buffer = this.noiseBuffer;
            const popFilter = ctx.createBiquadFilter();
            popFilter.type = 'bandpass';
            popFilter.frequency.setValueAtTime(650, startTime);
            popFilter.Q.setValueAtTime(1.2, startTime);
            const popG = ctx.createGain();
            popG.gain.setValueAtTime(0.0001, startTime);
            popG.gain.linearRampToValueAtTime(0.14, startTime + 0.012);
            popG.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.042);
            pop.connect(popFilter);
            popFilter.connect(popG);
            popG.connect(mouth);
            pop.start(startTime);
            pop.stop(startTime + 0.05);

            const breath = ctx.createBufferSource();
            breath.buffer = this.noiseBuffer;
            const bFilter = ctx.createBiquadFilter();
            bFilter.type = 'bandpass';
            bFilter.frequency.setValueAtTime(1550 * formantScale, startTime);
            bFilter.Q.setValueAtTime(1.6, startTime);
            const bG = ctx.createGain();
            bG.gain.setValueAtTime(0.032, startTime);
            breath.connect(bFilter);
            bFilter.connect(bG);
            bG.connect(mouth);
            breath.start(startTime);
            breath.stop(startTime + duration + 0.04);
        }

        const tremolo = ctx.createGain();
        tremolo.gain.setValueAtTime(0.72, startTime);
        const ampDepth = ctx.createGain();
        ampDepth.gain.setValueAtTime(0.0001, startTime);
        ampDepth.gain.linearRampToValueAtTime(0.28, startTime + 0.065);
        ampDepth.gain.linearRampToValueAtTime(0.16, startTime + duration);
        flutter.connect(ampDepth);
        ampDepth.connect(tremolo.gain);

        const formants = [
            { f: 710 * formantScale, q: 2.8, g: 1.05 },
            { f: 1560 * formantScale, q: 3.3, g: 0.72 },
            { f: 2580 * formantScale, q: 3.8, g: 0.24 },
        ];

        for (const fm of formants) {
            const bp = ctx.createBiquadFilter();
            bp.type = 'bandpass';
            bp.frequency.setValueAtTime(fm.f * 0.88, startTime);
            bp.frequency.linearRampToValueAtTime(fm.f, startTime + 0.055);
            bp.frequency.linearRampToValueAtTime(fm.f * 0.94, startTime + duration);
            bp.Q.setValueAtTime(fm.q, startTime);

            const fg = ctx.createGain();
            fg.gain.setValueAtTime(fm.g, startTime);
            mouth.connect(bp);
            bp.connect(fg);
            fg.connect(tremolo);
        }

        const warmth = ctx.createBiquadFilter();
        warmth.type = 'lowpass';
        warmth.frequency.setValueAtTime(3100, startTime);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0.0001, startTime);
        env.gain.linearRampToValueAtTime(volume, startTime + 0.032);
        env.gain.setValueAtTime(volume * 0.9, startTime + duration * 0.72);
        env.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        tremolo.connect(warmth);
        warmth.connect(env);
        env.connect(this.sfxGain);

        v1.start(startTime);
        v2.start(startTime);
        flutter.start(startTime);

        const stopAt = startTime + duration + 0.05;
        v1.stop(stopAt);
        v2.stop(stopAt);
        flutter.stop(stopAt);
    }

    playBaa(mood = 'happy') {
        try {
            const ctx = this.ensureContext();
            if (!ctx || this.sfxMuted) return;
            const now = ctx.currentTime;

            if (mood === 'scared') {
                const pitch = 218 + Math.random() * 28;
                this.synthesizeSingleBleat(now, {
                    baseFreq: pitch,
                    duration: 0.27,
                    volume: 0.34,
                    flutterRate: 15.2,
                    formantScale: 1.1,
                    rising: true,
                });
                this.synthesizeSingleBleat(now + 0.3, {
                    baseFreq: pitch * 1.08,
                    duration: 0.35,
                    volume: 0.3,
                    flutterRate: 16.0,
                    formantScale: 1.14,
                    rising: false,
                });
                return;
            }

            if (mood === 'calm') {
                this.synthesizeSingleBleat(now, {
                    baseFreq: 146 + Math.random() * 28,
                    duration: 0.48 + Math.random() * 0.1,
                    volume: 0.21,
                    flutterRate: 13.0 + Math.random() * 1.5,
                    formantScale: 0.95,
                });
                return;
            }

            this.synthesizeSingleBleat(now, {
                baseFreq: 184 + Math.random() * 32,
                duration: 0.36 + Math.random() * 0.07,
                volume: 0.27,
                flutterRate: 14.2 + Math.random() * 1.6,
                formantScale: 1.04,
            });
        } catch {
            // ignore
        }
    }

    synthesizeSingleBark(startTime, style = 'guard', pitchShift = 1.0) {
        const ctx = this.ctx;
        if (!ctx) return;

        const isHerd = style === 'herd';
        const dur = isHerd ? 0.165 : 0.215;
        const vol = isHerd ? 0.28 : 0.36;
        const stopAt = startTime + dur + 0.07;

        const tractInput = ctx.createGain();
        tractInput.gain.setValueAtTime(1.0, startTime);

        const vox = ctx.createOscillator();
        const subGrowl = ctx.createOscillator();
        vox.type = 'sawtooth';
        subGrowl.type = 'sawtooth';

        const fStart = (isHerd ? 275 : 185) * pitchShift;
        const fPeak = (isHerd ? 485 : 340) * pitchShift;
        const fMid = (isHerd ? 410 : 280) * pitchShift;
        const fEnd = (isHerd ? 235 : 155) * pitchShift;

        vox.frequency.setValueAtTime(fStart, startTime);
        vox.frequency.exponentialRampToValueAtTime(fPeak, startTime + 0.032);
        vox.frequency.linearRampToValueAtTime(fMid, startTime + dur * 0.55);
        vox.frequency.exponentialRampToValueAtTime(fEnd, startTime + dur);

        subGrowl.frequency.setValueAtTime(fStart * 0.5, startTime);
        subGrowl.frequency.exponentialRampToValueAtTime(fPeak * 0.5, startTime + 0.032);
        subGrowl.frequency.linearRampToValueAtTime(fMid * 0.5, startTime + dur * 0.55);
        subGrowl.frequency.exponentialRampToValueAtTime(fEnd * 0.5, startTime + dur);

        if (this.noiseBuffer) {
            const jitterSrc = ctx.createBufferSource();
            jitterSrc.buffer = this.noiseBuffer;
            const jitterLP = ctx.createBiquadFilter();
            jitterLP.type = 'lowpass';
            jitterLP.frequency.setValueAtTime(95, startTime);
            const jitterDepth = ctx.createGain();
            jitterDepth.gain.setValueAtTime(isHerd ? 34 : 52, startTime);

            jitterSrc.connect(jitterLP);
            jitterLP.connect(jitterDepth);
            jitterDepth.connect(vox.frequency);
            jitterDepth.connect(subGrowl.frequency);

            const jOffset = Math.random() * 0.6;
            jitterSrc.start(startTime, jOffset, dur + 0.08);
        }

        const subGain = ctx.createGain();
        subGain.gain.setValueAtTime(isHerd ? 0.24 : 0.42, startTime);

        const shaper = ctx.createWaveShaper();
        if (this.barkDriveCurve) shaper.curve = this.barkDriveCurve;

        const voxMix = ctx.createGain();
        voxMix.gain.setValueAtTime(0.62, startTime);

        vox.connect(shaper);
        subGrowl.connect(subGain);
        subGain.connect(shaper);
        shaper.connect(voxMix);
        voxMix.connect(tractInput);

        if (this.noiseBuffer) {
            const breath = ctx.createBufferSource();
            breath.buffer = this.noiseBuffer;

            const breathFilter = ctx.createBiquadFilter();
            breathFilter.type = 'bandpass';
            breathFilter.frequency.setValueAtTime(isHerd ? 1450 : 1150, startTime);
            breathFilter.Q.setValueAtTime(0.75, startTime);

            const breathEnv = ctx.createGain();
            breathEnv.gain.setValueAtTime(0.0001, startTime);
            breathEnv.gain.linearRampToValueAtTime(0.58, startTime + 0.012);
            breathEnv.gain.setValueAtTime(0.38, startTime + dur * 0.62);
            breathEnv.gain.exponentialRampToValueAtTime(0.0001, startTime + dur + 0.04);

            breath.connect(breathFilter);
            breathFilter.connect(breathEnv);
            breathEnv.connect(tractInput);

            const bOffset = Math.random() * 0.6;
            breath.start(startTime, bOffset, dur + 0.08);
        }

        const jawFilter = ctx.createBiquadFilter();
        jawFilter.type = 'lowpass';
        jawFilter.frequency.setValueAtTime(480, startTime);
        jawFilter.frequency.exponentialRampToValueAtTime(isHerd ? 3200 : 2550, startTime + 0.032);
        jawFilter.frequency.setValueAtTime(isHerd ? 2600 : 2100, startTime + dur * 0.56);
        jawFilter.frequency.exponentialRampToValueAtTime(640, startTime + dur + 0.02);
        jawFilter.Q.setValueAtTime(0.9, startTime);

        tractInput.connect(jawFilter);

        const formants = [
            { f: (isHerd ? 740 : 570) * pitchShift, q: 2.3, g: 1.15 },
            { f: (isHerd ? 1560 : 1260) * pitchShift, q: 2.9, g: 0.92 },
            { f: (isHerd ? 2650 : 2200) * pitchShift, q: 3.1, g: 0.36 },
        ];

        const antiBoomHP = ctx.createBiquadFilter();
        antiBoomHP.type = 'highpass';
        antiBoomHP.frequency.setValueAtTime(125, startTime);

        for (const fm of formants) {
            const bp = ctx.createBiquadFilter();
            bp.type = 'bandpass';
            bp.frequency.setValueAtTime(fm.f * 0.82, startTime);
            bp.frequency.exponentialRampToValueAtTime(fm.f * 1.06, startTime + 0.035);
            bp.frequency.exponentialRampToValueAtTime(fm.f * 0.74, startTime + dur);
            bp.Q.setValueAtTime(fm.q, startTime);

            const fg = ctx.createGain();
            fg.gain.setValueAtTime(fm.g, startTime);
            jawFilter.connect(bp);
            bp.connect(fg);
            fg.connect(antiBoomHP);
        }

        const env = ctx.createGain();
        env.gain.setValueAtTime(0.0001, startTime);
        env.gain.linearRampToValueAtTime(vol, startTime + 0.02);
        env.gain.setValueAtTime(vol * 0.9, startTime + dur * 0.54);
        env.gain.exponentialRampToValueAtTime(0.0001, startTime + dur + 0.03);

        antiBoomHP.connect(env);
        env.connect(this.sfxGain);

        vox.start(startTime);
        subGrowl.start(startTime);
        vox.stop(stopAt);
        subGrowl.stop(stopAt);
    }

    playBark(style = 'guard') {
        try {
            const ctx = this.ensureContext();
            if (!ctx || this.sfxMuted) return;
            const now = ctx.currentTime;

            if (style === 'herd') {
                this.synthesizeSingleBark(now, 'herd', 0.96 + Math.random() * 0.09);
            } else {
                const p = 0.96 + Math.random() * 0.07;
                this.synthesizeSingleBark(now, 'herd', p * 0.92);
                this.synthesizeSingleBark(now + 0.195 + Math.random() * 0.03, 'guard', p * 0.96);
            }
        } catch {
            // ignore
        }
    }

    synthesizeHowlVoice(startTime, opts) {
        const ctx = this.ctx;
        if (!ctx) return;

        const { low, peak, tail, dur, volume } = opts;

        const v1 = ctx.createOscillator();
        const v2 = ctx.createOscillator();
        if (this.wolfWave) {
            v1.setPeriodicWave(this.wolfWave);
            v2.setPeriodicWave(this.wolfWave);
        } else {
            v1.type = 'triangle';
            v2.type = 'sine';
        }

        [v1, v2].forEach((osc, i) => {
            osc.frequency.setValueAtTime(low, startTime);
            osc.frequency.exponentialRampToValueAtTime(peak, startTime + dur * 0.3);
            osc.frequency.linearRampToValueAtTime(peak * 1.02, startTime + dur * 0.56);
            osc.frequency.exponentialRampToValueAtTime(tail, startTime + dur);
            if (i === 1) osc.detune.setValueAtTime(7, startTime);
        });

        const vib = ctx.createOscillator();
        const vibG = ctx.createGain();
        vib.frequency.setValueAtTime(5.2, startTime);
        vibG.gain.setValueAtTime(0.0001, startTime);
        vibG.gain.linearRampToValueAtTime(peak * 0.018, startTime + dur * 0.38);
        vibG.gain.linearRampToValueAtTime(tail * 0.01, startTime + dur);
        vib.connect(vibG);
        vibG.connect(v1.frequency);
        vibG.connect(v2.frequency);

        const v2Mix = ctx.createGain();
        v2Mix.gain.setValueAtTime(0.45, startTime);

        const f1 = ctx.createBiquadFilter();
        f1.type = 'bandpass';
        f1.frequency.setValueAtTime(low * 1.9, startTime);
        f1.frequency.exponentialRampToValueAtTime(peak * 1.65, startTime + dur * 0.34);
        f1.frequency.exponentialRampToValueAtTime(tail * 1.5, startTime + dur);
        f1.Q.setValueAtTime(2.6, startTime);

        const f2 = ctx.createBiquadFilter();
        f2.type = 'bandpass';
        f2.frequency.setValueAtTime(low * 3.5, startTime);
        f2.frequency.exponentialRampToValueAtTime(peak * 3.1, startTime + dur * 0.34);
        f2.frequency.exponentialRampToValueAtTime(tail * 2.7, startTime + dur);
        f2.Q.setValueAtTime(3.2, startTime);

        const f2G = ctx.createGain();
        f2G.gain.setValueAtTime(0.32, startTime);

        const bodyLP = ctx.createBiquadFilter();
        bodyLP.type = 'lowpass';
        bodyLP.frequency.setValueAtTime(peak * 1.4, startTime);
        const bodyG = ctx.createGain();
        bodyG.gain.setValueAtTime(0.55, startTime);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0.0001, startTime);
        env.gain.linearRampToValueAtTime(volume, startTime + dur * 0.22);
        env.gain.setValueAtTime(volume * 0.88, startTime + dur * 0.65);
        env.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);

        v1.connect(f1);
        v2.connect(v2Mix);
        v2Mix.connect(f1);
        v1.connect(f2);
        v1.connect(bodyLP);

        f1.connect(env);
        f2.connect(f2G);
        f2G.connect(env);
        bodyLP.connect(bodyG);
        bodyG.connect(env);
        env.connect(this.sfxGain);

        if (this.noiseBuffer) {
            const air = ctx.createBufferSource();
            air.buffer = this.noiseBuffer;
            const airBp = ctx.createBiquadFilter();
            airBp.type = 'bandpass';
            airBp.frequency.setValueAtTime(peak * 2.0, startTime);
            airBp.Q.setValueAtTime(4.0, startTime);
            const airG = ctx.createGain();
            airG.gain.setValueAtTime(0.0001, startTime);
            airG.gain.linearRampToValueAtTime(volume * 0.12, startTime + dur * 0.25);
            airG.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);
            air.connect(airBp);
            airBp.connect(airG);
            airG.connect(this.sfxGain);
            air.start(startTime);
            air.stop(startTime + dur + 0.04);
        }

        v1.start(startTime);
        v2.start(startTime);
        vib.start(startTime);

        const stopAt = startTime + dur + 0.05;
        v1.stop(stopAt);
        v2.stop(stopAt);
        vib.stop(stopAt);
    }

    playHowl(isAlpha = false, isSwift = false) {
        try {
            const ctx = this.ensureContext();
            if (!ctx || this.sfxMuted) return;
            const now = ctx.currentTime;

            const low = isAlpha ? 155 : isSwift ? 285 : 225;
            const peak = isAlpha ? 330 : isSwift ? 580 : 465;
            const tail = isAlpha ? 185 : isSwift ? 345 : 270;
            const dur = isAlpha ? 1.25 : isSwift ? 0.78 : 1.02;
            const vol = isAlpha ? 0.34 : 0.26;

            this.synthesizeHowlVoice(now, { low, peak, tail, dur, volume: vol });
            this.synthesizeHowlVoice(now + 0.24, { low, peak, tail, dur, volume: vol * 0.3 });

            if (isAlpha) {
                this.synthesizeHowlVoice(now + 0.42, {
                    low: 250,
                    peak: 495,
                    tail: 295,
                    dur: 0.85,
                    volume: vol * 0.35,
                });
            }
        } catch {
            // ignore
        }
    }

    playCountdownTick(secLeft) {
        try {
            const ctx = this.ensureContext();
            if (!ctx || this.sfxMuted) return;
            const now = ctx.currentTime;
            const isUrgent = secLeft <= 3;
            const baseFreq = secLeft === 1 ? 1180 : secLeft === 2 ? 990 : secLeft === 3 ? 880 : 660;
            this.playPluck(baseFreq, now, isUrgent ? 0.18 : 0.1, isUrgent ? 0.26 : 0.15, this.sfxGain);
            if (isUrgent) {
                this.playPluck(baseFreq * 1.5, now + 0.03, 0.14, 0.12, this.sfxGain);
            }
        } catch {
            // ignore
        }
    }

    playCancel() {
        try {
            const ctx = this.ensureContext();
            if (!ctx || this.sfxMuted) return;
            const now = ctx.currentTime;
            this.playPluck(640, now, 0.12, 0.16, this.sfxGain);
            this.playPluck(460, now + 0.055, 0.16, 0.16, this.sfxGain);
        } catch {
            // ignore
        }
    }

    playClick() {
        try {
            const ctx = this.ensureContext();
            if (!ctx || this.sfxMuted) return;
            this.playPluck(740, ctx.currentTime, 0.09, 0.16, this.sfxGain);
        } catch {
            // ignore
        }
    }

    playWhistle(isFever = false) {
        try {
            const ctx = this.ensureContext();
            if (!ctx || this.sfxMuted) return;
            const now = ctx.currentTime;
            const mul = isFever ? 1.18 : 1.0;

            const osc = ctx.createOscillator();
            const lfo = ctx.createOscillator();
            const lfoG = ctx.createGain();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(720 * mul, now);
            osc.frequency.exponentialRampToValueAtTime(1320 * mul, now + 0.085);
            osc.frequency.exponentialRampToValueAtTime(980 * mul, now + 0.18);

            lfo.frequency.setValueAtTime(28, now);
            lfoG.gain.setValueAtTime(18, now);
            lfo.connect(lfoG);
            lfoG.connect(osc.frequency);

            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.linearRampToValueAtTime(0.2, now + 0.018);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.19);

            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now);
            lfo.start(now);
            osc.stop(now + 0.21);
            lfo.stop(now + 0.21);

            if (this.noiseBuffer) {
                const n = ctx.createBufferSource();
                n.buffer = this.noiseBuffer;
                const bp = ctx.createBiquadFilter();
                bp.type = 'bandpass';
                bp.frequency.setValueAtTime(2200 * mul, now);
                bp.Q.setValueAtTime(4, now);
                const ng = ctx.createGain();
                ng.gain.setValueAtTime(0.0001, now);
                ng.gain.linearRampToValueAtTime(0.07, now + 0.02);
                ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
                n.connect(bp);
                bp.connect(ng);
                ng.connect(this.sfxGain);
                n.start(now);
                n.stop(now + 0.16);
            }
        } catch {
            // ignore
        }
    }

    playSwipe() {
        try {
            const ctx = this.ensureContext();
            if (!ctx || this.sfxMuted || !this.noiseBuffer) return;
            const now = ctx.currentTime;

            const src = ctx.createBufferSource();
            src.buffer = this.noiseBuffer;

            const bp = ctx.createBiquadFilter();
            bp.type = 'bandpass';
            bp.Q.setValueAtTime(1.8, now);
            bp.frequency.setValueAtTime(380, now);
            bp.frequency.exponentialRampToValueAtTime(1450, now + 0.12);
            bp.frequency.exponentialRampToValueAtTime(620, now + 0.22);

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.linearRampToValueAtTime(0.2, now + 0.04);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.23);

            src.connect(bp);
            bp.connect(gain);
            gain.connect(this.sfxGain);
            src.start(now);
            src.stop(now + 0.25);
        } catch {
            // ignore
        }
    }

    playEagleScreech() {
        try {
            const ctx = this.ensureContext();
            if (!ctx || this.sfxMuted) return;
            const now = ctx.currentTime;

            const playCry = (startTime, volMul) => {
                const osc = ctx.createOscillator();
                const fm = ctx.createOscillator();
                const fmG = ctx.createGain();
                const bp = ctx.createBiquadFilter();
                const gain = ctx.createGain();

                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(2250, startTime);
                osc.frequency.exponentialRampToValueAtTime(2950, startTime + 0.08);
                osc.frequency.exponentialRampToValueAtTime(1650, startTime + 0.36);
                osc.frequency.exponentialRampToValueAtTime(1250, startTime + 0.52);

                fm.frequency.setValueAtTime(68, startTime);
                fmG.gain.setValueAtTime(95, startTime);
                fm.connect(fmG);
                fmG.connect(osc.frequency);

                bp.type = 'bandpass';
                bp.frequency.setValueAtTime(2400, startTime);
                bp.frequency.exponentialRampToValueAtTime(1500, startTime + 0.52);
                bp.Q.setValueAtTime(3.0, startTime);

                const peak = 0.22 * volMul;
                gain.gain.setValueAtTime(0.0001, startTime);
                gain.gain.linearRampToValueAtTime(peak, startTime + 0.035);
                gain.gain.setValueAtTime(peak * 0.78, startTime + 0.28);
                gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.54);

                osc.connect(bp);
                bp.connect(gain);
                gain.connect(this.sfxGain);

                osc.start(startTime);
                fm.start(startTime);
                osc.stop(startTime + 0.56);
                fm.stop(startTime + 0.56);
            };

            playCry(now, 1.0);
            playCry(now + 0.17, 0.3);
        } catch {
            // ignore
        }
    }

    playHeadbutt() {
        try {
            const ctx = this.ensureContext();
            if (!ctx || this.sfxMuted) return;
            const now = ctx.currentTime;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(190, now);
            osc.frequency.exponentialRampToValueAtTime(48, now + 0.14);

            gain.gain.setValueAtTime(0.32, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now);
            osc.stop(now + 0.17);
        } catch {
            // ignore
        }
    }

    playWolfSplash() {
        try {
            const ctx = this.ensureContext();
            if (!ctx || this.sfxMuted) return;
            const now = ctx.currentTime;

            if (this.noiseBuffer) {
                const src = ctx.createBufferSource();
                src.buffer = this.noiseBuffer;
                const lp = ctx.createBiquadFilter();
                lp.type = 'bandpass';
                lp.frequency.setValueAtTime(950, now);
                lp.frequency.exponentialRampToValueAtTime(320, now + 0.28);
                const g = ctx.createGain();
                g.gain.setValueAtTime(0.28, now);
                g.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
                src.connect(lp);
                lp.connect(g);
                g.connect(this.sfxGain);
                src.start(now);
                src.stop(now + 0.32);
            }

            [587.33, 880, 1174.66].forEach((freq, i) => {
                this.playPluck(freq, now + 0.04 + i * 0.055, 0.28, 0.2, this.sfxGain);
            });
        } catch {
            // ignore
        }
    }

    playBeeBuzz() {
        try {
            const ctx = this.ensureContext();
            if (!ctx || this.sfxMuted) return;
            const now = ctx.currentTime;
            [195, 208].forEach((freq) => {
                const osc = ctx.createOscillator();
                const lfo = ctx.createOscillator();
                const lfoG = ctx.createGain();
                const f = ctx.createBiquadFilter();
                const g = ctx.createGain();

                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(freq, now);
                lfo.frequency.setValueAtTime(32, now);
                lfoG.gain.setValueAtTime(24, now);
                lfo.connect(lfoG);
                lfoG.connect(osc.frequency);

                f.type = 'bandpass';
                f.frequency.setValueAtTime(640, now);
                g.gain.setValueAtTime(0.0001, now);
                g.gain.linearRampToValueAtTime(0.09, now + 0.04);
                g.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);

                osc.connect(f);
                f.connect(g);
                g.connect(this.sfxGain);
                osc.start(now);
                lfo.start(now);
                osc.stop(now + 0.44);
                lfo.stop(now + 0.44);
            });
        } catch {
            // ignore
        }
    }

    playBossRoar() {
        try {
            const ctx = this.ensureContext();
            if (!ctx || this.sfxMuted) return;
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const sub = ctx.createOscillator();
            const filter = ctx.createBiquadFilter();
            const gain = ctx.createGain();

            osc.type = 'sawtooth';
            sub.type = 'sine';
            osc.frequency.setValueAtTime(140, now);
            osc.frequency.exponentialRampToValueAtTime(55, now + 0.72);
            sub.frequency.setValueAtTime(75, now);
            sub.frequency.exponentialRampToValueAtTime(36, now + 0.72);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(480, now);
            filter.frequency.exponentialRampToValueAtTime(160, now + 0.72);

            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.linearRampToValueAtTime(0.28, now + 0.07);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.78);

            osc.connect(filter);
            sub.connect(filter);
            filter.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now);
            sub.start(now);
            osc.stop(now + 0.8);
            sub.stop(now + 0.8);
        } catch {
            // ignore
        }
    }

    playBossHit() {
        try {
            const ctx = this.ensureContext();
            if (!ctx || this.sfxMuted) return;
            const now = ctx.currentTime;
            this.playHeadbutt();
            this.playPluck(330, now + 0.02, 0.22, 0.2, this.sfxGain);
        } catch {
            // ignore
        }
    }

    playEvolution() {
        try {
            const ctx = this.ensureContext();
            if (!ctx || this.sfxMuted) return;
            const now = ctx.currentTime;
            [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, i) => {
                this.playPluck(freq, now + i * 0.065, 0.45, 0.22, this.sfxGain, 6);
            });
        } catch {
            // ignore
        }
    }

    playDiscovery() {
        try {
            const ctx = this.ensureContext();
            if (!ctx || this.sfxMuted) return;
            const now = ctx.currentTime;
            [587.33, 880, 1174.66].forEach((freq, i) => {
                this.playPluck(freq, now + i * 0.07, 0.35, 0.18, this.sfxGain);
            });
        } catch {
            // ignore
        }
    }

    playThunder() {
        try {
            const ctx = this.ensureContext();
            if (!ctx || this.sfxMuted) return;
            const now = ctx.currentTime;

            const sub = ctx.createOscillator();
            const subG = ctx.createGain();
            sub.type = 'sine';
            sub.frequency.setValueAtTime(115, now);
            sub.frequency.exponentialRampToValueAtTime(28, now + 0.45);
            subG.gain.setValueAtTime(0.32, now);
            subG.gain.exponentialRampToValueAtTime(0.0001, now + 0.48);
            sub.connect(subG);
            subG.connect(this.sfxGain);
            sub.start(now);
            sub.stop(now + 0.5);

            if (this.noiseBuffer) {
                const src = ctx.createBufferSource();
                src.buffer = this.noiseBuffer;
                const lp = ctx.createBiquadFilter();
                lp.type = 'lowpass';
                lp.frequency.setValueAtTime(950, now);
                lp.frequency.exponentialRampToValueAtTime(180, now + 0.55);
                const ng = ctx.createGain();
                ng.gain.setValueAtTime(0.28, now);
                ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.58);
                src.connect(lp);
                lp.connect(ng);
                ng.connect(this.sfxGain);
                src.start(now);
                src.stop(now + 0.6);
            }
        } catch {
            // ignore
        }
    }

    playUfo() {
        try {
            const ctx = this.ensureContext();
            if (!ctx || this.sfxMuted) return;
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const lfo = ctx.createOscillator();
            const lfoG = ctx.createGain();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(540, now);
            osc.frequency.linearRampToValueAtTime(720, now + 0.42);
            lfo.frequency.setValueAtTime(12, now);
            lfoG.gain.setValueAtTime(55, now);
            lfo.connect(lfoG);
            lfoG.connect(osc.frequency);

            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.linearRampToValueAtTime(0.14, now + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.44);

            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now);
            lfo.start(now);
            osc.stop(now + 0.46);
            lfo.stop(now + 0.46);
        } catch {
            // ignore
        }
    }

    playBuoyBounce() {
        try {
            const ctx = this.ensureContext();
            if (!ctx || this.sfxMuted) return;
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(250, now);
            osc.frequency.exponentialRampToValueAtTime(860, now + 0.16);
            gain.gain.setValueAtTime(0.22, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now);
            osc.stop(now + 0.25);
        } catch {
            // ignore
        }
    }

    playFever() {
        try {
            const ctx = this.ensureContext();
            if (!ctx || this.sfxMuted) return;
            const now = ctx.currentTime;
            [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, i) => {
                this.playPluck(freq, now + i * 0.048, 0.36, 0.22, this.sfxGain);
            });
        } catch {
            // ignore
        }
    }

    playAlarm() {
        try {
            const ctx = this.ensureContext();
            if (!ctx || this.sfxMuted) return;
            const now = ctx.currentTime;
            [520, 680].forEach((freq, i) => {
                this.playPluck(freq, now + i * 0.11, 0.16, 0.18, this.sfxGain);
            });
        } catch {
            // ignore
        }
    }

    playCoin(combo = 1) {
        try {
            const ctx = this.ensureContext();
            if (!ctx || this.sfxMuted) return;
            const now = ctx.currentTime;
            const mul = Math.min(1.55, 1 + (combo - 1) * 0.08);
            this.playPluck(880 * mul, now, 0.18, 0.18, this.sfxGain);
            this.playPluck(1318.5 * mul, now + 0.045, 0.24, 0.16, this.sfxGain);
        } catch {
            // ignore
        }
    }

    playBuy() {
        try {
            const ctx = this.ensureContext();
            if (!ctx || this.sfxMuted) return;
            const now = ctx.currentTime;
            this.playPluck(659.25, now, 0.18, 0.18, this.sfxGain);
            this.playPluck(987.77, now + 0.055, 0.26, 0.2, this.sfxGain);
        } catch {
            // ignore
        }
    }

    playBubble() {
        try {
            const ctx = this.ensureContext();
            if (!ctx || this.sfxMuted) return;
            const now = ctx.currentTime;
            [0, 0.075].forEach((offset, idx) => {
                const t = now + offset;
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                osc.type = 'sine';
                const f0 = idx === 0 ? 290 : 420;
                osc.frequency.setValueAtTime(f0, t);
                osc.frequency.exponentialRampToValueAtTime(f0 * 2.4, t + 0.11);
                g.gain.setValueAtTime(0.0001, t);
                g.gain.linearRampToValueAtTime(0.18, t + 0.02);
                g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
                osc.connect(g);
                g.connect(this.sfxGain);
                osc.start(t);
                osc.stop(t + 0.13);
            });
        } catch {
            // ignore
        }
    }

    playCrunch() {
        try {
            const ctx = this.ensureContext();
            if (!ctx || this.sfxMuted || !this.noiseBuffer) return;
            const now = ctx.currentTime;
            const src = ctx.createBufferSource();
            src.buffer = this.noiseBuffer;
            const bp = ctx.createBiquadFilter();
            bp.type = 'bandpass';
            bp.frequency.setValueAtTime(1150, now);
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.18, now);
            g.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
            src.connect(bp);
            bp.connect(g);
            g.connect(this.sfxGain);
            src.start(now);
            src.stop(now + 0.11);
        } catch {
            // ignore
        }
    }

    playSave(combo = 1) {
        try {
            const ctx = this.ensureContext();
            if (!ctx || this.sfxMuted) return;
            const now = ctx.currentTime;
            const mul = Math.min(1.38, 1 + (combo - 1) * 0.06);
            [523.25 * mul, 659.25 * mul, 783.99 * mul].forEach((freq, i) => {
                this.playPluck(freq, now + i * 0.048, 0.24, 0.18, this.sfxGain);
            });
        } catch {
            // ignore
        }
    }

    playVictory() {
        try {
            const ctx = this.ensureContext();
            if (!ctx || this.sfxMuted) return;
            const now = ctx.currentTime;
            [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
                this.playPluck(freq, now + i * 0.09, 0.55, 0.24, this.sfxGain, 5);
            });
        } catch {
            // ignore
        }
    }
}

export const sound = new SoundManager();