import { COLORS } from '../config/gameData.js';

function drawOutlinedSheep(scene, key, outerWool, midWool, innerWool, headColor, opts = {}) {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const cx = 32;
    const cy = 32;

    g.fillStyle(0x1e293b, 0.88);
    g.fillCircle(cx - 8, cy, 14.5);
    g.fillCircle(cx - 2, cy - 9, 13.5);
    g.fillCircle(cx - 2, cy + 9, 13.5);
    g.fillCircle(cx + 5, cy - 6, 12.5);
    g.fillCircle(cx + 5, cy + 6, 12.5);
    g.fillEllipse(cx + 17, cy, 18, 15.5);

    g.fillStyle(outerWool, 1);
    g.fillCircle(cx - 8, cy, 12.5);
    g.fillCircle(cx - 2, cy - 9, 11.5);
    g.fillCircle(cx - 2, cy + 9, 11.5);
    g.fillCircle(cx + 5, cy - 6, 10.5);
    g.fillCircle(cx + 5, cy + 6, 10.5);

    g.fillStyle(midWool, 1);
    g.fillCircle(cx - 7, cy - 1, 10.5);
    g.fillCircle(cx - 1, cy - 7, 9.5);
    g.fillCircle(cx - 1, cy + 7, 9.5);
    g.fillCircle(cx + 4, cy, 10.5);

    g.fillStyle(innerWool, 0.9);
    g.fillCircle(cx - 4, cy - 4, 7);
    g.fillCircle(cx + 2, cy - 2, 6);

    g.fillStyle(headColor, 1);
    g.fillEllipse(cx + 11, cy - 10.5, 7.5, 11.5);
    g.fillEllipse(cx + 11, cy + 10.5, 7.5, 11.5);
    g.fillEllipse(cx + 17, cy, 15, 13);

    if (opts.horns) {
        g.lineStyle(5, 0x92400e, 1);
        g.beginPath();
        g.arc(cx + 14, cy - 12, 7.5, Math.PI * 0.58, Math.PI * 1.98, false);
        g.strokePath();
        g.beginPath();
        g.arc(cx + 14, cy + 12, 7.5, Math.PI * 0.02, Math.PI * 1.42, false);
        g.strokePath();

        g.lineStyle(2.6, 0xfbbf24, 1);
        g.beginPath();
        g.arc(cx + 14, cy - 12, 7.5, Math.PI * 0.65, Math.PI * 1.9, false);
        g.strokePath();
        g.beginPath();
        g.arc(cx + 14, cy + 12, 7.5, Math.PI * 0.1, Math.PI * 1.35, false);
        g.strokePath();
    }

    if (opts.bandana) {
        g.fillStyle(0xdc2626, 1);
        g.fillRoundedRect(cx + 8.5, cy - 8.5, 6.5, 17, 2.5);
        g.fillTriangle(cx + 9.5, cy - 8.5, cx + 1, cy - 15, cx + 5.5, cy - 5);
        g.fillStyle(0xfca5a5, 0.85);
        g.fillRect(cx + 10.5, cy - 6, 2, 12);
    }

    if (opts.ribbon) {
        g.fillStyle(0xec4899, 1);
        g.fillCircle(cx + 10, cy - 4, 3.2);
        g.fillCircle(cx + 10, cy + 4, 3.2);
        g.fillStyle(0xfdf2f8, 1);
        g.fillCircle(cx + 10.5, cy, 2);
    }

    g.fillStyle(midWool, 1);
    g.fillCircle(cx + 12, cy, 5.8);

    g.fillStyle(0x0f172a, 1);
    g.fillCircle(cx + 20.5, cy - 3.6, 2.3);
    g.fillCircle(cx + 20.5, cy + 3.6, 2.3);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(cx + 21.3, cy - 4.3, 0.9);
    g.fillCircle(cx + 21.3, cy + 2.9, 0.9);

    g.generateTexture(key, 64, 64);
    g.destroy();
}

/**
 * شکل تمام‌بدن و نمای روبه‌روی گوسفند کیوت و وحشت‌زده (هنگام اسارت در چنگ گرگ یا سقوط در آب)
 * با دست‌وپاهای بالارفته در حال تقلا، چشم‌های درشت اشکی و صورت گریان
 */
function drawFrontScaredSheep(scene, key, outerWool, midWool, innerWool, headColor, opts = {}) {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const cx = 40;
    const cy = 44;

    // ۱. دورخط تیره برای کل بدن، دست‌وپاهای تقلاکننده و گوش‌های آویزان
    g.fillStyle(0x0f172a, 0.94);
    // پاهای پایینی در حال دست‌وپازدن
    g.fillEllipse(cx - 12, cy + 20, 12, 16);
    g.fillEllipse(cx + 12, cy + 20, 12, 16);
    // دست‌های بالایی بالارفته برای درخواست کمک
    g.fillEllipse(cx - 23, cy + 3, 15, 11);
    g.fillEllipse(cx + 23, cy + 3, 15, 11);
    // هاله پشم بدن
    g.fillCircle(cx - 12, cy + 7, 15);
    g.fillCircle(cx + 12, cy + 7, 15);
    g.fillCircle(cx, cy + 11, 17);
    // گوش‌های افتاده و مظلوم
    g.fillEllipse(cx - 21, cy - 11, 15, 11);
    g.fillEllipse(cx + 21, cy - 11, 15, 11);
    // سر درشت و کیوت
    g.fillCircle(cx, cy - 10, 20.5);
    // پشم روی سر
    g.fillCircle(cx - 8, cy - 24, 9.5);
    g.fillCircle(cx + 8, cy - 24, 9.5);
    g.fillCircle(cx, cy - 27, 10.5);

    // ۲. دست‌ها و پاهای کوچک
    g.fillStyle(headColor, 1);
    g.fillEllipse(cx - 12, cy + 20, 8, 12);
    g.fillEllipse(cx + 12, cy + 20, 8, 12);
    g.fillEllipse(cx - 23, cy + 3, 11, 7.5);
    g.fillEllipse(cx + 23, cy + 3, 11, 7.5);
    // سم‌های تیره
    g.fillStyle(0x111827, 1);
    g.fillCircle(cx - 12, cy + 24, 3.6);
    g.fillCircle(cx + 12, cy + 24, 3.6);
    g.fillCircle(cx - 27, cy + 2, 3.4);
    g.fillCircle(cx + 27, cy + 2, 3.4);

    // ۳. بدن پشمی گرد و پف‌کرده
    g.fillStyle(outerWool, 1);
    g.fillCircle(cx - 12, cy + 7, 12.8);
    g.fillCircle(cx + 12, cy + 7, 12.8);
    g.fillCircle(cx, cy + 11, 14.5);

    g.fillStyle(midWool, 1);
    g.fillCircle(cx - 9, cy + 5, 11);
    g.fillCircle(cx + 9, cy + 5, 11);
    g.fillCircle(cx, cy + 9, 12.5);

    g.fillStyle(innerWool, 0.92);
    g.fillCircle(cx - 5, cy + 3, 7);
    g.fillCircle(cx + 5, cy + 3, 7);

    // ۴. گوش‌های آویزان و صورت
    g.fillStyle(headColor, 1);
    g.fillEllipse(cx - 20, cy - 10, 11.5, 7.5);
    g.fillEllipse(cx + 20, cy - 10, 11.5, 7.5);
    g.fillStyle(0xfda4af, 0.45);
    g.fillEllipse(cx - 19, cy - 9.5, 6.5, 3.5);
    g.fillEllipse(cx + 19, cy - 9.5, 6.5, 3.5);

    // شاخ‌های قوچ در صورت قوچ بودن
    if (opts.horns) {
        g.lineStyle(5.5, 0x92400e, 1);
        g.beginPath();
        g.arc(cx - 15, cy - 23, 8.5, Math.PI * 0.4, Math.PI * 1.65, false);
        g.strokePath();
        g.beginPath();
        g.arc(cx + 15, cy - 23, 8.5, Math.PI * 1.35, Math.PI * 0.6, false);
        g.strokePath();

        g.lineStyle(2.8, 0xfbbf24, 1);
        g.beginPath();
        g.arc(cx - 15, cy - 23, 8.5, Math.PI * 0.48, Math.PI * 1.55, false);
        g.strokePath();
        g.beginPath();
        g.arc(cx + 15, cy - 23, 8.5, Math.PI * 1.45, Math.PI * 0.52, false);
        g.strokePath();
    }

    // بیضی صورت
    g.fillStyle(headColor, 1);
    g.fillEllipse(cx, cy - 9, 34, 31);

    // کاکل پشمی بالای سر
    g.fillStyle(outerWool, 1);
    g.fillCircle(cx - 8, cy - 23, 7.5);
    g.fillCircle(cx + 8, cy - 23, 7.5);
    g.fillCircle(cx, cy - 25.5, 8.8);
    g.fillStyle(innerWool, 1);
    g.fillCircle(cx - 6, cy - 24, 5.5);
    g.fillCircle(cx + 6, cy - 24, 5.5);
    g.fillCircle(cx, cy - 26.5, 6.5);

    if (opts.bandana) {
        g.fillStyle(0xdc2626, 1);
        g.fillRoundedRect(cx - 14, cy - 22, 28, 5.5, 2.5);
        g.fillStyle(0xfca5a5, 0.9);
        g.fillRect(cx - 10, cy - 20.3, 20, 1.8);
    }

    if (opts.ribbon) {
        g.fillStyle(0xec4899, 1);
        g.fillCircle(cx - 5, cy - 30, 4.2);
        g.fillCircle(cx + 5, cy - 30, 4.2);
        g.fillStyle(0xfdf2f8, 1);
        g.fillCircle(cx, cy - 30, 2.6);
    }

    // ۵. جزئیات چهره کیوت و وحشت‌زده
    // گونه‌های صورتی
    g.fillStyle(0xfda4af, 0.8);
    g.fillEllipse(cx - 11.5, cy - 4, 6, 4);
    g.fillEllipse(cx + 11.5, cy - 4, 6, 4);

    // چشم‌های خیلی درشت و مظلوم
    g.fillStyle(0xffffff, 1);
    g.fillCircle(cx - 7, cy - 11, 6.2);
    g.fillCircle(cx + 7, cy - 11, 6.2);

    g.fillStyle(0x0f172a, 1);
    g.fillCircle(cx - 6.6, cy - 10.6, 4.3);
    g.fillCircle(cx + 6.6, cy - 10.6, 4.3);

    // هاله آب و اشک جمع‌شده در پایین چشم + جاری شدن روی گونه‌ها
    g.fillStyle(0x38bdf8, 0.95);
    g.fillEllipse(cx - 7.5, cy - 6.8, 7, 3.2);
    g.fillEllipse(cx + 7.5, cy - 6.8, 7, 3.2);
    g.fillEllipse(cx - 9.5, cy - 1.5, 4.2, 7.2);
    g.fillEllipse(cx + 9.5, cy - 1.5, 4.2, 7.2);
    g.fillStyle(0xbae6fd, 1);
    g.fillCircle(cx - 10, cy - 2.6, 1.3);
    g.fillCircle(cx + 9, cy - 2.6, 1.3);

    // برق درشت و دوگانه چشم‌ها (حس مظلومیت و کیوت بودن)
    g.fillStyle(0xffffff, 1);
    g.fillCircle(cx - 8.4, cy - 12.6, 2.2);
    g.fillCircle(cx + 5.0, cy - 12.6, 2.2);
    g.fillCircle(cx - 5.2, cy - 8.8, 1.2);
    g.fillCircle(cx + 8.2, cy - 8.8, 1.2);

    // ابروهای نگران و کج به سمت بالا
    g.lineStyle(2.4, 0xfef3c7, 0.96);
    g.lineBetween(cx - 12.5, cy - 16.5, cx - 3.5, cy - 18.8);
    g.lineBetween(cx + 12.5, cy - 16.5, cx + 3.5, cy - 18.8);

    // دهان باز و گریان در حال صدا زدن چوپان
    g.fillStyle(0x0f172a, 1);
    g.fillEllipse(cx, cy - 1.5, 7.4, 6.2);
    g.fillStyle(0xfb7185, 1);
    g.fillEllipse(cx, cy + 0.2, 4.5, 2.8);

    g.generateTexture(key, 80, 80);
    g.destroy();
}

function drawOutlinedWolf(scene, key, bodyMain, bodyAccent, darkParts, eyeColor, hasCrown = false) {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const cx = 36;
    const cy = 32;

    g.fillStyle(0x0f172a, 0.9);
    g.fillEllipse(cx - 21, cy, 21, 11.5);
    g.fillEllipse(cx - 3, cy, 33, 22);
    g.fillEllipse(cx + 16, cy, 23, 15.5);

    g.fillStyle(darkParts, 1);
    g.fillEllipse(cx - 22, cy, 18, 9);
    g.fillStyle(0xcbd5e1, 1);
    g.fillCircle(cx - 28, cy, 3.8);

    g.fillStyle(bodyMain, 1);
    g.fillEllipse(cx - 3, cy, 30, 19);
    g.fillStyle(bodyAccent, 1);
    g.fillEllipse(cx + 5, cy, 17, 18);

    g.fillStyle(darkParts, 1);
    g.fillTriangle(cx + 5, cy - 6, cx + 14, cy - 16, cx + 17, cy - 5);
    g.fillTriangle(cx + 5, cy + 6, cx + 14, cy + 16, cx + 17, cy + 5);
    g.fillStyle(bodyAccent, 0.7);
    g.fillTriangle(cx + 8, cy - 7, cx + 13.5, cy - 13, cx + 15, cy - 6);
    g.fillTriangle(cx + 8, cy + 7, cx + 13.5, cy + 13, cx + 15, cy + 6);

    g.fillStyle(bodyMain, 1);
    g.fillEllipse(cx + 16, cy, 20, 13);
    g.fillStyle(0x0f172a, 1);
    g.fillCircle(cx + 26, cy, 3);

    g.fillStyle(eyeColor, 1);
    g.fillCircle(cx + 17.5, cy - 4.2, 2.8);
    g.fillCircle(cx + 17.5, cy + 4.2, 2.8);
    g.fillStyle(0x0f172a, 1);
    g.fillCircle(cx + 18.4, cy - 4.2, 1.3);
    g.fillCircle(cx + 18.4, cy + 4.2, 1.3);

    if (hasCrown) {
        g.fillStyle(0xb45309, 1);
        g.fillRoundedRect(cx + 3, cy - 9, 8.5, 18, 2.5);
        g.fillStyle(0xfbbf24, 1);
        g.fillRoundedRect(cx + 4, cy - 8, 7, 16, 2);
        g.fillTriangle(cx + 11, cy - 8, cx + 18, cy - 5, cx + 11, cy - 2);
        g.fillTriangle(cx + 11, cy - 2, cx + 19, cy, cx + 11, cy + 2);
        g.fillTriangle(cx + 11, cy + 2, cx + 18, cy + 5, cx + 11, cy + 8);
        g.fillStyle(0xef4444, 1);
        g.fillCircle(cx + 7.5, cy, 2.1);
    }

    g.generateTexture(key, 72, 64);
    g.destroy();
}

function createStatusBadge(scene, key, bgColor, borderColor, drawSymbol) {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const c = 16;
    g.fillStyle(0x0f172a, 0.35);
    g.fillCircle(c, c + 1.5, 13);
    g.fillStyle(bgColor, 1);
    g.fillCircle(c, c, 12.5);
    g.lineStyle(2.4, borderColor, 1);
    g.strokeCircle(c, c, 12.5);
    drawSymbol(g, c);
    g.generateTexture(key, 32, 32);
    g.destroy();
}

export function generateTextures(scene) {
    if (!scene.textures.exists('whistle_ring')) {
        const size = 256;
        const g = scene.make.graphics({ x: 0, y: 0, add: false });
        g.lineStyle(9, COLORS.WHISTLE_RING, 0.92);
        g.strokeCircle(size / 2, size / 2, size / 2 - 10);
        g.lineStyle(3.5, 0xfef08a, 0.72);
        g.strokeCircle(size / 2, size / 2, size / 2 - 24);
        g.lineStyle(2, 0xffffff, 0.35);
        g.strokeCircle(size / 2, size / 2, size / 2 - 42);
        g.generateTexture('whistle_ring', size, size);
        g.destroy();
    }

    if (!scene.textures.exists('dot_particle')) {
        const g = scene.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0xffffff, 1);
        g.fillCircle(8, 8, 8);
        g.generateTexture('dot_particle', 16, 16);
        g.destroy();
    }

    if (!scene.textures.exists('star_particle')) {
        const g = scene.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0xffffff, 1);
        g.beginPath();
        g.moveTo(12, 1);
        g.lineTo(15, 9);
        g.lineTo(23, 12);
        g.lineTo(15, 15);
        g.lineTo(12, 23);
        g.lineTo(9, 15);
        g.lineTo(1, 12);
        g.lineTo(9, 9);
        g.closePath();
        g.fillPath();
        g.generateTexture('star_particle', 24, 24);
        g.destroy();
    }

    if (!scene.textures.exists('heart_particle')) {
        const g = scene.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0xf43f5e, 1);
        g.fillCircle(8, 9, 5.5);
        g.fillCircle(16, 9, 5.5);
        g.fillTriangle(2.8, 10.5, 21.2, 10.5, 12, 22);
        g.fillStyle(0xfecdd3, 0.8);
        g.fillCircle(6.8, 7.5, 1.8);
        g.generateTexture('heart_particle', 24, 24);
        g.destroy();
    }

    if (!scene.textures.exists('dust_puff')) {
        const g = scene.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0xf8fafc, 0.75);
        g.fillCircle(12, 13, 7);
        g.fillCircle(18, 12, 6);
        g.fillCircle(15, 9, 6);
        g.generateTexture('dust_puff', 28, 24);
        g.destroy();
    }

    if (!scene.textures.exists('grass_tuft')) {
        const g = scene.make.graphics({ x: 0, y: 0, add: false });
        g.lineStyle(3, COLORS.GRASS_DARK, 0.78);
        g.beginPath();
        g.moveTo(12, 21);
        g.lineTo(5, 9);
        g.moveTo(12, 21);
        g.lineTo(12, 4);
        g.moveTo(12, 21);
        g.lineTo(19, 9);
        g.strokePath();
        g.generateTexture('grass_tuft', 24, 24);
        g.destroy();
    }

    if (!scene.textures.exists('bush_prop')) {
        const g = scene.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0x0f172a, 0.16);
        g.fillEllipse(24, 30, 36, 16);
        g.fillStyle(0x2d6a4f, 1);
        g.fillCircle(15, 22, 11);
        g.fillCircle(31, 22, 11);
        g.fillCircle(23, 15, 13);
        g.fillStyle(0x40916c, 1);
        g.fillCircle(16, 20, 8.5);
        g.fillCircle(29, 20, 8.5);
        g.fillCircle(23, 14, 10);
        g.fillStyle(0x74c69d, 0.7);
        g.fillCircle(21, 11, 5);
        g.generateTexture('bush_prop', 48, 40);
        g.destroy();
    }

    if (!scene.textures.exists('pebble')) {
        const g = scene.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0xc69c6d, 0.72);
        g.fillEllipse(8, 6, 12, 8);
        g.fillStyle(0xfef3c7, 0.45);
        g.fillEllipse(6, 4.5, 5, 3);
        g.generateTexture('pebble', 16, 12);
        g.destroy();
    }

    if (!scene.textures.exists('shadow_soft')) {
        const g = scene.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0x0f172a, 0.24);
        g.fillEllipse(24, 16, 40, 25);
        g.generateTexture('shadow_soft', 48, 32);
        g.destroy();
    }

    // گوسفندها: حالت عادی + شکل تمام‌بدن نمای روبه‌روی وحشت‌زده و کیوت
    const sheepDefs = [
        ['sheep_normal', 0xd6d3cb, 0xf8fafc, 0xffffff, 0x443a35, {}],
        ['sheep_rebel', 0xfca5a5, 0xffe4e6, 0xffffff, 0x3b2828, { bandana: true }],
        ['sheep_glutton', 0xf472b6, 0xfce7f3, 0xffffff, 0x581c87, { ribbon: true }],
        ['sheep_golden', 0xd97706, 0xfde047, 0xfef9c3, 0x78350f, {}],
        ['sheep_ram', 0x64748b, 0xcbd5e1, 0xf1f5f9, 0x1e293b, { horns: true }],
    ];
    for (const [key, o, m, i, h, opts] of sheepDefs) {
        drawOutlinedSheep(scene, key, o, m, i, h, opts);
        drawFrontScaredSheep(scene, `${key}_scared`, o, m, i, h, opts);
    }

    drawOutlinedWolf(scene, 'wolf_normal', 0x475569, 0x64748b, 0x1e293b, 0xfde047);
    drawOutlinedWolf(scene, 'wolf_swift', 0x5b21b6, 0x7c3aed, 0x2e1065, 0x38bdf8);
    drawOutlinedWolf(scene, 'wolf_alpha', 0x991b1b, 0xb91c1c, 0x1f2937, 0xfef08a);
    drawOutlinedWolf(scene, 'wolf_king', 0x450a0a, 0x991b1b, 0x0f172a, 0xfde047, true);

    if (!scene.textures.exists('dog_normal')) {
        const g = scene.make.graphics({ x: 0, y: 0, add: false });
        const cx = 32;
        const cy = 32;
        g.fillStyle(0x1e293b, 0.85);
        g.fillEllipse(cx - 19, cy, 15.5, 8);
        g.fillEllipse(cx - 2, cy, 27, 20);
        g.fillEllipse(cx + 15, cy, 19, 17);

        g.fillStyle(0xb45309, 1);
        g.fillEllipse(cx - 19, cy, 13, 6);
        g.fillStyle(0xd97706, 1);
        g.fillEllipse(cx - 2, cy, 24, 17);
        g.fillStyle(0xfef3c7, 1);
        g.fillEllipse(cx - 5, cy, 12, 10);
        g.fillStyle(0xdc2626, 1);
        g.fillRoundedRect(cx + 6, cy - 8.5, 5.5, 17, 2.5);
        g.fillStyle(0xfbbf24, 1);
        g.fillCircle(cx + 8.5, cy, 2.2);
        g.fillStyle(0xb45309, 1);
        g.fillEllipse(cx + 15, cy, 16, 14);
        g.fillStyle(0x78350f, 1);
        g.fillEllipse(cx + 12, cy - 9.5, 8.5, 6);
        g.fillEllipse(cx + 12, cy + 9.5, 8.5, 6);
        g.fillStyle(0xfef3c7, 1);
        g.fillEllipse(cx + 20, cy, 8, 7);
        g.fillStyle(0x0f172a, 1);
        g.fillCircle(cx + 23.5, cy, 2.5);
        g.fillCircle(cx + 17, cy - 3.5, 2.1);
        g.fillCircle(cx + 17, cy + 3.5, 2.1);
        g.generateTexture('dog_normal', 64, 64);
        g.destroy();
    }

    if (!scene.textures.exists('beehive')) {
        const g = scene.make.graphics({ x: 0, y: 0, add: false });
        const c = 28;
        g.fillStyle(0x0f172a, 0.24);
        g.fillEllipse(c, c + 15, 38, 15);
        g.fillStyle(0x78350f, 1);
        g.fillEllipse(c, c + 6, 33, 16);
        g.fillEllipse(c, c, 37, 17);
        g.fillEllipse(c, c - 7, 29, 15);
        g.fillStyle(0xd97706, 1);
        g.fillEllipse(c, c + 6, 29, 13);
        g.fillStyle(0xf59e0b, 1);
        g.fillEllipse(c, c, 33, 14);
        g.fillStyle(0xfbbf24, 1);
        g.fillEllipse(c, c - 7, 25, 12);
        g.fillStyle(0x451a03, 1);
        g.fillCircle(c, c + 2, 5.5);
        g.fillStyle(0xfef08a, 0.5);
        g.fillEllipse(c - 6, c - 8, 7, 3.5);
        g.generateTexture('beehive', 56, 56);
        g.destroy();
    }

    if (!scene.textures.exists('kraken_head')) {
        const g = scene.make.graphics({ x: 0, y: 0, add: false });
        const c = 48;
        g.fillStyle(0x2e1065, 1);
        g.fillCircle(c, c, 39);
        g.fillStyle(0x581c87, 1);
        g.fillCircle(c, c, 35);
        g.fillStyle(0x7e22ce, 1);
        g.fillEllipse(c, c - 6, 56, 46);
        g.fillStyle(0xc084fc, 0.55);
        g.fillCircle(c - 13, c - 17, 9);
        g.fillCircle(c + 14, c - 12, 6);
        g.fillStyle(0xfde047, 1);
        g.fillCircle(c - 13, c + 8, 8.5);
        g.fillCircle(c + 13, c + 8, 8.5);
        g.fillStyle(0x0f172a, 1);
        g.fillEllipse(c - 12, c + 9, 4, 8.5);
        g.fillEllipse(c + 12, c + 9, 4, 8.5);
        g.lineStyle(4.5, 0x2e1065, 1);
        g.lineBetween(c - 23, c - 1, c - 5, c + 4);
        g.lineBetween(c + 23, c - 1, c + 5, c + 4);
        g.generateTexture('kraken_head', 96, 96);
        g.destroy();
    }

    if (!scene.textures.exists('kraken_tentacle')) {
        const g = scene.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0x3b0764, 1);
        g.fillRoundedRect(8, 6, 40, 52, 20);
        g.fillStyle(0x7e22ce, 1);
        g.fillRoundedRect(11, 9, 34, 46, 17);
        g.fillStyle(0xa855f7, 1);
        g.fillCircle(28, 22, 14);
        g.fillStyle(0xf5d0fe, 1);
        g.fillCircle(22, 18, 4.5);
        g.fillCircle(34, 24, 4.5);
        g.fillCircle(23, 35, 4.2);
        g.fillCircle(33, 41, 3.8);
        g.generateTexture('kraken_tentacle', 56, 60);
        g.destroy();
    }

    if (!scene.textures.exists('eagle_bird')) {
        const g = scene.make.graphics({ x: 0, y: 0, add: false });
        const cx = 48;
        const cy = 40;
        g.fillStyle(0x1c0a00, 1);
        g.fillTriangle(cx, cy - 12, cx - 45, cy - 24, cx - 22, cy + 14);
        g.fillTriangle(cx, cy - 12, cx + 45, cy - 24, cx + 22, cy + 14);
        g.fillStyle(0x78350f, 1);
        g.fillTriangle(cx, cy - 10, cx - 41, cy - 20, cx - 21, cy + 11);
        g.fillTriangle(cx, cy - 10, cx + 41, cy - 20, cx + 21, cy + 11);
        g.fillStyle(0x92400e, 1);
        g.fillEllipse(cx, cy, 22, 34);
        g.fillStyle(0xffffff, 1);
        g.fillCircle(cx, cy + 14, 9.5);
        g.fillStyle(0xf59e0b, 1);
        g.fillTriangle(cx - 4.5, cy + 20, cx + 4.5, cy + 20, cx, cy + 31);
        g.generateTexture('eagle_bird', 96, 80);
        g.destroy();
    }

    if (!scene.textures.exists('wool_drop')) {
        const g = scene.make.graphics({ x: 0, y: 0, add: false });
        const c = 24;
        g.fillStyle(0xfde047, 0.35);
        g.fillCircle(c, c, 21);
        g.fillStyle(0xb45309, 1);
        g.fillCircle(c, c, 14.5);
        g.fillStyle(0xf59e0b, 1);
        g.fillCircle(c - 5, c, 8);
        g.fillCircle(c + 5, c, 8);
        g.fillCircle(c, c - 5, 8);
        g.fillCircle(c, c + 5, 8);
        g.fillStyle(0xfef9c3, 1);
        g.fillCircle(c, c, 9.5);
        g.lineStyle(2, 0xffffff, 0.95);
        g.strokeCircle(c, c, 12.5);
        g.generateTexture('wool_drop', 48, 48);
        g.destroy();
    }

    if (!scene.textures.exists('hay_bale')) {
        const g = scene.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0x0f172a, 0.24);
        g.fillEllipse(32, 39, 46, 24);
        g.fillStyle(0x92400e, 1);
        g.fillRoundedRect(8, 12, 48, 35, 11);
        g.fillStyle(0xd97706, 1);
        g.fillRoundedRect(10, 14, 44, 31, 10);
        g.fillStyle(0xfbbf24, 1);
        g.fillRoundedRect(12, 12, 40, 27, 9);
        g.lineStyle(2, 0xfef08a, 0.9);
        g.lineBetween(16, 19, 48, 19);
        g.lineBetween(16, 26, 48, 26);
        g.lineBetween(16, 33, 48, 33);
        g.fillStyle(0xdc2626, 1);
        g.fillRect(21, 12, 4.5, 29);
        g.fillRect(38.5, 12, 4.5, 29);
        g.generateTexture('hay_bale', 64, 56);
        g.destroy();
    }

    if (!scene.textures.exists('water_bubble')) {
        const g = scene.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0xbae6fd, 0.35);
        g.fillCircle(32, 32, 28);
        g.lineStyle(3.2, 0xffffff, 0.9);
        g.strokeCircle(32, 32, 28);
        g.fillStyle(0xffffff, 0.8);
        g.fillEllipse(21, 19, 11, 6.5);
        g.generateTexture('water_bubble', 64, 64);
        g.destroy();
    }

    if (!scene.textures.exists('warn_icon')) {
        const g = scene.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0xe11d48, 1);
        g.fillCircle(14, 14, 12.5);
        g.lineStyle(2.4, 0xffffff, 1);
        g.strokeCircle(14, 14, 12.5);
        g.fillStyle(0xffffff, 1);
        g.fillRoundedRect(12.2, 5.8, 3.6, 10, 1.5);
        g.fillCircle(14, 20.2, 2.1);
        g.generateTexture('warn_icon', 28, 28);
        g.destroy();
    }

    if (!scene.textures.exists('wolf_alert')) {
        const g = scene.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0xdc2626, 0.94);
        g.fillCircle(24, 24, 20);
        g.lineStyle(3.2, 0xffffff, 1);
        g.strokeCircle(24, 24, 20);
        g.fillStyle(0xffffff, 1);
        g.fillRoundedRect(21.5, 10.5, 5, 15.5, 2.2);
        g.fillCircle(24, 33.2, 3.2);
        g.generateTexture('wolf_alert', 48, 48);
        g.destroy();
    }

    if (!scene.textures.exists('flower_tulip')) {
        const g = scene.make.graphics({ x: 0, y: 0, add: false });
        const c = 24;
        g.fillStyle(0x0f172a, 0.16);
        g.fillEllipse(c, c + 10, 26, 12);
        g.fillStyle(0x15803d, 1);
        g.fillEllipse(c - 9, c + 6, 15, 7.5);
        g.fillEllipse(c + 9, c + 6, 15, 7.5);
        g.fillStyle(0xbe123c, 1);
        for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2;
            g.fillCircle(c + Math.cos(a) * 8.2, c + Math.sin(a) * 8.2, 7.8);
        }
        g.fillStyle(0xfb7185, 1);
        for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2;
            g.fillCircle(c + Math.cos(a) * 7.8, c + Math.sin(a) * 7.8, 6.4);
        }
        g.fillStyle(0xfde047, 1);
        g.fillCircle(c, c, 6);
        g.generateTexture('flower_tulip', 48, 48);
        g.destroy();
    }

    if (!scene.textures.exists('flower_spicy')) {
        const g = scene.make.graphics({ x: 0, y: 0, add: false });
        const c = 24;
        g.fillStyle(0x0f172a, 0.16);
        g.fillEllipse(c, c + 10, 26, 12);
        g.fillStyle(0x166534, 1);
        g.fillCircle(c - 8, c + 7, 6.5);
        g.fillCircle(c + 8, c + 7, 6.5);
        g.fillStyle(0xb91c1c, 1);
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            g.fillEllipse(c + Math.cos(a) * 9, c + Math.sin(a) * 9, 11.5, 7);
        }
        g.fillStyle(0xef4444, 1);
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            g.fillEllipse(c + Math.cos(a) * 8.6, c + Math.sin(a) * 8.6, 9.5, 5.6);
        }
        g.fillStyle(0xf97316, 1);
        g.fillCircle(c, c, 7);
        g.fillStyle(0xfef08a, 1);
        g.fillCircle(c, c, 3.6);
        g.generateTexture('flower_spicy', 48, 48);
        g.destroy();
    }

    if (!scene.textures.exists('flower_lavender')) {
        const g = scene.make.graphics({ x: 0, y: 0, add: false });
        const c = 24;
        g.fillStyle(0x0f172a, 0.16);
        g.fillEllipse(c, c + 10, 26, 12);
        g.fillStyle(0x15803d, 1);
        g.fillEllipse(c, c + 8, 19, 8.5);
        g.fillStyle(0x581c87, 1);
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            g.fillCircle(c + Math.cos(a) * 8.5, c + Math.sin(a) * 8.5, 6.8);
        }
        g.fillStyle(0xa855f7, 1);
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            g.fillCircle(c + Math.cos(a) * 8.2, c + Math.sin(a) * 8.2, 5.4);
        }
        g.fillStyle(0xe9d5ff, 1);
        g.fillCircle(c, c, 5);
        g.generateTexture('flower_lavender', 48, 48);
        g.destroy();
    }

    createStatusBadge(scene, 'badge_spicy', 0xef4444, 0xfef08a, (g, c) => {
        g.fillStyle(0xfef08a, 1);
        g.fillTriangle(c, c - 7, c - 5.5, c + 5, c + 5.5, c + 5);
        g.fillStyle(0xf97316, 1);
        g.fillCircle(c, c + 2.5, 4);
    });

    createStatusBadge(scene, 'badge_sleep', 0x6d28d9, 0xe9d5ff, (g, c) => {
        g.fillStyle(0xfef08a, 1);
        g.fillCircle(c - 1, c, 6.5);
        g.fillStyle(0x6d28d9, 1);
        g.fillCircle(c + 2.5, c - 2, 5.5);
    });

    createStatusBadge(scene, 'badge_fire', 0xea580c, 0xfde047, (g, c) => {
        g.fillStyle(0xfde047, 1);
        g.fillTriangle(c, c - 8, c - 6, c + 5, c + 6, c + 5);
        g.fillStyle(0xffffff, 0.9);
        g.fillTriangle(c, c - 3, c - 3, c + 4, c + 3, c + 4);
    });

    createStatusBadge(scene, 'badge_bee', 0xfacc15, 0x451a03, (g, c) => {
        g.fillStyle(0x451a03, 1);
        g.fillRect(c - 6, c - 3, 12, 2.5);
        g.fillRect(c - 6, c + 1.5, 12, 2.5);
    });

    createStatusBadge(scene, 'badge_scatter', 0xf97316, 0xffffff, (g, c) => {
        g.lineStyle(2.5, 0xffffff, 1);
        g.lineBetween(c - 5, c - 5, c + 5, c + 5);
        g.lineBetween(c + 5, c - 5, c - 5, c + 5);
    });

    createStatusBadge(scene, 'badge_shock', 0x0284c7, 0xfef08a, (g, c) => {
        g.fillStyle(0xfef08a, 1);
        g.fillTriangle(c + 1, c - 8, c - 5, c + 1, c + 1, c + 1);
        g.fillTriangle(c - 1, c + 8, c + 5, c - 1, c - 1, c - 1);
    });

    createStatusBadge(scene, 'badge_arctic', 0x0369a1, 0xbae6fd, (g, c) => {
        g.lineStyle(2.4, 0xffffff, 1);
        g.lineBetween(c, c - 7, c, c + 7);
        g.lineBetween(c - 7, c, c + 7, c);
        g.lineBetween(c - 5, c - 5, c + 5, c + 5);
        g.lineBetween(c + 5, c - 5, c - 5, c + 5);
    });

    createStatusBadge(scene, 'badge_rest', 0x334155, 0x93c5fd, (g, c) => {
        g.lineStyle(2.2, 0x93c5fd, 1);
        g.lineBetween(c - 6, c - 3, c + 5, c - 3);
        g.lineBetween(c - 4, c + 2, c + 6, c + 2);
    });
}