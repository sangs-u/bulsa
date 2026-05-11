// 랜덤 이벤트 — GTA 스타일 무작위 사건. 80~150초 간격.
// 예: 다른 작업자 호출, 자재 배달 차량, 점검자 방문 (Inspector 와 별개).

(function () {
  'use strict';
  if (typeof window === 'undefined') return;

  const EVENTS = {
    enabled: true,
    nextAt: 70 + Math.random() * 90,
    elapsed: 0,
    initialized: false,
  };

  const TEMPLATES = [
    { id:'lunch_call',    msg:'🍱 점심시간이 다가옵니다 — 10분 전' },
    { id:'wind_warn',     msg:'💨 풍속 12m/s 초과 — 고소작업 중단 권고' },
    { id:'delivery',      msg:'🚛 자재 배달 트럭 도착' },
    { id:'visit',         msg:'👷 본사 방문단 5분 후 도착' },
    { id:'temp_drop',     msg:'❄ 기온 급강하 — 콘크리트 양생 주의' },
    { id:'siren_drill',   msg:'🚨 비상소집 훈련 — 모든 작업 일시 중단' },
    { id:'wage_day',      msg:'💵 임금일 — 사기 +5%' },
    { id:'tools_check',   msg:'🔧 일일 공구 점검 시간' },
  ];

  function init() {
    if (EVENTS.initialized) return;
    EVENTS.initialized = true;
  }

  function update(delta) {
    if (!EVENTS.enabled) return;
    if (!GAME.state.gameStarted || GAME.state.gameOver || GAME.state.paused) return;
    if (GAME.state.liftStarted) return;

    EVENTS.elapsed += delta;
    if (EVENTS.elapsed < EVENTS.nextAt) return;

    EVENTS.elapsed = 0;
    EVENTS.nextAt = 90 + Math.random() * 120;
    const t = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];
    if (typeof showActionNotif === 'function') showActionNotif(t.msg, 3200);
    if (typeof sfx === 'function') sfx('inspector');     // 알림용 짧은 소리
  }

  window.initEvents   = init;
  window.updateEvents = update;
})();
