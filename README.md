# Badinerie in Motion

A scrolling piano roll for J. S. Bach's Orchestral Suite No. 2 in B minor, BWV 1067: all seven movements, from the Ouverture to the *Badinerie*. Watch the notes go by, hover any note to hear it, and drag or scroll to move through the piece.

It's a static site: `index.html` plus the MIDI files in `midi/`, with no build step. Serve it with any static host (GitHub Pages works), or locally with `npm run serve` or `python3 -m http.server`. Opening `index.html` straight from disk (`file://`) won't load the movements, because browsers block `fetch` there.

## The notes

The app ships with all seven movements, as MIDI files in `midi/`, from John Hamm's 1995 General MIDI sequence of the Orchestral Suites: Ouverture, Rondeau, Sarabande, Bourrée I & II, Polonaise & Double, Menuet and Badinerie. Each has five parts: flute, violin I, violin II, viola and cello (continuo). All repeats are played, and Hamm added a few ornaments of his own. Pick a movement from the tabs, or link to one directly with `#ouverture`, `#rondeau`, `#sarabande`, `#bourree`, `#polonaise`, `#menuet` or `#badinerie` (the fugue below has its own `#fugue`).

There's also a tab for the **Great Fugue** from the Fantasia and Fugue in G minor, BWV 542 (`midi/fugue.mid`, link `#fugue`). It comes from the [Mutopia Project](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=984)'s LilyPond engraving of the organ piece, so its voices are the two hands and the pedal, not the fugue's four voices. The source file also had octave-coupler tracks (the same notes again an octave up or down), which were left out. It plays on the app's bowed-string sound, not an organ. Only the Fugue is included, not the Fantasia.

Playback follows each file's tempo map (the Ouverture's fast section, the closing ritardandos) and time-signature changes. The speed slider scales all of it.

Each voice gets its own colour and its own sound (a breathy flute, or a bowed string). Click a voice chip to hide and mute it, or the ◎ next to it to put that voice in the spotlight: the others keep playing at about a third of the level and fade back in the picture.

You can load any other MIDI file with **Load MIDI…** or by dragging it onto the lane. Each track becomes a voice. Tracks that share a name and channel are merged, because some files split the repeats across separate tracks.

MIDI files rarely mark an upbeat. If the first note isn't on a barline, the app treats that bar as the pickup. Otherwise, if the piece ends on a short bar, it treats the missing part as the pickup. Either way, bar 1 of the Badinerie starts on the F♯ after the quarter-note pickup.

## Controls

- Hover a note to hear it, or click/tap it
- **Hold chord** (while paused): every note under the line sustains until the line leaves it, so you can hear the harmony. The readout names the chord (`Bm`, `F♯7`, `D/F♯`…) with [Tonal](https://github.com/tonaljs/tonal), preferring common triads and seventh chords over exotic readings; offline it shows just the notes. Drag the line itself, or drag the score under it. `←` `→` step from chord to chord, `Shift` + `←` `→` jump a bar. **Arpeggio** (or `A`) toggles a running arpeggio of the held chord, up and down, that follows the line; **Arp** sets its speed (2–16 notes per second)
- **Sing** (needs a microphone and headphones: the browser's echo cancellation is switched off, because it fades out held notes): pick a voice and the music plays on without it, starting a bar before its next note. Sing along in any octave: your pitch is drawn over the score, and notes you hit in time get a gold bar. Miss a note and the music stops on it, holds the harmony and plays the note for you, then carries on once you sing it (`Space` skips it). Notes too quick to sing at the current speed never stop it, so lower **Speed** to be asked for more. **Guide** plays your voice softly along with you. The tag counts notes sung in time (✓) and notes the music waited for. `H` plays the next note. Pitch comes from the microphone with the YIN method, and nothing is recorded or sent anywhere
- The **keyboard** under the lane lights up every note as it sounds, in its voice's colour. Press a key to play it (in the flute's sound, or the spotlit voice's), hold several for a chord, or slide along the keys for a glissando
- Two **guitar fretboards** under the keyboard show the same notes: one in standard tuning (E A D G B E), one tuned lower for the bass line (B standard by default, or A standard, or an octave down like a Bass VI). Both keep standard tuning's shape, so chord shapes carry over. Each note goes on one string, near where that voice's hand already is. Press or slide along any fret to play it
- `Space`: play/pause · `←` `→`: jump a bar · `Home`: back to the start
- The **overview strip** under the lane shows the whole movement; click or drag on it to jump. Gold flags mark big tempo or metre changes (like the Ouverture's fast fugue). **Go to bar** jumps to a bar number
- Speed, zoom, volume, loop, **reverb** amount and **space** (Room, Hall, Church) are in the control rail

## Code

No build step: the browser loads `src/main.js` as an ES module, and it imports the rest.

- `index.html`, `styles.css`: the page
- `src/main.js`: everything that touches the page, the canvas or Web Audio (being split up further)
- Pure logic, no DOM, each with unit tests:
  - `src/midi.js`: the MIDI reader, with bars and pickup detection
  - `src/time.js`: the tempo map (beats ↔ seconds), finding notes and bars
  - `src/chords.js`: which notes the held chord sustains, and the chord's name
  - `src/pitch.js`: pitch detection for Sing mode (YIN)
  - `src/fingering.js`: which string and fret each note goes on
  - `src/notes.js`: note names and lengths
  - `src/movements.js`: the pieces the app ships with

## Tests

`package.json` holds development tools only; the site itself doesn't need Node.

```sh
npm install
npx playwright install chromium   # once
npm test                          # everything
npm run test:unit                 # unit tests only (Vitest), in a second
npm run test:e2e                  # browser tests only (Playwright)
```

- **Unit tests** (`tests/unit/`) check the pure modules: the parser against all eight shipped files and against MIDI files built in memory for edge cases (`tests/unit/smf.js`), the tempo maths, chord names (with the real Tonal), pitch detection on synthesized voices, and guitar fingering. A few known weaknesses are written down as tests marked `it.fails`: when one starts passing, it's been fixed.
- **Browser tests** (`tests/e2e/`) drive the app the way a person would and check only what's on the page (readouts, buttons, pixels), so they keep passing however the code underneath is organised. Sing mode is tested with Chromium's fake microphone, fed with tones the tests generate (`tests/e2e/wav.js`). Tonal is served from `node_modules` during tests, so chord names don't depend on the network.

GitHub Actions runs everything on every pull request.
