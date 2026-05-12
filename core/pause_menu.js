// Pause menu — P/ESC 키 일시정지 + 설정 + 나가기.
// 게임 루프 정지(GAME.state.paused = true), 인풋 차단, 포인터락 해제.

(function () {
  'use strict';
  if (typeof window === 'undefined') return;

  const MENU = {
    open: false,
    panel: null,
    activeTab: 'main',
  };
  window.PAUSE_MENU = MENU;

  function initPauseMenu() {
    if (MENU.panel) return;
    _build();
    document.addEventListener('keydown', e => {
      if (!GAME.state.gameStarted || GAME.state.gameOver) return;
      if (e.code === 'KeyP' || e.code === 'Escape') {
        e.preventDefault();
        toggle();
      }
    });
  }

  function _build() {
    const panel = document.createElement('div');
    panel.id = 'pause-panel';
    panel.style.cssText = `
      position:fixed; inset:0; background:rgba(10,14,22,0.78);
      display:none; align-items:center; justify-content:center;
      z-index:9700; backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px);
    `;
    panel.innerHTML = `
      <div style="background:#161B26;color:#F0F0F0;border:1px solid #2A3344;
                  border-radius:10px;padding:26px 32px;min-width:380px;max-width:480px;
                  font-family:'Noto Sans KR',sans-serif;box-shadow:0 16px 50px rgba(0,0,0,0.6)">
        <div style="font-size:22px;font-weight:bold;margin-bottom:18px;text-align:center;
                    color:#E2E8F0;letter-spacing:1px">⏸  일시 정지</div>

        <div id="pause-tabs" style="display:flex;gap:4px;margin-bottom:14px;border-bottom:1px solid #2A3344">
          <button data-tab="main"     class="pause-tab-btn active">메뉴</button>
          <button data-tab="settings" class="pause-tab-btn">설정</button>
          <button data-tab="stats"    class="pause-tab-btn">통계</button>
        </div>

        <div id="pause-tab-main" class="pause-tab-content">
          <button class="pause-btn pause-resume">▶ 계속하기</button>
          <button class="pause-btn pause-retry">↻ 처음부터</button>
          <button class="pause-btn pause-hub">🏠 시나리오 선택</button>
          <button class="pause-btn pause-quit" style="background:#742A2A;color:#FED7D7">🚪 게임 종료</button>
        </div>

        <div id="pause-tab-settings" class="pause-tab-content" style="display:none">
          <label class="pause-set-row">
            <span>🔊 사운드</span>
            <input type="range" id="pause-vol" min="0" max="100" value="60" style="flex:1;margin:0 12px">
            <span id="pause-vol-num" style="min-width:32px;text-align:right">60</span>
          </label>
          <label class="pause-set-row">
            <span>🎵 BGM</span>
            <input type="checkbox" id="pause-bgm" checked>
          </label>
          <label class="pause-set-row">
            <span>🌐 언어</span>
            <select id="pause-lang" style="flex:1;margin-left:12px;padding:4px;background:#1F2937;color:#F0F0F0;border:1px solid #2A3344;border-radius:4px">
              <option value="ko">한국어</option>
              <option value="en">English</option>
              <option value="ar">العربية</option>
              <option value="vi">Tiếng Việt</option>
            </select>
          </label>
          <label class="pause-set-row">
            <span>🖱 마우스 감도</span>
            <input type="range" id="pause-sens" min="5" max="40" value="18" style="flex:1;margin:0 12px">
            <span id="pause-sens-num" style="min-width:32px;text-align:right">1.8</span>
          </label>
          <label class="pause-set-row">
            <span>⚙ 난이도</span>
            <select id="pause-difficulty" style="flex:1;margin-left:12px;padding:4px;background:#1F2937;color:#F0F0F0;border:1px solid #2A3344;border-radius:4px">
              <option value="easy">쉬움 (Inspector 늦게, 과태료 ½)</option>
              <option value="normal" selected>보통</option>
              <option value="hard">어려움 (Inspector 자주, 과태료 ×2)</option>
            </select>
          </label>
          <button class="pause-btn pause-tutorial-reset" style="margin-top:8px">📚 튜토리얼 다시 보기</button>
        </div>

        <div id="pause-tab-stats" class="pause-tab-content" style="display:none">
          <div id="pause-stats-body" style="font-size:13px;line-height:1.95"></div>
        </div>
      </div>
    `;
    document.body.appendChild(panel);
    MENU.panel = panel;

    // 탭 버튼 스타일
    const style = document.createElement('style');
    style.textContent = `
      .pause-tab-btn { padding:6px 16px; border:0; background:transparent; color:#94A3B8;
        cursor:pointer; font-size:13px; border-bottom:2px solid transparent; transition:.15s; }
      .pause-tab-btn.active { color:#48BB78; border-bottom-color:#48BB78; }
      .pause-tab-btn:hover { color:#E2E8F0; }
      .pause-btn { display:block; width:100%; margin:6px 0; padding:10px 16px;
        background:#1F2937; color:#F0F0F0; border:1px solid #2A3344; border-radius:6px;
        cursor:pointer; font-size:14px; text-align:left; transition:.15s; }
      .pause-btn:hover { background:#2D3748; }
      .pause-set-row { display:flex; align-items:center; margin:10px 0; font-size:13px; }
    `;
    document.head.appendChild(style);

    // 탭 전환
    panel.querySelectorAll('[data-tab]').forEach(b => {
      b.addEventListener('click', () => _switchTab(b.dataset.tab));
    });

    // 메인 메뉴 버튼
    panel.querySelector('.pause-resume').addEventListener('click', close);
    panel.querySelector('.pause-retry').addEventListener('click', () => {
      if (confirm('현재 진행을 버리고 처음부터 시작하시겠어요?')) {
        window.location.reload();
      }
    });
    panel.querySelector('.pause-hub').addEventListener('click', () => {
      window.location.href = 'index.html';
    });
    panel.querySelector('.pause-quit').addEventListener('click', () => {
      if (confirm('게임을 종료하시겠어요?')) {
        try { window.close(); } catch (e) {}
        window.location.href = 'about:blank';
      }
    });
    panel.querySelector('.pause-tutorial-reset').addEventListener('click', () => {
      try { localStorage.removeItem('bulsa_tutorial_seen'); } catch (e) {}
      if (typeof showActionNotif === 'function') showActionNotif({
        ko: '튜토리얼이 다음 게임에서 다시 표시됩니다',
        en: 'Tutorial will show again next game',
        vi: 'Hướng dẫn sẽ hiện lại lần sau',
        ar: 'سيظهر البرنامج التعليمي مرة أخرى',
      }[currentLang] || '튜토리얼이 다음 게임에서 다시 표시됩니다', 2400);
    });

    // 설정 핸들러
    const vol = panel.querySelector('#pause-vol');
    const volNum = panel.querySelector('#pause-vol-num');
    try { vol.value = localStorage.getItem('bulsa_vol') || '60'; volNum.textContent = vol.value; } catch (e) {}
    vol.addEventListener('input', () => {
      volNum.textContent = vol.value;
      try { localStorage.setItem('bulsa_vol', vol.value); } catch (e) {}
      if (typeof SOUND !== 'undefined' && SOUND.setVolume) SOUND.setVolume(parseInt(vol.value, 10) / 100);
    });
    const bgm = panel.querySelector('#pause-bgm');
    try { bgm.checked = localStorage.getItem('bulsa_bgm') !== '0'; } catch (e) {}
    bgm.addEventListener('change', () => {
      try { localStorage.setItem('bulsa_bgm', bgm.checked ? '1' : '0'); } catch (e) {}
      if (typeof BGM !== 'undefined') { bgm.checked ? BGM.play() : BGM.stop(); }
    });
    const lang = panel.querySelector('#pause-lang');
    try { lang.value = localStorage.getItem('bulsa_lang') || 'ko'; } catch (e) {}
    lang.addEventListener('change', () => {
      try { localStorage.setItem('bulsa_lang', lang.value); } catch (e) {}
      if (typeof setLang === 'function') setLang(lang.value);
    });
    const sens = panel.querySelector('#pause-sens');
    const sensNum = panel.querySelector('#pause-sens-num');
    try { const stored = parseFloat(localStorage.getItem('bulsa_sens')); if (!isNaN(stored)) { sens.value = String(Math.round(stored * 10000)); sensNum.textContent = (stored * 1000).toFixed(1); } } catch (e) {}
    sens.addEventListener('input', () => {
      const v = parseFloat(sens.value) / 10000;
      sensNum.textContent = (v * 1000).toFixed(1);
      try { localStorage.setItem('bulsa_sens', String(v)); } catch (e) {}
    });

    const diff = panel.querySelector('#pause-difficulty');
    try { diff.value = localStorage.getItem('bulsa_difficulty') || 'normal'; } catch (e) {}
    diff.addEventListener('change', () => {
      try { localStorage.setItem('bulsa_difficulty', diff.value); } catch (e) {}
      if (typeof applyDifficulty === 'function') applyDifficulty(diff.value);
    });
  }

  function _switchTab(tab) {
    MENU.activeTab = tab;
    MENU.panel.querySelectorAll('.pause-tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tab);
    });
    MENU.panel.querySelectorAll('.pause-tab-content').forEach(el => {
      el.style.display = el.id === 'pause-tab-' + tab ? 'block' : 'none';
    });
    if (tab === 'stats') _renderStats();
  }

  function _renderStats() {
    const body = document.getElementById('pause-stats-body');
    if (!body) return;
    let stats = {};
    try { stats = JSON.parse(localStorage.getItem('bulsa_stats') || '{}'); } catch (e) {}
    const scenarios = ['excavation', 'foundation', 'lifting', 'envelope', 'mep_finish'];
    const names = { excavation: '토공사', foundation: '기초공사', lifting: '양중', envelope: '외장', mep_finish: '설비·마감' };
    const fines = GAME.state.finesKrw || 0;
    const si    = GAME.state.safetyIndex || 0;
    const rows = scenarios.map(s => {
      const st = stats[s] || {};
      const best = st.bestGrade || '-';
      const completions = st.completions || 0;
      return `<div>📋 ${names[s]} — 최고 ${best} · 완주 ${completions}회</div>`;
    });
    body.innerHTML = `
      <div style="margin-bottom:8px;font-weight:bold;color:#48BB78">현재 세션</div>
      <div>🛡 ${typeof t === 'function' ? t('safetyIndex') : '명'}: ${si}/100</div>
      <div>💰 누적 과태료: ₩${fines.toLocaleString('ko-KR')}</div>
      <div style="margin:10px 0 6px;font-weight:bold;color:#48BB78">시나리오 기록</div>
      ${rows.join('')}
    `;
  }

  function toggle() {
    MENU.open ? close() : open();
  }

  function open() {
    if (MENU.open || !MENU.panel) return;
    MENU.open = true;
    MENU.panel.style.display = 'flex';
    GAME.state.paused = true;
    if (document.pointerLockElement) document.exitPointerLock();
    if (typeof INTERACTION !== 'undefined') INTERACTION.popupOpen = true;
    _switchTab('main');
  }

  function close() {
    if (!MENU.open || !MENU.panel) return;
    MENU.open = false;
    MENU.panel.style.display = 'none';
    GAME.state.paused = false;
    if (typeof INTERACTION !== 'undefined') INTERACTION.popupOpen = false;
  }

  // 난이도 적용 (Inspector 타이밍·과태료 배수)
  function applyDifficulty(d) {
    if (typeof INSPECTOR === 'undefined') return;
    if (d === 'easy')   { INSPECTOR.firstSpawnDelay = [80, 140];  GAME.state.fineMultiplier = 0.5; }
    else if (d === 'hard') { INSPECTOR.firstSpawnDelay = [20, 45];  GAME.state.fineMultiplier = 2.0; }
    else                   { INSPECTOR.firstSpawnDelay = [40, 80];  GAME.state.fineMultiplier = 1.0; }
  }
  window.applyDifficulty = applyDifficulty;

  window.initPauseMenu = initPauseMenu;
  window.openPauseMenu = open;
  window.closePauseMenu = close;
})();
