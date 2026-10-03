// Web Audio + Vibration. Todo es opcional y silencioso si el navegador no lo soporta.
let ctx: AudioContext | null = null;
/** Volumen maestro 0-1 (Ajustes → volumen de sonidos). */
let master = 0.8;
export function setMasterVolume(v: number) {
  master = Math.max(0, Math.min(1, v));
}

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
  if (!a || master <= 0) return;
  gain = Math.max(0.0002, gain * master * 1.25);
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

/** ¿El navegador puede vibrar? (Safari en iPhone no expone la API de vibración.) */
export function canVibrate(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

/**
 * Aviso de descanso: vibración si existe y, como respaldo, sonido.
 * Si el usuario pidió vibración pero el teléfono no puede (iPhone), suena siempre.
 */
export function restAlert(kind: 'warn' | 'end', s: { sound: boolean; vibration: boolean }) {
  const vib = s.vibration && canVibrate();
  if (vib) vibrate(kind === 'warn' ? 80 : [120, 60, 120]);
  const mustSound = s.sound || (s.vibration && !canVibrate());
  if (!mustSound) return;
  if (kind === 'warn') beep(660, 110, 0.15);
  else {
    beep(990, 160, 0.2);
    setTimeout(() => beep(1320, 260, 0.2), 180);
  }
}
