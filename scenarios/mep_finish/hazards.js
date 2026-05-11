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

  // Phase 2: LOTO 잠금 (분전반)
  GAME.interactables.push({
    mesh: invisTrigger([-4.3, 1.4, -11.5], 1.4),
    type: 'action', actionId: 'apply_loto',
    label: 'LOTO 잠금·표지 부착 (E)', phase: 2,
  });

  // Phase 3: 가스누설 점검 (가스 밸브)
  GAME.interactables.push({
    mesh: invisTrigger([-5.5, 0.8, -11.9], 1.2),
    type: 'action', actionId: 'check_gas_leak',
    label: '가스누설 점검 (E)', phase: 3,
  });

  // Phase 4: 환기 가동 (환기 그릴 옆)
  GAME.interactables.push({
    mesh: invisTrigger([4.3, 1.5, -11.5], 1.4),
    type: 'action', actionId: 'activate_ventilation',
    label: '환기·국소배기 가동 (E)', phase: 4,
  });

  // Phase 5: 소화기 배치 점검 (소화기 옆)
  GAME.interactables.push({
    mesh: invisTrigger([-4, 0.6, -8], 1.2),
    type: 'action', actionId: 'verify_extinguishers',
    label: '소화기 배치 점검 (E)', phase: 5,
  });

  // Phase 6: 준공검사 실행 (책상 옆 다른 트리거)
  GAME.interactables.push({
    mesh: invisTrigger([11, 1.0, 4], 1.4),
    type: 'final_inspection',
    label: '준공검사 시작 (E)',
  });
}
