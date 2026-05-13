// material.js — v4 자재 시스템
// 자재 정의 레지스트리 + GAME.materials 인스턴스 관리

// ── 자재 정의 ────────────────────────────────────────────────
const MAT_DEFS = {

  // ── 굴착 페이즈 ─────────────────────────────────────────────
  MAT_H_PILE: {
    id: 'MAT_H_PILE',
    label: { ko: 'H형강 파일', en: 'H-pile', vi: 'Cọc H', ar: 'ركيزة H' },
    weight: 120,        // kg/개
    soloCarryMax: 0,    // 인력 불가
    twoPersonMax: 0,    // 장비 필수
    requiresEquip: 'crane',
    geometry: { type: 'box', w: 0.15, h: 6.0, d: 0.15 },
    color: 0x888899,
    stackCount: 1,      // 한 번에 운반 가능 개수
  },

  MAT_SHEET_PILE: {
    id: 'MAT_SHEET_PILE',
    label: { ko: '강재 흙막이판', en: 'Steel sheet pile', vi: 'Cừ thép', ar: 'ركيزة صفائح فولاذية' },
    weight: 80,
    soloCarryMax: 0,
    twoPersonMax: 0,
    requiresEquip: 'crane',
    geometry: { type: 'box', w: 0.8, h: 3.0, d: 0.05 },
    color: 0x667788,
    stackCount: 1,
  },

  MAT_RAILING_POST: {
    id: 'MAT_RAILING_POST',
    label: { ko: '난간 포스트', en: 'Railing post', vi: 'Cột lan can', ar: 'عمود الدرابزين' },
    weight: 8,
    soloCarryMax: 25,
    twoPersonMax: 50,
    requiresEquip: null,
    geometry: { type: 'cylinder', r: 0.03, h: 1.2 },
    color: 0xFFCC00,
    stackCount: 3,      // 최대 3개까지 한 번에 운반
  },

  MAT_RAILING_BAR: {
    id: 'MAT_RAILING_BAR',
    label: { ko: '난간 수평재', en: 'Railing bar', vi: 'Thanh ngang lan can', ar: 'قضيب أفقي للدرابزين' },
    weight: 5,
    soloCarryMax: 25,
    twoPersonMax: 50,
    requiresEquip: null,
    geometry: { type: 'cylinder', r: 0.02, h: 2.0 },
    color: 0xFFCC00,
    stackCount: 4,
  },

  MAT_SURVEY_DETECTOR: {
    id: 'MAT_SURVEY_DETECTOR',
    label: { ko: '매설물 탐지기', en: 'Underground detector', vi: 'Máy dò ngầm', ar: 'كاشف الأنابيب' },
    weight: 3,
    soloCarryMax: 25,
    twoPersonMax: 50,
    requiresEquip: null,
    geometry: { type: 'box', w: 0.12, h: 0.6, d: 0.06 },
    color: 0xFF6600,
    stackCount: 1,
    isTool: true,       // 도구 — 소모되지 않음
  },

  // ── 기초 페이즈 ─────────────────────────────────────────────
  MAT_REBAR_BUNDLE: {
    id: 'MAT_REBAR_BUNDLE',
    label: { ko: '철근 묶음', en: 'Rebar bundle', vi: 'Bó thép', ar: 'حزمة حديد تسليح' },
    weight: 200,
    soloCarryMax: 0,
    twoPersonMax: 0,
    requiresEquip: 'crane',
    geometry: { type: 'box', w: 0.3, h: 0.3, d: 4.0 },
    color: 0x885533,
    stackCount: 1,
  },

  MAT_REBAR_SINGLE: {
    id: 'MAT_REBAR_SINGLE',
    label: { ko: '철근 (단품)', en: 'Rebar (single)', vi: 'Thép đơn', ar: 'قضيب فولاذي مفرد' },
    weight: 12,
    soloCarryMax: 25,
    twoPersonMax: 50,
    requiresEquip: null,
    geometry: { type: 'cylinder', r: 0.016, h: 4.0 },
    color: 0x885533,
    stackCount: 2,
  },

  MAT_SAFETY_NET: {
    id: 'MAT_SAFETY_NET',
    label: { ko: '실족방지망', en: 'Safety net', vi: 'Lưới chống trượt', ar: 'شبكة منع الانزلاق' },
    weight: 6,
    soloCarryMax: 25,
    twoPersonMax: 50,
    requiresEquip: null,
    geometry: { type: 'box', w: 2.0, h: 0.05, d: 2.0 },
    color: 0x00AA44,
    stackCount: 2,
  },

  MAT_REBAR_CAP: {
    id: 'MAT_REBAR_CAP',
    label: { ko: '철근 보호캡', en: 'Rebar cap', vi: 'Nắp bảo vệ thép', ar: 'غطاء قضيب فولاذي' },
    weight: 0.1,
    soloCarryMax: 25,
    twoPersonMax: 50,
    requiresEquip: null,
    geometry: { type: 'box', w: 0.06, h: 0.06, d: 0.06 },
    color: 0xFF4444,
    stackCount: 20,
  },

  MAT_FORMWORK_PANEL: {
    id: 'MAT_FORMWORK_PANEL',
    label: { ko: '거푸집 패널', en: 'Formwork panel', vi: 'Tấm ván khuôn', ar: 'لوح قالب خشبي' },
    weight: 22,
    soloCarryMax: 25,
    twoPersonMax: 50,
    requiresEquip: null,
    geometry: { type: 'box', w: 0.9, h: 1.8, d: 0.04 },
    color: 0xBB8844,
    stackCount: 1,
  },

  MAT_SHORE_PROP: {
    id: 'MAT_SHORE_PROP',
    label: { ko: '동바리', en: 'Shore prop', vi: 'Cột chống', ar: 'دعامة إسناد' },
    weight: 18,
    soloCarryMax: 25,
    twoPersonMax: 50,
    requiresEquip: null,
    geometry: { type: 'cylinder', r: 0.04, h: 3.0 },
    color: 0xCCCCCC,
    stackCount: 1,
  },

  // ── 외장 페이즈 ─────────────────────────────────────────────
  MAT_SCAFFOLD_PIPE: {
    id: 'MAT_SCAFFOLD_PIPE',
    label: { ko: '비계 강관', en: 'Scaffold pipe', vi: 'Ống giàn giáo', ar: 'أنبوب السقالة' },
    weight: 15,
    soloCarryMax: 25,
    twoPersonMax: 50,
    requiresEquip: null,
    geometry: { type: 'cylinder', r: 0.025, h: 3.0 },
    color: 0xCCCCDD,
    stackCount: 2,
  },

  MAT_LIFELINE_ANCHOR: {
    id: 'MAT_LIFELINE_ANCHOR',
    label: { ko: '안전대 부착설비', en: 'Lifeline anchor', vi: 'Neo dây an toàn', ar: 'مرساة خط الحياة' },
    weight: 4,
    soloCarryMax: 25,
    twoPersonMax: 50,
    requiresEquip: null,
    geometry: { type: 'box', w: 0.15, h: 0.15, d: 0.08 },
    color: 0xFF8800,
    stackCount: 4,
    isTool: false,
  },
};

// ── 인스턴스 관리 ────────────────────────────────────────────
// GAME.materials: 씬에 존재하는 자재 인스턴스 배열
// 각 인스턴스: { defId, mesh, position, quantity, state, heldBy }

let _nextMatId = 1;

function spawnMaterial(defId, position, quantity = 1) {
  if (!MAT_DEFS[defId]) {
    console.warn('[material] unknown defId:', defId);
    return null;
  }
  const def = MAT_DEFS[defId];
  const mesh = _buildMatMesh(def, quantity);
  mesh.position.set(position.x, position.y ?? 0, position.z);
  GAME.scene.add(mesh);

  const inst = {
    id: _nextMatId++,
    defId,
    def,
    mesh,
    quantity,
    state: 'ground',   // 'ground' | 'held' | 'installed' | 'consumed'
    heldBy: null,      // 'player' | npcId
  };

  GAME.materials = GAME.materials || [];
  GAME.materials.push(inst);

  // interactables 등록 (E키 픽업)
  GAME.interactables = GAME.interactables || [];
  GAME.interactables.push({
    type:   'material',
    mesh,
    matId:  inst.id,
    label:  def.label,
    radius: 2.0,
  });

  return inst;
}

function _buildMatMesh(def, qty) {
  let geo;
  const g = def.geometry;
  if (g.type === 'cylinder') {
    geo = new THREE.CylinderGeometry(g.r, g.r, g.h, 10);
  } else {
    geo = new THREE.BoxGeometry(g.w, g.h, g.d);
  }
  const mat = new THREE.MeshLambertMaterial({ color: def.color });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.name = def.id;

  // 수량 > 1이면 살짝 오프셋된 복수 mesh를 Group으로
  if (qty > 1) {
    const group = new THREE.Group();
    group.add(mesh);
    for (let i = 1; i < Math.min(qty, def.stackCount); i++) {
      const clone = mesh.clone();
      clone.position.set(i * 0.06, i * 0.06, 0);
      group.add(clone);
    }
    group.name = def.id;
    return group;
  }
  return mesh;
}

function getMaterialInst(id) {
  return (GAME.materials || []).find(m => m.id === id) || null;
}

function getMaterialsNear(position, radius = 2.5) {
  return (GAME.materials || []).filter(m => {
    if (m.state !== 'ground') return false;
    const p = m.mesh.position;
    const dx = p.x - position.x, dz = p.z - position.z;
    return dx * dx + dz * dz <= radius * radius;
  });
}

function removeMaterialInst(id) {
  const inst = getMaterialInst(id);
  if (!inst) return;
  if (inst.mesh && inst.mesh.parent) inst.mesh.parent.remove(inst.mesh);
  GAME.materials = (GAME.materials || []).filter(m => m.id !== id);
  GAME.interactables = (GAME.interactables || []).filter(i => i.matId !== id);
}

// ── 자재 중량 판정 헬퍼 ──────────────────────────────────────
function canSoloCarry(defId, qty = 1) {
  const def = MAT_DEFS[defId];
  if (!def) return false;
  return def.soloCarryMax > 0 && def.weight * qty <= def.soloCarryMax;
}

function requiresEquipment(defId) {
  const def = MAT_DEFS[defId];
  return def && !!def.requiresEquip;
}

window.MAT_DEFS           = MAT_DEFS;
window.spawnMaterial      = spawnMaterial;
window.getMaterialInst    = getMaterialInst;
window.getMaterialsNear   = getMaterialsNear;
window.removeMaterialInst = removeMaterialInst;
window.canSoloCarry       = canSoloCarry;
window.requiresEquipment  = requiresEquipment;
