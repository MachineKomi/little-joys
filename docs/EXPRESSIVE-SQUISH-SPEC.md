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
