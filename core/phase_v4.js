// phase_v4.js — 행위 기반 튜토리얼 페이즈 컨트롤러
// 흐름: 페이즈1(굴착) → 2(기초) → 3(골조) → 4(외장) → 5(마감) → 오픈월드
// 각 페이즈: 마커 배치 → 자재 반입 → 행위 수행 → 위험 감소 → 다음 페이즈

const PHASE_V4 = {
  current:   1,
  _started:  false,
  _overlay:  null,  // 페이즈 전환 오버레이 DOM
};

// ── 페이즈별 정의 ─────────────────────────────────────────────
const PHASE_V4_DEFS = [
  // ── 페이즈 1: 굴착 ───────────────────────────────────────────
  {
    id: 1,
    label: { ko: '1단계: 굴착·흙막이', en: 'Phase 1: Excavation & Shoring' },
    intro: {
      ko: '굴착 작업 전 안전조치를 수행하세요.\n① 작업계획서 서명 → ② 매설물 탐지 → ③ 흙막이 설치 → ④ 안전난간 설치',
      en: 'Complete safety acts before excavation.\n① Sign work plan → ② Survey utilities → ③ Install shoring → ④ Install guardrail',
    },
    // 자재 스폰 위치
    materials: [
      { defId: 'MAT_RAILING_POST', position: { x: -4, y: 0, z: 6 }, quantity: 4, label: { ko: '안전난간 기둥', en: 'Guardrail Post' } },
      { defId: 'MAT_SAFETY_NET',   position: { x: -3, y: 0, z: 7 }, quantity: 2, label: { ko: '안전망', en: 'Safety Net' } },
    ],
    // 행위 마커
    markers: [
      { id: 'p1_survey',  actId: 'survey_utilities', label: { ko: '매설물 탐지', en: 'Utility Survey' },   position: { x: 0,  y: 0, z: 0  }, radius: 2.5 },
      { id: 'p1_shoring', actId: 'install_shoring',  label: { ko: '흙막이 설치', en: 'Install Shoring' },  position: { x: -2, y: 0, z: -2 }, radius: 2.5 },
      { id: 'p1_rail1',   actId: 'install_railing',  label: { ko: '난간 설치 ①', en: 'Guardrail ①' },     position: { x: 2,  y: 0, z: -4 }, radius: 2.0 },
      { id: 'p1_rail2',   actId: 'install_railing',  label: { ko: '난간 설치 ②', en: 'Guardrail ②' },     position: { x: -2, y: 0, z: -4 }, radius: 2.0 },
    ],
    // 이 페이즈의 위험 구역
    hazardZone: {
      id: 'zone_excavation',
      center: { x: 0, y: 0, z: -3 },
      radius: 8,
      hazards: {
        collapse:  0.6,  // 굴착면 붕괴
        fall:      0.5,  // 추락
        utility:   0.7,  // 매설물 손상
      },
      accidentMap: {
        collapse: 'shoring_collapse',
        fall:     'fall_to_pit',
        utility:  'gas_pipe_hit',
      },
    },
    // 완료 조건: 지정 마커 전부 done
    completion: ['p1_survey', 'p1_shoring', 'p1_rail1', 'p1_rail2'],
  },

  // ── 페이즈 2: 기초 ───────────────────────────────────────────
  {
    id: 2,
    label: { ko: '2단계: 기초공사', en: 'Phase 2: Foundation' },
    intro: {
      ko: '기초 철근 배근 및 거푸집 설치.\n① 철근 반입 → ② 배근 → ③ 실족방지망 설치 → ④ 거푸집 설치',
      en: 'Rebar placement and formwork installation.\n① Deliver rebar → ② Place rebar → ③ Install fall net → ④ Install formwork',
    },
    materials: [
      { defId: 'MAT_REBAR_BUNDLE',    position: { x: 4, y: 0, z: 4 }, quantity: 1, label: { ko: '철근 묶음', en: 'Rebar Bundle' } },
      { defId: 'MAT_SAFETY_NET',      position: { x: 5, y: 0, z: 4 }, quantity: 2, label: { ko: '실족방지망', en: 'Fall Net' } },
      { defId: 'MAT_FORMWORK_PANEL',  position: { x: 6, y: 0, z: 4 }, quantity: 3, label: { ko: '거푸집 패널', en: 'Formwork Panel' } },
    ],
    markers: [
      { id: 'p2_rebar1',   actId: 'place_rebar',    label: { ko: '철근 배근 ①', en: 'Rebar ①' },          position: { x: 1,  y: 0, z: -6 }, radius: 2.0 },
      { id: 'p2_rebar2',   actId: 'place_rebar',    label: { ko: '철근 배근 ②', en: 'Rebar ②' },          position: { x: -1, y: 0, z: -6 }, radius: 2.0 },
      { id: 'p2_fallnet',  actId: 'install_net',    label: { ko: '실족방지망', en: 'Fall Net' },           position: { x: 0,  y: 0, z: -7 }, radius: 2.5 },
      { id: 'p2_formwork', actId: 'install_formwork', label: { ko: '거푸집 설치', en: 'Formwork' },        position: { x: 0,  y: 0, z: -8 }, radius: 2.0 },
    ],
    hazardZone: {
      id: 'zone_foundation',
      center: { x: 0, y: 0, z: -6 },
      radius: 8,
      hazards: {
        trip:      0.5,  // 철근 돌출 실족
        collapse:  0.4,  // 거푸집 탈형
        rebar_tip: 0.6,  // 철근 끝단 눈 찌름
      },
      accidentMap: {
        trip:      'rebar_trip_fall',
        collapse:  'formwork_collapse',
        rebar_tip: 'rebar_eye_injury',
      },
    },
    completion: ['p2_rebar1', 'p2_rebar2', 'p2_fallnet', 'p2_formwork'],
  },

  // ── 페이즈 3: 골조 양중 ──────────────────────────────────────
  {
    id: 3,
    label: { ko: '3단계: 골조·양중', en: 'Phase 3: RC Frame & Lifting' },
    intro: {
      ko: '부재 양중 및 신호수 배치.\n① 줄걸이 체크 → ② 신호수 배치 → ③ 안전대 부착 → ④ 인양 신호',
      en: 'Lifting operations and signal person setup.\n① Check sling → ② Position signal person → ③ Attach harness → ④ Give lift signal',
    },
    materials: [
      { defId: 'MAT_H_PILE', position: { x: -5, y: 0, z: 2 }, quantity: 1, label: { ko: 'H파일', en: 'H-Pile' } },
    ],
    markers: [
      { id: 'p3_sling',   actId: 'inspect_sling',   label: { ko: '줄걸이 점검', en: 'Inspect Sling' },    position: { x: -3, y: 0, z: 0  }, radius: 2.5 },
      { id: 'p3_signal',  actId: 'position_signal', label: { ko: '신호수 배치', en: 'Signal Position' },  position: { x: 4,  y: 0, z: -2 }, radius: 2.0 },
      { id: 'p3_harness', actId: 'attach_harness',  label: { ko: '안전대 체결', en: 'Attach Harness' },   position: { x: 0,  y: 0, z: 2  }, radius: 2.0 },
      { id: 'p3_lift',    actId: 'signal_lift',     label: { ko: '인양 신호', en: 'Lift Signal' },        position: { x: -4, y: 0, z: -1 }, radius: 2.5 },
    ],
    hazardZone: {
      id: 'zone_lifting',
      center: { x: 0, y: 0, z: 0 },
      radius: 10,
      hazards: {
        swing:   0.65,  // 부재 흔들림
        drop:    0.70,  // 낙하
        crush:   0.55,  // 협착
      },
      accidentMap: {
        swing: 'load_swing_hit',
        drop:  'falling_object',
        crush: 'worker_crush',
      },
    },
    completion: ['p3_sling', 'p3_signal', 'p3_harness', 'p3_lift'],
  },

  // ── 페이즈 4: 외장 ───────────────────────────────────────────
  {
    id: 4,
    label: { ko: '4단계: 외장공사', en: 'Phase 4: Envelope' },
    intro: {
      ko: '비계 위 외장재 설치.\n① 비계 안전점검 → ② 안전대 줄 부착 → ③ 외장패널 반입 → ④ 패널 설치',
      en: 'Facade installation on scaffold.\n① Scaffold safety check → ② Attach lifeline → ③ Deliver panels → ④ Install panels',
    },
    materials: [
      { defId: 'MAT_FORMWORK_PANEL', position: { x: 5, y: 0, z: -2 }, quantity: 4, label: { ko: '외장 패널', en: 'Facade Panel' } },
    ],
    markers: [
      { id: 'p4_scaffold', actId: 'inspect_scaffold', label: { ko: '비계 점검', en: 'Scaffold Check' },    position: { x: 3,  y: 0, z: -5 }, radius: 2.5 },
      { id: 'p4_lifeline', actId: 'attach_lifeline',  label: { ko: '안전대 부착', en: 'Lifeline Attach' }, position: { x: 4,  y: 0, z: -5 }, radius: 2.0 },
      { id: 'p4_panel1',   actId: 'install_panel',    label: { ko: '패널 설치 ①', en: 'Panel ①' },        position: { x: 2,  y: 0, z: -7 }, radius: 2.0 },
      { id: 'p4_panel2',   actId: 'install_panel',    label: { ko: '패널 설치 ②', en: 'Panel ②' },        position: { x: 4,  y: 0, z: -7 }, radius: 2.0 },
    ],
    hazardZone: {
      id: 'zone_envelope',
      center: { x: 3, y: 0, z: -6 },
      radius: 7,
      hazards: {
        scaffold_fall: 0.55,  // 비계 추락
        panel_drop:    0.60,  // 패널 낙하
        wind:          0.35,  // 풍압
      },
      accidentMap: {
        scaffold_fall: 'fall_from_scaffold',
        panel_drop:    'falling_panel',
        wind:          'wind_load_fall',
      },
    },
    completion: ['p4_scaffold', 'p4_lifeline', 'p4_panel1', 'p4_panel2'],
  },

  // ── 페이즈 5: 설비·마감 ──────────────────────────────────────
  {
    id: 5,
    label: { ko: '5단계: 설비·마감', en: 'Phase 5: MEP & Finishing' },
    intro: {
      ko: '전기·배관 설비 설치.\n① LOTO 잠금 → ② 가스 누설 점검 → ③ 환기 가동 → ④ 소화기 배치',
      en: 'Electrical and plumbing installation.\n① Apply LOTO → ② Gas leak check → ③ Activate ventilation → ④ Place extinguishers',
    },
    materials: [],
    markers: [
      { id: 'p5_loto',  actId: 'apply_loto',    label: { ko: 'LOTO 잠금', en: 'Apply LOTO' },            position: { x: 1, y: 0, z: 3 }, radius: 2.0 },
      { id: 'p5_gas',   actId: 'check_gas',     label: { ko: '가스 점검', en: 'Gas Check' },             position: { x: 3, y: 0, z: 3 }, radius: 2.0 },
      { id: 'p5_vent',  actId: 'start_vent',    label: { ko: '환기 가동', en: 'Start Vent' },             position: { x: 5, y: 0, z: 3 }, radius: 2.0 },
      { id: 'p5_ext',   actId: 'place_extinguisher', label: { ko: '소화기 배치', en: 'Extinguisher' },   position: { x: 7, y: 0, z: 3 }, radius: 2.0 },
    ],
    hazardZone: {
      id: 'zone_mep',
      center: { x: 4, y: 0, z: 3 },
      radius: 6,
      hazards: {
        electric: 0.60,  // 감전
        gas_leak: 0.55,  // 가스 중독
        fire:     0.40,  // 화재
      },
      accidentMap: {
        electric: 'electric_shock',
        gas_leak: 'gas_inhalation',
        fire:     'fire_explosion',
      },
    },
    completion: ['p5_loto', 'p5_gas', 'p5_vent', 'p5_ext'],
  },
];

// ── 행위 정의 ─────────────────────────────────────────────────
const _V4_ACTS = [
  { id: 'survey_utilities',   label: { ko: '매설물 탐지 (E홀드)', en: 'Survey Utilities (hold E)' },  duration: 3.0,
    hazardEffect: { zone_excavation: { utility: -0.6 } }, motion: 'survey',
    completeMsg: { ko: '✅ 매설물 탐지 완료', en: '✅ Utility survey complete' } },

  { id: 'install_shoring',    label: { ko: '흙막이 설치 (E홀드)', en: 'Install Shoring (hold E)' },   duration: 4.0,
    hazardEffect: { zone_excavation: { collapse: -0.5 } }, motion: 'hammer',
    completeMsg: { ko: '✅ 흙막이 설치 완료', en: '✅ Shoring installed' } },

  { id: 'install_railing',    label: { ko: '안전난간 설치 (E홀드)', en: 'Install Guardrail (hold E)' }, duration: 3.5,
    hazardEffect: { zone_excavation: { fall: -0.4 } }, motion: 'hammer',
    completeMsg: { ko: '✅ 안전난간 설치 완료', en: '✅ Guardrail installed' } },

  { id: 'place_rebar',        label: { ko: '철근 배근 (E홀드)', en: 'Place Rebar (hold E)' },         duration: 3.0,
    hazardEffect: { zone_foundation: { trip: -0.3 } }, motion: 'carry',
    completeMsg: { ko: '✅ 철근 배근 완료', en: '✅ Rebar placed' } },

  { id: 'install_net',        label: { ko: '실족방지망 설치 (E홀드)', en: 'Install Fall Net (hold E)' }, duration: 3.0,
    hazardEffect: { zone_foundation: { trip: -0.4, rebar_tip: -0.3 } }, motion: 'place',
    completeMsg: { ko: '✅ 실족방지망 설치 완료', en: '✅ Fall net installed' } },

  { id: 'install_formwork',   label: { ko: '거푸집 설치 (E홀드)', en: 'Install Formwork (hold E)' },  duration: 4.0,
    hazardEffect: { zone_foundation: { collapse: -0.4 } }, motion: 'drill',
    completeMsg: { ko: '✅ 거푸집 설치 완료 — 타설 준비', en: '✅ Formwork installed — ready to pour' },
    _postComplete: (markerId) => {
      // 거푸집 3D 생성 + 타설 act 등록
      if (typeof registerFormwork === 'function') {
        registerFormwork({ center: { x: 0, y: 0, z: -8 }, width: 3.5, depth: 3.5, height: 1.2 });
      }
      if (typeof POUR_ACT_DEF !== 'undefined' && typeof defineAct === 'function') {
        defineAct(POUR_ACT_DEF);
      }
    } },

  { id: 'inspect_sling',      label: { ko: '줄걸이 점검 (E홀드)', en: 'Inspect Sling (hold E)' },     duration: 3.0,
    hazardEffect: { zone_lifting: { drop: -0.5 } }, motion: 'inspect',
    completeMsg: { ko: '✅ 줄걸이 점검 완료', en: '✅ Sling inspected' } },

  { id: 'position_signal',    label: { ko: '신호수 배치 (E홀드)', en: 'Position Signal (hold E)' },   duration: 2.5,
    hazardEffect: { zone_lifting: { swing: -0.4, crush: -0.3 } }, motion: 'signal',
    completeMsg: { ko: '✅ 신호수 배치 완료', en: '✅ Signal person positioned' } },

  { id: 'attach_harness',     label: { ko: '안전대 체결 (E홀드)', en: 'Attach Harness (hold E)' },    duration: 2.0,
    hazardEffect: { zone_lifting: { swing: -0.3 } }, motion: 'inspect',
    completeMsg: { ko: '✅ 안전대 체결 완료', en: '✅ Harness attached' } },

  { id: 'signal_lift',        label: { ko: '인양 신호 (E홀드)', en: 'Signal Lift (hold E)' },         duration: 2.0,
    hazardEffect: {}, motion: 'signal',
    completeMsg: { ko: '✅ 인양 신호 완료', en: '✅ Lift signal given' } },

  { id: 'inspect_scaffold',   label: { ko: '비계 점검 (E홀드)', en: 'Inspect Scaffold (hold E)' },    duration: 3.0,
    hazardEffect: { zone_envelope: { scaffold_fall: -0.4 } }, motion: 'inspect',
    completeMsg: { ko: '✅ 비계 점검 완료', en: '✅ Scaffold inspected' } },

  { id: 'attach_lifeline',    label: { ko: '안전대 줄 부착 (E홀드)', en: 'Attach Lifeline (hold E)' }, duration: 2.5,
    hazardEffect: { zone_envelope: { scaffold_fall: -0.3 } }, motion: 'inspect',
    completeMsg: { ko: '✅ 안전대 부착 완료', en: '✅ Lifeline attached' } },

  { id: 'install_panel',      label: { ko: '패널 설치 (E홀드)', en: 'Install Panel (hold E)' },       duration: 4.0,
    hazardEffect: { zone_envelope: { panel_drop: -0.4 } }, motion: 'drill',
    completeMsg: { ko: '✅ 패널 설치 완료', en: '✅ Panel installed' } },

  { id: 'apply_loto',         label: { ko: 'LOTO 잠금 (E홀드)', en: 'Apply LOTO (hold E)' },         duration: 2.5,
    hazardEffect: { zone_mep: { electric: -0.5 } }, motion: 'inspect',
    completeMsg: { ko: '✅ LOTO 완료', en: '✅ LOTO applied' } },

  { id: 'check_gas',          label: { ko: '가스 점검 (E홀드)', en: 'Check Gas (hold E)' },           duration: 3.0,
    hazardEffect: { zone_mep: { gas_leak: -0.5 } }, motion: 'survey',
    completeMsg: { ko: '✅ 가스 점검 완료', en: '✅ Gas check complete' } },

  { id: 'start_vent',         label: { ko: '환기 가동 (E홀드)', en: 'Start Ventilation (hold E)' },   duration: 2.0,
    hazardEffect: { zone_mep: { gas_leak: -0.3, fire: -0.2 } }, motion: 'inspect',
    completeMsg: { ko: '✅ 환기 가동 완료', en: '✅ Ventilation started' } },

  { id: 'place_extinguisher', label: { ko: '소화기 배치 (E홀드)', en: 'Place Extinguisher (hold E)' }, duration: 2.0,
    hazardEffect: { zone_mep: { fire: -0.35 } }, motion: 'place',
    completeMsg: { ko: '✅ 소화기 배치 완료', en: '✅ Extinguisher placed' } },
];

// ── 헬퍼 ──────────────────────────────────────────────────────
function _lang(obj) {
  const lang = (typeof currentLang !== 'undefined') ? currentLang : 'ko';
  return obj[lang] || obj.ko;
}

// ── 초기화 ────────────────────────────────────────────────────
function initPhaseV4() {
  // v4 전용 URL 파라미터: ?mode=v4 또는 ?phase=1~5
  const params  = new URLSearchParams(location.search);
  const mode    = params.get('mode');
  const phasePm = parseInt(params.get('phase') || '0', 10);

  // v4 모드가 아니면 기존 시스템에 위임
  if (mode !== 'v4') return;

  // 행위 등록
  if (typeof clearActDefs === 'function') clearActDefs();
  _V4_ACTS.forEach(a => {
    if (typeof defineAct === 'function') defineAct(a);
  });

  PHASE_V4.current = (phasePm >= 1 && phasePm <= 5) ? phasePm : 1;
  PHASE_V4._started = true;

  _startPhase(PHASE_V4.current);
}

function _startPhase(phaseId) {
  const def = PHASE_V4_DEFS.find(d => d.id === phaseId);
  if (!def) return;

  // 이전 마커 제거
  if (typeof clearMarkers === 'function') clearMarkers();

  // 위험 구역 등록
  if (def.hazardZone && typeof registerHazardZone === 'function') {
    registerHazardZone({
      id:           def.hazardZone.id,
      center:       def.hazardZone.center,
      radius:       def.hazardZone.radius,
      hazards:      def.hazardZone.hazards,
      checkInterval: 5,
      accidentMap:  def.hazardZone.accidentMap,
    });
  }

  // 행위 마커 배치
  if (typeof registerMarker === 'function') {
    def.markers.forEach(m => registerMarker(m));
  }

  // 자재 스폰 (MAT_DEFS 에 정의된 것만)
  if (typeof spawnMaterial === 'function') {
    def.materials.forEach(m => {
      if (typeof MAT_DEFS !== 'undefined' && MAT_DEFS[m.defId]) {
        spawnMaterial(m.defId, m.position, m.quantity);
      }
    });
  }

  // 페이즈 인트로 오버레이
  _showPhaseIntro(def);
}

// ── 매 프레임 ─────────────────────────────────────────────────
function tickPhaseV4(delta) {
  if (!PHASE_V4._started) return;

  const def = PHASE_V4_DEFS.find(d => d.id === PHASE_V4.current);
  if (!def) return;

  // E키 — 근접 마커의 행위 자동 시작
  if (PLAYER.keys['KeyE'] && typeof ACT_STATE !== 'undefined' && !ACT_STATE.active) {
    const marker = typeof getNearestPendingMarker === 'function'
      ? getNearestPendingMarker(PLAYER.worldPos, 2.8)
      : null;
    if (marker) {
      if (typeof actStart === 'function') {
        actStart(marker.actId, marker.id);
      }
    }
  }

  // 완료 조건 체크
  const allDone = def.completion.every(mid => {
    if (typeof MARKERS === 'undefined') return false;
    const m = MARKERS.find(x => x.id === mid);
    return m && m.state === 'done';
  });

  if (allDone && PHASE_V4.current < 5) {
    _advancePhase();
  } else if (allDone && PHASE_V4.current === 5) {
    _completeAll();
  }
}

// ── E키 마커 완료 콜백 ────────────────────────────────────────
// act.js _actComplete 에서 onComplete({ markerId }) 호출 시 이 함수로 연결
function onV4ActComplete({ markerId }) {
  if (!markerId) return;
  if (typeof completeMarker === 'function') completeMarker(markerId);

  // HUD 알림
  const def = PHASE_V4_DEFS.find(d => d.id === PHASE_V4.current);
  if (!def) return;
  const remaining = def.completion.filter(mid => {
    if (typeof MARKERS === 'undefined') return true;
    const m = MARKERS.find(x => x.id === mid);
    return !m || m.state !== 'done';
  }).length;

  if (remaining > 0 && typeof showActionNotif === 'function') {
    showActionNotif(
      _lang({ ko: `남은 작업: ${remaining}개`, en: `${remaining} tasks remaining` }),
      1800
    );
  }
}

// act.js 의 onComplete 가 호출하도록 _V4_ACTS 에 콜백 주입
_V4_ACTS.forEach(a => {
  const postFn = a._postComplete;
  a.onComplete = (ctx) => {
    onV4ActComplete(ctx);
    if (typeof postFn === 'function') postFn(ctx.markerId);
  };
});

// ── 페이즈 전환 ───────────────────────────────────────────────
function _advancePhase() {
  PHASE_V4.current += 1;
  _showPhaseTransition(PHASE_V4.current);
  setTimeout(() => _startPhase(PHASE_V4.current), 2800);
}

function _completeAll() {
  PHASE_V4._started = false;
  if (typeof clearMarkers === 'function') clearMarkers();
  if (typeof showActionNotif === 'function') {
    showActionNotif(
      _lang({ ko: '🎉 튜토리얼 완료! 오픈 월드로 진입합니다.', en: '🎉 Tutorial complete! Entering open world.' }),
      4000
    );
  }
  setTimeout(() => {
    // 오픈 월드 URL 로 리다이렉트 (추후 구현)
    // location.href = 'game.html?mode=open';
    console.log('[phase_v4] 튜토리얼 완료 → 오픈 월드 진입');
  }, 4000);
}

// ── 인트로 오버레이 ───────────────────────────────────────────
function _showPhaseIntro(def) {
  _removeOverlay();
  const el = document.createElement('div');
  el.id = 'pv4-intro';
  el.style.cssText = [
    'position:fixed', 'top:50%', 'left:50%', 'transform:translate(-50%,-50%)',
    'background:rgba(0,0,0,0.82)', 'color:#fff', 'padding:24px 32px',
    'border-radius:10px', 'z-index:5000', 'max-width:420px', 'text-align:center',
    'font-family:monospace', 'pointer-events:none', 'border:1px solid rgba(255,170,0,0.4)',
  ].join(';');
  el.innerHTML = `
    <div style="font-size:18px;font-weight:bold;color:#FFAA00;margin-bottom:12px">${_lang(def.label)}</div>
    <div style="font-size:13px;line-height:1.7;white-space:pre-line;opacity:0.88">${_lang(def.intro)}</div>
    <div style="margin-top:14px;font-size:11px;opacity:0.55">마커(노란 링)에 접근 후 E 홀드</div>
  `;
  document.body.appendChild(el);
  PHASE_V4._overlay = el;
  setTimeout(_removeOverlay, 6000);
}

function _showPhaseTransition(nextId) {
  _removeOverlay();
  const def = PHASE_V4_DEFS.find(d => d.id === nextId);
  if (!def) return;
  const el = document.createElement('div');
  el.id = 'pv4-intro';
  el.style.cssText = [
    'position:fixed', 'top:0', 'left:0', 'width:100%', 'height:100%',
    'background:rgba(0,0,0,0.65)', 'color:#fff', 'display:flex',
    'align-items:center', 'justify-content:center', 'z-index:5000',
    'font-family:monospace', 'pointer-events:none', 'flex-direction:column',
  ].join(';');
  el.innerHTML = `
    <div style="font-size:13px;opacity:0.6;letter-spacing:2px;text-transform:uppercase">PHASE ${nextId}</div>
    <div style="font-size:28px;font-weight:bold;color:#FFAA00;margin-top:8px">${_lang(def.label)}</div>
  `;
  document.body.appendChild(el);
  PHASE_V4._overlay = el;
  setTimeout(_removeOverlay, 2800);
}

function _removeOverlay() {
  if (PHASE_V4._overlay && PHASE_V4._overlay.parentNode) {
    PHASE_V4._overlay.parentNode.removeChild(PHASE_V4._overlay);
  }
  PHASE_V4._overlay = null;
}

// ── HUD 근접 마커 힌트 ────────────────────────────────────────
// updatePlayer 루프에서 호출 — 마커 근접 시 화면 하단 E키 힌트
function getPhaseV4Hint() {
  if (!PHASE_V4._started) return null;
  if (typeof getNearestPendingMarker !== 'function') return null;
  const m = getNearestPendingMarker(PLAYER.worldPos, 2.8);
  if (!m) return null;
  const actDef = (typeof ACT_DEFS !== 'undefined') ? ACT_DEFS[m.actId] : null;
  if (!actDef) return null;
  return `[E] ${_lang(actDef.label)}`;
}

window.PHASE_V4       = PHASE_V4;
window.initPhaseV4    = initPhaseV4;
window.tickPhaseV4    = tickPhaseV4;
window.getPhaseV4Hint = getPhaseV4Hint;
window.onV4ActComplete = onV4ActComplete;
