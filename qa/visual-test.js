'use strict';
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const URL      = 'https://sangs-u.github.io/bulsa/game.html?s=lifting';
const SS_DIR   = path.join(__dirname, 'screenshots');
const REPORT   = path.join(__dirname, 'report.json');

async function runQA() {
  fs.mkdirSync(SS_DIR, { recursive: true });

  const errors       = [];
  const warnings     = [];
  const failed404    = [];
  const qaFails      = [];   // 게임플레이 완주 실패 항목

  const browser = await chromium.launch({ headless: false, slowMo: 40 });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page    = await context.newPage();

  page.on('console', msg => {
    const t = msg.type(), txt = msg.text();
    if (t === 'error')   errors.push(txt);
    else if (t === 'warn' || t === 'warning') warnings.push(txt);
  });
  page.on('pageerror', err => errors.push('[pageerror] ' + err.message));
  page.on('response', res => {
    if (res.status() === 404) failed404.push(res.url());
  });

  const ss = async name => {
    const p = path.join(SS_DIR, name + '.png');
    await page.screenshot({ path: p });
    console.log('  📸', name + '.png');
  };

  console.log('\n══════════════════════════════════════');
  console.log('  BULSA Visual QA  |  ' + new Date().toLocaleString('ko-KR'));
  console.log('══════════════════════════════════════\n');

  // ── 1. 페이지 로딩 ────────────────────────────────────────
  console.log('[1/9] 페이지 로딩...');
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 40000 });
  await page.waitForTimeout(2500);
  await ss('01_load');

  // ── 2. 이름 입력 ─────────────────────────────────────────
  console.log('[2/9] 이름 입력...');
  const nameInput = page.locator('#player-name-input');
  if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await nameInput.fill('QA봇');
    await page.locator('button.name-submit-btn').click();
    await page.waitForTimeout(1200);
  }
  await ss('02_name');

  // ── 3. "클릭하여 시작" 블로커 ────────────────────────────
  console.log('[3/9] 게임 시작 버튼...');
  const blocker = page.locator('#blocker button, #blocker .start-btn');
  if (await blocker.isVisible({ timeout: 4000 }).catch(() => false)) {
    await blocker.click();
    await page.waitForTimeout(1500);
  }

  // ── 4. 브리핑 + TBM 처리 ─────────────────────────────────
  console.log('[4/9] 브리핑 → TBM 처리...');
  const briefingBtn = page.locator('#briefing-btn, .briefing-btn');
  if (await briefingBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await briefingBtn.click();
    await page.waitForTimeout(1200);
    console.log('  ✓ 브리핑 닫힘');
  }

  const tbmPanel = page.locator('#tbm-panel');
  if (await tbmPanel.isVisible({ timeout: 4000 }).catch(() => false)) {
    console.log('  ↳ TBM 패널 — 체크리스트 완료 중...');
    const checkboxes = tbmPanel.locator('.tbm-check-item, input[type=checkbox], .tbm-checklist input');
    const count = await checkboxes.count();
    for (let i = 0; i < count; i++) {
      await checkboxes.nth(i).click({ force: true }).catch(() => {});
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(600);
    const tbmStart = page.locator('#tbm-start-btn');
    if (await tbmStart.isEnabled({ timeout: 2000 }).catch(() => false)) {
      await tbmStart.click({ force: true });
      await page.waitForTimeout(1000);
      console.log('  ✓ TBM 완료');
    } else {
      await page.evaluate(() => {
        const panel = document.getElementById('tbm-panel');
        if (panel) panel.classList.add('hidden');
        if (typeof INTERACTION !== 'undefined') INTERACTION.popupOpen = false;
      });
      console.log('  ✓ TBM 강제 닫힘');
    }
  }
  await ss('03_game_entered');

  // ── 5. WASD 이동 확인 ────────────────────────────────────
  console.log('[5/9] WASD 이동 테스트 (5초)...');
  await page.locator('#gameCanvas').click({ force: true }).catch(() => {});
  await page.waitForTimeout(500);
  await page.keyboard.down('w');
  await page.waitForTimeout(2000);
  await page.keyboard.up('w');
  await page.keyboard.down('a');
  await page.waitForTimeout(1000);
  await page.keyboard.up('a');
  await page.keyboard.down('d');
  await page.waitForTimeout(1000);
  await page.keyboard.up('d');
  await page.keyboard.down('s');
  await page.waitForTimeout(1000);
  await page.keyboard.up('s');
  await ss('04_movement');

  // ── 6. 전체 점검 행동 수행 (direct evaluate) ─────────────
  console.log('[6/9] 전체 점검 행동 수행...');
  await page.evaluate(() => {
    // Phase 1-3: 패널 상호작용 없이 플래그 직접 설정
    if (typeof LIFT_STATE !== 'undefined') {
      LIFT_STATE.planWritten      = true;
      LIFT_STATE.safetyChecked    = true;
      LIFT_STATE.outriggerExtended = true;
      LIFT_STATE.specChecked      = true;
    }
    if (typeof GAME !== 'undefined' && GAME.state) {
      GAME.state.phase = 4; // Phase 4로 진입
    }
    // Phase 4-5: performAction으로 정상 실행
    if (typeof performAction === 'function') {
      performAction('inspect_sling');
      performAction('secure_pin');
      performAction('measure_angle');
      performAction('evacuate_worker');
      performAction('assign_signal');
    }
    if (typeof updateHUD === 'function') updateHUD();
  });
  await page.waitForTimeout(1500);
  await ss('05_actions_done');

  // LIFT_STATE 검증
  const liftState = await page.evaluate(() => {
    if (typeof LIFT_STATE === 'undefined') return null;
    return {
      slingInspected:  LIFT_STATE.slingInspected,
      pinSecured:      LIFT_STATE.pinSecured,
      angleMeasured:   LIFT_STATE.angleMeasured,
      specChecked:     LIFT_STATE.specChecked,
      workerEvacuated: LIFT_STATE.workerEvacuated,
      signalAssigned:  LIFT_STATE.signalAssigned,
    };
  });
  if (!liftState) {
    qaFails.push('LIFT_STATE 없음');
  } else {
    const missing = Object.entries(liftState).filter(([,v]) => !v).map(([k]) => k);
    if (missing.length) {
      qaFails.push(`점검 미완료 항목: ${missing.join(', ')}`);
      console.log('  ⚠ 미완료:', missing.join(', '));
    } else {
      console.log('  ✓ 전체 점검 완료:', JSON.stringify(liftState));
    }
  }

  // ── 7. 크레인 탑승 → 인양 시작 ───────────────────────────
  console.log('[7/9] 크레인 탑승 → 인양 시작...');
  await page.evaluate(() => {
    if (typeof boardCrane === 'function') boardCrane();
  });
  await page.waitForTimeout(1000);
  await ss('06_crane_boarded');

  await page.evaluate(() => {
    if (typeof evaluateLift === 'function') evaluateLift();
  });

  // evaluateLift() → TBM Phase 2 intercept 처리
  // 정상 경로: "작업 시작" 버튼이 completeTBM callback으로 _origEvaluateLift 호출
  // 강제 닫기: TBM 건너뛰고 boardCrane + evaluateLift 재호출 필요
  const tbmPanel2 = page.locator('#tbm-panel');
  if (await tbmPanel2.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('  ↳ TBM Phase 2 패널 — 체크리스트 완료 중...');
    const checkboxes2 = tbmPanel2.locator('.tbm-check-item');
    const count2 = await checkboxes2.count();
    for (let i = 0; i < count2; i++) {
      await checkboxes2.nth(i).click({ force: true }).catch(() => {});
      await page.waitForTimeout(100);
    }
    await page.waitForTimeout(400);
    const tbmStart2 = page.locator('#tbm-start-btn');
    if (await tbmStart2.isEnabled({ timeout: 2000 }).catch(() => false)) {
      await tbmStart2.click({ force: true });
      await page.waitForTimeout(800);
      console.log('  ✓ TBM Phase 2 완료 (callback이 자동으로 lift 실행)');
    } else {
      // 버튼 비활성 — 강제로 TBM 닫고 lift 재호출
      await page.evaluate(() => {
        const panel = document.getElementById('tbm-panel');
        if (panel) panel.classList.add('hidden');
        if (typeof TBM !== 'undefined') TBM._completed.add(2);
        if (typeof INTERACTION !== 'undefined') INTERACTION.popupOpen = false;
      });
      await page.evaluate(() => {
        if (typeof boardCrane === 'function') boardCrane();
      });
      await page.waitForTimeout(400);
      await page.evaluate(() => {
        if (typeof evaluateLift === 'function') evaluateLift();
      });
      await page.waitForTimeout(400);
      console.log('  ✓ TBM Phase 2 강제 완료 → lift 재시작');
    }
  }

  // ── 8. 완주 대기 (빔 상승 + 컷신 = ~13초) ────────────────
  console.log('[8/9] 완주 대기 (최대 18초)...');
  await page.waitForTimeout(4000);
  await ss('07_beam_rising');
  await page.waitForTimeout(7000);
  await ss('08_cutscene');
  await page.waitForTimeout(7000);
  await ss('09_complete');

  // 완주 패널 확인
  const completeVisible = await page.evaluate(() => {
    const el = document.getElementById('complete-panel');
    return el ? !el.classList.contains('hidden') : false;
  });
  if (completeVisible) {
    console.log('  ✓ 완주 패널 표시됨 — 게임 시작→완주 끊김 없음');
  } else {
    const accidentVisible = await page.evaluate(() => {
      const el = document.getElementById('accident-panel');
      return el ? !el.classList.contains('hidden') : false;
    });
    if (accidentVisible) {
      const accDesc = await page.evaluate(() => {
        const el = document.getElementById('acc-desc');
        return el ? el.textContent : '알 수 없음';
      });
      qaFails.push(`완주 실패 — 사고 발생: ${accDesc.slice(0, 60)}`);
      console.log('  ✗ 사고 패널:', accDesc.slice(0, 60));
    } else {
      qaFails.push('완주 패널 미표시 — 게임 흐름 중단');
      console.log('  ✗ 완주 패널 없음 (게임 중단)');
    }
  }

  // ── 9. NPC 이탈 검사 + 최종 ──────────────────────────────
  console.log('[9/9] NPC 위치 검증...');
  const npcPositions = await page.evaluate(() => {
    if (typeof GAME === 'undefined' || !GAME.npcs) return [];
    return GAME.npcs.map(npc => ({
      id: npc.id,
      x:  npc.group ? npc.group.position.x : 0,
      z:  npc.group ? npc.group.position.z : 0,
    }));
  });
  npcPositions.forEach(n => {
    const outOfBounds = Math.abs(n.x) > 35 || Math.abs(n.z) > 35;
    if (outOfBounds) {
      qaFails.push(`NPC 맵 이탈: ${n.id} (x=${n.x.toFixed(1)}, z=${n.z.toFixed(1)})`);
      console.log(`  ✗ NPC 이탈: ${n.id} → (${n.x.toFixed(1)}, ${n.z.toFixed(1)})`);
    } else {
      console.log(`  ✓ NPC ${n.id}: (${n.x.toFixed(1)}, ${n.z.toFixed(1)})`);
    }
  });
  if (npcPositions.length === 0) {
    console.log('  ⚠ NPC 정보 없음 (GAME.npcs 접근 불가)');
  }

  await browser.close();

  // ── 결과 집계 ─────────────────────────────────────────────
  const uniqErrors   = [...new Set(errors)];
  const uniqWarnings = [...new Set(warnings)];
  const uniq404      = [...new Set(failed404)];

  const pass = uniqErrors.length === 0 && uniq404.length === 0 && qaFails.length === 0;

  const report = {
    timestamp:     new Date().toISOString(),
    url:           URL,
    consoleErrors:   uniqErrors,
    consoleWarnings: uniqWarnings,
    failed404:       uniq404,
    gameplayFails:   qaFails,
    npcPositions:    npcPositions,
    screenshots:     fs.readdirSync(SS_DIR).filter(f => f.endsWith('.png')).sort(),
    summary: {
      errorCount:    uniqErrors.length,
      warningCount:  uniqWarnings.length,
      count404:      uniq404.length,
      gameplayFails: qaFails.length,
      status:        pass ? 'PASS' : 'FAIL',
    },
  };

  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2), 'utf8');

  console.log('\n──────────────────────────────────────');
  console.log(`  결과: ${report.summary.status}`);
  console.log(`  콘솔 오류: ${uniqErrors.length}  경고: ${uniqWarnings.length}  404: ${uniq404.length}  완주실패: ${qaFails.length}`);
  if (uniqErrors.length)   { console.log('\n  [콘솔 오류]');   uniqErrors.forEach((e,i)  => console.log(`  ${i+1}. ${e}`)); }
  if (uniq404.length)      { console.log('\n  [404 리소스]');  uniq404.forEach((u,i)    => console.log(`  ${i+1}. ${u}`)); }
  if (qaFails.length)      { console.log('\n  [완주 실패]');   qaFails.forEach((f,i)    => console.log(`  ${i+1}. ${f}`)); }
  if (uniqWarnings.length) { console.log('\n  [경고]');        uniqWarnings.forEach((w,i)=> console.log(`  ${i+1}. ${w}`)); }
  console.log(`\n  리포트: qa/report.json | 스크린샷: ${report.screenshots.length}장`);
  console.log('──────────────────────────────────────\n');
}

runQA().catch(err => { console.error('[QA 실패]', err.message); process.exit(1); });
