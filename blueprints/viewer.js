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

// ── 탭 1: 평면도 ─────────────────────────────────────────────────
function _drawPlan(ctx, canvas) {
  if (typeof BLUEPRINT_LIFTING === 'undefined') return;
  const bp = BLUEPRINT_LIFTING.plan;

  // 그리드 영역 여백: 좌20(행라벨) 우12 상20(열라벨) 하68(타이틀블록)
  const ox = 28, oy = 22;
  const W = canvas.width - ox - 14;
  const H = canvas.height - oy - 70;

  // 월드 범위
  const wx0 = -24, wx1 = 24, wz0 = -26, wz1 = 10;
  const sx = W / (wx1 - wx0);
  const sz = H / (wz1 - wz0);
  const toC = (wx, wz) => ({ x: ox + (wx - wx0) * sx, y: oy + (wz - wz0) * sz });

  // ── 1. 사이트 경계 (부지 경계선) ────────────────
  const sp1 = toC(-23, -25), sp2 = toC(23, 9);
  ctx.save();
  ctx.strokeStyle = '#6B5C48';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([10, 5]);
  ctx.strokeRect(sp1.x, sp1.y, sp2.x - sp1.x, sp2.y - sp1.y);
  ctx.setLineDash([]);
  ctx.restore();
  ctx.fillStyle = '#6B5C48';
  ctx.font = '8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('-- 부지 경계선 --', (sp1.x + sp2.x) / 2, sp1.y - 4);

  // ── 2. 그리드 기준선 ──────────────────────────
  // 열: A(-18) B(-6) C(6) D(18)
  // 행: 1(-24) 2(-14) 3(-4) 4(8)
  const COLS = [{ x: -18, l: 'A' }, { x: -6, l: 'B' }, { x: 6, l: 'C' }, { x: 18, l: 'D' }];
  const ROWS = [{ z: -24, l: '1' }, { z: -14, l: '2' }, { z: -4, l: '3' }, { z: 8, l: '4' }];
  ctx.save();
  ctx.strokeStyle = 'rgba(90,100,160,0.18)';
  ctx.lineWidth = 0.6;
  ctx.setLineDash([3, 5]);
  COLS.forEach(c => {
    const p = toC(c.x, wz0);
    const e = toC(c.x, wz1);
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(e.x, e.y); ctx.stroke();
    // 열 라벨 (원형)
    const lp = toC(c.x, wz1);
    ctx.fillStyle = '#4A5568';
    ctx.beginPath(); ctx.arc(lp.x, oy - 9, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
    ctx.fillText(c.l, lp.x, oy - 5);
  });
  ROWS.forEach(r => {
    const p = toC(wx0, r.z);
    const e = toC(wx1, r.z);
    ctx.strokeStyle = 'rgba(90,100,160,0.18)';
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(e.x, e.y); ctx.stroke();
    // 행 라벨 (원형)
    ctx.fillStyle = '#4A5568';
    ctx.beginPath(); ctx.arc(ox - 11, p.y, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
    ctx.fillText(r.l, ox - 11, p.y + 3);
  });
  ctx.setLineDash([]);
  ctx.restore();

  // ── 3. 포장 구역 (크레인 발판/콘크리트) ──────────
  const paveP = toC(8, -14), paveEnd = toC(22, -2);
  ctx.fillStyle = 'rgba(160,150,135,0.12)';
  ctx.strokeStyle = 'rgba(120,110,90,0.3)';
  ctx.lineWidth = 0.8;
  ctx.fillRect(paveP.x, paveP.y, paveEnd.x - paveP.x, paveEnd.y - paveP.y);
  ctx.strokeRect(paveP.x, paveP.y, paveEnd.x - paveP.x, paveEnd.y - paveP.y);
  ctx.fillStyle = 'rgba(120,110,90,0.5)';
  ctx.font = '7px monospace'; ctx.textAlign = 'center';
  ctx.fillText('포장 구역', (paveP.x + paveEnd.x) / 2, paveEnd.y - 4);

  // ── 4. 건물 (두꺼운 벽 + 해치) ───────────────────
  const bldg = bp.building;
  const bPos = toC(bldg.x, bldg.z);
  const bW = bldg.w * sx, bD = bldg.d * sz;
  const wt = Math.max(4, 0.5 * Math.min(sx, sz)); // 벽 두께 px

  // 바닥 채우기 + 사선 해치
  ctx.fillStyle = 'rgba(43,108,176,0.08)';
  ctx.fillRect(bPos.x, bPos.y, bW, bD);
  ctx.save();
  ctx.beginPath(); ctx.rect(bPos.x, bPos.y, bW, bD); ctx.clip();
  ctx.strokeStyle = 'rgba(43,108,176,0.18)';
  ctx.lineWidth = 0.8; ctx.setLineDash([]);
  for (let i = -30; i < 30; i++) {
    ctx.beginPath();
    ctx.moveTo(bPos.x + i * 10, bPos.y);
    ctx.lineTo(bPos.x + i * 10 + bD, bPos.y + bD);
    ctx.stroke();
  }
  ctx.restore();

  // 벽 (두꺼운 솔리드 라인)
  ctx.fillStyle = '#2B6CB0';
  ctx.fillRect(bPos.x, bPos.y, bW, wt);                      // 상
  ctx.fillRect(bPos.x, bPos.y + bD - wt, bW, wt);            // 하
  ctx.fillRect(bPos.x, bPos.y, wt, bD);                      // 좌
  ctx.fillRect(bPos.x + bW - wt, bPos.y, wt, bD);            // 우
  ctx.strokeStyle = '#1A4E8C'; ctx.lineWidth = 1;
  ctx.strokeRect(bPos.x, bPos.y, bW, bD);

  // 내부 컬럼 포인트 (4×4 그리드)
  [0.25, 0.75].forEach(fx => [0.25, 0.5, 0.75].forEach(fz => {
    const cx2 = bPos.x + bW * fx, cy2 = bPos.y + bD * fz;
    ctx.fillStyle = '#1A4E8C';
    ctx.fillRect(cx2 - 3, cy2 - 3, 6, 6);
  }));

  // 건물 라벨
  ctx.fillStyle = '#1A4E8C'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
  ctx.fillText('건물 (건설 중)', bPos.x + bW / 2, bPos.y + bD / 2 - 6);
  ctx.font = '8px monospace'; ctx.fillStyle = '#2B6CB0';
  ctx.fillText('RC S01', bPos.x + bW / 2, bPos.y + bD / 2 + 8);

  // 치수선 (건물)
  _dimLineH(ctx, bPos.x, bPos.x + bW, bPos.y - 14, `${bldg.w}m`, '#2B6CB0');
  _dimLineV(ctx, bPos.y, bPos.y + bD, bPos.x - 14, `${bldg.d}m`, '#2B6CB0');

  // ── 5. 자재 보관 구역 ─────────────────────────
  const stP = toC(-5, -6), stE = toC(5, -1);
  ctx.fillStyle = 'rgba(214,158,46,0.15)';
  ctx.strokeStyle = '#B7791F'; ctx.lineWidth = 1;
  ctx.setLineDash([5, 3]);
  ctx.fillRect(stP.x, stP.y, stE.x - stP.x, stE.y - stP.y);
  ctx.strokeRect(stP.x, stP.y, stE.x - stP.x, stE.y - stP.y);
  ctx.setLineDash([]);
  ctx.fillStyle = '#744210'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
  ctx.fillText('자재 보관', (stP.x + stE.x) / 2, (stP.y + stE.y) / 2 - 2);
  ctx.font = '8px monospace';
  ctx.fillText('(RC 보·샤클)', (stP.x + stE.x) / 2, (stP.y + stE.y) / 2 + 9);

  // RC 보 심볼
  const bmPos = toC(bp.beam.x, bp.beam.z);
  const blen = bp.beam.len * sx, bwid = Math.max(6, bp.beam.w * sz * 4);
  ctx.fillStyle = '#D69E2E';
  ctx.strokeStyle = '#744210'; ctx.lineWidth = 1.5;
  ctx.fillRect(bmPos.x - blen / 2, bmPos.y - bwid / 2, blen, bwid);
  ctx.strokeRect(bmPos.x - blen / 2, bmPos.y - bwid / 2, blen, bwid);
  ctx.fillStyle = '#744210'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
  ctx.fillText('RC 보 3.0t', bmPos.x, bmPos.y + bwid / 2 + 11);

  // ── 6. 현장사무소 ─────────────────────────────
  const ofP = toC(7, -3), ofE = toC(13, 0);
  ctx.fillStyle = 'rgba(49,130,206,0.18)';
  ctx.strokeStyle = '#2B6CB0'; ctx.lineWidth = 1.5;
  ctx.fillRect(ofP.x, ofP.y, ofE.x - ofP.x, ofE.y - ofP.y);
  ctx.strokeRect(ofP.x, ofP.y, ofE.x - ofP.x, ofE.y - ofP.y);
  // 출입문 심볼 (호)
  const doorX = ofP.x + (ofE.x - ofP.x) * 0.5;
  const doorR = (ofE.x - ofP.x) * 0.3;
  ctx.strokeStyle = '#2B6CB0'; ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(doorX, ofE.y);
  ctx.arc(doorX, ofE.y, doorR, -Math.PI / 2, 0);
  ctx.stroke();
  ctx.fillStyle = '#1A4E8C'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
  ctx.fillText('현장사무소', (ofP.x + ofE.x) / 2, (ofP.y + ofE.y) / 2 + 4);

  // ── 7. 위험 반경 + 작업 반경 ───────────────────
  const cPos = toC(bp.crane.x, bp.crane.z);
  ctx.save();
  // 내부 위험반경 (진한 빨강)
  ctx.fillStyle = 'rgba(229,62,62,0.07)';
  ctx.beginPath(); ctx.arc(cPos.x, cPos.y, bp.dangerZoneR * sx, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#FC8181'; ctx.lineWidth = 1;
  ctx.setLineDash([4, 3]);
  ctx.beginPath(); ctx.arc(cPos.x, cPos.y, bp.dangerZoneR * sx, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  // 외부 작업반경
  ctx.fillStyle = 'rgba(229,62,62,0.04)';
  ctx.beginPath(); ctx.arc(cPos.x, cPos.y, bp.craneRadius * sx, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#E53E3E'; ctx.lineWidth = 1.5;
  ctx.setLineDash([8, 5]);
  ctx.beginPath(); ctx.arc(cPos.x, cPos.y, bp.craneRadius * sx, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
  // 반경 라벨
  _label(ctx, cPos.x + bp.craneRadius * sx * 0.68, cPos.y - 6, `R=${bp.craneRadius}m`, '#E53E3E', 8);
  _label(ctx, cPos.x + bp.dangerZoneR * sx * 0.62, cPos.y + 6, `위험R=${bp.dangerZoneR}m`, '#FC8181', 7);

  // ── 8. 타워크레인 (TC-01) ─────────────────────
  const tSz = 2.5 * Math.min(sx, sz);
  const tp = toC(bp.crane.x, bp.crane.z);
  ctx.fillStyle = '#D69E2E'; ctx.strokeStyle = '#744210'; ctx.lineWidth = 2;
  ctx.fillRect(tp.x - tSz / 2, tp.y - tSz / 2, tSz, tSz);
  ctx.strokeRect(tp.x - tSz / 2, tp.y - tSz / 2, tSz, tSz);
  // X 대각
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(tp.x - tSz / 2, tp.y - tSz / 2); ctx.lineTo(tp.x + tSz / 2, tp.y + tSz / 2); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(tp.x + tSz / 2, tp.y - tSz / 2); ctx.lineTo(tp.x - tSz / 2, tp.y + tSz / 2); ctx.stroke();
  // 지브 방향선
  ctx.strokeStyle = '#B7791F'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(tp.x, tp.y); ctx.lineTo(tp.x - bp.craneRadius * sx * 0.7, tp.y + 4); ctx.stroke();
  _label(ctx, tp.x, tp.y - tSz / 2 - 10, 'TC-01', '#744210', 10);

  // ── 9. 인양 경로 ────────────────────────────
  const tPos = toC(bp.target.x, bp.target.z);
  ctx.strokeStyle = '#38A169'; ctx.fillStyle = '#38A169';
  ctx.lineWidth = 1.5; ctx.setLineDash([6, 3]);
  ctx.beginPath(); ctx.moveTo(bmPos.x, bmPos.y - bwid / 2); ctx.lineTo(tPos.x, tPos.y); ctx.stroke();
  ctx.setLineDash([]);
  _arrowHead(ctx, tPos.x, tPos.y, bmPos.x, bmPos.y - bwid / 2);
  // 목표 위치 십자 심볼
  ctx.strokeStyle = '#38A169'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(tPos.x, tPos.y, 7, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(tPos.x - 12, tPos.y); ctx.lineTo(tPos.x + 12, tPos.y);
  ctx.moveTo(tPos.x, tPos.y - 12); ctx.lineTo(tPos.x, tPos.y + 12);
  ctx.stroke();
  _label(ctx, tPos.x + 18, tPos.y - 4, '거치 위치', '#38A169', 9);

  // ── 10. 신호수 + 출입구 마커 ──────────────────
  bp.markers.forEach(m => {
    if (m.label === '크레인') return;
    const mp = toC(m.x, m.z);
    // 사람 심볼
    ctx.fillStyle = m.color;
    ctx.beginPath(); ctx.arc(mp.x, mp.y - 7, 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = m.color; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(mp.x, mp.y - 3);
    ctx.lineTo(mp.x, mp.y + 5);
    ctx.moveTo(mp.x - 4, mp.y); ctx.lineTo(mp.x + 4, mp.y); // 팔
    ctx.stroke();
    _label(ctx, mp.x + 12, mp.y - 4, m.label, m.color, 9);
  });

  // 출입구
  const entP = toC(-2, 9);
  ctx.fillStyle = '#38A169'; ctx.strokeStyle = '#276749'; ctx.lineWidth = 1.5;
  ctx.fillRect(entP.x - 14, entP.y - 5, 28, 10);
  ctx.strokeRect(entP.x - 14, entP.y - 5, 28, 10);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
  ctx.fillText('출입구', entP.x, entP.y + 3);

  // ── 11. 스케일 바 ────────────────────────────
  const sbX = ox + 10, sbY = oy + H - 16;
  const s5 = 5 * sx;
  ctx.strokeStyle = '#3A3228'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(sbX, sbY - 5); ctx.lineTo(sbX, sbY + 5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(sbX + s5, sbY - 5); ctx.lineTo(sbX + s5, sbY + 5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(sbX + s5 * 2, sbY - 5); ctx.lineTo(sbX + s5 * 2, sbY + 5); ctx.stroke();
  for (let i = 0; i < 2; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#3A3228' : '#F0EDE6';
    ctx.fillRect(sbX + i * s5, sbY - 2, s5, 4);
  }
  ctx.strokeRect(sbX, sbY - 2, s5 * 2, 4);
  ctx.fillStyle = '#3A3228'; ctx.font = '8px monospace'; ctx.textAlign = 'center';
  ctx.fillText('0', sbX, sbY + 12);
  ctx.fillText('5m', sbX + s5, sbY + 12);
  ctx.fillText('10m', sbX + s5 * 2, sbY + 12);

  // ── 12. 방위 화살표 ──────────────────────────
  _drawNorthArrow(ctx, canvas.width - 36, oy + 26);
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
