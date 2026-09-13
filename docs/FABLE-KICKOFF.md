# Fable kickoff prompt

You are working on **Little Joys**, a small, original touchscreen software toybox in this repository. Take creative ownership of **Squishy Friend and Penguin Bounce**. The owner wants a materially more interesting, beautiful, tactile, permissive experience—not another plan, a static mock-up, or a tiny cosmetic change. Implement and test a substantial bounded improvement. Use your own design judgment; challenge the current implementation where it underserves the intent.

## Read first, in this order

1. `docs/AGENT-HANDOFF.md` — current work split, live baseline, unfinished checkpoint, exact test/performance limits and integration rules.
2. `docs/FABLE-TOY-FEEDBACK.md` — consolidated owner feedback on your two toys. Treat its latest explicit requests as the direction for reconciling older behavior rules.
3. `docs/OWNER-DIRECTION.md`, `docs/FEEDBACK-AND-REFINEMENTS.md`, `docs/BACKLOG.md`, `docs/ROADMAP.md` — product intent, remaining work and priorities. The latest handoff supersedes older active-sprint wording.
4. `README.md`, `docs/SPEC.md`, `docs/PENGUIN-BOUNCE-SPEC.md`, `docs/EXPRESSIVE-SQUISH-SPEC.md`, `docs/IMPLEMENTATION-NOTES.md` — runnable setup, normative constraints and owner amendments.
5. `docs/TASKS-AND-ACCEPTANCE.md`, `docs/DELIVERY.md`, `docs/REVIEW.md`, `docs/PWA-TEST-EVIDENCE.md`, `DEPLOYMENT.md` — acceptance, actual evidence, failed attempts, offline/update behavior and release policy. Read the warning at the top of DELIVERY: its c63c candidate was never deployed and missed the desktop pacing target.
6. `docs/ASSETS.md`, `art/PROVENANCE.md`, `art/SPRITE-PROMPTS.md`, `art/source-manifest.json`, `art/AUDIO-PROVENANCE.md` — art direction, original sources and reuse rights. Read `docs/RESEARCH.md`; consult `docs/SOURCES.md` when making or checking evidence/technical claims.

## What to improve

**Penguin Bounce:** make this feel like a generous, playful pachinko machine. The current sparse board lets too many balls fall straight down. Design routes, ricochets and large manipulable mechanisms that create varied physical consequences from broad, easy inputs. Use brighter varied colors and appealing original art. Give the penguin a meaningful visual or physical role. The newest request is a **continuous bounded supply of balls and interesting activity even without tapping**, with touch influencing the flow. Explicitly amend the old P07/T39 eventual-sleep/no-passive-spawn contract for that feature. Define its pause/background/Gentle behavior; do not make it an unbounded timer or let stopped play accumulate a catch-up burst. Use colorful local impact lights and effects, not strobing. Keep silent play complete and adult-enabled audio bounded. No gambling, score, lives, precision flippers, required success or progression.

**Squishy Friend:** retain the cute original painted identity, but make local manipulation expressive and varied. The owner wants stronger independent regional deformation, interesting face/eye/body response, directional recoil/swing and edge bouncing. Explore layering if it materially improves the result; a layer count or whole-image scale is not the goal. Multiple/addable friends were a tentative future idea, so choose a coherent bounded scope rather than automatically adding everything. Preserve reliable four-touch ownership, pickup on the actual deformed/moving object, immediate reclaim, pause and reduced motion.

The public engineering feedback is not evidence that a child enjoys the implementation. Make the toy compelling enough to test, then report what you actually built and observed.

## Existing code and unfinished work

- `src/toys/squishy/{deformation,mesh,scene,texture}.ts`
- `src/toys/bounce/{physics,scene}.ts`
- `src/core/{runtime,pointers,coordinates,settings,types,assets,audio,music}.ts`
- `src/app/` and `src/styles/base.css` for the shared shell; coordinate edits before touching files owned by the other lane.
- `tests/unit/expressive-squish.test.ts`, `tests/unit/mesh.test.ts`, `tests/unit/squishy.test.ts`, `tests/unit/bounce.test.ts`, `tests/e2e/expressive-squish.spec.ts`, `tests/e2e/bounce-browser.spec.ts` and shared lifecycle/PWA tests. Use `rg --files tests` to confirm names in your actual checkout.

Start with Git preflight: actual root, branch, HEAD, worktree status and current ownership. The saved handoff is on `codex/expressive-squish`, checkpoint `03c63d5` (following `e14daac`), unless later owner work has advanced it. Preserve uncommitted work; do not blindly reset, switch, stage everything or overwrite another agent's changes.

The last live build is **v0.1.1-50d0640d1f04** at **https://littlejoys-play.vercel.app/**. No v0.1.2 squish build was released. The current Squishy candidate before your changes is **v0.1.2-31fa4f57596f** with an 8×8 mesh/128 triangles. Its stronger pull, area guards, seam treatment and material-aware re-grab are useful starting work, but final full regression/review/performance qualification is incomplete. The prior 12×12 candidate passed interaction checks but had 49.9ms Gentle frame p95. Inspect the preserved data rather than inheriting a passing label. `docs/AGENT-HANDOFF.md` identifies the local traces and reviewed renders.

## Clean collaboration boundaries

Codex is actively assigned **Bubble Pond and Roll & Nest** in the separate worktree `.local/bubble-nest-worktree` on `codex/bubble-nest`, based on last backed-up main. It also owns the requested always-visible build label. Leave that worktree and those toy modules untouched. Do not import your whole branch into its worktree or reset shared Git state. Keep your changes in your own checkout/branch and stage explicit files.

Coordinate shared runtime/settings/audio/asset-manifest/parent-panel changes and final release integration through the handoff record and owner. A broad logo/parent-control redesign is recorded feedback but is not permission to collide with the other lane's shell work. Do not merge or deploy the other lane's unfinished code. Keep recoverable, sanitized commits and update your specs/backlog/handoff as work progresses.

## Architecture, performance and art

Use the existing Vite/TypeScript/React semantic shell and imperative Canvas2D runtime. Keep movement/physics outside React render state. Preserve shared pointer routing, stop paths, bounded pools and fixed/capped physics stepping. No server, runtime AI, tracking, accounts, large game engine, curriculum or progression system.

Target an eighth-generation iPad with 3GB RAM and similar modest devices. Measure demanding interactions, not just a static frame. Existing budgets include 200KiB gzip app JS, 2MiB initial transfer, 8MiB complete offline payload, 24MiB decoded-raster estimate, 2M visible canvas pixels and DPR cap1.5. Current Bounce caps are24 balls/24 effects; prefer richer interactions within those caps before changing resource contracts. Count prepared surfaces/transient raster allocations and dispose them. Report synchronous update/draw separately from frame intervals; a fast JavaScript timer can conceal expensive rasterization. Do not silently lower budgets, weaken tests, or call desktop WebKit a physical iPad test.

Use original, purpose-rendered painted sprites where they help. Use available OpenAI image-generation tooling if actually callable, verify capabilities/model access rather than inventing an endpoint or model name, and record actual provenance. If unavailable, retain a usable build and state that limitation honestly. Never put generation keys in client code. Keep collision/deformation geometry procedural. Read-only art-direction/reference repositories are `C:\GameDev\maze-game`, `C:\GameDev\maze-so-puzzle-rebirth`, and `C:\GameDev\ppba-rebirth\ppba-rebirth-spec`. Never write to them. Selective owner-authorized music/SFX reuse is allowed only with checked provenance; do not copy an archive, franchise assets or recognizable songs.

## Execute and deliver

Briefly state a concrete design/build slice and amend the relevant requirements, then implement it. Do not end at a speculative roadmap. Use actual rendered interaction and screenshots to judge the result; seek an independent review where available, repair concrete defects within the existing four-round review boundary, and retain failures honestly.

Run setup/build/type/unit/browser/asset-budget checks appropriate to the change, followed by the full required checks for a release: `npm ci`, `npm run check`, and demanding desktop measurements via `scripts/measure-preview.mjs` against the production server. Confirm scripts/ports against your checkout and avoid Codex's separate browser/test server. Preserve exact build labels, actual results, provenance, remaining design issues and the physical-iPad checklist.

Back up docs and feature checkpoints to the existing public GitHub repo, with all personal identities, diagnoses, raw transcripts, photos and private play notes excluded. Never include private context in asset-generation prompts or runtime assets. Do not read/copy private files simply because they exist; the sanitized feedback here is sufficient for this assignment.

Vercel uses static `dist`. Feature/docs backups should skip completed builds; deliberate main releases require a higher stable version **and** changed deployable inputs. Coordinate one reviewed integration, keep the easy URL, then verify the actual hosted artifact and all four toys offline with `scripts/verify-hosted.mjs`. Do not create a paid service, domain, second hosting project or modify another game. If deployment does not occur, say so clearly—never invent a URL or claim an unverified release.
