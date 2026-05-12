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

  // ── i18n 라벨 (4언어) ─────────────────────────────────────
  const _PML = {
    title:        { ko: '⏸  일시 정지',         en: '⏸  Paused',                 vi: '⏸  Tạm dừng',                   ar: '⏸  متوقّف' },
    tabMain:      { ko: '메뉴',                  en: 'Menu',                      vi: 'Menu',                            ar: 'القائمة' },
    tabSettings:  { ko: '설정',                  en: 'Settings',                  vi: 'Cài đặt',                         ar: 'الإعدادات' },
    tabStats:     { ko: '통계',                  en: 'Stats',                     vi: 'Thống kê',                        ar: 'الإحصاءات' },
    tabSave:      { ko: '💾 저장',               en: '💾 Save',                   vi: '💾 Lưu',                          ar: '💾 الحفظ' },
    btnResume:    { ko: '▶ 계속하기',            en: '▶ Resume',                  vi: '▶ Tiếp tục',                      ar: '▶ استئناف' },
    btnRetry:     { ko: '↻ 처음부터',            en: '↻ Restart',                 vi: '↻ Khởi động lại',                 ar: '↻ إعادة البدء' },
    btnHub:       { ko: '🏠 시나리오 선택',      en: '🏠 Hub',                    vi: '🏠 Chọn kịch bản',                ar: '🏠 الواجهة' },
    btnQuit:      { ko: '🚪 게임 종료',          en: '🚪 Quit',                   vi: '🚪 Thoát',                        ar: '🚪 خروج' },
    setSound:     { ko: '🔊 사운드',             en: '🔊 Sound',                  vi: '🔊 Âm thanh',                    ar: '🔊 الصوت' },
    setBgm:       { ko: '🎵 BGM',                en: '🎵 BGM',                    vi: '🎵 Nhạc',                         ar: '🎵 موسيقى' },
    setLang:      { ko: '🌐 언어',               en: '🌐 Language',               vi: '🌐 Ngôn ngữ',                     ar: '🌐 اللغة' },
    setSens:      { ko: '🖱 마우스 감도',        en: '🖱 Sensitivity',            vi: '🖱 Độ nhạy chuột',                ar: '🖱 الحساسية' },
    setDiff:      { ko: '⚙ 난이도',              en: '⚙ Difficulty',              vi: '⚙ Độ khó',                        ar: '⚙ الصعوبة' },
    diffEasy:     { ko: '쉬움 (Inspector 늦게, 과태료 ½)', en: 'Easy (slower inspector, ½ fines)', vi: 'Dễ (thanh tra chậm, phạt ½)', ar: 'سهل (مفتش أبطأ، نصف الغرامة)' },
    diffNormal:   { ko: '보통',                  en: 'Normal',                    vi: 'Thường',                          ar: 'عادي' },
    diffHard:     { ko: '어려움 (Inspector 자주, 과태료 ×2)', en: 'Hard (frequent inspector, 2× fines)', vi: 'Khó (thanh tra thường, phạt ×2)', ar: 'صعب (مفتش متكرر، غرامة ×2)' },
    tutorialBtn:  { ko: '📚 튜토리얼 다시 보기', en: '📚 Replay Tutorial',        vi: '📚 Xem lại hướng dẫn',            ar: '📚 إعادة الدليل' },
    save_profile: { ko: '👤 프로필',             en: '👤 Profile',                vi: '👤 Hồ sơ',                        ar: '👤 الملف الشخصي' },
    save_nameph:  { ko: '이름 입력',             en: 'Enter name',                vi: 'Nhập tên',                        ar: 'أدخل الاسم' },
    save_export:  { ko: '📥 저장 파일 내보내기 (.json)', en: '📥 Export save (.json)', vi: '📥 Xuất lưu (.json)',      ar: '📥 تصدير الحفظ (.json)' },
    save_import:  { ko: '📤 저장 파일 불러오기', en: '📤 Import save',            vi: '📤 Nhập lưu',                    ar: '📤 استيراد الحفظ' },
    save_reset:   { ko: '🗑 모든 저장 데이터 삭제', en: '🗑 Reset all save data', vi: '🗑 Xóa toàn bộ',                  ar: '🗑 مسح كل الحفظ' },
    save_hint:    { ko: '로컬 저장 — 브라우저에만 보관됩니다.<br>기기 변경 시 내보내기 → 새 기기에서 불러오기로 이전하세요.',
                    en: 'Local storage — kept in this browser only.<br>To move: export here → import on the new device.',
                    vi: 'Lưu cục bộ — chỉ trong trình duyệt này.<br>Đổi máy: xuất → nhập lại trên máy mới.',
                    ar: 'تخزين محلي — في هذا المتصفح فقط.<br>للنقل: صدّر هنا → استورد على الجهاز الجديد.' },
    save_name:    { ko: '이름',                  en: 'Name',                      vi: 'Tên',                             ar: 'الاسم' },
    save_since:   { ko: '시작',                  en: 'Since',                     vi: 'Bắt đầu',                         ar: 'منذ' },
    save_total:   { ko: '총 플레이',             en: 'Total play',                vi: 'Tổng giờ chơi',                   ar: 'إجمالي اللعب' },
    save_files:   { ko: '저장',                  en: 'saves',                     vi: 'lưu',                             ar: 'حفظ' },
    save_unset:   { ko: '(미지정)',              en: '(unset)',                   vi: '(chưa đặt)',                      ar: '(غير محدد)' },
    confirm_retry:{ ko: '현재 진행을 버리고 처음부터 시작하시겠어요?', en: 'Discard progress and restart?', vi: 'Hủy tiến trình và khởi động lại?', ar: 'تجاهل التقدم وإعادة البدء؟' },
    confirm_quit: { ko: '게임을 종료하시겠어요?', en: 'Quit the game?',            vi: 'Thoát game?',                     ar: 'الخروج من اللعبة؟' },
    stats_session:{ ko: '현재 세션',             en: 'Current session',           vi: 'Phiên hiện tại',                  ar: 'الجلسة الحالية' },
    stats_fines:  { ko: '누적 과태료',           en: 'Total fines',               vi: 'Tổng phạt',                       ar: 'إجمالي الغرامات' },
    stats_scenrec:{ ko: '시나리오 기록',         en: 'Scenario records',          vi: 'Kỷ lục kịch bản',                 ar: 'سجلات السيناريو' },
    stats_accum:  { ko: '사고 누적',             en: 'Total accidents',           vi: 'Tổng sự cố',                      ar: 'إجمالي الحوادث' },
    stats_cmd:    { ko: '명령 기록 (최근 30)',   en: 'Commands (last 30)',        vi: 'Lệnh (30 gần nhất)',              ar: 'الأوامر (آخر 30)' },
    stats_nodata: { ko: '(기록 없음)',           en: '(no records)',              vi: '(không có)',                      ar: '(لا توجد سجلات)' },
    stats_best:   { ko: '최고',                  en: 'best',                      vi: 'tốt nhất',                        ar: 'الأفضل' },
    stats_runs:   { ko: '완주',                  en: 'runs',                      vi: 'hoàn thành',                      ar: 'الإكمالات' },
    stats_succ:   { ko: '성공',                  en: 'success',                   vi: 'thành công',                      ar: 'نجاح' },
    stats_rej:    { ko: '거부',                  en: 'refused',                   vi: 'từ chối',                         ar: 'رفض' },
    stats_acc:    { ko: '사고',                  en: 'accidents',                 vi: 'tai nạn',                         ar: 'حوادث' },
    stats_intf:   { ko: '간섭',                  en: 'interference',              vi: 'xung đột',                        ar: 'تداخل' },
    stats_luck:   { ko: '운좋음',                en: 'lucky',                     vi: 'may mắn',                         ar: 'محظوظ' },
    stats_skill:  { ko: '숙련부족',              en: 'low skill',                 vi: 'thiếu kỹ năng',                   ar: 'مهارة منخفضة' },
    stats_misl:   { ko: '언어',                  en: 'language',                  vi: 'ngôn ngữ',                        ar: 'لغة' },
    scen_excav:   { ko: '토공사',                en: 'Earthworks',                vi: 'San nền',                         ar: 'الحفر' },
    scen_found:   { ko: '기초공사',              en: 'Foundation',                vi: 'Móng',                            ar: 'الأساسات' },
    scen_lift:    { ko: '양중',                  en: 'Rigging',                   vi: 'Cẩu',                             ar: 'الرفع' },
    scen_env:     { ko: '외장',                  en: 'Envelope',                  vi: 'Vỏ ngoài',                        ar: 'الواجهة' },
    scen_mep:     { ko: '설비·마감',             en: 'MEP·Finish',                vi: 'M&E·Hoàn thiện',                  ar: 'الكهروميكانيك' },
    tut_reset:    { ko: '튜토리얼이 다음 게임에서 다시 표시됩니다', en: 'Tutorial will show again next game', vi: 'Hướng dẫn sẽ hiện lại lần sau', ar: 'سيظهر البرنامج التعليمي مرة أخرى' },
  };
  function _pml(k) {
    const e = _PML[k];
    if (!e) return k;
    const L = (typeof currentLang !== 'undefined' && currentLang) || 'ko';
    return e[L] || e.ko;
  }

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
                    color:#E2E8F0;letter-spacing:1px">${_pml('title')}</div>

        <div id="pause-tabs" style="display:flex;gap:4px;margin-bottom:14px;border-bottom:1px solid #2A3344">
          <button data-tab="main"     class="pause-tab-btn active">${_pml('tabMain')}</button>
          <button data-tab="settings" class="pause-tab-btn">${_pml('tabSettings')}</button>
          <button data-tab="stats"    class="pause-tab-btn">${_pml('tabStats')}</button>
          <button data-tab="save"     class="pause-tab-btn">${_pml('tabSave')}</button>
        </div>

        <div id="pause-tab-main" class="pause-tab-content">
          <button class="pause-btn pause-resume">${_pml('btnResume')}</button>
          <button class="pause-btn pause-retry">${_pml('btnRetry')}</button>
          <button class="pause-btn pause-hub">${_pml('btnHub')}</button>
          <button class="pause-btn pause-quit" style="background:#742A2A;color:#FED7D7">${_pml('btnQuit')}</button>
        </div>

        <div id="pause-tab-settings" class="pause-tab-content" style="display:none">
          <label class="pause-set-row">
            <span>${_pml('setSound')}</span>
            <input type="range" id="pause-vol" min="0" max="100" value="60" style="flex:1;margin:0 12px">
            <span id="pause-vol-num" style="min-width:32px;text-align:right">60</span>
          </label>
          <label class="pause-set-row">
            <span>${_pml('setBgm')}</span>
            <input type="checkbox" id="pause-bgm" checked>
          </label>
          <label class="pause-set-row">
            <span>${_pml('setLang')}</span>
            <select id="pause-lang" style="flex:1;margin-left:12px;padding:4px;background:#1F2937;color:#F0F0F0;border:1px solid #2A3344;border-radius:4px">
              <option value="ko">한국어</option>
              <option value="en">English</option>
              <option value="ar">العربية</option>
              <option value="vi">Tiếng Việt</option>
            </select>
          </label>
          <label class="pause-set-row">
            <span>${_pml('setSens')}</span>
            <input type="range" id="pause-sens" min="5" max="40" value="18" style="flex:1;margin:0 12px">
            <span id="pause-sens-num" style="min-width:32px;text-align:right">1.8</span>
          </label>
          <label class="pause-set-row">
            <span>${_pml('setDiff')}</span>
            <select id="pause-difficulty" style="flex:1;margin-left:12px;padding:4px;background:#1F2937;color:#F0F0F0;border:1px solid #2A3344;border-radius:4px">
              <option value="easy">${_pml('diffEasy')}</option>
              <option value="normal" selected>${_pml('diffNormal')}</option>
              <option value="hard">${_pml('diffHard')}</option>
            </select>
          </label>
          <button class="pause-btn pause-tutorial-reset" style="margin-top:8px">${_pml('tutorialBtn')}</button>
        </div>

        <div id="pause-tab-stats" class="pause-tab-content" style="display:none">
          <div id="pause-stats-body" style="font-size:13px;line-height:1.95"></div>
        </div>

        <div id="pause-tab-save" class="pause-tab-content" style="display:none">
          <div id="pause-save-body" style="font-size:13px;line-height:1.7"></div>
          <label class="pause-set-row" style="margin-top:14px">
            <span>${_pml('save_profile')}</span>
            <input type="text" id="pause-profile-name" maxlength="40" placeholder="${_pml('save_nameph')}"
                   style="flex:1;margin-left:12px;padding:4px 8px;background:#1F2937;color:#F0F0F0;
                          border:1px solid #2A3344;border-radius:4px;font-family:inherit">
          </label>
          <button class="pause-btn" id="pause-save-export">${_pml('save_export')}</button>
          <button class="pause-btn" id="pause-save-import">${_pml('save_import')}</button>
          <input type="file" id="pause-save-import-input" accept=".json,application/json" style="display:none">
          <button class="pause-btn" id="pause-save-reset" style="background:#742A2A;color:#FED7D7">${_pml('save_reset')}</button>
          <div style="font-size:11px;opacity:0.55;margin-top:10px;line-height:1.5">
            ${_pml('save_hint')}
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
      if (confirm(_pml('confirm_retry'))) {
        window.location.reload();
      }
    });
    panel.querySelector('.pause-hub').addEventListener('click', () => {
      window.location.href = 'index.html';
    });
    panel.querySelector('.pause-quit').addEventListener('click', () => {
      if (confirm(_pml('confirm_quit'))) {
        try { window.close(); } catch (e) {}
        window.location.href = 'about:blank';
      }
    });
    panel.querySelector('.pause-tutorial-reset').addEventListener('click', () => {
      try { localStorage.removeItem('bulsa_tutorial_seen'); } catch (e) {}
      if (typeof showActionNotif === 'function') showActionNotif(_pml('tut_reset'), 2400);
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
      // 언어 변경 시 메뉴 자체 라벨도 즉시 갱신 — 패널을 한 번 재빌드.
      const wasOpen = MENU.open;
      const wasTab = MENU.activeTab;
      try { panel.remove(); } catch (e) {}
      MENU.panel = null;
      _build();
      if (wasOpen) {
        MENU.panel.style.display = 'flex';
        _switchTab(wasTab || 'settings');
      }
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
      : Math.floor((profile.totalPlaySec || 0) / 60) + 'm';
    const sinceDate = new Date(profile.firstPlay || Date.now()).toISOString().slice(0, 10);
    const sizeKB = (stats.bytes / 1024).toFixed(1);
    const nameDisplay = profile.name || `<span style="opacity:0.5">${_pml('save_unset')}</span>`;
    body.innerHTML = `
      <div>👤 ${_pml('save_name')}: <b>${nameDisplay}</b></div>
      <div>🗓 ${_pml('save_since')}: ${sinceDate}</div>
      <div>⏱ ${_pml('save_total')}: ${playTime}</div>
      <div style="opacity:0.7;margin-top:6px;font-size:11px">💾 ${stats.keys} ${_pml('save_files')} · ${sizeKB} KB</div>
    `;
  }

  function _renderStats() {
    const body = document.getElementById('pause-stats-body');
    if (!body) return;
    let stats = {};
    try { stats = JSON.parse(localStorage.getItem('bulsa_stats') || '{}'); } catch (e) {}
    const scenarios = ['excavation', 'foundation', 'lifting', 'envelope', 'mep_finish'];
    const _scenName = (s) => {
      const k = { excavation: 'scen_excav', foundation: 'scen_found', lifting: 'scen_lift', envelope: 'scen_env', mep_finish: 'scen_mep' }[s];
      return k ? _pml(k) : s;
    };
    const fines = GAME.state.finesKrw || 0;
    const si    = GAME.state.safetyIndex || 0;
    const rows = scenarios.map(s => {
      const st = stats[s] || {};
      const best = st.bestGrade || '-';
      const completions = st.completions || 0;
      const deaths = st.deathCount || 0;
      return `<div>📋 ${_scenName(s)} — ${_pml('stats_best')} ${best} · ${_pml('stats_runs')} ${completions} · ☠ ${deaths}</div>`;
    });
    // 사고 누적 — 상위 5종
    const acc = (stats._global && stats._global.accidents) || {};
    const sortedAcc = Object.entries(acc).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const _accLbl = (id) => (typeof accidentLabel === 'function' ? accidentLabel(id) : id);
    const accRows = sortedAcc.length
      ? sortedAcc.map(([id, cnt]) => `<div style="opacity:0.85">  · ${_accLbl(id)} × ${cnt}</div>`).join('')
      : `<div style="opacity:0.55">${_pml('stats_nodata')}</div>`;
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
      <div style="margin-bottom:8px;font-weight:bold;color:#48BB78">${_pml('stats_session')}</div>
      <div>🛡 ${typeof t === 'function' ? t('safetyIndex') : '명'}: ${si}/100</div>
      <div>💰 ${_pml('stats_fines')}: ₩${fines.toLocaleString('ko-KR')}</div>
      <div style="margin:10px 0 6px;font-weight:bold;color:#48BB78">${_pml('stats_scenrec')}</div>
      ${rows.join('')}
      <div style="margin:10px 0 6px;font-weight:bold;color:#F56565">${_pml('stats_accum')} (☠ ${totalDeaths})</div>
      ${accRows}
      <div style="margin:10px 0 6px;font-weight:bold;color:#4DB8E0">${_pml('stats_cmd')}</div>
      <div>✓ ${_pml('stats_succ')} ${cnt.success} · ✗ ${_pml('stats_rej')} ${cnt.reject} · ☠ ${_pml('stats_acc')} ${cnt.accident} · ⚠ ${_pml('stats_intf')} ${cnt.interference}</div>
      <div style="opacity:0.75">⋯ ${_pml('stats_luck')} ${cnt.danger_skipped} · ${_pml('stats_skill')} ${cnt.skill_fail} · ${_pml('stats_misl')} ${cnt.mismatch}</div>
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
