// Accident system — triggers, screen effects, panels

let _accFlashTimer = null;
let _accSlowTimer  = null;

function initAccident() {
  // nothing to init — event-driven
}

function updateAccident(delta) {
  // Could drive ongoing effects here if needed
}

// Called when a critical hazard is ignored AND lift is started
function triggerAccident(accidentId) {
  if (GAME.state.gameOver) return;
  GAME.state.gameOver = true;
  GAME.state.accidentTriggered = true;

  // Unlock pointer
  if (document.pointerLockElement) document.exitPointerLock();

  // Red flash effect
  _doFlash();

  // Slow-mo: just delay showing the panel
  setTimeout(() => showAccidentPanel(accidentId), 1400);
}

function _doFlash() {
  const overlay = document.getElementById('flash-overlay');
  if (!overlay) return;
  let count = 0;
  function flash() {
    if (count >= 5) { overlay.style.opacity = '0'; return; }
    overlay.style.opacity = count % 2 === 0 ? '0.65' : '0';
    count++;
    setTimeout(flash, 140);
  }
  flash();
}

function showAccidentPanel(accidentId) {
  const data = LIFTING_DATA.accidents[accidentId];
  if (!data) return;

  const isKo = currentLang === 'ko';

  document.getElementById('acc-title').textContent  = t('accidentTitle');
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
  const steps = isKo ? data.procedureKo : data.procedureEn;
  steps.forEach(step => {
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

  const resolved  = GAME.state.hazardsResolved.size;
  const violated  = GAME.state.violations.size;
  const total     = GAME.hazards.length;
  const isAllSafe = violated === 0;

  document.getElementById('cmp-title').textContent        = t('completeTitle');
  document.getElementById('cmp-msg').textContent          = isAllSafe ? t('safeComplete') : t('unsafeComplete');
  document.getElementById('cmp-lbl-si').textContent       = t('safetyIndex');
  document.getElementById('cmp-lbl-fixed').textContent    = t('hazardsFixed');
  document.getElementById('cmp-lbl-ignored').textContent  = t('hazardsIgnored');
  document.getElementById('cmp-btn-retry').textContent    = t('retry');
  document.getElementById('cmp-btn-hub').textContent      = t('backToHub');

  document.getElementById('cmp-si').textContent      = GAME.state.safetyIndex;
  document.getElementById('cmp-fixed').textContent   = `${resolved}/${total}`;
  document.getElementById('cmp-ignored').textContent = violated;

  document.getElementById('complete-panel').classList.remove('hidden');
}

// Deduct safety index for ignored hazard
function applySafetyPenalty(amount) {
  GAME.state.safetyIndex = Math.max(0, GAME.state.safetyIndex - amount);
  updateHUD();
}

// Add safety index for resolved hazard
function applySafetyReward(amount) {
  GAME.state.safetyIndex = Math.min(100, GAME.state.safetyIndex + amount);
  updateHUD();
}
