// S — 설비·마감 인터랙터블

function registerMepFinishHazards() {
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

  // Phase 1: 작업계획서
  const d = GAME._mepDesk || { x: 10, z: 2 };
  GAME.interactables.push({
    mesh: invisTrigger([d.x, 1.0, d.z], 1.4),
    type: 'action', actionId: 'write_mep_plan',
    label: '설비·마감 작업계획서 작성 (E)',
  });

  // Phase 2~5 미니게임으로 대체 (mep_minigame.js 자동 시작)

  // Phase 6: 준공검사 실행 (책상 옆 다른 트리거)
  GAME.interactables.push({
    mesh: invisTrigger([11, 1.0, 4], 1.4),
    type: 'final_inspection',
    label: '준공검사 시작 (E)',
  });
}
