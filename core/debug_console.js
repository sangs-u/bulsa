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
    let arr = (typeof getActiveTasks === 'function') ? getActiveTasks() : (GAME.activeTasks || []);
    if (!Array.isArray(arr)) arr = [];
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

  D.npcs = function () {
    if (!GAME.npcs) return [];
    const cam = GAME.camera && GAME.camera.position;
    const wp = (typeof THREE !== 'undefined') ? new THREE.Vector3() : null;
    return GAME.npcs.map(n => {
      let dist = null;
      if (cam && n.mesh && wp) {
        try { n.mesh.getWorldPosition(wp); dist = +cam.distanceTo(wp).toFixed(1); } catch (e) {}
      }
      return {
        id:    n.id,
        name:  n.name,
        trade: n.trade || '-',
        lang:  n.language || '-',
        dist,
      };
    }).sort((a, b) => (a.dist || 999) - (b.dist || 999));
  };

  D.dumpStats = function () {
    let stats = {};
    try { stats = JSON.parse(localStorage.getItem('bulsa_stats') || '{}'); } catch (e) {}
    return stats;
  };

  D.seedStats = function (opts) {
    // opts = { scenario:'lifting', grade:'A', runs:3, deaths:1 } — UI 테스트용 가짜 데이터
    opts = opts || {};
    const sc = opts.scenario || 'lifting';
    let cur = {};
    try { cur = JSON.parse(localStorage.getItem('bulsa_stats') || '{}'); } catch (e) {}
    cur[sc] = cur[sc] || {};
    if (opts.grade) cur[sc].bestGrade = opts.grade;
    if (opts.runs != null) cur[sc].completions = opts.runs;
    if (opts.deaths != null) cur[sc].deathCount = opts.deaths;
    try { localStorage.setItem('bulsa_stats', JSON.stringify(cur)); } catch (e) {}
    return cur[sc];
  };

  D.seedProfile = function (opts) {
    // opts = { name:'tester', hours:2.5 } — 환영 바 + 저장 탭 UI 테스트
    opts = opts || {};
    let p = { name: '', firstPlay: Date.now() - 3 * 86400 * 1000, totalPlaySec: 0, lastPlay: Date.now() };
    try {
      const raw = localStorage.getItem('bulsa_profile');
      if (raw) p = JSON.parse(raw);
    } catch (e) {}
    if (opts.name != null) p.name = String(opts.name).slice(0, 40);
    if (opts.hours != null) p.totalPlaySec = Math.floor(opts.hours * 3600);
    try { localStorage.setItem('bulsa_profile', JSON.stringify(p)); } catch (e) {}
    return p;
  };

  D.clearAllSeed = function () {
    if (typeof saveResetAll === 'function') { saveResetAll(); return 'cleared'; }
    return 'saveResetAll unavailable';
  };

  D.fines = function (krw) {
    if (krw == null) return GAME.state && GAME.state.finesKrw;
    GAME.state.finesKrw = +krw || 0;
    if (typeof persistFines === 'function') persistFines();
    return GAME.state.finesKrw;
  };

  D.phase = function (n) {
    if (n == null) return GAME.state && GAME.state.phase;
    GAME.state.phase = +n;
    return GAME.state.phase;
  };

  D.allConflicts = function () {
    // 매트릭스 진단 — 모든 페어 cond 토큰 분포
    if (typeof INTERFERENCE_MATRIX === 'undefined') return [];
    return INTERFERENCE_MATRIX.map(r => ({
      a: r.a, b: r.b, cond: r.cond, prob: r.prob, accident: r.accident,
    }));
  };

  D.help = function () {
    return [
      '— 작업 / 간섭 —',
      '  tasks()                  · 활성 작업 요약',
      '  conflicts()              · 현재 충돌',
      "  addTask(type,{x,z,floor,flags}) · 임의 작업 추가",
      '  removeAll()              · 모든 작업 제거',
      '  allConflicts()           · INTERFERENCE_MATRIX 룰 dump',
      '— 사고 / 환경 —',
      "  simulateAccident(id)     · 사고 강제 (accident_labels.js 참조)",
      '  windSet(mps)             · 풍속 설정',
      '— 게임 상태 —',
      "  phase(n)                 · phase 강제 / 인수 없으면 조회",
      "  fines(krw)               · 누적 과태료 설정 / 조회",
      "  zone(name)               · 통합 영역 텔레포트 (excavation/foundation/envelope/mep_finish)",
      '— NPC / 명령 —',
      "  npcs()                   · NPC 거리·trade·언어 리스트",
      "  callNpc()                · 가장 가까운 NPC 호출 (N 키 동등)",
      '  history()                · 최근 명령 10개',
      '— 저장·UI 테스트 —',
      "  dumpStats()              · 저장된 시나리오 통계 dump",
      "  seedStats({scenario,grade,runs,deaths}) · 가짜 통계 주입 (허브 등급 칩 테스트)",
      "  seedProfile({name,hours}) · 가짜 프로필 주입 (환영 바 / 저장 탭 테스트)",
      '  clearAllSeed()           · 모든 저장 데이터 wipe',
      '  save.{export,download,import,reset,stats,profile} · 저장 시스템 API',
    ];
  };

  // 기존 __bulsa 에 헬퍼 머지 (save.js·npc_quickcall.js 가 미리 셋팅한 .save·.callNpc 보호)
  window.__bulsa = Object.assign(window.__bulsa || {}, D);
})();
