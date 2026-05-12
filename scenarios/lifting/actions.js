// Lift action state — silently tracks what the player has done.
// Judgment ONLY at evaluateLift(). NO feedback to player during collection.

const LIFT_STATE = {
  planWritten:     false,  // Phase 1 완료
  safetyChecked:   false,  // Phase 2 완료
  outriggerExtended: false, // Phase 3 완료
  slingInspected:  false,
  pinSecured:      false,
  specChecked:     false,
  angleMeasured:   false,
  signalAssigned:  false,
  workerEvacuated: false,
};

// Evaluated in priority order: first failure = accident
const LIFT_CHECKS = [
  { key: 'workerEvacuated', accidentId: 'worker_crush', prob: 0.95 },
  { key: 'specChecked',     accidentId: 'overload',     prob: 0.45 },
  { key: 'slingInspected',  accidentId: 'sling_snap',   prob: 0.85 },
  { key: 'pinSecured',      accidentId: 'pin_drop',     prob: 0.82 },
  { key: 'angleMeasured',   accidentId: 'angle_break',  prob: 0.70 },
  { key: 'signalAssigned',  accidentId: 'no_signal',    prob: 0.55 },
];

// 계획서 매개변수 vs 실제 조건 양방향 검증
// 반환: { ok: bool, accidentId?, reason? }
function _validateLiftPlan() {
  const plan = (GAME.state.workPlans || {}).lifting;
  if (!plan || !plan.params) {
    // 계획서 미작성 — 사고 확률 가산 (overload 가정)
    return { ok: false, accidentId: 'overload', prob: 0.7, reason: 'plan_missing' };
  }
  const p = plan.params;

  // 1) 슬링 사용률 (SWL 대비)
  const betaRad = (p.angle_deg / 2) * Math.PI / 180;
  const K = 1 / Math.cos(betaRad);
  const Ts = (p.load_ton * K) / (p.lines || 2);
  const sr = Ts / p.sling_swl_ton;
  if (sr > 1.0) {
    return { ok: false, accidentId: 'sling_snap', prob: Math.min(0.95, 0.5 + (sr - 1.0) * 0.5), reason: 'plan_sling_overload' };
  }

  // 2) 각도 과대 → 슬링 각도 사고
  if (p.angle_deg > 90) {
    return { ok: false, accidentId: 'angle_break', prob: 0.7, reason: 'plan_angle_excessive' };
  }

  // 3) 가닥수 부족 (1줄걸이) — 안전계수 위반
  if ((p.lines || 2) < 2) {
    return { ok: false, accidentId: 'sling_snap', prob: 0.65, reason: 'plan_lines_insufficient' };
  }

  return { ok: true };
}

function evaluateLift() {
  if (GAME.state.liftStarted || GAME.state.gameOver) return;
  GAME.state.liftStarted = true;
  updateHUD();

  exitCraneCab();
  showActionNotif(({ ko:'인양 시작...', en:'Lift starting...', vi:'Bắt đầu cẩu...', ar:'بدء عملية الرفع...' })[currentLang] || '인양 시작...', 2000);

  setTimeout(() => {
    if (GAME.state.gameOver) return;

    // 1단계: 계획서 매개변수 양방향 검증
    const planEval = _validateLiftPlan();
    if (!planEval.ok && Math.random() < planEval.prob) {
      console.log('[lift] plan-mismatch accident:', planEval.reason);
      triggerAccident(planEval.accidentId);
      return;
    }

    // 2단계: 기존 LIFT_STATE boolean 체크
    for (const check of LIFT_CHECKS) {
      if (!LIFT_STATE[check.key] && Math.random() < check.prob) {
        triggerAccident(check.accidentId);
        return;
      }
    }
    animateLift();
  }, 1800);
}
