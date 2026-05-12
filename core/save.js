// core/save.js — 저장 시스템 v1 (localStorage 통합 + 프로필 + 플레이타임)
// 모든 bulsa_* 키를 단일 export/import 가능한 JSON 블롭으로 통합.
// 2단계 (Supabase 동기화) 추가 시 saveExportJSON / saveImportJSON 만 그대로 재사용.

const SAVE = {
  VERSION: 1,
  // 통합 저장 대상 — 게임 진행 데이터 + 설정 + 프로필
  KEYS: [
    // 진행
    'bulsa_achievements',
    'bulsa_completed_scenarios',
    'bulsa_stats',
    'bulsa_history',
    'bulsa_finesKrw',
    'bulsa_fineHistory',
    // 진입 플래그
    'bulsa_intro_seen',
    'bulsa_tutorial_seen',
    // 설정
    'bulsa_bgm',
    'bulsa_vol',
    'bulsa_lang',
    'bulsa_sens',
    'bulsa_difficulty',
    // 프로필 (이 파일이 관리)
    'bulsa_profile',
    'bulsa_save_version',
  ],
  _sessionStart: Date.now(),
};
if (typeof window !== 'undefined') window.SAVE = SAVE;

const _SAVE_LABELS = {
  exported:        { ko: '💾 저장 파일 내보냄',           en: '💾 Save file exported',         vi: '💾 Đã xuất tệp lưu',          ar: '💾 تم تصدير الحفظ' },
  imported:        { ko: '✅ 불러오기 완료 · 새로고침합니다', en: '✅ Imported · reloading',    vi: '✅ Đã nhập · tải lại',         ar: '✅ تم الاستيراد · إعادة تحميل' },
  import_fail:     { ko: '⚠ 불러오기 실패 — 파일 손상',     en: '⚠ Import failed — bad file',  vi: '⚠ Lỗi nhập — tệp hỏng',       ar: '⚠ فشل الاستيراد — تالف' },
  reset_done:      { ko: '🗑 모든 저장 데이터 삭제됨',       en: '🗑 All save data cleared',     vi: '🗑 Đã xóa toàn bộ',           ar: '🗑 تم مسح كل البيانات' },
  reset_confirm:   { ko: '저장된 모든 데이터를 삭제할까요? 되돌릴 수 없습니다.', en: 'Delete ALL saved data? Cannot undo.', vi: 'Xóa TẤT CẢ dữ liệu? Không thể hoàn tác.', ar: 'حذف كل البيانات؟ لا يمكن التراجع.' },
};
function _saveL(k) {
  const e = _SAVE_LABELS[k];
  if (!e) return k;
  const L = (typeof currentLang !== 'undefined' && currentLang) || 'ko';
  return e[L] || e.ko;
}

// ── 프로필 ─────────────────────────────────────────────────
function _readProfile() {
  try {
    const raw = localStorage.getItem('bulsa_profile');
    if (raw) {
      const p = JSON.parse(raw);
      if (p && typeof p === 'object') return p;
    }
  } catch (e) {}
  const fresh = { name: '', firstPlay: Date.now(), totalPlaySec: 0, lastPlay: Date.now() };
  try { localStorage.setItem('bulsa_profile', JSON.stringify(fresh)); } catch (e) {}
  return fresh;
}
function _writeProfile(p) {
  try { localStorage.setItem('bulsa_profile', JSON.stringify(p)); } catch (e) {}
}
function saveGetProfile() { return _readProfile(); }
function saveSetProfileName(name) {
  const p = _readProfile();
  p.name = (name || '').toString().slice(0, 40);
  _writeProfile(p);
}

// ── 플레이타임 누적 (세션 30초마다 + visibility/unload flush) ──
function _commitSessionPlayTime() {
  const p = _readProfile();
  const dt = Math.floor((Date.now() - SAVE._sessionStart) / 1000);
  // 비정상 큰 값 (절전/탭 백그라운드) 컷오프
  if (dt > 0 && dt < 86400) {
    p.totalPlaySec = (p.totalPlaySec || 0) + dt;
    p.lastPlay = Date.now();
    _writeProfile(p);
  }
  SAVE._sessionStart = Date.now();
}
function saveFormatPlayTime(sec) {
  sec = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}시간 ${m}분`;
  if (m > 0) return `${m}분 ${s}초`;
  return `${s}초`;
}

// ── Export / Import / Reset ──────────────────────────────────
function saveExportJSON() {
  _commitSessionPlayTime();
  const blob = { version: SAVE.VERSION, exportedAt: Date.now(), keys: {} };
  for (const k of SAVE.KEYS) {
    try {
      const v = localStorage.getItem(k);
      if (v !== null) blob.keys[k] = v;
    } catch (e) {}
  }
  try { localStorage.setItem('bulsa_save_version', String(SAVE.VERSION)); } catch (e) {}
  return JSON.stringify(blob, null, 2);
}

function saveDownload() {
  const json = saveExportJSON();
  const profile = _readProfile();
  const baseName = (profile.name || 'bulsa').replace(/[^\w가-힣\-]/g, '_') || 'bulsa';
  const stamp = new Date().toISOString().slice(0, 10);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${baseName}_${stamp}.bulsa.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  if (typeof showActionNotif === 'function') showActionNotif(_saveL('exported'), 1800);
}

function saveImportJSON(jsonStr) {
  let blob;
  try { blob = JSON.parse(jsonStr); }
  catch (e) { return { ok: false, error: 'parse' }; }
  if (!blob || !blob.keys || typeof blob.keys !== 'object') {
    return { ok: false, error: 'shape' };
  }
  if (blob.version && blob.version > SAVE.VERSION) {
    return { ok: false, error: 'version_too_new' };
  }
  let count = 0;
  for (const k of SAVE.KEYS) {
    if (Object.prototype.hasOwnProperty.call(blob.keys, k)) {
      try { localStorage.setItem(k, blob.keys[k]); count++; } catch (e) {}
    }
  }
  return { ok: true, count };
}

function saveImportFile(file, cb) {
  const r = new FileReader();
  r.onload  = () => cb(saveImportJSON(r.result));
  r.onerror = () => cb({ ok: false, error: 'read' });
  r.readAsText(file);
}

function saveResetAll() {
  for (const k of SAVE.KEYS) {
    try { localStorage.removeItem(k); } catch (e) {}
  }
  if (typeof showActionNotif === 'function') showActionNotif(_saveL('reset_done'), 2000);
}

function saveStorageStats() {
  let bytes = 0;
  let keys  = 0;
  for (const k of SAVE.KEYS) {
    try {
      const v = localStorage.getItem(k);
      if (v !== null) { keys++; bytes += k.length + v.length; }
    } catch (e) {}
  }
  return { keys, bytes };
}

// ── 자동 플레이타임 (페이지 닫힘·탭 숨김·30초 주기) ──
setInterval(_commitSessionPlayTime, 30000);
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', _commitSessionPlayTime);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) _commitSessionPlayTime();
  });
}

// 첫 로드 시 프로필 보장
_readProfile();

// 디버그 콘솔 노출
if (typeof window !== 'undefined') {
  window.__bulsa = window.__bulsa || {};
  window.__bulsa.save = {
    export:   saveExportJSON,
    download: saveDownload,
    import:   saveImportJSON,
    reset:    saveResetAll,
    stats:    saveStorageStats,
    profile:  saveGetProfile,
  };
}
