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
  };
  _ensureRcHud();
  _renderRcHud();
}

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
  const labels = stepLabels[currentLang] || stepLabels.ko;
  el.textContent = `🏗 ${s.floor}/${RC_LOOP.totalFloors}F · ${labels[s.stepIdx]}`;
}

// 한 sub-step 완료 시 호출 — 다음 sub-step 또는 다음 층으로 전환
function advanceRcStep() {
  const s = GAME.state.rcLoop;
  if (!s || s.completed) return;

  s.stepIdx += 1;
  if (s.stepIdx >= RC_LOOP.subSteps.length) {
    s.stepIdx = 0;
    s.floor  += 1;
    // 층 시각화 한 단계 진행 (building.js)
    if (typeof advanceBuildingStage === 'function') advanceBuildingStage();
  }

  if (s.floor > RC_LOOP.totalFloors) {
    s.completed = true;
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
  setTimeout(() => _startSubStep('pour_cure'), 1500);
}

window.RC_LOOP                  = RC_LOOP;
window.initRcLoop               = initRcLoop;
window.advanceRcStep            = advanceRcStep;
window.enterRcLoopAfterFirstLift = enterRcLoopAfterFirstLift;
