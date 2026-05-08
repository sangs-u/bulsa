// Main engine — initializes everything and runs the game loop

const GAME = {
  scene: null,
  camera: null,
  renderer: null,
  clock: null,
  hazards: [],
  interactables: [],
  liftBeam: null,
  _cranePanelMesh: null,
  _pulseHazards: null,
  state: {
    phase: 1,
    safetyIndex: 100,
    hazardsResolved: new Set(),
    violations: new Set(),
    accidentTriggered: false,
    gameOver: false,
    gameStarted: false,
  },
};

(function initEngine() {
  // ── Scene ──────────────────────────────────────────────
  GAME.scene = new THREE.Scene();

  // ── Camera ─────────────────────────────────────────────
  GAME.camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 250);
  GAME.camera.position.set(0, 1.7, 12);
  GAME.camera.lookAt(0, 1.7, -8);

  // ── Renderer ───────────────────────────────────────────
  const canvas = document.getElementById('gameCanvas');
  GAME.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  GAME.renderer.setSize(innerWidth, innerHeight);
  GAME.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  GAME.renderer.shadowMap.enabled = true;
  GAME.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // ── Clock ──────────────────────────────────────────────
  GAME.clock = new THREE.Clock();

  // ── Resize ─────────────────────────────────────────────
  window.addEventListener('resize', () => {
    GAME.camera.aspect = innerWidth / innerHeight;
    GAME.camera.updateProjectionMatrix();
    GAME.renderer.setSize(innerWidth, innerHeight);
  });

  // ── Build world ────────────────────────────────────────
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

  // ── Init systems ───────────────────────────────────────
  initPlayer();
  initInteraction();
  initHUD();
  initAccident();

  // ── Update blocker text (i18n) ─────────────────────────
  const bScenario = document.getElementById('blocker-scenario');
  const bControls = document.getElementById('blocker-controls');
  if (bScenario) bScenario.textContent = t('s01Title');
  if (bControls) bControls.textContent = t('blockerControls');

  // ── Game loop ──────────────────────────────────────────
  GAME.clock.start();
  _loop();
})();

function _loop() {
  requestAnimationFrame(_loop);
  const delta = Math.min(GAME.clock.getDelta(), 0.05); // cap at 50ms
  const elapsed = GAME.clock.elapsedTime;

  if (GAME.state.gameStarted && !GAME.state.gameOver) {
    updatePlayer(delta);
    updateInteraction();
    updateHUD();
    if (GAME._pulseHazards) GAME._pulseHazards(elapsed);
  }

  GAME.renderer.render(GAME.scene, GAME.camera);
}
