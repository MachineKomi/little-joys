# Little Joys deployment policy

GitHub is the backup and collaboration source. Vercel publishes deliberately versioned, material playtest builds. Keep private observations, source transcripts, credentials and family information out of both services.

The configured playtest address is **[littlejoys-play.vercel.app](https://littlejoys-play.vercel.app/)**. The requested `little-joys.vercel.app` was already assigned to another team. The new free Vercel alias belongs to this project's existing environment; no domain purchase or separate service was created. Announce playtest readiness only after verifying the actual release at this address. The older `little-joys-gules.vercel.app` alias remains available.

## Automatic release selection

`vercel.json` limits automatic Git deployments to `main` and runs `node scripts/should-build.mjs` before dependency installation. Both conditions must hold against the last successful deployment on that branch:

1. `package.json` has a higher stable `MAJOR.MINOR.PATCH` version.
2. The deployable-input fingerprint has changed.

The Node program returns the explicit sentinel `42` only when it approves a build. The small POSIX wrapper in `ignoreCommand` maps that sentinel to Vercel's `1` (build) and every other outcome to `0` (skip). Missing scripts, parse/import failures and unexpected process errors therefore do not accidentally permit a build. Run the complete `ignoreCommand` when checking Vercel exit semantics; a direct Node invocation intentionally uses the sentinel instead.

Examples:

| GitHub change | Automatic Vercel build |
|---|---|
| README, specs, research, evidence, tests or source-art backup | Skip |
| Runtime change without increasing the release version | Skip |
| Version bump with unchanged deployable inputs | Skip |
| Runtime/assets/build configuration change plus `0.1.0` → `0.1.1` | Build |
| Lower/equal release, invalid version, unknown deployment baseline | Skip |
| Any other branch | Disabled |

The material-input list is centralized in `scripts/deployment-inputs.mjs` and also determines the visible build label. It covers runtime source, shipped public assets, HTML, production build configuration and the production/build dependency closure. Package version, documentation and test-only metadata are normalized out of that fingerprint. The build label includes the version separately. Editing art masters or export recipes only becomes a material release when the actual shipped assets change. Starting in v0.1.1, `vercel.json` is fingerprinted as canonical JSON so provider formatting does not change the build label; semantic configuration changes still count.

Vercel may record a skipped/canceled deployment entry and run the small gate; it does not then install dependencies, build the game or upload another completed game artifact. Canceled entries can still count toward Vercel deployment/concurrency limits. This policy avoids duplicate game artifacts, not every provider operation. See the official [ignored-build limits](https://vercel.com/docs/project-configuration/project-settings#ignored-build-step), [exit-code behavior](https://vercel.com/docs/project-configuration/vercel-json#ignorecommand) and [Git deployment configuration](https://vercel.com/docs/project-configuration/git-configuration).

## Publish a material playtest release

1. Complete and review the playable changes. Run `npm version patch --no-git-tag-version` for the next patch, or deliberately choose a larger release. Commit both package files.
2. Run `npm run check`; inspect the actual game and the build label in `dist/build-label.json`. Do not treat a version bump as evidence of quality or physical-device qualification.
3. Commit the material changes and push `main`. The gate compares against `VERCEL_GIT_PREVIOUS_SHA`, the last successful deployment for this project and branch.
4. Open the actual deployed HTTPS URL. Verify its build label, exact shipped assets, all four toys, and offline relaunch before recording it as the current playtest build.
5. Push the resulting documentation/evidence separately if necessary. Without another higher version and material change, that backup skips the build.

## First deployment and recovery

Import only `MachineKomi/little-joys` into its own Vercel project. Use the Other/static preset, repository root, `npm ci`, `npm run build`, output `dist`, and the repository headers. Leave automatic system environment variables enabled. No runtime secrets, accounts, generation keys or analytics are required.

The gate deliberately skips when there is no trustworthy successful baseline, including the first deployment. For the reviewed first release, deliberately deploy the exact checked commit through the dashboard/manual deployment flow. This establishes a baseline; do not leave an always-build override configured. A manual deployment or redeployment is an explicit release action and can bypass the automatic policy.

If the initial import is canceled by the gate, open that exact deployment's **Redeploy** action and uncheck **Use project's Ignore Build Step** for this one run. This is Vercel's [documented redeployment control](https://vercel.com/docs/project-configuration/project-settings#ignore-build-step-on-redeploy); it does not remove the repository gate for future Git pushes.

Vercel documents a shallow clone with ten commits. If the previous successful SHA is outside the available history, the gate makes one bounded fetch of that exact validated SHA from `origin`. It does not fetch an arbitrary branch tip or publish anything. If retrieval fails, the gate skips instead of guessing; restore the baseline or deliberately deploy the reviewed version manually. Do not substitute the immediately preceding documentation commit as the successful-deployment baseline. The [system-variable reference](https://vercel.com/docs/environment-variables/system-environment-variables#vercel_git_previous_sha) describes the baseline, and the [ignored-build guide](https://vercel.com/kb/guide/how-do-i-use-the-ignored-build-step-field-on-vercel) describes shallow history and system-variable exposure.

Keep Git metadata available in Vercel's build checkout: do not add `.git` to `.vercelignore`. The release gate reads that local history before dependency installation. The published output is strictly `dist`; Git metadata, source masters, private notes and raw test artifacts are not runtime assets. The first v0.1.0 documentation backup was safely canceled because its ignore file had removed the gate's history. That observed cancellation did not verify version comparison on Vercel. The v0.1.1 fix retains checkout history and adds a regression check; the actual provider decision is recorded separately from local gate tests.

Rollbacks are deliberate manual deployments of a known checked revision. The automatic gate rejects lower versions. After any replacement deployment, let its cache complete and close all older tabs/Home Screen windows; updates never reload a toy mid-play. Do not delete the last known-good deployment merely to tidy history.

## Recorded evidence

Current hosted status, source revision, build ID and the documentation-only gate check belong in [docs/DELIVERY.md](docs/DELIVERY.md). Only record a URL after actually opening and checking it.

The v0.1.1 release now has actual provider evidence for both paths: a higher material version built automatically, and the following documentation/evidence backup skipped because its version had not increased. See the [sanitized deployment-policy receipt](docs/evidence/deployment-policy.json). The latter created only a canceled history entry and did not install dependencies, build the app or upload another completed game.
