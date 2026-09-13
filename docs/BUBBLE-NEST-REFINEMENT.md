# Bubble Pond / Roll & Nest refinement

Owner assignment, 13 September 2026: Codex owns these two toys and the visible build label. Claude owns Squishy Friend and Penguin Bounce in the main checkout. This branch starts from the deployed v0.1.1 baseline; it intentionally does not integrate Claude's unfinished changes. Public design feedback is summarized here; personal/raw context remains private.

## Visible goals and acceptance

| ID | Required change and evidence |
|---|---|
| BN01 | Bubble pops visibly collapse/break into iridescent arcs, droplets and a short ripple in Playful. Gentle uses a quiet local dissolve. Original bubble art stays recognizable; no arbitrary opaque purple fill behind one fixed slot. Empty-space touches create a small water response. Silent play must visibly respond. |
| BN02 | Popped bubbles return to varied safe positions when space allows, with no overlap, smaller precision targets or spawning beneath any held finger. A finger held over the old bubble continues to block its return. Use bounded deterministic placement attempts, retain count settings, and freeze cooldown over pause/background. Snapshot position/sequence data is validated. |
| BN03 | Roll & Nest has correct visual depth: a released/nesting ball sits behind the actual painted front lip; held/free balls render above the bowl so direct manipulation never vanishes behind it. Align the opening/foreground boundary with measured sprite coordinates. Remove the broad green drag halo and detached ball shadow. A selected tap-place ball uses small contrasting corner marks, not a surrounding ring. |
| BN04 | Playful dragging gives a free ball a bounded release velocity, rolling rotation, damped edge rebound and finite settling; two free balls can collide. Gentle retains direct quiet positioning and monotonic nest settling. Bowl acceptance remains generous and release-only; accepted balls settle into distinct retrievable slots. No precision aiming, scoring, failure, autonomous gravity or moving held neighbours. |
| BN05 | Maximum two balls, four contacts, 24 bubble effect events, fixed/capped physics steps and finite response clocks. No added raster/audio dependencies or React animation state. Pause/cancel/resize stop release velocity without emitting sound; no hidden-time catch-up. Both toys eventually sleep after input-triggered responses complete. |
| BN06 | Version plus a short build digest visible on every toy at phone/tablet sizes without opening Parents. Full digest retained for technical reporting. Label must not intercept touches or overlap controls/captions. |
| BN07 | Relevant units, production browser interactions/rendered screenshots, 100-switch/offline/update checks, full build/assets/budgets and demanding desktop timing. Independent review and exact release identity. No physical iPad or private enjoyment claim. |

BN02 explicitly replaces the old fixed-position bubble-return implementation suggestion. BN04 permits finite release momentum in Playful while keeping N03's generous release-only bowl acceptance and the existing quiet Gentle path. Existing privacy, silent defaults, bounded optional audio, input ownership and deployment requirements remain normative. No budget ceiling is relaxed.

## Architecture and work split

Primary agent owns design, bubble scene/placement, nesting scene/occlusion integration, visual review and final release evidence. Requested Spark delegation, when account/tool access permits, handles small isolated tasks such as build-label markup, pure bounded physics helpers and tests under explicit file ownership. Every result is reviewed; a model selection or tool attempt is not proof of access or separate billing.

Changes stay in `.local/bubble-nest-worktree` on `codex/bubble-nest`. Shared setting/audio/runtime edits are avoided unless required and coordinated. Feature-branch backups skip Vercel app builds. Do not deploy a stale combination over another lane's reviewed release; inspect main and integrate deliberately. Bubble/Nest completion does not qualify or modify Claude's two toys.
