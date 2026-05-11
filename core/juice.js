// Juice — 게임감 효과. 카메라 셰이크 / 먼지 파티클 / 임팩트 플래시.
// 안전 시뮬 정체성 유지: 셰이크는 사고·낙하 충격, 먼지는 작업 환경 분위기.

(function () {
  'use strict';
  if (typeof window === 'undefined') return;

  const JUICE = {
    shakeT: 0,
    shakeStrength: 0,
    dustPool: [],
    dustNext: 0,
    _camBaseQuat: null,
    _camOffsetQuat: null,
  };
  window.JUICE = JUICE;

  // ── 카메라 셰이크 ────────────────────────────────────────────
  function cameraShake(strength = 0.6, duration = 0.45) {
    JUICE.shakeStrength = Math.max(JUICE.shakeStrength, strength);
    JUICE.shakeT = Math.max(JUICE.shakeT, duration);
  }

  function _applyShake(delta) {
    if (JUICE.shakeT <= 0) return;
    if (!GAME.camera) return;
    JUICE.shakeT -= delta;
    const t  = Math.max(0, JUICE.shakeT);
    const s  = JUICE.shakeStrength * t;       // 시간 진행에 따라 감쇠
    const dx = (Math.random() - 0.5) * s * 0.06;
    const dy = (Math.random() - 0.5) * s * 0.06;
    GAME.camera.rotation.x += dx;
    GAME.camera.rotation.y += dy;
    if (JUICE.shakeT <= 0) {
      JUICE.shakeStrength = 0;
    }
  }

  // ── 먼지 파티클 풀 ───────────────────────────────────────────
  // 흙·콘크리트 작업장 분위기 — 플레이어 발 밑에 작게 발생.
  function _initDustPool() {
    if (JUICE.dustPool.length > 0) return;
    const N = 24;
    const geo = new THREE.SphereGeometry(0.09, 6, 4);
    for (let i = 0; i < N; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xC9B98C, transparent: true, opacity: 0, depthWrite: false });
      const m = new THREE.Mesh(geo, mat);
      m.visible = false;
      m.userData.alive = false;
      m.userData.t = 0;
      m.userData.vy = 0;
      m.userData.vx = 0;
      m.userData.vz = 0;
      GAME.scene.add(m);
      JUICE.dustPool.push(m);
    }
  }

  function _spawnDust(x, y, z, count = 3) {
    if (!GAME.scene) return;
    if (JUICE.dustPool.length === 0) _initDustPool();
    let spawned = 0;
    for (const m of JUICE.dustPool) {
      if (m.userData.alive) continue;
      m.position.set(x + (Math.random() - 0.5) * 0.18, y + 0.04, z + (Math.random() - 0.5) * 0.18);
      m.material.opacity = 0.45 + Math.random() * 0.2;
      m.scale.setScalar(0.6 + Math.random() * 0.6);
      m.userData.alive = true;
      m.userData.t = 0;
      m.userData.life = 0.7 + Math.random() * 0.3;
      m.userData.vy = 0.4 + Math.random() * 0.3;
      m.userData.vx = (Math.random() - 0.5) * 0.3;
      m.userData.vz = (Math.random() - 0.5) * 0.3;
      m.visible = true;
      if (++spawned >= count) break;
    }
  }

  function _updateDust(delta) {
    for (const m of JUICE.dustPool) {
      if (!m.userData.alive) continue;
      m.userData.t += delta;
      const k = m.userData.t / m.userData.life;
      if (k >= 1) {
        m.userData.alive = false;
        m.visible = false;
        m.material.opacity = 0;
        continue;
      }
      m.position.x += m.userData.vx * delta;
      m.position.y += m.userData.vy * delta;
      m.position.z += m.userData.vz * delta;
      m.userData.vy *= 0.94;       // 위로 솟다가 가라앉음
      m.material.opacity = (0.45 + Math.random() * 0.2) * (1 - k);
      m.scale.setScalar((0.6 + k * 0.8));
    }
  }

  // 발자국 먼지 — 플레이어 이동 시 풀에서 호출.
  function emitFootstepDust() {
    if (!PLAYER || !PLAYER.worldPos) return;
    if (!PLAYER.onGround) return;
    if (PLAYER.worldPos.y > 0.3) return;     // 지면에서만
    const now = performance.now() / 1000;
    if (now - JUICE.dustNext < 0.25) return;
    JUICE.dustNext = now;
    _spawnDust(PLAYER.worldPos.x, PLAYER.worldPos.y, PLAYER.worldPos.z, 2);
  }

  // ── 낙하물 → NPC 근접 충돌 (Near-miss) ────────────────────────
  // PHYSICS.bodies 중 떨어지는 박스가 NPC 1.2m 이내 지면 도달 시 경고.
  function _updateHazardProximity() {
    if (typeof PHYSICS === 'undefined' || !PHYSICS.enabled) return;
    if (!GAME.npcs || GAME.npcs.length === 0) return;
    PHYSICS.bodies.forEach(entry => {
      if (entry._reportedNear) return;
      const b = entry.body;
      if (!b) return;
      if (Math.abs(b.velocity.y) > 0.5) return; // 아직 낙하 중
      if (b.position.y > 0.6) return;           // 지면 도달 후만
      for (const npc of GAME.npcs) {
        if (!npc.group) continue;
        const dx = b.position.x - npc.group.position.x;
        const dz = b.position.z - npc.group.position.z;
        const d2 = dx * dx + dz * dz;
        if (d2 < 1.44) {  // 1.2m 이내
          entry._reportedNear = true;
          _onNearMiss(npc, b);
          break;
        }
      }
    });
  }

  function _onNearMiss(npc, body) {
    if (typeof showActionNotif === 'function') {
      showActionNotif(`⚠ 낙하물 근접 — ${npc.name || npc.id} 주변 위험`, 2500);
    }
    cameraShake(0.4, 0.3);
    if (typeof applySafetyPenalty === 'function') applySafetyPenalty(2);
  }

  // ── Tick — engine loop 에서 호출 ─────────────────────────────
  function updateJuice(delta) {
    _applyShake(delta);
    _updateDust(delta);
    _updateHazardProximity();
    // 발자국 먼지 — 이동 중일 때만
    if (PLAYER && (PLAYER.keys['KeyW'] || PLAYER.keys['KeyA'] || PLAYER.keys['KeyS'] || PLAYER.keys['KeyD'] || Math.abs(PLAYER.joyX) + Math.abs(PLAYER.joyY) > 0.1)) {
      emitFootstepDust();
    }
  }

  // 외부에서 임팩트 위치 먼지 호출 (물리 모듈에서 사용)
  function spawnImpactDust(x, y, z, count = 6) {
    if (JUICE.dustPool.length === 0) _initDustPool();
    _spawnDust(x, y, z, count);
  }

  window.cameraShake  = cameraShake;
  window.updateJuice  = updateJuice;
  window.emitFootstepDust = emitFootstepDust;
  window.spawnImpactDust  = spawnImpactDust;
})();
