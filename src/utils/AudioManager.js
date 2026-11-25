/**
 * مدیر فایل‌های صوتی بامزه و موزیک از Object Storage آروان‌کلاد
 * اگر هر فایل هنوز در باکت آپلود نشده باشد یا اینترنت قطع باشد، بدون خطا به سنتز SoundGen برمی‌گردد.
 */
const AUDIO_CDN_BASE =
    import.meta.env.VITE_AUDIO_BASE_URL ||
    'https://shepherd-data.s3.ir-central1.arvanstorage.ir/audio/';

export const AUDIO_MANIFEST = {
    // افکت‌های بامزه حیوانات (MP3 یا OGG کم‌حجم)
    sheep_happy: 'sheep_happy.mp3',
    sheep_scared: 'sheep_scared.mp3',
    sheep_calm: 'sheep_calm.mp3',
    dog_bark: 'dog_bark.mp3',
    dog_herd: 'dog_herd.mp3',
    wolf_howl: 'wolf_howl.mp3',
    wolf_alpha: 'wolf_alpha.mp3',
    eagle_screech: 'eagle_screech.mp3',
    boss_roar: 'boss_roar.mp3',
    // موزیک‌های شاد و هیجانی (قابل لوپ)
    music_menu: 'music_menu.mp3',
    music_calm: 'music_calm.mp3',
    music_intense: 'music_intense.mp3',
};

class RemoteAudioPack {
    constructor() {
        this.buffers = new Map();
        this.failed = new Set();
        this.loading = new Map();
        this.currentMusicSource = null;
        this.currentMusicKey = null;
        this.musicGainNode = null;
    }

    async loadKey(ctx, key) {
        if (!ctx || !AUDIO_MANIFEST[key]) return null;
        if (this.buffers.has(key)) return this.buffers.get(key);
        if (this.failed.has(key)) return null;
        if (this.loading.has(key)) return this.loading.get(key);

        const url = `${AUDIO_CDN_BASE}${AUDIO_MANIFEST[key]}`;
        const promise = fetch(url, { mode: 'cors', cache: 'force-cache' })
            .then((res) => {
                if (!res.ok) throw new Error('Audio not found');
                return res.arrayBuffer();
            })
            .then((arr) => ctx.decodeAudioData(arr))
            .then((decoded) => {
                this.buffers.set(key, decoded);
                this.loading.delete(key);
                return decoded;
            })
            .catch(() => {
                this.failed.add(key);
                this.loading.delete(key);
                return null;
            });

        this.loading.set(key, promise);
        return promise;
    }

    /**
     * پیش‌بارگذاری بی‌صدا در پس‌زمینه پس از اولین کلیک کاربر
     */
    warmup(ctx) {
        if (!ctx) return;
        for (const key of Object.keys(AUDIO_MANIFEST)) {
            this.loadKey(ctx, key);
        }
    }

    /**
     * پخش افکت صوتی با کمی تغییر زیر‌و‌بمی تصادفی برای بامزه‌تر شدن و جلوگیری از تکرار
     * اگر آماده نباشد false برمی‌گرداند تا SoundGen فال‌بک را پخش کند.
     */
    playSfx(ctx, targetBus, key, { volume = 0.85, pitchJitter = 0.12, baseRate = 1.0 } = {}) {
        if (!ctx || !targetBus) return false;
        const buf = this.buffers.get(key);
        if (!buf) {
            if (!this.failed.has(key)) this.loadKey(ctx, key);
            return false;
        }
        try {
            const src = ctx.createBufferSource();
            src.buffer = buf;
            src.playbackRate.value = Math.max(
                0.65,
                Math.min(1.5, baseRate + (Math.random() - 0.5) * 2 * pitchJitter)
            );
            const g = ctx.createGain();
            g.gain.setValueAtTime(volume, ctx.currentTime);
            src.connect(g);
            g.connect(targetBus);
            src.start(ctx.currentTime);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * پخش لوپ موزیک از S3 (اگر فایل آماده باشد، موزیک سنتز را جایگزین می‌کند)
     */
    startMusicLoop(ctx, targetBus, mode = 'calm') {
        const key =
            mode === 'intense'
                ? 'music_intense'
                : mode === 'menu'
                    ? 'music_menu'
                    : 'music_calm';

        const buf = this.buffers.get(key);
        if (!buf) {
            if (!this.failed.has(key)) this.loadKey(ctx, key);
            return false;
        }

        if (this.currentMusicKey === key && this.currentMusicSource) {
            return true;
        }

        this.stopMusicLoop();

        try {
            const src = ctx.createBufferSource();
            src.buffer = buf;
            src.loop = true;

            const fadeGain = ctx.createGain();
            fadeGain.gain.setValueAtTime(0.001, ctx.currentTime);
            fadeGain.gain.linearRampToValueAtTime(0.95, ctx.currentTime + 0.45);

            src.connect(fadeGain);
            fadeGain.connect(targetBus);
            src.start(ctx.currentTime);

            this.currentMusicSource = src;
            this.currentMusicKey = key;
            this.musicGainNode = fadeGain;
            return true;
        } catch {
            return false;
        }
    }

    stopMusicLoop() {
        if (this.currentMusicSource) {
            try {
                this.currentMusicSource.stop();
                this.currentMusicSource.disconnect();
            } catch {
                // ignore
            }
            this.currentMusicSource = null;
            this.currentMusicKey = null;
        }
        if (this.musicGainNode) {
            try {
                this.musicGainNode.disconnect();
            } catch {
                // ignore
            }
            this.musicGainNode = null;
        }
    }

    isMusicPlaying() {
        return Boolean(this.currentMusicSource);
    }
}

export const remoteAudio = new RemoteAudioPack();