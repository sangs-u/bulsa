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

// ── Phase gate ────────────────────────────────────────────────
function getCurrentPhase() {
  if (!LIFT_STATE.planWritten)       return 1;
  if (!LIFT_STATE.safetyChecked)     return 2;
  if (!LIFT_STATE.outriggerExtended) return 3;
  if (!LIFT_STATE.slingInspected || !LIFT_STATE.pinSecured ||
      !LIFT_STATE.angleMeasured)     return 4;
  if (!LIFT_STATE.signalAssigned || !LIFT_STATE.workerEvacuated) return 5;
  return 6;
}

// ── Direct actions ─────────────────────────────────────────────
function performAction(actionId) {
  switch (actionId) {

    case 'write_plan':
      if (LIFT_STATE.planWritten) {
        showActionNotif('이미 작성된 계획서입니다');
        break;
      }
      openPlanPanel();
      break;

    case 'safety_review':
      if (!LIFT_STATE.planWritten) {
        showActionNotif('먼저 작업계획서를 작성하세요');
        break;
      }
      if (LIFT_STATE.safetyChecked) {
        showActionNotif('안전성 검토가 완료되었습니다');
        break;
      }
      openSafetyPanel();
      break;

    case 'extend_outrigger':
      if (!LIFT_STATE.safetyChecked) {
        showActionNotif('먼저 안전성 검토를 완료하세요');
        break;
      }
      if (LIFT_STATE.outriggerExtended) {
        showActionNotif('아웃트리거가 이미 확장되었습니다');
        break;
      }
      openEquipmentPanel();
      break;

    case 'inspect_sling':
      if (!LIFT_STATE.outriggerExtended) {
        showActionNotif('먼저 장비 세팅을 완료하세요');
        break;
      }
      LIFT_STATE.slingInspected = true;
      GAME.state.phase = getCurrentPhase();
      updateHUD();
      showActionNotif('슬링 점검 완료');
      _dimActionMesh('inspect_sling');
      break;

    case 'secure_pin':
      if (!LIFT_STATE.outriggerExtended) {
        showActionNotif('먼저 장비 세팅을 완료하세요');
        break;
      }
      LIFT_STATE.pinSecured = true;
      GAME.state.phase = getCurrentPhase();
      updateHUD();
      showActionNotif('안전핀 체결 완료');
      _dimActionMesh('secure_pin');
      break;

    case 'measure_angle': {
      if (!LIFT_STATE.outriggerExtended) {
        showActionNotif('먼저 장비 세팅을 완료하세요');
        break;
      }
      LIFT_STATE.angleMeasured = true;
      GAME.state.phase = getCurrentPhase();
      updateHUD();
      const deg = 58; // 수직에서 58° — KOSHA 기준 60° 이내 준수
      showActionNotif(`슬링 각도 측정 완료 · ${deg}°`, 3200);
      _dimActionMesh('measure_angle');
      break;
    }

    case 'evacuate_worker':
      if (LIFT_STATE.workerEvacuated) return;
      LIFT_STATE.workerEvacuated = true;
      GAME.state.phase = getCurrentPhase();
      updateHUD();
      showActionNotif('대피 지시 완료');
      _evacuateWorker();
      break;

    case 'assign_signal': {
      if (LIFT_STATE.signalAssigned) return;
      LIFT_STATE.signalAssigned = true;
      GAME.state.phase = getCurrentPhase();
      updateHUD();
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

// ── Phase 1: Plan Panel ───────────────────────────────────────
function openPlanPanel() {
  document.exitPointerLock();
  INTERACTION.popupOpen = true;
  const panel = document.getElementById('plan-panel');
  panel.classList.remove('hidden');

  const checks = panel.querySelectorAll('.plan-check');
  const updateProgress = () => {
    const done = [...checks].filter(c => c.checked).length;
    document.getElementById('plan-progress-text').textContent = `${done} / ${checks.length} 항목 완료`;
    document.getElementById('plan-btn-sign').disabled = done < checks.length;
  };
  // Re-attach to avoid duplicate listeners on repeated open
  checks.forEach(c => {
    const clone = c.cloneNode(true);
    c.parentNode.replaceChild(clone, c);
  });
  panel.querySelectorAll('.plan-check').forEach(c => c.addEventListener('change', updateProgress));
  updateProgress();

  const signBtn = document.getElementById('plan-btn-sign');
  signBtn.onclick = () => {
    panel.classList.add('hidden');
    INTERACTION.popupOpen = false;
    LIFT_STATE.planWritten = true;
    GAME.state.phase = getCurrentPhase();
    updateHUD();
    showActionNotif('✅ 작업계획서 제출 완료');
    if (GAME.state.gameStarted && !GAME.state.gameOver && window.matchMedia('(pointer: fine)').matches) {
      document.getElementById('gameCanvas').requestPointerLock();
    }
  };
}

// ── Phase 2: Safety Panel ─────────────────────────────────────
function openSafetyPanel() {
  document.exitPointerLock();
  INTERACTION.popupOpen = true;
  const panel = document.getElementById('safety-panel');
  panel.classList.remove('hidden');

  // Reset result + confirm button visibility
  document.getElementById('safety-result').classList.add('hidden');
  document.getElementById('safety-btn-confirm').classList.add('hidden');

  document.getElementById('safety-btn-calc').onclick = () => {
    const W        = 3.2;  // ton
    const alpha    = 58;   // degrees
    const betaRad  = (alpha / 2) * Math.PI / 180;
    const K        = 1 / Math.cos(betaRad);
    const lines    = 2;
    const slingSwl = 3.0;  // ton (기본값)
    const Ts       = (W * K) / lines;
    const sr       = Ts / slingSwl;

    document.getElementById('sc-k').textContent   = K.toFixed(3);
    document.getElementById('sc-swl').textContent = slingSwl.toFixed(1) + ' ton';
    document.getElementById('sc-ts').textContent  = Ts.toFixed(3) + ' ton';
    document.getElementById('sc-sr').textContent  = (sr * 100).toFixed(1) + '%';

    const resultEl = document.getElementById('safety-result');
    resultEl.classList.remove('hidden', 'ok', 'ng');

    if (sr <= 1.0) {
      resultEl.classList.add('ok');
      resultEl.textContent = '✅ 안전 — 사용률 ' + (sr * 100).toFixed(1) + '% (기준: 100% 이하)';
      document.getElementById('safety-btn-confirm').classList.remove('hidden');
    } else {
      resultEl.classList.add('ng');
      resultEl.textContent = '❌ 위험 — 슬링 규격 상향 필요';
    }
  };

  document.getElementById('safety-btn-confirm').onclick = () => {
    panel.classList.add('hidden');
    INTERACTION.popupOpen = false;
    LIFT_STATE.safetyChecked = true;
    GAME.state.phase = getCurrentPhase();
    updateHUD();
    showActionNotif('✅ 안전성 검토 완료');
    if (GAME.state.gameStarted && !GAME.state.gameOver && window.matchMedia('(pointer: fine)').matches) {
      document.getElementById('gameCanvas').requestPointerLock();
    }
  };
}

// ── Phase 3: Equipment Panel ──────────────────────────────────
function openEquipmentPanel() {
  document.exitPointerLock();
  INTERACTION.popupOpen = true;
  const panel = document.getElementById('equipment-panel');
  panel.classList.remove('hidden');

  // Reset state indicators
  ['eq-outrigger', 'eq-level', 'eq-overload'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove('done');
      el.querySelector('.eq-status').textContent = '대기';
    }
  });
  document.getElementById('level-indicator').classList.add('hidden');
  document.getElementById('equipment-btn-confirm').disabled = true;

  let outriggerDone = false;
  let levelDone     = false;
  let overloadDone  = false;

  const updateEquipment = () => {
    document.getElementById('equipment-btn-confirm').disabled = !(outriggerDone && levelDone && overloadDone);
  };

  _animateOutriggers(() => {
    const eqOut = document.getElementById('eq-outrigger');
    if (eqOut) { eqOut.classList.add('done'); eqOut.querySelector('.eq-status').textContent = '완료'; }
    outriggerDone = true;
    document.getElementById('level-indicator').classList.remove('hidden');
    updateEquipment();
  });

  document.getElementById('level-confirm-btn').onclick = () => {
    const eqLvl = document.getElementById('eq-level');
    if (eqLvl) { eqLvl.classList.add('done'); eqLvl.querySelector('.eq-status').textContent = '완료'; }
    document.getElementById('level-indicator').classList.add('hidden');
    levelDone = true;

    setTimeout(() => {
      const eqOl = document.getElementById('eq-overload');
      if (eqOl) { eqOl.classList.add('done'); eqOl.querySelector('.eq-status').textContent = '완료'; }
      overloadDone = true;
      updateEquipment();
    }, 1500);

    updateEquipment();
  };

  document.getElementById('equipment-btn-confirm').onclick = () => {
    panel.classList.add('hidden');
    INTERACTION.popupOpen = false;
    LIFT_STATE.outriggerExtended = true;
    GAME.state.phase = getCurrentPhase();
    updateHUD();
    showActionNotif('✅ 장비 세팅 완료 — 줄걸이 작업을 시작하세요');
    if (GAME.state.gameStarted && !GAME.state.gameOver && window.matchMedia('(pointer: fine)').matches) {
      document.getElementById('gameCanvas').requestPointerLock();
    }
  };
}

function _animateOutriggers(onComplete) {
  const outriggers = GAME._outriggers;
  if (!outriggers || outriggers.length === 0) { onComplete(); return; }

  let done = 0;
  outriggers.forEach((o, i) => {
    setTimeout(() => {
      let t = 0;
      (function ext() {
        t += 0.05;
        if (o.arm) o.arm.scale.z = Math.min(1 + t * 1.5, 2.5);
        if (o.pad) o.pad.visible = true;
        if (t < 1) requestAnimationFrame(ext);
        else {
          done++;
          if (done === outriggers.length) onComplete();
        }
      })();
    }, i * 200);
  });
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
    const dy = speed * 0.016;

    // Move beam
    beam.position.y += dy;

    // Move hook block + curve together with beam
    const h = GAME._craneHook;
    if (h) {
      if (h.block) h.block.position.y += dy;
      if (h.curve) h.curve.position.y += dy;

      // Shorten hoist cable: keep top point fixed, lower point tracks hook block
      if (h.hoistCable) {
        const pos = h.hoistCable.geometry.attributes.position;
        // index 1 = bottom endpoint (hook end)
        pos.setY(1, pos.getY(1) + dy);
        pos.needsUpdate = true;
      }
    }

    // Move sling wires with the beam (both endpoints shift equally)
    const slArr = GAME._slingLines;
    if (slArr) {
      slArr.forEach(sl => { sl.position.y += dy; });
    }

    if (beam.position.y < target) {
      requestAnimationFrame(rise);
    } else {
      GAME.state.phase = 6;
      updateHUD();
      if (typeof spawnStructure === 'function') spawnStructure();
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
