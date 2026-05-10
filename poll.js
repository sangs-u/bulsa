'use strict';
const { spawn } = require('child_process');
const https = require('https');
const http  = require('http');

const API_URL = 'https://bulsa-server-production.up.railway.app';
const POLL_MS = 5000;
const REQ_TIMEOUT_MS = 12000; // 요청 타임아웃 12초
const MAX_RETRIES = 3;        // 실패 시 최대 재시도 횟수
const RETRY_DELAY_MS = 2000;  // 재시도 간격

const _running = new Set();
const fs = require('fs');

function loadProgress() {
  try { return fs.readFileSync('./PROGRESS.md', 'utf8'); } catch { return ''; }
}

// ── HTTP 요청 (타임아웃 + Connection:close) ──────────────────────
function _rawRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const url  = new URL(API_URL + path);
    const lib  = url.protocol === 'https:' ? https : http;
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: url.hostname,
      port:     url.port || (url.protocol === 'https:' ? 443 : 80),
      path:     url.pathname,
      method,
      timeout:  REQ_TIMEOUT_MS,
      headers: {
        'Content-Type': 'application/json',
        'Connection':   'close', // 유휴 연결 재사용 방지 (ECONNABORTED 예방)
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const req = lib.request(opts, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); } catch { resolve(raw); }
      });
    });
    req.on('timeout', () => {
      req.destroy(new Error('ETIMEDOUT'));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// ── 재시도 래퍼 ──────────────────────────────────────────────────
function request(method, path, body, retriesLeft = MAX_RETRIES) {
  return _rawRequest(method, path, body).catch((err) => {
    if (retriesLeft > 0) {
      return new Promise((res) => setTimeout(res, RETRY_DELAY_MS))
        .then(() => request(method, path, body, retriesLeft - 1));
    }
    throw err;
  });
}

// ── 유틸 ────────────────────────────────────────────────────────
async function postLog(message, level = 'info') {
  try {
    await request('POST', '/log', { agent: 'PM', message, level });
  } catch (e) {
    console.error('[poll] /log 전송 실패:', e.message);
  }
}

async function markDone(id) {
  try {
    await request('POST', `/commands/${id}/done`, {});
  } catch (e) {
    console.error(`[poll] /commands/${id}/done 실패:`, e.message);
  }
}

async function patchStatus(id, body) {
  try {
    await request('PATCH', `/commands/${id}/status`, body);
  } catch (e) {
    console.error(`[poll] /commands/${id}/status PATCH 실패:`, e.message);
  }
}

// ── 에이전트 자동 배정 ────────────────────────────────────────────
function assignAgent(cmd) {
  const t = cmd.toLowerCase();
  if (t.includes('test') || t.includes('qa') || t.includes('playwright')) return '🐶 강아지 QA';
  if (t.includes('디자인') || t.includes('품질') || t.includes('스크린샷')) return '🐱 고양이 AD';
  if (t.includes('콘텐츠') || t.includes('영문') || t.includes('메시지')) return '🦊 여우 기획';
  if (t.includes('분석') || t.includes('데이터') || t.includes('통계')) return '🐻 곰 분석';
  return '🐰 토끼 PD';
}

// ── 명령 실행 ─────────────────────────────────────────────────────
async function runCommand(entry) {
  const { id, cmd } = entry;
  if (_running.has(id)) return;
  _running.add(id);

  const agent = assignAgent(cmd);
  console.log(`[poll] CMD #${id} 실행: ${cmd}`);
  await patchStatus(id, { status: 'running', agent });

  const TIMEOUT_MS = 10 * 60 * 1000; // 10분
  const CWD = 'C:\\Users\\sangs\\OneDrive\\Desktop\\bulsa';

  try {
    const progress = loadProgress();
    const isCodeTask = /구현|수정|추가|삭제|fix|phase|작업|개발|만들|넣어|고쳐/i.test(cmd);
    const fullCmd = (progress && isCodeTask) ? `${progress}\n\n---\n\n${cmd}` : cmd;

    const output = await new Promise((resolve, reject) => {
      const proc = spawn(
        `claude --dangerously-skip-permissions -p ${JSON.stringify(fullCmd)}`,
        [], { cwd: CWD, shell: true, windowsHide: true }
      );
      let out = '';
      const start = Date.now();

      proc.stdout.on('data', d => { out += d.toString(); });
      proc.stderr.on('data', d => { out += d.toString(); });

      // 60초마다 진행상황 중간 보고
      const hb = setInterval(async () => {
        const sec = Math.round((Date.now() - start) / 1000);
        const preview = out.slice(-300).trim();
        await patchStatus(id, { status: 'running', result: `⏳ 작업 중... (${sec}초 경과)${preview ? '\n\n' + preview : ''}` });
      }, 60000);

      const tm = setTimeout(() => {
        clearInterval(hb);
        proc.kill();
        reject(new Error('TIMEOUT: 10분 초과'));
      }, TIMEOUT_MS);

      proc.on('close', () => { clearTimeout(tm); clearInterval(hb); resolve(out); });
      proc.on('error', err => { clearTimeout(tm); clearInterval(hb); reject(err); });
    });

    console.log(`[poll] CMD #${id} 완료`);
    await patchStatus(id, { status: 'done', result: output.slice(0, 4000) });
  } catch (e) {
    console.error(`[poll] CMD #${id} 오류:`, e.message.slice(0, 300));
    await patchStatus(id, { status: 'failed', result: e.message.slice(0, 2000) });
  } finally {
    await markDone(id);
    _running.delete(id);
  }
}

// ── 폴링 ──────────────────────────────────────────────────────────
async function poll() {
  let pending;
  try {
    pending = await request('GET', '/commands/pending');
  } catch (e) {
    console.error('[poll] /commands/pending 실패:', e.message);
    return;
  }
  if (!Array.isArray(pending) || pending.length === 0) return;
  for (const entry of pending) {
    runCommand(entry);
  }
}

// ── 서버 웜업 핑 (4분마다 — Railway 슬립 방지) ───────────────────
async function ping() {
  try {
    await _rawRequest('GET', '/health');
  } catch (_) { /* 무시 */ }
}

console.log(`[poll] 시작 — ${API_URL} 폴링 ${POLL_MS / 1000}초 간격`);
setInterval(poll, POLL_MS);
setInterval(ping, 4 * 60 * 1000); // 4분마다 핑
poll();
