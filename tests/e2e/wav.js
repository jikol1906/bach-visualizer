// Recordings for Chromium's fake microphone, written as 16-bit mono WAV files.
import { writeFileSync } from "node:fs";

const SR = 48000;

// parts: [{ seconds, hz }] played one after another; hz 0 (or missing) is silence. Chromium loops the file.
export function writeWav(path, parts) {
  const total = parts.reduce((a, p) => a + Math.round(p.seconds * SR), 0);
  const buf = Buffer.alloc(44 + total * 2);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + total * 2, 4); buf.write("WAVE", 8);
  buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write("data", 36); buf.writeUInt32LE(total * 2, 40);
  let i = 0;
  for (const p of parts) {
    const n = Math.round(p.seconds * SR);
    for (let k = 0; k < n; k++, i++) buf.writeInt16LE(p.hz ? Math.round(8000 * Math.sin(2 * Math.PI * p.hz * k / SR)) : 0, 44 + i * 2);
  }
  writeFileSync(path, buf);
  return path;
}

export const hz = midi => 440 * 2 ** ((midi - 69) / 12);
