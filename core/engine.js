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
  const _active = _scenarios[_scenarioId] || _scenarios.lifting;
  GAME.scenarioId = _scenarioId in _scenarios ? _scenarioId : 'lifting';

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

  const bScenario = document.getElementById('blocker-scenario');
  const bControls = document.getElementById('blocker-controls');
  if (bScenario) bScenario.textContent = t('s01Title');
  if (bControls) bControls.textContent = t('blockerControls');

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
    if (typeof updateInteractGlow === 'function') updateInteractGlow(delta);
    if (typeof WEATHER !== 'undefined')         WEATHER.tick(delta);
    if (typeof tickAllNPCs !== 'undefined')      tickAllNPCs(delta, elapsed);
    if (typeof updateNPCLabels !== 'undefined')  updateNPCLabels();
    if (typeof MINIMAP !== 'undefined')          MINIMAP.update();
  }

  if (typeof renderPostFX === 'function') renderPostFX();
  else GAME.renderer.render(GAME.scene, GAME.camera);
}
