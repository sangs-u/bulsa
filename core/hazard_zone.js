// hazard_zone.js — v4 구역별 위험 노출 시스템
// 작업 행위 → 위험 누적 / 안전 행위 → 위험 감소 / 임계 초과 → 사고 판정

const HAZARD_ZONES = [];   // 등록된 구역 배열
const _HAZ_TIMERS = {};    // { zoneId: 다음 판정까지 남은 초 }

// ── 구역 등록 ────────────────────────────────────────────────
// 페이즈 빌드 시 호출. teardown 시 clearHazardZones() 호출.
function registerHazardZone(def) {
  // def: { id, center:{x,z}, radius, hazards:{key:0}, checkInterval, accidentMap:{key:accidentId} }
  const zone = {
    id:            def.id,
    center:        def.center,
    radius:        def.radius,
    hazards:       Object.assign({}, def.hazards),       // 복사
    checkInterval: def.checkInterval || 8.0,
    accidentMap:   def.accidentMap   || {},
    _timer:        def.checkInterval || 8.0,
    _debugMesh:    null,
  };
  HAZARD_ZONES.push(zone);
  if (typeof __DEV__ !== 'undefined' && __DEV__) _addDebugRing(zone);
  return zone;
}

function clearHazardZones() {
  HAZARD_ZONES.forEach(z => {
    if (z._debugMesh && z._debugMesh.parent) z._debugMesh.parent.remove(z._debugMesh);
  });
  HAZARD_ZONES.length = 0;
}

// ── 위험 수치 변경 API ───────────────────────────────────────
// delta > 0: 위험 증가 / delta < 0: 위험 감소
function adjustHazard(zoneId, hazardKey, delta) {
  const zone = HAZARD_ZONES.find(z => z.id === zoneId);
  if (!zone) return;
  if (!(hazardKey in zone.hazards)) zone.hazards[hazardKey] = 0;
  zone.hazards[hazardKey] = Math.max(0, Math.min(1, zone.hazards[hazardKey] + delta));
  _updateDebugRing(zone);
}

// 편의: 여러 hazard 동시 변경
function adjustHazards(zoneId, deltas) {
  Object.entries(deltas).forEach(([k, v]) => adjustHazard(zoneId, k, v));
}

// 현재 위험 수치 조회
function getHazard(zoneId, hazardKey) {
  const zone = HAZARD_ZONES.find(z => z.id === zoneId);
  return zone ? (zone.hazards[hazardKey] || 0) : 0;
}

// 구역의 최대 위험 수치 (HUD 게이지용)
function getZoneMaxHazard(zoneId) {
  const zone = HAZARD_ZONES.find(z => z.id === zoneId);
  if (!zone) return 0;
  return Math.max(0, ...Object.values(zone.hazards));
}

// ── 매 프레임 판정 (engine.js _loop 에서 호출) ───────────────
function tickHazardZones(delta) {
  if (!HAZARD_ZONES.length) return;

  // 플레이어가 어느 구역 안에 있는지
  const px = PLAYER.worldPos.x, pz = PLAYER.worldPos.z;

  HAZARD_ZONES.forEach(zone => {
    // 타이머 감소
    zone._timer -= delta;
    if (zone._timer > 0) return;
    zone._timer = zone.checkInterval;

    // 플레이어가 구역 내에 없으면 사고 판정 스킵
    const dx = px - zone.center.x, dz = pz - zone.center.z;
    if (dx * dx + dz * dz > zone.radius * zone.radius) return;

    // 각 위험종 판정
    Object.entries(zone.hazards).forEach(([key, val]) => {
      if (val <= 0.15) return;                // 낮은 위험은 판정 안 함
      if (Math.random() > val) return;        // 위험률로 확률 판정
      const accidentId = zone.accidentMap[key];
      if (accidentId && typeof triggerAccident === 'function') {
        triggerAccident(accidentId);
      }
    });
  });
}

// ── HUD용 전체 최대 위험 수치 ─────────────────────────────────
function getGlobalMaxHazard() {
  if (!HAZARD_ZONES.length) return 0;
  let max = 0;
  HAZARD_ZONES.forEach(z => {
    Object.values(z.hazards).forEach(v => { if (v > max) max = v; });
  });
  return max;
}

// ── 디버그 링 (개발용) ───────────────────────────────────────
function _addDebugRing(zone) {
  const geo  = new THREE.RingGeometry(zone.radius - 0.1, zone.radius, 32);
  const mat  = new THREE.MeshBasicMaterial({ color: 0xFF0000, side: THREE.DoubleSide, transparent: true, opacity: 0.25 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(zone.center.x, 0.05, zone.center.z);
  GAME.scene.add(mesh);
  zone._debugMesh = mesh;
}

function _updateDebugRing(zone) {
  if (!zone._debugMesh) return;
  const max = Math.max(0, ...Object.values(zone.hazards));
  zone._debugMesh.material.opacity = 0.1 + max * 0.5;
  const r = Math.floor(max * 255);
  zone._debugMesh.material.color.setRGB(r / 255, (1 - max) * 0.5, 0);
}
