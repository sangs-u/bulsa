// marker.js — v4 3D 설치 마커
// 행위 가능 위치를 씬에 시각화 + 플레이어 접근 시 E키 활성화

const MARKERS = [];   // 등록된 마커 배열

// ── 마커 등록 ────────────────────────────────────────────────
// actId: 이 마커에서 수행할 행위 id
// state: 'pending'(미완) | 'done'(완료)
function registerMarker(def) {
  // def: { id, position:{x,y,z}, actId, label, radius }
  const ring = _buildRingMesh();
  ring.position.set(def.position.x, def.position.y ?? 0.05, def.position.z);
  GAME.scene.add(ring);

  const pulse = _buildPulseMesh();
  pulse.position.copy(ring.position);
  GAME.scene.add(pulse);

  const marker = {
    id:       def.id,
    position: new THREE.Vector3(def.position.x, def.position.y ?? 0, def.position.z),
    actId:    def.actId,
    label:    def.label || {},
    radius:   def.radius || 2.0,
    state:    'pending',
    _ring:    ring,
    _pulse:   pulse,
    _pulseT:  0,
  };
  MARKERS.push(marker);
  return marker;
}

function clearMarkers() {
  MARKERS.forEach(m => {
    if (m._ring  && m._ring.parent)  m._ring.parent.remove(m._ring);
    if (m._pulse && m._pulse.parent) m._pulse.parent.remove(m._pulse);
  });
  MARKERS.length = 0;
}

// ── 마커 완료 처리 ───────────────────────────────────────────
function completeMarker(markerId) {
  const m = MARKERS.find(x => x.id === markerId);
  if (!m || m.state === 'done') return;
  m.state = 'done';
  // 녹색으로 바꾸고 서서히 페이드아웃
  m._ring.material.color.set(0x48BB78);
  m._pulse.material.color.set(0x48BB78);
  setTimeout(() => {
    if (m._ring.parent)  m._ring.parent.remove(m._ring);
    if (m._pulse.parent) m._pulse.parent.remove(m._pulse);
  }, 1200);
}

// ── 플레이어 근접 마커 조회 ───────────────────────────────────
function getNearestPendingMarker(position, maxRadius) {
  let best = null, bestD2 = Infinity;
  MARKERS.forEach(m => {
    if (m.state !== 'pending') return;
    const dx = m.position.x - position.x, dz = m.position.z - position.z;
    const d2 = dx * dx + dz * dz;
    const r  = maxRadius || m.radius;
    if (d2 <= r * r && d2 < bestD2) { best = m; bestD2 = d2; }
  });
  return best;
}

function getPendingCount() {
  return MARKERS.filter(m => m.state === 'pending').length;
}

// ── 매 프레임: 펄스 애니메이션 ───────────────────────────────
function tickMarkers(delta) {
  MARKERS.forEach(m => {
    if (m.state !== 'pending') return;
    m._pulseT = (m._pulseT + delta * 1.8) % (Math.PI * 2);
    const s = 1.0 + Math.sin(m._pulseT) * 0.18;
    m._pulse.scale.set(s, 1, s);
    m._pulse.material.opacity = 0.18 + Math.sin(m._pulseT) * 0.12;

    // 플레이어 접근 시 밝아짐
    const dx = PLAYER.worldPos.x - m.position.x;
    const dz = PLAYER.worldPos.z - m.position.z;
    const near = (dx * dx + dz * dz) <= m.radius * m.radius;
    m._ring.material.opacity = near ? 0.95 : 0.55;
  });
}

// ── 형상 헬퍼 ────────────────────────────────────────────────
function _buildRingMesh() {
  const geo = new THREE.RingGeometry(0.38, 0.55, 32);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xFFAA00, side: THREE.DoubleSide, transparent: true, opacity: 0.55,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

function _buildPulseMesh() {
  const geo = new THREE.RingGeometry(0.55, 0.70, 32);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xFFAA00, side: THREE.DoubleSide, transparent: true, opacity: 0.18,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

window.MARKERS               = MARKERS;
window.registerMarker        = registerMarker;
window.clearMarkers          = clearMarkers;
window.completeMarker        = completeMarker;
window.getNearestPendingMarker = getNearestPendingMarker;
window.getPendingCount       = getPendingCount;
window.tickMarkers           = tickMarkers;
