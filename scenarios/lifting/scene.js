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

// ── RC frame building (3-storey, under construction) ──────
function _buildStructure(scene) {
  const concMat  = new THREE.MeshLambertMaterial({ color: 0xC4BEB4 });
  const concDark = new THREE.MeshLambertMaterial({ color: 0xA09890 });
  const rebarMat = new THREE.MeshLambertMaterial({ color: 0x585450 });
  const woodMat  = new THREE.MeshLambertMaterial({ color: 0x9B7A2A });
  const wallMat  = new THREE.MeshLambertMaterial({ color: 0xCDC8C0 });
  const beamMat  = new THREE.MeshLambertMaterial({ color: 0xB8B2AA });

  const flH = 3.3;  // floor-to-floor height
  const colH = 9.9; // 3 floors total

  // ── Round Columns (CylinderGeometry, 24 seg) ──────────────
  const colPositions = [[-5, -12], [5, -12], [-5, -22], [5, -22]];

  colPositions.forEach(([x, z]) => {
    // Main column shaft
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, colH, 24), concMat);
    col.position.set(x, colH / 2, z);
    col.castShadow = true;
    col.receiveShadow = true;
    scene.add(col);

    // Column caps at each floor level (beam seating zone)
    [flH, flH * 2].forEach(fy => {
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.30, 0.20, 24), concDark);
      cap.position.set(x, fy, z);
      scene.add(cap);
    });

    // Rebar protruding above top
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.5, 8), rebarMat);
      r.position.set(x + Math.cos(a) * 0.16, colH + 0.75, z + Math.sin(a) * 0.16);
      scene.add(r);
    }

    // Formwork wrap on top (partial pour in progress)
    const fw = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.30, 1.0, 24), woodMat);
    fw.position.set(x, colH + 0.5, z);
    scene.add(fw);
  });

  // ── Floor Slabs ──────────────────────────────────────────
  [0, flH, flH * 2].forEach((y, floorIdx) => {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(10.7, 0.22, 10.7), concDark);
    slab.position.set(0, y + 0.11, -17);
    slab.receiveShadow = true;
    scene.add(slab);

    // Formwork boards on upper floor slab edges
    if (floorIdx >= 1) {
      [
        [0, y + 0.33, -11.65, 10.7, 0.28, 0.10],
        [0, y + 0.33, -22.35, 10.7, 0.28, 0.10],
        [-5.4, y + 0.33, -17,  0.10, 0.28, 10.7],
        [ 5.4, y + 0.33, -17,  0.10, 0.28, 10.7],
      ].forEach(([bx, by, bz, w, h, d]) => {
        const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), woodMat);
        b.position.set(bx, by, bz);
        scene.add(b);
      });
    }
  });

  // ── Floor Beams (connecting columns at each level) ──────
  [flH, flH * 2].forEach(y => {
    // X-direction (front/back span)
    [[-12], [-22]].forEach(([z]) => {
      const bm = new THREE.Mesh(new THREE.BoxGeometry(10.7, 0.44, 0.36), beamMat);
      bm.position.set(0, y + 0.33, z);
      scene.add(bm);
    });
    // Z-direction (side spans)
    [[-5], [5]].forEach(([x]) => {
      const bm = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.44, 10.7), beamMat);
      bm.position.set(x, y + 0.33, -17);
      scene.add(bm);
    });
  });

  // ── Ground-floor exterior walls ──────────────────────────
  const frontWall = new THREE.Mesh(new THREE.BoxGeometry(10.7, flH * 0.55, 0.20), wallMat);
  frontWall.position.set(0, flH * 0.275, -11.9);
  scene.add(frontWall);

  const backWall = new THREE.Mesh(new THREE.BoxGeometry(10.7, flH, 0.20), wallMat);
  backWall.position.set(0, flH * 0.5, -22.1);
  scene.add(backWall);
  // Side walls
  [-5.1, 5.1].forEach(x => {
    const sw = new THREE.Mesh(new THREE.BoxGeometry(0.20, flH * 0.7, 10.7), wallMat);
    sw.position.set(x, flH * 0.35, -17);
    scene.add(sw);
  });
}

// ── Tower crane ────────────────────────────────────────────
function _buildCrane(scene) {
  const yellow = new THREE.MeshLambertMaterial({ color: 0xD4A217 }); // muted crane yellow
  const dark   = new THREE.MeshLambertMaterial({ color: 0x3A3830 });
  const cabin  = new THREE.MeshLambertMaterial({ color: 0xD2CEC4 }); // off-white

  // ── Mast — round CylinderGeometry ──────────────────────
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.58, 22, 20), yellow);
  mast.position.set(14, 11, -8);
  mast.castShadow = true;
  scene.add(mast);

  // Lattice bracing — thin cylinders at 45° around mast
  const brace = new THREE.MeshLambertMaterial({ color: 0xC09814 });
  for (let y = 2; y < 21; y += 2.8) {
    for (let i = 0; i < 4; i++) {
      const a  = (i / 4) * Math.PI * 2 + y * 0.2;
      const br = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.8, 8), brace);
      br.position.set(14 + Math.cos(a) * 0.52, y, -8 + Math.sin(a) * 0.52);
      br.rotation.z = 0.38;
      br.rotation.y = a;
      scene.add(br);
    }
  }

  // Turntable
  const tt = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.4, 0.58, 22), yellow);
  tt.position.set(14, 22.29, -8);
  scene.add(tt);

  // Jib (main arm) — chord + web structure
  const jib = new THREE.Mesh(new THREE.BoxGeometry(16, 0.52, 0.48), yellow);
  jib.position.set(6, 22.58, -8);
  jib.castShadow = true;
  scene.add(jib);

  // Jib top chord (diagonal stays)
  const topChord = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 16.2, 10), brace);
  topChord.position.set(6, 23.35, -8);
  topChord.rotation.z = Math.PI / 2;
  scene.add(topChord);

  // Counter-jib
  const cjib = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.48, 0.44), yellow);
  cjib.position.set(17, 22.58, -8);
  scene.add(cjib);

  // Counterweight (realistic concrete block stack)
  const cw = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 1.6), dark);
  cw.position.set(19.6, 21.98, -8);
  scene.add(cw);
  const cw2 = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.6, 1.4), dark);
  cw2.position.set(19.6, 23.0, -8);
  scene.add(cw2);

  // A-frame head (CylinderGeometry, round struts)
  [-1.4, 1.4].forEach(dx => {
    const af = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 6.2, 12), yellow);
    af.position.set(14 + dx, 25.1, -8);
    af.rotation.z = dx < 0 ? 0.30 : -0.30;
    scene.add(af);
  });

  // Main hoist cable
  const wireMat = new THREE.LineBasicMaterial({ color: 0x282420 });
  scene.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-2, 22.58, -8),
      new THREE.Vector3(-2, 0.88, -8),
    ]), wireMat
  ));

  // Hook block (CylinderGeometry) + torus curve
  const hookBlock = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.22, 0.42, 18), dark);
  hookBlock.position.set(-2, 0.88, -8);
  scene.add(hookBlock);

  const hookCurve = new THREE.Mesh(
    new THREE.TorusGeometry(0.16, 0.048, 14, 20, Math.PI * 1.25), dark
  );
  hookCurve.position.set(-2, 0.44, -8);
  hookCurve.rotation.y = Math.PI / 2;
  scene.add(hookCurve);

  // Operator cabin
  const cabinMesh = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.4, 2.2), cabin);
  cabinMesh.position.set(14, 1.2, -5.4);
  cabinMesh.castShadow = true;
  scene.add(cabinMesh);

  // Cabin window
  const winMat = new THREE.MeshLambertMaterial({ color: 0x7BAABB, transparent: true, opacity: 0.62 });
  const win = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.0), winMat);
  win.position.set(14, 1.4, -4.29);
  scene.add(win);

  // Control panel (interactive trigger)
  const panelMat = new THREE.MeshLambertMaterial({ color: 0x2A2E3A });
  const panel = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 0.28), panelMat);
  panel.position.set(14, 1.3, -4.0);
  scene.add(panel);

  GAME._cranePanelMesh = panel;
}

// ── RC Beam (the load) ────────────────────────────────────
function _buildBeam(scene) {
  const beamMat  = new THREE.MeshLambertMaterial({ color: 0xA8A49C });
  const plateMat = new THREE.MeshLambertMaterial({ color: 0x585450 });
  const rebarMat = new THREE.MeshLambertMaterial({ color: 0x5A5652 });

  const beam = new THREE.Mesh(new THREE.BoxGeometry(7, 0.55, 0.55), beamMat);
  beam.position.set(-2, 0.28, -8);
  beam.castShadow = true;
  beam.receiveShadow = true;
  scene.add(beam);

  // End plates (steel)
  [-3.55, 3.55].forEach(dx => {
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.65, 0.65), plateMat);
    plate.position.set(-2 + dx, 0.28, -8);
    scene.add(plate);
  });

  // Exposed rebar ends (4 rods per side)
  [-3.68, 3.68].forEach(dx => {
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.18, 8), rebarMat);
      r.position.set(-2 + dx, 0.18 + Math.sin(a) * 0.14, -8 + Math.cos(a) * 0.14);
      r.rotation.z = Math.PI / 2;
      scene.add(r);
    }
  });

  GAME.liftBeam = beam;

  // Sling wires (steel-gray)
  const slingMat = new THREE.LineBasicMaterial({ color: 0x686462 });
  [[-3, 0.56], [1, 0.56]].forEach(([dx]) => {
    const pts = [
      new THREE.Vector3(-2 + dx, 0.56, -8),
      new THREE.Vector3(-2, 0.88, -8),
    ];
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), slingMat));
  });
}

// ── Safety barriers ───────────────────────────────────────
function _buildBarriers(scene) {
  const postMat  = new THREE.MeshLambertMaterial({ color: 0xBB4010 }); // OSHA orange-red
  const tapeMat  = new THREE.LineBasicMaterial({ color: 0xD4B018 });   // muted yellow tape

  const postGeo = new THREE.CylinderGeometry(0.055, 0.055, 1.05, 12);
  [
    [-8, 0.525, -4], [-8, 0.525, -8], [-8, 0.525, -12],
    [ 4, 0.525, -4], [ 4, 0.525, -8], [ 4, 0.525, -12],
  ].forEach(p => {
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.set(...p);
    post.castShadow = true;
    scene.add(post);
  });

  // Tape lines at two heights
  [0.5, 0.88].forEach(ty => {
    const pts = [
      [-8, ty, -4], [-8, ty, -12], [4, ty, -12], [4, ty, -4], [-8, ty, -4],
    ];
    const geo = new THREE.BufferGeometry().setFromPoints(
      pts.map(p => new THREE.Vector3(...p))
    );
    scene.add(new THREE.Line(geo, tapeMat));
  });
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

// ── Site props (cones, boxes, trees) ──────────────────────
function _buildSiteProps(scene) {
  const coneMat = new THREE.MeshLambertMaterial({ color: 0xBB4810 }); // OSHA orange
  const boxMat  = new THREE.MeshLambertMaterial({ color: 0x607050 }); // weathered green box
  const trunkMat   = new THREE.MeshLambertMaterial({ color: 0x5C4A32 });
  const foliageMat = new THREE.MeshLambertMaterial({ color: 0x4A7040 });

  // Traffic cones (ConeGeometry with more segments)
  const coneGeo = new THREE.ConeGeometry(0.18, 0.58, 16);
  [[6, 0.29, -3], [6, 0.29, -5], [6, 0.29, -7], [-9, 0.29, -5], [-9, 0.29, -9]].forEach(p => {
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.set(...p);
    scene.add(cone);
    // White reflective band
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(0.19, 0.165, 0.10, 16),
      new THREE.MeshLambertMaterial({ color: 0xD8D4CC })
    );
    band.position.set(p[0], p[1] + 0.18, p[2]);
    scene.add(band);
  });

  // Material storage boxes
  [[8, 0.4, -2], [10, 0.4, -2], [8, 1.2, -2]].forEach(([x,y,z]) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.8, 1.8), boxMat);
    b.position.set(x, y, z);
    b.castShadow = true;
    scene.add(b);
  });

  // Trees (more natural — CylinderGeometry trunk + SphereGeometry crown, 16+ seg)
  [[-30, 0, 5], [-32, 0, -5], [28, 0, 8], [30, 0, -3], [-28, 0, -15], [25, 0, -18]].forEach(([x,,z]) => {
    const h = 3.5 + Math.random() * 2;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, h, 12), trunkMat);
    trunk.position.set(x, h / 2, z);
    scene.add(trunk);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(1.4 + Math.random() * 0.4, 16, 12), foliageMat);
    crown.position.set(x, h + 1.1, z);
    scene.add(crown);
  });
}
