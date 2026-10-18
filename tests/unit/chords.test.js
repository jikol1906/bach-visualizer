import { describe, it, expect } from "vitest";
import * as Tonal from "tonal";
import { chordName, chordAt } from "../../src/chords.js";

const name = midis => chordName(midis, Tonal);

describe("chordName", () => {
  it.each([
    ["a triad", [47, 62, 66], "Bm"],
    ["the bass decides the inversion", [50, 71, 74, 78], "Bm/D"],
    ["a common inversion before an exotic root position", [54, 57, 62], "D/F♯"],
    ["a seventh without its fifth", [49, 52, 59], "C♯m7"],
    ["a dominant seventh", [54, 58, 61, 64], "F♯7"],
    ["a major seventh", [48, 52, 55, 59], "Cmaj7"],
    ["half-diminished, with a proper flat sign", [47, 50, 53, 57], "Bm7♭5"],
    ["diminished seventh", [49, 52, 55, 58], "C♯dim7"],
    ["major, without the M", [48, 52, 55], "C"],
  ])("%s: %j → %s", (_, midis, expected) => {
    expect(name(midis)).toBe(expected);
  });

  it("names the same notes the same way in any order or octave", () => {
    expect(name([66, 47, 62])).toBe(name([47, 62, 66]));
  });

  it("says nothing for fewer than three pitch classes", () => {
    expect(name([48, 52])).toBe("");
    expect(name([48, 60, 72])).toBe("");
    expect(name([])).toBe("");
  });

  it("says nothing without Tonal (offline)", () => {
    expect(chordName([47, 62, 66], null)).toBe("");
  });

  // Known weaknesses. These are expected to fail; when one starts passing, it's been fixed: make it a normal test.
  it.fails("known issue: flat keys are spelled with sharps (B♭ major reads A♯)", () => {
    expect(name([46, 50, 53])).toBe("B♭");
  });
  it.fails("known issue: a passing note makes an exotic name (B/F♯ with an E reads D♯m♭6♭9/F♯)", () => {
    expect(name([54, 59, 63, 64])).not.toMatch(/♭6♭9/);
  });
});

describe("chordAt", () => {
  // Notes as parseMidi gives them; tracks as the app keeps them (on, mono).
  const n = (midi, start, dur) => ({ midi, start, dur });
  const voice = (notes, extra = {}) => ({ on: true, mono: true, notes, ...extra });
  const midis = set => [...set].map(x => x.midi).sort((a, b) => a - b);

  it("holds every note sounding at the beat", () => {
    const tracks = [voice([n(72, 0, 2)]), voice([n(64, 0, 1), n(65, 1, 1)]), voice([n(48, 0, 4)])];
    expect(midis(chordAt(tracks, 0.5))).toEqual([48, 64, 72]);
    expect(midis(chordAt(tracks, 1.5))).toEqual([48, 65, 72]);
  });

  it("bridges a short rest in a voice until its next note", () => {
    const tracks = [voice([n(60, 0, 0.5), n(62, 1, 0.5)])];
    expect(midis(chordAt(tracks, 0.75))).toEqual([60]);
  });

  it("but no more than a beat past the note's end", () => {
    const tracks = [voice([n(60, 0, 0.5), n(62, 4, 0.5)])];
    expect(midis(chordAt(tracks, 1.25))).toEqual([60]);
    expect(midis(chordAt(tracks, 1.75))).toEqual([]);
  });

  it("doesn't bridge rests in a voice that plays chords (not mono)", () => {
    const tracks = [voice([n(60, 0, 0.5), n(62, 1, 0.5)], { mono: false })];
    expect(midis(chordAt(tracks, 0.75))).toEqual([]);
  });

  it("counts a note from its very start", () => {
    expect(midis(chordAt([voice([n(60, 0, 1), n(62, 1, 1)])], 1))).toEqual([62]);
  });

  it("leaves out voices that are off, and the one it's told to skip", () => {
    const sung = voice([n(72, 0, 2)]);
    const tracks = [sung, voice([n(64, 0, 2)], { on: false }), voice([n(48, 0, 2)])];
    expect(midis(chordAt(tracks, 1, sung))).toEqual([48]);
    expect(midis(chordAt(tracks, 1))).toEqual([48, 72]);
  });

  it("finds long notes that started well before the beat", () => {
    expect(midis(chordAt([voice([n(36, 0, 15)])], 14))).toEqual([36]);
  });
});
