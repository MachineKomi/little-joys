import { expect, test, type Page } from "@playwright/test";

async function openParents(page: Page) {
  await page
    .getByRole("button", { name: "Open parent settings", exact: true })
    .press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
}

for (const view of [
  { width: 810, height: 1080 },
  { width: 1080, height: 810 },
  { width: 360, height: 640 },
  { width: 1440, height: 900 },
]) {
  test(`T25/T26: reachable semantic layout at ${view.width}x${view.height}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(view);
    await page.goto("/");
    const children = page.locator(".child-controls button");
    await expect(children).toHaveCount(3);
    const rectangles = await children.evaluateAll((elements) =>
      elements.map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      }),
    );
    rectangles.forEach((rect) => {
      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.y).toBeGreaterThanOrEqual(0);
      expect(rect.x + rect.width).toBeLessThanOrEqual(view.width);
      expect(rect.y + rect.height).toBeLessThanOrEqual(view.height);
    });
    for (let i = 1; i < rectangles.length; i++)
      expect(
        rectangles[i].x - rectangles[i - 1].x - rectangles[i - 1].width,
      ).toBeGreaterThanOrEqual(11.9);
    if (view.width === 810 || view.width === 1080) {
      rectangles.forEach((rect) => {
        expect(rect.width).toBeGreaterThanOrEqual(72);
        expect(rect.height).toBeGreaterThanOrEqual(72);
      });
      const toolbar = await page.locator(".toolbar").boundingBox();
      expect(toolbar!.height).toBeLessThanOrEqual(view.height * 0.2);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await testInfo.attach(`squishy-${view.width}x${view.height}`, {
      body: await page.screenshot(),
      contentType: "image/png",
    });
    await page.getByRole("button", { name: "Toybox", exact: true }).click();
    await expect(page.locator(".toy-tile")).toHaveCount(3);
    const tiles = await page.locator(".toy-tile").evaluateAll((elements) =>
      elements.map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, right: r.right, bottom: r.bottom };
      }),
    );
    for (const r of tiles) {
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.right).toBeLessThanOrEqual(view.width);
      expect(r.bottom).toBeLessThanOrEqual(view.height);
    }
    await testInfo.attach(`toybox-${view.width}x${view.height}`, {
      body: await page.screenshot(),
      contentType: "image/png",
    });
    await page
      .getByRole("button", { name: "Close toybox", exact: true })
      .click();
    await openParents(page);
    await testInfo.attach(`parents-${view.width}x${view.height}`, {
      body: await page.screenshot(),
      contentType: "image/png",
    });
    const viewport = await page
      .locator('meta[name="viewport"]')
      .getAttribute("content");
    expect(viewport).not.toMatch(/user-scalable\s*=\s*no|maximum-scale/i);
    expect(
      await page
        .locator("canvas")
        .evaluate((element) => getComputedStyle(element).touchAction),
    ).toBe("none");
    expect(
      await page
        .getByRole("dialog")
        .evaluate((element) => getComputedStyle(element).touchAction),
    ).not.toBe("none");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Open parent settings", exact: true }),
    ).toBeFocused();
  });
}

test("T26: parent keyboard alternative has visible focus and every form control has a label", async ({
  page,
}) => {
  await page.goto("/");
  const parent = page.getByRole("button", {
    name: "Open parent settings",
    exact: true,
  });
  await parent.focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  const focus = await parent.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      outline: style.outlineStyle,
      width: style.outlineWidth,
      shadow: style.boxShadow,
    };
  });
  expect(
    (focus.outline !== "none" && focus.width !== "0px") ||
      focus.shadow !== "none",
  ).toBe(true);
  await openParents(page);
  const labels = await page
    .getByRole("dialog")
    .locator("input, select, textarea")
    .evaluateAll((elements) =>
      elements.map((element) => {
        const field = element as HTMLInputElement;
        return Boolean(
          field.labels?.length ||
            element.getAttribute("aria-label") ||
            element.getAttribute("aria-labelledby"),
        );
      }),
    );
  expect(labels.length).toBeGreaterThan(5);
  expect(labels.every(Boolean)).toBe(true);
});

test("T21/T27: corrupt or unavailable storage still opens a silent usable toy", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("little-joys-settings-v1", "{invalid");
    Storage.prototype.setItem = () => {
      throw new DOMException("Test storage unavailable", "QuotaExceededError");
    };
  });
  await page.goto("/");
  await expect(page.locator("canvas")).toHaveAttribute("data-toy", "squishy");
  await expect(
    page.getByRole("button", { name: "Sound is muted", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Sound is muted", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Sound is muted", exact: true }),
  ).toBeVisible();
  await openParents(page);
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("T21: explicit mute persists and the child control never enables sound", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Sound is muted", exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Sound is muted", exact: true }),
  ).toBeVisible();
  await openParents(page);
  await expect(
    page.getByRole("switch", { name: "Toy sounds", exact: true }),
  ).toHaveAttribute("aria-checked", "false");
  await page.getByText("Technical status", { exact: true }).click();
  const status = JSON.parse(await page.locator(".runtime-status").innerText());
  expect(status.audioState).toBe("not-created");
  expect(status.audioEnabled).toBe(false);
});

test("T24: reduced-motion preference keeps Gentle effective and idle artwork still", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await openParents(page);
  await page
    .getByRole("combobox", { name: "Motion", exact: true })
    .selectOption("playful");
  await expect(
    page.getByText(
      "Your device requests reduced motion, so Gentle is in use even if Playful is selected.",
      { exact: true },
    ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Close parent settings", exact: true })
    .click();
  await page.waitForTimeout(350);
  const before = await page
    .locator("canvas")
    .evaluate((canvas) => (canvas as HTMLCanvasElement).toDataURL());
  await page.waitForTimeout(350);
  expect(
    await page
      .locator("canvas")
      .evaluate((canvas) => (canvas as HTMLCanvasElement).toDataURL()),
  ).toBe(before);
});

test("T26: parent pointer hold is cancellable and opens only after two seconds", async ({
  page,
}) => {
  await page.goto("/");
  const parent = page.getByRole("button", {
    name: "Open parent settings",
    exact: true,
  });
  const rect = (await parent.boundingBox())!;
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(150);
  await page.mouse.up();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.mouse.down();
  await page.waitForTimeout(2150);
  await page.mouse.up();
  await expect(
    page.getByRole("dialog", { name: "Parent settings", exact: true }),
  ).toBeVisible();
});
