import Phaser from 'phaser';
import {
    WORLD,
    WHISTLE,
    STAMINA,
    SHEEP_TYPES,
    HAY_CONFIG,
    MAX_CAMPAIGN_DAY,
    DISCOVERY_GUIDES,
    getDayConfig,
    pickMissionForDay,
    getPolarRadius,
    getRandomSafePoint,
    getDefaultHayPos,
    rand,
} from '../config/gameData.js';
import { gameState } from '../state/GameState.js';
import { Sheep } from '../entities/Sheep.js';
import { Flower } from '../entities/Flower.js';
import { Wolf } from '../entities/Wolf.js';
import { Dog } from '../entities/Dog.js';
import { HayBait } from '../entities/HayBait.js';
import { ChaosDirector } from '../entities/ChaosEvents.js';
import { MapInteractables } from '../entities/MapInteractables.js';
import { BossManager } from '../entities/BossManager.js';
import { TerrainSystem } from '../entities/TerrainSystem.js';
import { sound } from '../utils/SoundGen.js';
import {
    fetchDailyNews,
    fetchEdgeDirector,
    startEdgeRun,
} from '../api/edgeClient.js';
import { icon } from '../ui/Icons.js';
import { showEndOfDayModal, removeModal } from '../ui/ShopModal.js';
import { showStartMenu, removeStartMenu } from '../ui/StartMenu.js';
import {
    showDiscoveryModal,
    showWelcomeTutorialModal,
    removeDiscoveryModal,
} from '../ui/DiscoveryModal.js';
import { showPauseModal, removePauseModal } from '../ui/PauseModal.js';

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    create() {
        gameState.syncRngForStage(gameState.data.day);

        this.textResolution = Math.min(window.devicePixelRatio || 1, 2.5);
        this.dayCfg = getDayConfig(
            gameState.data.day,
            gameState.mode === 'daily',
            gameState.dailyDateKey,
            gameState.getWorldTier()
        );
        this.shapeId = this.dayCfg.island.id;
        this.season = this.dayCfg.season;
        this.isDayActive = false;
        this.isPaused = false;
        this.inTutorial = false;

        this.activeDecree = null;
        this.edgeMods = {
            wolfSpeedMul: 1.0,
            wolfBountyMul: 1.0,
            goldZoneMul: 1.0,
            windBonus: 0,
            flowerValueMul: 1.0,
            staminaRegenMul: 1.0,
        };

        this.totalDuration = this.dayCfg.durationSec;
        this.timeLeft = this.totalDuration;
        this.lastTickSec = null;

        this.discoveryQueue = [];
        this.isDiscoveryOpen = false;
        this.beehiveHintTimer = this.dayCfg.hasBeehives ? 4.8 : 0;

        this.ambientBaaTimer = 4.5 + Math.random() * 4.0;

        this.wolfSpawnTimer = this.dayCfg.firstWolfDelay;
        this.signatureWolfSpawned = false;
        this.chaosTimer = this.dayCfg.firstChaosDelay;
        this.frenzyAnnounced = false;

        this.tideOffset = 0;
        this.highTideAnnounced = false;
        this.windAngle = rand() * Math.PI * 2;
        this.windTimer = 8;
        this.windStreaks = [];
        this.seasonParticles = [];

        this.stamina = STAMINA.MAX;
        this.exhaustTimer = 0;
        this.pointerHoldTime = 0;

        this.combo = 0;
        this.comboTimer = 0;
        this.feverCharge = 0;
        this.feverTimer = 0;
        this.buoysLeft = gameState.getCardLevel('life_buoy');
        this.midDayBonusGold = 0;
        this.bossBountyEarned = 0;
        this.bossMilestone = null;
        this.woolDrops = [];
        this.newlyUnlockedClasses = [];

        this.mission = this.dayCfg.bossType
            ? null
            : pickMissionForDay(this.dayCfg.day, gameState.lastMissionId);
        this.missionProgress = 0;
        this.missionFailed = false;
        this.missionCompletedMidStage = false;
        this.hayUsedThisStage = false;
        this.flowerEatenThisStage = false;

        this.lastWhistleTime = 0;
        this.lastSwipeSoundTime = 0;
        this.isPointerDown = false;
        this.isSwiping = false;
        this.pointerStart = { x: 0, y: 0 };
        this.lastDragPos = { x: 0, y: 0 };
        this.swipeTrails = [];

        this.sheepList = [];
        this.flowerList = [];
        this.wolfList = [];
        this.dogList = [];
        this.activeHay = null;
        this.bossManager = null;
        this.interactables = null;
        this.terrain = null;
        this.tutGroup = null;
        this.tutSheep = null;

        removeModal();
        removeStartMenu();
        removePauseModal();
        removeDiscoveryModal();
        this.removeNewsBanner();
        this.removeTutorialBanner();
        this.removeCountdownOverlay();
        document.getElementById('boss-hud')?.remove();

        this.applySeasonBackground();
        this.setupResponsiveCamera();
        this.createOceanWaves();
        this.islandG = this.add.graphics().setDepth(2);
        this.redrawIsland(0);
        this.decorateIsland();
        this.terrain = new TerrainSystem(this, this.dayCfg);
        this.createSeasonalAmbient();

        this.nightOverlay = this.add
            .rectangle(0, 0, 1600, 1600, 0x0f172a, this.dayCfg.isNightRaid ? 0.22 : 0)
            .setDepth(28);

        this.windGfx = this.add.graphics().setDepth(23);
        this.swipeGfx = this.add.graphics().setDepth(24);
        this.chaos = new ChaosDirector(this);
        this.interactables = new MapInteractables(this, this.shapeId, this.dayCfg.day, {
            hasGoldenZone: this.dayCfg.hasGoldenZone,
            hasBeehives: this.dayCfg.hasBeehives,
            hiveCount: this.dayCfg.hiveCount,
            terrain: this.terrain,
        });

        this.spawnFlowers(this.dayCfg.flowerCount);
        this.spawnFlockForStage();
        this.quota = gameState.getSurvivalQuota(this.sheepList.length, this.dayCfg.day);
        this.spawnDogsFromCards();

        this.createHud();
        this.setupInputControls();
        this.setupKeyboardShortcuts();

        if (!this.registry.get('gameStarted')) {
            this.openStartMenu();
        } else {
            this.beginDayOrTutorial();
        }
    }

    applySeasonBackground() {
        const hex = `#${this.season.oceanDeep.toString(16).padStart(6, '0')}`;
        if (this.cameras?.main) {
            this.cameras.main.setBackgroundColor(hex);
        }
        document.body.style.backgroundColor = hex;
    }

    createSeasonalAmbient() {
        this.seasonGfx = this.add.graphics().setDepth(27);
        const count = this.season.particleType === 'snow' ? 30 : 20;
        this.seasonParticles = [];

        for (let i = 0; i < count; i++) {
            const colors = this.season.particleColors;
            this.seasonParticles.push({
                x: (Math.random() - 0.5) * 760,
                y: (Math.random() - 0.5) * 760,
                size:
                    this.season.particleType === 'snow'
                        ? 2.2 + Math.random() * 2.8
                        : this.season.particleType === 'sunmotes'
                            ? 2.5 + Math.random() * 3.2
                            : 3.5 + Math.random() * 3.0,
                speedY:
                    this.season.particleType === 'snow'
                        ? 24 + Math.random() * 24
                        : this.season.particleType === 'leaves'
                            ? 28 + Math.random() * 26
                            : this.season.particleType === 'sunmotes'
                                ? -(8 + Math.random() * 12)
                                : 16 + Math.random() * 18,
                driftX:
                    this.season.particleType === 'leaves'
                        ? 22 + Math.random() * 22
                        : this.season.particleType === 'petals'
                            ? 14 + Math.random() * 16
                            : (Math.random() - 0.5) * 14,
                phase: Math.random() * Math.PI * 2,
                color: colors[i % colors.length],
                alpha: 0.45 + Math.random() * 0.4,
            });
        }
    }

    updateSeasonalAmbient(dt, time) {
        if (!this.seasonGfx) return;
        this.seasonGfx.clear();

        const pType = this.season.particleType;
        for (const p of this.seasonParticles) {
            p.x += (p.driftX + Math.sin(time * 0.0018 + p.phase) * 16) * dt;
            p.y += p.speedY * dt;

            if (p.y > 410) {
                p.y = -410;
                p.x = (Math.random() - 0.5) * 760;
            } else if (p.y < -410) {
                p.y = 410;
                p.x = (Math.random() - 0.5) * 760;
            }
            if (p.x > 410) p.x = -410;
            else if (p.x < -410) p.x = 410;

            if (pType === 'snow') {
                this.seasonGfx.fillStyle(p.color, p.alpha);
                this.seasonGfx.fillCircle(p.x, p.y, p.size);
            } else if (pType === 'sunmotes') {
                const twinkle = p.alpha * (0.4 + (Math.sin(time * 0.004 + p.phase) + 1) * 0.35);
                this.seasonGfx.fillStyle(p.color, twinkle);
                this.seasonGfx.fillCircle(p.x, p.y, p.size);
            } else if (pType === 'leaves') {
                const wobble = Math.sin(time * 0.005 + p.phase);
                this.seasonGfx.fillStyle(p.color, p.alpha);
                this.seasonGfx.fillEllipse(
                    p.x,
                    p.y,
                    p.size * (1.8 + wobble * 0.4),
                    p.size * (1.0 - wobble * 0.25)
                );
            } else {
                this.seasonGfx.fillStyle(p.color, p.alpha);
                this.seasonGfx.fillEllipse(p.x, p.y, p.size * 1.4, p.size * 0.9);
            }
        }
    }

    setPausedState(paused) {
        this.isPaused = paused;
        this.isPointerDown = false;
        this.isSwiping = false;
        if (this.time) this.time.paused = paused;
        if (this.tweens) this.tweens.timeScale = paused ? 0 : 1;
    }

    openPauseMenu() {
        if (!this.isDayActive || this.isPaused || this.isDiscoveryOpen) return;
        this.setPausedState(true);
        showPauseModal({
            day: this.dayCfg.day,
            islandName: `${this.dayCfg.island.name} • ${this.season.name}`,
            mode: gameState.mode,
            onResume: () => this.setPausedState(false),
            onRetry: () => {
                this.setPausedState(false);
                gameState.retryCurrentDay();
                this.scene.restart();
            },
            onRestart: () => {
                this.setPausedState(false);
                gameState.reset();
                this.scene.restart();
            },
            onMainMenu: () => {
                this.setPausedState(false);
                this.registry.set('gameStarted', false);
                this.scene.restart();
            },
        });
    }

    triggerDiscovery(guideId) {
        if (!guideId || !DISCOVERY_GUIDES[guideId] || gameState.hasDiscovered(guideId)) return;
        gameState.markDiscovered(guideId);
        this.discoveryQueue.push(guideId);
        if (!this.isDiscoveryOpen) {
            this.processDiscoveryQueue();
        }
    }

    processDiscoveryQueue() {
        if (this.discoveryQueue.length === 0) {
            this.isDiscoveryOpen = false;
            this.setPausedState(false);
            return;
        }
        const nextId = this.discoveryQueue.shift();
        this.isDiscoveryOpen = true;
        this.setPausedState(true);
        showDiscoveryModal(nextId, () => {
            this.processDiscoveryQueue();
        });
    }

    setupKeyboardShortcuts() {
        this._onKeyDown = (e) => {
            if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
                if (this.isDayActive && !this.isPaused && !this.isDiscoveryOpen) {
                    this.openPauseMenu();
                }
            }
        };
        window.addEventListener('keydown', this._onKeyDown);
    }

    openStartMenu() {
        this.isDayActive = false;
        sound.setMusicMode('menu');
        showStartMenu({
            onStart: () => {
                sound.startMusic('calm');
                gameState.continueNormalGame();
                this.registry.set('gameStarted', true);
                this.scene.restart();
            },
            onNewGame: () => {
                sound.startMusic('calm');
                gameState.startNormalNewGame();
                this.registry.set('gameStarted', true);
                this.scene.restart();
            },
            onDailyChallenge: () => {
                sound.startMusic('calm');
                gameState.startDailyChallenge();
                this.registry.set('gameStarted', true);
                this.scene.restart();
            },
        });
    }

    beginDayOrTutorial() {
        if (!gameState.meta.welcomeSeen && gameState.mode === 'normal' && this.dayCfg.day === 1) {
            this.setPausedState(true);
            showWelcomeTutorialModal(() => {
                gameState.markWelcomeSeen();
                this.setPausedState(false);
                if (!gameState.meta.tutorialDone && this.sheepList.length > 0) {
                    this.startMicroTutorial();
                } else {
                    this.startDayAction();
                }
            });
            return;
        }

        if (
            !gameState.meta.tutorialDone &&
            gameState.mode === 'normal' &&
            this.dayCfg.day === 1 &&
            this.sheepList.length > 0
        ) {
            this.startMicroTutorial();
        } else {
            this.startDayAction();
        }
    }

    startMicroTutorial() {
        this.inTutorial = true;
        sound.startMusic('calm');
        this.tutSheep = this.sheepList[0];
        this.tutSheep.container.setPosition(172, 0);
        this.tutSheep.vx = 0;
        this.tutSheep.vy = 0;

        const targetX = 226;
        const targetY = 0;
        const gfx = this.add.graphics().setDepth(35);
        gfx.lineStyle(5, 0x22c55e, 0.95);
        gfx.strokeCircle(targetX, targetY, 30);
        gfx.fillStyle(0x22c55e, 0.25);
        gfx.fillCircle(targetX, targetY, 30);
        gfx.lineStyle(4, 0xffffff, 0.95);
        gfx.lineBetween(195, -42, 115, -42);
        gfx.fillStyle(0xffffff, 1);
        gfx.fillTriangle(104, -42, 120, -50, 120, -34);

        const label = this.add
            .text(targetX, targetY + 46, 'اینجا تپ کن', {
                fontFamily: 'Vazirmatn, sans-serif',
                fontSize: '16px',
                fontStyle: 'bold',
                color: '#ffffff',
                stroke: '#0b0e14',
                strokeThickness: 5,
                resolution: this.textResolution,
            })
            .setOrigin(0.5)
            .setDepth(36);

        this.tweens.add({ targets: label, y: targetY + 38, duration: 450, yoyo: true, repeat: -1 });
        this.tutGroup = { gfx, label };

        const banner = document.createElement('div');
        banner.id = 'tut-banner';
        banner.className = 'game-toast-banner is-tut';
        banner.textContent = 'پشت گوسفند (دایره سبز) تپ کن یا سوایپ کوتاه به سمت داخل بزن';
        document.body.appendChild(banner);
    }

    removeTutorialBanner() {
        document.getElementById('tut-banner')?.remove();
        if (this.tutGroup) {
            this.tutGroup.gfx?.destroy();
            this.tutGroup.label?.destroy();
            this.tutGroup = null;
        }
    }

    completeTutorial() {
        if (!this.inTutorial) return;
        this.inTutorial = false;
        this.removeTutorialBanner();
        gameState.markTutorialDone();
        sound.playSave(2);
        sound.playBaa('happy');
        this.showFloatingText(0, -85, 'عالیه! مرحله شروع شد', '#4ade80');
        this.startDayAction();
    }

    startDayAction() {
        gameState.saveDaySnapshot();
        this.isDayActive = true;
        sound.startMusic(this.dayCfg.bossType ? 'intense' : 'calm');

        if (this.dayCfg.day === 1 && !gameState.data.runToken) {
            startEdgeRun({
                mode: gameState.mode,
                dateKey: gameState.dailyDateKey,
                classId: gameState.data.classId,
            }).then((res) => {
                if (res?.ok && res.runToken) {
                    gameState.setRunToken(res.runToken, res.startedAt);
                }
            });
        }

        const prefix = gameState.mode === 'daily' ? 'چالش روزانه • ' : '';
        const tierLabel = this.dayCfg.worldTier >= 2 ? ` • سطح ${this.dayCfg.worldTier}` : '';
        this.showFloatingText(
            0,
            -115,
            `${prefix}مرحله ${this.dayCfg.day}/${MAX_CAMPAIGN_DAY}: ${this.dayCfg.island.name} (${this.season.name}${tierLabel})`,
            '#ffffff'
        );

        // معرفی دقیق عوارض و عوامل جدید در همان مرحله خودش
        this.time.delayedCall(1200, () => {
            if (!this.isDayActive || this.dayCfg.bossType) return;
            if (this.dayCfg.day === 3 && this.terrain?.muds?.length > 0) {
                this.triggerDiscovery('terrain_mud');
            } else if (this.dayCfg.day === 6 && this.terrain?.slopes?.length > 0) {
                this.triggerDiscovery('terrain_slope');
            } else if (this.dayCfg.day === 7 && this.dayCfg.hasWind) {
                this.triggerDiscovery('wind_intro');
            } else if (this.dayCfg.day === 8 && this.terrain?.pond) {
                this.triggerDiscovery('terrain_pond');
            }
        });

        const allowedLoss = this.sheepList.length - this.quota;
        if (allowedLoss === 0) {
            this.time.delayedCall(900, () => {
                if (this.isDayActive) {
                    this.showFloatingText(0, -80, 'هشدار: از دست دادن حتی ۱ گوسفند = باخت!', '#fb7185');
                }
            });
        } else if (allowedLoss === 1 && this.dayCfg.day >= 4) {
            this.time.delayedCall(900, () => {
                if (this.isDayActive) {
                    this.showFloatingText(0, -80, 'حداکثر ۱ گوسفند حاشیه خطا داری!', '#fde047');
                }
            });
        } else if (this.dayCfg.hasWind) {
            this.showFloatingText(0, -80, 'باد ساحلی قوی فعال است!', '#99f6e4');
        }

        if (this.dayCfg.bossType) {
            this.bossManager = new BossManager(
                this,
                this.dayCfg.bossType,
                this.dayCfg.day,
                this.shapeId,
                {
                    onBossHitBonus: (bx, by, gold, msg) => this.addComboAndBonus(bx, by, gold, msg),
                    onBossDefeated: (bounty) => this.handleBossDefeated(bounty),
                    onSheepLost: () => this.handleSheepLost(),
                    onSummonWolf: (wType) => this.spawnWolf(wType),
                }
            );
            this.triggerDiscovery(`boss_${this.dayCfg.bossType}`);
        }

        if (this.dayCfg.edgeDecreeAllowed || this.dayCfg.bossType) {
            this.loadEdgeDirector();
        }
    }

    async loadEdgeDirector() {
        const res = await fetchEdgeDirector({
            day: this.dayCfg.day,
            mode: gameState.mode,
            dateKey: gameState.dailyDateKey,
            nickname: gameState.nickname || 'چوپان',
            islandName: this.dayCfg.island.name,
            seasonName: this.season.name,
            bossType: this.dayCfg.bossType,
            flockSize: this.sheepList.length,
        });

        if (!this.isDayActive) return;

        if (res?.ok && res.decree && this.dayCfg.edgeDecreeAllowed) {
            this.activeDecree = res.decree;
            this.edgeMods = {
                ...this.edgeMods,
                ...(res.decree.mods || {}),
            };
            this.renderEdgeDecreePill(res.decree);
        }

        if (res?.bossTaunt) {
            this.showToastBanner(
                this.dayCfg.bossType === 'wolf_king' ? 'crown' : 'kraken',
                res.bossTaunt,
                '#4c1d95',
                '#fef08a',
                4200
            );
            return;
        }

        if (res?.decree?.lore) {
            this.showToastBanner(
                res.decree.icon || 'sparkle',
                `${res.decree.title}: ${res.decree.lore}`,
                '#ffffff',
                '#0b0e14',
                3800
            );
            return;
        }

        if (this.dayCfg.day >= 3 && !this.dayCfg.bossType) {
            this.loadDailyNews();
        }
    }

    renderEdgeDecreePill(decree) {
        const el = document.getElementById('edge-decree-pill');
        if (!el || !decree) return;
        el.style.display = 'inline-flex';
        el.style.background = decree.badgeColor || '#dc2626';
        el.innerHTML = `
          <span class="ui-icon" style="width:17px;height:17px;flex-shrink:0;">${icon(decree.icon || 'sparkle', 17)}</span>
          <span style="color:#ffe047;font-weight:900;">${decree.title}:</span>
          <span style="color:#ffffff;font-weight:800;">${decree.effectSummary}</span>
        `;
    }

    showToastBanner(iconKey, text, bgColor = '#ffffff', textColor = '#0b0e14', durationMs = 3400) {
        this.removeNewsBanner();
        const cleanText = String(text || '')
            .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
            .trim();
        if (!cleanText) return;

        const banner = document.createElement('div');
        banner.id = 'news-banner';
        banner.className = 'game-toast-banner';
        banner.style.background = bgColor;
        banner.style.color = textColor;
        banner.innerHTML = `${icon(iconKey, 16)}<span>${cleanText}</span>`;
        document.body.appendChild(banner);
        setTimeout(() => {
            if (banner.parentNode) banner.style.opacity = '0';
            setTimeout(() => banner.remove(), 480);
        }, durationMs);
    }

    handleBossDefeated(bounty) {
        this.bossBountyEarned = Math.round(bounty * gameState.getGoldMultiplier());
        this.bossMilestone = gameState.recordBossDefeated(this.dayCfg.bossType);
        sound.setMusicMode('calm');

        if (this.dayCfg.day >= MAX_CAMPAIGN_DAY) {
            this.showFloatingText(0, -130, 'قهرمان جزیره! شاه گرگ‌ها شکست خورد!', '#fde047');
        } else if (this.bossMilestone) {
            this.showFloatingText(
                0,
                -130,
                `اسلات ${this.bossMilestone.newMaxSlots} کارت باز شد!`,
                '#fde047'
            );
        }

        this.time.delayedCall(1300, () => {
            if (this.isDayActive) this.endDay(true);
        });
    }

    async loadDailyNews() {
        const { text } = await fetchDailyNews(this.dayCfg.day, this.sheepList.length);
        if (!this.isDayActive) return;
        this.showToastBanner('book', text, '#ffffff', '#0b0e14', 3000);
    }

    removeNewsBanner() {
        document.getElementById('news-banner')?.remove();
    }

    removeCountdownOverlay() {
        document.getElementById('countdown-overlay')?.remove();
    }

    showCenterCountdown(sec) {
        this.removeCountdownOverlay();
        const el = document.createElement('div');
        el.id = 'countdown-overlay';
        const caption = this.dayCfg.bossType
            ? 'زمان نبرد باس رو به پایان است!'
            : 'ثانیه‌های پایانی مرحله!';
        el.innerHTML = `
      <div class="countdown-num">${sec}</div>
      <div class="countdown-caption">${caption}</div>
    `;
        document.body.appendChild(el);
    }

    setupResponsiveCamera() {
        const updateCamera = (width, height) => {
            if (!this.cameras || !this.cameras.main) return;
            const cam = this.cameras.main;
            const isPortrait = height > width;
            const viewW = isPortrait ? 680 : 790;
            const viewH = isPortrait ? 930 : 815;
            const zoom = Math.min(width / viewW, height / viewH);
            cam.setZoom(zoom);
            cam.centerOn(0, isPortrait ? -28 : -24);
        };
        updateCamera(this.scale.width, this.scale.height);
        this._onResize = (gameSize) => updateCamera(gameSize.width, gameSize.height);
        this.scale.on('resize', this._onResize);
        this.events.once('shutdown', () => {
            this.scale.off('resize', this._onResize);
            if (this._onKeyDown) window.removeEventListener('keydown', this._onKeyDown);
            this.removeCountdownOverlay();
            document.getElementById('frenzy-border')?.remove();
            document.getElementById('boss-hud')?.remove();
            document.getElementById('game-hud-wrap')?.remove();
            document.getElementById('hud-bottom-dock')?.remove();
            removePauseModal();
            removeDiscoveryModal();
            this.bossManager?.destroy();
            this.interactables?.destroy();
            this.terrain?.destroy();
        });
    }

    consumeStamina(amount, x, y) {
        if (this.inTutorial) return true;
        if (this.exhaustTimer > 0) return false;
        this.stamina = Math.max(0, this.stamina - amount);
        if (this.stamina <= 0) {
            this.triggerExhaustion(x, y);
            return false;
        }
        this.updateStaminaBar();
        return true;
    }

    triggerExhaustion(x = 0, y = -60) {
        this.exhaustTimer = STAMINA.EXHAUST_PENALTY_SEC;
        this.isPointerDown = false;
        this.isSwiping = false;
        this.pointerHoldTime = 0;
        this.showFloatingText(x, y, 'نفست گرفت!', '#f87171');
        this.updateStaminaBar();
    }

    setupInputControls() {
        this.input.on('pointerdown', (pointer) => {
            if (this.isPaused || this.isDiscoveryOpen) return;
            if (!this.isDayActive && !this.inTutorial) return;
            if (pointer.event?.target && pointer.event.target.tagName !== 'CANVAS') return;

            const pt = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
            if (this.isDayActive && this.tryCollectWoolAt(pt.x, pt.y, 44)) return;

            if (this.exhaustTimer > 0 && !this.inTutorial) return;

            this.isPointerDown = true;
            this.isSwiping = false;
            this.pointerHoldTime = 0;
            this.pointerStart = { x: pt.x, y: pt.y };
            this.lastDragPos = { x: pt.x, y: pt.y };
        });

        this.input.on('pointermove', (pointer) => {
            if (this.isPaused || this.isDiscoveryOpen) return;
            if (!this.isPointerDown || (!this.isDayActive && !this.inTutorial)) return;
            if (this.exhaustTimer > 0 && !this.inTutorial) {
                this.isPointerDown = false;
                this.isSwiping = false;
                return;
            }

            const pt = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

            if (!this.isSwiping) {
                if (Math.hypot(pt.x - this.pointerStart.x, pt.y - this.pointerStart.y) >= 18) {
                    this.isSwiping = true;
                }
            }

            if (this.isSwiping) {
                const dx = pt.x - this.lastDragPos.x;
                const dy = pt.y - this.lastDragPos.y;
                const stepDist = Math.hypot(dx, dy);
                if (stepDist >= 16) {
                    const stepCost = gameState.getSwipeStepStaminaCost(this.feverTimer > 0);
                    if (!this.consumeStamina(stepCost, pt.x, pt.y)) return;
                    this.triggerSwipe(
                        this.lastDragPos.x,
                        this.lastDragPos.y,
                        pt.x,
                        pt.y,
                        dx / stepDist,
                        dy / stepDist
                    );
                    this.lastDragPos = { x: pt.x, y: pt.y };
                }
            }
        });

        const handleUp = (pointer) => {
            if (!this.isPointerDown) return;
            const wasSwiping = this.isSwiping;
            const heldSec = this.pointerHoldTime;
            this.isPointerDown = false;
            this.isSwiping = false;
            this.pointerHoldTime = 0;

            if (
                !this.isPaused &&
                !this.isDiscoveryOpen &&
                !wasSwiping &&
                heldSec <= STAMINA.MAX_TAP_HOLD_SEC &&
                (this.isDayActive || this.inTutorial)
            ) {
                const pt = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
                this.triggerWhistle(pt.x, pt.y);
            }
        };
        this.input.on('pointerup', handleUp);
        this.input.on('pointerupoutside', handleUp);
    }

    createHud() {
        document.getElementById('game-hud-wrap')?.remove();
        document.getElementById('hud-bottom-dock')?.remove();
        document.getElementById('frenzy-border')?.remove();

        const frenzyBorder = document.createElement('div');
        frenzyBorder.id = 'frenzy-border';
        frenzyBorder.style.cssText = `
      position: fixed; inset: 0; pointer-events: none; z-index: 35;
      box-shadow: inset 0 0 42px rgba(239, 68, 68, 0); transition: box-shadow 0.3s ease;
    `;
        document.body.appendChild(frenzyBorder);

        const cls = gameState.getClassConfig();
        const musicOn = !gameState.meta.musicMuted;
        const sfxOn = !gameState.meta.sfxMuted;
        const tierBadge =
            this.dayCfg.worldTier >= 2
                ? `<span class="hud-island-chip" style="background:#7c3aed;">سطح ${this.dayCfg.worldTier}</span>`
                : '';

        const wrap = document.createElement('div');
        wrap.id = 'game-hud-wrap';
        wrap.innerHTML = `
      <div class="hud-top-bar">
        <div class="hud-top-right">
          <div class="hud-stage-badge">
            ${icon(cls.icon, 15)}
            <span>${gameState.mode === 'daily' ? 'روزانه ' : ''}م${this.dayCfg.day}/${MAX_CAMPAIGN_DAY}</span>
            ${tierBadge}
            <span class="hud-island-chip" style="background:${this.season.badgeColor};">
              ${this.season.name} • ${this.dayCfg.island.name}
            </span>
          </div>

          <div class="hud-cards-row hud-hide-mobile">
            <div class="hud-stat-card" id="hud-sheep-card-d" title="گوسفندهای زنده / حداقل لازم">
              ${icon('sheep', 17)}
              <span class="hud-stat-value" id="hud-sheep-d">${this.getAliveSheepCount()}/${this.quota}</span>
            </div>

            <div class="hud-stat-card" title="گل‌های سالم">
              ${icon('flower', 16)}
              <span class="hud-stat-value" id="hud-flowers-d">${this.getAliveFlowerCount()}</span>
            </div>

            <div class="hud-stat-card is-gold" title="سکه">
              ${icon('coin', 16)}
              <span class="hud-stat-value" id="hud-gold-d">${gameState.data.gold}</span>
            </div>

            ${
            this.buoysLeft > 0
                ? `<div class="hud-stat-card" title="حلقه نجات">
                         ${icon('buoy', 15)}
                         <span class="hud-stat-value" id="hud-buoy-d">${this.buoysLeft}</span>
                       </div>`
                : ''
        }
          </div>
        </div>

        <div class="hud-top-center">
          <div class="hud-hero-timer" id="hud-timer-box">
            ${icon('clock', 16)}
            <span class="hud-timer-num" id="hud-time">${Math.ceil(this.timeLeft)}</span>
            <div class="hud-timer-bar">
              <div class="hud-timer-bar-fill" id="hud-timer-fill"></div>
            </div>
          </div>
        </div>

        <div class="hud-top-left">
          <button id="btn-music" class="hud-icon-btn hud-hide-mobile" title="موزیک بازی">
            ${icon(musicOn ? 'musicOn' : 'musicOff', 17)}
          </button>
          <button id="btn-sfx" class="hud-icon-btn hud-hide-mobile" title="افکت صوتی">
            ${icon(sfxOn ? 'soundOn' : 'soundOff', 17)}
          </button>
          <button id="btn-pause" class="hud-icon-btn is-amber" title="توقف بازی (Esc)">
            ${icon('pause', 17)}
          </button>
        </div>
      </div>

      <div class="hud-sub-bar">
        <div class="hud-cards-row hud-mobile-only" style="display:none;">
          <div class="hud-stat-card" id="hud-sheep-card">
            ${icon('sheep', 16)}
            <span class="hud-stat-value" id="hud-sheep">${this.getAliveSheepCount()}/${this.quota}</span>
          </div>
          <div class="hud-stat-card">
            ${icon('flower', 15)}
            <span class="hud-stat-value" id="hud-flowers">${this.getAliveFlowerCount()}</span>
          </div>
          <div class="hud-stat-card is-gold">
            ${icon('coin', 15)}
            <span class="hud-stat-value" id="hud-gold">${gameState.data.gold}</span>
          </div>
          ${
            this.buoysLeft > 0
                ? `<div class="hud-stat-card">
                       ${icon('buoy', 14)}
                       <span class="hud-stat-value" id="hud-buoy">${this.buoysLeft}</span>
                     </div>`
                : ''
        }
        </div>
        ${this.mission ? `<div id="mission-pill"></div>` : ''}
        <div id="boss-hud-slot"></div>
        <div id="edge-decree-pill"></div>
      </div>
    `;
        document.body.appendChild(wrap);

        const syncMobileStats = () => {
            const mobRow = wrap.querySelector('.hud-mobile-only');
            if (mobRow) {
                mobRow.style.display = window.innerWidth <= 780 ? 'inline-flex' : 'none';
            }
        };
        syncMobileStats();
        this._onHudResize = syncMobileStats;
        window.addEventListener('resize', this._onHudResize);
        this.events.once('shutdown', () => {
            if (this._onHudResize) window.removeEventListener('resize', this._onHudResize);
        });

        wrap.querySelector('#btn-pause').addEventListener('click', (e) => {
            e.stopPropagation();
            this.openPauseMenu();
        });

        wrap.querySelector('#btn-music').addEventListener('click', (e) => {
            e.stopPropagation();
            const on = gameState.toggleMusic();
            e.currentTarget.innerHTML = icon(on ? 'musicOn' : 'musicOff', 17);
            sound.playClick();
        });

        wrap.querySelector('#btn-sfx').addEventListener('click', (e) => {
            e.stopPropagation();
            const on = gameState.toggleSfx();
            e.currentTarget.innerHTML = icon(on ? 'soundOn' : 'soundOff', 17);
            if (on) sound.playClick();
        });

        if (this.mission) {
            this.updateMissionPill();
        }

        const dock = document.createElement('div');
        dock.id = 'hud-bottom-dock';
        dock.innerHTML = `
      <div class="hud-gauge-wrap">
        <div class="hud-gauge-header">
          <span style="display:inline-flex; align-items:center; gap:4px; color:#7dd3fc;">
            ${icon('lungs', 12)}
            <span id="stamina-label">نفس</span>
          </span>
          <span id="stamina-pct">100%</span>
        </div>
        <div class="hud-gauge">
          <div id="stamina-fill" class="hud-gauge-fill" style="width:100%; background:linear-gradient(90deg, #0ea5e9, #38bdf8);"></div>
        </div>
      </div>

      <button id="btn-drop-hay" class="hay-action-btn">
        ${icon('hay', 17)}
        <span id="hay-btn-text">علوفه (${gameState.data.hayCount})</span>
      </button>

      <div class="hud-gauge-wrap">
        <div class="hud-gauge-header">
          <span style="display:inline-flex; align-items:center; gap:4px; color:#ffe047;">
            ${icon('fire', 12)}
            <span id="fever-label">تب طلا</span>
          </span>
          <span id="fever-pct">0%</span>
        </div>
        <div class="hud-gauge">
          <div id="fever-fill" class="hud-gauge-fill" style="width:0%; background:linear-gradient(90deg, #f59e0b, #ef4444);"></div>
        </div>
      </div>
    `;
        document.body.appendChild(dock);

        dock.querySelector('#btn-drop-hay').addEventListener('click', (e) => {
            e.stopPropagation();
            this.tryDropHay();
        });
        this.updateHayButton();
    }

    syncGoldHud() {
        const val = String(Math.max(0, gameState.data.gold + this.midDayBonusGold));
        const g1 = document.getElementById('hud-gold');
        const g2 = document.getElementById('hud-gold-d');
        if (g1) g1.textContent = val;
        if (g2) g2.textContent = val;
    }

    updateMissionPill() {
        const el = document.getElementById('mission-pill');
        if (!el || !this.mission) return;
        const m = this.mission;

        if (this.missionFailed) {
            el.style.background = '#be123c';
            el.style.color = '#ffffff';
            el.innerHTML = `${icon('alert', 14)}<span>ناموفق: ${m.title}</span>`;
            return;
        }

        if (this.missionCompletedMidStage) {
            el.style.background = '#15803d';
            el.style.color = '#ffffff';
            el.innerHTML = `${icon('check', 14)}<span>تکمیل شد (+${m.rewardGold} سکه)</span>`;
            return;
        }

        if (m.id === 'no_flower_eaten' || m.id === 'no_hay' || m.id === 'stamina_pro') {
            el.innerHTML = `${icon(m.icon, 14)}<span>${m.title} (+${m.rewardGold})</span>`;
        } else {
            el.innerHTML = `${icon(m.icon, 14)}<span>${m.title} (${Math.min(m.target, this.missionProgress)}/${m.target})</span>`;
        }
    }

    advanceMission(missionId, amount = 1, setExact = false) {
        if (!this.mission || this.mission.id !== missionId || this.missionCompletedMidStage || this.missionFailed) {
            return;
        }
        this.missionProgress = setExact
            ? Math.max(this.missionProgress, amount)
            : this.missionProgress + amount;

        if (this.missionProgress >= this.mission.target) {
            this.missionCompletedMidStage = true;
            sound.playEvolution();
            this.showFloatingText(0, -100, `ماموریت تکمیل شد! +${this.mission.rewardGold} سکه`, '#4ade80');
        }
        this.updateMissionPill();
    }

    isMissionSucceededAtEnd() {
        if (!this.mission || this.missionFailed) return false;
        if (this.mission.id === 'no_flower_eaten') return !this.flowerEatenThisStage;
        if (this.mission.id === 'no_hay') return !this.hayUsedThisStage;
        if (this.mission.id === 'stamina_pro') return this.exhaustTimer === 0 && this.stamina >= 10;
        return this.missionCompletedMidStage;
    }

    updateStaminaBar() {
        const fill = document.getElementById('stamina-fill');
        const label = document.getElementById('stamina-label');
        const pctEl = document.getElementById('stamina-pct');
        if (!fill || !label) return;
        if (this.exhaustTimer > 0) {
            const p = Math.round((1 - this.exhaustTimer / STAMINA.EXHAUST_PENALTY_SEC) * 100);
            fill.style.width = `${p}%`;
            fill.style.background = '#ef4444';
            label.textContent = 'خسته!';
            if (pctEl) pctEl.textContent = '...';
        } else {
            const p = Math.round((this.stamina / STAMINA.MAX) * 100);
            fill.style.width = `${p}%`;
            fill.style.background =
                this.stamina < 28 ? '#f97316' : 'linear-gradient(90deg, #0ea5e9, #38bdf8)';
            label.textContent = 'نفس';
            if (pctEl) pctEl.textContent = `${p}%`;
        }
    }

    updateHayButton() {
        const btn = document.getElementById('btn-drop-hay');
        const txt = document.getElementById('hay-btn-text');
        if (!btn || !txt) return;
        const count = gameState.data.hayCount;
        const isBusy = Boolean(this.activeHay && this.activeHay.isAlive);
        txt.textContent = isBusy ? 'علوفه فعال' : `علوفه (${count})`;
        btn.style.opacity = count > 0 && !isBusy ? '1' : '0.45';
    }

    tryDropHay() {
        if (!this.isDayActive || this.isPaused || this.isDiscoveryOpen) return;
        if (this.activeHay && this.activeHay.isAlive) return;
        if (!gameState.useHay()) return;

        this.hayUsedThisStage = true;
        if (this.mission?.id === 'no_hay') {
            this.missionFailed = true;
            this.updateMissionPill();
        }

        const pos = getDefaultHayPos(this.shapeId);
        sound.playSave();
        sound.playBaa('happy');
        this.activeHay = new HayBait(this, pos.x, pos.y, HAY_CONFIG.DURATION_SEC);
        // خنثی کردن صاعقه‌های نزدیک بسته علوفه
        this.chaos?.clearLightningNearHay(pos.x, pos.y);
        this.showFloatingText(pos.x, pos.y - 36, 'بسته علوفه آماده است!', '#fde047');
        this.updateHayButton();
    }

    addFever(amount) {
        if (this.feverTimer > 0) return;
        const bonusMul = gameState.getFeverChargeMultiplier();
        this.feverCharge = Math.min(100, this.feverCharge + amount * bonusMul);
        if (this.feverCharge >= 100) {
            this.feverCharge = 0;
            this.feverTimer = 4.5 + gameState.getCardLevel('fever_master') * 1.5;
            this.stamina = STAMINA.MAX;
            this.exhaustTimer = 0;
            this.updateStaminaBar();
            sound.playFever();
            this.advanceMission('fever_rush', 1);
            this.cameras.main.shake(170, 0.0045);
            const fireTxt = gameState.hasEvolution('fire_ram') ? ' + قوچ‌های آتشین!' : '';
            this.showFloatingText(0, -85, `حالت سوپر چوپان فعال شد!${fireTxt}`, '#fde047');
        }
        this.updateFeverBar();
    }

    updateFeverBar() {
        const fill = document.getElementById('fever-fill');
        const label = document.getElementById('fever-label');
        const pctEl = document.getElementById('fever-pct');
        if (!fill || !label) return;
        if (this.feverTimer > 0) {
            const maxF = 4.5 + gameState.getCardLevel('fever_master') * 1.5;
            fill.style.width = `${(this.feverTimer / maxF) * 100}%`;
            fill.style.background = 'linear-gradient(90deg, #fde047, #f97316)';
            label.textContent = 'سوپر!';
            if (pctEl) pctEl.textContent = `${Math.ceil(this.feverTimer)}s`;
        } else {
            const p = Math.round(this.feverCharge);
            fill.style.width = `${p}%`;
            fill.style.background = 'linear-gradient(90deg, #f59e0b, #ef4444)';
            label.textContent = this.combo >= 2 ? `x${this.combo}` : 'تب طلا';
            if (pctEl) pctEl.textContent = `${p}%`;
        }
    }

    addComboAndBonus(x, y, baseGold, customLabel = null, extraFever = 15) {
        this.combo = Math.min(8, this.combo + 1);
        this.comboTimer = 4.6;
        this.advanceMission('combo_3', this.combo, true);
        this.advanceMission('combo_5', this.combo, true);

        const feverMul = this.feverTimer > 0 ? 1.25 : 1.0;
        const comboMul = this.combo >= 5 ? 1.25 : this.combo >= 3 ? 1.12 : 1.0;
        const onboardingMul = this.dayCfg.day <= 2 ? 0.72 : 1.0;
        const earned = Math.max(
            1,
            Math.round(baseGold * comboMul * feverMul * gameState.getGoldMultiplier() * onboardingMul)
        );

        this.midDayBonusGold += earned;
        this.syncGoldHud();

        this.addFever(extraFever);
        const label = customLabel
            ? `${customLabel} (+${earned} سکه)`
            : `+${earned} سکه${this.combo >= 3 ? ` | x${this.combo}` : ''}`;
        this.showFloatingText(x, y, label, '#fde047');
    }

    announceNewUnlocks(unlockedList) {
        if (!unlockedList || unlockedList.length === 0) return;
        for (const cls of unlockedList) {
            if (!this.newlyUnlockedClasses.some((c) => c.id === cls.id)) {
                this.newlyUnlockedClasses.push(cls);
                sound.playEvolution();
                this.showFloatingText(0, -110, `کلاس جدید باز شد: ${cls.name}`, '#4ade80');
            }
        }
    }

    spawnWoolDrop(x, y, value) {
        if (this.woolDrops.length >= 4) return;
        const sprite = this.add.image(x, y, 'wool_drop').setDepth(18).setScale(0.15);
        this.tweens.add({ targets: sprite, scale: 0.78, duration: 260, ease: 'Back.easeOut' });
        this.woolDrops.push({ sprite, x, y, value, life: 6.5, phase: Math.random() * Math.PI * 2 });
    }

    tryCollectWoolAt(x, y, radius) {
        let collected = false;
        for (let i = this.woolDrops.length - 1; i >= 0; i--) {
            const w = this.woolDrops[i];
            if (Math.hypot(w.x - x, w.y - y) <= radius) {
                collected = true;
                this.woolDrops.splice(i, 1);
                sound.playCoin(this.combo + 1);
                this.advanceMission('collect_wool_2', 1);
                this.advanceMission('collect_wool_4', 1);
                this.addComboAndBonus(w.x, w.y, w.value, null, 11);
                for (let k = 0; k < 5; k++) {
                    const a = (k / 5) * Math.PI * 2;
                    const p = this.add
                        .image(w.x, w.y, 'star_particle')
                        .setDepth(28)
                        .setScale(0.36)
                        .setTint(0xfde047);
                    this.tweens.add({
                        targets: p,
                        x: w.x + Math.cos(a) * 28,
                        y: w.y + Math.sin(a) * 28,
                        alpha: 0,
                        rotation: 1.5,
                        duration: 280,
                        onComplete: () => p.destroy(),
                    });
                }
                w.sprite.destroy();
            }
        }
        return collected;
    }

    handleWolfAction({ type, wolf, x, y, message }) {
        const fxX = x ?? wolf.x;
        const fxY = y ?? wolf.y;
        const edgeBountyMul = this.edgeMods.wolfBountyMul || 1.0;

        if (type === 'water_ko') {
            this.cameras.main.shake(150, 0.0045);
            const unlocked = gameState.recordWolfDefeated(true);
            this.announceNewUnlocks(unlocked);
            this.advanceMission('water_ko_1', 1);
            this.advanceMission('water_ko_2', 1);
            this.addComboAndBonus(
                fxX,
                fxY,
                Math.round(wolf.cfg.bounty * 2 * edgeBountyMul),
                message,
                40
            );
        } else if (type === 'rescued' || type === 'scared') {
            this.cameras.main.shake(100, 0.003);
            sound.playSave(this.combo + 1);
            const unlocked = gameState.recordWolfDefeated(false);
            this.announceNewUnlocks(unlocked);
            this.addComboAndBonus(
                fxX,
                fxY,
                Math.round(wolf.cfg.bounty * edgeBountyMul),
                message,
                16
            );
        } else {
            this.showFloatingText(fxX, fxY, message, '#80ed99');
        }
    }

    updateHud() {
        const tEl = document.getElementById('hud-time');
        const tBox = document.getElementById('hud-timer-box');
        const tFill = document.getElementById('hud-timer-fill');

        const sec = Math.max(0, Math.ceil(this.timeLeft));
        if (tEl) tEl.textContent = String(sec);
        if (tFill) {
            const pct = Math.max(0, Math.min(100, (this.timeLeft / this.totalDuration) * 100));
            tFill.style.width = `${pct}%`;
            tFill.style.background =
                sec <= 5
                    ? '#ffffff'
                    : sec <= 12
                        ? '#ffe047'
                        : 'linear-gradient(90deg, #4ade80, #ffe047)';
        }
        if (tBox) {
            tBox.classList.toggle('is-critical', sec <= 5 && sec > 0);
            tBox.classList.toggle('is-warning', sec > 5 && sec <= 12);
        }

        const alive = this.getAliveSheepCount();
        const sheepTxt = `${alive}/${this.quota}`;
        const isDanger = alive <= this.quota;

        ['hud-sheep', 'hud-sheep-d'].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.textContent = sheepTxt;
        });
        ['hud-sheep-card', 'hud-sheep-card-d'].forEach((id) => {
            const card = document.getElementById(id);
            if (card) card.classList.toggle('is-danger', isDanger);
        });

        const flwTxt = String(this.getAliveFlowerCount());
        ['hud-flowers', 'hud-flowers-d'].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.textContent = flwTxt;
        });
    }

    getAliveSheepCount() {
        return this.sheepList.filter((s) => s.isAlive).length;
    }

    getAliveFlowerCount() {
        return this.flowerList.filter((f) => f.isAlive).length;
    }

    spawnFlowers(count) {
        const pool = ['tulip', 'spicy', 'tulip', 'lavender', 'tulip', 'spicy', 'lavender'];
        const placed = [];
        for (let i = 0; i < count; i++) {
            let pt = getRandomSafePoint(this.shapeId, 34, this.terrain);
            for (let attempt = 0; attempt < 25; attempt++) {
                const candidate = getRandomSafePoint(this.shapeId, 34, this.terrain);
                if (!placed.some((p) => Math.hypot(p.x - candidate.x, p.y - candidate.y) < 58)) {
                    pt = candidate;
                    break;
                }
            }
            placed.push(pt);
            this.flowerList.push(new Flower(this, pt.x, pt.y, pool[i % pool.length]));
        }
    }

    spawnFlockForStage() {
        const flockTypes = gameState.buildStageFlock(this.dayCfg.day);
        flockTypes.forEach((typeId) => {
            const pt = getRandomSafePoint(this.shapeId, 42, this.terrain);
            this.sheepList.push(new Sheep(this, pt.x, pt.y, typeId));
        });
    }

    spawnDogsFromCards() {
        const dogLvl = gameState.getCardLevel('guard_dog');
        if (dogLvl >= 1) {
            const speedMul = dogLvl >= 2 ? 1.15 : 1.0;
            const visionBonus = dogLvl >= 2 ? 25 : 0;
            this.dogList.push(new Dog(this, 0, this.shapeId, speedMul, visionBonus));
        }
        if (dogLvl >= 3) {
            this.dogList.push(new Dog(this, Math.PI, this.shapeId, 1.18, 25));
        }
    }

    pickWolfType() {
        const allowed = this.dayCfg.allowedWolves || ['normal'];
        const d = this.dayCfg.day;

        // معرفی گرگ سایه در مرحله ۶ و گرگ آلفا در مرحله ۹
        if (d === 6 && !this.signatureWolfSpawned && allowed.includes('swift')) {
            this.signatureWolfSpawned = true;
            return 'swift';
        }
        if (d === 9 && !this.signatureWolfSpawned && allowed.includes('alpha')) {
            this.signatureWolfSpawned = true;
            return 'alpha';
        }

        const r = rand();
        if (allowed.includes('alpha') && r < 0.34) {
            return 'alpha';
        }
        if (allowed.includes('swift') && r < 0.56) {
            return 'swift';
        }
        return 'normal';
    }

    spawnWolf(forcedType = null) {
        const angle = rand() * Math.PI * 2;
        const type = forcedType || this.pickWolfType();

        if (type === 'normal') this.triggerDiscovery('wolf_intro');
        else if (type === 'swift') this.triggerDiscovery('wolf_swift');
        else if (type === 'alpha') {
            this.showFloatingText(0, -95, 'گرگ آلفا وارد شد! به دریا پرتش کن', '#fbbf24');
            this.triggerDiscovery('wolf_alpha');
        }

        const finalSpeed =
            this.dayCfg.wolfSpeedScale *
            gameState.getWolfSpeedMultiplier() *
            (this.edgeMods.wolfSpeedMul || 1.0);
        this.wolfList.push(new Wolf(this, angle, this.shapeId, type, finalSpeed));
    }

    showFloatingText(x, y, message, color = '#fff3b0') {
        const txt = this.add
            .text(x, y - 14, message, {
                fontFamily: 'Vazirmatn, sans-serif',
                fontSize: '15px',
                fontStyle: 'bold',
                color,
                stroke: '#0b0e14',
                strokeThickness: 4.5,
                resolution: this.textResolution,
            })
            .setOrigin(0.5)
            .setDepth(42);

        txt.setScale(0.7);
        this.tweens.add({
            targets: txt,
            scale: 1.0,
            duration: 140,
            ease: 'Back.easeOut',
        });

        this.tweens.add({
            targets: txt,
            y: y - 52,
            alpha: 0,
            duration: 1080,
            ease: 'Cubic.easeOut',
            onComplete: () => txt.destroy(),
        });
    }

    drawCapsule(g, x1, y1, x2, y2, radius, color, alpha = 1) {
        g.fillStyle(color, alpha);
        g.fillCircle(x1, y1, radius);
        g.fillCircle(x2, y2, radius);
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const nx = -Math.sin(angle) * radius;
        const ny = Math.cos(angle) * radius;
        g.beginPath();
        g.moveTo(x1 + nx, y1 + ny);
        g.lineTo(x2 + nx, y2 + ny);
        g.lineTo(x2 - nx, y2 - ny);
        g.lineTo(x1 - nx, y1 - ny);
        g.closePath();
        g.fillPath();
    }

    drawPolarLayer(g, shapeId, baseRadius, color, alpha = 1) {
        const segments = 96;
        g.fillStyle(color, alpha);
        g.beginPath();
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const r = getPolarRadius(shapeId, angle, baseRadius);
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            if (i === 0) g.moveTo(x, y);
            else g.lineTo(x, y);
        }
        g.closePath();
        g.fillPath();
    }

    drawIslandLayer(g, layerType, tideOffset, color, alpha = 1, extra = 0) {
        const safeShrink = tideOffset * 0.42;
        const beachShrink = tideOffset;
        const isSafe = layerType === 'safe' || layerType === 'light' || layerType === 'inner';
        const offset = layerType === 'light' ? -36 : layerType === 'inner' ? 8 : extra;

        if (this.shapeId === 'classic' || this.shapeId === 'star') {
            const base =
                this.shapeId === 'star'
                    ? isSafe
                        ? 192 - safeShrink
                        : 240 - beachShrink
                    : isSafe
                        ? WORLD.SAFE_RADIUS - safeShrink
                        : WORLD.BEACH_RADIUS - beachShrink;
            this.drawPolarLayer(g, this.shapeId, Math.max(20, base + offset), color, alpha);
            return;
        }

        if (this.shapeId === 'twin') {
            const lobeR = (isSafe ? 110 - safeShrink * 0.7 : 144 - beachShrink * 0.75) + offset;
            const bridgeR = (isSafe ? 44 - safeShrink * 0.4 : 68 - beachShrink * 0.45) + offset * 0.55;
            g.fillStyle(color, alpha);
            g.fillCircle(-148, 0, Math.max(16, lobeR));
            g.fillCircle(148, 0, Math.max(16, lobeR));
            this.drawCapsule(g, -148, 0, 148, 0, Math.max(10, bridgeR), color, alpha);
            return;
        }

        if (this.shapeId === 'ridge') {
            const r = (isSafe ? 110 - safeShrink * 0.8 : 152 - beachShrink * 0.8) + offset;
            this.drawCapsule(g, -155, -45, 155, 45, Math.max(18, r), color, alpha);
            return;
        }

        if (this.shapeId === 'crescent') {
            const r = (isSafe ? 238 - safeShrink : 286 - beachShrink) + offset;
            g.fillStyle(color, alpha);
            g.fillCircle(0, 0, Math.max(20, r));
            return;
        }

        if (this.shapeId === 'ring') {
            const r = (isSafe ? 250 - safeShrink : 294 - beachShrink) + offset;
            g.fillStyle(color, alpha);
            g.fillCircle(0, 0, Math.max(20, r));
        }
    }

    redrawIsland(tideOffset) {
        const s = this.season;
        this.islandG.clear();
        this.drawIslandLayer(this.islandG, 'beach', tideOffset, s.oceanShallow, 0.72, 34);
        this.drawIslandLayer(this.islandG, 'beach', tideOffset, s.beachSand, 1, 0);
        this.drawIslandLayer(this.islandG, 'inner', tideOffset, s.beachInner, 0.85, 0);
        this.drawIslandLayer(this.islandG, 'safe', tideOffset, s.grassMain, 1, 0);
        this.drawIslandLayer(this.islandG, 'light', tideOffset, s.grassLight, 0.42, 0);

        const safeShrink = tideOffset * 0.42;
        const beachShrink = tideOffset;
        if (this.shapeId === 'crescent') {
            const bayWater = 96 + beachShrink * 0.55;
            const bayBeach = 128 + safeShrink * 0.5;
            this.islandG.fillStyle(s.beachSand, 1);
            this.islandG.fillCircle(148, 0, bayBeach);
            this.islandG.fillStyle(s.oceanShallow, 0.9);
            this.islandG.fillCircle(148, 0, bayWater + 12);
            this.islandG.fillStyle(s.oceanDeep, 1);
            this.islandG.fillCircle(148, 0, bayWater);
        } else if (this.shapeId === 'ring') {
            const craterWater = 68 + beachShrink * 0.5;
            const craterBeach = 100 + safeShrink * 0.5;
            this.islandG.fillStyle(s.beachSand, 1);
            this.islandG.fillCircle(0, 0, craterBeach);
            this.islandG.fillStyle(s.oceanShallow, 0.9);
            this.islandG.fillCircle(0, 0, craterWater + 12);
            this.islandG.fillStyle(s.oceanDeep, 1);
            this.islandG.fillCircle(0, 0, craterWater);
        }
    }

    createOceanWaves() {
        this.foamGraphics = this.add.graphics().setDepth(1);
        this.oceanRipples = [];
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = WORLD.SHALLOW_RADIUS + 30 + Math.random() * 255;
            const ripple = this.add.ellipse(
                Math.cos(angle) * dist,
                Math.sin(angle) * dist,
                38 + Math.random() * 28,
                8,
                this.season.oceanFoam,
                0.18
            );
            ripple.setDepth(0);
            this.oceanRipples.push({
                sprite: ripple,
                baseX: ripple.x,
                speed: 0.6 + Math.random() * 0.8,
                phase: Math.random() * Math.PI * 2,
            });
        }
    }

    decorateIsland() {
        const s = this.season;
        for (let i = 0; i < 20; i++) {
            const pt = getRandomSafePoint(this.shapeId, 24);
            const tuft = this.add
                .image(pt.x, pt.y, 'grass_tuft')
                .setScale(0.7 + rand() * 0.35)
                .setAlpha(s.id === 'winter' ? 0.52 : 0.74)
                .setDepth(3);
            if (s.tuftTint !== 0xffffff) tuft.setTint(s.tuftTint);
        }

        for (let i = 0; i < 4; i++) {
            const pt = getRandomSafePoint(this.shapeId, 38);
            const bush = this.add
                .image(pt.x, pt.y, 'bush_prop')
                .setScale(0.55 + rand() * 0.25)
                .setAlpha(0.88)
                .setDepth(3.5);
            if (s.bushTint !== 0xffffff) bush.setTint(s.bushTint);
            this.tweens.add({
                targets: bush,
                scaleX: bush.scaleX * 1.04,
                scaleY: bush.scaleY * 0.97,
                duration: 2100 + i * 320,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });
        }
    }

    triggerSwipe(x1, y1, x2, y2, dirX, dirY) {
        const now = this.time.now;
        if (now - this.lastSwipeSoundTime > 250) {
            sound.playSwipe();
            this.lastSwipeSoundTime = now;
        }

        const isFever = this.feverTimer > 0;
        const swipeRadius = gameState.getSwipeRadius(isFever);
        const frostLevel = gameState.getCardLevel('frost_swipe');
        const swipeForce = WHISTLE.SWIPE_FORCE * (1 + gameState.getCardLevel('whistle_power') * 0.14);

        this.swipeTrails.push({ x1, y1, x2, y2, life: 0.24, maxLife: 0.24, isFever, frostLevel });

        if (this.isDayActive) {
            this.tryCollectWoolAt(x2, y2, swipeRadius * 0.8);
            this.chaos.handlePlayerPulse(x2, y2, swipeRadius, (bx, by, val, msg) =>
                this.addComboAndBonus(bx, by, Math.max(2, Math.round(val * 0.6)), msg)
            );
            this.interactables?.handlePlayerPulse(
                x2,
                y2,
                swipeRadius,
                this.sheepList,
                this.wolfList,
                (ev) => this.handleWolfAction(ev),
                { x1, y1, x2, y2 }
            );
            this.bossManager?.handlePlayerSwipe(x1, y1, x2, y2, swipeRadius, isFever);
        }

        const sheepPool = this.inTutorial && this.tutSheep ? [this.tutSheep] : this.sheepList;
        let affected = 0;
        for (const sheep of sheepPool) {
            if (sheep.applySwipe(x1, y1, x2, y2, dirX, dirY, swipeRadius, swipeForce, frostLevel)) {
                affected++;
            }
        }

        if (this.isDayActive) {
            for (const wolf of this.wolfList) {
                wolf.applySwipe(
                    x1,
                    y1,
                    x2,
                    y2,
                    dirX,
                    dirY,
                    swipeRadius,
                    { frostLevel, isFever },
                    (ev) => this.handleWolfAction(ev)
                );
            }
        }
        if (affected > 0 && Math.random() < 0.28) sound.playBaa('happy');
    }

    triggerWhistle(x, y) {
        const now = this.time.now;
        const cooldownMs = gameState.getWhistleCooldownMs();
        if (now - this.lastWhistleTime < cooldownMs) return;

        const isFever = this.feverTimer > 0;
        const cost = gameState.getWhistleStaminaCost(isFever);
        if (!this.consumeStamina(cost, x, y)) return;
        this.lastWhistleTime = now;

        const radius = gameState.getWhistleRadius(isFever);
        const force = gameState.getWhistleForce(isFever);
        const shockLevel = gameState.getCardLevel('shock_whistle');
        const magnetLevel = gameState.getCardLevel('magnet_save');
        const hasArcticStorm = gameState.hasEvolution('arctic_storm');

        sound.playWhistle(isFever);

        if (this.isDayActive) {
            this.tryCollectWoolAt(x, y, radius * 0.65);
            this.chaos.handlePlayerPulse(x, y, radius, (bx, by, val, msg) =>
                this.addComboAndBonus(bx, by, Math.max(2, Math.round(val * 0.6)), msg)
            );
            this.interactables?.handlePlayerPulse(
                x,
                y,
                radius,
                this.sheepList,
                this.wolfList,
                (ev) => this.handleWolfAction(ev)
            );
            this.bossManager?.handlePlayerWhistle(x, y, radius, isFever);
        }

        const sheepPool = this.inTutorial && this.tutSheep ? [this.tutSheep] : this.sheepList;
        let affectedSheep = 0;
        for (const sheep of sheepPool) {
            if (sheep.applyWhistle(x, y, radius, force, this.shapeId, magnetLevel, this.terrain)) {
                affectedSheep++;
            }
        }

        if (this.isDayActive) {
            for (const wolf of this.wolfList) {
                wolf.applyWhistle(
                    x,
                    y,
                    radius,
                    { shockLevel, isFever, hasArcticStorm },
                    (ev) => this.handleWolfAction(ev)
                );
            }
        }

        if (affectedSheep > 0 && Math.random() < 0.65) {
            this.time.delayedCall(70, () => sound.playBaa('happy'));
        }

        const ringTint = isFever
            ? 0xfde047
            : hasArcticStorm
                ? 0x0ea5e9
                : shockLevel > 0
                    ? 0x38bdf8
                    : 0xffffff;

        const ring = this.add
            .image(x, y, 'whistle_ring')
            .setDepth(20)
            .setScale(0.12)
            .setAlpha(0.95)
            .setTint(ringTint);

        this.tweens.add({
            targets: ring,
            scale: (radius * 2) / 256,
            alpha: 0,
            duration: 330,
            ease: 'Cubic.easeOut',
            onComplete: () => ring.destroy(),
        });

        for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2 + Math.random() * 0.4;
            const dot = this.add
                .image(x, y, 'star_particle')
                .setDepth(21)
                .setScale(0.32)
                .setTint(ringTint);
            this.tweens.add({
                targets: dot,
                x: x + Math.cos(a) * (radius * 0.5),
                y: y + Math.sin(a) * (radius * 0.5),
                alpha: 0,
                scale: 0.08,
                rotation: 1.5,
                duration: 280,
                ease: 'Quad.easeOut',
                onComplete: () => dot.destroy(),
            });
        }
    }

    handleWaterBuoyCheck(sheep) {
        if (this.buoysLeft <= 0) return false;
        this.buoysLeft--;
        sound.playBuoyBounce();

        const penalty = Math.round(this.midDayBonusGold * 0.25);
        if (penalty > 0) {
            this.midDayBonusGold = Math.max(0, this.midDayBonusGold - penalty);
            this.syncGoldHud();
        }
        this.stamina = Math.max(5, this.stamina - 25);
        this.updateStaminaBar();

        const costTxt = penalty > 0 ? ` (-${penalty} سکه)` : ' (-۲۵ نفس)';
        this.showFloatingText(sheep.x, sheep.y, `نجات با حلقه!${costTxt}`, '#38bdf8');
        ['hud-buoy', 'hud-buoy-d'].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.textContent = String(this.buoysLeft);
        });
        return true;
    }

    handleSheepLost() {
        this.combo = 0;
        this.updateFeverBar();
        this.cameras.main.shake(150, 0.0045);
        this.updateHud();

        if (this.isDayActive && this.getAliveSheepCount() < this.quota) {
            this.endDay(false, 'quota');
        }
    }

    handleFlowerEaten(flower) {
        this.updateHud();
        this.flowerEatenThisStage = true;
        if (this.mission?.id === 'no_flower_eaten') {
            this.missionFailed = true;
            this.updateMissionPill();
        }

        const thornLvl = gameState.getCardLevel('thorny_bloom');
        if (thornLvl > 0) {
            const r = 160 + thornLvl * 40;
            const ring = this.add
                .image(flower.x, flower.y, 'whistle_ring')
                .setDepth(22)
                .setScale(0.1)
                .setTint(0xf43f5e);
            this.tweens.add({
                targets: ring,
                scale: (r * 2) / 256,
                alpha: 0,
                duration: 320,
                onComplete: () => ring.destroy(),
            });
            for (const w of this.wolfList) {
                if (!w.isDone && w.state !== 'warning' && w.state !== 'flee') {
                    if (Math.hypot(w.x - flower.x, w.y - flower.y) <= r) {
                        w.fryByHazard(flower.x, flower.y, 'thorn', (ev) => this.handleWolfAction(ev));
                    }
                }
            }
        }

        const label =
            flower.config.effect === 'zoomies'
                ? 'تند و تیز شد!'
                : flower.config.effect === 'sleep'
                    ? 'به خواب رفت!'
                    : 'گل خورده شد!';
        this.showFloatingText(flower.x, flower.y, label, '#ffadad');
    }

    endDay(isVictory, failReason = 'quota') {
        if (!this.isDayActive && !this.bossManager?.isDefeated) return;
        this.isDayActive = false;
        this.setPausedState(false);
        this.isPointerDown = false;
        this.isSwiping = false;
        this.removeNewsBanner();
        this.removeTutorialBanner();
        this.removeCountdownOverlay();
        removePauseModal();
        removeDiscoveryModal();
        document.getElementById('boss-hud')?.remove();
        const fb = document.getElementById('frenzy-border');
        if (fb) fb.style.boxShadow = 'inset 0 0 42px rgba(239, 68, 68, 0)';

        sound.setMusicMode('menu');
        const completedDay = this.dayCfg.day;
        const isCampaignVictory = isVictory && completedDay >= MAX_CAMPAIGN_DAY;

        this.showFloatingText(
            0,
            -35,
            isCampaignVictory ? 'پیروزی نهایی! فتح جزیره' : isVictory ? 'پایان مرحله! پیروزی' : 'پایان مرحله!',
            isVictory ? '#4ade80' : '#fca5a5'
        );

        if (isVictory) {
            sound.playVictory();
            const survivingSheep = this.sheepList.filter((s) => s.isAlive);
            const sheepGold = Math.round(
                survivingSheep.reduce((sum, s) => sum + (SHEEP_TYPES[s.type]?.baseIncome ?? 4), 0) *
                gameState.getGoldMultiplier()
            );

            const flowerPenalty = gameState.getFlowerValuePenalty();
            const aliveFlowers = this.flowerList.filter((f) => f.isAlive);
            const flowerGold = Math.round(
                aliveFlowers.reduce((sum, f) => sum + Math.max(1, f.config.value - flowerPenalty), 0) *
                (this.edgeMods.flowerValueMul || 1.0)
            );

            const missionSuccess = this.isMissionSucceededAtEnd();
            const missionGold = missionSuccess ? this.mission.rewardGold : 0;
            const bonusGold = this.midDayBonusGold;
            const bossGold = this.bossBountyEarned;
            const dogUpkeep = gameState.getDogUpkeepCost();

            const grossGold = sheepGold + flowerGold + bonusGold + missionGold + bossGold;
            const netGold = Math.max(0, grossGold - dogUpkeep);

            const stats = {
                aliveSheep: survivingSheep.length,
                sheepGold,
                aliveFlowerCount: aliveFlowers.length,
                flowerGold,
                bonusGold,
                missionGold,
                missionTitle: missionSuccess ? this.mission.title : null,
                missionFreeReroll: missionSuccess ? this.mission.freeReroll : 0,
                bossGold,
                dogUpkeep,
                totalGold: netGold,
                edgeDecreeTitle: this.activeDecree?.title || null,
            };

            const endUnlocks = gameState.completeDay(
                survivingSheep.length,
                netGold,
                stats,
                missionSuccess ? this.mission : null
            );
            for (const c of endUnlocks) {
                if (!this.newlyUnlockedClasses.some((x) => x.id === c.id)) {
                    this.newlyUnlockedClasses.push(c);
                }
            }

            this.time.delayedCall(520, () => {
                showEndOfDayModal({
                    isVictory: true,
                    isCampaignVictory,
                    completedDay,
                    quota: this.quota,
                    stats,
                    bossMilestone: this.bossMilestone,
                    newlyUnlockedClasses: this.newlyUnlockedClasses,
                    onNextDay: () => this.scene.restart(),
                    onRetryDay: () => {
                        gameState.retryCurrentDay();
                        this.scene.restart();
                    },
                    onRestartGame: () => {
                        gameState.reset();
                        this.scene.restart();
                    },
                    onReturnToMenu: () => {
                        this.registry.set('gameStarted', false);
                        this.scene.restart();
                    },
                });
            });
        } else {
            this.time.delayedCall(480, () => {
                showEndOfDayModal({
                    isVictory: false,
                    isCampaignVictory: false,
                    completedDay,
                    quota: this.quota,
                    stats: null,
                    failReason,
                    bossMilestone: null,
                    newlyUnlockedClasses: this.newlyUnlockedClasses,
                    onNextDay: () => this.scene.restart(),
                    onRetryDay: () => {
                        gameState.retryCurrentDay();
                        this.scene.restart();
                    },
                    onRestartGame: () => {
                        gameState.reset();
                        this.scene.restart();
                    },
                    onReturnToMenu: () => {
                        this.registry.set('gameStarted', false);
                        this.scene.restart();
                    },
                });
            });
        }
    }

    updateWindVisuals(dt, hasActiveWind) {
        this.windGfx.clear();
        if (!hasActiveWind || !this.isDayActive) return;

        this.windTimer -= dt;
        if (this.windTimer <= 0) {
            this.windAngle += (rand() - 0.5) * 1.5;
            this.windTimer = 6.5 + rand() * 3.5;
            this.showFloatingText(0, -85, 'جهت باد عوض شد!', '#99f6e4');
        }

        if (Math.random() < dt * 7) {
            this.windStreaks.push({
                x: (Math.random() - 0.5) * 560,
                y: (Math.random() - 0.5) * 560,
                life: 0.7,
                maxLife: 0.7,
            });
        }

        const dx = Math.cos(this.windAngle);
        const dy = Math.sin(this.windAngle);
        for (const s of this.windStreaks) {
            s.life -= dt;
            s.x += dx * 250 * dt;
            s.y += dy * 250 * dt;
            if (s.life <= 0) continue;
            const alpha = Math.sin((s.life / s.maxLife) * Math.PI) * 0.42;
            this.windGfx.lineStyle(2.5, 0xffffff, alpha);
            this.windGfx.lineBetween(s.x, s.y, s.x - dx * 38, s.y - dy * 38);
        }
        this.windStreaks = this.windStreaks.filter((s) => s.life > 0);
    }

    updateSwipeTrails(dt) {
        this.swipeGfx.clear();
        for (const seg of this.swipeTrails) {
            seg.life -= dt;
            if (seg.life <= 0) continue;
            const ratio = seg.life / seg.maxLife;
            const outerColor = seg.isFever ? 0xfde047 : seg.frostLevel > 0 ? 0x38bdf8 : 0xffffff;
            this.swipeGfx.lineStyle(16 * ratio, outerColor, 0.52 * ratio);
            this.swipeGfx.beginPath();
            this.swipeGfx.moveTo(seg.x1, seg.y1);
            this.swipeGfx.lineTo(seg.x2, seg.y2);
            this.swipeGfx.strokePath();

            this.swipeGfx.lineStyle(6 * ratio, 0xfff3b0, 0.85 * ratio);
            this.swipeGfx.beginPath();
            this.swipeGfx.moveTo(seg.x1, seg.y1);
            this.swipeGfx.lineTo(seg.x2, seg.y2);
            this.swipeGfx.strokePath();
        }
        this.swipeTrails = this.swipeTrails.filter((s) => s.life > 0);
    }

    update(time, delta) {
        if (this.isPaused || this.isDiscoveryOpen) return;

        const dt = Math.min(delta, 50) / 1000;

        const pulse = Math.sin(time * 0.0025) * 6;
        this.foamGraphics.clear();
        this.drawIslandLayer(this.foamGraphics, 'beach', this.tideOffset, this.season.oceanFoam, 0.55, 10 + pulse);

        for (const r of this.oceanRipples) {
            r.sprite.x = r.baseX + Math.sin(time * 0.001 * r.speed + r.phase) * 14;
            r.sprite.alpha = 0.1 + (Math.sin(time * 0.002 * r.speed + r.phase) + 1) * 0.06;
        }

        this.terrain?.update(time);
        this.updateSeasonalAmbient(dt, time);
        this.updateSwipeTrails(dt);

        if (this.inTutorial && this.tutSheep) {
            this.tutSheep.update(dt, {
                shapeId: this.shapeId,
                terrain: null,
                allSheep: [this.tutSheep],
                flowers: [],
                wolves: [],
                activeHay: null,
                tideOffset: 0,
                windVec: null,
                flowerRepellent: false,
                isTutorial: true,
            });
            if (Math.hypot(this.tutSheep.x, this.tutSheep.y) < 120) {
                this.completeTutorial();
            }
            return;
        }

        if (!this.isDayActive) return;

        this.ambientBaaTimer -= dt;
        if (this.ambientBaaTimer <= 0) {
            this.ambientBaaTimer = 5.5 + Math.random() * 5.0;
            if (this.getAliveSheepCount() > 0) {
                sound.playBaa('calm');
            }
        }

        if (this.dayCfg.hasBeehives && this.beehiveHintTimer > 0 && !gameState.hasDiscovered('beehive_intro')) {
            this.beehiveHintTimer -= dt;
            if (this.beehiveHintTimer <= 0) {
                this.triggerDiscovery('beehive_intro');
            }
        }

        if (this.exhaustTimer > 0) {
            this.exhaustTimer = Math.max(0, this.exhaustTimer - dt);
            if (this.exhaustTimer === 0) this.stamina = 55;
            this.updateStaminaBar();
        } else if (this.isPointerDown) {
            this.pointerHoldTime += dt;
            const drain = STAMINA.HOLD_DRAIN_PER_SEC * (this.feverTimer > 0 ? 0.5 : 1);
            this.stamina = Math.max(0, this.stamina - drain * dt);

            if (this.stamina <= 0) {
                this.triggerExhaustion(this.lastDragPos.x, this.lastDragPos.y);
            } else if (this.pointerHoldTime >= gameState.getMaxHoldSec()) {
                this.isPointerDown = false;
                this.isSwiping = false;
                this.pointerHoldTime = 0;
                this.showFloatingText(this.lastDragPos.x, this.lastDragPos.y, 'دستت را بردار!', '#fde047');
            }
            this.updateStaminaBar();
        } else if (this.stamina < STAMINA.MAX) {
            const regen = gameState.getStaminaRegen() * (this.edgeMods.staminaRegenMul || 1.0);
            this.stamina = Math.min(STAMINA.MAX, this.stamina + regen * dt);
            this.updateStaminaBar();
        }

        if (this.feverTimer > 0) {
            this.feverTimer = Math.max(0, this.feverTimer - dt);
            this.updateFeverBar();
        }
        if (this.combo > 0) {
            this.comboTimer -= dt;
            if (this.comboTimer <= 0) {
                this.combo = 0;
                this.updateFeverBar();
            }
        }

        this.timeLeft -= dt;
        const ceilSec = Math.max(0, Math.ceil(this.timeLeft));
        if (ceilSec <= 5 && ceilSec >= 1 && ceilSec !== this.lastTickSec) {
            this.lastTickSec = ceilSec;
            sound.playCountdownTick(ceilSec);
            if (ceilSec <= 3) {
                this.showCenterCountdown(ceilSec);
            }
        }

        this.updateHud();
        if (this.timeLeft <= 0) {
            if (this.bossManager && !this.bossManager.isDefeated) {
                this.endDay(false, 'boss_timeout');
            } else {
                this.endDay(true);
            }
            return;
        }

        const isFrenzy = this.dayCfg.day >= 3 && !this.dayCfg.bossType && this.timeLeft <= 10;
        if (isFrenzy) {
            if (!this.frenzyAnnounced) {
                this.frenzyAnnounced = true;
                sound.playAlarm();
                sound.setMusicMode('intense');
                this.cameras.main.shake(170, 0.004);
                this.showFloatingText(0, -105, '۱۰ ثانیه پایانی! دوام بیاور', '#f87171');
            }
            const fb = document.getElementById('frenzy-border');
            if (fb) {
                const glow = 0.22 + (Math.sin(time * 0.012) + 1) * 0.2;
                fb.style.boxShadow = `inset 0 0 42px rgba(239, 68, 68, ${glow})`;
            }
        }

        if (this.dayCfg.maxTide > 0 && this.timeLeft <= 16) {
            if (!this.highTideAnnounced) {
                this.highTideAnnounced = true;
                this.showFloatingText(0, -85, 'جزر و مد! آب بالا می‌آید', '#7dd3fc');
            }
            const progress = Math.min(1, (16 - this.timeLeft) / 14);
            this.tideOffset = progress * this.dayCfg.maxTide;
            this.redrawIsland(this.tideOffset);
        }

        if (this.bossManager) {
            this.bossManager.update(dt, time, this.sheepList, this.flowerList, this.tideOffset);
        }

        if (this.dayCfg.hasChaos) {
            this.chaosTimer -= dt * (isFrenzy ? 1.2 : 1);
            if (this.chaosTimer <= 0) {
                this.chaos.triggerRandomEvent(
                    this.dayCfg.day,
                    this.shapeId,
                    this.sheepList,
                    this.dayCfg.allowedChaos,
                    this.dayCfg.signatureChaos,
                    this.activeHay
                );
                if (this.dayCfg.doubleChaosChance > 0 && rand() < this.dayCfg.doubleChaosChance) {
                    this.time.delayedCall(1850, () => {
                        if (this.isDayActive && !this.isPaused && !this.isDiscoveryOpen) {
                            this.chaos.triggerRandomEvent(
                                this.dayCfg.day,
                                this.shapeId,
                                this.sheepList,
                                this.dayCfg.allowedChaos,
                                null,
                                this.activeHay
                            );
                        }
                    });
                }
                this.chaosTimer = this.dayCfg.chaosInterval;
            }
        }
        this.chaos.update(
            dt,
            time,
            this.sheepList,
            this.wolfList,
            this.flowerList,
            () => this.handleSheepLost(),
            (ev) => this.handleWolfAction(ev),
            this.activeHay
        );

        this.interactables?.update(
            dt,
            time,
            this.tideOffset,
            this.sheepList,
            gameState.getGoldMultiplier(),
            (gx, gy, amt) => {
                const balancedAmt = Math.max(
                    1,
                    Math.round(amt * 0.6 * (this.edgeMods.goldZoneMul || 1.0))
                );
                this.midDayBonusGold += balancedAmt;
                this.syncGoldHud();
                this.addFever(5);
                this.advanceMission('golden_zone_10', balancedAmt);
                this.showFloatingText(gx, gy - 12, `+${balancedAmt} سکه`, '#fde047');
            }
        );

        for (let i = this.woolDrops.length - 1; i >= 0; i--) {
            const w = this.woolDrops[i];
            w.life -= dt;
            w.sprite.y = w.y + Math.sin(time * 0.006 + w.phase) * 4;
            if (w.life < 2) w.sprite.alpha = Math.max(0.2, Math.abs(Math.sin(time * 0.02)));
            if (w.life <= 0) {
                w.sprite.destroy();
                this.woolDrops.splice(i, 1);
            }
        }

        const totalWindForce =
            (this.dayCfg.hasWind ? this.dayCfg.windStrength || 32 : 0) +
            (this.edgeMods.windBonus || 0);
        const hasActiveWind = totalWindForce > 0;
        this.updateWindVisuals(dt, hasActiveWind);
        const windVec = hasActiveWind
            ? { x: Math.cos(this.windAngle) * totalWindForce, y: Math.sin(this.windAngle) * totalWindForce }
            : null;

        if (this.activeHay) {
            this.activeHay.update(dt);
            if (!this.activeHay.isAlive) {
                this.activeHay = null;
                this.updateHayButton();
            }
        }

        this.wolfSpawnTimer -= dt * (isFrenzy ? 1.35 : 1);
        if (this.wolfSpawnTimer <= 0) {
            this.spawnWolf();
            if (rand() < this.dayCfg.packChance) {
                this.time.delayedCall(850, () => {
                    if (this.isDayActive) this.spawnWolf();
                });
                if (this.dayCfg.triplePackChance > 0 && rand() < this.dayCfg.triplePackChance) {
                    this.time.delayedCall(1700, () => {
                        if (this.isDayActive) this.spawnWolf();
                    });
                }
            }
            this.wolfSpawnTimer = this.dayCfg.wolfInterval;
        }

        for (const f of this.flowerList) f.update(dt);
        for (const d of this.dogList) {
            d.update(
                dt,
                this.sheepList,
                this.wolfList,
                this.tideOffset,
                (ev) => {
                    if (ev?.type === 'scared' || ev?.type === 'hit') {
                        this.advanceMission('dog_guard', 1);
                    }
                    this.handleWolfAction(ev);
                },
                this.terrain
            );
        }

        const calmFactor = Math.max(0.35, 1 - gameState.getCardLevel('calm_aura') * 0.3);
        const fleeSpeedMul = gameState.getSheepFleeSpeedMul();
        const flowerEatSpeedMul = gameState.getFlowerEatSpeedMul();
        const isFever = this.feverTimer > 0;
        const hasFireRam = gameState.hasEvolution('fire_ram');
        const hasFlowerMine = gameState.hasEvolution('flower_mine');

        const sheepCtx = {
            shapeId: this.shapeId,
            terrain: this.terrain,
            allSheep: this.sheepList,
            flowers: this.flowerList,
            wolves: this.wolfList,
            activeHay: this.activeHay,
            tideOffset: this.tideOffset,
            windVec,
            flowerRepellent: gameState.data.flowerRepellent,
            calmFactor,
            fleeSpeedMul,
            flowerEatSpeedMul,
            goldMul: gameState.getGoldMultiplier(),
            isFever,
            hasFireRam,
            onWaterCheck: (s) => this.handleWaterBuoyCheck(s),
            onLost: () => this.handleSheepLost(),
            onFlowerEaten: (flower) => this.handleFlowerEaten(flower),
            onWoolDrop: (wx, wy, val) => this.spawnWoolDrop(wx, wy, val),
            onWolfAction: (ev) => {
                if (ev?.type === 'hit' && (ev?.message?.includes('قوچ') || ev?.message?.includes('شاخ'))) {
                    this.advanceMission('ram_slam', 1);
                }
                this.handleWolfAction(ev);
            },
        };

        for (const s of this.sheepList) s.update(dt, sheepCtx);

        const wolfCtx = {
            tideOffset: this.tideOffset,
            terrain: this.terrain,
            flowers: this.flowerList,
            hasFlowerMine,
            onSheepStolen: () => this.handleSheepLost(),
            onWolfAction: (ev) => {
                if (ev?.message?.includes('زنبور')) {
                    this.advanceMission('beehive_sting', 1);
                }
                this.handleWolfAction(ev);
            },
        };
        for (const w of this.wolfList) w.update(dt, this.sheepList, wolfCtx);

        this.sheepList = this.sheepList.filter((s) => s.container !== null);
        this.flowerList = this.flowerList.filter((f) => f.container !== null);
        this.wolfList = this.wolfList.filter((w) => !w.isDone);
    }
}