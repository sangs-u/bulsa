// v2.0 작업 큐 + 간섭 매트릭스 — SPEC.md v2 의 코어 데이터
//
// 모델 요약:
//   GAME.activeTasks = [{ type, floor, loc, npcId, progress, startedAt, ... }]
//   각 작업은 시공간 좌표 + 진척도 보유. 큐는 동시 다중 활성 허용.
//   간섭 매트릭스가 두 작업의 공간·시간 충돌을 사고 확률로 환산.

// ── TASK_TYPES (SPEC v2 와 동기화) ──────────────────────────
const TASK_TYPES = {
  // 가설공사
  shoring:          { group: 'temporary', label: { ko:'흙막이',          en:'Shoring',           vi:'Chống vách',     ar:'الدعم' } },
  scaffold:         { group: 'temporary', label: { ko:'시스템 비계',     en:'System Scaffold',   vi:'Giàn giáo hệ',    ar:'سقالة نظامية' } },
  formwork_support: { group: 'temporary', label: { ko:'동바리',          en:'Formwork Shoring',  vi:'Chống ván khuôn', ar:'دعم القوالب' } },
  guardrail:        { group: 'temporary', label: { ko:'안전난간',        en:'Guardrail',         vi:'Lan can',         ar:'الحاجز' } },
  lifeline:         { group: 'temporary', label: { ko:'안전대 부착설비', en:'Lifeline Anchor',   vi:'Dây neo',         ar:'مرساة' } },
  // 본공사 1회
  excavate:         { group: 'main_once', label: { ko:'굴착',            en:'Excavate',          vi:'Đào',             ar:'الحفر' } },
  found_pour:       { group: 'main_once', label: { ko:'기초 타설',       en:'Foundation Pour',   vi:'Đổ móng',         ar:'صب الأساس' } },
  // 본공사 사이클 (5층 반복)
  formwork:         { group: 'main_cycle', label: { ko:'거푸집',         en:'Formwork',          vi:'Ván khuôn',       ar:'القوالب' } },
  rebar:            { group: 'main_cycle', label: { ko:'철근 배근',      en:'Rebar',             vi:'Cốt thép',        ar:'الحديد' } },
  pour:             { group: 'main_cycle', label: { ko:'콘크리트 타설', en:'Concrete Pour',     vi:'Đổ bê tông',      ar:'صب الخرسانة' } },
  cure:             { group: 'main_cycle', label: { ko:'양생',            en:'Cure',              vi:'Dưỡng hộ',        ar:'المعالجة' } },
  // 마감/설비
  panel:            { group: 'finish',    label: { ko:'외장 패널',       en:'Panel',             vi:'Tấm vỏ',          ar:'الألواح' } },
  glass:            { group: 'finish',    label: { ko:'창호',            en:'Glass',             vi:'Cửa sổ',          ar:'الزجاج' } },
  electric:         { group: 'finish',    label: { ko:'전기 배선',       en:'Electrical',        vi:'Đi dây điện',     ar:'الكهرباء' } },
  plumb:            { group: 'finish',    label: { ko:'배관',            en:'Plumbing',          vi:'Ống nước',        ar:'الأنابيب' } },
  vent:             { group: 'finish',    label: { ko:'환기 설비',       en:'Ventilation',       vi:'Thông gió',       ar:'التهوية' } },
  paint:            { group: 'finish',    label: { ko:'도장',            en:'Paint',             vi:'Sơn',             ar:'الدهان' } },
  ext_install:      { group: 'finish',    label: { ko:'소화기 배치',     en:'Extinguisher',      vi:'Bình chữa cháy',  ar:'الطفاية' } },
  // 지속 작업
  lift:             { group: 'continuous', label: { ko:'양중',           en:'Lift',              vi:'Cẩu',             ar:'الرفع' } },
  signal:           { group: 'continuous', label: { ko:'신호수 통제',    en:'Signal Control',    vi:'Điều khiển hiệu', ar:'تحكم الإشارة' } },
  survey:           { group: 'continuous', label: { ko:'모니터링',       en:'Monitoring',        vi:'Giám sát',        ar:'المراقبة' } },
  inspect:          { group: 'continuous', label: { ko:'안전감시',       en:'Safety Watch',      vi:'Giám sát AT',     ar:'مراقبة السلامة' } },
};

// ── 간섭 매트릭스 — SPEC v2 표 그대로 ──────────────────────
// {a,b}: 작업 종류 쌍 (순서 무관). cond: 평가 함수. accident: 발생할 사고 ID. prob: 기본 확률
const INTERFERENCE_MATRIX = [
  { a: 'lift',     b: 'inspect',    cond: 'within_radius_6m',    accident: 'worker_crush',     prob: 0.85 },
  { a: 'lift',     b: 'rebar',      cond: 'within_radius_6m',    accident: 'worker_crush',     prob: 0.75 },
  { a: 'lift',     b: 'formwork',   cond: 'within_radius_6m',    accident: 'worker_crush',     prob: 0.75 },
  { a: 'pour',     b: '*',          cond: 'below_floor',         accident: 'falling_debris',   prob: 0.75 },
  { a: 'electric', b: 'plumb',      cond: 'within_1m',           accident: 'electric_shock',   prob: 0.70 },
  { a: 'paint',    b: 'electric',   cond: 'within_5m + organic', accident: 'fire_explosion',   prob: 0.80 },
  { a: 'scaffold', b: 'panel',      cond: 'same_floor + dismantle', accident: 'panel_drop',    prob: 0.65 },
  { a: 'pour',     b: 'formwork_support', cond: 'same_floor + unchecked', accident: 'form_collapse', prob: 0.85 },
  { a: 'excavate', b: 'survey',     cond: 'no_signal',           accident: 'excavator_crush',  prob: 0.70 },
  { a: 'lift',     b: '*',          cond: 'wind_gt_10mps',       accident: 'swing_drop',       prob: 0.85 },
  { a: 'formwork', b: 'rebar',      cond: 'below_floor + dismantle', accident: 'falling_debris', prob: 0.55 },
  { a: 'cure',     b: 'pour',       cond: 'same_slab + premature',accident: 'premature_load',  prob: 0.60 },
];

// ── 작업 큐 관리 API ──────────────────────────────────────
GAME.activeTasks = GAME.activeTasks || [];

function addTask(spec) {
  // spec: { type, floor?, loc?, npcId?, ... }
  if (!TASK_TYPES[spec.type]) {
    console.warn('[tasks] unknown task type:', spec.type);
    return null;
  }
  const task = Object.assign({
    id:        'task_' + Math.random().toString(36).slice(2, 9),
    progress:  0,
    startedAt: performance.now(),
  }, spec);
  GAME.activeTasks.push(task);
  return task;
}

function removeTask(id) {
  const idx = GAME.activeTasks.findIndex(t => t.id === id);
  if (idx >= 0) GAME.activeTasks.splice(idx, 1);
}

function getActiveTasks() { return GAME.activeTasks; }
function getTasksByType(type) { return GAME.activeTasks.filter(t => t.type === type); }
function hasActiveTask(type) { return GAME.activeTasks.some(t => t.type === type); }

// ── 간섭 평가 (단순 거리 기반 — 점진 정교화) ────────────────
// 매 프레임이 아닌 작업 상태 변경 시 호출 권장 (성능)
function evaluateInterference() {
  const tasks = GAME.activeTasks;
  const conflicts = [];
  for (let i = 0; i < tasks.length; i++) {
    for (let j = i + 1; j < tasks.length; j++) {
      const a = tasks[i], b = tasks[j];
      const rule = INTERFERENCE_MATRIX.find(r =>
        (r.a === a.type && (r.b === b.type || r.b === '*')) ||
        (r.a === b.type && (r.b === a.type || r.b === '*'))
      );
      if (!rule) continue;
      // cond 평가 — v2.0 초기 구현: 위치/층 단순 비교만
      if (_satisfiesCondition(rule.cond, a, b)) {
        conflicts.push({ a, b, rule });
      }
    }
  }
  return conflicts;
}

// AND 평가 — cond 는 "tokenA + tokenB + ..." 형태. 모든 토큰 만족해야 충돌.
// task.flags 에 dismantling/unchecked/organic/premature 등 boolean 을 셋팅하면
// 해당 위험 조건이 활성화. 미설정 시 default false (안전 상태).
function _satisfiesCondition(cond, a, b) {
  if (!cond) return true;
  const tokens = cond.split('+').map(s => s.trim()).filter(Boolean);
  return tokens.every(tok => _evalCondToken(tok, a, b));
}

function _dist(a, b) {
  if (!a.loc || !b.loc) return Infinity;
  const dx = a.loc.x - b.loc.x, dz = a.loc.z - b.loc.z;
  return Math.hypot(dx, dz);
}

function _hasFlag(a, b, key) {
  return !!((a.flags && a.flags[key]) || (b.flags && b.flags[key]));
}

function _evalCondToken(tok, a, b) {
  switch (tok) {
    case 'within_radius_6m': return _dist(a, b) <= 6;
    case 'within_5m':        return _dist(a, b) <= 5;
    case 'within_1m':        return _dist(a, b) <= 1;
    case 'below_floor':
      if (a.floor == null || b.floor == null) return false;
      return Math.abs(a.floor - b.floor) === 1;
    case 'same_floor':
      return a.floor != null && a.floor === b.floor;
    case 'same_slab':
      return a.floor != null && a.floor === b.floor;
    case 'wind_gt_10mps':
      return ((GAME.state && GAME.state.windSpeed) || 0) > 10;
    case 'no_signal':
      return !hasActiveTask('signal');
    case 'dismantle':  return _hasFlag(a, b, 'dismantling');
    case 'unchecked':  return _hasFlag(a, b, 'unchecked');
    case 'organic':    return _hasFlag(a, b, 'organic');
    case 'premature':  return _hasFlag(a, b, 'premature');
    default:
      // 알 수 없는 토큰은 보수적으로 false (충돌 없음)
      return false;
  }
}

// ── 명령 풀 합성 헬퍼 (instruction.js 에서 사용) ───────────
// 활성 작업 종류 → 각 종류별 명령 풀 합성 + 함정 풀 추가
function buildInstructionPoolFromActiveTasks(npc) {
  const pool = [];
  const seenIds = new Set();

  // 활성 작업 종류별 풀
  if (typeof INSTRUCTION_POOLS_BY_TASK !== 'undefined') {
    GAME.activeTasks.forEach(t => {
      const taskPool = INSTRUCTION_POOLS_BY_TASK[t.type] || [];
      taskPool.forEach(inst => {
        if (seenIds.has(inst.id)) return;
        seenIds.add(inst.id);
        pool.push(inst);
      });
    });
  }

  // 글로벌 함정 풀
  if (typeof TRAPS_GLOBAL !== 'undefined') {
    TRAPS_GLOBAL.forEach(inst => {
      if (seenIds.has(inst.id)) return;
      seenIds.add(inst.id);
      pool.push(inst);
    });
  }

  // 폴백 — 활성 작업 0개이고 빈 풀이면 기존 INSTRUCTIONS phase 풀 사용
  if (pool.length === 0 && typeof INSTRUCTIONS !== 'undefined') {
    const phase = (GAME.state && GAME.state.phase) || 1;
    return INSTRUCTIONS[phase] || INSTRUCTIONS[1] || [];
  }

  return pool;
}

// ── 시나리오별 초기 작업 큐 시드 ────────────────────────────
// 시나리오 진입 시 그 시나리오에서 자주 등장하는 작업을 미리 큐에 등록.
// 이 시드 덕분에 명령 풀(합성) + 간섭 매트릭스 + HUD 작업 칩이 시나리오 처음부터 동작.
// loc 는 부지 내 적당히 분산 — 정상 흐름에서는 자연스럽게 충돌 없음.
const _SCENARIO_TASK_SEEDS = {
  excavation: [
    { type: 'excavate',  floor: 0, loc: { x:  0, z:  0 } },
    { type: 'survey',    floor: 0, loc: { x: -8, z: -8 } },
    { type: 'shoring',   floor: 0, loc: { x:  8, z:  0 } },
    { type: 'guardrail', floor: 0, loc: { x:  0, z:  8 } },
  ],
  foundation: [
    { type: 'rebar',            floor: 0, loc: { x:  0, z:  0 } },
    { type: 'formwork',         floor: 0, loc: { x: -7, z:  0 } },
    { type: 'formwork_support', floor: 0, loc: { x:  7, z:  0 } },
    { type: 'pour',             floor: 0, loc: { x:  0, z:  7 } },
  ],
  lifting: [],  // RC_LOOP 가 동적 enqueue
  envelope: [
    { type: 'scaffold',  floor: 1, loc: { x: -8, z:  0 } },
    { type: 'panel',     floor: 1, loc: { x:  8, z:  0 } },
    { type: 'glass',     floor: 1, loc: { x:  0, z:  8 } },
    { type: 'guardrail', floor: 1, loc: { x:  0, z: -8 } },
    { type: 'lifeline',  floor: 1, loc: { x:  0, z:  0 } },
    { type: 'lift',      floor: 1, loc: { x:  0, z:-12 } },
  ],
  mep_finish: [
    { type: 'electric',    floor: 1, loc: { x: -8, z:  0 } },
    { type: 'plumb',       floor: 1, loc: { x:  8, z:  0 } },
    { type: 'vent',        floor: 1, loc: { x:  0, z:  8 } },
    { type: 'paint',       floor: 1, loc: { x:  0, z: -8 } },
    { type: 'ext_install', floor: 1, loc: { x: 12, z: 12 } },
  ],
};

function enqueueScenarioTasks(scenarioId) {
  const seeds = _SCENARIO_TASK_SEEDS[scenarioId];
  if (!seeds) return [];
  return seeds.map(spec => addTask(Object.assign({}, spec, { loc: Object.assign({}, spec.loc) })));
}

// ── 외부 노출 ────────────────────────────────────────────
window.TASK_TYPES                       = TASK_TYPES;
window.INTERFERENCE_MATRIX              = INTERFERENCE_MATRIX;
window.addTask                          = addTask;
window.removeTask                       = removeTask;
window.getActiveTasks                   = getActiveTasks;
window.getTasksByType                   = getTasksByType;
window.hasActiveTask                    = hasActiveTask;
window.evaluateInterference             = evaluateInterference;
window.buildInstructionPoolFromActiveTasks = buildInstructionPoolFromActiveTasks;
window.enqueueScenarioTasks             = enqueueScenarioTasks;
