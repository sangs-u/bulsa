// excavator.js — 굴착기 mesh, 진입/탑승/조작/퇴장

const EXCAVATOR = {
  root:        null,
  cabin:       null,
  boom:        null,
  arm:         null,
  bucket:      null,
  bucketTip:   null,

  state:       'idle',  // idle|approaching|ready|mounted|leaving|gone
  approachT:   0,
  leaveT:      0,

  boomAngle:   -0.20,
  armAngle:    -0.60,
  bucketAngle: -0.40,

  moveSpeed:   0.08,
  turnSpeed:   0.025,
  yaw:         Math.PI,
  posX:        0,
  posZ:        45,

  keys:        { w:false, a:false, s:false, d:false, z:false, x:false },
  joyX:        0,
  joyY:        0,

  mounted:     false,
  dirtCount:   0,
  digCooldown: 0,

  dragActive:  false,
  dragLastX:   0,
  dragLastY:   0,
};

const _APPROACH_START_Z = 45;
const _APPROACH_END_Z   = 18;
const _APPROACH_DUR     = 6.0;
const _LEAVE_DUR        = 5.0;

/* ─── 초기화 ─────────────────────────────────────────────── */
window.addEventListener('game:ready', () => {
  _buildExcavatorMesh();
  GAME.scene.onBeforeRenderObservable.add(_excTick);
  _bindExcKeys();
  _bindExcDrag();
});

window.addEventListener('phase:excavationStart', () => {
  if (EXCAVATOR.state !== 'idle') return;
  _showExcavator();
  EXCAVATOR.approachT = 0;
  EXCAVATOR.state     = 'approaching';
});

window.addEventListener('phase:excavationComplete', () => {
  if (!EXCAVATOR.mounted) return;
  _unmountExcavator();
  EXCAVATOR.state  = 'leaving';
  EXCAVATOR.leaveT = 0;
});

/* ─── mesh 생성 ──────────────────────────────────────────── */
function _buildExcavatorMesh() {
  const scene = GAME.scene;
  const M = BABYLON.MeshBuilder;

  const yellowM = _excPBR(scene, 'exc_yellow', 0.95, 0.78, 0.10, 0.55, 0.20);
  const blackM  = _excPBR(scene, 'exc_black',  0.10, 0.10, 0.10, 0.50, 0.40);
  const grayM   = _excPBR(scene, 'exc_gray',   0.50, 0.50, 0.52, 0.45, 0.65);
  const dkYellM = _excPBR(scene, 'exc_dkyel',  0.85, 0.65, 0.08, 0.60, 0.25);
  const winM    = new BABYLON.StandardMaterial('exc_win', scene);
  winM.diffuseColor = new BABYLON.Color3(0.18, 0.30, 0.45);
  winM.alpha = 0.6;

  // root TransformNode — siteMeshes에 넣지 않음 (setEnabled으로만 관리)
  const root = new BABYLON.TransformNode('exc_root', scene);
  root.position = new BABYLON.Vector3(0, 0, 45);
  EXCAVATOR.root = root;

  // 트랙 (하부)
  const trackBase = M.CreateBox('exc_trackBase', { width:2.4, height:0.6, depth:4.0 }, scene);
  trackBase.position = new BABYLON.Vector3(0, 0.30, 0);
  trackBase.material = blackM;
  trackBase.parent = root;

  const trackR = M.CreateBox('exc_trackR', { width:0.5, height:0.7, depth:4.0 }, scene);
  trackR.position = new BABYLON.Vector3(0.95, 0.35, 0);
  trackR.material = blackM; trackR.parent = root;

  const trackL = M.CreateBox('exc_trackL', { width:0.5, height:0.7, depth:4.0 }, scene);
  trackL.position = new BABYLON.Vector3(-0.95, 0.35, 0);
  trackL.material = blackM; trackL.parent = root;

  const platform = M.CreateCylinder('exc_platform', { diameter:1.8, height:0.3 }, scene);
  platform.position = new BABYLON.Vector3(0, 0.85, 0);
  platform.material = grayM; platform.parent = root;

  // 캐빈 TransformNode
  const cabin = new BABYLON.TransformNode('exc_cabin', scene);
  cabin.position = new BABYLON.Vector3(0, 1.00, 0);
  cabin.parent = root;
  EXCAVATOR.cabin = cabin;

  const cabinBody = M.CreateBox('exc_cabinBody', { width:1.6, height:1.2, depth:2.0 }, scene);
  cabinBody.position = new BABYLON.Vector3(0, 0.60, -0.5);
  cabinBody.material = yellowM; cabinBody.parent = cabin;

  const cabinWin = M.CreateBox('exc_cabinWin', { width:1.2, height:0.7, depth:0.04 }, scene);
  cabinWin.position = new BABYLON.Vector3(0, 0.9, 0.55);
  cabinWin.material = winM; cabinWin.parent = cabin;

  const cabinRoof = M.CreateBox('exc_cabinRoof', { width:1.7, height:0.06, depth:2.1 }, scene);
  cabinRoof.position = new BABYLON.Vector3(0, 1.23, -0.5);
  cabinRoof.material = blackM; cabinRoof.parent = cabin;

  // 붐 TransformNode
  const boom = new BABYLON.TransformNode('exc_boom', scene);
  boom.position = new BABYLON.Vector3(0, 0.30, 1.1);
  boom.parent = cabin;
  EXCAVATOR.boom = boom;

  const boomMesh = M.CreateBox('exc_boomMesh', { width:0.5, height:0.4, depth:3.4 }, scene);
  boomMesh.position = new BABYLON.Vector3(0, 0, 1.7);
  boomMesh.material = yellowM; boomMesh.parent = boom;

  // 암 TransformNode
  const arm = new BABYLON.TransformNode('exc_arm', scene);
  arm.position = new BABYLON.Vector3(0, 0, 3.2);
  arm.parent = boom;
  EXCAVATOR.arm = arm;

  const armMesh = M.CreateBox('exc_armMesh', { width:0.35, height:0.35, depth:2.4 }, scene);
  armMesh.position = new BABYLON.Vector3(0, 0, 1.1);
  armMesh.material = yellowM; armMesh.parent = arm;

  // 버킷 TransformNode
  const bucket = new BABYLON.TransformNode('exc_bucket', scene);
  bucket.position = new BABYLON.Vector3(0, 0, 2.2);
  bucket.parent = arm;
  EXCAVATOR.bucket = bucket;

  const bucketShell = M.CreateBox('exc_bucketShell', { width:1.0, height:0.7, depth:0.9 }, scene);
  bucketShell.position = new BABYLON.Vector3(0, -0.3, 0.4);
  bucketShell.material = dkYellM; bucketShell.parent = bucket;

  const bucketTeeth = M.CreateBox('exc_bucketTeeth', { width:1.0, height:0.08, depth:0.30 }, scene);
  bucketTeeth.position = new BABYLON.Vector3(0, -0.62, 0.85);
  bucketTeeth.material = grayM; bucketTeeth.parent = bucket;

  const bucketTip = M.CreateBox('exc_bucketTip', { width:0.1, height:0.1, depth:0.1 }, scene);
  bucketTip.position = new BABYLON.Vector3(0, -0.65, 0.95);
  bucketTip.material = blackM;
  bucketTip.isPickable = false; bucketTip.isVisible = false;
  bucketTip.parent = bucket;
  EXCAVATOR.bucketTip = bucketTip;

  // 그림자 캐스터 (5개만)
  if (GAME.shadowGen) {
    [trackBase, cabinBody, boomMesh, armMesh, bucketShell].forEach(m => {
      try { GAME.shadowGen.addShadowCaster(m); } catch(e) {}
    });
  }

  // 초기 숨김
  root.setEnabled(false);
}

function _showExcavator() {
  if (!EXCAVATOR.root) return;
  EXCAVATOR.root.setEnabled(true);
  EXCAVATOR.posX = 0;
  EXCAVATOR.posZ = _APPROACH_START_Z;
  EXCAVATOR.yaw  = Math.PI;
  EXCAVATOR.root.position.x = EXCAVATOR.posX;
  EXCAVATOR.root.position.z = EXCAVATOR.posZ;
  EXCAVATOR.root.rotation.y = EXCAVATOR.yaw;
}

/* ─── PBR 헬퍼 ──────────────────────────────────────────── */
function _excPBR(scene, name, r, g, b, rough, metal) {
  const m = new BABYLON.PBRMaterial(name, scene);
  m.albedoColor = new BABYLON.Color3(r, g, b);
  m.roughness   = rough;
  m.metallic    = metal;
  return m;
}

/* ─── 매 프레임 tick ─────────────────────────────────────── */
function _excTick() {
  if (GAME.currentScene !== 'site') return;
  if (!EXCAVATOR.root) return;
  const dt = GAME.scene.getEngine().getDeltaTime() / 1000;

  if (EXCAVATOR.state === 'approaching') {
    EXCAVATOR.approachT += dt / _APPROACH_DUR;
    if (EXCAVATOR.approachT >= 1) {
      EXCAVATOR.approachT = 1;
      EXCAVATOR.state = 'ready';
      _setInteractPromptExc('굴착기 탑승');
    }
    const t = EXCAVATOR.approachT;
    EXCAVATOR.posZ = _APPROACH_START_Z + (_APPROACH_END_Z - _APPROACH_START_Z) * t;
    EXCAVATOR.root.position.z = EXCAVATOR.posZ;
  }

  if (EXCAVATOR.state === 'leaving') {
    EXCAVATOR.leaveT += dt / _LEAVE_DUR;
    if (EXCAVATOR.leaveT >= 1) {
      EXCAVATOR.leaveT = 1;
      EXCAVATOR.state = 'gone';
      EXCAVATOR.root.setEnabled(false);
      return;
    }
    const t = EXCAVATOR.leaveT;
    EXCAVATOR.posZ = _APPROACH_END_Z + (_APPROACH_START_Z - _APPROACH_END_Z) * t;
    EXCAVATOR.root.position.z = EXCAVATOR.posZ;
  }

  if (EXCAVATOR.state === 'ready' && !EXCAVATOR.mounted) {
    // 플레이어 근접 체크 — 탑승 프롬프트 표시
    if (GAME.player) {
      const d = BABYLON.Vector3.Distance(GAME.player.position, EXCAVATOR.root.position);
      const ip = document.getElementById('interact-prompt');
      if (ip) ip.style.display = d < 3.5 ? 'flex' : 'none';
    }
  }

  if (EXCAVATOR.state === 'mounted') {
    _handleExcMovement(dt);
    _updateExcCamera();
    _checkDigging(dt);
  }

  // 붐/암/버킷 Z키/X키
  if (EXCAVATOR.state === 'mounted') {
    if (EXCAVATOR.keys.z) EXCAVATOR.bucketAngle = Math.max(-1.20, EXCAVATOR.bucketAngle - 0.025);
    if (EXCAVATOR.keys.x) EXCAVATOR.bucketAngle = Math.min( 0.80, EXCAVATOR.bucketAngle + 0.025);
    EXCAVATOR.digCooldown = Math.max(0, EXCAVATOR.digCooldown - dt);
  }

  // 각도 적용
  if (EXCAVATOR.boom) EXCAVATOR.boom.rotation.x   = EXCAVATOR.boomAngle;
  if (EXCAVATOR.arm)  EXCAVATOR.arm.rotation.x    = EXCAVATOR.armAngle;
  if (EXCAVATOR.bucket) EXCAVATOR.bucket.rotation.x = EXCAVATOR.bucketAngle;

  // root 위치/회전 업데이트 (mounted 중 이동)
  if (EXCAVATOR.state === 'mounted') {
    EXCAVATOR.root.position.x = EXCAVATOR.posX;
    EXCAVATOR.root.position.z = EXCAVATOR.posZ;
    EXCAVATOR.root.rotation.y = EXCAVATOR.yaw;
  }
}

function _handleExcMovement(dt) {
  const spd = EXCAVATOR.moveSpeed;
  const jx = EXCAVATOR.joyX, jy = EXCAVATOR.joyY;
  const kw = EXCAVATOR.keys.w || jy < -0.2;
  const ks = EXCAVATOR.keys.s || jy >  0.2;
  const ka = EXCAVATOR.keys.a || jx < -0.2;
  const kd = EXCAVATOR.keys.d || jx >  0.2;

  if (ka) EXCAVATOR.yaw -= EXCAVATOR.turnSpeed;
  if (kd) EXCAVATOR.yaw += EXCAVATOR.turnSpeed;

  const fwdX = Math.sin(EXCAVATOR.yaw);
  const fwdZ = Math.cos(EXCAVATOR.yaw);
  if (kw) { EXCAVATOR.posX += fwdX * spd; EXCAVATOR.posZ += fwdZ * spd; }
  if (ks) { EXCAVATOR.posX -= fwdX * spd * 0.7; EXCAVATOR.posZ -= fwdZ * spd * 0.7; }

  EXCAVATOR.posX = Math.max(-38, Math.min(38, EXCAVATOR.posX));
  EXCAVATOR.posZ = Math.max(-18, Math.min(45, EXCAVATOR.posZ));
}

function _updateExcCamera() {
  const desiredAlpha = -EXCAVATOR.yaw - Math.PI / 2;
  GAME.camera.alpha = BABYLON.Scalar.Lerp(GAME.camera.alpha, desiredAlpha, 0.08);
  GAME.camera.target = BABYLON.Vector3.Lerp(
    GAME.camera.target,
    new BABYLON.Vector3(EXCAVATOR.posX, 2.0, EXCAVATOR.posZ),
    0.12
  );
}

function _checkDigging(dt) {
  if (EXCAVATOR.digCooldown > 0) return;
  if (!EXCAVATOR.bucketTip) return;
  EXCAVATOR.bucketTip.computeWorldMatrix(true);
  const tip = EXCAVATOR.bucketTip.getAbsolutePosition();
  if (typeof TERRAIN === 'undefined') return;
  if (!TERRAIN.isInsideArea(tip.x, tip.z)) return;
  const surfY = TERRAIN.surfaceY(tip.x, tip.z);
  if (tip.y < surfY - 0.05 && EXCAVATOR.bucketAngle < -0.30) {
    TERRAIN.digAtPosition(tip.x, tip.y, tip.z);
    EXCAVATOR.digCooldown = 0.25;
  }
}

/* ─── 탑승/하차 ──────────────────────────────────────────── */
function mountExcavator() {
  if (EXCAVATOR.state !== 'ready') return;
  EXCAVATOR.mounted = true;
  EXCAVATOR.state   = 'mounted';
  PLAYER.locked     = true;
  if (GAME.player) GAME.player.setEnabled(false);

  GAME.camera.lowerRadiusLimit = 6;
  GAME.camera.upperRadiusLimit = 14;
  GAME.camera.radius = 9;
  GAME.camera.beta   = Math.PI / 3.2;

  const ip = document.getElementById('interact-prompt');
  if (ip) ip.style.display = 'none';
  const hint = document.getElementById('excavator-hint');
  if (hint) hint.style.display = 'flex';
  const excProg = document.getElementById('excavation-progress');
  if (excProg) excProg.style.display = 'block';
  const mobileBtn = document.getElementById('exc-bucket-roll');
  if (mobileBtn && ('ontouchstart' in window)) mobileBtn.style.display = 'flex';
}

function _unmountExcavator() {
  EXCAVATOR.mounted = false;
  PLAYER.locked = false;
  if (GAME.player) GAME.player.setEnabled(true);
  GAME.camera.lowerRadiusLimit = 3;
  GAME.camera.upperRadiusLimit = 20;
  GAME.camera.radius = 8;
  const hint = document.getElementById('excavator-hint');
  if (hint) hint.style.display = 'none';
  const mobileBtn = document.getElementById('exc-bucket-roll');
  if (mobileBtn) mobileBtn.style.display = 'none';
}

/* ─── 상호작용 프롬프트 ──────────────────────────────────── */
function _setInteractPromptExc(msg) {
  const ip = document.getElementById('interact-prompt');
  const lbl = ip ? ip.querySelector('.ip-label') : null;
  if (lbl) lbl.textContent = msg;
}

/* ─── 키 바인딩 ──────────────────────────────────────────── */
function _bindExcKeys() {
  window.addEventListener('keydown', e => {
    if (!EXCAVATOR.mounted && EXCAVATOR.state !== 'ready') return;

    // ready 상태에서 E키 → 탑승
    if ((e.key === 'e' || e.key === 'E') && EXCAVATOR.state === 'ready') {
      if (GAME.player) {
        const d = BABYLON.Vector3.Distance(GAME.player.position, EXCAVATOR.root.position);
        if (d < 3.5) { mountExcavator(); return; }
      }
    }
    if (!EXCAVATOR.mounted) return;

    if (e.key === 'w' || e.key === 'W') EXCAVATOR.keys.w = true;
    if (e.key === 'a' || e.key === 'A') EXCAVATOR.keys.a = true;
    if (e.key === 's' || e.key === 'S') EXCAVATOR.keys.s = true;
    if (e.key === 'd' || e.key === 'D') EXCAVATOR.keys.d = true;
    if (e.key === 'z' || e.key === 'Z') EXCAVATOR.keys.z = true;
    if (e.key === 'x' || e.key === 'X') EXCAVATOR.keys.x = true;
  });
  window.addEventListener('keyup', e => {
    if (e.key === 'w' || e.key === 'W') EXCAVATOR.keys.w = false;
    if (e.key === 'a' || e.key === 'A') EXCAVATOR.keys.a = false;
    if (e.key === 's' || e.key === 'S') EXCAVATOR.keys.s = false;
    if (e.key === 'd' || e.key === 'D') EXCAVATOR.keys.d = false;
    if (e.key === 'z' || e.key === 'Z') EXCAVATOR.keys.z = false;
    if (e.key === 'x' || e.key === 'X') EXCAVATOR.keys.x = false;
  });
}

function _bindExcDrag() {
  const canvas = GAME.scene.getEngine().getRenderingCanvas();
  canvas.addEventListener('mousemove', e => {
    if (!EXCAVATOR.mounted) return;
    if (!EXCAVATOR.dragActive) return;
    const dx = e.clientX - EXCAVATOR.dragLastX;
    const dy = e.clientY - EXCAVATOR.dragLastY;
    EXCAVATOR.dragLastX = e.clientX;
    EXCAVATOR.dragLastY = e.clientY;
    EXCAVATOR.boomAngle = Math.max(-0.80, Math.min(0.35, EXCAVATOR.boomAngle + dy * 0.004));
    EXCAVATOR.armAngle  = Math.max(-1.40, Math.min(0.30, EXCAVATOR.armAngle  + dx * 0.005));
  });
  canvas.addEventListener('mousedown', e => {
    if (!EXCAVATOR.mounted) return;
    EXCAVATOR.dragActive = true;
    EXCAVATOR.dragLastX  = e.clientX;
    EXCAVATOR.dragLastY  = e.clientY;
  });
  canvas.addEventListener('mouseup', () => { EXCAVATOR.dragActive = false; });
}
