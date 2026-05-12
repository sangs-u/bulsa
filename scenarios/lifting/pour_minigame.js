// rc_frame sub-step 3: 타설·양생 (pour_cure)
// 3지점 — 펌프카 압력 점검 / 타설 순서 (분할 타설 zone) / 양생 시트 덮기 + 측압 모니터링

let POUR_RC_GAME = null;

const POUR_RC_STATE = {
  perFloor: {},
};

function startPourCure(floor) {
  if (typeof createInspectionMinigame !== 'function') return;
  floor = floor || (GAME.state.rcLoop && GAME.state.rcLoop.floor) || 1;

  const fy = (floor - 1) * 3.8;
  const cx = 0, cz = -17;

  // 4지점 — 펌프카 호스 / 타설 NW zone / 타설 SE zone / 양생시트 + 측압
  const spots = [
    { label: `${floor}F 펌프카 호스·압력 점검`, pos: [14, 0, -8] },
    { label: `${floor}F 타설 NW zone 진행`,    pos: [cx - 3.0, fy, cz - 3.0] },
    { label: `${floor}F 타설 SE zone 진행`,    pos: [cx + 3.0, fy, cz + 3.0] },
    { label: `${floor}F 양생시트·측압 모니터`, pos: [cx, fy + 0.2, cz] },
  ];

  POUR_RC_GAME = createInspectionMinigame({
    id: '타설양생_' + floor,
    trade: 'pour',
    label: `${floor}층 콘크리트 타설·양생`,
    holdTime: 1.8,
    range: 2.5,
    spots,
    onComplete: () => {
      POUR_RC_STATE.perFloor[floor] = { done: true };
      if (typeof showActionNotif === 'function') {
        showActionNotif(`✅ ${floor}층 타설·양생 완료 — 다음 층 거푸집·철근`, 4500);
      }
      // pour_cure 완료 → 다음 층 formwork_rebar 자동 시작
      const nextFloor = floor + 1;
      if (nextFloor <= (GAME.state.targetFloors || 5) && typeof startFormworkRebar === 'function') {
        if (GAME.state.rcLoop) { GAME.state.rcLoop.floor = nextFloor; GAME.state.rcLoop.stepIdx = 0; }
        setTimeout(() => startFormworkRebar(nextFloor), 1200);
      } else if (typeof advanceRcStep === 'function') {
        advanceRcStep();
      }
    },
  });
  POUR_RC_GAME.start();
}

function updatePourRc(delta) { if (POUR_RC_GAME) POUR_RC_GAME.update(delta); }
function pourRcHoldStart()    { if (POUR_RC_GAME) POUR_RC_GAME.holdStart(); }
function pourRcHoldEnd()      { if (POUR_RC_GAME) POUR_RC_GAME.holdEnd(); }

window.startPourCure   = startPourCure;
window.updatePourRc    = updatePourRc;
window.pourRcHoldStart = pourRcHoldStart;
window.pourRcHoldEnd   = pourRcHoldEnd;
window.POUR_RC_STATE   = POUR_RC_STATE;
