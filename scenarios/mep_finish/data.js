// S — 설비·마감·준공 (MEP & Finishing)
// 산안법 시행규칙 별표 3-15 (전기·가스·밀폐공간)
// KOSHA GUIDE G-82-2018 (전기), G-119-2020 (가스·화재)

const MEP_DATA = {
  scenarioId: 'mep_finish',
  kosha: ['KOSHA GUIDE G-82-2018', 'KOSHA GUIDE G-119-2020', '산안법 시행규칙 별표 3-15'],

  accidents: {
    electric_shock: {
      descKo: '활선 상태에서 LOTO(잠금) 미실시로 배선 작업 중 작업자가 감전되었습니다.',
      descEn: 'A worker was shocked while wiring on a live circuit due to skipped LOTO.',
      causeKo: 'LOTO 잠금/표지 미실시 / 활선 상태 점검 누락',
      causeEn: 'No LOTO lock-out/tag-out / live circuit not verified',
      lawKo: '산업안전보건기준에 관한 규칙 제310조 (감전위험 작업)\nKOSHA GUIDE G-82-2018 4.2항',
      lawEn: 'OSH Standards Rule §310 (Electric shock prevention)\nKOSHA GUIDE G-82-2018 §4.2',
      procedureKo: [
        '작업 전 차단기 차단 + 잠금장치 + 표지 부착 (LOTO)',
        '검전기로 무전압 확인',
        '단락접지 (필요시)',
        '작업 완료 후 표지·잠금 해제',
      ],
      procedureEn: [
        'Open breaker + apply lock-out + warning tag (LOTO)',
        'Verify zero voltage with tester',
        'Apply short-grounding if needed',
        'Remove tags and locks after work completion',
      ],
    },
    gas_explosion: {
      descKo: '가스 누설 점검 미실시 상태에서 용접 작업 중 가스가 점화되어 폭발했습니다.',
      descEn: 'Gas ignited during welding without prior leak inspection — explosion.',
      causeKo: '가스 누설 점검 미실시 / 환기 미가동',
      causeEn: 'No gas leak inspection / ventilation off',
      lawKo: '산업안전보건기준에 관한 규칙 제232조 (가스폭발 위험)\nKOSHA GUIDE G-119-2020',
      lawEn: 'OSH Standards Rule §232 (Gas explosion hazard)\nKOSHA GUIDE G-119-2020',
      procedureKo: [
        '작업 전 가스 농도 측정 (LEL 10% 미만 확인)',
        '환기·국소배기 가동',
        '점화원 제거 (스파크·화염)',
        '소화기 작업 반경 내 비치',
      ],
      procedureEn: [
        'Measure gas concentration before work (LEL < 10%)',
        'Run general and local exhaust ventilation',
        'Remove ignition sources (sparks, flames)',
        'Position fire extinguisher within work radius',
      ],
    },
    fire_outbreak: {
      descKo: '소화기 미비치 상태에서 마감재가 발화하여 화재로 번졌습니다.',
      descEn: 'Finishing material caught fire and spread due to missing extinguishers.',
      causeKo: '소화기 배치 누락 / 가연성 자재 부적정 보관',
      causeEn: 'No extinguishers / improper storage of flammables',
      lawKo: '소방시설법 + 산업안전보건기준에 관한 규칙 제240조',
      lawEn: 'Fire Safety Act + OSH Standards Rule §240',
      procedureKo: [
        '작업 반경 25m 이내 ABC 분말소화기 배치',
        '가연성 자재 분리 보관 + 환기',
        '용접 작업 시 화기 감시인 별도 배치',
      ],
      procedureEn: [
        'Place ABC powder extinguisher within 25m of work',
        'Store flammables separately with ventilation',
        'Assign fire watch during welding',
      ],
    },
    toxic_exposure: {
      descKo: '국소배기 미가동 상태에서 도장 작업 중 작업자가 유해물질에 노출되었습니다.',
      descEn: 'A worker was exposed to toxic vapors during painting without local exhaust.',
      causeKo: '국소배기 미가동 / 방독마스크 미착용',
      causeEn: 'Local exhaust off / no respirator',
      lawKo: '산업안전보건기준에 관한 규칙 제422조 (관리대상 유해물질)\nKOSHA GUIDE H-27-2017',
      lawEn: 'OSH Standards Rule §422 (Controlled toxic substances)\nKOSHA GUIDE H-27-2017',
      procedureKo: [
        '작업 시 국소배기 + 일반환기 가동',
        '방독마스크 착용 (유기용제용)',
        '작업 후 환기 + 청소',
      ],
      procedureEn: [
        'Run local exhaust + general ventilation during work',
        'Wear organic-vapor respirator',
        'Ventilate and clean after work',
      ],
    },
  },

  phases: [
    { id: 1, key: 'plan',      ko: '설비·마감 작업계획서' },
    { id: 2, key: 'loto',      ko: 'LOTO 잠금·표지' },
    { id: 3, key: 'gas_check', ko: '가스누설 점검' },
    { id: 4, key: 'vent',      ko: '환기·국소배기 가동' },
    { id: 5, key: 'fire_ext',  ko: '소화기 배치' },
    { id: 6, key: 'execute',   ko: '준공검사' },
  ],

  workInstruction: {
    breakerCapacity: {
      ko: '차단기 용량 (A)', en: 'Breaker Capacity (A)',
      options: [
        { value: 20,  label: '20A (분기)' },
        { value: 30,  label: '30A (콘센트)' },
        { value: 50,  label: '50A (조명·분전반)' },
        { value: 100, label: '100A (메인)' },
      ],
      defaultValue: 50,
    },
    pipeDiameter: {
      ko: '배관 구경 (mm)', en: 'Pipe Diameter (mm)',
      options: [
        { value: 15, label: '15mm (세면대)' },
        { value: 20, label: '20mm (분기)' },
        { value: 25, label: '25mm (메인)' },
        { value: 32, label: '32mm (대형)' },
      ],
      defaultValue: 20,
    },
    finishType: {
      ko: '마감재 종류', en: 'Finish Type',
      options: [
        { value: 'paint',  label: '수성 페인트 (저독성)' },
        { value: 'solvent',label: '유성 페인트 (유기용제)' },
        { value: 'epoxy',  label: '에폭시 (고독성)' },
        { value: 'tile',   label: '타일 (무용제)' },
      ],
      defaultValue: 'paint',
    },
    lotoProcedure: {
      ko: 'LOTO 절차', en: 'LOTO Procedure',
      type: 'checkbox', defaultValue: false,
      hint: 'LOTO(Lock-Out / Tag-Out) — 잠금+표지+검전 절차 준수',
    },
  },
};
