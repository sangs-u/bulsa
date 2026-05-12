// v2.0 명령 히스토리 UI — 시도/거부/사고 기록을 학습 도구로 시각화
//
// 사용:
//   recordInstructionEvent(npc, inst, result)
//     result: 'mismatch' | 'reject_trade' | 'reject_phase' | 'danger_refused'
//           | 'danger_accident' | 'danger_skipped' | 'skill_fail' | 'success'
//   토글 키: H

(function () {
  const STORAGE_KEY = 'bulsa_instr_history';
  function _load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch (e) { return []; }
  }
  function _save(arr) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); } catch (e) {}
  }

  const HIST = (window._instructionHistory = window._instructionHistory || _load());
  const MAX  = 30;
  let _panel  = null;
  let _btn    = null;
  let _open   = false;

  const RESULT_META = {
    mismatch:        { bg: '#9a4d9a', kr: '언어불일치', en: 'Mismatch',  vi: 'Sai ngôn ngữ', ar: 'لغة خاطئة' },
    reject_trade:    { bg: '#a06030', kr: '직종거부',   en: 'Trade rej', vi: 'Từ chối nghề', ar: 'رفض المهنة' },
    reject_phase:    { bg: '#a06030', kr: '단계거부',   en: 'Phase rej', vi: 'Từ chối pha', ar: 'رفض المرحلة' },
    danger_refused:  { bg: '#447a44', kr: '양심거부',   en: 'Refused',   vi: 'Từ chối',     ar: 'رفض ضميري' },
    danger_accident: { bg: '#a02828', kr: '사고발생',   en: 'Accident',  vi: 'Tai nạn',     ar: 'حادث' },
    danger_skipped:  { bg: '#a07028', kr: '운좋음',     en: 'Lucky',     vi: 'May mắn',     ar: 'محظوظ' },
    skill_fail:      { bg: '#707070', kr: '숙련부족',   en: 'Low skill', vi: 'Kém kỹ năng', ar: 'مهارة ضعيفة' },
    success:         { bg: '#2e7d32', kr: '성공',       en: 'OK',        vi: 'OK',          ar: 'نجح' },
    accident:        { bg: '#7a0000', kr: '☠ 사고',     en: '☠ Accident',vi: '☠ Tai nạn',   ar: '☠ حادث' },
    interference:    { bg: '#9a3030', kr: '⚠ 간섭',     en: '⚠ Interfere',vi: '⚠ Xung đột',  ar: '⚠ تداخل' },
  };

  function recordAccidentEvent(accidentId, cause) {
    const label = (typeof accidentLabel === 'function') ? accidentLabel(accidentId) : accidentId;
    HIST.unshift({
      t:      Date.now(),
      npc:    cause || '—',
      inst:   accidentId,
      label,
      risk:   'danger',
      result: 'accident',
    });
    while (HIST.length > MAX) HIST.pop();
    _save(HIST);
    if (_open) _renderPanel();
    _renderBtnBadge();
  }

  function recordInterferenceEvent(rule, aType, bType) {
    const label = `${aType} × ${bType}`;
    HIST.unshift({
      t:      Date.now(),
      npc:    '간섭',
      inst:   rule.cond,
      label,
      risk:   'danger',
      result: 'interference',
    });
    while (HIST.length > MAX) HIST.pop();
    _save(HIST);
    if (_open) _renderPanel();
    _renderBtnBadge();
  }
  window.recordAccidentEvent     = recordAccidentEvent;
  window.recordInterferenceEvent = recordInterferenceEvent;

  function _resultLabel(r) {
    const m = RESULT_META[r];
    if (!m) return r;
    return { ko: m.kr, en: m.en, vi: m.vi, ar: m.ar }[currentLang] || m.kr;
  }
  function _instLabel(inst) {
    if (!inst) return '?';
    return inst['label' + (currentLang === 'en' ? 'En' : currentLang === 'vi' ? 'Vi' : currentLang === 'ar' ? 'Ar' : 'Ko')] || inst.labelKo || inst.id;
  }

  function recordInstructionEvent(npc, inst, result) {
    HIST.unshift({
      t:      Date.now(),
      npc:    (npc && npc.name) || (npc && npc.id) || '?',
      inst:   inst && inst.id,
      label:  _instLabel(inst),
      risk:   inst && inst.risk,
      result,
    });
    while (HIST.length > MAX) HIST.pop();
    _save(HIST);
    if (_open) _renderPanel();
    _renderBtnBadge();
  }

  function clearHistory() {
    HIST.length = 0;
    _save(HIST);
    if (_open) _renderPanel();
    _renderBtnBadge();
  }
  window.clearInstructionHistory = clearHistory;

  function _stats() {
    const s = { total: HIST.length, success: 0, accident: 0, reject: 0, other: 0 };
    HIST.forEach(e => {
      if (e.result === 'success') s.success++;
      else if (e.result === 'danger_accident') s.accident++;
      else if (e.result.indexOf('reject') === 0 || e.result === 'danger_refused') s.reject++;
      else s.other++;
    });
    return s;
  }

  function _ensureBtn() {
    if (_btn) return _btn;
    const btn = document.createElement('div');
    btn.id = 'instr-history-btn';
    btn.style.cssText =
      'position:fixed;right:12px;bottom:12px;z-index:9100;' +
      'padding:6px 10px;border-radius:8px;cursor:pointer;' +
      'background:rgba(20,30,50,0.85);color:#fff;font-family:monospace;font-size:12px;' +
      'border:1px solid rgba(255,255,255,0.2);user-select:none';
    btn.title = 'H — 명령 히스토리 / Instruction history';
    btn.addEventListener('click', toggleHistory);
    document.body.appendChild(btn);
    _btn = btn;
    _renderBtnBadge();
    return btn;
  }

  function _renderBtnBadge() {
    if (!_btn) return;
    const s = _stats();
    const lbl = { ko: '📋 명령', en: '📋 Cmd', vi: '📋 Lệnh', ar: '📋 الأوامر' }[currentLang] || '📋 명령';
    _btn.textContent = `${lbl} ${s.total} · ✓${s.success} ✗${s.reject} ☠${s.accident}`;
  }

  function _ensurePanel() {
    if (_panel) return _panel;
    const panel = document.createElement('div');
    panel.id = 'instr-history-panel';
    panel.style.cssText =
      'position:fixed;right:12px;bottom:48px;z-index:9099;' +
      'width:340px;max-height:60vh;overflow-y:auto;' +
      'background:rgba(15,20,35,0.95);color:#eaeaea;font-family:monospace;font-size:12px;' +
      'border:1px solid rgba(255,255,255,0.25);border-radius:8px;padding:8px 10px;' +
      'box-shadow:0 6px 24px rgba(0,0,0,0.5);display:none';
    document.body.appendChild(panel);
    _panel = panel;
    return panel;
  }

  function _renderPanel() {
    const panel = _ensurePanel();
    const s = _stats();
    const titles = {
      ko: '명령 히스토리 (최근 30)',
      en: 'Instruction history (last 30)',
      vi: 'Lịch sử lệnh (30 gần nhất)',
      ar: 'سجل الأوامر (آخر 30)',
    };
    const hdr = (titles[currentLang] || titles.ko) +
      `  · ✓${s.success}  ✗${s.reject}  ☠${s.accident}  ⋯${s.other}`;
    let html = `<div style="opacity:0.8;margin-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.18);padding-bottom:4px">${hdr}</div>`;
    if (HIST.length === 0) {
      const empty = { ko: '(기록 없음)', en: '(no records)', vi: '(không có)', ar: '(لا توجد سجلات)' }[currentLang] || '(없음)';
      html += `<div style="opacity:0.55;padding:8px 0">${empty}</div>`;
    } else {
      HIST.forEach((e, i) => {
        const meta     = RESULT_META[e.result] || { bg: '#555' };
        const ago      = _ago(e.t);
        const clickable = (e.result === 'accident' || e.result === 'danger_accident');
        html +=
          `<div data-hist-i="${i}" style="display:flex;gap:6px;align-items:center;padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.08);${clickable ? 'cursor:pointer' : ''}" title="${clickable ? '클릭 → 사고 라이브러리' : ''}">` +
            `<span style="background:${meta.bg};padding:1px 6px;border-radius:4px;font-size:11px;min-width:62px;text-align:center">${_resultLabel(e.result)}</span>` +
            `<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e.npc} · ${e.label}</span>` +
            `<span style="opacity:0.55;font-size:10px">${ago}</span>` +
          `</div>`;
      });
    }
    panel.innerHTML = html;
    panel.querySelectorAll('[data-hist-i]').forEach(el => {
      const i = +el.getAttribute('data-hist-i');
      const e = HIST[i];
      if (!e) return;
      if (e.result === 'accident' || e.result === 'danger_accident') {
        el.addEventListener('click', () => {
          // 사고 라이브러리 열고 사고 ID 선택 시도
          if (typeof toggleAccLib === 'function') {
            const panelEl = document.getElementById('acc-lib-panel');
            if (!panelEl || panelEl.style.display !== 'block') toggleAccLib();
            // 한 번 더 호출되면 닫히니, 상태 확인 후 진입만
            setTimeout(() => {
              const chip = document.querySelector(`#acc-lib-panel [data-acc-id="${e.inst}"]`);
              if (chip) chip.click();
            }, 50);
          }
        });
      }
    });
  }

  function _ago(t) {
    const s = Math.floor((Date.now() - t) / 1000);
    if (s < 60) return s + 's';
    const m = Math.floor(s / 60);
    if (m < 60) return m + 'm';
    return Math.floor(m / 60) + 'h';
  }

  function toggleHistory() {
    _ensureBtn();
    const panel = _ensurePanel();
    _open = !_open;
    panel.style.display = _open ? 'block' : 'none';
    if (_open) _renderPanel();
  }

  function refreshHistoryI18n() {
    _renderBtnBadge();
    if (_open) _renderPanel();
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'h' || e.key === 'H') {
      if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
      toggleHistory();
    }
  });

  // DOM 준비 후 버튼 생성
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _ensureBtn);
  } else {
    _ensureBtn();
  }

  window.recordInstructionEvent = recordInstructionEvent;
  window.toggleHistory          = toggleHistory;
  window.refreshHistoryI18n     = refreshHistoryI18n;
})();
