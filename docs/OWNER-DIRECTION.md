# Owner direction

This is the reusable product direction approved on 13 September 2026. It records design choices and future interests, not evidence of enjoyment, learning, or target-device performance. [SPEC.md](SPEC.md), together with recorded owner amendments in [IMPLEMENTATION-NOTES.md](IMPLEMENTATION-NOTES.md), remains the implementation contract. [ROADMAP.md](ROADMAP.md) separates the current patch from later work; [BACKLOG.md](BACKLOG.md) holds ideas that have not been approved for implementation.

## Keep play open and generous

Little Joys remains a small, direct-touch software toy. Any useful touch should produce a readable response. Repeating a simple action is complete play; the app must not turn repetition into a test or automatically make it harder. Speech, reading, correct answers, eye contact, cooperation, or taking turns must never be conditions for continuing. Pause, mute, leaving, and returning remain available without completing anything.

Quiet presentation should still feel polished, tactile, and appealing. Preserve strong silhouettes, readable objects, forgiving touch regions, bounded effects, silent defaults, and effective reduced motion. Prefer a few satisfying interactions to a large collection of unfinished activities. Observe voluntary engagement and comfort privately; do not describe an untested design as enjoyable or educationally effective.

## Approved next toy: Penguin Bounce

The next material playtest patch is **v0.1.1**, adding a fourth toy with forgiving, pinball-style bouncing physics. Its working name is **Penguin Bounce**. Penguins are the first new character theme.

Tapping the play area should do something useful without precise aiming. Large balls, readable obstacles, generous contacts, and clear cause and effect should make both brief taps and continued exploration worthwhile. The approved interaction direction includes adding balls and touching large mechanisms to turn or toggle their behavior. The implementation must keep finite object counts, bounded speed and effects, and a stable simulation suitable for the existing Canvas2D runtime. A settled scene should sleep; pausing must stop simulation and audio immediately.

This is free exploration: no gambling presentation, stakes, scores, failure, life counter, loss of earned progress, or required finishing sequence. Repeated bounces must not multiply sounds or stimulation without bounds. Every ball must stay recoverable; no precise launch, successful shot, or timed input is required to continue. The current three toys and their shared access features remain available.

Implementation and validation are in progress. This direction does not claim that the fourth toy is already delivered, that its final interaction tuning is settled, or that it has been checked on a physical iPad.

## Later content interests

| Direction | Design boundary |
|---|---|
| More original animals | Penguins first; cute dinosaurs and farm animals are later candidates. Character variety should support an existing useful interaction, not require a collectible inventory. |
| Trains | A tentative, low-priority exploration idea. Do not treat this as an established preference or committed content. |
| Optional animal sounds | Use original recordings or selected, owner-authorized assets with checked provenance. Enable only through adult settings, remain playable in silence, and respect all existing sound caps and stop paths. |
| A musical invitation followed by space | A short original musical phrase may leave a quiet gap for optional response or shared play. The app must remain responsive throughout and continue without any response. It must not detect, grade, or reward speech or imitation. |
| Letters and numbers | Optional objects or visual content for exploration, with no quiz, accuracy requirement, curriculum, or progression. Their presence alone is not a learning outcome. |
| Triggered sprite vignettes | A later possibility for brief, local, input-triggered character actions. Avoid unsolicited scenes, automatic novelty, full-screen celebrations, or interruptions to control. |

These interests are a backlog, not commitments in v0.1.1. Add one bounded variation at a time after the current change has usable evidence. Preserve any simple interaction when adding optional content. Vivid color and lively physics may be appealing design choices, but they do not authorize flashing/strobing effects, unpredictable sensory escalation, or unbounded ball counts.

## Art, sound, privacy, and publication

Create original characters, art, and musical material. Broad craft or interaction inspiration does not authorize copying television characters, recognizable songs, branded game assets, or unverified sound libraries. Any reuse needs explicit owner authorization and recorded provenance; the existing optional music has its own provenance record. Keep runtime media local, exported once, and within measured payload and memory budgets.

Public documents contain reusable design decisions only. Personal identities, diagnoses, raw feedback, family observations, and private playtest notes stay in ignored local storage and are excluded from Git, deployed assets, generation prompts, and telemetry. Do not turn those notes into claims about other users.

GitHub backups and app releases are separate. Automatic deployment is limited to `main` and requires both a higher stable version and changed production inputs relative to the last successful deployment. Documentation, specification, source-art, and test backups do not by themselves publish a new game artifact. Missing release history skips safely; first deployment and rollback are deliberate manual actions. The precise behavior, including Vercel's canceled deployment records, is in [DEPLOYMENT.md](../DEPLOYMENT.md).
