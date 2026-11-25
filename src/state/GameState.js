import {
    BOSS_REWARDS,
    CARDS,
    CARD_BASE_PRICES,
    DOG_CONFIG,
    EVOLUTIONS,
    HAY_CONFIG,
    REPELLENT_CONFIG,
    REROLL_BASE_PRICE,
    SHEPHERD_CLASSES,
    SLOT_CONFIG,
    STAMINA,
    WHISTLE,
    getDayConfig,
    getTodayDateKey,
    rand,
    setRngSeed,
} from '../config/gameData.js';
import { sound } from '../utils/SoundGen.js';

const SAVE_KEY = 'island_shepherd_save_v5';
const DAILY_SAVE_PREFIX = 'island_shepherd_daily_save_v5_';
const META_KEY = 'island_shepherd_meta_v5';
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
        this.mode = 'normal';
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
                bossesBeaten: [],
                bossPerks: [],
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
            return {
                bossesBeaten: [],
                bossPerks: [],
                ...parsed,
            };
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
            bossesBeaten: [],
            bossPerks: [],
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

    // =========================================================
    // سیستم باس، تشدید سختی (World Tier) و اسلات‌های کارت (۴ → ۵ → ۶)
    // =========================================================
    hasBeatenBoss(bossType) {
        return Array.isArray(this.data.bossesBeaten) && this.data.bossesBeaten.includes(bossType);
    }

    hasBossPerk(perkId) {
        return Array.isArray(this.data.bossPerks) && this.data.bossPerks.includes(perkId);
    }

    getWorldTier() {
        if (this.hasBeatenBoss('wolf_king')) return 3;
        if (this.hasBeatenBoss('kraken')) return 2;
        return 1;
    }

    getMaxCardSlots() {
        if (this.hasBeatenBoss('wolf_king')) return SLOT_CONFIG.AFTER_BOSS_2_SLOTS;
        if (this.hasBeatenBoss('kraken')) return SLOT_CONFIG.AFTER_BOSS_1_SLOTS;
        return SLOT_CONFIG.BASE_SLOTS;
    }

    isCardShopUnlocked(completedDay) {
        return completedDay >= SLOT_CONFIG.SHOP_UNLOCK_AFTER_DAY;
    }

    getOwnedCardIds() {
        return Object.keys(this.data.cards || {}).filter((id) => (this.data.cards[id] || 0) > 0);
    }

    canBuyWithoutReplace(cardId) {
        return this.getCardLevel(cardId) > 0 || this.getOwnedCardIds().length < this.getMaxCardSlots();
    }

    recordBossDefeated(bossType) {
        this.meta.totalBossesDefeated += 1;
        this.data.runBossesDefeated = (this.data.runBossesDefeated || 0) + 1;
        if (!Array.isArray(this.data.bossesBeaten)) this.data.bossesBeaten = [];
        if (!Array.isArray(this.data.bossPerks)) this.data.bossPerks = [];

        let milestone = null;
        const reward = BOSS_REWARDS[bossType];
        if (reward && !this.data.bossesBeaten.includes(bossType)) {
            this.data.bossesBeaten.push(bossType);
            if (!this.data.bossPerks.includes(reward.perkId)) {
                this.data.bossPerks.push(reward.perkId);
            }
            milestone = reward;
        }

        this.saveMeta();
        this.saveCurrentProgress();
        return milestone;
    }

    // =========================================================
    // کلاس‌ها و پیشرفت کلی
    // =========================================================
    getClassConfig(classId = null) {
        const id = classId || this.meta.selectedClass || 'classic';
        return SHEPHERD_CLASSES[id] || SHEPHERD_CLASSES.classic;
    }

    isClassUnlocked(classId) {
        if (classId === 'classic') return true;
        if (classId === 'storm') return this.meta.maxDayReached >= 5;
        if (classId === 'houndmaster') return this.meta.totalWolvesScared >= 25;
        if (classId === 'gambler') {
            return this.meta.totalWaterKOs >= 5 || this.meta.maxDayReached >= 7;
        }
        return false;
    }

    getClassUnlockProgress(classId) {
        if (classId === 'storm') return `مرحله ${Math.min(5, this.meta.maxDayReached)}/5`;
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

    // =========================================================
    // سیستم کارت‌ها، قیمت‌گذاری ضد-اسنوبال و جایگزینی اسلات
    // =========================================================
    getCardLevel(cardId) {
        return this.data.cards?.[cardId] || 0;
    }

    getTotalOwnedCardLevels() {
        return Object.values(this.data.cards || {}).reduce((sum, v) => sum + (v || 0), 0);
    }

    getCardPrice(card) {
        const base = CARD_BASE_PRICES[card.rarity] || 85;
        const lvl = this.getCardLevel(card.id);
        const totalOwned = this.getTotalOwnedCardLevels();
        const raw = base * (1 + lvl * 0.78) + totalOwned * 18;
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

    buyDraftCard(cardId, replaceCardId = null) {
        const card = CARDS.find((c) => c.id === cardId);
        if (!card) return { ok: false, newEvolutions: [] };

        const currLvl = this.getCardLevel(cardId);
        if (currLvl >= card.maxLevel) return { ok: false, newEvolutions: [] };

        const needsReplace = !this.canBuyWithoutReplace(cardId);
        if (needsReplace && (!replaceCardId || this.getCardLevel(replaceCardId) <= 0)) {
            return { ok: false, needsReplace: true, newEvolutions: [] };
        }

        const price = this.getCardPrice(card);
        if (this.data.gold < price) return { ok: false, newEvolutions: [] };

        const prevEvos = new Set(this.getActiveEvolutions().map((e) => e.id));

        let replacedLevel = 0;
        let replaceRefund = 0;
        if (needsReplace && replaceCardId) {
            const oldCard = CARDS.find((c) => c.id === replaceCardId);
            replacedLevel = this.getCardLevel(replaceCardId);
            replaceRefund = oldCard ? Math.round((CARD_BASE_PRICES[oldCard.rarity] || 80) * 0.4) : 30;
            delete this.data.cards[replaceCardId];
            this.data.gold += replaceRefund;
        }

        this.data.gold -= price;
        this.data.cards[cardId] = currLvl + 1;

        const newEvolutions = this.getActiveEvolutions().filter((e) => !prevEvos.has(e.id));
        this.saveCurrentProgress();
        return {
            ok: true,
            pricePaid: price,
            replacedCardId: needsReplace ? replaceCardId : null,
            replacedLevel,
            replaceRefund,
            newEvolutions,
        };
    }

    refundDraftCard(cardId, purchaseInfo) {
        const currLvl = this.getCardLevel(cardId);
        if (currLvl <= 0) return false;
        const paidPrice = typeof purchaseInfo === 'number' ? purchaseInfo : purchaseInfo.pricePaid;
        const replacedCardId = typeof purchaseInfo === 'object' ? purchaseInfo.replacedCardId : null;
        const replacedLevel = typeof purchaseInfo === 'object' ? purchaseInfo.replacedLevel : 0;
        const replaceRefund = typeof purchaseInfo === 'object' ? purchaseInfo.replaceRefund || 0 : 0;

        this.data.cards[cardId] = currLvl - 1;
        if (this.data.cards[cardId] === 0) delete this.data.cards[cardId];
        this.data.gold += paidPrice - replaceRefund;

        if (replacedCardId && replacedLevel > 0) {
            this.data.cards[replacedCardId] = replacedLevel;
        }
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

    // =========================================================
    // محاسبه‌گرهای بالانس‌شده (سود + هزینه کارت‌ها)
    // =========================================================
    buildStageFlock(day) {
        const cfg = getDayConfig(day, this.mode === 'daily', this.dailyDateKey, this.getWorldTier());
        const cls = this.getClassConfig(this.data.classId);
        const list = [];

        const ramCount = this.getCardLevel('battle_ram');
        const goldCount = this.getCardLevel('golden_touch') + (cls.extraGoldenSheep || 0);

        for (let i = 0; i < ramCount; i++) list.push('ram');
        for (let i = 0; i < goldCount; i++) list.push('golden');
        for (let i = 0; i < cfg.rebelCount; i++) list.push('rebel');
        for (let i = 0; i < cfg.gluttonCount; i++) list.push('glutton');

        // سقف منطقی گله (حداکثر ۱۴) برای حفظ مهارت و جلوگیری از اسنوبال
        const targetTotal = Math.min(14, cfg.baseFlockSize + Math.min(2, ramCount + goldCount));
        while (list.length < targetTotal) {
            list.push('normal');
        }
        return list.slice(0, 14);
    }

    getSurvivalQuota(totalFlock, targetDay = null) {
        const d = targetDay ?? this.data.day;
        const cls = this.getClassConfig(this.data.classId);
        const tier = this.getWorldTier();

        let allowedLosses = 2;
        if (d <= 2) {
            allowedLosses = 2; // مراحل ۱ و ۲ منصفانه و بدون فشار ناگهانی
        } else if (tier >= 3 || d >= 9) {
            allowedLosses = 0;
        } else if (tier >= 2 || d >= 4) {
            allowedLosses = 1;
        }

        allowedLosses = Math.max(0, allowedLosses - (cls.quotaAdd || 0));
        const minFloor = Math.min(3, totalFlock);
        return Math.max(minFloor, Math.min(totalFlock, totalFlock - allowedLosses));
    }

    getGoldMultiplier() {
        const cls = this.getClassConfig(this.data.classId);
        return cls.goldMul * (1 + this.getCardLevel('golden_touch') * 0.2);
    }

    getWolfSpeedMultiplier() {
        const cls = this.getClassConfig(this.data.classId);
        // هزینه کارت لمس طلایی: گرگ‌ها +۱۵٪ به ازای هر سطح سریع‌تر
        return cls.wolfSpeedMul * (1 + this.getCardLevel('golden_touch') * 0.15);
    }

    getWhistleRadius(isFever = false) {
        const cls = this.getClassConfig(this.data.classId);
        const powerMul = 1 + this.getCardLevel('whistle_power') * 0.18;
        // هزینه کارت نجات هوشمند: -۱۲٪ شعاع سوت به ازای هر سطح
        const magnetPenalty = Math.max(0.64, 1 - this.getCardLevel('magnet_save') * 0.12);
        return WHISTLE.BASE_RADIUS * cls.whistleRadiusMul * powerMul * magnetPenalty * (isFever ? 1.18 : 1.0);
    }

    getWhistleForce(isFever = false) {
        const powerMul = 1 + this.getCardLevel('whistle_power') * 0.18;
        // هزینه کارت نفس آهنی: -۱۰٪ قدرت پرتاب هر سوت به ازای هر سطح
        const lungPenalty = Math.max(0.7, 1 - this.getCardLevel('lung_capacity') * 0.1);
        return WHISTLE.BASE_FORCE * powerMul * lungPenalty * (isFever ? 1.16 : 1.0);
    }

    getSwipeRadius(isFever = false) {
        const cls = this.getClassConfig(this.data.classId);
        const cardMul = 1 + this.getCardLevel('whistle_power') * 0.18;
        return WHISTLE.SWIPE_RADIUS * cls.swipeRadiusMul * cardMul * (isFever ? 1.16 : 1.0);
    }

    getWhistleCooldownMs() {
        // هزینه کارت سوت شوک‌دار: +۳۵٪ تاخیر بین سوت‌ها
        return Math.round(WHISTLE.COOLDOWN_MS * (1 + this.getCardLevel('shock_whistle') * 0.35));
    }

    getWhistleStaminaCost(isFever = false) {
        // هزینه ابرسوت (+۲۰٪) + هزینه استاد تب طلا خارج از تب طلا (+۱۵٪)
        const powerTax = 1 + this.getCardLevel('whistle_power') * 0.2;
        const feverTax = isFever ? 0.5 : 1 + this.getCardLevel('fever_master') * 0.15;
        return STAMINA.WHISTLE_COST * powerTax * feverTax;
    }

    getSwipeStepStaminaCost(isFever = false) {
        const feverTax = isFever ? 0.5 : 1 + this.getCardLevel('fever_master') * 0.15;
        return STAMINA.SWIPE_STEP_COST * feverTax;
    }

    getStaminaRegen() {
        const cls = this.getClassConfig(this.data.classId);
        return STAMINA.REGEN_PER_SEC * cls.staminaRegenMul * (1 + this.getCardLevel('lung_capacity') * 0.32);
    }

    getMaxHoldSec() {
        return STAMINA.MAX_HOLD_SEC + this.getCardLevel('lung_capacity') * 0.24;
    }

    getSheepFleeSpeedMul() {
        // هزینه هاله آرامش: -۱۲٪ سرعت فرار گله به ازای هر سطح
        return Math.max(0.64, 1 - this.getCardLevel('calm_aura') * 0.12);
    }

    getFeverChargeMultiplier() {
        const cardMul = 1 + this.getCardLevel('fever_master') * 0.3;
        const perkMul = this.hasBossPerk('kraken_heart') ? 1.15 : 1.0;
        return cardMul * perkMul;
    }

    getDogCount() {
        const lvl = this.getCardLevel('guard_dog');
        if (lvl >= 3) return 2;
        if (lvl >= 1) return 1;
        return 0;
    }

    getDogUpkeepCost() {
        return this.getDogCount() * DOG_CONFIG.UPKEEP_PER_DOG;
    }

    getFlowerEatSpeedMul() {
        // هزینه گل‌های انفجاری: گل‌ها ۲۵٪ سریع‌تر خورده می‌شوند
        return 1 + this.getCardLevel('thorny_bloom') * 0.25;
    }

    getFlowerValuePenalty() {
        // هزینه گل‌های انفجاری: ۲ سکه کمتر برای هر گل سالم
        return this.getCardLevel('thorny_bloom') * 2;
    }

    recordWolfDefeated(isWaterKO = false) {
        const before = this.getUnlockedClassSet();
        this.meta.totalWolvesScared += 1;
        this.data.runWolvesDefeated = (this.data.runWolvesDefeated || 0) + 1;
        if (isWaterKO) this.meta.totalWaterKOs += 1;
        this.saveMeta();
        return this.checkNewClassUnlocks(before);
    }

    completeDay(aliveSheepCount, netGold, stats, completedMission = null) {
        const before = this.getUnlockedClassSet();
        const completedDay = this.data.day;

        this.data.gold = Math.max(0, this.data.gold + netGold);
        this.data.flowerRepellent = false;

        if (completedMission) {
            this.lastMissionId = completedMission.id;
            if (completedMission.freeReroll) {
                this.data.freeRerolls += completedMission.freeReroll;
            }
        }

        // امتیازدهی متعادل: در مراحل ۱ و ۲ کم و کنترل‌شده، در مراحل بالا و Tier 2/3 پاداش متناسب با زحمت
        const stageScore = netGold + completedDay * 50 + aliveSheepCount * 12;
        this.data.totalScore += stageScore;

        this.data.runLog.days.push({
            day: completedDay,
            sheepSurvived: aliveSheepCount,
            flowersSurvived: stats?.aliveFlowerCount ?? 0,
            goldEarned: netGold,
            finishedAt: Date.now(),
        });

        this.data.day += 1;

        // جایزه ویژه «تاج شبان» پس از شکست باس ۱۰: ۱ علوفه رایگان ابتدای هر مرحله بعدی
        if (this.hasBossPerk('wolf_crown') && this.data.hayCount < HAY_CONFIG.MAX_STOCK) {
            this.data.hayCount += 1;
        }

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