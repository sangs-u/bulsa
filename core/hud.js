// HUD — phase, mission, interact prompt, action notification

const PHASE_MISSIONS = {
  1: { ko: '📋 현장 사무실로 이동해 작업계획서를 작성하세요 (E키)', en: '📋 Go to site office and write the work plan (E)', vi: '📋 Đến văn phòng công trường và viết kế hoạch làm việc (E)', ar: '📋 اذهب إلى مكتب الموقع واكتب خطة العمل (E)' },
  2: { ko: '🔢 책상에서 안전성 검토를 완료하세요 (E키)', en: '🔢 Complete safety review at the desk (E)', vi: '🔢 Hoàn thành đánh giá an toàn tại bàn làm việc (E)', ar: '🔢 أكمل مراجعة السلامة على المكتب (E)' },
  3: { ko: '🏗 크레인 옆 아웃트리거 확장(E) · 운전석 앞 사양서도 확인하세요 (E키)', en: '🏗 Extend outriggers at crane (E) · Also check spec sheet near cab (E)', vi: '🏗 Mở rộng chân chống cần cẩu (E) · Xem tài liệu kỹ thuật gần cabin (E)', ar: '🏗 مدد أرجل الدعم في الرافعة (E) · تحقق من وثيقة المواصفات أيضاً (E)' },
  4: { ko: '🔧 슬링 점검·안전핀 체결·슬링 각도를 직접 확인하세요 (E키)', en: '🔧 Inspect sling, secure pin, and measure sling angle (E)', vi: '🔧 Kiểm tra dây cáp, chốt an toàn và đo góc dây (E)', ar: '🔧 افحص الحبال وأحكم البين وقِس زاوية الحبل (E)' },
  5: { ko: '🦺 신호수(김철수)에게 위치 지정(E) · 반경 내 근로자 대피(E)', en: '🦺 Assign signal person to position (E) · Evacuate worker from zone (E)', vi: '🦺 Chỉ định vị trí người ra hiệu (E) · Sơ tán công nhân (E)', ar: '🦺 حدد موقع المُوجِّه (E) · أخلِ العامل من المنطقة (E)' },
  6: { ko: '🏋 사양서 확인(E) → 운전석 탑승(E) → 인양 시작', en: '🏋 Check spec sheet (E) → Board cab (E) → Start lift', vi: '🏋 Xem tài liệu (E) → Vào cabin (E) → Bắt đầu nâng', ar: '🏋 تحقق من المواصفات (E) → اركب المقصورة (E) → ابدأ الرفع' },
};

const PHASE_NAMES = {
  1: { ko: '계획서',    en: 'Plan',      vi: 'Kế hoạch',    ar: 'الخطة' },
  2: { ko: '안전검토',  en: 'Safety',    vi: 'An toàn',      ar: 'مراجعة' },
  3: { ko: '장비세팅',  en: 'Equipment', vi: 'Thiết bị',     ar: 'المعدات' },
  4: { ko: '줄걸이',    en: 'Rigging',   vi: 'Buộc móc',     ar: 'الربط' },
  5: { ko: '현장세팅',  en: 'Site',      vi: 'Công trường',  ar: 'الموقع' },
  6: { ko: '인양',      en: 'Lift',      vi: 'Nâng tải',     ar: 'الرفع' },
};

function initHUD() {
  updateHUD();
}

function updateHUD() {
  const s = GAME.state;

  // Safety index bar (stays at 100 during play; updated on complete)
  const pct = Math.max(0, Math.min(100, s.safetyIndex));
  const bar = document.getElementById('hud-si-bar');
  if (bar) {
    bar.style.width      = pct + '%';
    bar.style.background = pct > 60 ? 'var(--teal)' : pct > 30 ? 'var(--amber)' : 'var(--red)';
  }
  const numEl = document.getElementById('hud-si-num');
  if (numEl) numEl.textContent = pct;

  // Phase label (시나리오 인식)
  const phase = Math.max(1, Math.min(6, s.phase || 1));
  let namesTbl   = PHASE_NAMES;
  let missionTbl = PHASE_MISSIONS;
  if (GAME.scenarioId === 'excavation' && typeof EXCAV_PHASE_NAMES !== 'undefined') {
    namesTbl   = EXCAV_PHASE_NAMES;
    missionTbl = EXCAV_PHASE_MISSIONS;
  } else if (GAME.scenarioId === 'foundation' && typeof FOUND_PHASE_NAMES !== 'undefined') {
    namesTbl   = FOUND_PHASE_NAMES;
    missionTbl = FOUND_PHASE_MISSIONS;
  }
  const phaseName = (namesTbl[phase] && namesTbl[phase][currentLang]) ||
                    (namesTbl[phase] && namesTbl[phase].ko) || '';
  const phaseEl = document.getElementById('hud-phase-text');
  if (phaseEl) phaseEl.textContent = `PHASE ${phase}/6 · ${phaseName}`;

  const missionObj = missionTbl[phase];
  const mText = missionObj
    ? (missionObj[currentLang] || missionObj.ko)
    : t('mission1');
  const mEl = document.getElementById('hud-mission');
  if (mEl) mEl.textContent = mText;

  const siLbl = document.getElementById('hud-si-label');
  if (siLbl) siLbl.textContent = t('safetyIndex');

  // 층수 진척
  const fEl = document.getElementById('hud-floors');
  if (fEl) {
    const done = s.completedFloors || 0;
    const tot  = s.targetFloors || 5;
    fEl.textContent = `🏗 ${done}/${tot}${t('floorUnit')}`;
  }

  // 작업반경 진입 위반 카운터
  const vEl = document.getElementById('hud-violations');
  if (vEl) {
    const n = s.unsafeViolations || 0;
    if (n > 0) {
      vEl.textContent = '⚠ ' + n;
      vEl.title = t('unsafeViolationsTip');
      vEl.classList.remove('hidden');
    } else {
      vEl.classList.add('hidden');
    }
  }
}

// ── Interact prompt ──────────────────────────────────────────
function showInteractPrompt(text) {
  const el = document.getElementById('hud-interact');
  if (!el) return;
  el.textContent = text || t('pressE');
  el.classList.add('visible');
}

function hideInteractPrompt() {
  const el = document.getElementById('hud-interact');
  if (el) el.classList.remove('visible');
}

// ── Action notification (brief, no success/fail judgment) ────
function showActionNotif(text, duration) {
  const el = document.getElementById('hud-action-notif');
  if (!el) return;
  el.textContent = text;
  el.classList.add('visible');
  if (el._timer) clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('visible'), duration || 2600);
}
