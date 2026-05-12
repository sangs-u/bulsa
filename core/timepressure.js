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

const _CLOCK_TIPS = {
  ko: '게임 내 시각 (18:00 마감)',
  en: 'In-game clock (18:00 deadline)',
  vi: 'Giờ trong game (hạn 18:00)',
  ar: 'الساعة داخل اللعبة (حتى 18:00)',
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
  el.title                = _CLOCK_TIPS[currentLang] || _CLOCK_TIPS.ko;
  el.textContent = '🕒 09:00';
  tl.appendChild(el);
  TIMEPRESSURE._el = el;
  return el;
}

// 언어 전환 시 호출 (i18n.js applyLang 에서 사용 가능)
function refreshClockI18n() {
  if (TIMEPRESSURE._el) {
    TIMEPRESSURE._el.title = _CLOCK_TIPS[currentLang] || _CLOCK_TIPS.ko;
  }
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

const _TIMEOUT_TEXT = {
  ko: { t: '⏰ 시간초과',     d: '18:00 퇴근시간을 넘겼습니다. 작업이 강제 종료되었습니다.', c: '공기 압박 · 작업계획 지연',          retry: '다시 하기', home: '메인으로' },
  en: { t: '⏰ Time Up',      d: 'Exceeded 18:00 quitting time. Work was forced to stop.',     c: 'Schedule pressure · planning delay', retry: 'Retry',     home: 'Home' },
  vi: { t: '⏰ Hết giờ',      d: 'Đã quá 18:00. Công việc bị buộc dừng.',                       c: 'Áp lực tiến độ · trễ kế hoạch',     retry: 'Thử lại',   home: 'Trang chủ' },
  ar: { t: '⏰ انتهى الوقت',  d: 'تجاوزت نهاية الدوام 18:00. توقف العمل قسراً.',                  c: 'ضغط الجدول · تأخر التخطيط',         retry: 'إعادة',     home: 'الرئيسية' },
};

function _buildTimeoutPanel() {
  let panel = document.getElementById('timeout-panel');
  if (panel) return panel;
  panel = document.createElement('div');
  panel.id = 'timeout-panel';
  panel.className = 'hidden';
  panel.style.cssText = [
    'position:fixed','top:0','left:0','width:100%','height:100%',
    'background:rgba(8,12,20,0.92)','z-index:9000',
    'display:flex','align-items:center','justify-content:center',
    'font-family:"Pretendard","Noto Sans KR",sans-serif',
  ].join(';');
  panel.innerHTML = `
    <div style="background:#15202E;border:2px solid #DC2626;border-radius:14px;
                padding:36px 44px;max-width:520px;text-align:center;color:#F0F0F0;
                box-shadow:0 0 60px rgba(220,38,38,0.35)">
      <div style="font-size:56px;line-height:1;margin-bottom:8px">⏰</div>
      <h2 id="timeout-title" style="font-size:26px;margin:8px 0 14px;color:#FF6868"></h2>
      <p id="timeout-desc"  style="font-size:15px;line-height:1.6;margin:0 0 18px;color:#D8DCE3"></p>
      <div style="background:rgba(220,38,38,0.13);border-left:3px solid #DC2626;
                  padding:10px 14px;border-radius:4px;margin:0 0 22px;
                  font-size:13px;color:#FCA5A5;text-align:left">
        <span id="timeout-cause"></span>
      </div>
      <div style="display:flex;gap:10px;justify-content:center">
        <button id="timeout-retry-btn" style="background:#DC2626;color:#fff;border:none;
                padding:11px 26px;border-radius:8px;font-size:15px;cursor:pointer;
                font-weight:600;letter-spacing:0.5px"></button>
        <button id="timeout-home-btn"  style="background:#3A4659;color:#fff;border:none;
                padding:11px 26px;border-radius:8px;font-size:15px;cursor:pointer"></button>
      </div>
    </div>`;
  document.body.appendChild(panel);

  document.getElementById('timeout-retry-btn').addEventListener('click', () => {
    location.reload();
  });
  document.getElementById('timeout-home-btn').addEventListener('click', () => {
    location.href = 'index.html';
  });
  return panel;
}

function _timeoutGameOver() {
  if (GAME.state.gameOver) return;
  GAME.state.gameOver = true;
  if (document.pointerLockElement) document.exitPointerLock();

  const m = _TIMEOUT_TEXT[currentLang] || _TIMEOUT_TEXT.ko;
  const panel = _buildTimeoutPanel();

  document.getElementById('timeout-title').textContent     = m.t;
  document.getElementById('timeout-desc').textContent      = m.d;
  document.getElementById('timeout-cause').textContent     = m.c;
  document.getElementById('timeout-retry-btn').textContent = m.retry;
  document.getElementById('timeout-home-btn').textContent  = m.home;
  panel.classList.remove('hidden');

  if (typeof BGM !== 'undefined' && BGM.stop) try { BGM.stop(); } catch (e) {}
}

window.TIMEPRESSURE       = TIMEPRESSURE;
window.initTimePressure   = initTimePressure;
window.updateTimePressure = updateTimePressure;
window.refreshClockI18n   = refreshClockI18n;
