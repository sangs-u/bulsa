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

// ── TBM 3D 집합 방식 (모달 제거) ─────────────────────────────
// NPC 들이 플레이어 주위에 원형으로 모여 순서대로 대사를 말함.
// 모든 대사 완료 후 onComplete 호출.

function showTBM(phase, onComplete) {
  if (TBM._completed.has(phase)) {
    if (onComplete) onComplete();
    return;
  }

  TBM._pendingCallback = onComplete;
  const data = TBM_DATA[phase] || TBM_DATA[1];
  const sfx  = { ko: 'Ko', en: 'En', vi: 'Vi', ar: 'Ar' };
  const L    = sfx[currentLang] || 'Ko';

  // NPC 원형 집합
  _gatherNPCs();

  // 상단 진행 배너 표시
  _showTBMBanner(data['title' + L] || data.titleKo);

  // 대화 줄 구성: 오늘의 작업 + 위험요소 2개 + 체크리스트 항목 3개
  const lines = [
    data['work' + L] || data.workKo,
    ...(data['hazards' + L] || data.hazardsKo).slice(0, 2),
    ...(data['checklist' + L] || data.checklistKo).slice(0, 3),
  ];

  const npcs = (GAME.npcs || []).filter(n => n && n.group);
  let lineIdx = 0;

  function nextLine() {
    if (lineIdx >= lines.length) {
      setTimeout(() => _completeTBM3D(phase), 800);
      return;
    }
    const npc = npcs.length ? npcs[lineIdx % npcs.length] : null;
    const text = lines[lineIdx++];
    _showNpcBubble3D(npc, text, 2800);
    setTimeout(nextLine, 3000);
  }

  // NPC 이동 후 대화 시작
  setTimeout(nextLine, 1200);
}

// ── 대화 버블 표시 ────────────────────────────────────────────
let _tbmBubbleEl = null;
let _tbmBubbleTimer = null;

function _showNpcBubble3D(npc, text, duration) {
  if (_tbmBubbleEl) {
    clearTimeout(_tbmBubbleTimer);
    _tbmBubbleEl.remove();
    _tbmBubbleEl = null;
  }
  const el = document.createElement('div');
  el.style.cssText = [
    'position:fixed', 'pointer-events:none', 'z-index:4500',
    'background:rgba(10,18,30,0.90)', 'color:#F4F4F4',
    'padding:10px 16px', 'border-radius:12px',
    'font-family:monospace', 'font-size:13px', 'line-height:1.5',
    'border:1px solid rgba(255,200,0,0.35)', 'max-width:280px',
    'text-align:center', 'white-space:pre-wrap',
    'box-shadow:0 0 12px rgba(255,190,0,0.15)',
    'transform:translate(-50%,-100%)',
  ].join(';');

  const nameTag = npc && npc.name ? '<div style="font-size:10px;opacity:0.55;margin-bottom:4px">' + npc.name + '</div>' : '';
  el.innerHTML = nameTag + '<div>' + text + '</div>';
  document.body.appendChild(el);
  _tbmBubbleEl = el;

  // NPC 머리 위 위치 계산
  let sx = innerWidth / 2, sy = innerHeight * 0.32;
  if (npc && npc.group && GAME.camera) {
    const head = npc.group.position.clone();
    head.y += 1.9;
    const proj = head.project(GAME.camera);
    if (proj.z < 1) {
      sx = Math.max(160, Math.min(innerWidth - 160, (proj.x * 0.5 + 0.5) * innerWidth));
      sy = Math.max(60,  Math.min(innerHeight - 60, (-proj.y * 0.5 + 0.5) * innerHeight));
    }
  }
  el.style.left = sx + 'px';
  el.style.top  = sy + 'px';

  _tbmBubbleTimer = setTimeout(() => {
    if (_tbmBubbleEl === el) { el.remove(); _tbmBubbleEl = null; }
  }, duration);
}

// ── 상단 TBM 배너 ─────────────────────────────────────────────
let _tbmBannerEl = null;

function _showTBMBanner(title) {
  if (_tbmBannerEl) _tbmBannerEl.remove();
  const el = document.createElement('div');
  el.style.cssText = [
    'position:fixed', 'top:56px', 'left:50%', 'transform:translateX(-50%)',
    'background:rgba(0,0,0,0.78)', 'color:#FFD700',
    'padding:6px 20px', 'border-radius:20px',
    'font-family:monospace', 'font-size:13px', 'font-weight:bold',
    'letter-spacing:1px', 'z-index:4400', 'pointer-events:none',
    'border:1px solid rgba(255,215,0,0.3)',
  ].join(';');
  el.textContent = '📋 TBM — ' + title;
  document.body.appendChild(el);
  _tbmBannerEl = el;
}

// ── TBM 3D 완료 처리 ────────────────────────────────────────
function _completeTBM3D(phase) {
  TBM._completed.add(phase);
  if (_tbmBannerEl) { _tbmBannerEl.remove(); _tbmBannerEl = null; }
  if (_tbmBubbleEl) { _tbmBubbleEl.remove(); _tbmBubbleEl = null; }

  if (typeof showActionNotif === 'function') {
    const msg = { ko: '✅ TBM 완료 — 작업 시작!', en: '✅ TBM Complete — Let\'s work!',
                  vi: '✅ Hoàn thành TBM — Bắt đầu!', ar: '✅ اكتمل TBM — ابدأ العمل!' };
    showActionNotif(msg[currentLang] || msg.ko, 3000);
  }

  updateHUD();

  if (TBM._pendingCallback) {
    TBM._pendingCallback();
    TBM._pendingCallback = null;
  }

  if (GAME.state.gameStarted && !GAME.state.gameOver && window.matchMedia('(pointer: fine)').matches) {
    GAME.renderer.domElement.requestPointerLock().catch(() => {});
  }
}

function completeTBM(phase) { _completeTBM3D(phase); }

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
