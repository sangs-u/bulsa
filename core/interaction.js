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
      if (INTERACTION.popupOpen) {
        // Close whichever phase panel is open
        ['plan-panel','safety-panel','equipment-panel'].forEach(id => {
          const el = document.getElementById(id);
          if (el && !el.classList.contains('hidden')) _closePanel(id);
        });
        closePopup();
      }
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

  // Filter interactables by phase: items with a `phase` field are only
  // active when the current game phase matches. Items without a phase
  // field are always eligible.
  const currentPhase = GAME.state.phase || 1;
  const eligible = GAME.interactables.filter(
    i => i.phase === undefined || i.phase === currentPhase
  );

  if (hits.length > 0 && hits[0].distance < 4.0) {
    closest = eligible.find(i => i.mesh === hits[0].object);
  }

  // Proximity fallback for large/invisible triggers
  if (!closest) {
    const cam = GAME.camera.position;
    let minD  = 2.8;
    eligible.forEach(item => {
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
    case 'blueprint':  openBlueprintPanel();            break;
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
        showActionNotif(t('notifPlanAlready'));
        break;
      }
      openPlanPanel();
      break;

    case 'safety_review':
      if (!LIFT_STATE.planWritten) {
        showActionNotif(t('notifWritePlanFirst'));
        break;
      }
      if (LIFT_STATE.safetyChecked) {
        showActionNotif(t('notifSafetyAlready'));
        break;
      }
      openSafetyPanel();
      break;

    case 'extend_outrigger':
      if (!LIFT_STATE.safetyChecked) {
        showActionNotif(t('notifSafetyFirst'));
        break;
      }
      if (LIFT_STATE.outriggerExtended) {
        showActionNotif(t('notifOutriggerAlready'));
        break;
      }
      openEquipmentPanel();
      break;

    case 'inspect_sling':
      LIFT_STATE.slingInspected = true;
      _dimActionMesh('inspect_sling');
      _checkPhase4Done('itemSling');
      break;

    case 'secure_pin':
      LIFT_STATE.pinSecured = true;
      _dimActionMesh('secure_pin');
      _checkPhase4Done('itemPin');
      break;

    case 'measure_angle':
      LIFT_STATE.angleMeasured = true;
      _dimActionMesh('measure_angle');
      _checkPhase4Done('itemAngle');
      break;

    case 'evacuate_worker':
      if (LIFT_STATE.workerEvacuated) return;
      LIFT_STATE.workerEvacuated = true;
      _evacuateWorker();
      _checkPhase5Done();
      break;

    case 'assign_signal': {
      if (LIFT_STATE.signalAssigned) return;
      LIFT_STATE.signalAssigned = true;
      _moveSignalNPC();
      _dimActionMesh('assign_signal');
      _checkPhase5Done();
      break;
    }
  }
}

// Phase 5 완료 확인: 신호수 배치 + 대피 완료 시 Phase 6 진행
function _checkPhase5Done() {
  GAME.state.phase = getCurrentPhase();
  updateHUD();
  if (LIFT_STATE.signalAssigned && LIFT_STATE.workerEvacuated) {
    showActionNotif(t('notifSiteDone'), 3500);
    _showPhasePopup(6, PHASE_NAMES[6][currentLang] || PHASE_NAMES[6].ko);
  } else {
    const remain = [
      !LIFT_STATE.signalAssigned  && t('itemSignal'),
      !LIFT_STATE.workerEvacuated && t('itemEvacuate'),
    ].filter(Boolean);
    if (remain.length > 0) showActionNotif(`✅ ${t('notifRemain')}: ${remain.join(' · ')}`);
  }
}

// Phase 4 완료 확인: 3개 모두 완료 시 Phase 5 진행
function _checkPhase4Done(itemKey) {
  GAME.state.phase = getCurrentPhase();
  updateHUD();
  const done = LIFT_STATE.slingInspected && LIFT_STATE.pinSecured && LIFT_STATE.angleMeasured;
  if (done && GAME.state.phase === 5) {
    showActionNotif(t('notifRiggingDone'), 3500);
    _showPhasePopup(5, PHASE_NAMES[5][currentLang] || PHASE_NAMES[5].ko);
  } else {
    const remain = [
      !LIFT_STATE.slingInspected && t('itemSling'),
      !LIFT_STATE.pinSecured     && t('itemPin'),
      !LIFT_STATE.angleMeasured  && t('itemAngle'),
    ].filter(Boolean);
    const label = itemKey ? `✅ ${t(itemKey)}` : '✅';
    const msg   = remain.length > 0 ? `${label}  ${t('notifRemain')}: ${remain.join(' · ')}` : label;
    showActionNotif(msg, 3000);
  }
}

// 페이즈 전환 팝업 (화면 중앙 3초 표시)
function _showPhasePopup(phase, name) {
  let el = document.getElementById('phase-popup');
  if (!el) {
    el = document.createElement('div');
    el.id = 'phase-popup';
    Object.assign(el.style, {
      position: 'fixed', top: '38%', left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(20,30,40,0.92)', color: '#fff', padding: '18px 38px',
      borderRadius: '10px', fontSize: '1.15rem', fontWeight: '700',
      letterSpacing: '0.04em', zIndex: '9000', pointerEvents: 'none',
      border: '1px solid rgba(255,255,255,0.18)', transition: 'opacity 0.5s',
    });
    document.body.appendChild(el);
  }
  el.textContent = `PHASE ${phase}/6 — ${name}`;
  el.style.opacity = '1';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.opacity = '0'; }, 2800);
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

// 신호수 NPC 위치 이동 (Yuka home도 업데이트해서 원위치 복귀 방지)
function _moveSignalNPC() {
  if (!GAME.npcs) return;
  const gimc = GAME.npcs.find(n => n.id === 'gimc');
  if (!gimc || !gimc.group) return;
  const dest = new THREE.Vector3(3, 0, -6);
  gimc._targetPos = dest;
  gimc.setState(NPC_STATES.WORKING);
  // Update Yuka fixed-home so tickAllNPCs doesn't snap gimc back after arrival
  if (typeof _yukaVehicles !== 'undefined') {
    const entry = _yukaVehicles.get('gimc');
    if (entry && typeof YUKA !== 'undefined') {
      entry.home = new YUKA.Vector3(dest.x, 0, dest.z);
    }
  }
}

// ── Panel localization — call when opening any panel ─────────
function _localizePanels() {
  const ids = {
    'plan-title':          'planTitle',
    'plan-sec-cargo':      'planSecCargo',
    'plan-lbl-name':       'planLblName',
    'plan-lbl-weight':     'planLblWeight',
    'plan-lbl-shape':      'planLblShape',
    'plan-sec-crew':       'planSecCrew',
    'plan-crew-foreman':   'planCrewForeman',
    'plan-crew-crane':     'planCrewCrane',
    'plan-crew-rigger':    'planCrewRigger',
    'plan-crew-signal':    'planCrewSignal',
    'plan-crew-safety':    'planCrewSafety',
    'plan-sec-risk':       'planSecRisk',
    'plan-risk-path':      'planRiskPath',
    'plan-risk-ground':    'planRiskGround',
    'plan-risk-wind':      'planRiskWind',
    'plan-risk-emergency': 'planRiskEmergency',
    'plan-btn-sign':       'planBtnSign',
    'safety-title':        'safetyTitle',
    'safety-lbl-weight':   'safetyLblWeight',
    'safety-lbl-angle':    'safetyLblAngle',
    'safety-lbl-k':        'safetyLblK',
    'safety-lbl-lines':    'safetyLblLines',
    'safety-lbl-lines-val':'safetyLblLinesVal',
    'safety-lbl-swl':      'safetyLblSwl',
    'safety-lbl-ts':       'safetyLblTs',
    'safety-lbl-sr':       'safetyLblSr',
    'safety-btn-calc':     'safetyBtnCalc',
    'safety-btn-confirm':  'safetyBtnConfirm',
    'equip-title':         'equipTitle',
    'equip-guide':         'equipGuide',
    'eq-outrigger-lbl':    'equipOutrigger',
    'eq-level-lbl':        'equipLevel',
    'eq-overload-lbl':     'equipOverload',
    'equip-bubble-guide':  'equipBubbleGuide',
    'level-confirm-btn':   'equipLevelConfirm',
    'equipment-btn-confirm':'equipBtnConfirm',
  };
  Object.entries(ids).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = t(key);
  });
}

// ── Phase 1: Plan Panel ───────────────────────────────────────
function _closePanel(panelId) {
  const p = document.getElementById(panelId);
  if (p) p.classList.add('hidden');
  INTERACTION.popupOpen = false;
  if (GAME.state.gameStarted && !GAME.state.gameOver && window.matchMedia('(pointer: fine)').matches) {
    document.getElementById('gameCanvas').requestPointerLock();
  }
}

function openPlanPanel() {
  document.exitPointerLock();
  INTERACTION.popupOpen = true;
  _localizePanels();
  const panel = document.getElementById('plan-panel');
  panel.classList.remove('hidden');

  // Clone to drop old listeners, then re-query fresh nodes
  panel.querySelectorAll('.plan-check').forEach(c => {
    c.parentNode.replaceChild(c.cloneNode(true), c);
  });
  const freshChecks = panel.querySelectorAll('.plan-check');

  const updateProgress = () => {
    const done = [...freshChecks].filter(c => c.checked).length;
    document.getElementById('plan-progress-text').textContent = `${done} / ${freshChecks.length} ${t('itemsComplete')}`;
    document.getElementById('plan-btn-sign').disabled = done < freshChecks.length;
  };
  freshChecks.forEach(c => c.addEventListener('change', updateProgress));
  updateProgress();

  document.getElementById('plan-btn-sign').onclick = () => {
    LIFT_STATE.planWritten = true;
    GAME.state.phase = getCurrentPhase();
    updateHUD();
    showActionNotif(t('notifPlanDone'), 3500);
    _showPhasePopup(2, PHASE_NAMES[2][currentLang] || PHASE_NAMES[2].ko);
    _closePanel('plan-panel');
  };
  document.getElementById('plan-btn-cancel').onclick = () => _closePanel('plan-panel');
}

// ── Phase 2: Safety Panel ─────────────────────────────────────
function openSafetyPanel() {
  document.exitPointerLock();
  INTERACTION.popupOpen = true;
  _localizePanels();
  const panel = document.getElementById('safety-panel');
  panel.classList.remove('hidden');

  // Reset result + confirm button visibility
  document.getElementById('safety-result').classList.add('hidden');
  document.getElementById('safety-btn-confirm').classList.add('hidden');

  document.getElementById('safety-btn-calc').onclick = () => {
    const W        = 3.0;  // ton
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
      const safeMsg = { ko: '✅ 안전 — 사용률 ', en: '✅ Safe — Usage ratio ', vi: '✅ An toàn — Tỷ lệ tải ', ar: '✅ آمن — نسبة التحميل ' };
      const safeRef = { ko: '% (기준: 100% 이하)', en: '% (limit: ≤100%)', vi: '% (giới hạn: ≤100%)', ar: '% (الحد: ≤100%)' };
      resultEl.textContent = (safeMsg[currentLang] || safeMsg.ko) + (sr * 100).toFixed(1) + (safeRef[currentLang] || safeRef.ko);
      document.getElementById('safety-btn-confirm').classList.remove('hidden');
    } else {
      resultEl.classList.add('ng');
      const ngMsg = { ko: '❌ 위험 — 슬링 규격 상향 필요', en: '❌ Unsafe — Upgrade sling rating', vi: '❌ Không an toàn — Nâng cấp dây đai', ar: '❌ غير آمن — يجب ترقية معدل الحبل' };
      resultEl.textContent = ngMsg[currentLang] || ngMsg.ko;
    }
  };

  document.getElementById('safety-btn-confirm').onclick = () => {
    LIFT_STATE.safetyChecked = true;
    GAME.state.phase = getCurrentPhase();
    updateHUD();
    showActionNotif(t('notifSafetyDone'), 3500);
    _showPhasePopup(3, PHASE_NAMES[3][currentLang] || PHASE_NAMES[3].ko);
    _closePanel('safety-panel');
  };
  document.getElementById('safety-btn-cancel').onclick = () => _closePanel('safety-panel');
}

// ── Phase 3: Equipment Panel ──────────────────────────────────
function openEquipmentPanel() {
  document.exitPointerLock();
  INTERACTION.popupOpen = true;
  _localizePanels();
  const panel = document.getElementById('equipment-panel');
  panel.classList.remove('hidden');

  // Reset state indicators
  ['eq-outrigger', 'eq-level', 'eq-overload'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove('done');
      el.querySelector('.eq-status').textContent = t('statusWaiting');
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
    if (eqOut) {
      eqOut.classList.add('done');
      eqOut.querySelector('.eq-icon').textContent = '✅';
      eqOut.querySelector('.eq-status').textContent = t('statusDone');
    }
    outriggerDone = true;
    document.getElementById('level-indicator').classList.remove('hidden');
    updateEquipment();
  });

  document.getElementById('level-confirm-btn').onclick = () => {
    const eqLvl = document.getElementById('eq-level');
    if (eqLvl) {
      eqLvl.classList.add('done');
      eqLvl.querySelector('.eq-icon').textContent = '✅';
      eqLvl.querySelector('.eq-status').textContent = t('statusDone');
    }
    document.getElementById('level-indicator').classList.add('hidden');
    levelDone = true;

    setTimeout(() => {
      const eqOl = document.getElementById('eq-overload');
      if (eqOl) {
        eqOl.classList.add('done');
        eqOl.querySelector('.eq-icon').textContent = '✅';
        eqOl.querySelector('.eq-status').textContent = t('statusDone');
      }
      overloadDone = true;
      updateEquipment();
    }, 1500);

    updateEquipment();
  };

  document.getElementById('equipment-btn-confirm').onclick = () => {
    LIFT_STATE.outriggerExtended = true;
    GAME.state.phase = getCurrentPhase();
    updateHUD();
    showActionNotif(t('notifEquipDone'), 3500);
    _showPhasePopup(4, PHASE_NAMES[4][currentLang] || PHASE_NAMES[4].ko);
    _closePanel('equipment-panel');
  };
  document.getElementById('equipment-btn-cancel').onclick = () => _closePanel('equipment-panel');
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
  if (!LIFT_STATE.outriggerExtended) {
    showActionNotif(t('notifEquipFirst'));
    return;
  }
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
  if (GAME.state.craneBoarded || GAME.state.liftStarted) return;
  if (!LIFT_STATE.signalAssigned || !LIFT_STATE.workerEvacuated) {
    showActionNotif(t('notifSignalEvacFirst'));
    return;
  }
  if (!LIFT_STATE.specChecked) {
    showActionNotif(t('notifSpecFirst'), 3000);
    return;
  }
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
