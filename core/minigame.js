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

// ── 점검 미니게임 팩토리 (E 키 홀드 패턴 + Q 위임) ────────────
// config: { id, label, holdTime, range, trade, spots[{label, pos[]}], onComplete }
function createInspectionMinigame(config) {
  // 숙련도 기반 홀드시간 단축
  const baseHold = config.holdTime || 1.8;
  const baseRange = config.range || 2.0;
  const state = {
    active: false,
    holding: false,
    spots: config.spots.map(s => ({ ...s, inspected: false, progress: 0, marker: null })),
    currentIdx: -1,
    config,
  };

  function _effectiveHold() {
    return typeof applySkillToHold === 'function'
      ? applySkillToHold(baseHold, config.id) : baseHold;
  }
  function _effectiveRange() {
    return typeof applySkillToRange === 'function'
      ? applySkillToRange(baseRange, config.id) : baseRange;
  }

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
    const lvHint = typeof getSkillLevel === 'function'
      ? ` (Lv.${getSkillLevel(config.id)} 적용 ${_effectiveHold().toFixed(1)}s)` : '';
    showActionNotif(`🔍 ${config.label} — [E] 직접 ${baseHold.toFixed(1)}s${lvHint} · [Q] 동료 위임`, 5500);
    // 위임 선택지 활성화 (이 mini-game이 현재 활성이므로 dispatcher가 인식)
    DELEGATION_CHOICE.current = { game: api, config };
  }

  function end() {
    state.active = false;
    state.holding = false;
    state.currentIdx = -1;
    if (DELEGATION_CHOICE.current && DELEGATION_CHOICE.current.game === api) {
      DELEGATION_CHOICE.current = null;
    }
  }

  // 동료 위임 — 모든 spot 을 NPC 가 순차 처리한다고 가정 (총 시간 = spot수 × hold)
  function delegateToNPC(npcId) {
    if (!state.active) return false;
    const baseTime = state.spots.length * baseHold + state.spots.length * 1.0; // 점검 + 이동시간
    return assignTaskToNPC(npcId, config.label, state.spots[0].pos, baseTime, () => {
      // 위임 완료 — 모든 spot 즉시 완료 처리 (시각적으로만)
      state.spots.forEach(s => {
        s.inspected = true;
        if (s.marker && s.marker.ring) s.marker.ring.material.color.setHex(0x22C55E);
      });
      end();
      if (config.onComplete) config.onComplete();
    });
  }

  function update(delta) {
    if (!state.active || !PLAYER || !PLAYER.worldPos) return;
    const HOLD = _effectiveHold();
    const RANGE = _effectiveRange();
    let nearestIdx = -1, nearestDist = Infinity;
    state.spots.forEach((spot, i) => {
      if (spot.inspected) return;
      const d = Math.hypot(PLAYER.worldPos.x - spot.pos[0], PLAYER.worldPos.z - spot.pos[2]);
      if (d < RANGE && d < nearestDist) { nearestDist = d; nearestIdx = i; }
    });
    state.currentIdx = nearestIdx;

    if (state.holding && nearestIdx >= 0) {
      const spot = state.spots[nearestIdx];
      spot.progress = Math.min(HOLD, spot.progress + delta);
      updateProgressArc(spot.marker.arc, spot.progress / HOLD);
      if (spot.progress >= HOLD) {
        spot.inspected = true;
        spot.marker.ring.material.color.setHex(0x22C55E);
        showActionNotif(`✅ ${spot.label} 점검 완료`, 2000);
        if (state.spots.every(s => s.inspected)) {
          bumpSkill(config.id, 10);
          end();
          if (config.onComplete) config.onComplete();
        }
      }
    } else if (!state.holding && nearestIdx >= 0) {
      const spot = state.spots[nearestIdx];
      if (spot.progress > 0 && !spot.inspected) {
        spot.progress = Math.max(0, spot.progress - delta * 1.5);
        updateProgressArc(spot.marker.arc, spot.progress / HOLD);
      }
    }
    if (nearestIdx >= 0) {
      const done = state.spots.filter(s => s.inspected).length;
      showTaskHint(`🔍 ${state.spots[nearestIdx].label} — [E] 직접·[Q] 위임 (${done}/${state.spots.length})`, '#00FFAA');
    } else {
      showTaskHint(`[Q] 동료 위임 가능 (${state.spots.filter(s => s.inspected).length}/${state.spots.length})`, '#FFAA00');
    }
  }

  const api = {
    state,
    start, end, update, delegateToNPC,
    holdStart: () => { if (state.active) state.holding = true; },
    holdEnd:   () => { if (state.active) state.holding = false; },
  };
  return api;
}

// ── 위임 선택 시스템 ─────────────────────────────────────────
// 현재 활성 mini-game 을 추적해서 Q 키로 NPC 매칭 시도
const DELEGATION_CHOICE = { current: null };

function tryDelegateCurrent() {
  if (!DELEGATION_CHOICE.current) {
    if (typeof showActionNotif === 'function') showActionNotif('위임할 작업이 없습니다', 2000);
    return false;
  }
  const { config } = DELEGATION_CHOICE.current;
  const trade = config.trade;
  if (!trade) {
    if (typeof showActionNotif === 'function') showActionNotif('이 작업은 공종 정보가 없어 위임 불가', 2500);
    return false;
  }
  // 같은 공종 NPC 중 스킬 최고
  const eligible = (GAME.npcs || []).filter(n => n.trade === trade);
  if (eligible.length === 0) {
    if (typeof showActionNotif === 'function') showActionNotif(`${trade} 공종 동료가 없습니다 — 직접 수행 필요`, 2800);
    return false;
  }
  eligible.sort((a, b) => b.skill - a.skill);
  const best = eligible[0];
  const ok = DELEGATION_CHOICE.current.game.delegateToNPC(best.id);
  if (ok && typeof showActionNotif === 'function') {
    showActionNotif(`👷 ${best.name} (${best.role}·경력 ${best.experience}년) 에게 ${config.label} 지시`, 3500);
  }
  return ok;
}
