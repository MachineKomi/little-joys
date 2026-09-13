# Bubble Pond / Roll & Nest — narrow independent repair verification 2

Frozen build **v0.1.1-8f53112d4703**, asserted from the served build label at **127.0.0.1:4174**. Read-only verification on 13 September 2026; no production source, server or deployment changed.

**P2 resolved. Technical preview repair verdict: 8/10.** No remaining material defect known from the combined round 1 review and this narrow repair check. Final full regression, demanding desktop measurement, integration/deployment and physical-device qualification remain separate builder gates.

The exact round 1 mounted Chromium reproduction was repeated: eight coalesced pointer samples, each moving 5 px, followed by release. With **2 ms sample gaps**, the rendered ball centre now moved **x=356.210 → 434.367** over the next 150 ms (**78.157 px**), with angle **0.640 → 1.617**. Previously that same stream remained at x=345 and angle=0.5. The **8 ms control** moved x=355.009 → 430.775. The source change accepts finite positive intervals while retaining the 700 px/s speed cap, the upper interval check, cancellation and stationary-hold expiry. These are synthetic mounted input observations, not a physical-device or performance-distribution claim.

Current **Hold 2s** helper text was inspected in actual 360×640 and 810×1080 captures (`hint-360.png`, `hint-810.png`). It remains within the existing toolbar and does not crowd adjacent controls. Phone parent bounds x=299–344, y=20.5–78.5; tablet x=729–782, y=24–82. The neighboring control ends at x=256/699 respectively. Existing accessible description and gate behavior are unchanged. Build-label centre still hits CANVAS at both sizes. No page errors were recorded.

The corrected current `../refinement-visual/bubbles-360-response.png` was independently viewed: it shows one local pop burst and five intact bubbles, closing the earlier helper-coordinate evidence gap. Round 1's independent phone pop/block/return, nest layering, tap-place retrieval, collision/pause/expiry, and reduced-motion observations remain preserved in their original directory; unaffected cases were not broadly repeated here.

Exact data and harness: `evidence.json`, `exact-probe.mjs`, `verify.mjs`, and `coalesced-{2,8}ms.png`. All reviewer-owned browser contexts/processes were closed, and **browser lane 4174 explicitly released** before the builder's final tests/measurement. No other lane, private parent checkout or port 4173 was accessed. Physical iPad touch/performance and enjoyment remain not tested/unobserved.
