# Fable-lane render evidence (LJ-20, LJ-22)

Captured on 13 September 2026 from production build `v0.1.2-329dc2c8d902`. The build was served locally with the real `vercel.json` headers, with service workers blocked, in Windows desktop Chromium at DPR 1. A fake browser clock stepped every animation frame, so the times below are exact simulated times. The images contain only the public toy; no private observation is included. Desktop captures are not physical iPad or player evidence.

## Squishy Friend, portrait 810×1080 CSS

| File | Conditions |
|---|---|
| `squishy-portrait-playful-1-side.png` | Held side (cheek region) pull from 0.6 to 1.7 rest radii, 50ms after the last move. Gentle renders the same held frame. |
| `squishy-portrait-playful-2-eye.png` | Held pull on the left eye. The eye stretches with a narrow influence. |
| `squishy-portrait-playful-3-curl.png` | Held pull on the curl. It draws out like a tail. |
| `squishy-portrait-playful-4-foot.png` | Held pull on the left foot. It stays stubby. |
| `squishy-portrait-playful-5-release-0067ms.png` | 67ms after releasing the side pull. The friend is slung left against the inset while the stretched side still returns. |
| `squishy-portrait-playful-5-release-0233ms.png` | 233ms after release. The friend has swung back past home to the right. |
| `squishy-portrait-playful-6-poke-0050ms.png` | 50ms after a quick poke. A short squash along the tap axis. |

The painted friend's measured bounding box (teal pixels against the cream background) was as follows:

| Time | Horizontal centre relative to rest |
|---|---|
| Rest | x 173 to 636 |
| 67ms after release | -133px, left edge at 23px |
| 233ms after release | +52px |
| 500ms after release | +2px |
| After 4s | Exact rest frame, asserted by the rendered-pixel browser test in both engines |

A poke changed the friend's height by -6% at 50ms and +4% at 83ms, then rested by 300ms.

## Penguin Bounce

| File | Conditions |
|---|---|
| `bounce-portrait-playful-2-flow-14s-no-touch.png` | Playful, 16-ball limit, 14 simulated seconds after entry with no touch. The penguin has supplied the balls in play and the trough. |
| `bounce-portrait-gentle-2-flow-14s-no-touch.png` | The same in Gentle: slower flow and quiet contact halos. |
| `bounce-portrait-playful-3-mechanism-taps.png` | 180ms after tapping the pinwheel, the top-left bumper, the left deflector and the penguin, at their real layout positions. Shows the bumper glow, a spun pinwheel, a turned deflector, a freshly dispensed ball and a recycle ring. |
| `bounce-phone-playful-2-flow-14s-no-touch.png` | Phone 360×640, Playful, 14 seconds with no touch. |
| `bounce-landscape-playful-2-flow-14s-no-touch.png` | Landscape 1080×810, Playful, 14 seconds with no touch. |

Timing, budget and browser-test evidence for the same build are in [DELIVERY.md](../../DELIVERY.md) and [checks.json](../checks.json).
