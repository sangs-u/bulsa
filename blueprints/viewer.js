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
  ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 62);
}

// ── 탭 1: 평면도 (건축 도면 스타일) ──────────────────────────────
function _drawPlan(ctx, canvas) {
  if (typeof BLUEPRINT_LIFTING === 'undefined') return;
  const bp = BLUEPRINT_LIFTING.plan;

  // 범례 폭 + 여백 계산
  const LEGEND_W = 158;
  // 좌52(행라벨+치수선) 우(범례+12) 상46(열라벨+dim선) 하72(타이틀+스케일)
  const ox = 52, oy = 46;
  const W = canvas.width - ox - LEGEND_W - 12;
  const H = canvas.height - oy - 72;

  // 월드 범위 — wx1=36 으로 크레인반경(x14+18=32) 완전 포함
  const wx0 = -25, wx1 = 36, wz0 = -26, wz1 = 10;
  const sx = W / (wx1 - wx0);  // px/m 수평
  const sz = H / (wz1 - wz0);  // px/m 수직
  const toC = (wx, wz) => ({ x: ox + (wx - wx0) * sx, y: oy + (wz - wz0) * sz });

  // ── 구조 그리드 정의 (도면 관례: 열=알파벳, 행=숫자) ──────────
  // 열: 12m 간격 / 행: 12m 간격
  const COLS = [
    { x: -20, l: 'A' }, { x: -8, l: 'B' },
    { x:   4, l: 'C' }, { x: 16, l: 'D' }, { x: 28, l: 'E' },
  ];
  const ROWS = [
    { z: -24, l: '1' }, { z: -12, l: '2' }, { z: 0, l: '3' },
  ];

  // ── 배경 지면 ────────────────────────────────────────────────
  ctx.fillStyle = '#ECEAE3';
  ctx.fillRect(ox, oy, W, H);
  // 지반 5m 격자
  ctx.strokeStyle = 'rgba(90,80,60,0.08)'; ctx.lineWidth = 0.4;
  for (let w = -20; w <= 30; w += 5) {
    const cx = toC(w, 0).x;
    ctx.beginPath(); ctx.moveTo(cx, oy); ctx.lineTo(cx, oy + H); ctx.stroke();
  }
  for (let z = -25; z <= 10; z += 5) {
    const ry = toC(0, z).y;
    ctx.beginPath(); ctx.moveTo(ox, ry); ctx.lineTo(ox + W, ry); ctx.stroke();
  }

  // ── 구조 그리드선 (파선) ──────────────────────────────────────
  ctx.save();
  ctx.strokeStyle = 'rgba(80,90,160,0.16)'; ctx.lineWidth = 0.6; ctx.setLineDash([4, 6]);
  COLS.forEach(c => {
    const cx = toC(c.x, 0).x;
    ctx.beginPath(); ctx.moveTo(cx, oy); ctx.lineTo(cx, oy + H); ctx.stroke();
  });
  ROWS.forEach(r => {
    const ry = toC(0, r.z).y;
    ctx.beginPath(); ctx.moveTo(ox, ry); ctx.lineTo(ox + W, ry); ctx.stroke();
  });
  ctx.setLineDash([]);
  ctx.restore();

  // ── 열 라벨 (상단, 채워진 원) ───────────────────────────────
  COLS.forEach(c => {
    const cx = toC(c.x, 0).x;
    ctx.fillStyle = '#3A3228'; ctx.strokeStyle = '#3A3228'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, oy - 20, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#F0EDE6'; ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(c.l, cx, oy - 20);
    ctx.textBaseline = 'alphabetic';
    // 연결 점선
    ctx.strokeStyle = 'rgba(58,50,40,0.25)'; ctx.lineWidth = 0.5; ctx.setLineDash([2, 4]);
    ctx.beginPath(); ctx.moveTo(cx, oy - 9); ctx.lineTo(cx, oy); ctx.stroke();
    ctx.setLineDash([]);
  });

  // ── 행 라벨 (좌측, 채워진 원) ───────────────────────────────
  ROWS.forEach(r => {
    const ry = toC(0, r.z).y;
    ctx.fillStyle = '#3A3228'; ctx.strokeStyle = '#3A3228'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(ox - 20, ry, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#F0EDE6'; ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(r.l, ox - 20, ry);
    ctx.textBaseline = 'alphabetic';
    ctx.strokeStyle = 'rgba(58,50,40,0.25)'; ctx.lineWidth = 0.5; ctx.setLineDash([2, 4]);
    ctx.beginPath(); ctx.moveTo(ox - 9, ry); ctx.lineTo(ox, ry); ctx.stroke();
    ctx.setLineDash([]);
  });

  // ── 현장 울타리 (가설 Hoarding, 두꺼운 녹색 + 틱 마크) ───────
  ctx.save();
  ctx.strokeStyle = '#3A6840'; ctx.lineWidth = 2.5;
  ctx.strokeRect(ox, oy, W, H);
  ctx.strokeStyle = '#3A6840'; ctx.lineWidth = 1;
  const fSp = sx * 4;
  for (let px = ox + fSp; px < ox + W; px += fSp) {
    ctx.beginPath(); ctx.moveTo(px, oy);     ctx.lineTo(px - 5, oy - 7);     ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px, oy + H); ctx.lineTo(px - 5, oy + H + 7); ctx.stroke();
  }
  for (let py = oy + fSp; py < oy + H; py += fSp) {
    ctx.beginPath(); ctx.moveTo(ox,     py); ctx.lineTo(ox - 7,     py - 5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ox + W, py); ctx.lineTo(ox + W + 7, py - 5); ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = '#3A6840'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
  ctx.fillText('가설 울타리 (HOARDING)', ox + W / 2, oy - 32);

  // ── 건물 (RC 골조, 두꺼운 이중벽) ───────────────────────────
  const bldg = bp.building;
  const bPos = toC(bldg.x, bldg.z);
  const bW = bldg.w * sx, bD = bldg.d * sz;
  const wt = Math.max(5, 0.55 * Math.min(sx, sz));

  ctx.fillStyle = 'rgba(170,190,215,0.22)';
  ctx.fillRect(bPos.x, bPos.y, bW, bD);
  ctx.save();
  ctx.beginPath(); ctx.rect(bPos.x, bPos.y, bW, bD); ctx.clip();
  ctx.strokeStyle = 'rgba(43,108,176,0.2)'; ctx.lineWidth = 0.8;
  for (let i = -bD; i < bW + bD; i += 11) {
    ctx.beginPath();
    ctx.moveTo(bPos.x + i, bPos.y); ctx.lineTo(bPos.x + i + bD, bPos.y + bD); ctx.stroke();
  }
  ctx.restore();
  // 외벽 (두꺼운 솔리드)
  ctx.fillStyle = '#2B6CB0';
  ctx.fillRect(bPos.x,           bPos.y,           bW, wt);
  ctx.fillRect(bPos.x,           bPos.y + bD - wt,  bW, wt);
  ctx.fillRect(bPos.x,           bPos.y,             wt, bD);
  ctx.fillRect(bPos.x + bW - wt, bPos.y,             wt, bD);
  ctx.strokeStyle = '#1A4A80'; ctx.lineWidth = 1;
  ctx.strokeRect(bPos.x, bPos.y, bW, bD);
  // 내벽 이중선 (건축 이중벽 관례)
  ctx.strokeStyle = '#4A80C0'; ctx.lineWidth = 0.7;
  ctx.strokeRect(bPos.x + wt + 2, bPos.y + wt + 2, bW - (wt + 2) * 2, bD - (wt + 2) * 2);
  // 구조 기둥 (사각형 점)
  [[0,0],[1,0],[0,1],[1,1],[0.5,0],[0.5,1],[0,0.5],[1,0.5]].forEach(([fx, fz]) => {
    ctx.fillStyle = '#1A4A80';
    ctx.fillRect(bPos.x + bW * fx - 4, bPos.y + bD * fz - 4, 8, 8);
  });
  ctx.fillStyle = '#1A4E8C'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
  ctx.fillText('건설 중 RC 골조', bPos.x + bW / 2, bPos.y + bD / 2 - 5);
  ctx.font = '8px monospace'; ctx.fillStyle = '#2B6CB0';
  ctx.fillText(`${bldg.w}×${bldg.d}m · 3F`, bPos.x + bW / 2, bPos.y + bD / 2 + 8);
  _dimLineH(ctx, bPos.x, bPos.x + bW, bPos.y - 14, `${bldg.w}m`, '#2B6CB0');
  _dimLineV(ctx, bPos.y, bPos.y + bD, bPos.x - 14, `${bldg.d}m`, '#2B6CB0');

  // ── 포장 구역 (크레인 발판) ──────────────────────────────────
  const pvP = toC(7, -17), pvE = toC(24, -1);
  ctx.fillStyle = 'rgba(150,140,120,0.15)';
  ctx.strokeStyle = 'rgba(120,110,90,0.35)'; ctx.lineWidth = 0.8;
  ctx.fillRect(pvP.x, pvP.y, pvE.x - pvP.x, pvE.y - pvP.y);
  ctx.strokeRect(pvP.x, pvP.y, pvE.x - pvP.x, pvE.y - pvP.y);
  ctx.fillStyle = 'rgba(100,90,75,0.65)'; ctx.font = '7px monospace'; ctx.textAlign = 'center';
  ctx.fillText('포장구역', (pvP.x + pvE.x) / 2, pvE.y - 5);

  // ── 자재 야적장 ──────────────────────────────────────────────
  const stP = toC(-8, -8), stE = toC(2, -1);
  const stW = stE.x - stP.x, stH = stE.y - stP.y;
  ctx.fillStyle = 'rgba(107,115,80,0.16)';
  ctx.save();
  ctx.beginPath(); ctx.rect(stP.x, stP.y, stW, stH); ctx.clip();
  ctx.strokeStyle = 'rgba(80,90,55,0.3)'; ctx.lineWidth = 0.7;
  for (let i = -stH; i < stW + stH; i += 9) {
    ctx.beginPath(); ctx.moveTo(stP.x + i, stP.y); ctx.lineTo(stP.x + i + stH, stP.y + stH); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(stP.x + i + stH, stP.y); ctx.lineTo(stP.x + i, stP.y + stH); ctx.stroke();
  }
  ctx.restore();
  ctx.setLineDash([4, 3]); ctx.strokeStyle = '#607050'; ctx.lineWidth = 1.2;
  ctx.strokeRect(stP.x, stP.y, stW, stH); ctx.setLineDash([]);
  ctx.fillStyle = '#607050'; ctx.font = '8.5px monospace'; ctx.textAlign = 'center';
  ctx.fillText('자재 야적장', (stP.x + stE.x) / 2, (stP.y + stE.y) / 2 + 4);

  // RC 보 심볼
  const bmPos = toC(bp.beam.x, bp.beam.z);
  const blen = bp.beam.len * sx, bwid = Math.max(7, bp.beam.w * sz * 4);
  ctx.fillStyle = '#D69E2E'; ctx.strokeStyle = '#744210'; ctx.lineWidth = 1.5;
  ctx.fillRect(bmPos.x - blen / 2, bmPos.y - bwid / 2, blen, bwid);
  ctx.strokeRect(bmPos.x - blen / 2, bmPos.y - bwid / 2, blen, bwid);
  ctx.fillStyle = '#744210'; ctx.font = '8px monospace'; ctx.textAlign = 'center';
  ctx.fillText('RC 보 (3.0t)', bmPos.x, bmPos.y + bwid / 2 + 10);

  // ── 현장 사무소 (컨테이너 박스, 도면 스타일) ─────────────────
  const ofP = toC(7, -4), ofE = toC(13, -1);
  const coW = ofE.x - ofP.x, coH = ofE.y - ofP.y;
  ctx.fillStyle = 'rgba(58,106,138,0.16)'; ctx.fillRect(ofP.x, ofP.y, coW, coH);
  ctx.strokeStyle = '#3A6A8A'; ctx.lineWidth = 2; ctx.strokeRect(ofP.x, ofP.y, coW, coH);
  // 내부 파티션선
  ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(ofP.x + coW * 0.55, ofP.y); ctx.lineTo(ofP.x + coW * 0.55, ofP.y + coH * 0.65); ctx.stroke();
  // 문 심볼 (하단)
  const dX = ofP.x + coW * 0.8, dR = coW * 0.22;
  ctx.setLineDash([2, 2]);
  ctx.beginPath(); ctx.moveTo(dX, ofE.y); ctx.arc(dX, ofE.y, dR, -Math.PI / 2, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(dX, ofE.y); ctx.lineTo(dX, ofE.y - dR); ctx.stroke();
  ctx.setLineDash([]);
  // 창문
  const ww = coW * 0.18;
  [0.15, 0.35].forEach(fx => {
    const wx = ofP.x + coW * fx;
    ctx.fillStyle = 'rgba(123,170,187,0.45)'; ctx.fillRect(wx, ofE.y - 1.5, ww, 3);
    ctx.strokeStyle = '#3A6A8A'; ctx.lineWidth = 0.6; ctx.strokeRect(wx, ofE.y - 1.5, ww, 3);
    ctx.beginPath(); ctx.moveTo(wx + ww/2, ofE.y - 1.5); ctx.lineTo(wx + ww/2, ofE.y + 1.5); ctx.stroke();
  });
  ctx.fillStyle = '#3A6A8A'; ctx.font = 'bold 8.5px monospace'; ctx.textAlign = 'center';
  ctx.fillText('현장 사무소', (ofP.x + ofE.x) / 2, ofP.y - 8);

  // ── 위험반경 + 작업반경 ──────────────────────────────────────
  const cPos = toC(bp.crane.x, bp.crane.z);
  ctx.save();
  ctx.fillStyle = 'rgba(229,62,62,0.07)';
  ctx.beginPath(); ctx.arc(cPos.x, cPos.y, bp.dangerZoneR * sx, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#FC8181'; ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
  ctx.beginPath(); ctx.arc(cPos.x, cPos.y, bp.dangerZoneR * sx, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(229,62,62,0.04)';
  ctx.beginPath(); ctx.arc(cPos.x, cPos.y, bp.craneRadius * sx, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#E53E3E'; ctx.lineWidth = 1.5; ctx.setLineDash([8, 5]);
  ctx.beginPath(); ctx.arc(cPos.x, cPos.y, bp.craneRadius * sx, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
  _label(ctx, cPos.x - bp.craneRadius * sx * 0.6, cPos.y - 6, `R=${bp.craneRadius}m`, '#E53E3E', 8);
  _label(ctx, cPos.x - bp.dangerZoneR * sx * 0.5, cPos.y + 7, `위험R=${bp.dangerZoneR}m`, '#FC8181', 7);

  // ── 타워크레인 TC-01 ─────────────────────────────────────────
  const tp = cPos;
  const bmAng = Math.atan2(bmPos.y - tp.y, bmPos.x - tp.x);
  // 아웃트리거 4방향
  [[-1.5,-1.5],[1.5,-1.5],[-1.5,1.5],[1.5,1.5]].forEach(([dx, dz]) => {
    const ep = toC(bp.crane.x + dx * 2, bp.crane.z + dz * 2);
    ctx.strokeStyle = '#B7791F'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(tp.x, tp.y); ctx.lineTo(ep.x, ep.y); ctx.stroke();
    const padR = Math.max(3, sx * 0.28);
    ctx.fillStyle = '#666'; ctx.strokeStyle = '#333'; ctx.lineWidth = 0.8;
    ctx.fillRect(ep.x - padR, ep.y - padR, padR * 2, padR * 2);
    ctx.strokeRect(ep.x - padR, ep.y - padR, padR * 2, padR * 2);
  });
  // 지브 (작업 방향) + 카운터 지브
  ctx.strokeStyle = '#D4A217'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(tp.x, tp.y);
  ctx.lineTo(tp.x + bp.craneRadius * sx * Math.cos(bmAng), tp.y + bp.craneRadius * sz * Math.sin(bmAng));
  ctx.stroke();
  ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
  ctx.beginPath(); ctx.moveTo(tp.x, tp.y);
  ctx.lineTo(tp.x - bp.craneRadius * sx * 0.38 * Math.cos(bmAng), tp.y - bp.craneRadius * sz * 0.38 * Math.sin(bmAng));
  ctx.stroke();
  ctx.setLineDash([]); ctx.lineCap = 'butt';
  // 마스트 원형
  const mastR = Math.max(8, sx * 0.54);
  ctx.fillStyle = '#D4A217'; ctx.strokeStyle = '#744210'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(tp.x, tp.y, mastR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#3A3010'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(tp.x - mastR, tp.y); ctx.lineTo(tp.x + mastR, tp.y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(tp.x, tp.y - mastR); ctx.lineTo(tp.x, tp.y + mastR); ctx.stroke();
  _label(ctx, tp.x, tp.y - mastR - 10, 'TC-01', '#744210', 10);

  // ── 인양 경로 + 거치 위치 ────────────────────────────────────
  const tPos = toC(bp.target.x, bp.target.z);
  ctx.strokeStyle = '#38A169'; ctx.fillStyle = '#38A169';
  ctx.lineWidth = 1.5; ctx.setLineDash([5, 3]);
  ctx.beginPath(); ctx.moveTo(bmPos.x, bmPos.y - bwid / 2); ctx.lineTo(tPos.x, tPos.y); ctx.stroke();
  ctx.setLineDash([]);
  _arrowHead(ctx, tPos.x, tPos.y, bmPos.x, bmPos.y - bwid / 2);
  ctx.strokeStyle = '#38A169'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(tPos.x, tPos.y, 7, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(tPos.x - 11, tPos.y); ctx.lineTo(tPos.x + 11, tPos.y);
  ctx.moveTo(tPos.x, tPos.y - 9); ctx.lineTo(tPos.x, tPos.y + 9);
  ctx.stroke();
  _label(ctx, tPos.x + 18, tPos.y - 3, '거치 위치 (3F)', '#38A169', 9);

  // ── 인원 마커 ────────────────────────────────────────────────
  bp.markers.forEach(m => {
    if (m.label === '크레인' || m.label === '사무실') return;
    const mp = toC(m.x, m.z);
    ctx.fillStyle = m.color;
    ctx.beginPath(); ctx.arc(mp.x, mp.y - 7, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = m.color; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(mp.x, mp.y - 2.5); ctx.lineTo(mp.x, mp.y + 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(mp.x - 4, mp.y); ctx.lineTo(mp.x + 4, mp.y); ctx.stroke();
    _label(ctx, mp.x + 14, mp.y - 4, m.label, m.color, 9);
  });

  // 출입구
  const entP = toC(-2, 9.5);
  ctx.fillStyle = '#38A169'; ctx.strokeStyle = '#276749'; ctx.lineWidth = 1.5;
  ctx.fillRect(entP.x - 16, entP.y - 5, 32, 10);
  ctx.strokeRect(entP.x - 16, entP.y - 5, 32, 10);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
  ctx.fillText('출입구', entP.x, entP.y + 4);

  // ── 외곽 치수선 ──────────────────────────────────────────────
  _dimLineH(ctx, ox, ox + W, oy - 32, `${wx1 - wx0}m`, '#3A3228');
  _dimLineV(ctx, oy, oy + H, ox - 38, `${wz1 - wz0}m`, '#3A3228');

  // ── 스케일 바 (좌하단) ───────────────────────────────────────
  const sbX = ox + 14, sbY = oy + H - 22;
  const s5 = 5 * sx;
  ctx.fillStyle = '#3A3228'; ctx.fillRect(sbX, sbY - 3, s5, 6);
  ctx.fillStyle = '#F0EDE6'; ctx.fillRect(sbX + s5, sbY - 3, s5, 6);
  ctx.strokeStyle = '#3A3228'; ctx.lineWidth = 1;
  ctx.strokeRect(sbX, sbY - 3, s5 * 2, 6);
  ctx.beginPath(); ctx.moveTo(sbX + s5, sbY - 3); ctx.lineTo(sbX + s5, sbY + 3); ctx.stroke();
  ctx.fillStyle = '#3A3228'; ctx.font = '8px monospace'; ctx.textAlign = 'center';
  ctx.fillText('0', sbX, sbY + 12);
  ctx.fillText('5m', sbX + s5, sbY + 12);
  ctx.fillText('10m', sbX + s5 * 2, sbY + 12);
  ctx.textAlign = 'left'; ctx.font = 'bold 7px monospace';
  ctx.fillText('SCALE 1:NTS', sbX, sbY + 21);

  // ── 방위 화살표 ──────────────────────────────────────────────
  _drawNorthArrow(ctx, ox + W - 28, oy + H - 34);

  // ── 범례 (우측 패널) ─────────────────────────────────────────
  const legX = ox + W + 12, legY = oy;
  const legH = canvas.height - oy - 62;
  ctx.fillStyle = '#F6F2EA'; ctx.strokeStyle = '#3A3228'; ctx.lineWidth = 1;
  ctx.fillRect(legX - 4, legY - 4, LEGEND_W, legH);
  ctx.strokeRect(legX - 4, legY - 4, LEGEND_W, legH);
  ctx.fillStyle = '#1A1208'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'left';
  ctx.fillText('범례 / Legend', legX, legY + 12);
  // 구분선
  ctx.strokeStyle = '#3A3228'; ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(legX - 4, legY + 18); ctx.lineTo(legX + LEGEND_W - 4, legY + 18); ctx.stroke();

  const legItems = [
    { stroke:'#3A6840', fill:'rgba(74,120,80,0.35)', label:'현장 울타리' },
    { stroke:'#2B6CB0', fill:'rgba(170,190,215,0.4)', label:'RC 골조 (건설 중)' },
    { stroke:'#D69E2E', fill:'#D69E2E', label:'RC 보 (인양물)' },
    { stroke:'#E53E3E', fill:null, dash:true, label:`작업반경 R${bp.craneRadius}m` },
    { stroke:'#FC8181', fill:'rgba(229,62,62,0.1)', dash:true, label:`위험반경 R${bp.dangerZoneR}m` },
    { stroke:'#3A6A8A', fill:'rgba(58,106,138,0.18)', label:'현장 사무소' },
    { stroke:'#607050', fill:'rgba(107,115,80,0.18)', dash:true, label:'자재 야적장' },
    { stroke:'#38A169', fill:null, dash:true, label:'인양 경로' },
    { stroke:'#D4A217', fill:'rgba(212,162,23,0.7)', label:'타워크레인 TC-01' },
  ];
  legItems.forEach((item, i) => {
    const ly = legY + 30 + i * 20;
    ctx.save();
    if (item.fill) { ctx.fillStyle = item.fill; ctx.fillRect(legX, ly - 5, 22, 10); }
    ctx.setLineDash(item.dash ? [4, 2] : []);
    ctx.strokeStyle = item.stroke; ctx.lineWidth = item.fill ? 1.5 : 1.2;
    ctx.strokeRect(legX, ly - 5, 22, 10);
    ctx.setLineDash([]);
    ctx.restore();
    ctx.fillStyle = '#2A2018'; ctx.font = '8.5px monospace'; ctx.textAlign = 'left';
    ctx.fillText(item.label, legX + 28, ly + 3);
  });

  // 범례 하단 — 도면 정보
  const infoY = legY + 30 + legItems.length * 20 + 14;
  ctx.strokeStyle = '#3A3228'; ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(legX - 4, infoY); ctx.lineTo(legX + LEGEND_W - 4, infoY); ctx.stroke();
  ctx.fillStyle = '#6B5A40'; ctx.font = '8px monospace'; ctx.textAlign = 'left';
  ctx.fillText('도면 번호: S01-P-01', legX, infoY + 12);
  ctx.fillText('작업 구역: 줄걸이·인양', legX, infoY + 24);
  ctx.fillText('좌표계: X(-25~36)·Z(-26~10)', legX, infoY + 36);
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
  ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y2); ctx.stroke();
  [y1, y2].forEach(y => {
    ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x + 4, y); ctx.stroke();
  });
  ctx.font = '9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(label, x, (y1 + y2) / 2 - 4);
  ctx.restore();
}

function _dimLineH(ctx, x1, x2, y, label, color) {
  ctx.save();
  ctx.strokeStyle = color || '#555'; ctx.fillStyle = color || '#555';
  ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
  [x1, x2].forEach(x => {
    ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x, y + 4); ctx.stroke();
  });
  ctx.font = '8px monospace'; ctx.textAlign = 'center';
  ctx.fillText(label, (x1 + x2) / 2, y - 5);
  ctx.restore();
}

function _dimLineV(ctx, y1, y2, x, label, color) {
  ctx.save();
  ctx.strokeStyle = color || '#555'; ctx.fillStyle = color || '#555';
  ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y2); ctx.stroke();
  [y1, y2].forEach(y => {
    ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x + 4, y); ctx.stroke();
  });
  ctx.font = '8px monospace'; ctx.textAlign = 'center';
  ctx.save();
  ctx.translate(x - 5, (y1 + y2) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(label, 0, 0);
  ctx.restore();
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
