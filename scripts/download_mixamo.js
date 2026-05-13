#!/usr/bin/env node
// download_mixamo.js — Mixamo 애니메이션 FBX 다운로드 → GLB 변환
// 사용: node scripts/download_mixamo.js <BEARER_TOKEN>
// 결과: assets/glb/anim_<name>.glb

const https = require('https');
const http  = require('http');
const fs    = require('fs');
const path  = require('path');
const { execSync, spawnSync } = require('child_process');
const os    = require('os');

// ── 설정 ──────────────────────────────────────────────────────
const BEARER      = process.argv[2] || process.env.MIXAMO_TOKEN;
const CHAR_ID     = '2dee24f8-3b49-48af-b735-c6377509eaac';
const FBX2GLTF    = '/tmp/fbx2gltf';
const OUT_DIR     = path.resolve(__dirname, '../assets/glb');
const TMPDIR      = os.tmpdir();

if (!BEARER) {
  console.error('Usage: node scripts/download_mixamo.js <BEARER_TOKEN>');
  process.exit(1);
}

// ── 다운로드할 애니메이션 목록 ────────────────────────────────
// query: Mixamo 검색어, file: 출력 파일명
const ANIMATIONS = [
  { name: 'idle',       query: 'Idle',                   file: 'anim_idle.glb'       },
  { name: 'walk',       query: 'Walking',                 file: 'anim_walk.glb'       },
  { name: 'run',        query: 'Running',                 file: 'anim_run.glb'        },
  { name: 'carry',      query: 'Carrying Heavy Object',   file: 'anim_carry.glb'      },
  { name: 'carry_idle', query: 'Carrying Heavy Object',   file: 'anim_carry_idle.glb', pick: 1 },
  { name: 'hammer',     query: 'Hammering',               file: 'anim_hammer.glb'     },
  { name: 'drill',      query: 'Using A Drill',           file: 'anim_drill.glb'      },
  { name: 'survey',     query: 'Looking Around',          file: 'anim_survey.glb'     },
  { name: 'place',      query: 'Picking Up Object',       file: 'anim_place.glb'      },
  { name: 'inspect',    query: 'Crouching Down',          file: 'anim_inspect.glb'    },
  { name: 'signal',     query: 'Waving Gesture',          file: 'anim_signal.glb'     },
  { name: 'fall',       query: 'Falling Down',            file: 'anim_fall.glb'       },
  { name: 'climb',      query: 'Climbing Ladder',         file: 'anim_climb.glb'      },
  { name: 'lift',       query: 'Lifting A Crate',         file: 'anim_lift.glb'       },
  { name: 'weld',       query: 'Using A Welding Torch',   file: 'anim_weld.glb'       },
  { name: 'push',       query: 'Pushing A Big Box',       file: 'anim_push.glb'       },
];

// ── HTTP 헬퍼 ─────────────────────────────────────────────────
function request(url, options, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === 'https:' ? https : http;
    const req = lib.request({
      hostname: u.hostname,
      path:     u.pathname + u.search,
      method:   options.method || 'GET',
      headers:  options.headers || {},
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        resolve({ status: res.statusCode, headers: res.headers, body: buf });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function commonHeaders() {
  return {
    'Authorization': `Bearer ${BEARER}`,
    'X-Api-Key':     'mixamo2',
    'Origin':        'https://www.mixamo.com',
    'Referer':       'https://www.mixamo.com/',
    'User-Agent':    'Mozilla/5.0',
    'Accept':        'application/json',
  };
}

// ── 검색 → model-id 추출 ──────────────────────────────────────
async function searchModelId(query, pickIndex) {
  const url = `https://www.mixamo.com/api/v1/products?type=Motion&query=${encodeURIComponent(query)}&page=1&limit=8`;
  const res  = await request(url, { headers: commonHeaders() });
  if (res.status !== 200) throw new Error(`search HTTP ${res.status}`);

  const json    = JSON.parse(res.body.toString());
  const results = json.results || [];
  if (!results.length) throw new Error(`검색결과 없음: ${query}`);

  const idx  = pickIndex || 0;
  const item = results[Math.min(idx, results.length - 1)];

  // model-id: thumbnail URL 에서 추출
  // e.g. https://...thumbnails/motions/123510901/static.png
  const thumb = item.thumbnail_url || '';
  const m     = thumb.match(/motions\/(\d+)\//);
  if (!m) throw new Error(`model-id 파싱 실패: ${thumb}`);
  return m[1];
}

// ── Export 요청 → job 폴링 → FBX URL ─────────────────────────
async function exportFbx(modelId) {
  const body = JSON.stringify({
    gms_hash: [{
      'model-id': modelId,
      mirror: 'false',
      trim: '0,100',
      overdrive: '0',
      'similar-gait': '0',
      inplace: '0',
    }],
    preferences: {
      format: 'fbx7_2019',
      skin:   'false',
      fps:    '30',
      reducekf: '0',
    },
    character_id: CHAR_ID,
    product_name: 'mixamo.com',
  });

  const res = await request('https://www.mixamo.com/api/v1/animations/export', {
    method: 'POST',
    headers: {
      ...commonHeaders(),
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    },
  }, body);

  const json = JSON.parse(res.body.toString());
  if (res.status !== 200 && res.status !== 202) throw new Error(`export HTTP ${res.status}: ${res.body}`);

  // job_id 로 폴링
  const jobId = json.job_uuid || json.uuid || json.id;
  if (!jobId) {
    // 즉시 URL 반환하는 경우
    if (json.character && json.character.export_url) return json.character.export_url;
    throw new Error(`job_id 없음: ${JSON.stringify(json).slice(0, 200)}`);
  }

  return await pollJob(jobId);
}

async function pollJob(jobId) {
  const url = `https://www.mixamo.com/api/v1/animations/export?job_uuid=${jobId}`;
  for (let i = 0; i < 30; i++) {
    await sleep(2000);
    const res = await request(url, { headers: commonHeaders() });
    const json = JSON.parse(res.body.toString());
    const status = json.status || json.job_status;
    if (status === 'completed' || status === 'succeeded') {
      const dl = json.character?.export_url || json.download_url || json.url;
      if (dl) return dl;
    }
    if (status === 'failed') throw new Error(`export 실패: ${JSON.stringify(json)}`);
    process.stdout.write('.');
  }
  throw new Error('export 타임아웃 (60초)');
}

// ── FBX 다운로드 ──────────────────────────────────────────────
async function downloadFbx(url, destPath) {
  // 리디렉션 따라가기
  let finalUrl = url;
  for (let i = 0; i < 5; i++) {
    const u   = new URL(finalUrl);
    const lib = u.protocol === 'https:' ? https : http;
    const loc = await new Promise((resolve, reject) => {
      lib.get(finalUrl, res => {
        if (res.statusCode >= 300 && res.statusCode < 400) {
          resolve({ redirect: res.headers.location });
        } else {
          resolve({ stream: res, status: res.statusCode });
        }
      }).on('error', reject);
    });
    if (loc.redirect) { finalUrl = loc.redirect; continue; }
    if (loc.status !== 200) throw new Error(`다운로드 HTTP ${loc.status}`);
    await new Promise((resolve, reject) => {
      const out = fs.createWriteStream(destPath);
      loc.stream.pipe(out);
      out.on('finish', resolve);
      out.on('error', reject);
    });
    return;
  }
  throw new Error('리디렉션 한도 초과');
}

// ── FBX → GLB 변환 ───────────────────────────────────────────
function convertToGlb(fbxPath, glbPath) {
  const res = spawnSync(FBX2GLTF, ['-i', fbxPath, '-o', glbPath, '--no-draco'], {
    timeout: 60000,
    stdio:   'pipe',
  });
  if (res.status !== 0) {
    const err = res.stderr ? res.stderr.toString() : '';
    throw new Error(`FBX2glTF 실패 (${res.status}): ${err.slice(0, 200)}`);
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── 메인 ──────────────────────────────────────────────────────
(async () => {
  if (!fs.existsSync(FBX2GLTF)) {
    console.error(`fbx2gltf 없음: ${FBX2GLTF}`);
    process.exit(1);
  }
  fs.chmodSync(FBX2GLTF, 0o755);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const results = { ok: [], skip: [], fail: [] };

  for (const anim of ANIMATIONS) {
    const outPath = path.join(OUT_DIR, anim.file);
    if (fs.existsSync(outPath)) {
      console.log(`[skip] ${anim.file} 이미 존재`);
      results.skip.push(anim.name);
      continue;
    }

    process.stdout.write(`[${anim.name}] 검색 중...`);
    try {
      const modelId = await searchModelId(anim.query, anim.pick);
      process.stdout.write(` model=${modelId} export...`);

      const fbxUrl  = await exportFbx(modelId);
      process.stdout.write(` 다운로드...`);

      const tmpFbx  = path.join(TMPDIR, `mixamo_${anim.name}.fbx`);
      await downloadFbx(fbxUrl, tmpFbx);
      process.stdout.write(` 변환...`);

      convertToGlb(tmpFbx, outPath);
      fs.unlinkSync(tmpFbx);
      console.log(` 완료 → ${anim.file}`);
      results.ok.push(anim.name);
    } catch (e) {
      console.log(` 실패: ${e.message}`);
      results.fail.push(`${anim.name}: ${e.message}`);
    }

    await sleep(800); // rate limit 회피
  }

  console.log('\n── 결과 ──────────────────────────────');
  console.log(`✅ 성공: ${results.ok.join(', ') || '없음'}`);
  console.log(`⏭  건너뜀: ${results.skip.join(', ') || '없음'}`);
  if (results.fail.length) {
    console.log(`❌ 실패:\n  ${results.fail.join('\n  ')}`);
  }
})();
