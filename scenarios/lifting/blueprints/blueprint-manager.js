'use strict';
// Blueprint Manager — scenarios/lifting/blueprints/blueprint-manager.js
// 도면 5종 로드·전환·STRUCTURE_BUILDER 연동

const BLUEPRINT_MANAGER = {
  _blueprints: {},   // id → JSON
  _activeId:   null,
  _baseUrl:    'scenarios/lifting/blueprints/',

  // ── 초기화: 5종 비동기 로드 ─────────────────────────────────
  async init() {
    const ids = ['warehouse', 'office', 'factory', 'apartment', 'bridge'];
    await Promise.all(ids.map(id => this._load(id)));
    console.log('[BM] blueprints loaded:', ids.join(', '));
  },

  async _load(id) {
    try {
      const res  = await fetch(this._baseUrl + id + '.json');
      const data = await res.json();
      this._blueprints[id] = data;
    } catch (e) {
      console.warn('[BM] failed to load blueprint:', id, e.message);
    }
  },

  // ── 활성 도면 설정 ───────────────────────────────────────────
  setActive(id) {
    if (!this._blueprints[id]) {
      console.warn('[BM] blueprint not found:', id);
      return;
    }
    this._activeId = id;
    const bp = this._blueprints[id];
    console.log('[BM] active blueprint →', id, `(${bp.nameKo})`);
    if (typeof STRUCTURE_BUILDER !== 'undefined') {
      STRUCTURE_BUILDER.loadBlueprint(bp);
    }
    return bp;
  },

  // ── 현재 도면 반환 ───────────────────────────────────────────
  get active() {
    return this._blueprints[this._activeId] || null;
  },

  // ── 도면 이름 (i18n) ─────────────────────────────────────────
  getName(id) {
    const bp   = this._blueprints[id];
    if (!bp) return id;
    const lang = typeof currentLang !== 'undefined' ? currentLang : 'ko';
    return bp['name' + lang.charAt(0).toUpperCase() + lang.slice(1)] || bp.nameKo || id;
  },

  // ── 도면 목록 반환 ───────────────────────────────────────────
  list() {
    return Object.values(this._blueprints);
  },
};

if (typeof window !== 'undefined') window.BLUEPRINT_MANAGER = BLUEPRINT_MANAGER;
