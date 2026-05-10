'use strict';
const { execSync } = require('child_process');
const https = require('https');
const http  = require('http');

const API_URL = 'https://bulsa-server-production.up.railway.app';
const POLL_MS = 5000;

const _running = new Set(); // 중복 실행 방지 (id별)

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const url  = new URL(API_URL + path);
    const lib  = url.protocol === 'https:' ? https : http;
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: url.hostname,
      port:     url.port || (url.protocol === 'https:' ? 443 : 80),
      path:     url.pathname,
      method,
      headers: {
        'Content-Type': 'application/json',
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
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

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

function assignAgent(cmd) {
  const t = cmd.toLowerCase();
  if (t.includes('test') || t.includes('qa') || t.includes('playwright')) return '🐶 강아지 QA';
  if (t.includes('디자인') || t.includes('품질') || t.includes('스크린샷')) return '🐱 고양이 AD';
  if (t.includes('콘텐츠') || t.includes('영문') || t.includes('메시지')) return '🦊 여우 기획';
  if (t.includes('분석') || t.includes('데이터') || t.includes('통계')) return '🐻 곰 분석';
  return '🐰 토끼 PD'; // 기본값 (코드 수정/PM 역할)
}

async function runCommand(entry) {
  const { id, cmd } = entry;
  if (_running.has(id)) return;
  _running.add(id);

  const agent = assignAgent(cmd);

  console.log(`[poll] CMD #${id} 실행: ${cmd}`);
  await postLog(`CMD #${id} 시작: ${cmd}`);

  // 실행 시작 전: status → running + agent 배정
  await patchStatus(id, { status: 'running', agent });

  let output = '';
  try {
    output = execSync(`claude -p ${JSON.stringify(cmd)} --allowedTools all`, {
      encoding: 'utf8',
      timeout:  5 * 60 * 1000, // 최대 5분
    });
    console.log(`[poll] CMD #${id} 완료`);
    const summary = output.slice(0, 2000); // 최대 2000자 로그
    await postLog(`CMD #${id} 완료:\n${summary}`);

    // 성공 시: status → done + result 저장
    await patchStatus(id, { status: 'done', result: output.slice(0, 1000) });
  } catch (e) {
    const errMsg = (e.stdout || '') + (e.stderr || '') || e.message;
    console.error(`[poll] CMD #${id} 오류:`, errMsg.slice(0, 500));
    await postLog(`CMD #${id} 오류:\n${errMsg.slice(0, 1000)}`, 'error');

    // 실패 시: status → failed + result 저장
    await patchStatus(id, { status: 'failed', result: errMsg.slice(0, 500) });
  } finally {
    await markDone(id);
    _running.delete(id);
  }
}

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
    runCommand(entry); // 각 명령을 독립적으로 실행 (await 없이)
  }
}

console.log(`[poll] 시작 — ${API_URL} 폴링 ${POLL_MS / 1000}초 간격`);
setInterval(poll, POLL_MS);
poll(); // 즉시 첫 실행
