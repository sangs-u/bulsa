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
const INSTRUCTIONS = {
  1: [  // Phase 1 — 작업계획서
    { id: 'wear_ppe',      icon: '⛑',  labelKo: '안전모·안전대 착용해',  labelEn: 'Wear helmet & harness', labelVi: 'Đeo mũ bảo hộ và dây an toàn', labelAr: 'البس الخوذة وحزام السلامة', targetRole: null, npcId: null  },
    { id: 'check_weather', icon: '🌤', labelKo: '기상·풍속 확인해',       labelEn: 'Check wind & weather',  labelVi: 'Kiểm tra thời tiết và tốc độ gió', labelAr: 'تحقق من الطقس وسرعة الرياح', targetRole: null, npcId: null  },
  ],
  2: [  // Phase 2 — 안전성 검토
    { id: 'check_spec',    icon: '📋', labelKo: '사양서 확인해',          labelEn: 'Check specifications',  labelVi: 'Kiểm tra bản thông số kỹ thuật', labelAr: 'راجع المواصفات الفنية', targetRole: '슬링작업자', npcId: 'park'  },
    { id: 'wear_ppe',      icon: '⛑',  labelKo: '안전모·안전대 착용해',  labelEn: 'Wear helmet & harness', labelVi: 'Đeo mũ bảo hộ và dây an toàn', labelAr: 'البس الخوذة وحزام السلامة', targetRole: null, npcId: null  },
  ],
  3: [  // Phase 3 — 장비 세팅
    { id: 'outrigger_check', icon: '🔩', labelKo: '아웃트리거 확인해',   labelEn: 'Check outriggers',      labelVi: 'Kiểm tra chân chống cẩu (outrigger)', labelAr: 'افحص الدعامات الجانبية للرافعة', targetRole: null, npcId: null  },
    { id: 'wear_ppe',        icon: '⛑',  labelKo: '안전모·안전대 착용해', labelEn: 'Wear helmet & harness', labelVi: 'Đeo mũ bảo hộ và dây an toàn', labelAr: 'البس الخوذة وحزام السلامة', targetRole: null, npcId: null  },
  ],
  4: [  // Phase 4 — 줄걸이 점검
    { id: 'check_sling',   icon: '🔍', labelKo: '슬링 상태 확인해',      labelEn: 'Check sling condition', labelVi: 'Kiểm tra tình trạng dây cẩu', labelAr: 'افحص حالة حبال الرفع', targetRole: '슬링작업자', npcId: 'park'  },
    { id: 'secure_pin',    icon: '🔐', labelKo: '안전핀 체결 확인해',    labelEn: 'Confirm pin secured',   labelVi: 'Xác nhận chốt an toàn đã khóa (LOTO)', labelAr: 'تأكد من إحكام مسمار الأمان', targetRole: '슬링작업자', npcId: 'park'  },
    { id: 'measure_angle', icon: '📐', labelKo: '슬링 각도 측정해',       labelEn: 'Measure sling angle',   labelVi: 'Đo góc dây cẩu', labelAr: 'قس زاوية حبل الرفع', targetRole: '슬링작업자', npcId: 'park'  },
    { id: 'wear_ppe',      icon: '⛑',  labelKo: '안전모·안전대 착용해',  labelEn: 'Wear helmet & harness', labelVi: 'Đeo mũ bảo hộ và dây an toàn', labelAr: 'البس الخوذة وحزام السلامة', targetRole: null, npcId: null  },
  ],
  5: [  // Phase 5 — 현장 세팅
    { id: 'signal_pos',    icon: '📍', labelKo: '신호수 위치 서',         labelEn: 'Take signal position',  labelVi: 'Vào vị trí người ra hiệu', labelAr: 'اتخذ موقع المُشير', targetRole: '신호수', npcId: 'gimc'  },
    { id: 'evacuate',      icon: '🚶', labelKo: '작업반경 밖으로 나가',   labelEn: 'Leave lift zone',       labelVi: 'Ra khỏi vùng bán kính cẩu', labelAr: 'اخرج من نطاق الرفع', targetRole: null, npcId: null  },
    { id: 'wear_ppe',      icon: '⛑',  labelKo: '안전모·안전대 착용해',  labelEn: 'Wear helmet & harness', labelVi: 'Đeo mũ bảo hộ và dây an toàn', labelAr: 'البس الخوذة وحزام السلامة', targetRole: null, npcId: null  },
  ],
  6: [  // Phase 6 — 인양 실행
    { id: 'start_lift',    icon: '▶',  labelKo: '인양 시작 준비됐어',    labelEn: 'Ready to begin lift',   labelVi: 'Sẵn sàng bắt đầu cẩu', labelAr: 'جاهز لبدء عملية الرفع', targetRole: '신호수', npcId: 'gimc'  },
    { id: 'stop',          icon: '✋', labelKo: '멈춰',                   labelEn: 'Stop',                  labelVi: 'Dừng lại', labelAr: 'توقف', targetRole: null, npcId: null  },
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

  items.forEach(inst => {
    // Only show instructions applicable to this NPC or universal ones
    if (inst.npcId && inst.npcId !== npc.id) return;

    const btn = document.createElement('div');
    btn.className = 'inst-item' + (_givenInstructions.has(`${npc.id}_${inst.id}`) ? ' given' : '');
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
function giveInstruction(npc, inst) {
  _givenInstructions.add(`${npc.id}_${inst.id}`);

  const match = npc.receiveInstruction(instructionLang);

  if (!match) {
    // Language mismatch — NPC does wrong thing
    _doMismatchBehavior(npc, inst);
    // Safety penalty
    applySafetyPenalty(10);
    return;
  }

  // Instruction executed
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
        if (inst.npcId && inst.npcId !== npc.id) return;
        const btn2 = document.createElement('div');
        btn2.className = 'inst-item' + (_givenInstructions.has(`${npc.id}_${inst.id}`) ? ' given' : '');
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
