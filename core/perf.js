// Perf — FPS 측정 + dev 핫키. F3 누르면 작은 디버그 오버레이.

(function () {
  'use strict';
  if (typeof window === 'undefined') return;

  const PERF = {
    show: false,
    fps: 0,
    frames: 0,
    lastT: 0,
  };
  window.PERF = PERF;

  function init() {
    document.addEventListener('keydown', e => {
      if (e.code === 'F3') {
        e.preventDefault();
        PERF.show = !PERF.show;
        const el = document.getElementById('perf-overlay');
        if (el) el.style.display = PERF.show ? 'block' : 'none';
      }
    });

    const el = document.createElement('div');
    el.id = 'perf-overlay';
    el.style.cssText = `
      position:fixed; left:8px; bottom:8px; padding:6px 10px;
      background:rgba(0,0,0,0.62); color:#48BB78;
      font-family:monospace; font-size:11px; line-height:1.5;
      border-radius:4px; z-index:9100; display:none; pointer-events:none;
    `;
    document.body.appendChild(el);

    PERF.lastT = performance.now();
    setInterval(_update, 500);
  }

  function _update() {
    if (!PERF.show) return;
    const now = performance.now();
    const dt = (now - PERF.lastT) / 1000;
    PERF.fps = PERF.frames / Math.max(0.001, dt);
    PERF.frames = 0;
    PERF.lastT = now;

    const el = document.getElementById('perf-overlay');
    if (!el) return;
    const r = GAME.renderer ? GAME.renderer.info.render : { calls: 0, triangles: 0 };
    const m = GAME.renderer ? GAME.renderer.info.memory : { geometries: 0, textures: 0 };
    const phyN = (typeof PHYSICS !== 'undefined' && PHYSICS.bodies) ? PHYSICS.bodies.length : 0;
    const npcN = (GAME.npcs || []).length;
    el.innerHTML = `
      FPS: ${PERF.fps.toFixed(1)}<br>
      Draw calls: ${r.calls}<br>
      Triangles: ${r.triangles.toLocaleString()}<br>
      Geometry: ${m.geometries} · Tex: ${m.textures}<br>
      Physics bodies: ${phyN}<br>
      NPCs: ${npcN}<br>
      Pos: ${PLAYER && PLAYER.worldPos ? `${PLAYER.worldPos.x.toFixed(1)}, ${PLAYER.worldPos.y.toFixed(1)}, ${PLAYER.worldPos.z.toFixed(1)}` : '-'}
    `;
  }

  function frameStep() { PERF.frames += 1; }

  window.initPerf  = init;
  window.perfFrame = frameStep;
})();
