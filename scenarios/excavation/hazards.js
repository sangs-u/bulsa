// S — 토공사 인터랙터블 — 6단계 전부 매핑

function registerExcavationHazards() {
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
  const d = GAME._excavDesk || { x: 10, z: 2 };
  GAME.interactables.push({
    mesh: invisTrigger([d.x, 1.0, d.z], 1.4),
    type: 'action', actionId: 'write_excav_plan',
    label: '토공 작업계획서 작성 (E)',
  });

  // Phase 2: 매설물 탐지기 미니게임 (행동 기반)
  // 별도 클릭 트리거 없음 — Phase 2 진입 시 자동 활성화, SPACE로 마킹

  // Phase 3: 흙막이 점검 미니게임 (행동 기반)
  // 별도 클릭 트리거 없음 — Phase 2 완료 시 자동 활성화, E 키 홀드

  // Phase 4: 안전난간 설치 트리거 (반대쪽 모서리)
  GAME.interactables.push({
    mesh: invisTrigger([-6, 1.0, -17], 1.6),
    type: 'action', actionId: 'install_railing',
    label: '안전난간 설치 (E)', phase: 4,
  });

  // Phase 5: 신호수 배치 (굴착기 옆)
  GAME.interactables.push({
    mesh: invisTrigger([-10, 1.0, -10], 1.6),
    type: 'action', actionId: 'assign_signal_excav',
    label: '신호수 위치 지정 (E)', phase: 5,
  });

  // Phase 6: 굴착기 운전석 진입
  GAME.interactables.push({
    mesh: invisTrigger([-13, 2.0, -8], 1.8),
    type: 'excav_cab',
    label: '굴착기 운전석 탑승 (E)',
  });
}
