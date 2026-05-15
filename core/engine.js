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
  walls:        [],    // 벽·천장 메시 (카메라 오클루전 페이드 대상)
  officeMeshes: [],
  officeLights: [],
  siteMeshes:   [],
  currentScene: 'office',
  state: {
    gameStarted:  false,
    gameOver:     false,
    paused:       false,
    dialogActive: false,   // 대화 시작 전 자유 이동
    playerName:   '',
    lang:         'ko',
    look:         0,
    safetyIndex:  100,
    lifeWater:    0,
  },
};

/* ─── URL 파라미터 파싱 (동기 — applyHud가 바로 읽음) ─────── */
(function parseState() {
  const p = new URLSearchParams(window.location.search);
  GAME.state.playerName = p.get('name') || localStorage.getItem('bulsa_name') || '신입';
  GAME.state.lang       = p.get('lang') || localStorage.getItem('bulsa_lang') || 'ko';
  GAME.state.look       = Number(p.get('look') ?? localStorage.getItem('bulsa_look') ?? 0);
})();

/* ─── Babylon.js 초기화 (load 이후 — CSS 레이아웃 완료 보장) ── */
window.addEventListener('load', function _babylonInit() {
  const canvas = document.getElementById('renderCanvas');
  GAME.canvas  = canvas;

  try {
    if (typeof BABYLON === 'undefined') throw new Error('Babylon.js 로드 실패 (CDN 오류)');

    const engine = new BABYLON.Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      adaptToDeviceRatio: true,
    });
    GAME.engine = engine;

    const scene = _buildScene(engine, canvas);
    GAME.scene  = scene;

    const _preMeshIds  = new Set(scene.meshes.map(m => m.uniqueId));
    const _preLightIds = new Set(scene.lights.map(l => l.uniqueId));
    _buildOfficeScene(scene);
    GAME.officeMeshes = scene.meshes.filter(m => !_preMeshIds.has(m.uniqueId) && m !== GAME.player && m !== GAME.waterMesh);
    GAME.officeLights = scene.lights.filter(l => !_preLightIds.has(l.uniqueId));

    // 모바일: Babylon PointerEvent 처리 완전 비활성화
    // (카메라 회전은 player.js의 inertialAlphaOffset으로 직접 제어)
    if ('ontouchstart' in window) {
      scene.detachControl();
    }

    engine.runRenderLoop(() => {
      if (GAME.state.paused) return;
      _updateWallOcclusion();
      _checkNpcProximity();
      scene.render();
    });

    window.addEventListener('resize', () => engine.resize());

    // 다른 모듈에 엔진 준비 완료 알림
    window.dispatchEvent(new Event('game:ready'));

  } catch (err) {
    _showEngineError(err);
  }
});

function _showEngineError(err) {
  const div = document.createElement('div');
  div.style.cssText = 'position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#0D1B2A;color:#E85A3A;font-family:monospace;padding:24px;z-index:9999;text-align:center;';
  div.innerHTML = '<div style="font-size:2rem;margin-bottom:16px">⚠ 엔진 오류</div>'
    + '<div style="font-size:.85rem;color:#C8D8E8;max-width:400px;word-break:break-all">' + err.message + '</div>'
    + '<div style="margin-top:20px;font-size:.75rem;color:#3A6B9A">lang=' + (new URLSearchParams(location.search).get('lang') || '?') + ' · UA: ' + navigator.userAgent.slice(0,60) + '</div>';
  document.body.appendChild(div);
}

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
  // 데스크톱만 Babylon 기본 입력. 모바일은 joy-look이 직접 제어
  if (!('ontouchstart' in window)) {
    cam.attachControl(false);
  }
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

/* ─── NPC 근접 감지 (매 프레임) ──────────────────────────── */
function _checkNpcProximity() {
  if (GAME.currentScene !== 'office') return;
  if (!GAME.player || !GAME.npcBoss || GAME.state.dialogActive) return;
  const d = BABYLON.Vector3.Distance(GAME.player.position, GAME.npcBoss.position);
  const prompt = document.getElementById('interact-prompt');
  if (prompt) prompt.style.display = d < 2.5 ? 'flex' : 'none';
}

/* ─── 현장사무소 씬 ───────────────────────────────────────── */
// 방 크기: x -10~10 (폭20), z -8~8 (깊이16), y 0~4.44 (높이)
// 북쪽(z=-8) = 부장 책상. 남쪽(z=8) = 출입구. 플레이어는 남쪽에서 출발.
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
  function box(name, w, h, d, px, py, pz, mat, shadow) {
    const mesh = M.CreateBox(name, { width: w, height: h, depth: d }, scene);
    mesh.position = new BABYLON.Vector3(px, py, pz);
    mesh.material = mat;
    mesh.receiveShadows = true;
    if (shadow) sg.addShadowCaster(mesh);
    return mesh;
  }

  // ── 바닥 ──────────────────────────────────────────────────
  // 앞쪽 절반: 콘크리트 타일, 뒤쪽 절반: 카펫 느낌
  box('floor', 20, 0.18, 16, 0, -0.09, 0,
    pbr('floorMat', 0.50, 0.46, 0.40, 0.92));

  // ── 벽 4면 + 천장 ─────────────────────────────────────────
  const wallMat  = pbr('wallMat',  0.76, 0.73, 0.68, 0.95);
  const ceilMat  = pbr('ceilMat',  0.88, 0.86, 0.83, 0.98);
  const wallDefs = [
    { name: 'wN',   w: 20.4, h: 4.5,  d: 0.20, px:  0,   py: 2.16, pz: -8,   mat: wallMat },
    { name: 'wS',   w: 20.4, h: 4.5,  d: 0.20, px:  0,   py: 2.16, pz:  8,   mat: wallMat },
    { name: 'wW',   w: 0.20, h: 4.5,  d: 16.4, px: -10,  py: 2.16, pz:  0,   mat: wallMat },
    { name: 'wE',   w: 0.20, h: 4.5,  d: 16.4, px:  10,  py: 2.16, pz:  0,   mat: wallMat },
    { name: 'ceil', w: 20.4, h: 0.16, d: 16.4, px:  0,   py: 4.44, pz:  0,   mat: ceilMat },
  ];
  wallDefs.forEach(({ name, w, h, d, px, py, pz, mat }) => {
    const mesh = M.CreateBox(name, { width: w, height: h, depth: d }, scene);
    mesh.position    = new BABYLON.Vector3(px, py, pz);
    mesh.material    = mat;
    mesh.receiveShadows = true;
    GAME.walls.push(mesh);
  });

  // 걸레받이
  const moldMat = pbr('moldMat', 0.36, 0.30, 0.24, 0.80);
  [
    { w: 20,   d: 0.12, px:  0,    pz: -7.94 },
    { w: 20,   d: 0.12, px:  0,    pz:  7.94 },
    { w: 0.12, d: 16,   px: -9.94, pz:  0    },
    { w: 0.12, d: 16,   px:  9.94, pz:  0    },
  ].forEach(({ w, d, px, pz }, i) =>
    box('mold'+i, w, 0.12, d, px, 0.06, pz, moldMat));

  // ── 창문 (북쪽 벽 ×2) ─────────────────────────────────────
  const winMat = new BABYLON.PBRMaterial('winMat', scene);
  winMat.albedoColor   = new BABYLON.Color3(0.55, 0.72, 0.90);
  winMat.emissiveColor = new BABYLON.Color3(0.22, 0.38, 0.52);
  winMat.roughness = 0.05; winMat.metallic = 0;
  [{ px: -3.5 }, { px: 3.5 }].forEach(({ px }, i) => {
    const win = box('win'+i, 2.4, 1.6, 0.06, px, 2.7, -7.88, winMat);
    // 창틀 (다크 프레임)
    const frameMat = pbr('frameMat'+i, 0.25, 0.22, 0.20, 0.70);
    [
      { w: 2.6, h: 0.10, d: 0.08, py: 3.5 },
      { w: 2.6, h: 0.10, d: 0.08, py: 1.9 },
      { w: 0.10, h: 1.6, d: 0.08, ox: -1.2 },
      { w: 0.10, h: 1.6, d: 0.08, ox:  1.2 },
    ].forEach(({ w, h, d, py, ox }, j) => {
      const f = M.CreateBox('wf'+i+j, { width: w, height: h, depth: d }, scene);
      f.position = new BABYLON.Vector3(px + (ox||0), py||2.7, -7.87);
      f.material = frameMat;
    });
  });

  // ── 출입구 프레임 (남쪽 벽 중앙) ─────────────────────────
  const doorMat = pbr('doorMat', 0.28, 0.22, 0.16, 0.65);
  // 문틀 좌우 기둥
  box('doorL', 0.14, 2.6, 0.22, -0.85, 1.3, 7.9, doorMat);
  box('doorR', 0.14, 2.6, 0.22,  0.85, 1.3, 7.9, doorMat);
  box('doorT', 1.84, 0.12, 0.22, 0, 2.66, 7.9, doorMat);
  // 문짝 (약간 열린 상태)
  const door = box('door', 0.06, 2.54, 1.56, -0.82, 1.27, 7.2, doorMat, true);
  door.rotation.y = Math.PI * 0.08;

  // 천장 등기구는 생략 (시야 방해) — PointLight로만 조명 처리

  // ── 조명 ──────────────────────────────────────────────────
  const mainL = new BABYLON.PointLight('main', new BABYLON.Vector3(0, 4.0, -2), scene);
  mainL.intensity = 100; mainL.range = 18;
  mainL.diffuse   = new BABYLON.Color3(0.97, 0.97, 1.0);
  mainL.specular  = new BABYLON.Color3(0.4, 0.4, 0.5);

  const backL = new BABYLON.PointLight('back', new BABYLON.Vector3(0, 4.0, 4), scene);
  backL.intensity = 75; backL.range = 14;
  backL.diffuse   = new BABYLON.Color3(0.96, 0.96, 1.0);

  const warmL = new BABYLON.PointLight('warm', new BABYLON.Vector3(-5, 3.5, -5), scene);
  warmL.intensity = 40; warmL.range = 10;
  warmL.diffuse   = new BABYLON.Color3(1.0, 0.85, 0.60);

  // ── 부장 책상 (북쪽 벽 기준, 크고 권위있게) ─────────────
  const deskMat  = pbr('deskMat',  0.34, 0.22, 0.10, 0.55);
  const deskDark = pbr('deskDark', 0.22, 0.14, 0.06, 0.60);

  // 상판 (L자형: 메인 + 사이드)
  const dMain = box('deskMain', 3.2, 0.08, 1.3, 0, 0.86, -5.9, deskMat, true);
  const dSide = box('deskSide', 1.2, 0.08, 0.9, -1.6, 0.86, -5.05, deskMat, true);
  // 다리
  [[-1.45,-6.5],[1.45,-6.5],[-1.45,-5.3],[1.45,-5.3]].forEach(([lx,lz],i) =>
    box('dleg'+i, 0.09, 0.86, 0.09, lx, 0.43, lz, deskDark));
  // 서랍 유닛
  box('drawer', 0.55, 0.72, 1.1, 1.2, 0.36, -5.9, deskDark, true);
  // 서류함 (책상 위)
  box('docBox', 0.30, 0.22, 0.38, 0.8, 0.99, -5.9, pbr('docMat',0.28,0.40,0.62,0.5));
  // 서류 더미
  box('papers', 0.55, 0.03, 0.42, -0.5, 0.90, -5.8, pbr('paperMat',0.92,0.90,0.84,0.98));
  // 모니터
  box('monBase', 0.30, 0.04, 0.22,  0.2, 0.90, -5.85, deskDark);
  box('monArm',  0.05, 0.32, 0.05,  0.2, 1.06, -5.80, deskDark);
  box('monScr',  0.80, 0.50, 0.04,  0.2, 1.47, -5.78, pbr('scrMat',0.06,0.08,0.12,0.2,0.4));
  // 전화기
  box('phone', 0.22, 0.06, 0.18, -0.8, 0.92, -5.65, pbr('phoneMat',0.15,0.14,0.13,0.6));
  // 이름패
  box('nameTag', 0.28, 0.04, 0.10, 0, 0.90, -5.28, pbr('tagMat',0.88,0.80,0.52,0.4,0.2));

  // 부장 의자 (고급 회전의자)
  const chairMat = pbr('chairMat', 0.08, 0.08, 0.10, 0.70);
  box('bossChairSeat', 0.62, 0.08, 0.60, 0, 0.56, -5.3, chairMat, true);
  box('bossChairBack', 0.62, 0.72, 0.08, 0, 0.96, -5.56, chairMat, true);
  box('bossChairArm1', 0.06, 0.14, 0.50, -0.28, 0.70, -5.3, chairMat);
  box('bossChairArm2', 0.06, 0.14, 0.50,  0.28, 0.70, -5.3, chairMat);
  box('bossChairPole', 0.07, 0.48, 0.07, 0, 0.28, -5.3, pbr('poleMat',0.60,0.60,0.60,0.3,0.7));

  // 방문자 의자 2개 (책상 앞, 책상 쪽을 바라보도록)
  // 등받이를 남쪽(z=-3.98)에 배치 → 착석자가 북쪽(책상 방향)을 바라봄
  const vChairMat = pbr('vChairMat', 0.55, 0.42, 0.30, 0.75);
  [-0.8, 0.8].forEach((cx, i) => {
    box('vSeat'+i,  0.52, 0.06, 0.50, cx, 0.48, -4.2,  vChairMat, true);
    box('vBack'+i,  0.52, 0.55, 0.06, cx, 0.78, -3.98, vChairMat, true);  // 등받이 남쪽
    box('vLeg1_'+i, 0.05, 0.48, 0.05, cx-0.22, 0.24, -3.96, vChairMat);
    box('vLeg2_'+i, 0.05, 0.48, 0.05, cx+0.22, 0.24, -3.96, vChairMat);
    box('vLeg3_'+i, 0.05, 0.48, 0.05, cx-0.22, 0.24, -4.44, vChairMat);
    box('vLeg4_'+i, 0.05, 0.48, 0.05, cx+0.22, 0.24, -4.44, vChairMat);
  });

  // ── 서류 캐비닛 (서쪽 벽) ────────────────────────────────
  const cabMat  = pbr('cabMat',  0.62, 0.64, 0.65, 0.55, 0.15);
  const cabDark = pbr('cabDark', 0.30, 0.31, 0.32, 0.60, 0.20);
  [-4.5, -2.8, -1.1].forEach((pz, i) => {
    box('cab'+i,      0.55, 1.32, 0.50, -9.67, 0.66, pz, cabMat, true);
    box('cabTop'+i,   0.56, 0.04, 0.52, -9.67, 1.34, pz, cabDark);
    // 서랍 손잡이 ×2
    [0.38, -0.10].forEach((oy, j) =>
      box('cabH'+i+'_'+j, 0.22, 0.03, 0.04, -9.40, 0.66+oy, pz, pbr('hMat',0.80,0.80,0.80,0.3,0.6)));
  });
  // 캐비닛 위 안전 서류 바인더들
  [-4.5, -2.8].forEach((pz, i) => {
    [[0.60,0.10,0.10],[0.10,0.60,0.10],[0.10,0.10,0.60]].forEach(([r,g,b], j) =>
      box('binder'+i+'_'+j, 0.08, 0.28, 0.38, -9.65+j*0.00, 1.52, pz+j*0.10,
          pbr('bMat'+i+j, r, g, b, 0.85)));
  });

  // ── 책꽂이 (동쪽 벽) ──────────────────────────────────────
  const shelfMat = pbr('shelfMat', 0.42, 0.30, 0.16, 0.72);
  box('shelf',    0.36, 2.20, 2.0, 9.82, 1.10, -5.5, shelfMat, true);
  box('shelfT',   0.36, 0.04, 2.0, 9.82, 2.22, -5.5, shelfMat);
  // 책들 (색깔별)
  [[0.70,0.15,0.12],[0.12,0.35,0.65],[0.82,0.72,0.18],[0.15,0.45,0.20],[0.55,0.30,0.60]]
    .forEach(([r,g,b], i) =>
      box('book'+i, 0.06, 0.30, 0.18+i*0.02, 9.65, 0.25+i*0.36, -5.5,
          pbr('bookMat'+i, r, g, b, 0.88)));

  // ── 안전 공지 포스터 (동쪽 벽) ───────────────────────────
  box('posterBg', 0.04, 1.0, 0.72, 9.88, 2.8, -2.0, pbr('pBg',0.96,0.96,0.90,0.98));
  box('posterRed',0.03, 0.22, 0.62, 9.87, 3.1, -2.0, pbr('pRed',0.82,0.12,0.12,0.95));
  box('posterTxt',0.03, 0.08, 0.50, 9.87, 2.8, -2.0, pbr('pTxt',0.20,0.20,0.20,0.98));
  // 안전 마크 (노란 삼각형 느낌)
  box('posterYel',0.03, 0.22, 0.22, 9.87, 2.5, -2.0, pbr('pYel',0.95,0.82,0.10,0.95));

  // ── 화이트보드 (남쪽 벽) ─────────────────────────────────
  box('wbBg',  0.05, 1.5, 3.0, -4.0, 2.6, 7.88, pbr('wbMat', 0.96, 0.97, 0.97, 0.95));
  box('wbFrm', 0.04, 1.6, 3.1, -4.0, 2.6, 7.89, pbr('wbFrm', 0.38, 0.35, 0.32, 0.55, 0.3));
  // 공정표 선들 (화이트보드 위 내용)
  [[0.6,2.5],[0.3,2.3],[0.5,2.1],[0.4,1.9]].forEach(([w,py],i) =>
    box('wbLine'+i, 0.03, 0.03, w, -4.0, py, 7.87, pbr('wbL'+i, 0.20+i*0.1, 0.40, 0.65, 0.98)));
  // 화이트보드 선반 (마커 트레이)
  box('wbTray', 0.06, 0.06, 3.0, -4.0, 1.86, 7.86, pbr('wbT',0.38,0.35,0.32,0.55,0.3));

  // ── 회의용 사이드 테이블 (중앙) ──────────────────────────
  const tblMat = pbr('tblMat', 0.42, 0.30, 0.14, 0.65);
  box('coffeeTop', 1.4, 0.06, 0.80, -3.5, 0.56, 1.0, tblMat, true);
  [[-0.55,-0.30],[0.55,-0.30],[-0.55,0.30],[0.55,0.30]].forEach(([lx,lz],i) =>
    box('cLeg'+i, 0.06, 0.56, 0.06, -3.5+lx, 0.28, 1.0+lz, tblMat));
  // 테이블 위: 헬멧과 서류
  box('helmut', 0.36, 0.24, 0.36, -3.5, 0.74, 0.9,
    pbr('helMat', 0.95, 0.82, 0.10, 0.55));  // 노란 안전모
  box('helVisor',0.38, 0.10, 0.10, -3.5, 0.78, 0.70, pbr('visMat',0.85,0.72,0.08,0.45));

  // ── 코트걸이 (출입구 옆) ─────────────────────────────────
  box('coatBase', 0.30, 0.04, 0.30,  3.5, 0.02, 6.5, pbr('ctMat',0.25,0.20,0.16,0.80));
  box('coatPole', 0.05, 1.80, 0.05,  3.5, 0.92, 6.5, pbr('ctMat2',0.35,0.28,0.20,0.70));
  box('coatArm',  0.60, 0.04, 0.04,  3.5, 1.80, 6.5, pbr('ctMat3',0.35,0.28,0.20,0.70));
  // 걸린 조끼 (형광 주황)
  box('vest', 0.28, 0.48, 0.08, 3.5, 1.60, 6.5,
    pbr('vestMat', 0.95, 0.46, 0.08, 0.85));

  // ── 소화기 (출입구 옆 동쪽) ──────────────────────────────
  const extBase = M.CreateCylinder('extCyl', { height: 0.56, diameter: 0.16, tessellation: 12 }, scene);
  extBase.position = new BABYLON.Vector3(8.5, 0.28, 6.8);
  extBase.material = pbr('extMat', 0.75, 0.08, 0.06, 0.65);
  sg.addShadowCaster(extBase);

  // ── 플레이어 캡슐 (라임, 남쪽 출발) ──────────────────────
  const player = M.CreateCapsule('player',
    { radius: 0.32, height: 1.7, tessellation: 14 }, scene);
  player.position = new BABYLON.Vector3(0, 0.85, 5.5);  // 출입구 근처에서 출발
  player.receiveShadows = true;
  sg.addShadowCaster(player);
  player.material = pbr('playerMat', 0.55, 0.78, 0.24, 0.55, 0.1);
  player.material.alpha            = 0.72;
  player.material.transparencyMode = 2;
  GAME.player = player;

  // ── 命 수위 메시 ─────────────────────────────────────────
  const waterFill = M.CreateCapsule('playerWater',
    { radius: 0.28, height: 1.58, tessellation: 14 }, scene);
  waterFill.parent       = player;
  waterFill.position     = BABYLON.Vector3.Zero();
  waterFill.isPickable   = false;
  waterFill.isVisible    = false;

  const waterMat = new BABYLON.PBRMaterial('waterFillMat', scene);
  waterMat.albedoColor      = new BABYLON.Color3(0.08, 0.42, 0.92);
  waterMat.emissiveColor    = new BABYLON.Color3(0.00, 0.22, 0.60);
  waterMat.roughness        = 0.05;
  waterMat.metallic         = 0;
  waterMat.alpha            = 0.82;
  waterMat.transparencyMode = 2;
  waterMat.disableDepthWrite = true;
  waterFill.renderingGroupId = 1;
  waterFill.material = waterMat;
  GAME.waterMesh = waterFill;

  waterFill.onBeforeRenderObservable.add(() => {
    const lw      = GAME.state.lifeWater;
    const wpos    = player.getAbsolutePosition();
    const bottomY = wpos.y - 0.85;
    const clipY   = bottomY + 1.7 * Math.min(lw, 100) / 100;
    scene.clipPlane = new BABYLON.Plane(0, 1, 0, -clipY);
  });
  waterFill.onAfterRenderObservable.add(() => { scene.clipPlane = null; });

  // ── 박 부장 NPC (책상 뒤) ────────────────────────────────
  const npc = M.CreateCapsule('npcBoss',
    { radius: 0.32, height: 1.7, tessellation: 14 }, scene);
  npc.position = new BABYLON.Vector3(0, 0.85, -5.3);  // 책상 뒤에 서 있음
  npc.receiveShadows = true;
  sg.addShadowCaster(npc);
  npc.material = pbr('npcMat', 0.20, 0.38, 0.65, 0.60);
  GAME.npcBoss = npc;

  // 카메라: 방 전체가 보이도록 뒤쪽에서 바라봄
  GAME.camera.setTarget(new BABYLON.Vector3(0, 1.2, 0));
  GAME.camera.alpha  = -Math.PI / 2;
  GAME.camera.beta   = Math.PI / 3.2;
  GAME.camera.radius = 12;
}

/* ─── 씬 전환: 사무소 → 건설 현장 ──────────────────────── */
function exitToSite() {
  if (GAME.currentScene !== 'office') return;
  GAME.currentScene = 'transitioning';
  if (typeof PLAYER !== 'undefined') PLAYER.locked = true;

  const fade = document.getElementById('scene-fade');
  if (fade) fade.classList.add('in');

  setTimeout(() => {
    _disposeOffice();
    _buildSiteScene(GAME.scene);
    GAME.currentScene = 'site';

    GAME.player.position = new BABYLON.Vector3(0, 0.85, 9);

    // NPC 팀원 현장으로 이동
    const sitePos = [[-4,0.85,14],[4,0.85,16],[0,0.85,20],[2,0.85,11]];
    if (typeof NPCS !== 'undefined') {
      NPCS.forEach((npc, i) => {
        if (npc.mesh && sitePos[i]) {
          npc.mesh.position = new BABYLON.Vector3(sitePos[i][0], sitePos[i][1], sitePos[i][2]);
        }
      });
    }

    setTimeout(() => {
      if (fade) fade.classList.remove('in');
      if (typeof PLAYER !== 'undefined') PLAYER.locked = false;

      // 첫 현장 진입 시 사전조사 자동 시작
      if (typeof PHASE !== 'undefined' && !PHASE.flags.surveyTriggered) {
        PHASE.flags.surveyTriggered = true;
        setTimeout(() => {
          if (typeof _startSurveyDialog === 'function') _startSurveyDialog();
        }, 600);
      }
    }, 450);
  }, 450);
}

function _disposeOffice() {
  GAME.officeMeshes.forEach(m => { try { m.dispose(); } catch(e) {} });
  GAME.officeLights.forEach(l => { try { l.dispose(); } catch(e) {} });
  GAME.officeMeshes = [];
  GAME.officeLights = [];
  GAME.walls = [];
  GAME.npcBoss = null;
  const ip = document.getElementById('interact-prompt');
  if (ip) ip.style.display = 'none';
}

/* ─── 건설 현장 씬 (빈 부지) ─────────────────────────────── */
function _buildSiteScene(scene) {
  const M  = BABYLON.MeshBuilder;
  const sg = GAME.shadowGen;
  GAME.siteMeshes = [];
  const _tr = m => { GAME.siteMeshes.push(m); return m; };

  function pbr(name, r, g, b, rough, metal) {
    const m = new BABYLON.PBRMaterial('site_' + name, scene);
    m.albedoColor = new BABYLON.Color3(r, g, b);
    m.roughness   = rough ?? 0.85;
    m.metallic    = metal ?? 0;
    return m;
  }
  function box(name, w, h, d, px, py, pz, mat, sh) {
    const mesh = M.CreateBox('s_' + name, {width:w, height:h, depth:d}, scene);
    mesh.position = new BABYLON.Vector3(px, py, pz);
    mesh.material = mat;
    mesh.receiveShadows = true;
    if (sh) sg.addShadowCaster(mesh);
    return _tr(mesh);
  }

  // 하늘 & 조명
  scene.clearColor = new BABYLON.Color4(0.53, 0.81, 0.98, 1);
  const hemi = scene.getLightByName('hemi');
  if (hemi) { hemi.intensity = 0.55; hemi.diffuse = new BABYLON.Color3(0.82, 0.90, 1.0); }
  const sun  = scene.getLightByName('sun');
  if (sun)  { sun.intensity  = 1.3; }

  // 빈 지면
  const gnd = M.CreateGround('siteGround', {width:120, height:120}, scene);
  gnd.material = pbr('gnd', 0.52, 0.44, 0.33, 0.96, 0.01);
  gnd.receiveShadows = true;
  _tr(gnd);

  // ── 현장사무소 외부 (컨테이너형 prefab, 8×5×3m) ──────────
  const wC  = pbr('ow',  0.88, 0.86, 0.82, 0.82, 0.02);  // 외벽 베이지
  const frC = pbr('ofr', 0.28, 0.28, 0.30, 0.55, 0.45);  // 금속 프레임
  const roC = pbr('oor', 0.26, 0.26, 0.28, 0.70, 0.15);  // 지붕
  const ccC = pbr('occ', 0.60, 0.58, 0.55, 0.92, 0.04);  // 기초/콘크리트
  const dMat = pbr('odr', 0.30, 0.22, 0.14, 0.62);        // 문

  // 기초 플랫폼
  box('fnd', 8.4, 0.24, 5.4, 0, 0.12, 5.5, ccC, false);

  // 남쪽 외벽 (문 구멍 1.2m)
  //   왼쪽 패널: x -4 ~ -0.6 (3.4m), 오른쪽: x 0.6 ~ 4 (3.4m)
  box('swL', 3.4, 2.76, 0.20, -2.3, 1.62, 8.0, wC, false);
  box('swR', 3.4, 2.76, 0.20,  2.3, 1.62, 8.0, wC, false);
  box('swT', 1.2, 0.76, 0.20,  0.0, 2.62, 8.0, wC, false);  // 문 위 인방

  // 동·서·북 벽
  box('ewE', 0.20, 2.76, 5.0,  4.0, 1.62, 5.5, wC, false);
  box('ewW', 0.20, 2.76, 5.0, -4.0, 1.62, 5.5, wC, false);
  box('nwN', 8.4,  2.76, 0.20,  0,  1.62, 3.0, wC, false);

  // 금속 코너 프레임 (4기둥)
  [[-4,8],[ 4,8],[-4,3],[ 4,3]].forEach(([x,z],i) =>
    box('fr'+i, 0.14, 3.10, 0.14, x, 1.79, z, frC, false));
  // 상단 수평 프레임
  box('frTopS', 8.4, 0.10, 0.12, 0, 3.05, 8.0, frC, false);
  box('frTopN', 8.4, 0.10, 0.12, 0, 3.05, 3.0, frC, false);
  // 하단 프레임 (크리트 위)
  box('frBotS', 8.4, 0.10, 0.12, 0, 0.30, 8.0, frC, false);

  // 지붕 (약간 돌출)
  box('roof',  8.6, 0.22, 5.4, 0, 3.16, 5.5, roC, false);
  box('eave',  8.6, 0.08, 0.4, 0, 3.05, 8.22, roC, false);  // 처마

  // 창문 (남쪽 좌우 패널)
  const winM = new BABYLON.StandardMaterial('site_win', scene);
  winM.diffuseColor  = new BABYLON.Color3(0.52, 0.70, 0.88);
  winM.emissiveColor = new BABYLON.Color3(0.10, 0.18, 0.28);
  winM.alpha = 0.75;
  [[-2.3, 1.95], [2.3, 1.95]].forEach(([x, y], i) => {
    const w = M.CreateBox('s_win'+i, {width:1.05, height:0.65, depth:0.06}, scene);
    w.position = new BABYLON.Vector3(x, y, 7.92); w.material = winM; _tr(w);
    // 창틀
    box('wfr'+i, 1.17, 0.77, 0.04, x, y, 7.88, frC, false);
  });

  // 문틀
  box('dfrL', 0.10, 2.30, 0.22, -0.65, 1.15, 8.0, dMat, false);
  box('dfrR', 0.10, 2.30, 0.22,  0.65, 1.15, 8.0, dMat, false);
  box('dfrT', 1.40, 0.10, 0.22,  0.00, 2.35, 8.0, dMat, false);
  // 문짝 (살짝 열림)
  const door = M.CreateBox('s_door', {width:0.05, height:2.28, depth:1.14}, scene);
  door.position = new BABYLON.Vector3(-0.60, 1.38, 7.46);
  door.rotation.y = Math.PI * 0.10;
  door.material = dMat; _tr(door);

  // 계단 3단 (z+방향, 바깥으로 내려감)
  [[0.26, 0.13, 8.18], [0.17, 0.085, 8.50], [0.08, 0.04, 8.82]].forEach(([h,cy,pz],i) =>
    box('stp'+i, 1.5, h, 0.32, 0, cy, pz, ccC, false));

  // 안내 간판 (노랑)
  box('sign',   2.2, 0.38, 0.06, 0, 3.54, 7.96, pbr('sgn', 0.96, 0.78, 0.10, 0.82), false);
  box('signFr', 2.34, 0.50, 0.04, 0, 3.54, 7.94, frC, false);

  // 에어컨 실외기 (동쪽 벽 중간)
  box('ac', 0.56, 0.40, 0.28, 4.12, 1.70, 6.2, pbr('oac', 0.40, 0.40, 0.42, 0.55, 0.22), false);

  // 소화기 (문 왼쪽)
  const ext = M.CreateCylinder('s_ext', {height:0.50, diameter:0.14, tessellation:10}, scene);
  ext.position = new BABYLON.Vector3(-1.2, 0.49, 8.4);
  ext.material = pbr('oex', 0.80, 0.07, 0.06, 0.65); _tr(ext);

  // 카메라
  GAME.camera.setTarget(new BABYLON.Vector3(0, 1.2, 15));
  GAME.camera.alpha  = -Math.PI / 2;
  GAME.camera.beta   = Math.PI / 3;
  GAME.camera.radius = 20;
  GAME.camera.upperRadiusLimit = 60;
}

/* ─── 씬 전환: 건설 현장 → 사무소 ──────────────────────── */
function enterOffice() {
  if (GAME.currentScene !== 'site') return;
  GAME.currentScene = 'transitioning';
  if (typeof PLAYER !== 'undefined') PLAYER.locked = true;

  const fade = document.getElementById('scene-fade');
  if (fade) fade.classList.add('in');

  setTimeout(() => {
    // 사이트 정리
    GAME.siteMeshes.forEach(m => { try { m.dispose(); } catch(e) {} });
    GAME.siteMeshes = [];
    if (typeof HAZARD_ZONES !== 'undefined') HAZARD_ZONES.length = 0;

    // 잔상 방지: 기존 플레이어·워터 메시 명시적 폐기
    if (GAME.player)    { try { GAME.player.dispose(false); }    catch(e) {} GAME.player    = null; }
    if (GAME.waterMesh) { try { GAME.waterMesh.dispose(false); } catch(e) {} GAME.waterMesh = null; }

    // 조명·하늘 복구
    const scene = GAME.scene;
    scene.clearColor = new BABYLON.Color4(0.051, 0.106, 0.165, 1);
    const hemi = scene.getLightByName('hemi');
    if (hemi) { hemi.intensity = 0.30; hemi.diffuse = new BABYLON.Color3(0.65, 0.70, 0.80); }
    const sun = scene.getLightByName('sun');
    if (sun) { sun.intensity = 0.8; }

    // 사무소 재건
    const _preMeshIds  = new Set(scene.meshes.map(m => m.uniqueId));
    const _preLightIds = new Set(scene.lights.map(l => l.uniqueId));
    _buildOfficeScene(scene);
    GAME.officeMeshes = scene.meshes.filter(m => !_preMeshIds.has(m.uniqueId) && m !== GAME.player && m !== GAME.waterMesh);
    GAME.officeLights = scene.lights.filter(l => !_preLightIds.has(l.uniqueId));
    GAME.currentScene = 'office';

    // PLAYER.mesh를 새 플레이어 메시로 갱신
    if (typeof PLAYER !== 'undefined') PLAYER.mesh = GAME.player;

    GAME.player.position = new BABYLON.Vector3(0, 0.85, 6.5);

    // NPC 복귀
    const offPos = [[-4.5,0.85,0.5],[4.5,0.85,0.5],[-1.5,0.85,3.5],[1.5,0.85,3.5]];
    if (typeof NPCS !== 'undefined') {
      NPCS.forEach((npc, i) => {
        if (npc.mesh && offPos[i])
          npc.mesh.position = new BABYLON.Vector3(offPos[i][0], offPos[i][1], offPos[i][2]);
      });
    }

    setTimeout(() => {
      if (fade) fade.classList.remove('in');
      if (typeof PLAYER !== 'undefined') PLAYER.locked = false;
    }, 450);
  }, 450);
}
