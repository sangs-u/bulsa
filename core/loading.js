// Loading screen — 페이지 로드 → 자산 준비 → fade out.
// 사용자가 처음 진입할 때 검은 화면 대신 안전 시뮬 정체성 표시.

(function () {
  'use strict';
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  function _build() {
    if (document.getElementById('loading-screen')) return;
    const el = document.createElement('div');
    el.id = 'loading-screen';
    el.style.cssText = `
      position:fixed; inset:0; z-index:9999;
      background:linear-gradient(135deg,#0F1419 0%,#1A2332 100%);
      color:#F0F0F0; display:flex; flex-direction:column; align-items:center; justify-content:center;
      font-family:'Noto Sans KR',sans-serif;
      transition:opacity .8s ease;
    `;
    el.innerHTML = `
      <div style="font-size:42px;font-weight:bold;letter-spacing:8px;color:#F0F0F0;margin-bottom:6px">
        BULSA
      </div>
      <div style="font-size:13px;color:#A0AEC0;letter-spacing:3px;margin-bottom:38px">
        SAFETY · SIMULATOR
      </div>
      <div style="display:flex;gap:18px;align-items:center">
        <div style="font-size:46px">🦺</div>
        <div style="height:46px;display:flex;flex-direction:column;justify-content:center">
          <div style="width:280px;height:4px;background:#2A3344;border-radius:2px;overflow:hidden">
            <div id="loading-bar" style="height:100%;width:0;background:linear-gradient(90deg,#48BB78,#4DB8E0);
                 transition:width .25s ease"></div>
          </div>
          <div id="loading-status" style="font-size:11px;color:#94A3B8;margin-top:6px">
            초기화 중...
          </div>
        </div>
      </div>
      <div style="position:absolute;bottom:24px;font-size:11px;color:#5A6478">
        한국 산업안전보건법 기반 건설 안전 시뮬레이터
      </div>
    `;
    document.body.appendChild(el);
  }

  function setProgress(pct, status) {
    const bar = document.getElementById('loading-bar');
    const st  = document.getElementById('loading-status');
    if (bar) bar.style.width = Math.min(100, Math.max(0, pct)) + '%';
    if (st && status) st.textContent = status;
  }

  function hide() {
    const el = document.getElementById('loading-screen');
    if (!el) return;
    el.style.opacity = '0';
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 800);
  }

  // 초기화 단계 시뮬레이트 — 실제 로딩 이벤트가 없으니 가상 단계 진행
  function _autoProgress() {
    let p = 0;
    const tick = () => {
      p = Math.min(100, p + 8 + Math.random() * 12);
      const L = (typeof currentLang !== 'undefined') ? currentLang : 'ko';
      const msgsByLang = {
        ko: ['초기화 중...', 'Three.js 로드...', '물리엔진 준비...', 'NPC 로드...', '시나리오 빌드...', '준비 완료'],
        en: ['Initializing...', 'Loading Three.js...', 'Preparing physics...', 'Loading NPCs...', 'Building scenario...', 'Ready'],
        vi: ['Khởi tạo...', 'Tải Three.js...', 'Chuẩn bị vật lý...', 'Tải NPC...', 'Dựng kịch bản...', 'Sẵn sàng'],
        ar: ['التهيئة...', 'تحميل Three.js...', 'تحضير الفيزياء...', 'تحميل الشخصيات...', 'بناء السيناريو...', 'جاهز'],
      };
      const msgs = msgsByLang[L] || msgsByLang.ko;
      setProgress(p, msgs[Math.min(msgs.length - 1, Math.floor(p / 22))]);
      if (p < 100) setTimeout(tick, 200);
      else setTimeout(hide, 350);
    };
    setTimeout(tick, 100);
  }

  // ASAP build — 스크립트 평가 시점에 즉시 표시
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { _build(); _autoProgress(); });
  } else {
    _build(); _autoProgress();
  }

  window.LOADING = { setProgress, hide };
})();
