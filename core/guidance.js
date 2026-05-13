// guidance.js — 플레이어 안내 시스템
// ① 게임 시작 조작법 오버레이  ② 마커 위 3D 비콘  ③ 화면 가장자리 방향 화살표

const GUIDANCE = {
  _beacons:     [],   // { marker, mesh, label }
  _arrowEl:     null, // 화면 가장자리 방향 화살표 DOM
  _controlsEl:  null, // 조작법 오버레이 DOM
  _phaseDotsEl: null, // 페이즈 진행 점 DOM
  _t:           0,
};

// ── 초기화 ────────────────────────────────────────────────────
function initGuidance() {
  _buildControlsOverlay();
  _buildArrowEl();
  _buildPhaseDotsEl();
}

// ── 매 프레임 ─────────────────────────────────────────────────
function updateGuidance(delta) {
  GUIDANCE._t += delta;

  _syncBeacons();
  _tickBeacons();
  _updateArrow();
  _updatePhaseDots();
}

// ── 1. 조작법 오버레이 ────────────────────────────────────────
function _buildControlsOverlay() {
  if (GUIDANCE._controlsEl) return;
  const el = document.createElement('div');
  el.id = 'guidance-controls';
  el.style.cssText = [
    'position:fixed', 'bottom:80px', 'right:20px',
    'background:rgba(0,0,0,0.70)', 'color:#ddd',
    'padding:14px 18px', 'border-radius:8px',
    'font-family:monospace', 'font-size:12px', 'line-height:1.9',
    'z-index:3500', 'pointer-events:none',
    'border:1px solid rgba(255,255,255,0.08)',
    'transition:opacity 0.6s',
  ].join(';');
  el.innerHTML = `
    <div style="font-size:11px;opacity:0.5;margin-bottom:6px;letter-spacing:1px">CONTROLS</div>
    <div><kbd style="${_kbdStyle()}">W A S D</kbd> 이동</div>
    <div><kbd style="${_kbdStyle()}">마우스</kbd> 시점</div>
    <div><kbd style="${_kbdStyle()}">E</kbd> 상호작용 / 홀드: 행위 수행</div>
    <div><kbd style="${_kbdStyle()}">G</kbd> 자재 내려놓기</div>
    <div><kbd style="${_kbdStyle()}">Shift</kbd> 달리기</div>
    <div><kbd style="${_kbdStyle()}">V</kbd> 카메라 전환</div>
    <div style="margin-top:8px;opacity:0.45;font-size:10px">노란 링에 접근 → E 홀드로 작업</div>
  `;
  document.body.appendChild(el);
  GUIDANCE._controlsEl = el;

  // 30초 후 투명하게 → 60초 후 제거
  setTimeout(() => { el.style.opacity = '0.3'; }, 30000);
  setTimeout(() => { el.style.opacity = '0';   }, 50000);
  setTimeout(() => { el.remove(); GUIDANCE._controlsEl = null; }, 51000);
}

function _kbdStyle() {
  return [
    'display:inline-block', 'background:rgba(255,255,255,0.12)',
    'border:1px solid rgba(255,255,255,0.25)', 'border-radius:3px',
    'padding:1px 5px', 'font-size:11px', 'font-family:monospace',
    'margin-right:4px',
  ].join(';');
}

// ── 2. 3D 비콘 (마커 위 빛기둥) ──────────────────────────────
function _syncBeacons() {
  if (typeof MARKERS === 'undefined') return;

  // 새로 생긴 마커에 비콘 추가
  MARKERS.forEach(m => {
    if (m.state === 'done') return;
    if (GUIDANCE._beacons.find(b => b.markerId === m.id)) return;
    _addBeacon(m);
  });

  // 완료된 마커 비콘 제거
  GUIDANCE._beacons = GUIDANCE._beacons.filter(b => {
    const m = (typeof MARKERS !== 'undefined') ? MARKERS.find(x => x.id === b.markerId) : null;
    if (!m || m.state === 'done') {
      _removeBeacon(b);
      return false;
    }
    return true;
  });
}

function _addBeacon(marker) {
  const group = new THREE.Group();

  // 빛기둥 (CylinderGeometry, 위로 늘어남)
  const colGeo = new THREE.CylinderGeometry(0.04, 0.25, 4.5, 12, 1, true);
  const colMat = new THREE.MeshBasicMaterial({
    color: 0xFFBB00, transparent: true, opacity: 0.22,
    side: THREE.DoubleSide, depthWrite: false,
  });
  const col = new THREE.Mesh(colGeo, colMat);
  col.position.y = 2.25;
  group.add(col);

  // 상단 다이아몬드
  const diaGeo = new THREE.OctahedronGeometry(0.22, 0);
  const diaMat = new THREE.MeshBasicMaterial({ color: 0xFFCC00, transparent: true, opacity: 0.9 });
  const dia = new THREE.Mesh(diaGeo, diaMat);
  dia.position.y = 4.8;
  group.add(dia);

  // 링 (지상 강조)
  const ringGeo = new THREE.RingGeometry(0.6, 0.85, 32);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xFFCC00, side: THREE.DoubleSide, transparent: true, opacity: 0.5,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  group.add(ring);

  group.position.set(marker.position.x, 0.01, marker.position.z);
  GAME.scene.add(group);

  // 거리 레이블 (CSS2DObject 없으면 sprite 로 대체)
  const labelSprite = _makeTextSprite(marker.label);

  GUIDANCE._beacons.push({
    markerId: marker.id,
    group,
    col, colMat,
    dia, diaMat,
    ring, ringMat,
    label: labelSprite,
    _t: Math.random() * Math.PI * 2,
  });
}

function _removeBeacon(b) {
  if (b.group && b.group.parent) b.group.parent.remove(b.group);
  if (b.label && b.label.parent) b.label.parent.remove(b.label);
  [b.col, b.dia, b.ring].forEach(m => {
    if (m.geometry) m.geometry.dispose();
    if (m.material) m.material.dispose();
  });
  if (b.label) {
    if (b.label.material.map) b.label.material.map.dispose();
    b.label.material.dispose();
  }
}

function _tickBeacons() {
  const t = GUIDANCE._t;
  GUIDANCE._beacons.forEach(b => {
    b._t += 0.016;
    // 다이아몬드 회전 + 부유
    b.dia.rotation.y = b._t * 1.8;
    b.dia.position.y = 4.8 + Math.sin(b._t * 2.2) * 0.15;
    // 기둥 파동 투명도
    b.colMat.opacity = 0.12 + Math.sin(b._t * 1.5) * 0.10;
    // 링 확장 파동
    const s = 1.0 + Math.sin(b._t * 2.0) * 0.12;
    b.ring.scale.set(s, 1, s);
    b.ringMat.opacity = 0.3 + Math.sin(b._t * 2.0) * 0.2;

    // 플레이어와 거리에 따라 기둥 밝기
    if (typeof PLAYER !== 'undefined') {
      const dx = PLAYER.worldPos.x - b.group.position.x;
      const dz = PLAYER.worldPos.z - b.group.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const near = dist < 3.5;
      b.diaMat.opacity = near ? 0.5 : 0.9;

      // 레이블 위치 업데이트
      if (b.label) {
        b.label.position.set(
          b.group.position.x,
          5.4,
          b.group.position.z
        );
        // 거리 표시 업데이트
        const distText = dist < 1.5 ? '[E 홀드]' : `${Math.round(dist)}m`;
        if (b.label._distText !== distText) {
          b.label._distText = distText;
          _updateSpriteText(b);
        }
      }
    }
  });
}

// ── 텍스트 스프라이트 ──────────────────────────────────────────
function _makeTextSprite(labelObj) {
  const lang = (typeof currentLang !== 'undefined') ? currentLang : 'ko';
  const text  = (labelObj && (labelObj[lang] || labelObj.ko)) || '';

  const canvas = document.createElement('canvas');
  canvas.width  = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  _roundRect(ctx, 4, 4, 248, 56, 8);
  ctx.fill();

  ctx.fillStyle = '#FFCC00';
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(text, 128, 26);

  ctx.fillStyle = '#aaa';
  ctx.font = '13px monospace';
  ctx.fillText('', 128, 46); // 거리는 _updateSpriteText 에서

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(2.2, 0.55, 1);
  sprite._labelObj = labelObj;
  sprite._distText = '';
  GAME.scene.add(sprite);
  return sprite;
}

function _updateSpriteText(b) {
  const sprite   = b.label;
  const labelObj = sprite._labelObj;
  const lang     = (typeof currentLang !== 'undefined') ? currentLang : 'ko';
  const text     = (labelObj && (labelObj[lang] || labelObj.ko)) || '';
  const dist     = sprite._distText;

  const canvas = document.createElement('canvas');
  canvas.width  = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'rgba(0,0,0,0.60)';
  _roundRect(ctx, 4, 4, 248, 56, 8);
  ctx.fill();

  ctx.fillStyle = '#FFCC00';
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(text, 128, 26);

  ctx.fillStyle = dist === '[E 홀드]' ? '#4ade80' : '#aaa';
  ctx.font = '13px monospace';
  ctx.fillText(dist, 128, 46);

  sprite.material.map.dispose();
  sprite.material.map = new THREE.CanvasTexture(canvas);
  sprite.material.needsUpdate = true;
}

function _roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ── 3. 화면 가장자리 방향 화살표 ──────────────────────────────
function _buildArrowEl() {
  if (GUIDANCE._arrowEl) return;
  const el = document.createElement('div');
  el.id = 'guidance-arrow';
  el.style.cssText = [
    'position:fixed', 'width:36px', 'height:36px',
    'pointer-events:none', 'z-index:3400', 'display:none',
    'align-items:center', 'justify-content:center',
  ].join(';');
  el.innerHTML = `
    <svg width="36" height="36" viewBox="0 0 36 36">
      <polygon points="18,4 30,28 18,22 6,28" fill="#FFCC00" opacity="0.9"/>
    </svg>
    <span id="guidance-arrow-dist" style="
      position:absolute; bottom:-16px; left:50%; transform:translateX(-50%);
      font-family:monospace; font-size:10px; color:#FFCC00; white-space:nowrap;
      text-shadow:0 0 4px #000;
    "></span>
  `;
  document.body.appendChild(el);
  GUIDANCE._arrowEl = el;
}

function _updateArrow() {
  const el = GUIDANCE._arrowEl;
  if (!el || typeof MARKERS === 'undefined' || typeof PLAYER === 'undefined') return;

  // 가장 가까운 pending 마커
  let nearest = null, nearestDist = Infinity;
  MARKERS.forEach(m => {
    if (m.state !== 'pending') return;
    const dx = m.position.x - PLAYER.worldPos.x;
    const dz = m.position.z - PLAYER.worldPos.z;
    const d  = Math.sqrt(dx * dx + dz * dz);
    if (d < nearestDist) { nearestDist = d; nearest = m; }
  });

  if (!nearest || nearestDist < 3.0) {
    el.style.display = 'none';
    return;
  }

  // 화면상 위치 계산
  const worldPos = nearest.position.clone().setY(1.7);
  const projected = worldPos.project(GAME.camera);

  // 화면 내부면 화살표 숨김
  if (projected.z < 1 && Math.abs(projected.x) < 0.88 && Math.abs(projected.y) < 0.88) {
    el.style.display = 'none';
    return;
  }

  // 화면 가장자리로 클램프
  const margin = 52;
  const hw = innerWidth  / 2;
  const hh = innerHeight / 2;
  const sx = projected.x *  hw + hw;
  const sy = projected.y * -hh + hh;

  // 중심에서 방향 벡터 → 화면 경계로 클램프
  const cx = hw, cy = hh;
  const dx = sx - cx, dy = sy - cy;
  const angle = Math.atan2(dy, dx);
  const edgeX = Math.cos(angle) * (hw - margin) + cx;
  const edgeY = Math.sin(angle) * (hh - margin) + cy;

  el.style.display = 'flex';
  el.style.left  = `${Math.round(edgeX - 18)}px`;
  el.style.top   = `${Math.round(edgeY - 18)}px`;

  // 화살표 회전 (SVG 기본이 위쪽을 가리킴)
  const deg = (angle * 180 / Math.PI) + 90;
  el.querySelector('svg').style.transform = `rotate(${deg}deg)`;

  // 거리 표시
  const distEl = document.getElementById('guidance-arrow-dist');
  if (distEl) distEl.textContent = `${Math.round(nearestDist)}m`;

  // 마커가 카메라 뒤에 있으면 반전
  if (projected.z > 1) {
    const svgEl = el.querySelector('svg');
    svgEl.style.transform = `rotate(${deg + 180}deg)`;
  }
}

// ── 4. 페이즈 진행 점 (상단 중앙) ────────────────────────────
function _buildPhaseDotsEl() {
  if (GUIDANCE._phaseDotsEl) return;
  const el = document.createElement('div');
  el.id = 'guidance-phase-dots';
  el.style.cssText = [
    'position:fixed', 'top:52px', 'left:50%', 'transform:translateX(-50%)',
    'display:flex', 'gap:8px', 'align-items:center',
    'pointer-events:none', 'z-index:3300', 'display:none',
  ].join(';');
  document.body.appendChild(el);
  GUIDANCE._phaseDotsEl = el;
}

function _updatePhaseDots() {
  const el = GUIDANCE._phaseDotsEl;
  if (!el) return;
  if (typeof PHASE_V4 === 'undefined' || !PHASE_V4._started) {
    el.style.display = 'none';
    return;
  }

  el.style.display = 'flex';
  const total   = 5;
  const current = PHASE_V4.current;

  // 매 프레임 재계산 방지 (현재 페이즈 변경 시에만)
  if (el._lastPhase === current) return;
  el._lastPhase = current;

  el.innerHTML = '';
  for (let i = 1; i <= total; i++) {
    const dot = document.createElement('div');
    const done = i < current;
    const active = i === current;
    dot.style.cssText = [
      `width:${active ? 10 : 8}px`,
      `height:${active ? 10 : 8}px`,
      'border-radius:50%',
      `background:${done ? '#4ade80' : active ? '#FFCC00' : 'rgba(255,255,255,0.25)'}`,
      `box-shadow:${active ? '0 0 8px #FFCC00' : 'none'}`,
      'transition:all 0.3s',
    ].join(';');
    el.appendChild(dot);
    if (i < total) {
      const line = document.createElement('div');
      line.style.cssText = `width:16px;height:2px;background:${done ? '#4ade80' : 'rgba(255,255,255,0.15)'};border-radius:1px;`;
      el.appendChild(line);
    }
  }

  // 페이즈 레이블 (점 오른쪽)
  const phaseNames = ['굴착', '기초', '골조', '외장', '마감'];
  const lbl = document.createElement('span');
  lbl.style.cssText = 'margin-left:10px;font-family:monospace;font-size:11px;color:#FFCC00;opacity:0.8;';
  lbl.textContent = phaseNames[current - 1] || '';
  el.appendChild(lbl);
}

// ── 공개 API ─────────────────────────────────────────────────
function showControlsOverlay() {
  // 이미 제거됐으면 다시 생성
  if (!GUIDANCE._controlsEl) _buildControlsOverlay();
  else GUIDANCE._controlsEl.style.opacity = '1';
}

window.GUIDANCE          = GUIDANCE;
window.initGuidance      = initGuidance;
window.updateGuidance    = updateGuidance;
window.showControlsOverlay = showControlsOverlay;
