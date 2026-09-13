import { expect, test, type Page } from "./fixtures";

// Production-page input and rendering checks. Synthetic contacts and desktop
// timing do not establish physical iPad behavior or player enjoyment.
async function contact(
  page: Page,
  type: string,
  id: number,
  x: number,
  y: number,
) {
  await page.getByTestId("play-canvas").evaluate(
    (canvas, value) => {
      const rect = canvas.getBoundingClientRect();
      canvas.dispatchEvent(
        new PointerEvent(value.type, {
          bubbles: true,
          pointerId: value.id,
          pointerType: "touch",
          isPrimary: false,
          button: 0,
          buttons: value.type === "pointerup" ? 0 : 1,
          clientX: rect.left + value.x * rect.width,
          clientY: rect.top + value.y * rect.height,
        }),
      );
    },
    { type, id, x, y },
  );
}
async function tap(page: Page, id: number, x = 0.5, y = 0.12) {
  await contact(page, "pointerdown", id, x, y);
  await contact(page, "pointerup", id, x, y);
}
async function parents(page: Page) {
  await page
    .getByRole("button", { name: "Open parent settings", exact: true })
    .press("Enter");
  await expect(
    page.getByRole("dialog", { name: "Parent settings", exact: true }),
  ).toBeVisible();
}
async function closeParents(page: Page) {
  await page
    .getByRole("button", { name: "Close parent settings", exact: true })
    .click();
}
async function status(page: Page) {
  await page.getByText("Technical status", { exact: true }).click();
  await page
    .getByRole("button", { name: "Refresh technical status", exact: true })
    .click();
  return JSON.parse(
    await page.locator(".runtime-status").innerText(),
  ) as Record<string, number | string | boolean>;
}
async function launch(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Toybox", exact: true }).click();
  await page
    .getByRole("button", { name: "Penguin Bounce", exact: true })
    .click();
  await expect(page.getByTestId("play-canvas")).toHaveAttribute(
    "data-toy",
    "bounce",
  );
  await expect(page.getByTestId("play-canvas")).toHaveAttribute(
    "data-art",
    "6",
  );
}

test("T36/T40: ordinary taps add/reuse immediately, holds do not repeat, and all three parent limits apply", async ({
  page,
}) => {
  await launch(page);
  await parents(page);
  const initial = await status(page);
  expect(initial).toMatchObject({
    bounceBalls: 3,
    bounceBallLimit: 16,
    bounceActiveBalls: 0,
  });
  await closeParents(page);
  await contact(page, "pointerdown", 11, 0.5, 0.12);
  await page.waitForTimeout(500);
  await contact(page, "pointerup", 11, 0.5, 0.12);
  await parents(page);
  expect((await status(page)).bounceBalls).toBe(4);
  await closeParents(page);
  for (const cap of [8, 16, 24]) {
    await parents(page);
    await page
      .getByRole("combobox", { name: "Bouncing balls", exact: true })
      .selectOption(String(cap));
    await closeParents(page);
    for (let index = 0; index < cap + 3; index++)
      await tap(page, 20 + index, 0.14 + (index % 6) * 0.14, 0.1);
    await parents(page);
    const current = await status(page);
    expect(current.bounceBallLimit).toBe(cap);
    expect(current.bounceBalls).toBe(cap);
    expect(current.effects).toBeLessThanOrEqual(24);
    expect(current.voices).toBe(0);
    expect(current.audioEnabled).toBe(false);
    await closeParents(page);
  }
});

test("T36/T38: both broad deflectors visibly turn without adding a ball; independent contacts cancel safely", async ({
  page,
}, testInfo) => {
  await launch(page);
  const canvas = page.getByTestId("play-canvas");
  const before = await canvas.screenshot();
  // Centers of the two visible broad deflectors at the reference portrait layout.
  await tap(page, 1, 0.29, 0.45);
  await tap(page, 2, 0.71, 0.635);
  await parents(page);
  expect((await status(page)).bounceBalls).toBe(3);
  await closeParents(page);
  const after = await canvas.screenshot();
  expect(after.equals(before)).toBe(false);
  await testInfo.attach("turned-penguin-deflectors", {
    body: after,
    contentType: "image/png",
  });
  for (let id = 1; id <= 5; id++)
    await contact(page, "pointerdown", id, 0.1 + id * 0.15, 0.16);
  await expect(canvas).toHaveAttribute("data-pointers", "4");
  await contact(page, "pointercancel", 2, 0.4, 0.16);
  await contact(page, "lostpointercapture", 2, 0.4, 0.16);
  await contact(page, "pointermove", 5, 0.2, 0.8);
  await expect(canvas).toHaveAttribute("data-pointers", "3");
  await contact(page, "pointermove", 3, 0.55, 0.7);
  for (const id of [4, 1, 3, 5]) await contact(page, "pointerup", id, 0.5, 0.5);
  await expect(canvas).toHaveAttribute("data-pointers", "0");
});

test("T38: every shared stop path cancels Penguin Bounce contacts and pause freezes its canvas", async ({
  page,
}) => {
  await launch(page);
  const canvas = page.getByTestId("play-canvas");
  const portraitBacking = await canvas.evaluate((node) => ({
    width: (node as HTMLCanvasElement).width,
    height: (node as HTMLCanvasElement).height,
  }));
  for (const reason of [
    "pause",
    "settings",
    "toybox",
    "resize",
    "blur",
    "hide",
  ]) {
    await contact(page, "pointerdown", 31, 0.5, 0.12);
    await expect(canvas, `${reason}: fresh contact is active`).toHaveAttribute(
      "data-pointers",
      "1",
    );
    if (reason === "pause")
      await page
        .getByRole("button", { name: "Pause play", exact: true })
        .click();
    if (reason === "settings") await parents(page);
    if (reason === "toybox")
      await page.getByRole("button", { name: "Toybox", exact: true }).click();
    if (reason === "resize")
      await page.setViewportSize({ width: 1080, height: 810 });
    if (reason === "blur")
      await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    if (reason === "hide")
      await page.evaluate(() => {
        Object.defineProperty(document, "hidden", {
          configurable: true,
          value: true,
        });
        document.dispatchEvent(new Event("visibilitychange"));
      });
    await expect(canvas).toHaveAttribute("data-pointers", "0");
    await contact(page, "pointermove", 31, 0.9, 0.7);
    await expect(canvas).toHaveAttribute("data-pointers", "0");
    if (reason === "pause") {
      const frozen = await canvas.evaluate((node) =>
        (node as HTMLCanvasElement).toDataURL(),
      );
      await contact(page, "pointerdown", 80, 0.25, 0.2);
      await page.waitForTimeout(300);
      expect(
        await canvas.evaluate((node) =>
          (node as HTMLCanvasElement).toDataURL(),
        ),
      ).toBe(frozen);
      await expect(canvas).toHaveAttribute("data-pointers", "0");
      await page
        .getByRole("button", { name: "Resume play", exact: true })
        .click();
    }
    if (reason === "settings") await closeParents(page);
    if (reason === "toybox")
      await page
        .getByRole("button", { name: "Close toybox", exact: true })
        .click();
    if (reason === "resize") {
      await page.setViewportSize({ width: 810, height: 1080 });
      // The viewport command can finish before ResizeObserver cancels contacts
      // and restores the backing. Finish that resize before testing blur.
      await expect(canvas).toHaveAttribute("width", String(portraitBacking.width));
      await expect(canvas).toHaveAttribute("height", String(portraitBacking.height));
    }
    if (reason === "blur")
      await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    if (reason === "hide")
      await page.evaluate(() => {
        Object.defineProperty(document, "hidden", {
          configurable: true,
          value: false,
        });
        document.dispatchEvent(new Event("visibilitychange"));
      });
  }
  await tap(page, 99);
  await parents(page);
  expect((await status(page)).bounceBalls).toBeGreaterThan(3);
});

test("T39/T40/T41: fourth-toy startup and count persist; system reduced motion overrides the saved choice", async ({
  page,
}) => {
  await launch(page);
  await parents(page);
  await page
    .getByRole("combobox", { name: "Open with", exact: true })
    .selectOption("bounce");
  await page
    .getByRole("combobox", { name: "Bouncing balls", exact: true })
    .selectOption("24");
  await page
    .getByRole("combobox", { name: "Motion", exact: true })
    .selectOption("playful");
  await closeParents(page);
  await page.reload();
  await expect(page.getByTestId("play-canvas")).toHaveAttribute(
    "data-toy",
    "bounce",
  );
  await expect(
    page.getByRole("button", { name: "Sound is muted", exact: true }),
  ).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await parents(page);
  await expect(
    page.getByRole("combobox", { name: "Bouncing balls", exact: true }),
  ).toHaveValue("24");
  await expect(
    page.getByRole("combobox", { name: "Motion", exact: true }),
  ).toHaveValue("playful");
  expect(await status(page)).toMatchObject({
    toy: "bounce",
    effectiveMotion: "gentle",
    bounceBallLimit: 24,
    audioEnabled: false,
  });
});

for (const motion of ["gentle", "playful"]) {
  test(`T39: ${motion} dense board settles and stops requesting animation frames`, async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.addInitScript(() => {
      const probe = { count: 0, lastAt: 0 };
      (
        window as unknown as { bounceFrameProbe: typeof probe }
      ).bounceFrameProbe = probe;
      const original = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (callback) =>
        original((time) => {
          probe.count++;
          probe.lastAt = performance.now();
          callback(time);
        });
    });
    await launch(page);
    await parents(page);
    await page
      .getByRole("combobox", { name: "Motion", exact: true })
      .selectOption(motion);
    await page
      .getByRole("combobox", { name: "Bouncing balls", exact: true })
      .selectOption("24");
    await closeParents(page);
    for (let index = 0; index < 24; index++)
      await tap(page, index + 1, 0.14 + (index % 6) * 0.14, 0.12);
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const probe = (
              window as unknown as {
                bounceFrameProbe: { count: number; lastAt: number };
              }
            ).bounceFrameProbe;
            return probe.count > 4 && performance.now() - probe.lastAt > 900;
          }),
        { timeout: 45_000, intervals: [250, 500] },
      )
      .toBe(true);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Pause play", exact: true }),
    ).toBeVisible();
    await parents(page);
    expect(await status(page)).toMatchObject({
      bounceBalls: 24,
      bounceActiveBalls: 0,
      bounceSettledBalls: 24,
      effects: 0,
    });
  });
}
