import Phaser from 'phaser';
import {
    BOSS_CONFIG,
    distToSegment,
    getRandomSafePoint,
    getSafeDirection,
    getZoneAt,
    rand,
} from '../config/gameData.js';
import { sound } from '../utils/SoundGen.js';

export class BossManager {
    constructor(scene, bossType, day, shapeId, callbacks = {}) {
        this.scene = scene;
        this.bossType = bossType;
        this.day = day;
        this.shapeId = shapeId;
        this.callbacks = callbacks;
        this.cfg = BOSS_CONFIG[bossType] || BOSS_CONFIG.kraken;

        const extraHp =
            bossType === 'kraken'
                ? Math.max(0, Math.floor((day - 5) * 2.2))
                : Math.max(0, Math.floor((day - 10) * 2.5));

        this.maxHp = this.cfg.baseHp + extraHp;
        this.hp = this.maxHp;
        this.phase = 1;
        this.isDefeated = false;

        this.gfx = scene.add.graphics().setDepth(21);

        // حالت کراکن
        this.krakenHead = null;
        this.tentacles = [];
        this.tentacleTimer = 1.6;
        this.bossSummonTimer = 8.5;
        this.suctionPulse = 0;

        // حالت شاه گرگ‌ها
        this.king = null;
        this.kingDashTimer = 2.6;
        this.kingHowlTimer = 6.5;
        this.kingSummonTimer = 4.6;

        this.createBossHud();
        sound.playBossRoar();

        if (bossType === 'kraken') {
            this.initKraken();
        } else {
            this.initWolfKing();
        }
    }

    createBossHud() {
        document.getElementById('boss-hud')?.remove();
        const slot = document.getElementById('boss-hud-slot') || document.body;

        const el = document.createElement('div');
        el.id = 'boss-hud';
        el.innerHTML = `
      <div class="boss-hud-top">
        <span class="boss-hud-name">${this.cfg.name}</span>
        <span class="boss-hud-phase" id="boss-phase-tag">فاز ۱</span>
        <span class="boss-hud-hp" id="boss-hp-text">${this.hp}/${this.maxHp}</span>
      </div>
      <div class="boss-hud-bar">
        <div id="boss-hp-fill" class="boss-hud-fill" style="width:100%;"></div>
      </div>
    `;
        slot.appendChild(el);
    }

    updateBossHud() {
        const fill = document.getElementById('boss-hp-fill');
        const txt = document.getElementById('boss-hp-text');
        const ph = document.getElementById('boss-phase-tag');
        if (fill) {
            const pct = Math.max(0, (this.hp / this.maxHp) * 100);
            fill.style.width = `${pct}%`;
            fill.style.background =
                this.phase === 3
                    ? 'linear-gradient(90deg, #ef4444, #f97316)'
                    : this.phase === 2
                        ? 'linear-gradient(90deg, #d946ef, #f43f5e)'
                        : 'linear-gradient(90deg, #a855f7, #ec4899)';
        }
        if (txt) txt.textContent = `${Math.max(0, this.hp)}/${this.maxHp}`;
        if (ph) ph.textContent = this.phase === 3 ? 'فاز نهایی!' : `فاز ${this.phase}`;
    }

    checkPhaseTransition() {
        const ratio = this.hp / this.maxHp;
        const nextPhase = ratio <= 0.34 ? 3 : ratio <= 0.67 ? 2 : 1;
        if (nextPhase <= this.phase) return;

        this.phase = nextPhase;
        this.updateBossHud();
        sound.playBossRoar();
        this.scene.cameras.main.shake(260, 0.0065);

        if (this.bossType === 'kraken') {
            if (this.phase === 2) {
                this.scene.showFloatingText(0, -100, 'فاز ۲: مکش اقیانوس فعال شد!', '#f0abfc');
                this.tentacleTimer = 0.6;
            } else {
                this.scene.showFloatingText(0, -100, 'فاز نهایی: طوفان شاخک‌های زره‌دار!', '#fb7185');
                this.tentacleTimer = 0.4;
                if (this.krakenHead) this.krakenHead.setTint(0xfda4af);
            }
        } else {
            if (this.phase === 2) {
                this.scene.showFloatingText(0, -100, 'فاز ۲: یورش دوگانه شاه گرگ‌ها!', '#fca5a5');
                this.kingDashTimer = 0.8;
            } else {
                this.scene.showFloatingText(0, -100, 'فاز نهایی: خشم شاه گرگ‌ها!', '#ef4444');
                this.kingDashTimer = 0.5;
                if (this.king?.body) this.king.body.setTint(0xfca5a5);
            }
        }
    }

    damageBoss(amount, fxX, fxY, customMsg = null, rewardGold = 3) {
        if (this.isDefeated) return;
        this.hp = Math.max(0, this.hp - amount);
        this.updateBossHud();
        sound.playBossHit();

        if (this.krakenHead && this.bossType === 'kraken') {
            const orb = this.scene.add
                .image(fxX, fxY, 'star_particle')
                .setDepth(30)
                .setScale(0.6)
                .setTint(0xf0abfc);
            this.scene.tweens.add({
                targets: orb,
                x: this.krakenHead.x,
                y: this.krakenHead.y,
                duration: 280,
                ease: 'Quad.easeIn',
                onComplete: () => {
                    orb.destroy();
                    if (this.krakenHead) {
                        this.krakenHead.setTint(0xffffff);
                        this.scene.tweens.add({
                            targets: this.krakenHead,
                            scale: 1.24,
                            duration: 90,
                            yoyo: true,
                        });
                        this.scene.time.delayedCall(120, () => {
                            if (this.krakenHead && !this.isDefeated) {
                                if (this.phase === 3) this.krakenHead.setTint(0xfda4af);
                                else this.krakenHead.clearTint();
                            }
                        });
                    }
                },
            });
        }

        if (this.callbacks.onBossHitBonus && rewardGold > 0) {
            this.callbacks.onBossHitBonus(fxX, fxY, rewardGold, customMsg || 'ضربه به باس!');
        } else if (customMsg) {
            this.scene.showFloatingText(fxX, fxY, customMsg, '#fde047');
        }

        if (this.hp <= 0) {
            this.defeatBoss();
            return;
        }

        this.checkPhaseTransition();
    }

    defeatBoss() {
        this.isDefeated = true;
        sound.playEvolution();
        this.scene.cameras.main.shake(380, 0.0085);

        const fxX = this.bossType === 'kraken' ? (this.krakenHead?.x || 0) : (this.king?.x || 0);
        const fxY = this.bossType === 'kraken' ? (this.krakenHead?.y || -180) : (this.king?.y || 0);

        for (let i = 0; i < 18; i++) {
            const a = (i / 18) * Math.PI * 2;
            const star = this.scene.add
                .image(fxX, fxY, 'star_particle')
                .setDepth(35)
                .setScale(0.62)
                .setTint(i % 2 === 0 ? 0xfde047 : 0xc084fc);
            this.scene.tweens.add({
                targets: star,
                x: fxX + Math.cos(a) * 115,
                y: fxY + Math.sin(a) * 115,
                alpha: 0,
                rotation: 2.8,
                duration: 650,
                ease: 'Cubic.easeOut',
                onComplete: () => star.destroy(),
            });
        }

        if (this.krakenHead) {
            this.scene.tweens.add({
                targets: this.krakenHead,
                scale: 0.1,
                alpha: 0,
                duration: 600,
                onComplete: () => {
                    this.krakenHead?.destroy();
                    this.krakenHead = null;
                },
            });
        }

        for (const t of this.tentacles) {
            t.sprite?.destroy();
        }
        this.tentacles = [];

        if (this.king?.container) {
            if (this.king.capturedSheep) {
                this.king.capturedSheep.releaseFromWolf(this.shapeId);
                this.king.capturedSheep = null;
            }
            const c = this.king.container;
            this.king.container = null;
            this.scene.tweens.add({
                targets: c,
                scale: 0.15,
                alpha: 0,
                rotation: 5,
                duration: 600,
                onComplete: () => c.destroy(),
            });
        }

        this.scene.showFloatingText(0, -90, `${this.cfg.name} شکست خورد!`, '#4ade80');
        if (this.callbacks.onBossDefeated) {
            this.callbacks.onBossDefeated(this.cfg.bounty);
        }
    }

    // =========================================================
    // باس ۱: اختاپوس دریایی (کراکن) — کاملاً واضح و ۳ فازه
    // =========================================================
    initKraken() {
        // قرارگیری دقیق سر کراکن در لبه شمالی آب (کاملاً پایین‌تر از نوار HUD و در دید کامل بازیکن)
        this.krakenBaseY = -246;
        this.krakenHead = this.scene.add
            .image(0, this.krakenBaseY, 'kraken_head')
            .setDepth(16)
            .setScale(0.15);

        this.scene.tweens.add({
            targets: this.krakenHead,
            scale: 1.08,
            duration: 460,
            ease: 'Back.easeOut',
        });
    }

    spawnTentacle(sheepList, tideOffset) {
        const alive = sheepList.filter((s) => s.container && s.isAlive && s.state !== 'captured' && s.state !== 'floating');
        let pt;

        // هدف‌گیری هوشمند کنار گوسفندها برای ایجاد فشار واقعی
        if (alive.length > 0 && rand() < 0.72) {
            const target = alive[Math.floor(rand() * alive.length)];
            const a = rand() * Math.PI * 2;
            const d = 16 + rand() * 34;
            const tx = target.x + Math.cos(a) * d;
            const ty = target.y + Math.sin(a) * d;
            pt = getZoneAt(tx, ty, this.shapeId, tideOffset) !== 'water' ? { x: tx, y: ty } : { x: target.x, y: target.y };
        } else {
            pt = getRandomSafePoint(this.shapeId, tideOffset + 12);
        }

        const roll = rand();
        let maxHits = 1;
        if (this.phase === 3) {
            maxHits = roll < 0.3 ? 3 : roll < 0.8 ? 2 : 1;
        } else if (this.phase === 2) {
            maxHits = roll < 0.58 ? 2 : 1;
        } else {
            maxHits = roll < 0.3 ? 2 : 1;
        }

        const slamDelay =
            this.phase === 3
                ? 1.38
                : this.phase === 2
                    ? 1.56
                    : this.cfg.slamDelay;

        const sprite = this.scene.add
            .image(pt.x, pt.y, 'kraken_tentacle')
            .setDepth(17)
            .setScale(0.1);

        if (maxHits === 3) sprite.setTint(0xfbbf24);
        else if (maxHits === 2) sprite.setTint(0xf472b6);

        this.scene.tweens.add({
            targets: sprite,
            scale: maxHits >= 2 ? 1.02 : 0.88,
            duration: 210,
            ease: 'Back.easeOut',
        });

        this.tentacles.push({
            x: pt.x,
            y: pt.y,
            sprite,
            hp: maxHits,
            maxHp: maxHits,
            timer: slamDelay,
            maxTimer: slamDelay,
            radius: maxHits >= 2 ? 48 : 42,
            lastHitTime: 0,
            done: false,
        });
    }

    executeTentacleSlam(t, sheepList) {
        sound.playHeadbutt();
        this.scene.cameras.main.shake(150, 0.0045);

        const ring = this.scene.add
            .image(t.x, t.y, 'whistle_ring')
            .setDepth(22)
            .setScale(0.1)
            .setTint(0xc084fc);
        this.scene.tweens.add({
            targets: ring,
            scale: 0.72,
            alpha: 0,
            duration: 300,
            onComplete: () => ring.destroy(),
        });

        let grabbedOne = false;
        for (const s of sheepList) {
            if (!s.container || !s.isAlive || s.state === 'captured' || s.state === 'floating') continue;
            const d = Math.hypot(s.x - t.x, s.y - t.y);
            if (!grabbedOne && d < 28) {
                // شاخک گوسفند را مستقیم به اعماق می‌کشد!
                grabbedOne = true;
                s.finishStolen();
                sound.playBaa('scared');
                this.scene.showFloatingText(t.x, t.y, 'کراکن گوسفند را بلعید!', '#fca5a5');
                if (this.callbacks.onSheepLost) this.callbacks.onSheepLost();
            } else if (d < t.radius + 45) {
                // بقیه گوسفندهای نزدیک را با قدرت به سمت لبه‌های آب پرتاب می‌کند
                const safe = getSafeDirection(s.x, s.y, this.shapeId);
                s.applyBlast(-safe.x, -safe.y, 265);
            }
        }
    }

    // =========================================================
    // باس ۲: شاه گرگ‌ها — یورش‌های پیاپی، موج زوزه و احضار گله
    // =========================================================
    initWolfKing() {
        const container = this.scene.add.container(0, -240);
        const shadow = this.scene.add.image(0, 10, 'shadow_soft').setScale(1.45);
        const body = this.scene.add.image(0, 0, 'wolf_king').setScale(1.32);
        container.add([shadow, body]);
        container.setDepth(18);

        this.king = {
            container,
            body,
            shadow,
            x: 0,
            y: -240,
            vx: 0,
            vy: 0,
            pushVx: 0,
            pushVy: 0,
            facingAngle: Math.PI / 2,
            state: 'chase', // 'chase' | 'telegraph' | 'dash' | 'carrying'
            stateTimer: 0,
            dashChainLeft: 0,
            dashDirX: 0,
            dashDirY: 1,
            capturedSheep: null,
            lastHitTime: 0,
            pushedTimer: 0,
            hasEnteredLand: false,
            stunTimer: 0,
        };
    }

    startKingTelegraph(sheepList) {
        const k = this.king;
        if (!k) return;
        const alive = sheepList.filter((s) => s.container && s.isAlive && s.state !== 'captured' && s.state !== 'floating');
        const target = alive.length > 0 ? alive[Math.floor(rand() * alive.length)] : { x: 0, y: 0 };
        const dx = target.x - k.x;
        const dy = target.y - k.y;
        const len = Math.hypot(dx, dy) || 1;

        k.dashDirX = dx / len;
        k.dashDirY = dy / len;
        k.facingAngle = Math.atan2(dy, dx);
        k.body.rotation = k.facingAngle;
        k.state = 'telegraph';
        k.stateTimer = this.phase === 3 ? 0.58 : 0.72;
        sound.playHowl(true, false);
    }

    triggerKingHowlWave(sheepList) {
        const k = this.king;
        if (!k) return;
        sound.playBossRoar();
        this.scene.cameras.main.shake(180, 0.005);
        this.scene.showFloatingText(k.x, k.y - 30, 'زوزه شاه گرگ‌ها!', '#fca5a5');

        const ring = this.scene.add
            .image(k.x, k.y, 'whistle_ring')
            .setDepth(22)
            .setScale(0.15)
            .setTint(0xef4444);
        this.scene.tweens.add({
            targets: ring,
            scale: 1.65,
            alpha: 0,
            duration: 420,
            onComplete: () => ring.destroy(),
        });

        // موج زوزه گوسفندها را به سمت ساحل و دریا هل می‌دهد!
        for (const s of sheepList) {
            if (!s.container || !s.isAlive || s.state === 'captured' || s.state === 'floating') continue;
            if (Math.hypot(s.x - k.x, s.y - k.y) < 230) {
                const safe = getSafeDirection(s.x, s.y, this.shapeId);
                s.applyBlast(-safe.x, -safe.y, this.phase === 3 ? 215 : 175);
            }
        }
    }

    hitBossElement(x, y, radius, isFever, segment = null) {
        if (this.isDefeated) return;
        const now = this.scene.time.now;

        if (this.bossType === 'kraken') {
            for (const t of this.tentacles) {
                if (t.done || now - t.lastHitTime < 220) continue;
                const dist = segment
                    ? distToSegment(t.x, t.y, segment.x1, segment.y1, segment.x2, segment.y2)
                    : Math.hypot(t.x - x, t.y - y);
                if (dist <= radius + 12) {
                    t.lastHitTime = now;
                    const dmg = isFever ? 2 : 1;
                    t.hp -= dmg;

                    this.scene.tweens.add({
                        targets: t.sprite,
                        scale: 1.15,
                        duration: 75,
                        yoyo: true,
                    });

                    if (t.hp <= 0) {
                        t.done = true;
                        t.sprite?.destroy();
                        const bossDmg = t.maxHp >= 2 ? 2 : 1;
                        this.damageBoss(
                            bossDmg,
                            t.x,
                            t.y,
                            bossDmg >= 2 ? 'شاخک زره‌دار خرد شد!' : 'شاخک نابود شد!',
                            bossDmg >= 2 ? 4 : 2
                        );
                    } else {
                        sound.playBossHit();
                        this.scene.showFloatingText(t.x, t.y - 18, `زره شاخک (${t.hp})`, '#f472b6');
                    }
                }
            }
            this.tentacles = this.tentacles.filter((t) => !t.done);
            return;
        }

        if (this.bossType === 'wolf_king' && this.king && this.king.container) {
            const k = this.king;
            if (now - k.lastHitTime < 280) return;
            const dist = segment
                ? distToSegment(k.x, k.y, segment.x1, segment.y1, segment.x2, segment.y2)
                : Math.hypot(k.x - x, k.y - y);
            if (dist <= radius + 14) {
                k.lastHitTime = now;
                k.pushedTimer = 1.6;
                const dx = k.x - x;
                const dy = k.y - y;
                const len = Math.hypot(dx, dy) || 1;
                const kb = isFever ? 300 : 225;
                k.pushVx = (dx / len) * kb;
                k.pushVy = (dy / len) * kb;

                if (k.capturedSheep) {
                    k.capturedSheep.releaseFromWolf(this.shapeId);
                    k.capturedSheep = null;
                    k.state = 'chase';
                }

                k.body.setTint(0xffffff);
                this.scene.time.delayedCall(110, () => {
                    if (k.body && k.body.scene && !this.isDefeated) {
                        if (this.phase === 3) k.body.setTint(0xfca5a5);
                        else k.body.clearTint();
                    }
                });

                const dmg = isFever ? 2 : 1;
                this.damageBoss(dmg, k.x, k.y, 'ضربه به شاه گرگ‌ها!', 3);
            }
        }
    }

    handlePlayerWhistle(x, y, radius, isFever) {
        this.hitBossElement(x, y, radius, isFever, null);
    }

    handlePlayerSwipe(x1, y1, x2, y2, radius, isFever) {
        this.hitBossElement(x2, y2, radius, isFever, { x1, y1, x2, y2 });
    }

    update(dt, time, sheepList, flowerList, tideOffset) {
        if (this.isDefeated) return;
        this.gfx.clear();

        if (this.bossType === 'kraken') {
            this.updateKraken(dt, time, sheepList, tideOffset);
        } else {
            this.updateWolfKing(dt, time, sheepList, tideOffset);
        }
    }

    updateKraken(dt, time, sheepList, tideOffset) {
        // انیمیشن زنده سر کراکن روی آب در بخش بالایی (کاملاً مرئی)
        if (this.krakenHead) {
            this.krakenHead.x = Math.sin(time * 0.0014) * 58;
            this.krakenHead.y = this.krakenBaseY + Math.sin(time * 0.0032) * 8;
            this.krakenHead.rotation = Math.sin(time * 0.002) * 0.09;
        }

        // مکش اقیانوس در فاز ۲ و ۳ (گله را به سمت آب می‌کشد!)
        if (this.phase >= 2) {
            this.suctionPulse += dt * (this.phase === 3 ? 4.5 : 3.0);
            const pullForce = this.phase === 3 ? 52 : 32;
            const ringR = 250 - ((this.suctionPulse * 40) % 140);
            this.gfx.lineStyle(3, this.phase === 3 ? 0xf43f5e : 0xa855f7, 0.25);
            this.gfx.strokeCircle(0, 0, ringR);

            for (const s of sheepList) {
                if (!s.container || !s.isAlive || s.state === 'captured' || s.state === 'floating') continue;
                const safe = getSafeDirection(s.x, s.y, this.shapeId);
                s.vx -= safe.x * pullForce * dt;
                s.vy -= safe.y * pullForce * dt;
            }
        }

        // احضار گرگ پشتیبان در فاز ۲ و ۳
        if (this.phase >= 2 && this.callbacks.onSummonWolf) {
            this.bossSummonTimer -= dt;
            if (this.bossSummonTimer <= 0) {
                this.bossSummonTimer = this.phase === 3 ? 6.0 : 8.0;
                this.callbacks.onSummonWolf(this.phase === 3 ? 'swift' : 'normal');
            }
        }

        // احضار موج شاخک‌ها
        this.tentacleTimer -= dt;
        const maxSimultaneous = this.phase === 3 ? 4 : this.phase === 2 ? 3 : 2;
        if (this.tentacleTimer <= 0 && this.tentacles.length < maxSimultaneous + 1) {
            const batch = this.phase === 3 ? 3 : this.phase === 2 ? 2 : 2;
            for (let i = 0; i < batch; i++) {
                if (this.tentacles.length < maxSimultaneous + 1) {
                    this.spawnTentacle(sheepList, tideOffset);
                }
            }
            this.tentacleTimer =
                this.phase === 3
                    ? 1.75
                    : this.phase === 2
                        ? 2.05
                        : this.cfg.tentacleInterval;
        }

        // آپدیت شاخک‌ها و کشیدن دایره هشدار و نقاط جان
        for (const t of this.tentacles) {
            if (t.done) continue;
            t.timer -= dt;
            const ratio = 1 - Math.max(0, t.timer / t.maxTimer);

            this.gfx.fillStyle(t.maxHp >= 2 ? 0xf43f5e : 0xa855f7, 0.16 + ratio * 0.28);
            this.gfx.fillCircle(t.x, t.y, t.radius);
            this.gfx.lineStyle(3.5, ratio > 0.72 ? 0xef4444 : 0xe879f9, 0.95);
            this.gfx.strokeCircle(t.x, t.y, t.radius * (1.28 - ratio * 0.28));

            // نمایش خط اتصال نامرئی/کم‌رنگ به سمت سر کراکن
            if (this.krakenHead) {
                this.gfx.lineStyle(2, 0xc084fc, 0.16);
                this.gfx.lineBetween(this.krakenHead.x, this.krakenHead.y + 24, t.x, t.y);
            }

            // نمایش دایره‌های زره برای شاخک‌های چندضربه‌ای
            if (t.maxHp > 1) {
                const gap = 10;
                const sx = t.x - ((t.maxHp - 1) * gap) / 2;
                const py = t.y - 34;
                for (let i = 0; i < t.maxHp; i++) {
                    this.gfx.fillStyle(0x0b0e14, 0.85);
                    this.gfx.fillCircle(sx + i * gap, py, 4.5);
                    if (i < t.hp) {
                        this.gfx.fillStyle(t.maxHp === 3 ? 0xfbbf24 : 0xf472b6, 1);
                        this.gfx.fillCircle(sx + i * gap, py, 3);
                    }
                }
            }

            if (t.sprite) {
                t.sprite.x = t.x + Math.sin(time * 0.025) * (ratio > 0.7 ? 3.5 : 1.5);
                t.sprite.rotation = Math.sin(time * 0.015) * 0.16;
            }

            if (t.timer <= 0) {
                t.done = true;
                t.sprite?.destroy();
                this.executeTentacleSlam(t, sheepList);
            }
        }
        this.tentacles = this.tentacles.filter((t) => !t.done);
    }

    updateWolfKing(dt, time, sheepList, tideOffset) {
        const k = this.king;
        if (!k || !k.container) return;

        if (k.pushedTimer > 0) k.pushedTimer -= dt;

        // احضار زیرمجموعه‌ها
        this.kingSummonTimer -= dt;
        if (this.kingSummonTimer <= 0 && this.callbacks.onSummonWolf) {
            this.kingSummonTimer = this.phase === 3 ? 3.8 : this.phase === 2 ? 4.4 : this.cfg.summonInterval;
            const wType = this.phase === 3 ? (rand() < 0.45 ? 'alpha' : 'swift') : this.phase === 2 ? 'swift' : 'normal';
            this.callbacks.onSummonWolf(wType);
        }

        // موج زوزه در فاز ۲ و ۳
        if (this.phase >= 2 && k.state === 'chase') {
            this.kingHowlTimer -= dt;
            if (this.kingHowlTimer <= 0) {
                this.kingHowlTimer = this.phase === 3 ? 5.8 : 7.8;
                this.triggerKingHowlWave(sheepList);
            }
        }

        const damping = Math.exp(-5.0 * dt);
        k.pushVx *= damping;
        k.pushVy *= damping;

        let moveVx = 0;
        let moveVy = 0;

        if (k.state === 'telegraph') {
            k.stateTimer -= dt;
            // کشیدن خط قرمز هشدار مسیر یورش
            this.gfx.lineStyle(6, 0xef4444, 0.55);
            this.gfx.lineBetween(k.x, k.y, k.x + k.dashDirX * 260, k.y + k.dashDirY * 260);
            this.gfx.lineStyle(2, 0xfef08a, 0.9);
            this.gfx.lineBetween(k.x, k.y, k.x + k.dashDirX * 260, k.y + k.dashDirY * 260);

            k.body.x = Math.sin(time * 0.06) * 2.5;
            if (k.stateTimer <= 0) {
                k.body.x = 0;
                k.state = 'dash';
                k.stateTimer = 0.62;
            }
        } else if (k.state === 'dash') {
            k.stateTimer -= dt;
            const dashSpd = this.phase === 3 ? 330 : this.phase === 2 ? 290 : 255;
            moveVx = k.dashDirX * dashSpd;
            moveVy = k.dashDirY * dashSpd;

            // گرفتن گوسفند در مسیر یورش
            for (const s of sheepList) {
                if (!s.container || !s.isAlive || s.state === 'captured' || s.state === 'floating') continue;
                if (Math.hypot(s.x - k.x, s.y - k.y) < 30) {
                    k.capturedSheep = s;
                    k.state = 'carrying';
                    k.dashChainLeft = 0;
                    s.captureByWolf();
                    sound.playBaa('scared');
                    break;
                }
            }

            if (k.state === 'dash' && k.stateTimer <= 0) {
                if (k.dashChainLeft > 0) {
                    k.dashChainLeft -= 1;
                    this.startKingTelegraph(sheepList);
                } else {
                    k.state = 'chase';
                    this.kingDashTimer = this.phase === 3 ? 2.1 : this.phase === 2 ? 2.6 : this.cfg.dashInterval;
                }
            }
        } else if (k.state === 'carrying') {
            if (!k.capturedSheep || !k.capturedSheep.container) {
                k.capturedSheep = null;
                k.state = 'chase';
            } else {
                const outA = Math.atan2(k.y, k.x);
                const spd = this.phase === 3 ? 92 : 76;
                moveVx = Math.cos(outA) * spd;
                moveVy = Math.sin(outA) * spd;

                k.capturedSheep.container.x = k.x + Math.cos(k.facingAngle) * 20;
                k.capturedSheep.container.y = k.y + Math.sin(k.facingAngle) * 20 - 10;
                k.capturedSheep.container.setDepth(k.container.depth + 0.6);

                if (Math.hypot(k.x, k.y) > 320) {
                    k.capturedSheep.finishStolen();
                    k.capturedSheep = null;
                    if (this.callbacks.onSheepLost) this.callbacks.onSheepLost();
                    k.state = 'chase';
                }
            }
        } else {
            // حالت تعقیب عادی + شمارش برای شروع یورش بعدی
            this.kingDashTimer -= dt;
            if (this.kingDashTimer <= 0) {
                k.dashChainLeft = this.phase === 3 ? 2 : this.phase === 2 ? 1 : 0;
                this.startKingTelegraph(sheepList);
            } else {
                let target = null;
                let bestD = Infinity;
                for (const s of sheepList) {
                    if (!s.container || !s.isAlive || s.state === 'captured' || s.state === 'floating') continue;
                    const d = Math.hypot(s.x - k.x, s.y - k.y);
                    if (d < bestD) {
                        bestD = d;
                        target = s;
                    }
                }
                if (target) {
                    const dx = target.x - k.x;
                    const dy = target.y - k.y;
                    const len = Math.hypot(dx, dy) || 1;
                    const spd = this.phase === 3 ? 115 : this.phase === 2 ? 98 : 84;
                    moveVx = (dx / len) * spd;
                    moveVy = (dy / len) * spd;

                    if (bestD < 28) {
                        k.capturedSheep = target;
                        k.state = 'carrying';
                        target.captureByWolf();
                        sound.playBaa('scared');
                    }
                }
            }
        }

        const totalVx = moveVx + k.pushVx;
        const totalVy = moveVy + k.pushVy;
        k.x += totalVx * dt;
        k.y += totalVy * dt;
        k.container.setPosition(k.x, k.y);

        const zone = getZoneAt(k.x, k.y, this.shapeId, tideOffset);
        if (zone !== 'water') {
            k.hasEnteredLand = true;
        } else if (k.hasEnteredLand && k.pushedTimer > 0 && k.state !== 'carrying') {
            // پرت شدن شاه گرگ‌ها به آب -> ۲ واحد آسیب و پرش برگشتی از سمت مخالف
            sound.playWolfSplash();
            k.hasEnteredLand = false;
            k.pushedTimer = 0;
            k.pushVx = 0;
            k.pushVy = 0;
            const oppAngle = Math.atan2(k.y, k.x) + Math.PI;
            k.x = Math.cos(oppAngle) * 260;
            k.y = Math.sin(oppAngle) * 260;
            k.container.setPosition(k.x, k.y);
            k.state = 'chase';
            this.damageBoss(2, k.x, k.y, 'سقوط شاه گرگ‌ها در آب! (-2)', 6);
            return;
        }

        // نگه داشتن شاه گرگ‌ها داخل کادر میدان
        const distFromCenter = Math.hypot(k.x, k.y);
        if (distFromCenter > 315 && k.state !== 'carrying') {
            k.x = (k.x / distFromCenter) * 315;
            k.y = (k.y / distFromCenter) * 315;
            k.container.setPosition(k.x, k.y);
        }

        const speed = Math.hypot(totalVx, totalVy);
        if (speed > 6 && k.state !== 'telegraph') {
            const ta = Math.atan2(totalVy, totalVx);
            k.facingAngle = Phaser.Math.Angle.RotateTo(k.facingAngle, ta, dt * 11);
            k.body.rotation = k.facingAngle;
            k.body.y = -Math.abs(Math.sin(time * 0.015)) * 4;
        }
        k.container.setDepth(18 + (k.y + 400) * 0.001);
    }

    destroy() {
        document.getElementById('boss-hud')?.remove();
        this.gfx?.destroy();
        this.krakenHead?.destroy();
        this.krakenHead = null;
        for (const t of this.tentacles) t.sprite?.destroy();
        this.tentacles = [];
        if (this.king?.container) {
            this.king.container.destroy();
            this.king.container = null;
        }
    }
}