// Player controller — WASD + Pointer Lock + camera modes (fps/tps/fixed) + mobile

const PLAYER = {
  speed: 5,
  sprint: 10,
  keys: {},
  euler: null,
  isLocked: false,
  worldPos: null,     // ground-level world position (separate from camera)
  camMode: 'fps',     // 'fps' | 'tps' | 'fixed'
  fixedCamIdx: 0,
  _fixedCamCount: 4,
  // Mobile
  mobileActive: false,
  joyX: 0,
  joyY: 0,
  lookDX: 0,
  lookDY: 0,
};

// Fixed camera presets — populated in initPlayer after Three.js is ready
let FIXED_CAMS;

function initPlayer() {
  PLAYER.euler   = new THREE.Euler(0, 0, 0, 'YXZ');
  PLAYER.worldPos = new THREE.Vector3(0, 0, 12);

  FIXED_CAMS = [
    { pos: new THREE.Vector3(18,  9,  5),  target: new THREE.Vector3(0,  3, -10) }, // 전체 조망
    { pos: new THREE.Vector3(-12, 6,  2),  target: new THREE.Vector3(-2, 2,  -8) }, // 빔 측면
    { pos: new THREE.Vector3(0,  16, -2),  target: new THREE.Vector3(0,  4, -17) }, // 상공
    { pos: new THREE.Vector3(13,  4,  0),  target: new THREE.Vector3(13, 2,  -8) }, // 크레인 옆
  ];
  PLAYER._fixedCamCount = FIXED_CAMS.length;

  const canvas = GAME.renderer.domElement;

  // ── Pointer Lock ───────────────────────────────────────
  document.addEventListener('pointerlockchange', () => {
    PLAYER.isLocked = document.pointerLockElement === canvas;
  });

  canvas.addEventListener('click', () => {
    if (GAME.state.gameStarted && !GAME.state.gameOver && !INTERACTION.popupOpen
        && PLAYER.camMode !== 'fixed') {
      canvas.requestPointerLock();
    }
  });

  // ── Mouse look (fps + tps) ─────────────────────────────
  document.addEventListener('mousemove', e => {
    if (!PLAYER.isLocked || PLAYER.camMode === 'fixed') return;
    const sens = 0.0018;
    PLAYER.euler.y -= e.movementX * sens;
    PLAYER.euler.x -= e.movementY * sens;
    PLAYER.euler.x = Math.max(-Math.PI * 0.46, Math.min(Math.PI * 0.46, PLAYER.euler.x));
    if (PLAYER.camMode === 'fps') {
      GAME.camera.quaternion.setFromEuler(PLAYER.euler);
    }
    // TPS: euler.y controls player facing; camera orbits around player next frame
  });

  // ── Keyboard ───────────────────────────────────────────
  document.addEventListener('keydown', e => {
    PLAYER.keys[e.code] = true;
    if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
    if (GAME.state.gameStarted && e.code === 'KeyV') _toggleCamFpsTps();
    if (GAME.state.gameStarted && e.code === 'KeyC') _cycleFixedCam();
  });
  document.addEventListener('keyup', e => { PLAYER.keys[e.code] = false; });

  _initJoystick();
  _initMobileLook();
}

// ── Camera mode toggles (also called from game.html) ───────
function _toggleCamFpsTps() {
  if (PLAYER.camMode === 'fixed') {
    // Fixed → fps
    PLAYER.camMode = 'fps';
    PLAYER.worldPos.set(GAME.camera.position.x, 0, GAME.camera.position.z);
    GAME.camera.quaternion.setFromEuler(PLAYER.euler);
    GAME.renderer.domElement.requestPointerLock();
  } else if (PLAYER.camMode === 'fps') {
    PLAYER.camMode = 'tps';
    PLAYER.worldPos.set(GAME.camera.position.x, 0, GAME.camera.position.z);
    GAME.renderer.domElement.requestPointerLock();
  } else {
    // TPS → fps
    PLAYER.camMode = 'fps';
    GAME.camera.position.set(PLAYER.worldPos.x, 1.7, PLAYER.worldPos.z);
    GAME.camera.quaternion.setFromEuler(PLAYER.euler);
    GAME.renderer.domElement.requestPointerLock();
  }
  if (typeof _updateCamBtns === 'function') _updateCamBtns();
}

function _cycleFixedCam() {
  if (PLAYER.camMode !== 'fixed') {
    PLAYER.camMode = 'fixed';
    PLAYER.fixedCamIdx = 0;
    if (document.pointerLockElement) document.exitPointerLock();
  } else {
    PLAYER.fixedCamIdx = (PLAYER.fixedCamIdx + 1) % FIXED_CAMS.length;
  }
  if (typeof _updateCamBtns === 'function') _updateCamBtns();
}

function updatePlayer(delta) {
  if (GAME.state.gameOver) return;

  // Movement (disabled in fixed cam mode)
  const canMove = (PLAYER.isLocked || PLAYER.mobileActive) && PLAYER.camMode !== 'fixed';

  if (canMove) {
    const speed  = (PLAYER.keys['ShiftLeft'] || PLAYER.keys['ShiftRight']) ? PLAYER.sprint : PLAYER.speed;
    const yaw    = PLAYER.euler.y;
    const fwd    = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const right  = new THREE.Vector3( Math.cos(yaw), 0, -Math.sin(yaw));
    const move   = new THREE.Vector3();

    if (PLAYER.keys['KeyW'] || PLAYER.keys['ArrowUp'])    move.addScaledVector(fwd,   1);
    if (PLAYER.keys['KeyS'] || PLAYER.keys['ArrowDown'])  move.addScaledVector(fwd,  -1);
    if (PLAYER.keys['KeyA'] || PLAYER.keys['ArrowLeft'])  move.addScaledVector(right,-1);
    if (PLAYER.keys['KeyD'] || PLAYER.keys['ArrowRight']) move.addScaledVector(right, 1);
    if (PLAYER.joyY !== 0) move.addScaledVector(fwd,   PLAYER.joyY);
    if (PLAYER.joyX !== 0) move.addScaledVector(right, PLAYER.joyX);

    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(speed * delta);
      PLAYER.worldPos.add(move);
      PLAYER.worldPos.x = Math.max(-38, Math.min(38, PLAYER.worldPos.x));
      PLAYER.worldPos.z = Math.max(-38, Math.min(38, PLAYER.worldPos.z));
      PLAYER._stepTimer = (PLAYER._stepTimer || 0) + delta;
      if (PLAYER._stepTimer > 0.38) { PLAYER._stepTimer = 0; if (typeof SOUND !== 'undefined') SOUND.footstep(); }
    }
  }

  // Mobile look (FPS only)
  if (PLAYER.camMode === 'fps' && (PLAYER.lookDX !== 0 || PLAYER.lookDY !== 0)) {
    PLAYER.euler.y -= PLAYER.lookDX * 0.003;
    PLAYER.euler.x -= PLAYER.lookDY * 0.003;
    PLAYER.euler.x = Math.max(-Math.PI * 0.46, Math.min(Math.PI * 0.46, PLAYER.euler.x));
    GAME.camera.quaternion.setFromEuler(PLAYER.euler);
    PLAYER.lookDX = 0;
    PLAYER.lookDY = 0;
  }

  // ── Camera positioning by mode ─────────────────────────
  if (PLAYER.camMode === 'fps') {
    GAME.camera.position.set(PLAYER.worldPos.x, 1.7, PLAYER.worldPos.z);

  } else if (PLAYER.camMode === 'tps') {
    const yaw     = PLAYER.euler.y;
    // Camera sits 4.5m behind + 3m above the player
    const behind  = new THREE.Vector3(
      Math.sin(yaw) * 4.5,
      3.0,
      Math.cos(yaw) * 4.5
    );
    const desired = new THREE.Vector3(
      PLAYER.worldPos.x + behind.x,
      PLAYER.worldPos.y + behind.y,
      PLAYER.worldPos.z + behind.z
    );
    GAME.camera.position.lerp(desired, Math.min(1, 10 * delta));
    // Look at player's shoulder height
    GAME.camera.lookAt(PLAYER.worldPos.x, PLAYER.worldPos.y + 1.5, PLAYER.worldPos.z);

  } else if (PLAYER.camMode === 'fixed') {
    const fc = FIXED_CAMS[PLAYER.fixedCamIdx % FIXED_CAMS.length];
    GAME.camera.position.lerp(fc.pos, Math.min(1, 6 * delta));
    GAME.camera.lookAt(fc.target);
  }
}

// ── Joystick ───────────────────────────────────────────────
function _initJoystick() {
  const base = document.getElementById('joystick-base');
  const knob = document.getElementById('joystick-knob');
  if (!base || !knob) return;

  let startX = 0, startY = 0, touching = false;
  const MAX = 36;

  base.addEventListener('touchstart', e => {
    e.preventDefault();
    const t = e.touches[0];
    startX = t.clientX; startY = t.clientY;
    touching = true;
    PLAYER.mobileActive = true;
    if (!GAME.state.gameStarted) {
      GAME.state.gameStarted = true;
      document.getElementById('blocker').style.display = 'none';
    }
  }, { passive: false });

  base.addEventListener('touchmove', e => {
    e.preventDefault();
    if (!touching) return;
    const t = e.touches[0];
    let dx = t.clientX - startX;
    let dy = t.clientY - startY;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist > MAX) { dx *= MAX/dist; dy *= MAX/dist; }
    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    PLAYER.joyX =  dx / MAX;
    PLAYER.joyY = -dy / MAX;
  }, { passive: false });

  base.addEventListener('touchend', () => {
    touching = false;
    PLAYER.joyX = 0; PLAYER.joyY = 0;
    knob.style.transform = 'translate(-50%, -50%)';
  });
}

// ── Mobile look (swipe on right half) ─────────────────────
function _initMobileLook() {
  const area = document.getElementById('mobile-look');
  if (!area) return;

  let prevX = 0, prevY = 0, active = false;

  area.addEventListener('touchstart', e => {
    e.preventDefault();
    const t = e.touches[0];
    prevX = t.clientX; prevY = t.clientY;
    active = true;
    if (!GAME.state.gameStarted) {
      GAME.state.gameStarted = true;
      document.getElementById('blocker').style.display = 'none';
    }
  }, { passive: false });

  area.addEventListener('touchmove', e => {
    e.preventDefault();
    if (!active) return;
    const t = e.touches[0];
    PLAYER.lookDX += t.clientX - prevX;
    PLAYER.lookDY += t.clientY - prevY;
    prevX = t.clientX; prevY = t.clientY;
  }, { passive: false });

  area.addEventListener('touchend', () => { active = false; });
}
