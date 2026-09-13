import { test, expect, type Page } from "@playwright/test";
import { createServer, type Server } from "node:http";
import {
  cp,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, extname, sep } from "node:path";
import { execFileSync } from "node:child_process";

if (process.env.PWA_DIAG === "1") {
  for (const scenario of ["initial-offline-override", "controlled-offline-override", "initial-server-closed", "controlled-server-closed"] as const) {
    test(`diagnostic ${scenario}`, async ({ page, context }, testInfo) => {
      const directory = resolve("dist");
      const server = createServer(async (request, response) => {
        try {
          const url = new URL(request.url!, "http://localhost");
          const path = resolve(directory, "." + (url.pathname === "/" ? "/index.html" : url.pathname));
          const mime: Record<string, string> = { ".js": "text/javascript", ".html": "text/html", ".css": "text/css", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png", ".webp": "image/webp", ".mp3": "audio/mpeg" };
          response.setHeader("Content-Type", mime[extname(path)] || "application/octet-stream");
          response.setHeader("Cache-Control", "no-store");
          response.end(await readFile(path));
        } catch { response.writeHead(404); response.end("Not found"); }
      });
      await new Promise<void>(resolveListen => server.listen(0, "127.0.0.1", resolveListen));
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Missing diagnostic origin");
      const origin = `http://127.0.0.1:${address.port}`;
      const events: unknown[] = [];
      const state = () => page.evaluate(async () => {
        const registration = await navigator.serviceWorker.getRegistration();
        return { controlled: Boolean(navigator.serviceWorker.controller), controllerState: navigator.serviceWorker.controller?.state, active: registration?.active?.state, waiting: registration?.waiting?.state, online: navigator.onLine, caches: await caches.keys() };
      });
      try {
        page.on("requestfailed", request => events.push({ failed: request.url(), error: request.failure() }));
        page.on("response", response => { if (response.request().isNavigationRequest()) events.push({ document: response.url(), status: response.status(), worker: response.fromServiceWorker() }); });
        await page.goto(origin);
        await expect.poll(async () => (await workerStatus(page))?.ready).toBe(true);
        const initialState = await state();
        if (scenario.startsWith("controlled")) await page.reload();
        const beforeState = await state();
        if (scenario.endsWith("override")) await context.setOffline(true);
        else await new Promise<void>(resolveClose => server.close(() => resolveClose()));
        const inPageFetch = await page.evaluate(async () => {
          try { const response = await fetch("/index.html", { cache: "no-store" }); return { status: response.status, bytes: (await response.text()).length }; }
          catch (error) { return { error: String(error) }; }
        });
        let navigation: unknown;
        try { const response = await page.reload(); navigation = { status: response?.status(), worker: response?.fromServiceWorker(), canvas: await page.getByTestId("play-canvas").count(), after: await state() }; }
        catch (error) { navigation = { error: String(error), url: page.url() }; }
        const result = { scenario, initialState, beforeState, inPageFetch, navigation, events };
        console.log(JSON.stringify(result));
        await testInfo.attach(scenario, { body: JSON.stringify(result, null, 2), contentType: "application/json" });
      } finally {
        await new Promise<void>(resolveClose => server.close(() => resolveClose()));
      }
    });
  }
}

async function openParents(page: Page) {
  await page
    .getByRole("button", { name: "Open parent settings", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("dialog", { name: "Parent settings", exact: true }),
  ).toBeVisible();
}

async function workerStatus(page: Page) {
  return page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    const worker = navigator.serviceWorker.controller || reg?.active;
    if (!worker) return null;
    return await new Promise<{
      ready: boolean;
      version: string;
      buildId: string;
    } | null>((resolveStatus) => {
      const channel = new MessageChannel();
      const timeout = setTimeout(() => {
        channel.port1.close();
        resolveStatus(null);
      }, 5000);
      channel.port1.onmessage = (event) => {
        clearTimeout(timeout);
        channel.port1.close();
        resolveStatus(event.data);
      };
      worker.postMessage({ type: "VERIFY_CACHE" }, [channel.port2]);
    });
  });
}

test("T28, T31: verified production cache runs every toy and settings offline under the actual CSP", async ({
  page,
  context,
  baseURL,
}) => {
  const requests: string[] = [];
  const errors: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    (window as unknown as { policyViolations: string[] }).policyViolations = [];
    document.addEventListener("securitypolicyviolation", (event) =>
      (
        window as unknown as { policyViolations: string[] }
      ).policyViolations.push(event.violatedDirective),
    );
  });
  const response = await page.goto("/");
  expect(response?.headers()["content-security-policy"]).toContain(
    "script-src 'self'",
  );
  await expect(page.getByTestId("play-canvas")).toBeVisible();
  await expect.poll(async () => (await workerStatus(page))?.ready).toBe(true);
  await openParents(page);
  await expect(page.getByText("Offline ready", { exact: true })).toBeVisible();
  await page
    .getByRole("combobox", { name: "Motion", exact: true })
    .selectOption("playful");
  await page
    .getByRole("button", { name: "Back to the toy", exact: true })
    .click();
  await context.setOffline(true);
  await page.reload();
  const offlineMedia = await page.evaluate(async () => {
    const response = await fetch("/assets/music.mp3", {
      headers: { Range: "bytes=0-31" },
    });
    return {
      status: response.status,
      bytes: (await response.arrayBuffer()).byteLength,
      contentRange: response.headers.get("Content-Range"),
    };
  });
  expect(offlineMedia.status).toBe(206);
  expect(offlineMedia.bytes).toBe(32);
  expect(offlineMedia.contentRange).toMatch(/^bytes 0-31\/\d+$/);
  for (const toy of ["Squishy Friend", "Bubble Pond", "Roll & Nest"]) {
    await page.getByRole("button", { name: "Toybox", exact: true }).click();
    await page.getByRole("button", { name: toy, exact: true }).click();
    await expect(
      page.getByRole("main", { name: toy, exact: true }),
    ).toBeVisible();
    await page
      .getByTestId("play-canvas")
      .click({ position: { x: 200, y: 200 } });
  }
  await openParents(page);
  await expect(page.getByText("Offline ready", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Motion", exact: true }),
  ).toHaveValue("playful");
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { policyViolations: string[] }).policyViolations,
    ),
  ).toEqual([]);
  expect(
    requests.filter((url) => new URL(url).origin !== new URL(baseURL!).origin),
  ).toEqual([]);
});

test("T30: missing and evicted caches revoke adult offline-ready status", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await expect.poll(async () => (await workerStatus(page))?.ready).toBe(true);
  await page.reload();
  await context.setOffline(true);
  await page.evaluate(async () => {
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      await cache.delete("/icons/icon-192.png");
    }
  });
  await openParents(page);
  await expect(
    page.getByText("Offline not yet verified", { exact: true }),
  ).toBeVisible();
  expect((await workerStatus(page))?.ready).toBe(false);
  await page.evaluate(async () => {
    for (const key of await caches.keys()) await caches.delete(key);
  });
  expect((await workerStatus(page))?.ready).toBe(false);
  await page
    .getByRole("button", { name: "Back to the toy", exact: true })
    .click();
  await page.getByTestId("play-canvas").click(); // Already loaded play stays usable after eviction.
});

test("D01, D03: installation manifest and missing static requests are truthful", async ({
  request,
}) => {
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest).toMatchObject({
    name: "Little Joys",
    start_url: "/",
    scope: "/",
    display: "standalone",
  });
  expect(manifest.orientation).toBeUndefined();
  for (const icon of manifest.icons) {
    const response = await request.get(icon.src);
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("image/png");
  }
  for (const missing of [
    "/missing.js",
    "/missing.png",
    "/absent/sw.js",
    "/not-a-route",
  ]) {
    const response = await request.get(missing);
    expect(response.status()).toBe(404);
    expect(response.headers()["content-type"]).not.toContain("text/html");
  }
  const media = await request.get("/assets/music.mp3", {
    headers: { Range: "bytes=0-1" },
  });
  expect(media.status()).toBe(206);
  expect((await media.body()).length).toBe(2);
  expect(media.headers()["content-range"]).toMatch(/^bytes 0-1\/\d+$/);
});

test("T29: failed update preserves old version; successful update waits for every old window to close", async ({
  context,
}) => {
  test.setTimeout(90_000);
  const temporary = await mkdtemp(resolve(tmpdir(), "little-joys-pwa-"));
  let server: Server | undefined;
  try {
    const original = JSON.parse(
      await readFile(resolve("dist/build-label.json"), "utf8"),
    ).buildId as string;
    const versions: string[] = [];
    for (const name of ["a", "b", "c", "d"]) {
      const directory = resolve(temporary, name);
      await cp(resolve("dist"), directory, { recursive: true });
      const label = name === "a" ? original : `${original}-test-${name}`;
      await writeFile(
        resolve(directory, "build-label.json"),
        JSON.stringify({ buildId: label }),
      );
      if (label !== original) {
        for (const file of await readdir(resolve(directory, "assets"))) {
          if (file.endsWith(".js")) {
            const path = resolve(directory, "assets", file);
            await writeFile(
              path,
              (await readFile(path, "utf8")).split(original).join(label),
            );
          }
        }
      }
      const index = resolve(directory, "index.html");
      await writeFile(
        index,
        (await readFile(index, "utf8")).replace(
          "</head>",
          `<meta name="fixture-version" content="${name}"></head>`,
        ),
      );
      execFileSync(
        process.execPath,
        [resolve("scripts/build-sw.mjs"), directory],
        { stdio: "pipe" },
      );
      versions.push(
        JSON.parse(
          await readFile(resolve(directory, "precache-manifest.json"), "utf8"),
        ).version,
      );
    }
    let serving = "a";
    let failInstall = false;
    const headers = JSON.parse(await readFile(resolve("vercel.json"), "utf8"))
      .headers[0].headers as { key: string; value: string }[];
    server = createServer(async (req, res) => {
      for (const header of headers) res.setHeader(header.key, header.value);
      res.setHeader("Cache-Control", "no-store");
      try {
        const url = new URL(req.url!, "http://localhost");
        if (failInstall && url.pathname === "/icons/icon-192.png") {
          res.writeHead(503);
          res.end("fixture failure");
          return;
        }
        const directory = resolve(temporary, serving);
        const path = resolve(
          directory,
          "." + (url.pathname === "/" ? "/index.html" : url.pathname),
        );
        if (!path.startsWith(directory + sep)) throw new Error("bad path");
        const mime: Record<string, string> = {
          ".js": "text/javascript",
          ".html": "text/html",
          ".css": "text/css",
          ".png": "image/png",
          ".json": "application/json",
          ".webmanifest": "application/manifest+json",
        };
        res.setHeader(
          "Content-Type",
          mime[extname(path)] || "application/octet-stream",
        );
        res.end(await readFile(path));
      } catch {
        res.writeHead(404);
        res.end("Not found");
      }
    });
    await new Promise<void>((resolveListen) =>
      server!.listen(0, "127.0.0.1", resolveListen),
    );
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("fixture server address unavailable");
    const url = `http://127.0.0.1:${address.port}/`;
    const first = await context.newPage();
    await first.goto(url);
    await expect
      .poll(async () => (await workerStatus(first))?.ready)
      .toBe(true);
    await first.reload();
    const second = await context.newPage();
    await second.goto(url);
    serving = "b";
    failInstall = true;
    const outcome = await first.evaluate(async () => {
      const reg = (await navigator.serviceWorker.getRegistration())!;
      return await new Promise<string>((resolveOutcome) => {
        reg.addEventListener(
          "updatefound",
          () => {
            const installing = reg.installing!;
            installing.addEventListener("statechange", () => {
              if (installing.state === "redundant")
                resolveOutcome(installing.state);
            });
          },
          { once: true },
        );
        void reg.update().catch(() => resolveOutcome("update-rejected"));
      });
    });
    expect(["redundant", "update-rejected"]).toContain(outcome);
    expect((await workerStatus(first))?.version).toBe(versions[0]);
    await first.reload();
    await expect(first.locator('meta[name="fixture-version"]')).toHaveAttribute(
      "content",
      "a",
    );
    await first.getByTestId("play-canvas").click();
    serving = "c";
    failInstall = false;
    await first.evaluate(async () => {
      await (await navigator.serviceWorker.getRegistration())!.update();
    });
    await expect
      .poll(() =>
        first.evaluate(async () =>
          Boolean((await navigator.serviceWorker.getRegistration())?.waiting),
        ),
      )
      .toBe(true);
    expect((await workerStatus(first))?.version).toBe(versions[0]);
    // Superseding one successful waiting version must not accumulate unbounded caches.
    serving = "d";
    await first.evaluate(async () => {
      await (await navigator.serviceWorker.getRegistration())!.update();
    });
    await expect
      .poll(() =>
        first.evaluate(
          async () =>
            !(await navigator.serviceWorker.getRegistration())?.installing,
        ),
      )
      .toBe(true);
    await openParents(first);
    await expect(
      first.getByText("An update is waiting.", { exact: false }),
    ).toBeVisible();
    await expect
      .poll(() =>
        first.evaluate(
          async () =>
            (await caches.keys()).filter((name) =>
              name.startsWith("little-joys-"),
            ).length,
        ),
      )
      .toBe(2);
    await first.close();
    expect((await workerStatus(second))?.version).toBe(versions[0]);
    const swUrl = url + "sw.js";
    const activated = context
      .waitForEvent("serviceworker", {
        predicate: (worker) => worker.url() === swUrl,
        timeout: 15_000,
      })
      .catch(() => null);
    await second.close();
    // There are now no pages of this origin. Natural SW lifecycle activates the waiting build.
    await Promise.race([
      activated,
      new Promise((resolveWait) => setTimeout(resolveWait, 800)),
    ]);
    const reopened = await context.newPage();
    await reopened.goto(url);
    await expect
      .poll(async () => (await workerStatus(reopened))?.version)
      .toBe(versions[3]);
    await expect(
      reopened.locator('meta[name="fixture-version"]'),
    ).toHaveAttribute("content", "d");
    await expect(reopened.getByTestId("play-canvas")).toBeVisible();
    await reopened.close();
  } finally {
    if (server)
      await new Promise<void>((resolveClose) =>
        server!.close(() => resolveClose()),
      );
    if (!resolve(temporary).startsWith(resolve(tmpdir()) + sep))
      throw new Error(
        "Refusing temporary cleanup outside the verified temp directory",
      );
    await rm(temporary, { recursive: true, force: true });
  }
});
