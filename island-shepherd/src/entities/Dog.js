import Phaser from 'phaser';
import {
    DOG_CONFIG,
    getZoneAt,
    getSafeDirection,
    getPatrolPoint,
} from '../config/gameData.js';
import { sound } from '../utils/SoundGen.js';

export class Dog {
    constructor(scene, startAngle, shapeId = 'classic', speedMultiplier = 1, visionBonus = 0) {
        this.scene = scene;
        this.shapeId = shapeId;
        this.speedMul = speedMultiplier;
        this.visionRadius = DOG_CONFIG.VISION_RADIUS + visionBonus;
        this.patrolAngle = startAngle;
        this.facingAngle = startAngle;
        this.herdCooldown = 0;
        this.wolfBarkCooldown = 0;
        this.spotBarkCooldown = 0;
        this.alertedWolf = null;
        this.restTimer = 0;
        this.dustTimer = 0;

        const startPt = getPatrolPoint(shapeId, startAngle, 0);
        this.container = scene.add.container(startPt.x, startPt.y);
        this.shadow = scene.add.image(0, 7, 'shadow_soft').setScale(0.88);
        this.body = scene.add.image(0, 0, 'dog_normal').setScale(0.84);
        this.statusBadge = scene.add.image(0, -28, 'badge_rest').setScale(0.72).setVisible(false);
        this.container.add([this.shadow, this.body, this.statusBadge]);
    }

    get x() {
        return this.container ? this.container.x : 0;
    }

    get y() {
        return this.container ? this.container.y : 0;
    }

    playBarkFx(tint = 0xfbbf24) {
        if (!this.container || !this.body || !this.body.scene) return;

        const ring = this.scene.add
            .image(this.x, this.y, 'whistle_ring')
            .setDepth(18)
            .setScale(0.08)
            .setAlpha(0.85)
            .setTint(tint);

        this.scene.tweens.add({
            targets: ring,
            scale: 0.42,
            alpha: 0,
            duration: 240,
            ease: 'Cubic.easeOut',
            onComplete: () => ring.destroy(),
        });

        this.scene.tweens.killTweensOf(this.body);
        this.body.setScale(0.84);
        this.scene.tweens.add({
            targets: this.body,
            scaleX: 1.02,
            scaleY: 0.72,
            duration: 85,
            yoyo: true,
            ease: 'Quad.easeOut',
        });
    }

    spawnDust() {
        if (!this.container || !this.scene) return;
        const puff = this.scene.add
            .image(
                this.x - Math.cos(this.facingAngle) * 12,
                this.y - Math.sin(this.facingAngle) * 12 + 4,
                'dust_puff'
            )
            .setDepth(8)
            .setScale(0.38)
            .setAlpha(0.6)
            .setTint(0xfef3c7);

        this.scene.tweens.add({
            targets: puff,
            scale: 0.75,
            alpha: 0,
            duration: 260,
            ease: 'Quad.easeOut',
            onComplete: () => puff.destroy(),
        });
    }

    update(dt, sheepList, wolfList, tideOffset, onWolfAction) {
        if (!this.container || !this.body || !this.body.scene) return;

        if (this.herdCooldown > 0) this.herdCooldown -= dt;
        if (this.wolfBarkCooldown > 0) this.wolfBarkCooldown -= dt;
        if (this.spotBarkCooldown > 0) this.spotBarkCooldown -= dt;

        const now = this.scene.time.now;

        if (this.restTimer > 0) {
            this.restTimer -= dt;
            this.statusBadge.setVisible(true);
            this.statusBadge.y = -28 + Math.sin(now * 0.012) * 2.5;
            const pant = 1 + Math.sin(now * 0.025) * 0.06;
            this.body.setScale(0.84 * pant, 0.84 / pant);
            if (this.restTimer <= 0) {
                this.statusBadge.setVisible(false);
                this.body.setScale(0.84);
            }
            this.container.setDepth(10.5 + (this.y + 400) * 0.001);
            return;
        }

        let targetX = null;
        let targetY = null;
        let speed = DOG_CONFIG.PATROL_SPEED * this.speedMul;
        let isSprinting = false;

        // بررسی محدوده دید سگ برای تشخیص گرگ‌های فعال روی جزیره
        let nearestVisibleWolf = null;
        let bestVisibleDist = this.visionRadius + 45;
        for (const w of wolfList) {
            if (!w || w.isDone || !w.container || w.state === 'warning' || w.state === 'flee') continue;
            const d = Math.hypot(w.x - this.x, w.y - this.y);
            if (d < bestVisibleDist) {
                bestVisibleDist = d;
                nearestVisibleWolf = w;
            }
        }

        // پارس هشدار به محض دیدن گرگ (با جلوگیری از اسپم یا دوباره‌پارس کردن روی همان گرگ)
        if (nearestVisibleWolf) {
            const aboutToAttack = this.wolfBarkCooldown <= 0 && bestVisibleDist < 55;
            if (
                nearestVisibleWolf !== this.alertedWolf &&
                this.spotBarkCooldown <= 0 &&
                !aboutToAttack
            ) {
                this.alertedWolf = nearestVisibleWolf;
                this.spotBarkCooldown = 2.4;
                sound.playBark('guard');
                this.playBarkFx(0xf97316);
            }
        } else {
            this.alertedWolf = null;
        }

        const nearestWolf =
            this.wolfBarkCooldown <= 0 && bestVisibleDist <= this.visionRadius
                ? nearestVisibleWolf
                : null;

        if (nearestWolf) {
            targetX = nearestWolf.x;
            targetY = nearestWolf.y;
            speed = DOG_CONFIG.CHASE_WOLF_SPEED * this.speedMul;
            isSprinting = true;

            if (bestVisibleDist < 36) {
                if (nearestWolf.scareByDog(this.x, this.y, onWolfAction)) {
                    this.playBarkFx(0xfbbf24);
                    this.wolfBarkCooldown = DOG_CONFIG.WOLF_BARK_COOLDOWN / this.speedMul;
                    this.restTimer = DOG_CONFIG.REST_DURATION / this.speedMul;
                }
            }
        } else {
            let straySheep = null;
            let bestDist = this.visionRadius + 40;
            for (const s of sheepList) {
                if (!s.canBeHerded()) continue;
                if (getZoneAt(s.x, s.y, this.shapeId, tideOffset) === 'beach') {
                    const d = Math.hypot(s.x - this.x, s.y - this.y);
                    if (d < bestDist) {
                        bestDist = d;
                        straySheep = s;
                    }
                }
            }

            if (straySheep) {
                targetX = straySheep.x;
                targetY = straySheep.y;
                speed = DOG_CONFIG.HERD_SPEED * this.speedMul;
                isSprinting = true;

                if (bestDist < 38 && this.herdCooldown <= 0) {
                    const safe = getSafeDirection(straySheep.x, straySheep.y, this.shapeId);
                    straySheep.herdByDog(safe.x, safe.y, DOG_CONFIG.HERD_FORCE);
                    this.playBarkFx(0xfbbf24);
                    this.herdCooldown = 1.1;
                    sound.playBark('herd');
                }
            } else {
                this.patrolAngle += dt * 0.58 * this.speedMul;
                const pt = getPatrolPoint(this.shapeId, this.patrolAngle, tideOffset);
                targetX = pt.x;
                targetY = pt.y;
            }
        }

        if (targetX !== null) {
            const dx = targetX - this.x;
            const dy = targetY - this.y;
            const dist = Math.hypot(dx, dy);

            if (dist > 4) {
                const vx = (dx / dist) * speed;
                const vy = (dy / dist) * speed;
                this.container.x += vx * dt;
                this.container.y += vy * dt;

                const targetAngle = Math.atan2(vy, vx);
                this.facingAngle = Phaser.Math.Angle.RotateTo(this.facingAngle, targetAngle, dt * 11);
                this.body.rotation = this.facingAngle;
                this.body.y = -Math.abs(Math.sin(now * 0.014)) * (isSprinting ? 4.2 : 2.2);

                if (isSprinting) {
                    this.dustTimer -= dt;
                    if (this.dustTimer <= 0) {
                        this.dustTimer = 0.16;
                        this.spawnDust();
                    }
                }
            }
        }

        this.container.setDepth(10.5 + (this.y + 400) * 0.001);
    }

    destroy() {
        if (this.container) {
            this.scene?.tweens?.killTweensOf(this.body);
            this.container.destroy();
            this.container = null;
        }
    }
}