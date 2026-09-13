import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

// Keep this list shared by deployment selection and build identity. Development
// reports, tests, source art, capture/export recipes and measurements are excluded.
const files = new Set([
  "index.html", "tsconfig.json", "vite.config.ts", "vercel.json", ".vercelignore",
  "package.json", "package-lock.json", "scripts/build-sw.mjs", "scripts/deployment-inputs.mjs",
]);
const buildTools = new Set([
  "vite", "@vitejs/plugin-react", "typescript", "@types/node", "@types/react", "@types/react-dom",
]);
const buildScripts = new Set(["prebuild", "build", "postbuild", "preinstall", "install", "postinstall", "prepare"]);

export function isDeploymentInput(path) {
  return files.has(path) || path.startsWith("src/") || path.startsWith("public/");
}

function sorted(value) {
  if (Array.isArray(value)) return value.map(sorted);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [key, sorted(value[key])]));
  return value;
}

export function normalizedPackage(pkg) {
  const result = {};
  for (const field of ["name", "type", "engines", "packageManager", "dependencies", "optionalDependencies", "peerDependencies", "overrides"])
    if (pkg[field] !== undefined) result[field] = pkg[field];
  result.devDependencies = Object.fromEntries(Object.entries(pkg.devDependencies || {}).filter(([name]) => buildTools.has(name)));
  result.scripts = Object.fromEntries(Object.entries(pkg.scripts || {}).filter(([name]) => buildScripts.has(name)));
  return sorted(result);
}

export function normalizedLock(lock, pkg) {
  if (lock.lockfileVersion !== 3 || !lock.packages || !lock.packages[""]) throw new Error("Expected package-lock v3 with root package metadata");
  const selected = {};
  const roots = normalizedPackage(pkg);
  const queue = Object.keys({ ...roots.dependencies, ...roots.optionalDependencies, ...roots.peerDependencies, ...roots.devDependencies }).map(name => ["", name]);
  function locate(from, name) {
    let directory = from;
    for (;;) {
      const key = `${directory ? directory + "/" : ""}node_modules/${name}`;
      if (lock.packages[key]) return key;
      if (!directory) return null;
      directory = directory.includes("/") ? directory.slice(0, directory.lastIndexOf("/")) : "";
    }
  }
  while (queue.length) {
    const [from, name] = queue.pop();
    const path = locate(from, name);
    // Optional/peer dependencies may legitimately be absent on this platform.
    if (!path || selected[path]) continue;
    const entry = lock.packages[path];
    const material = {};
    for (const key of ["version", "resolved", "integrity", "dependencies", "optionalDependencies", "peerDependencies", "peerDependenciesMeta", "engines", "bin", "cpu", "os", "libc", "hasInstallScript", "inBundle", "link"])
      if (entry[key] !== undefined) material[key] = entry[key];
    selected[path] = material;
    for (const dependency of Object.keys({ ...entry.dependencies, ...entry.optionalDependencies, ...entry.peerDependencies })) queue.push([path, dependency]);
  }
  return sorted({ lockfileVersion: 3, packages: selected });
}

/** Stable numeric releases only; prerelease/build labels are not playtest releases. */
export function parseRelease(version) {
  if (typeof version !== "string" || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) return null;
  const parts = version.split(".").map(Number);
  return parts.every(Number.isSafeInteger) ? parts : null;
}

export function compareReleases(a, b) {
  const left = parseRelease(a), right = parseRelease(b);
  if (!left || !right) throw new Error("Release versions must use stable MAJOR.MINOR.PATCH");
  for (let i = 0; i < 3; i++) if (left[i] !== right[i]) return left[i] > right[i] ? 1 : -1;
  return 0;
}

/** Map paths to actual bytes, including uncommitted material changes for local builds. */
export function workingInputs(root = resolve(".")) {
  const entries = new Map();
  for (const path of files) if (existsSync(join(root, path))) entries.set(path, readFileSync(join(root, path)));
  function walk(path) {
    if (!existsSync(join(root, path))) return;
    for (const entry of readdirSync(join(root, path), { withFileTypes: true })) {
      const child = `${path}/${entry.name}`;
      if (entry.isDirectory()) walk(child);
      else if (entry.isFile()) entries.set(child, readFileSync(join(root, child)));
      else throw new Error(`Unsupported deployment input: ${child}`);
    }
  }
  walk("src"); walk("public");
  return entries;
}

export function materialFingerprint(entries) {
  const packageBytes = entries.get("package.json");
  if (!packageBytes) throw new Error("No package.json in deployment inputs");
  const pkg = JSON.parse(packageBytes.toString());
  const hash = createHash("sha256");
  for (const [path, raw] of [...entries].filter(([path]) => isDeploymentInput(path)).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) {
    let bytes = Buffer.from(raw);
    if (path === "package.json") bytes = Buffer.from(JSON.stringify(normalizedPackage(pkg)));
    else if (path === "package-lock.json") bytes = Buffer.from(JSON.stringify(normalizedLock(JSON.parse(bytes.toString()), pkg)));
    else if (/\.(?:mjs|js|ts|tsx|css|json|html|webmanifest)$/.test(path) || path === ".vercelignore") bytes = Buffer.from(bytes.toString().replace(/\r\n/g, "\n"));
    hash.update(path); hash.update("\0"); hash.update(String(bytes.length)); hash.update("\0"); hash.update(bytes);
  }
  return hash.digest("hex");
}

export function buildIdentity(root = resolve(".")) {
  const entries = workingInputs(root);
  const version = JSON.parse(entries.get("package.json").toString()).version;
  if (!parseRelease(version)) throw new Error("App version must use stable MAJOR.MINOR.PATCH");
  return `v${version}-${materialFingerprint(entries).slice(0, 12)}`;
}
