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

  function getStats() { return _read(); }

  window.recordCompletion = recordCompletion;
  window.getStats = getStats;
})();
