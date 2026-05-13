// Interaction — direct action system
// E 키로 직접 행동 수행. 행동의 옳고 그름은 알려주지 않음.
// 결과는 evaluateLift() 호출 시에만 판정.

const INTERACTION = {
  raycaster:     null,
  center:        null,
  currentTarget: null,
  popupOpen:     false,
  specOpen:      false,
  _eDown:        false,
};

// ── Action notif 4언어 사전 ──────────────────────────────────
const _NOTIF = {
  plan_already:        { ko: '작업계획서 이미 작성됨',        en: 'Work plan already signed',           vi: 'Kế hoạch đã ký',              ar: 'الخطة موقعة بالفعل' },
  plan_first:          { ko: '계획서 먼저',                    en: 'Sign work plan first',                vi: 'Ký kế hoạch trước',           ar: 'وقّع الخطة أولاً' },
  survey_first:        { ko: '매설물 조사 먼저',              en: 'Survey underground utilities first',  vi: 'Khảo sát ngầm trước',         ar: 'مسح المرافق أولاً' },
  shoring_first:       { ko: '흙막이 먼저',                    en: 'Install shoring first',               vi: 'Lắp chống vách trước',        ar: 'ركّب الدعم أولاً' },
  railing_first:       { ko: '안전난간 먼저',                  en: 'Install guardrail first',             vi: 'Lắp lan can trước',           ar: 'ركّب الحاجز أولاً' },
  signal_first:        { ko: '신호수 배치 먼저',              en: 'Assign signal person first',          vi: 'Bố trí người ra hiệu trước', ar: 'عيّن عامل الإشارة أولاً' },
  rebar_first:         { ko: '철근 먼저',                      en: 'Inspect rebar caps first',            vi: 'Kiểm tra cốt thép trước',     ar: 'افحص الحديد أولاً' },
  formwork_first:      { ko: '거푸집 먼저',                    en: 'Inspect formwork first',              vi: 'Kiểm tra ván khuôn trước',    ar: 'افحص القوالب أولاً' },
  pump_first:          { ko: '펌프카 먼저',                    en: 'Inspect pump truck first',            vi: 'Kiểm tra xe bơm trước',       ar: 'افحص المضخة أولاً' },
  pour_order_first:    { ko: '타설 순서 합의 먼저',            en: 'Agree pour order first',              vi: 'Thống nhất trình tự đổ',      ar: 'اتفق على ترتيب الصب' },
  scaffold_first:      { ko: '비계 점검 먼저',                  en: 'Inspect scaffold first',              vi: 'Kiểm tra giàn giáo trước',    ar: 'افحص السقالة أولاً' },
  lifeline_first:      { ko: '안전대 먼저',                    en: 'Install lifeline first',              vi: 'Lắp dây neo trước',           ar: 'ركّب المرساة أولاً' },
  panel_secure_first:  { ko: '결속 먼저',                      en: 'Secure panels first',                 vi: 'Cố định tấm trước',           ar: 'ثبّت الألواح أولاً' },
  loto_first:          { ko: 'LOTO 먼저',                      en: 'Apply LOTO first',                    vi: 'Khóa LOTO trước',             ar: 'طبّق LOTO أولاً' },
  gas_first:           { ko: '가스 점검 먼저',                  en: 'Check gas leak first',                vi: 'Kiểm tra rò gas trước',       ar: 'افحص الغاز أولاً' },
  vent_first:          { ko: '환기 먼저',                      en: 'Activate ventilation first',          vi: 'Bật thông gió trước',         ar: 'فعّل التهوية أولاً' },
  ext_first:           { ko: '소화기 점검 먼저',                en: 'Verify extinguishers first',          vi: 'Kiểm tra bình chữa cháy trước', ar: 'افحص الطفايات أولاً' },
  done_shoring:        { ko: '✅ 흙막이 가시설 점검 완료',      en: '✅ Shoring inspection complete',     vi: '✅ Đã kiểm tra chống vách',  ar: '✅ تم فحص الدعم' },
  done_railing:        { ko: '✅ 안전난간 설치 완료',          en: '✅ Guardrails installed',             vi: '✅ Lan can đã lắp',           ar: '✅ تم تركيب الحاجز' },
  done_signal_excav:   { ko: '✅ 신호수 배치 완료 — 굴착기 운전석으로', en: '✅ Signal posted — board excavator', vi: '✅ Đã bố trí — lên cabin xúc', ar: '✅ تم — اصعد كابينة الحفّار' },
  done_rebar:          { ko: '✅ 철근 보호캡 점검 완료',         en: '✅ Rebar caps verified',              vi: '✅ Đã kiểm tra nắp thép',     ar: '✅ تم فحص أغطية الحديد' },
  done_formwork:       { ko: '✅ 거푸집·동바리 점검 완료',       en: '✅ Formwork/shoring verified',        vi: '✅ Đã kiểm tra ván/chống',    ar: '✅ تم فحص القوالب' },
  done_pump:           { ko: '✅ 펌프카 점검 완료',             en: '✅ Pump truck verified',              vi: '✅ Đã kiểm tra xe bơm',       ar: '✅ تم فحص المضخة' },
  done_pour_order:     { ko: '✅ 타설 순서 합의 완료 — 제어반으로', en: '✅ Pour order agreed — go to console', vi: '✅ Thống nhất — đến bảng điều khiển', ar: '✅ متفق — اذهب للوحة' },
  done_scaffold:       { ko: '✅ 비계 조립검사 완료',           en: '✅ Scaffold inspection complete',     vi: '✅ Đã kiểm tra giàn giáo',    ar: '✅ تم فحص السقالة' },
  done_lifeline:       { ko: '✅ 안전대 부착설비 설치 완료',     en: '✅ Lifeline anchors installed',       vi: '✅ Đã lắp dây neo',           ar: '✅ تم تركيب المرساة' },
  done_panel:          { ko: '✅ 외장재 결속 점검 완료',         en: '✅ Panel fastening verified',         vi: '✅ Đã cố định tấm',           ar: '✅ تم تثبيت الألواح' },
  done_signal_env:     { ko: '✅ 신호수 배치 완료 — 인양 트리거로', en: '✅ Signal posted — go to lift trigger', vi: '✅ Đã bố trí — đến điểm cẩu', ar: '✅ تم — اذهب للرفع' },
  done_loto:           { ko: '✅ LOTO 잠금·표지 부착 완료',      en: '✅ LOTO applied',                     vi: '✅ Đã khóa LOTO',             ar: '✅ تم تطبيق LOTO' },
  done_gas:            { ko: '✅ 가스누설 점검 완료',            en: '✅ Gas leak check complete',          vi: '✅ Đã kiểm tra rò gas',       ar: '✅ تم فحص الغاز' },
  done_vent:           { ko: '✅ 환기·국소배기 가동 완료',        en: '✅ Ventilation active',               vi: '✅ Thông gió bật',            ar: '✅ التهوية فعّالة' },
  done_ext:            { ko: '✅ 소화기 배치 점검 완료 — 준공검사로', en: '✅ Extinguishers verified — final inspection', vi: '✅ Đã kiểm tra bình — kiểm tra cuối', ar: '✅ تم — التفتيش النهائي' },
  excav_plan_done:     { ko: '✅ 작업계획서 서명 완료 — 탐지기 들고 부지 수색 시작', en: '✅ Plan signed — start utility survey', vi: '✅ Đã ký — bắt đầu khảo sát', ar: '✅ موقّع — ابدأ المسح' },
  found_plan_done:     { ko: '✅ 기초 작업계획서 서명 완료 — 철근 점검 시작', en: '✅ Foundation plan signed — start rebar inspection', vi: '✅ Đã ký móng — kiểm tra thép', ar: '✅ موقّع — افحص الحديد' },
  env_plan_done:       { ko: '✅ 외장 작업계획서 서명 완료 — 비계 점검 시작', en: '✅ Envelope plan signed — start scaffold inspection', vi: '✅ Đã ký vỏ ngoài — kiểm tra giàn giáo', ar: '✅ موقّع — افحص السقالة' },
  mep_plan_done:       { ko: '✅ 설비·마감 작업계획서 서명 완료 — LOTO 단계 시작', en: '✅ MEP plan signed — start LOTO', vi: '✅ Đã ký M&E — bắt đầu LOTO', ar: '✅ موقّع — ابدأ LOTO' },
};

function _notif(key) {
  const e = _NOTIF[key];
  if (!e) return key;
  return e[currentLang] || e.ko;
}

// Web Speech API — 운전원 거부 멘트 출력 (브라우저 지원·사용자 음성 활성 시에만)
function _speakRefusal(text) {
  try {
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
    const u = new SpeechSynthesisUtterance(text.replace(/^"|"$/g, ''));
    const langMap = { ko: 'ko-KR', en: 'en-US', vi: 'vi-VN', ar: 'ar-SA' };
    u.lang   = langMap[currentLang] || 'ko-KR';
    u.rate   = 0.95;
    u.pitch  = 0.9;
    u.volume = 0.85;
    window.speechSynthesis.cancel(); // 중복 발화 방지
    window.speechSynthesis.speak(u);
  } catch (e) { /* TTS 미지원 — 조용히 무시 */ }
}

// ── Init ───────────────────────────────────────────────────────
function initInteraction() {
  INTERACTION.raycaster = new THREE.Raycaster();
  INTERACTION.center    = new THREE.Vector2(0, 0);

  _initMouseInput();

  document.addEventListener('keydown', e => {
    if (!GAME.state.gameStarted || GAME.state.gameOver) return;

    if (e.code === 'KeyE' && !INTERACTION._eDown) {
      INTERACTION._eDown = true;
      if (_dispatchHoldStart()) return; // 홀드 미니게임에 위임
    }

    // SPACE — 미니게임 마킹 (현재 매설물 탐지기만)
    if (e.code === 'Space' && typeof SURVEY !== 'undefined' && SURVEY.active) {
      e.preventDefault();
      if (typeof tryMarkSurvey === 'function') tryMarkSurvey();
    }
    // Q — 현재 활성 미니게임 동료 위임
    if (e.code === 'KeyQ' && typeof tryDelegateCurrent === 'function') {
      tryDelegateCurrent();
    }

    // Y — 통합 모드 페이즈 전환 (canAdvance 체크)
    if (e.code === 'KeyY' && typeof PHASE_CONTROLLER !== 'undefined' && PHASE_CONTROLLER.isEnabled()) {
      const blocker = PHASE_CONTROLLER.advanceBlocker();
      if (blocker === 'final') {
        // 마지막 페이즈 완료 — advance(force) 로 isFinal 콜백 발화
        PHASE_CONTROLLER.advance(true);
      } else if (blocker === 'inspector_flag') {
        const m = { ko: '⚠ 인스펙터 flag 해결 후 진입 가능', en: '⚠ Resolve inspector flag first', vi: '⚠ Giải quyết flag trước', ar: '⚠ احلّ الملاحظة أولاً' };
        if (typeof showActionNotif === 'function') showActionNotif(m[currentLang] || m.ko, 2200);
      } else if (blocker === 'incomplete') {
        const prog = Math.round(PHASE_CONTROLLER.progress() * 100);
        const m = { ko: `진행 ${prog}% — 아직 완료되지 않음`, en: `Progress ${prog}% — not complete`, vi: `Tiến độ ${prog}% — chưa xong`, ar: `التقدم ${prog}٪ — غير مكتمل` };
        if (typeof showActionNotif === 'function') showActionNotif(m[currentLang] || m.ko, 2200);
      } else {
        PHASE_CONTROLLER.advance();
      }
    }

    if (e.code === 'Escape') {
      if (INTERACTION.specOpen) { closeSpecPopup(); return; }
      if (GAME.state.craneBoarded) { exitCraneCab(); return; }
      const refusal = document.getElementById('operator-refusal-popup');
      if (refusal && !refusal.classList.contains('hidden')) { closeOperatorRefusal(); return; }
      if (INTERACTION.popupOpen) {
        // Close whichever phase panel is open
        ['plan-panel','safety-panel','equipment-panel'].forEach(id => {
          const el = document.getElementById(id);
          if (el && !el.classList.contains('hidden')) _closePanel(id);
        });
        closePopup();
      }
    }
  });
  document.addEventListener('keyup', e => {
    if (e.code === 'KeyE') {
      INTERACTION._eDown = false;
      _dispatchHoldEnd();
    }
  });

  // Mobile tap on interact prompt
  const promptEl = document.getElementById('hud-interact');
  if (promptEl) {
    promptEl.style.pointerEvents = 'auto';
    promptEl.addEventListener('click', () => {
      if (!INTERACTION.popupOpen && !INTERACTION.specOpen) _handleE();
    });
  }
}

// ── 마우스 입력 (LMB=상호작용 / RMB=위치 지시) ───────────────────
let _commandMarkerGeo = null, _commandMarkerMat = null;

function _initMouseInput() {
  const canvas = GAME.renderer && GAME.renderer.domElement;
  if (!canvas) return;
  canvas.addEventListener('mousedown', _onMouseDown);
  canvas.addEventListener('mouseup',   _onMouseUp);
  canvas.addEventListener('contextmenu', e => {
    if (document.pointerLockElement) e.preventDefault();
  });
}

function _onMouseDown(e) {
  if (!GAME.state.gameStarted || GAME.state.gameOver || GAME.state.paused) return;
  if (!document.pointerLockElement) return;
  if (INTERACTION.popupOpen || INTERACTION.specOpen) return;

  if (e.button === 0) {            // LMB — E 키와 동일 (선택/상호작용)
    e.preventDefault();
    if (!INTERACTION._eDown) {
      INTERACTION._eDown = true;
      _dispatchHoldStart();        // 미니게임 위임 또는 _handleE
    }
  } else if (e.button === 2) {     // RMB — 작업반장 위치 지시
    e.preventDefault();
    _placeCommandMarker();
  }
}

function _onMouseUp(e) {
  if (e.button === 0 && INTERACTION._eDown) {
    INTERACTION._eDown = false;
    _dispatchHoldEnd();
  }
}

// 화면 중앙 raycast → 지면(y=0) 교차점에 마커 + 가까운 NPC 찾기
function _placeCommandMarker() {
  if (!INTERACTION.raycaster) return;
  INTERACTION.raycaster.setFromCamera(INTERACTION.center, GAME.camera);
  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3();
  if (!INTERACTION.raycaster.ray.intersectPlane(ground, hit)) return;
  // 너무 멀면 무시 (50m 컷)
  if (GAME.camera.position.distanceTo(hit) > 50) return;

  if (!_commandMarkerGeo) {
    _commandMarkerGeo = new THREE.RingGeometry(0.55, 0.95, 32);
    _commandMarkerMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00, transparent: true, opacity: 0.85,
      side: THREE.DoubleSide, depthWrite: false,
    });
  }
  const marker = new THREE.Mesh(_commandMarkerGeo, _commandMarkerMat.clone());
  marker.position.copy(hit);
  marker.position.y = 0.06;
  marker.rotation.x = -Math.PI / 2;
  marker.renderOrder = 999;
  GAME.scene.add(marker);

  const npc = _findNearestNpcTo(hit);
  if (npc && typeof window.npcMoveTo === 'function') {
    window.npcMoveTo(npc, hit.x, hit.z);
  }
  const msgs = npc
    ? { ko: `📍 ${npc.name || npc.id} 에게 위치 지시`, en: `📍 Position cmd → ${npc.name || npc.id}`, vi: `📍 Vị trí → ${npc.name || npc.id}`, ar: `📍 الموقع → ${npc.name || npc.id}` }
    : { ko: '📍 위치 표시 (NPC 미감지)', en: '📍 Marker placed (no NPC nearby)', vi: '📍 Đã đánh dấu (không có NPC)', ar: '📍 تم التحديد (لا عامل قريب)' };
  if (typeof showActionNotif === 'function') {
    showActionNotif(msgs[currentLang] || msgs.ko, 1400);
  }

  // 페이드아웃 (2.4초)
  const start = performance.now();
  function _fadeMarker() {
    const t = (performance.now() - start) / 2400;
    if (t >= 1) { GAME.scene.remove(marker); return; }
    marker.material.opacity = 0.85 * (1 - t);
    const s = 1 + t * 0.5;
    marker.scale.set(s, s, s);
    requestAnimationFrame(_fadeMarker);
  }
  _fadeMarker();
}

function _findNearestNpcTo(point) {
  if (!GAME.npcs || !GAME.npcs.length) return null;
  let nearest = null, minD = 14;
  GAME.npcs.forEach(npc => {
    if (!npc || !npc.position) return;
    const dx = point.x - npc.position[0];
    const dz = point.z - npc.position[2];
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d < minD) { minD = d; nearest = npc; }
  });
  return nearest;
}

// ── Frame update ───────────────────────────────────────────────
function updateInteraction() {
  if (INTERACTION.popupOpen || INTERACTION.specOpen || GAME.state.gameOver) return;
  if (GAME.state.craneBoarded) return;

  INTERACTION.raycaster.setFromCamera(INTERACTION.center, GAME.camera);
  const meshes = GAME.interactables.map(i => i.mesh).filter(Boolean);
  const hits   = INTERACTION.raycaster.intersectObjects(meshes, false);

  let closest = null;

  // Filter interactables by phase: items with a `phase` field are only
  // active when the current game phase matches. Items without a phase
  // field are always eligible.
  const currentPhase = GAME.state.phase || 1;
  const eligible = GAME.interactables.filter(
    i => i.phase === undefined || i.phase === currentPhase
  );

  if (hits.length > 0 && hits[0].distance < 4.0) {
    closest = eligible.find(i => i.mesh === hits[0].object);
  }

  // Proximity fallback for large/invisible triggers — world position 사용 (unified zone group offset 호환)
  // NPC 는 투명 sphere trigger 라 raycast 빗나가기 쉬움 → 반경 3.5m 로 완화 (이전 2.8m)
  // 일반 mesh 와 NPC 분리: NPC 는 더 너그럽게.
  if (!closest) {
    const cam = GAME.camera.position;
    const _wp = new THREE.Vector3();
    let minNpcD = 3.5, minObjD = 2.8;
    let nearestNpc = null, nearestObj = null;
    eligible.forEach(item => {
      if (!item.mesh) return;
      item.mesh.getWorldPosition(_wp);
      const d = cam.distanceTo(_wp);
      if (item.type === 'npc') {
        if (d < minNpcD) { minNpcD = d; nearestNpc = item; }
      } else {
        if (d < minObjD) { minObjD = d; nearestObj = item; }
      }
    });
    // 오브젝트가 더 가깝거나 NPC 후보 없으면 오브젝트 우선
    closest = nearestObj || nearestNpc;
  }

  INTERACTION.currentTarget = closest;

  // crosshair 시각 피드백 — 타겟 있으면 노란색 highlight
  const ch = document.getElementById('hud-crosshair');
  if (ch) ch.classList.toggle('targetable', !!closest);

  if (closest) {
    let label = closest.label || '';
    if (label && typeof label === 'object') label = label[currentLang] || label.ko || '';
    showInteractPrompt(`[E / 좌클릭]  ${label}`);
  } else {
    hideInteractPrompt();
  }
}

// ── 미니게임 dispatch (E 키 down/up) ───────────────────────
// 활성 미니게임에 위임 — 반환 true 면 _handleE 호출 안 함
function _dispatchHoldStart() {
  // 홀드 점검 패턴
  const holdGames = [
    () => typeof SHORING !== 'undefined' && SHORING.active && (shoringHoldStart(), true),
    () => REBAR_GAME && REBAR_GAME.state.active && (rebarHoldStart(), true),
    () => FORMWORK_GAME && FORMWORK_GAME.state.active && (formworkHoldStart(), true),
    () => PUMP_GAME && PUMP_GAME.state.active && (pumpHoldStart(), true),
    () => POUR_ORDER_GAME && POUR_ORDER_GAME.state.active && (pourOrderHoldStart(), true),
    () => SCAFFOLD_GAME && SCAFFOLD_GAME.state.active && (scaffoldHoldStart(), true),
    () => LIFELINE_GAME && LIFELINE_GAME.state.active && (lifelineHoldStart(), true),
    () => PANEL_GAME && PANEL_GAME.state.active && (panelHoldStart(), true),
    () => ENV_SIGNAL_GAME && ENV_SIGNAL_GAME.state.active && (envSignalHoldStart(), true),
    () => typeof LOTO_GAME !== 'undefined' && LOTO_GAME && LOTO_GAME.state.active && (lotoHoldStart(), true),
    () => typeof FORMWORK_RC_GAME !== 'undefined' && FORMWORK_RC_GAME && FORMWORK_RC_GAME.state.active && (formworkRcHoldStart(), true),
    () => typeof POUR_RC_GAME !== 'undefined' && POUR_RC_GAME && POUR_RC_GAME.state.active && (pourRcHoldStart(), true),
  ];
  for (const fn of holdGames) {
    try { if (fn()) return true; } catch(e) {}
  }
  // 즉시 배치 패턴
  if (typeof RAILING !== 'undefined' && RAILING.active) { tryPlaceRailing(); return true; }
  if (typeof SIGNAL !== 'undefined' && SIGNAL.active)   { tryPlaceSignal();  return true; }
  // 미니게임 미활성 — 일반 인터랙트
  if (typeof cameraShake === 'function') try { cameraShake(0.18, 0.12); } catch (e) {}
  _handleE();
  return false;
}

function _dispatchHoldEnd() {
  const enders = [
    () => typeof SHORING !== 'undefined' && SHORING.active && shoringHoldEnd(),
    () => REBAR_GAME && REBAR_GAME.state.active && rebarHoldEnd(),
    () => FORMWORK_GAME && FORMWORK_GAME.state.active && formworkHoldEnd(),
    () => PUMP_GAME && PUMP_GAME.state.active && pumpHoldEnd(),
    () => POUR_ORDER_GAME && POUR_ORDER_GAME.state.active && pourOrderHoldEnd(),
    () => SCAFFOLD_GAME && SCAFFOLD_GAME.state.active && scaffoldHoldEnd(),
    () => LIFELINE_GAME && LIFELINE_GAME.state.active && lifelineHoldEnd(),
    () => PANEL_GAME && PANEL_GAME.state.active && panelHoldEnd(),
    () => ENV_SIGNAL_GAME && ENV_SIGNAL_GAME.state.active && envSignalHoldEnd(),
    () => typeof LOTO_GAME !== 'undefined' && LOTO_GAME && LOTO_GAME.state.active && lotoHoldEnd(),
    () => typeof FORMWORK_RC_GAME !== 'undefined' && FORMWORK_RC_GAME && FORMWORK_RC_GAME.state.active && formworkRcHoldEnd(),
    () => typeof POUR_RC_GAME !== 'undefined' && POUR_RC_GAME && POUR_RC_GAME.state.active && pourRcHoldEnd(),
  ];
  for (const fn of enders) {
    try { fn(); } catch(e) {}
  }
}

// ── E key handler ──────────────────────────────────────────────
function _handleE() {
  if (GAME.state.craneBoarded) { exitCraneCab(); return; }
  if (INTERACTION.popupOpen || INTERACTION.specOpen) return;

  const target = INTERACTION.currentTarget;
  if (!target) {
    // 사용자 피드백: 키는 인식됐으나 대상 없음 (아무 반응 없는 듯한 인상 방지)
    if (typeof showActionNotif === 'function') {
      const msg = { ko: '가까이 다가가서 시도하세요', en: 'Move closer to interact', vi: 'Đến gần hơn để tương tác', ar: 'اقترب للتفاعل' };
      showActionNotif(msg[currentLang] || msg.ko, 1400);
    }
    return;
  }

  switch (target.type) {
    case 'action':       performAction(target.actionId); break;
    case 'document':     openSpecPopup(target.docId);    break;
    case 'blueprint':    openBlueprintPanel();           break;
    case 'crane_cab':    boardCrane();                   break;
    case 'excav_cab':    if (typeof boardExcavator === 'function') boardExcavator(); break;
    case 'pump_console':     openPumpConsole();     break;
    case 'envelope_console':  openEnvelopeConsole();  break;
    case 'final_inspection':  openFinalInspection();  break;
    case 'npc':          openPopup(target);              break;
  }
}

// ── Phase gate (시나리오 인식) ───────────────────────────────
function getCurrentPhase() {
  if (GAME.scenarioId === 'excavation' && typeof getCurrentExcavPhase === 'function') {
    return getCurrentExcavPhase();
  }
  if (GAME.scenarioId === 'foundation' && typeof getCurrentFoundPhase === 'function') {
    return getCurrentFoundPhase();
  }
  if (GAME.scenarioId === 'envelope' && typeof getCurrentEnvPhase === 'function') {
    return getCurrentEnvPhase();
  }
  if (GAME.scenarioId === 'mep_finish' && typeof getCurrentMepPhase === 'function') {
    return getCurrentMepPhase();
  }
  if (!LIFT_STATE.planWritten)       return 1;
  if (!LIFT_STATE.safetyChecked)     return 2;
  if (!LIFT_STATE.outriggerExtended) return 3;
  if (!LIFT_STATE.slingInspected || !LIFT_STATE.pinSecured ||
      !LIFT_STATE.angleMeasured)     return 4;
  if (!LIFT_STATE.signalAssigned || !LIFT_STATE.workerEvacuated) return 5;
  return 6;
}

// ── Direct actions ─────────────────────────────────────────────
function performAction(actionId) {
  switch (actionId) {

    case 'write_plan':
      if (LIFT_STATE.planWritten) {
        showActionNotif(t('notifPlanAlready'));
        break;
      }
      openPlanPanel();
      break;

    case 'safety_review':
      if (!LIFT_STATE.planWritten) {
        showActionNotif(t('notifWritePlanFirst'));
        break;
      }
      if (LIFT_STATE.safetyChecked) {
        showActionNotif(t('notifSafetyAlready'));
        break;
      }
      openSafetyPanel();
      break;

    case 'extend_outrigger':
      if (!LIFT_STATE.safetyChecked) {
        showActionNotif(t('notifSafetyFirst'));
        break;
      }
      if (LIFT_STATE.outriggerExtended) {
        showActionNotif(t('notifOutriggerAlready'));
        break;
      }
      openEquipmentPanel();
      break;

    case 'inspect_sling':
      LIFT_STATE.slingInspected = true;
      _dimActionMesh('inspect_sling');
      _checkPhase4Done('itemSling');
      break;

    case 'secure_pin':
      LIFT_STATE.pinSecured = true;
      _dimActionMesh('secure_pin');
      _checkPhase4Done('itemPin');
      break;

    case 'measure_angle':
      LIFT_STATE.angleMeasured = true;
      _dimActionMesh('measure_angle');
      _checkPhase4Done('itemAngle');
      break;

    case 'evacuate_worker':
      if (LIFT_STATE.workerEvacuated) return;
      LIFT_STATE.workerEvacuated = true;
      _evacuateWorker();
      _checkPhase5Done();
      break;

    case 'assign_signal': {
      if (LIFT_STATE.signalAssigned) return;
      LIFT_STATE.signalAssigned = true;
      _moveSignalNPC();
      _dimActionMesh('assign_signal');
      _checkPhase5Done();
      break;
    }

    // ── Excavation actions ──────────────────────────────────
    case 'write_excav_plan':
      if (EXCAV_STATE.planWritten) {
        showActionNotif(_notif('plan_already'), 2000);
        break;
      }
      openExcavPlanPanel();
      break;

    // survey_underground 는 미니게임으로 대체됨 (survey_minigame.js)
    // — 작업계획서 서명 시 startSurvey 자동 호출, SPACE 마킹

    case 'install_shoring':
      if (EXCAV_STATE.shoringInstalled) return;
      if (!EXCAV_STATE.surveyDone) { showActionNotif(_notif('survey_first'), 2000); break; }
      EXCAV_STATE.shoringInstalled = true;
      _dimActionMesh('install_shoring');
      GAME.state.phase = getCurrentPhase();
      updateHUD();
      showActionNotif(_notif('done_shoring'), 2500);
      break;

    case 'install_railing':
      if (EXCAV_STATE.railingInstalled) return;
      if (!EXCAV_STATE.shoringInstalled) { showActionNotif(_notif('shoring_first'), 2000); break; }
      EXCAV_STATE.railingInstalled = true;
      _dimActionMesh('install_railing');
      GAME.state.phase = getCurrentPhase();
      updateHUD();
      showActionNotif(_notif('done_railing'), 2500);
      break;

    case 'assign_signal_excav':
      if (EXCAV_STATE.signalAssigned) return;
      if (!EXCAV_STATE.railingInstalled) { showActionNotif(_notif('railing_first'), 2000); break; }
      EXCAV_STATE.signalAssigned = true;
      _dimActionMesh('assign_signal_excav');
      GAME.state.phase = getCurrentPhase();
      updateHUD();
      showActionNotif(_notif('done_signal_excav'), 3000);
      break;

    // ── Foundation actions ──────────────────────────────────
    case 'write_found_plan':
      if (FOUND_STATE.planWritten) { showActionNotif(_notif('plan_already'), 2000); break; }
      openFoundPlanPanel();
      break;

    case 'check_rebar_caps':
      if (FOUND_STATE.rebarCapsOk) return;
      if (!FOUND_STATE.planWritten) { showActionNotif(_notif('plan_first'), 2000); break; }
      FOUND_STATE.rebarCapsOk = true;
      _dimActionMesh('check_rebar_caps');
      GAME.state.phase = getCurrentPhase();
      updateHUD();
      showActionNotif(_notif('done_rebar'), 2500);
      break;

    case 'inspect_formwork':
      if (FOUND_STATE.formworkOk) return;
      if (!FOUND_STATE.rebarCapsOk) { showActionNotif(_notif('rebar_first'), 2000); break; }
      FOUND_STATE.formworkOk = true;
      _dimActionMesh('inspect_formwork');
      GAME.state.phase = getCurrentPhase();
      updateHUD();
      showActionNotif(_notif('done_formwork'), 2500);
      break;

    case 'inspect_pump':
      if (FOUND_STATE.pumpOk) return;
      if (!FOUND_STATE.formworkOk) { showActionNotif(_notif('formwork_first'), 2000); break; }
      FOUND_STATE.pumpOk = true;
      _dimActionMesh('inspect_pump');
      GAME.state.phase = getCurrentPhase();
      updateHUD();
      showActionNotif(_notif('done_pump'), 2500);
      break;

    case 'agree_pour_order':
      if (FOUND_STATE.pourOrderAgreed) return;
      if (!FOUND_STATE.pumpOk) { showActionNotif(_notif('pump_first'), 2000); break; }
      FOUND_STATE.pourOrderAgreed = true;
      _dimActionMesh('agree_pour_order');
      GAME.state.phase = getCurrentPhase();
      updateHUD();
      showActionNotif(_notif('done_pour_order'), 3000);
      break;

    // ── Envelope (외장) actions ─────────────────────────────
    case 'write_env_plan':
      if (ENV_STATE.planWritten) { showActionNotif(_notif('plan_already'), 2000); break; }
      openEnvPlanPanel();
      break;

    case 'inspect_scaffold':
      if (ENV_STATE.scaffoldInspected) return;
      if (!ENV_STATE.planWritten) { showActionNotif(_notif('plan_first'), 2000); break; }
      ENV_STATE.scaffoldInspected = true;
      _dimActionMesh('inspect_scaffold');
      GAME.state.phase = getCurrentPhase();
      updateHUD();
      showActionNotif(_notif('done_scaffold'), 2500);
      break;

    case 'install_lifeline':
      if (ENV_STATE.lifelineInstalled) return;
      if (!ENV_STATE.scaffoldInspected) { showActionNotif(_notif('scaffold_first'), 2000); break; }
      ENV_STATE.lifelineInstalled = true;
      _dimActionMesh('install_lifeline');
      GAME.state.phase = getCurrentPhase();
      updateHUD();
      showActionNotif(_notif('done_lifeline'), 2500);
      break;

    case 'check_panel_secure':
      if (ENV_STATE.panelSecured) return;
      if (!ENV_STATE.lifelineInstalled) { showActionNotif(_notif('lifeline_first'), 2000); break; }
      ENV_STATE.panelSecured = true;
      _dimActionMesh('check_panel_secure');
      GAME.state.phase = getCurrentPhase();
      updateHUD();
      showActionNotif(_notif('done_panel'), 2500);
      break;

    case 'assign_signal_env':
      if (ENV_STATE.signalAssigned) return;
      if (!ENV_STATE.panelSecured) { showActionNotif(_notif('panel_secure_first'), 2000); break; }
      ENV_STATE.signalAssigned = true;
      _dimActionMesh('assign_signal_env');
      GAME.state.phase = getCurrentPhase();
      updateHUD();
      showActionNotif(_notif('done_signal_env'), 3000);
      break;

    // ── MEP & Finishing (설비·마감) actions ────────────────
    case 'write_mep_plan':
      if (MEP_STATE.planWritten) { showActionNotif(_notif('plan_already'), 2000); break; }
      openMepPlanPanel();
      break;

    case 'apply_loto':
      if (MEP_STATE.lotoApplied) return;
      if (!MEP_STATE.planWritten) { showActionNotif(_notif('plan_first'), 2000); break; }
      MEP_STATE.lotoApplied = true;
      _dimActionMesh('apply_loto');
      GAME.state.phase = getCurrentPhase();
      updateHUD();
      showActionNotif(_notif('done_loto'), 2500);
      break;

    case 'check_gas_leak':
      if (MEP_STATE.gasChecked) return;
      if (!MEP_STATE.lotoApplied) { showActionNotif(_notif('loto_first'), 2000); break; }
      MEP_STATE.gasChecked = true;
      _dimActionMesh('check_gas_leak');
      GAME.state.phase = getCurrentPhase();
      updateHUD();
      showActionNotif(_notif('done_gas'), 2500);
      break;

    case 'activate_ventilation':
      if (MEP_STATE.ventActivated) return;
      if (!MEP_STATE.gasChecked) { showActionNotif(_notif('gas_first'), 2000); break; }
      MEP_STATE.ventActivated = true;
      _dimActionMesh('activate_ventilation');
      GAME.state.phase = getCurrentPhase();
      updateHUD();
      showActionNotif(_notif('done_vent'), 2500);
      break;

    case 'verify_extinguishers':
      if (MEP_STATE.extVerified) return;
      if (!MEP_STATE.ventActivated) { showActionNotif(_notif('vent_first'), 2000); break; }
      MEP_STATE.extVerified = true;
      _dimActionMesh('verify_extinguishers');
      GAME.state.phase = getCurrentPhase();
      updateHUD();
      showActionNotif(_notif('done_ext'), 3000);
      break;
  }
}

// Phase 5 완료 확인: 신호수 배치 + 대피 완료 시 Phase 6 진행
function _checkPhase5Done() {
  GAME.state.phase = getCurrentPhase();
  updateHUD();
  if (LIFT_STATE.signalAssigned && LIFT_STATE.workerEvacuated) {
    showActionNotif(t('notifSiteDone'), 3500);
    _showPhasePopup(6, PHASE_NAMES[6][currentLang] || PHASE_NAMES[6].ko);
  } else {
    const remain = [
      !LIFT_STATE.signalAssigned  && t('itemSignal'),
      !LIFT_STATE.workerEvacuated && t('itemEvacuate'),
    ].filter(Boolean);
    if (remain.length > 0) showActionNotif(`✅ ${t('notifRemain')}: ${remain.join(' · ')}`);
  }
}

// Phase 4 완료 확인: 3개 모두 완료 시 Phase 5 진행
function _checkPhase4Done(itemKey) {
  GAME.state.phase = getCurrentPhase();
  updateHUD();
  const done = LIFT_STATE.slingInspected && LIFT_STATE.pinSecured && LIFT_STATE.angleMeasured;
  if (done && GAME.state.phase === 5) {
    showActionNotif(t('notifRiggingDone'), 3500);
    _showPhasePopup(5, PHASE_NAMES[5][currentLang] || PHASE_NAMES[5].ko);
  } else {
    const remain = [
      !LIFT_STATE.slingInspected && t('itemSling'),
      !LIFT_STATE.pinSecured     && t('itemPin'),
      !LIFT_STATE.angleMeasured  && t('itemAngle'),
    ].filter(Boolean);
    const label = itemKey ? `✅ ${t(itemKey)}` : '✅';
    const msg   = remain.length > 0 ? `${label}  ${t('notifRemain')}: ${remain.join(' · ')}` : label;
    showActionNotif(msg, 3000);
  }
}

// 페이즈 전환 팝업 (화면 중앙 3초 표시)
function _showPhasePopup(phase, name) {
  let el = document.getElementById('phase-popup');
  if (!el) {
    el = document.createElement('div');
    el.id = 'phase-popup';
    Object.assign(el.style, {
      position: 'fixed', top: '38%', left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(20,30,40,0.92)', color: '#fff', padding: '18px 38px',
      borderRadius: '10px', fontSize: '1.15rem', fontWeight: '700',
      letterSpacing: '0.04em', zIndex: '9000', pointerEvents: 'none',
      border: '1px solid rgba(255,255,255,0.18)', transition: 'opacity 0.5s',
    });
    document.body.appendChild(el);
  }
  el.textContent = `PHASE ${phase}/6 — ${name}`;
  el.style.opacity = '1';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.opacity = '0'; }, 2800);
}

// 행동 완료된 오브젝트를 인터랙터블에서 제거 + 시각적으로 흐리게
function _dimActionMesh(actionId) {
  const item = GAME.interactables.find(i => i.actionId === actionId);
  if (!item || !item.mesh) return;
  if (item.mesh.material) {
    item.mesh.material.opacity    = 0.3;
    item.mesh.material.transparent = true;
  }
  GAME.interactables = GAME.interactables.filter(i => i.actionId !== actionId);
  if (INTERACTION.currentTarget === item) {
    INTERACTION.currentTarget = null;
    hideInteractPrompt();
  }
}

// 작업반경 내 근로자 대피 애니메이션
function _evacuateWorker() {
  const w = GAME._dangerWorker;
  if (!w) return;

  // 인터랙터블에서 제거
  GAME.interactables = GAME.interactables.filter(i => i.mesh !== w.trigger);
  INTERACTION.currentTarget = null;
  hideInteractPrompt();

  const target = new THREE.Vector3(10, 0, 5);
  const g      = w.group;

  (function walk() {
    if (GAME.state.gameOver) return;
    const dir = new THREE.Vector3().subVectors(target, g.position);
    if (dir.length() > 0.3) {
      dir.normalize().multiplyScalar(0.055);
      g.position.add(dir);
      g.rotation.y = Math.atan2(dir.x, dir.z);
      requestAnimationFrame(walk);
    } else {
      g.visible = false;
    }
  })();
}

// 신호수 NPC 위치 이동 (Yuka home도 업데이트해서 원위치 복귀 방지)
function _moveSignalNPC() {
  if (!GAME.npcs) return;
  const gimc = GAME.npcs.find(n => n.id === 'gimc');
  if (!gimc || !gimc.group) return;
  const dest = new THREE.Vector3(3, 0, -6);
  gimc._targetPos = dest;
  gimc.setState(NPC_STATES.WORKING);
  // Update Yuka fixed-home so tickAllNPCs doesn't snap gimc back after arrival
  if (typeof _yukaVehicles !== 'undefined') {
    const entry = _yukaVehicles.get('gimc');
    if (entry && typeof YUKA !== 'undefined') {
      entry.home = new YUKA.Vector3(dest.x, 0, dest.z);
    }
  }
}

// ── Panel localization — call when opening any panel ─────────
function _localizePanels() {
  const ids = {
    'plan-title':          'planTitle',
    'plan-sec-cargo':      'planSecCargo',
    'plan-lbl-name':       'planLblName',
    'plan-lbl-weight':     'planLblWeight',
    'plan-lbl-shape':      'planLblShape',
    'plan-sec-sling':      'planSecSling',
    'plan-lbl-swl':        'planLblSwl',
    'plan-lbl-angle':      'planLblAngle',
    'plan-lbl-lines':      'planLblLines',
    'plan-sec-crew':       'planSecCrew',
    'plan-crew-foreman':   'planCrewForeman',
    'plan-crew-crane':     'planCrewCrane',
    'plan-crew-rigger':    'planCrewRigger',
    'plan-crew-signal':    'planCrewSignal',
    'plan-crew-safety':    'planCrewSafety',
    'plan-sec-risk':       'planSecRisk',
    'plan-risk-path':      'planRiskPath',
    'plan-risk-ground':    'planRiskGround',
    'plan-risk-wind':      'planRiskWind',
    'plan-risk-emergency': 'planRiskEmergency',
    'plan-btn-sign':       'planBtnSign',
    'safety-title':        'safetyTitle',
    'safety-lbl-weight':   'safetyLblWeight',
    'safety-lbl-angle':    'safetyLblAngle',
    'safety-lbl-k':        'safetyLblK',
    'safety-lbl-lines':    'safetyLblLines',
    'safety-lbl-lines-val':'safetyLblLinesVal',
    'safety-lbl-swl':      'safetyLblSwl',
    'safety-lbl-ts':       'safetyLblTs',
    'safety-lbl-sr':       'safetyLblSr',
    'safety-btn-calc':     'safetyBtnCalc',
    'safety-btn-confirm':  'safetyBtnConfirm',
    'equip-title':         'equipTitle',
    'equip-guide':         'equipGuide',
    'eq-outrigger-lbl':    'equipOutrigger',
    'eq-level-lbl':        'equipLevel',
    'eq-overload-lbl':     'equipOverload',
    'equip-bubble-guide':  'equipBubbleGuide',
    'level-confirm-btn':   'equipLevelConfirm',
    'equipment-btn-confirm':'equipBtnConfirm',
    'oll-lbl-rated':       'ollLblRated',
    'oll-lbl-current':     'ollLblCurrent',
    'oll-test-btn':        'ollBtnTest',
    'oll-confirm-btn':     'ollBtnConfirm',
  };
  Object.entries(ids).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = t(key);
  });
}

// ── Phase 1: Plan Panel ───────────────────────────────────────
function _closePanel(panelId) {
  const p = document.getElementById(panelId);
  if (p) p.classList.add('hidden');
  INTERACTION.popupOpen = false;
  if (panelId === 'equipment-panel' && INTERACTION._bubbleTimer) {
    clearInterval(INTERACTION._bubbleTimer);
    INTERACTION._bubbleTimer = null;
  }
  if (GAME.state.gameStarted && !GAME.state.gameOver && window.matchMedia('(pointer: fine)').matches) {
    document.getElementById('gameCanvas').requestPointerLock();
  }
}

function openPlanPanel() {
  document.exitPointerLock();
  INTERACTION.popupOpen = true;
  _localizePanels();
  const panel = document.getElementById('plan-panel');
  panel.classList.remove('hidden');

  // Clone to drop old listeners, then re-query fresh nodes
  panel.querySelectorAll('.plan-check').forEach(c => {
    c.parentNode.replaceChild(c.cloneNode(true), c);
  });
  const freshChecks = panel.querySelectorAll('.plan-check');

  const updateProgress = () => {
    const done = [...freshChecks].filter(c => c.checked).length;
    document.getElementById('plan-progress-text').textContent = `${done} / ${freshChecks.length} ${t('itemsComplete')}`;
    document.getElementById('plan-btn-sign').disabled = done < freshChecks.length;
  };
  freshChecks.forEach(c => c.addEventListener('change', updateProgress));
  updateProgress();

  document.getElementById('plan-btn-sign').onclick = () => {
    LIFT_STATE.planWritten = true;

    // 작업계획서 매개변수 — 사용자 입력값 사용 (운전원 거부권 분기에서 사용)
    const loadEl   = document.getElementById('plan-weight');
    const swlEl    = document.getElementById('plan-sling-swl');
    const angleEl  = document.getElementById('plan-sling-angle');
    const linesEl  = document.getElementById('plan-sling-lines');
    GAME.state.workPlans = GAME.state.workPlans || {};
    GAME.state.workPlans.lifting = {
      params: {
        load_ton:      loadEl  ? parseFloat(loadEl.value)  || 3.0 : 3.0,
        sling_swl_ton: swlEl   ? parseFloat(swlEl.value)   || 3.0 : 3.0,
        angle_deg:     angleEl ? parseFloat(angleEl.value) || 58  : 58,
        lines:         linesEl ? parseInt(linesEl.value, 10) || 2 : 2,
      },
      signedAt: new Date().toLocaleTimeString('ko-KR'),
      signedBy: GAME.state.playerName || '작업반장',
    };

    GAME.state.phase = getCurrentPhase();
    updateHUD();
    showActionNotif(t('notifPlanDone'), 3500);
    _showPhasePopup(2, PHASE_NAMES[2][currentLang] || PHASE_NAMES[2].ko);
    _closePanel('plan-panel');
  };
  document.getElementById('plan-btn-cancel').onclick = () => _closePanel('plan-panel');
}

// ── Phase 2: Safety Panel ─────────────────────────────────────
function openSafetyPanel() {
  document.exitPointerLock();
  INTERACTION.popupOpen = true;
  _localizePanels();
  const panel = document.getElementById('safety-panel');
  panel.classList.remove('hidden');

  // Reset result + confirm button visibility
  document.getElementById('safety-result').classList.add('hidden');
  document.getElementById('safety-btn-confirm').classList.add('hidden');

  document.getElementById('safety-btn-calc').onclick = () => {
    const W        = 3.0;  // ton
    const alpha    = 58;   // degrees
    const betaRad  = (alpha / 2) * Math.PI / 180;
    const K        = 1 / Math.cos(betaRad);
    const lines    = 2;
    const slingSwl = 3.0;  // ton (기본값)
    const Ts       = (W * K) / lines;
    const sr       = Ts / slingSwl;

    document.getElementById('sc-k').textContent   = K.toFixed(3);
    document.getElementById('sc-swl').textContent = slingSwl.toFixed(1) + ' ton';
    document.getElementById('sc-ts').textContent  = Ts.toFixed(3) + ' ton';
    document.getElementById('sc-sr').textContent  = (sr * 100).toFixed(1) + '%';

    const resultEl = document.getElementById('safety-result');
    resultEl.classList.remove('hidden', 'ok', 'ng');

    if (sr <= 1.0) {
      resultEl.classList.add('ok');
      const safeMsg = { ko: '✅ 안전 — 사용률 ', en: '✅ Safe — Usage ratio ', vi: '✅ An toàn — Tỷ lệ tải ', ar: '✅ آمن — نسبة التحميل ' };
      const safeRef = { ko: '% (기준: 100% 이하)', en: '% (limit: ≤100%)', vi: '% (giới hạn: ≤100%)', ar: '% (الحد: ≤100%)' };
      resultEl.textContent = (safeMsg[currentLang] || safeMsg.ko) + (sr * 100).toFixed(1) + (safeRef[currentLang] || safeRef.ko);
      document.getElementById('safety-btn-confirm').classList.remove('hidden');
    } else {
      resultEl.classList.add('ng');
      const ngMsg = { ko: '❌ 위험 — 슬링 규격 상향 필요', en: '❌ Unsafe — Upgrade sling rating', vi: '❌ Không an toàn — Nâng cấp dây đai', ar: '❌ غير آمن — يجب ترقية معدل الحبل' };
      resultEl.textContent = ngMsg[currentLang] || ngMsg.ko;
    }
  };

  document.getElementById('safety-btn-confirm').onclick = () => {
    LIFT_STATE.safetyChecked = true;
    GAME.state.phase = getCurrentPhase();
    updateHUD();
    showActionNotif(t('notifSafetyDone'), 3500);
    _showPhasePopup(3, PHASE_NAMES[3][currentLang] || PHASE_NAMES[3].ko);
    _closePanel('safety-panel');
  };
  document.getElementById('safety-btn-cancel').onclick = () => _closePanel('safety-panel');
}

// ── Phase 3: Equipment Panel ──────────────────────────────────
function openEquipmentPanel() {
  document.exitPointerLock();
  INTERACTION.popupOpen = true;
  _localizePanels();
  const panel = document.getElementById('equipment-panel');
  panel.classList.remove('hidden');

  // Reset state indicators
  ['eq-outrigger', 'eq-level', 'eq-overload'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove('done');
      const icon = el.querySelector('.eq-icon');
      if (icon) icon.textContent = '⬜';
      el.querySelector('.eq-status').textContent = t('statusWaiting');
    }
  });
  document.getElementById('level-indicator').classList.add('hidden');
  document.getElementById('overload-tester').classList.add('hidden');
  document.getElementById('equipment-btn-confirm').disabled = true;

  let outriggerDone = false;
  let levelDone     = false;
  let overloadDone  = false;

  const markStep = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('done');
    el.querySelector('.eq-icon').textContent = '✅';
    el.querySelector('.eq-status').textContent = t('statusDone');
  };

  const updateEquipment = () => {
    document.getElementById('equipment-btn-confirm').disabled = !(outriggerDone && levelDone && overloadDone);
  };

  _animateOutriggers(() => {
    markStep('eq-outrigger');
    outriggerDone = true;
    document.getElementById('level-indicator').classList.remove('hidden');
    _startBubbleLevel(() => {
      markStep('eq-level');
      levelDone = true;
      document.getElementById('level-indicator').classList.add('hidden');
      document.getElementById('overload-tester').classList.remove('hidden');
      _startOverloadTest(() => {
        markStep('eq-overload');
        overloadDone = true;
        updateEquipment();
      });
      updateEquipment();
    });
    updateEquipment();
  });

  document.getElementById('equipment-btn-confirm').onclick = () => {
    LIFT_STATE.outriggerExtended = true;
    GAME.state.phase = getCurrentPhase();
    updateHUD();
    showActionNotif(t('notifEquipDone'), 3500);
    _showPhasePopup(4, PHASE_NAMES[4][currentLang] || PHASE_NAMES[4].ko);
    _closePanel('equipment-panel');
  };
  document.getElementById('equipment-btn-cancel').onclick = () => _closePanel('equipment-panel');
}

// ── Bubble level mini-game ────────────────────────────────────
// 버블을 ▲▼◀▶ 버튼으로 중앙(허용범위) 안으로 이동시켜야 확인 가능.
function _startBubbleLevel(onComplete) {
  const bubble  = document.getElementById('bubble-dot');
  const confirm = document.getElementById('level-confirm-btn');
  if (!bubble || !confirm) { onComplete(); return; }

  // 이전 인스턴스 타이머가 살아있다면 정리
  if (INTERACTION._bubbleTimer) {
    clearInterval(INTERACTION._bubbleTimer);
    INTERACTION._bubbleTimer = null;
  }

  // 시작 위치: 가장자리 근처 무작위 (허용범위 밖)
  const startAngle = Math.random() * Math.PI * 2;
  const startR     = 36 + Math.random() * 8;
  let dx = Math.cos(startAngle) * startR;
  let dy = Math.sin(startAngle) * startR;
  const TOL = 12;           // 허용 반경 (px)
  const STEP = 4;           // 한 번 클릭당 이동량
  const DRIFT = 0.55;       // 매 프레임 미세 표류

  const render = () => {
    bubble.style.left = `calc(50% + ${dx}px)`;
    bubble.style.top  = `calc(50% + ${dy}px)`;
    const inTol = Math.hypot(dx, dy) <= TOL;
    bubble.classList.toggle('centered', inTol);
    confirm.disabled = !inTol;
  };

  // 약한 표류 — 너무 쉽게 가만히 있지 않게
  INTERACTION._bubbleTimer = setInterval(() => {
    dx += (Math.random() - 0.5) * DRIFT;
    dy += (Math.random() - 0.5) * DRIFT;
    // 컨테이너 안에 가두기
    const r = Math.hypot(dx, dy);
    const MAX = 48;
    if (r > MAX) { dx *= MAX / r; dy *= MAX / r; }
    render();
  }, 120);

  const nudge = (dir) => {
    if (dir === 'up')    dy -= STEP;
    if (dir === 'down')  dy += STEP;
    if (dir === 'left')  dx -= STEP;
    if (dir === 'right') dx += STEP;
    render();
  };

  const nudgeBtns = document.querySelectorAll('#level-indicator .bubble-nudge');
  const onNudgeClick = (e) => {
    const btn = e.currentTarget;
    nudge(btn.dataset.dir);
  };
  nudgeBtns.forEach(b => {
    b.replaceWith(b.cloneNode(true)); // drop old listeners
  });
  document.querySelectorAll('#level-indicator .bubble-nudge').forEach(b => {
    b.addEventListener('click', onNudgeClick);
  });

  confirm.onclick = () => {
    if (confirm.disabled) return;
    if (INTERACTION._bubbleTimer) {
      clearInterval(INTERACTION._bubbleTimer);
      INTERACTION._bubbleTimer = null;
    }
    onComplete();
  };

  render();
}

// ── Overload limiter test ─────────────────────────────────────
// 테스트 부하 인가 → 80% 경고 → 105% 알람 → 정상작동 확인.
function _startOverloadTest(onComplete) {
  const testBtn   = document.getElementById('oll-test-btn');
  const confBtn   = document.getElementById('oll-confirm-btn');
  const fillEl    = document.getElementById('oll-fill');
  const currEl    = document.getElementById('oll-current');
  const statusEl  = document.getElementById('oll-status');
  if (!testBtn || !confBtn || !fillEl || !currEl || !statusEl) { onComplete(); return; }

  const RATED = 5.0;    // ton
  const PEAK  = 1.06;   // 정격의 106%까지 시험
  let running = false;

  // reset
  testBtn.classList.remove('hidden');
  testBtn.disabled = false;
  confBtn.classList.add('hidden');
  confBtn.disabled = true;
  fillEl.style.width = '0%';
  currEl.textContent = '0.0 ton';
  statusEl.className = 'oll-status';
  statusEl.textContent = t('ollStatusIdle');

  testBtn.onclick = () => {
    if (running) return;
    running = true;
    testBtn.disabled = true;
    let pct = 0;
    const step = () => {
      pct += 0.014;  // ~ 4초에 105% 도달
      if (pct >= PEAK) pct = PEAK;
      const load = RATED * pct;
      fillEl.style.width = `${Math.min(pct, 1) * 100}%`;
      currEl.textContent = load.toFixed(2) + ' ton';

      if (pct >= 1.0) {
        statusEl.className = 'oll-status alarm';
        statusEl.textContent = t('ollStatusAlarm');
      } else if (pct >= 0.8) {
        statusEl.className = 'oll-status warn';
        statusEl.textContent = t('ollStatusWarn');
      }

      if (pct < PEAK) {
        requestAnimationFrame(step);
      } else {
        // 알람 작동 확인 → 확인 버튼 노출
        testBtn.classList.add('hidden');
        confBtn.classList.remove('hidden');
        confBtn.disabled = false;
      }
    };
    requestAnimationFrame(step);
  };

  confBtn.onclick = () => {
    if (confBtn.disabled) return;
    confBtn.disabled = true;
    onComplete();
  };
}

function _animateOutriggers(onComplete) {
  const outriggers = GAME._outriggers;
  if (!outriggers || outriggers.length === 0) { onComplete(); return; }

  let done = 0;
  outriggers.forEach((o, i) => {
    setTimeout(() => {
      let t = 0;
      (function ext() {
        t += 0.05;
        if (o.arm) o.arm.scale.z = Math.min(1 + t * 1.5, 2.5);
        if (o.pad) o.pad.visible = true;
        if (t < 1) requestAnimationFrame(ext);
        else {
          done++;
          if (done === outriggers.length) onComplete();
        }
      })();
    }, i * 200);
  });
}

// ── Spec sheet popup ──────────────────────────────────────────
function openSpecPopup() {
  if (!LIFT_STATE.outriggerExtended) {
    showActionNotif(t('notifEquipFirst'));
    return;
  }
  LIFT_STATE.specChecked = true;
  INTERACTION.specOpen   = true;
  INTERACTION.popupOpen  = true;
  if (document.pointerLockElement) document.exitPointerLock();

  // 사양서 오브젝트를 인터랙터블에서 제거 (한 번만 읽기)
  const specItem = GAME.interactables.find(i => i.docId === 'crane_spec');
  if (specItem && specItem.mesh && specItem.mesh.material) {
    specItem.mesh.material.opacity     = 0.35;
    specItem.mesh.material.transparent = true;
  }
  GAME.interactables = GAME.interactables.filter(i => i.docId !== 'crane_spec');
  INTERACTION.currentTarget = null;
  hideInteractPrompt();

  document.getElementById('spec-popup').classList.remove('hidden');
}

function closeSpecPopup() {
  INTERACTION.specOpen  = false;
  INTERACTION.popupOpen = false;
  document.getElementById('spec-popup').classList.add('hidden');
  if (GAME.state.gameStarted && !GAME.state.gameOver && window.matchMedia('(pointer: fine)').matches) {
    GAME.renderer.domElement.requestPointerLock();
  }
}

// ── Crane cab ─────────────────────────────────────────────────
// 운전원 거부권: 안전 점검 미완료 시 탑승 거부 + 운전원 팝업
const _OPERATOR_CHECKLIST = [
  { key: 'planWritten',       labelKey: 'opItemPlanWritten' },
  { key: 'safetyChecked',     labelKey: 'opItemSafetyChecked' },
  { key: 'outriggerExtended', labelKey: 'opItemOutriggerExtended' },
  { key: 'slingInspected',    labelKey: 'opItemSlingInspected' },
  { key: 'pinSecured',        labelKey: 'opItemPinSecured' },
  { key: 'angleMeasured',     labelKey: 'opItemAngleMeasured' },
  { key: 'specChecked',       labelKey: 'opItemSpecChecked' },
  { key: 'signalAssigned',    labelKey: 'opItemSignalAssigned' },
  { key: 'workerEvacuated',   labelKey: 'opItemWorkerEvacuated' },
];

function _getMissingSafetyItems() {
  const missing = _OPERATOR_CHECKLIST.filter(item => !LIFT_STATE[item.key]);

  // 계획서 매개변수 위반 — sling SWL 대비 실제 사용률(sr) 100% 초과 시 거부
  const plan = (GAME.state.workPlans || {}).lifting;
  if (plan && plan.params) {
    const p = plan.params;
    const betaRad = (p.angle_deg / 2) * Math.PI / 180;
    const K   = 1 / Math.cos(betaRad);
    const Ts  = (p.load_ton * K) / (p.lines || 2);
    const sr  = Ts / p.sling_swl_ton;
    if (sr > 1.0) {
      missing.push({
        key:      'planOverload',
        labelKey: null,
        custom:   true,
        textKo:   `계획 슬링 SWL ${p.sling_swl_ton}ton 부족 (사용률 ${(sr*100).toFixed(0)}% 초과)`,
        textEn:   `Plan sling SWL ${p.sling_swl_ton}t insufficient (usage ${(sr*100).toFixed(0)}% > 100%)`,
        textVi:   `Tải SWL ${p.sling_swl_ton}t không đủ (${(sr*100).toFixed(0)}% > 100%)`,
        textAr:   `سعة الحبل ${p.sling_swl_ton}t غير كافية (${(sr*100).toFixed(0)}%)`,
      });
    }
    // 각도 60° 이상이면 K 증가 — 거부
    if (p.angle_deg > 90) {
      missing.push({
        key:      'planAngle',
        labelKey: null,
        custom:   true,
        textKo:   `계획 슬링 각도 ${p.angle_deg}° 과대 (60° 이내 권장)`,
        textEn:   `Plan sling angle ${p.angle_deg}° too wide (≤60° recommended)`,
        textVi:   `Góc dây cẩu ${p.angle_deg}° quá rộng (≤60° khuyến nghị)`,
        textAr:   `زاوية الحبل ${p.angle_deg}° واسعة جداً (≤60° مستحسن)`,
      });
    }
  } else {
    // 계획서 미작성 자체가 거부 사유 (작업계획서 별표 3 위반)
    missing.push({
      key:      'planMissing',
      labelKey: null,
      custom:   true,
      textKo:   '작업계획서 미서명 — 산안법 §38 위반',
      textEn:   'Work plan not signed — OSH §38 violation',
      textVi:   'Kế hoạch chưa ký — vi phạm §38',
      textAr:   'خطة العمل غير موقعة — مخالفة §38',
    });
  }

  return missing;
}

function showOperatorRefusal(missing) {
  if (document.pointerLockElement) document.exitPointerLock();
  INTERACTION.popupOpen = true;

  document.getElementById('op-refusal-name').textContent  = t('opRefusalName');
  document.getElementById('op-refusal-role').textContent  = t('opRefusalRole');
  document.getElementById('op-refusal-quote').textContent = t('opRefusalQuote');
  document.getElementById('op-refusal-intro').textContent = t('opRefusalIntro');
  document.getElementById('op-refusal-close').textContent = t('opRefusalClose');

  // 운전원 거부 멘트 TTS — 사용자에게 청각 피드백
  _speakRefusal(t('opRefusalQuote'));

  const list = document.getElementById('op-refusal-list');
  list.innerHTML = '';
  missing.forEach(item => {
    const li = document.createElement('li');
    if (item.custom) {
      const langKey = 'text' + (currentLang || 'ko').charAt(0).toUpperCase() + (currentLang || 'ko').slice(1);
      li.textContent = item[langKey] || item.textKo || '계획서 위반';
      li.style.color = '#FCA5A5';
      li.style.fontWeight = '600';
    } else {
      li.textContent = t(item.labelKey);
    }
    list.appendChild(li);
  });

  document.getElementById('operator-refusal-popup').classList.remove('hidden');
}

function closeOperatorRefusal() {
  INTERACTION.popupOpen = false;
  document.getElementById('operator-refusal-popup').classList.add('hidden');
  if (GAME.state.gameStarted && !GAME.state.gameOver && window.matchMedia('(pointer: fine)').matches) {
    GAME.renderer.domElement.requestPointerLock();
  }
}

function boardCrane() {
  if (GAME.state.craneBoarded || GAME.state.liftStarted) return;

  const missing = _getMissingSafetyItems();
  if (missing.length > 0) {
    showOperatorRefusal(missing);
    return;
  }

  GAME.state.craneBoarded = true;
  INTERACTION.popupOpen   = true;
  if (document.pointerLockElement) document.exitPointerLock();

  GAME._prevCamMode  = PLAYER.camMode;
  GAME._prevWorldPos = PLAYER.worldPos.clone();

  // 운전석 시점으로 카메라 이동
  PLAYER.camMode = 'fixed';
  GAME.camera.position.set(14, 1.45, -5.6);
  GAME.camera.lookAt(14, 1.3, -4.0);

  document.getElementById('crane-cab-overlay').classList.remove('hidden');
  _setOperatorInfo('crane-operator-info', 'lifting', '계획서 매개변수 따라 인양 — 안전 항목 미충족 시 운전원이 거부합니다');
  hideInteractPrompt();
  if (typeof SOUND !== 'undefined') SOUND.craneFadeIn();
}

function exitCraneCab() {
  if (!GAME.state.craneBoarded) return;
  GAME.state.craneBoarded = false;
  INTERACTION.popupOpen   = false;

  PLAYER.camMode = GAME._prevCamMode || 'fps';
  if (GAME._prevWorldPos) PLAYER.worldPos.copy(GAME._prevWorldPos);
  GAME.camera.position.set(PLAYER.worldPos.x, 1.7, PLAYER.worldPos.z);

  document.getElementById('crane-cab-overlay').classList.add('hidden');
  if (typeof SOUND !== 'undefined') SOUND.craneFadeOut();

  if (!GAME.state.gameOver && window.matchMedia('(pointer: fine)').matches) {
    GAME.renderer.domElement.requestPointerLock();
  }
  if (typeof _updateCamBtns === 'function') _updateCamBtns();
}

// ── Lift animation (called from evaluateLift on success) ──────
// 5층 목표: 매 사이클마다 한 층 인양. 사이클당 빔 1개.
function animateLift() {
  const beam = GAME.liftBeam;
  if (!beam) { showCompletePanel(); return; }

  // 현재 사이클(완료된 층 수)에 따라 목표 높이 조정
  const floor = GAME.state.completedFloors || 0;
  const baseTarget = 5.5;       // 1층 거치 높이
  const floorRise  = 3.3;       // 층간 높이
  const target = baseTarget + floor * floorRise;
  const speed  = 2.2;

  // 빔 흔들림 (펜듈럼) — 양중 중 자연스러운 자재 진동.
  // 각도 ~3° (0.05 rad) · 주기 2.4s · 상승할수록 감쇠.
  const swayBaseX = beam.position.x;
  const swayBaseZ = beam.position.z;
  const swayBaseRotZ = beam.rotation.z;
  const swayBaseRotX = beam.rotation.x;
  const swayStart = performance.now();
  const swayAmp = 0.06;             // ±6cm
  const swayFreq = 2.4;             // rad/s (주기 ≈ 2.6s)

  (function rise() {
    if (GAME.state.gameOver) return;
    const dy = speed * 0.016;

    beam.position.y += dy;

    // 흔들림 적용 — 상승 진행률에 따라 감쇠 (안정화)
    const progress = Math.min(1, (beam.position.y - 1) / Math.max(1, target - 1));
    const decay = 1 - progress * 0.6;
    const t = (performance.now() - swayStart) / 1000;
    const sx = Math.sin(t * swayFreq) * swayAmp * decay;
    const sz = Math.cos(t * swayFreq * 0.83) * swayAmp * decay;
    beam.position.x = swayBaseX + sx;
    beam.position.z = swayBaseZ + sz;
    beam.rotation.z = swayBaseRotZ - sx * 0.6;   // 흔들림에 따라 살짝 기울임
    beam.rotation.x = swayBaseRotX + sz * 0.6;

    const h = GAME._craneHook;
    if (h) {
      if (h.block) {
        h.block.position.y += dy;
        h.block.position.x = swayBaseX + sx * 0.7;
        h.block.position.z = swayBaseZ + sz * 0.7;
      }
      if (h.curve) {
        h.curve.position.y += dy;
        h.curve.position.x = swayBaseX + sx * 0.7;
        h.curve.position.z = swayBaseZ + sz * 0.7;
      }
      if (h.hoistCable) {
        const pos = h.hoistCable.geometry.attributes.position;
        pos.setY(1, pos.getY(1) + dy);
        pos.needsUpdate = true;
      }
    }

    const slArr = GAME._slingLines;
    if (slArr) slArr.forEach(sl => {
      sl.position.y += dy;
      sl.position.x = swayBaseX + sx * 0.85;
      sl.position.z = swayBaseZ + sz * 0.85;
    });

    if (beam.position.y < target) {
      requestAnimationFrame(rise);
    } else {
      // 거치 직전 흔들림 0 으로 복귀
      beam.position.x = swayBaseX;
      beam.position.z = swayBaseZ;
      beam.rotation.z = swayBaseRotZ;
      beam.rotation.x = swayBaseRotX;
      _onLiftCycleComplete();
    }
  })();
}

function _onLiftCycleComplete() {
  // 빔을 현재 층 위치에 영구 고정
  if (GAME.liftBeam) {
    const floor = GAME.state.completedFloors || 0;
    GAME.liftBeam.position.y = 5.5 + floor * 3.3;
    GAME._placedBeams = GAME._placedBeams || [];
    GAME._placedBeams.push(GAME.liftBeam);
    GAME.liftBeam = null;
  }
  if (GAME._liftTarget) {
    GAME.scene.remove(GAME._liftTarget);
    GAME._liftTarget = null;
  }

  GAME.state.completedFloors = (GAME.state.completedFloors || 0) + 1;

  // 건물 단계 한 칸 전진 (1F frame부터)
  if (typeof advanceBuildingStage === 'function') advanceBuildingStage();

  if (GAME.state.completedFloors >= (GAME.state.targetFloors || 5)) {
    // 5층 완료 → 외벽·지붕 자동 + 엔딩
    setTimeout(() => {
      if (typeof advanceBuildingStage === 'function') advanceBuildingStage(); // walls
      setTimeout(() => {
        if (typeof advanceBuildingStage === 'function') advanceBuildingStage(); // roof
        setTimeout(showCompletePanel, 1200);
      }, 1400);
    }, 1200);
  } else {
    // RC sub-step 흐름: 양중 완료 → 타설·양생 → 다음 층 거푸집·철근 → 다음 양중
    const useSubSteps = (typeof startPourCure === 'function') && (typeof startFormworkRebar === 'function');
    if (useSubSteps) {
      const curFloor  = GAME.state.completedFloors;
      const nextFloor = curFloor + 1;
      // rcLoop state 동기화 (rc_loop.js 가 HUD 표시 담당)
      GAME.state.rcLoop = GAME.state.rcLoop || { floor: 1, stepIdx: 1, completed: false };
      GAME.state.rcLoop.floor = curFloor;
      GAME.state.rcLoop.stepIdx = 2; // pour_cure
      if (typeof initRcLoop === 'function') { try { initRcLoop(); } catch (e) {} }

      setTimeout(() => {
        // 현재 층 타설·양생
        startPourCure(curFloor);
        // pour_cure onComplete → advanceRcStep → 다음 sub-step (formwork_rebar of nextFloor)
        // formwork onComplete → advanceRcStep → 다음 lift → _startNextLiftCycle 으로 복귀
        GAME._rcAfterFormwork = () => {
          GAME.state.rcLoop.floor   = nextFloor;
          GAME.state.rcLoop.stepIdx = 1;  // lift
          _startNextLiftCycle();
        };
      }, 1500);
    } else {
      // 다음 사이클 준비 (기존 경로)
      setTimeout(_startNextLiftCycle, 1500);
    }
  }
}

function _startNextLiftCycle() {
  // 1) 럭잉 체크 항목 리셋
  LIFT_STATE.slingInspected = false;
  LIFT_STATE.pinSecured     = false;
  LIFT_STATE.angleMeasured  = false;
  GAME.state.liftStarted    = false;

  // 2) 운전석에서 자동 하차
  if (GAME.state.craneBoarded && typeof exitCraneCab === 'function') exitCraneCab();

  // 3) 새 빔 + 슬링 재생성
  _respawnBeam();

  // 4) 훅·케이블 원위치
  const h = GAME._craneHook;
  if (h) {
    if (h.block) h.block.position.set(-2, 0.88, -8);
    if (h.curve) h.curve.position.set(-2, 0.44, -8);
    if (h.hoistCable) {
      const pos = h.hoistCable.geometry.attributes.position;
      pos.setY(0, 22.58);
      pos.setY(1, 0.88);
      pos.needsUpdate = true;
    }
  }
  if (GAME._slingLines) GAME._slingLines.forEach(sl => { sl.position.y = 0; });

  // 5) 럭잉 인터랙터블 복구 (밝기 + 인터랙트 가능)
  const items = GAME._riggingItems;
  if (items) {
    Object.values(items).forEach(it => {
      if (it.mesh && it.mesh.material) {
        it.mesh.material.opacity = 1;
        it.mesh.material.transparent = false;
      }
      // 중복 등록 방지
      const exists = GAME.interactables.some(x => x.actionId === it.actionId);
      if (!exists) {
        GAME.interactables.push({
          mesh: it.mesh, type: 'action', actionId: it.actionId, label: it.label, phase: it.phase,
        });
      }
    });
  }

  // 6) Phase 4 로 되돌리고 안내
  GAME.state.phase = 4;
  if (typeof updateHUD === 'function') updateHUD();
  if (typeof showActionNotif === 'function') {
    const done = GAME.state.completedFloors;
    const tot  = GAME.state.targetFloors || 5;
    showActionNotif(`✅ ${done}/${tot}층 거치 — ${t('nextFloorReady')}`, 4000);
  }
}

function _respawnBeam() {
  const beamMat  = new THREE.MeshLambertMaterial({ color: 0xA8A49C });
  const plateMat = new THREE.MeshLambertMaterial({ color: 0x585450 });

  const beam = new THREE.Mesh(new THREE.BoxGeometry(7, 0.55, 0.55), beamMat);
  beam.position.set(-2, 0.28, -8);
  beam.castShadow = true;
  beam.receiveShadow = true;
  GAME.scene.add(beam);
  GAME.liftBeam = beam;

  [-3.55, 3.55].forEach(dx => {
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.65, 0.65), plateMat);
    plate.position.set(-2 + dx, 0.28, -8);
    GAME.scene.add(plate);
  });
}

// ── 토공사 — 작업계획서 패널 ──────────────────────────────
function openExcavPlanPanel() {
  document.exitPointerLock();
  INTERACTION.popupOpen = true;
  const panel = document.getElementById('excav-plan-panel');
  if (!panel) return;
  panel.classList.remove('hidden');

  document.getElementById('excav-plan-sign').onclick = () => {
    const depth     = parseFloat(document.getElementById('excav-depth').value);
    const slope     = parseFloat(document.getElementById('excav-slope').value);
    const shoring   = document.getElementById('excav-shoring').value;
    const underground = document.getElementById('excav-underground').checked;

    EXCAV_STATE.planDepth       = depth;
    EXCAV_STATE.planSlope       = slope;
    EXCAV_STATE.planShoring     = shoring;
    EXCAV_STATE.planUnderground = underground;
    EXCAV_STATE.planWritten     = true;

    // 작업계획서 확정 — 시점·내용 저장 (이후 실제 작업의 근거)
    GAME.state.workPlans = GAME.state.workPlans || {};
    GAME.state.workPlans.excavation = {
      params: { depth, slope, shoring, underground },
      signedAt: new Date().toLocaleTimeString('ko-KR'),
      signedBy: GAME.state.playerName || '작업반장',
    };

    // 운전석 게이지에 반영
    const cd = document.getElementById('excav-cab-depth');
    if (cd) cd.textContent = depth.toFixed(1) + ' m';
    const cs = document.getElementById('excav-cab-shoring');
    if (cs) cs.textContent = ({ none:'미설치', h_pile:'H-pile', sheet_pile:'시트파일', earth_anchor:'어스앵커' })[shoring] || shoring;

    GAME.state.phase = getCurrentPhase();
    updateHUD();
    showActionNotif(_notif('excav_plan_done'), 3500);
    _closePanel('excav-plan-panel');

    // Phase 2 자동 진입 → 탐지기 활성화
    if (typeof startSurvey === 'function') startSurvey();
  };
  document.getElementById('excav-plan-cancel').onclick = () => _closePanel('excav-plan-panel');
}

// ── 토공사 — 굴착기 운전석 ────────────────────────────────
function _getExcavRefusal() {
  if (typeof EXCAV_STATE === 'undefined') return [];
  const missing = [];
  if (!EXCAV_STATE.signalAssigned)    missing.push({ custom: true, textKo: '신호수 미배치', textEn: 'No signal person', textVi: 'Chưa bố trí người ra hiệu', textAr: 'لا يوجد عامل إشارة' });
  if (!EXCAV_STATE.surveyDone)        missing.push({ custom: true, textKo: '매설물 사전조사 미실시', textEn: 'Underground utilities not surveyed', textVi: 'Chưa khảo sát ngầm', textAr: 'لم يتم مسح المرافق' });
  if (!EXCAV_STATE.shoringInstalled && (EXCAV_STATE.planDepth || 0) >= 1.5) {
    missing.push({ custom: true, textKo: `깊이 ${EXCAV_STATE.planDepth}m + 흙막이 미설치`, textEn: `Depth ${EXCAV_STATE.planDepth}m without shoring`, textVi: `Sâu ${EXCAV_STATE.planDepth}m không chống vách`, textAr: `عمق ${EXCAV_STATE.planDepth}م بلا دعم` });
  }
  if (!EXCAV_STATE.railingInstalled && (EXCAV_STATE.planDepth || 0) >= 2.0) {
    missing.push({ custom: true, textKo: `깊이 ${EXCAV_STATE.planDepth}m + 안전난간 미설치`, textEn: `Depth ${EXCAV_STATE.planDepth}m without edge guardrail`, textVi: `Sâu ${EXCAV_STATE.planDepth}m không lan can`, textAr: `عمق ${EXCAV_STATE.planDepth}م بلا حاجز` });
  }
  // 계획 구배 위반
  if (EXCAV_STATE.planSlope !== null && EXCAV_STATE.planSlope < 0.5 && (EXCAV_STATE.planDepth || 0) >= 2.0) {
    missing.push({ custom: true, textKo: `계획 구배 1:${EXCAV_STATE.planSlope} — 과경사 (KOSHA C-39)`,
      textEn: `Plan slope 1:${EXCAV_STATE.planSlope} too steep (KOSHA C-39)`,
      textVi: `Độ dốc 1:${EXCAV_STATE.planSlope} quá đứng`,
      textAr: `الميل 1:${EXCAV_STATE.planSlope} حاد جداً` });
  }
  return missing;
}

function boardExcavator() {
  if (GAME.state.craneBoarded || GAME.state.liftStarted) return;
  if (typeof EXCAV_STATE === 'undefined') return;

  const missing = _getExcavRefusal();
  if (missing.length > 0) {
    showOperatorRefusal(missing);
    return;
  }
  GAME.state.craneBoarded = true;
  INTERACTION.popupOpen   = true;
  if (document.pointerLockElement) document.exitPointerLock();

  GAME._prevCamMode  = PLAYER.camMode;
  GAME._prevWorldPos = PLAYER.worldPos.clone();

  PLAYER.camMode = 'fixed';
  GAME.camera.position.set(-13, 3.0, -8);
  GAME.camera.lookAt(0, 1, -8);

  document.getElementById('excav-cab-overlay').classList.remove('hidden');
  hideInteractPrompt();
}

function _setOperatorInfo(panelId, trade, taskLabel) {
  const el = document.getElementById(panelId);
  if (!el) return;
  const eligible = (GAME.npcs || []).filter(n => n.trade === trade);
  let opName = '최기사', opExp = 15, opSkill = 0.8;
  if (eligible.length) {
    eligible.sort((a, b) => b.skill - a.skill);
    opName = eligible[0].name;
    opExp = eligible[0].experience;
    opSkill = eligible[0].skill;
  }
  // 현재 시나리오의 작업계획서 확정 내역
  const plan = (GAME.state.workPlans || {})[GAME.scenarioId];
  let planLine = '';
  if (plan) {
    const paramLines = Object.entries(plan.params)
      .map(([k, v]) => `${k}: <b>${v}</b>`).join(' · ');
    planLine = `<div style="margin-top:6px;padding:6px 8px;background:rgba(0,255,170,0.08);border-left:3px solid #00FFAA;border-radius:4px;font-size:11px;color:#E8EEF6;">
      📋 <b>작업계획서</b> (${plan.signedAt} ${plan.signedBy} 확정)<br>${paramLines}<br>
      <span style="color:#A8B0BC;font-size:10px;">→ 운전원은 이 계획에 따라 작업합니다. 미준수 시 거부합니다.</span>
    </div>`;
  } else {
    planLine = `<div style="margin-top:6px;padding:6px 8px;background:rgba(239,68,68,0.12);border-left:3px solid #EF4444;border-radius:4px;font-size:11px;color:#FCA5A5;">
      ⚠ <b>작업계획서 미작성</b> — 운전원이 임의 판단 위험 ↑↑
    </div>`;
  }
  el.innerHTML = `👷 운전원: <b>${opName}</b> · 경력 ${opExp}년 · 스킬 ${(opSkill*100).toFixed(0)}%<br>📋 ${taskLabel}${planLine}`;
}

// ── 기초공사 — 작업계획서 ──────────────────────────────────
function openFoundPlanPanel() {
  document.exitPointerLock();
  INTERACTION.popupOpen = true;
  const panel = document.getElementById('found-plan-panel');
  if (!panel) return;
  panel.classList.remove('hidden');

  document.getElementById('found-plan-sign').onclick = () => {
    FOUND_STATE.planMatArea      = parseFloat(document.getElementById('found-area').value);
    FOUND_STATE.planRebarSpacing = parseFloat(document.getElementById('found-rebar').value);
    FOUND_STATE.planConcStrength = parseFloat(document.getElementById('found-conc').value);
    FOUND_STATE.planShoringSpace = parseFloat(document.getElementById('found-shoring').value);
    FOUND_STATE.planWritten = true;

    GAME.state.workPlans = GAME.state.workPlans || {};
    GAME.state.workPlans.foundation = {
      params: {
        matArea: FOUND_STATE.planMatArea,
        rebarSpacing: FOUND_STATE.planRebarSpacing,
        concStrength: FOUND_STATE.planConcStrength,
        shoringSpace: FOUND_STATE.planShoringSpace,
      },
      signedAt: new Date().toLocaleTimeString('ko-KR'),
      signedBy: GAME.state.playerName || '작업반장',
    };

    GAME.state.phase = getCurrentPhase();
    updateHUD();
    showActionNotif(_notif('found_plan_done'), 3500);
    _closePanel('found-plan-panel');
    if (typeof startRebarInspection === 'function') startRebarInspection();
  };
  document.getElementById('found-plan-cancel').onclick = () => _closePanel('found-plan-panel');
}

// ── 외장공사 — 작업계획서 ───────────────────────────────
function openEnvPlanPanel() {
  document.exitPointerLock();
  INTERACTION.popupOpen = true;
  const panel = document.getElementById('env-plan-panel');
  if (!panel) return;
  panel.classList.remove('hidden');

  document.getElementById('env-plan-sign').onclick = () => {
    ENV_STATE.planScaffoldType    = document.getElementById('env-scaffold-type').value;
    ENV_STATE.planScaffoldHeight  = parseFloat(document.getElementById('env-scaffold-height').value);
    ENV_STATE.planGuardrailLevels = parseInt(document.getElementById('env-guardrails').value, 10);
    ENV_STATE.planPanelType       = document.getElementById('env-panel-type').value;
    ENV_STATE.planWritten = true;

    GAME.state.workPlans = GAME.state.workPlans || {};
    GAME.state.workPlans.envelope = {
      params: {
        scaffoldType:    ENV_STATE.planScaffoldType,
        scaffoldHeight:  ENV_STATE.planScaffoldHeight,
        guardrailLevels: ENV_STATE.planGuardrailLevels,
        panelType:       ENV_STATE.planPanelType,
      },
      signedAt: new Date().toLocaleTimeString('ko-KR'),
      signedBy: GAME.state.playerName || '작업반장',
    };

    GAME.state.phase = getCurrentPhase();
    updateHUD();
    showActionNotif(_notif('env_plan_done'), 3500);
    _closePanel('env-plan-panel');
    if (typeof startScaffoldInspection === 'function') startScaffoldInspection();
  };
  document.getElementById('env-plan-cancel').onclick = () => _closePanel('env-plan-panel');
}

// ── 외장공사 — 인양 트리거 ─────────────────────────────────
function _getEnvelopeRefusal() {
  if (typeof ENV_STATE === 'undefined') return [];
  const missing = [];
  if (!ENV_STATE.signalAssigned)    missing.push({ custom: true, textKo: '신호수 미배치', textEn: 'No signal person', textVi: 'Chưa bố trí người ra hiệu', textAr: 'لا يوجد عامل إشارة' });
  if (!ENV_STATE.scaffoldInspected) missing.push({ custom: true, textKo: '비계 조립검사 미실시', textEn: 'Scaffold not inspected', textVi: 'Chưa kiểm tra giàn giáo', textAr: 'لم يتم فحص السقالة' });
  if (!ENV_STATE.lifelineInstalled) missing.push({ custom: true, textKo: '안전대 부착설비 미설치', textEn: 'No lifeline anchor', textVi: 'Chưa lắp dây neo', textAr: 'لا يوجد مرساة' });
  // 계획서 위반
  if ((ENV_STATE.planScaffoldHeight || 0) >= 15 && ENV_STATE.planScaffoldType !== 'system') {
    missing.push({ custom: true, textKo: `계획 비계 ${ENV_STATE.planScaffoldHeight}m + 비시스템 비계 — 붕괴 위험`,
      textEn: `Plan scaffold ${ENV_STATE.planScaffoldHeight}m non-system — collapse risk`,
      textVi: `Giàn giáo ${ENV_STATE.planScaffoldHeight}m không phải hệ — rủi ro sập`,
      textAr: `سقالة ${ENV_STATE.planScaffoldHeight}م غير نظامية — خطر الانهيار` });
  }
  if ((ENV_STATE.planGuardrailLevels || 0) < 2) {
    missing.push({ custom: true, textKo: '계획 안전난간 단수 부족 (2단 이상)',
      textEn: 'Plan guardrail levels insufficient (≥2 required)',
      textVi: 'Số tầng lan can không đủ (≥2)',
      textAr: 'مستويات الحاجز غير كافية (≥2)' });
  }
  return missing;
}

function openEnvelopeConsole() {
  if (GAME.state.liftStarted || GAME.state.gameOver) return;
  if (typeof ENV_STATE === 'undefined') return;
  const missing = _getEnvelopeRefusal();
  if (missing.length > 0) {
    showOperatorRefusal(missing);
    return;
  }
  evaluateEnvelope();
}

// ── 설비·마감 — 작업계획서 ──────────────────────────────
function openMepPlanPanel() {
  document.exitPointerLock();
  INTERACTION.popupOpen = true;
  const panel = document.getElementById('mep-plan-panel');
  if (!panel) return;
  panel.classList.remove('hidden');

  document.getElementById('mep-plan-sign').onclick = () => {
    MEP_STATE.planBreaker       = parseInt(document.getElementById('mep-breaker').value, 10);
    MEP_STATE.planPipeDiameter  = parseInt(document.getElementById('mep-pipe').value, 10);
    MEP_STATE.planFinishType    = document.getElementById('mep-finish-type').value;
    MEP_STATE.planLotoProcedure = document.getElementById('mep-loto').checked;
    MEP_STATE.planWritten = true;

    GAME.state.workPlans = GAME.state.workPlans || {};
    GAME.state.workPlans.mep_finish = {
      params: {
        breaker:       MEP_STATE.planBreaker,
        pipeDiameter:  MEP_STATE.planPipeDiameter,
        finishType:    MEP_STATE.planFinishType,
        lotoProcedure: MEP_STATE.planLotoProcedure,
      },
      signedAt: new Date().toLocaleTimeString('ko-KR'),
      signedBy: GAME.state.playerName || '작업반장',
    };

    GAME.state.phase = getCurrentPhase();
    updateHUD();
    showActionNotif(_notif('mep_plan_done'), 3500);
    _closePanel('mep-plan-panel');
    if (typeof startLoto === 'function') startLoto();
  };
  document.getElementById('mep-plan-cancel').onclick = () => _closePanel('mep-plan-panel');
}

// ── 설비·마감 — 준공검사 ──────────────────────────────────
function _getMepRefusal() {
  if (typeof MEP_STATE === 'undefined') return [];
  const missing = [];
  if (!MEP_STATE.extVerified)   missing.push({ custom: true, textKo: '소화기 점검 미실시',     textEn: 'Extinguisher not verified',  textVi: 'Chưa kiểm tra bình chữa cháy', textAr: 'لم يتم فحص الطفاية' });
  if (!MEP_STATE.lotoApplied)   missing.push({ custom: true, textKo: 'LOTO 잠금·표지 미부착', textEn: 'LOTO not applied',           textVi: 'Chưa khóa LOTO',              textAr: 'لم يتم تطبيق LOTO' });
  if (!MEP_STATE.gasChecked)    missing.push({ custom: true, textKo: '가스누설 점검 미실시',   textEn: 'Gas leak not checked',       textVi: 'Chưa kiểm tra rò gas',         textAr: 'لم يتم فحص الغاز' });
  if (!MEP_STATE.ventActivated) missing.push({ custom: true, textKo: '환기·국소배기 미가동',   textEn: 'Ventilation not active',     textVi: 'Chưa bật thông gió',           textAr: 'التهوية غير مفعّلة' });
  // 계획서 위반
  if (MEP_STATE.planBreaker !== null && MEP_STATE.planBreaker < 30) {
    missing.push({ custom: true, textKo: `계획 차단기 ${MEP_STATE.planBreaker}A — 정격 부족 (30A 이상)`,
      textEn: `Plan breaker ${MEP_STATE.planBreaker}A undersized (≥30A)`,
      textVi: `CB ${MEP_STATE.planBreaker}A không đủ (≥30A)`,
      textAr: `قاطع ${MEP_STATE.planBreaker}A غير كافٍ (≥30A)` });
  }
  if (MEP_STATE.planPipeDiameter !== null && MEP_STATE.planPipeDiameter < 15) {
    missing.push({ custom: true, textKo: `계획 배관 직경 ${MEP_STATE.planPipeDiameter}mm — 표준 미달`,
      textEn: `Plan pipe Ø${MEP_STATE.planPipeDiameter}mm below standard`,
      textVi: `Ống Ø${MEP_STATE.planPipeDiameter}mm dưới chuẩn`,
      textAr: `أنبوب Ø${MEP_STATE.planPipeDiameter}مم دون المعيار` });
  }
  return missing;
}

function openFinalInspection() {
  if (GAME.state.liftStarted || GAME.state.gameOver) return;
  if (typeof MEP_STATE === 'undefined') return;
  const missing = _getMepRefusal();
  if (missing.length > 0) {
    showOperatorRefusal(missing);
    return;
  }
  evaluateMepFinish();
}

// ── 기초공사 — 타설 제어반 ────────────────────────────────
function _getPumpRefusal() {
  if (typeof FOUND_STATE === 'undefined') return [];
  const missing = [];
  if (!FOUND_STATE.pourOrderAgreed) missing.push({ custom: true, textKo: '타설 순서 합의 미완료', textEn: 'Pour order not agreed', textVi: 'Chưa thống nhất trình tự đổ', textAr: 'لم يتم الاتفاق على ترتيب الصب' });
  if (!FOUND_STATE.pumpOk)          missing.push({ custom: true, textKo: '펌프카 점검 미실시',    textEn: 'Pump not inspected',     textVi: 'Chưa kiểm tra xe bơm',         textAr: 'لم يتم فحص المضخة' });
  if (!FOUND_STATE.formworkOk)      missing.push({ custom: true, textKo: '거푸집·동바리 점검 미완료', textEn: 'Formwork not inspected', textVi: 'Chưa kiểm tra ván khuôn',  textAr: 'لم يتم فحص القوالب' });
  if (!FOUND_STATE.rebarCapsOk)     missing.push({ custom: true, textKo: '철근 보호캡 미설치',     textEn: 'Rebar caps missing',     textVi: 'Thiếu nắp bảo vệ thép',      textAr: 'أغطية الحديد مفقودة' });
  // 계획서 위반
  if ((FOUND_STATE.planRebarSpacing || 0) > 0.30) {
    missing.push({ custom: true, textKo: `계획 철근간격 ${FOUND_STATE.planRebarSpacing}m — 과대 (≤0.3m)`,
      textEn: `Plan rebar spacing ${FOUND_STATE.planRebarSpacing}m too wide`,
      textVi: `Khoảng cách thép ${FOUND_STATE.planRebarSpacing}m quá rộng`,
      textAr: `تباعد الحديد ${FOUND_STATE.planRebarSpacing}م مفرط` });
  }
  if (FOUND_STATE.planConcStrength !== null && FOUND_STATE.planConcStrength < 24) {
    missing.push({ custom: true, textKo: `계획 콘크리트 강도 ${FOUND_STATE.planConcStrength}MPa — 부족 (≥24)`,
      textEn: `Plan concrete strength ${FOUND_STATE.planConcStrength}MPa insufficient`,
      textVi: `Cường độ BT ${FOUND_STATE.planConcStrength}MPa không đủ`,
      textAr: `قوة الخرسانة ${FOUND_STATE.planConcStrength}MPa غير كافية` });
  }
  return missing;
}

function openPumpConsole() {
  if (GAME.state.liftStarted || GAME.state.gameOver) return;
  if (typeof FOUND_STATE === 'undefined') return;
  const missing = _getPumpRefusal();
  if (missing.length > 0) {
    showOperatorRefusal(missing);
    return;
  }
  evaluateFoundation();
}

function exitExcavCab() {
  if (!GAME.state.craneBoarded) return;
  GAME.state.craneBoarded = false;
  INTERACTION.popupOpen   = false;

  PLAYER.camMode = GAME._prevCamMode || 'fps';
  if (GAME._prevWorldPos) PLAYER.worldPos.copy(GAME._prevWorldPos);
  GAME.camera.position.set(PLAYER.worldPos.x, 1.7, PLAYER.worldPos.z);

  document.getElementById('excav-cab-overlay').classList.add('hidden');

  if (!GAME.state.gameOver && window.matchMedia('(pointer: fine)').matches) {
    GAME.renderer.domElement.requestPointerLock();
  }
}

// ── NPC popup — kept for instruction.js monkey-patch ─────────
function openPopup(item) {
  // instruction.js overrides this function to handle 'npc' type
}

function closePopup() {
  INTERACTION.popupOpen = false;
  const popup = document.getElementById('hazard-popup');
  if (popup) popup.classList.add('hidden');
  if (GAME.state.gameStarted && !GAME.state.gameOver && window.matchMedia('(pointer: fine)').matches) {
    GAME.renderer.domElement.requestPointerLock();
  }
}
