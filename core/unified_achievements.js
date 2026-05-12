// v2.0 통합 모드 업적 타이머 — 5분 무사고 / 10분 간섭 0
//
// 진입 시 카운터 시작 (실시간 + 게임 정지 시 중단)
// 사고 발생 시 unified_5min 리셋. 간섭 발생 시 unified_zero_int 리셋.

(function () {
  let _enter   = 0;
  let _last5   = 0;
  let _last10  = 0;
  let _started = false;
  const TARGET_5  = 5  * 60;
  const TARGET_10 = 10 * 60;

  function _start() {
    if (_started) return;
    _started = true;
    _enter   = performance.now();
    _last5   = _enter;
    _last10  = _enter;
    // 이벤트 hook
    const _origTrigger = window.triggerAccident;
    if (typeof _origTrigger === 'function') {
      window.triggerAccident = function (id) {
        _last5 = performance.now();   // 5분 무사고 타이머 reset
        return _origTrigger.apply(this, arguments);
      };
    }
    const _origInterference = window.recordInterferenceEvent;
    if (typeof _origInterference === 'function') {
      window.recordInterferenceEvent = function () {
        _last10 = performance.now();  // 10분 간섭 0 타이머 reset
        return _origInterference.apply(this, arguments);
      };
    }
  }

  function tickUnifiedAchievements() {
    if (!GAME.unifiedMode) return;
    if (!GAME.state || !GAME.state.gameStarted || GAME.state.gameOver) return;
    if (!_started) { _start(); return; }
    const now = performance.now();
    if (typeof unlockAchievement !== 'function') return;
    if ((now - _last5) / 1000 >= TARGET_5)    unlockAchievement('unified_5min');
    if ((now - _last10) / 1000 >= TARGET_10)  unlockAchievement('unified_zero_int');
    _renderHud(now);
  }

  // HUD 미니 게이지 — 우상단에 5분/10분 진행 표시 (이미 unlock 된 항목은 ✓)
  let _hudEl = null;
  function _ensureHud() {
    if (_hudEl) return _hudEl;
    const tr = document.getElementById('hud-tr') || document.getElementById('hud-tl');
    if (!tr) return null;
    const el = document.createElement('div');
    el.id = 'hud-unified-timer';
    el.style.cssText = 'margin-top:4px;font-family:monospace;font-size:11px;opacity:0.85;color:#cdf;';
    tr.appendChild(el);
    _hudEl = el;
    return el;
  }
  function _bar(pct) {
    const n = 10, filled = Math.round(pct * n);
    return '▮'.repeat(filled) + '▯'.repeat(n - filled);
  }
  function _renderHud(now) {
    const el = _ensureHud();
    if (!el) return;
    const st    = (typeof window !== 'undefined') ? window.ACHIEVEMENTS_STATE : null;
    const has5  = (st && st.unlocked && st.unlocked.has) ? st.unlocked.has('unified_5min')     : false;
    const has10 = (st && st.unlocked && st.unlocked.has) ? st.unlocked.has('unified_zero_int') : false;
    const p5  = Math.min(1, (now - _last5)  / 1000 / TARGET_5);
    const p10 = Math.min(1, (now - _last10) / 1000 / TARGET_10);
    const lbl = { ko:'5분 무사고', en:'5min Safe',  vi:'5p AT',     ar:'5د آمن' }[currentLang] || '5분 무사고';
    const lbl2= { ko:'10분 무간섭', en:'10min 0Int', vi:'10p 0XĐ',   ar:'10د بلا تداخل' }[currentLang] || '10분 무간섭';
    el.innerHTML =
      `<div>${has5  ? '✓' : '⏱'} ${lbl}  ${has5  ? '' : _bar(p5)}</div>` +
      `<div>${has10 ? '✓' : '⏱'} ${lbl2} ${has10 ? '' : _bar(p10)}</div>`;
  }

  window.tickUnifiedAchievements = tickUnifiedAchievements;
})();
