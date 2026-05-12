// 통계 — 시나리오 완주 시 기록 누적 (localStorage). 일시정지 메뉴 통계 탭에서 표시.

(function () {
  'use strict';
  if (typeof window === 'undefined') return;

  function _read() {
    try { return JSON.parse(localStorage.getItem('bulsa_stats') || '{}'); }
    catch (e) { return {}; }
  }
  function _write(s) {
    try { localStorage.setItem('bulsa_stats', JSON.stringify(s)); } catch (e) {}
  }

  function recordCompletion(scenarioId, ctx) {
    const s = _read();
    s[scenarioId] = s[scenarioId] || { completions: 0, bestGrade: null, bestSafetyIndex: 0, minFines: Infinity };
    s[scenarioId].completions += 1;
    const grade = ctx.grade && ctx.grade.label ? ctx.grade.label[0] : null;
    if (grade) {
      const order = ['D','C','B','A','S'];
      const curBest = s[scenarioId].bestGrade;
      if (!curBest || order.indexOf(grade) > order.indexOf(curBest)) s[scenarioId].bestGrade = grade;
    }
    if ((ctx.safetyIndex || 0) > s[scenarioId].bestSafetyIndex) s[scenarioId].bestSafetyIndex = ctx.safetyIndex || 0;
    if ((ctx.fines || 0) < s[scenarioId].minFines) s[scenarioId].minFines = ctx.fines || 0;
    _write(s);
  }

  // 사고 발생 시 누적 — accident.js triggerAccident 에서 호출
  function recordAccident(scenarioId, accidentId) {
    const s = _read();
    s._global           = s._global || { accidents: {}, totalDeaths: 0 };
    s._global.accidents = s._global.accidents || {};
    s._global.accidents[accidentId] = (s._global.accidents[accidentId] || 0) + 1;
    s._global.totalDeaths += 1;
    if (scenarioId) {
      s[scenarioId]            = s[scenarioId] || { completions: 0, bestGrade: null, bestSafetyIndex: 0, minFines: Infinity };
      s[scenarioId].accidents  = s[scenarioId].accidents || {};
      s[scenarioId].accidents[accidentId] = (s[scenarioId].accidents[accidentId] || 0) + 1;
      s[scenarioId].deathCount = (s[scenarioId].deathCount || 0) + 1;
    }
    _write(s);
  }

  function getStats() { return _read(); }

  function resetStats() {
    try { localStorage.removeItem('bulsa_stats'); } catch (e) {}
  }

  window.recordCompletion = recordCompletion;
  window.recordAccident   = recordAccident;
  window.getStats         = getStats;
  window.resetStats       = resetStats;
})();
