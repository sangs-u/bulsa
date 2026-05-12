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
          <button data-tab="save"     class="pause-tab-btn">💾 저장</button>
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

        <div id="pause-tab-save" class="pause-tab-content" style="display:none">
          <div id="pause-save-body" style="font-size:13px;line-height:1.7"></div>
          <label class="pause-set-row" style="margin-top:14px">
            <span>👤 프로필</span>
            <input type="text" id="pause-profile-name" maxlength="40" placeholder="이름 입력"
                   style="flex:1;margin-left:12px;padding:4px 8px;background:#1F2937;color:#F0F0F0;
                          border:1px solid #2A3344;border-radius:4px;font-family:inherit">
          </label>
          <button class="pause-btn" id="pause-save-export">📥 저장 파일 내보내기 (.json)</button>
          <button class="pause-btn" id="pause-save-import">📤 저장 파일 불러오기</button>
          <input type="file" id="pause-save-import-input" accept=".json,application/json" style="display:none">
          <button class="pause-btn" id="pause-save-reset" style="background:#742A2A;color:#FED7D7">🗑 모든 저장 데이터 삭제</button>
          <div style="font-size:11px;opacity:0.55;margin-top:10px;line-height:1.5">
            로컬 저장 — 브라우저에만 보관됩니다.<br>
            기기 변경 시 내보내기 → 새 기기에서 불러오기로 이전하세요.
          </div>
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

    // ── 저장 탭 핸들러 ─────────────────────────────────────
    const nameInput = panel.querySelector('#pause-profile-name');
    if (nameInput) {
      try { nameInput.value = (typeof saveGetProfile === 'function' && saveGetProfile().name) || ''; } catch (e) {}
      nameInput.addEventListener('change', () => {
        if (typeof saveSetProfileName === 'function') saveSetProfileName(nameInput.value);
        _renderSave();
      });
    }
    const exportBtn = panel.querySelector('#pause-save-export');
    if (exportBtn) exportBtn.addEventListener('click', () => {
      if (typeof saveDownload === 'function') saveDownload();
    });
    const importBtn = panel.querySelector('#pause-save-import');
    const importInput = panel.querySelector('#pause-save-import-input');
    if (importBtn && importInput) {
      importBtn.addEventListener('click', () => importInput.click());
      importInput.addEventListener('change', () => {
        const f = importInput.files && importInput.files[0];
        if (!f) return;
        if (typeof saveImportFile !== 'function') return;
        saveImportFile(f, (res) => {
          importInput.value = '';
          if (res && res.ok) {
            if (typeof showActionNotif === 'function') {
              const msg = (typeof _SAVE_LABELS !== 'undefined' && _SAVE_LABELS.imported)
                ? (_SAVE_LABELS.imported[currentLang] || _SAVE_LABELS.imported.ko)
                : '✅ 불러오기 완료 · 새로고침합니다';
              showActionNotif(msg, 2000);
            }
            setTimeout(() => window.location.reload(), 1500);
          } else {
            if (typeof showActionNotif === 'function') {
              const msg = (typeof _SAVE_LABELS !== 'undefined' && _SAVE_LABELS.import_fail)
                ? (_SAVE_LABELS.import_fail[currentLang] || _SAVE_LABELS.import_fail.ko)
                : '⚠ 불러오기 실패 — 파일 손상';
              showActionNotif(msg, 2400);
            }
          }
        });
      });
    }
    const resetBtn = panel.querySelector('#pause-save-reset');
    if (resetBtn) resetBtn.addEventListener('click', () => {
      const confirmMsg = (typeof _SAVE_LABELS !== 'undefined' && _SAVE_LABELS.reset_confirm)
        ? (_SAVE_LABELS.reset_confirm[currentLang] || _SAVE_LABELS.reset_confirm.ko)
        : '저장된 모든 데이터를 삭제할까요? 되돌릴 수 없습니다.';
      if (!confirm(confirmMsg)) return;
      if (typeof saveResetAll === 'function') saveResetAll();
      setTimeout(() => window.location.reload(), 1200);
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
    if (tab === 'save')  _renderSave();
  }

  function _renderSave() {
    const body = document.getElementById('pause-save-body');
    if (!body) return;
    let profile = { name: '', firstPlay: Date.now(), totalPlaySec: 0, lastPlay: Date.now() };
    let stats   = { keys: 0, bytes: 0 };
    try {
      if (typeof saveGetProfile === 'function')  profile = saveGetProfile();
      if (typeof saveStorageStats === 'function') stats   = saveStorageStats();
    } catch (e) {}
    const playTime = (typeof saveFormatPlayTime === 'function')
      ? saveFormatPlayTime(profile.totalPlaySec)
      : Math.floor((profile.totalPlaySec || 0) / 60) + '분';
    const sinceDate = new Date(profile.firstPlay || Date.now()).toISOString().slice(0, 10);
    const sizeKB = (stats.bytes / 1024).toFixed(1);
    const nameDisplay = profile.name || '<span style="opacity:0.5">(미지정)</span>';
    body.innerHTML = `
      <div>👤 이름: <b>${nameDisplay}</b></div>
      <div>🗓 시작: ${sinceDate}</div>
      <div>⏱ 총 플레이: ${playTime}</div>
      <div style="opacity:0.7;margin-top:6px;font-size:11px">💾 저장 ${stats.keys}개 · ${sizeKB} KB</div>
    `;
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
      const deaths = st.deathCount || 0;
      return `<div>📋 ${names[s]} — 최고 ${best} · 완주 ${completions}회 · ☠ ${deaths}</div>`;
    });
    // 사고 누적 — 상위 5종
    const acc = (stats._global && stats._global.accidents) || {};
    const sortedAcc = Object.entries(acc).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const _accLbl = (id) => (typeof accidentLabel === 'function' ? accidentLabel(id) : id);
    const accRows = sortedAcc.length
      ? sortedAcc.map(([id, cnt]) => `<div style="opacity:0.85">  · ${_accLbl(id)} × ${cnt}</div>`).join('')
      : '<div style="opacity:0.55">(기록 없음)</div>';
    const totalDeaths = (stats._global && stats._global.totalDeaths) || 0;
    // 명령 통계 — instruction_history 의 HIST 가 영속 + 세션 모두 포함
    const hist = (window._instructionHistory || []);
    const cnt  = { success: 0, reject: 0, accident: 0, danger_skipped: 0, skill_fail: 0, mismatch: 0, interference: 0 };
    hist.forEach(e => {
      if (e.result === 'success') cnt.success++;
      else if (e.result === 'reject_trade' || e.result === 'reject_phase' || e.result === 'danger_refused') cnt.reject++;
      else if (e.result === 'danger_accident' || e.result === 'accident') cnt.accident++;
      else if (e.result === 'danger_skipped') cnt.danger_skipped++;
      else if (e.result === 'skill_fail') cnt.skill_fail++;
      else if (e.result === 'mismatch') cnt.mismatch++;
      else if (e.result === 'interference') cnt.interference++;
    });
    body.innerHTML = `
      <div style="margin-bottom:8px;font-weight:bold;color:#48BB78">현재 세션</div>
      <div>🛡 ${typeof t === 'function' ? t('safetyIndex') : '명'}: ${si}/100</div>
      <div>💰 누적 과태료: ₩${fines.toLocaleString('ko-KR')}</div>
      <div style="margin:10px 0 6px;font-weight:bold;color:#48BB78">시나리오 기록</div>
      ${rows.join('')}
      <div style="margin:10px 0 6px;font-weight:bold;color:#F56565">사고 누적 (총 ☠ ${totalDeaths})</div>
      ${accRows}
      <div style="margin:10px 0 6px;font-weight:bold;color:#4DB8E0">명령 기록 (최근 30)</div>
      <div>✓ 성공 ${cnt.success} · ✗ 거부 ${cnt.reject} · ☠ 사고 ${cnt.accident} · ⚠ 간섭 ${cnt.interference}</div>
      <div style="opacity:0.75">⋯ 운좋음 ${cnt.danger_skipped} · 숙련부족 ${cnt.skill_fail} · 언어 ${cnt.mismatch}</div>
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
