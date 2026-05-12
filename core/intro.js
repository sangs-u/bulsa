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

    // 시나리오별 타이틀 (4언어)
    const titlesAll = {
      excavation:  { icon: '⛏', ko:'토공사',    en:'Earthworks',  vi:'San nền',    ar:'الحفر',          sub_ko:'굴착·흙막이·매설물',   sub_en:'Excavation·Shoring·Survey',     sub_vi:'Đào·Chống vách·Khảo sát',     sub_ar:'الحفر·الدعم·المسح' },
      foundation:  { icon: '🧱', ko:'기초공사',  en:'Foundation',  vi:'Móng',       ar:'الأساسات',       sub_ko:'거푸집·철근·콘크리트', sub_en:'Formwork·Rebar·Concrete',       sub_vi:'Ván khuôn·Thép·BT',          sub_ar:'القوالب·الحديد·الخرسانة' },
      lifting:     { icon: '🏗', ko:'골조 양중', en:'RC Lifting',  vi:'Cẩu',        ar:'الرفع',          sub_ko:'인양·신호수·작업반경', sub_en:'Lift·Signal·Radius',            sub_vi:'Cẩu·Hiệu lệnh·Bán kính',     sub_ar:'الرفع·الإشارة·النطاق' },
      envelope:    { icon: '🪟', ko:'외장공사',  en:'Envelope',    vi:'Vỏ ngoài',   ar:'الواجهة',        sub_ko:'비계·외장·창호',       sub_en:'Scaffold·Cladding·Glass',       sub_vi:'Giàn giáo·Tấm·Kính',         sub_ar:'سقالة·ألواح·زجاج' },
      mep_finish:  { icon: '⚡', ko:'설비·마감', en:'MEP & Finish',vi:'M&E·Hoàn thiện', ar:'التركيب والتشطيب', sub_ko:'LOTO·가스·환기',     sub_en:'LOTO·Gas·Ventilation',          sub_vi:'LOTO·Gas·Thông gió',         sub_ar:'LOTO·غاز·تهوية' },
    };
    const L  = (typeof currentLang !== 'undefined') ? currentLang : 'ko';
    const tD = titlesAll[sid];
    const t  = tD
      ? { icon: tD.icon, ko: tD[L] || tD.ko, sub: tD['sub_' + L] || tD.sub_ko }
      : { ko: 'BULSA', sub: { ko:'안전 시뮬레이터', en:'Safety Simulator', vi:'Mô phỏng', ar:'محاكي' }[L] || '안전 시뮬레이터', icon: '🦺' };

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
      <div style="position:absolute;bottom:60px;font-size:11px;color:#5A6478;letter-spacing:2px">${ { ko:'아무 키 또는 클릭으로 건너뛰기', en:'Press any key or click to skip', vi:'Nhấn phím bất kỳ để bỏ qua', ar:'اضغط أي مفتاح للتخطي' }[L] || '아무 키 또는 클릭으로 건너뛰기' }</div>
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
