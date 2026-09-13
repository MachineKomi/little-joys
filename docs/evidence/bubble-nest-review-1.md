# Bubble Pond / Roll & Nest — independent review 1

Reviewed frozen production build **v0.1.1-3c9d283721cb** at **127.0.0.1:4174** on 13 September 2026. Scope: only the Codex-owned Bubble Pond / Roll & Nest refinement and visible build label. Read source/spec/tests and diff from 34cc938 in the isolated bubble-nest worktree; no other lane's runtime or private material was inspected. The source remained unchanged during the mounted review.

**Verdict: changes requested, 7/10 technical preview score.** One material input-rate defect remains. Visual improvements are supported by actual renders, but final performance/regression/deployment and physical-device qualification are separate pending gates.

## P2 — fast coalesced samples discard Playful release momentum

`src/toys/nest/scene.ts:192–202` samples velocity only when elapsed is at least 4 ms; shorter valid samples zero both components. The runtime passes every coalesced sample through this method, so sufficiently frequent touch/pointer samples erase a valid fling rather than contributing to a bounded velocity estimate.

Mounted Chromium reproduction on the frozen production app: one contact starts on the free ball, an outer pointermove supplies eight coalesced events with 5 px displacement each, then pointerup occurs. With 8 ms sample intervals the first recorded rendered centre x=355.009 moved to x=430.648 after 150 ms; angle changed 0.625→1.571. With 2 ms sample intervals the rendered centre remained x=345 and angle=0.5 at both captures. Source speed cap is 700 px/s; the faster stream should retain bounded momentum instead of becoming a stationary release. This is synthetic mounted input logic evidence, not a claim about a particular physical device.

Retain the speed cap, cancellation and stationary-hold expiry. Accept valid positive intervals or aggregate short samples; add a regression through a coalesced event stream. Existing new scene tests use intervals of 30–120 ms and therefore do not cover this case. Evidence: `evidence.json` coalesced-release entries; `coalesced-8ms.png`, `coalesced-2ms.png`; exact harness `review.mjs`.

## Source, visual and mounted observations

- All 12 supplied ready/response PNGs were inspected. The painted bowl front lip now occludes nested balls convincingly at 810×1080, 360×640 and 1080×810; both balls remain well exposed for retrieval. The detached ball shadows and green halo are absent. The build label clears controls/captions in these samples.
- Independent tablet captures confirmed the distinction between held/free and nested rendering: `held-over-bowl.png` and `retrieved-over-front-lip.png` show a manipulated ball fully above the foreground; `two-nested.png` shows both balls behind the front lip, with distinct visible tops.
- Phone tap-place selection uses clear short corner marks (`phone-tap-selected.png`). Selecting, placing into the bowl, selecting the nested ball again and placing it at (90,160) worked. The nested selected ball retains visible upper markers (`phone-tap-retrieved-selection.png`).
- Independent actual phone pop capture closes the earlier supplied-capture gap: `phone-pop.png` has one burst and five intact bubbles. After 1.1 seconds with the original finger still held, five remained. Lifting the finger restored six and the RAF counter slept. On the densely packed phone layout the bubble reused its old position; roomy redistribution remains supported by source/unit evidence rather than this mounted sample.
- Mounted two-ball Playful release transferred motion to the second ball (its rendered x moved 501→581.167 in the 220 ms sample). Pause held the canvas unchanged for 200 ms; resume did not relaunch movement. A new drag followed by a 250 ms stationary hold released without stale momentum. Subsequent nesting/retrieval/cancel completed and slept.
- Native Windows WebKit with stored Playful plus system reduced motion produced a stationary free release: centre (365,396.92) and angle 0.75 remained unchanged across the sampled 200 ms window. Its bubble response was a quiet local ring/arcs without travelling droplets (`webkit-reduced-pop.png`), and returned to sleep.
- The visible label's actual centre hit-tests to CANVAS at 360×640. No page errors occurred. Both scenes retain finite effect clocks and fixed object/step caps; the rolling helper preserves fixed held bodies and caps speed/substeps. No new raster/audio dependency or React animation loop was introduced.

## Evidence limits and follow-up

The initially supplied phone response image hit empty water because its helper incorrectly assumed three phone bubbles; independent `phone-pop.png` now demonstrates the actual six-bubble layout. Root has separately corrected that helper. Full-suite results are owned by the builder; this reviewer did not rerun the suite or benchmarks. The added mounted momentum test's reported Pause selector failure is test evidence requiring rerun, not a product defect or a pass.

The existing Parents control exposes the two-second hold instruction only through title/accessibility text; its visible label says Parents. A small visible "Hold 2s" hint addresses the reported discoverability problem while preserving the existing gate. That proposed follow-up was not present in this frozen build and is not reviewed as delivered.

These observations use native desktop Chromium/Windows WebKit and synthetic pointer contacts. They do not establish real multi-touch, physical iPad performance, case reach, or enjoyment. This review does not qualify the other lane's Squishy Friend / Penguin Bounce work, any integrated release, or deployment.

All reviewer-owned browser contexts/processes closed; browser lane 4174 explicitly released before the builder's repair/tests/measurement. No server, production source or deployment was changed. The only writes are ignored review artifacts in this directory.
