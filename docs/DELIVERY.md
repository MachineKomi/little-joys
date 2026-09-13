# Little Joys — implementation delivery

Status: four-toy technical preview; physical iPad validation pending. Initial owner phone feedback is recorded privately, with sanitized product shortcomings in [FEEDBACK-AND-REFINEMENTS.md](FEEDBACK-AND-REFINEMENTS.md). No general enjoyment or educational outcome is claimed.

## Delivered scope

- Squishy Friend: original painted mint mascot, actual local texture deformation with four independent touch influences, stable return and forgiving pickup including the visible toes/curl.
- Bubble Pond: three/six large bubbles, swept-path popping, quiet local feedback, bounded cooldowns, and no repeated respawn beneath a resting finger.
- Roll & Nest: one/two individually removable plush balls, offset-preserving drag, a generous release-only bowl target, and an adult-selectable tap-to-place alternative.
- Penguin Bounce: original painted penguin, useful tap-to-add/reuse, broad turnable deflectors, local swipe nudges, 8/16/24-ball settings, supported settling and sleeping animation, and bounded optional collision tones.
- Shared responsive React controls, semantic parent dialog, pause and mute, silent session defaults, Gentle/Playful settings, system reduced motion, validated local preferences, and session-only toy snapshots.
- Six original generated runtime sprites, four matching toy-picture tiles, installation icons, and one owner-authorized optional streamed music track. No image generation or external media requests occur at runtime/build.
- Versioned, integrity-verified static offline cache, truthful readiness/eviction status, safe waiting updates, exact missing-file 404s, media byte ranges, and restrictive production headers.

The combined build pack was split into README, SPEC, TASKS-AND-ACCEPTANCE, ASSETS, RESEARCH, SOURCES, and PLAYTEST documents. The original combined file and private kickoff transcript are preserved locally and excluded from Git. Owner-directed art/music refinements are explicit in [IMPLEMENTATION-NOTES.md](IMPLEMENTATION-NOTES.md).

## Build and validation

Validated build: **`v0.1.1-50d0640d1f04`**, app version **0.1.1**. `npm run check` exited **0**: 140 unit tests in 11 files passed; **81 browser tests passed, 7 unavailable audio cases skipped, 0 failed**. Chromium passed 44 cases; Windows WebKit passed 37 with 7 explicit skips because its native AudioContext is unavailable. Production/test TypeScript checks, production build, asset audit and budgets all passed. Each browser also completed 100 actual DOM scene switches in one unchanged page/process. The earlier dense-board failure was repaired before this run; it remains recorded in [REVIEW.md](REVIEW.md). Sanitized [check results](evidence/checks.json) are included.

| Measured budget | Result |
|---|---|
| App JavaScript, gzip | 91,517 bytes |
| Conservative initial non-music payload, gzip | 814,207 bytes |
| Complete offline payload, including optional music | 4,488,912 bytes (4.28 MiB) |
| Active plus waiting cache payloads | 8,977,824 bytes (8.56 MiB) |
| Temporary replacement-install staging, three payloads | 13,466,736 bytes (12.84 MiB) |
| All shipped raster decoded estimate | 8,982,080 bytes (8.57 MiB) |
| Canvas backing in the portrait workload | 1,771,470 pixels, DPR cap 1.5 |

These are asset/storage/backing budgets, **not measured Safari process RAM**. Six sprites are shared, audio streams without a complete decoded AudioBuffer, and finite pools bound contacts/objects/effects. Penguin Bounce caps balls and local effects at 24 each, uses fixed 1/120-second physics with at most eight catch-up steps, and sleeps after supported rest. [Full budgets](evidence/budgets.json) and [asset audit](evidence/asset-audit.json) include hashes and file-level counts.

The desktop cold trace used fresh browser cache, a 10 Mbps/50ms network profile and blocked service workers to isolate initial interaction: actionable at **479ms**, all six sprites rendered at **767ms**. Actual initial response transfers totaled **541,834 bytes** including HTML. Background offline precaching is counted separately above.

| Desktop synthetic workload (10s per scenario) | Active frame p95 | Update/draw p95 | Input-to-render proxy p95 | Active frame gaps >50ms | Runtime interval max / count >50ms |
|---|---|---|---|---|---|
| Squishy Friend (gentle) | 16.8ms | 0.6ms | 19.1ms | 0 | 33.3ms / 0 |
| Bubble Pond (gentle) | 16.7ms | 0.2ms | 17.6ms | 0 | 16.8ms / 0 |
| Roll & Nest (gentle) | 16.8ms | 0.2ms | 17.7ms | 0 | No continuous-loop samples |
| Penguin Bounce (gentle) | 16.7ms | 0.6ms | 17.9ms | 0 | 50.0ms / 0 |
| Penguin Bounce (playful) | 16.8ms | 0.8ms | 18.0ms | 0 | 66.7ms / 1 |

These muted Windows desktop Chromium traces use synthetic contacts and maximum object counts. Both Penguin Bounce scenarios keep the 24-ball pool busy with four contacts and repeated recycled spawns. They do not establish physical iPad performance or touch-to-photon latency. The continuous-workload probe ends with the input loop; runtime diagnostics also cover the subsequent wait, screenshot and opening of parent status. Their interval windows differ, so a zero count in one must not conceal a gap in the other. Roll & Nest sleeps between inputs. [Sanitized timing summaries](evidence/desktop-performance.json) preserve sample counts, medians, maxima and exact conditions. The prior 4a trace's 66.6ms runtime interval is retained in [review history](REVIEW.md); no performance repair was made for the metadata correction.

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

## Independent review and repaired defects

The original three-toy reviewer inspected code, geometry tests, actual interactions and screenshots through four checkpoints: initial slice, sprite integration, completed visual/source review, and final production evidence. [REVIEW.md](REVIEW.md) retains failures and repairs. Concrete fixes included both slider labels, restored face/mesh validation, one-use touch iterator handling, visible sprite pickup regions, and complete active timing samples.

The latest reviewed visual/source state received **8/10 as a technical preview**, conditional on completed production evidence. This is not a rating of child enjoyment or a claim of target-device qualification.

Early incomplete runs remain distinct from final results. Windows WebKit's offline override was investigated using controlled/uncontrolled pages and an actually closed origin, with the same production bytes; see [PWA-TEST-EVIDENCE.md](PWA-TEST-EVIDENCE.md). Tests do not substitute a retry or a skipped assertion for verified offline operation.

## Asset provenance and privacy

See [image provenance](../art/PROVENANCE.md), [exact sanitized sprite prompts](../art/SPRITE-PROMPTS.md), [source export recipes/hashes](../art/source-manifest.json), and [music provenance](../art/AUDIO-PROVENANCE.md). The available built-in OpenAI image-generation tool completed the original artwork. Its response exposed no exact backend model identifier; no claim is made that a particular Images 2.5 variant was selected.

The runtime uses 768px mascot/bowl exports, 384px balls/bubble and a 512px penguin. Selector images come from the actual scenes. Generated source masters remain outside `public`/`dist`; their OpenAI C2PA attribution remains intact. Runtime raster exports contain no source metadata. Music is a 3,458,184-byte derivative with the 29,299-byte ID3 metadata block removed; MPEG audio content is unchanged. The source repositories were not modified. No bulk asset archive was imported.

Source/privacy inspection excluded the private combined pack and transcript, checked public text for identifying content and credentials, inspected generation metadata, and removed source-account/generation tags from music before publication. No family photographs, voices, identifying notes or raw touch paths are included. Hosting requests still reach the hosting provider.

## Deployment

**The four-toy MVP is deployed and ready to try at [littlejoys-play.vercel.app](https://littlejoys-play.vercel.app/).** Source commit `c84af963e95fa647edc7f13622fb9ada575d7021`, app **v0.1.1**, hosted build **`v0.1.1-50d0640d1f04`**, deployment `9NuYnEVDFqBYf2fp3zsh4YL1JPCM`. It uses the existing Little Joys Vercel project and static `dist` output (`npm ci`, `npm run build`, Other preset). Vercel calls the stable alias's environment Production; this remains a technical playtest preview with physical-device checks pending. Analytics and Speed Insights were not enabled. The older `little-joys-gules.vercel.app` alias remains available. The shorter `little-joys.vercel.app` was already assigned elsewhere; no domain was purchased.

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
3. Use two and four real fingers, including simultaneous input from two people; add a fifth, lift in a different order, rest a finger on empty space, drag to every edge/outside the original object, rotate during drag, and inspect case-lip reach in both orientations. For Penguin Bounce, check both deflectors, useful taps at the edges, four simultaneous spawns, full-pool recycling, supported rest, and renewed input after the board sleeps.
4. Test all pause/exit/mute paths, device lock/unlock, app switching and interrupted gestures. Verify fresh/return silence, explicit adult music/SFX enable, actual output gain/comfort, mute during active audio, offline streaming and no queued return sounds. Desktop Windows WebKit cannot provide audio evidence.
5. Run a 60-second adult interaction trace per toy at maximum configured objects/contacts in both motion modes. Record active frame p50/p95/max and stalls, update/draw separately, input-to-render proxy, startup conditions and backing pixels. Compare against 33.4ms p95 frame / 8ms p95 update-draw targets; these remain unqualified on hardware.
6. Run an adult-only 20-minute soak plus 100 on-device scene switches. Check app-induced reloads, crashes, progressive slowdown, stuck input, repeated sound and retained resources. Desktop switching does not replace this soak.
7. Capture and inspect both orientations: every toy, locally stretched friend, two balls inside/removable from the bowl, selector, pause and scrolling/zoomed settings. Observe comfort, voluntary engagement and return preference separately, in private. No required play duration or performance score applies to a child.

Known limits: physical touch/thermal/memory/performance and actual Safari media behavior are unmeasured; full nonvisual Canvas interaction is not implemented; quiet background and small toy collection are intentional. Any further toy/content expansion should follow actual observations, with the current four-toy behavior preserved.

Reported phone shortcomings remain open: small/under-expressive squish range and release response; repetitive bubble positions and inconsistent color impression; unclear silent/audio setup; an unwanted ball halo/floating shadow and reported bowl front-lip clipping; and an overly clinical presentation. These require the concrete work in LJ-13–LJ-17. The current Penguin Bounce patch expands the available interaction and improves its Playful effects; passing its technical checks does not close the other toys' reported issues. Exact phone/build/settings details were not recorded, so these reports are not substituted for reproduced test failures or physical-iPad evidence.
