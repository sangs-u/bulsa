// S — 설비·마감 Scene (MEP & Finishing)
// 완성된 5층 건물 외벽 + 분전반 + 배관 + 환기 덕트 + 소화기 + 도료 자재

function buildMepFinishScene() {
  const scene = GAME.scene;
  const _unified = !!GAME.unifiedMode;
  if (!_unified) {
    GAME.colliders = [];

    scene.background = new THREE.Color(0x7BA0BD);
    scene.fog = new THREE.FogExp2(0x7BA0BD, 0.005);

    scene.add(new THREE.HemisphereLight(0xB8D4F0, 0x8B7355, 0.55));
    scene.add(new THREE.AmbientLight(0xffffff, 0.2));
    const sun = new THREE.DirectionalLight(0xFFE4B5, 1.3);
    sun.position.set(18, 26, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -50; sun.shadow.camera.right = 50;
    sun.shadow.camera.top = 50; sun.shadow.camera.bottom = -50;
    sun.shadow.camera.far = 150;
    scene.add(sun);
    GAME._sun = sun;

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.MeshLambertMaterial({ color: 0x6E6E66 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
  }

  _buildMepBuilding(scene);     // 완공 직전 건물 (외벽 + 창문)
  _buildElectricPanel(scene);    // 분전반 (LOTO 대상)
  _buildPipingSystem(scene);     // 배관 시스템
  _buildVentilation(scene);      // 환기 덕트
  _buildFireExtPositions(scene); // 소화기 배치 위치 표시
  _buildFinishMaterials(scene);  // 도료·타일 자재
  _buildMepOffice(scene);
  _buildMepHoarding(scene);
}

// 5층 건물 (외벽 완성, 마감 진행 중)
function _buildMepBuilding(scene) {
  const concMat = new THREE.MeshLambertMaterial({ color: 0xB0AFA8 });
  const wallMat = new THREE.MeshLambertMaterial({ color: 0xB87B6E });
  const glMat   = new THREE.MeshLambertMaterial({ color: 0x9AC8E0, transparent: true, opacity: 0.65 });
  const cx = 0, cz = -17;

  // 컬럼 + 슬라브
  for (let fl = 0; fl < 5; fl++) {
    const cy = 1.8 + fl * 3.8;
    [[-5,-12],[5,-12],[-5,-22],[5,-22]].forEach(([x,z]) => {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.55, 3.6, 0.55), concMat);
      c.position.set(x, cy, z);
      c.castShadow = true;
      scene.add(c);
    });
    const s = new THREE.Mesh(new THREE.BoxGeometry(10.55, 0.25, 10.55), concMat);
    s.position.set(cx, 3.73 + fl * 3.8, cz);
    scene.add(s);
  }

  // 외벽 (높이 19m)
  const wallH = 18.8, wallY = 9.4;
  const wallN = new THREE.Mesh(new THREE.BoxGeometry(10.55, wallH, 0.28), wallMat);
  wallN.position.set(cx, wallY, -11.9); scene.add(wallN);
  GAME.colliders.push(wallN);
  const wallS = new THREE.Mesh(new THREE.BoxGeometry(10.55, wallH, 0.28), wallMat);
  wallS.position.set(cx, wallY, -22.1); scene.add(wallS);
  GAME.colliders.push(wallS);
  const wallE = new THREE.Mesh(new THREE.BoxGeometry(0.28, wallH, 10.55), wallMat);
  wallE.position.set(5.14, wallY, cz); scene.add(wallE);
  GAME.colliders.push(wallE);
  const wallW = new THREE.Mesh(new THREE.BoxGeometry(0.28, wallH, 10.55), wallMat);
  wallW.position.set(-5.14, wallY, cz); scene.add(wallW);
  GAME.colliders.push(wallW);

  // 창문 (5층 분)
  for (let fl = 0; fl < 5; fl++) {
    const wy = 2.2 + fl * 3.8;
    for (let wx = -3; wx <= 3; wx += 3) {
      [-11.87, -22.13].forEach(zPlane => {
        const w = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.4), glMat);
        w.position.set(cx + wx, wy, zPlane);
        scene.add(w);
      });
    }
  }

  // 지붕
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x556B7D });
  const roof = new THREE.Mesh(new THREE.BoxGeometry(11, 0.5, 11), roofMat);
  roof.position.set(cx, 19.35, cz);
  scene.add(roof);
}

// 분전반 (LOTO 대상)
function _buildElectricPanel(scene) {
  const cabMat   = new THREE.MeshLambertMaterial({ color: 0x4A4A4A });
  const knobMat  = new THREE.MeshLambertMaterial({ color: 0xCC4010 });
  const warnMat  = new THREE.MeshLambertMaterial({ color: 0xFFCC00 });

  // 분전반 (건물 입구 옆)
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.5, 0.3), cabMat);
  panel.position.set(-4.3, 1.4, -11.5);
  panel.castShadow = true;
  scene.add(panel);

  // 차단기 노브 3개
  [0.3, 0, -0.3].forEach(dy => {
    const k = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.08, 0.04), knobMat);
    k.position.set(-4.3, 1.4 + dy, -11.32);
    scene.add(k);
  });

  // 위험 표지
  const warn = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.3), warnMat);
  warn.position.set(-4.3, 2.25, -11.32);
  scene.add(warn);

  GAME._mepPanel = panel;
}

// 배관 시스템 (수도·가스)
function _buildPipingSystem(scene) {
  const pipeBlue = new THREE.MeshLambertMaterial({ color: 0x2B6CB0 });  // 수도
  const pipeRed  = new THREE.MeshLambertMaterial({ color: 0xCC2A2A });  // 가스
  const valveMat = new THREE.MeshLambertMaterial({ color: 0x686060 });

  // 가스관 (붉은색 — 건물 외벽 좌측)
  const gasPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 6, 10), pipeRed);
  gasPipe.position.set(-5.5, 3.0, -11.9);
  scene.add(gasPipe);
  // 가스 밸브 (점검 트리거 위치)
  const valve = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), valveMat);
  valve.position.set(-5.5, 0.8, -11.9);
  scene.add(valve);
  GAME._gasValve = valve;

  // 수도관 (파란색 — 건물 외벽 우측)
  const waterPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 6, 10), pipeBlue);
  waterPipe.position.set(5.5, 3.0, -11.9);
  scene.add(waterPipe);
}

// 환기 덕트 (지붕에서 외벽으로)
function _buildVentilation(scene) {
  const ductMat = new THREE.MeshLambertMaterial({ color: 0xB8BEC8 });

  // 수직 덕트 (외벽 따라 올라감)
  const vDuct = new THREE.Mesh(new THREE.BoxGeometry(0.45, 8.0, 0.45), ductMat);
  vDuct.position.set(4.3, 4.5, -11.5);
  scene.add(vDuct);

  // 환기 그릴 (건물 외벽에 2개 — 점검 트리거 위치)
  const grillMat = new THREE.MeshLambertMaterial({ color: 0x6A6A60 });
  [1.5, 7.5].forEach(gy => {
    const g = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.05), grillMat);
    g.position.set(4.3, gy, -11.75);
    scene.add(g);
  });
  GAME._ventDuct = vDuct;
}

// 소화기 배치 위치 표시 (4개 표지)
function _buildFireExtPositions(scene) {
  const redMat = new THREE.MeshLambertMaterial({ color: 0xCC2A2A });
  const yelMat = new THREE.MeshBasicMaterial({ color: 0xFFCC00, side: THREE.DoubleSide });

  // 4개 소화기 미니 표시 (실린더)
  const positions = [
    [-4, 0.4, -8],  [4, 0.4, -8],
    [-4, 0.4, -25], [4, 0.4, -25],
  ];
  positions.forEach(p => {
    const ext = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.55, 12), redMat);
    ext.position.set(...p);
    scene.add(ext);
    // 배치 표지 (바닥 노란 표시)
    const marker = new THREE.Mesh(new THREE.CircleGeometry(0.35, 16), yelMat);
    marker.rotation.x = -Math.PI / 2;
    marker.position.set(p[0], 0.03, p[2]);
    scene.add(marker);
  });
}

// 마감재 자재 (도료 통, 타일)
function _buildFinishMaterials(scene) {
  // 도료 통 (다양한 색)
  const drumColors = [0xCC2A2A, 0x2B6CB0, 0x22A858, 0xD4A018];
  drumColors.forEach((c, i) => {
    const drum = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.25, 0.55, 16),
      new THREE.MeshLambertMaterial({ color: c })
    );
    drum.position.set(12 + (i % 2) * 0.6, 0.3, 4 + Math.floor(i / 2) * 0.6);
    drum.castShadow = true;
    scene.add(drum);
  });

  // 타일 더미
  const tileMat = new THREE.MeshLambertMaterial({ color: 0xE8E2D5 });
  for (let i = 0; i < 6; i++) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.6), tileMat);
    t.position.set(14, 0.05 + i * 0.05, 4);
    scene.add(t);
  }
}

function _buildMepOffice(scene) {
  const body = new THREE.MeshLambertMaterial({ color: 0x3A6A8A });
  const roof = new THREE.MeshLambertMaterial({ color: 0x2C5070 });
  const grey = new THREE.MeshLambertMaterial({ color: 0x888880 });

  const box = new THREE.Mesh(new THREE.BoxGeometry(6.0, 2.6, 2.4), body);
  box.position.set(-16, 1.3, 8); box.castShadow = true;
  scene.add(box);
  const r = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.12, 2.6), roof);
  r.position.set(-16, 2.66, 8); scene.add(r);
  const step = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.25, 0.5), grey);
  step.position.set(-14.5, 0.125, 6.5); scene.add(step);

  GAME._mepDesk = { x: 10, z: 2 };
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

function _buildMepHoarding(scene) {
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
