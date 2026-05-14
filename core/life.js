// life.js — 命 게이지 시스템
// safetyIndex (0~100, 100=안전, 0=위험) ← hazard.js가 감소시킴
// lifeWater   (0~100) = 100 - safetyIndex, 수위 시각화용

const LIFE = {
  _tick: 0,
};

(function initLife() {
  _bindTestKeys();
  GAME.scene.onBeforeRenderObservable.add(_tickLife);
})();

function _tickLife() {
  if (GAME.state.paused) return;

  LIFE._tick++;

  // 자연 회복: 약 6초(360프레임)마다 +1
  if (LIFE._tick % 360 === 0 && GAME.state.safetyIndex < 100) {
    GAME.state.safetyIndex = Math.min(100, GAME.state.safetyIndex + 1);
  }

  // lifeWater: smooth lerp toward (100 - safetyIndex)
  const target = 100 - GAME.state.safetyIndex;
  GAME.state.lifeWater += (target - GAME.state.lifeWater) * 0.04;

  HUD.update();
}

/* ─── 외부 인터페이스 ─────────────────────────────────────── */
function lifeDamage(amount) {
  GAME.state.safetyIndex = Math.max(0, GAME.state.safetyIndex - amount);
  if (GAME.state.safetyIndex <= 0) _onDanger();
}

function lifeHeal(amount) {
  GAME.state.safetyIndex = Math.min(100, GAME.state.safetyIndex + amount);
}

/* ─── 만수위 처리 ─────────────────────────────────────────── */
function _onDanger() {
  const flash = document.getElementById('danger-flash');
  if (flash) {
    flash.classList.add('active');
    setTimeout(() => flash.classList.remove('active'), 800);
  }
  // 낮은 수치로 강제 회복 (사고 시스템 미구현 구간 임시 처리)
  GAME.state.safetyIndex = 15;
}

/* ─── 테스트 키 (Z: 피해 / X: 회복) ─────────────────────── */
function _bindTestKeys() {
  window.addEventListener('keydown', e => {
    if (e.key === 'z' || e.key === 'Z') lifeDamage(10);
    if (e.key === 'x' || e.key === 'X') lifeHeal(10);
  });
}
