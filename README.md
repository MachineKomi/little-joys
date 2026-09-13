# Little Joys

A small, quiet touchscreen toybox: stretch **Squishy Friend**, sweep through **Bubble Pond**, move soft balls into **Roll & Nest**, or send balls bouncing around **Penguin Bounce**. No scores, timers, accounts, tracking, instructions to answer, or progression. Four toys, with original painted sprites and optional music and effects.

**Preview; physical iPad validation pending.** The engineering target is an eighth-generation iPad and similarly modest devices. Desktop browser tests do not qualify that hardware. See [delivery evidence](docs/DELIVERY.md), [requirements](docs/SPEC.md), and [review](docs/REVIEW.md).

**[Open the playtest](https://littlejoys-play.vercel.app/).** [Penguin Bounce](docs/PENGUIN-BOUNCE-SPEC.md) is implemented for v0.1.1. The metadata-corrected four-toy release is completing final verification; [DELIVERY.md](docs/DELIVERY.md) distinguishes the checked local build from the last verified hosted release. See the [owner direction](docs/OWNER-DIRECTION.md), [roadmap](docs/ROADMAP.md), and [backlog](docs/BACKLOG.md) for recoverable public planning.

## Run locally

Use Node.js 22.12 or later (tested with Node 24.19) and npm.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. For another device on the same local network, use the development machine's LAN address and Vite port. Service workers need HTTPS or localhost; LAN HTTP is useful for interaction inspection, not offline installation qualification.

```sh
npm run build
node scripts/serve-dist.mjs
```

The production harness serves [http://127.0.0.1:4173](http://127.0.0.1:4173) with the actual headers from `vercel.json`, including CSP, exact asset responses, and audio byte ranges. `dist` is the complete static output. Builds require no image-generation credentials or backend service.

## Play and parent controls

- The last selected toy opens immediately; the first visit opens Squishy Friend.
- Drag different parts of the friend, swipe across bubbles, or pick up and release balls near the bowl. Two balls can be removed independently.
- In **Penguin Bounce**, tap open board space to add a ball, tap either broad wooden deflector to turn it, and swipe near balls to nudge them. The board settles after play; another tap always works, including when its ball pool is full.
- **Pause** freezes play. **Mute** only turns sound off. Both music and effects start silent on every fresh visit until an adult enables them.
- **Toybox** has four stable picture tiles. Hold the small parent control for two seconds to open settings; keyboard and assistive-technology activation are also supported.
- Parent settings offer three/six bubbles, one/two nesting balls, drag/tap-to-place, eight/16/24 bouncing balls, Gentle/Playful motion, startup toy, separate sound/music controls, and local technical status. System reduced motion always uses Gentle.

The DOM controls are labelled and keyboard reachable. Canvas toy manipulation is a direct-touch/pointer experience; full nonvisual toy interaction is not claimed.

Phone feedback has identified interaction and presentation work still needed in the original three toys: stronger squish, more responsive/varied bubbles, ball/bowl halo/shadow/occlusion fixes and a warmer shell. The fourth-toy release does not claim to fix these. See the [prioritized refinement record](docs/FEEDBACK-AND-REFINEMENTS.md).

## Test

```sh
npx playwright install chromium webkit
npm run check
```

This runs unit tests, TypeScript and production build, asset/provenance audit, transfer/memory-estimate budgets, and Chromium/WebKit browser tests. Browser tests use the production server and include synthetic multi-touch, cancellation, pause, settings, offline cache failures and safe two-window updates.

Release-gate tests also require Git and a POSIX shell (Git for Windows at its standard installation path on Windows). They exercise real temporary Git history and the exact Vercel command, including failure paths.

With the production harness running, `node scripts/measure-preview.mjs` records a documented desktop startup trace, bounded active workloads, and screenshots in `docs/evidence`. It includes maximum-count Penguin Bounce in both motion modes. `TRACE_SECONDS=60` can lengthen the desktop workload. These are diagnostic proxies, not physical touch-to-photon or iPad performance measurements.

After building the same revision as a deployed release, run `node scripts/verify-hosted.mjs https://littlejoys-play.vercel.app/` to verify exact hosted files, all four toys online/offline, silent startup, settings, CSP, and cached music ranges. This writes a hosted evidence report only on success; a different deployed build correctly fails comparison.

## Deploy to Vercel

No deployment URL is claimed by this repository unless recorded in `docs/DELIVERY.md` after opening and checking it.

1. Import the intended `MachineKomi/little-joys` repository into a new Vercel project. Do not attach another game's project.
2. Use the **Other** static preset (`framework: null` in `vercel.json`), repository root `.`, install command `npm ci`, build command `npm run build`, and output directory `dist`. Keep automatic system environment variables enabled; no application secrets are required.
3. Deploy a preview. Open its actual HTTPS URL and check the build identifier in Parent settings against `dist/build-label.json`.
4. Run the offline/install and physical-device checklist in [TASKS-AND-ACCEPTANCE.md](docs/TASKS-AND-ACCEPTANCE.md). Record real observations separately from public source.

For an authenticated CLI workflow from this folder: `npx vercel` creates a preview using `vercel.json`; inspect the proposed project before linking it. Use `--prod` only when deliberately promoting a checked build.

GitHub remains the backup and collaboration source. Automatic Vercel builds are limited to `main` and require **both a higher stable app version and changed deployable inputs**, compared with the last successful deployment. Documentation, specifications, tests, source artwork and measurement/export tooling do not qualify. A version-only bump also skips. For the next material playtest release, run the checks, use `npm version patch --no-git-tag-version` (or the appropriate larger release), and commit both package files with the material changes. The build label includes the version and a digest of deployment inputs.

The dependency-free `scripts/should-build.mjs` gate runs before installation. Missing deployment history fails closed, so an explicitly reviewed first deployment or rollback can require a manual dashboard deployment. An ignored push can leave a skipped/canceled history entry without uploading another game build. Vercel's [ignored-build documentation](https://vercel.com/docs/project-configuration/vercel-json#ignorecommand) specifies exit `0` to skip and `1` to build; its [system variables](https://vercel.com/docs/environment-variables/system-environment-variables#vercel_git_previous_sha) supply the last successful source revision. See [deployment policy](DEPLOYMENT.md) for the baseline and recovery procedure.

Updates download and verify in the background and wait until all old app windows close. They never force a reload during play. Parent settings shows cache readiness and update availability. To roll back, redeploy a previously checked source revision; close all existing tabs/Home Screen windows and relaunch after the replacement cache has completed. Browser storage can be evicted: offline availability is verified, not permanent.

## Architecture and assets

React owns the semantic shell; an imperative Canvas2D runtime owns input and animation. Four tracked pointers, six bubbles, two balls, 24 short effects, two SFX voices, one streaming music element, five shared sprite images, one canvas, and one active animation scheduler are bounded explicitly. DPR is capped at 1.5 and backing storage at two million pixels. Squishy Friend uses a locally deformed texture mesh; settled frames use a single image draw.

Selected generated originals and sanitized prompts live under `art`, with [image provenance](art/PROVENANCE.md), [sprite prompts](art/SPRITE-PROMPTS.md), and [audio provenance](art/AUDIO-PROVENANCE.md). Only audited derivatives ship under `public`; no generation runs at build time. To reproduce exports, run `node scripts/export-sprites.mjs`, then `node scripts/capture-assets.mjs` with the dev server on port 5173. The latter captures the actual implemented toy scenes for selector tiles/icons and refreshes the asset inventory.

The project is Apache-2.0; see [LICENSE](LICENSE). The included soundtrack is selectively reused with owner authorization. The other game repositories are read-only references and are not dependencies. No family identity, private observation, photos, recordings, API keys, or transcripts belong in public source. `.gitignore` excludes the original combined pack and private source notes; `.vercelignore` also excludes development artwork and documentation from uploads. Hosting request logs remain subject to the hosting provider.
