# Little Joys roadmap

Updated 13 September 2026. This is a scope and status record, not a promise of dates or evidence of developmental benefit. Owner priorities are in [OWNER-DIRECTION.md](OWNER-DIRECTION.md); implementation requirements remain in [SPEC.md](SPEC.md) and its recorded amendments. See [DELIVERY.md](DELIVERY.md) for actual checks and hosted-build status.

**Current work split:** Codex proceeds on Bubble Pond and Roll & Nest; the incoming session takes Squishy Friend and Penguin Bounce. The expressive-squish release below is interrupted and **not deployed**: c63c passed regression but failed desktop pacing; its GRID8 follow-up has preliminary focused evidence only. [AGENT-HANDOFF.md](AGENT-HANDOFF.md) supersedes older active-sprint wording and defines separate branches, ownership and release coordination.

| Stage | Status | Scope | Evidence still required |
|---|---|---|---|
| v0.1.0: three-toy foundation | Implemented technical preview | Squishy Friend, Bubble Pond, Roll & Nest; shared touch, settings, pause/mute, original sprites, optional authorized music, static installation and verified versioned caching. | Physical iPad touch, performance, Safari/Home Screen lifecycle, and soak checks remain pending. Voluntary enjoyment and return preference require private observation. |
| v0.1.1: Penguin Bounce | Deployed four-toy MVP; independent review, full automated checks, final desktop measurements and actual hosted verification complete | Fourth forgiving physics toy with original penguin art, useful broad-area taps, bounded balls, turnable mechanisms and brighter Playful collision effects. Retains the existing three toys and shared access behavior. | Physical-device evidence and reported original-toy refinements remain open. DELIVERY.md records the exact hosted build and limits of the desktop measurements. |
| Refine the four-toy set | Expressive squish implemented; remaining phone feedback prioritized | Next: bubble variety/response; ball halo/shadow and bowl occlusion; bounded roll/settle response; warmer visual presentation. See [refinement contract](FEEDBACK-AND-REFINEMENTS.md) and LJ-14–LJ-17. | Reproduce visual defects, compare changed behavior, record relevant checks/builds and keep private observations out of public evidence. The other toys are not finished simply because one refinement passes technical checks. |
| v0.1.2: expressive squish | Implementation, independent repair review and complete regression checks passed; exact measurements/hosting status in DELIVERY.md | Larger local stretches, continuous pickup during return, finite Gentle/Playful release response, and preservation of the current painted character. [Sprint contract](EXPRESSIVE-SQUISH-SPEC.md). | Physical iPad touch/performance/lifecycle and follow-up private observations remain pending. |
| Optional content variations | Backlog only | Original dinosaurs/farm animals, optional verified animal sounds, musical invitations with response-free gaps, playful letters/numbers, or triggered character vignettes. Trains are only a tentative, low-priority idea. | Choose a bounded item explicitly, define its access and resource limits, and validate it before expanding again. |

## Current refinement boundary

The fourth toy remains available while v0.1.2 refines Squishy Friend. This scope does not introduce a curriculum, a general game engine, levels, scores, gambling, collectibles, speech detection, online services, or a broad character/sound catalog. Later creative interests remain in [BACKLOG.md](BACKLOG.md).

Keep the architecture small: React for the semantic shell, imperative Canvas2D for interaction, the existing shared scheduler and pointer lifecycle, bounded scene state, and validated settings/snapshots. Measure the complete four-toy artifact and active scene costs; adding a toy must not silently relax the existing device or transfer budgets. Any necessary contract change must be recorded explicitly with its reason and evidence.

## Release and backup cadence

Commit documentation and recoverable checkpoints independently of deployment. Publish a material playtest build only when its code/assets are ready and its stable version increases by at least a patch. The `main` deployment gate compares both conditions against the last successful deployment, so documentation-only backups skip the app build. A version change alone is insufficient. Follow [DEPLOYMENT.md](../DEPLOYMENT.md) for baseline recovery, manual first release, rollback, and verification of the real URL.

Keep four boundaries distinct: implemented behavior, automated/browser evidence, verified hosting, and physical-device/private play observations. None substitutes for another.
