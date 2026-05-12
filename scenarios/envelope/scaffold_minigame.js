// 외장 Phase 2 — 비계 조립검사 (E 홀드 4지점)
// Phase 3 — 안전대 부착설비 (E 홀드)
// Phase 4 — 외장재 결속 (E 홀드)
// Phase 5 — 신호수 (단일 지점)

let SCAFFOLD_GAME = null;
function startScaffoldInspection() {
  if (typeof createInspectionMinigame !== 'function') return;
  SCAFFOLD_GAME = createInspectionMinigame({
    id: '비계점검', trade: 'scaffold',
    label: '비계 조립검사',
    holdTime: 1.8, range: 2.0,
    spots: [
      { label: '북측 비계 벽이음', pos: [0, 0, -10.8] },
      { label: '남측 비계 벽이음', pos: [0, 0, -23.2] },
      { label: '동측 비계 벽이음', pos: [6.2, 0, -17] },
      { label: '서측 비계 벽이음', pos: [-6.2, 0, -17] },
    ],
    onComplete: () => {
      ENV_STATE.scaffoldInspected = true;
      GAME.state.phase = getCurrentPhase();
      updateHUD();
      showActionNotif(({ ko:'🎉 비계 조립검사 완료 — 안전대 부착설비 설치', en:'🎉 Scaffold assembly inspected — install lifeline anchors next', vi:'🎉 Kiểm tra giàn giáo xong — lắp neo dây cứu sinh tiếp', ar:'🎉 اكتمل فحص السقالة — التالي تركيب نقاط تثبيت حبل النجاة' })[currentLang] || '🎉 비계 조립검사 완료 — 안전대 부착설비 설치', 4000);
      setTimeout(() => { if (typeof startLifelineInstall === 'function') startLifelineInstall(); }, 1500);
    },
  });
  SCAFFOLD_GAME.start();
}
function updateScaffold(delta) { if (SCAFFOLD_GAME) SCAFFOLD_GAME.update(delta); }
function scaffoldHoldStart() { if (SCAFFOLD_GAME) SCAFFOLD_GAME.holdStart(); }
function scaffoldHoldEnd()   { if (SCAFFOLD_GAME) SCAFFOLD_GAME.holdEnd(); }

let LIFELINE_GAME = null;
function startLifelineInstall() {
  if (typeof createInspectionMinigame !== 'function') return;
  LIFELINE_GAME = createInspectionMinigame({
    id: '안전대설비', trade: 'scaffold',
    label: '안전대 부착설비 설치',
    holdTime: 1.8, range: 2.0,
    spots: [
      { label: '북측 구명줄 앵커', pos: [-3, 0, -10.8] },
      { label: '남측 구명줄 앵커', pos: [ 3, 0, -23.2] },
    ],
    onComplete: () => {
      ENV_STATE.lifelineInstalled = true;
      GAME.state.phase = getCurrentPhase();
      updateHUD();
      showActionNotif(({ ko:'🎉 안전대 부착설비 설치 완료 — 외장재 결속 점검', en:'🎉 Lifeline anchors installed — check panel securing next', vi:'🎉 Đã lắp neo dây cứu sinh — kiểm tra buộc panel tiếp', ar:'🎉 تم تركيب نقاط تثبيت الحبل — التالي فحص ربط الألواح' })[currentLang] || '🎉 안전대 부착설비 설치 완료 — 외장재 결속 점검', 4000);
      setTimeout(() => { if (typeof startPanelSecure === 'function') startPanelSecure(); }, 1500);
    },
  });
  LIFELINE_GAME.start();
}
function updateLifeline(delta) { if (LIFELINE_GAME) LIFELINE_GAME.update(delta); }
function lifelineHoldStart() { if (LIFELINE_GAME) LIFELINE_GAME.holdStart(); }
function lifelineHoldEnd()   { if (LIFELINE_GAME) LIFELINE_GAME.holdEnd(); }

let PANEL_GAME = null;
function startPanelSecure() {
  if (typeof createInspectionMinigame !== 'function') return;
  PANEL_GAME = createInspectionMinigame({
    id: '외장결속', trade: 'scaffold',
    label: '외장재 결속 점검',
    holdTime: 1.5, range: 2.0,
    spots: [
      { label: 'ACM 패널 적치 결속', pos: [10, 0, 4] },
      { label: '유리 패널 적치 결속', pos: [13, 0, 4] },
      { label: '결속선 자재 확인',   pos: [16, 0, 4] },
    ],
    onComplete: () => {
      ENV_STATE.panelSecured = true;
      GAME.state.phase = getCurrentPhase();
      updateHUD();
      showActionNotif(({ ko:'🎉 외장재 결속 점검 완료 — 신호수 배치', en:'🎉 Panel securing checked — place signaller next', vi:'🎉 Kiểm tra buộc panel xong — bố trí người ra hiệu tiếp', ar:'🎉 اكتمل فحص ربط الألواح — التالي تعيين الإشاري' })[currentLang] || '🎉 외장재 결속 점검 완료 — 신호수 배치', 4000);
      setTimeout(() => { if (typeof startEnvSignal === 'function') startEnvSignal(); }, 1500);
    },
  });
  PANEL_GAME.start();
}
function updatePanel(delta) { if (PANEL_GAME) PANEL_GAME.update(delta); }
function panelHoldStart() { if (PANEL_GAME) PANEL_GAME.holdStart(); }
function panelHoldEnd()   { if (PANEL_GAME) PANEL_GAME.holdEnd(); }

let ENV_SIGNAL_GAME = null;
function startEnvSignal() {
  if (typeof createInspectionMinigame !== 'function') return;
  ENV_SIGNAL_GAME = createInspectionMinigame({
    id: '외장신호수', trade: 'signal',
    label: '신호수 배치',
    holdTime: 1.2, range: 2.0,
    spots: [
      { label: '신호수 위치 (인양 경로 시야)', pos: [4, 0, -10] },
    ],
    onComplete: () => {
      ENV_STATE.signalAssigned = true;
      GAME.state.phase = getCurrentPhase();
      updateHUD();
      showActionNotif(({ ko:'🎉 신호수 배치 완료 — 외장 인양 트리거로', en:'🎉 Signaller placed — go to envelope lift trigger', vi:'🎉 Đã bố trí người ra hiệu — đến điểm kích hoạt cẩu vỏ bao che', ar:'🎉 تم تعيين الإشاري — توجه إلى نقطة بدء رفع الواجهة' })[currentLang] || '🎉 신호수 배치 완료 — 외장 인양 트리거로', 4000);
    },
  });
  ENV_SIGNAL_GAME.start();
}
function updateEnvSignal(delta) { if (ENV_SIGNAL_GAME) ENV_SIGNAL_GAME.update(delta); }
function envSignalHoldStart() { if (ENV_SIGNAL_GAME) ENV_SIGNAL_GAME.holdStart(); }
function envSignalHoldEnd()   { if (ENV_SIGNAL_GAME) ENV_SIGNAL_GAME.holdEnd(); }
