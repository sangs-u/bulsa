'use strict';
// Structure Builder — scenarios/lifting/blueprints/structure-builder.js
// 공정 완료 시 도면 기반 구조물을 0.3초 간격 순차 페이드인

const STRUCTURE_BUILDER = {
  _blueprint:    null,
  _builtMeshes:  [],
  _stageIndex:   0,
  _building:     false,
  _FADE_STEP_MS: 300,   // 스테이지 간 딜레이 (ms)
  _FADE_DUR_MS:  600,   // 각 메시 페이드인 시간 (ms)

  // ── 도면 로드 ────────────────────────────────────────────────
  loadBlueprint(bp) {
    this._blueprint  = bp;
    this._stageIndex = 0;
    this._builtMeshes.forEach(m => GAME.scene.remove(m));
    this._builtMeshes = [];
    console.log('[SB] blueprint loaded:', bp.id, '—', bp.stages.length, 'stages');
  },

  // ── 다음 스테이지 빌드 (공정 완료마다 호출) ─────────────────
  buildNext() {
    if (!this._blueprint) return false;
    if (this._stageIndex >= this._blueprint.stages.length) return false;
    const stage = this._blueprint.stages[this._stageIndex];
    this._stageIndex++;
    this._fadeInStage(stage);
    _showBuildToast(stage);
    return true;
  },

  // ── 모든 스테이지를 0.3초 간격 순차 빌드 ───────────────────
  buildAll(onComplete) {
    if (!this._blueprint || this._building) return;
    this._building = true;
    const stages  = this._blueprint.stages;
    let   i       = this._stageIndex;

    const next = () => {
      if (i >= stages.length) {
        this._building = false;
        if (typeof onComplete === 'function') onComplete();
        return;
      }
      const stage = stages[i++];
      this._stageIndex = i;
      this._fadeInStage(stage);
      _showBuildToast(stage);
      setTimeout(next, this._FADE_STEP_MS + this._FADE_DUR_MS * 0.5);
    };
    next();
  },

  // ── 개별 스테이지 페이드인 ───────────────────────────────────
  _fadeInStage(stage) {
    if (typeof THREE === 'undefined' || typeof GAME === 'undefined') return;
    const meshDef = stage.mesh;
    if (!meshDef) return;

    const instances = _resolveRepeat(meshDef);
    instances.forEach((def, idx) => {
      setTimeout(() => {
        const mesh = _buildMesh(def);
        if (!mesh) return;
        mesh.material.transparent = true;
        mesh.material.opacity     = 0;
        GAME.scene.add(mesh);
        this._builtMeshes.push(mesh);
        _animateFadeIn(mesh, this._FADE_DUR_MS);
      }, idx * 80);
    });
  },

  // ── 리셋 ─────────────────────────────────────────────────────
  reset() {
    this._builtMeshes.forEach(m => GAME.scene.remove(m));
    this._builtMeshes = [];
    this._stageIndex  = 0;
    this._building    = false;
  },
};

// ── Three.js 메시 생성 ───────────────────────────────────────────
function _buildMesh(def) {
  if (typeof THREE === 'undefined') return null;
  let geo;
  const color = parseInt((def.color || '#AAAAAA').replace('#', ''), 16);

  if (def.type === 'columns') {
    // 여러 기둥을 Group으로
    const group = new THREE.Group();
    const cw = 0.5, cd = 0.5;
    const cols = def.cols || 2, rows = def.rows || 2;
    const xStep = def.w / (cols - 1), zStep = def.d / (rows - 1);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cGeo = new THREE.BoxGeometry(cw, def.h, cd);
        const mat  = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
        const mesh = new THREE.Mesh(cGeo, mat);
        mesh.position.set(
          -def.w / 2 + c * xStep,
          def.y,
          -def.d / 2 + r * zStep
        );
        mesh.castShadow = mesh.receiveShadow = true;
        group.add(mesh);
      }
    }
    // 빔 (수평보)
    [0, rows - 1].forEach(r => {
      const bGeo = new THREE.BoxGeometry(def.w, 0.3, 0.3);
      const mat  = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
      const beam = new THREE.Mesh(bGeo, mat);
      beam.position.set(0, def.y + def.h / 2 - 0.15, -def.d / 2 + r * (def.d / (rows - 1)));
      group.add(beam);
    });
    return group;
  }

  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.8,
    wireframe: !!def.wireframe,
  });
  geo = new THREE.BoxGeometry(def.w, def.h, def.d);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(def.x || 0, def.y || 0, def.z || 0);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

// ── repeat 지시자 처리 ───────────────────────────────────────────
function _resolveRepeat(meshDef) {
  if (!meshDef.repeat) return [meshDef];
  const { axis, count, spacing } = meshDef.repeat;
  const results = [];
  const origin = axis === 'x' ? (meshDef.x || 0) - (spacing * (count - 1)) / 2
               : axis === 'z' ? (meshDef.z || 0) - (spacing * (count - 1)) / 2
               : 0;
  for (let i = 0; i < count; i++) {
    const copy = Object.assign({}, meshDef, { repeat: undefined });
    if (axis === 'x') copy.x = origin + i * spacing;
    if (axis === 'z') copy.z = origin + i * spacing;
    results.push(copy);
  }
  return results;
}

// ── 페이드인 애니메이션 ──────────────────────────────────────────
function _animateFadeIn(mesh, durationMs) {
  const start = performance.now();
  const step  = () => {
    const t = Math.min(1, (performance.now() - start) / durationMs);
    if (mesh.isGroup) {
      mesh.children.forEach(c => { if (c.material) c.material.opacity = t; });
    } else if (mesh.material) {
      mesh.material.opacity = t;
    }
    if (t < 1) requestAnimationFrame(step);
    else {
      // 페이드인 완료 후 opacity 잠금 해제
      if (mesh.isGroup) {
        mesh.children.forEach(c => { if (c.material) c.material.transparent = false; });
      } else if (mesh.material) {
        mesh.material.transparent = false;
      }
    }
  };
  requestAnimationFrame(step);
}

// ── 토스트 메시지 ─────────────────────────────────────────────────
function _showBuildToast(stage) {
  const lang  = typeof currentLang !== 'undefined' ? currentLang : 'ko';
  const label = stage['label' + lang.charAt(0).toUpperCase() + lang.slice(1)]
             || stage.labelKo
             || stage.id;
  if (typeof showStructureComplete === 'function') {
    showStructureComplete(label + ' 완료');
  } else {
    const el = document.getElementById('structure-complete-msg');
    if (el) {
      el.textContent = '🏗 ' + label + ' 완료';
      el.classList.remove('hidden');
      setTimeout(() => el.classList.add('hidden'), 3000);
    }
  }
}

if (typeof window !== 'undefined') window.STRUCTURE_BUILDER = STRUCTURE_BUILDER;
