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
