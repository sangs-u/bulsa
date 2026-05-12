// S — 외장공사 인터랙터블

function registerEnvelopeHazards() {
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
  const d = GAME._envDesk || { x: 10, z: 2 };
  GAME.interactables.push({
    mesh: invisTrigger([d.x, 1.0, d.z], 1.4),
    type: 'action', actionId: 'write_env_plan',
    label: '외장 작업계획서 작성 (E)',
  });

  // Phase 2~5 미니게임으로 대체 (scaffold_minigame.js 자동 시작)

  // Phase 6: 외장 인양·설치 트리거 (비계 옆)
  GAME.interactables.push({
    mesh: invisTrigger([6.2, 2.0, -10], 1.6),
    type: 'envelope_console',
    label: '외장 인양·설치 시작 (E)',
  });
}
