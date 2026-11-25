import { DISCOVERY_GUIDES } from '../config/gameData.js';
import { icon } from './Icons.js';
import { sound } from '../utils/SoundGen.js';

let discoveryEscHandler = null;

export function removeDiscoveryModal() {
    if (discoveryEscHandler) {
        window.removeEventListener('keydown', discoveryEscHandler);
        discoveryEscHandler = null;
    }
    document.getElementById('discovery-modal')?.remove();
}

/**
 * پنجره معرفی خودکار ویژگی‌ها، دشمنان، نقشه‌ها و باس‌های جدید
 */
export function showDiscoveryModal(guideId, onClose) {
    const guide = DISCOVERY_GUIDES[guideId];
    if (!guide) {
        if (onClose) onClose();
        return;
    }

    removeDiscoveryModal();
    sound.playDiscovery();

    const overlay = document.createElement('div');
    overlay.id = 'discovery-modal';
    overlay.className = 'game-overlay z-modal-high';

    overlay.innerHTML = `
    <div class="pop-shell">
      <div style="display:flex; justify-content:center; margin-bottom:2px;">
        <span class="pop-pill is-sm" style="pointer-events:none;">
          ${icon('sparkle', 15)}
          <span>${guide.tag}</span>
        </span>
      </div>

      <h2 class="pop-title">${guide.title}</h2>
      <p class="pop-subtitle">کشف جدید در جزیره</p>

      <div class="pop-row" style="align-items:flex-start; padding:16px 18px;">
        <div class="pop-row-left" style="align-items:flex-start;">
          <span class="pop-sticker is-yellow" style="width:52px; height:52px;">
            ${icon(guide.icon, 30)}
          </span>
          <div>
            <div class="pop-label" style="margin-bottom:4px;">معرفی</div>
            <div class="pop-sublabel" style="font-size:14px; color:#ffffff; line-height:1.8;">
              ${guide.desc}
            </div>
          </div>
        </div>
      </div>

      <div class="pop-row" style="align-items:flex-start; padding:15px 18px; background:rgba(11,14,20,0.24);">
        <div class="pop-row-left" style="align-items:flex-start;">
          <span class="pop-sticker">
            ${icon('target', 22)}
          </span>
          <div>
            <div class="pop-label" style="color:#ffe047; margin-bottom:3px;">نکته کلیدی</div>
            <div class="pop-sublabel" style="font-size:13.5px; color:rgba(255,255,255,0.94); line-height:1.75;">
              ${guide.tip}
            </div>
          </div>
        </div>
      </div>

      <button type="button" id="btn-discovery-ok" class="pop-pill is-yellow is-full" style="margin-top:8px;">
        ${icon('play', 19)}
        <span>متوجه شدم، ادامه بازی</span>
      </button>

      <button type="button" id="btn-discovery-back" class="pop-back-btn" title="ادامه بازی">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>
      </button>
    </div>
  `;

    document.body.appendChild(overlay);

    const finish = () => {
        sound.playClick();
        removeDiscoveryModal();
        if (onClose) onClose();
    };

    overlay.querySelector('#btn-discovery-ok').addEventListener('click', finish);
    overlay.querySelector('#btn-discovery-back').addEventListener('click', finish);

    discoveryEscHandler = (e) => {
        if (e.key === 'Escape' || e.key === 'Enter') finish();
    };
    window.addEventListener('keydown', discoveryEscHandler);
}

/**
 * پنجره آموزش مصور شروع بازی
 */
export function showWelcomeTutorialModal(onComplete) {
    removeDiscoveryModal();
    sound.playDiscovery();

    const overlay = document.createElement('div');
    overlay.id = 'discovery-modal';
    overlay.className = 'game-overlay z-modal-high';

    const steps = [
        {
            icon: 'whistle',
            badge: '۱',
            title: 'هدایت گله با تپ و سوایپ',
            text: 'پشت سر گوسفند (بین گوسفند و دریا) تپ کن تا با موج سوت به داخل برگردد، یا با سوایپ کوتاه گله را هدایت کن.',
        },
        {
            icon: 'lungs',
            badge: '۲',
            title: 'مدیریت نفس و پرهیز از ازدحام',
            text: 'نگه داشتن طولانی کلیک نفس چوپان را تمام می‌کند. با ضربه‌های کوتاه بازی کن و نگذار گوسفندها یک‌جا متراکم شوند.',
        },
        {
            icon: 'water',
            badge: '۳',
            title: 'تله آبی و تکامل کارت‌ها',
            text: 'گرگ‌ها را به داخل آب پرت کن تا ۲ برابر سکه بگیری! پایان هر مرحله کارت بخر و تکامل‌های افسانه‌ای بساز.',
        },
    ];

    overlay.innerHTML = `
    <div class="pop-shell">
      <h2 class="pop-title">راهنمای بازی</h2>
      <p class="pop-subtitle">سه اصل کلیدی برای زنده ماندن در جزیره‌ها و ثبت رکورد بالا</p>

      ${steps
        .map(
            (s) => `
        <div class="pop-row" style="align-items:flex-start; padding:15px 18px;">
          <div class="pop-row-left" style="align-items:flex-start;">
            <span class="pop-sticker is-yellow" style="width:46px; height:46px;">
              ${icon(s.icon, 25)}
            </span>
            <div>
              <div class="pop-label" style="margin-bottom:3px;">${s.badge}. ${s.title}</div>
              <div class="pop-sublabel" style="font-size:13px; color:rgba(255,255,255,0.92); line-height:1.75;">
                ${s.text}
              </div>
            </div>
          </div>
        </div>
      `
        )
        .join('')}

      <button type="button" id="btn-tut-start" class="pop-pill is-yellow is-full" style="margin-top:8px;">
        ${icon('play', 19)}
        <span>آماده‌ام، شروع کن</span>
      </button>

      <button type="button" id="btn-tut-back" class="pop-back-btn" title="بستن راهنما">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>
      </button>
    </div>
  `;

    document.body.appendChild(overlay);

    const finish = () => {
        sound.playClick();
        removeDiscoveryModal();
        if (onComplete) onComplete();
    };

    overlay.querySelector('#btn-tut-start').addEventListener('click', finish);
    overlay.querySelector('#btn-tut-back').addEventListener('click', finish);

    discoveryEscHandler = (e) => {
        if (e.key === 'Escape' || e.key === 'Enter') finish();
    };
    window.addEventListener('keydown', discoveryEscHandler);
}