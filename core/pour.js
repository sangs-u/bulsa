// pour.js — 콘크리트 타설·양생·거푸집 해체 시스템
//
// 상태 흐름:
//   IDLE → POURING(E홀드, 콘크리트 차오름) → VIBRATING(E홀드, 진동기 다짐)
//        → CURING(시간 경과, 색상 변화) → CURED → STRIPPING(패널 하나씩 E제거) → STRIPPED

const POUR = {
  state:        'idle',   // idle | pouring | vibrating | curing | cured | stripping | stripped
  fillLevel:    0,        // 0~1 (거푸집 채움 비율)
  cureProgress: 0,        // 0~1
  _fillMesh:    null,     // 차오르는 콘크리트 mesh
  _formwork:    null,     // 거푸집 전체 그룹 { group, panels[], innerW, innerD, innerH }
  _particles:   null,     // 파티클 시스템
  _hosePos:     null,     // THREE.Vector3 — 호스 끝 위치
  _vibRod:      null,     // 진동기 봉 mesh
  _statusEl:    null,     // 양생 진행 HUD
  _t:           0,
  POUR_SPEED:   0.028,    // 초당 fillLevel 증가량 (약 35초에 가득)
  CURE_DURATION: 40,      // 양생 완료까지 실시간 초
};

// ── 거푸집 등록 ───────────────────────────────────────────────
// foundation 씬이나 phase_v4 가 거푸집 설치 완료 시 호출
function registerFormwork(def) {
  // def: { center:{x,y,z}, width, depth, height, scene }
  const scene = def.scene || GAME.scene;
  const { center, width, depth, height } = def;
  const w = width  || 3.0;
  const d = depth  || 3.0;
  const h = height || 1.2;
  const thick = 0.06;

  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x9B6E3A, roughness: 0.88, metalness: 0.0,
  });
  if (typeof getTex === 'function') {
    // 목재 텍스처가 없으므로 색상+roughness 로 대체
  }

  const group = new THREE.Group();
  group.name  = 'formwork_assembly';

  // 4면 패널 + 바닥
  const panels = [];
  const panelDefs = [
    // [geometry args, position offset, rotation]
    { geo: [w,       h,     thick], pos: [0,           h/2, -d/2 - thick/2], rot: [0, 0, 0],          side: 'front' },
    { geo: [w,       h,     thick], pos: [0,           h/2,  d/2 + thick/2], rot: [0, Math.PI, 0],    side: 'back'  },
    { geo: [thick,   h,     d    ], pos: [-w/2 - thick/2, h/2, 0],           rot: [0, 0, 0],          side: 'left'  },
    { geo: [thick,   h,     d    ], pos: [ w/2 + thick/2, h/2, 0],           rot: [0, 0, 0],          side: 'right' },
    { geo: [w + thick*2, thick, d + thick*2], pos: [0, 0, 0],               rot: [0, 0, 0],          side: 'bottom'},
  ];

  panelDefs.forEach(pd => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...pd.geo), woodMat.clone());
    mesh.position.set(...pd.pos);
    mesh.rotation.set(...pd.rot);
    mesh.castShadow  = true;
    mesh.receiveShadow = true;
    mesh.userData.formworkPanel = true;
    mesh.userData.side = pd.side;
    group.add(mesh);
    if (pd.side !== 'bottom') panels.push(mesh); // 바닥은 해체 안 함
  });

  // 봉재 연결 (formwork tie) — 가로 막대
  const tieMat = new THREE.MeshStandardMaterial({ color: 0x555050, roughness: 0.5, metalness: 0.6 });
  [-0.3, 0.3].forEach(oy => {
    const tie = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, w + thick*2 + 0.1, 8), tieMat);
    tie.rotation.z = Math.PI / 2;
    tie.position.set(0, h * 0.35 + oy * h, 0);
    group.add(tie);
  });

  group.position.set(center.x, center.y || 0, center.z);
  scene.add(group);

  // 내부 채움 mesh (처음에 height=0)
  const fillMat = new THREE.MeshStandardMaterial({
    color: 0x585858, roughness: 0.3, metalness: 0.0,
  });
  const fillGeo = new THREE.BoxGeometry(w - thick*2, 0.001, d - thick*2);
  const fillMesh = new THREE.Mesh(fillGeo, fillMat);
  fillMesh.position.set(center.x, (center.y || 0) + 0.001, center.z);
  fillMesh.receiveShadow = true;
  scene.add(fillMesh);

  POUR._formwork   = { group, panels, innerW: w, innerD: d, innerH: h, center, scene };
  POUR._fillMesh   = fillMesh;
  POUR._hosePos    = new THREE.Vector3(center.x, (center.y || 0) + h + 0.5, center.z - d * 0.3);
  POUR.fillLevel   = 0;
  POUR.state       = 'ready';  // 거푸집 설치됨, 타설 대기

  // 타설 마커 등록
  if (typeof registerMarker === 'function') {
    registerMarker({
      id:     'pour_start',
      position: { x: center.x, y: center.y || 0, z: center.z + d * 0.6 },
      actId:  'start_pour',
      label:  { ko: '타설 시작', en: 'Start Pour' },
      radius: 2.5,
    });
  }

  _initParticles(scene);
  _initVibRod(scene, center, h);
  _buildStatusHUD();
}

// ── 파티클 (콘크리트 낙하 입자) ──────────────────────────────
function _initParticles(scene) {
  const count  = 120;
  const geo    = new THREE.BufferGeometry();
  const pos    = new Float32Array(count * 3);
  const vel    = new Float32Array(count * 3); // 속도 (CPU sim)
  const alpha  = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    pos[i*3] = pos[i*3+1] = pos[i*3+2] = 0;
    alpha[i] = 0;
  }

  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('alpha',    new THREE.BufferAttribute(alpha, 1));

  const mat = new THREE.PointsMaterial({
    color: 0x888076, size: 0.08, transparent: true, opacity: 0.85,
    vertexColors: false, depthWrite: false,
  });

  const pts = new THREE.Points(geo, mat);
  pts.visible = false;
  scene.add(pts);

  POUR._particles = { pts, pos, vel, alpha, count, geo };
}

// ── 진동기 봉 ─────────────────────────────────────────────────
function _initVibRod(scene, center, h) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xD0B060, roughness: 0.4, metalness: 0.7 });
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.8, 8), mat);
  rod.position.set(center.x + 0.2, (center.y || 0) + h + 0.4, center.z - 0.2);
  rod.visible = false;
  scene.add(rod);
  POUR._vibRod = rod;
}

// ── 양생 상태 HUD ─────────────────────────────────────────────
function _buildStatusHUD() {
  if (POUR._statusEl) POUR._statusEl.remove();
  const el = document.createElement('div');
  el.id = 'pour-status';
  el.style.cssText = [
    'position:fixed', 'bottom:26%', 'left:50%', 'transform:translateX(-50%)',
    'background:rgba(0,0,0,0.78)', 'color:#fff',
    'padding:10px 22px', 'border-radius:20px',
    'font-family:monospace', 'font-size:13px',
    'pointer-events:none', 'z-index:3100', 'display:none',
    'text-align:center', 'min-width:220px',
  ].join(';');
  document.body.appendChild(el);
  POUR._statusEl = el;
}

function _showStatus(html) {
  if (!POUR._statusEl) return;
  POUR._statusEl.style.display = html ? 'block' : 'none';
  if (html) POUR._statusEl.innerHTML = html;
}

// ── 타설 시작 ─────────────────────────────────────────────────
function startPour() {
  if (POUR.state !== 'ready' && POUR.state !== 'pouring') return;
  POUR.state = 'pouring';
  if (POUR._particles) POUR._particles.pts.visible = true;
}

// ── 타설 중지 (E 뗌) ─────────────────────────────────────────
function pausePour() {
  if (POUR.state !== 'pouring') return;
  if (POUR._particles) POUR._particles.pts.visible = false;
}

// ── 타설 틱 ──────────────────────────────────────────────────
function _tickPour(delta) {
  if (!POUR._formwork) return;

  POUR.fillLevel = Math.min(1, POUR.fillLevel + POUR.POUR_SPEED * delta);
  _updateFillMesh();
  _tickParticles(delta);

  const pct = Math.round(POUR.fillLevel * 100);
  _showStatus(`🪣 타설 중... ${pct}% — E 홀드`);

  if (POUR.fillLevel >= 1) {
    // 타설 완료 → 진동기 다짐 단계
    POUR.state = 'vibrating';
    POUR._vibT = 0;
    if (POUR._particles) POUR._particles.pts.visible = false;
    if (POUR._vibRod) POUR._vibRod.visible = true;
    _showStatus('🔧 진동기 다짐 — E 홀드 (5초)');
    if (typeof showActionNotif === 'function') {
      const msg = { ko: '타설 완료! 진동기 다짐을 시작하세요.', en: 'Pour done! Apply vibration compaction.' };
      showActionNotif(msg[(typeof currentLang !== 'undefined') ? currentLang : 'ko'], 3000);
    }
  }
}

// ── 진동기 다짐 틱 ────────────────────────────────────────────
let _vibHoldT = 0;
const VIB_REQUIRED = 5.0; // 5초 홀드

function _tickVibrating(delta, eHeld) {
  if (!eHeld) {
    _vibHoldT = 0;
    _showStatus('🔧 진동기 다짐 — E 홀드 (5초)');
    return;
  }
  _vibHoldT += delta;
  const pct = Math.min(1, _vibHoldT / VIB_REQUIRED);

  // 진동기 봉 진동
  if (POUR._vibRod) {
    POUR._vibRod.position.x += (Math.random() - 0.5) * 0.012;
    POUR._vibRod.position.z += (Math.random() - 0.5) * 0.012;
  }
  _showStatus(`🔧 진동기 다짐 ${Math.round(pct*100)}%`);

  if (_vibHoldT >= VIB_REQUIRED) {
    // 다짐 완료 → 양생 시작
    POUR.state = 'curing';
    POUR.cureProgress = 0;
    if (POUR._vibRod) POUR._vibRod.visible = false;
    _showStatus('⏳ 양생 중...');
    if (typeof showActionNotif === 'function') {
      const msg = { ko: '다짐 완료! 양생 중입니다.', en: 'Compaction done! Curing in progress.' };
      showActionNotif(msg[(typeof currentLang !== 'undefined') ? currentLang : 'ko'], 3000);
    }
  }
}

// ── 양생 틱 ──────────────────────────────────────────────────
function _tickCuring(delta) {
  POUR.cureProgress = Math.min(1, POUR.cureProgress + delta / POUR.CURE_DURATION);

  // 콘크리트 색상: 젖은 진회색(0x585858) → 양생(0xC4BEB4)
  if (POUR._fillMesh) {
    const wet  = new THREE.Color(0x585858);
    const dry  = new THREE.Color(0xC4BEB4);
    POUR._fillMesh.material.color.lerpColors(wet, dry, POUR.cureProgress);
    POUR._fillMesh.material.roughness = 0.3 + POUR.cureProgress * 0.58; // 0.3 → 0.88
  }

  // 진행바 표시
  const blocks = 10;
  const filled = Math.round(POUR.cureProgress * blocks);
  const bar    = '█'.repeat(filled) + '░'.repeat(blocks - filled);
  const days   = Math.round(POUR.cureProgress * 28);
  const lang   = (typeof currentLang !== 'undefined') ? currentLang : 'ko';
  const dayLabel = lang === 'ko' ? `${days}일` : `Day ${days}`;
  _showStatus(`⏳ 양생 중 [${bar}] ${dayLabel}/28일`);

  if (POUR.cureProgress >= 1) {
    POUR.state = 'cured';
    _showStatus(null);
    _onCureComplete();
  }
}

function _onCureComplete() {
  if (typeof showActionNotif === 'function') {
    const msg = { ko: '✅ 양생 완료! 거푸집을 해체하세요.', en: '✅ Curing complete! Strip the formwork.' };
    showActionNotif(msg[(typeof currentLang !== 'undefined') ? currentLang : 'ko'], 4000);
  }

  // 거푸집 패널에 E키 마커 부여
  if (!POUR._formwork) return;
  POUR._formwork.panels.forEach((panel, i) => {
    panel.userData.strippable = true;
    panel.userData.panelIdx   = i;
    // GAME.interactables 에 추가 (interaction.js 가 E키 감지)
    if (GAME.interactables) {
      GAME.interactables.push({
        mesh:    panel,
        type:    'formwork_panel',
        label:   { ko: '거푸집 해체 [E]', en: 'Strip formwork [E]' },
        onInteract: () => _stripPanel(panel),
      });
    }
  });

  POUR.state = 'stripping';
}

// ── 거푸집 패널 해체 ──────────────────────────────────────────
function _stripPanel(panel) {
  if (!panel || !panel.parent) return;

  // 패널 제거 애니메이션 (측면으로 날아가는 효과)
  const dir = panel.position.clone().normalize();
  dir.y = 0;
  if (dir.lengthSq() < 0.01) dir.set(1, 0, 0);

  let t = 0;
  const startPos = panel.position.clone();
  const targetPos = startPos.clone().addScaledVector(dir, 1.5);
  targetPos.y += 0.4;

  function animateStrip() {
    t += 0.04;
    if (t >= 1) {
      if (panel.parent) panel.parent.remove(panel);
      if (panel.geometry) panel.geometry.dispose();
      if (panel.material) panel.material.dispose();
      // interactables 에서 제거
      if (GAME.interactables) {
        GAME.interactables = GAME.interactables.filter(x => x.mesh !== panel);
      }
      // 모든 패널 제거됐는지 확인
      _checkAllStripped();
      return;
    }
    const ease = t * (2 - t); // ease-out
    panel.position.lerpVectors(startPos, targetPos, ease);
    panel.rotation.z += 0.08;
    requestAnimationFrame(animateStrip);
  }
  requestAnimationFrame(animateStrip);

  if (typeof showActionNotif === 'function') {
    const msg = { ko: '거푸집 패널 해체!', en: 'Panel stripped!' };
    showActionNotif(msg[(typeof currentLang !== 'undefined') ? currentLang : 'ko'], 1200);
  }
}

function _checkAllStripped() {
  if (!POUR._formwork) return;
  const remaining = POUR._formwork.panels.filter(p => p.parent !== null);
  if (remaining.length === 0) {
    POUR.state = 'stripped';
    // 거푸집 그룹(봉재 등) 제거
    if (POUR._formwork.group.parent) {
      POUR._formwork.group.parent.remove(POUR._formwork.group);
    }
    if (typeof showActionNotif === 'function') {
      const msg = { ko: '✅ 거푸집 해체 완료! 콘크리트 구조체가 드러났습니다.', en: '✅ Formwork stripped! Concrete structure revealed.' };
      showActionNotif(msg[(typeof currentLang !== 'undefined') ? currentLang : 'ko'], 4000);
    }
    // phase_v4 다음 단계로
    if (typeof onV4ActComplete === 'function') {
      onV4ActComplete({ markerId: 'pour_strip_complete' });
    }
  }
}

// ── fillMesh 높이 업데이트 ────────────────────────────────────
function _updateFillMesh() {
  if (!POUR._fillMesh || !POUR._formwork) return;
  const { innerW, innerD, innerH, center } = POUR._formwork;
  const thick = 0.06;
  const h = POUR.fillLevel * innerH;
  if (h < 0.001) return;

  // BoxGeometry 를 직접 scale 로 대체 (GC 최소화)
  POUR._fillMesh.scale.set(1, Math.max(0.001, POUR.fillLevel), 1);
  const baseY = (center.y || 0) + 0.001;
  POUR._fillMesh.position.y = baseY + (innerH * POUR.fillLevel) / 2;

  // geometry 가 innerH 높이의 box 여야 함 — 최초 한 번만 재생성
  if (!POUR._fillMesh._initialized) {
    POUR._fillMesh._initialized = true;
    POUR._fillMesh.geometry.dispose();
    POUR._fillMesh.geometry = new THREE.BoxGeometry(
      innerW - thick * 2,
      innerH,
      innerD - thick * 2
    );
    POUR._fillMesh.scale.set(1, 0.001, 1);
  }
  POUR._fillMesh.scale.y = Math.max(0.001, POUR.fillLevel);
  POUR._fillMesh.position.y = baseY + (innerH * POUR.fillLevel) / 2;
}

// ── 파티클 틱 ─────────────────────────────────────────────────
function _tickParticles(delta) {
  const p = POUR._particles;
  if (!p || !POUR._hosePos) return;

  const pos   = p.pos;
  const vel   = p.vel;
  const count = p.count;
  const hose  = POUR._hosePos;

  // 새 입자 스폰 (매 프레임 랜덤하게)
  const spawnCount = Math.floor(3 + Math.random() * 4);
  for (let s = 0; s < spawnCount; s++) {
    const i = Math.floor(Math.random() * count);
    pos[i*3]   = hose.x + (Math.random() - 0.5) * 0.15;
    pos[i*3+1] = hose.y;
    pos[i*3+2] = hose.z + (Math.random() - 0.5) * 0.15;
    vel[i*3]   = (Math.random() - 0.5) * 0.5;
    vel[i*3+1] = -1.8 - Math.random() * 1.2; // 하향
    vel[i*3+2] = (Math.random() - 0.5) * 0.5;
  }

  // 물리 업데이트
  const groundY = POUR._formwork
    ? (POUR._formwork.center.y || 0) + POUR.fillLevel * POUR._formwork.innerH
    : 0;

  for (let i = 0; i < count; i++) {
    vel[i*3+1] -= 6 * delta; // 중력
    pos[i*3]   += vel[i*3]   * delta;
    pos[i*3+1] += vel[i*3+1] * delta;
    pos[i*3+2] += vel[i*3+2] * delta;
    // 콘크리트 표면 충돌
    if (pos[i*3+1] < groundY) {
      pos[i*3+1] = groundY;
      vel[i*3+1] = 0;
      vel[i*3]  *= 0.2;
      vel[i*3+2] *= 0.2;
    }
  }

  p.geo.attributes.position.needsUpdate = true;
}

// ── 메인 틱 ──────────────────────────────────────────────────
function tickPour(delta) {
  POUR._t += delta;

  const eHeld = typeof PLAYER !== 'undefined' && !!PLAYER.keys['KeyE'];

  switch (POUR.state) {
    case 'pouring':
      if (eHeld) _tickPour(delta);
      else { pausePour(); _showStatus('타설 중단 — E 홀드로 계속'); }
      break;
    case 'vibrating':
      _tickVibrating(delta, eHeld);
      break;
    case 'curing':
      _tickCuring(delta);
      break;
  }
}

// ── 타설 act 정의 (phase_v4 에서 defineAct 호출) ─────────────
const POUR_ACT_DEF = {
  id:       'start_pour',
  label:    { ko: '타설 시작 (E홀드)', en: 'Start Pour (hold E)' },
  duration: 0.5, // 짧게 — 타설 자체는 tickPour 가 처리
  hazardEffect: { zone_foundation: { collapse: -0.2 } },
  completeMsg: { ko: '타설 시작!', en: 'Pour started!' },
  onComplete: ({ markerId }) => {
    startPour();
    if (typeof completeMarker === 'function') completeMarker(markerId);
  },
};

// ── 공개 API ─────────────────────────────────────────────────
window.POUR             = POUR;
window.registerFormwork = registerFormwork;
window.startPour        = startPour;
window.tickPour         = tickPour;
window.POUR_ACT_DEF     = POUR_ACT_DEF;
