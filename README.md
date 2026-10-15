# Badinerie in Motion

A scrolling piano roll for J. S. Bach's Orchestral Suite No. 2 in B minor, BWV 1067: all seven movements, from the Ouverture to the *Badinerie*. Watch the notes go by, hover any note to hear it, and drag or scroll to move through the piece.

It's a static site: `index.html` plus the MIDI files in `midi/`. Serve it with any static host (GitHub Pages works), or locally with `python3 -m http.server`. Opening `index.html` straight from disk (`file://`) won't load the movements, because browsers block `fetch` there.

## The notes

The app ships with all seven movements, as MIDI files in `midi/`, from John Hamm's 1995 General MIDI sequence of the Orchestral Suites: Ouverture, Rondeau, Sarabande, Bourrée I & II, Polonaise & Double, Menuet and Badinerie. Each has five parts: flute, violin I, violin II, viola and cello (continuo). All repeats are played, and Hamm added a few ornaments of his own. Pick a movement from the tabs, or link to one directly with `#ouverture`, `#rondeau`, `#sarabande`, `#bourree`, `#polonaise`, `#menuet` or `#badinerie`.

Playback follows each file's tempo map (the Ouverture's fast section, the closing ritardandos) and time-signature changes. The speed slider scales all of it.

Each voice gets its own colour and its own sound (a breathy flute, or a bowed string). Click a voice chip to hide and mute it, or the ◎ next to it to put that voice in the spotlight: the others keep playing at about a third of the level and fade back in the picture.

You can load any other MIDI file with **Load MIDI…** or by dragging it onto the lane. Each track becomes a voice. Tracks that share a name and channel are merged, because some files split the repeats across separate tracks.

MIDI files rarely mark an upbeat. If the first note isn't on a barline, the app treats that bar as the pickup. Otherwise, if the piece ends on a short bar, it treats the missing part as the pickup. Either way, bar 1 of the Badinerie starts on the F♯ after the quarter-note pickup.

## Controls

- Hover a note to hear it, or click/tap it
- **Hold chord** (while paused): every note under the line sustains until the line leaves it, so you can hear the harmony. The readout names the chord (`Bm`, `F♯7`, `D/F♯`…) with [Tonal](https://github.com/tonaljs/tonal), preferring common triads and seventh chords over exotic readings; offline it shows just the notes. Drag the line itself, or drag the score under it. `←` `→` step from chord to chord, `Shift` + `←` `→` jump a bar. **Arpeggio** (or `A`) toggles a running arpeggio of the held chord, up and down, that follows the line; **Arp** sets its speed (2–16 notes per second)
- The **keyboard** under the lane lights up every note as it sounds, in its voice's colour. Press a key to play it (in the flute's sound, or the spotlit voice's), hold several for a chord, or slide along the keys for a glissando
- `Space`: play/pause · `←` `→`: jump a bar · `Home`: back to the start
- The **overview strip** under the lane shows the whole movement; click or drag on it to jump. Gold flags mark big tempo or metre changes (like the Ouverture's fast fugue). **Go to bar** jumps to a bar number
- Speed, zoom, volume, loop, **reverb** amount and **space** (Room, Hall, Church) are in the control rail
