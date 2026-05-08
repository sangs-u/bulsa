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

  if (typeof buildLiftingScene === 'function') {
    buildLiftingScene();
  } else {
    console.error('buildLiftingScene 없음 — scene.js 로딩 순서 확인');
  }
  if (typeof registerLiftingHazards === 'function') {
    registerLiftingHazards();
  } else {
    console.error('registerLiftingHazards 없음 — hazards.js 로딩 순서 확인');
  }

  initPlayer();
  initInteraction();
  initHUD();
  initAccident();

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
    if (!GAME.state.craneBoarded) {
      updatePlayer(delta);
    }
    updateInteraction();
    updateHUD();
  }

  GAME.renderer.render(GAME.scene, GAME.camera);
}
