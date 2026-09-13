// Synthetic desktop evidence only; never physical-iPad or touch-to-photon evidence.
import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
const base = process.env.PREVIEW_URL || "http://127.0.0.1:4174";
const seconds = Number(process.env.TRACE_SECONDS || 10);
if (!Number.isFinite(seconds) || seconds < 1 || seconds > 60)
  throw Error("TRACE_SECONDS must be 1..60");
const { buildId } = JSON.parse(await readFile("dist/build-label.json", "utf8"));
const served = await fetch(new URL("/build-label.json", base));
if (!served.ok || (await served.json()).buildId !== buildId)
  throw Error("Served artifact differs from dist");
const report = {
  buildId,
  environment:
    "Windows desktop Chromium, synthetic contacts, 810x1080 CSS, DPR2; not physical iPad",
  instrumentation:
    "Canvas drawImage wrapper observes last rendered ball centres for re-grab; positions stay in page memory and are not exported. Small instrumentation cost is included.",
  seconds,
  cases: [],
};
const browser = await chromium.launch();
try {
  report.browser = browser.version();
  for (const toy of ["bubbles", "nest"])
    for (const motion of ["gentle", "playful"]) {
      const context = await browser.newContext({
        viewport: { width: 810, height: 1080 },
        deviceScaleFactor: 2,
        serviceWorkers: "block",
        reducedMotion: "no-preference",
      });
      try {
        const page = await context.newPage();
        await page.addInitScript(
          ({ toy, motion }) => {
            localStorage.setItem(
              "little-joys-settings-v1",
              JSON.stringify({
                lastToy: toy,
                motion,
                bubbleCount: 6,
                ballCount: 2,
                diagnosticsEnabled: true,
              }),
            );
            window.__measurementBalls = [];
            const draw = CanvasRenderingContext2D.prototype.drawImage;
            CanvasRenderingContext2D.prototype.drawImage = function (
              image,
              ...args
            ) {
              if (
                image instanceof HTMLImageElement &&
                /\/ball(?:-two)?\.webp$/.test(image.src)
              ) {
                const transform = this.getTransform();
                const scale =
                  this.canvas.width / this.canvas.getBoundingClientRect().width;
                window.__measurementBalls[
                  image.src.endsWith("ball-two.webp") ? 1 : 0
                ] = { x: transform.e / scale, y: transform.f / scale };
              }
              return draw.call(this, image, ...args);
            };
          },
          { toy, motion },
        );
        await page.goto(base);
        await page.waitForFunction(
          () => document.querySelector("canvas")?.dataset.art === "6",
        );
        if (toy === "nest") await page.waitForFunction(() => window.__measurementBalls.length === 2);
        const active = await page.evaluate(
          async ({ toy, seconds }) => {
            const canvas = document.querySelector("canvas"),
              r = canvas.getBoundingClientRect();
            const event = (type, id, x, y) =>
              canvas.dispatchEvent(
                new PointerEvent(type, {
                  pointerId: id + 1,
                  pointerType: "touch",
                  bubbles: true,
                  buttons: type === "pointerup" ? 0 : 1,
                  clientX: r.x + x,
                  clientY: r.y + y,
                }),
              );
            const intervals = [];
            let start = 0,
              previous = 0,
              cycle = -1,
              released = false,
              grabs = [];
            await new Promise((resolve) =>
              requestAnimationFrame(function frame(t) {
                start ||= t;
                if (previous) intervals.push(t - previous);
                previous = t;
                const elapsed = t - start,
                  nextCycle = Math.floor(elapsed / 900),
                  phase = elapsed % 900;
                if (nextCycle !== cycle) {
                  cycle = nextCycle;
                  released = false;
                  if (toy === "nest") {
                    grabs = window.__measurementBalls.map((p) => ({ ...p }));
                    grabs.forEach((p, i) => event("pointerdown", i, p.x, p.y));
                  } else
                    for (let i = 0; i < 4; i++)
                      event(
                        "pointerdown",
                        i,
                        r.width * 0.12,
                        r.height * (0.15 + i * 0.22),
                      );
                }
                if (toy === "nest") {
                  if (phase < 220)
                    grabs.forEach((p, i) =>
                      event(
                        "pointermove",
                        i,
                        p.x + (cycle % 2 ? 1 : -1) * (i ? 1 : -1) * phase * 0.6,
                        p.y,
                      ),
                    );
                  else if (!released) {
                    grabs.forEach((p, i) => event("pointerup", i, p.x, p.y));
                    released = true;
                  }
                } else {
                  if (phase < 700)
                    for (let i = 0; i < 4; i++)
                      event(
                        "pointermove",
                        i,
                        r.width * (0.12 + (0.76 * phase) / 700),
                        r.height * (0.15 + i * 0.22),
                      );
                  else if (!released) {
                    for (let i = 0; i < 4; i++) event("pointerup", i, 0, 0);
                    released = true;
                  }
                }
                if (elapsed < seconds * 1000) requestAnimationFrame(frame);
                else resolve();
              }),
            );
            for (let i = 0; i < 4; i++) event("pointerup", i, 0, 0);
            intervals.sort((a, b) => a - b);
            return {
              samples: intervals.length,
              p50: intervals[Math.floor(intervals.length * 0.5)],
              p95: intervals[Math.floor(intervals.length * 0.95)],
              max: intervals.at(-1),
              over50ms: intervals.filter((x) => x > 50).length,
            };
          },
          { toy, seconds },
        );
        await page.waitForTimeout(2100);
        const settled = await page
          .locator("canvas")
          .evaluate((c) => c.toDataURL());
        await page.waitForTimeout(250);
        const idleStable =
          settled ===
          (await page.locator("canvas").evaluate((c) => c.toDataURL()));
        await page
          .getByRole("button", { name: "Open parent settings", exact: true })
          .press("Enter");
        await page.getByText("Technical status", { exact: true }).click();
        await page
          .getByRole("button", {
            name: "Refresh technical status",
            exact: true,
          })
          .click();
        const runtime = JSON.parse(
          await page.locator(".runtime-status").innerText(),
        );
        if (runtime.buildId !== buildId) throw Error("Runtime build mismatch");
        report.cases.push({
          toy,
          motion,
          workload:
            toy === "nest"
              ? "Two balls repeatedly dragged for220ms, released for680ms and re-grabbed from rendered positions"
              : "Six bubbles, four broad sweeps with all contacts lifted each900ms",
          activeRafMs: active,
          idleCanvasStable: idleStable,
          runtime,
        });
      } finally {
        await context.close();
      }
    }
} finally {
  await browser.close();
}
await mkdir("docs/evidence", { recursive: true });
await writeFile(
  "docs/evidence/bubble-nest-performance.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
