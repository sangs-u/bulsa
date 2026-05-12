// 설비·마감 미니게임 — LOTO / 가스점검 / 환기 / 소화기 (모두 inspection 패턴)

let LOTO_GAME = null;
function startLoto() {
  if (typeof createInspectionMinigame !== 'function') return;
  LOTO_GAME = createInspectionMinigame({
    id: 'LOTO', trade: 'electric',
    label: 'LOTO 잠금·표지 부착',
    holdTime: 2.0, range: 2.0,
    spots: [
      { label: '분전반 차단기 (잠금+표지)', pos: [-4.3, 0, -11.5] },
    ],
    onComplete: () => {
      MEP_STATE.lotoApplied = true;
      GAME.state.phase = getCurrentPhase();
      updateHUD();
      showActionNotif(({ ko:'🎉 LOTO 적용 완료 — 가스누설 점검 단계', en:'🎉 LOTO applied — gas leak check next', vi:'🎉 Áp dụng LOTO xong — kiểm tra rò khí gas tiếp', ar:'🎉 تم تطبيق LOTO — التالي فحص تسرب الغاز' })[currentLang] || '🎉 LOTO 적용 완료 — 가스누설 점검 단계', 4000);
      setTimeout(() => { if (typeof startGasCheck === 'function') startGasCheck(); }, 1500);
    },
  });
  LOTO_GAME.start();
}
function updateLoto(delta) { if (LOTO_GAME) LOTO_GAME.update(delta); }
function lotoHoldStart()    { if (LOTO_GAME) LOTO_GAME.holdStart(); }
function lotoHoldEnd()      { if (LOTO_GAME) LOTO_GAME.holdEnd(); }

let GAS_GAME = null;
function startGasCheck() {
  if (typeof createInspectionMinigame !== 'function') return;
  GAS_GAME = createInspectionMinigame({
    id: '가스점검', trade: 'plumbing',
    label: '가스누설 점검',
    holdTime: 1.5, range: 2.0,
    spots: [
      { label: '가스 밸브 (외벽 좌)', pos: [-5.5, 0, -11.9] },
    ],
    onComplete: () => {
      MEP_STATE.gasChecked = true;
      GAME.state.phase = getCurrentPhase();
      updateHUD();
      showActionNotif(({ ko:'🎉 가스 누설 점검 완료 — 환기 가동 단계', en:'🎉 Gas leak check done — start ventilation next', vi:'🎉 Kiểm tra rò khí xong — bật thông gió tiếp', ar:'🎉 اكتمل فحص تسرب الغاز — التالي تشغيل التهوية' })[currentLang] || '🎉 가스 누설 점검 완료 — 환기 가동 단계', 4000);
      setTimeout(() => { if (typeof startVentActivation === 'function') startVentActivation(); }, 1500);
    },
  });
  GAS_GAME.start();
}
function updateGas(delta) { if (GAS_GAME) GAS_GAME.update(delta); }
function gasHoldStart()    { if (GAS_GAME) GAS_GAME.holdStart(); }
function gasHoldEnd()      { if (GAS_GAME) GAS_GAME.holdEnd(); }

let VENT_GAME = null;
function startVentActivation() {
  if (typeof createInspectionMinigame !== 'function') return;
  VENT_GAME = createInspectionMinigame({
    id: '환기', trade: 'plumbing',
    label: '환기·국소배기 가동',
    holdTime: 1.5, range: 2.0,
    spots: [
      { label: '환기 그릴 (하부)', pos: [4.3, 0, -11.5] },
      { label: '환기 그릴 (상부)', pos: [4.3, 0, -11.5] }, // 동일 위치 (단순화)
    ],
    onComplete: () => {
      MEP_STATE.ventActivated = true;
      GAME.state.phase = getCurrentPhase();
      updateHUD();
      showActionNotif(({ ko:'🎉 환기 가동 완료 — 소화기 배치 점검', en:'🎉 Ventilation running — check fire extinguishers', vi:'🎉 Đã bật thông gió — kiểm tra bình chữa cháy', ar:'🎉 تم تشغيل التهوية — افحص أماكن طفايات الحريق' })[currentLang] || '🎉 환기 가동 완료 — 소화기 배치 점검', 4000);
      setTimeout(() => { if (typeof startExtCheck === 'function') startExtCheck(); }, 1500);
    },
  });
  // 단일 환기 그릴이므로 spots 1개로 줄이기
  VENT_GAME.state.spots = VENT_GAME.state.spots.slice(0, 1);
  VENT_GAME.start();
}
function updateVent(delta) { if (VENT_GAME) VENT_GAME.update(delta); }
function ventHoldStart()    { if (VENT_GAME) VENT_GAME.holdStart(); }
function ventHoldEnd()      { if (VENT_GAME) VENT_GAME.holdEnd(); }

let EXT_GAME = null;
function startExtCheck() {
  if (typeof createInspectionMinigame !== 'function') return;
  EXT_GAME = createInspectionMinigame({
    id: '소화기', trade: 'finishing',
    label: '소화기 배치 점검',
    holdTime: 1.0, range: 2.0,
    spots: [
      { label: '소화기 #1 (NW)', pos: [-4, 0, -8] },
      { label: '소화기 #2 (NE)', pos: [ 4, 0, -8] },
      { label: '소화기 #3 (SW)', pos: [-4, 0, -25] },
      { label: '소화기 #4 (SE)', pos: [ 4, 0, -25] },
    ],
    onComplete: () => {
      MEP_STATE.extVerified = true;
      GAME.state.phase = getCurrentPhase();
      updateHUD();
      showActionNotif(({ ko:'🎉 소화기 배치 점검 완료 — 책상 옆 준공검사 트리거로', en:'🎉 Fire extinguisher check done — go to final inspection trigger by the desk', vi:'🎉 Kiểm tra bình chữa cháy xong — đến điểm nghiệm thu bên bàn', ar:'🎉 اكتمل فحص الطفايات — توجه إلى نقطة الفحص النهائي بجوار المكتب' })[currentLang] || '🎉 소화기 배치 점검 완료 — 책상 옆 준공검사 트리거로', 4000);
    },
  });
  EXT_GAME.start();
}
function updateExt(delta) { if (EXT_GAME) EXT_GAME.update(delta); }
function extHoldStart()    { if (EXT_GAME) EXT_GAME.holdStart(); }
function extHoldEnd()      { if (EXT_GAME) EXT_GAME.holdEnd(); }
