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
  } else if (GAME.scenarioId === 'envelope' && typeof ENV_PHASE_NAMES !== 'undefined') {
    namesTbl   = ENV_PHASE_NAMES;
    missionTbl = ENV_PHASE_MISSIONS;
  } else if (GAME.scenarioId === 'mep_finish' && typeof MEP_PHASE_NAMES !== 'undefined') {
    namesTbl   = MEP_PHASE_NAMES;
    missionTbl = MEP_PHASE_MISSIONS;
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

  // 층수 진척 (lifting 시나리오에서만)
  const fEl = document.getElementById('hud-floors');
  if (fEl) {
    if (GAME.scenarioId === 'lifting') {
      const done = s.completedFloors || 0;
      const tot  = s.targetFloors || 5;
      fEl.textContent = `🏗 ${done}/${tot}${t('floorUnit')}`;
      fEl.classList.remove('hidden');
    } else {
      fEl.classList.add('hidden');
    }
  }

  // 숙련도 — survey 활성 시 매설물탐지 Lv 표시
  const skEl = document.getElementById('hud-skill');
  if (skEl) {
    const lv = (s.skill && s.skill['매설물탐지']) || 0;
    if (typeof SURVEY !== 'undefined' && SURVEY.active) {
      skEl.textContent = `🎯 매설물탐지 Lv.${lv}`;
      skEl.classList.remove('hidden');
    } else {
      skEl.classList.add('hidden');
    }
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

  // 누적 과태료 표시
  const finesEl = document.getElementById('hud-fines');
  if (finesEl) {
    const krw = s.finesKrw || 0;
    if (krw > 0) {
      finesEl.textContent = '💰 ' + krw.toLocaleString('ko-KR') + '원';
      finesEl.classList.remove('hidden');
    } else {
      finesEl.classList.add('hidden');
    }
  }

  // 컴퍼스 — 카메라 yaw 기반 8방위 표시 (윈도우 21자)
  const cEl = document.getElementById('hud-compass-text');
  if (cEl && GAME.camera) {
    cEl.textContent = _renderCompass(GAME.camera.rotation.y);
  }
}

// ── 컴퍼스 렌더 (21자 윈도우, 중앙에 현재 방위) ───────────────
function _renderCompass(yaw) {
  // -π .. π → 0..360 deg, 0=N(player facing -Z)
  // three.js camera 의 yaw 는 회전. 플레이어가 -Z 향할 때 yaw=0 이고 그때가 북쪽이라 가정.
  let deg = -yaw * 180 / Math.PI;
  while (deg < 0) deg += 360;
  while (deg >= 360) deg -= 360;
  const TICKS = ['N','·','·','E','·','·','S','·','·','W','·','·']; // 12 ticks → 30° 간격
  const head = Math.round(deg / 30) % 12;
  // 21자 윈도우: 중앙 인덱스 10. 양쪽으로 10개 보임.
  const out = [];
  for (let i = -10; i <= 10; i++) {
    const idx = ((head + i) % 12 + 12) % 12;
    out.push(TICKS[idx]);
  }
  out[10] = '▲'; // 중앙 화살표
  return out.join(' ');
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
