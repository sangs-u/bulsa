// v2.0 활성 작업 칩 위젯 — hud-tl 영역에 GAME.activeTasks 시각화
//
// 각 칩 = 작업 라벨 (i18n) + 그룹 색상. 충돌 중인 작업은 적색 테두리.
// 매 프레임 호출 (delta 무관, 빠른 DOM 재구성). 칩 수는 보통 3~6개라 비용 미미.

(function () {
  let _wrap = null;
  let _lastSig = '';

  const _GROUP_BG = {
    temporary:  'rgba(120,160,200,0.55)',
    main_once:  'rgba(160,120,90,0.55)',
    main_cycle: 'rgba(200,150,80,0.55)',
    finish:     'rgba(100,180,140,0.55)',
    continuous: 'rgba(140,140,180,0.55)',
  };

  function _ensureWrap() {
    if (_wrap) return _wrap;
    const tl = document.getElementById('hud-tl');
    if (!tl) return null;
    _wrap = document.createElement('span');
    _wrap.id = 'hud-task-chips';
    _wrap.style.cssText = 'display:inline-flex;flex-wrap:wrap;gap:4px;margin-left:8px;vertical-align:middle';
    tl.appendChild(_wrap);
    return _wrap;
  }

  function _label(type) {
    const def = (typeof TASK_TYPES !== 'undefined') && TASK_TYPES[type];
    if (!def) return type;
    return (def.label && (def.label[currentLang] || def.label.ko)) || type;
  }

  function _group(type) {
    const def = (typeof TASK_TYPES !== 'undefined') && TASK_TYPES[type];
    return (def && def.group) || 'continuous';
  }

  function _conflictIds() {
    if (typeof evaluateInterference !== 'function') return new Set();
    const ids = new Set();
    try {
      const conflicts = evaluateInterference();
      conflicts.forEach(c => { ids.add(c.a.id); ids.add(c.b.id); });
    } catch (e) {}
    return ids;
  }

  function updateTaskChips() {
    const wrap = _ensureWrap();
    if (!wrap) return;
    const tasks = (typeof getActiveTasks === 'function') ? getActiveTasks() : [];
    const conflicting = _conflictIds();

    // 시그니처로 변경 감지 — 불필요한 DOM 재생성 회피
    const sig = tasks.map(t => {
      const flagStr = t.flags ? Object.keys(t.flags).filter(k => t.flags[k]).join(',') : '';
      return t.id + ':' + t.type + ':' + (conflicting.has(t.id) ? '!' : '') + ':' + flagStr + ':' + currentLang;
    }).join('|');
    if (sig === _lastSig) return;
    _lastSig = sig;

    wrap.innerHTML = '';
    tasks.forEach(t => {
      const chip = document.createElement('span');
      const inConflict  = conflicting.has(t.id);
      const flagsActive = !!(t.flags && Object.keys(t.flags).some(k => t.flags[k]));
      const bg = _GROUP_BG[_group(t.type)] || _GROUP_BG.continuous;
      // 우선순위: 충돌 > flag > 평상시
      const borderColor = inConflict ? '#ff5050' : (flagsActive ? '#ffb340' : 'rgba(255,255,255,0.18)');
      const glow = inConflict ? '0 0 6px rgba(255,80,80,0.6)' : (flagsActive ? '0 0 4px rgba(255,180,60,0.45)' : 'none');
      chip.style.cssText =
        'padding:2px 8px;border-radius:10px;font-family:monospace;font-size:12px;letter-spacing:0.3px;cursor:default;' +
        'color:#fff;background:' + bg + ';' +
        'border:1.5px solid ' + borderColor + ';' +
        'box-shadow:' + glow + ';';
      const floorTag = (t.floor != null) ? (' ' + t.floor + 'F') : '';
      const prefix = inConflict ? '⚠ ' : (flagsActive ? '🔶 ' : '');
      chip.textContent = prefix + _label(t.type) + floorTag;
      // 풍부한 tooltip — type · floor · loc · flags
      const flags = (t.flags && Object.keys(t.flags).filter(k => t.flags[k])) || [];
      const tip = [
        `${_label(t.type)} (${t.type})`,
        t.floor != null ? `층: ${t.floor}F` : null,
        t.loc ? `위치: (${t.loc.x.toFixed(1)}, ${t.loc.z.toFixed(1)})` : null,
        flags.length ? `flags: ${flags.join(', ')}` : null,
        inConflict ? '⚠ 간섭 진행 중' : null,
      ].filter(Boolean).join('\n');
      chip.title = tip;
      wrap.appendChild(chip);
    });
  }

  window.updateTaskChips = updateTaskChips;
})();
