import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import { resolve, relative, sep, extname } from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

export async function auditAssets(root = resolve("."), output = "dist") {
  const dist = resolve(root, output);
  const inventory = JSON.parse(
    await readFile(resolve(dist, "assets/asset-manifest.json"), "utf8"),
  );
  if (inventory.schemaVersion !== 1 || !Array.isArray(inventory.assets))
    throw new Error("Asset manifest schema must be version 1 with assets[]");
  const ids = new Set();
  const declared = new Set();
  const hashes = new Map();
  const results = [];
  const audio = [];
  for (const entry of inventory.assets) {
    if (!entry.id || ids.has(entry.id))
      throw new Error(`Missing or duplicate asset ID: ${entry.id}`);
    ids.add(entry.id);
    if (typeof entry.provenance !== "string" || !entry.provenance.trim())
      throw new Error(`Missing provenance: ${entry.id}`);
    if (entry.kind === "procedural") {
      if (
        !/^src\/[A-Za-z0-9/_.-]+\.(?:ts|tsx)$/.test(entry.path) ||
        entry.path.includes("..")
      )
        throw new Error(`Invalid procedural source path: ${entry.id}`);
      if (!(await stat(resolve(root, entry.path))).isFile())
        throw new Error(`Missing procedural source: ${entry.id}`);
      continue;
    }
    if (entry.kind === "audio") {
      if (
        !/^\/assets\/[A-Za-z0-9/_.-]+\.(?:mp3|wav|ogg)$/.test(entry.path) ||
        entry.path.includes("..")
      )
        throw new Error(`Invalid audio path: ${entry.id}`);
      if (declared.has(entry.path))
        throw new Error(`Duplicate asset path: ${entry.path}`);
      declared.add(entry.path);
      const content = await readFile(resolve(dist, "." + entry.path));
      const digest = createHash("sha256").update(content).digest("hex");
      if (content.length !== entry.encodedBytes || digest !== entry.sha256)
        throw new Error(`Audio metadata/hash mismatch: ${entry.id}`);
      audio.push({
        id: entry.id,
        path: entry.path,
        encodedBytes: content.length,
      });
      continue;
    }
    if (
      entry.kind !== "raster" ||
      !/^\/(?:assets|icons)\/[A-Za-z0-9/_.-]+\.(?:png|webp)$/.test(
        entry.path,
      ) ||
      entry.path.includes("..")
    )
      throw new Error(`Invalid raster path: ${entry.id}`);
    if (declared.has(entry.path))
      throw new Error(`Duplicate asset path: ${entry.path}`);
    declared.add(entry.path);
    const content = await readFile(resolve(dist, "." + entry.path));
    const metadata = await sharp(content).metadata();
    const digest = createHash("sha256").update(content).digest("hex");
    if (
      !metadata.width ||
      !metadata.height ||
      metadata.width > 1024 ||
      metadata.height > 1024
    )
      throw new Error(`Raster exceeds 1024px edge: ${entry.id}`);
    const decodedBytes = metadata.width * metadata.height * 4;
    if (
      metadata.width !== entry.width ||
      metadata.height !== entry.height ||
      content.length !== entry.encodedBytes ||
      decodedBytes !== entry.decodedBytes ||
      Boolean(metadata.hasAlpha) !== entry.alpha ||
      digest !== entry.sha256
    )
      throw new Error(`Asset metadata/hash mismatch: ${entry.id}`);
    if (content.length > 128 * 1024 && hashes.has(digest))
      throw new Error(
        `Duplicate large raster: ${entry.id} and ${hashes.get(digest)}`,
      );
    hashes.set(digest, entry.id);
    results.push({
      id: entry.id,
      path: entry.path,
      width: metadata.width,
      height: metadata.height,
      encodedBytes: content.length,
      decodedBytes,
      alpha: Boolean(metadata.hasAlpha),
    });
  }
  let productionFiles = 0;
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      const url = "/" + relative(dist, path).split(sep).join("/");
      if (entry.isDirectory()) {
        if (!/^\/(?:assets|icons)(?:\/|$)/.test(url))
          throw new Error(`Source/private folder in output: ${url}`);
        await walk(path);
      } else {
        productionFiles++;
        if (
          !/\.(?:html|js|css|json|webmanifest|png|webp|svg|ico|woff2|mp3|wav|ogg)$/.test(
            url,
          )
        )
          throw new Error(`Unexpected production file: ${url}`);
        if ([".png", ".webp"].includes(extname(path)) && !declared.has(url))
          throw new Error(`Unmanifested raster: ${url}`);
        if (
          [".mp3", ".wav", ".ogg"].includes(extname(path)) &&
          !declared.has(url)
        )
          throw new Error(`Unmanifested audio: ${url}`);
        if (
          /(?:private|transcript|playtest|prompt|source-master|\.env|\.map)(?:[./_-]|$)/i.test(
            url,
          )
        )
          throw new Error(`Development/private file in output: ${url}`);
      }
    }
  }
  await walk(dist);
  const uniqueRuntimeRasters = results.filter(
    (entry) => !entry.path.startsWith("/icons/"),
  ).length;
  // PENGUIN-BOUNCE-SPEC allocates one penguin and one selector tile; byte/RAM caps stay fixed.
  if (uniqueRuntimeRasters > 10)
    throw new Error("More than 10 unique runtime source rasters");
  const decodedBytes = results.reduce(
    (total, entry) => total + entry.decodedBytes,
    0,
  );
  const preparedMaterialBytes = 768 * 768 * 4;
  const preparationReadbackBytes = preparedMaterialBytes;
  // Penguin Bounce prepares six tinted ball surfaces of at most 66px square
  // (22px ball radius at the 1.5 DPR cap) and releases them on disposal.
  const preparedBallTintBytes = 6 * 66 * 66 * 4;
  const decodedWithPreparationPeak =
    decodedBytes +
    preparedMaterialBytes +
    preparationReadbackBytes +
    preparedBallTintBytes;
  if (decodedWithPreparationPeak > 24 * 1024 * 1024)
    throw new Error(
      `Decoded raster plus preparation peak exceeds 24 MiB: ${decodedWithPreparationPeak}`,
    );
  const manifest = JSON.parse(
    await readFile(resolve(dist, "manifest.webmanifest"), "utf8"),
  );
  if (
    manifest.name !== "Little Joys" ||
    manifest.start_url !== "/" ||
    manifest.scope !== "/" ||
    manifest.display !== "standalone" ||
    manifest.orientation
  )
    throw new Error("Invalid install manifest configuration");
  for (const size of [192, 512]) {
    const icon = manifest.icons.find(
      (entry) =>
        entry.sizes === `${size}x${size}` && entry.type === "image/png",
    );
    const raster = results.find((entry) => entry.path === icon?.src);
    if (!raster || raster.width !== size || raster.height !== size)
      throw new Error(`Required ${size}px manifest icon missing`);
  }
  const apple = results.find(
    (entry) => entry.path === "/icons/apple-touch-icon.png",
  );
  if (!apple || apple.width !== 180 || apple.height !== 180)
    throw new Error("Required 180px Apple touch icon missing");
  const html = await readFile(resolve(dist, "index.html"), "utf8");
  if (
    !html.includes("apple-touch-icon") ||
    !html.includes("/manifest.webmanifest")
  )
    throw new Error("HTML is missing installation links");
  const report = {
    passed: true,
    productionFiles,
    rasterCount: results.length,
    uniqueRuntimeRasters,
    encodedRasterBytes: results.reduce(
      (total, entry) => total + entry.encodedBytes,
      0,
    ),
    decodedRasterBytesEstimate: decodedBytes,
    preparedMaterialBytes,
    preparationReadbackBytes,
    decodedWithPreparedMaterialBytes: decodedBytes + preparedMaterialBytes,
    preparedBallTintBytes,
    decodedWithPreparationPeak,
    note: "All shipped rasters counted conservatively, plus one 768-square Squishy material surface, one temporary readback array during preparation, and Penguin Bounce's six tinted ball surfaces (at most 66px square). Each scene releases its prepared surfaces on disposal, so this sum over two scenes is itself conservative; browser garbage collection and graphics copies are not measured. These estimates are not Safari total RAM. Audio streams without a complete decoded AudioBuffer.",
    audio,
    assets: results,
  };
  console.log(JSON.stringify(report, null, 2));
  return report;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  await auditAssets();
