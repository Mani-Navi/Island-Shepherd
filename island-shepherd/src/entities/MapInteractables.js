import {
    getRandomSafePoint,
    getRiskyEdgePoint,
    distToSegment,
    rand,
} from '../config/gameData.js';
import { sound } from '../utils/SoundGen.js';

export class MapInteractables {
    constructor(scene, shapeId, day, opts = {}) {
        this.scene = scene;
        this.shapeId = shapeId;
        this.day = day;
        this.hasGoldenZone = opts.hasGoldenZone !== undefined ? opts.hasGoldenZone : day >= 2;
        this.hasBeehives = opts.hasBeehives !== undefined ? opts.hasBeehives : day >= 3;

        this.zoneGfx = scene.add.graphics().setDepth(4);
        this.beeGfx = scene.add.graphics().setDepth(24);

        this.goldenZone = null;
        this.goldenSpawnTimer = 5.5;

        this.hives = [];
        this.swarmBursts = [];
        const hiveCount = opts.hiveCount !== undefined ? opts.hiveCount : this.hasBeehives ? (day >= 7 ? 2 : 1) : 0;
        if (this.hasBeehives && hiveCount > 0) {
            this.spawnBeehives(hiveCount);
        }
    }

    spawnBeehives(count) {
        for (let i = 0; i < count; i++) {
            let pt = getRandomSafePoint(this.shapeId, 34);
            for (let attempt = 0; attempt < 20; attempt++) {
                const candidate = getRandomSafePoint(this.shapeId, 34);
                const farFromCenter = Math.hypot(candidate.x, candidate.y) > 65;
                const farFromOthers = !this.hives.some(
                    (h) => Math.hypot(h.x - candidate.x, h.y - candidate.y) < 120
                );
                if (farFromCenter && farFromOthers) {
                    pt = candidate;
                    break;
                }
            }

            const sprite = this.scene.add
                .image(pt.x, pt.y, 'beehive')
                .setDepth(7)
                .setScale(0.1);

            this.scene.tweens.add({
                targets: sprite,
                scale: 0.78,
                duration: 380,
                ease: 'Back.easeOut',
            });

            this.hives.push({
                x: pt.x,
                y: pt.y,
                sprite,
                cooldown: 0,
                maxCooldown: 8.5,
                phase: rand() * Math.PI * 2,
            });
        }
    }

    spawnGoldenZone(tideOffset) {
        const pt = getRiskyEdgePoint(this.shapeId, tideOffset);
        const label = this.scene.add
            .text(pt.x, pt.y - 58, 'چراگاه طلایی', {
                fontFamily: 'Vazirmatn, sans-serif',
                fontSize: '13px',
                fontStyle: 'bold',
                color: '#fef08a',
                stroke: '#78350f',
                strokeThickness: 4,
                resolution: Math.min(window.devicePixelRatio || 1, 2.5),
            })
            .setOrigin(0.5)
            .setDepth(15);

        this.goldenZone = {
            x: pt.x,
            y: pt.y,
            radius: 56,
            life: 8.5,
            maxLife: 8.5,
            tickAcc: 0,
            sparkleAcc: 0,
            label,
        };

        this.scene.triggerDiscovery?.('golden_zone_intro');
    }

    handlePlayerPulse(x, y, radius, sheepList, wolfList, onWolfAction, segment = null) {
        for (const h of this.hives) {
            if (h.cooldown > 0) continue;
            const hit = segment
                ? distToSegment(h.x, h.y, segment.x1, segment.y1, segment.x2, segment.y2) <= 40
                : Math.hypot(h.x - x, h.y - y) <= Math.min(58, radius * 0.45);

            if (hit) {
                this.triggerBeeSwarm(h, sheepList, wolfList, onWolfAction);
            }
        }
    }

    triggerBeeSwarm(hive, sheepList, wolfList, onWolfAction) {
        hive.cooldown = hive.maxCooldown;
        sound.playBeeBuzz();

        this.scene.tweens.add({
            targets: hive.sprite,
            scale: 1.0,
            duration: 95,
            yoyo: true,
        });

        const bees = [];
        for (let i = 0; i < 16; i++) {
            const a = (i / 16) * Math.PI * 2 + rand() * 0.3;
            const spd = 115 + rand() * 110;
            bees.push({
                x: hive.x,
                y: hive.y,
                vx: Math.cos(a) * spd,
                vy: Math.sin(a) * spd,
            });
        }
        this.swarmBursts.push({ x: hive.x, y: hive.y, life: 0.9, maxLife: 0.9, bees });

        let hitWolves = 0;
        for (const w of wolfList) {
            if (w.isDone || w.state === 'warning' || w.state === 'flee') continue;
            if (Math.hypot(w.x - hive.x, w.y - hive.y) <= 150) {
                if (w.scareByBees(hive.x, hive.y, onWolfAction)) hitWolves++;
            }
        }

        for (const s of sheepList) {
            if (!s.canBeHerded()) continue;
            if (Math.hypot(s.x - hive.x, s.y - hive.y) <= 88) {
                s.applyBeePanic(hive.x, hive.y);
            }
        }

        if (hitWolves === 0) {
            this.scene.showFloatingText(hive.x, hive.y - 22, 'زنبورها آزاد شدند!', '#fde047');
        }
    }

    update(dt, time, tideOffset, sheepList, goldMul, onGoldenZoneTick) {
        this.zoneGfx.clear();
        this.beeGfx.clear();

        if (this.hasGoldenZone) {
            if (!this.goldenZone) {
                this.goldenSpawnTimer -= dt;
                if (this.goldenSpawnTimer <= 0) {
                    this.spawnGoldenZone(tideOffset);
                    this.goldenSpawnTimer = 14 + rand() * 4;
                }
            } else {
                const gz = this.goldenZone;
                gz.life -= dt;
                if (gz.life <= 0) {
                    gz.label?.destroy();
                    this.goldenZone = null;
                } else {
                    const ratio = gz.life / gz.maxLife;
                    const pulse = 1 + Math.sin(time * 0.008) * 0.06;

                    this.zoneGfx.fillStyle(0xfde047, 0.25);
                    this.zoneGfx.fillCircle(gz.x, gz.y, gz.radius * pulse);
                    this.zoneGfx.fillStyle(0xfef08a, 0.16);
                    this.zoneGfx.fillCircle(gz.x, gz.y, gz.radius * 0.62 * pulse);
                    this.zoneGfx.lineStyle(3.5, 0xf59e0b, 0.92);
                    this.zoneGfx.strokeCircle(gz.x, gz.y, gz.radius * pulse);

                    this.zoneGfx.lineStyle(4, 0xffffff, 0.92);
                    this.zoneGfx.beginPath();
                    this.zoneGfx.arc(
                        gz.x,
                        gz.y,
                        gz.radius + 5,
                        -Math.PI / 2,
                        -Math.PI / 2 + Math.PI * 2 * ratio,
                        false
                    );
                    this.zoneGfx.strokePath();

                    let sheepInside = 0;
                    for (const s of sheepList) {
                        if (!s.isAlive || s.state === 'captured' || s.state === 'floating') continue;
                        if (Math.hypot(s.x - gz.x, s.y - gz.y) <= gz.radius) {
                            sheepInside++;
                        }
                    }

                    gz.sparkleAcc += dt * (sheepInside > 0 ? 4.5 : 1.4);
                    if (gz.sparkleAcc >= 1) {
                        gz.sparkleAcc = 0;
                        const a = Math.random() * Math.PI * 2;
                        const rr = Math.random() * gz.radius * 0.85;
                        const st = this.scene.add
                            .image(gz.x + Math.cos(a) * rr, gz.y + Math.sin(a) * rr, 'star_particle')
                            .setDepth(14)
                            .setScale(0.24)
                            .setTint(0xfde047);
                        this.scene.tweens.add({
                            targets: st,
                            y: st.y - 24,
                            alpha: 0,
                            scale: 0.48,
                            rotation: 1.5,
                            duration: 520,
                            ease: 'Cubic.easeOut',
                            onComplete: () => st.destroy(),
                        });
                    }

                    if (sheepInside > 0) {
                        gz.tickAcc += dt * sheepInside;
                        if (gz.tickAcc >= 0.7) {
                            gz.tickAcc -= 0.7;
                            const amt = Math.max(2, Math.round(3 * goldMul));
                            sound.playCoin(2);
                            if (onGoldenZoneTick) onGoldenZoneTick(gz.x, gz.y, amt);
                        }
                    }
                }
            }
        }

        for (const h of this.hives) {
            if (h.cooldown > 0) {
                h.cooldown = Math.max(0, h.cooldown - dt);
                h.sprite.setAlpha(0.45);
                const readyRatio = 1 - h.cooldown / h.maxCooldown;
                this.beeGfx.lineStyle(3, 0xf59e0b, 0.9);
                this.beeGfx.beginPath();
                this.beeGfx.arc(
                    h.x,
                    h.y,
                    24,
                    -Math.PI / 2,
                    -Math.PI / 2 + Math.PI * 2 * readyRatio,
                    false
                );
                this.beeGfx.strokePath();
            } else {
                h.sprite.setAlpha(1);
                for (let i = 0; i < 3; i++) {
                    const a = time * 0.005 + h.phase + (i * Math.PI * 2) / 3;
                    const bx = h.x + Math.cos(a) * 24;
                    const by = h.y + Math.sin(a * 1.4) * 16;
                    this.beeGfx.fillStyle(0xfde047, 1);
                    this.beeGfx.fillCircle(bx, by, 3);
                    this.beeGfx.fillStyle(0x0f172a, 1);
                    this.beeGfx.fillCircle(bx + 1.5, by, 1.5);
                }
            }
        }

        for (const sb of this.swarmBursts) {
            sb.life -= dt;
            if (sb.life <= 0) continue;
            const alpha = sb.life / sb.maxLife;
            this.beeGfx.lineStyle(2.5, 0xfbbf24, alpha * 0.65);
            this.beeGfx.strokeCircle(sb.x, sb.y, (1 - alpha) * 150);
            for (const b of sb.bees) {
                b.x += b.vx * dt;
                b.y += b.vy * dt;
                this.beeGfx.fillStyle(0xfde047, alpha);
                this.beeGfx.fillCircle(b.x, b.y, 3.5);
                this.beeGfx.fillStyle(0x111111, alpha);
                this.beeGfx.fillCircle(b.x + 2, b.y, 1.6);
            }
        }
        this.swarmBursts = this.swarmBursts.filter((sb) => sb.life > 0);
    }

    destroy() {
        this.zoneGfx?.destroy();
        this.beeGfx?.destroy();
        if (this.goldenZone?.label) this.goldenZone.label.destroy();
        for (const h of this.hives) h.sprite?.destroy();
        this.hives = [];
    }
}