import { HAY_CONFIG } from '../config/gameData.js';

export class HayBait {
    constructor(scene, x = 0, y = 0, durationSec = HAY_CONFIG.DURATION_SEC) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.life = durationSec;
        this.maxLife = durationSec;
        this.isAlive = true;

        this.container = scene.add.container(x, y).setDepth(6);
        this.ringGfx = scene.add.graphics();
        this.sprite = scene.add.image(0, 0, 'hay_bale').setScale(0.1);
        this.container.add([this.ringGfx, this.sprite]);

        scene.tweens.add({
            targets: this.sprite,
            scale: 0.95,
            duration: 280,
            ease: 'Back.easeOut',
        });
    }

    update(dt) {
        if (!this.isAlive) return;
        this.life -= dt;
        if (this.life <= 0) {
            this.isAlive = false;
            this.destroy();
            return;
        }

        const ratio = this.life / this.maxLife;
        const pulse = 1 + Math.sin(this.scene.time.now * 0.008) * 0.06;

        this.ringGfx.clear();
        this.ringGfx.lineStyle(2, 0xfde047, 0.45);
        this.ringGfx.strokeCircle(0, 0, 52 * pulse);

        this.ringGfx.lineStyle(4, 0xf59e0b, 0.95);
        this.ringGfx.beginPath();
        this.ringGfx.arc(0, 0, 32, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio, false);
        this.ringGfx.strokePath();
    }

    destroy() {
        if (this.container) {
            this.container.destroy();
            this.container = null;
        }
    }
}