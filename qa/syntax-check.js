#!/usr/bin/env node
// 모든 .js 파일 구문 검사 — 브라우저 의존성 없이 Function() 으로 파싱만
// 사용: node qa/syntax-check.js  또는  npm run check

const fs = require('fs');
const path = require('path');

const ROOTS = ['core', 'scenarios', 'i18n', 'qa'];
const SKIP_DIRS = new Set(['node_modules', '.git', 'vendor', 'assets']);

function walk(dir, out) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch (e) { return; }
  for (const ent of entries) {
    if (SKIP_DIRS.has(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (ent.isFile() && ent.name.endsWith('.js')) out.push(p);
  }
}

const files = [];
for (const r of ROOTS) walk(path.resolve(__dirname, '..', r), files);

const selfPath = __filename;
const visualTest = path.resolve(__dirname, 'visual-test.js'); // 외부 의존성 있는 Node 스크립트도 제외

let ok = 0, fail = 0;
const failures = [];
for (const f of files) {
  if (f === selfPath || f === visualTest) continue;
  try {
    const src = fs.readFileSync(f, 'utf8').replace(/^#!.*\n/, ''); // shebang 제거
    new Function(src);
    ok += 1;
  } catch (e) {
    fail += 1;
    failures.push({ file: path.relative(process.cwd(), f), msg: (e && e.message) || String(e) });
  }
}

if (failures.length) {
  console.error('FAIL ' + fail + '/' + (ok + fail));
  for (const f of failures) console.error('  ' + f.file + ' — ' + f.msg);
  process.exit(1);
} else {
  console.log('PASS ' + ok + '/' + (ok + fail) + ' files');
  process.exit(0);
}
