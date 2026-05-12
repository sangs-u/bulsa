// S — 토공사 (Earthworks)
// 산안법 시행규칙 별표 3-39 (차량계 건설기계 작업계획서)
// KOSHA GUIDE C-39-2011, C-104-2020

const EXCAVATION_DATA = {
  scenarioId: 'excavation',
  kosha: ['KOSHA GUIDE C-39-2011', 'KOSHA GUIDE C-104-2020', '산안법 시행규칙 별표 3-39'],

  accidents: {
    soil_collapse: {
      descKo: '굴착면 기울기 미확보 + 흙막이 미설치 상태에서 작업 중 토사가 붕괴되었습니다.',
      descEn: 'The trench wall collapsed due to inadequate slope and missing shoring.',
      descVi: 'Vách hố đào bị sạt lở do không đảm bảo độ dốc taluy và không lắp đặt hệ chống vách.',
      descAr: 'انهار جدار الحفر أثناء العمل بسبب عدم تأمين ميل التربة وعدم تركيب نظام تدعيم جوانب الحفر.',
      causeKo: '굴착 기울기 미확보 / 흙막이 가시설 미설치',
      causeEn: 'Inadequate excavation slope / no shoring installed',
      causeVi: 'Không đảm bảo độ dốc đào / không lắp hệ chống vách (shoring)',
      causeAr: 'عدم توفير ميل الحفر الآمن / عدم تركيب نظام تدعيم جوانب الحفر',
      lawKo: '산업안전보건기준에 관한 규칙 제340조 (지반 등의 굴착작업)\nKOSHA GUIDE C-39-2011 4.2항',
      lawEn: 'OSH Standards Rule §340 (Ground excavation)\nKOSHA GUIDE C-39-2011 §4.2',
      procedureKo: [
        '지반 종류별 굴착 구배 준수 (모래 1:1.8, 점토 1:0.5 등)',
        '5m 이상 굴착 시 흙막이 가시설 필수',
        '굴착면 일일 점검 및 균열 확인',
      ],
      procedureEn: [
        'Maintain slope per soil type (sand 1:1.8, clay 1:0.5)',
        'Shoring required for excavation depth ≥ 5m',
        'Daily inspection of trench walls for cracks',
      ],
    },
    underground_strike: {
      descKo: '매설물 사전 조사 없이 굴착 중 도시가스관을 파손하였습니다.',
      descEn: 'Gas line was struck during excavation due to missing underground survey.',
      descVi: 'Đào trúng đường ống khí đốt thành phố do không khảo sát công trình ngầm trước khi thi công.',
      descAr: 'تم اختراق أنبوب الغاز الحضري أثناء الحفر بسبب عدم إجراء مسح للمرافق المدفونة.',
      causeKo: '매설물 사전 조사 미실시 / 도시가스 도면 미확인',
      causeEn: 'No underground survey / city gas drawings not checked',
      causeVi: 'Không khảo sát công trình ngầm / không kiểm tra bản vẽ đường khí đốt',
      causeAr: 'عدم إجراء مسح المرافق المدفونة / عدم مراجعة مخططات شبكة الغاز',
      lawKo: '산업안전보건기준에 관한 규칙 제344조\n도시가스사업법 시행규칙 제51조',
      lawEn: 'OSH Standards Rule §344\nCity Gas Business Act Enforcement Rule §51',
      procedureKo: [
        '굴착 전 매설물 도면 입수 (가스·전기·통신·수도)',
        '도면상 위치 표시 + 인력 굴착으로 확인',
        '매설물 발견 시 즉시 작업 중지 및 관리자 보고',
      ],
      procedureEn: [
        'Obtain underground utility drawings before work',
        'Mark locations on ground + verify by hand-digging',
        'Stop work immediately and report when utility found',
      ],
    },
    excavator_crush: {
      descKo: '굴착기 작업반경 내 출입통제 미실시로 작업자가 협착되었습니다.',
      descEn: 'A worker was struck inside the excavator swing radius (no access control).',
      descVi: 'Công nhân bị kẹp/va chạm trong bán kính xoay của máy đào do không kiểm soát ra vào khu vực thi công.',
      descAr: 'تعرّض أحد العمال للسحق داخل نطاق دوران الحفّارة بسبب غياب ضوابط منع الدخول.',
      causeKo: '작업반경 출입통제 미실시 / 신호수 미배치',
      causeEn: 'No exclusion zone / no signal person',
      causeVi: 'Không thiết lập vùng cấm vào / không bố trí người ra hiệu',
      causeAr: 'عدم تحديد منطقة عزل / عدم تعيين مُشير',
      lawKo: '산업안전보건기준에 관한 규칙 제200조 (운전위치 이탈의 제한)\n제40조 (신호)',
      lawEn: 'OSH Standards Rule §200 (Operator position) / §40 (Signaling)',
      procedureKo: [
        '굴착기 작업반경 표시 및 출입금지 구역 설정',
        '신호수 1인 배치 (운전자 시야 확보 불가 시)',
        '버킷·붐 회전 범위 내 근로자 접근 금지',
      ],
      procedureEn: [
        'Mark and barricade excavator swing radius',
        'Assign signal person if operator view obstructed',
        'No workers within bucket/boom swing range',
      ],
    },
    edge_fall: {
      descKo: '굴착단부 안전난간 미설치로 작업자가 굴착 구덩이로 추락하였습니다.',
      descEn: 'A worker fell into the pit due to missing edge protection.',
      descVi: 'Công nhân rơi xuống hố đào do không lắp đặt lan can an toàn ở mép hố.',
      descAr: 'سقط أحد العمال داخل حفرة الحفر بسبب عدم تركيب حواجز السلامة على حافة الحفر.',
      causeKo: '굴착단부 안전난간 미설치 / 추락방지망 미설치',
      causeEn: 'No edge guardrail / no fall-arrest netting',
      causeVi: 'Không lắp lan can mép hố đào / không lắp lưới chống rơi',
      causeAr: 'عدم تركيب حاجز السلامة عند حافة الحفر / عدم تركيب شبكة منع السقوط',
      lawKo: '산업안전보건기준에 관한 규칙 제42조 (추락의 방지)\n제43조 (개구부 등의 방호조치)',
      lawEn: 'OSH Standards Rule §42 (Fall prevention) / §43 (Opening protection)',
      procedureKo: [
        '굴착단부 안전난간(상부·중간) 설치',
        '추락 위험구역 표지 및 출입통제',
        '2m 이상 굴착 시 추락방지망 설치',
      ],
      procedureEn: [
        'Install upper/middle guardrails at excavation edges',
        'Mark and barricade fall hazard zones',
        'Install fall-arrest netting for depth ≥ 2m',
      ],
    },
  },

  // 작업 흐름 (6단계 — 양중과 동일 구조)
  phases: [
    { id: 1, key: 'plan',      ko: '굴착 작업계획서 작성' },
    { id: 2, key: 'survey',    ko: '매설물 사전조사' },
    { id: 3, key: 'shoring',   ko: '흙막이 가시설 설치' },
    { id: 4, key: 'perimeter', ko: '안전난간·출입통제' },
    { id: 5, key: 'signal',    ko: '신호수 배치' },
    { id: 6, key: 'execute',   ko: '굴착 실행' },
  ],

  // ── 작업 지시 (Phase 1 작업계획서 입력 항목) ───────────
  // 플레이어가 직접 결정해야 진행 가능. 잘못된 값 → 사고 확률↑ + 과태료.
  workInstruction: {
    // 굴착 깊이 (목표 기초 매트 깊이 = 2.0m 기준)
    depth: {
      ko: '굴착 깊이 (m)', en: 'Excavation Depth (m)',
      min: 1.0, max: 6.0, step: 0.1, defaultValue: 2.0,
      safeRange: [1.8, 2.5],          // 기초공사 요구 범위
      hint: '5m 초과 시 흙막이 가시설 의무 (KOSHA C-39-2011)',
    },
    // 굴착 구배 (사면 기울기, 토질별 기준)
    slope: {
      ko: '굴착 구배 (1:N)', en: 'Slope Ratio (1:N)',
      options: [
        { value: 0.5, label: '1:0.5 (경암)' },
        { value: 1.0, label: '1:1.0 (풍화암)' },
        { value: 1.2, label: '1:1.2 (점토)' },
        { value: 1.5, label: '1:1.5 (사질)' },
        { value: 1.8, label: '1:1.8 (모래)' },
      ],
      defaultValue: 1.2,
      soilType: 'clay',                // 현장 토질 (이 시나리오의 정답: 점토)
    },
    // 흙막이 가시설 종류
    shoringType: {
      ko: '흙막이 가시설', en: 'Shoring Type',
      options: [
        { value: 'none',      label: '미설치 (5m 미만 가능)' },
        { value: 'h_pile',    label: 'H-pile + 토류판' },
        { value: 'sheet_pile',label: '시트파일' },
        { value: 'earth_anchor', label: '어스앵커' },
      ],
      defaultValue: 'h_pile',
      rule: '굴착 깊이 ≥ 1.5m 면 권장, ≥ 5m 면 의무',
    },
    // 매설물 도면 확인 여부
    undergroundChecked: {
      ko: '매설물 도면 확인', en: 'Underground Survey',
      type: 'checkbox', defaultValue: false,
      penalty: 'no_underground',       // OSH_PENALTY_BASE 키
    },
  },
};
