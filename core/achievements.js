// Achievement 시스템 — 12개 업적, 토스트 팝업, localStorage 영속.

(function () {
  'use strict';
  if (typeof window === 'undefined') return;

  const ACH = {
    unlocked: new Set(),
    queue: [],
    showing: false,
  };
  window.ACHIEVEMENTS_STATE = ACH;

  // 업적 정의 — id, 한글/영문 이름, 설명, 조건
  const ACHIEVEMENTS = [
    { id: 'first_start',     ko: '첫 출근',           en: 'First Day',         desc_ko: '게임 첫 실행',                  emoji: '🦺' },
    { id: 'safe_excavation', ko: '안전 굴착',         en: 'Safe Dig',          desc_ko: '토공 무위반·무사고 완주',         emoji: '⛏' },
    { id: 'safe_foundation', ko: '튼튼한 기초',       en: 'Solid Base',        desc_ko: '기초공사 무위반·무사고 완주',      emoji: '🧱' },
    { id: 'safe_lifting',    ko: '완벽한 양중',       en: 'Perfect Lift',      desc_ko: '양중 5층 무사고 완주',             emoji: '🏗' },
    { id: 'safe_envelope',   ko: '깔끔한 외장',       en: 'Clean Skin',        desc_ko: '외장공사 무위반·무사고 완주',      emoji: '🪟' },
    { id: 'safe_mep',        ko: '안전한 설비',       en: 'Live Free',         desc_ko: '설비 무위반·무사고 완주',          emoji: '⚡' },
    { id: 'no_fines_run',    ko: '깨끗한 작업장',     en: 'No Penalties',      desc_ko: '한 시나리오 과태료 0원 완주',      emoji: '✨' },
    { id: 'grade_s',         ko: 'S 등급',           en: 'S Grade',            desc_ko: '종합 등급 S 달성',                emoji: '🥇' },
    { id: 'full_circuit',    ko: '5층 건물 완공',     en: 'Whole Build',        desc_ko: '5개 시나리오 모두 완주',          emoji: '🏢' },
    { id: 'survivor',        ko: '생존자',            en: 'Survivor',           desc_ko: '추락 경상 후 회복하여 완주',        emoji: '🩹' },
    { id: 'inspector_pass',  ko: '점검 통과',         en: 'Pass Inspection',    desc_ko: '안전관리자 점검 위반 0건 통과',   emoji: '✅' },
    { id: 'high_roller',     ko: '돈낭비',            en: 'High Roller',        desc_ko: '누적 과태료 ₩30,000,000 돌파',   emoji: '💸' },
  ];
  window.ACHIEVEMENTS = ACHIEVEMENTS;

  function _load() {
    try {
      const raw = localStorage.getItem('bulsa_achievements') || '[]';
      const arr = JSON.parse(raw);
      arr.forEach(id => ACH.unlocked.add(id));
    } catch (e) {}
  }

  function _save() {
    try {
      localStorage.setItem('bulsa_achievements', JSON.stringify([...ACH.unlocked]));
    } catch (e) {}
  }

  function initAchievements() {
    _load();
    unlock('first_start');
  }

  function unlock(id) {
    if (ACH.unlocked.has(id)) return;
    const a = ACHIEVEMENTS.find(x => x.id === id);
    if (!a) return;
    ACH.unlocked.add(id);
    _save();
    _enqueue(a);
  }

  function _enqueue(a) {
    ACH.queue.push(a);
    if (!ACH.showing) _showNext();
  }

  function _showNext() {
    if (ACH.queue.length === 0) { ACH.showing = false; return; }
    ACH.showing = true;
    const a = ACH.queue.shift();
    const div = document.createElement('div');
    div.className = 'ach-toast';
    div.style.cssText = `
      position:fixed; top:80px; right:18px; z-index:9600;
      background:rgba(20,28,40,0.95); border:1px solid #48BB78;
      border-radius:8px; padding:12px 18px; min-width:240px; max-width:340px;
      color:#F0F0F0; font-family:'Noto Sans KR',sans-serif;
      box-shadow:0 8px 28px rgba(0,0,0,0.5);
      transform:translateX(380px); opacity:0; transition:transform .4s ease, opacity .4s ease;
    `;
    div.innerHTML = `
      <div style="display:flex;gap:12px;align-items:center">
        <div style="font-size:28px">${a.emoji}</div>
        <div>
          <div style="font-size:11px;color:#48BB78;letter-spacing:1px">🏆 업적 달성</div>
          <div style="font-size:15px;font-weight:bold;margin-top:2px">${a.ko}</div>
          <div style="font-size:11px;color:#A0AEC0;margin-top:2px">${a.desc_ko}</div>
        </div>
      </div>
    `;
    document.body.appendChild(div);
    if (typeof sfx === 'function') sfx('achievement');
    requestAnimationFrame(() => { div.style.transform = 'translateX(0)'; div.style.opacity = '1'; });

    setTimeout(() => {
      div.style.transform = 'translateX(380px)';
      div.style.opacity = '0';
      setTimeout(() => { if (div.parentNode) div.parentNode.removeChild(div); _showNext(); }, 450);
    }, 3500);
  }

  // 시나리오 완주 시 조건 평가 (accident.js / engine.js 에서 호출)
  function evaluateOnComplete(scenarioId, ctx) {
    const map = { excavation:'safe_excavation', foundation:'safe_foundation', lifting:'safe_lifting',
                  envelope:'safe_envelope', mep_finish:'safe_mep' };
    if (ctx.allDone && !ctx.accident && map[scenarioId]) unlock(map[scenarioId]);
    if (ctx.allDone && (ctx.fines || 0) === 0) unlock('no_fines_run');
    if (ctx.grade && ctx.grade.label && ctx.grade.label.indexOf('S') === 0) unlock('grade_s');
    if ((ctx.cumulativeFines || 0) >= 30_000_000) unlock('high_roller');
    // 5개 모두 완주 추적
    try {
      const raw = localStorage.getItem('bulsa_completed_scenarios') || '[]';
      const list = JSON.parse(raw);
      if (ctx.allDone && !list.includes(scenarioId)) list.push(scenarioId);
      localStorage.setItem('bulsa_completed_scenarios', JSON.stringify(list));
      if (list.length >= 5) unlock('full_circuit');
    } catch (e) {}
  }

  window.initAchievements    = initAchievements;
  window.unlockAchievement   = unlock;
  window.evalAchievementsOnComplete = evaluateOnComplete;
})();
