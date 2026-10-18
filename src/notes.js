// Pitch names and note lengths. MIDI note numbers throughout: 60 is middle C (C4).

export const NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
export const BLACK = new Set([1, 3, 6, 8, 10]);   // pitch classes of the black keys
export const noteName = m => NAMES[m % 12] + (Math.floor(m / 12) - 1);   // 61 → "C♯4"

// Distance from x to the nearest octave of 0, in semitones (-6 to 6): how far a pitch is from a note in any octave.
export const wrap12 = x => (((x + 6) % 12) + 12) % 12 - 6;

// A length in quarter-note beats, by name.
const LEN = { 0.125: "thirty-second", 0.25: "sixteenth", 0.375: "dotted sixteenth", 0.5: "eighth", 0.75: "dotted eighth", 1: "quarter", 1.5: "dotted quarter", 2: "half", 3: "dotted half", 4: "whole" };
export const lenName = d => LEN[Math.round(d * 8) / 8] || `${Math.round(d * 100) / 100} beats`;
