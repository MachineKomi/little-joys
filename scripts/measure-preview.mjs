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
  () => document.querySelector("canvas")?.getAttribute("data-art") === "6",
);
await page.evaluate(
  () =>
    new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    ),
);
const painted = performance.now() - started;
report.coldStart = {
  actionableMs: Math.round(actionable),
  spritesRenderedMs: Math.round(painted),
  profile:
    "10 Mbps download/upload; 50ms protocol latency; fresh browser cache; service worker blocked to isolate first-interaction files; local production server with real CSP and uncompressed responses",
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
  note: "Background offline precache (including optional music) measured separately by budget audit. No physical-device startup inference.",
};
await cold.close();
for (const { toy, motion, variant } of [
  { toy: "squishy", motion: "gentle" },
  { toy: "squishy", motion: "playful" },
  { toy: "squishy", motion: "playful", variant: "sling" },
  { toy: "bubbles", motion: "gentle" },
  { toy: "nest", motion: "gentle" },
  { toy: "bounce", motion: "gentle" },
  { toy: "bounce", motion: "playful" },
]) {
  const context = await browser.newContext({
    viewport: { width: 810, height: 1080 },
    deviceScaleFactor: 2,
    serviceWorkers: "block",
    reducedMotion: "no-preference",
  });
  const p = await context.newPage();
  await p.addInitScript(
    ({ toy, motion }) => {
      localStorage.setItem(
        "little-joys-settings-v1",
        JSON.stringify({
          lastToy: toy,
          diagnosticsEnabled: true,
          bubbleCount: 6,
          ballCount: 2,
          bounceBallCount: 24,
          motion,
        }),
      );
    },
    { toy, motion },
  );
  await p.goto(base);
  await p.waitForFunction(
    () => document.querySelector("canvas")?.getAttribute("data-art") === "6",
  );
  const frameSummary = await p.evaluate(
    async ({ toy, seconds, variant }) => {
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
      if (toy === "bounce") {
        // Deliberate dense-board workload: fill the capped pool, then recycle
        // four balls near the top every 600ms while four contacts influence it.
        for (let i = 0; i < 24; i++) {
          event(
            "pointerdown",
            0,
            0.12 + (i % 8) * 0.105,
            // Open board space just below the penguin's shelf.
            0.2 + Math.floor(i / 8) * 0.02,
          );
          event("pointerup", 0, 0.12 + (i % 8) * 0.105, 0.2);
        }
      }
      if (variant !== "sling")
        starts.forEach(([x, y], i) => event("pointerdown", i, x, y));
      let held = false;
      const intervals = [];
      let previous = 0,
        begin = 0,
        lastSpawn = 0;
      await new Promise((resolve) => {
        const frame = (t) => {
          begin ||= t;
          if (previous) intervals.push(t - previous);
          previous = t;
          if (variant === "sling") {
            // One contact stretches the side for 0.5s, then releases. Each 1.2s
            // cycle's re-grab can catch the still-travelling friend.
            const phase = (t - begin) % 1200;
            if (phase < 500) {
              if (!held) {
                event("pointerdown", 0, 0.62, 0.5);
                held = true;
              }
              event("pointermove", 0, 0.62 + (phase / 500) * 0.3, 0.5 + Math.sin((t - begin) / 400) * 0.05);
            } else if (held) {
              event("pointerup", 0, 0.92, 0.5);
              held = false;
            }
          } else
          starts.forEach(([x, y], i) =>
            event(
              "pointermove",
              i,
              x +
                Math.sin((t - begin) / 600 + i) *
                  (toy === "squishy" ? 0.24 : 0.12),
              y +
                Math.cos((t - begin) / 700 + i) *
                  (toy === "squishy" ? 0.2 : 0.1),
            ),
          );
          if (toy === "bounce" && t - lastSpawn >= 600) {
            starts.forEach(([x, y], i) => {
              event("pointerup", i, x, y);
              event("pointerdown", i, 0.18 + i * 0.2, 0.2);
            });
            lastSpawn = t;
          }
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
    { toy, seconds, variant },
  );
  await p.waitForTimeout(350);
  await p.screenshot({
    path: `${directory}/${variant ? `${toy}-${variant}` : toy === "bounce" || toy === "squishy" ? `${toy}-${motion}` : toy}-portrait.png`,
  });
  await p
    .getByRole("button", { name: "Open parent settings", exact: true })
    .focus();
  await p.keyboard.press("Enter");
  await p.getByText("Technical status", { exact: true }).click();
  await p
    .getByRole("button", { name: "Refresh technical status", exact: true })
    .click();
  const status = JSON.parse(await p.locator(".runtime-status").innerText());
  report.toys.push({
    toy,
    motion,
    variant: variant ?? null,
    workload:
      variant === "sling"
        ? "Playful sling cycles: one synthetic contact stretches the side for 0.5s then releases, every 1.2s; each re-grab can catch the travelling friend"
        : toy === "bounce"
        ? "24-ball cap with passive penguin flow active, four synthetic contacts, four recycled spawns every 600ms just below the shelf"
        : toy === "squishy"
          ? "Four synthetic contacts, doubled drag amplitude (0.24 width / 0.20 height), final release sampled in both motion modes"
          : "Maximum configured objects and four synthetic contacts",
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
