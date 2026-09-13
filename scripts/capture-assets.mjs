// Development export only; never called during install/build. Start npm run dev first.
import { chromium } from "@playwright/test";
import sharp from "sharp";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("http://127.0.0.1:5173");
await mkdir("public/assets", { recursive: true });
await mkdir("public/icons", { recursive: true });
const assets = [];
async function record(id, path, provenance) {
  const bytes = await readFile("public" + path);
  const meta = await sharp(bytes).metadata();
  assets.push({
    id,
    kind: "raster",
    path,
    width: meta.width,
    height: meta.height,
    encodedBytes: bytes.length,
    decodedBytes: meta.width * meta.height * 4,
    alpha: meta.hasAlpha,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    provenance,
  });
}
async function render(toy, width, height) {
  return Buffer.from(
    await page.evaluate(
      async ({ toy, width, height }) => {
        const names = {
          squishy: "SquishyScene",
          bubbles: "BubbleScene",
          nest: "NestScene",
        };
        const module = await import(`/src/toys/${toy}/scene.ts`);
        const { defaults } = await import("/src/core/settings.ts");
        const images = {};
        await Promise.all(
          Object.entries({
            friend: "friend",
            bowl: "bowl",
            ball: "ball",
            ballTwo: "ball-two",
            bubble: "bubble",
          }).map(
            ([key, name]) =>
              new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                  images[key] = img;
                  resolve();
                };
                img.onerror = resolve;
                img.src = `/assets/${name}.webp`;
              }),
          ),
        );
        const scene = new module[names[toy]]({
          settings: defaults,
          sound: () => {},
          image: (key) => images[key],
        });
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        scene.resize({ width, height });
        scene.update(0);
        scene.render(canvas.getContext("2d"));
        scene.dispose();
        return canvas.toDataURL("image/png").split(",")[1];
      },
      { toy, width, height },
    ),
    "base64",
  );
}
try {
  for (const toy of ["squishy", "bubbles", "nest"]) {
    const bytes = await render(toy, 512, 384);
    await sharp(bytes)
      .resize(384, 288)
      .removeAlpha()
      .png()
      .toFile(`public/assets/toy-${toy}.png`);
    await record(
      `toy-${toy}`,
      `/assets/toy-${toy}.png`,
      `Captured from the implemented ${toy} scene and original generated sprites.`,
    );
  }
  const icon = await render("squishy", 768, 768);
  for (const [name, size] of [
    ["icon-192", 192],
    ["icon-512", 512],
    ["apple-touch-icon", 180],
  ]) {
    await sharp(icon)
      .extract({ left: 84, top: 84, width: 600, height: 600 })
      .resize(size, size)
      .removeAlpha()
      .png()
      .toFile(`public/icons/${name}.png`);
    await record(
      name,
      `/icons/${name}.png`,
      "Original generated mascot captured in the implemented scene; art/PROVENANCE.md.",
    );
  }
  for (const name of ["friend", "bowl", "ball", "ball-two", "bubble"])
    await record(
      name,
      `/assets/${name}.webp`,
      "Original development-time OpenAI image generation. Inspected runtime export; art/PROVENANCE.md and art/SPRITE-PROMPTS.md.",
    );
  for (const toy of ["squishy", "bubbles", "nest"])
    assets.push({
      id: `geometry-${toy}`,
      kind: "procedural",
      path: `src/toys/${toy}/scene.ts`,
      provenance: "Original Canvas2D geometry and drawing for Little Joys.",
    });
  assets.push({
    id: "sfx",
    kind: "procedural",
    path: "src/core/audio.ts",
    provenance:
      "Original bounded sine tone synthesis; one consistent frequency per toy.",
  });
  const music = await readFile("public/assets/music.mp3");
  assets.push({
    id: "music",
    kind: "audio",
    path: "/assets/music.mp3",
    encodedBytes: music.length,
    sha256: createHash("sha256").update(music).digest("hex"),
    provenance:
      "Owner-delivered original soundtrack, selectively reused with current owner authorization; art/AUDIO-PROVENANCE.md. Streamed through one element; not decoded as full-track AudioBuffer.",
  });
  await writeFile(
    "public/assets/asset-manifest.json",
    JSON.stringify({ schemaVersion: 1, assets }, null, 2) + "\n",
  );
  console.log("Exported 3 toy captures and 3 platform icon sizes.");
} finally {
  await browser.close();
}
