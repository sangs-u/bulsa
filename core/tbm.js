// TBM (Tool Box Meeting) — pre-phase safety briefing system
// Auto-triggers before each phase. Intercepts startLift() for Phase 2.

const TBM = {
  _completed: new Set(),  // set of phase numbers already TBM'd
  _pendingCallback: null,
  _allChecked: false,
};

GAME.state.tbmCompleted = TBM._completed;

// ── TBM content per phase ─────────────────────────────────────
const TBM_DATA = {
  1: {
    titleKo: 'TBM — 작업 전 안전점검',
    titleEn: 'TBM — Pre-Work Safety Briefing',
    workKo:  '오늘 작업: RC 보 인양을 위한 현장 사전점검',
    workEn:  "Today's work: Pre-inspection for RC beam lift",
    hazardsKo: ['슬링 손상(킹크) 확인', '안전핀 체결 상태 확인', '신호수 위치 확인', '작업반경 출입통제', '크레인 정격하중 확인'],
    hazardsEn: ['Check sling for kinks/damage', 'Verify safety pin engagement', 'Station signal person', 'Access control in lift zone', 'Verify crane rated capacity'],
    checklistKo: [
      '안전모·안전화·안전대 착용 확인',
      '작업허가서 발급 및 서명 완료',
      '무전기 통신 상태 확인',
      '인양 반경 출입통제 설정',
      '응급처치 키트 위치 파악',
    ],
    checklistEn: [
      'All PPE worn (helmet, boots, harness)',
      'Work permit issued and signed',
      'Radio communication verified',
      'Lift zone exclusion set up',
      'First aid kit location confirmed',
    ],
    roles: [
      { roleKo: '신호수',    roleEn: 'Signal Person', npcId: 'gimc'  },
      { roleKo: '슬링담당',  roleEn: 'Rigger',        npcId: 'park'  },
      { roleKo: '안전감시',  roleEn: 'Safety Watcher', npcId: 'lee'  },
    ],
  },
  2: {
    titleKo: 'TBM — 인양 작업 시작 전',
    titleEn: 'TBM — Pre-Lift Briefing',
    workKo:  '오늘 작업: RC 보 크레인 인양 (설계하중 3,000 kg)',
    workEn:  "Today's work: RC beam crane lift (design load 3,000 kg)",
    hazardsKo: ['과부하 재확인', '인양각도 최대 60° 준수', '신호수 무선 통신 유지', '인양 중 출입 금지 유지'],
    hazardsEn: ['Re-verify load vs capacity', 'Max sling angle 60°', 'Maintain radio with signal person', 'No entry during active lift'],
    checklistKo: [
      '슬링 최종 점검 완료',
      '크레인 정격하중 대비 사용률 확인 (< 85%)',
      '인양 반경 내 인원 전원 대피 확인',
      '신호수 무전기 통신 테스트 완료',
      '이상 시 즉시 정지 신호 합의',
    ],
    checklistEn: [
      'Final sling inspection complete',
      'Load usage ratio confirmed (< 85%)',
      'All personnel evacuated from lift zone',
      'Radio test with signal person done',
      'Agreed on "STOP" signal protocol',
    ],
    roles: [
      { roleKo: '크레인기사', roleEn: 'Crane Operator', npcId: null   },
      { roleKo: '신호수',     roleEn: 'Signal Person',  npcId: 'gimc' },
      { roleKo: '슬링담당',   roleEn: 'Rigger',         npcId: 'park' },
    ],
  },
};

// ── Intercept startLift ───────────────────────────────────────
const _origStartLift = typeof startLift === 'function' ? startLift : null;

function startLift() {
  if (!TBM._completed.has(2)) {
    showTBM(2, () => {
      if (_origStartLift) _origStartLift();
    });
  } else {
    if (_origStartLift) _origStartLift();
  }
}

// ── Show TBM panel ────────────────────────────────────────────
function showTBM(phase, onComplete) {
  if (TBM._completed.has(phase)) {
    if (onComplete) onComplete();
    return;
  }

  TBM._pendingCallback = onComplete;
  const panel = document.getElementById('tbm-panel');
  if (!panel) {
    TBM._completed.add(phase);
    if (onComplete) onComplete();
    return;
  }

  const data = TBM_DATA[phase] || TBM_DATA[1];
  const ko   = currentLang !== 'en';

  // Gather NPCs around player
  _gatherNPCs();

  // Title
  document.getElementById('tbm-title').textContent      = ko ? data.titleKo : data.titleEn;
  document.getElementById('tbm-phase-label').textContent = `Phase ${phase}`;
  document.getElementById('tbm-work').textContent        = ko ? data.workKo  : data.workEn;

  // Hazard list
  const hazList = document.getElementById('tbm-hazards');
  hazList.innerHTML = '';
  const hazards = ko ? data.hazardsKo : data.hazardsEn;
  hazards.forEach(h => {
    const li = document.createElement('li');
    li.textContent = h;
    hazList.appendChild(li);
  });

  // Checklist
  const chkList = document.getElementById('tbm-checklist');
  chkList.innerHTML = '';
  const checks = ko ? data.checklistKo : data.checklistEn;
  let checkedCount = 0;

  function updateProgress() {
    const pct = (checkedCount / checks.length) * 100;
    const fill = document.getElementById('tbm-progress-fill');
    if (fill) fill.style.width = pct + '%';
    const btn = document.getElementById('tbm-start-btn');
    if (btn) btn.disabled = checkedCount < checks.length;
  }

  checks.forEach((text, i) => {
    const row = document.createElement('div');
    row.className = 'tbm-check-item';
    row.innerHTML = `<div class="tbm-check-box"></div><span>${text}</span>`;
    row.onclick = () => {
      if (row.classList.contains('checked')) return;
      row.classList.add('checked');
      checkedCount++;
      updateProgress();
    };
    chkList.appendChild(row);
  });

  updateProgress();

  // Role assignments
  const roleContainer = document.getElementById('tbm-roles');
  roleContainer.innerHTML = '';
  data.roles.forEach(r => {
    const npc = r.npcId ? GAME.npcs.find(n => n.id === r.npcId) : null;
    const row = document.createElement('div');
    row.className = 'tbm-role-row';
    row.innerHTML = `<span class="tbm-role-name">${ko ? r.roleKo : r.roleEn}</span>
      <span class="tbm-role-assigned">${npc ? npc.name : (ko ? '미지정' : 'Unassigned')}</span>`;
    roleContainer.appendChild(row);
  });

  // Start button
  const startBtn = document.getElementById('tbm-start-btn');
  if (startBtn) {
    startBtn.textContent = ko ? '작업 시작' : 'Start Work';
    startBtn.onclick = () => completeTBM(phase);
  }

  panel.classList.remove('hidden');
  if (document.pointerLockElement) document.exitPointerLock();
}

function completeTBM(phase) {
  TBM._completed.add(phase);
  const panel = document.getElementById('tbm-panel');
  if (panel) panel.classList.add('hidden');

  // Unchecked items become violations
  const data = TBM_DATA[phase] || TBM_DATA[1];
  const ko   = currentLang !== 'en';
  const checks = ko ? data.checklistKo : data.checklistEn;
  const unchecked = document.querySelectorAll('#tbm-checklist .tbm-check-item:not(.checked)').length;
  if (unchecked > 0) {
    applySafetyPenalty(unchecked * 5);
    GAME.state.violations.add(`tbm_phase${phase}_${unchecked}unchecked`);
  }

  updateHUD();

  if (TBM._pendingCallback) {
    TBM._pendingCallback();
    TBM._pendingCallback = null;
  }

  if (GAME.state.gameStarted && !GAME.state.gameOver && window.matchMedia('(pointer: fine)').matches) {
    GAME.renderer.domElement.requestPointerLock();
  }
}

// ── NPC gathering animation ───────────────────────────────────
function _gatherNPCs() {
  if (!GAME.npcs) return;
  const cam = GAME.camera ? GAME.camera.position : new THREE.Vector3(0, 0, 0);
  const radius = 2.5;
  GAME.npcs.forEach((npc, i) => {
    const angle = (i / GAME.npcs.length) * Math.PI * 2;
    const tx = cam.x + Math.cos(angle) * radius;
    const tz = cam.z + Math.sin(angle) * radius;
    npc._targetPos = new THREE.Vector3(tx, 0, tz);

    let t = 0;
    const startX = npc.group.position.x, startZ = npc.group.position.z;
    function moveToGather() {
      t += 0.025;
      if (t > 1) t = 1;
      npc.group.position.x = startX + (tx - startX) * t;
      npc.group.position.z = startZ + (tz - startZ) * t;
      if (t < 1) requestAnimationFrame(moveToGather);
    }
    requestAnimationFrame(moveToGather);
  });
}

// ── Auto-show Phase 1 TBM on game start ──────────────────────
function initTBM() {
  // Watch for game start then show TBM
  const _check = setInterval(() => {
    if (GAME.state.gameStarted && !TBM._completed.has(1)) {
      clearInterval(_check);
      setTimeout(() => showTBM(1, null), 800); // small delay for scene to settle
    }
  }, 200);
}
