# Little Joys — implementation delivery

Status: four-toy technical preview; physical iPad validation pending. Initial owner phone feedback is recorded privately, with sanitized product shortcomings in [FEEDBACK-AND-REFINEMENTS.md](FEEDBACK-AND-REFINEMENTS.md). No general enjoyment or educational outcome is claimed.

**Current release: combined v0.1.2.** The next section records the combined build now live at [littlejoys-play.vercel.app](https://littlejoys-play.vercel.app/), with its checks, review and hosted verification. The Fable-lane candidate after it and [BUBBLE-NEST-DELIVERY.md](BUBBLE-NEST-DELIVERY.md) keep each lane's own evidence. The c63c v0.1.2 candidate further below passed regression but missed the desktop Squishy frame target and was never deployed, and the GRID8 follow-up stayed preliminary. Do not read those historical candidate results as a release approval.

## Combined release `v0.1.2-22157667feee`

**Live at [littlejoys-play.vercel.app](https://littlejoys-play.vercel.app/) since 13 September 2026, 18:24 local time.** Vercel built and published it automatically after `main` moved to `60a3a3a`, and GitHub records the production deployment as complete. Every toy shows the build code V0.1.2-221576 in its top corner.

This release combines the two toy lanes. The Fable lane reworked Squishy Friend and Penguin Bounce. The Codex lane refined Bubble Pond and Roll & Nest and added the visible build label and parent hold hint. Integration merged the branches without any toy-code overlap and recaptured three picture tiles from the integrated scenes; see [AGENT-HANDOFF.md](AGENT-HANDOFF.md). The lane record below and [BUBBLE-NEST-DELIVERY.md](BUBBLE-NEST-DELIVERY.md) keep each lane's own checks and reviews.

- **Squishy Friend:** each region stretches differently. The curl pulls out like a tail, the cheeks squish wide, the eyes stretch tightly and the feet stay stubby. In Playful, releasing a pull slings the friend across the board with edge squash, lean and sway, and a touch catches it anywhere.
- **Penguin Bounce:** the penguin drops a ball from its chute every second in Playful, or every 1.8 seconds in Gentle, for two minutes after entry or the last touch. The board has bumpers, a pinwheel, funnel rails, turnable deflectors, coloured pegs and six ball colours, and afterwards it settles and sleeps.
- **Bubble Pond:** a pop breaks the bubble into iridescent arcs, with droplets and a ripple in Playful, and bubbles come back in varied safe places.
- **Roll & Nest:** a nested ball sits behind the bowl's front lip. In Playful, a released ball rolls, spins, rebounds and bumps the other ball.
- **Every toy:** the version and a short build code show in the top corner, and the parent control is marked Hold 2s.

**Checks on this exact build.** The checks ran at commit `a0a098e` on `release/v0.1.2`. The later merge of Codex's workflow files changes no deployable input, and both the build identity and the release gate still compute `v0.1.2-22157667feee`. The browser suite ran on port 4273 through the repository's `LITTLE_JOYS_TEST_PORT` setting.

| Check | Result |
|---|---|
| `npm ci` | Clean install of 105 packages. npm 11 did not run esbuild's optional install script, because the project has no allow-scripts entry for it; the build and every test ran without it. |
| `npm audit` | 0 vulnerabilities, with and without development dependencies |
| Type-check (production and tests) | Passed |
| Unit tests | 204 passed in 17 files |
| Production build | `v0.1.2-22157667feee` |
| Asset audit | Passed; 10 unique runtime rasters |
| Budget audit | Passed |
| Browser suite, both engines | 101 passed (Chromium 54, Windows WebKit 47), 7 skipped, 0 failed, 6.8 minutes |

The 7 skips are the Windows WebKit build's missing native AudioContext; they are unavailable audio cases, not passes. The first complete browser run on this build ended with 97 passed, 7 skipped and 4 Windows WebKit failures, one in each of four different specs. Each failure was the WebKit page closing mid-step with no failed assertion, while Windows recorded a low-virtual-memory condition on this busy host and another desktop application crashed. The four tests passed in an isolated rerun, and the browser results in the table are from a second complete run. See [check record](evidence/checks.json).

| Measured budget | Result | Limit |
|---|---|---|
| App JavaScript, gzip | 102,717 bytes | 200 KiB |
| Conservative initial non-music payload, gzip | 888,897 bytes | 2 MiB |
| Complete offline payload, including optional music | 4,584,438 bytes (4.37 MiB) | 8 MiB |
| Active plus waiting cache payloads | 9,168,876 bytes (8.74 MiB) | |
| Temporary replacement-install staging, three payloads | 13,753,314 bytes (13.12 MiB) | |
| All shipped rasters, decoded estimate | 8,982,080 bytes (8.57 MiB) | |
| Above plus Squishy material, its readback and Penguin Bounce's six tinted balls | 13,805,216 bytes (13.17 MiB) | 24 MiB |
| Visible canvas backing in the portrait workload | 1,771,470 pixels, DPR cap 1.5 | 2M pixels |

The three recaptured tiles are 61,248 encoded bytes larger than before, mostly the new Bubble Pond water. These are asset and backing estimates, not measured Safari memory.

**Desktop synthetic workloads, 10 seconds each.** Muted Windows Chromium 153, 810×1080 CSS at DPR 2, so the canvas is capped at 1.5. The live-input probe times only the input loop. The runtime window also covers the following wait, screenshot and opening of parent status. Another project's browser tests had finished before this run, and CPU load was about 15% when it started.

| Workload | Probe frame p95 / max | Probe gaps over 50ms | Runtime frame max, count over 50ms | Update/draw p95 | Input-to-render proxy p95 |
|---|---|---|---|---|---|
| Squishy Friend, Gentle, four contacts | 33.3 / 33.5ms | 0 | 33.5ms, 0 | 1.1ms | 23.1ms |
| Squishy Friend, Playful, four contacts | 33.4 / 33.5ms | 0 | 99.9ms, 1 | 1.1ms | 22.5ms |
| Squishy Friend, Playful sling cycles | 16.8 / 33.4ms | 0 | 100.0ms, 1 | 1.0ms | 20.3ms |
| Bubble Pond, Gentle | 16.8 / 16.8ms | 0 | 16.8ms, 0 | 0.2ms | 17.7ms |
| Roll & Nest, Gentle | 16.8 / 16.8ms | 0 | No continuous-loop samples | 0.2ms | 17.7ms |
| Penguin Bounce, Gentle, 24 balls with passive flow | 16.8 / 16.8ms | 0 | 100.0ms, 2 | 1.0ms | 17.8ms |
| Penguin Bounce, Playful, 24 balls with passive flow | 16.7 / 16.8ms | 0 | 150.0ms, 1 | 1.0ms | 17.8ms |

The Bubble Pond and Roll & Nest lane script measured both motion modes on the same build:

| Workload | Frame p95 / max | Gaps over 50ms | Update/draw p95 | Input-to-render proxy p95 | Canvas stable after settling |
|---|---|---|---|---|---|
| Six bubbles, Gentle | 16.8 / 16.8ms | 0 | 0.2ms | 17.8ms | Yes |
| Six bubbles, Playful | 16.8 / 16.8ms | 0 | 0.2ms | 17.7ms | Yes |
| Two balls, Gentle | 16.8 / 16.8ms | 0 | 0.3ms | 17.6ms | Yes |
| Two balls, Playful | 16.7 / 16.8ms | 0 | 0.3ms | 17.7ms | Yes |

Squishy Friend's probe p95 was one display interval in the sling workload and two in both four-contact workloads. Both lane builds showed the same run-to-run pattern in the lane's alternating comparison. That is at, not below, the 33.4ms p95 frame target the physical iPad checks use, so Squishy remains the toy to watch on the device. Update/draw p95 stayed near 1ms against its 8ms target, and no workload had a probe gap over 50ms. The runtime window's longer intervals, up to 150ms in Penguin Bounce Playful, fall outside the input loop, as in earlier rounds. The cold desktop start was actionable at 497ms, with all sprites rendered at 810ms and 576,112 bytes transferred. None of this is physical iPad performance. See the [timing summaries](evidence/desktop-performance.json) and [Bubble/Nest timing](evidence/release-v0.1.2-bubble-nest-performance.json).

**Independent integration review.** A separate read-only reviewer served this exact build locally and drove all four toys in desktop Chromium and WebKit at three screen sizes. It rated the build 8/10 as a technical preview and found no material defect. It measured both Squishy repairs directly: under a still finger, animation frames stopped within half a second in both motion modes, and a friend caught at the left or right wall stayed inside the inset through 60 frames of pulling past it. Penguin Bounce dispensed on schedule, drew nothing while hidden and released no burst on return, and every mechanism tap responded. Bubble Pond and Roll & Nest behaved as their lane records describe, including a fast release that still rolls. Two minor findings remain for follow-up. The build label covers the top-right corner of the Penguin Bounce snow shelf, clear of the penguin, chute and balls, and touches pass through it. Vertical slings did not reach the top and bottom walls, so the pull clamp is independently observed only at the side walls. See [REVIEW.md](REVIEW.md).

**Hosting.** The repository's hosted verifier then checked the live site against this build in desktop Chromium. The remote build label and all 20 precached files matched the local build byte for byte. All four toys worked online and again after an actual offline reload, a fresh session stayed silent, all six sprites loaded, and the parent controls and service-worker cache were verified. The cached music answered a range request with 206, a missing asset returned 404, the production CSP was checked, and there were no third-party requests or page errors. See [hosted evidence](evidence/hosted-check.json). A device that already has v0.1.1 open keeps it until every old window closes, because updates never reload a toy mid-play. To switch, use Parents → Check for update, then close every Little Joys tab or Home Screen window and reopen the address.

**Not established.** Physical iPad behaviour, owner feedback and player enjoyment. Penguin Bounce's passive flow has no adult off switch yet; that shared-settings change is recorded in [AGENT-HANDOFF.md](AGENT-HANDOFF.md).

## Fable-lane candidate `v0.1.2-664e98e42c76` (not deployed)

This candidate carries the Squishy Friend and Penguin Bounce work (LJ-20, LJ-22) on `codex/expressive-squish`, with the repairs from its independent review. It supersedes the pre-review candidate `v0.1.2-329dc2c8d902`. Its contracts are the [Penguin Bounce amendment](PENGUIN-BOUNCE-SPEC.md) and the [expressive-squish amendment](EXPRESSIVE-SQUISH-SPEC.md). Bubble Pond and Roll & Nest code is unchanged here. The package version stays 0.1.2; a release needs a coordinated integration with the other lane and the release steps in [DEPLOYMENT.md](../DEPLOYMENT.md).

**Checks run against this exact build.** The browser suite used a separate Playwright config with the repository's tests and settings, served on port 4273. Another lane's production server was on 4173 at the time, and the default config would reuse it.

| Check | Result |
|---|---|
| Type-check (production and tests) | Passed |
| Unit tests | 180 passed in 15 files |
| Production build | `v0.1.2-664e98e42c76` |
| Asset audit | Passed; 10 unique runtime rasters, unchanged |
| Budget audit | Passed |
| Browser suite, both engines | 93 passed (Chromium 50, Windows WebKit 43), 7 skipped, 0 failed, 7.0 minutes |
| `npm ci` | Not re-run: no dependency or lockfile change since the last clean install. A release run must include it. |

The 7 skips are the Windows WebKit build's missing native AudioContext; they are unavailable audio cases, not passes. Earlier in this round, one combined Squishy-only run failed a Windows WebKit four-contact reclaim case and reported one error outside any test. That run's log was truncated, so its details were lost. Isolated reruns and both complete runs passed; the cause is not established. See [check record](evidence/fable-lj20-lj22/checks-664e.json).

| Measured budget | Result |
|---|---|
| App JavaScript, gzip | 100,335 bytes |
| Conservative initial non-music payload, gzip | 823,024 bytes |
| Complete offline payload, including optional music | 4,516,882 bytes (4.31 MiB) |
| Active plus waiting cache payloads | 9,033,764 bytes (8.62 MiB) |
| Temporary replacement-install staging, three payloads | 13,550,646 bytes (12.92 MiB) |
| All shipped rasters, decoded estimate | 8,982,080 bytes (8.57 MiB) |
| Above plus Squishy material, its readback and Penguin Bounce's six tinted balls | 13,805,216 bytes (13.17 MiB) |
| Visible canvas backing in the portrait workload | 1,771,470 pixels, DPR cap 1.5 |

The tinted balls are six prepared surfaces of at most 66px square, 104,544 bytes. They are released when the scene is disposed. These are asset and backing estimates, not measured Safari memory.

**Desktop synthetic workloads, 10 seconds each.** Muted Windows Chromium 153, 810×1080 CSS at DPR 2, so the canvas is capped at 1.5. The live-input probe times only the input loop. The runtime window also covers the following wait, screenshot and opening of parent status. Other browser automation was running on the same machine throughout this round.

| Workload | Probe frame p95 / max | Probe gaps over 50ms | Runtime frame max, count over 50ms | Update/draw p95 | Input-to-render proxy p95 |
|---|---|---|---|---|---|
| Squishy Friend, Gentle, four contacts | 16.8 / 33.5ms | 0 | 33.5ms, 0 | 1.0ms | 20.9ms |
| Squishy Friend, Playful, four contacts | 16.8 / 33.4ms | 0 | 66.7ms, 1 | 1.0ms | 21.1ms |
| Squishy Friend, Playful sling cycles | 16.7 / 33.3ms | 0 | 66.6ms, 1 | 0.9ms | 17.8ms |
| Bubble Pond, Gentle | 16.7 / 16.8ms | 0 | 16.8ms, 0 | 0.2ms | 17.9ms |
| Roll & Nest, Gentle | 16.8 / 16.8ms | 0 | No continuous-loop samples | 0.2ms | 17.6ms |
| Penguin Bounce, Gentle, 24 balls with passive flow | 16.7 / 16.8ms | 0 | 50.1ms, 1 | 0.8ms | 17.8ms |
| Penguin Bounce, Playful, 24 balls with passive flow | 16.7 / 16.8ms | 0 | 99.9ms, 1 | 1.0ms | 18.1ms |

**Same-machine comparison with the pre-review build.** The first two measurements of this build put five of the six Squishy workloads at 33.3–33.4ms probe p95. Earlier in the day the pre-review build had measured 16.7–16.8ms. To separate the code from the machine, the pre-review build was rebuilt from its commit and confirmed as `v0.1.2-329dc2c8d902`. The two builds were then measured alternately with the same script and settings, four runs back to back. The table above is the fourth run.

| Squishy probe frame p95 | Run 1, pre-review | Run 2, this build | Run 3, pre-review | Run 4, this build |
|---|---|---|---|---|
| Gentle, four contacts | 33.4ms | 33.4ms | 16.8ms | 16.8ms |
| Playful, four contacts | 33.4ms | 33.4ms | 33.3ms | 16.8ms |
| Playful sling cycles | 33.4ms | 33.3ms | 16.8ms | 16.7ms |

Both builds moved between one and two display intervals at p95 from run to run. Update/draw p95 stayed between 0.9 and 1.3ms in every Squishy workload. The review repairs therefore have no measurable timing cost on this host. Both builds produced the two-interval runs, and what causes them is not established. No run had a probe gap over 50ms. Penguin Bounce Playful also measured 33.2ms p95 in the first pre-review run and 16.7–16.8ms in the other three. The runtime window's longer intervals, up to 166.7ms for the pre-review build and 100.0ms for this one, fall outside the input loop in both builds and have no established cause. The cold desktop start was actionable at 517ms, with all sprites rendered at 832ms and 569,804 bytes transferred. None of this is physical iPad performance. [Full timing summaries](evidence/fable-lj20-lj22/desktop-performance-664e.json) and the [alternating-run summary](evidence/fable-lj20-lj22/ab-timing-summary.json).

**Rendered evidence.** Frames captured from this build with a fake browser clock are in [evidence/fable-lj20-lj22](evidence/fable-lj20-lj22/README.md).

- **Sling, portrait Playful:** after a strong side pull, the painted friend's centre moved 133px to the left within 67ms. Its left edge reached 23px from the canvas edge, the 24px inset with antialiasing. It swung 54px past home at 233ms, was within 1px of home at 500ms and returned to the exact rest frame.
- **Poke:** a poke changed the friend's height by -7% at 50ms and +2.5% at 83ms, and it rested within 300ms.
- **Penguin Bounce, no touch:** 14 seconds after entry, the penguin had kept supplying balls in portrait (both motion modes), phone and landscape layouts. Mechanism taps visibly glowed, spun, turned and dispensed.
- **Browser tests on rendered pixels:** one test measured 75 rendered sling frames in both engines, and every frame stayed inside the inset. Another confirms that animation-frame requests stop under a resting finger.

**Independent review.** A read-only reviewer rated the pre-review build 7/10 as a technical preview. It found two material defects: animation never slept under a still finger, and a friend caught at a wall could be pulled past the inset. Both are repaired with regression tests, as are the minor findings; see [REVIEW.md](REVIEW.md). The repairs are verified by those tests and the complete run above; they have not yet had a second independent review.

**Not established.** Physical iPad behaviour, owner feedback and player enjoyment are not established by any of this. The Penguin Bounce picture tile still shows the old board and needs recapturing at integration.

## Delivered scope

- Squishy Friend: original painted mint mascot, larger local deformation with four independent influences, pickup on the already-stretched material, a quiet Gentle return, and one bounded Playful rebound/body response. Preserves the visible toes/curl and original face.
- Bubble Pond: three/six large bubbles, swept-path popping, quiet local feedback, bounded cooldowns, and no repeated respawn beneath a resting finger.
- Roll & Nest: one/two individually removable plush balls, offset-preserving drag, a generous release-only bowl target, and an adult-selectable tap-to-place alternative.
- Penguin Bounce: original painted penguin, useful tap-to-add/reuse, broad turnable deflectors, local swipe nudges, 8/16/24-ball settings, supported settling and sleeping animation, and bounded optional collision tones.
- Shared responsive React controls, semantic parent dialog, pause and mute, silent session defaults, Gentle/Playful settings, system reduced motion, validated local preferences, and session-only toy snapshots.
- Six original generated runtime sprites, four matching toy-picture tiles, installation icons, and one owner-authorized optional streamed music track. No image generation or external media requests occur at runtime/build.
- Versioned, integrity-verified static offline cache, truthful readiness/eviction status, safe waiting updates, exact missing-file 404s, media byte ranges, and restrictive production headers.

The combined build pack was split into README, SPEC, TASKS-AND-ACCEPTANCE, ASSETS, RESEARCH, SOURCES, and PLAYTEST documents. The original combined file and private kickoff transcript are preserved locally and excluded from Git. Owner-directed art/music refinements are explicit in [IMPLEMENTATION-NOTES.md](IMPLEMENTATION-NOTES.md).

## Build and validation

Validated build: **`v0.1.2-c63c46ea7ceb`**, app version **0.1.2**. `npm run check` exited **0**: **153 unit tests in 12 files passed; 89 browser tests passed, 7 unavailable audio cases skipped, 0 failed**. Chromium passed 48; Windows WebKit passed 41, with seven explicit native-AudioContext skips. Production/test TypeScript checks, build, asset audit and budgets passed. Both engines also performed 100 actual DOM scene switches in one unchanged page/process. [Check results](evidence/checks.json) record the complete run; earlier failures and their repairs remain in [REVIEW.md](REVIEW.md).

| Measured budget | Result |
|---|---|
| App JavaScript, gzip | 93,412 bytes |
| Conservative initial non-music payload, gzip | 816,102 bytes |
| Complete offline payload, including optional music | 4,494,555 bytes (4.29 MiB) |
| Active plus waiting cache payloads | 8,989,110 bytes (8.57 MiB) |
| Temporary replacement-install staging, three payloads | 13,483,665 bytes (12.86 MiB) |
| All shipped raster decoded estimate | 8,982,080 bytes (8.57 MiB) |
| Shipped rasters plus prepared Squishy material | 11,341,376 bytes (10.82 MiB) |
| Above plus temporary material-preparation readback | 13,700,672 bytes (13.07 MiB) |
| Visible canvas backing in portrait workload | 1,771,470 pixels, DPR cap 1.5 |

These are asset/storage/backing estimates, **not measured Safari process RAM**. Six original sprites are shared. Squishy prepares one 768×768 material surface (2.25 MiB) once on scene entry to remove interior alpha seams, with one equally sized temporary readback; the scene releases the surface on disposal. This is separate from the visible canvas, explicitly counted under the unchanged 24 MiB raster budget. Browser graphics copies and garbage-collection timing are unmeasured. At rest the original friend renders in one draw and the scheduler sleeps. Audio streams; four touches, toy object pools, short effects, sound voices and animation work remain bounded. [Full budgets](evidence/budgets.json) and [asset audit](evidence/asset-audit.json) retain hashes and file-level counts.

The cold desktop trace used a fresh browser cache, 10 Mbps/50ms network profile and blocked service workers: actionable at **520ms**, all six sprites rendered at **830ms**. Initial response transfers totaled **547,477 bytes** including HTML. Offline background precaching is counted separately above.

| Desktop synthetic workload (10s each) | Active frame p95 | Update/draw p95 | Input-to-render proxy p95 | Active gaps >50ms | Runtime interval max / count >50ms |
|---|---|---|---|---|---|
| Squishy Friend (gentle) | 49.9ms | 2.8ms | 38.7ms | 3 | 50.1ms / 3 |
| Squishy Friend (playful) | 33.4ms | 3.9ms | 36.1ms | 0 | 66.7ms / 1 |
| Bubble Pond (gentle) | 16.7ms | 0.4ms | 22.2ms | 0 | 16.8ms / 0 |
| Roll & Nest (gentle) | 16.8ms | 0.4ms | 22.0ms | 0 | No continuous-loop samples |
| Penguin Bounce (gentle) | 16.8ms | 1.0ms | 20.8ms | 0 | 100.1ms / 1 |
| Penguin Bounce (playful) | 16.8ms | 1.2ms | 21.7ms | 0 | 133.3ms / 1 |

Both Squishy modes use four synthetic contacts and twice the preceding trace's drag amplitude. Both Bounce modes use 24 balls, four contacts and recycled spawns. These are muted Windows desktop measurements, not physical iPad performance or touch-to-photon latency. The continuous input probe and runtime timing windows differ: runtime diagnostics also cover the subsequent wait, screenshot and opening of parent status. A zero gap count in one must not conceal an interval in the other. Roll & Nest sleeps between inputs. [Full timing summaries](evidence/desktop-performance.json) retain medians, sample counts, maxima, and exact workload descriptions. Prior v0.1.1 measurements and outliers are preserved in Git history and REVIEW.md.

Commands: `npm ci`; `npm run dev`; `npm run build`; `node scripts/serve-dist.mjs`; `npx playwright install chromium webkit`; `npm run check`. Root [README](../README.md) has the complete setup and Vercel procedure.

Toolchain measured on this Windows host: Node 24.19.0, npm 11.17.0, React/DOM 19.3.0, TypeScript 5.9.3, Vite 7.3.6, Vitest 4.1.11, Playwright 1.63.0. Desktop Chromium reports 153.0.8010.12. Package versions are locked; a full `npm audit` reported zero vulnerabilities during validation.

## Requirement coverage

This mapping identifies evidence, not physical-device certification. Behavioral implementation and automated tests cannot establish perceived enjoyment.

| Acceptance IDs | Requirements | Implementation and evidence |
|---|---|---|
| T01 | G01, G03 | Direct first-toy startup; no menu/input gate; session-silent audio. Production interaction/audio tests. |
| T02–T05 | G08, I01–I05, I08, S04, S07 | Pointer map plus ignored-contact lifetime; independent ownership and idempotent cleanup. Core units and synthetic browser contacts. |
| T06–T07 | I04, I06, U08 | Pause, settings, selector, resize, blur, hiding and coordinate mapping. Browser cancellations and DPR 1/1.5/2 checks; physical rotation still pending. |
| T08–T09 | S01–S06 | Local deformation pixel comparison, actual mesh displacement, opposing/four-contact stability, positive triangle areas, saved-state validation and Gentle return. Squishy/mesh units and screenshots. |
| T10–T14 | B01–B07, U04, G06 | Segment-circle hits, bounded pools/effects, cooldown and contact exclusion, layout and frozen active time. Bubble units; rendered bubble review. |
| T15–T19 | N01–N08, I07 | Pickup offset, first claim, release acceptance, visible nested slots, independent retrieval, overlap recovery, tap-place and rotated snapshots. Nest units and two-ball visual review. |
| T20 | G02, G04, G05 | Deterministic toy logic, repeatable inputs and unrestricted repetition/exit; no speech, answer or turn-taking API. Unit sequences, browser flow and copy review. |
| T21–T23 | G03, G06, G07 | Explicit adult enable, independent music/effects, child mute, pause/background cancellation, denied/late promises, no queued SFX, one stream and shared bounded gain graph. Audio/music units and native Chromium browser instrumentation. Windows WebKit lacks AudioContext. |
| T24 | G07 | Gentle default and system override, monotonic response, no idle movement. Unit return checks and reduced-motion browser test. |
| T25–T26 | U01–U07 | 810×1080, 1080×810, 360×640 and desktop layouts, control bounds/gaps, focus, labelled sliders/selects, cancellable two-second hold, scrolling dialog. Browser tests and reviewed renders. Full canvas screen-reader interaction is not claimed. |
| T27 | G07 | Corrupt JSON, unknown fields, numeric clamps and storage exceptions recover to usable settings. Unit and production browser tests. |
| T28 | D01, D02, D06 | Complete verified cache, first offline navigation, all six sprites, four toys/settings, persistence and encoded media range. Origin physically unavailable; see [PWA test method](PWA-TEST-EVIDENCE.md). |
| T29 | D03–D05 | Failed install retains prior build; successful waiting update remains coherent across two old windows and activates only after both close. Production fixture tests and worker units. |
| T30 | D06 | Missing/evicted/denied caches revoke readiness; matching online fallback and settings remain usable. Worker units and browser cache-eviction tests. |
| T31 | G10, D07 | Production CSP/request checks, same-origin asset inventory, no runtime AI/analytics/permissions/keys. Public-source and media-metadata inspection. |
| T32 | D07 | Manifest hashes/dimensions/alpha, all-raster decoded estimate, compressed JS, full offline payload, 2M-pixel canvas bound, finite geometry and bounded counts. Asset/build audits, unit fallback rendering and browser resource checks. |
| T33 | I04, D05 | Pending/disposed image callbacks cannot replace scenes; six shared images, zero stale pointers after 100 DOM scene switches. Asset units and delayed-load/stability browser tests. |
| T34 | G05, G09, G10 | Neutral product copy; no scores, streaks, guilt or treatment claims. Source and browser review. Private source documents remain excluded. |
| T35 | D08 | Actual build/local URL and honest deployment status in this delivery record; no invented hosted URL. |
| T36–T40 | P02–P08, P10 | Pure physics regressions for dense collisions, finite speed/counts, supported sleep, recycling, rotation and corrupt snapshots; both browser engines exercise real production input, limits, hold behavior, four contacts and all stop paths. Dense 24-ball scenes sleep within the unchanged 45-second assertion in both motion modes. |
| T41–T43 | P01, P09, P12 | Four picture tiles/startup choices, explicit setting names, layout/focus checks, shared bounded audio, six-sprite offline operation and waiting-update production fixtures. Actual hosting is verified separately below. |
| T44 | P05, P11, P12 | Independent board/interaction review and five measured desktop workloads, including both dense bouncing modes. Pure physics stays separate from DOM/React. Target-device checks remain pending. |
| T45–T46 | SQ01–SQ03 | Larger local movement, 240 adversarial four-contact/layout cases, positive triangle areas throughout returns, inset bounds, inverse/forward material mapping and continuous re-grabs. Geometry/scene units and browser renders. |
| T47–T48 | SQ04–SQ05, SQ07 | Finite Gentle/Playful returns, no queued response, reduced-motion override, pause/cancel/resize and exact eventual rest. Independent phone/tablet/landscape side/eye review, deployed-baseline comparison and retained original single-texture face. |
| T49–T50 | SQ06, SQ08 | Six-workload and complete regression evidence, explicit prepared-raster budget/disposal, independent repair review, versioned backup and exact hosted verification are recorded for this sprint in this delivery record. Physical-device and private enjoyment evidence remain separate. |

## Independent review and repaired defects

The original three-toy reviewer inspected code, geometry tests, actual interactions and screenshots through four checkpoints: initial slice, sprite integration, completed visual/source review, and final production evidence. [REVIEW.md](REVIEW.md) retains failures and repairs. Concrete fixes included both slider labels, restored face/mesh validation, one-use touch iterator handling, visible sprite pickup regions, and complete active timing samples.

The latest reviewed visual/source state received **8/10 as a technical preview**, conditional on completed production evidence. This is not a rating of child enjoyment or a claim of target-device qualification.

Early incomplete runs remain distinct from final results. Windows WebKit's offline override was investigated using controlled/uncontrolled pages and an actually closed origin, with the same production bytes; see [PWA-TEST-EVIDENCE.md](PWA-TEST-EVIDENCE.md). Tests do not substitute a retry or a skipped assertion for verified offline operation.

## Asset provenance and privacy

See [image provenance](../art/PROVENANCE.md), [exact sanitized sprite prompts](../art/SPRITE-PROMPTS.md), [source export recipes/hashes](../art/source-manifest.json), and [music provenance](../art/AUDIO-PROVENANCE.md). The available built-in OpenAI image-generation tool completed the original artwork. Its response exposed no exact backend model identifier; no claim is made that a particular Images 2.5 variant was selected.

The runtime uses 768px mascot/bowl exports, 384px balls/bubble and a 512px penguin. Selector images come from the actual scenes. Generated source masters remain outside `public`/`dist`; their OpenAI C2PA attribution remains intact. Runtime raster exports contain no source metadata. Music is a 3,458,184-byte derivative with the 29,299-byte ID3 metadata block removed; MPEG audio content is unchanged. The source repositories were not modified. No bulk asset archive was imported.

Source/privacy inspection excluded the private combined pack and transcript, checked public text for identifying content and credentials, inspected generation metadata, and removed source-account/generation tags from music before publication. No family photographs, voices, identifying notes or raw touch paths are included. Hosting requests still reach the hosting provider.

## Deployment

This section records the v0.1.1 deployment. The combined v0.1.2 release at the top of this document replaced it at the same address on 13 September 2026.

**The four-toy MVP was deployed and ready to try at [littlejoys-play.vercel.app](https://littlejoys-play.vercel.app/).** Source commit `c84af963e95fa647edc7f13622fb9ada575d7021`, app **v0.1.1**, hosted build **`v0.1.1-50d0640d1f04`**, deployment `9NuYnEVDFqBYf2fp3zsh4YL1JPCM`. It uses the existing Little Joys Vercel project and static `dist` output (`npm ci`, `npm run build`, Other preset). Vercel calls the stable alias's environment Production; this remains a technical playtest preview with physical-device checks pending. Analytics and Speed Insights were not enabled. The older `little-joys-gules.vercel.app` alias remains available. The shorter `little-joys.vercel.app` was already assigned elsewhere; no domain was purchased.

The actual HTTPS page was opened and checked. A separate unauthenticated Chromium run verified the exact local build label and manifest, all **20 precached files byte-for-byte**, all **four toys online and after an actual offline reload**, fresh-session silence, six loaded sprites, parent controls, completed matching cache, a cached audio `206` range response, missing-file `404`, production CSP, zero third-party runtime requests, and zero page errors. See [hosted evidence](evidence/hosted-check.json). No label substitution or provider-specific reproduction was needed for this release.

In the existing first-load in-app browser window, checking for the update correctly revoked old-build offline readiness and reported that a different saved version was active. Closing that window and reopening the same address showed all four tiles, the exact new build, verified offline readiness, and working Playful selection. That observation is not presented as a controlled multi-window waiting-update test; those cases have separate production-fixture evidence. No forced reload occurred. For an older window, use Parents → Check for update, follow its waiting/different-version message, then close all Little Joys tabs/Home Screen windows and reopen.

To try the new toy, choose **Toybox → Penguin Bounce**. Hold **Parents** for two seconds and choose **Playful** for brighter local collision lights and the small penguin reaction. The bouncing-ball limit offers eight, sixteen or twenty-four. Music and toy sounds can be enabled separately there; fresh visits remain silent. Gentle and system reduced motion retain the quieter response.

The first v0.1.0 exact-label check exposed a build-identity formatting defect: Vercel compacted `vercel.json`, changing the input hash without changing configuration meaning. The hosted build was reproduced locally using only that temporary serialization change, then source formatting was restored. The complete remote manifest and bytes matched that reproduction. Semantic-configuration normalization and a regression test are now included in v0.1.1. Earlier v0.1.0 evidence remains in Git history; the current validation above covers the corrected four-toy artifact. A separate smoke-helper selector mismatch was corrected to use the existing accessible combobox names; it was not a runtime failure.

The initial v0.1.0 automatic import correctly canceled with no successful baseline and was deliberately redeployed once with **Use project's Ignore Build Step** unchecked for that run. No permanent override was installed. The v0.1.1 push ran the repository gate automatically; the actual Vercel log reported **“Little Joys: BUILD — Material playtest release 0.1.0 -> 0.1.1”**, then built and published the exact checked artifact. This verifies the repaired history/configuration handling on the provider.

The following documentation/evidence/helper-copy backup, commit `9cb31a25467eba49466b755cf1f35839c5c01f65`, was observed on Vercel as canceled deployment `AstDnYJWMDdbWqrmPAF3KDetuVw4`. Its gate reported that the app version had not increased beyond the last successful deployment and exited zero. No install, app build or output upload followed; the checked v0.1.1 release remains live. This is an actual version-comparison skip, distinct from the earlier history-unavailable cancellation. See the sanitized [provider policy receipt](evidence/deployment-policy.json).

GitHub backups are independent of release selection: automatic builds require a higher stable app version and changed deployable inputs against the last successful deployment. Documentation, specs, tests and source-art backups skip. Unexpected gate failures and unknown history skip; the first build is explicitly initiated. Canceled gate entries may still count toward Vercel quotas but do not upload another completed game. See [deployment policy](../DEPLOYMENT.md), including manual first-build and rollback instructions.

## Exact physical iPad checks still pending

1. Record actual eighth-generation hardware, iPadOS version, Safari versus Home Screen mode, build ID, orientation and case fitted. Confirm the proposed Safari/iPadOS 16.4 minimum against the real installed software.
2. Check cold/warm online loads, actual icon/Add to Home Screen installation, completed cache, airplane-mode/offline relaunch, every toy and all settings offline, cache eviction, failed update and multi-window waiting update. Browser storage can be evicted; permanence is not promised.
3. Use two and four real fingers, including simultaneous input from two people; add a fifth, lift in a different order, rest a finger on empty space, drag to every edge/outside the original object, rotate during drag, and inspect case-lip reach in both orientations. For Squishy, try strong side/eye/curl pulls, crossed fingers, opposite-side pickup during return, both release modes and eventual stillness. For Penguin Bounce, check both deflectors, useful taps at the edges, four simultaneous spawns, full-pool recycling, supported rest, and renewed input after the board sleeps.
4. Test all pause/exit/mute paths, device lock/unlock, app switching and interrupted gestures. Verify fresh/return silence, explicit adult music/SFX enable, actual output gain/comfort, mute during active audio, offline streaming and no queued return sounds. Desktop Windows WebKit cannot provide audio evidence.
5. Run a 60-second adult interaction trace per toy at maximum configured objects/contacts in both motion modes. Record active frame p50/p95/max and stalls, update/draw separately, input-to-render proxy, startup conditions and backing pixels. Compare against 33.4ms p95 frame / 8ms p95 update-draw targets; these remain unqualified on hardware.
6. Run an adult-only 20-minute soak plus 100 on-device scene switches. Check app-induced reloads, crashes, progressive slowdown, stuck input, repeated sound and retained resources. Desktop switching does not replace this soak.
7. Capture and inspect both orientations: every toy, locally stretched friend, two balls inside/removable from the bowl, selector, pause and scrolling/zoomed settings. Observe comfort, voluntary engagement and return preference separately, in private. No required play duration or performance score applies to a child.

Known limits: physical touch/thermal/memory/performance and actual Safari media behavior are unmeasured; full nonvisual Canvas interaction is not implemented. The strongest Squishy outline can look slightly angular, and separate face cutouts are not implemented. One Windows WebKit window-creation failure remains unexplained in the preserved earlier regression run. The deliberately small toy collection remains open to feedback; warmer presentation is a recorded refinement rather than a finished design claim.

The larger Squishy range and release response now have concrete implementation and comparative render evidence; further private feedback is needed to assess their feel. Remaining reported work is repetitive bubble positioning and inconsistent color impression, unclear silent/audio setup, an unwanted ball halo/floating shadow and bowl front-lip clipping, bounded roll/settle response, and warmer presentation (LJ-14–LJ-17). Penguin Bounce remains available with its Playful local lights/effects. Exact phone/build/settings details were not recorded for the initial report, so those observations do not replace reproduced test failures or physical-iPad evidence.
