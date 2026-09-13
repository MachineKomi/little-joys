# Little Joys roadmap

Updated 13 September 2026. This is a scope and status record, not a promise of dates or evidence of developmental benefit. Owner priorities are in [OWNER-DIRECTION.md](OWNER-DIRECTION.md); implementation requirements remain in [SPEC.md](SPEC.md) and its recorded amendments. See [DELIVERY.md](DELIVERY.md) for actual checks and hosted-build status.

| Stage | Status | Scope | Evidence still required |
|---|---|---|---|
| v0.1.0: three-toy foundation | Implemented technical preview | Squishy Friend, Bubble Pond, Roll & Nest; shared touch, settings, pause/mute, original sprites, optional authorized music, static installation and verified versioned caching. | Physical iPad touch, performance, Safari/Home Screen lifecycle, and soak checks remain pending. Voluntary enjoyment and return preference require private observation. |
| v0.1.1: Penguin Bounce | Approved; implementation in progress | Add the fourth, forgiving physics toy with penguin art, useful broad-area taps, bounded balls and large interactive mechanisms. Retain the existing three toys and shared access behavior. | Complete implementation, targeted physics/input tests, browser and visual review, all-toy offline/update checks, updated asset/performance budgets, and actual deployed-build verification before claiming delivery. Physical-device evidence remains separate. |
| Refine the four-toy set | Pending; no additional feature approved here | Fix concrete access, comfort, clarity, stability, or performance issues found in review and private play. Tune the favored interactions without forcing new difficulty. | Record what was actually observed and the relevant build/device conditions. Keep private observations out of public evidence. |
| Optional content variations | Backlog only | Original dinosaurs/farm animals, optional verified animal sounds, musical invitations with response-free gaps, playful letters/numbers, or triggered character vignettes. Trains are only a tentative, low-priority idea. | Choose a bounded item explicitly, define its access and resource limits, and validate it before expanding again. |

## v0.1.1 boundary

The fourth toy is the current addition. It does not authorize a curriculum, a general game engine, levels, scores, gambling, collectibles, speech detection, online services, or a broad character/sound catalog. Later creative interests remain in [BACKLOG.md](BACKLOG.md).

Keep the architecture small: React for the semantic shell, imperative Canvas2D for interaction, the existing shared scheduler and pointer lifecycle, bounded scene state, and validated settings/snapshots. Measure the complete four-toy artifact and active scene costs; adding a toy must not silently relax the existing device or transfer budgets. Any necessary contract change must be recorded explicitly with its reason and evidence.

## Release and backup cadence

Commit documentation and recoverable checkpoints independently of deployment. Publish a material playtest build only when its code/assets are ready and its stable version increases by at least a patch. The `main` deployment gate compares both conditions against the last successful deployment, so documentation-only backups skip the app build. A version change alone is insufficient. Follow [DEPLOYMENT.md](../DEPLOYMENT.md) for baseline recovery, manual first release, rollback, and verification of the real URL.

Keep four boundaries distinct: implemented behavior, automated/browser evidence, verified hosting, and physical-device/private play observations. None substitutes for another.
