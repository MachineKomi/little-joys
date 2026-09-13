# Independent implementation review

Status: preview. Physical iPad validation and player enjoyment remain unobserved. Browser-injected contacts and desktop WebKit are not physical touchscreen evidence.

## Round 1: procedural first slice, 13 September 2026

An independent implementation agent reviewed the pointer tracker, coordinate mapping, settings, runtime lifecycle, Squishy Friend contour and facial deformation, shell accessibility, and available rendered screenshots. Scope was the first Squishy Friend slice; this was not acceptance of the complete three-toy MVP.

Executed `npm run test -- tests/unit/core.test.ts tests/unit/squishy.test.ts`: 31 tests passed. These checks covered contact ownership and ignored fifth-contact lifetime, safe cancellation, CSS coordinate mapping, backing-store bounds, local-versus-opposite deformation, finite four-contact stretches, Gentle return without overshoot, bounded tap feedback, and storage/snapshot validation.

The first browser run, `npx playwright test tests/e2e/interaction.spec.ts tests/e2e/layout.spec.ts --grep-invert 'complete toy switching'`, completed with **42 passed and 4 failed** across Chromium and desktop WebKit. Two failures represented one actual accessibility defect in both engines: the sound-level slider had no accessible label because an earlier `output` element consumed the enclosing implicit label. The implementation added an explicit label association. The other two failures were a test-selector error: the implicit label's full text included select-option text, so the test now uses the combobox's accessible name.

Other concrete review findings were repaired in source: Squishy snapshots now retain deformed facial anchors; active-frame diagnostics no longer omit intervals of 100 ms or more. The simulation delta remains bounded independently of timing measurement.

The completed browser checks exercised non-primary synthetic contacts, independent release, all fifth-contact lifetime transitions, cancellation on resize/pause/selector/settings/blur/synthetic hiding, pause freeze, DPR 1/1.5/2, visible local deformation, and layout at 810x1080, 1080x810, 360x640, and 1440x900. All four layout sizes passed target/reachability checks in both engines. Persistent explicit mute remained silent with no audio context created. No physical-device performance inference is made.

Visual inspection of the 810x1080 first-slice render found the creature clearly separated from the quiet background, visible inset facial features, generous touch space, and readable toolbar controls. The 360x640 selector screenshot fit all three tiles without scrolling or overlap and showed an obvious focus ring. This procedural art was usable; the owner subsequently requested more fully rendered sprites, so those screenshots do not establish approval of the final art direction.

A second 48-test browser run started against `preview-fa6402e2400a`. Its first 14 Chromium interaction cases passed, but execution was interrupted before a completion summary could be recovered. This review does **not** count that run as 48 passing tests.

Technical delivery score at this boundary: **7/10 for the first slice**. Core interaction and layout had useful supporting evidence, but repaired accessibility needed a completed rerun, the broader MVP and final artwork were still changing, and real-device checks remained pending. This is not a enjoyment or developmental score.

## Sprite integration review: in progress

The subsequent implementation uses a generated image warped by procedural mesh geometry. The independent tests exercise actual mesh vertices and triangle orientation, not only the older contour fallback.

Initial new test run: **6 passed, 1 failed** across `tests/unit/mesh.test.ts` and `tests/unit/assets.test.ts`. Four-contact deformation preserved positive triangle winding for normal opposing inputs and 160 deterministic adversarial input sets. Loaded and pending asset disposal tests passed, including a stale success callback invoked after disposal.

The failed case exposed a saved-mesh validation gap: exchanging adjacent vertices keeps each coordinate within the accepted distance bound but reverses a triangle. Saved meshes must also validate triangle winding before rendering. The builder separately found that a one-use grab iterator was being consumed by the first vertex; a scene-level deformation test and iterator/array parity test were added to prevent that regression.

After the builder repaired both defects, `npm run test -- tests/unit/mesh.test.ts tests/unit/assets.test.ts` completed with **9/9 passed**. This includes the actual scene pointer-to-mesh movement test, one-use iterator parity, positive triangle winding, and stale-load disposal.

Visual inspection of the generated runtime sprite then identified a further integration mismatch: the visible toes and outer belly extend beyond the older procedural contour's hit area. A regression test using two inspected opaque sprite locations reproduced zero grabs where two independent grabs were expected. The resulting checkpoint is **9 passed, 1 failed**; the new sprite requires matching hit geometry before final acceptance.

The builder expanded the loaded sprite's hit envelope. The same mesh/asset command subsequently completed with **10/10 passed**, including both formerly missed visible regions. The independently inspected 810x1080 sprite stretch screenshot showed a materially richer mascot, visible local right-side deformation, attached facial features, a neutral content expression, and intact generous play space. There was no material visible tearing or detached feature at display size. Final multi-contact and layout screenshots still require the complete rebuilt browser run.

Final sprite screenshots, complete browser rerun, offline/update evidence, budget measurements, and physical-iPad checks remain pending at this review checkpoint. See the implementation delivery record for later evidence; do not treat pre-sprite results as validation of later builds.

## Final independent source and visual review, 13 September 2026

The reviewer inspected the current runtime, generated-image mesh, snapshot validation, asset lifecycle, bubble renderer, nesting geometry and bowl layering, shared audio, optional music service, and parent shell. Runtime movement remains outside React render state. The canvas backing scale and bounded collections remain explicit. Timing capture includes single-frame work and retains active stalls; simulation time is clamped independently. The streaming music implementation uses one lazy element through the shared audio context and an explicit gain node, with silent defaults and cancellation guards.

One new concrete defect appeared when optional music was added: its level slider repeated the earlier implicit-label issue. The builder added an explicit association; a fresh DOM inspection verified that both level sliders have labels. The asset-store test was updated from four to five resident images to cover the new bubble artwork; the catalog remains explicitly bounded.

Fresh manual browser captures were taken from the current development server, separate from the final production test run. The reviewer inspected all three toys, the two-ball nested state, the matching selector, and parent settings at 360x640. The generated mascot retained a readable content expression and local deformation. Bubble silhouettes were distinct from the quiet background. Both nested plush balls remained mostly visible above the shallow bowl rim and had clear separate grab regions. The selector used artwork that matched the current toys. On the phone layout, the parent panel had a 532-pixel scroll viewport and 1,834 pixels of reachable content. Both optional audio switches were visibly off. This session recorded no page errors.

Local review captures are `.local/review-final-squishy.png`, `review-final-bubbles.png`, `review-final-nest.png`, `review-final-two-nested.png`, `review-final-selector.png`, and `review-final-parents-phone.png`; these development evidence files are excluded from public runtime output. Earlier `sprite-synthetic.png` provided the independently inspected deformed mascot frame. The final production test runner is owned by the builder to avoid concurrent server and report collisions.

**Technical preview assessment: 8/10 for the reviewed source, interaction architecture, and visual state, conditional on a clean final production validation run.** No remaining material defect was identified in this reviewed scope. This score does not certify physical-iPad performance, real multi-touch, offline Home Screen behaviour on iPadOS, player enjoyment, or educational efficacy. Those observations remain separate gates. Final production test totals, measured budgets, build identity, and deployment evidence belong in the delivery record and must match the final built bytes.

## Windows WebKit harness investigation and isolated validation

The earlier full production runs intermittently failed while creating a new Windows WebKit page, before any application navigation. Independent trace inspection found a page-created event followed approximately 2 ms later by page closure, with no application request in either network trace. The shared browser's graceful close appeared later during normal test teardown. Test-source inspection found no test closing the shared browser. A separate native WebKit probe created and closed 40 sequential `about:blank` contexts successfully, so the evidence does not establish a general failure of context reuse or a definitive browser-engine root cause.

The harness now uses a test-scoped `toyBrowser` fixture with a fresh native Windows WebKit process for each test. Chromium and other platforms continue to use the runner's shared browser. This follows the supported [custom fixture mechanism](https://playwright.dev/docs/test-fixtures), with [configured context options and artifact recording](https://playwright.dev/docs/test-use-options) retained for native contexts. Explicit DPR and delayed-asset contexts use the same fixture. Every assertion still runs once: no retry, skip, assertion relaxation, dependency downgrade, or production change was introduced to address the page-creation failures. Multi-window update checks and the 100-switch scenario each retain one browser for their entire test.

Against production build `preview-38b71f30f900`, `npx playwright test --project=webkit --output=.local/webkit-isolated-results --reporter=list` completed with **31 passed, 6 skipped, 0 failed in 1.1 minutes**. The six existing skips identify unavailable Web Audio support in this Windows WebKit environment; they are not audio passes. The 100-switch scenario passed in 28.8 seconds. This run had no pre-navigation page closures and supports the process-isolation remedy for the observed harness failures. The final combined-engine run remains a separate builder-owned check against the final rebuilt bytes.

The independent offline test investigation also identified a Windows WebKit network-override limitation: `context.setOffline(true)` failed in controlled cases. The revised offline harness shuts down its isolated origin server instead, and all four WebKit PWA cases passed in the run above, including cached toy/settings operation and waiting updates. This does not substitute for physical-iPad Home Screen installation or offline lifecycle testing. Local diagnostic evidence is retained under `.local` and is excluded from the public runtime.

## Final verified review closeout: preview-f413783b55eb

The reviewer read the completed raw `npm run check` output and cross-checked it with `evidence/checks.json`: **89 unit tests passed; 68 browser tests passed; 6 browser tests were explicitly unavailable; zero tests failed**. Chromium passed 37 cases and Windows WebKit passed 31, with its six Web Audio capability skips retained honestly. The complete command exited successfully and included TypeScript, production build, asset audit, and budget audit. The distributed build label, budget report, desktop performance report, and each runtime timing snapshot agree on `preview-f413783b55eb`.

The measured delivery remains small: 85,631 bytes of gzip JavaScript, a 738,686-byte conservative first-interaction gzip bound, 4,398,620 bytes for the complete offline payload including optional music, and a 7,491,136-byte estimate for all decoded shipped rasters. These are asset figures, not measured Safari memory. The final desktop cold-start trace reported an actionable canvas at 442 ms and rendered sprites at 703 ms under its documented network profile. Ten-second synthetic workloads reported a maximum rAF interval of 16.8 ms and no intervals above 50 ms. Runtime update/draw p95 was approximately 0.7 ms for Squishy Friend and 0.2 ms for the other toys. These short Windows desktop measurements do not establish physical-iPad performance or prolonged stability; the Gentle Roll & Nest trace has no continuing-animation interval samples and must not be interpreted as a measured zero frame time.

The refreshed production portrait screenshots for Squishy Friend, Bubble Pond, and Roll & Nest were independently inspected. Sprites remain intact, toy targets clearly separated, controls readable, and the backgrounds quiet. No unresolved material defect was identified within the source, interaction, visual, and automated evidence reviewed. **Final technical preview score: 8/10.** The earlier condition requiring a clean combined-engine production run is now satisfied. Physical-iPad touch, memory, long-session pacing, audio, Home Screen installation/offline/update behaviour, and actual player enjoyment remain unobserved. Deployment was unverified at this checkpoint because authentication was unavailable; this historical checkpoint does not claim a deployed URL.

## Versioned release-gate review: v0.1.0-228d3ff2889a

The subsequent owner request added version-and-material deployment selection, independent of documentation backups. A read-only reviewer found and verified repairs for production's dependency on test configuration, locale-dependent fingerprint ordering, missing-baseline ambiguity, and the risk of Node startup errors permitting Vercel builds. Production and test configuration are now separate. Only an explicit build sentinel permits deployment; unknown history fails closed. Bounded exact-SHA fetching and an actual shallow-history fixture preserve patch release selection after many documentation pushes. No remaining material defect was identified in the reviewed gate; that reviewer did not execute tests or a browser during this follow-up.

The builder's final `npm run check` against `v0.1.0-228d3ff2889a` passed **111 units (including 22 deployment cases), 68 browser cases, and all type/build/asset/budget checks**, with the same six explicit Windows Web Audio capability skips. Updated evidence under `docs/evidence` supersedes the earlier numeric snapshots above. Hosted verification is recorded separately in `DELIVERY.md`. The approved fourth toy is a subsequent v0.1.1 implementation and is not included in these three-toy results.

## Penguin Bounce: first review and concrete repairs

The owner explicitly approved a fourth forgiving physics toy. The first read-only interaction/render review found a bottom caption overlapping the trough lip and visible deflector backings hiding physical pegs. Separately, a production Chromium test found the dense Playful board still requesting animation after its unchanged 45-second limit. The first incomplete build is not a passing release.

A pure simulation reproduced the settling defect using the browser's six columns of tap positions and two frames between taps: a supported upper stack ball at y=830.04 CSS pixels had speed 2.75 CSS pixels/second but zero accumulated rest time because an arbitrary height cutoff was y=831.1. The exact original browser cadence cannot be recovered from its screenshot; the deterministic reproduction establishes the sleep defect independently. Rest now follows actual physical support at any height. Rotation considers both old and new deflector geometry and wakes unsupported balls; recycling a bottom ball wakes the stack it supported. Nothing teleports balls into the trough or forces sleep after a timer. P07 records this clarification.

The layout omits pegs from every deflector angle's visible backing and required ball passage. Remaining pegs are visible collision objects; counts adapt to available space. The overlapping decorative caption is omitted for this board while the canvas/stage/selector retain semantic names. Parent selects now have explicit names matching their visible labels. The four selector tiles preserve identity and relative order in a two-by-two tablet layout and a reachable phone column, as clarified in P01.

The repair adds four pure regressions. All 21 Bounce unit tests and TypeScript passed; 42 dense combinations of layout, motion and input cadence settled within 7.4 simulated seconds. The completed repaired production-browser run against `v0.1.1-a6134d7bcb9c` passed 12/12 cases across Chromium and Windows WebKit. Both dense modes sleep within the original 45-second assertion. These are desktop/simulation checks, not physical iPad timing.

An intervening execution interruption left one log at WebKit startup after six Chromium passes. That incomplete log was preserved separately and not counted as a completed run. A prior development-server process also reported a Node semispace allocation failure; static production review and the later complete run remained usable. Neither host/tooling observation establishes application memory consumption on an iPad.

## Provider-observed release-gate repairs

Actual v0.1.0 hosting exposed two environment assumptions. Vercel compacted `vercel.json`, producing a different label for semantically identical configuration. Its ignore-file processing also removed `.git` before the gate, so the first documentation backup safely canceled for unavailable history. That cancellation did not demonstrate the deployed version comparison.

The v0.1.1 fingerprint canonicalizes JSON objects while preserving meaningful configuration values and array order. `.vercelignore` retains Git history in the build checkout; the only published output remains `dist`. Regression checks cover provider formatting parity, semantic configuration changes, checkout history and static output. An independent read-only code review found no material defect in these fixes, stable-version/material selection, bounded baseline recovery, or fail-closed sentinel handling. The provider's actual material-release and subsequent documentation-only decisions are separate evidence in `DELIVERY.md`.

## Penguin Bounce: second and third independent reviews

Round 2 reviewed the repaired `1366afc` source and production build `v0.1.1-a6134d7bcb9c` in Chromium and native desktop WebKit at 810×1080, 1080×810 and 360×640. All 48 mechanism-turn checks changed visible geometry without spawning a ball. Every dense case finished with 24 settled balls, zero active balls/effects/voices, disabled audio and six resident images. All selector centers passed DOM hit checks. Sixty screenshots were captured and 27 opened for inspection. No remaining material defect was found in this bounded repair scope; technical-preview score **8/10**. An initial temporary review probe incorrectly used animation-frame polling while counting animation frames; timer polling corrected that probe without a production change. The invalid probe result remains in the ignored review artifacts.

The next explicit owner request called for brighter Playful feedback before deployment. Round 3 reviewed that renderer change against `v0.1.1-4a0451f16ac2`: colored collision blooms, short impact rays, and one input-triggered penguin bob of at most ten pixels. Effects share the existing 24-entry pool, nearby collisions strengthen an existing pulse without restarting it, and there is no new timer, idle loop or physics change. Gentle retains its previous quiet mark and stationary character.

Four focused production sessions covered Chromium Playful portrait/phone, Chromium Gentle portrait and WebKit Playful portrait. Thirty-two screenshots were retained and 14 opened for inspection. The Playful character changed after input and returned byte-identically; Gentle remained unchanged, and its initial full PNG matched the prior review. Every dense case reached 24 settled balls with zero effects and silent audio, then held unchanged canvas pixels and animation-frame counts for 1.1 seconds. The reviewer found no material renderer defect and retained **8/10 as a technical-preview score**. Final combined checks, measurements and hosted verification are recorded separately in `DELIVERY.md`.

These reviews establish bounded technical evidence for the fourth toy. They do not close the subsequently reported Squishy Friend, Bubble Pond, ball/bowl presentation or overall-shell shortcomings in [FEEDBACK-AND-REFINEMENTS.md](FEEDBACK-AND-REFINEMENTS.md), and do not rate private enjoyment or physical-device performance.

## Final evidence audit and metadata correction

The independent evidence audit verified the `4a0451f16ac2` full run (140 unit passes, 81 browser passes, seven explicit Windows WebKit audio skips), all 22 production-file hashes and lengths, gzip calculations, resource caps and five desktop workloads. It found that the ten-second continuous-workload probe had no intervals above 50ms, while the longer Playful Bounce runtime diagnostic window recorded one 66.6ms interval. The latter includes sampling after the input loop; no cause was established. Both measurements remain valid for their different windows. The preceding report is preserved in Git at `1612f24`; no performance fix or clean-stall claim is inferred from a subsequent trace.

The audit also found obsolete “three toys” installation metadata. A follow-up source search found the same stale count in the HTML page description. Both descriptions were corrected to four toys. This changes the shipped manifest/build identity but does not change toy logic, rendering or interaction. The builder repeats the final production check and measurements against that exact corrected artifact; current results are in `DELIVERY.md` and `docs/evidence`.

The first metadata-corrected full run had 140 unit passes, 80 browser passes, seven audio skips and one Chromium T38 failure. Its trace showed the test restoring portrait but sending the next contact while the canvas still had its landscape backing. The subsequent ResizeObserver callback correctly canceled that contact, so the next stop-path assertion raced the unfinished resize. The test now waits for the original backing width and height before the next contact. Every pointer, stop-path and frozen-pixel assertion remains intact; runtime code was unchanged. Ten targeted executions across both engines passed with no retries. The failed log/trace and diagnosis remain in ignored local evidence; final clean totals are reported separately rather than counting that failed run as passing.

The subsequent clean main check exited zero for `v0.1.1-50d0640d1f04`: 140 unit passes, 81 browser passes, seven explicit audio skips, and successful type/build/asset/budget checks. Its exact-artifact five-workload trace recorded active-frame p95 of 16.7–16.8ms and update/draw p95 at most 0.8ms. The separate Playful runtime window retained one 66.7ms interval; the continuous input probe had none above 50ms. No hardware-performance inference or cause for that longer interval is claimed. A final read-only documentation check also corrected a stale five-image architecture count and distinguished the two nesting balls from the 24-ball Bounce cap.

The independent final reporting check found no remaining discrepancy in the requested scope: the current build label, 140/81/seven-skip totals, all 20 hosted files and four online/offline toys, budgets and all five performance rows matched their evidence. It confirmed that the 66.7ms interval, original-toy refinements, physical iPad limits and first-load window transition were qualified accurately. The provider's subsequent documentation-backup skip is recorded separately in `evidence/deployment-policy.json`.

## v0.1.2 expressive-squish review and repairs

The first independent review of `v0.1.2-e5cfbdec6c6f` requested two repairs and rated the work 7/10 as a technical preview. A one-frame controlled comparison showed an opposite-side re-grab during return snapping the previously stretched edge by 115px in Gentle and 113px in Playful, compared with natural-return changes of 3px and 5px over similar intervals. The scene discarded its returning pose when the new grab arrived. Thin affine seams were also visible during strong side pulls in Chromium and WebKit. These are actual defects from the sprint, not resolved by the preceding v0.1.1 checks.

The repair retains the prior return as a decaying base surface and composes the new local warp over it, using forward/inverse material mapping to retain the finger's target. A regression compares the far side with an equivalent untouched return. Seam repair addresses both near-opaque interior alpha and insufficient overlap at thin triangles' long edges: one bounded scene-owned material surface preserves the displayed interior color at full opacity, while triangle expansion uses its incenter to provide constant edge overlap. Original raster files and identity remain unchanged. The surface is released when the scene is disposed; its 2.25 MiB retained allocation and temporary 2.25 MiB readback are counted with shipped raster estimates under the original 24 MiB ceiling.

The initial new curve test treated JavaScript negative zero as different from zero; its endpoint assertion now uses mathematical equality. This was a test assertion issue, not a visible runtime defect. The repaired geometry suite includes large local pulls, 240 adversarial four-contact/layout combinations, positive-area return paths, inverse pickup, re-grabs, finite releases, cancellation and scene recovery. Final combined counts, independent follow-up and hosting remain separate from this repair history.

Round 2 independently reviewed the frozen `v0.1.2-c63c46ea7ceb` production artifact and found no remaining material defect in the bounded repair scope: **8/10 as a technical preview**. Opposite-side re-grab movement now matched natural return in the next-frame probe: Gentle 7px versus 7px, Playful 5px versus 4px, over approximately 18–25ms. Previously visible seams were absent in reviewed strong-side/eye renders in Chromium and Windows WebKit. The silhouette can be slightly angular at the strongest pull; this remains minor mesh polish.

A fresh, service-worker-blocked Chromium comparison at 810×1080 used the same normalized held side pull on the actual deployed v0.1.1 and local candidate. Visible right-edge displacement increased from **53px to 121px (2.28×)** while the far left edge stayed fixed in both. This is one controlled silhouette measurement, not a claim about all vertices or devices. [Selected comparison and interaction renders](evidence/squish-v012/README.md) preserve the evidence without private notes. Larger eye/cheek pulls kept the painted identity recognizable; the reviewed single-texture treatment is sufficient for this sprint. Separate cutout layers were not built or claimed superior/inferior through comparison.

Four review samples across phone, tablet, landscape and both engines recorded four contacts becoming three after one cancellation, zero after pause, frozen paused pixels for 400ms, and unchanged pixels/RAF counts for 350ms after settling. No page errors occurred. Scene switches showed prepared raster bytes 2,359,296 → 0 → 2,359,296, disposed preparation canvases at 0×0, one visible canvas, six shared images, and audio not created. These are bounded lifecycle checks, not a long soak or browser/GPU heap measurement. Final full-suite, six-workload and actual hosting results are recorded separately in DELIVERY.md.

The first complete c63c regression attempt passed 153 units and 88 browser cases, skipped seven unavailable audio cases, and failed one Windows WebKit T29 case at `context.newPage()`. Its trace shows the newly created second page closing before application navigation; the original Penguin Bounce page remained available for the failure snapshot. No update had been attempted. Three subsequent diagnostic executions of the unchanged complete T29 test passed with browser-process logging and no assertion changes or retries. The original log/trace is preserved locally. The underlying page-creation failure is not diagnosed or claimed fixed, and those focused passes do not replace a complete final run. This remains a Windows browser-harness limitation, not evidence of a repaired application update defect.

The subsequent unchanged complete c63c run exited zero: **153 unit passes in 12 files, 89 browser passes (48 Chromium / 41 WebKit), seven explicit native-AudioContext skips, zero failures**, with type/build/asset/budget checks passing. T29's full multi-window update assertions and each engine's 100 scene switches passed in that run. No automatic retry or assertion waiver was configured. A current dependency audit reported zero vulnerabilities. Exact-artifact measurements and hosted verification are separate evidence below in DELIVERY.md.

## Fable lane: richer Penguin Bounce and whole-body Squishy response (not deployed)

This round covers LJ-20 and LJ-22 on `codex/expressive-squish`. The contracts are amended in PENGUIN-BOUNCE-SPEC.md and EXPRESSIVE-SQUISH-SPEC.md. Every defect below was found by a test, a layout sweep or a rendered capture during implementation. Each was repaired before the combined checks recorded in DELIVERY.md.

**Penguin Bounce.**

- **Creeping trough pile.** The unchanged 42-combination settling regression found a full trough pile creeping sideways at about 22 CSS px/s, just under the 24 px/s rest threshold. The funnel rails ended inside the trough's fill height, so the pile wedged against them. The rail tips now end at least 3.2 ball radii above the trough. A felt-floor rule stops slow sideways drift on the floor, and supported balls in the trough lose sideways drift.
- **Overlapping mechanisms.** A layout probe found the pinwheel's arms overlapping the lower bumper on 1080×702 and passing within a ball width of it on 360×532. Mechanism sizes now follow the available field. A bounded deterministic relaxation keeps a full ball passage between every pair of mechanisms, using the full sweep of anything that turns, as well as rails and walls. A new unit test checks six layouts.
- **Wedged ball kept the pinwheel spinning.** On the phone board, a ball wedged between the pinwheel and a bumper kept re-energising the wheel, so the board never slept. Once the attended window ends, bumpers now act like pegs and the pinwheel winds down, so every board settles.
- **Too few pegs on compact boards.** The fixed five/six-column peg grid left only 3 to 4 pegs on landscape and phone boards. Spacing now follows ball size, with a greedy fill that keeps full passages.
- **Rejected roll-off rule.** A rule rolling a ball off the exact top of another ball knocked down the documented supported vertical stack, so it was removed.
- **Sparse flow.** Captured boards after seven seconds showed too few balls in flight. Flow is now every 1.0 s in Playful and 1.8 s in Gentle.
- **Tests for the amended contract.** Browser tests cover passive flow, pause and hidden stops without catch-up, and mechanism, pinwheel, bumper and penguin taps. A fake browser clock steps every frame through the attended window to confirm the dense Playful board sleeps.

**Squishy Friend.**

- **Flat clipped edge.** Symmetric local mesh bounds, combined with a hard clamp, stacked the vertices of a strong side pull into a flat edge at the canvas border. Rendered captures showed it. Bounds are now one-sided per side and exclude the texture's transparent margin, and the last 0.15 radii of room eases exponentially.
- **Friend stopped short of the wall.** Estimating the body's room from bounding-box corners kept the painted friend about 41 px short of the wall while it leaned. Pixel bounding boxes of fake-clock frames measured this. Room now comes from a 24-point outline traced from the shipped sprite's alpha, which follows the deformed mesh and the pose. The measured friend now reaches the 24 px inset, at 23 px with antialiasing.
- **Sway into the wall.** At a wall, the jelly sway leaned the top about 4 px past the inset within one frame. The amended scene test caught it. Limits are now re-evaluated from the pose on every fixed step, with a clamp after the pose updates.
- **Abrupt launch, faint squash.** The first launch crossed the room in about 0.1 s. Pixel measurements showed pokes and wall squash changing the silhouette by only about 5%. Launch gain was lowered and the poke and wall squash strengthened.
- **Rendered-pixel browser test.** A new browser test drives a Playful sling with a fake clock and measures the painted teal pixels in 75 rendered frames. It asserts every frame stays inside the 24 px inset, that the friend travels opposite the pull and back past home, and that it returns to the exact rest frame.

**Unexplained browser failure.** A combined Squishy browser run failed one Windows WebKit four-contact reclaim case and reported one error outside any test. Its details were lost because that run's log was truncated. Isolated reruns of the same case passed in both engines. The cause is not established, and it is recorded here rather than counted as a pass.

**Not claimed.** An independent review of this round, physical iPad behaviour and player enjoyment remain outside this record.

## Fable lane: first independent review and repairs

A separate reviewer inspected the Fable-lane code, amended specs and captured frames. It worked read-only and ran no tests, builds or browsers. It rated the slice **7/10 as a technical preview**.

It verified the following as sound:

- **Penguin Bounce flow timing.** Flow and the attended window use fixed steps, and there is no catch-up burst after any stop path.
- **Bounce state.** Snapshot validation, the P06 recycling order and the unattended fail-safe all hold, and every pool and loop is bounded.
- **Squishy stop paths.** Every cancellation path gives a monotonic settle.
- **Squishy geometry and cost.** The body matrix inverts exactly, pickup maps through the drawn pose, and whole-body motion renders as one transform.

Its findings and the repairs:

- **Material: a still finger kept Squishy's animation running.** Every grab put the body into a held mode whose pose decayed toward zero without ever reaching it. The mesh was therefore recomputed and redrawn every frame under a still finger, in Gentle too. That regressed v0.1.1 and SPEC section 9's sleeping scheduler. The held pose now finishes exactly at zero, and a still, relaxed hold reports no motion. Unit tests cover both motion modes and a friend caught mid-flight. A browser test confirms that animation-frame requests stop under a resting finger.
- **Material: a friend caught at a wall could be pulled past the inset.** The mesh bounds allowed the whole rest texture square, and held and settling bodies skipped the outline clamp. Pulling a caught friend toward its wall therefore squeezed out the transparent margin. A pull now keeps only the share of each frame's new deformation whose traced outline still fits, and held and settling bodies are clamped to the pose-dependent room too. A unit test catches the friend at a wall and pulls past it for 30 frames.
- **Minor, repaired in code:**
  - A tap that recycled a ball showed no ring, because the list was cleared before the scene read it.
  - A long swipe did not renew the attended window.
  - A quick tap on a part still springing back launched the friend, because the release decision measured the material's displacement rather than the finger's pull.
  - An unreachable release path and a duplicated comment were removed.
  - Each behaviour change has a regression test.
- **Minor, repaired in documentation:**
  - The spec gave a 1,800 px/s launch cap where the code caps at 1,600.
  - SQ02 described a fixed margin rather than the traced outline.
  - P08 claimed all lights share the 24-entry pool, but each bumper has its own fading glow.
  - T44 claimed six peg layouts while the test covered three; it now covers six.
  - Passive flow's conflict with SPEC section 7's no-unsolicited-motion rule is now an explicit, recorded override. An adult off switch is left to a shared-shell change.
- **Minor, reduced:** static board, peg and bumper gradients are now built once per layout instead of every frame. The physics hot loops reuse cached mechanism segments, nearest points and support flags instead of allocating per ball per step. Whether this explains the longer runtime-window intervals is not established.
- **Minor, not changed:**
  - Strong eye and foot pulls still show short straight runs near the texture edge, where the narrow regional influence meets the positive-area guard. This remains a visual limit.
  - The unit silhouette test uses the same traced outline as the clamp. The rendered-pixel browser test is the independent check.

Re-verification of the repaired build is recorded in DELIVERY.md.
