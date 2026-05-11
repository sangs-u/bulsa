// Building construction visualization — 7-stage progressive build
// Positioned at same site as scene.js structure, stages STAGE_3+ start hidden

const BUILDING = {
  stage: 0,      // current visible stage (0–6)
  groups: [],    // THREE.Group per stage
  _animating: false,
  _stageCompletedHook: false,
};

GAME.state.buildingStage = 0;
GAME.building = BUILDING;

// ── Material palette ─────────────────────────────────────────
const _bMats = {
  concrete:  () => new THREE.MeshLambertMaterial({ color: 0xB0AFA8, transparent: true, opacity: 0 }),
  steel:     () => new THREE.MeshLambertMaterial({ color: 0x6A8EAE, transparent: true, opacity: 0 }),
  glass:     () => new THREE.MeshLambertMaterial({ color: 0x9AC8E0, transparent: true, opacity: 0 }),
  brick:     () => new THREE.MeshLambertMaterial({ color: 0xB87B6E, transparent: true, opacity: 0 }),
  roof:      () => new THREE.MeshLambertMaterial({ color: 0x556B7D, transparent: true, opacity: 0 }),
  dirt:      () => new THREE.MeshLambertMaterial({ color: 0x8B7355, transparent: true, opacity: 0 }),
  banner:    () => new THREE.MeshLambertMaterial({ color: 0xDC2626, transparent: true, opacity: 0 }),
};

function buildStageGroup(stageIdx) {
  const g = new THREE.Group();
  GAME.scene.add(g);

  // Building center offset from scene.js structure
  const cx = 0, cz = -17;

  switch (stageIdx) {
    case 0: { // 터파기 — excavation pit
      const mat = _bMats.dirt();
      // Pit (negative space suggested by dark ground depression)
      const pit = new THREE.Mesh(new THREE.BoxGeometry(12, 0.5, 12), mat);
      pit.position.set(cx, -0.25, cz);
      g.add(pit);
      break;
    }
    case 1: { // 기초 — foundation slab
      const mat = _bMats.concrete();
      const slab = new THREE.Mesh(new THREE.BoxGeometry(12, 0.6, 12), mat);
      slab.position.set(cx, 0.3, cz);
      g.add(slab);
      // Foundation bolts
      for (let i = -4; i <= 4; i += 2) {
        for (let j = -4; j <= 4; j += 2) {
          const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 6), mat);
          bolt.position.set(cx + i, 0.8, cz + j);
          g.add(bolt);
        }
      }
      break;
    }
    case 2: { // 1층 골조 — 1F frame
      const mat = _bMats.concrete();
      const colGeo = new THREE.BoxGeometry(0.55, 3.6, 0.55);
      [[-5,1.8,-12],[ 5,1.8,-12],[-5,1.8,-22],[5,1.8,-22]].forEach(p=>{
        const c = new THREE.Mesh(colGeo, mat); c.position.set(...p); g.add(c);
      });
      // 1F beams
      const bGeo1 = new THREE.BoxGeometry(10.55, 0.45, 0.45);
      const bGeo2 = new THREE.BoxGeometry(0.45, 0.45, 10.55);
      [[-12],[- 22]].forEach(([z]) => {
        const b = new THREE.Mesh(bGeo1, mat); b.position.set(cx, 3.6, z); g.add(b);
      });
      [[-5],[5]].forEach(([x]) => {
        const b = new THREE.Mesh(bGeo2, mat); b.position.set(x, 3.6, cz); g.add(b);
      });
      // 1F slab
      const s = new THREE.Mesh(new THREE.BoxGeometry(10.55, 0.25, 10.55), mat);
      s.position.set(cx, 3.73, cz); g.add(s);
      break;
    }
    case 3: { // 2층 골조 — 2F frame
      const mat = _bMats.concrete();
      const colGeo = new THREE.BoxGeometry(0.55, 3.6, 0.55);
      [[-5,5.6,-12],[5,5.6,-12],[-5,5.6,-22],[5,5.6,-22]].forEach(p=>{
        const c = new THREE.Mesh(colGeo, mat); c.position.set(...p); g.add(c);
      });
      // 2F beams + slab
      const bGeo = new THREE.BoxGeometry(10.55, 0.45, 0.45);
      [[-12],[-22]].forEach(([z]) => {
        const b = new THREE.Mesh(bGeo, mat); b.position.set(cx, 7.4, z); g.add(b);
      });
      const s = new THREE.Mesh(new THREE.BoxGeometry(10.55, 0.25, 10.55), mat);
      s.position.set(cx, 7.55, cz); g.add(s);
      break;
    }
    case 4: { // 3층 골조 — 3F frame
      const mat = _bMats.concrete();
      const colGeo = new THREE.BoxGeometry(0.55, 3.6, 0.55);
      [[-5,9.4,-12],[5,9.4,-12],[-5,9.4,-22],[5,9.4,-22]].forEach(p=>{
        const c = new THREE.Mesh(colGeo, mat); c.position.set(...p); g.add(c);
      });
      const bGeo1 = new THREE.BoxGeometry(10.55, 0.45, 0.45);
      const bGeo2 = new THREE.BoxGeometry(0.45, 0.45, 10.55);
      [[-12],[-22]].forEach(([z]) => {
        const b = new THREE.Mesh(bGeo1, mat); b.position.set(cx, 11.2, z); g.add(b);
      });
      [[-5],[5]].forEach(([x]) => {
        const b = new THREE.Mesh(bGeo2, mat); b.position.set(x, 11.2, cz); g.add(b);
      });
      const s = new THREE.Mesh(new THREE.BoxGeometry(10.55, 0.25, 10.55), mat);
      s.position.set(cx, 11.35, cz); g.add(s);
      break;
    }
    case 5: { // 4층 골조 — 4F frame
      const mat = _bMats.concrete();
      const colGeo = new THREE.BoxGeometry(0.55, 3.6, 0.55);
      [[-5,13.2,-12],[5,13.2,-12],[-5,13.2,-22],[5,13.2,-22]].forEach(p=>{
        const c = new THREE.Mesh(colGeo, mat); c.position.set(...p); g.add(c);
      });
      const bGeo1 = new THREE.BoxGeometry(10.55, 0.45, 0.45);
      const bGeo2 = new THREE.BoxGeometry(0.45, 0.45, 10.55);
      [[-12],[-22]].forEach(([z]) => {
        const b = new THREE.Mesh(bGeo1, mat); b.position.set(cx, 15.0, z); g.add(b);
      });
      [[-5],[5]].forEach(([x]) => {
        const b = new THREE.Mesh(bGeo2, mat); b.position.set(x, 15.0, cz); g.add(b);
      });
      const s = new THREE.Mesh(new THREE.BoxGeometry(10.55, 0.25, 10.55), mat);
      s.position.set(cx, 15.15, cz); g.add(s);
      break;
    }
    case 6: { // 5층 골조 — 5F frame
      const mat = _bMats.steel();
      const colGeo = new THREE.BoxGeometry(0.5, 3.6, 0.5);
      [[-5,17.0,-12],[5,17.0,-12],[-5,17.0,-22],[5,17.0,-22]].forEach(p=>{
        const c = new THREE.Mesh(colGeo, mat); c.position.set(...p); g.add(c);
      });
      const bGeo1 = new THREE.BoxGeometry(10.55, 0.45, 0.45);
      const bGeo2 = new THREE.BoxGeometry(0.45, 0.45, 10.55);
      [[-12],[-22]].forEach(([z]) => {
        const b = new THREE.Mesh(bGeo1, mat); b.position.set(cx, 18.8, z); g.add(b);
      });
      [[-5],[5]].forEach(([x]) => {
        const b = new THREE.Mesh(bGeo2, mat); b.position.set(x, 18.8, cz); g.add(b);
      });
      const s = new THREE.Mesh(new THREE.BoxGeometry(10.55, 0.25, 10.55), mat);
      s.position.set(cx, 18.95, cz); g.add(s);
      break;
    }
    case 7: { // 외벽 — exterior walls
      const mat = _bMats.brick();
      const glMat = _bMats.glass();
      // 5층 전체를 덮는 외벽 (높이 ≈ 19m, y중심 9.5)
      const wallH = 18.8;
      const wallY = 9.4;
      const wallN = new THREE.Mesh(new THREE.BoxGeometry(10.55, wallH, 0.28), mat);
      wallN.position.set(cx, wallY, -11.9); g.add(wallN);
      const wallS = new THREE.Mesh(new THREE.BoxGeometry(10.55, wallH, 0.28), mat);
      wallS.position.set(cx, wallY, -22.1); g.add(wallS);
      const wallE = new THREE.Mesh(new THREE.BoxGeometry(0.28, wallH, 10.55), mat);
      wallE.position.set(5.14, wallY, cz); g.add(wallE);
      const wallW = new THREE.Mesh(new THREE.BoxGeometry(0.28, wallH, 10.55), mat);
      wallW.position.set(-5.14, wallY, cz); g.add(wallW);
      // 5층 분 창문
      for (let fl = 0; fl < 5; fl++) {
        const wy = 2.2 + fl * 3.8;
        for (let wx = -3; wx <= 3; wx += 3) {
          const win = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.4), glMat);
          win.position.set(cx + wx, wy, -11.87); g.add(win);
          const win2 = win.clone(); win2.position.z = -22.13; g.add(win2);
        }
      }
      break;
    }
    case 8: { // 지붕+마감 — roof + banner
      const mat    = _bMats.roof();
      const banMat = _bMats.banner();
      const roof = new THREE.Mesh(new THREE.BoxGeometry(11, 0.5, 11), mat);
      roof.position.set(cx, 19.35, cz); g.add(roof);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(11.4, 0.18, 11.4), mat);
      cap.position.set(cx, 19.6, cz); g.add(cap);
      // 준공 현수막
      const banner = new THREE.Mesh(new THREE.PlaneGeometry(8, 1.4), banMat);
      banner.position.set(cx, 7.5, -11.8);
      g.add(banner);
      BUILDING._bannerMesh = banner;
      break;
    }
  }

  return g;
}

// ── Init ──────────────────────────────────────────────────────
function initBuilding() {
  for (let i = 0; i < 9; i++) {
    BUILDING.groups[i] = buildStageGroup(i);
  }

  // 터파기 + 기초만 표시 — 1층부터 인양으로 짓는다
  for (let i = 0; i <= 1; i++) {
    _setStageOpacity(i, 1);
  }
  BUILDING.stage = 1;
  GAME.state.buildingStage = 1;
  _updateBuildingHUD();
}

// ── Advance one stage ─────────────────────────────────────────
function advanceBuildingStage() {
  const nextStage = BUILDING.stage + 1;
  if (nextStage > 8) return;
  BUILDING._animating = true;
  _fadeInStage(nextStage, () => {
    BUILDING.stage = nextStage;
    GAME.state.buildingStage = nextStage;
    BUILDING._animating = false;
    _updateBuildingHUD();
    _doBuildingZoomOut();
  });
}

function _setStageOpacity(stageIdx, opacity) {
  const g = BUILDING.groups[stageIdx];
  if (!g) return;
  g.traverse(obj => {
    if (obj.material) {
      obj.material.opacity = opacity;
      obj.material.transparent = opacity < 1;
    }
  });
}

function _fadeInStage(stageIdx, onDone) {
  let progress = 0;
  const duration = 0.5; // seconds
  let last = 0;
  function step(now) {
    const delta = Math.min((now - last) / 1000, 0.05);
    last = now;
    progress += delta / duration;
    _setStageOpacity(stageIdx, Math.min(1, progress));
    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      _setStageOpacity(stageIdx, 1);
      if (onDone) onDone();
    }
  }
  requestAnimationFrame(step);
}

function _updateBuildingHUD() {
  const el = document.getElementById('building-progress');
  if (!el) return;
  const labelMap = {
    ko: ['터파기','기초','1층골조','2층골조','3층골조','4층골조','5층골조','외벽','준공'],
    en: ['Excavation','Foundation','1F Frame','2F Frame','3F Frame','4F Frame','5F Frame','Walls','Complete'],
    vi: ['Đào móng','Móng','Khung T1','Khung T2','Khung T3','Khung T4','Khung T5','Tường ngoài','Hoàn công'],
    ar: ['الحفر','الأساس','هيكل ط1','هيكل ط2','هيكل ط3','هيكل ط4','هيكل ط5','الجدران','اكتمل'],
  };
  const prefixes = { ko: '건물 공정', en: 'Build', vi: 'Tiến độ', ar: 'البناء' };
  const labels = labelMap[currentLang] || labelMap.ko;
  const prefix = prefixes[currentLang] || prefixes.ko;
  el.textContent = `${prefix} ${BUILDING.stage + 1}/9 · ${labels[BUILDING.stage] || ''}`;
}

// ── Camera zoom out briefly on stage complete ─────────────────
function _doBuildingZoomOut() {
  if (!GAME.camera) return;
  const savedFOV = GAME.camera.fov;
  let elapsed = 0;

  function zoom(now) {
    elapsed += 0.016;
    if (elapsed < 1.5) {
      GAME.camera.fov = savedFOV + Math.sin(elapsed * Math.PI / 1.5) * 8;
      GAME.camera.updateProjectionMatrix();
      requestAnimationFrame(zoom);
    } else {
      GAME.camera.fov = savedFOV;
      GAME.camera.updateProjectionMatrix();
    }
  }
  requestAnimationFrame(zoom);
}
