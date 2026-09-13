# Little Joys Toy Studio: a tailored BMAD-inspired workflow

**Design proposal, 13 September 2026.** Captures the owner's request for more experimentation, creative debate and a tailored Rebirth workflow. The recommended implementation cycle is **Builder 1 → one independent Critic → Builder 2 → human play feedback**. This document prepares the next workflow; it does not install BMAD, activate agents, start a sprint or supersede the current planning-only pause. Current lanes should finish and integrate as described in [NEXT-PLAY-DESIGN.md](NEXT-PLAY-DESIGN.md).

## Why change the process

The [latest feedback](feedback/BUBBLE-NEST-SECOND-LOOK.md) describes functioning toys whose repeated actions still offer too little variety or satisfying consequence. Passing technical checks has not answered “what happens next?” A useful design session should find a stronger repeating play experience, then let a builder make it tangible quickly enough to try. Adding more mechanics, particles or documents is not itself progress.

Goals: compare genuinely different play ideas; give tactile response, original art and optional sound deliberate attention; keep loose input and repeatable discovery; preserve measured performance on the target device class; and make each handoff recoverable. No curriculum, required response, progression system, analytics or claims of observed enjoyment are introduced. [SPEC.md](SPEC.md) and accepted amendments continue to own product requirements.

## What comes from Rebirth

Read-only reference repository: `C:/GameDev/maze-so-puzzle-rebirth`. Consulted source paths:

- `docs/plans/BMAD_ASTRA_AI_DEV_WORKFLOW_SETUP_FULL_UPDATED_v4.md`: historical setup and design intent.
- `AGENTS.md`, `docs/SPRINT_REVIEW.md`: current H-37 revision, dated 11 September 2026, replacing older four-round and no-critic defaults.
- `docs/AI_WORKFLOW.md`, `_bmad/custom/bmad-party-mode.toml`, `.agents/skills/project-design/SKILL.md`: separation of creative design from implementation, relevant specialists, honest independent-agent status and portable handoffs.

Observed source HEAD was `93f97c55c636484a8145f5649e92e949a641ce62`; the reference checkout also contained ongoing edits, including `docs/AI_WORKFLOW.md`. This is a synthesis of inspected working files, not a claim that every source is immutable at that commit. No reference files were changed. This adaptation is self-contained: Little Joys agents need not load the other project's instructions or histories.

Retain small relevant casts, substantive disagreement, a bounded experiment, one independent critique and recoverable evidence. Adapt the runtime-owner rule to this project's Codex/Claude lanes. Do not inherit Rebirth's full public discussion-log requirement, product-specific learning/puzzle systems, model lock or deployment configuration. Private family material must stay private here.

## A small design team, selected for the actual question

These are proposed responsibilities inspired by the reference roster, not claims that named agents have run or a BMAD roster has been installed. Usually select three to six relevant voices. One person/agent may cover compatible lenses if resources are limited; label that honestly.

| Lens | Contribution to a decision |
|---|---|
| Theo: software toys and emergence | Find a repeating action, permissive input and surprising consequences without turning play into an assignment. |
| Poppy: game feel and discovery | Challenge bland repetition; propose readable, satisfying reactions and a reason to vary an action. |
| Akari: art and sound direction | Describe original materials, character acting, composition and sound that make the interaction appealing; separate decoration from responsive objects. |
| Access and interaction specialist | Preserve broad targets, multi-touch, silent meaning, reduced motion, direct manipulation and immediate stop/retrieval. |
| Soren: computational cost | Identify actual hot paths, asset/physics/effect limits and the smallest useful measurement. |
| Mei: perceived smoothness | Check latency, animation rhythm, motion readability and interruptions; do not equate an average frame rate with good feel. |
| Mina: producer and convergence | Keep the outcome ambitious but bounded, retain dissent and write the exact implementable packet. |

For meaningful physics, effects, audio or mobile work include both cost and perceived-smoothness lenses. A practical cast for Bubble Pond is Theo, Akari, access, Soren and Mei, with the coordinator handling Mina's convergence role. The Critic later supplies independent verification; that role is not an extra design committee.

Use actual independently reasoning agents for substantial debate when available and authorized. Share their real proposals and reactions. Do not write a theatrical conversation and present it as independent scrutiny. A single-agent comparison remains useful but must be labeled as such. This proposal itself is a single-agent synthesis, not a completed Party session.

## Design session: produce an experiment, not a feature inventory

1. Read only relevant vision, feedback, current source/evidence and budgets. Separate reported experience, reproduced behavior and speculation. State one uncertainty, such as whether more satisfying bubble material response can carry repeated play without more rules.
2. Compare two or three concrete alternatives. For each describe the first touch, the immediate response, what the next few touches can change, and what happens on release or pause. Include one option that removes complexity. Each proposal must explain its strongest alternative, likely failure and cheapest useful experiment.
3. Let specialists challenge one another's actual proposal. Preserve material dissent and plausible tradeoffs. Do not manufacture agreement or disagreement, rank personalities, or let a majority vote stand in for the owner's preferences. Cost concerns should propose an affordable way to test the idea before rejecting it.
4. Choose one experience hypothesis and one bounded experiment. If a contrast is necessary, specify at most two temporary variants within Builder 1's scope, the comparison and a removal/selection rule. Do not ship both by default or quietly start a separate prototype sprint during planning.
5. Write the [sprint packet](templates/TOY-SPRINT-PACKET.md): visible outcome, scope/non-goals, acceptance, limits, ownership, art/audio needs, evidence and exact B1/C1/B2 handoffs. Resolve routine choices directly; ask the owner only for an unresolved consequential choice or missing authorization.

Stop the design session when the packet is ready. Skip a Party session for an already understood bug, documentation update or routine refactor. Readiness does not override an explicit pause or authorize unrelated implementation.

## Implementation: two Builder turns and one Critic turn

| Stage | Required delivery |
|---|---|
| Builder 1 | Same accountable builder implements the packet, iterates and self-checks. Deliver a playable candidate with source commit plus any dirty-diff identity, visible build fingerprint, AC status, commands/results, relevant screenshots and temporal interaction evidence, measured budgets and known gaps. Inspect feel and composition, not just static screenshots. |
| Critic 1 | One independent read-only reviewer inspects that exact candidate, source, packet, feedback and actual evidence. Run proportionate checks where needed without patching source or spawning a review panel. Deliver one scored report with severity-ranked, reproducible issues and explicit unverified scope. |
| Builder 2 | The same accountable builder addresses findings by severity/player value. Record each issue as fixed, evidenced disagreement, blocked or remaining. Rerun affected and required final checks, inspect final presentation, preserve final identity and deliver the checked scope. No automatic second critic, rescore or third builder. |

A turn means one substantive stage assignment/delivery. Tool calls, self-check/fix iterations, checkpoints and progress messages are not additional turns. An interrupted stage resumes with its original identity and ledger. Never hide a third implementation pass by relabeling it Builder 2. A useful planning window is roughly one to two hours for a coherent cycle, reserving room for critique, refinement and backup; this is not a deadline that waives necessary checks.

After Builder 2, unfinished acceptance remains unfinished. Preserve the result and the bounded remaining work. A further substantive implementation stage or second critique requires an explicit owner-authorized exception/continuation, recorded with its reason, scope and previous counts. This is the requested flexibility, not an automatic repair loop. Historical reviews retain their real counts; this proposal does not rewrite completed Bubble/Nest review history.

### The single Critic report

Score applicable dimensions 0–10 with evidence: (1) scoped player-action completeness and repeatability, (2) touch/state/pause/audio reliability, (3) visual and temporal presentation against the brief, (4) measured performance/resources, and (5) verification and maintainability. Use **not verified** where evidence is missing and reasoned **not applicable** where appropriate. Do not score predicted child enjoyment, learning, physical iPad comfort or unheard audio from screenshots. A high average never overrides a failed acceptance criterion.

Each issue needs an ID, blocker/high/medium/low severity, affected acceptance/file/view, candidate identity, evidence/reproduction, expected versus actual behavior and minimal corrective intent. Distinguish demonstrated defect, source-backed risk and creative hypothesis. The independent score describes Builder 1's bytes; Builder 2's self-checks are not an independent updated score. If independent review is unavailable, disclose it and leave C1 unfulfilled rather than relabeling self-review.

## Shared work and resource discipline

One accountable builder owns each packet across B1 and B2. Preserve current Codex Bubble/Nest and Claude Friend/Bounce ownership through integration. Non-overlapping packets may proceed separately with explicit worktree/file ownership; designate one integrator for shared shell, audio, assets, tests, package version and deployment. Cross-review can bring another model's perspective without casually swapping source ownership.

Use the owner's requested Codex Spark helpers for bounded routine work when the current harness actually exposes that model. Helpers stay within the active builder stage and declared file scope; the lead reviews their work. Do not substitute another model silently or create user-visible tasks merely to obtain a helper. If unavailable, record the limitation and proceed with available authorized capacity. A helper that wrote a change is not its independent Critic. Serialize shared browser/performance runs and record owned process/port identities; never terminate another lane's processes.

Keep React as the semantic shell and the imperative Canvas2D scheduler/pointer lifecycle. Specify object, particle, voice, raster and backing-store bounds before a costly experiment. Reuse existing numerical budgets and full required checks from [SPEC.md](SPEC.md), [TASKS-AND-ACCEPTANCE.md](TASKS-AND-ACCEPTANCE.md) and the active delivery contract; do not invent softer limits here. Test silent, Gentle/reduced-motion, pause/exit, multi-touch and small-layout paths as relevant. Desktop emulation is not a physical 8th-generation iPad test.

Purpose-made original sprites and sound can be part of a bounded authorized sprint. Preserve prompts/provenance, actual tool/model availability, export/alpha/registration checks, and measured runtime costs. Keep interactive geometry procedural. No key goes in the client; no raw family context goes in generation prompts. Planning may identify asset needs without starting generation when the current instruction is design-only.

## Recoverable records, release and human feedback

Use one packet with its stage ledger, one Critic report and one final delivery manifest linking evidence. Append only decisions that change the work, relevant disagreements and results; avoid parallel status documents that contradict each other. At a meaningful handoff or before changing harness, record branch/HEAD, dirty ownership, current stage, completed/missing checks, next action and any owned processes. Commit/push scoped sanitized checkpoints independently of deployment.

Keep raw personal feedback/transcripts in an ignored local folder. Public records contain neutral product observations and requirements, never family identities or diagnoses. Review evidence, logs, commit authorship and staged changes before push. Do not inherit Rebirth's instruction to publish complete visible exchanges when those exchanges contain private information. Repository backup does not make ignored private notes remotely backed up.

Follow the existing [deployment policy](../DEPLOYMENT.md): meaningful release inputs plus a deliberate stable patch-or-greater version increase, and the existing branch/build gate. Documentation-only backups need no version bump and must not create a playtest deployment. At an authorized combined release verify the actual hosted URL and visible build; keep machine evidence, hosting, physical-device evidence and voluntary-play feedback distinct.

Close a playtest delivery with a small set of concrete prompts in the message itself, usually three and never more than six: which action was voluntarily repeated, what felt confusing or unresponsive, and whether anything was uncomfortable. Record the visible build alongside feedback. Observation is optional; no required session length, response, performance target or demand on the player. The next design decision can be refine, compare, retain, reversibly archive, or explore a different kind of toy. Lack of interest in one session is not an automatic cut rule.

## Adoption boundary and next use

This pass delivers a documentation-level adaptation and template. No `_bmad`, `.agents`, `AGENTS.md`, package dependency or automation is installed or changed. If real BMAD activation is later desired, verify supported installation/resolution and actual agent capability inside Little Joys, with private Party memory disabled and sanitized durable records. Do not copy Rebirth's generated framework or history wholesale, or claim this Markdown proposal is a running BMAD installation.

The next step remains the combined four-toy playtest. After that, a suitable first Studio question is: **“Which single change makes Bubble Pond worth repeating: richer material response, interacting ripples, or gentle movement?”** Compare that with the recorded [Bounce & Catch](NEXT-PLAY-DESIGN.md) proposal before selecting the next packet. No new toy or sprint is started by this document.
