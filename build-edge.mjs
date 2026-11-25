import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const gameJsPath = path.join(root, 'dist-edge', 'game.iife.js');
const cssPath = path.join(root, 'src', 'style.css');
const outPath = path.join(root, 'dist-edge', 'arvan-worker.js');

if (!fs.existsSync(gameJsPath)) {
    console.error('خطا: فایل dist-edge/game.iife.js پیدا نشد. ابتدا دستور npx vite build --config vite.edge.config.js را اجرا کن.');
    process.exit(1);
}

const gameJs = fs.readFileSync(gameJsPath, 'utf8');
const styleCss = fs.readFileSync(cssPath, 'utf8');

const gameHtml = `<!doctype html>
<html lang="fa" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>چوپان جزیره | Island Shepherd</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;700;900&display=swap" rel="stylesheet" />
    <style>${styleCss}</style>
  </head>
  <body>
    <div id="loading-screen" style="
      position:fixed; inset:0; display:flex; align-items:center; justify-content:center;
      background-color:#0b5d8a;
      background-image:url(&quot;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='132' height='132' viewBox='0 0 132 132'%3E%3Cg fill='none' stroke='%23ffffff' stroke-opacity='0.065' stroke-width='4'%3E%3Ccircle cx='30' cy='30' r='10' stroke-dasharray='5 5'/%3E%3Ccircle cx='98' cy='94' r='11' stroke-dasharray='5 5'/%3E%3Cpath d='M94 24l4 8 8 2-6 6 1 8-7-4-7 4 1-8-6-6 8-2z' fill='%23ffffff' fill-opacity='0.055' stroke='none'/%3E%3C/g%3E%3C/svg%3E&quot;);
      z-index:999; padding:20px;
    ">
      <div style="
        background:#ffffff; border:4px solid #0b0e14; border-radius:24px;
        box-shadow:0 8px 0 #0b0e14; width:min(90vw, 340px); padding:28px 22px;
        display:flex; flex-direction:column; align-items:center; gap:14px; text-align:center;
      ">
        <div style="
          width:68px; height:68px; border-radius:18px; background:#ffe047;
          border:3.5px solid #0b0e14; box-shadow:0 4px 0 #0b0e14;
          display:flex; align-items:center; justify-content:center;
        ">
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none">
            <ellipse cx="12" cy="17.5" rx="9" ry="3.5" fill="#70c15a" stroke="#0b0e14" stroke-width="1.8"/>
            <path d="M12 16V9" stroke="#92400e" stroke-width="2.4" stroke-linecap="round"/>
            <path d="M12 9C9 7 6.5 8 5.5 10M12 9C15 7 17.5 8 18.5 10M12 9C10.5 6 12 4 14.5 5" stroke="#15803d" stroke-width="2.2" stroke-linecap="round"/>
          </svg>
        </div>
        <div style="
          font-size:24px; font-weight:900; color:#ffe047;
          text-shadow:0 3px 0 #0b0e14, 2px 2px 0 #0b0e14, -2px 2px 0 #0b0e14, 2px -2px 0 #0b0e14, -2px -2px 0 #0b0e14;
        ">چوپان جزیره</div>
        <div id="loading-status" style="
          font-size:13.5px; font-weight:900; color:#ffffff;
          background:#0b0e14; padding:8px 18px; border-radius:999px;
        ">در حال اتصال به لبه آروان‌کلاد...</div>
      </div>
    </div>
    <div id="game-container"></div>
    <script>
      (function () {
        var cdns = [
          'https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js',
          'https://cdnjs.cloudflare.com/ajax/libs/phaser/3.80.1/phaser.min.js',
          'https://unpkg.com/phaser@3.80.1/dist/phaser.min.js'
        ];
        function loadScript(src, onLoad, onError) {
          var s = document.createElement('script');
          s.src = src;
          s.onload = onLoad;
          s.onerror = onError;
          document.body.appendChild(s);
        }
        function tryCdn(index) {
          if (index >= cdns.length) {
            var st = document.getElementById('loading-status');
            if (st) st.textContent = 'خطا در بارگذاری موتور بازی؛ لطفاً صفحه را رفرش کنید.';
            return;
          }
          loadScript(cdns[index], function () {
            loadScript('/game.js', function () {
              var loader = document.getElementById('loading-screen');
              if (loader) loader.remove();
            }, function () {});
          }, function () {
            tryCdn(index + 1);
          });
        }
        tryCdn(0);
      })();
    </script>
  </body>
</html>`;

const workerCode = `addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

const CONFIG = {
  AIAAS_BASE_URL: typeof AIAAS_BASE_URL !== 'undefined' && AIAAS_BASE_URL ? AIAAS_BASE_URL : 'https://api.arvancloudai.ir/v1/chat/completions',
  AIAAS_API_KEY: typeof AIAAS_API_KEY !== 'undefined' ? AIAAS_API_KEY : '',
  AIAAS_MODEL: typeof AIAAS_MODEL !== 'undefined' ? AIAAS_MODEL : 'gpt-4o-mini',
  EDGE_SIGN_SECRET: typeof EDGE_SIGN_SECRET !== 'undefined' ? EDGE_SIGN_SECRET : 'shepherd_secure_edge_key_2026_x9k2p',
  ARVAN_DB_URL: typeof ARVAN_DB_URL !== 'undefined' && ARVAN_DB_URL ? ARVAN_DB_URL : 'https://shepherd-data.s3.ir-central1.arvanstorage.ir/leaderboard.json',
};

const GAME_HTML = ${JSON.stringify(gameHtml)};
const GAME_JS = ${JSON.stringify(gameJs)};

let memoryGlobalLeaderboard = [];
const memoryDailyLeaderboards = {};
let memoryWorldPulse = {
  totalRunsVerified: 0,
  totalSheepSaved: 0,
  totalWolvesDefeated: 0,
  totalBossesSlain: 0,
};

let s3CacheData = null;
let s3CacheTime = 0;
const S3_CACHE_TTL_MS = 12000;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS_HEADERS });
}

function getTodayDateKey() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return y + '-' + m + '-' + d;
}

function normalizeDateKey(raw) {
  if (typeof raw === 'string' && /^\\d{4}-\\d{2}-\\d{2}$/.test(raw)) return raw;
  return getTodayDateKey();
}

function stripEmojis(str) {
  return String(str || '')
    .replace(/[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}]/gu, '')
    .replace(/["«»\\n\\r]+/g, ' ')
    .replace(/\\s{2,}/g, ' ')
    .trim();
}

function getCleanS3Url() {
  return (CONFIG.ARVAN_DB_URL || '').split('?')[0].trim();
}

function deduplicateLeaderboard(items) {
  if (!Array.isArray(items)) return [];
  const map = new Map();
  for (const item of items) {
    if (!item || !item.nickname) continue;
    const name = String(item.nickname).trim();
    const existing = map.get(name);
    if (!existing || Number(item.score || 0) > Number(existing.score || 0)) {
      map.set(name, item);
    }
  }
  const clean = Array.from(map.values());
  clean.sort((a, b) => (b.score || 0) - (a.score || 0));
  return clean.slice(0, 20);
}

async function readS3Database(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && s3CacheData && (now - s3CacheTime < S3_CACHE_TTL_MS)) {
    return s3CacheData;
  }
  const url = getCleanS3Url();
  if (!url) return null;
  try {
    const res = await fetch(url + '?t=' + now, {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache, no-store' }
    });
    if (!res.ok) return s3CacheData || null;
    const parsed = await res.json();
    let db = {
      items: [],
      daily: {},
      pulse: { totalRunsVerified: 0, totalSheepSaved: 0, totalWolvesDefeated: 0, totalBossesSlain: 0 }
    };
    if (Array.isArray(parsed)) {
      db.items = deduplicateLeaderboard(parsed);
    } else if (parsed && typeof parsed === 'object') {
      db.items = deduplicateLeaderboard(parsed.items);
      db.daily = {};
      if (parsed.daily && typeof parsed.daily === 'object') {
        for (const [k, v] of Object.entries(parsed.daily)) {
          db.daily[k] = deduplicateLeaderboard(v);
        }
      }
      db.pulse = { ...db.pulse, ...(parsed.pulse || {}) };
    }
    s3CacheData = db;
    s3CacheTime = now;
    return db;
  } catch (e) {
    return s3CacheData || null;
  }
}

async function writeS3Database(dbData) {
  s3CacheData = dbData;
  s3CacheTime = Date.now();
  const url = getCleanS3Url();
  if (!url) return false;
  try {
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'x-amz-acl': 'public-read'
      },
      body: JSON.stringify(dbData)
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

function getKvStore() {
  return typeof LEADERBOARD_KV !== 'undefined' ? LEADERBOARD_KV : null;
}

async function signEdgePayload(payloadStr) {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const enc = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        enc.encode(CONFIG.EDGE_SIGN_SECRET),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(payloadStr));
      return Array.from(new Uint8Array(sigBuf))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .slice(0, 28);
    }
  } catch (e) {}
  let h = 2166136261 >>> 0;
  const combined = CONFIG.EDGE_SIGN_SECRET + ':' + payloadStr;
  for (let i = 0; i < combined.length; i++) {
    h ^= combined.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return 'fnv' + (h >>> 0).toString(16);
}

async function createRunToken(data) {
  const payload = data.runId + '|' + data.startedAt + '|' + data.mode + '|' + data.dateKey + '|' + data.classId;
  const sig = await signEdgePayload(payload);
  return payload + '|' + sig;
}

async function verifyRunToken(token) {
  if (typeof token !== 'string') return { ok: false };
  const parts = token.split('|');
  if (parts.length !== 6) return { ok: false };
  const [runId, startedAtStr, mode, dateKey, classId, sig] = parts;
  const startedAt = Number(startedAtStr);
  if (!runId || !Number.isFinite(startedAt)) return { ok: false };
  const expected = await signEdgePayload(runId + '|' + startedAtStr + '|' + mode + '|' + dateKey + '|' + classId);
  return { ok: sig === expected, runId, startedAt, mode, dateKey, classId, signature: sig };
}

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
    effectSummary: 'ارزش گل‌های سالم +۶۰٪ • گرگ‌ها ۱۰٪ سریع‌تر',
    defaultLore: 'عطر لاله‌های جزیره کل ساحل را پر کرده؛ هر گل سالم گنجی ارزشمند است.',
    mods: { wolfSpeedMul: 1.1, wolfBountyMul: 1.0, goldZoneMul: 1.0, windBonus: 0, flowerValueMul: 1.6, staminaRegenMul: 1.1 },
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
    id: 'golden_wool_fever',
    icon: 'sparkle',
    badgeColor: '#eab308',
    title: 'جشنواره پشم زرین',
    effectSummary: 'تولید پشم گوسفندان ۲ برابر • گرگ‌ها ۱۲٪ سریع‌تر',
    defaultLore: 'پشم گوسفندان زیر نور خورشید مثل طلا می‌درخشد و با هر گام سکه می‌بارد.',
    mods: { wolfSpeedMul: 1.12, wolfBountyMul: 1.0, goldZoneMul: 1.2, windBonus: 0, flowerValueMul: 1.0, staminaRegenMul: 1.0 },
  },
  {
    id: 'bee_fury',
    icon: 'bee',
    badgeColor: '#d97706',
    title: 'خشم کندو',
    effectSummary: 'کندوی زنبور بدون زمان انتظار • گرگ‌ها ۸٪ سریع‌تر',
    defaultLore: 'زنبورهای جزیره امروز بی‌قرارند؛ کافیست اشاره کنی تا گرگ‌ها را فراری دهند.',
    mods: { wolfSpeedMul: 1.08, wolfBountyMul: 1.2, goldZoneMul: 1.0, windBonus: 0, flowerValueMul: 1.0, staminaRegenMul: 1.0 },
  },
  {
    id: 'ancient_fever',
    icon: 'fire',
    badgeColor: '#ea580c',
    title: 'تب طلای باستانی',
    effectSummary: 'شارژ تب طلا ۴۰٪ سریع‌تر • گرگ‌ها پرشتاب‌تر',
    defaultLore: 'انرژی آتشفشانی زیر جزیره فعال شده و سوت چوپان با آتش تب طلا می‌درخشد.',
    mods: { wolfSpeedMul: 1.14, wolfBountyMul: 1.25, goldZoneMul: 1.3, windBonus: 0, flowerValueMul: 1.0, staminaRegenMul: 1.15 },
  },
  {
    id: 'shepherd_shield',
    icon: 'shepherd',
    badgeColor: '#4f46e5',
    title: 'هاله محافظ شبان',
    effectSummary: 'شعاع سوت و سوایپ ۲۵٪ بزرگتر • گرگ آلفا در کمین',
    defaultLore: 'نوای سوت تو در کل جزیره طنین‌انداز است؛ هیچ گوسفندی گم نخواهد شد.',
    mods: { wolfSpeedMul: 1.05, wolfBountyMul: 1.2, goldZoneMul: 1.0, windBonus: 0, flowerValueMul: 1.0, staminaRegenMul: 1.2 },
  },
  {
    id: 'calm_meadow',
    icon: 'calm',
    badgeColor: '#16a34a',
    title: 'دشت آرام',
    effectSummary: 'استرس ازدحام گله نصف • گرگ‌های سایه بیشتر',
    defaultLore: 'آرامش عمیقی بر جزیره حاکم است و گوسفندان یاغی هم نزدیک گله می‌مانند.',
    mods: { wolfSpeedMul: 1.08, wolfBountyMul: 1.1, goldZoneMul: 1.1, windBonus: 0, flowerValueMul: 1.2, staminaRegenMul: 1.0 },
  },
  {
    id: 'ocean_surge',
    icon: 'water',
    badgeColor: '#2563eb',
    title: 'خروش اقیانوس',
    effectSummary: 'پاداش ناک‌اوت آبی ۳ برابر • جزر و مد سریع‌تر',
    defaultLore: 'امواج به لبه‌های صخره می‌کوبند؛ گرگ‌ها را به آب بینداز تا پاداش شاهانه بگیری.',
    mods: { wolfSpeedMul: 1.1, wolfBountyMul: 1.5, goldZoneMul: 1.3, windBonus: 12, flowerValueMul: 1.0, staminaRegenMul: 1.0 },
  },
  {
    id: 'shooting_stars',
    icon: 'star',
    badgeColor: '#9333ea',
    title: 'باران ستاره',
    effectSummary: 'سکه کل مرحله +۳۵٪ • سرعت باد متغیر',
    defaultLore: 'شهاب‌سنگ‌های درخشان بر دریا فرود می‌آیند و ساحل را غرق در سکه می‌کنند.',
    mods: { wolfSpeedMul: 1.06, wolfBountyMul: 1.25, goldZoneMul: 1.35, windBonus: 10, flowerValueMul: 1.25, staminaRegenMul: 1.1 },
  },
  {
    id: 'bounty_tide',
    icon: 'coin',
    badgeColor: '#b45309',
    title: 'گنج ساحلی',
    effectSummary: 'جایزه دفع گرگ +۳۰٪ • گرگ‌ها ۸٪ سریع‌تر و باد ساحلی',
    defaultLore: 'امواج طلایی به ساحل رسیده‌اند؛ دفاع بی‌نقص از گله و باغچه پاداش سنگینی دارد.',
    mods: { wolfSpeedMul: 1.08, wolfBountyMul: 1.3, goldZoneMul: 1.25, windBonus: 8, flowerValueMul: 1.3, staminaRegenMul: 1.0 },
  },
];

function selectEdgeDecree(day, mode, dateKey) {
  if (day <= 2) return null;
  let offset = 0;
  const seedStr = mode === 'daily' ? dateKey : String(new Date().getUTCDate());
  for (let i = 0; i < seedStr.length; i++) offset += seedStr.charCodeAt(i);
  const index = (day * 5 + offset) % EDGE_DECREES.length;
  return EDGE_DECREES[index];
}

async function callArvanAI(systemPrompt, userPrompt, maxTokens = 90) {
  if (!CONFIG.AIAAS_API_KEY || !CONFIG.AIAAS_BASE_URL) return null;
  try {
    const res = await fetch(CONFIG.AIAAS_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + CONFIG.AIAAS_API_KEY,
      },
      body: JSON.stringify({
        model: CONFIG.AIAAS_MODEL,
        max_tokens: maxTokens,
        temperature: 0.9,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const raw = data && data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : '';
    return stripEmojis(raw);
  } catch (e) {
    return null;
  }
}

async function getLeaderboard(mode, dateKey) {
  const isDaily = mode === 'daily';
  const cleanDate = normalizeDateKey(dateKey);

  const s3Data = await readS3Database();
  if (s3Data) {
    memoryGlobalLeaderboard = s3Data.items || [];
    memoryDailyLeaderboards[cleanDate] = s3Data.daily?.[cleanDate] || [];
    if (s3Data.pulse) memoryWorldPulse = { ...memoryWorldPulse, ...s3Data.pulse };
    return {
      items: isDaily ? (s3Data.daily?.[cleanDate] || []) : s3Data.items,
      storage: 'arvan-db',
      pulse: s3Data.pulse
    };
  }

  const kv = getKvStore();
  if (kv) {
    const kvKey = isDaily ? 'daily_scores_v5_' + cleanDate : 'top_scores_v5';
    const raw = await kv.get(kvKey);
    return { items: raw ? JSON.parse(raw) : [], storage: 'arvan-kv', pulse: memoryWorldPulse };
  }

  return {
    items: isDaily ? (memoryDailyLeaderboards[cleanDate] || []) : memoryGlobalLeaderboard,
    storage: 'edge-memory',
    pulse: memoryWorldPulse
  };
}

async function saveScoreRecord(record, mode, dateKey, stats) {
  const cleanDate = normalizeDateKey(dateKey);

  let s3Data = await readS3Database(true);
  if (!s3Data) {
    s3Data = {
      items: memoryGlobalLeaderboard.slice(),
      daily: { ...memoryDailyLeaderboards },
      pulse: { ...memoryWorldPulse }
    };
  }

  let globalList = Array.isArray(s3Data.items) ? s3Data.items.slice() : [];
  const gIdx = globalList.findIndex(x => x.nickname === record.nickname);
  if (gIdx >= 0) {
    if (record.score >= globalList[gIdx].score) {
      globalList[gIdx] = record;
    }
  } else {
    globalList.push(record);
  }
  s3Data.items = deduplicateLeaderboard(globalList);
  memoryGlobalLeaderboard = s3Data.items;

  if (!s3Data.daily) s3Data.daily = {};
  let dailyList = Array.isArray(s3Data.daily[cleanDate]) ? s3Data.daily[cleanDate].slice() : [];
  const dIdx = dailyList.findIndex(x => x.nickname === record.nickname);
  if (dIdx >= 0) {
    if (record.score >= dailyList[dIdx].score) {
      dailyList[dIdx] = record;
    }
  } else {
    dailyList.push(record);
  }
  s3Data.daily[cleanDate] = deduplicateLeaderboard(dailyList);
  memoryDailyLeaderboards[cleanDate] = s3Data.daily[cleanDate];

  if (stats) {
    s3Data.pulse.totalRunsVerified = (s3Data.pulse.totalRunsVerified || 0) + 1;
    s3Data.pulse.totalSheepSaved = (s3Data.pulse.totalSheepSaved || 0) + Math.max(0, stats.sheepSaved || 0);
    s3Data.pulse.totalWolvesDefeated = (s3Data.pulse.totalWolvesDefeated || 0) + Math.max(0, stats.wolvesDefeated || 0);
    s3Data.pulse.totalBossesSlain = (s3Data.pulse.totalBossesSlain || 0) + Math.max(0, stats.bossesSlain || 0);
    memoryWorldPulse = s3Data.pulse;
  }

  await writeS3Database(s3Data);

  const kv = getKvStore();
  if (kv) {
    await kv.put('top_scores_v5', JSON.stringify(s3Data.items));
    await kv.put('daily_scores_v5_' + cleanDate, JSON.stringify(s3Data.daily[cleanDate]));
    await kv.put('world_pulse_v5', JSON.stringify(s3Data.pulse));
  }

  return mode === 'daily' ? s3Data.daily[cleanDate] : s3Data.items;
}

async function getWorldPulse() {
  const s3Data = await readS3Database();
  if (s3Data && s3Data.pulse) {
    memoryWorldPulse = s3Data.pulse;
    return memoryWorldPulse;
  }
  const kv = getKvStore();
  if (kv) {
    const raw = await kv.get('world_pulse_v5');
    if (raw) {
      try { return JSON.parse(raw); } catch (e) {}
    }
  }
  return memoryWorldPulse;
}

async function validateRunOnEdge(body) {
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
    if (entry.day !== i + 1) return { valid: false, reason: 'ترتیب مراحل نامعتبر است.' };
    if (!Number.isInteger(entry.sheepSurvived) || entry.sheepSurvived < 1 || entry.sheepSurvived > 20) {
      return { valid: false, reason: 'تعداد گوسفند نامعتبر است.' };
    }
    if (!Number.isInteger(entry.flowersSurvived) || entry.flowersSurvived < 0 || entry.flowersSurvived > 10) {
      return { valid: false, reason: 'تعداد گل نامعتبر است.' };
    }
    const maxPlausibleGold = entry.sheepSurvived * 75 + entry.flowersSurvived * 30 + 950;
    if (typeof entry.goldEarned !== 'number' || entry.goldEarned < 0 || entry.goldEarned > maxPlausibleGold) {
      return { valid: false, reason: 'درآمد غیرمجاز است.' };
    }
    recomputedScore += entry.goldEarned + entry.day * 50 + entry.sheepSurvived * 12;
    totalSheepSaved += entry.sheepSurvived;
    minRequiredMs += entry.day % 5 === 0 ? 12000 : 28000;
  }

  if (recomputedScore !== score) return { valid: false, reason: 'امتیاز با محاسبه لبه مطابقت ندارد.' };

  const tokenCheck = runToken ? await verifyRunToken(runToken) : { ok: false };
  const effectiveStart = tokenCheck.ok ? tokenCheck.startedAt : (runLog.startedAt || 0);
  const lastDay = runLog.days[runLog.days.length - 1];
  const elapsedMs = (lastDay.finishedAt || Date.now()) - effectiveStart;
  if (elapsedMs < minRequiredMs) {
    return { valid: false, reason: 'زمان تکمیل بازی غیرواقعی است.' };
  }

  const receiptSig = await signEdgePayload(nickname.trim() + '|' + score + '|' + dayReached + '|' + recomputedScore);
  return { valid: true, cryptoVerified: tokenCheck.ok, receiptSig, totalSheepSaved };
}

async function generateShepherdChronicle(info) {
  const fallbackTitle =
    info.dayReached >= 10 ? 'افسانه اقیانوس'
    : info.dayReached >= 5 ? 'رام‌کننده کراکن'
    : info.dayReached >= 3 ? 'نگهبان بی‌باک گله'
    : 'چوپان خوش‌آتیه';
  const fallbackChronicle = info.nickname + ' تا مرحله ' + info.dayReached + ' از گله دفاع کرد و با ' + info.score + ' امتیاز نامش را در تاریخ جزیره ثبت کرد.';

  const aiRaw = await callArvanAI(
    'تو راوی طناز و حماسی بازی چوپان جزیره هستی. دقیقاً در دو خط کوتاه فارسی بدون ایموجی پاسخ بده. خط اول فقط یک لقب ۲ تا ۴ کلمه‌ای. خط دوم فقط یک جمله کوتاه حماسی (حداکثر ۱۶ کلمه).',
    'بازیکن: ' + info.nickname + '، مرحله: ' + info.dayReached + '، امتیاز: ' + info.score + '، گرگ دفع‌شده: ' + (info.wolvesDefeated || 0) + '، باس مغلوب: ' + (info.bossesDefeated || 0),
    95
  );
  if (!aiRaw) return { title: fallbackTitle, chronicle: fallbackChronicle, aiPowered: false };

  const lines = aiRaw.split(/\\n|—|-/).map(s => s.trim()).filter(Boolean);
  return {
    title: (lines[0] || fallbackTitle).slice(0, 32),
    chronicle: (lines[1] || aiRaw || fallbackChronicle).slice(0, 120),
    aiPowered: true,
  };
}

async function handleEdgeDirector(request) {
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

  let bossTaunt = null;
  if (bossType) {
    const bossName = bossType === 'wolf_king' ? 'شاه گرگ‌ها' : 'کراکن اختاپوس';
    const fallbackTaunt = bossType === 'wolf_king'
      ? nickname + '! امشب گله ' + flockSize + ' تایی‌ات مال گله گرگ‌های من است.'
      : nickname + '! امواج اقیانوس جزیره‌ات را می‌بلعد؛ شاخک‌هایم آماده‌اند!';
    const aiTaunt = await callArvanAI(
      'تو باس شرور اما کارتونی بازی چوپان جزیره هستی. فقط یک جمله کوتاه کُری‌خوانی فارسی (حداکثر ۱۵ کلمه) بدون ایموجی بگو.',
      'نام باس: ' + bossName + '، نام چوپان: ' + nickname + '، تعداد گوسفندها: ' + flockSize + '، فصل: ' + seasonName,
      65
    );
    bossTaunt = aiTaunt || fallbackTaunt;
  }

  const decree = selectEdgeDecree(day, mode, dateKey);
  let lore = decree ? decree.defaultLore : null;
  let aiPowered = false;

  if (decree) {
    const aiLore = await callArvanAI(
      'تو گزارشگر خلاق بازی مزرعه‌داری چوپان جزیره هستی. فقط یک جمله کوتاه فارسی (حداکثر ۱۶ کلمه) بدون ایموجی درباره این رویداد مرحله بنویس.',
      'مرحله ' + day + ' در ' + islandName + ' (فصل ' + seasonName + ') با فرمان ' + decree.title + ' (' + decree.effectSummary + '). چوپان: ' + nickname,
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
    decree: decree ? {
      id: decree.id,
      icon: decree.icon,
      badgeColor: decree.badgeColor,
      title: decree.title,
      effectSummary: decree.effectSummary,
      lore,
      mods: decree.mods,
    } : null,
    bossTaunt,
  });
}

async function handleDailyNews(url) {
  const day = Number(url.searchParams.get('day') || 1);
  const flock = Number(url.searchParams.get('flock') || 5);
  const fallbacks = [
    \`خبرنامه مرحله \${day}: امروز \${flock} گوسفند پرانرژی چشمشان به گل‌های باغچه است؛ مراقب باش.\`,
    \`هواشناسی جزیره (مرحله \${day}): نسیم ملایمی می‌وزد اما گرگ‌ها کنار ساحل کمین کرده‌اند.\`,
    \`یادداشت چوپان پیر: پرت کردن گرگ‌ها به داخل آب دو برابر سکه و شارژ تب طلا می‌دهد.\`,
    \`گزارش دیده‌بان (مرحله \${day}): با نزدیک شدن دقایق پایانی آب دریا بالا می‌آید؛ گله را جمع کن.\`,
  ];
  const fallback = fallbacks[(Math.max(1, day) - 1) % fallbacks.length];
  const generated = await callArvanAI(
    'تو گزارشگر بامزه و بدون خشونت بازی کارتونی چوپان جزیره هستی. فقط یک جمله کوتاه فارسی (حداکثر ۱۸ کلمه) با لحن شاد و کاملاً بدون ایموجی بنویس.',
    \`برای شروع مرحله \${day} جزیره که چوپان \${flock} گوسفند دارد، یک تیتر کوتاه خبرنامه مزرعه بنویس.\`,
    70
  );
  return jsonResponse({ news: generated || fallback, source: generated ? 'arvan-aiaas' : 'arvan-edge' });
}

async function handleRequest(request) {
  try {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      return new Response(GAME_HTML, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    if (request.method === 'GET' && url.pathname === '/game.js') {
      return new Response(GAME_JS, {
        status: 200,
        headers: {
          'Content-Type': 'application/javascript; charset=utf-8',
          'Cache-Control': 'public, max-age=300',
        },
      });
    }

    if (request.method === 'POST' && url.pathname === '/api/run/start') {
      const body = await request.json().catch(() => ({}));
      const mode = body.mode === 'daily' ? 'daily' : 'normal';
      const dateKey = normalizeDateKey(body.dateKey);
      const classId = String(body.classId || 'classic').slice(0, 20);
      const startedAt = Date.now();
      const runId = 'r' + startedAt.toString(36) + Math.floor(Math.random() * 9999).toString(36);
      const runToken = await createRunToken({ runId, startedAt, mode, dateKey, classId });
      return jsonResponse({ ok: true, runToken, startedAt, edgeSigned: true });
    }

    if (request.method === 'POST' && url.pathname === '/api/edge-director') {
      return handleEdgeDirector(request);
    }

    if (request.method === 'GET' && url.pathname === '/api/daily-news') {
      return handleDailyNews(url);
    }

    if (request.method === 'GET' && url.pathname === '/api/world-pulse') {
      const pulse = await getWorldPulse();
      const hasAI = Boolean(CONFIG.AIAAS_API_KEY && CONFIG.AIAAS_BASE_URL);
      return jsonResponse({ ok: true, pulse, hasAI, storage: 'arvan-db', source: 'arvan-edge' });
    }

    if (request.method === 'GET' && url.pathname === '/api/leaderboard') {
      const mode = url.searchParams.get('mode') === 'daily' ? 'daily' : 'normal';
      const dateKey = normalizeDateKey(url.searchParams.get('date'));
      const res = await getLeaderboard(mode, dateKey);
      const pulse = await getWorldPulse();
      return jsonResponse({ items: res.items, storage: res.storage, mode, dateKey, pulse, source: 'arvan-edge' });
    }

    if (request.method === 'POST' && url.pathname === '/api/score') {
      const t0 = Date.now();
      const body = await request.json();
      const mode = body && body.mode === 'daily' ? 'daily' : 'normal';
      const dateKey = normalizeDateKey(body && body.dateKey);
      const check = await validateRunOnEdge(body);
      if (!check.valid) {
        return jsonResponse({ ok: false, verified: false, message: check.reason }, 400);
      }

      const chronicleData = await generateShepherdChronicle({
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

      await saveScoreRecord(record, mode, dateKey, {
        sheepSaved: check.totalSheepSaved,
        wolvesDefeated: Number(body.wolvesDefeated || 0),
        bossesSlain: Number(body.bossesDefeated || 0),
      });

      const pulse = await getWorldPulse();

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
        message: 'امتیاز با امضای لبه تایید و در دیتابیس ثبت شد.',
      });
    }

    return jsonResponse({ ok: false, message: 'Not Found' }, 404);
  } catch (err) {
    return jsonResponse({ ok: false, message: 'خطای داخلی پردازش لبه' }, 500);
  }
}
`;

fs.writeFileSync(outPath, workerCode, 'utf8');
const sizeKb = (Buffer.byteLength(workerCode, 'utf8') / 1024).toFixed(1);
console.log(`فایل نهایی ساخته شد: dist-edge/arvan-worker.js (${sizeKb} KB)`);