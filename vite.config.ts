import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
const hash = createHash("sha256");
function include(path: string) {
  if (!existsSync(path)) return;
  for (const e of readdirSync(path, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    const p = join(path, e.name);
    if (e.isDirectory()) include(p);
    else {
      hash.update(p.replaceAll("\\", "/"));
      hash.update(readFileSync(p));
    }
  }
}
include("src");
include("public");
include("scripts");
for (const path of [
  "index.html",
  "package-lock.json",
  "vite.config.ts",
  "vercel.json",
])
  if (existsSync(path)) hash.update(readFileSync(path));
const buildId =
  process.env.BUILD_ID || `preview-${hash.digest("hex").slice(0, 12)}`;
export default defineConfig({
  plugins: [
    react(),
    {
      name: "build-label",
      generateBundle() {
        this.emitFile({
          type: "asset",
          fileName: "build-label.json",
          source: JSON.stringify({ buildId }),
        });
      },
    },
  ],
  build: { target: "safari16.4" },
  define: { __BUILD_ID__: JSON.stringify(buildId) },
  test: { include: ["tests/unit/**/*.test.ts"] },
});
