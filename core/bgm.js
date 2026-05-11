// BGM — 시나리오별 배경 음악. Web Audio 합성 (외부 파일 의존 없음).
// 작업장 분위기 위주 — 낮은 드론 + 가벼운 리듬.

(function () {
  'use strict';
  if (typeof window === 'undefined') return;

  const BGM = {
    enabled: true,
    ctx: null,
    master: null,
    nodes: [],
    playing: false,
  };
  window.BGM = BGM;

  function _ctx() {
    if (BGM.ctx) return BGM.ctx;
    try {
      BGM.ctx = new (window.AudioContext || window.webkitAudioContext)();
      BGM.master = BGM.ctx.createGain();
      BGM.master.gain.value = 0.10;
      BGM.master.connect(BGM.ctx.destination);
    } catch (e) { BGM.ctx = null; }
    return BGM.ctx;
  }

  function _stopNodes() {
    BGM.nodes.forEach(n => { try { n.stop(0); } catch (e) {} });
    BGM.nodes = [];
  }

  function _drone(freq, type = 'sawtooth', detune = 0) {
    const ctx = _ctx();
    if (!ctx) return null;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 2);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 600;
    osc.connect(filter); filter.connect(gain); gain.connect(BGM.master);
    osc.start();
    BGM.nodes.push(osc);
    return osc;
  }

  function play(scenarioId) {
    if (!BGM.enabled) return;
    let stored = '1';
    try { stored = localStorage.getItem('bulsa_bgm') ?? '1'; } catch (e) {}
    if (stored === '0') return;
    if (BGM.playing) stop();
    const ctx = _ctx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    // 시나리오별 톤
    const tones = {
      excavation: [55, 73.4, 110],         // A1·D2·A2 — 흙·중장비 무거움
      foundation: [65.4, 87.3, 130.8],     // C2·F2·C3 — 철근 금속
      lifting:    [82.4, 110, 164.8],      // E2·A2·E3 — 양중 긴장
      envelope:   [98, 130.8, 196],        // G2·C3·G3 — 외장 가벼움
      mep_finish: [73.4, 110, 146.8],      // D2·A2·D3 — 마감 평온
    };
    const t = tones[scenarioId] || tones.lifting;
    _drone(t[0], 'sawtooth', -7);
    _drone(t[1], 'sine',      5);
    _drone(t[2], 'triangle',  0);
    BGM.playing = true;
  }

  function stop() {
    _stopNodes();
    BGM.playing = false;
  }

  function setVolume(v) {
    if (!BGM.master) return;
    BGM.master.gain.value = Math.max(0, Math.min(0.4, 0.10 * (v + 0.5)));
  }

  window.startBGM = play;
  window.stopBGM  = stop;
  BGM.play    = play;
  BGM.stop    = stop;
  BGM.setVolume = setVolume;
})();
