// Instruction system — player gives work orders to NPCs as supervisor
// Monkey-patches openPopup() from interaction.js to intercept NPC type

// 지시 언어 토글 버튼 라벨 — UI 언어 기준 4언어
function _instLangSwitchLabel() {
  const target = (typeof instructionLang !== 'undefined' && instructionLang === 'ko') ? 'EN' : 'KO';
  const ui = (typeof currentLang !== 'undefined') ? currentLang : 'ko';
  const map = {
    ko: `${target}으로 지시`,
    en: `Instruct in ${target}`,
    vi: `Hướng dẫn bằng ${target}`,
    ar: `أصدر التعليمات بـ ${target}`,
  };
  return map[ui] || map.ko;
}

// ── Instruction database ─────────────────────────────────────
// 메타 필드:
//   applicableTrades  : 이 명령이 적합한 직종 배열 (null=모두). 불일치 → NPC 거부
//   applicablePhases  : 이 명령이 적합한 phase 배열 (null=모두). 불일치 → NPC 거부
//   risk              : 'safe' | 'danger' — danger 는 안전절차 생략 변종, 강행 시 사고
//   accidentIfDanger  : danger 명령 강행 시 발생할 사고 ID
//   minSkill          : 0~1 — 정답이라도 NPC 숙련도 미달 시 실패 (사고/미완료)
//   taskType          : v2.0 — 이 명령이 어느 작업 종류에 속하는지 (활성 작업 큐 기반 합성용)
// 분기 로직 (giveInstruction) 은 시나리오·작업 무관 공통.
//
// v2.0: 활성 작업 큐가 비어있으면 이 INSTRUCTIONS[phase] 풀 사용 (백워드 호환).
// 활성 작업 있으면 buildInstructionPoolFromActiveTasks(npc) 가 INSTRUCTION_POOLS_BY_TASK 합성.
const INSTRUCTIONS = {
  1: [
    { id:'wear_ppe',      icon:'⛑',  labelKo:'안전모·안전대 착용해',  labelEn:'Wear helmet & harness', labelVi:'Đeo mũ bảo hộ và dây an toàn', labelAr:'البس الخوذة وحزام السلامة', applicableTrades:null, applicablePhases:null, risk:'safe' },
    { id:'check_weather', icon:'🌤', labelKo:'기상·풍속 확인해',       labelEn:'Check wind & weather',  labelVi:'Kiểm tra thời tiết và tốc độ gió', labelAr:'تحقق من الطقس وسرعة الرياح', applicableTrades:null, applicablePhases:[1,2], risk:'safe' },
    // 함정 — 타phase 명령 (Phase 1 에 인양 시작 지시)
    { id:'rush_lift',     icon:'⚠', labelKo:'그냥 빨리 들어',         labelEn:'Just lift it now',      labelVi:'Cứ cẩu nhanh đi',                    labelAr:'ارفع بسرعة',                applicableTrades:['lifting','signal'], applicablePhases:[6], risk:'danger', accidentIfDanger:'overload' },
  ],
  2: [
    { id:'check_spec',    icon:'📋', labelKo:'사양서 확인해',          labelEn:'Check specifications',  labelVi:'Kiểm tra bản thông số kỹ thuật', labelAr:'راجع المواصفات الفنية', applicableTrades:['lifting'],  applicablePhases:[2,4], risk:'safe', targetRole:'슬링작업자', npcId:'park' },
    { id:'wear_ppe',      icon:'⛑',  labelKo:'안전모·안전대 착용해',  labelEn:'Wear helmet & harness', labelVi:'Đeo mũ bảo hộ và dây an toàn', labelAr:'البس الخوذة وحزام السلامة', applicableTrades:null, applicablePhases:null, risk:'safe' },
    // 함정 — 위험변종
    { id:'skip_spec',     icon:'⚠', labelKo:'사양 확인 생략하고 진행', labelEn:'Skip spec check, proceed', labelVi:'Bỏ qua thông số',           labelAr:'تخطّ المواصفات',              applicableTrades:['lifting'],  applicablePhases:[2], risk:'danger', accidentIfDanger:'overload' },
  ],
  3: [
    { id:'outrigger_check', icon:'🔩', labelKo:'아웃트리거 확인해',   labelEn:'Check outriggers',      labelVi:'Kiểm tra chân chống cẩu (outrigger)', labelAr:'افحص الدعامات الجانبية للرافعة', applicableTrades:null, applicablePhases:[3], risk:'safe' },
    { id:'wear_ppe',        icon:'⛑',  labelKo:'안전모·안전대 착용해', labelEn:'Wear helmet & harness', labelVi:'Đeo mũ bảo hộ và dây an toàn', labelAr:'البس الخوذة وحزام السلامة', applicableTrades:null, applicablePhases:null, risk:'safe' },
    // 함정 — 위험변종 (아웃트리거 안 펴고 진행)
    { id:'skip_outrigger',  icon:'⚠', labelKo:'아웃트리거 안 펴고 시작', labelEn:'Skip outriggers, start', labelVi:'Bỏ chân chống, bắt đầu',      labelAr:'ابدأ بلا دعامات',             applicableTrades:['lifting'],  applicablePhases:[3], risk:'danger', accidentIfDanger:'crane_topple' },
  ],
  4: [
    { id:'check_sling',   icon:'🔍', labelKo:'슬링 상태 확인해',      labelEn:'Check sling condition', labelVi:'Kiểm tra tình trạng dây cẩu', labelAr:'افحص حالة حبال الرفع', applicableTrades:['lifting'], applicablePhases:[4], risk:'safe', targetRole:'슬링작업자', npcId:'park', minSkill:0.6 },
    { id:'secure_pin',    icon:'🔐', labelKo:'안전핀 체결 확인해',    labelEn:'Confirm pin secured',   labelVi:'Xác nhận chốt an toàn đã khóa (LOTO)', labelAr:'تأكد من إحكام مسمار الأمان', applicableTrades:['lifting'], applicablePhases:[4], risk:'safe', targetRole:'슬링작업자', npcId:'park', minSkill:0.55 },
    { id:'measure_angle', icon:'📐', labelKo:'슬링 각도 측정해',       labelEn:'Measure sling angle',   labelVi:'Đo góc dây cẩu', labelAr:'قس زاوية حبل الرفع', applicableTrades:['lifting'], applicablePhases:[4], risk:'safe', targetRole:'슬링작업자', npcId:'park', minSkill:0.65 },
    { id:'wear_ppe',      icon:'⛑',  labelKo:'안전모·안전대 착용해',  labelEn:'Wear helmet & harness', labelVi:'Đeo mũ bảo hộ và dây an toàn', labelAr:'البس الخوذة وحزام السلامة', applicableTrades:null, applicablePhases:null, risk:'safe' },
    // 함정 — 위험변종
    { id:'use_kinked',    icon:'⚠', labelKo:'킹크 슬링 그냥 써',      labelEn:'Use kinked sling anyway', labelVi:'Dùng dây bị xoắn',          labelAr:'استخدم الحبل المعطوب',         applicableTrades:['lifting'], applicablePhases:[4], risk:'danger', accidentIfDanger:'sling_snap' },
    { id:'skip_angle',    icon:'⚠', labelKo:'각도 측정 없이 들어',     labelEn:'Lift without angle check', labelVi:'Cẩu không đo góc',          labelAr:'ارفع بلا قياس الزاوية',        applicableTrades:['lifting'], applicablePhases:[4,6], risk:'danger', accidentIfDanger:'angle_break' },
    // 함정 — 타직종 (슬링작업자에게 용접/타설 지시)
    { id:'start_weld',    icon:'🔥', labelKo:'용접 시작해',            labelEn:'Start welding',          labelVi:'Bắt đầu hàn',                labelAr:'ابدأ اللحام',                  applicableTrades:['electric'], applicablePhases:null, risk:'safe' },
    { id:'pour_concrete', icon:'🚚', labelKo:'콘크리트 타설해',         labelEn:'Pour concrete',          labelVi:'Đổ bê tông',                 labelAr:'صبّ الخرسانة',                applicableTrades:['pour'],     applicablePhases:null, risk:'safe' },
  ],
  5: [
    { id:'signal_pos',    icon:'📍', labelKo:'신호수 위치 서',         labelEn:'Take signal position',  labelVi:'Vào vị trí người ra hiệu', labelAr:'اتخذ موقع المُشير', applicableTrades:['signal'],  applicablePhases:[5], risk:'safe', targetRole:'신호수', npcId:'gimc', minSkill:0.5 },
    { id:'evacuate',      icon:'🚶', labelKo:'작업반경 밖으로 나가',   labelEn:'Leave lift zone',       labelVi:'Ra khỏi vùng bán kính cẩu', labelAr:'اخرج من نطاق الرفع', applicableTrades:null, applicablePhases:[5,6], risk:'safe' },
    { id:'wear_ppe',      icon:'⛑',  labelKo:'안전모·안전대 착용해',  labelEn:'Wear helmet & harness', labelVi:'Đeo mũ bảo hộ và dây an toàn', labelAr:'البس الخوذة وحزام السلامة', applicableTrades:null, applicablePhases:null, risk:'safe' },
    // 함정 — 신호수 없이 진행 강행
    { id:'no_signal_go',  icon:'⚠', labelKo:'신호수 없이 시작해',      labelEn:'Start without signal',  labelVi:'Bắt đầu không cần hiệu',     labelAr:'ابدأ بلا إشاري',              applicableTrades:['lifting','signal'], applicablePhases:[5,6], risk:'danger', accidentIfDanger:'no_signal' },
  ],
  6: [
    { id:'start_lift',    icon:'▶',  labelKo:'인양 시작 준비됐어',    labelEn:'Ready to begin lift',   labelVi:'Sẵn sàng bắt đầu cẩu', labelAr:'جاهز لبدء عملية الرفع', applicableTrades:['signal','lifting'], applicablePhases:[6], risk:'safe', targetRole:'신호수', npcId:'gimc' },
    { id:'stop',          icon:'✋', labelKo:'멈춰',                   labelEn:'Stop',                  labelVi:'Dừng lại', labelAr:'توقف', applicableTrades:null, applicablePhases:null, risk:'safe' },
    // 함정 — 작업반경 진입 강행
    { id:'enter_zone',    icon:'⚠', labelKo:'작업반경 안에서 신호',    labelEn:'Signal from inside zone', labelVi:'Ra hiệu trong vùng cẩu',     labelAr:'إشارة من داخل النطاق',        applicableTrades:['signal'], applicablePhases:[6], risk:'danger', accidentIfDanger:'worker_crush' },
  ],
};

// Language mismatch responses
const MISMATCH_RESPONSES = {
  ar: ['????', 'لا أفهم', '??????'],
  vi: ['????', 'Tôi không hiểu', '??????'],
  ko: ['???'],
};

// ── v2.0 작업 종류별 명령 풀 ───────────────────────────────
// 각 풀은 해당 작업이 활성일 때 명령 풀에 합성됨. core/tasks.js 의 buildInstructionPoolFromActiveTasks 가 사용.
// 모든 명령은 분기 로직(giveInstruction) 을 그대로 통과 — 함정/거부/숙련 처리 공통.
const INSTRUCTION_POOLS_BY_TASK = {
  // 가설공사
  scaffold: [
    { id:'scaffold_inspect', icon:'🔍', labelKo:'비계 조립검사',     labelEn:'Scaffold inspect',    labelVi:'Kiểm tra giàn giáo', labelAr:'فحص السقالة',         taskType:'scaffold', applicableTrades:['scaffold'], risk:'safe', minSkill:0.6 },
    { id:'scaffold_anchor',  icon:'🔗', labelKo:'벽이음 결속',       labelEn:'Wall ties',           labelVi:'Buộc neo tường',     labelAr:'ربط الجدار',           taskType:'scaffold', applicableTrades:['scaffold'], risk:'safe' },
    { id:'scaffold_use_old', icon:'⚠', labelKo:'녹슨 강관 재사용',  labelEn:'Reuse rusty tube',    labelVi:'Dùng ống gỉ',        labelAr:'استخدم أنبوب صدئ',     taskType:'scaffold', applicableTrades:['scaffold'], risk:'danger', accidentIfDanger:'scaffold_collapse' },
  ],
  lifeline: [
    { id:'anchor_install',   icon:'🪢', labelKo:'안전대 부착설비 설치', labelEn:'Install lifeline',  labelVi:'Lắp dây neo',        labelAr:'تركيب المرساة',         taskType:'lifeline', applicableTrades:['scaffold','envelope'], risk:'safe' },
    { id:'skip_anchor',      icon:'⚠', labelKo:'안전대 없이 작업',    labelEn:'Work without harness',labelVi:'Làm không dây',     labelAr:'العمل بلا حزام',         taskType:'lifeline', applicableTrades:null,            risk:'danger', accidentIfDanger:'worker_fall' },
  ],
  shoring: [
    { id:'shoring_install',  icon:'🛡', labelKo:'흙막이 점검',         labelEn:'Inspect shoring',    labelVi:'Kiểm tra chống vách',labelAr:'افحص الدعم',           taskType:'shoring', applicableTrades:['earthwork','excavator'], risk:'safe' },
    { id:'shoring_skip',     icon:'⚠', labelKo:'흙막이 없이 굴착',    labelEn:'Excavate without shoring',labelVi:'Đào không chống', labelAr:'احفر بلا دعم',           taskType:'shoring', applicableTrades:['excavator'], risk:'danger', accidentIfDanger:'soil_collapse' },
  ],
  // 본공사 사이클
  formwork: [
    { id:'formwork_inspect', icon:'📐', labelKo:'거푸집·동바리 점검', labelEn:'Inspect formwork',   labelVi:'Kiểm tra ván khuôn',labelAr:'افحص القوالب',         taskType:'formwork', applicableTrades:['formwork'], risk:'safe', minSkill:0.55 },
    { id:'formwork_assemble',icon:'🔨', labelKo:'거푸집 조립',         labelEn:'Assemble formwork',   labelVi:'Lắp ván khuôn',      labelAr:'تجميع القوالب',         taskType:'formwork', applicableTrades:['formwork'], risk:'safe' },
    { id:'formwork_dismantle_early', icon:'⚠', labelKo:'양생 전 해체', labelEn:'Strip before cure done', labelVi:'Tháo sớm', labelAr:'فك مبكر',               taskType:'formwork', applicableTrades:['formwork'], risk:'danger', accidentIfDanger:'form_collapse' },
  ],
  rebar: [
    { id:'rebar_caps',       icon:'🔧', labelKo:'철근 보호캡 설치',   labelEn:'Install rebar caps', labelVi:'Lắp nắp thép',       labelAr:'تركيب أغطية الحديد',    taskType:'rebar', applicableTrades:['rebar'], risk:'safe', minSkill:0.5 },
    { id:'rebar_spacing',    icon:'📏', labelKo:'배근 간격 확인',      labelEn:'Check spacing',       labelVi:'Kiểm tra khoảng cách', labelAr:'تحقق التباعد',         taskType:'rebar', applicableTrades:['rebar'], risk:'safe' },
    { id:'rebar_no_caps',    icon:'⚠', labelKo:'보호캡 없이 작업',    labelEn:'Work without caps',   labelVi:'Làm không nắp',      labelAr:'العمل بلا أغطية',       taskType:'rebar', applicableTrades:['rebar'], risk:'danger', accidentIfDanger:'rebar_stab' },
  ],
  pour: [
    { id:'pour_order',       icon:'🚚', labelKo:'타설 순서 확인',     labelEn:'Confirm pour order', labelVi:'Xác nhận trình tự',  labelAr:'تأكيد ترتيب الصب',       taskType:'pour', applicableTrades:['pour','concrete'], risk:'safe' },
    { id:'pour_pump_check',  icon:'🔩', labelKo:'펌프카 점검',         labelEn:'Pump truck check',    labelVi:'Kiểm tra xe bơm',    labelAr:'فحص المضخة',            taskType:'pour', applicableTrades:['pour','concrete'], risk:'safe' },
    { id:'pour_overload',    icon:'⚠', labelKo:'일일 한계 초과 타설', labelEn:'Pour past daily limit', labelVi:'Đổ quá giới hạn',  labelAr:'صب فوق الحد',           taskType:'pour', applicableTrades:['pour'], risk:'danger', accidentIfDanger:'form_collapse' },
  ],
  cure: [
    { id:'cure_cover',       icon:'🟦', labelKo:'양생 시트 덮기',     labelEn:'Cover with cure sheet', labelVi:'Phủ tấm dưỡng hộ', labelAr:'تغطية للمعالجة',         taskType:'cure', applicableTrades:['pour','concrete'], risk:'safe' },
    { id:'cure_early_load',  icon:'⚠', labelKo:'양생 안 끝났는데 적재', labelEn:'Load before cure done', labelVi:'Chất tải sớm',     labelAr:'تحميل مبكر',             taskType:'cure', applicableTrades:null, risk:'danger', accidentIfDanger:'premature_load' },
  ],
  // 양중
  lift: [
    { id:'lift_inspect_sling', icon:'🔍', labelKo:'슬링 점검',         labelEn:'Check sling',         labelVi:'Kiểm tra dây cẩu',   labelAr:'افحص الحبل',           taskType:'lift', applicableTrades:['lifting'], risk:'safe', minSkill:0.6 },
    { id:'lift_secure_pin',  icon:'🔐', labelKo:'안전핀 체결',         labelEn:'Secure pin',          labelVi:'Khóa chốt',          labelAr:'إحكام المسمار',         taskType:'lift', applicableTrades:['lifting'], risk:'safe', minSkill:0.55 },
    { id:'lift_measure_angle', icon:'📐', labelKo:'슬링 각도 측정',    labelEn:'Measure angle',       labelVi:'Đo góc',              labelAr:'قياس الزاوية',         taskType:'lift', applicableTrades:['lifting'], risk:'safe', minSkill:0.65 },
    { id:'lift_use_kinked',  icon:'⚠', labelKo:'킹크 슬링 사용',      labelEn:'Use kinked sling',    labelVi:'Dùng dây xoắn',      labelAr:'استخدم حبل معطوب',      taskType:'lift', applicableTrades:['lifting'], risk:'danger', accidentIfDanger:'sling_snap' },
    { id:'lift_no_signal',   icon:'⚠', labelKo:'신호수 없이 인양',    labelEn:'Lift without signal', labelVi:'Cẩu không hiệu',     labelAr:'ارفع بلا إشاري',         taskType:'lift', applicableTrades:['lifting','signal'], risk:'danger', accidentIfDanger:'no_signal' },
  ],
  signal: [
    { id:'signal_pos',       icon:'📍', labelKo:'신호수 위치',         labelEn:'Take position',       labelVi:'Vào vị trí',         labelAr:'اتخذ الموقع',           taskType:'signal', applicableTrades:['signal'], risk:'safe', minSkill:0.5 },
    { id:'signal_in_zone',   icon:'⚠', labelKo:'반경 안에서 신호',    labelEn:'Signal inside zone',  labelVi:'Hiệu trong vùng',    labelAr:'إشارة داخل النطاق',     taskType:'signal', applicableTrades:['signal'], risk:'danger', accidentIfDanger:'worker_crush' },
  ],
  // 마감/설비
  electric: [
    { id:'electric_loto',    icon:'🔒', labelKo:'LOTO 절차',           labelEn:'Apply LOTO',          labelVi:'Khóa LOTO',          labelAr:'تطبيق LOTO',           taskType:'electric', applicableTrades:['electric'], risk:'safe', minSkill:0.7 },
    { id:'electric_live',    icon:'⚠', labelKo:'활선 상태 작업',      labelEn:'Work hot (no LOTO)',  labelVi:'Làm khi có điện',    labelAr:'العمل على خط حي',       taskType:'electric', applicableTrades:['electric'], risk:'danger', accidentIfDanger:'electric_shock' },
  ],
  paint: [
    { id:'paint_vent',       icon:'💨', labelKo:'국소배기 가동 후 도장', labelEn:'Vent before paint', labelVi:'Thông gió trước sơn', labelAr:'تهوية قبل الدهان',     taskType:'paint', applicableTrades:['painting'], risk:'safe' },
    { id:'paint_no_vent',    icon:'⚠', labelKo:'환기 없이 유성 도장', labelEn:'Solvent paint no vent', labelVi:'Sơn dầu không thông',labelAr:'دهن عضوي بلا تهوية',taskType:'paint', applicableTrades:['painting'], risk:'danger', accidentIfDanger:'toxic_exposure' },
  ],
  plumb: [
    { id:'plumb_pressure',   icon:'🧪', labelKo:'배관 수압시험',       labelEn:'Pressure test',       labelVi:'Thử áp suất',        labelAr:'اختبار الضغط',         taskType:'plumb', applicableTrades:['plumbing'], risk:'safe' },
  ],
  vent: [
    { id:'vent_activate',    icon:'💨', labelKo:'국소배기 가동',       labelEn:'Activate ventilation',labelVi:'Bật thông gió',      labelAr:'تشغيل التهوية',         taskType:'vent', applicableTrades:['plumbing','electric'], risk:'safe' },
  ],
  // 굴착·기초
  excavate: [
    { id:'excav_signal',     icon:'📍', labelKo:'신호수 배치',         labelEn:'Assign signal',       labelVi:'Bố trí người ra hiệu',labelAr:'تعيين الإشاري',         taskType:'excavate', applicableTrades:['signal','excavator'], risk:'safe' },
    { id:'excav_underground',icon:'🗺', labelKo:'매설물 사전조사',    labelEn:'Survey underground',  labelVi:'Khảo sát ngầm',      labelAr:'مسح المرافق',           taskType:'excavate', applicableTrades:['earthwork','excavator'], risk:'safe' },
    { id:'excav_no_survey',  icon:'⚠', labelKo:'조사 없이 굴착',      labelEn:'Excavate w/o survey', labelVi:'Đào không khảo sát', labelAr:'احفر بلا مسح',           taskType:'excavate', applicableTrades:['excavator'], risk:'danger', accidentIfDanger:'excavator_crush' },
  ],
  found_pour: [
    { id:'found_pour_order',  icon:'🚚', labelKo:'기초 타설 순서 확인', labelEn:'Confirm foundation pour order', labelVi:'Xác nhận trình tự đổ móng', labelAr:'تأكيد ترتيب صب الأساس', taskType:'found_pour', applicableTrades:['pour','concrete'], risk:'safe' },
    { id:'found_pour_skip_test', icon:'⚠', labelKo:'슬럼프 시험 생략',  labelEn:'Skip slump test',     labelVi:'Bỏ qua thử độ sụt',   labelAr:'تخطي اختبار الانهيار', taskType:'found_pour', applicableTrades:['pour'], risk:'danger', accidentIfDanger:'form_collapse' },
  ],
  // 가설공사 추가
  formwork_support: [
    { id:'fwsupp_check',     icon:'🔧', labelKo:'동바리 수직도 점검',   labelEn:'Inspect shoring plumb', labelVi:'Kiểm tra chống thẳng', labelAr:'فحص استقامة الدعم',    taskType:'formwork_support', applicableTrades:['formwork'], risk:'safe' },
    { id:'fwsupp_no_check',  icon:'⚠', labelKo:'점검 없이 타설',       labelEn:'Pour without shoring check', labelVi:'Đổ không kiểm chống', labelAr:'صب بلا فحص الدعم',     taskType:'formwork_support', applicableTrades:['formwork','pour'], risk:'danger', accidentIfDanger:'form_collapse' },
  ],
  guardrail: [
    { id:'guard_install',    icon:'🚧', labelKo:'안전난간 설치',       labelEn:'Install guardrail',   labelVi:'Lắp lan can',         labelAr:'تركيب الحاجز',          taskType:'guardrail', applicableTrades:['scaffold','envelope'], risk:'safe' },
    { id:'guard_skip',       icon:'⚠', labelKo:'난간 없이 작업',      labelEn:'Work without rail',   labelVi:'Làm không lan can',   labelAr:'العمل بلا حاجز',         taskType:'guardrail', applicableTrades:null, risk:'danger', accidentIfDanger:'worker_fall' },
  ],
  // 마감 추가
  panel: [
    { id:'panel_anchor_check', icon:'🔗', labelKo:'외장 패널 앵커 점검', labelEn:'Inspect panel anchors', labelVi:'Kiểm tra mỏ neo tấm vỏ', labelAr:'فحص مثبتات الألواح', taskType:'panel', applicableTrades:['envelope','scaffold'], risk:'safe' },
    { id:'panel_install',    icon:'🧱', labelKo:'외장 패널 설치',      labelEn:'Install panel',       labelVi:'Lắp tấm vỏ',          labelAr:'تركيب اللوح',           taskType:'panel', applicableTrades:['envelope'], risk:'safe' },
    { id:'panel_during_dismantle', icon:'⚠', labelKo:'비계 해체 중 패널 설치', labelEn:'Install panel during scaffold dismantle', labelVi:'Lắp tấm khi tháo giàn giáo', labelAr:'تركيب اللوح أثناء تفكيك السقالة', taskType:'panel', applicableTrades:['envelope'], risk:'danger', accidentIfDanger:'panel_drop' },
  ],
  glass: [
    { id:'glass_double_check', icon:'👀', labelKo:'유리 결속 2회 확인', labelEn:'Double-check glazing', labelVi:'Kiểm tra kính lần 2', labelAr:'فحص الزجاج مرتين',     taskType:'glass', applicableTrades:['envelope'], risk:'safe' },
    { id:'glass_drop_zone',   icon:'⚠', labelKo:'하부 통제 없이 유리 인양', labelEn:'Hoist glass w/o exclusion zone', labelVi:'Cẩu kính không khu vực cấm', labelAr:'رفع الزجاج بلا منطقة منع', taskType:'glass', applicableTrades:['envelope','lifting'], risk:'danger', accidentIfDanger:'falling_debris' },
  ],
  ext_install: [
    { id:'ext_place',        icon:'🧯', labelKo:'소화기 정위치 배치',  labelEn:'Place extinguisher correctly', labelVi:'Đặt bình chữa cháy', labelAr:'وضع الطفاية بشكل صحيح', taskType:'ext_install', applicableTrades:['envelope','helper'], risk:'safe' },
  ],
  // 지속 작업 추가
  survey: [
    { id:'survey_wind',      icon:'🌬', labelKo:'풍속·기상 모니터링',  labelEn:'Monitor wind/weather',labelVi:'Giám sát gió/thời tiết', labelAr:'مراقبة الرياح/الطقس', taskType:'survey', applicableTrades:['signal','helper'], risk:'safe' },
    { id:'survey_underground', icon:'🗺', labelKo:'매설물 도면 확인',  labelEn:'Verify underground plan', labelVi:'Xem bản vẽ ngầm',   labelAr:'تحقق مخطط المرافق',     taskType:'survey', applicableTrades:['signal','earthwork'], risk:'safe' },
  ],
  inspect: [
    { id:'inspect_watch',    icon:'👁', labelKo:'작업반경 감시',       labelEn:'Watch work zone',     labelVi:'Giám sát khu vực',    labelAr:'مراقبة منطقة العمل',    taskType:'inspect', applicableTrades:['signal','helper'], risk:'safe' },
    { id:'inspect_in_radius',icon:'⚠', labelKo:'인양 반경 안에서 감시', labelEn:'Watch inside lift radius', labelVi:'Giám sát trong vùng cẩu', labelAr:'مراقبة داخل نطاق الرفع', taskType:'inspect', applicableTrades:['signal','helper'], risk:'danger', accidentIfDanger:'worker_crush' },
  ],
};

// ── 글로벌 함정 풀 — 항상 명령 풀에 포함 ────────────────────
// 어느 작업이 활성이든 무관하게 표시되는 함정 (PPE 미착용 강제, 풍속 무시 등)
const TRAPS_GLOBAL = [
  { id:'global_wear_ppe',    icon:'⛑',  labelKo:'안전모·안전대 착용', labelEn:'Wear helmet & harness', labelVi:'Đeo mũ và dây an toàn', labelAr:'البس الخوذة والحزام', applicableTrades:null, risk:'safe' },
  { id:'global_no_ppe',      icon:'⚠', labelKo:'PPE 없이 작업해',     labelEn:'Work without PPE',      labelVi:'Làm không PPE',      labelAr:'العمل بلا معدات وقاية', applicableTrades:null, risk:'danger', accidentIfDanger:'worker_fall' },
  { id:'global_ignore_wind', icon:'⚠', labelKo:'풍속 무시하고 강행',  labelEn:'Ignore wind, proceed',  labelVi:'Bỏ qua gió',         labelAr:'تجاهل الرياح',           applicableTrades:null, risk:'danger', accidentIfDanger:'swing_drop' },
  { id:'global_stop_all',    icon:'✋', labelKo:'작업 중단',           labelEn:'Stop all work',         labelVi:'Dừng tất cả',        labelAr:'أوقف كل العمل',         applicableTrades:null, risk:'safe' },
  // v2.0 — flag set 명령: 사용자가 강행하면 간섭 매트릭스 조건 활성화 (사고 발현 트리거)
  { id:'global_start_dismantle', icon:'🛠', labelKo:'비계 해체 시작',  labelEn:'Start scaffold dismantle', labelVi:'Bắt đầu tháo giàn giáo', labelAr:'بدء تفكيك السقالة', applicableTrades:['scaffold'], risk:'safe', setFlagOnTask: { type:'scaffold', flag:'dismantling' } },
  { id:'global_premature_load',  icon:'⚠', labelKo:'양생 미완에 상부 적재', labelEn:'Load before cure done', labelVi:'Chất tải khi chưa dưỡng đủ', labelAr:'تحميل قبل اكتمال المعالجة', applicableTrades:null, risk:'danger', accidentIfDanger:'premature_load', setFlagOnTask:{ type:'cure', flag:'premature' } },
  { id:'global_organic_solvent', icon:'⚠', labelKo:'유성 도료 사용',  labelEn:'Use solvent paint',     labelVi:'Dùng sơn dung môi',  labelAr:'استخدم دهان مذيب',     applicableTrades:['painting'], risk:'safe', setFlagOnTask:{ type:'paint', flag:'organic' } },
  { id:'global_skip_shoring_check', icon:'⚠', labelKo:'동바리 점검 생략', labelEn:'Skip shoring check', labelVi:'Bỏ kiểm chống', labelAr:'تخطي فحص الدعم', applicableTrades:['formwork'], risk:'safe', setFlagOnTask:{ type:'formwork_support', flag:'unchecked' } },
];

// Track which instructions have been given (per NPC per phase)
const _givenInstructions = new Set();

// Current language for instructions (can differ from UI language)
let instructionLang = 'ko';

// ── Monkey-patch openPopup ───────────────────────────────────
const _origOpenPopup = typeof openPopup === 'function' ? openPopup : null;

function openPopup(item) {
  if (item && item.type === 'npc') {
    openInstructionPopup(item);
    return;
  }
  if (_origOpenPopup) _origOpenPopup(item);
}

// ── Instruction popup ────────────────────────────────────────
function openInstructionPopup(item) {
  INTERACTION.popupOpen = true;
  if (document.pointerLockElement) document.exitPointerLock();

  const npc = GAME.npcs.find(n => n.id === item.npcId);
  if (!npc) { INTERACTION.popupOpen = false; return; }

  const popup = document.getElementById('instruction-popup');
  if (!popup) { INTERACTION.popupOpen = false; return; }

  _currentPanelNpcId = npc.id;

  // NPC header — 이름 + 역할(공종) + 경력
  document.getElementById('inst-name').textContent = npc.name;
  const tradeName = (typeof TRADES !== 'undefined' && npc.trade && TRADES[npc.trade])
    ? TRADES[npc.trade].ko : '';
  const expSuffix = npc.experience ? ` · 경력 ${npc.experience}년` : '';
  const tradeSuffix = tradeName ? ` · ${tradeName}` : '';
  const roleStr = (typeof npc.roleText === 'function') ? npc.roleText() : (typeof npc.role === 'string' ? npc.role : (npc.role && (npc.role[currentLang] || npc.role.ko)) || '');
  document.getElementById('inst-role').textContent = `· ${roleStr}${tradeSuffix}${expSuffix}`;

  // Language badge
  const langBadge = document.getElementById('inst-lang-badge');
  const langNames = { ko: '🇰🇷 한국어', en: '🌐 English', ar: '🇸🇦 عربي', vi: '🇻🇳 Tiếng Việt' };
  const match = npc.language === instructionLang || instructionLang === 'en';
  langBadge.textContent   = langNames[npc.language] || npc.language;
  langBadge.className     = 'inst-lang-badge ' + (match ? 'lang-ok' : 'lang-warn');

  // Speech bubble (language mismatch warning)
  const bubble = document.getElementById('inst-speech-bubble');
  if (!match) {
    const responses = MISMATCH_RESPONSES[npc.language] || ['????'];
    bubble.textContent = `"${responses[Math.floor(Math.random() * responses.length)]}"`;
    bubble.classList.remove('hidden');
  } else {
    bubble.classList.add('hidden');
  }

  // Lang switch and close button
  const langSwitch = document.getElementById('inst-lang-switch');
  if (langSwitch) {
    langSwitch.textContent = _instLangSwitchLabel();
  }
  const closeBtn = document.getElementById('inst-close-btn');
  if (closeBtn) closeBtn.textContent = t('close');

  // Instruction list
  const list = document.getElementById('inst-list');
  list.innerHTML = '';
  // v2.0: 활성 작업 큐 우선. 비어있으면 phase 풀로 폴백.
  let items;
  if (typeof buildInstructionPoolFromActiveTasks === 'function' &&
      typeof GAME.activeTasks !== 'undefined' && GAME.activeTasks.length > 0) {
    items = buildInstructionPoolFromActiveTasks(npc);
  } else {
    const phase = GAME.state.phase;
    items = INSTRUCTIONS[phase] || INSTRUCTIONS[1];
  }

  // 정렬 — safe(NPC 직종 일치 > 일반) > flag-trigger > danger 순. 위험 명령이 함정처럼 섞이지 않게.
  items = items.slice().sort((a, b) => {
    const aDanger = a.risk === 'danger' ? 1 : 0;
    const bDanger = b.risk === 'danger' ? 1 : 0;
    if (aDanger !== bDanger) return aDanger - bDanger;
    const aFlag = a.setFlagOnTask ? 1 : 0;
    const bFlag = b.setFlagOnTask ? 1 : 0;
    if (aFlag !== bFlag) return aFlag - bFlag;
    const npcTrade = npc && npc.trade;
    const aFit = (a.applicableTrades && npcTrade && a.applicableTrades.indexOf(npcTrade) >= 0) ? 0 : 1;
    const bFit = (b.applicableTrades && npcTrade && b.applicableTrades.indexOf(npcTrade) >= 0) ? 0 : 1;
    return aFit - bFit;
  });

  // 모든 명령을 풀에 표시 — 직종/phase 미스매치는 NPC 거부로 처리 (학습)
  // 위험변종(risk='danger')는 시각적 경고 (⚠ 아이콘이 이미 있음) — 플레이어가 인식 가능
  items.forEach(inst => {
    const btn = document.createElement('div');
    const isDanger = inst.risk === 'danger';
    btn.className = 'inst-item' +
                    (_givenInstructions.has(`${npc.id}_${inst.id}`) ? ' given' : '') +
                    (isDanger ? ' inst-danger' : '');
    const langSuffix = (instructionLang || 'ko').charAt(0).toUpperCase() + (instructionLang || 'ko').slice(1);
    const label = inst['label' + langSuffix] || inst.labelEn || inst.labelKo;
    const accSub = (isDanger && inst.accidentIfDanger && typeof accidentLabel === 'function')
      ? `<span style="margin-left:6px;font-size:11px;opacity:0.85;color:#F56565">⚠ ${accidentLabel(inst.accidentIfDanger)}</span>` : '';
    btn.innerHTML = `<span class="inst-icon">${inst.icon}</span>
      <span>${label}${accSub}</span>`;

    btn.onclick = () => {
      if (_givenInstructions.has(`${npc.id}_${inst.id}`)) return;
      giveInstruction(npc, inst);
      closeInstructionPopup();
    };
    list.appendChild(btn);
  });

  popup.classList.remove('hidden');
}

function closeInstructionPopup() {
  INTERACTION.popupOpen = false;
  _currentPanelNpcId = null;
  const popup = document.getElementById('instruction-popup');
  if (popup) popup.classList.add('hidden');
  if (GAME.state.gameStarted && !GAME.state.gameOver && window.matchMedia('(pointer: fine)').matches) {
    GAME.renderer.domElement.requestPointerLock();
  }
}

// ── Give an instruction to NPC ────────────────────────────────
// 4언어 거부 멘트 사전 (NPC 직종/phase 미스매치)
const _REJECT_LINES = {
  trade: {
    ko: ['저는 그 작업 못합니다.', '제 일이 아닙니다.', '다른 사람한테 시키세요.'],
    en: ['Not my job.', 'I am not trained for that.', "That's someone else's task."],
    vi: ['Đó không phải việc của tôi.', 'Tôi không được đào tạo việc đó.', 'Hỏi người khác đi.'],
    ar: ['ليس عملي.', 'لست مدرّباً على ذلك.', 'اطلب شخصاً آخر.'],
  },
  phase: {
    ko: ['지금 할 일이 아닙니다.', '아직 그 단계 아니에요.', '순서가 안 맞습니다.'],
    en: ['Not the right time.', 'Not at this stage.', 'Out of sequence.'],
    vi: ['Chưa đến lúc.', 'Không phải bước này.', 'Sai thứ tự.'],
    ar: ['ليس الوقت المناسب.', 'ليست هذه المرحلة.', 'خارج التسلسل.'],
  },
  danger: {
    ko: ['그건 위험합니다. 안전절차 지킬게요.', '안 됩니다. 사고 납니다.', '저 죽으라는 거죠?'],
    en: ['Too dangerous. I will follow safety.', 'No. That causes accidents.', 'You want me dead?'],
    vi: ['Quá nguy hiểm.', 'Không. Sẽ gây tai nạn.', 'Anh muốn tôi chết à?'],
    ar: ['خطير جداً.', 'لا. سيسبب حادثاً.', 'أتريدني أن أُقتل؟'],
  },
};
function _rejectLine(kind) {
  const pool = (_REJECT_LINES[kind] || _REJECT_LINES.trade)[currentLang] || _REJECT_LINES.trade.ko;
  return pool[Math.floor(Math.random() * pool.length)];
}

// 명령이 NPC 직종/phase 에 적합한지 평가
function _evalInstructionFit(npc, inst) {
  // 직종 체크
  if (inst.applicableTrades && Array.isArray(inst.applicableTrades)) {
    if (!inst.applicableTrades.includes(npc.trade)) {
      return { ok: false, reason: 'trade' };
    }
  }
  // phase 체크 — 현재 phase 가 적합한지
  const curPhase = (GAME.state && GAME.state.phase) || 1;
  if (inst.applicablePhases && Array.isArray(inst.applicablePhases)) {
    if (!inst.applicablePhases.includes(curPhase)) {
      return { ok: false, reason: 'phase' };
    }
  }
  // 위험변종 체크 — danger 명령은 별도 분기 (수행 시 사고)
  if (inst.risk === 'danger') return { ok: true, reason: 'danger' };
  return { ok: true, reason: 'safe' };
}

function _applyInstructionFlag(spec) {
  if (!spec || !GAME.activeTasks) return;
  GAME.activeTasks.filter(t => t.type === spec.type).forEach(t => {
    t.flags = t.flags || {};
    t.flags[spec.flag] = true;
  });
}

function giveInstruction(npc, inst) {
  _givenInstructions.add(`${npc.id}_${inst.id}`);
  const _record = (r) => {
    if (typeof recordInstructionEvent === 'function') recordInstructionEvent(npc, inst, r);
  };

  // 0단계: 언어 미스매치
  const match = npc.receiveInstruction(instructionLang);
  if (!match) {
    _doMismatchBehavior(npc, inst);
    applySafetyPenalty(10);
    _record('mismatch');
    return;
  }

  // 1단계: 직종/phase/위험 평가
  const fit = _evalInstructionFit(npc, inst);
  if (!fit.ok) {
    // NPC 거부 — 직종 또는 phase 미스매치
    npc.setState && npc.setState('IDLE');
    _showWorldBubble(npc, `"${_rejectLine(fit.reason)}"`);
    const penalty = fit.reason === 'trade' ? 5 : 3;
    applySafetyPenalty(penalty);
    updateHUD();
    if (typeof showActionNotif === 'function') {
      const m = { ko:`❌ ${npc.name} 거부 — ${penalty}점 차감`, en:`❌ ${npc.name} refused — -${penalty}`, vi:`❌ ${npc.name} từ chối — -${penalty}`, ar:`❌ ${npc.name} رفض — -${penalty}` };
      showActionNotif(m[currentLang] || m.ko, 2800);
    }
    _record(fit.reason === 'trade' ? 'reject_trade' : 'reject_phase');
    return;
  }

  // 2단계: 위험변종 분기 — NPC 가 50% 확률로 거부, 강행 시 사고
  if (fit.reason === 'danger') {
    if (Math.random() < 0.5) {
      // NPC 거부 (양심)
      _showWorldBubble(npc, `"${_rejectLine('danger')}"`);
      applySafetyPenalty(2);
      updateHUD();
      _record('danger_refused');
      return;
    }
    // 마지못해 수행 → 사고 확률 70%
    _showWorldBubble(npc, '...');
    if (Math.random() < 0.7 && inst.accidentIfDanger && typeof triggerAccident === 'function') {
      applySafetyPenalty(15);
      _record('danger_accident');
      setTimeout(() => triggerAccident(inst.accidentIfDanger), 1200);
      return;
    }
    // 운 좋게 사고 안 남 — 안전지수만 깎임
    applySafetyPenalty(12);
    updateHUD();
    if (inst.setFlagOnTask) _applyInstructionFlag(inst.setFlagOnTask);
    _record('danger_skipped');
    return;
  }

  // 3단계: 숙련도 체크 — 정답이라도 NPC skill 미달 시 실패 가능
  if (inst.minSkill && typeof npc.skill === 'number' && npc.skill < inst.minSkill) {
    const failProb = (inst.minSkill - npc.skill) * 1.5; // 0~0.6 정도
    if (Math.random() < failProb) {
      // 시도 → 실패 (사고 아님, 그냥 미완료)
      npc.setState && npc.setState('UNSAFE');
      _showWorldBubble(npc, currentLang === 'en' ? '"Tried but failed..."' :
                             currentLang === 'vi' ? '"Đã thử nhưng thất bại..."' :
                             currentLang === 'ar' ? '"حاولت لكن فشلت..."' :
                             '"해봤는데 잘 안 됩니다..."');
      applySafetyPenalty(4);
      updateHUD();
      if (typeof showActionNotif === 'function') {
        const m = { ko:`⚠ ${npc.name} 숙련도 부족 — 작업 실패`, en:`⚠ ${npc.name} skill too low — failed`, vi:`⚠ ${npc.name} kỹ năng kém — thất bại`, ar:`⚠ ${npc.name} مهارة غير كافية — فشل` };
        showActionNotif(m[currentLang] || m.ko, 3000);
      }
      _record('skill_fail');
      return;
    }
  }

  // 4단계: 정상 수행
  switch (inst.id) {
    case 'check_sling':
      npc.setState && npc.setState('WORKING');
      _animateNPCWork(npc, 'inspect');
      // Resolve sling hazard from NPC side
      _resolveHazardByNPC('sling_damage');
      break;
    case 'signal_pos':
      npc.group.position.set(7, 0, -6);
      npc.setState('WORKING');
      _resolveHazardByNPC('no_signal');
      break;
    case 'evacuate':
      npc.evacuate();
      _resolveHazardByNPC('worker_in_zone');
      break;
    case 'wear_ppe':
      npc.setState('WORKING');
      applySafetyReward(5);
      break;
    case 'check_spec':
      npc.setState('WORKING');
      applySafetyReward(5);
      break;
    case 'measure_angle':
      npc.setState('WORKING');
      _resolveHazardByNPC('angle_exceeded');
      break;
    case 'secure_pin':
      npc.setState && npc.setState('WORKING');
      _animateNPCWork(npc, 'inspect');
      break;
    case 'outrigger_check':
    case 'check_weather':
      npc.setState && npc.setState('WORKING');
      applySafetyReward(3);
      break;
    case 'start_lift':
      npc.setState('WORKING');
      break;
    case 'stop':
      npc.setState('IDLE');
      break;
  }

  applySafetyReward(3);
  updateHUD();
  if (inst.setFlagOnTask) _applyInstructionFlag(inst.setFlagOnTask);
  _record('success');
}

function _doMismatchBehavior(npc, inst) {
  // NPC does something random/wrong
  const wrongActions = [
    () => { npc.setState && npc.setState('UNSAFE'); },
    () => { npc.group.position.x += (Math.random() - 0.5) * 4; },
    () => { npc.fatigue = Math.min(100, npc.fatigue + 20); },
  ];
  wrongActions[Math.floor(Math.random() * wrongActions.length)]();

  // Show "????" bubble in world
  _showWorldBubble(npc, '????');
}

function _resolveHazardByNPC(hazardId) {
  const haz = GAME.hazards.find(h => h.id === hazardId);
  if (!haz || haz.resolved || haz.ignored) return;
  haz.resolved = true;
  GAME.state.hazardsResolved.add(hazardId);
  if (haz.mesh) {
    haz.mesh.material.color.setHex(0x00A896);
    haz.mesh.material.opacity = 0.4;
    haz.mesh.material.transparent = true;
  }
  GAME.interactables = GAME.interactables.filter(i => i.hazardId !== hazardId);
  applySafetyReward(haz.safetyReward || 5);
  updateHUD();
}

function _animateNPCWork(npc, type) {
  npc.setState('WORKING');
  // Auto return to IDLE after 3s
  setTimeout(() => {
    if (npc.state === 'WORKING') npc.setState('IDLE');
  }, 3000);
}

// ── World-space speech bubble ────────────────────────────────
function _showWorldBubble(npc, text) {
  const id = `bubble-${npc.id}`;
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('div');
    el.id = id;
    el.className = 'npc-label';
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.style.opacity = '1';
  setTimeout(() => { el.style.opacity = '0'; }, 2000);
}

// ── Language toggle ───────────────────────────────────────────
// Track the NPC currently displayed in the panel
let _currentPanelNpcId = null;

function toggleInstructionLang() {
  instructionLang = instructionLang === 'ko' ? 'en' : 'ko';

  // Re-render panel contents immediately if popup is open
  if (INTERACTION.popupOpen && _currentPanelNpcId) {
    const npc = GAME.npcs.find(n => n.id === _currentPanelNpcId);
    if (npc) {
      // Update language badge
      const langBadge = document.getElementById('inst-lang-badge');
      const langNames = { ko: '🇰🇷 한국어', en: '🌐 English', ar: '🇸🇦 عربي', vi: '🇻🇳 Tiếng Việt' };
      const match = npc.language === instructionLang || instructionLang === 'en';
      langBadge.textContent = langNames[npc.language] || npc.language;
      langBadge.className   = 'inst-lang-badge ' + (match ? 'lang-ok' : 'lang-warn');

      // Update speech bubble
      const bubble = document.getElementById('inst-speech-bubble');
      if (!match) {
        const responses = MISMATCH_RESPONSES[npc.language] || ['????'];
        bubble.textContent = `"${responses[Math.floor(Math.random() * responses.length)]}"`;
        bubble.classList.remove('hidden');
      } else {
        bubble.classList.add('hidden');
      }

      // Update lang switch button text
      const btn = document.getElementById('inst-lang-switch');
      if (btn) btn.textContent = _instLangSwitchLabel();

      // Re-render instruction list with new language
      const list = document.getElementById('inst-list');
      list.innerHTML = '';
      let items;
      if (typeof buildInstructionPoolFromActiveTasks === 'function' &&
          typeof GAME.activeTasks !== 'undefined' && GAME.activeTasks.length > 0) {
        items = buildInstructionPoolFromActiveTasks(npc);
      } else {
        const phase = GAME.state.phase;
        items = INSTRUCTIONS[phase] || INSTRUCTIONS[1];
      }
      items = items.slice().sort((a, b) => {
        const ad = a.risk === 'danger' ? 1 : 0, bd = b.risk === 'danger' ? 1 : 0;
        if (ad !== bd) return ad - bd;
        const af = a.setFlagOnTask ? 1 : 0, bf = b.setFlagOnTask ? 1 : 0;
        if (af !== bf) return af - bf;
        const nt = npc && npc.trade;
        const afit = (a.applicableTrades && nt && a.applicableTrades.indexOf(nt) >= 0) ? 0 : 1;
        const bfit = (b.applicableTrades && nt && b.applicableTrades.indexOf(nt) >= 0) ? 0 : 1;
        return afit - bfit;
      });
      items.forEach(inst => {
        const isDanger = inst.risk === 'danger';
        const btn2 = document.createElement('div');
        btn2.className = 'inst-item' +
                         (_givenInstructions.has(`${npc.id}_${inst.id}`) ? ' given' : '') +
                         (isDanger ? ' inst-danger' : '');
        const langSuffix2 = (instructionLang || 'ko').charAt(0).toUpperCase() + (instructionLang || 'ko').slice(1);
        const label2 = inst['label' + langSuffix2] || inst.labelEn || inst.labelKo;
        const accSub2 = (isDanger && inst.accidentIfDanger && typeof accidentLabel === 'function')
          ? `<span style="margin-left:6px;font-size:11px;opacity:0.85;color:#F56565">⚠ ${accidentLabel(inst.accidentIfDanger)}</span>` : '';
        btn2.innerHTML = `<span class="inst-icon">${inst.icon}</span>
          <span>${label2}${accSub2}</span>`;
        btn2.onclick = () => {
          if (_givenInstructions.has(`${npc.id}_${inst.id}`)) return;
          giveInstruction(npc, inst);
          closeInstructionPopup();
        };
        list.appendChild(btn2);
      });
      return;
    }
  }

  // Popup not open — just update the button if visible
  const btn = document.getElementById('inst-lang-switch');
  if (btn) btn.textContent = instructionLang === 'ko' ? 'EN으로 지시' : 'KO로 지시';
}

// ── Init ──────────────────────────────────────────────────────
function initInstructions() {
  // Keyboard shortcut: Tab to toggle instruction language
  document.addEventListener('keydown', e => {
    if (e.code === 'Tab' && !INTERACTION.popupOpen) {
      e.preventDefault();
      toggleInstructionLang();
    }
  });
}
