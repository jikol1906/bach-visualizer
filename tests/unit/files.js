import { readFileSync } from "node:fs";
import { parseMidi } from "../../src/midi.js";

// A shipped MIDI file, parsed.
export function load(slug) {
  const b = readFileSync(new URL(`../../midi/${slug}.mid`, import.meta.url));
  return parseMidi(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
}
