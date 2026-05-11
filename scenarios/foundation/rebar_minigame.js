// 기초 Phase 2 — 철근 보호캡 점검 (공통 inspection 팩토리)

let REBAR_GAME = null;

function startRebarInspection() {
  if (typeof createInspectionMinigame !== 'function') return;
  REBAR_GAME = createInspectionMinigame({
    id: '철근보호캡',
    label: '철근 보호캡 점검',
    holdTime: 1.5, range: 2.0,
    spots: [
      { label: '매트 NW 노출철근', pos: [-5, 0, -22] },
      { label: '매트 NE 노출철근', pos: [ 5, 0, -22] },
      { label: '매트 SW 노출철근', pos: [-5, 0, -12] },
      { label: '매트 SE 노출철근', pos: [ 5, 0, -12] },
    ],
    onComplete: () => {
      FOUND_STATE.rebarCapsOk = true;
      GAME.state.phase = getCurrentPhase();
      updateHUD();
      showActionNotif('🎉 철근 보호캡 점검 완료 — 거푸집 점검 단계', 4000);
      setTimeout(() => { if (typeof startFormworkInspection === 'function') startFormworkInspection(); }, 1500);
    },
  });
  REBAR_GAME.start();
}

function updateRebar(delta) { if (REBAR_GAME) REBAR_GAME.update(delta); }
function rebarHoldStart()    { if (REBAR_GAME) REBAR_GAME.holdStart(); }
function rebarHoldEnd()      { if (REBAR_GAME) REBAR_GAME.holdEnd(); }

// Phase 3: 거푸집·동바리 점검
let FORMWORK_GAME = null;

function startFormworkInspection() {
  if (typeof createInspectionMinigame !== 'function') return;
  FORMWORK_GAME = createInspectionMinigame({
    id: '거푸집점검',
    label: '거푸집·동바리 점검',
    holdTime: 1.8, range: 2.0,
    spots: [
      { label: '거푸집 북측', pos: [0, 0, -11.5] },
      { label: '거푸집 남측', pos: [0, 0, -22.5] },
      { label: '거푸집 동측', pos: [5.5, 0, -17] },
      { label: '거푸집 서측', pos: [-5.5, 0, -17] },
    ],
    onComplete: () => {
      FOUND_STATE.formworkOk = true;
      GAME.state.phase = getCurrentPhase();
      updateHUD();
      showActionNotif('🎉 거푸집·동바리 점검 완료 — 펌프카 점검 단계', 4000);
      setTimeout(() => { if (typeof startPumpInspection === 'function') startPumpInspection(); }, 1500);
    },
  });
  FORMWORK_GAME.start();
}

function updateFormwork(delta) { if (FORMWORK_GAME) FORMWORK_GAME.update(delta); }
function formworkHoldStart()    { if (FORMWORK_GAME) FORMWORK_GAME.holdStart(); }
function formworkHoldEnd()      { if (FORMWORK_GAME) FORMWORK_GAME.holdEnd(); }

// Phase 4: 펌프카 점검 — 단일 지점, 1.5초 홀드
let PUMP_GAME = null;

function startPumpInspection() {
  if (typeof createInspectionMinigame !== 'function') return;
  PUMP_GAME = createInspectionMinigame({
    id: '펌프카점검',
    label: '펌프카 호스·아웃트리거 점검',
    holdTime: 2.0, range: 2.5,
    spots: [
      { label: '펌프카 호스 점검',     pos: [14, 0, -8] },
      { label: '아웃트리거 4개 점검',  pos: [14, 0, -10.5] },
    ],
    onComplete: () => {
      FOUND_STATE.pumpOk = true;
      GAME.state.phase = getCurrentPhase();
      updateHUD();
      showActionNotif('🎉 펌프카 점검 완료 — 타설 순서 합의 단계', 4000);
      setTimeout(() => { if (typeof startPourOrder === 'function') startPourOrder(); }, 1500);
    },
  });
  PUMP_GAME.start();
}

function updatePump(delta) { if (PUMP_GAME) PUMP_GAME.update(delta); }
function pumpHoldStart()    { if (PUMP_GAME) PUMP_GAME.holdStart(); }
function pumpHoldEnd()      { if (PUMP_GAME) PUMP_GAME.holdEnd(); }

// Phase 5: 타설 순서·신호 합의 — 단일 지점 단순화
let POUR_ORDER_GAME = null;
function startPourOrder() {
  if (typeof createInspectionMinigame !== 'function') return;
  POUR_ORDER_GAME = createInspectionMinigame({
    id: '타설순서',
    label: '타설 순서·신호 합의',
    holdTime: 1.5, range: 2.0,
    spots: [
      { label: '타설 순서 합의 (책상 옆)', pos: [10, 0, 0] },
    ],
    onComplete: () => {
      FOUND_STATE.pourOrderAgreed = true;
      GAME.state.phase = getCurrentPhase();
      updateHUD();
      showActionNotif('🎉 타설 순서 합의 완료 — 펌프카 제어반으로', 4000);
    },
  });
  POUR_ORDER_GAME.start();
}
function updatePourOrder(delta) { if (POUR_ORDER_GAME) POUR_ORDER_GAME.update(delta); }
function pourOrderHoldStart()    { if (POUR_ORDER_GAME) POUR_ORDER_GAME.holdStart(); }
function pourOrderHoldEnd()      { if (POUR_ORDER_GAME) POUR_ORDER_GAME.holdEnd(); }
