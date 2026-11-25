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
    COOLDOWN_MS: 170,
};

export const STAMINA = {
    MAX: 100,
    WHISTLE_COST: 9,
    SWIPE_STEP_COST: 3.1,
    HOLD_DRAIN_PER_SEC: 44,
    MAX_HOLD_SEC: 0.95,
    MAX_TAP_HOLD_SEC: 0.36,
    REGEN_PER_SEC: 48,
    EXHAUST_PENALTY_SEC: 0.9,
};

export const PANIC = {
    CLUSTER_RADIUS: 44,
    CLUSTER_THRESHOLD: 4,
    CLUSTER_STRESS_PER_SEC: 30,
    DECAY_PER_SEC: 28,
    LIMIT: 100,
    SCATTER_SPEED: 126,
};

export const HAY_CONFIG = {
    PRICE: 75,
    DURATION_SEC: 6.2,
    ATTRACT_RADIUS: 240,
    MAX_STOCK: 4,
};

export const REPELLENT_CONFIG = {
    PRICE: 65,
};

export const REROLL_BASE_PRICE = 35;

export const CARD_BASE_PRICES = {
    common: 110,
    rare: 165,
    epic: 235,
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
        tag: 'چالش مرحله ۱',
        title: 'ورود گرگ شکارچی',
        icon: 'wolf',
        accent: '#dc2626',
        desc: 'با شنیدن صدای زوزه، گرگ از لبه جزیره وارد می‌شود و به سمت گوسفندها می‌آید. با دو بار سوت یا سوایپ آن را فراری بده.',
        tip: 'ترفند حرفه‌ای: اگر گرگ را به داخل آب پرت کنی، فوراً ناک‌اوت می‌شود و ۲ برابر سکه می‌گیری!',
    },
    golden_zone_intro: {
        id: 'golden_zone_intro',
        tag: 'فرصت جدید',
        title: 'چراگاه طلایی',
        icon: 'sparkle',
        accent: '#ca8a04',
        desc: 'دایره‌ای طلایی نزدیک ساحل ظاهر می‌شود. هر لحظه‌ای که گوسفندهایت داخل آن بمانند، سکه و شارژ تب طلا می‌گیری.',
        tip: 'چون نزدیک آب است، حواست باشد گوسفندها به داخل دریا نیفتند.',
    },
    beehive_intro: {
        id: 'beehive_intro',
        tag: 'ابزار محیطی',
        title: 'کندوی زنبور وحشی',
        icon: 'bee',
        accent: '#d97706',
        desc: 'روی جزیره کندوی زنبور قرار دارد. وقتی گرگ نزدیک کندو شد، روی آن سوت بزن تا زنبورها گرگ را فراری دهند.',
        tip: 'گوسفندهایی که خیلی به کندو نزدیک باشند از زنبورها می‌ترسند و سریع پراکنده می‌شوند.',
    },
    chaos_eagle: {
        id: 'chaos_eagle',
        tag: 'تهدید هوایی',
        title: 'عقاب شکارچی',
        icon: 'eagle',
        accent: '#92400e',
        desc: 'با صدای جیغ عقاب، سایه‌ای قرمز روی یک گوسفند قفل می‌شود و چند لحظه بعد شیرجه می‌زند تا آن را برباید.',
        tip: 'یا گوسفند را از دایره دور کن، یا مستقیم روی سایه عقاب سوت بزن تا فرار کند!',
    },
    boss_kraken: {
        id: 'boss_kraken',
        tag: 'باس‌فایت مرحله ۵',
        title: 'اختاپوس دریایی (کراکن)',
        icon: 'kraken',
        accent: '#7e22ce',
        desc: 'شاخک‌های زره‌دار از دریا بیرون می‌آیند و در فازهای بعدی مکش اقیانوس گله را به سمت آب می‌کشد!',
        tip: 'روی نوک شاخک‌ها سوت یا سوایپ بزن تا نابود شوند و پیش از پایان تایمر جان کراکن را خالی کن.',
    },
    wolf_swift: {
        id: 'wolf_swift',
        tag: 'دشمن سریع',
        title: 'گرگ سایه',
        icon: 'wolf',
        accent: '#7c3aed',
        desc: 'گرگ بنفش‌رنگ با زوزه‌ای تیزتر و سرعت بسیار بالا می‌آید، اما با یک ضربه سوت یا سوایپ فوراً فرار می‌کند.',
        tip: 'به محض شنیدن زوزه تیز و دیدن علامت بنفش، آماده واکنش سریع باش.',
    },
    chaos_lightning: {
        id: 'chaos_lightning',
        tag: 'حادثه آب‌وهوایی',
        title: 'طوفان رعد و برق',
        icon: 'lightning',
        accent: '#0284c7',
        desc: 'دایره‌های هشدار روی زمین ظاهر می‌شوند و پس از چند لحظه صاعقه فرود می‌آید و گله را پراکنده می‌کند.',
        tip: 'اگر گرگی داخل دایره صاعقه باشد با برخورد برق فوراً فرار می‌کند و جایزه می‌گیری!',
    },
    wolf_alpha: {
        id: 'wolf_alpha',
        tag: 'دشمن سنگین',
        title: 'گرگ آلفا',
        icon: 'wolfAlpha',
        accent: '#b91c1c',
        desc: 'گرگ عظیم با زوزه بم و ۴ واحد جان که در برابر عقب‌راندن مقاوم‌تر است.',
        tip: 'سریع‌ترین راه حذف آلفا، هل دادن آن به داخل آب یا کمک گرفتن از قوچ و سگ گله است.',
    },
    chaos_tornado: {
        id: 'chaos_tornado',
        tag: 'حادثه طوفانی',
        title: 'گردباد سرگردان',
        icon: 'wind',
        accent: '#0d9488',
        desc: 'گردباد روی جزیره می‌چرخد و گوسفندهای نزدیک خود را به اطراف پرتاب می‌کند.',
        tip: 'گوسفندهایی که در مسیر گردباد هستند را قبل از نزدیک شدن به آب به سمت امن برگردان.',
    },
    boss_wolf_king: {
        id: 'boss_wolf_king',
        tag: 'باس‌فایت مرحله ۱۰',
        title: 'شاه گرگ‌ها',
        icon: 'crown',
        accent: '#b91c1c',
        desc: 'فرمانده گرگ‌ها با تاج طلایی! یورش‌های پیاپی و موج زوزه دفع‌کننده می‌زند و گرگ‌های سایه و آلفا را احضار می‌کند.',
        tip: 'با سوت و سوایپ به او ضربه بزن؛ پرت کردن او به داخل آب ۲ واحد آسیب سنگین می‌زند!',
    },
    chaos_ufo: {
        id: 'chaos_ufo',
        tag: 'حادثه ویژه',
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
        desc: 'متعادل و همه‌فن‌حریف برای تمام جزیره‌ها و سبک‌های بازی.',
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
        desc: 'سوایپ ۳۵٪ عریض‌تر و بازگشت نفس ۳۰٪ سریع‌تر | شعاع سوت ۱۸٪ کوچک‌تر.',
        unlockText: 'رسیدن به مرحله ۴',
        whistleRadiusMul: 0.82,
        swipeRadiusMul: 1.35,
        staminaRegenMul: 1.3,
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
        desc: 'شروع از مرحله ۱ با یک سگ گله رایگان | سهمیه زنده ماندن ۱ عدد سخت‌تر.',
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
        desc: 'درآمد سکه ۲۰٪ بیشتر و یک گوسفند طلایی اضافه | سرعت گرگ‌ها ۲۲٪ بیشتر.',
        unlockText: '۵ ناک‌اوت آبی یا رسیدن به مرحله ۶',
        whistleRadiusMul: 1.0,
        swipeRadiusMul: 1.0,
        staminaRegenMul: 1.0,
        goldMul: 1.2,
        wolfSpeedMul: 1.22,
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
        desc: 'هر سوت موج یخی-برقی می‌سازد که گرگ‌ها را خشک، کند و شدیداً پرتاب می‌کند.',
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

/**
 * ۱۴ مأموریت جذاب، فعال و متنوع (بدون تکرار مأموریت قبلی)
 */
export const MINI_MISSIONS = [
    {
        id: 'combo_3',
        icon: 'fire',
        title: 'کمبوی x3 در بازی ثبت کن',
        target: 3,
        rewardGold: 25,
        freeReroll: 1,
        minDay: 1,
    },
    {
        id: 'collect_wool_2',
        icon: 'sparkle',
        title: '۲ گوله پشم طلایی از زمین جمع کن',
        target: 2,
        rewardGold: 22,
        freeReroll: 0,
        minDay: 1,
    },
    {
        id: 'water_ko_1',
        icon: 'water',
        title: '۱ گرگ را به داخل آب بینداز',
        target: 1,
        rewardGold: 28,
        freeReroll: 1,
        minDay: 2,
    },
    {
        id: 'fever_rush',
        icon: 'fire',
        title: 'حالت سوپر چوپان (تب طلا) را فعال کن',
        target: 1,
        rewardGold: 26,
        freeReroll: 1,
        minDay: 2,
    },
    {
        id: 'golden_zone_10',
        icon: 'coin',
        title: '۱۰ سکه از چراگاه طلایی به دست آور',
        target: 10,
        rewardGold: 28,
        freeReroll: 1,
        minDay: 2,
    },
    {
        id: 'beehive_sting',
        icon: 'bee',
        title: 'با زنبورهای کندو یک گرگ را فراری بده',
        target: 1,
        rewardGold: 32,
        freeReroll: 1,
        minDay: 3,
    },
    {
        id: 'dog_guard',
        icon: 'dog',
        title: 'اجازه بده سگ گله گرگی را فراری دهد',
        target: 1,
        rewardGold: 28,
        freeReroll: 1,
        minDay: 2,
    },
    {
        id: 'ram_slam',
        icon: 'ram',
        title: 'با ضربه شاخ قوچ به یک گرگ بکوب',
        target: 1,
        rewardGold: 30,
        freeReroll: 1,
        minDay: 2,
    },
    {
        id: 'combo_5',
        icon: 'fire',
        title: 'کمبوی آتشین x5 ثبت کن',
        target: 5,
        rewardGold: 35,
        freeReroll: 1,
        minDay: 3,
    },
    {
        id: 'water_ko_2',
        icon: 'water',
        title: '۲ گرگ را به داخل آب پرتاب کن',
        target: 2,
        rewardGold: 36,
        freeReroll: 1,
        minDay: 3,
    },
    {
        id: 'collect_wool_4',
        icon: 'sparkle',
        title: '۴ گوله پشم در طول مرحله بردار',
        target: 4,
        rewardGold: 30,
        freeReroll: 1,
        minDay: 3,
    },
    {
        id: 'stamina_pro',
        icon: 'lungs',
        title: 'پایان مرحله بدون اینکه نفست بگیرد',
        target: 1,
        rewardGold: 25,
        freeReroll: 1,
        minDay: 1,
    },
    {
        id: 'no_flower_eaten',
        icon: 'flower',
        title: 'محافظت کامل: هیچ گلی خورده نشود',
        target: 1,
        rewardGold: 30,
        freeReroll: 1,
        minDay: 1,
    },
    {
        id: 'no_hay',
        icon: 'hay',
        title: 'بدون استفاده از بسته علوفه برنده شو',
        target: 1,
        rewardGold: 24,
        freeReroll: 1,
        minDay: 1,
    },
];

export const BOSS_CONFIG = {
    kraken: {
        id: 'kraken',
        icon: 'kraken',
        name: 'اختاپوس دریایی (کراکن)',
        baseHp: 20,
        tentacleInterval: 2.35,
        slamDelay: 1.75,
        bounty: 55,
    },
    wolf_king: {
        id: 'wolf_king',
        icon: 'crown',
        name: 'شاه گرگ‌ها',
        baseHp: 26,
        summonInterval: 4.4,
        dashInterval: 3.1,
        bounty: 75,
    },
};

export const ISLAND_SHAPES = {
    classic: {
        id: 'classic',
        name: 'جزیره آفتابی',
        desc: 'جزیره کلاسیک؛ بهترین زمین برای گرم کردن و یادگیری کنترل گله.',
        badgeColor: '#0284c7',
    },
    twin: {
        id: 'twin',
        name: 'جزایر دوقلو و پل',
        desc: 'دو جزیره متصل با پل باریک؛ گرگ‌ها را از روی پل به دریا بینداز.',
        badgeColor: '#0d9488',
    },
    crescent: {
        id: 'crescent',
        name: 'خلیج هلالی',
        desc: 'خلیج عمیق شرقی؛ گله را به غرب هدایت کن و گرگ‌ها را به خلیج پرت کن.',
        badgeColor: '#2563eb',
    },
    star: {
        id: 'star',
        name: 'جزیره ستاره‌ای',
        desc: 'چهار شبه‌جزیره تیز و باریک؛ نگذار گوسفندها به نوک شاخه‌ها بروند.',
        badgeColor: '#d97706',
    },
    ring: {
        id: 'ring',
        name: 'حفره آتشفشانی',
        desc: 'دریاچه‌ای عمیق وسط جزیره؛ گوسفندها را دور حلقه امن نگه دار.',
        badgeColor: '#dc2626',
    },
    ridge: {
        id: 'ridge',
        name: 'تنگه باریک',
        desc: 'جزیره کشیده و باریک؛ نیازمند سوایپ‌های کوتاه و دقیق.',
        badgeColor: '#7c3aed',
    },
};

export const SHEEP_TYPES = {
    normal: {
        key: 'sheep_normal',
        name: 'معمولی',
        baseIncome: 5,
        knockbackMul: 1.0,
        woolInterval: 24,
        woolValue: 2,
        wanderSpeedMul: 1.0,
    },
    rebel: {
        key: 'sheep_rebel',
        name: 'یاغی کنجکاو',
        baseIncome: 7,
        knockbackMul: 0.96,
        woolInterval: 22,
        woolValue: 3,
        wanderSpeedMul: 1.2,
    },
    glutton: {
        key: 'sheep_glutton',
        name: 'شکمو',
        baseIncome: 6,
        knockbackMul: 0.92,
        woolInterval: 23,
        woolValue: 2,
        wanderSpeedMul: 1.08,
    },
    ram: {
        key: 'sheep_ram',
        name: 'قوچ جنگجو',
        baseIncome: 4,
        knockbackMul: 0.78,
        woolInterval: 28,
        woolValue: 2,
        wanderSpeedMul: 0.95,
    },
    golden: {
        key: 'sheep_golden',
        name: 'طلایی',
        baseIncome: 12,
        knockbackMul: 1.0,
        woolInterval: 18,
        woolValue: 5,
        wanderSpeedMul: 1.06,
    },
};

export const SHEEP_CONFIG = {
    RADIUS: 15,
    SCALE: 0.74,
    WANDER_SPEED: 46,
    FLEE_SPEED: 220,
    ZOOMIES_SPEED: 215,
    SEPARATION_DIST: 38,
    COHESION_DIST: 95,
    FLOWER_SENSE_DIST: 105,
    FLOWER_EAT_DIST: 24,
    FRICTION: 2.9,
};

export const FLOWER_TYPES = {
    tulip: { key: 'flower_tulip', name: 'لاله', value: 5, eatTime: 2.7, effect: null },
    spicy: { key: 'flower_spicy', name: 'گل فلفلی', value: 7, eatTime: 2.4, effect: 'zoomies' },
    lavender: { key: 'flower_lavender', name: 'اسطوخودوس', value: 9, eatTime: 2.8, effect: 'sleep' },
};

export const WOLF_TYPES = {
    normal: {
        key: 'wolf_normal',
        name: 'گرگ شکارچی',
        scale: 0.86,
        huntSpeed: 76,
        carrySpeed: 60,
        fleeSpeed: 205,
        hitsToScare: 2,
        knockbackResistance: 1.0,
        bounty: 5,
        warningTime: 1.75,
    },
    swift: {
        key: 'wolf_swift',
        name: 'گرگ سایه',
        scale: 0.74,
        huntSpeed: 114,
        carrySpeed: 82,
        fleeSpeed: 245,
        hitsToScare: 1,
        knockbackResistance: 1.12,
        bounty: 7,
        warningTime: 1.25,
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
    HERD_SPEED: 130,
    CHASE_WOLF_SPEED: 136,
    HERD_FORCE: 215,
    VISION_RADIUS: 180,
    WOLF_BARK_COOLDOWN: 3.6,
    REST_DURATION: 1.45,
};

export const CARDS = [
    {
        id: 'lung_capacity',
        icon: 'lungs',
        title: 'نفس آهنی',
        desc: '۲۸٪ بازگشت سریع‌تر نفس و افزایش زمان مجاز سوایپ پیوسته.',
        rarity: 'common',
        maxLevel: 3,
    },
    {
        id: 'whistle_power',
        icon: 'whistle',
        title: 'ابرسوت چوپان',
        desc: '۱۲٪ افزایش شعاع و قدرت موج سوت و باد سوایپ.',
        rarity: 'common',
        maxLevel: 4,
    },
    {
        id: 'battle_ram',
        icon: 'ram',
        title: 'قوچ جنگجو',
        desc: 'یک قوچ شاخ‌دار دائمی به گله اضافه می‌کند. ترکیب با استاد تب طلا: قوچ آتشین.',
        rarity: 'common',
        maxLevel: 3,
    },
    {
        id: 'calm_aura',
        icon: 'calm',
        title: 'هاله آرامش',
        desc: 'کاهش استرس ازدحام و آرام‌تر شدن یاغی‌ها. ترکیب با گل انفجاری: تله گل.',
        rarity: 'common',
        maxLevel: 3,
    },
    {
        id: 'shock_whistle',
        icon: 'lightning',
        title: 'سوت شوک‌دار',
        desc: 'گرگ‌ها را موقتاً خشک و متوقف می‌کند. ترکیب با باد یخی: طوفان قطبی.',
        rarity: 'rare',
        maxLevel: 3,
    },
    {
        id: 'frost_swipe',
        icon: 'frost',
        title: 'باد یخی',
        desc: 'سرعت گرگ‌ها و گوسفندهای فلفلی را ۵۰٪ کاهش می‌دهد. ترکیب با سوت شوک‌دار: طوفان قطبی.',
        rarity: 'rare',
        maxLevel: 3,
    },
    {
        id: 'guard_dog',
        icon: 'dog',
        title: 'سگ شکارچی',
        desc: 'سگ گله جدید (تا ۲ سگ) یا ارتقای سرعت و محدوده دید سگ‌ها.',
        rarity: 'rare',
        maxLevel: 3,
    },
    {
        id: 'magnet_save',
        icon: 'magnet',
        title: 'نجات هوشمند',
        desc: 'در نزدیکی ساحل، موج سوت گوسفندها را دقیق‌تر به ناحیه امن برمی‌گرداند.',
        rarity: 'rare',
        maxLevel: 3,
    },
    {
        id: 'golden_touch',
        icon: 'goldenSheep',
        title: 'لمس طلایی',
        desc: 'یک گوسفند طلایی دائمی اضافه می‌کند و درآمد سکه‌ها را ۱۵٪ افزایش می‌دهد.',
        rarity: 'rare',
        maxLevel: 3,
    },
    {
        id: 'life_buoy',
        icon: 'buoy',
        title: 'حلقه نجات',
        desc: 'به ازای هر سطح، یک‌بار در مرحله گوسفند افتاده در آب را به داخل جزیره برمی‌گرداند.',
        rarity: 'epic',
        maxLevel: 2,
    },
    {
        id: 'fever_master',
        icon: 'fire',
        title: 'استاد تب طلا',
        desc: 'نوار تب طلا ۲۵٪ سریع‌تر پر می‌شود و ۱.۵ ثانیه بیشتر می‌ماند. ترکیب با قوچ: قوچ آتشین.',
        rarity: 'epic',
        maxLevel: 3,
    },
    {
        id: 'thorny_bloom',
        icon: 'explosion',
        title: 'گل‌های انفجاری',
        desc: 'خورده شدن گل موج انفجاری علیه گرگ‌ها می‌سازد. ترکیب با هاله آرامش: تله گل.',
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

export function getIslandForDay(day, isDaily = false, dateKey = null) {
    const baseOrder = ['classic', 'twin', 'crescent', 'star', 'ring', 'ridge'];
    if (!isDaily) {
        return ISLAND_SHAPES[baseOrder[(day - 1) % baseOrder.length]];
    }
    const rng = createMulberry32(hashStringToSeed(`daily_islands_${dateKey || getTodayDateKey()}`));
    const shuffled = [...baseOrder];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return ISLAND_SHAPES[shuffled[(day - 1) % shuffled.length]];
}

export function pickMissionForDay(day, lastMissionId = null) {
    let pool = MINI_MISSIONS.filter((m) => day >= (m.minDay || 1));
    if (pool.length > 1 && lastMissionId) {
        const filtered = pool.filter((m) => m.id !== lastMissionId);
        if (filtered.length > 0) pool = filtered;
    }
    const idx = Math.floor(rand() * pool.length);
    return pool[idx] || MINI_MISSIONS[0];
}

export function getDayConfig(day, isDaily = false, dateKey = null) {
    const island = getIslandForDay(day, isDaily, dateKey);
    const season = getSeasonForDay(day);
    const bossType = day % 10 === 0 ? 'wolf_king' : day % 5 === 0 ? 'kraken' : null;

    const durationSec = bossType ? 70 : Math.min(64, 38 + (day - 1) * 2.5);
    const flowerCount = Math.min(9, 4 + Math.floor(day * 0.55));

    const baseFlockSize = Math.min(16, 5 + Math.floor((day - 1) * 1.25));
    const rebelCount = day <= 1 ? 0 : Math.min(6, Math.floor((day - 1) * 0.72));
    const gluttonCount = day <= 1 ? 1 : Math.min(5, Math.floor((day + 1) * 0.5));

    const wolfInterval = bossType
        ? Math.max(4.6, 8.8 - day * 0.28)
        : Math.max(2.1, 12.2 - (day - 1) * 1.05);
    const firstWolfDelay = bossType ? 5.2 : Math.max(2.4, 8.2 - (day - 1) * 0.55);
    const wolfSpeedScale = Math.min(
        2.1,
        0.78 + (day - 1) * 0.095 + Math.max(0, day - 4) * 0.032
    );
    const packChance = day >= 3 && !bossType ? Math.min(0.85, 0.14 + (day - 3) * 0.11) : 0;
    const triplePackChance = day >= 7 && !bossType ? Math.min(0.48, 0.14 + (day - 7) * 0.07) : 0;

    const allowedWolves = ['normal'];
    if (day >= 5) allowedWolves.push('swift');
    if (day >= 7) allowedWolves.push('alpha');

    const hasGoldenZone = day >= 2;
    const hasBeehives = day >= 3;
    const hiveCount = day >= 7 ? 2 : day >= 3 ? 1 : 0;

    const allowedChaos = [];
    if (!bossType) {
        if (day >= 4) allowedChaos.push('eagle');
        if (day >= 6) allowedChaos.push('lightning');
        if (day >= 8) allowedChaos.push('tornado');
        if (day >= 10) allowedChaos.push('ufo');
    }

    const signatureChaos =
        day === 4
            ? 'eagle'
            : day === 6
                ? 'lightning'
                : day === 8
                    ? 'tornado'
                    : day === 10
                        ? 'ufo'
                        : null;

    const hasChaos = allowedChaos.length > 0;
    const chaosInterval = Math.max(4.8, 13.5 - Math.max(0, day - 4) * 1.05);
    const firstChaosDelay = Math.max(4.2, 8.8 - Math.max(0, day - 4) * 0.5);
    const doubleChaosChance = day >= 8 && !bossType ? Math.min(0.5, 0.16 + (day - 8) * 0.08) : 0;

    const maxTide = day >= 2 ? Math.min(44, 14 + (day - 2) * 3.4) : 0;
    const hasWind = day >= 5 && (day % 2 === 0 || day >= 9) && !bossType;
    const windStrength = hasWind ? Math.min(58, 34 + Math.max(0, day - 5) * 4) : 0;
    const isNightRaid = (day >= 8 && day % 2 === 0) || bossType === 'wolf_king';

    return {
        day,
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
        hasGoldenZone,
        hasBeehives,
        hiveCount,
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

export function getZoneAt(x, y, shapeId = 'classic', tideOffset = 0) {
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
        const bridgeSafe = 40 - safeShrink * 0.4;
        if (dLeft <= lobeSafe || dRight <= lobeSafe || dBridge <= bridgeSafe) return 'safe';

        const lobeBeach = 144 - beachShrink * 0.75;
        const bridgeBeach = 64 - beachShrink * 0.45;
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

export function getSafeDirection(x, y, shapeId = 'classic') {
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

export function getRandomSafePoint(shapeId = 'classic', marginTide = 26) {
    for (let i = 0; i < 60; i++) {
        const x = (rand() - 0.5) * 520;
        const y = (rand() - 0.5) * 520;
        if (getZoneAt(x, y, shapeId, marginTide) === 'safe') {
            return { x, y };
        }
    }
    return getDefaultHayPos(shapeId);
}

export function getRiskyEdgePoint(shapeId = 'classic', tideOffset = 0) {
    for (let i = 0; i < 70; i++) {
        const x = (rand() - 0.5) * 540;
        const y = (rand() - 0.5) * 540;
        if (getZoneAt(x, y, shapeId, tideOffset) === 'beach') return { x, y };
    }
    return getRandomSafePoint(shapeId, tideOffset);
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