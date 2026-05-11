'use strict';
// 5개 시나리오 스모크 — 로드/에러/404/씬빌드/페이즈 진행 확인
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BULSA_BASE || 'https://sangs-u.github.io/bulsa/game.html';
const SCENARIOS = ['excavation', 'foundation', 'lifting', 'envelope', 'mep_finish'];
const SS_DIR = path.join(__dirname, 'smoke-screenshots');
const REPORT = path.join(__dirname, 'smoke-report.json');

async function testScenario(browser, id) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const errors = [], warnings = [], failed404 = [];

  page.on('console', msg => {
    const t = msg.type(), txt = msg.text();
    if (t === 'error') errors.push(txt);
    else if (t === 'warn' || t === 'warning') warnings.push(txt);
  });
  page.on('pageerror', err => errors.push('[pageerror] ' + err.message + (err.stack ? '\n' + err.stack.split('\n').slice(0,3).join('\n') : '')));
  page.on('response', res => { if (res.status() === 404) failed404.push(res.url()); });

  const ss = async name => {
    await page.screenshot({ path: path.join(SS_DIR, `${id}_${name}.png`) });
  };

  console.log(`\n── ${id.toUpperCase()} ───────────────`);

  // 1. 로드
  try {
    await page.goto(`${BASE}?s=${id}`, { waitUntil: 'networkidle', timeout: 45000 });
  } catch (e) {
    errors.push('[load] ' + e.message);
  }
  await page.waitForTimeout(2500);
  await ss('01_load');

  // 2. 이름 입력 통과
  const nameInput = page.locator('#player-name-input');
  if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await nameInput.fill('SmokeBot').catch(() => {});
    await page.locator('button.name-submit-btn').click().catch(() => {});
    await page.waitForTimeout(800);
  }

  // 3. 블로커 통과
  const blocker = page.locator('#blocker button, #blocker .start-btn');
  if (await blocker.isVisible({ timeout: 3000 }).catch(() => false)) {
    await blocker.click({ force: true }).catch(() => {});
    await page.waitForTimeout(1200);
  }
  await ss('02_started');

  // 4. 브리핑 닫기
  const briefingBtn = page.locator('#briefing-btn, .briefing-btn');
  if (await briefingBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await briefingBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(800);
  }
  await ss('03_briefing_closed');

  // 5. 씬 / 시나리오 상태 점검
  const sceneInfo = await page.evaluate((sid) => {
    const info = { scenarioId: null, hasScene: false, npcCount: 0, hasState: false };
    try {
      info.scenarioId = (typeof GAME !== 'undefined') ? GAME.scenarioId : null;
      info.hasScene = !!(typeof GAME !== 'undefined' && GAME.scene);
      info.npcCount = (typeof GAME !== 'undefined' && GAME.npcs) ? GAME.npcs.length : 0;
      info.hasState = !!(typeof GAME !== 'undefined' && GAME.state);
      info.builders = {
        buildLiftingScene:    typeof buildLiftingScene === 'function',
        buildExcavationScene: typeof buildExcavationScene === 'function',
        buildFoundationScene: typeof buildFoundationScene === 'function',
        buildEnvelopeScene:   typeof buildEnvelopeScene === 'function',
        buildMepFinishScene:  typeof buildMepFinishScene === 'function',
      };
      const phaseFnMap = {
        excavation: 'getCurrentExcavPhase',
        foundation: 'getCurrentFoundPhase',
        lifting:    null,
        envelope:   'getCurrentEnvPhase',
        mep_finish: 'getCurrentMepPhase',
      };
      const fnName = phaseFnMap[sid];
      info.hasPhaseFn = fnName ? (typeof window[fnName] === 'function') : true;
      if (fnName && typeof window[fnName] === 'function') {
        try { info.currentPhase = window[fnName]() || null; } catch (e) { info.phaseError = e.message; }
      }
    } catch (e) { info.evalError = e.message; }
    return info;
  }, id);

  // 6. 기본 이동
  await page.locator('#gameCanvas').click({ force: true }).catch(() => {});
  await page.waitForTimeout(300);
  await page.keyboard.down('w'); await page.waitForTimeout(800); await page.keyboard.up('w');
  await ss('04_moved');

  await ctx.close();

  const uniqErrors = [...new Set(errors)];
  const uniqWarnings = [...new Set(warnings)];
  const uniq404 = [...new Set(failed404)];
  return {
    id,
    sceneInfo,
    errors: uniqErrors,
    warnings: uniqWarnings,
    failed404: uniq404,
    pass: uniqErrors.length === 0 && uniq404.length === 0,
  };
}

(async () => {
  fs.mkdirSync(SS_DIR, { recursive: true });
  console.log('══ BULSA Smoke Test ═════════════════');
  console.log('Base:', BASE);
  console.log('Scenarios:', SCENARIOS.join(', '));

  const browser = await chromium.launch({ headless: true });
  const results = [];
  for (const id of SCENARIOS) {
    const r = await testScenario(browser, id);
    results.push(r);
    console.log(`  ${r.pass ? '✓' : '✗'} ${id} — err:${r.errors.length} 404:${r.failed404.length} warn:${r.warnings.length}`);
    if (r.errors.length) r.errors.slice(0, 3).forEach((e, i) => console.log(`     [${i+1}] ${e.slice(0, 180)}`));
    if (r.failed404.length) r.failed404.slice(0, 3).forEach((u, i) => console.log(`     404[${i+1}] ${u}`));
  }
  await browser.close();

  const totals = results.reduce((a, r) => ({
    err: a.err + r.errors.length, warn: a.warn + r.warnings.length, n404: a.n404 + r.failed404.length, pass: a.pass + (r.pass ? 1 : 0)
  }), { err: 0, warn: 0, n404: 0, pass: 0 });

  const report = { timestamp: new Date().toISOString(), base: BASE, results, totals };
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2), 'utf8');

  console.log('\n══ 요약 ═══════════════════════════════');
  console.log(`  통과: ${totals.pass}/${SCENARIOS.length}  에러:${totals.err}  404:${totals.n404}  경고:${totals.warn}`);
  console.log(`  리포트: ${REPORT}`);
  process.exit(totals.err === 0 && totals.n404 === 0 ? 0 : 1);
})().catch(e => { console.error('[FATAL]', e); process.exit(2); });
