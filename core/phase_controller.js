// v3 페이즈 컨트롤러 — 한 부지 순차 시공 (튜토리얼)
// 굴착(1) → 기초(2) → 골조(3) → 외장(4) → 마감(5)
//
// 단일 작업반장이 5 페이즈를 순차 진행. 각 페이즈는:
//   - 활성 task seed 분리 (현재 페이즈 작업만 활성)
//   - NPC 풀 교체 (해당 페이즈 직종만 spawn) — 실제 mesh add/remove 는 #47~48
//   - 완료 조건 평가 → 충족 시 다음 페이즈 진입 패널 표시
//   - 인스펙터 flag 미해결이면 진입 차단 (안전 게이트)
//
// 의존: GAME (engine.js) · TASK_TYPES (tasks.js) · enqueueScenarioTasks (tasks.js)

(function () {
  'use strict';
  if (typeof window === 'undefined') return;

  const PHASES = [
    {
      id: 1, key: 'excavation',
      label: { ko: '굴착·흙막이', en: 'Excavation & Shoring', vi: 'Đào & Chống', ar: 'الحفر والدعم' },
      taskSeedScenario: 'excavation',
      npcTradePool: ['signal', 'shoring', 'survey'],
      // 완료: 굴착·흙막이·신호 task 의 80% 가 progress >= 0.95
      completion: { minProgressRatio: 0.8, requiredTaskTypes: ['excavate', 'shoring', 'guardrail'] },
    },
    {
      id: 2, key: 'foundation',
      label: { ko: '기초공사', en: 'Foundation', vi: 'Móng', ar: 'الأساسات' },
      taskSeedScenario: 'foundation',
      npcTradePool: ['rebar', 'formwork', 'pour', 'inspect'],
      completion: { minProgressRatio: 0.8, requiredTaskTypes: ['rebar', 'formwork', 'found_pour'] },
    },
    {
      id: 3, key: 'lifting',
      label: { ko: '골조 양중 (RC 5층)', en: 'RC Frame Lifting', vi: 'Khung RC', ar: 'الهيكل الخرساني' },
      taskSeedScenario: 'lifting',
      npcTradePool: ['lifting', 'signal', 'rebar', 'formwork', 'pour'],
      // 5층 사이클 = RC_LOOP. completedFloors >= targetFloors 시 완료
      completion: { rcLoopComplete: true },
    },
    {
      id: 4, key: 'envelope',
      label: { ko: '외장공사', en: 'Envelope', vi: 'Vỏ ngoài', ar: 'الواجهة' },
      taskSeedScenario: 'envelope',
      npcTradePool: ['scaffold', 'panel', 'glass', 'lifting'],
      completion: { minProgressRatio: 0.8, requiredTaskTypes: ['scaffold', 'panel', 'glass'] },
    },
    {
      id: 5, key: 'mep_finish',
      label: { ko: '설비·마감', en: 'MEP & Finishing', vi: 'M&E & Hoàn thiện', ar: 'التركيب والتشطيب' },
      taskSeedScenario: 'mep_finish',
      npcTradePool: ['electric', 'plumb', 'vent', 'paint'],
      completion: { minProgressRatio: 0.85, requiredTaskTypes: ['electric', 'plumb', 'paint'] },
    },
  ];

  const PHASE_CONTROLLER = {
    PHASES,
    _currentIdx: 0,           // 0~4 → PHASES[idx]
    _enabled: false,          // 통합 모드(?s=unified) 일 때만 활성
    _completedAt: [],         // 각 페이즈 완료 시각 (game elapsed)
    _onChange: [],            // 페이즈 변경 콜백 (HUD/scene transition 등 구독)
    _lastTickT: 0,
    _sceneGroups: {},         // { phaseId: THREE.Group } — teardown 추적용
    _interactSnapshot: 0,     // 페이즈 시작 직전 GAME.interactables.length (그 이후 추가분 = 이 페이즈 소유)
    _hazardSnapshot:   0,     // 같은 컨셉 (GAME.hazards)
  };
  window.PHASE_CONTROLLER = PHASE_CONTROLLER;

  // ── Public API ────────────────────────────────────────────────
  PHASE_CONTROLLER.enable = function () {
    PHASE_CONTROLLER._enabled = true;
    PHASE_CONTROLLER._currentIdx = 0;
    PHASE_CONTROLLER._completedAt = [];
    _buildCurrentPhaseScene();
    _seedCurrentPhaseTasks();
  };

  PHASE_CONTROLLER.disable = function () {
    PHASE_CONTROLLER._enabled = false;
  };

  PHASE_CONTROLLER.isEnabled = function () { return PHASE_CONTROLLER._enabled; };
  PHASE_CONTROLLER.current   = function () { return PHASE_CONTROLLER._enabled ? PHASES[PHASE_CONTROLLER._currentIdx] : null; };
  PHASE_CONTROLLER.currentId = function () { return PHASE_CONTROLLER._enabled ? PHASES[PHASE_CONTROLLER._currentIdx].id : 0; };
  PHASE_CONTROLLER.allPhases = function () { return PHASES.slice(); };

  // 0~1 — 현재 페이즈 진척률 (완료 조건 충족도)
  PHASE_CONTROLLER.progress = function () {
    if (!PHASE_CONTROLLER._enabled) return 0;
    const ph = PHASES[PHASE_CONTROLLER._currentIdx];
    return _evaluateProgress(ph);
  };

  // 다음 페이즈 진입 가능?
  PHASE_CONTROLLER.canAdvance = function () {
    if (!PHASE_CONTROLLER._enabled) return false;
    if (PHASE_CONTROLLER._currentIdx >= PHASES.length - 1) return false; // 마지막
    if (PHASE_CONTROLLER.progress() < 1.0) return false;
    if (_hasOpenInspectorFlags()) return false;
    return true;
  };

  // 다음 페이즈 진입 사유 (block 시 토스트용)
  PHASE_CONTROLLER.advanceBlocker = function () {
    if (!PHASE_CONTROLLER._enabled) return 'disabled';
    if (PHASE_CONTROLLER._currentIdx >= PHASES.length - 1) return 'final';
    if (PHASE_CONTROLLER.progress() < 1.0) return 'incomplete';
    if (_hasOpenInspectorFlags()) return 'inspector_flag';
    return null;
  };

  // 다음 페이즈로 이동 (강제). canAdvance 체크 후 호출 권장.
  PHASE_CONTROLLER.advance = function (force) {
    if (!PHASE_CONTROLLER._enabled) return false;
    if (!force && !PHASE_CONTROLLER.canAdvance()) return false;
    const fromIdx = PHASE_CONTROLLER._currentIdx;
    PHASE_CONTROLLER._completedAt[fromIdx] = (GAME.clock && GAME.clock.elapsedTime) || 0;
    if (fromIdx >= PHASES.length - 1) {
      // 모든 페이즈 클리어 = 튜토리얼 완주
      _notifyChange(fromIdx, fromIdx, true);
      return true;
    }
    // 이전 페이즈 시각 정리 (선택: 이전 mesh 유지하려면 _teardownPhaseScene 주석 처리)
    _teardownPhaseScene(PHASES[fromIdx]);
    PHASE_CONTROLLER._currentIdx++;
    _buildCurrentPhaseScene();
    _seedCurrentPhaseTasks();
    _notifyChange(fromIdx, PHASE_CONTROLLER._currentIdx, false);
    return true;
  };

  // 변경 구독 (HUD, scene transition 모듈이 사용)
  PHASE_CONTROLLER.onChange = function (cb) {
    if (typeof cb === 'function') PHASE_CONTROLLER._onChange.push(cb);
  };

  // 매 프레임 (engine _loop 에서 호출). 진행 평가 + 자동 전환은 하지 않음 (수동 advance).
  PHASE_CONTROLLER.tick = function (elapsed) {
    if (!PHASE_CONTROLLER._enabled) return;
    PHASE_CONTROLLER._lastTickT = elapsed;
  };

  // 디버그
  PHASE_CONTROLLER.dump = function () {
    return {
      enabled: PHASE_CONTROLLER._enabled,
      currentId: PHASE_CONTROLLER.currentId(),
      progress: PHASE_CONTROLLER.progress(),
      blocker: PHASE_CONTROLLER.advanceBlocker(),
      canAdvance: PHASE_CONTROLLER.canAdvance(),
      completedAt: PHASE_CONTROLLER._completedAt.slice(),
    };
  };

  // ── 내부 ──────────────────────────────────────────────────────
  function _seedCurrentPhaseTasks() {
    const ph = PHASES[PHASE_CONTROLLER._currentIdx];
    if (!ph) return;
    // 기존 활성 작업 비우기 (페이즈 전환 시 이전 페이즈 task 제거)
    if (typeof GAME !== 'undefined' && GAME.activeTasks) {
      GAME.activeTasks.length = 0;
      if (typeof window.clearInterferenceLines === 'function') {
        try { window.clearInterferenceLines(); } catch (e) {}
      }
    }
    if (typeof window.enqueueScenarioTasks === 'function') {
      try { window.enqueueScenarioTasks(ph.taskSeedScenario); } catch (e) {}
    }
    // 골조 페이즈 = RC_LOOP 동적 enqueue
    if (ph.key === 'lifting' && typeof window.initRcLoop === 'function') {
      try { window.initRcLoop(); } catch (e) {}
    }
  }

  // ── 베이스라인 (sky / ground / lighting / colliders) 보장 ─────
  let _baselineDone = false;
  function _ensureUnifiedBaseline() {
    if (_baselineDone) return;
    if (typeof THREE === 'undefined' || !GAME.scene) return;

    if (!Array.isArray(GAME.colliders)) GAME.colliders = [];

    // 하늘 + 안개
    if (!GAME.scene.background) {
      GAME.scene.background = new THREE.Color(0x8AB2D0);
    }
    if (!GAME.scene.fog) {
      GAME.scene.fog = new THREE.FogExp2(0x8AB2D0, 0.006);
    }

    // 라이팅 — 최소 hemi + ambient + directional
    GAME.scene.add(new THREE.HemisphereLight(0xB8D4F0, 0x8B7355, 0.6));
    GAME.scene.add(new THREE.AmbientLight(0xffffff, 0.18));
    const sun = new THREE.DirectionalLight(0xfff0e0, 0.85);
    sun.position.set(20, 30, 15);
    GAME.scene.add(sun);

    // 지면 — 50x50 평지 (페이즈별 mesh 가 그 위에 덮음)
    const groundGeo = new THREE.PlaneGeometry(80, 80);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0xA89878 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.name = 'unified_baseline_ground';
    GAME.scene.add(ground);

    _baselineDone = true;
  }

  // ── Scene build / teardown ────────────────────────────────────
  const _BUILD_FN_BY_KEY = {
    excavation: 'buildExcavationScene',
    foundation: 'buildFoundationScene',
    lifting:    'buildLiftingScene',
    envelope:   'buildEnvelopeScene',
    mep_finish: 'buildMepFinishScene',
  };
  const _HAZARD_FN_BY_KEY = {
    excavation: 'registerExcavationHazards',
    foundation: 'registerFoundationHazards',
    lifting:    'registerLiftingHazards',
    envelope:   'registerEnvelopeHazards',
    mep_finish: 'registerMepFinishHazards',
  };

  function _buildCurrentPhaseScene() {
    if (typeof GAME === 'undefined' || !GAME.scene) return;
    const ph = PHASES[PHASE_CONTROLLER._currentIdx];
    if (!ph) return;

    // v3 — 모든 scenario scene 이 unified 모드에선 baseline (sky/ground/lighting/colliders)
    // 가 이미 있다고 가정하고 if (!_unified) 블록을 스킵함. v2 는 lifting baseline 으로 건졌지만
    // v3 는 페이즈마다 build 하므로 baseline 을 우리가 보장해야 함.
    _ensureUnifiedBaseline();

    // scene 자식 변화 추적 → 새로 추가된 mesh 만 phase group 으로 묶기
    const sceneChildSnapshot = GAME.scene.children.length;
    PHASE_CONTROLLER._interactSnapshot = (GAME.interactables && GAME.interactables.length) || 0;
    PHASE_CONTROLLER._hazardSnapshot   = (GAME.hazards && GAME.hazards.length) || 0;

    // 1) build scene
    const buildFn = window[_BUILD_FN_BY_KEY[ph.key]];
    if (typeof buildFn === 'function') {
      try { buildFn(); }
      catch (e) { console.warn('[phase build]', ph.key, e.message); }
    } else {
      console.warn('[phase build] no fn for', ph.key);
    }

    // 2) register hazards
    const hazFn = window[_HAZARD_FN_BY_KEY[ph.key]];
    if (typeof hazFn === 'function') {
      try { hazFn(); } catch (e) { console.warn('[phase hazards]', ph.key, e.message); }
    }

    // 3) 새로 추가된 mesh 들을 group 에 묶기 (teardown 추적용)
    const newChildren = GAME.scene.children.slice(sceneChildSnapshot);
    if (newChildren.length > 0 && typeof THREE !== 'undefined') {
      const grp = new THREE.Group();
      grp.name = `phase_${ph.id}_${ph.key}`;
      newChildren.forEach(c => grp.add(c)); // scene 에서 자동 제거됨
      GAME.scene.add(grp);
      PHASE_CONTROLLER._sceneGroups[ph.id] = grp;
    }

    // 4) NPC spawn — 페이즈에 맞는 직종만
    if (typeof window.spawnNpcsForScenario === 'function') {
      try {
        const spawned = window.spawnNpcsForScenario(ph.taskSeedScenario);
        if (spawned && spawned.length) {
          // phase tagging — teardown 시 제거 대상 식별
          spawned.forEach(npc => { npc._phaseId = ph.id; });
        }
      } catch (e) { console.warn('[phase npc spawn]', ph.key, e.message); }
    }
  }

  function _teardownPhaseScene(ph) {
    if (!ph) return;
    if (typeof GAME === 'undefined' || !GAME.scene) return;

    // 0) NPC despawn — 이 페이즈에 spawn 된 NPC 만 제거
    if (typeof window.despawnNpcs === 'function' && GAME.npcs) {
      const phaseNpcs = GAME.npcs.filter(n => n._phaseId === ph.id);
      if (phaseNpcs.length) {
        try { window.despawnNpcs(phaseNpcs); } catch (e) { console.warn('[phase npc despawn]', e.message); }
      }
    }

    // scene group 제거 + dispose
    const grp = PHASE_CONTROLLER._sceneGroups[ph.id];
    if (grp) {
      GAME.scene.remove(grp);
      grp.traverse(o => {
        if (o.geometry) { try { o.geometry.dispose(); } catch (e) {} }
        if (o.material) {
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach(m => {
            if (m && m.map)         { try { m.map.dispose(); }         catch (e) {} }
            if (m && m.normalMap)   { try { m.normalMap.dispose(); }   catch (e) {} }
            if (m && m.dispose)     { try { m.dispose(); }             catch (e) {} }
          });
        }
      });
      delete PHASE_CONTROLLER._sceneGroups[ph.id];
    }

    // 페이즈 시작 후 추가된 interactables / hazards 정리 (snapshot 시점 길이로 잘라냄)
    if (GAME.interactables) {
      // 뒤에서 추가된 항목 중 mesh 가 사라진 것은 자동으로 useless 해짐.
      // 안전하게 mesh 가 scene tree 에 없는 것만 필터링.
      GAME.interactables = GAME.interactables.filter(item => {
        if (!item.mesh) return true;
        let cur = item.mesh;
        while (cur) {
          if (cur === GAME.scene) return true;
          cur = cur.parent;
        }
        return false;
      });
    }
    if (GAME.hazards) {
      GAME.hazards = GAME.hazards.filter(h => {
        if (!h || !h.mesh) return true;
        let cur = h.mesh;
        while (cur) {
          if (cur === GAME.scene) return true;
          cur = cur.parent;
        }
        return false;
      });
    }
  }

  // 각 페이즈별 *_STATE 플래그로 진척도 계산
  const _STATE_PROGRESS = {
    excavation: function () {
      var s = window.EXCAV_STATE;
      if (!s) return 0;
      var flags = [s.planWritten, s.surveyDone, s.shoringInstalled, s.railingInstalled, s.signalAssigned];
      return flags.filter(Boolean).length / flags.length;
    },
    foundation: function () {
      var s = window.FOUND_STATE;
      if (!s) return 0;
      var flags = [s.planWritten, s.rebarCapsOk, s.formworkOk, s.pumpOk, s.pourOrderAgreed];
      return flags.filter(Boolean).length / flags.length;
    },
    envelope: function () {
      var s = window.ENV_STATE;
      if (!s) return 0;
      var flags = [s.planWritten, s.scaffoldInspected, s.lifelineInstalled, s.panelSecured, s.signalAssigned];
      return flags.filter(Boolean).length / flags.length;
    },
    mep_finish: function () {
      var s = window.MEP_STATE;
      if (!s) return 0;
      var flags = [s.planWritten, s.lotoApplied, s.gasChecked, s.ventActivated, s.extVerified];
      return flags.filter(Boolean).length / flags.length;
    },
  };

  function _evaluateProgress(ph) {
    if (!ph || !ph.completion) return 0;

    // RC_LOOP 완료 (페이즈 3 골조)
    if (ph.completion.rcLoopComplete) {
      const target = (GAME.state && GAME.state.targetFloors) || 5;
      const done   = (GAME.state && GAME.state.completedFloors) || 0;
      return Math.min(1, done / target);
    }

    // *_STATE 플래그 기반 (페이즈 1·2·4·5)
    const stateEval = _STATE_PROGRESS[ph.key];
    if (stateEval) {
      try { return stateEval(); } catch (e) { return 0; }
    }

    return 0;
  }

  // 인스펙터 적발 대상 flag (task.flags) 가 하나라도 활성이면 차단
  function _hasOpenInspectorFlags() {
    if (typeof GAME === 'undefined' || !GAME.activeTasks) return false;
    const FLAG_KEYS = ['dismantling', 'unchecked', 'organic', 'premature'];
    return GAME.activeTasks.some(t => {
      if (!t.flags) return false;
      return FLAG_KEYS.some(k => !!t.flags[k]);
    });
  }

  function _notifyChange(fromIdx, toIdx, isFinal) {
    // 새 페이즈 시작 시 GAME.state.phase 를 1 로 리셋 — 명령 풀·인터랙션이 새 시나리오 기준으로 시작
    if (!isFinal && typeof GAME !== 'undefined' && GAME.state) {
      GAME.state.phase = 1;
    }
    PHASE_CONTROLLER._onChange.forEach(cb => {
      try { cb({ fromIdx, toIdx, isFinal, fromPhase: PHASES[fromIdx], toPhase: PHASES[toIdx] }); }
      catch (e) { console.warn('[PHASE_CONTROLLER onChange]', e.message); }
    });
  }

  // ── 디버그 콘솔 통합 ──────────────────────────────────────────
  // debug_console.js 가 phase_controller.js 보다 늦게 로드되므로 DOMContentLoaded 에 defer.
  function _registerDebugHooks() {
    if (typeof window.__bulsa !== 'object' || !window.__bulsa) return;
    window.__bulsa.phase = function (n) {
      // 기존 phase(n) 헬퍼 의미 보존: n 인자 없으면 현재 상태, 있으면 그 페이즈로 강제 이동
      if (n === undefined) return PHASE_CONTROLLER.dump();
      if (typeof n !== 'number' || n < 1 || n > 5) return 'usage: __bulsa.phase(1~5)';
      PHASE_CONTROLLER._currentIdx = n - 1;
      _seedCurrentPhaseTasks();
      _notifyChange(n - 1, n - 1, false);
      return PHASE_CONTROLLER.dump();
    };
    window.__bulsa.advance = function () {
      const blocker = PHASE_CONTROLLER.advanceBlocker();
      if (blocker) return `blocked: ${blocker}`;
      PHASE_CONTROLLER.advance();
      return PHASE_CONTROLLER.dump();
    };
    // v3 — 검증용 강제 advance (canAdvance 체크 무시 + 진행 100% 가정)
    window.__bulsa.fastForward = function (n) {
      const steps = (typeof n === 'number' && n > 0) ? Math.min(n, PHASES.length) : PHASES.length;
      const log = [];
      for (let i = 0; i < steps; i++) {
        if (PHASE_CONTROLLER._currentIdx >= PHASES.length - 1) {
          log.push('reached final');
          break;
        }
        const cur = PHASE_CONTROLLER.current();
        log.push(`force-advance from ${cur && cur.key}`);
        PHASE_CONTROLLER.advance(true);  // force=true
      }
      return { log, dump: PHASE_CONTROLLER.dump() };
    };
  }

  // 즉시 시도 (이미 __bulsa 가 있을 수도) + DOMContentLoaded 백업 (debug_console.js 늦게 로드)
  _registerDebugHooks();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _registerDebugHooks, { once: true });
  } else {
    Promise.resolve().then(_registerDebugHooks);
  }
})();
