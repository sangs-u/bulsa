const LIFTING_DATA = {
  scenarioId: 'lifting',
  kosha: ['KOSHA GUIDE G-133-2020', 'KOSHA GUIDE B-M-12-2025'],

  accidents: {
    sling_snap: {
      descKo: '손상된 슬링(킹크)을 교체하지 않고 인양을 시도하여 슬링이 파단되었고, RC 보가 지상으로 낙하했습니다.',
      descEn: 'A damaged sling (kink) was not replaced. It snapped under load and the RC beam fell.',
      causeKo: '슬링 사전 점검 미이행 / 손상 슬링 계속 사용',
      causeEn: 'No pre-use sling inspection / continued use of damaged sling',
      lawKo: '산업안전보건기준에 관한 규칙 제163조 (달기구의 안전계수)\n제164조 (달기구의 점검 등)\nKOSHA GUIDE G-133-2020 4.3항',
      lawEn: 'OSH Standards Rule §163 (Safety factor of rigging)\n§164 (Rigging inspection)\nKOSHA GUIDE G-133-2020 §4.3',
      procedureKo: [
        '작업 전 슬링 전체 길이를 육안·촉수 점검',
        '킹크·소선 절단·마모 25% 이상 시 즉시 사용 중지',
        '폐기 처리 후 새 슬링으로 교체',
        '교체 슬링의 안전계수 확인(줄걸이 와이어: 6 이상)',
      ],
      procedureEn: [
        'Visually and manually inspect full sling length before use',
        'Retire immediately if kinked, wire broken, or worn >25%',
        'Tag out and replace with new sling',
        'Verify safety factor (wire rope sling: ≥6)',
      ],
    },
    pin_drop: {
      descKo: '안전핀이 체결되지 않은 훅에서 인양 중 슬링이 이탈하여 RC 보가 낙하했습니다.',
      descEn: 'The sling disengaged from an unsecured hook during lifting; the beam fell.',
      causeKo: '안전핀(래치) 체결 미확인',
      causeEn: 'Safety pin (latch) not checked',
      lawKo: '산업안전보건기준에 관한 규칙 제147조 (훅·샤클 등의 안전장치)\nKOSHA GUIDE G-133-2020 5.1항',
      lawEn: 'OSH Standards Rule §147 (Hook safety device)\nKOSHA GUIDE G-133-2020 §5.1',
      procedureKo: [
        '인양 전 훅 안전핀(래치) 체결 상태 확인',
        '손상·변형 훅은 즉시 교체',
        '안전핀 스프링 기능 점검',
      ],
      procedureEn: [
        'Check hook safety pin engagement before each lift',
        'Replace damaged or deformed hooks immediately',
        'Test spring function of the safety pin',
      ],
    },
    worker_crush: {
      descKo: '인양 반경 내 근로자를 대피시키지 않은 상태에서 작업하여, 낙하 하중에 의한 압사 사고가 발생했습니다.',
      descEn: 'A worker inside the lifting radius was struck by the falling load.',
      causeKo: '인양 작업 반경 내 근로자 존재 / 접근 통제 미실시',
      causeEn: 'Worker present in lifting radius / no access control',
      lawKo: '산업안전보건기준에 관한 규칙 제138조 (작업 반경 내의 위험방지)\n제140조 (운전위치 이탈의 제한)',
      lawEn: 'OSH Standards Rule §138 (Hazard prevention in operating radius)\n§140 (Prohibition on leaving operating position)',
      procedureKo: [
        '인양 반경 산출 후 출입금지 구역 설정 및 표시',
        '신호수 1인 배치, 무선 통신 확보',
        '반경 내 근로자 전원 대피 확인 후 작업 시작',
      ],
      procedureEn: [
        'Calculate lift radius, establish and mark exclusion zone',
        'Station one signal person with radio communication',
        'Confirm all workers evacuated before starting lift',
      ],
    },
    overload: {
      descKo: '정격하중을 초과한 하중을 인양하다 크레인 붐이 파손되었습니다.',
      descEn: 'The crane boom failed under a load exceeding rated capacity.',
      causeKo: '하중 초과 확인 없이 작업 강행',
      causeEn: 'Lift proceeded without verifying load vs. rated capacity',
      lawKo: '산업안전보건기준에 관한 규칙 제132조 (과부하 제한장치)\n제134조 (제한하중 준수)',
      lawEn: 'OSH Standards Rule §132 (Overload limiter)\n§134 (Rated load compliance)',
      procedureKo: [
        '인양 전 하중 계량 또는 설계 중량 확인',
        '정격하중의 80% 초과 시 작업계획서 재검토',
        '과부하 방지 장치(OLL) 작동 확인',
      ],
      procedureEn: [
        'Weigh or confirm design load before lift',
        'Review work plan if load exceeds 80% of rated capacity',
        'Verify overload limiter (OLL) is functional',
      ],
    },
    angle_break: {
      descKo: '슬링 인양각도 60° 초과 상태에서 인양하여 슬링 장력이 급증, 파단이 발생했습니다.',
      descEn: 'Lifting with sling angle >60° caused excessive tension and sling breakage.',
      causeKo: '슬링 인양각도 미확인 / 각도 초과 상태로 작업 강행',
      causeEn: 'Sling angle not checked / operation continued beyond 60°',
      lawKo: 'KOSHA GUIDE G-133-2020 4.4항 (인양각도 제한)\n산업안전보건기준에 관한 규칙 제163조',
      lawEn: 'KOSHA GUIDE G-133-2020 §4.4 (Sling angle limit)\nOSH Standards Rule §163',
      procedureKo: [
        '슬링 인양각도는 수직에서 60° 이내 유지',
        '각도 초과 시 슬링 길이 조정 또는 스프레더 빔 사용',
        '인양각도 계산서 사전 작성 (하중·각도·슬링 사양)',
      ],
      procedureEn: [
        'Keep sling angle within 60° from vertical',
        'If exceeded, adjust sling length or use a spreader beam',
        'Prepare angle calculation sheet in advance',
      ],
    },
    no_signal: {
      descKo: '신호수 없이 작업하다 작업자와 크레인 훅이 충돌하는 사고가 발생했습니다.',
      descEn: 'Without a signal person, the crane hook struck a worker.',
      causeKo: '신호수 미배치 / 신호 전달 체계 없이 작업 강행',
      causeEn: 'No signal person assigned / no communication protocol',
      lawKo: '산업안전보건기준에 관한 규칙 제146조 (유도자 배치)\n제145조 (신호)',
      lawEn: 'OSH Standards Rule §146 (Guide person placement)\n§145 (Signaling)',
      procedureKo: [
        '크레인 운전자 시야 확보 불가 시 반드시 신호수 배치',
        '신호 방법(수신호·무선)을 작업 전 운전자와 합의',
        '신호수는 전체 작업 반경이 보이는 위치에 배치',
      ],
      procedureEn: [
        'Always station a signal person when operator view is obstructed',
        'Agree on signal method (hand signal or radio) before work',
        'Position signal person where full lift radius is visible',
      ],
    },
  },

  phases: [
    { id: 1, missionKey: 'mission1' },
    { id: 2, missionKey: 'mission2' },
    { id: 3, missionKey: 'mission3' },
  ],
};
