// Scene builder — S01 줄걸이/인양 작업 (건설현장 크레인)

function buildLiftingScene() {
  const scene = GAME.scene;

  // ── Sky + Fog ──────────────────────────────────────────
  scene.background = new THREE.Color(0x7AA8C8);
  scene.fog = new THREE.FogExp2(0x7AA8C8, 0.005);

  // ── Lighting ───────────────────────────────────────────
  // Hemisphere: sky-blue above, warm ground below
  const hemi = new THREE.HemisphereLight(0xB8D4F0, 0x8B7355, 0.6);
  scene.add(hemi);

  const ambient = new THREE.AmbientLight(0xffffff, 0.3);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xFFEDD0, 1.5);
  sun.position.set(30, 35, 15);  // lower angle → longer shadows
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left   = -45;
  sun.shadow.camera.right  =  45;
  sun.shadow.camera.top    =  45;
  sun.shadow.camera.bottom = -45;
  sun.shadow.camera.far    = 130;
  sun.shadow.bias = -0.0005;
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0x9EC4E8, 0.35);
  fill.position.set(-20, 12, -8);
  scene.add(fill);

  // ── Ground ─────────────────────────────────────────────
  const groundMat = new THREE.MeshLambertMaterial({ color: 0x6E6E66 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Concrete patch variation
  _addGroundPatches(scene);
  // Ground grid (thin lines for depth perception)
  _addGroundGrid(scene);

  // ── Building Structure ─────────────────────────────────
  _buildStructure(scene);

  // ── Tower Crane ────────────────────────────────────────
  _buildCrane(scene);

  // ── RC Beam (load) ─────────────────────────────────────
  _buildBeam(scene);

  // ── Safety Barriers ────────────────────────────────────
  _buildBarriers(scene);

  // ── Misc site props ────────────────────────────────────
  _buildSiteProps(scene);

  // ── Work zone danger ring ──────────────────────────────
  _buildDangerZone(scene);

  // ── Background buildings ───────────────────────────────
  _buildBackground(scene);
}

// ── Ground grid ────────────────────────────────────────────
function _addGroundGrid(scene) {
  const mat = new THREE.LineBasicMaterial({ color: 0x777770, transparent: true, opacity: 0.25 });
  const step = 5;
  const half = 35;
  const points = [];
  for (let i = -half; i <= half; i += step) {
    points.push(new THREE.Vector3(i, 0.01, -half), new THREE.Vector3(i, 0.01, half));
    points.push(new THREE.Vector3(-half, 0.01, i), new THREE.Vector3(half, 0.01, i));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  scene.add(new THREE.LineSegments(geo, mat));
}

// ── Incomplete concrete building ───────────────────────────
function _buildStructure(scene) {
  const concMat = new THREE.MeshLambertMaterial({ color: 0xB0AFA8 });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x858580 });

  // 4 columns: corners of 10×10 footprint at z≈-15
  const colGeo = new THREE.BoxGeometry(0.7, 9, 0.7);
  [[-5, 4.5, -12], [5, 4.5, -12], [-5, 4.5, -22], [5, 4.5, -22]].forEach(pos => {
    const col = new THREE.Mesh(colGeo, concMat);
    col.position.set(...pos);
    col.castShadow = true;
    col.receiveShadow = true;
    scene.add(col);
  });

  // Partial slab at y=9 (half-built)
  const slabGeo = new THREE.BoxGeometry(10.7, 0.35, 10.7);
  const slab = new THREE.Mesh(slabGeo, darkMat);
  slab.position.set(0, 9.17, -17);
  slab.receiveShadow = true;
  scene.add(slab);

  // Ground floor slab
  const gSlab = new THREE.Mesh(new THREE.BoxGeometry(10.7, 0.2, 10.7), darkMat);
  gSlab.position.set(0, 0.1, -17);
  scene.add(gSlab);

  // Rebar sticking up (visual detail)
  const rebarMat = new THREE.MeshLambertMaterial({ color: 0x5A5A55 });
  const rebarGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.5, 6);
  [[-4.8, 9.85, -11.8], [4.8, 9.85, -11.8], [-4.8, 9.85, -22.2], [4.8, 9.85, -22.2],
   [-4.8, 9.85, -17], [4.8, 9.85, -17]].forEach(pos => {
    const r = new THREE.Mesh(rebarGeo, rebarMat);
    r.position.set(...pos);
    scene.add(r);
  });

  // Formwork boards (brown planks on the slab edges)
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x8B6914 });
  [
    [0, 9.35, -11.5, 10.7, 0.3, 0.1],
    [0, 9.35, -22.5, 10.7, 0.3, 0.1],
    [-5.4, 9.35, -17, 0.1, 0.3, 10.7],
    [5.4, 9.35, -17, 0.1, 0.3, 10.7],
  ].forEach(([x,y,z,w,h,d]) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), woodMat);
    b.position.set(x,y,z);
    scene.add(b);
  });
}

// ── Tower crane ────────────────────────────────────────────
function _buildCrane(scene) {
  const yellowMat = new THREE.MeshLambertMaterial({ color: 0xF5C542 });
  const darkMat   = new THREE.MeshLambertMaterial({ color: 0x444444 });
  const whiteMat  = new THREE.MeshLambertMaterial({ color: 0xEEEEEE });

  // Mast (tower)
  const mast = new THREE.Mesh(new THREE.BoxGeometry(0.9, 22, 0.9), yellowMat);
  mast.position.set(14, 11, -8);
  mast.castShadow = true;
  scene.add(mast);

  // Mast cross-braces
  const braceGeo = new THREE.BoxGeometry(0.12, 0.12, 1.1);
  const braceGeo2 = new THREE.BoxGeometry(0.12, 1.1, 0.12);
  for (let y = 2; y < 21; y += 3) {
    [-1, 1].forEach(side => {
      const b = new THREE.Mesh(braceGeo, darkMat);
      b.position.set(14 + side * 0.45, y, -8);
      scene.add(b);
    });
  }

  // Turntable
  const turntable = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.5, 12), yellowMat);
  turntable.position.set(14, 22.25, -8);
  scene.add(turntable);

  // Jib (main arm) — extends toward beam area
  const jib = new THREE.Mesh(new THREE.BoxGeometry(16, 0.5, 0.5), yellowMat);
  jib.position.set(6, 22.5, -8);
  jib.castShadow = true;
  scene.add(jib);

  // Counter-jib
  const cjib = new THREE.Mesh(new THREE.BoxGeometry(6, 0.5, 0.5), yellowMat);
  cjib.position.set(17, 22.5, -8);
  scene.add(cjib);

  // Counterweight
  const cw = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 1.5), darkMat);
  cw.position.set(19.5, 22, -8);
  scene.add(cw);

  // A-frame
  const aframeGeo = new THREE.CylinderGeometry(0.12, 0.12, 6, 6);
  [-1.5, 1.5].forEach(dx => {
    const af = new THREE.Mesh(aframeGeo, yellowMat);
    af.position.set(14 + dx, 25, -8);
    af.rotation.z = dx < 0 ? 0.3 : -0.3;
    scene.add(af);
  });

  // Hook cable (from jib end ~x=−2, y=22.5 down to hook)
  const wireMat = new THREE.LineBasicMaterial({ color: 0x333333 });
  const wirePoints = [
    new THREE.Vector3(-2, 22.5, -8),
    new THREE.Vector3(-2, 0.8, -8),
  ];
  const wireGeo = new THREE.BufferGeometry().setFromPoints(wirePoints);
  scene.add(new THREE.Line(wireGeo, wireMat));

  // Hook
  const hook = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.3), darkMat);
  hook.position.set(-2, 0.8, -8);
  scene.add(hook);

  // Crane control cabin (at mast base)
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2, 2.2, 2), whiteMat);
  cabin.position.set(14, 1.1, -5.5);
  cabin.castShadow = true;
  scene.add(cabin);

  // Cabin windows
  const winMat = new THREE.MeshLambertMaterial({ color: 0x6BC5F0, transparent: true, opacity: 0.7 });
  const win = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8), winMat);
  win.position.set(14, 1.4, -4.49);
  scene.add(win);

  // Control panel (interactive object — trigger)
  const panelMat = new THREE.MeshLambertMaterial({ color: 0x333355 });
  const panel = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1, 0.3), panelMat);
  panel.position.set(14, 1.3, -4.0);
  scene.add(panel);

  // Store reference for interaction
  GAME._cranePanelMesh = panel;
}

// ── RC Beam (the load) ────────────────────────────────────
function _buildBeam(scene) {
  const beamMat = new THREE.MeshLambertMaterial({ color: 0x9A9A95 });
  const beam = new THREE.Mesh(new THREE.BoxGeometry(7, 0.55, 0.55), beamMat);
  beam.position.set(-2, 0.28, -8);
  beam.castShadow = true;
  beam.receiveShadow = true;
  scene.add(beam);

  // Beam end plates
  const plateMat = new THREE.MeshLambertMaterial({ color: 0x5A5A55 });
  [-3.7, 3.7].forEach(dx => {
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.65, 0.65), plateMat);
    plate.position.set(-2 + dx, 0.28, -8);
    scene.add(plate);
  });

  GAME.liftBeam = beam;

  // Sling wires from beam to hook
  const slingMat = new THREE.LineBasicMaterial({ color: 0x8B8B00 });
  [[-3, 0.55], [1, 0.55]].forEach(([dx, dy]) => {
    const pts = [
      new THREE.Vector3(-2 + dx, dy, -8),
      new THREE.Vector3(-2, 0.8, -8),
    ];
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    scene.add(new THREE.Line(geo, slingMat));
  });
}

// ── Safety barriers ───────────────────────────────────────
function _buildBarriers(scene) {
  const stripeMat = new THREE.MeshLambertMaterial({ color: 0xF5C542 });
  const postMat   = new THREE.MeshLambertMaterial({ color: 0xCC3300 });

  // Yellow/black barrier tape posts around lift zone
  const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.1, 8);
  const positions = [
    [-8, 0.55, -4], [-8, 0.55, -12], [4, 0.55, -4], [4, 0.55, -12],
    [-8, 0.55, -8], [4, 0.55, -8],
  ];
  positions.forEach(p => {
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.set(...p);
    scene.add(post);
  });

  // Tape lines
  const tapeMat = new THREE.LineBasicMaterial({ color: 0xFFCC00 });
  const tapePoints = [
    [-8, 0.9, -4], [-8, 0.9, -12],
    [-8, 0.9, -12], [4, 0.9, -12],
    [4, 0.9, -12], [4, 0.9, -4],
    [4, 0.9, -4], [-8, 0.9, -4],
  ];
  for (let i = 0; i < tapePoints.length; i += 2) {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(...tapePoints[i]),
      new THREE.Vector3(...tapePoints[i + 1]),
    ]);
    scene.add(new THREE.Line(geo, tapeMat));
  }
}

// ── Concrete ground patches (visual variety) ───────────────
function _addGroundPatches(scene) {
  const patches = [
    [0x787870, -8, -5, 12, 10],
    [0x7A7A72, 5,  -14, 8,  8 ],
    [0x706E68, -12, -16, 10, 7],
    [0x747472, 10, -2,  6,  5 ],
    [0x6A6A64, -3, -22, 9,  6 ],
  ];
  patches.forEach(([color, x, z, w, d]) => {
    const mat  = new THREE.MeshLambertMaterial({ color });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.003, z);
    mesh.receiveShadow = true;
    scene.add(mesh);
  });
}

// ── Work zone danger ring ──────────────────────────────────
function _buildDangerZone(scene) {
  const cx = -2, cz = -8; // beam center

  // Red ring border
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xFF2200, side: THREE.DoubleSide, transparent: true, opacity: 0.7,
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(7.7, 8.1, 48), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(cx, 0.018, cz);
  scene.add(ring);

  // Translucent danger fill
  const areaMat = new THREE.MeshBasicMaterial({
    color: 0xFF4400, side: THREE.DoubleSide, transparent: true, opacity: 0.07,
  });
  const area = new THREE.Mesh(new THREE.CircleGeometry(7.7, 48), areaMat);
  area.rotation.x = -Math.PI / 2;
  area.position.set(cx, 0.016, cz);
  scene.add(area);

  // Yellow corner markers at cardinal points
  const warnMat = new THREE.MeshBasicMaterial({ color: 0xFFCC00, side: THREE.DoubleSide });
  [[0,8],[8,0],[0,-8],[-8,0]].forEach(([dx, dz]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), warnMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(cx + dx, 0.022, cz + dz);
    scene.add(m);
  });

  // Dashed radial lines (4 lines inward)
  const dashMat = new THREE.LineBasicMaterial({
    color: 0xFF5500, transparent: true, opacity: 0.45,
  });
  [[0,7.5],[7.5,0],[0,-7.5],[-7.5,0]].forEach(([dx,dz]) => {
    const pts = [
      new THREE.Vector3(cx, 0.02, cz),
      new THREE.Vector3(cx + dx, 0.02, cz + dz),
    ];
    scene.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts), dashMat
    ));
  });
}

// ── Background buildings (distant skyline) ─────────────────
function _buildBackground(scene) {
  const bldgData = [
    [0x808890, -30, -30, 5,  18, 4],
    [0x6B737C, -25, -37, 7,  12, 5],
    [0x8A9098, -18, -40, 5,  14, 4],
    [0x757D85,  27, -28, 4,  22, 4],
    [0x6E767E,  32, -20, 3,  15, 3],
    [0x818990,  24, -38, 6,  10, 5],
    [0x737B83,  16, -40, 4,   8, 3],
  ];

  bldgData.forEach(([color, x, , z, w, h, d]) => {
    const mat  = new THREE.MeshLambertMaterial({ color });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, h / 2, z);
    mesh.receiveShadow = true;
    scene.add(mesh);

    // Simple window rows (dark planes on front face)
    const winMat = new THREE.MeshBasicMaterial({
      color: 0x7BB8D4, transparent: true, opacity: 0.65,
    });
    const cols = Math.max(1, Math.floor(w / 1.6));
    const rows = Math.max(1, Math.floor(h / 2.5));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(0.65, 0.9), winMat);
        win.position.set(
          x - w / 2 + (c + 0.5) * (w / cols),
          r * 2.5 + 1.5,
          z - d / 2 - 0.02
        );
        scene.add(win);
      }
    }
  });
}

// ── Site props (hardhat, cones, boxes) ────────────────────
function _buildSiteProps(scene) {
  const orangeMat = new THREE.MeshLambertMaterial({ color: 0xFF6600 });
  const yellowMat = new THREE.MeshLambertMaterial({ color: 0xFFCC00 });

  // Traffic cones
  const coneGeo = new THREE.ConeGeometry(0.2, 0.6, 8);
  [[6, 0.3, -3], [6, 0.3, -5], [6, 0.3, -7], [-9, 0.3, -5], [-9, 0.3, -9]].forEach(p => {
    const cone = new THREE.Mesh(coneGeo, orangeMat);
    cone.position.set(...p);
    scene.add(cone);
  });

  // Material storage boxes
  const boxMat = new THREE.MeshLambertMaterial({ color: 0x6B8E4E });
  [[8, 0.4, -2], [10, 0.4, -2], [8, 1.2, -2]].forEach(([x,y,z]) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.8, 1.8), boxMat);
    b.position.set(x, y, z);
    scene.add(b);
  });

  // Distant trees (simple cylinders + spheres for atmosphere)
  const trunkMat  = new THREE.MeshLambertMaterial({ color: 0x5C4A32 });
  const foliageMat = new THREE.MeshLambertMaterial({ color: 0x3A7D44 });
  [[-30, 0, 5], [-32, 0, -5], [28, 0, 8], [30, 0, -3], [-28, 0, -15], [25, 0, -18]].forEach(([x,,z]) => {
    const h = 3.5 + Math.random() * 2;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, h, 6), trunkMat);
    trunk.position.set(x, h / 2, z);
    scene.add(trunk);
    const foliage = new THREE.Mesh(new THREE.SphereGeometry(1.4, 8, 6), foliageMat);
    foliage.position.set(x, h + 1, z);
    scene.add(foliage);
  });
}
