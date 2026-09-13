# Next play design: discovery, bubbles and a bowl with a purpose

**Planning only, 13 September 2026.** Source: [second-look feedback](feedback/BUBBLE-NEST-SECOND-LOOK.md), [current scoped delivery](BUBBLE-NEST-DELIVERY.md), and existing owner direction/backlog. No runtime, art, sound, dependency, version or deployment changes are part of this design pass. `SPEC.md` and accepted amendments remain normative; proposals below do not silently replace them.

## Recommendation

First finish the current combined four-toy build, deploy it once with a visible version, and observe voluntary play. Keep current implementation ownership through that integration. Afterward, cross-review each other's toys before choosing another bounded sprint; a complete ownership swap is useful only when it addresses a concrete creative or technical problem.

My preferred next experiments are **a richer Bubble Pond** and **Bounce & Catch as a possible replacement interaction for Roll & Nest**. Start with bubbles because the latest owner feedback identifies a working foundation. Do not add a fifth toy before seeing the combined four. If a different kind of activity is needed afterward, a small original animal sound garden offers a more distinct experiment than another ball-physics board.

The design problem is that the current toys offer a readable action but too little variation in its consequences. Repetition can still be complete play; it need not become a task. The next iteration should make repeating, varying or combining simple actions produce perceptibly different responses, with no need to understand a rule first.

## Options explored before choosing

| Option | New play offered | Main question / tradeoff | Position |
|---|---|---|---|
| 1. Iridescent bubble workshop | Different bubble interiors, shell breakup, distinct soft pops and varied returns. | Does added material detail make the existing action satisfying enough? Low mechanic risk. | First bubble direction. |
| 2. A drifting pond | Large bubbles travel slowly after a touch; swipes create a local current. | Movement adds life but also moving targets and collision/respawn complexity. | Bounded Playful experiment after the material response works. |
| 3. Rainbow interactions | Several pops make one shared rainbow ripple; rainbow bubbles produce a different successor response. | Can the difference be understood without a counter or a timing challenge? | Prototype one visible interaction, not a reward economy. |
| 4. One enormous bubble | Remove the field of small targets: stretch or wobble one soap membrane and tap to burst/re-form it. | Could simplicity plus expressive material be stronger than increasing object count? Overlaps Squishy mechanics. | Alternative if the bubble field remains uninteresting; not another shipped tile now. |
| 5. Bounce & Catch | Knock balls upward, move a broad bowl underneath, catch, tip out and repeat. | Does the bowl become a useful object instead of a completion destination? Needs a different physics contract. | Preferred Roll & Nest reimagining. |
| 6. Remove the bowl: soft play mat | Balls roll over one squashy cushion or ramp and bump each other. | Avoids the artificial nesting rule, but risks duplicating Penguin Bounce and losing a distinctive object. | Fallback, not first choice. |
| 7. Animal sound garden | Three original animals respond to broad taps with a short action and optional sound; simple touch phrases can be repeated. | Would a character/music activity attract interest that object physics does not? Requires original art and verified audio. | Leading later new-toy candidate. |
| 8. Pour-and-tip basket | Hold or tip a basket to spill a few soft objects, scoop them back, change the pile. | Interesting containment play, but many objects and spill handling increase scope. | Park until the two-ball catch prototype proves useful. |

These are creative hypotheses, not claims supported by a trial of this product. The repository's [research rationale](RESEARCH.md) provides context and evidence limits; this pass adds no new literature review or efficacy claim. Adult appraisal is useful design evidence but cannot substitute for the intended player's voluntary choices.

## Bubble Pond: proposed next slice

### A concrete moment of play

Touch a peach-gold bubble: its skin dimples, breaks into curved iridescent fragments and a few pearl-like droplets, with a short soft pop if sound is enabled. A lilac bubble returns in another roomy part of the pond, containing a broad glint that looks different from the last one. Sweep through nearby bubbles: their ripples meet in a local rainbow arc. A rainbow bubble is already a possible starting bubble, so this response is an invitation to explore rather than an unlock.

Keep the first visible contact immediate. The shell breakup, successor variety and local ripple should read while silent. Favor a few carefully animated shapes over a shower of indistinct particles.

### Priority and proposed acceptance

| ID | Proposed work | Candidate acceptance / limits |
|---|---|---|
| BNX-01 | Sound discovery and material response | Verify a fresh adult enable on the actual mobile build, including mute, background and return. Replace the generic bubble tone with a small set of original/designed soft pop timbres, with subtly different body/air components. Keep shared voice/rate/gain caps and no queued sound storm. Music remains independent and optional. Silent default remains. |
| BNX-02 | Art, interiors, sizes and distribution | Use three coherent looks such as pearl, peach and lilac, plus a rainbow variant. Give each a distinct broad internal shape/glint rather than relying only on hue. Vary visual diameter within large-target limits; retain about 128 CSS px at reference iPad size and the existing 96 px minimum/layout fallback in six-bubble mode. Measure safe layout options on narrow phones rather than merely labeling a random search as variety. Preserve held-contact exclusions and first-contact pop behavior. |
| BNX-03 | One surprising interaction | Prototype a shared local rainbow ripple when several bubbles pop together. Slow single pops must also encounter every special bubble appearance; no special content requires a timed combo. Try this without a numeric HUD first. Optional bubble drift is a separate toggleable experiment within Playful, with a finite touch-triggered activity window; Gentle/system reduced motion keeps targets still. |

Art direction: an original illustrated water-play nook with luminous water, a warm reflected sky and a few softly painted edge details. Keep the central field clear and contrast the glass against it. Decorative objects inside the reachable play area should give a small meaningful touch response, or stay outside the focal play area; avoid a painted scene full of apparently tappable dead objects. This should feel like a place to play, not a turquoise dashboard.

Proposed art production is bounded: one small background layer and a compact bubble-interior/effect atlas if procedural drawing cannot achieve the desired finish. Generate purpose-made original art using the available tool's actual reported capabilities; retain recorded prompts/provenance and audit exports. Interactive shells, collision geometry and ripple motion remain procedural. No generation work starts in this planning turn.

For movement, test a slow drift around 8–18 CSS px/s after interaction, stopping after roughly 8–12 seconds without fresh input. Those are prototype starting values, not validated settings. Movement must not carry a ready bubble underneath a stationary finger and cause an accidental pop; stop/deflect before the exclusion region, and retain reliable swipe hit testing against moving circles. Keep targets separated and visible. On a crowded screen, reduce movement rather than shrink targets or add more objects. Do not add an unattended attraction loop to this toy as an incidental consequence of the drift experiment.

**Counter/combo decision:** preserve the owner's suggestion in the feedback ledger, but defer a numerical counter, multiplier and expiring streak. They introduce a success condition without necessarily improving the sensation. If a visible trace is useful, test a few colored ripples or stones that briefly compose a pattern and dissolve; no stored score, total to chase, locked effect or loss when play pauses. Compare that with no trace rather than assume more HUD is better.

## Roll & Nest: proposed Bounce & Catch experiment

### The repeating action

Tap a large ball and it makes a soft hop. Sweep or drag it to give it direction. Move a wide bowl along the lower part of the scene to catch it; a miss simply bounces back into reach. A ball caught in the bowl rocks/settles where the geometry places it. Tap the bowl to gently tip or bounce its contents back out. Catching can be interesting, but batting the balls around remains a complete activity by itself.

This addresses the fixed-slot feeling and supplies an answer to “what next?”: the bowl is a tool for catching, carrying and releasing. Different ball/bowl colors are finishing touches; they do not substitute for this loop.

### BNX-04 prototype contract

- Start with one ball and one broad movable bowl; retain the explicit two-ball option. Try a tap-to-hop on the ball and a broad floor-touch impulse toward the nearest ball, with immediate visual feedback. Cap impulses and combine dense input so two fingers cannot create explosive speed.
- Dragging a ball remains direct and first-claim owned. A second finger can move the bowl without stealing the ball. A caught moving ball can always be picked up immediately. Preserve the existing tap-place alternative; propose an equally visible tap-to-position bowl path rather than require precise dragging from every player.
- Use a side-view gravity/floor model with two simple ball bodies, kinematic bowl walls and a bowl floor registered to the artwork. Catch on real entry/contact, not proximity teleportation into two fixed slots. Keep a downward-entry rule for an airborne catch; held objects never disappear behind the bowl or fight simulated collision corrections.
- A moved bowl carries settled contents predictably, with bounded optional lag in Playful; no large impulse from a viewport resize or stale pointer. If two balls fit, let them settle from contact rather than reserve cosmetic target coordinates. Keep enough exposed surface to retrieve either ball.
- Floor misses, rim hits and partial catches give small local responses and stay recoverable. No losing a ball, depleted supply, fail sound, score, forced restart or obligatory catch. Test whether the bowl can be at least roughly one third of the usable width without blocking the rest of play.
- Tap the bowl to release contents locally at low capped speed. Keep the loop optional and legible; avoid hidden press-duration gestures or automatic repeated ejects. Distinguish bowl tap from bowl drag using the existing input lifecycle, and cancel safely.
- Gentle/system reduced motion retains visible direct manipulation, a single monotonic nest/placement response and still targets. Full free bounce/flight is Playful. The visual scene should remain appealing in either mode; do not silently change the default to show off the physics.

This is a proposed replacement of BN04/N03's current tabletop/release-only slot behavior, not a small friction patch. Before implementation, explicitly amend that contract, define bowl control and visual registration, and preserve a reversible baseline. First prove the hop/catch/tip loop with the current ball/bowl art in an isolated prototype; then improve the art if it supports the chosen interaction. Do not ship both old and new tiles merely to avoid choosing.

## Architecture and validation for a future sprint

Keep Vite/TypeScript/React shell plus imperative Canvas2D. Do not introduce a general engine, particle framework or per-frame React state. Bound state at the existing six bubbles, two balls, four pointers, 24 effect events and two audio voices. A special bubble replaces an existing slot; it never duplicates the population. Use bounded placement attempts and physics substeps, cached art preparation, no per-frame pixel readback/full-screen blur, and finite touch-response clocks. Plan event-level effects so decorative sub-shapes do not quietly become thousands of independent particles.

Preserve the current transfer, decoded-raster and canvas-backing ceilings. Measure the integrated build, the busiest new interaction in each motion mode, and real target-device behavior separately. Useful regressions include moving-circle swipe hits, held-contact drift exclusion, safe mixed-size layouts, no content locked behind fast input, coalesced drag release, cup rim/floor contact, two-pointer ball/bowl ownership, pickup from containment, pause/cancel/resize and offline/update. Render actual phone/tablet frames at difficult depths and effect peaks. Listening to enabled sound is necessary; an AudioContext counter alone does not establish a pleasant pop.

## What happens next, and who does it

| Stage | Work / decision | Boundary |
|---|---|---|
| Now | Save this feedback, alternatives and recommended plan; keep both completed/active branches backed up. | Documentation only. No code/art/audio/build-version changes and no new deployment. |
| Claude finishes | Confirm its final checkpoint and results; integrate both branches in one reviewable checkout. Reconcile shell files, docs, asset tiles and any unresolved shared settings requests. | Do not treat a running screenshot/audit job as completed evidence or overwrite its checkout. |
| Combined preview | Run combined checks, inspect current art/interactions and sound settings, publish one material stable patch and verify the actual Vercel URL/build and offline behavior. | These proposed Bubble/Nest expansions are not prerequisites for releasing the already-completed improvements. |
| BNX-05: voluntary play | Let the player choose and leave freely. If an adult enables sound/Playful, make that choice explicit and record it privately alongside the displayed build. | No prescribed session duration, prompting quota, forced turn, automated behavior telemetry or inferred engagement score. |
| Next design decision | Keep current owners for continuity; have each review the opposite two toys and name one concrete idea or concern. Then assign one bounded experiment, provisionally bubbles first and Bounce & Catch second. | Swap builders if the review reveals a useful new direction, not solely to manufacture competition. Ownership is a tool, not a commitment to keep every toy. |
| BNX-06: portfolio | Retain toys with voluntary repetition/return; refine toys whose attractive presentation leads into an awkward/shallow interaction. If an accessible toy is repeatedly passed over, consider parking it reversibly. | One short or uninterested session is not enough to declare a toy a failure. Archive/cut remains a later explicit decision; preserve source/art and private observations. |

Private notes can be very short: exact build/settings; which toy was voluntarily opened or revisited; what action was repeated or varied; where access failed; whether sound/motion appeared welcome; how play ended. Do not turn this into a test of speech, colors, counting, speed or cooperation. A short satisfying interaction is not a failure because another toy kept someone longer.

If observations support a new toy rather than another refinement, the recommended small alternative is **Animal Sound Garden**: three original friendly farm animals, large touch areas, short visible character reactions and optional verified animal sounds. A few taps can compose a small call-and-response texture without recording or expecting a human answer. All characters remain usable while silent. Letters, trains, feeding stories and a larger musical catalog stay separate options; do not combine them into a new giant feature pack.

Open design questions for after the combined playtest: whether drifting bubbles help or frustrate; whether special interiors/ripple combinations read without instruction; whether the movable bowl adds a useful action or too much coordination; whether simple sound-and-character play fills a missing interest. These are reasons for small reversible experiments, not reasons to delay the combined preview indefinitely.
