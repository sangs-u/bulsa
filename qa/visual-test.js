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
  const failed404    = [];   // 실패한 URL 목록

  const browser = await chromium.launch({ headless: false, slowMo: 40 });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page    = await context.newPage();

  // ── 이벤트 리스너 (최초부터) ────────────────────────────
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
  console.log('[1/7] 페이지 로딩...');
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 40000 });
  await page.waitForTimeout(2500);
  await ss('01_load');

  // ── 2. 이름 입력 ─────────────────────────────────────────
  console.log('[2/7] 이름 입력...');
  const nameInput = page.locator('#player-name-input');
  if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await nameInput.fill('QA봇');
    await page.locator('button.name-submit-btn').click();
    await page.waitForTimeout(1200);
  }
  await ss('02_name');

  // ── 3. "클릭하여 시작" 블로커 ────────────────────────────
  console.log('[3/7] 게임 시작 버튼...');
  const blocker = page.locator('#blocker button, #blocker .start-btn');
  if (await blocker.isVisible({ timeout: 4000 }).catch(() => false)) {
    await blocker.click();
    await page.waitForTimeout(1500);
  }

  // ── 4. 브리핑 오버레이 닫기 ──────────────────────────────
  console.log('[4/7] 브리핑 → TBM 처리...');
  const briefingBtn = page.locator('#briefing-btn, .briefing-btn');
  if (await briefingBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await briefingBtn.click();
    await page.waitForTimeout(1200);
    console.log('  ✓ 브리핑 닫힘');
  }

  // TBM 패널 처리: 체크박스 전부 체크 → 작업 시작
  const tbmPanel = page.locator('#tbm-panel');
  if (await tbmPanel.isVisible({ timeout: 4000 }).catch(() => false)) {
    console.log('  ↳ TBM 패널 발견 — 체크리스트 완료 중...');
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
      // 강제 닫기 시도
      await page.evaluate(() => {
        const panel = document.getElementById('tbm-panel');
        if (panel) panel.classList.add('hidden');
        if (typeof INTERACTION !== 'undefined') INTERACTION.popupOpen = false;
      });
      console.log('  ✓ TBM 강제 닫힘');
    }
  }
  await ss('03_game_entered');

  // ── 5. WASD 이동 테스트 ───────────────────────────────────
  console.log('[5/7] WASD 이동 (8초)...');
  // 먼저 캔버스 클릭으로 포커스 확보
  await page.locator('#gameCanvas').click({ force: true }).catch(() => {});
  await page.waitForTimeout(500);

  await page.keyboard.down('w');
  await page.waitForTimeout(2500);
  await page.keyboard.up('w');
  await ss('04_move_forward');

  await page.keyboard.down('a');
  await page.waitForTimeout(1500);
  await page.keyboard.up('a');
  await page.keyboard.down('d');
  await page.waitForTimeout(1500);
  await page.keyboard.up('d');
  await ss('05_move_strafe');

  await page.keyboard.down('s');
  await page.waitForTimeout(1500);
  await page.keyboard.up('s');

  // ── 6. NPC 배회 / 미니맵 확인 ────────────────────────────
  console.log('[6/7] 10초 대기 (NPC + 미니맵 확인)...');
  await page.waitForTimeout(10000);
  await ss('06_after10s');

  // ── 7. E 상호작용 + 최종 ─────────────────────────────────
  console.log('[7/7] E키 상호작용 + 최종 캡처...');
  await page.keyboard.press('e');
  await page.waitForTimeout(800);
  await ss('07_interact_e');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  await page.waitForTimeout(5000);
  await ss('08_final');

  await browser.close();

  // ── 결과 집계 ─────────────────────────────────────────────
  const uniqErrors   = [...new Set(errors)];
  const uniqWarnings = [...new Set(warnings)];
  const uniq404      = [...new Set(failed404)];

  const report = {
    timestamp:     new Date().toISOString(),
    url:           URL,
    consoleErrors:   uniqErrors,
    consoleWarnings: uniqWarnings,
    failed404:       uniq404,
    screenshots:     fs.readdirSync(SS_DIR).filter(f => f.endsWith('.png')).sort(),
    summary: {
      errorCount:   uniqErrors.length,
      warningCount: uniqWarnings.length,
      count404:     uniq404.length,
      status:       (uniqErrors.length === 0 && uniq404.length === 0) ? 'PASS' : 'FAIL',
    },
  };

  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2), 'utf8');

  console.log('\n──────────────────────────────────────');
  console.log(`  결과: ${report.summary.status}`);
  console.log(`  콘솔 오류: ${uniqErrors.length}  경고: ${uniqWarnings.length}  404: ${uniq404.length}`);
  if (uniqErrors.length) { console.log('\n  [콘솔 오류]'); uniqErrors.forEach((e,i) => console.log(`  ${i+1}. ${e}`)); }
  if (uniq404.length)    { console.log('\n  [404 리소스]'); uniq404.forEach((u,i) => console.log(`  ${i+1}. ${u}`)); }
  if (uniqWarnings.length) { console.log('\n  [경고]'); uniqWarnings.forEach((w,i) => console.log(`  ${i+1}. ${w}`)); }
  console.log(`\n  리포트: qa/report.json | 스크린샷: ${report.screenshots.length}장`);
  console.log('──────────────────────────────────────\n');
}

runQA().catch(err => { console.error('[QA 실패]', err.message); process.exit(1); });
