// Instruction system — player gives work orders to NPCs as supervisor
// Monkey-patches openPopup() from interaction.js to intercept NPC type

// ── Instruction database ─────────────────────────────────────
const INSTRUCTIONS = {
  1: [  // Phase 1 — 사전점검
    { id: 'check_sling',   icon: '🔍', labelKo: '슬링 점검해',         labelEn: 'Inspect sling',         targetRole: '슬링작업자', npcId: 'park'  },
    { id: 'signal_pos',    icon: '📍', labelKo: '신호수 위치 서',       labelEn: 'Take signal position',  targetRole: '신호수',     npcId: 'gimc'  },
    { id: 'evacuate',      icon: '🚶', labelKo: '작업반경 밖으로 나가', labelEn: 'Leave lift zone',       targetRole: null,         npcId: null     },
    { id: 'wear_ppe',      icon: '⛑',  labelKo: '안전모·안전대 착용해', labelEn: 'Wear helmet & harness', targetRole: null,         npcId: null     },
  ],
  2: [  // Phase 2 — 계산검토
    { id: 'check_spec',    icon: '📋', labelKo: '사양서 확인해',   labelEn: 'Check specifications',  targetRole: '슬링작업자', npcId: 'park'  },
    { id: 'measure_angle', icon: '📐', labelKo: '각도 측정해',     labelEn: 'Measure sling angle',   targetRole: '슬링작업자', npcId: 'park'  },
  ],
  3: [  // Phase 3 — 인양실행
    { id: 'start_lift',    icon: '▶',  labelKo: '인양 시작해',     labelEn: 'Begin lift',            targetRole: '신호수',     npcId: 'gimc'  },
    { id: 'slow_down',     icon: '⬇',  labelKo: '천천히 내려놔',   labelEn: 'Lower slowly',          targetRole: '신호수',     npcId: 'gimc'  },
    { id: 'stop',          icon: '✋', labelKo: '멈춰',             labelEn: 'Stop',                  targetRole: null,         npcId: null     },
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

  // NPC header
  document.getElementById('inst-name').textContent = npc.name;
  document.getElementById('inst-role').textContent = `· ${npc.role}`;

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

  // Lang switch
  const langSwitch = document.getElementById('inst-lang-switch');
  if (langSwitch) {
    langSwitch.textContent = instructionLang === 'ko' ? 'EN으로 지시' : 'KO로 지시';
  }

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
    btn.innerHTML = `<span class="inst-icon">${inst.icon}</span>
      <span>${instructionLang === 'en' ? inst.labelEn : inst.labelKo}</span>`;

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
function toggleInstructionLang() {
  instructionLang = instructionLang === 'ko' ? 'en' : 'ko';
  const btn = document.getElementById('inst-lang-switch');
  if (btn) btn.textContent = instructionLang === 'ko' ? 'EN으로 지시' : 'KO로 지시';
}

// ── Init ──────────────────────────────────────────────────────
function initInstructions() {
  initNPCs();

  // Keyboard shortcut: Tab to toggle instruction language
  document.addEventListener('keydown', e => {
    if (e.code === 'Tab' && !INTERACTION.popupOpen) {
      e.preventDefault();
      toggleInstructionLang();
    }
  });
}
