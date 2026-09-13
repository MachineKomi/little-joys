import { expect, test, type Page } from "./fixtures";
import { ATTENTION_SECONDS, BounceWorld } from "../../src/toys/bounce/physics";

// Production-page input and rendering checks. Synthetic contacts, a fake
// browser clock and desktop timing do not establish physical iPad behavior or
// player enjoyment.
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
async function tap(page: Page, id: number, x: number, y: number) {
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
type Status = Record<string, number | string | boolean | number[]>;
async function status(page: Page): Promise<Status> {
  const open = await page
    .locator(".technical-details")
    .evaluate((element) => (element as HTMLDetailsElement).open);
  if (!open) await page.getByText("Technical status", { exact: true }).click();
  await page
    .getByRole("button", { name: "Refresh technical status", exact: true })
    .click();
  return JSON.parse(await page.locator(".runtime-status").innerText()) as Status;
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
/** Mechanism positions from the same pure layout the scene uses, as canvas fractions. */
async function board(page: Page) {
  const size = await page.getByTestId("play-canvas").evaluate((canvas) => {
    const rect = canvas.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  });
  const world = new BounceWorld(size, { cap: 16, motion: "gentle" });
  const at = (point: { x: number; y: number }) => ({
    x: point.x / size.width,
    y: point.y / size.height,
  });
  return {
    deflectors: world.deflectors.map(at),
    spinner: at(world.spinners[0]),
    bumpers: world.bumpers.map(at),
    penguin: at({
      x: world.chute.x,
      y: (world.shelf.top + world.shelf.bottom) / 2,
    }),
    /** Open board space just below the penguin's shelf. */
    open: (fraction: number) =>
      at({
        x: world.bounds.left + fraction * (world.bounds.right - world.bounds.left),
        y: world.bounds.top + world.radius * 1.5,
      }),
  };
}
async function installFrameProbe(page: Page) {
  await page.addInitScript(() => {
    const probe = { count: 0 };
    (window as unknown as { bounceFrameProbe: typeof probe }).bounceFrameProbe =
      probe;
    const original = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) =>
      original((time) => {
        probe.count++;
        callback(time);
      });
  });
}
const frames = (page: Page) =>
  page.evaluate(
    () =>
      (window as unknown as { bounceFrameProbe: { count: number } })
        .bounceFrameProbe.count,
  );
const hidden = (page: Page, value: boolean) =>
  page.evaluate((next) => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: next,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  }, value);

test("T36/T40: ordinary taps add or reuse immediately, holds do not repeat, and all three parent limits apply", async ({
  page,
}) => {
  await launch(page);
  const layout = await board(page);
  await parents(page);
  const initial = await status(page);
  expect(initial).toMatchObject({
    bounceBallLimit: 16,
    bounceInputSpawns: 0,
    bounceFlowActive: true,
  });
  expect(initial.bounceBalls as number).toBeGreaterThanOrEqual(3);
  await closeParents(page);
  const held = layout.open(0.2);
  await contact(page, "pointerdown", 11, held.x, held.y);
  await page.waitForTimeout(500);
  await contact(page, "pointerup", 11, held.x, held.y);
  await parents(page);
  expect((await status(page)).bounceInputSpawns).toBe(1);
  await closeParents(page);
  for (const cap of [8, 16, 24]) {
    await parents(page);
    await page
      .getByRole("combobox", { name: "Bouncing balls", exact: true })
      .selectOption(String(cap));
    await closeParents(page);
    for (let index = 0; index < cap + 3; index++) {
      const point = layout.open(0.05 + (index % 6) * 0.18);
      await tap(page, 20 + index, point.x, point.y);
    }
    await parents(page);
    const current = await status(page);
    expect(current.bounceBallLimit).toBe(cap);
    expect(current.bounceBalls).toBe(cap);
    // Settings rebuild the scene from its snapshot; counters start again there.
    expect(current.bounceInputSpawns).toBe(cap + 3);
    expect(current.effects as number).toBeLessThanOrEqual(24);
    expect(current.voices).toBe(0);
    expect(current.audioEnabled).toBe(false);
    await closeParents(page);
  }
});

test("T36/T38: deflectors, pinwheel and bumper respond without adding a ball; penguin taps dispense; contacts cancel safely", async ({
  page,
}) => {
  await launch(page);
  const layout = await board(page);
  const canvas = page.getByTestId("play-canvas");
  await parents(page);
  const before = await status(page);
  await closeParents(page);
  await tap(page, 1, layout.deflectors[0].x, layout.deflectors[0].y);
  await tap(page, 2, layout.deflectors[1].x, layout.deflectors[1].y);
  await tap(page, 3, layout.spinner.x, layout.spinner.y);
  await tap(page, 4, layout.bumpers[2].x, layout.bumpers[2].y);
  await parents(page);
  const turned = await status(page);
  expect(turned.bounceInputSpawns).toBe(0);
  expect(turned.bounceDeflectorAngles).toEqual(
    (before.bounceDeflectorAngles as number[]).map((angle) => (angle + 1) % 4),
  );
  expect(Math.abs(turned.bounceSpinnerSpin as number)).toBeGreaterThan(0);
  await closeParents(page);
  // Three quick penguin taps each dispense from the chute; passive flow alone
  // cannot add three balls this quickly.
  for (const id of [5, 6, 7]) await tap(page, id, layout.penguin.x, layout.penguin.y);
  await parents(page);
  const dispensed = await status(page);
  expect(dispensed.bounceInputSpawns).toBe(0);
  expect(dispensed.bounceFlowSpawns as number).toBeGreaterThanOrEqual(
    (turned.bounceFlowSpawns as number) + 3,
  );
  await closeParents(page);
  for (let id = 1; id <= 5; id++) {
    const point = layout.open(0.1 + id * 0.15);
    await contact(page, "pointerdown", id + 10, point.x, point.y);
  }
  await expect(canvas).toHaveAttribute("data-pointers", "4");
  await contact(page, "pointercancel", 12, 0.4, 0.16);
  await contact(page, "lostpointercapture", 12, 0.4, 0.16);
  await contact(page, "pointermove", 15, 0.2, 0.8);
  await expect(canvas).toHaveAttribute("data-pointers", "3");
  await contact(page, "pointermove", 13, 0.55, 0.7);
  for (const id of [14, 11, 13, 15])
    await contact(page, "pointerup", id, 0.5, 0.5);
  await expect(canvas).toHaveAttribute("data-pointers", "0");
});

test("T38: every shared stop path cancels Penguin Bounce contacts and pause freezes its canvas", async ({
  page,
}) => {
  await launch(page);
  const layout = await board(page);
  const open = layout.open(0.5);
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
    await contact(page, "pointerdown", 31, open.x, open.y);
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
    if (reason === "hide") await hidden(page, true);
    await expect(canvas).toHaveAttribute("data-pointers", "0");
    await contact(page, "pointermove", 31, 0.9, 0.7);
    await expect(canvas).toHaveAttribute("data-pointers", "0");
    if (reason === "pause") {
      // The board is flowing: a frozen frame proves the paused runtime stopped.
      const frozen = await canvas.evaluate((node) =>
        (node as HTMLCanvasElement).toDataURL(),
      );
      await contact(page, "pointerdown", 80, 0.25, 0.5);
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
    if (reason === "hide") await hidden(page, false);
  }
  await tap(page, 99, open.x, open.y);
  await parents(page);
  expect((await status(page)).bounceInputSpawns as number).toBeGreaterThanOrEqual(1);
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

test("T39 (amended): the penguin supplies balls without taps; pause and hiding stop flow and animation without a catch-up burst", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await installFrameProbe(page);
  await launch(page);
  // Gentle dispenses 1.6s after entry, then every 1.8s.
  await page.waitForTimeout(4200);
  await parents(page);
  const flowing = await status(page);
  expect(flowing).toMatchObject({
    bounceFlowActive: true,
    bounceInputSpawns: 0,
  });
  expect(flowing.bounceFlowSpawns as number).toBeGreaterThanOrEqual(1);
  expect(flowing.bounceBalls as number).toBeGreaterThan(3);
  // Parent settings pause the toy underneath: no simulation, flow or frames.
  const pausedFrames = await frames(page);
  await page.waitForTimeout(3000);
  expect(await frames(page)).toBe(pausedFrames);
  expect((await status(page)).bounceFlowSpawns).toBe(flowing.bounceFlowSpawns);
  await closeParents(page);
  await expect.poll(() => frames(page)).toBeGreaterThan(pausedFrames);
  await parents(page);
  const beforeHidden = await status(page);
  await closeParents(page);
  await hidden(page, true);
  const hiddenFrames = await frames(page);
  await page.waitForTimeout(5000);
  expect(await frames(page)).toBe(hiddenFrames);
  await hidden(page, false);
  await page.waitForTimeout(150);
  await parents(page);
  const resumed = await status(page);
  // Five hidden seconds would contain two Gentle dispenses if replayed.
  expect(
    (resumed.bounceFlowSpawns as number) -
      (beforeHidden.bounceFlowSpawns as number),
  ).toBeLessThanOrEqual(1);
  expect(resumed.bounceFlowActive).toBe(true);
});

test("T39 (amended): without touches the flow ends after its attended window and the dense Playful board sleeps (fake browser clock)", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await page.clock.install();
  await installFrameProbe(page);
  await page.addInitScript(() =>
    localStorage.setItem(
      "little-joys-settings-v1",
      JSON.stringify({
        lastToy: "bounce",
        motion: "playful",
        bounceBallCount: 24,
      }),
    ),
  );
  await page.goto("/");
  const canvas = page.getByTestId("play-canvas");
  await expect(canvas).toHaveAttribute("data-toy", "bounce");
  await expect(canvas).toHaveAttribute("data-art", "6");
  // Flow and attention only advance through stepped frames, so the fake clock
  // runs every animation frame rather than jumping over hidden time.
  await page.clock.runFor(ATTENTION_SECONDS * 1000 + 25_000);
  const settledFrames = await frames(page);
  expect(settledFrames).toBeGreaterThan(1000);
  const still = await canvas.evaluate((node) =>
    (node as HTMLCanvasElement).toDataURL(),
  );
  await page.clock.runFor(3000);
  expect(await frames(page)).toBe(settledFrames);
  expect(
    await canvas.evaluate((node) => (node as HTMLCanvasElement).toDataURL()),
  ).toBe(still);
  await parents(page);
  const settled = await status(page);
  expect(settled).toMatchObject({
    bounceFlowActive: false,
    bounceBalls: 24,
    bounceActiveBalls: 0,
    bounceSettledBalls: 24,
    bounceSpinnerSpin: 0,
    effects: 0,
  });
  expect(settled.bounceFlowSpawns as number).toBeGreaterThan(40);
});
