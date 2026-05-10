// Interactive objects — S01 줄걸이/인양 (직접 행동 기반)
// 위험 경고 없음. 중립적 오브젝트만. 행동 기록만.

function registerLiftingHazards() {
  const scene = GAME.scene;
  GAME.hazards      = [];
  GAME.interactables = [];

  function makeMesh(geo, color, pos, opacity) {
    const mat  = new THREE.MeshLambertMaterial({ color, transparent: opacity < 1, opacity: opacity ?? 1 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...pos);
    mesh.castShadow = true;
    scene.add(mesh);
    return mesh;
  }

  // ── 1. 슬링 — 점검 대상 (보 왼쪽 연결부 근처) ───────────────
  const slingMesh = makeMesh(
    new THREE.TorusGeometry(0.18, 0.055, 14, 24, Math.PI * 1.4),
    0x7A6050, [-5, 0.6, -8]
  );
  GAME.interactables.push({
    mesh: slingMesh, type: 'action', actionId: 'inspect_sling', label: '슬링 점검',
    phase: 4,
  });

  // ── 2. 안전핀/샤클 — 체결 대상 (훅 블록 옆) ─────────────────
  const pinMesh = makeMesh(
    new THREE.CylinderGeometry(0.12, 0.10, 0.42, 16),
    0x706050, [-2, 0.52, -5.8]
  );
  GAME.interactables.push({
    mesh: pinMesh, type: 'action', actionId: 'secure_pin', label: '안전핀 체결',
    phase: 4,
  });

  // ── 3. 각도기 — 측정 대상 (슬링 연결 지점 근처) ─────────────
  const angleMesh = makeMesh(
    new THREE.CylinderGeometry(0, 0.32, 0.44, 4),
    0x686050, [1, 0.6, -9]
  );
  angleMesh.rotation.y = Math.PI / 4;
  GAME.interactables.push({
    mesh: angleMesh, type: 'action', actionId: 'measure_angle', label: '각도 측정',
    phase: 4,
  });

  // ── 4. 크레인 사양서 — 운전실 전면 벽 ───────────────────────
  const specMesh = makeMesh(
    new THREE.BoxGeometry(0.52, 0.72, 0.04),
    0xECE8E0, [14, 1.5, -4.23]
  );
  // 서류 위 문자 선 (장식)
  [0.22, 0.10, -0.02, -0.14].forEach(dy => {
    const line = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.045, 0.02),
      new THREE.MeshLambertMaterial({ color: 0x9A9488 })
    );
    line.position.set(14, 1.5 + dy, -4.21);
    scene.add(line);
  });
  GAME.interactables.push({
    mesh: specMesh, type: 'document', docId: 'crane_spec', label: '사양서 확인',
  });

  // ── 5. 크레인 운전석 진입 트리거 ──────────────────────────────
  const cabTrigger = new THREE.Mesh(
    new THREE.SphereGeometry(0.9, 8, 6),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  cabTrigger.position.set(14, 1.0, -4.8);
  scene.add(cabTrigger);
  GAME.interactables.push({
    mesh: cabTrigger, type: 'crane_cab', label: '운전석 탑승',
    phase: 6,
  });

  // ── 6. 작업반경 내 근로자 (기하학 피규어) ─────────────────────
  const workerGroup = _buildDangerWorker(scene, [1, 0, -11]);
  const workerTrigger = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 8, 6),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  workerTrigger.position.set(1, 1.0, -11);
  scene.add(workerTrigger);
  GAME.interactables.push({
    mesh: workerTrigger, type: 'action', actionId: 'evacuate_worker', label: '대피 지시',
    phase: 5,
  });

  GAME._dangerWorker = { group: workerGroup, trigger: workerTrigger };

  // 펄스 없음 — 경고 표시 제거
  GAME._pulseHazards = null;

  // ── 책상 invisible trigger sphere ─────────────────────────
  const deskTrigger = new THREE.Mesh(
    new THREE.SphereGeometry(1.2, 8, 6),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  deskTrigger.position.set(10, 1.0, 2);
  scene.add(deskTrigger);

  // Phase 1: 작업계획서 작성
  GAME.interactables.push({
    mesh: deskTrigger,
    type: 'action',
    actionId: 'write_plan',
    label: '작업계획서 작성 (E)',
    phase: 1,
  });

  // Phase 2: 안전성 검토 (계획서 작성 후 활성화)
  GAME.interactables.push({
    mesh: deskTrigger,
    type: 'action',
    actionId: 'safety_review',
    label: '안전성 검토 (E)',
    phase: 2,
  });

  // Phase 3: 아웃트리거 확장 (크레인 옆 상호작용)
  GAME.interactables.push({
    mesh: GAME._outriggers[0].arm,
    type: 'action',
    actionId: 'extend_outrigger',
    label: '아웃트리거 확장 (E)',
    phase: 3,
  });

  // ── 도면 스탠드 (사무실 옆 — 항상 열람 가능) ─────────────────
  const bpMat = new THREE.MeshLambertMaterial({ color: 0xC8A96E });
  // 스탠드 기둥
  const bpPole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.1, 8), bpMat);
  bpPole.position.set(11.2, 0.55, -3.0);
  scene.add(bpPole);
  // 도면 롤 (파란 원통)
  const bpRollMat = new THREE.MeshLambertMaterial({ color: 0x2B6CB0 });
  const bpRoll = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.55, 12), bpRollMat);
  bpRoll.rotation.z = Math.PI / 2;
  bpRoll.position.set(11.2, 1.08, -3.0);
  scene.add(bpRoll);
  // 베이스 플레이트
  const bpBase = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.3), bpMat);
  bpBase.position.set(11.2, 0.03, -3.0);
  scene.add(bpBase);

  GAME.interactables.push({
    mesh: bpRoll,
    type: 'blueprint',
    label: '📐 도면 열람 (E)',
  });
}

// ── 위험구역 근로자 기하학 빌드 ────────────────────────────────
function _buildDangerWorker(scene, pos) {
  const group = new THREE.Group();
  const vm = new THREE.MeshLambertMaterial({ color: 0xCC5018 });
  const sm = new THREE.MeshLambertMaterial({ color: 0xC8845A });
  const hm = new THREE.MeshLambertMaterial({ color: 0xDEBB14 });
  const pm = new THREE.MeshLambertMaterial({ color: 0x2C3A48 });
  const bm = new THREE.MeshLambertMaterial({ color: 0x1C1814 });

  const mk = (geo, mat, x, y, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    group.add(m);
    return m;
  };

  mk(new THREE.BoxGeometry(0.12, 0.09, 0.24), bm, -0.09, 0.045, 0.04);
  mk(new THREE.BoxGeometry(0.12, 0.09, 0.24), bm,  0.09, 0.045, 0.04);
  const lL = new THREE.CylinderGeometry(0.068, 0.054, 0.78, 14); lL.translate(0, -0.39, 0);
  mk(lL, pm, -0.09, 0.88, 0);
  const lR = new THREE.CylinderGeometry(0.068, 0.054, 0.78, 14); lR.translate(0, -0.39, 0);
  mk(lR, pm,  0.09, 0.88, 0);
  mk(new THREE.CylinderGeometry(0.155, 0.130, 0.52, 18), vm, 0, 1.08, 0);
  mk(new THREE.CylinderGeometry(0.052, 0.048, 0.09, 12), sm, 0, 1.39, 0);
  mk(new THREE.SphereGeometry(0.115, 24, 18), sm, 0, 1.56, 0);
  mk(new THREE.SphereGeometry(0.132, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.58), hm, 0, 1.625, 0);
  mk(new THREE.CylinderGeometry(0.162, 0.148, 0.024, 24), hm, 0, 1.568, 0);
  const aL = new THREE.CylinderGeometry(0.046, 0.036, 0.62, 12); aL.translate(0, -0.31, 0);
  mk(aL, vm, -0.21, 1.32, 0);
  const aR = new THREE.CylinderGeometry(0.046, 0.036, 0.62, 12); aR.translate(0, -0.31, 0);
  mk(aR, vm,  0.21, 1.32, 0);

  group.position.set(...pos);
  scene.add(group);
  return group;
}
