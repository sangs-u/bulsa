// engine.js — BULSA v0 메인 엔진
// Three.js 씬, 카메라, 렌더러, 게임루프, 기본 건설 현장

/* ─── GAME 전역 상태 ─────────────────────────────────────── */
const GAME = {
  scene:    null,
  camera:   null,
  renderer: null,
  clock:    null,
  colliders: [],   // 플레이어 충돌 메시 목록
  npcs:      [],   // NPC 목록 (Batch 4에서 채워짐)
  state: {
    gameStarted: false,
    gameOver:    false,
    paused:      false,
    playerName:  '',
    safetyIndex: 100,   // 命 게이지 (0~100, 0이면 위험)
    lifeWater:   0,     // 수위 % (0=안전, 100=만수=사고)
  },
};

/* ─── INTERACTION 스텁 (Batch 5에서 완성) ───────────────── */
const INTERACTION = {
  popupOpen: false,
};

/* ─── 엔진 초기화 ─────────────────────────────────────────── */
(function initEngine() {

  /* 씬 */
  GAME.scene = new THREE.Scene();
  GAME.scene.background = new THREE.Color(0x87CEEB);  // 하늘색
  GAME.scene.fog = new THREE.Fog(0xB8D4E8, 40, 90);

  /* 카메라 */
  GAME.camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 200);
  GAME.camera.position.set(0, 1.7, 12);
  GAME.camera.lookAt(0, 1.7, 0);

  /* 렌더러 */
  const canvas = document.getElementById('gameCanvas');
  GAME.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  GAME.renderer.setSize(innerWidth, innerHeight);
  GAME.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  GAME.renderer.shadowMap.enabled = true;
  GAME.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  GAME.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  GAME.renderer.toneMappingExposure = 1.1;

  /* 클락 */
  GAME.clock = new THREE.Clock();

  /* 리사이즈 */
  window.addEventListener('resize', () => {
    GAME.camera.aspect = innerWidth / innerHeight;
    GAME.camera.updateProjectionMatrix();
    GAME.renderer.setSize(innerWidth, innerHeight);
  });

  /* 조명 */
  _setupLights();

  /* 기본 건설 현장 씬 */
  _buildScene();

  /* 서브시스템 초기화 */
  if (typeof initPlayer    === 'function') initPlayer();
  if (typeof initHUD       === 'function') initHUD();
  if (typeof initAccident  === 'function') initAccident();

  /* 루프 시작 */
  GAME.clock.start();
  _loop();

})();

/* ─── 조명 ───────────────────────────────────────────────── */
function _setupLights() {
  // 태양 (그림자 포함)
  const sun = new THREE.DirectionalLight(0xFFF5E0, 1.8);
  sun.position.set(20, 40, 15);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far  = 120;
  sun.shadow.camera.left = sun.shadow.camera.bottom = -35;
  sun.shadow.camera.right = sun.shadow.camera.top   =  35;
  sun.shadow.bias = -0.001;
  GAME.scene.add(sun);

  // 환경광
  GAME.scene.add(new THREE.AmbientLight(0xB0C8E0, 0.6));

  // 하늘 반사 (위쪽 파란빛)
  const sky = new THREE.HemisphereLight(0x87CEEB, 0x6B5A45, 0.4);
  GAME.scene.add(sky);
}

/* ─── 기본 건설 현장 씬 ────────────────────────────────────── */
function _buildScene() {

  /* 바닥 (콘크리트) */
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshLambertMaterial({ color: 0x9E9E9E })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  GAME.scene.add(ground);
  GAME.colliders.push(ground);

  /* 바닥 그리드선 (시공 기준선 느낌) */
  const grid = new THREE.GridHelper(80, 40, 0x888888, 0x888888);
  grid.position.y = 0.01;
  grid.material.opacity = 0.25;
  grid.material.transparent = true;
  GAME.scene.add(grid);

  /* 현장 경계 펜스 */
  _addFence();

  /* 건축 자재 더미 */
  _addMaterials();

  /* 안전 라바콘 */
  _addCones();

  /* 현장 사무소 (간이) */
  _addSiteOffice();

}

/* ─── 안전 펜스 ─────────────────────────────────────────── */
function _addFence() {
  const postMat = new THREE.MeshLambertMaterial({ color: 0xF97316 });
  const barMat  = new THREE.MeshLambertMaterial({ color: 0xF97316 });
  const postGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.2, 6);
  const barGeo  = new THREE.BoxGeometry(2.0, 0.05, 0.04);

  const positions = [];
  const R = 18;
  for (let x = -R; x <= R; x += 2) {
    positions.push([x, -R], [x, R]);
  }
  for (let z = -R + 2; z < R; z += 2) {
    positions.push([-R, z], [R, z]);
  }

  positions.forEach(([x, z]) => {
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.set(x, 0.6, z);
    post.castShadow = true;
    GAME.scene.add(post);

    const bar = new THREE.Mesh(barGeo, barMat);
    bar.position.set(x + 1, 0.9, z);
    // z축 방향 펜스는 회전
    if (Math.abs(x) === R) {
      bar.rotation.y = Math.PI / 2;
      bar.position.set(x, 0.9, z + 1);
    }
    GAME.scene.add(bar);
  });
}

/* ─── 건축 자재 더미 ─────────────────────────────────────── */
function _addMaterials() {
  // 철근 더미 (빨간 박스)
  const rebarMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
  [[6, 0, -8], [-8, 0, -6]].forEach(([x, y, z]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(3, 0.6, 1), rebarMat);
    m.position.set(x, 0.3, z);
    m.castShadow = true;
    GAME.scene.add(m);
    GAME.colliders.push(m);
  });

  // 콘크리트 블록 (회색 큐브)
  const concreteMat = new THREE.MeshLambertMaterial({ color: 0x7A7A7A });
  [[3, 0, -5], [4, 0, -5], [3, 0, -4], [-4, 0, -7]].forEach(([x, y, z]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), concreteMat);
    m.position.set(x, 0.5, z);
    m.castShadow = true;
    m.receiveShadow = true;
    GAME.scene.add(m);
    GAME.colliders.push(m);
  });

  // 목재 팔레트 (주황빛 갈색 판)
  const woodMat = new THREE.MeshLambertMaterial({ color: 0xC68642 });
  [[-5, 0, -3], [8, 0, -4]].forEach(([x, y, z]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(2, 0.15, 1.2), woodMat);
    m.position.set(x, 0.075, z);
    m.castShadow = true;
    GAME.scene.add(m);
  });
}

/* ─── 안전 라바콘 ────────────────────────────────────────── */
function _addCones() {
  const coneMat = new THREE.MeshLambertMaterial({ color: 0xFF5500 });
  const ringMat = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
  const coneGeo = new THREE.ConeGeometry(0.18, 0.45, 8);
  const ringGeo = new THREE.TorusGeometry(0.16, 0.025, 6, 16);

  const spots = [
    [2,0,2], [-2,0,2], [2,0,-2], [-2,0,-2],
    [5,0,0], [-5,0,0], [0,0,-6],
    [8,0,6], [-8,0,6],
  ];
  spots.forEach(([x, y, z]) => {
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.set(x, 0.225, z);
    GAME.scene.add(cone);

    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(x, 0.28, z);
    ring.rotation.x = Math.PI / 2;
    GAME.scene.add(ring);
  });
}

/* ─── 현장 사무소 ──────────────────────────────────────────── */
function _addSiteOffice() {
  // 컨테이너 사무소 (파란색 박스)
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x1565C0 });
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x0D47A1 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(6, 2.5, 3), bodyMat);
  body.position.set(-10, 1.25, -10);
  body.castShadow = true;
  body.receiveShadow = true;
  GAME.scene.add(body);
  GAME.colliders.push(body);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.15, 3.2), roofMat);
  roof.position.set(-10, 2.575, -10);
  GAME.scene.add(roof);

  // 문 (어두운 사각형)
  const doorMat = new THREE.MeshLambertMaterial({ color: 0x0A2E7A });
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.0, 0.05), doorMat);
  door.position.set(-9.5, 1.0, -8.48);
  GAME.scene.add(door);

  // 간판 (노란 판)
  const signMat = new THREE.MeshLambertMaterial({ color: 0xFCD34D });
  const sign = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 0.05), signMat);
  sign.position.set(-10, 2.75, -8.47);
  GAME.scene.add(sign);
}

/* ─── 게임 루프 ─────────────────────────────────────────── */
function _loop() {
  requestAnimationFrame(_loop);
  const delta = Math.min(GAME.clock.getDelta(), 0.05);

  if (GAME.state.gameStarted && !GAME.state.gameOver && !GAME.state.paused) {
    if (typeof updatePlayer  === 'function') updatePlayer(delta);
    if (typeof updateHUD     === 'function') updateHUD();
    _updateMinimap();
  }

  GAME.renderer.render(GAME.scene, GAME.camera);
}

/* ─── 미니맵 업데이트 ────────────────────────────────────── */
function _updateMinimap() {
  const canvas = document.getElementById('minimap-canvas');
  if (!canvas || typeof PLAYER === 'undefined') return;
  const ctx = canvas.getContext('2d');
  const W = canvas.clientWidth;
  const H = canvas.clientHeight;
  if (canvas.width !== W || canvas.height !== H) {
    canvas.width = W; canvas.height = H;
  }

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, W, H);

  // 펜스 경계 표시
  const scale = W / 40;  // 맵 범위 ±20 → 픽셀
  ctx.strokeStyle = 'rgba(249,115,22,0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(
    W/2 - 18 * scale, H/2 - 18 * scale,
    36 * scale, 36 * scale
  );

  // 현장 사무소
  ctx.fillStyle = 'rgba(21,101,192,0.6)';
  ctx.fillRect(W/2 + (-10 - 3) * scale, H/2 + (-10 - 1.5) * scale, 6 * scale, 3 * scale);

  // 플레이어 위치
  const px = W/2 + PLAYER.worldPos.x * scale;
  const pz = H/2 + PLAYER.worldPos.z * scale;
  ctx.fillStyle = '#F97316';
  ctx.beginPath();
  ctx.arc(px, pz, 3, 0, Math.PI * 2);
  ctx.fill();

  // 방향 화살표
  const yaw = PLAYER.euler ? PLAYER.euler.y : 0;
  ctx.strokeStyle = '#F97316';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(px, pz);
  ctx.lineTo(px - Math.sin(yaw) * 7, pz - Math.cos(yaw) * 7);
  ctx.stroke();
}
