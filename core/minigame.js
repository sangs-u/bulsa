// 공통 미니게임 헬퍼 — 모든 시나리오 행동 기반 미니게임이 공유
// 월드 피드백 우선 (HUD 위젯 없이 3D 오브젝트로 진행 상태 표시)

// 숙련도 카운터
function bumpSkill(toolId) {
  GAME.state.skill = GAME.state.skill || {};
  GAME.state.skill[toolId] = (GAME.state.skill[toolId] || 0) + 1;
}

// 화면 우상단 작은 인디케이터 (모달 아닌, 게임 진행 방해 X)
function showTaskHint(text, color) {
  let el = document.getElementById('task-hint');
  if (!el) {
    el = document.createElement('div');
    el.id = 'task-hint';
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.style.color = color || '#00FFAA';
  el.classList.add('visible');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('visible'), 4000);
}

// 월드 진행 호 (바닥 마커) — 0~1
function buildProgressArc(x, z, color) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.9, 1.0, 24),
    new THREE.MeshBasicMaterial({ color: color || 0xFF3322, side: THREE.DoubleSide, transparent: true, opacity: 0.8 })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(x, 0.02, z);

  const arc = new THREE.Mesh(
    new THREE.RingGeometry(0.5, 0.8, 32, 1, 0, 0.001),
    new THREE.MeshBasicMaterial({ color: 0x00FFAA, side: THREE.DoubleSide })
  );
  arc.rotation.x = -Math.PI / 2;
  arc.position.set(x, 0.03, z);

  GAME.scene.add(ring);
  GAME.scene.add(arc);
  return { ring, arc };
}

function updateProgressArc(arc, ratio) {
  if (!arc) return;
  arc.geometry.dispose();
  arc.geometry = new THREE.RingGeometry(0.5, 0.8, 32, 1, 0, Math.max(0.001, ratio * Math.PI * 2));
}

// 빈 슬롯 마커 (배치 미니게임 — 점선 outline)
function buildSlotMarker(x, z, label) {
  const g = new THREE.Group();
  // 바닥 점선
  const pts = [];
  const segs = 32;
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * 0.8, 0, Math.sin(a) * 0.8));
  }
  const dashGeo = new THREE.BufferGeometry().setFromPoints(pts);
  const dashLine = new THREE.Line(dashGeo, new THREE.LineDashedMaterial({ color: 0xFFAA00, dashSize: 0.2, gapSize: 0.15 }));
  dashLine.computeLineDistances();
  g.add(dashLine);
  // 떠다니는 화살표
  const arrow = new THREE.Mesh(
    new THREE.ConeGeometry(0.18, 0.35, 4),
    new THREE.MeshBasicMaterial({ color: 0xFFAA00 })
  );
  arrow.rotation.x = Math.PI;
  arrow.position.y = 1.5;
  g.add(arrow);
  g._arrow = arrow;
  g.position.set(x, 0.02, z);
  GAME.scene.add(g);
  return g;
}

// 화살표 위아래 진동 (slot marker 어필)
function pulseSlotMarkers(markers, time) {
  markers.forEach(m => {
    if (m && m._arrow) {
      m._arrow.position.y = 1.5 + Math.sin(time * 3) * 0.15;
    }
  });
}

// 슬롯이 채워졌을 때 표지 — 점선 → 녹색 솔리드
function fillSlotMarker(slotMarker, placedMesh) {
  if (!slotMarker) return;
  GAME.scene.remove(slotMarker);
  if (placedMesh) {
    placedMesh.position.copy(slotMarker.position);
    GAME.scene.add(placedMesh);
  }
}

// ── 점검 미니게임 팩토리 (E 키 홀드 패턴) ────────────────────
// config: { id, label, holdTime, range, spots[{label, pos[]}], onComplete }
function createInspectionMinigame(config) {
  const state = {
    active: false,
    holding: false,
    spots: config.spots.map(s => ({ ...s, inspected: false, progress: 0, marker: null })),
    currentIdx: -1,
  };
  const HOLD_TIME = config.holdTime || 1.8;
  const RANGE = config.range || 2.0;

  function start() {
    if (state.active) return;
    state.active = true;
    state.spots.forEach(spot => {
      if (spot.marker && spot.marker.ring) {
        GAME.scene.remove(spot.marker.ring);
        GAME.scene.remove(spot.marker.arc);
      }
      spot.inspected = false; spot.progress = 0;
      spot.marker = buildProgressArc(spot.pos[0], spot.pos[2], 0xFF3322);
    });
    showActionNotif(`🔍 ${config.label} — 마커로 가서 E 키 ${HOLD_TIME}초 홀드`, 4500);
  }

  function end() {
    state.active = false;
    state.holding = false;
    state.currentIdx = -1;
  }

  function update(delta) {
    if (!state.active || !PLAYER || !PLAYER.worldPos) return;
    let nearestIdx = -1, nearestDist = Infinity;
    state.spots.forEach((spot, i) => {
      if (spot.inspected) return;
      const d = Math.hypot(PLAYER.worldPos.x - spot.pos[0], PLAYER.worldPos.z - spot.pos[2]);
      if (d < RANGE && d < nearestDist) { nearestDist = d; nearestIdx = i; }
    });
    state.currentIdx = nearestIdx;

    if (state.holding && nearestIdx >= 0) {
      const spot = state.spots[nearestIdx];
      spot.progress = Math.min(HOLD_TIME, spot.progress + delta);
      updateProgressArc(spot.marker.arc, spot.progress / HOLD_TIME);
      if (spot.progress >= HOLD_TIME) {
        spot.inspected = true;
        spot.marker.ring.material.color.setHex(0x22C55E);
        showActionNotif(`✅ ${spot.label} 점검 완료`, 2000);
        if (state.spots.every(s => s.inspected)) {
          bumpSkill(config.id);
          end();
          if (config.onComplete) config.onComplete();
        }
      }
    } else if (!state.holding && nearestIdx >= 0) {
      const spot = state.spots[nearestIdx];
      if (spot.progress > 0 && !spot.inspected) {
        spot.progress = Math.max(0, spot.progress - delta * 1.5);
        updateProgressArc(spot.marker.arc, spot.progress / HOLD_TIME);
      }
    }
    if (nearestIdx >= 0) {
      const done = state.spots.filter(s => s.inspected).length;
      showTaskHint(`🔍 ${state.spots[nearestIdx].label} — E 키 홀드 (${done}/${state.spots.length})`, '#00FFAA');
    }
  }

  return {
    state,
    start, end, update,
    holdStart: () => { if (state.active) state.holding = true; },
    holdEnd:   () => { if (state.active) state.holding = false; },
  };
}
