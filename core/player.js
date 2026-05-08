// Player controller — WASD + Pointer Lock + mobile joystick/look

const PLAYER = {
  speed: 5,
  sprint: 10,
  keys: {},
  euler: null,
  isLocked: false,
  // Mobile
  mobileActive: false,
  joyX: 0,
  joyY: 0,
  lookDX: 0,
  lookDY: 0,
};

function initPlayer() {
  PLAYER.euler = new THREE.Euler(0, 0, 0, 'YXZ');

  const canvas = GAME.renderer.domElement;

  // ── Pointer Lock ───────────────────────────────────────
  document.addEventListener('pointerlockchange', () => {
    PLAYER.isLocked = document.pointerLockElement === canvas;
  });

  canvas.addEventListener('click', () => {
    if (GAME.state.gameStarted && !GAME.state.gameOver && !INTERACTION.popupOpen) {
      canvas.requestPointerLock();
    }
  });

  // ── Mouse look ─────────────────────────────────────────
  document.addEventListener('mousemove', e => {
    if (!PLAYER.isLocked) return;
    const sens = 0.0018;
    PLAYER.euler.setFromQuaternion(GAME.camera.quaternion);
    PLAYER.euler.y -= e.movementX * sens;
    PLAYER.euler.x -= e.movementY * sens;
    PLAYER.euler.x = Math.max(-Math.PI * 0.46, Math.min(Math.PI * 0.46, PLAYER.euler.x));
    GAME.camera.quaternion.setFromEuler(PLAYER.euler);
  });

  // ── Keyboard ───────────────────────────────────────────
  document.addEventListener('keydown', e => {
    PLAYER.keys[e.code] = true;
    // Prevent space/arrow scroll
    if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
  });
  document.addEventListener('keyup', e => { PLAYER.keys[e.code] = false; });

  // ── Mobile joystick ────────────────────────────────────
  _initJoystick();

  // ── Mobile look (right-side swipe) ────────────────────
  _initMobileLook();
}

function updatePlayer(delta) {
  if (GAME.state.gameOver) return;
  if (!PLAYER.isLocked && !PLAYER.mobileActive) return;

  const speed = (PLAYER.keys['ShiftLeft'] || PLAYER.keys['ShiftRight']) ? PLAYER.sprint : PLAYER.speed;

  // Forward/right vectors (horizontal only)
  const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(GAME.camera.quaternion);
  fwd.y = 0; fwd.normalize();
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(GAME.camera.quaternion);
  right.y = 0; right.normalize();

  const move = new THREE.Vector3();

  // Keyboard input
  if (PLAYER.keys['KeyW'] || PLAYER.keys['ArrowUp'])    move.addScaledVector(fwd,   1);
  if (PLAYER.keys['KeyS'] || PLAYER.keys['ArrowDown'])  move.addScaledVector(fwd,  -1);
  if (PLAYER.keys['KeyA'] || PLAYER.keys['ArrowLeft'])  move.addScaledVector(right,-1);
  if (PLAYER.keys['KeyD'] || PLAYER.keys['ArrowRight']) move.addScaledVector(right, 1);

  // Mobile joystick input
  if (PLAYER.joyY !== 0) move.addScaledVector(fwd,   PLAYER.joyY);
  if (PLAYER.joyX !== 0) move.addScaledVector(right, PLAYER.joyX);

  if (move.lengthSq() > 0) {
    move.normalize().multiplyScalar(speed * delta);
    GAME.camera.position.add(move);

    // World bounds
    GAME.camera.position.x = Math.max(-38, Math.min(38, GAME.camera.position.x));
    GAME.camera.position.z = Math.max(-38, Math.min(38, GAME.camera.position.z));
  }

  // Keep camera at eye height
  GAME.camera.position.y = 1.7;

  // Mobile look
  if (PLAYER.lookDX !== 0 || PLAYER.lookDY !== 0) {
    PLAYER.euler.setFromQuaternion(GAME.camera.quaternion);
    PLAYER.euler.y -= PLAYER.lookDX * 0.003;
    PLAYER.euler.x -= PLAYER.lookDY * 0.003;
    PLAYER.euler.x = Math.max(-Math.PI * 0.46, Math.min(Math.PI * 0.46, PLAYER.euler.x));
    GAME.camera.quaternion.setFromEuler(PLAYER.euler);
    PLAYER.lookDX = 0;
    PLAYER.lookDY = 0;
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
    startX = t.clientX;
    startY = t.clientY;
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
    PLAYER.joyX = 0;
    PLAYER.joyY = 0;
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
    prevX = t.clientX;
    prevY = t.clientY;
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
    prevX = t.clientX;
    prevY = t.clientY;
  }, { passive: false });

  area.addEventListener('touchend', () => { active = false; });
}
