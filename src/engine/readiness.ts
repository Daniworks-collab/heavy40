export interface Readiness {
  sleep: number; // 1-5 (5 = excelente)
  energy: number; // 1-5
  pain: number; // 1-5 (1 = nada, 5 = dolor articular agudo)
}

export interface ReadinessResult {
  score: number; // 1-5
  low: boolean;
  conservative: boolean;
  swapAdvice: boolean;
  text: string;
}

export function evaluateReadiness(r: Readiness): ReadinessResult {
  const score = (r.sleep + r.energy + (6 - r.pain)) / 3;
  const low = score < 2.75 || r.sleep <= 1 || r.energy <= 1;
  const swapAdvice = r.pain >= 4;
  let text: string;
  if (swapAdvice) text = 'Dolor articular agudo: cambia los ejercicios que carguen esa zona. Si persiste, consulta a un profesional.';
  else if (low) text = 'Readiness bajo → modo conservador: sin series de relleno, +1 RIR y sin técnicas de intensidad.';
  else if (score >= 4) text = 'Listo para ir con todo. Técnica estricta.';
  else text = 'Readiness normal. Entrena según el plan.';
  return { score: Math.round(score * 10) / 10, low, conservative: low || swapAdvice, swapAdvice, text };
}
