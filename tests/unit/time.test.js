import { describe, it, expect } from "vitest";
import { segAtBeat, secAt, beatAtSec, firstAtOrAfter, barIdx, barInfo } from "../../src/time.js";
import { load } from "./files.js";

// ♩ = 120 for 4 beats, ♩ = 60 for 2, then ♩ = 240.
const MAP = [{ beat: 0, bpm: 120, sec: 0 }, { beat: 4, bpm: 60, sec: 2 }, { beat: 6, bpm: 240, sec: 4 }];

describe("tempo map", () => {
  it("finds the tempo in force", () => {
    expect(segAtBeat(MAP, 0).bpm).toBe(120);
    expect(segAtBeat(MAP, 3.99).bpm).toBe(120);
    expect(segAtBeat(MAP, 4).bpm).toBe(60);
    expect(segAtBeat(MAP, 100).bpm).toBe(240);
  });

  it("converts beats to seconds across tempo changes", () => {
    expect(secAt(MAP, 0)).toBe(0);
    expect(secAt(MAP, 2)).toBe(1);
    expect(secAt(MAP, 5)).toBe(3);
    expect(secAt(MAP, 10)).toBe(5);
  });

  it("and back", () => {
    for (const t of [0, 0.5, 1.999, 2, 3.2, 4, 7.25]) expect(secAt(MAP, beatAtSec(MAP, t))).toBeCloseTo(t, 9);
  });

  it("before the first beat, extends the opening tempo", () => {
    expect(secAt(MAP, -1)).toBe(-0.5);
    expect(beatAtSec(MAP, -0.5)).toBe(-1);
  });

  it("round-trips every tempo change in the Ouverture", () => {
    const { tempoMap } = load("ouverture");
    for (const seg of tempoMap) for (const b of [seg.beat, seg.beat + 0.3]) expect(beatAtSec(tempoMap, secAt(tempoMap, b))).toBeCloseTo(b, 9);
  });
});

describe("finding notes and bars", () => {
  const notes = [0, 1, 1, 2.5, 4].map(start => ({ start }));

  it("firstAtOrAfter finds the first note starting at or after a beat", () => {
    expect(firstAtOrAfter(notes, -1)).toBe(0);
    expect(firstAtOrAfter(notes, 0)).toBe(0);
    expect(firstAtOrAfter(notes, 0.5)).toBe(1);
    expect(firstAtOrAfter(notes, 1)).toBe(1);
    expect(firstAtOrAfter(notes, 3)).toBe(4);
    expect(firstAtOrAfter(notes, 5)).toBe(5);
    expect(firstAtOrAfter([], 1)).toBe(0);
  });

  const bars = [
    { n: 0, start: 0, len: 1, unit: 1, pickup: true },
    { n: 1, start: 1, len: 3, unit: 1 },
    { n: 2, start: 4, len: 3, unit: 1 },
    { n: 3, start: 7, len: 1.5, unit: 0.5 },
  ];

  it("barIdx finds the bar a beat falls in", () => {
    expect(barIdx(bars, 0)).toBe(0);
    expect(barIdx(bars, 2)).toBe(1);
    expect(barIdx(bars, 6.9)).toBe(2);
    expect(barIdx(bars, 100)).toBe(3);
    expect(barIdx(bars, -5)).toBe(0);
  });

  it("with a 32nd of slack, since played notes land a little early", () => {
    expect(barIdx(bars, 3.95)).toBe(2);
    expect(barIdx(bars, 3.9)).toBe(1);
  });

  it("barInfo labels bars and counts beats in the bar's own unit", () => {
    expect(barInfo(bars, 0.5)).toEqual({ bar: 0, beat: 1.5, label: "pickup" });
    expect(barInfo(bars, 5)).toEqual({ bar: 2, beat: 2, label: "2" });
    expect(barInfo(bars, 7.5)).toEqual({ bar: 3, beat: 2, label: "3" });   // eighths
  });

  it("calls an empty lead-in bar –, not a pickup", () => {
    expect(barInfo([{ n: 0, start: 0, len: 4, unit: 1, pickup: false }, { n: 1, start: 4, len: 4, unit: 1 }], 1).label).toBe("–");
  });
});
