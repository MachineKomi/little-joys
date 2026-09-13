import { afterAll, describe, expect, it } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, copyFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { resolve, dirname, sep } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";

type Snapshot = { version: string; fingerprint: string };
const inputModule = new URL("../../scripts/deployment-inputs.mjs", import.meta.url).href;
const gateModule = new URL("../../scripts/should-build.mjs", import.meta.url).href;
const { materialFingerprint, buildIdentity, isDeploymentInput } = await import(inputModule) as {
  materialFingerprint(entries: Map<string, Buffer>): string;
  buildIdentity(root: string): string;
  isDeploymentInput(path: string): boolean;
};
const { decideDeployment, checkDeployment } = await import(gateModule) as {
  decideDeployment(input: { branch: string; current: Snapshot | null; previous?: Snapshot | null }): { build: boolean; exitCode: number; reason: string };
  checkDeployment(input: { cwd: string; env: Record<string, string | undefined> }): { build: boolean; exitCode: number; reason: string };
};

const temporary: string[] = [];
function directory() {
  const path = mkdtempSync(resolve(tmpdir(), "little-joys-deployment-"));
  temporary.push(path);
  return path;
}
afterAll(() => {
  for (const path of temporary) {
    if (!resolve(path).startsWith(resolve(tmpdir()) + sep)) throw new Error("Unsafe fixture cleanup path");
    rmSync(path, { recursive: true, force: true });
  }
});

function fixture(version = "0.1.0", code = "export const color = 'teal';\n") {
  const pkg = { name: "little-joys", version, type: "module", description: "test metadata", dependencies: { react: "^19.0.0" }, devDependencies: { vite: "^7.0.0", vitest: "^4.0.0" }, scripts: { build: "vite build", test: "vitest run" } };
  const lock = { name: "little-joys", version, lockfileVersion: 3, packages: {
    "": { ...pkg },
    "node_modules/react": { version: "19.0.0", integrity: "react-a" },
    "node_modules/vite": { version: "7.0.0", dev: true, integrity: "vite-a", dependencies: { rollup: "^4" } },
    "node_modules/rollup": { version: "4.0.0", dev: true, integrity: "rollup-a" },
    "node_modules/vitest": { version: "4.0.0", dev: true, integrity: "test-a" },
  } };
  return new Map<string, Buffer>([
    ["package.json", Buffer.from(JSON.stringify(pkg))],
    ["package-lock.json", Buffer.from(JSON.stringify(lock))],
    ["src/main.ts", Buffer.from(code)],
    ["index.html", Buffer.from("<!doctype html><div id='root'></div>")],
  ]);
}
function mutate(entries: Map<string, Buffer>, path: string, change: (value: any) => void) {
  const value = JSON.parse(entries.get(path)!.toString());
  change(value);
  entries.set(path, Buffer.from(JSON.stringify(value)));
}
function writeTree(root: string, entries: Map<string, Buffer>) {
  for (const [path, bytes] of entries) {
    mkdirSync(dirname(resolve(root, path)), { recursive: true });
    writeFileSync(resolve(root, path), bytes);
  }
}

describe("automatic playtest deployment decisions", () => {
  const previous = { version: "0.1.0", fingerprint: "same" };
  it.each([
    ["docs-only push", "0.1.0", "same", false],
    ["code without version bump", "0.1.0", "changed", false],
    ["version-only push", "0.1.1", "same", false],
    ["material change and patch", "0.1.1", "changed", true],
    ["material change and minor", "0.2.0", "changed", true],
    ["material change and major", "1.0.0", "changed", true],
    ["rollback", "0.0.9", "changed", false],
    ["prerelease-only label", "0.1.1-beta.1", "changed", false],
    ["build metadata label", "0.1.0+backup", "changed", false],
    ["invalid leading zero", "0.01.1", "changed", false],
  ])("%s", (_name, version, fingerprint, expected) => {
    const result = decideDeployment({ branch: "main", current: { version: version as string, fingerprint: fingerprint as string }, previous });
    expect(result.build).toBe(expected);
    expect(result.exitCode).toBe(expected ? 1 : 0);
  });
  it("requires a deliberate first deployment; missing history never bootstraps", () => {
    expect(decideDeployment({ branch: "main", current: previous }).build).toBe(false);
    expect(decideDeployment({ branch: "main", current: { version: "0.1.1", fingerprint: "new" }, previous: { version: "invalid", fingerprint: "old" } }).build).toBe(false);
  });
  it("does not auto-build another branch or missing current metadata", () => {
    expect(decideDeployment({ branch: "feature", current: { version: "0.1.1", fingerprint: "new" }, previous }).build).toBe(false);
    expect(decideDeployment({ branch: "main", current: null, previous }).build).toBe(false);
  });
});

describe("shared material-input fingerprint", () => {
  it("ignores docs, source-art, tests, backup files and measurement/export recipes", () => {
    const entries = fixture();
    const before = materialFingerprint(entries);
    for (const path of ["docs/SPEC.md", "art/reference/source.png", "tests/unit/new.test.ts", "scripts/measure-preview.mjs", "scripts/export-sprites.mjs", "vitest.config.ts", "tsconfig.test.json", "backup/package.json"]) {
      expect(isDeploymentInput(path)).toBe(false);
      entries.set(path, Buffer.from("changed"));
    }
    expect(materialFingerprint(entries)).toBe(before);
  });
  it("normalizes package and root-lock version fields and test-only metadata", () => {
    const before = fixture();
    const after = fixture("0.1.1");
    mutate(after, "package.json", pkg => { pkg.description = "new notes"; pkg.scripts.test = "new test command"; pkg.devDependencies.vitest = "^4.1.0"; });
    mutate(after, "package-lock.json", lock => { lock.packages[""].description = "new notes"; lock.packages["node_modules/vitest"].version = "4.1.0"; });
    expect(materialFingerprint(after)).toBe(materialFingerprint(before));
  });
  it.each(["node_modules/react", "node_modules/vite", "node_modules/rollup"])("counts resolved production/build dependency changes: %s", path => {
    const entries = fixture();
    const before = materialFingerprint(entries);
    mutate(entries, "package-lock.json", lock => { lock.packages[path].integrity = "changed-artifact"; });
    expect(materialFingerprint(entries)).not.toBe(before);
  });
  it("counts deployed assets, production config and precache code", () => {
    for (const path of ["src/main.ts", "public/assets/friend.webp", "tsconfig.json", "vercel.json", "scripts/build-sw.mjs", "scripts/deployment-inputs.mjs"]) {
      const entries = fixture();
      const before = materialFingerprint(entries);
      entries.set(path, Buffer.from("material change"));
      expect(materialFingerprint(entries)).not.toBe(before);
    }
  });
  it("uses deterministic ordering and normalizes source line endings", () => {
    const entries = fixture();
    const before = materialFingerprint(entries);
    entries.set("src/main.ts", Buffer.from(entries.get("src/main.ts")!.toString().replace(/\n/g, "\r\n")));
    expect(materialFingerprint(new Map([...entries].reverse()))).toBe(before);
  });
  it("prefixes deterministic build identity with the actual app version", () => {
    const root = directory();
    writeTree(root, fixture());
    const initial = buildIdentity(root);
    expect(initial).toMatch(/^v0\.1\.0-[a-f0-9]{12}$/);
    writeTree(root, new Map([["docs/notes.md", Buffer.from("notes")]]));
    expect(buildIdentity(root)).toBe(initial);
    writeTree(root, fixture("0.1.1"));
    expect(buildIdentity(root)).toBe(initial.replace("v0.1.0-", "v0.1.1-"));
    writeTree(root, fixture("0.1.1", "export const color = 'mint';\n"));
    expect(buildIdentity(root)).not.toBe(initial.replace("v0.1.0-", "v0.1.1-"));
  });
});

describe("real Git history and fail-closed Vercel launcher", () => {
  it("fetches only the missing successful SHA from shallow history and skips an unavailable origin", () => {
    const source = directory();
    const git = (cwd: string, ...args: string[]) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
    git(source, "init", "--quiet", "--initial-branch=main");
    git(source, "config", "user.name", "Deployment Test"); git(source, "config", "user.email", "test@example.invalid");
    const commit = () => { git(source, "add", "."); git(source, "commit", "--quiet", "-m", "fixture"); return git(source, "rev-parse", "HEAD"); };
    writeTree(source, fixture());
    const previous = commit();
    for (let i = 0; i < 11; i++) { writeTree(source, new Map([["docs/notes.md", Buffer.from(`backup ${i}`)]])); commit(); }
    writeTree(source, fixture("0.1.1", "export const color = 'mint';\n"));
    const head = commit();
    const env = { VERCEL_GIT_COMMIT_REF: "main", VERCEL_GIT_PREVIOUS_SHA: previous, VERCEL_GIT_COMMIT_SHA: head };
    for (const available of [true, false]) {
      const clone = directory();
      git(source, "clone", "--quiet", "--depth=1", pathToFileURL(source).href, clone);
      expect(() => git(clone, "cat-file", "-e", `${previous}^{commit}`)).toThrow();
      if (!available) git(clone, "remote", "set-url", "origin", resolve(clone, "missing-origin"));
      expect(checkDeployment({ cwd: clone, env }).build).toBe(available);
      if (available) expect(git(clone, "rev-parse", previous)).toBe(previous);
      expect(git(clone, "rev-parse", "HEAD")).toBe(head);
      expect(git(clone, "status", "--porcelain")).toBe("");
    }
  }, 20000);
  it("compares the successful deployment SHA, not merely the parent, and handles missing objects", () => {
    const root = directory();
    const git = (...args: string[]) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
    git("init", "--quiet", "--initial-branch=main");
    git("config", "user.name", "Deployment Test"); git("config", "user.email", "test@example.invalid");
    const commit = () => { git("add", "."); git("commit", "--quiet", "-m", "fixture"); return git("rev-parse", "HEAD"); };
    writeTree(root, fixture());
    const previous = commit();
    const env = { ...process.env, VERCEL_GIT_COMMIT_REF: "main", VERCEL_GIT_PREVIOUS_SHA: previous, VERCEL_GIT_COMMIT_SHA: undefined };
    expect(checkDeployment({ cwd: root, env: { ...env, VERCEL_GIT_PREVIOUS_SHA: undefined } }).build).toBe(false);
    writeTree(root, new Map([["docs/notes.md", Buffer.from("backup notes")]])); commit();
    expect(checkDeployment({ cwd: root, env }).build).toBe(false);
    writeTree(root, fixture("0.1.0", "export const color = 'mint';\n")); commit();
    expect(checkDeployment({ cwd: root, env }).build).toBe(false);
    writeTree(root, fixture("0.1.1", "export const color = 'mint';\n"));
    const current = commit();
    expect(checkDeployment({ cwd: root, env }).build).toBe(true);
    expect(checkDeployment({ cwd: root, env: { ...env, VERCEL_GIT_PREVIOUS_SHA: "a".repeat(40) } }).build).toBe(false);
    expect(checkDeployment({ cwd: root, env: { ...env, VERCEL_GIT_COMMIT_SHA: previous } }).build).toBe(false);
    expect(checkDeployment({ cwd: root, env: { ...env, VERCEL_GIT_PREVIOUS_SHA: current } }).build).toBe(false);

    const shell = process.platform === "win32" ? "C:/Program Files/Git/usr/bin/sh.exe" : "/bin/sh";
    if (!existsSync(shell)) throw new Error("POSIX shell needed to verify actual Vercel ignoreCommand");
    const wrapper = JSON.parse(readFileSync(resolve("vercel.json"), "utf8")).ignoreCommand;
    mkdirSync(resolve(root, "scripts"));
    copyFileSync(resolve("scripts/should-build.mjs"), resolve(root, "scripts/should-build.mjs"));
    copyFileSync(resolve("scripts/deployment-inputs.mjs"), resolve(root, "scripts/deployment-inputs.mjs"));
    const run = () => spawnSync(shell, ["-c", wrapper], { cwd: root, env, encoding: "utf8" });
    expect(run().status).toBe(1); // Only deliberate BUILD sentinel42 maps to Vercel1.
    writeFileSync(resolve(root, "scripts/deployment-inputs.mjs"), "invalid syntax @@@");
    expect(run().status).toBe(0); // Import/syntax failures must not accidentally build.
    writeFileSync(resolve(root, "scripts/should-build.mjs"), "invalid syntax @@@");
    expect(run().status).toBe(0); // Even a broken launcher fails closed.
  }, 20000);
});
