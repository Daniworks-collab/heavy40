// Web Audio + Vibration. Todo es opcional y silencioso si el navegador no lo soporta.
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx ??= new AC();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Desbloquea el audio en iOS: llamar dentro de un gesto del usuario. */
export function unlockAudio() {
  audio();
}

export function beep(freq = 880, ms = 120, gain = 0.18, type: OscillatorType = 'square') {
  const a = audio();
  if (!a) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, a.currentTime);
  g.gain.exponentialRampToValueAtTime(gain, a.currentTime + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + ms / 1000);
  o.connect(g).connect(a.destination);
  o.start();
  o.stop(a.currentTime + ms / 1000 + 0.02);
}

/** Golpe de yunque: tono bajo + armónico metálico. */
export function anvil() {
  beep(220, 160, 0.22, 'triangle');
  setTimeout(() => beep(1320, 90, 0.08, 'sine'), 10);
}

export function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* no-op */
  }
}
