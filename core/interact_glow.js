// Interact glow — 상호작용 가능한 객체에 펄스 외곽선 표시 (라이트림 효과).
// 플레이어가 가까이 있을 때만 활성화.

(function () {
  'use strict';
  if (typeof window === 'undefined') return;

  const GLOW = {
    targets: [],
    time: 0,
  };

  function update(delta) {
    if (!GAME.state.gameStarted || GAME.state.gameOver || GAME.state.paused) return;
    GLOW.time += delta;

    // INTERACTION.currentTarget 이 있다면 깜빡임 강화
    const cur = (typeof INTERACTION !== 'undefined') ? INTERACTION.currentTarget : null;
    if (!cur || !cur.mesh) return;

    // 머티리얼이 emissive 지원하면 펄스
    const m = cur.mesh.material;
    if (!m) return;
    if (!m._origEmissive) {
      m._origEmissive = m.emissive ? m.emissive.clone() : new THREE.Color(0, 0, 0);
    }
    if (m.emissive) {
      const pulse = 0.18 + Math.sin(GLOW.time * 5) * 0.12;
      m.emissive.setRGB(pulse, pulse * 0.9, pulse * 0.4);
    }
  }

  // 플레이어가 다른 곳을 보면 emissive 복원 (간단히 — interaction.js 가 이미 currentTarget 관리)
  function resetTarget(mesh) {
    if (!mesh || !mesh.material) return;
    const m = mesh.material;
    if (m._origEmissive && m.emissive) m.emissive.copy(m._origEmissive);
  }

  window.updateInteractGlow = update;
  window.resetInteractGlow  = resetTarget;
})();
