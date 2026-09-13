import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash, webcrypto } from "node:crypto";
import { runInNewContext } from "node:vm";

const source = readFileSync(
  new URL("../../src/pwa/worker-template.js", import.meta.url),
  "utf8",
);
const html = "<!doctype html><title>Version A</title>";
const js = 'console.log("version-a")';
const contents = new Map([
  ["/index.html", html],
  ["/assets/app.js", js],
]);
const entries = [...contents].map(([url, text]) => ({
  url,
  bytes: Buffer.byteLength(text),
  sha256: createHash("sha256").update(text).digest("hex"),
}));
const manifest = { buildId: "test-a", version: "test-a", entries };

function harness(
  options: {
    failedFile?: string;
    corruptFile?: string;
    rejectStorage?: boolean;
  } = {},
) {
  const listeners = new Map<string, (event: Record<string, unknown>) => void>();
  const stores = new Map<string, Map<string, Response>>([
    ["little-joys-old", new Map([["/index.html", new Response("old")]])],
  ]);
  const cacheApi = {
    async has(name: string) {
      return stores.has(name);
    },
    async keys() {
      return [...stores.keys()];
    },
    async delete(name: string) {
      return stores.delete(name);
    },
    async open(name: string) {
      if (options.rejectStorage) throw new Error("storage denied");
      if (!stores.has(name)) stores.set(name, new Map());
      const cache = stores.get(name)!;
      return {
        async match(url: string) {
          return cache.get(url)?.clone();
        },
        async put(url: string, value: Response) {
          cache.set(url, value.clone());
        },
      };
    },
  };
  const scope = {
    location: { origin: "https://example.test" },
    registration: {
      active: {
        postMessage(_message: unknown, ports: MessagePort[]) {
          ports[0].postMessage({ version: "old" });
        },
      },
      waiting: null as null | {
        postMessage(message: unknown, ports: MessagePort[]): void;
      },
      installing: null as unknown,
    },
    addEventListener(
      type: string,
      listener: (event: Record<string, unknown>) => void,
    ) {
      listeners.set(type, listener);
    },
  };
  runInNewContext(
    source.replace("__PRECACHE_MANIFEST__", JSON.stringify(manifest)),
    {
      self: scope,
      caches: cacheApi,
      crypto: webcrypto,
      URL,
      Response,
      Request,
      Headers,
      Uint8Array,
      MessageChannel,
      setTimeout,
      clearTimeout,
      fetch: async (url: string | { url: string }) => {
        const requested =
          typeof url === "string" ? url : new URL(url.url).pathname;
        const path = requested === "/" ? "/index.html" : requested;
        if (path === options.failedFile)
          return new Response("not found", { status: 404 });
        return new Response(
          path === options.corruptFile
            ? "new mismatched response"
            : contents.get(path),
        );
      },
    },
  );
  async function event(type: string) {
    let result: Promise<unknown> | undefined;
    listeners.get(type)!({
      waitUntil(promise: Promise<unknown>) {
        result = promise;
      },
    });
    await result;
  }
  async function status() {
    let result: Promise<unknown> | undefined;
    let reply: { ready: boolean; buildId: string } | undefined;
    listeners.get("message")!({
      data: { type: "VERIFY_CACHE" },
      ports: [
        {
          postMessage(value: typeof reply) {
            reply = value;
          },
        },
      ],
      waitUntil(promise: Promise<unknown>) {
        result = promise;
      },
    });
    await result;
    return reply;
  }
  async function fetchPath(path: string, range?: string) {
    let response: Promise<Response> | undefined;
    listeners.get("fetch")!({
      request: new Request(`https://example.test${path}`, {
        headers: range ? { Range: range } : {},
      }),
      respondWith(value: Promise<Response>) {
        response = value;
      },
    });
    return response;
  }
  async function prune() {
    let result: Promise<unknown> | undefined;
    listeners.get("message")!({
      data: { type: "PRUNE_CACHES" },
      waitUntil(promise: Promise<unknown>) {
        result = promise;
      },
    });
    await result;
  }
  return { event, status, fetchPath, stores, prune, scope };
}

describe("production worker: verified installation and version isolation (D02–D06)", () => {
  it("does not report ready before every required response is stored and hash verified", async () => {
    const app = harness();
    expect((await app.status())?.ready).toBe(false);
    await app.event("install");
    expect(await app.status()).toMatchObject({
      ready: true,
      buildId: "test-a",
    });
    expect(await (await app.fetchPath("/"))?.text()).toBe(html);
  });

  it.each([
    { failedFile: "/assets/app.js" },
    { corruptFile: "/assets/app.js" },
  ])(
    "rejects missing or wrong-byte update payload and preserves old cache (%o)",
    async (options) => {
      const app = harness(options);
      await expect(app.event("install")).rejects.toThrow("PRECACHE_INTEGRITY");
      expect(app.stores.has("little-joys-old")).toBe(true);
      expect(app.stores.has("little-joys-test-a")).toBe(false);
      expect((await app.status())?.ready).toBe(false);
    },
  );

  it("reports false after partial or complete eviction and does not use an old readiness marker", async () => {
    const app = harness();
    await app.event("install");
    app.stores.get("little-joys-test-a")!.delete("/assets/app.js");
    expect((await app.status())?.ready).toBe(false);
    app.stores.delete("little-joys-test-a");
    expect((await app.status())?.ready).toBe(false);
  });

  it("reports storage denial accurately without destroying the previous cache", async () => {
    const app = harness({ rejectStorage: true });
    await expect(app.event("install")).rejects.toThrow("storage denied");
    expect((await app.status())?.ready).toBe(false);
    expect(app.stores.has("little-joys-old")).toBe(true);
    expect(await (await app.fetchPath("/"))?.text()).toBe(html);
  });

  it("never forces activation or claims a potentially mismatched page; removes obsolete data only on natural activation", async () => {
    const app = harness();
    await app.event("install");
    expect(app.stores.has("little-joys-old")).toBe(true);
    expect(source).not.toMatch(/skipWaiting\s*\(|clients\.claim\s*\(/);
    await app.event("activate");
    expect(app.stores.has("little-joys-old")).toBe(false);
    expect(app.stores.has("little-joys-test-a")).toBe(true);
  });

  it("prunes only abandoned installs while protecting both active and current waiting cache", async () => {
    const app = harness();
    await app.event("install");
    app.scope.registration.active = {
      postMessage(_message: unknown, ports: MessagePort[]) {
        ports[0].postMessage({ version: "test-a" });
      },
    };
    app.scope.registration.waiting = {
      postMessage(_message: unknown, ports: MessagePort[]) {
        ports[0].postMessage({ version: "waiting" });
      },
    };
    app.stores.set("little-joys-waiting", new Map());
    app.stores.set("little-joys-abandoned", new Map());
    await app.prune();
    expect([...app.stores.keys()].sort()).toEqual([
      "little-joys-test-a",
      "little-joys-waiting",
    ]);
    app.scope.registration.installing = {};
    app.stores.set("little-joys-newly-installing", new Map());
    await app.prune();
    expect(app.stores.has("little-joys-newly-installing")).toBe(true);
  });

  it("leaves missing files to a genuine network 404 instead of rewriting them to HTML", async () => {
    const app = harness();
    await app.event("install");
    expect(await app.fetchPath("/missing.js")).toBeUndefined();
    expect(await app.fetchPath("/missing-page")).toBeUndefined();
  });

  it("refuses new mismatched bytes when an old version loses an unversioned cached response", async () => {
    const app = harness({ corruptFile: "/index.html" });
    const response = await app.fetchPath("/");
    expect(response?.status).toBe(503);
    expect(await response?.text()).toContain("reopen online");
  });

  it("serves bounded encoded-byte ranges from the verified cache for Safari media playback", async () => {
    const app = harness();
    await app.event("install");
    const range = await app.fetchPath("/assets/app.js", "bytes=0-3");
    expect(range?.status).toBe(206);
    expect(range?.headers.get("Content-Range")).toBe(
      `bytes 0-3/${Buffer.byteLength(js)}`,
    );
    expect(await range?.text()).toBe(js.slice(0, 4));
    const suffix = await app.fetchPath("/assets/app.js", "bytes=-3");
    expect(await suffix?.text()).toBe(js.slice(-3));
    expect(
      (await app.fetchPath("/assets/app.js", "bytes=99999-"))?.status,
    ).toBe(416);
    expect(
      (await app.fetchPath("/assets/app.js", "bytes=0-1,3-4"))?.status,
    ).toBe(416);
  });
});
