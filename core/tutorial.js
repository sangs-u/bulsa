// Tutorial — 첫 진입 시 1회 보이는 키 안내. localStorage 플래그로 재방문 시 생략.

(function () {
  'use strict';
  if (typeof window === 'undefined') return;

  function showTutorialIfFirst() {
    let seen = false;
    try { seen = localStorage.getItem('bulsa_tutorial_seen') === '1'; } catch (e) {}
    if (seen) return;
    // 게임 종료/사고/완료 패널 떠있으면 표시 안 함
    if (typeof GAME !== 'undefined' && GAME.state && GAME.state.gameOver) return;
    if (document.querySelector('#complete-panel:not(.hidden), #accident-panel:not(.hidden)')) return;

    const lang = (typeof getLang === 'function') ? getLang() : 'ko';
    const isKo = lang === 'ko';

    let el = document.getElementById('tutorial-overlay');
    if (!el) {
      el = document.createElement('div');
      el.id = 'tutorial-overlay';
      el.style.cssText = `
        position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
        background:rgba(15,20,30,0.92); color:#F0F0F0;
        border:1px solid #4A5568; border-radius:8px;
        padding:24px 30px; min-width:420px; max-width:520px;
        font-family:'Noto Sans KR',sans-serif; z-index:9500;
        box-shadow:0 14px 36px rgba(0,0,0,0.55);
      `;
      document.body.appendChild(el);
    }
    el.innerHTML = `
      <div style="font-size:18px;font-weight:bold;margin-bottom:14px;color:#48BB78">
        ${isKo ? '🦺 BULSA — 안전 시뮬레이터 안내' : '🦺 BULSA — Safety Simulator Guide'}
      </div>
      <div style="font-size:13px;line-height:1.85;margin-bottom:18px">
        ${isKo ? `
        <b>이동:</b> WASD / 화살표 · <b>달리기:</b> Shift · <b>웅크리기:</b> Ctrl · <b>점프:</b> Space<br>
        <b>상호작용:</b> E · <b>1인칭/3인칭:</b> V · <b>고정카메라:</b> C<br>
        <b>픽업/내려놓기:</b> Q · <b>던지기:</b> F · <b>날씨 토글:</b> B<br>
        <b>도구함:</b> 1·2·3·4 · <b>도면:</b> M · <b>일시정지:</b> P/ESC · <b>FPS:</b> F3<br><br>
        <b>목표:</b> 산업안전보건법에 따라 위반 없이 작업 완료.<br>
        <b>안전관리자</b>가 무작위 출현해 위반 사항을 적발 → 과태료 부과.<br>
        <b>안전지수</b>가 0 되거나 사고 발생 시 게임 종료.
        ` : `
        <b>Move:</b> WASD / Arrows · <b>Run:</b> Shift · <b>Jump:</b> Space<br>
        <b>Interact:</b> E · <b>FPS/TPS:</b> V · <b>Fixed Cam:</b> C<br>
        <b>Tools:</b> 1·2·3·4 · <b>Blueprint:</b> M<br><br>
        <b>Goal:</b> Complete work without violations under OSH law.<br>
        <b>Inspector</b> appears randomly → fines for violations.<br>
        Game ends on accident or safety index = 0.
        `}
      </div>
      <button id="tutorial-close-btn" style="background:#48BB78;color:#fff;border:0;padding:9px 26px;
        border-radius:4px;cursor:pointer;font-size:14px;font-weight:bold">
        ${isKo ? '시작' : 'Start'}
      </button>
    `;
    document.getElementById('tutorial-close-btn').onclick = () => {
      try { localStorage.setItem('bulsa_tutorial_seen', '1'); } catch (e) {}
      el.remove();
      // 포인터락 자동 복원 (게임 흐름 끊김 없음)
      const c = GAME.renderer && GAME.renderer.domElement;
      if (c && window.matchMedia && window.matchMedia('(pointer: fine)').matches) c.requestPointerLock();
    };
  }

  function resetTutorial() {
    try { localStorage.removeItem('bulsa_tutorial_seen'); } catch (e) {}
  }

  window.showTutorialIfFirst = showTutorialIfFirst;
  window.resetTutorial = resetTutorial;
})();
