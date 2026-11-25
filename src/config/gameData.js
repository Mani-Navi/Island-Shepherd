export const WORLD = {
    VIEW_SIZE: 700,
    SAFE_RADIUS: 228,
    BEACH_RADIUS: 282,
    SHALLOW_RADIUS: 326,
};

export const WHISTLE = {
    BASE_RADIUS: 155,
    BASE_FORCE: 305,
    SWIPE_RADIUS: 80,
    SWIPE_FORCE: 235,
    COOLDOWN_MS: 175,
};

export const STAMINA = {
    MAX: 100,
    WHISTLE_COST: 9.5,
    SWIPE_STEP_COST: 3.2,
    HOLD_DRAIN_PER_SEC: 44,
    MAX_HOLD_SEC: 0.95,
    MAX_TAP_HOLD_SEC: 0.36,
    REGEN_PER_SEC: 46,
    EXHAUST_PENALTY_SEC: 0.95,
};

export const PANIC = {
    CLUSTER_RADIUS: 44,
    CLUSTER_THRESHOLD: 4,
    CLUSTER_STRESS_PER_SEC: 28,
    DECAY_PER_SEC: 28,
    LIMIT: 100,
    SCATTER_SPEED: 124,
};

export const HAY_CONFIG = {
    PRICE: 70,
    DURATION_SEC: 6.0,
    ATTRACT_RADIUS: 235,
    MAX_STOCK: 4,
};

export const REPELLENT_CONFIG = {
    PRICE: 60,
};

export const REROLL_BASE_PRICE = 30;

export const SLOT_CONFIG = {
    BASE_SLOTS: 4,
    AFTER_BOSS_1_SLOTS: 5,
    AFTER_BOSS_2_SLOTS: 6,
    SHOP_UNLOCK_AFTER_DAY: 2,
};

export const CARD_BASE_PRICES = {
    common: 85,
    rare: 125,
    epic: 170,
};

export const BOSS_REWARDS = {
    kraken: {
        bossType: 'kraken',
        tierUnlocked: 2,
        newMaxSlots: 5,
        perkId: 'kraken_heart',
        perkTitle: 'قلب اقیانوس',
        perkDesc: '+۱۵٪ سرعت شارژ تب طلا در تمام مراحل بعدی',
        escalationTitle: 'ورود به سطح چالش ۲ (Tier 2)',
        escalationDesc: 'اسلات ۵ کارت باز شد! از این پس مراحل عادی سریع‌تر می‌شوند و تپه‌های لغزنده، گرگ سایه و عقاب وارد میدان می‌شوند.',
        bounty: 60,
    },
    wolf_king: {
        bossType: 'wolf_king',
        tierUnlocked: 3,
        newMaxSlots: 6,
        perkId: 'wolf_crown',
        perkTitle: 'تاج شبان',
        perkDesc: 'شروع هر مرحله با ۱ بسته علوفه رایگان + ۲ برابر اعتبار در رده‌بندی',
        escalationTitle: 'ورود به سطح استاد جزیره (Tier 3)',
        escalationDesc: 'اسلات ۶ کارت باز شد! نقشه‌های سخت‌تر، گردباد، بشقاب‌پرنده و حملات شبانه فعال شدند.',
        bounty: 95,
    },
};

let activePrng = null;

function hashStringToSeed(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

function createMulberry32(seed) {
    let a = seed >>> 0;
    return function () {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function setRngSeed(seedStr) {
    activePrng = seedStr ? createMulberry32(hashStringToSeed(String(seedStr))) : null;
}

export function rand() {
    return activePrng ? activePrng() : Math.random();
}

export function getTodayDateKey() {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, '0');
    const d = String(now.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export const SEASONS = {
    spring: {
        id: 'spring',
        name: 'بهار',
        badgeColor: '#16a34a',
        oceanDeep: 0x1687c9,
        oceanShallow: 0x38bdf8,
        oceanFoam: 0xe0f2fe,
        beachSand: 0xf6d88b,
        beachInner: 0xe6be67,
        grassMain: 0x62b851,
        grassLight: 0x7fd167,
        tuftTint: 0xffffff,
        bushTint: 0xffffff,
        particleType: 'petals',
        particleColors: [0xfbcfe8, 0xf9a8d4, 0xffffff],
    },
    summer: {
        id: 'summer',
        name: 'تابستان',
        badgeColor: '#d97706',
        oceanDeep: 0x0284c7,
        oceanShallow: 0x22d3ee,
        oceanFoam: 0xecfeff,
        beachSand: 0xfde08d,
        beachInner: 0xf5c451,
        grassMain: 0x7bc740,
        grassLight: 0xa1e059,
        tuftTint: 0xd9f99d,
        bushTint: 0xecfccb,
        particleType: 'sunmotes',
        particleColors: [0xfef08a, 0xfde047, 0xffffff],
    },
    autumn: {
        id: 'autumn',
        name: 'پاییز',
        badgeColor: '#c2410c',
        oceanDeep: 0x1b6688,
        oceanShallow: 0x4b99b8,
        oceanFoam: 0xfef3c7,
        beachSand: 0xe9c48c,
        beachInner: 0xd4a362,
        grassMain: 0xcf843a,
        grassLight: 0xe3a355,
        tuftTint: 0xfdba74,
        bushTint: 0xfb923c,
        particleType: 'leaves',
        particleColors: [0xf97316, 0xef4444, 0xfacc15],
    },
    winter: {
        id: 'winter',
        name: 'زمستان',
        badgeColor: '#0369a1',
        oceanDeep: 0x134e7e,
        oceanShallow: 0x60a5fa,
        oceanFoam: 0xf8fafc,
        beachSand: 0xc2def2,
        beachInner: 0xa2cae6,
        grassMain: 0xe4f1fa,
        grassLight: 0xffffff,
        tuftTint: 0xbae6fd,
        bushTint: 0xdbeafe,
        particleType: 'snow',
        particleColors: [0xffffff, 0xe0f2fe, 0xbae6fd],
    },
};

export function getSeasonForDay(day) {
    const order = ['spring', 'summer', 'autumn', 'winter'];
    return SEASONS[order[(Math.max(1, day) - 1) % order.length]];
}

export const DISCOVERY_GUIDES = {
    wolf_intro: {
        id: 'wolf_intro',
        tag: 'چالش پایه',
        title: 'ورود گرگ شکارچی',
        icon: 'wolf',
        accent: '#dc2626',
        desc: 'با صدای زوزه، گرگ از لبه جزیره وارد می‌شود. با دو بار سوت یا سوایپ فراری‌اش بده.',
        tip: 'اگر گرگ را به داخل آب پرت کنی فوراً ناک‌اوت می‌شود و ۲ برابر سکه می‌گیری!',
    },
    terrain_mud: {
        id: 'terrain_mud',
        tag: 'عارضه زمین',
        title: 'چاله گل‌ولای و خارزار',
        icon: 'island',
        accent: '#92400e',
        desc: 'این بخش از زمین سرعت حرکت گوسفندها و گرگ‌ها را ۴۵٪ کاهش می‌دهد.',
        tip: 'سود و هزینه: گرگ را به گل‌ولای بکشان تا راحت دفعش کنی، ولی نگذار گوسفندهایت آنجا گیر بیفتند!',
    },
    beehive_intro: {
        id: 'beehive_intro',
        tag: 'ابزار دوگانه',
        title: 'کندوی زنبور وحشی',
        icon: 'bee',
        accent: '#d97706',
        desc: 'با سوت زدن روی کندو، زنبورها گرگ‌های اطراف را فراری می‌دهند.',
        tip: 'هزینه: گوسفندهایی که خیلی به کندو نزدیک باشند از زنبورها می‌ترسند و سریع پراکنده می‌شوند.',
    },
    boss_kraken: {
        id: 'boss_kraken',
        tag: 'باس‌فایت مرحله ۵',
        title: 'اختاپوس دریایی (کراکن)',
        icon: 'kraken',
        accent: '#7e22ce',
        desc: 'شاخک‌های زره‌دار از زمین بیرون می‌آیند و در فازهای بعدی مکش اقیانوس گله را سمت آب می‌کشد.',
        tip: 'با شکست کراکن اسلات پنجم کارت و قدرت «قلب اقیانوس» باز می‌شود و بازی وارد سطح چالش ۲ می‌شود!',
    },
    terrain_slope: {
        id: 'terrain_slope',
        tag: 'عارضه زمین (سطح ۲)',
        title: 'تپه شیب‌دار لغزنده',
        icon: 'wind',
        accent: '#0284c7',
        desc: 'هر موجودی که وارد شیب شود در جهت فلش‌ها سر می‌خورد.',
        tip: 'سود و هزینه: مراقب لغزش گله سمت ساحل باش، اما می‌توانی گرگ‌ها را روی شیب مستقیم به آب سر بدهی!',
    },
    golden_zone_intro: {
        id: 'golden_zone_intro',
        tag: 'ریسک و پاداش',
        title: 'چراگاه طلایی',
        icon: 'sparkle',
        accent: '#ca8a04',
        desc: 'دایره‌ای طلایی نزدیک ساحل ظاهر می‌شود و تا وقتی گله داخل آن باشد سکه و تب طلا می‌دهد.',
        tip: 'چون لب آب است، حواست باشد طمع سکه باعث سقوط گوسفندها به دریا نشود.',
    },
    wolf_swift: {
        id: 'wolf_swift',
        tag: 'دشمن سطح ۲',
        title: 'گرگ سایه',
        icon: 'wolf',
        accent: '#7c3aed',
        desc: 'گرگ بنفش با سرعت بالا که با یک ضربه سوت یا سوایپ فوراً فرار می‌کند.',
        tip: 'به محض شنیدن زوزه تیز و دیدن علامت بنفش، آماده واکنش سریع باش.',
    },
    chaos_eagle: {
        id: 'chaos_eagle',
        tag: 'تهدید هوایی',
        title: 'عقاب شکارچی',
        icon: 'eagle',
        accent: '#92400e',
        desc: 'با صدای جیغ عقاب، سایه‌ای قرمز روی یک گوسفند قفل می‌شود و چند لحظه بعد شیرجه می‌زند.',
        tip: 'یا گوسفند را از دایره دور کن، یا مستقیم روی سایه عقاب سوت بزن تا با پاداش سکه فرار کند!',
    },
    terrain_pond: {
        id: 'terrain_pond',
        tag: 'عارضه زمین (سطح ۲)',
        title: 'آبگیر داخلی جزیره',
        icon: 'water',
        accent: '#0ea5e9',
        desc: 'یک چاله آب عمیق در دل جزیره قرار گرفته است.',
        tip: 'سود و هزینه: گوسفند داخل آبگیر بیفتد از دست می‌رود، ولی پرتاب گرگ به داخلش فوراً ناک‌اوت ۲ برابر سکه می‌دهد!',
    },
    wolf_alpha: {
        id: 'wolf_alpha',
        tag: 'دشمن سنگین',
        title: 'گرگ آلفا',
        icon: 'wolfAlpha',
        accent: '#b91c1c',
        desc: 'گرگ عظیم با ۴ واحد جان که در برابر عقب‌راندن مقاوم‌تر است.',
        tip: 'سریع‌ترین راه حذف آلفا، هل دادن آن به آبگیر یا دریا از طریق تپه شیب‌دار است.',
    },
    chaos_lightning: {
        id: 'chaos_lightning',
        tag: 'حادثه آب‌وهوایی',
        title: 'طوفان رعد و برق',
        icon: 'lightning',
        accent: '#0284c7',
        desc: 'دایره‌های هشدار روی زمین ظاهر می‌شوند و پس از چند لحظه صاعقه فرود می‌آید.',
        tip: 'سود و هزینه: گله را دور کن، ولی اگر گرگی داخل دایره صاعقه باشد فوراً دفع می‌شود و جایزه می‌گیری!',
    },
    boss_wolf_king: {
        id: 'boss_wolf_king',
        tag: 'باس‌فایت مرحله ۱۰',
        title: 'شاه گرگ‌ها',
        icon: 'crown',
        accent: '#b91c1c',
        desc: 'فرمانده گرگ‌ها با تاج طلایی! یورش‌های پیاپی و موج زوزه می‌زند و گرگ‌های دیگر را احضار می‌کند.',
        tip: 'با شکست شاه گرگ‌ها، اسلات ۶ کارت و «تاج شبان» باز می‌شود و وارد سطح استاد جزیره (Tier 3) می‌شوی!',
    },
    chaos_tornado: {
        id: 'chaos_tornado',
        tag: 'حادثه سطح ۳',
        title: 'گردباد سرگردان',
        icon: 'wind',
        accent: '#0d9488',
        desc: 'گردباد روی جزیره می‌چرخد و گوسفندهای نزدیک خود را به اطراف پرتاب می‌کند.',
        tip: 'گوسفندهایی که در مسیر گردباد هستند را قبل از رسیدن به آبگیر یا دریا برگردان.',
    },
    chaos_ufo: {
        id: 'chaos_ufo',
        tag: 'حادثه سطح ۳',
        title: 'پرتو بشقاب‌پرنده',
        icon: 'ufo',
        accent: '#16a34a',
        desc: 'پرتوی سبز به دنبال گله حرکت می‌کند و اگر گوسفندی زیر آن بماند، ربوده می‌شود.',
        tip: 'دو بار روی دایره سبز سوت بزن تا بشقاب‌پرنده نابود شود و جایزه سکه بگیری!',
    },
};

export const SHEPHERD_CLASSES = {
    classic: {
        id: 'classic',
        name: 'چوپان کلاسیک',
        icon: 'shepherd',
        desc: 'متعادل و همه‌فن‌حریف؛ بدون ضعف خاص، مناسب یادگیری و سبک‌های ترکیبی.',
        unlockText: 'آزاد از ابتدا',
        whistleRadiusMul: 1.0,
        swipeRadiusMul: 1.0,
        staminaRegenMul: 1.0,
        goldMul: 1.0,
        wolfSpeedMul: 1.0,
        startDogLevel: 0,
        extraGoldenSheep: 0,
        quotaAdd: 0,
    },
    storm: {
        id: 'storm',
        name: 'چوپان طوفان',
        icon: 'wind',
        desc: 'سود: سوایپ +۳۰٪ عریض‌تر و نفس +۲۵٪ سریع‌تر | هزینه: شعاع سوت -۲۰٪.',
        unlockText: 'رسیدن به مرحله ۵',
        whistleRadiusMul: 0.8,
        swipeRadiusMul: 1.3,
        staminaRegenMul: 1.25,
        goldMul: 1.0,
        wolfSpeedMul: 1.0,
        startDogLevel: 0,
        extraGoldenSheep: 0,
        quotaAdd: 0,
    },
    houndmaster: {
        id: 'houndmaster',
        name: 'ارباب سگ‌ها',
        icon: 'dog',
        desc: 'سود: شروع با ۱ سگ گله رایگان | هزینه: سهمیه زنده ماندن ۱ عدد سخت‌تر.',
        unlockText: 'فراری دادن ۲۵ گرگ',
        whistleRadiusMul: 1.0,
        swipeRadiusMul: 1.0,
        staminaRegenMul: 1.0,
        goldMul: 1.0,
        wolfSpeedMul: 1.0,
        startDogLevel: 1,
        extraGoldenSheep: 0,
        quotaAdd: 1,
    },
    gambler: {
        id: 'gambler',
        name: 'چوپان قمارباز',
        icon: 'dice',
        desc: 'سود: درآمد سکه +۲۰٪ و ۱ گوسفند طلایی اضافه | هزینه: سرعت گرگ‌ها +۲۰٪.',
        unlockText: '۵ ناک‌اوت آبی یا رسیدن به مرحله ۷',
        whistleRadiusMul: 1.0,
        swipeRadiusMul: 1.0,
        staminaRegenMul: 1.0,
        goldMul: 1.2,
        wolfSpeedMul: 1.2,
        startDogLevel: 0,
        extraGoldenSheep: 1,
        quotaAdd: 0,
    },
};

export const EVOLUTIONS = [
    {
        id: 'arctic_storm',
        title: 'طوفان قطبی',
        icon: 'frost',
        requires: ['shock_whistle', 'frost_swipe'],
        desc: 'هر سوت موج یخی-برقی می‌سازد که گرگ‌ها را خشک و شدیداً پرتاب می‌کند.',
        color: '#0284c7',
    },
    {
        id: 'fire_ram',
        title: 'قوچ آتشین',
        icon: 'fire',
        requires: ['battle_ram', 'fever_master'],
        desc: 'در حالت تب طلا، قوچ‌ها شعله‌ور می‌شوند و سراسر جزیره گرگ‌ها را شکار می‌کنند.',
        color: '#ea580c',
    },
    {
        id: 'flower_mine',
        title: 'تله گل انفجاری',
        icon: 'explosion',
        requires: ['thorny_bloom', 'calm_aura'],
        desc: 'هر گرگی که از نزدیکی گل‌ها عبور کند با انفجار پرتاب و فراری می‌شود.',
        color: '#db2777',
    },
];

export const MINI_MISSIONS = [
    {
        id: 'combo_3',
        icon: 'fire',
        title: 'کمبوی x3 ثبت کن',
        target: 3,
        rewardGold: 18,
        freeReroll: 1,
        minDay: 3,
    },
    {
        id: 'collect_wool_2',
        icon: 'sparkle',
        title: '۲ گوله پشم طلایی جمع کن',
        target: 2,
        rewardGold: 16,
        freeReroll: 0,
        minDay: 3,
    },
    {
        id: 'water_ko_1',
        icon: 'water',
        title: '۱ گرگ را در آب یا آبگیر ناک‌اوت کن',
        target: 1,
        rewardGold: 22,
        freeReroll: 1,
        minDay: 3,
    },
    {
        id: 'beehive_sting',
        icon: 'bee',
        title: 'با کندوی زنبور یک گرگ را فراری بده',
        target: 1,
        rewardGold: 24,
        freeReroll: 1,
        minDay: 3,
    },
    {
        id: 'stamina_pro',
        icon: 'lungs',
        title: 'پایان مرحله بدون اینکه نفست بگیرد',
        target: 1,
        rewardGold: 20,
        freeReroll: 1,
        minDay: 3,
    },
    {
        id: 'no_flower_eaten',
        icon: 'flower',
        title: 'محافظت کامل: هیچ گلی خورده نشود',
        target: 1,
        rewardGold: 24,
        freeReroll: 1,
        minDay: 3,
    },
    {
        id: 'no_hay',
        icon: 'hay',
        title: 'بدون استفاده از بسته علوفه برنده شو',
        target: 1,
        rewardGold: 18,
        freeReroll: 1,
        minDay: 3,
    },
    {
        id: 'fever_rush',
        icon: 'fire',
        title: 'حالت سوپر چوپان (تب طلا) را فعال کن',
        target: 1,
        rewardGold: 22,
        freeReroll: 1,
        minDay: 4,
    },
    {
        id: 'golden_zone_10',
        icon: 'coin',
        title: '۱۰ سکه از چراگاه طلایی بگیر',
        target: 10,
        rewardGold: 25,
        freeReroll: 1,
        minDay: 6,
    },
    {
        id: 'dog_guard',
        icon: 'dog',
        title: 'سگ گله گرگی را فراری دهد',
        target: 1,
        rewardGold: 22,
        freeReroll: 1,
        minDay: 4,
    },
    {
        id: 'ram_slam',
        icon: 'ram',
        title: 'با شاخ قوچ به گرگ ضربه بزن',
        target: 1,
        rewardGold: 24,
        freeReroll: 1,
        minDay: 4,
    },
    {
        id: 'combo_5',
        icon: 'fire',
        title: 'کمبوی آتشین x5 ثبت کن',
        target: 5,
        rewardGold: 30,
        freeReroll: 1,
        minDay: 6,
    },
    {
        id: 'water_ko_2',
        icon: 'water',
        title: '۲ گرگ را ناک‌اوت آبی کن',
        target: 2,
        rewardGold: 32,
        freeReroll: 1,
        minDay: 7,
    },
];

export const BOSS_CONFIG = {
    kraken: {
        id: 'kraken',
        icon: 'kraken',
        name: 'اختاپوس دریایی (کراکن)',
        baseHp: 18,
        tentacleInterval: 2.35,
        slamDelay: 1.78,
        bounty: BOSS_REWARDS.kraken.bounty,
    },
    wolf_king: {
        id: 'wolf_king',
        icon: 'crown',
        name: 'شاه گرگ‌ها',
        baseHp: 26,
        summonInterval: 4.3,
        dashInterval: 3.0,
        bounty: BOSS_REWARDS.wolf_king.bounty,
    },
};

export const ISLAND_SHAPES = {
    classic: {
        id: 'classic',
        name: 'جزیره آفتابی',
        desc: 'دشت باز جزیره با موانع طبیعی؛ بهترین زمین برای تاکتیک‌های دقیق.',
        badgeColor: '#0284c7',
    },
    crescent: {
        id: 'crescent',
        name: 'خلیج هلالی',
        desc: 'خلیج شرقی پرخطر؛ گله را سمت غرب نگه دار و گرگ‌ها را به خلیج پرت کن.',
        badgeColor: '#2563eb',
    },
    star: {
        id: 'star',
        name: 'جزیره ستاره‌ای',
        desc: 'چهار شبه‌جزیره تیز؛ نگذار گوسفندها به نوک شاخه‌ها بروند.',
        badgeColor: '#d97706',
    },
    ring: {
        id: 'ring',
        name: 'حفره آتشفشانی',
        desc: 'دریاچه‌ای عمیق وسط جزیره؛ گله را روی حلقه امن بچرخان.',
        badgeColor: '#dc2626',
    },
    ridge: {
        id: 'ridge',
        name: 'تنگه باریک',
        desc: 'جزیره کشیده و باریک؛ نیازمند سوایپ‌های کوتاه و کنترل نفس.',
        badgeColor: '#7c3aed',
    },
    twin: {
        id: 'twin',
        name: 'جزایر دوقلو و پل',
        desc: 'دو جزیره متصل با پل باریک؛ چالش حرفه‌ای برای سطح استاد!',
        badgeColor: '#0d9488',
    },
};

export const SHEEP_TYPES = {
    normal: {
        key: 'sheep_normal',
        name: 'معمولی',
        baseIncome: 4,
        knockbackMul: 1.0,
        woolInterval: 24,
        woolValue: 2,
        wanderSpeedMul: 1.0,
    },
    rebel: {
        key: 'sheep_rebel',
        name: 'یاغی کنجکاو',
        baseIncome: 6,
        knockbackMul: 0.96,
        woolInterval: 22,
        woolValue: 3,
        wanderSpeedMul: 1.18,
    },
    glutton: {
        key: 'sheep_glutton',
        name: 'شکمو',
        baseIncome: 5,
        knockbackMul: 0.92,
        woolInterval: 23,
        woolValue: 2,
        wanderSpeedMul: 1.06,
    },
    ram: {
        key: 'sheep_ram',
        name: 'قوچ جنگجو',
        baseIncome: 0, // هزینه تعادلی: درآمد سکه ندارد و سنگین‌تر حرکت می‌کند
        knockbackMul: 0.68,
        woolInterval: 34,
        woolValue: 1,
        wanderSpeedMul: 0.88,
    },
    golden: {
        key: 'sheep_golden',
        name: 'طلایی',
        baseIncome: 10,
        knockbackMul: 1.0,
        woolInterval: 19,
        woolValue: 4,
        wanderSpeedMul: 1.05,
    },
};

export const SHEEP_CONFIG = {
    RADIUS: 15,
    SCALE: 0.74,
    WANDER_SPEED: 45,
    FLEE_SPEED: 220,
    ZOOMIES_SPEED: 210,
    SEPARATION_DIST: 38,
    COHESION_DIST: 95,
    FLOWER_SENSE_DIST: 105,
    FLOWER_EAT_DIST: 24,
    FRICTION: 2.9,
};

export const FLOWER_TYPES = {
    tulip: { key: 'flower_tulip', name: 'لاله', value: 4, eatTime: 2.75, effect: null },
    spicy: { key: 'flower_spicy', name: 'گل فلفلی', value: 6, eatTime: 2.45, effect: 'zoomies' },
    lavender: { key: 'flower_lavender', name: 'اسطوخودوس', value: 7, eatTime: 2.85, effect: 'sleep' },
};

export const WOLF_TYPES = {
    normal: {
        key: 'wolf_normal',
        name: 'گرگ شکارچی',
        scale: 0.86,
        huntSpeed: 74,
        carrySpeed: 58,
        fleeSpeed: 205,
        hitsToScare: 2,
        knockbackResistance: 1.0,
        bounty: 5,
        warningTime: 1.8,
    },
    swift: {
        key: 'wolf_swift',
        name: 'گرگ سایه',
        scale: 0.74,
        huntSpeed: 112,
        carrySpeed: 80,
        fleeSpeed: 245,
        hitsToScare: 1,
        knockbackResistance: 1.12,
        bounty: 7,
        warningTime: 1.3,
    },
    alpha: {
        key: 'wolf_alpha',
        name: 'گرگ آلفا',
        scale: 1.14,
        huntSpeed: 72,
        carrySpeed: 58,
        fleeSpeed: 185,
        hitsToScare: 4,
        knockbackResistance: 0.5,
        bounty: 12,
        warningTime: 1.85,
    },
};

export const WOLF_CONFIG = {
    CATCH_DIST: 25,
};

export const DOG_CONFIG = {
    PATROL_SPEED: 88,
    HERD_SPEED: 128,
    CHASE_WOLF_SPEED: 134,
    HERD_FORCE: 210,
    VISION_RADIUS: 178,
    WOLF_BARK_COOLDOWN: 3.7,
    REST_DURATION: 1.5,
    UPKEEP_PER_DOG: 12, // هزینه نگهداری هر سگ در پایان مرحله
    STARTLE_RADIUS: 78, // شعاع ترساندن گوسفندهای خیلی نزدیک هنگام پارس
};

/**
 * ۱۲ کارت دوجنبه (همه کارت‌ها هم سود واقعی دارند هم هزینه واقعی — بدون گزینه بی‌نقص)
 */
export const CARDS = [
    {
        id: 'lung_capacity',
        icon: 'lungs',
        title: 'نفس آهنی',
        benefit: '+۳۲٪ بازگشت سریع‌تر نفس و سوایپ طولانی‌تر',
        cost: '-۱۰٪ قدرت پرتاب هر سوت',
        desc: 'سود: +۳۲٪ بازگشت نفس | هزینه: -۱۰٪ قدرت پرتاب سوت.',
        rarity: 'common',
        maxLevel: 3,
    },
    {
        id: 'whistle_power',
        icon: 'whistle',
        title: 'ابرسوت چوپان',
        benefit: '+۱۸٪ شعاع و قدرت موج سوت و سوایپ',
        cost: '+۲۰٪ مصرف نفس در هر سوت',
        desc: 'سود: +۱۸٪ شعاع و قدرت سوت | هزینه: +۲۰٪ مصرف نفس سوت.',
        rarity: 'common',
        maxLevel: 3,
    },
    {
        id: 'battle_ram',
        icon: 'ram',
        title: 'قوچ جنگجو',
        benefit: '+۱ قوچ شاخ‌دار دفع‌کننده گرگ (تکامل با تب طلا)',
        cost: 'درآمد پایه ۰ سکه و ۳۰٪ سنگین‌تر در برابر سوت',
        desc: 'سود: +۱ قوچ دفع‌کننده گرگ | هزینه: درآمد ۰ و جابه‌جایی سنگین‌تر.',
        rarity: 'common',
        maxLevel: 2,
    },
    {
        id: 'calm_aura',
        icon: 'calm',
        title: 'هاله آرامش',
        benefit: '-۳۰٪ استرس ازدحام و یاغی‌های آرام‌تر (تکامل با گل انفجاری)',
        cost: '-۱۲٪ سرعت فرار گله هنگام سوت',
        desc: 'سود: گله بسیار آرام‌تر | هزینه: -۱۲٪ سرعت فرار گوسفندها.',
        rarity: 'common',
        maxLevel: 3,
    },
    {
        id: 'shock_whistle',
        icon: 'lightning',
        title: 'سوت شوک‌دار',
        benefit: 'گرگ‌ها را ۰.۹ ثانیه خشک می‌کند (تکامل با باد یخی)',
        cost: '+۳۵٪ زمان انتظار (Cooldown) بین سوت‌ها',
        desc: 'سود: شوک و توقف گرگ | هزینه: +۳۵٪ تاخیر بین سوت‌ها.',
        rarity: 'rare',
        maxLevel: 3,
    },
    {
        id: 'frost_swipe',
        icon: 'frost',
        title: 'باد یخی',
        benefit: 'سرعت گرگ‌ها و فلفلی‌ها ۵۰٪ کمتر (تکامل با سوت شوک‌دار)',
        cost: 'گوسفندهای داخل باد یخی هم ۲۵٪ کند می‌شوند',
        desc: 'سود: گرگ ۵۰٪ کندتر | هزینه: گوسفندهای مسیر باد هم کند می‌شوند.',
        rarity: 'rare',
        maxLevel: 3,
    },
    {
        id: 'guard_dog',
        icon: 'dog',
        title: 'سگ شکارچی',
        benefit: 'سگ محافظ خودکار (در سطح ۳ دو سگ)',
        cost: '۱۲ سکه هزینه نگهداری هر سگ + پارسش گوسفندهای خیلی نزدیک را می‌ترساند',
        desc: 'سود: دفاع خودکار از گله | هزینه: ۱۲ سکه نگهداری و ترس گله خیلی نزدیک.',
        rarity: 'rare',
        maxLevel: 3,
    },
    {
        id: 'magnet_save',
        icon: 'magnet',
        title: 'نجات هوشمند',
        benefit: 'نزدیک آب، موج سوت گله را دقیق به مرکز امن می‌کشد',
        cost: '-۱۲٪ شعاع سوت (نیازمند نشانه دقیق‌تر)',
        desc: 'سود: بازگشت دقیق از لبه آب | هزینه: -۱۲٪ شعاع سوت.',
        rarity: 'rare',
        maxLevel: 3,
    },
    {
        id: 'golden_touch',
        icon: 'goldenSheep',
        title: 'لمس طلایی',
        benefit: '+۱ گوسفند طلایی و +۲۰٪ درآمد سکه',
        cost: 'گرگ‌ها +۱۵٪ سریع‌تر و حریص‌تر به سمت گوسفند طلایی',
        desc: 'سود: گوسفند طلایی و +۲۰٪ سکه | هزینه: گرگ‌ها ۱۵٪ سریع‌تر.',
        rarity: 'rare',
        maxLevel: 2,
    },
    {
        id: 'life_buoy',
        icon: 'buoy',
        title: 'حلقه نجات',
        benefit: 'نجات خودکار گوسفند افتاده در آب (۱ بار به ازای هر سطح)',
        cost: 'هر بار نجات، ۲۵٪ پاداش وسط مرحله و ۲۵ واحد نفس کم می‌کند',
        desc: 'سود: نجات از آب | هزینه: کسر ۲۵٪ پاداش و ۲۵ نفس هنگام نجات.',
        rarity: 'epic',
        maxLevel: 2,
    },
    {
        id: 'fever_master',
        icon: 'fire',
        title: 'استاد تب طلا',
        benefit: '+۳۰٪ شارژ سریع‌تر تب طلا و +۱.۵ ثانیه دوام (تکامل با قوچ)',
        cost: 'خارج از تب طلا، +۱۵٪ مصرف نفس بیشتر',
        desc: 'سود: تب طلای سریع و طولانی | هزینه: +۱۵٪ مصرف نفس عادی.',
        rarity: 'epic',
        maxLevel: 3,
    },
    {
        id: 'thorny_bloom',
        icon: 'explosion',
        title: 'گل‌های انفجاری',
        benefit: 'خورده شدن گل موج انفجاری ضدگرگ می‌سازد (تکامل با هاله آرامش)',
        cost: 'گل‌ها ۲۵٪ سریع‌تر خورده می‌شوند و ارزش هر گل -۲ سکه',
        desc: 'سود: انفجار ضدگرگ | هزینه: گل‌ها سریع‌تر خورده و کم‌ارزش‌ترند.',
        rarity: 'epic',
        maxLevel: 2,
    },
];

export const COLORS = {
    OCEAN_DEEP: 0x1687c9,
    OCEAN_SHALLOW: 0x38bdf8,
    OCEAN_FOAM: 0xe0f2fe,
    BEACH_SAND: 0xf6d88b,
    BEACH_INNER: 0xe6be67,
    GRASS_MAIN: 0x62b851,
    GRASS_LIGHT: 0x7fd167,
    GRASS_DARK: 0x459238,
    WHISTLE_RING: 0xffffff,
};

/**
 * انتخاب نقشه منطقی:
 * مراحل ۱، ۲ و ۳ روی جزیره باز (classic) با عوارض داخلی متنوع تا شوک ناگهانی به بازیکن وارد نشود.
 * جزیره دوقلو (twin) و نقشه‌های سخت فقط پس از باس‌های ۵ و ۱۰ وارد می‌شوند.
 */
export function getIslandForDay(day, isDaily = false, dateKey = null) {
    if (!isDaily) {
        if (day <= 3) return ISLAND_SHAPES.classic;
        if (day === 4) return ISLAND_SHAPES.crescent;
        if (day === 5) return ISLAND_SHAPES.classic; // میدان نبرد کراکن
        if (day === 6) return ISLAND_SHAPES.crescent;
        if (day === 7) return ISLAND_SHAPES.star;
        if (day === 8) return ISLAND_SHAPES.classic; // آبگیر داخلی روی زمین باز
        if (day === 9) return ISLAND_SHAPES.ridge;
        if (day === 10) return ISLAND_SHAPES.classic; // میدان نبرد شاه گرگ‌ها
        const masterOrder = ['twin', 'star', 'ring', 'ridge', 'crescent', 'classic'];
        return ISLAND_SHAPES[masterOrder[(day - 11) % masterOrder.length]];
    }

    if (day <= 2) return ISLAND_SHAPES.classic;
    const baseOrder = ['classic', 'crescent', 'star', 'ring', 'ridge', 'twin'];
    const rng = createMulberry32(hashStringToSeed(`daily_islands_${dateKey || getTodayDateKey()}`));
    const shuffled = [...baseOrder];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return ISLAND_SHAPES[shuffled[(day - 3) % shuffled.length]];
}

export function pickMissionForDay(day, lastMissionId = null) {
    if (day <= 2) return null; // مراحل ۱ و ۲ بدون مأموریت فرعی تا بازیکن روی اصول اصلی تمرکز کند
    let pool = MINI_MISSIONS.filter((m) => day >= (m.minDay || 3));
    if (pool.length > 1 && lastMissionId) {
        const filtered = pool.filter((m) => m.id !== lastMissionId);
        if (filtered.length > 0) pool = filtered;
    }
    const idx = Math.floor(rand() * pool.length);
    return pool[idx] || MINI_MISSIONS[0];
}

/**
 * پیکربندی کامل مرحله با رعایت:
 * ۱) ریتم حداقل ۲ مرحله برای هر عارضه/مکانیک جدید
 * ۲) مراحل ۱ و ۲ متعادل و بدون شوک سختی
 * ۳) تشدید محسوس سختی پس از شکست باس ۵ (Tier 2) و باس ۱۰ (Tier 3)
 */
export function getDayConfig(day, isDaily = false, dateKey = null, worldTier = 1) {
    const island = getIslandForDay(day, isDaily, dateKey);
    const season = getSeasonForDay(day);
    const bossType = day === 10 || (day > 10 && day % 10 === 0)
        ? 'wolf_king'
        : day === 5 || (day > 5 && day % 5 === 0)
            ? 'kraken'
            : null;

    // تشدید سختی بعد از باس‌ها (حتی روی مراحل عادی!)
    const effectiveTier = Math.max(worldTier, day >= 11 ? 3 : day >= 6 ? 2 : 1);
    const postBossSpeedBoost = effectiveTier === 3 ? 0.24 : effectiveTier === 2 ? 0.14 : 0;
    const postBossIntervalBoost = effectiveTier === 3 ? 1.35 : effectiveTier === 2 ? 0.85 : 0;

    // زمان بهینه مراحل (نه خسته‌کننده نه خیلی کوتاه)
    const durationSec = bossType
        ? (bossType === 'wolf_king' ? 65 : 60)
        : day === 1
            ? 35
            : day === 2
                ? 38
                : Math.min(54, 40 + (day - 2) * 1.8);

    const flowerCount = day <= 2 ? 4 : Math.min(8, 4 + Math.floor((day - 1) * 0.45));

    // رشد کنترل‌شده گله برای جلوگیری از شلوغی و اسنوبال
    const baseFlockSize =
        day === 1 ? 5
            : day === 2 ? 6
                : Math.min(12, 5 + Math.floor((day - 1) * 0.85));

    const rebelCount = day <= 2 ? 0 : Math.min(4, Math.floor((day - 1) * 0.45));
    const gluttonCount = day === 1 ? 0 : day === 2 ? 1 : Math.min(3, Math.floor(day * 0.35));

    // تنظیم سرعت و فاصله ورود گرگ‌ها
    const wolfInterval = bossType
        ? Math.max(4.6, 8.6 - day * 0.22)
        : day === 1
            ? 13.5
            : day === 2
                ? 11.8
                : Math.max(2.6, 11.2 - (day - 2) * 0.72 - postBossIntervalBoost);

    const firstWolfDelay = bossType
        ? 5.0
        : day === 1
            ? 9.0
            : day === 2
                ? 8.0
                : Math.max(2.8, 7.6 - (day - 2) * 0.45);

    const wolfSpeedScale =
        day === 1
            ? 0.74
            : day === 2
                ? 0.82
                : Math.min(1.95, 0.82 + (day - 2) * 0.068 + postBossSpeedBoost);

    const packChance = day >= 4 && !bossType
        ? Math.min(0.75, 0.14 + (day - 4) * 0.09 + (effectiveTier - 1) * 0.08)
        : 0;
    const triplePackChance = day >= 9 && !bossType
        ? Math.min(0.42, 0.12 + (day - 9) * 0.06)
        : 0;

    // ریتم ۲مرحله‌ای دشمنان جدید
    const allowedWolves = ['normal'];
    if (day >= 6) allowedWolves.push('swift'); // مراحل ۶ و ۷: گرگ سایه
    if (day >= 8) allowedWolves.push('alpha'); // مراحل ۸ و ۹: گرگ آلفا

    // ریتم ۲مرحله‌ای عوارض زمین (موانع به جای کوچک کردن جزیره)
    const obstacleCount = day <= 2 ? 2 : bossType ? 2 : Math.min(4, 2 + Math.floor(day / 4));
    const mudCount = day >= 3 && island.id !== 'ring' ? (day >= 7 ? 2 : 1) : 0; // معرفی در ۳ و ۴
    const slopeCount = day >= 6 && island.id !== 'twin' ? (day >= 10 ? 2 : 1) : 0; // معرفی در ۶ و ۷
    const hasInternalPond =
        day >= 8 && (island.id === 'classic' || island.id === 'crescent' || island.id === 'star'); // معرفی در ۸ و ۹

    // ابزارها و مکانیک‌های محیطی با ریتم ۲مرحله‌ای
    const hasBeehives = day >= 3; // معرفی در ۳ و ۴
    const hiveCount = day >= 8 ? 2 : day >= 3 ? 1 : 0;
    const hasGoldenZone = day >= 6; // معرفی در ۶ و ۷ (در کنار تپه شیب‌دار)
    const edgeDecreeAllowed = day >= 3; // هرگز در مراحل ۱ و ۲ فعال نشود!

    // حوادث طبیعی با ریتم ۲مرحله‌ای
    const allowedChaos = [];
    if (!bossType) {
        if (day >= 6) allowedChaos.push('eagle');     // مراحل ۶ و ۷
        if (day >= 8) allowedChaos.push('lightning'); // مراحل ۸ و ۹
        if (day >= 11) allowedChaos.push('tornado');  // مراحل ۱۱ و ۱۲ (Tier 3)
        if (day >= 13) allowedChaos.push('ufo');      // مراحل ۱۳+ (Tier 3)
    }

    const signatureChaos =
        day === 6 ? 'eagle'
            : day === 8 ? 'lightning'
                : day === 11 ? 'tornado'
                    : day === 13 ? 'ufo'
                        : null;

    const hasChaos = allowedChaos.length > 0;
    const chaosInterval = Math.max(5.4, 13.5 - Math.max(0, day - 6) * 0.85);
    const firstChaosDelay = Math.max(4.5, 9.0 - Math.max(0, day - 6) * 0.45);
    const doubleChaosChance = day >= 11 && !bossType ? Math.min(0.45, 0.16 + (day - 11) * 0.06) : 0;

    // کوچک شدن جزیره (جزر و مد) فقط در مراحل بالا (۸ به بعد)
    const maxTide = day >= 8 ? Math.min(36, 12 + (day - 8) * 3.5) : 0;
    const hasWind = day >= 11 && !bossType;
    const windStrength = hasWind ? Math.min(52, 30 + (day - 11) * 3.5) : 0;
    const isNightRaid = (day >= 11 && day % 2 === 1) || bossType === 'wolf_king';

    return {
        day,
        worldTier: effectiveTier,
        island,
        season,
        bossType,
        durationSec,
        flowerCount,
        baseFlockSize,
        rebelCount,
        gluttonCount,
        wolfInterval,
        firstWolfDelay,
        wolfSpeedScale,
        packChance,
        triplePackChance,
        allowedWolves,
        terrain: {
            obstacleCount,
            mudCount,
            slopeCount,
            hasInternalPond,
        },
        hasGoldenZone,
        hasBeehives,
        hiveCount,
        edgeDecreeAllowed,
        hasChaos,
        allowedChaos,
        signatureChaos,
        chaosInterval,
        firstChaosDelay,
        doubleChaosChance,
        maxTide,
        hasWind,
        windStrength,
        isNightRaid,
    };
}

export function distToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function closestPointOnSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return { x: x1, y: y1 };
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return { x: x1 + t * dx, y: y1 + t * dy };
}

export function getPolarRadius(shapeId, angle, baseRadius) {
    if (shapeId === 'star') {
        return baseRadius + Math.cos(angle * 4) * 46 + Math.sin(angle * 2) * 8;
    }
    const wobble =
        Math.sin(angle * 3) * 12 +
        Math.cos(angle * 5) * 7 +
        Math.sin(angle * 2 + 1.2) * 9;
    return baseRadius + wobble;
}

export function getZoneAt(x, y, shapeId = 'classic', tideOffset = 0, terrain = null) {
    // بررسی آبگیر داخلی پیش از شکل بیرونی
    if (terrain) {
        const pondZone = terrain.getPondZoneAt(x, y);
        if (pondZone === 'water') return 'water';
        if (pondZone === 'beach') {
            const outer = getZoneAt(x, y, shapeId, tideOffset, null);
            return outer === 'water' ? 'water' : 'beach';
        }
    }

    const safeShrink = tideOffset * 0.42;
    const beachShrink = tideOffset;

    if (shapeId === 'classic') {
        const dist = Math.hypot(x, y);
        const angle = Math.atan2(y, x);
        if (dist <= getPolarRadius('classic', angle, WORLD.SAFE_RADIUS - safeShrink)) return 'safe';
        if (dist <= getPolarRadius('classic', angle, WORLD.BEACH_RADIUS - beachShrink)) return 'beach';
        return 'water';
    }

    if (shapeId === 'star') {
        const dist = Math.hypot(x, y);
        const angle = Math.atan2(y, x);
        if (dist <= getPolarRadius('star', angle, 192 - safeShrink)) return 'safe';
        if (dist <= getPolarRadius('star', angle, 240 - beachShrink)) return 'beach';
        return 'water';
    }

    if (shapeId === 'twin') {
        const dLeft = Math.hypot(x + 148, y);
        const dRight = Math.hypot(x - 148, y);
        const dBridge = distToSegment(x, y, -148, 0, 148, 0);

        const lobeSafe = 110 - safeShrink * 0.7;
        const bridgeSafe = 44 - safeShrink * 0.4;
        if (dLeft <= lobeSafe || dRight <= lobeSafe || dBridge <= bridgeSafe) return 'safe';

        const lobeBeach = 144 - beachShrink * 0.75;
        const bridgeBeach = 68 - beachShrink * 0.45;
        if (dLeft <= lobeBeach || dRight <= lobeBeach || dBridge <= bridgeBeach) return 'beach';
        return 'water';
    }

    if (shapeId === 'crescent') {
        const dist = Math.hypot(x, y);
        const bayDist = Math.hypot(x - 148, y);
        const bayWater = 96 + beachShrink * 0.55;
        const bayBeach = 128 + safeShrink * 0.5;

        if (bayDist < bayWater) return 'water';
        if (dist > 286 - beachShrink) return 'water';
        if (bayDist < bayBeach) return 'beach';
        if (dist <= 238 - safeShrink) return 'safe';
        return 'beach';
    }

    if (shapeId === 'ring') {
        const dist = Math.hypot(x, y);
        const craterWater = 68 + beachShrink * 0.5;
        const craterBeach = 100 + safeShrink * 0.5;
        const outerSafe = 250 - safeShrink;
        const outerBeach = 294 - beachShrink;

        if (dist < craterWater || dist > outerBeach) return 'water';
        if (dist < craterBeach || dist > outerSafe) return 'beach';
        return 'safe';
    }

    if (shapeId === 'ridge') {
        const dSeg = distToSegment(x, y, -155, -45, 155, 45);
        if (dSeg <= 110 - safeShrink * 0.8) return 'safe';
        if (dSeg <= 152 - beachShrink * 0.8) return 'beach';
        return 'water';
    }

    return 'safe';
}

export function getSafeDirection(x, y, shapeId = 'classic', terrain = null) {
    // اگر نزدیک آبگیر داخلی باشد، جهت امن دور شدن از آبگیر است
    if (terrain && terrain.pond) {
        const pd = Math.hypot(x - terrain.pond.x, y - terrain.pond.y);
        if (pd < terrain.pond.radius + 45) {
            const a = Math.atan2(y - terrain.pond.y, x - terrain.pond.x);
            return { x: Math.cos(a), y: Math.sin(a) };
        }
    }

    let tx = 0;
    let ty = 0;

    if (shapeId === 'ring') {
        const angle = Math.atan2(y, x);
        tx = Math.cos(angle) * 176;
        ty = Math.sin(angle) * 176;
    } else if (shapeId === 'twin') {
        tx = x < 0 ? -148 : 148;
        ty = 0;
    } else if (shapeId === 'crescent') {
        const bayDist = Math.hypot(x - 148, y);
        if (bayDist < 175) {
            const outAngle = Math.atan2(y, x - 148);
            return { x: Math.cos(outAngle), y: Math.sin(outAngle) };
        }
        tx = -90;
        ty = 0;
    } else if (shapeId === 'ridge') {
        const cp = closestPointOnSegment(x, y, -120, -35, 120, 35);
        tx = cp.x;
        ty = cp.y;
    }

    const dx = tx - x;
    const dy = ty - y;
    const len = Math.hypot(dx, dy) || 1;
    return { x: dx / len, y: dy / len };
}

export function getRandomSafePoint(shapeId = 'classic', marginTide = 26, terrain = null) {
    for (let i = 0; i < 80; i++) {
        const x = (rand() - 0.5) * 520;
        const y = (rand() - 0.5) * 520;
        if (getZoneAt(x, y, shapeId, marginTide, terrain) === 'safe') {
            if (!terrain || !terrain.isBlockedForSpawn(x, y, 28)) {
                return { x, y };
            }
        }
    }
    return getDefaultHayPos(shapeId);
}

export function getRiskyEdgePoint(shapeId = 'classic', tideOffset = 0, terrain = null) {
    for (let i = 0; i < 70; i++) {
        const x = (rand() - 0.5) * 540;
        const y = (rand() - 0.5) * 540;
        if (getZoneAt(x, y, shapeId, tideOffset, terrain) === 'beach') {
            if (!terrain || !terrain.isBlockedForSpawn(x, y, 24)) return { x, y };
        }
    }
    return getRandomSafePoint(shapeId, tideOffset, terrain);
}

export function getDefaultHayPos(shapeId = 'classic') {
    if (shapeId === 'ring') return { x: 0, y: -175 };
    if (shapeId === 'crescent') return { x: -105, y: 0 };
    return { x: 0, y: 0 };
}

export function getWolfSpawnPoint(shapeId, angle) {
    const r = 315;
    return { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
}

export function getPatrolPoint(shapeId, angle, tideOffset = 0) {
    if (shapeId === 'ring') {
        const r = 176;
        return { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
    }
    if (shapeId === 'twin') {
        const x = Math.sin(angle) * 165;
        const y = Math.sin(angle * 2) * 65;
        return { x, y };
    }
    if (shapeId === 'ridge') {
        const t = Math.sin(angle);
        return { x: t * 145, y: t * 42 + Math.cos(angle * 2) * 38 };
    }
    if (shapeId === 'crescent') {
        const a = Math.PI * 0.4 + ((Math.sin(angle) + 1) * 0.5) * (Math.PI * 1.2);
        return { x: Math.cos(a) * 160, y: Math.sin(a) * 160 };
    }
    const r = (shapeId === 'star' ? 140 : 185) - tideOffset * 0.35;
    return { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
}