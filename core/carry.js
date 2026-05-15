// carry.js — 자재 집기 / 운반 / 설치 시스템

const MATERIAL = {
  GUARDRAIL: 'guardrail',
  CONE:      'cone',
};

const CARRY = {
  held:       null,   // {type, mesh} | null
  nearbyPile: null,
  nearbyZone: null,
  baseSpeed:  0.055,
  carrySpeed: 0.032,
};

const INTERACT_DIST = 2.2;

/* ─── 초기화 ─────────────────────────────────────────────── */
window.addEventListener('game:ready', () => {
  CARRY.baseSpeed = PLAYER.speed;
  GAME.scene.onBeforeRenderObservable.add(_carryTick);
  _bindInput();
});

function _carryTick() {
  if (GAME.currentScene !== 'site') return;
  if (GAME.state.dialogActive) return;
  if (!GAME.carryZones || !GAME.materialPiles) return;
  if (PHASE.current !== 'install') {
    CARRY.nearbyPile = null;
    CARRY.nearbyZone = null;
    const btn = document.getElementById('ctx-action-btn');
    if (btn) btn.classList.remove('show');
    return;
  }
  CARRY.nearbyPile = _findNearestPile();
  CARRY.nearbyZone = _findNearestEmptyZone(CARRY.held ? CARRY.held.type : null);
  _updateGhostHighlight();
  _updateCarryHUD();
  _updateChecklistHUD();
  _updateContextButton();
}

/* ─── 근접 탐색 ──────────────────────────────────────────── */
function _findNearestPile() {
  if (!GAME.player || !GAME.materialPiles) return null;
  const p = GAME.player.position;
  let best = null, bestD = INTERACT_DIST;
  GAME.materialPiles.forEach(pile => {
    if (pile.count <= 0) return;
    const dx = p.x - pile.x, dz = p.z - pile.z;
    const d = Math.sqrt(dx*dx + dz*dz);
    if (d < bestD) { bestD = d; best = pile; }
  });
  return best;
}

function _findNearestEmptyZone(type) {
  if (!GAME.player || !GAME.carryZones) return null;
  const p = GAME.player.position;
  let best = null, bestD = INTERACT_DIST;
  GAME.carryZones.forEach(z => {
    if (z.occupied) return;
    if (type && z.type !== type) return;
    const dx = p.x - z.x, dz = p.z - z.z;
    const d = Math.sqrt(dx*dx + dz*dz);
    if (d < bestD) { bestD = d; best = z; }
  });
  return best;
}

/* ─── 집기 / 놓기 ────────────────────────────────────────── */
function pickupItem(pile) {
  if (CARRY.held) return;
  if (!pile || pile.count <= 0) return;
  const type = pile.type;
  let mesh;
  if (type === MATERIAL.GUARDRAIL) {
    mesh = BABYLON.MeshBuilder.CreateBox('held_rail', {width:1.6, height:0.06, depth:0.06}, GAME.scene);
    const m = new BABYLON.PBRMaterial('held_railM', GAME.scene);
    m.albedoColor = new BABYLON.Color3(0.55, 0.56, 0.58);
    m.metallic = 0.7; m.roughness = 0.4;
    mesh.material = m;
    mesh.rotation = new BABYLON.Vector3(0, 0, Math.PI/2);
  } else {
    mesh = BABYLON.MeshBuilder.CreateCylinder('held_cone',
      {diameterTop:0.05, diameterBottom:0.32, height:0.5, tessellation:12}, GAME.scene);
    const m = new BABYLON.PBRMaterial('held_coneM', GAME.scene);
    m.albedoColor = new BABYLON.Color3(0.95, 0.45, 0.10);
    m.metallic = 0.0; m.roughness = 0.78;
    mesh.material = m;
  }
  mesh.parent = GAME.player;
  mesh.position = new BABYLON.Vector3(0, 0.95, 0.35);
  mesh.isPickable = false;

  CARRY.held = { type, mesh };
  GAME.heldItem = CARRY.held;
  PLAYER.speed = CARRY.carrySpeed;

  pile.count -= 1;
  if (pile.count <= 0 && pile.mesh) pile.mesh.isVisible = false;
  _updateCarryHUD();
}

function placeItem() {
  if (!CARRY.held || !CARRY.nearbyZone) return;
  if (CARRY.nearbyZone.type !== CARRY.held.type) return;

  CARRY.held.mesh.dispose();
  _spawnFinalMesh(CARRY.nearbyZone);

  CARRY.nearbyZone.occupied = true;
  if (CARRY.nearbyZone.ghostMesh) CARRY.nearbyZone.ghostMesh.isVisible = false;

  const zone = CARRY.nearbyZone;
  CARRY.held = null;
  GAME.heldItem = null;
  CARRY.nearbyZone = null;
  PLAYER.speed = CARRY.baseSpeed;

  _onZoneFilled(zone);
  _updateCarryHUD();
}

/* ─── 최종 mesh 스폰 ─────────────────────────────────────── */
function _spawnFinalMesh(zone) {
  let mesh;
  if (zone.type === MATERIAL.GUARDRAIL) {
    mesh = BABYLON.MeshBuilder.CreateBox('final_'+zone.id, {width:1.6, height:0.02, depth:0.05}, GAME.scene);
    mesh.position = new BABYLON.Vector3(zone.x, 0.85, zone.z);
    mesh.rotation.y = zone.rotY || 0;
    // 수직 포스트 2개
    [-0.65, 0.65].forEach((dx, i) => {
      const post = BABYLON.MeshBuilder.CreateBox('finalP_'+zone.id+'_'+i, {width:0.05, height:0.9, depth:0.05}, GAME.scene);
      post.position = new BABYLON.Vector3(zone.x, 0.45, zone.z);
      const ox = Math.cos(zone.rotY||0)*dx, oz = -Math.sin(zone.rotY||0)*dx;
      post.position.x += ox; post.position.z += oz;
      const pm = new BABYLON.PBRMaterial('finalPM_'+zone.id+'_'+i, GAME.scene);
      pm.albedoColor = new BABYLON.Color3(0.92, 0.15, 0.15);
      pm.metallic = 0.3; pm.roughness = 0.6;
      post.material = pm;
      GAME.siteMeshes.push(post);
    });
    const rm = new BABYLON.PBRMaterial('finalRM_'+zone.id, GAME.scene);
    rm.albedoColor = new BABYLON.Color3(0.92, 0.15, 0.15);
    rm.metallic = 0.3; rm.roughness = 0.6;
    mesh.material = rm;
  } else {
    mesh = BABYLON.MeshBuilder.CreateCylinder('final_'+zone.id,
      {diameterTop:0.05, diameterBottom:0.32, height:0.5, tessellation:12}, GAME.scene);
    mesh.position = new BABYLON.Vector3(zone.x, 0.25, zone.z);
    const cm = new BABYLON.PBRMaterial('finalCM_'+zone.id, GAME.scene);
    cm.albedoColor = new BABYLON.Color3(0.95, 0.45, 0.10);
    cm.metallic = 0.0; cm.roughness = 0.78;
    mesh.material = cm;
  }
  mesh.isPickable = false;
  zone.finalMesh = mesh;
  GAME.siteMeshes.push(mesh);
}

/* ─── 외부 노출 (NPC 위임용) ─────────────────────────────── */
window._carrySpawnFinalMesh = _spawnFinalMesh;
window._carryOnZoneFilled   = _onZoneFilled;

/* ─── 체크리스트 갱신 ────────────────────────────────────── */
function _onZoneFilled(zone) {
  if (zone.type === MATERIAL.GUARDRAIL) {
    PHASE.checklist.guardrails.done = Math.min(
      PHASE.checklist.guardrails.done + 1, PHASE.checklist.guardrails.total);
  } else {
    PHASE.checklist.cones.done = Math.min(
      PHASE.checklist.cones.done + 1, PHASE.checklist.cones.total);
  }
  _updateChecklistHUD();
  _checkChecklistDone();
}

function _checkChecklistDone() {
  const cl = PHASE.checklist;
  if (cl.guardrails.done >= cl.guardrails.total && cl.cones.done >= cl.cones.total) {
    PHASE.flags.installDone = true;
    PHASE.current = 'excavation';
    window.dispatchEvent(new CustomEvent('phase:installComplete'));
  }
}

/* ─── HUD 갱신 ──────────────────────────────────────────── */
function _updateCarryHUD() {
  const hud = document.getElementById('carry-hud');
  if (!hud) return;
  if (CARRY.held) {
    hud.style.display = 'flex';
    const nameEl = document.getElementById('carry-name');
    if (nameEl) nameEl.textContent = CARRY.held.type === MATERIAL.GUARDRAIL ? '난간 파이프' : '라바콘';
  } else {
    hud.style.display = 'none';
  }
}

function _updateChecklistHUD() {
  const cl = PHASE.checklist;
  const railEl = document.getElementById('cl-rail');
  const coneEl = document.getElementById('cl-cone');
  if (railEl) railEl.textContent = cl.guardrails.done;
  if (coneEl) coneEl.textContent = cl.cones.done;
  const listEl = document.getElementById('install-checklist');
  if (listEl) listEl.style.display = PHASE.current === 'install' ? 'block' : 'none';
}

/* ─── ghost 하이라이트 ───────────────────────────────────── */
function _updateGhostHighlight() {
  if (!GAME.carryZones) return;
  GAME.carryZones.forEach(z => {
    if (!z.ghostMesh || z.occupied) return;
    const isNear = CARRY.nearbyZone === z && CARRY.held && CARRY.held.type === z.type;
    const m = z.ghostMesh.material;
    if (!m) return;
    if (isNear) {
      m.diffuseColor  = new BABYLON.Color3(0.55, 0.87, 0.24);
      m.emissiveColor = new BABYLON.Color3(0.22, 0.45, 0.09);
      m.alpha = 0.6;
    } else {
      m.diffuseColor  = new BABYLON.Color3(0.45, 0.55, 0.70);
      m.emissiveColor = new BABYLON.Color3(0.18, 0.24, 0.36);
      m.alpha = 0.35;
    }
  });
}

/* ─── 컨텍스트 버튼 ─────────────────────────────────────── */
function _updateContextButton() {
  const btn = document.getElementById('ctx-action-btn');
  const lbl = document.getElementById('ctx-action-label');
  if (!btn || !lbl) return;

  let label = null;
  if (CARRY.held && CARRY.nearbyZone && CARRY.nearbyZone.type === CARRY.held.type) {
    label = '여기 놓기';
  } else if (!CARRY.held && CARRY.nearbyPile && CARRY.nearbyPile.count > 0) {
    label = '집기 (' + (CARRY.nearbyPile.type === MATERIAL.GUARDRAIL ? '난간' : '라바콘') + ')';
  } else if (!CARRY.held && _nearestNpcForDelegate() && _firstAvailableZone()) {
    label = '위임: 갖다놔';
  }

  if (label) {
    btn.classList.add('show');
    lbl.textContent = label;
  } else {
    btn.classList.remove('show');
  }
}

function _nearestNpcForDelegate() {
  if (typeof NPCS === 'undefined' || !NPCS.length) return null;
  const p = GAME.player.position;
  let best = null, bestD = 2.5;
  NPCS.forEach(npc => {
    if (!npc.mesh || npc.task) return;
    const d = BABYLON.Vector3.Distance(p, npc.mesh.position);
    if (d < bestD) { bestD = d; best = npc; }
  });
  return best;
}

function _firstAvailableZone() {
  if (!GAME.carryZones) return null;
  return GAME.carryZones.find(z => !z.occupied) || null;
}

/* ─── 입력 바인딩 ───────────────────────────────────────── */
function _bindInput() {
  window.addEventListener('keydown', e => {
    if (GAME.currentScene !== 'site') return;
    if (GAME.state.dialogActive) return;
    if (e.key !== 'e' && e.key !== 'E') return;
    // 굴착기 탑승 중 혹은 ready 상태에서 근접 시 → carry.js는 양보
    if (typeof EXCAVATOR !== 'undefined') {
      if (EXCAVATOR.mounted) return;
      if (EXCAVATOR.state === 'ready' && GAME.player) {
        const d = BABYLON.Vector3.Distance(GAME.player.position, EXCAVATOR.root.position);
        if (d < 3.5) return;
      }
    }
    const ip = document.getElementById('interact-prompt');
    if (ip && ip.style.display !== 'none') return;
    _onInteract();
  });

  const btn = document.getElementById('ctx-action-btn');
  if (btn) {
    btn.addEventListener('click', _onInteract);
    btn.addEventListener('touchstart', ev => {
      ev.stopPropagation();
      _onInteract();
    }, { passive: true });
  }
}

function _onInteract() {
  if (PHASE.current !== 'install') return;
  if (GAME.state.dialogActive) return;

  // 1순위: 들고 있고 스냅 존 근처 → 놓기
  if (CARRY.held && CARRY.nearbyZone && CARRY.nearbyZone.type === CARRY.held.type) {
    placeItem();
    return;
  }

  // 2순위: 빈손 + 자재 더미 근처 → 집기
  if (!CARRY.held && CARRY.nearbyPile && CARRY.nearbyPile.count > 0) {
    pickupItem(CARRY.nearbyPile);
    return;
  }

  // 3순위: 빈손 + 가까운 NPC + 빈 zone → 위임
  const npc = _nearestNpcForDelegate();
  const zone = _firstAvailableZone();
  if (!CARRY.held && npc && zone) {
    const pile = GAME.materialPiles ? GAME.materialPiles.find(p => p.type === zone.type && p.count > 0) : null;
    if (pile && typeof npc.goAndPlace === 'function') {
      npc.goAndPlace(pile, zone);
    }
  }
}
