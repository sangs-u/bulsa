// rc_frame sub-step 1: 거푸집·철근 (formwork_rebar)
// 4지점 점검 — 거푸집 측압 / 철근 배근간격 / 동바리 수직도 / 추락방지망
// 추락 + 자재낙하 사고에 대응. createInspectionMinigame 팩토리 재사용.

let FORMWORK_RC_GAME = null;

const FORMWORK_RC_STATE = {
  perFloor: {},   // { floor: { done: bool } }
};

function startFormworkRebar(floor) {
  if (typeof createInspectionMinigame !== 'function') return;
  floor = floor || (GAME.state.rcLoop && GAME.state.rcLoop.floor) || 1;

  // 층 고도 — 1F=0, 2F=3.8, 3F=7.6 ...
  const fy = (floor - 1) * 3.8;
  const cx = 0, cz = -17;

  // 점검 지점 4종 (각 층마다 동일 위치, 높이만 다름)
  const spots = [
    { label: `${floor}F 거푸집 측압 점검`,    pos: [cx - 4.5, fy, cz + 4.0] },
    { label: `${floor}F 철근 배근간격 확인`,  pos: [cx + 4.5, fy, cz + 4.0] },
    { label: `${floor}F 동바리 수직도 점검`,  pos: [cx + 4.5, fy, cz - 4.0] },
    { label: `${floor}F 추락방지망 확인`,      pos: [cx - 4.5, fy, cz - 4.0] },
  ];

  FORMWORK_RC_GAME = createInspectionMinigame({
    id: '거푸집철근_' + floor,
    trade: 'formwork',
    label: `${floor}층 거푸집·철근 점검`,
    holdTime: 1.6,
    range: 2.2,
    spots,
    onComplete: () => {
      FORMWORK_RC_STATE.perFloor[floor] = { done: true };
      if (typeof showActionNotif === 'function') {
        showActionNotif(`✅ ${floor}층 거푸집·철근 점검 완료 — 양중 단계로`, 4000);
      }
      // interaction.js 가 GAME._rcAfterFormwork 콜백을 걸어둔 상태라면 양중 사이클 재개
      if (typeof GAME._rcAfterFormwork === 'function') {
        const cb = GAME._rcAfterFormwork;
        GAME._rcAfterFormwork = null;
        setTimeout(cb, 800);
      } else if (typeof advanceRcStep === 'function') {
        advanceRcStep();
      }
    },
  });
  FORMWORK_RC_GAME.start();
}

function updateFormworkRc(delta) { if (FORMWORK_RC_GAME) FORMWORK_RC_GAME.update(delta); }
function formworkRcHoldStart()    { if (FORMWORK_RC_GAME) FORMWORK_RC_GAME.holdStart(); }
function formworkRcHoldEnd()      { if (FORMWORK_RC_GAME) FORMWORK_RC_GAME.holdEnd(); }

window.startFormworkRebar  = startFormworkRebar;
window.updateFormworkRc    = updateFormworkRc;
window.formworkRcHoldStart = formworkRcHoldStart;
window.formworkRcHoldEnd   = formworkRcHoldEnd;
window.FORMWORK_RC_STATE   = FORMWORK_RC_STATE;
