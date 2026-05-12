// 사고 ID → 짧은 4언어 라벨 — 통계 패널·HUD 알림에서 raw ID 노출 회피
//
// 사고 ID 는 시나리오 data.js · GLOBAL_ACCIDENTS · INTERFERENCE_MATRIX 가 공통 참조.
// 이 모듈은 그 ID 를 사용자 노출용 짧은 라벨로 변환.

(function () {
  const LABELS = {
    sling_snap:        { ko: '슬링 단선',         en: 'Sling snap',           vi: 'Đứt dây cẩu',         ar: 'انقطاع الحبل' },
    angle_break:       { ko: '슬링 각도 파손',    en: 'Sling angle break',    vi: 'Hỏng góc dây',        ar: 'انكسار زاوية الحبل' },
    pin_drop:          { ko: '안전핀 이탈 낙하',  en: 'Pin drop',             vi: 'Rơi do chốt',         ar: 'سقوط بسبب المسمار' },
    worker_crush:      { ko: '작업자 깔림',       en: 'Worker crushed',       vi: 'Công nhân bị đè',     ar: 'سحق العامل' },
    no_signal:         { ko: '신호수 없음',       en: 'No signaler',          vi: 'Không người ra hiệu', ar: 'بلا مُوجِّه' },
    overload:          { ko: '과적',              en: 'Overload',             vi: 'Quá tải',             ar: 'حمل زائد' },
    worker_fall:       { ko: '추락',              en: 'Worker fall',          vi: 'Ngã cao',             ar: 'سقوط من ارتفاع' },
    falling_debris:    { ko: '낙하물',            en: 'Falling debris',       vi: 'Vật rơi',             ar: 'حطام ساقط' },
    electric_shock:    { ko: '감전',              en: 'Electric shock',       vi: 'Điện giật',           ar: 'صعق كهربائي' },
    fire_explosion:    { ko: '화재·폭발',         en: 'Fire/Explosion',       vi: 'Cháy/Nổ',             ar: 'حريق/انفجار' },
    panel_drop:        { ko: '외장재 낙하',       en: 'Panel drop',           vi: 'Tấm vỏ rơi',          ar: 'سقوط لوح الواجهة' },
    swing_drop:        { ko: '인양물 스윙 낙하',  en: 'Load swing/drop',      vi: 'Vật đu đưa/rơi',      ar: 'تأرجح/سقوط الحمل' },
    premature_load:    { ko: '양생 미완 적재',    en: 'Premature load',       vi: 'Chất tải sớm',        ar: 'تحميل مبكر' },
    form_collapse:     { ko: '거푸집 붕괴',       en: 'Formwork collapse',    vi: 'Sập ván khuôn',       ar: 'انهيار القوالب' },
    excavator_crush:   { ko: '굴착기 충돌',       en: 'Excavator crush',      vi: 'Máy xúc đè',          ar: 'سحق الحفّار' },
    soil_collapse:     { ko: '토사 붕괴',         en: 'Soil collapse',        vi: 'Sập đất',             ar: 'انهيار التربة' },
    rebar_stab:        { ko: '철근 자상',         en: 'Rebar stab',           vi: 'Đâm cốt thép',        ar: 'وخز الحديد' },
    toxic_exposure:    { ko: '유해가스 노출',     en: 'Toxic exposure',       vi: 'Phơi nhiễm độc',      ar: 'تعرض سام' },
    underground_strike:{ ko: '매설물 손상',       en: 'Underground strike',   vi: 'Trúng vật ngầm',      ar: 'إصابة المرافق' },
    scaffold_collapse: { ko: '비계 붕괴',         en: 'Scaffold collapse',    vi: 'Sập giàn giáo',       ar: 'انهيار السقالة' },
  };

  function accidentLabel(id, lang) {
    const e = LABELS[id];
    if (!e) return id;
    return e[lang || (typeof currentLang !== 'undefined' ? currentLang : 'ko')] || e.ko || id;
  }

  window.ACCIDENT_LABELS = LABELS;
  window.accidentLabel   = accidentLabel;
})();
