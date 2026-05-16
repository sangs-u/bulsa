// player.js — BULSA 플레이어 컨트롤러 (Babylon.js)
// WASD 이동, ArcRotateCamera 연동, 모바일 가상 조이스틱

const PLAYER = {
  speed:       0.055,
  runSpeed:    0.10,
  mesh:        null,
  locked:      false,
  firstPerson: false,
  isMobile:    ('ontouchstart' in window),
  keys:        { w: false, a: false, s: false, d: false, shift: false },
  joy:         { x: 0, y: 0 },
};

/* ─── 1인칭 ↔ 3인칭 전환 ───────────────────────────────────── */
function setFirstPerson(on) {
  const cam = GAME.camera;
  if (!cam) return;
  PLAYER.firstPerson = on;
  if (on) {
    cam.lowerRadiusLimit = 0.05;
    cam.upperRadiusLimit = 0.2;
    cam.radius           = 0.15;
    cam.upperBetaLimit   = Math.PI * 0.85;
    cam.lowerBetaLimit   = 0.05;
    if (GAME.player) GAME.player.isVisible = false;
    if (window.CHARACTER_API && CHARACTER_API.root) CHARACTER_API.root.setEnabled(false);
  } else {
    const r = GAME.currentScene === 'site' ? 20 : 12;
    cam.lowerRadiusLimit = 2;
    cam.upperRadiusLimit = GAME.currentScene === 'site' ? 60 : 22;
    cam.radius           = r;
    cam.upperBetaLimit   = Math.PI / 2.1;
    cam.lowerBetaLimit   = 0.2;
    if (GAME.player) GAME.player.isVisible = true;
    if (window.CHARACTER_API && CHARACTER_API.root) CHARACTER_API.root.setEnabled(true);
  }
}

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
    if (typeof EXCAVATOR !== 'undefined' && EXCAVATOR.mounted) return;
    if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp')    k.w = true;
    if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft')  k.a = true;
    if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown')  k.s = true;
    if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') k.d = true;
    if (e.key === 'Shift' || e.shiftKey)                          k.shift = true;
    if (e.key === 'v' || e.key === 'V') setFirstPerson(!PLAYER.firstPerson);
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault();
  });
  window.addEventListener('keyup', e => {
    if (typeof EXCAVATOR !== 'undefined' && EXCAVATOR.mounted) return;
    if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp')    k.w = false;
    if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft')  k.a = false;
    if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown')  k.s = false;
    if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') k.d = false;
    if (e.key === 'Shift')                                         k.shift = false;
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
    // 굴착기 탑승 중 조이스틱을 굴착기로 라우팅
    if (typeof EXCAVATOR !== 'undefined' && EXCAVATOR.mounted) {
      EXCAVATOR.joyX = dx / MAX;
      EXCAVATOR.joyY = -dy / MAX;
      return;
    }
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
      // 굴착기 탑승 중 우측 드래그를 붐/암으로 라우팅
      if (typeof EXCAVATOR !== 'undefined' && EXCAVATOR.mounted) {
        EXCAVATOR.boomAngle = Math.max(-0.80, Math.min(0.35, EXCAVATOR.boomAngle + dy * 0.005));
        EXCAVATOR.armAngle  = Math.max(-1.40, Math.min(0.30, EXCAVATOR.armAngle  + dx * 0.006));
        return;
      }
      GAME.camera.inertialAlphaOffset -= dx * 0.004;
      GAME.camera.inertialBetaOffset  -= dy * 0.003;
    }, { passive: false });
    lookArea.addEventListener('touchend', () => { lactive = false; });
  }
}

/* ─── 매 프레임 이동 처리 ────────────────────────────────── */
function _updatePlayer() {
  if (typeof EXCAVATOR !== 'undefined' && EXCAVATOR.mounted) return;
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

  // 카메라 타겟 in-place 추적 — 매 프레임 실행, 객체 교체 금지(radius 누적 방지)
  if (PLAYER.mesh && GAME.camera) {
    const eyeH = PLAYER.firstPerson ? 1.45 : 0.85;
    const tx = PLAYER.mesh.position.x;
    const ty = PLAYER.mesh.position.y + eyeH;
    const tz = PLAYER.mesh.position.z;
    const t = GAME.camera.target;
    t.x += (tx - t.x) * 0.18;
    t.y += (ty - t.y) * 0.18;
    t.z += (tz - t.z) * 0.18;
  }

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
  // 들고 있으면 PLAYER.speed가 carrySpeed로 이미 줄어든 상태. Shift는 carry 중엔 미적용
  const sp = (k.shift && !(typeof CARRY !== 'undefined' && CARRY.held)) ? PLAYER.runSpeed : PLAYER.speed;
  move.scaleInPlace(sp);

  PLAYER.mesh.position.addInPlace(move);

  const p = PLAYER.mesh.position;
  if (GAME.currentScene === 'office') {
    if (p.x < -8.8) p.x = -8.8;
    if (p.x >  8.8) p.x =  8.8;
    if (p.z < -6.8) p.z = -6.8;
    // 남쪽은 완전 개방 — z>8.5 통과 시 씬 전환
    if (p.z > 8.5 && typeof exitToSite === 'function') exitToSite();
  } else {
    // 현장: 플레이 구역 내 경계 (자재 더미·굴착 구역·여유 공간)
    if (p.x < -22) p.x = -22;
    if (p.x >  22) p.x =  22;
    if (p.z > 38)  p.z =  38;
    // 남쪽: 문 앞(|x|<0.8)에서만 사무소 재진입, 나머지는 건물 외벽에 막힘
    if (Math.abs(p.x) < 0.8) {
      if (p.z < 8.5 && typeof enterOffice === 'function') enterOffice();
    } else {
      if (p.z < 9.2) p.z = 9.2;
    }
  }

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
