/**
 * soundEffects.js
 * Self-contained Web Audio API sound synthesizer for the Chess Puzzle classroom.
 * Generates all audio procedurally — no external files required.
 *
 * Exports:
 *   playRoundStart()        — Ascending arpeggio chime when round begins
 *   playTenseTick()         — Soft air release hiss ticker (30s–11s remaining)
 *   playCountdownBeep(sec)  — Pitch-rising urgent beep (10s–1s remaining)
 *   playRoundEnd()          — Resolution buzzer when round ends
 *   playCorrectMove()       — Short pleasant ding for correct move
 *   playWrongMove()         — Short low buzz for wrong move
 *   playPuzzleSolved()      — Triumphant mini-fanfare for solving a puzzle
 *   playApplause()          — Warm procedural applause/clapping for the podium
 *   unlockAudio()           — Call once on first user gesture to unlock AudioContext
 */

let audioCtx = null;

/**
 * Lazily create (or resume) the shared AudioContext.
 */
function getCtx() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Check if audio is globally muted by the student/coach client
 */
function isMuted() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('chess_mute_audio') === 'true';
  }
  return false;
}

/**
 * Call once on user click to unlock AudioContext.
 */
export function unlockAudio() {
  getCtx();
}

// Auto-unlock on first interaction
if (typeof window !== 'undefined') {
  const handler = () => {
    unlockAudio();
    window.removeEventListener('click', handler);
    window.removeEventListener('touchstart', handler);
    window.removeEventListener('keydown', handler);
  };
  window.addEventListener('click', handler);
  window.addEventListener('touchstart', handler);
  window.addEventListener('keydown', handler);
}

// Helper to generate a short noise buffer for white-noise based ticks
let cachedNoiseBuffer = null;
function getNoiseBuffer(ctx) {
  if (cachedNoiseBuffer) return cachedNoiseBuffer;
  const bufferSize = ctx.sampleRate * 0.25; // 0.25 seconds of noise
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  cachedNoiseBuffer = buffer;
  return buffer;
}

// ─── Helpers ────────────────────────────────────────────────────

function playTone(freq, duration, type = 'sine', volume = 0.3, startDelay = 0) {
  if (isMuted()) return;
  const ctx = getCtx();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.value = freq;

  gain.gain.setValueAtTime(volume, ctx.currentTime + startDelay);
  const fadeStart = ctx.currentTime + startDelay + duration * 0.7;
  const fadeEnd = ctx.currentTime + startDelay + duration;
  gain.gain.setValueAtTime(volume, fadeStart);
  gain.gain.linearRampToValueAtTime(0, fadeEnd);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(ctx.currentTime + startDelay);
  osc.stop(ctx.currentTime + startDelay + duration);
}

// ─── Public API ─────────────────────────────────────────────────

export function playRoundStart() {
  if (isMuted()) return;
  const ctx = getCtx();
  if (!ctx) return;

  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 → E5 → G5 → C6
  const noteLen = 0.12;

  notes.forEach((freq, i) => {
    playTone(freq, noteLen + 0.05, 'sine', 0.25, i * noteLen);
  });

  setTimeout(() => {
    playTone(1046.5, 0.3, 'sine', 0.15, 0);
  }, notes.length * noteLen * 1000 + 50);
}

/**
 * Procedural High-Pass Filtered White Noise "Hiss" (Soft Air Release)
 * Replaces the old wooden-block ticking sound for the countdown.
 */
export function playTenseTick() {
  if (isMuted()) return;
  const ctx = getCtx();
  if (!ctx) return;

  try {
    const noise = ctx.createBufferSource();
    noise.buffer = getNoiseBuffer(ctx);

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 4500; // high-pass for soft air release hiss

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(ctx.currentTime);
    noise.stop(ctx.currentTime + 0.22);
  } catch (e) {
    // fallback if buffer source fails
    playTone(1200, 0.05, 'sine', 0.05);
  }
}

export function playCountdownBeep(secondsLeft) {
  if (isMuted()) return;
  const ctx = getCtx();
  if (!ctx) return;

  const t = Math.max(0, Math.min(10, secondsLeft));
  const freq = 600 + ((10 - t) / 9) * 600;
  const volume = 0.2 + ((10 - t) / 9) * 0.15;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.value = freq;

  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.15);
}

export function playRoundEnd() {
  if (isMuted()) return;
  const ctx = getCtx();
  if (!ctx) return;

  playTone(880, 0.2, 'square', 0.18, 0);
  playTone(440, 0.35, 'square', 0.2, 0.22);
  playTone(220, 0.25, 'sine', 0.25, 0.55);
}

export function playCorrectMove() {
  if (isMuted()) return;
  playTone(880, 0.1, 'sine', 0.18, 0);
  playTone(1100, 0.12, 'sine', 0.15, 0.08);
}

export function playWrongMove() {
  if (isMuted()) return;
  playTone(200, 0.15, 'square', 0.15, 0);
  playTone(160, 0.18, 'square', 0.12, 0.12);
}

export function playPuzzleSolved() {
  if (isMuted()) return;
  const notes = [659.25, 783.99, 987.77, 1318.5]; // E5 → G5 → B5 → E6
  notes.forEach((freq, i) => {
    playTone(freq, 0.15, 'sine', 0.2, i * 0.1);
  });
}

/**
 * Warm procedural applause/clapping sound effect.
 * Triggers a shower of random pops and clicks mapped to clapping major frequencies.
 */
export function playApplause() {
  if (isMuted()) return;
  const ctx = getCtx();
  if (!ctx) return;

  const now = ctx.currentTime;
  // Generate 60 quick clapping sounds scattered over 3.0 seconds
  for (let i = 0; i < 60; i++) {
    const delay = Math.random() * 3.0;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.value = 160 + Math.random() * 110;

    filter.type = 'bandpass';
    filter.frequency.value = 1100;
    filter.Q.value = 4;

    gain.gain.setValueAtTime(0.09 + Math.random() * 0.05, now + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.09);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + delay);
    osc.stop(now + delay + 0.09);
  }
}

/**
 * Play a clear, pleasant bell chime when a student requests or enters the classroom.
 */
export function playStudentJoinNotification() {
  if (isMuted()) return;
  const ctx = getCtx();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    
    // First bell chime (Ding - E5: ~659Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.35, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.55);

    // Second bell chime (Dong - A5: ~880Hz, slightly delayed)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.16);
    gain2.gain.setValueAtTime(0.4, now + 0.16);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.16);
    osc2.stop(now + 0.85);
  } catch (e) {
    console.warn('Student join chime failed:', e);
  }
}
