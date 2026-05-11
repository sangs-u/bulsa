// 불안전 행동 감지 — 작업반경 진입 실시간 모니터링
// Phase 6 진입 후 (모든 점검 완료) 플레이어가 작업반경 안에 있으면 위반.

const UNSAFE = {
  // 작업반경 중심·반지름 (scene.js _buildDangerZone 과 동기)
  dangerCenter: { x: -2, z: -8 },
  dangerRadius: 7.7,
  cooldownMs: 2000,
  penaltyPoints: 2,
  _lastWarnTime: 0,
  _toastEl: null,
  _flashEl: null,
};

function initUnsafe() {
  if (typeof GAME !== 'undefined' && GAME.state) {
    GAME.state.unsafeViolations = 0;
  }
  UNSAFE._toastEl = document.getElementById('unsafe-toast');
  UNSAFE._flashEl = document.getElementById('unsafe-flash');
}

function updateUnsafe() {
  if (!GAME.state.gameStarted || GAME.state.gameOver) return;
  if (GAME.state.craneBoarded) return; // 운전석 안전
  if (typeof PLAYER === 'undefined' || !PLAYER.worldPos) return;

  // Phase 6 (모든 점검 완료) 부터 작업반경 활성
  // 또는 인양 진행 중
  const beam = GAME.liftBeam;
  const beamUp = beam && beam.position.y > 0.5;
  const phaseActive = (GAME.state.phase || 1) >= 6;
  if (!phaseActive && !beamUp && !GAME.state.liftStarted) return;

  const dx = PLAYER.worldPos.x - UNSAFE.dangerCenter.x;
  const dz = PLAYER.worldPos.z - UNSAFE.dangerCenter.z;
  const dist = Math.hypot(dx, dz);
  if (dist > UNSAFE.dangerRadius) return;

  const now = performance.now();
  if (now - UNSAFE._lastWarnTime < UNSAFE.cooldownMs) return;

  UNSAFE._lastWarnTime = now;
  GAME.state.unsafeViolations++;
  if (typeof applySafetyPenalty === 'function') applySafetyPenalty(UNSAFE.penaltyPoints);
  _flashUnsafeWarning();
}

function _flashUnsafeWarning() {
  const toast = UNSAFE._toastEl;
  if (toast) {
    toast.textContent = t('unsafeWarnText');
    toast.classList.remove('hidden');
    clearTimeout(UNSAFE._tToast);
    UNSAFE._tToast = setTimeout(() => toast.classList.add('hidden'), 1800);
  }
  const flash = UNSAFE._flashEl;
  if (flash) {
    flash.classList.remove('hidden');
    flash.classList.add('active');
    clearTimeout(UNSAFE._tFlash);
    UNSAFE._tFlash = setTimeout(() => {
      flash.classList.remove('active');
      flash.classList.add('hidden');
    }, 350);
  }
}
