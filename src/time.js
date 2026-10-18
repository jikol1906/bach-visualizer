// Time in a piece: quarter-note beats in the score, seconds at 100% speed, and bars.
// tempoMap and bars are as parseMidi returns them.

// The tempo in force at beat b.
export const segAtBeat = (tempoMap, b) => { let s = tempoMap[0]; for (const x of tempoMap) if (x.beat <= b) s = x; else break; return s; };

// Seconds from the start of the score to beat b, at 100% speed.
export const secAt = (tempoMap, b) => { const s = segAtBeat(tempoMap, b); return s.sec + (b - s.beat) * 60 / s.bpm; };

// The beat t seconds into the score, at 100% speed: the inverse of secAt.
export function beatAtSec(tempoMap, t) {
  let s = tempoMap[0];
  for (const x of tempoMap) if (x.sec <= t) s = x; else break;
  return s.beat + (t - s.sec) * s.bpm / 60;
}

// Index of the first note in list (sorted by start) that starts at or after beat b.
export const firstAtOrAfter = (list, b) => { let l = 0, r = list.length; while (l < r) { const m = (l + r) >> 1; if (list[m].start < b - 1e-9) l = m + 1; else r = m; } return l; };

// Index of the bar containing beat b, with a 32nd of slack since played MIDI lands a hair early.
export function barIdx(bars, b) {
  let l = 0, r = bars.length - 1;
  while (l < r) { const m = (l + r + 1) >> 1; if (bars[m].start <= b + 0.0625) l = m; else r = m - 1; }
  return l;
}

// Where beat b falls: its bar number, the beat within the bar (counting from 1, in the bar's own beat unit),
// and the bar's label for the readout.
export function barInfo(bars, b) {
  const bar = bars[barIdx(bars, b)];
  const beat = Math.max(0, b - bar.start) / bar.unit + 1;
  return { bar: bar.n, beat: Math.round(beat * 100) / 100, label: bar.n >= 1 ? String(bar.n) : bar.pickup ? "pickup" : "–" };
}
