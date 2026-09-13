# Little Joys roadmap

Updated 13 September 2026. This is a scope and status record, not a promise of dates or evidence of developmental benefit. Owner priorities are in [OWNER-DIRECTION.md](OWNER-DIRECTION.md); implementation requirements remain in [SPEC.md](SPEC.md) and its recorded amendments. See [DELIVERY.md](DELIVERY.md) for actual checks and hosted-build status.

| Stage | Status | Scope | Evidence still required |
|---|---|---|---|
| v0.1.0: three-toy foundation | Implemented technical preview | Squishy Friend, Bubble Pond, Roll & Nest; shared touch, settings, pause/mute, original sprites, optional authorized music, static installation and verified versioned caching. | Physical iPad touch, performance, Safari/Home Screen lifecycle, and soak checks remain pending. Voluntary enjoyment and return preference require private observation. |
| v0.1.1: Penguin Bounce | Deployed four-toy MVP; independent review, full automated checks, final desktop measurements and actual hosted verification complete | Fourth forgiving physics toy with original penguin art, useful broad-area taps, bounded balls, turnable mechanisms and brighter Playful collision effects. Retains the existing three toys and shared access behavior. | Physical-device evidence and reported original-toy refinements remain open. DELIVERY.md records the exact hosted build and limits of the desktop measurements. |
| Refine the four-toy set | Prioritized phone feedback recorded; current fourth-toy patch does not fix these reported shortcomings | Stronger expressive squish first; bubble variety/response; ball halo/shadow and bowl occlusion; bounded roll/settle response; warmer visual presentation. See [refinement contract](FEEDBACK-AND-REFINEMENTS.md) and LJ-13–LJ-17. | Reproduce visual defects, compare changed behavior, record relevant checks/builds and keep private observations out of public evidence. Do not describe the existing three toys as finished because the fourth toy passes technical checks. |
| Optional content variations | Backlog only | Original dinosaurs/farm animals, optional verified animal sounds, musical invitations with response-free gaps, playful letters/numbers, or triggered character vignettes. Trains are only a tentative, low-priority idea. | Choose a bounded item explicitly, define its access and resource limits, and validate it before expanding again. |

## v0.1.1 boundary

The fourth toy is the current addition. It does not authorize a curriculum, a general game engine, levels, scores, gambling, collectibles, speech detection, online services, or a broad character/sound catalog. Later creative interests remain in [BACKLOG.md](BACKLOG.md).

Keep the architecture small: React for the semantic shell, imperative Canvas2D for interaction, the existing shared scheduler and pointer lifecycle, bounded scene state, and validated settings/snapshots. Measure the complete four-toy artifact and active scene costs; adding a toy must not silently relax the existing device or transfer budgets. Any necessary contract change must be recorded explicitly with its reason and evidence.

## Release and backup cadence

The Codex lane has implemented and checked bubbles, nesting, build identification and the parent hold hint under [BN01–BN07](BUBBLE-NEST-REFINEMENT.md); [scoped delivery](BUBBLE-NEST-DELIVERY.md) records final tests and measurements. Claude's friend/bounce work remains separate until reviewed integration. The branch is based on v0.1.1; its digest identifies local candidates, and the stable version is advanced during deliberate integration rather than making competing lanes claim the same release.

Commit documentation and recoverable checkpoints independently of deployment. Publish a material playtest build only when its code/assets are ready and its stable version increases by at least a patch. The `main` deployment gate compares both conditions against the last successful deployment, so documentation-only backups skip the app build. A version change alone is insufficient. Follow [DEPLOYMENT.md](../DEPLOYMENT.md) for baseline recovery, manual first release, rollback, and verification of the real URL.

Keep four boundaries distinct: implemented behavior, automated/browser evidence, verified hosting, and physical-device/private play observations. None substitutes for another.
