// act.js — v4 행위 시스템
// 행위 정의 + hold_e 게이지 + 완료 콜백 + 위험 연동

// ── 행위 정의 레지스트리 ─────────────────────────────────────
const ACT_DEFS = {};

function defineAct(def) {
  // def: { id, label, requires, inputMode, duration, hazardEffect, onComplete }
  ACT_DEFS[def.id] = def;
}

// ── 현재 진행 중인 행위 상태 ─────────────────────────────────
const ACT_STATE = {
  active:    null,   // 현재 행위 id
  progress:  0,      // 0~1
  markerId:  null,   // 대상 marker id
  _holdT:    0,
};

// ── 행위 시작 (E키 홀드 시작) ────────────────────────────────
function actStart(actId, markerId) {
  const def = ACT_DEFS[actId];
  if (!def) return false;

  // 조건 검사
  const err = _checkRequires(def);
  if (err) {
    if (typeof showActionNotif === 'function') showActionNotif(err, 2200);
    return false;
  }

  ACT_STATE.active   = actId;
  ACT_STATE.progress = 0;
  ACT_STATE._holdT   = 0;
  ACT_STATE.markerId = markerId || null;

  _showGauge(true);
  return true;
}

// ── 매 프레임 (E키 홀드 중) ──────────────────────────────────
function actTick(delta, eHeld) {
  if (!ACT_STATE.active) return;
  const def = ACT_DEFS[ACT_STATE.active];
  if (!def) { actCancel(); return; }

  if (!eHeld) { actCancel(); return; }

  ACT_STATE._holdT   += delta;
  ACT_STATE.progress  = Math.min(1, ACT_STATE._holdT / (def.duration || 2.0));
  _updateGauge(ACT_STATE.progress);

  if (ACT_STATE.progress >= 1) {
    _actComplete(def);
  }
}

// ── 행위 취소 (E키 뗌) ───────────────────────────────────────
function actCancel() {
  ACT_STATE.active   = null;
  ACT_STATE.progress = 0;
  ACT_STATE._holdT   = 0;
  _showGauge(false);
}

// ── 행위 완료 ────────────────────────────────────────────────
function _actComplete(def) {
  _showGauge(false);

  // 위험 수치 변경
  if (def.hazardEffect && typeof adjustHazards === 'function') {
    Object.entries(def.hazardEffect).forEach(([zoneId, deltas]) => {
      adjustHazards(zoneId, deltas);
    });
  }

  // 자재 소모
  if (def.consumeMaterial && typeof carryConsume === 'function') {
    carryConsume();
  }

  // 완료 콜백
  if (typeof def.onComplete === 'function') {
    def.onComplete({ markerId: ACT_STATE.markerId });
  }

  // 알림
  if (def.completeMsg && typeof showActionNotif === 'function') {
    const lang = (typeof currentLang !== 'undefined') ? currentLang : 'ko';
    showActionNotif(def.completeMsg[lang] || def.completeMsg.ko, 2500);
  }

  // 안전 보상
  if (def.safetyReward && typeof applySafetyReward === 'function') {
    applySafetyReward(def.safetyReward);
  }

  ACT_STATE.active   = null;
  ACT_STATE.progress = 0;
  ACT_STATE._holdT   = 0;
  ACT_STATE.markerId = null;
}

// ── 조건 검사 ────────────────────────────────────────────────
function _checkRequires(def) {
  const req = def.requires;
  if (!req) return null;
  const lang = (typeof currentLang !== 'undefined') ? currentLang : 'ko';

  if (req.materialHeld) {
    const held = (typeof CARRY !== 'undefined') && CARRY.held;
    if (!held || held.def.id !== req.materialHeld) {
      const matDef = MAT_DEFS[req.materialHeld];
      const matLabel = matDef ? (matDef.label[lang] || matDef.label.ko) : req.materialHeld;
      return ({ ko: `${matLabel}을(를) 먼저 들어야 합니다.`, en: `Pick up ${matLabel} first.` })[lang];
    }
  }

  if (req.noMaterialHeld) {
    if (typeof CARRY !== 'undefined' && CARRY.held) {
      return ({ ko: '자재를 내려놓고 진행하세요 [G]', en: 'Drop your material first [G]' })[lang];
    }
  }

  if (req.stateFlag) {
    const [stateObj, key] = req.stateFlag;
    const obj = typeof window[stateObj] !== 'undefined' ? window[stateObj] : null;
    if (!obj || !obj[key]) {
      return (req.stateFlagMsg || { ko: '선행 작업이 필요합니다.', en: 'Prior step required.' })[lang];
    }
  }

  return null;
}

// ── 게이지 UI ────────────────────────────────────────────────
let _gaugeEl = null;

function _showGauge(visible) {
  if (!_gaugeEl) _initGaugeEl();
  _gaugeEl.style.display = visible ? 'block' : 'none';
  if (!visible) _updateGauge(0);
}

function _updateGauge(pct) {
  if (!_gaugeEl) return;
  const bar = _gaugeEl.querySelector('.act-bar-fill');
  if (bar) bar.style.width = `${Math.round(pct * 100)}%`;
  const label = _gaugeEl.querySelector('.act-label');
  if (label && ACT_STATE.active) {
    const def  = ACT_DEFS[ACT_STATE.active];
    const lang = (typeof currentLang !== 'undefined') ? currentLang : 'ko';
    label.textContent = def ? (def.label[lang] || def.label.ko) : '';
  }
}

function _initGaugeEl() {
  _gaugeEl = document.createElement('div');
  _gaugeEl.id = 'act-gauge';
  _gaugeEl.style.cssText = [
    'position:fixed', 'bottom:18%', 'left:50%', 'transform:translateX(-50%)',
    'width:220px', 'background:rgba(0,0,0,0.72)', 'border-radius:6px',
    'padding:8px 12px', 'display:none', 'z-index:4000', 'pointer-events:none',
    'font-family:monospace', 'color:#fff', 'font-size:13px',
  ].join(';');
  _gaugeEl.innerHTML = `
    <div class="act-label" style="margin-bottom:5px;text-align:center;font-size:12px;opacity:0.85"></div>
    <div style="background:rgba(255,255,255,0.15);border-radius:3px;height:8px;overflow:hidden">
      <div class="act-bar-fill" style="height:100%;width:0%;background:#48BB78;transition:width 0.08s linear;border-radius:3px"></div>
    </div>
    <div style="text-align:center;font-size:10px;opacity:0.6;margin-top:4px">E 홀드</div>
  `;
  document.body.appendChild(_gaugeEl);
}

// ── E키 홀드 상태 추적 ───────────────────────────────────────
// interaction.js E키 핸들러에서 actTick 호출 필요
// player.js updatePlayer 에서: if (PLAYER.keys['KeyE']) actTick(delta, true)

// ── 행위 정의 초기화 (각 페이즈에서 호출) ────────────────────
function clearActDefs() {
  Object.keys(ACT_DEFS).forEach(k => delete ACT_DEFS[k]);
  actCancel();
}
