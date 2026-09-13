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

Final scoped candidate: **v0.1.1-8f53112d4703**, material source checkpoint `63b304adab762a4b21e0ee242c110b32fc2b2263`. **Ready for integration; not deployed.** The final serial `npm run check` exited 0. The remaining changes after that checkpoint are documentation, synthetic screenshots and measurement tooling, which do not change the build fingerprint.

| Check | Actual result |
|---|---|
| Types / units | Passed; 13 files, 164 cases. |
| Production build / assets / budgets | Passed; 20 verified offline entries. |
| Chromium + native Windows WebKit | 89 passed, 7 audio-availability skips; 96 cases total, no failures. Includes offline/all-toy caching, failed/successful update windows, 100 scene switches, input cancellation, reduced motion and the new ordinary/coalesced release regressions. |
| Independent review | Two rounds: initial P2 found, repaired and independently reproduced as resolved. Final technical-preview verdict 8/10; no remaining material defect identified in the scoped review. |
| Hosted deployment | Not attempted for this branch; existing live release record unchanged. Integration with Claude's active lane and a stable patch increase remain required. GitHub CLI has no authenticated API session here, so no PR was created; the branch itself is backed up through authenticated Git. |

The local full log is `.local/bubble-nest-final-check.log`; [portable check summary](evidence/bubble-nest-checks.json) records the result without local process output. Earlier failed/partial checks below are retained as history, not included in the final pass count. One new exact cap assertion initially rejected `700.0000000000001`; its comparison now allows one machine-epsilon-scaled rounding unit. The configured 700 px/s cap and implementation were unchanged by that test correction.

| Measured budget | Result |
|---|---|
| App JavaScript, gzip | 93,936 bytes (limit 200 KiB). |
| First-interaction gzip upper bound | 816,711 bytes (limit 2 MiB); conservative static bound, separate from startup timing. |
| Complete offline payload | 4,495,256 bytes (limit 8 MiB). Active + waiting: 8,990,512; replacement-install staging: 13,485,768 bytes. |
| Decoded raster estimate | 8,982,080 bytes (limit 24 MiB); not total browser RAM. |
| Cold desktop startup | Actionable 478 ms; all sprites rendered 765 ms, fresh cache at 10 Mbps / 50 ms protocol latency. |

Sources: [asset audit](evidence/bubble-nest-assets.json), [budget audit](evidence/bubble-nest-budgets.json), [cold-start trace](evidence/bubble-nest-cold-start.json). These are local production measurements, not Vercel-network or physical iPad results.

| 10-second desktop workload | Continuous rAF p95 | Update/draw p95 | Input-to-render proxy p95 |
|---|---:|---:|---:|
| Six bubbles, Gentle | 16.7 ms | 0.2 ms | 17.8 ms |
| Six bubbles, Playful | 16.8 ms | 0.2 ms | 18.0 ms |
| Two balls, Gentle | 16.7 ms | 0.3 ms | 17.7 ms |
| Two balls, Playful | 16.7 ms | 0.3 ms | 17.7 ms |

All four had zero continuous-probe intervals above 50 ms and stable canvases after settling. [Full measurement](evidence/bubble-nest-performance.json) includes workload, browser, instrumentation cost and runtime summaries. This uses synthetic contacts at 810×1080 CSS / DPR 2 and the app's capped backing scale. It is not a 60-second physical-device trace or measured touch-to-photon latency.

Coverage: BN01–BN02 are supported by pop/block/return/snapshot units, mounted phone checks and captures; BN03 by depth/selection/retrieval renders; BN04–BN05 by helper/scene/coalesced/stop regressions and mounted collision/expiry checks; BN06 by label hit-through, layout and hold checks. BN07's automated/desktop/review portion is complete for this isolated candidate; integration, new hosting and physical-device portions remain pending.

Initial candidate `v0.1.1-3c9d283721cb`: 163 unit cases passed; production build, type, asset and budget checks passed. Initial browser run: 85 passed, 7 documented native-WebKit audio skips, 2 failed new cases. Both failures queried the nonexistent accessible name `Pause` instead of `Pause play`; the runtime behavior was not changed to satisfy the test. Failure traces are retained locally in `.local/refinement-first-check/`. The new snapshot test was also strengthened to prove it actually popped and relocated a bubble before restoring it.

Independent source/screenshot review found the initial phone capture had tapped empty water because its harness assumed three bubbles. The capture formula was corrected to use the real layout sizing rule. These were test/evidence defects, not evidence of a successful phone pop. Subsequent mounted review and corrected captures verified the actual phone pop.

Mounted review 1 found a real P2 input-rate defect: 2 ms coalesced samples erased release velocity while 8 ms samples rolled. The repair accepts all valid positive intervals and retains the speed cap. New unit and browser regressions exercise the fast sample stream, with browser comparison taken after the drag itself has painted. Eight focused Chromium/WebKit cases passed on repaired candidate `v0.1.1-8f53112d4703`, followed by the final full regression and independent repair verification above.

## Reproduction

```powershell
npm ci
$env:LITTLE_JOYS_TEST_PORT = '4174'
npm run check
node scripts/serve-dist.mjs 4174
# In another terminal, against that exact production artifact:
$env:PREVIEW_URL = 'http://127.0.0.1:4174'
node scripts/measure-bubble-nest.mjs
node scripts/measure-cold-start.mjs
```

The port override keeps the other lane's preview untouched. The measurement script checks served build identity, measures four Bubble/Nest motion-mode workloads, keeps temporary re-grab coordinates in page memory only, and labels its synthetic desktop limits. It must not be run concurrently with browser checks when collecting timings.

## Assets and delegated work

Representative actual production captures: [phone pop](evidence/bubble-nest-phone-pop.png), [phone bowl depth](evidence/bubble-nest-phone-depth.png), [tablet bowl depth](evidence/bubble-nest-tablet-depth.png). Independent [review 1](evidence/bubble-nest-review-1.md) and [repair verification 2](evidence/bubble-nest-review-2.md) preserve the discovered defect and its resolution. Referenced raw review harnesses/traces remain in ignored local directories; the public captures are synthetic app screenshots only.

Existing original OpenAI-generated bubble, bowl and ball sprites are retained unchanged. No new generated asset or borrowed recording is included in this lane. The existing manifest in `public/assets/asset-manifest.json` and [ASSETS.md](ASSETS.md) retain provenance and the optional authorized music history. Silent default and adult-enabled bounded audio remain unchanged.

The requested `gpt-5.3-codex-spark` model successfully supplied build-label markup, a rolling-helper draft, and unit-test drafts through the authenticated Codex CLI. Primary review corrected label placement, pre-integration physics defects, substep damping, actual-displacement rotation and test quality. Some CLI/check attempts hit local allocation errors; the ordinary serial type check subsequently passed. A further measurement-script delegation failed with a local memory-allocation error before producing code, so the primary agent wrote that script. Model access is observed; attribution to an account's separate billing bucket is not independently verified.

## Integration and remaining human checks

Keep both lanes' changes recoverable; merge this branch into a reviewed integration checkout without resetting or overwriting Claude's work. Reconcile documentation by preserving both lanes' current status. Run the combined artifact's checks and review, advance the stable patch version once, then use the existing Vercel release gate and hosted verifier. Documentation and feature-branch backups alone must not publish another app build.

For the other agent: fetch and merge `origin/codex/bubble-nest` after checkpointing your current lane, preserving your Squishy/Bounce/runtime changes. This branch changes neither toy nor the shared runtime/settings/audio interfaces. Its shared shell files are `src/app/App.tsx`, `src/app/Toolbar.tsx`, `src/styles/base.css` and the new `src/styles/build-label.css`; reconcile any independently edited shell work deliberately. See [DEPLOYMENT.md](../DEPLOYMENT.md) for the exact final deployment and hosted-verification commands.

Known limits: dense six-bubble phone layouts can reuse the previous slot when no safe alternative fits; three-bubble mode has more room. Gentle deliberately has no free-roll momentum or travelling particles. These are documented design boundaries, not evidence that the current feel satisfies a human playtest.

Physical eighth-generation iPad evidence remains pending: real simultaneous touch/re-grab and palm-edge behavior; short/fast/slow release feel; portrait/landscape case reach; quiet and Playful comfort; Safari versus installed Home Screen pause/background/audio return; offline cold launch and failed/successful update lifecycle; sustained 60-second active traces per toy, memory pressure and a longer adult soak. Desktop WebKit is not a physical iPad test. Voluntary enjoyment/return observations remain private and are not inferred from automated tests.

Remaining product scope: the shared logo/header art feedback still needs a separate coordinated shell refinement; additional toys/themes/music remain backlog items. The visible hold hint addresses discovery, but its physical touch usability still needs observation. This lane improves the two assigned interactions and does not claim the whole product is finished.
