// HUD — phase, mission, interact prompt, action notification

const PHASE_MISSIONS = {
  1: { ko: '📋 현장 사무실로 이동해 작업계획서를 작성하세요 (E키)', en: '📋 Go to site office and write the work plan (E)', vi: '📋 Đến văn phòng công trường và viết kế hoạch làm việc (E)', ar: '📋 اذهب إلى مكتب الموقع واكتب خطة العمل (E)' },
  2: { ko: '🔢 책상에서 안전성 검토를 완료하세요 (E키)', en: '🔢 Complete safety review at the desk (E)', vi: '🔢 Hoàn thành đánh giá an toàn tại bàn làm việc (E)', ar: '🔢 أكمل مراجعة السلامة على المكتب (E)' },
  3: { ko: '🏗 크레인 옆으로 이동해 아웃트리거를 확장하세요 (E키)', en: '🏗 Go to crane and extend outriggers (E)', vi: '🏗 Đến cần cẩu và mở rộng chân chống (E)', ar: '🏗 اذهب إلى الرافعة ومدد أرجل الدعم (E)' },
  4: { ko: '🔧 슬링 점검·안전핀 체결·슬링 각도를 직접 확인하세요 (E키)', en: '🔧 Inspect sling, secure pin, and measure sling angle (E)', vi: '🔧 Kiểm tra dây cáp, chốt an toàn và đo góc dây (E)', ar: '🔧 افحص الحبال وأحكم البين وقِس زاوية الحبل (E)' },
  5: { ko: '🦺 신호수 배치 및 작업반경 대피를 확인하세요', en: '🦺 Assign signalman and evacuate work zone', vi: '🦺 Bố trí người ra hiệu và sơ tán khu vực làm việc', ar: '🦺 عيّن المُوجِّه وأخلِ منطقة العمل' },
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

  // Phase label (phases 1-6)
  const phase = Math.max(1, Math.min(6, s.phase || 1));
  const phaseName = (PHASE_NAMES[phase] && PHASE_NAMES[phase][currentLang]) ||
                    (PHASE_NAMES[phase] && PHASE_NAMES[phase].ko) || '';
  const phaseEl = document.getElementById('hud-phase-text');
  if (phaseEl) phaseEl.textContent = `PHASE ${phase}/6 · ${phaseName}`;

  // Mission text (phases 1-6)
  const missionObj = PHASE_MISSIONS[phase];
  const mText = missionObj
    ? (missionObj[currentLang] || missionObj.ko)
    : t('mission1');
  const mEl = document.getElementById('hud-mission');
  if (mEl) mEl.textContent = mText;

  const siLbl = document.getElementById('hud-si-label');
  if (siLbl) siLbl.textContent = t('safetyIndex');
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
