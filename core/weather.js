// Weather & time — 1 real second = 1 game minute (60x)

const WEATHER = (() => {
  let _minutes = 8 * 60;   // start at 08:00
  let _sun     = null;
  let _windTimer = 50 + Math.random() * 40;
  const WIND_MSGS = ['바람이 강해집니다', '돌풍 주의 — 슬링 흔들림', '바람 잠시 약해짐'];

  function init(sunLight) {
    _sun = sunLight;
    _apply();
  }

  function tick(realDelta) {
    if (!GAME.state.gameStarted || GAME.state.gameOver) return;
    _minutes += realDelta * 60;
    if (_minutes >= 1440) _minutes -= 1440;

    _windTimer -= realDelta;
    if (_windTimer <= 0) {
      _windTimer = 55 + Math.random() * 70;
      if (typeof showActionNotif === 'function')
        showActionNotif(WIND_MSGS[Math.floor(Math.random() * WIND_MSGS.length)], 2200);
    }

    _apply();
    _updateTimeHUD();
  }

  function _apply() {
    if (!_sun) return;
    const h = _minutes / 60;
    // elevation: 0 at 6am, peak at noon, 0 at 6pm
    const ang = ((h - 6) / 12) * Math.PI;
    const elev = Math.sin(Math.max(0, Math.min(Math.PI, ang)));
    const az   = (h - 12) / 12 * Math.PI;

    _sun.position.set(
      40 * Math.sin(az),
      40 * Math.max(0.06, elev),
      40 * Math.cos(az) * 0.5 + 12
    );

    if (elev < 0.18) {
      _sun.intensity = 0.5 + elev * 3.5;
      _sun.color.setHex(0xFF8844);
    } else {
      _sun.intensity = 1.2 + elev * 0.4;
      _sun.color.setHex(0xFFE4B5);
    }
  }

  function _updateTimeHUD() {
    const el = document.getElementById('hud-gametime');
    if (el) el.textContent = getTimeString();
  }

  function getTimeString() {
    const h = Math.floor(_minutes / 60) % 24;
    const m = Math.floor(_minutes % 60);
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  }

  return { init, tick, getTimeString };
})();
