// S04 — 전기작업 Scene | TODO: implement
// Reference: 산안규칙 제319~321조, musaai/elec-plan.html
//
// Scene elements:
//   - 수배전반 (MCC 패널) — 작업 대상
//   - 차단기(VCB/MCCB) 박스 (OPEN/CLOSE 상태 표시)
//   - 잠금장치 거치대 (LOTO station)
//   - 꼬리표 보드
//   - 검전기 (탁자에 놓인 상태)
//   - 접지봉 + 접지선
//   - 절연 PPE 보관함 (장갑·절연화·절연복)
//   - 접근한계거리 표시선 (3상 배선 주변)
//
// LOTO 9단계가 순서대로 강제되는 인터랙션:
//   각 단계 오브젝트에 순서 번호 표시
//   순서 이탈 시 경고 (예: 검전 전에 접지 시도 → NG)
//   모든 단계 완료 시 Phase 2로 진입

function buildElectricalScene() {
  // TODO: implement
  console.warn('[S04 electrical] scene not yet implemented');
}
