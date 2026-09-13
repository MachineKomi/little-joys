/* Build input only. scripts/build-sw.mjs substitutes the verified production inventory. */
const MANIFEST = __PRECACHE_MANIFEST__;
const CACHE_PREFIX = "little-joys-";
const CACHE_NAME = CACHE_PREFIX + MANIFEST.version;
const ENTRIES = new Map(MANIFEST.entries.map((entry) => [entry.url, entry]));

async function workerCacheName(worker) {
  if (!worker) return null;
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timeout = setTimeout(() => {
      channel.port1.close();
      reject(new Error("VERSION_QUERY_TIMEOUT"));
    }, 7000);
    channel.port1.onmessage = (event) => {
      clearTimeout(timeout);
      channel.port1.close();
      if (typeof event.data?.version === "string")
        resolve(CACHE_PREFIX + event.data.version);
      else reject(new Error("VERSION_QUERY_INVALID"));
    };
    worker.postMessage({ type: "CACHE_VERSION" }, [channel.port2]);
  });
}

async function removeAbandonedCaches(onlyWhenIdle = false) {
  // A replacement may supersede a waiting worker repeatedly while an old toy stays open.
  // Protect both referenced versions; remove only unreferenced prior install attempts.
  const active = self.registration.active;
  const waiting = self.registration.waiting;
  if (onlyWhenIdle && self.registration.installing) return;
  const protectedNames = new Set([
    CACHE_NAME,
    ...(await Promise.all([workerCacheName(active), workerCacheName(waiting)])),
  ]);
  for (const name of await caches.keys()) {
    if (
      onlyWhenIdle &&
      (self.registration.installing ||
        self.registration.active !== active ||
        self.registration.waiting !== waiting)
    )
      return;
    if (name.startsWith(CACHE_PREFIX) && !protectedNames.has(name))
      await caches.delete(name);
  }
}

async function matchesEntry(response, entry) {
  if (
    !response ||
    !response.ok ||
    response.type === "opaque" ||
    response.redirected
  )
    return false;
  const bytes = await response.clone().arrayBuffer();
  if (bytes.byteLength !== entry.bytes) return false;
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hash = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return hash === entry.sha256;
}

async function verifyCache() {
  if (!(await caches.has(CACHE_NAME))) return false;
  const cache = await caches.open(CACHE_NAME);
  for (const entry of MANIFEST.entries) {
    if (!(await matchesEntry(await cache.match(entry.url), entry)))
      return false;
  }
  return true;
}

async function mediaRange(response, request) {
  const range = request.headers?.get("Range");
  if (!range) return response;
  const bytes = await response.arrayBuffer();
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  const size = bytes.byteLength;
  let start = match?.[1] ? Number(match[1]) : 0;
  let end = match?.[2] ? Number(match[2]) : size - 1;
  if (match && !match[1] && match[2]) {
    start = Math.max(0, size - Number(match[2]));
    end = size - 1;
  }
  if (
    !match ||
    (!match[1] && !match[2]) ||
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start >= size ||
    end < start
  ) {
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${size}` },
    });
  }
  end = Math.min(end, size - 1);
  const headers = new Headers(response.headers);
  headers.delete("Content-Encoding");
  headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
  headers.set("Content-Length", String(end - start + 1));
  headers.set("Accept-Ranges", "bytes");
  // This is a bounded slice of the encoded media bytes, never a decoded audio buffer.
  return new Response(bytes.slice(start, end + 1), { status: 206, headers });
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      try {
        await removeAbandonedCaches();
        const cache = await caches.open(CACHE_NAME);
        // Sequential writes keep memory bounded even when all assets are uncached.
        for (const entry of MANIFEST.entries) {
          const response = await fetch(entry.url, {
            cache: "no-store",
            credentials: "same-origin",
          });
          if (!(await matchesEntry(response, entry)))
            throw new Error("PRECACHE_INTEGRITY");
          await cache.put(entry.url, response);
        }
        if (!(await verifyCache())) throw new Error("PRECACHE_INCOMPLETE");
        // Do not skip waiting. All old app windows must close before the new version activates.
      } catch (error) {
        await caches.delete(CACHE_NAME).catch(() => false);
        throw error;
      }
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      if (!(await verifyCache())) return;
      // Natural activation happens only after the old worker has no controlled clients.
      // Do not claim uncontrolled pages: they may have loaded a different online build.
      const obsolete = (await caches.keys()).filter(
        (name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME,
      );
      await Promise.all(obsolete.map((name) => caches.delete(name)));
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  const path = url.pathname === "/" ? "/index.html" : url.pathname;
  const entry = ENTRIES.get(path);
  if (!entry) return; // No catch-all HTML response for missing scripts or images.
  event.respondWith(
    (async () => {
      let cache;
      // Denied or full storage must not block a matching online response.
      try {
        cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(entry.url);
        if (cached) return await mediaRange(cached, event.request);
      } catch {
        /* Continue with the verified online fallback. */
      }
      try {
        // Fetch the full encoded file for integrity checking, then satisfy any Safari media range.
        let networkRequest = event.request;
        if (event.request.headers?.has("Range")) {
          const headers = new Headers(event.request.headers);
          headers.delete("Range");
          headers.delete("If-Range");
          networkRequest = new Request(event.request, { headers });
        }
        const response = await fetch(networkRequest, { cache: "no-store" });
        // An evicted old cache must never silently fill with newer unversioned assets.
        if (!(await matchesEntry(response, entry)))
          throw new Error("VERSION_UNAVAILABLE");
        try {
          if (cache) await cache.put(entry.url, response.clone());
        } catch {
          /* Online play survives full storage. */
        }
        return await mediaRange(response, event.request);
      } catch {
        return new Response(
          "This saved version is unavailable. Close all Little Joys windows and reopen online.",
          {
            status: 503,
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Cache-Control": "no-store",
            },
          },
        );
      }
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "CACHE_VERSION" && event.ports[0]) {
    event.ports[0].postMessage({ version: MANIFEST.version });
    return;
  }
  if (event.data?.type === "PRUNE_CACHES") {
    event.waitUntil(removeAbandonedCaches(true).catch(() => undefined));
    return;
  }
  if (event.data?.type !== "VERIFY_CACHE" || !event.ports[0]) return;
  event.waitUntil(
    (async () => {
      let ready = false;
      try {
        ready = await verifyCache();
      } catch {
        /* Accurate false status on denied storage. */
      }
      event.ports[0].postMessage({
        type: "CACHE_STATUS",
        ready,
        buildId: MANIFEST.buildId,
        version: MANIFEST.version,
      });
    })(),
  );
});
