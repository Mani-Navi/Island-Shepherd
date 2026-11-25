import { HAY_CONFIG, getRandomSafePoint, rand } from '../config/gameData.js';
import { sound } from '../utils/SoundGen.js';

export class ChaosDirector {
    constructor(scene) {
        this.scene = scene;
        this.gfx = scene.add.graphics().setDepth(26);
        this.eagles = [];
        this.lightnings = [];
        this.tornadoes = [];
        this.ufos = [];
        this.lastEventType = '';
        this.signatureTriggered = false;
    }

    findDensestCluster(sheepList, activeHay = null) {
        let best = null;
        let maxCount = 0;

        for (const s of sheepList) {
            if (!s.isAlive || s.state === 'captured' || s.state === 'floating') continue;
            let count = 0;
            let sx = 0;
            let sy = 0;
            for (const o of sheepList) {
                if (!o.isAlive || o.state === 'captured' || o.state === 'floating') continue;
                if (Math.hypot(o.x - s.x, o.y - s.y) < 72) {
                    count++;
                    sx += o.x;
                    sy += o.y;
                }
            }
            if (count > maxCount) {
                const cx = sx / count;
                const cy = sy / count;
                if (
                    activeHay &&
                    activeHay.isAlive &&
                    Math.hypot(cx - activeHay.x, cy - activeHay.y) < HAY_CONFIG.LIGHTNING_SAFE_RADIUS
                ) {
                    continue;
                }
                maxCount = count;
                best = { x: cx, y: cy, count, lead: s };
            }
        }
        return maxCount >= 4 ? best : null;
    }

    triggerRandomEvent(day, shapeId, sheepList, allowedEvents = null, signatureEvent = null, activeHay = null) {
        const pool =
            Array.isArray(allowedEvents) && allowedEvents.length > 0
                ? allowedEvents
                : ['eagle'];

        if (pool.length === 0) return;

        const cluster = this.findDensestCluster(sheepList, activeHay);
        let pick;

        if (!this.signatureTriggered && signatureEvent && pool.includes(signatureEvent)) {
            pick = signatureEvent;
            this.signatureTriggered = true;
        } else {
            const filtered = pool.length > 1 ? pool.filter((p) => p !== this.lastEventType) : pool;
            pick = filtered[Math.floor(rand() * filtered.length)] || pool[0];
        }

        this.lastEventType = pick;

        if (pick === 'eagle') this.spawnEagle(sheepList, cluster);
        else if (pick === 'lightning') this.spawnLightningStorm(day, shapeId, cluster, activeHay);
        else if (pick === 'tornado') this.spawnTornado(shapeId, cluster);
        else if (pick === 'ufo') this.spawnUfo(shapeId, sheepList, cluster);
    }

    /**
     * اگر بازیکن روی دایره هشدار رعد و برق بسته علوفه بگذارد، آن صاعقه‌های نزدیک خنثی می‌شوند
     */
    clearLightningNearHay(hayX, hayY, safeRadius = HAY_CONFIG.LIGHTNING_SAFE_RADIUS) {
        this.lightnings = this.lightnings.filter((l) => {
            if (l.struck) return true;
            return Math.hypot(l.x - hayX, l.y - hayY) >= safeRadius;
        });
    }

    spawnBurst(x, y, tint = 0xfde047, count = 8) {
        for (let i = 0; i < count; i++) {
            const a = (i / count) * Math.PI * 2;
            const p = this.scene.add
                .image(x, y, i % 2 === 0 ? 'star_particle' : 'dot_particle')
                .setDepth(32)
                .setScale(0.46)
                .setTint(tint);
            this.scene.tweens.add({
                targets: p,
                x: x + Math.cos(a) * 44,
                y: y + Math.sin(a) * 44,
                alpha: 0,
                scale: 0.08,
                rotation: 1.8,
                duration: 380,
                ease: 'Cubic.easeOut',
                onComplete: () => p.destroy(),
            });
        }
    }

    spawnEagle(sheepList, cluster) {
        const alive = sheepList.filter((s) => s.isAlive && s.state !== 'captured');
        if (alive.length === 0) return;
        const target = cluster ? cluster.lead : alive[Math.floor(rand() * alive.length)];

        sound.playEagleScreech();
        this.scene.showFloatingText(0, -125, 'هشدار عقاب! روی سایه‌اش سوت بزن', '#fca5a5');
        this.scene.triggerDiscovery?.('chaos_eagle');

        this.eagles.push({
            targetSheep: target,
            x: target.x,
            y: target.y,
            timer: 2.55,
            maxTimer: 2.55,
            radius: 40,
            done: false,
        });
    }

    spawnLightningStorm(day, shapeId, cluster, activeHay = null) {
        const count = Math.min(4, 2 + Math.floor(Math.max(0, day - 7) * 0.5));
        sound.playAlarm();
        this.scene.showFloatingText(0, -125, 'طوفان رعد و برق! از دایره‌ها دور شو', '#fde047');
        this.scene.triggerDiscovery?.('chaos_lightning');

        const safeR = HAY_CONFIG.LIGHTNING_SAFE_RADIUS;
        const isSafeFromHay = (pt) => {
            if (!activeHay || !activeHay.isAlive) return true;
            return Math.hypot(pt.x - activeHay.x, pt.y - activeHay.y) >= safeR;
        };

        for (let i = 0; i < count; i++) {
            let pt = null;
            if (cluster && i === 0 && isSafeFromHay(cluster)) {
                pt = { x: cluster.x, y: cluster.y };
            } else {
                for (let attempt = 0; attempt < 40; attempt++) {
                    const candidate = getRandomSafePoint(shapeId, 20, this.scene.terrain);
                    if (isSafeFromHay(candidate)) {
                        pt = candidate;
                        break;
                    }
                }
            }
            if (!pt) continue;

            this.lightnings.push({
                x: pt.x,
                y: pt.y,
                radius: 48,
                timer: 2.1 + i * 0.28,
                maxTimer: 2.1 + i * 0.28,
                struck: false,
                flashLife: 0,
            });
        }
    }

    spawnTornado(shapeId, cluster) {
        const start = getRandomSafePoint(shapeId, 18);
        const angle = cluster
            ? Math.atan2(cluster.y - start.y, cluster.x - start.x)
            : rand() * Math.PI * 2;
        sound.playSwipe();
        this.scene.showFloatingText(0, -125, 'گردباد سرگردان وارد جزیره شد!', '#99f6e4');
        this.scene.triggerDiscovery?.('chaos_tornado');

        this.tornadoes.push({
            x: start.x,
            y: start.y,
            vx: Math.cos(angle) * 60,
            vy: Math.sin(angle) * 60,
            turnSpeed: (rand() < 0.5 ? 1 : -1) * 0.75,
            life: 5.5,
            spin: 0,
        });
    }

    spawnUfo(shapeId, sheepList, cluster) {
        const anchor = cluster
            ? { x: cluster.x, y: cluster.y }
            : sheepList.find((s) => s.isAlive) || getRandomSafePoint(shapeId, 20);
        sound.playUfo();
        this.scene.showFloatingText(0, -125, 'بشقاب‌پرنده! ۲ بار روی پرتو سوت بزن', '#86efac');
        this.scene.triggerDiscovery?.('chaos_ufo');

        this.ufos.push({
            x: anchor.x + (rand() - 0.5) * 60,
            y: anchor.y + (rand() - 0.5) * 60,
            radius: 46,
            life: 6.5,
            hits: 0,
            lastHitTime: 0,
            abductMap: new Map(),
        });
    }

    handlePlayerPulse(x, y, radius, onBonus) {
        const now = this.scene.time.now;

        for (const e of this.eagles) {
            if (e.done) continue;
            if (Math.hypot(e.x - x, e.y - y) <= radius * 0.75) {
                e.done = true;
                sound.playSave(2);
                this.spawnBurst(e.x, e.y, 0xfbbf24, 8);
                if (onBonus) onBonus(e.x, e.y, 12, 'عقاب فراری شد!');
            }
        }

        for (const u of this.ufos) {
            if (u.life <= 0) continue;
            if (Math.hypot(u.x - x, u.y - y) <= radius * 0.75 && now - u.lastHitTime > 260) {
                u.lastHitTime = now;
                u.hits++;
                if (u.hits >= 2) {
                    u.life = 0;
                    sound.playSave(3);
                    this.scene.cameras.main.shake(130, 0.0042);
                    this.spawnBurst(u.x, u.y, 0x4ade80, 12);
                    if (onBonus) onBonus(u.x, u.y, 18, 'بشقاب‌پرنده نابود شد!');
                } else {
                    this.spawnBurst(u.x, u.y, 0x86efac, 5);
                    this.scene.showFloatingText(u.x, u.y - 20, 'یک ضربه دیگر!', '#86efac');
                }
            }
        }
    }

    update(dt, time, sheepList, wolfList, flowerList, onSheepLost, onWolfAction, activeHay = null) {
        this.gfx.clear();

        // ۱. عقاب‌ها
        for (const e of this.eagles) {
            if (e.done) continue;
            e.timer -= dt;
            if (e.timer > 0.95 && e.targetSheep && e.targetSheep.isAlive) {
                e.x += (e.targetSheep.x - e.x) * Math.min(1, dt * 3.5);
                e.y += (e.targetSheep.y - e.y) * Math.min(1, dt * 3.5);
            }

            const progress = 1 - Math.max(0, e.timer / e.maxTimer);
            const ringR = e.radius * (1.7 - progress * 0.7);
            this.gfx.fillStyle(0x0f172a, 0.22 + progress * 0.3);
            this.gfx.fillCircle(e.x, e.y, e.radius * (0.45 + progress * 0.55));
            this.gfx.lineStyle(3.5, e.timer < 0.95 ? 0xef4444 : 0xfbbf24, 0.95);
            this.gfx.strokeCircle(e.x, e.y, ringR);
            this.gfx.lineStyle(2, 0xffffff, 0.65);
            this.gfx.lineBetween(e.x - 10, e.y, e.x + 10, e.y);
            this.gfx.lineBetween(e.x, e.y - 10, e.x, e.y + 10);

            if (e.timer <= 0) {
                e.done = true;
                this.executeEagleSwoop(e, sheepList, onSheepLost);
            }
        }
        this.eagles = this.eagles.filter((e) => !e.done);

        // ۲. رعد و برق‌ها (با محافظت کامل محدوده بسته علوفه)
        for (const l of this.lightnings) {
            if (!l.struck) {
                if (
                    activeHay &&
                    activeHay.isAlive &&
                    Math.hypot(l.x - activeHay.x, l.y - activeHay.y) < HAY_CONFIG.LIGHTNING_SAFE_RADIUS
                ) {
                    l.struck = true;
                    l.flashLife = 0;
                    continue;
                }

                l.timer -= dt;
                const ratio = 1 - Math.max(0, l.timer / l.maxTimer);
                this.gfx.fillStyle(0xfef08a, 0.12 + ratio * 0.25);
                this.gfx.fillCircle(l.x, l.y, l.radius);
                this.gfx.lineStyle(3, ratio > 0.72 ? 0xef4444 : 0x38bdf8, 0.95);
                this.gfx.strokeCircle(l.x, l.y, l.radius * (1.22 - ratio * 0.22));

                if (l.timer <= 0) {
                    l.struck = true;
                    l.flashLife = 0.28;
                    sound.playThunder();
                    this.scene.cameras.main.shake(130, 0.004);
                    this.spawnBurst(l.x, l.y, 0x38bdf8, 8);

                    for (const s of sheepList) {
                        if (!s.isAlive || s.state === 'captured' || s.state === 'floating') continue;
                        const d = Math.hypot(s.x - l.x, s.y - l.y);
                        if (d < l.radius + 10) {
                            const a = d > 2 ? Math.atan2(s.y - l.y, s.x - l.x) : rand() * Math.PI * 2;
                            s.applyBlast(Math.cos(a), Math.sin(a), 260);
                            s.applyZoomies(2.2);
                        }
                    }

                    for (const w of wolfList) {
                        if (w.isDone || w.state === 'warning' || w.state === 'flee') continue;
                        if (Math.hypot(w.x - l.x, w.y - l.y) < l.radius + 20) {
                            w.fryByHazard(l.x, l.y, 'lightning', onWolfAction);
                        }
                    }

                    for (const f of flowerList) {
                        if (f.isAlive && Math.hypot(f.x - l.x, f.y - l.y) < l.radius * 0.72) {
                            f.isAlive = false;
                            f.destroy();
                        }
                    }
                }
            } else {
                l.flashLife -= dt;
                if (l.flashLife > 0) {
                    const a = l.flashLife / 0.28;
                    this.gfx.fillStyle(0xffffff, a * 0.85);
                    this.gfx.fillCircle(l.x, l.y, l.radius * 1.15);
                    this.gfx.lineStyle(6, 0x38bdf8, a);
                    this.gfx.lineBetween(l.x - 16, l.y - 260, l.x + 8, l.y - 120);
                    this.gfx.lineBetween(l.x + 8, l.y - 120, l.x - 6, l.y - 55);
                    this.gfx.lineBetween(l.x - 6, l.y - 55, l.x, l.y);
                    this.gfx.lineStyle(2.5, 0xffffff, a);
                    this.gfx.lineBetween(l.x - 16, l.y - 260, l.x + 8, l.y - 120);
                    this.gfx.lineBetween(l.x + 8, l.y - 120, l.x - 6, l.y - 55);
                    this.gfx.lineBetween(l.x - 6, l.y - 55, l.x, l.y);
                }
            }
        }
        this.lightnings = this.lightnings.filter((l) => !l.struck || l.flashLife > 0);

        // ۳. گردباد
        for (const t of this.tornadoes) {
            t.life -= dt;
            t.spin += dt * 11;
            const ang = Math.atan2(t.vy, t.vx) + t.turnSpeed * dt;
            const spd = 62;
            t.vx = Math.cos(ang) * spd;
            t.vy = Math.sin(ang) * spd;
            t.x += t.vx * dt;
            t.y += t.vy * dt;

            if (Math.hypot(t.x, t.y) > 195) {
                const toC = Math.atan2(-t.y, -t.x);
                t.vx = Math.cos(toC) * spd;
                t.vy = Math.sin(toC) * spd;
            }

            this.gfx.fillStyle(0xe0f2fe, 0.14);
            this.gfx.fillCircle(t.x, t.y, 48);
            for (let i = 0; i < 3; i++) {
                const r = 18 + i * 15;
                this.gfx.lineStyle(4 - i, 0xe0f2fe, 0.8 - i * 0.2);
                this.gfx.beginPath();
                this.gfx.arc(t.x, t.y, r, t.spin + i * 1.4, t.spin + i * 1.4 + Math.PI * 1.35, false);
                this.gfx.strokePath();
            }

            for (const s of sheepList) {
                if (!s.isAlive || s.state === 'captured' || s.state === 'floating') continue;
                const dx = s.x - t.x;
                const dy = s.y - t.y;
                const d = Math.hypot(dx, dy);
                if (d < 120 && d > 1) {
                    const strength = (1 - d / 120) * 320;
                    const tx = -dy / d;
                    const ty = dx / d;
                    s.vx += (tx * 0.85 + (dx / d) * 0.4) * strength * dt;
                    s.vy += (ty * 0.85 + (dy / d) * 0.4) * strength * dt;
                }
            }
        }
        this.tornadoes = this.tornadoes.filter((t) => t.life > 0);

        // ۴. بشقاب‌پرنده
        for (const u of this.ufos) {
            u.life -= dt;
            if (u.life <= 0) continue;

            let closest = null;
            let bestD = Infinity;
            for (const s of sheepList) {
                if (!s.isAlive || s.state === 'captured' || s.state === 'floating') continue;
                const d = Math.hypot(s.x - u.x, s.y - u.y);
                if (d < bestD) {
                    bestD = d;
                    closest = s;
                }
            }
            if (closest && bestD > 8) {
                u.x += ((closest.x - u.x) / bestD) * 44 * dt;
                u.y += ((closest.y - u.y) / bestD) * 44 * dt;
            }

            const pulse = 1 + Math.sin(time * 0.012) * 0.08;
            this.gfx.fillStyle(0x4ade80, 0.24);
            this.gfx.fillCircle(u.x, u.y, u.radius * pulse);
            this.gfx.lineStyle(3.5, 0x22c55e, 0.95);
            this.gfx.strokeCircle(u.x, u.y, u.radius * pulse);
            this.gfx.lineStyle(2, 0xbbf7d0, 0.85);
            this.gfx.strokeCircle(u.x, u.y, u.radius * 0.55);

            for (const s of sheepList) {
                if (!s.isAlive || s.state === 'captured' || s.state === 'floating') continue;
                const d = Math.hypot(s.x - u.x, s.y - u.y);
                if (d < u.radius) {
                    const prev = u.abductMap.get(s) || 0;
                    const next = prev + dt;
                    u.abductMap.set(s, next);
                    s.body.y = -6 - next * 7;
                    if (next >= 2.15) {
                        u.abductMap.delete(s);
                        s.finishStolen();
                        sound.playBaa('scared');
                        sound.playUfo();
                        this.scene.showFloatingText(u.x, u.y, 'گوسفند ربوده شد!', '#86efac');
                        if (onSheepLost) onSheepLost();
                    }
                } else if (u.abductMap.has(s)) {
                    u.abductMap.delete(s);
                }
            }
        }
        this.ufos = this.ufos.filter((u) => u.life > 0);
    }

    executeEagleSwoop(e, sheepList, onSheepLost) {
        const bird = this.scene.add
            .image(e.x - 240, e.y - 220, 'eagle_bird')
            .setDepth(38)
            .setScale(0.95)
            .setRotation(0.75);

        let victim = null;
        for (const s of sheepList) {
            if (!s.isAlive || s.state === 'captured' || s.state === 'floating') continue;
            if (Math.hypot(s.x - e.x, s.y - e.y) <= e.radius + 6) {
                victim = s;
                break;
            }
        }

        if (victim) {
            victim.finishStolen();
            sound.playBaa('scared');
            this.scene.cameras.main.shake(140, 0.0045);
            this.scene.showFloatingText(e.x, e.y, 'عقاب گوسفند را برد!', '#fca5a5');
            if (onSheepLost) onSheepLost();
        } else {
            this.spawnBurst(e.x, e.y, 0x4ade80, 6);
            this.scene.showFloatingText(e.x, e.y, 'جاخالی عالی!', '#4ade80');
        }

        this.scene.tweens.add({
            targets: bird,
            x: e.x + 260,
            y: e.y + 240,
            duration: 420,
            ease: 'Quad.easeInOut',
            onComplete: () => bird.destroy(),
        });
    }

    destroy() {
        this.gfx?.destroy();
    }
}