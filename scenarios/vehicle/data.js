// S06 — 차량계 건설기계 | Construction Vehicle Safety
// 산안규칙 제98조~101조, 제169조~175조

const VEHICLE_DATA = {
  scenarioId: 'vehicle',
  kosha: ['산안규칙 제98조~101조 (차량계 건설기계)', '제169조~175조 (차량계 하역운반기계)'],

  // ── Vehicle types and rated capacities ───────────────────
  vehicles: [
    { id: 'excavator',  nameKo: '굴삭기',    capacity: null,    sweepAngle: 360, blindSpot: true  },
    { id: 'dump_truck', nameKo: '덤프트럭',  capacity: 15000,   sweepAngle: 0,   blindSpot: true  },
    { id: 'forklift',   nameKo: '지게차',    capacity: 3000,    sweepAngle: 0,   blindSpot: true  },
    { id: 'roller',     nameKo: '롤러',      capacity: null,    sweepAngle: 0,   blindSpot: true  },
  ],

  // ── Hazard types ──────────────────────────────────────────
  hazardTypes: [
    { id: 'no_signal_veh',   critical: true,  law: '제99조',  descKo: '유도자 미배치 (후진 작업 시)' },
    { id: 'worker_in_path',  critical: true,  law: '제98조',  descKo: '차량 이동경로 내 근로자' },
    { id: 'no_work_plan',    critical: false, law: '제98조',  descKo: '작업계획서 미수립' },
    { id: 'overload_vehicle',critical: true,  law: '제101조', descKo: '지게차 정격하중 초과' },
    { id: 'no_seatbelt',     critical: false, law: '제100조', descKo: '안전띠 미착용 (운전석)' },
    { id: 'no_parking_brake',critical: false, law: '제100조', descKo: '주차 브레이크 미체결' },
  ],

  // ── Accident definitions ──────────────────────────────────
  accidents: {
    vehicle_collision: {
      descKo:      '유도자 없이 후진하던 덤프트럭이 근로자를 충격했습니다.',
      causeKo:     '후진 시 유도자 미배치 / 이동경로 내 근로자 접근 통제 미실시',
      lawKo:       '산안규칙 제99조 (유도자 배치)\n제98조 (작업계획서 수립)\n제169조 (차량계 작업 시 조치)',
      procedureKo: ['후진 시 신호수(유도자) 1인 배치', '차량 이동경로 출입통제 표시', '후진 경보장치 작동 확인', '작업계획서에 이동경로 명시'],
    },
    forklift_tip: {
      descKo:      '정격하중 초과 지게차가 전복되었습니다.',
      causeKo:     '정격하중 초과 / 하중 중심 벗어난 상태로 이동',
      lawKo:       '산안규칙 제101조 (정격하중 준수)\n제170조 (전조등 등 안전장치)',
      procedureKo: ['하중 계중 후 정격하중 이하 확인', '포크 높이 20~30 cm로 낮춰 이동', '적재물 균형 유지 / 고속 선회 금지'],
    },
  },

  phases: [
    { id: 1, missionKo: '차량 작업 전 현장 안전 조건을 확인하세요' },
    { id: 2, missionKo: '유도자 배치 후 차량 작업을 수행하세요' },
    { id: 3, missionKo: '작업 완료 후 차량을 안전한 위치에 주차하세요' },
  ],
};
