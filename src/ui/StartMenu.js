import { SHEPHERD_CLASSES } from '../config/gameData.js';
import { gameState } from '../state/GameState.js';
import { sound } from '../utils/SoundGen.js';
import { icon } from './Icons.js';
import { showLeaderboardModal } from './LeaderboardModal.js';
import { showWelcomeTutorialModal } from './DiscoveryModal.js';

export function removeStartMenu() {
    document.getElementById('start-menu')?.remove();
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

export function showStartMenu({ onStart, onNewGame }) {
    removeStartMenu();

    let view = 'main'; // 'main' | 'classes' | 'settings'

    const overlay = document.createElement('div');
    overlay.id = 'start-menu';
    overlay.className = 'game-overlay';

    const shell = document.createElement('div');
    shell.className = 'pop-shell is-wide';
    overlay.appendChild(shell);
    document.body.appendChild(overlay);

    const render = () => {
        const hasSave = gameState.hasSavedProgress();
        const selectedId = gameState.meta.selectedClass || 'classic';
        const selectedCls = SHEPHERD_CLASSES[selectedId] || SHEPHERD_CLASSES.classic;
        const musicLvl = sound.getMusicLevel();
        const sfxLvl = sound.getSfxLevel();

        if (view === 'classes') {
            shell.className = 'pop-shell is-wide';
            shell.innerHTML = `
        <div class="pop-header">
          <h1 class="pop-title">کلاس چوپان</h1>
          <p class="pop-subtitle">کلاس دلخواه را انتخاب کن؛ با پیشروی کلاس‌های جدید آزاد می‌شوند</p>
        </div>

        <div class="pop-body">
          <div class="pop-two-col">
            ${Object.values(SHEPHERD_CLASSES)
                .map((cls) => {
                    const unlocked = gameState.isClassUnlocked(cls.id);
                    const isSelected = cls.id === selectedId;
                    const prog = gameState.getClassUnlockProgress(cls.id);
                    return `
                <button type="button" class="pop-card cls-btn ${isSelected ? 'is-selected' : ''} ${!unlocked ? 'is-locked' : ''}" data-cls="${cls.id}">
                  <div>
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
                      <span class="pop-sticker ${isSelected ? 'is-yellow' : ''}">${icon(cls.icon, 21)}</span>
                      <span class="pop-pill is-sm ${isSelected ? 'is-green' : ''}" style="pointer-events:none;">
                        ${unlocked ? (isSelected ? 'انتخاب شده' : 'آزاد') : prog}
                      </span>
                    </div>
                    <div class="pop-label" style="margin-bottom:3px;">${cls.name}</div>
                    <div class="pop-sublabel">${cls.desc}</div>
                  </div>
                </button>
              `;
                })
                .join('')}
          </div>
        </div>

        <div class="pop-footer">
          <button type="button" id="btn-classes-done" class="pop-pill is-yellow is-full">
            <span>تایید و بازگشت</span>
          </button>
        </div>

        <button type="button" id="btn-classes-back" class="pop-back-btn" title="بازگشت">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>
        </button>
      `;

            shell.querySelectorAll('.cls-btn').forEach((btn) => {
                btn.addEventListener('click', () => {
                    const cid = btn.getAttribute('data-cls');
                    if (gameState.selectClass(cid)) {
                        sound.playBuy();
                        render();
                    }
                });
            });

            const goBack = () => {
                sound.playClick();
                view = 'main';
                render();
            };
            shell.querySelector('#btn-classes-back').addEventListener('click', goBack);
            shell.querySelector('#btn-classes-done').addEventListener('click', goBack);
            return;
        }

        if (view === 'settings') {
            shell.className = 'pop-shell';
            shell.innerHTML = `
        <div class="pop-header">
          <h1 class="pop-title">تنظیمات صدا</h1>
          <p class="pop-subtitle">میزان صدای موزیک و افکت‌ها را تنظیم کن</p>
        </div>

        <div class="pop-body">
          <div class="pop-row">
            <div class="pop-row-left">
              <span class="pop-sticker">${icon(musicLvl > 0 ? 'musicOn' : 'musicOff', 20)}</span>
              <span class="pop-label">موزیک بازی</span>
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

          <div class="pop-row" style="justify-content:space-around; padding:12px;">
            <div style="text-align:center;">
              <div style="font-size:18px; font-weight:900; color:#ffe047;">${gameState.meta.maxDayReached}</div>
              <div class="pop-sublabel" style="margin:0;">رکورد مرحله</div>
            </div>
            <div style="text-align:center;">
              <div style="font-size:18px; font-weight:900; color:#ffe047;">${gameState.meta.totalWolvesScared}</div>
              <div class="pop-sublabel" style="margin:0;">دفع گرگ</div>
            </div>
            <div style="text-align:center;">
              <div style="font-size:18px; font-weight:900; color:#ffe047;">${gameState.meta.totalWaterKOs}</div>
              <div class="pop-sublabel" style="margin:0;">ناک‌اوت آبی</div>
            </div>
            <div style="text-align:center;">
              <div style="font-size:18px; font-weight:900; color:#ffe047;">${gameState.meta.totalBossesDefeated}</div>
              <div class="pop-sublabel" style="margin:0;">باس مغلوب</div>
            </div>
          </div>
        </div>

        <div class="pop-footer">
          <button type="button" id="btn-settings-done" class="pop-pill is-yellow is-full">
            <span>ذخیره و بازگشت</span>
          </button>
        </div>

        <button type="button" id="btn-settings-back" class="pop-back-btn" title="بازگشت">
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

            const goBack = () => {
                sound.playClick();
                view = 'main';
                render();
            };
            shell.querySelector('#btn-settings-back').addEventListener('click', goBack);
            shell.querySelector('#btn-settings-done').addEventListener('click', goBack);
            return;
        }

        shell.className = 'pop-shell is-wide';
        shell.innerHTML = `
      <div class="pop-header">
        <h1 class="pop-title">چوپان جزیره</h1>
        <p class="pop-subtitle">۱۰ مرحله چالشی • باس‌فایت کراکن و شاه گرگ‌ها • تکامل کارت‌ها</p>
      </div>

      <div class="pop-body">
        <div class="pop-two-col">
          <div class="pop-col">
            <div class="pop-row">
              <div class="pop-row-left">
                <span class="pop-sticker">${icon('shepherd', 20)}</span>
                <span class="pop-label">نام چوپان</span>
              </div>
              <input
                id="nick-input"
                class="pop-input"
                type="text"
                maxlength="18"
                placeholder="نام مستعار..."
                value="${gameState.nickname.replace(/"/g, '&quot;')}"
              />
            </div>

            <div class="pop-row is-clickable is-fill" id="row-class-pick">
              <div class="pop-row-left">
                <span class="pop-sticker is-yellow">${icon(selectedCls.icon, 20)}</span>
                <div>
                  <div class="pop-label">کلاس چوپان</div>
                  <div class="pop-sublabel hud-hide-mobile">${selectedCls.desc}</div>
                </div>
              </div>
              <button type="button" class="pop-pill is-sm">
                <span>${selectedCls.name}</span>
                <span class="pop-chevrons"><span class="pop-chevron-tri"></span></span>
              </button>
            </div>
          </div>

          <div class="pop-col">
            <div class="pop-quick-grid">
              <button type="button" id="btn-open-settings" class="pop-quick-btn">
                <span class="pop-sticker">${icon(sfxLvl > 0 || musicLvl > 0 ? 'soundOn' : 'soundOff', 20)}</span>
                <span>تنظیمات صدا</span>
              </button>
              <button type="button" id="btn-open-lb" class="pop-quick-btn">
                <span class="pop-sticker is-yellow">${icon('trophy', 20)}</span>
                <span>رده‌بندی</span>
              </button>
              <button type="button" id="btn-open-guide" class="pop-quick-btn">
                <span class="pop-sticker">${icon('book', 20)}</span>
                <span>راهنما</span>
              </button>
            </div>

            <div class="pop-row is-fill" style="justify-content:space-around; padding:10px 10px;">
              <div style="text-align:center;">
                <div style="font-size:17px; font-weight:900; color:#ffe047;">${gameState.meta.maxDayReached}</div>
                <div class="pop-sublabel" style="margin:0;">رکورد مرحله</div>
              </div>
              <div style="text-align:center;">
                <div style="font-size:17px; font-weight:900; color:#ffe047;">${gameState.meta.totalWolvesScared}</div>
                <div class="pop-sublabel" style="margin:0;">دفع گرگ</div>
              </div>
              <div style="text-align:center;">
                <div style="font-size:17px; font-weight:900; color:#ffe047;">${gameState.meta.totalWaterKOs}</div>
                <div class="pop-sublabel" style="margin:0;">ناک‌اوت آبی</div>
              </div>
              <div style="text-align:center;">
                <div style="font-size:17px; font-weight:900; color:#ffe047;">${gameState.meta.totalBossesDefeated}</div>
                <div class="pop-sublabel" style="margin:0;">باس مغلوب</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="pop-footer">
        <button type="button" id="btn-play" class="pop-pill is-yellow is-full" style="flex:2;">
          ${icon('play', 19)}
          <span>${hasSave ? `ادامه (مرحله ${gameState.data.day})` : 'شروع ماجراجویی'}</span>
        </button>
        ${
            hasSave
                ? `
          <button type="button" id="btn-new" class="pop-pill is-full" style="flex:1;">
            ${icon('restart', 17)}
            <span>ران جدید</span>
          </button>
        `
                : ''
        }
      </div>
    `;

        const saveNick = () => {
            const val = shell.querySelector('#nick-input')?.value || '';
            gameState.setNickname(val);
        };

        shell.querySelector('#row-class-pick').addEventListener('click', () => {
            sound.playClick();
            saveNick();
            view = 'classes';
            render();
        });

        shell.querySelector('#btn-open-settings').addEventListener('click', () => {
            sound.playClick();
            saveNick();
            view = 'settings';
            render();
        });

        shell.querySelector('#btn-play').addEventListener('click', () => {
            sound.playClick();
            saveNick();
            removeStartMenu();
            onStart();
        });

        shell.querySelector('#btn-new')?.addEventListener('click', () => {
            sound.playClick();
            saveNick();
            removeStartMenu();
            onNewGame();
        });

        shell.querySelector('#btn-open-lb').addEventListener('click', () => {
            sound.playClick();
            saveNick();
            showLeaderboardModal('normal');
        });

        shell.querySelector('#btn-open-guide').addEventListener('click', () => {
            saveNick();
            showWelcomeTutorialModal(() => {});
        });
    };

    render();
}