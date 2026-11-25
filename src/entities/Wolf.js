import Phaser from 'phaser';
import {
    WOLF_CONFIG,
    WOLF_TYPES,
    getWolfSpawnPoint,
    getZoneAt,
    distToSegment,
} from '../config/gameData.js';
import { sound } from '../utils/SoundGen.js';

export class Wolf {
    constructor(scene, spawnAngle, shapeId = 'classic', type = 'normal', speedScale = 1) {
        this.scene = scene;
        this.shapeId = shapeId;
        this.type = type;
        this.cfg = WOLF_TYPES[type] || WOLF_TYPES.normal;
        this.speedScale = speedScale;
        this.spawnAngle = spawnAngle;
        this.state = 'warning';
        this.isDone = false;

        this.warningTimer = this.cfg.warningTime;
        this.scareHits = 0;
        this.hitsToScare = this.cfg.hitsToScare;
        this.lastHitTime = 0;
        this.stunTimer = 0;
        this.frostTimer = 0;
        this.capturedSheep = null;
        this.pushVx = 0;
        this.pushVy = 0;
        this.facingAngle = spawnAngle + Math.PI;
        this.runPhase = Math.random() * Math.PI * 2;
        this.dustTimer = 0;

        this.hasEnteredLand = false;
        this.pushedByPlayerTimer = 0;

        const sp = getWolfSpawnPoint(shapeId, spawnAngle);
        this.alertSprite = scene.add.image(sp.x * 0.88, sp.y * 0.88, 'wolf_alert');
        this.alertSprite
            .setDepth(30)
            .setScale(type === 'alpha' ? 1.15 : 0.85)
            .setTint(type === 'swift' ? 0xa855f7 : type === 'alpha' ? 0xfbbf24 : 0xffffff);

        scene.tweens.add({
            targets: this.alertSprite,
            scale: type === 'alpha' ? 1.4 : 1.15,
            alpha: 0.52,
            duration: type === 'swift' ? 150 : 240,
            yoyo: true,
            repeat: -1,
        });

        this.container = scene.add.container(sp.x, sp.y);
        this.container.setVisible(false);
        this.shadow = scene.add.image(0, 8, 'shadow_soft').setScale(this.cfg.scale * 1.12);
        this.body = scene.add.image(0, 0, this.cfg.key).setScale(this.cfg.scale);
        this.hpGfx = scene.add.graphics();
        this.statusBadge = scene.add.image(0, -34, 'badge_shock').setScale(0.76).setVisible(false);
        this.container.add([this.shadow, this.body, this.hpGfx, this.statusBadge]);

        sound.playHowl(type === 'alpha', type === 'swift');
        if (type === 'alpha') scene.cameras.main.shake(170, 0.0045);
    }

    get x() {
        return this.container ? this.container.x : 0;
    }

    get y() {
        return this.container ? this.container.y : 0;
    }

    showStatusBadge(key) {
        if (!this.statusBadge || !this.statusBadge.scene) return;
        this.statusBadge.setTexture(key).setVisible(true).setScale(0.25);
        this.scene.tweens.add({
            targets: this.statusBadge,
            scale: 0.78,
            duration: 160,
            ease: 'Back.easeOut',
        });
    }

    spawnDust() {
        if (!this.container || !this.scene) return;
        const puff = this.scene.add
            .image(
                this.x - Math.cos(this.facingAngle) * 14,
                this.y - Math.sin(this.facingAngle) * 14 + 5,
                'dust_puff'
            )
            .setDepth(9)
            .setScale(0.42)
            .setAlpha(0.62)
            .setTint(this.type === 'swift' ? 0xc4b5fd : 0xe2e8f0);

        this.scene.tweens.add({
            targets: puff,
            scale: 0.85,
            alpha: 0,
            duration: 290,
            ease: 'Quad.easeOut',
            onComplete: () => puff.destroy(),
        });
    }

    drawHpPips() {
        if (!this.hpGfx || !this.hpGfx.scene) return;
        this.hpGfx.clear();
        if (this.state === 'warning' || this.state === 'flee' || this.hitsToScare <= 1) return;

        const remaining = Math.max(0, this.hitsToScare - this.scareHits);
        const gap = 10;
        const startX = -((this.hitsToScare - 1) * gap) / 2;
        const y = this.type === 'alpha' ? -36 : -28;

        for (let i = 0; i < this.hitsToScare; i++) {
            const px = startX + i * gap;
            this.hpGfx.fillStyle(0x0f172a, 0.8);
            this.hpGfx.fillCircle(px, y, 4.6);
            if (i < remaining) {
                this.hpGfx.fillStyle(this.type === 'alpha' ? 0xfbbf24 : 0xf43f5e, 1);
                this.hpGfx.fillCircle(px, y, 3.2);
            }
        }
    }

    drownInWater(onWolfAction) {
        if (this.isDone || !this.container) return;
        this.isDone = true;

        if (this.capturedSheep) {
            this.capturedSheep.releaseFromWolf(this.shapeId, this.scene.terrain);
            this.capturedSheep = null;
        }

        this.hpGfx.clear();
        this.statusBadge.setVisible(false);
        this.shadow.setVisible(false);
        sound.playWolfSplash();

        const wx = this.x;
        const wy = this.y;

        const bubble = this.scene.add.image(0, 0, 'water_bubble').setScale(0.25);
        this.container.add(bubble);
        this.scene.tweens.add({ targets: bubble, scale: 1.2, duration: 220, ease: 'Back.easeOut' });

        const ripple = this.scene.add
            .image(wx, wy, 'whistle_ring')
            .setDepth(14)
            .setScale(0.1)
            .setAlpha(0.9)
            .setTint(0x7dd3fc);
        this.scene.tweens.add({
            targets: ripple,
            scale: 0.65,
            alpha: 0,
            duration: 520,
            ease: 'Cubic.easeOut',
            onComplete: () => ripple.destroy(),
        });

        for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2;
            const key = i % 2 === 0 ? 'star_particle' : 'dot_particle';
            const drop = this.scene.add.image(wx, wy, key);
            drop.setDepth(26).setScale(0.5).setTint(i % 2 === 0 ? 0xfde047 : 0x7dd3fc);
            this.scene.tweens.add({
                targets: drop,
                x: wx + Math.cos(a) * 48,
                y: wy + Math.sin(a) * 48,
                alpha: 0,
                scale: 0.1,
                rotation: 1.5,
                duration: 420,
                onComplete: () => drop.destroy(),
            });
        }

        const c = this.container;
        this.container = null;
        this.scene.tweens.add({
            targets: c,
            scale: 0.3,
            alpha: 0,
            rotation: 4.0,
            duration: 620,
            ease: 'Quad.easeIn',
            onComplete: () => c?.destroy(),
        });

        if (onWolfAction) {
            onWolfAction({
                type: 'water_ko',
                wolf: this,
                x: wx,
                y: wy,
                message: 'ناک‌اوت آبی! ۲ برابر سکه',
            });
        }
    }

    scareByDog(dogX, dogY, onWolfAction) {
        if (this.isDone || !this.container || this.state === 'warning' || this.state === 'flee') return false;
        const dx = this.x - dogX;
        const dy = this.y - dogY;
        const dist = Math.hypot(dx, dy) || 1;
        this.pushedByPlayerTimer = 1.6;
        sound.playBark('guard');
        return this.applyDamageHit(dx / dist, dy / dist, 250, 'dog', 1, onWolfAction);
    }

    hitByRam(ramX, ramY, isFireRam = false, onWolfAction = null) {
        if (this.isDone || !this.container || this.state === 'warning' || this.state === 'flee') return false;
        const dx = this.x - ramX;
        const dy = this.y - ramY;
        const dist = Math.hypot(dx, dy) || 1;
        this.pushedByPlayerTimer = 2.0;
        const force = isFireRam ? 360 : 280;
        const dmg = isFireRam ? 2 : 1;
        return this.applyDamageHit(dx / dist, dy / dist, force, isFireRam ? 'fire_ram' : 'ram', dmg, onWolfAction);
    }

    scareByBees(hiveX, hiveY, onWolfAction) {
        if (this.isDone || !this.container || this.state === 'warning' || this.state === 'flee') return false;
        const dx = this.x - hiveX;
        const dy = this.y - hiveY;
        const dist = Math.hypot(dx, dy) || 1;
        this.pushedByPlayerTimer = 2.0;
        return this.applyDamageHit(dx / dist, dy / dist, 310, 'bees', 2, onWolfAction);
    }

    fryByHazard(fromX, fromY, label, onWolfAction) {
        if (this.isDone || !this.container || this.state === 'warning' || this.state === 'flee') return false;
        const dx = this.x - fromX;
        const dy = this.y - fromY;
        const dist = Math.hypot(dx, dy) || 1;
        this.pushedByPlayerTimer = 1.8;
        return this.applyDamageHit(dx / dist, dy / dist, 290, label, 99, onWolfAction);
    }

    applyWhistle(wx, wy, radius, opts, onWolfAction) {
        if (this.isDone || !this.container || this.state === 'warning' || this.state === 'flee') return false;
        const dx = this.x - wx;
        const dy = this.y - wy;
        const dist = Math.hypot(dx, dy);
        if (dist > radius) return false;

        const outDist = Math.hypot(this.x, this.y) || 1;
        const dirX = dist > 5 ? dx / dist : this.x / outDist;
        const dirY = dist > 5 ? dy / dist : this.y / outDist;

        this.pushedByPlayerTimer = 1.9;

        if (opts.hasArcticStorm) {
            this.stunTimer = Math.max(this.stunTimer, 1.45);
            this.frostTimer = Math.max(this.frostTimer, 3.0);
            this.body.setTint(0x38bdf8);
            this.showStatusBadge('badge_arctic');
            const dmg = opts.isFever ? 2 : 1;
            return this.applyDamageHit(dirX, dirY, 330, 'arctic', dmg, onWolfAction);
        }

        if (opts.shockLevel > 0) {
            this.stunTimer = Math.max(this.stunTimer, 0.9 + opts.shockLevel * 0.35);
            this.showStatusBadge('badge_shock');
        }

        const dmg = opts.isFever ? 2 : 1;
        return this.applyDamageHit(dirX, dirY, 265, 'player', dmg, onWolfAction);
    }

    applySwipe(x1, y1, x2, y2, dirX, dirY, radius, opts, onWolfAction) {
        if (this.isDone || !this.container || this.state === 'warning' || this.state === 'flee') return false;
        const dist = distToSegment(this.x, this.y, x1, y1, x2, y2);
        if (dist > radius) return false;

        this.pushedByPlayerTimer = 1.9;

        if (opts.frostLevel > 0) {
            this.frostTimer = Math.max(this.frostTimer, 1.8 + opts.frostLevel * 0.6);
        }
        const dmg = opts.isFever ? 2 : 1;
        return this.applyDamageHit(dirX, dirY, 240, 'player', dmg, onWolfAction);
    }

    playHitSquash() {
        if (!this.body || !this.body.scene || !this.scene?.tweens) return;
        this.scene.tweens.killTweensOf(this.body);
        this.body.setScale(this.cfg.scale);
        this.scene.tweens.add({
            targets: this.body,
            scaleX: this.cfg.scale * 0.76,
            scaleY: this.cfg.scale * 1.24,
            duration: 95,
            yoyo: true,
            ease: 'Quad.easeOut',
        });
    }

    applyDamageHit(dirX, dirY, force, source, damage, onWolfAction) {
        if (!this.container) return false;
        const now = this.scene.time.now;
        if (damage < 50 && now - this.lastHitTime < 260 && this.state !== 'carrying') return false;
        this.lastHitTime = now;

        const kb = force * this.cfg.knockbackResistance;
        this.pushVx = dirX * kb;
        this.pushVy = dirY * kb;
        this.playHitSquash();

        let rescued = false;
        if (this.state === 'carrying' && this.capturedSheep) {
            this.capturedSheep.releaseFromWolf(this.shapeId, this.scene.terrain);
            this.capturedSheep = null;
            rescued = true;
            if (this.type !== 'alpha' || damage >= 50) {
                this.state = 'flee';
                this.hpGfx.clear();
                this.statusBadge.setVisible(false);
                if (onWolfAction) {
                    const msg =
                        source === 'dog'
                            ? 'سگ نجاتش داد!'
                            : source === 'fire_ram'
                                ? 'قوچ آتشین نجاتش داد!'
                                : source === 'ram'
                                    ? 'شاخ قوچ نجاتش داد!'
                                    : source === 'bees'
                                        ? 'زنبورها نجاتش دادند!'
                                        : 'نجات دادی!';
                    onWolfAction({ type: 'rescued', wolf: this, x: this.x, y: this.y, message: msg });
                }
                return true;
            }
            this.state = 'hunt';
        }

        this.scareHits += damage;
        this.body.setTint(0xffadad);
        this.scene.time.delayedCall(120, () => {
            if (this.body && this.body.scene && this.container) {
                if (this.frostTimer > 0) this.body.setTint(0x93c5fd);
                else this.body.clearTint();
            }
        });

        if (this.scareHits >= this.hitsToScare) {
            this.state = 'flee';
            this.hpGfx.clear();
            this.statusBadge.setVisible(false);
            if (onWolfAction) {
                const msg =
                    source === 'lightning'
                        ? 'برخورد صاعقه!'
                        : source === 'thorn' || source === 'flower_mine'
                            ? 'تله گل انفجاری!'
                            : source === 'bees'
                                ? 'حمله زنبورها!'
                                : source === 'fire_ram'
                                    ? 'قوچ آتشین!'
                                    : source === 'arctic'
                                        ? 'طوفان قطبی!'
                                        : this.type === 'alpha'
                                            ? 'آلفا شکست خورد!'
                                            : source === 'dog'
                                                ? 'پارس سگ گله!'
                                                : source === 'ram'
                                                    ? 'ضربه شاخ قوچ!'
                                                    : 'گرگ فرار کرد!';
                onWolfAction({
                    type: rescued ? 'rescued' : 'scared',
                    wolf: this,
                    x: this.x,
                    y: this.y,
                    message: msg,
                });
            }
        } else if (rescued && onWolfAction) {
            onWolfAction({ type: 'hit', wolf: this, x: this.x, y: this.y, message: 'گوسفند آزاد شد!' });
        } else if (source === 'fire_ram' && onWolfAction) {
            onWolfAction({ type: 'hit', wolf: this, x: this.x, y: this.y, message: 'ضربه آتشین!' });
        } else if (source === 'ram' && onWolfAction) {
            onWolfAction({ type: 'hit', wolf: this, x: this.x, y: this.y, message: 'ضربه قوچ!' });
        } else if (source === 'dog' && onWolfAction) {
            onWolfAction({ type: 'hit', wolf: this, x: this.x, y: this.y, message: 'پارس!' });
        }

        this.drawHpPips();
        return true;
    }

    findBestTarget(allSheep) {
        let best = null;
        let bestScore = Infinity;

        for (const s of allSheep) {
            if (!s.container || !s.isAlive || s.state === 'captured' || s.state === 'floating') continue;
            let dist = Math.hypot(s.x - this.x, s.y - this.y);
            if (s.state === 'sleep') dist *= 0.65;
            if (s.type === 'golden') dist *= 0.72;
            if (s.type === 'ram') dist *= 1.35;
            if (dist < bestScore) {
                bestScore = dist;
                best = s;
            }
        }
        return best;
    }

    update(dt, allSheep, ctx = {}) {
        if (this.isDone || !this.container || !this.body || !this.body.scene) return;
        const {
            tideOffset = 0,
            flowers = [],
            hasFlowerMine = false,
            onSheepStolen = null,
            onWolfAction = null,
        } = ctx;

        if (this.state === 'warning') {
            this.warningTimer -= dt;
            if (this.warningTimer <= 0) {
                if (this.alertSprite) {
                    this.alertSprite.destroy();
                    this.alertSprite = null;
                }
                this.container.setVisible(true);
                this.body.setScale(0.2);
                this.scene.tweens.add({
                    targets: this.body,
                    scale: this.cfg.scale,
                    duration: 240,
                    ease: 'Back.easeOut',
                });
                this.state = 'hunt';
                this.drawHpPips();
            }
            return;
        }

        if (this.pushedByPlayerTimer > 0) this.pushedByPlayerTimer -= dt;

        if (this.frostTimer > 0) {
            this.frostTimer -= dt;
            if (this.frostTimer <= 0) this.body.clearTint();
        }

        const damping = Math.exp(-5.0 * dt);
        this.pushVx *= damping;
        this.pushVy *= damping;

        let moveVx = 0;
        let moveVy = 0;

        if (this.stunTimer > 0 && this.state !== 'flee') {
            this.stunTimer -= dt;
            this.body.x = Math.sin(this.scene.time.now * 0.06) * 2.2;
            if (this.stunTimer <= 0) {
                this.body.x = 0;
                this.statusBadge.setVisible(false);
            }
        } else {
            this.body.x = 0;
            // عوامل طبیعی (گل‌ولای، شیب، آبگیر) روی گرگ تاثیر ندارند — فقط کارت باد یخی بازیکن اثر دارد
            const frostMul = this.frostTimer > 0 ? 0.5 : 1.0;

            if (this.state === 'hunt') {
                const target = this.findBestTarget(allSheep);
                if (!target) {
                    this.state = 'flee';
                } else {
                    const dx = target.x - this.x;
                    const dy = target.y - this.y;
                    const dist = Math.hypot(dx, dy) || 1;
                    const spd = this.cfg.huntSpeed * this.speedScale * frostMul;
                    moveVx = (dx / dist) * spd;
                    moveVy = (dy / dist) * spd;

                    if (dist < WOLF_CONFIG.CATCH_DIST) {
                        this.state = 'carrying';
                        this.capturedSheep = target;
                        target.captureByWolf();
                        sound.playBaa('scared');
                    }
                }
            }

            if (this.state === 'carrying') {
                if (!this.capturedSheep || !this.capturedSheep.container) {
                    this.capturedSheep = null;
                    this.state = 'hunt';
                } else {
                    const outAngle = Math.atan2(this.y, this.x);
                    const spd = this.cfg.carrySpeed * Math.min(1.35, this.speedScale) * frostMul;
                    moveVx = Math.cos(outAngle) * spd;
                    moveVy = Math.sin(outAngle) * spd;

                    this.capturedSheep.container.x = this.x + Math.cos(this.facingAngle) * 16;
                    this.capturedSheep.container.y = this.y + Math.sin(this.facingAngle) * 16 - 9;
                    this.capturedSheep.container.setDepth(this.container.depth + 0.6);

                    if (Math.hypot(this.x, this.y) > 335) {
                        this.isDone = true;
                        this.capturedSheep.finishStolen();
                        this.capturedSheep = null;
                        if (onSheepStolen) onSheepStolen();
                        this.destroy();
                        return;
                    }
                }
            }
        }

        if (this.state === 'flee') {
            const outAngle = Math.atan2(this.y, this.x);
            moveVx = Math.cos(outAngle) * this.cfg.fleeSpeed;
            moveVy = Math.sin(outAngle) * this.cfg.fleeSpeed;

            if (Math.hypot(this.x, this.y) > 375) {
                this.isDone = true;
                this.destroy();
                return;
            }
        }

        const totalVx = moveVx + this.pushVx;
        const totalVy = moveVy + this.pushVy;

        this.container.x += totalVx * dt;
        this.container.y += totalVy * dt;

        // فقط دریای بیرونی جزیره (بدون آبگیر داخلی) باعث ناک‌اوت آبی گرگ می‌شود
        const outerZone = getZoneAt(this.x, this.y, this.shapeId, tideOffset, null);
        if (outerZone !== 'water') {
            this.hasEnteredLand = true;
        } else if (
            this.hasEnteredLand &&
            this.pushedByPlayerTimer > 0 &&
            (this.state === 'hunt' || this.state === 'carrying')
        ) {
            this.drownInWater(onWolfAction);
            return;
        }

        if (hasFlowerMine && (this.state === 'hunt' || this.state === 'carrying')) {
            const now = this.scene.time.now;
            for (const f of flowers) {
                if (!f.isAlive) continue;
                if (f._mineReadyAt && now < f._mineReadyAt) continue;
                if (Math.hypot(f.x - this.x, f.y - this.y) < 34) {
                    f._mineReadyAt = now + 4500;
                    const ring = this.scene.add
                        .image(f.x, f.y, 'whistle_ring')
                        .setDepth(22)
                        .setScale(0.1)
                        .setTint(0xf43f5e);
                    this.scene.tweens.add({
                        targets: ring,
                        scale: 0.72,
                        alpha: 0,
                        duration: 280,
                        onComplete: () => ring.destroy(),
                    });
                    const dx = this.x - f.x;
                    const dy = this.y - f.y;
                    const d = Math.hypot(dx, dy) || 1;
                    this.pushedByPlayerTimer = 1.8;
                    this.applyDamageHit(dx / d, dy / d, 320, 'flower_mine', 2, onWolfAction);
                    break;
                }
            }
        }

        const speed = Math.hypot(totalVx, totalVy);
        if (speed > 5) {
            const targetAngle = Math.atan2(totalVy, totalVx);
            this.facingAngle = Phaser.Math.Angle.RotateTo(this.facingAngle, targetAngle, dt * 10);
            this.body.rotation = this.facingAngle;

            this.runPhase += dt * (6 + speed * 0.06);
            this.body.y = -Math.abs(Math.sin(this.runPhase)) * 3.5;

            if (speed > 95 && this.hasEnteredLand) {
                this.dustTimer -= dt;
                if (this.dustTimer <= 0) {
                    this.dustTimer = 0.2;
                    this.spawnDust();
                }
            }
        }

        this.container.setDepth(11 + (this.y + 400) * 0.001);
    }

    destroy() {
        if (this.alertSprite) {
            this.alertSprite.destroy();
            this.alertSprite = null;
        }
        if (this.container) {
            this.scene?.tweens?.killTweensOf(this.body);
            this.container.destroy();
            this.container = null;
        }
    }
}