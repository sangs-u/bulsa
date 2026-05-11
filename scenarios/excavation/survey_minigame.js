// 토공 Phase 2 — 매설물 탐지기 미니게임 (행동 중심)
// 플레이어가 부지를 직접 돌아다니며 묻힌 가스·전기 라인을 탐지기로 찾고 SPACE로 마킹

const SURVEY = {
  active: false,
  // 묻힌 라인 — segment [x1, z1, x2, z2], 신호 반경 2m 이내 시 강도 100
  lines: [
    { id: 'gas',      name: '도시가스관',  segment: [-15, -5, 15, -5],   color: 0xFFCC00, found: false, markerMesh: null },
    { id: 'electric', name: '전기 매설관', segment: [-18, -25, -18, -2], color: 0xCC2222, found: false, markerMesh: null },
    { id: 'water',    name: '수도관',      segment: [-3, -2, -3, -25],   color: 0x2B6CB0, found: false, markerMesh: null },
  ],
  scanSweepMesh: null,
  scanAngle: 0,
};

function startSurvey() {
  if (SURVEY.active) return;
  SURVEY.active = true;
  // 위임 등록
  if (typeof DELEGATION_CHOICE !== 'undefined') {
    DELEGATION_CHOICE.current = {
      config: { id: '매설물탐지', label: '매설물 사전조사', trade: 'earthworks' },
      game: {
        delegateToNPC: (npcId) => assignTaskToNPC(npcId, '매설물 사전조사', [0, 0, -5], 6.0, () => {
          SURVEY.lines.forEach(l => { l.found = true; });
          EXCAV_STATE.surveyDone = true;
          endSurvey();
          GAME.state.phase = getCurrentPhase();
          updateHUD();
          showActionNotif('🎉 매설물 사전조사 완료 (위임) — 흙막이 단계', 4000);
          setTimeout(() => { if (typeof startShoringInspection === 'function') startShoringInspection(); }, 1500);
        }),
      },
    };
  }
  // 이전 발견 마커 초기화
  SURVEY.lines.forEach(l => {
    if (l.markerMesh) GAME.scene.remove(l.markerMesh);
    l.markerMesh = null;
    l.found = false;
  });

  // 탐지기 스캔 시각화 (플레이어 발 밑 원)
  if (!SURVEY.scanSweepMesh) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(2.2, 2.5, 32),
      new THREE.MeshBasicMaterial({ color: 0x00FFAA, side: THREE.DoubleSide, transparent: true, opacity: 0.4 })
    );
    ring.rotation.x = -Math.PI / 2;
    GAME.scene.add(ring);
    SURVEY.scanSweepMesh = ring;
  }
  SURVEY.scanSweepMesh.visible = true;

  showActionNotif('📡 탐지기 활성화 — 부지를 수색하세요. 신호 강할 때 SPACE 로 마크', 5000);
}

function endSurvey() {
  SURVEY.active = false;
  if (SURVEY.scanSweepMesh) SURVEY.scanSweepMesh.visible = false;
}

function updateSurvey() {
  if (!SURVEY.active || !PLAYER || !PLAYER.worldPos) return;

  // 스캔 링을 플레이어 발 밑에 따라다님
  if (SURVEY.scanSweepMesh) {
    SURVEY.scanSweepMesh.position.set(PLAYER.worldPos.x, 0.04, PLAYER.worldPos.z);
    // 미세 회전 효과
    SURVEY.scanAngle += 0.04;
    SURVEY.scanSweepMesh.rotation.z = SURVEY.scanAngle;
  }

  // 가장 가까운 미발견 라인까지의 거리
  let minDist = Infinity, nearestIdx = -1;
  SURVEY.lines.forEach((l, i) => {
    if (l.found) return;
    const d = _distToSegment(PLAYER.worldPos.x, PLAYER.worldPos.z, l.segment);
    if (d < minDist) { minDist = d; nearestIdx = i; }
  });

  // 신호 강도 (0~100) — 1.5m 이내 100, 12m+ 0
  let signal = 0;
  if (nearestIdx >= 0) {
    signal = Math.max(0, Math.min(100, (1 - (minDist - 0.5) / 11) * 100));
  }

  // 월드 피드백 — 스캔 링 크기·색이 신호 강도에 따라 변함
  if (SURVEY.scanSweepMesh) {
    const r = 1.5 + (1 - signal/100) * 2.0;
    SURVEY.scanSweepMesh.scale.set(r/2.2, r/2.2, 1);
    SURVEY.scanSweepMesh.material.color.setHex(
      signal > 75 ? 0xFF3322 : signal > 35 ? 0xF59E0B : 0x00FFAA
    );
    SURVEY.scanSweepMesh.material.opacity = 0.3 + signal/400;
  }
  // 우상단 살짝 힌트 (게임 진행 방해 X)
  const found = SURVEY.lines.filter(l => l.found).length;
  const total = SURVEY.lines.length;
  if (signal > 80) {
    if (typeof showTaskHint === 'function') showTaskHint(`📡 매우 강함 (${found}/${total}) — SPACE 마크`, '#FF3322');
  }
}

function tryMarkSurvey() {
  if (!SURVEY.active) return false;

  // 1.8m 이내 미발견 라인 찾기
  let minDist = Infinity, nearestIdx = -1;
  SURVEY.lines.forEach((l, i) => {
    if (l.found) return;
    const d = _distToSegment(PLAYER.worldPos.x, PLAYER.worldPos.z, l.segment);
    if (d < minDist) { minDist = d; nearestIdx = i; }
  });

  if (minDist > 1.8 || nearestIdx < 0) {
    showActionNotif('⚠ 신호 약함 — 더 가까이 이동', 1500);
    return false;
  }

  // 마킹: 발견 위치에 깃발 + 라인 색
  const line = SURVEY.lines[nearestIdx];
  line.found = true;
  _placeSurveyFlag(line, PLAYER.worldPos.x, PLAYER.worldPos.z);
  showActionNotif(`✅ ${line.name} 발견 (${SURVEY.lines.filter(l => l.found).length}/${SURVEY.lines.length})`, 2500);

  // 모두 발견했으면 phase 진행
  if (SURVEY.lines.every(l => l.found)) {
    _bumpSkill('매설물탐지');
    EXCAV_STATE.surveyDone = true;
    endSurvey();
    GAME.state.phase = getCurrentPhase();
    updateHUD();
    showActionNotif('🎉 모든 매설물 발견 — 흙막이 점검 단계 시작', 4000);
    // Phase 3 자동 진입 — 흙막이 점검 미니게임 시작
    setTimeout(() => {
      if (typeof startShoringInspection === 'function') startShoringInspection();
    }, 1500);
  }
  return true;
}

function _placeSurveyFlag(line, px, pz) {
  const poleMat = new THREE.MeshLambertMaterial({ color: 0xCCCCCC });
  const flagMat = new THREE.MeshLambertMaterial({ color: line.color, side: THREE.DoubleSide });
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.4, 8), poleMat);
  pole.position.set(0, 0.7, 0);
  g.add(pole);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.3), flagMat);
  flag.position.set(0.27, 1.2, 0);
  g.add(flag);
  g.position.set(px, 0, pz);
  GAME.scene.add(g);
  line.markerMesh = g;

  // 그리고 발견된 매설라인을 지상에 점선으로 가시화
  const dashPts = [];
  const [x1, z1, x2, z2] = line.segment;
  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    dashPts.push(new THREE.Vector3(x1 + (x2-x1)*t, 0.02, z1 + (z2-z1)*t));
  }
  const dashGeo = new THREE.BufferGeometry().setFromPoints(dashPts);
  const dashLine = new THREE.Line(dashGeo, new THREE.LineDashedMaterial({ color: line.color, dashSize: 0.4, gapSize: 0.2 }));
  dashLine.computeLineDistances();
  GAME.scene.add(dashLine);
}

function _distToSegment(px, pz, seg) {
  const [x1, z1, x2, z2] = seg;
  const dx = x2 - x1, dz = z2 - z1;
  const lenSq = dx*dx + dz*dz;
  if (lenSq < 1e-6) return Math.hypot(px - x1, pz - z1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (pz - z1) * dz) / lenSq));
  return Math.hypot(px - (x1 + t * dx), pz - (z1 + t * dz));
}

// 숙련도 카운터 (core/minigame.js bumpSkill 별칭 — 호환용)
function _bumpSkill(toolId) {
  if (typeof bumpSkill === 'function') bumpSkill(toolId);
}
