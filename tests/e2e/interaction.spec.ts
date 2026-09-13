import { expect, test, type Page } from "./fixtures";
import sharp from "sharp";

// These are browser-injected PointerEvent checks, not physical touch or iPad evidence.
type Contact = {
  type: string;
  id: number;
  x: number;
  y: number;
  primary?: boolean;
};
async function contact(page: Page, event: Contact) {
  await page.locator("canvas").evaluate((canvas, value) => {
    const rect = canvas.getBoundingClientRect();
    canvas.dispatchEvent(
      new PointerEvent(value.type, {
        bubbles: true,
        pointerId: value.id,
        pointerType: "touch",
        isPrimary: value.primary ?? false,
        button: 0,
        buttons: value.type === "pointerup" ? 0 : 1,
        clientX: rect.left + value.x * rect.width,
        clientY: rect.top + value.y * rect.height,
      }),
    );
  }, event);
}
async function frame(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
}
async function ready(page: Page) {
  await page.goto("/");
  await expect(page.locator("canvas")).toHaveAttribute("data-toy", "squishy");
  await frame(page);
}
async function choose(page: Page, name: string) {
  await page.getByRole("button", { name: "Toybox", exact: true }).click();
  await page.getByRole("button", { name, exact: true }).click();
}
async function changedPixels(
  before: Buffer,
  after: Buffer,
  start = 0,
  end = 1,
) {
  const a = await sharp(before)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const b = await sharp(after)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  expect(b.info).toEqual(a.info);
  let changed = 0;
  for (let y = 0; y < a.info.height; y++)
    for (
      let x = Math.floor(a.info.width * start);
      x < Math.floor(a.info.width * end);
      x++
    ) {
      const i = (y * a.info.width + x) * a.info.channels;
      if (
        Math.abs(a.data[i] - b.data[i]) +
          Math.abs(a.data[i + 1] - b.data[i + 1]) +
          Math.abs(a.data[i + 2] - b.data[i + 2]) >
        25
      )
        changed++;
    }
  return changed;
}

test("T01/T08: fresh silent play begins directly and has visible local deformation", async ({
  page,
}, testInfo) => {
  await ready(page);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Sound is muted", exact: true }),
  ).toBeVisible();
  const before = await page.locator("canvas").screenshot();
  await contact(page, {
    type: "pointerdown",
    id: 11,
    x: 0.69,
    y: 0.5,
    primary: true,
  });
  await contact(page, { type: "pointermove", id: 11, x: 0.88, y: 0.5 });
  await frame(page);
  const after = await page.locator("canvas").screenshot();
  const near = await changedPixels(before, after, 0.65, 1);
  const opposite = await changedPixels(before, after, 0, 0.35);
  expect(near).toBeGreaterThan(500);
  expect(opposite).toBeLessThan(near / 5);
  await testInfo.attach("squishy-local-deformation", {
    body: after,
    contentType: "image/png",
  });
});

test("T02/T04/T05: non-primary contacts remain independent through release and repeated cancellation", async ({
  page,
}) => {
  await ready(page);
  const canvas = page.locator("canvas");
  await contact(page, {
    type: "pointerdown",
    id: 10,
    x: 0.05,
    y: 0.1,
    primary: true,
  });
  await contact(page, { type: "pointerdown", id: 20, x: 0.33, y: 0.5 });
  await contact(page, { type: "pointerdown", id: 30, x: 0.67, y: 0.5 });
  await expect(canvas).toHaveAttribute("data-pointers", "3");
  await contact(page, { type: "pointermove", id: 20, x: 0.14, y: 0.5 });
  await contact(page, { type: "pointermove", id: 30, x: 0.86, y: 0.5 });
  await contact(page, { type: "pointercancel", id: 20, x: 0.14, y: 0.5 });
  await contact(page, { type: "lostpointercapture", id: 20, x: 0.14, y: 0.5 });
  await expect(canvas).toHaveAttribute("data-pointers", "2");
  await contact(page, { type: "pointerup", id: 10, x: 0.05, y: 0.1 });
  await expect(canvas).toHaveAttribute("data-pointers", "1");
  await frame(page);
  const before = await canvas.screenshot();
  await contact(page, { type: "pointermove", id: 30, x: 0.68, y: 0.65 });
  await frame(page);
  expect(
    await changedPixels(before, await canvas.screenshot()),
  ).toBeGreaterThan(500);
  await contact(page, { type: "pointerup", id: 30, x: 0.68, y: 0.65 });
  await expect(canvas).toHaveAttribute("data-pointers", "0");
});

test("T03: fifth contact remains ignored after another contact lifts", async ({
  page,
}) => {
  await ready(page);
  const canvas = page.locator("canvas");
  for (let id = 1; id <= 5; id++)
    await contact(page, {
      type: "pointerdown",
      id,
      x: 0.1 + id * 0.12,
      y: 0.5,
    });
  await expect(canvas).toHaveAttribute("data-pointers", "4");
  await contact(page, { type: "pointerup", id: 1, x: 0.22, y: 0.5 });
  await contact(page, { type: "pointermove", id: 5, x: 0.85, y: 0.5 });
  await contact(page, { type: "pointerdown", id: 5, x: 0.7, y: 0.5 });
  await expect(canvas).toHaveAttribute("data-pointers", "3");
  await contact(page, { type: "pointerup", id: 5, x: 0.85, y: 0.5 });
  await contact(page, { type: "pointerdown", id: 5, x: 0.7, y: 0.5 });
  await expect(canvas).toHaveAttribute("data-pointers", "4");
});

for (const reason of [
  "resize",
  "pause",
  "toybox",
  "settings",
  "blur",
  "hide",
] as const) {
  test(`T06: ${reason} cancels active contacts and rejects stale movement`, async ({
    page,
  }) => {
    await ready(page);
    await contact(page, { type: "pointerdown", id: 31, x: 0.68, y: 0.5 });
    await contact(page, { type: "pointermove", id: 31, x: 0.86, y: 0.5 });
    await expect(page.locator("canvas")).toHaveAttribute("data-pointers", "1");
    if (reason === "resize")
      await page.setViewportSize({ width: 1080, height: 810 });
    if (reason === "pause")
      await page
        .getByRole("button", { name: "Pause play", exact: true })
        .click();
    if (reason === "toybox")
      await page.getByRole("button", { name: "Toybox", exact: true }).click();
    if (reason === "settings")
      await page
        .getByRole("button", { name: "Open parent settings", exact: true })
        .press("Enter");
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
    await expect(page.locator("canvas")).toHaveAttribute("data-pointers", "0");
    await contact(page, { type: "pointermove", id: 31, x: 0.9, y: 0.2 });
    await expect(page.locator("canvas")).toHaveAttribute("data-pointers", "0");
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
  });
}

test("T23: Pause freezes the drawn toy and input until explicit Resume", async ({
  page,
}) => {
  await ready(page);
  await contact(page, { type: "pointerdown", id: 1, x: 0.69, y: 0.5 });
  await contact(page, { type: "pointermove", id: 1, x: 0.87, y: 0.5 });
  await frame(page);
  await page.getByRole("button", { name: "Pause play", exact: true }).click();
  const before = await page
    .locator("canvas")
    .evaluate((canvas) => (canvas as HTMLCanvasElement).toDataURL());
  await contact(page, { type: "pointerdown", id: 2, x: 0.4, y: 0.5 });
  await page.waitForTimeout(350);
  const after = await page
    .locator("canvas")
    .evaluate((canvas) => (canvas as HTMLCanvasElement).toDataURL());
  expect(after).toBe(before);
  await expect(page.locator("canvas")).toHaveAttribute("data-pointers", "0");
  await page
    .getByRole("button", { name: "Resume play", exact: true })
    .first()
    .click();
  await contact(page, { type: "pointerdown", id: 3, x: 0.5, y: 0.5 });
  await expect(page.locator("canvas")).toHaveAttribute("data-pointers", "1");
});

for (const dpr of [1, 1.5, 2]) {
  test(`T07: logical touch location is consistent at DPR ${dpr}`, async ({
    toyBrowser: browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 810, height: 1080 },
      deviceScaleFactor: dpr,
    });
    const page = await context.newPage();
    try {
      await page.goto(baseURL!);
      await frame(page);
      const before = await page.locator("canvas").screenshot();
      await contact(page, { type: "pointerdown", id: 7, x: 0.69, y: 0.5 });
      await contact(page, { type: "pointermove", id: 7, x: 0.9, y: 0.5 });
      await frame(page);
      expect(
        await changedPixels(before, await page.locator("canvas").screenshot()),
      ).toBeGreaterThan(500);
      expect(
        await page
          .locator("canvas")
          .evaluate(
            (canvas) =>
              (canvas as HTMLCanvasElement).width *
              (canvas as HTMLCanvasElement).height,
          ),
      ).toBeLessThanOrEqual(2_000_000);
    } finally {
      await context.close();
    }
  });
}

test("T09: four opposing stretches stay visible and recover after release", async ({
  page,
}, testInfo) => {
  await ready(page);
  const starts = [
    [0.69, 0.5],
    [0.5, 0.66],
    [0.31, 0.5],
    [0.5, 0.34],
  ];
  const ends = [
    [1.5, 0.5],
    [0.5, 1.5],
    [-0.5, 0.5],
    [0.5, -0.5],
  ];
  for (let i = 0; i < 4; i++)
    await contact(page, {
      type: "pointerdown",
      id: i + 1,
      x: starts[i][0],
      y: starts[i][1],
    });
  for (let i = 0; i < 4; i++)
    await contact(page, {
      type: "pointermove",
      id: i + 1,
      x: ends[i][0],
      y: ends[i][1],
    });
  await frame(page);
  await testInfo.attach("four-opposing-synthetic-stretches", {
    body: await page.locator("canvas").screenshot(),
    contentType: "image/png",
  });
  await expect(page.locator("canvas")).toHaveAttribute("data-pointers", "4");
  for (const id of [2, 4, 1, 3])
    await contact(page, { type: "pointerup", id, x: 0.5, y: 0.5 });
  await expect(page.locator("canvas")).toHaveAttribute("data-pointers", "0");
  await contact(page, { type: "pointerdown", id: 9, x: 0.5, y: 0.5 });
  await expect(page.locator("canvas")).toHaveAttribute("data-pointers", "1");
});

test("T31/T33/T34: complete toy switching stays same-origin with neutral product copy", async ({
  page,
}) => {
  const requests: string[] = [];
  const errors: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("pageerror", (error) => errors.push(error.message));
  await ready(page);
  for (const [name, id] of [
    ["Bubble Pond", "bubbles"],
    ["Roll & Nest", "nest"],
    ["Penguin Bounce", "bounce"],
    ["Squishy Friend", "squishy"],
  ]) {
    await choose(page, name);
    await expect(page.locator("canvas")).toHaveAttribute("data-toy", id);
    await expect(page.locator("canvas")).toHaveAttribute("data-pointers", "0");
  }
  await page
    .getByRole("button", { name: "Open parent settings", exact: true })
    .press("Enter");
  const body = await page.locator("body").innerText();
  expect(body).not.toMatch(
    /daily streak|leaderboard|developmental score|treats autism|improves IQ|keep playing to earn/i,
  );
  const origin = new URL(page.url()).origin;
  expect(requests.every((url) => new URL(url).origin === origin)).toBe(true);
  expect(errors).toEqual([]);
});

test("T33: delayed sprite completion cannot replace the selected toy", async ({
  toyBrowser: browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    viewport: { width: 810, height: 1080 },
    serviceWorkers: "block",
  });
  const page = await context.newPage();
  let unblock: () => void = () => {};
  const pending = new Promise<void>((resolve) => {
    unblock = resolve;
  });
  let requested = false;
  await context.route("**/assets/friend.webp", async (route) => {
    requested = true;
    await pending;
    await route.continue();
  });
  try {
    await page.goto(baseURL!, { waitUntil: "domcontentloaded" });
    await expect(page.locator("canvas")).toHaveAttribute("data-toy", "squishy");
    await expect.poll(() => requested).toBe(true);
    for (const name of ["Bubble Pond", "Penguin Bounce", "Squishy Friend", "Roll & Nest"])
      await choose(page, name);
    await expect(page.locator("canvas")).toHaveAttribute("data-toy", "nest");
    unblock();
    await page.waitForLoadState("load");
    await frame(page);
    await expect(page.locator("canvas")).toHaveAttribute("data-toy", "nest");
    await expect(page.locator("canvas")).toHaveAttribute("data-pointers", "0");
  } finally {
    unblock();
    await context.close();
  }
});
