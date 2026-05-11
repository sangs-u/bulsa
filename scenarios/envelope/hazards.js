// S — 외장공사 인터랙터블

function registerEnvelopeHazards() {
  const scene = GAME.scene;
  GAME.hazards      = [];
  GAME.interactables = [];

  function invisTrigger(pos, r) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(r || 1.0, 8, 6),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    m.position.set(...pos);
    scene.add(m);
    return m;
  }

  // Phase 1: 책상 — 작업계획서
  const d = GAME._envDesk || { x: 10, z: 2 };
  GAME.interactables.push({
    mesh: invisTrigger([d.x, 1.0, d.z], 1.4),
    type: 'action', actionId: 'write_env_plan',
    label: '외장 작업계획서 작성 (E)',
  });

  // Phase 2: 비계 조립검사 (비계 옆)
  GAME.interactables.push({
    mesh: invisTrigger([6.2, 1.5, -17], 1.6),
    type: 'action', actionId: 'inspect_scaffold',
    label: '비계 조립검사 (E)', phase: 2,
  });

  // Phase 3: 안전대 부착설비 (구명줄 앵커 설치)
  GAME.interactables.push({
    mesh: invisTrigger([-6.2, 1.5, -17], 1.6),
    type: 'action', actionId: 'install_lifeline',
    label: '안전대 부착설비 설치 (E)', phase: 3,
  });

  // Phase 4: 외장재 결속·자재 점검 (자재 적치 옆)
  GAME.interactables.push({
    mesh: invisTrigger([10, 1.0, 4], 1.4),
    type: 'action', actionId: 'check_panel_secure',
    label: '외장재 결속 점검 (E)', phase: 4,
  });

  // Phase 5: 신호수 배치
  GAME.interactables.push({
    mesh: invisTrigger([4, 1.0, -10], 1.4),
    type: 'action', actionId: 'assign_signal_env',
    label: '신호수 배치 (E)', phase: 5,
  });

  // Phase 6: 외장 인양·설치 트리거 (비계 옆)
  GAME.interactables.push({
    mesh: invisTrigger([6.2, 2.0, -10], 1.6),
    type: 'envelope_console',
    label: '외장 인양·설치 시작 (E)',
  });
}
