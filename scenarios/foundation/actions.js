// S — 기초공사 액션·상태

const FOUND_STATE = {
  planWritten:      false,
  planMatArea:      null,
  planRebarSpacing: null,
  planConcStrength: null,
  planShoringSpace: null,
  rebarCapsOk:      false,
  formworkOk:       false,
  pumpOk:           false,
  pourOrderAgreed:  false,
};

const FOUND_CHECKS = [
  { test: () => !FOUND_STATE.rebarCapsOk, accidentId: 'rebar_stab',    prob: 0.65 },
  { test: () => !FOUND_STATE.formworkOk || (FOUND_STATE.planShoringSpace || 0) > 1.0,
    accidentId: 'form_collapse', prob: 0.85 },
  { test: () => !FOUND_STATE.pumpOk,      accidentId: 'pump_burst',    prob: 0.55 },
  { test: () => !FOUND_STATE.pourOrderAgreed, accidentId: 'pour_crush', prob: 0.55 },
];

function getCurrentFoundPhase() {
  if (!FOUND_STATE.planWritten)     return 1;
  if (!FOUND_STATE.rebarCapsOk)     return 2;
  if (!FOUND_STATE.formworkOk)      return 3;
  if (!FOUND_STATE.pumpOk)          return 4;
  if (!FOUND_STATE.pourOrderAgreed) return 5;
  return 6;
}

function evaluateFoundation() {
  if (GAME.state.liftStarted || GAME.state.gameOver) return;
  GAME.state.liftStarted = true;
  updateHUD();
  showActionNotif('콘크리트 타설 시작...', 2000);

  setTimeout(() => {
    if (GAME.state.gameOver) return;
    for (const check of FOUND_CHECKS) {
      if (check.test() && Math.random() < check.prob) {
        triggerAccident(check.accidentId);
        return;
      }
    }
    if (typeof applySafetyReward === 'function') applySafetyReward(10);
    setTimeout(() => { if (typeof showCompletePanel === 'function') showCompletePanel(); }, 1500);
  }, 1800);
}

const FOUND_PHASE_NAMES = {
  1: { ko: '작업계획',   en: 'Plan',      vi: 'Kế hoạch',   ar: 'الخطة' },
  2: { ko: '철근',       en: 'Rebar',     vi: 'Cốt thép',   ar: 'الحديد' },
  3: { ko: '거푸집',     en: 'Formwork',  vi: 'Ván khuôn',  ar: 'القالب' },
  4: { ko: '펌프카점검', en: 'Pump Chk',  vi: 'Kiểm tra bơm', ar: 'فحص المضخة' },
  5: { ko: '타설순서',   en: 'Order',     vi: 'Trình tự',   ar: 'الترتيب' },
  6: { ko: '타설실행',   en: 'Pour',      vi: 'Đổ',         ar: 'الصب' },
};

const FOUND_PHASE_MISSIONS = {
  1: { ko: '📋 사무실 책상에서 기초 작업계획서를 작성하세요 (E)',
       en: '📋 Write foundation work plan at the desk (E)' },
  2: { ko: '🔧 매트 코너에서 노출 철근 보호캡을 점검하세요 (E)',
       en: '🔧 Inspect rebar protective caps at mat corners (E)' },
  3: { ko: '📐 거푸집 외곽에서 동바리·수직도 점검 (E)',
       en: '📐 Inspect formwork and shoring verticality (E)' },
  4: { ko: '🚚 펌프카에서 호스·아웃트리거 점검 (E)',
       en: '🚚 Inspect pump truck hose and outriggers (E)' },
  5: { ko: '🤝 타설 순서·신호 방법 사전 합의 (E)',
       en: '🤝 Agree pour sequence and signals (E)' },
  6: { ko: '⚙ 타설 제어반에서 콘크리트 타설 시작 (E)',
       en: '⚙ Start pour at the pump console (E)' },
};
