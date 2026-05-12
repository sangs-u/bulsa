// Instruction system — player gives work orders to NPCs as supervisor
// Monkey-patches openPopup() from interaction.js to intercept NPC type

// 지시 언어 토글 버튼 라벨 — UI 언어 기준 4언어
function _instLangSwitchLabel() {
  const target = (typeof instructionLang !== 'undefined' && instructionLang === 'ko') ? 'EN' : 'KO';
  const ui = (typeof currentLang !== 'undefined') ? currentLang : 'ko';
  const map = {
    ko: `${target}으로 지시`,
    en: `Instruct in ${target}`,
    vi: `Hướng dẫn bằng ${target}`,
    ar: `أصدر التعليمات بـ ${target}`,
  };
  return map[ui] || map.ko;
}

// ── Instruction database ─────────────────────────────────────
// 메타 필드:
//   applicableTrades  : 이 명령이 적합한 직종 배열 (null=모두). 불일치 → NPC 거부
//   applicablePhases  : 이 명령이 적합한 phase 배열 (null=모두). 불일치 → NPC 거부
//   risk              : 'safe' | 'danger' — danger 는 안전절차 생략 변종, 강행 시 사고
//   accidentIfDanger  : danger 명령 강행 시 발생할 사고 ID
//   minSkill          : 0~1 — 정답이라도 NPC 숙련도 미달 시 실패 (사고/미완료)
// 기존 targetRole/npcId 는 "정답 가이드용" 이며, 선택 가능 풀에서 제외하지 않음.
const INSTRUCTIONS = {
  1: [
    { id:'wear_ppe',      icon:'⛑',  labelKo:'안전모·안전대 착용해',  labelEn:'Wear helmet & harness', labelVi:'Đeo mũ bảo hộ và dây an toàn', labelAr:'البس الخوذة وحزام السلامة', applicableTrades:null, applicablePhases:null, risk:'safe' },
    { id:'check_weather', icon:'🌤', labelKo:'기상·풍속 확인해',       labelEn:'Check wind & weather',  labelVi:'Kiểm tra thời tiết và tốc độ gió', labelAr:'تحقق من الطقس وسرعة الرياح', applicableTrades:null, applicablePhases:[1,2], risk:'safe' },
    // 함정 — 타phase 명령 (Phase 1 에 인양 시작 지시)
    { id:'rush_lift',     icon:'⚠', labelKo:'그냥 빨리 들어',         labelEn:'Just lift it now',      labelVi:'Cứ cẩu nhanh đi',                    labelAr:'ارفع بسرعة',                applicableTrades:['lifting','signal'], applicablePhases:[6], risk:'danger', accidentIfDanger:'overload' },
  ],
  2: [
    { id:'check_spec',    icon:'📋', labelKo:'사양서 확인해',          labelEn:'Check specifications',  labelVi:'Kiểm tra bản thông số kỹ thuật', labelAr:'راجع المواصفات الفنية', applicableTrades:['lifting'],  applicablePhases:[2,4], risk:'safe', targetRole:'슬링작업자', npcId:'park' },
    { id:'wear_ppe',      icon:'⛑',  labelKo:'안전모·안전대 착용해',  labelEn:'Wear helmet & harness', labelVi:'Đeo mũ bảo hộ và dây an toàn', labelAr:'البس الخوذة وحزام السلامة', applicableTrades:null, applicablePhases:null, risk:'safe' },
    // 함정 — 위험변종
    { id:'skip_spec',     icon:'⚠', labelKo:'사양 확인 생략하고 진행', labelEn:'Skip spec check, proceed', labelVi:'Bỏ qua thông số',           labelAr:'تخطّ المواصفات',              applicableTrades:['lifting'],  applicablePhases:[2], risk:'danger', accidentIfDanger:'overload' },
  ],
  3: [
    { id:'outrigger_check', icon:'🔩', labelKo:'아웃트리거 확인해',   labelEn:'Check outriggers',      labelVi:'Kiểm tra chân chống cẩu (outrigger)', labelAr:'افحص الدعامات الجانبية للرافعة', applicableTrades:null, applicablePhases:[3], risk:'safe' },
    { id:'wear_ppe',        icon:'⛑',  labelKo:'안전모·안전대 착용해', labelEn:'Wear helmet & harness', labelVi:'Đeo mũ bảo hộ và dây an toàn', labelAr:'البس الخوذة وحزام السلامة', applicableTrades:null, applicablePhases:null, risk:'safe' },
    // 함정 — 위험변종 (아웃트리거 안 펴고 진행)
    { id:'skip_outrigger',  icon:'⚠', labelKo:'아웃트리거 안 펴고 시작', labelEn:'Skip outriggers, start', labelVi:'Bỏ chân chống, bắt đầu',      labelAr:'ابدأ بلا دعامات',             applicableTrades:['lifting'],  applicablePhases:[3], risk:'danger', accidentIfDanger:'crane_topple' },
  ],
  4: [
    { id:'check_sling',   icon:'🔍', labelKo:'슬링 상태 확인해',      labelEn:'Check sling condition', labelVi:'Kiểm tra tình trạng dây cẩu', labelAr:'افحص حالة حبال الرفع', applicableTrades:['lifting'], applicablePhases:[4], risk:'safe', targetRole:'슬링작업자', npcId:'park', minSkill:0.6 },
    { id:'secure_pin',    icon:'🔐', labelKo:'안전핀 체결 확인해',    labelEn:'Confirm pin secured',   labelVi:'Xác nhận chốt an toàn đã khóa (LOTO)', labelAr:'تأكد من إحكام مسمار الأمان', applicableTrades:['lifting'], applicablePhases:[4], risk:'safe', targetRole:'슬링작업자', npcId:'park', minSkill:0.55 },
    { id:'measure_angle', icon:'📐', labelKo:'슬링 각도 측정해',       labelEn:'Measure sling angle',   labelVi:'Đo góc dây cẩu', labelAr:'قس زاوية حبل الرفع', applicableTrades:['lifting'], applicablePhases:[4], risk:'safe', targetRole:'슬링작업자', npcId:'park', minSkill:0.65 },
    { id:'wear_ppe',      icon:'⛑',  labelKo:'안전모·안전대 착용해',  labelEn:'Wear helmet & harness', labelVi:'Đeo mũ bảo hộ và dây an toàn', labelAr:'البس الخوذة وحزام السلامة', applicableTrades:null, applicablePhases:null, risk:'safe' },
    // 함정 — 위험변종
    { id:'use_kinked',    icon:'⚠', labelKo:'킹크 슬링 그냥 써',      labelEn:'Use kinked sling anyway', labelVi:'Dùng dây bị xoắn',          labelAr:'استخدم الحبل المعطوب',         applicableTrades:['lifting'], applicablePhases:[4], risk:'danger', accidentIfDanger:'sling_snap' },
    { id:'skip_angle',    icon:'⚠', labelKo:'각도 측정 없이 들어',     labelEn:'Lift without angle check', labelVi:'Cẩu không đo góc',          labelAr:'ارفع بلا قياس الزاوية',        applicableTrades:['lifting'], applicablePhases:[4,6], risk:'danger', accidentIfDanger:'angle_break' },
    // 함정 — 타직종 (슬링작업자에게 용접/타설 지시)
    { id:'start_weld',    icon:'🔥', labelKo:'용접 시작해',            labelEn:'Start welding',          labelVi:'Bắt đầu hàn',                labelAr:'ابدأ اللحام',                  applicableTrades:['electric'], applicablePhases:null, risk:'safe' },
    { id:'pour_concrete', icon:'🚚', labelKo:'콘크리트 타설해',         labelEn:'Pour concrete',          labelVi:'Đổ bê tông',                 labelAr:'صبّ الخرسانة',                applicableTrades:['pour'],     applicablePhases:null, risk:'safe' },
  ],
  5: [
    { id:'signal_pos',    icon:'📍', labelKo:'신호수 위치 서',         labelEn:'Take signal position',  labelVi:'Vào vị trí người ra hiệu', labelAr:'اتخذ موقع المُشير', applicableTrades:['signal'],  applicablePhases:[5], risk:'safe', targetRole:'신호수', npcId:'gimc', minSkill:0.5 },
    { id:'evacuate',      icon:'🚶', labelKo:'작업반경 밖으로 나가',   labelEn:'Leave lift zone',       labelVi:'Ra khỏi vùng bán kính cẩu', labelAr:'اخرج من نطاق الرفع', applicableTrades:null, applicablePhases:[5,6], risk:'safe' },
    { id:'wear_ppe',      icon:'⛑',  labelKo:'안전모·안전대 착용해',  labelEn:'Wear helmet & harness', labelVi:'Đeo mũ bảo hộ và dây an toàn', labelAr:'البس الخوذة وحزام السلامة', applicableTrades:null, applicablePhases:null, risk:'safe' },
    // 함정 — 신호수 없이 진행 강행
    { id:'no_signal_go',  icon:'⚠', labelKo:'신호수 없이 시작해',      labelEn:'Start without signal',  labelVi:'Bắt đầu không cần hiệu',     labelAr:'ابدأ بلا إشاري',              applicableTrades:['lifting','signal'], applicablePhases:[5,6], risk:'danger', accidentIfDanger:'no_signal' },
  ],
  6: [
    { id:'start_lift',    icon:'▶',  labelKo:'인양 시작 준비됐어',    labelEn:'Ready to begin lift',   labelVi:'Sẵn sàng bắt đầu cẩu', labelAr:'جاهز لبدء عملية الرفع', applicableTrades:['signal','lifting'], applicablePhases:[6], risk:'safe', targetRole:'신호수', npcId:'gimc' },
    { id:'stop',          icon:'✋', labelKo:'멈춰',                   labelEn:'Stop',                  labelVi:'Dừng lại', labelAr:'توقف', applicableTrades:null, applicablePhases:null, risk:'safe' },
    // 함정 — 작업반경 진입 강행
    { id:'enter_zone',    icon:'⚠', labelKo:'작업반경 안에서 신호',    labelEn:'Signal from inside zone', labelVi:'Ra hiệu trong vùng cẩu',     labelAr:'إشارة من داخل النطاق',        applicableTrades:['signal'], applicablePhases:[6], risk:'danger', accidentIfDanger:'worker_crush' },
  ],
};

// Language mismatch responses
const MISMATCH_RESPONSES = {
  ar: ['????', 'لا أفهم', '??????'],
  vi: ['????', 'Tôi không hiểu', '??????'],
  ko: ['???'],
};

// Track which instructions have been given (per NPC per phase)
const _givenInstructions = new Set();

// Current language for instructions (can differ from UI language)
let instructionLang = 'ko';

// ── Monkey-patch openPopup ───────────────────────────────────
const _origOpenPopup = typeof openPopup === 'function' ? openPopup : null;

function openPopup(item) {
  if (item && item.type === 'npc') {
    openInstructionPopup(item);
    return;
  }
  if (_origOpenPopup) _origOpenPopup(item);
}

// ── Instruction popup ────────────────────────────────────────
function openInstructionPopup(item) {
  INTERACTION.popupOpen = true;
  if (document.pointerLockElement) document.exitPointerLock();

  const npc = GAME.npcs.find(n => n.id === item.npcId);
  if (!npc) { INTERACTION.popupOpen = false; return; }

  const popup = document.getElementById('instruction-popup');
  if (!popup) { INTERACTION.popupOpen = false; return; }

  _currentPanelNpcId = npc.id;

  // NPC header — 이름 + 역할(공종) + 경력
  document.getElementById('inst-name').textContent = npc.name;
  const tradeName = (typeof TRADES !== 'undefined' && npc.trade && TRADES[npc.trade])
    ? TRADES[npc.trade].ko : '';
  const expSuffix = npc.experience ? ` · 경력 ${npc.experience}년` : '';
  const tradeSuffix = tradeName ? ` · ${tradeName}` : '';
  const roleStr = (typeof npc.roleText === 'function') ? npc.roleText() : (typeof npc.role === 'string' ? npc.role : (npc.role && (npc.role[currentLang] || npc.role.ko)) || '');
  document.getElementById('inst-role').textContent = `· ${roleStr}${tradeSuffix}${expSuffix}`;

  // Language badge
  const langBadge = document.getElementById('inst-lang-badge');
  const langNames = { ko: '🇰🇷 한국어', en: '🌐 English', ar: '🇸🇦 عربي', vi: '🇻🇳 Tiếng Việt' };
  const match = npc.language === instructionLang || instructionLang === 'en';
  langBadge.textContent   = langNames[npc.language] || npc.language;
  langBadge.className     = 'inst-lang-badge ' + (match ? 'lang-ok' : 'lang-warn');

  // Speech bubble (language mismatch warning)
  const bubble = document.getElementById('inst-speech-bubble');
  if (!match) {
    const responses = MISMATCH_RESPONSES[npc.language] || ['????'];
    bubble.textContent = `"${responses[Math.floor(Math.random() * responses.length)]}"`;
    bubble.classList.remove('hidden');
  } else {
    bubble.classList.add('hidden');
  }

  // Lang switch and close button
  const langSwitch = document.getElementById('inst-lang-switch');
  if (langSwitch) {
    langSwitch.textContent = _instLangSwitchLabel();
  }
  const closeBtn = document.getElementById('inst-close-btn');
  if (closeBtn) closeBtn.textContent = t('close');

  // Instruction list
  const list = document.getElementById('inst-list');
  list.innerHTML = '';
  const phase = GAME.state.phase;
  const items = INSTRUCTIONS[phase] || INSTRUCTIONS[1];

  // 모든 명령을 풀에 표시 — 직종/phase 미스매치는 NPC 거부로 처리 (학습)
  // 위험변종(risk='danger')는 시각적 경고 (⚠ 아이콘이 이미 있음) — 플레이어가 인식 가능
  items.forEach(inst => {
    const btn = document.createElement('div');
    const isDanger = inst.risk === 'danger';
    btn.className = 'inst-item' +
                    (_givenInstructions.has(`${npc.id}_${inst.id}`) ? ' given' : '') +
                    (isDanger ? ' inst-danger' : '');
    const langSuffix = (instructionLang || 'ko').charAt(0).toUpperCase() + (instructionLang || 'ko').slice(1);
    const label = inst['label' + langSuffix] || inst.labelEn || inst.labelKo;
    btn.innerHTML = `<span class="inst-icon">${inst.icon}</span>
      <span>${label}</span>`;

    btn.onclick = () => {
      if (_givenInstructions.has(`${npc.id}_${inst.id}`)) return;
      giveInstruction(npc, inst);
      closeInstructionPopup();
    };
    list.appendChild(btn);
  });

  popup.classList.remove('hidden');
}

function closeInstructionPopup() {
  INTERACTION.popupOpen = false;
  _currentPanelNpcId = null;
  const popup = document.getElementById('instruction-popup');
  if (popup) popup.classList.add('hidden');
  if (GAME.state.gameStarted && !GAME.state.gameOver && window.matchMedia('(pointer: fine)').matches) {
    GAME.renderer.domElement.requestPointerLock();
  }
}

// ── Give an instruction to NPC ────────────────────────────────
// 4언어 거부 멘트 사전 (NPC 직종/phase 미스매치)
const _REJECT_LINES = {
  trade: {
    ko: ['저는 그 작업 못합니다.', '제 일이 아닙니다.', '다른 사람한테 시키세요.'],
    en: ['Not my job.', 'I am not trained for that.', "That's someone else's task."],
    vi: ['Đó không phải việc của tôi.', 'Tôi không được đào tạo việc đó.', 'Hỏi người khác đi.'],
    ar: ['ليس عملي.', 'لست مدرّباً على ذلك.', 'اطلب شخصاً آخر.'],
  },
  phase: {
    ko: ['지금 할 일이 아닙니다.', '아직 그 단계 아니에요.', '순서가 안 맞습니다.'],
    en: ['Not the right time.', 'Not at this stage.', 'Out of sequence.'],
    vi: ['Chưa đến lúc.', 'Không phải bước này.', 'Sai thứ tự.'],
    ar: ['ليس الوقت المناسب.', 'ليست هذه المرحلة.', 'خارج التسلسل.'],
  },
  danger: {
    ko: ['그건 위험합니다. 안전절차 지킬게요.', '안 됩니다. 사고 납니다.', '저 죽으라는 거죠?'],
    en: ['Too dangerous. I will follow safety.', 'No. That causes accidents.', 'You want me dead?'],
    vi: ['Quá nguy hiểm.', 'Không. Sẽ gây tai nạn.', 'Anh muốn tôi chết à?'],
    ar: ['خطير جداً.', 'لا. سيسبب حادثاً.', 'أتريدني أن أُقتل؟'],
  },
};
function _rejectLine(kind) {
  const pool = (_REJECT_LINES[kind] || _REJECT_LINES.trade)[currentLang] || _REJECT_LINES.trade.ko;
  return pool[Math.floor(Math.random() * pool.length)];
}

// 명령이 NPC 직종/phase 에 적합한지 평가
function _evalInstructionFit(npc, inst) {
  // 직종 체크
  if (inst.applicableTrades && Array.isArray(inst.applicableTrades)) {
    if (!inst.applicableTrades.includes(npc.trade)) {
      return { ok: false, reason: 'trade' };
    }
  }
  // phase 체크 — 현재 phase 가 적합한지
  const curPhase = (GAME.state && GAME.state.phase) || 1;
  if (inst.applicablePhases && Array.isArray(inst.applicablePhases)) {
    if (!inst.applicablePhases.includes(curPhase)) {
      return { ok: false, reason: 'phase' };
    }
  }
  // 위험변종 체크 — danger 명령은 별도 분기 (수행 시 사고)
  if (inst.risk === 'danger') return { ok: true, reason: 'danger' };
  return { ok: true, reason: 'safe' };
}

function giveInstruction(npc, inst) {
  _givenInstructions.add(`${npc.id}_${inst.id}`);

  // 0단계: 언어 미스매치
  const match = npc.receiveInstruction(instructionLang);
  if (!match) {
    _doMismatchBehavior(npc, inst);
    applySafetyPenalty(10);
    return;
  }

  // 1단계: 직종/phase/위험 평가
  const fit = _evalInstructionFit(npc, inst);
  if (!fit.ok) {
    // NPC 거부 — 직종 또는 phase 미스매치
    npc.setState && npc.setState('IDLE');
    _showWorldBubble(npc, `"${_rejectLine(fit.reason)}"`);
    const penalty = fit.reason === 'trade' ? 5 : 3;
    applySafetyPenalty(penalty);
    updateHUD();
    if (typeof showActionNotif === 'function') {
      const m = { ko:`❌ ${npc.name} 거부 — ${penalty}점 차감`, en:`❌ ${npc.name} refused — -${penalty}`, vi:`❌ ${npc.name} từ chối — -${penalty}`, ar:`❌ ${npc.name} رفض — -${penalty}` };
      showActionNotif(m[currentLang] || m.ko, 2800);
    }
    return;
  }

  // 2단계: 위험변종 분기 — NPC 가 50% 확률로 거부, 강행 시 사고
  if (fit.reason === 'danger') {
    if (Math.random() < 0.5) {
      // NPC 거부 (양심)
      _showWorldBubble(npc, `"${_rejectLine('danger')}"`);
      applySafetyPenalty(2);
      updateHUD();
      return;
    }
    // 마지못해 수행 → 사고 확률 70%
    _showWorldBubble(npc, '...');
    if (Math.random() < 0.7 && inst.accidentIfDanger && typeof triggerAccident === 'function') {
      applySafetyPenalty(15);
      setTimeout(() => triggerAccident(inst.accidentIfDanger), 1200);
      return;
    }
    // 운 좋게 사고 안 남 — 안전지수만 깎임
    applySafetyPenalty(12);
    updateHUD();
    return;
  }

  // 3단계: 숙련도 체크 — 정답이라도 NPC skill 미달 시 실패 가능
  if (inst.minSkill && typeof npc.skill === 'number' && npc.skill < inst.minSkill) {
    const failProb = (inst.minSkill - npc.skill) * 1.5; // 0~0.6 정도
    if (Math.random() < failProb) {
      // 시도 → 실패 (사고 아님, 그냥 미완료)
      npc.setState && npc.setState('UNSAFE');
      _showWorldBubble(npc, currentLang === 'en' ? '"Tried but failed..."' :
                             currentLang === 'vi' ? '"Đã thử nhưng thất bại..."' :
                             currentLang === 'ar' ? '"حاولت لكن فشلت..."' :
                             '"해봤는데 잘 안 됩니다..."');
      applySafetyPenalty(4);
      updateHUD();
      if (typeof showActionNotif === 'function') {
        const m = { ko:`⚠ ${npc.name} 숙련도 부족 — 작업 실패`, en:`⚠ ${npc.name} skill too low — failed`, vi:`⚠ ${npc.name} kỹ năng kém — thất bại`, ar:`⚠ ${npc.name} مهارة غير كافية — فشل` };
        showActionNotif(m[currentLang] || m.ko, 3000);
      }
      return;
    }
  }

  // 4단계: 정상 수행
  switch (inst.id) {
    case 'check_sling':
      npc.setState && npc.setState('WORKING');
      _animateNPCWork(npc, 'inspect');
      // Resolve sling hazard from NPC side
      _resolveHazardByNPC('sling_damage');
      break;
    case 'signal_pos':
      npc.group.position.set(7, 0, -6);
      npc.setState('WORKING');
      _resolveHazardByNPC('no_signal');
      break;
    case 'evacuate':
      npc.evacuate();
      _resolveHazardByNPC('worker_in_zone');
      break;
    case 'wear_ppe':
      npc.setState('WORKING');
      applySafetyReward(5);
      break;
    case 'check_spec':
      npc.setState('WORKING');
      applySafetyReward(5);
      break;
    case 'measure_angle':
      npc.setState('WORKING');
      _resolveHazardByNPC('angle_exceeded');
      break;
    case 'secure_pin':
      npc.setState && npc.setState('WORKING');
      _animateNPCWork(npc, 'inspect');
      break;
    case 'outrigger_check':
    case 'check_weather':
      npc.setState && npc.setState('WORKING');
      applySafetyReward(3);
      break;
    case 'start_lift':
      npc.setState('WORKING');
      break;
    case 'stop':
      npc.setState('IDLE');
      break;
  }

  applySafetyReward(3);
  updateHUD();
}

function _doMismatchBehavior(npc, inst) {
  // NPC does something random/wrong
  const wrongActions = [
    () => { npc.setState && npc.setState('UNSAFE'); },
    () => { npc.group.position.x += (Math.random() - 0.5) * 4; },
    () => { npc.fatigue = Math.min(100, npc.fatigue + 20); },
  ];
  wrongActions[Math.floor(Math.random() * wrongActions.length)]();

  // Show "????" bubble in world
  _showWorldBubble(npc, '????');
}

function _resolveHazardByNPC(hazardId) {
  const haz = GAME.hazards.find(h => h.id === hazardId);
  if (!haz || haz.resolved || haz.ignored) return;
  haz.resolved = true;
  GAME.state.hazardsResolved.add(hazardId);
  if (haz.mesh) {
    haz.mesh.material.color.setHex(0x00A896);
    haz.mesh.material.opacity = 0.4;
    haz.mesh.material.transparent = true;
  }
  GAME.interactables = GAME.interactables.filter(i => i.hazardId !== hazardId);
  applySafetyReward(haz.safetyReward || 5);
  updateHUD();
}

function _animateNPCWork(npc, type) {
  npc.setState('WORKING');
  // Auto return to IDLE after 3s
  setTimeout(() => {
    if (npc.state === 'WORKING') npc.setState('IDLE');
  }, 3000);
}

// ── World-space speech bubble ────────────────────────────────
function _showWorldBubble(npc, text) {
  const id = `bubble-${npc.id}`;
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('div');
    el.id = id;
    el.className = 'npc-label';
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.style.opacity = '1';
  setTimeout(() => { el.style.opacity = '0'; }, 2000);
}

// ── Language toggle ───────────────────────────────────────────
// Track the NPC currently displayed in the panel
let _currentPanelNpcId = null;

function toggleInstructionLang() {
  instructionLang = instructionLang === 'ko' ? 'en' : 'ko';

  // Re-render panel contents immediately if popup is open
  if (INTERACTION.popupOpen && _currentPanelNpcId) {
    const npc = GAME.npcs.find(n => n.id === _currentPanelNpcId);
    if (npc) {
      // Update language badge
      const langBadge = document.getElementById('inst-lang-badge');
      const langNames = { ko: '🇰🇷 한국어', en: '🌐 English', ar: '🇸🇦 عربي', vi: '🇻🇳 Tiếng Việt' };
      const match = npc.language === instructionLang || instructionLang === 'en';
      langBadge.textContent = langNames[npc.language] || npc.language;
      langBadge.className   = 'inst-lang-badge ' + (match ? 'lang-ok' : 'lang-warn');

      // Update speech bubble
      const bubble = document.getElementById('inst-speech-bubble');
      if (!match) {
        const responses = MISMATCH_RESPONSES[npc.language] || ['????'];
        bubble.textContent = `"${responses[Math.floor(Math.random() * responses.length)]}"`;
        bubble.classList.remove('hidden');
      } else {
        bubble.classList.add('hidden');
      }

      // Update lang switch button text
      const btn = document.getElementById('inst-lang-switch');
      if (btn) btn.textContent = _instLangSwitchLabel();

      // Re-render instruction list with new language
      const list = document.getElementById('inst-list');
      list.innerHTML = '';
      const phase = GAME.state.phase;
      const items = INSTRUCTIONS[phase] || INSTRUCTIONS[1];
      items.forEach(inst => {
        const isDanger = inst.risk === 'danger';
        const btn2 = document.createElement('div');
        btn2.className = 'inst-item' +
                         (_givenInstructions.has(`${npc.id}_${inst.id}`) ? ' given' : '') +
                         (isDanger ? ' inst-danger' : '');
        const langSuffix2 = (instructionLang || 'ko').charAt(0).toUpperCase() + (instructionLang || 'ko').slice(1);
        const label2 = inst['label' + langSuffix2] || inst.labelEn || inst.labelKo;
        btn2.innerHTML = `<span class="inst-icon">${inst.icon}</span>
          <span>${label2}</span>`;
        btn2.onclick = () => {
          if (_givenInstructions.has(`${npc.id}_${inst.id}`)) return;
          giveInstruction(npc, inst);
          closeInstructionPopup();
        };
        list.appendChild(btn2);
      });
      return;
    }
  }

  // Popup not open — just update the button if visible
  const btn = document.getElementById('inst-lang-switch');
  if (btn) btn.textContent = instructionLang === 'ko' ? 'EN으로 지시' : 'KO로 지시';
}

// ── Init ──────────────────────────────────────────────────────
function initInstructions() {
  // Keyboard shortcut: Tab to toggle instruction language
  document.addEventListener('keydown', e => {
    if (e.code === 'Tab' && !INTERACTION.popupOpen) {
      e.preventDefault();
      toggleInstructionLang();
    }
  });
}
