# Bubble Pond / Roll & Nest: second-look owner feedback

Recorded 13 September 2026. Sanitized product feedback from the owner's latest review; no personal identifiers or raw family observations are included. The restored local candidate was `v0.1.1-8f53112d4703`, but the owner did not state the displayed build, motion setting, sound setting or device in this message. Treat that build association as context, not an independently confirmed review identity.

**Current instruction: evaluate, capture, brainstorm and plan only.** Wait for the other implementation lane to finish before integrating/checking/deploying the current four-toy build. Further implementation, a team swap, or a new toy is a later choice informed by that playtest. See [design response](../NEXT-PLAY-DESIGN.md).

## Feedback ledger

| ID | Owner observation or suggestion | Strength / interpretation |
|---|---|---|
| BN-F01 | Bubble Pond is much better and now feels more like a toy. | Positive owner appraisal of the iteration; preserve the improvement. Not an observation of another player's engagement. |
| BN-F02 | It needs sound effects. | Clear request. Whether sound was enabled is unknown. Check discovery/playback separately from improving the sound itself. |
| BN-F03 | Popping needs more beautiful, satisfying effects. | Clear visual/tactile refinement request; current response works but remains modest. |
| BN-F04 | Bubbles should move, appear in more random positions and vary in size. | Requested directions to explore. Preserve broad, accessible targets while considering movement and size variation. |
| BN-F05 | Different colors or colored sparkles inside bubbles could add interest. | Suggested visual variations, not a requirement to implement every variation. |
| BN-F06 | A pop counter, quick successive pops/combos, or special rainbow bubbles might give play more interesting outcomes. | Exploratory mechanisms. Underlying request is meaningful variation and something to discover; numeric scoring or a speed gate is not a settled requirement. Preserve the original suggestions even if the recommended design differs. |
| BN-F07 | The background is soothing but still corporate, bland and insufficiently playful. | Preserve readability/comfort while developing a more appealing setting. Pastel color alone does not solve the art-direction request. |
| BN-F08 | Roll & Nest now rolls somewhat, mostly nests correctly, looks nice and functions. | Positive acknowledgement of current mechanics/presentation, with limited enthusiasm about the activity itself. |
| BN-F09 | A ball appears to jump to one particular place in the bowl, which feels odd. | Reported unnatural placement. Source does use fixed slots and a settle target; a literal single-frame jump has not been separately reproduced from this report. |
| BN-F10 | The activity still feels basic/bland: after moving a ball and putting it in a bowl, what happens next? | Central interaction-design concern. Technical correctness and attractive sprites have not answered it. |
| BN-F11 | Consider knocking a ball up, bouncing off the ground, catching it in the bowl, and different balls/bowls/colors. | Permission to explore a substantial reimagining, rather than only tune current friction. Catching is a proposed activity, not a required success condition. |
| BN-F12 | The owner is uncertain whether the intended player will be motivated and plans to observe. | Uncertainty, not negative child-playtest evidence. Keep actual voluntary-play observations private and separate. |
| BN-F13 | After combined deployment, agents could swap toys, continue their current toys, or explore a new toy. Observe which activities attract interest, refine those, and consider archiving/cutting others or making variants. | Broad strategic flexibility. This turn explicitly stops at planning; do not silently launch all options or remove toys now. |

## Current implementation versus the request

- **Sound exists but is rudimentary:** `src/core/audio.ts` supplies short sine-tone cues (440 Hz for bubbles, 320 Hz for nesting), behind adult enable and silent defaults. This does not establish that the reviewer heard them, nor that they sound like convincing pops. Audio discovery, actual mobile playback and timbre are three different work items.
- **Bubbles relocate only on return:** `src/toys/bubbles/scene.ts` and `geometry.ts` use a bounded safe-position search. Ready bubbles remain still and have one layout radius; densely packed six-bubble phone layouts can reuse the old location. The request for motion/size variety goes beyond the current implementation.
- **Burst effects have a finite presentation:** `presentation.ts` draws quiet local arcs in Gentle and expanding rings/droplets in Playful. There is no visual special-bubble behavior, numeric counter or combo system.
- **Nesting is deliberately slotted:** `src/toys/nest/scene.ts` assigns a released ball to a fixed target. Free Playful balls have release momentum, damping and collisions, but there is no vertical gravity, floor bounce, movable bowl or catch/eject loop. Gentle deliberately keeps direct quiet placement.
- The prior [delivery checks](../BUBBLE-NEST-DELIVERY.md) establish the scoped technical improvements. They do not close this new feedback or prove the toys are engaging.

## Routing

BN-F01–F07 feed proposed bubble work BNX-01–BNX-03; BN-F08–F11 feed BNX-04; BN-F12–F13 feed the combined-playtest and portfolio decision BNX-05–BNX-06 in [NEXT-PLAY-DESIGN.md](../NEXT-PLAY-DESIGN.md). These are recorded proposals and observations, not new release promises or changes to the normative runtime contract.
