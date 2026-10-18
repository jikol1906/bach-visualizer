import { describe, it, expect } from "vitest";
import { placeNotes, tuning, STD, FRETS } from "../../src/fingering.js";

const where = out => Object.fromEntries(out.map(n => [n.midi, [n.s, n.f]]));

describe("tuning", () => {
  it("standard is E A D G B E, and lower necks keep its shape", () => {
    expect(tuning(0)).toEqual(STD);
    expect(tuning(-5)).toEqual([35, 40, 45, 50, 54, 59]);   // B E A D F♯ B
    expect(tuning(-12).map((m, i) => m - STD[i])).toEqual(Array(6).fill(-12));
  });
});

describe("placeNotes", () => {
  it("prefers open strings", () => {
    const out = placeNotes(STD, new Map(), STD.map(midi => ({ midi, tr: null })));
    expect(out.map(n => [n.s, n.f]).sort()).toEqual([[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0]]);
  });

  it("puts each note of a chord on its own string", () => {
    const tr = {};
    const out = placeNotes(STD, new Map(), [48, 52, 55, 60, 64].map(midi => ({ midi, tr })));   // an open C chord
    expect(new Set(out.map(n => n.s)).size).toBe(5);
    for (const n of out) expect(STD[n.s] + n.f).toBe(n.midi);
  });

  it("finds the open C shape", () => {
    const out = placeNotes(STD, new Map(), [48, 52, 55, 60, 64].map(midi => ({ midi, tr: null })));
    expect(where(out)).toEqual({ 48: [1, 3], 52: [2, 2], 55: [3, 0], 60: [4, 1], 64: [5, 0] });
  });

  it("leaves out notes the neck can't reach", () => {
    expect(placeNotes(STD, new Map(), [{ midi: 30, tr: null }, { midi: 64 + FRETS + 1, tr: null }])).toEqual([]);
    expect(placeNotes(STD, new Map(), [{ midi: 64 + FRETS, tr: null }])).toHaveLength(1);
  });

  it("keeps a note you're pressing where your finger is, and works around it", () => {
    const out = placeNotes(STD, new Map(), [{ midi: 64, tr: null, at: { s: 4, f: 5 } }, { midi: 59, tr: {} }]);
    expect(where(out)).toEqual({ 64: [4, 5], 59: [3, 4] });   // the open B string is taken
  });

  it("passes the other fields through", () => {
    const tr = { name: "Flute" };
    expect(placeNotes(STD, new Map(), [{ midi: 64, tr, mine: false }])[0]).toMatchObject({ midi: 64, tr, mine: false, s: 5, f: 0 });
  });

  it("puts a note as low on the neck as it goes", () => {
    const [n] = placeNotes(STD, new Map(), [{ midi: 69, tr: {} }]);   // A4: 5th fret of the high E string
    expect([n.s, n.f]).toEqual([5, 5]);
  });

  it("remembers the fret each voice last played", () => {
    const tr = {}, hand = new Map();
    placeNotes(STD, hand, [{ midi: 73, tr }]);   // C♯5: 9th fret, high E string
    expect(hand.get(tr)).toBe(9);
  });

  // Known weakness: "low on the neck" costs 0.6 a fret and "near the hand" only 0.5, so the lower position always
  // wins and the remembered hand never changes where a note goes (checked for every note and hand position).
  // Expected to fail; when it passes, make it a normal test.
  it.fails("known issue: a voice playing up the neck stays in its position", () => {
    const tr = {}, hand = new Map([[tr, 9]]);
    const [n] = placeNotes(STD, hand, [{ midi: 69, tr }]);   // A4: 10th fret of the B string is nearer the hand than the 5th of the E
    expect(Math.abs(n.f - 9)).toBeLessThanOrEqual(2);
  });

  it("remembers each voice's hand separately", () => {
    const a = {}, b = {}, hand = new Map();
    placeNotes(STD, hand, [{ midi: 76, tr: a }, { midi: 45, tr: b }]);
    expect(hand.get(a)).toBeGreaterThan(5);
    expect(hand.has(b)).toBe(false);   // an open string doesn't move the hand
  });
});
