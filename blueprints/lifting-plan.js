// Blueprint data — S01 줄걸이·인양 작업 도면 정의
// 현장 배치, 크레인 제원, 슬링 도면 3탭

const BLUEPRINT_LIFTING = {
  meta: {
    id:       'lifting-s01',
    rev:      'R01',
    date:     '2026-05-10',
    author:   '안전반장',
    kosha:    'KOSHA GUIDE G-133-2020',
    scenario: 's01',
  },

  // ── 탭 1: 평면도 (Plan View) ─────────────────────────────────
  // 단위: m / 좌표계: 게임 월드 X·Z (Y 무시)
  plan: {
    scale: 1,  // 1 canvas px = scale m (뷰어에서 계산)

    // 건물 외곽 (건설 중 건물)
    building: { x: -5, z: -22, w: 10, d: 10 },

    // 타워크레인 마스트 위치
    crane: { x: 14, z: -9 },
    craneRadius: 18,   // 작업반경 m

    // RC 보 초기 위치
    beam: { x: 0, z: -8, len: 5.5, w: 0.5, angle: 0 },

    // 인양 착지 목표 (3층 슬래브)
    target: { x: 0, z: -17 },

    // 작업반경 위험선 (다른 색)
    dangerZoneR: 12,

    // 마커 포인트
    markers: [
      { x:  3, z: -6,  label: '신호수', color: '#E53E3E' },
      { x:  9, z: -3,  label: '사무실', color: '#3182CE' },
      { x: 14, z: -9,  label: '크레인', color: '#D69E2E' },
    ],
  },

  // ── 탭 2: 인양 입면도 (Elevation View) ──────────────────────
  elevation: {
    craneHeight:  28,   // m
    jibLength:    18,   // m
    hookHeight:   14,   // m (인양 중 최고 높이)
    beamWeight:    3.0, // ton
    liftTarget:   11.5, // m (3층 슬래브 높이)
    liftPathX:     0,   // 수평 이동 없음 (수직 인양)
    groundLevel:   0,
  },

  // ── 탭 3: 줄걸이 도면 (Rigging Diagram) ─────────────────────
  rigging: {
    slingCount: 2,
    alphaAngle: 58,     // 인양각도 α (도)
    beamWeight: 3.0,    // ton
    slingType:  'WRC 6×37',
    slingDia:   16,     // mm
    slingSwl:   3.0,    // ton (줄당)
    hookType:   '스위블 훅',
    shackleType:'ΩD형 샤클',

    // 계산값 (lifting-plan.js 자체 계산)
    get betaDeg()   { return this.alphaAngle / 2; },
    get K()         { return 1 / Math.cos(this.betaDeg * Math.PI / 180); },
    get Ts()        { return (this.beamWeight * this.K) / this.slingCount; },
    get usageRate() { return this.Ts / this.slingSwl; },
  },
};

// 전역 등록
if (typeof window !== 'undefined') window.BLUEPRINT_LIFTING = BLUEPRINT_LIFTING;
