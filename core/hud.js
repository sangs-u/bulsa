// hud.js — HUD 업데이트 (命게이지 수치 + 파티창 수위바)
// life.js의 _tickLife()에서 매 프레임 HUD.update() 호출

const HUD = {
  _safetyEl:  null,
  _partyBars: [],
  _initialized: false,
};

window.addEventListener('game:ready', function() {
  HUD._safetyEl  = document.getElementById('safety-val');
  HUD._partyBars = [0, 1, 2, 3].map(i => document.getElementById('party-life-' + i));
  HUD._initialized = true;
  HUD.update();
});

HUD.update = function () {
  if (!HUD._initialized) return;

  const si = Math.round(GAME.state.safetyIndex);
  const lw = GAME.state.lifeWater;

  // ── 안전지수 숫자 색상 ────────────────────────────────────
  if (HUD._safetyEl) {
    HUD._safetyEl.textContent = si;
    HUD._safetyEl.style.color =
      si > 70 ? '#8DC63F' :
      si > 40 ? '#FCD34D' : '#E85A3A';
  }

  // ── 파티창 수위 바 ─────────────────────────────────────────
  // 첫 번째 바: 플레이어 위험도 반영 / 나머지: NPC (미구현, 0%)
  const barColor =
    lw < 30 ? '#8DC63F' :
    lw < 60 ? '#FCD34D' : '#E85A3A';

  HUD._partyBars.forEach((bar, i) => {
    if (!bar) return;
    const pct = i === 0 ? Math.min(lw, 100) : 0;
    bar.style.height     = pct + '%';
    bar.style.background = barColor;
  });
};
