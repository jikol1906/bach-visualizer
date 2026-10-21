// Characterization tests: what the app does today, checked only through what a user can see (text, buttons,
// pixels), never through its internals, so they keep passing while the code is reorganised underneath.
import { test, expect, open, text } from "./fixtures.js";

const MOVEMENTS = [
  { slug: "ouverture", title: "Ouverture", sig: "4/4", bpm: "76", bar: "–" },
  { slug: "rondeau", title: "Rondeau", sig: "4/4", bpm: "156", bar: "pickup" },
  { slug: "sarabande", title: "Sarabande", sig: "3/4", bpm: "76", bar: "pickup" },
  { slug: "bourree", title: "Bourrée I & II", sig: "4/4", bpm: "216", bar: "pickup" },
  { slug: "polonaise", title: "Polonaise & Double", sig: "3/4", bpm: "56", bar: "pickup" },
  { slug: "menuet", title: "Menuet", sig: "3/4", bpm: "108", bar: "pickup" },
  { slug: "badinerie", title: "Badinerie", sig: "2/4", bpm: "120", bar: "pickup" },
  { slug: "fugue", title: "Great Fugue", sig: "4/4", bpm: "80", bar: "pickup", voices: ["Right hand", "Left hand", "Pedal"] },
];
const SUITE_VOICES = ["Flute", "Violin1", "Violin2", "Viola", "Cello"];

async function goToBar(page, n) {
  await page.fill("#goBar", String(n));
  await page.press("#goBar", "Enter");
}

// How many pixels of a canvas differ from its top-left corner: a cheap "something was drawn".
const inked = (page, id) => page.locator("#" + id).evaluate(cv => {
  const c = cv.getContext("2d"), { data } = c.getImageData(0, 0, cv.width, cv.height);
  let n = 0;
  for (let i = 0; i < data.length; i += 16) if (data[i] !== data[0] || data[i + 1] !== data[1] || data[i + 2] !== data[2]) n++;
  return n;
});
const snapshot = (page, id) => page.locator("#" + id).evaluate(cv => cv.toDataURL());

test.describe("movements", () => {
  test("opens on the Badinerie by default", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#mvTitle")).toHaveText("Badinerie");
    await expect(page.locator("#voices .chip")).toHaveText(SUITE_VOICES);
    await expect(page.locator("#movements button[aria-current=true]")).toHaveText(/Badinerie/);
  });

  for (const mv of MOVEMENTS) {
    test(`#${mv.slug} opens ${mv.title}`, async ({ page }) => {
      await open(page, mv.slug);
      await expect(page.locator("#mvTitle")).toHaveText(mv.title);
      await expect(page.locator("#voices .chip")).toHaveText(mv.voices || SUITE_VOICES);
      await expect(page.locator("#pieceNote")).toContainText(`The file is in ${mv.sig}.`);
      await expect(page.locator("#rdBpm")).toHaveText(mv.bpm);
      await expect(page.locator("#rdBar")).toHaveText(mv.bar);
      await expect(page.locator("#srcErr")).toHaveText("");
    });
  }

  test("the tabs switch movements and update the link", async ({ page }) => {
    await open(page, "badinerie");
    await page.locator("#movements button", { hasText: "Menuet" }).click();
    await expect(page.locator("#mvTitle")).toHaveText("Menuet");
    await expect(page).toHaveURL(/#menuet$/);
    await page.locator("#movements button", { hasText: "Great Fugue" }).click();
    await expect(page.locator("#voices .chip")).toHaveText(["Right hand", "Left hand", "Pedal"]);
    await expect(page.locator("#byline")).toContainText("BWV 542");
    await expect(page.locator("#srcName")).toHaveText("Fugue in G minor, BWV 542 (Mutopia Project)");
  });
});

test.describe("transport", () => {
  test("Space plays and pauses, and the bar counter moves", async ({ page }) => {
    await open(page);
    await expect(page.locator("#play")).toHaveText("Play");
    await page.keyboard.press("Space");
    await expect(page.locator("#play")).toHaveText("Pause");
    await expect(page.locator("#rdBar")).toHaveText("2", { timeout: 5000 });   // one 2/4 bar a second at ♩ = 120
    await expect(page.locator("#rdNote")).not.toHaveText("–");
    await page.keyboard.press("Space");
    await expect(page.locator("#play")).toHaveText("Play");
    const bar = await text(page, "rdBar");
    await page.waitForTimeout(1200);
    await expect(page.locator("#rdBar")).toHaveText(bar);
  });

  test("the Play button plays and pauses too", async ({ page }) => {
    await open(page);
    await page.click("#play");
    await expect(page.locator("#play")).toHaveText("Pause");
    await page.click("#play");
    await expect(page.locator("#play")).toHaveText("Play");
  });

  test("the arrows jump a bar, Home goes back to the start", async ({ page }) => {
    await open(page);
    await page.keyboard.press("ArrowRight");
    await expect(page.locator("#rdBar")).toHaveText("1");
    await page.keyboard.press("ArrowRight");
    await expect(page.locator("#rdBar")).toHaveText("2");
    await page.keyboard.press("ArrowLeft");
    await expect(page.locator("#rdBar")).toHaveText("1");
    await page.keyboard.press("Home");
    await expect(page.locator("#rdBar")).toHaveText("pickup");
  });

  test("−1 bar, −5 bars and Restart", async ({ page }) => {
    await open(page);
    await goToBar(page, 10);
    await page.click("#back1");
    await expect(page.locator("#rdBar")).toHaveText("9");
    await page.click("#back5");
    await expect(page.locator("#rdBar")).toHaveText("4");
    await page.click("#restart");
    await expect(page.locator("#rdBar")).toHaveText("pickup");
  });

  test("Go to bar jumps there and ignores bars that don't exist", async ({ page }) => {
    await open(page);
    await goToBar(page, 12);
    await expect(page.locator("#rdBar")).toHaveText("12");
    await goToBar(page, 999);
    await expect(page.locator("#goBar")).toHaveValue("");
    await expect(page.locator("#rdBar")).toHaveText("12");
  });

  test("the speed slider shows its value", async ({ page }) => {
    await open(page);
    await page.locator("#tempo").fill("50");
    await expect(page.locator("#tempoOut")).toHaveText("50%");
  });
});

test.describe("drawing", () => {
  test("the lane and the overview are drawn, and the lane scrolls while playing", async ({ page }) => {
    await open(page);
    await expect.poll(() => inked(page, "cv")).toBeGreaterThan(1000);
    await expect.poll(() => inked(page, "mini")).toBeGreaterThan(200);
    const before = await snapshot(page, "cv");
    await page.click("#play");
    await expect.poll(() => snapshot(page, "cv")).not.toBe(before);
  });

  test("dragging the lane moves through the piece", async ({ page }) => {
    await open(page);
    const box = await page.locator("#cv").boundingBox();
    const y = box.y + box.height / 2;
    await page.mouse.move(box.x + box.width * 0.8, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.2, y, { steps: 8 });
    await page.mouse.up();
    await expect(page.locator("#rdBar")).not.toHaveText("pickup");
  });

  test("Piano and Guitar show their instruments, and the choice is remembered", async ({ page }) => {
    await open(page);
    await expect(page.locator("#piano")).toBeHidden();
    await page.click("#showPiano");
    await page.click("#showGuitar");
    await expect(page.locator("#piano")).toBeVisible();
    await expect(page.locator("#guitar")).toBeVisible();
    await expect.poll(() => inked(page, "piano")).toBeGreaterThan(100);
    await expect.poll(() => inked(page, "fret0")).toBeGreaterThan(100);
    await page.reload();
    await expect(page.locator("#piano")).toBeVisible();
    await expect(page.locator("#showGuitar")).toHaveAttribute("aria-pressed", "true");
    await page.click("#showPiano");
    await expect(page.locator("#piano")).toBeHidden();
  });

  test("the lit keys follow the music", async ({ page }) => {
    await open(page);
    await page.click("#showPiano");
    await goToBar(page, 1);
    await page.click("#hold");
    const lit = await snapshot(page, "piano");
    await goToBar(page, 2);
    await expect.poll(() => snapshot(page, "piano")).not.toBe(lit);
  });
});

test.describe("voices", () => {
  test("a chip hides its voice, but the last one stays on", async ({ page }) => {
    await open(page);
    const chips = page.locator("#voices .chip");
    for (let i = 1; i < 5; i++) {
      await chips.nth(i).click();
      await expect(chips.nth(i)).toHaveAttribute("aria-pressed", "false");
    }
    await chips.nth(0).click();
    await expect(chips.nth(0)).toHaveAttribute("aria-pressed", "true");
    await chips.nth(3).click();
    await expect(chips.nth(3)).toHaveAttribute("aria-pressed", "true");
  });

  test("spotlight: several voices, cleared in one go, and the readout follows the first", async ({ page }) => {
    await open(page);
    const spots = page.locator("#voices .spot");
    await expect(page.locator("#clearSpot")).toBeHidden();
    await spots.nth(4).click();
    await expect(page.locator("#rdLeadName")).toHaveText("Cello");
    await spots.nth(1).click();
    await expect(page.locator("#rdLeadName")).toHaveText("Violin1");
    await expect(spots.nth(1)).toHaveAttribute("aria-pressed", "true");
    await page.click("#clearSpot");
    await expect(page.locator("#clearSpot")).toBeHidden();
    await expect(page.locator("#rdLeadName")).toHaveText("Flute");
    await expect(spots.nth(1)).toHaveAttribute("aria-pressed", "false");
  });

  test("spotlighting a hidden voice turns it back on", async ({ page }) => {
    await open(page);
    await page.locator("#voices .chip").nth(2).click();
    await page.locator("#voices .spot").nth(2).click();
    await expect(page.locator("#voices .chip").nth(2)).toHaveAttribute("aria-pressed", "true");
  });
});

test.describe("hold chord", () => {
  test("names the chord under the line, bar by bar", async ({ page }) => {
    await open(page);
    await expect(page.locator("#rdChordBox")).toBeHidden();
    await expect(page.locator("#arp")).toBeDisabled();
    await page.click("#hold");
    await expect(page.locator("#hold")).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#rdChordBox")).toBeVisible();
    await goToBar(page, 1);
    await expect(page.locator("#rdChord")).toHaveText("D3 B4 D5 F♯5 F♯5");
    await expect(page.locator("#rdChordName")).toHaveText("Bm/D");
    await goToBar(page, 2);
    await expect(page.locator("#rdChord")).toHaveText("B3 D4 F♯4 B4 B4");
    await expect(page.locator("#rdChordName")).toHaveText("Bm");
  });

  test("turning it on pauses, and the arrows step from note to note", async ({ page }) => {
    await open(page);
    await page.click("#play");
    await page.click("#hold");
    await expect(page.locator("#play")).toHaveText("Play");
    await goToBar(page, 5);
    const chord = await text(page, "rdChord");
    await page.keyboard.press("ArrowRight");
    await expect(page.locator("#rdChord")).not.toHaveText(chord);
    await expect(page.locator("#rdBar")).toHaveText("5");   // a step, not a bar
    await page.keyboard.press("ArrowLeft");
    await expect(page.locator("#rdChord")).toHaveText(chord);
  });

  test("Arpeggio, by button or A, only while holding", async ({ page }) => {
    await open(page);
    await page.keyboard.press("a");
    await expect(page.locator("#arp")).toHaveAttribute("aria-pressed", "false");
    await page.click("#hold");
    await expect(page.locator("#arp")).toBeEnabled();
    await page.keyboard.press("a");
    await expect(page.locator("#arp")).toHaveAttribute("aria-pressed", "true");
    await page.click("#arp");
    await expect(page.locator("#arp")).toHaveAttribute("aria-pressed", "false");
    await page.click("#arp");
    await page.click("#hold");   // switching Hold off stops the arpeggio
    await expect(page.locator("#arp")).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator("#arp")).toBeDisabled();
    await expect(page.locator("#rdChordBox")).toBeHidden();
  });

  test("every Sound plays and holds a chord, and the choice is remembered", async ({ page }) => {
    await open(page);
    await expect(page.locator("#sound")).toHaveValue("orchestra");
    await page.click("#hold");
    for (const s of ["organ", "harpsichord", "epiano", "chip", "pad", "orchestra", "organ"]) {
      await page.selectOption("#sound", s);
      await goToBar(page, 2);
      await expect(page.locator("#rdChordName")).toHaveText("Bm");
      await page.click("#hold");
      await page.click("#play");
      await page.waitForTimeout(300);
      await page.click("#play");
      await page.click("#hold");
    }
    await page.reload();
    await expect(page.locator("#sound")).toHaveValue("organ");
  });

  test("the Arp and Reverb sliders show their values", async ({ page }) => {
    await open(page);
    await page.locator("#arpRate").fill("10");
    await expect(page.locator("#arpOut")).toHaveText("10/s");
    await page.locator("#rev").fill("80");
    await expect(page.locator("#revOut")).toHaveText("80%");
  });
});

test.describe("your own MIDI files", () => {
  test("Load MIDI opens a file as a piece of its own", async ({ page }) => {
    await open(page);
    await page.setInputFiles("#midi", "midi/menuet.mid");
    await expect(page.locator("#mvTitle")).toHaveText("menuet");
    await expect(page.locator("#pieceNote")).toContainText("Your own file, in 3/4.");
    await expect(page.locator("#srcName")).toHaveText("menuet.mid");
    await expect(page.locator("#movements button[aria-current=true]")).toHaveCount(0);
    await expect(page.locator("#voices .chip")).toHaveText(SUITE_VOICES);
  });

  test("a file that isn't MIDI shows an error and keeps the piece", async ({ page }) => {
    await open(page);
    await page.setInputFiles("#midi", { name: "notes.mid", mimeType: "audio/midi", buffer: Buffer.from("this is not a midi file") });
    await expect(page.locator("#srcErr")).toHaveText("This doesn't look like a MIDI file.");
    await expect(page.locator("#mvTitle")).toHaveText("Badinerie");
  });
});
