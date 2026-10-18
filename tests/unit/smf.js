// Builds Standard MIDI Files in memory, for parser tests the real files don't cover.
// track(...events) takes events as [deltaTicks, ...bytes]; helpers below make the common ones.

const vlq = n => { const out = [n & 0x7f]; while ((n >>= 7)) out.unshift((n & 0x7f) | 0x80); return out; };
const u32 = n => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const text = s => [...s].map(c => c.charCodeAt(0));

export const noteOn = (dt, key, vel = 100, ch = 0) => [dt, 0x90 | ch, key, vel];
export const noteOff = (dt, key, ch = 0) => [dt, 0x80 | ch, key, 0];
export const name = (s, dt = 0) => [dt, 0xff, 0x03, ...vlq(s.length), ...text(s)];
export const instrument = (s, dt = 0) => [dt, 0xff, 0x04, ...vlq(s.length), ...text(s)];
export const program = (p, ch = 0, dt = 0) => [dt, 0xc0 | ch, p];
export const tempo = (bpm, dt = 0) => { const us = Math.round(60e6 / bpm); return [dt, 0xff, 0x51, 3, (us >> 16) & 255, (us >> 8) & 255, us & 255]; };
export const timeSig = (num, den, dt = 0) => [dt, 0xff, 0x58, 4, num, Math.log2(den), 24, 8];
// A note: on at `dt` ticks after the previous event, off `len` ticks later.
export const note = (dt, key, len, vel = 100, ch = 0) => [noteOn(dt, key, vel, ch), noteOff(len, key, ch)];

export function track(...events) {
  const bytes = events.flatMap(e => Array.isArray(e[0]) ? e : [e]).flatMap(([dt, ...b]) => [...vlq(dt), ...b]);   // note() gives a pair
  bytes.push(0, 0xff, 0x2f, 0);   // end of track
  return [...text("MTrk"), ...u32(bytes.length), ...bytes];
}

// smf([track(...), ...], { division }) → an ArrayBuffer
export function smf(tracks, { division = 480, format = 1 } = {}) {
  const head = [...text("MThd"), ...u32(6), 0, format, 0, tracks.length, (division >> 8) & 255, division & 255];
  return new Uint8Array([...head, ...tracks.flat()]).buffer;
}

// Raw bytes for a track, for events helpers don't cover (running status).
export const rawTrack = bytes => [...text("MTrk"), ...u32(bytes.length + 4), ...bytes, 0, 0xff, 0x2f, 0];
