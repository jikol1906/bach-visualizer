// Pitch of a voice by the YIN method (de Cheveigné & Kawahara, 2002), in Hz: 0 when it's too quiet or not clearly
// pitched. x is a block of samples at sample rate sr; it hears 70 to 1100 Hz, the lowest no lower than the block
// allows (half its length is compared with the other half). d is scratch space at least half as long as x, so a
// caller running this many times a second needn't allocate.
export function detectPitch(x, sr, d = new Float32Array(x.length)) {
  let sum = 0;
  for (let i = 0; i < x.length; i++) sum += x[i] * x[i];
  if (Math.sqrt(sum / x.length) < 0.003) return 0;
  const W = x.length >> 1, tauMax = Math.min(W, Math.floor(sr / 70)), tauMin = Math.floor(sr / 1100);
  for (let t = 1; t <= tauMax; t++) {
    let s = 0;
    for (let j = 0; j < W; j++) { const e = x[j] - x[j + t]; s += e * e; }
    d[t] = s;
  }
  let run = 0;
  for (let t = 1; t <= tauMax; t++) { run += d[t]; d[t] = d[t] * t / run; }
  // The first dip under the threshold; failing that, the deepest dip if it's still clearly pitched (a breathy or
  // quiet voice rarely reaches 0.15).
  let t = tauMin;
  for (; t < tauMax; t++) {
    if (d[t] < 0.15) { while (t + 1 < tauMax && d[t + 1] < d[t]) t++; break; }
  }
  if (t >= tauMax) {
    let best = tauMin;
    for (let k = tauMin; k < tauMax; k++) if (d[k] < d[best]) best = k;
    if (d[best] > 0.3) return 0;
    t = best;
  }
  const a = d[t - 1], b = d[t], c = d[t + 1], den = a - 2 * b + c;
  return sr / (t + (den ? (a - c) / (2 * den) : 0));
}
