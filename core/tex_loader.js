// tex_loader.js — PBR 텍스처 캐시 + 재질 업그레이드 시스템
// Poly Haven CC0 텍스처 (assets/tex/) 로딩 후 씬 전반에 적용.

const TEX = {
  _cache:   {},   // url → THREE.Texture
  _loader:  null,
  _ready:   false,
};

// ── 텍스처 목록 ────────────────────────────────────────────────
const TEX_URLS = {
  concrete_floor:     'assets/tex/concrete_floor.jpg',
  concrete_floor_nor: 'assets/tex/concrete_floor_nor.jpg',
  concrete_wall:      'assets/tex/concrete_wall.jpg',
  concrete_wall_nor:  'assets/tex/concrete_wall_nor.jpg',
  dirt:               'assets/tex/dirt_ground.jpg',
  gravel:             'assets/tex/gravel.jpg',
  metal:              'assets/tex/metal_plate.jpg',
  rust:               'assets/tex/rust_metal.jpg',
  asphalt:            'assets/tex/asphalt.jpg',
};

// ── 로드 ──────────────────────────────────────────────────────
// Three.js TextureLoader 는 빈 텍스처 객체를 즉시 반환 → 씬 빌드 시 재질에 attach 가능.
// 이미지가 로드되면 자동으로 gpu 업데이트됨.
function preloadTextures(onReady) {
  if (TEX._ready) { onReady && onReady(); return; }
  TEX._loader = new THREE.TextureLoader();

  const keys    = Object.keys(TEX_URLS);
  let pending   = keys.length;

  keys.forEach(key => {
    // load() 는 즉시 Texture 객체 반환 (이미지 로드 전이어도 캐시에 넣음)
    const tex = TEX._loader.load(
      TEX_URLS[key],
      loaded => {
        loaded.wrapS = loaded.wrapT = THREE.RepeatWrapping;
        loaded.needsUpdate = true;
        if (--pending <= 0) { TEX._ready = true; onReady && onReady(); }
      },
      undefined,
      () => {
        if (--pending <= 0) { TEX._ready = true; onReady && onReady(); }
      }
    );
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    TEX._cache[key] = tex;
  });
}

// ── 텍스처 가져오기 (repeat 배율 포함) ────────────────────────
// repeat 이 다른 재질끼리 같은 텍스처를 공유하면 충돌 — 필요 시 clone
function getTex(key, repeatX, repeatY) {
  const t = TEX._cache[key];
  if (!t) return null;
  const rx = repeatX || 1, ry = repeatY || 1;
  if (t.repeat.x === rx && t.repeat.y === ry) return t;
  // repeat 이 다르면 clone 해서 독립 인스턴스
  const c = t.clone();
  c.wrapS = c.wrapT = THREE.RepeatWrapping;
  c.repeat.set(rx, ry);
  c.needsUpdate = true;
  return c;
}

// ── 재질 팩토리 ───────────────────────────────────────────────
// concrete: 바닥/벽/슬래브 (회색 콘크리트)
function matConcrete(opts) {
  opts = opts || {};
  const rep  = opts.repeat || 4;
  const diff = getTex('concrete_floor', rep, rep);
  const nor  = getTex('concrete_floor_nor', rep, rep);
  const m = new THREE.MeshStandardMaterial({
    color:     opts.color || 0xC8C2B8,
    roughness: opts.roughness != null ? opts.roughness : 0.88,
    metalness: 0.0,
  });
  if (diff) m.map          = diff;
  if (nor)  m.normalMap    = nor;
  if (nor)  m.normalScale  = new THREE.Vector2(0.6, 0.6);
  return m;
}

// wall: 수직 콘크리트 벽
function matWall(opts) {
  opts = opts || {};
  const rep  = opts.repeat || 3;
  const diff = getTex('concrete_wall', rep, rep);
  const nor  = getTex('concrete_wall_nor', rep, rep);
  const m = new THREE.MeshStandardMaterial({
    color:     opts.color || 0xBAB5AC,
    roughness: opts.roughness != null ? opts.roughness : 0.85,
    metalness: 0.0,
  });
  if (diff) m.map       = diff;
  if (nor)  m.normalMap = nor;
  if (nor)  m.normalScale = new THREE.Vector2(0.5, 0.5);
  return m;
}

// dirt: 흙 굴착면
function matDirt(opts) {
  opts = opts || {};
  const rep  = opts.repeat || 6;
  const diff = getTex('dirt', rep, rep);
  const m = new THREE.MeshStandardMaterial({
    color:     opts.color || 0x8B6B4A,
    roughness: 0.96,
    metalness: 0.0,
  });
  if (diff) m.map = diff;
  return m;
}

// gravel: 자갈·현장 바닥
function matGravel(opts) {
  opts = opts || {};
  const rep  = opts.repeat || 8;
  const diff = getTex('gravel', rep, rep);
  const m = new THREE.MeshStandardMaterial({
    color:     opts.color || 0x9A8E80,
    roughness: 0.95,
    metalness: 0.0,
  });
  if (diff) m.map = diff;
  return m;
}

// metal: 강재·크레인·철골
function matMetal(opts) {
  opts = opts || {};
  const rep  = opts.repeat || 2;
  const diff = getTex('metal', rep, rep);
  const m = new THREE.MeshStandardMaterial({
    color:     opts.color || 0x8A8E90,
    roughness: opts.roughness != null ? opts.roughness : 0.45,
    metalness: opts.metalness != null ? opts.metalness : 0.75,
  });
  if (diff) m.map = diff;
  return m;
}

// rust: 낡은 금속 (드럼통, 임시 자재)
function matRust(opts) {
  opts = opts || {};
  const rep  = opts.repeat || 2;
  const diff = getTex('rust', rep, rep);
  const m = new THREE.MeshStandardMaterial({
    color:     opts.color || 0x8B5030,
    roughness: 0.82,
    metalness: 0.35,
  });
  if (diff) m.map = diff;
  return m;
}

// asphalt: 아스팔트·도로
function matAsphalt(opts) {
  opts = opts || {};
  const rep  = opts.repeat || 10;
  const diff = getTex('asphalt', rep, rep);
  const m = new THREE.MeshStandardMaterial({
    color:     opts.color || 0x555050,
    roughness: 0.92,
    metalness: 0.0,
  });
  if (diff) m.map = diff;
  return m;
}

// ── 씬 일괄 업그레이드 ────────────────────────────────────────
// 이미 씬에 있는 mesh 의 재질을 색상 기반으로 업그레이드
function upgradeMaterials(scene) {
  scene.traverse(obj => {
    if (!obj.isMesh) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    mats.forEach((m, i) => {
      const upgraded = _classifyAndUpgrade(m, obj);
      if (upgraded && upgraded !== m) {
        if (Array.isArray(obj.material)) {
          obj.material[i] = upgraded;
        } else {
          obj.material = upgraded;
        }
        m.dispose();
      }
    });
  });
}

// 기존 재질 색상/이름으로 업그레이드 재질 결정
function _classifyAndUpgrade(m, obj) {
  if (!m || !m.color) return null;
  if (m.map) return null; // 이미 텍스처 있음

  const c   = m.color.getHex();
  const name = (obj.name || '').toLowerCase();

  // 바닥/슬래브 (회색 콘크리트 계열)
  if (_inRange(c, 0x404040, 0xC0C0C0) && (name.includes('floor') || name.includes('ground') || name.includes('slab'))) {
    return matConcrete({ color: c, repeat: 6 });
  }
  // 벽 (수직 콘크리트)
  if (name.includes('wall') || name.includes('column') || name.includes('beam')) {
    return matWall({ color: c, repeat: 3 });
  }
  // 흙 (갈색)
  if (_inRange(c, 0x5A3010, 0xA07050)) {
    return matDirt({ color: c });
  }
  // 금속 (회청색, 금속성)
  if ((m.metalness && m.metalness > 0.3) || name.includes('crane') || name.includes('steel') || name.includes('beam')) {
    return matMetal({ color: c });
  }

  return null; // 변경 안 함
}

// 색상 범위 체크 헬퍼
function _inRange(hex, lo, hi) {
  const r = (hex >> 16) & 0xFF, g = (hex >> 8) & 0xFF, b = hex & 0xFF;
  const lr = (lo >> 16) & 0xFF, lg = (lo >> 8) & 0xFF, lb = lo & 0xFF;
  const hr = (hi >> 16) & 0xFF, hg = (hi >> 8) & 0xFF, hb = hi & 0xFF;
  return r >= lr && r <= hr && g >= lg && g <= hg && b >= lb && b <= hb;
}

// ── 전역 지형 재질 교체 ───────────────────────────────────────
// _buildGround 이후 호출 — 단일 ground plane 재질 교체
function upgradeGround() {
  GAME.scene.traverse(obj => {
    if (!obj.isMesh) return;
    if (obj.geometry && obj.geometry.parameters) {
      const p = obj.geometry.parameters;
      // 큰 PlaneGeometry (80×80 이상) = ground
      if (p.width && p.width >= 60 && p.height && p.height >= 60) {
        if (obj.material && !obj.material.map) {
          const newMat = matGravel({ repeat: 20 });
          newMat.color.setHex(obj.material.color ? obj.material.color.getHex() : 0x888070);
          obj.material.dispose();
          obj.material = newMat;
        }
      }
    }
  });
}

window.TEX             = TEX;
window.preloadTextures = preloadTextures;
window.getTex          = getTex;
window.matConcrete     = matConcrete;
window.matWall         = matWall;
window.matDirt         = matDirt;
window.matGravel       = matGravel;
window.matMetal        = matMetal;
window.matRust         = matRust;
window.matAsphalt      = matAsphalt;
window.upgradeMaterials = upgradeMaterials;
window.upgradeGround   = upgradeGround;
