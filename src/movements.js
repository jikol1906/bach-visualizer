// The pieces the app ships with, in midi/<slug>.mid. A piece from outside the suite (piece: true) brings its own
// byline, credit and source note.
export const MOVEMENTS = [
  { id: "OVERTURE", slug: "ouverture", title: "Ouverture",
    about: "A French overture. A slow, stately opening full of dotted rhythms leads into a fast fugal section where the flute often steps out as a soloist, and the slow music returns at the end." },
  { id: "RONDEAU", slug: "rondeau", title: "Rondeau",
    about: "A rondeau: the opening refrain keeps coming back, with contrasting episodes in between. The flute and the first violins share the tune." },
  { id: "SARABAND", slug: "sarabande", title: "Sarabande",
    about: "A slow sarabande in triple time. The top line and the bass move in canon: the cello repeats the melody a bar later, a twelfth lower." },
  { id: "BOURREE", slug: "bourree", title: "Bourrée I & II",
    about: "Two bourrées, quick dances in duple time. Bourrée II brings a contrast, and then Bourrée I is played again." },
  { id: "POLONAIS", slug: "polonaise", title: "Polonaise & Double",
    about: "A stately polonaise in triple time, followed by its Double: the polonaise tune moves down to the bass while the flute plays a fast, decorated line above it." },
  { id: "MENUET", slug: "menuet", title: "Menuet",
    about: "A short minuet in triple time, with the flute doubling the first violins." },
  { id: "BADINERI", slug: "badinerie", title: "Badinerie",
    about: "The last movement, a quick showpiece for the flute in 2/4 and in binary form. The A section (16 bars) ends in F♯ minor and the B section (24 bars) returns to B minor. Each half is repeated, and it opens with a quarter-note pickup." },
  { id: "FUGUE", slug: "fugue", title: "Great Fugue", piece: true,
    byline: "J. S. Bach · Fantasia and Fugue in G minor, BWV 542: the Fugue",
    credit: () => "Fugue in G minor, BWV 542 (Mutopia Project)",
    source: "The fugue comes from the Mutopia Project's LilyPond engraving of the organ work (piece 984). It is a plain organ-style MIDI, so the voices are the two hands and the pedal, not the fugue's four voices: each hand plays more than one line, and its lines share a colour. The organ's octave-coupler tracks were left out, since they only repeat the notes an octave away. The sound is the app's bowed strings, not an organ.",
    about: "The Great Fugue, an organ fugue with a long, running subject that enters alone in the right hand. The left hand answers it, and then the pedal takes it up in the bass. This is the fugue only; the Fantasia that precedes it isn't included." },
];
