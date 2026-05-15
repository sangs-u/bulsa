// hazard.js — 위험구역 시스템
// level: 0=안전(초록), 1=주의(황색), 2=위험(적색)
// 위험구역 진입 시 lifeDamage() 호출 → safetyIndex 감소 → 命 수위 상승

/* ─── 위험구역 클래스 ────────────────────────────────────── */
class HazardZone {
  constructor(id, x, z, radius, level) {
    this.id     = id;
    this.x      = x;
    this.z      = z;
    this.radius = radius;
    this.level  = level;   // 0,1,2
    this.mesh   = null;
    this.border = null;
  }

  contains(pos) {
    const dx = pos.x - this.x;
    const dz = pos.z - this.z;
    return dx * dx + dz * dz < this.radius * this.radius;
  }
}

/* ─── 전역 상태 ──────────────────────────────────────────── */
const HAZARD_ZONES = [];

// safetyIndex 감소량 (초당)
const HAZARD_DPS = [0, 1.5, 7];

/* ─── 바닥 오버레이 메시 생성 ────────────────────────────── */
function _buildZone(zone, scene) {
  const colorMap = [
    { d: [0.22, 0.75, 0.22], e: [0.04, 0.20, 0.04] },  // 안전: 초록
    { d: [0.92, 0.76, 0.10], e: [0.22, 0.18, 0.00] },  // 주의: 황색
    { d: [0.88, 0.16, 0.12], e: [0.22, 0.02, 0.02] },  // 위험: 적색
  ][zone.level];

  // 바닥 원형 디스크 (반투명)
  const disc = BABYLON.MeshBuilder.CreateCylinder('hazDisc_' + zone.id,
    { diameter: zone.radius * 2, height: 0.02, tessellation: 40 }, scene);
  disc.position   = new BABYLON.Vector3(zone.x, 0.01, zone.z);
  disc.isPickable = false;

  const mat = new BABYLON.StandardMaterial('hazMat_' + zone.id, scene);
  mat.diffuseColor  = new BABYLON.Color3(...colorMap.d);
  mat.emissiveColor = new BABYLON.Color3(...colorMap.e);
  mat.alpha         = 0.38;
  disc.material     = mat;
  zone.mesh         = disc;

  // 경계선 (원형 라인)
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    pts.push(new BABYLON.Vector3(
      zone.x + Math.cos(a) * zone.radius, 0.03,
      zone.z + Math.sin(a) * zone.radius
    ));
  }
  const border = BABYLON.MeshBuilder.CreateLines('hazBorder_' + zone.id,
    { points: pts }, scene);
  border.color      = new BABYLON.Color3(...colorMap.d);
  border.isPickable = false;
  zone.border       = border;
}

/* ─── 매 프레임: 진입 판정 + 피해 ───────────────────────── */
function _tickHazard(dt) {
  if (!GAME.player || GAME.state.dialogActive) return;
  const pos = GAME.player.position;

  let maxDps = 0;
  HAZARD_ZONES.forEach(zone => {
    if (zone.contains(pos)) maxDps = Math.max(maxDps, HAZARD_DPS[zone.level]);
  });

  if (maxDps > 0) lifeDamage(maxDps * dt);
}

/* ─── 건설 현장 위험구역 초기화 (exitToSite에서 호출) ────── */
function initSiteHazards() {
  const scene = GAME.scene;
  // 타워크레인 양중 반경 (중앙) — 위험
  HAZARD_ZONES.push(new HazardZone('crane', 0, 22, 6, 2));
  // 부지 동/서 단부 — 주의
  HAZARD_ZONES.push(new HazardZone('edgeE',  12, 22, 3.5, 1));
  HAZARD_ZONES.push(new HazardZone('edgeW', -12, 22, 3.5, 1));
  // 남쪽 단부 — 주의
  HAZARD_ZONES.push(new HazardZone('edgeS', 0, 34, 4, 1));
  HAZARD_ZONES.forEach(z => _buildZone(z, scene));
}

/* ─── 초기화 (game:ready 이후) ───────────────────────────── */
window.addEventListener('game:ready', function() {
  const scene = GAME.scene;

  // 사무소는 안전구역 — 위험구역 없음

  let last = performance.now();
  scene.onBeforeRenderObservable.add(() => {
    const now = performance.now();
    _tickHazard((now - last) / 1000);
    last = now;
  });
});
