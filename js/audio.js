// 音效：全部用 Web Audio 即時合成，不需要音檔。
(function () {
  const A = { ctx: null, enabled: true, ready: false };
  CY.audio = A;
  let master, comp, noiseBuf;

  A.unlock = () => {
    try {
      if (!A.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        A.ctx = new AC();
        comp = A.ctx.createDynamicsCompressor();
        comp.threshold.value = -14; comp.ratio.value = 4;
        master = A.ctx.createGain();
        master.gain.value = A.enabled ? 0.8 : 0;
        master.connect(comp); comp.connect(A.ctx.destination);
        noiseBuf = A.ctx.createBuffer(1, A.ctx.sampleRate * 2, A.ctx.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        A.ready = true;
      }
      if (A.ctx.state === 'suspended') A.ctx.resume();
    } catch (e) { A.ready = false; }
  };
  A.setEnabled = (on) => {
    A.enabled = on;
    if (master) master.gain.setTargetAtTime(on ? 0.8 : 0, A.ctx.currentTime, 0.05);
  };
  const ok = () => A.ready && A.ctx && A.ctx.state === 'running';
  const now = () => A.ctx.currentTime;

  function env(g, t, a, peak, dec) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
  }
  function noise(t, dur, filterType, freq, q, peak, dest) {
    const src = A.ctx.createBufferSource(); src.buffer = noiseBuf;
    src.loop = true;
    const f = A.ctx.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q || 1;
    const g = A.ctx.createGain();
    env(g, t, 0.003, peak, dur);
    src.connect(f); f.connect(g); g.connect(dest || master);
    src.start(t, Math.random() * 1.5); src.stop(t + dur + 0.05);
    return { src, f, g };
  }
  function tone(t, type, freq, dur, peak, freqEnd, dest) {
    const o = A.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    const g = A.ctx.createGain();
    env(g, t, 0.005, peak, dur);
    o.connect(g); g.connect(dest || master);
    o.start(t); o.stop(t + dur + 0.05);
    return o;
  }

  A.click = () => { if (!ok()) return; tone(now(), 'triangle', 1400, 0.05, 0.12, 900); };
  A.ratchet = (n) => {
    if (!ok()) return;
    const t = now();
    for (let i = 0; i < (n || 8); i++) {
      noise(t + i * 0.055, 0.02, 'bandpass', 3400, 6, 0.5);
      tone(t + i * 0.055, 'square', 2300, 0.012, 0.04);
    }
  };
  A.screw = () => {
    if (!ok()) return;
    const t = now();
    for (let i = 0; i < 3; i++) {
      const n = noise(t + i * 0.2, 0.15, 'bandpass', 1300, 4, 0.35);
      n.f.frequency.linearRampToValueAtTime(1800, t + i * 0.2 + 0.15);
    }
  };
  A.impact = () => {
    if (!ok()) return;
    const t = now();
    const o = A.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(48, t); o.frequency.linearRampToValueAtTime(70, t + 0.55);
    const am = A.ctx.createOscillator(); am.frequency.value = 26;
    const amg = A.ctx.createGain(); amg.gain.value = 0.5;
    const g = A.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.03); g.gain.setValueAtTime(0.35, t + 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.65);
    const f = A.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1400;
    am.connect(amg); amg.connect(g.gain);
    o.connect(f); f.connect(g); g.connect(master);
    o.start(t); am.start(t); o.stop(t + 0.7); am.stop(t + 0.7);
    for (let i = 0; i < 12; i++) noise(t + i * 0.042, 0.02, 'highpass', 2500, 1, 0.25);
    noise(t, 0.6, 'bandpass', 4200, 1.5, 0.12);
  };
  A.clunk = () => {
    if (!ok()) return;
    const t = now();
    tone(t, 'sine', 120, 0.25, 0.4, 70);
    noise(t, 0.08, 'lowpass', 900, 1, 0.3);
  };
  A.clink = () => {
    if (!ok()) return;
    const t = now();
    tone(t, 'sine', 1850, 0.25, 0.12);
    tone(t + 0.01, 'sine', 2780, 0.18, 0.07);
  };
  A.mallet = () => {
    if (!ok()) return;
    const t = now();
    for (let i = 0; i < 3; i++) { tone(t + i * 0.22, 'sine', 95, 0.14, 0.45, 60); noise(t + i * 0.22, 0.05, 'lowpass', 600, 1, 0.25); }
  };
  A.pliers = () => { if (!ok()) return; const t = now(); noise(t, 0.05, 'bandpass', 5000, 3, 0.3); tone(t + 0.06, 'sine', 3200, 0.06, 0.08); };
  A.puller = () => {
    if (!ok()) return;
    const t = now();
    const n = noise(t, 0.9, 'bandpass', 380, 3, 0.25);
    n.f.frequency.linearRampToValueAtTime(700, t + 0.9);
    tone(t + 0.95, 'sine', 160, 0.2, 0.5, 90);
    noise(t + 0.95, 0.06, 'highpass', 1500, 1, 0.4);
  };
  A.hand = () => { if (!ok()) return; noise(now(), 0.12, 'bandpass', 900, 1.2, 0.2); };
  A.error = () => { if (!ok()) return; const t = now(); tone(t, 'square', 220, 0.12, 0.09); tone(t + 0.14, 'square', 175, 0.18, 0.09); };
  A.success = () => { if (!ok()) return; const t = now(); [660, 880, 1320].forEach((f, i) => tone(t + i * 0.09, 'sine', f, 0.3, 0.14)); };
  A.fanfare = () => {
    if (!ok()) return;
    const t = now();
    [523, 659, 784, 1046, 784, 1046].forEach((f, i) => { tone(t + i * 0.13, 'triangle', f, 0.35, 0.16); tone(t + i * 0.13, 'sine', f * 2, 0.2, 0.04); });
  };
  A.page = () => { if (!ok()) return; noise(now(), 0.12, 'highpass', 3000, 0.7, 0.1); };

  // 工具對應音效
  A.tool = (toolId) => {
    if (toolId === 'impact') A.impact();
    else if (toolId === 'phillips' || toolId === 'hex') A.screw();
    else if (toolId === 'mallet') A.mallet();
    else if (toolId === 'pliers' || toolId === 'valvecomp') A.pliers();
    else if (toolId === 'puller') A.puller();
    else if (toolId === 'hand') A.hand();
    else A.ratchet(toolId === 'torque' ? 5 : 8);
  };

  // ---------- 倒油／洩油 ----------
  let pourNodes = null;
  A.pourStart = (thick) => {
    if (!ok() || pourNodes) return;
    const t = now();
    const src = A.ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = A.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = thick ? 500 : 900; f.Q.value = 1.4;
    const g = A.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.28, t + 0.1);
    const lfo = A.ctx.createOscillator(); lfo.frequency.value = 7;
    const lg = A.ctx.createGain(); lg.gain.value = 250;
    lfo.connect(lg); lg.connect(f.frequency);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t); lfo.start(t);
    pourNodes = { src, lfo, g };
  };
  A.pourStop = () => {
    if (!pourNodes) return;
    const t = now();
    const n = pourNodes; pourNodes = null;
    n.g.gain.setTargetAtTime(0.0001, t, 0.05);
    n.src.stop(t + 0.3); n.lfo.stop(t + 0.3);
  };

  // ---------- 喇叭 ----------
  let hornNodes = null;
  A.hornOn = () => {
    if (!ok() || hornNodes) return;
    const t = now();
    const g = A.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
    const f = A.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1100; f.Q.value = 0.8;
    const o1 = A.ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 415;
    const o2 = A.ctx.createOscillator(); o2.type = 'square'; o2.frequency.value = 498;
    o1.connect(f); o2.connect(f); f.connect(g); g.connect(master);
    o1.start(t); o2.start(t);
    hornNodes = { g, o1, o2 };
  };
  A.hornOff = () => {
    if (!hornNodes) return;
    const t = now(), n = hornNodes; hornNodes = null;
    n.g.gain.setTargetAtTime(0.0001, t, 0.02);
    n.o1.stop(t + 0.15); n.o2.stop(t + 0.15);
  };

  // ---------- 引擎 ----------
  const E = { on: false };
  A.engine = E;
  let pulseWave = null;
  function buildWave() {
    const n = 48;
    const real = new Float32Array(n), imag = new Float32Array(n);
    for (let k = 1; k < n; k++) {
      imag[k] = Math.exp(-k / 11) * (1 + 0.45 * Math.sin(k * 1.7));
      real[k] = Math.exp(-k / 14) * 0.4 * Math.cos(k * 0.9);
    }
    pulseWave = A.ctx.createPeriodicWave(real, imag);
  }
  E.start = () => {
    if (!ok() || E.on) return;
    if (!pulseWave) buildWave();
    const c = A.ctx, t = now();
    E.out = c.createGain(); E.out.gain.setValueAtTime(0.0001, t); E.out.gain.exponentialRampToValueAtTime(0.55, t + 0.15);
    E.lp = c.createBiquadFilter(); E.lp.type = 'lowpass'; E.lp.frequency.value = 700; E.lp.Q.value = 0.9;
    E.shaper = c.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const x = (i / 1023) * 2 - 1; curve[i] = Math.tanh(x * 2.2); }
    E.shaper.curve = curve;
    E.osc = c.createOscillator(); E.osc.setPeriodicWave(pulseWave); E.osc.frequency.value = 14;
    E.oscG = c.createGain(); E.oscG.gain.value = 0.55;
    E.osc2 = c.createOscillator(); E.osc2.type = 'sawtooth'; E.osc2.frequency.value = 28;
    E.osc2G = c.createGain(); E.osc2G.gain.value = 0.12;
    E.nsrc = c.createBufferSource(); E.nsrc.buffer = noiseBuf; E.nsrc.loop = true;
    E.bp = c.createBiquadFilter(); E.bp.type = 'bandpass'; E.bp.frequency.value = 650; E.bp.Q.value = 0.7;
    E.nG = c.createGain(); E.nG.gain.value = 0.25;
    E.lfo = c.createOscillator(); E.lfo.type = 'square'; E.lfo.frequency.value = 14;
    E.lfoG = c.createGain(); E.lfoG.gain.value = 0.22;
    E.lfo.connect(E.lfoG); E.lfoG.connect(E.nG.gain);
    E.whine = c.createOscillator(); E.whine.type = 'sine'; E.whine.frequency.value = 400;
    E.whineG = c.createGain(); E.whineG.gain.value = 0.0;
    E.osc.connect(E.oscG); E.osc2.connect(E.osc2G);
    E.nsrc.connect(E.bp); E.bp.connect(E.nG);
    E.oscG.connect(E.shaper); E.osc2G.connect(E.shaper); E.nG.connect(E.shaper);
    E.shaper.connect(E.lp); E.lp.connect(E.out);
    E.whine.connect(E.whineG); E.whineG.connect(E.out);
    E.out.connect(master);
    [E.osc, E.osc2, E.nsrc, E.lfo, E.whine].forEach((n) => n.start(t));
    E.on = true;
  };
  E.set = (rpm, throttle) => {
    if (!E.on) return;
    const t = now();
    const f = (rpm / 120) * (1 + (Math.random() - 0.5) * 0.03);
    E.osc.frequency.setTargetAtTime(f, t, 0.03);
    E.osc2.frequency.setTargetAtTime(f * 2, t, 0.03);
    E.lfo.frequency.setTargetAtTime(f, t, 0.03);
    E.lp.frequency.setTargetAtTime(380 + rpm * 0.32 + throttle * 1500, t, 0.06);
    E.bp.frequency.setTargetAtTime(500 + rpm * 0.12, t, 0.06);
    E.nG.gain.setTargetAtTime(0.18 + throttle * 0.25, t, 0.06);
    E.oscG.gain.setTargetAtTime(0.5 + throttle * 0.25, t, 0.06);
    E.whine.frequency.setTargetAtTime(rpm / 12, t, 0.08);
    E.whineG.gain.setTargetAtTime(rpm > 3000 ? Math.min(0.035, (rpm - 3000) / 90000) : 0, t, 0.1);
    E.out.gain.setTargetAtTime(0.42 + throttle * 0.3, t, 0.08);
  };
  E.stop = () => {
    if (!E.on) return;
    const t = now();
    E.out.gain.setTargetAtTime(0.0001, t, 0.12);
    const nodes = [E.osc, E.osc2, E.nsrc, E.lfo, E.whine];
    nodes.forEach((n) => { try { n.stop(t + 0.8); } catch (e) { /* 已停止 */ } });
    E.on = false;
  };
  // 啟動馬達運轉聲（秒數）
  A.crank = (dur) => {
    if (!ok()) return;
    const t = now(), c = A.ctx;
    const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(150, t); o.frequency.linearRampToValueAtTime(190, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.2, t + 0.05); g.gain.setValueAtTime(0.2, t + dur); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.1);
    const am = c.createOscillator(); am.frequency.value = 9;
    const amg = c.createGain(); amg.gain.value = 0.12;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1100;
    am.connect(amg); amg.connect(g.gain);
    o.connect(f); f.connect(g); g.connect(master);
    o.start(t); am.start(t); o.stop(t + dur + 0.2); am.stop(t + dur + 0.2);
    noise(t, dur, 'bandpass', 2200, 2, 0.05);
  };
  // 油泵建壓「嗡」聲
  A.pumpPrime = () => {
    if (!ok()) return;
    const t = now();
    const o = tone(t, 'sawtooth', 190, 1.6, 0.035);
    void o;
    noise(t, 1.6, 'bandpass', 1800, 4, 0.03);
  };
})();
