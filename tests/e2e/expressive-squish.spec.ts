import { test, expect, type Page } from "./fixtures";
import sharp from "sharp";

// Synthetic production-page inputs; neither physical touch nor child-play evidence.
async function contact(
  page: Page,
  type: string,
  id: number,
  x: number,
  y: number,
) {
  await page.locator("canvas").evaluate(
    (canvas, p) => {
      const box = canvas.getBoundingClientRect(),
        radius = Math.min(box.width, box.height) * 0.29;
      canvas.dispatchEvent(
        new PointerEvent(p.type, {
          bubbles: true,
          pointerId: p.id,
          pointerType: "touch",
          isPrimary: false,
          button: 0,
          buttons: p.type === "pointerup" ? 0 : 1,
          clientX: box.left + box.width / 2 + p.x * radius,
          clientY: box.top + box.height / 2 + p.y * radius,
        }),
      );
    },
    { type, id, x, y },
  );
}
const pixels = (page: Page) =>
  page.locator("canvas").evaluate((c) => (c as HTMLCanvasElement).toDataURL());
async function launch(page: Page, motion = "playful") {
  await page.addInitScript((m) => {
    localStorage.setItem(
      "little-joys-settings-v1",
      JSON.stringify({ motion: m, lastToy: "squishy" }),
    );
    const original = window.requestAnimationFrame.bind(window);
    (window as unknown as { toyFrameRequests: number }).toyFrameRequests = 0;
    window.requestAnimationFrame = (cb) => {
      (window as unknown as { toyFrameRequests: number }).toyFrameRequests++;
      return original(cb);
    };
  }, motion);
  await page.goto("/");
  await expect(page.locator("canvas")).toHaveAttribute("data-art", "6");
  await page.waitForTimeout(550);
}
async function frame(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
}
async function difference(a: string, b: string) {
  const first = await sharp(Buffer.from(a.split(",")[1], "base64"))
    .removeAlpha()
    .raw()
    .toBuffer();
  const second = await sharp(Buffer.from(b.split(",")[1], "base64"))
    .removeAlpha()
    .raw()
    .toBuffer();
  expect(first.length).toBe(second.length);
  let changed = 0;
  for (let i = 0; i < first.length; i += 3)
    if (
      Math.abs(first[i] - second[i]) +
        Math.abs(first[i + 1] - second[i + 1]) +
        Math.abs(first[i + 2] - second[i + 2]) >
      30
    )
      changed++;
  return changed;
}

test("T45/T48: large side, face and curl pulls remain visible on phone, portrait and landscape", async ({
  page,
}, info) => {
  test.setTimeout(45_000);
  await launch(page, "gentle");
  for (const [name, width, height] of [
    ["phone", 360, 640],
    ["portrait", 810, 1080],
    ["landscape", 1080, 810],
  ] as const) {
    await page.setViewportSize({ width, height });
    await expect
      .poll(() =>
        page.locator("canvas").evaluate((c) => c.getBoundingClientRect().width),
      )
      .toBe(width);
    await page.waitForTimeout(500);
    const rest = await pixels(page);
    for (const [part, x, y, dx, dy] of [
      ["side", 0.6, 0, 1.1, 0],
      ["face", -0.39, -0.12, -0.8, -0.4],
      ["curl", 0.1, -0.8, 0.25, -1.1],
    ] as const) {
      await contact(page, "pointerdown", 1, x, y);
      await contact(page, "pointermove", 1, x + dx, y + dy);
      await frame(page);
      expect(await difference(rest, await pixels(page))).toBeGreaterThan(1500);
      await info.attach(`${name}-${part}`, {
        body: await page.locator("canvas").screenshot(),
        contentType: "image/png",
      });
      await contact(page, "pointerup", 1, x + dx, y + dy);
      await page.waitForTimeout(650);
      expect(await pixels(page)).toBe(rest);
    }
  }
});

test("T47: Playful release stops on Pause, resumes coherently and returns to a sleeping rest frame", async ({
  page,
}) => {
  await launch(page);
  const rest = await pixels(page);
  await contact(page, "pointerdown", 1, 0.6, 0);
  await contact(page, "pointermove", 1, 1.7, 0);
  await frame(page);
  await contact(page, "pointerup", 1, 1.7, 0);
  await page.waitForTimeout(100);
  await page.getByRole("button", { name: "Pause play", exact: true }).click();
  const frozen = await pixels(page);
  await contact(page, "pointerdown", 2, 0.3, 0.1);
  await page.waitForTimeout(350);
  expect(await pixels(page)).toBe(frozen);
  await expect(page.locator("canvas")).toHaveAttribute("data-pointers", "0");
  await page
    .getByRole("button", { name: "Resume play", exact: true })
    .first()
    .click();
  await page.waitForTimeout(900);
  expect(await pixels(page)).toBe(rest);
  const count = await page.evaluate(
    () => (window as unknown as { toyFrameRequests: number }).toyFrameRequests,
  );
  await page.waitForTimeout(400);
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { toyFrameRequests: number }).toyFrameRequests,
    ),
  ).toBe(count);
  expect(await pixels(page)).toBe(rest);
});

test("T46/T47: four stretched contacts can be reclaimed during return and canceled by resize or blur", async ({
  page,
}) => {
  await launch(page);
  for (const stop of ["resize", "blur"] as const) {
    for (const [i, x, y] of [
      [1, -0.6, 0],
      [2, 0.6, 0],
      [3, 0, -0.6],
      [4, 0, 0.6],
    ]) {
      await contact(page, "pointerdown", i, x, y);
      await contact(page, "pointermove", i, x * 2.2, y * 2.2);
    }
    await frame(page);
    await expect(page.locator("canvas")).toHaveAttribute("data-pointers", "4");
    for (let id = 1; id <= 4; id++) await contact(page, "pointerup", id, 0, 0);
    await page.waitForTimeout(100);
    await contact(page, "pointerdown", 9, -0.4, 0);
    await page.waitForTimeout(350);
    const held = await pixels(page);
    await contact(page, "pointermove", 9, -1.3, -0.3);
    await frame(page);
    expect(await difference(held, await pixels(page))).toBeGreaterThan(1500);
    if (stop === "resize") {
      await page.setViewportSize({ width: 1080, height: 810 });
      await expect
        .poll(() =>
          page
            .locator("canvas")
            .evaluate((c) => c.getBoundingClientRect().width),
        )
        .toBe(1080);
    } else await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    await expect(page.locator("canvas")).toHaveAttribute("data-pointers", "0");
    if (stop === "blur") {
      const frozen = await pixels(page);
      await page.waitForTimeout(250);
      expect(await pixels(page)).toBe(frozen);
      await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    }
    await page.waitForTimeout(650);
    await contact(page, "pointerdown", 12, 0.4, 0);
    await contact(page, "pointermove", 12, 0.8, 0.2);
    await frame(page);
    await expect(page.locator("canvas")).toHaveAttribute("data-pointers", "1");
    await contact(page, "pointerup", 12, 0, 0);
    await page.waitForTimeout(900);
  }
});

test("T47/SQ05: reduced motion overrides stored Playful, while the stronger touch response and silence remain", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await launch(page, "playful");
  const rest = await pixels(page);
  await contact(page, "pointerdown", 1, 0.6, 0);
  await contact(page, "pointermove", 1, 1.7, 0);
  await frame(page);
  expect(await difference(rest, await pixels(page))).toBeGreaterThan(1500);
  await contact(page, "pointerup", 1, 0, 0);
  await page.waitForTimeout(700);
  expect(await pixels(page)).toBe(rest);
  await page
    .getByRole("button", { name: "Open parent settings", exact: true })
    .press("Enter");
  await page.getByText("Technical status", { exact: true }).click();
  const status = JSON.parse(await page.locator(".runtime-status").innerText());
  expect(status.effectiveMotion).toBe("gentle");
  expect(status.audioEnabled).toBe(false);
  expect(status.musicEnabled).toBe(false);
  expect(status.voices).toBe(0);
  expect(status.residentImages).toBe(6);
  expect(status.preparedRasterBytes).toBe(768 * 768 * 4);
  await page
    .getByRole("button", { name: "Close parent settings", exact: true })
    .click();
  await page.getByRole("button", { name: "Toybox", exact: true }).click();
  await page
    .getByRole("button", { name: "Penguin Bounce", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Open parent settings", exact: true })
    .press("Enter");
  await page.getByText("Technical status", { exact: true }).click();
  expect(
    JSON.parse(await page.locator(".runtime-status").innerText())
      .preparedRasterBytes,
  ).toBe(0);
});
