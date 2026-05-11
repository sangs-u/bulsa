// BULSA 공정 매니페스트 — 5층 건물 건설 안전 시뮬레이터
// 산안법(시행규칙 별표 3) + KOSHA GUIDE 기준
// 현재 구현: rc_frame.subSteps.lift 만 완성. 다른 공정은 v1.x 진행.
//
// ── 공통 설계 원칙 ──────────────────────────────────────
// 모든 공정의 Phase 1 = "작업 지시(work instruction)" 입력 단계.
// 플레이어가 직접 매개변수(깊이/치수/자재량/순서 등)를 결정해야 다음 단계 진행 가능.
// 잘못된 지시 → 사고 확률↑ + 과태료 (이벤트성). 각 시나리오 data.js 에 workInstruction 정의.

const CONSTRUCTION_MANIFEST = [
  {
    id: 'excavation',
    order: 1,
    name: { ko: '토공사', en: 'Earthworks', vi: 'San nền', ar: 'الحفر' },
    coreTask: '부지 굴착 + 흙막이 가시설 설치',
    safetyChecks: [
      '굴착면 기울기·구배 확보',
      '흙막이 가시설(스트럿/어스앵커) 설치',
      '매설물 사전조사 (가스·전기·통신)',
      '굴착기 작업반경 출입통제',
      '안전난간·추락방지망',
    ],
    accidents: ['토사 붕괴', '매설물 파손', '굴착기 협착', '추락(굴착단부)'],
    roles:     ['굴착기운전원', '신호수', '안전감시자', '굴착작업자'],
    osh: {
      worksPlan: true,                      // 산안법 시행규칙 별표 3-39 차량계 건설기계
      licenseRequired: ['굴착기운전기능사'], // 산안법 시행규칙 제85조
      requiredPpe:    ['안전모', '안전화', '안전대(굴착단부)'],
    },
    kosha: ['C-39-2011', 'C-104-2020'],
    workInstruction: ['굴착 깊이', '굴착 구배', '흙막이 종류', '매설물 도면 확인'],
    status: 'planned',
  },

  {
    id: 'foundation',
    order: 2,
    name: { ko: '기초공사', en: 'Foundation', vi: 'Móng', ar: 'الأساسات' },
    coreTask: '매트 기초: 동바리 + 거푸집 + 철근 + 콘크리트 타설',
    safetyChecks: [
      '동바리 수직도·강도',
      '거푸집 결속선·간격',
      '철근 보호캡(노출 철근 끝단)',
      '펌프카 아웃트리거·붐 작업반경',
      '타설 순서·일일 타설량',
    ],
    accidents: ['거푸집 붕괴', '철근 찔림/관통상', '펌프카 호스 파열', '콘크리트 압사'],
    roles:     ['형틀목공', '철근공', '타설공', '펌프카운전원', '신호수'],
    osh: {
      worksPlan: true,                       // 거푸집동바리·콘크리트 타설 (별표 3-25, 3-26)
      licenseRequired: ['콘크리트타설/펌프카 운전'],
      requiredPpe:    ['안전모', '안전화', '보안경(타설)', '안전대(고소)'],
    },
    kosha: ['C-67-2018', 'C-72-2017'],
    workInstruction: ['기초 면적', '철근 배근간격', '콘크리트 강도', '동바리 간격'],
    status: 'planned',
  },

  {
    id: 'rc_frame',
    order: 3,
    name: { ko: 'RC 골조공사', en: 'RC Frame', vi: 'Khung BTCT', ar: 'الهيكل الخرساني' },
    coreTask: '1~5층 골조: 거푸집·철근 → 양중 → 콘크리트 타설',
    cyclesPerFloor: 3,                       // sub-step 3개 회전
    totalFloors: 5,
    subSteps: [
      { id: 'formwork_rebar', name: { ko: '거푸집·철근',  en: 'Formwork & Rebar' },
        focusAccidents: ['추락', '자재낙하'] },
      { id: 'lift',           name: { ko: '양중',         en: 'Lifting' },
        focusAccidents: ['슬링파단', '훅이탈', '과부하', '작업반경 협착'],
        status: 'implemented' },             // <-- 현재 BULSA 양중이 여기
      { id: 'pour_cure',      name: { ko: '타설·양생',     en: 'Pour & Cure' },
        focusAccidents: ['타설 압사', '거푸집 측압 붕괴'] },
    ],
    safetyChecks: [
      '추락방지: 안전난간·안전대 부착설비',
      '낙하물 방호: 방호선반·낙하물방지망',
      '양중 9개 항목 (현재 구현)',
      '거푸집 측압·존치기간',
      '콘크리트 압축강도 시험',
    ],
    accidents: ['추락', '자재낙하', '슬링파단', '훅이탈', '과부하', '콘크리트 압사'],
    roles:     ['형틀목공', '철근공', '크레인운전원', '줄걸이공', '신호수', '타설공'],
    osh: {
      worksPlan: true,                       // 양중·콘크리트 타설 모두 별표 3
      licenseRequired: ['크레인운전(타워/이동식)', '신호수 안전교육'],
      requiredPpe:    ['안전모', '안전화', '안전대', '안전대걸이'],
    },
    kosha: ['C-67-2018', 'G-133-2020', 'C-72-2017'],
    workInstruction: ['인양 부재 종류', '인양 무게', '슬링 규격', '작업반경'],
    status: 'partial',                       // 양중만 구현
  },

  {
    id: 'envelope',
    order: 4,
    name: { ko: '외장·창호공사', en: 'Envelope', vi: 'Vỏ ngoài', ar: 'الواجهة' },
    coreTask: '시스템 비계 + 외벽 패널 + 창호 설치',
    safetyChecks: [
      '비계 조립검사·점검',
      '안전대 부착설비',
      '안전난간(상·중) 설치',
      '외장재 자재 결속·인양 경로',
      '추락방지망',
    ],
    accidents: ['비계 붕괴', '추락', '외장패널 낙하', '유리 파손'],
    roles:     ['비계공', '외장공', '신호수'],
    osh: {
      worksPlan: true,                       // 비계 조립·해체 (별표 3-20)
      licenseRequired: ['비계기능사'],
      requiredPpe:    ['안전모', '안전화', '안전대', '안전대걸이'],
    },
    kosha: ['G-110-2020', 'C-101-2017'],
    workInstruction: ['비계 종류', '비계 높이', '안전난간 단수', '외장재 사양'],
    status: 'planned',
  },

  {
    id: 'mep_finish',
    order: 5,
    name: { ko: '설비·마감·준공', en: 'MEP & Finishing', vi: 'Cơ điện & Hoàn thiện', ar: 'الكهرومحركات والتشطيب' },
    coreTask: '전기·배관 설치 + 내장 마감 + 준공검사',
    safetyChecks: [
      'LOTO(잠금/표지) — 활선 차단',
      '가스 누설·환기 점검',
      '국소배기·환기 가동',
      '소화기·소화전 배치',
      '준공검사 (안전·소방)',
    ],
    accidents: ['감전', '가스 폭발/화재', '유해물질 노출', '추락(마감 시 안전대 미착용)'],
    roles:     ['전기공', '설비공', '도장공', '안전관리자'],
    osh: {
      worksPlan: true,                       // 전기·가스·밀폐공간 작업 (별표 3-15)
      licenseRequired: ['전기기능사', '가스기능사'],
      requiredPpe:    ['안전모', '절연장갑', '방진마스크', '방독마스크'],
    },
    kosha: ['G-82-2018', 'G-119-2020'],
    workInstruction: ['전선 규격·차단기 용량', '배관 경로·구경', '마감재 종류', 'LOTO 절차'],
    status: 'planned',
  },
];

// 시나리오 무관 글로벌 사고 — 추락사 등 (어디서나 발생 가능)
const GLOBAL_ACCIDENTS = {
  worker_fall: {
    descKo: '안전대 미착용·추락방지망 미설치 상태에서 작업자가 고소작업 중 추락하여 사망하였습니다.',
    descEn: 'Worker fell from height due to missing fall arrest equipment.',
    causeKo: '안전대 부착설비 미설치 / 안전난간 미설치 / 추락방지망 부재',
    causeEn: 'No lifeline anchor / no guardrails / no safety net',
    lawKo: '산업안전보건기준에 관한 규칙 제42조 (추락의 방지)\n제44조 (안전대의 사용)\nKOSHA GUIDE G-110-2020',
    lawEn: 'OSH Standards Rule §42 (Fall prevention)\n§44 (Use of safety harness)\nKOSHA GUIDE G-110-2020',
    procedureKo: [
      '2m 이상 작업 시 안전대 부착설비(수평구명줄) 설치',
      '작업 외곽·개구부 안전난간(상부·중간) 설치',
      '추락 위험 구역 하부에 추락방지망 설치',
      '안전대 더블훅 체결 — 이동 시 한쪽 항상 연결 유지',
    ],
    procedureEn: [
      'Install lifeline anchors (horizontal lifeline) for work ≥ 2m',
      'Install upper/middle guardrails at edges and openings',
      'Install fall-arrest netting below fall hazard zones',
      'Use double-hook harness — keep one hook connected at all times',
    ],
  },
};

// 산안법 과태료 기준 (시행령 별표 35) — penalty 시스템에서 참조
const OSH_PENALTY_BASE = {
  no_worksplan:     { ko: '작업계획서 미작성',         krw: 5_000_000, law: '산안법 §38, 시행규칙 §38' },
  no_license:       { ko: '무자격자 운전',             krw: 10_000_000, law: '산안법 §140' },
  no_ppe_helmet:    { ko: '안전모 미착용',             krw: 1_000_000,  law: '산안법 §72' },
  no_ppe_harness:   { ko: '안전대 미착용 (2m 이상)',   krw: 1_500_000,  law: '산안법 §72, 시행규칙 §32' },
  no_underground:   { ko: '매설물 사전조사 미실시',   krw: 5_000_000,  law: '산안법 §38' },
  no_signal_person: { ko: '신호수 미배치',             krw: 3_000_000,  law: '산안법 §38, 시행규칙 §40' },
  no_scaffold_chk:  { ko: '비계 점검 미실시',          krw: 5_000_000,  law: '산안법 §38' },
};
