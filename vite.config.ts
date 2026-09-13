import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// The same input definition powers the deployment gate. Reports, tests and
// export/measurement scripts do not create a new runtime/cache identity.
const modulePath = new URL("./scripts/deployment-inputs.mjs", import.meta.url).href;
const { buildIdentity } = await import(modulePath) as { buildIdentity(root?: string): string };
const buildId = buildIdentity();
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
});
