import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const baseURL = process.env.DEMO_BASE_URL ?? "http://127.0.0.1:3100";
const out = resolve("docs/demo/screenshots");
await mkdir(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const desktop = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  colorScheme: "light",
});
const page = await desktop.newPage();
async function capture(name) {
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: resolve(out, name),
    fullPage: true,
    animations: "disabled",
  });
  console.log(name);
}

try {
  await page.goto(baseURL);
  await page
    .getByRole("heading", { name: "A little clarity. A lot of care." })
    .waitFor();
  await capture("01-inbox-heating.png");
  await page.getByRole("button", { name: /Jonas Fischer/ }).click();
  await page
    .getByRole("heading", { name: "Small leak under the kitchen sink" })
    .waitFor();
  await capture("02-inbox-water.png");
  await page.getByRole("button", { name: /Mia Schneider/ }).click();
  await page
    .getByRole("heading", { name: "Front door is difficult to close" })
    .waitFor();
  await capture("03-inbox-access.png");
  await page
    .getByRole("textbox", { name: "Search requests" })
    .fill("does-not-exist");
  await page.getByText("No requests match your search.").waitFor();
  await capture("04-search-empty.png");
  await page.getByRole("textbox", { name: "Search requests" }).fill("Anna");
  await page
    .getByRole("heading", { name: "Heating has stopped working again" })
    .waitFor();
  await capture("05-search-heating.png");
  for (const [path, heading, name] of [
    ["/properties", "Know the place behind the request.", "06-properties.png"],
    ["/activity", "Every step, accounted for.", "07-activity.png"],
    ["/imports", "Bring your property records along.", "08-imports.png"],
    ["/settings", "Workspace settings", "09-settings.png"],
    [
      "/workspace",
      "Connect your development workspace",
      "10-workspace-setup.png",
    ],
  ]) {
    await page.goto(new URL(path, baseURL).href);
    await page.getByRole("heading", { name: heading }).waitFor();
    await capture(name);
  }

  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    colorScheme: "light",
  });
  const mobilePage = await mobile.newPage();
  await mobilePage.goto(baseURL);
  await mobilePage
    .getByRole("heading", { name: "A little clarity. A lot of care." })
    .waitFor();
  await mobilePage.evaluate(() => document.fonts.ready);
  await mobilePage.screenshot({
    path: resolve(out, "11-mobile-inbox.png"),
    fullPage: true,
    animations: "disabled",
  });
  console.log("11-mobile-inbox.png");
  await mobile.close();
} finally {
  await desktop.close();
  await browser.close();
}
