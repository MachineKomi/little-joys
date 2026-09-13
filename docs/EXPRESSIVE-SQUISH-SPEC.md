# Expressive Squishy Friend — v0.1.2 sprint

Selected 13 September 2026 under the owner's instruction to continue the highest-priority refinements. This implements the stronger local manipulation and release-response portion of LJ-13. The current original painted character remains the visual identity. Private play reports stay outside public source; no enjoyment or developmental result is inferred from this sprint.

## Visible change

The v0.1.1 friend limits every pull to 0.35 rest radii and has only a short monotonic release. Larger deliberate pulls should visibly stretch the touched side, curl, belly or face while the opposite side remains more stable. Gentle releases once toward rest; Playful adds one elastic rebound and a small input-triggered body response. No timed goal or special gesture is introduced.

## Requirements and evidence

| ID | Required behavior | Acceptance |
|---|---|---|
| SQ01 | Materially larger local deformation, retaining the painted design. | At a standard side pull, achieve at least 0.65 radii of nearby mesh displacement where layout space permits (versus the old 0.35 input cap); compare actual phone and tablet renders against v0.1.1. Far-side movement remains less than one third of nearby movement. Whole-image scaling is insufficient. |
| SQ02 | Stable elastic geometry. | Up to four simultaneous influences, finite coordinates, every triangle retains at least 30% of its rest signed area, and the complete mesh stays inside the play boundary with a 24 CSS-pixel inset on supported layouts. Verify crossings, opposing pulls, repeated interactions and intermediate returns. Use bounded work, not a general physics engine. |
| SQ03 | Broad, continuous pickup. | The current visible deformed surface is grabbable, including stretched edges and features. Use the rendered geometry to map a new contact to the material. Preserve independent ownership and harmless nearby/extra contacts. |
| SQ04 | One bounded release response. | Gentle has a non-oscillating local return. Playful may cross rest once with a small overshoot and one small body response; complete response ends within 1.2 seconds of the last release. Repetition replaces bounded state; it cannot create an animation queue. |
| SQ05 | Every cancellation is respected. | Pause, selector, settings, blur, backgrounding, resize, pointer cancellation and disposal release ownership without creating a new playful impulse. No updates or sound while paused/hidden. New input works during return. System reduced motion remains Gentle. |
| SQ06 | Existing access and resources remain. | Four toys, silent defaults, optional bounded audio, offline/update/version rules, one visible Canvas/RAF, six shared sprites and existing payload/backing budgets remain. One scene-owned preparation surface of at most 768×768 RGBA (2.25 MiB) is allowed to eliminate near-opaque alpha seams; it is released on scene disposal. Count it alongside decoded shipped rasters under the existing 24 MiB budget. Only Squishy behavior is changed. Measure both Squishy motion modes and compare active render cost. |
| SQ07 | Deliberate face treatment. | Evaluate larger facial-region deformation in actual renders. Separate raster face/eye/body cutouts are a candidate technique, not a mandatory asset change: select them only if a reviewed result preserves the existing identity and improves expression without seams or duplicated features. Record the technique actually shipped and any remaining limitation. |
| SQ08 | Honest delivery and continuation. | Add meaningful geometry/interaction regressions, run the complete production checks and independent review, record exact measurements and coverage, back up sanitized docs, and deploy only the checked material version. Physical iPad validation and private voluntary observations remain pending. |

## Amendment: whole-body response and regional material (LJ-22), 13 September 2026

Status: implemented on `codex/expressive-squish` for the next candidate; **not deployed**. See [DELIVERY.md](DELIVERY.md) for actual checks.

The latest owner direction asks for stronger, independently expressive regions and for the whole friend to recoil, swing and bounce off the edges after a pull. The short bounded rebound above does not satisfy it. This amendment revises SQ02, SQ04 and SQ05 and adds SQ09 to SQ11. Multiple or addable friends were a tentative idea; they are **not built** in this slice.

| ID | Amended or added requirement |
|---|---|
| SQ02 | The painted silhouette stays inside the play boundary with a 24 CSS-pixel inset through deformation, whole-body travel and holding. The silhouette is a 24-point outline traced from the shipped sprite's alpha; it follows the deformed mesh and the pose. When the friend rests against an edge, only the texture square's transparent margin may reach past the inset. A pull toward an edge keeps only the share of its deformation that still fits. Positive-area and finite-geometry guards are unchanged. |
| SQ04 | Gentle and system reduced motion keep the quiet, non-oscillating local return with no body travel. Playful keeps the single-crossing local return and adds one whole-body response per release. A pull slings the friend opposite to the finger's pull, at a speed proportional to that pull, capped at 1,600 CSS pixels per second, with a small hop. The body then travels on a soft home spring, squashes against any play-area edge it reaches, leans slightly into its motion, sways like jelly and returns home. A release after little finger travel is a poke, even on a part still springing back: a short squash along the tap axis and a small sway. Each response hands over to a quiet settle after 2.3 seconds and ends within 3.6 seconds of its release. A new release replaces the response; nothing queues. |
| SQ05 | Unchanged, and now also applied to body motion. Pause, the selector, settings, blur, backgrounding and pointer cancellation turn any whole-body response into a monotonic settle with no overshoot and no new impulse. Resize returns the body home at once. |
| SQ09 (new) | Regional material. A pull's influence width and reach depend on where the friend is touched, using feature centres measured on the shipped sprite. The curl draws out like a long soft tail, with a narrow influence and a reach of 1.5 radii. Cheeks squish wide, with an influence of 0.72. An eye stretches tightly, at 0.3. The feet stay stubby, with a reach of 0.85. The rest of the body keeps the original broad squish, at 0.52 with a reach of 1.1. Far-side stability (SQ01) still holds. |
| SQ10 (new) | Catch. Touching the friend while it travels catches it where it is. Travel stops, and lean, sway and squash relax without a snap. Every finger maps through the current body pose, so pickup and pulls land on the actual moving surface. Once the pose relaxes under a still finger, nothing moves and the animation scheduler sleeps, as SPEC section 9 requires. |
| SQ11 (new) | Rendering cost. Whole-body travel, lean, sway and squash are one affine transform. The triangle mesh draws only while the painted surface is locally deformed, so a travelling friend at its rest shape costs one image draw. |

Verification additions: body-motion unit tests (squash at edges, capped launch, catch, monotonic settle, bounded pokes, capped catch-up, exact transform inversion), the amended Playful scene test (travel opposite the pull, at least one edge bounce, silhouette inside the inset every frame, a single local crossing, exact rest within the limit), and the existing cancellation, reduced-motion and four-contact tests. The first independent review added still-hold sleep (unit and browser), catching at a wall, pickup on a travelling friend, per-region far-side stability, the soft limit and one-sided bounds, and a tap on a part still springing back.

## Implementation direction

Keep deformation as a pure geometry module. Use a fixed small number of incremental local warps with a positive-area guard so long pulls bend the surface progressively. Constrain local movement against the available canvas space. The scene owns a fixed collection of current/releasing handles and finite analytical response clocks; pointer movement and animation stay outside React state. At rest, render the original sprite in one draw and sleep.

The former approximately 35%-radius implementation suggestion in SPEC section 4 is superseded for this patch by the bounded larger range above. S01–S07 and all shared safety/privacy/access requirements remain normative. Budget ceilings are unchanged. Layered cutouts, a new background, and refinements to Bubble Pond or Roll & Nest must not be claimed as delivered unless actually implemented and checked.

## Verification mapping

- T45 / SQ01–SQ02: stronger local displacement, finite positive-area geometry, viewport bounds and intermediate return geometry.
- T46 / SQ03: inverse mapping and pickup on already-deformed material; independent contacts and repeated reclaim.
- T47 / SQ04–SQ05: bounded Gentle/Playful curves, pause/cancel/resize, interrupted returns and eventual sleep.
- T48 / SQ01, SQ07: reviewed phone/tablet/landscape/face-pull renders and an explicit art/face-treatment decision.
- T49 / SQ06: six desktop workloads (both Squishy modes plus the existing four scenarios), budgets and complete regression checks.
- T50 / SQ08: independent review, exact hosted/offline verification, versioned release and backed-up delivery record.

No physical-device performance or observed delight is claimed by these engineering checks. No new toy, character catalog, curriculum, score, progression, speech requirement, tracking or paid service belongs to this sprint.
