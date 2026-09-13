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
