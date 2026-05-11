// 토공 Phase 4 — 안전난간 설치 미니게임 (배치 패턴)
// 굴착 외곽 4개 슬롯에 가서 E 키로 안전난간 섹션 설치

const RAILING = {
  active: false,
  slots: [
    { id: 'N', label: '북측 난간', pos: [0, 0, -10.5], placed: false, slotMarker: null },
    { id: 'S', label: '남측 난간', pos: [0, 0, -23.5], placed: false, slotMarker: null },
    { id: 'E', label: '동측 난간', pos: [6.5, 0, -17], placed: false, slotMarker: null },
    { id: 'W', label: '서측 난간', pos: [-6.5, 0, -17], placed: false, slotMarker: null },
  ],
  RANGE: 1.8,
};

function startRailingInstall() {
  if (RAILING.active) return;
  RAILING.active = true;
  if (typeof DELEGATION_CHOICE !== 'undefined') {
    DELEGATION_CHOICE.current = {
      config: { id: '안전난간', label: '안전난간 설치', trade: 'earthworks' },
      game: {
        delegateToNPC: (npcId) => assignTaskToNPC(npcId, '안전난간 설치', [0, 0, -17], 8.0, () => {
          RAILING.slots.forEach(s => {
            if (s.slotMarker) GAME.scene.remove(s.slotMarker);
            s.placed = true;
            const rail = _buildRailingMesh(s.pos);
            GAME.scene.add(rail);
          });
          EXCAV_STATE.railingInstalled = true;
          endRailingInstall();
          GAME.state.phase = getCurrentPhase();
          updateHUD();
          showActionNotif('🎉 안전난간 설치 완료 (위임) — 신호수 단계', 4000);
          setTimeout(() => { if (typeof startSignalPlacement === 'function') startSignalPlacement(); }, 1500);
        }),
      },
    };
  }

  RAILING.slots.forEach(slot => {
    if (slot.slotMarker) GAME.scene.remove(slot.slotMarker);
    slot.placed = false;
    slot.slotMarker = (typeof buildSlotMarker === 'function')
      ? buildSlotMarker(slot.pos[0], slot.pos[2], slot.label)
      : null;
  });
  showActionNotif('🛡 안전난간 4면 설치 — 각 슬롯에서 E 키 누르기', 4500);
}

function endRailingInstall() {
  RAILING.active = false;
}

function updateRailing(time) {
  if (!RAILING.active) return;
  // 슬롯 마커 화살표 진동
  if (typeof pulseSlotMarkers === 'function') {
    pulseSlotMarkers(RAILING.slots.map(s => s.slotMarker), time);
  }

  // 가까운 미설치 슬롯
  let nearestIdx = -1, nearestDist = Infinity;
  RAILING.slots.forEach((slot, i) => {
    if (slot.placed) return;
    const d = Math.hypot(PLAYER.worldPos.x - slot.pos[0], PLAYER.worldPos.z - slot.pos[2]);
    if (d < RAILING.RANGE && d < nearestDist) { nearestDist = d; nearestIdx = i; }
  });

  if (nearestIdx >= 0 && typeof showTaskHint === 'function') {
    const done = RAILING.slots.filter(s => s.placed).length;
    showTaskHint(`🛡 ${RAILING.slots[nearestIdx].label} 설치 위치 — E 키`, '#FFAA00');
  }
  RAILING._nearestIdx = nearestIdx;
}

// E 키 호출 (interaction.js 에서 RAILING.active 시 호출)
function tryPlaceRailing() {
  if (!RAILING.active || RAILING._nearestIdx === undefined || RAILING._nearestIdx < 0) return false;
  const slot = RAILING.slots[RAILING._nearestIdx];

  // 안전난간 메시 (3단)
  const railing = _buildRailingMesh(slot.pos);
  GAME.scene.add(railing);
  // 슬롯 마커 제거
  if (slot.slotMarker) GAME.scene.remove(slot.slotMarker);
  slot.slotMarker = null;
  slot.placed = true;

  showActionNotif(`✅ ${slot.label} 설치 완료 (${RAILING.slots.filter(s => s.placed).length}/${RAILING.slots.length})`, 2500);

  if (RAILING.slots.every(s => s.placed)) {
    bumpSkill('안전난간');
    EXCAV_STATE.railingInstalled = true;
    endRailingInstall();
    GAME.state.phase = getCurrentPhase();
    updateHUD();
    showActionNotif('🎉 안전난간 설치 완료 — 신호수 배치 단계', 4000);
    setTimeout(() => {
      if (typeof startSignalPlacement === 'function') startSignalPlacement();
    }, 1500);
  }
  return true;
}

function _buildRailingMesh(pos) {
  const g = new THREE.Group();
  const postMat = new THREE.MeshLambertMaterial({ color: 0x22C55E });
  const railMat = new THREE.MeshLambertMaterial({ color: 0xFFEEEE });

  // 변의 길이 (북/남: x방향, 동/서: z방향) — 단순화: 일률 2m 섹션
  const len = 2.0;
  // 변 결정: x 가 우세하면 가로, z 가 우세하면 세로
  const isHorizontal = Math.abs(pos[2]) > Math.abs(pos[0]) - 1; // pos.z에 큰 값이면 north/south
  // 포스트 (양 끝 + 중앙)
  for (let i = -1; i <= 1; i++) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.0, 8), postMat);
    if (isHorizontal) post.position.set(i * len/2, 0.5, 0);
    else              post.position.set(0, 0.5, i * len/2);
    g.add(post);
  }
  // 상부·중간 레일
  [0.85, 0.45].forEach(rh => {
    const rail = new THREE.Mesh(
      isHorizontal
        ? new THREE.BoxGeometry(len, 0.05, 0.05)
        : new THREE.BoxGeometry(0.05, 0.05, len),
      railMat
    );
    rail.position.set(0, rh, 0);
    g.add(rail);
  });
  g.position.set(pos[0], 0, pos[2]);
  return g;
}
