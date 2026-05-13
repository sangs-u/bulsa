// carry.js — v4 플레이어 휴대 시스템
// 자재 픽업·운반·내려놓기 + 중량에 따른 이동속도 조정

const CARRY = {
  held:        null,    // { matInst, def, qty }
  speedFactor: 1.0,     // 중량에 따라 낮아짐 (player.js가 참조)
  _heldMesh:   null,    // 카메라 앞에 붙는 시각 mesh
};

// ── 픽업 ─────────────────────────────────────────────────────
function carryPickup(matInst) {
  if (CARRY.held) {
    _showCarryNotif({ ko: '이미 자재를 들고 있습니다.', en: 'Already carrying something.' });
    return false;
  }
  const def = matInst.def;

  if (requiresEquipment(def.id)) {
    _showCarryNotif({
      ko: `${def.label.ko}은(는) 장비가 필요합니다 (${def.requiresEquip})`,
      en: `${def.label.en} requires equipment (${def.requiresEquip})`,
    });
    return false;
  }
  if (!canSoloCarry(def.id, matInst.quantity)) {
    _showCarryNotif({
      ko: `${def.label.ko} 중량 초과 — 2인 또는 장비 필요 (${def.weight * matInst.quantity}kg)`,
      en: `${def.label.en} too heavy — 2-person or equipment needed (${def.weight * matInst.quantity}kg)`,
    });
    return false;
  }

  // 씬에서 제거 (인터랙터블에서도 숨김)
  if (matInst.mesh.parent) matInst.mesh.parent.remove(matInst.mesh);
  matInst.state = 'held';
  matInst.heldBy = 'player';

  CARRY.held = { matInst, def, qty: matInst.quantity };

  // 이동속도 감소 (중량 비례, 최소 0.45)
  const totalKg = def.weight * matInst.quantity;
  CARRY.speedFactor = Math.max(0.45, 1.0 - totalKg / 60);

  // 화면 앞 자재 mesh 표시
  _attachHeldMesh(def);

  // HUD 알림
  _showCarryNotif({
    ko: `${def.label.ko} 들었습니다 — [G] 내려놓기`,
    en: `Picked up ${def.label.en} — [G] to drop`,
  }, 2200);

  if (typeof updateHUD === 'function') updateHUD();
  return true;
}

// ── 내려놓기 ─────────────────────────────────────────────────
function carryDrop() {
  if (!CARRY.held) return;
  const { matInst } = CARRY.held;

  // 플레이어 발 앞 위치에 스폰
  const dropPos = _getDropPosition();
  matInst.mesh.position.set(dropPos.x, dropPos.y, dropPos.z);
  GAME.scene.add(matInst.mesh);
  matInst.state = 'ground';
  matInst.heldBy = null;

  _detachHeldMesh();
  CARRY.held = null;
  CARRY.speedFactor = 1.0;

  if (typeof updateHUD === 'function') updateHUD();
}

// ── 설치 완료 시 소모 ────────────────────────────────────────
function carryConsume() {
  if (!CARRY.held) return null;
  const inst = CARRY.held.matInst;
  _detachHeldMesh();
  CARRY.held = null;
  CARRY.speedFactor = 1.0;
  inst.state = 'consumed';
  removeMaterialInst(inst.id);
  if (typeof updateHUD === 'function') updateHUD();
  return inst;
}

// ── 화면 앞 mesh 표시 ────────────────────────────────────────
function _attachHeldMesh(def) {
  _detachHeldMesh();
  const g = def.geometry;
  let geo;
  if (g.type === 'cylinder') geo = new THREE.CylinderGeometry(g.r * 0.8, g.r * 0.8, Math.min(g.h, 1.0), 8);
  else                        geo = new THREE.BoxGeometry(Math.min(g.w, 0.4), Math.min(g.h, 0.4), Math.min(g.d, 0.4));

  const mat  = new THREE.MeshLambertMaterial({ color: def.color, transparent: true, opacity: 0.85 });
  const mesh = new THREE.Mesh(geo, mat);
  // 카메라 기준 오른쪽 아래 앞
  mesh.position.set(0.35, -0.28, -0.6);
  GAME.camera.add(mesh);
  CARRY._heldMesh = mesh;
}

function _detachHeldMesh() {
  if (CARRY._heldMesh) {
    GAME.camera.remove(CARRY._heldMesh);
    CARRY._heldMesh = null;
  }
}

// ── 내려놓을 위치 계산 ───────────────────────────────────────
function _getDropPosition() {
  const fwd = new THREE.Vector3();
  GAME.camera.getWorldDirection(fwd);
  fwd.y = 0;
  fwd.normalize().multiplyScalar(1.2);
  return {
    x: PLAYER.worldPos.x + fwd.x,
    y: 0.05,
    z: PLAYER.worldPos.z + fwd.z,
  };
}

function _showCarryNotif(msg, dur = 2500) {
  if (typeof showActionNotif === 'function') {
    const lang = (typeof currentLang !== 'undefined') ? currentLang : 'ko';
    showActionNotif(msg[lang] || msg.ko, dur);
  }
}

// ── 키 이벤트 연결 (initCarry 에서 1회 호출) ─────────────────
function initCarry() {
  document.addEventListener('keydown', e => {
    if (e.code === 'KeyG' && CARRY.held) carryDrop();
  });
}

// ── HUD 보조 — 현재 휴대 자재 라벨 ──────────────────────────
function carryHudLabel() {
  if (!CARRY.held) return '';
  const { def, qty } = CARRY.held;
  const lang = (typeof currentLang !== 'undefined') ? currentLang : 'ko';
  return `📦 ${def.label[lang] || def.label.ko}${qty > 1 ? ` ×${qty}` : ''}`;
}
