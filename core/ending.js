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
    const msgs = { ko: '✓  인양 작업 완료', en: '✓  Lifting operation complete', vi: '✓  Hoàn thành nâng tải', ar: '✓  اكتملت عملية الرفع' };
    setTimeout(() => {
      caption.textContent = msgs[currentLang] || msgs.ko;
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

  const defaultNames = { ko: '수강자', en: 'Player', vi: 'Học viên', ar: 'المتدرب' };
  const name = GAME.state.playerName || defaultNames[currentLang] || '수강자';
  const si   = GAME.state.safetyIndex;
  const violated = GAME.state.violations.size;
  const locales  = { ko: 'ko-KR', en: 'en-US', vi: 'vi-VN', ar: 'ar-SA' };
  const date = new Date().toLocaleDateString(locales[currentLang] || 'ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  // Grade based on safety index (impacted by TBM completeness + NPC instructions)
  let grade, gradeClass;
  if (si >= 90)      { grade = 'S'; gradeClass = 'grade-s'; }
  else if (si >= 70) { grade = 'A'; gradeClass = 'grade-a'; }
  else               { grade = 'B'; gradeClass = 'grade-b'; }

  const T = {
    ko: {
      certTitle:  '산업안전 교육 수료증',
      statement:  `성명 <strong class="cert-name">${name}</strong> 은(는) 아래 산업안전 시뮬레이션 교육 과정을 성실히 이수하였음을 증명합니다.`,
      thScenario: '시나리오', thKosha: 'KOSHA 기준', thSI: '명', thGrade: '등급',
      scenario:   '줄걸이·인양 작업 (S-01)',
      thSI2: '명', thViol: '위반 기록',
      law:  '관련 법령: 산업안전보건기준에 관한 규칙 제163조, 제164조, 제147조',
      dateLabel: '이수 일시: ',
      seal: 'BULSA\n불사',
      footer: '이 수료증은 BULSA 불사 안전교육 시뮬레이션 완료를 증명합니다.',
    },
    en: {
      certTitle:  'Industrial Safety Training Certificate',
      statement:  `This is to certify that <strong class="cert-name">${name}</strong> has successfully completed the following industrial safety simulation training.`,
      thScenario: 'Scenario', thKosha: 'KOSHA Standard', thSI: 'Lives', thGrade: 'Grade',
      scenario:   'Rigging & Lifting (S-01)',
      thSI2: 'Lives', thViol: 'Violations',
      law:  'Applicable Regulations: OSH Standards §163, §164, §147',
      dateLabel: 'Completion Date: ',
      seal: 'BULSA\nSAFETY',
      footer: 'This certificate confirms completion of the BULSA industrial safety simulation.',
    },
    vi: {
      certTitle:  'Chứng chỉ đào tạo an toàn lao động',
      statement:  `Chứng nhận <strong class="cert-name">${name}</strong> đã hoàn thành chương trình mô phỏng đào tạo an toàn lao động dưới đây.`,
      thScenario: 'Kịch bản', thKosha: 'Tiêu chuẩn KOSHA', thSI: 'Mạng', thGrade: 'Xếp loại',
      scenario:   'Buộc móc & Nâng tải (S-01)',
      thSI2: 'Mạng', thViol: 'Vi phạm',
      law:  'Quy định áp dụng: Điều 163, 164, 147 – Tiêu chuẩn ATVSLĐ',
      dateLabel: 'Ngày hoàn thành: ',
      seal: 'BULSA\nSAFETY',
      footer: 'Chứng chỉ này xác nhận đã hoàn thành mô phỏng an toàn lao động BULSA.',
    },
    ar: {
      certTitle:  'شهادة تدريب السلامة الصناعية',
      statement:  `يُشهد بأن <strong class="cert-name">${name}</strong> قد أتمّ بنجاح برنامج المحاكاة التدريبي للسلامة الصناعية الموضّح أدناه.`,
      thScenario: 'السيناريو', thKosha: 'معيار KOSHA', thSI: 'أرواح', thGrade: 'الدرجة',
      scenario:   'ربط الأحمال والرفع (S-01)',
      thSI2: 'أرواح', thViol: 'المخالفات',
      law:  'اللوائح المطبّقة: المادة 163 و164 و147 – معايير السلامة',
      dateLabel: 'تاريخ الإتمام: ',
      seal: 'BULSA\nSAFETY',
      footer: 'تؤكد هذه الشهادة إتمام محاكاة السلامة الصناعية BULSA.',
    },
  };
  const c = T[currentLang] || T.ko;

  const cert = document.getElementById('certificate');
  cert.innerHTML = `
    <div class="cert-header">
      <div class="cert-logo-text">BULSA</div>
      <div class="cert-title">${c.certTitle}</div>
      <div class="cert-subtitle">불사(不死) 안전교육 시뮬레이션 / BULSA Safety Simulation</div>
    </div>

    <div class="cert-body">
      <p class="cert-statement">${c.statement}</p>

      <table class="cert-table">
        <thead>
          <tr>
            <th>${c.thScenario}</th>
            <th>${c.thKosha}</th>
            <th>${c.thSI}</th>
            <th>${c.thGrade}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${c.scenario}</td>
            <td class="cert-kosha">G-133-2020 / B-M-12-2025</td>
            <td>${si}/100</td>
            <td class="${gradeClass}">${grade}</td>
          </tr>
        </tbody>
      </table>

      <table class="cert-table" style="margin-top:8px;">
        <tr>
          <th>${c.thSI2}</th>
          <td>${si}/100</td>
          <th>${c.thViol}</th>
          <td>${violated}</td>
        </tr>
      </table>
    </div>

    <div class="cert-footer">
      <p>${c.law}</p>
      <p class="cert-date" style="margin-top:6px;">${c.dateLabel}${date}</p>
      <div class="cert-seal">${c.seal}</div>
      <p style="margin-top:10px; font-size:0.72rem;">${c.footer}</p>
    </div>
  `;

  overlay.classList.remove('hidden');
}

// Helper: called from complete/accident panels
function openCertificate() {
  showCertificate();
}
