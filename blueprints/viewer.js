// Blueprint Viewer — Canvas 기반 2D 도면 렌더러
// 평면도(Plan) · 입면도(Elevation) · 줄걸이(Rigging) 3탭

const BLUEPRINT = {
  _activeTab: 'plan',
  _open: false,
};

// ── i18n 라벨 ───────────────────────────────────────────────────
const _BPL = {
  title:      { ko: '📐 작업 도면',  en: '📐 Work Blueprint', vi: '📐 Bản vẽ',       ar: '📐 مخطط العمل' },
  tabPlan:    { ko: '평면도',        en: 'Plan View',         vi: 'Mặt bằng',       ar: 'المسقط' },
  tabElev:    { ko: '입면도',        en: 'Elevation',         vi: 'Mặt đứng',       ar: 'الواجهة' },
  tabRig:     { ko: '줄걸이 도면',   en: 'Rigging Diagram',   vi: 'Sơ đồ buộc móc', ar: 'مخطط الربط' },
  close:      { ko: '닫기',          en: 'Close',             vi: 'Đóng',            ar: 'إغلاق' },
  crane:      { ko: '크레인',        en: 'Crane',             vi: 'Cần cẩu',         ar: 'الرافعة' },
  beam:       { ko: 'RC 보',         en: 'RC Beam',           vi: 'Dầm RC',          ar: 'عارضة RC' },
  building:   { ko: '건물 (건설 중)',en: 'Building (WIP)',    vi: 'Tòa nhà',         ar: 'المبنى' },
  target:     { ko: '거치 위치',     en: 'Target',            vi: 'Vị trí đặt',     ar: 'الموضع المستهدف' },
  dangerZone: { ko: '위험 반경',     en: 'Danger Zone',       vi: 'Vùng nguy hiểm', ar: 'منطقة الخطر' },
  slingAngle: { ko: '인양각도',      en: 'Sling Angle',       vi: 'Góc dây đai',    ar: 'زاوية الحبل' },
  loadPerLine:{ ko: '줄당 장력',     en: 'Tension/Line',      vi: 'Lực căng/dây',   ar: 'الشد/خيط' },
  usageRate:  { ko: '사용률',        en: 'Usage Rate',        vi: 'Tỷ lệ SD',       ar: 'معدل الاستخدام' },
  revLabel:   { ko: '개정',          en: 'Rev',               vi: 'Rev',             ar: 'مراجعة' },
  scaleLabel: { ko: '축척 NTS',      en: 'Scale NTS',         vi: 'Tỷ lệ NTS',      ar: 'مقياس NTS' },
};
function _bl(key) {
  const lang = typeof currentLang !== 'undefined' ? currentLang : 'ko';
  return (_BPL[key] && (_BPL[key][lang] || _BPL[key].ko)) || key;
}

// ── 패널 열기 ────────────────────────────────────────────────────
function openBlueprintPanel() {
  if (typeof document === 'undefined') return;
  document.exitPointerLock?.();
  if (typeof INTERACTION !== 'undefined') INTERACTION.popupOpen = true;
  BLUEPRINT._open = true;

  const panel = document.getElementById('blueprint-panel');
  if (!panel) return;
  panel.classList.remove('hidden');
  _updateBlueprintUI();
  _renderTab(BLUEPRINT._activeTab);
}

function closeBlueprintPanel() {
  BLUEPRINT._open = false;
  if (typeof INTERACTION !== 'undefined') INTERACTION.popupOpen = false;
  const panel = document.getElementById('blueprint-panel');
  if (panel) panel.classList.add('hidden');
  if (typeof GAME !== 'undefined' && GAME.state?.gameStarted && !GAME.state?.gameOver
      && window.matchMedia('(pointer: fine)').matches) {
    document.getElementById('gameCanvas')?.requestPointerLock();
  }
}

// ── UI 라벨 업데이트 (언어 반영) ─────────────────────────────────
function _updateBlueprintUI() {
  _setTxt('bp-title', _bl('title'));
  _setTxt('bp-tab-plan', _bl('tabPlan'));
  _setTxt('bp-tab-elev', _bl('tabElev'));
  _setTxt('bp-tab-rig',  _bl('tabRig'));
  _setTxt('bp-close-btn', _bl('close'));

  // 탭 active 클래스
  ['plan','elev','rig'].forEach(t => {
    const el = document.getElementById('bp-tab-' + t);
    if (el) el.classList.toggle('active', BLUEPRINT._activeTab === t);
  });

  // 메타 정보
  const bp = typeof BLUEPRINT_LIFTING !== 'undefined' ? BLUEPRINT_LIFTING : null;
  if (bp) {
    _setTxt('bp-meta-rev',    `${_bl('revLabel')} ${bp.meta.rev}`);
    _setTxt('bp-meta-date',   bp.meta.date);
    _setTxt('bp-meta-kosha',  bp.meta.kosha);
    _setTxt('bp-meta-scale',  _bl('scaleLabel'));
  }
}
function _setTxt(id, txt) {
  const el = document.getElementById(id);
  if (el) el.textContent = txt;
}

// ── 탭 전환 ─────────────────────────────────────────────────────
function switchBlueprintTab(tab) {
  BLUEPRINT._activeTab = tab;
  _updateBlueprintUI();
  _renderTab(tab);
}

// ── 캔버스 렌더 분기 ─────────────────────────────────────────────
function _renderTab(tab) {
  const canvas = document.getElementById('bp-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  _drawGrid(ctx, canvas);
  if (tab === 'plan') _drawPlan(ctx, canvas);
  else if (tab === 'elev') _drawElevation(ctx, canvas);
  else if (tab === 'rig')  _drawRigging(ctx, canvas);
  _drawTitleBlock(ctx, canvas);
}

// ── 공통: 도면 배경 그리드 ──────────────────────────────────────
function _drawGrid(ctx, canvas) {
  ctx.fillStyle = '#F0EDE6';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#D4CEBD';
  ctx.lineWidth = 0.5;
  const step = 30;
  for (let x = 0; x < canvas.width; x += step) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += step) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }

  // 도면 외곽 테두리
  ctx.strokeStyle = '#3A3228';
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 60);
}

// ── 탭 1: 평면도 ─────────────────────────────────────────────────
function _drawPlan(ctx, canvas) {
  if (typeof BLUEPRINT_LIFTING === 'undefined') return;
  const bp = BLUEPRINT_LIFTING.plan;

  // 월드 좌표 → 캔버스 좌표 변환
  // 월드: x ∈ [-25, 25], z ∈ [-25, 5] → 캔버스: 20px 여백
  const W = canvas.width - 20, H = canvas.height - 70;
  const ox = 10, oy = 15; // 원점 오프셋

  const wx0 = -22, wx1 = 22, wz0 = -24, wz1 = 8;
  const sx = W / (wx1 - wx0);
  const sz = H / (wz1 - wz0);
  const toC = (wx, wz) => ({ x: ox + (wx - wx0) * sx, y: oy + (wz - wz0) * sz });

  // ── 크레인 작업반경 ────────────────────────────
  const cPos = toC(bp.crane.x, bp.crane.z);
  ctx.save();
  ctx.strokeStyle = '#E53E3E';
  ctx.setLineDash([6, 4]);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(cPos.x, cPos.y, bp.craneRadius * sx, 0, Math.PI * 2);
  ctx.stroke();

  // 위험반경 내부
  ctx.fillStyle = 'rgba(229,62,62,0.06)';
  ctx.beginPath();
  ctx.arc(cPos.x, cPos.y, bp.craneRadius * sx, 0, Math.PI * 2);
  ctx.fill();
  ctx.setLineDash([]);
  ctx.restore();

  // ── 건물 외곽 ────────────────────────────────
  const bPos = toC(bp.building.x, bp.building.z);
  ctx.fillStyle = 'rgba(49,130,206,0.12)';
  ctx.strokeStyle = '#2B6CB0';
  ctx.lineWidth = 2;
  const bW = bp.building.w * sx, bD = bp.building.d * sz;
  ctx.fillRect(bPos.x, bPos.y, bW, bD);
  ctx.strokeRect(bPos.x, bPos.y, bW, bD);

  // 해치 (건설 중)
  ctx.save();
  ctx.strokeStyle = '#2B6CB0';
  ctx.lineWidth = 0.7;
  ctx.setLineDash([4, 4]);
  for (let i = -20; i < 20; i++) {
    const x1 = bPos.x + i * 10, y1 = bPos.y;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + bD, y1 + bD); ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();

  _label(ctx, bPos.x + bW / 2, bPos.y + bD / 2, _bl('building'), '#2B6CB0', 10);

  // ── RC 보 ────────────────────────────────────
  const bmPos = toC(bp.beam.x, bp.beam.z);
  ctx.fillStyle = '#D69E2E';
  ctx.strokeStyle = '#744210';
  ctx.lineWidth = 1.5;
  const blen = bp.beam.len * sx, bwid = bp.beam.w * sz * 2;
  ctx.fillRect(bmPos.x - blen / 2, bmPos.y - bwid / 2, blen, bwid);
  ctx.strokeRect(bmPos.x - blen / 2, bmPos.y - bwid / 2, blen, bwid);
  _label(ctx, bmPos.x, bmPos.y - bwid / 2 - 8, _bl('beam'), '#744210', 10);

  // ── 인양 경로 화살표 ──────────────────────────
  const tPos = toC(bp.target.x, bp.target.z);
  ctx.strokeStyle = '#38A169';
  ctx.fillStyle   = '#38A169';
  ctx.lineWidth   = 1.5;
  ctx.setLineDash([5, 3]);
  ctx.beginPath(); ctx.moveTo(bmPos.x, bmPos.y); ctx.lineTo(tPos.x, tPos.y); ctx.stroke();
  ctx.setLineDash([]);
  _arrowHead(ctx, tPos.x, tPos.y, bmPos.x, bmPos.y);
  _label(ctx, tPos.x + 12, tPos.y, _bl('target'), '#38A169', 9);

  // ── 크레인 마스트 ─────────────────────────────
  ctx.fillStyle = '#D69E2E';
  ctx.strokeStyle = '#744210';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cPos.x, cPos.y, 6, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  _label(ctx, cPos.x + 10, cPos.y - 10, _bl('crane'), '#744210', 10);

  // ── 마커 (신호수, 사무실) ─────────────────────
  bp.markers.forEach(m => {
    const mp = toC(m.x, m.z);
    ctx.fillStyle = m.color;
    ctx.beginPath();
    ctx.arc(mp.x, mp.y, 5, 0, Math.PI * 2);
    ctx.fill();
    _label(ctx, mp.x + 8, mp.y, m.label, m.color, 9);
  });

  // 반경 라벨
  _label(ctx, cPos.x + bp.craneRadius * sx * 0.7, cPos.y - 8, `R=${bp.craneRadius}m`, '#E53E3E', 9);

  // 방위 (N 화살표)
  _drawNorthArrow(ctx, canvas.width - 40, oy + 20);
}

// ── 탭 2: 입면도 ─────────────────────────────────────────────────
function _drawElevation(ctx, canvas) {
  if (typeof BLUEPRINT_LIFTING === 'undefined') return;
  const ev = BLUEPRINT_LIFTING.elevation;

  const W = canvas.width - 40, H = canvas.height - 80;
  const ox = 30, oy = 15;
  const maxH = ev.craneHeight + 2;
  const sy = H / maxH;

  // 지반선
  const groundY = oy + H;
  ctx.strokeStyle = '#6B4C2A';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(ox, groundY); ctx.lineTo(ox + W, groundY); ctx.stroke();
  ctx.fillStyle = '#6B4C2A';
  ctx.font = '10px monospace';
  ctx.fillText('G.L. ±0', ox, groundY + 12);

  // 크레인 마스트
  const mastX = ox + W * 0.72;
  ctx.fillStyle = '#B7791F';
  ctx.fillRect(mastX - 8, groundY - ev.craneHeight * sy, 16, ev.craneHeight * sy);

  // 지브 (수평)
  const mastTop = groundY - ev.craneHeight * sy;
  ctx.strokeStyle = '#B7791F';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(mastX - ev.jibLength * sy * 0.5, mastTop);
  ctx.lineTo(mastX + ev.jibLength * sy * 0.15, mastTop); ctx.stroke();

  // 호이스팅 와이어
  const wireX = ox + W * 0.38;
  ctx.strokeStyle = '#4A5568';
  ctx.setLineDash([4, 2]); ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(wireX, mastTop); ctx.lineTo(wireX, groundY - ev.hookHeight * sy); ctx.stroke();
  ctx.setLineDash([]);

  // 훅
  ctx.fillStyle = '#1A202C';
  ctx.beginPath(); ctx.arc(wireX, groundY - ev.hookHeight * sy, 5, 0, Math.PI * 2); ctx.fill();

  // RC 보 (슬링 달린 상태)
  const beamY = groundY - ev.hookHeight * sy + 18;
  ctx.fillStyle = '#D69E2E';
  ctx.strokeStyle = '#744210';
  ctx.lineWidth = 2;
  const blen = 120;
  ctx.fillRect(wireX - blen / 2, beamY, blen, 14);
  ctx.strokeRect(wireX - blen / 2, beamY, blen, 14);
  _label(ctx, wireX, beamY + 24, `${_bl('beam')} (${ev.beamWeight}t)`, '#744210', 10);

  // 슬링 V형
  ctx.strokeStyle = '#9B2C2C';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(wireX - 40, beamY); ctx.lineTo(wireX, groundY - ev.hookHeight * sy + 2);
  ctx.lineTo(wireX + 40, beamY); ctx.stroke();

  // 3층 슬래브 (목표 높이)
  const slabY = groundY - ev.liftTarget * sy;
  ctx.strokeStyle = '#2B6CB0';
  ctx.setLineDash([8, 4]); ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(ox, slabY); ctx.lineTo(ox + W * 0.6, slabY); ctx.stroke();
  ctx.setLineDash([]);
  _label(ctx, ox + 5, slabY - 5, `3F Slab +${ev.liftTarget}m`, '#2B6CB0', 9);

  // 높이 치수선
  _dimLine(ctx, ox + W - 15, mastTop, groundY, ev.craneHeight + 'm', '#555');
  _dimLine(ctx, ox + W - 30, groundY - ev.hookHeight * sy, groundY, ev.hookHeight + 'm', '#4A5568');
}

// ── 탭 3: 줄걸이 도면 ────────────────────────────────────────────
function _drawRigging(ctx, canvas) {
  if (typeof BLUEPRINT_LIFTING === 'undefined') return;
  const rig = BLUEPRINT_LIFTING.rigging;

  const cx = canvas.width / 2, cy = 80;
  const armLen = 110;
  const alphaRad = (rig.alphaAngle / 2) * Math.PI / 180;

  // 훅 포인트
  ctx.fillStyle = '#1A202C';
  ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2); ctx.fill();

  // 슬링 (V형 대칭)
  const lx = cx - armLen * Math.sin(alphaRad);
  const ly = cy + armLen * Math.cos(alphaRad);
  const rx = cx + armLen * Math.sin(alphaRad);
  const ry = ly;

  ctx.strokeStyle = '#9B2C2C';
  ctx.lineWidth   = 3;
  ctx.lineCap     = 'round';
  ctx.beginPath(); ctx.moveTo(cx, cy + 7); ctx.lineTo(lx, ly); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy + 7); ctx.lineTo(rx, ry); ctx.stroke();

  // 슬링 고정점 원
  [lx, rx].forEach(x => {
    ctx.fillStyle = '#9B2C2C';
    ctx.beginPath(); ctx.arc(x, ly, 5, 0, Math.PI * 2); ctx.fill();
  });

  // RC 보
  const beamY = ly + 10;
  ctx.fillStyle = '#D69E2E';
  ctx.strokeStyle = '#744210';
  ctx.lineWidth = 2;
  ctx.fillRect(lx - 10, beamY, rx - lx + 20, 20);
  ctx.strokeRect(lx - 10, beamY, rx - lx + 20, 20);
  _label(ctx, cx, beamY + 30, `${rig.beamWeight} ton`, '#744210', 11);

  // α 각도 호 + 라벨
  const halfA = rig.alphaAngle / 2;
  ctx.strokeStyle = '#2D3748';
  ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + 60); ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = '#553C9A';
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy + 7, 40, Math.PI / 2 - alphaRad, Math.PI / 2 + alphaRad);
  ctx.stroke();
  _label(ctx, cx + 48, cy + 48, `α=${rig.alphaAngle}°`, '#553C9A', 10);

  // 계산값 표 (오른쪽 하단)
  const tx = canvas.width - 180, ty = canvas.height - 150;
  const rows = [
    [_bl('slingAngle'), `α = ${rig.alphaAngle}°`],
    ['K (각도계수)',     rig.K.toFixed(3)],
    [_bl('loadPerLine'), `${rig.Ts.toFixed(3)} ton`],
    ['SWL',              `${rig.slingSwl.toFixed(1)} ton`],
    [_bl('usageRate'),   `${(rig.usageRate * 100).toFixed(1)} %`],
  ];
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillRect(tx - 8, ty - 20, 185, rows.length * 22 + 28);
  ctx.strokeStyle = '#3A3228'; ctx.lineWidth = 1;
  ctx.strokeRect(tx - 8, ty - 20, 185, rows.length * 22 + 28);

  ctx.font = 'bold 10px monospace';
  ctx.fillStyle = '#3A3228';
  ctx.fillText('줄걸이 안전성 검토', tx, ty - 6);
  rows.forEach(([label, val], i) => {
    const rowY = ty + 4 + i * 22;
    ctx.fillStyle = (label === _bl('usageRate') && rig.usageRate <= 1) ? '#38A169' : '#3A3228';
    ctx.font = '9px monospace';
    ctx.fillText(label, tx, rowY + 14);
    ctx.font = 'bold 10px monospace';
    ctx.fillText(val, tx + 110, rowY + 14);
    ctx.strokeStyle = '#C5BAA5'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(tx - 8, rowY + 18); ctx.lineTo(tx + 177, rowY + 18); ctx.stroke();
  });

  // 슬링 규격 라벨
  _label(ctx, lx - 35, cy + armLen * 0.5, `${rig.slingType}\nφ${rig.slingDia}mm`, '#9B2C2C', 9);
}

// ── 타이틀 블록 (도면 하단) ──────────────────────────────────────
function _drawTitleBlock(ctx, canvas) {
  const H = canvas.height, W = canvas.width;
  const bh = 48, by = H - bh;
  ctx.fillStyle = '#E8E2D5';
  ctx.fillRect(10, by, W - 20, bh - 2);
  ctx.strokeStyle = '#3A3228'; ctx.lineWidth = 1.5;
  ctx.strokeRect(10, by, W - 20, bh - 2);

  const bp = typeof BLUEPRINT_LIFTING !== 'undefined' ? BLUEPRINT_LIFTING : { meta: {} };
  ctx.fillStyle = '#1A202C'; ctx.font = 'bold 11px monospace';
  ctx.fillText('BULSA — S01 줄걸이·인양 작업', 20, by + 16);
  ctx.font = '9px monospace'; ctx.fillStyle = '#4A5568';
  ctx.fillText(`${bp.meta.kosha || ''}  ·  ${_bl('revLabel')} ${bp.meta.rev || 'R01'}  ·  ${bp.meta.date || ''}  ·  ${_bl('scaleLabel')}`, 20, by + 30);

  // 우측 상태
  const state = typeof LIFT_STATE !== 'undefined' ? LIFT_STATE : {};
  const done = [state.planWritten, state.safetyChecked, state.outriggerExtended,
                state.slingInspected, state.signalAssigned].filter(Boolean).length;
  ctx.fillStyle = done >= 5 ? '#38A169' : '#D69E2E';
  ctx.font = 'bold 10px monospace';
  ctx.fillText(`Phase ${done}/5`, W - 80, by + 20);
}

// ── 헬퍼 함수 ────────────────────────────────────────────────────
function _label(ctx, x, y, text, color, size) {
  ctx.save();
  ctx.fillStyle = color || '#1A202C';
  ctx.font = `${size || 10}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y);
  ctx.textAlign = 'left';
  ctx.restore();
}

function _arrowHead(ctx, tx, ty, fx, fy) {
  const ang = Math.atan2(ty - fy, tx - fx);
  const size = 8;
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(tx - size * Math.cos(ang - 0.4), ty - size * Math.sin(ang - 0.4));
  ctx.lineTo(tx - size * Math.cos(ang + 0.4), ty - size * Math.sin(ang + 0.4));
  ctx.closePath();
  ctx.fill();
}

function _dimLine(ctx, x, y1, y2, label, color) {
  ctx.save();
  ctx.strokeStyle = color || '#555'; ctx.fillStyle = color || '#555';
  ctx.lineWidth = 1;
  // 수직선 + 양끝 티크
  ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y2); ctx.stroke();
  [y1, y2].forEach(y => {
    ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x + 4, y); ctx.stroke();
  });
  ctx.font = '9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(label, x, (y1 + y2) / 2 - 4);
  ctx.restore();
}

function _drawNorthArrow(ctx, x, y) {
  ctx.save();
  ctx.strokeStyle = '#2D3748'; ctx.fillStyle = '#2D3748';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x, y + 14); ctx.lineTo(x, y - 4); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y - 4); ctx.lineTo(x - 5, y + 4); ctx.lineTo(x + 5, y + 4);
  ctx.closePath(); ctx.fill();
  ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
  ctx.fillText('N', x, y - 8);
  ctx.restore();
}

// ── 초기화: 인터랙터블 + ESC 닫기 후크 ─────────────────────────
function initBlueprintViewer() {
  document.addEventListener('keydown', e => {
    if (e.code === 'KeyB' && typeof INTERACTION !== 'undefined'
        && !INTERACTION.popupOpen && !INTERACTION.specOpen
        && GAME?.state?.gameStarted) {
      openBlueprintPanel();
    }
    if (e.code === 'Escape' && BLUEPRINT._open) {
      closeBlueprintPanel();
    }
  });
}
