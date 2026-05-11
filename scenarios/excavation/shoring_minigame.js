// 토공 Phase 3 — 흙막이 점검 미니게임 (행동 중심)
// 굴착 외곽 H-pile 4개 코너에 가서 E 키 홀드(1.8초)로 점검

const SHORING = {
  active: false,
  spots: [
    { id: 'NW', label: '북서 코너 H-pile', pos: [-6, 0, -11.5], inspected: false, marker: null, progress: 0 },
    { id: 'NE', label: '북동 코너 H-pile', pos: [ 6, 0, -11.5], inspected: false, marker: null, progress: 0 },
    { id: 'SW', label: '남서 코너 H-pile', pos: [-6, 0, -22.5], inspected: false, marker: null, progress: 0 },
    { id: 'SE', label: '남동 코너 H-pile', pos: [ 6, 0, -22.5], inspected: false, marker: null, progress: 0 },
  ],
  holding: false,
  currentSpotIdx: -1,
  HOLD_TIME: 1.8,    // 초
  RANGE: 2.0,        // 점검 가능 반경 (m)
};

function startShoringInspection() {
  if (SHORING.active) return;
  SHORING.active = true;

  // 4개 지점에 마커 (붉은 → 점검 시 진행 → 녹색)
  SHORING.spots.forEach(spot => {
    if (spot.marker) GAME.scene.remove(spot.marker);
    spot.inspected = false;
    spot.progress = 0;

    const g = new THREE.Group();
    // 바닥 원 (붉은색 — 미점검)
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 1.0, 24),
      new THREE.MeshBasicMaterial({ color: 0xFF3322, side: THREE.DoubleSide, transparent: true, opacity: 0.8 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    g.add(ring);
    // 진행 호 (안쪽)
    const arc = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 0.8, 32, 1, 0, 0.001),  // 빈 상태로 시작
      new THREE.MeshBasicMaterial({ color: 0x00FFAA, side: THREE.DoubleSide })
    );
    arc.rotation.x = -Math.PI / 2;
    arc.position.y = 0.03;
    g.add(arc);
    // 수직 표시봉
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 1.6, 8),
      new THREE.MeshLambertMaterial({ color: 0xFF3322 })
    );
    pole.position.y = 0.8;
    g.add(pole);
    // 표지판 (상단 깃발)
    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(0.3, 0.2),
      new THREE.MeshLambertMaterial({ color: 0xFF3322, side: THREE.DoubleSide })
    );
    flag.position.set(0.18, 1.6, 0);
    g.add(flag);
    g.position.set(spot.pos[0], spot.pos[1], spot.pos[2]);
    GAME.scene.add(g);
    spot.marker = { group: g, ring, arc, pole, flag };
  });

  showActionNotif('🔍 흙막이 점검 — 4개 H-pile 코너에 가서 E 키 길게 누르기 (1.8초)', 5000);
  _renderShoringHUD();
}

function endShoringInspection() {
  SHORING.active = false;
  SHORING.holding = false;
  SHORING.currentSpotIdx = -1;
}

function updateShoring(delta) {
  if (!SHORING.active || !PLAYER || !PLAYER.worldPos) return;

  // 플레이어 근처 미점검 spot 찾기
  let nearestIdx = -1, nearestDist = Infinity;
  SHORING.spots.forEach((spot, i) => {
    if (spot.inspected) return;
    const d = Math.hypot(PLAYER.worldPos.x - spot.pos[0], PLAYER.worldPos.z - spot.pos[2]);
    if (d < SHORING.RANGE && d < nearestDist) {
      nearestDist = d;
      nearestIdx = i;
    }
  });
  SHORING.currentSpotIdx = nearestIdx;

  // E 키 홀드 진행도
  if (SHORING.holding && nearestIdx >= 0) {
    const spot = SHORING.spots[nearestIdx];
    spot.progress = Math.min(SHORING.HOLD_TIME, spot.progress + delta);
    _updateSpotMarker(spot);
    if (spot.progress >= SHORING.HOLD_TIME) {
      _completeSpot(spot);
    }
  } else if (!SHORING.holding && nearestIdx >= 0) {
    const spot = SHORING.spots[nearestIdx];
    if (spot.progress > 0 && !spot.inspected) {
      spot.progress = Math.max(0, spot.progress - delta * 1.5);
      _updateSpotMarker(spot);
    }
  }

  // 우상단 미니 힌트
  if (nearestIdx >= 0 && typeof showTaskHint === 'function') {
    const done = SHORING.spots.filter(s => s.inspected).length;
    const total = SHORING.spots.length;
    showTaskHint(`🔍 ${SHORING.spots[nearestIdx].label} — E 키 홀드 (${done}/${total})`, '#00FFAA');
  }
}

function _updateSpotMarker(spot) {
  if (!spot.marker) return;
  const ratio = spot.progress / SHORING.HOLD_TIME;
  // 진행 호 업데이트
  const newArc = new THREE.RingGeometry(0.5, 0.8, 32, 1, 0, ratio * Math.PI * 2);
  spot.marker.arc.geometry.dispose();
  spot.marker.arc.geometry = newArc;
}

function _completeSpot(spot) {
  spot.inspected = true;
  // 색을 녹색으로
  if (spot.marker) {
    spot.marker.ring.material.color.setHex(0x22C55E);
    spot.marker.pole.material.color.setHex(0x22C55E);
    spot.marker.flag.material.color.setHex(0x22C55E);
  }
  showActionNotif(`✅ ${spot.label} 점검 완료 (${SHORING.spots.filter(s => s.inspected).length}/${SHORING.spots.length})`, 2500);

  if (SHORING.spots.every(s => s.inspected)) {
    _bumpSkill('흙막이점검');
    EXCAV_STATE.shoringInstalled = true;
    endShoringInspection();
    GAME.state.phase = getCurrentPhase();
    updateHUD();
    showActionNotif('🎉 흙막이 점검 완료 — 안전난간 설치 단계', 4000);
    // Phase 4 자동 진입
    setTimeout(() => {
      if (typeof startRailingInstall === 'function') startRailingInstall();
    }, 1500);
  }
}

// E 키 down/up 처리 (interaction.js 에서 호출)
function shoringHoldStart() {
  if (SHORING.active) SHORING.holding = true;
}
function shoringHoldEnd() {
  if (SHORING.active) SHORING.holding = false;
}
