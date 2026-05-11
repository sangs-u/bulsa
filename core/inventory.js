// 인벤토리 + 핫바 시스템
// 도구는 phase/scenario 진입 시 자동 추가. 1~6 숫자키 또는 휠로 전환.
// 활성 도구는 AVATAR.vmDetector 패턴으로 카메라 우하단 viewmodel 표시.

const INVENTORY = {
  items: [],              // [{ id, name, icon, trade, viewModel?, onSelect? }]
  currentIndex: 0,
  maxSlots: 6,
};

// 도구 카탈로그 — phase·미니게임에서 add 호출 시 참조
const TOOL_CATALOG = {
  hard_hat:        { id: 'hard_hat',        name: '안전모',          icon: '⛑',  trade: 'signal', alwaysOn: true },
  detector:        { id: 'detector',        name: '매설물 탐지기',   icon: '📡', trade: 'earthworks' },
  inspection_pad:  { id: 'inspection_pad',  name: '점검 클립보드',   icon: '📋', trade: 'earthworks' },
  level_meter:     { id: 'level_meter',     name: '수준기',          icon: '🎯', trade: 'lifting' },
  voltage_tester:  { id: 'voltage_tester',  name: '검전기',          icon: '⚡', trade: 'electric' },
  gas_meter:       { id: 'gas_meter',       name: '가스농도계',      icon: '⚠',  trade: 'plumbing' },
  angle_gauge:     { id: 'angle_gauge',     name: '각도계',          icon: '📐', trade: 'lifting' },
  rebar_caliper:   { id: 'rebar_caliper',   name: '철근 캘리퍼',     icon: '🔧', trade: 'rebar' },
  loto_lock:       { id: 'loto_lock',       name: 'LOTO 잠금장치',   icon: '🔒', trade: 'electric' },
  fire_ext_kit:    { id: 'fire_ext_kit',    name: '소화기 점검 kit', icon: '🧯', trade: 'finishing' },
  sling_inspector: { id: 'sling_inspector', name: '슬링 점검 도구',  icon: '🪢', trade: 'lifting' },
};

function initInventory() {
  // 시나리오별 기본 도구 세팅
  INVENTORY.items = [];
  addInventoryItem('hard_hat');  // 항상 휴대

  const sid = GAME.scenarioId;
  if (sid === 'excavation') {
    addInventoryItem('detector');
    addInventoryItem('inspection_pad');
  } else if (sid === 'foundation') {
    addInventoryItem('rebar_caliper');
    addInventoryItem('inspection_pad');
  } else if (sid === 'lifting') {
    addInventoryItem('sling_inspector');
    addInventoryItem('angle_gauge');
    addInventoryItem('level_meter');
  } else if (sid === 'envelope') {
    addInventoryItem('inspection_pad');
  } else if (sid === 'mep_finish') {
    addInventoryItem('voltage_tester');
    addInventoryItem('loto_lock');
    addInventoryItem('gas_meter');
    addInventoryItem('fire_ext_kit');
  }
  _renderHotbar();
}

function addInventoryItem(id) {
  const def = TOOL_CATALOG[id];
  if (!def) return false;
  if (INVENTORY.items.find(i => i.id === id)) return false;
  if (INVENTORY.items.length >= INVENTORY.maxSlots) return false;
  INVENTORY.items.push({ ...def });
  _renderHotbar();
  return true;
}

function selectInventorySlot(idx) {
  if (idx < 0 || idx >= INVENTORY.items.length) return;
  INVENTORY.currentIndex = idx;
  _renderHotbar();
  _updateViewmodel();
}

function getCurrentTool() {
  return INVENTORY.items[INVENTORY.currentIndex] || null;
}

function _renderHotbar() {
  let bar = document.getElementById('hotbar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'hotbar';
    document.body.appendChild(bar);
  }
  bar.innerHTML = INVENTORY.items.map((it, i) => `
    <div class="hb-slot ${i === INVENTORY.currentIndex ? 'active' : ''}" data-idx="${i}" onclick="selectInventorySlot(${i})" title="${it.name}">
      <span class="hb-num">${i + 1}</span>
      <span class="hb-icon">${it.icon}</span>
    </div>
  `).join('');
}

// 현재 도구를 카메라 viewmodel 로 표시 — 매 슬롯 변경 시 색·아이콘만 바꾸는 단순 표시
function _updateViewmodel() {
  // 기존 AVATAR.vmDetector 가 있으면 그 외에는 텍스트 sprite 로 표시
  // 단순화: viewmodel UI 박스에 현재 도구 이름 표시
  let vm = document.getElementById('vm-tool');
  if (!vm) {
    vm = document.createElement('div');
    vm.id = 'vm-tool';
    document.body.appendChild(vm);
  }
  const tool = getCurrentTool();
  if (tool && !tool.alwaysOn) {
    vm.innerHTML = `<span class="vm-icon">${tool.icon}</span><span class="vm-name">${tool.name}</span>`;
    vm.classList.add('visible');
  } else if (tool && tool.id === 'hard_hat') {
    // 안전모는 항상 머리에 — viewmodel 숨김
    vm.classList.remove('visible');
  } else {
    vm.classList.remove('visible');
  }
}

// 숫자 키 + 마우스 휠 처리
document.addEventListener('keydown', e => {
  if (!GAME || !GAME.state || !GAME.state.gameStarted) return;
  if (INTERACTION.popupOpen) return;
  const m = e.code.match(/^Digit([1-6])$/);
  if (m) {
    e.preventDefault();
    selectInventorySlot(parseInt(m[1], 10) - 1);
  }
});

document.addEventListener('wheel', e => {
  if (!GAME || !GAME.state || !GAME.state.gameStarted) return;
  if (INTERACTION.popupOpen) return;
  if (INVENTORY.items.length === 0) return;
  e.preventDefault();
  const delta = Math.sign(e.deltaY);
  let next = INVENTORY.currentIndex + delta;
  if (next < 0) next = INVENTORY.items.length - 1;
  if (next >= INVENTORY.items.length) next = 0;
  selectInventorySlot(next);
}, { passive: false });
