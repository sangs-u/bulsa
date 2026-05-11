// 시간 압박 — 게임 내 시계 (09:00 시작 → 18:00 마감)
// 5분 실시간 = 9게임시간 (1초 ≈ 1.8 게임분)
// 17:30 부터 적색 깜빡임. 18:00 도달 시 강제 종료.

const TIMEPRESSURE = {
  enabled:      true,
  startGameH:   9.0,   // 09:00 (오전)
  endGameH:     18.0,  // 18:00 (퇴근)
  realSeconds:  300,   // 실시간 5분 = 9시간
  warnH:        17.5,  // 17:30 부터 경고
  _elapsed:     0,
  _curH:        9.0,
  _started:     false,
  _warned:      false,
  _expired:     false,
  _el:          null,
};

function _ensureClockHUD() {
  if (TIMEPRESSURE._el) return TIMEPRESSURE._el;
  const tl = document.getElementById('hud-tl');
  if (!tl) return null;
  const el = document.createElement('span');
  el.id = 'hud-clock';
  el.style.marginLeft     = '10px';
  el.style.padding        = '2px 9px';
  el.style.borderRadius   = '6px';
  el.style.background     = 'rgba(10,15,22,0.55)';
  el.style.color          = '#E8E8E8';
  el.style.fontFamily     = 'monospace';
  el.style.fontSize       = '13px';
  el.style.letterSpacing  = '0.5px';
  el.title                = '게임 내 시각 (18:00 마감)';
  el.textContent = '🕒 09:00';
  tl.appendChild(el);
  TIMEPRESSURE._el = el;
  return el;
}

function _fmtHM(h) {
  const hh = Math.floor(h);
  const mm = Math.floor((h - hh) * 60);
  return String(hh).padStart(2,'0') + ':' + String(mm).padStart(2,'0');
}

function initTimePressure() {
  if (!TIMEPRESSURE.enabled) return;
  TIMEPRESSURE._elapsed = 0;
  TIMEPRESSURE._curH    = TIMEPRESSURE.startGameH;
  TIMEPRESSURE._started = true;
  TIMEPRESSURE._warned  = false;
  TIMEPRESSURE._expired = false;
  _ensureClockHUD();
}

function updateTimePressure(delta) {
  if (!TIMEPRESSURE._started || TIMEPRESSURE._expired) return;
  if (!GAME.state.gameStarted || GAME.state.gameOver || GAME.state.paused) return;

  TIMEPRESSURE._elapsed += delta;
  const span = TIMEPRESSURE.endGameH - TIMEPRESSURE.startGameH;
  TIMEPRESSURE._curH = TIMEPRESSURE.startGameH +
                       Math.min(1, TIMEPRESSURE._elapsed / TIMEPRESSURE.realSeconds) * span;

  const el = _ensureClockHUD();
  if (el) {
    el.textContent = '🕒 ' + _fmtHM(TIMEPRESSURE._curH);
    if (TIMEPRESSURE._curH >= TIMEPRESSURE.warnH) {
      // 30초당 1회 깜빡임 — opacity 1↔0.45
      const blink = (Math.floor(TIMEPRESSURE._elapsed * 2) % 2) === 0;
      el.style.background = blink ? 'rgba(220,38,38,0.85)' : 'rgba(120,20,20,0.6)';
      el.style.color      = '#FFFFFF';
    } else {
      el.style.background = 'rgba(10,15,22,0.55)';
      el.style.color      = '#E8E8E8';
    }
  }

  if (!TIMEPRESSURE._warned && TIMEPRESSURE._curH >= TIMEPRESSURE.warnH) {
    TIMEPRESSURE._warned = true;
    const msgs = {
      ko: '⏰ 17:30 — 18:00 퇴근시간까지 30분 남았습니다',
      en: '⏰ 17:30 — 30 min left until 18:00 quitting time',
      vi: '⏰ 17:30 — Còn 30 phút đến 18:00 hết giờ',
      ar: '⏰ 17:30 — 30 دقيقة متبقية حتى نهاية الدوام 18:00',
    };
    if (typeof showNotification === 'function') {
      showNotification(msgs[currentLang] || msgs.ko, 'warn');
    }
  }

  if (TIMEPRESSURE._curH >= TIMEPRESSURE.endGameH) {
    TIMEPRESSURE._expired = true;
    _timeoutGameOver();
  }
}

function _timeoutGameOver() {
  if (GAME.state.gameOver) return;
  GAME.state.gameOver = true;
  if (document.pointerLockElement) document.exitPointerLock();

  const msgs = {
    ko: { t: '⏰ 시간초과', d: '18:00 퇴근시간을 넘겼습니다. 작업이 강제 종료되었습니다.' },
    en: { t: '⏰ Time Up',  d: 'Exceeded 18:00 quitting time. Work was forced to stop.' },
    vi: { t: '⏰ Hết giờ',  d: 'Đã quá 18:00. Công việc bị buộc dừng.' },
    ar: { t: '⏰ انتهى الوقت', d: 'تجاوزت نهاية الدوام 18:00. توقف العمل قسراً.' },
  };
  const m = msgs[currentLang] || msgs.ko;

  // 사고 패널을 재활용해 결과 표시
  const panel = document.getElementById('accident-panel');
  if (panel) {
    const tEl = document.getElementById('acc-title');
    const dEl = document.getElementById('acc-desc');
    const cEl = document.getElementById('acc-cause');
    if (tEl) tEl.textContent = m.t;
    if (dEl) dEl.textContent = m.d;
    if (cEl) cEl.textContent = '공기 압박 · 작업계획 지연';
    panel.classList.remove('hidden');
  } else if (typeof showNotification === 'function') {
    showNotification(m.t + ' — ' + m.d, 'fail');
  }
}

window.TIMEPRESSURE       = TIMEPRESSURE;
window.initTimePressure   = initTimePressure;
window.updateTimePressure = updateTimePressure;
