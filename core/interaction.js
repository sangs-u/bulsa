// Interaction — direct action system
// E 키로 직접 행동 수행. 행동의 옳고 그름은 알려주지 않음.
// 결과는 evaluateLift() 호출 시에만 판정.

const INTERACTION = {
  raycaster:     null,
  center:        null,
  currentTarget: null,
  popupOpen:     false,
  specOpen:      false,
  _eDown:        false,
};

// ── Init ───────────────────────────────────────────────────────
function initInteraction() {
  INTERACTION.raycaster = new THREE.Raycaster();
  INTERACTION.center    = new THREE.Vector2(0, 0);

  document.addEventListener('keydown', e => {
    if (!GAME.state.gameStarted || GAME.state.gameOver) return;

    if (e.code === 'KeyE' && !INTERACTION._eDown) {
      INTERACTION._eDown = true;
      _handleE();
    }

    if (e.code === 'Escape') {
      if (INTERACTION.specOpen) { closeSpecPopup(); return; }
      if (GAME.state.craneBoarded) { exitCraneCab(); return; }
      if (INTERACTION.popupOpen) closePopup();
    }
  });
  document.addEventListener('keyup', e => {
    if (e.code === 'KeyE') INTERACTION._eDown = false;
  });

  // Mobile tap on interact prompt
  const promptEl = document.getElementById('hud-interact');
  if (promptEl) {
    promptEl.style.pointerEvents = 'auto';
    promptEl.addEventListener('click', () => {
      if (!INTERACTION.popupOpen && !INTERACTION.specOpen) _handleE();
    });
  }
}

// ── Frame update ───────────────────────────────────────────────
function updateInteraction() {
  if (INTERACTION.popupOpen || INTERACTION.specOpen || GAME.state.gameOver) return;
  if (GAME.state.craneBoarded) return;

  INTERACTION.raycaster.setFromCamera(INTERACTION.center, GAME.camera);
  const meshes = GAME.interactables.map(i => i.mesh).filter(Boolean);
  const hits   = INTERACTION.raycaster.intersectObjects(meshes, false);

  let closest = null;

  if (hits.length > 0 && hits[0].distance < 4.0) {
    closest = GAME.interactables.find(i => i.mesh === hits[0].object);
  }

  // Proximity fallback for large/invisible triggers
  if (!closest) {
    const cam = GAME.camera.position;
    let minD  = 2.8;
    GAME.interactables.forEach(item => {
      if (!item.mesh) return;
      const d = cam.distanceTo(item.mesh.position);
      if (d < minD) { minD = d; closest = item; }
    });
  }

  INTERACTION.currentTarget = closest;

  if (closest) {
    const label = closest.label || '';
    showInteractPrompt(`[E]  ${label}`);
  } else {
    hideInteractPrompt();
  }
}

// ── E key handler ──────────────────────────────────────────────
function _handleE() {
  if (GAME.state.craneBoarded) { exitCraneCab(); return; }
  if (INTERACTION.popupOpen || INTERACTION.specOpen) return;

  const target = INTERACTION.currentTarget;
  if (!target) return;

  switch (target.type) {
    case 'action':     performAction(target.actionId); break;
    case 'document':   openSpecPopup(target.docId);    break;
    case 'crane_cab':  boardCrane();                    break;
    case 'npc':        openPopup(target);               break;   // instruction.js handles
  }
}

// ── Direct actions ─────────────────────────────────────────────
function performAction(actionId) {
  switch (actionId) {

    case 'inspect_sling':
      LIFT_STATE.slingInspected = true;
      showActionNotif('슬링 점검 완료');
      _dimActionMesh('inspect_sling');
      break;

    case 'secure_pin':
      LIFT_STATE.pinSecured = true;
      showActionNotif('안전핀 체결 완료');
      _dimActionMesh('secure_pin');
      break;

    case 'measure_angle': {
      LIFT_STATE.angleMeasured = true;
      const deg = 58; // 수직에서 58° — KOSHA 기준 60° 이내 준수
      showActionNotif(`슬링 각도 측정 완료 · ${deg}°`, 3200);
      _dimActionMesh('measure_angle');
      break;
    }

    case 'evacuate_worker':
      if (LIFT_STATE.workerEvacuated) return;
      LIFT_STATE.workerEvacuated = true;
      showActionNotif('대피 지시 완료');
      _evacuateWorker();
      break;

    case 'assign_signal': {
      if (LIFT_STATE.signalAssigned) return;
      LIFT_STATE.signalAssigned = true;
      showActionNotif('신호수 위치 지정 완료');
      _moveSignalNPC();
      _dimActionMesh('assign_signal');
      break;
    }
  }
}

// 행동 완료된 오브젝트를 인터랙터블에서 제거 + 시각적으로 흐리게
function _dimActionMesh(actionId) {
  const item = GAME.interactables.find(i => i.actionId === actionId);
  if (!item || !item.mesh) return;
  if (item.mesh.material) {
    item.mesh.material.opacity    = 0.3;
    item.mesh.material.transparent = true;
  }
  GAME.interactables = GAME.interactables.filter(i => i.actionId !== actionId);
  if (INTERACTION.currentTarget === item) {
    INTERACTION.currentTarget = null;
    hideInteractPrompt();
  }
}

// 작업반경 내 근로자 대피 애니메이션
function _evacuateWorker() {
  const w = GAME._dangerWorker;
  if (!w) return;

  // 인터랙터블에서 제거
  GAME.interactables = GAME.interactables.filter(i => i.mesh !== w.trigger);
  INTERACTION.currentTarget = null;
  hideInteractPrompt();

  const target = new THREE.Vector3(10, 0, 5);
  const g      = w.group;

  (function walk() {
    if (GAME.state.gameOver) return;
    const dir = new THREE.Vector3().subVectors(target, g.position);
    if (dir.length() > 0.3) {
      dir.normalize().multiplyScalar(0.055);
      g.position.add(dir);
      g.rotation.y = Math.atan2(dir.x, dir.z);
      requestAnimationFrame(walk);
    } else {
      g.visible = false;
    }
  })();
}

// 신호수 NPC 위치 이동
function _moveSignalNPC() {
  if (!GAME.npcs) return;
  const gimc = GAME.npcs.find(n => n.id === 'gimc');
  if (!gimc || !gimc.group) return;
  gimc._targetPos = new THREE.Vector3(3, 0, -6);
  gimc.setState(NPC_STATES.WORKING);
}

// ── Spec sheet popup ──────────────────────────────────────────
function openSpecPopup() {
  LIFT_STATE.specChecked = true;
  INTERACTION.specOpen   = true;
  INTERACTION.popupOpen  = true;
  if (document.pointerLockElement) document.exitPointerLock();

  // 사양서 오브젝트를 인터랙터블에서 제거 (한 번만 읽기)
  const specItem = GAME.interactables.find(i => i.docId === 'crane_spec');
  if (specItem && specItem.mesh && specItem.mesh.material) {
    specItem.mesh.material.opacity     = 0.35;
    specItem.mesh.material.transparent = true;
  }
  GAME.interactables = GAME.interactables.filter(i => i.docId !== 'crane_spec');
  INTERACTION.currentTarget = null;
  hideInteractPrompt();

  document.getElementById('spec-popup').classList.remove('hidden');
}

function closeSpecPopup() {
  INTERACTION.specOpen  = false;
  INTERACTION.popupOpen = false;
  document.getElementById('spec-popup').classList.add('hidden');
  if (GAME.state.gameStarted && !GAME.state.gameOver && window.matchMedia('(pointer: fine)').matches) {
    GAME.renderer.domElement.requestPointerLock();
  }
}

// ── Crane cab ─────────────────────────────────────────────────
function boardCrane() {
  if (GAME.state.craneBoarded) return;
  GAME.state.craneBoarded = true;
  INTERACTION.popupOpen   = true;
  if (document.pointerLockElement) document.exitPointerLock();

  GAME._prevCamMode  = PLAYER.camMode;
  GAME._prevWorldPos = PLAYER.worldPos.clone();

  // 운전석 시점으로 카메라 이동
  PLAYER.camMode = 'fixed';
  GAME.camera.position.set(14, 1.45, -5.6);
  GAME.camera.lookAt(14, 1.3, -4.0);

  document.getElementById('crane-cab-overlay').classList.remove('hidden');
  hideInteractPrompt();
  if (typeof SOUND !== 'undefined') SOUND.craneFadeIn();
}

function exitCraneCab() {
  if (!GAME.state.craneBoarded) return;
  GAME.state.craneBoarded = false;
  INTERACTION.popupOpen   = false;

  PLAYER.camMode = GAME._prevCamMode || 'fps';
  if (GAME._prevWorldPos) PLAYER.worldPos.copy(GAME._prevWorldPos);
  GAME.camera.position.set(PLAYER.worldPos.x, 1.7, PLAYER.worldPos.z);

  document.getElementById('crane-cab-overlay').classList.add('hidden');
  if (typeof SOUND !== 'undefined') SOUND.craneFadeOut();

  if (!GAME.state.gameOver && window.matchMedia('(pointer: fine)').matches) {
    GAME.renderer.domElement.requestPointerLock();
  }
  if (typeof _updateCamBtns === 'function') _updateCamBtns();
}

// ── Lift animation (called from evaluateLift on success) ──────
function animateLift() {
  const beam = GAME.liftBeam;
  if (!beam) { showCompletePanel(); return; }

  const target = 8;
  const speed  = 1.8;

  (function rise() {
    if (GAME.state.gameOver) return;
    beam.position.y += speed * 0.016;
    if (beam.position.y < target) {
      requestAnimationFrame(rise);
    } else {
      GAME.state.phase = 3;
      updateHUD();
      setTimeout(showCompletePanel, 700);
    }
  })();
}

// ── NPC popup — kept for instruction.js monkey-patch ─────────
function openPopup(item) {
  // instruction.js overrides this function to handle 'npc' type
}

function closePopup() {
  INTERACTION.popupOpen = false;
  const popup = document.getElementById('hazard-popup');
  if (popup) popup.classList.add('hidden');
  if (GAME.state.gameStarted && !GAME.state.gameOver && window.matchMedia('(pointer: fine)').matches) {
    GAME.renderer.domElement.requestPointerLock();
  }
}
