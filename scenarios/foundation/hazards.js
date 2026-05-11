// S — 기초공사 인터랙터블 — 6단계

function registerFoundationHazards() {
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
  const d = GAME._foundDesk || { x: 10, z: 2 };
  GAME.interactables.push({
    mesh: invisTrigger([d.x, 1.0, d.z], 1.4),
    type: 'action', actionId: 'write_found_plan',
    label: '기초 작업계획서 작성 (E)',
  });

  // Phase 2: 철근 보호캡 점검 (매트 코너)
  GAME.interactables.push({
    mesh: invisTrigger([-5, 0.5, -22], 1.4),
    type: 'action', actionId: 'check_rebar_caps',
    label: '철근 보호캡 점검 (E)', phase: 2,
  });

  // Phase 3: 거푸집 동바리 검사
  GAME.interactables.push({
    mesh: invisTrigger([5, 0.5, -22], 1.4),
    type: 'action', actionId: 'inspect_formwork',
    label: '거푸집·동바리 점검 (E)', phase: 3,
  });

  // Phase 4: 펌프카 점검 (호스·아웃트리거)
  GAME.interactables.push({
    mesh: invisTrigger([14, 1.5, -8], 1.8),
    type: 'action', actionId: 'inspect_pump',
    label: '펌프카 점검 (E)', phase: 4,
  });

  // Phase 5: 타설 순서·신호 합의 (NPC 또는 책상 옆 트리거)
  GAME.interactables.push({
    mesh: invisTrigger([10, 1.0, 0], 1.4),
    type: 'action', actionId: 'agree_pour_order',
    label: '타설 순서·신호 합의 (E)', phase: 5,
  });

  // Phase 6: 타설 실행 트리거 (펌프카 옆)
  GAME.interactables.push({
    mesh: invisTrigger([14, 2.0, -4], 1.8),
    type: 'pump_console',
    label: '타설 제어반 (E)',
  });
}
