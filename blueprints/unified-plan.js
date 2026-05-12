// Blueprint data — 통합 모드 부지 도면
// 5 시나리오 영역 + 실시간 NPC + 활성 작업 + 간섭 라인을 탑뷰로 표시.

const BLUEPRINT_UNIFIED = {
  meta: {
    id:    'unified-site',
    rev:   'R01',
    date:  '2026-05-12',
    kosha: 'KOSHA GUIDE C-31-2023 부지 배치',
  },

  // 영역 정의 — engine.js GAME.unifiedZones 와 동기화 필요.
  // lifting 은 baseline(0,0) — 중앙. 나머지 4 영역은 zone offset.
  zones: [
    { id: 'lifting',    ox:   0, oz:  0,  half: 18, label: '양중·신호', color: '#D4A217', icon: '🏗' },
    { id: 'excavation', ox: -22, oz:-10,  half: 16, label: '토공사',   color: '#8B5A2B', icon: '⛏'  },
    { id: 'foundation', ox: -18, oz: 10,  half: 16, label: '기초공사', color: '#6B6B6B', icon: '🧱' },
    { id: 'envelope',   ox:  22, oz:-10,  half: 16, label: '외장·비계', color: '#2B6CB0', icon: '🪜' },
    { id: 'mep_finish', ox:  22, oz: 10,  half: 16, label: '설비·마감', color: '#38A169', icon: '🔧' },
  ],

  // 부지 외곽 (월드 좌표) — 모든 영역 + 여유 포함
  bounds: { x0: -45, x1: 45, z0: -32, z1: 32 },
};

if (typeof window !== 'undefined') window.BLUEPRINT_UNIFIED = BLUEPRINT_UNIFIED;
