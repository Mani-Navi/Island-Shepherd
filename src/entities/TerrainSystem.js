import { getZoneAt, rand } from '../config/gameData.js';

/**
 * سیستم عوارض و موانع داخلی زمین (به‌جای کوچک کردن مداوم جزیره):
 * 1) obstacle: تنه درخت یا صخره (مانع جامد — هم پناهگاه، هم سد مسیر)
 * 2) mud: چاله گل‌ولای / خارزار (کندکننده ۴۵٪ برای گوسفند و گرگ)
 * 3) slope: تپه شیب‌دار لغزنده (هل دادن به جهت فلش‌ها — هم خطر لغزش، هم تله ناک‌اوت آبی گرگ)
 * 4) pond: آبگیر داخلی (چاله آب وسط جزیره — هم خطر، هم فرصت ناک‌اوت آبی ۲ برابر سکه)
 */
export class TerrainSystem {
    constructor(scene, dayCfg) {
        this.scene = scene;
        this.dayCfg = dayCfg;
        this.shapeId = dayCfg.island.id;
        this.season = dayCfg.season;

        this.obstacles = [];
        this.muds = [];
        this.slopes = [];
        this.pond = null;

        this.staticGfx = scene.add.graphics().setDepth(3.2);
        this.animGfx = scene.add.graphics().setDepth(3.6);
        this.sprites = [];

        this.generateTerrain();
        this.drawStaticTerrain();
    }

    findFreeSpot(minDistFromCenter, marginTide, radius, extraCheck = null) {
        for (let i = 0; i < 90; i++) {
            const x = (rand() - 0.5) * 460;
            const y = (rand() - 0.5) * 460;
            if (Math.hypot(x, y) < minDistFromCenter) continue;
            if (getZoneAt(x, y, this.shapeId, marginTide) !== 'safe') continue;

            // بررسی نقاط پیرامون تا کامل روی بخش امن قرار بگیرد
            let allSafe = true;
            for (let k = 0; k < 6; k++) {
                const a = (k / 6) * Math.PI * 2;
                if (
                    getZoneAt(
                        x + Math.cos(a) * radius,
                        y + Math.sin(a) * radius,
                        this.shapeId,
                        marginTide
                    ) !== 'safe'
                ) {
                    allSafe = false;
                    break;
                }
            }
            if (!allSafe) continue;
            if (this.overlapsExisting(x, y, radius + 24)) continue;
            if (extraCheck && !extraCheck(x, y)) continue;
            return { x, y };
        }
        return null;
    }

    overlapsExisting(x, y, minGap) {
        if (this.pond && Math.hypot(x - this.pond.x, y - this.pond.y) < this.pond.radius + minGap) {
            return true;
        }
        for (const o of this.obstacles) {
            if (Math.hypot(x - o.x, y - o.y) < o.radius + minGap) return true;
        }
        for (const m of this.muds) {
            if (Math.hypot(x - m.x, y - m.y) < m.radius + minGap * 0.7) return true;
        }
        for (const s of this.slopes) {
            if (Math.hypot(x - s.x, y - s.y) < s.radius + minGap * 0.7) return true;
        }
        return false;
    }

    generateTerrain() {
        const t = this.dayCfg.terrain || {};

        // ۱. آبگیر داخلی (از مرحله ۸ به بعد روی نقشه‌های مناسب)
        if (t.hasInternalPond) {
            const pt = this.findFreeSpot(74, 34, 46);
            if (pt) {
                this.pond = { x: pt.x, y: pt.y, radius: 36, rimRadius: 50 };
            }
        }

        // ۲. تپه‌های شیب‌دار لغزنده (از مرحله ۶ به بعد)
        for (let i = 0; i < (t.slopeCount || 0); i++) {
            const pt = this.findFreeSpot(66, 30, 50);
            if (!pt) continue;
            // جهت شیب: یا به سمت آبگیر نزدیک، یا به سمت ساحل نزدیک (ایجاد ریسک و تاکتیک واقعی)
            let angle;
            if (this.pond && Math.hypot(this.pond.x - pt.x, this.pond.y - pt.y) < 175) {
                angle = Math.atan2(this.pond.y - pt.y, this.pond.x - pt.x);
            } else {
                angle = Math.atan2(pt.y, pt.x) + (rand() - 0.5) * 0.5;
            }
            this.slopes.push({
                x: pt.x,
                y: pt.y,
                radius: 48,
                angle,
                dirX: Math.cos(angle),
                dirY: Math.sin(angle),
                force: 102,
            });
        }

        // ۳. چاله‌های گل‌ولای و خارزار کندکننده (از مرحله ۳ به بعد)
        for (let i = 0; i < (t.mudCount || 0); i++) {
            const pt = this.findFreeSpot(62, 28, 44);
            if (!pt) continue;
            this.muds.push({
                x: pt.x,
                y: pt.y,
                radius: 46,
                dragMul: 0.55,
            });
        }

        // ۴. موانع جامد (تنه درخت و صخره — از مرحله ۱)
        for (let i = 0; i < (t.obstacleCount || 0); i++) {
            const pt = this.findFreeSpot(76, 34, 24);
            if (!pt) continue;
            const variant = i % 2 === 0 ? 'tree' : 'rock';
            const radius = variant === 'tree' ? 22 : 20;
            const key = variant === 'tree' ? 'terrain_tree' : 'terrain_rock';
            const sprite = this.scene.add
                .image(pt.x, pt.y, key)
                .setDepth(10 + (pt.y + 400) * 0.001)
                .setScale(0.92);

            if (variant === 'tree' && this.season.bushTint !== 0xffffff) {
                sprite.setTint(this.season.bushTint);
            }
            this.sprites.push(sprite);
            this.obstacles.push({ x: pt.x, y: pt.y, radius, variant, sprite });
        }
    }

    drawStaticTerrain() {
        const g = this.staticGfx;
        g.clear();

        // کشیدن گل‌ولای / خارزار
        const isWinter = this.season.id === 'winter';
        for (const m of this.muds) {
            g.fillStyle(isWinter ? 0x94a3b8 : 0x5c3a21, 0.52);
            g.fillEllipse(m.x, m.y, m.radius * 2.05, m.radius * 1.75);
            g.fillStyle(isWinter ? 0x64748b : 0x78492a, 0.72);
            g.fillEllipse(m.x - 4, m.y + 2, m.radius * 1.65, m.radius * 1.38);
            g.lineStyle(2.5, isWinter ? 0x475569 : 0x451a03, 0.65);
            g.strokeEllipse(m.x, m.y, m.radius * 2.02, m.radius * 1.72);

            // خارها و جزئیات بافت
            g.fillStyle(isWinter ? 0xcbd5e1 : 0x3f6212, 0.7);
            for (let k = 0; k < 5; k++) {
                const a = (k / 5) * Math.PI * 2 + 0.4;
                g.fillCircle(m.x + Math.cos(a) * (m.radius * 0.56), m.y + Math.sin(a) * (m.radius * 0.44), 4.2);
            }
        }

        // کشیدن پایه تپه شیب‌دار
        for (const s of this.slopes) {
            g.fillStyle(isWinter ? 0xbae6fd : 0xd9f99d, 0.42);
            g.fillCircle(s.x, s.y, s.radius);
            g.lineStyle(2.5, isWinter ? 0x0284c7 : 0x15803d, 0.55);
            g.strokeCircle(s.x, s.y, s.radius);
        }

        // کشیدن آبگیر داخلی
        if (this.pond) {
            const p = this.pond;
            g.fillStyle(this.season.beachSand, 1);
            g.fillCircle(p.x, p.y, p.rimRadius);
            g.fillStyle(this.season.oceanShallow, 0.92);
            g.fillCircle(p.x, p.y, p.radius + 7);
            g.fillStyle(this.season.oceanDeep, 1);
            g.fillCircle(p.x, p.y, p.radius);
        }
    }

    update(time) {
        const g = this.animGfx;
        g.clear();

        // انیمیشن فلش‌های جهت سر خوردن روی تپه شیب‌دار
        const isWinter = this.season.id === 'winter';
        const arrowColor = isWinter ? 0x0369a1 : 0x166534;
        for (const s of this.slopes) {
            const slide = ((time * 0.0018) % 1) * 26 - 13;
            const perpX = -s.dirY;
            const perpY = s.dirX;

            for (let row = -1; row <= 1; row += 2) {
                const cx = s.x + s.dirX * (slide + row * 12);
                const cy = s.y + s.dirY * (slide + row * 12);
                if (Math.hypot(cx - s.x, cy - s.y) > s.radius - 10) continue;

                const tipX = cx + s.dirX * 8;
                const tipY = cy + s.dirY * 8;
                const leftX = cx - s.dirX * 5 + perpX * 9;
                const leftY = cy - s.dirY * 5 + perpY * 9;
                const rightX = cx - s.dirX * 5 - perpX * 9;
                const rightY = cy - s.dirY * 5 - perpY * 9;

                g.lineStyle(3.2, arrowColor, 0.78);
                g.beginPath();
                g.moveTo(leftX, leftY);
                g.lineTo(tipX, tipY);
                g.lineTo(rightX, rightY);
                g.strokePath();
            }
        }

        // انیمیشن موج آبگیر داخلی
        if (this.pond) {
            const p = this.pond;
            const pulse = Math.sin(time * 0.004) * 3;
            g.lineStyle(2.4, this.season.oceanFoam, 0.65);
            g.strokeCircle(p.x, p.y, p.radius - 5 + pulse);
        }
    }

    getPondZoneAt(x, y) {
        if (!this.pond) return null;
        const d = Math.hypot(x - this.pond.x, y - this.pond.y);
        if (d <= this.pond.radius) return 'water';
        if (d <= this.pond.rimRadius) return 'beach';
        return null;
    }

    getSpeedMultiplierAt(x, y) {
        for (const m of this.muds) {
            if (Math.hypot(x - m.x, y - m.y) <= m.radius) {
                return m.dragMul;
            }
        }
        return 1.0;
    }

    getSlopeForceAt(x, y) {
        let fx = 0;
        let fy = 0;
        for (const s of this.slopes) {
            if (Math.hypot(x - s.x, y - s.y) <= s.radius) {
                fx += s.dirX * s.force;
                fy += s.dirY * s.force;
            }
        }
        return { x: fx, y: fy };
    }

    resolveSolidCollision(entity, entityRadius = 15) {
        if (!entity || !entity.container) return false;
        let collided = false;
        for (const o of this.obstacles) {
            const dx = entity.container.x - o.x;
            const dy = entity.container.y - o.y;
            const dist = Math.hypot(dx, dy);
            const minDist = o.radius + entityRadius;
            if (dist < minDist) {
                collided = true;
                const nx = dist > 0.01 ? dx / dist : 1;
                const ny = dist > 0.01 ? dy / dist : 0;
                entity.container.x = o.x + nx * minDist;
                entity.container.y = o.y + ny * minDist;

                // کمانه ملایم سرعت به سمت بیرون مانع
                if (typeof entity.vx === 'number' && typeof entity.vy === 'number') {
                    const vn = entity.vx * nx + entity.vy * ny;
                    if (vn < 0) {
                        entity.vx -= 1.45 * vn * nx;
                        entity.vy -= 1.45 * vn * ny;
                    }
                }
                if (typeof entity.pushVx === 'number' && typeof entity.pushVy === 'number') {
                    const pvn = entity.pushVx * nx + entity.pushVy * ny;
                    if (pvn < 0) {
                        entity.pushVx -= 1.35 * pvn * nx;
                        entity.pushVy -= 1.35 * pvn * ny;
                    }
                }
            }
        }
        return collided;
    }

    isBlockedForSpawn(x, y, padding = 24) {
        if (this.pond && Math.hypot(x - this.pond.x, y - this.pond.y) < this.pond.rimRadius + padding) {
            return true;
        }
        for (const o of this.obstacles) {
            if (Math.hypot(x - o.x, y - o.y) < o.radius + padding) return true;
        }
        return false;
    }

    destroy() {
        this.staticGfx?.destroy();
        this.animGfx?.destroy();
        for (const sp of this.sprites) sp?.destroy();
        this.sprites = [];
    }
}