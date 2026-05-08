// Rigging calculation engine — ported from musaai/lifting.html
// KOSHA GUIDE G-133-2020, B-M-12-2025

// ── Equipment SWL tables ────────────────────────────────────
const SLING_WIRE = [
  {label:'φ9mm', swl:750},   {label:'φ10mm',swl:900},
  {label:'φ12mm',swl:1350},  {label:'φ14mm',swl:1800},
  {label:'φ16mm',swl:2400},  {label:'φ18mm',swl:3000},
  {label:'φ22mm',swl:4500},  {label:'φ26mm',swl:6000},
];

const SLING_BELT = [
  {label:'1t급',swl:1000},   {label:'2t급', swl:2000},
  {label:'3t급',swl:3000},   {label:'5t급', swl:5000},
  {label:'8t급',swl:8000},   {label:'10t급',swl:10000},
];

const SLING_CHAIN = [
  {label:'G80 φ7mm', swl:1120}, {label:'G80 φ8mm', swl:1500},
  {label:'G80 φ10mm',swl:2360}, {label:'G80 φ13mm',swl:3980},
  {label:'G80 φ16mm',swl:6300},
];

// Wire rope termination efficiency
const WIRE_EFF = { socket:1.0, thimble:0.95, splice:0.90, clip:0.75 };

// Choke mode capacity reduction by wrap angle
function chokeCapFactor(angleDeg) {
  if (angleDeg > 120) return 1.00;
  if (angleDeg >= 90)  return 0.86;
  if (angleDeg >= 60)  return 0.74;
  if (angleDeg >= 30)  return 0.62;
  return 0.49;
}

// ── Main calculation ────────────────────────────────────────
// params:
//   weight    — actual load weight (kg)
//   dynK      — dynamic coefficient (1.0/1.2/1.5)
//   slingSwl  — nominal SWL of one sling leg (kg)
//   lines     — number of sling legs
//   angleDeg  — total included angle between legs (0–180°)
//   mode      — 0=vertical, 1=basket, 2=choke
//   chokeAngle — choke wrap angle (deg, only for mode 2)
function calcRigging(params) {
  const p = Object.assign({ dynK:1.2, lines:2, angleDeg:60, mode:0, chokeAngle:120 }, params);

  const W       = p.weight * p.dynK;           // design load
  const betaDeg = p.angleDeg / 2;              // half-angle from vertical
  const beta    = betaDeg * Math.PI / 180;

  const invalid = betaDeg > 60;                // KOSHA limit: 60°
  const K       = (invalid || p.lines <= 1) ? (invalid ? Infinity : 1.0) : 1 / Math.cos(beta);
  const M       = p.mode === 1 ? 2.0 : p.mode === 2 ? 0.8 : 1.0;
  const effN    = Math.min(p.lines, 3);

  const capFactor    = p.mode === 2 ? chokeCapFactor(p.chokeAngle) : 1.0;
  const effectiveSWL = p.slingSwl * capFactor;
  const totalCap     = invalid ? 0 : (effectiveSWL * effN * M) / K;
  const Ts           = invalid ? Infinity : (W * K) / (effN * M);

  const slingUsage = effectiveSWL > 0 && isFinite(Ts) ? Ts / effectiveSWL : Infinity;
  const overallUse = totalCap > 0 ? W / totalCap : Infinity;

  const st = r => (!isFinite(r) || r > 1) ? 'ng' : r > 0.85 ? 'warn' : 'ok';

  return {
    W, K, betaDeg, effectiveSWL, totalCap, Ts,
    slingUsage, overallUse, invalid,
    slingStatus:   st(slingUsage),
    overallStatus: st(overallUse),
    pct: r => isFinite(r) ? Math.round(r * 100) + '%' : '∞',
    fmt: kg => isFinite(kg) ? Math.round(kg).toLocaleString() + ' kg' : '—',
  };
}

// ── S01 시나리오 리깅 파라미터 ──────────────────────────────
const S01_PARAMS = {
  load: {
    weight:  2500,   // RC 보 실중량 (kg)
    dynK:    1.2,    // 동적하중계수 (일반 크레인)
    rigging: 320,    // 달기구 자중 (kg)
  },
  sling: {
    type:  'wire',
    label: 'φ16mm 와이어로프',
    swl:   2400,     // 1줄 SWL (kg)
    lines: 2,
    sf:    5,        // 안전계수
  },
  crane: {
    ratedCap: 3200,  // 현 작업반경(15m) 정격하중 (kg)
  },
  angles: {
    normal: 60,   // 정상 인양각 (슬링 간 각도 60° → 수직 30°)
    danger: 144,  // 위험 인양각 (슬링 간 144° → 수직 72°)
  },
};

// ── 사전 계산값 (hazards.js에서 참조) ───────────────────────
const S01_CALC = (function() {
  const p = S01_PARAMS;
  const W_design = p.load.weight * p.load.dynK;        // 3,000 kg
  const W_total  = (p.load.weight + p.load.rigging) * p.load.dynK; // 3,384 kg

  // 정상 인양 (기준값)
  const normal = calcRigging({
    weight: p.load.weight, dynK: p.load.dynK,
    slingSwl: p.sling.swl, lines: p.sling.lines,
    angleDeg: p.angles.normal, mode: 0,
  });

  // 인양각도 초과
  const angleOver = calcRigging({
    weight: p.load.weight, dynK: p.load.dynK,
    slingSwl: p.sling.swl, lines: p.sling.lines,
    angleDeg: p.angles.danger, mode: 0,
  });

  // 슬링 손상 (킹크): 잔류강도 35% 가정
  const kinkFactor = 0.35;
  const slingDmg = calcRigging({
    weight: p.load.weight, dynK: p.load.dynK,
    slingSwl: p.sling.swl * kinkFactor,
    lines: p.sling.lines,
    angleDeg: p.angles.normal, mode: 0,
  });

  // 과부하: 리깅도구 중량 미계상 + 안전계수 미적용
  const craneUse = W_total / p.crane.ratedCap;

  return {
    W_design, W_total, normal, angleOver, slingDmg, craneUse, kinkFactor,
    crane: p.crane, sling: p.sling, load: p.load, angles: p.angles,
  };
})();

// ── 위험요소별 계산 설명 생성 ────────────────────────────────
function getHazardCalcNote(hazardId, lang) {
  const c = S01_CALC;
  const ko = lang !== 'en';

  switch (hazardId) {
    case 'sling_damage': return ko
      ? `[ 계산 ] φ16mm 정상 SWL 2,400 kg → 킹크 잔류강도 ${Math.round(c.kinkFactor*100)}%\n유효 SWL: ${Math.round(2400*c.kinkFactor).toLocaleString()} kg | 슬링 장력: ${c.normal.fmt(c.normal.Ts)}\n사용률: ${c.normal.pct(c.slingDmg.slingUsage)} ▶ NG (한도 100%)`
      : `[ Calc ] φ16mm normal SWL 2,400 kg → kink residual ${Math.round(c.kinkFactor*100)}%\nEff. SWL: ${Math.round(2400*c.kinkFactor).toLocaleString()} kg | Tension: ${c.normal.fmt(c.normal.Ts)}\nUsage: ${c.normal.pct(c.slingDmg.slingUsage)} ▶ NG (limit 100%)`;

    case 'angle_exceeded': return ko
      ? `[ 계산 ] 슬링 간 각도 ${c.angles.danger}° → 수직각 ${c.angleOver.betaDeg}° (한도 60°)\nK = 1/cos(${c.angleOver.betaDeg}°) = ${c.angleOver.K.toFixed(3)}\n슬링 장력: ${c.angleOver.fmt(c.angleOver.Ts)} / SWL ${c.sling.swl.toLocaleString()} kg → ${c.angleOver.pct(c.angleOver.slingUsage)} NG`
      : `[ Calc ] Sling angle ${c.angles.danger}° → half-angle ${c.angleOver.betaDeg}° (limit 60°)\nK = 1/cos(${c.angleOver.betaDeg}°) = ${c.angleOver.K.toFixed(3)}\nTension: ${c.angleOver.fmt(c.angleOver.Ts)} / SWL ${c.sling.swl.toLocaleString()} kg → ${c.angleOver.pct(c.angleOver.slingUsage)} NG`;

    case 'overload': return ko
      ? `[ 계산 ] RC보 ${c.load.weight.toLocaleString()} kg + 달기구 ${c.load.rigging} kg = ${(c.load.weight+c.load.rigging).toLocaleString()} kg\n동적계수 ×${c.load.dynK} → 설계하중 ${Math.round(c.W_total).toLocaleString()} kg\n정격하중 ${c.crane.ratedCap.toLocaleString()} kg → 사용률 ${Math.round(c.craneUse*100)}% NG`
      : `[ Calc ] RC beam ${c.load.weight.toLocaleString()} kg + rigging ${c.load.rigging} kg = ${(c.load.weight+c.load.rigging).toLocaleString()} kg\n×dynK ${c.load.dynK} → design ${Math.round(c.W_total).toLocaleString()} kg\nRated cap ${c.crane.ratedCap.toLocaleString()} kg → usage ${Math.round(c.craneUse*100)}% NG`;

    case 'pin_unsecured': return ko
      ? `[ 기준 ] 훅 안전핀(래치) 미체결 시 슬링 이탈 위험\n산안규칙 제147조 — 인양 중 래치 상태 수시 확인 의무\n설계하중 ${c.W_design.toLocaleString()} kg이 직접 작용`
      : `[ Ref ] Unsecured safety pin risks sling ejection\nOSH Rule §147 — Check latch during lift\nDesign load ${c.W_design.toLocaleString()} kg acts directly on pin`;

    case 'no_signal': return ko
      ? `[ 기준 ] 산안규칙 제146조 — 신호수 배치 의무\n크레인 운전자 시야 외 구역 반드시 배치\n현장 인양 반경 ${Math.round(Math.sqrt(225+64)).toLocaleString()} m`
      : `[ Ref ] OSH Rule §146 — Signal person mandatory\nRequired when operator has limited visibility\nLift radius ≈ ${Math.round(Math.sqrt(225+64))} m`;

    case 'worker_in_zone': return ko
      ? `[ 기준 ] 산안규칙 제138조 — 인양 반경 내 접근금지\n낙하 하중 ${c.W_design.toLocaleString()} kg 낙하 시 충격력 > 500 kN\n출입금지 구역 설정·표시 의무`
      : `[ Ref ] OSH Rule §138 — Exclusion zone required\nDropped load ${c.W_design.toLocaleString()} kg → impact >500 kN\nExclusion zone must be established`;

    default: return '';
  }
}
