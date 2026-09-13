import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { resolve, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
export async function buildServiceWorker(dist = resolve("dist")) {
  const template = await readFile(
    new URL("../src/pwa/worker-template.js", import.meta.url),
    "utf8",
  );
  const label = JSON.parse(
    await readFile(resolve(dist, "build-label.json"), "utf8"),
  );
  if (
    typeof label.buildId !== "string" ||
    !/^[A-Za-z0-9._-]{1,96}$/.test(label.buildId)
  )
    throw new Error("Invalid build identifier");
  const entries = [];
  async function walk(directory) {
    for (const file of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, file.name);
      if (file.isDirectory()) await walk(path);
      else {
        const url = "/" + relative(dist, path).split(sep).join("/");
        if (["/sw.js", "/precache-manifest.json"].includes(url)) continue;
        if (
          !/\.(?:html|js|css|json|webmanifest|png|webp|svg|ico|woff2|mp3|wav|ogg)$/.test(
            url,
          )
        )
          throw new Error(`Unexpected production file: ${url}`);
        const bytes = await readFile(path);
        entries.push({ url, bytes: bytes.length, sha256: sha256(bytes) });
      }
    }
  }
  await walk(dist);
  entries.sort((a, b) => a.url.localeCompare(b.url));
  for (const required of [
    "/index.html",
    "/manifest.webmanifest",
    "/assets/asset-manifest.json",
    "/assets/friend.webp",
    "/assets/bowl.webp",
    "/assets/ball.webp",
    "/assets/ball-two.webp",
    "/assets/bubble.webp",
    "/assets/penguin.webp",
    "/assets/toy-squishy.png",
    "/assets/toy-bubbles.png",
    "/assets/toy-nest.png",
    "/assets/toy-bounce.png",
    "/assets/music.mp3",
    "/icons/icon-192.png",
    "/icons/icon-512.png",
    "/icons/apple-touch-icon.png",
  ]) {
    if (!entries.some((entry) => entry.url === required))
      throw new Error(`Missing required offline file: ${required}`);
  }
  const bytes = entries.reduce((total, entry) => total + entry.bytes, 0);
  if (bytes > 8 * 1024 * 1024)
    throw new Error(`Offline payload exceeds 8 MiB: ${bytes}`);
  // Include worker behavior in identity so editing the worker never overwrites an active cache.
  const version = sha256(JSON.stringify({ entries, template })).slice(0, 24);
  const manifest = {
    schemaVersion: 1,
    buildId: label.buildId,
    version,
    bytes,
    maxCoexistingPayloadBytes: bytes * 2,
    maxInstallStagingPayloadBytes: bytes * 3,
    entries,
  };
  await writeFile(
    resolve(dist, "precache-manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  await writeFile(
    resolve(dist, "sw.js"),
    template.replace("__PRECACHE_MANIFEST__", JSON.stringify(manifest)),
  );
  console.log(
    `Offline build ${label.buildId}: ${entries.length} verified entries, ${bytes} bytes; active + waiting ${bytes * 2}; replacement-install staging ${bytes * 3} bytes.`,
  );
  return manifest;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  await buildServiceWorker(
    process.argv[2] ? resolve(process.argv[2]) : undefined,
  );
