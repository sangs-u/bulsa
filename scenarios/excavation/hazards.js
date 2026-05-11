// S — 토공사 인터랙터블 (placeholder)
// 양중 시나리오와 동일 구조로 확장 예정 — 현재는 골조만.

function registerExcavationHazards() {
  const scene = GAME.scene;
  GAME.hazards      = [];
  GAME.interactables = [];

  // 책상 트리거 (작업계획서)
  const deskTrigger = new THREE.Mesh(
    new THREE.SphereGeometry(1.2, 8, 6),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  const d = GAME._excavDesk || { x: 10, y: 1.0, z: 2 };
  deskTrigger.position.set(d.x, 1.0, d.z);
  scene.add(deskTrigger);
  GAME.interactables.push({
    mesh: deskTrigger, type: 'action', actionId: 'write_excav_plan',
    label: '토공 작업계획서 작성 (E)',
  });

  // TODO: 매설물 도면 / 흙막이 설치 트리거 / 굴착기 운전석 / 안전난간 트리거
  // 각 인터랙터블은 EXCAV_STATE 항목과 1:1 매핑
}
