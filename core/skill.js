// 숙련도 시스템 — XP 누적, 레벨 산정, 영속화(localStorage), 미니게임 효과
// 도구별 사용 카운트 + 퀄리티 보너스 → XP → 레벨 → 게임 파라미터 완화

// 공종(Trade) — 건설 현장 직종 그룹
const TRADES = {
  earthworks: { ko: '토공', icon: '⛏', color: '#8B7355' },
  rebar:      { ko: '철근', icon: '🔧', color: '#585450' },
  formwork:   { ko: '거푸집', icon: '📐', color: '#9B7A2A' },
  concrete:   { ko: '콘크리트', icon: '🚚', color: '#B0AFA8' },
  lifting:    { ko: '양중', icon: '🏗', color: '#D4A217' },
  scaffold:   { ko: '비계', icon: '🪜', color: '#CFA418' },
  signal:     { ko: '신호·안전관리', icon: '🦺', color: '#CC5018' },
  electric:   { ko: '전기', icon: '⚡', color: '#FFCC00' },
  plumbing:   { ko: '설비·배관', icon: '🚰', color: '#2B6CB0' },
  finishing:  { ko: '마감', icon: '🎨', color: '#B87B6E' },
};

const SKILL_DEFS = {
  // 토공
  '매설물탐지':   { trade: 'earthworks', ko: '매설물 탐지', icon: '📡', desc: '신호 감지 범위 ↑' },
  '흙막이점검':   { trade: 'earthworks', ko: '흙막이 점검', icon: '🔍', desc: '점검 시간 ↓' },
  '안전난간':     { trade: 'earthworks', ko: '안전난간 설치', icon: '🛡', desc: '배치 허용 오차 ↑' },
  // 철근
  '철근보호캡':   { trade: 'rebar', ko: '철근 보호캡 점검', icon: '🔧', desc: '점검 시간 ↓' },
  // 거푸집
  '거푸집점검':   { trade: 'formwork', ko: '거푸집·동바리 점검', icon: '📐', desc: '점검 시간 ↓' },
  // 콘크리트
  '펌프카점검':   { trade: 'concrete', ko: '펌프카 점검', icon: '🚚', desc: '점검 시간 ↓' },
  '타설순서':     { trade: 'concrete', ko: '타설 순서 합의', icon: '🤝', desc: '점검 시간 ↓' },
  // 양중
  '슬링점검':     { trade: 'lifting', ko: '슬링 점검', icon: '🪢', desc: '점검 시간 ↓' },
  '안전핀체결':   { trade: 'lifting', ko: '훅 안전핀 체결', icon: '🔗', desc: '점검 시간 ↓' },
  '인양각도':     { trade: 'lifting', ko: '인양각도 측정', icon: '📐', desc: '점검 시간 ↓' },
  '크레인운전':   { trade: 'lifting', ko: '크레인 운전', icon: '🎮', desc: '운전 안정 ↑' },
  // 비계
  '비계점검':     { trade: 'scaffold', ko: '비계 조립검사', icon: '🪜', desc: '점검 시간 ↓' },
  '안전대설비':   { trade: 'scaffold', ko: '안전대 부착설비', icon: '🪢', desc: '점검 시간 ↓' },
  '외장결속':     { trade: 'scaffold', ko: '외장재 결속', icon: '📦', desc: '점검 시간 ↓' },
  // 신호·안전관리
  '신호수배치':   { trade: 'signal', ko: '신호수 배치', icon: '🦺', desc: '배치 시야 범위 ↑' },
  '외장신호수':   { trade: 'signal', ko: '외장 신호수', icon: '🦺', desc: '배치 시야 범위 ↑' },
  // 전기
  'LOTO':         { trade: 'electric', ko: 'LOTO 잠금', icon: '🔒', desc: '잠금 시간 ↓' },
  // 설비
  '가스점검':     { trade: 'plumbing', ko: '가스누설 점검', icon: '⚠', desc: '점검 시간 ↓' },
  '환기':         { trade: 'plumbing', ko: '환기 가동', icon: '🌬', desc: '점검 시간 ↓' },
  // 마감
  '소화기':       { trade: 'finishing', ko: '소화기 점검', icon: '🧯', desc: '점검 시간 ↓' },
};

// XP 임계치 (Lv1 → Lv2 → ... Lv10) — 누적
const SKILL_LEVELS = [0, 10, 30, 60, 100, 150, 220, 300, 400, 520, 700];

function _xpToLevel(xp) {
  for (let i = SKILL_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= SKILL_LEVELS[i]) return i + 1;
  }
  return 1;
}
function _xpToNextLevel(xp) {
  const lv = _xpToLevel(xp);
  if (lv >= SKILL_LEVELS.length) return null;
  return SKILL_LEVELS[lv];
}

function _storageKey() {
  const name = (GAME && GAME.state && GAME.state.playerName) || 'guest';
  return `bulsa.skill.${name}`;
}

function loadSkills() {
  try {
    const raw = localStorage.getItem(_storageKey());
    if (raw) GAME.state.skill = JSON.parse(raw);
    else GAME.state.skill = {};
  } catch (e) { GAME.state.skill = {}; }
}

function saveSkills() {
  try { localStorage.setItem(_storageKey(), JSON.stringify(GAME.state.skill || {})); } catch(e) {}
}

// 메인 API — 미니게임 완료 시 호출. xpAmount 생략 시 기본 10.
function bumpSkill(toolId, xpAmount) {
  GAME.state.skill = GAME.state.skill || {};
  const cur = GAME.state.skill[toolId] || { xp: 0, level: 1 };
  const oldLv = cur.level;
  cur.xp = (cur.xp || 0) + (xpAmount || 10);
  cur.level = _xpToLevel(cur.xp);
  GAME.state.skill[toolId] = cur;
  saveSkills();

  if (cur.level > oldLv) {
    const def = SKILL_DEFS[toolId] || { ko: toolId, icon: '🎯' };
    if (typeof showActionNotif === 'function') {
      showActionNotif(`🎉 LEVEL UP! ${def.icon} ${def.ko} Lv.${cur.level}`, 4500);
    }
  } else if (typeof showActionNotif === 'function') {
    const def = SKILL_DEFS[toolId] || { ko: toolId, icon: '🎯' };
    showActionNotif(`+${xpAmount || 10} XP ${def.icon} ${def.ko} Lv.${cur.level} (${cur.xp} XP)`, 2200);
  }
}

// 게임 효과 — 미니게임에서 직접 호출
function getSkillLevel(toolId) {
  const s = GAME.state.skill && GAME.state.skill[toolId];
  return s ? (s.level || 1) : 1;
}
function getSkillXP(toolId) {
  const s = GAME.state.skill && GAME.state.skill[toolId];
  return s ? (s.xp || 0) : 0;
}

// 미니게임 파라미터 보정
function applySkillToHold(baseHold, toolId) {
  const lv = getSkillLevel(toolId);
  return baseHold / (1 + (lv - 1) * 0.06);  // Lv5 ≈ -19%, Lv10 ≈ -35%
}
function applySkillToRange(baseRange, toolId) {
  const lv = getSkillLevel(toolId);
  return baseRange * (1 + (lv - 1) * 0.04);  // Lv10 ≈ +36%
}

// ── 대시보드 (K 키) ──────────────────────────────────────────
function toggleSkillDashboard() {
  let el = document.getElementById('skill-dashboard');
  if (!el) {
    el = document.createElement('div');
    el.id = 'skill-dashboard';
    document.body.appendChild(el);
  }
  if (el.classList.contains('hidden') || !el.classList.contains('visible')) {
    _renderSkillDashboard(el);
    el.classList.remove('hidden');
    el.classList.add('visible');
  } else {
    el.classList.remove('visible');
    el.classList.add('hidden');
  }
}

function _renderSkillDashboard(el) {
  const skills = GAME.state.skill || {};
  let html = `<div class="sd-header">🎯 숙련도 — ${(GAME.state.playerName || 'guest')}<button class="sd-close" onclick="toggleSkillDashboard()">✕</button></div>`;
  html += '<div class="sd-list">';

  // 공종별 그룹화
  const byTrade = {};
  for (const [id, def] of Object.entries(SKILL_DEFS)) {
    const t = def.trade || 'misc';
    if (!byTrade[t]) byTrade[t] = [];
    byTrade[t].push({ id, def });
  }

  for (const [tradeId, items] of Object.entries(byTrade)) {
    const trade = TRADES[tradeId] || { ko: tradeId, icon: '🔹' };
    // 공종 평균 레벨 계산
    let totalLv = 0;
    items.forEach(({ id }) => { totalLv += getSkillLevel(id); });
    const avgLv = (totalLv / items.length).toFixed(1);

    html += `<div class="sd-trade-header"><span class="sd-trade-icon">${trade.icon}</span><span class="sd-trade-name">${trade.ko}</span><span class="sd-trade-avg">평균 Lv.${avgLv}</span></div>`;
    for (const { id, def } of items) {
      const s = skills[id] || { xp: 0, level: 1 };
      const next = _xpToNextLevel(s.xp);
      const cur  = SKILL_LEVELS[s.level - 1] || 0;
      const ratio = next ? Math.min(1, (s.xp - cur) / (next - cur)) : 1;
      html += `
        <div class="sd-row">
          <span class="sd-icon">${def.icon}</span>
          <span class="sd-name">${def.ko}</span>
          <span class="sd-lv">Lv.${s.level}</span>
          <div class="sd-bar"><div class="sd-fill" style="width:${(ratio*100).toFixed(0)}%"></div></div>
          <span class="sd-xp">${s.xp} ${next ? `/ ${next}` : 'MAX'}</span>
        </div>`;
    }
  }
  html += '</div>';
  html += '<div class="sd-foot">K 키로 닫기 · 직접 수행 +XP / NPC 지시는 빠르지만 XP 없음 · 자동 저장</div>';
  el.innerHTML = html;
}

// ── 동료 지시 (Delegation) 골격 ─────────────────────────────
// 플레이어가 NPC 에게 작업 위임. NPC 가 위치로 이동 후 시간 소요 후 완료.
// 단순화: NPC 스킬(=공종 전문성) 따라 소요시간·성공률 결정.
const DELEGATION = {
  active: [], // [{ npcId, taskId, target, eta, onComplete }]
};

function assignTaskToNPC(npcId, taskId, target, baseTime, onComplete) {
  const npc = GAME.npcs && GAME.npcs.find(n => n.id === npcId);
  if (!npc) return false;
  // NPC 스킬 0.4~1.0 — 시간 단축 비율
  const eta = baseTime / (0.6 + npc.skill * 0.8);  // skill 1.0 → eta = baseTime / 1.4 ≈ -29%
  const task = { npcId, taskId, target, eta, elapsed: 0, onComplete };
  DELEGATION.active.push(task);
  npc._targetPos = new THREE.Vector3(target[0], 0, target[2]);
  npc.setState && npc.setState(NPC_STATES.WORKING);
  if (typeof showActionNotif === 'function') {
    showActionNotif(`👷 ${npc.name} 에게 작업 지시 — 예상 ${eta.toFixed(1)}초`, 3000);
  }
  return true;
}

function updateDelegation(delta) {
  if (DELEGATION.active.length === 0) return;
  for (let i = DELEGATION.active.length - 1; i >= 0; i--) {
    const t = DELEGATION.active[i];
    t.elapsed += delta;
    if (t.elapsed >= t.eta) {
      const npc = GAME.npcs && GAME.npcs.find(n => n.id === t.npcId);
      if (npc && typeof showActionNotif === 'function') {
        showActionNotif(`✅ ${npc.name}: ${t.taskId} 완료`, 3000);
      }
      if (t.onComplete) t.onComplete();
      DELEGATION.active.splice(i, 1);
    }
  }
}

// K 키 핸들러는 player.js keydown 또는 별도로 — 별도 등록
document.addEventListener('keydown', e => {
  if (e.code === 'KeyK' && GAME && GAME.state && GAME.state.gameStarted && !INTERACTION.popupOpen) {
    toggleSkillDashboard();
  }
});

function initSkill() {
  loadSkills();
}
