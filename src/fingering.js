// Guitar fingering. Standard tuning is fourths apart except for the major third from G to B; a lower-tuned neck
// keeps that same shape, moved down, so chord shapes carry over.

export const FRETS = 24, STD = [40, 45, 50, 55, 59, 64];   // E2 A2 D3 G3 B3 E4
export const tuning = shift => STD.map(m => m + shift);
const YOU = {};   // the hand for notes you play yourself

// Where each note goes on a neck tuned to `tune` (MIDI notes of the strings, lowest first).
// items: { midi, tr, at } → the same with s (string, 0 = lowest) and f (fret) filled in; notes the neck can't
// reach are left out. A note with `at` ({ s, f }) is already placed (you're pressing it there). tr is the voice the
// note belongs to, or null for your own; hand (a Map or WeakMap) remembers each voice's last fret between calls.
export function placeNotes(tune, hand, items) {
  const used = new Set(), out = [];
  for (const it of items) if (it.at) { used.add(it.at.s); out.push({ ...it, s: it.at.s, f: it.at.f }); }
  for (const it of items.filter(it => !it.at).sort((a, b) => b.midi - a.midi)) {
    const cands = [];
    for (let s = 0; s < 6; s++) { const f = it.midi - tune[s]; if (f >= 0 && f <= FRETS) cands.push({ s, f }); }
    if (!cands.length) continue;
    // Low on the neck first, then near the voice's hand (which breaks near-ties), so no voice creeps up the neck;
    // a string a higher note already took is a heavy cost, not a ban, so nothing gets pushed to fret 24.
    const key = it.tr || YOU, at = hand.has(key) ? hand.get(key) : 3;
    const cost = c => (c.f === 0 ? 0 : 0.5 * Math.abs(c.f - at) + c.f * 0.6) + (used.has(c.s) ? 10 : 0);
    const best = cands.reduce((a, b) => cost(b) < cost(a) ? b : a);
    if (best.f > 0) hand.set(key, best.f);
    used.add(best.s);
    out.push({ ...it, ...best });
  }
  return out;
}
