// Minimap — circular Canvas 2D overlay (bottom-right)

const MINIMAP = (() => {
  const SIZE   = 130;
  const SCALE  = 3.4;   // world units per pixel
  const CENTER = SIZE / 2;
  let canvas = null, c2d = null;

  function init() {
    canvas = document.getElementById('minimap-canvas');
    if (!canvas) return;
    canvas.width  = SIZE;
    canvas.height = SIZE;
    c2d = canvas.getContext('2d');
  }

  function _w2p(wx, wz) {
    return { x: CENTER + wx / SCALE, y: CENTER - wz / SCALE };
  }

  function update() {
    if (!c2d || !GAME.state.gameStarted || GAME.state.gameOver) return;

    c2d.clearRect(0, 0, SIZE, SIZE);

    // Circular clip
    c2d.save();
    c2d.beginPath();
    c2d.arc(CENTER, CENTER, CENTER - 1, 0, Math.PI * 2);
    c2d.clip();

    // Background
    c2d.fillStyle = 'rgba(6,10,16,0.88)';
    c2d.fillRect(0, 0, SIZE, SIZE);

    // Ground grid (faint)
    c2d.strokeStyle = 'rgba(255,255,255,0.06)';
    c2d.lineWidth = 0.5;
    for (let w = -35; w <= 35; w += 10) {
      const a = _w2p(w, -35), b = _w2p(w, 35);
      c2d.beginPath(); c2d.moveTo(a.x, a.y); c2d.lineTo(b.x, b.y); c2d.stroke();
      const c_ = _w2p(-35, w), d = _w2p(35, w);
      c2d.beginPath(); c2d.moveTo(c_.x, c_.y); c2d.lineTo(d.x, d.y); c2d.stroke();
    }

    // Building footprint
    const bl = _w2p(-5.4, -11.3);
    c2d.fillStyle = 'rgba(150,140,120,0.28)';
    c2d.fillRect(bl.x, bl.y - 11.4/SCALE, 10.8/SCALE, 11.4/SCALE);

    // Danger zone
    const dz = _w2p(-2, -8);
    c2d.beginPath(); c2d.arc(dz.x, dz.y, 7.8/SCALE, 0, Math.PI*2);
    c2d.strokeStyle = 'rgba(255,50,0,0.65)'; c2d.lineWidth = 1.5; c2d.stroke();
    c2d.fillStyle = 'rgba(255,50,0,0.10)'; c2d.fill();

    // Crane mast dot
    const cm = _w2p(14, -8);
    c2d.fillStyle = 'rgba(212,162,23,0.7)';
    c2d.fillRect(cm.x - 2, cm.y - 2, 4, 4);

    // NPCs
    if (GAME.npcs) {
      GAME.npcs.forEach(npc => {
        if (!npc.group) return;
        const p = _w2p(npc.group.position.x, npc.group.position.z);
        const danger = npc.state === 'DANGER' || npc.state === 'UNSAFE';
        c2d.beginPath(); c2d.arc(p.x, p.y, 2.8, 0, Math.PI*2);
        c2d.fillStyle = danger ? '#FF7733' : '#88AACC';
        c2d.fill();
      });
    }

    // Player (teal with direction arrow)
    if (typeof PLAYER !== 'undefined' && PLAYER.worldPos) {
      const pp = _w2p(PLAYER.worldPos.x, PLAYER.worldPos.z);
      c2d.beginPath(); c2d.arc(pp.x, pp.y, 4, 0, Math.PI*2);
      c2d.fillStyle = '#4DB8A0'; c2d.fill();

      if (GAME.camera) {
        c2d.save();
        c2d.translate(pp.x, pp.y);
        c2d.rotate(-GAME.camera.rotation.y);
        c2d.beginPath();
        c2d.moveTo(0, -9); c2d.lineTo(3, 2); c2d.lineTo(-3, 2);
        c2d.closePath();
        c2d.fillStyle = '#4DB8A0'; c2d.fill();
        c2d.restore();
      }
    }

    c2d.restore();

    // Border ring
    c2d.beginPath(); c2d.arc(CENTER, CENTER, CENTER - 1, 0, Math.PI*2);
    c2d.strokeStyle = 'rgba(255,255,255,0.18)'; c2d.lineWidth = 1.5; c2d.stroke();
  }

  return { init, update };
})();
