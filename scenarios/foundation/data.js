// S — 기초공사 (Foundation)
// 산안법 시행규칙 별표 3-25(거푸집동바리), 3-26(콘크리트 타설)
// KOSHA GUIDE C-67-2018, C-72-2017

const FOUNDATION_DATA = {
  scenarioId: 'foundation',
  kosha: ['KOSHA GUIDE C-67-2018', 'KOSHA GUIDE C-72-2017', '산안법 시행규칙 별표 3-25,26'],

  accidents: {
    form_collapse: {
      descKo: '거푸집 동바리 강도 부족으로 콘크리트 타설 중 거푸집이 붕괴되었습니다.',
      descEn: 'Formwork collapsed during pour due to inadequate shoring strength.',
      descVi: 'Cốp pha bị sập trong khi đổ bê tông do hệ giáo chống (shoring) không đủ cường độ.',
      descAr: 'انهارت القوالب الخرسانية أثناء صب الخرسانة بسبب ضعف نظام الدعامات (الشورنغ).',
      causeKo: '동바리 간격 과다 / 수직도 미확보',
      causeEn: 'Excessive shoring spacing / verticality not maintained',
      causeVi: 'Khoảng cách cây chống quá lớn / không đảm bảo độ thẳng đứng',
      causeAr: 'تباعد مفرط بين الدعامات / عدم ضبط الاستقامة الرأسية',
      lawKo: '산업안전보건기준에 관한 규칙 제331조 (거푸집 동바리)\nKOSHA GUIDE C-72-2017 4.3항',
      lawEn: 'OSH Standards Rule §331 (Formwork shoring)\nKOSHA GUIDE C-72-2017 §4.3',
      procedureKo: [
        '동바리 간격: 단위중량 + 측압 계산',
        '수직도 검사 (수직 ±5mm/m)',
        '타설 전 거푸집 점검 체크리스트',
      ],
      procedureEn: [
        'Calculate shoring spacing per load + lateral pressure',
        'Verify verticality (±5mm/m)',
        'Pre-pour formwork inspection checklist',
      ],
    },
    rebar_stab: {
      descKo: '노출 철근에 보호캡 미설치로 작업자가 철근에 찔렸습니다.',
      descEn: 'A worker was impaled on exposed rebar lacking protective caps.',
      descVi: 'Công nhân bị thép chờ đâm vào người do không lắp chụp bảo vệ (rebar cap) đầu thép.',
      descAr: 'تعرّض أحد العمال للوخز بقضبان التسليح البارزة بسبب عدم تركيب أغطية حماية على أطراف الحديد.',
      causeKo: '노출 철근 보호캡 미설치',
      causeEn: 'No protective caps on exposed rebar ends',
      causeVi: 'Không lắp chụp bảo vệ đầu thép chờ lộ thiên',
      causeAr: 'عدم تركيب أغطية حماية على أطراف قضبان التسليح المكشوفة',
      lawKo: '산업안전보건기준에 관한 규칙 제42조\nKOSHA GUIDE C-67-2018',
      lawEn: 'OSH Standards Rule §42\nKOSHA GUIDE C-67-2018',
      procedureKo: [
        '노출 철근 끝단 전수 보호캡 설치',
        '수직 철근은 안전모 높이 이상',
        '추락 가능 구역 별도 매트 부착',
      ],
      procedureEn: [
        'Install protective caps on all exposed rebar tips',
        'Vertical rebar above helmet height',
        'Additional impact mat in fall-risk zones',
      ],
    },
    pump_burst: {
      descKo: '콘크리트 펌프카 호스 점검 미실시로 압력 호스가 파열되었습니다.',
      descEn: 'Concrete pump hose burst due to skipped pre-use inspection.',
      descVi: 'Ống áp lực của xe bơm bê tông bị nổ do không kiểm tra ống và mối nối trước khi sử dụng.',
      descAr: 'انفجر خرطوم الضغط في مضخة الخرسانة بسبب إهمال الفحص المسبق للخرطوم ووصلاته.',
      causeKo: '펌프카 호스 마모/접속부 점검 미실시',
      causeEn: 'Skipped inspection of pump hose wear and couplings',
      causeVi: 'Không kiểm tra mức hao mòn ống và các mối nối của xe bơm',
      causeAr: 'إهمال فحص اهتراء خرطوم المضخة ووصلاته',
      lawKo: '산업안전보건기준에 관한 규칙 제335조\nKOSHA GUIDE C-72-2017 5.2항',
      lawEn: 'OSH Standards Rule §335\nKOSHA GUIDE C-72-2017 §5.2',
      procedureKo: [
        '작업 전 호스 마모·접속부 확인',
        '아웃트리거 4개 모두 펼침',
        '타설 압력 모니터링',
      ],
      procedureEn: [
        'Pre-use hose wear and coupling inspection',
        'All 4 outriggers fully extended',
        'Monitor pump pressure during operation',
      ],
    },
    pour_crush: {
      descKo: '타설 순서를 어겨 거푸집 측압이 집중되며 일부가 무너졌습니다.',
      descEn: 'Pour sequence error concentrated lateral pressure and partial collapse.',
      descVi: 'Đổ bê tông sai trình tự khiến áp lực ngang dồn cục bộ vào cốp pha và gây sập một phần.',
      descAr: 'تسبّب الإخلال بتسلسل صبّ الخرسانة في تركّز الضغط الجانبي على القوالب وانهيار جزء منها.',
      causeKo: '타설 순서 위반 / 일일 타설량 초과',
      causeEn: 'Pour sequence violation / daily pour limit exceeded',
      causeVi: 'Vi phạm trình tự đổ bê tông / vượt khối lượng đổ trong ngày',
      causeAr: 'الإخلال بتسلسل الصبّ / تجاوز الحد اليومي لكميّة الصبّ',
      lawKo: '산업안전보건기준에 관한 규칙 제334조\nKOSHA GUIDE C-67-2018 4.4항',
      lawEn: 'OSH Standards Rule §334\nKOSHA GUIDE C-67-2018 §4.4',
      procedureKo: [
        '타설 순서 사전 결정 (다단계 분할)',
        '일일 타설량 한도 준수',
        '타설 시 측압 모니터링',
      ],
      procedureEn: [
        'Plan pour sequence in advance (multi-stage)',
        'Respect daily pour volume limit',
        'Monitor lateral pressure during pour',
      ],
    },
  },

  // 작업 흐름
  phases: [
    { id: 1, key: 'plan',         ko: '기초 작업계획서 작성' },
    { id: 2, key: 'rebar_setup',  ko: '철근 배근·보호캡' },
    { id: 3, key: 'formwork',     ko: '거푸집·동바리 설치' },
    { id: 4, key: 'pump_check',   ko: '펌프카 점검·아웃트리거' },
    { id: 5, key: 'signal',       ko: '타설 순서·신호 합의' },
    { id: 6, key: 'execute',      ko: '콘크리트 타설' },
  ],

  // 작업 지시 (Phase 1 입력)
  workInstruction: {
    matArea: {
      ko: '기초 매트 면적 (m²)', en: 'Mat Area (m²)',
      min: 80, max: 200, step: 5, defaultValue: 144,    // 12m × 12m 기본
      safeRange: [120, 180],
    },
    rebarSpacing: {
      ko: '철근 배근 간격 (mm)', en: 'Rebar Spacing (mm)',
      options: [
        { value: 150, label: '150mm (밀배근)' },
        { value: 200, label: '200mm (표준)' },
        { value: 250, label: '250mm (소배근)' },
        { value: 300, label: '300mm (위험)' },
      ],
      defaultValue: 200,
    },
    concreteStrength: {
      ko: '콘크리트 강도 (MPa)', en: 'Concrete Strength (MPa)',
      options: [
        { value: 21, label: '21 MPa (저강도)' },
        { value: 24, label: '24 MPa (표준)' },
        { value: 27, label: '27 MPa (고강도)' },
        { value: 30, label: '30 MPa (특수)' },
      ],
      defaultValue: 24,
    },
    shoringSpacing: {
      ko: '동바리 간격 (m)', en: 'Shoring Spacing (m)',
      min: 0.6, max: 1.5, step: 0.1, defaultValue: 0.9,
      safeRange: [0.6, 1.0],
    },
  },
};
