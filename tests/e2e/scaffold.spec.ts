import { expect, test } from "@playwright/test";

test("preview supports selection, search, and no-results recovery", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "A little clarity. A lot of care." }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Jonas Fischer/ }).click();
  await expect(
    page.getByRole("heading", { name: "Small leak under the kitchen sink" }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Search requests" })
    .fill("does-not-exist");
  await expect(page.getByText("No requests match your search.")).toBeVisible();
  await page.getByRole("textbox", { name: "Search requests" }).fill("Anna");
  await expect(
    page.getByRole("heading", { name: "Heating has stopped working again" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/preview-${test.info().project.name}.png`,
    fullPage: true,
  });
});

test("navigation explains connected imports and credential-free setup", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Imports", exact: true }).click();
  await expect(
    page.getByText(
      "Configure Clerk and Convex using the README to upload a file",
      { exact: false },
    ),
  ).toBeVisible();
  await page.getByRole("link", { name: "Open workspace", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Connect your development workspace" }),
  ).toBeVisible();
});
