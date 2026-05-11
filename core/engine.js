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
  },
};

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
  if (typeof initBlueprintViewer === 'function') initBlueprintViewer();
  if (typeof initPostFX === 'function') initPostFX();

  const bScenario = document.getElementById('blocker-scenario');
  const bControls = document.getElementById('blocker-controls');
  if (bScenario) bScenario.textContent = t('s01Title');
  if (bControls) bControls.textContent = t('blockerControls');

  GAME.clock.start();
  _loop();
})();

function _loop() {
  requestAnimationFrame(_loop);
  const delta   = Math.min(GAME.clock.getDelta(), 0.05);
  const elapsed = GAME.clock.elapsedTime;

  if (GAME.state.gameStarted && !GAME.state.gameOver) {
    if (!GAME.state.craneBoarded) updatePlayer(delta);
    updateInteraction();
    updateHUD();
    if (typeof updateUnsafe === 'function')      updateUnsafe();
    if (typeof updateSurvey === 'function')      updateSurvey();
    if (typeof updateAvatar === 'function')      updateAvatar();
    if (typeof WEATHER !== 'undefined')         WEATHER.tick(delta);
    if (typeof tickAllNPCs !== 'undefined')      tickAllNPCs(delta, elapsed);
    if (typeof updateNPCLabels !== 'undefined')  updateNPCLabels();
    if (typeof MINIMAP !== 'undefined')          MINIMAP.update();
  }

  if (typeof renderPostFX === 'function') renderPostFX();
  else GAME.renderer.render(GAME.scene, GAME.camera);
}
