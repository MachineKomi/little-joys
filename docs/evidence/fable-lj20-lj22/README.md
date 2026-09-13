# Fable-lane render evidence (LJ-20, LJ-22)

Captured on 13 September 2026 from production build `v0.1.2-664e98e42c76`, after the first independent review's repairs. The build was served locally with the real `vercel.json` headers and service workers blocked, in Windows desktop Chromium at DPR 1. A fake browser clock stepped every animation frame, so the times below are exact simulated times. The images contain only the public toy; no private observation is included. Desktop captures are not physical iPad or player evidence.

## Squishy Friend, portrait 810×1080 CSS

| File | Conditions |
|---|---|
| `squishy-portrait-playful-1-side.png` | Side (cheek region) pull held from 0.6 to 1.7 rest radii, 50ms after the last move. Gentle renders the same held frame. |
| `squishy-portrait-playful-2-eye.png` | Left eye pull held. The eye stretches with a narrow influence. |
| `squishy-portrait-playful-3-curl.png` | Curl pull held. The curl draws out like a tail. |
| `squishy-portrait-playful-4-foot.png` | Left foot pull held. The foot stays stubby. |
| `squishy-portrait-playful-5-release-0067ms.png` | 67ms after the side pull is released. The friend is slung left against the inset while the stretched side still returns. |
| `squishy-portrait-playful-5-release-0233ms.png` | 233ms after release. The friend has swung back past home to the right. |
| `squishy-portrait-playful-6-poke-0050ms.png` | 50ms after a quick poke. A short squash along the tap axis. |

The painted friend's bounding box, measured from teal pixels against the cream background:

| Time | Horizontal centre, relative to rest |
|---|---|
| Rest | x 173 to 636 |
| 67ms after release | -133px, left edge at 23px |
| 233ms after release | +54px |
| 500ms after release | -1px |
| After 4s | Exact rest frame, asserted by the rendered-pixel browser test in both engines |

A poke changed the friend's height by -7% at 50ms and +2.5% at 83ms, and it was back at rest by 300ms.

## Penguin Bounce

| File | Conditions |
|---|---|
| `bounce-portrait-playful-2-flow-14s-no-touch.png` | Playful, 16-ball limit, 14 simulated seconds after entry with no touch. The penguin has supplied the balls in play and the trough. |
| `bounce-portrait-gentle-2-flow-14s-no-touch.png` | The same in Gentle, with slower flow and quiet contact halos. |
| `bounce-portrait-playful-3-mechanism-taps.png` | 180ms after tapping the pinwheel, the top-left bumper, the left deflector and the penguin at their real layout positions. It shows the bumper glow, a spun pinwheel, a turned deflector, a freshly dispensed ball and a recycle ring. |
| `bounce-phone-playful-2-flow-14s-no-touch.png` | Phone 360×640, Playful, 14 seconds with no touch. |
| `bounce-landscape-playful-2-flow-14s-no-touch.png` | Landscape 1080×810, Playful, 14 seconds with no touch. |

Timing, budget and browser-test evidence for the same build are in [DELIVERY.md](../../DELIVERY.md) and [checks.json](../checks.json).
