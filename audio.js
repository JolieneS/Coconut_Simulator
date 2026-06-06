/* ═══════════════════════════════════════════
   audio.js  –  COCO Sound Engine
   • Beach ambient plays ONLY on the intro screen
     and stops when the menu appears.
   • Busted / prank sound plays when Realistic is picked.
═══════════════════════════════════════════ */

let audioCtx      = null;
let masterGain    = null;
let beachStarted  = false;

/* ── Kick everything off (called by game.js after intro) ── */
function initAudio() {
  if (beachStarted) return;
  beachStarted = true;

  try {
    audioCtx   = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0, audioCtx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0.45, audioCtx.currentTime + 2.5);
    masterGain.connect(audioCtx.destination);

    _makeWaveLayer(60,   0,  0.30, 0.08, 0.25);   // deep rumble
    _makeWaveLayer(120,  15, 0.15, 0.13, 0.20);   // mid wash
    _makeWaveLayer(200, -10, 0.08, 0.05, 0.15);   // high fizz

    setTimeout(_scheduleBirdChirp, 2500);
  } catch (e) {
    console.warn('Web Audio not available:', e);
  }
}

/* ── Fade beach audio out and stop it ── */
function stopBeachAudio() {
  if (!audioCtx || !masterGain) return;
  masterGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.2);
  setTimeout(() => {
    try { audioCtx.suspend(); } catch(e){}
  }, 1400);
}

/* ── Resume beach audio (if somehow needed again) ── */
function resumeBeachAudio() {
  if (!audioCtx) return;
  try { audioCtx.resume(); } catch(e){}
  if (masterGain) {
    masterGain.gain.setValueAtTime(0, audioCtx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0.45, audioCtx.currentTime + 1.5);
  }
}

/* ── BUSTED / prank sound ── */
function playBustedSound() {
  let ctx;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  } catch(e) { return; }

  const master = ctx.createGain();
  master.gain.value = 0.7;
  master.connect(ctx.destination);

  const now = ctx.currentTime;

  // Rising "WA-WA-WA-WAAAAH" trombone slide
  const notes = [
    { freq: 440, start: 0.00, dur: 0.18 },
    { freq: 370, start: 0.18, dur: 0.18 },
    { freq: 311, start: 0.36, dur: 0.18 },
    { freq: 233, start: 0.54, dur: 0.60 },   // long descending fall
  ];
  notes.forEach(n => {
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(n.freq, now + n.start);
    if (n.dur > 0.3) {
      // glide the long note down further for comedic effect
      osc.frequency.linearRampToValueAtTime(n.freq * 0.5, now + n.start + n.dur);
    }
    g.gain.setValueAtTime(0.5, now + n.start);
    g.gain.exponentialRampToValueAtTime(0.001, now + n.start + n.dur);
    osc.connect(g); g.connect(master);
    osc.start(now + n.start);
    osc.stop(now + n.start + n.dur + 0.05);
  });

  // Cymbal crash at the start
  const bufSize = ctx.sampleRate * 0.4;
  const buf     = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data    = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);
  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type      = 'highpass';
  noiseFilter.frequency.value = 6000;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.3, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
  noise.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(master);
  noise.start(now); noise.stop(now + 0.4);
}

/* ══════════════════════════
   PRIVATE HELPERS
══════════════════════════ */
function _makeWaveLayer(freq, detune, gainVal, lfoRate, lfoDepth) {
  const osc      = audioCtx.createOscillator();
  const g        = audioCtx.createGain();
  const filter   = audioCtx.createBiquadFilter();
  const lfo      = audioCtx.createOscillator();
  const lfoGain  = audioCtx.createGain();

  osc.type           = 'sawtooth';
  osc.frequency.value = freq;
  osc.detune.value    = detune;

  filter.type            = 'lowpass';
  filter.frequency.value = 400;
  filter.Q.value         = 0.5;

  lfo.frequency.value  = lfoRate;
  lfoGain.gain.value   = lfoDepth;

  lfo.connect(lfoGain);
  lfoGain.connect(g.gain);
  osc.connect(filter);
  filter.connect(g);
  g.gain.value = gainVal;
  g.connect(masterGain);

  osc.start(); lfo.start();
}

function _scheduleBirdChirp() {
  if (!audioCtx || audioCtx.state === 'suspended') return;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(1200 + Math.random() * 800, audioCtx.currentTime);
  o.frequency.exponentialRampToValueAtTime(800 + Math.random() * 400, audioCtx.currentTime + 0.15);
  g.gain.setValueAtTime(0.06, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.22);
  o.connect(g); g.connect(masterGain);
  o.start(); o.stop(audioCtx.currentTime + 0.25);
  setTimeout(_scheduleBirdChirp, 3000 + Math.random() * 5000);
}