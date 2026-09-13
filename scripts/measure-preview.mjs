// Adult/developer synthetic desktop evidence; not physical iPad or touch-to-photon measurement.
import { chromium } from "@playwright/test";
import { mkdir, writeFile, readFile } from "node:fs/promises";
const base = process.env.PREVIEW_URL || "http://127.0.0.1:4173";
const seconds = Number(process.env.TRACE_SECONDS || 10);
const directory = "docs/evidence";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch();
const report = {
  build: JSON.parse(await readFile("dist/build-label.json", "utf8")).buildId,
  browser: browser.version(),
  environment: "Windows desktop Chromium; synthetic pointer workload, not iPad",
  traceSecondsPerToy: seconds,
  coldStart: null,
  toys: [],
};
const cold = await browser.newContext({
  viewport: { width: 810, height: 1080 },
  serviceWorkers: "block",
});
const page = await cold.newPage();
const cdp = await cold.newCDPSession(page);
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
const actionable = performance.now() - started;
await page.waitForFunction(
  () => document.querySelector("canvas")?.getAttribute("data-art") === "5",
);
const painted = performance.now() - started;
report.coldStart = {
  actionableMs: Math.round(actionable),
  paintedSpritesMs: Math.round(painted),
  profile:
    "10 Mbps download/upload; 50ms protocol latency; fresh browser cache; service worker blocked to isolate first-interaction files; local production server with real CSP and uncompressed responses",
  requests: await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .map((r) => ({
        path: new URL(r.name).pathname,
        transferSize: r.transferSize,
        encodedBodySize: r.encodedBodySize,
      })),
  ),
  note: "Background offline precache (including optional music) measured separately by budget audit. No physical-device startup inference.",
};
await cold.close();
for (const toy of ["squishy", "bubbles", "nest"]) {
  const context = await browser.newContext({
    viewport: { width: 810, height: 1080 },
    deviceScaleFactor: 2,
    serviceWorkers: "block",
  });
  const p = await context.newPage();
  await p.addInitScript((toy) => {
    localStorage.setItem(
      "little-joys-settings-v1",
      JSON.stringify({
        lastToy: toy,
        diagnosticsEnabled: true,
        bubbleCount: 6,
        ballCount: 2,
      }),
    );
  }, toy);
  await p.goto(base);
  await p.waitForFunction(
    () => document.querySelector("canvas")?.getAttribute("data-art") === "5",
  );
  const frameSummary = await p.evaluate(
    async ({ toy, seconds }) => {
      const canvas = document.querySelector("canvas"),
        r = canvas.getBoundingClientRect(),
        w = r.width,
        h = r.height;
      const starts =
        toy === "squishy"
          ? [
              [0.33, 0.5],
              [0.67, 0.5],
              [0.5, 0.35],
              [0.5, 0.66],
            ]
          : toy === "nest"
            ? [
                [0.3815, 0.41],
                [0.6185, 0.41],
                [0.05, 0.1],
                [0.95, 0.1],
              ]
            : [
                [0.3, 0.25],
                [0.7, 0.25],
                [0.3, 0.7],
                [0.7, 0.7],
              ];
      const event = (type, id, x, y) =>
        canvas.dispatchEvent(
          new PointerEvent(type, {
            pointerId: id + 1,
            pointerType: "touch",
            isPrimary: id === 0,
            button: 0,
            buttons: type === "pointerup" ? 0 : 1,
            clientX: r.left + x * w,
            clientY: r.top + y * h,
            bubbles: true,
          }),
        );
      starts.forEach(([x, y], i) => event("pointerdown", i, x, y));
      const intervals = [];
      let previous = 0,
        begin = 0;
      await new Promise((resolve) => {
        const frame = (t) => {
          begin ||= t;
          if (previous) intervals.push(t - previous);
          previous = t;
          starts.forEach(([x, y], i) =>
            event(
              "pointermove",
              i,
              x + Math.sin((t - begin) / 600 + i) * 0.12,
              y + Math.cos((t - begin) / 700 + i) * 0.1,
            ),
          );
          if (t - begin < seconds * 1000) requestAnimationFrame(frame);
          else resolve();
        };
        requestAnimationFrame(frame);
      });
      starts.forEach(([x, y], i) => event("pointerup", i, x, y));
      intervals.sort((a, b) => a - b);
      return {
        samples: intervals.length,
        p50: intervals[Math.floor(intervals.length * 0.5)],
        p95: intervals[Math.floor(intervals.length * 0.95)],
        max: intervals.at(-1),
        over50ms: intervals.filter((v) => v > 50).length,
      };
    },
    { toy, seconds },
  );
  await p.waitForTimeout(350);
  await p.screenshot({ path: `${directory}/${toy}-portrait.png` });
  await p
    .getByRole("button", { name: "Open parent settings", exact: true })
    .focus();
  await p.keyboard.press("Enter");
  await p.getByText("Technical status", { exact: true }).click();
  const status = JSON.parse(await p.locator(".runtime-status").innerText());
  report.toys.push({
    toy,
    syntheticActiveRafMs: frameSummary,
    runtime: status,
  });
  await context.close();
}
await browser.close();
await writeFile(
  `${directory}/desktop-performance.json`,
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
