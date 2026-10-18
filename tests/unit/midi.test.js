import { describe, it, expect } from "vitest";
import { parseMidi } from "../../src/midi.js";
import { secAt } from "../../src/time.js";
import { load } from "./files.js";
import { smf, track, note, noteOn, noteOff, name, instrument, program, tempo, timeSig, rawTrack } from "./smf.js";

const SUITE = ["Violin1", "Violin2", "Viola", "Cello", "Flute"];   // in file order; the app sorts them later
const Q = 480;   // ticks per quarter note in the made-up files

describe("the shipped files", () => {
  it.each([
    ["ouverture", "4/4", 76, SUITE],
    ["rondeau", "4/4", 156, SUITE],
    ["sarabande", "3/4", 76, SUITE],
    ["bourree", "4/4", 216, SUITE],
    ["polonaise", "3/4", 56, SUITE],
    ["menuet", "3/4", 108, SUITE],
    ["badinerie", "2/4", 120, SUITE],
    ["fugue", "4/4", 80, ["Right hand", "Left hand", "Pedal"]],
  ])("%s: %s at ♩ = %i, with its voices", (slug, sig, bpm, voices) => {
    const s = load(slug);
    expect(s.sig).toBe(sig);
    expect(s.bpm).toBe(bpm);
    expect(s.tracks.map(t => t.name)).toEqual(voices);
  });

  it.each(["ouverture", "rondeau", "sarabande", "bourree", "polonaise", "menuet", "badinerie", "fugue"])("%s: notes are in order and sane", slug => {
    for (const tr of load(slug).tracks) {
      expect(tr.notes.length).toBeGreaterThan(50);
      for (let i = 0; i < tr.notes.length; i++) {
        const n = tr.notes[i], prev = tr.notes[i - 1];
        if (prev) expect(n.start).toBeGreaterThanOrEqual(prev.start);
        expect(n.dur).toBeGreaterThan(0);
        expect(n.vel).toBeGreaterThanOrEqual(0.35);
        expect(n.vel).toBeLessThanOrEqual(1);
        expect(n.midi).toBeGreaterThanOrEqual(21);
        expect(n.midi).toBeLessThanOrEqual(108);
      }
    }
  });

  it("the Badinerie has a quarter-note pickup, and bar 1 starts on the flute's F♯", () => {
    const s = load("badinerie");
    expect(s.bars[0]).toMatchObject({ n: 0, start: 0, len: 2, pickup: true });
    const bar1 = s.bars.find(b => b.n === 1);
    expect(bar1.start).toBe(2);
    // Played in by hand, so the note sits a hair before the barline: take the one nearest it.
    const flute = s.tracks.find(t => t.name === "Flute");
    const first = flute.notes.reduce((a, n) => Math.abs(n.start - bar1.start) < Math.abs(a.start - bar1.start) ? n : a);
    expect(first.midi).toBe(78);   // F♯5
    expect(Math.abs(first.start - bar1.start)).toBeLessThan(0.125);
  });

  it("the Ouverture has no pickup, and its tempo map speeds up for the fugal section", () => {
    const s = load("ouverture");
    expect(s.bars[0].pickup).toBe(false);
    expect(s.tempoMap.length).toBe(22);
    const fastest = Math.max(...s.tempoMap.map(t => t.bpm));
    expect(fastest).toBeGreaterThan(s.bpm * 1.5);
    for (let i = 1; i < s.tempoMap.length; i++) {
      expect(s.tempoMap[i].beat).toBeGreaterThan(s.tempoMap[i - 1].beat);
      expect(s.tempoMap[i].sec).toBeGreaterThan(s.tempoMap[i - 1].sec);
    }
  });

  it("the Menuet's bars are all 3/4 after the pickup", () => {
    const s = load("menuet");
    expect(s.bars[0].pickup).toBe(true);
    for (const b of s.bars.slice(1)) expect(b.len).toBe(3);
  });

  it("the fugue's octave-coupler tracks were left out of the file: three voices, organ program", () => {
    const s = load("fugue");
    expect(s.tracks).toHaveLength(3);
    for (const t of s.tracks) expect(t.program).toBe(19);
  });
});

describe("reading files", () => {
  it("refuses something that isn't MIDI", () => {
    expect(() => parseMidi(new TextEncoder().encode("hello, not midi").buffer)).toThrow("This doesn't look like a MIDI file.");
  });

  it("refuses SMPTE timing", () => {
    expect(() => parseMidi(smf([track(note(0, 60, Q))], { division: 0xe728 }))).toThrow(/SMPTE/);
  });

  it("refuses a file with no notes", () => {
    expect(() => parseMidi(smf([track(name("Empty"))]))).toThrow("No notes found in this MIDI file.");
  });

  it("reads notes in quarter-note beats, with velocity as a fraction", () => {
    const s = parseMidi(smf([track(name("Lute"), note(0, 60, Q, 127), note(Q, 64, Q / 2, 64))]));
    const [a, b] = s.tracks[0].notes;
    expect(a).toEqual({ midi: 60, start: 0, dur: 1, vel: 1 });
    expect(b).toMatchObject({ midi: 64, start: 2, dur: 0.5 });
    expect(b.vel).toBeCloseTo(64 / 127);
  });

  it("treats a note-on at velocity 0 as a note-off, and reads running status", () => {
    // 0x90 once, then running status: key 60 on, key 60 "on" at 0 (off), key 62 on, key 62 off.
    const s = parseMidi(smf([rawTrack([0, 0x90, 60, 100, 0x83, 0x60, 60, 0, 0, 62, 100, 0x83, 0x60, 62, 0])]));
    expect(s.tracks[0].notes.map(n => [n.midi, n.start, n.dur])).toEqual([[60, 0, 1], [62, 1, 1]]);
  });

  it("gives very quiet and very short notes a floor", () => {
    const s = parseMidi(smf([track(note(0, 60, 1, 5))]));
    expect(s.tracks[0].notes[0].vel).toBe(0.35);
    expect(s.tracks[0].notes[0].dur).toBe(1 / 32);
  });

  it("ends a note that's struck again before its note-off", () => {
    const s = parseMidi(smf([track(noteOn(0, 60), noteOn(Q, 60), noteOff(Q, 60))]));
    expect(s.tracks[0].notes.map(n => [n.start, n.dur])).toEqual([[0, 1], [1, 1]]);
  });

  it("names a track by its name, its instrument, or its number", () => {
    const s = parseMidi(smf([track(name("Oboe"), note(0, 60, Q)), track(instrument("Viola da gamba"), note(0, 50, Q)), track(note(0, 40, Q))]));
    expect(s.tracks.map(t => t.name)).toEqual(["Oboe", "Viola da gamba", "Track 3"]);
  });

  it("keeps a track's first program change", () => {
    const s = parseMidi(smf([track(program(73), note(0, 60, Q), program(40, 0, 0))]));
    expect(s.tracks[0].program).toBe(73);
  });

  it("merges tracks that share a name and channel, but not across channels", () => {
    const s = parseMidi(smf([
      track(name("Flute"), note(0, 72, Q)),
      track(name("Flute"), note(4 * Q, 74, Q)),          // the repeat, split into its own track
      track(name("Flute"), note(0, 60, Q, 100, 1)),      // same name, another channel: another voice
    ]));
    expect(s.tracks).toHaveLength(2);
    expect(s.tracks[0].notes.map(n => n.midi)).toEqual([72, 74]);
  });

  it("sorts each voice's notes by start, highest first on a tie", () => {
    const s = parseMidi(smf([track(noteOn(Q, 60), noteOn(0, 67), noteOff(Q, 60), noteOff(0, 67), note(0, 55, Q))]));
    expect(s.tracks[0].notes.map(n => n.midi)).toEqual([67, 60, 55]);
  });
});

describe("tempo and metre", () => {
  it("defaults to ♩ = 120 in 4/4", () => {
    const s = parseMidi(smf([track(note(0, 60, Q))]));
    expect(s.bpm).toBe(120);
    expect(s.sig).toBe("4/4");
    expect(s.tempoMap).toEqual([{ beat: 0, bpm: 120, sec: 0 }]);
  });

  it("times each tempo change from the ones before it", () => {
    const s = parseMidi(smf([track(tempo(120), tempo(60, 4 * Q), tempo(240, 2 * Q)), track(note(0, 60, 8 * Q))]));
    expect(s.tempoMap).toEqual([{ beat: 0, bpm: 120, sec: 0 }, { beat: 4, bpm: 60, sec: 2 }, { beat: 6, bpm: 240, sec: 4 }]);
    expect(secAt(s.tempoMap, 8)).toBe(4.5);
  });

  it("lets the last of several tempos at the same moment win", () => {
    const s = parseMidi(smf([track(tempo(100), tempo(90)), track(note(0, 60, Q))]));
    expect(s.tempoMap).toHaveLength(1);
    expect(s.tempoMap[0].bpm).toBeCloseTo(90, 3);   // MIDI stores microseconds per beat
  });

  it("starts a new bar at each change of metre", () => {
    // Two bars of 4/4, then 3/8 (1.5 beats a bar, counted in eighths).
    const s = parseMidi(smf([track(timeSig(4, 4), timeSig(3, 8, 8 * Q)), track(note(0, 60, Q), note(11 * Q, 60, Q))]));
    const bars = s.bars.filter(b => b.n >= 1).slice(0, 4);
    expect(bars.map(b => [b.n, b.start, b.len, b.unit])).toEqual([[1, 0, 4, 1], [2, 4, 4, 1], [3, 8, 1.5, 0.5], [4, 9.5, 1.5, 0.5]]);
  });

  it("finds a pickup from a first note off the barline", () => {
    // 4/4, first note on beat 4 of the empty first bar.
    const s = parseMidi(smf([track(note(3 * Q, 67, Q), note(0, 72, 4 * Q))]));
    expect(s.bars[0]).toMatchObject({ n: 0, start: 0, len: 4, pickup: true });
    expect(s.bars[1]).toMatchObject({ n: 1, start: 4 });
  });

  it("finds a pickup the file left out from a short last bar", () => {
    // Starts on a barline but ends three beats into a bar: the pickup is the missing beat, so the
    // pickup and the last bar make one whole bar between them.
    const s = parseMidi(smf([track(note(0, 67, Q), note(0, 72, 6 * Q))]));
    expect(s.bars.find(b => b.n === 1).start).toBe(1);
    expect(s.bars[0]).toMatchObject({ n: 0, start: 0, len: 1, pickup: true });
  });

  it("and the other way round: ending one beat into a bar means a three-beat pickup", () => {
    const s = parseMidi(smf([track(note(0, 67, Q), note(0, 72, 4 * Q))]));
    expect(s.bars.find(b => b.n === 1).start).toBe(3);
  });

  it("finds no pickup when the music starts and ends on barlines", () => {
    const s = parseMidi(smf([track(note(0, 60, 8 * Q))]));
    expect(s.bars[0]).toMatchObject({ n: 1, start: 0, len: 4 });
  });
});
