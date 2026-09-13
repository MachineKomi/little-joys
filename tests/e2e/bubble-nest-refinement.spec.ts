import { test, expect, type Page } from "./fixtures";

async function canvasImage(page: Page) {
  return page
    .locator("canvas")
    .evaluate((c: HTMLCanvasElement) => c.toDataURL());
}

for (const coalesced of [false, true])
  test(`BN04/BN05: ${coalesced ? "2ms coalesced" : "ordinary"} release animates, pause stops it and resume cannot relaunch`, async ({
    page,
  }) => {
    await page.addInitScript(() =>
      localStorage.setItem(
        "little-joys-settings-v1",
        JSON.stringify({ lastToy: "nest", motion: "playful" }),
      ),
    );
    await page.goto("/");
    await expect(page.locator("canvas")).toHaveAttribute("data-art", "6");
    await page.locator("canvas").evaluate(async (canvas, coalesced) => {
      const b = canvas.getBoundingClientRect();
      const r = Math.max(
        8,
        Math.min(80, (b.width - 48) / 5.2, (b.height - 48) / 4.5),
      );
      const x = b.width / 2 - r * 1.25,
        y = b.height * 0.61 - r * 2.45;
      const make = (type: string, offset: number) =>
        new PointerEvent(type, {
          bubbles: true,
          pointerId: 7,
          pointerType: "touch",
          buttons: type === "pointerup" ? 0 : 1,
          clientX: b.x + x + offset,
          clientY: b.y + y,
        });
      const down = make("pointerdown", 0);
      canvas.dispatchEvent(down);
      if (coalesced) {
        const samples = Array.from({ length: 8 }, (_, i) => {
          const sample = make("pointermove", (i + 1) * 5);
          Object.defineProperty(sample, "timeStamp", {
            value: down.timeStamp + (i + 1) * 2,
          });
          return sample;
        });
        const outer = make("pointermove", 40);
        Object.defineProperty(outer, "getCoalescedEvents", {
          value: () => samples,
        });
        canvas.dispatchEvent(outer);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 30));
        canvas.dispatchEvent(make("pointermove", 20));
      }
      canvas.dispatchEvent(make("pointerup", coalesced ? 40 : 20));
      // Observe after the drag has painted, so the assertion measures free motion.
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
    }, coalesced);
    const released = await canvasImage(page);
    await page.waitForTimeout(100);
    expect(await canvasImage(page)).not.toBe(released);
    await page.getByRole("button", { name: "Pause play", exact: true }).click();
    await page.waitForTimeout(60);
    const frozen = await canvasImage(page);
    await page.waitForTimeout(180);
    expect(await canvasImage(page)).toBe(frozen);
    await page
      .getByRole("button", { name: "Resume play", exact: true })
      .click();
    await page.waitForTimeout(80);
    const resumed = await canvasImage(page);
    await page.waitForTimeout(180);
    expect(await canvasImage(page)).toBe(resumed);
  });

for (const width of [360, 810]) {
  test(`BN06: visible build identity fits and does not intercept canvas at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1080 });
    await page.goto("/");
    const label = page.locator(".build-label");
    const build = await (await page.request.get("/build-label.json")).json();
    await expect(label).toHaveAttribute("title", build.buildId);
    await expect(label).toBeVisible();
    const bounds = await label.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    expect(
      await label.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
          ?.tagName;
      }),
    ).toBe("CANVAS");
    await page.getByRole("button", { name: "Toybox", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Bubble Pond", exact: true }),
    ).toBeVisible();
  });
}
