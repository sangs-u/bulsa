// S — 토공사 액션·상태
// 양중과 동일 구조: EXCAV_STATE 추적, evaluateExcavation 에서 일괄 판정.

const EXCAV_STATE = {
  planWritten:        false,  // Phase 1
  // 작업 지시 매개변수 (Phase 1 입력)
  planDepth:          null,   // number (m)
  planSlope:          null,   // number (1:N의 N)
  planShoring:        null,   // 'none'|'h_pile'|'sheet_pile'|'earth_anchor'
  planUnderground:    false,  // boolean (매설물 도면 확인)
  // 후속 단계
  surveyDone:         false,  // Phase 2 매설물 사전조사
  shoringInstalled:   false,  // Phase 3 흙막이 가시설
  railingInstalled:   false,  // Phase 4 안전난간
  signalAssigned:     false,  // Phase 5 신호수 배치
};

// 사고 트리거 우선순위 — 깊이/구배 등 작업 지시 위반은 사고 직결
const EXCAV_CHECKS = [
  { test: () => !EXCAV_STATE.planUnderground, accidentId: 'underground_strike', prob: 0.75 },
  { test: () => !EXCAV_STATE.surveyDone,       accidentId: 'underground_strike', prob: 0.55 },
  { test: () => EXCAV_STATE.planDepth >= 5 && (EXCAV_STATE.planShoring === 'none' || !EXCAV_STATE.shoringInstalled),
    accidentId: 'soil_collapse', prob: 0.90 },
  { test: () => !EXCAV_STATE.shoringInstalled && EXCAV_STATE.planDepth >= 1.5,
    accidentId: 'soil_collapse', prob: 0.55 },
  { test: () => !EXCAV_STATE.railingInstalled && EXCAV_STATE.planDepth >= 2.0,
    accidentId: 'edge_fall', prob: 0.55 },
  { test: () => !EXCAV_STATE.signalAssigned, accidentId: 'excavator_crush', prob: 0.55 },
];

// Phase 게이팅
function getCurrentExcavPhase() {
  if (!EXCAV_STATE.planWritten)      return 1;
  if (!EXCAV_STATE.surveyDone)       return 2;
  if (!EXCAV_STATE.shoringInstalled) return 3;
  if (!EXCAV_STATE.railingInstalled) return 4;
  if (!EXCAV_STATE.signalAssigned)   return 5;
  return 6;
}

function evaluateExcavation() {
  if (GAME.state.liftStarted || GAME.state.gameOver) return;
  GAME.state.liftStarted = true;
  updateHUD();

  exitExcavCab && exitExcavCab();
  showActionNotif(t('excavExecStart') || '굴착 시작...', 2000);

  setTimeout(() => {
    if (GAME.state.gameOver) return;
    for (const check of EXCAV_CHECKS) {
      if (check.test() && Math.random() < check.prob) {
        triggerAccident(check.accidentId);
        return;
      }
    }
    animateExcavation();
  }, 1800);
}

// 굴착 성공 애니메이션 — 굴착기가 흙더미 쪽으로 회전, 부지가 음각 색으로 표시
function animateExcavation() {
  // 단순 성공: 안전지수 보상 + 완료 패널
  if (typeof applySafetyReward === 'function') applySafetyReward(10);
  setTimeout(() => {
    if (typeof showCompletePanel === 'function') showCompletePanel();
  }, 1500);
}

// ── Phase 별 라벨 ────────────────────────────────────────────
const EXCAV_PHASE_NAMES = {
  1: { ko: '작업계획', en: 'Plan',     vi: 'Kế hoạch',  ar: 'الخطة' },
  2: { ko: '매설물조사', en: 'Survey',  vi: 'Khảo sát', ar: 'مسح' },
  3: { ko: '흙막이',   en: 'Shoring',   vi: 'Chống vách', ar: 'الدعم' },
  4: { ko: '안전난간', en: 'Railing',   vi: 'Lan can',    ar: 'الحاجز' },
  5: { ko: '신호수',   en: 'Signal',    vi: 'Hiệu lệnh',  ar: 'الإشارة' },
  6: { ko: '굴착실행', en: 'Excavate', vi: 'Đào',        ar: 'الحفر' },
};

const EXCAV_PHASE_MISSIONS = {
  1: { ko: '📋 사무실 책상에서 굴착 작업계획서를 작성하세요 (E)',
       en: '📋 Write excavation work plan at the office desk (E)' },
  2: { ko: '🗺 매설물 도면 마커(노란 점선)에서 사전조사 확인 (E)',
       en: '🗺 Confirm underground survey at utility markers (E)' },
  3: { ko: '🔩 굴착 외곽 H-pile 위치에서 흙막이 설치 (E)',
       en: '🔩 Install shoring at H-pile positions (E)' },
  4: { ko: '🛡 굴착단부 안전난간 트리거에서 설치 (E)',
       en: '🛡 Install edge guardrails at pit perimeter (E)' },
  5: { ko: '🦺 굴착기 옆 신호수 위치 지정 (E)',
       en: '🦺 Assign signal person near excavator (E)' },
  6: { ko: '🚜 굴착기 운전석 탑승(E) → 굴착 시작',
       en: '🚜 Board excavator cab (E) → Start dig' },
};
