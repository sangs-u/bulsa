// railing.js — 안전 난간 설치 시스템 (수직재 → 수평재 순서)

const RAILING = (() => {
  const GAP_MAX    = 3.2;   // 수평재 연결 최대 간격
  const POST_H     = 1.15;  // 수직재 높이
  const RAIL_H1    = 1.02;  // 상단 수평재
  const RAIL_H2    = 0.52;  // 중단 수평재
  const POST_D     = 0.06;  // 수직재 지름
  const REACH      = 1.8;   // 제거 가능 거리
  const PLACE_DIST = 2.0;   // 전방 설치 거리

  let scene, sg;
  let posts = [];   // [{id, mesh, x, z}]
  let rails = [];   // [{id, mT, mM, aId, bId}]
  let mode  = 'none'; // 'none' | 'post' | 'rail'
  let _n    = 0;

  let gPost, gRailT, gRailM;
  let matPost, matRail, matGhost;

  // ── 초기화 ──────────────────────────────────────────────────
  function init(sc, shadowGen) {
    scene = sc;
    sg    = shadowGen;
    _mats();
    _ghosts();
  }

  function _mats() {
    matPost = new BABYLON.StandardMaterial('rl_post', scene);
    matPost.diffuseColor  = new BABYLON.Color3(0.62, 0.64, 0.67);
    matPost.specularColor = new BABYLON.Color3(0.55, 0.55, 0.55);
    matPost.specularPower = 80;

    matRail = new BABYLON.StandardMaterial('rl_rail', scene);
    matRail.diffuseColor  = new BABYLON.Color3(0.58, 0.60, 0.62);
    matRail.specularColor = new BABYLON.Color3(0.45, 0.45, 0.45);
    matRail.specularPower = 60;

    matGhost = new BABYLON.StandardMaterial('rl_ghost', scene);
    matGhost.diffuseColor    = new BABYLON.Color3(0.2, 0.7, 1.0);
    matGhost.alpha           = 0.42;
    matGhost.backFaceCulling = false;
  }

  function _ghosts() {
    gPost = BABYLON.MeshBuilder.CreateCylinder('gPost', {
      diameter: POST_D, height: POST_H, tessellation: 8
    }, scene);
    gPost.material   = matGhost;
    gPost.isPickable = false;
    gPost.setEnabled(false);

    const ro = { width: POST_D, height: POST_D, depth: GAP_MAX };
    gRailT = BABYLON.MeshBuilder.CreateBox('gRT', ro, scene);
    gRailT.material   = matGhost;
    gRailT.isPickable = false;
    gRailT.setEnabled(false);

    gRailM = BABYLON.MeshBuilder.CreateBox('gRM', ro, scene);
    gRailM.material   = matGhost;
    gRailM.isPickable = false;
    gRailM.setEnabled(false);
  }

  // ── 모드 전환 ────────────────────────────────────────────────
  function setMode(m) {
    mode = m;
    _syncGhosts();
    _syncUI();
  }

  function cycleMode() {
    if      (mode === 'none') setMode('post');
    else if (mode === 'post') setMode('rail');
    else                      setMode('none');
  }

  function cycleSubMode() {
    if      (mode === 'post') setMode('rail');
    else if (mode === 'rail') setMode('post');
  }

  function exitMode() { setMode('none'); }
  function getMode()  { return mode; }

  // ── 매 프레임 프리뷰 업데이트 ───────────────────────────────
  function update(playerPos, fwd) {
    if (mode === 'none' || !playerPos) return;

    if (mode === 'post') {
      gPost.position.set(
        playerPos.x + fwd.x * PLACE_DIST,
        POST_H / 2,
        playerPos.z + fwd.z * PLACE_DIST
      );
    }

    if (mode === 'rail') {
      const pair = _nearPair(playerPos);
      if (pair) {
        const mx   = (pair[0].x + pair[1].x) / 2;
        const mz   = (pair[0].z + pair[1].z) / 2;
        const dist = Math.hypot(pair[1].x - pair[0].x, pair[1].z - pair[0].z);
        const ang  = Math.atan2(pair[1].x - pair[0].x, pair[1].z - pair[0].z);
        _setGR(gRailT, mx, RAIL_H1, mz, dist, ang);
        _setGR(gRailM, mx, RAIL_H2, mz, dist, ang);
        gRailT.setEnabled(true);
        gRailM.setEnabled(true);
      } else {
        gRailT.setEnabled(false);
        gRailM.setEnabled(false);
      }
    }
  }

  function _setGR(m, x, y, z, dist, ang) {
    m.position.set(x, y, z);
    m.scaling.z  = dist / GAP_MAX;
    m.rotation.y = ang;
  }

  // ── 설치 (키/버튼 공용) ─────────────────────────────────────
  function interact(playerPos, fwd) {
    if (mode === 'post') _placePost(playerPos, fwd);
    else if (mode === 'rail') _placeRail(playerPos);
  }

  function interactFromBtn() {
    if (!GAME || !GAME.player) return;
    interact(GAME.player.position, _fwd());
  }

  // ── 제거 ────────────────────────────────────────────────────
  function removeNear(playerPos) {
    // 수직재 탐색
    let nearPost = null, nearD = REACH;
    posts.forEach(p => {
      const d = Math.hypot(playerPos.x - p.x, playerPos.z - p.z);
      if (d < nearD) { nearD = d; nearPost = p; }
    });
    if (nearPost) {
      const hasRail = rails.some(r => r.aId === nearPost.id || r.bId === nearPost.id);
      if (hasRail) { _msg('수평재를 먼저 제거하세요'); return; }
      nearPost.mesh.dispose();
      posts = posts.filter(p => p.id !== nearPost.id);
      return;
    }
    // 수평재 탐색
    let nearRail = null, nearRD = REACH;
    rails.forEach(r => {
      const pA = posts.find(p => p.id === r.aId);
      const pB = posts.find(p => p.id === r.bId);
      if (!pA || !pB) return;
      const d = Math.hypot(playerPos.x - (pA.x + pB.x) / 2, playerPos.z - (pA.z + pB.z) / 2);
      if (d < nearRD) { nearRD = d; nearRail = r; }
    });
    if (nearRail) {
      nearRail.mT.dispose();
      nearRail.mM.dispose();
      rails = rails.filter(r => r.id !== nearRail.id);
    }
  }

  function removeNearPlayer() {
    if (!GAME || !GAME.player) return;
    removeNear(GAME.player.position);
  }

  // ── 수직재 설치 ─────────────────────────────────────────────
  function _placePost(playerPos, fwd) {
    const x = playerPos.x + fwd.x * PLACE_DIST;
    const z = playerPos.z + fwd.z * PLACE_DIST;

    const mesh = BABYLON.MeshBuilder.CreateCylinder('post_' + _n, {
      diameter: POST_D, height: POST_H, tessellation: 8
    }, scene);
    mesh.position.set(x, POST_H / 2, z);
    mesh.material = matPost;
    if (sg) sg.addShadowCaster(mesh);

    posts.push({ id: 'p' + _n, mesh, x, z });
    _n++;
  }

  // ── 수평재 설치 ─────────────────────────────────────────────
  function _placeRail(playerPos) {
    const pair = _nearPair(playerPos);
    if (!pair) { _msg('수직재 2개가 가까이 있어야 합니다'); return; }

    const pA   = pair[0], pB = pair[1];
    const mx   = (pA.x + pB.x) / 2;
    const mz   = (pA.z + pB.z) / 2;
    const dist = Math.hypot(pB.x - pA.x, pB.z - pA.z);
    const ang  = Math.atan2(pB.x - pA.x, pB.z - pA.z);

    function mkRail(name, y) {
      const m = BABYLON.MeshBuilder.CreateBox(name, {
        width: POST_D, height: POST_D, depth: dist
      }, scene);
      m.position.set(mx, y, mz);
      m.rotation.y = ang;
      m.material   = matRail;
      if (sg) sg.addShadowCaster(m);
      return m;
    }

    const id = 'r' + _n;
    rails.push({
      id,
      mT:  mkRail('rT_' + id, RAIL_H1),
      mM:  mkRail('rM_' + id, RAIL_H2),
      aId: pA.id,
      bId: pB.id,
    });
    _n++;
  }

  // ── 연결 가능한 수직재 쌍 탐색 ──────────────────────────────
  function _nearPair(playerPos) {
    let best = null, bestD = 8.0;
    for (let i = 0; i < posts.length; i++) {
      for (let j = i + 1; j < posts.length; j++) {
        const a = posts[i], b = posts[j];
        const gap = Math.hypot(b.x - a.x, b.z - a.z);
        if (gap > GAP_MAX) continue;
        const already = rails.some(r =>
          (r.aId === a.id && r.bId === b.id) || (r.aId === b.id && r.bId === a.id)
        );
        if (already) continue;
        const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2;
        const d  = Math.hypot(playerPos.x - mx, playerPos.z - mz);
        if (d < bestD) { bestD = d; best = [a, b]; }
      }
    }
    return best;
  }

  // ── 유틸 ────────────────────────────────────────────────────
  function _syncGhosts() {
    if (gPost)  gPost.setEnabled(mode === 'post');
    if (gRailT && mode !== 'rail') gRailT.setEnabled(false);
    if (gRailM && mode !== 'rail') gRailM.setEnabled(false);
  }

  function _syncUI() {
    const hud    = document.getElementById('railing-hud');
    const togBtn = document.getElementById('railing-toggle-btn');
    const lbl    = document.getElementById('railing-mode-lbl');

    if (hud)    hud.style.display    = mode !== 'none' ? 'flex' : 'none';
    if (togBtn) togBtn.classList.toggle('active', mode !== 'none');

    ['post', 'rail'].forEach(m => {
      const btn = document.getElementById('rbtn-' + m);
      if (btn) btn.classList.toggle('active', mode === m);
    });

    if (lbl) lbl.textContent = ({ post: '수직재 설치 중', rail: '수평재 연결 중', none: '' })[mode] || '';
  }

  function _msg(txt) {
    const el = document.getElementById('railing-msg');
    if (!el) return;
    el.textContent = txt;
    el.style.opacity = '1';
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.style.opacity = '0'; }, 2200);
  }

  function _fwd() {
    if (!GAME || !GAME.camera) return new BABYLON.Vector3(0, 0, 1);
    const v = GAME.camera.target.subtract(GAME.camera.position);
    v.y = 0;
    const l = v.length();
    return l > 0.001 ? v.scaleInPlace(1 / l) : new BABYLON.Vector3(0, 0, 1);
  }

  // game:ready 시 자동 초기화
  window.addEventListener('game:ready', () => {
    init(GAME.scene, GAME.shadowGen);
  });

  function hasPostNear(pos, radius) {
    return posts.some(p => Math.hypot(pos.x - p.x, pos.z - p.z) < (radius || 1.6));
  }

  return { setMode, cycleMode, cycleSubMode, exitMode, getMode, update, interact, interactFromBtn, removeNear, removeNearPlayer, hasPostNear };
})();
