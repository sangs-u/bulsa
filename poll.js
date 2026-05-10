'use strict';
const { spawn } = require('child_process');
const https = require('https');
const http  = require('http');
const fs    = require('fs');

const API_URL     = 'https://bulsa-server-production.up.railway.app';
const POLL_MS     = 5000;
const REQ_TIMEOUT = 12000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;
const TIMEOUT_MS  = 10 * 60 * 1000;
const CWD         = 'C:\\Users\\sangs\\OneDrive\\Desktop\\bulsa';

// 최소 시스템 프롬프트 (3줄)
const SYS = 'BULSA 게임 개발 프로젝트. 작업 완료 후 git add . && git commit && git push. 한국어로 짧게 답해.';

const _running = new Set();

// ── PROGRESS.md ──────────────────────────────────────────────────
function loadProgress() {
  try { return fs.readFileSync(`${CWD}\\PROGRESS.md`, 'utf8'); } catch { return ''; }
}

// ── 명령 키워드 → --add-dir 목록 ────────────────────────────────
function getAddDirs(cmd) {
  const t = cmd.toLowerCase();
  const dirs = new Set();
  if (/core|engine|player|npc|accident|hud|interaction|sound|weather|ending|postfx|building|character/.test(t))
    dirs.add(`${CWD}\\core`);
  if (/scenario|scene|hazard|lifting|data\.js/.test(t))
    dirs.add(`${CWD}\\scenarios`);
  if (/i18n|strings|번역|다국어/.test(t))
    dirs.add(`${CWD}\\i18n`);
  if (/blueprint/.test(t))
    dirs.add(`${CWD}\\blueprints`);
  if (dirs.size === 0) {
    dirs.add(`${CWD}\\core`);
    dirs.add(`${CWD}\\scenarios`);
  }
  return [...dirs];
}

// ── stream-json 파싱: type=result 마지막 줄 추출 ────────────────
function parseStreamJson(raw) {
  const lines = raw.split('\n').filter(l => l.trim().startsWith('{'));
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const obj = JSON.parse(lines[i]);
      if (obj.type === 'result' && obj.result) return String(obj.result);
    } catch {}
  }
  return raw.slice(-3000);
}

// ── HTTP 유틸 ────────────────────────────────────────────────────
function _rawRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const url  = new URL(API_URL + path);
    const lib  = url.protocol === 'https:' ? https : http;
    const data = body ? JSON.stringify(body) : null;
    const req  = lib.request({
      hostname: url.hostname,
      port:     url.port || (url.protocol === 'https:' ? 443 : 80),
      path:     url.pathname, method,
      timeout:  REQ_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'Connection':   'close',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    }, (res) => {
      let raw = '';
      res.on('data', c => (raw += c));
      res.on('end', () => { try { resolve(JSON.parse(raw)); } catch { resolve(raw); } });
    });
    req.on('timeout', () => req.destroy(new Error('ETIMEDOUT')));
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function request(method, path, body, retries = MAX_RETRIES) {
  return _rawRequest(method, path, body).catch(err => {
    if (retries > 0)
      return new Promise(r => setTimeout(r, RETRY_DELAY)).then(() => request(method, path, body, retries - 1));
    throw err;
  });
}

async function markDone(id) {
  try { await request('POST', `/commands/${id}/done`, {}); } catch {}
}
async function patchStatus(id, body) {
  try { await request('PATCH', `/commands/${id}/status`, body); } catch {}
}

// ── 에이전트 배정 ────────────────────────────────────────────────
function assignAgent(cmd) {
  const t = cmd.toLowerCase();
  if (/test|qa|playwright/.test(t))          return '🐶 강아지 QA';
  if (/디자인|품질|스크린샷/.test(t))          return '🐱 고양이 AD';
  if (/콘텐츠|영문|메시지/.test(t))           return '🦊 여우 기획';
  if (/분석|데이터|통계/.test(t))             return '🐻 곰 분석';
  return '🐰 토끼 PD';
}

// ── 명령 실행 ────────────────────────────────────────────────────
async function runCommand(entry) {
  const { id, cmd } = entry;
  if (_running.has(id)) return;
  _running.add(id);

  const agent = assignAgent(cmd);
  console.log(`[poll] CMD #${id}: ${cmd.slice(0, 80)}`);
  await patchStatus(id, { status: 'running', agent });

  try {
    // 코드 작업일 때만 PROGRESS.md 첨부
    const isCodeTask = /구현|수정|추가|삭제|fix|phase|작업|개발|만들|넣어|고쳐/i.test(cmd);
    const progress   = isCodeTask ? loadProgress() : '';
    const fullPrompt = progress ? `${progress}\n\n---\n\n${cmd}` : cmd;

    // --add-dir 플래그
    const addDirs  = getAddDirs(cmd).map(d => `--add-dir "${d}"`).join(' ');

    const claudeCmd = [
      'claude',
      '--dangerously-skip-permissions',
      '--no-memory',
      '--max-turns 10',
      '--output-format stream-json',
      `--system-prompt ${JSON.stringify(SYS)}`,
      addDirs,
      `-p ${JSON.stringify(fullPrompt)}`,
    ].filter(Boolean).join(' ');

    const output = await new Promise((resolve, reject) => {
      const proc = spawn(claudeCmd, [], {
        cwd: CWD, shell: true, windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let out = '';
      const start = Date.now();

      proc.stdout.on('data', d => { out += d.toString(); });
      proc.stderr.on('data', d => { out += d.toString(); });

      // 30초마다 진행 보고
      const hb = setInterval(async () => {
        const elapsed   = Math.round((Date.now() - start) / 1000);
        const remaining = Math.round((TIMEOUT_MS - (Date.now() - start)) / 1000);
        await patchStatus(id, {
          status: 'running',
          result: `⏳ ${elapsed}초 경과 / 남은 시간 ${remaining}초`,
        });
      }, 30000);

      const tm = setTimeout(() => {
        clearInterval(hb); proc.kill();
        reject(new Error('TIMEOUT: 10분 초과'));
      }, TIMEOUT_MS);

      proc.on('close', () => { clearTimeout(tm); clearInterval(hb); resolve(out); });
      proc.on('error', err => { clearTimeout(tm); clearInterval(hb); reject(err); });
    });

    const result = parseStreamJson(output);
    console.log(`[poll] CMD #${id} 완료`);
    await patchStatus(id, { status: 'done', result: result.slice(0, 4000) });
  } catch (e) {
    console.error(`[poll] CMD #${id} 오류:`, e.message.slice(0, 200));
    await patchStatus(id, { status: 'failed', result: e.message.slice(0, 2000) });
  } finally {
    await markDone(id);
    _running.delete(id);
  }
}

// ── 폴링 ────────────────────────────────────────────────────────
async function poll() {
  let pending;
  try { pending = await request('GET', '/commands/pending'); }
  catch (e) { console.error('[poll] pending 실패:', e.message); return; }
  if (!Array.isArray(pending) || pending.length === 0) return;
  for (const entry of pending) runCommand(entry);
}

async function ping() {
  try { await _rawRequest('GET', '/health'); } catch {}
}

console.log(`[poll] 시작 — ${API_URL} | ${POLL_MS / 1000}s 간격`);
setInterval(poll, POLL_MS);
setInterval(ping, 4 * 60 * 1000);
poll();
