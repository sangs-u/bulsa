// survey.js — 매설물 X-ray 지면 시각화

const UTILITY_DEFS = [
  { id: 'water', type: '상수도관 Ø200',        x:  5, z: 22, dir: 'EW', depth: 1.2, color: [0.18, 0.52, 0.96] },
  { id: 'gas',   type: '도시가스 중압관 Ø100',  x: -2, z: 17, dir: 'NS', depth: 0.9, color: [0.96, 0.72, 0.10] },
  { id: 'elec',  type: '전력케이블 22.9kV',     x:  1, z: 28, dir: 'EW', depth: 0.6, color: [0.88, 0.18, 0.88] },
];

const _xrayMeshes = [];

function initSurveyUtilities() {
  PHASE.survey.utilities = UTILITY_DEFS.map(d => Object.assign({}, d));
  PHASE.survey.utilityFound = true;
}

function showUtilityXray() {
  if (!GAME.scene || !GAME.siteMeshes) return;

  _xrayMeshes.forEach(m => { try { m.dispose(); } catch(e) {} });
  _xrayMeshes.length = 0;

  PHASE.survey.utilities.forEach(u => {
    const [r, g, b] = u.color;
    const isEW = u.dir === 'EW';
    const span  = 22;

    // 지면 스트립 — 배관 경로
    const strip = BABYLON.MeshBuilder.CreateBox('xrS_' + u.id,
      { width: isEW ? span : 0.42, height: 0.022, depth: isEW ? 0.42 : span }, GAME.scene);
    strip.position = new BABYLON.Vector3(u.x, 0.011, u.z);
    strip.isPickable = false;
    const sm = new BABYLON.StandardMaterial('xrSM_' + u.id, GAME.scene);
    sm.diffuseColor  = new BABYLON.Color3(r, g, b);
    sm.emissiveColor = new BABYLON.Color3(r * 0.85, g * 0.85, b * 0.85);
    sm.alpha = 0.72;
    strip.material = sm;

    // 중심 비콘 디스크
    const disc = BABYLON.MeshBuilder.CreateCylinder('xrD_' + u.id,
      { diameter: 1.8, height: 0.025, tessellation: 24 }, GAME.scene);
    disc.position = new BABYLON.Vector3(u.x, 0.013, u.z);
    disc.isPickable = false;
    const dm = new BABYLON.StandardMaterial('xrDM_' + u.id, GAME.scene);
    dm.diffuseColor  = new BABYLON.Color3(r, g, b);
    dm.emissiveColor = new BABYLON.Color3(r, g, b);
    dm.alpha = 0.92;
    disc.material = dm;

    _xrayMeshes.push(strip, disc);
    GAME.siteMeshes.push(strip, disc);
  });
}

function hideUtilityXray() {
  _xrayMeshes.forEach(m => { if (m) m.isVisible = false; });
}
