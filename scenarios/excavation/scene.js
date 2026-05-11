// S — 토공사 Scene (Earthworks)
// 부지·굴착기·흙더미·흙막이 H-pile·안전난간·매설물 표시기 등

function buildExcavationScene() {
  const scene = GAME.scene;
  GAME.colliders = [];

  // ── Sky + Fog ──────────────────────────────────────────
  scene.background = new THREE.Color(0x8AB2D0);
  scene.fog = new THREE.FogExp2(0x8AB2D0, 0.006);

  // ── Lighting ───────────────────────────────────────────
  const hemi = new THREE.HemisphereLight(0xB8D4F0, 0x8B7355, 0.6);
  scene.add(hemi);

  const ambient = new THREE.AmbientLight(0xffffff, 0.18);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xFFEAB8, 1.4);
  sun.position.set(16, 22, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left   = -45;
  sun.shadow.camera.right  =  45;
  sun.shadow.camera.top    =  45;
  sun.shadow.camera.bottom = -45;
  sun.shadow.camera.far    = 130;
  sun.shadow.bias = -0.0003;
  scene.add(sun);
  GAME._sun = sun;

  // ── Ground (대지) ──────────────────────────────────────
  const groundMat = new THREE.MeshLambertMaterial({ color: 0x8B7355 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  _addExcavGroundGrid(scene);

  // ── 굴착 구덩이 (Pit) ──────────────────────────────────
  _buildPit(scene);

  // ── 굴착기 (Excavator placeholder) ─────────────────────
  _buildExcavator(scene);

  // ── 흙더미 (Soil piles — 굴착으로 나온 토사) ───────────
  _buildSoilPiles(scene);

  // ── 흙막이 가시설 (H-pile + 토류판) ────────────────────
  _buildShoring(scene);

  // ── 안전난간 (Edge guardrails) ─────────────────────────
  _buildEdgeGuardrails(scene);

  // ── 매설물 표시기 — 처음엔 안 보임 (탐지기로 발견 시 표시) ───
  // _buildUtilityMarkers(scene);  // disabled — survey_minigame 가 깃발·점선으로 가시화

  // ── 작업반경 표시 (Excavator swing radius) ─────────────
  _buildSwingRadius(scene);

  // ── 사무실 (재사용 — 작업계획서 위치) ────────────────
  _buildExcavOffice(scene);

  // ── 가설울타리 + 표지 ──────────────────────────────────
  _buildExcavHoarding(scene);

  // ── 배경 건물 ──────────────────────────────────────────
  _buildExcavBackground(scene);
}

function _addExcavGroundGrid(scene) {
  const mat = new THREE.LineBasicMaterial({ color: 0x7A6850, transparent: true, opacity: 0.2 });
  const step = 5, half = 35;
  const points = [];
  for (let i = -half; i <= half; i += step) {
    points.push(new THREE.Vector3(i, 0.01, -half), new THREE.Vector3(i, 0.01, half));
    points.push(new THREE.Vector3(-half, 0.01, i), new THREE.Vector3(half, 0.01, i));
  }
  scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points), mat));
}

// 굴착 구덩이 (음각) — 바닥을 -2m 로 보이게
function _buildPit(scene) {
  const pitDepth = 2.0;
  const cx = 0, cz = -17;
  const w = 12, d = 12;

  // 바닥 (어두운 흙)
  const floorMat = new THREE.MeshLambertMaterial({ color: 0x5C4A30 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(cx, -pitDepth, cz);
  floor.receiveShadow = true;
  scene.add(floor);

  // 4개 측면 (사면 = 구덩이 벽)
  const sideMat = new THREE.MeshLambertMaterial({ color: 0x6B5238 });
  const sides = [
    { w: w, h: pitDepth, d: 0.1, x: cx,        y: -pitDepth/2, z: cz - d/2 },
    { w: w, h: pitDepth, d: 0.1, x: cx,        y: -pitDepth/2, z: cz + d/2 },
    { w: 0.1, h: pitDepth, d: d, x: cx - w/2,  y: -pitDepth/2, z: cz },
    { w: 0.1, h: pitDepth, d: d, x: cx + w/2,  y: -pitDepth/2, z: cz },
  ];
  sides.forEach(s => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(s.w, s.h, s.d), sideMat);
    m.position.set(s.x, s.y, s.z);
    m.receiveShadow = true;
    scene.add(m);
  });
}

// 굴착기 (단순화된 placeholder — 운전실 + 트랙 + 붐 + 버킷)
function _buildExcavator(scene) {
  const yellow = new THREE.MeshLambertMaterial({ color: 0xCFA418 });
  const dark   = new THREE.MeshLambertMaterial({ color: 0x2A2620 });
  const grey   = new THREE.MeshLambertMaterial({ color: 0x6E6A60 });

  const group = new THREE.Group();
  group.position.set(-13, 0, -8);
  group.rotation.y = -Math.PI / 6;

  // 트랙 좌·우
  [-0.8, 0.8].forEach(dx => {
    const track = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 3.4), dark);
    track.position.set(dx, 0.3, 0);
    track.castShadow = true;
    group.add(track);
  });

  // 상부 회전체
  const upper = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 2.6), yellow);
  upper.position.set(0, 1.2, -0.2);
  upper.castShadow = true;
  group.add(upper);

  // 운전실
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 1.2), yellow);
  cab.position.set(-0.5, 2.5, 0.4);
  cab.castShadow = true;
  group.add(cab);
  const win = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.0), new THREE.MeshLambertMaterial({ color: 0x7BAABB, transparent: true, opacity: 0.65 }));
  win.position.set(-0.5, 2.5, 1.01);
  group.add(win);

  // 카운터웨이트
  const cw = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.0, 0.8), dark);
  cw.position.set(0, 1.4, -1.6);
  group.add(cw);

  // 붐 (1단)
  const boom1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 4.2), yellow);
  boom1.position.set(0.4, 2.6, 2.0);
  boom1.rotation.x = -0.5;
  boom1.castShadow = true;
  group.add(boom1);

  // 붐 (2단)
  const boom2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 3.6), yellow);
  boom2.position.set(0.4, 1.5, 4.1);
  boom2.rotation.x = 0.7;
  group.add(boom2);

  // 버킷
  const bucket = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.8, 0.9), grey);
  bucket.position.set(0.4, 0.4, 5.6);
  bucket.castShadow = true;
  group.add(bucket);
  // 버킷 이빨
  for (let i = -3; i <= 3; i++) {
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 4), dark);
    tooth.position.set(0.4 + i * 0.12, 0.05, 5.95);
    tooth.rotation.x = Math.PI / 2;
    group.add(tooth);
  }

  scene.add(group);
  GAME._excavator = group;
  GAME.colliders.push(upper, cab, cw);
}

// 흙더미 (굴착으로 나온 흙 보관)
function _buildSoilPiles(scene) {
  const soilMat = new THREE.MeshLambertMaterial({ color: 0x7A5A38 });
  const piles = [
    { x: 14, z: -14, r: 2.2 },
    { x: 16, z: -10, r: 1.8 },
    { x: 13, z: -7,  r: 1.5 },
  ];
  piles.forEach(p => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(p.r, p.r * 0.7, 12), soilMat);
    cone.position.set(p.x, p.r * 0.35, p.z);
    cone.castShadow = true;
    cone.receiveShadow = true;
    scene.add(cone);
  });
}

// 흙막이 가시설 — H-pile + 토류판
function _buildShoring(scene) {
  const steelMat = new THREE.MeshLambertMaterial({ color: 0x4A4640 });
  const woodMat  = new THREE.MeshLambertMaterial({ color: 0x8A6E3A });

  const cx = 0, cz = -17, w = 12, d = 12;

  // H-pile 4개 변에 일정 간격으로 박혀있음
  const hPileGeo = new THREE.BoxGeometry(0.22, 3.5, 0.22);
  // 앞·뒤 변 (x 방향)
  for (let x = -w/2; x <= w/2; x += 2) {
    [-d/2, d/2].forEach(dz => {
      const p = new THREE.Mesh(hPileGeo, steelMat);
      p.position.set(x, 1.0, cz + dz);
      p.castShadow = true;
      scene.add(p);
    });
  }
  // 좌·우 변 (z 방향)
  for (let z = -d/2; z <= d/2; z += 2) {
    [-w/2, w/2].forEach(dx => {
      const p = new THREE.Mesh(hPileGeo, steelMat);
      p.position.set(dx, 1.0, cz + z);
      p.castShadow = true;
      scene.add(p);
    });
  }

  // 토류판 (수평 보드, H-pile 사이에 끼움) — 4방향 띠
  const boardSets = [
    { l: w, vertical: 0, x: 0, z: cz - d/2 + 0.12 },
    { l: w, vertical: 0, x: 0, z: cz + d/2 - 0.12 },
    { l: d, vertical: 1, x: -w/2 + 0.12, z: cz },
    { l: d, vertical: 1, x:  w/2 - 0.12, z: cz },
  ];
  boardSets.forEach(b => {
    for (let y = -1.8; y < 0; y += 0.35) {
      const geo = b.vertical
        ? new THREE.BoxGeometry(0.05, 0.3, b.l)
        : new THREE.BoxGeometry(b.l, 0.3, 0.05);
      const board = new THREE.Mesh(geo, woodMat);
      board.position.set(b.x, y, b.z);
      scene.add(board);
    }
  });
}

// 안전난간 (굴착단부 추락방지)
function _buildEdgeGuardrails(scene) {
  const postMat = new THREE.MeshLambertMaterial({ color: 0xBB4010 });
  const railMat = new THREE.LineBasicMaterial({ color: 0xD4B018 });

  const cx = 0, cz = -17, w = 13, d = 13; // 굴착 외곽 + 약간 외부

  // 4개 모서리 + 중간 포스트
  const corners = [];
  for (let x = -w/2; x <= w/2; x += 2.2) {
    corners.push([x, cz - d/2]);
    corners.push([x, cz + d/2]);
  }
  for (let z = -d/2 + 2.2; z < d/2; z += 2.2) {
    corners.push([-w/2, cz + z]);
    corners.push([ w/2, cz + z]);
  }

  corners.forEach(([px, pz]) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.1, 10), postMat);
    post.position.set(px, 0.55, pz);
    scene.add(post);
  });

  // 상부·중간 안전테이프
  [0.95, 0.55].forEach(ty => {
    const pts = [];
    // 4변 둘러서
    pts.push(new THREE.Vector3(-w/2, ty, cz - d/2));
    pts.push(new THREE.Vector3( w/2, ty, cz - d/2));
    pts.push(new THREE.Vector3( w/2, ty, cz + d/2));
    pts.push(new THREE.Vector3(-w/2, ty, cz + d/2));
    pts.push(new THREE.Vector3(-w/2, ty, cz - d/2));
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    scene.add(new THREE.Line(geo, railMat));
  });
}

// 매설물 표시기 (지상에 가스/전기 도면 위치 마커)
function _buildUtilityMarkers(scene) {
  const gasMat = new THREE.MeshBasicMaterial({ color: 0xFFCC00, side: THREE.DoubleSide });
  const elMat  = new THREE.MeshBasicMaterial({ color: 0xCC2222, side: THREE.DoubleSide });

  // 가스관 위치 (점선 표시)
  for (let x = -16; x < 16; x += 1.5) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.18), gasMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.025, -5);
    scene.add(m);
  }
  // 전기 매설 위치
  for (let z = -25; z < -2; z += 1.5) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.9), elMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(-18, 0.025, z);
    scene.add(m);
  }
}

// 굴착기 작업반경 표시
function _buildSwingRadius(scene) {
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xFF7700, side: THREE.DoubleSide, transparent: true, opacity: 0.55,
  });
  const areaMat = new THREE.MeshBasicMaterial({
    color: 0xFF8800, side: THREE.DoubleSide, transparent: true, opacity: 0.07,
  });
  // 굴착기 주변 6m 반경
  const cx = -13, cz = -8, R = 6;
  const ring = new THREE.Mesh(new THREE.RingGeometry(R - 0.3, R, 48), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(cx, 0.02, cz);
  scene.add(ring);
  const area = new THREE.Mesh(new THREE.CircleGeometry(R, 48), areaMat);
  area.rotation.x = -Math.PI / 2;
  area.position.set(cx, 0.018, cz);
  scene.add(area);
}

// 현장 사무실 (작업계획서 작성 위치)
function _buildExcavOffice(scene) {
  const body  = new THREE.MeshLambertMaterial({ color: 0x3A6A8A });
  const roof  = new THREE.MeshLambertMaterial({ color: 0x2C5070 });
  const winM  = new THREE.MeshLambertMaterial({ color: 0x7BAABB, transparent:true, opacity:0.7 });
  const grey  = new THREE.MeshLambertMaterial({ color: 0x888880 });

  const box = new THREE.Mesh(new THREE.BoxGeometry(6.0,2.6,2.4), body);
  box.position.set(-16, 1.3, 8); box.castShadow = true; box.receiveShadow = true;
  scene.add(box);
  const r = new THREE.Mesh(new THREE.BoxGeometry(6.2,0.12,2.6), roof);
  r.position.set(-16, 2.66, 8); scene.add(r);
  [-17.5, -15.8].forEach(x => {
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.05), winM);
    w.position.set(x, 1.7, 6.74); scene.add(w);
  });
  const step = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.25, 0.5), grey);
  step.position.set(-14.5, 0.125, 6.5); scene.add(step);

  // 책상 트리거 위치 (작업계획서 작성용 - hazards.js 에서 사용)
  GAME._excavDesk = { x: 10, y: 0, z: 2 };

  // 사무용 책상 (양중 시나리오 재사용 가능)
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x8B7355 });
  const legMat  = new THREE.MeshLambertMaterial({ color: 0x6B5335 });
  const group = new THREE.Group();
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 0.9), woodMat);
  top.position.set(0, 0.75, 0); group.add(top);
  const bodyD = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.69, 0.9), woodMat);
  bodyD.position.set(0, 0.345, 0); group.add(bodyD);
  [[-0.83,-0.38],[0.83,-0.38],[-0.83,0.38],[0.83,0.38]].forEach(([lx,lz]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.75, 0.08), legMat);
    leg.position.set(lx, 0.375, lz); group.add(leg);
  });
  group.position.set(10, 0, 2);
  scene.add(group);
  GAME.colliders.push(bodyD);
}

function _buildExcavHoarding(scene) {
  const board = new THREE.MeshLambertMaterial({ color: 0x3A6840 });
  const post  = new THREE.MeshLambertMaterial({ color: 0x3A3028 });
  const segs = [
    [-22,10,10,0],[-22,0,10,0],[-22,-10,10,0],
    [20,10,10,0],[20,0,10,0],[20,-10,10,0],
    [-10,14,10,Math.PI/2],[0,14,10,Math.PI/2],[10,14,10,Math.PI/2],
    [-10,-26,10,Math.PI/2],[0,-26,10,Math.PI/2],[10,-26,10,Math.PI/2],
  ];
  segs.forEach(([x,z,w,ry]) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(w,2.2,0.12), board);
    p.position.set(x,1.1,z); p.rotation.y = ry; p.castShadow = true;
    scene.add(p);
  });
  [[-22,14],[20,14],[20,-26],[-22,-26]].forEach(([x,z]) => {
    const ps = new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,2.4,10), post);
    ps.position.set(x,1.2,z); scene.add(ps);
  });
}

function _buildExcavBackground(scene) {
  const bldgData = [
    [0x808890, -30, -30, 5, 18, 4],
    [0x6B737C, -25, -37, 7, 12, 5],
    [0x757D85,  27, -28, 4, 22, 4],
    [0x818990,  24, -38, 6, 10, 5],
  ];
  bldgData.forEach(([color, x, , z, w, h, d]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
    m.position.set(x, h/2, z); scene.add(m);
  });
}
