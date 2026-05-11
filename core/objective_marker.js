// In-world objective marker — 가장 가까운 인터랙터블 위에 펄스 아이콘.
// 플레이어가 어디로 가야 할지 직관적으로 알게 함 (Minecraft 가이드 화살표 스타일).

(function () {
  'use strict';
  if (typeof window === 'undefined') return;

  const MARKER = {
    mesh: null,
    target: null,
    enabled: true,
    time: 0,
  };
  window.OBJECTIVE_MARKER = MARKER;

  function _build() {
    if (MARKER.mesh) return;
    // 화살표 모양 (아래를 가리키는 원뿔 + 반투명 디스크)
    const group = new THREE.Group();
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.18, 0.42, 8),
      new THREE.MeshBasicMaterial({ color: 0x48BB78, transparent: true, opacity: 0.85, depthWrite: false })
    );
    cone.rotation.x = Math.PI;        // 아래로 향함
    cone.position.y = 0.45;
    group.add(cone);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.22, 0.3, 16),
      new THREE.MeshBasicMaterial({ color: 0x48BB78, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.04;
    group.add(ring);

    group.renderOrder = 999;
    group.visible = false;
    GAME.scene.add(group);
    MARKER.mesh = group;
  }

  function _pickTarget() {
    if (!GAME.interactables || GAME.interactables.length === 0) return null;
    // 현재 phase 기준 eligible 인 것 + currentTarget 우선
    const curTarget = (typeof INTERACTION !== 'undefined') ? INTERACTION.currentTarget : null;
    if (curTarget && curTarget.mesh) return curTarget.mesh;
    // phase 기준 첫 eligible — 시나리오별 함수 호출
    let phase = null;
    const phaseFns = {
      lifting:    'getCurrentPhase',
      excavation: 'getCurrentExcavPhase',
      foundation: 'getCurrentFoundPhase',
      envelope:   'getCurrentEnvPhase',
      mep_finish: 'getCurrentMepPhase',
    };
    const fnName = phaseFns[GAME.scenarioId];
    if (fnName && typeof window[fnName] === 'function') {
      try { phase = window[fnName](); } catch (e) {}
    }
    const eligible = GAME.interactables.filter(i =>
      i.mesh && i.mesh.parent && (i.phase == null || i.phase === phase)
    );
    if (eligible.length === 0) return null;
    // 플레이어와 가장 가까운 것
    if (!PLAYER || !PLAYER.worldPos) return eligible[0].mesh;
    let best = null, bestD = Infinity;
    for (const it of eligible) {
      const wp = new THREE.Vector3();
      it.mesh.getWorldPosition(wp);
      const d = wp.distanceTo(PLAYER.worldPos);
      if (d < bestD) { bestD = d; best = it.mesh; }
    }
    return best;
  }

  function update(delta) {
    if (!MARKER.enabled) return;
    if (!GAME.state.gameStarted || GAME.state.gameOver || GAME.state.paused) {
      if (MARKER.mesh) MARKER.mesh.visible = false;
      return;
    }
    if (!MARKER.mesh) _build();

    MARKER.time += delta;
    const target = _pickTarget();
    if (!target) {
      MARKER.mesh.visible = false;
      return;
    }
    MARKER.target = target;
    const wp = new THREE.Vector3();
    target.getWorldPosition(wp);
    MARKER.mesh.position.set(wp.x, wp.y + 2.0 + Math.sin(MARKER.time * 3) * 0.15, wp.z);
    MARKER.mesh.rotation.y = MARKER.time * 1.2;
    const pulse = 0.85 + Math.sin(MARKER.time * 4) * 0.15;
    MARKER.mesh.children.forEach(c => {
      if (c.material) c.material.opacity = c.material._baseOpacity || c.material.opacity;
    });
    MARKER.mesh.scale.setScalar(pulse);
    MARKER.mesh.visible = true;
  }

  window.updateObjectiveMarker = update;
})();
