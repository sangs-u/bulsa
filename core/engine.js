// engine.js — BULSA v0 엔진 (Babylon.js)
// Babylon.js Engine + Scene, PBR, 그림자, ArcRotateCamera
// 벽 투명화: 카메라가 벽 뒤로 가면 해당 벽을 자동으로 페이드아웃

/* ─── GAME 전역 상태 ─────────────────────────────────────── */
const GAME = {
  engine:    null,
  scene:     null,
  camera:    null,
  canvas:    null,
  shadowGen: null,
  player:    null,
  npcBoss:   null,
  waterMesh: null,  // 命 게이지 수위 시각화 메시
  walls:     [],    // 벽·천장 메시 (카메라 오클루전 페이드 대상)
  state: {
    gameStarted:  false,
    gameOver:     false,
    paused:       false,
    dialogActive: true,
    playerName:   '',
    lang:         'ko',
    look:         0,
    safetyIndex:  100,
    lifeWater:    0,
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

  // 렌더 루프 — 벽 투명화 포함
  engine.runRenderLoop(() => {
    if (GAME.state.paused) return;
    _updateWallOcclusion();
    scene.render();
  });

  window.addEventListener('resize', () => engine.resize());
})();

/* ─── 씬 기본 세팅 ────────────────────────────────────────── */
function _buildScene(engine, canvas) {
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.051, 0.106, 0.165, 1); // #0D1B2A

  // 환경 헤미스피어
  const hemi = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0, 1, 0), scene);
  hemi.intensity   = 0.30;
  hemi.diffuse     = new BABYLON.Color3(0.65, 0.70, 0.80);
  hemi.groundColor = new BABYLON.Color3(0.10, 0.12, 0.15);
  hemi.specular    = BABYLON.Color3.Black();

  // 방향성 조명 (그림자 기준)
  const sun = new BABYLON.DirectionalLight('sun', new BABYLON.Vector3(-1, -2, -0.8), scene);
  sun.position  = new BABYLON.Vector3(10, 18, 10);
  sun.intensity = 0.8;
  sun.diffuse   = new BABYLON.Color3(0.95, 0.90, 0.80);

  // 그림자
  const sg = new BABYLON.ShadowGenerator(2048, sun);
  sg.useBlurExponentialShadowMap = true;
  sg.blurKernel = 16;
  GAME.shadowGen = sg;

  // ArcRotateCamera
  const cam = new BABYLON.ArcRotateCamera('cam',
    -Math.PI / 2.2,
    Math.PI / 3.2,
    9,
    BABYLON.Vector3.Zero(),
    scene
  );
  cam.lowerRadiusLimit     = 2;
  cam.upperRadiusLimit     = 22;   // 벽이 투명해지므로 넉넉히
  cam.upperBetaLimit       = Math.PI / 2.1;
  cam.lowerBetaLimit       = 0.2;
  cam.wheelDeltaPercentage = 0.01;
  cam.minZ = 0.1;
  cam.attachControl(false); // false = preventDefault 호출 (모바일 터치 정상 처리)
  GAME.camera = cam;

  return scene;
}

/* ─── 벽 오클루전 투명화 (매 프레임) ─────────────────────── */
function _updateWallOcclusion() {
  if (!GAME.camera || !GAME.walls.length) return;

  const camPos = GAME.camera.position;
  const tgt    = GAME.camera.target;
  const dir    = tgt.subtract(camPos);
  const dist   = dir.length();
  if (dist < 0.01) return;
  dir.scaleInPlace(1 / dist);

  const ray = new BABYLON.Ray(camPos, dir, dist + 0.5);

  GAME.walls.forEach(mesh => {
    const hit     = ray.intersectsMesh(mesh, false).hit;
    const goal    = hit ? 0.05 : 1.0;
    // 스무스 전환
    mesh.visibility += (goal - mesh.visibility) * 0.20;
  });
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

  // ── 바닥 (20 × 16) ────────────────────────────────────────
  const floor = M.CreateBox('floor', { width: 20, height: 0.18, depth: 16 }, scene);
  floor.position.y     = -0.09;
  floor.receiveShadows = true;
  floor.material       = pbr('floorMat', 0.52, 0.48, 0.42, 0.90);

  // ── 벽 4면 + 천장 → GAME.walls에 등록 ─────────────────────
  // 투명화 대상이므로 각각 독립 머티리얼 사용
  const wallDefs = [
    { name: 'wN', w: 20.4, h: 4.5, d: 0.20, px: 0,   py: 2.16, pz: -8   },
    { name: 'wS', w: 20.4, h: 4.5, d: 0.20, px: 0,   py: 2.16, pz:  8   },
    { name: 'wW', w: 0.20, h: 4.5, d: 16.4, px: -10, py: 2.16, pz:  0   },
    { name: 'wE', w: 0.20, h: 4.5, d: 16.4, px:  10, py: 2.16, pz:  0   },
    { name: 'ceil', w: 20.4, h: 0.16, d: 16.4, px: 0,  py: 4.44, pz: 0  },
  ];

  wallDefs.forEach(({ name, w, h, d, px, py, pz }) => {
    const mesh = M.CreateBox(name, { width: w, height: h, depth: d }, scene);
    mesh.position    = new BABYLON.Vector3(px, py, pz);
    mesh.material    = pbr(name + 'Mat',
      name === 'ceil' ? 0.85 : 0.72,
      name === 'ceil' ? 0.83 : 0.70,
      name === 'ceil' ? 0.80 : 0.64,
      0.95
    );
    mesh.receiveShadows = true;
    GAME.walls.push(mesh);  // 오클루전 목록에 등록
  });

  // ── 바닥 몰딩 (벽 하단 장식) ──────────────────────────────
  const moldMat = pbr('moldMat', 0.38, 0.32, 0.26, 0.80);
  [
    { w: 20, d: 0.12, px: 0,   pz: -7.94 },
    { w: 20, d: 0.12, px: 0,   pz:  7.94 },
    { w: 0.12, d: 16, px: -9.94, pz: 0   },
    { w: 0.12, d: 16, px:  9.94, pz: 0   },
  ].forEach(({ w, d, px, pz }, i) => {
    const m = M.CreateBox('mold' + i, { width: w, height: 0.12, depth: d }, scene);
    m.position = new BABYLON.Vector3(px, 0.06, pz);
    m.material = moldMat;
  });

  // ── 책상 ──────────────────────────────────────────────────
  const deskMat = pbr('deskMat', 0.38, 0.26, 0.14, 0.62);

  const deskTop = M.CreateBox('deskTop', { width: 2.8, height: 0.08, depth: 1.2 }, scene);
  deskTop.position = new BABYLON.Vector3(-2, 0.82, -2.5);
  deskTop.material = deskMat;
  deskTop.receiveShadows = true;
  sg.addShadowCaster(deskTop);

  [[-1.25, -3.05], [1.25, -3.05], [-1.25, -1.95], [1.25, -1.95]].forEach(([lx, lz], i) => {
    const leg = M.CreateBox('leg' + i, { width: 0.08, height: 0.82, depth: 0.08 }, scene);
    leg.position = new BABYLON.Vector3(-2 + lx, 0.41, lz);
    leg.material = deskMat;
  });

  // 서류 더미
  const paper = M.CreateBox('papers', { width: 0.55, height: 0.04, depth: 0.40 }, scene);
  paper.position = new BABYLON.Vector3(-1.5, 0.90, -2.5);
  paper.material = pbr('paperMat', 0.92, 0.88, 0.82, 0.98);
  sg.addShadowCaster(paper);

  // ── 창문 (북쪽 벽 - 밝은 사각형) ──────────────────────────
  const windowMat = new BABYLON.PBRMaterial('windowMat', scene);
  windowMat.albedoColor  = new BABYLON.Color3(0.60, 0.75, 0.90);
  windowMat.emissiveColor = new BABYLON.Color3(0.30, 0.42, 0.55);
  windowMat.roughness    = 0.05;
  windowMat.metallic     = 0;
  const win = M.CreateBox('window', { width: 2.2, height: 1.4, depth: 0.05 }, scene);
  win.position = new BABYLON.Vector3(3, 2.6, -7.88);
  win.material = windowMat;

  // ── 실내 조명 ──────────────────────────────────────────────
  // 형광등 느낌 (차가운 흰빛 + 따뜻한 보조광)
  const main = new BABYLON.PointLight('main', new BABYLON.Vector3(0, 4.2, 0), scene);
  main.intensity = 120;
  main.diffuse   = new BABYLON.Color3(0.95, 0.95, 1.0);
  main.specular  = new BABYLON.Color3(0.5, 0.5, 0.6);
  main.range     = 20;

  const warm = new BABYLON.PointLight('warm', new BABYLON.Vector3(-3, 3.5, -3), scene);
  warm.intensity = 55;
  warm.diffuse   = new BABYLON.Color3(1.0, 0.82, 0.55);
  warm.range     = 12;

  const fill = new BABYLON.PointLight('fill', new BABYLON.Vector3(4, 3.0, 3), scene);
  fill.intensity = 35;
  fill.diffuse   = new BABYLON.Color3(0.85, 0.90, 1.0);
  fill.range     = 10;

  // ── 플레이어 캡슐 (라임) ──────────────────────────────────
  const player = M.CreateCapsule('player',
    { radius: 0.32, height: 1.7, tessellation: 14 }, scene);
  player.position     = new BABYLON.Vector3(1, 0.85, 1.5);
  player.receiveShadows = true;
  sg.addShadowCaster(player);
  player.material     = pbr('playerMat', 0.55, 0.78, 0.24, 0.55, 0.1);
  // 반투명 외피 — 내부 물 수위가 비쳐 보이도록 (2 = ALPHABLEND)
  player.material.alpha            = 0.72;
  player.material.transparencyMode = 2;
  GAME.player = player;

  // ── 物 수위 메시 (命 게이지 시각화) ─────────────────────
  const waterFill = M.CreateCapsule('playerWater',
    { radius: 0.28, height: 1.58, tessellation: 14 }, scene);
  waterFill.parent       = player;
  waterFill.position     = BABYLON.Vector3.Zero();
  waterFill.isPickable   = false;
  waterFill.isVisible    = false;          // 수위 0일 때 완전히 숨김

  const waterMat = new BABYLON.PBRMaterial('waterFillMat', scene);
  waterMat.albedoColor      = new BABYLON.Color3(0.08, 0.42, 0.92);
  waterMat.emissiveColor    = new BABYLON.Color3(0.00, 0.22, 0.60);
  waterMat.roughness        = 0.05;
  waterMat.metallic         = 0;
  waterMat.alpha            = 0.82;
  waterMat.transparencyMode = 2;
  waterMat.disableDepthWrite = true;       // 깊이 버퍼 쓰기 금지 — 플레이어 가림 방지
  waterFill.renderingGroupId = 1;          // 플레이어(group 0) 다음에 렌더
  waterFill.material = waterMat;
  GAME.waterMesh = waterFill;

  // 클립 플레인으로 수위 높이 제어 (수위 있을 때만 실행)
  waterFill.onBeforeRenderObservable.add(() => {
    const lw      = GAME.state.lifeWater;
    const wpos    = player.getAbsolutePosition();
    const bottomY = wpos.y - 0.85;
    const clipY   = bottomY + 1.7 * Math.min(lw, 100) / 100;
    scene.clipPlane = new BABYLON.Plane(0, 1, 0, -clipY);
  });
  waterFill.onAfterRenderObservable.add(() => {
    scene.clipPlane = null;
  });

  // ── 발주처 NPC 캡슐 (블루) ────────────────────────────────
  const npc = M.CreateCapsule('npcBoss',
    { radius: 0.32, height: 1.7, tessellation: 14 }, scene);
  npc.position  = new BABYLON.Vector3(-2.2, 0.85, -2.0);
  npc.receiveShadows = true;
  sg.addShadowCaster(npc);
  npc.material  = pbr('npcMat', 0.20, 0.38, 0.65, 0.6);
  GAME.npcBoss  = npc;

  // 카메라 초기 타겟
  GAME.camera.setTarget(new BABYLON.Vector3(-0.6, 1.2, -0.3));
  GAME.camera.radius = 9;
}
