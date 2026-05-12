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
  };
  window.PHASE_CONTROLLER = PHASE_CONTROLLER;

  // ── Public API ────────────────────────────────────────────────
  PHASE_CONTROLLER.enable = function () {
    PHASE_CONTROLLER._enabled = true;
    PHASE_CONTROLLER._currentIdx = 0;
    PHASE_CONTROLLER._completedAt = [];
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
    PHASE_CONTROLLER._currentIdx++;
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

  function _evaluateProgress(ph) {
    if (!ph || !ph.completion) return 0;

    // RC_LOOP 완료 (페이즈 3 골조)
    if (ph.completion.rcLoopComplete) {
      const target = (GAME.state && GAME.state.targetFloors) || 5;
      const done   = (GAME.state && GAME.state.completedFloors) || 0;
      return Math.min(1, done / target);
    }

    // 일반 페이즈: 활성 task 중 required 타입 진척도 평균
    const tasks = (typeof window.getActiveTasks === 'function') ? window.getActiveTasks() : [];
    if (!tasks.length) return 0;

    const reqTypes = ph.completion.requiredTaskTypes || [];
    const relevant = reqTypes.length
      ? tasks.filter(t => reqTypes.indexOf(t.type) >= 0)
      : tasks;
    if (!relevant.length) return 0;

    const totalProgress = relevant.reduce((s, t) => s + (t.progress || 0), 0);
    const avgProgress   = totalProgress / relevant.length;
    const ratio = ph.completion.minProgressRatio || 0.8;
    // 평균 진척도 / 임계비율 → 1.0 도달 시 완료
    return Math.min(1, avgProgress / ratio);
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
    PHASE_CONTROLLER._onChange.forEach(cb => {
      try { cb({ fromIdx, toIdx, isFinal, fromPhase: PHASES[fromIdx], toPhase: PHASES[toIdx] }); }
      catch (e) { console.warn('[PHASE_CONTROLLER onChange]', e.message); }
    });
  }

  // ── 디버그 콘솔 통합 ──────────────────────────────────────────
  if (typeof window.__bulsa === 'object' && window.__bulsa) {
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
  }
})();
