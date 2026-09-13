import { gzipSync } from "node:zlib";
import { readFile, readdir } from "node:fs/promises";
import { resolve, relative, sep } from "node:path";
import { createHash } from "node:crypto";

const dist = resolve("dist");
const manifest = JSON.parse(
  await readFile(resolve(dist, "precache-manifest.json"), "utf8"),
);
const files = [];
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else {
      const content = await readFile(path);
      files.push({
        url: "/" + relative(dist, path).split(sep).join("/"),
        bytes: content.length,
        gzip: gzipSync(content, { level: 9 }).length,
        sha256: createHash("sha256").update(content).digest("hex"),
      });
    }
  }
}
await walk(dist);
for (const entry of manifest.entries) {
  const actual = files.find((file) => file.url === entry.url);
  if (!actual || actual.sha256 !== entry.sha256 || actual.bytes !== entry.bytes)
    throw new Error(`Stale precache inventory: ${entry.url}`);
}
const scripts = files.filter(
  (file) => file.url.endsWith(".js") && file.url !== "/sw.js",
);
const appJavaScriptGzip = scripts.reduce((total, file) => total + file.gzip, 0);
const allStaticGzipUpperBound = files.reduce(
  (total, file) => total + Math.min(file.gzip, file.bytes),
  0,
);
// Optional adult-enabled music uses preload=none; it is requested only by the
// separately reported background precache or an explicit adult enable gesture.
const firstInteractionGzipUpperBound = files
  .filter((file) => file.url !== "/assets/music.mp3")
  .reduce((total, file) => total + Math.min(file.gzip, file.bytes), 0);
const completeOfflinePayloadBytes = manifest.entries.reduce(
  (total, entry) => total + entry.bytes,
  0,
);
if (appJavaScriptGzip > 200 * 1024)
  throw new Error(`App JavaScript exceeds 200 KiB gzip: ${appJavaScriptGzip}`);
if (firstInteractionGzipUpperBound > 2 * 1024 * 1024)
  throw new Error(
    `Conservative first-interaction transfer bound exceeds 2 MiB: ${firstInteractionGzipUpperBound}`,
  );
if (completeOfflinePayloadBytes > 8 * 1024 * 1024)
  throw new Error(
    `Complete offline payload exceeds 8 MiB: ${completeOfflinePayloadBytes}`,
  );
console.log(
  JSON.stringify(
    {
      passed: true,
      buildId: manifest.buildId,
      cacheVersion: manifest.version,
      appJavaScriptGzip,
      completeOfflinePayloadBytes,
      activeAndWaitingPayloadBytes: completeOfflinePayloadBytes * 2,
      replacementInstallStagingPayloadBytes: completeOfflinePayloadBytes * 3,
      firstInteractionGzipUpperBound,
      allStaticGzipUpperBound,
      notes: [
        "First-interaction bound counts every static file except optional /assets/music.mp3, which uses preload=none and loads only through background precaching or an adult enable gesture. Full static and offline totals still include music. Actual startup network trace is reported separately.",
        "Gzip calculations use level 9; hosting compression depends on negotiation.",
        "Normal active + waiting payload count is two. A replacement install temporarily stages a third to preserve the last successful waiting update on failure. Abandoned versions are collected at each install; old controlled versions survive until natural activation.",
        "Canvas pixels, object limits, timing, and physical iPad memory are separate runtime/device checks.",
      ],
      files,
    },
    null,
    2,
  ),
);
