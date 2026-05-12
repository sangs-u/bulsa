// v2.0 디버그 콘솔 헬퍼 — `__bulsa.*` 로 작업 큐 / 간섭 검사 + 강제 시연
//
// 사용 예 (브라우저 콘솔):
//   __bulsa.tasks()                  → 활성 작업 요약
//   __bulsa.conflicts()              → 현재 충돌 목록
//   __bulsa.addTask('paint',{x:0,z:5,flags:{organic:true}})  → 임의 작업 추가
//   __bulsa.removeAll()              → 모든 작업 비우기
//   __bulsa.simulateAccident('worker_crush') → 사고 강제 트리거
//   __bulsa.windSet(12)              → 풍속 강제 변경 (스윙 드롭 평가용)
//
// 게임 운영자/개발자용. 일반 사용자 흐름과 무관.

(function () {
  const D = {};

  D.tasks = function () {
    const arr = (typeof getActiveTasks === 'function') ? getActiveTasks() : (GAME.activeTasks || []);
    return arr.map(t => ({
      id:    t.id,
      type:  t.type,
      floor: t.floor,
      loc:   t.loc && `(${t.loc.x.toFixed(1)},${t.loc.z.toFixed(1)})`,
      flags: t.flags && Object.keys(t.flags).filter(k => t.flags[k]).join(','),
    }));
  };

  D.conflicts = function () {
    if (typeof evaluateInterference !== 'function') return [];
    return evaluateInterference().map(c => ({
      a:     `${c.a.type}#${c.a.id.slice(-4)}`,
      b:     `${c.b.type}#${c.b.id.slice(-4)}`,
      cond:  c.rule.cond,
      prob:  c.rule.prob,
      will:  c.rule.accident,
    }));
  };

  D.addTask = function (type, opts) {
    if (typeof addTask !== 'function') return null;
    opts = opts || {};
    const spec = { type, floor: opts.floor || 1 };
    if (opts.x != null || opts.z != null) spec.loc = { x: opts.x || 0, z: opts.z || 0 };
    if (opts.flags) spec.flags = opts.flags;
    return addTask(spec);
  };

  D.removeAll = function () {
    if (!GAME.activeTasks) return 0;
    const n = GAME.activeTasks.length;
    GAME.activeTasks.length = 0;
    if (typeof clearInterferenceLines === 'function') clearInterferenceLines();
    return n;
  };

  D.simulateAccident = function (accidentId) {
    if (typeof triggerAccident === 'function') triggerAccident(accidentId);
  };

  D.windSet = function (v) {
    GAME.state = GAME.state || {};
    GAME.state.windSpeed = +v || 0;
    return GAME.state.windSpeed;
  };

  D.history = function () {
    return (window._instructionHistory || []).slice(0, 10);
  };

  D.zone = function (name) {
    if (!GAME.unifiedZones || !GAME.unifiedZones[name]) {
      return { error: 'unknown zone (excavation/foundation/envelope/mep_finish)' };
    }
    const z = GAME.unifiedZones[name];
    if (!PLAYER || !PLAYER.position) return { error: 'PLAYER not ready' };
    PLAYER.position.set(z.ox, PLAYER.position.y, z.oz);
    return { teleported: name, x: z.ox, z: z.oz };
  };

  D.help = function () {
    return [
      'tasks()                  — 활성 작업 요약',
      'conflicts()              — 현재 충돌',
      "addTask(type,{x,z,floor,flags}) — 임의 작업 추가",
      'removeAll()              — 모든 작업 제거',
      "simulateAccident(id)     — 사고 강제",
      'windSet(mps)             — 풍속 설정',
      'history()                — 최근 명령 10개',
      "zone(name)               — 통합 모드 영역 텔레포트 (excavation/foundation/envelope/mep_finish)",
    ];
  };

  window.__bulsa = D;
})();
