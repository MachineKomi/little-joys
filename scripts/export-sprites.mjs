// Reproducible exports from the selected original masters. No network or AI calls.
import sharp from "sharp";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

await mkdir("public/assets", { recursive: true });
const recipes = [
  {
    source: "squishy-friend-sprite-v2.png",
    output: "friend",
    width: 768,
    height: 768,
  },
  {
    source: "bowl-v1.png",
    output: "bowl",
    crop: { left: 111, top: 85, width: 1950, height: 586 },
    width: 768,
  },
  {
    source: "ball-v1.png",
    output: "ball",
    crop: { left: 90, top: 108, width: 1096, height: 1080 },
    width: 384,
    height: 384,
  },
  {
    source: "ball-v2.png",
    output: "ball-two",
    crop: { left: 94, top: 98, width: 1067, height: 1076 },
    width: 384,
    height: 384,
  },
  {
    source: "bubble-v1.png",
    output: "bubble",
    crop: { left: 178, top: 171, width: 899, height: 899 },
    width: 384,
    height: 384,
  },
  {
    source: "penguin-source-v1.png",
    output: "penguin",
    width: 512,
    height: 512,
    webp: { quality: 84, alphaQuality: 100, effort: 6 },
  },
];
const inventory = [];
for (const recipe of recipes) {
  const bytes = await readFile(`art/reference/${recipe.source}`);
  const sourceMetadata = await sharp(bytes).metadata();
  let pipeline = sharp(bytes);
  if (recipe.crop) pipeline = pipeline.extract(recipe.crop);
  await pipeline
    .resize(recipe.width, recipe.height, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .webp(recipe.webp ?? { quality: 92, alphaQuality: 100 })
    .toFile(`public/assets/${recipe.output}.webp`);
  inventory.push({
    ...recipe,
    sourceBytes: bytes.length,
    sourceWidth: sourceMetadata.width,
    sourceHeight: sourceMetadata.height,
    sourceHasAlpha: sourceMetadata.hasAlpha,
    sourceSha256: createHash("sha256").update(bytes).digest("hex"),
  });
}
await writeFile(
  "art/source-manifest.json",
  JSON.stringify(
    { generatedDuringDevelopment: true, recipes: inventory },
    null,
    2,
  ) + "\n",
);
console.log(
  "Exported six selected sprites. Next: node scripts/capture-assets.mjs with the dev server running.",
);
