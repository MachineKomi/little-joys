import { defineConfig } from "vitest/config";

// Test tooling is intentionally independent of the production build config.
export default defineConfig({ test: { include: ["tests/unit/**/*.test.ts"] } });
