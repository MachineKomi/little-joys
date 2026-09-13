# Running the Little Joys Toy Studio

**Enabled for future selected work, 13 September 2026.** The owner authorized setup after reviewing the [tailored workflow](TOY-STUDIO-WORKFLOW.md). The current integration/deployment remains owned by Claude; this setup is isolated on `codex/bubble-nest` and must be integrated deliberately. It neither starts a new sprint nor resets the current release's review history.

## Start or resume

Read root `AGENTS.md` (Claude also reads `CLAUDE.md`). Inspect actual worktree/branch/HEAD/dirty files, current user scope and owning packet. Look at [roadmap](ROADMAP.md), [feedback/design](NEXT-PLAY-DESIGN.md), and [lane delivery](BUBBLE-NEST-DELIVERY.md) only as needed. Resolve stale status against live evidence; no document is a lock on another agent's changing checkout.

- Unresolved substantial play/design question: invoke `little-joys-design`, or ask “Run Toy Studio on [bounded question].” Use actual configured BMAD Party Mode, select relevant independent specialists where available, and converge on a packet.
- Selected authorized runtime work: invoke `little-joys-implement`, or ask “Implement [packet] using the Toy Studio sprint loop.” Run B1 → one independent C1 → same B2. Stage ledger and evidence live in that packet. Explicit owner continuation may extend a bounded remainder without resetting history.
- Straightforward docs/tooling or an already settled question: work directly and proportionately. Do not manufacture a Party or runtime cycle.

Canonical project skills live in `.agents/skills/little-joys-{design,implement}/SKILL.md`; thin Claude entry points live in `.claude/skills/`. The root instructions also make them discoverable when a running app has not refreshed its skill catalog. Directly read the file if it is not listed; never claim an unavailable slash command was invoked.

## Reproducible local setup

From the checkout that will run the next session, in PowerShell:

```powershell
./scripts/setup-ai.ps1
./scripts/check-ai.ps1
```

Requires Node/npm and Python 3.11+. The helper detects the existing bundled Codex Python on this Windows host; elsewhere set `LITTLE_JOYS_PYTHON` to an existing Python executable. No global PATH or Python installation is modified. The inspected upstream Party/config resolvers are stdlib-only and run through `scripts/bmad-python.ps1`; `uv` is not required for this narrow workflow. General BMAD Build tooling may require `uv`, but it is outside this project's chosen implementation path and must not be invoked.

The setup installs **`bmad-method@6.12.0`, Core/BMM**, for **`codex,claude-code`**, with neutral `Human` identity and ignored `.local/toy-studio-output`. These are deliberately pinned working versions, not a claim about latest releases. GDS and the full Rebirth framework are not needed: this party uses tailored toy-design personas. The installed upstream skills are kept intact; project behavior lives in the supported sparse team override `_bmad/custom/bmad-party-mode.toml` and the project entry points. Upstream tooling is reinstallable and ignored; team overrides and project skills are committed. Upstream source: BMAD-METHOD package/repository, retaining its own supplied license in the installation; no Rebirth framework files were copied.

Actual activation commands (substitute `.claude` for `.agents` when using Claude's installed skill):

```powershell
./scripts/bmad-python.ps1 _bmad/scripts/resolve_config.py --project-root .
./scripts/bmad-python.ps1 _bmad/scripts/resolve_customization.py --project-root . --skill .agents/skills/bmad-party-mode --key workflow
./scripts/bmad-python.ps1 .agents/skills/bmad-party-mode/scripts/resolve_party.py --project-root . --skill .agents/skills/bmad-party-mode --party little-joys-studio
```

Read the upstream skill and relevant mode reference before running a session. The project rules override silent fallback, endless conversation and unsolicited keepsakes. `check-ai` verifies actual resolver results for both installations: neutral project config, eight exact members, auto mode, resolved agents and memory off. This is configuration verification, not proof an independent multi-agent session has run.

## Cast and delivery

The saved pool is Theo (toys/emergence), Poppy (feel/discovery), Akari (art/sound), Rowan (access), Soren (cost), Mei (smoothness), Mina (convergence) and Vera (evidence). Cast three to six relevant voices; retain both cost and perceived-smoothness lenses for material performance work. One independently reasoning Critic handles C1, not a panel. Persona names identify lenses, not guaranteed separate model instances. Report actual model availability; requested Spark helpers remain contingent on a callable model in the current harness.

Use [the packet template](templates/TOY-SPRINT-PACKET.md) and [full workflow](TOY-STUDIO-WORKFLOW.md). Keep sanitized decisions, dissent, stage state and evidence links recoverable. Store unreviewed/raw output locally first; publish only privacy-reviewed product material. No transcript publishing default, private Party memory, simulation of a child, or inferred enjoyment. Documented stage discipline is not a platform-enforced counter.

## Integration handoff for the current release owner

This setup does not touch runtime, assets, package/version, deployment config, existing release reports or Claude's live checkout. The setup commit can be cherry-picked after the current release work at a convenient checkpoint. If root instructions/skills already exist then, reconcile them instead of overwriting them. Do not merge the older runtime branch wholesale just to obtain the tooling. Run setup/check in the integrated checkout afterward; ignored installations do not cross worktrees through Git.

No game build/version bump or Vercel deployment is needed for this change. The existing deployment-input allowlist excludes these tooling files. Continue normal documentation/tooling backups independently of the next material playtest release. No new runtime sprint is currently selected by this setup.

## Setup evidence and limits

The pinned installer completed successfully for both tools in the isolated worktree. `check-ai.ps1` passed against both real installations: eight exact roster members, auto mode, memory off and neutral project identity. Runtime identity remained `v0.1.1-8f53112d4703`. Project skill frontmatter and links were inspected and checked locally; the stock skill-creator validator could not run because its separate PyYAML dependency was absent. No dependency was added to the game to satisfy a tooling validator.

A repeat installation through `setup-ai.ps1` was attempted during concurrent release activity. The first attempt reported that the system could not execute the program; the second reported `VirtualAlloc failed`. Installer retries were stopped to avoid adding pressure to the host. Existing installations still passed both resolver checks afterward. Therefore initial installation and resolver behavior are verified; successful end-to-end repetition of the wrapper remains pending on a less loaded host. No independent live Party or new runtime sprint was run as part of setup.
