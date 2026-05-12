// Main engine — scene init + game loop

const GAME = {
  scene:    null,
  camera:   null,
  renderer: null,
  clock:    null,
  hazards:  [],
  interactables: [],
  liftBeam: null,
  _cranePanelMesh: null,
  _pulseHazards:   null,
  _dangerWorker:   null,
  _prevCamMode:    null,
  _prevWorldPos:   null,
  npcs: [],
  state: {
    phase:          1,
    safetyIndex:    100,
    hazardsResolved: new Set(),
    violations:      new Set(),
    accidentTriggered: false,
    gameOver:        false,
    gameStarted:     false,
    liftStarted:     false,
    craneBoarded:    false,
    playerName:      '',
    targetFloors:    5,
    completedFloors: 0,
    // 작업계획서 (시나리오별 확정 — 사전 수립, 이후 실제 작업의 근거)
    workPlans:       {},
    // 누적 과태료 (감독관 적발 시 부과) — localStorage 에서 복원
    finesKrw:        _loadCumulativeFines(),
    fineHistory:     _loadFineHistory(),
  },
};

function _loadCumulativeFines() {
  try { return parseInt(localStorage.getItem('bulsa_finesKrw') || '0', 10); }
  catch (e) { return 0; }
}
function _loadFineHistory() {
  try { return JSON.parse(localStorage.getItem('bulsa_fineHistory') || '[]'); }
  catch (e) { return []; }
}
function persistFines() {
  try {
    localStorage.setItem('bulsa_finesKrw', String(GAME.state.finesKrw || 0));
    localStorage.setItem('bulsa_fineHistory', JSON.stringify(GAME.state.fineHistory || []));
  } catch (e) {}
}
window.persistFines = persistFines;

(function initEngine() {
  GAME.scene = new THREE.Scene();

  GAME.camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 250);
  GAME.camera.position.set(0, 1.7, 12);
  GAME.camera.lookAt(0, 1.7, -8);

  const canvas = document.getElementById('gameCanvas');
  GAME.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  GAME.renderer.setSize(innerWidth, innerHeight);
  GAME.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  GAME.renderer.shadowMap.enabled = true;
  GAME.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  GAME.clock = new THREE.Clock();

  window.addEventListener('resize', () => {
    GAME.camera.aspect = innerWidth / innerHeight;
    GAME.camera.updateProjectionMatrix();
    GAME.renderer.setSize(innerWidth, innerHeight);
  });

  // ── Scenario dispatch ──────────────────────────────────────
  const _params = new URLSearchParams(location.search);
  const _scenarioId = _params.get('s') || 'lifting';
  const _scenarios = {
    lifting:    { build: 'buildLiftingScene',    register: 'registerLiftingHazards' },
    excavation: { build: 'buildExcavationScene', register: 'registerExcavationHazards' },
    foundation: { build: 'buildFoundationScene', register: 'registerFoundationHazards' },
    envelope:   { build: 'buildEnvelopeScene',   register: 'registerEnvelopeHazards' },
    mep_finish: { build: 'buildMepFinishScene',  register: 'registerMepFinishHazards' },
  };
  // v2.0 unified — 한 부지 통합 모드 (?s=unified). baseline scene 은 lifting 사용,
  // 모든 시나리오의 task seed 를 합쳐서 활성화. 향후 점진적 hazard 통합 토대.
  GAME.unifiedMode = (_scenarioId === 'unified');
  const _activeId  = GAME.unifiedMode ? 'lifting' : (_scenarioId in _scenarios ? _scenarioId : 'lifting');
  const _active    = _scenarios[_activeId];
  GAME.scenarioId  = GAME.unifiedMode ? 'unified' : _activeId;

  // 공정 시퀀스 — showCompletePanel 에서 "다음 공정" 버튼 노출
  GAME.scenarioOrder = ['excavation', 'foundation', 'lifting', 'envelope', 'mep_finish'];
  GAME.nextScenarioId = (() => {
    const idx = GAME.scenarioOrder.indexOf(GAME.scenarioId);
    return idx >= 0 && idx < GAME.scenarioOrder.length - 1
      ? GAME.scenarioOrder[idx + 1]
      : null;
  })();

  const _buildFn    = window[_active.build];
  const _registerFn = window[_active.register];
  if (typeof _buildFn === 'function') {
    _buildFn();
  } else {
    console.error(`${_active.build} 없음 — scene.js 로딩 순서 확인`);
  }
  if (typeof _registerFn === 'function') {
    _registerFn();
  } else {
    console.error(`${_active.register} 없음 — hazards.js 로딩 순서 확인`);
  }

  // v2.0 통합 모드 — 다른 4 시나리오의 scene build + hazard register 모두 호출
  // 각 scene.js 의 build 는 unifiedMode 분기로 sky/ground/lighting 중복 회피 (baseline 만 lifting)
  // mesh 좌표계는 향후 각 scene.js 에서 unifiedOffset 으로 영역 분산.
  if (GAME.unifiedMode) {
    GAME.unifiedZones = {
      excavation: { ox: -22, oz: -10 },   // 좌상
      foundation: { ox: -18, oz:  10 },   // 좌하
      envelope:   { ox:  22, oz: -10 },   // 우상
      mep_finish: { ox:  22, oz:  10 },   // 우하
    };
    ['buildExcavationScene','buildFoundationScene','buildEnvelopeScene','buildMepFinishScene'].forEach(fnName => {
      const fn = window[fnName];
      if (typeof fn === 'function') {
        try { fn(); } catch (e) { console.warn('[unified build]', fnName, e.message); }
      }
    });
    ['registerExcavationHazards', 'registerFoundationHazards', 'registerEnvelopeHazards', 'registerMepFinishHazards'].forEach(fnName => {
      const fn = window[fnName];
      if (typeof fn === 'function') {
        try { fn(); } catch (e) { console.warn('[unified hazard]', fnName, e.message); }
      }
    });
  }

  // v2.0 — 시나리오별 초기 작업 큐 시드 (lifting 은 RC_LOOP 가 동적 enqueue)
  if (typeof enqueueScenarioTasks === 'function') {
    if (GAME.unifiedMode) {
      // 통합 모드 — 모든 시나리오의 task seed 를 합쳐 enqueue (큐가 풍부해짐)
      ['excavation', 'foundation', 'envelope', 'mep_finish'].forEach(s => enqueueScenarioTasks(s));
    } else {
      enqueueScenarioTasks(GAME.scenarioId);
    }
  }

  initPlayer();
  initInteraction();
  initHUD();
  initAccident();
  if (typeof initUnsafe === 'function') initUnsafe();
  if (typeof initAvatar === 'function') initAvatar();
  if (typeof initSkill     === 'function') initSkill();
  if (typeof initInventory === 'function') initInventory();
  if (typeof initBlueprintViewer === 'function') initBlueprintViewer();
  if (typeof initPostFX === 'function') initPostFX();
  if (typeof initPhysics === 'function') initPhysics();
  if (typeof spawnDemoHazards === 'function') spawnDemoHazards(GAME.scene, GAME.scenarioId);
  if (typeof initInspector === 'function') initInspector();
  if (typeof initPauseMenu === 'function') initPauseMenu();
  if (typeof initAchievements === 'function') initAchievements();
  if (typeof initPerf === 'function') initPerf();
  if (typeof initPickup === 'function') initPickup();
  if (typeof spawnDemoPickups === 'function') spawnDemoPickups(GAME.scene, GAME.scenarioId);
  if (typeof initWeatherFX === 'function') initWeatherFX();
  if (typeof initEvents === 'function') initEvents();
  if (typeof spawnSceneDecor === 'function') spawnSceneDecor(GAME.scene, GAME.scenarioId);
  // Mixamo 클립 + 도구 미리 로드 (있을 때만 — 없으면 기본 Idle/Walk/Run 폴백)
  if (typeof preloadMotionClips === 'function') preloadMotionClips();
  if (typeof preloadMotionTools === 'function') preloadMotionTools();

  const bScenario = document.getElementById('blocker-scenario');
  const bControls = document.getElementById('blocker-controls');
  const scenarioTitlesByLang = {
    ko: { excavation: '토공사 · 굴착·흙막이', foundation: '기초공사 · 거푸집·철근·타설', lifting: '골조 양중 · 줄걸이·인양', envelope: '외장공사 · 비계·창호', mep_finish: '설비·마감 · 전기·배관' },
    en: { excavation: 'Earthworks · Excavation', foundation: 'Foundation · Formwork & Pour', lifting: 'RC Frame · Lifting', envelope: 'Envelope · Scaffold & Glass', mep_finish: 'MEP & Finishing · Electrical/Piping' },
    vi: { excavation: 'San nền · Đào', foundation: 'Móng · Ván khuôn & Đổ', lifting: 'Khung · Cẩu', envelope: 'Vỏ ngoài · Giàn giáo', mep_finish: 'M&E · Điện/Ống' },
    ar: { excavation: 'الحفر · أعمال التربة', foundation: 'الأساسات · القوالب والصب', lifting: 'الهيكل · الرفع', envelope: 'الواجهة · السقالة', mep_finish: 'التركيب والتشطيب · كهرباء/أنابيب' },
  };
  const scenarioTitles = scenarioTitlesByLang[currentLang] || scenarioTitlesByLang.ko;
  if (bScenario) bScenario.textContent = scenarioTitles[GAME.scenarioId] || t('s01Title');
  if (bControls) bControls.textContent = t('blockerControls');
  // 이름 입력 패널의 부제목도 갱신
  const nameSub = document.querySelector('.name-input-sub');
  const subSuffix = { ko: ' 시나리오', en: ' scenario', vi: ' kịch bản', ar: ' السيناريو' }[currentLang] || ' 시나리오';
  const fallbackTitle = { ko: '안전 시뮬레이터', en: 'Safety Simulator', vi: 'Mô phỏng an toàn', ar: 'محاكي السلامة' }[currentLang] || '안전 시뮬레이터';
  if (nameSub) nameSub.textContent = (scenarioTitles[GAME.scenarioId] || fallbackTitle) + subSuffix;

  GAME.clock.start();
  _loop();
})();

function _loop() {
  requestAnimationFrame(_loop);
  if (typeof perfFrame === 'function') perfFrame();
  const delta   = Math.min(GAME.clock.getDelta(), 0.05);
  const elapsed = GAME.clock.elapsedTime;

  if (GAME.state.gameStarted && !GAME.state.gameOver && !GAME.state.paused) {
    if (!GAME.state.craneBoarded) updatePlayer(delta);
    updateInteraction();
    updateHUD();
    if (typeof updateUnsafe === 'function')      updateUnsafe();
    if (typeof updateSurvey === 'function')         updateSurvey();
    if (typeof updateShoring === 'function')        updateShoring(delta);
    if (typeof updateRailing === 'function')        updateRailing(elapsed);
    if (typeof updateSignalPlacement === 'function')updateSignalPlacement();
    // foundation
    if (typeof updateRebar === 'function')          updateRebar(delta);
    if (typeof updateFormwork === 'function')       updateFormwork(delta);
    if (typeof updatePump === 'function')           updatePump(delta);
    if (typeof updatePourOrder === 'function')      updatePourOrder(delta);
    // envelope
    if (typeof updateScaffold === 'function')       updateScaffold(delta);
    if (typeof updateLifeline === 'function')       updateLifeline(delta);
    if (typeof updatePanel === 'function')          updatePanel(delta);
    if (typeof updateEnvSignal === 'function')      updateEnvSignal(delta);
    // rc_frame sub-steps (lifting 시나리오 안에서 동작)
    if (typeof updateFormworkRc === 'function')     updateFormworkRc(delta);
    if (typeof updatePourRc === 'function')         updatePourRc(delta);
    // mep_finish
    if (typeof updateLoto === 'function')           updateLoto(delta);
    if (typeof updateGas === 'function')            updateGas(delta);
    if (typeof updateVent === 'function')           updateVent(delta);
    if (typeof updateExt === 'function')            updateExt(delta);
    if (typeof updateAvatar === 'function')         updateAvatar();
    if (typeof updateDelegation === 'function')     updateDelegation(delta);
    if (typeof updatePhysics === 'function')    updatePhysics(delta);
    if (typeof updateInspector === 'function')  updateInspector(delta);
    if (typeof updateJuice === 'function')       updateJuice(delta);
    if (typeof updateNpcChat === 'function')     updateNpcChat(delta);
    if (typeof updateWeatherFX === 'function')   updateWeatherFX(delta);
    if (typeof updateEvents === 'function')      updateEvents(delta);
    if (typeof updateTimePressure === 'function') updateTimePressure(delta);
    if (typeof updateInteractGlow === 'function') updateInteractGlow(delta);
    if (typeof updateObjectiveMarker === 'function') updateObjectiveMarker(delta);
    if (typeof updateRcLoopTaskLocs === 'function') updateRcLoopTaskLocs(delta);
    if (typeof updateInterference === 'function') updateInterference(delta);
    if (typeof updateTaskChips === 'function')    updateTaskChips();
    if (typeof WEATHER !== 'undefined')         WEATHER.tick(delta);
    if (typeof tickAllNPCs !== 'undefined')      tickAllNPCs(delta, elapsed);
    if (typeof updateNPCLabels !== 'undefined')  updateNPCLabels();
    if (typeof MINIMAP !== 'undefined')          MINIMAP.update();
  }

  if (typeof renderPostFX === 'function') renderPostFX();
  else GAME.renderer.render(GAME.scene, GAME.camera);
}
