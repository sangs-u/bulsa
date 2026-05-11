// SEO + OpenGraph 메타 — 동적 주입 (시나리오별 페이지 제목 + 공유 미리보기).

(function () {
  'use strict';
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  function _meta(name, content, prop) {
    let el = document.querySelector(`meta[${prop ? 'property' : 'name'}="${name}"]`);
    if (!el) {
      el = document.createElement('meta');
      if (prop) el.setAttribute('property', name);
      else el.setAttribute('name', name);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  }

  function init() {
    const sid = (typeof GAME !== 'undefined' && GAME.scenarioId) ? GAME.scenarioId : 'lifting';
    const titles = {
      excavation:  '토공사 — BULSA 건설안전 시뮬레이터',
      foundation:  '기초공사 — BULSA 건설안전 시뮬레이터',
      lifting:     '골조 양중 — BULSA 건설안전 시뮬레이터',
      envelope:    '외장공사 — BULSA 건설안전 시뮬레이터',
      mep_finish:  '설비·마감 — BULSA 건설안전 시뮬레이터',
    };
    const t = titles[sid] || 'BULSA — 건설안전 시뮬레이터';
    document.title = t;

    const desc = '한국 산업안전보건법 기반 5층 건물 건설안전 시뮬레이터. 5개 공정에서 실수 없이 작업을 완료하세요.';
    _meta('description', desc);
    _meta('theme-color', '#1A2332');

    // OpenGraph
    _meta('og:title',       t, true);
    _meta('og:description', desc, true);
    _meta('og:type',        'website', true);
    _meta('og:url',         location.href, true);
    _meta('og:site_name',   'BULSA 안전 시뮬레이터', true);

    // Twitter Card
    _meta('twitter:card',  'summary_large_image');
    _meta('twitter:title', t);
    _meta('twitter:description', desc);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
