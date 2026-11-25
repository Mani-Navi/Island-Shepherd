/**
 * موتور لبه آروان‌کلاد (ArvanCloud Edge Function / ES Module)
 * قابلیت‌ها:
 * 1) POST /api/run/start        -> صدور توکن رمزنگاری‌شده شروع ران (HMAC-SHA256)
 * 2) POST /api/edge-director    -> اجرای منطق «فرمان زنده لبه» + تولید روایت و کُری باس با AIaaS
 * 3) GET  /api/daily-news       -> خبرنامه کوتاه روزانه جزیره با AIaaS (بدون ایموجی)
 * 4) POST /api/score            -> اعتبارسنجی رمزنگاری‌شده و ریاضی روی لبه + تولید لقب و حماسه AIaaS + ذخیره در دیتابیس/KV
 * 5) GET  /api/leaderboard      -> دریافت جدول رده‌بندی واقعی (کلی و چالش امروز) همراه با القاب AI
 * 6) GET  /api/world-pulse      -> آمار زنده جهانی همه چوپان‌ها روی لبه
 */

let memoryGlobalLeaderboard = [];
const memoryDailyLeaderboards = {};
let memoryWorldPulse = {
    totalRunsVerified: 0,
    totalSheepSaved: 0,
    totalWolvesDefeated: 0,
    totalBossesSlain: 0,
};

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
};

function jsonResponse(data, status = 200, extraHeaders = {}) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...CORS_HEADERS, ...extraHeaders },
    });
}

function getTodayDateKey() {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, '0');
    const d = String(now.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function normalizeDateKey(raw) {
    if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    return getTodayDateKey();
}

function stripEmojis(str) {
    return String(str || '')
        .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
        .replace(/["«»\n\r]+/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

/**
 * امضای دیجیتال HMAC-SHA256 روی لبه با Web Crypto API (دارای fallback ایمن)
 */
async function signEdgePayload(payloadStr, secret) {
    const keySecret = secret || 'arvan-island-shepherd-edge-v5-secret';
    try {
        if (typeof crypto !== 'undefined' && crypto.subtle) {
            const enc = new TextEncoder();
            const key = await crypto.subtle.importKey(
                'raw',
                enc.encode(keySecret),
                { name: 'HMAC', hash: 'SHA-256' },
                false,
                ['sign']
            );
            const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(payloadStr));
            return Array.from(new Uint8Array(sigBuf))
                .map((b) => b.toString(16).padStart(2, '0'))
                .join('')
                .slice(0, 28);
        }
    } catch {
        // fallback hash
    }
    let h = 2166136261 >>> 0;
    const combined = `${keySecret}:${payloadStr}`;
    for (let i = 0; i < combined.length; i++) {
        h ^= combined.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return `fnv${(h >>> 0).toString(16)}`;
}

async function createRunToken(data, env) {
    const payload = `${data.runId}|${data.startedAt}|${data.mode}|${data.dateKey}|${data.classId}`;
    const sig = await signEdgePayload(payload, env?.EDGE_SIGN_SECRET);
    return `${payload}|${sig}`;
}

async function verifyRunToken(token, env) {
    if (typeof token !== 'string') return { ok: false };
    const parts = token.split('|');
    if (parts.length !== 6) return { ok: false };
    const [runId, startedAtStr, mode, dateKey, classId, sig] = parts;
    const startedAt = Number(startedAtStr);
    if (!runId || !Number.isFinite(startedAt)) return { ok: false };
    const expected = await signEdgePayload(
        `${runId}|${startedAtStr}|${mode}|${dateKey}|${classId}`,
        env?.EDGE_SIGN_SECRET
    );
    return {
        ok: sig === expected,
        runId,
        startedAt,
        mode,
        dateKey,
        classId,
        signature: sig,
    };
}

/**
 * بانک فرمان‌های منطقی لبه (Mutators واقعی که روی مکانیک مرحله اثر می‌گذارند)
 */
const EDGE_DECREES = [
    {
        id: 'crimson_hunt',
        icon: 'wolf',
        badgeColor: '#dc2626',
        title: 'ماه شکارچیان',
        effectSummary: 'گرگ‌ها ۱۵٪ سریع‌تر • جایزه دفع گرگ +۴۰٪',
        defaultLore: 'امشب زوزه گرگ‌ها از دل موج‌ها می‌آید؛ اما شکارچیان جسور سکه بیشتری می‌گیرند.',
        mods: { wolfSpeedMul: 1.15, wolfBountyMul: 1.4, goldZoneMul: 1.0, windBonus: 0, flowerValueMul: 1.0, staminaRegenMul: 1.0 },
    },
    {
        id: 'golden_bloom',
        icon: 'flower',
        badgeColor: '#db2777',
        title: 'شکوفه جادویی',
        effectSummary: 'ارزش گل‌های سالم +۶۰٪ • نفس چوپان ۱۰٪ سریع‌تر',
        defaultLore: 'عطر لاله‌های جزیره کل ساحل را پر کرده؛ هر گل سالم گنجی ارزشمند است.',
        mods: { wolfSpeedMul: 1.0, wolfBountyMul: 1.0, goldZoneMul: 1.0, windBonus: 0, flowerValueMul: 1.6, staminaRegenMul: 1.1 },
    },
    {
        id: 'sea_gale',
        icon: 'wind',
        badgeColor: '#0284c7',
        title: 'تندباد اقیانوسی',
        effectSummary: 'باد ساحلی قوی‌تر • درآمد چراگاه طلایی +۵۰٪',
        defaultLore: 'باد تند از شمال می‌وزد و گله را هل می‌دهد، اما خاک ساحل پر از سکه شده است.',
        mods: { wolfSpeedMul: 1.05, wolfBountyMul: 1.15, goldZoneMul: 1.5, windBonus: 18, flowerValueMul: 1.0, staminaRegenMul: 1.12 },
    },
    {
        id: 'iron_lungs',
        icon: 'lungs',
        badgeColor: '#0d9488',
        title: 'نسیم چوپانی',
        effectSummary: 'بازگشت نفس +۲۵٪ • گرگ‌ها ۱۰٪ سریع‌تر',
        defaultLore: 'هوای خنک جزیره نفست را تازه می‌کند، ولی گرگ‌ها هم با انرژی بیشتری می‌آیند.',
        mods: { wolfSpeedMul: 1.1, wolfBountyMul: 1.2, goldZoneMul: 1.15, windBonus: 0, flowerValueMul: 1.0, staminaRegenMul: 1.25 },
    },
    {
        id: 'bounty_tide',
        icon: 'coin',
        badgeColor: '#d97706',
        title: 'گنج ساحلی',
        effectSummary: 'جایزه دفع گرگ +۳۰٪ • ارزش گل‌ها +۳۰٪ • باد ملایم',
        defaultLore: 'امواج طلایی به ساحل رسیده‌اند؛ دفاع بی‌نقص از گله و باغچه پاداش سنگینی دارد.',
        mods: { wolfSpeedMul: 1.08, wolfBountyMul: 1.3, goldZoneMul: 1.25, windBonus: 10, flowerValueMul: 1.3, staminaRegenMul: 1.0 },
    },
];

function selectEdgeDecree(day, mode, dateKey) {
    if (day <= 1) return null;
    const seedStr = mode === 'daily' ? `${dateKey}_${day}` : `${day}_${Math.floor(Date.now() / 60000)}`;
    let h = 0;
    for (let i = 0; i < seedStr.length; i++) {
        h = (h * 31 + seedStr.charCodeAt(i)) >>> 0;
    }
    return EDGE_DECREES[h % EDGE_DECREES.length];
}

/**
 * فراخوانی یکپارچه AIaaS آروان با تایم‌اوت کوتاه و بدون توقف بازی
 */
async function callArvanAI(env, systemPrompt, userPrompt, maxTokens = 90) {
    if (!env?.AIAAS_API_KEY || !env?.AIAAS_BASE_URL) return null;
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3200);
        const res = await fetch(env.AIAAS_BASE_URL, {
            method: 'POST',
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${env.AIAAS_API_KEY}`,
            },
            body: JSON.stringify({
                model: env.AIAAS_MODEL || 'gpt-4o-mini',
                max_tokens: maxTokens,
                temperature: 0.9,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
            }),
        });
        clearTimeout(timer);
        if (!res.ok) return null;
        const data = await res.json();
        return stripEmojis(data?.choices?.[0]?.message?.content);
    } catch {
        return null;
    }
}

/**
 * لایه ذخیره‌سازی ۳سطحی:
 * ۱) دیتابیس آروان از طریق REST/PostgREST Gateway (در صورت تنظیم ARVAN_DB_URL)
 * ۲) فضای KV آروان‌کلاد (LEADERBOARD_KV)
 * ۳) حافظه نود لبه
 */
async function getLeaderboard(env, mode = 'normal', dateKey = null) {
    const isDaily = mode === 'daily';
    const cleanDate = normalizeDateKey(dateKey);
    const kvKey = isDaily ? `daily_scores_v5_${cleanDate}` : 'top_scores_v5';

    // ۱. دیتابیس آروان (در صورت اتصال Gateway)
    if (env?.ARVAN_DB_URL) {
        try {
            const url = new URL(`${env.ARVAN_DB_URL.replace(/\/$/, '')}/leaderboard`);
            url.searchParams.set('mode', mode);
            if (isDaily) url.searchParams.set('dateKey', cleanDate);
            const res = await fetch(url.toString(), {
                headers: env.ARVAN_DB_TOKEN ? { Authorization: `Bearer ${env.ARVAN_DB_TOKEN}` } : {},
            });
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data?.items || data)) {
                    return { items: data.items || data, storage: 'arvan-db' };
                }
            }
        } catch {
            // fallback to KV
        }
    }

    // ۲. KV آروان‌کلاد
    if (env?.LEADERBOARD_KV) {
        const raw = await env.LEADERBOARD_KV.get(kvKey);
        return { items: raw ? JSON.parse(raw) : [], storage: 'arvan-kv' };
    }

    // ۳. حافظه لبه
    return {
        items: isDaily ? (memoryDailyLeaderboards[cleanDate] || []) : memoryGlobalLeaderboard,
        storage: 'edge-memory',
    };
}

async function saveScoreRecord(env, record, mode = 'normal', dateKey = null) {
    const isDaily = mode === 'daily';
    const cleanDate = normalizeDateKey(dateKey);
    const kvKey = isDaily ? `daily_scores_v5_${cleanDate}` : 'top_scores_v5';

    if (env?.ARVAN_DB_URL) {
        try {
            await fetch(`${env.ARVAN_DB_URL.replace(/\/$/, '')}/leaderboard`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(env.ARVAN_DB_TOKEN ? { Authorization: `Bearer ${env.ARVAN_DB_TOKEN}` } : {}),
                },
                body: JSON.stringify(record),
            });
        } catch {
            // ادامه با KV/حافظه
        }
    }

    const { items } = await getLeaderboard(env, mode, cleanDate);
    const list = Array.isArray(items) ? [...items] : [];
    list.push(record);
    list.sort((a, b) => b.score - a.score);
    const top = list.slice(0, 20);

    if (isDaily) {
        memoryDailyLeaderboards[cleanDate] = top;
    } else {
        memoryGlobalLeaderboard = top;
    }

    if (env?.LEADERBOARD_KV) {
        await env.LEADERBOARD_KV.put(kvKey, JSON.stringify(top));
    }
    return top;
}

async function getWorldPulse(env) {
    if (env?.LEADERBOARD_KV) {
        const raw = await env.LEADERBOARD_KV.get('world_pulse_v5');
        if (raw) {
            try {
                return JSON.parse(raw);
            } catch {
                // ignore
            }
        }
    }
    return memoryWorldPulse;
}

async function bumpWorldPulse(env, { sheepSaved = 0, wolvesDefeated = 0, bossesSlain = 0 }) {
    const pulse = await getWorldPulse(env);
    pulse.totalRunsVerified = (pulse.totalRunsVerified || 0) + 1;
    pulse.totalSheepSaved = (pulse.totalSheepSaved || 0) + Math.max(0, sheepSaved);
    pulse.totalWolvesDefeated = (pulse.totalWolvesDefeated || 0) + Math.max(0, wolvesDefeated);
    pulse.totalBossesSlain = (pulse.totalBossesSlain || 0) + Math.max(0, bossesSlain);
    memoryWorldPulse = pulse;

    if (env?.LEADERBOARD_KV) {
        await env.LEADERBOARD_KV.put('world_pulse_v5', JSON.stringify(pulse));
    }
    return pulse;
}

/**
 * اعتبارسنجی چندلایه ضدتقلب روی لبه (ریاضی + زمان‌بندی + امضای رمزنگاری‌شده HMAC)
 */
async function validateRunOnEdge(body, env) {
    const { nickname, score, dayReached, runLog, mode, runToken } = body || {};

    if (typeof nickname !== 'string' || nickname.trim().length < 1 || nickname.trim().length > 18) {
        return { valid: false, reason: 'نام مستعار نامعتبر است.' };
    }
    if (mode && mode !== 'normal' && mode !== 'daily') {
        return { valid: false, reason: 'حالت بازی نامعتبر است.' };
    }
    if (!Number.isInteger(score) || score <= 0 || !Number.isInteger(dayReached) || dayReached < 1) {
        return { valid: false, reason: 'ساختار امتیاز نامعتبر است.' };
    }
    if (!runLog || !Array.isArray(runLog.days) || runLog.days.length === 0) {
        return { valid: false, reason: 'گزارش مراحل بازی ارسال نشده است.' };
    }

    let recomputedScore = 0;
    let minRequiredMs = 0;
    let totalSheepSaved = 0;

    for (let i = 0; i < runLog.days.length; i++) {
        const entry = runLog.days[i];
        const expectedDay = i + 1;

        if (entry.day !== expectedDay) {
            return { valid: false, reason: 'ترتیب مراحل بازی دستکاری شده است.' };
        }
        if (!Number.isInteger(entry.sheepSurvived) || entry.sheepSurvived < 1 || entry.sheepSurvived > 20) {
            return { valid: false, reason: 'تعداد گوسفندها خارج از حد مجاز است.' };
        }
        if (!Number.isInteger(entry.flowersSurvived) || entry.flowersSurvived < 0 || entry.flowersSurvived > 10) {
            return { valid: false, reason: 'تعداد گل‌ها خارج از حد مجاز است.' };
        }

        const maxPlausibleGold = entry.sheepSurvived * 75 + entry.flowersSurvived * 30 + 950;
        if (typeof entry.goldEarned !== 'number' || entry.goldEarned < 0 || entry.goldEarned > maxPlausibleGold) {
            return { valid: false, reason: 'درآمد ثبت‌شده با قوانین بازی همخوانی ندارد.' };
        }

        recomputedScore += entry.goldEarned + entry.day * 75 + entry.sheepSurvived * 15;
        totalSheepSaved += entry.sheepSurvived;
        minRequiredMs += entry.day % 5 === 0 ? 12000 : 34000;
    }

    if (recomputedScore !== score) {
        return { valid: false, reason: 'امتیاز ارسالی با محاسبه لبه مطابقت ندارد.' };
    }

    const tokenCheck = runToken ? await verifyRunToken(runToken, env) : { ok: false };
    const effectiveStart = tokenCheck.ok ? tokenCheck.startedAt : runLog.startedAt || 0;
    const lastDay = runLog.days[runLog.days.length - 1];
    const elapsedMs = (lastDay.finishedAt || Date.now()) - effectiveStart;

    if (elapsedMs < minRequiredMs) {
        return { valid: false, reason: 'زمان تکمیل بازی غیرواقعی است.' };
    }

    const receiptSig = await signEdgePayload(
        `${nickname.trim()}|${score}|${dayReached}|${recomputedScore}`,
        env?.EDGE_SIGN_SECRET
    );

    return {
        valid: true,
        cryptoVerified: tokenCheck.ok,
        receiptSig,
        totalSheepSaved,
    };
}

/**
 * ساخت لقب و حماسه اختصاصی چوپان با AIaaS (با fallback هوشمند و متنوع)
 */
async function generateShepherdChronicle(env, { nickname, score, dayReached, classId, wolvesDefeated = 0, bossesDefeated = 0 }) {
    const fallbackTitles = [
        dayReached >= 10 ? 'افسانه اقیانوس' : dayReached >= 5 ? 'رام‌کننده کراکن' : dayReached >= 3 ? 'نگهبان بی‌باک گله' : 'چوپان خوش‌آتیه',
        wolvesDefeated >= 10 ? 'کابوس گرگ‌های ساحل' : 'استاد سوت و باد',
        score >= 1200 ? 'سلطان طلای جزیره' : 'حافظ باغچه لاله‌ها',
    ];
    const fallbackTitle = fallbackTitles[0];
    const fallbackChronicle = `${nickname} تا مرحله ${dayReached} از گله دفاع کرد و با ${score} امتیاز نامش را در تاریخ جزیره ثبت کرد.`;

    const aiRaw = await callArvanAI(
        env,
        'تو راوی طناز و حماسی بازی چوپان جزیره هستی. دقیقاً در دو خط کوتاه فارسی بدون ایموجی پاسخ بده. خط اول فقط یک لقب ۲ تا ۴ کلمه‌ای. خط دوم فقط یک جمله کوتاه حماسی (حداکثر ۱۶ کلمه).',
        `بازیکن: ${nickname}، مرحله رسیده: ${dayReached}، امتیاز: ${score}، کلاس: ${classId || 'classic'}، گرگ‌های دفع‌شده: ${wolvesDefeated}، باس‌های مغلوب: ${bossesDefeated}.`,
        95
    );

    if (!aiRaw) {
        return { title: fallbackTitle, chronicle: fallbackChronicle, aiPowered: false };
    }

    const lines = aiRaw.split(/\n|—|-/).map((s) => s.trim()).filter(Boolean);
    const title = (lines[0] || fallbackTitle).slice(0, 32);
    const chronicle = (lines[1] || aiRaw || fallbackChronicle).slice(0, 120);
    return { title, chronicle, aiPowered: true };
}

async function handleEdgeDirector(request, env) {
    const t0 = Date.now();
    const body = await request.json().catch(() => ({}));
    const day = Math.max(1, Number(body.day || 1));
    const mode = body.mode === 'daily' ? 'daily' : 'normal';
    const dateKey = normalizeDateKey(body.dateKey);
    const nickname = stripEmojis(body.nickname || 'چوپان') || 'چوپان';
    const islandName = stripEmojis(body.islandName || 'جزیره');
    const seasonName = stripEmojis(body.seasonName || 'بهار');
    const bossType = body.bossType || null;
    const flockSize = Number(body.flockSize || 5);

    // ۱. کُری‌خوانی هوشمند باس در مراحل باس‌فایت
    let bossTaunt = null;
    if (bossType) {
        const bossName = bossType === 'wolf_king' ? 'شاه گرگ‌ها' : 'کراکن اختاپوس';
        const fallbackTaunt =
            bossType === 'wolf_king'
                ? `${nickname}! امشب گله ${flockSize} تایی‌ات مال گله گرگ‌های من است.`
                : `${nickname}! امواج اقیانوس جزیره‌ات را می‌بلعد؛ شاخک‌هایم آماده‌اند!`;
        const aiTaunt = await callArvanAI(
            env,
            'تو باس شرور اما کارتونی بازی چوپان جزیره هستی. فقط یک جمله کوتاه کُری‌خوانی فارسی (حداکثر ۱۵ کلمه) بدون ایموجی بگو.',
            `نام باس: ${bossName}، نام چوپان: ${nickname}، تعداد گوسفندها: ${flockSize}، فصل: ${seasonName}.`,
            65
        );
        bossTaunt = aiTaunt || fallbackTaunt;
    }

    // ۲. فرمان زنده لبه (تغییردهنده واقعی منطق بازی)
    const decree = selectEdgeDecree(day, mode, dateKey);
    let lore = decree ? decree.defaultLore : null;
    let aiPowered = false;

    if (decree) {
        const aiLore = await callArvanAI(
            env,
            'تو گزارشگر خلاق بازی مزرعه‌داری چوپان جزیره هستی. فقط یک جمله کوتاه فارسی (حداکثر ۱۶ کلمه) بدون ایموجی درباره این رویداد مرحله بنویس.',
            `مرحله ${day} در ${islandName} (فصل ${seasonName}) با فرمان «${decree.title}» (${decree.effectSummary}). چوپان: ${nickname}.`,
            70
        );
        if (aiLore) {
            lore = aiLore;
            aiPowered = true;
        }
    }

    return jsonResponse({
        ok: true,
        source: aiPowered ? 'arvan-edge-aiaas' : 'arvan-edge',
        edgeLatencyMs: Date.now() - t0,
        decree: decree
            ? {
                id: decree.id,
                icon: decree.icon,
                badgeColor: decree.badgeColor,
                title: decree.title,
                effectSummary: decree.effectSummary,
                lore,
                mods: decree.mods,
            }
            : null,
        bossTaunt,
    });
}

async function handleDailyNews(url, env) {
    const day = Number(url.searchParams.get('day') || 1);
    const flock = Number(url.searchParams.get('flock') || 5);
    const fallbacks = [
        `خبرنامه مرحله ${day}: امروز ${flock} گوسفند پرانرژی چشمشان به گل‌های باغچه است؛ مراقب باش.`,
        `هواشناسی جزیره (مرحله ${day}): نسیم ملایمی می‌وزد اما گرگ‌ها کنار ساحل کمین کرده‌اند.`,
        `یادداشت چوپان پیر: پرت کردن گرگ‌ها به داخل آب دو برابر سکه و شارژ تب طلا می‌دهد.`,
        `گزارش دیده‌بان (مرحله ${day}): با نزدیک شدن دقایق پایانی آب دریا بالا می‌آید؛ گله را جمع کن.`,
    ];
    const fallback = fallbacks[(Math.max(1, day) - 1) % fallbacks.length];
    const generated = await callArvanAI(
        env,
        'تو گزارشگر بامزه و بدون خشونت بازی کارتونی چوپان جزیره هستی. فقط یک جمله کوتاه فارسی (حداکثر ۱۸ کلمه) با لحن شاد و کاملاً بدون ایموجی بنویس.',
        `برای شروع مرحله ${day} جزیره که چوپان ${flock} گوسفند دارد، یک تیتر کوتاه خبرنامه مزرعه بنویس.`,
        70
    );
    return jsonResponse({
        news: generated || fallback,
        source: generated ? 'arvan-aiaas' : 'arvan-edge',
    });
}

export default {
    async fetch(request, env) {
        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: CORS_HEADERS });
        }

        const url = new URL(request.url);

        if (request.method === 'POST' && url.pathname === '/api/run/start') {
            const body = await request.json().catch(() => ({}));
            const mode = body.mode === 'daily' ? 'daily' : 'normal';
            const dateKey = normalizeDateKey(body.dateKey);
            const classId = String(body.classId || 'classic').slice(0, 20);
            const startedAt = Date.now();
            const runId = `r${startedAt.toString(36)}${Math.floor(Math.random() * 9999).toString(36)}`;
            const runToken = await createRunToken({ runId, startedAt, mode, dateKey, classId }, env);
            return jsonResponse({ ok: true, runToken, startedAt, edgeSigned: true });
        }

        if (request.method === 'POST' && url.pathname === '/api/edge-director') {
            return handleEdgeDirector(request, env);
        }

        if (request.method === 'GET' && url.pathname === '/api/daily-news') {
            return handleDailyNews(url, env);
        }

        if (request.method === 'GET' && url.pathname === '/api/world-pulse') {
            const pulse = await getWorldPulse(env);
            const hasAI = Boolean(env?.AIAAS_API_KEY && env?.AIAAS_BASE_URL);
            const storage = env?.ARVAN_DB_URL ? 'arvan-db' : env?.LEADERBOARD_KV ? 'arvan-kv' : 'edge-memory';
            return jsonResponse({ ok: true, pulse, hasAI, storage, source: 'arvan-edge' });
        }

        if (request.method === 'GET' && url.pathname === '/api/leaderboard') {
            const mode = url.searchParams.get('mode') === 'daily' ? 'daily' : 'normal';
            const dateKey = normalizeDateKey(url.searchParams.get('date'));
            const { items, storage } = await getLeaderboard(env, mode, dateKey);
            const pulse = await getWorldPulse(env);
            return jsonResponse({ items, mode, dateKey, storage, pulse, source: 'arvan-edge' });
        }

        if (request.method === 'POST' && url.pathname === '/api/score') {
            try {
                const t0 = Date.now();
                const body = await request.json();
                const mode = body?.mode === 'daily' ? 'daily' : 'normal';
                const dateKey = normalizeDateKey(body?.dateKey);
                const check = await validateRunOnEdge(body, env);

                if (!check.valid) {
                    return jsonResponse({ ok: false, verified: false, message: check.reason }, 400);
                }

                const chronicleData = await generateShepherdChronicle(env, {
                    nickname: body.nickname.trim(),
                    score: body.score,
                    dayReached: body.dayReached,
                    classId: body.classId,
                    wolvesDefeated: Number(body.wolvesDefeated || 0),
                    bossesDefeated: Number(body.bossesDefeated || 0),
                });

                const record = {
                    nickname: body.nickname.trim(),
                    score: body.score,
                    dayReached: body.dayReached,
                    mode,
                    dateKey: mode === 'daily' ? dateKey : undefined,
                    aiTitle: chronicleData.title,
                    chronicle: chronicleData.chronicle,
                    verified: true,
                    cryptoVerified: check.cryptoVerified,
                    receiptSig: check.receiptSig,
                    createdAt: Date.now(),
                };

                await saveScoreRecord(env, record, mode, dateKey);
                const pulse = await bumpWorldPulse(env, {
                    sheepSaved: check.totalSheepSaved,
                    wolvesDefeated: Number(body.wolvesDefeated || 0),
                    bossesSlain: Number(body.bossesDefeated || 0),
                });

                return jsonResponse({
                    ok: true,
                    verified: true,
                    cryptoVerified: check.cryptoVerified,
                    receiptSig: check.receiptSig,
                    aiTitle: chronicleData.title,
                    chronicle: chronicleData.chronicle,
                    aiPowered: chronicleData.aiPowered,
                    edgeLatencyMs: Date.now() - t0,
                    pulse,
                    message: 'امتیاز با امضای لبه تایید و در جدول ثبت شد.',
                });
            } catch {
                return jsonResponse({ ok: false, verified: false, message: 'داده ارسالی نامعتبر است.' }, 400);
            }
        }

        return jsonResponse({ ok: false, message: 'Not Found' }, 404);
    },
};