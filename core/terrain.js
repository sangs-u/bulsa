// terrain.js — 굴착 구역 복셀 지형

const TERRAIN = {
  baseMesh:  null,
  cells:     [],      // [{ix,iy,iz,cx,cy,cz,idx,alive}]
  matrices:  null,    // Float32Array (576*16)
  dimX: 12, dimY: 4, dimZ: 12,
  cellW: 1.0, cellH: 0.5, cellD: 1.0,
  originX: -6, originY: -2.0, originZ: 16,
  total: 576,
  dug:   0,
  completed: false,
  dirtPileMesh: null,
};

window.addEventListener('phase:excavationStart', () => {
  if (!GAME.scene) return;
  _initTerrain();
  _hideSiteExArea();
});

function _hideSiteExArea() {
  const m = GAME.scene.getMeshByName('s_exArea');
  if (m) m.isVisible = false;
}

function _initTerrain() {
  TERRAIN.cells = [];
  TERRAIN.dug   = 0;
  TERRAIN.completed = false;

  const mat = new BABYLON.PBRMaterial('terrain_mat', GAME.scene);
  mat.albedoColor = new BABYLON.Color3(0.42, 0.30, 0.18);
  mat.roughness   = 0.95;
  mat.metallic    = 0.02;

  const base = BABYLON.MeshBuilder.CreateBox('terrain_cell',
    { width: TERRAIN.cellW, height: TERRAIN.cellH, depth: TERRAIN.cellD }, GAME.scene);
  base.material = mat;
  base.receiveShadows = true;
  base.isPickable = false;
  TERRAIN.baseMesh = base;

  const matrices = new Float32Array(TERRAIN.total * 16);
  let n = 0;
  for (let ix = 0; ix < TERRAIN.dimX; ix++)
    for (let iy = 0; iy < TERRAIN.dimY; iy++)
      for (let iz = 0; iz < TERRAIN.dimZ; iz++) {
        const cx = TERRAIN.originX + (ix + 0.5) * TERRAIN.cellW;
        const cy = TERRAIN.originY + (iy + 0.5) * TERRAIN.cellH;
        const cz = TERRAIN.originZ + (iz + 0.5) * TERRAIN.cellD;
        BABYLON.Matrix.Translation(cx, cy, cz).copyToArray(matrices, n * 16);
        TERRAIN.cells.push({ ix, iy, iz, cx, cy, cz, idx: n, alive: true });
        n++;
      }
  base.thinInstanceSetBuffer('matrix', matrices, 16, false);
  TERRAIN.matrices = matrices;

  // dirt pile mesh
  const dpMat = new BABYLON.StandardMaterial('dirtPileMat', GAME.scene);
  dpMat.diffuseColor = new BABYLON.Color3(0.38, 0.26, 0.14);
  const dp = BABYLON.MeshBuilder.CreateBox('dirtPile', { width: 2.0, height: 0.2, depth: 2.0 }, GAME.scene);
  dp.position = new BABYLON.Vector3(8, 0.1, 22);
  dp.material = dpMat;
  dp.isPickable = false;
  TERRAIN.dirtPileMesh = dp;
}

function _cellIndex(ix, iy, iz) {
  return ix * (TERRAIN.dimY * TERRAIN.dimZ) + iy * TERRAIN.dimZ + iz;
}

function _worldToCell(wx, wy, wz) {
  const ix = Math.floor((wx - TERRAIN.originX) / TERRAIN.cellW);
  const iy = Math.floor((wy - TERRAIN.originY) / TERRAIN.cellH);
  const iz = Math.floor((wz - TERRAIN.originZ) / TERRAIN.cellD);
  return { ix, iy, iz };
}

TERRAIN.isInsideArea = function(x, z) {
  return x >= -6 && x <= 6 && z >= 16 && z <= 28;
};

TERRAIN.surfaceY = function(x, z) {
  const col = TERRAIN.cells.filter(c => c.alive
    && Math.abs(c.cx - x) < TERRAIN.cellW
    && Math.abs(c.cz - z) < TERRAIN.cellD);
  if (!col.length) return TERRAIN.originY;
  return Math.max(...col.map(c => c.cy + TERRAIN.cellH * 0.5));
};

TERRAIN.digCell = function(ix, iy, iz) {
  if (ix < 0 || ix >= TERRAIN.dimX) return;
  if (iy < 0 || iy >= TERRAIN.dimY) return;
  if (iz < 0 || iz >= TERRAIN.dimZ) return;
  const idx = _cellIndex(ix, iy, iz);
  const cell = TERRAIN.cells[idx];
  if (!cell || !cell.alive) return;
  cell.alive = false;
  BABYLON.Matrix.Translation(9999, -9999, 9999).copyToArray(TERRAIN.matrices, idx * 16);
  TERRAIN.baseMesh.thinInstanceSetBuffer('matrix', TERRAIN.matrices, 16, false);
  TERRAIN.dug++;

  // dirt pile 높이
  if (TERRAIN.dirtPileMesh) {
    const scaledH = Math.max(0.2, TERRAIN.dug * 0.06);
    TERRAIN.dirtPileMesh.scaling.y = scaledH / 0.2;
  }

  if (typeof EXCAVATOR !== 'undefined') EXCAVATOR.dirtCount++;
  if (typeof EXCAVATOR !== 'undefined' && EXCAVATOR.dirtCount >= 8) {
    window.dispatchEvent(new Event('dump:request'));
    EXCAVATOR.dirtCount = 0;
  }

  if (!TERRAIN.completed && TERRAIN.dug / TERRAIN.total >= 0.70) {
    TERRAIN.completed = true;
    window.dispatchEvent(new Event('phase:excavationComplete'));
  }

  const pct = Math.round(TERRAIN.dug / TERRAIN.total * 100);
  const bar = document.getElementById('exc-progress-bar');
  const val = document.getElementById('exc-progress-val');
  if (bar) bar.style.width = pct + '%';
  if (val) val.textContent = pct;
};

TERRAIN.digAtPosition = function(wx, wy, wz) {
  const r = 0.8;
  TERRAIN.cells.forEach(c => {
    if (!c.alive) return;
    const dx = c.cx - wx, dy = c.cy - wy, dz = c.cz - wz;
    if (Math.sqrt(dx*dx + dy*dy + dz*dz) < r) {
      TERRAIN.digCell(c.ix, c.iy, c.iz);
    }
  });
};
