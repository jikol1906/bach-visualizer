// A minimal Standard MIDI File reader.
//
// parseMidi(buf) → { tracks, tempoMap, bars, sig, bpm }:
//   tracks:   [{ name, program, notes: [{ midi, start, dur, vel }] }], times in quarter-note beats, notes in start order
//   tempoMap: [{ beat, bpm, sec }], sec being the time each tempo starts at 100% speed
//   bars:     [{ n, start, len, unit, pickup? }], bar 0 being the pickup (or empty lead-in) when there is one
//   sig, bpm: the opening time signature ("2/4") and tempo
export function parseMidi(buf) {
  const d = new DataView(buf);
  let p = 0;
  const str = n => { let s = ""; for (let i = 0; i < n; i++) s += String.fromCharCode(d.getUint8(p + i)); p += n; return s; };
  const vlq = () => { let v = 0, b; do { b = d.getUint8(p++); v = (v << 7) | (b & 0x7f); } while (b & 0x80); return v; };
  if (str(4) !== "MThd") throw new Error("This doesn't look like a MIDI file.");
  const hlen = d.getUint32(p); p += 4;
  const ntr = d.getUint16(p + 2), div = d.getUint16(p + 4);
  p += hlen;
  if (div & 0x8000) throw new Error("This MIDI file uses SMPTE timing, which isn't supported.");
  let lastTick = 0;
  const tempos = [], sigs = [];   // { tick, bpm } and { tick, num, den }, from every track
  const byKey = new Map();   // tracks with the same name and channel are one voice (some files split repeats across tracks)
  for (let t = 0; t < ntr && p + 8 <= d.byteLength; t++) {
    const id = str(4), len = d.getUint32(p); p += 4;
    const end = Math.min(p + len, d.byteLength);
    if (id !== "MTrk") { p = end; continue; }
    let tick = 0, status = 0, name = "", inst = "", program = -1;
    const open = new Map(), notes = [], chans = new Set();
    while (p < end) {
      tick += vlq();
      const b = d.getUint8(p);
      if (b & 0x80) { status = b; p++; }
      if (status === 0xff) {
        const type = d.getUint8(p++), l = vlq();
        if (type === 0x51) tempos.push({ tick, bpm: 60000000 / ((d.getUint8(p) << 16) | (d.getUint8(p + 1) << 8) | d.getUint8(p + 2)) });
        if (type === 0x58) sigs.push({ tick, num: d.getUint8(p), den: 2 ** d.getUint8(p + 1) });
        if ((type === 0x03 && !name) || (type === 0x04 && !inst)) {
          let txt = "";
          for (let i = 0; i < l; i++) txt += String.fromCharCode(d.getUint8(p + i));
          if (type === 0x03) name = txt; else inst = txt;
        }
        p += l;
        continue;
      }
      if (status === 0xf0 || status === 0xf7) { p += vlq(); continue; }
      const hi = status & 0xf0, ch = status & 0x0f;
      const a = d.getUint8(p++);
      const v = (hi === 0xc0 || hi === 0xd0) ? 0 : d.getUint8(p++);
      if (hi === 0xc0 && program < 0) program = a;
      const key = ch * 128 + a;
      const close = () => {
        const o = open.get(key);
        if (!o) return;
        notes.push({ midi: a, start: o.tick / div, dur: Math.max((tick - o.tick) / div, 1 / 32), vel: Math.max(o.vel / 127, 0.35) });
        open.delete(key);
      };
      if (hi === 0x90 && v > 0) { close(); open.set(key, { tick, vel: v }); chans.add(ch); }
      else if (hi === 0x80 || hi === 0x90) close();
    }
    p = end;
    lastTick = Math.max(lastTick, tick);
    if (!notes.length) continue;
    const label = name.trim() || inst.trim() || `Track ${t + 1}`;
    const k = label + "|" + [...chans].join(",");
    if (byKey.has(k)) byKey.get(k).notes.push(...notes);
    else byKey.set(k, { name: label, program, notes });
  }
  const tracks = [...byKey.values()];
  if (!tracks.length) throw new Error("No notes found in this MIDI file.");
  for (const tr of tracks) tr.notes.sort((x, y) => x.start - y.start || y.midi - x.midi);

  // Tempo map, in quarter-note beats, with the seconds elapsed at each change (at 100% speed).
  tempos.sort((a, b) => a.tick - b.tick);
  if (!tempos.length || tempos[0].tick > 0) tempos.unshift({ tick: 0, bpm: tempos.length ? tempos[0].bpm : 120 });
  const tempoMap = [];
  for (const t of tempos) {
    const beat = t.tick / div, prev = tempoMap[tempoMap.length - 1];
    if (prev && Math.abs(prev.beat - beat) < 1e-9) { prev.bpm = t.bpm; continue; }   // a later event at the same tick wins
    tempoMap.push({ beat, bpm: t.bpm, sec: prev ? prev.sec + (beat - prev.beat) * 60 / prev.bpm : 0 });
  }

  // Time signatures, in quarter-note beats per bar and per counted beat.
  sigs.sort((a, b) => a.tick - b.tick);
  const sigMap = sigs.map(s => ({ beat: s.tick / div, len: s.num * 4 / s.den, unit: 4 / s.den, label: `${s.num}/${s.den}` }));
  if (!sigMap.length || sigMap[0].beat > 0) sigMap.unshift({ beat: 0, len: 4, unit: 1, label: "4/4" });
  const sigAt = b => { let s = sigMap[0]; for (const x of sigMap) if (x.beat <= b + 1e-6) s = x; return s; };

  // Files rarely mark an upbeat. If the first note isn't on a barline, the bar it sits in is the pickup.
  // If it is, a piece with one metre that ends on a short bar is assumed to have left the pickup out.
  const snap = x => Math.round(x * 8) / 8;
  const first = snap(Math.min(...tracks.map(tr => tr.notes[0].start)));
  const s0 = sigAt(first), lead = snap((first - s0.beat) % s0.len), rest = snap((lastTick / div - s0.beat) % s0.len);
  const origin = lead > 0 && lead < s0.len ? first - lead + s0.len
    : sigMap.length === 1 && rest > 0 && rest < s0.len ? first + s0.len - rest : first;

  // Bar list: bar 1 starts at origin; each metre change starts a new bar.
  const endB = lastTick / div + 8, bars = [];
  const s1 = sigAt(origin);
  // Bar 0 is the pickup when there is one, otherwise just the empty lead-in some files start with.
  if (origin > 0) bars.push({ n: 0, start: Math.max(0, origin - s1.len), len: Math.min(s1.len, origin), unit: s1.unit, pickup: origin > first + 1e-6 });
  for (let b = origin, n = 1; b < endB; n++) {
    const s = sigAt(b);
    let next = b + s.len;
    const change = sigMap.find(x => x.beat > b + 1e-6 && x.beat < next - 1e-6);
    if (change) next = change.beat;
    bars.push({ n, start: b, len: next - b, unit: s.unit });
    b = next;
  }
  return { tracks, tempoMap, bars, sig: s0.label, bpm: Math.round(tempoMap[0].bpm) };
}
