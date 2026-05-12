// S — 기초공사 인터랙터블 — 6단계

function registerFoundationHazards() {
  const scene = GAME.scene;
  GAME.hazards       = GAME.hazards       || [];
  GAME.interactables = GAME.interactables || [];

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

  // Phase 2~5 미니게임으로 대체 (rebar_minigame.js 자동 시작)

  // Phase 6: 타설 실행 트리거 (펌프카 옆)
  GAME.interactables.push({
    mesh: invisTrigger([14, 2.0, -4], 1.8),
    type: 'pump_console',
    label: '타설 제어반 (E)',
  });
}
