// Shared setup for the browser tests. Every page gets Tonal from node_modules instead of the CDN (so chord
// names work offline and never change under us), and any uncaught error or console error fails the test.
import { test as base, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const tonal = readFileSync(fileURLToPath(new URL("../../node_modules/tonal/browser/tonal.min.js", import.meta.url)), "utf8");

export async function preparePage(page) {
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  await page.route(/cdn\.jsdelivr\.net\/npm\/tonal@.*\/tonal\.min\.js/, route => route.fulfill({ body: tonal, contentType: "text/javascript" }));
  return errors;
}

export const test = base.extend({
  errors: [async ({ page }, use) => {
    const errors = await preparePage(page);
    await use(errors);
    expect(errors, "errors in the page").toEqual([]);
  }, { auto: true }],
});
export { expect };

// Open the app on a movement and wait until it has loaded.
export async function open(page, slug = "badinerie") {
  await page.goto("/#" + slug);
  await expect(page.locator("#voices .chip").first()).toBeVisible();
}

export const text = (page, id) => page.locator("#" + id).textContent();
