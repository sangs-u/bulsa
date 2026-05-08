// Accident system — triggers, screen effects, panels

function initAccident() {}
function updateAccident() {}

function triggerAccident(accidentId) {
  if (GAME.state.gameOver) return;
  GAME.state.gameOver = true;

  if (document.pointerLockElement) document.exitPointerLock();

  _doFlash();
  setTimeout(() => showAccidentPanel(accidentId), 1400);
}

function _doFlash() {
  const overlay = document.getElementById('flash-overlay');
  if (!overlay) return;
  let n = 0;
  (function flash() {
    if (n >= 5) { overlay.style.opacity = '0'; return; }
    overlay.style.opacity = n % 2 === 0 ? '0.65' : '0';
    n++;
    setTimeout(flash, 140);
  })();
}

function showAccidentPanel(accidentId) {
  const data = LIFTING_DATA.accidents[accidentId];
  if (!data) return;
  const isKo = currentLang === 'ko';

  document.getElementById('acc-title').textContent     = t('accidentTitle');
  document.getElementById('acc-lbl-desc').textContent  = '사고 상황';
  document.getElementById('acc-lbl-cause').textContent = t('accidentCause');
  document.getElementById('acc-lbl-law').textContent   = t('accidentLaw');
  document.getElementById('acc-lbl-proc').textContent  = t('accidentProcedure');
  document.getElementById('acc-btn-retry').textContent = t('retry');
  document.getElementById('acc-btn-hub').textContent   = t('backToHub');

  document.getElementById('acc-desc').textContent  = isKo ? data.descKo  : data.descEn;
  document.getElementById('acc-cause').textContent = isKo ? data.causeKo : data.causeEn;
  document.getElementById('acc-law').textContent   = isKo ? data.lawKo   : data.lawEn;

  const ol = document.getElementById('acc-procedure');
  ol.innerHTML = '';
  (isKo ? data.procedureKo : data.procedureEn).forEach(step => {
    const li = document.createElement('li');
    li.textContent = step;
    ol.appendChild(li);
  });

  document.getElementById('accident-panel').classList.remove('hidden');
}

function showCompletePanel() {
  if (GAME.state.gameOver) return;
  GAME.state.gameOver = true;

  if (document.pointerLockElement) document.exitPointerLock();

  const checks = [
    { key: 'slingInspected',  ko: '슬링 점검',       en: 'Sling Inspection' },
    { key: 'pinSecured',      ko: '안전핀 체결',      en: 'Safety Pin Secured' },
    { key: 'specChecked',     ko: '사양서 확인',      en: 'Spec Sheet Reviewed' },
    { key: 'angleMeasured',   ko: '슬링 각도 측정',   en: 'Angle Measured' },
    { key: 'signalAssigned',  ko: '신호수 위치 지정', en: 'Signal Person Assigned' },
    { key: 'workerEvacuated', ko: '작업반경 대피 지시', en: 'Worker Evacuated' },
  ];

  const allDone = checks.every(c => LIFT_STATE[c.key]);
  const isKo    = currentLang === 'ko';

  document.getElementById('cmp-title').textContent    = t('completeTitle');
  document.getElementById('cmp-msg').textContent      = allDone ? t('safeComplete') : t('unsafeComplete');
  document.getElementById('cmp-btn-retry').textContent = t('retry');
  document.getElementById('cmp-btn-hub').textContent   = t('backToHub');

  // 조치 체크리스트
  const listEl = document.getElementById('cmp-checklist');
  if (listEl) {
    listEl.innerHTML = '';
    checks.forEach(c => {
      const done = LIFT_STATE[c.key];
      const div  = document.createElement('div');
      div.className  = 'check-item ' + (done ? 'check-done' : 'check-missed');
      div.textContent = (done ? '✓ ' : '✗ ') + (isKo ? c.ko : c.en);
      listEl.appendChild(div);
    });
  }

  document.getElementById('complete-panel').classList.remove('hidden');
}

// 이하 함수는 구 시스템 호환용 — 새 시스템에서 미사용
function applySafetyPenalty() {}
function applySafetyReward()  {}
