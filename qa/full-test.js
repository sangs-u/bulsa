'use strict';
// 5개 시나리오 풀 테스트 — 각 시나리오를 끝까지 강제 진행해서 완료/사고 패널 확인.
// 에러·404·페이지에러 0건 + 모든 시나리오 종결까지 통과해야 PASS.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BULSA_BASE || 'http://127.0.0.1:4173/game.html';
const SS_DIR = path.join(__dirname, 'full-screenshots');
const REPORT = path.join(__dirname, 'full-report.json');

// 시나리오별 강제 완료 매개변수 — 정상 완주 조건
const FORCE = {
  lifting: `
    if (typeof LIFT_STATE !== 'undefined') {
      LIFT_STATE.planWritten = true;
      LIFT_STATE.safetyChecked = true;
      LIFT_STATE.outriggerExtended = true;
      LIFT_STATE.specChecked = true;
    }
    if (typeof performAction === 'function') {
      performAction('inspect_sling');
      performAction('secure_pin');
      performAction('measure_angle');
      performAction('evacuate_worker');
      performAction('assign_signal');
    }
    // 테스트용: 5층 → 1층 1사이클로 단축
    if (typeof GAME !== 'undefined' && GAME.state) {
      GAME.state.targetFloors = 1;
    }
  `,
  excavation: `
    if (typeof EXCAV_STATE !== 'undefined') {
      EXCAV_STATE.planWritten = true;
      EXCAV_STATE.planDepth = 3;
      EXCAV_STATE.planSlope = 1;
      EXCAV_STATE.planShoring = 'h_pile';
      EXCAV_STATE.planUnderground = true;
      EXCAV_STATE.surveyDone = true;
      EXCAV_STATE.shoringInstalled = true;
      EXCAV_STATE.railingInstalled = true;
      EXCAV_STATE.signalAssigned = true;
    }
  `,
  foundation: `
    if (typeof FOUND_STATE !== 'undefined') {
      FOUND_STATE.planWritten = true;
      FOUND_STATE.planMatArea = 200;
      FOUND_STATE.planRebarSpacing = 0.2;
      FOUND_STATE.planConcreteStrength = 24;
      FOUND_STATE.planShoringSpace = 0.6;
      FOUND_STATE.rebarCapsOk = true;
      FOUND_STATE.formworkOk = true;
      FOUND_STATE.pumpOk = true;
      FOUND_STATE.pourOrderAgreed = true;
    }
  `,
  envelope: `
    if (typeof ENV_STATE !== 'undefined') {
      ENV_STATE.planWritten = true;
      ENV_STATE.planScaffoldType = 'system';
      ENV_STATE.planScaffoldHeight = 12;
      ENV_STATE.planGuardrailLevels = 2;
      ENV_STATE.planPanelType = 'metal';
      ENV_STATE.scaffoldInspected = true;
      ENV_STATE.lifelineInstalled = true;
      ENV_STATE.panelSecured = true;
      ENV_STATE.signalAssigned = true;
    }
  `,
  mep_finish: `
    if (typeof MEP_STATE !== 'undefined') {
      MEP_STATE.planWritten = true;
      MEP_STATE.planBreakerAmp = 30;
      MEP_STATE.planLotoProcedure = true;
      MEP_STATE.planFinishType = 'water';
      MEP_STATE.lotoApplied = true;
      MEP_STATE.gasChecked = true;
      MEP_STATE.ventActivated = true;
      MEP_STATE.extVerified = true;
    }
  `,
};

// 시나리오별 평가/완료 함수
const EVAL = {
  lifting:    'if (typeof boardCrane === "function") boardCrane(); if (typeof evaluateLift === "function") evaluateLift();',
  excavation: 'if (typeof evaluateExcavation === "function") evaluateExcavation();',
  foundation: 'if (typeof evaluateFoundation === "function") evaluateFoundation();',
  envelope:   'if (typeof evaluateEnvelope === "function") evaluateEnvelope();',
  mep_finish: 'if (typeof evaluateMepFinish === "function") evaluateMepFinish();',
};

async function runScenario(browser, id) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const errors = [], warnings = [], failed404 = [];
  page.on('console', m => { const t = m.type(); if (t === 'error') errors.push(m.text()); else if (t === 'warn' || t === 'warning') warnings.push(m.text()); });
  page.on('pageerror', e => errors.push('[pageerror] ' + e.message));
  page.on('response', r => { if (r.status() === 404) failed404.push(r.url()); });
  const ss = async n => { await page.screenshot({ path: path.join(SS_DIR, `${id}_${n}.png`) }); };

  console.log(`\n── ${id.toUpperCase()} ─────────────`);
  // CDN 일시 장애 대비 최대 3회 로드 재시도 + 매 시도마다 콘솔 버퍼 리셋
  let loaded = false;
  for (let attempt = 0; attempt < 3 && !loaded; attempt++) {
    errors.length = 0; warnings.length = 0; failed404.length = 0;
    try {
      await page.goto(`${BASE}?s=${id}`, { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForTimeout(2000);
      const threeOk = await page.evaluate(() => typeof THREE !== 'undefined' && !!THREE.WebGLRenderer);
      const yukaOk  = await page.evaluate(() => typeof YUKA !== 'undefined');
      if (threeOk && yukaOk) { loaded = true; break; }
      if (attempt < 2) console.log(`  ↻ 재시도 #${attempt+2} (three:${threeOk} yuka:${yukaOk})`);
    } catch (e) {
      if (attempt < 2) console.log(`  ↻ 재시도 #${attempt+2} (${e.message.slice(0,60)})`);
    }
  }
  if (!loaded) errors.push('[load] CDN/스크립트 로드 실패 — 3회 재시도 모두 실패');

  // 이름 + 블로커
  const nameInput = page.locator('#player-name-input');
  if (await nameInput.isVisible({ timeout: 1500 }).catch(() => false)) {
    await nameInput.fill('FullBot');
    await page.locator('button.name-submit-btn').click().catch(() => {});
    await page.waitForTimeout(600);
  }
  const blocker = page.locator('#blocker button, #blocker .start-btn');
  if (await blocker.isVisible({ timeout: 2500 }).catch(() => false)) {
    await blocker.click({ force: true }).catch(() => {});
    await page.waitForTimeout(900);
  }
  const briefingBtn = page.locator('#briefing-btn, .briefing-btn');
  if (await briefingBtn.isVisible({ timeout: 2500 }).catch(() => false)) {
    await briefingBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(500);
  }

  // 공통 TBM 처리 함수 — 발생할 때마다 호출
  const passTBM = async () => {
    const tbmPanel = page.locator('#tbm-panel');
    if (await tbmPanel.isVisible({ timeout: 1500 }).catch(() => false)) {
      const checkboxes = tbmPanel.locator('.tbm-check-item, input[type=checkbox]');
      const c = await checkboxes.count();
      for (let i = 0; i < c; i++) { await checkboxes.nth(i).click({ force: true }).catch(() => {}); await page.waitForTimeout(80); }
      const startBtn = page.locator('#tbm-start-btn');
      if (await startBtn.isEnabled({ timeout: 1500 }).catch(() => false)) {
        await startBtn.click({ force: true }).catch(() => {});
      } else {
        await page.evaluate(() => { const p = document.getElementById('tbm-panel'); if (p) p.classList.add('hidden'); if (typeof TBM !== 'undefined') { TBM._completed.add(1); TBM._completed.add(2); } if (typeof INTERACTION !== 'undefined') INTERACTION.popupOpen = false; });
      }
      await page.waitForTimeout(600);
      return true;
    }
    return false;
  };

  // TBM Phase 1 (브리핑 후 자동 출현)
  await passTBM();
  await ss('01_started');

  // 강제 상태 + 평가
  await page.evaluate(FORCE[id]);
  await page.waitForTimeout(400);
  await page.evaluate(EVAL[id]);
  await page.waitForTimeout(800);

  // TBM Phase 2 (lifting evaluateLift 인터셉트)
  if (await passTBM()) {
    // TBM 강제 닫힌 경우 lift 재호출 필요
    await page.evaluate(EVAL[id]);
    await page.waitForTimeout(600);
  }

  await ss('02_evaluated');

  // 완료/사고 대기 (lifting 컷씬 ~25초, 그 외 짧음)
  const maxWait = id === 'lifting' ? 30 : 15;
  let outcome = 'unknown', detail = '';
  for (let t = 0; t < maxWait; t++) {
    const status = await page.evaluate(() => {
      const c = document.getElementById('complete-panel');
      const a = document.getElementById('accident-panel');
      const cVis = c && !c.classList.contains('hidden');
      const aVis = a && !a.classList.contains('hidden');
      let desc = '';
      if (aVis) {
        const el = document.getElementById('acc-desc');
        desc = el ? el.textContent.slice(0, 140) : '';
      }
      return { cVis, aVis, desc };
    });
    if (status.cVis) { outcome = 'complete'; break; }
    if (status.aVis) { outcome = 'accident'; detail = status.desc; break; }
    await page.waitForTimeout(1000);
  }
  await ss('03_outcome');

  await ctx.close();

  const uniqErr = [...new Set(errors)], uniqWarn = [...new Set(warnings)], uniq404 = [...new Set(failed404)];
  const cleanRun = uniqErr.length === 0 && uniq404.length === 0;
  const pass = cleanRun && (outcome === 'complete' || outcome === 'accident'); // accident 도 정상 게임플로
  return { id, outcome, detail, errors: uniqErr, warnings: uniqWarn, failed404: uniq404, pass };
}

(async () => {
  fs.mkdirSync(SS_DIR, { recursive: true });
  console.log('══ BULSA Full Test ══════════════════');
  console.log('Base:', BASE);

  const browser = await chromium.launch({ headless: true });
  const ids = ['excavation', 'foundation', 'lifting', 'envelope', 'mep_finish'];
  const results = [];
  for (const id of ids) {
    const r = await runScenario(browser, id);
    results.push(r);
    console.log(`  ${r.pass ? '✓' : '✗'} ${id} — outcome:${r.outcome} err:${r.errors.length} 404:${r.failed404.length}`);
    if (r.errors.length) r.errors.slice(0, 3).forEach((e, i) => console.log(`     [${i+1}] ${e.slice(0, 180)}`));
    if (r.failed404.length) r.failed404.slice(0, 3).forEach((u, i) => console.log(`     404[${i+1}] ${u}`));
    if (r.detail) console.log(`     사고: ${r.detail.slice(0, 120)}`);
  }
  await browser.close();

  const tot = results.reduce((a, r) => ({ err: a.err + r.errors.length, n404: a.n404 + r.failed404.length, pass: a.pass + (r.pass ? 1 : 0) }), { err: 0, n404: 0, pass: 0 });
  fs.writeFileSync(REPORT, JSON.stringify({ timestamp: new Date().toISOString(), base: BASE, results, totals: tot }, null, 2));
  console.log(`\n══ ${tot.pass}/${ids.length} 통과 · 에러 ${tot.err} · 404 ${tot.n404} ══`);
  console.log(`Report: ${REPORT}`);
  process.exit(tot.err === 0 && tot.n404 === 0 && tot.pass === ids.length ? 0 : 1);
})().catch(e => { console.error('[FATAL]', e); process.exit(2); });
