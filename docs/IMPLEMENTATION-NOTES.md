# Implementation decisions and owner-directed refinements

The supplied normative requirements remain in SPEC.md. On 13 September 2026 the owner requested richer, purpose-generated sprites, authorized read-only art-direction reference work in the three related game projects, and authorized selective reuse of owned music and sound. The following narrow refinements implement that direction; the original combined pack is preserved locally and excluded from Git.

## Painted art with procedural interaction

Squishy Friend uses an original transparent painted sprite with a bounded 8 × 8 vertex-cell deformation grid (128 affine triangles). The face and body are parts of the same warped texture. This replaces the concept-only raster restriction in SPEC section 4 while preserving S01–S07. It is not whole-image scaling. Four local influences are bounded; positive triangle areas are validated, including restored snapshots. The settled state uses a single image draw. A procedural character remains the failure fallback.

The sprite includes a small curl and toe lobes. Its deliberately generous radial pickup envelope includes those visible regions and their bounded deformation. Near-body empty touches may create a local response, without taking an existing grab. Each scene still owns only its bounded interaction geometry; asset loading never creates React state updates per frame.

Roll & Nest uses a painted bowl and two separately generated patchwork balls. One registered bowl image is drawn behind the balls and again through a shallow foreground clip. Drop geometry is an ellipse matching the visible opening, plus 24 CSS pixels. Balls remain mostly visible and independently removable. Bubble Pond uses a painted circular bubble over procedural stationary slots and local rings.

Only broad craft principles were consulted in the other projects: chunky readable silhouettes, large colour masses, expressive faces, locally coloured contours, material shading, and restraint with small details. None of their characters, gameplay, UI, source code, prompts, private records, or art archives is copied. The related repositories remain read-only.

## Optional music

The owner's later request permits one optional owned music track, replacing the original no-background-music exclusion. It is a separate adult preference, off by default, streamed through one HTMLAudioElement. It is not decoded into a large AudioBuffer. Child Mute stops music and SFX. Pause, settings, toy selection, blur, and page hiding stop playback. Enabling requires an adult gesture and failures remain silent. No queued effects are replayed.

Existing limits remain: at most two short SFX voices, 150 ms between starts, silent fresh storage, effective Gentle under system reduced motion, no scores or required answers, and all stop paths. Music has its own low default gain and explicit control. These digital gains are not sound-pressure measurements.

## Capability and source boundaries

The callable built-in OpenAI image-generation tool was used successfully. It supports a text prompt and local reference images but exposes neither a model selector nor a verified backend identifier. Current official documentation describes the Images 2.5 family; this build does **not** falsely assert a specific backend was selected. See [official image guide](https://developers.openai.com/api/docs/guides/image-generation) and [Flare model documentation](https://developers.openai.com/api/docs/models/gpt-image-2.5-flare).

Exact sanitized generation prompts and provenance live in art/PROVENANCE.md and art/SPRITE-PROMPTS.md. No generation occurs in the application, installation, or build. No keys are needed by the client. The generated originals stay outside public; only measured exports and captured toy tiles ship.

## Performance boundaries

React owns semantic navigation and settings. Runtime owns one canvas, one requestAnimationFrame scheduler, a four-contact router, tiny validated session snapshots, and bounded audio/art stores. Geometry/input never flows through React render state. Animation sleeps when objects settle. Bubble timers use only active scene time. DPR is capped at 1.5 and backing pixels at two million. All sprite, icon, and precache sizes are audited.

Desktop Chromium and WebKit checks are software evidence. Target iPad frame times, Safari/Home Screen lifecycle, physical touch, case reach, twenty-minute soak, and real enjoyment remain pending until observed on the device. No educational or clinical outcome is claimed.
