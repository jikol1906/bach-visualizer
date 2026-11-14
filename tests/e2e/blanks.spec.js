// Fill in the blanks, on a piece of the test's own: C E G C G E, a beat each at ♩ = 120, after two beats' rest.
// Every note is a leap, so with Blanks on All every one of them goes missing.
import { test, expect, open } from "./fixtures.js";

const TUNE = [60, 64, 67, 72, 67, 64];
function tune() {
  const ev = [0x00, 0xff, 0x51, 0x03, 0x07, 0xa1, 0x20];
  TUNE.forEach((m, i) => ev.push(...(i ? [0x00] : [0x87, 0x40]), 0x90, m, 100, 0x83, 0x60, 0x80, m, 64));
  ev.push(0x00, 0xff, 0x2f, 0x00);
  const head = [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, 0x01, 0xe0, 0x4d, 0x54, 0x72, 0x6b, 0, 0, ev.length >> 8, ev.length & 255];
  return Buffer.from([...head, ...ev]);
}

// The slider holds every note name once, in an octave that starts somewhere new for each blank.
const PC = { C: 0, D: 2, E: 4, G: 7 };
const centre = async (page, key) => {
  const box = await page.locator(`#guess .step[data-pc="${PC[key]}"]`).boundingBox();
  return [box.x + box.width / 2, box.y + box.height / 2];
};
// A tap on a note: pressing and letting go there is the guess.
async function press(page, key) {
  await page.mouse.click(...await centre(page, key));
}
const waiting = page => expect(page.locator("#blankTag")).toHaveClass(/waiting/, { timeout: 5000 });

async function start(page) {
  await open(page);
  await page.setInputFiles("#midi", { name: "tune.mid", mimeType: "audio/midi", buffer: tune() });
  await expect(page.locator("#mvTitle")).toHaveText("tune");
  await page.click("#blank");
  await page.selectOption("#blankHow", "all");
}

test("Fill in shows the slider and its options, and switches off again", async ({ page }) => {
  await open(page);
  await expect(page.locator("#blankHow")).toBeHidden();
  await expect(page.locator("#guess")).toBeHidden();
  await page.click("#blank");
  await expect(page.locator("#blank")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#guess")).toBeVisible();
  await expect(page.locator("#piano")).toBeHidden();   // the answers go on the slider now
  await expect(page.locator("#blankHow")).toBeVisible();
  await expect(page.locator("#singVoice")).toBeVisible();
  await expect(page.locator("#blankTag")).toBeVisible();
  await expect(page.locator("#blankCount")).toHaveText(/✓ 0 · ✗ 0 · \d+ to go/);
  await page.click("#hold");   // the modes exclude each other
  await expect(page.locator("#blank")).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("#guess")).toBeHidden();
  await expect(page.locator("#blankTag")).toBeHidden();
});

test("the music waits on each blank until its note is played, and a full run ends on a result", async ({ page }) => {
  await start(page);
  await expect(page.locator("#blankCount")).toHaveText("✓ 0 · ✗ 0 · 6 to go");
  await waiting(page);
  await expect(page.locator("#blankLabel")).toHaveText("Which note?");
  await expect(page.locator("#play")).toHaveText("Play");
  await expect(page.locator("#rdNote")).toHaveText("–");   // the readout doesn't give it away
  await press(page, "C");
  await expect(page.locator("#blankCount")).toHaveText("✓ 1 · ✗ 0 · 5 to go");
  // A wrong note is noted and the music keeps waiting; the right one then moves on, but it's no first try.
  await waiting(page);
  await press(page, "D");
  await expect(page.locator("#blankTried")).toHaveText("✗ D");
  await expect(page.locator('#guess .step[data-pc="2"]')).toHaveClass(/wrong/);
  await expect(page.locator("#blankCount")).toHaveText("✓ 1 · ✗ 1 · 5 to go");
  await press(page, "E");
  await expect(page.locator("#blankCount")).toHaveText("✓ 1 · ✗ 1 · 4 to go");
  // Space gives the note away.
  await waiting(page);
  await page.keyboard.press("Space");
  await expect(page.locator("#blankCount")).toHaveText("✓ 1 · ✗ 2 · 3 to go");
  for (const [key, left] of [["C", 2], ["G", 1], ["E", 0]]) {
    await waiting(page);
    await press(page, key);
    await expect(page.locator("#blankCount")).toContainText(`${left} to go`);
  }
  await expect(page.locator("#result")).toBeVisible({ timeout: 8000 });
  await expect(page.locator("#resWhat")).toHaveText("tune · Track 1");
  await expect(page.locator("#resPct")).toHaveText("66%");
  await expect(page.locator("#resUnit")).toHaveText("first try");
  await expect(page.locator("#resStars")).toHaveAttribute("aria-label", "1 of 3 stars");
  await expect(page.locator("#resDetail")).toHaveText("4 of 6 blanks · 3 in a row");
  await expect(page.locator("#resBest")).toContainText("First full run");
  await page.click("#resDone");
  await expect(page.locator("#blank")).toHaveAttribute("aria-pressed", "false");
});

test("three wrong notes give the note away", async ({ page }) => {
  await start(page);
  await waiting(page);
  await press(page, "D"); await press(page, "E"); await press(page, "G");
  await expect(page.locator("#blankCount")).toHaveText("✓ 0 · ✗ 1 · 5 to go");
  await expect(page.locator("#blankTried")).toHaveText("");
});

test("sliding only listens: the guess is where the slider is let go", async ({ page }) => {
  await start(page);
  await waiting(page);
  await expect(page.locator("#guess .step")).toHaveCount(12);
  // Down on D, across E, and up on C, the right note: nothing on the way counts as a guess.
  await page.mouse.move(...await centre(page, "D"));
  await page.mouse.down();
  await expect(page.locator("#guess")).toHaveAttribute("aria-valuetext", "D");
  await page.mouse.move(...await centre(page, "E"));
  await expect(page.locator("#guess")).toHaveAttribute("aria-valuetext", "E");
  await expect(page.locator("#blankCount")).toHaveText("✓ 0 · ✗ 0 · 6 to go");
  await page.mouse.move(...await centre(page, "C"));
  await page.mouse.up();
  await expect(page.locator("#blankCount")).toHaveText("✓ 1 · ✗ 0 · 5 to go");
  // With a keyboard: the arrows move and sound the notes, Enter is the guess.
  await waiting(page);
  await page.locator("#guess").focus();
  for (let i = 0; i < 12 && (await page.locator("#guess").getAttribute("aria-valuetext")) !== "E"; i++) await page.keyboard.press("ArrowRight");
  await expect(page.locator("#blankCount")).toHaveText("✓ 1 · ✗ 0 · 5 to go");
  await page.keyboard.press("Enter");
  await expect(page.locator("#blankCount")).toHaveText("✓ 2 · ✗ 0 · 4 to go");
});

// C, then a chord (E with the E an octave below it, and G), then C and G: a beat each, after two beats' rest.
function chordTune() {
  const ev = [0x00, 0xff, 0x51, 0x03, 0x07, 0xa1, 0x20];
  [[60], [52, 64, 67], [72], [67]].forEach((ms, i) => {
    ms.forEach((m, k) => ev.push(...(k || i ? [0x00] : [0x87, 0x40]), 0x90, m, 100));
    ms.forEach((m, k) => ev.push(...(k ? [0x00] : [0x83, 0x60]), 0x80, m, 64));
  });
  ev.push(0x00, 0xff, 0x2f, 0x00);
  const head = [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, 0x01, 0xe0, 0x4d, 0x54, 0x72, 0x6b, 0, 0, ev.length >> 8, ev.length & 255];
  return Buffer.from([...head, ...ev]);
}

test("a chord in the voice is asked for note by note, lowest first", async ({ page }) => {
  await open(page);
  await page.setInputFiles("#midi", { name: "chord.mid", mimeType: "audio/midi", buffer: chordTune() });
  await expect(page.locator("#mvTitle")).toHaveText("chord");
  await page.click("#blank");
  await page.selectOption("#blankHow", "all");
  // Five blanks: the two E's of the chord are one.
  await expect(page.locator("#blankCount")).toHaveText("✓ 0 · ✗ 0 · 5 to go");
  await waiting(page);
  await expect(page.locator("#blankLabel")).toHaveText("Which note?");
  await press(page, "C");
  await waiting(page);
  await expect(page.locator("#blankLabel")).toHaveText("Which note? 1/2, lowest first");
  // G is in the chord, but E comes first.
  await press(page, "G");
  await expect(page.locator("#blankTried")).toHaveText("✗ G");
  await press(page, "E");
  // The music stays where it is for the rest of the chord.
  await expect(page.locator("#blankLabel")).toHaveText("Which note? 2/2, lowest first");
  await expect(page.locator("#blankCount")).toHaveText("✓ 1 · ✗ 1 · 3 to go");
  await expect(page.locator("#blankTag")).toHaveClass(/waiting/);
  await expect(page.locator("#play")).toHaveText("Play");
  await press(page, "G");
  await expect(page.locator("#blankCount")).toHaveText("✓ 2 · ✗ 1 · 2 to go");
  await waiting(page);
  await expect(page.locator("#blankLabel")).toHaveText("Which note?");
});
