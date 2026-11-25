import { DISCOVERY_GUIDES, CARDS } from '../config/gameData.js';
import { gameState } from '../state/GameState.js';
import { icon } from './Icons.js';
import { sound } from '../utils/SoundGen.js';
import { showWelcomeTutorialModal } from './DiscoveryModal.js';

let escHandler = null;

export function removePauseModal() {
    if (escHandler) {
        window.removeEventListener('keydown', escHandler);
        escHandler = null;
    }
    document.getElementById('pause-modal')?.remove();
}

function renderSegmentedSlider(prefix, level) {
    return `
    <div class="pop-slider" data-slider="${prefix}">
      <button type="button" class="pop-slider-zero ${level === 0 ? 'is-active' : ''}" data-val="0" title="خاموش"></button>
      ${[1, 2, 3, 4, 5]
        .map(
            (v) => `
        <button type="button" class="pop-slider-seg ${v <= level ? 'is-filled' : ''} ${v === level ? 'is-knob' : ''}" data-val="${v}" title="${v * 20}%"></button>
      `
        )
        .join('')}
    </div>
  `;
}

export function showPauseModal({
                                   day,
                                   islandName,
                                   mode,
                                   onResume,
                                   onRetry,
                                   onRestart,
                                   onMainMenu,
                               }) {
    removePauseModal();
    sound.playClick();

    let activeView = 'settings'; // 'settings' | 'manual' | 'cards'

    const overlay = document.createElement('div');
    overlay.id = 'pause-modal';
    overlay.className = 'game-overlay z-top';

    const shell = document.createElement('div');
    shell.className = 'pop-shell';
    overlay.appendChild(shell);
    document.body.appendChild(overlay);

    const closeAndResume = () => {
        sound.playClick();
        removePauseModal();
        if (onResume) onResume();
    };

    escHandler = (e) => {
        if (e.key === 'Escape') {
            if (activeView !== 'settings') {
                sound.playClick();
                activeView = 'settings';
                render();
            } else {
                closeAndResume();
            }
        }
    };
    window.addEventListener('keydown', escHandler);

    const render = () => {
        const musicLvl = sound.getMusicLevel();
        const sfxLvl = sound.getSfxLevel();
        const activeEvos = gameState.getActiveEvolutions();
        const ownedCards = CARDS.filter((c) => gameState.getCardLevel(c.id) > 0);
        const discoveredGuides = gameState.meta.discovered
            .map((id) => DISCOVERY_GUIDES[id])
            .filter(Boolean);

        if (activeView === 'manual') {
            shell.className = 'pop-shell is-wide';
            shell.innerHTML = `
        <div class="pop-header">
          <h2 class="pop-title">دفترچه کشف‌ها</h2>
          <p class="pop-subtitle">${discoveredGuides.length} مورد کشف‌شده در جزیره‌ها</p>
        </div>

        <div class="pop-scroll-list">
          ${
                discoveredGuides.length > 0
                    ? `<div class="pop-two-col">
                ${discoveredGuides
                        .map(
                            (g) => `
                  <div class="pop-row" style="align-items:flex-start;">
                    <div class="pop-row-left" style="align-items:flex-start;">
                      <span class="pop-sticker is-yellow">${icon(g.icon, 20)}</span>
                      <div>
                        <div class="pop-label">${g.title}</div>
                        <div class="pop-sublabel" style="color:rgba(255,255,255,0.92);">${g.desc}</div>
                        <div class="pop-sublabel" style="color:#ffe047; margin-top:4px;">نکته: ${g.tip}</div>
                      </div>
                    </div>
                  </div>
                `
                        )
                        .join('')}
              </div>`
                    : `
            <div class="pop-row" style="justify-content:center; padding:26px;">
              <span class="pop-sublabel" style="font-size:13.5px;">هنوز مورد جدیدی کشف نشده؛ با پیشروی در مراحل اینجا ثبت می‌شوند.</span>
            </div>
          `
            }
        </div>

        <div class="pop-footer">
          <button type="button" id="btn-sub-done" class="pop-pill is-yellow is-full">
            <span>بازگشت</span>
          </button>
        </div>

        <button type="button" id="btn-sub-back" class="pop-back-btn" title="بازگشت">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>
        </button>
      `;

            const goBack = () => {
                sound.playClick();
                activeView = 'settings';
                render();
            };
            shell.querySelector('#btn-sub-back').addEventListener('click', goBack);
            shell.querySelector('#btn-sub-done').addEventListener('click', goBack);
            return;
        }

        if (activeView === 'cards') {
            shell.className = 'pop-shell';
            shell.innerHTML = `
        <div class="pop-header">
          <h2 class="pop-title">کارت‌های فعال</h2>
          <p class="pop-subtitle">قدرت‌ها و تکامل‌های فعال در این ران</p>
        </div>

        <div class="pop-scroll-list">
          ${
                activeEvos.length > 0
                    ? activeEvos
                        .map(
                            (e) => `
              <div class="pop-row" style="background:#b45309;">
                <div class="pop-row-left">
                  <span class="pop-sticker is-yellow">${icon(e.icon, 21)}</span>
                  <div>
                    <div class="pop-label" style="color:#ffe047;">تکامل: ${e.title}</div>
                    <div class="pop-sublabel">${e.desc}</div>
                  </div>
                </div>
              </div>
            `
                        )
                        .join('')
                    : ''
            }
          ${
                ownedCards.length > 0
                    ? ownedCards
                        .map(
                            (c) => `
              <div class="pop-row">
                <div class="pop-row-left">
                  <span class="pop-sticker">${icon(c.icon, 20)}</span>
                  <div>
                    <div class="pop-label">${c.title}</div>
                    <div class="pop-sublabel">${c.desc}</div>
                  </div>
                </div>
                <span class="pop-pill is-sm" style="pointer-events:none;">
                  سطح ${gameState.getCardLevel(c.id)}/${c.maxLevel}
                </span>
              </div>
            `
                        )
                        .join('')
                    : `
            <div class="pop-row" style="justify-content:center; padding:26px;">
              <span class="pop-sublabel" style="font-size:13.5px;">هنوز کارتی نخریده‌ای؛ پس از پایان مرحله از فروشگاه کارت انتخاب کن.</span>
            </div>
          `
            }
        </div>

        <div class="pop-footer">
          <button type="button" id="btn-sub-done" class="pop-pill is-yellow is-full">
            <span>بازگشت</span>
          </button>
        </div>

        <button type="button" id="btn-sub-back" class="pop-back-btn" title="بازگشت">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>
        </button>
      `;

            const goBack = () => {
                sound.playClick();
                activeView = 'settings';
                render();
            };
            shell.querySelector('#btn-sub-back').addEventListener('click', goBack);
            shell.querySelector('#btn-sub-done').addEventListener('click', goBack);
            return;
        }

        const canRetry = mode !== 'daily' && gameState.hasDaySnapshot();
        shell.className = 'pop-shell';
        shell.innerHTML = `
      <div class="pop-header">
        <h2 class="pop-title">توقف بازی</h2>
        <p class="pop-subtitle">${mode === 'daily' ? 'چالش روزانه' : 'حالت داستانی'} • مرحله ${day} (${islandName})</p>
      </div>

      <div class="pop-body">
        <div class="pop-row">
          <div class="pop-row-left">
            <span class="pop-sticker">${icon(musicLvl > 0 ? 'musicOn' : 'musicOff', 20)}</span>
            <span class="pop-label">موزیک</span>
          </div>
          ${renderSegmentedSlider('music', musicLvl)}
        </div>

        <div class="pop-row">
          <div class="pop-row-left">
            <span class="pop-sticker">${icon(sfxLvl > 0 ? 'soundOn' : 'soundOff', 20)}</span>
            <span class="pop-label">افکت صوتی</span>
          </div>
          ${renderSegmentedSlider('sfx', sfxLvl)}
        </div>

        <div class="pop-quick-grid">
          <button type="button" id="btn-pause-manual" class="pop-quick-btn">
            <span class="pop-sticker is-yellow">${icon('book', 20)}</span>
            <span>کشف‌ها (${discoveredGuides.length})</span>
          </button>
          <button type="button" id="btn-pause-cards" class="pop-quick-btn">
            <span class="pop-sticker">${icon('sparkle', 20)}</span>
            <span>کارت‌ها (${ownedCards.length})</span>
          </button>
          <button type="button" id="btn-pause-tut" class="pop-quick-btn">
            <span class="pop-sticker">${icon('target', 20)}</span>
            <span>راهنما</span>
          </button>
        </div>

        <div class="pop-grid-2">
          <button type="button" id="btn-pause-retry" class="pop-pill is-full" style="font-size:14px; padding:11px 12px;">
            ${icon('restart', 17)}
            <span>${canRetry ? 'تکرار مرحله' : 'شروع دوباره'}</span>
          </button>

          <button type="button" id="btn-pause-menu" class="pop-pill is-danger is-full" style="font-size:14px; padding:11px 12px;">
            ${icon('home', 17)}
            <span>منوی اصلی</span>
          </button>
        </div>
      </div>

      <div class="pop-footer">
        <button type="button" id="btn-pause-resume" class="pop-pill is-yellow is-full">
          ${icon('play', 19)}
          <span>ادامه بازی</span>
        </button>
      </div>

      <button type="button" id="btn-pause-back" class="pop-back-btn" title="ادامه بازی">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>
      </button>
    `;

        shell.querySelector('[data-slider="music"]').addEventListener('click', (e) => {
            const btn = e.target.closest('[data-val]');
            if (!btn) return;
            const val = Number(btn.getAttribute('data-val'));
            sound.setMusicLevel(val);
            gameState.meta.musicMuted = val === 0;
            gameState.saveMeta();
            sound.playClick();
            render();
        });

        shell.querySelector('[data-slider="sfx"]').addEventListener('click', (e) => {
            const btn = e.target.closest('[data-val]');
            if (!btn) return;
            const val = Number(btn.getAttribute('data-val'));
            sound.setSfxLevel(val);
            gameState.meta.sfxMuted = val === 0;
            gameState.saveMeta();
            if (val > 0) sound.playClick();
            render();
        });

        shell.querySelector('#btn-pause-manual').addEventListener('click', () => {
            sound.playClick();
            activeView = 'manual';
            render();
        });

        shell.querySelector('#btn-pause-cards').addEventListener('click', () => {
            sound.playClick();
            activeView = 'cards';
            render();
        });

        shell.querySelector('#btn-pause-tut').addEventListener('click', () => {
            showWelcomeTutorialModal(() => {});
        });

        shell.querySelector('#btn-pause-retry').addEventListener('click', () => {
            sound.playClick();
            removePauseModal();
            if (canRetry) {
                if (onRetry) onRetry();
            } else if (onRestart) {
                onRestart();
            }
        });

        shell.querySelector('#btn-pause-menu').addEventListener('click', () => {
            sound.playClick();
            removePauseModal();
            if (onMainMenu) onMainMenu();
        });

        shell.querySelector('#btn-pause-resume').addEventListener('click', closeAndResume);
        shell.querySelector('#btn-pause-back').addEventListener('click', closeAndResume);
    };

    render();
}