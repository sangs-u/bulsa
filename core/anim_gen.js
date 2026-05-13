// anim_gen.js — 건설 행위 전용 AnimationClip 생성기
// Mixamo 표준 본(mixamorig:*) 기준 QuaternionKeyframeTrack 으로 직접 제작.
// Mixamo 실제 클립을 받으면 MOTION._clipCache[name] 에 덮어쓰기만 하면 됨.

// ── 헬퍼 ─────────────────────────────────────────────────────
const _Q = new THREE.Quaternion();
const _E = new THREE.Euler();

// Euler(x,y,z) → [qx, qy, qz, qw]
function _eq(x, y, z, order = 'XYZ') {
  _E.set(x, y, z, order);
  _Q.setFromEuler(_E);
  return [_Q.x, _Q.y, _Q.z, _Q.w];
}

// QuaternionKeyframeTrack 생성 헬퍼
function _qtrack(bone, times, eulers) {
  const values = [];
  eulers.forEach(([x, y, z]) => values.push(..._eq(x, y, z)));
  return new THREE.QuaternionKeyframeTrack(
    `mixamorig:${bone}.quaternion`, times, values
  );
}

// 단순 루프 클립
function _clip(name, duration, tracks) {
  const clip = new THREE.AnimationClip(name, duration, tracks);
  clip.loop = THREE.LoopRepeat;
  return clip;
}

// ── 생성 함수들 ───────────────────────────────────────────────

// 자재 들고 이동 — 팔을 앞으로 뻗고 걷기
function genCarry() {
  const d = 1.0;
  const t = [0, 0.25, 0.5, 0.75, 1.0];
  return _clip('carry', d, [
    _qtrack('Spine',     t, [[0.12,0,0],[0.14,0,0],[0.12,0,0],[0.14,0,0],[0.12,0,0]]),
    _qtrack('LeftArm',   t, [[-0.9,0,0.35],[-0.85,0,0.35],[-0.9,0,0.35],[-0.85,0,0.35],[-0.9,0,0.35]]),
    _qtrack('RightArm',  t, [[-0.9,0,-0.35],[-0.85,0,-0.35],[-0.9,0,-0.35],[-0.85,0,-0.35],[-0.9,0,-0.35]]),
    _qtrack('LeftForeArm',  t, [[-0.5,0,0],[-0.45,0,0],[-0.5,0,0],[-0.45,0,0],[-0.5,0,0]]),
    _qtrack('RightForeArm', t, [[-0.5,0,0],[-0.45,0,0],[-0.5,0,0],[-0.45,0,0],[-0.5,0,0]]),
    // 발: 좌우 교대
    _qtrack('LeftUpLeg',  t, [[0.35,0,0],  [0,0,0], [-0.3,0,0],[0,0,0],[0.35,0,0]]),
    _qtrack('RightUpLeg', t, [[-0.3,0,0],  [0,0,0], [0.35,0,0],[0,0,0],[-0.3,0,0]]),
    _qtrack('LeftLeg',    t, [[-0.1,0,0],[-0.35,0,0],[-0.05,0,0],[-0.35,0,0],[-0.1,0,0]]),
    _qtrack('RightLeg',   t, [[-0.05,0,0],[-0.35,0,0],[-0.1,0,0],[-0.35,0,0],[-0.05,0,0]]),
  ]);
}

// 자재 들고 정지 대기
function genCarryIdle() {
  const d = 2.0;
  const t = [0, 1.0, 2.0];
  return _clip('carry_idle', d, [
    _qtrack('Spine',     t, [[0.10,0,0],[0.12,0,0],[0.10,0,0]]),
    _qtrack('LeftArm',   t, [[-0.85,0,0.32],[-0.88,0,0.32],[-0.85,0,0.32]]),
    _qtrack('RightArm',  t, [[-0.85,0,-0.32],[-0.88,0,-0.32],[-0.85,0,-0.32]]),
    _qtrack('LeftForeArm',  t, [[-0.45,0,0],[-0.48,0,0],[-0.45,0,0]]),
    _qtrack('RightForeArm', t, [[-0.45,0,0],[-0.48,0,0],[-0.45,0,0]]),
  ]);
}

// 망치질 — 오른팔 크게 위→아래 스윙
function genHammer() {
  const d = 0.7;
  const t = [0, 0.2, 0.45, 0.7];
  return _clip('hammer', d, [
    _qtrack('Spine',        t, [[0.18,0,0],[0.22,0,0],[0.28,0,0],[0.18,0,0]]),
    _qtrack('RightArm',     t, [[-1.4,0,-0.2],[-0.5,0,-0.2],[0.3,0,-0.15],[-1.4,0,-0.2]]),
    _qtrack('RightForeArm', t, [[-0.3,0,0],[0.1,0,0],[-0.6,0,0],[-0.3,0,0]]),
    _qtrack('LeftArm',      t, [[-0.6,0,0.3],[-0.65,0,0.3],[-0.6,0,0.3],[-0.6,0,0.3]]),
    _qtrack('LeftForeArm',  t, [[-0.3,0,0],[-0.3,0,0],[-0.3,0,0],[-0.3,0,0]]),
  ]);
}

// 드릴 — 앞으로 밀기 반복 (앙카볼트)
function genDrill() {
  const d = 0.9;
  const t = [0, 0.15, 0.4, 0.65, 0.9];
  return _clip('drill', d, [
    _qtrack('Spine',        t, [[0.15,0,0],[0.20,0,0],[0.15,0,0],[0.20,0,0],[0.15,0,0]]),
    _qtrack('RightArm',     t, [[-0.8,0,-0.15],[-0.7,0,-0.15],[-0.8,0,-0.15],[-0.7,0,-0.15],[-0.8,0,-0.15]]),
    _qtrack('RightForeArm', t, [[-0.9,0,0],[-0.8,0,0],[-0.9,0,0],[-0.8,0,0],[-0.9,0,0]]),
    _qtrack('LeftArm',      t, [[-0.75,0,0.15],[-0.65,0,0.15],[-0.75,0,0.15],[-0.65,0,0.15],[-0.75,0,0.15]]),
    _qtrack('LeftForeArm',  t, [[-0.85,0,0],[-0.75,0,0],[-0.85,0,0],[-0.75,0,0],[-0.85,0,0]]),
  ]);
}

// 매설물 탐지기 들고 걷기 — 왼팔 앞 수평 유지, 오른팔 자연스럽게
function genSurvey() {
  const d = 1.2;
  const t = [0, 0.3, 0.6, 0.9, 1.2];
  return _clip('survey', d, [
    _qtrack('Spine',        t, [[0.08,0,0],[0.08,0.04,0],[0.08,0,0],[0.08,-0.04,0],[0.08,0,0]]),
    _qtrack('LeftArm',      t, [[-1.1,0,0.15],[-1.1,0,0.20],[-1.1,0,0.15],[-1.1,0,0.10],[-1.1,0,0.15]]),
    _qtrack('LeftForeArm',  t, [[-0.2,0,0],[-0.2,0,0],[-0.2,0,0],[-0.2,0,0],[-0.2,0,0]]),
    _qtrack('RightArm',     t, [[-0.3,0,-0.15],[0.1,0,-0.15],[-0.3,0,-0.15],[0.1,0,-0.15],[-0.3,0,-0.15]]),
    _qtrack('LeftUpLeg',    t, [[0.3,0,0],[0,0,0],[-0.25,0,0],[0,0,0],[0.3,0,0]]),
    _qtrack('RightUpLeg',   t, [[-0.25,0,0],[0,0,0],[0.3,0,0],[0,0,0],[-0.25,0,0]]),
    _qtrack('LeftLeg',      t, [[-0.05,0,0],[-0.3,0,0],[-0.05,0,0],[-0.3,0,0],[-0.05,0,0]]),
    _qtrack('RightLeg',     t, [[-0.05,0,0],[-0.3,0,0],[-0.05,0,0],[-0.3,0,0],[-0.05,0,0]]),
  ]);
}

// 물건 내려놓기 — 허리 굽혀 팔 아래
function genPlace() {
  const d = 1.0;
  const t = [0, 0.35, 0.65, 1.0];
  const clip = _clip('place', d, [
    _qtrack('Spine',        t, [[0,0,0],[0.45,0,0],[0.45,0,0],[0,0,0]]),
    _qtrack('Spine1',       t, [[0,0,0],[0.25,0,0],[0.25,0,0],[0,0,0]]),
    _qtrack('LeftArm',      t, [[-0.5,0,0.2],[0.5,0,0.2],[0.5,0,0.2],[-0.5,0,0.2]]),
    _qtrack('RightArm',     t, [[-0.5,0,-0.2],[0.5,0,-0.2],[0.5,0,-0.2],[-0.5,0,-0.2]]),
    _qtrack('LeftForeArm',  t, [[-0.2,0,0],[-0.1,0,0],[-0.1,0,0],[-0.2,0,0]]),
    _qtrack('RightForeArm', t, [[-0.2,0,0],[-0.1,0,0],[-0.1,0,0],[-0.2,0,0]]),
    _qtrack('LeftUpLeg',    t, [[0,0,0],[0.55,0,0],[0.55,0,0],[0,0,0]]),
    _qtrack('RightUpLeg',   t, [[0,0,0],[0.55,0,0],[0.55,0,0],[0,0,0]]),
    _qtrack('LeftLeg',      t, [[0,0,0],[-0.6,0,0],[-0.6,0,0],[0,0,0]]),
    _qtrack('RightLeg',     t, [[0,0,0],[-0.6,0,0],[-0.6,0,0],[0,0,0]]),
  ]);
  clip.loop = THREE.LoopOnce;
  return clip;
}

// 쪼그려 점검 — 무릎 굽히고 고개 숙임
function genInspect() {
  const d = 2.0;
  const t = [0, 1.0, 2.0];
  return _clip('inspect', d, [
    _qtrack('Hips',         t, [[0,0,0],[0,0,0],[0,0,0]]), // hips 낮춤은 position track 필요 — 근사로 Spine 굽힘
    _qtrack('Spine',        t, [[0.35,0,0],[0.38,0,0],[0.35,0,0]]),
    _qtrack('Neck',         t, [[0.15,0,0],[0.18,0,0],[0.15,0,0]]),
    _qtrack('LeftArm',      t, [[-0.5,0,0.2],[-0.52,0,0.2],[-0.5,0,0.2]]),
    _qtrack('RightArm',     t, [[-0.5,0,-0.2],[-0.55,0,-0.2],[-0.5,0,-0.2]]),
    _qtrack('LeftUpLeg',    t, [[0.7,0,0],[0.72,0,0],[0.7,0,0]]),
    _qtrack('RightUpLeg',   t, [[0.7,0,0],[0.72,0,0],[0.7,0,0]]),
    _qtrack('LeftLeg',      t, [[-1.0,0,0],[-1.05,0,0],[-1.0,0,0]]),
    _qtrack('RightLeg',     t, [[-1.0,0,0],[-1.05,0,0],[-1.0,0,0]]),
  ]);
}

// 신호수 손짓 — 오른팔 높이 들고 좌우 흔들기
function genSignal() {
  const d = 1.0;
  const t = [0, 0.25, 0.5, 0.75, 1.0];
  return _clip('signal', d, [
    _qtrack('RightArm',     t, [[-1.5,0,-0.2],[-1.5,0.1,-0.2],[-1.5,0,-0.2],[-1.5,-0.1,-0.2],[-1.5,0,-0.2]]),
    _qtrack('RightForeArm', t, [[-0.2,0,0],[-0.15,0,0],[-0.2,0,0],[-0.15,0,0],[-0.2,0,0]]),
  ]);
}

// ── 전체 등록 ────────────────────────────────────────────────
function registerGeneratedAnims() {
  const generated = {
    carry:      genCarry(),
    carry_idle: genCarryIdle(),
    hammer:     genHammer(),
    drill:      genDrill(),
    survey:     genSurvey(),
    place:      genPlace(),
    inspect:    genInspect(),
    signal:     genSignal(),
  };
  // Mixamo 실파일이 이미 로드됐으면 덮어쓰지 않음
  Object.entries(generated).forEach(([name, clip]) => {
    if (!MOTION._clipCache[name]) {
      MOTION._clipCache[name] = clip;
    }
  });
}
