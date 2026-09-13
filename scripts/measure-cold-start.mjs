import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
const base = process.env.PREVIEW_URL || "http://127.0.0.1:4174";
const { buildId } = JSON.parse(await readFile("dist/build-label.json", "utf8"));
const response = await fetch(new URL("/build-label.json", base));
if (!response.ok || (await response.json()).buildId !== buildId)
  throw Error("Served artifact differs from dist");
const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    viewport: { width: 810, height: 1080 },
    serviceWorkers: "block",
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 50,
    downloadThroughput: 10_000_000 / 8,
    uploadThroughput: 10_000_000 / 8,
  });
  const started = performance.now();
  await page.goto(base);
  await page.locator('canvas[data-toy="squishy"]').waitFor();
  const actionableMs = performance.now() - started;
  await page.waitForFunction(
    () => document.querySelector("canvas")?.dataset.art === "6",
  );
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  const spritesRenderedMs = performance.now() - started;
  const report = {
    buildId,
    browser: browser.version(),
    actionableMs,
    spritesRenderedMs,
    profile:
      "Fresh Windows desktop Chromium cache; 10Mbps down/up,50ms protocol latency; service workers blocked to isolate first-interaction files; local production CSP server with uncompressed responses. Not physical iPad.",
    requests: await page.evaluate(() =>
      [
        ...performance.getEntriesByType("navigation"),
        ...performance.getEntriesByType("resource"),
      ].map((r) => ({
        path: new URL(r.name).pathname,
        transferSize: r.transferSize,
        encodedBodySize: r.encodedBodySize,
      })),
    ),
  };
  await mkdir("docs/evidence", { recursive: true });
  await writeFile(
    "docs/evidence/bubble-nest-cold-start.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
