// engine.js — BULSA v0 엔진 (Babylon.js)
// Babylon.js Engine + Scene, PBR 머티리얼, 그림자, ArcRotateCamera

/* ─── GAME 전역 상태 ─────────────────────────────────────── */
const GAME = {
  engine:    null,
  scene:     null,
  camera:    null,
  canvas:    null,
  shadowGen: null,
  player:    null,   // 플레이어 캡슐 메시
  npcBoss:   null,   // 발주처 NPC 캡슐 메시
  state: {
    gameStarted:   false,
    gameOver:      false,
    paused:        false,
    dialogActive:  true,   // 대화 중 이동 잠금
    playerName:    '',
    lang:          'ko',
    look:          0,
    safetyIndex:   100,
    lifeWater:     0,
  },
};

/* ─── 엔진 초기화 ─────────────────────────────────────────── */
(function initEngine() {
  const p = new URLSearchParams(window.location.search);
  GAME.state.playerName = p.get('name') || localStorage.getItem('bulsa_name') || '신입';
  GAME.state.lang       = p.get('lang') || localStorage.getItem('bulsa_lang') || 'ko';
  GAME.state.look       = Number(p.get('look') ?? localStorage.getItem('bulsa_look') ?? 0);

  const canvas = document.getElementById('renderCanvas');
  GAME.canvas  = canvas;

  const engine = new BABYLON.Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true,
    adaptToDeviceRatio: true,
  });
  GAME.engine = engine;

  const scene = _buildScene(engine, canvas);
  GAME.scene  = scene;

  _buildOfficeScene(scene);

  // 렌더 루프 — 대화 중 카메라 자동 회전
  engine.runRenderLoop(() => {
    if (GAME.state.paused) return;
    if (GAME.state.dialogActive && GAME.camera) {
      GAME.camera.alpha += 0.003;
    }
    scene.render();
  });

  window.addEventListener('resize', () => engine.resize());
})();

/* ─── 씬 기본 세팅 ────────────────────────────────────────── */
function _buildScene(engine, canvas) {
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.051, 0.106, 0.165, 1); // #0D1B2A

  // 환경 헤미스피어 조명
  const hemi = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0, 1, 0), scene);
  hemi.intensity   = 0.25;
  hemi.diffuse     = new BABYLON.Color3(0.55, 0.65, 0.75);
  hemi.groundColor = new BABYLON.Color3(0.08, 0.12, 0.16);
  hemi.specular    = BABYLON.Color3.Black();

  // 방향성 태양광 (그림자 기준)
  const sun = new BABYLON.DirectionalLight('sun', new BABYLON.Vector3(-1, -2, -0.8), scene);
  sun.position  = new BABYLON.Vector3(8, 12, 8);
  sun.intensity = 0.9;
  sun.diffuse   = new BABYLON.Color3(0.95, 0.90, 0.80);

  // 그림자 생성기
  const sg = new BABYLON.ShadowGenerator(2048, sun);
  sg.useBlurExponentialShadowMap = true;
  sg.blurKernel = 16;
  GAME.shadowGen = sg;

  // ArcRotateCamera — 3인칭 GTA 스타일
  const cam = new BABYLON.ArcRotateCamera('cam',
    -Math.PI / 2.2,
    Math.PI / 3.2,
    7,
    BABYLON.Vector3.Zero(),
    scene
  );
  cam.lowerRadiusLimit     = 2;
  cam.upperRadiusLimit     = 18;
  cam.upperBetaLimit       = Math.PI / 2.05;
  cam.lowerBetaLimit       = 0.3;
  cam.wheelDeltaPercentage = 0.01;
  cam.minZ = 0.1;
  GAME.camera = cam;

  return scene;
}

/* ─── 현장사무소 씬 ───────────────────────────────────────── */
function _buildOfficeScene(scene) {
  const M  = BABYLON.MeshBuilder;
  const sg = GAME.shadowGen;

  function pbr(name, r, g, b, rough, metal) {
    const m = new BABYLON.PBRMaterial(name, scene);
    m.albedoColor = new BABYLON.Color3(r, g, b);
    m.roughness   = rough ?? 0.85;
    m.metallic    = metal ?? 0;
    return m;
  }

  // ── 바닥 ──────────────────────────────────────────────────
  const floor = M.CreateBox('floor', { width: 12, height: 0.18, depth: 10 }, scene);
  floor.position.y     = -0.09;
  floor.receiveShadows = true;
  floor.material       = pbr('floorMat', 0.50, 0.46, 0.40, 0.92);

  // ── 벽 4면 ────────────────────────────────────────────────
  const wallMat = pbr('wallMat', 0.70, 0.68, 0.62, 0.95);
  [
    { name: 'wN', w: 12,   h: 3.3, d: 0.18, px: 0,  py: 1.56, pz: -5   },
    { name: 'wS', w: 12,   h: 3.3, d: 0.18, px: 0,  py: 1.56, pz:  5   },
    { name: 'wW', w: 0.18, h: 3.3, d: 10,   px: -6, py: 1.56, pz:  0   },
    { name: 'wE', w: 0.18, h: 3.3, d: 10,   px:  6, py: 1.56, pz:  0   },
  ].forEach(({ name, w, h, d, px, py, pz }) => {
    const wall = M.CreateBox(name, { width: w, height: h, depth: d }, scene);
    wall.position    = new BABYLON.Vector3(px, py, pz);
    wall.material    = wallMat;
    wall.receiveShadows = true;
  });

  // ── 천장 ──────────────────────────────────────────────────
  const ceil = M.CreateBox('ceiling', { width: 12, height: 0.15, depth: 10 }, scene);
  ceil.position.y = 3.22;
  ceil.material   = pbr('ceilMat', 0.82, 0.80, 0.76, 0.98);

  // ── 책상 ──────────────────────────────────────────────────
  const deskMat = pbr('deskMat', 0.40, 0.28, 0.16, 0.65);
  const deskTop = M.CreateBox('deskTop', { width: 2.6, height: 0.08, depth: 1.1 }, scene);
  deskTop.position     = new BABYLON.Vector3(-2, 0.82, -2.2);
  deskTop.material     = deskMat;
  deskTop.receiveShadows = true;
  sg.addShadowCaster(deskTop);

  [[-1.15, -2.65], [1.15, -2.65], [-1.15, -1.75], [1.15, -1.75]].forEach(([lx, lz], i) => {
    const leg = M.CreateBox('deskLeg' + i, { width: 0.07, height: 0.82, depth: 0.07 }, scene);
    leg.position = new BABYLON.Vector3(-2 + lx, 0.41, lz);
    leg.material = deskMat;
  });

  // 책상 위 서류 더미
  const paper = M.CreateBox('papers', { width: 0.5, height: 0.04, depth: 0.35 }, scene);
  paper.position = new BABYLON.Vector3(-1.6, 0.90, -2.2);
  paper.material = pbr('paperMat', 0.92, 0.88, 0.80, 0.98);
  sg.addShadowCaster(paper);

  // ── 따뜻한 실내 조명 ──────────────────────────────────────
  const b1 = new BABYLON.PointLight('bulb1', new BABYLON.Vector3(-1, 3.0, 0), scene);
  b1.intensity = 65;
  b1.diffuse   = new BABYLON.Color3(1.0, 0.82, 0.55);
  b1.specular  = new BABYLON.Color3(0.7, 0.55, 0.35);
  b1.range     = 12;

  const b2 = new BABYLON.PointLight('bulb2', new BABYLON.Vector3(3, 2.8, 2), scene);
  b2.intensity = 38;
  b2.diffuse   = new BABYLON.Color3(1.0, 0.88, 0.65);
  b2.range     = 9;

  // ── 플레이어 캡슐 (라임) ──────────────────────────────────
  const player = M.CreateCapsule('player',
    { radius: 0.32, height: 1.7, tessellation: 14 }, scene);
  player.position     = new BABYLON.Vector3(0.5, 0.85, 1.2);
  player.receiveShadows = true;
  sg.addShadowCaster(player);
  player.material     = pbr('playerMat', 0.55, 0.78, 0.24, 0.55, 0.1);
  GAME.player = player;

  // ── 발주처 NPC 캡슐 (네이비 블루) ─────────────────────────
  const npc = M.CreateCapsule('npcBoss',
    { radius: 0.32, height: 1.7, tessellation: 14 }, scene);
  npc.position  = new BABYLON.Vector3(-2.0, 0.85, -1.8);
  npc.receiveShadows = true;
  sg.addShadowCaster(npc);
  npc.material  = pbr('npcMat', 0.20, 0.38, 0.65, 0.6);
  GAME.npcBoss  = npc;

  // 카메라 초기 타겟 — 플레이어·NPC 중간
  GAME.camera.setTarget(new BABYLON.Vector3(-0.8, 1.0, -0.3));
  GAME.camera.radius = 7;
}
