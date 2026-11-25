import Phaser from 'phaser';
import {
    SHEEP_CONFIG,
    SHEEP_TYPES,
    HAY_CONFIG,
    PANIC,
    getZoneAt,
    getSafeDirection,
    distToSegment,
    rand,
} from '../config/gameData.js';
import { sound } from '../utils/SoundGen.js';

export class Sheep {
    constructor(scene, x, y, type = 'normal') {
        this.scene = scene;
        this.type = type;
        this.typeCfg = SHEEP_TYPES[type] || SHEEP_TYPES.normal;
        this.state = 'wander';
        this.isAlive = true;

        this.vx = 0;
        this.vy = 0;
        this.facingAngle = rand() * Math.PI * 2;
        this.wanderAngle = this.facingAngle;
        this.wanderChangeTimer = rand() * 1.4;
        this.fleeTimer = 0;
        this.effectTimer = 0;
        this.frostTimer = 0;
        this.mildChillTimer = 0;
        this.grabImmunityTimer = 0;
        this.scatterBadgeTimer = 0;
        this.walkPhase = Math.random() * Math.PI * 2;
        this.headbuttCooldown = 0;
        this.woolTimer = this.typeCfg.woolInterval * (0.6 + rand() * 0.55);
        this.stress = 0;
        this.isFireRamActive = false;
        this.dustTimer = 0;
        this.tearTimer = 0;
        this.shimmerTimer = 0.8 + Math.random() * 1.2;

        this.normalTextureKey = this.typeCfg.key || 'sheep_normal';
        this.scaredTextureKey = `${this.normalTextureKey}_scared`;
        const scale = type === 'ram' ? SHEEP_CONFIG.SCALE * 1.12 : SHEEP_CONFIG.SCALE;
        this.baseScale = scale;

        this.container = scene.add.container(x, y);
        this.shadow = scene.add.image(0, 7, 'shadow_soft').setScale(type === 'ram' ? 0.92 : 0.8);
        this.body = scene.add.image(0, 0, this.normalTextureKey).setScale(0.1);
        this.warnIcon = scene.add.image(0, -27, 'warn_icon').setScale(0.76).setVisible(false);
        this.statusBadge = scene.add.image(0, -32, 'badge_spicy').setScale(0.76).setVisible(false);

        this.container.add([this.shadow, this.body, this.warnIcon, this.statusBadge]);

        scene.tweens.add({
            targets: this.body,
            scale: this.baseScale,
            duration: 320,
            ease: 'Back.easeOut',
        });
    }

    get x() {
        return this.container ? this.container.x : 0;
    }

    get y() {
        return this.container ? this.container.y : 0;
    }

    setScaredLook(scared) {
        if (!this.body || !this.body.scene) return;
        const targetKey =
            scared && this.scene.textures.exists(this.scaredTextureKey)
                ? this.scaredTextureKey
                : this.normalTextureKey;
        if (this.body.texture?.key !== targetKey) {
            this.body.setTexture(targetKey);
        }
    }

    showBadge(textureKey, targetScale = 0.78) {
        if (!this.statusBadge || !this.statusBadge.scene) return;
        this.statusBadge.setTexture(textureKey).setVisible(true).setScale(0.25).setRotation(0);
        this.scene.tweens.add({
            targets: this.statusBadge,
            scale: targetScale,
            duration: 190,
            ease: 'Back.easeOut',
        });
    }

    hideBadge() {
        if (!this.statusBadge || !this.statusBadge.scene) return;
        this.statusBadge.setVisible(false).setRotation(0);
    }

    spawnDustPuff(tint = 0xf8fafc, scale = 0.45) {
        if (!this.container || !this.scene) return;
        const puff = this.scene.add
            .image(
                this.x - Math.cos(this.facingAngle) * 10 + (Math.random() - 0.5) * 6,
                this.y - Math.sin(this.facingAngle) * 10 + 4,
                'dust_puff'
            )
            .setDepth(8)
            .setScale(scale)
            .setAlpha(0.75)
            .setTint(tint);

        this.scene.tweens.add({
            targets: puff,
            scale: scale * 1.6,
            alpha: 0,
            y: puff.y - 6,
            duration: 340,
            ease: 'Quad.easeOut',
            onComplete: () => puff.destroy(),
        });
    }

    spawnSparkle(tint = 0xfde047) {
        if (!this.container || !this.scene) return;
        const star = this.scene.add
            .image(
                this.x + (Math.random() - 0.5) * 22,
                this.y + (Math.random() - 0.5) * 22,
                'star_particle'
            )
            .setDepth(16)
            .setScale(0.22)
            .setTint(tint);

        this.scene.tweens.add({
            targets: star,
            scale: 0.52,
            alpha: 0,
            y: star.y - 16,
            rotation: 1.4,
            duration: 460,
            ease: 'Cubic.easeOut',
            onComplete: () => star.destroy(),
        });
    }

    spawnTearDrop() {
        if (!this.container || !this.scene) return;
        const side = Math.random() < 0.5 ? -1 : 1;
        const drop = this.scene.add
            .image(this.x + side * (9 + Math.random() * 5), this.y - 14, 'dot_particle')
            .setDepth(29)
            .setScale(0.36)
            .setTint(0x38bdf8);

        this.scene.tweens.add({
            targets: drop,
            x: drop.x + side * (16 + Math.random() * 10),
            y: drop.y + 20 + Math.random() * 8,
            alpha: 0,
            scale: 0.14,
            duration: 440,
            ease: 'Quad.easeIn',
            onComplete: () => drop.destroy(),
        });
    }

    spawnRescueHearts() {
        if (!this.container || !this.scene) return;
        const key = this.scene.textures.exists('heart_particle') ? 'heart_particle' : 'star_particle';
        for (let i = 0; i < 4; i++) {
            const h = this.scene.add
                .image(this.x + (Math.random() - 0.5) * 20, this.y - 8, key)
                .setDepth(30)
                .setScale(0.32 + Math.random() * 0.18);
            this.scene.tweens.add({
                targets: h,
                x: h.x + (Math.random() - 0.5) * 28,
                y: h.y - 34 - Math.random() * 16,
                alpha: 0,
                scale: 0.55,
                duration: 620 + i * 70,
                ease: 'Cubic.easeOut',
                onComplete: () => h.destroy(),
            });
        }
    }

    applyZoomies(durationSec) {
        if (!this.container) return;
        this.state = 'zoomies';
        this.effectTimer = durationSec;
        this.wanderAngle = rand() * Math.PI * 2;
        this.body.setTint(0xffcc99);
        this.showBadge('badge_spicy');
    }

    applySleep(durationSec) {
        if (!this.container) return;
        this.state = 'sleep';
        this.effectTimer = durationSec;
        this.vx = 0;
        this.vy = 0;
        this.body.setTint(0xd8b4fe);
        this.showBadge('badge_sleep');
    }

    applyFrost(durationSec) {
        if (!this.container) return;
        this.frostTimer = Math.max(this.frostTimer, durationSec);
        if (this.state === 'zoomies') this.effectTimer = Math.min(this.effectTimer, 1.0);
        this.body.setTint(0x93c5fd);
    }

    applyMildChill(durationSec = 1.4) {
        if (!this.container || this.state === 'zoomies') return;
        this.mildChillTimer = Math.max(this.mildChillTimer, durationSec);
        if (!this.isFireRamActive) this.body.setTint(0xbae6fd);
    }

    applyDogStartle(dogX, dogY) {
        if (!this.canBeHerded()) return;
        const dx = this.x - dogX;
        const dy = this.y - dogY;
        const dist = Math.hypot(dx, dy) || 1;
        this.vx += (dx / dist) * 120 * this.typeCfg.knockbackMul;
        this.vy += (dy / dist) * 120 * this.typeCfg.knockbackMul;
        this.state = 'flee';
        this.fleeTimer = 0.45;
        this.scatterBadgeTimer = 0.45;
        this.showBadge('badge_scatter', 0.65);
        this.playHopAnim();
    }

    applyBeePanic(hiveX, hiveY) {
        if (!this.canBeHerded()) return;
        const dx = this.x - hiveX;
        const dy = this.y - hiveY;
        const dist = Math.hypot(dx, dy) || 1;
        this.vx = (dx / dist) * 210;
        this.vy = (dy / dist) * 210;
        this.state = 'zoomies';
        this.effectTimer = 2.0;
        this.wanderAngle = Math.atan2(dy, dx);
        this.body.setTint(0xfef08a);
        this.showBadge('badge_bee');
        this.playHopAnim();
    }

    applyBlast(dirX, dirY, force) {
        if (!this.container || !this.isAlive || this.state === 'floating' || this.state === 'captured') return;
        this.vx = dirX * force;
        this.vy = dirY * force;
        this.state = 'flee';
        this.fleeTimer = 0.85;
        this.wanderAngle = Math.atan2(dirY, dirX);
        this.spawnDustPuff(0xfef08a, 0.55);
        this.playHopAnim();
    }

    triggerGentleScatter(clusterX, clusterY, shapeId, terrain = null) {
        this.stress = 0;
        let dx = this.x - clusterX;
        let dy = this.y - clusterY;
        const len = Math.hypot(dx, dy);
        if (len > 2) {
            dx /= len;
            dy /= len;
        } else {
            const a = rand() * Math.PI * 2;
            dx = Math.cos(a);
            dy = Math.sin(a);
        }

        const safe = getSafeDirection(this.x, this.y, shapeId, terrain);
        const zone = getZoneAt(this.x, this.y, shapeId, 16, terrain);
        const safeWeight = zone === 'safe' ? 0.55 : 1.4;
        dx += safe.x * safeWeight;
        dy += safe.y * safeWeight;
        const finalLen = Math.hypot(dx, dy) || 1;
        dx /= finalLen;
        dy /= finalLen;

        this.vx = dx * PANIC.SCATTER_SPEED;
        this.vy = dy * PANIC.SCATTER_SPEED;
        this.state = 'flee';
        this.fleeTimer = 0.55;
        this.wanderAngle = Math.atan2(dy, dx);
        this.scatterBadgeTimer = 0.65;
        this.showBadge('badge_scatter');
        this.spawnDustPuff();
        this.playHopAnim();
    }

    clearEffects() {
        if (this.shadow && this.shadow.scene) this.shadow.setVisible(true);
        if (this.body && this.body.scene) {
            this.scene?.tweens?.killTweensOf(this.body);
            this.body.clearTint();
            this.body.x = 0;
            this.body.y = 0;
            this.body.rotation = this.facingAngle;
            this.body.setScale(this.baseScale);
            this.setScaredLook(false);
        }
        this.hideBadge();
        this.scatterBadgeTimer = 0;
        this.isFireRamActive = false;
        this.state = 'wander';
    }

    captureByWolf() {
        if (!this.container || !this.body) return;
        this.state = 'captured';
        this.vx = 0;
        this.vy = 0;
        this.tearTimer = 0.04;
        this.warnIcon.setVisible(false);
        this.hideBadge();
        this.shadow.setVisible(false);

        this.scene?.tweens?.killTweensOf(this.body);
        this.body.clearTint();
        this.body.rotation = 0;
        this.body.x = 0;
        this.body.y = -8;
        this.setScaredLook(true);

        this.body.setScale(this.baseScale * 0.65);
        this.scene.tweens.add({
            targets: this.body,
            scale: this.baseScale * 1.16,
            duration: 180,
            ease: 'Back.easeOut',
        });
    }

    releaseFromWolf(shapeId = 'classic', terrain = null) {
        if (!this.container) return;
        this.clearEffects();
        this.grabImmunityTimer = 1.25;
        const safe = getSafeDirection(this.x, this.y, shapeId, terrain);
        this.container.x += safe.x * 18;
        this.container.y += safe.y * 18;
        this.vx = safe.x * 210;
        this.vy = safe.y * 210;
        this.state = 'flee';
        this.fleeTimer = 0.8;
        this.spawnRescueHearts();
        sound.playBaa('happy');
        this.playHopAnim();
    }

    finishStolen() {
        this.isAlive = false;
        this.state = 'stolen';
        this.destroy();
    }

    canBeHerded() {
        return (
            Boolean(this.container) &&
            this.isAlive &&
            this.state !== 'floating' &&
            this.state !== 'captured' &&
            this.state !== 'sleep' &&
            this.state !== 'stolen'
        );
    }

    applyWhistle(wx, wy, radius, force, shapeId = 'classic', magnetLevel = 0, terrain = null) {
        if (!this.canBeHerded()) return false;

        const dx = this.x - wx;
        const dy = this.y - wy;
        const dist = Math.hypot(dx, dy);
        if (dist > radius) return false;

        const safe = getSafeDirection(this.x, this.y, shapeId, terrain);
        const zone = getZoneAt(this.x, this.y, shapeId, 0, terrain);
        let dirX, dirY;

        if (dist < 18 || (dist < 36 && zone === 'beach')) {
            dirX = safe.x;
            dirY = safe.y;
        } else {
            dirX = dx / dist;
            dirY = dy / dist;
            if (magnetLevel > 0) {
                const pull = (zone === 'beach' ? 0.36 : 0.16) * magnetLevel;
                dirX += safe.x * pull;
                dirY += safe.y * pull;
                const l = Math.hypot(dirX, dirY) || 1;
                dirX /= l;
                dirY /= l;
            }
        }

        const strength = (1 - (dist / radius) * 0.32) * this.typeCfg.knockbackMul;
        this.vx = this.vx * 0.2 + dirX * force * strength;
        this.vy = this.vy * 0.2 + dirY * force * strength;

        if (this.state !== 'zoomies') {
            this.state = 'flee';
            this.fleeTimer = 0.85;
        }
        this.wanderAngle = Math.atan2(dirY, dirX);
        this.spawnDustPuff();
        this.playHopAnim();
        return true;
    }

    applySwipe(x1, y1, x2, y2, dirX, dirY, radius, force, frostLevel = 0) {
        if (!this.canBeHerded()) return false;

        const dist = distToSegment(this.x, this.y, x1, y1, x2, y2);
        if (dist > radius) return false;

        const strength = (1 - (dist / radius) * 0.35) * this.typeCfg.knockbackMul;
        this.vx = this.vx * 0.28 + dirX * force * strength;
        this.vy = this.vy * 0.28 + dirY * force * strength;

        if (frostLevel > 0) {
            if (this.state === 'zoomies') {
                this.applyFrost(1.5 + frostLevel * 0.6);
            } else {
                this.applyMildChill(1.35);
            }
        }

        if (this.state !== 'zoomies') {
            this.state = 'flee';
            this.fleeTimer = 0.72;
        }
        this.wanderAngle = Math.atan2(dirY, dirX);
        this.playHopAnim();
        return true;
    }

    herdByDog(dirX, dirY, force) {
        if (!this.canBeHerded()) return;
        this.vx = dirX * force * this.typeCfg.knockbackMul;
        this.vy = dirY * force * this.typeCfg.knockbackMul;
        if (this.state !== 'zoomies') {
            this.state = 'flee';
            this.fleeTimer = 0.85;
        }
        this.wanderAngle = Math.atan2(dirY, dirX);
        this.spawnDustPuff();
        this.playHopAnim();
    }

    playHopAnim() {
        if (!this.body || !this.body.scene || !this.scene?.tweens) return;
        this.scene.tweens.killTweensOf(this.body);
        this.body.setScale(this.baseScale);
        this.scene.tweens.add({
            targets: this.body,
            scaleX: this.baseScale * 1.26,
            scaleY: this.baseScale * 0.76,
            duration: 85,
            yoyo: true,
            ease: 'Quad.easeOut',
        });
    }

    enterWater(shapeId, terrain, onWaterCheck, onLostCallback) {
        if (this.state === 'floating' || !this.container) return;

        if (onWaterCheck && onWaterCheck(this)) {
            const safe = getSafeDirection(this.x, this.y, shapeId, terrain);
            this.container.x += safe.x * 42;
            this.container.y += safe.y * 42;
            this.vx = safe.x * 245;
            this.vy = safe.y * 245;
            this.clearEffects();
            this.state = 'flee';
            this.fleeTimer = 0.85;
            this.spawnSparkle(0x38bdf8);
            this.spawnRescueHearts();
            sound.playBaa('happy');
            this.playHopAnim();
            return;
        }

        this.state = 'floating';
        this.isAlive = false;
        this.warnIcon.setVisible(false);
        this.hideBadge();
        this.shadow.setVisible(false);
        this.scene?.tweens?.killTweensOf(this.body);
        this.body.clearTint();
        this.body.rotation = 0;
        this.body.setScale(this.baseScale * 0.96);
        this.setScaredLook(true);

        sound.playBaa('scared');
        sound.playBubble();

        const bubble = this.scene.add.image(0, 0, 'water_bubble').setScale(0.2);
        this.container.add(bubble);
        this.scene.tweens.add({ targets: bubble, scale: 1.05, duration: 240, ease: 'Back.easeOut' });

        const ripple = this.scene.add
            .image(this.x, this.y, 'whistle_ring')
            .setDepth(9)
            .setScale(0.08)
            .setAlpha(0.75)
            .setTint(0xe0f2fe);
        this.scene.tweens.add({
            targets: ripple,
            scale: 0.42,
            alpha: 0,
            duration: 500,
            ease: 'Cubic.easeOut',
            onComplete: () => ripple.destroy(),
        });

        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            const drop = this.scene.add.image(this.x, this.y, 'dot_particle');
            drop.setDepth(25).setScale(0.42).setTint(0xe0f2fe);
            this.scene.tweens.add({
                targets: drop,
                x: this.x + Math.cos(a) * 34,
                y: this.y + Math.sin(a) * 34,
                alpha: 0,
                scale: 0.1,
                duration: 380,
                onComplete: () => drop.destroy(),
            });
        }

        const safe = getSafeDirection(this.x, this.y, shapeId, terrain);
        const driftDist = terrain?.getPondZoneAt(this.x, this.y) === 'water' ? 10 : 75;
        this.scene.tweens.add({
            targets: this.container,
            x: this.x - safe.x * driftDist,
            y: this.y - safe.y * driftDist,
            alpha: 0,
            scale: 0.56,
            duration: 1500,
            ease: 'Sine.easeInOut',
            onComplete: () => this.destroy(),
        });

        if (onLostCallback) onLostCallback(this);
    }

    update(dt, ctx) {
        if (!this.container || !this.body || !this.body.scene) return;
        if (!this.isAlive && this.state !== 'floating') return;

        const {
            shapeId,
            terrain = null,
            allSheep,
            flowers,
            wolves,
            activeHay,
            tideOffset,
            windVec,
            flowerRepellent,
            calmFactor = 1,
            fleeSpeedMul = 1,
            flowerEatSpeedMul = 1,
            goldMul = 1,
            isFever = false,
            hasFireRam = false,
            isTutorial = false,
            onWaterCheck,
            onLost,
            onFlowerEaten,
            onWoolDrop,
            onWolfAction,
        } = ctx;

        const now = this.scene.time.now;

        if (this.grabImmunityTimer > 0) {
            this.grabImmunityTimer = Math.max(0, this.grabImmunityTimer - dt);
        }

        if (this.state === 'floating') {
            this.body.rotation = Math.sin(now * 0.008) * 0.28;
            this.body.y = Math.sin(now * 0.01) * 2.5;
            return;
        }

        if (this.state === 'captured') {
            const scaredScale = this.baseScale * 1.16;
            const squeeze = 1 + Math.sin(now * 0.026) * 0.08;
            this.body.rotation = Math.sin(now * 0.024) * 0.24;
            this.body.x = Math.sin(now * 0.048) * 2.1;
            this.body.y = -8 + Math.cos(now * 0.036) * 2.2;
            this.body.setScale(scaredScale * squeeze, scaredScale / squeeze);

            this.tearTimer -= dt;
            if (this.tearTimer <= 0) {
                this.tearTimer = 0.28;
                this.spawnTearDrop();
            }
            return;
        }

        if (this.state === 'sleep') {
            this.effectTimer -= dt;
            this.statusBadge.y = -30 + Math.sin(now * 0.005) * 4;
            const breathe = 1 + Math.sin(now * 0.004) * 0.05;
            this.body.setScale(this.baseScale * breathe, this.baseScale / breathe);
            if (this.effectTimer <= 0) this.clearEffects();
            return;
        }

        if (this.statusBadge.visible) {
            this.statusBadge.y = -30 + Math.sin(now * 0.011) * 2.5;
        }

        if (this.scatterBadgeTimer > 0) {
            this.scatterBadgeTimer -= dt;
            if (this.scatterBadgeTimer <= 0 && this.state !== 'zoomies' && !this.isFireRamActive) {
                this.hideBadge();
            }
        }

        if (this.frostTimer > 0) {
            this.frostTimer -= dt;
            if (this.frostTimer <= 0 && this.mildChillTimer <= 0 && this.state !== 'zoomies' && !this.isFireRamActive) {
                this.body.clearTint();
            }
        }

        if (this.mildChillTimer > 0) {
            this.mildChillTimer -= dt;
            if (this.mildChillTimer <= 0 && this.frostTimer <= 0 && this.state !== 'zoomies' && !this.isFireRamActive) {
                this.body.clearTint();
            }
        }

        if (this.headbuttCooldown > 0) this.headbuttCooldown -= dt;

        if (this.type === 'golden' && !isTutorial) {
            this.shimmerTimer -= dt;
            if (this.shimmerTimer <= 0) {
                this.shimmerTimer = 1.4 + Math.random() * 1.3;
                this.spawnSparkle(0xfef08a);
            }
        }

        if (!isTutorial && onWoolDrop) {
            this.woolTimer -= dt;
            if (this.woolTimer <= 0) {
                this.woolTimer = this.typeCfg.woolInterval * (0.85 + rand() * 0.4);
                if (getZoneAt(this.x, this.y, shapeId, tideOffset, terrain) === 'safe') {
                    onWoolDrop(this.x, this.y, Math.max(2, Math.round(this.typeCfg.woolValue * goldMul)));
                }
            }
        }

        const fireMode = !isTutorial && this.type === 'ram' && isFever && hasFireRam;
        if (fireMode && !this.isFireRamActive) {
            this.isFireRamActive = true;
            this.body.setTint(0xf97316);
            this.showBadge('badge_fire');
        } else if (!fireMode && this.isFireRamActive) {
            this.isFireRamActive = false;
            this.body.clearTint();
            this.hideBadge();
        }

        let fireTargetWolf = null;
        if (!isTutorial && this.type === 'ram' && wolves) {
            let bestWolfDist = Infinity;
            for (const w of wolves) {
                if (w.isDone || !w.container || w.state === 'warning' || w.state === 'flee') continue;
                const dist = Math.hypot(w.x - this.x, w.y - this.y);
                if (dist < bestWolfDist) {
                    bestWolfDist = dist;
                    fireTargetWolf = w;
                }
                if (this.headbuttCooldown <= 0 && dist < (fireMode ? 62 : 52)) {
                    const nx = (w.x - this.x) / (dist || 1);
                    const ny = (w.y - this.y) / (dist || 1);
                    this.vx = nx * (fireMode ? 175 : 135);
                    this.vy = ny * (fireMode ? 175 : 135);
                    this.facingAngle = Math.atan2(ny, nx);
                    this.body.rotation = this.facingAngle;
                    this.playHopAnim();
                    this.spawnSparkle(fireMode ? 0xf97316 : 0xfbbf24);
                    this.headbuttCooldown = fireMode ? 0.95 : 2.6;
                    sound.playHeadbutt();
                    w.hitByRam(this.x, this.y, fireMode, onWolfAction);
                    break;
                }
            }
        }

        if (this.state === 'zoomies') {
            this.effectTimer -= dt;
            this.wanderChangeTimer -= dt;
            if (this.wanderChangeTimer <= 0) {
                this.wanderAngle += (rand() - 0.5) * 2.4;
                this.wanderChangeTimer = 0.42;
            }
            if (this.effectTimer <= 0) this.clearEffects();
        }

        let sepX = 0;
        let sepY = 0;
        let cohX = 0;
        let cohY = 0;
        let neighbors = 0;
        let closeNeighbors = 0;
        let clusterSumX = 0;
        let clusterSumY = 0;

        for (const other of allSheep) {
            if (other === this || !other.container || !other.isAlive || other.state === 'captured') continue;
            const dx = this.x - other.x;
            const dy = this.y - other.y;
            const dist = Math.hypot(dx, dy);

            if (dist > 0 && dist < SHEEP_CONFIG.SEPARATION_DIST) {
                const push = (SHEEP_CONFIG.SEPARATION_DIST - dist) / SHEEP_CONFIG.SEPARATION_DIST;
                sepX += (dx / dist) * push * 165;
                sepY += (dy / dist) * push * 165;
            }
            if (dist < PANIC.CLUSTER_RADIUS) {
                closeNeighbors++;
                clusterSumX += other.x;
                clusterSumY += other.y;
            }
            if (dist > 0 && dist < SHEEP_CONFIG.COHESION_DIST) {
                cohX += other.x;
                cohY += other.y;
                neighbors++;
            }
        }

        const hayActiveHere =
            activeHay && activeHay.isAlive && Math.hypot(activeHay.x - this.x, activeHay.y - this.y) < 120;
        if (!isTutorial && !hayActiveHere && !fireMode) {
            if (closeNeighbors >= PANIC.CLUSTER_THRESHOLD) {
                this.stress += PANIC.CLUSTER_STRESS_PER_SEC * calmFactor * dt;
            } else {
                this.stress = Math.max(0, this.stress - PANIC.DECAY_PER_SEC * dt);
            }

            if (this.stress >= PANIC.LIMIT) {
                const cx = closeNeighbors > 0 ? clusterSumX / closeNeighbors : this.x;
                const cy = closeNeighbors > 0 ? clusterSumY / closeNeighbors : this.y;
                this.triggerGentleScatter(cx, cy, shapeId, terrain);
            }
        }

        let steerX = sepX;
        let steerY = sepY;

        if (neighbors > 0 && this.state !== 'zoomies' && this.type !== 'rebel' && !isTutorial && !fireMode) {
            steerX += (cohX / neighbors - this.x) * 0.1;
            steerY += (cohY / neighbors - this.y) * 0.1;
        }

        if (windVec && !isTutorial) {
            steerX += windVec.x;
            steerY += windVec.y;
        }

        // نیروی قوی و محسوس تپه شیب‌دار لغزنده
        let onSlope = false;
        if (terrain && !isTutorial) {
            const slope = terrain.getSlopeForceAt(this.x, this.y);
            if (slope.x !== 0 || slope.y !== 0) {
                onSlope = true;
                steerX += slope.x;
                steerY += slope.y;
            }
        }

        let attractedToHay = false;
        if (!fireMode && activeHay && activeHay.isAlive && this.state !== 'flee' && this.state !== 'zoomies') {
            const dx = activeHay.x - this.x;
            const dy = activeHay.y - this.y;
            const dist = Math.hypot(dx, dy);
            if (dist < HAY_CONFIG.ATTRACT_RADIUS) {
                attractedToHay = true;
                this.state = 'wander';
                if (dist > 34) {
                    steerX += (dx / dist) * SHEEP_CONFIG.WANDER_SPEED * 3.4;
                    steerY += (dy / dist) * SHEEP_CONFIG.WANDER_SPEED * 3.4;
                }
            }
        }

        let nearestFlower = null;
        let nearestFlowerDist = Infinity;
        let senseDist =
            this.type === 'glutton'
                ? SHEEP_CONFIG.FLOWER_SENSE_DIST * 1.7 * calmFactor
                : SHEEP_CONFIG.FLOWER_SENSE_DIST;
        if (flowerRepellent) senseDist *= 0.42;

        if (!isTutorial && !fireMode && !attractedToHay && (this.state === 'wander' || this.state === 'eating')) {
            for (const f of flowers) {
                if (!f.isAlive) continue;
                const d = Math.hypot(f.x - this.x, f.y - this.y);
                if (d < senseDist && d < nearestFlowerDist) {
                    nearestFlowerDist = d;
                    nearestFlower = f;
                }
            }
        }

        if (nearestFlower && nearestFlowerDist <= SHEEP_CONFIG.FLOWER_EAT_DIST) {
            this.state = 'eating';
            this.vx *= Math.exp(-8 * dt);
            this.vy *= Math.exp(-8 * dt);
            const lookAngle = Math.atan2(nearestFlower.y - this.y, nearestFlower.x - this.x);
            this.facingAngle = Phaser.Math.Angle.RotateTo(this.facingAngle, lookAngle, dt * 8);
            this.body.rotation = this.facingAngle;
            const chomp = 1 + Math.sin(now * 0.028) * 0.08;
            this.body.setScale(this.baseScale * chomp, this.baseScale / chomp);
            this.body.y = Math.sin(now * 0.025) * 2;
            const eatRate = (this.type === 'glutton' ? 1.3 : 1) * flowerEatSpeedMul;
            nearestFlower.nibble(dt * eatRate, this, onFlowerEaten);
            if (this.container) this.container.setDepth(10 + (this.y + 400) * 0.001);
            return;
        } else if (this.state === 'eating') {
            this.state = 'wander';
        }

        if (fireMode && fireTargetWolf) {
            const dx = fireTargetWolf.x - this.x;
            const dy = fireTargetWolf.y - this.y;
            const d = Math.hypot(dx, dy) || 1;
            steerX += (dx / d) * 320;
            steerY += (dy / d) * 320;
            if (getZoneAt(this.x, this.y, shapeId, tideOffset, terrain) === 'beach') {
                const safe = getSafeDirection(this.x, this.y, shapeId, terrain);
                steerX += safe.x * 260;
                steerY += safe.y * 260;
            }
        } else if (this.state === 'flee') {
            this.fleeTimer -= dt;
            if (this.fleeTimer <= 0) this.state = 'wander';
        } else if (this.state === 'zoomies') {
            steerX += Math.cos(this.wanderAngle) * SHEEP_CONFIG.ZOOMIES_SPEED * 2.6;
            steerY += Math.sin(this.wanderAngle) * SHEEP_CONFIG.ZOOMIES_SPEED * 2.6;
        } else if (!attractedToHay && !isTutorial) {
            if (nearestFlower) {
                const dx = nearestFlower.x - this.x;
                const dy = nearestFlower.y - this.y;
                const d = nearestFlowerDist || 1;
                const hunger = this.type === 'glutton' ? 2.8 : 2.1;
                steerX += (dx / d) * SHEEP_CONFIG.WANDER_SPEED * hunger;
                steerY += (dy / d) * SHEEP_CONFIG.WANDER_SPEED * hunger;
            } else {
                this.wanderChangeTimer -= dt;
                if (this.wanderChangeTimer <= 0) {
                    this.wanderAngle += (rand() - 0.5) * 1.9;
                    this.wanderChangeTimer = 0.95 + rand() * 1.4;
                }
                steerX += Math.cos(this.wanderAngle) * SHEEP_CONFIG.WANDER_SPEED * 1.65;
                steerY += Math.sin(this.wanderAngle) * SHEEP_CONFIG.WANDER_SPEED * 1.65;

                if (this.type === 'rebel') {
                    const safe = getSafeDirection(this.x, this.y, shapeId, terrain);
                    steerX -= safe.x * SHEEP_CONFIG.WANDER_SPEED * 0.55 * calmFactor;
                    steerY -= safe.y * SHEEP_CONFIG.WANDER_SPEED * 0.55 * calmFactor;
                }
            }
        }

        this.vx += steerX * dt;
        this.vy += steerY * dt;

        // کاهش اصطکاک روی تپه شیب‌دار لغزنده
        const frictionMul = terrain && !isTutorial ? terrain.getFrictionMultiplierAt(this.x, this.y) : 1.0;
        const damping = Math.exp(-SHEEP_CONFIG.FRICTION * frictionMul * dt);
        this.vx *= damping;
        this.vy *= damping;

        let maxSpeed =
            fireMode
                ? 185
                : this.state === 'zoomies'
                    ? SHEEP_CONFIG.ZOOMIES_SPEED
                    : this.state === 'flee'
                        ? SHEEP_CONFIG.FLEE_SPEED * fleeSpeedMul
                        : attractedToHay
                            ? SHEEP_CONFIG.WANDER_SPEED * 1.85
                            : SHEEP_CONFIG.WANDER_SPEED * 1.32 * this.typeCfg.wanderSpeedMul;

        if (onSlope) {
            maxSpeed = Math.max(maxSpeed, 165);
        }

        if (this.frostTimer > 0 && !fireMode) maxSpeed *= 0.5;
        else if (this.mildChillTimer > 0 && !fireMode) maxSpeed *= 0.75;

        // کاهش شدید سرعت در گل‌ولای و خارزار
        if (terrain && !isTutorial) {
            maxSpeed *= terrain.getSpeedMultiplierAt(this.x, this.y);
        }

        const speed = Math.hypot(this.vx, this.vy);
        if (speed > maxSpeed) {
            this.vx = (this.vx / speed) * maxSpeed;
            this.vy = (this.vy / speed) * maxSpeed;
        }

        this.container.x += this.vx * dt;
        this.container.y += this.vy * dt;

        // برخورد با موانع جامد (تنه درخت / صخره)
        if (terrain && !isTutorial) {
            terrain.resolveSolidCollision(this, SHEEP_CONFIG.RADIUS);
        }

        if (isTutorial) {
            const r = Math.hypot(this.container.x, this.container.y);
            if (r > 215) {
                this.container.x = (this.container.x / r) * 215;
                this.container.y = (this.container.y / r) * 215;
            }
        }

        if (speed > 4) {
            const targetAngle = Math.atan2(this.vy, this.vx);
            this.facingAngle = Phaser.Math.Angle.RotateTo(this.facingAngle, targetAngle, dt * 10);
            this.body.rotation = this.facingAngle;

            this.walkPhase += dt * (4.8 + speed * 0.085);
            const hop = Math.abs(Math.sin(this.walkPhase));
            this.body.y = -hop * (speed > 110 ? 5.2 : 2.6);
            this.shadow.setScale((this.type === 'ram' ? 0.92 : 0.8) * (1 - hop * 0.14));

            if (speed > 125 || fireMode) {
                this.dustTimer -= dt;
                if (this.dustTimer <= 0) {
                    this.dustTimer = fireMode ? 0.12 : 0.18;
                    if (fireMode) this.spawnSparkle(0xf97316);
                    else this.spawnDustPuff(this.state === 'zoomies' ? 0xfed7aa : 0xf8fafc, 0.36);
                }
            }
        } else {
            const idleBreath = 1 + Math.sin(now * 0.005 + this.walkPhase) * 0.025;
            this.body.y = 0;
            this.body.setScale(this.baseScale * idleBreath, this.baseScale / idleBreath);
        }

        this.container.setDepth(10 + (this.y + 400) * 0.001);

        if (!isTutorial) {
            const zone = getZoneAt(this.x, this.y, shapeId, tideOffset, terrain);
            if (zone === 'beach') {
                this.warnIcon.setVisible(true);
                this.warnIcon.y = -27 + Math.sin(now * 0.014) * 3;
            } else if (zone === 'safe') {
                this.warnIcon.setVisible(false);
            } else if (zone === 'water') {
                this.enterWater(shapeId, terrain, onWaterCheck, onLost);
            }
        }
    }

    destroy() {
        if (this.container) {
            this.scene?.tweens?.killTweensOf(this.body);
            this.scene?.tweens?.killTweensOf(this.container);
            this.container.destroy();
            this.container = null;
        }
    }
}