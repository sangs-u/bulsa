// carry.js — 자재 집기 / 운반 / 설치 (부재 단위 행위=오브젝트)
// 수직재(post) / 수평재(rail) / 라바콘(cone)
// - 수직재: 자유 위치 박기, 최대 5개 운반
// - 수평재: 가까운 수직재 2개 사이 자동 정렬, 최대 2개 운반
// - 라바콘: 미리 정의된 carryZone, 최대 1개 운반

const MATERIAL = {
  POST: 'post',
  RAIL: 'rail',
  CONE: 'cone',
};

const MAX_CARRY = {
  post: 5,
  rail: 2,
  cone: 1,
};

const CARRY = {
  held:       null,   // {type, count, mesh} | null
  nearbyPile: null,
  nearbyZone: null,   // cone 전용
  baseSpeed:  0.055,
  carrySpeed: 0.032,
};

const INTERACT_DIST = 2.2;
const PLACE_DIST    = 2.0;   // 플레이어 전방 설치 거리
const GAP_MAX       = 3.2;   // 수평재 연결 최대 간격
const POST_H        = 1.15;  // 수직재 높이
const RAIL_H1       = 1.02;  // 상단 수평재 높이
const RAIL_H2       = 0.52;  // 중단 수평재 높이
const POST_D        = 0.06;  // 수직재 지름

// 설치된 부재 추적 (수평재 자동 정렬용)
const PLACED = {
  posts: [],   // [{id, mesh, x, z}]
  rails: [],   // [{id, mT, mM, aId, bId}]
  _n: 0,
};

let _ghost = { post: null, rail: null, cone: null }; // 미리보기 ghost

/* ─── 초기화 ─────────────────────────────────────────────── */
window.addEventListener('game:ready', () => {
  CARRY.baseSpeed = PLAYER.speed;
  _makeGhosts();
  GAME.scene.onBeforeRenderObservable.add(_carryTick);
  _bindInput();
});

function _makeGhosts() {
  // 수직재 ghost
  _ghost.post = BABYLON.MeshBuilder.CreateCylinder('cGhostPost',
    { diameter: POST_D, height: POST_H, tessellation: 8 }, GAME.scene);
  const gm1 = new BABYLON.StandardMaterial('cGhostPostM', GAME.scene);
  gm1.diffuseColor    = new BABYLON.Color3(0.2, 0.7, 1.0);
  gm1.emissiveColor   = new BABYLON.Color3(0.1, 0.4, 0.6);
  gm1.alpha           = 0.45;
  gm1.backFaceCulling = false;
  _ghost.post.material   = gm1;
  _ghost.post.isPickable = false;
  _ghost.post.setEnabled(false);

  // 수평재 ghost (상단 + 중단 두 줄)
  const railGroup = new BABYLON.TransformNode('cGhostRail', GAME.scene);
  const top = BABYLON.MeshBuilder.CreateBox('cGhostRailT', { width: POST_D, height: POST_D, depth: GAP_MAX }, GAME.scene);
  const mid = BABYLON.MeshBuilder.CreateBox('cGhostRailM', { width: POST_D, height: POST_D, depth: GAP_MAX }, GAME.scene);
  top.parent = mid.parent = railGroup;
  top.position.y = RAIL_H1; mid.position.y = RAIL_H2;
  top.material = mid.material = gm1;
  top.isPickable = mid.isPickable = false;
  _ghost.rail = railGroup;
  _ghost.rail.setEnabled(false);
  _ghost.rail._top = top;
  _ghost.rail._mid = mid;

  // 라바콘 ghost
  _ghost.cone = BABYLON.MeshBuilder.CreateCylinder('cGhostCone',
    { diameterTop: 0.05, diameterBottom: 0.32, height: 0.5, tessellation: 12 }, GAME.scene);
  _ghost.cone.material   = gm1;
  _ghost.cone.isPickable = false;
  _ghost.cone.setEnabled(false);
}

/* ─── 매 프레임 ──────────────────────────────────────────── */
function _carryTick() {
  if (GAME.currentScene !== 'site') return;
  if (GAME.state.dialogActive) return;
  if (PHASE.current !== 'install') {
    CARRY.nearbyPile = null;
    CARRY.nearbyZone = null;
    CARRY.nearbyNpc  = null;
    _ghost.post.setEnabled(false);
    _ghost.rail.setEnabled(false);
    const btn = document.getElementById('ctx-action-btn');
    if (btn) btn.classList.remove('show');
    return;
  }

  CARRY.nearbyPile = _findNearestPile();
  CARRY.nearbyNpc  = _findNearestIdleNpc();

  _updatePreview();
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
    const d = Math.hypot(p.x - pile.x, p.z - pile.z);
    if (d < bestD) { bestD = d; best = pile; }
  });
  return best;
}

function _findNearestIdleNpc() {
  if (typeof NPCS === 'undefined' || !NPCS.length || !GAME.player) return null;
  const p = GAME.player.position;
  let best = null, bestD = 2.5;
  NPCS.forEach(n => {
    if (!n.mesh || n.task) return;
    const d = Math.hypot(p.x - n.mesh.position.x, p.z - n.mesh.position.z);
    if (d < bestD) { bestD = d; best = n; }
  });
  return best;
}

function _fwd() {
  if (!GAME.camera) return new BABYLON.Vector3(0, 0, 1);
  const v = GAME.camera.target.subtract(GAME.camera.position);
  v.y = 0;
  const l = v.length();
  return l > 0.001 ? v.scaleInPlace(1 / l) : new BABYLON.Vector3(0, 0, 1);
}

function _placePos() {
  const p = GAME.player.position, f = _fwd();
  return { x: p.x + f.x * PLACE_DIST, z: p.z + f.z * PLACE_DIST };
}

function _nearestPostPair() {
  const p = _placePos();
  let best = null, bestD = 8.0;
  for (let i = 0; i < PLACED.posts.length; i++) {
    for (let j = i + 1; j < PLACED.posts.length; j++) {
      const a = PLACED.posts[i], b = PLACED.posts[j];
      const gap = Math.hypot(b.x - a.x, b.z - a.z);
      if (gap > GAP_MAX) continue;
      const exists = PLACED.rails.some(r =>
        (r.aId === a.id && r.bId === b.id) || (r.aId === b.id && r.bId === a.id));
      if (exists) continue;
      const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2;
      const d  = Math.hypot(p.x - mx, p.z - mz);
      if (d < bestD) { bestD = d; best = [a, b]; }
    }
  }
  return best;
}

/* ─── 미리보기 ghost 업데이트 ────────────────────────────── */
function _updatePreview() {
  const hide = () => { _ghost.post.setEnabled(false); _ghost.rail.setEnabled(false); _ghost.cone.setEnabled(false); };
  if (!CARRY.held || CARRY.held.count <= 0) { hide(); return; }

  hide();
  const p = _placePos();
  if (CARRY.held.type === MATERIAL.POST) {
    _ghost.post.position.set(p.x, POST_H / 2, p.z);
    _ghost.post.setEnabled(true);
  } else if (CARRY.held.type === MATERIAL.RAIL) {
    const pair = _nearestPostPair();
    if (pair) {
      const mx   = (pair[0].x + pair[1].x) / 2;
      const mz   = (pair[0].z + pair[1].z) / 2;
      const dist = Math.hypot(pair[1].x - pair[0].x, pair[1].z - pair[0].z);
      const ang  = Math.atan2(pair[1].x - pair[0].x, pair[1].z - pair[0].z);
      _ghost.rail.position.set(mx, 0, mz);
      _ghost.rail.rotation.y = ang;
      _ghost.rail._top.scaling.z = dist / GAP_MAX;
      _ghost.rail._mid.scaling.z = dist / GAP_MAX;
      _ghost.rail.setEnabled(true);
    }
  } else if (CARRY.held.type === MATERIAL.CONE) {
    _ghost.cone.position.set(p.x, 0.25, p.z);
    _ghost.cone.setEnabled(true);
  }
}

/* ─── 집기 ──────────────────────────────────────────────── */
function pickupItem(pile) {
  if (!pile || pile.count <= 0) return;

  // 다른 종류 들고 있으면 거부
  if (CARRY.held && CARRY.held.type !== pile.type) {
    _msg('손에 든 자재를 먼저 모두 설치하세요');
    return;
  }

  const max = MAX_CARRY[pile.type] || 1;
  if (CARRY.held && CARRY.held.count >= max) {
    _msg('최대 ' + max + '개까지만 들 수 있습니다');
    return;
  }

  if (!CARRY.held) {
    CARRY.held = { type: pile.type, count: 0, mesh: null };
    GAME.heldItem = CARRY.held;
    PLAYER.speed = CARRY.carrySpeed;
  }
  CARRY.held.count++;
  pile.count--;
  if (pile.count <= 0 && pile.mesh) pile.mesh.isVisible = false;

  _updateHeldMesh();
  _updateCarryHUD();

  if (window.CHARACTER_API) window.CHARACTER_API.playOnce('interact', 'idle');
}

function _updateHeldMesh() {
  if (!CARRY.held) return;
  if (CARRY.held.mesh) return;  // 이미 있으면 유지 (개수만 카운트로 표시)

  let m;
  if (CARRY.held.type === MATERIAL.POST) {
    m = BABYLON.MeshBuilder.CreateCylinder('held_post', { diameter: POST_D, height: POST_H, tessellation: 8 }, GAME.scene);
    m.rotation = new BABYLON.Vector3(0, 0, Math.PI / 2);
  } else if (CARRY.held.type === MATERIAL.RAIL) {
    m = BABYLON.MeshBuilder.CreateBox('held_rail', { width: 2.2, height: 0.06, depth: 0.06 }, GAME.scene);
    m.rotation = new BABYLON.Vector3(0, 0, Math.PI / 2);
  } else {
    m = BABYLON.MeshBuilder.CreateCylinder('held_cone',
      { diameterTop: 0.05, diameterBottom: 0.32, height: 0.5, tessellation: 12 }, GAME.scene);
  }
  m.parent = GAME.player;
  m.position = new BABYLON.Vector3(0, 0.95, 0.35);
  m.isPickable = false;

  const mat = new BABYLON.PBRMaterial('held_mat_' + CARRY.held.type, GAME.scene);
  if (CARRY.held.type === MATERIAL.CONE) {
    mat.albedoColor = new BABYLON.Color3(0.95, 0.45, 0.10);
    mat.metallic = 0.0; mat.roughness = 0.78;
  } else {
    mat.albedoColor = new BABYLON.Color3(0.55, 0.56, 0.58);
    mat.metallic = 0.62; mat.roughness = 0.45;
  }
  m.material = mat;
  CARRY.held.mesh = m;
}

/* ─── 설치 ──────────────────────────────────────────────── */
function placeItem() {
  if (!CARRY.held || CARRY.held.count <= 0) return;

  if (CARRY.held.type === MATERIAL.POST) {
    const p = _placePos();
    _spawnPost(p.x, p.z);
    CARRY.held.count--;
    PHASE.checklist.posts.done = Math.min(
      PHASE.checklist.posts.done + 1, PHASE.checklist.posts.total);
  } else if (CARRY.held.type === MATERIAL.RAIL) {
    const pair = _nearestPostPair();
    if (!pair) { _msg('수직재 2개가 가까이 있어야 수평재를 걸 수 있습니다'); return; }
    _spawnRail(pair[0], pair[1]);
    CARRY.held.count--;
    PHASE.checklist.rails.done = Math.min(
      PHASE.checklist.rails.done + 1, PHASE.checklist.rails.total);
  } else if (CARRY.held.type === MATERIAL.CONE) {
    const p = _placePos();
    _spawnCone(p.x, p.z);
    CARRY.held.count--;
    PHASE.checklist.cones.done = Math.min(
      PHASE.checklist.cones.done + 1, PHASE.checklist.cones.total);
  }

  // 다 떨어지면 손 비움
  if (CARRY.held.count <= 0) {
    if (CARRY.held.mesh) CARRY.held.mesh.dispose();
    CARRY.held = null;
    GAME.heldItem = null;
    PLAYER.speed = CARRY.baseSpeed;
  }

  _updateCarryHUD();
  _checkChecklistDone();

  if (window.CHARACTER_API) window.CHARACTER_API.playOnce('interact', 'idle');
}

/* ─── 부재 스폰 ──────────────────────────────────────────── */
function _spawnPost(x, z) {
  const mesh = BABYLON.MeshBuilder.CreateCylinder('post_' + PLACED._n,
    { diameter: POST_D, height: POST_H, tessellation: 8 }, GAME.scene);
  mesh.position = new BABYLON.Vector3(x, POST_H / 2, z);
  const mat = new BABYLON.PBRMaterial('postMat_' + PLACED._n, GAME.scene);
  mat.albedoColor = new BABYLON.Color3(0.92, 0.15, 0.15);
  mat.metallic = 0.3; mat.roughness = 0.6;
  mesh.material = mat;
  if (GAME.shadowGen) GAME.shadowGen.addShadowCaster(mesh);
  PLACED.posts.push({ id: 'p' + PLACED._n, mesh, x, z });
  GAME.siteMeshes.push(mesh);
  PLACED._n++;
}

function _spawnRail(a, b) {
  const mx   = (a.x + b.x) / 2;
  const mz   = (a.z + b.z) / 2;
  const dist = Math.hypot(b.x - a.x, b.z - a.z);
  const ang  = Math.atan2(b.x - a.x, b.z - a.z);
  const mat = new BABYLON.PBRMaterial('railMat_' + PLACED._n, GAME.scene);
  mat.albedoColor = new BABYLON.Color3(0.92, 0.15, 0.15);
  mat.metallic = 0.3; mat.roughness = 0.6;

  function mkRail(name, y) {
    const m = BABYLON.MeshBuilder.CreateBox(name,
      { width: POST_D, height: POST_D, depth: dist }, GAME.scene);
    m.position = new BABYLON.Vector3(mx, y, mz);
    m.rotation.y = ang;
    m.material = mat;
    if (GAME.shadowGen) GAME.shadowGen.addShadowCaster(m);
    GAME.siteMeshes.push(m);
    return m;
  }
  const id = 'r' + PLACED._n;
  PLACED.rails.push({
    id,
    mT:  mkRail('rT_' + id, RAIL_H1),
    mM:  mkRail('rM_' + id, RAIL_H2),
    aId: a.id, bId: b.id,
  });
  PLACED._n++;
}

function _spawnCone(x, z) {
  const mesh = BABYLON.MeshBuilder.CreateCylinder('cone_' + PLACED._n,
    { diameterTop: 0.05, diameterBottom: 0.32, height: 0.5, tessellation: 12 }, GAME.scene);
  mesh.position = new BABYLON.Vector3(x, 0.25, z);
  const mat = new BABYLON.PBRMaterial('coneMat_' + PLACED._n, GAME.scene);
  mat.albedoColor = new BABYLON.Color3(0.95, 0.45, 0.10);
  mat.metallic = 0.0; mat.roughness = 0.78;
  mesh.material = mat;
  mesh.isPickable = false;
  if (GAME.shadowGen) GAME.shadowGen.addShadowCaster(mesh);
  GAME.siteMeshes.push(mesh);
  PLACED._n++;
}

/* ─── 진행도 ────────────────────────────────────────────── */
function _checkChecklistDone() {
  const cl = PHASE.checklist;
  if (cl.posts.done >= cl.posts.total &&
      cl.rails.done >= cl.rails.total &&
      cl.cones.done >= cl.cones.total) {
    PHASE.flags.installDone = true;
    PHASE.current = 'excavation';
    window.dispatchEvent(new CustomEvent('phase:installComplete'));
  }
}

/* ─── HUD ──────────────────────────────────────────────── */
function _updateCarryHUD() {
  const hud = document.getElementById('carry-hud');
  if (!hud) return;
  if (CARRY.held && CARRY.held.count > 0) {
    hud.style.display = 'flex';
    const nameEl = document.getElementById('carry-name');
    if (nameEl) {
      const labels = { post: '수직재', rail: '수평재', cone: '라바콘' };
      nameEl.textContent = (labels[CARRY.held.type] || '자재') + ' ×' + CARRY.held.count;
    }
  } else {
    hud.style.display = 'none';
  }
}

function _updateChecklistHUD() {
  const cl = PHASE.checklist;
  const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  set('cl-post', cl.posts.done);
  set('cl-rail', cl.rails.done);
  set('cl-cone', cl.cones.done);
  const listEl = document.getElementById('install-checklist');
  if (listEl) listEl.style.display = PHASE.current === 'install' ? 'block' : 'none';
}

/* ─── 컨텍스트 버튼 (E / 모바일 탭) ───────────────────────── */
function _updateContextButton() {
  const btn = document.getElementById('ctx-action-btn');
  const lbl = document.getElementById('ctx-action-label');
  if (!btn || !lbl) return;

  let label = null;
  const LABELS = { post: '수직재', rail: '수평재', cone: '라바콘' };

  // 1순위: 자재 더미 근처 + 같은 종류 들고 최대 미달 → 추가 집기
  if (CARRY.nearbyPile) {
    const max  = MAX_CARRY[CARRY.nearbyPile.type] || 1;
    const same = CARRY.held && CARRY.held.type === CARRY.nearbyPile.type;
    const cur  = same ? CARRY.held.count : 0;
    const canPickup = (!CARRY.held || (same && cur < max));
    if (canPickup) label = (LABELS[CARRY.nearbyPile.type] || '자재') + ' 집기 (' + cur + '/' + max + ')';
  }

  // 2순위: 들고 있으면 설치 (단, 위 1순위가 잡혔으면 그게 우선)
  if (!label && CARRY.held && CARRY.held.count > 0) {
    if (CARRY.held.type === MATERIAL.POST)       label = '수직재 박기';
    else if (CARRY.held.type === MATERIAL.RAIL)  label = _nearestPostPair() ? '수평재 걸기' : '수직재 필요';
    else if (CARRY.held.type === MATERIAL.CONE)  label = '라바콘 놓기';
  }

  // 3순위: 빈손 + 한가한 NPC 근처 → 위임
  if (!label && !CARRY.held && CARRY.nearbyNpc) {
    label = CARRY.nearbyNpc.name + '에게 시키기';
  }

  if (label) { btn.classList.add('show'); lbl.textContent = label; }
  else       { btn.classList.remove('show'); }
}

/* ─── 메시지 ────────────────────────────────────────────── */
function _msg(txt) {
  const el = document.getElementById('railing-msg') || document.getElementById('install-msg');
  if (!el) { console.log('[CARRY]', txt); return; }
  el.textContent = txt;
  el.style.opacity = '1';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.opacity = '0'; }, 2200);
}

/* ─── 입력 ─────────────────────────────────────────────── */
function _bindInput() {
  window.addEventListener('keydown', e => {
    if (GAME.currentScene !== 'site') return;
    if (GAME.state.dialogActive) return;
    if (e.key !== 'e' && e.key !== 'E') return;
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
    btn.addEventListener('touchstart', ev => { ev.stopPropagation(); _onInteract(); }, { passive: true });
  }
}

function _onInteract() {
  if (PHASE.current !== 'install') return;
  if (GAME.state.dialogActive) return;

  // 1순위: 자재 더미 근처 + 더 집을 수 있으면 집기 (집을 수 없으면 다음 우선순위로)
  if (CARRY.nearbyPile) {
    const max  = MAX_CARRY[CARRY.nearbyPile.type] || 1;
    const same = CARRY.held && CARRY.held.type === CARRY.nearbyPile.type;
    const cur  = same ? CARRY.held.count : 0;
    const canPickup = (!CARRY.held || (same && cur < max));
    if (canPickup) { pickupItem(CARRY.nearbyPile); return; }
  }

  // 2순위: 들고 있으면 설치
  if (CARRY.held && CARRY.held.count > 0) {
    if (CARRY.held.type === MATERIAL.POST) { placeItem(); return; }
    if (CARRY.held.type === MATERIAL.RAIL && _nearestPostPair()) { placeItem(); return; }
    if (CARRY.held.type === MATERIAL.CONE) { placeItem(); return; }
  }

  // 3순위: 빈손 + 한가한 NPC 근처 → 위임
  if (!CARRY.held && CARRY.nearbyNpc) {
    _delegateToNpc(CARRY.nearbyNpc);
    return;
  }
}

/* ─── NPC 위임 ─────────────────────────────────────────── */
function _delegateToNpc(npc) {
  if (!npc || npc.task) return;
  const cl = PHASE.checklist;

  // 부족한 종류 우선: posts → rails → cones
  let type = null, pile = null, targetPos = null;

  if (cl.posts.done < cl.posts.total) {
    type = MATERIAL.POST;
    pile = GAME.materialPiles.find(p => p.type === type && p.count > 0);
    if (pile) targetPos = _nextPostTarget();
  } else if (cl.rails.done < cl.rails.total) {
    const pair = _firstUnconnectedPair();
    if (pair) {
      type = MATERIAL.RAIL;
      pile = GAME.materialPiles.find(p => p.type === type && p.count > 0);
      const mx = (pair[0].x + pair[1].x) / 2, mz = (pair[0].z + pair[1].z) / 2;
      targetPos = { x: mx, z: mz, pair };
    }
  } else if (cl.cones.done < cl.cones.total) {
    type = MATERIAL.CONE;
    pile = GAME.materialPiles.find(p => p.type === type && p.count > 0);
    if (pile) targetPos = _nextConeTarget();
  }

  if (!type || !pile || !targetPos) { _msg('할 일이 없습니다'); return; }

  npc.startInstallTask(type, pile, targetPos);
  _msg(npc.name + '에게 ' + ({post:'수직재',rail:'수평재',cone:'라바콘'}[type]) + ' 설치 위임');
}

// NPC가 들어갈 다음 수직재 위치 — 그리드 패턴 (기존 위치 회피)
function _nextPostTarget() {
  const grid = [{x:3,z:18},{x:-3,z:18},{x:3,z:26},{x:-3,z:26},{x:5,z:22},{x:-5,z:22}];
  for (const g of grid) {
    const taken = PLACED.posts.some(p => Math.hypot(p.x-g.x, p.z-g.z) < 0.6);
    if (!taken) return g;
  }
  return null;
}

function _nextConeTarget() {
  const grid = [{x:-7,z:15},{x:7,z:15},{x:-7,z:29},{x:7,z:29}];
  // 라바콘은 PLACED 추적 안 하니까 단순 cones.done 카운트로 다음 자리
  return grid[PHASE.checklist.cones.done] || grid[0];
}

function _firstUnconnectedPair() {
  for (let i = 0; i < PLACED.posts.length; i++) {
    for (let j = i + 1; j < PLACED.posts.length; j++) {
      const a = PLACED.posts[i], b = PLACED.posts[j];
      const gap = Math.hypot(b.x - a.x, b.z - a.z);
      if (gap > GAP_MAX) continue;
      const exists = PLACED.rails.some(r =>
        (r.aId === a.id && r.bId === b.id) || (r.aId === b.id && r.bId === a.id));
      if (!exists) return [a, b];
    }
  }
  return null;
}

// 외부 노출 (npc.js가 호출)
window._carrySpawnPost = function(x, z) { _spawnPost(x, z); PHASE.checklist.posts.done++; _updateChecklistHUD(); _checkChecklistDone(); };
window._carrySpawnRail = function(a, b) { _spawnRail(a, b); PHASE.checklist.rails.done++; _updateChecklistHUD(); _checkChecklistDone(); };
window._carrySpawnCone = function(x, z) { _spawnCone(x, z); PHASE.checklist.cones.done++; _updateChecklistHUD(); _checkChecklistDone(); };
