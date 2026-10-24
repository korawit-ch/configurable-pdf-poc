import { chromium } from "/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core/index.mjs";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
try {
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1100 },
    acceptDownloads: true,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.setDefaultTimeout(15000);
  await page.goto("http://127.0.0.1:5174", { waitUntil: "domcontentloaded" });
  await page
    .getByText("Preview matches downloaded PDF", { exact: true })
    .waitFor({ timeout: 60000 });
  console.log("PDF PREVIEW READY", await page.locator("canvas").count());
  await page.screenshot({ path: "editor-preview.png" });
  await page
    .getByRole("button", { name: "Move Installment schedule up", exact: true })
    .click();
  await page
    .getByRole("switch", { name: "Show Commission", exact: true })
    .click();
  await page
    .getByRole("spinbutton", {
      name: "Commission Rate (% of device price)",
      exact: true,
    })
    .fill("2.5");
  await page
    .getByRole("button", { name: "Save template", exact: true })
    .click();
  await page.getByText("Saved for this session", { exact: true }).waitFor();
  await page
    .getByRole("button", { name: "Use in staff contract →", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Next: Template & Terms", exact: true })
    .click();
  await page.getByText("6 mo", { exact: true }).click();
  await page
    .getByRole("button", { name: "Next: Device Info", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Next: Customer", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Next: Preview", exact: true })
    .click();
  await page
    .getByText("Preview matches downloaded PDF", { exact: true })
    .waitFor({ timeout: 60000 });
  await page.screenshot({ path: "staff-review.png" });
  await page
    .getByRole("button", { name: "Continue to submission →", exact: true })
    .click();
  const text = await page.locator(".json-code").innerText();
  const request = JSON.parse(text);
  assert.equal(request.template.templateVersion, 2);
  assert.equal(request.financing.termMonths, 6);
  assert.equal(request.template.commission.ratePercent, 2.5);
  assert.equal(request.template.sections[3].key, "schedule");
  assert.equal(request.schedule.length, 7);
  await page
    .getByRole("button", { name: "Submit for Approval (demo)", exact: true })
    .click();
  await page.getByText("Demo submission accepted", { exact: true }).waitFor();
  await page.screenshot({ path: "submission-review.png" });
  assert.deepEqual(errors, []);
  console.log(
    "BROWSER FLOW PASSED: reorder, commission, save, staff steps, frozen payload, demo approval.",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://127.0.0.1:5174");
  await page
    .getByText("Preview matches downloaded PDF", { exact: true })
    .waitFor({ timeout: 60000 });
  await page.screenshot({ path: "mobile-preview.png", fullPage: true });
  console.log("MOBILE PREVIEW READY");
} finally {
  await browser.close();
}
