// NPC 빠른 호출 (N 키) — v2.0
// 부지가 넓은 통합 모드에서 멀리 있는 NPC 까지 걸어가지 않고 즉시 instruction popup 열기.
// 두 번 누르면 다음으로 가까운 NPC 로 사이클.

const NPC_QUICKCALL = {
  _lastCalledId: null,
};

const _NPC_QC_LABELS = {
  none:    { ko: '근처 작업자 없음',  en: 'No worker nearby', vi: 'Không có công nhân gần',  ar: 'لا يوجد عامل قريب' },
  called:  { ko: '호출',                en: 'Called',           vi: 'Đã gọi',                   ar: 'استدعاء' },
  busy:    { ko: '지금은 호출 불가',    en: 'Cannot call now',  vi: 'Không thể gọi lúc này',    ar: 'لا يمكن الاستدعاء الآن' },
};

function _qcL(k) {
  const e = _NPC_QC_LABELS[k];
  if (!e) return k;
  const L = (typeof currentLang !== 'undefined' && currentLang) || 'ko';
  return e[L] || e.ko;
}

function quickCallNearestNPC() {
  if (typeof GAME === 'undefined' || !GAME.state || !GAME.state.gameStarted || GAME.state.gameOver) return;
  if (GAME.state.craneBoarded) return;
  if (GAME.state.paused) return;
  if (typeof INTERACTION !== 'undefined' && INTERACTION.specOpen) return;

  if (!GAME.npcs || GAME.npcs.length === 0) {
    if (typeof showActionNotif === 'function') showActionNotif(_qcL('none'), 1800);
    return;
  }

  const cam = GAME.camera.position;
  const wp = new THREE.Vector3();
  const sorted = [];
  for (const n of GAME.npcs) {
    if (!n || !n.mesh || !n.mesh.position) continue;
    n.mesh.getWorldPosition(wp);
    sorted.push({ npc: n, d: cam.distanceTo(wp) });
  }
  if (sorted.length === 0) {
    if (typeof showActionNotif === 'function') showActionNotif(_qcL('none'), 1800);
    return;
  }
  sorted.sort((a, b) => a.d - b.d);

  // popup 이미 열렸으면 닫고 다음 NPC 로 사이클
  let popupWasOpen = false;
  if (typeof INTERACTION !== 'undefined' && INTERACTION.popupOpen) {
    if (typeof closeInstructionPopup === 'function') {
      closeInstructionPopup();
      popupWasOpen = true;
    } else {
      if (typeof showActionNotif === 'function') showActionNotif(_qcL('busy'), 1500);
      return;
    }
  }

  // 사이클 선택 — 직전 호출 NPC 와 같으면 다음 후보
  let pickIdx = 0;
  if ((NPC_QUICKCALL._lastCalledId === sorted[0].npc.id || popupWasOpen) && sorted.length > 1) {
    pickIdx = 1;
    // 사이클이 끝나면 다시 0 으로 (3+ NPC 인 경우)
    if (popupWasOpen) {
      const curIdx = sorted.findIndex(s => s.npc.id === NPC_QUICKCALL._lastCalledId);
      if (curIdx >= 0) pickIdx = (curIdx + 1) % sorted.length;
    }
  }
  const pick = sorted[pickIdx];
  NPC_QUICKCALL._lastCalledId = pick.npc.id;

  if (typeof openInstructionPopup !== 'function') {
    if (typeof showActionNotif === 'function') showActionNotif(_qcL('busy'), 1500);
    return;
  }

  openInstructionPopup({ type: 'npc', npcId: pick.npc.id });

  if (typeof showActionNotif === 'function') {
    const distStr = pick.d.toFixed(0) + 'm';
    const tradeName = (typeof TRADES !== 'undefined' && pick.npc.trade && TRADES[pick.npc.trade])
      ? ' · ' + (TRADES[pick.npc.trade][((typeof currentLang !== 'undefined' && currentLang) || 'ko')] || TRADES[pick.npc.trade].ko)
      : '';
    showActionNotif(`📡 ${_qcL('called')}: ${pick.npc.name}${tradeName} · ${distStr}`, 1800);
  }
}

document.addEventListener('keydown', e => {
  if (e.code !== 'KeyN') return;
  const tgt = e.target;
  if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA')) return;
  e.preventDefault();
  quickCallNearestNPC();
});

// 디버그 콘솔 helper 노출
if (typeof window !== 'undefined') {
  window.__bulsa = window.__bulsa || {};
  window.__bulsa.callNpc = quickCallNearestNPC;
}
