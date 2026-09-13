# Penguin Bounce — approved fourth-toy extension

Status: implemented and automatically checked for **v0.1.1**; see [DELIVERY.md](DELIVERY.md) for final measurements and verified hosting. The three-toy v0.1.0 remains the historical baseline. This is an owner-requested addition, not evidence of player enjoyment or device qualification. Read alongside [SPEC.md](SPEC.md), [owner direction](OWNER-DIRECTION.md), [backlog](BACKLOG.md) and [roadmap](ROADMAP.md).

## Intent

A forgiving, penguin-themed bouncing board: touching the board adds a soft ball or changes a visible mechanism, then gravity and collisions produce an interesting local response. Broad gestures can influence the moving balls. There are no flippers to time, required aiming, correct answers, losing balls, gambling, score, currency or progression. Objects may settle and can always be played with again.

The penguin is an original painted sprite. Board geometry remains procedural, with a warm background, clear open routes, rounded pegs, two large movable deflectors and a collecting trough. Reuse the existing original ball sprites where visually appropriate. No existing show's characters, recordings or visual identity are copied.

## Normative extension requirements

| ID | Requirement |
|---|---|
| P01 | Add a fourth stable picture tile and startup/last-toy support while preserving the three existing toys' identities and relative order. Use a predictable two-by-two layout where it fits and a reachable single column on narrow screens. |
| P02 | A valid pointer-down on ordinary board space immediately adds a ball. A pointer-down on a visible mechanism immediately influences that mechanism instead. Broadly useful input must not require aim or an instruction sequence. |
| P03 | Holding still must not auto-repeat spawns. Swiping may apply a bounded local impulse. Four independently tracked pointers and every existing cancellation/pause path remain supported. |
| P04 | Two generously sized deflectors have visible state and broad hit regions, at least 72 CSS pixels where the layout permits. Turning them changes actual collision geometry. |
| P05 | Use deterministic fixed-step physics with capped catch-up, finite ball/peg/segment collision handling, bounded speed and correction, and no hidden-tab backlog. No physics-engine dependency is needed for this scope. |
| P06 | Parent settings offer 8, 16 or 24 maximum balls, default 16. Never exceed 24 balls or 24 local effects. At capacity, the next valid spawn reuses an existing ball immediately, preferring a settled one. No timer or loss condition blocks reuse. |
| P07 | Balls collect in a bottom trough and may rest on physically supported stacks or mechanisms. Rest must follow actual support, not an arbitrary screen-height cutoff; removing or turning that support wakes affected balls. Without further input the board must eventually settle and its animation scheduler sleep. No passive spawning or perpetual attract loop. |
| P08 | Gentle motion and system reduced motion use lower-energy movement and quiet local feedback. Playful mode adds clearly visible colored local collision lights and impact bursts, plus a small input-triggered penguin reaction that finishes naturally. Use brief smooth pulses; no full-screen flashes, strobing or rapid global light/dark changes. Pause freezes everything and mute remains immediately available. |
| P09 | Collision sounds use the existing explicit adult-enabled, rate-limited two-voice service. The new toy is fully usable silently; music remains independently optional. |
| P10 | Resizing/rotation preserves finite clamped state. Restored in-memory snapshots validate every number and count; invalid snapshots recover to a usable scene. Disposal retains no pointers, effects, callbacks or images. |
| P11 | Pure physics stays independent of React and DOM rendering so its useful mechanics can later be reused. Do not add a generalized game engine, plugin system or cross-project dependency. |
| P12 | Unit, production-browser, offline, asset-budget and build checks cover the fourth toy. An independent reviewer inspects actual rendered interaction and concrete failures are repaired before deploying the patch. |

All original privacy, autonomy, input, audio, update and performance requirements continue to apply. The entire four-toy toybox keeps the existing **200 KiB gzip JavaScript, 2 MiB initial transfer, 8 MiB complete offline payload, 24 MiB decoded-raster estimate and 2M canvas-pixel** caps. One new penguin sprite and one matching selector tile increase the non-icon raster inventory cap from eight to **ten**; this is a planned content allocation and does not relax the byte, dimension or residency budgets. Asset provenance and measured totals must be refreshed before release.

P07 was clarified during implementation after a dense stack extended just above the original trough-height cutoff and stayed awake despite physical support. Supported rest preserves the actual collision state; it does not teleport balls into the trough or force an active board asleep after a timer.

## Acceptance additions

| ID | Evidence required |
|---|---|
| T36 | Every ordinary tap can spawn/reuse immediately; hold does not repeat; mechanism taps change actual geometry. |
| T37 | Large and adversarial delta times, dense collisions and repeated input preserve finite bounded positions/speeds/counts. |
| T38 | Four-contact input, release/cancel ordering, pause/settings/selector, resize and scene switching preserve independent input ownership. |
| T39 | Both motion settings work, reduced motion overrides Playful, and the scene sleeps after the adult test workload settles. |
| T40 | Three ball-count settings, corrupted preferences and snapshot recovery retain usable state. |
| T41 | All four toy tiles/startup choices, portrait/landscape/phone settings layout and restored focus work. |
| T42 | Fresh and resumed sessions remain silent; enabled collision audio obeys the shared voice and rate limits. |
| T43 | Hosted exact-build assets, offline relaunch and safe waiting update include the fourth toy and its generated art. |
| T44 | Capture and inspect actual board screenshots plus dense-ball timing/resource measurements; physical eighth-generation iPad checks remain explicitly pending until performed. |

## Amendment: richer board and passive flow (LJ-20), 13 September 2026

Status: implemented on `codex/expressive-squish` for the next candidate; **not deployed**. The live v0.1.1 board keeps the original contract above until a reviewed release. See [DELIVERY.md](DELIVERY.md) for actual checks.

The latest owner review found the v0.1.1 board sparse, pale and passive: balls usually fell almost straight down, the penguin was a corner observer, and the screen went still when touches stopped. The owner explicitly asked for a continuous, bounded supply of balls with interesting physics and local lights even without tapping, with touch still influencing the flow. This amendment deliberately **replaces the input-only, eventual-sleep, no-passive-spawn direction of P07 and T39**, and extends P04, P06 and P08. Every other requirement, cap and budget above stays in force.

| ID | Amended requirement |
|---|---|
| P04 | Besides the two turnable deflectors, the board has three round pinball bumpers, one four-arm pinwheel, two funnel rails and a dense staggered peg field in six bright colours. A bumper returns a striking ball at a generous fixed speed, and a tap pulses nearby balls outward. Ball contact and taps spin the pinwheel with bounded spin that fades. Every mechanism keeps a broad touch target of at least 72 CSS pixels. A deterministic layout pass keeps a full ball passage (one diameter plus 8 CSS pixels) between every pair of mechanisms, using the full sweep of anything that turns. The same passage applies between each mechanism and each rail and wall, and between every peg and its neighbours, walls, rails and mechanisms. Mechanism sizes follow the available field so compact phone and landscape boards stay open. |
| P06 | Balls come in six colours, tinted from one painted ball sprite. At capacity a new ball, tapped or dispensed, first replaces the oldest ball resting in the trough. Otherwise it replaces the oldest settled ball, and failing that the oldest ball. The replaced ball leaves a brief soft ring where it was. |
| P07 | **Passive flow.** The penguin sits on a snow shelf above the board and drops one ball from a chute every 1.0 seconds in Playful, or every 1.8 seconds in Gentle and under system reduced motion. The first drop comes 1.6 seconds after entry. Flow runs for an attended window of 120 seconds after entry or the last accepted touch, and any accepted touch renews the window. Flow and the window advance only through stepped simulation time. Pause, settings, the selector, blur and a hidden page therefore stop the flow immediately, and a resumed frame cannot release a catch-up burst: at most one capped update of 8 fixed steps. When the window ends, flow stops and the mechanisms stop adding energy: bumpers behave like pegs and the pinwheel winds down within about a second. Balls then settle on actual support and the scheduler sleeps. Rest still follows real support; nothing is teleported or forced asleep by a timer. |
| P08 | Gentle keeps soft static halos at contacts and bumper glows that only fade. Playful adds coloured blooms, short rays and bumper lights. The penguin dips once, briefly, each time it drops a ball or is tapped; Gentle uses a smaller single dip. Contact lights share the 24-entry effect pool; each of the three bumpers also has one glow of its own that only fades. No light strobes or changes the whole screen. |
| P13 (new) | Tapping the penguin immediately drops one ball from its chute. The penguin's shelf is outside the physics bounds and never covers a ball. |

**Motion rule override.** Passive flow is deliberate, owner-requested activity without a touch. For Penguin Bounce only, it overrides SPEC section 7's rule that Gentle has no idle animation and Playful adds no unsolicited activity. Gentle, and system reduced motion (which always maps to Gentle), keep the flow at the slower pace with quiet halos and no rays. The flow starts only while the toy is open, ends with the attended window, and every stop path halts it at once. An adult setting to turn passive flow off would be a shared-shell change outside this lane; it is recorded in the handoff for coordination.

Acceptance amendments:

- **T39** now verifies four things. Unattended dispensing runs on a fixed pace. Paused or hidden play has no flow, simulation or animation frames, and returning produces no catch-up burst. The dense board sleeps after the attended window ends; a browser test steps every frame with a fake clock, and unit tests cover 42 layout, motion and input-cadence combinations. Mechanisms add no energy once unattended.
- **T36 and T38** cover bumper, pinwheel and penguin taps as well as deflectors.
- **T44** adds mechanism-clearance and peg-passage checks at six reference layouts.

Nothing here adds a score, target, required success, lives, gambling presentation or progression.

## Deferred content

Letters/numbers as optional playful images, cute dinosaurs/farm animals, owner-authorized animal calls, original musical phrases followed by instrumental space, and small collision-triggered character vignettes belong in the backlog. They do not gate this first physics patch. Any later musical participation remains optional and cannot stop or score play. Trains are exploratory rather than a committed theme.
