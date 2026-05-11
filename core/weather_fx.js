// Weather FX — 비/안개/먼지바람 등 환경 효과. WEATHER 모듈과 별개로 시각 레이어만 담당.
// B 키 토글로 바로 확인 가능 (dev). 자동 모드는 사이클 기반.

(function () {
  'use strict';
  if (typeof window === 'undefined') return;

  const WX = {
    mode: 'clear',       // clear | rain | dust | fog
    particles: null,
    nextChangeAt: 60 + Math.random() * 120,   // 60~180초 후 자동 변경
    elapsed: 0,
    initialized: false,
  };
  window.WEATHER_FX = WX;

  function init() {
    if (WX.initialized) return;
    WX.initialized = true;
    document.addEventListener('keydown', e => {
      if (e.code === 'KeyB' && GAME.state.gameStarted && !GAME.state.gameOver) {
        e.preventDefault();
        const modes = ['clear', 'rain', 'dust', 'fog'];
        const next = modes[(modes.indexOf(WX.mode) + 1) % modes.length];
        setMode(next);
        if (typeof showActionNotif === 'function') showActionNotif(`날씨: ${_label(next)}`, 1600);
      }
    });
  }

  function _label(m) { return { clear:'맑음', rain:'비', dust:'먼지바람', fog:'안개' }[m] || m; }

  function setMode(mode) {
    WX.mode = mode;
    if (WX.particles) { GAME.scene.remove(WX.particles); WX.particles = null; }

    if (mode === 'rain')  _spawnRain();
    if (mode === 'dust')  _spawnDust();
    if (mode === 'fog')   _setFog(true);
    else if (mode !== 'fog') _setFog(false);
  }

  function _spawnRain() {
    const count = 1200;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i*3]   = (Math.random() - 0.5) * 60;
      positions[i*3+1] = Math.random() * 25;
      positions[i*3+2] = (Math.random() - 0.5) * 60;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: 0x88AACC, size: 0.06, transparent: true, opacity: 0.55 });
    WX.particles = new THREE.Points(geo, mat);
    WX.particles.userData.kind = 'rain';
    GAME.scene.add(WX.particles);
  }

  function _spawnDust() {
    const count = 600;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i*3]   = (Math.random() - 0.5) * 50;
      positions[i*3+1] = Math.random() * 8;
      positions[i*3+2] = (Math.random() - 0.5) * 50;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: 0xC9A872, size: 0.12, transparent: true, opacity: 0.32 });
    WX.particles = new THREE.Points(geo, mat);
    WX.particles.userData.kind = 'dust';
    GAME.scene.add(WX.particles);
  }

  function _setFog(on) {
    if (!GAME.scene) return;
    if (on) {
      GAME.scene.fog = new THREE.FogExp2(0xC0C8D0, 0.022);
    } else {
      // 시나리오 기본 안개 복원 — 단순화: 작은 안개로 리셋
      GAME.scene.fog = new THREE.FogExp2(0x8AB2D0, 0.005);
    }
  }

  function update(delta) {
    if (!WX.initialized) return;
    if (!GAME.state.gameStarted || GAME.state.gameOver || GAME.state.paused) return;

    WX.elapsed += delta;
    // 자동 모드 변경
    if (WX.elapsed > WX.nextChangeAt) {
      WX.elapsed = 0;
      WX.nextChangeAt = 90 + Math.random() * 150;
      const modes = ['clear', 'clear', 'rain', 'dust', 'fog']; // clear 가중치 ↑
      setMode(modes[Math.floor(Math.random() * modes.length)]);
    }

    // 파티클 애니메이션
    if (!WX.particles) return;
    const pos = WX.particles.geometry.attributes.position;
    const isRain = WX.particles.userData.kind === 'rain';
    for (let i = 0; i < pos.count; i++) {
      if (isRain) {
        pos.array[i*3+1] -= 14 * delta;
        if (pos.array[i*3+1] < 0) pos.array[i*3+1] = 22 + Math.random() * 3;
      } else {
        // dust — 천천히 떠다님
        pos.array[i*3]   += Math.sin(WX.elapsed * 0.3 + i) * delta * 0.4;
        pos.array[i*3+1] += Math.cos(WX.elapsed * 0.2 + i) * delta * 0.15;
        if (pos.array[i*3+1] > 8) pos.array[i*3+1] = 0;
        if (pos.array[i*3+1] < 0) pos.array[i*3+1] = 8;
      }
    }
    pos.needsUpdate = true;
  }

  window.initWeatherFX   = init;
  window.updateWeatherFX = update;
  window.setWeather       = setMode;
})();
