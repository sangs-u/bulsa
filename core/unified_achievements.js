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
  }

  window.tickUnifiedAchievements = tickUnifiedAchievements;
})();
