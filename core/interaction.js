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
      const refusal = document.getElementById('operator-refusal-popup');
      if (refusal && !refusal.classList.contains('hidden')) { closeOperatorRefusal(); return; }
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
    case 'action':       performAction(target.actionId); break;
    case 'document':     openSpecPopup(target.docId);    break;
    case 'blueprint':    openBlueprintPanel();           break;
    case 'crane_cab':    boardCrane();                   break;
    case 'excav_cab':    if (typeof boardExcavator === 'function') boardExcavator(); break;
    case 'pump_console':     openPumpConsole();     break;
    case 'envelope_console': openEnvelopeConsole(); break;
    case 'npc':          openPopup(target);              break;
  }
}

// ── Phase gate (시나리오 인식) ───────────────────────────────
function getCurrentPhase() {
  if (GAME.scenarioId === 'excavation' && typeof getCurrentExcavPhase === 'function') {
    return getCurrentExcavPhase();
  }
  if (GAME.scenarioId === 'foundation' && typeof getCurrentFoundPhase === 'function') {
    return getCurrentFoundPhase();
  }
  if (GAME.scenarioId === 'envelope' && typeof getCurrentEnvPhase === 'function') {
    return getCurrentEnvPhase();
  }
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

    // ── Excavation actions ──────────────────────────────────
    case 'write_excav_plan':
      if (EXCAV_STATE.planWritten) {
        showActionNotif('작업계획서 이미 작성됨', 2000);
        break;
      }
      openExcavPlanPanel();
      break;

    case 'survey_underground':
      if (EXCAV_STATE.surveyDone) return;
      if (!EXCAV_STATE.planWritten) {
        showActionNotif('먼저 작업계획서를 작성하세요', 2000);
        break;
      }
      EXCAV_STATE.surveyDone = true;
      _dimActionMesh('survey_underground');
      GAME.state.phase = getCurrentPhase();
      updateHUD();
      showActionNotif('✅ 매설물 사전조사 완료', 2500);
      break;

    case 'install_shoring':
      if (EXCAV_STATE.shoringInstalled) return;
      if (!EXCAV_STATE.surveyDone) { showActionNotif('매설물 조사 먼저', 2000); break; }
      EXCAV_STATE.shoringInstalled = true;
      _dimActionMesh('install_shoring');
      GAME.state.phase = getCurrentPhase();
      updateHUD();
      showActionNotif('✅ 흙막이 가시설 점검 완료', 2500);
      break;

    case 'install_railing':
      if (EXCAV_STATE.railingInstalled) return;
      if (!EXCAV_STATE.shoringInstalled) { showActionNotif('흙막이 먼저', 2000); break; }
      EXCAV_STATE.railingInstalled = true;
      _dimActionMesh('install_railing');
      GAME.state.phase = getCurrentPhase();
      updateHUD();
      showActionNotif('✅ 안전난간 설치 완료', 2500);
      break;

    case 'assign_signal_excav':
      if (EXCAV_STATE.signalAssigned) return;
      if (!EXCAV_STATE.railingInstalled) { showActionNotif('안전난간 먼저', 2000); break; }
      EXCAV_STATE.signalAssigned = true;
      _dimActionMesh('assign_signal_excav');
      GAME.state.phase = getCurrentPhase();
      updateHUD();
      showActionNotif('✅ 신호수 배치 완료 — 굴착기 운전석으로', 3000);
      break;

    // ── Foundation actions ──────────────────────────────────
    case 'write_found_plan':
      if (FOUND_STATE.planWritten) { showActionNotif('작업계획서 이미 작성됨', 2000); break; }
      openFoundPlanPanel();
      break;

    case 'check_rebar_caps':
      if (FOUND_STATE.rebarCapsOk) return;
      if (!FOUND_STATE.planWritten) { showActionNotif('계획서 먼저', 2000); break; }
      FOUND_STATE.rebarCapsOk = true;
      _dimActionMesh('check_rebar_caps');
      GAME.state.phase = getCurrentPhase();
      updateHUD();
      showActionNotif('✅ 철근 보호캡 점검 완료', 2500);
      break;

    case 'inspect_formwork':
      if (FOUND_STATE.formworkOk) return;
      if (!FOUND_STATE.rebarCapsOk) { showActionNotif('철근 먼저', 2000); break; }
      FOUND_STATE.formworkOk = true;
      _dimActionMesh('inspect_formwork');
      GAME.state.phase = getCurrentPhase();
      updateHUD();
      showActionNotif('✅ 거푸집·동바리 점검 완료', 2500);
      break;

    case 'inspect_pump':
      if (FOUND_STATE.pumpOk) return;
      if (!FOUND_STATE.formworkOk) { showActionNotif('거푸집 먼저', 2000); break; }
      FOUND_STATE.pumpOk = true;
      _dimActionMesh('inspect_pump');
      GAME.state.phase = getCurrentPhase();
      updateHUD();
      showActionNotif('✅ 펌프카 점검 완료', 2500);
      break;

    case 'agree_pour_order':
      if (FOUND_STATE.pourOrderAgreed) return;
      if (!FOUND_STATE.pumpOk) { showActionNotif('펌프카 먼저', 2000); break; }
      FOUND_STATE.pourOrderAgreed = true;
      _dimActionMesh('agree_pour_order');
      GAME.state.phase = getCurrentPhase();
      updateHUD();
      showActionNotif('✅ 타설 순서 합의 완료 — 제어반으로', 3000);
      break;

    // ── Envelope (외장) actions ─────────────────────────────
    case 'write_env_plan':
      if (ENV_STATE.planWritten) { showActionNotif('작업계획서 이미 작성됨', 2000); break; }
      openEnvPlanPanel();
      break;

    case 'inspect_scaffold':
      if (ENV_STATE.scaffoldInspected) return;
      if (!ENV_STATE.planWritten) { showActionNotif('계획서 먼저', 2000); break; }
      ENV_STATE.scaffoldInspected = true;
      _dimActionMesh('inspect_scaffold');
      GAME.state.phase = getCurrentPhase();
      updateHUD();
      showActionNotif('✅ 비계 조립검사 완료', 2500);
      break;

    case 'install_lifeline':
      if (ENV_STATE.lifelineInstalled) return;
      if (!ENV_STATE.scaffoldInspected) { showActionNotif('비계 점검 먼저', 2000); break; }
      ENV_STATE.lifelineInstalled = true;
      _dimActionMesh('install_lifeline');
      GAME.state.phase = getCurrentPhase();
      updateHUD();
      showActionNotif('✅ 안전대 부착설비 설치 완료', 2500);
      break;

    case 'check_panel_secure':
      if (ENV_STATE.panelSecured) return;
      if (!ENV_STATE.lifelineInstalled) { showActionNotif('안전대 먼저', 2000); break; }
      ENV_STATE.panelSecured = true;
      _dimActionMesh('check_panel_secure');
      GAME.state.phase = getCurrentPhase();
      updateHUD();
      showActionNotif('✅ 외장재 결속 점검 완료', 2500);
      break;

    case 'assign_signal_env':
      if (ENV_STATE.signalAssigned) return;
      if (!ENV_STATE.panelSecured) { showActionNotif('결속 먼저', 2000); break; }
      ENV_STATE.signalAssigned = true;
      _dimActionMesh('assign_signal_env');
      GAME.state.phase = getCurrentPhase();
      updateHUD();
      showActionNotif('✅ 신호수 배치 완료 — 인양 트리거로', 3000);
      break;
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
    'oll-lbl-rated':       'ollLblRated',
    'oll-lbl-current':     'ollLblCurrent',
    'oll-test-btn':        'ollBtnTest',
    'oll-confirm-btn':     'ollBtnConfirm',
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
  if (panelId === 'equipment-panel' && INTERACTION._bubbleTimer) {
    clearInterval(INTERACTION._bubbleTimer);
    INTERACTION._bubbleTimer = null;
  }
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
      const icon = el.querySelector('.eq-icon');
      if (icon) icon.textContent = '⬜';
      el.querySelector('.eq-status').textContent = t('statusWaiting');
    }
  });
  document.getElementById('level-indicator').classList.add('hidden');
  document.getElementById('overload-tester').classList.add('hidden');
  document.getElementById('equipment-btn-confirm').disabled = true;

  let outriggerDone = false;
  let levelDone     = false;
  let overloadDone  = false;

  const markStep = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('done');
    el.querySelector('.eq-icon').textContent = '✅';
    el.querySelector('.eq-status').textContent = t('statusDone');
  };

  const updateEquipment = () => {
    document.getElementById('equipment-btn-confirm').disabled = !(outriggerDone && levelDone && overloadDone);
  };

  _animateOutriggers(() => {
    markStep('eq-outrigger');
    outriggerDone = true;
    document.getElementById('level-indicator').classList.remove('hidden');
    _startBubbleLevel(() => {
      markStep('eq-level');
      levelDone = true;
      document.getElementById('level-indicator').classList.add('hidden');
      document.getElementById('overload-tester').classList.remove('hidden');
      _startOverloadTest(() => {
        markStep('eq-overload');
        overloadDone = true;
        updateEquipment();
      });
      updateEquipment();
    });
    updateEquipment();
  });

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

// ── Bubble level mini-game ────────────────────────────────────
// 버블을 ▲▼◀▶ 버튼으로 중앙(허용범위) 안으로 이동시켜야 확인 가능.
function _startBubbleLevel(onComplete) {
  const bubble  = document.getElementById('bubble-dot');
  const confirm = document.getElementById('level-confirm-btn');
  if (!bubble || !confirm) { onComplete(); return; }

  // 이전 인스턴스 타이머가 살아있다면 정리
  if (INTERACTION._bubbleTimer) {
    clearInterval(INTERACTION._bubbleTimer);
    INTERACTION._bubbleTimer = null;
  }

  // 시작 위치: 가장자리 근처 무작위 (허용범위 밖)
  const startAngle = Math.random() * Math.PI * 2;
  const startR     = 36 + Math.random() * 8;
  let dx = Math.cos(startAngle) * startR;
  let dy = Math.sin(startAngle) * startR;
  const TOL = 12;           // 허용 반경 (px)
  const STEP = 4;           // 한 번 클릭당 이동량
  const DRIFT = 0.55;       // 매 프레임 미세 표류

  const render = () => {
    bubble.style.left = `calc(50% + ${dx}px)`;
    bubble.style.top  = `calc(50% + ${dy}px)`;
    const inTol = Math.hypot(dx, dy) <= TOL;
    bubble.classList.toggle('centered', inTol);
    confirm.disabled = !inTol;
  };

  // 약한 표류 — 너무 쉽게 가만히 있지 않게
  INTERACTION._bubbleTimer = setInterval(() => {
    dx += (Math.random() - 0.5) * DRIFT;
    dy += (Math.random() - 0.5) * DRIFT;
    // 컨테이너 안에 가두기
    const r = Math.hypot(dx, dy);
    const MAX = 48;
    if (r > MAX) { dx *= MAX / r; dy *= MAX / r; }
    render();
  }, 120);

  const nudge = (dir) => {
    if (dir === 'up')    dy -= STEP;
    if (dir === 'down')  dy += STEP;
    if (dir === 'left')  dx -= STEP;
    if (dir === 'right') dx += STEP;
    render();
  };

  const nudgeBtns = document.querySelectorAll('#level-indicator .bubble-nudge');
  const onNudgeClick = (e) => {
    const btn = e.currentTarget;
    nudge(btn.dataset.dir);
  };
  nudgeBtns.forEach(b => {
    b.replaceWith(b.cloneNode(true)); // drop old listeners
  });
  document.querySelectorAll('#level-indicator .bubble-nudge').forEach(b => {
    b.addEventListener('click', onNudgeClick);
  });

  confirm.onclick = () => {
    if (confirm.disabled) return;
    if (INTERACTION._bubbleTimer) {
      clearInterval(INTERACTION._bubbleTimer);
      INTERACTION._bubbleTimer = null;
    }
    onComplete();
  };

  render();
}

// ── Overload limiter test ─────────────────────────────────────
// 테스트 부하 인가 → 80% 경고 → 105% 알람 → 정상작동 확인.
function _startOverloadTest(onComplete) {
  const testBtn   = document.getElementById('oll-test-btn');
  const confBtn   = document.getElementById('oll-confirm-btn');
  const fillEl    = document.getElementById('oll-fill');
  const currEl    = document.getElementById('oll-current');
  const statusEl  = document.getElementById('oll-status');
  if (!testBtn || !confBtn || !fillEl || !currEl || !statusEl) { onComplete(); return; }

  const RATED = 5.0;    // ton
  const PEAK  = 1.06;   // 정격의 106%까지 시험
  let running = false;

  // reset
  testBtn.classList.remove('hidden');
  testBtn.disabled = false;
  confBtn.classList.add('hidden');
  confBtn.disabled = true;
  fillEl.style.width = '0%';
  currEl.textContent = '0.0 ton';
  statusEl.className = 'oll-status';
  statusEl.textContent = t('ollStatusIdle');

  testBtn.onclick = () => {
    if (running) return;
    running = true;
    testBtn.disabled = true;
    let pct = 0;
    const step = () => {
      pct += 0.014;  // ~ 4초에 105% 도달
      if (pct >= PEAK) pct = PEAK;
      const load = RATED * pct;
      fillEl.style.width = `${Math.min(pct, 1) * 100}%`;
      currEl.textContent = load.toFixed(2) + ' ton';

      if (pct >= 1.0) {
        statusEl.className = 'oll-status alarm';
        statusEl.textContent = t('ollStatusAlarm');
      } else if (pct >= 0.8) {
        statusEl.className = 'oll-status warn';
        statusEl.textContent = t('ollStatusWarn');
      }

      if (pct < PEAK) {
        requestAnimationFrame(step);
      } else {
        // 알람 작동 확인 → 확인 버튼 노출
        testBtn.classList.add('hidden');
        confBtn.classList.remove('hidden');
        confBtn.disabled = false;
      }
    };
    requestAnimationFrame(step);
  };

  confBtn.onclick = () => {
    if (confBtn.disabled) return;
    confBtn.disabled = true;
    onComplete();
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
// 운전원 거부권: 안전 점검 미완료 시 탑승 거부 + 운전원 팝업
const _OPERATOR_CHECKLIST = [
  { key: 'planWritten',       labelKey: 'opItemPlanWritten' },
  { key: 'safetyChecked',     labelKey: 'opItemSafetyChecked' },
  { key: 'outriggerExtended', labelKey: 'opItemOutriggerExtended' },
  { key: 'slingInspected',    labelKey: 'opItemSlingInspected' },
  { key: 'pinSecured',        labelKey: 'opItemPinSecured' },
  { key: 'angleMeasured',     labelKey: 'opItemAngleMeasured' },
  { key: 'specChecked',       labelKey: 'opItemSpecChecked' },
  { key: 'signalAssigned',    labelKey: 'opItemSignalAssigned' },
  { key: 'workerEvacuated',   labelKey: 'opItemWorkerEvacuated' },
];

function _getMissingSafetyItems() {
  return _OPERATOR_CHECKLIST.filter(item => !LIFT_STATE[item.key]);
}

function showOperatorRefusal(missing) {
  if (document.pointerLockElement) document.exitPointerLock();
  INTERACTION.popupOpen = true;

  document.getElementById('op-refusal-name').textContent  = t('opRefusalName');
  document.getElementById('op-refusal-role').textContent  = t('opRefusalRole');
  document.getElementById('op-refusal-quote').textContent = t('opRefusalQuote');
  document.getElementById('op-refusal-intro').textContent = t('opRefusalIntro');
  document.getElementById('op-refusal-close').textContent = t('opRefusalClose');

  const list = document.getElementById('op-refusal-list');
  list.innerHTML = '';
  missing.forEach(item => {
    const li = document.createElement('li');
    li.textContent = t(item.labelKey);
    list.appendChild(li);
  });

  document.getElementById('operator-refusal-popup').classList.remove('hidden');
}

function closeOperatorRefusal() {
  INTERACTION.popupOpen = false;
  document.getElementById('operator-refusal-popup').classList.add('hidden');
  if (GAME.state.gameStarted && !GAME.state.gameOver && window.matchMedia('(pointer: fine)').matches) {
    GAME.renderer.domElement.requestPointerLock();
  }
}

function boardCrane() {
  if (GAME.state.craneBoarded || GAME.state.liftStarted) return;

  const missing = _getMissingSafetyItems();
  if (missing.length > 0) {
    showOperatorRefusal(missing);
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
// 5층 목표: 매 사이클마다 한 층 인양. 사이클당 빔 1개.
function animateLift() {
  const beam = GAME.liftBeam;
  if (!beam) { showCompletePanel(); return; }

  // 현재 사이클(완료된 층 수)에 따라 목표 높이 조정
  const floor = GAME.state.completedFloors || 0;
  const baseTarget = 5.5;       // 1층 거치 높이
  const floorRise  = 3.3;       // 층간 높이
  const target = baseTarget + floor * floorRise;
  const speed  = 2.2;

  (function rise() {
    if (GAME.state.gameOver) return;
    const dy = speed * 0.016;

    beam.position.y += dy;

    const h = GAME._craneHook;
    if (h) {
      if (h.block) h.block.position.y += dy;
      if (h.curve) h.curve.position.y += dy;
      if (h.hoistCable) {
        const pos = h.hoistCable.geometry.attributes.position;
        pos.setY(1, pos.getY(1) + dy);
        pos.needsUpdate = true;
      }
    }

    const slArr = GAME._slingLines;
    if (slArr) slArr.forEach(sl => { sl.position.y += dy; });

    if (beam.position.y < target) {
      requestAnimationFrame(rise);
    } else {
      _onLiftCycleComplete();
    }
  })();
}

function _onLiftCycleComplete() {
  // 빔을 현재 층 위치에 영구 고정
  if (GAME.liftBeam) {
    const floor = GAME.state.completedFloors || 0;
    GAME.liftBeam.position.y = 5.5 + floor * 3.3;
    GAME._placedBeams = GAME._placedBeams || [];
    GAME._placedBeams.push(GAME.liftBeam);
    GAME.liftBeam = null;
  }
  if (GAME._liftTarget) {
    GAME.scene.remove(GAME._liftTarget);
    GAME._liftTarget = null;
  }

  GAME.state.completedFloors = (GAME.state.completedFloors || 0) + 1;

  // 건물 단계 한 칸 전진 (1F frame부터)
  if (typeof advanceBuildingStage === 'function') advanceBuildingStage();

  if (GAME.state.completedFloors >= (GAME.state.targetFloors || 5)) {
    // 5층 완료 → 외벽·지붕 자동 + 엔딩
    setTimeout(() => {
      if (typeof advanceBuildingStage === 'function') advanceBuildingStage(); // walls
      setTimeout(() => {
        if (typeof advanceBuildingStage === 'function') advanceBuildingStage(); // roof
        setTimeout(showCompletePanel, 1200);
      }, 1400);
    }, 1200);
  } else {
    // 다음 사이클 준비
    setTimeout(_startNextLiftCycle, 1500);
  }
}

function _startNextLiftCycle() {
  // 1) 럭잉 체크 항목 리셋
  LIFT_STATE.slingInspected = false;
  LIFT_STATE.pinSecured     = false;
  LIFT_STATE.angleMeasured  = false;
  GAME.state.liftStarted    = false;

  // 2) 운전석에서 자동 하차
  if (GAME.state.craneBoarded && typeof exitCraneCab === 'function') exitCraneCab();

  // 3) 새 빔 + 슬링 재생성
  _respawnBeam();

  // 4) 훅·케이블 원위치
  const h = GAME._craneHook;
  if (h) {
    if (h.block) h.block.position.set(-2, 0.88, -8);
    if (h.curve) h.curve.position.set(-2, 0.44, -8);
    if (h.hoistCable) {
      const pos = h.hoistCable.geometry.attributes.position;
      pos.setY(0, 22.58);
      pos.setY(1, 0.88);
      pos.needsUpdate = true;
    }
  }
  if (GAME._slingLines) GAME._slingLines.forEach(sl => { sl.position.y = 0; });

  // 5) 럭잉 인터랙터블 복구 (밝기 + 인터랙트 가능)
  const items = GAME._riggingItems;
  if (items) {
    Object.values(items).forEach(it => {
      if (it.mesh && it.mesh.material) {
        it.mesh.material.opacity = 1;
        it.mesh.material.transparent = false;
      }
      // 중복 등록 방지
      const exists = GAME.interactables.some(x => x.actionId === it.actionId);
      if (!exists) {
        GAME.interactables.push({
          mesh: it.mesh, type: 'action', actionId: it.actionId, label: it.label, phase: it.phase,
        });
      }
    });
  }

  // 6) Phase 4 로 되돌리고 안내
  GAME.state.phase = 4;
  if (typeof updateHUD === 'function') updateHUD();
  if (typeof showActionNotif === 'function') {
    const done = GAME.state.completedFloors;
    const tot  = GAME.state.targetFloors || 5;
    showActionNotif(`✅ ${done}/${tot}층 거치 — ${t('nextFloorReady')}`, 4000);
  }
}

function _respawnBeam() {
  const beamMat  = new THREE.MeshLambertMaterial({ color: 0xA8A49C });
  const plateMat = new THREE.MeshLambertMaterial({ color: 0x585450 });

  const beam = new THREE.Mesh(new THREE.BoxGeometry(7, 0.55, 0.55), beamMat);
  beam.position.set(-2, 0.28, -8);
  beam.castShadow = true;
  beam.receiveShadow = true;
  GAME.scene.add(beam);
  GAME.liftBeam = beam;

  [-3.55, 3.55].forEach(dx => {
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.65, 0.65), plateMat);
    plate.position.set(-2 + dx, 0.28, -8);
    GAME.scene.add(plate);
  });
}

// ── 토공사 — 작업계획서 패널 ──────────────────────────────
function openExcavPlanPanel() {
  document.exitPointerLock();
  INTERACTION.popupOpen = true;
  const panel = document.getElementById('excav-plan-panel');
  if (!panel) return;
  panel.classList.remove('hidden');

  document.getElementById('excav-plan-sign').onclick = () => {
    const depth     = parseFloat(document.getElementById('excav-depth').value);
    const slope     = parseFloat(document.getElementById('excav-slope').value);
    const shoring   = document.getElementById('excav-shoring').value;
    const underground = document.getElementById('excav-underground').checked;

    EXCAV_STATE.planDepth       = depth;
    EXCAV_STATE.planSlope       = slope;
    EXCAV_STATE.planShoring     = shoring;
    EXCAV_STATE.planUnderground = underground;
    EXCAV_STATE.planWritten     = true;

    // 운전석 게이지에 반영
    const cd = document.getElementById('excav-cab-depth');
    if (cd) cd.textContent = depth.toFixed(1) + ' m';
    const cs = document.getElementById('excav-cab-shoring');
    if (cs) cs.textContent = ({ none:'미설치', h_pile:'H-pile', sheet_pile:'시트파일', earth_anchor:'어스앵커' })[shoring] || shoring;

    GAME.state.phase = getCurrentPhase();
    updateHUD();
    showActionNotif('✅ 작업계획서 서명 완료 — 매설물 조사로 이동', 3500);
    _closePanel('excav-plan-panel');
  };
  document.getElementById('excav-plan-cancel').onclick = () => _closePanel('excav-plan-panel');
}

// ── 토공사 — 굴착기 운전석 ────────────────────────────────
function boardExcavator() {
  if (GAME.state.craneBoarded || GAME.state.liftStarted) return;
  if (typeof EXCAV_STATE === 'undefined') return;

  if (!EXCAV_STATE.signalAssigned) {
    showActionNotif('신호수 배치 먼저', 2500);
    return;
  }
  GAME.state.craneBoarded = true;
  INTERACTION.popupOpen   = true;
  if (document.pointerLockElement) document.exitPointerLock();

  GAME._prevCamMode  = PLAYER.camMode;
  GAME._prevWorldPos = PLAYER.worldPos.clone();

  PLAYER.camMode = 'fixed';
  GAME.camera.position.set(-13, 3.0, -8);
  GAME.camera.lookAt(0, 1, -8);

  document.getElementById('excav-cab-overlay').classList.remove('hidden');
  hideInteractPrompt();
}

// ── 기초공사 — 작업계획서 ──────────────────────────────────
function openFoundPlanPanel() {
  document.exitPointerLock();
  INTERACTION.popupOpen = true;
  const panel = document.getElementById('found-plan-panel');
  if (!panel) return;
  panel.classList.remove('hidden');

  document.getElementById('found-plan-sign').onclick = () => {
    FOUND_STATE.planMatArea      = parseFloat(document.getElementById('found-area').value);
    FOUND_STATE.planRebarSpacing = parseFloat(document.getElementById('found-rebar').value);
    FOUND_STATE.planConcStrength = parseFloat(document.getElementById('found-conc').value);
    FOUND_STATE.planShoringSpace = parseFloat(document.getElementById('found-shoring').value);
    FOUND_STATE.planWritten = true;

    GAME.state.phase = getCurrentPhase();
    updateHUD();
    showActionNotif('✅ 기초 작업계획서 서명 완료 — 철근 점검으로', 3500);
    _closePanel('found-plan-panel');
  };
  document.getElementById('found-plan-cancel').onclick = () => _closePanel('found-plan-panel');
}

// ── 외장공사 — 작업계획서 ───────────────────────────────
function openEnvPlanPanel() {
  document.exitPointerLock();
  INTERACTION.popupOpen = true;
  const panel = document.getElementById('env-plan-panel');
  if (!panel) return;
  panel.classList.remove('hidden');

  document.getElementById('env-plan-sign').onclick = () => {
    ENV_STATE.planScaffoldType    = document.getElementById('env-scaffold-type').value;
    ENV_STATE.planScaffoldHeight  = parseFloat(document.getElementById('env-scaffold-height').value);
    ENV_STATE.planGuardrailLevels = parseInt(document.getElementById('env-guardrails').value, 10);
    ENV_STATE.planPanelType       = document.getElementById('env-panel-type').value;
    ENV_STATE.planWritten = true;

    GAME.state.phase = getCurrentPhase();
    updateHUD();
    showActionNotif('✅ 외장 작업계획서 서명 완료 — 비계 점검으로', 3500);
    _closePanel('env-plan-panel');
  };
  document.getElementById('env-plan-cancel').onclick = () => _closePanel('env-plan-panel');
}

// ── 외장공사 — 인양 트리거 ─────────────────────────────────
function openEnvelopeConsole() {
  if (GAME.state.liftStarted || GAME.state.gameOver) return;
  if (typeof ENV_STATE === 'undefined') return;
  if (!ENV_STATE.signalAssigned) {
    showActionNotif('신호수 배치 먼저', 2500);
    return;
  }
  evaluateEnvelope();
}

// ── 기초공사 — 타설 제어반 ────────────────────────────────
function openPumpConsole() {
  if (GAME.state.liftStarted || GAME.state.gameOver) return;
  if (typeof FOUND_STATE === 'undefined') return;
  if (!FOUND_STATE.pourOrderAgreed) {
    showActionNotif('타설 순서 합의 먼저', 2500);
    return;
  }
  evaluateFoundation();
}

function exitExcavCab() {
  if (!GAME.state.craneBoarded) return;
  GAME.state.craneBoarded = false;
  INTERACTION.popupOpen   = false;

  PLAYER.camMode = GAME._prevCamMode || 'fps';
  if (GAME._prevWorldPos) PLAYER.worldPos.copy(GAME._prevWorldPos);
  GAME.camera.position.set(PLAYER.worldPos.x, 1.7, PLAYER.worldPos.z);

  document.getElementById('excav-cab-overlay').classList.add('hidden');

  if (!GAME.state.gameOver && window.matchMedia('(pointer: fine)').matches) {
    GAME.renderer.domElement.requestPointerLock();
  }
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
