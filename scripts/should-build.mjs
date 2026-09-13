import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { compareReleases, isDeploymentInput, materialFingerprint, parseRelease } from "./deployment-inputs.mjs";

const skip = reason => ({ build: false, exitCode: 0, reason });
const build = reason => ({ build: true, exitCode: 1, reason });

/** Vercel ignoreCommand semantics are deliberately inverted: 0 skips, 1 builds. */
export function decideDeployment({ branch, current, previous }) {
  if (branch !== "main") return skip("Automatic deployments are limited to main");
  const currentVersion = current?.version;
  if (!parseRelease(currentVersion)) return skip("Current package version must use stable MAJOR.MINOR.PATCH");
  if (!current?.fingerprint) return skip("Current deployable inputs are unavailable");
  if (!previous) return skip("No trustworthy last-deployed baseline; use a reviewed manual deployment");
  if (!parseRelease(previous.version) || !previous.fingerprint) return skip("Previous deployment version or inputs are unavailable");
  if (compareReleases(currentVersion, previous.version) <= 0) return skip("App version has not increased beyond the last successful deployment");
  if (current.fingerprint === previous.fingerprint) return skip("Version changed but deployable inputs did not");
  return build(`Material playtest release ${previous.version} -> ${currentVersion}`);
}

function git(cwd, args, options = {}) {
  return execFileSync("git", args, { cwd, stdio: ["pipe", "pipe", "pipe"], maxBuffer: 32 * 1024 * 1024, ...options });
}
function resolveCommit(cwd, ref) {
  return git(cwd, ["rev-parse", "--verify", `${ref}^{commit}`]).toString().trim();
}

function resolvePreviousCommit(cwd, sha) {
  try { return resolveCommit(cwd, sha); }
  catch {
    // Vercel's shallow checkout may omit the last successful deployment after
    // many documentation pushes. Fetch only its validated immutable SHA, never
    // a branch or a checkout; network/history failure still means SKIP.
    git(cwd, ["fetch", "--no-tags", "--depth=1", "origin", sha], { timeout: 15000 });
    return resolveCommit(cwd, sha);
  }
}

export function gitInputs(cwd, ref) {
  const inventory = git(cwd, ["ls-tree", "-r", "-z", ref]).toString().split("\0").filter(Boolean).map(line => {
    const tab = line.indexOf("\t");
    const [mode, type, oid] = line.slice(0, tab).split(" ");
    return { mode, type, oid, path: line.slice(tab + 1) };
  }).filter(entry => isDeploymentInput(entry.path));
  if (inventory.some(entry => entry.type !== "blob" || entry.mode === "120000")) throw new Error("Unsupported linked deployment input");
  const objects = git(cwd, ["cat-file", "--batch"], { input: inventory.map(entry => entry.oid).join("\n") + "\n" });
  const entries = new Map();
  let offset = 0;
  for (const entry of inventory) {
    const end = objects.indexOf(10, offset);
    const [oid, kind, rawSize] = objects.subarray(offset, end).toString().split(" ");
    const size = Number(rawSize);
    if (oid !== entry.oid || kind !== "blob" || !Number.isSafeInteger(size) || size < 0 || end + 1 + size > objects.length) throw new Error("Incomplete Git object history");
    entries.set(entry.path, objects.subarray(end + 1, end + 1 + size));
    offset = end + 2 + size;
  }
  return entries;
}

function snapshot(cwd, ref) {
  const entries = gitInputs(cwd, ref);
  if (!entries.has("package.json")) return null;
  return { version: JSON.parse(entries.get("package.json").toString()).version, fingerprint: materialFingerprint(entries) };
}

export function checkDeployment({ cwd = process.cwd(), env = process.env } = {}) {
  try {
    if (env.VERCEL_GIT_COMMIT_REF !== "main") return skip("Automatic deployments require the verified main branch environment");
    const head = resolveCommit(cwd, "HEAD");
    if (env.VERCEL_GIT_COMMIT_SHA && (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(env.VERCEL_GIT_COMMIT_SHA) || resolveCommit(cwd, env.VERCEL_GIT_COMMIT_SHA) !== head)) return skip("Deployment commit and checked-out HEAD do not match");
    const current = snapshot(cwd, head);
    const previousSha = env.VERCEL_GIT_PREVIOUS_SHA;
    if (previousSha) {
      if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(previousSha)) return skip("Invalid previous-deployment SHA");
      const previous = snapshot(cwd, resolvePreviousCommit(cwd, previousSha));
      return decideDeployment({ branch: "main", current, previous });
    }
    // No bootstrap bypass: first deployment and missing history need deliberate
    // manual initiation. An absent parent must never be mistaken for no history.
    return decideDeployment({ branch: "main", current });
  } catch {
    return skip("Deployment history or metadata is unavailable/invalid. Restore the exact previous SHA or use a reviewed manual deployment");
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const decision = checkDeployment();
  console.log(`Little Joys: ${decision.build ? "BUILD" : "SKIP"} — ${decision.reason}`);
  // The POSIX Vercel wrapper maps only 42 to its BUILD exit1. Any module load,
  // syntax, missing Node/Git or unexpected process failure instead maps to SKIP0.
  process.exitCode = decision.build ? 42 : 0;
}
