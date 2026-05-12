// Accident system — triggers, screen effects, panels

function initAccident() {}
function updateAccident() {}

// ── 사고 유형별 관련 LIFT_STATE 항목 ─────────────────────────
const ACCIDENT_REQUIRED = {
  sling_snap:   ['slingInspected'],
  angle_break:  ['angleMeasured'],
  pin_drop:     ['pinSecured'],
  worker_crush: ['workerEvacuated'],
  no_signal:    ['signalAssigned'],
  overload:     ['specChecked', 'slingInspected'],
};

const LIFT_STATE_LABELS = {
  slingInspected:  '슬링 점검',
  pinSecured:      '안전핀 체결',
  specChecked:     '사양서 확인',
  angleMeasured:   '슬링 각도 측정',
  signalAssigned:  '신호수 위치 지정',
  workerEvacuated: '작업반경 대피 지시',
};

function triggerAccident(accidentId) {
  if (GAME.state.gameOver) return;
  GAME.state.gameOver = true;

  if (document.pointerLockElement) document.exitPointerLock();

  _triggerAccidentVFX(accidentId);

  if (typeof SOUND !== 'undefined') {
    SOUND.impact();
    setTimeout(() => SOUND.siren(), 600);
  }

  _doFlash();
  _shakeCamera(0.7);
  setTimeout(() => showAccidentPanel(accidentId), 2400);
}

// ── 사고 유형별 시각 연출 ─────────────────────────────────────
function _triggerAccidentVFX(accidentId) {
  switch (accidentId) {
    case 'sling_snap':
    case 'angle_break':
    case 'pin_drop':
      // 보 낙하 + 슬링 작업자 래그돌
      _animBeamFall();
      _ragdollNPC('park', Math.PI * 0.2);   // 박영수 — 슬링작업자
      _ragdollNPC('lee',  Math.PI * 0.85);  // 이민호 — 고소작업자
      break;

    case 'worker_crush':
      // 작업반경 내 근로자 래그돌
      _ragdollDangerWorker();
      _animBeamFall();
      break;

    case 'overload':
      // 붐 파손 — 빔 낙하 + 슬링 작업자 래그돌
      _animBeamFall();
      _ragdollNPC('park', Math.PI * 0.3);
      break;

    case 'no_signal':
      // 신호수 래그돌
      _ragdollNPC('gimc', Math.PI);
      break;
  }
}

// NPC 래그돌 트리거
function _ragdollNPC(npcId, dirY) {
  if (!GAME.npcs) return;
  const npc = GAME.npcs.find(n => n.id === npcId);
  if (npc && typeof npc.startRagdoll === 'function') npc.startRagdoll(dirY);
}

// 작업반경 내 하드코딩 근로자 래그돌
function _ragdollDangerWorker() {
  const w = GAME._dangerWorker;
  if (!w || !w.group) return;
  const g = w.group;
  let rt   = 0;
  (function fall() {
    rt += 0.016;
    if (rt < 0.22) {
      g.rotation.z = Math.sin(rt * 36) * 0.3 * (rt / 0.22);
    } else if (rt < 0.95) {
      const ft = (rt - 0.22) / 0.73;
      g.rotation.x = ft * (Math.PI * 0.47);
      g.position.y = Math.max(0, 0.9 * (1 - ft * ft));
    } else {
      g.rotation.x = Math.PI * 0.47;
      g.position.y = 0;
      return;
    }
    requestAnimationFrame(fall);
  })();
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
  // 시나리오 인식: 활성 데이터셋에서 사고 정보 조회
  let dataset = LIFTING_DATA;
  if (GAME.scenarioId === 'excavation' && typeof EXCAVATION_DATA !== 'undefined') {
    dataset = EXCAVATION_DATA;
  } else if (GAME.scenarioId === 'foundation' && typeof FOUNDATION_DATA !== 'undefined') {
    dataset = FOUNDATION_DATA;
  } else if (GAME.scenarioId === 'envelope' && typeof ENVELOPE_DATA !== 'undefined') {
    dataset = ENVELOPE_DATA;
  } else if (GAME.scenarioId === 'mep_finish' && typeof MEP_DATA !== 'undefined') {
    dataset = MEP_DATA;
  }
  // 시나리오 데이터에 없으면 글로벌 사고에서 조회 (추락 등)
  let data = dataset.accidents[accidentId];
  if (!data && typeof GLOBAL_ACCIDENTS !== 'undefined') {
    data = GLOBAL_ACCIDENTS[accidentId];
  }
  if (!data) return;
  const isKo = currentLang === 'ko';

  document.getElementById('acc-title').textContent     = t('accidentTitle');
  document.getElementById('acc-lbl-desc').textContent  = t('accidentSituation');
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

  // ── 미이행 항목 섹션 ─────────────────────────────────────
  const missedWrap = document.getElementById('acc-missed-wrap');
  const missedList = document.getElementById('acc-missed-list');
  if (missedWrap && missedList) {
    const required = ACCIDENT_REQUIRED[accidentId] || [];
    missedList.innerHTML = '';
    if (required.length > 0 && typeof LIFT_STATE !== 'undefined') {
      required.forEach(key => {
        const done  = !!LIFT_STATE[key];
        const label = LIFT_STATE_LABELS[key] || key;
        const span  = document.createElement('span');
        span.className   = done ? 'done-item' : 'missed-item';
        span.textContent = done ? ('✓ ' + label) : ('⚠ ' + label);
        missedList.appendChild(span);
      });
      missedWrap.classList.remove('hidden');
    } else {
      missedWrap.classList.add('hidden');
    }
  }

  document.getElementById('accident-panel').classList.remove('hidden');
}

function showCompletePanel() {
  if (GAME.state.gameOver) return;
  GAME.state.gameOver = true;

  if (document.pointerLockElement) document.exitPointerLock();

  // 시나리오별 체크리스트
  const checksByScenario = {
    lifting: [
      { state: 'LIFT_STATE', key: 'slingInspected',  ko: '슬링 점검' },
      { state: 'LIFT_STATE', key: 'pinSecured',      ko: '안전핀 체결' },
      { state: 'LIFT_STATE', key: 'specChecked',     ko: '사양서 확인' },
      { state: 'LIFT_STATE', key: 'angleMeasured',   ko: '슬링 각도 측정' },
      { state: 'LIFT_STATE', key: 'signalAssigned',  ko: '신호수 위치 지정' },
      { state: 'LIFT_STATE', key: 'workerEvacuated', ko: '작업반경 대피 지시' },
    ],
    excavation: [
      { state: 'EXCAV_STATE', key: 'planWritten',       ko: '작업계획서 작성' },
      { state: 'EXCAV_STATE', key: 'surveyDone',        ko: '매설물 사전조사' },
      { state: 'EXCAV_STATE', key: 'shoringInstalled', ko: '흙막이 점검' },
      { state: 'EXCAV_STATE', key: 'railingInstalled', ko: '안전난간 설치' },
      { state: 'EXCAV_STATE', key: 'signalAssigned',    ko: '신호수 배치' },
    ],
    foundation: [
      { state: 'FOUND_STATE', key: 'planWritten',      ko: '작업계획서 작성' },
      { state: 'FOUND_STATE', key: 'rebarCapsOk',      ko: '철근 보호캡 점검' },
      { state: 'FOUND_STATE', key: 'formworkOk',       ko: '거푸집·동바리 점검' },
      { state: 'FOUND_STATE', key: 'pumpOk',           ko: '펌프카 점검' },
      { state: 'FOUND_STATE', key: 'pourOrderAgreed', ko: '타설 순서 합의' },
    ],
    envelope: [
      { state: 'ENV_STATE', key: 'planWritten',         ko: '작업계획서 작성' },
      { state: 'ENV_STATE', key: 'scaffoldInspected',  ko: '비계 조립검사' },
      { state: 'ENV_STATE', key: 'lifelineInstalled', ko: '안전대 부착설비' },
      { state: 'ENV_STATE', key: 'panelSecured',       ko: '외장재 결속 점검' },
      { state: 'ENV_STATE', key: 'signalAssigned',     ko: '신호수 배치' },
    ],
    mep_finish: [
      { state: 'MEP_STATE', key: 'planWritten',    ko: '작업계획서 작성' },
      { state: 'MEP_STATE', key: 'lotoApplied',    ko: 'LOTO 잠금·표지' },
      { state: 'MEP_STATE', key: 'gasChecked',     ko: '가스누설 점검' },
      { state: 'MEP_STATE', key: 'ventActivated', ko: '환기·국소배기' },
      { state: 'MEP_STATE', key: 'extVerified',    ko: '소화기 배치' },
    ],
  };
  const checks = checksByScenario[GAME.scenarioId] || checksByScenario.lifting;
  function _getState(st) {
    try { return (typeof window !== 'undefined') ? window[st] : eval(st); } catch(e) { return null; }
  }
  function _check(c) {
    const s = _getState(c.state);
    return s && s[c.key];
  }
  const allDone = checks.every(c => _check(c));
  const L = currentLang;

  document.getElementById('cmp-title').textContent    = t('completeTitle');
  document.getElementById('cmp-msg').textContent      = allDone ? t('safeComplete') : t('unsafeComplete');
  document.getElementById('cmp-btn-retry').textContent = t('retry');
  document.getElementById('cmp-btn-hub').textContent   = t('backToHub');

  // 조치 체크리스트
  const listEl = document.getElementById('cmp-checklist');
  if (listEl) {
    listEl.innerHTML = '';
    checks.forEach(c => {
      const done = _check(c);
      const div  = document.createElement('div');
      div.className  = 'check-item ' + (done ? 'check-done' : 'check-missed');
      div.textContent = (done ? '✓ ' : '✗ ') + (c[L] || c.ko);
      listEl.appendChild(div);
    });
    // 점수 요약 — 안전지수 / 과태료 / 등급
    const fines  = GAME.state.finesKrw || 0;
    const si     = GAME.state.safetyIndex || 0;
    const grade  = _calcGrade(si, fines, allDone);

    const sumDiv = document.createElement('div');
    sumDiv.style.cssText = 'margin-top:12px;border-top:1px solid #4A5568;padding-top:10px;font-size:13px;line-height:1.7';
    sumDiv.innerHTML = `
      <div>🛡 안전지수: <b style="color:${si >= 80 ? '#48BB78' : si >= 50 ? '#ED8936' : '#F56565'}">${si}/100</b></div>
      <div>💰 누적 과태료: <b style="color:${fines === 0 ? '#48BB78' : '#F56565'}">₩${fines.toLocaleString('ko-KR')}</b></div>
      <div style="margin-top:6px">🏅 종합 등급: <b style="color:${grade.color};font-size:16px">${grade.label}</b></div>
    `;
    listEl.appendChild(sumDiv);

    // 통계 + 업적 기록
    const ctx = { allDone, accident: false, fines, safetyIndex: si, grade, cumulativeFines: fines };
    if (typeof recordCompletion === 'function') recordCompletion(GAME.scenarioId, ctx);
    if (typeof evalAchievementsOnComplete === 'function') evalAchievementsOnComplete(GAME.scenarioId, ctx);
    if (typeof sfx === 'function') sfx('achievement');
  }

  // 다음 공정 버튼 + 자동 진행 카운트다운
  const nextBtn = document.getElementById('cmp-btn-next');
  if (nextBtn) {
    if (GAME.nextScenarioId) {
      const nextLabelsL = {
        ko: { excavation: '🏗 다음: 토공사 →', foundation: '🏗 다음: 기초공사 →', lifting: '🏗 다음: 골조 양중 →', envelope: '🏗 다음: 외장공사 →', mep_finish: '🏗 다음: 설비·마감 →' },
        en: { excavation: '🏗 Next: Earthworks →', foundation: '🏗 Next: Foundation →', lifting: '🏗 Next: RC Lifting →', envelope: '🏗 Next: Envelope →', mep_finish: '🏗 Next: MEP/Finish →' },
        vi: { excavation: '🏗 Tiếp: San nền →', foundation: '🏗 Tiếp: Móng →', lifting: '🏗 Tiếp: Nâng tải →', envelope: '🏗 Tiếp: Vỏ ngoài →', mep_finish: '🏗 Tiếp: M&E/Hoàn thiện →' },
        ar: { excavation: '🏗 التالي: الحفر →', foundation: '🏗 التالي: الأساسات →', lifting: '🏗 التالي: الرفع →', envelope: '🏗 التالي: الواجهة →', mep_finish: '🏗 التالي: التركيب والتشطيب →' },
      };
      const baseLabel = (nextLabelsL[L] || nextLabelsL.ko)[GAME.nextScenarioId] || '다음 공정 →';
      nextBtn.dataset.baseLabel = baseLabel;
      nextBtn.textContent = baseLabel;
      nextBtn.style.display = '';

      // 사고 없이 완료(allDone) 시에만 자동 진행 — 미흡 완료는 사용자 검토 후 수동
      if (allDone) {
        const countdownText = { ko: '초 후 자동 진행', en: 's auto-advance', vi: 's tự chuyển', ar: 'ث للمتابعة' };
        let remain = 8;
        nextBtn.textContent = `${baseLabel}  (${remain}${countdownText[L] || countdownText.ko})`;
        if (GAME._nextScenarioTimer) clearInterval(GAME._nextScenarioTimer);
        GAME._nextScenarioTimer = setInterval(() => {
          remain -= 1;
          if (remain <= 0) {
            clearInterval(GAME._nextScenarioTimer);
            GAME._nextScenarioTimer = null;
            if (typeof goNextScenario === 'function') goNextScenario();
          } else {
            nextBtn.textContent = `${baseLabel}  (${remain}${countdownText[L] || countdownText.ko})`;
          }
        }, 1000);
        // 패널 내 임의 클릭으로 자동진행 취소
        const cancelAuto = () => {
          if (GAME._nextScenarioTimer) {
            clearInterval(GAME._nextScenarioTimer);
            GAME._nextScenarioTimer = null;
            nextBtn.textContent = baseLabel;
          }
        };
        const panelEl = document.getElementById('complete-panel');
        if (panelEl) {
          ['mousedown', 'touchstart'].forEach(evt => {
            panelEl.addEventListener(evt, cancelAuto, { once: true });
          });
        }
      }
    } else {
      nextBtn.style.display = 'none';
    }
  }

  document.getElementById('complete-panel').classList.remove('hidden');

  // 모두 완료 시 2초 후 수료증 자동 표시 (마지막 공정에서만)
  if (allDone && !GAME.nextScenarioId && typeof showCertificate === 'function') {
    setTimeout(() => showCertificate(), 2000);
  }
}

// ── Beam fall animation ────────────────────────────────────────
function _animBeamFall() {
  const beam = GAME.liftBeam;
  if (!beam) return;
  let vy = 0;
  (function fall() {
    if (beam.position.y > -0.5) {
      vy += 0.016 * 9.8 * 0.016;
      beam.position.y -= vy;
      beam.rotation.z += 0.018;
      requestAnimationFrame(fall);
    } else {
      _spawnDebris(beam.position.clone());
    }
  })();
}

// ── Debris (InstancedMesh) ─────────────────────────────────────
function _spawnDebris(origin) {
  const count = 28;
  const mat  = new THREE.MeshLambertMaterial({ color: 0x888080 });
  const geo  = new THREE.BoxGeometry(0.14, 0.10, 0.14);
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  GAME.scene.add(mesh);

  const dummy = new THREE.Object3D();
  const vels  = [];
  for (let i = 0; i < count; i++) {
    dummy.position.set(
      origin.x + (Math.random()-0.5)*2,
      origin.y + 0.3,
      origin.z + (Math.random()-0.5)*2
    );
    dummy.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    vels.push(new THREE.Vector3(
      (Math.random()-0.5)*4,
      Math.random()*5 + 2,
      (Math.random()-0.5)*4
    ));
  }
  mesh.instanceMatrix.needsUpdate = true;

  let t = 0;
  const positions = Array.from({length: count}, (_, i) => {
    const m = new THREE.Matrix4(); mesh.getMatrixAt(i, m);
    return new THREE.Vector3().setFromMatrixPosition(m);
  });

  (function animDebris() {
    if (t > 2.0) { GAME.scene.remove(mesh); return; }
    t += 0.016;
    for (let i = 0; i < count; i++) {
      vels[i].y -= 9.8 * 0.016;
      positions[i].addScaledVector(vels[i], 0.016);
      if (positions[i].y < 0) { positions[i].y = 0; vels[i].y *= -0.3; }
      dummy.position.copy(positions[i]);
      dummy.rotation.set(t+i, t*1.3+i, t*0.7+i);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    requestAnimationFrame(animDebris);
  })();
}

// ── Camera shake ──────────────────────────────────────────────
function _shakeCamera(duration) {
  const cam = GAME.camera;
  if (!cam) return;
  const origin = cam.position.clone();
  let t = 0;
  const intensity = 0.18;
  (function shake() {
    if (t > duration) { cam.position.copy(origin); return; }
    t += 0.016;
    const decay = 1 - t / duration;
    cam.position.set(
      origin.x + (Math.random()-0.5) * intensity * decay,
      origin.y + (Math.random()-0.5) * intensity * decay,
      origin.z + (Math.random()-0.5) * intensity * decay
    );
    requestAnimationFrame(shake);
  })();
}

// 종합 등급 산정 (S/A/B/C/D) — 안전지수 + 과태료 + 모든 체크리스트 통과 여부
function _calcGrade(si, fines, allDone) {
  let score = si;
  if (fines > 0) score -= Math.min(40, fines / 200000);   // 과태료 200만원 당 -10
  if (!allDone) score -= 15;
  score = Math.max(0, Math.min(100, score));
  if (score >= 92) return { label: 'S — 안전 모범 작업장', color: '#FFD700' };
  if (score >= 80) return { label: 'A — 우수',             color: '#48BB78' };
  if (score >= 65) return { label: 'B — 양호',             color: '#4DB8E0' };
  if (score >= 50) return { label: 'C — 보통',             color: '#ED8936' };
  return                     { label: 'D — 개선 필요',     color: '#F56565' };
}

function applySafetyPenalty(points) {
  if (!points) return;
  GAME.state.safetyIndex = Math.max(0, GAME.state.safetyIndex - points);
  updateHUD();
}

function applySafetyReward(points) {
  if (!points) return;
  GAME.state.safetyIndex = Math.min(100, GAME.state.safetyIndex + points);
  updateHUD();
}
