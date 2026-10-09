# Badinerie in Motion

A scrolling piano roll for J. S. Bach's *Badinerie* (Orchestral Suite No. 2 in B minor, BWV 1067). Watch the notes go by, hover any note to hear it, and drag or scroll to move through the piece.

It's one static file, `index.html`. Open it in a browser, or serve it with any static host (GitHub Pages works).

## The notes

The app ships with all five parts of the Badinerie, embedded as a MIDI file: flute, violin I, violin II, viola and cello (continuo). They come from John Hamm's 1995 General MIDI sequence of the Orchestral Suites. All repeats are played, and Hamm added a few ornaments of his own.

Each voice gets its own colour and its own sound (a breathy flute, or a bowed string). Click a voice chip to hide and mute it.

You can load any other MIDI file with **Load MIDI…** or by dragging it onto the lane. Each track becomes a voice. Tracks that share a name and channel are merged, because some files split the repeats across separate tracks.

MIDI files rarely mark an upbeat. If the first note isn't on a barline, the app treats that bar as the pickup. Otherwise, if the piece ends on a short bar, it treats the missing part as the pickup. Either way, bar 1 of the Badinerie starts on the F♯ after the quarter-note pickup.

## Controls

- Hover a note to hear it, or click/tap it
- **Hold chord** (while paused): every note under the line sustains until the line leaves it, so you can hear the harmony. Drag the line itself, or drag the score under it. `←` `→` step from chord to chord, `Shift` + `←` `→` jump a bar
- `Space`: play/pause · `←` `→`: jump a bar · `Home`: back to the start
- Tempo, zoom, volume and loop are in the control rail
