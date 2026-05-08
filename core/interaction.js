// Interaction system — Raycaster proximity + E key popup

const INTERACTION = {
  raycaster: null,
  center: null,           // normalized (0,0) = screen center
  currentTarget: null,    // hazard or trigger currently in range
  popupOpen: false,
  interactKey: false,
};

function initInteraction() {
  INTERACTION.raycaster = new THREE.Raycaster();
  INTERACTION.center = new THREE.Vector2(0, 0);

  document.addEventListener('keydown', e => {
    if (e.code === 'KeyE' && !INTERACTION.popupOpen && INTERACTION.currentTarget && GAME.state.gameStarted) {
      openPopup(INTERACTION.currentTarget);
    }
  });

  // Close popup on Escape
  document.addEventListener('keydown', e => {
    if (e.code === 'Escape' && INTERACTION.popupOpen) closePopup();
  });

  // Mobile E button (tap on prompt)
  const promptEl = document.getElementById('hud-interact');
  if (promptEl) {
    promptEl.style.pointerEvents = 'auto';
    promptEl.addEventListener('click', () => {
      if (INTERACTION.currentTarget && !INTERACTION.popupOpen) {
        openPopup(INTERACTION.currentTarget);
      }
    });
  }
}

function updateInteraction() {
  if (INTERACTION.popupOpen || GAME.state.gameOver) return;

  INTERACTION.raycaster.setFromCamera(INTERACTION.center, GAME.camera);

  // Collect all interactable meshes
  const meshes = GAME.interactables.map(i => i.mesh).filter(Boolean);
  const hits = INTERACTION.raycaster.intersectObjects(meshes, false);

  let closest = null;

  if (hits.length > 0) {
    const hit = hits[0];
    // Only interact if within 3.5m
    if (hit.distance < 3.5) {
      closest = GAME.interactables.find(i => i.mesh === hit.object);
    }
  }

  // Also check proximity (for large objects that raycaster might miss)
  if (!closest) {
    const camPos = GAME.camera.position;
    let minDist = 2.5;
    GAME.interactables.forEach(item => {
      if (!item.mesh) return;
      const d = camPos.distanceTo(item.mesh.position);
      if (d < minDist) {
        minDist = d;
        closest = item;
      }
    });
  }

  INTERACTION.currentTarget = closest;

  if (closest) {
    const nameKey = closest.nameKey || (closest.type === 'trigger' ? 'trigger_panel_name' : null);
    const label = nameKey ? t(nameKey) : '';
    showInteractPrompt(`[E]  ${label}`);
  } else {
    hideInteractPrompt();
  }
}

function openPopup(item) {
  INTERACTION.popupOpen = true;

  // Release pointer lock so cursor is usable
  if (document.pointerLockElement) document.exitPointerLock();

  const popup = document.getElementById('hazard-popup');
  const titleEl  = document.getElementById('popup-title');
  const descEl   = document.getElementById('popup-desc');
  const btnAct   = document.getElementById('popup-btn-action');
  const btnIgn   = document.getElementById('popup-btn-ignore');

  if (item.type === 'trigger') {
    titleEl.textContent  = t('trigger_panel_name');
    descEl.textContent   = t('trigger_panel_desc');
    btnAct.textContent   = t('trigger_panel_action');
    btnIgn.textContent   = t('trigger_panel_cancel');

    btnAct.onclick = () => { closePopup(); startLift(); };
    btnIgn.onclick = () => closePopup();
  } else {
    // hazard
    const haz = GAME.hazards.find(h => h.id === item.hazardId);
    if (!haz || haz.resolved || haz.ignored) { closePopup(); return; }

    titleEl.textContent  = t(haz.nameKey);
    descEl.textContent   = t(haz.descKey);
    btnAct.textContent   = t(haz.actionKey);
    btnIgn.textContent   = t(haz.ignoreKey);

    btnAct.onclick = () => { closePopup(); resolveHazard(haz); };
    btnIgn.onclick = () => { closePopup(); ignoreHazard(haz); };
  }

  popup.classList.remove('hidden');
}

function closePopup() {
  INTERACTION.popupOpen = false;
  document.getElementById('hazard-popup').classList.add('hidden');

  // Re-acquire pointer lock if game is running
  if (GAME.state.gameStarted && !GAME.state.gameOver && window.matchMedia('(pointer: fine)').matches) {
    GAME.renderer.domElement.requestPointerLock();
  }
}

function resolveHazard(haz) {
  if (haz.resolved || haz.ignored) return;
  haz.resolved = true;
  GAME.state.hazardsResolved.add(haz.id);

  // Visual feedback: make hazard mesh dim / green tint
  if (haz.mesh) {
    haz.mesh.material.color.setHex(0x00A896);
    haz.mesh.material.opacity = 0.4;
    haz.mesh.material.transparent = true;
  }

  applySafetyReward(haz.safetyReward || 5);

  // Remove from interactables
  GAME.interactables = GAME.interactables.filter(i => i.hazardId !== haz.id);
  INTERACTION.currentTarget = null;
  hideInteractPrompt();
}

function ignoreHazard(haz) {
  if (haz.resolved || haz.ignored) return;
  haz.ignored = true;
  GAME.state.violations.add(haz.id);

  // Visual: red flicker then dim
  if (haz.mesh) {
    haz.mesh.material.color.setHex(0xDC2626);
    haz.mesh.material.opacity = 0.55;
    haz.mesh.material.transparent = true;
  }

  applySafetyPenalty(haz.safetyPenalty || 15);

  GAME.interactables = GAME.interactables.filter(i => i.hazardId !== haz.id);
  INTERACTION.currentTarget = null;
  hideInteractPrompt();
}

function startLift() {
  GAME.state.phase = 2;
  updateHUD();

  // Remove crane panel from interactables
  GAME.interactables = GAME.interactables.filter(i => i.type !== 'trigger');

  // Check for critical violations in priority order
  const criticalOrder = ['sling_damage', 'worker_in_zone', 'pin_unsecured', 'overload', 'angle_exceeded', 'no_signal'];

  for (const id of criticalOrder) {
    if (GAME.state.violations.has(id)) {
      const accidentMap = {
        sling_damage:  'sling_snap',
        worker_in_zone: 'worker_crush',
        pin_unsecured: 'pin_drop',
        overload:      'overload',
        angle_exceeded: 'angle_break',
        no_signal:     'no_signal',
      };
      triggerAccident(accidentMap[id]);
      return;
    }
  }

  // All critical hazards resolved — animate lift then complete
  animateLift();
}

function animateLift() {
  const beam = GAME.liftBeam;
  if (!beam) { showCompletePanel(); return; }

  const target = 8;
  const speed  = 2;

  function rise() {
    if (GAME.state.gameOver) return;
    beam.position.y += speed * 0.016;
    if (beam.position.y < target) {
      requestAnimationFrame(rise);
    } else {
      // also lift the sling wires if present
      GAME.state.phase = 3;
      updateHUD();
      setTimeout(showCompletePanel, 800);
    }
  }
  rise();
}
