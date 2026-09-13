# Current work split — 13 September 2026

The owner explicitly reassigned the toys after the latest phone review. This file is the recoverable handoff, not a claim of a completed release.

Incoming session: start with [FABLE-KICKOFF.md](FABLE-KICKOFF.md) and the [consolidated toy feedback](FABLE-TOY-FEEDBACK.md). Those organize existing public feedback and the latest explicit steering; private raw context remains excluded.

| Lane | Working location / branch | Ownership |
|---|---|---|
| Incoming Fable/Claude session | Main local checkout; `codex/expressive-squish` | Squishy Friend and Penguin Bounce, their geometry/renderers and scoped tests/specs. |
| Codex | Ignored local worktree `.local/bubble-nest-worktree`; `codex/bubble-nest` from last backed-up main | Bubble Pond and Roll & Nest, scoped tests/specs, and the explicitly requested visible build label. |

Do not edit the other lane's toy files, reset its work, stage its changes, or deploy a combined artifact without checking its actual source and evidence. Coordinate any shared settings/audio/asset/runtime edits through this file and the owner. Keep commits scoped. Both lanes may back up feature branches; the Vercel gate skips non-main branches. Integrate reviewed changes deliberately into main with a material version increase; documentation backups alone do not deploy.

## Live baseline

The easy URL remains https://littlejoys-play.vercel.app/, last verified at **v0.1.1-50d0640d1f04**, source `c84af963e95fa647edc7f13622fb9ada575d7021`. Main backup is `34cc938dbf45363626409de27d27d265a87481ea`. No v0.1.2 squish candidate has been deployed. The owner could not see a build label during review, so the reviewed version is not independently established.

## Unfinished Squishy handoff

Checkpoint `e14daac` introduced the stronger squish and first review repairs. Last fully regression-checked candidate **c63c46ea7ceb** passed 153 unit / 89 browser cases, with seven native WebKit audio skips, and received a bounded 8/10 independent interaction review. It was held from release after its six-workload trace showed Squishy frame p95 **49.9ms Gentle / 33.4ms Playful**. Do not promote that check result into a performance pass or physical-device qualification.

Current Squishy working candidate before lane separation: **v0.1.2-31fa4f57596f**. A smaller **8×8 mesh / 128 affine patches** retains the 1.1-radius pull, 16 incremental warp steps, 30% positive-area guard, material-aware re-grab, incenter seam repair and bounded Gentle/Playful return. The one-time material-preparation canvas no longer requests frequent readback. Original art is unchanged. All 30 focused geometry/scene units pass; the curl pickup fixture now uses the same fixed material point rather than a hard-coded subdivision vertex, with its original 1.45-radius assertion intact.

GRID10 and GRID8 were measured as diagnostic alternatives. GRID8 had median **16.7ms**, p95 **33.4ms** in both strong four-contact modes, synchronous update/draw p95 **1.6/1.3ms**, and no continuous-probe intervals above 50ms. These are preliminary desktop samples. Final full regression, complete six-workload measurement, review and hosting are **not complete for 31fa**. No third rendered review was completed before the owner's scope change; the reviewer performed a read-only cost inspection without launching browsers. Current docs/evidence retain c63c checks and its failed pacing trace; local probes and raw traces are ignored.

Useful local artifacts: `.local/squish-review-{1,2}/`, `.local/v012-perf-c63c/`, `.local/squish-grid{10,8}-perf.json`, `.local/squish-visual/`, and `.local/v012-update-failure/`. One unchanged Windows WebKit update test previously lost its second page before navigation; three diagnostic samples and a subsequent full run passed, but the underlying page-creation cause remains unexplained. No assertion was waived.

## Fable lane progress (Squishy Friend and Penguin Bounce)

Work continues on `codex/expressive-squish` in the main checkout. Nothing from this lane is deployed; the live build is still v0.1.1. [DELIVERY.md](DELIVERY.md) holds the actual check results for the candidate once complete.

- **Penguin Bounce (LJ-20):** the penguin now stands on a snow shelf at the top of the board and drops balls from a chute. The board adds three bumpers, a pinwheel, two funnel rails, six-colour balls and a denser peg field, with the layout keeping a full ball passage everywhere. Passive flow runs for a 120-second attended window after entry or the last touch, then the board settles and sleeps. The contract change is recorded in [PENGUIN-BOUNCE-SPEC.md](PENGUIN-BOUNCE-SPEC.md).
- **Squishy Friend (LJ-22):** pulls now depend on the region touched: the curl stretches like a tail, cheeks squish wide, eyes stretch tightly and feet stay stubby. In Playful, a pull slings the whole friend across the board. It squashes against edges, leans and sways, then returns home within 3.6 seconds, and a touch catches it mid-flight. Gentle and reduced motion keep the quiet local return. The contract change is recorded in [EXPRESSIVE-SQUISH-SPEC.md](EXPRESSIVE-SQUISH-SPEC.md).
- **Shared file touched:** `src/core/runtime.ts` only gains five Bounce-only technical status fields: flow active, input spawns, flow spawns, deflector angles and pinwheel spin. No settings, audio, asset-manifest or parent-panel change was made in this lane.
- **Integration notes:** the Penguin Bounce picture tile (`public/assets/toy-bounce.png`) still shows the old board. It should be recaptured on the integrated branch with `scripts/capture-assets.mjs`, which also rewrites the shared asset manifest. The Squishy tile and icons are unchanged, because the rest pose is identical. Browser checks in this lane use port 4273 with a separate config, so they never reuse another lane's production server on 4173.

## Latest owner direction

The current toy interactions remain too shallow. Retain the cute original friend/penguin and the usable Toybox selector; improve the actual response rather than treating attractive sprites as completion. Squishy requests now include stronger independently expressive regions, larger directional recoil/swing and edge bounce, with multiple friends/addition as a possible later experiment. These go beyond the bounded rebound in the unfinished candidate.

Penguin Bounce needs a denser, more legible sequence of ricochets and mechanisms, brighter more varied color, meaningful penguin participation, local lights/effects, and a continuous supply of balls with interesting physics even without taps. That passive-flow request revises the prior input-only/sleep direction for this toy and needs an explicit updated contract with bounded pooling, effective pause/background stop and defined Gentle/reduced-motion behavior. Preserve broad useful controls and free exploration; no gambling, score or required success.

Codex is addressing satisfying silent bubble pops and spatial variety, then ball/bowl occlusion, removal of the unwanted broad halo/shadow, and a forgiving physical roll/settle response. Build identification must be visible without opening technical settings. Brand/header art and the unclear parent icon/hold affordance are also criticized and recorded in the backlog, rather than silently included in either toy lane.

Raw feedback and personal context stay in ignored local private storage. Public handoffs contain reusable product requirements only. Physical iPad evidence and private enjoyment observations remain separate from all automated checks.
