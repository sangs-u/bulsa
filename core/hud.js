// HUD — phase, mission, interact prompt, action notification

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

  // Phase label
  const phaseNames = [null, t('phase1'), t('phase2'), t('phase3')];
  const phaseEl = document.getElementById('hud-phase-text');
  if (phaseEl) phaseEl.textContent = `PHASE ${s.phase} · ${phaseNames[s.phase] || ''}`;

  // Mission
  const missionKeys = [null, 'mission1', 'mission2', 'mission3'];
  const mEl = document.getElementById('hud-mission');
  if (mEl) mEl.textContent = t(missionKeys[s.phase] || 'mission1');

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
