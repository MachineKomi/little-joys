import { test as base, type Browser } from "@playwright/test";

/**
 * Windows WebKit has intermittently closed new pages before app navigation when
 * reusing a browser across tests. Keep each test in a fresh native process there.
 * This is process isolation, not a retry: every assertion still runs once, and
 * multi-page/offline/100-switch scenarios retain one browser for the whole test.
 * Playwright applies configured context options and artifact recording to native
 * contexts created during fixtures: https://playwright.dev/docs/test-use-options
 */
export const test = base.extend<{ toyBrowser: Browser }>({
  toyBrowser: async ({ browser, browserName, playwright }, use, testInfo) => {
    if (process.platform !== "win32" || browserName !== "webkit") {
      await use(browser);
      return;
    }
    testInfo.annotations.push({
      type: "browser-isolation",
      description: "Fresh native Windows WebKit process for this test; no retry.",
    });
    const isolated = await playwright.webkit.launch();
    try {
      await use(isolated);
    } finally {
      await isolated.close();
    }
  },
  context: async ({ toyBrowser }, use) => {
    const context = await toyBrowser.newContext();
    try {
      await use(context);
    } finally {
      await context.close();
    }
  },
});

export { expect, type Page } from "@playwright/test";
