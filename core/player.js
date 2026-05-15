// player.js — BULSA 플레이어 컨트롤러 (Babylon.js)
// WASD 이동, ArcRotateCamera 연동, 모바일 가상 조이스틱

const PLAYER = {
  speed:    0.055,
  mesh:     null,
  locked:   false,  // 시작부터 자유 이동, 대화 중에만 잠금
  isMobile: ('ontouchstart' in window),
  keys:     { w: false, a: false, s: false, d: false },
  joy:      { x: 0, y: 0 },
};

/* ─── 초기화 (game:ready 이후 — GAME.scene 보장) ─────────── */
window.addEventListener('game:ready', function() {
  PLAYER.mesh = GAME.player;

  if (PLAYER.isMobile) {
    _initMobileJoystick();
  } else {
    _initKeyboard();
  }

  GAME.scene.onBeforeRenderObservable.add(_updatePlayer);
});

/* ─── 키보드 ─────────────────────────────────────────────── */
function _initKeyboard() {
  const k = PLAYER.keys;
  window.addEventListener('keydown', e => {
    if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp')    k.w = true;
    if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft')  k.a = true;
    if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown')  k.s = true;
    if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') k.d = true;
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault();
  });
  window.addEventListener('keyup', e => {
    if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp')    k.w = false;
    if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft')  k.a = false;
    if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown')  k.s = false;
    if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') k.d = false;
  });
}

/* ─── 모바일 조이스틱 ────────────────────────────────────── */
function _initMobileJoystick() {
  const base = document.getElementById('joy-base');
  const nub  = document.getElementById('joy-nub');
  if (!base || !nub) return;

  base.style.display = 'block';

  let startX = 0, startY = 0, active = false;
  const MAX = 38;

  base.addEventListener('touchstart', e => {
    e.preventDefault();
    const t = e.touches[0];
    startX = t.clientX; startY = t.clientY;
    active = true;
  }, { passive: false });

  base.addEventListener('touchmove', e => {
    e.preventDefault();
    if (!active) return;
    const t = e.touches[0];
    let dx = t.clientX - startX;
    let dy = t.clientY - startY;
    const dist = Math.hypot(dx, dy);
    if (dist > MAX) { dx *= MAX / dist; dy *= MAX / dist; }
    nub.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    PLAYER.joy.x =  dx / MAX;
    PLAYER.joy.y = -dy / MAX;
  }, { passive: false });

  const stop = () => {
    active = false;
    PLAYER.joy.x = 0;
    PLAYER.joy.y = 0;
    nub.style.transform = 'translate(-50%, -50%)';
  };
  base.addEventListener('touchend',    stop);
  base.addEventListener('touchcancel', stop);

  // 우측 스와이프 → 카메라 회전. 대화 전에도 표시.
  const lookArea = document.getElementById('joy-look');
  if (lookArea) {
    lookArea.style.display = 'block';
    let lpx = 0, lpy = 0, lactive = false;
    lookArea.addEventListener('touchstart', e => {
      e.preventDefault();
      const t = e.touches[0]; lpx = t.clientX; lpy = t.clientY; lactive = true;
    }, { passive: false });
    lookArea.addEventListener('touchmove', e => {
      e.preventDefault();
      if (!lactive) return;
      const t = e.touches[0];
      const dx = t.clientX - lpx;
      const dy = t.clientY - lpy;
      lpx = t.clientX; lpy = t.clientY;
      GAME.camera.inertialAlphaOffset -= dx * 0.004;
      GAME.camera.inertialBetaOffset  -= dy * 0.003;
    }, { passive: false });
    lookArea.addEventListener('touchend', () => { lactive = false; });
  }
}

/* ─── 매 프레임 이동 처리 ────────────────────────────────── */
function _updatePlayer() {
  if (PLAYER.locked || GAME.state.paused || !PLAYER.mesh) return;

  const k   = PLAYER.keys;
  const joy = PLAYER.joy;

  // 입력 벡터
  let ix = 0, iy = 0;
  if (k.w) iy -= 1;
  if (k.s) iy += 1;
  if (k.a) ix -= 1;
  if (k.d) ix += 1;
  if (joy.x !== 0) ix = joy.x;
  if (joy.y !== 0) iy = -joy.y;

  if (ix === 0 && iy === 0) return;

  // 카메라 방향 기준 이동
  const cam = GAME.camera;
  const fwd = cam.target.subtract(cam.position);
  fwd.y = 0;
  if (fwd.length() < 0.001) return;
  fwd.normalize();
  const right = BABYLON.Vector3.Cross(BABYLON.Vector3.Up(), fwd).normalize();

  const move = fwd.scale(-iy).add(right.scale(ix));
  const len  = move.length();
  if (len > 1) move.scaleInPlace(1 / len);
  move.scaleInPlace(PLAYER.speed);

  PLAYER.mesh.position.addInPlace(move);

  // 방 경계 클램핑 — 벽(x±10, z±8)에서 1.2유닛 여유를 두어 투명화 방지
  const p = PLAYER.mesh.position;
  if (p.x < -8.8) p.x = -8.8;
  if (p.x >  8.8) p.x =  8.8;
  if (p.z < -6.8) p.z = -6.8;
  if (p.z >  6.8) p.z =  6.8;

  // 이동 방향으로 캐릭터 회전
  if (len > 0.001) {
    const targetAngle = Math.atan2(move.x, move.z);
    let current = PLAYER.mesh.rotation.y;
    // 최단 각도 보간
    let diff = targetAngle - current;
    while (diff >  Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    PLAYER.mesh.rotation.y = current + diff * 0.2;
  }

  // 카메라 타겟 부드럽게 추적
  const targetPos = PLAYER.mesh.position.add(new BABYLON.Vector3(0, 0.85, 0));
  GAME.camera.target = BABYLON.Vector3.Lerp(GAME.camera.target, targetPos, 0.12);
}

/* ─── 이동 잠금 (대화 시작 시 호출) ─────────────────────── */
function lockPlayer() {
  PLAYER.locked = true;
  GAME.state.dialogActive = true;
}

/* ─── 이동 잠금 해제 (대화 종료 시 호출) ────────────────── */
function unlockPlayer() {
  PLAYER.locked = false;
  GAME.state.dialogActive = false;
}
