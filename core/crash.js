// Crash reporter — window.onerror / unhandledrejection 잡아서 localStorage 보관.
// 디스플레이 충돌 시 사용자에게 알림 + 콘솔 로그.

(function () {
  'use strict';
  if (typeof window === 'undefined') return;

  function _push(record) {
    try {
      const raw = localStorage.getItem('bulsa_crashes') || '[]';
      const arr = JSON.parse(raw);
      arr.push(record);
      if (arr.length > 20) arr.shift();
      localStorage.setItem('bulsa_crashes', JSON.stringify(arr));
    } catch (e) {}
  }

  function _notify(msg) {
    try {
      const el = document.createElement('div');
      el.style.cssText = `
        position:fixed; bottom:80px; left:50%; transform:translateX(-50%);
        background:rgba(120,30,30,0.94); color:#FED7D7;
        padding:8px 16px; border-radius:6px; font-size:12px;
        font-family:'Noto Sans KR',sans-serif; z-index:9800;
        max-width:520px; box-shadow:0 6px 24px rgba(0,0,0,0.5);
      `;
      el.textContent = '⚠ 오류 발생: ' + msg.slice(0, 140);
      document.body.appendChild(el);
      setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 5000);
    } catch (e) {}
  }

  window.addEventListener('error', e => {
    const msg = (e.message || 'unknown') + ' @ ' + (e.filename || '') + ':' + (e.lineno || 0);
    _push({ kind: 'error', msg, at: new Date().toISOString(), ua: navigator.userAgent });
    _notify(msg);
  });

  window.addEventListener('unhandledrejection', e => {
    const msg = 'Promise: ' + (e.reason && e.reason.message ? e.reason.message : String(e.reason));
    _push({ kind: 'unhandled', msg, at: new Date().toISOString(), ua: navigator.userAgent });
    _notify(msg);
  });

  window.getCrashLog = function () {
    try { return JSON.parse(localStorage.getItem('bulsa_crashes') || '[]'); }
    catch (e) { return []; }
  };
  window.clearCrashLog = function () {
    try { localStorage.removeItem('bulsa_crashes'); } catch (e) {}
  };
})();
