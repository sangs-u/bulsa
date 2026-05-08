// S05 — 화재/폭발 (용접·화기작업) | Fire/Explosion — Hot Work
// KOSHA GUIDE P-2009-53, 산안규칙 제241조~248조

const FIRE_DATA = {
  scenarioId: 'fire',
  kosha: ['KOSHA GUIDE P-2009-53', '산안규칙 제241조~248조 (화재위험 작업)', '제232조 (소화설비)'],

  // ── Flammable gas lower explosive limits (LEL) ────────────
  lelValues: {
    LPG:       { lel: 2.0,  uel: 9.5,  unit: '%' },
    acetylene: { lel: 2.5,  uel: 81.0, unit: '%' },
    hydrogen:  { lel: 4.0,  uel: 75.0, unit: '%' },
    methane:   { lel: 5.0,  uel: 15.0, unit: '%' },
  },

  // ── Hazard types ──────────────────────────────────────────
  hazardTypes: [
    { id: 'no_hotwork_permit',  critical: true,  law: '제241조', descKo: '화기작업 허가서 미발급' },
    { id: 'flammable_nearby',   critical: true,  law: '제242조', descKo: '화기 주변 가연물 미제거 (10m 이내)' },
    { id: 'no_fire_watch',      critical: true,  law: '제243조', descKo: '화재감시자 미배치' },
    { id: 'no_extinguisher',    critical: false, law: '제232조', descKo: '소화기 미비치 (현장 접근 불가)' },
    { id: 'gas_leak',           critical: true,  law: 'P-2009-53', descKo: '아세틸렌 호스 누기 — 가스 누설' },
    { id: 'no_gas_test_fire',   critical: true,  law: '제246조', descKo: '주변 가연성가스 LEL 미측정' },
  ],

  // ── Accident definitions ──────────────────────────────────
  accidents: {
    fire: {
      descKo:      '화기작업 중 불꽃이 가연물에 착화되어 화재가 발생했습니다.',
      causeKo:     '화기 주변 가연물 미제거 / 화재감시자 미배치',
      lawKo:       '산안규칙 제241조 (화기작업 허가)\n제242조 (가연물 제거)\n제243조 (화재감시자 배치)',
      procedureKo: ['10m 이내 가연물 제거 또는 불연 덮개 설치', '소화기 2개 이상 현장 비치', '화재감시자 1인 이상 배치 (작업 종료 후 30분 추가 감시)', '화기작업 허가서 발급 후 작업'],
    },
    explosion: {
      descKo:      '가스 누설 상태에서 화기 사용으로 폭발이 발생했습니다.',
      causeKo:     '아세틸렌 호스 누기 미확인 / 가연성가스 LEL 미측정',
      lawKo:       'KOSHA GUIDE P-2009-53 4.3항\n산안규칙 제246조 (가연성가스 누설 확인)',
      procedureKo: ['작업 전 가스 누설 비눗물 점검', 'LEL 측정 후 10% 미만 확인 후 작업', '호스·조정기 손상 시 즉시 교체'],
    },
  },

  phases: [
    { id: 1, missionKo: '화기작업 전 안전 조건을 확인하세요' },
    { id: 2, missionKo: '화기작업 허가를 받고 안전하게 작업하세요' },
    { id: 3, missionKo: '작업 완료 후 30분 화재 감시를 실시하세요' },
  ],
};
