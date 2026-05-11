// NPC ambient chat — 작업 중 짧은 대사를 머리 위에 띄움. 분위기 + 다국어.

(function () {
  'use strict';
  if (typeof window === 'undefined') return;

  const CHAT = {
    enabled: true,
    nextAt: 0,
    elapsed: 0,
    bubbles: new Map(),    // npcId → { div, until }
  };
  window.NPC_CHAT = CHAT;

  // 언어별 라인 풀
  const LINES = {
    ko: [
      '오늘 좀 덥네',
      '슬링 점검 한번만 더 봐줘',
      '여기 단부 위험해',
      '신호 명확히 줘요',
      '안전대 한번 확인할게',
      '저쪽 좀 도와줄래?',
      '커피 한잔 하고 시작합시다',
      '바닥 미끄러우니 조심',
      '오늘 작업량 빠듯하네',
      '계획서대로만 가면 무사고',
    ],
    en: [
      'Hot day today',
      'Check the sling once more',
      'Edge is dangerous here',
      'Give a clear signal',
      'Let me check my harness',
      'Need a hand over there?',
      'Coffee before we start',
      'Floor is slippery',
      'Tight schedule today',
      'Follow the plan, no accidents',
    ],
    ar: [
      'الجو حار اليوم',
      'افحص الحبل مرة أخرى',
      'الحافة خطرة هنا',
      'أعطِ إشارة واضحة',
      'دعني أتحقق من الحزام',
      'هل تحتاج مساعدة؟',
      'قهوة قبل البدء',
      'الأرض زلقة، احذر',
      'جدول ضيق اليوم',
      'اتبع الخطة، بلا حوادث',
    ],
    vi: [
      'Hôm nay nóng quá',
      'Kiểm tra dây cẩu thêm lần nữa',
      'Mép này nguy hiểm',
      'Tín hiệu rõ ràng nhé',
      'Tôi kiểm tra dây an toàn',
      'Cần giúp không?',
      'Uống cà phê trước đã',
      'Sàn trơn, cẩn thận',
      'Hôm nay lịch gấp',
      'Theo kế hoạch, không tai nạn',
    ],
  };

  function _pickLine(lang) {
    const pool = LINES[lang] || LINES.ko;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function updateNpcChat(delta) {
    if (!CHAT.enabled) return;
    if (!GAME.state.gameStarted || GAME.state.gameOver) return;
    if (typeof INTERACTION !== 'undefined' && INTERACTION.popupOpen) return;
    if (!GAME.npcs || GAME.npcs.length === 0) return;

    CHAT.elapsed += delta;

    // 만료된 버블 제거
    const now = performance.now();
    for (const [id, b] of CHAT.bubbles.entries()) {
      if (now > b.until) {
        if (b.div && b.div.parentNode) b.div.parentNode.removeChild(b.div);
        CHAT.bubbles.delete(id);
      } else if (b.div) {
        // 위치 갱신
        const npc = GAME.npcs.find(n => n.id === id);
        if (npc && npc.group && GAME.camera) {
          const v = new THREE.Vector3(npc.group.position.x, npc.group.position.y + 2.1, npc.group.position.z);
          v.project(GAME.camera);
          const x = (v.x * 0.5 + 0.5) * window.innerWidth;
          const y = (-v.y * 0.5 + 0.5) * window.innerHeight;
          const visible = v.z < 1 && v.x > -1.1 && v.x < 1.1;
          b.div.style.display = visible ? 'block' : 'none';
          b.div.style.left = x + 'px';
          b.div.style.top  = y + 'px';
        }
      }
    }

    if (CHAT.elapsed < CHAT.nextAt) return;
    CHAT.nextAt = CHAT.elapsed + 8 + Math.random() * 18;

    // 무작위 NPC 1명 선택해서 한 마디
    const idx = Math.floor(Math.random() * GAME.npcs.length);
    const npc = GAME.npcs[idx];
    if (!npc || !npc.group) return;
    if (CHAT.bubbles.has(npc.id)) return;

    const lang = npc.language || 'ko';
    const line = _pickLine(lang);
    const div = document.createElement('div');
    div.className = 'npc-chat-bubble';
    div.style.cssText = `
      position:fixed; pointer-events:none; z-index:60;
      transform:translate(-50%, -100%);
      background:rgba(20,24,32,0.86); color:#F4F4F4;
      padding:5px 11px; border-radius:10px; font-size:12px;
      font-family:'Noto Sans KR', sans-serif;
      border:1px solid rgba(180,200,255,0.18);
      white-space:nowrap; max-width:240px;
    `;
    div.textContent = line;
    document.body.appendChild(div);
    CHAT.bubbles.set(npc.id, { div, until: now + 3200 });
  }

  window.updateNpcChat = updateNpcChat;
})();
