// S — 외장공사 (Envelope: 비계 + 외벽 + 창호)
// 산안법 시행규칙 별표 3-20 (비계 조립·해체)
// KOSHA GUIDE G-110-2020 (비계), C-101-2017 (외장)

const ENVELOPE_DATA = {
  scenarioId: 'envelope',
  kosha: ['KOSHA GUIDE G-110-2020', 'KOSHA GUIDE C-101-2017', '산안법 시행규칙 별표 3-20'],

  accidents: {
    scaffold_collapse: {
      descKo: '비계 조립검사 미실시 상태에서 자재 적재 중 비계가 붕괴되었습니다.',
      descEn: 'Scaffold collapsed during material loading without proper inspection.',
      descVi: 'Giàn giáo bị sập khi đang chất vật liệu do chưa kiểm tra nghiệm thu lắp dựng giàn giáo.',
      descAr: 'انهارت السقالة أثناء تحميل المواد عليها بسبب عدم إجراء فحص ما بعد التركيب.',
      causeKo: '비계 조립검사 미실시 / 결속·벽이음 부족',
      causeEn: 'No scaffold inspection / inadequate ties and bracing',
      causeVi: 'Không nghiệm thu giàn giáo / thiếu giằng chéo và neo tường',
      causeAr: 'عدم فحص السقالة / نقص في الروابط والربط بالجدار',
      lawKo: '산업안전보건기준에 관한 규칙 제56조 (비계의 점검 및 보수)\nKOSHA GUIDE G-110-2020 4.3항',
      lawEn: 'OSH Standards Rule §56 (Scaffold inspection)\nKOSHA GUIDE G-110-2020 §4.3',
      procedureKo: [
        '비계 조립 후 사용 전 검사',
        '벽이음(타이) 간격 준수 (수직 5m, 수평 5m)',
        '작업발판·안전난간 점검',
      ],
      procedureEn: [
        'Pre-use inspection after assembly',
        'Maintain tie spacing (5m vertical, 5m horizontal)',
        'Inspect work platform and guardrails',
      ],
    },
    envelope_fall: {
      descKo: '안전대 부착설비 미설치로 외장 작업 중 작업자가 추락하였습니다.',
      descEn: 'A worker fell during cladding work due to missing lifeline anchor.',
      descVi: 'Công nhân bị rơi khi thi công ốp ngoài do không lắp đặt điểm neo dây cứu sinh.',
      descAr: 'سقط عامل أثناء أعمال الكسوة الخارجية نتيجة عدم تركيب نقطة تثبيت حبل النجاة (Lifeline).',
      causeKo: '안전대 부착설비 미설치 / 안전대 미체결',
      causeEn: 'No lifeline anchor / harness not connected',
      causeVi: 'Không lắp điểm neo dây cứu sinh / không móc dây an toàn',
      causeAr: 'عدم تركيب نقطة تثبيت لحبل النجاة / عدم تثبيت حزام السلامة',
      lawKo: '산업안전보건기준에 관한 규칙 제42조, 제44조\nKOSHA GUIDE G-110-2020',
      lawEn: 'OSH Standards Rule §42, §44\nKOSHA GUIDE G-110-2020',
      procedureKo: [
        '2m 이상 작업 시 안전대 부착설비(수평구명줄·러닝라인) 설치',
        '안전대 더블훅 체결 — 한쪽 항상 연결 유지',
        '작업 전 안전대·랜야드 점검',
      ],
      procedureEn: [
        'Install lifeline anchors (horizontal/running line) for work ≥ 2m',
        'Use double-hook harness — keep one hook connected at all times',
        'Inspect harness and lanyard pre-use',
      ],
    },
    panel_fall: {
      descKo: '외장 패널 결속 불량으로 인양 중 패널이 낙하하였습니다.',
      descEn: 'Cladding panel fell during lift due to inadequate securing.',
      descVi: 'Tấm ốp ngoài bị rơi khi đang nâng do buộc cố định không đảm bảo.',
      descAr: 'سقطت لوحة الكسوة الخارجية أثناء الرفع بسبب سوء تثبيتها.',
      causeKo: '외장재 결속선/클램프 미체결',
      causeEn: 'Inadequate ties or clamps on cladding panel',
      causeVi: 'Không buộc dây cố định / kẹp tấm ốp không đầy đủ',
      causeAr: 'عدم تثبيت لوحة الكسوة بالحبال أو المشابك بشكل كافٍ',
      lawKo: 'KOSHA GUIDE G-133-2020 (양중) + C-101-2017 (외장)',
      lawEn: 'KOSHA GUIDE G-133-2020 (Lifting) + C-101-2017 (Cladding)',
      procedureKo: [
        '인양 전 결속선·클램프 전수 점검',
        '낙하물 방지망 설치 (인양 경로 하부)',
        '인양 경로 작업자 출입통제',
      ],
      procedureEn: [
        'Verify all ties and clamps before lift',
        'Install drop-prevention netting below lift path',
        'Control worker access along lift path',
      ],
    },
    glass_shatter: {
      descKo: '유리 패널 운반 중 부적절한 취급으로 유리가 파손되며 작업자가 다쳤습니다.',
      descEn: 'Glass panel shattered during handling, injuring a worker.',
      descVi: 'Tấm kính bị vỡ trong quá trình vận chuyển do thao tác không đúng, gây thương tích cho công nhân.',
      descAr: 'تحطّمت لوحة زجاجية أثناء النقل بسبب سوء المناولة وأصيب أحد العمال.',
      causeKo: '유리 운반 보호구 미착용 / 운반 도구 부적절',
      causeEn: 'No PPE for glass handling / improper tools',
      causeVi: 'Không đeo bảo hộ chuyên dụng cho kính / dụng cụ vận chuyển không phù hợp',
      causeAr: 'عدم ارتداء معدات الوقاية الخاصة بمناولة الزجاج / استخدام أدوات نقل غير ملائمة',
      lawKo: '산업안전보건기준에 관한 규칙 제32조 (보호구)\nKOSHA GUIDE C-101-2017',
      lawEn: 'OSH Standards Rule §32 (PPE)\nKOSHA GUIDE C-101-2017',
      procedureKo: [
        '유리 운반 시 절단방지 장갑·보안경 착용',
        '유리 전용 캐리어·흡착 패드 사용',
        '유리 단부 보호 테이프 부착',
      ],
      procedureEn: [
        'Wear cut-resistant gloves and goggles for glass',
        'Use glass-specific carriers/suction pads',
        'Tape glass edges before handling',
      ],
    },
  },

  phases: [
    { id: 1, key: 'plan',         ko: '외장 작업계획서 작성' },
    { id: 2, key: 'scaffold_chk', ko: '비계 조립검사' },
    { id: 3, key: 'lifeline',     ko: '안전대 부착설비' },
    { id: 4, key: 'panel_secure', ko: '외장재 결속·자재 점검' },
    { id: 5, key: 'signal',       ko: '신호수 배치' },
    { id: 6, key: 'execute',      ko: '외장 인양·설치' },
  ],

  workInstruction: {
    scaffoldType: {
      ko: '비계 종류', en: 'Scaffold Type',
      options: [
        { value: 'system',     label: '시스템 비계 (표준)' },
        { value: 'tubular',    label: '강관 비계' },
        { value: 'cantilever', label: '외팔 비계 (위험)' },
      ],
      defaultValue: 'system',
    },
    scaffoldHeight: {
      ko: '비계 높이 (m)', en: 'Scaffold Height (m)',
      min: 5, max: 25, step: 0.5, defaultValue: 19,
      safeRange: [15, 22],
    },
    guardrailLevels: {
      ko: '안전난간 단수', en: 'Guardrail Levels',
      options: [
        { value: 1, label: '1단 (상단만) — 위험' },
        { value: 2, label: '2단 (상·중)' },
        { value: 3, label: '3단 (상·중·발끝막이) — 표준' },
      ],
      defaultValue: 3,
    },
    panelType: {
      ko: '외장 패널 사양', en: 'Panel Spec',
      options: [
        { value: 'acm',   label: 'ACM 알루미늄 복합' },
        { value: 'glass', label: '유리 커튼월' },
        { value: 'stone', label: '석재 패널' },
      ],
      defaultValue: 'acm',
    },
  },
};
