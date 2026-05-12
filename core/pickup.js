// Pickup & Throw — 마인크래프트/GTA 스타일 자유로운 물체 상호작용.
// 씬에 놓인 작은 객체 (도구, 안전모, 자재 조각) 를 E 키로 픽업, F 키로 던짐.
// 던진 물체는 cannon.js 물리 적용.

(function () {
  'use strict';
  if (typeof window === 'undefined') return;

  const PICKUP = {
    held: null,           // { mesh, scene, type, originalParent }
    candidates: [],       // 픽업 가능한 mesh 목록
    initialized: false,
  };
  window.PICKUP = PICKUP;

  function initPickup() {
    if (PICKUP.initialized) return;
    PICKUP.initialized = true;
    document.addEventListener('keydown', e => {
      if (!GAME.state.gameStarted || GAME.state.gameOver) return;
      if (typeof INTERACTION !== 'undefined' && INTERACTION.popupOpen) return;
      if (e.code === 'KeyQ') { e.preventDefault(); _tryPickupOrDrop(); }
      else if (e.code === 'KeyF') { e.preventDefault(); _throw(); }
    });
  }

  function registerPickupable(mesh, opts = {}) {
    if (!mesh) return;
    mesh.userData.pickupable = true;
    mesh.userData.pickupType = opts.type || 'item';
    mesh.userData.pickupMass = opts.mass || 0.6;
    PICKUP.candidates.push(mesh);
  }

  function _tryPickupOrDrop() {
    if (PICKUP.held) { _drop(); return; }
    if (!PLAYER || !PLAYER.worldPos) return;
    // 가장 가까운 픽업 가능 mesh
    let best = null, bestD = 2.4;     // 픽업 범위 2.4m
    for (const m of PICKUP.candidates) {
      if (!m || !m.parent) continue;     // 이미 분리됨
      const wp = new THREE.Vector3();
      m.getWorldPosition(wp);
      const d = wp.distanceTo(PLAYER.worldPos);
      if (d < bestD) { bestD = d; best = m; }
    }
    if (!best) {
      if (typeof showActionNotif === 'function') showActionNotif({
        ko: '근처에 들 수 있는 물건이 없어요',
        en: 'Nothing to pick up nearby',
        vi: 'Không có gì để nhặt gần đây',
        ar: 'لا شيء للالتقاط بالقرب',
      }[currentLang] || '근처에 들 수 있는 물건이 없어요', 1800);
      return;
    }
    // 픽업 — 카메라 자식으로 부착
    PICKUP.held = { mesh: best, originalParent: best.parent };
    GAME.camera.add(best);
    best.position.set(0.45, -0.35, -0.85);
    best.rotation.set(0, 0, 0);
    if (typeof sfx === 'function') sfx('pickup');
    if (typeof showActionNotif === 'function') {
      const label = best.userData.pickupLabel || best.userData.pickupType || '물건';
      showActionNotif(`📦 ${label} 들기 — F로 던짐, Q로 내려놓기`, 2200);
    }
  }

  function _drop() {
    if (!PICKUP.held) return;
    const { mesh, originalParent } = PICKUP.held;
    GAME.camera.remove(mesh);
    // 플레이어 발 앞에 놓기
    const yaw = PLAYER.euler ? PLAYER.euler.y : 0;
    const fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    mesh.position.set(
      PLAYER.worldPos.x + fwd.x * 0.6,
      PLAYER.worldPos.y + 0.4,
      PLAYER.worldPos.z + fwd.z * 0.6
    );
    (originalParent || GAME.scene).add(mesh);
    PICKUP.held = null;
    if (typeof sfx === 'function') sfx('drop_item');
  }

  function _throw() {
    if (!PICKUP.held) return;
    const { mesh, originalParent } = PICKUP.held;
    GAME.camera.remove(mesh);
    const yaw = PLAYER.euler ? PLAYER.euler.y : 0;
    const pitch = PLAYER.euler ? PLAYER.euler.x : 0;
    const dir = new THREE.Vector3(
      -Math.sin(yaw) * Math.cos(pitch),
      -Math.sin(pitch) + 0.15,
      -Math.cos(yaw) * Math.cos(pitch)
    );
    const startPos = new THREE.Vector3(
      PLAYER.worldPos.x + dir.x * 0.6,
      PLAYER.worldPos.y + 1.5,
      PLAYER.worldPos.z + dir.z * 0.6
    );
    mesh.position.copy(startPos);
    (originalParent || GAME.scene).add(mesh);

    // 물리 적용 (있으면)
    if (typeof PHYSICS !== 'undefined' && PHYSICS.enabled && typeof addPhysicsBox === 'function') {
      const mass = mesh.userData.pickupMass || 0.6;
      addPhysicsBox(mesh, {
        size: { x: 0.18, y: 0.12, z: 0.18 },
        mass,
        velocity: { x: dir.x * 10, y: dir.y * 10 + 3, z: dir.z * 10 },
        angularVelocity: { x: (Math.random()-0.5)*4, y: (Math.random()-0.5)*4, z: (Math.random()-0.5)*4 },
        removeBelowY: -10,
      });
    }

    PICKUP.held = null;
    if (typeof sfx === 'function') sfx('drop_item');
    if (typeof showActionNotif === 'function') showActionNotif('🤾 던졌어요', 1200);
  }

  // 시나리오 시작 시 데모 픽업 아이템 스폰
  function spawnDemoPickups(scene, scenarioId) {
    if (!scene) return;
    const presets = {
      excavation: [
        { type:'헬멧',    pos:[3, 0.3, -2], color:0xDEBB14, label:'안전모' },
        { type:'레미터',  pos:[-2, 0.3, -3], color:0x222628, label:'레벨기' },
      ],
      foundation: [
        { type:'드릴',    pos:[2, 0.3, -2], color:0xFFAA00, label:'전동드릴' },
        { type:'장갑',    pos:[-1, 0.3, -4], color:0x4A6E18, label:'안전장갑' },
      ],
      lifting: [
        { type:'슬링',    pos:[3, 0.3, 0], color:0xFFE066, label:'슬링' },
        { type:'헬멧',    pos:[-3, 0.3, 0], color:0xCC5018, label:'안전모' },
      ],
      envelope: [
        { type:'테이프',  pos:[2, 0.3, -3], color:0xD4A217, label:'마스킹테이프' },
        { type:'롤러',    pos:[-2, 0.3, -4], color:0x808890, label:'페인트롤러' },
      ],
      mep_finish: [
        { type:'드라이버', pos:[2, 0.3, -2], color:0x4A2E12, label:'드라이버' },
        { type:'배선',    pos:[-2, 0.3, -3], color:0x222, label:'전선' },
      ],
    };
    const list = presets[scenarioId] || [];
    list.forEach(p => {
      const geo = new THREE.BoxGeometry(0.22, 0.14, 0.22);
      const mat = new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.7 });
      const m = new THREE.Mesh(geo, mat);
      m.position.set(p.pos[0], p.pos[1], p.pos[2]);
      m.castShadow = true;
      m.userData.pickupLabel = p.label;
      m.userData.pickupType = p.type;
      scene.add(m);
      registerPickupable(m, { type: p.type, mass: 0.5 });
    });
  }

  window.initPickup       = initPickup;
  window.registerPickupable = registerPickupable;
  window.spawnDemoPickups  = spawnDemoPickups;
})();
