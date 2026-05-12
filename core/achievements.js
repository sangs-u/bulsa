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

  // 업적 정의 — id, 4언어 이름/설명, 조건
  const ACHIEVEMENTS = [
    { id: 'first_start',     ko:'첫 출근',         en:'First Day',        vi:'Ngày đầu',          ar:'اليوم الأول',       desc_ko:'게임 첫 실행',                 desc_en:'First game launch',                desc_vi:'Khởi chạy game lần đầu',          desc_ar:'أول تشغيل للعبة',                emoji:'🦺' },
    { id: 'safe_excavation', ko:'안전 굴착',       en:'Safe Dig',         vi:'Đào An Toàn',       ar:'حفر آمن',          desc_ko:'토공 무위반·무사고 완주',         desc_en:'Earthworks zero-violation run',     desc_vi:'Hoàn tất san nền không vi phạm',  desc_ar:'إنهاء الحفر بدون مخالفات',         emoji:'⛏' },
    { id: 'safe_foundation', ko:'튼튼한 기초',     en:'Solid Base',       vi:'Móng Vững',         ar:'أساس متين',        desc_ko:'기초공사 무위반·무사고 완주',      desc_en:'Foundation flawless run',           desc_vi:'Hoàn tất móng không tai nạn',     desc_ar:'إنهاء الأساس بدون حوادث',         emoji:'🧱' },
    { id: 'safe_lifting',    ko:'완벽한 양중',     en:'Perfect Lift',     vi:'Cẩu Hoàn Hảo',      ar:'رفع مثالي',        desc_ko:'양중 5층 무사고 완주',            desc_en:'5F lifting accident-free',          desc_vi:'Cẩu 5 tầng không tai nạn',        desc_ar:'رفع 5 طوابق بدون حوادث',          emoji:'🏗' },
    { id: 'safe_envelope',   ko:'깔끔한 외장',     en:'Clean Skin',       vi:'Vỏ Sạch',           ar:'واجهة نظيفة',      desc_ko:'외장공사 무위반·무사고 완주',      desc_en:'Envelope flawless run',             desc_vi:'Hoàn tất vỏ ngoài không vi phạm', desc_ar:'إنهاء الواجهة بلا مخالفات',        emoji:'🪟' },
    { id: 'safe_mep',        ko:'안전한 설비',     en:'Live Free',        vi:'M&E An Toàn',       ar:'تركيب آمن',        desc_ko:'설비 무위반·무사고 완주',         desc_en:'MEP flawless run',                  desc_vi:'Hoàn tất M&E không vi phạm',     desc_ar:'إنهاء التركيب بلا مخالفات',        emoji:'⚡' },
    { id: 'no_fines_run',    ko:'깨끗한 작업장',   en:'No Penalties',     vi:'Không Phạt',        ar:'بلا غرامات',       desc_ko:'한 시나리오 과태료 0원 완주',     desc_en:'Scenario completed with zero fines',desc_vi:'Hoàn thành không phạt',           desc_ar:'إنهاء بلا غرامة',                  emoji:'✨' },
    { id: 'grade_s',         ko:'S 등급',         en:'S Grade',           vi:'Hạng S',            ar:'الدرجة S',         desc_ko:'종합 등급 S 달성',                desc_en:'Earn overall S grade',              desc_vi:'Đạt hạng S tổng',                 desc_ar:'الحصول على الدرجة S',              emoji:'🥇' },
    { id: 'full_circuit',    ko:'5층 건물 완공',   en:'Whole Build',      vi:'Hoàn Công 5 Tầng',  ar:'إكمال المبنى',     desc_ko:'5개 시나리오 모두 완주',          desc_en:'Clear all 5 scenarios',             desc_vi:'Hoàn thành 5 kịch bản',           desc_ar:'إكمال 5 سيناريوهات',               emoji:'🏢' },
    { id: 'survivor',        ko:'생존자',          en:'Survivor',         vi:'Người Sống Sót',    ar:'الناجي',           desc_ko:'추락 경상 후 회복하여 완주',       desc_en:'Recover from fall and finish',      desc_vi:'Hồi phục sau ngã và hoàn tất',    desc_ar:'التعافي وإنهاء العمل',             emoji:'🩹' },
    { id: 'inspector_pass',  ko:'점검 통과',       en:'Pass Inspection',  vi:'Qua Kiểm Tra',      ar:'اجتياز التفتيش',   desc_ko:'안전관리자 점검 위반 0건 통과',  desc_en:'Pass safety inspector with 0 violations', desc_vi:'Qua kiểm tra không vi phạm',   desc_ar:'اجتياز التفتيش بلا مخالفات',      emoji:'✅' },
    { id: 'high_roller',     ko:'돈낭비',          en:'High Roller',      vi:'Tiêu Pha',          ar:'مسرف',             desc_ko:'누적 과태료 ₩30,000,000 돌파',    desc_en:'Accumulate ₩30M in fines',          desc_vi:'Tổng phạt vượt 30 triệu',         desc_ar:'تجاوز الغرامات 30 مليون',          emoji:'💸' },
    // v2.0 통합 모드 업적
    { id: 'unified_enter',   ko:'자유 모드 입장',  en:'Free Mode',        vi:'Vào Tự do',         ar:'وضع حر',           desc_ko:'통합 부지 첫 진입',               desc_en:'First entry to unified site',       desc_vi:'Lần đầu vào khu thống nhất',      desc_ar:'أول دخول للموقع الموحد',           emoji:'🏗' },
    { id: 'unified_5min',    ko:'자유 5분 무사고', en:'Free 5min Safe',   vi:'Tự do 5p',          ar:'حر 5 دقائق',       desc_ko:'통합 부지에서 5분 사고없이 진행', desc_en:'5 min in unified site with no accident', desc_vi:'5 phút trong khu không tai nạn', desc_ar:'5 دقائق بلا حادث',                 emoji:'⏱' },
    { id: 'unified_zero_int',ko:'간섭 0',          en:'Zero Interference',vi:'Không Xung Đột',    ar:'بلا تداخل',        desc_ko:'10분 진행 동안 간섭 0회',         desc_en:'10 min with zero interference',     desc_vi:'10 phút không xung đột',          desc_ar:'10 دقائق بلا تداخل',               emoji:'🛡' },
    // v3 페이즈별 통과 업적 (튜토리얼 진행 마일스톤)
    { id: 'phase_excavation', ko:'굴착 통과',       en:'Excavation Done',  vi:'Hoàn tất Đào',      ar:'اكتمال الحفر',     desc_ko:'페이즈 1 굴착·흙막이 통과',      desc_en:'Cleared phase 1 excavation',         desc_vi:'Vượt phase 1 đào',               desc_ar:'اجتياز المرحلة 1 الحفر',           emoji:'⛏' },
    { id: 'phase_foundation', ko:'기초 통과',       en:'Foundation Done',  vi:'Hoàn tất Móng',     ar:'اكتمال الأساس',    desc_ko:'페이즈 2 기초공사 통과',         desc_en:'Cleared phase 2 foundation',         desc_vi:'Vượt phase 2 móng',              desc_ar:'اجتياز المرحلة 2 الأساس',          emoji:'🧱' },
    { id: 'phase_lifting',    ko:'골조 통과',       en:'Frame Done',       vi:'Hoàn tất Khung',    ar:'اكتمال الهيكل',    desc_ko:'페이즈 3 골조 양중 통과',        desc_en:'Cleared phase 3 RC frame',           desc_vi:'Vượt phase 3 khung',             desc_ar:'اجتياز المرحلة 3 الهيكل',          emoji:'🏗' },
    { id: 'phase_envelope',   ko:'외장 통과',       en:'Envelope Done',    vi:'Hoàn tất Vỏ',       ar:'اكتمال الواجهة',   desc_ko:'페이즈 4 외장공사 통과',         desc_en:'Cleared phase 4 envelope',           desc_vi:'Vượt phase 4 vỏ ngoài',          desc_ar:'اجتياز المرحلة 4 الواجهة',         emoji:'🪟' },
    { id: 'phase_mep',        ko:'마감 통과',       en:'MEP Done',         vi:'Hoàn tất M&E',      ar:'اكتمال التركيب',   desc_ko:'페이즈 5 설비·마감 통과',        desc_en:'Cleared phase 5 MEP & finishing',    desc_vi:'Vượt phase 5 M&E',               desc_ar:'اجتياز المرحلة 5 التركيب',         emoji:'⚡' },
    { id: 'tutorial_complete',ko:'튜토리얼 완주',   en:'Tutorial Cleared', vi:'Hoàn thành Hướng dẫn', ar:'اكتمل التعليم', desc_ko:'5 페이즈 모두 완료 — 작업반장 입문', desc_en:'All 5 phases cleared — Foreman ready', desc_vi:'5 phase hoàn tất — Trưởng nhóm sẵn sàng', desc_ar:'اكتمال 5 مراحل — رئيس عمال جاهز', emoji:'🎓' },
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
    const L = (typeof currentLang !== 'undefined') ? currentLang : 'ko';
    const title = a[L] || a.ko;
    const desc  = a['desc_' + L] || a.desc_ko;
    const banner = { ko: '🏆 업적 달성', en: '🏆 Achievement Unlocked', vi: '🏆 Mở Khóa Thành Tích', ar: '🏆 إنجاز مفتوح' }[L] || '🏆 업적 달성';
    div.innerHTML = `
      <div style="display:flex;gap:12px;align-items:center">
        <div style="font-size:28px">${a.emoji}</div>
        <div>
          <div style="font-size:11px;color:#48BB78;letter-spacing:1px">${banner}</div>
          <div style="font-size:15px;font-weight:bold;margin-top:2px">${title}</div>
          <div style="font-size:11px;color:#A0AEC0;margin-top:2px">${desc}</div>
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
