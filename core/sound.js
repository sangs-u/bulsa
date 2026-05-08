// Procedural audio — Web Audio API, no external files

const SOUND = (() => {
  let ctx = null;
  let _craneGain = null;
  let _bgNode = null;
  let _unlocked = false;

  function _unlock() {
    if (_unlocked) return;
    _unlocked = true;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    _startBg();
    _startCraneHum();
  }

  // Pink noise for background site ambiance
  function _startBg() {
    const sr  = ctx.sampleRate;
    const buf = ctx.createBuffer(1, sr * 4, sr);
    const d   = buf.getChannelData(0);
    let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886*b0 + w*0.0555179; b1 = 0.99332*b1 + w*0.0750759;
      b2 = 0.96900*b2 + w*0.1538520; b3 = 0.86650*b3 + w*0.3104856;
      b4 = 0.55000*b4 + w*0.5329522; b5 = -0.7616 *b5 - w*0.0168980;
      d[i] = (b0+b1+b2+b3+b4+b5 + w*0.5362) * 0.07;
    }
    _bgNode = ctx.createBufferSource();
    _bgNode.buffer = buf;
    _bgNode.loop   = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 700;
    const g = ctx.createGain(); g.gain.value = 0.22;
    _bgNode.connect(lp).connect(g).connect(ctx.destination);
    _bgNode.start();
  }

  // Crane hum: sawtooth oscillators
  function _startCraneHum() {
    _craneGain = ctx.createGain();
    _craneGain.gain.value = 0;
    _craneGain.connect(ctx.destination);
    [100, 110, 220].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = [0.04, 0.03, 0.012][i];
      osc.connect(g).connect(_craneGain);
      osc.start();
    });
  }

  function _noise(duration, filterFreq, gain, ftype = 'bandpass') {
    if (!ctx) return;
    const sr  = ctx.sampleRate;
    const buf = ctx.createBuffer(1, sr * duration, sr);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = ftype; f.frequency.value = filterFreq; f.Q.value = 1.0;
    const g = ctx.createGain(); g.gain.value = gain;
    src.connect(f).connect(g).connect(ctx.destination);
    src.start();
  }

  // ── Public API ─────────────────────────────────────────────
  function footstep() {
    if (!ctx) return;
    _noise(0.065, 180 + Math.random() * 80, 0.28);
  }

  function craneFadeIn() {
    if (!_craneGain) return;
    _craneGain.gain.linearRampToValueAtTime(0.75, ctx.currentTime + 1.8);
  }

  function craneFadeOut() {
    if (!_craneGain) return;
    _craneGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2.2);
  }

  function impact() {
    if (!ctx) return;
    _noise(0.45, 90, 0.9, 'lowpass');
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.5);
    g.gain.setValueAtTime(0.55, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.connect(g).connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.6);
  }

  function siren() {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.type = 'sine'; osc.frequency.value = 700;
    g.gain.value = 0.28;
    osc.connect(g).connect(ctx.destination);
    osc.start();
    let hi = false, n = 0;
    const iv = setInterval(() => {
      osc.frequency.value = (hi = !hi) ? 920 : 700;
      if (++n > 14) { clearInterval(iv); osc.stop(); }
    }, 280);
  }

  document.addEventListener('click',      _unlock, { once: true });
  document.addEventListener('keydown',    _unlock, { once: true });
  document.addEventListener('touchstart', _unlock, { once: true });

  return { footstep, craneFadeIn, craneFadeOut, impact, siren };
})();
