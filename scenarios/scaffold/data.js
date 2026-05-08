// S02 — 고소작업 (비계/사다리) | Scaffolding & Ladder Work
// KOSHA GUIDE C-29, 산안규칙 제37조·제42조·제63조~제69조·제86조·제87조

const SCAFFOLD_DATA = {
  scenarioId: 'scaffold',
  kosha: ['KOSHA GUIDE C-29', '산안규칙 제37조', '제42조', '제63조~69조', '제86조~87조'],

  // ── Hazard types ──────────────────────────────────────────
  hazardTypes: [
    { id: 'unstable_base',    critical: true,  law: '제67조',     descKo: '비계 하부 지반 불안정 — 침하·전도 위험' },
    { id: 'no_guardrail',     critical: true,  law: '제69조',     descKo: '2m 이상 작업면 안전난간 미설치' },
    { id: 'narrow_board',     critical: false, law: '제68조',     descKo: '작업발판 폭 40 cm 미만' },
    { id: 'ladder_angle',     critical: true,  law: '제26조',     descKo: '이동식 사다리 각도 75°±5° 이탈' },
    { id: 'no_harness',       critical: true,  law: '제42조',     descKo: '안전대 미착용 (추락 방지구 미연결)' },
    { id: 'overload_boom',    critical: true,  law: '제86조',     descKo: '고소작업대 정격하중 초과' },
    { id: 'wind_speed',       critical: true,  law: 'KOSHA C-29', descKo: '풍속 10 m/s 이상 — 작업 중지 기준' },
  ],

  // ── Calculation formulas (from musaai scaffold.html) ─────
  calc: {
    stabilityRatio: (height, baseWidth) => height / baseWidth,   // ≤ 4.0 pass
    ladderAngle:    (rise, run) => Math.atan2(rise, run) * 180 / Math.PI,  // 70~80° pass
    loadRatio:      (totalLoad, ratedLoad) => totalLoad / ratedLoad,        // ≤ 0.9 pass
    workerLoad:     (workers) => workers * 100,  // 100 kg per worker
  },

  // ── Accident definitions ──────────────────────────────────
  accidents: {
    fall_scaffold: {
      descKo:      '안전난간이 없는 비계 작업발판에서 추락하여 중상을 입었습니다.',
      causeKo:     '2m 이상 작업면 안전난간 미설치 / 안전대 미착용',
      lawKo:       '산안규칙 제37조 (추락위험 방지) / 제42조 (추락 방지)\n제69조 (비계 안전난간 설치)',
      procedureKo: ['작업 전 안전난간(90~120cm) 설치 확인', '안전대 부착설비에 고리 연결 확인', '2m 이상 시 개구부 덮개 또는 안전난간 필수'],
    },
    boom_collapse: {
      descKo:      '정격하중을 초과한 고소작업대가 과부하로 인해 붕괴되었습니다.',
      causeKo:     '고소작업대 정격하중 초과 탑승 / 하중 확인 미실시',
      lawKo:       '산안규칙 제86조 (고소작업대 정격하중 초과 금지)',
      procedureKo: ['탑승 전 작업자 수·자재 중량 합산 확인', '정격하중 표시판 사전 확인 의무', '하중 초과 시 즉시 작업 중지'],
    },
    ladder_slip: {
      descKo:      '각도가 잘못 놓인 이동식 사다리에서 미끄러져 낙상했습니다.',
      causeKo:     '사다리 설치 각도 미확인 (70~80° 범위 이탈)',
      lawKo:       '산안규칙 제26조 (이동식 사다리 설치 기준)',
      procedureKo: ['사다리 각도 75°±5° 준수 (밑 1 : 높이 4 기준)', '상단 60 cm 이상 돌출, 고정 조치 확인', '3점 지지 (양손·발) 원칙 준수'],
    },
  },

  phases: [
    { id: 1, missionKo: '비계 설치 상태를 점검하고 위험요소를 조치하세요' },
    { id: 2, missionKo: '안전한 고소작업 환경을 확인하고 작업을 시작하세요' },
    { id: 3, missionKo: '작업 완료 후 안전하게 하강하세요' },
  ],
};
