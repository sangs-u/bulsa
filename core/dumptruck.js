// dumptruck.js — 덤프트럭 NPC 사이클

const DUMPTRUCK = {
  root:  null,
  state: 'idle',
  t:     0,
  startX: 30, startZ: 45,
  loadX:  8,  loadZ:  22,
};

window.addEventListener('game:ready', () => {
  _buildDumptruckMesh();
});

window.addEventListener('dump:request', () => {
  if (DUMPTRUCK.state !== 'idle') return;
  DUMPTRUCK.state = 'approaching';
  DUMPTRUCK.t = 0;
  if (DUMPTRUCK.root) DUMPTRUCK.root.setEnabled(true);
  DUMPTRUCK.root.position.x = DUMPTRUCK.startX;
  DUMPTRUCK.root.position.z = DUMPTRUCK.startZ;
});

function _buildDumptruckMesh() {
  const scene = GAME.scene;
  const M = BABYLON.MeshBuilder;

  const redM = new BABYLON.PBRMaterial('dt_red', scene);
  redM.albedoColor = new BABYLON.Color3(0.78, 0.18, 0.12);
  redM.metallic = 0.2; redM.roughness = 0.6;

  const grayM = new BABYLON.PBRMaterial('dt_gray', scene);
  grayM.albedoColor = new BABYLON.Color3(0.45, 0.45, 0.47);
  grayM.metallic = 0.4; grayM.roughness = 0.5;

  const darkM = new BABYLON.PBRMaterial('dt_dark', scene);
  darkM.albedoColor = new BABYLON.Color3(0.12, 0.12, 0.12);
  darkM.metallic = 0.3; darkM.roughness = 0.6;

  const root = new BABYLON.TransformNode('dt_root', scene);
  root.position = new BABYLON.Vector3(30, 0, 45);
  DUMPTRUCK.root = root;

  const cab = M.CreateBox('dt_cab', { width:2.0, height:1.6, depth:2.0 }, scene);
  cab.position = new BABYLON.Vector3(0, 1.5, 2.0);
  cab.material = redM; cab.parent = root;

  const chassis = M.CreateBox('dt_chassis', { width:2.4, height:0.4, depth:5.0 }, scene);
  chassis.position = new BABYLON.Vector3(0, 0.6, -0.5);
  chassis.material = grayM; chassis.parent = root;

  const tray = M.CreateBox('dt_tray', { width:2.2, height:1.0, depth:4.0 }, scene);
  tray.position = new BABYLON.Vector3(0, 1.4, -0.5);
  tray.material = grayM; tray.parent = root;

  [[-1.0,0.4,1.5],[1.0,0.4,1.5],[-1.0,0.4,-0.5],[1.0,0.4,-0.5],[-1.0,0.4,-2.5],[1.0,0.4,-2.5]].forEach(([x,y,z],i) => {
    const w = M.CreateCylinder('dt_wheel'+i, { diameter:0.8, height:0.4, tessellation:12 }, scene);
    w.rotation.z = Math.PI / 2;
    w.position = new BABYLON.Vector3(x, y, z);
    w.material = darkM; w.parent = root;
  });

  // siteMeshes에 넣지 않음 — setEnabled으로만 관리
  root.setEnabled(false);

  // 매 프레임 tick
  GAME.scene.onBeforeRenderObservable.add(_dumpTick);
}

function _dumpTick() {
  if (GAME.currentScene !== 'site') return;
  if (!DUMPTRUCK.root || !DUMPTRUCK.root.isEnabled()) return;
  const dt = GAME.scene.getEngine().getDeltaTime() / 1000;

  if (DUMPTRUCK.state === 'approaching') {
    DUMPTRUCK.t += dt / 4.0;
    if (DUMPTRUCK.t >= 1) {
      DUMPTRUCK.t = 0;
      DUMPTRUCK.state = 'loading';
    } else {
      DUMPTRUCK.root.position.x = DUMPTRUCK.startX + (DUMPTRUCK.loadX - DUMPTRUCK.startX) * DUMPTRUCK.t;
      DUMPTRUCK.root.position.z = DUMPTRUCK.startZ + (DUMPTRUCK.loadZ - DUMPTRUCK.startZ) * DUMPTRUCK.t;
      const dx = DUMPTRUCK.loadX - DUMPTRUCK.startX, dz = DUMPTRUCK.loadZ - DUMPTRUCK.startZ;
      DUMPTRUCK.root.rotation.y = Math.atan2(dx, dz);
    }
  }

  if (DUMPTRUCK.state === 'loading') {
    DUMPTRUCK.t += dt / 2.0;
    if (DUMPTRUCK.t >= 1) {
      DUMPTRUCK.t = 0;
      DUMPTRUCK.state = 'leaving';
      // 흙더미 리셋
      if (typeof TERRAIN !== 'undefined' && TERRAIN.dirtPileMesh) {
        TERRAIN.dirtPileMesh.scaling.y = 0.05 / 0.2;
      }
    }
  }

  if (DUMPTRUCK.state === 'leaving') {
    DUMPTRUCK.t += dt / 4.0;
    if (DUMPTRUCK.t >= 1) {
      DUMPTRUCK.state = 'idle';
      DUMPTRUCK.root.setEnabled(false);
    } else {
      DUMPTRUCK.root.position.x = DUMPTRUCK.loadX + (DUMPTRUCK.startX - DUMPTRUCK.loadX) * DUMPTRUCK.t;
      DUMPTRUCK.root.position.z = DUMPTRUCK.loadZ + (DUMPTRUCK.startZ - DUMPTRUCK.loadZ) * DUMPTRUCK.t;
      const dx = DUMPTRUCK.startX - DUMPTRUCK.loadX, dz = DUMPTRUCK.startZ - DUMPTRUCK.loadZ;
      DUMPTRUCK.root.rotation.y = Math.atan2(dx, dz);
    }
  }
}
