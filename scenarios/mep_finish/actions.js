// S — 설비·마감 액션·상태

const MEP_STATE = {
  planWritten:        false,
  planBreaker:        null,
  planPipeDiameter:   null,
  planFinishType:     null,
  planLotoProcedure:  false,
  lotoApplied:        false,
  gasChecked:         false,
  ventActivated:      false,
  extVerified:        false,
};

const MEP_CHECKS = [
  { test: () => !MEP_STATE.lotoApplied || !MEP_STATE.planLotoProcedure,
    accidentId: 'electric_shock', prob: 0.85 },
  { test: () => !MEP_STATE.gasChecked,
    accidentId: 'gas_explosion',  prob: 0.75 },
  { test: () => !MEP_STATE.ventActivated && (MEP_STATE.planFinishType === 'solvent' || MEP_STATE.planFinishType === 'epoxy'),
    accidentId: 'toxic_exposure', prob: 0.70 },
  { test: () => !MEP_STATE.extVerified,
    accidentId: 'fire_outbreak',  prob: 0.55 },
  // 계획서 매개변수 양방향 검증
  // 차단기 용량 < 부하 추정값 → 감전·과부하 화재
  { test: () => MEP_STATE.planBreaker !== null && MEP_STATE.planBreaker < 30,
    accidentId: 'electric_shock', prob: 0.55, planReason: 'breaker_undersized' },
  // 배관 직경 < 표준 (15mm) → 가스 누설 확률↑
  { test: () => MEP_STATE.planPipeDiameter !== null && MEP_STATE.planPipeDiameter < 15,
    accidentId: 'gas_explosion',  prob: 0.50, planReason: 'pipe_undersized' },
];

function getCurrentMepPhase() {
  if (!MEP_STATE.planWritten)    return 1;
  if (!MEP_STATE.lotoApplied)    return 2;
  if (!MEP_STATE.gasChecked)     return 3;
  if (!MEP_STATE.ventActivated)  return 4;
  if (!MEP_STATE.extVerified)    return 5;
  return 6;
}

function evaluateMepFinish() {
  if (GAME.state.liftStarted || GAME.state.gameOver) return;
  GAME.state.liftStarted = true;
  updateHUD();
  showActionNotif('준공검사 시작...', 2000);

  setTimeout(() => {
    if (GAME.state.gameOver) return;
    for (const check of MEP_CHECKS) {
      if (check.test() && Math.random() < check.prob) {
        triggerAccident(check.accidentId);
        return;
      }
    }
    if (typeof applySafetyReward === 'function') applySafetyReward(10);
    setTimeout(() => { if (typeof showCompletePanel === 'function') showCompletePanel(); }, 1500);
  }, 1800);
}

const MEP_PHASE_NAMES = {
  1: { ko: '작업계획',   en: 'Plan',       vi: 'Kế hoạch',   ar: 'الخطة' },
  2: { ko: 'LOTO잠금',   en: 'LOTO',       vi: 'LOTO',       ar: 'LOTO' },
  3: { ko: '가스점검',   en: 'Gas Check',  vi: 'Khí',        ar: 'الغاز' },
  4: { ko: '환기가동',   en: 'Vent',       vi: 'Thông gió',  ar: 'التهوية' },
  5: { ko: '소화기',     en: 'Fire Ext',   vi: 'Bình chữa',  ar: 'الإطفاء' },
  6: { ko: '준공검사',   en: 'Inspect',    vi: 'Nghiệm thu', ar: 'الفحص' },
};

const MEP_PHASE_MISSIONS = {
  1: { ko: '📋 설비·마감 작업계획서 작성 (E)',
       en: '📋 Write MEP & finishing work plan (E)' },
  2: { ko: '🔒 분전반에서 LOTO 잠금·표지 부착 (E)',
       en: '🔒 Apply LOTO at electric panel (E)' },
  3: { ko: '⚠ 가스 밸브에서 누설 점검 (E)',
       en: '⚠ Check gas leak at valve (E)' },
  4: { ko: '🌬 환기 그릴 옆에서 국소배기 가동 (E)',
       en: '🌬 Activate local exhaust at vent grille (E)' },
  5: { ko: '🧯 소화기 배치 점검 (E)',
       en: '🧯 Verify fire extinguishers (E)' },
  6: { ko: '✅ 책상 옆 트리거에서 준공검사 시작 (E)',
       en: '✅ Start final inspection at desk side trigger (E)' },
};
