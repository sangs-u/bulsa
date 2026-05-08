// Signboard installation system — inventory + raycasting placement

const SIGNBOARD = {
  active: false,
  selected: null,   // current sign type selected
  placed: [],       // array of placed sign meshes
  _groundPlane: null,
  _raycaster: new THREE.Raycaster(),
  _mouseNDC: new THREE.Vector2(),
};

GAME.signboards = SIGNBOARD.placed;
GAME.state.signsPlaced = new Set();

// ── Sign definitions ──────────────────────────────────────────
const SIGN_DEFS = [
  {
    id: 'no_entry',
    emoji: '🚫',
    labelKo: '출입금지',
    labelEn: 'No Entry',
    color: 0xDC2626,
    textColor: 0xFFFFFF,
    required: true,
  },
  {
    id: 'falling',
    emoji: '⚠',
    labelKo: '낙하물주의',
    labelEn: 'Falling Objects',
    color: 0xF59E0B,
    textColor: 0x000000,
    required: true,
  },
  {
    id: 'hardhat',
    emoji: '⛑',
    labelKo: '안전모착용',
    labelEn: 'Hard Hat Required',
    color: 0x2C6FAC,
    textColor: 0xFFFFFF,
    required: false,
  },
  {
    id: 'radius',
    emoji: '📏',
    labelKo: '작업반경표시',
    labelEn: 'Work Radius',
    color: 0x00A896,
    textColor: 0xFFFFFF,
    required: false,
  },
];

// Inventory counts (how many of each sign available)
const _inventory = { no_entry: 4, falling: 4, hardhat: 3, radius: 3 };

// ── Init ──────────────────────────────────────────────────────
function initSignboard() {
  // Invisible ground plane for raycasting
  const planeMat = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide });
  SIGNBOARD._groundPlane = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), planeMat);
  SIGNBOARD._groundPlane.rotation.x = -Math.PI / 2;
  SIGNBOARD._groundPlane.position.y = 0.02;
  GAME.scene.add(SIGNBOARD._groundPlane);

  // Click capture for sign placement (capture phase — fires before pointer lock)
  document.addEventListener('click', _onSignboardClick, true);

  // Mouse move to update NDC position
  document.addEventListener('mousemove', e => {
    SIGNBOARD._mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
    SIGNBOARD._mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
  });

  _renderInventoryBar();
}

// ── Inventory bar rendering ────────────────────────────────────
function _renderInventoryBar() {
  const bar = document.getElementById('signboard-bar');
  if (!bar) return;
  bar.innerHTML = '';

  SIGN_DEFS.forEach(def => {
    const slot = document.createElement('div');
    slot.className = 'inv-slot' + (SIGNBOARD.selected === def.id ? ' selected' : '');
    slot.dataset.sign = def.id;
    slot.innerHTML = `
      <span class="inv-icon">${def.emoji}</span>
      <span class="inv-label">${currentLang === 'en' ? def.labelEn : def.labelKo}</span>
      <span class="inv-count">${_inventory[def.id] || 0}</span>
    `;
    slot.onclick = () => selectSign(def.id);
    bar.appendChild(slot);
  });

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.className = 'inv-close-btn';
  closeBtn.textContent = '×';
  closeBtn.onclick = () => toggleSignboardMode();
  bar.appendChild(closeBtn);
}

// ── Toggle inventory bar visibility ───────────────────────────
function toggleSignboardMode() {
  SIGNBOARD.active = !SIGNBOARD.active;
  const bar = document.getElementById('signboard-bar');
  const toggleBtn = document.getElementById('inv-toggle-btn');

  if (bar) bar.classList.toggle('hidden', !SIGNBOARD.active);

  if (!SIGNBOARD.active) {
    SIGNBOARD.selected = null;
    if (document.pointerLockElement === null && GAME.state.gameStarted && !GAME.state.gameOver) {
      GAME.renderer.domElement.requestPointerLock();
    }
  } else {
    if (document.pointerLockElement) document.exitPointerLock();
  }
}

function selectSign(signId) {
  if (_inventory[signId] <= 0) return;
  SIGNBOARD.selected = SIGNBOARD.selected === signId ? null : signId;
  _renderInventoryBar();
}

// ── Click handler — place sign ────────────────────────────────
function _onSignboardClick(e) {
  if (!SIGNBOARD.active || !SIGNBOARD.selected) return;
  if (!GAME.state.gameStarted || GAME.state.gameOver) return;
  e.stopPropagation();  // Prevent pointer lock request

  const mouseNDC = new THREE.Vector2(
    (e.clientX / window.innerWidth) * 2 - 1,
    -(e.clientY / window.innerHeight) * 2 + 1,
  );

  SIGNBOARD._raycaster.setFromCamera(mouseNDC, GAME.camera);
  const hits = SIGNBOARD._raycaster.intersectObject(SIGNBOARD._groundPlane);

  if (hits.length > 0) {
    const pos = hits[0].point;
    _placeSign(SIGNBOARD.selected, pos);
    _inventory[SIGNBOARD.selected] = Math.max(0, _inventory[SIGNBOARD.selected] - 1);
    if (_inventory[SIGNBOARD.selected] === 0) SIGNBOARD.selected = null;
    _renderInventoryBar();
  }
}

// ── Place a sign mesh in the scene ────────────────────────────
function _placeSign(signId, position) {
  const def = SIGN_DEFS.find(d => d.id === signId);
  if (!def) return;

  const group = new THREE.Group();
  group.position.copy(position);

  // Post
  const postMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 8), postMat);
  post.position.y = 0.7;
  group.add(post);

  // Sign panel
  const panelMat = new THREE.MeshLambertMaterial({ color: def.color, side: THREE.DoubleSide });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.65, 0.65), panelMat);
  panel.position.y = 1.5;
  group.add(panel);

  // Border ring
  const borderMat = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
  const border = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.34, 24), borderMat);
  border.position.y = 1.5;
  border.position.z = 0.01;
  group.add(border);

  GAME.scene.add(group);
  SIGNBOARD.placed.push(group);
  GAME.state.signsPlaced.add(signId);

  // Track placement for hazard resolution
  _checkRequiredSigns();
}

// ── Check if required signs are placed ────────────────────────
function _checkRequiredSigns() {
  const required = SIGN_DEFS.filter(d => d.required).map(d => d.id);
  const missing  = required.filter(id => !GAME.state.signsPlaced.has(id));

  if (missing.length === 0) {
    applySafetyReward(10);
    updateHUD();
  }
}

// ── Check missing signs at lift start (called from penalty check) ──
function checkSignboardViolations() {
  const required = SIGN_DEFS.filter(d => d.required).map(d => d.id);
  const missing  = required.filter(id => !GAME.state.signsPlaced.has(id));
  missing.forEach(id => {
    GAME.state.violations.add(`missing_sign_${id}`);
    applySafetyPenalty(8);
  });
  return missing;
}
