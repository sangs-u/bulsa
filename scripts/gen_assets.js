#!/usr/bin/env node
// scripts/gen_assets.js — Meshy.ai API 배치 생성 스크립트
// 사용: MESHY_API_KEY=your_key node scripts/gen_assets.js
// 또는:  node scripts/gen_assets.js --key your_key [--id excavator]

const https  = require('https');
const fs     = require('fs');
const path   = require('path');

// ── 설정 ──────────────────────────────────────────────────────
const API_KEY    = process.env.MESHY_API_KEY || _argVal('--key');
const TARGET_ID  = _argVal('--id');   // 특정 모델만 생성 (없으면 전체)
const CATALOG    = JSON.parse(fs.readFileSync(path.join(__dirname, '../assets/equipment_catalog.json'), 'utf8'));
const GLB_DIR    = path.join(__dirname, '../assets/glb');
const POLL_MS    = 5000;  // 5초 간격 폴링

if (!API_KEY) {
  console.error('[gen_assets] API 키가 없습니다. MESHY_API_KEY 환경변수를 설정하세요.');
  console.error('  사용법: MESHY_API_KEY=your_key node scripts/gen_assets.js');
  process.exit(1);
}

// ── 메인 ──────────────────────────────────────────────────────
(async () => {
  const models = TARGET_ID
    ? CATALOG.models.filter(m => m.id === TARGET_ID)
    : CATALOG.models.filter(m => m.status !== 'done');

  if (!models.length) {
    console.log('[gen_assets] 생성할 모델 없음 (전부 done 상태)');
    return;
  }

  console.log(`[gen_assets] 생성 대상: ${models.length}개`);
  console.log(`  예상 크레딧: ${models.length * 30} 크레딧\n`);

  for (const model of models) {
    const outPath = path.join(__dirname, '..', model.glb);
    if (fs.existsSync(outPath) && !TARGET_ID) {
      console.log(`[skip] ${model.id} — 파일 이미 존재 (${model.glb})`);
      _updateCatalogStatus(model.id, 'done');
      continue;
    }

    console.log(`\n[▶] ${model.id} (${model.name}) 생성 시작...`);

    try {
      // 1단계: Preview 생성
      const creditInfo = model.preview_only ? '20 크레딧' : '20 크레딧';
      console.log(`  [1/${model.preview_only ? 2 : 3}] Preview 생성 중... (${creditInfo})`);
      const previewId = await _createPreview(model);
      console.log(`  Preview ID: ${previewId}`);

      // 2단계: Preview 완료 대기
      const previewResult = await _pollUntilDone(previewId, 'preview');
      console.log(`  [2/${model.preview_only ? 2 : 3}] Preview 완료!`);

      let finalResult;
      if (model.preview_only) {
        finalResult = previewResult;
      } else {
        // 3단계: Refine (텍스처 생성)
        console.log(`  [3/3] Refine 중... (10 크레딧)`);
        const refineId = await _createRefine(previewId);
        finalResult = await _pollUntilDone(refineId, 'refine');
      }

      // GLB 다운로드
      const glbUrl = finalResult.model_urls && (finalResult.model_urls.glb || finalResult.model_urls.fbx);
      if (!glbUrl) {
        console.error(`  [!] GLB URL 없음:`, JSON.stringify(finalResult.model_urls));
        _updateCatalogStatus(model.id, 'error');
        continue;
      }

      console.log(`  GLB 다운로드: ${glbUrl}`);
      await _downloadFile(glbUrl, outPath);
      console.log(`  [✓] 저장 완료: ${model.glb}`);
      _updateCatalogStatus(model.id, 'done');
      await _gitPush(model.id, model.glb);

    } catch (e) {
      console.error(`  [!] 오류: ${e.message}`);
      _updateCatalogStatus(model.id, 'error');
    }

    // API 레이트리밋 방지 — 모델 사이 2초 대기
    if (models.indexOf(model) < models.length - 1) {
      await _sleep(2000);
    }
  }

  console.log('\n[gen_assets] 완료!');
  _printSummary();
})();

// ── Meshy API 호출 ────────────────────────────────────────────
function _createPreview(model) {
  const body = JSON.stringify({
    mode:             'preview',
    prompt:           model.prompt,
    negative_prompt:  model.negative_prompt || '',
    ai_model:         'meshy-6',
    topology:         'quad',
    target_polycount: 8000,
  });
  return _meshyPost('/v2/text-to-3d', body).then(r => r.result);
}

function _createRefine(previewTaskId) {
  const body = JSON.stringify({
    mode:        'refine',
    preview_task_id: previewTaskId,
    texture_richness: 'medium',
  });
  return _meshyPost('/v2/text-to-3d', body).then(r => r.result);
}

async function _pollUntilDone(taskId, label) {
  const maxWait = 10 * 60 * 1000;  // 최대 10분
  const start   = Date.now();

  while (Date.now() - start < maxWait) {
    const data = await _meshyGet(`/v2/text-to-3d/${taskId}`);

    if (data.status === 'SUCCEEDED') return data;
    if (data.status === 'FAILED') throw new Error(`Task failed: ${data.task_error?.message || 'unknown'}`);

    const pct = data.progress || 0;
    process.stdout.write(`\r    ${label} 진행 중: ${pct}%   `);
    await _sleep(POLL_MS);
  }
  throw new Error(`Timeout: ${taskId}`);
}

// ── HTTP 헬퍼 ─────────────────────────────────────────────────
function _meshyPost(endpoint, body) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.meshy.ai',
      path:     endpoint,
      method:   'POST',
      headers:  {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type':  'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, res => {
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => {
        try {
          const json = JSON.parse(raw);
          if (res.statusCode >= 400) reject(new Error(`HTTP ${res.statusCode}: ${raw}`));
          else resolve(json);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function _meshyGet(endpoint) {
  return new Promise((resolve, reject) => {
    https.get({
      hostname: 'api.meshy.ai',
      path:     endpoint,
      headers:  { 'Authorization': `Bearer ${API_KEY}` },
    }, res => {
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function _downloadFile(url, destPath) {
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const dl   = (u) => {
      const mod = u.startsWith('https') ? https : require('http');
      mod.get(u, res => {
        if (res.statusCode === 301 || res.statusCode === 302) { dl(res.headers.location); return; }
        res.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
      }).on('error', e => { fs.unlink(destPath, ()=>{}); reject(e); });
    };
    dl(url);
  });
}

// ── 카탈로그 업데이트 ─────────────────────────────────────────
function _updateCatalogStatus(id, status) {
  const catalogPath = path.join(__dirname, '../assets/equipment_catalog.json');
  const catalog     = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const model       = catalog.models.find(m => m.id === id);
  if (model) model.status = status;
  fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2));
}

function _printSummary() {
  const catalogPath = path.join(__dirname, '../assets/equipment_catalog.json');
  const catalog     = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const done        = catalog.models.filter(m => m.status === 'done').length;
  const err         = catalog.models.filter(m => m.status === 'error').length;
  const pending     = catalog.models.filter(m => m.status === 'pending').length;
  console.log(`\n요약: ✓${done}개 완료 | ✗${err}개 실패 | ⏳${pending}개 대기`);
  if (err > 0) console.log('  실패 모델은 --id <id> 로 재시도 가능');
}

// ── Git 자동 푸시 ─────────────────────────────────────────────
function _gitPush(id, glbPath) {
  const { execSync } = require('child_process');
  return new Promise(resolve => {
    try {
      execSync(`git add "${glbPath}" assets/equipment_catalog.json`, { cwd: path.join(__dirname, '..') });
      execSync(`git commit -m "feat(assets): ${id}.glb 생성 완료"`, { cwd: path.join(__dirname, '..') });
      execSync('git push', { cwd: path.join(__dirname, '..') });
      console.log(`  [git] push 완료`);
    } catch (e) {
      console.log(`  [git] push 실패 (무시): ${e.message.split('\n')[0]}`);
    }
    resolve();
  });
}

// ── 유틸 ──────────────────────────────────────────────────────
function _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function _argVal(flag) {
  const idx = process.argv.indexOf(flag);
  return idx >= 0 ? process.argv[idx + 1] : null;
}
