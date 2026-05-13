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
  // Collision
  _collisionRay: null,
  // Vertical physics
  velocityY: 0,
  onGround: true,
  jumpSpeed: 7.5,     // m/s
  gravity:   22,      // m/s²
  eyeHeight: 1.7,     // 카메라 높이 (발 기준)
  bodyRadius: 0.22,   // 몸 반경 (multi-ray sampling)
  terminalVelocity: -55,
  coyoteTime: 0.15,   // 발 벗어난 후 점프 허용 시간
  jumpBuffer: 0.15,   // 점프 키를 미리 누른 후 인식 시간
  _coyoteT: 0,
  _bufferT: 0,
  _downRay: null,
  _upRay:   null,
};

// Fixed camera presets — populated in initPlayer after Three.js is ready
let FIXED_CAMS;
// 프레임마다 재사용 — GC 방지
const _BOB_ROLL_Q = new THREE.Quaternion();

function initPlayer() {
  PLAYER.euler   = new THREE.Euler(0, 0, 0, 'YXZ');
  PLAYER.worldPos = new THREE.Vector3(0, 0, 12);
  PLAYER._collisionRay = new THREE.Raycaster();
  PLAYER._downRay      = new THREE.Raycaster();
  PLAYER._upRay        = new THREE.Raycaster();

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
    let sens = 0.0018;
    try { const s = parseFloat(localStorage.getItem('bulsa_sens')); if (!isNaN(s) && s > 0) sens = s; } catch (err) {}
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
    // 점프 버퍼 — SPACE 입력 시 짧은 시간 동안 점프 의도 유지
    if (GAME.state.gameStarted && e.code === 'Space') {
      const surveyUsesSpace = (typeof SURVEY !== 'undefined' && SURVEY.active);
      if (!surveyUsesSpace) {
        PLAYER._bufferT = PLAYER.jumpBuffer;
      }
    }
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
  if (GAME.state.gameOver || GAME.state.paused) return;

  // Movement (disabled in fixed cam mode)
  const canMove = (PLAYER.isLocked || PLAYER.mobileActive) && PLAYER.camMode !== 'fixed';

  // 가속도 보간 — 시작/정지 시 부드러운 가속
  PLAYER._curSpeed = PLAYER._curSpeed || 0;
  const isSprint = (PLAYER.keys['ShiftLeft'] || PLAYER.keys['ShiftRight']);
  const isCrouch = (PLAYER.keys['ControlLeft'] || PLAYER.keys['ControlRight']);
  const targetSpeed = isCrouch ? 2.0 : (isSprint ? PLAYER.sprint : PLAYER.speed);
  // 크라우치 시 눈높이 낮춤 — eyeHeight 동적 보간
  PLAYER._eyeTarget = isCrouch ? 1.05 : 1.7;
  PLAYER.eyeHeight = PLAYER.eyeHeight + (PLAYER._eyeTarget - PLAYER.eyeHeight) * Math.min(1, 10 * delta);

  // 카메라 보브 누적
  PLAYER._bobT = PLAYER._bobT || 0;

  // 스프린트 FOV 보간
  if (GAME.camera) {
    PLAYER._fovBase = PLAYER._fovBase || GAME.camera.fov || 72;
    const fovTarget = isSprint && canMove && (PLAYER.keys['KeyW']||PLAYER.keys['ArrowUp']) ? (PLAYER._fovBase + 6) : PLAYER._fovBase;
    if (Math.abs(GAME.camera.fov - fovTarget) > 0.1) {
      GAME.camera.fov += (fovTarget - GAME.camera.fov) * Math.min(1, 8 * delta);
      GAME.camera.updateProjectionMatrix();
    }
  }

  if (canMove) {
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

    // 가속/감속 — 입력 있으면 목표로 보간, 없으면 0으로 감속
    const inputting = move.lengthSq() > 0;
    PLAYER._curSpeed += ((inputting ? targetSpeed : 0) - PLAYER._curSpeed) * Math.min(1, 10 * delta);
    if (Math.abs(PLAYER._curSpeed) < 0.05) PLAYER._curSpeed = 0;

    if (inputting && PLAYER._curSpeed > 0.05) {
      move.normalize().multiplyScalar(PLAYER._curSpeed * delta);
      // 보브 타이머 누적 (속도 비례)
      PLAYER._bobT += delta * (PLAYER._curSpeed / PLAYER.speed) * 8;

      // ── Collision detection (raycaster-based wall slide) ──
      const colliders = GAME.colliders;
      if (colliders && colliders.length > 0) {
        const origin  = new THREE.Vector3(PLAYER.worldPos.x, 1.0, PLAYER.worldPos.z);
        const moveDir = move.clone().normalize();
        PLAYER._collisionRay.set(origin, moveDir);
        PLAYER._collisionRay.near = 0;
        PLAYER._collisionRay.far  = 0.55;
        const hits = PLAYER._collisionRay.intersectObjects(colliders, true);
        if (hits.length > 0) {
          const faceNormal = hits[0].face ? hits[0].face.normal.clone() : moveDir.clone().negate();
          const normal = faceNormal.transformDirection(hits[0].object.matrixWorld);
          normal.y = 0;
          normal.normalize();
          const dot = move.dot(normal);
          if (dot < 0) move.addScaledVector(normal, -dot); // slide along wall
        }
      }
      // ─────────────────────────────────────────────────────

      PLAYER.worldPos.add(move);

      // NPC soft push-back — NPC가 GAME.colliders에 없으므로 직접 반경 체크
      if (GAME.npcs && GAME.npcs.length) {
        const NPC_R   = 0.55;
        const PLR_R   = 0.22;
        const minDist = NPC_R + PLR_R;
        for (const npc of GAME.npcs) {
          if (!npc.group) continue;
          if (npc.state === NPC_STATES.ACCIDENT) continue;
          const dx = PLAYER.worldPos.x - npc.group.position.x;
          const dz = PLAYER.worldPos.z - npc.group.position.z;
          const d2 = dx * dx + dz * dz;
          if (d2 >= minDist * minDist || d2 < 1e-6) continue;
          const d    = Math.sqrt(d2);
          const push = minDist - d;
          PLAYER.worldPos.x += (dx / d) * push;
          PLAYER.worldPos.z += (dz / d) * push;
        }
      }

      PLAYER.worldPos.x = Math.max(-38, Math.min(38, PLAYER.worldPos.x));
      PLAYER.worldPos.z = Math.max(-38, Math.min(38, PLAYER.worldPos.z));
      PLAYER._stepTimer = (PLAYER._stepTimer || 0) + delta;
      if (PLAYER._stepTimer > 0.38 && PLAYER.onGround) { PLAYER._stepTimer = 0; if (typeof SOUND !== 'undefined') SOUND.footstep(); }
    }
  }

  // ── Vertical physics (중력 + 바닥 감지) ────────────────────
  _applyVerticalPhysics(delta);

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
    // 카메라 보브 — 걸을 때 수직/좌우 진동 (강화: 진폭 2배, abs(sin), roll)
    const bobAmp  = Math.min(1, PLAYER._curSpeed / PLAYER.sprint) * 0.09;
    const bobY    = PLAYER.onGround ? Math.abs(Math.sin(PLAYER._bobT)) * bobAmp : 0;
    const bobX    = PLAYER.onGround ? Math.sin(PLAYER._bobT * 0.5) * bobAmp * 0.7 : 0;
    const bobRoll = PLAYER.onGround ? Math.sin(PLAYER._bobT * 0.5) * bobAmp * 0.6 : 0;
    GAME.camera.position.set(
      PLAYER.worldPos.x + bobX,
      PLAYER.worldPos.y + PLAYER.eyeHeight + bobY,
      PLAYER.worldPos.z
    );
    // PLAYER.euler(YXZ) → quaternion 재적용 후 roll을 쿼터니언으로 합성
    // (camera.rotation.z 직접 할당은 XYZ 짐벌락 → 수직 클램프 파괴)
    GAME.camera.quaternion.setFromEuler(PLAYER.euler);
    if (bobRoll !== 0) {
      const s = Math.sin(bobRoll * 0.5), c = Math.cos(bobRoll * 0.5);
      GAME.camera.quaternion.multiply(_BOB_ROLL_Q.set(0, 0, s, c));
    }

  } else if (PLAYER.camMode === 'tps') {
    const yaw = PLAYER.euler.y;
    const behind = new THREE.Vector3(
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
    GAME.camera.lookAt(PLAYER.worldPos.x, PLAYER.worldPos.y + 1.5, PLAYER.worldPos.z);

  } else if (PLAYER.camMode === 'fixed') {
    const fc = FIXED_CAMS[PLAYER.fixedCamIdx % FIXED_CAMS.length];
    GAME.camera.position.lerp(fc.pos, Math.min(1, 6 * delta));
    GAME.camera.lookAt(fc.target);
  }
}

// ── Vertical physics ──────────────────────────────────────
// 중력 + 다중 raycast 바닥 감지 + 헤드범프 + 코요테/점프버퍼.
function _applyVerticalPhysics(delta) {
  // 1) 타이머 감소
  PLAYER._coyoteT = Math.max(0, PLAYER._coyoteT - delta);
  PLAYER._bufferT = Math.max(0, PLAYER._bufferT - delta);

  // 2) 점프 시도 — 버퍼가 살아있고 (지면 위 OR 코요테 시간 내)
  const canJump = PLAYER.onGround || PLAYER._coyoteT > 0;
  if (PLAYER._bufferT > 0 && canJump) {
    PLAYER.velocityY = PLAYER.jumpSpeed;
    PLAYER.onGround = false;
    PLAYER._coyoteT = 0;
    PLAYER._bufferT = 0;
  }

  // 3) 중력 적용 + 종속속도 제한
  PLAYER.velocityY -= PLAYER.gravity * delta;
  if (PLAYER.velocityY < PLAYER.terminalVelocity) {
    PLAYER.velocityY = PLAYER.terminalVelocity;
  }
  PLAYER.worldPos.y += PLAYER.velocityY * delta;

  // 4) 충돌 대상 — 씬 메시 (avatar/viewmodel 제외)
  const targets = _collectStandables();

  // 5) 헤드범프 — 위로 이동 중이면 천장 검사
  if (PLAYER.velocityY > 0) {
    const headOrigin = new THREE.Vector3(
      PLAYER.worldPos.x,
      PLAYER.worldPos.y + PLAYER.eyeHeight - 0.05,
      PLAYER.worldPos.z
    );
    PLAYER._upRay.set(headOrigin, new THREE.Vector3(0, 1, 0));
    PLAYER._upRay.near = 0;
    PLAYER._upRay.far  = 0.25;
    const upHits = PLAYER._upRay.intersectObjects(targets, false);
    if (upHits.length > 0) {
      PLAYER.velocityY = 0;
      PLAYER.worldPos.y -= 0.02; // 약간 밀어내림
    }
  }

  // 6) 다중 ray 바닥 감지 (몸 둘레 5점 — 엣지 안정)
  // 스텝업 상한: 발에서 maxStepUp 보다 높은 hit 은 "벽 윗면"으로 간주, 무시.
  // (예전 버그: 벽 옆 sample 이 벽 윗면을 잡아 플레이어를 텔레포트시킴)
  const r = PLAYER.bodyRadius;
  const samples = [
    [ 0, 0 ],
    [ r, 0 ], [-r, 0 ],
    [ 0, r ], [ 0, -r ],
  ];
  const maxStepUp = 0.45;          // 보도턱·계단 한 칸 정도만 자동 올라감
  let groundY = -1000;
  for (const [dx, dz] of samples) {
    const o = new THREE.Vector3(
      PLAYER.worldPos.x + dx,
      PLAYER.worldPos.y + PLAYER.eyeHeight + 0.3,
      PLAYER.worldPos.z + dz
    );
    PLAYER._downRay.set(o, new THREE.Vector3(0, -1, 0));
    PLAYER._downRay.near = 0;
    PLAYER._downRay.far  = 40;
    const hits = PLAYER._downRay.intersectObjects(targets, false);
    if (hits.length > 0) {
      for (const h of hits) {
        if (h.point.y > o.y) continue;
        // 발보다 maxStepUp 이상 높은 hit = 벽 윗면. 다음 hit 탐색.
        if (h.point.y - PLAYER.worldPos.y > maxStepUp) continue;
        if (h.point.y > groundY) groundY = h.point.y;
        break;
      }
    }
  }
  if (groundY < -500) groundY = 0;

  // 7) 발이 ground 아래면 표면에 맞춤 + 추락 데미지
  const wasOnGround = PLAYER.onGround;
  const impactVelY  = PLAYER.velocityY;
  if (PLAYER.worldPos.y <= groundY + 0.01) {
    PLAYER.worldPos.y = groundY;
    if (PLAYER.velocityY < 0) PLAYER.velocityY = 0;
    PLAYER.onGround = true;
    PLAYER._coyoteT = PLAYER.coyoteTime;

    // ── 추락 데미지 (충격속도 기반 — 현실 임계치 적용) ──
    // v² = 2gh → h: 2m → v≈9, 4m → v≈13, 10m → v≈21
    // < 9 m/s (h<2m): 무해
    // 9~13  (h 2~4m): 경상 — 안전지수 감소
    // >= 13 (h≥4m, 약 1층 이상): 사망 — 게임오버 사고
    if (!wasOnGround && impactVelY < -9) {
      const v = -impactVelY;
      if (v >= 13) {
        // 사망 사고 — 안전대·추락방지망 미설치 추정
        if (typeof triggerAccident === 'function') triggerAccident('worker_fall');
      } else {
        const severity = Math.round((v - 9) * 6);  // 9~13 → 0~24
        if (typeof applySafetyPenalty === 'function') applySafetyPenalty(severity);
        if (typeof showActionNotif === 'function') {
          const _siLbl = (typeof t === 'function') ? t('safetyIndex') : '명';
          showActionNotif(`💥 경상 — ${_siLbl} -${severity} (충격 ${v.toFixed(1)} m/s)`, 2800);
        }
        _flashFallImpact();
        if (typeof cameraShake === 'function') cameraShake(0.7, 0.45);
      }
    }
  } else {
    if (wasOnGround) {
      PLAYER._coyoteT = PLAYER.coyoteTime;
    }
    PLAYER.onGround = false;
  }
}

function _flashFallImpact() {
  const overlay = document.getElementById('flash-overlay');
  if (!overlay) return;
  overlay.style.background = 'rgba(220,38,38,0.45)';
  overlay.style.opacity = '0.65';
  setTimeout(() => {
    overlay.style.opacity = '0';
    setTimeout(() => { overlay.style.background = ''; }, 400);
  }, 200);
}

function _collectStandables() {
  const out = [];
  GAME.scene.traverse(obj => {
    if (!obj.isMesh) return;
    if (typeof AVATAR !== 'undefined') {
      if (AVATAR.group && _isDescendantOf(obj, AVATAR.group)) return;
      if (AVATAR.vmDetector && _isDescendantOf(obj, AVATAR.vmDetector)) return;
    }
    out.push(obj);
  });
  return out;
}

function _isDescendantOf(child, parent) {
  let p = child.parent;
  while (p) { if (p === parent) return true; p = p.parent; }
  return false;
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
