// Sing mode, with Chromium's fake microphone playing a recording made for each test. The Menuet's flute
// opens on B (the pickup), then C♯.
import { test as base, expect, chromium } from "@playwright/test";
import { preparePage } from "./fixtures.js";
import { writeWav, hz } from "./wav.js";

const B4 = hz(71);

// A page on the Menuet whose microphone hears `mic` (see writeWav). It's a list, so it's passed as { mic: { parts } }:
// test.use() would take a bare array for [value, options].
const test = base.extend({
  mic: [{ parts: [{ seconds: 1 }] }, { option: true }],
  page: async ({ mic, baseURL }, use, testInfo) => {
    const wav = writeWav(testInfo.outputPath("mic.wav"), mic.parts);
    const browser = await chromium.launch({ args: [
      "--autoplay-policy=no-user-gesture-required", "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream",
      `--use-file-for-fake-audio-capture=${wav}`,
    ] });
    const page = await browser.newPage({ baseURL, viewport: { width: 1280, height: 900 } });
    const errors = await preparePage(page);
    await page.goto("/#menuet");
    await expect(page.locator("#voices .chip").first()).toBeVisible();
    await use(page);
    await browser.close();
    expect(errors, "errors in the page").toEqual([]);
  },
});

const tag = page => page.locator("#singTag");

test.describe("with silence", () => {
  test.use({ mic: { parts: [{ seconds: 2 }] } });

  test("Sing starts the music and stops on the first note it doesn't hear", async ({ page }) => {
    await expect(tag(page)).toBeHidden();
    await page.click("#sing");
    await expect(page.locator("#sing")).toHaveAttribute("aria-pressed", "true");
    await expect(tag(page)).toBeVisible();
    await expect(tag(page)).toHaveClass(/waiting/, { timeout: 5000 });
    await expect(page.locator("#singLabel")).toHaveText("Sing");
    await expect(page.locator("#singTarget")).toHaveText("B");
    await expect(page.locator("#singHeard")).toHaveText("–");
    await expect(page.locator("#singCount")).toHaveText("✓ 0 · waited 0");
    await expect(page.locator("#play")).toHaveText("Play");
    // While it waits, the harmony under the line is held (the flute, being sung, is left out of it).
    await expect(page.locator("#rdBar")).toHaveText("pickup");
  });

  test("Space skips the note it's waiting on", async ({ page }) => {
    await page.click("#sing");
    await expect(tag(page)).toHaveClass(/waiting/, { timeout: 5000 });
    await page.keyboard.press("Space");
    await expect(page.locator("#singTarget")).toHaveText("C♯", { timeout: 5000 });
  });

  test("switching Sing off hides the tag, and Hold chord switches it off", async ({ page }) => {
    await page.click("#sing");
    await expect(tag(page)).toBeVisible();
    await page.click("#sing");
    await expect(tag(page)).toBeHidden();
    await expect(page.locator("#sing")).toHaveAttribute("aria-pressed", "false");
    await page.click("#sing");
    await expect(tag(page)).toBeVisible();
    await page.click("#hold");
    await expect(tag(page)).toBeHidden();
    await expect(page.locator("#sing")).toHaveAttribute("aria-pressed", "false");
  });

  test("picking another voice starts over on that voice", async ({ page }) => {
    await page.click("#sing");
    await expect(page.locator("#singTarget")).toHaveText("B");
    await page.selectOption("#singVoice", { label: "Cello" });
    await expect(page.locator("#singCount")).toHaveText("✓ 0 · waited 0");
    await expect(tag(page)).toHaveClass(/waiting/, { timeout: 8000 });
    await expect(page.locator("#singTarget")).not.toHaveText("–");
  });

  test("the voice and guide controls only show while singing", async ({ page }) => {
    await expect(page.locator("#singVoice")).toBeHidden();
    await page.click("#sing");
    await expect(page.locator("#singVoice")).toBeVisible();
    await expect(page.locator("#singGuide")).toBeVisible();
    await page.click("#sing");
    await expect(page.locator("#singVoice")).toBeHidden();
  });

  test("a run that starts near the end is practice: a result, but no stars", async ({ page }) => {
    const box = await page.locator("#mini").boundingBox();
    await page.mouse.click(box.x + box.width * 0.96, box.y + box.height / 2);
    await page.click("#sing");
    for (let i = 0; i < 80 && await page.locator("#result").isHidden(); i++) {
      if (await tag(page).evaluate(el => el.classList.contains("waiting"))) await page.keyboard.press("Space");
      await page.waitForTimeout(150);
    }
    await expect(page.locator("#result")).toBeVisible();
    await expect(page.locator("#resWhat")).toHaveText("Menuet · Flute");
    await expect(page.locator("#resPct")).toHaveText("0%");
    await expect(page.locator("#resStars")).toBeHidden();
    await expect(page.locator("#resBest")).toContainText("Practice run");
    await expect(page.locator("#voices .chip .stars").first()).toHaveText("");
    await page.click("#resDone");
    await expect(page.locator("#result")).toBeHidden();
    await expect(page.locator("#sing")).toHaveAttribute("aria-pressed", "false");
  });
});

// A piece of the test's own: ten B's, a beat each at ♩ = 120, after two beats' rest.
function tenBs() {
  const ev = [0x00, 0xff, 0x51, 0x03, 0x07, 0xa1, 0x20];
  for (let i = 0; i < 10; i++) ev.push(...(i ? [0x00] : [0x87, 0x40]), 0x90, 71, 100, 0x83, 0x60, 0x80, 71, 64);
  ev.push(0x00, 0xff, 0x2f, 0x00);
  const head = [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, 0x01, 0xe0, 0x4d, 0x54, 0x72, 0x6b, 0, 0, ev.length >> 8, ev.length & 255];
  return Buffer.from([...head, ...ev]);
}

test.describe("singing a whole piece", () => {
  test.use({ mic: { parts: [{ seconds: 20, hz: B4 }] } });

  test("a full run ends on a result with stars, and the best is kept on the voice's chip", async ({ page }) => {
    await page.setInputFiles("#midi", { name: "bs.mid", mimeType: "audio/midi", buffer: tenBs() });
    await expect(page.locator("#mvTitle")).toHaveText("bs");
    await page.click("#sing");
    await expect(page.locator("#singStreak")).toHaveText(/^\d+ in a row$/, { timeout: 8000 });
    await expect(page.locator("#result")).toBeVisible({ timeout: 12000 });
    await expect(page.locator("#resPct")).toHaveText("100%");
    await expect(page.locator("#resStars")).toHaveAttribute("aria-label", "3 of 3 stars");
    await expect(page.locator("#resDetail")).toHaveText("10 of 10 notes · 10 in a row · speed 100%");
    await expect(page.locator("#resBest")).toContainText("First full run");
    await expect(page.locator("#voices .chip .stars")).toHaveText("★★★");
    await expect(page.locator("#play")).toHaveText("Play");
    // Again starts a new run from the top, and this time there's a best to compare with.
    await page.click("#resAgain");
    await expect(page.locator("#result")).toBeHidden();
    await expect(page.locator("#singCount")).toHaveText("✓ 1 · waited 0", { timeout: 8000 });
    await expect(page.locator("#result")).toBeVisible({ timeout: 12000 });
    await expect(page.locator("#resBest")).toHaveText("Your best: 100% at 100% speed");
  });
});

test.describe("singing the right note", () => {
  test.use({ mic: { parts: [{ seconds: 20, hz: B4 }] } });

  test("counts it in time and moves on to the next note", async ({ page }) => {
    await page.click("#sing");
    await expect(page.locator("#singCount")).toHaveText("✓ 1 · waited 0", { timeout: 5000 });
    await expect(page.locator("#singTarget")).toHaveText("C♯");
    await expect(page.locator("#singHeard")).toHaveText("B ↑");   // a tone below C♯: sing higher
  });
});

test.describe("singing in another octave", () => {
  test.use({ mic: { parts: [{ seconds: 20, hz: B4 / 2 }] } });

  test("counts too", async ({ page }) => {
    await page.click("#sing");
    await expect(page.locator("#singCount")).toHaveText("✓ 1 · waited 0", { timeout: 5000 });
  });
});

test.describe("singing the note late", () => {
  test.use({ mic: { parts: [{ seconds: 4 }, { seconds: 20, hz: B4 }] } });

  test("waits for it, then carries on to the next note", async ({ page }) => {
    await page.click("#sing");
    await expect(tag(page)).toHaveClass(/waiting/, { timeout: 4000 });
    await expect(page.locator("#singTarget")).toHaveText("B");
    await expect(page.locator("#singCount")).toHaveText("✓ 0 · waited 1", { timeout: 8000 });
    // It moved on past B: the next stop is C♯, never B again.
    await expect(page.locator("#singTarget")).toHaveText("C♯");
  });
});

// A piece of the test's own with a chord in it: B and the D above it together, then a D and a B, a beat each
// at ♩ = 120, after two beats' rest.
function chordTune() {
  const ev = [0x00, 0xff, 0x51, 0x03, 0x07, 0xa1, 0x20];
  [[71, 74], [74], [71]].forEach((ms, i) => {
    ms.forEach((m, k) => ev.push(...(k || i ? [0x00] : [0x87, 0x40]), 0x90, m, 100));
    ms.forEach((m, k) => ev.push(...(k ? [0x00] : [0x83, 0x60]), 0x80, m, 64));
  });
  ev.push(0x00, 0xff, 0x2f, 0x00);
  const head = [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, 0x01, 0xe0, 0x4d, 0x54, 0x72, 0x6b, 0, 0, ev.length >> 8, ev.length & 255];
  return Buffer.from([...head, ...ev]);
}
async function loadChordTune(page) {
  await page.setInputFiles("#midi", { name: "chord.mid", mimeType: "audio/midi", buffer: chordTune() });
  await expect(page.locator("#mvTitle")).toHaveText("chord");
}

test.describe("a chord in the voice, with silence", () => {
  test.use({ mic: { parts: [{ seconds: 2 }] } });

  test("asks for its lowest note first, and Space skips the whole chord", async ({ page }) => {
    await loadChordTune(page);
    await page.click("#sing");
    await expect(tag(page)).toHaveClass(/waiting/, { timeout: 5000 });
    await expect(page.locator("#singLabel")).toHaveText("Sing 1/2");
    await expect(page.locator("#singTarget")).toHaveText("B");
    await page.keyboard.press("Space");
    await expect(tag(page)).toHaveClass(/waiting/, { timeout: 5000 });
    await expect(page.locator("#singLabel")).toHaveText("Sing");
    await expect(page.locator("#singTarget")).toHaveText("D");
  });
});

test.describe("a chord in the voice, sung from the bottom up", () => {
  test.use({ mic: { parts: [{ seconds: 7, hz: B4 }, { seconds: 20, hz: hz(74) }] } });

  test("the music stops on it until every note is sung, and it counts once", async ({ page }) => {
    await loadChordTune(page);
    await page.click("#sing");
    // The B comes in time, but the chord isn't done: the music waits for the D.
    await expect(page.locator("#singLabel")).toHaveText("Sing 2/2", { timeout: 5000 });
    await expect(page.locator("#singTarget")).toHaveText("D");
    await expect(page.locator("#singCount")).toHaveText("✓ 0 · waited 0");
    await expect(page.locator("#play")).toHaveText("Play");
    // Once the D is heard the chord counts as sung in time, and so does the D after it.
    await expect(page.locator("#singCount")).toHaveText("✓ 2 · waited 0", { timeout: 12000 });
    await expect(page.locator("#singTarget")).toHaveText("B");
  });
});
