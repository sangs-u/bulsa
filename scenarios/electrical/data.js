// S04 — 전기작업 (LOTO) | Electrical Work / Lockout-Tagout
// 산안규칙 제319조~321조, 제44조, KOSHA GUIDE E-2009-53

const ELECTRICAL_DATA = {
  scenarioId: 'electrical',
  kosha: ['산안규칙 제319조~321조', '제44조 (접근한계거리)', '산안법 제38조'],

  // ── Approach distance table (규칙 제44조, 별표1) ──────────
  approachLimits: [
    { maxVolt: 300,   label: '300V 이하',   dist: '접촉금지',  distM: null },
    { maxVolt: 750,   label: '300~750V',    dist: '30 cm',     distM: 0.30 },
    { maxVolt: 2000,  label: '750~2kV',     dist: '45 cm',     distM: 0.45 },
    { maxVolt: 15000, label: '2~15 kV',     dist: '60 cm',     distM: 0.60 },
    { maxVolt: 37000, label: '15~37 kV',    dist: '90 cm',     distM: 0.90 },
    { maxVolt: 88000, label: '37~88 kV',    dist: '150 cm',    distM: 1.50 },
    { maxVolt: 121000,label: '88~121 kV',   dist: '180 cm',    distM: 1.80 },
    { maxVolt: 145000,label: '121~145 kV',  dist: '210 cm',    distM: 2.10 },
    { maxVolt: 550000,label: '145~550 kV',  dist: '380~640 cm',distM: 3.80 },
  ],

  // ── 9-Step LOTO procedure (규칙 제320조) ─────────────────
  lotoSteps: [
    { step: 1, ko: '담당자에게 차단 요청',          en: 'Notify authorized person to de-energize' },
    { step: 2, ko: '차단기(VCB/MCCB) OFF 확인',    en: 'Open breaker, visually confirm OFF' },
    { step: 3, ko: '개인 잠금장치 + 꼬리표 부착',  en: 'Apply personal lock and DANGER tag' },
    { step: 4, ko: '검전기로 무전압 확인 (3상)',    en: 'Verify zero voltage with tester (3-phase)' },
    { step: 5, ko: '잔류전하 방전·접지 실시',       en: 'Discharge residual charge, apply ground' },
    { step: 6, ko: '절연 PPE 착용 후 작업 수행',    en: 'Wear insulated PPE, perform work' },
    { step: 7, ko: '임시 접지선 제거',              en: 'Remove temporary ground' },
    { step: 8, ko: '인원 복귀 확인 후 꼬리표 제거', en: 'Confirm all personnel back, remove tag' },
    { step: 9, ko: '최종 승인 후 통전',             en: 'Final authorization, restore power' },
  ],

  // ── Hazard types ──────────────────────────────────────────
  hazardTypes: [
    { id: 'no_loto',         critical: true,  law: '제320조', descKo: '잠금장치·꼬리표 미부착' },
    { id: 'no_voltage_test', critical: true,  law: '제320조', descKo: '검전 없이 작업 착수' },
    { id: 'no_ground',       critical: true,  law: '제320조', descKo: '잔류전하 방전·접지 미실시' },
    { id: 'live_work',       critical: true,  law: '제319조', descKo: '정전 미확인 활선 작업' },
    { id: 'no_ppe',          critical: false, law: '제44조',  descKo: '절연 장갑·절연화 미착용' },
    { id: 'approach_limit',  critical: true,  law: '제44조',  descKo: '접근한계거리 미준수' },
  ],

  // ── Accident definitions ──────────────────────────────────
  accidents: {
    electric_shock: {
      descKo:      'LOTO 미실시 상태에서 활선 접촉으로 감전 사고가 발생했습니다.',
      causeKo:     '정전 확인 없이 작업 / 잠금장치 미부착으로 다른 작업자가 통전',
      lawKo:       '산안규칙 제319조 (충전전로 작업 금지)\n제320조 (정전전로 작업 시 조치)\n제321조 (잠금·표지 의무)',
      procedureKo: lotoStepsKo(),
    },
    arc_flash: {
      descKo:      '접근한계거리 미준수로 아크 플래시가 발생, 화상을 입었습니다.',
      causeKo:     '고압 전로 접근한계거리 이탈 / 절연 PPE 미착용',
      lawKo:       '산안규칙 제44조 (충전전로 인근 작업 시 접근한계거리)\n별표1',
      procedureKo: ['전압 확인 후 접근한계거리 산출', '이격 거리 이상 확보 후 작업', '절연 장갑·절연화·절연 보호구 착용'],
    },
  },

  phases: [
    { id: 1, missionKo: '작업 전 LOTO 9단계를 순서대로 수행하세요' },
    { id: 2, missionKo: '안전한 상태를 확인하고 전기 작업을 수행하세요' },
    { id: 3, missionKo: '작업 완료 후 LOTO 해제 절차를 수행하세요' },
  ],
};

function lotoStepsKo() {
  return ELECTRICAL_DATA.lotoSteps.map(s => `${s.step}단계: ${s.ko}`);
}
