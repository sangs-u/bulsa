// S — 외장공사 Scene (Envelope)
// 5층 골조 완료된 건물 + 시스템 비계 + 외장 패널 자재 + 인양용 크레인 + 사무실

function buildEnvelopeScene() {
  const scene = GAME.scene;
  GAME.colliders = [];

  scene.background = new THREE.Color(0x8AB2D0);
  scene.fog = new THREE.FogExp2(0x8AB2D0, 0.005);

  scene.add(new THREE.HemisphereLight(0xB8D4F0, 0x8B7355, 0.55));
  scene.add(new THREE.AmbientLight(0xffffff, 0.18));
  const sun = new THREE.DirectionalLight(0xFFE4B5, 1.4);
  sun.position.set(20, 25, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -50; sun.shadow.camera.right = 50;
  sun.shadow.camera.top = 50; sun.shadow.camera.bottom = -50;
  sun.shadow.camera.far = 150;
  scene.add(sun);
  GAME._sun = sun;

  // Ground
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshLambertMaterial({ color: 0x6E6E66 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  _buildEnvelopeStructure(scene);  // 완성된 골조
  _buildScaffolding(scene);         // 시스템 비계
  _buildPanelMaterials(scene);      // 외장재 자재 적치
  _buildEnvelopeOffice(scene);
  _buildEnvelopeHoarding(scene);
  _buildEnvelopeBackground(scene);
}

// 5층 RC 골조 (완성 상태) — 컬럼·슬라브·외벽 없음
function _buildEnvelopeStructure(scene) {
  const concMat = new THREE.MeshLambertMaterial({ color: 0xB0AFA8 });
  const cx = 0, cz = -17;

  // 5층 컬럼
  for (let fl = 0; fl < 5; fl++) {
    const cy = 1.8 + fl * 3.8;
    [[-5,-12],[5,-12],[-5,-22],[5,-22]].forEach(([x,z]) => {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.55, 3.6, 0.55), concMat);
      c.position.set(x, cy, z);
      c.castShadow = true;
      c.receiveShadow = true;
      scene.add(c);
      GAME.colliders.push(c);
    });
  }
  // 5층 슬라브
  for (let fl = 0; fl < 5; fl++) {
    const y = 3.73 + fl * 3.8;
    const s = new THREE.Mesh(new THREE.BoxGeometry(10.55, 0.25, 10.55), concMat);
    s.position.set(cx, y, cz);
    s.receiveShadow = true;
    scene.add(s);
  }
}

// 시스템 비계 — 5층 높이 둘러서
function _buildScaffolding(scene) {
  const tubeMat = new THREE.MeshLambertMaterial({ color: 0xD4A018 });
  const plateMat = new THREE.MeshLambertMaterial({ color: 0x9B7A2A });
  const railMat = new THREE.LineBasicMaterial({ color: 0xCC4010 });

  const cx = 0, cz = -17;
  const offset = 6.2;  // 건물 외곽보다 1m 밖
  const totalH = 20;
  const bayH = 1.8;
  const bayW = 1.5;

  // 4면에 비계 — 수직 기둥
  const corners = [
    { x: -offset, z: -offset + cz, axis: 'z', length: offset * 2 },
    { x:  offset, z: -offset + cz, axis: 'z', length: offset * 2 },
    { x: -offset, z: -offset + cz, axis: 'x', length: offset * 2 },
    { x: -offset, z:  offset + cz, axis: 'x', length: offset * 2 },
  ];
  // 단순화: 4변 각각에 수직 기둥 + 가로 작업발판
  // 앞·뒤 면 (z-direction span)
  [cz - offset, cz + offset].forEach(zSide => {
    for (let x = -offset; x <= offset; x += bayW) {
      // 수직 강관
      const v = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, totalH, 8), tubeMat);
      v.position.set(x, totalH/2, zSide);
      scene.add(v);
    }
    // 작업발판 + 안전난간 (각 층)
    for (let fl = 0; fl < Math.floor(totalH/bayH); fl++) {
      const fy = fl * bayH + 0.05;
      // 작업발판 (서있을 수 있도록 collider 등록)
      const plank = new THREE.Mesh(new THREE.BoxGeometry(offset*2, 0.05, 0.6), plateMat);
      plank.position.set(0, fy, zSide);
      scene.add(plank);
      GAME.colliders.push(plank);
      // 안전난간 (3단)
      [0.45, 0.9, 1.05].forEach(rh => {
        const pts = [
          new THREE.Vector3(-offset, fy + rh, zSide),
          new THREE.Vector3( offset, fy + rh, zSide),
        ];
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), railMat);
        scene.add(line);
      });
    }
  });

  // 좌·우 면 (x-direction span)
  [-offset, offset].forEach(xSide => {
    for (let z = -offset; z <= offset; z += bayW) {
      const v = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, totalH, 8), tubeMat);
      v.position.set(xSide, totalH/2, cz + z);
      scene.add(v);
    }
    for (let fl = 0; fl < Math.floor(totalH/bayH); fl++) {
      const fy = fl * bayH + 0.05;
      const plank = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, offset*2), plateMat);
      plank.position.set(xSide, fy, cz);
      scene.add(plank);
      GAME.colliders.push(plank);
      [0.45, 0.9, 1.05].forEach(rh => {
        const pts = [
          new THREE.Vector3(xSide, fy + rh, cz - offset),
          new THREE.Vector3(xSide, fy + rh, cz + offset),
        ];
        scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), railMat));
      });
    }
  });

  if (typeof ASSETS !== 'undefined') {
    ASSETS.attach(scene, 'scaffold_kit', {
      pos:   [0, 0, -17],
      scale: 1.0,
    });
  }
}

// 외장 패널 자재 적치
function _buildPanelMaterials(scene) {
  // ACM 알루미늄 패널 (회색)
  const acmMat = new THREE.MeshLambertMaterial({ color: 0xB8BEC8 });
  for (let i = 0; i < 5; i++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.05, 1.0), acmMat);
    p.position.set(10, 0.05 + i * 0.06, 4);
    p.castShadow = true;
    scene.add(p);
  }
  // 유리 패널 (반투명 청록)
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x9AC8E0, transparent: true, opacity: 0.7 });
  for (let i = 0; i < 3; i++) {
    const g = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.04, 0.9), glassMat);
    g.position.set(13, 0.05 + i * 0.06, 4);
    scene.add(g);
  }
  // 패널용 결속선 더미
  const tieMat = new THREE.MeshLambertMaterial({ color: 0x585450 });
  for (let i = 0; i < 8; i++) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.0, 8), tieMat);
    t.rotation.z = Math.PI / 2;
    t.position.set(16, 0.1 + (i % 4) * 0.06, 4 + Math.floor(i / 4) * 0.12);
    scene.add(t);
  }
}

function _buildEnvelopeOffice(scene) {
  const body = new THREE.MeshLambertMaterial({ color: 0x3A6A8A });
  const roof = new THREE.MeshLambertMaterial({ color: 0x2C5070 });
  const winM = new THREE.MeshLambertMaterial({ color: 0x7BAABB, transparent: true, opacity: 0.7 });
  const grey = new THREE.MeshLambertMaterial({ color: 0x888880 });

  const box = new THREE.Mesh(new THREE.BoxGeometry(6.0, 2.6, 2.4), body);
  box.position.set(-16, 1.3, 8); box.castShadow = true;
  scene.add(box);
  const r = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.12, 2.6), roof);
  r.position.set(-16, 2.66, 8); scene.add(r);
  const step = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.25, 0.5), grey);
  step.position.set(-14.5, 0.125, 6.5); scene.add(step);

  GAME._envDesk = { x: 10, z: 2 };
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

function _buildEnvelopeHoarding(scene) {
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

function _buildEnvelopeBackground(scene) {
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
