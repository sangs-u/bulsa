const STRINGS = {
  ko: {
    // Briefing overlay
    briefingBadge:   '작업 지시서',
    briefingTitle:   '줄걸이 · 인양 작업',
    briefingContext: '현장 감독관 지시에 따라 금일 오전, RC 보(2,500 kg)를 타워크레인으로 3층 슬래브 거치 위치에 인양합니다. 작업 전 현장 안전 상태를 직접 점검하세요.',
    briefingStep1:   '현장을 이동하며 위험요소(⚠) 6개를 확인·조치',
    briefingStep2:   'TBM(작업 전 안전회의) 참여 및 체크리스트 완료',
    briefingStep3:   '크레인 제어판에서 인양 지시 후 안전 완료',
    briefingKosha:   'KOSHA GUIDE G-133-2020 · 산안규칙 제163~167조',
    briefingBtn:     '현장 투입 →',
    briefingLabelContext: '작업 배경',
    briefingLabelSteps:   '오늘의 목표',
    // Camera mode
    camFps:   '1인칭 [V]',
    camTps:   '3인칭 [V]',
    camFixed: '고정 [C]',
    // Index hub
    tagline: '당신이 무시한 그 위험이, 오늘 사고가 됩니다.',
    scenarioReady: '시작하기',
    scenarioSoon: '준비 중',
    s01Title: '줄걸이 · 인양 작업',
    s01Desc: '건설현장 크레인으로 RC 보를 인양하는 작업',
    s01Kosha: 'KOSHA GUIDE G-133-2020',
    langLabel: '언어',

    // HUD
    safetyIndex: '안전지수',
    phase1: '점검',
    phase2: '인양',
    phase3: '완료',
    mission1: '현장을 점검하고 위험요소를 조치하세요',
    mission2: '크레인 제어판에서 작업을 시작하세요',
    mission3: '작업이 완료되었습니다',
    pressE: '[E] 상호작용',
    mobileStart: '화면을 탭하여 시작',

    // Blocker
    blockerTitle: '클릭하여 시작',
    blockerControls: 'WASD 이동 · 마우스 시점 · E 상호작용',
    blockerEsc: 'ESC: 일시정지',

    // Hazards
    hazard_sling_name: '슬링 손상 (킹크)',
    hazard_sling_desc: '슬링 와이어에 심한 꺾임(킹크)이 발생한 상태입니다. 하중 인양 시 슬링이 절단되어 중대사고로 이어질 수 있습니다.',
    hazard_sling_action: '슬링 교체',
    hazard_sling_ignore: '그냥 사용',

    hazard_pin_name: '안전핀 미체결',
    hazard_pin_desc: '훅의 안전핀이 체결되지 않았습니다. 인양 중 하중이 이탈하여 낙하할 위험이 있습니다.',
    hazard_pin_action: '안전핀 체결',
    hazard_pin_ignore: '무시',

    hazard_signal_name: '신호수 미배치',
    hazard_signal_desc: '크레인 작업 반경 내에 신호수가 배치되지 않았습니다. 산안규칙에 따라 신호수 배치는 의무입니다.',
    hazard_signal_action: '신호수 배치',
    hazard_signal_ignore: '무시',

    hazard_overload_name: '크레인 과부하',
    hazard_overload_desc: '현재 하중이 정격하중을 초과했습니다. 크레인 전도 및 붐 파손 위험이 있습니다.',
    hazard_overload_action: '작업 중단 · 하중 재확인',
    hazard_overload_ignore: '그냥 진행',

    hazard_worker_name: '작업반경 내 근로자',
    hazard_worker_desc: '인양 작업 반경 내에 근로자가 있습니다. 하중 낙하 또는 크레인 접촉으로 인한 사망사고가 발생할 수 있습니다.',
    hazard_worker_action: '대피 지시',
    hazard_worker_ignore: '무시',

    hazard_angle_name: '인양각도 초과 (60°)',
    hazard_angle_desc: '현재 슬링 인양각도가 60°를 초과했습니다. 각도 증가에 따라 슬링 장력이 급격히 증가하여 파단 위험이 높아집니다.',
    hazard_angle_action: '각도 조정',
    hazard_angle_ignore: '무시',

    // Trigger
    trigger_panel_name: '크레인 제어판',
    trigger_panel_desc: '인양 작업을 시작합니다. 현장 점검이 완료되었습니까?',
    trigger_panel_action: '작업 시작',
    trigger_panel_cancel: '취소',

    // Accident panel
    accidentTitle: '사고 발생',
    accidentCause: '사고 원인',
    accidentLaw: '관련 법령',
    accidentProcedure: '올바른 절차',
    retry: '다시 시도',
    backToHub: '허브로',

    // Complete panel
    completeTitle: '작업 완료',
    safeComplete: '모든 위험요소를 조치하고 안전하게 작업을 완료했습니다.',
    unsafeComplete: '작업은 완료됐지만 일부 위험요소가 방치되었습니다.',
    hazardsFixed: '조치 완료',
    hazardsIgnored: '방치',
  },
  en: {
    briefingBadge:   'Work Order',
    briefingTitle:   'Rigging & Lifting',
    briefingContext: 'Per site supervisor instructions, an RC beam (2,500 kg) will be lifted to the 3rd floor slab position using the tower crane. Inspect the site for hazards before commencing.',
    briefingStep1:   'Walk the site and address 6 hazards (⚠)',
    briefingStep2:   'Complete the TBM (pre-work safety meeting) checklist',
    briefingStep3:   'Issue lift command at crane control panel',
    briefingKosha:   'KOSHA GUIDE G-133-2020 · OSH Act Article 163–167',
    briefingBtn:     'Enter Site →',
    briefingLabelContext: 'Background',
    briefingLabelSteps:   'Today\'s Goals',
    camFps:   'FPS [V]',
    camTps:   'TPS [V]',
    camFixed: 'Fixed [C]',
    tagline: 'The hazard you ignored becomes today\'s accident.',
    scenarioReady: 'Play',
    scenarioSoon: 'Coming Soon',
    s01Title: 'Rigging & Lifting',
    s01Desc: 'Lift an RC beam with a tower crane on a construction site',
    s01Kosha: 'KOSHA GUIDE G-133-2020',
    langLabel: 'Language',

    safetyIndex: 'Safety',
    phase1: 'Inspect',
    phase2: 'Lift',
    phase3: 'Done',
    mission1: 'Inspect the site and address hazards',
    mission2: 'Go to the crane control panel to start',
    mission3: 'Operation complete',
    pressE: '[E] Interact',
    mobileStart: 'Tap to start',

    blockerTitle: 'Click to Start',
    blockerControls: 'WASD Move · Mouse Look · E Interact',
    blockerEsc: 'ESC: Pause',

    hazard_sling_name: 'Damaged Sling (Kink)',
    hazard_sling_desc: 'The sling wire has a severe kink. Under load, the sling may snap, causing a fatal accident.',
    hazard_sling_action: 'Replace Sling',
    hazard_sling_ignore: 'Use Anyway',

    hazard_pin_name: 'Safety Pin Not Secured',
    hazard_pin_desc: 'The hook safety pin is not engaged. The load may detach during lifting.',
    hazard_pin_action: 'Secure Pin',
    hazard_pin_ignore: 'Ignore',

    hazard_signal_name: 'No Signal Person',
    hazard_signal_desc: 'No signal person is stationed in the crane operation radius. This is legally required.',
    hazard_signal_action: 'Station Signal Person',
    hazard_signal_ignore: 'Ignore',

    hazard_overload_name: 'Crane Overload',
    hazard_overload_desc: 'Current load exceeds rated capacity. Risk of crane collapse or boom failure.',
    hazard_overload_action: 'Stop & Recheck Load',
    hazard_overload_ignore: 'Continue',

    hazard_worker_name: 'Worker in Lift Zone',
    hazard_worker_desc: 'A worker is inside the lifting radius. They could be struck by the falling load.',
    hazard_worker_action: 'Order Evacuation',
    hazard_worker_ignore: 'Ignore',

    hazard_angle_name: 'Sling Angle Exceeded (60°)',
    hazard_angle_desc: 'Sling angle exceeds 60°. Tension increases sharply beyond this angle, risking breakage.',
    hazard_angle_action: 'Adjust Angle',
    hazard_angle_ignore: 'Ignore',

    trigger_panel_name: 'Crane Control Panel',
    trigger_panel_desc: 'Begin the lifting operation. Is the site inspection complete?',
    trigger_panel_action: 'Start Lift',
    trigger_panel_cancel: 'Cancel',

    accidentTitle: 'ACCIDENT',
    accidentCause: 'Cause',
    accidentLaw: 'Regulation',
    accidentProcedure: 'Correct Procedure',
    retry: 'Retry',
    backToHub: 'Hub',

    completeTitle: 'Operation Complete',
    safeComplete: 'All hazards addressed. Operation completed safely.',
    unsafeComplete: 'Operation complete, but some hazards were left unaddressed.',
    hazardsFixed: 'Fixed',
    hazardsIgnored: 'Ignored',
  }
};

let currentLang = 'ko';

function t(key) {
  return (STRINGS[currentLang] && STRINGS[currentLang][key])
    || (STRINGS.ko && STRINGS.ko[key])
    || key;
}

function setLang(lang) {
  if (STRINGS[lang]) currentLang = lang;
}
