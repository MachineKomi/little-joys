# Expressive-squish render evidence

Independent review captures, 13 September 2026. Candidate: `v0.1.2-c63c46ea7ceb`. Browser images contain only the public game. No private play observation is included.

| Capture | Conditions |
|---|---|
| [Deployed v0.1.1 side pull](baseline-v011-side.png) | Fresh Chromium, service workers blocked, 810×1080 CSS pixels, DPR 1, Gentle; build `v0.1.1-50d0640d1f04`. |
| [Candidate side pull](candidate-v012-side.png) | Same browser/layout/settings and normalized gesture as baseline. |
| [Phone eye pull](phone-eye.png) | Chromium, 360×640, Gentle. |
| [WebKit side pull](webkit-side.png) | Windows desktop WebKit, 810×1080, Gentle. |
| [Landscape four crossed contacts](landscape-four-touch.png) | Chromium, 1080×810, Playful. |

The controlled comparison starts at (0.72r, 0), moves in eight steps to (1.60r, 0.14r), then holds 300ms; r = 0.29 × the smaller play-canvas dimension. The teal silhouette right edge starts at x=636 in both and reaches x=689 in v0.1.1 versus x=757 in v0.1.2: **53px versus 121px displacement**, while the far-left edge remains x=173 in both. This measures one rendered silhouette comparison, not universal mesh displacement or physical touch latency.

Source review, continuity probes and qualification limits are summarized in [REVIEW.md](../../REVIEW.md). Raw technical traces remain ignored local artifacts; full automated/resource/hosting evidence is in [DELIVERY.md](../../DELIVERY.md). Desktop screenshots do not establish physical iPad behavior or enjoyment.
