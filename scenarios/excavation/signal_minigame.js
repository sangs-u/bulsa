// 토공 Phase 5 — 신호수 배치 미니게임 (배치 패턴)
// 신호수 NPC를 굴착기 작업반경 밖, 가시성 확보된 위치에 배치

const SIGNAL = {
  active: false,
  ghostMesh: null,
  placed: false,
  // 굴착기 위치 (반경 6m 밖에 두어야 함)
  excavatorPos: { x: -13, z: -8 },
  excavatorRadius: 6.0,
  // 가시성 거리 (운전실에서 20m 이내)
  visibilityRadius: 20.0,
};

function startSignalPlacement() {
  if (SIGNAL.active) return;
  SIGNAL.active = true;
  SIGNAL.placed = false;
  if (typeof DELEGATION_CHOICE !== 'undefined') {
    DELEGATION_CHOICE.current = {
      config: { id: '신호수배치', label: '신호수 배치', trade: 'signal' },
      game: {
        delegateToNPC: (npcId) => assignTaskToNPC(npcId, '신호수 배치', [5, 0, 0], 5.0, () => {
          EXCAV_STATE.signalAssigned = true;
          endSignalPlacement();
          GAME.state.phase = getCurrentPhase();
          updateHUD();
          showActionNotif(({ ko:'🎉 신호수 배치 완료 (위임) — 굴착기 운전원 호출', en:'🎉 Signaller placed (delegated) — call excavator operator', vi:'🎉 Đã bố trí người ra hiệu (ủy quyền) — gọi tài xế máy đào', ar:'🎉 تم تعيين الإشاري (تفويض) — اتصل بمشغل الحفارة' })[currentLang] || '🎉 신호수 배치 완료 (위임) — 굴착기 운전원 호출', 4000);
        }),
      },
    };
  }

  // 고스트 신호수 NPC (반투명)
  if (SIGNAL.ghostMesh) GAME.scene.remove(SIGNAL.ghostMesh);
  const g = new THREE.Group();
  const vestMat = new THREE.MeshLambertMaterial({ color: 0xFF6F00, transparent: true, opacity: 0.5 });
  const helmMat = new THREE.MeshLambertMaterial({ color: 0xFFCC00, transparent: true, opacity: 0.5 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.7, 0.28), vestMat);
  torso.position.y = 1.0;
  g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), helmMat);
  head.position.y = 1.55;
  g.add(head);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.19, 14, 10, 0, Math.PI*2, 0, Math.PI/2), helmMat);
  helmet.position.y = 1.62;
  g.add(helmet);
  GAME.scene.add(g);
  SIGNAL.ghostMesh = g;

  showActionNotif(({ ko:'🦺 신호수 배치 — 작업반경 밖 & 운전실 시야 확보되는 위치에서 E 키', en:'🦺 Place signaller — outside swing radius & visible to cab, press E', vi:'🦺 Bố trí người ra hiệu — ngoài bán kính làm việc & nhìn thấy cabin, nhấn E', ar:'🦺 ضع الإشاري — خارج نطاق العمل وضمن رؤية الكابينة، اضغط E' })[currentLang] || '🦺 신호수 배치 — 작업반경 밖 & 운전실 시야 확보되는 위치에서 E 키', 5000);
}

function endSignalPlacement() {
  SIGNAL.active = false;
}

function updateSignalPlacement() {
  if (!SIGNAL.active || !PLAYER || !PLAYER.worldPos) return;

  // 고스트가 플레이어 약간 옆에 따라옴
  if (SIGNAL.ghostMesh) {
    const yaw = PLAYER.euler.y;
    const offX = Math.cos(yaw) * 1.2;
    const offZ = -Math.sin(yaw) * 1.2;
    SIGNAL.ghostMesh.position.set(
      PLAYER.worldPos.x + offX,
      0,
      PLAYER.worldPos.z + offZ
    );
    SIGNAL.ghostMesh.rotation.y = yaw + Math.PI;
  }

  // 유효 위치 판정
  const status = _evaluatePlacement();
  // 고스트 색 변경 (녹색=OK, 붉은색=위험)
  if (SIGNAL.ghostMesh) {
    const color = status.ok ? 0x22C55E : 0xEF4444;
    SIGNAL.ghostMesh.traverse(c => {
      if (c.material && c.material.color) c.material.color.setHex(color);
    });
  }
  if (typeof showTaskHint === 'function') {
    showTaskHint(status.hint, status.ok ? '#22C55E' : '#EF4444');
  }
}

function _evaluatePlacement() {
  if (!PLAYER) return { ok: false, hint: '' };
  const px = PLAYER.worldPos.x, pz = PLAYER.worldPos.z;
  const ex = SIGNAL.excavatorPos.x, ez = SIGNAL.excavatorPos.z;
  const distToExcav = Math.hypot(px - ex, pz - ez);

  if (distToExcav < SIGNAL.excavatorRadius) {
    return { ok: false, hint: `🚨 너무 가까움 — 작업반경 ${SIGNAL.excavatorRadius}m 밖으로 (${distToExcav.toFixed(1)}m)` };
  }
  if (distToExcav > SIGNAL.visibilityRadius) {
    return { ok: false, hint: `⚠ 너무 멀음 — 운전실 시야 밖 (${distToExcav.toFixed(1)}m)` };
  }
  // 굴착 구덩이(0,-17) 안에 있으면 위험
  const distToPit = Math.hypot(px - 0, pz - (-17));
  if (distToPit < 7) {
    return { ok: false, hint: '⚠ 굴착 구덩이 안 — 외곽으로' };
  }
  return { ok: true, hint: '✅ 적합한 위치 — E 키 배치' };
}

function tryPlaceSignal() {
  if (!SIGNAL.active) return false;
  const status = _evaluatePlacement();
  if (!status.ok) {
    showActionNotif((({ ko:'⚠ 부적합한 위치 — ', en:'⚠ Invalid position — ', vi:'⚠ Vị trí không hợp lệ — ', ar:'⚠ موقع غير صالح — ' })[currentLang] || '⚠ 부적합한 위치 — ') + status.hint, 2500);
    return false;
  }
  // 고스트를 실체화 (불투명) — 이 위치에 고정
  if (SIGNAL.ghostMesh) {
    SIGNAL.ghostMesh.traverse(c => {
      if (c.material) { c.material.opacity = 1.0; c.material.transparent = false; }
    });
    // 위치 고정 (더 이상 플레이어 안 따라옴)
  }
  SIGNAL.placed = true;
  bumpSkill('신호수배치');
  EXCAV_STATE.signalAssigned = true;
  endSignalPlacement();
  GAME.state.phase = getCurrentPhase();
  updateHUD();
  showActionNotif(({ ko:'🎉 신호수 배치 완료 — 굴착기 운전석 탑승 가능', en:'🎉 Signaller placed — you may board the excavator', vi:'🎉 Đã bố trí người ra hiệu — có thể lên cabin máy đào', ar:'🎉 تم تعيين الإشاري — يمكنك ركوب الحفارة' })[currentLang] || '🎉 신호수 배치 완료 — 굴착기 운전석 탑승 가능', 4000);
  return true;
}
