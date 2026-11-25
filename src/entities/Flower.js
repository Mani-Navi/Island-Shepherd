import { FLOWER_TYPES } from '../config/gameData.js';
import { sound } from '../utils/SoundGen.js';

export class Flower {
    constructor(scene, x, y, typeId = 'tulip') {
        this.scene = scene;
        this.typeId = typeId;
        this.config = FLOWER_TYPES[typeId];
        this.x = x;
        this.y = y;
        this.isAlive = true;

        this.eatProgress = 0;
        this.beingEatenThisFrame = false;
        this.swayPhase = Math.random() * Math.PI * 2;
        this.swaySpeed = 0.0022 + Math.random() * 0.001;

        this.container = scene.add.container(x, y);
        this.container.setDepth(5);

        this.sprite = scene.add.image(0, 0, this.config.key).setScale(0.1);
        this.progressGfx = scene.add.graphics();
        this.container.add([this.sprite, this.progressGfx]);

        scene.tweens.add({
            targets: this.sprite,
            scale: 0.88,
            duration: 420,
            ease: 'Back.easeOut',
        });
    }

    nibble(dt, sheep, onEatenCallback) {
        if (!this.isAlive) return;
        this.beingEatenThisFrame = true;
        this.eatProgress += dt / this.config.eatTime;

        const t = this.scene.time.now;
        this.sprite.x = Math.sin(t * 0.045) * 2.8;
        this.sprite.rotation = Math.sin(t * 0.035) * 0.14;

        if (this.eatProgress >= 1) {
            this.consume(sheep, onEatenCallback);
        }
    }

    consume(sheep, onEatenCallback) {
        if (!this.isAlive) return;
        this.isAlive = false;
        sound.playCrunch();

        const tint =
            this.typeId === 'spicy' ? 0xf94144 : this.typeId === 'lavender' ? 0xc77dff : 0xfb7185;

        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2 + Math.random() * 0.25;
            const key = i % 2 === 0 ? 'star_particle' : 'dot_particle';
            const p = this.scene.add.image(this.x, this.y, key);
            p.setDepth(22).setScale(0.42).setTint(tint);
            this.scene.tweens.add({
                targets: p,
                x: this.x + Math.cos(a) * (24 + Math.random() * 14),
                y: this.y + Math.sin(a) * (24 + Math.random() * 14),
                alpha: 0,
                scale: 0.1,
                rotation: 1.8,
                duration: 360,
                ease: 'Cubic.easeOut',
                onComplete: () => p.destroy(),
            });
        }

        if (this.config.effect === 'zoomies') {
            sheep.applyZoomies(4.5);
        } else if (this.config.effect === 'sleep') {
            sheep.applySleep(5.5);
        }

        this.destroy();
        if (onEatenCallback) onEatenCallback(this);
    }

    update(dt) {
        if (!this.isAlive) return;

        const now = this.scene.time.now;
        if (!this.beingEatenThisFrame) {
            this.sprite.x = 0;
            // حرکت نرم گل در نسیم جزیره
            this.sprite.rotation = Math.sin(now * this.swaySpeed + this.swayPhase) * 0.08;
            if (this.eatProgress > 0) {
                this.eatProgress = Math.max(0, this.eatProgress - dt * 0.35);
            }
        }
        this.beingEatenThisFrame = false;

        this.progressGfx.clear();
        if (this.eatProgress > 0.02) {
            const r = 21;
            this.progressGfx.lineStyle(4.5, 0x0f172a, 0.48);
            this.progressGfx.strokeCircle(0, 0, r);

            const color = this.eatProgress > 0.7 ? 0xef4444 : 0xfbbf24;
            this.progressGfx.lineStyle(4, color, 1);
            this.progressGfx.beginPath();
            this.progressGfx.arc(
                0,
                0,
                r,
                -Math.PI / 2,
                -Math.PI / 2 + Math.PI * 2 * this.eatProgress,
                false
            );
            this.progressGfx.strokePath();
        }
    }

    destroy() {
        if (this.container) {
            this.scene.tweens.killTweensOf(this.sprite);
            this.container.destroy();
            this.container = null;
        }
    }
}