// TBM (Tool Box Meeting) — pre-phase safety briefing system
// Phase 1: auto-triggers after briefing closes. Phase 2: intercepts evaluateLift().

const TBM = {
  _completed: new Set(),  // set of phase numbers already TBM'd
  _pendingCallback: null,
  _allChecked: false,
};

GAME.state.tbmCompleted = TBM._completed;

// ── TBM content per phase ─────────────────────────────────────
const TBM_DATA = {
  1: {
    titleKo: 'TBM — 작업 전 안전점검',
    titleEn: 'TBM — Pre-Work Safety Briefing',
    titleVi: 'TBM — Kiểm tra an toàn trước công việc',
    titleAr: 'TBM — فحص السلامة قبل العمل',
    workKo:  '오늘 작업: RC 보 인양을 위한 현장 사전점검',
    workEn:  "Today's work: Pre-inspection for RC beam lift",
    workVi:  'Công việc hôm nay: Kiểm tra hiện trường trước khi nâng dầm RC',
    workAr:  'عمل اليوم: فحص الموقع قبل رفع عارضة RC',
    hazardsKo: ['슬링 손상(킹크) 확인', '안전핀 체결 상태 확인', '신호수 위치 확인', '작업반경 출입통제', '크레인 정격하중 확인'],
    hazardsEn: ['Check sling for kinks/damage', 'Verify safety pin engagement', 'Station signal person', 'Access control in lift zone', 'Verify crane rated capacity'],
    hazardsVi: ['Kiểm tra dây đai bị gãy xoắn', 'Xác nhận khóa chốt an toàn', 'Bố trí người ra hiệu', 'Kiểm soát ra vào khu vực nâng', 'Kiểm tra tải trọng cho phép của cần cẩu'],
    hazardsAr: ['فحص حبل الربط من الانثناء والتلف', 'التحقق من تثبيت مسمار الأمان', 'تحديد موقع المُوجِّه', 'التحكم في دخول منطقة الرفع', 'التحقق من الطاقة الاسمية للرافعة'],
    checklistKo: [
      '안전모·안전화·안전대 착용 확인',
      '작업허가서 발급 및 서명 완료',
      '무전기 통신 상태 확인',
      '인양 반경 출입통제 설정',
      '응급처치 키트 위치 파악',
    ],
    checklistEn: [
      'All PPE worn (helmet, boots, harness)',
      'Work permit issued and signed',
      'Radio communication verified',
      'Lift zone exclusion set up',
      'First aid kit location confirmed',
    ],
    checklistVi: [
      'Mang đầy đủ PPE (mũ, giày, dây an toàn)',
      'Cấp và ký giấy phép làm việc',
      'Kiểm tra liên lạc vô tuyến',
      'Thiết lập vùng cấm xung quanh khu vực nâng',
      'Xác nhận vị trí bộ sơ cứu',
    ],
    checklistAr: [
      'ارتداء كامل معدات الوقاية الشخصية (خوذة، حذاء، حزام)',
      'إصدار تصريح العمل وتوقيعه',
      'التحقق من الاتصال اللاسلكي',
      'تحديد منطقة الاستبعاد حول الرفع',
      'تأكيد موقع حقيبة الإسعافات الأولية',
    ],
    roles: [
      { roleKo: '신호수',    roleEn: 'Signal Person',  roleVi: 'Người ra hiệu',       roleAr: 'المُوجِّه',       npcId: 'gimc' },
      { roleKo: '슬링담당',  roleEn: 'Rigger',         roleVi: 'Người buộc dây',      roleAr: 'مُشغِّل الحبال',  npcId: 'park' },
      { roleKo: '안전감시',  roleEn: 'Safety Watcher', roleVi: 'Người giám sát an toàn', roleAr: 'مراقب السلامة', npcId: 'lee'  },
    ],
  },
  2: {
    titleKo: 'TBM — 인양 작업 시작 전',
    titleEn: 'TBM — Pre-Lift Briefing',
    titleVi: 'TBM — Trước khi bắt đầu nâng tải',
    titleAr: 'TBM — قبل بدء عملية الرفع',
    workKo:  '오늘 작업: RC 보 크레인 인양 (설계하중 3,000 kg)',
    workEn:  "Today's work: RC beam crane lift (design load 3,000 kg)",
    workVi:  'Công việc hôm nay: Nâng dầm RC bằng cần cẩu (tải thiết kế 3.000 kg)',
    workAr:  'عمل اليوم: رفع عارضة RC بالرافعة (الحمل التصميمي 3,000 كجم)',
    hazardsKo: ['과부하 재확인', '인양각도 최대 60° 준수', '신호수 무선 통신 유지', '인양 중 출입 금지 유지'],
    hazardsEn: ['Re-verify load vs capacity', 'Max sling angle 60°', 'Maintain radio with signal person', 'No entry during active lift'],
    hazardsVi: ['Kiểm tra lại tải trọng so với sức nâng', 'Góc dây tối đa 60°', 'Duy trì liên lạc vô tuyến với người ra hiệu', 'Cấm vào trong quá trình nâng'],
    hazardsAr: ['إعادة التحقق من الحمل مقابل الطاقة', 'زاوية حبل الربط لا تتجاوز 60°', 'الحفاظ على التواصل اللاسلكي مع المُوجِّه', 'حظر الدخول أثناء الرفع'],
    checklistKo: [
      '슬링 최종 점검 완료',
      '크레인 정격하중 대비 사용률 확인 (< 85%)',
      '인양 반경 내 인원 전원 대피 확인',
      '신호수 무전기 통신 테스트 완료',
      '이상 시 즉시 정지 신호 합의',
    ],
    checklistEn: [
      'Final sling inspection complete',
      'Load usage ratio confirmed (< 85%)',
      'All personnel evacuated from lift zone',
      'Radio test with signal person done',
      'Agreed on "STOP" signal protocol',
    ],
    checklistVi: [
      'Hoàn thành kiểm tra dây đai cuối cùng',
      'Xác nhận tỷ lệ sử dụng tải (< 85%)',
      'Xác nhận toàn bộ nhân viên đã rời khỏi khu vực nâng',
      'Kiểm tra liên lạc vô tuyến với người ra hiệu',
      'Thống nhất tín hiệu "DỪNG"',
    ],
    checklistAr: [
      'اكتمال الفحص النهائي لحبل الربط',
      'تأكيد نسبة استخدام الحمل (< 85%)',
      'التأكد من إخلاء جميع الأفراد من منطقة الرفع',
      'إجراء اختبار الراديو مع المُوجِّه',
      'الاتفاق على بروتوكول إشارة "توقف"',
    ],
    roles: [
      { roleKo: '크레인기사', roleEn: 'Crane Operator', roleVi: 'Tài xế cần cẩu',  roleAr: 'مشغّل الرافعة', npcId: null   },
      { roleKo: '신호수',     roleEn: 'Signal Person',  roleVi: 'Người ra hiệu',   roleAr: 'المُوجِّه',     npcId: 'gimc' },
      { roleKo: '슬링담당',   roleEn: 'Rigger',         roleVi: 'Người buộc dây',  roleAr: 'مُشغِّل الحبال', npcId: 'park' },
    ],
  },
};

// ── Intercept evaluateLift (Phase 6 인양 시작 전 TBM 2) ───────
// function 선언은 호이스팅으로 자기 자신을 _orig로 잡는 순환참조 버그 발생.
// window.evaluateLift 할당(non-hoisted)으로 대체.
const _origEvaluateLift = typeof window.evaluateLift === 'function' ? window.evaluateLift : null;

window.evaluateLift = function evaluateLift() {
  if (!TBM._completed.has(2)) {
    // Exit crane cab first so TBM panel isn't behind crane overlay
    if (typeof exitCraneCab === 'function' && GAME.state.craneBoarded) exitCraneCab();
    showTBM(2, () => {
      if (_origEvaluateLift) _origEvaluateLift();
    });
    return;
  }
  if (_origEvaluateLift) _origEvaluateLift();
};

// ── Show TBM panel ────────────────────────────────────────────
function showTBM(phase, onComplete) {
  if (TBM._completed.has(phase)) {
    if (onComplete) onComplete();
    return;
  }

  TBM._pendingCallback = onComplete;
  const panel = document.getElementById('tbm-panel');
  if (!panel) {
    TBM._completed.add(phase);
    if (onComplete) onComplete();
    return;
  }

  const data = TBM_DATA[phase] || TBM_DATA[1];
  // Suffix map: ko→Ko, en→En, vi→Vi, ar→Ar, fallback→Ko
  const sfx  = { ko: 'Ko', en: 'En', vi: 'Vi', ar: 'Ar' };
  const L    = sfx[currentLang] || 'Ko';
  const unassigned = { Ko: '미지정', En: 'Unassigned', Vi: 'Chưa phân công', Ar: 'غير محدد' };
  const startLabel = { Ko: '작업 시작', En: 'Start Work', Vi: 'Bắt đầu', Ar: 'ابدأ العمل' };
  const secLabels  = {
    work:      { Ko: '오늘의 작업',          En: "Today's Work",     Vi: 'Công việc hôm nay', Ar: 'عمل اليوم' },
    hazards:   { Ko: '주요 위험요소',         En: 'Key Hazards',      Vi: 'Nguy hiểm chính',   Ar: 'المخاطر الرئيسية' },
    checklist: { Ko: '필수 확인 체크리스트',   En: 'Required Checklist', Vi: 'Danh sách kiểm tra', Ar: 'قائمة التحقق' },
    roles:     { Ko: '담당자 지정',           En: 'Role Assignments', Vi: 'Phân công vai trò',  Ar: 'تعيينات الأدوار' },
  };

  // Gather NPCs around player
  _gatherNPCs();

  // Title + section labels
  document.getElementById('tbm-title').textContent      = data['title' + L] || data.titleKo;
  document.getElementById('tbm-phase-label').textContent = `Phase ${phase}`;
  document.getElementById('tbm-work').textContent        = data['work' + L]  || data.workKo;
  ['work', 'hazards', 'checklist', 'roles'].forEach(k => {
    const el = document.getElementById('tbm-lbl-' + k);
    if (el) el.textContent = secLabels[k][L] || secLabels[k].Ko;
  });

  // Hazard list
  const hazList = document.getElementById('tbm-hazards');
  hazList.innerHTML = '';
  const hazards = data['hazards' + L] || data.hazardsKo;
  hazards.forEach(h => {
    const li = document.createElement('li');
    li.textContent = h;
    hazList.appendChild(li);
  });

  // Checklist
  const chkList = document.getElementById('tbm-checklist');
  chkList.innerHTML = '';
  const checks = data['checklist' + L] || data.checklistKo;
  let checkedCount = 0;

  function updateProgress() {
    const pct = (checkedCount / checks.length) * 100;
    const fill = document.getElementById('tbm-progress-fill');
    if (fill) fill.style.width = pct + '%';
    const btn = document.getElementById('tbm-start-btn');
    if (btn) btn.disabled = checkedCount < checks.length;
  }

  checks.forEach((text, i) => {
    const row = document.createElement('div');
    row.className = 'tbm-check-item';
    row.innerHTML = `<div class="tbm-check-box"></div><span>${text}</span>`;
    row.onclick = () => {
      if (row.classList.contains('checked')) return;
      row.classList.add('checked');
      checkedCount++;
      updateProgress();
    };
    chkList.appendChild(row);
  });

  updateProgress();

  // Role assignments
  const roleContainer = document.getElementById('tbm-roles');
  roleContainer.innerHTML = '';
  data.roles.forEach(r => {
    const npc = r.npcId ? GAME.npcs.find(n => n.id === r.npcId) : null;
    const row = document.createElement('div');
    row.className = 'tbm-role-row';
    row.innerHTML = `<span class="tbm-role-name">${r['role' + L] || r.roleKo}</span>
      <span class="tbm-role-assigned">${npc ? npc.name : (unassigned[L] || '미지정')}</span>`;
    roleContainer.appendChild(row);
  });

  // Start button
  const startBtn = document.getElementById('tbm-start-btn');
  if (startBtn) {
    startBtn.textContent = startLabel[L] || '작업 시작';
    startBtn.onclick = () => completeTBM(phase);
  }

  INTERACTION.popupOpen = true;
  panel.classList.remove('hidden');
  if (document.pointerLockElement) document.exitPointerLock();
}

function completeTBM(phase) {
  TBM._completed.add(phase);
  INTERACTION.popupOpen = false;
  const panel = document.getElementById('tbm-panel');
  if (panel) panel.classList.add('hidden');

  // Unchecked items become violations
  const unchecked = document.querySelectorAll('#tbm-checklist .tbm-check-item:not(.checked)').length;
  if (unchecked > 0) {
    applySafetyPenalty(unchecked * 5);
    GAME.state.violations.add(`tbm_phase${phase}_${unchecked}unchecked`);
  }

  updateHUD();

  if (TBM._pendingCallback) {
    TBM._pendingCallback();
    TBM._pendingCallback = null;
  }

  if (GAME.state.gameStarted && !GAME.state.gameOver && window.matchMedia('(pointer: fine)').matches) {
    GAME.renderer.domElement.requestPointerLock();
  }
}

// ── NPC gathering animation ───────────────────────────────────
function _gatherNPCs() {
  if (!GAME.npcs) return;
  const cam = GAME.camera ? GAME.camera.position : new THREE.Vector3(0, 0, 0);
  const radius = 2.5;
  GAME.npcs.forEach((npc, i) => {
    const angle = (i / GAME.npcs.length) * Math.PI * 2;
    const tx = cam.x + Math.cos(angle) * radius;
    const tz = cam.z + Math.sin(angle) * radius;
    npc._targetPos = new THREE.Vector3(tx, 0, tz);

    let t = 0;
    const startX = npc.group.position.x, startZ = npc.group.position.z;
    function moveToGather() {
      t += 0.025;
      if (t > 1) t = 1;
      npc.group.position.x = startX + (tx - startX) * t;
      npc.group.position.z = startZ + (tz - startZ) * t;
      if (t < 1) requestAnimationFrame(moveToGather);
    }
    requestAnimationFrame(moveToGather);
  });
}

// ── Auto-show Phase 1 TBM after briefing closes ─────────────
function initTBM() {
  const _check = setInterval(() => {
    if (!GAME.state.gameStarted || TBM._completed.has(1)) { clearInterval(_check); return; }
    const briefing = document.getElementById('briefing-overlay');
    if (briefing && !briefing.classList.contains('hidden')) return; // wait for briefing
    const nameOverlay = document.getElementById('name-input-overlay');
    if (nameOverlay && !nameOverlay.classList.contains('hidden')) return; // wait for name input
    clearInterval(_check);
    setTimeout(() => showTBM(1, null), 400);
  }, 300);
}
