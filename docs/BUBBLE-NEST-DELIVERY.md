# Bubble Pond / Roll & Nest lane

This is the scoped Codex lane on `codex/bubble-nest`, based on main `34cc938`. Claude owns the concurrent Squishy Friend / Penguin Bounce changes in the other checkout. See [BN01–BN07](BUBBLE-NEST-REFINEMENT.md) for the accepted behavior and [main delivery](DELIVERY.md) for the previously hosted release. This document does not replace that release record.

## Changes

- Bubble Pond retains the original iridescent sprite, with a coherent water palette, a visible shell-collapse/pop response, quiet in-place arcs in Gentle and bounded droplets/ripples in Playful. Returns use a deterministic, finite search for varied safe positions. Held fingers still block returns at the old bubble and exclude new placements. Validated snapshots retain positions and cooldowns.
- Roll & Nest draws free/held balls above the bowl and nested balls behind a foreground mask registered to the original painted lip. Broad green drag rings and detached ball shadows are removed; tap-place selection uses short contrasting corner arcs. Playful adds capped release momentum, rotation, damped edge/body collisions and finite sleep. Gentle retains direct placement and monotonic nesting. Cancel, pause and resize clear velocity.
- Every toy displays the version and six-character source digest without opening Parents. The label ignores pointer input; the full digest remains in its accessible description and technical status.
- Parents now visibly says `Hold 2s`, preserving the existing gate, cancellation and keyboard/assistive alternatives.
- React remains the semantic shell. No frame/pointer state moved into React, no dependency was added, and the two-ball/four-contact/24-effect bounds remain intact.

The branch retains the baseline package version while the distinct build digest identifies its local candidate. Choose the next stable patch version during reviewed integration with the other lane. Do not deploy this older Squishy/Bounce baseline over the concurrent work.

## Verification record

Final checks and mounted review are being completed. Do not interpret this section as a pass until the final result table is recorded.

Initial candidate `v0.1.1-3c9d283721cb`: 163 unit cases passed; production build, type, asset and budget checks passed. Initial browser run: 85 passed, 7 documented native-WebKit audio skips, 2 failed new cases. Both failures queried the nonexistent accessible name `Pause` instead of `Pause play`; the runtime behavior was not changed to satisfy the test. Failure traces are retained locally in `.local/refinement-first-check/`. The new snapshot test was also strengthened to prove it actually popped and relocated a bubble before restoring it.

Independent source/screenshot review found the initial phone capture had tapped empty water because its harness assumed three bubbles. The capture formula was corrected to use the real layout sizing rule. These were test/evidence defects, not evidence of a successful phone pop. Full mounted interaction review and corrected evidence are required below.

Mounted review 1 found a real P2 input-rate defect: 2 ms coalesced samples erased release velocity while 8 ms samples rolled. The repair accepts all valid positive intervals and retains the speed cap. New unit and browser regressions exercise the fast sample stream, with browser comparison taken after the drag itself has painted. Eight focused Chromium/WebKit cases passed on repaired candidate `v0.1.1-8f53112d4703`; full final regression and independent repair verification follow.

## Reproduction

```powershell
npm ci
$env:LITTLE_JOYS_TEST_PORT = '4174'
npm run check
node scripts/serve-dist.mjs 4174
# In another terminal, against that exact production artifact:
$env:PREVIEW_URL = 'http://127.0.0.1:4174'
node scripts/measure-bubble-nest.mjs
```

The port override keeps the other lane's preview untouched. The measurement script checks served build identity, measures four Bubble/Nest motion-mode workloads, keeps temporary re-grab coordinates in page memory only, and labels its synthetic desktop limits. It must not be run concurrently with browser checks when collecting timings.

## Assets and delegated work

Existing original OpenAI-generated bubble, bowl and ball sprites are retained unchanged. No new generated asset or borrowed recording is included in this lane. The existing manifest in `public/assets/asset-manifest.json` and [ASSETS.md](ASSETS.md) retain provenance and the optional authorized music history. Silent default and adult-enabled bounded audio remain unchanged.

The requested `gpt-5.3-codex-spark` model successfully supplied build-label markup, a rolling-helper draft, and unit-test drafts through the authenticated Codex CLI. Primary review corrected label placement, pre-integration physics defects, substep damping, actual-displacement rotation and test quality. Some CLI/check attempts hit local allocation errors; the ordinary serial type check subsequently passed. A further measurement-script delegation failed with a local memory-allocation error before producing code, so the primary agent wrote that script. Model access is observed; attribution to an account's separate billing bucket is not independently verified.

## Integration and remaining human checks

Keep both lanes' changes recoverable; merge this branch into a reviewed integration checkout without resetting or overwriting Claude's work. Reconcile documentation by preserving both lanes' current status. Run the combined artifact's checks and review, advance the stable patch version once, then use the existing Vercel release gate and hosted verifier. Documentation and feature-branch backups alone must not publish another app build.

Physical eighth-generation iPad evidence remains pending: real simultaneous touch/re-grab and palm-edge behavior; short/fast/slow release feel; portrait/landscape case reach; quiet and Playful comfort; Safari versus installed Home Screen pause/background/audio return; offline cold launch and failed/successful update lifecycle; sustained 60-second active traces per toy, memory pressure and a longer adult soak. Desktop WebKit is not a physical iPad test. Voluntary enjoyment/return observations remain private and are not inferred from automated tests.

Remaining product scope: the shared logo/header art feedback still needs a separate coordinated shell refinement; additional toys/themes/music remain backlog items. The visible hold hint addresses discovery, but its physical touch usability still needs observation. This lane improves the two assigned interactions and does not claim the whole product is finished.
