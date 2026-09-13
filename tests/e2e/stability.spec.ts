import { expect, test } from '@playwright/test';

test('T32/T33: 100 DOM scene switches preserve the page and bounded idle resources', async ({ page }) => {
  test.setTimeout(90_000);
  const pageErrors: string[] = [];
  let mainNavigations = 0;
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('framenavigated', frame => { if (frame === page.mainFrame()) mainNavigations++; });

  await page.goto('/');
  const canvas = page.getByTestId('play-canvas');
  await expect(canvas).toHaveAttribute('data-toy', 'squishy');
  await expect(canvas).toHaveAttribute('data-art', '5');
  const initialTimeOrigin = await page.evaluate(() => performance.timeOrigin);
  const initialNavigations = mainNavigations;
  const toys = [
    { name: 'Bubble Pond', id: 'bubbles' },
    { name: 'Roll & Nest', id: 'nest' },
    { name: 'Squishy Friend', id: 'squishy' },
  ];

  // Exercise the public DOM flow, including modal pause and scene disposal on
  // each transition. This is a bounded desktop browser test, not a physical
  // iPad test, a 20-minute soak, or a measurement of enjoyment.
  for (let index = 0; index < 100; index++) {
    const toy = toys[index % toys.length];
    await page.getByRole('button', { name: 'Toybox', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Toybox', exact: true })).toBeVisible();
    await page.getByRole('button', { name: toy.name, exact: true }).click();
    await expect(canvas, `scene switch ${index + 1}: ${toy.name}`).toHaveAttribute('data-toy', toy.id);
    await expect(canvas).toHaveAttribute('data-pointers', '0');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Sound is muted', exact: true })).toBeVisible();
  }

  expect(await page.evaluate(() => performance.timeOrigin)).toBe(initialTimeOrigin);
  expect(mainNavigations).toBe(initialNavigations);
  await page.getByRole('button', { name: 'Open parent settings', exact: true }).press('Enter');
  await expect(page.getByRole('dialog', { name: 'Parent settings', exact: true })).toBeVisible();
  await page.getByText('Technical status', { exact: true }).click();
  const status = JSON.parse(await page.locator('.runtime-status').innerText()) as Record<string, unknown>;
  expect(status).toMatchObject({
    toy: 'bubbles', paused: true, residentImages: 5, pointers: 0,
    voices: 0, audioEnabled: false, musicEnabled: false, musicElements: 0,
  });
  expect(typeof status.buildId).toBe('string');
  expect(status.canvasPixels).toBeGreaterThan(0);
  expect(status.canvasPixels).toBeLessThanOrEqual(2_000_000);
  expect(pageErrors).toEqual([]);
});
