import { describe, it, expect } from "vitest";
import { noteName, wrap12, lenName, NAMES, BLACK } from "../../src/notes.js";

describe("notes", () => {
  it("names MIDI notes with their octave, middle C being C4", () => {
    expect(noteName(60)).toBe("C4");
    expect(noteName(61)).toBe("C♯4");
    expect(noteName(71)).toBe("B4");
    expect(noteName(21)).toBe("A0");
    expect(noteName(108)).toBe("C8");
  });

  it("knows the black keys", () => {
    expect(NAMES.filter((_, i) => BLACK.has(i))).toEqual(["C♯", "D♯", "F♯", "G♯", "A♯"]);
  });

  it("wrap12 is the distance to the nearest octave", () => {
    expect(wrap12(0)).toBe(0);
    expect(wrap12(12)).toBe(0);
    expect(wrap12(-24)).toBe(0);
    expect(wrap12(1)).toBe(1);
    expect(wrap12(11)).toBe(-1);
    expect(wrap12(-1)).toBe(-1);
    expect(wrap12(13.5)).toBeCloseTo(1.5);
    expect(Math.abs(wrap12(6))).toBe(6);
  });

  it("names note lengths, and falls back to beats", () => {
    expect(lenName(0.25)).toBe("sixteenth");
    expect(lenName(1.5)).toBe("dotted quarter");
    expect(lenName(0.26)).toBe("sixteenth");   // played MIDI is a little off
    expect(lenName(5)).toBe("5 beats");
    expect(lenName(0.7)).toBe("dotted eighth");   // rounded to the nearest 32nd first
    expect(lenName(0.6)).toBe("0.6 beats");
  });
});
