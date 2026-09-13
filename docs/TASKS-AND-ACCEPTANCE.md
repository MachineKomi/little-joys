# Little Joys — execution plan and acceptance tests

## 1. Execution order

This is a staged build sequence, not a promise that a given amount of work fits a particular number of hours. Implement the smallest end-to-end path early. Do not complete a large speculative architecture before testing the first touch.

### Stage A — runnable first slice

Create the separate Vite/TypeScript/React project, strict types, package lockfile, and minimal DOM shell. Implement the pointer router, bounded scheduler, silent default, pause, responsive canvas, and a genuinely locally deforming Squishy Friend. Add unit tests for coordinates, ownership, cancellation, and finite deformation before polishing the visual surface.

Deploy a preview when this slice builds and its available checks pass, provided deployment access exists. A one-toy preview must be labelled accurately; it is not the complete MVP. Use that first preview to inspect real-device touch and case-related reach before importing more art.

### Stage B — remaining toys and shared settings

Implement Bubble Pond with swept hit tests and no respawn-under-finger loop. Implement Roll & Nest with offset-preserving drags, generous release acceptance, visible removable nested balls, two-ball mode, and the optional tap-to-place control. Add the stable three-tile selector, validated persistent settings, motion modes, and optional bounded audio. Reuse the same services rather than duplicating per-toy event handling.

### Stage C — art, budgets, and delivery

Use the actual available image-generation workflow for the bounded asset list in `ASSETS.md`; procedural geometry remains procedural. Audit exports and remove unused files. Build the manifest/icons, generated service worker, complete precache, and safe update path. Add production budgets and browser tests. Confirm the app is static and makes no third-party runtime requests.

### Stage D — review and target-device gate

Run independent code, interaction, and visual review. Repair concrete findings. Record the actual physical iPad checks, or mark them pending. Deliver the runnable repository, deployment instructions, preview URL if actually deployed, build identity, test output, and an honest known-issues list.

## 2. Automated test matrix

Test IDs are stable references for implementation evidence. A test is not passed until it has run against the actual code.

| Test | Requirement mapping | Scenario and required result |
|---|---|---|
| T01 | G01, G03 | Fresh storage: first toy appears without input to a menu, is immediately touchable, and makes no sound. |
| T02 | G08, I01, I05, S04 | Start two separate character drags; release the first. The second continues unchanged. |
| T03 | I01, I03 | Start four accepted contacts and a fifth. The fifth cannot overwrite a tracked contact or later become a phantom drag. |
| T04 | I02, I08, S07 | Hold one finger on empty background and touch a valid object with another. The object remains controllable. |
| T05 | I04, I05 | Send `pointercancel` then `lostpointercapture` for one pointer. Cleanup occurs once logically, with no exception or unrelated release. |
| T06 | I04, U08 | During drag, resize, pause, switch toys, blur, and hide the page in separate tests. No pointer remains owned afterward. |
| T07 | I06, U08 | Repeat a known target hit at DPR 1, 1.5, and 2, with an offset canvas and after rotation. CSS-space targets are hit consistently. |
| T08 | S01, S02 | Touch/drag one side. That region moves visibly while the opposite side changes less; global scaling alone fails this test. |
| T09 | S03, S05, S06 | Apply repeated/opposing drags and a long resumed delta. Geometry remains finite, bounded, and visually valid; return behaviour matches the motion setting. |
| T10 | B01, B02, B03 | Send a movement segment whose endpoints are outside a bubble but whose path crosses it. The bubble pops once with local feedback only. |
| T11 | B04 | Hold a pointer inside a popped slot longer than its cooldown. No bubble or sound respawns under that stationary contact. |
| T12 | B04, B05 | Leave the slot after cooldown. The bubble becomes available again; a new crossing pops it. Empty-space initial contact can sweep into another bubble. |
| T13 | B06, U04 | Toggle three/six bubbles and test constrained viewports. No overlapping targets or unreadable miniature bubbles. |
| T14 | B07, G06 | Background while bubbles are waiting. Return does not simulate a backlog or produce unsolicited audio. |
| T15 | N01, N02, I07 | Grab a ball off-centre and drag beyond its old hitbox. Pickup offset is preserved and ownership continues. |
| T16 | N03, N04 | Drop just outside and just inside the acceptance boundary. Outside remains where released; inside settles after release, not before. |
| T17 | N05, N06 | Nest two balls, then independently retrieve each. Neither becomes hidden or inaccessible. |
| T18 | N07, I07 | Touch an owned ball with another pointer, then touch the free ball. The first is not stolen and the second can be grabbed. |
| T19 | N08 | In tap-to-place mode, select then place without dragging; select again to cancel. No double-tap or timeout is required. |
| T20 | G02, G04, G05 | Repeat the same input/state sequence and verify consistent responses. Complete an interaction sequence with no speech, correct-answer input, turn-taking, or permission action. Repetition and exit remain available. |
| T21 | G03, G07 | Persist an explicit mute, reload, then interact. No sound occurs; child-facing Mute never enables sound. |
| T22 | G03, G07 | Enable sound from the adult control; test denied/resumed audio context and rapid inputs. Audio failure never blocks play; voice/rate caps hold. |
| T23 | G06 | Pause during a sound and animation. Sound stops, scene freezes, and Resume produces no backlog. |
| T24 | G07 | Change motion preference and emulate system reduced motion. Effective Gentle mode has no overshoot, idle movement, or moving decoration. |
| T25 | U01–U07 | Browser tests cover 810×1080 and 1080×810 CSS viewports, plus 360×640 and desktop. Controls fit, do not overlap, and the adult page scrolls/zooms. |
| T26 | U06 | Keyboard and screen-reader-oriented DOM checks find labelled controls, visible focus, and a reachable parent panel/exit. Do not infer full canvas accessibility from this. |
| T27 | G07 | Corrupt local storage or make writes throw. Defaults/in-memory settings work without a blank screen. |
| T28 | D01, D02, D06 | Validate manifest, required icons, standalone configuration, and unrestricted orientation. Complete initial cache, then deny all network access. Reload and use every toy and settings. Offline status is truthful. |
| T29 | D03, D04, D05 | Fail one required file during a new-version cache install. Existing version remains usable. A successful update waits during active play and does not mix versions. |
| T30 | D06 | Simulate missing/evicted caches and storage rejection. Show accurate adult status; do not claim cold offline availability. |
| T31 | G10, D07 | Inspect the production request log and bundle. No analytics, third-party runtime URLs, generation calls, permission requests, or embedded secrets. |
| T32 | D07 | Asset/build audit verifies compressed, decoded-estimate, canvas, and object budgets. Missing optional art produces a deliberate procedural fallback. |
| T33 | I04, D05 | Rapidly change toys during delayed asset resolution. Stale loads cannot mount over the current toy or retain disposed scene resources. |
| T34 | G05, G09, G10 | Review visible copy and metadata. No treatment claims, developmental scores, streaks, guilt prompts, or identifying family information. |
| T35 | D08 | Delivery evidence includes the actual build ID and checked URL, or explicitly states that deployment was not performed. |

Use Vitest for geometry, state transitions, storage validation, lifecycle helpers, and bounded counters. Use Playwright for production app flow, DOM layout, screenshot review, offline/update scenarios, and synthetic input. Browser-injected/synthetic multi-pointer tests are useful logic checks but not proof of real iPad input handling. Retain the physical tests below.

## 3. Physical iPad checklist

Record the real iPadOS version, browser mode, build identifier, display orientation, and whether the rubber case is fitted. Do not infer these from a desktop user-agent override.

Test in Safari and the Home Screen web app. Verify a cold online load, warm load, successful full cache, offline relaunch, and each toy offline. Check that the icon is present and not a generic blank page. Verify sound remains off on a fresh session and can be enabled/muted only as designed. Test device lock/unlock and app switching while touching the screen.

Use two and four real fingers, including contacts by two people. Hold a finger on empty space while another manipulates a toy. Drag toward all play-region edges, release outside the object's original bounds, rotate while dragging, and lift fingers in a different order than they touched down. Check the thick case does not obstruct the main targets.

Run a 60-second adult interaction trace per toy at the designed maximum load; report frame interval distribution, stalls, and update/draw timing separately. Then run the adult-only 20-minute soak and 100 scene switches. These are engineering tests, not screen-time assignments for a child. Check for unexplained reloads, progressive slowdown, stuck pointers, repeated sound, and unreleased resources.

Screenshot both orientations, each toy, selector, pause, and parent settings. Visually inspect local deformation, the ball inside the bowl, target clarity, and empty-space use. Desktop screenshots cannot replace the real-device interaction check.

## 4. Builder/reviewer loop

After each meaningful slice, an independent reviewer examines the code, available test evidence, and rendered interaction. Give concrete issues and a technical delivery score, not an imagined developmental score:

**0:** does not function. **5:** recognisable demo with material gaps. **8:** the slice's specified requirements are met with supporting evidence and no known material defect. **9–10:** the same, with exceptional polish or robustness. An unavailable physical test is labelled **not tested**, never silently counted as passed. Fun and comfort for the intended child remain **unobserved** until an actual family playtest.

The builder repairs identified issues and returns evidence. Repeat up to four review/repair rounds. If material issues remain, list them and preserve an honest preview status rather than manufacturing a passing score or endlessly enlarging scope. A high visual score cannot override a privacy, input, or stability failure.

## 5. Required implementation handoff

Provide the runnable source and lockfile, `npm install`/`npm ci` instructions, development/build/preview/test commands, production build output information, asset provenance manifest, browser target, PWA/cache explanation, deployment instructions, and a requirement-to-test status table. Include an actual URL only when deployed and opened. Mark missing image access, pending iPad tests, failed budgets, and incomplete toys clearly.

Suggested scripts: `dev`, `build`, `preview`, `test`, `test:e2e`, `check:assets`, `check:budgets`, and `check`. The implementation must create and run these scripts before presenting them as working commands. No testing evidence is included in this specification pack.
