// 사고 라이브러리 (L 키 토글) — 미발생 사고도 학습 가능
//
// 데이터 source: GLOBAL_ACCIDENTS + 시나리오별 *_DATA.accidents.
// 리스트에서 사고 클릭 → 4언어 desc/cause/law/procedure 상세 표시.

(function () {
  let _panel = null;
  let _btn   = null;
  let _open  = false;
  let _selected = null;

  function _allAccidents() {
    const out = {};
    const merge = (obj) => { if (obj) Object.keys(obj).forEach(k => { out[k] = out[k] || obj[k]; }); };
    if (typeof GLOBAL_ACCIDENTS !== 'undefined') merge(GLOBAL_ACCIDENTS);
    ['LIFTING_DATA','EXCAVATION_DATA','FOUNDATION_DATA','ENVELOPE_DATA','MEP_DATA'].forEach(k => {
      const d = window[k];
      if (d && d.accidents) merge(d.accidents);
    });
    return out;
  }

  function _label(id) {
    return (typeof accidentLabel === 'function') ? accidentLabel(id) : id;
  }

  function _pick(data, base) {
    const suffix = { ko: 'Ko', en: 'En', vi: 'Vi', ar: 'Ar' }[currentLang] || 'Ko';
    return data[base + suffix] || data[base + 'En'] || data[base + 'Ko'] || '';
  }

  function _ensureBtn() {
    if (_btn) return _btn;
    const btn = document.createElement('div');
    btn.id = 'acc-lib-btn';
    btn.style.cssText =
      'position:fixed;right:12px;bottom:48px;z-index:9100;' +
      'padding:6px 10px;border-radius:8px;cursor:pointer;' +
      'background:rgba(40,15,15,0.85);color:#fff;font-family:monospace;font-size:12px;' +
      'border:1px solid rgba(255,80,80,0.35);user-select:none';
    btn.title = 'L — 사고 라이브러리 / Accident library';
    btn.addEventListener('click', toggle);
    document.body.appendChild(btn);
    _btn = btn;
    _renderBtnLabel();
    return btn;
  }

  function _renderBtnLabel() {
    if (!_btn) return;
    const cnt = Object.keys(_allAccidents()).length;
    const lbl = { ko: '📚 사고', en: '📚 Accidents', vi: '📚 Tai nạn', ar: '📚 الحوادث' }[currentLang] || '📚 사고';
    _btn.textContent = `${lbl} ${cnt}`;
  }

  function _ensurePanel() {
    if (_panel) return _panel;
    const panel = document.createElement('div');
    panel.id = 'acc-lib-panel';
    panel.style.cssText =
      'position:fixed;right:12px;bottom:84px;z-index:9099;' +
      'width:420px;max-height:65vh;overflow-y:auto;' +
      'background:rgba(15,20,35,0.97);color:#eaeaea;font-family:monospace;font-size:12px;' +
      'border:1px solid rgba(255,100,100,0.35);border-radius:8px;padding:10px 12px;' +
      'box-shadow:0 8px 28px rgba(0,0,0,0.55);display:none';
    document.body.appendChild(panel);
    _panel = panel;
    return panel;
  }

  function _renderPanel() {
    const panel = _ensurePanel();
    const all   = _allAccidents();
    const ids   = Object.keys(all).sort();
    const titles = {
      ko: '사고 라이브러리 — 학습용 전체 목록',
      en: 'Accident Library — full learning set',
      vi: 'Thư viện tai nạn — toàn bộ học tập',
      ar: 'مكتبة الحوادث — قائمة تعلّم كاملة',
    };
    const clickHint = { ko: '항목 클릭 → 상세', en: 'Click for detail', vi: 'Bấm để xem', ar: 'انقر للتفاصيل' }[currentLang] || '';
    let html = `<div style="opacity:0.85;border-bottom:1px solid rgba(255,255,255,0.2);padding-bottom:6px;margin-bottom:6px">${titles[currentLang] || titles.ko} <span style="opacity:0.55">· ${clickHint}</span></div>`;
    html += '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px">';
    ids.forEach(id => {
      const active = (id === _selected);
      html += `<span data-acc-id="${id}" style="cursor:pointer;padding:2px 7px;border-radius:9px;font-size:11px;background:${active ? '#7a2020' : 'rgba(255,255,255,0.08)'};border:1px solid ${active ? '#ff6060' : 'rgba(255,255,255,0.15)'}">${_label(id)}</span>`;
    });
    html += '</div>';
    if (_selected && all[_selected]) {
      const d = all[_selected];
      const desc  = _pick(d, 'desc');
      const cause = _pick(d, 'cause');
      const law   = _pick(d, 'law');
      const proc  = d['procedure' + ({ ko: 'Ko', en: 'En', vi: 'Vi', ar: 'Ar' }[currentLang] || 'Ko')] || d.procedureKo || [];
      const lbls = { ko: ['상황','원인','법령','절차'], en: ['Situation','Cause','Law','Procedure'], vi: ['Tình huống','Nguyên nhân','Pháp lý','Quy trình'], ar: ['الحالة','السبب','القانون','الإجراءات'] }[currentLang] || ['상황','원인','법령','절차'];
      html += '<div style="border-top:1px solid rgba(255,255,255,0.15);padding-top:6px;line-height:1.6">';
      html += `<div style="color:#ff8080;font-weight:bold;margin-bottom:4px">☠ ${_label(_selected)}</div>`;
      if (desc)  html += `<div><b>${lbls[0]}</b>: ${desc}</div>`;
      if (cause) html += `<div><b>${lbls[1]}</b>: ${cause}</div>`;
      if (law)   html += `<div style="white-space:pre-line"><b>${lbls[2]}</b>:\n${law}</div>`;
      if (proc && proc.length) {
        html += `<div style="margin-top:4px"><b>${lbls[3]}</b><ol style="margin:4px 0 0 18px;padding:0">${proc.map(s => `<li>${s}</li>`).join('')}</ol></div>`;
      }
      html += '</div>';
    } else {
      html += '<div style="opacity:0.55">(왼쪽 칩 선택)</div>';
    }
    panel.innerHTML = html;
    panel.querySelectorAll('[data-acc-id]').forEach(el => {
      el.addEventListener('click', () => {
        _selected = el.getAttribute('data-acc-id');
        _renderPanel();
      });
    });
  }

  function toggle() {
    _ensureBtn();
    const panel = _ensurePanel();
    _open = !_open;
    panel.style.display = _open ? 'block' : 'none';
    if (_open) _renderPanel();
  }

  function refreshAccLibI18n() {
    _renderBtnLabel();
    if (_open) _renderPanel();
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'l' || e.key === 'L') {
      if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
      toggle();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _ensureBtn);
  } else {
    _ensureBtn();
  }

  window.toggleAccLib       = toggle;
  window.refreshAccLibI18n  = refreshAccLibI18n;
})();
