// SFX 확장 — 추가 작업 효과음 (드릴/해머/용접/공구낙하/돈/티킷/장비 가동).
// Web Audio 합성, 외부 파일 의존 없음.

(function () {
  'use strict';
  if (typeof window === 'undefined') return;

  const SFX = {
    enabled: true,
    ctx: null,
    master: null,
  };

  function _ctx() {
    if (SFX.ctx) return SFX.ctx;
    try {
      SFX.ctx = new (window.AudioContext || window.webkitAudioContext)();
      SFX.master = SFX.ctx.createGain();
      SFX.master.gain.value = 0.5;
      SFX.master.connect(SFX.ctx.destination);
    } catch (e) { SFX.ctx = null; }
    return SFX.ctx;
  }

  function _beep(freq, dur, type = 'sine', vol = 0.3) {
    const ctx = _ctx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const osc = ctx.createOscillator();
    osc.type = type; osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(g); g.connect(SFX.master);
    osc.start();
    osc.stop(ctx.currentTime + dur + 0.05);
  }

  function _noise(dur, vol = 0.2, lpf = 800) {
    const ctx = _ctx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lpf;
    const g = ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(SFX.master);
    src.start();
  }

  // ── 효과음 모음 ──────────────────────────────────────────────
  const SFX_LIB = {
    drill:        () => { for (let i = 0; i < 6; i++) setTimeout(() => _beep(220 + i * 40, 0.06, 'square', 0.18), i * 60); },
    hammer:       () => { _noise(0.05, 0.4, 2500); setTimeout(() => _beep(110, 0.04, 'square', 0.25), 12); },
    weld:         () => { _noise(0.6, 0.18, 4000); },
    drop:         () => { _beep(80, 0.14, 'triangle', 0.35); _noise(0.18, 0.3, 600); },
    coin:         () => { _beep(880, 0.06, 'square', 0.2); setTimeout(() => _beep(1320, 0.1, 'square', 0.2), 60); },
    ticket:       () => { _beep(440, 0.08, 'sawtooth', 0.18); setTimeout(() => _beep(330, 0.12, 'sawtooth', 0.16), 80); },
    achievement:  () => { _beep(523.25, 0.08, 'sine', 0.3); setTimeout(() => _beep(659.25, 0.1, 'sine', 0.3), 80); setTimeout(() => _beep(783.99, 0.16, 'sine', 0.32), 180); },
    inspector:    () => { _beep(660, 0.1, 'square', 0.18); setTimeout(() => _beep(440, 0.16, 'square', 0.16), 110); },
    nearMiss:     () => { _beep(220, 0.05, 'sawtooth', 0.3); setTimeout(() => _beep(180, 0.08, 'sawtooth', 0.25), 50); },
    pickup:       () => { _beep(550, 0.04, 'square', 0.18); setTimeout(() => _beep(880, 0.08, 'square', 0.18), 30); },
    drop_item:    () => { _beep(440, 0.06, 'triangle', 0.18); setTimeout(() => _beep(220, 0.1, 'triangle', 0.2), 50); },
  };

  function play(name) {
    const fn = SFX_LIB[name];
    if (fn) try { fn(); } catch (e) {}
  }

  function setVolume(v) {
    if (!SFX.master) return;
    SFX.master.gain.value = Math.max(0, Math.min(1, v));
  }

  window.SFX_EXT = { play, setVolume };
  window.sfx = play;   // 짧은 alias
})();
