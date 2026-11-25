import { getTodayDateKey } from '../config/gameData.js';

const EDGE_API_URL = import.meta.env.VITE_EDGE_API_URL || '';
const IS_LOCALHOST =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname === '');

const API_BASE = EDGE_API_URL || (!IS_LOCALHOST ? '' : null);

try {
    localStorage.removeItem('island_shepherd_local_lb_v2');
} catch {
    // ignore
}

const FALLBACK_NEWS = [
    'خبرنامه جزیره: نسیم ملایمی می‌وزد و گوسفندها امروز پرانرژی‌تر از همیشه‌اند.',
    'هواشناسی جزیره: عطر گل‌های لاله حواس گله را پرت کرده؛ مراقب باغچه باش.',
    'گزارش دیده‌بان: ردپای گرگ‌ها کنار ساحل دیده شده؛ سوت چوپانی را آماده نگه دار.',
    'اخطار جزر و مد: دقایق پایانی آب دریا بالا می‌آید؛ گله را از لبه‌ها دور نگه دار.',
];

async function fetchWithTimeout(url, options = {}, timeoutMs = 3000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...options, signal: controller.signal, cache: 'no-store' });
    } finally {
        clearTimeout(timer);
    }
}

/**
 * دریافت توکن امضاشده شروع ران از لبه آروان‌کلاد (HMAC-SHA256)
 */
export async function startEdgeRun({ mode = 'normal', dateKey = null, classId = 'classic' }) {
    if (API_BASE === null) return { ok: false, runToken: null, edgeSigned: false };
    try {
        const res = await fetchWithTimeout(
            `${API_BASE}/api/run/start`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode,
                    dateKey: dateKey || getTodayDateKey(),
                    classId,
                }),
            },
            2500
        );
        if (!res.ok) return { ok: false, runToken: null, edgeSigned: false };
        return await res.json();
    } catch {
        return { ok: false, runToken: null, edgeSigned: false };
    }
}

/**
 * دریافت «فرمان زنده لبه» (تغییردهنده منطق گیم‌پلی + روایت AIaaS) و کُری‌خوانی باس
 */
export async function fetchEdgeDirector({
                                            day,
                                            mode = 'normal',
                                            dateKey = null,
                                            nickname = '',
                                            islandName = '',
                                            seasonName = '',
                                            bossType = null,
                                            flockSize = 5,
                                        }) {
    if (API_BASE === null) {
        return { ok: false, decree: null, bossTaunt: null, source: 'local' };
    }
    try {
        const res = await fetchWithTimeout(
            `${API_BASE}/api/edge-director`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    day,
                    mode,
                    dateKey: dateKey || getTodayDateKey(),
                    nickname,
                    islandName,
                    seasonName,
                    bossType,
                    flockSize,
                }),
            },
            3400
        );
        if (!res.ok) return { ok: false, decree: null, bossTaunt: null, source: 'local' };
        return await res.json();
    } catch {
        return { ok: false, decree: null, bossTaunt: null, source: 'local' };
    }
}

export async function fetchDailyNews(day, flockSize) {
    const fallback = FALLBACK_NEWS[(day - 1) % FALLBACK_NEWS.length];
    if (API_BASE === null) return { text: fallback, source: 'local' };

    try {
        const res = await fetchWithTimeout(
            `${API_BASE}/api/daily-news?day=${day}&flock=${flockSize}`,
            {},
            2600
        );
        if (!res.ok) throw new Error('Edge news error');
        const data = await res.json();
        return { text: data.news || fallback, source: data.source || 'ai' };
    } catch {
        return { text: fallback, source: 'local' };
    }
}

export async function fetchWorldPulse() {
    if (API_BASE === null) return { ok: false, pulse: null, source: 'offline' };
    try {
        const res = await fetchWithTimeout(`${API_BASE}/api/world-pulse`, {}, 2500);
        if (!res.ok) return { ok: false, pulse: null, source: 'offline' };
        return await res.json();
    } catch {
        return { ok: false, pulse: null, source: 'offline' };
    }
}

export async function submitScore({
                                      nickname,
                                      score,
                                      dayReached,
                                      runLog,
                                      runToken = null,
                                      classId = 'classic',
                                      wolvesDefeated = 0,
                                      bossesDefeated = 0,
                                      mode = 'normal',
                                      dateKey = null,
                                  }) {
    const cleanName = (nickname || 'چوپان مهمان').trim().slice(0, 18);
    const activeDate = dateKey || getTodayDateKey();

    if (API_BASE === null) {
        return {
            ok: false,
            verified: false,
            mode: 'offline',
            message: 'ثبت رکورد فقط روی نسخه آنلاین آروان‌کلاد فعال است.',
        };
    }

    try {
        const res = await fetchWithTimeout(
            `${API_BASE}/api/score`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nickname: cleanName,
                    score,
                    dayReached,
                    runLog,
                    runToken,
                    classId,
                    wolvesDefeated,
                    bossesDefeated,
                    mode,
                    dateKey: activeDate,
                }),
            },
            4500
        );
        const data = await res.json();
        return {
            ok: res.ok,
            verified: Boolean(data.verified),
            cryptoVerified: Boolean(data.cryptoVerified),
            receiptSig: data.receiptSig || null,
            aiTitle: data.aiTitle || null,
            chronicle: data.chronicle || null,
            aiPowered: Boolean(data.aiPowered),
            edgeLatencyMs: data.edgeLatencyMs ?? null,
            mode: 'edge',
            message: data.message,
        };
    } catch {
        return {
            ok: false,
            verified: false,
            mode: 'offline',
            message: 'خطا در اتصال به سرور آروان‌کلاد.',
        };
    }
}

export async function fetchLeaderboard(mode = 'normal', dateKey = null) {
    const activeDate = dateKey || getTodayDateKey();
    if (API_BASE === null) {
        return { items: [], pulse: null, storage: null, source: 'offline' };
    }

    const q = `?mode=${encodeURIComponent(mode)}&date=${encodeURIComponent(activeDate)}`;
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            const res = await fetchWithTimeout(`${API_BASE}/api/leaderboard${q}`, {}, 7500);
            if (res.ok) {
                const data = await res.json();
                return {
                    items: Array.isArray(data.items) ? data.items : [],
                    pulse: data.pulse || null,
                    storage: data.storage || null,
                    source: 'edge',
                };
            }
        } catch {
            if (attempt === 0) {
                await new Promise((r) => setTimeout(r, 450));
            }
        }
    }
    return { items: [], pulse: null, storage: null, source: 'offline' };
}