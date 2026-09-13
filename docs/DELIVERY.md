# Little Joys — implementation delivery

Status: three-toy technical preview; physical iPad validation pending. No child enjoyment or educational outcome has been observed or claimed.

## Delivered scope

- Squishy Friend: original painted mint mascot, actual local texture deformation with four independent touch influences, stable return and forgiving pickup including the visible toes/curl.
- Bubble Pond: three/six large bubbles, swept-path popping, quiet local feedback, bounded cooldowns, and no repeated respawn beneath a resting finger.
- Roll & Nest: one/two individually removable plush balls, offset-preserving drag, a generous release-only bowl target, and an adult-selectable tap-to-place alternative.
- Shared responsive React controls, semantic parent dialog, pause and mute, silent session defaults, Gentle/Playful settings, system reduced motion, validated local preferences, and session-only toy snapshots.
- Five original generated runtime sprites, three matching toy-picture tiles, installation icons, and one owner-authorized optional streamed music track. No image generation or external media requests occur at runtime/build.
- Versioned, integrity-verified static offline cache, truthful readiness/eviction status, safe waiting updates, exact missing-file 404s, media byte ranges, and restrictive production headers.

The combined build pack was split into README, SPEC, TASKS-AND-ACCEPTANCE, ASSETS, RESEARCH, SOURCES, and PLAYTEST documents. The original combined file and private kickoff transcript are preserved locally and excluded from Git. Owner-directed art/music refinements are explicit in [IMPLEMENTATION-NOTES.md](IMPLEMENTATION-NOTES.md).

## Build and validation

Validated build: **`v0.1.0-228d3ff2889a`**, app version **0.1.0**. `npm run check` exited **0**: 111 unit tests in 10 files passed; **68 browser tests passed, 6 unavailable audio cases skipped, 0 failed**. Chromium passed 37 cases; Windows WebKit passed 31 with six explicit skips because its native AudioContext is unavailable. Production/test TypeScript checks, production build, asset audit and budgets all passed. Each browser also completed 100 actual DOM scene switches in one unchanged page/process. Raw local reports remain excluded from Git; sanitized [check results](evidence/checks.json) are included.

| Measured budget | Result |
|---|---|
| App JavaScript, gzip | 85,636 bytes |
| Conservative initial non-music payload, gzip | 738,684 bytes |
| Complete offline payload, including optional music | 4,398,616 bytes (4.19 MiB) |
| Active plus waiting cache payloads | 8,797,232 bytes (8.39 MiB) |
| Temporary replacement-install staging, three payloads | 13,195,848 bytes (12.58 MiB) |
| All shipped raster decoded estimate | 7,491,136 bytes (7.14 MiB) |
| Canvas backing in the portrait workload | 1,771,470 pixels, DPR cap 1.5 |

These are asset/storage/backing budgets, **not measured Safari process RAM**. Five sprites are shared, audio streams without a complete decoded AudioBuffer, and finite pools bound contacts/objects/effects. [Full budgets](evidence/budgets.json) and [asset audit](evidence/asset-audit.json) include hashes and file-level counts.

The desktop cold trace used fresh browser cache, a 10 Mbps/50ms network profile and blocked service workers to isolate initial interaction: actionable at **471ms**, all five sprites rendered at **746ms**. Actual initial response transfers totaled **493,731 bytes** including HTML. Background offline precaching is counted separately above.

| Desktop synthetic workload (10s per toy) | Active frame p95 | Update/draw p95 | Input-to-render proxy p95 | Active frame gaps >50ms |
|---|---|---|---|---|
| Squishy Friend | 16.7ms | 0.7ms | 17.5ms | 0 |
| Bubble Pond | 16.8ms | 0.2ms | 17.5ms | 0 |
| Roll & Nest | 16.7ms | 0.2ms | 17.6ms | 0 |

These muted Windows desktop Chromium traces use synthetic contacts and maximum object counts. They do not establish physical iPad performance or touch-to-photon latency. Roll & Nest sleeps between inputs; the separate active-workload sampler records continuous browser pacing. [Raw sanitized timing summaries](evidence/desktop-performance.json) preserve sample counts, medians, maxima and the exact conditions.

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
| T28 | D01, D02, D06 | Complete verified cache, first offline navigation, all five sprites, three toys/settings, persistence and encoded media range. Origin physically unavailable; see [PWA test method](PWA-TEST-EVIDENCE.md). |
| T29 | D03–D05 | Failed install retains prior build; successful waiting update remains coherent across two old windows and activates only after both close. Production fixture tests and worker units. |
| T30 | D06 | Missing/evicted/denied caches revoke readiness; matching online fallback and settings remain usable. Worker units and browser cache-eviction tests. |
| T31 | G10, D07 | Production CSP/request checks, same-origin asset inventory, no runtime AI/analytics/permissions/keys. Public-source and media-metadata inspection. |
| T32 | D07 | Manifest hashes/dimensions/alpha, all-raster decoded estimate, compressed JS, full offline payload, 2M-pixel canvas bound, finite geometry and bounded counts. Asset/build audits, unit fallback rendering and browser resource checks. |
| T33 | I04, D05 | Pending/disposed image callbacks cannot replace scenes; five shared images, zero stale pointers after 100 DOM scene switches. Asset units and delayed-load/stability browser tests. |
| T34 | G05, G09, G10 | Neutral product copy; no scores, streaks, guilt or treatment claims. Source and browser review. Private source documents remain excluded. |
| T35 | D08 | Actual build/local URL and honest deployment status in this delivery record; no invented hosted URL. |

## Independent review and repaired defects

The independent reviewer inspected code, geometry tests, actual interactions and screenshots through four checkpoints: initial slice, sprite integration, completed visual/source review, and final production evidence. [REVIEW.md](REVIEW.md) retains failures and repairs. Concrete fixes included both slider labels, restored face/mesh validation, one-use touch iterator handling, visible sprite pickup regions, and complete active timing samples.

The latest reviewed visual/source state received **8/10 as a technical preview**, conditional on completed production evidence. This is not a rating of child enjoyment or a claim of target-device qualification.

Early incomplete runs remain distinct from final results. Windows WebKit's offline override was investigated using controlled/uncontrolled pages and an actually closed origin, with the same production bytes; see [PWA-TEST-EVIDENCE.md](PWA-TEST-EVIDENCE.md). Tests do not substitute a retry or a skipped assertion for verified offline operation.

## Asset provenance and privacy

See [image provenance](../art/PROVENANCE.md), [exact sanitized sprite prompts](../art/SPRITE-PROMPTS.md), [source export recipes/hashes](../art/source-manifest.json), and [music provenance](../art/AUDIO-PROVENANCE.md). The available built-in OpenAI image-generation tool completed the original artwork. Its response exposed no exact backend model identifier; no claim is made that a particular Images 2.5 variant was selected.

The runtime uses 768px mascot/bowl exports and 384px balls/bubble. Selector images come from the actual scenes. Generated source masters remain outside `public`/`dist`; their OpenAI C2PA attribution remains intact. Runtime raster exports contain no source metadata. Music is a 3,458,184-byte derivative with the 29,299-byte ID3 metadata block removed; MPEG audio content is unchanged. The source repositories were not modified. No bulk asset archive was imported.

Source/privacy inspection excluded the private combined pack and transcript, checked public text for identifying content and credentials, inspected generation metadata, and removed source-account/generation tags from music before publication. No family photographs, voices, identifying notes or raw touch paths are included. Hosting requests still reach the hosting provider.

## Deployment

Static output is prepared in `dist`, with the Other/static Vercel preset, `npm ci`, `npm run build`, and the tested headers. The signed-in dashboard is available and this build is being imported into its own Little Joys project. Hosted verification will be recorded here after the actual URL is opened.

GitHub backups are independent of release selection: automatic builds require a higher stable app version and changed deployable inputs against the last successful deployment. Documentation, specs, tests and source-art backups skip. Unexpected gate failures and unknown history skip; the first build is explicitly initiated. Canceled gate entries may still count toward Vercel quotas but do not upload another completed game. See [deployment policy](../DEPLOYMENT.md), including manual first-build and rollback instructions.

## Exact physical iPad checks still pending

1. Record actual eighth-generation hardware, iPadOS version, Safari versus Home Screen mode, build ID, orientation and case fitted. Confirm the proposed Safari/iPadOS 16.4 minimum against the real installed software.
2. Check cold/warm online loads, actual icon/Add to Home Screen installation, completed cache, airplane-mode/offline relaunch, every toy and all settings offline, cache eviction, failed update and multi-window waiting update. Browser storage can be evicted; permanence is not promised.
3. Use two and four real fingers, including simultaneous input from two people; add a fifth, lift in a different order, rest a finger on empty space, drag to every edge/outside the original object, rotate during drag, and inspect case-lip reach in both orientations.
4. Test all pause/exit/mute paths, device lock/unlock, app switching and interrupted gestures. Verify fresh/return silence, explicit adult music/SFX enable, actual output gain/comfort, mute during active audio, offline streaming and no queued return sounds. Desktop Windows WebKit cannot provide audio evidence.
5. Run a 60-second adult interaction trace per toy at maximum configured objects/contacts in both motion modes. Record active frame p50/p95/max and stalls, update/draw separately, input-to-render proxy, startup conditions and backing pixels. Compare against 33.4ms p95 frame / 8ms p95 update-draw targets; these remain unqualified on hardware.
6. Run an adult-only 20-minute soak plus 100 on-device scene switches. Check app-induced reloads, crashes, progressive slowdown, stuck input, repeated sound and retained resources. Desktop switching does not replace this soak.
7. Capture and inspect both orientations: every toy, locally stretched friend, two balls inside/removable from the bowl, selector, pause and scrolling/zoomed settings. Observe comfort, voluntary engagement and return preference separately, in private. No required play duration or performance score applies to a child.

Known limits: physical touch/thermal/memory/performance and actual Safari media behavior are unmeasured; full nonvisual Canvas interaction is not implemented; quiet background and small toy collection are intentional. Any further toy/content expansion should follow actual observations, with the current three-toy behavior preserved.
