import {
    CARDS,
    HAY_CONFIG,
    REPELLENT_CONFIG,
    EVOLUTIONS,
    BOSS_CONFIG,
    MAX_CAMPAIGN_DAY,
    getIslandForDay,
    getDayConfig,
} from '../config/gameData.js';
import { gameState } from '../state/GameState.js';
import { sound } from '../utils/SoundGen.js';
import { icon } from './Icons.js';
import { submitScore } from '../api/edgeClient.js';
import { showLeaderboardModal } from './LeaderboardModal.js';

let guardTimer = null;
let resizeShopHandler = null;
let midShopEscHandler = null;

export function removeModal() {
    if (guardTimer) {
        clearTimeout(guardTimer);
        guardTimer = null;
    }
    if (resizeShopHandler) {
        window.removeEventListener('resize', resizeShopHandler);
        resizeShopHandler = null;
    }
    document.getElementById('day-modal')?.remove();
}

export function removeMidStageShopModal() {
    if (midShopEscHandler) {
        window.removeEventListener('keydown', midShopEscHandler);
        midShopEscHandler = null;
    }
    document.getElementById('mid-shop-modal')?.remove();
}

const RARITY_LABELS = {
    common: { tag: 'معمولی', bg: '#0b0e14', color: '#ffffff' },
    rare: { tag: 'کمیاب', bg: '#0284c7', color: '#ffffff' },
    epic: { tag: 'افسانه‌ای', bg: '#7c3aed', color: '#ffffff' },
};

/**
 * فروشگاه سریع در حین مراحل و صفحه شکست (بدون نیاز به بردن مرحله)
 */
export function showMidStageShopModal({ day, onClose }) {
    removeMidStageShopModal();
    sound.playClick();

    const cardsUnlocked = gameState.isMidStageCardsUnlocked(day);
    let rerollCount = 0;
    let boughtMap = new Map();
    let pendingReplaceCardId = null;
    let hayBoughtHere = 0;
    let repellentBoughtHere = false;
    let unlockedEvoToast = null;
    let draftCards = cardsUnlocked ? gameState.rollDraftCards(3) : [];

    const overlay = document.createElement('div');
    overlay.id = 'mid-shop-modal';
    overlay.className = 'game-overlay z-top';

    const shell = document.createElement('div');
    shell.className = cardsUnlocked ? 'pop-shell is-wide' : 'pop-shell';
    overlay.appendChild(shell);
    document.body.appendChild(overlay);

    const closeShop = () => {
        sound.playClick();
        removeMidStageShopModal();
        if (onClose) onClose();
    };

    midShopEscHandler = (e) => {
        if (e.key === 'Escape') closeShop();
    };
    window.addEventListener('keydown', midShopEscHandler);

    const willUnlockEvolution = (cardId) => {
        if (gameState.getCardLevel(cardId) > 0) return null;
        return (
            EVOLUTIONS.find(
                (evo) =>
                    evo.requires.includes(cardId) &&
                    evo.requires.every((req) => req === cardId || gameState.getCardLevel(req) >= 1)
            ) || null
        );
    };

    const renderReplacePicker = () => {
        if (!pendingReplaceCardId) return '';
        const newCard = CARDS.find((c) => c.id === pendingReplaceCardId);
        const ownedIds = gameState.getOwnedCardIds();
        return `
      <div class="pop-row is-column replace-picker-box">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
          <div class="pop-label" style="color:#ffe047;">
            اسلات کارت‌ها پر است! کدام کارت را با «${newCard?.title || ''}» جایگزین می‌کنی؟
          </div>
          <button type="button" id="btn-mid-cancel-replace" class="pop-pill is-sm is-danger">انصراف</button>
        </div>
        <div class="pop-grid-2">
          ${ownedIds
            .map((oid) => {
                const oc = CARDS.find((c) => c.id === oid);
                if (!oc) return '';
                const lvl = gameState.getCardLevel(oid);
                return `
              <button type="button" class="pop-pill is-white is-sm mid-replace-choice" data-replace="${oid}" style="justify-content:space-between; width:100%; border-radius:14px; padding:9px 12px;">
                <span style="display:inline-flex; align-items:center; gap:6px;">
                  ${icon(oc.icon, 16)}
                  <span>${oc.title} (سطح ${lvl})</span>
                </span>
                <span style="color:#be123c; font-size:11.5px;">جایگزینی</span>
              </button>
            `;
            })
            .join('')}
        </div>
      </div>
    `;
    };

    const render = () => {
        const d = gameState.data;
        const usedSlots = gameState.getOwnedCardIds().length;
        const maxSlots = gameState.getMaxCardSlots();
        const hayFull = d.hayCount >= HAY_CONFIG.MAX_STOCK;
        const rerollPrice = gameState.getRerollPrice(rerollCount);

        const cardsHtml = draftCards
            .map((c) => {
                const rm = RARITY_LABELS[c.rarity] || RARITY_LABELS.common;
                const currLvl = gameState.getCardLevel(c.id);
                const boughtHere = boughtMap.has(c.id);
                const purchaseInfo = boughtMap.get(c.id);
                const price = boughtHere ? purchaseInfo.pricePaid : gameState.getCardPrice(c);
                const isMaxedBefore = !boughtHere && currLvl >= c.maxLevel;
                const canAfford = !boughtHere && !isMaxedBefore && d.gold >= price;
                const needsReplace = !boughtHere && !isMaxedBefore && !gameState.canBuyWithoutReplace(c.id);
                const evoHint = !boughtHere && !isMaxedBefore ? willUnlockEvolution(c.id) : null;

                const cardClasses = [
                    'pop-card',
                    evoHint ? 'is-evolution' : '',
                    boughtHere ? 'is-bought' : '',
                    !boughtHere && (!canAfford || isMaxedBefore) ? 'is-locked' : '',
                ]
                    .filter(Boolean)
                    .join(' ');

                return `
          <button type="button" class="${cardClasses}" data-card="${c.id}">
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; margin-bottom:7px;">
                <span class="pop-sticker ${evoHint || boughtHere ? 'is-yellow' : ''}" style="width:36px; height:36px;">
                  ${icon(c.icon, 20)}
                </span>
                <span style="font-size:10px; font-weight:900; background:${rm.bg}; color:${rm.color}; padding:2px 8px; border-radius:999px;">
                  ${rm.tag} • ${currLvl}/${c.maxLevel}
                </span>
              </div>
              <div class="pop-label" style="margin-bottom:4px;">${c.title}</div>
              <div class="card-benefit-line">+ ${c.benefit || c.desc}</div>
              ${c.cost ? `<div class="card-cost-line">- ${c.cost}</div>` : ''}
            </div>
            <div class="pop-pill is-sm ${boughtHere ? 'is-green' : canAfford ? '' : 'is-disabled'}" style="width:100%; pointer-events:none;">
              ${
                    boughtHere
                        ? `${icon('check', 15)}<span>خریداری شد (لغو)</span>`
                        : isMaxedBefore
                            ? `<span>حداکثر سطح</span>`
                            : needsReplace
                                ? `${icon('coin', 15)}<span>${price} سکه (جایگزینی)</span>`
                                : `${icon('coin', 15)}<span>${price} سکه</span>`
                }
            </div>
          </button>
        `;
            })
            .join('');

        shell.innerHTML = `
      <div class="pop-header">
        <h2 class="pop-title">فروشگاه مرحله ${day}</h2>
        <div style="display:flex; justify-content:center; gap:8px; margin-top:4px; flex-wrap:wrap;">
          <span class="pop-pill is-sm" style="pointer-events:none; color:#ffe047;">
            ${icon('coin', 15)}<span>${d.gold} سکه</span>
          </span>
          ${
            cardsUnlocked
                ? `<span class="pop-pill is-sm" style="pointer-events:none;">
                     ${icon('sparkle', 14)}<span>اسلات ${usedSlots}/${maxSlots}</span>
                   </span>`
                : ''
        }
        </div>
      </div>

      <div class="pop-body">
        ${renderReplacePicker()}
        ${
            unlockedEvoToast
                ? `<div class="pop-row" style="background:#b45309;">
             <div class="pop-row-left">
               <span class="pop-sticker is-yellow">${icon(unlockedEvoToast.icon, 20)}</span>
               <div>
                 <div class="pop-label" style="color:#ffe047;">تکامل آزاد شد: ${unlockedEvoToast.title}</div>
                 <div class="pop-sublabel">${unlockedEvoToast.desc}</div>
               </div>
             </div>
           </div>`
                : ''
        }

        <div class="pop-grid-2">
          <div class="pop-row" style="padding:10px 12px;">
            <div class="pop-row-left">
              <span class="pop-sticker" style="width:36px; height:36px;">${icon('hay', 19)}</span>
              <div>
                <div class="pop-label" style="font-size:13.5px;">علوفه (${d.hayCount}/${HAY_CONFIG.MAX_STOCK})</div>
                <div class="pop-sublabel">جذب گله + امن در برابر صاعقه</div>
              </div>
            </div>
            <div style="display:flex; gap:5px;">
              <button type="button" id="mid-buy-hay" class="pop-pill is-sm ${hayFull || d.gold < HAY_CONFIG.PRICE ? 'is-disabled' : ''}">
                <span>${hayFull ? 'تکمیل' : `${HAY_CONFIG.PRICE} سکه`}</span>
              </button>
              ${
            hayBoughtHere > 0
                ? `<button type="button" id="mid-refund-hay" class="pop-pill is-sm is-danger">لغو</button>`
                : ''
        }
            </div>
          </div>

          <div class="pop-row" style="padding:10px 12px;">
            <div class="pop-row-left">
              <span class="pop-sticker" style="width:36px; height:36px;">${icon('shield', 19)}</span>
              <div>
                <div class="pop-label" style="font-size:13.5px;">دافع گل</div>
                <div class="pop-sublabel">دور کردن گوسفندها از باغچه</div>
              </div>
            </div>
            <button type="button" id="mid-buy-repellent" class="pop-pill is-sm ${repellentBoughtHere ? 'is-green' : !d.flowerRepellent && d.gold >= REPELLENT_CONFIG.PRICE ? '' : 'is-disabled'}">
              <span>${repellentBoughtHere ? 'فعال (لغو)' : d.flowerRepellent ? 'فعال' : `${REPELLENT_CONFIG.PRICE} سکه`}</span>
            </button>
          </div>
        </div>

        ${
            cardsUnlocked
                ? `
          <div class="pop-row" style="padding:8px 12px;">
            <div class="pop-row-left">
              <span class="pop-sticker" style="width:34px; height:34px;">${icon('sparkle', 18)}</span>
              <span class="pop-label">کارت‌های قدرت</span>
            </div>
            <button type="button" id="mid-btn-reroll" class="pop-pill is-sm ${rerollPrice === 0 ? 'is-green' : ''} ${d.gold < rerollPrice ? 'is-disabled' : ''}">
              ${icon('dice', 15)}
              <span>${rerollPrice === 0 ? 'تعویض رایگان' : `تعویض (${rerollPrice} سکه)`}</span>
            </button>
          </div>
          <div class="pop-grid-3">${cardsHtml}</div>
        `
                : `
          <div class="pop-row" style="background:#08486c;">
            <div class="pop-row-left">
              <span class="pop-sticker">${icon('lock', 20)}</span>
              <div>
                <div class="pop-label">کارت‌های قدرت (بازگشایی از مرحله ۳)</div>
                <div class="pop-sublabel">فعلاً می‌توانی از همینجا علوفه و دافع گل بخری.</div>
              </div>
            </div>
          </div>
        `
        }
      </div>

      <div class="pop-footer">
        <button type="button" id="btn-mid-shop-close" class="pop-pill is-yellow is-full">
          ${icon('play', 18)}
          <span>بازگشت و ادامه</span>
        </button>
      </div>

      <button type="button" id="btn-mid-shop-back" class="pop-back-btn" title="بازگشت">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>
      </button>
    `;

        shell.querySelector('#btn-mid-cancel-replace')?.addEventListener('click', () => {
            sound.playCancel();
            pendingReplaceCardId = null;
            render();
        });

        shell.querySelectorAll('.mid-replace-choice[data-replace]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const oldId = btn.getAttribute('data-replace');
                const newId = pendingReplaceCardId;
                if (!oldId || !newId) return;
                const res = gameState.buyDraftCard(newId, oldId);
                pendingReplaceCardId = null;
                if (res.ok) {
                    boughtMap.set(newId, res);
                    if (res.newEvolutions.length > 0) {
                        unlockedEvoToast = res.newEvolutions[0];
                        sound.playEvolution();
                    } else {
                        sound.playFever();
                    }
                    render();
                }
            });
        });

        shell.querySelectorAll('.pop-card[data-card]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const cid = btn.getAttribute('data-card');
                if (boughtMap.has(cid)) {
                    const info = boughtMap.get(cid);
                    if (gameState.refundDraftCard(cid, info)) {
                        boughtMap.delete(cid);
                        pendingReplaceCardId = null;
                        if (unlockedEvoToast && !gameState.hasEvolution(unlockedEvoToast.id)) {
                            unlockedEvoToast = null;
                        }
                        sound.playCancel();
                        render();
                    }
                    return;
                }

                const card = CARDS.find((c) => c.id === cid);
                if (!card) return;
                const price = gameState.getCardPrice(card);
                if (gameState.getCardLevel(cid) >= card.maxLevel || gameState.data.gold < price) return;

                if (!gameState.canBuyWithoutReplace(cid)) {
                    sound.playClick();
                    pendingReplaceCardId = cid;
                    render();
                    return;
                }

                const res = gameState.buyDraftCard(cid);
                if (res.ok) {
                    boughtMap.set(cid, res);
                    pendingReplaceCardId = null;
                    if (res.newEvolutions.length > 0) {
                        unlockedEvoToast = res.newEvolutions[0];
                        sound.playEvolution();
                    } else {
                        sound.playFever();
                    }
                    render();
                }
            });
        });

        shell.querySelector('#mid-btn-reroll')?.addEventListener('click', () => {
            const wasFree = rerollPrice === 0;
            if (gameState.spendReroll(rerollPrice)) {
                if (!wasFree) rerollCount++;
                boughtMap = new Map();
                pendingReplaceCardId = null;
                sound.playBuy();
                draftCards = gameState.rollDraftCards(3);
                render();
            }
        });

        shell.querySelector('#mid-buy-hay')?.addEventListener('click', () => {
            if (gameState.buyHay()) {
                hayBoughtHere += 1;
                sound.playBuy();
                render();
            }
        });

        shell.querySelector('#mid-refund-hay')?.addEventListener('click', () => {
            if (hayBoughtHere > 0 && gameState.refundHay()) {
                hayBoughtHere -= 1;
                sound.playCancel();
                render();
            }
        });

        shell.querySelector('#mid-buy-repellent')?.addEventListener('click', () => {
            if (repellentBoughtHere) {
                if (gameState.refundFlowerRepellent()) {
                    repellentBoughtHere = false;
                    sound.playCancel();
                    render();
                }
                return;
            }
            if (gameState.buyFlowerRepellent()) {
                repellentBoughtHere = true;
                sound.playBuy();
                render();
            }
        });

        shell.querySelector('#btn-mid-shop-close').addEventListener('click', closeShop);
        shell.querySelector('#btn-mid-shop-back').addEventListener('click', closeShop);
    };

    render();
}

export function showEndOfDayModal({
                                      isVictory,
                                      isCampaignVictory = false,
                                      completedDay,
                                      quota,
                                      stats,
                                      failReason = 'quota',
                                      bossMilestone = null,
                                      newlyUnlockedClasses = [],
                                      onNextDay,
                                      onRetryDay,
                                      onRestartGame,
                                      onReturnToMenu,
                                  }) {
    removeModal();

    const shopUnlocked = isVictory && !isCampaignVictory && gameState.isCardShopUnlocked(completedDay);

    let scoreSubmitted = false;
    let isSubmitting = false;
    let scoreReceipt = null;
    let rerollCount = 0;
    let boughtMap = new Map();
    let pendingReplaceCardId = null;
    let hayBoughtHere = 0;
    let repellentBoughtHere = false;
    let unlockedEvoToast = null;
    let mobileTab = shopUnlocked ? 'shop' : 'summary';
    let lastWasMobile = window.innerWidth <= 780;
    let draftCards = shopUnlocked ? gameState.rollDraftCards(3) : [];

    const overlay = document.createElement('div');
    overlay.id = 'day-modal';
    overlay.className = 'game-overlay shop-click-guard';

    const shell = document.createElement('div');
    shell.className = shopUnlocked ? 'pop-shell is-wide' : 'pop-shell';
    overlay.appendChild(shell);
    document.body.appendChild(overlay);

    guardTimer = setTimeout(() => {
        overlay.classList.remove('shop-click-guard');
        guardTimer = null;
    }, 650);

    const willUnlockEvolution = (cardId) => {
        if (gameState.getCardLevel(cardId) > 0) return null;
        return (
            EVOLUTIONS.find(
                (evo) =>
                    evo.requires.includes(cardId) &&
                    evo.requires.every((req) => req === cardId || gameState.getCardLevel(req) >= 1)
            ) || null
        );
    };

    const doSubmitScore = async () => {
        if (scoreSubmitted || isSubmitting || gameState.data.totalScore <= 0) return scoreReceipt;
        isSubmitting = true;
        render();

        const res = await submitScore({
            nickname: gameState.nickname,
            score: gameState.data.totalScore,
            dayReached: completedDay,
            runLog: gameState.data.runLog,
            runToken: gameState.data.runToken || null,
            classId: gameState.data.classId || 'classic',
            wolvesDefeated: gameState.data.runWolvesDefeated || 0,
            bossesDefeated: gameState.data.runBossesDefeated || 0,
            mode: 'normal',
            dateKey: gameState.dailyDateKey,
        });

        isSubmitting = false;
        if (res?.ok && res.verified) {
            scoreSubmitted = true;
            scoreReceipt = res;
        } else if (res) {
            scoreReceipt = res;
        }
        render();
        return scoreReceipt;
    };

    const renderReceiptCard = () => {
        if (!scoreReceipt) return '';
        if (scoreReceipt.ok && scoreReceipt.verified) {
            const sigShort = scoreReceipt.receiptSig ? scoreReceipt.receiptSig.slice(0, 10) : '';
            return `
        <div class="pop-row" style="background:#0f5132; border-color:#0b0e14;">
          <div class="pop-row-left">
            <span class="pop-sticker is-yellow">${icon('shield', 20)}</span>
            <div>
              <div class="pop-label" style="color:#ffe047;">
                ${scoreReceipt.aiTitle ? `لقب تو: ${scoreReceipt.aiTitle}` : 'امتیاز روی لبه تایید شد'}
              </div>
              <div class="pop-sublabel" style="color:#ffffff;">
                ${scoreReceipt.chronicle || scoreReceipt.message}
              </div>
            </div>
          </div>
          <span class="pop-pill is-sm" style="pointer-events:none; font-size:11px;">
            ${scoreReceipt.cryptoVerified ? 'امضا HMAC' : 'تایید لبه'}${sigShort ? ` • ${sigShort}` : ''}
          </span>
        </div>
      `;
        }
        return `
      <div class="pop-row" style="background:#7f1d1d;">
        <div class="pop-row-left">
          <span class="pop-sticker">${icon('alert', 19)}</span>
          <div class="pop-sublabel" style="color:#ffffff;">${scoreReceipt.message || 'ثبت رکورد انجام نشد.'}</div>
        </div>
      </div>
    `;
    };

    const renderBossMilestoneBanner = () => {
        if (!bossMilestone) return '';
        return `
      <div class="pop-row boss-milestone-banner">
        <div class="pop-row-left" style="align-items:flex-start;">
          <span class="pop-sticker is-yellow" style="width:44px; height:44px;">${icon('crown', 24)}</span>
          <div>
            <div class="pop-label" style="color:#ffe047; font-size:15.5px;">
              ${bossMilestone.escalationTitle}
            </div>
            <div class="pop-sublabel" style="color:#ffffff; margin-top:3px;">
              ${bossMilestone.escalationDesc}
            </div>
            <div class="pop-sublabel" style="color:#fde047; font-weight:900; margin-top:4px;">
              ${bossMilestone.perkTitle}: ${bossMilestone.perkDesc}
            </div>
          </div>
        </div>
      </div>
    `;
    };

    const renderReplacePicker = () => {
        if (!pendingReplaceCardId) return '';
        const newCard = CARDS.find((c) => c.id === pendingReplaceCardId);
        const ownedIds = gameState.getOwnedCardIds();
        return `
      <div class="pop-row is-column replace-picker-box">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
          <div class="pop-label" style="color:#ffe047;">
            اسلات کارت‌ها پر است! کدام کارت را با «${newCard?.title || ''}» جایگزین می‌کنی؟
          </div>
          <button type="button" id="btn-cancel-replace" class="pop-pill is-sm is-danger">انصراف</button>
        </div>
        <div class="pop-grid-2">
          ${ownedIds
            .map((oid) => {
                const oc = CARDS.find((c) => c.id === oid);
                if (!oc) return '';
                const lvl = gameState.getCardLevel(oid);
                return `
              <button type="button" class="pop-pill is-white is-sm replace-choice" data-replace="${oid}" style="justify-content:space-between; width:100%; border-radius:14px; padding:9px 12px;">
                <span style="display:inline-flex; align-items:center; gap:6px;">
                  ${icon(oc.icon, 16)}
                  <span>${oc.title} (سطح ${lvl})</span>
                </span>
                <span style="color:#be123c; font-size:11.5px;">جایگزینی</span>
              </button>
            `;
            })
            .join('')}
        </div>
      </div>
    `;
    };

    const render = () => {
        const isMobile = window.innerWidth <= 780;

        // =========================================================
        // صفحه ویژه پیروزی نهایی و پایان رسمی بازی (پس از مرحله ۱۰)
        // =========================================================
        if (isVictory && isCampaignVictory) {
            const d = gameState.data;
            const activeEvos = gameState.getActiveEvolutions();
            const ownedCards = CARDS.filter((c) => gameState.getCardLevel(c.id) > 0);

            shell.className = 'pop-shell';
            shell.innerHTML = `
        <div class="pop-header">
          <div style="display:flex; justify-content:center; margin-bottom:4px;">
            <span class="pop-pill is-sm is-yellow" style="pointer-events:none;">
              ${icon('crown', 16)}
              <span>پایان بازی • فتح هر ${MAX_CAMPAIGN_DAY} مرحله</span>
            </span>
          </div>
          <h2 class="pop-title">پیروزی نهایی!</h2>
          <p class="pop-subtitle">شاه گرگ‌ها شکست خورد و آرامش برای همیشه به جزیره بازگشت</p>
        </div>

        <div class="pop-body">
          ${renderBossMilestoneBanner()}

          <div class="pop-grid-2">
            <div class="pop-row" style="justify-content:center; flex-direction:column; gap:4px; padding:12px;">
              <div class="pop-sublabel" style="margin:0;">امتیاز نهایی</div>
              <div class="pop-label" style="font-size:22px; color:#ffe047; display:inline-flex; align-items:center; gap:5px;">
                ${icon('star', 19)}<span>${d.totalScore}</span>
              </div>
            </div>

            <div class="pop-row" style="justify-content:center; flex-direction:column; gap:4px; padding:12px;">
              <div class="pop-sublabel" style="margin:0;">گرگ‌های دفع‌شده / باس‌ها</div>
              <div class="pop-label" style="font-size:19px; color:#4ade80;">
                ${d.runWolvesDefeated || 0} گرگ • ${d.runBossesDefeated || 0} باس
              </div>
            </div>
          </div>

          ${
                ownedCards.length > 0
                    ? `<div class="pop-row is-column">
               <span class="pop-label" style="font-size:13.5px;">بیلد قهرمانی تو (${ownedCards.length} کارت)</span>
               <div style="display:flex; flex-wrap:wrap; gap:6px;">
                 ${activeEvos
                        .map(
                            (e) =>
                                `<span class="pop-pill is-sm is-yellow" style="pointer-events:none;">${icon(e.icon, 13)}<span>تکامل: ${e.title}</span></span>`
                        )
                        .join('')}
                 ${ownedCards
                        .map(
                            (c) =>
                                `<span class="pop-pill is-sm" style="pointer-events:none;">${icon(c.icon, 13)}<span>${c.title} (${gameState.getCardLevel(c.id)})</span></span>`
                        )
                        .join('')}
               </div>
             </div>`
                    : ''
            }

          ${renderReceiptCard()}

          ${
                newlyUnlockedClasses.length > 0
                    ? `<div class="pop-row" style="background:#15803d;">
               <div class="pop-row-left">
                 <span class="pop-sticker is-yellow">${icon('sparkle', 19)}</span>
                 <div class="pop-label">کلاس جدید آزاد شد: ${newlyUnlockedClasses.map((c) => c.name).join('، ')}</div>
               </div>
             </div>`
                    : ''
            }

          <button type="button" id="btn-victory-lb" class="pop-pill is-green is-full" ${isSubmitting ? 'disabled' : ''}>
            ${icon('trophy', 18)}
            <span>${isSubmitting ? 'در حال تایید روی لبه...' : scoreSubmitted ? 'مشاهده جدول رده‌بندی' : 'ثبت رکورد قهرمانی و دریافت لقب هوشمند'}</span>
          </button>
        </div>

        <div class="pop-footer">
          <button type="button" id="btn-victory-restart" class="pop-pill is-yellow is-full" style="flex:1.4;">
            ${icon('restart', 18)}
            <span>شروع ماجراجویی جدید</span>
          </button>

          <button type="button" id="btn-victory-menu" class="pop-pill is-full" style="flex:1;">
            ${icon('home', 17)}
            <span>منوی اصلی</span>
          </button>
        </div>
      `;

            shell.querySelector('#btn-victory-lb').addEventListener('click', async () => {
                sound.playClick();
                const receipt = await doSubmitScore();
                showLeaderboardModal('normal', receipt);
            });
            shell.querySelector('#btn-victory-restart').addEventListener('click', () => {
                sound.playClick();
                removeModal();
                onRestartGame();
            });
            shell.querySelector('#btn-victory-menu').addEventListener('click', () => {
                sound.playClick();
                removeModal();
                onReturnToMenu();
            });
            return;
        }

        // =========================================================
        // صفحه شکست در مرحله (همراه با دسترسی به فروشگاه قبل از تلاش مجدد)
        // =========================================================
        if (!isVictory) {
            const canRetry = gameState.hasDaySnapshot();
            const isBossTimeout = failReason === 'boss_timeout';

            shell.className = 'pop-shell';
            shell.innerHTML = `
        <div class="pop-header">
          <h2 class="pop-title">
            ${isBossTimeout ? 'اتمام زمان نبرد' : 'پایان مرحله ' + completedDay}
          </h2>
          <p class="pop-subtitle">
            ${
                isBossTimeout
                    ? `باس مرحله ${completedDay} پیش از اتمام تایمر شکست نخورد`
                    : `برای عبور از مرحله ${completedDay} حداقل ${quota} گوسفند لازم بود`
            }
          </p>
        </div>

        <div class="pop-body">
          <div class="pop-grid-2">
            <div class="pop-row" style="justify-content:center; flex-direction:column; gap:4px; padding:12px;">
              <div class="pop-sublabel" style="margin:0;">سکه / علوفه باقی‌مانده</div>
              <div class="pop-label" style="font-size:18px; color:#ffe047; display:inline-flex; align-items:center; gap:8px;">
                <span>${gameState.data.gold} سکه</span>
                <span>•</span>
                <span>${gameState.data.hayCount} علوفه</span>
              </div>
            </div>

            <div class="pop-row" style="justify-content:center; flex-direction:column; gap:4px; padding:12px;">
              <div class="pop-sublabel" style="margin:0;">امتیاز کل</div>
              <div class="pop-label" style="font-size:20px; color:#ffe047; display:inline-flex; align-items:center; gap:5px;">
                ${icon('star', 18)}<span>${gameState.data.totalScore}</span>
              </div>
            </div>
          </div>

          ${renderReceiptCard()}

          ${
                newlyUnlockedClasses.length > 0
                    ? `<div class="pop-row" style="background:#15803d;">
               <div class="pop-row-left">
                 <span class="pop-sticker is-yellow">${icon('sparkle', 19)}</span>
                 <div>
                   <div class="pop-label">کلاس جدید آزاد شد!</div>
                   <div class="pop-sublabel">${newlyUnlockedClasses.map((c) => c.name).join('، ')}</div>
                 </div>
               </div>
             </div>`
                    : ''
            }

          <button type="button" id="btn-fail-shop" class="pop-pill is-green is-full" style="font-size:14.5px; padding:11px 14px;">
            ${icon('coin', 18)}
            <span>فروشگاه (خرید علوفه، دافع گل یا کارت)</span>
          </button>

          <div class="pop-grid-2">
            <button type="button" id="btn-fail-lb" class="pop-pill is-full" style="font-size:13px; padding:11px 10px;" ${isSubmitting ? 'disabled' : ''}>
              ${icon('trophy', 17)}
              <span>${isSubmitting ? 'در حال تایید...' : scoreSubmitted ? 'مشاهده رده‌بندی' : 'ثبت رکورد روی لبه'}</span>
            </button>

            <button type="button" id="btn-fail-restart" class="pop-pill is-full" style="font-size:13px; padding:11px 10px;">
              ${icon('restart', 17)}
              <span>شروع ران جدید (مرحله ۱)</span>
            </button>
          </div>
        </div>

        ${
                canRetry
                    ? `<div class="pop-footer">
            <button type="button" id="btn-retry-day" class="pop-pill is-yellow is-full" style="font-size:16px; padding:13px;">
              ${icon('play', 20)}
              <span>تلاش دوباره همین مرحله (مرحله ${completedDay})</span>
            </button>
          </div>`
                    : ''
            }

        <button type="button" id="btn-menu-back" class="pop-back-btn" title="بازگشت به منوی اصلی">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>
        </button>
      `;

            shell.querySelector('#btn-fail-shop').addEventListener('click', () => {
                showMidStageShopModal({
                    day: completedDay,
                    onClose: () => render(),
                });
            });
            shell.querySelector('#btn-retry-day')?.addEventListener('click', () => {
                sound.playClick();
                removeModal();
                onRetryDay();
            });
            shell.querySelector('#btn-fail-restart').addEventListener('click', () => {
                sound.playClick();
                removeModal();
                onRestartGame();
            });
            shell.querySelector('#btn-fail-lb').addEventListener('click', async () => {
                sound.playClick();
                const receipt = await doSubmitScore();
                showLeaderboardModal('normal', receipt);
            });
            shell.querySelector('#btn-menu-back').addEventListener('click', () => {
                sound.playClick();
                removeModal();
                onReturnToMenu();
            });
            return;
        }

        const d = gameState.data;
        const nextIsland = getIslandForDay(d.day, false, gameState.dailyDateKey);
        const nextCfg = getDayConfig(d.day, false, gameState.dailyDateKey, gameState.getWorldTier());
        const nextFlockCount = gameState.buildStageFlock(d.day).length;
        const nextBoss = nextCfg.bossType ? BOSS_CONFIG[nextCfg.bossType] : null;

        const incomeParts = [
            `گله (${stats.aliveSheep}): +${stats.sheepGold}`,
            `گل (${stats.aliveFlowerCount}): +${stats.flowerGold}`,
        ];
        if (stats.bonusGold > 0) incomeParts.push(`جوایز: +${stats.bonusGold}`);
        if (stats.missionGold > 0) incomeParts.push(`ماموریت: +${stats.missionGold}`);
        if (stats.bossGold > 0) incomeParts.push(`باس: +${stats.bossGold}`);
        if (stats.dogUpkeep > 0) incomeParts.push(`نگهداری سگ: -${stats.dogUpkeep}`);

        // =========================================================
        // پایان مرحله ۱: فروشگاه کارت‌ها هنوز قفل است
        // =========================================================
        if (!shopUnlocked) {
            shell.className = 'pop-shell';
            shell.innerHTML = `
        <div class="pop-header">
          <h2 class="pop-title">پیروزی مرحله ${completedDay}</h2>
          <p class="pop-subtitle">شروع عالی! یک مرحله دیگر تا باز شدن فروشگاه کارت‌های قدرت</p>
        </div>

        <div class="pop-body">
          <div class="pop-row">
            <div class="pop-row-left">
              <span class="pop-sticker is-yellow">${icon('coin', 20)}</span>
              <div>
                <div class="pop-label">درآمد مرحله ۱</div>
                <div class="pop-sublabel">${incomeParts.join(' • ')}</div>
              </div>
            </div>
            <div style="display:flex; gap:6px;">
              <span class="pop-pill is-sm" style="pointer-events:none; color:#ffe047;">
                ${icon('coin', 14)}<span>${d.gold}</span>
              </span>
              <span class="pop-pill is-sm" style="pointer-events:none;">
                ${icon('star', 14)}<span>${d.totalScore}</span>
              </span>
            </div>
          </div>

          <div class="pop-row" style="background:#08486c;">
            <div class="pop-row-left">
              <span class="pop-sticker">${icon('lock', 20)}</span>
              <div>
                <div class="pop-label">فروشگاه کارت‌ها (قفل تا پایان مرحله ۲)</div>
                <div class="pop-sublabel">
                  پس از پایان مرحله ۲ می‌توانی با سکه‌هایت اولین کارت استراتژیک را انتخاب کنی و سبک بازیت را بسازی.
                </div>
              </div>
            </div>
          </div>

          <div class="pop-row">
            <div class="pop-row-left">
              <span class="pop-sticker is-yellow">${icon('island', 20)}</span>
              <div>
                <div class="pop-label">مرحله ۲: ${nextIsland.name}</div>
                <div class="pop-sublabel">همان زمین باز برای تمرین بیشتر با گله و گرگ‌ها</div>
              </div>
            </div>
            <span class="pop-pill is-sm" style="pointer-events:none;">
              ${icon('sheep', 14)}<span>${nextFlockCount} (سهمیه ${gameState.getSurvivalQuota(nextFlockCount, d.day)})</span>
            </span>
          </div>
        </div>

        <div class="pop-footer">
          <button type="button" id="btn-next-day" class="pop-pill is-yellow is-full">
            ${icon('play', 19)}
            <span>شروع مرحله ۲</span>
          </button>
        </div>

        <button type="button" id="btn-menu-back" class="pop-back-btn" title="بازگشت به منوی اصلی">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>
        </button>
      `;

            shell.querySelector('#btn-next-day').addEventListener('click', () => {
                sound.playClick();
                removeModal();
                onNextDay();
            });
            shell.querySelector('#btn-menu-back').addEventListener('click', () => {
                sound.playClick();
                removeModal();
                onReturnToMenu();
            });
            return;
        }

        // =========================================================
        // فروشگاه کامل (از پایان مرحله ۲ تا ۹)
        // =========================================================
        const usedSlots = gameState.getOwnedCardIds().length;
        const maxSlots = gameState.getMaxCardSlots();
        const hayFull = d.hayCount >= HAY_CONFIG.MAX_STOCK;
        const rerollPrice = gameState.getRerollPrice(rerollCount);
        const activeEvos = gameState.getActiveEvolutions();

        const cardsHtml = draftCards
            .map((c) => {
                const rm = RARITY_LABELS[c.rarity] || RARITY_LABELS.common;
                const currLvl = gameState.getCardLevel(c.id);
                const boughtHere = boughtMap.has(c.id);
                const purchaseInfo = boughtMap.get(c.id);
                const price = boughtHere ? purchaseInfo.pricePaid : gameState.getCardPrice(c);
                const isMaxedBefore = !boughtHere && currLvl >= c.maxLevel;
                const canAfford = !boughtHere && !isMaxedBefore && d.gold >= price;
                const needsReplace = !boughtHere && !isMaxedBefore && !gameState.canBuyWithoutReplace(c.id);
                const evoHint = !boughtHere && !isMaxedBefore ? willUnlockEvolution(c.id) : null;

                const cardClasses = [
                    'pop-card',
                    evoHint ? 'is-evolution' : '',
                    boughtHere ? 'is-bought' : '',
                    !boughtHere && (!canAfford || isMaxedBefore) ? 'is-locked' : '',
                ]
                    .filter(Boolean)
                    .join(' ');

                return `
          <button type="button" class="${cardClasses}" data-card="${c.id}">
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; margin-bottom:7px;">
                <span class="pop-sticker ${evoHint || boughtHere ? 'is-yellow' : ''}" style="width:36px; height:36px;">
                  ${icon(c.icon, 20)}
                </span>
                <div style="display:flex; align-items:center; gap:4px; flex-wrap:wrap; justify-content:flex-end;">
                  ${
                    evoHint
                        ? `<span style="
                       display:inline-flex; align-items:center; gap:3px;
                       font-size:10px; font-weight:900; background:#ffe047; color:#0b0e14;
                       border:1.5px solid #0b0e14; padding:1px 7px; border-radius:999px;
                     ">${icon('sparkle', 11)}<span>تکامل</span></span>`
                        : ''
                }
                  <span style="
                    font-size:10px; font-weight:900; background:${rm.bg}; color:${rm.color};
                    padding:2px 8px; border-radius:999px;
                  ">${rm.tag} • ${currLvl}/${c.maxLevel}</span>
                </div>
              </div>

              <div class="pop-label" style="margin-bottom:4px;">${c.title}</div>
              <div class="card-benefit-line">+ ${c.benefit || c.desc}</div>
              ${c.cost ? `<div class="card-cost-line">- ${c.cost}</div>` : ''}
              ${
                    evoHint
                        ? `<div class="pop-sublabel" style="color:#ffe047;">آزادسازی: ${evoHint.title}</div>`
                        : ''
                }
            </div>

            <div class="pop-pill is-sm ${boughtHere ? 'is-green' : canAfford ? '' : 'is-disabled'}" style="width:100%; pointer-events:none;">
              ${
                    boughtHere
                        ? `${icon('check', 15)}<span>انتخاب شد (لغو)</span>`
                        : isMaxedBefore
                            ? `<span>حداکثر سطح</span>`
                            : needsReplace
                                ? `${icon('coin', 15)}<span>${price} سکه (جایگزینی)</span>`
                                : `${icon('coin', 15)}<span>${price} سکه</span>`
                }
            </div>
          </button>
        `;
            })
            .join('');

        const alertsHtml = `
      ${renderBossMilestoneBanner()}
      ${renderReplacePicker()}
      ${renderReceiptCard()}
      ${
            unlockedEvoToast
                ? `<div class="pop-row" style="background:#b45309;">
           <div class="pop-row-left">
             <span class="pop-sticker is-yellow">${icon(unlockedEvoToast.icon, 20)}</span>
             <div>
               <div class="pop-label" style="color:#ffe047;">تکامل آزاد شد: ${unlockedEvoToast.title}</div>
               <div class="pop-sublabel">${unlockedEvoToast.desc}</div>
             </div>
           </div>
         </div>`
                : ''
        }
      ${
            newlyUnlockedClasses.length > 0
                ? `<div class="pop-row" style="background:#15803d;">
           <div class="pop-row-left">
             <span class="pop-sticker is-yellow">${icon('sparkle', 19)}</span>
             <div class="pop-label">کلاس جدید باز شد: ${newlyUnlockedClasses.map((c) => c.name).join('، ')}</div>
           </div>
         </div>`
                : ''
        }
    `;

        const consumablesHtml = `
      <div class="pop-grid-2">
        <div class="pop-row" style="padding:8px 11px; flex-direction:${isMobile ? 'column' : 'row'}; align-items:${isMobile ? 'stretch' : 'center'}; gap:7px;">
          <div class="pop-row-left">
            <span class="pop-sticker" style="width:32px; height:32px;">${icon('hay', 18)}</span>
            <div>
              <div class="pop-label" style="font-size:13px;">علوفه (${d.hayCount}/${HAY_CONFIG.MAX_STOCK})</div>
            </div>
          </div>
          <div style="display:flex; gap:5px; align-items:center;">
            <button type="button" id="buy-hay" class="pop-pill is-sm ${hayFull || d.gold < HAY_CONFIG.PRICE ? 'is-disabled' : ''}" style="${isMobile ? 'flex:1;' : ''}">
              <span>${hayFull ? 'تکمیل' : `${HAY_CONFIG.PRICE} سکه`}</span>
            </button>
            ${
            hayBoughtHere > 0
                ? `<button type="button" id="refund-hay" class="pop-pill is-sm is-danger" title="لغو خرید">
                         <span>لغو</span>
                       </button>`
                : ''
        }
          </div>
        </div>

        <div class="pop-row" style="padding:8px 11px; flex-direction:${isMobile ? 'column' : 'row'}; align-items:${isMobile ? 'stretch' : 'center'}; gap:7px;">
          <div class="pop-row-left">
            <span class="pop-sticker" style="width:32px; height:32px;">${icon('shield', 18)}</span>
            <div>
              <div class="pop-label" style="font-size:13px;">دافع گل</div>
            </div>
          </div>
          <button type="button" id="buy-repellent" class="pop-pill is-sm ${repellentBoughtHere ? 'is-green' : !d.flowerRepellent && d.gold >= REPELLENT_CONFIG.PRICE ? '' : 'is-disabled'}" style="${isMobile ? 'width:100%;' : ''}">
            <span>${repellentBoughtHere ? 'فعال (لغو)' : d.flowerRepellent ? 'فعال' : `${REPELLENT_CONFIG.PRICE} سکه`}</span>
          </button>
        </div>
      </div>
    `;

        const summaryCardsHtml = `
      <div class="pop-two-col">
        <div class="pop-row">
          <div class="pop-row-left">
            <span class="pop-sticker is-yellow">${icon('coin', 20)}</span>
            <div>
              <div class="pop-label">درآمد خالص مرحله ${completedDay}</div>
              <div class="pop-sublabel">${incomeParts.join(' • ')}</div>
            </div>
          </div>
          <div style="display:flex; gap:6px; flex-shrink:0;">
            <span class="pop-pill is-sm" style="pointer-events:none; color:#ffe047;">
              ${icon('coin', 14)}<span>${d.gold}</span>
            </span>
            <span class="pop-pill is-sm" style="pointer-events:none;">
              ${icon('star', 14)}<span>${d.totalScore}</span>
            </span>
          </div>
        </div>

        <div class="pop-row" style="${nextBoss ? 'background:#6d28d9;' : ''}">
          <div class="pop-row-left">
            <span class="pop-sticker ${nextBoss ? 'is-yellow' : ''}">${icon(nextBoss ? nextBoss.icon : 'island', 20)}</span>
            <div>
              <div class="pop-label">
                ${nextBoss ? `باس‌فایت ${d.day}: ${nextBoss.name}` : `مرحله ${d.day}: ${nextIsland.name}`}
              </div>
              <div class="pop-sublabel">
                ${
            d.day === MAX_CAMPAIGN_DAY
                ? 'نبرد نهایی بازی! سهمیه مجاز ۲ گوسفند'
                : nextBoss
                    ? 'شکست باس = باز شدن اسلات ۵ کارت + تشدید چالش'
                    : nextIsland.desc
        }
              </div>
            </div>
          </div>
          <span class="pop-pill is-sm" style="pointer-events:none; flex-shrink:0;">
            ${icon('sheep', 14)}<span>${nextFlockCount} (سهمیه ${gameState.getSurvivalQuota(nextFlockCount, d.day)})</span>
          </span>
        </div>
      </div>
    `;

        shell.className = 'pop-shell is-wide';

        if (isMobile) {
            shell.innerHTML = `
        <div class="pop-header">
          <h2 class="pop-title">پیروزی مرحله ${completedDay}</h2>
          <div style="display:flex; justify-content:center; gap:7px; margin-top:4px; flex-wrap:wrap;">
            <span class="pop-pill is-sm" style="pointer-events:none; color:#ffe047;">
              ${icon('coin', 14)}<span>${d.gold}</span>
            </span>
            <span class="pop-pill is-sm" style="pointer-events:none;">
              ${icon('sparkle', 13)}<span>اسلات ${usedSlots}/${maxSlots}</span>
            </span>
            ${
                nextBoss
                    ? `<span class="pop-pill is-sm is-danger" style="pointer-events:none;">باس‌فایت!</span>`
                    : ''
            }
          </div>
        </div>

        <div class="pop-tabs">
          <button type="button" id="shop-tab-cards" class="pop-tab ${mobileTab === 'shop' ? 'is-active' : ''}">
            ${icon('sparkle', 15)}
            <span>فروشگاه</span>
          </button>
          <button type="button" id="shop-tab-info" class="pop-tab ${mobileTab === 'summary' ? 'is-active' : ''}">
            ${icon('island', 15)}
            <span>گزارش و مرحله بعد</span>
          </button>
        </div>

        <div class="pop-body">
          ${alertsHtml}
          ${
                mobileTab === 'shop'
                    ? `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:0 2px;">
              <span class="pop-sublabel" style="margin:0; font-weight:800;">هر کارت هم سود دارد هم هزینه</span>
              <button type="button" id="btn-reroll" class="pop-pill is-sm ${rerollPrice === 0 ? 'is-green' : ''} ${d.gold < rerollPrice ? 'is-disabled' : ''}">
                ${icon('dice', 14)}
                <span>${rerollPrice === 0 ? 'تعویض رایگان' : `تعویض (${rerollPrice})`}</span>
              </button>
            </div>
            <div class="pop-grid-3">${cardsHtml}</div>
            ${consumablesHtml}
          `
                    : `
            ${summaryCardsHtml}
            ${
                        activeEvos.length > 0
                            ? `<div class="pop-row is-column">
                 <span class="pop-label" style="font-size:13.5px;">تکامل‌های فعال</span>
                 <div style="display:flex; flex-wrap:wrap; gap:6px;">
                   ${activeEvos
                                .map(
                                    (e) =>
                                        `<span class="pop-pill is-sm is-yellow" style="pointer-events:none;">${icon(e.icon, 13)}<span>${e.title}</span></span>`
                                )
                                .join('')}
                 </div>
               </div>`
                            : ''
                    }
            <button type="button" id="btn-submit-lb" class="pop-pill is-full" ${isSubmitting ? 'disabled' : ''}>
              ${icon('trophy', 17)}
              <span>${isSubmitting ? 'در حال تایید روی لبه...' : scoreSubmitted ? 'مشاهده رده‌بندی' : 'ثبت رکورد و دریافت لقب هوشمند'}</span>
            </button>
          `
            }
        </div>

        <div class="pop-footer">
          <button type="button" id="btn-next-day" class="pop-pill is-yellow is-full">
            ${icon(nextBoss ? nextBoss.icon : 'play', 18)}
            <span>${nextBoss ? `نبرد باس مرحله ${d.day}` : `شروع مرحله ${d.day} (${nextIsland.name})`}</span>
          </button>
        </div>

        <button type="button" id="btn-menu-back" class="pop-back-btn" title="بازگشت به منوی اصلی">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>
        </button>
      `;

            shell.querySelector('#shop-tab-cards').addEventListener('click', () => {
                sound.playClick();
                mobileTab = 'shop';
                render();
            });
            shell.querySelector('#shop-tab-info').addEventListener('click', () => {
                sound.playClick();
                mobileTab = 'summary';
                render();
            });
        } else {
            shell.innerHTML = `
        <div class="pop-header">
          <h2 class="pop-title">پیروزی مرحله ${completedDay}</h2>
          <p class="pop-subtitle">
            ${completedDay === 2 ? 'فروشگاه کارت‌ها باز شد! هر کارت هم سود دارد هم هزینه؛ سبک چوپانیت را بساز' : 'کارت‌هایت را هوشمندانه انتخاب یا جایگزین کن؛ کلیک مجدد = لغو خرید'}
          </p>
        </div>

        <div class="pop-body">
          ${summaryCardsHtml}
          ${alertsHtml}

          <div class="pop-row" style="padding:8px 14px;">
            <div class="pop-row-left" style="flex-wrap:wrap;">
              <span class="pop-sticker" style="width:34px; height:34px;">${icon('sparkle', 18)}</span>
              <span class="pop-label">فروشگاه کارت‌ها</span>
              <span class="pop-pill is-sm ${usedSlots >= maxSlots ? 'is-danger' : 'is-white'}" style="pointer-events:none; padding:4px 10px; font-size:11.5px;">
                اسلات فعال: ${usedSlots}/${maxSlots}
              </span>
              ${
                activeEvos.length > 0
                    ? activeEvos
                        .map(
                            (e) =>
                                `<span class="pop-pill is-sm is-yellow" style="pointer-events:none; padding:4px 10px; font-size:11.5px;">${icon(e.icon, 13)}<span>${e.title}</span></span>`
                        )
                        .join('')
                    : ''
            }
            </div>
            <button type="button" id="btn-reroll" class="pop-pill is-sm ${rerollPrice === 0 ? 'is-green' : ''} ${d.gold < rerollPrice ? 'is-disabled' : ''}">
              ${icon('dice', 15)}
              <span>${rerollPrice === 0 ? 'تعویض رایگان' : `تعویض (${rerollPrice} سکه)`}</span>
            </button>
          </div>

          <div class="pop-grid-3">${cardsHtml}</div>
          ${consumablesHtml}
        </div>

        <div class="pop-footer">
          <button type="button" id="btn-next-day" class="pop-pill is-yellow is-full" style="flex:2;">
            ${icon(nextBoss ? nextBoss.icon : 'play', 19)}
            <span>${nextBoss ? `ورود به باس‌فایت مرحله ${d.day}` : `شروع مرحله ${d.day} (${nextIsland.name})`}</span>
          </button>

          <button type="button" id="btn-submit-lb" class="pop-pill is-full" style="flex:1;" ${isSubmitting ? 'disabled' : ''}>
            ${icon('trophy', 17)}
            <span>${isSubmitting ? 'در حال تایید...' : scoreSubmitted ? 'مشاهده رده‌بندی' : 'ثبت رکورد روی لبه'}</span>
          </button>
        </div>

        <button type="button" id="btn-menu-back" class="pop-back-btn" title="بازگشت به منوی اصلی">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>
        </button>
      `;
        }

        shell.querySelector('#btn-cancel-replace')?.addEventListener('click', () => {
            sound.playCancel();
            pendingReplaceCardId = null;
            render();
        });

        shell.querySelectorAll('.replace-choice[data-replace]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const oldId = btn.getAttribute('data-replace');
                const newId = pendingReplaceCardId;
                if (!oldId || !newId) return;
                const res = gameState.buyDraftCard(newId, oldId);
                pendingReplaceCardId = null;
                if (res.ok) {
                    boughtMap.set(newId, res);
                    if (res.newEvolutions.length > 0) {
                        unlockedEvoToast = res.newEvolutions[0];
                        sound.playEvolution();
                    } else {
                        sound.playFever();
                    }
                    render();
                }
            });
        });

        shell.querySelectorAll('.pop-card[data-card]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const cid = btn.getAttribute('data-card');
                if (boughtMap.has(cid)) {
                    const info = boughtMap.get(cid);
                    if (gameState.refundDraftCard(cid, info)) {
                        boughtMap.delete(cid);
                        pendingReplaceCardId = null;
                        if (unlockedEvoToast && !gameState.hasEvolution(unlockedEvoToast.id)) {
                            unlockedEvoToast = null;
                        }
                        sound.playCancel();
                        render();
                    }
                    return;
                }

                const card = CARDS.find((c) => c.id === cid);
                if (!card) return;
                const price = gameState.getCardPrice(card);
                if (gameState.getCardLevel(cid) >= card.maxLevel || gameState.data.gold < price) return;

                if (!gameState.canBuyWithoutReplace(cid)) {
                    sound.playClick();
                    pendingReplaceCardId = cid;
                    render();
                    return;
                }

                const res = gameState.buyDraftCard(cid);
                if (res.ok) {
                    boughtMap.set(cid, res);
                    pendingReplaceCardId = null;
                    if (res.newEvolutions.length > 0) {
                        unlockedEvoToast = res.newEvolutions[0];
                        sound.playEvolution();
                    } else {
                        sound.playFever();
                    }
                    render();
                }
            });
        });

        shell.querySelector('#btn-reroll')?.addEventListener('click', () => {
            const wasFree = rerollPrice === 0;
            if (gameState.spendReroll(rerollPrice)) {
                if (!wasFree) rerollCount++;
                boughtMap = new Map();
                pendingReplaceCardId = null;
                sound.playBuy();
                draftCards = gameState.rollDraftCards(3);
                render();
            }
        });

        shell.querySelector('#buy-hay')?.addEventListener('click', () => {
            if (gameState.buyHay()) {
                hayBoughtHere += 1;
                sound.playBuy();
                render();
            }
        });

        shell.querySelector('#refund-hay')?.addEventListener('click', () => {
            if (hayBoughtHere > 0 && gameState.refundHay()) {
                hayBoughtHere -= 1;
                sound.playCancel();
                render();
            }
        });

        shell.querySelector('#buy-repellent')?.addEventListener('click', () => {
            if (repellentBoughtHere) {
                if (gameState.refundFlowerRepellent()) {
                    repellentBoughtHere = false;
                    sound.playCancel();
                    render();
                }
                return;
            }
            if (gameState.buyFlowerRepellent()) {
                repellentBoughtHere = true;
                sound.playBuy();
                render();
            }
        });

        shell.querySelector('#btn-next-day').addEventListener('click', () => {
            sound.playClick();
            removeModal();
            onNextDay();
        });

        shell.querySelector('#btn-submit-lb')?.addEventListener('click', async () => {
            sound.playClick();
            const receipt = await doSubmitScore();
            showLeaderboardModal('normal', receipt);
        });

        shell.querySelector('#btn-menu-back').addEventListener('click', () => {
            sound.playClick();
            removeModal();
            onReturnToMenu();
        });
    };

    resizeShopHandler = () => {
        const nowMobile = window.innerWidth <= 780;
        if (nowMobile !== lastWasMobile) {
            lastWasMobile = nowMobile;
            render();
        }
    };
    window.addEventListener('resize', resizeShopHandler);

    render();
}