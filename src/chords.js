import { firstAtOrAfter } from "./time.js";

// Notes under beat b in the tracks that are on, leaving out `skip`. A note counts until the next note in its voice
// starts (up to one beat), so detached accompaniment and short rests don't punch holes in the harmony. Tracks are
// as parseMidi returns them, plus on (shown and heard) and mono (one note at a time).
export function chordAt(tracks, b, skip = null) {
  const out = new Set();
  for (const tr of tracks) {
    if (!tr.on || tr === skip) continue;
    const ns = tr.notes;
    for (let i = firstAtOrAfter(ns, b - 16); i < ns.length && ns[i].start <= b + 1e-6; i++) {
      const n = ns[i], end = n.start + n.dur;
      const next = tr.mono && i + 1 < ns.length ? ns[i + 1].start : end;
      if (b < Math.min(Math.max(end, next), end + 1)) out.add(n);
    }
  }
  return out;
}

// Name a chord with Tonal, e.g. "Bm", "F♯7", "Bm/D". Tonal reads the first note as the bass, so the
// pitch classes go in lowest first. assumePerfectFifth lets it name sevenths without their fifth
// ("C♯ E B" → C♯m7), which Bach writes all the time. Tonal often offers several readings and likes
// exotic ones with the bass as root ("F♯ A D" → F♯m♯5 before D/F♯), so take the first common chord it
// offers and only fall back to its own first pick. If the library didn't load (offline), the readout
// just shows the notes. midis are MIDI note numbers, in any order.
const SHARPS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const COMMON = new Set(["M", "m", "dim", "aug", "sus4", "6", "m6", "7", "maj7", "m7", "m7b5", "dim7"]);
export function chordName(midis, Tonal = globalThis.Tonal) {
  if (!Tonal || !midis.length) return "";
  const pcs = [...new Set([...midis].sort((a, b) => a - b).map(m => SHARPS[m % 12]))];
  if (pcs.length < 3) return "";   // a lone interval could be several chords
  const found = Tonal.Chord.detect(pcs, { assumePerfectFifth: true });
  const best = found.find(x => COMMON.has(x.split("/")[0].slice((Tonal.Chord.get(x).tonic || "").length))) || found[0] || "";
  return best.replace(/M(?=\/|$)/, "").replace(/#/g, "♯").replace(/b(?=\d)/g, "♭");   // "F#M" → "F♯"
}
