// rc_frame 5층 × 3 sub-step 회전 루프 컨트롤러
// 사이클: formwork_rebar → lift(기존) → pour_cure → 다음 층
// 기존 lifting 시나리오의 lift 흐름을 sub-step 2 로 흡수하여, 완료 시 advanceRcStep() 호출

const RC_LOOP = {
  totalFloors: 5,
  subSteps: ['formwork_rebar', 'lift', 'pour_cure'],
  _hudEl: null,
};

function initRcLoop() {
  GAME.state.rcLoop = GAME.state.rcLoop || {
    floor: 1,
    stepIdx: 0,   // 0=formwork, 1=lift, 2=pour
    completed: false,
    _taskIds: {}, // sub-step 명 → 활성 task.id
  };
  GAME.state.rcLoop._taskIds = GAME.state.rcLoop._taskIds || {};
  _ensureRcHud();
  _renderRcHud();
  _enqueueContinuousTasks();
}

// 사이클 동안 항상 활성인 지속 작업 — 한 번만 큐 등록
// loc 분산: 양중 반경(6m) 밖으로 배치해야 정상 사이클은 충돌 없음.
// NPC 위치가 양중 반경 안으로 들어오면 향후 task.loc 동기화로 충돌 평가.
function _enqueueContinuousTasks() {
  if (typeof addTask !== 'function') return;
  const rl = GAME.state.rcLoop;
  if (!rl._taskIds.lift && (typeof hasActiveTask !== 'function' || !hasActiveTask('lift'))) {
    const t = addTask({ type: 'lift', floor: rl.floor, loc: { x: 0, z: 0 } });
    if (t) rl._taskIds.lift = t.id;
  }
  if (!rl._taskIds.signal && (typeof hasActiveTask !== 'function' || !hasActiveTask('signal'))) {
    const t = addTask({ type: 'signal', floor: rl.floor, loc: { x: 7, z: 7 } });
    if (t) rl._taskIds.signal = t.id;
  }
}

// sub-step 명 → 큐에 들어갈 task type + 기본 loc
const _SUBSTEP_TASKS = {
  formwork_rebar: [
    { type: 'formwork', loc: { x:  8, z: 0 } }, // 양중 반경 밖
    { type: 'rebar',    loc: { x: -8, z: 0 } },
  ],
  lift:      [],                                 // 지속 lift 가 이미 처리
  pour_cure: [
    { type: 'pour', loc: { x: 0, z:  8 } },
    { type: 'cure', loc: { x: 0, z:  8 } },
  ],
};

function _enqueueSubStepTasks(step) {
  if (typeof addTask !== 'function') return;
  const rl    = GAME.state.rcLoop;
  const specs = _SUBSTEP_TASKS[step] || [];
  rl._taskIds[step] = rl._taskIds[step] || [];
  specs.forEach(spec => {
    const t = addTask({ type: spec.type, floor: rl.floor, loc: spec.loc });
    if (t) rl._taskIds[step].push(t.id);
  });
}

function _dequeueSubStepTasks(step) {
  if (typeof removeTask !== 'function') return;
  const rl   = GAME.state.rcLoop;
  const ids  = (rl._taskIds && rl._taskIds[step]) || [];
  ids.forEach(id => removeTask(id));
  if (rl._taskIds) rl._taskIds[step] = [];
}

function _updateContinuousTaskFloor() {
  // 지속 작업의 floor 를 현재 진행층으로 갱신 (간섭 평가 정확도용)
  const rl = GAME.state.rcLoop;
  if (!rl || !rl._taskIds) return;
  const tasks = (typeof getActiveTasks === 'function') ? getActiveTasks() : [];
  ['lift', 'signal'].forEach(key => {
    const id = rl._taskIds[key];
    const tk = id && tasks.find(t => t.id === id);
    if (tk) tk.floor = rl.floor;
  });
}

// ── task.loc ← NPC 위치 실시간 동기화 (매 프레임) ───────────
// 활성 task 의 type 에 매칭되는 NPC trade 가 있으면 그 NPC.group.position 으로 loc 갱신.
// lift / cure 는 고정 위치 유지 (각각 크레인 / 슬래브).
const _TASK_TYPE_TO_NPC_TRADE = {
  formwork: 'formwork',
  rebar:    'rebar',
  pour:     'pour',
  scaffold: 'scaffold',
  panel:    'envelope',
  electric: 'electric',
  plumb:    'plumbing',
  paint:    'painting',
  excavate: 'earthwork',
  signal:   'signal',
};

function updateRcLoopTaskLocs(/* delta */) {
  if (!GAME.npcs || !GAME.activeTasks || GAME.activeTasks.length === 0) return;
  // trade → 해당 trade NPC 배열 (다중 NPC 지원)
  const tradeToNpcs = {};
  for (const npc of GAME.npcs) {
    if (!npc.trade || !npc.group) continue;
    (tradeToNpcs[npc.trade] = tradeToNpcs[npc.trade] || []).push(npc);
  }
  // type 별 task index — 같은 type 의 task 가 여러 개일 때 다른 NPC 와 매칭
  const typeIdx = {};
  for (const task of GAME.activeTasks) {
    const trade = _TASK_TYPE_TO_NPC_TRADE[task.type];
    if (!trade) continue;
    const npcs = tradeToNpcs[trade];
    if (!npcs || npcs.length === 0) continue;
    const idx = typeIdx[task.type] || 0;
    const npc = npcs[idx % npcs.length];
    typeIdx[task.type] = idx + 1;
    if (!task.loc) task.loc = { x: 0, z: 0 };
    task.loc.x = npc.group.position.x;
    task.loc.z = npc.group.position.z;
  }
}
window.updateRcLoopTaskLocs = updateRcLoopTaskLocs;

function _ensureRcHud() {
  if (RC_LOOP._hudEl) return RC_LOOP._hudEl;
  const tl = document.getElementById('hud-tl');
  if (!tl) return null;
  const el = document.createElement('span');
  el.id = 'hud-rcloop';
  el.style.cssText = 'margin-left:10px;padding:2px 9px;border-radius:6px;' +
                     'background:rgba(40,80,140,0.55);color:#E8E8E8;' +
                     'font-family:monospace;font-size:13px;letter-spacing:0.4px';
  el.title = 'RC 골조 진행 (층/세부단계)';
  tl.appendChild(el);
  RC_LOOP._hudEl = el;
  return el;
}

function _renderRcHud() {
  const el = RC_LOOP._hudEl;
  if (!el) return;
  const s = GAME.state.rcLoop;
  if (!s) { el.textContent = ''; return; }
  const stepLabels = {
    ko: ['거푸집·철근', '양중', '타설·양생'],
    en: ['Formwork',    'Lift', 'Pour/Cure'],
    vi: ['Ván khuôn',   'Cẩu',  'Đổ/dưỡng hộ'],
    ar: ['القوالب',     'الرفع','الصب'],
  };
  const tips = {
    ko: 'RC 골조 진행 (층/세부단계)',
    en: 'RC frame progress (floor/sub-step)',
    vi: 'Tiến độ khung RC (tầng/bước con)',
    ar: 'تقدم الهيكل (الطابق/المرحلة الفرعية)',
  };
  const labels = stepLabels[currentLang] || stepLabels.ko;
  el.textContent = `🏗 ${s.floor}/${RC_LOOP.totalFloors}F · ${labels[s.stepIdx]}`;
  el.title       = tips[currentLang] || tips.ko;
}

// 언어 전환 외부 트리거용
function refreshRcLoopI18n() { _renderRcHud(); }
window.refreshRcLoopI18n = refreshRcLoopI18n;
// _renderRcHud 도 외부 접근 가능하게
RC_LOOP._renderRcHud = _renderRcHud;

// 한 sub-step 완료 시 호출 — 다음 sub-step 또는 다음 층으로 전환
function advanceRcStep() {
  const s = GAME.state.rcLoop;
  if (!s || s.completed) return;

  // 직전 sub-step 작업 큐에서 제거
  const prevStep = RC_LOOP.subSteps[s.stepIdx];
  _dequeueSubStepTasks(prevStep);

  s.stepIdx += 1;
  if (s.stepIdx >= RC_LOOP.subSteps.length) {
    s.stepIdx = 0;
    s.floor  += 1;
    // 층 시각화 한 단계 진행 (building.js)
    if (typeof advanceBuildingStage === 'function') advanceBuildingStage();
    _updateContinuousTaskFloor();
  }

  if (s.floor > RC_LOOP.totalFloors) {
    s.completed = true;
    // 사이클 종료 — 지속 작업도 모두 제거
    if (typeof removeTask === 'function' && s._taskIds) {
      ['lift', 'signal'].forEach(k => s._taskIds[k] && removeTask(s._taskIds[k]));
      s._taskIds.lift = null;
      s._taskIds.signal = null;
    }
    _renderRcHud();
    if (typeof showActionNotif === 'function') {
      const msgs = {
        ko: '🏆 5층 골조공사 완료 — 외장공사로 전환',
        en: '🏆 5F structural frame complete — moving to Envelope',
        vi: '🏆 Hoàn thành khung 5 tầng — chuyển sang vỏ ngoài',
        ar: '🏆 اكتمل هيكل 5 طوابق — الانتقال إلى الواجهة',
      };
      showActionNotif(msgs[currentLang] || msgs.ko, 6000);
    }
    // 외장공사로 자동 진행 — showCompletePanel 의 다음 공정 흐름 재사용
    if (typeof showCompletePanel === 'function') {
      setTimeout(showCompletePanel, 2000);
    }
    return;
  }

  _renderRcHud();
  // 다음 sub-step 자동 시작
  const next = RC_LOOP.subSteps[s.stepIdx];
  _enqueueSubStepTasks(next);
  setTimeout(() => _startSubStep(next), 800);
}

function _startSubStep(step) {
  switch (step) {
    case 'formwork_rebar':
      if (typeof startFormworkRebar === 'function') startFormworkRebar(GAME.state.rcLoop.floor);
      break;
    case 'lift':
      // interaction.js 의 양중 흐름이 메인 — RC_LOOP 은 sub-step 보조만 담당
      // 양중 완료는 interaction.js _onBeamPlaced 에서 advanceBuildingStage + RC 보조 트리거를 직접 발화
      // 여기서는 interaction.js 가 이미 처리한 것으로 간주
      setTimeout(advanceRcStep, 500);
      break;
    case 'pour_cure':
      if (typeof startPourCure === 'function') startPourCure(GAME.state.rcLoop.floor);
      break;
  }
}

// formwork_rebar 완료 후 interaction.js 로 양중 재개 신호
function _afterFormworkRebar() {
  if (typeof GAME._rcAfterFormwork === 'function') {
    const cb = GAME._rcAfterFormwork;
    GAME._rcAfterFormwork = null;
    cb();
  }
}

// 1층 양중 완료 후 호출 — RC 루프 진입점
function enterRcLoopAfterFirstLift() {
  initRcLoop();
  // 1층은 formwork 부터 다시 시작하지 않고 lift 가 이미 완료된 상태로 간주
  GAME.state.rcLoop.stepIdx = 2; // pour_cure 부터
  _renderRcHud();
  _enqueueSubStepTasks('pour_cure');
  setTimeout(() => _startSubStep('pour_cure'), 1500);
}

window.RC_LOOP                  = RC_LOOP;
window.initRcLoop               = initRcLoop;
window.advanceRcStep            = advanceRcStep;
window.enterRcLoopAfterFirstLift = enterRcLoopAfterFirstLift;
