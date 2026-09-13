# Squishy Friend and Penguin Bounce — consolidated owner feedback

Recorded 13 September 2026. This consolidates the owner's requests and phone feedback across the project conversation, with personal details removed. It preserves the design meaning rather than reproducing raw speech. Reported reactions are not independently reproduced test results. The exact phone, OS, build and motion/audio settings were not recorded; future reviews need a visible build label.

## The intended experience

Little Joys should feel like a beautiful, tactile, generous software toybox: immediate cause and effect, discovery, repetition, visual and physical variety, joy and wonder. A polished sprite placed on a minimally reactive screen is insufficient. Simple input should lead to rich consequences; simplicity is about access, not thin content or subdued presentation.

The intended player may be very early with games. Play must work without speech, reading, correct answers, eye contact, turn-taking, timed flippers or precise aiming. Watching can be worthwhile; touching should make useful, interesting changes. Preserve voluntary repetition and all exit/pause paths. Success is assessed through actual private voluntary play and return choices, not automated scores or invented developmental claims.

The owner prefers cute, purpose-generated painted/raster sprites over generic programmer/vector art. Strong silhouettes, readable faces and materials, brighter varied color, satisfying movement and bounded sound should make the app feel authored and complete. Retain original designs that already work. The visual references are broad art direction, not permission to copy franchise characters or entire related games.

## Squishy Friend — all feedback and requests so far

**Retain:** the owner describes the main little mint character as cute and likes the original raster design and the appearance of local deformation. Preserve that identity. Private play reactions are not reproduced here, and no general enjoyment claim is made.

**The central criticism:** available deformation is far too small and not interesting enough. The interaction becomes repetitive quickly. The owner repeatedly compares the expressive possibilities unfavorably with a well-known stretchy-face toy; that is a mechanic benchmark, not an instruction to copy its character or implementation. They want considerably more than a restrained face-stretch imitation.

**Requested directions:**

- Much stronger, varied local pulls: different regions should deform in noticeably different ways while the current sprite remains recognizable. Do not substitute whole-image scaling.
- Explore separate body, eyes and face layers with independent local deformation and secondary movement. This is a proposed technique for expressiveness, not proof that a layer count alone makes play better. Evaluate actual renders and avoid seams, duplicated facial features or reduced pickup accuracy.
- More response after release. The initial request mentioned bouncing or moving around the screen; the latest specifies directional recoil/swing, movement of the whole friend after a pull, and bouncing off edges. The current short bounded rebound candidate does not fully implement that request.
- A possibility to explore later: several squishy friends together, or adding another friend. This was tentative; do not silently turn it into an unbounded character spawning system or a required new inventory feature.
- Keep generous multi-touch and immediate reclaim of a moving/stretching friend, with useful taps and no wait-to-play animation sequence.

**Engineering work already attempted:** read `AGENT-HANDOFF.md` and `EXPRESSIVE-SQUISH-SPEC.md`. The undeployed candidate has substantially larger local deformation, material-aware re-grabs and a finite release. A prior 12×12 mesh was visually reviewed but missed the desktop frame target. The current 8×8 follow-up has preliminary evidence only. Neither candidate has been shown to resolve the owner's enjoyment concern. Separate cutout layers, screen-edge bouncing and multiple friends are not implemented.

## Penguin Bounce — original vision

The owner explicitly requested a permissive pachinko / Peggle / pinball-like physics toy, with many balls, lots of bouncing and changing interactions, vivid local lights, color and effects. They are enthusiastic about pachinko-style cause and effect and see potential for reusing the pure physics interaction in other projects later. Build the useful toy first; do not build a general engine or cross-project framework.

The desired access is loose: almost anywhere the player touches should do something useful or interesting. Examples offered were tapping to add balls, touching broad objects to rotate/turn/toggle them, and influencing or steering moving balls. Traditional separate left/right flippers and timing would be too demanding for this intent. The experience should be forgiving and playable without precision or success conditions.

The penguin theme has strong priority. Other future original themes include cute dinosaurs (including a friendly T-Rex), farm animals with verified optional animal sounds, playful letters/numbers, and brief musical invitations followed by instrumental/quiet space. Trains were tentative. Small collision-triggered sprite vignettes were suggested as another possibility: something interesting happens because balls reached or changed part of the board. These are optional future content ideas, not a curriculum, quiz, mandatory imitation, speech detector, copied song, or commitment to implement every idea now.

The owner cited children's media and games as broad examples of appealing craft and interaction. Do not recreate their characters, branding, animation sequences, assets, music or recordings. Use original characters and cleared media.

## Penguin Bounce — latest hands-on criticism

**Retain:** touching to create differently colored balls is a useful starting point. The penguin itself is cute. Toybox navigation is a useful, liked part of the shell.

**What fails the intended feel:**

- It does not feel like a fun pachinko board. Balls usually fall almost straight down; too few meaningful ricochets, mechanisms or changing physical events happen.
- One ball per tap, followed by sparse activity, is not substantial enough. Stopping input leaves an uninteresting screen.
- The overall appearance is overly pastel, plain and somewhat unattractive. The owner requests brighter colors and more color/visual variety; two ball appearances are too limited.
- The penguin is mostly a small observer in the corner. Its presence should contribute to the toy, rather than merely decorate an unrelated board.
- The current implementation is considered much less interesting than the requested idea. Passing its prior tests does not settle this design criticism.
- The owner noticed balls disappearing/recycling at a limit and did not object to bounded population. Do not interpret that as an independently verified description of the exact existing recycling policy.

**New explicit behavior request:** even without tapping, the board should supply new balls continuously and produce varied, interesting physics and local lights/effects. Touch should still influence that flow. This revises the former input-only, eventual-sleep/no-passive-spawn direction for Penguin Bounce. Update P07/T39 and related statements deliberately before implementing the new flow; retain hard resource bounds, immediate pause, background suspension without catch-up bursts, and a clearly defined Gentle/system-reduced-motion response. Do not quietly retain the old idle contract and claim this feedback has been implemented.

The repeated request for flashing lights and cool effects means visibly lively, colorful feedback. Use well-controlled local collision glows, blooms, rays and character reactions; respect the existing ban on strobing and rapid full-screen contrast changes. Richness must not depend on enabling sound, but optional verified audio should make enabled play more satisfying.

## Shared feedback relevant to interpreting the reports

The app feels clinical/corporate and visually bland. The top-left logo/tagline treatment is disliked. The parent symbol was not understood, and the control appeared to do nothing; the existing two-second hold was not discovered. Audio therefore cannot be assumed to have been enabled during the reports. Record and improve discoverability instead of dismissing the report because the implementation has a hidden working path.

The owner explicitly requests a readable build identifier in the app so future feedback can name the reviewed version. Codex owns that small shared-shell change in its separate Bubble/Nest lane. Broad shell/brand redesign needs coordination rather than conflicting edits.

## Ownership and acceptance

Fable owns Squishy Friend and Penguin Bounce. Codex owns Bubble Pond and Roll & Nest in `.local/bubble-nest-worktree`, plus the visible build label. The owner may later swap toy ownership to gain a fresh perspective. See `AGENT-HANDOFF.md` before writing or integrating shared files.

Use the current spec's architecture, performance, privacy, offline and access requirements as engineering constraints, and the latest explicit owner directions above to amend outdated behavior requirements. Make an actual playable implementation, inspect actual interaction and screenshots, measure demanding workloads, and preserve failed evidence. No physical iPad qualification or player enjoyment should be claimed without the corresponding observations.
