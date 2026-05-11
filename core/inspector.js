// 안전관리자 적발 이벤트 — 무작위 inspector NPC 출현 → 위반 점검 → 과태료
// 룰: 시나리오별 getViolationsXxx() 결과가 있으면 fine, 없으면 무사통과.
// 정체성: BULSA 안전 시뮬 = 안전 위반 → 처벌(현행 산안법 시행령 별표 35 기준).

(function () {
  'use strict';
  if (typeof window === 'undefined') return;

  const INSPECTOR = {
    enabled: false,
    started: false,
    npc: null,                 // { group, walkTarget }
    state: 'idle',             // idle | spawning | walking | dialog | done
    nextSpawnAt: 0,
    spawnedAt: 0,
    elapsedSinceStart: 0,
    cooldownAfterFineSec: 90,
    firstSpawnDelay: [40, 80], // [min, max] sec
  };
  window.INSPECTOR = INSPECTOR;

  // ── Public: 시작 ─────────────────────────────────────────────
  function initInspector() {
    if (INSPECTOR.enabled) return;
    INSPECTOR.enabled = true;
    INSPECTOR.elapsedSinceStart = 0;
    INSPECTOR.nextSpawnAt = _rand(INSPECTOR.firstSpawnDelay[0], INSPECTOR.firstSpawnDelay[1]);
    INSPECTOR.state = 'idle';
  }

  function _rand(a, b) { return a + Math.random() * (b - a); }

  // ── Tick (engine loop 에서 호출) ─────────────────────────────
  function updateInspector(delta) {
    if (!INSPECTOR.enabled) return;
    if (!GAME.state.gameStarted || GAME.state.gameOver) return;
    if (GAME.state.liftStarted) return;     // 작업 실행 중에는 미출현
    // 다른 팝업(브리핑/TBM/대화)가 열려있으면 진행 중단
    if (typeof INTERACTION !== 'undefined' && INTERACTION.popupOpen && INSPECTOR.state !== 'dialog') return;

    INSPECTOR.elapsedSinceStart += delta;

    if (INSPECTOR.state === 'idle' && INSPECTOR.elapsedSinceStart >= INSPECTOR.nextSpawnAt) {
      _spawnInspector();
    } else if (INSPECTOR.state === 'walking') {
      _updateWalk(delta);
    }
  }

  // ── 출현: 사무실 쪽에서 워킹 입장 ────────────────────────────
  function _spawnInspector() {
    if (!GAME.scene) return;
    const group = _buildInspectorMesh();
    // 맵 외곽 (사무실 부근) 에서 출발 → 플레이어 쪽으로
    group.position.set(15, 0, 15);
    GAME.scene.add(group);
    INSPECTOR.npc = { group };
    INSPECTOR.state = 'walking';
    INSPECTOR.spawnedAt = INSPECTOR.elapsedSinceStart;

    if (typeof showActionNotif === 'function') {
      showActionNotif('🟦 안전관리자 도착 — 작업장 점검 중', 3000);
    }
    if (typeof sfx === 'function') sfx('inspector');
  }

  function _buildInspectorMesh() {
    const g = new THREE.Group();
    // 몸통 (정복 — 군청색)
    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.85, 0.32),
      new THREE.MeshStandardMaterial({ color: 0x1F3A6E, roughness: 0.6 })
    );
    torso.position.y = 1.0;
    torso.castShadow = true;
    g.add(torso);
    // 머리 + 하얀 안전모
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0xE8C5A0, roughness: 0.85 })
    );
    head.position.y = 1.62;
    head.castShadow = true;
    g.add(head);
    const helmet = new THREE.Mesh(
      new THREE.SphereGeometry(0.21, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0xF0F0F0, roughness: 0.45 })
    );
    helmet.position.y = 1.68;
    helmet.castShadow = true;
    g.add(helmet);
    // 다리
    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.7, 0.28),
      new THREE.MeshStandardMaterial({ color: 0x1A2440, roughness: 0.7 })
    );
    leg.position.y = 0.35;
    leg.castShadow = true;
    g.add(leg);
    // 클립보드 (작은 보드 모양)
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.22, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x4A2E12, roughness: 0.7 })
    );
    board.position.set(0.32, 1.0, 0.18);
    board.rotation.y = -0.3;
    g.add(board);
    return g;
  }

  function _updateWalk(delta) {
    const npc = INSPECTOR.npc;
    if (!npc || !npc.group) return;
    if (!PLAYER || !PLAYER.worldPos) return;

    const tgt = PLAYER.worldPos;
    const cur = npc.group.position;
    const dx = tgt.x - cur.x;
    const dz = tgt.z - cur.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < 2.0) {
      // 도달 — 대화 시작
      _openDialog();
      return;
    }
    // 6초 걸어도 도달 못하면 텔레포트 (플레이어가 멀리 도망간 경우)
    if (INSPECTOR.elapsedSinceStart - INSPECTOR.spawnedAt > 20) {
      cur.set(tgt.x + 2, 0, tgt.z + 2);
      _openDialog();
      return;
    }
    const v = 1.6 * delta;       // 1.6 m/s
    cur.x += (dx / dist) * v;
    cur.z += (dz / dist) * v;
    npc.group.rotation.y = Math.atan2(dx, dz);
  }

  // ── 점검 결과 다이얼로그 ─────────────────────────────────────
  function _openDialog() {
    INSPECTOR.state = 'dialog';
    const sid = GAME.scenarioId;
    const fnName = `getViolations_${sid}`;
    const fn = window[fnName];
    const violations = (typeof fn === 'function') ? (fn() || []) : [];

    const lang = (typeof getLang === 'function') ? getLang() : 'ko';
    if (violations.length === 0) {
      _showPanel({
        title: lang === 'ko' ? '✅ 점검 통과 — 위반사항 없음' : '✅ Inspection passed — no violations',
        lines: [
          lang === 'ko' ? '안전관리자가 만족하고 떠납니다.' : 'The inspector is satisfied and leaves.',
        ],
        totalKrw: 0,
      });
      return;
    }

    const mult = GAME.state.fineMultiplier || 1.0;
    const total = Math.round(violations.reduce((s, v) => s + (v.krw || 0), 0) * mult);
    GAME.state.finesKrw  = (GAME.state.finesKrw || 0) + total;
    GAME.state.fineHistory.push({ scenarioId: sid, at: Date.now(), items: violations, totalKrw: total });
    if (typeof persistFines === 'function') persistFines();
    if (typeof sfx === 'function') sfx('ticket');

    _showPanel({
      title: lang === 'ko' ? '⚠ 안전관리자 적발' : '⚠ Inspector Findings',
      lines: violations.map(v => `• ${v.label || v.id} — ₩${_fmt(v.krw)} ${v.law ? `(${v.law})` : ''}`),
      totalKrw: total,
    });
  }

  function _fmt(n) {
    return (n || 0).toLocaleString('ko-KR');
  }

  function _showPanel({ title, lines, totalKrw }) {
    let p = document.getElementById('inspector-panel');
    if (!p) {
      p = document.createElement('div');
      p.id = 'inspector-panel';
      p.style.cssText = `
        position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
        background:rgba(20,22,30,0.96); color:#F0F0F0;
        border:2px solid #2B6CB0; border-radius:8px;
        padding:22px 28px; min-width:380px; max-width:560px;
        font-family:'Noto Sans KR', sans-serif; z-index:9000;
        box-shadow:0 12px 40px rgba(0,0,0,0.5);
      `;
      document.body.appendChild(p);
    }
    const total = totalKrw || 0;
    p.innerHTML = `
      <div style="font-size:18px;font-weight:bold;margin-bottom:12px;color:${total > 0 ? '#F56565' : '#48BB78'}">
        ${title}
      </div>
      <div style="font-size:14px;line-height:1.75;margin-bottom:14px;white-space:pre-line">
        ${lines.join('\n')}
      </div>
      ${total > 0 ? `
        <div style="font-size:15px;border-top:1px solid #4A5568;padding-top:10px;margin-bottom:14px">
          누적 과태료: <b style="color:#F56565">₩${_fmt(GAME.state.finesKrw)}</b>
        </div>` : ''}
      <button id="inspector-close-btn"
        style="background:#2B6CB0;color:#fff;border:0;padding:8px 22px;
               border-radius:4px;cursor:pointer;font-size:14px">확인</button>
    `;
    p.style.display = 'block';
    document.getElementById('inspector-close-btn').onclick = _closeDialog;
    if (typeof INTERACTION !== 'undefined') INTERACTION.popupOpen = true;
  }

  function _closeDialog() {
    const p = document.getElementById('inspector-panel');
    if (p) p.style.display = 'none';
    if (typeof INTERACTION !== 'undefined') INTERACTION.popupOpen = false;

    // NPC 퇴장 (사무실 방향으로 페이드)
    if (INSPECTOR.npc && INSPECTOR.npc.group) {
      const g = INSPECTOR.npc.group;
      const start = performance.now();
      (function fade() {
        const t = (performance.now() - start) / 1000;
        if (t > 1.5) {
          if (g.parent) g.parent.remove(g);
          return;
        }
        g.position.x += 0.04;
        g.position.z += 0.04;
        g.traverse(o => { if (o.material) { if (!o.material.transparent) { o.material.transparent = true; } o.material.opacity = Math.max(0, 1 - t / 1.5); } });
        requestAnimationFrame(fade);
      })();
      INSPECTOR.npc = null;
    }
    INSPECTOR.state = 'idle';
    INSPECTOR.elapsedSinceStart = 0;
    INSPECTOR.nextSpawnAt = INSPECTOR.cooldownAfterFineSec + _rand(0, 30);
  }

  // ── 시나리오별 위반 점검 함수 ────────────────────────────────
  // OSH 시행령 별표 35 기준 (manifest.js OSH_PENALTY_BASE 참조).
  function getViolations_lifting() {
    const v = [];
    if (typeof LIFT_STATE === 'undefined') return v;
    if (!LIFT_STATE.planWritten)     v.push({ id:'no_worksplan',   label:'작업계획서 미작성',    krw:5_000_000, law:'산안법 §38' });
    if (!LIFT_STATE.outriggerExtended) v.push({ id:'no_outrigger',  label:'아웃트리거 미설치',     krw:3_000_000, law:'산안법 §38' });
    if (!LIFT_STATE.slingInspected)  v.push({ id:'no_sling_inspect',label:'슬링 점검 미실시',     krw:2_000_000, law:'산안법 §38' });
    if (!LIFT_STATE.signalAssigned)  v.push({ id:'no_signal_person',label:'신호수 미배치',         krw:3_000_000, law:'산안법 §38 시행규칙 §40' });
    return v;
  }

  function getViolations_excavation() {
    const v = [];
    if (typeof EXCAV_STATE === 'undefined') return v;
    if (!EXCAV_STATE.planWritten)      v.push({ id:'no_worksplan',  label:'굴착 작업계획서 미작성', krw:5_000_000, law:'산안법 §38' });
    if (!EXCAV_STATE.planUnderground)  v.push({ id:'no_underground',label:'매설물 사전조사 미실시', krw:5_000_000, law:'산안법 §38' });
    if (!EXCAV_STATE.shoringInstalled && (EXCAV_STATE.planDepth || 0) >= 1.5)
      v.push({ id:'no_shoring',    label:'흙막이 가시설 미설치',    krw:5_000_000, law:'산안법 §38' });
    if (!EXCAV_STATE.railingInstalled && (EXCAV_STATE.planDepth || 0) >= 2.0)
      v.push({ id:'no_railing',    label:'굴착단부 안전난간 미설치', krw:3_000_000, law:'산안법 §38' });
    if (!EXCAV_STATE.signalAssigned)
      v.push({ id:'no_signal_person', label:'신호수 미배치',          krw:3_000_000, law:'산안법 §38 시행규칙 §40' });
    return v;
  }

  function getViolations_foundation() {
    const v = [];
    if (typeof FOUND_STATE === 'undefined') return v;
    if (!FOUND_STATE.planWritten)    v.push({ id:'no_worksplan',  label:'타설 작업계획서 미작성',  krw:5_000_000, law:'산안법 §38' });
    if (!FOUND_STATE.rebarCapsOk)    v.push({ id:'no_rebar_caps', label:'철근 보호캡 미설치',      krw:2_000_000, law:'산안법 §38' });
    if (!FOUND_STATE.formworkOk)     v.push({ id:'formwork_fail', label:'거푸집 결속선 불량',      krw:3_000_000, law:'산안법 §38' });
    if (!FOUND_STATE.pumpOk)         v.push({ id:'no_outrigger',  label:'펌프카 아웃트리거 미확장', krw:3_000_000, law:'산안법 §38' });
    return v;
  }

  function getViolations_envelope() {
    const v = [];
    if (typeof ENV_STATE === 'undefined') return v;
    if (!ENV_STATE.planWritten)        v.push({ id:'no_worksplan',  label:'외장 작업계획서 미작성', krw:5_000_000, law:'산안법 §38' });
    if (!ENV_STATE.scaffoldInspected)  v.push({ id:'no_scaffold_chk',label:'비계 조립 점검 미실시', krw:5_000_000, law:'산안법 §38' });
    if (!ENV_STATE.lifelineInstalled)  v.push({ id:'no_lifeline',   label:'안전대 부착설비 미설치', krw:3_000_000, law:'산안법 §38' });
    if (!ENV_STATE.panelSecured)       v.push({ id:'no_panel_secured',label:'외장 패널 결속 미흡',  krw:2_000_000, law:'산안법 §38' });
    return v;
  }

  function getViolations_mep_finish() {
    const v = [];
    if (typeof MEP_STATE === 'undefined') return v;
    if (!MEP_STATE.planWritten)    v.push({ id:'no_worksplan', label:'설비 작업계획서 미작성', krw:5_000_000, law:'산안법 §38' });
    if (!MEP_STATE.lotoApplied)    v.push({ id:'no_loto',      label:'LOTO 미적용 (활선)',     krw:5_000_000, law:'산안법 §38' });
    if (!MEP_STATE.gasChecked)     v.push({ id:'no_gas_check', label:'가스 누설 점검 미실시',   krw:3_000_000, law:'산안법 §38' });
    if (!MEP_STATE.ventActivated && MEP_STATE.planFinishType === 'solvent')
      v.push({ id:'no_vent',       label:'국소배기 미가동 (용제 사용)', krw:3_000_000, law:'산안법 §38' });
    return v;
  }

  // 글로벌 export
  window.initInspector   = initInspector;
  window.updateInspector = updateInspector;
  window.getViolations_lifting    = getViolations_lifting;
  window.getViolations_excavation = getViolations_excavation;
  window.getViolations_foundation = getViolations_foundation;
  window.getViolations_envelope   = getViolations_envelope;
  window.getViolations_mep_finish = getViolations_mep_finish;
})();
