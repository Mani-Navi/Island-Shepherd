import {
    CARDS,
    CARD_BASE_PRICES,
    EVOLUTIONS,
    HAY_CONFIG,
    REPELLENT_CONFIG,
    REROLL_BASE_PRICE,
    SHEPHERD_CLASSES,
    STAMINA,
    WHISTLE,
    getDayConfig,
    getTodayDateKey,
    rand,
    setRngSeed,
} from '../config/gameData.js';
import { sound } from '../utils/SoundGen.js';

const SAVE_KEY = 'island_shepherd_save_v4';
const DAILY_SAVE_PREFIX = 'island_shepherd_daily_save_v4_';
const META_KEY = 'island_shepherd_meta_v4';
const NICK_KEY = 'island_shepherd_nick_v1';

function createDefaultMeta() {
    return {
        selectedClass: 'classic',
        maxDayReached: 1,
        totalWolvesScared: 0,
        totalWaterKOs: 0,
        totalBossesDefeated: 0,
        dailyBest: {},
        discovered: [],
        welcomeSeen: false,
        tutorialDone: false,
        sfxMuted: false,
        musicMuted: false,
    };
}

class GameStateManager {
    constructor() {
        this.mode = 'normal'; // 'normal' | 'daily'
        this.dailyDateKey = getTodayDateKey();
        this.nickname = this.loadNickname();
        this.meta = this.loadMeta();
        this.daySnapshot = null;
        this.lastMissionId = null;

        sound.setSfxMuted(this.meta.sfxMuted);
        sound.setMusicMuted(this.meta.musicMuted);

        this.data = this.loadNormalSave() || this.createFreshRun();
    }

    loadNickname() {
        try {
            return localStorage.getItem(NICK_KEY) || '';
        } catch {
            return '';
        }
    }

    setNickname(name) {
        this.nickname = String(name || '').trim().slice(0, 18);
        try {
            localStorage.setItem(NICK_KEY, this.nickname);
        } catch {
            // ignore
        }
    }

    loadMeta() {
        try {
            const raw = localStorage.getItem(META_KEY);
            if (!raw) return createDefaultMeta();
            const parsed = JSON.parse(raw);
            return {
                ...createDefaultMeta(),
                ...parsed,
                dailyBest: parsed.dailyBest || {},
                discovered: Array.isArray(parsed.discovered) ? parsed.discovered : [],
            };
        } catch {
            return createDefaultMeta();
        }
    }

    saveMeta() {
        try {
            localStorage.setItem(META_KEY, JSON.stringify(this.meta));
        } catch {
            // ignore
        }
    }

    loadNormalSave() {
        try {
            const raw = localStorage.getItem(SAVE_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed.day !== 'number') return null;
            return {
                runToken: null,
                edgeSigned: false,
                runWolvesDefeated: 0,
                runBossesDefeated: 0,
                ...parsed,
            };
        } catch {
            return null;
        }
    }

    loadDailySave(dateKey) {
        try {
            const raw = localStorage.getItem(DAILY_SAVE_PREFIX + dateKey);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed.day !== 'number') return null;
            return parsed;
        } catch {
            return null;
        }
    }

    saveCurrentProgress() {
        try {
            if (this.mode === 'daily') {
                localStorage.setItem(DAILY_SAVE_PREFIX + this.dailyDateKey, JSON.stringify(this.data));
            } else {
                localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
            }
        } catch {
            // ignore
        }
    }

    clearNormalSave() {
        try {
            localStorage.removeItem(SAVE_KEY);
        } catch {
            // ignore
        }
    }

    clearDailySave(dateKey) {
        try {
            localStorage.removeItem(DAILY_SAVE_PREFIX + dateKey);
        } catch {
            // ignore
        }
    }

    hasSavedProgress() {
        if (this.mode === 'daily') {
            const saved = this.loadDailySave(this.dailyDateKey);
            return Boolean(saved && saved.day > 1);
        }
        const saved = this.loadNormalSave();
        return Boolean(saved && saved.day > 1);
    }

    createFreshRun() {
        const cls = this.getClassConfig();
        const cards = {};
        if (cls.startDogLevel > 0) {
            cards.guard_dog = cls.startDogLevel;
        }

        return {
            day: 1,
            gold: 0,
            totalScore: 0,
            hayCount: 1,
            flowerRepellent: false,
            freeRerolls: 0,
            cards,
            classId: cls.id,
            runToken: null,
            edgeSigned: false,
            runWolvesDefeated: 0,
            runBossesDefeated: 0,
            runLog: {
                startedAt: Date.now(),
                days: [],
            },
        };
    }

    setRunToken(token, startedAt = null) {
        if (!token) return;
        this.data.runToken = token;
        this.data.edgeSigned = true;
        if (
            Number.isFinite(startedAt) &&
            this.data.runLog &&
            Array.isArray(this.data.runLog.days) &&
            this.data.runLog.days.length === 0
        ) {
            this.data.runLog.startedAt = startedAt;
        }
        this.saveCurrentProgress();
    }

    getClassConfig(classId = null) {
        const id = classId || this.meta.selectedClass || 'classic';
        return SHEPHERD_CLASSES[id] || SHEPHERD_CLASSES.classic;
    }

    isClassUnlocked(classId) {
        if (classId === 'classic') return true;
        if (classId === 'storm') return this.meta.maxDayReached >= 4;
        if (classId === 'houndmaster') return this.meta.totalWolvesScared >= 25;
        if (classId === 'gambler') {
            return this.meta.totalWaterKOs >= 5 || this.meta.maxDayReached >= 6;
        }
        return false;
    }

    getClassUnlockProgress(classId) {
        if (classId === 'storm') return `مرحله ${Math.min(4, this.meta.maxDayReached)}/4`;
        if (classId === 'houndmaster') return `دفع گرگ ${Math.min(25, this.meta.totalWolvesScared)}/25`;
        if (classId === 'gambler') return `ناک‌اوت آبی ${Math.min(5, this.meta.totalWaterKOs)}/5`;
        return 'آزاد';
    }

    selectClass(classId) {
        if (!this.isClassUnlocked(classId)) return false;
        this.meta.selectedClass = classId;
        this.saveMeta();
        return true;
    }

    checkNewClassUnlocks(beforeUnlocked) {
        const newly = [];
        for (const cls of Object.values(SHEPHERD_CLASSES)) {
            if (!beforeUnlocked.has(cls.id) && this.isClassUnlocked(cls.id)) {
                newly.push(cls);
            }
        }
        return newly;
    }

    getUnlockedClassSet() {
        const set = new Set();
        for (const id of Object.keys(SHEPHERD_CLASSES)) {
            if (this.isClassUnlocked(id)) set.add(id);
        }
        return set;
    }

    toggleSfx() {
        this.meta.sfxMuted = !this.meta.sfxMuted;
        sound.setSfxMuted(this.meta.sfxMuted);
        this.saveMeta();
        return !this.meta.sfxMuted;
    }

    toggleMusic() {
        this.meta.musicMuted = !this.meta.musicMuted;
        sound.setMusicMuted(this.meta.musicMuted);
        this.saveMeta();
        return !this.meta.musicMuted;
    }

    hasDiscovered(guideId) {
        return this.meta.discovered.includes(guideId);
    }

    markDiscovered(guideId) {
        if (!this.meta.discovered.includes(guideId)) {
            this.meta.discovered.push(guideId);
            this.saveMeta();
        }
    }

    markWelcomeSeen() {
        this.meta.welcomeSeen = true;
        this.saveMeta();
    }

    markTutorialDone() {
        this.meta.tutorialDone = true;
        this.saveMeta();
    }

    continueNormalGame() {
        this.mode = 'normal';
        this.daySnapshot = null;
        this.data = this.loadNormalSave() || this.createFreshRun();
        this.saveCurrentProgress();
    }

    startNormalNewGame() {
        this.mode = 'normal';
        this.daySnapshot = null;
        this.clearNormalSave();
        this.data = this.createFreshRun();
        this.saveCurrentProgress();
    }

    startDailyChallenge() {
        this.mode = 'daily';
        this.dailyDateKey = getTodayDateKey();
        this.daySnapshot = null;
        const saved = this.loadDailySave(this.dailyDateKey);
        if (saved && saved.day > 1) {
            this.data = saved;
        } else {
            this.data = this.createFreshRun();
        }
    }

    restartDailyFresh() {
        this.mode = 'daily';
        this.dailyDateKey = getTodayDateKey();
        this.daySnapshot = null;
        this.clearDailySave(this.dailyDateKey);
        this.data = this.createFreshRun();
    }

    reset() {
        if (this.mode === 'daily') {
            this.restartDailyFresh();
        } else {
            this.startNormalNewGame();
        }
    }

    syncRngForStage(day) {
        if (this.mode === 'daily') {
            setRngSeed(`daily_${this.dailyDateKey}_stage_${day}`);
        } else {
            setRngSeed(null);
        }
    }

    saveDaySnapshot() {
        // فعال‌سازی اسنپ‌شات برای هر دو حالت چالش روزانه و عادی تا امکان تلاش دوباره مرحله وجود داشته باشد
        this.daySnapshot = JSON.parse(JSON.stringify(this.data));
    }

    hasDaySnapshot() {
        return Boolean(this.daySnapshot);
    }

    retryCurrentDay() {
        if (!this.hasDaySnapshot()) return;
        this.data = JSON.parse(JSON.stringify(this.daySnapshot));
        this.saveCurrentProgress();
    }

    getCardLevel(cardId) {
        return this.data.cards?.[cardId] || 0;
    }

    getTotalOwnedCardLevels() {
        return Object.values(this.data.cards || {}).reduce((sum, v) => sum + (v || 0), 0);
    }

    getCardPrice(card) {
        const base = CARD_BASE_PRICES[card.rarity] || 110;
        const lvl = this.getCardLevel(card.id);
        const totalOwned = this.getTotalOwnedCardLevels();
        const raw = base * (1 + lvl * 0.65) + totalOwned * 12;
        return Math.round(raw / 5) * 5;
    }

    getActiveEvolutions() {
        return EVOLUTIONS.filter((evo) =>
            evo.requires.every((reqId) => this.getCardLevel(reqId) >= 1)
        );
    }

    hasEvolution(evoId) {
        const evo = EVOLUTIONS.find((e) => e.id === evoId);
        if (!evo) return false;
        return evo.requires.every((reqId) => this.getCardLevel(reqId) >= 1);
    }

    rollDraftCards(count = 3) {
        const available = CARDS.filter((c) => this.getCardLevel(c.id) < c.maxLevel);
        const pool = available.length >= count ? [...available] : [...CARDS];

        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(rand() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        return pool.slice(0, count);
    }

    buyDraftCard(cardId) {
        const card = CARDS.find((c) => c.id === cardId);
        if (!card) return { ok: false, newEvolutions: [] };

        const currLvl = this.getCardLevel(cardId);
        if (currLvl >= card.maxLevel) return { ok: false, newEvolutions: [] };

        const price = this.getCardPrice(card);
        if (this.data.gold < price) return { ok: false, newEvolutions: [] };

        const prevEvos = new Set(this.getActiveEvolutions().map((e) => e.id));
        this.data.gold -= price;
        this.data.cards[cardId] = currLvl + 1;

        const newEvolutions = this.getActiveEvolutions().filter((e) => !prevEvos.has(e.id));
        this.saveCurrentProgress();
        return { ok: true, pricePaid: price, newEvolutions };
    }

    refundDraftCard(cardId, paidPrice) {
        const currLvl = this.getCardLevel(cardId);
        if (currLvl <= 0) return false;
        this.data.cards[cardId] = currLvl - 1;
        if (this.data.cards[cardId] === 0) delete this.data.cards[cardId];
        this.data.gold += paidPrice;
        this.saveCurrentProgress();
        return true;
    }

    getRerollPrice(rerollCount = 0) {
        if (this.data.freeRerolls > 0) return 0;
        return REROLL_BASE_PRICE + rerollCount * 20;
    }

    spendReroll(price) {
        if (price === 0 && this.data.freeRerolls > 0) {
            this.data.freeRerolls -= 1;
            this.saveCurrentProgress();
            return true;
        }
        if (this.data.gold < price) return false;
        this.data.gold -= price;
        this.saveCurrentProgress();
        return true;
    }

    buyHay() {
        if (this.data.hayCount >= HAY_CONFIG.MAX_STOCK) return false;
        if (this.data.gold < HAY_CONFIG.PRICE) return false;
        this.data.gold -= HAY_CONFIG.PRICE;
        this.data.hayCount += 1;
        this.saveCurrentProgress();
        return true;
    }

    refundHay() {
        if (this.data.hayCount <= 0) return false;
        this.data.hayCount -= 1;
        this.data.gold += HAY_CONFIG.PRICE;
        this.saveCurrentProgress();
        return true;
    }

    useHay() {
        if (this.data.hayCount <= 0) return false;
        this.data.hayCount -= 1;
        this.saveCurrentProgress();
        return true;
    }

    buyFlowerRepellent() {
        if (this.data.flowerRepellent) return false;
        if (this.data.gold < REPELLENT_CONFIG.PRICE) return false;
        this.data.gold -= REPELLENT_CONFIG.PRICE;
        this.data.flowerRepellent = true;
        this.saveCurrentProgress();
        return true;
    }

    refundFlowerRepellent() {
        if (!this.data.flowerRepellent) return false;
        this.data.flowerRepellent = false;
        this.data.gold += REPELLENT_CONFIG.PRICE;
        this.saveCurrentProgress();
        return true;
    }

    buildStageFlock(day) {
        const cfg = getDayConfig(day, this.mode === 'daily', this.dailyDateKey);
        const cls = this.getClassConfig(this.data.classId);
        const list = [];

        const ramCount = this.getCardLevel('battle_ram');
        const goldCount = this.getCardLevel('golden_touch') + (cls.extraGoldenSheep || 0);

        for (let i = 0; i < ramCount; i++) list.push('ram');
        for (let i = 0; i < goldCount; i++) list.push('golden');
        for (let i = 0; i < cfg.rebelCount; i++) list.push('rebel');
        for (let i = 0; i < cfg.gluttonCount; i++) list.push('glutton');

        const targetTotal = Math.min(18, cfg.baseFlockSize + ramCount + goldCount);
        while (list.length < targetTotal) {
            list.push('normal');
        }
        return list;
    }

    getSurvivalQuota(totalFlock, targetDay = null) {
        const d = targetDay ?? this.data.day;
        const cls = this.getClassConfig(this.data.classId);

        let allowedLosses = 2;
        if (d >= 7 || totalFlock >= 12) {
            allowedLosses = 0;
        } else if (d >= 3 || totalFlock >= 8) {
            allowedLosses = 1;
        }

        allowedLosses = Math.max(0, allowedLosses - (cls.quotaAdd || 0));
        const minFloor = Math.min(3, totalFlock);
        return Math.max(minFloor, Math.min(totalFlock, totalFlock - allowedLosses));
    }

    getGoldMultiplier() {
        const cls = this.getClassConfig(this.data.classId);
        return cls.goldMul * (1 + this.getCardLevel('golden_touch') * 0.15);
    }

    getWolfSpeedMultiplier() {
        const cls = this.getClassConfig(this.data.classId);
        return cls.wolfSpeedMul;
    }

    getWhistleRadius(isFever = false) {
        const cls = this.getClassConfig(this.data.classId);
        const cardMul = 1 + this.getCardLevel('whistle_power') * 0.12;
        return WHISTLE.BASE_RADIUS * cls.whistleRadiusMul * cardMul * (isFever ? 1.2 : 1.0);
    }

    getWhistleForce(isFever = false) {
        const cardMul = 1 + this.getCardLevel('whistle_power') * 0.12;
        return WHISTLE.BASE_FORCE * cardMul * (isFever ? 1.18 : 1.0);
    }

    getSwipeRadius(isFever = false) {
        const cls = this.getClassConfig(this.data.classId);
        const cardMul = 1 + this.getCardLevel('whistle_power') * 0.12;
        return WHISTLE.SWIPE_RADIUS * cls.swipeRadiusMul * cardMul * (isFever ? 1.18 : 1.0);
    }

    getStaminaRegen() {
        const cls = this.getClassConfig(this.data.classId);
        return STAMINA.REGEN_PER_SEC * cls.staminaRegenMul * (1 + this.getCardLevel('lung_capacity') * 0.28);
    }

    getMaxHoldSec() {
        return STAMINA.MAX_HOLD_SEC + this.getCardLevel('lung_capacity') * 0.22;
    }

    recordWolfDefeated(isWaterKO = false) {
        const before = this.getUnlockedClassSet();
        this.meta.totalWolvesScared += 1;
        this.data.runWolvesDefeated = (this.data.runWolvesDefeated || 0) + 1;
        if (isWaterKO) this.meta.totalWaterKOs += 1;
        this.saveMeta();
        return this.checkNewClassUnlocks(before);
    }

    recordBossDefeated() {
        this.meta.totalBossesDefeated += 1;
        this.data.runBossesDefeated = (this.data.runBossesDefeated || 0) + 1;
        this.saveMeta();
    }

    completeDay(aliveSheepCount, totalGold, stats, completedMission = null) {
        const before = this.getUnlockedClassSet();
        const completedDay = this.data.day;

        this.data.gold += totalGold;
        this.data.flowerRepellent = false;

        if (completedMission) {
            this.lastMissionId = completedMission.id;
            if (completedMission.freeReroll) {
                this.data.freeRerolls += completedMission.freeReroll;
            }
        }

        const stageScore = totalGold + completedDay * 75 + aliveSheepCount * 15;
        this.data.totalScore += stageScore;

        this.data.runLog.days.push({
            day: completedDay,
            sheepSurvived: aliveSheepCount,
            flowersSurvived: stats?.aliveFlowerCount ?? 0,
            goldEarned: totalGold,
            finishedAt: Date.now(),
        });

        this.data.day += 1;

        if (this.data.day > this.meta.maxDayReached) {
            this.meta.maxDayReached = this.data.day;
        }

        if (this.mode === 'daily') {
            const prevBest = this.meta.dailyBest[this.dailyDateKey] || 0;
            if (this.data.totalScore > prevBest) {
                this.meta.dailyBest[this.dailyDateKey] = this.data.totalScore;
            }
        }

        this.saveMeta();
        this.saveCurrentProgress();
        return this.checkNewClassUnlocks(before);
    }
}

export const gameState = new GameStateManager();