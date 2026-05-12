// S — 기초공사 Scene (Foundation)
// 굴착 완료된 부지 + 철근망 + 거푸집 + 펌프카 + 사무실

function buildFoundationScene() {
  const scene = GAME.scene;
  const _unified = !!GAME.unifiedMode;
  if (!_unified) {
    GAME.colliders = [];

    // ── Sky + Fog ──────────────────────────────────────────
    scene.background = new THREE.Color(0x9CB8D0);
    scene.fog = new THREE.FogExp2(0x9CB8D0, 0.006);

    // ── Lighting ───────────────────────────────────────────
    scene.add(new THREE.HemisphereLight(0xB8D4F0, 0x8B7355, 0.6));
    scene.add(new THREE.AmbientLight(0xffffff, 0.18));
    const sun = new THREE.DirectionalLight(0xFFEAB8, 1.4);
    sun.position.set(16, 22, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -45; sun.shadow.camera.right = 45;
    sun.shadow.camera.top = 45; sun.shadow.camera.bottom = -45;
    sun.shadow.camera.far = 130;
    scene.add(sun);
    GAME._sun = sun;

    // ── Ground ────────────────────────────────────────────
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x6E6E66 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
  }

  // ── 굴착 완료 부지 (음각 → 매트 기초 자리) ────────────
  _buildExcavatedPit(scene);

  // ── 기초 거푸집 + 철근망 ──────────────────────────────
  _buildFoundationForm(scene);

  // ── 콘크리트 펌프카 ───────────────────────────────────
  _buildPumpTruck(scene);

  // ── 자재 적치 ─────────────────────────────────────────
  _buildFoundationMaterials(scene);

  // ── 사무실 (양중과 동일 형태) ─────────────────────────
  _buildFoundationOffice(scene);

  // ── 가설울타리 + 배경 ─────────────────────────────────
  _buildFoundationHoarding(scene);
  _buildFoundationBackground(scene);
}

function _buildExcavatedPit(scene) {
  const floorMat = new THREE.MeshLambertMaterial({ color: 0x5C4A30 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -1.8, -17);
  floor.receiveShadow = true;
  scene.add(floor);

  // 흙막이 H-pile (간단 표시)
  const steelMat = new THREE.MeshLambertMaterial({ color: 0x4A4640 });
  const cx = 0, cz = -17, w = 12, d = 12;
  for (let x = -w/2; x <= w/2; x += 2) {
    [-d/2, d/2].forEach(dz => {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.2, 0.22), steelMat);
      p.position.set(x, 0.8, cz + dz);
      scene.add(p);
    });
  }
  for (let z = -d/2; z <= d/2; z += 2) {
    [-w/2, w/2].forEach(dx => {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.2, 0.22), steelMat);
      p.position.set(dx, 0.8, cz + z);
      scene.add(p);
    });
  }
}

function _buildFoundationForm(scene) {
  const woodMat   = new THREE.MeshLambertMaterial({ color: 0x9B7A2A });
  const rebarMat  = new THREE.MeshLambertMaterial({ color: 0x585450 });
  const capMat    = new THREE.MeshLambertMaterial({ color: 0xFF4400 });
  const cx = 0, cz = -17, w = 10, d = 10;

  // 거푸집 외곽 4면
  [
    { wx: w, hy: 0.6, dz: 0.08, x: cx, y: -1.5, z: cz - d/2 },
    { wx: w, hy: 0.6, dz: 0.08, x: cx, y: -1.5, z: cz + d/2 },
    { wx: 0.08, hy: 0.6, dz: d, x: cx - w/2, y: -1.5, z: cz },
    { wx: 0.08, hy: 0.6, dz: d, x: cx + w/2, y: -1.5, z: cz },
  ].forEach(f => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(f.wx, f.hy, f.dz), woodMat);
    m.position.set(f.x, f.y, f.z);
    scene.add(m);
  });

  // 매트 기초 철근망 (격자)
  const grid = 0.6; // 200mm 표준의 대략 가시 표현
  for (let x = -w/2 + 0.5; x < w/2; x += grid) {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, d, 8), rebarMat);
    r.rotation.x = Math.PI / 2;
    r.position.set(x, -1.65, cz);
    scene.add(r);
  }
  for (let z = -d/2 + 0.5; z < d/2; z += grid) {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, w, 8), rebarMat);
    r.rotation.z = Math.PI / 2;
    r.position.set(cx, -1.65, cz + z);
    scene.add(r);
  }

  // 노출 철근 끝단 + 보호캡 (4개 모서리)
  [[-w/2, cz - d/2], [w/2, cz - d/2], [-w/2, cz + d/2], [w/2, cz + d/2]].forEach(([x, z]) => {
    const stub = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.0, 8), rebarMat);
    stub.position.set(x, -0.9, z);
    scene.add(stub);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), capMat);
    cap.position.set(x, -0.4, z);
    scene.add(cap);
  });
}

function _buildPumpTruck(scene) {
  const red    = new THREE.MeshLambertMaterial({ color: 0xCC2A2A });
  const dark   = new THREE.MeshLambertMaterial({ color: 0x2A2620 });
  const grey   = new THREE.MeshLambertMaterial({ color: 0x6E6A60 });
  const group  = new THREE.Group();
  group.position.set(14, 0, -8);

  // 차체
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.0, 8.5), red);
  chassis.position.set(0, 0.6, 0);
  chassis.castShadow = true;
  group.add(chassis);

  // 운전실
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.0, 2.2), red);
  cab.position.set(0, 2.1, 3.0);
  group.add(cab);
  const win = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.2), new THREE.MeshLambertMaterial({ color: 0x7BAABB, transparent: true, opacity: 0.65 }));
  win.position.set(0, 2.3, 4.12);
  group.add(win);

  // 바퀴
  [[-1.1, 3], [1.1, 3], [-1.1, 0], [1.1, 0], [-1.1, -3], [1.1, -3]].forEach(([dx, dz]) => {
    const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.4, 16), dark);
    wh.rotation.z = Math.PI / 2;
    wh.position.set(dx, 0.55, dz);
    group.add(wh);
  });

  // 아웃트리거 4개 (펼친 상태)
  [[-1.7, 2], [1.7, 2], [-1.7, -2], [1.7, -2]].forEach(([dx, dz]) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 1.0), grey);
    arm.position.set(dx, 0.7, dz);
    group.add(arm);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 16), dark);
    pad.position.set(dx, 0.025, dz);
    group.add(pad);
  });

  // 붐 (펼친 상태)
  const boomBase = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 4.5), red);
  boomBase.position.set(0, 3.5, -0.8);
  boomBase.rotation.x = 0.6;
  boomBase.castShadow = true;
  group.add(boomBase);
  const boomTip = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 5.0), red);
  boomTip.position.set(0, 5.2, -4.5);
  boomTip.rotation.x = -0.4;
  group.add(boomTip);

  // 호스 (보 끝에서 내려옴)
  const hoseMat = new THREE.MeshLambertMaterial({ color: 0x2A2620 });
  const hose = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4.0, 8), hoseMat);
  hose.position.set(0, 4.3, -7.0);
  group.add(hose);

  scene.add(group);
  GAME._pumpTruck = group;
  GAME.colliders.push(chassis, cab);

  if (typeof ASSETS !== 'undefined') {
    ASSETS.attach(scene, 'pump_truck', {
      pos:   [14, 0, -8],
      scale: 1.4,
      onAttached: () => { group.visible = false; },
    });
  }
}

function _buildFoundationMaterials(scene) {
  // 철근 다발
  const rebarMat = new THREE.MeshLambertMaterial({ color: 0x585450 });
  for (let i = 0; i < 8; i++) {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 3.6, 8), rebarMat);
    r.rotation.z = Math.PI / 2;
    r.position.set(8 + (i % 4) * 0.07, 0.3 + Math.floor(i / 4) * 0.06, 5);
    scene.add(r);
  }
  // 동바리(서포트) 더미
  const supMat = new THREE.MeshLambertMaterial({ color: 0x6E6A60 });
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.8, 8), supMat);
    s.rotation.z = Math.PI / 2;
    s.position.set(-8 + (i % 3) * 0.12, 0.3 + Math.floor(i / 3) * 0.10, 6);
    scene.add(s);
  }
  // 합판 더미 (거푸집)
  const plyMat = new THREE.MeshLambertMaterial({ color: 0x9B7A2A });
  for (let i = 0; i < 4; i++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.04, 0.9), plyMat);
    p.position.set(-6, 0.05 + i * 0.05, 5);
    scene.add(p);
  }
}

function _buildFoundationOffice(scene) {
  const body  = new THREE.MeshLambertMaterial({ color: 0x3A6A8A });
  const roof  = new THREE.MeshLambertMaterial({ color: 0x2C5070 });
  const winM  = new THREE.MeshLambertMaterial({ color: 0x7BAABB, transparent: true, opacity: 0.7 });
  const grey  = new THREE.MeshLambertMaterial({ color: 0x888880 });

  const box = new THREE.Mesh(new THREE.BoxGeometry(6.0, 2.6, 2.4), body);
  box.position.set(-16, 1.3, 8); box.castShadow = true;
  scene.add(box);
  const r = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.12, 2.6), roof);
  r.position.set(-16, 2.66, 8); scene.add(r);
  [-17.5, -15.8].forEach(x => {
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.05), winM);
    w.position.set(x, 1.7, 6.74); scene.add(w);
  });
  const step = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.25, 0.5), grey);
  step.position.set(-14.5, 0.125, 6.5); scene.add(step);

  GAME._foundDesk = { x: 10, z: 2 };
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x8B7355 });
  const legMat  = new THREE.MeshLambertMaterial({ color: 0x6B5335 });
  const group = new THREE.Group();
  group.add(new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 0.9), woodMat));
  const bodyD = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.69, 0.9), woodMat);
  bodyD.position.set(0, -0.4, 0); group.add(bodyD);
  [[-0.83,-0.38],[0.83,-0.38],[-0.83,0.38],[0.83,0.38]].forEach(([lx,lz]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.75, 0.08), legMat);
    leg.position.set(lx, -0.4, lz); group.add(leg);
  });
  group.position.set(10, 0.75, 2);
  scene.add(group);
  GAME.colliders.push(bodyD);
}

function _buildFoundationHoarding(scene) {
  const board = new THREE.MeshLambertMaterial({ color: 0x3A6840 });
  const segs = [
    [-22,10,10,0],[-22,0,10,0],[-22,-10,10,0],
    [20,10,10,0],[20,0,10,0],[20,-10,10,0],
    [-10,14,10,Math.PI/2],[0,14,10,Math.PI/2],[10,14,10,Math.PI/2],
    [-10,-26,10,Math.PI/2],[0,-26,10,Math.PI/2],[10,-26,10,Math.PI/2],
  ];
  segs.forEach(([x,z,w,ry]) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(w,2.2,0.12), board);
    p.position.set(x,1.1,z); p.rotation.y = ry;
    scene.add(p);
  });
}

function _buildFoundationBackground(scene) {
  const bldgData = [
    [0x808890, -30, -30, 5, 18, 4],
    [0x6B737C, -25, -37, 7, 12, 5],
    [0x757D85,  27, -28, 4, 22, 4],
  ];
  bldgData.forEach(([color, x, , z, w, h, d]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
    m.position.set(x, h/2, z); scene.add(m);
  });
}
