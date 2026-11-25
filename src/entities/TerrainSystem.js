import { getZoneAt, rand } from '../config/gameData.js';

/**
 * سیستم عوارض و موانع طبیعی زمین (فقط به ضرر گوسفندها؛ بدون اثر روی گرگ‌ها):
 * 1) obstacle: تنه درخت یا صخره (مانع جامد)
 * 2) mud: چاله گل‌ولای / خارزار (کاهش شدید ۶۴٪ سرعت گوسفندها)
 * 3) slope: تپه شیب‌دار لغزنده (سر خوردن قوی ۲۲۵ واحدی + کاهش اصطکاک)
 * 4) pond: آبگیر داخلی (چاله آب خطرناک وسط جزیره برای گوسفندها)
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

    findFreeSpot(minDistFromCenter, marginTide, radius) {
        for (let i = 0; i < 95; i++) {
            const x = (rand() - 0.5) * 450;
            const y = (rand() - 0.5) * 450;
            if (Math.hypot(x, y) < minDistFromCenter) continue;
            if (getZoneAt(x, y, this.shapeId, marginTide) !== 'safe') continue;

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
            if (this.overlapsExisting(x, y, radius + 22)) continue;
            return { x, y };
        }
        return null;
    }

    overlapsExisting(x, y, minGap) {
        if (this.pond && Math.hypot(x - this.pond.x, y - this.pond.y) < this.pond.rimRadius + minGap) {
            return true;
        }
        for (const o of this.obstacles) {
            if (Math.hypot(x - o.x, y - o.y) < o.radius + minGap) return true;
        }
        for (const m of this.muds) {
            if (Math.hypot(x - m.x, y - m.y) < m.radius + minGap * 0.65) return true;
        }
        for (const s of this.slopes) {
            if (Math.hypot(x - s.x, y - s.y) < s.radius + minGap * 0.65) return true;
        }
        return false;
    }

    generateTerrain() {
        const t = this.dayCfg.terrain || {};

        // ۱. آبگیر داخلی بزرگ و کاملاً واضح
        if (t.hasInternalPond) {
            const pt = this.findFreeSpot(78, 32, 54);
            if (pt) {
                this.pond = { x: pt.x, y: pt.y, radius: 44, rimRadius: 60 };
            }
        }

        // ۲. تپه‌های شیب‌دار با نیروی سر خوردن قوی و محسوس
        for (let i = 0; i < (t.slopeCount || 0); i++) {
            const pt = this.findFreeSpot(66, 28, 56);
            if (!pt) continue;
            let angle;
            if (this.pond && Math.hypot(this.pond.x - pt.x, this.pond.y - pt.y) < 190) {
                angle = Math.atan2(this.pond.y - pt.y, this.pond.x - pt.x);
            } else {
                angle = Math.atan2(pt.y, pt.x) + (rand() - 0.5) * 0.45;
            }
            this.slopes.push({
                x: pt.x,
                y: pt.y,
                radius: 58,
                angle,
                dirX: Math.cos(angle),
                dirY: Math.sin(angle),
                force: 225,
                frictionMul: 0.42,
            });
        }

        // ۳. چاله‌های گل‌ولای و خارزار با کندکنندگی شدید
        for (let i = 0; i < (t.mudCount || 0); i++) {
            const pt = this.findFreeSpot(60, 26, 52);
            if (!pt) continue;
            this.muds.push({
                x: pt.x,
                y: pt.y,
                radius: 56,
                dragMul: 0.36,
            });
        }

        // ۴. موانع جامد (تنه درخت و صخره)
        for (let i = 0; i < (t.obstacleCount || 0); i++) {
            const pt = this.findFreeSpot(76, 34, 24);
            if (!pt) continue;
            const variant = i % 2 === 0 ? 'tree' : 'rock';
            const radius = variant === 'tree' ? 23 : 21;
            const key = variant === 'tree' ? 'terrain_tree' : 'terrain_rock';
            const sprite = this.scene.add
                .image(pt.x, pt.y, key)
                .setDepth(10 + (pt.y + 400) * 0.001)
                .setScale(0.95);

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

        const isWinter = this.season.id === 'winter';

        // گل‌ولای / خارزار با کنتراست بالا و کاملاً مشخص
        for (const m of this.muds) {
            g.fillStyle(isWinter ? 0x475569 : 0x451a03, 0.7);
            g.fillEllipse(m.x, m.y, m.radius * 2.08, m.radius * 1.8);
            g.fillStyle(isWinter ? 0x64748b : 0x713f12, 0.85);
            g.fillEllipse(m.x - 4, m.y + 2, m.radius * 1.72, m.radius * 1.45);
            g.lineStyle(3.2, isWinter ? 0x334155 : 0x291102, 0.85);
            g.strokeEllipse(m.x, m.y, m.radius * 2.04, m.radius * 1.76);

            g.fillStyle(isWinter ? 0xcbd5e1 : 0x365314, 0.85);
            for (let k = 0; k < 7; k++) {
                const a = (k / 7) * Math.PI * 2 + 0.3;
                g.fillCircle(
                    m.x + Math.cos(a) * (m.radius * 0.58),
                    m.y + Math.sin(a) * (m.radius * 0.45),
                    4.8
                );
            }
        }

        // تپه شیب‌دار لغزنده با رنگ و کادر واضح
        for (const s of this.slopes) {
            g.fillStyle(isWinter ? 0x7dd3fc : 0xbef264, 0.52);
            g.fillCircle(s.x, s.y, s.radius);
            g.fillStyle(isWinter ? 0xe0f2fe : 0xecfccb, 0.35);
            g.fillCircle(s.x - s.dirX * 8, s.y - s.dirY * 8, s.radius * 0.65);
            g.lineStyle(3.2, isWinter ? 0x0284c7 : 0x15803d, 0.82);
            g.strokeCircle(s.x, s.y, s.radius);
        }

        // آبگیر داخلی
        if (this.pond) {
            const p = this.pond;
            g.fillStyle(this.season.beachSand, 1);
            g.fillCircle(p.x, p.y, p.rimRadius);
            g.lineStyle(2.5, 0x0f172a, 0.25);
            g.strokeCircle(p.x, p.y, p.rimRadius);
            g.fillStyle(this.season.oceanShallow, 0.95);
            g.fillCircle(p.x, p.y, p.radius + 8);
            g.fillStyle(this.season.oceanDeep, 1);
            g.fillCircle(p.x, p.y, p.radius);
        }
    }

    update(time) {
        const g = this.animGfx;
        g.clear();

        const isWinter = this.season.id === 'winter';
        const arrowColor = isWinter ? 0x0369a1 : 0x14532d;
        for (const s of this.slopes) {
            const slide = ((time * 0.0026) % 1) * 34 - 17;
            const perpX = -s.dirY;
            const perpY = s.dirX;

            for (let row = -1; row <= 1; row++) {
                const cx = s.x + s.dirX * (slide + row * 17);
                const cy = s.y + s.dirY * (slide + row * 17);
                if (Math.hypot(cx - s.x, cy - s.y) > s.radius - 10) continue;

                const tipX = cx + s.dirX * 10;
                const tipY = cy + s.dirY * 10;
                const leftX = cx - s.dirX * 6 + perpX * 12;
                const leftY = cy - s.dirY * 6 + perpY * 12;
                const rightX = cx - s.dirX * 6 - perpX * 12;
                const rightY = cy - s.dirY * 6 - perpY * 12;

                g.lineStyle(4, arrowColor, 0.9);
                g.beginPath();
                g.moveTo(leftX, leftY);
                g.lineTo(tipX, tipY);
                g.lineTo(rightX, rightY);
                g.strokePath();
            }
        }

        if (this.pond) {
            const p = this.pond;
            const pulse = Math.sin(time * 0.0045) * 4;
            g.lineStyle(3, this.season.oceanFoam, 0.78);
            g.strokeCircle(p.x, p.y, p.radius - 6 + pulse);
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

    getFrictionMultiplierAt(x, y) {
        for (const s of this.slopes) {
            if (Math.hypot(x - s.x, y - s.y) <= s.radius) {
                return s.frictionMul;
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

                if (typeof entity.vx === 'number' && typeof entity.vy === 'number') {
                    const vn = entity.vx * nx + entity.vy * ny;
                    if (vn < 0) {
                        entity.vx -= 1.45 * vn * nx;
                        entity.vy -= 1.45 * vn * ny;
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