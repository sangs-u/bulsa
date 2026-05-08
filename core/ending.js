// Ending system — completion cutscene + printable certificate

const ENDING = {
  _running: false,
  _orbitAngle: 0,
  _orbitRadius: 22,
  _orbitHeight: 8,
  _orbitCenter: new THREE.Vector3(0, 5, -17),
  _duration: 6,   // seconds
  _elapsed: 0,
};

// ── Init ──────────────────────────────────────────────────────
function initEnding() {
  // Intercept showCompletePanel to optionally start cutscene
  const _origComplete = typeof showCompletePanel === 'function' ? showCompletePanel : null;
  if (_origComplete && !window._endingHooked) {
    window._endingHooked = true;
    window.showCompletePanel = function() {
      // Run cutscene first, then show panel
      startCompletionCutscene(() => _origComplete());
    };
  }
}

// ── Cutscene ──────────────────────────────────────────────────
function startCompletionCutscene(onDone) {
  if (ENDING._running) { if (onDone) onDone(); return; }
  ENDING._running = true;
  ENDING._elapsed = 0;
  ENDING._onDone  = onDone;

  // Show overlay
  const overlay = document.getElementById('cutscene-overlay');
  if (overlay) overlay.classList.remove('hidden');

  const caption = document.getElementById('cutscene-caption');
  if (caption) {
    const msg = currentLang === 'en'
      ? '✓  Lifting operation complete'
      : '✓  인양 작업 완료';
    setTimeout(() => {
      caption.textContent = msg;
      caption.classList.add('show');
    }, 500);
  }

  // Show "준공" banner text on building if exists
  if (BUILDING && BUILDING._bannerMesh) {
    BUILDING._bannerMesh.material.opacity = 1;
  }

  // Orbit camera animation
  let lastTime = 0;
  function orbitStep(now) {
    if (!ENDING._running) return;
    const delta = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    ENDING._elapsed += delta;

    const t = ENDING._elapsed / ENDING._duration;
    ENDING._orbitAngle += delta * (Math.PI / 4);  // 45°/sec

    if (GAME.camera && !PLAYER.isLocked) {
      const cx = ENDING._orbitCenter.x + Math.sin(ENDING._orbitAngle) * ENDING._orbitRadius;
      const cz = ENDING._orbitCenter.z + Math.cos(ENDING._orbitAngle) * ENDING._orbitRadius;
      const cy = ENDING._orbitCenter.y + ENDING._orbitHeight * (0.5 + 0.5 * Math.sin(t * Math.PI));
      GAME.camera.position.set(cx, cy, cz);
      GAME.camera.lookAt(ENDING._orbitCenter);
    }

    if (ENDING._elapsed < ENDING._duration) {
      requestAnimationFrame(orbitStep);
    } else {
      _endCutscene();
    }
  }
  requestAnimationFrame(orbitStep);
}

function _endCutscene() {
  ENDING._running = false;
  const overlay = document.getElementById('cutscene-overlay');
  if (overlay) overlay.classList.add('hidden');
  if (ENDING._onDone) ENDING._onDone();
}

// ── Certificate generation ─────────────────────────────────────
function showCertificate() {
  const overlay = document.getElementById('certificate-overlay');
  if (!overlay) return;

  const name = GAME.state.playerName || (currentLang === 'en' ? 'Player' : '수강자');
  const si   = GAME.state.safetyIndex;
  const resolved = GAME.state.hazardsResolved.size;
  const total    = GAME.hazards.length;
  const violated = GAME.state.violations.size;
  const date     = new Date().toLocaleDateString(currentLang === 'ko' ? 'ko-KR' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  // Grade calculation
  let grade, gradeClass;
  if (si >= 90 && resolved >= total - 1)       { grade = 'S'; gradeClass = 'grade-s'; }
  else if (si >= 75 && resolved >= total * 0.7) { grade = 'A'; gradeClass = 'grade-a'; }
  else                                           { grade = 'B'; gradeClass = 'grade-b'; }

  const isKo = currentLang !== 'en';

  const cert = document.getElementById('certificate');
  cert.innerHTML = `
    <div class="cert-header">
      <div class="cert-logo-text">BULSA</div>
      <div class="cert-title">${isKo ? '산업안전 교육 수료증' : 'Industrial Safety Training Certificate'}</div>
      <div class="cert-subtitle">불사(不死) 안전교육 시뮬레이션 / BULSA Safety Simulation</div>
    </div>

    <div class="cert-body">
      <p class="cert-statement">
        ${isKo
          ? `성명 <strong class="cert-name">${name}</strong> 은(는) 아래 산업안전 시뮬레이션 교육 과정을 성실히 이수하였음을 증명합니다.`
          : `This is to certify that <strong class="cert-name">${name}</strong> has successfully completed the following industrial safety simulation training.`
        }
      </p>

      <table class="cert-table">
        <thead>
          <tr>
            <th>${isKo ? '시나리오' : 'Scenario'}</th>
            <th>${isKo ? 'KOSHA 기준' : 'KOSHA Standard'}</th>
            <th>${isKo ? '안전지수' : 'Safety Index'}</th>
            <th>${isKo ? '등급' : 'Grade'}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${isKo ? '줄걸이·인양 작업 (S-01)' : 'Rigging & Lifting (S-01)'}</td>
            <td class="cert-kosha">G-133-2020 / B-M-12-2025</td>
            <td>${si}/100</td>
            <td class="${gradeClass}">${grade}</td>
          </tr>
        </tbody>
      </table>

      <table class="cert-table" style="margin-top:8px;">
        <tr>
          <th>${isKo ? '조치한 위험요소' : 'Hazards Fixed'}</th>
          <td>${resolved}/${total}</td>
          <th>${isKo ? '위반 기록' : 'Violations'}</th>
          <td>${violated}</td>
        </tr>
      </table>
    </div>

    <div class="cert-footer">
      <p>${isKo ? '관련 법령: 산업안전보건기준에 관한 규칙 제163조, 제164조, 제147조' : 'Applicable Regulations: OSH Standards §163, §164, §147'}</p>
      <p class="cert-date" style="margin-top:6px;">${isKo ? '이수 일시: ' : 'Completion Date: '}${date}</p>
      <div class="cert-seal">${isKo ? 'BULSA\n불사' : 'BULSA\nSAFETY'}</div>
      <p style="margin-top:10px; font-size:0.72rem;">${isKo
        ? '이 수료증은 BULSA 불사 안전교육 시뮬레이션 완료를 증명합니다.'
        : 'This certificate confirms completion of the BULSA industrial safety simulation.'
      }</p>
    </div>
  `;

  overlay.classList.remove('hidden');
}

// Helper: called from complete/accident panels
function openCertificate() {
  showCertificate();
}
