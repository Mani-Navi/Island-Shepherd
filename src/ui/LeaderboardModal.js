import { fetchLeaderboard } from '../api/edgeClient.js';
import { getTodayDateKey } from '../config/gameData.js';
import { icon } from './Icons.js';
import { sound } from '../utils/SoundGen.js';

let lbEscHandler = null;

export function removeLeaderboardModal() {
    if (lbEscHandler) {
        window.removeEventListener('keydown', lbEscHandler);
        lbEscHandler = null;
    }
    document.getElementById('lb-modal')?.remove();
}

const STORAGE_LABELS = {
    'arvan-db': 'دیتابیس آروان',
    'arvan-kv': 'KV آروان‌کلاد',
    'edge-memory': 'لبه آروان‌کلاد',
};

export async function showLeaderboardModal(_defaultTab = 'normal', lastReceipt = null) {
    removeLeaderboardModal();

    const todayKey = getTodayDateKey();

    const overlay = document.createElement('div');
    overlay.id = 'lb-modal';
    overlay.className = 'game-overlay z-top';

    const receiptBannerHtml =
        lastReceipt && lastReceipt.ok && lastReceipt.verified
            ? `
      <div class="pop-row" style="background:#0f5132; padding:10px 14px;">
        <div class="pop-row-left">
          <span class="pop-sticker is-yellow" style="width:36px; height:36px;">${icon('sparkle', 19)}</span>
          <div>
            <div class="pop-label" style="font-size:13.5px; color:#ffe047;">
              ${lastReceipt.aiTitle ? `لقب جدید تو: ${escapeHtml(lastReceipt.aiTitle)}` : 'رکوردت روی لبه تایید شد'}
            </div>
            <div class="pop-sublabel" style="color:#ffffff;">
              ${escapeHtml(lastReceipt.chronicle || lastReceipt.message)}
            </div>
          </div>
        </div>
        ${
                lastReceipt.receiptSig
                    ? `<span class="pop-pill is-sm" style="pointer-events:none; font-size:10.5px;">
                     ${lastReceipt.cryptoVerified ? 'HMAC' : 'EDGE'} • ${escapeHtml(lastReceipt.receiptSig.slice(0, 8))}
                   </span>`
                    : ''
            }
      </div>
    `
            : '';

    overlay.innerHTML = `
    <div class="pop-shell is-wide">
      <div class="pop-header">
        <h2 class="pop-title">جدول رده‌بندی</h2>
        <p id="lb-subtitle" class="pop-subtitle">در حال دریافت از سرور آروان‌کلاد...</p>
      </div>

      ${receiptBannerHtml}

      <div id="lb-world-pulse" style="display:none;"></div>

      <div id="lb-list" class="pop-scroll-list"></div>

      <div class="pop-footer">
        <button type="button" id="lb-close" class="pop-pill is-yellow is-full">
          <span>بستن</span>
        </button>
      </div>

      <button type="button" id="lb-close-back" class="pop-back-btn" title="بازگشت">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>
      </button>
    </div>
  `;

    document.body.appendChild(overlay);

    const closeModal = () => {
        sound.playClick();
        removeLeaderboardModal();
    };

    overlay.querySelector('#lb-close').addEventListener('click', closeModal);
    overlay.querySelector('#lb-close-back').addEventListener('click', closeModal);

    lbEscHandler = (e) => {
        if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', lbEscHandler);

    const sub = overlay.querySelector('#lb-subtitle');
    const pulseEl = overlay.querySelector('#lb-world-pulse');
    const listEl = overlay.querySelector('#lb-list');

    const renderRankSticker = (idx) => {
        if (idx === 0) {
            return `<span class="pop-sticker is-yellow">${icon('crown', 21)}</span>`;
        }
        return `<span class="pop-sticker" style="font-size:15px; font-weight:900;">${idx + 1}</span>`;
    };

    const renderWorldPulse = (pulse) => {
        if (!pulse || !pulse.totalRunsVerified) {
            pulseEl.style.display = 'none';
            return;
        }
        pulseEl.style.display = 'block';
        pulseEl.innerHTML = `
      <div class="pop-row" style="justify-content:space-around; padding:8px 12px; background:#08486c;">
        <div style="text-align:center;">
          <div style="font-size:15px; font-weight:900; color:#ffe047;">${pulse.totalRunsVerified}</div>
          <div class="pop-sublabel" style="margin:0; font-size:11px;">رکورد تاییدشده</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:15px; font-weight:900; color:#4ade80;">${pulse.totalSheepSaved}</div>
          <div class="pop-sublabel" style="margin:0; font-size:11px;">گوسفند نجات‌یافته</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:15px; font-weight:900; color:#38bdf8;">${pulse.totalWolvesDefeated}</div>
          <div class="pop-sublabel" style="margin:0; font-size:11px;">گرگ دفع‌شده</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:15px; font-weight:900; color:#f0abfc;">${pulse.totalBossesSlain}</div>
          <div class="pop-sublabel" style="margin:0; font-size:11px;">باس مغلوب</div>
        </div>
      </div>
    `;
    };

    const { items, pulse, storage, source } = await fetchLeaderboard('normal', todayKey);
    if (!document.getElementById('lb-modal')) return;

    renderWorldPulse(pulse);

    const storageText = STORAGE_LABELS[storage] || 'لبه آروان‌کلاد';
    if (source === 'edge') {
        sub.textContent = `برترین چوپان‌های کل • ذخیره در ${storageText} • تاییدشده روی لبه`;
    } else {
        sub.textContent = 'برترین چوپان‌های کل • عدم اتصال به سرور آروان‌کلاد';
    }

    if (source !== 'edge') {
        listEl.innerHTML = `
        <div class="pop-row" style="justify-content:center; padding:26px; text-align:center;">
          <span class="pop-sublabel" style="font-size:13.5px;">
            اتصال به جدول آنلاین آروان‌کلاد برقرار نشد. در نسخه آنلاین تمام رکوردهای واقعی اینجا نمایش داده می‌شوند.
          </span>
        </div>
      `;
        return;
    }

    listEl.innerHTML = items.length
        ? items
            .slice(0, 12)
            .map(
                (row, idx) => `
        <div class="pop-row" style="${idx === 0 ? 'background:#0f74a8; border-color:#0b0e14;' : ''}">
          <div class="pop-row-left" style="align-items:flex-start;">
            ${renderRankSticker(idx)}
            <div style="min-width:0;">
              <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                <span class="pop-label">${escapeHtml(row.nickname)}</span>
                ${
                    row.aiTitle
                        ? `<span style="
                             font-size:10.5px; font-weight:900; background:#ffe047; color:#0b0e14;
                             border:1.5px solid #0b0e14; padding:1px 8px; border-radius:999px;
                           ">${escapeHtml(row.aiTitle)}</span>`
                        : ''
                }
                ${
                    row.cryptoVerified
                        ? `<span style="
                             font-size:10px; font-weight:900; background:#15803d; color:#ffffff;
                             padding:1px 7px; border-radius:999px;
                           ">امضای لبه</span>`
                        : ''
                }
              </div>
              <div class="pop-sublabel">
                تا مرحله ${row.dayReached}${row.chronicle ? ` • ${escapeHtml(row.chronicle)}` : ''}
              </div>
            </div>
          </div>
          <span class="pop-pill is-sm" style="pointer-events:none; color:#ffe047; flex-shrink:0;">
            <span>${row.score}</span>
            ${icon('star', 15)}
          </span>
        </div>
      `
            )
            .join('')
        : `
        <div class="pop-row" style="justify-content:center; padding:28px; text-align:center;">
          <span class="pop-sublabel" style="font-size:14px;">
            هنوز هیچ رکورد واقعی ثبت نشده؛ اولین نفری باش که اسمش و لقبش در جدول ثبت می‌شود!
          </span>
        </div>
      `;
}

function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, (m) => {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
        return map[m];
    });
}