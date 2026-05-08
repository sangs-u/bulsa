// HUD — reads GAME.state, updates DOM elements

function initHUD() {
  updateHUD();
}

function updateHUD() {
  const s = GAME.state;

  // Safety index bar
  const pct = Math.max(0, Math.min(100, s.safetyIndex));
  const bar = document.getElementById('hud-si-bar');
  bar.style.width = pct + '%';
  bar.style.background = pct > 60 ? 'var(--teal)' : pct > 30 ? 'var(--amber)' : 'var(--red)';
  document.getElementById('hud-si-num').textContent = pct;

  // Phase
  const phaseNames = [null, t('phase1'), t('phase2'), t('phase3')];
  const phaseEl = document.getElementById('hud-phase-text');
  if (phaseEl) phaseEl.textContent = `PHASE ${s.phase} · ${phaseNames[s.phase] || ''}`;

  // Mission
  const missionKeys = [null, 'mission1', 'mission2', 'mission3'];
  const mEl = document.getElementById('hud-mission');
  if (mEl) mEl.textContent = t(missionKeys[s.phase] || 'mission1');

  // Labels (i18n)
  const siLbl = document.getElementById('hud-si-label');
  if (siLbl) siLbl.textContent = t('safetyIndex');
}

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
