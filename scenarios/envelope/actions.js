// S — 외장공사 액션·상태

const ENV_STATE = {
  planWritten:         false,
  planScaffoldType:    null,
  planScaffoldHeight:  null,
  planGuardrailLevels: null,
  planPanelType:       null,
  scaffoldInspected:   false,
  lifelineInstalled:   false,
  panelSecured:        false,
  signalAssigned:      false,
};

const ENV_CHECKS = [
  { test: () => !ENV_STATE.scaffoldInspected || ENV_STATE.planGuardrailLevels < 2,
    accidentId: 'scaffold_collapse', prob: 0.85 },
  { test: () => !ENV_STATE.lifelineInstalled, accidentId: 'envelope_fall', prob: 0.85 },
  { test: () => !ENV_STATE.panelSecured,     accidentId: 'panel_fall',    prob: 0.65 },
  { test: () => ENV_STATE.planPanelType === 'glass' && !ENV_STATE.panelSecured,
    accidentId: 'glass_shatter', prob: 0.55 },
  { test: () => !ENV_STATE.signalAssigned,    accidentId: 'panel_fall',    prob: 0.40 },
];

function getCurrentEnvPhase() {
  if (!ENV_STATE.planWritten)        return 1;
  if (!ENV_STATE.scaffoldInspected)  return 2;
  if (!ENV_STATE.lifelineInstalled)  return 3;
  if (!ENV_STATE.panelSecured)       return 4;
  if (!ENV_STATE.signalAssigned)     return 5;
  return 6;
}

function evaluateEnvelope() {
  if (GAME.state.liftStarted || GAME.state.gameOver) return;
  GAME.state.liftStarted = true;
  updateHUD();
  showActionNotif('외장 인양·설치 시작...', 2000);

  setTimeout(() => {
    if (GAME.state.gameOver) return;
    for (const check of ENV_CHECKS) {
      if (check.test() && Math.random() < check.prob) {
        triggerAccident(check.accidentId);
        return;
      }
    }
    if (typeof applySafetyReward === 'function') applySafetyReward(10);
    setTimeout(() => { if (typeof showCompletePanel === 'function') showCompletePanel(); }, 1500);
  }, 1800);
}

const ENV_PHASE_NAMES = {
  1: { ko: '작업계획',   en: 'Plan',       vi: 'Kế hoạch',   ar: 'الخطة' },
  2: { ko: '비계점검',   en: 'Scaffold',   vi: 'Giàn giáo',  ar: 'السقالة' },
  3: { ko: '안전대설비', en: 'Lifeline',   vi: 'Dây cứu',    ar: 'الحبل' },
  4: { ko: '외장결속',   en: 'Secure',     vi: 'Buộc tấm',   ar: 'الربط' },
  5: { ko: '신호수',     en: 'Signal',     vi: 'Hiệu lệnh',  ar: 'الإشارة' },
  6: { ko: '설치실행',   en: 'Install',    vi: 'Lắp đặt',    ar: 'التركيب' },
};

const ENV_PHASE_MISSIONS = {
  1: { ko: '📋 사무실에서 외장 작업계획서 작성 (E)',
       en: '📋 Write envelope work plan at the office (E)' },
  2: { ko: '🔍 비계 옆에서 조립검사·벽이음 점검 (E)',
       en: '🔍 Inspect scaffold ties and bracing (E)' },
  3: { ko: '🪢 안전대 부착설비(구명줄) 설치 (E)',
       en: '🪢 Install lifeline anchors (E)' },
  4: { ko: '📦 외장재 자재 적치 옆에서 결속 점검 (E)',
       en: '📦 Check panel ties at material area (E)' },
  5: { ko: '🦺 신호수 배치 (E)',
       en: '🦺 Assign signal person (E)' },
  6: { ko: '🏗 외장 인양·설치 시작 트리거 (E)',
       en: '🏗 Start envelope installation (E)' },
};
