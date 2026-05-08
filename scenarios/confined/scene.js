// S03 — 밀폐공간 Scene | TODO: implement
// Reference: KOSHA GUIDE E-G-18-2026, musaai/confined.html
//
// Scene elements:
//   - 지하 저수조 (맨홀 진입구 visible from above)
//   - 환기 덕트 (비치/미비치 상태)
//   - 가스 측정기 (바닥에 놓인 상태)
//   - 외부 감시인 NPC 위치 (맨홀 옆)
//   - 공기호흡기 보관함 (진입 전 확인)
//   - 가스 농도 HUD 표시 (O₂/H₂S/CO 수치)
//
// Hazard positions:
//   no_gas_test     : 가스측정기 (x=-1, y=0, z=3)
//   no_attendant    : 빈 감시인 위치 표시 (x=2, y=0, z=2)
//   no_ventilation  : 환기 덕트 미연결 (x=0, y=0, z=0 맨홀 옆)
//   no_permit       : 작업허가서 게시판 (x=4, y=1.5, z=4)
//   no_rescue_gear  : 공기호흡기 보관함 잠금 (x=-3, y=0, z=3)
//   low_oxygen      : 맨홀 내부 가스 상태 표시 (맨홀 진입 시)

function buildConfinedScene() {
  // TODO: implement
  console.warn('[S03 confined] scene not yet implemented');
}
