// S03 — 밀폐공간 작업 | Confined Space Entry
// KOSHA GUIDE E-G-18-2026, 산안규칙 제619조~628조

const CONFINED_DATA = {
  scenarioId: 'confined',
  kosha: ['KOSHA GUIDE E-G-18-2026', '산안규칙 제619조~628조', '별표18 (밀폐공간 18종)'],

  // ── Gas threshold values (산안규칙 제620조) ───────────────
  gasLimits: {
    O2:  { min: 18,  unit: '%',  descKo: '산소 (18% 이상 유지 필수)' },
    H2S: { max: 10,  unit: 'ppm', descKo: '황화수소 (10 ppm 미만)' },
    CO:  { max: 30,  unit: 'ppm', descKo: '일산화탄소 (30 ppm 미만)' },
    LEL: { max: 10,  unit: '%LEL', descKo: '가연성가스 (LEL 10% 미만, 화기작업)' },
  },

  // ── Ventilation calculation (from musaai/confined.html) ──
  // Q = V × N / 60  (m³/min), where N = air changes/hr
  // Fan selection: φ200(20m³/m) | φ300(55m³/m) | φ500(160m³/m)
  ventCalc: {
    baseChanges: { general: 20, welding: 30, paint: 40, chemical: 30, gas: 30, other: 25 },
    fanSizes: [
      { size: 'φ200mm', flow: 20 },
      { size: 'φ300mm', flow: 55 },
      { size: 'φ500mm', flow: 160 },
    ],
  },

  // ── Hazard types ──────────────────────────────────────────
  hazardTypes: [
    { id: 'no_gas_test',     critical: true,  law: '제620조', descKo: '산소/유해가스 측정 미실시' },
    { id: 'no_attendant',   critical: true,  law: '제621조', descKo: '외부 감시인 미배치' },
    { id: 'no_ventilation', critical: true,  law: '제625조', descKo: '환기 미실시 / 산소 18% 미만' },
    { id: 'no_permit',      critical: false, law: '제619조', descKo: '작업허가서 미발급' },
    { id: 'no_rescue_gear', critical: true,  law: '제628조', descKo: '공기호흡기·송기마스크 미비치' },
    { id: 'low_oxygen',     critical: true,  law: '제620조', descKo: '산소 농도 16% — 즉시 대피 기준' },
  ],

  // ── Accident definitions ──────────────────────────────────
  accidents: {
    suffocation: {
      descKo:      '밀폐공간 내 산소 결핍으로 작업자가 의식을 잃었습니다.',
      causeKo:     '작업 전 산소 농도 미측정 / 환기 미실시',
      lawKo:       '산안규칙 제620조 (사전 산소 측정 의무)\n제625조 (환기 실시 의무)\nKOSHA E-G-18-2026 4.2항',
      procedureKo: [
        '작업 전 복합가스측정기(O₂/H₂S/CO/LEL) 측정',
        '환기 실시 후 재측정, 18% 이상 확인',
        '외부 감시인 1인 이상 상시 배치',
        '공기호흡기·구조 로프 현장 비치',
        '작업 중 30분마다 가스 재측정',
      ],
    },
    gas_explosion: {
      descKo:      '가연성 가스 축적 상태에서 화기 사용으로 폭발이 발생했습니다.',
      causeKo:     '가연성가스 LEL 측정 미실시 / 화기작업 허가 없이 진행',
      lawKo:       '산안규칙 제619조 (작업 프로그램 수립)\nKOSHA E-G-18-2026 5.3항',
      procedureKo: [
        '화기작업 전 가연성가스 LEL 10% 미만 확인',
        '환기량 40회/hr 이상 (도장·용접 작업 시)',
        '화기 작업허가서 별도 발급',
      ],
    },
  },

  phases: [
    { id: 1, missionKo: '밀폐공간 진입 전 안전 확인을 실시하세요' },
    { id: 2, missionKo: '작업허가서를 확인하고 진입하세요' },
    { id: 3, missionKo: '작업 완료 후 전원 퇴장을 확인하세요' },
  ],
};
