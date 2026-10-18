import { describe, it, expect } from "vitest";
import { detectPitch } from "../../src/pitch.js";

const SR = 48000, N = 2048;   // the app's analyser: 2048 samples at the context's rate
const semis = (f, ref) => 12 * Math.log2(f / ref);

// N samples of a tone: harmonics [amplitude of the fundamental, the 2nd, ...], with optional vibrato and noise.
function tone(hz, { harmonics = [1], level = 0.3, vibrato = 0, noise = 0, sr = SR, seed = 1 } = {}) {
  let r = seed;
  const rand = () => ((r = (r * 16807) % 2147483647) / 2147483647) * 2 - 1;
  const x = new Float32Array(N);
  let ph = 0;
  for (let i = 0; i < N; i++) {
    const f = hz * 2 ** (vibrato * Math.sin(2 * Math.PI * 5.5 * i / sr) / 12);
    ph += 2 * Math.PI * f / sr;
    let s = 0;
    harmonics.forEach((a, k) => { s += a * Math.sin((k + 1) * ph); });
    x[i] = level * s / harmonics.reduce((a, b) => a + b, 0) + noise * rand();
  }
  return x;
}

describe("detectPitch", () => {
  it.each([82.41, 110, 196, 246.94, 440, 523.25, 880, 1046.5])("hears a %f Hz sine within 5 cents", hz => {
    expect(Math.abs(semis(detectPitch(tone(hz), SR), hz))).toBeLessThan(0.05);
  });

  it("at 44.1 kHz too", () => {
    expect(Math.abs(semis(detectPitch(tone(440, { sr: 44100 }), 44100), 440))).toBeLessThan(0.05);
  });

  it("hears a sung vowel by its fundamental, even when an overtone is louder", () => {
    const voice = tone(246.94, { harmonics: [0.5, 1, 0.7, 0.5, 0.35, 0.25, 0.15, 0.1], noise: 0.005 });
    expect(Math.abs(semis(detectPitch(voice, SR), 246.94))).toBeLessThan(0.3);
  });

  it("follows vibrato to within a third of a semitone", () => {
    expect(Math.abs(semis(detectPitch(tone(330, { vibrato: 0.3 }), SR), 330))).toBeLessThan(0.35);
  });

  it("hears a breathy voice through some noise", () => {
    expect(Math.abs(semis(detectPitch(tone(220, { noise: 0.05 }), SR), 220))).toBeLessThan(0.2);
  });

  it("hears nothing in silence, in very quiet sound, or in noise", () => {
    expect(detectPitch(new Float32Array(N), SR)).toBe(0);
    expect(detectPitch(tone(440, { level: 0.002 }), SR)).toBe(0);
    expect(detectPitch(tone(440, { level: 0, noise: 0.2 }), SR)).toBe(0);
  });

  it("can reuse a scratch buffer", () => {
    const d = new Float32Array(N);
    expect(detectPitch(tone(440), SR, d)).toBeCloseTo(detectPitch(tone(440), SR), 6);
    expect(Math.abs(semis(detectPitch(tone(220), SR, d), 220))).toBeLessThan(0.05);
  });
});
