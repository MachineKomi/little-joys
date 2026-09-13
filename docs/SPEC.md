# Little Joys — product and technical specification

Implementation-time owner refinements to the raster and music restrictions are recorded in [IMPLEMENTATION-NOTES.md](IMPLEMENTATION-NOTES.md). Requirement IDs and all autonomy, privacy, input, motion, and budget limits remain in force.

The owner has approved a fourth toy for v0.1.1. Its normative additions and explicit raster-count allocation are in [PENGUIN-BOUNCE-SPEC.md](PENGUIN-BOUNCE-SPEC.md). The sections below describe the three-toy v0.1.0 baseline; the extension preserves its shared privacy, autonomy and resource limits.

Subsequent phone feedback and prioritized refinements are recorded in [FEEDBACK-AND-REFINEMENTS.md](FEEDBACK-AND-REFINEMENTS.md). Its stronger squish, bubble-response, ball/bowl presentation and warmer-shell targets describe work still needed; they are not retrospective claims about the baseline or fourth-toy patch. The requested brighter, bounded Playful collision feedback is included in the current Penguin Bounce direction.

The current continuation sprint selects the stronger Squishy interaction in [EXPRESSIVE-SQUISH-SPEC.md](EXPRESSIVE-SQUISH-SPEC.md). Its SQ01–SQ08 requirements amend the small baseline stretch limit for v0.1.2 while preserving all shared limits. Delivery status remains separate from this implementation contract.

## 1. Product decision

Build a small, attractive touchscreen toybox, not a curriculum, a smaller maze game, or an autism treatment. Its promise is: **touch something, immediately change it, enjoy the result, repeat or leave freely**.

The initial audience is a preschool player who is beginning to use direct touch, finds remote controls and rule-heavy games difficult, and may use little or no speech. The product must work without reading, understanding an instruction, using a controller, or communicating in any particular way. This access profile does not specify intelligence or receptive-language ability.

The design starts from parent-observed preferences for face stretching and direct manipulation of on-screen objects. Preferences for bubbles, particular colours, creature designs, or sound have not been established. The three toys deliberately test distinct interaction hypotheses, rather than claiming to know which will be enjoyed.

The product's primary outcomes are voluntary enjoyment, a sense of control, comfortable access, and opportunities to play together. Candidate learning opportunities are predictable cause-and-effect, intentional touching and dragging, exploration of spatial relationships, and meaningful communication with another person during play. These are **design hypotheses**, not demonstrated developmental outcomes. The research rationale and limitations are in `RESEARCH.md`.

### Normative language and scope

**MUST** is a release requirement. **SHOULD** is a strong recommendation; an exception needs a recorded reason. **LATER** is deliberately outside the first version. Requirement identifiers below are the source of truth for implementation and tests. All numerical design settings are starting choices for this project, not clinically validated thresholds.

The complete MVP includes three toys, shared multi-touch input, a minimal toy selector, parent settings, silent operation, reduced-motion behaviour, responsive layouts, installable static-web delivery, verified offline caching, and the tests in `TASKS-AND-ACCEPTANCE.md`.

There is no account, cloud save, advertising, payment, runtime AI, camera, microphone, chat, speech recognition, diagnostic assessment, curriculum, level map, currency, daily streak, leaderboard, reward video, music soundtrack, or multiplayer networking. There is no real-time therapist dashboard and no automated inference about a child's state or abilities.

## 2. Non-negotiable experience rules

| ID | Requirement |
|---|---|
| G01 | Play MUST begin with a usable toy, not a login, lesson, tutorial, loading animation that must be dismissed, or required spoken instruction. |
| G02 | Continued play MUST NOT require speech, a sign, eye contact, a correct answer, taking turns, or waiting for permission from the app. |
| G03 | Every toy MUST be enjoyable without sound. Fresh installation starts muted. The child can mute at any time; only the parent settings page enables sound. |
| G04 | The same action in the same state MUST produce a consistent kind of response. No surprise novelty, automatic difficulty increases, random reward schedule, or escalating stimulation. |
| G05 | There MUST be no loss state, punishment, countdown, disappointed character, guilt about leaving, or reward for staying longer. Repetition is permitted indefinitely. |
| G06 | The child MUST be able to pause and leave a toy without completing an action or finishing a set. Leaving does not delete progress that must later be earned again. |
| G07 | Sensory and motor settings MUST be adult-controlled, explicit, persistent when storage permits, and change only at a safe interaction boundary. No automatically inferred “autism mode”. |
| G08 | Same-screen play MUST allow simultaneous independent input. No player identification, forced alternation, or assumption that different fingers belong to different people. |
| G09 | The app MUST NOT claim to treat autism, teach speech, improve IQ, deliver sensory integration therapy, or establish AAC readiness. |
| G10 | Public builds MUST NOT expose personal family information or contain tracking, runtime AI calls, embedded external media, or requests for device permissions. |

The visual direction is **a quiet background with a delightful, readable interactive object**. “Quiet” must not become faint, muddy, joyless, or hard to see. Strong silhouettes and generous spacing take priority over background decoration. Brightness and colour preferences must be observed rather than inferred from a diagnosis.

## 3. App flow and layout

### First launch and return visits

Open directly into **Squishy Friend** on the first launch. On later launches, open the last selected toy unless an adult has pinned a startup toy. No autoplay audio is attempted. A single static, non-verbal visual affordance may suggest touch; an animated instructional hand is not part of the MVP.

Use a compact, consistent DOM toolbar above the play region. It contains Toybox, Pause/Resume, and Mute; an adult settings control sits separately. The canvas occupies the rest of the available view. The child does not have to operate the toolbar to play. When already muted, the Mute control remains visibly muted and never turns sound on; sound is enabled in parent settings.

Toybox opens exactly three large picture tiles showing the actual toys. No carousel, scrolling collection, locked tile, or changing tile order. Selecting a tile closes the selector and immediately opens that toy. Switching toys cancels all previous touches and sounds. Keep each toy's small state snapshot for this app session, so switching away and back does not require a restart. Fresh app launches may reset toy state; there is no earned progression to preserve.

Pause stops toy simulation and sounds and shows a large, static Resume button. Toybox and parent settings remain reachable. Resume returns to the same toy state; no new effect is triggered merely by resuming. Entering settings or the selector pauses the toy underneath.

### Layout contract

| ID | Requirement |
|---|---|
| U01 | Support portrait and landscape without requiring an orientation lock. In both, the complete toy and controls fit the visible area. |
| U02 | At the reference iPad layouts, child toolbar targets MUST be at least 72 × 72 CSS pixels, with at least 12 CSS pixels between separate controls. Primary toy targets SHOULD be at least 96 CSS pixels across. These are project defaults, not evidence-derived prescriptions. |
| U03 | Keep essential targets at least 24 CSS pixels inside the usable play region, in addition to safe-area insets. Avoid dependence on reaching underneath a thick case lip or a browser edge. |
| U04 | At desktop, iPad portrait/landscape, and phone widths of at least 360 CSS pixels, controls MUST remain reachable without overlap. On constrained layouts reduce decorative space, not the main object's hit area. |
| U05 | The toolbar MUST not consume more than 20% of the visible height on the reference iPad in either orientation. Never stack a second large inventory/header above it. |
| U06 | Parent settings MUST use semantic labels, visible focus, keyboard-operable controls, a scrollable layout, and normal browser zoom. Do not apply `user-scalable=no` or a global maximum-scale restriction. |
| U07 | `touch-action: none` and selection suppression MUST be confined to the play surface. Parent controls and documents retain ordinary scrolling and zoom behaviour. |
| U08 | On resize or orientation change, cancel active pointers, recompute layout, clamp objects into the new play bounds, and redraw. No inaccessible objects or stale touch coordinates. |

Use the actual visual viewport and root element size rather than a fixed assumption about full-screen Safari. A `100dvh` layout with a reasonable fallback, safe-area padding, and `ResizeObserver` is appropriate. Device pixels are not CSS pixels. The physical tablet resolution is not the canvas's required rendering resolution.

Use text alongside icons in adult views. Child controls may use a recognisable icon with a short label. Do not assume an unfamiliar icon is meaningful just because it is large. The shell should be screen-reader navigable. Canvas interaction is not automatically accessible to every assistive technology; do not declare blanket WCAG conformance. The ball toy has the explicit drag alternative below; keyboard access to the shell is required even though controller play is not the target.

### Parent settings

Provide: sound enabled/disabled; SFX gain; motion setting; bubble count; one/two balls; ball control mode; startup toy; reset settings; and a compact technical status panel. Defaults are in section 8. No child-facing settings prompts.

The parent panel is opened by holding its control for two seconds, with a clearly labelled keyboard/assistive-technology alternative. Treat this as friction against accidental changes, **not a security or age-verification mechanism**. Changes apply while play is paused. Closing returns to the same scene.

The status panel shows build identifier, browser information, offline readiness, and whether diagnostic capture is enabled. It does not display a child ability score. A reset requires a plain confirmation in the adult panel; it does not remove browser permissions or promise to clear hosting logs.

## 4. Toy A — Squishy Friend

### Intent and first frame

A friendly, original, soft creature occupies roughly 55–65% of the shorter dimension of the available play area. It has a simple silhouette and a small number of face features that remain legible when stretched. The character is content at rest. There is no attention-seeking idle behaviour.

This is the first vertical slice because face manipulation is the strongest reported preference. It is a hypothesis about a suitable interaction, not an assumption that a new creature will be preferred to a familiar Nintendo character.

### Interaction contract

| ID | Requirement |
|---|---|
| S01 | Touching anywhere on the creature MUST immediately create a visible local response. Small accurate taps on the eyes or nose are not prerequisites. |
| S02 | Dragging MUST visibly pull the touched region in the direction of the finger, up to a bounded elastic limit. A whole-image CSS scale or moving the complete sprite is not an acceptable substitute for local deformation. |
| S03 | Releasing MUST return the affected region to rest. Gentle motion uses a single non-oscillating return; Playful motion may use one small overshoot. Neither mode shakes the camera. |
| S04 | Two or more touches on separated regions MUST produce simultaneous local effects. Releasing one must not release the others. |
| S05 | Stretching MUST remain bounded and finite under four opposing drags. The outline must not invert, cross itself visibly, detach from the face, or leave the play area. |
| S06 | Repeated tapping MUST remain immediately responsive without accumulating animations, escalating sounds, or making the creature appear hurt or distressed. |
| S07 | Touches on empty background MAY create one brief, low-contrast contact mark; they MUST NOT steal ownership of another touch on the character. |

### Implementation approach

Render a procedural deformable body in Canvas2D. Start with approximately 32 ordered contour anchors, a smooth closed path, and a local displacement field driven by the active grab positions. Bound local displacement to approximately 35% of the rest body's radius; this is a tunable visual constraint, not a physical simulation. Apply the corresponding bounded deformation to face anchors.

A radial-contour implementation or another small, stable deformation method is acceptable. Prefer a shape representation that cannot self-intersect; do not build a general soft-body solver. Use a local influence radius, not one global scale transform. There may be up to four local grab influences. A second touch inside an already owned tiny grab region must not take it over; it can claim a distinct nearby region or receive a harmless tap response.

The image model supplies the **character concept and visual reference**, not a finished deforming mesh. Translate the approved visual identity into procedural contours, shading, and reusable feature shapes. An attractive procedural character is preferable to a beautiful static bitmap that does not stretch convincingly.

No hats, feeding, inventory, facial-emotion quiz, photo upload, or full 3D face model in the MVP.

### Co-play and learning opportunities

Two people can pull different sides, imitate a tap, or explore separately. The software never demands cooperation. A parent can add a word such as “squish” or “stretch” when it feels natural, but the software does not wait for the word. Potential observations include whether the player repeats a deliberate action, anticipates its effect, or invites another person into the play. None alone establishes a developmental gain.

## 5. Toy B — Bubble Pond

### Intent and first frame

Three large, stationary bubbles sit in stable, widely separated positions over a plain pond-coloured background. There are no moving targets, swimming background characters, or automatic showers of bubbles. Bubbles are visually distinct from the background without needing flashing edges.

### Interaction contract

| ID | Requirement |
|---|---|
| B01 | A touch or a finger path crossing a bubble MUST pop it without requiring the finger to stop or lift. |
| B02 | Fast sweeps MUST use segment-versus-circle hit tests between input positions. Testing only the latest pointer position is insufficient. |
| B03 | Popping MUST produce a brief local change rather than a full-screen celebration. Multiple simultaneous pops must not multiply audio beyond the shared cap. |
| B04 | A popped bubble returns to its same slot after 900 ms of active play time, but only while that slot is clear of all active fingers. It never respawns under a stationary finger and auto-pops repeatedly. |
| B05 | Touching empty pond produces an immediate small ripple. A finger beginning in empty space can continue into a bubble and pop it. |
| B06 | Default count is three; the adult may select six. Slots MUST remain fixed within the current layout and must not overlap. |
| B07 | A pause, backgrounding, or scene switch MUST stop respawn time. Returning does not emit a burst of missed pops, ripples, or sound. |

Use a fixed pool of at most six bubble objects. A bubble state is `ready`, `poppedWaiting`, or `waitingForClear`; timers use the scene's active simulation time. A cleared slot can respawn only after the cooldown has elapsed and no finger remains inside its hit area plus a 16 CSS pixel clearance margin. A continuous sweeping finger may pop the same slot again only after it has genuinely left and the slot has returned.

Default bubbles are approximately 128 CSS pixels in diameter at the reference iPad size. In six-bubble mode, use a responsive layout with targets no smaller than 96 CSS pixels where possible. If the viewport cannot fit six appropriately sized bubbles, show three and explain the layout limitation in the adult panel. Do not quietly shrink targets into a precision task.

Gentle motion uses a brief static ring that fades; Playful motion may add a small expanding ring. No confetti. At most 24 shared transient effects exist across the active scene. Ripple/popping presentation should finish within roughly 300 ms. The first contact response is not delayed by the effect animation.

### Co-play and learning opportunities

Two people can pop separate bubbles simultaneously. A parent can copy the child's action and occasionally label “pop”, “big”, or “again”, without presenting a question or requiring an answer. There is no race and no scoring. The candidate learning opportunity is a particularly clear and repeatable relationship between touch, location, and effect.

## 6. Toy C — Roll & Nest

### Intent and first frame

One large ball appears near a large, open bowl. The task is readable from the objects themselves, but putting the ball in the bowl is optional: simply moving the ball remains valid play. The first layout uses a short travel distance and an oversized receiving area.

The ball does not disappear when placed in the bowl. It remains visible and can be taken out again. This deliberately makes “in and out” repeatable without reset buttons, rewards, or waiting for a new round.

### Interaction contract

| ID | Requirement |
|---|---|
| N01 | Touching the ball grabs it immediately with a generous invisible hit margin. Preserve the pickup offset: the ball must not jump so its centre is suddenly under the finger. |
| N02 | While grabbed, the ball follows the pointer directly, including outside its original bounds. It MUST NOT require a flick, aim calculation, launch gesture, or physics-based throw. |
| N03 | Releasing outside the receiving region leaves the ball where it is, clamped to the play area. There is no failure sound or forced return to the start. |
| N04 | Releasing within the bowl's generous drop region gently settles the ball into an available resting slot. No snapping while the ball is still held. |
| N05 | A nested ball MUST remain visible and grabbable. Reversing the action is always possible, without a reset or loss. |
| N06 | Parent-selected two-ball mode MUST permit independent simultaneous drags. Either ball fits either resting slot; colour is not a correctness rule. |
| N07 | A pointer owning one ball MUST NOT have that ball stolen by a second pointer. Contact with an owned ball must not block a different free ball. |
| N08 | Provide a parent-selected drag alternative: tap a ball to select it, then tap a destination to place it. Default remains direct drag. Show the selected state clearly; use no timer or double-tap requirement. |

At reference iPad size, use a ball diameter of at least 112 CSS pixels and an additional 20 CSS pixel grab margin. The bowl opening is at least 2.5 ball diameters wide. Initial ball-to-bowl travel should be short enough to fit comfortably within the central play region; use approximately two ball diameters as the starting gap.

Implement drop acceptance using a simple visible bowl opening plus a 24 CSS pixel exterior tolerance. Document the actual geometry in code and tests. Two nested balls use separate slots so neither becomes hidden or impossible to grab. There is no collision engine: balls may overlap while held, but neither can permanently cover the other when released. Resolve an obstructing resting overlap with a small, predictable separation after release, never by moving a held ball.

Render the bowl back, then the ball, then a shallow front rim. The front rim must not obscure most of a nested ball. Use one small local visual response to nesting, optional soft SFX, and no scoreboard. The resting ball itself is the result.

In tap-to-place mode, allow at most one selected ball at a time, with an explicit visible selection. This alternate control supports shared sequential play, not simultaneous two-selection placement. Multi-touch direct drag is the co-play default. Tapping the selected ball again deselects it.

### Co-play and learning opportunities

One person can move a ball in and the other move it out, or use two balls in parallel. This must emerge from play, not a turn-taking rule. A parent can map words to an ongoing action: “in”, “out”, “up”, “down”. A separate real-world ball-and-container activity can test whether interest extends off-screen; it is not assumed to transfer automatically. Use ordinary age-appropriate large play objects, not small loose parts.

## 7. Sensory behaviour, communication, and stopping

### Sound

Sound is optional supplementary feedback. There is no background music, spoken instruction, automatic naming, character chatter, or voice synthesis in the first version. Use at most one short, consistent SFX per toy. Enable it only from an adult gesture and never replay failed or queued sounds later.

At most two SFX voices may overlap. Use a shared minimum interval of 150 ms between new SFX starts; visual feedback still responds to every valid action. Default enabled gain is 0.15 with an adult range of 0 to 0.30. Gain numbers are digital implementation settings, **not safe sound-pressure guarantees**; device volume and the listening environment remain relevant. Avoid sharp transients. Muting stops active sounds immediately with a very short fade to avoid clicks.

### Motion

The setting has exactly two options: **Gentle** and **Playful**. Gentle is the default. Also respect `prefers-reduced-motion`: when the system requests reduced motion, effective mode is Gentle regardless of the stored Playful preference, and the adult panel explains why.

Gentle removes idle animation, bouncing overshoot, moving backgrounds, particles, and expanding rings. Direct manipulation remains visible. On release, the character returns once without oscillation; balls can settle with a short monotonic movement. Playful adds only bounded action-triggered motion, never unsolicited activity. Neither mode flashes, flickers, rotates the camera, or uses screen shake.

### Communication and autonomy

No custom AAC system is included. Preserve access to the family's existing communication approaches outside the toy. Do not require successful toy use before AAC access, and do not turn “more” into a button that must be pressed to unlock the next effect. General AAC guidance and its distinction from entertainment screen time are documented in the research, not presented as a new app therapy [R02].

Do not infer distress from one movement, silence, or repetitive action. Adult observation and the child's familiar communication are the basis for stopping or changing the experience. The product should allow the adult to join without directing every action. A child can enjoy solitary or parallel play without progressing to reciprocal play.

## 8. Configuration and defaults

```ts
export type ToyId = 'squishy' | 'bubbles' | 'nest';
export type MotionMode = 'gentle' | 'playful';
export type BallControl = 'drag' | 'tap-place';

export interface SettingsV1 {
  schemaVersion: 1;
  soundEnabled: boolean;             // false
  sfxGain: number;                   // 0.15, clamped to [0, 0.30]
  motion: MotionMode;                // 'gentle'
  bubbleCount: 3 | 6;                // 3
  ballCount: 1 | 2;                  // 1
  ballControl: BallControl;          // 'drag'
  startupToy: ToyId | 'last';        // 'last'; first launch => 'squishy'
  lastToy: ToyId;                    // 'squishy'
  diagnosticsEnabled: boolean;      // false; no network export
}
```

Validate all settings on read. Ignore unknown fields, clamp numbers, and recover from invalid JSON. Storage failure must produce a working in-memory session, not a blank screen. Do not store child names, age, diagnosis, voice, raw touch paths, or inferred abilities. Toy snapshots are in-memory only in the MVP. The selected toy and explicit adult settings may persist.

## 9. Architecture decision

Use **Vite + TypeScript + React for the DOM shell + a small imperative Canvas2D runtime for toys**. This retains the existing project's tooling familiarity while keeping pointer movement and rendering outside React state. The inspected Maze-o-Puzzle package already uses React, Vite, TypeScript, and Vitest [R26]. The new project does not need its maze engine, Tauri wrapper, game progression, or large asset library.

This is a choice for the specified scope, not a benchmark proving that React or Canvas2D is universally fastest. The dependency cost is acceptable under the explicit budget below. Avoid adding Pixi, Phaser, Three.js, a physics library, a global state library, or a game-engine abstraction before a measured requirement justifies it. Do not implement a plugin marketplace, ECS, scene graph framework, or asset server.

### Suggested structure

```text
src/
  app/                 App.tsx, Toolbar.tsx, ToyPicker.tsx, ParentPanel.tsx
  core/                runtime.ts, pointers.ts, audio.ts, assets.ts
                       settings.ts, coordinates.ts, diagnostics.ts
  toys/squishy/        scene.ts, deformation.ts, render.ts
  toys/bubbles/        scene.ts, geometry.ts, render.ts
  toys/nest/           scene.ts, geometry.ts, render.ts
  pwa/                 registration.ts
  styles/              base.css
public/
  assets/              only approved runtime exports + asset-manifest.json
  icons/               192px, 512px, and 180px Apple touch icon
  manifest.webmanifest
scripts/               asset-audit.mjs, build-sw.mjs, budget-check.mjs
tests/                 unit tests and browser tests
```

The service worker is emitted into `dist` after Vite builds. Keep the source implementation outside `public` if it requires manifest substitution.

### Component responsibilities

React handles selection, settings, focus, pause state, and lifecycle. The runtime owns a single active toy and a single animation scheduler. The pointer router owns pointer tracking and capture. The audio service owns one lazily created audio context and bounded SFX voices. The asset loader owns approved images and releases scene references on disposal. Diagnostics are an opt-in local technical tool, not an analytics service.

Use a small explicit scene interface rather than passing React events into every toy:

```ts
export interface ToyScene {
  readonly id: ToyId;
  resize(view: { width: number; height: number }): void;
  pointerDown(p: ToyPointer): void;
  pointerMove(p: ToyPointer): void;
  pointerEnd(id: number, reason: 'up' | 'cancel'): void;
  cancelAll(): void;
  update(dtSeconds: number): boolean; // true only while another frame is needed
  render(ctx: CanvasRenderingContext2D): void;
  snapshot(): unknown;                // JSON-safe, tiny, no resource references
  dispose(): void;
}

export interface ToyPointer {
  id: number;
  x: number; y: number;              // CSS-space scene coordinates
  previousX: number; previousY: number;
  timeMs: number;
}
```

The runtime factory provides current settings and bounded services to the scene. It validates each toy snapshot before restoring it. These interfaces illustrate boundaries; implementations can refine types without changing requirements. Do not use `unknown` as a reason to omit validation.

### Input contract

| ID | Requirement |
|---|---|
| I01 | Track up to four concurrent pointer IDs. Do not reject valid touches because `isPrimary` is false. Mouse input also works for development. |
| I02 | Use Pointer Events with pointer capture on accepted play-surface pointerdown. Distinguish pointer tracking from object ownership: a finger on empty background must not reserve an unrelated object. |
| I03 | A fifth pointer MUST be ignored safely for the duration of that contact; it cannot overwrite an existing pointer or become a phantom drag when another finger lifts. |
| I04 | `pointerup`, `pointercancel`, `lostpointercapture`, blur, page hiding, pause, scene change, and resize MUST release relevant ownership. Cleanup is idempotent. |
| I05 | Release or cancellation of one pointer MUST NOT clear other active pointers unless the entire scene is being paused or replaced. |
| I06 | Coordinate mapping MUST use the current canvas bounding rectangle and logical CSS dimensions. DPR must not multiply logical touch positions. |
| I07 | Object ownership is first-claim until release. Preserve grab offset and route movement to the owning object even after leaving its original hitbox. |
| I08 | Do not use pressure, contact area, or the first finger as a supposed reliable child/parent or palm classifier. A resting contact must not disable later valid contacts within the four-pointer budget. |

Process geometry changes promptly in handlers and request a render for the next animation frame. For Bubble Pond, keep the previous logical position for each pointer and test each received path segment; optional coalesced events must be feature-detected. Do not depend on their availability. Do not save raw paths beyond the brief input handling needed for the current interaction [R11, R12].

### Rendering and timing

One `requestAnimationFrame` scheduler controls the active scene. Mutable toy state must not trigger a React render per pointer event or per frame. When the scene has settled and no timed event is pending, the scheduler sleeps. For a pending bubble respawn, a bounded wake-up timer may request the necessary frame rather than running a continuous idle loop.

Clamp resumed frame deltas and use a stable deformation return method. Prefer an analytic/exponential return or fixed time steps with a capped catch-up count. No accumulation of hidden-tab time. Dispose timers, frame requests, image references, event listeners, and audio nodes on lifecycle changes.

Use an opaque 2D canvas where appropriate and reusable drawing data. No per-frame pixel readback, full-screen blur filters, video textures, or huge layered canvases. The browser documentation supports these as relevant performance considerations; actual performance still needs measurement [R13].

### Audio lifecycle

Create or resume audio from the explicit adult enable gesture. Browser autoplay policy must not be fought with repeated retries. Suspended or unavailable audio means silent play, not an error modal. Pause/mute/backgrounding cancels current voices; no queued sounds fire on return. An audio-enable failure leaves a clear silent status in parent settings [R14].

## 10. Performance and device contract

Target hardware is the family's eighth-generation iPad. Apple specifies an A12 chip and a 2160 × 1620 panel [R19]; the 3 GB RAM figure is parent-provided, not independently measured here. Safari/iPadOS 16.4 or later is the **proposed minimum software baseline**, not a claim about what is installed on the tablet. Confirm the actual version during the first physical-device check.

Vite's browser target controls JavaScript transformation, not universal API polyfills. Set an explicit Safari-compatible target and avoid depending on unsupported optional APIs [R17]. Do not require WebGPU, OffscreenCanvas, device-memory reporting, orientation locking, haptics, or SharedArrayBuffer.

### Proposed budgets — all unmeasured until implementation

| Measure | Target / gate | How to verify |
|---|---|---|
| First-interaction critical transfer | At most 2 MiB compressed, including initial art | Production network trace; exclude later background precaching but report it separately |
| App JavaScript | At most 200 KiB gzip, including React shell | Production build report |
| Complete offline payload | At most 8 MiB transferred static assets for all three toys | Generated precache and asset audit |
| Decoded resident raster estimate | At most 24 MiB for active assets | Sum `width × height × 4`; label as an estimate, not total browser RAM |
| Texture dimensions | No runtime raster edge over 1024 pixels; most 256–512 | Asset audit |
| Canvas backing store | At most 2,000,000 pixels; DPR cap 1.5 | Runtime debug output and resize tests |
| Animation | Target 60 fps; active-window p95 frame interval at most 33.4 ms on target iPad | 60-second adult-run trace per toy; report actual distribution and stalls |
| Update + draw work | Target p95 below 8 ms while active | Instrument these functions separately; do not call this total display latency |
| Input responsiveness | Each accepted input changes state immediately and appears in the next scheduled render; investigate events exceeding 50 ms input-to-render completion | Instrumented proxy plus hands-on observation; not a measured touch-to-photon claim |
| Cold startup | Goal: first toy actionable within 3 seconds on a documented 10 Mbps / 50 ms RTT test profile | Record network, device, build, and cache conditions; not a universal internet guarantee |
| Bounds | Four pointers, six bubbles, two balls, 24 transient effects, two audio voices | Assertions and stress tests |
| Stability | No app-induced reload/crash/stuck input in a 20-minute adult soak and 100 scene switches | Physical iPad evidence and bounded-resource counts |

Calculate the backing scale as the smallest of actual DPR, 1.5, and `sqrt(2_000_000 / (cssWidth * cssHeight))`. Resize the backing store only when layout changes, and restore the drawing transform after resizing. One two-million-pixel RGBA buffer is approximately 8 MB before other copies; compressed file size alone is not a memory budget. The 24 MiB estimate does not cover all browser allocations.

The physical iPad gate is mandatory before saying “validated on iPad”. Playwright's WebKit is valuable for automation but is not the actual Safari browser or an A12/3 GB hardware simulation [R21]. When the device is unavailable, release status is **preview; target-device validation pending**. Never invent a memory reading from an unsupported browser API.

## 11. PWA, offline behaviour, and Vercel

Build a static site with Vite and publish `dist` to Vercel. Use `npm run build` as the build command. Keep navigation in app state rather than requiring server routes. Do not add a blanket rewrite that returns HTML for missing JavaScript, images, or service-worker files. Vercel's Vite integration is the relevant deployment path [R18].

### Delivery requirements

| ID | Requirement |
|---|---|
| D01 | Include a valid manifest, neutral app name, `display: standalone`, root scope/start URL, 192/512 icons, and an Apple touch icon. Do not set a restrictive orientation. |
| D02 | After a successful initial online install/cache, all three toys and settings MUST work offline. Adult status must not say “offline ready” before the complete current-version cache verifies successfully. |
| D03 | Generate a versioned precache manifest from production build outputs. Installation must fail cleanly if a required response is missing or invalid; the previously working version remains usable. |
| D04 | Do not force `skipWaiting`, a reload, or activation of a conflicting app version in the middle of play. New versions apply at a controlled adult-approved safe state or a later clean launch. |
| D05 | Use build-specific cached responses so the running HTML, scripts, and asset manifest remain consistent. Do not evict assets still needed by an active older client. |
| D06 | Cache/storage failures MUST degrade to online or in-memory play with an adult-readable status, not a broken toy. Never promise offline permanence. |
| D07 | All runtime images, fonts if any, and audio MUST be local same-origin files. No analytics or third-party assets. Generated art is committed/exported once, not generated during every install or build. |
| D08 | Publishing the spec does not count as deployment. A delivery report may claim a live deployment only when the actual URL was opened and checked. |

Use a small build-generated service worker rather than a broad caching policy. During installation, fetch and verify the current-version shell and approved runtime files into the new cache; complete readiness only after all required entries exist. During play, the active worker serves its matching version. Keep the previous cache until no old client depends on it, or conservatively retain one previous version within a doubled, explicitly reported cache budget. Avoid a cache policy that fetches a new index document while preserving old unversioned images.

A cold start without an internet connection before the first successful cache is not supported. Browser storage can be evicted, and requests to persist it are not guarantees [R15, R16]. Explain installation through Safari's Add to Home Screen flow; the precise menu wording depends on installed iPadOS [R20]. No push notifications are required.

Provide a concise deployment README, browser target, package lockfile, build identifier, and a rollback note. No additional paid services are required by the proposed architecture beyond whatever hosting and development tools the owner already uses; this is not a statement about current plan limits or charges.

## 12. Privacy, security, and project separation

Keep the app static and self-contained. No child profile, cookies for analytics, remote behavioural logs, session replay, uploaded recordings, or hidden tracking pixels. Normal hosting requests and provider logs still exist; do not describe the service as collecting literally no information anywhere.

Use a restrictive content security policy compatible with the actual production build, local assets, and any chosen inline-style implementation. Deny unused camera, microphone, and geolocation capabilities where supported. Test the real policy; do not paste a policy that silently blocks the app's own rendering or service worker.

No secret belongs in a `VITE_` variable or shipped bundle. Art-generation credentials remain in development-only environment configuration and must not be committed. Runtime builds must succeed without generation credentials.

The only persisted user configuration is the validated settings object. Optional technical diagnostics are off by default, local, bounded, and limited to build/browser information, frame summaries, resource counts, and error codes. Do not record coordinates, identity, audio, inferred emotions, or clinical scores. Export occurs only through an explicit adult action.

Reuse selected owned artwork as documented in `ASSETS.md`. Copy neither the full source-art archive nor the entire Maze-o-Puzzle asset folder into this site's public output. Do not alter that existing repository. Source assets, private observations, and research transcripts stay outside public runtime assets; keep private family notes outside any public repository altogether.

## 13. Definition of done and deliberate exclusions

The complete owner-amended MVP is done when all mandatory requirements are implemented, all specified automated checks pass, all four toys (including the approved [Penguin Bounce extension](PENGUIN-BOUNCE-SPEC.md)) have been visually reviewed, the offline/update flow works, and target-device evidence is recorded or explicitly marked pending. A preview may be useful before the hardware gate, but it is not a verified full release.

Technical correctness and perceived visual quality can be independently reviewed. Actual enjoyment and comfort for the intended child are unknown until observed. A reviewer must not score imagined enjoyment as a tested fact.

**LATER, only after observations justify them:** finger-trail frog hopping without timed failure; wipe-to-reveal pictures; a two-person musical surface with optional sound; a small collection of different squishable characters; familiar-object matching; or communication supports chosen with the family's speech and language therapist. Add one meaningful variation at a time. Never automatically turn a liked repetitive toy into a more demanding task.

The owner explicitly approved the fourth toy. Keep this four-toy product small enough that refining a chosen interaction takes priority over adding further toys without evidence or a new scope decision.
