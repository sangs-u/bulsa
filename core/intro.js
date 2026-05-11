// Scenario intro — 시작 시 3초 카메라 스윕 + 시나리오 타이틀 오버레이.
// 스킵 가능 (E/Space/클릭).

(function () {
  'use strict';
  if (typeof window === 'undefined') return;

  const INTRO = {
    active: false,
    skipped: false,
  };
  window.INTRO = INTRO;

  function playIntro() {
    // 이미 한 번 본 시나리오면 스킵
    const sid = GAME.scenarioId;
    let seen = {};
    try { seen = JSON.parse(localStorage.getItem('bulsa_intro_seen') || '{}'); } catch (e) {}
    if (seen[sid]) return;

    INTRO.active = true;

    // 시나리오별 타이틀
    const titles = {
      excavation:  { ko: '토공사',      sub: '굴착·흙막이·매설물', icon: '⛏' },
      foundation:  { ko: '기초공사',    sub: '거푸집·철근·콘크리트', icon: '🧱' },
      lifting:     { ko: '골조 양중',   sub: '인양·신호수·작업반경', icon: '🏗' },
      envelope:    { ko: '외장공사',    sub: '비계·외장·창호',     icon: '🪟' },
      mep_finish:  { ko: '설비·마감',   sub: 'LOTO·가스·환기',     icon: '⚡' },
    };
    const t = titles[sid] || { ko: 'BULSA', sub: '안전 시뮬레이터', icon: '🦺' };

    // 오버레이
    const ov = document.createElement('div');
    ov.id = 'intro-overlay';
    ov.style.cssText = `
      position:fixed; inset:0; pointer-events:none; z-index:9400;
      background:linear-gradient(180deg,rgba(8,12,18,0.0) 0%,rgba(8,12,18,0.55) 50%,rgba(8,12,18,0.0) 100%);
      display:flex; flex-direction:column; align-items:center; justify-content:center;
      color:#F0F0F0; font-family:'Noto Sans KR',sans-serif;
      opacity:0; transition:opacity .7s ease;
    `;
    ov.innerHTML = `
      <div style="font-size:80px;margin-bottom:14px;text-shadow:0 4px 16px rgba(0,0,0,0.6)">${t.icon}</div>
      <div style="font-size:46px;font-weight:bold;letter-spacing:6px;text-shadow:0 4px 16px rgba(0,0,0,0.6)">${t.ko}</div>
      <div style="font-size:14px;color:#A0AEC0;letter-spacing:3px;margin-top:8px">${t.sub}</div>
      <div style="position:absolute;bottom:60px;font-size:11px;color:#5A6478;letter-spacing:2px">아무 키 또는 클릭으로 건너뛰기</div>
    `;
    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.style.opacity = '1');

    // 카메라 스윕 — 현재 카메라 위치를 보관하고 짧은 원호 이동
    const cam = GAME.camera;
    const origPos = cam.position.clone();
    const origQuat = cam.quaternion.clone();
    const startY = origPos.y + 4;
    const startTime = performance.now();
    const DURATION = 3000;

    function onSkip() {
      INTRO.skipped = true;
    }
    document.addEventListener('keydown', onSkip, { once: true });
    document.addEventListener('click', onSkip, { once: true });

    function frame() {
      const t2 = (performance.now() - startTime) / DURATION;
      if (INTRO.skipped || t2 >= 1) {
        cam.position.copy(origPos);
        cam.quaternion.copy(origQuat);
        ov.style.opacity = '0';
        setTimeout(() => { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 800);
        INTRO.active = false;
        try { seen[sid] = 1; localStorage.setItem('bulsa_intro_seen', JSON.stringify(seen)); } catch (e) {}
        return;
      }
      // 카메라가 위·뒤로 살짝 떠올라 점진적으로 원위치
      const k = Math.sin(t2 * Math.PI);          // 0→1→0
      cam.position.set(
        origPos.x,
        startY * (1 - k * 0.3),                  // 살짝 위
        origPos.z + 6 * (1 - t2)                 // 시작 시 뒤로 6m, 점점 원위치
      );
      cam.lookAt(origPos.x, origPos.y, origPos.z - 4);
      requestAnimationFrame(frame);
    }
    frame();
  }

  window.playScenarioIntro = playIntro;
})();
